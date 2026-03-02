import { Router, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { createFaceLivenessSession, getFaceLivenessSessionResults } from '../services/faceLivenessAdapter';

const Auth = require('../utils/auth');
const { pool }: { pool: Pool } = require('../config/database');

const router = Router();

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    role?: string;
    [key: string]: unknown;
  };
};

type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'INTERNAL_ERROR';

const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const;
const ATTENDANCE_SESSIONS = ['morning', 'afternoon'] as const;

const startSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  classId: z.coerce.number().int().positive(),
  session: z.enum(ATTENDANCE_SESSIONS).default('morning'),
  challengeType: z.enum(['blink', 'head_turn', 'smile', 'random']).default('random'),
  expiresInSeconds: z.coerce.number().int().min(30).max(600).default(180),
  deviceId: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional()
});

const completeSchema = z.object({
  livenessSessionId: z.string().trim().min(1).max(128),
  studentId: z.coerce.number().int().positive(),
  classId: z.coerce.number().int().positive(),
  date: z.string().date().optional(),
  session: z.enum(ATTENDANCE_SESSIONS).default('morning'),
  status: z.enum(ATTENDANCE_STATUSES).default('present'),
  notes: z.string().trim().max(500).optional(),
  capture: z.object({
    imageUrl: z.string().url().optional(),
    embedding: z.array(z.number()).min(16).max(4096).optional(),
    embeddingVersion: z.string().trim().max(32).default('v1'),
    qualityScore: z.coerce.number().min(0).max(1).optional()
  }).optional()
});

function sendError(
  res: Response,
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown
): Response {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details: details ?? null
    }
  });
}

function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }));
}

function mapAwsErrorToApi(error: any): { status: number; code: ApiErrorCode; message: string } {
  const awsCode = String(error?.name || error?.Code || '');
  if (awsCode === 'AccessDeniedException' || awsCode === 'UnrecognizedClientException') {
    return { status: 403, code: 'FORBIDDEN', message: 'AWS Rekognition access denied' };
  }
  if (awsCode === 'ValidationException' || awsCode === 'InvalidParameterException') {
    return { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid liveness request to AWS Rekognition' };
  }
  if (awsCode === 'ResourceNotFoundException') {
    return { status: 404, code: 'NOT_FOUND', message: 'Liveness session not found in AWS Rekognition' };
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: 'AWS Rekognition liveness request failed' };
}

async function validateStudentClassConnection(
  conn: PoolConnection,
  studentId: number,
  classId: number
): Promise<void> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT s.id
     FROM students s
     WHERE s.id = ? AND s.class_id = ?
     LIMIT 1`,
    [studentId, classId]
  );

  if (!rows.length) {
    const error = new Error('Student is not assigned to the provided class');
    (error as any).code = 'NOT_FOUND';
    throw error;
  }
}

async function upsertAttendanceRecord(
  conn: PoolConnection,
  input: {
    studentId: number;
    classId: number;
    date: string;
    session: (typeof ATTENDANCE_SESSIONS)[number];
    status: (typeof ATTENDANCE_STATUSES)[number];
    notes?: string;
    markedBy: number;
  }
): Promise<void> {
  await conn.execute<ResultSetHeader>(
    `INSERT INTO attendance
      (student_id, class_id, date, session, status, notes, marked_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      notes = VALUES(notes),
      marked_by = VALUES(marked_by),
      updated_at = CURRENT_TIMESTAMP`,
    [
      input.studentId,
      input.classId,
      input.date,
      input.session,
      input.status,
      input.notes ?? null,
      input.markedBy
    ]
  );
}

router.post('/start', Auth.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = startSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request payload', formatZodIssues(parsed.error));
  }

  if (!req.user?.id) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
  }

  const payload = parsed.data;
  let livenessSessionId = '';
  const now = new Date();
  let expiresAt = new Date(now.getTime() + payload.expiresInSeconds * 1000);

  let conn: PoolConnection | null = null;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    await validateStudentClassConnection(conn, payload.studentId, payload.classId);

    const awsStart = await createFaceLivenessSession();
    livenessSessionId = awsStart.sessionId;
    expiresAt = new Date(now.getTime() + awsStart.expiresInSeconds * 1000);

    await conn.execute<ResultSetHeader>(
      `INSERT INTO liveness_sessions
        (session_id, student_id, class_id, started_by, challenge_type, status, started_at, expires_at, request_payload)
       VALUES (?, ?, ?, ?, ?, 'started', NOW(), ?, ?)`,
      [
        livenessSessionId,
        payload.studentId,
        payload.classId,
        req.user.id,
        payload.challengeType,
        expiresAt,
        JSON.stringify({ deviceId: payload.deviceId ?? null, notes: payload.notes ?? null })
      ]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      data: {
        livenessSessionId,
        challengeType: payload.challengeType,
        expiresAt: expiresAt.toISOString()
      }
    });
  } catch (error: any) {
    if (conn) await conn.rollback();

    if (error?.code === 'NOT_FOUND') {
      return sendError(res, 404, 'NOT_FOUND', error.message);
    }

    console.error('Face attendance start failed:', error);
    const mapped = mapAwsErrorToApi(error);
    return sendError(res, mapped.status, mapped.code, mapped.message);
  } finally {
    conn?.release();
  }
});

router.post('/complete', Auth.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = completeSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request payload', formatZodIssues(parsed.error));
  }

  if (!req.user?.id) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
  }

  const payload = parsed.data;
  const attendanceDate = payload.date ?? new Date().toISOString().slice(0, 10);

  let conn: PoolConnection | null = null;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [sessionRows] = await conn.execute<RowDataPacket[]>(
      `SELECT id, session_id, student_id, class_id, status, expires_at
       FROM liveness_sessions
       WHERE session_id = ?
       LIMIT 1`,
      [payload.livenessSessionId]
    );

    const session = sessionRows[0];
    if (!session) {
      await conn.rollback();
      return sendError(res, 404, 'NOT_FOUND', 'Liveness session not found');
    }

    if (session.status !== 'started') {
      await conn.rollback();
      return sendError(res, 409, 'CONFLICT', 'Liveness session is already completed');
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      await conn.execute<ResultSetHeader>(
        `UPDATE liveness_sessions
         SET status = 'expired', failure_reason = 'Session expired', completed_at = NOW()
         WHERE id = ?`,
        [session.id]
      );
      await conn.commit();
      return sendError(res, 422, 'UNPROCESSABLE_ENTITY', 'Liveness session expired');
    }

    if (Number(session.student_id) !== payload.studentId || Number(session.class_id) !== payload.classId) {
      await conn.rollback();
      return sendError(res, 409, 'CONFLICT', 'Session does not match student or class');
    }

    await validateStudentClassConnection(conn, payload.studentId, payload.classId);

    const awsResult = await getFaceLivenessSessionResults(payload.livenessSessionId);
    const verificationPassed = awsResult.livenessPassed;

    await conn.execute<ResultSetHeader>(
      `UPDATE liveness_sessions
       SET status = ?,
           liveness_passed = ?,
           liveness_score = ?,
           face_match_passed = ?,
           face_distance = ?,
           confidence = ?,
           completed_at = NOW(),
           failure_reason = ?,
           response_payload = ?
       WHERE id = ?`,
      [
        verificationPassed ? 'completed' : 'failed',
        verificationPassed ? 1 : 0,
        awsResult.confidence ?? null,
        verificationPassed ? 1 : 0,
        null,
        awsResult.confidence ?? null,
        awsResult.failureReason ?? null,
        JSON.stringify({ awsStatus: awsResult.status, ...payload.capture }),
        session.id
      ]
    );

    if (!verificationPassed) {
      await conn.commit();
      return sendError(res, 422, 'UNPROCESSABLE_ENTITY', 'Face verification failed', {
        status: awsResult.status,
        confidence: awsResult.confidence,
        livenessPassed: awsResult.livenessPassed
      });
    }

    if (payload.capture?.embedding) {
      await conn.execute<ResultSetHeader>(
        `INSERT INTO face_templates
          (student_id, embedding, embedding_version, quality_score, is_active, created_by)
         VALUES (?, ?, ?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE
          embedding = VALUES(embedding),
          embedding_version = VALUES(embedding_version),
          quality_score = VALUES(quality_score),
          is_active = 1,
          updated_at = CURRENT_TIMESTAMP`,
        [
          payload.studentId,
          JSON.stringify(payload.capture.embedding),
          payload.capture.embeddingVersion,
          payload.capture.qualityScore ?? null,
          req.user.id
        ]
      );
    }

    await upsertAttendanceRecord(conn, {
      studentId: payload.studentId,
      classId: payload.classId,
      date: attendanceDate,
      session: payload.session,
      status: payload.status,
      notes: payload.notes ?? `Face verified (${String(awsResult.confidence ?? 0)})`,
      markedBy: req.user.id
    });

    await conn.commit();

    return res.status(200).json({
      success: true,
      data: {
        livenessSessionId: payload.livenessSessionId,
        attendance: {
          studentId: payload.studentId,
          classId: payload.classId,
          date: attendanceDate,
          session: payload.session,
          status: payload.status
        },
        verification: {
          status: awsResult.status,
          livenessPassed: awsResult.livenessPassed,
          confidence: awsResult.confidence
        }
      }
    });
  } catch (error: any) {
    if (conn) await conn.rollback();

    if (error?.code === 'NOT_FOUND') {
      return sendError(res, 404, 'NOT_FOUND', error.message);
    }

    console.error('Face attendance completion failed:', error);
    const mapped = mapAwsErrorToApi(error);
    return sendError(res, mapped.status, mapped.code, mapped.message);
  } finally {
    conn?.release();
  }
});

export default router;

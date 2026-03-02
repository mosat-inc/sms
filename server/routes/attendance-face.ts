import { Router, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { randomUUID } from 'crypto';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const Auth = require('../utils/auth');
const { pool }: { pool: Pool } = require('../config/database');

const router = Router();

const CHALLENGES = ['BLINK_2X', 'TURN_HEAD_LR'] as const;
const SESSION_STATUS = {
  STARTED: 'STARTED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'UNPROCESSABLE_ENTITY'
  | 'INTERNAL_ERROR';

type AuthenticatedRequest = Request & {
  user?: {
    id?: number;
    schoolId?: number;
    role?: string;
    [key: string]: unknown;
  };
};

const similarityThreshold = Number(process.env.FACE_ATTENDANCE_SIMILARITY_THRESHOLD || 0.58);
const requiredPassingFrames = Number(process.env.FACE_ATTENDANCE_REQUIRED_FRAMES || 3);
const totalFramesExpected = Number(process.env.FACE_ATTENDANCE_TOTAL_FRAMES || 5);
const rateLimitAttempts = Number(process.env.FACE_ATTENDANCE_MAX_ATTEMPTS_10M || 5);
const sessionExpirySeconds = 120;
const REQUIRED_FACE_TABLES = ['face_sessions', 'face_templates', 'attendance_attempts', 'attendance_events'] as const;

const startSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const completeSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.coerce.number().int().positive(),
  liveness: z.object({
    passed: z.literal(true),
    type: z.enum(CHALLENGES),
    metrics: z.record(z.any()).optional(),
  }),
  descriptors: z.array(
    z.array(z.number().finite()).min(64).max(2048)
  ).length(totalFramesExpected),
  deviceHash: z.string().trim().min(8).max(191),
  eventType: z.enum(['IN', 'OUT']).default('IN'),
});

function sendError(res: Response, status: number, code: ApiErrorCode, message: string, details?: unknown): Response {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details: details ?? null,
    },
  });
}

function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
    message: issue.message,
  }));
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denom) return -1;
  return dot / denom;
}

function randomChallenge() {
  const type = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
  if (type === 'BLINK_2X') {
    return {
      type,
      params: { requiredBlinks: 2, maxSeconds: 12 },
    };
  }
  return {
    type,
    params: { sequence: ['LEFT', 'RIGHT'], minYaw: 15, maxSeconds: 12 },
  };
}

function normalizeTemplateVectors(raw: unknown): number[][] {
  if (!Array.isArray(raw)) throw new Error('Template descriptor_json must be an array');

  if (raw.length > 0 && Array.isArray(raw[0])) {
    const vectors = raw as number[][];
    vectors.forEach((vec) => {
      if (!Array.isArray(vec) || vec.some((n) => typeof n !== 'number' || !Number.isFinite(n))) {
        throw new Error('Template descriptor_json contains invalid vectors');
      }
    });
    return vectors;
  }

  const single = raw as number[];
  if (single.some((n) => typeof n !== 'number' || !Number.isFinite(n))) {
    throw new Error('Template descriptor_json is not numeric');
  }
  return [single];
}

async function ensureFaceAttendanceSchema(conn: PoolConnection): Promise<void> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name IN (${REQUIRED_FACE_TABLES.map(() => '?').join(',')})`,
    [...REQUIRED_FACE_TABLES]
  );

  const found = new Set(rows.map((row) => String(row.table_name)));
  const missing = REQUIRED_FACE_TABLES.filter((name) => !found.has(name));
  if (missing.length) {
    const error = new Error(`Face attendance tables are missing: ${missing.join(', ')}`);
    (error as any).apiCode = 'SERVICE_UNAVAILABLE';
    (error as any).status = 503;
    (error as any).details = {
      missingTables: missing,
      fix: 'Run: npm run migrate',
    };
    throw error;
  }
}

async function resolveOrgId(conn: PoolConnection, req: AuthenticatedRequest): Promise<number> {
  if (req.user?.schoolId && Number(req.user.schoolId) > 0) return Number(req.user.schoolId);

  if (!req.user?.id) throw new Error('Missing authenticated user');

  const [rows] = await conn.execute<RowDataPacket[]>(
    'SELECT school_id FROM users WHERE id = ? LIMIT 1',
    [req.user.id]
  );

  const orgId = Number(rows?.[0]?.school_id || 0);
  if (!orgId) throw new Error('No org/school bound to current user');
  return orgId;
}

async function guardRateLimit(conn: PoolConnection, userId: number, orgId: number): Promise<void> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS count
     FROM attendance_attempts
     WHERE user_id = ?
       AND org_id = ?
       AND created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
    [userId, orgId]
  );

  const count = Number(rows?.[0]?.count || 0);
  if (count >= rateLimitAttempts) {
    const error = new Error('Too many face attendance attempts. Try again in 10 minutes.');
    (error as any).apiCode = 'RATE_LIMITED';
    (error as any).status = 429;
    throw error;
  }
}

router.post('/start', Auth.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = startSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request payload', formatZodIssues(parsed.error));
  }

  if (!req.user?.id) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
  }

  const { userId } = parsed.data;

  let conn: PoolConnection | null = null;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    await ensureFaceAttendanceSchema(conn);

    const orgId = await resolveOrgId(conn, req);

    await guardRateLimit(conn, userId, orgId);

    const [userRows] = await conn.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE id = ? AND school_id = ? AND is_active = 1 LIMIT 1',
      [userId, orgId]
    );

    if (!userRows.length) {
      await conn.rollback();
      return sendError(res, 404, 'NOT_FOUND', 'User not found in this organization');
    }

    const challenge = randomChallenge();
    const sessionId = randomUUID();
    const expiresAtIso = new Date(Date.now() + sessionExpirySeconds * 1000).toISOString();

    await conn.execute<ResultSetHeader>(
      `INSERT INTO face_sessions
        (id, user_id, org_id, challenge_type, challenge_json, status, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        userId,
        orgId,
        challenge.type,
        JSON.stringify(challenge.params),
        SESSION_STATUS.STARTED,
        expiresAtIso,
      ]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      data: {
        sessionId,
        challengeType: challenge.type,
        challengeParams: challenge.params,
        expiresAt: expiresAtIso,
      },
    });
  } catch (error: any) {
    if (conn) await conn.rollback();

    if (error?.apiCode === 'RATE_LIMITED') {
      return sendError(res, 429, 'RATE_LIMITED', error.message);
    }
    if (error?.apiCode === 'SERVICE_UNAVAILABLE') {
      return sendError(res, 503, 'SERVICE_UNAVAILABLE', error.message, error?.details);
    }

    console.error('Face attendance start error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to start face attendance session', {
      reason: error?.message || 'Unknown error',
    });
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

  let conn: PoolConnection | null = null;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    await ensureFaceAttendanceSchema(conn);

    const orgId = await resolveOrgId(conn, req);

    await guardRateLimit(conn, payload.userId, orgId);

    const [sessionRows] = await conn.execute<RowDataPacket[]>(
      `SELECT id, user_id, org_id, challenge_type, status, expires_at
       FROM face_sessions
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [payload.sessionId]
    );

    const session = sessionRows?.[0];
    if (!session) {
      await conn.rollback();
      return sendError(res, 404, 'NOT_FOUND', 'Face session not found');
    }

    if (session.status !== SESSION_STATUS.STARTED) {
      await conn.rollback();
      return sendError(res, 409, 'CONFLICT', `Face session is already ${session.status}`);
    }

    if (Number(session.user_id) !== payload.userId || Number(session.org_id) !== orgId) {
      await conn.rollback();
      return sendError(res, 403, 'FORBIDDEN', 'Session does not belong to user/org context');
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      await conn.execute<ResultSetHeader>(
        'UPDATE face_sessions SET status = ? WHERE id = ?',
        [SESSION_STATUS.FAILED, payload.sessionId]
      );

      await conn.execute<ResultSetHeader>(
        `INSERT INTO attendance_attempts (user_id, org_id, session_id, success, reason, score)
         VALUES (?, ?, ?, 0, ?, NULL)`,
        [payload.userId, orgId, payload.sessionId, 'SESSION_EXPIRED']
      );

      await conn.commit();
      return sendError(res, 422, 'UNPROCESSABLE_ENTITY', 'Session expired');
    }

    if (payload.liveness.type !== session.challenge_type) {
      await conn.execute<ResultSetHeader>(
        'UPDATE face_sessions SET status = ? WHERE id = ?',
        [SESSION_STATUS.FAILED, payload.sessionId]
      );

      await conn.execute<ResultSetHeader>(
        `INSERT INTO attendance_attempts (user_id, org_id, session_id, success, reason, score)
         VALUES (?, ?, ?, 0, ?, NULL)`,
        [payload.userId, orgId, payload.sessionId, 'LIVENESS_CHALLENGE_MISMATCH']
      );

      await conn.commit();
      return sendError(res, 422, 'UNPROCESSABLE_ENTITY', 'Liveness challenge mismatch');
    }

    const [templateRows] = await conn.execute<RowDataPacket[]>(
      `SELECT descriptor_json
       FROM face_templates
       WHERE user_id = ? AND org_id = ? AND revoked_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [payload.userId, orgId]
    );

    if (!templateRows.length) {
      await conn.execute<ResultSetHeader>(
        'UPDATE face_sessions SET status = ? WHERE id = ?',
        [SESSION_STATUS.FAILED, payload.sessionId]
      );
      await conn.execute<ResultSetHeader>(
        `INSERT INTO attendance_attempts (user_id, org_id, session_id, success, reason, score)
         VALUES (?, ?, ?, 0, ?, NULL)`,
        [payload.userId, orgId, payload.sessionId, 'NO_ENROLLED_TEMPLATE']
      );
      await conn.commit();
      return sendError(res, 422, 'UNPROCESSABLE_ENTITY', 'No enrolled face template found');
    }

    let templateVectors: number[][];
    try {
      templateVectors = normalizeTemplateVectors(JSON.parse(templateRows[0].descriptor_json));
    } catch (_error) {
      await conn.rollback();
      return sendError(res, 500, 'INTERNAL_ERROR', 'Stored face template is invalid');
    }

    const frameScores: number[] = [];
    let passedFrames = 0;

    for (const descriptor of payload.descriptors) {
      let best = -1;
      for (const template of templateVectors) {
        const score = cosineSimilarity(descriptor, template);
        if (score > best) best = score;
      }
      frameScores.push(best);
      if (best >= similarityThreshold) passedFrames += 1;
    }

    const avgScore = frameScores.reduce((sum, score) => sum + score, 0) / frameScores.length;
    const isMatch = passedFrames >= requiredPassingFrames;

    await conn.execute<ResultSetHeader>(
      `INSERT INTO attendance_attempts (user_id, org_id, session_id, success, reason, score)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payload.userId,
        orgId,
        payload.sessionId,
        isMatch ? 1 : 0,
        isMatch ? 'MATCHED' : 'BELOW_THRESHOLD',
        Number(avgScore.toFixed(5)),
      ]
    );

    if (!isMatch) {
      await conn.execute<ResultSetHeader>(
        'UPDATE face_sessions SET status = ? WHERE id = ?',
        [SESSION_STATUS.FAILED, payload.sessionId]
      );
      await conn.commit();
      return sendError(res, 422, 'UNPROCESSABLE_ENTITY', 'Face verification failed', {
        passedFrames,
        requiredFrames: requiredPassingFrames,
        threshold: similarityThreshold,
        averageScore: Number(avgScore.toFixed(5)),
      });
    }

    await conn.execute<ResultSetHeader>(
      `INSERT INTO attendance_events
        (user_id, org_id, event_type, happened_at, method, score, threshold, device_hash, ip)
       VALUES (?, ?, ?, NOW(), 'FACE', ?, ?, ?, ?)`,
      [
        payload.userId,
        orgId,
        payload.eventType,
        Number(avgScore.toFixed(5)),
        similarityThreshold,
        payload.deviceHash,
        req.ip || null,
      ]
    );

    await conn.execute<ResultSetHeader>(
      'UPDATE face_sessions SET status = ? WHERE id = ?',
      [SESSION_STATUS.COMPLETED, payload.sessionId]
    );

    await conn.commit();

    return res.status(200).json({
      success: true,
      data: {
        sessionId: payload.sessionId,
        userId: payload.userId,
        eventType: payload.eventType,
        score: Number(avgScore.toFixed(5)),
        threshold: similarityThreshold,
        passedFrames,
        requiredFrames: requiredPassingFrames,
        matched: true,
      },
    });
  } catch (error: any) {
    if (conn) await conn.rollback();

    if (error?.apiCode === 'RATE_LIMITED') {
      return sendError(res, 429, 'RATE_LIMITED', error.message);
    }
    if (error?.apiCode === 'SERVICE_UNAVAILABLE') {
      return sendError(res, 503, 'SERVICE_UNAVAILABLE', error.message, error?.details);
    }

    console.error('Face attendance complete error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to complete face attendance', {
      reason: error?.message || 'Unknown error',
    });
  } finally {
    conn?.release();
  }
});

export default router;

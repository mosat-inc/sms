import { Router, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { randomUUID } from 'crypto';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const Auth = require('../utils/auth');
const { pool }: { pool: Pool } = require('../config/database');
const { addFaceAttendanceTables } = require('../migrations/add_face_attendance_tables');

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
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Dar_es_Salaam';
const strictSimilarityThreshold = Math.max(similarityThreshold, 0.82);
const strictPassingFrames = Math.max(requiredPassingFrames, 4);

const startSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const templateStatusSchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
});

const enrollSchema = z.object({
  userId: z.coerce.number().int().positive(),
  descriptors: z.array(
    z.array(z.number().finite()).min(64).max(2048)
  ).min(5).max(20),
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

function averageVector(vectors: number[][]): number[] {
  if (!vectors.length) throw new Error('At least one descriptor vector is required');
  const size = vectors[0].length;
  const sums = new Array(size).fill(0);

  for (const vector of vectors) {
    if (vector.length !== size) {
      throw new Error('Descriptor vectors must all have the same length');
    }
    for (let i = 0; i < size; i += 1) {
      sums[i] += vector[i];
    }
  }

  return sums.map((value) => value / vectors.length);
}

function normalizeDescriptorVectors(raw: number[][]): number[][] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('Descriptor list is required');
  }

  const width = raw[0].length;
  return raw.map((vector) => {
    if (!Array.isArray(vector) || vector.length !== width) {
      throw new Error('Descriptor vectors must have consistent dimensions');
    }
    if (vector.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
      throw new Error('Descriptor vectors must be numeric');
    }
    return vector.map((value) => Number(value));
  });
}

function serializeTemplate(vectors: number[][]) {
  const normalizedVectors = normalizeDescriptorVectors(vectors);
  const centroid = averageVector(normalizedVectors);
  return {
    version: 2,
    vectors: normalizedVectors,
    centroid,
    sampleCount: normalizedVectors.length,
  };
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

function parseStoredTemplate(rawJson: string): { vectors: number[][]; centroid: number[] } {
  const parsed = JSON.parse(rawJson);

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const vectors = normalizeDescriptorVectors((parsed as any).vectors || []);
    const centroidSource = Array.isArray((parsed as any).centroid) ? [(parsed as any).centroid] : [];
    const centroid = centroidSource.length ? normalizeDescriptorVectors(centroidSource)[0] : averageVector(vectors);
    return { vectors, centroid };
  }

  const vectors = normalizeTemplateVectors(parsed);
  return { vectors, centroid: averageVector(vectors) };
}

function toMysqlDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getTimezoneParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    dateTime: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
  };
}

function resolveStaffSession(date = new Date()): 'morning' | 'afternoon' {
  return getTimezoneParts(date).hour < 12 ? 'morning' : 'afternoon';
}

function resolveStaffStatusForNow(session: 'morning' | 'afternoon', date = new Date()): 'present' | 'late' {
  const parts = getTimezoneParts(date);
  const minuteNow = parts.hour * 60 + parts.minute;
  const parseDeadline = (value: string | undefined, fallback: number) => {
    const [hourRaw, minuteRaw] = String(value || '').split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return fallback;
    return hour * 60 + minute;
  };
  const morningDeadline = parseDeadline(process.env.STAFF_MORNING_DEADLINE, 480);
  const afternoonDeadline = parseDeadline(process.env.STAFF_AFTERNOON_DEADLINE, 900);

  if (session === 'morning' && minuteNow > morningDeadline) return 'late';
  if (session === 'afternoon' && minuteNow > afternoonDeadline) return 'late';
  return 'present';
}

async function ensureFaceAttendanceSchema(conn: PoolConnection): Promise<void> {
  const probeRequiredTables = async () => {
    const foundTables: string[] = [];
    const missing: string[] = [];
    const probeErrors: Array<{ table: string; code?: string; message: string }> = [];

    for (const tableName of REQUIRED_FACE_TABLES) {
      try {
        await conn.query(`SELECT 1 FROM \`${tableName}\` LIMIT 0`);
        foundTables.push(tableName);
      } catch (error: any) {
        const code = String(error?.code || '');
        if (code === 'ER_NO_SUCH_TABLE') {
          missing.push(tableName);
        } else {
          probeErrors.push({
            table: tableName,
            code: code || undefined,
            message: String(error?.message || 'Unknown schema probe error'),
          });
        }
      }
    }

    return { foundTables, missing, probeErrors };
  };

  const getSchemaState = async () => {
    const [dbRows] = await conn.query<RowDataPacket[]>('SELECT DATABASE() AS db_name');
    const dbName = String(dbRows?.[0]?.db_name || '').trim() || null;
    const { foundTables, missing, probeErrors } = await probeRequiredTables();
    return { dbName, foundTables, missing, probeErrors };
  };

  let state = await getSchemaState();
  if (!state.missing.length && !state.probeErrors.length) return;

  console.warn(
    `Face attendance schema issue in database=${state.dbName || 'unknown'} missing=${state.missing.join(',') || 'none'} probeErrors=${state.probeErrors.length}`
  );

  // Self-heal in production/startup drift scenarios.
  await addFaceAttendanceTables();
  state = await getSchemaState();

  if (state.missing.length || state.probeErrors.length) {
    const issueSummary = [
      state.missing.length ? `missing: ${state.missing.join(', ')}` : null,
      state.probeErrors.length ? `probeErrors: ${state.probeErrors.map((item) => `${item.table}:${item.code || 'UNKNOWN'}`).join(', ')}` : null,
    ].filter(Boolean).join('; ');

    const error = new Error(`Face attendance schema is unavailable (${issueSummary})`);
    (error as any).apiCode = 'SERVICE_UNAVAILABLE';
    (error as any).status = 503;
    (error as any).details = {
      database: state.dbName,
      foundTables: state.foundTables,
      missingTables: state.missing,
      probeErrors: state.probeErrors,
      fix: 'Verify the active Render database and table permissions, then rerun the face attendance migration on that database.',
    };
    throw error;
  }
}

async function resolveOrgId(conn: PoolConnection, req: AuthenticatedRequest, targetUserId?: number): Promise<number> {
  const getSingleSchoolId = async (activeOnly: boolean) => {
    const query = activeOnly
      ? 'SELECT id FROM schools WHERE is_active = 1 ORDER BY id ASC LIMIT 2'
      : 'SELECT id FROM schools ORDER BY id ASC LIMIT 2';
    const [schoolRows] = await conn.execute<RowDataPacket[]>(query);
    if (schoolRows.length === 1) {
      return Number(schoolRows[0].id);
    }
    return 0;
  };

  const ensureFallbackSchool = async () => {
    const fallbackCode = String(process.env.DEFAULT_SCHOOL_CODE || 'DEFAULT').trim().slice(0, 20) || 'DEFAULT';
    const fallbackName = String(process.env.DEFAULT_SCHOOL_NAME || 'Default School').trim().slice(0, 255) || 'Default School';

    await conn.execute<ResultSetHeader>(
      `INSERT INTO schools (school_code, name, is_active)
       SELECT ?, ?, 1
       WHERE NOT EXISTS (SELECT 1 FROM schools LIMIT 1)`,
      [fallbackCode, fallbackName]
    );

    const [rows] = await conn.execute<RowDataPacket[]>(
      'SELECT id FROM schools ORDER BY id ASC LIMIT 1'
    );

    return Number(rows?.[0]?.id || 0);
  };

  const candidateIds: number[] = [];

  if (req.user?.schoolId && Number(req.user.schoolId) > 0) {
    return Number(req.user.schoolId);
  }

  if (req.user?.id && Number(req.user.id) > 0) {
    candidateIds.push(Number(req.user.id));
  }

  if (targetUserId && Number(targetUserId) > 0 && !candidateIds.includes(Number(targetUserId))) {
    candidateIds.push(Number(targetUserId));
  }

  for (const userId of candidateIds) {
    const [rows] = await conn.execute<RowDataPacket[]>(
      'SELECT school_id FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    const orgId = Number(rows?.[0]?.school_id || 0);
    if (orgId > 0) return orgId;
  }

  const activeSchoolId = await getSingleSchoolId(true);
  if (activeSchoolId > 0) {
    return activeSchoolId;
  }

  const anySchoolId = await getSingleSchoolId(false);
  if (anySchoolId > 0) {
    return anySchoolId;
  }

  const fallbackSchoolId = await ensureFallbackSchool();
  if (fallbackSchoolId > 0) {
    return fallbackSchoolId;
  }

  throw new Error('No org/school bound to current user or target staff account, and no fallback school could be created');
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

async function getTargetStaffUser(conn: PoolConnection, userId: number) {
  const [userRows] = await conn.execute<RowDataPacket[]>(
    `SELECT id, role, school_id
     FROM users
     WHERE id = ?
       AND is_active = 1
     LIMIT 1`,
    [userId]
  );

  if (!userRows.length) {
    return null;
  }

  return userRows[0];
}

async function ensureTargetStaffUser(conn: PoolConnection, userId: number, orgId: number, res: Response): Promise<RowDataPacket | null> {
  const targetUser = await getTargetStaffUser(conn, userId);

  if (!targetUser) {
    sendError(res, 404, 'NOT_FOUND', 'User not found');
    return null;
  }

  const targetSchoolId = Number(targetUser.school_id || 0);
  if (targetSchoolId > 0 && targetSchoolId !== orgId) {
    sendError(res, 404, 'NOT_FOUND', 'User not found in this organization');
    return null;
  }

  if (!['teacher', 'admin'].includes(String(targetUser.role || ''))) {
    sendError(res, 403, 'FORBIDDEN', 'Face attendance is only available for staff accounts');
    return null;
  }

  return targetUser;
}

router.get('/template-status', Auth.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = templateStatusSchema.safeParse(req.query || {});
  if (!parsed.success) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request payload', formatZodIssues(parsed.error));
  }

  if (!req.user?.id) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
  }

  const targetUserId = parsed.data.userId ?? Number(req.user.id);

  let conn: PoolConnection | null = null;
  try {
    conn = await pool.getConnection();
    await ensureFaceAttendanceSchema(conn);

    const orgId = await resolveOrgId(conn, req, targetUserId);
    const targetUser = await ensureTargetStaffUser(conn, targetUserId, orgId, res);
    if (!targetUser) return;

    const [templateRows] = await conn.execute<RowDataPacket[]>(
      `SELECT id, created_at
       FROM face_templates
       WHERE user_id = ? AND org_id = ? AND revoked_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [targetUserId, orgId]
    );

    return res.status(200).json({
      success: true,
      data: {
        userId: targetUserId,
        orgId,
        enrolled: templateRows.length > 0,
        templateId: templateRows[0]?.id ?? null,
        enrolledAt: templateRows[0]?.created_at ?? null,
      },
    });
  } catch (error: any) {
    if (error?.apiCode === 'SERVICE_UNAVAILABLE') {
      return sendError(res, 503, 'SERVICE_UNAVAILABLE', error.message, error?.details);
    }

    console.error('Face template status error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load face template status', {
      reason: error?.message || 'Unknown error',
    });
  } finally {
    conn?.release();
  }
});

router.post('/enroll', Auth.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = enrollSchema.safeParse(req.body || {});
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
    await ensureFaceAttendanceSchema(conn);
    await conn.beginTransaction();

    const orgId = await resolveOrgId(conn, req, payload.userId);
    const targetUser = await ensureTargetStaffUser(conn, payload.userId, orgId, res);
    if (!targetUser) {
      await conn.rollback();
      return;
    }

    const templatePayload = serializeTemplate(payload.descriptors);

    await conn.execute<ResultSetHeader>(
      `UPDATE face_templates
       SET revoked_at = NOW()
       WHERE user_id = ? AND org_id = ? AND revoked_at IS NULL`,
      [payload.userId, orgId]
    );

    const [insertResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO face_templates (user_id, org_id, descriptor_json)
       VALUES (?, ?, ?)`,
      [payload.userId, orgId, JSON.stringify(templatePayload)]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      data: {
        enrolled: true,
        templateId: insertResult.insertId,
        userId: payload.userId,
        orgId,
      },
    });
  } catch (error: any) {
    if (conn) await conn.rollback();

    if (error?.apiCode === 'SERVICE_UNAVAILABLE') {
      return sendError(res, 503, 'SERVICE_UNAVAILABLE', error.message, error?.details);
    }

    console.error('Face enrollment error:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to enroll face template', {
      reason: error?.message || 'Unknown error',
    });
  } finally {
    conn?.release();
  }
});

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
    await ensureFaceAttendanceSchema(conn);
    await conn.beginTransaction();

    const orgId = await resolveOrgId(conn, req, userId);

    await guardRateLimit(conn, userId, orgId);

    const targetUser = await ensureTargetStaffUser(conn, userId, orgId, res);
    if (!targetUser) {
      await conn.rollback();
      return;
    }

    const challenge = randomChallenge();
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + sessionExpirySeconds * 1000);
    const expiresAtIso = expiresAt.toISOString();
    const expiresAtMySql = toMysqlDateTime(expiresAt);

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
        expiresAtMySql,
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
    await ensureFaceAttendanceSchema(conn);
    await conn.beginTransaction();

    const orgId = await resolveOrgId(conn, req, payload.userId);

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
    let templateCentroid: number[];
    try {
      const template = parseStoredTemplate(templateRows[0].descriptor_json);
      templateVectors = template.vectors;
      templateCentroid = template.centroid;
    } catch (_error) {
      await conn.rollback();
      return sendError(res, 500, 'INTERNAL_ERROR', 'Stored face template is invalid');
    }

    const incomingVectors = normalizeDescriptorVectors(payload.descriptors);
    const incomingCentroid = averageVector(incomingVectors);
    const frameScores: number[] = [];
    const centroidScores: number[] = [];
    let passedFrames = 0;

    for (const descriptor of incomingVectors) {
      let exemplarBest = -1;
      for (const template of templateVectors) {
        const score = cosineSimilarity(descriptor, template);
        if (score > exemplarBest) exemplarBest = score;
      }
      const centroidScore = cosineSimilarity(descriptor, templateCentroid);
      centroidScores.push(centroidScore);
      const blendedScore = (centroidScore * 0.7) + (exemplarBest * 0.3);
      frameScores.push(blendedScore);
      if (blendedScore >= strictSimilarityThreshold && centroidScore >= strictSimilarityThreshold - 0.02) {
        passedFrames += 1;
      }
    }

    const avgScore = frameScores.reduce((sum, score) => sum + score, 0) / frameScores.length;
    const avgCentroidScore = centroidScores.reduce((sum, score) => sum + score, 0) / centroidScores.length;
    const centroidToTemplateScore = cosineSimilarity(incomingCentroid, templateCentroid);
    const minFrameScore = Math.min(...frameScores);
    const isMatch =
      passedFrames >= strictPassingFrames &&
      avgScore >= strictSimilarityThreshold &&
      avgCentroidScore >= strictSimilarityThreshold &&
      centroidToTemplateScore >= strictSimilarityThreshold &&
      minFrameScore >= strictSimilarityThreshold - 0.05;

    await conn.execute<ResultSetHeader>(
      `INSERT INTO attendance_attempts (user_id, org_id, session_id, success, reason, score)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payload.userId,
        orgId,
        payload.sessionId,
        isMatch ? 1 : 0,
        isMatch ? 'MATCHED' : 'FACE_MISMATCH',
        Number(avgScore.toFixed(5)),
      ]
    );

    if (!isMatch) {
      await conn.execute<ResultSetHeader>(
        'UPDATE face_sessions SET status = ? WHERE id = ?',
        [SESSION_STATUS.FAILED, payload.sessionId]
      );
      await conn.commit();
      return sendError(res, 422, 'UNPROCESSABLE_ENTITY', 'Face does not match the enrolled teacher profile. Attendance was not recorded.', {
        passedFrames,
        requiredFrames: strictPassingFrames,
        threshold: strictSimilarityThreshold,
        averageScore: Number(avgScore.toFixed(5)),
        averageCentroidScore: Number(avgCentroidScore.toFixed(5)),
        centroidScore: Number(centroidToTemplateScore.toFixed(5)),
      });
    }

    const attendanceNow = new Date();
    const attendanceSession = resolveStaffSession(attendanceNow);
    const attendanceDate = getTimezoneParts(attendanceNow).date;
    const attendanceDateTime = getTimezoneParts(attendanceNow).dateTime;
    const attendanceStatus = resolveStaffStatusForNow(attendanceSession, attendanceNow);

    await conn.execute<ResultSetHeader>(
      `INSERT INTO attendance_events
        (user_id, org_id, event_type, happened_at, method, score, threshold, device_hash, ip)
       VALUES (?, ?, ?, ?, 'FACE', ?, ?, ?, ?)`,
      [
        payload.userId,
        orgId,
        'IN',
        attendanceDateTime,
        Number(avgScore.toFixed(5)),
        strictSimilarityThreshold,
        payload.deviceHash,
        req.ip || null,
      ]
    );

    await conn.execute<ResultSetHeader>(
      `
      INSERT INTO staff_attendance (user_id, date, session, status, check_in_at, notes, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        check_in_at = COALESCE(check_in_at, VALUES(check_in_at)),
        notes = COALESCE(VALUES(notes), notes),
        ip_address = COALESCE(VALUES(ip_address), ip_address),
        user_agent = COALESCE(VALUES(user_agent), user_agent),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        payload.userId,
        attendanceDate,
        attendanceSession,
        attendanceStatus,
        attendanceDateTime,
        'Recorded via face attendance',
        String(req.ip || '').slice(0, 64),
        String(req.headers['user-agent'] || '').slice(0, 255),
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
        eventType: 'IN',
        attendanceDate,
        attendanceSession,
        attendanceStatus,
        score: Number(avgScore.toFixed(5)),
        threshold: strictSimilarityThreshold,
        passedFrames,
        requiredFrames: strictPassingFrames,
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

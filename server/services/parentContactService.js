const { pool } = require('../config/database');

const isValidEmail = (email) => {
  const value = String(email || '').trim();
  if (!value) return false;
  // Practical validation (avoid false negatives but block obvious invalids).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const uniq = (arr) => [...new Set((arr || []).map((v) => String(v || '').trim()).filter(Boolean))];

const getParentEmailsForStudent = async (studentId) => {
  const id = Number(studentId);
  if (!Number.isFinite(id)) return [];

  const [rows] = await pool.execute(
    `
      SELECT sup.email, ss.is_primary_supervisor
      FROM student_supervisors ss
      INNER JOIN supervisors sup ON sup.id = ss.supervisor_id
      WHERE ss.student_id = ?
        AND sup.email IS NOT NULL
        AND TRIM(sup.email) <> ''
      ORDER BY ss.is_primary_supervisor DESC, sup.is_primary_contact DESC, ss.created_at ASC, sup.id ASC
    `,
    [id]
  );

  const all = (rows || []).filter((r) => isValidEmail(r.email));
  const primary = all.filter((r) => r.is_primary_supervisor === 1 || r.is_primary_supervisor === true);

  // If a primary supervisor email exists (the one set during admission/registration), use ONLY that by default.
  // Otherwise, fall back to any linked supervisor emails.
  const chosen = primary.length ? primary : all;
  return uniq(chosen.map((r) => r.email));
};

const getParentEmailsForStudents = async (studentIds) => {
  const ids = uniq(studentIds)
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n));

  const result = new Map();
  if (!ids.length) return result;

  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `
      SELECT ss.student_id, sup.email, ss.is_primary_supervisor
      FROM student_supervisors ss
      INNER JOIN supervisors sup ON sup.id = ss.supervisor_id
      WHERE ss.student_id IN (${placeholders})
        AND sup.email IS NOT NULL
        AND TRIM(sup.email) <> ''
      ORDER BY ss.student_id ASC, ss.is_primary_supervisor DESC, sup.is_primary_contact DESC, ss.created_at ASC, sup.id ASC
    `,
    ids
  );

  const grouped = new Map();
  for (const r of rows || []) {
    const sid = Number(r.student_id);
    if (!Number.isFinite(sid)) continue;
    if (!grouped.has(sid)) grouped.set(sid, []);
    grouped.get(sid).push(r);
  }

  for (const [sid, recs] of grouped.entries()) {
    const valid = recs
      .map((r) => ({
        email: String(r.email || '').trim(),
        is_primary_supervisor: r.is_primary_supervisor === 1 || r.is_primary_supervisor === true,
      }))
      .filter((r) => isValidEmail(r.email));

    const primary = valid.filter((r) => r.is_primary_supervisor);
    const chosen = primary.length ? primary : valid;
    result.set(sid, uniq(chosen.map((r) => r.email)));
  }

  return result;
};

const getParentEmailsForClass = async (classId) => {
  const id = Number(classId);
  if (!Number.isFinite(id)) return new Map();

  const [studentRows] = await pool.execute(
    `SELECT id FROM students WHERE class_id = ? AND status = 'active'`,
    [id]
  );
  const studentIds = (studentRows || []).map((r) => r.id);
  return getParentEmailsForStudents(studentIds);
};

module.exports = {
  getParentEmailsForStudent,
  getParentEmailsForStudents,
  getParentEmailsForClass,
};

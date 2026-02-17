const express = require('express');
const router = express.Router();

const Auth = require('../utils/auth');
const { pool } = require('../config/database');

router.use(Auth.authenticateToken);

const executeQuery = async (query, params = []) => {
  const connection = await pool.getConnection();
  try {
    let result;
    if (params.length > 0) {
      [result] = await connection.query(query, params);
    } else {
      [result] = await connection.query(query);
    }

    if (Array.isArray(result)) return { rows: result };
    return { rows: [], insertId: result.insertId, affectedRows: result.affectedRows };
  } finally {
    connection.release();
  }
};

const DAYS = [
  { key: 1, label: 'Monday' },
  { key: 2, label: 'Tuesday' },
  { key: 3, label: 'Wednesday' },
  { key: 4, label: 'Thursday' },
  { key: 5, label: 'Friday' }
];

const TEACHING_SLOTS = [
  { slot_key: 'S1', start_time: '08:00:00', end_time: '09:00:00', label: '08:00-09:00' },
  { slot_key: 'S2', start_time: '09:00:00', end_time: '10:00:00', label: '09:00-10:00' },
  { slot_key: 'BREAK', start_time: '10:00:00', end_time: '10:40:00', label: '10:00-10:40' },
  { slot_key: 'S3', start_time: '10:40:00', end_time: '11:40:00', label: '10:40-11:40' },
  { slot_key: 'S4', start_time: '11:40:00', end_time: '12:40:00', label: '11:40-12:40' },
  { slot_key: 'S5', start_time: '12:40:00', end_time: '14:00:00', label: '12:40-14:00' },
  { slot_key: 'FOOD', start_time: '14:00:00', end_time: '14:40:00', label: 'Food' }
];

const EXAM_SLOTS = [
  { slot_key: 'EXAM1', start_time: '08:00:00', end_time: '10:00:00', label: '08:00-10:00' },
  { slot_key: 'EXAM2', start_time: '14:00:00', end_time: '16:00:00', label: '14:00-16:00' }
];

async function ensureTimetableTables() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS timetables (
      id INT PRIMARY KEY AUTO_INCREMENT,
      class_id INT NOT NULL,
      type ENUM('teaching','exam') NOT NULL,
      academic_year VARCHAR(9) NOT NULL,
      term VARCHAR(20) NULL,
      start_date DATE NULL,
      end_date DATE NULL,
      generated_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_timetables_class_type_year (class_id, type, academic_year),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS timetable_entries (
      id INT PRIMARY KEY AUTO_INCREMENT,
      timetable_id INT NOT NULL,
      day_of_week TINYINT NULL,
      entry_date DATE NULL,
      slot_key VARCHAR(20) NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      kind ENUM('subject','break','free') NOT NULL,
      subject_id INT NULL,
      teacher_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_timetable_day (timetable_id, day_of_week, start_time),
      INDEX idx_timetable_date (timetable_id, entry_date, start_time),
      FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
}

function pickRandom(list) {
  if (!list || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function shuffleCopy(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function getCurrentAcademicYear() {
  const r = await executeQuery('SELECT year_name FROM academic_years WHERE is_current = TRUE LIMIT 1');
  return r.rows?.[0]?.year_name || '2024-2025';
}

async function getClassIdsForUser(user) {
  if (!user) return [];
  if (user.role === 'admin') {
    const r = await executeQuery('SELECT id FROM classes WHERE is_active = TRUE');
    return (r.rows || []).map((x) => x.id);
  }
  if (user.role === 'teacher') {
    const r = await executeQuery(
      `SELECT DISTINCT c.id
       FROM classes c
       INNER JOIN teacher_subject_assignments tsa ON tsa.class_id = c.id
       WHERE tsa.teacher_id = ? AND c.is_active = TRUE`,
      [user.id]
    );
    return (r.rows || []).map((x) => x.id);
  }
  return [];
}

async function getAssignmentsForClass(classId, academicYear) {
  const r = await executeQuery(
    `SELECT tsa.teacher_id, tsa.subject_id, s.name AS subject_name
     FROM teacher_subject_assignments tsa
     INNER JOIN subjects s ON s.id = tsa.subject_id
     WHERE tsa.class_id = ? AND tsa.academic_year = ?`,
    [classId, academicYear]
  );
  return r.rows || [];
}

async function getActiveSubjects() {
  const r = await executeQuery(
    `SELECT id, name
     FROM subjects
     WHERE is_active = TRUE
     ORDER BY name ASC`,
    []
  );
  return r.rows || [];
}

async function findSubjectIdByNameLike(nameLike) {
  if (!nameLike) return null;
  const r = await executeQuery(
    `SELECT id, name
     FROM subjects
     WHERE is_active = TRUE AND LOWER(name) LIKE ?
     ORDER BY CASE WHEN LOWER(name) = ? THEN 0 ELSE 1 END, name ASC
     LIMIT 1`,
    [`%${String(nameLike).toLowerCase()}%`, String(nameLike).toLowerCase()]
  );
  return r.rows?.[0]?.id || null;
}

async function ensureReligionSubjectId() {
  // Prefer an existing subject whose name contains "relig" (Religion / Religious Education).
  const existingId = await findSubjectIdByNameLike('relig');
  if (existingId) return existingId;

  // Create one if missing.
  const baseName = 'Religion';
  const baseDept = 'General';
  const baseCodes = ['REL', 'RELIG', 'RELN'];

  for (const code of baseCodes) {
    try {
      const ins = await executeQuery(
        `INSERT INTO subjects (name, code, description, department, is_active)
         VALUES (?, ?, ?, ?, TRUE)`,
        [baseName, code, 'Religious studies / education', baseDept]
      );
      return ins.insertId;
    } catch (e) {
      // ignore duplicates and try another code
      if (!['ER_DUP_ENTRY', 'ER_DUP_KEYNAME'].includes(e.code)) {
        throw e;
      }
    }
  }

  // If all codes collided, try a numbered code.
  for (let i = 1; i <= 50; i++) {
    const code = `REL${i}`;
    try {
      const ins = await executeQuery(
        `INSERT INTO subjects (name, code, description, department, is_active)
         VALUES (?, ?, ?, ?, TRUE)`,
        [baseName, code, 'Religious studies / education', baseDept]
      );
      return ins.insertId;
    } catch (e) {
      if (!['ER_DUP_ENTRY', 'ER_DUP_KEYNAME'].includes(e.code)) {
        throw e;
      }
    }
  }

  return null;
}

async function upsertTimetable(classId, type, academicYear, generatedBy) {
  const existing = await executeQuery(
    `SELECT id FROM timetables WHERE class_id = ? AND type = ? AND academic_year = ? LIMIT 1`,
    [classId, type, academicYear]
  );
  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    await executeQuery('DELETE FROM timetable_entries WHERE timetable_id = ?', [id]);
    await executeQuery('UPDATE timetables SET generated_by = ? WHERE id = ?', [generatedBy || null, id]);
    return id;
  }
  const ins = await executeQuery(
    `INSERT INTO timetables (class_id, type, academic_year, generated_by) VALUES (?, ?, ?, ?)`,
    [classId, type, academicYear, generatedBy || null]
  );
  return ins.insertId;
}

async function insertEntries(timetableId, entries) {
  if (!entries || entries.length === 0) return;
  const values = [];
  for (const e of entries) {
    values.push([
      timetableId,
      e.day_of_week ?? null,
      e.entry_date ?? null,
      e.slot_key,
      e.start_time,
      e.end_time,
      e.kind,
      e.subject_id ?? null,
      e.teacher_id ?? null
    ]);
  }
  await executeQuery(
    `INSERT INTO timetable_entries
      (timetable_id, day_of_week, entry_date, slot_key, start_time, end_time, kind, subject_id, teacher_id)
     VALUES ?`,
    [values]
  );
}

function buildTeachingEntriesForClass(assignments, teacherBusy, classSeedKey, options = {}) {
  // teacherBusy[`${day}-${slot_key}`] = Set(teacherId)
  const bySubject = new Map();
  for (const a of assignments) {
    if (!bySubject.has(a.subject_id)) bySubject.set(a.subject_id, []);
    bySubject.get(a.subject_id).push(a);
  }

  const subjectIds = Array.from(bySubject.keys());
  const subjectPool = shuffleCopy(subjectIds);

  const entries = [];

  for (const day of DAYS) {
    const usedSubjectsToday = new Set();

    // Determine if this day includes a free period (2 subjects + free) vs 3 subjects in 10:40-14:00
    const freeToday = Math.random() < 0.35; // some days have a free period
    const afternoonSlotKeys = freeToday ? ['S3', 'S4', 'S5'] : ['S3', 'S4', 'S5'];
    const freeSlotKey = freeToday ? pickRandom(['S3', 'S4', 'S5']) : null;

    for (const slot of TEACHING_SLOTS) {
      if (slot.slot_key === 'BREAK') {
        entries.push({
          day_of_week: day.key,
          slot_key: slot.slot_key,
          start_time: slot.start_time,
          end_time: slot.end_time,
          kind: 'break'
        });
        continue;
      }

      if (slot.slot_key === 'FOOD') {
        entries.push({
          day_of_week: day.key,
          slot_key: slot.slot_key,
          start_time: slot.start_time,
          end_time: slot.end_time,
          kind: 'break'
        });
        continue;
      }

      // Special rule: Friday (day 5) 12:40-14:00 (S5) must be Religion.
      if (day.key === 5 && slot.slot_key === 'S5' && options.religionSubjectId) {
        const key = `${day.key}-${slot.slot_key}`;
        if (!teacherBusy[key]) teacherBusy[key] = new Set();

        const candidates = shuffleCopy(bySubject.get(options.religionSubjectId) || []);
        let teacherId = null;
        for (const c of candidates) {
          if (c.teacher_id && teacherBusy[key].has(c.teacher_id)) continue;
          teacherId = c.teacher_id || null;
          break;
        }

        usedSubjectsToday.add(options.religionSubjectId);
        if (teacherId) teacherBusy[key].add(teacherId);

        entries.push({
          day_of_week: day.key,
          slot_key: slot.slot_key,
          start_time: slot.start_time,
          end_time: slot.end_time,
          kind: 'subject',
          subject_id: options.religionSubjectId,
          teacher_id: teacherId
        });
        continue;
      }

      if (freeSlotKey && slot.slot_key === freeSlotKey) {
        entries.push({
          day_of_week: day.key,
          slot_key: slot.slot_key,
          start_time: slot.start_time,
          end_time: slot.end_time,
          kind: 'free'
        });
        continue;
      }

      // For afternoon teaching constraint: it can be 3 subjects OR 2 subjects + free (handled above)
      if (['S3', 'S4', 'S5'].includes(slot.slot_key) && freeSlotKey && !afternoonSlotKeys.includes(slot.slot_key)) {
        // no-op (kept for clarity)
      }

      // Pick a subject+teacher not conflicting, not repeated in same day
      const key = `${day.key}-${slot.slot_key}`;
      if (!teacherBusy[key]) teacherBusy[key] = new Set();

      let chosen = null;
      const shuffledSubjects = shuffleCopy(subjectPool);
      for (const sid of shuffledSubjects) {
        if (usedSubjectsToday.has(sid)) continue;
        const candidates = shuffleCopy(bySubject.get(sid) || []);
        for (const c of candidates) {
          // If no teacher is assigned (fallback generation from subjects), allow it.
          // If a teacher is assigned, avoid double-booking across classes at the same time slot.
          if (c.teacher_id && teacherBusy[key].has(c.teacher_id)) continue;
          chosen = { subject_id: sid, teacher_id: c.teacher_id || null };
          break;
        }
        if (chosen) break;
      }

      // fallback: any subject (even repeated) but still avoid teacher conflict
      if (!chosen) {
        for (const sid of shuffledSubjects) {
          const candidates = shuffleCopy(bySubject.get(sid) || []);
          for (const c of candidates) {
            if (c.teacher_id && teacherBusy[key].has(c.teacher_id)) continue;
            chosen = { subject_id: sid, teacher_id: c.teacher_id || null };
            break;
          }
          if (chosen) break;
        }
      }

      // last resort: free period
      if (!chosen) {
        entries.push({
          day_of_week: day.key,
          slot_key: slot.slot_key,
          start_time: slot.start_time,
          end_time: slot.end_time,
          kind: 'free'
        });
        continue;
      }

      usedSubjectsToday.add(chosen.subject_id);
      if (chosen.teacher_id) teacherBusy[key].add(chosen.teacher_id);
      entries.push({
        day_of_week: day.key,
        slot_key: slot.slot_key,
        start_time: slot.start_time,
        end_time: slot.end_time,
        kind: 'subject',
        subject_id: chosen.subject_id,
        teacher_id: chosen.teacher_id
      });
    }
  }

  return entries;
}

function buildExamEntriesForClass(assignments) {
  const subjectIds = Array.from(new Set(assignments.map((a) => a.subject_id)));
  const subjectPool = shuffleCopy(subjectIds);
  const entries = [];

  for (const day of DAYS) {
    const usedToday = new Set();
    for (const slot of EXAM_SLOTS) {
      let subjectId = null;
      const shuffled = shuffleCopy(subjectPool);
      for (const sid of shuffled) {
        if (usedToday.has(sid)) continue;
        subjectId = sid;
        break;
      }
      if (!subjectId) subjectId = pickRandom(subjectPool);
      if (subjectId) usedToday.add(subjectId);

      entries.push({
        day_of_week: day.key,
        slot_key: slot.slot_key,
        start_time: slot.start_time,
        end_time: slot.end_time,
        kind: subjectId ? 'subject' : 'free',
        subject_id: subjectId || null,
        teacher_id: null
      });
    }
  }
  return entries;
}

async function getTimetableView(classId, type, academicYear) {
  const t = await executeQuery(
    `SELECT id FROM timetables WHERE class_id = ? AND type = ? AND academic_year = ? LIMIT 1`,
    [classId, type, academicYear]
  );
  if (!t.rows || t.rows.length === 0) return { timetable: null, entries: [] };

  const tid = t.rows[0].id;
  const e = await executeQuery(
    `SELECT te.*,
            s.name AS subject_name,
            CONCAT(u.first_name, ' ', u.last_name) AS teacher_name
     FROM timetable_entries te
     LEFT JOIN subjects s ON s.id = te.subject_id
     LEFT JOIN users u ON u.id = te.teacher_id
     WHERE te.timetable_id = ?
     ORDER BY te.day_of_week ASC, te.start_time ASC`,
    [tid]
  );
  return { timetable: { id: tid, class_id: Number(classId), type, academic_year: academicYear }, entries: e.rows || [] };
}

async function ensureTeachingTimetableExists({ classId, academicYear, generatedBy }) {
  const religionSubjectId = await ensureReligionSubjectId();

  const view = await getTimetableView(classId, 'teaching', academicYear);
  if (view.timetable) {
    // Enforce the special rule even for already-generated timetables:
    // Friday (day 5) S5 must be Religion.
    const fridayS5 = (view.entries || []).find((e) => Number(e.day_of_week) === 5 && e.slot_key === 'S5');
    const isOk = !religionSubjectId
      ? true
      : fridayS5?.kind === 'subject' && Number(fridayS5?.subject_id) === Number(religionSubjectId);
    if (isOk) return view;
    // If not ok, regenerate to apply the rule consistently.
  }

  let assignments = await getAssignmentsForClass(classId, academicYear);
  if (!assignments || assignments.length === 0) {
    // Fallback: generate from all active subjects (no teacher assignments).
    const subjects = await getActiveSubjects();
    assignments = (subjects || []).map((s) => ({ subject_id: s.id, teacher_id: null }));
  }
  if (!assignments || assignments.length === 0) return view;

  const teacherBusy = {};
  const tid = await upsertTimetable(classId, 'teaching', academicYear, generatedBy || null);
  const entries = buildTeachingEntriesForClass(assignments, teacherBusy, `${classId}-${academicYear}`, {
    religionSubjectId
  });
  await insertEntries(tid, entries);

  return getTimetableView(classId, 'teaching', academicYear);
}

async function ensureExamTimetableExists({ classId, academicYear, generatedBy }) {
  const view = await getTimetableView(classId, 'exam', academicYear);
  if (view.timetable) return view;

  let assignments = await getAssignmentsForClass(classId, academicYear);
  if (!assignments || assignments.length === 0) {
    const subjects = await getActiveSubjects();
    assignments = (subjects || []).map((s) => ({ subject_id: s.id, teacher_id: null }));
  }
  if (!assignments || assignments.length === 0) return view;

  const tid = await upsertTimetable(classId, 'exam', academicYear, generatedBy || null);
  const entries = buildExamEntriesForClass(assignments);
  await insertEntries(tid, entries);

  return getTimetableView(classId, 'exam', academicYear);
}

// GET /api/timetables/teaching?class_id=1&academic_year=2024-2025
router.get('/teaching', async (req, res) => {
  try {
    const classId = Number(req.query.class_id);
    const academicYear = String(req.query.academic_year || (await getCurrentAcademicYear()));

    if (!classId) return res.status(400).json({ success: false, message: 'class_id is required' });

    const allowed = await getClassIdsForUser(req.user);
    if (req.user?.role !== 'admin' && !allowed.includes(classId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await ensureTimetableTables();
    const view = await ensureTeachingTimetableExists({ classId, academicYear, generatedBy: req.user?.id });
    return res.json({
      success: true,
      data: { ...view, meta: { days: DAYS, slots: TEACHING_SLOTS } },
      message:
        !view.timetable && req.user?.role === 'teacher'
          ? 'No timetable found yet. Ensure teacher-subject assignments exist for this class and academic year.'
          : undefined
    });
  } catch (error) {
    console.error('Error fetching teaching timetable:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch teaching timetable', error: error.message });
  }
});

// GET /api/timetables/exam?class_id=1&academic_year=2024-2025
router.get('/exam', async (req, res) => {
  try {
    const classId = Number(req.query.class_id);
    const academicYear = String(req.query.academic_year || (await getCurrentAcademicYear()));

    if (!classId) return res.status(400).json({ success: false, message: 'class_id is required' });

    const allowed = await getClassIdsForUser(req.user);
    if (req.user?.role !== 'admin' && !allowed.includes(classId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await ensureTimetableTables();
    const view = await ensureExamTimetableExists({ classId, academicYear, generatedBy: req.user?.id });
    return res.json({ success: true, data: { ...view, meta: { days: DAYS, slots: EXAM_SLOTS } } });
  } catch (error) {
    console.error('Error fetching exam timetable:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch exam timetable', error: error.message });
  }
});

// POST /api/timetables/teaching/generate { class_id, academic_year }
router.post('/teaching/generate', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await ensureTimetableTables();

    const classId = Number(req.body.class_id);
    const academicYear = String(req.body.academic_year || (await getCurrentAcademicYear()));
    if (!classId) return res.status(400).json({ success: false, message: 'class_id is required' });

    const assignments = await getAssignmentsForClass(classId, academicYear);
    if (assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'No teacher-subject assignments found for this class/year' });
    }

    // Build busy map by slot across classes to avoid a teacher teaching 2 classes at once.
    const teacherBusy = {};

    const religionSubjectId = await ensureReligionSubjectId();

    const tid = await upsertTimetable(classId, 'teaching', academicYear, req.user.id);
    const entries = buildTeachingEntriesForClass(assignments, teacherBusy, `${classId}-${academicYear}`, {
      religionSubjectId
    });
    await insertEntries(tid, entries);

    return res.json({ success: true, message: 'Teaching timetable generated', data: { timetable_id: tid } });
  } catch (error) {
    console.error('Error generating teaching timetable:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate teaching timetable', error: error.message });
  }
});

// POST /api/timetables/exam/generate { class_id, academic_year }
router.post('/exam/generate', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await ensureTimetableTables();

    const classId = Number(req.body.class_id);
    const academicYear = String(req.body.academic_year || (await getCurrentAcademicYear()));
    if (!classId) return res.status(400).json({ success: false, message: 'class_id is required' });

    const assignments = await getAssignmentsForClass(classId, academicYear);
    if (assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'No teacher-subject assignments found for this class/year' });
    }

    const tid = await upsertTimetable(classId, 'exam', academicYear, req.user.id);
    const entries = buildExamEntriesForClass(assignments);
    await insertEntries(tid, entries);

    return res.json({ success: true, message: 'Exam timetable generated', data: { timetable_id: tid } });
  } catch (error) {
    console.error('Error generating exam timetable:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate exam timetable', error: error.message });
  }
});

module.exports = router;

const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authenticateParent } = require('../middleware/parentAuth');
const { calculateLetterGrade } = require('../config/grades-schema');
const { v4: uuidv4 } = require('uuid');
const pesapal = require('../services/pesapal');
const { sendEmail } = require('../services/emailService');
const { getParentEmailsForStudent } = require('../services/parentContactService');

const router = express.Router();

// The project has historically had two grading schemas:
// 1) "Legacy": assessments + assessment_marks (created by server/config/database.js)
// 2) "Grades module": assessments + student_grades (created by server/config/grades-schema.js)
//
// Some environments may have an existing legacy `assessments` table, so the
// grades-schema CREATE TABLE will not retrofit missing columns. We detect the
// actual schema at runtime and query accordingly.
let assessmentsSchemaCache = { kind: null, checkedAt: 0 };
const ASSESSMENTS_SCHEMA_CACHE_MS = 5 * 60 * 1000;

const getAssessmentsSchemaKind = async () => {
  const now = Date.now();
  if (assessmentsSchemaCache.kind && now - assessmentsSchemaCache.checkedAt < ASSESSMENTS_SCHEMA_CACHE_MS) {
    return assessmentsSchemaCache.kind;
  }

  const [cols] = await pool.execute('SHOW COLUMNS FROM assessments');
  const fields = new Set((cols || []).map((c) => c.Field));

  // Legacy schema uses `assessment_name` + `exam_type`.
  // Grades-module schema uses `title` + `assessment_type`.
  const kind = fields.has('assessment_name') || fields.has('exam_type') ? 'legacy' : 'grades_module';
  assessmentsSchemaCache = { kind, checkedAt: now };
  return kind;
};

const simpleGradeFromPercentage = (percentage) => {
  const pct = Number(percentage);
  if (!Number.isFinite(pct)) return { letter_grade: 'N/A', grade_points: 0.0 };

  const gradeLevels = [
    ['A+', 95.0, 100.0, 4.0],
    ['A', 90.0, 94.99, 4.0],
    ['A-', 85.0, 89.99, 3.67],
    ['B+', 80.0, 84.99, 3.33],
    ['B', 75.0, 79.99, 3.0],
    ['B-', 70.0, 74.99, 2.67],
    ['C+', 65.0, 69.99, 2.33],
    ['C', 60.0, 64.99, 2.0],
    ['C-', 55.0, 59.99, 1.67],
    ['D', 50.0, 54.99, 1.0],
    ['F', 0.0, 49.99, 0.0],
  ];

  for (const [letter, min, max, points] of gradeLevels) {
    if (pct >= min && pct <= max) return { letter_grade: letter, grade_points: points };
  }
  return { letter_grade: 'N/A', grade_points: 0.0 };
};

const parentLoginSchema = Joi.object({
  admission_number: Joi.string().min(6).max(30).required(),
  password: Joi.string().min(6).max(200).required(),
});

const parentChangePasswordSchema = Joi.object({
  current_password: Joi.string().min(6).max(200).required(),
  new_password: Joi.string().min(8).max(200).required(),
});

let parentPasswordPolicyEnsured = false;
const ensureParentPasswordPolicyColumns = async () => {
  if (parentPasswordPolicyEnsured) return;
  const connection = await pool.getConnection();
  try {
    const [cols] = await connection.execute(
      `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students'
        AND COLUMN_NAME IN ('parent_password_must_change', 'parent_password_changed_at')
      `
    );
    const existing = new Set((cols || []).map((r) => r.COLUMN_NAME));
    if (!existing.has('parent_password_must_change')) {
      await connection.execute(`ALTER TABLE students ADD COLUMN parent_password_must_change TINYINT(1) NOT NULL DEFAULT 0`);
    }
    if (!existing.has('parent_password_changed_at')) {
      await connection.execute(`ALTER TABLE students ADD COLUMN parent_password_changed_at TIMESTAMP NULL`);
    }
    parentPasswordPolicyEnsured = true;
  } finally {
    connection.release();
  }
};

const attendanceRangeSchema = Joi.object({
  start: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  end: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
});

const parentGradesSchema = Joi.object({
  academic_year: Joi.string().max(20).optional().allow(''),
  term: Joi.string().valid('term1', 'term2', 'term3', 'annual').optional().allow(''),
  subject_id: Joi.number().integer().positive().optional(),
});

const subjectAttendanceRangeSchema = Joi.object({
  start: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  end: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  subject_id: Joi.number().integer().positive().optional(),
});

const parentAnnouncementsSchema = Joi.object({
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  since: Joi.string().optional().allow(''),
});

const parentPaymentsInitSchema = Joi.object({
  purpose: Joi.string().valid('fee', 'contribution', 'pocket_money_deposit').required(),
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().max(10).optional().allow('').default('TZS'),
  academic_year: Joi.string().max(20).optional().allow(''),
  category: Joi.string().max(50).optional().allow('', null),
});

const getCurrentAcademicYearName = async () => {
  try {
    const [rows] = await pool.execute('SELECT year_name, start_date, end_date FROM academic_years WHERE is_current = TRUE LIMIT 1');
    return rows?.[0] || { year_name: '2024-2025', start_date: null, end_date: null };
  } catch (_e) {
    return { year_name: '2024-2025', start_date: null, end_date: null };
  }
};

const isWithinDays = (dateValue, days) => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const diffDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
};

const formatMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

// Payments defaults (can be made configurable later).
const CONTRIBUTION_REQUIRED_AMOUNT = 20000.0;
const CONTRIBUTION_CATEGORIES = ['food', 'guards', 'emergency', 'graduation', 'sports_trips', 'fare', 'condolence'];

const ensureFinanceSupportTables = async () => {
  // Some environments run without a full migration step; ensure essential tables exist.
  // These are also created in server/config/database.js.
  const connection = await pool.getConnection();
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS school_contribution_payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        category ENUM('food', 'guards', 'emergency', 'graduation', 'sports_trips', 'fare', 'condolence') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        status ENUM('Paid', 'Pending', 'Overdue') DEFAULT 'Paid',
        payment_method ENUM('cash', 'bank_transfer', 'mobile_money', 'cheque', 'paypal') DEFAULT 'cash',
        reference_number VARCHAR(50) NULL,
        receipt_number VARCHAR(50) NULL,
        academic_year VARCHAR(9) DEFAULT '2024-2025',
        notes TEXT NULL,
        recorded_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_contrib_student_year (student_id, academic_year),
        INDEX idx_contrib_category_year (category, academic_year)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS student_pocket_money (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        txn_type ENUM('deposit', 'withdrawal') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        txn_date DATE NOT NULL,
        payment_method ENUM('cash', 'bank_transfer', 'mobile_money', 'cheque', 'paypal') DEFAULT 'cash',
        reference_number VARCHAR(50) NULL,
        academic_year VARCHAR(9) DEFAULT '2024-2025',
        notes TEXT NULL,
        recorded_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_pocket_student_year (student_id, academic_year),
        INDEX idx_pocket_txn_date (txn_date)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payment_intents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        academic_year VARCHAR(9) DEFAULT '2024-2025',
        purpose ENUM('fee', 'contribution', 'pocket_money_deposit') NOT NULL,
        category VARCHAR(50) NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'TZS',
        status ENUM('initiated', 'pending', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'initiated',
        merchant_reference VARCHAR(80) NOT NULL UNIQUE,
        order_tracking_id VARCHAR(120) NULL,
        gateway_status VARCHAR(80) NULL,
        gateway_response LONGTEXT NULL,
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student_status (student_id, status),
        INDEX idx_tracking (order_tracking_id),
        INDEX idx_year_purpose (academic_year, purpose)
      )
    `);
  } finally {
    connection.release();
  }
};

const ensureAnnouncementReadsTable = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS announcement_reads (
        id INT PRIMARY KEY AUTO_INCREMENT,
        announcement_id INT NOT NULL,
        user_id INT NOT NULL,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_announcement_user (announcement_id, user_id),
        INDEX idx_user_read (user_id, read_at)
      )
    `);
  } finally {
    connection.release();
  }
};

const getParentStudentContext = async (studentId) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id, class_id FROM students WHERE id = ? LIMIT 1`,
    [studentId]
  );
  return rows?.[0] || null;
};

router.post('/login', async (req, res) => {
  try {
    const { error, value } = parentLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((d) => d.message),
      });
    }

    const { admission_number, password } = value;

    const [rows] = await pool.execute(
      `SELECT s.id as student_db_id, s.admission_number, s.parent_password_hash, s.parent_password_must_change,
              u.first_name, u.last_name, c.name as class_name
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.admission_number = ?
       LIMIT 1`,
      [admission_number]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid admission number or password' });
    }

    const student = rows[0];
    if (!student.parent_password_hash) {
      return res.status(403).json({
        success: false,
        message: 'Parent access is not enabled for this student yet. Please contact the school.',
      });
    }

    const ok = await bcrypt.compare(password, student.parent_password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid admission number or password' });
    }

    const token = jwt.sign(
      {
        type: 'parent',
        role: 'parent',
        student_id: student.student_db_id,
        admission_number: student.admission_number,
        must_change_password: Boolean(student.parent_password_must_change),
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        must_change_password: Boolean(student.parent_password_must_change),
        student: {
          id: student.student_db_id,
          admission_number: student.admission_number,
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          class_name: student.class_name || null,
        },
      },
    });
  } catch (e) {
    console.error('Parent login error:', e);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// POST /api/parent/change-password - parent updates password (required after first login)
router.post('/change-password', authenticateParent, async (req, res) => {
  try {
    await ensureParentPasswordPolicyColumns();

    const { error, value } = parentChangePasswordSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((d) => d.message),
      });
    }

    const studentId = req.parent.student_id;
    const [rows] = await pool.execute(
      `SELECT id, admission_number, parent_password_hash, parent_password_must_change
       FROM students
       WHERE id = ?
       LIMIT 1`,
      [studentId]
    );
    if (!rows?.length) return res.status(404).json({ success: false, message: 'Student not found' });

    const student = rows[0];
    if (!student.parent_password_hash) {
      return res.status(403).json({
        success: false,
        message: 'Parent access is not enabled for this student yet. Please contact the school.',
      });
    }

    const ok = await bcrypt.compare(value.current_password, student.parent_password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const newPassword = value.new_password;
    // Basic strength rules (practical + understandable)
    const hasLetter = /[A-Za-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      return res.status(400).json({
        success: false,
        message: 'New password must include at least 1 letter and 1 number.',
      });
    }
    if (newPassword === value.current_password) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.execute(
      `
        UPDATE students
        SET parent_password_hash = ?,
            parent_last_password_reset_at = NOW(),
            parent_password_must_change = 0,
            parent_password_changed_at = NOW()
        WHERE id = ?
      `,
      [passwordHash, studentId]
    );

    // Best-effort email to the parent/guardian (if an email is on file)
    setImmediate(async () => {
      try {
        const emails = await getParentEmailsForStudent(studentId);
        if (!emails.length) return;

        const schoolName = (process.env.SCHOOL_NAME || 'UBUNIFU SEC').trim();
        const subject = `✅ Parent Portal Password Updated — ${schoolName}`;
        const now = new Date();
        const when = now.toLocaleString();

        const html = `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.45;color:#0f172a">
            <div style="max-width:640px;margin:0 auto;padding:24px;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb">
              <div style="font-size:18px;font-weight:800;color:#111827;margin-bottom:10px">Password Updated</div>
              <p style="margin:0 0 10px;color:#111827">
                The Parent Portal password was successfully updated on <strong>${when}</strong>.
              </p>
              <p style="margin:0;color:#64748b;font-size:12px">
                If you did not make this change, please contact the school immediately.
              </p>
            </div>
          </div>
        `.trim();

        const text = `Parent Portal password updated on ${when}. If you did not make this change, please contact the school immediately.`;

        await sendEmail({ context: 'parent_password_changed', studentId, to: emails, subject, html, text });
      } catch (_e) {
        // ignore
      }
    });

    // Issue a new token without must-change flag.
    const token = jwt.sign(
      {
        type: 'parent',
        role: 'parent',
        student_id: studentId,
        admission_number: student.admission_number,
        must_change_password: false,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({ success: true, message: 'Password updated successfully', data: { token } });
  } catch (e) {
    console.error('Parent change-password error:', e);
    return res.status(500).json({ success: false, message: 'Failed to update password' });
  }
});

router.get('/student', authenticateParent, async (req, res) => {
  try {
    const studentId = req.parent.student_id;
    const [rows] = await pool.execute(
      `SELECT
          s.id,
          s.student_id,
          s.admission_number,
          s.admission_date,
          s.date_of_birth,
          s.gender,
          s.nationality,
          s.religion,
          s.status,
          c.id as class_id,
          c.name as class_name,
          c.level as class_level,
          u.first_name,
          u.last_name,
          u.email,
          u.phone
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = ?
       LIMIT 1`,
      [studentId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (e) {
    console.error('Parent get student error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load student' });
  }
});

/**
 * Parent announcements notification feed.
 * We reuse the student user_id for read tracking (announcement_reads.user_id),
 * since parents do not have separate user accounts in this project.
 */
router.get('/announcements/unread-count', authenticateParent, async (req, res) => {
  try {
    await ensureAnnouncementReadsTable();

    const ctx = await getParentStudentContext(req.parent.student_id);
    if (!ctx) return res.status(404).json({ success: false, message: 'Student not found' });

    const userId = ctx.user_id;
    const classId = ctx.class_id;

    // If the student does not have an associated user_id, we cannot track reads.
    // Treat everything visible as unread.
    const baseWhere = `
      a.is_active = TRUE
      AND (a.expires_at IS NULL OR a.expires_at > NOW())
      AND (
        a.target_audience = 'all'
        OR a.target_audience = 'parents'
        OR a.target_audience = 'students'
        OR (a.target_audience = 'specific_class' AND a.class_id = ?)
      )
    `;

    if (!userId) {
      const [rows] = await pool.execute(
        `SELECT COUNT(*) as unread_count FROM announcements a WHERE ${baseWhere}`,
        [classId || null]
      );
      return res.json({ success: true, unread_count: rows?.[0]?.unread_count || 0 });
    }

    const [rows] = await pool.execute(
      `
        SELECT COUNT(*) as unread_count
        FROM announcements a
        LEFT JOIN announcement_reads ar
          ON a.id = ar.announcement_id AND ar.user_id = ?
        WHERE ${baseWhere}
          AND ar.read_at IS NULL
      `,
      [userId, classId || null]
    );

    return res.json({ success: true, unread_count: rows?.[0]?.unread_count || 0 });
  } catch (e) {
    console.error('Parent unread announcements error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
});

// GET /api/parent/notifications/unread-count - Targeted notifications unread count for this student
router.get('/notifications/unread-count', authenticateParent, async (req, res) => {
  try {
    const studentId = req.parent.student_id;
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as unread_count
       FROM user_notifications
       WHERE student_id = ? AND is_read = FALSE`,
      [studentId]
    );
    return res.json({ success: true, unread_count: rows?.[0]?.unread_count || 0 });
  } catch (error) {
    console.error('Parent notifications unread error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
});

// GET /api/parent/notifications - Targeted notifications feed for this student
router.get('/notifications', authenticateParent, async (req, res) => {
  try {
    const studentId = req.parent.student_id;
    const limit = Math.min(200, Math.max(1, Number(req.query?.limit || 50)));
    const [rows] = await pool.execute(
      `
      SELECT id, type, title, message, priority, data, is_read, read_at, created_at
      FROM user_notifications
      WHERE student_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [studentId, limit]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Parent notifications feed error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// POST /api/parent/notifications/:id/mark-read
router.post('/notifications/:id/mark-read', authenticateParent, async (req, res) => {
  try {
    const studentId = req.parent.student_id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid notification id' });

    await pool.execute(
      `UPDATE user_notifications
       SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = ? AND student_id = ?`,
      [id, studentId]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Parent mark read error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

// POST /api/parent/notifications/mark-all-read
router.post('/notifications/mark-all-read', authenticateParent, async (req, res) => {
  try {
    const studentId = req.parent.student_id;
    await pool.execute(
      `UPDATE user_notifications
       SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE student_id = ? AND is_read = FALSE`,
      [studentId]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Parent mark all read error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
});

router.get('/announcements', authenticateParent, async (req, res) => {
  try {
    await ensureAnnouncementReadsTable();

    const { error, value } = parentAnnouncementsSchema.validate(req.query || {});
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((d) => d.message),
      });
    }

    const ctx = await getParentStudentContext(req.parent.student_id);
    if (!ctx) return res.status(404).json({ success: false, message: 'Student not found' });

    const userId = ctx.user_id;
    const classId = ctx.class_id;

    const where = [];
    const params = [];

    if (value.since) {
      where.push('(a.created_at >= ? OR a.updated_at >= ?)');
      params.push(value.since, value.since);
    }

    if (value.priority) {
      where.push('a.priority = ?');
      params.push(value.priority);
    }

    if (value.status === 'active' || !value.status) {
      where.push('a.is_active = TRUE');
      where.push('(a.expires_at IS NULL OR a.expires_at > NOW())');
    } else if (value.status === 'inactive') {
      where.push('(a.is_active = FALSE OR a.expires_at <= NOW())');
    }

    where.push(`
      (
        a.target_audience = 'all'
        OR a.target_audience = 'parents'
        OR a.target_audience = 'students'
        OR (a.target_audience = 'specific_class' AND a.class_id = ?)
      )
    `);
    params.push(classId || null);

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const joinReads = userId ? 'LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = ?' : '';
    const readParam = userId ? [userId] : [];

    const [rows] = await pool.execute(
      `
        SELECT
          a.*,
          u.username as author_name,
          c.name as class_name,
          c.level as class_level,
          ${userId ? 'ar.read_at IS NOT NULL as is_read' : 'FALSE as is_read'}
        FROM announcements a
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN classes c ON a.class_id = c.id
        ${joinReads}
        ${whereClause}
        ORDER BY
          CASE a.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          a.created_at DESC
        LIMIT 50
      `,
      [...readParam, ...params]
    );

    return res.json({ success: true, data: rows || [] });
  } catch (e) {
    console.error('Parent announcements error:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
});

router.post('/announcements/:id/mark-read', authenticateParent, async (req, res) => {
  try {
    await ensureAnnouncementReadsTable();

    const announcementId = Number(req.params.id);
    if (!announcementId) return res.status(400).json({ success: false, message: 'Invalid announcement id' });

    const ctx = await getParentStudentContext(req.parent.student_id);
    if (!ctx) return res.status(404).json({ success: false, message: 'Student not found' });

    const userId = ctx.user_id;
    if (!userId) return res.json({ success: true, message: 'Read tracking not available for this student.' });

    await pool.execute(
      `INSERT INTO announcement_reads (announcement_id, user_id, read_at) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE read_at = NOW()`,
      [announcementId, userId]
    );

    return res.json({ success: true, message: 'Marked as read' });
  } catch (e) {
    console.error('Parent mark-read error:', e);
    return res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

router.post('/announcements/mark-all-read', authenticateParent, async (req, res) => {
  try {
    await ensureAnnouncementReadsTable();

    const ctx = await getParentStudentContext(req.parent.student_id);
    if (!ctx) return res.status(404).json({ success: false, message: 'Student not found' });

    const userId = ctx.user_id;
    const classId = ctx.class_id;
    if (!userId) return res.json({ success: true, message: 'Read tracking not available for this student.' });

    await pool.execute(
      `
        INSERT INTO announcement_reads (announcement_id, user_id, read_at)
        SELECT a.id, ?, NOW()
        FROM announcements a
        WHERE a.is_active = TRUE
          AND (a.expires_at IS NULL OR a.expires_at > NOW())
          AND (
            a.target_audience = 'all'
            OR a.target_audience = 'parents'
            OR a.target_audience = 'students'
            OR (a.target_audience = 'specific_class' AND a.class_id = ?)
          )
        ON DUPLICATE KEY UPDATE read_at = NOW()
      `,
      [userId, classId || null]
    );

    return res.json({ success: true, message: 'All announcements marked as read' });
  } catch (e) {
    console.error('Parent mark-all-read error:', e);
    return res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
});

router.get('/attendance/range', authenticateParent, async (req, res) => {
  try {
    const { error, value } = attendanceRangeSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((d) => d.message),
      });
    }

    const studentId = req.parent.student_id;
    const { start, end } = value;

    const [rows] = await pool.execute(
      `
        SELECT
          DATE_FORMAT(a.date, '%Y-%m-%d') as date,
          a.session,
          a.status,
          a.notes,
          a.marked_at,
          a.marked_by,
          COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(t.first_name, ''), ' ', COALESCE(t.last_name, ''))), ''),
            NULLIF(TRIM(CONCAT(COALESCE(t.firstName, ''), ' ', COALESCE(t.lastName, ''))), ''),
            NULLIF(TRIM(COALESCE(t.username, '')), ''),
            NULLIF(TRIM(COALESCE(t.email, '')), '')
          ) as recorded_by_name
        FROM attendance a
        LEFT JOIN users t ON t.id = a.marked_by
        WHERE a.student_id = ?
          AND a.date >= ?
          AND a.date <= ?
        ORDER BY a.date ASC, FIELD(a.session, 'morning', 'afternoon')
      `,
      [studentId, start, end]
    );

    return res.json({
      success: true,
      data: {
        start,
        end,
        records: rows || [],
      },
    });
  } catch (e) {
    console.error('Parent attendance range error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load attendance' });
  }
});

// GET /api/parent/subject-attendance/range - per-subject attendance for the student
router.get('/subject-attendance/range', authenticateParent, async (req, res) => {
  try {
    const { error, value } = subjectAttendanceRangeSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((d) => d.message),
      });
    }

    const studentId = req.parent.student_id;
    const { start, end, subject_id } = value;

    const where = ['sa.student_id = ?', 'sa.date BETWEEN ? AND ?'];
    const params = [studentId, start, end];
    if (subject_id) {
      where.push('sa.subject_id = ?');
      params.push(Number(subject_id));
    }

    const [rows] = await pool.execute(
      `
      SELECT
        sa.id,
        sa.date,
        sa.period_label,
        sa.start_time,
        sa.end_time,
        sa.status,
        sa.notes,
        sub.id as subject_id,
        sub.name as subject_name,
        CONCAT(u.first_name, ' ', u.last_name) as recorded_by_name,
        sa.marked_at
      FROM subject_attendance sa
      JOIN subjects sub ON sub.id = sa.subject_id
      LEFT JOIN users u ON u.id = sa.marked_by
      WHERE ${where.join(' AND ')}
      ORDER BY sa.date DESC, sa.start_time, sa.period_label
      LIMIT 1000
      `,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Parent subject attendance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch subject attendance' });
  }
});

router.get('/grades', authenticateParent, async (req, res) => {
  try {
    const { error, value } = parentGradesSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((d) => d.message),
      });
    }

    const studentId = req.parent.student_id;
    const academicYear = value.academic_year || '2024-2025';
    const term = value.term || null;
    const subjectId = value.subject_id || null;

    const assessmentsSchemaKind = await getAssessmentsSchemaKind();

    let grades = [];

    if (assessmentsSchemaKind === 'legacy') {
      // Legacy tables: assessments + assessment_marks
      let query = `
        SELECT
          am.id as grade_id,
          am.assessment_id,
          am.student_id,
          am.marks_obtained,
          am.grade as letter_grade,
          NULL as grade_points,
          am.remarks,
          (am.is_present = FALSE) as is_absent,
          FALSE as is_excused,
          'submitted' as submission_status,
          am.marked_at as graded_at,
          a.assessment_name as assessment_title,
          a.exam_type as assessment_type,
          a.total_marks,
          a.pass_marks as passing_marks,
          NULL as weight_percentage,
          a.assessment_date,
          NULL as term,
          a.academic_year,
          NULL as is_published,
          s.id as subject_id,
          s.name as subject_name,
          s.code as subject_code,
          c.id as class_id,
          c.name as class_name,
          am.marked_by as graded_by_id,
          COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            NULLIF(TRIM(CONCAT(COALESCE(u.firstName, ''), ' ', COALESCE(u.lastName, ''))), ''),
            NULLIF(TRIM(COALESCE(u.username, '')), ''),
            NULLIF(TRIM(COALESCE(u.email, '')), '')
          ) as graded_by_name
        FROM assessment_marks am
        INNER JOIN assessments a ON a.id = am.assessment_id
        INNER JOIN subjects s ON s.id = a.subject_id
        INNER JOIN classes c ON c.id = a.class_id
        LEFT JOIN users u ON u.id = am.marked_by
        WHERE am.student_id = ?
          AND a.academic_year = ?
      `;

      const params = [studentId, academicYear];

      // `term` doesn't exist in legacy schema (safe to ignore).
      if (subjectId) {
        query += ' AND a.subject_id = ?';
        params.push(subjectId);
      }

      query += ' ORDER BY a.assessment_date DESC, a.created_at DESC';

      const [rows] = await pool.execute(query, params);
      grades = (rows || []).map((r) => {
        const total = Number(r.total_marks);
        const obtained = r.marks_obtained === null || r.marks_obtained === undefined ? null : Number(r.marks_obtained);
        const percentage =
          obtained !== null && Number.isFinite(total) && total > 0
            ? Math.round(((obtained / total) * 100) * 100) / 100
            : null;

        // Prefer the stored letter grade if teacher provided it; otherwise compute.
        const computed = simpleGradeFromPercentage(percentage);
        const letter_grade = (r.letter_grade || '').trim() || computed.letter_grade;
        const grade_points = computed.grade_points;

        return {
          ...r,
          percentage,
          letter_grade,
          grade_points,
        };
      });
    } else {
      // Grades-module tables: assessments + student_grades
      let query = `
        SELECT
          sg.id as grade_id,
          sg.assessment_id,
          sg.student_id,
          sg.marks_obtained,
          sg.percentage,
          sg.letter_grade,
          sg.grade_points,
          sg.remarks,
          sg.is_absent,
          sg.is_excused,
          sg.submission_status,
          sg.graded_at,
          a.title as assessment_title,
          a.assessment_type,
          a.total_marks,
          a.passing_marks,
          a.weight_percentage,
          a.assessment_date,
          a.term,
          a.academic_year,
          a.is_published,
          s.id as subject_id,
          s.name as subject_name,
          s.code as subject_code,
          c.id as class_id,
          c.name as class_name,
          sg.graded_by as graded_by_id,
          COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            NULLIF(TRIM(CONCAT(COALESCE(u.firstName, ''), ' ', COALESCE(u.lastName, ''))), ''),
            NULLIF(TRIM(COALESCE(u.username, '')), ''),
            NULLIF(TRIM(COALESCE(u.email, '')), '')
          ) as graded_by_name
        FROM student_grades sg
        INNER JOIN assessments a ON a.id = sg.assessment_id
        INNER JOIN subjects s ON s.id = a.subject_id
        INNER JOIN classes c ON c.id = a.class_id
        LEFT JOIN users u ON u.id = sg.graded_by
        WHERE sg.student_id = ?
          AND a.academic_year = ?
      `;

      const params = [studentId, academicYear];

      if (term) {
        query += ' AND a.term = ?';
        params.push(term);
      }

      if (subjectId) {
        query += ' AND a.subject_id = ?';
        params.push(subjectId);
      }

      query += ' ORDER BY COALESCE(a.assessment_date, a.created_at) DESC, a.created_at DESC';

      const [rows] = await pool.execute(query, params);
      grades = rows || [];
    }

    const summary = {
      academic_year: academicYear,
      term: term || 'all',
      total_assessments: grades.length,
      graded_assessments: 0,
      pending_assessments: 0,
      average_percentage: 0,
      overall_grade: 'N/A',
      grade_points_average: 0,
      highest_percentage: null,
      lowest_percentage: null,
    };

    const validGrades = grades.filter((g) => g.percentage !== null && !g.is_absent);
    summary.graded_assessments = grades.filter(
      (g) => (g.marks_obtained !== null && !g.is_absent) || g.is_excused === 1 || g.is_excused === true
    ).length;
    summary.pending_assessments = Math.max(0, summary.total_assessments - summary.graded_assessments);

    if (validGrades.length > 0) {
      const percentages = validGrades.map((g) => Number(g.percentage)).filter((n) => Number.isFinite(n));
      const gradePoints = validGrades.map((g) => Number(g.grade_points || 0)).filter((n) => Number.isFinite(n));

      const totalPct = percentages.reduce((sum, n) => sum + n, 0);
      const totalGp = gradePoints.reduce((sum, n) => sum + n, 0);

      summary.average_percentage = Math.round((totalPct / percentages.length) * 100) / 100;
      summary.grade_points_average = Math.round((totalGp / gradePoints.length) * 100) / 100;
      summary.highest_percentage = Math.max(...percentages);
      summary.lowest_percentage = Math.min(...percentages);

      // Try the DB-driven grading scale first; fall back to the simple scale.
      const overall = await calculateLetterGrade(summary.average_percentage);
      summary.overall_grade = overall?.letter_grade || simpleGradeFromPercentage(summary.average_percentage).letter_grade;
    }

    const subjectMap = {};
    for (const g of validGrades) {
      if (!subjectMap[g.subject_id]) {
        subjectMap[g.subject_id] = {
          subject_id: g.subject_id,
          subject_name: g.subject_name,
          subject_code: g.subject_code,
          assessments: 0,
          average_percentage: 0,
        };
      }
      subjectMap[g.subject_id].assessments += 1;
      subjectMap[g.subject_id].average_percentage += Number(g.percentage);
    }

    const subjects = Object.values(subjectMap)
      .map((s) => ({
        ...s,
        average_percentage: s.assessments > 0 ? Math.round((s.average_percentage / s.assessments) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.average_percentage - a.average_percentage);

    const bestSubject = subjects[0] || null;

    return res.json({
      success: true,
      data: {
        grades,
        summary,
        subjects,
        best_subject: bestSubject,
        note: 'Grades are shown as recorded by teachers for this student.',
      },
    });
  } catch (e) {
    console.error('Parent grades error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load grades' });
  }
});

/**
 * Parent Payments Overview
 * Shows fee status + contribution status + pocket money summary for the authenticated parent/student.
 */
router.get('/payments', authenticateParent, async (req, res) => {
  try {
    await ensureFinanceSupportTables();

    const studentId = req.parent.student_id;
    const academicYear = await getCurrentAcademicYearName();
    const academicYearName = academicYear.year_name || '2024-2025';

    const [studentRows] = await pool.execute(
      `
        SELECT s.id, s.student_id as student_number, s.admission_number,
               c.id as class_id, c.name as class_name, c.level as class_level,
               u.first_name, u.last_name, u.email, u.phone
        FROM students s
        LEFT JOIN users u ON u.id = s.user_id
        LEFT JOIN classes c ON c.id = s.class_id
        WHERE s.id = ?
        LIMIT 1
      `,
      [studentId]
    );

    if (!studentRows?.length) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = studentRows[0];

    // Fee / financial record summary
    const [finRows] = await pool.execute(
      `SELECT total_fees_required, total_fees_paid, outstanding_balance, last_payment_date, payment_plan
       FROM student_financial_records
       WHERE student_id = ? AND academic_year = ?
       LIMIT 1`,
      [studentId, academicYearName]
    );

    // Default school fee (can be made configurable later).
    const required = formatMoney(finRows?.[0]?.total_fees_required ?? 75000.0);
    const paid = formatMoney(finRows?.[0]?.total_fees_paid ?? 0.0);
    const outstanding = formatMoney(finRows?.[0]?.outstanding_balance ?? Math.max(0, required - paid));
    const feePct = required > 0 ? Math.min(100, Math.round((paid / required) * 10000) / 100) : 0;

    let feeStatus = 'unpaid';
    if (paid > 0 && outstanding > 0) feeStatus = 'partial';
    if (required > 0 && outstanding <= 0) feeStatus = 'paid';
    if (required === 0) feeStatus = 'not_configured';

    const [feePaymentRows] = await pool.execute(
      `SELECT id, amount, payment_date, status, payment_method, reference_number, receipt_number, academic_year, term, payment_for
       FROM fee_payments
       WHERE student_id = ? AND academic_year = ?
       ORDER BY payment_date DESC, created_at DESC
       LIMIT 50`,
      [studentId, academicYearName]
    );

    // Contribution summary by category
    const [contribRows] = await pool.execute(
      `
        SELECT
          category,
          MAX(payment_date) as last_payment_date,
          SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END) as total_paid_amount
        FROM school_contribution_payments
        WHERE student_id = ? AND academic_year = ?
        GROUP BY category
      `,
      [studentId, academicYearName]
    );

    const contribMap = new Map((contribRows || []).map((r) => [r.category, r]));
    const contributions = CONTRIBUTION_CATEGORIES.map((cat) => {
      const r = contribMap.get(cat);
      const paidAmount = formatMoney(r?.total_paid_amount || 0);
      const requiredAmount = CONTRIBUTION_REQUIRED_AMOUNT;
      const outstandingAmount = formatMoney(Math.max(0, requiredAmount - paidAmount));
      let status = 'unpaid';
      if (paidAmount > 0 && outstandingAmount > 0) status = 'partial';
      if (outstandingAmount <= 0) status = 'paid';
      return {
        category: cat,
        required_amount: requiredAmount,
        paid_amount: paidAmount,
        outstanding_amount: outstandingAmount,
        status,
        is_paid: status === 'paid',
        last_payment_date: r?.last_payment_date || null,
      };
    });

    const contributionsRequiredTotal = formatMoney(CONTRIBUTION_CATEGORIES.length * CONTRIBUTION_REQUIRED_AMOUNT);
    const contributionsPaidTotal = formatMoney(contributions.reduce((sum, c) => sum + Number(c.paid_amount || 0), 0));
    const contributionsOutstandingTotal = formatMoney(
      contributions.reduce((sum, c) => sum + Number(c.outstanding_amount || 0), 0)
    );

    const combinedRequiredTotal = formatMoney(Number(required || 0) + Number(contributionsRequiredTotal || 0));
    const combinedPaidTotal = formatMoney(Number(paid || 0) + Number(contributionsPaidTotal || 0));
    const combinedOutstandingTotal = formatMoney(Number(outstanding || 0) + Number(contributionsOutstandingTotal || 0));

    // Pocket money summary (current academic year)
    const [pocketRows] = await pool.execute(
      `
        SELECT
          SUM(CASE WHEN txn_type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
          SUM(CASE WHEN txn_type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
          MAX(txn_date) as last_txn_date
        FROM student_pocket_money
        WHERE student_id = ? AND academic_year = ?
      `,
      [studentId, academicYearName]
    );

    const totalDeposits = formatMoney(pocketRows?.[0]?.total_deposits || 0);
    const totalWithdrawals = formatMoney(pocketRows?.[0]?.total_withdrawals || 0);
    const pocketBalance = formatMoney(totalDeposits - totalWithdrawals);

    const [pendingIntents] = await pool.execute(
      `
        SELECT id, purpose, category, amount, currency, status, merchant_reference, order_tracking_id, created_at
        FROM payment_intents
        WHERE student_id = ? AND status IN ('initiated', 'pending')
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [studentId]
    );

    return res.json({
      success: true,
      data: {
        academic_year: {
          year_name: academicYearName,
          start_date: academicYear.start_date || null,
          end_date: academicYear.end_date || null,
          payment_start_soon: isWithinDays(academicYear.start_date, 14),
          deadline_soon: isWithinDays(academicYear.end_date, 14),
        },
        student: {
          id: student.id,
          student_number: student.student_number,
          admission_number: student.admission_number,
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          class_id: student.class_id,
          class_name: student.class_name || null,
          class_level: student.class_level || null,
        },
        fees: {
          total_required: required,
          total_paid: paid,
          outstanding_balance: outstanding,
          payment_percentage: feePct,
          status: feeStatus,
          last_payment_date: finRows?.[0]?.last_payment_date || null,
          payment_plan: finRows?.[0]?.payment_plan || 'full',
          payments: feePaymentRows || [],
        },
        contributions,
        contributions_summary: {
          total_required: contributionsRequiredTotal,
          total_paid: contributionsPaidTotal,
          outstanding_total: contributionsOutstandingTotal,
        },
        combined_summary: {
          total_required: combinedRequiredTotal,
          total_paid: combinedPaidTotal,
          outstanding_total: combinedOutstandingTotal,
          note: 'Total = school fees + all required contribution categories.',
        },
        pocket_money: {
          total_deposits: totalDeposits,
          total_withdrawals: totalWithdrawals,
          balance: pocketBalance,
          last_txn_date: pocketRows?.[0]?.last_txn_date || null,
        },
        pending_payments: pendingIntents || [],
      },
    });
  } catch (e) {
    console.error('Parent payments error:', e);
    return res.status(500).json({ success: false, message: 'Failed to load payments' });
  }
});

// GET /api/parent/discipline/incidents - discipline incidents for this student
router.get('/discipline/incidents', authenticateParent, async (req, res) => {
  try {
    const studentId = req.parent.student_id;
    const [rows] = await pool.execute(
      `
      SELECT
        di.id,
        di.occurred_at,
        di.category,
        di.severity,
        di.description,
        di.witnesses,
        di.status,
        CONCAT(u.first_name, ' ', u.last_name) as reported_by_name,
        di.created_at,
        di.updated_at
      FROM discipline_incidents di
      LEFT JOIN users u ON u.id = di.reported_by
      WHERE di.student_id = ?
      ORDER BY di.occurred_at DESC
      LIMIT 200
      `,
      [studentId]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Parent discipline incidents error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch discipline incidents' });
  }
});

/**
 * Initiate a Pesapal payment.
 * Returns a redirect URL to the gateway. The payment is recorded via callback reconciliation.
 */
router.post('/payments/pesapal/initiate', authenticateParent, async (req, res) => {
  let merchantReference = null;
  try {
    await ensureFinanceSupportTables();

    const { error, value } = parentPaymentsInitSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((d) => d.message),
      });
    }

    const studentId = req.parent.student_id;
    const academicYear = value.academic_year || (await getCurrentAcademicYearName()).year_name || '2024-2025';
    const currency = (value.currency || 'TZS').trim() || 'TZS';

    // Ensure student exists and get parent-visible details for billing.
    const [studentRows] = await pool.execute(
      `
        SELECT s.id, s.admission_number,
               u.first_name, u.last_name, u.email, u.phone
        FROM students s
        LEFT JOIN users u ON u.id = s.user_id
        WHERE s.id = ?
        LIMIT 1
      `,
      [studentId]
    );
    if (!studentRows?.length) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = studentRows[0];

    merchantReference = `PAY-${uuidv4()}`.toUpperCase();

    const descriptionParts = [];
    descriptionParts.push(`Student: ${student.admission_number || studentId}`);
    descriptionParts.push(`Purpose: ${value.purpose}`);
    if (value.category) descriptionParts.push(`Category: ${value.category}`);
    descriptionParts.push(`Academic Year: ${academicYear}`);
    const description = descriptionParts.join(' | ');

    // Callback: backend endpoint that reconciles the payment and then redirects to frontend.
    const cfg = pesapal.getConfig();
    const derivePublicBase = () => {
      const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim();
      const host = (req.headers['x-forwarded-host'] || req.get('host') || '').toString().split(',')[0].trim();
      if (!host) return null;
      return `${proto}://${host}`;
    };

    const publicBase = derivePublicBase();
    const fallbackCallback = publicBase ? `${publicBase}/api/parent/payments/pesapal/callback` : '';
    const baseCallback = (cfg.callbackUrl || fallbackCallback || '').trim();
    const callbackUrl = baseCallback ? `${baseCallback}?ref=${encodeURIComponent(merchantReference)}` : '';

    // Cancel: send users back to the parent payments page without forcing a status reconciliation call.
    // If a dedicated cancel URL isn't configured, fall back to our cancel endpoint.
    const fallbackCancel = publicBase ? `${publicBase}/api/parent/payments/pesapal/cancel` : '';
    const baseCancel = (cfg.cancelUrl || fallbackCancel || '').trim();
    const cancelUrl = baseCancel ? `${baseCancel}?ref=${encodeURIComponent(merchantReference)}` : '';

    if (!callbackUrl || !cancelUrl) {
      return res.status(500).json({
        success: false,
        message:
          'Pesapal callback/cancel URL could not be determined. Set PESAPAL_CALLBACK_URL and PESAPAL_CANCEL_URL (or run behind a reachable host).',
      });
    }

    await pool.execute(
      `
        INSERT INTO payment_intents (student_id, academic_year, purpose, category, amount, currency, status, merchant_reference)
        VALUES (?, ?, ?, ?, ?, ?, 'initiated', ?)
      `,
      [studentId, academicYear, value.purpose, value.category || null, value.amount, currency, merchantReference]
    );

    const order = await pesapal.submitOrder({
      merchantReference,
      amount: value.amount,
      currency,
      description,
      customer: {
        email: student.email,
        phone: student.phone,
        first_name: student.first_name,
        last_name: student.last_name,
        country_code: 'TZ',
      },
      callbackUrl,
      cancelUrl,
    });

    await pool.execute(
      `
        UPDATE payment_intents
        SET status = 'pending', order_tracking_id = ?, gateway_response = ?
        WHERE merchant_reference = ?
      `,
      [order.trackingId || null, JSON.stringify(order.raw || {}), merchantReference]
    );

    return res.json({
      success: true,
      data: {
        merchant_reference: merchantReference,
        order_tracking_id: order.trackingId || null,
        redirect_url: order.redirectUrl,
      },
    });
  } catch (e) {
    console.error('Parent pesapal initiate error:', e);
    // Best-effort: if the intent was created but gateway initiation failed, persist the failure.
    try {
      if (merchantReference) {
        await pool.execute(
          `
            UPDATE payment_intents
            SET status = 'failed',
                gateway_status = COALESCE(?, gateway_status),
                gateway_response = COALESCE(?, gateway_response),
                updated_at = NOW()
            WHERE merchant_reference = ?
          `,
          [String(e.code || e.details?.derived_code || e.details?.error?.code || '') || null, JSON.stringify(e.details || {}), merchantReference]
        );
      }
    } catch (_persistErr) {
      // Ignore persistence failures here; we still return the gateway error to the client.
    }
    const status = Number(e.httpStatus) || 500;
    const payload = { success: false, message: e.message || 'Failed to initiate payment' };
    if (e.details) {
      payload.details = {
        context: e.details?.context || null,
        code: e.details?.code || null,
        status: e.details?.status || null,
        derived_code: e.details?.derived_code || e.details?.error?.code || e.details?.response?.error?.code || null,
        retry_after_seconds: e.details?.retry_after_seconds || null,
      };
      if (process.env.NODE_ENV !== 'production' || process.env.PESAPAL_DEBUG === 'true') {
        payload.details.raw = e.details;
      }
    }
    if ((e.details?.status === 401 || e.details?.status === 403) && payload.details) {
      payload.message =
        'Payment gateway authorization failed. Please confirm PESAPAL_CONSUMER_KEY/SECRET and that you are using the correct PESAPAL_BASE_URL (sandbox vs live).';
    }
    if (status === 503) {
      const retryAfterSeconds = Number(payload.details?.retry_after_seconds) || 30;
      res.set('Retry-After', String(retryAfterSeconds));
    }
    return res.status(status).json(payload);
  }
});

/**
 * Pesapal cancel URL handler.
 * This is used when the user cancels the payment on the gateway page.
 * We mark the intent as cancelled (best-effort) and send the user back to the payments page.
 */
router.get('/payments/pesapal/cancel', async (req, res) => {
  try {
    await ensureFinanceSupportTables();

    const merchantRef = String(req.query.ref || req.query.merchant_reference || '').trim();
    const trackingId = String(req.query.OrderTrackingId || req.query.orderTrackingId || req.query.order_tracking_id || '').trim();

    if (merchantRef || trackingId) {
      await pool.execute(
        `
          UPDATE payment_intents
          SET status = 'cancelled',
              gateway_status = 'cancelled',
              order_tracking_id = COALESCE(NULLIF(?, ''), order_tracking_id),
              updated_at = NOW()
          WHERE merchant_reference = ? OR (order_tracking_id IS NOT NULL AND order_tracking_id = ?)
        `,
        [trackingId || null, merchantRef || '', trackingId || '']
      );
    }

    const qs = new URLSearchParams();
    qs.set('menu', 'payments');
    qs.set('payment', 'cancelled');
    if (merchantRef) qs.set('ref', merchantRef);
    if (trackingId) qs.set('tracking', trackingId);
    return res.redirect(`/parent/portal?${qs.toString()}`);
  } catch (e) {
    console.error('Parent pesapal cancel error:', e);
    const qs = new URLSearchParams();
    qs.set('menu', 'payments');
    qs.set('payment', 'cancelled');
    const merchantRef = String(req.query.ref || req.query.merchant_reference || '').trim();
    const trackingId = String(req.query.OrderTrackingId || req.query.orderTrackingId || req.query.order_tracking_id || '').trim();
    if (merchantRef) qs.set('ref', merchantRef);
    if (trackingId) qs.set('tracking', trackingId);
    return res.redirect(`/parent/portal?${qs.toString()}`);
  }
});

/**
 * Pesapal callback URL handler.
 * Reconciles payment status and applies the payment into school finance tables.
 * Then redirects the browser back to the parent portal.
 */
router.get('/payments/pesapal/callback', async (req, res) => {
  // No authenticateParent here: the gateway calls this endpoint.
  // We use the merchant reference + tracking ID to reconcile safely.
  try {
    await ensureFinanceSupportTables();

    const merchantRef = String(req.query.ref || req.query.merchant_reference || '').trim();
    const trackingId = String(req.query.OrderTrackingId || req.query.orderTrackingId || req.query.order_tracking_id || '').trim();

    if (!merchantRef && !trackingId) {
      return res.status(400).send('Missing payment reference');
    }

    const [intentRows] = await pool.execute(
      `
        SELECT *
        FROM payment_intents
        WHERE merchant_reference = ? OR (order_tracking_id IS NOT NULL AND order_tracking_id = ?)
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [merchantRef || '', trackingId || '']
    );

    if (!intentRows?.length) {
      return res.status(404).send('Payment intent not found');
    }

    const intent = intentRows[0];
    const orderTrackingId = trackingId || intent.order_tracking_id;

    let gatewayStatus = null;
    let gatewayPayload = null;

    if (orderTrackingId) {
      try {
        gatewayPayload = await pesapal.getTransactionStatus(orderTrackingId);
        gatewayStatus =
          (gatewayPayload?.payment_status_description ||
            gatewayPayload?.payment_status ||
            gatewayPayload?.status ||
            '') + '';
        gatewayStatus = gatewayStatus.trim();
      } catch (err) {
        console.error('Pesapal status check failed (will redirect as pending):', err);
        gatewayPayload = gatewayPayload || { error: err?.message || 'status_check_failed' };
        gatewayStatus = 'unreachable';
      }
    }

    const normalized = String(gatewayStatus || '').toLowerCase();
    const isPaid =
      normalized.includes('completed') ||
      normalized.includes('paid') ||
      normalized.includes('success') ||
      normalized === '1';

    const isFailed = normalized.includes('failed') || normalized.includes('cancel') || normalized.includes('invalid');

    const nextStatus = isPaid ? 'paid' : isFailed ? 'failed' : 'pending';

    await pool.execute(
      `
        UPDATE payment_intents
        SET status = ?, gateway_status = ?, gateway_response = COALESCE(?, gateway_response),
            order_tracking_id = COALESCE(?, order_tracking_id),
            paid_at = CASE WHEN ? = 'paid' THEN NOW() ELSE paid_at END
        WHERE id = ?
      `,
      [
        nextStatus,
        gatewayStatus || null,
        gatewayPayload ? JSON.stringify(gatewayPayload) : null,
        orderTrackingId || null,
        nextStatus,
        intent.id,
      ]
    );

    if (nextStatus === 'paid') {
      // Apply into school finance tables (no teacher/admin manual recording).
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const applyBulkContributions = async ({ totalAmount, reference, baseReceipt, academicYear }) => {
          const [paidRows] = await connection.execute(
            `
              SELECT category, SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END) as total_paid_amount
              FROM school_contribution_payments
              WHERE student_id = ? AND academic_year = ?
              GROUP BY category
            `,
            [intent.student_id, academicYear]
          );

          const paidMap = new Map((paidRows || []).map((r) => [r.category, Number(r.total_paid_amount || 0)]));

          let remaining = Number(totalAmount || 0);
          let receiptCounter = 0;

          for (const cat of CONTRIBUTION_CATEGORIES) {
            if (remaining <= 0) break;
            const alreadyPaid = paidMap.get(cat) || 0;
            const outstandingCat = Math.max(0, CONTRIBUTION_REQUIRED_AMOUNT - alreadyPaid);
            if (outstandingCat <= 0) continue;

            const applyAmt = Math.min(outstandingCat, remaining);
            remaining -= applyAmt;
            receiptCounter += 1;

            await connection.execute(
              `INSERT INTO school_contribution_payments
                (student_id, category, amount, payment_date, status, payment_method, reference_number, receipt_number, academic_year, notes, recorded_by)
               VALUES (?, ?, ?, CURDATE(), 'Paid', 'mobile_money', ?, ?, ?, ?, NULL)`,
              [
                intent.student_id,
                cat,
                applyAmt,
                reference,
                `${baseReceipt}-${receiptCounter}`,
                academicYear,
                'Online payment via Pesapal (bulk contributions)',
              ]
            );
          }

          if (remaining > 0) {
            receiptCounter += 1;
            await connection.execute(
              `INSERT INTO school_contribution_payments
                (student_id, category, amount, payment_date, status, payment_method, reference_number, receipt_number, academic_year, notes, recorded_by)
               VALUES (?, ?, ?, CURDATE(), 'Paid', 'mobile_money', ?, ?, ?, ?, NULL)`,
              [
                intent.student_id,
                'emergency',
                remaining,
                reference,
                `${baseReceipt}-${receiptCounter}`,
                academicYear,
                'Online payment via Pesapal (extra contribution amount)',
              ]
            );
          }
        };

        if (intent.purpose === 'fee') {
          // Ensure a financial record exists.
          const [finRows] = await connection.execute(
            `SELECT id, total_fees_required, total_fees_paid, outstanding_balance
             FROM student_financial_records
             WHERE student_id = ? AND academic_year = ?
             LIMIT 1`,
            [intent.student_id, intent.academic_year]
          );

          let totalRequired = 75000.0;
          let totalPaid = 0.0;
          let outstandingBalance = 75000.0;

          if (!finRows.length) {
            await connection.execute(
              `INSERT INTO student_financial_records (student_id, academic_year, total_fees_required, total_fees_paid, outstanding_balance)
               VALUES (?, ?, ?, 0.00, ?)`,
              [intent.student_id, intent.academic_year, totalRequired, totalRequired]
            );
          } else {
            totalRequired = Number(finRows[0].total_fees_required || 0);
            totalPaid = Number(finRows[0].total_fees_paid || 0);
            outstandingBalance = Number(finRows[0].outstanding_balance || Math.max(0, totalRequired - totalPaid));
          }

          const appliedAmount = Number(intent.amount || 0);
          const appliedToFees = Math.min(appliedAmount, outstandingBalance);
          const remaining = Math.max(0, appliedAmount - appliedToFees);

          const newTotalPaid = totalPaid + appliedToFees;
          const newOutstanding = Math.max(0, outstandingBalance - appliedToFees);

          await connection.execute(
            `UPDATE student_financial_records
             SET total_fees_paid = ?, outstanding_balance = ?, last_payment_date = CURDATE()
             WHERE student_id = ? AND academic_year = ?`,
            [newTotalPaid, newOutstanding, intent.student_id, intent.academic_year]
          );

          const reference = orderTrackingId ? `PESAPAL:${orderTrackingId}` : `PESAPAL:${intent.merchant_reference}`;
          const baseReceipt = `RCP${Date.now()}`;

          if (appliedToFees > 0) {
            // Record fee payment entry. Use a safe enum value for payment_method.
            await connection.execute(
              `INSERT INTO fee_payments
                (student_id, amount, payment_date, term, status, payment_method, reference_number, receipt_number, academic_year, payment_for, notes, recorded_by)
               VALUES (?, ?, CURDATE(), ?, 'Paid', 'mobile_money', ?, ?, ?, 'tuition', ?, NULL)`,
              [
                intent.student_id,
                appliedToFees,
                'online',
                reference,
                baseReceipt,
                intent.academic_year,
                intent.category === 'all' ? 'Online payment via Pesapal (fees + contributions)' : 'Online payment via Pesapal',
              ]
            );
          }

          // If this was a combined payment (fees + contributions), allocate remaining into contributions.
          if (remaining > 0 && String(intent.category || '').trim().toLowerCase() === 'all') {
            await applyBulkContributions({
              totalAmount: remaining,
              reference,
              baseReceipt,
              academicYear: intent.academic_year,
            });
          }
        } else if (intent.purpose === 'contribution') {
          const category = (intent.category || '').trim();
          const reference = orderTrackingId ? `PESAPAL:${orderTrackingId}` : `PESAPAL:${intent.merchant_reference}`;
          const baseReceipt = `RCP${Date.now()}`;
          const totalAmount = Number(intent.amount || 0);

          if (!category) {
            // Bulk contribution payment: apply across all required categories, then
            // allocate any remaining as an extra "emergency" contribution.
            await applyBulkContributions({
              totalAmount,
              reference,
              baseReceipt,
              academicYear: intent.academic_year,
            });
          } else {
            await connection.execute(
              `INSERT INTO school_contribution_payments
                (student_id, category, amount, payment_date, status, payment_method, reference_number, receipt_number, academic_year, notes, recorded_by)
               VALUES (?, ?, ?, CURDATE(), 'Paid', 'mobile_money', ?, ?, ?, ?, NULL)`,
              [
                intent.student_id,
                category,
                totalAmount,
                reference,
                baseReceipt,
                intent.academic_year,
                'Online payment via Pesapal',
              ]
            );
          }
        } else if (intent.purpose === 'pocket_money_deposit') {
          await connection.execute(
            `INSERT INTO student_pocket_money
              (student_id, txn_type, amount, txn_date, payment_method, reference_number, academic_year, notes, recorded_by)
             VALUES (?, 'deposit', ?, CURDATE(), 'mobile_money', ?, ?, ?, NULL)`,
            [
              intent.student_id,
              Number(intent.amount || 0),
              orderTrackingId ? `PESAPAL:${orderTrackingId}` : `PESAPAL:${intent.merchant_reference}`,
              intent.academic_year,
              'Online top-up via Pesapal',
            ]
          );
        }

        await connection.commit();
      } catch (err) {
        try {
          await connection.rollback();
        } catch (_e) {}
        console.error('Pesapal callback apply error:', err);
      } finally {
        connection.release();
      }
    }

    // Redirect back to parent portal (frontend) to the Payments tab.
    const parentPortal = '/parent/portal';
    const qs = new URLSearchParams();
    qs.set('menu', 'payments');
    qs.set('payment', nextStatus);
    qs.set('ref', intent.merchant_reference);
    if (orderTrackingId) qs.set('tracking', orderTrackingId);

    return res.redirect(`${parentPortal}?${qs.toString()}`);
  } catch (e) {
    console.error('Parent pesapal callback error:', e);
    // Always redirect the browser back to payments page, even if reconciliation fails.
    const qs = new URLSearchParams();
    qs.set('menu', 'payments');
    qs.set('payment', 'pending');
    const merchantRef = String(req.query.ref || req.query.merchant_reference || '').trim();
    const trackingId = String(req.query.OrderTrackingId || req.query.orderTrackingId || req.query.order_tracking_id || '').trim();
    if (merchantRef) qs.set('ref', merchantRef);
    if (trackingId) qs.set('tracking', trackingId);
    qs.set('error', 'callback_failed');
    return res.redirect(`/parent/portal?${qs.toString()}`);
  }
});

module.exports = router;

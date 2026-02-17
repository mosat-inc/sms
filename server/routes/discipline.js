const express = require('express');
const Joi = require('joi');
const Auth = require('../utils/auth');
const { pool } = require('../config/database');
const { createParentNotificationForStudent } = require('../services/notificationsService');

const router = express.Router();
router.use(Auth.authenticateToken);

const createIncidentSchema = Joi.object({
  student_id: Joi.number().integer().positive().required(),
  occurred_at: Joi.date().required(),
  category: Joi.string().max(80).required(),
  severity: Joi.string().valid('minor', 'moderate', 'severe').default('minor'),
  description: Joi.string().min(5).max(5000).required(),
  witnesses: Joi.string().max(2000).optional().allow('', null),
});

const addActionSchema = Joi.object({
  action_type: Joi.string().max(80).required(),
  action_notes: Joi.string().max(5000).optional().allow('', null),
  status: Joi.string().valid('open', 'under_review', 'resolved').optional(),
});

router.post('/incidents', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { error, value } = createIncidentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map((d) => d.message) });
    }

    const { student_id, occurred_at, category, severity, description, witnesses } = value;

    const [studentRows] = await pool.execute(`SELECT id, class_id FROM students WHERE id = ? LIMIT 1`, [student_id]);
    if (!studentRows.length) return res.status(404).json({ success: false, message: 'Student not found' });
    const classId = studentRows[0].class_id || null;

    const [result] = await pool.execute(
      `
      INSERT INTO discipline_incidents (student_id, class_id, occurred_at, category, severity, description, witnesses, status, reported_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)
      `,
      [student_id, classId, new Date(occurred_at), category, severity, description, witnesses || null, req.user.id]
    );

    // Notify parent (in-app) for moderate/severe incidents.
    if (severity === 'moderate' || severity === 'severe') {
      await createParentNotificationForStudent({
        studentId: student_id,
        type: 'discipline',
        priority: severity === 'severe' ? 'urgent' : 'high',
        title: 'Student Discipline Notice',
        message: `A ${severity} discipline incident was recorded: ${category}.`,
        data: { incident_id: result.insertId, category, severity, occurred_at },
      });
    }

    return res.json({ success: true, message: 'Incident recorded', data: { id: result.insertId } });
  } catch (error) {
    console.error('Create incident error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record incident' });
  }
});

router.get('/incidents', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { student_id, class_id, status } = req.query;
    const where = [];
    const params = [];

    if (student_id) {
      where.push('di.student_id = ?');
      params.push(Number(student_id));
    }
    if (class_id) {
      where.push('di.class_id = ?');
      params.push(Number(class_id));
    }
    if (status) {
      where.push('di.status = ?');
      params.push(String(status));
    }

    // Teachers see incidents for their assigned classes only (unless filtering by their own).
    if (req.user.role === 'teacher') {
      where.push(`di.class_id IN (
        SELECT DISTINCT tsa.class_id
        FROM teacher_subject_assignments tsa
        WHERE tsa.teacher_id = ?
      )`);
      params.push(req.user.id);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `
      SELECT
        di.*,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        s.admission_number,
        c.name as class_name,
        CONCAT(rep.first_name, ' ', rep.last_name) as reported_by_name
      FROM discipline_incidents di
      JOIN students s ON s.id = di.student_id
      JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = di.class_id
      LEFT JOIN users rep ON rep.id = di.reported_by
      ${whereClause}
      ORDER BY di.occurred_at DESC
      LIMIT 200
      `,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('List incidents error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch incidents' });
  }
});

router.get('/incidents/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid incident id' });

    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [rows] = await pool.execute(
      `
      SELECT di.*,
             CONCAT(u.first_name, ' ', u.last_name) as student_name,
             s.admission_number,
             c.name as class_name
      FROM discipline_incidents di
      JOIN students s ON s.id = di.student_id
      JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = di.class_id
      WHERE di.id = ?
      LIMIT 1
      `,
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Incident not found' });

    // Teacher access check: only their assigned classes
    if (req.user.role === 'teacher') {
      const [ok] = await pool.execute(
        `SELECT 1
         FROM teacher_subject_assignments tsa
         WHERE tsa.teacher_id = ? AND tsa.class_id = ?
         LIMIT 1`,
        [req.user.id, rows[0].class_id]
      );
      if (!ok.length) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [actions] = await pool.execute(
      `
      SELECT
        da.*,
        CONCAT(u.first_name, ' ', u.last_name) as action_by_name
      FROM discipline_actions da
      LEFT JOIN users u ON u.id = da.action_by
      WHERE da.incident_id = ?
      ORDER BY da.action_at ASC
      `,
      [id]
    );

    return res.json({ success: true, data: { incident: rows[0], actions } });
  } catch (error) {
    console.error('Get incident error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch incident' });
  }
});

router.post('/incidents/:id/actions', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid incident id' });

    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { error, value } = addActionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map((d) => d.message) });
    }

    const [incidentRows] = await pool.execute(`SELECT id, student_id, class_id, status FROM discipline_incidents WHERE id = ? LIMIT 1`, [id]);
    if (!incidentRows.length) return res.status(404).json({ success: false, message: 'Incident not found' });
    const incident = incidentRows[0];

    // Teacher access check: only their assigned classes
    if (req.user.role === 'teacher') {
      const [ok] = await pool.execute(
        `SELECT 1 FROM teacher_subject_assignments tsa WHERE tsa.teacher_id = ? AND tsa.class_id = ? LIMIT 1`,
        [req.user.id, incident.class_id]
      );
      if (!ok.length) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await pool.execute(
      `
      INSERT INTO discipline_actions (incident_id, action_type, action_notes, action_by)
      VALUES (?, ?, ?, ?)
      `,
      [id, value.action_type, value.action_notes || null, req.user.id]
    );

    if (value.status) {
      await pool.execute(`UPDATE discipline_incidents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [value.status, id]);
    }

    // Notify parent if resolved or under review (keeps parent informed)
    if (value.status === 'under_review' || value.status === 'resolved') {
      await createParentNotificationForStudent({
        studentId: incident.student_id,
        type: 'discipline',
        priority: value.status === 'resolved' ? 'medium' : 'high',
        title: 'Discipline Case Update',
        message: value.status === 'resolved' ? 'A discipline case has been resolved.' : 'A discipline case is under review.',
        data: { incident_id: id, status: value.status },
      });
    }

    return res.json({ success: true, message: 'Action saved' });
  } catch (error) {
    console.error('Add discipline action error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save action' });
  }
});

module.exports = router;


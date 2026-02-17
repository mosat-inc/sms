const express = require('express');
const Auth = require('../utils/auth');
const { pool } = require('../config/database');
const { requireOnPremises } = require('../middleware/premisesMiddleware');

const router = express.Router();
router.use(Auth.authenticateToken);

const parseTimeToMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

const formatDate = (d) => d.toISOString().split('T')[0];

const resolveSession = (requested) => {
  if (requested === 'morning' || requested === 'afternoon') return requested;
  const hr = new Date().getHours();
  return hr < 12 ? 'morning' : 'afternoon';
};

router.post('/check-in', requireOnPremises({ allowAdminBypass: true }), async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const session = resolveSession(req.body?.session);
    const today = formatDate(new Date());

    const morningDeadline = parseTimeToMinutes(process.env.STAFF_MORNING_DEADLINE || '08:00') ?? 480;
    const afternoonDeadline = parseTimeToMinutes(process.env.STAFF_AFTERNOON_DEADLINE || '15:00') ?? 900;

    const minuteNow = nowMinutes();
    let status = 'present';
    if (session === 'morning' && minuteNow > morningDeadline) status = 'late';
    if (session === 'afternoon' && minuteNow > afternoonDeadline) status = 'late';

    // Prevent illogical check-ins (policy guardrails)
    if (session === 'morning' && minuteNow >= 12 * 60 && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Morning staff attendance is closed for today. Contact the administration.',
      });
    }
    if (session === 'afternoon' && minuteNow < Number(process.env.ATTENDANCE_AFTERNOON_START_HOUR || 12) * 60 && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Afternoon staff attendance is not available yet.',
      });
    }

    await pool.execute(
      `
      INSERT INTO staff_attendance (user_id, date, session, status, check_in_at, notes, ip_address, user_agent)
      VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        check_in_at = COALESCE(check_in_at, VALUES(check_in_at)),
        notes = COALESCE(VALUES(notes), notes),
        ip_address = COALESCE(VALUES(ip_address), ip_address),
        user_agent = COALESCE(VALUES(user_agent), user_agent),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        req.user.id,
        today,
        session,
        status,
        req.body?.notes || null,
        String(req.ip || '').slice(0, 64),
        String(req.headers['user-agent'] || '').slice(0, 255),
      ]
    );

    return res.json({
      success: true,
      message: 'Check-in recorded',
      data: { date: today, session, status },
    });
  } catch (error) {
    console.error('Staff check-in error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record check-in' });
  }
});

router.post('/check-out', requireOnPremises({ allowAdminBypass: true }), async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const session = resolveSession(req.body?.session);
    const today = formatDate(new Date());

    await pool.execute(
      `
      UPDATE staff_attendance
      SET check_out_at = NOW(), updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND date = ? AND session = ?
      `,
      [req.user.id, today, session]
    );

    return res.json({
      success: true,
      message: 'Check-out recorded',
      data: { date: today, session },
    });
  } catch (error) {
    console.error('Staff check-out error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record check-out' });
  }
});

router.get('/me', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const date = req.query?.date || formatDate(new Date());
    const [rows] = await pool.execute(
      `SELECT * FROM staff_attendance WHERE user_id = ? AND date = ? ORDER BY session`,
      [req.user.id, date]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Staff attendance me error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch staff attendance' });
  }
});

router.get('/summary', Auth.requireRole(['admin']), async (req, res) => {
  try {
    const date = req.query?.date || formatDate(new Date());
    const [rows] = await pool.execute(
      `
      SELECT
        sa.session,
        sa.status,
        COUNT(*) as count
      FROM staff_attendance sa
      WHERE sa.date = ?
      GROUP BY sa.session, sa.status
      `,
      [date]
    );
    return res.json({ success: true, data: rows, date });
  } catch (error) {
    console.error('Staff attendance summary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch staff attendance summary' });
  }
});

module.exports = router;


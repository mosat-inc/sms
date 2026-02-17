const express = require('express');
const Auth = require('../utils/auth');
const { pool } = require('../config/database');

const router = express.Router();
router.use(Auth.authenticateToken);

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query?.limit || 50)));
    const [rows] = await pool.execute(
      `
      SELECT id, type, title, message, priority, data, is_read, read_at, created_at
      FROM user_notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [req.user.id, limit]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as unread_count FROM user_notifications WHERE user_id = ? AND is_read = FALSE`,
      [req.user.id]
    );
    return res.json({ success: true, unread_count: rows?.[0]?.unread_count || 0 });
  } catch (error) {
    console.error('Unread count error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
});

router.post('/:id/mark-read', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid notification id' });

    await pool.execute(
      `UPDATE user_notifications SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
});

router.post('/mark-all-read', async (req, res) => {
  try {
    await pool.execute(
      `UPDATE user_notifications SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE user_id = ? AND is_read = FALSE`,
      [req.user.id]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
});

module.exports = router;


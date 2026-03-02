const express = require('express');
const Auth = require('../utils/auth');
const { sendSingleSMS, normalizeTzPhone } = require('../services/nextSmsService');

const router = express.Router();

router.post('/send', Auth.authenticateToken, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'teacher')) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { to, text } = req.body || {};
    if (!to || !text) {
      return res.status(400).json({ success: false, message: 'to and text are required' });
    }

    const normalized = normalizeTzPhone(to);
    if (!normalized) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    const result = await sendSingleSMS({ to: normalized, text });
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send SMS',
      error: error?.response?.data || error.message,
    });
  }
});

module.exports = router;


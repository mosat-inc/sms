const express = require('express');
const Auth = require('../utils/auth');
const {
  sendSingleSMS,
  normalizeTzPhone,
  getSmsBalance,
  getSmsGatewayStatus,
  extractAxiosErrorData,
} = require('../services/nextSmsService');

const router = express.Router();

const isSmsOperator = (user) => Boolean(user && (user.role === 'admin' || user.role === 'teacher'));

const ensureSmsAccess = (req, res) => {
  if (isSmsOperator(req.user)) return true;
  res.status(403).json({ success: false, message: 'Access denied' });
  return false;
};

router.get('/status', Auth.authenticateToken, async (req, res) => {
  try {
    if (!ensureSmsAccess(req, res)) return;

    return res.json({
      success: true,
      status: getSmsGatewayStatus(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to inspect SMS configuration',
      error: error.message,
    });
  }
});

router.get('/balance', Auth.authenticateToken, async (req, res) => {
  try {
    if (!ensureSmsAccess(req, res)) return;

    const result = await getSmsBalance();
    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    const details = extractAxiosErrorData(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS balance',
      error: details || error.message,
      attempts: error.smsAttempts || [],
    });
  }
});

router.post('/send', Auth.authenticateToken, async (req, res) => {
  try {
    if (!ensureSmsAccess(req, res)) return;

    const { to, text, from } = req.body || {};
    if (!to || !text) {
      return res.status(400).json({ success: false, message: 'to and text are required' });
    }

    const normalized = normalizeTzPhone(to);
    if (!normalized) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    const result = await sendSingleSMS({ to: normalized, text, from });
    return res.json({ success: true, result });
  } catch (error) {
    const details = extractAxiosErrorData(error);
    return res.status(details?.status || 500).json({
      success: false,
      message: 'Failed to send SMS',
      error: details || error.message,
      attempts: error.smsAttempts || [],
    });
  }
});

router.post('/test-send', Auth.authenticateToken, async (req, res) => {
  try {
    if (!ensureSmsAccess(req, res)) return;

    const { to, text, from } = req.body || {};
    const normalized = normalizeTzPhone(to);
    if (!normalized) {
      return res.status(400).json({ success: false, message: 'Valid Tanzania phone number is required' });
    }

    const smsText = String(text || `Test SMS from ${process.env.SCHOOL_NAME || 'School Management System'}`).trim();
    const result = await sendSingleSMS({ to: normalized, text: smsText, from });

    return res.json({
      success: true,
      normalized,
      result,
    });
  } catch (error) {
    const details = extractAxiosErrorData(error);
    return res.status(details?.status || 500).json({
      success: false,
      message: 'Failed to send test SMS',
      error: details || error.message,
      attempts: error.smsAttempts || [],
    });
  }
});

module.exports = router;

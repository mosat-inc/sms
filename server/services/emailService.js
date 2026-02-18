const axios = require('axios');
const logger = require('../utils/logger');
const { pool } = require('../config/database');

let emailLogTableEnsured = false;

const ensureEmailLogTable = async () => {
  if (emailLogTableEnsured) return;
  const connection = await pool.getConnection();
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        provider VARCHAR(50) NOT NULL DEFAULT 'brevo',
        context VARCHAR(100) NULL,
        student_id INT NULL,
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status ENUM('queued','sent','failed','skipped') NOT NULL DEFAULT 'queued',
        provider_message_id VARCHAR(120) NULL,
        error_message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_created (student_id, created_at),
        INDEX idx_to_created (to_email, created_at),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
      )
    `);
    emailLogTableEnsured = true;
  } finally {
    connection.release();
  }
};

const isEmailEnabled = () => {
  const enabled = String(process.env.EMAIL_NOTIFICATIONS_ENABLED || 'true').toLowerCase();
  return enabled === 'true' || enabled === '1' || enabled === 'yes';
};

const hasBrevoConfig = () => {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
};

const maskEmail = (email) => {
  const value = String(email || '').trim();
  const at = value.indexOf('@');
  if (at <= 1) return value;
  return `${value.slice(0, 1)}***${value.slice(at)}`;
};

const buildSender = () => {
  const name = (process.env.BREVO_SENDER_NAME || 'UBUNIFU SEC SMS').trim();
  const email = (process.env.BREVO_SENDER_EMAIL || '').trim();
  return { name, email };
};

const sendBrevoTransactionalEmail = async ({ to, subject, html, text }) => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const sender = buildSender();

  const payload = {
    sender,
    to: to.map((email) => ({ email })),
    subject,
    ...(html ? { htmlContent: html } : {}),
    ...(text ? { textContent: text } : {}),
  };

  const res = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: Number(process.env.EMAIL_PROVIDER_TIMEOUT_MS || 15000),
  });

  return {
    messageId: res?.data?.messageId || null,
    raw: res?.data || null,
  };
};

const logEmailAttempt = async ({ context, studentId, toEmail, subject, status, providerMessageId, errorMessage }) => {
  try {
    await ensureEmailLogTable();
    await pool.execute(
      `
        INSERT INTO email_logs (provider, context, student_id, to_email, subject, status, provider_message_id, error_message)
        VALUES ('brevo', ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        context || null,
        studentId || null,
        String(toEmail || ''),
        String(subject || ''),
        status || 'queued',
        providerMessageId || null,
        errorMessage || null,
      ]
    );
  } catch (e) {
    // Never break product flow because logging failed
    logger?.warn?.(`email_logs insert failed: ${e.message}`);
  }
};

/**
 * Send an email via Brevo Transactional Email.
 * This is best-effort: it never throws by default.
 */
const sendEmail = async ({ context, studentId, to, subject, html, text }) => {
  const toList = Array.isArray(to) ? to : [to].filter(Boolean);
  const recipients = [...new Set(toList.map((e) => String(e || '').trim()).filter(Boolean))];

  if (!isEmailEnabled()) {
    for (const email of recipients) {
      await logEmailAttempt({
        context,
        studentId,
        toEmail: email,
        subject,
        status: 'skipped',
        providerMessageId: null,
        errorMessage: 'EMAIL_NOTIFICATIONS_ENABLED is false',
      });
    }
    return { ok: false, skipped: true, reason: 'disabled' };
  }

  if (!recipients.length) return { ok: false, skipped: true, reason: 'no_recipients' };

  if (!hasBrevoConfig()) {
    for (const email of recipients) {
      await logEmailAttempt({
        context,
        studentId,
        toEmail: email,
        subject,
        status: 'skipped',
        providerMessageId: null,
        errorMessage: 'Missing BREVO_API_KEY or BREVO_SENDER_EMAIL',
      });
    }
    return { ok: false, skipped: true, reason: 'missing_config' };
  }

  try {
    const result = await sendBrevoTransactionalEmail({
      to: recipients,
      subject,
      html,
      text,
    });

    for (const email of recipients) {
      await logEmailAttempt({
        context,
        studentId,
        toEmail: email,
        subject,
        status: 'sent',
        providerMessageId: result.messageId,
        errorMessage: null,
      });
    }

    logger?.info?.(`Email sent (${context || 'general'}) to ${recipients.map(maskEmail).join(', ')}`);
    return { ok: true, provider: 'brevo', messageId: result.messageId };
  } catch (e) {
    const errMsg = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || 'Unknown email error';
    for (const email of recipients) {
      await logEmailAttempt({
        context,
        studentId,
        toEmail: email,
        subject,
        status: 'failed',
        providerMessageId: null,
        errorMessage: errMsg,
      });
    }
    logger?.warn?.(`Email failed (${context || 'general'}): ${errMsg}`);
    return { ok: false, provider: 'brevo', error: errMsg };
  }
};

module.exports = {
  sendEmail,
  isEmailEnabled,
  hasBrevoConfig,
};

const axios = require('axios');

const DEFAULT_BASE_URL = 'https://messaging-service.co.tz';

const uniq = (arr) => [...new Set((arr || []).map((v) => String(v || '').trim()).filter(Boolean))];

const isSmsEnabled = () => {
  const flag = String(process.env.NEXTSMS_ENABLED || 'true').toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(flag);
};

const getBaseUrl = () => String(process.env.NEXTSMS_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
const buildReference = () => `sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildAuthHeader = () => {
  const user = String(process.env.NEXTSMS_USERNAME || '').trim();
  const pass = String(process.env.NEXTSMS_PASSWORD || '').trim();
  if (!user || !pass) throw new Error('Missing NEXTSMS_USERNAME or NEXTSMS_PASSWORD');
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
};

const normalizeTzPhone = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Accept only Tanzania mobile prefixes 6/7 in canonical forms:
  // 2556XXXXXXXX, 2557XXXXXXXX, 06XXXXXXXX, 07XXXXXXXX, 6XXXXXXXX, 7XXXXXXXX
  if (/^255[67]\d{8}$/.test(digits)) return digits;
  if (/^0[67]\d{8}$/.test(digits)) return `255${digits.slice(1)}`;
  if (/^[67]\d{8}$/.test(digits)) return `255${digits}`;
  return null;
};

const normalizePhoneList = (numbers) => uniq((numbers || []).map(normalizeTzPhone).filter(Boolean));

const sendSingleSMS = async ({ to, text, from }) => {
  if (!isSmsEnabled()) return { skipped: true, reason: 'SMS disabled by NEXTSMS_ENABLED' };
  const toInput = Array.isArray(to) ? to : [to];
  const toList = normalizePhoneList(toInput);
  const bodyText = String(text || '').trim();
  if (!toList.length || !bodyText) throw new Error('Valid "to" and "text" are required');

  const url = `${getBaseUrl()}/api/sms/v1/text/single`;
  const payload = {
    from: String(from || process.env.NEXTSMS_SENDER_ID || '').trim() || undefined,
    to: toList.length === 1 ? toList[0] : toList,
    text: bodyText,
    reference: buildReference(),
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: buildAuthHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 15000,
  });

  return response.data;
};

const sendMultiSMS = async ({ toList, text, from }) => {
  if (!isSmsEnabled()) return { skipped: true, reason: 'SMS disabled by NEXTSMS_ENABLED' };
  const recipients = normalizePhoneList(toList);
  const bodyText = String(text || '').trim();
  if (!recipients.length || !bodyText) throw new Error('Valid "toList" and "text" are required');

  const url = `${getBaseUrl()}/api/sms/v1/text/multi`;
  const sender = String(from || process.env.NEXTSMS_SENDER_ID || '').trim() || undefined;
  const baseHeaders = {
    Authorization: buildAuthHeader(),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Exact payload from official Postman docs:
  // { "messages":[{"from":"N-SMS","to":"2557...","text":"..."}, ...], "reference":"..." }
  const payloadDocFormat = {
    messages: recipients.map((to) => ({ from: sender, to, text: bodyText })),
    reference: buildReference(),
  };

  try {
    const response = await axios.post(url, payloadDocFormat, {
      headers: baseHeaders,
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    // Fallback to /text/single with to array, which is also documented for one message to many destinations.
    try {
      return await sendSingleSMS({ to: recipients, text: bodyText, from: sender });
    } catch (_fallbackError) {
      throw error;
    }
  }
};

module.exports = {
  isSmsEnabled,
  normalizeTzPhone,
  normalizePhoneList,
  sendSingleSMS,
  sendMultiSMS,
};

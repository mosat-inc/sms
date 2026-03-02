const axios = require('axios');

const DEFAULT_BASE_URL = 'https://messaging-service.co.tz';

const uniq = (arr) => [...new Set((arr || []).map((v) => String(v || '').trim()).filter(Boolean))];

const isSmsEnabled = () => {
  const flag = String(process.env.NEXTSMS_ENABLED || 'true').toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(flag);
};

const getBaseUrl = () => String(process.env.NEXTSMS_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');

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
  const toPhone = normalizeTzPhone(to);
  const bodyText = String(text || '').trim();
  if (!toPhone || !bodyText) throw new Error('Valid "to" and "text" are required');

  const url = `${getBaseUrl()}/api/sms/v1/text/single`;
  const payload = {
    from: String(from || process.env.NEXTSMS_SENDER_ID || '').trim() || undefined,
    to: toPhone,
    text: bodyText,
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

  // Provider payload variants seen in different NextSMS gateways.
  const payloadMessagesToText = {
    from: sender,
    messages: recipients.map((to) => ({ to, text: bodyText })),
  };
  const payloadMessagesRecipientMessage = {
    from: sender,
    messages: recipients.map((to) => ({ recipient: to, message: bodyText })),
  };
  const payloadLegacyToArray = {
    from: sender,
    to: recipients,
    text: bodyText,
  };

  const attempts = [
    { label: 'messages.to+text', payload: payloadMessagesToText },
    { label: 'messages.recipient+message', payload: payloadMessagesRecipientMessage },
    { label: 'legacy.to+text', payload: payloadLegacyToArray },
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const response = await axios.post(url, attempt.payload, {
        headers: baseHeaders,
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }

  // Ultimate compatibility fallback: send one-by-one via the single endpoint.
  const singleResults = [];
  for (const to of recipients) {
    try {
      const result = await sendSingleSMS({ to, text: bodyText, from: sender });
      singleResults.push({ to, ok: true, result });
    } catch (error) {
      singleResults.push({
        to,
        ok: false,
        error: error?.response?.data || error?.message || 'Unknown error',
      });
    }
  }

  const anySuccess = singleResults.some((x) => x.ok);
  if (anySuccess) {
    return {
      fallback: 'single',
      success_count: singleResults.filter((x) => x.ok).length,
      failure_count: singleResults.filter((x) => !x.ok).length,
      results: singleResults,
    };
  }

  throw lastError || new Error('Failed to send SMS via both multi and single endpoints');
};

module.exports = {
  isSmsEnabled,
  normalizeTzPhone,
  normalizePhoneList,
  sendSingleSMS,
  sendMultiSMS,
};

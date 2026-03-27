const axios = require('axios');
const qs = require('querystring');

const DEFAULT_BASE_URL = 'https://messaging-service.co.tz';

const uniq = (arr) => [...new Set((arr || []).map((v) => String(v || '').trim()).filter(Boolean))];

const isSmsEnabled = () => {
  const flag = String(process.env.NEXTSMS_ENABLED || 'true').toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(flag);
};

const getBaseUrl = () => String(process.env.NEXTSMS_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
const buildReference = () => `sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const maskValue = (value, visible = 3) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.length <= visible) return '*'.repeat(raw.length);
  return `${raw.slice(0, visible)}${'*'.repeat(Math.max(3, raw.length - visible))}`;
};

const buildAuthHeader = () => {
  const user = String(process.env.NEXTSMS_USERNAME || '').trim();
  const pass = String(process.env.NEXTSMS_PASSWORD || '').trim();
  if (!user || !pass) throw new Error('Missing NEXTSMS_USERNAME or NEXTSMS_PASSWORD');
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
};

const getCredentials = () => {
  const username = String(process.env.NEXTSMS_USERNAME || '').trim();
  const password = String(process.env.NEXTSMS_PASSWORD || '').trim();
  if (!username || !password) throw new Error('Missing NEXTSMS_USERNAME or NEXTSMS_PASSWORD');
  return { username, password };
};

const getSenderId = (from) => String(from || process.env.NEXTSMS_SENDER_ID || '').trim() || undefined;

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

const extractAxiosErrorData = (error) => {
  if (!error) return null;

  return {
    message: error.message,
    code: error.code || null,
    status: error.response?.status || null,
    data: error.response?.data || null,
  };
};

const stringifyStatus = (status) => {
  if (status == null) return '';
  if (typeof status === 'string') return status.toLowerCase();
  if (typeof status === 'object') {
    return Object.values(status)
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
  }
  return String(status).toLowerCase();
};

const messageLooksSuccessful = (message) => {
  if (!message || typeof message !== 'object') return false;

  const smsCount = Number(message.smsCount);
  if (Number.isFinite(smsCount) && smsCount > 0) return true;

  const statusText = stringifyStatus(message.status);
  if (!statusText) return false;

  return ['success', 'sent', 'queued', 'accepted', 'processing'].some((token) => statusText.includes(token));
};

const responseLooksSuccessful = (responseData) => {
  if (!responseData) return false;

  if (Array.isArray(responseData.messages) && responseData.messages.length > 0) {
    return responseData.messages.some(messageLooksSuccessful);
  }

  if (typeof responseData.success === 'boolean') return responseData.success;

  const topLevelStatus = stringifyStatus(responseData.status);
  if (topLevelStatus) {
    return ['success', 'sent', 'queued', 'accepted', 'processing'].some((token) => topLevelStatus.includes(token));
  }

  return true;
};

const createTransportStrategies = ({ url, sender, recipients, bodyText, reference }) => {
  const { username, password } = getCredentials();
  const singleRecipient = recipients.length === 1 ? recipients[0] : recipients;
  const csvRecipients = recipients.join(',');
  const payloads = [
    {
      label: 'with-sender',
      json: {
        from: sender,
        to: singleRecipient,
        text: bodyText,
        reference,
      },
      formBasic: {
        from: sender,
        to: csvRecipients,
        text: bodyText,
        reference,
      },
      formDocs: {
        username,
        password,
        sender_id: sender,
        phone: csvRecipients,
        message: bodyText,
      },
    },
    {
      label: 'without-sender',
      json: {
        to: singleRecipient,
        text: bodyText,
        reference,
      },
      formBasic: {
        to: csvRecipients,
        text: bodyText,
        reference,
      },
      formDocs: {
        username,
        password,
        phone: csvRecipients,
        message: bodyText,
      },
    },
  ].filter((variant) => variant.label !== 'with-sender' || sender);

  return payloads.flatMap((variant) => ([
    {
      label: `json-basic-single:${variant.label}`,
      request: {
        method: 'post',
        url,
        data: variant.json,
        headers: {
          Authorization: buildAuthHeader(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 20000,
      },
    },
    {
      label: `form-basic-single:${variant.label}`,
      request: {
        method: 'post',
        url,
        data: qs.stringify(variant.formBasic),
        headers: {
          Authorization: buildAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        timeout: 20000,
      },
    },
    {
      label: `form-x-api-key-docs:${variant.label}`,
      request: {
        method: 'post',
        url,
        data: qs.stringify(variant.formDocs),
        headers: {
          'X-API-KEY': Buffer.from(`${username}:${password}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: '*/*',
        },
        timeout: 20000,
      },
    },
    {
      label: `form-plain-docs:${variant.label}`,
      request: {
        method: 'post',
        url,
        data: qs.stringify(variant.formDocs),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: '*/*',
        },
        timeout: 20000,
      },
    },
  ]));
};

const sendWithFallbackStrategies = async (strategies) => {
  let lastError = null;
  const attempts = [];

  for (const strategy of strategies) {
    try {
      const response = await axios(strategy.request);
      if (!responseLooksSuccessful(response.data)) {
        const error = new Error(`SMS gateway rejected response for transport ${strategy.label}`);
        error.code = 'SMS_GATEWAY_REJECTED';
        error.response = {
          status: response.status,
          data: response.data,
        };
        throw error;
      }
      return {
        ...response.data,
        _transport: strategy.label,
        _attempts: attempts,
      };
    } catch (error) {
      lastError = error;
      attempts.push({
        transport: strategy.label,
        ...extractAxiosErrorData(error),
      });
    }
  }

  if (lastError) {
    lastError.smsAttempts = attempts;
  }

  throw lastError;
};

const sendSingleSMS = async ({ to, text, from }) => {
  if (!isSmsEnabled()) return { skipped: true, reason: 'SMS disabled by NEXTSMS_ENABLED' };
  const toInput = Array.isArray(to) ? to : [to];
  const toList = normalizePhoneList(toInput);
  const bodyText = String(text || '').trim();
  if (!toList.length || !bodyText) throw new Error('Valid "to" and "text" are required');

  const url = `${getBaseUrl()}/api/sms/v1/text/single`;
  return sendWithFallbackStrategies(createTransportStrategies({
    url,
    sender: getSenderId(from),
    recipients: toList,
    bodyText,
    reference: buildReference(),
  }));
};

const sendMultiSMS = async ({ toList, text, from }) => {
  if (!isSmsEnabled()) return { skipped: true, reason: 'SMS disabled by NEXTSMS_ENABLED' };
  const recipients = normalizePhoneList(toList);
  const bodyText = String(text || '').trim();
  if (!recipients.length || !bodyText) throw new Error('Valid "toList" and "text" are required');
  if (recipients.length === 1) {
    return sendSingleSMS({ to: recipients[0], text: bodyText, from });
  }

  const url = `${getBaseUrl()}/api/sms/v1/text/multi`;
  const sender = getSenderId(from);

  // Exact payload from official Postman docs:
  // { "messages":[{"from":"N-SMS","to":"2557...","text":"..."}, ...], "reference":"..." }
  const payloadDocFormat = {
    messages: recipients.map((to) => ({ from: sender, to, text: bodyText })),
    reference: buildReference(),
  };

  try {
    const response = await axios.post(url, payloadDocFormat, {
      headers: {
        Authorization: buildAuthHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 20000,
    });
    return {
      ...response.data,
      _transport: 'json-basic-multi',
    };
  } catch (error) {
    // Fallback to /text/single with to array, which is also documented for one message to many destinations.
    try {
      return await sendSingleSMS({ to: recipients, text: bodyText, from: sender });
    } catch (_fallbackError) {
      throw error;
    }
  }
};

const getSmsBalance = async () => {
  if (!isSmsEnabled()) return { skipped: true, reason: 'SMS disabled by NEXTSMS_ENABLED' };

  const { username, password } = getCredentials();
  const url = `${getBaseUrl()}/api/sms/v1/balance`;
  const strategies = [
    {
      label: 'json-basic-balance',
      request: {
        method: 'get',
        url,
        headers: {
          Authorization: buildAuthHeader(),
          Accept: 'application/json',
        },
        timeout: 15000,
      },
    },
    {
      label: 'form-x-api-key-balance',
      request: {
        method: 'post',
        url,
        data: qs.stringify({ username, password }),
        headers: {
          'X-API-KEY': Buffer.from(`${username}:${password}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: '*/*',
        },
        timeout: 15000,
      },
    },
    {
      label: 'form-plain-balance',
      request: {
        method: 'post',
        url,
        data: qs.stringify({ username, password }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: '*/*',
        },
        timeout: 15000,
      },
    },
  ];

  return sendWithFallbackStrategies(strategies);
};

const getSmsGatewayStatus = () => {
  const { username } = getCredentials();

  return {
    enabled: isSmsEnabled(),
    baseUrl: getBaseUrl(),
    senderId: getSenderId(),
    username: maskValue(username),
  };
};

module.exports = {
  isSmsEnabled,
  normalizeTzPhone,
  normalizePhoneList,
  sendSingleSMS,
  sendMultiSMS,
  getSmsBalance,
  getSmsGatewayStatus,
  extractAxiosErrorData,
};

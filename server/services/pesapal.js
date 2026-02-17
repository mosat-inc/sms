const axios = require('axios');
const http = require('http');
const https = require('https');

let cachedToken = null;
let cachedTokenExpiresAt = 0;
let unavailableUntil = 0;

const getEnv = (key) => (process.env[key] || '').trim();
const getIntEnv = (key, fallback) => {
  const raw = getEnv(key);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const api = axios.create({ httpAgent, httpsAgent });

const getConfig = () => {
  const baseUrl = getEnv('PESAPAL_BASE_URL');
  const consumerKey = getEnv('PESAPAL_CONSUMER_KEY');
  const consumerSecret = getEnv('PESAPAL_CONSUMER_SECRET');
  const ipnId = getEnv('PESAPAL_IPN_ID');
  const callbackUrl = getEnv('PESAPAL_CALLBACK_URL');
  const cancelUrl = getEnv('PESAPAL_CANCEL_URL');
  const timeoutMs = getIntEnv('PESAPAL_HTTP_TIMEOUT_MS', 60000);
  const retries = getIntEnv('PESAPAL_HTTP_RETRIES', 2);
  const cooldownMs = getIntEnv('PESAPAL_COOLDOWN_MS', 30000);

  return { baseUrl, consumerKey, consumerSecret, ipnId, callbackUrl, cancelUrl, timeoutMs, retries, cooldownMs };
};

const assertConfigured = () => {
  const { baseUrl, consumerKey, consumerSecret, ipnId } = getConfig();
  const missing = [];
  if (!baseUrl) missing.push('PESAPAL_BASE_URL');
  if (!consumerKey) missing.push('PESAPAL_CONSUMER_KEY');
  if (!consumerSecret) missing.push('PESAPAL_CONSUMER_SECRET');
  if (!ipnId) missing.push('PESAPAL_IPN_ID');
  // Callback/cancel URLs are supplied by the caller (routes) and may be derived
  // dynamically in local development. In production, set them explicitly.
  if (missing.length) {
    const err = new Error(`Pesapal is not configured. Missing: ${missing.join(', ')}`);
    err.code = 'PESAPAL_NOT_CONFIGURED';
    throw err;
  }
};

const isNetworkErrorCode = (code) =>
  ['ETIMEDOUT', 'ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ERR_NETWORK'].includes(
    String(code || '').toUpperCase()
  );

const markUnavailable = (err) => {
  if (!err) return;
  const httpStatus = Number(err.httpStatus);
  if (httpStatus !== 503) return;
  const { cooldownMs } = getConfig();
  unavailableUntil = Math.max(unavailableUntil, Date.now() + cooldownMs);
  const retryAfterSeconds = Math.max(1, Math.ceil((unavailableUntil - Date.now()) / 1000));
  err.details = { ...(err.details || {}), retry_after_seconds: retryAfterSeconds };
};

const normalizeAxiosError = (e, context) => {
  if (!e) return e;
  if (!e.isAxiosError) return e;

  const details = {
    context,
    code: e.code || null,
    message: e.message || null,
    url: e.config?.url || null,
    method: e.config?.method || null,
    status: e.response?.status || null,
    response: e.response?.data || null,
  };

  const networkish = isNetworkErrorCode(details.code) || details.status === null;

  const err = new Error(
    `Pesapal request failed${details.status ? ` (${details.status})` : ''}: ${details.message || 'Unknown error'}`
  );
  err.code = 'PESAPAL_REQUEST_FAILED';
  err.details = details;
  // Allow routes to translate to a more appropriate status code.
  err.httpStatus = networkish ? 503 : 502;
  markUnavailable(err);
  return err;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const withRetries = async (fn, { retries, baseDelayMs, context }) => {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!e?.isAxiosError && !e?.details?.code && attempt >= retries) break;
      // Only retry network-ish failures.
      const code = e?.details?.code || e?.code || null;
      if (!isNetworkErrorCode(code)) break;
      if (attempt >= retries) break;
      const delay = baseDelayMs * Math.pow(2, attempt);
      // eslint-disable-next-line no-console
      console.warn(`Pesapal ${context} attempt ${attempt + 1} failed (${code}); retrying in ${delay}ms`);
      // Small backoff to reduce transient timeouts.
      await sleep(delay);
    }
  }
  throw lastError;
};

const requestToken = async () => {
  assertConfigured();
  const { baseUrl, consumerKey, consumerSecret, timeoutMs, retries } = getConfig();

  // Cache token for ~50 minutes (Pesapal tokens are typically short-lived).
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt) return cachedToken;

  if (now < unavailableUntil) {
    const secs = Math.max(1, Math.ceil((unavailableUntil - now) / 1000));
    const err = new Error(`Pesapal is temporarily unavailable. Please try again in ${secs}s.`);
    err.code = 'PESAPAL_UNAVAILABLE';
    err.httpStatus = 503;
    err.details = { context: 'requestToken', retry_after_seconds: secs };
    throw err;
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/Auth/RequestToken`;
  let res;
  try {
    res = await withRetries(
      () =>
        api.post(
          url,
          { consumer_key: consumerKey, consumer_secret: consumerSecret },
          { timeout: timeoutMs, headers: { 'Content-Type': 'application/json' } }
        ),
      { retries, baseDelayMs: 400, context: 'requestToken' }
    );
  } catch (e) {
    throw normalizeAxiosError(e, 'requestToken');
  }

  const token = res.data?.token || res.data?.access_token || null;
  if (!token) {
    const err = new Error('Pesapal token response did not include a token');
    err.code = 'PESAPAL_TOKEN_INVALID';
    err.details = res.data;
    throw err;
  }

  cachedToken = token;
  cachedTokenExpiresAt = now + 50 * 60 * 1000;
  return token;
};

const clearCachedToken = () => {
  cachedToken = null;
  cachedTokenExpiresAt = 0;
};

const submitOrder = async ({ merchantReference, amount, currency, description, customer, callbackUrl, cancelUrl }) => {
  assertConfigured();
  const { baseUrl, ipnId, timeoutMs, retries } = getConfig();
  const now = Date.now();
  if (now < unavailableUntil) {
    const secs = Math.max(1, Math.ceil((unavailableUntil - now) / 1000));
    const err = new Error(`Pesapal is temporarily unavailable. Please try again in ${secs}s.`);
    err.code = 'PESAPAL_UNAVAILABLE';
    err.httpStatus = 503;
    err.details = { context: 'submitOrder', retry_after_seconds: secs };
    throw err;
  }
  let token = await requestToken();

  const url = `${baseUrl.replace(/\/$/, '')}/api/Transactions/SubmitOrderRequest`;

  const payload = {
    id: merchantReference,
    currency,
    amount,
    description,
    callback_url: callbackUrl,
    cancellation_url: cancelUrl,
    notification_id: ipnId,
    billing_address: {
      email_address: customer?.email || 'parent@school.local',
      phone_number: customer?.phone || '',
      country_code: customer?.country_code || 'TZ',
      first_name: customer?.first_name || 'Parent',
      last_name: customer?.last_name || 'Guardian',
    },
  };

  let res;
  try {
    res = await withRetries(
      () =>
        api.post(url, payload, {
          timeout: timeoutMs,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }),
      { retries, baseDelayMs: 700, context: 'submitOrder' }
    );
  } catch (e) {
    // If token expired/invalid, refresh once and retry.
    if (e?.isAxiosError && e.response?.status === 401) {
      try {
        clearCachedToken();
        token = await requestToken();
        res = await api.post(url, payload, {
          timeout: timeoutMs,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
      } catch (e2) {
        throw normalizeAxiosError(e2, 'submitOrder');
      }
    } else {
      throw normalizeAxiosError(e, 'submitOrder');
    }
  }

  const trackingId = res.data?.order_tracking_id || res.data?.orderTrackingId || null;
  const redirectUrl = res.data?.redirect_url || res.data?.redirectUrl || null;

  if (!redirectUrl) {
    const gatewayError = res.data?.error || res.data?.errors || null;
    const gatewayMessage =
      (gatewayError && (gatewayError.message || gatewayError.error_description || gatewayError.error)) ||
      res.data?.message ||
      null;
    const gatewayCode = (gatewayError && (gatewayError.code || gatewayError.error_code)) || res.data?.status || null;

    const err = new Error(
      gatewayMessage ? `Pesapal rejected the order: ${gatewayMessage}` : 'Pesapal order response did not include a redirect URL'
    );
    err.code = gatewayMessage ? 'PESAPAL_ORDER_REJECTED' : 'PESAPAL_ORDER_INVALID';
    err.httpStatus = 400;
    err.details = { context: 'submitOrder', ...res.data, derived_code: gatewayCode || null };
    throw err;
  }

  return { trackingId, redirectUrl, raw: res.data };
};

const getTransactionStatus = async (orderTrackingId) => {
  assertConfigured();
  const { baseUrl, timeoutMs, retries } = getConfig();
  let token = await requestToken();

  const url = `${baseUrl.replace(/\/$/, '')}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(
    orderTrackingId
  )}`;

  let res;
  try {
    res = await withRetries(
      () =>
        api.get(url, {
          timeout: timeoutMs,
          headers: { Authorization: `Bearer ${token}` },
        }),
      { retries: Math.min(retries, 1), baseDelayMs: 500, context: 'getTransactionStatus' }
    );
  } catch (e) {
    if (e?.isAxiosError && e.response?.status === 401) {
      try {
        clearCachedToken();
        token = await requestToken();
        res = await api.get(url, {
          timeout: timeoutMs,
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e2) {
        throw normalizeAxiosError(e2, 'getTransactionStatus');
      }
    } else {
      throw normalizeAxiosError(e, 'getTransactionStatus');
    }
  }

  return res.data || {};
};

module.exports = {
  getConfig,
  requestToken,
  submitOrder,
  getTransactionStatus,
};

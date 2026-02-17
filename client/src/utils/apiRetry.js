import { useState, useEffect } from 'react';
import { api } from '../services/http';

/**
 * API Retry Utility for handling 429 (Rate Limit) errors
 * Implements exponential backoff with jitter for better distributed retry patterns
 */

/**
 * Sleep function for delays
 * @param {number} ms - milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay with exponential backoff and jitter
 * @param {number} attempt - Current attempt number (0-based)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
const calculateDelay = (attempt, baseDelay = 1000, maxDelay = 30000) => {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (±25% of the delay) to avoid thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
  return Math.floor(exponentialDelay + jitter);
};

/**
 * Enhanced axios request with automatic retry logic for rate limiting
 * Keeps the old `fetchWithRetry(url, options)` signature for compatibility,
 * but returns an Axios response instead of a Fetch `Response`.
 * @param {string|URL} url - The URL to request
 * @param {Object} options - "fetch-like" options (method/headers/body/signal)
 * @param {Object} retryConfig - Retry configuration
 * @returns {Promise<import('axios').AxiosResponse>} The response
 */
export const fetchWithRetry = async (url, options = {}, retryConfig = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    retryOn = [429, 502, 503, 504], // Status codes to retry on
    onRetry = null, // Callback for retry attempts
    abortController = null // Optional AbortController for cancellation
  } = retryConfig;

  let lastError;

  const method = (options.method || 'GET').toUpperCase();
  const headers = options.headers || {};
  const signal = abortController?.signal || options.signal;

  let data = undefined;
  if (options.body !== undefined) {
    if (typeof options.body === 'string') {
      try {
        data = JSON.parse(options.body);
      } catch {
        data = options.body;
      }
    } else {
      data = options.body;
    }
  }
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await api({
        url: String(url),
        method,
        headers,
        data,
        signal,
        withCredentials: options.credentials === 'include',
      });
    } catch (error) {
      lastError = error;
      
      // Don't retry on abort or network errors unless specified
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || attempt === maxRetries) {
        throw error;
      }

      const status = error.response?.status;
      if (status && !retryOn.includes(status)) {
        throw error;
      }

      // Handle rate limiting specifically
      if (status === 429) {
        const retryAfterHeader = error.response?.headers?.['retry-after'];
        const retryAfterSeconds =
          error.response?.data?.retryAfter ||
          (retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0) ||
          Math.ceil(calculateDelay(attempt, baseDelay, maxDelay) / 1000);

        const delayMs = retryAfterSeconds * 1000;

        if (onRetry) {
          onRetry(attempt + 1, maxRetries + 1, delayMs, error.response, error);
        }

        console.warn(
          `Rate limited. Retrying in ${retryAfterSeconds}s... (${attempt + 1}/${maxRetries + 1})`
        );
        await sleep(delayMs);
        continue;
      }

      const delayMs = calculateDelay(attempt, baseDelay, maxDelay);
      
      if (onRetry) {
        onRetry(attempt + 1, maxRetries + 1, delayMs, error.response, error);
      }

      console.warn(`Request failed with error: ${error.message}. Retrying in ${delayMs}ms... (${attempt + 1}/${maxRetries + 1})`);
      await sleep(delayMs);
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error('All retry attempts failed');
};

/**
 * API client wrapper with built-in retry logic
 */
export class ApiClient {
  constructor(baseURL = '', defaultRetryConfig = {}) {
    this.baseURL = baseURL;
    this.defaultRetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      retryOn: [429, 502, 503, 504],
      ...defaultRetryConfig
    };
  }

  async request(endpoint, options = {}, retryConfig = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const finalRetryConfig = { ...this.defaultRetryConfig, ...retryConfig };
    
    // Add default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const requestOptions = {
      ...options,
      headers: { ...defaultHeaders, ...options.headers }
    };

    const response = await fetchWithRetry(url, requestOptions, finalRetryConfig);
    return response;
  }

  async get(endpoint, options = {}, retryConfig = {}) {
    return this.request(endpoint, { ...options, method: 'GET' }, retryConfig);
  }

  async post(endpoint, data = null, options = {}, retryConfig = {}) {
    const requestOptions = { ...options, method: 'POST' };
    if (data) {
      requestOptions.body = JSON.stringify(data);
    }
    return this.request(endpoint, requestOptions, retryConfig);
  }

  async put(endpoint, data = null, options = {}, retryConfig = {}) {
    const requestOptions = { ...options, method: 'PUT' };
    if (data) {
      requestOptions.body = JSON.stringify(data);
    }
    return this.request(endpoint, requestOptions, retryConfig);
  }

  async delete(endpoint, options = {}, retryConfig = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' }, retryConfig);
  }
}

/**
 * React hook for API calls with retry logic
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @param {Object} retryConfig - Retry configuration
 * @returns {Object} { data, loading, error, retry }
 */
export const useApiWithRetry = (url, options = {}, retryConfig = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiClient = new ApiClient('/api');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.request(url, options, retryConfig);
      setData(response.data);
    } catch (err) {
      setError(err);
      console.error('API request failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url]);

  return {
    data,
    loading,
    error,
    retry: fetchData
  };
};

export default ApiClient;

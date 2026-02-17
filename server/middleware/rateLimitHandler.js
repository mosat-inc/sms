const logger = require('../utils/logger');

/**
 * Enhanced rate limit handler that provides better error messages
 * and retry information for 429 errors
 */
const rateLimitHandler = (err, req, res, next) => {
  if (res.statusCode === 429) {
    const resetTime = new Date(Date.now() + (req.rateLimit?.msBeforeNext || 60000));
    
    logger.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`, {
      user: req.user?.id || 'anonymous',
      endpoint: req.path,
      method: req.method,
      resetTime: resetTime.toISOString()
    });

    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded. Please try again later.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((req.rateLimit?.msBeforeNext || 60000) / 1000), // in seconds
      resetTime: resetTime.toISOString(),
      // Add suggestions for the client
      suggestions: [
        'Try again after the specified retry time',
        'Reduce the frequency of requests',
        'Use cached data when available'
      ]
    });
  }
  
  next(err);
};

/**
 * Middleware to add retry-friendly headers to responses
 */
const addRetryHeaders = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(body) {
    // Add retry-friendly headers for successful responses
    if (res.statusCode < 400) {
      res.set({
        'X-Request-ID': req.headers['x-request-id'] || `req_${Date.now()}`,
        'Cache-Control': res.locals.cacheHit ? 'public, max-age=30' : 'no-cache'
      });
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Graceful degradation middleware for communication endpoints
 * Provides fallback responses when rate limited
 */
const gracefulDegradation = (req, res, next) => {
  const originalStatus = res.status;
  
  res.status = function(code) {
    if (code === 429 && req.path.startsWith('/api/communication/')) {
      // For communication endpoints, provide a graceful fallback
      const fallbackData = {
        success: true,
        data: [],
        cached: false,
        fallback: true,
        message: 'Using cached data due to rate limiting'
      };
      
      // Try to get cached data as fallback
      const cache = require('../utils/cache');
      let cacheKey;
      
      if (req.path.includes('announcements')) {
        cacheKey = cache.createCommunicationKey(req.user?.id, req.query);
      } else if (req.path.includes('unread-count')) {
        cacheKey = cache.createUnreadCountKey(req.user?.id);
      }
      
      if (cacheKey) {
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          logger.info(`Serving cached fallback data for rate-limited request: ${req.path}`);
          return res.status(200).json({
            ...cachedData,
            fallback: true,
            cached: true
          });
        }
      }
      
      // If no cached data available, provide minimal fallback
      if (req.path.includes('unread-count')) {
        return res.status(200).json({
          success: true,
          unread_count: 0,
          fallback: true,
          message: 'Unable to get current unread count. Please try again later.'
        });
      }
    }
    
    return originalStatus.call(this, code);
  };
  
  next();
};

module.exports = {
  rateLimitHandler,
  addRetryHeaders,
  gracefulDegradation
};

const logger = require('./logger');

class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time to live
    this.defaultTTL = 30000; // 30 seconds default
    
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttl);
    logger.debug(`Cache SET: ${key} (TTL: ${ttl}ms)`);
  }

  get(key) {
    const expiry = this.ttl.get(key);
    
    if (!expiry || Date.now() > expiry) {
      // Expired or doesn't exist
      this.cache.delete(key);
      this.ttl.delete(key);
      logger.debug(`Cache MISS/EXPIRED: ${key}`);
      return null;
    }

    const value = this.cache.get(key);
    logger.debug(`Cache HIT: ${key}`);
    return value;
  }

  has(key) {
    const expiry = this.ttl.get(key);
    return expiry && Date.now() <= expiry;
  }

  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
    logger.debug(`Cache DELETE: ${key}`);
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
    logger.debug('Cache CLEARED');
  }

  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, expiry] of this.ttl.entries()) {
      if (now > expiry) {
        this.cache.delete(key);
        this.ttl.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cache cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      ttlEntries: this.ttl.size
    };
  }

  // Create a cache key for communication queries
  createCommunicationKey(userId, queryParams) {
    const params = {
      userId,
      priority: queryParams.priority,
      target_audience: queryParams.target_audience,
      status: queryParams.status,
      since: queryParams.since ? new Date(queryParams.since).toISOString().split('T')[0] : null // Day-level granularity for since
    };
    return `comm_${JSON.stringify(params)}`;
  }

  // Create a cache key for unread count
  createUnreadCountKey(userId) {
    return `unread_${userId}`;
  }

  // Invalidate communication cache for a user
  invalidateUserCache(userId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(`"userId":"${userId}"`) || key === `unread_${userId}`) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    logger.debug(`Invalidated ${keysToDelete.length} cache entries for user ${userId}`);
  }

  // Invalidate all communication cache (e.g., when new announcement is created)
  invalidateAllCommunicationCache() {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith('comm_') || key.startsWith('unread_')) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    logger.debug(`Invalidated ${keysToDelete.length} communication cache entries`);
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Create a singleton instance
const cache = new SimpleCache();

// Graceful shutdown
process.on('SIGTERM', () => {
  cache.destroy();
});

process.on('SIGINT', () => {
  cache.destroy();
});

module.exports = cache;

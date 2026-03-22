/**
 * Client-side caching service for reducing API calls
 * Supports TTL (time-to-live) for cache invalidation
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Generate cache key
   */
  _generateKey(namespace, identifier) {
    return `${namespace}:${identifier}`;
  }

  /**
   * Set cache with optional TTL
   * @param {string} namespace - Cache namespace (e.g., 'documents', 'flashcards')
   * @param {string} identifier - Unique identifier for the item
   * @param {*} data - Data to cache
   * @param {number} ttl - Time-to-live in milliseconds (optional)
   */
  set(namespace, identifier, data, ttl = 5 * 60 * 1000) {
    const key = this._generateKey(namespace, identifier);

    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set cache
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Set auto-expire timer if TTL provided
    if (ttl) {
      const timer = setTimeout(() => {
        this.invalidate(namespace, identifier);
      }, ttl);
      this.timers.set(key, timer);
    }
  }

  /**
   * Get cached data
   * @returns {*} Cached data or null if not found/expired
   */
  get(namespace, identifier) {
    const key = this._generateKey(namespace, identifier);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    const age = Date.now() - cached.timestamp;
    if (cached.ttl && age > cached.ttl) {
      this.invalidate(namespace, identifier);
      return null;
    }

    return cached.data;
  }

  /**
   * Check if data exists in cache and hasn't expired
   */
  has(namespace, identifier) {
    return this.get(namespace, identifier) !== null;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(namespace, identifier) {
    const key = this._generateKey(namespace, identifier);
    this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * Invalidate entire namespace
   */
  invalidateNamespace(namespace) {
    const prefix = `${namespace}:`;
    
    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) {
        const identifier = key.substring(prefix.length);
        this.invalidate(namespace, identifier);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache stats for debugging
   */
  getStats() {
    return {
      totalEntries: this.cache.size,
      namespaces: Array.from(this.cache.keys()).reduce((acc, key) => {
        const namespace = key.split(':')[0];
        acc[namespace] = (acc[namespace] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

// Export singleton instance
const cacheService = new CacheService();

export default cacheService;

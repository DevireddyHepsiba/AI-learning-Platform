/**
 * Simple in-memory response cache for AI endpoints
 * Prevents hitting Gemini API for identical requests within TTL
 */

const cache = new Map();
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Generate cache key from request parameters
 */
export const getCacheKey = (userId, type, documentId, query) => {
  return `${userId}:${type}:${documentId}:${JSON.stringify(query)}`;
};

/**
 * Get cached response if available and not expired
 */
export const getFromCache = (key) => {
  if (!cache.has(key)) return null;

  const { data, timestamp } = cache.get(key);
  const isExpired = Date.now() - timestamp > DEFAULT_TTL;

  if (isExpired) {
    cache.delete(key);
    console.log(`[Cache] Expired: ${key.substring(0, 40)}...`);
    return null;
  }

  console.log(`[Cache] HIT: ${key.substring(0, 40)}...`);
  return data;
};

/**
 * Store response in cache
 */
export const saveToCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
  console.log(`[Cache] SAVED: ${key.substring(0, 40)}...`);
};

/**
 * Clear all cached data (use sparingly)
 */
export const clearCache = () => {
  cache.clear();
  console.log("[Cache] Cleared all cached data");
};

/**
 * Get cache stats for debugging
 */
export const getCacheStats = () => {
  return {
    size: cache.size,
    entries: Array.from(cache.keys()),
  };
};

export default {
  getCacheKey,
  getFromCache,
  saveToCache,
  clearCache,
  getCacheStats,
};

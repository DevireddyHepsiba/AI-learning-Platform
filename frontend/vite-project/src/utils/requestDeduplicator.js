/**
 * Request deduplication utility to prevent duplicate concurrent requests
 * Automatically deduplicates identical in-flight requests
 */

const pendingRequests = new Map();

/**
 * Generate a cache key from request config
 */
export const getCacheKey = (config) => {
  const method = config.method || "get";
  const url = config.url || "";
  const params = JSON.stringify(config.params || {});
  const data = JSON.stringify(config.data || {});
  return `${method}:${url}:${params}:${data}`;
};

/**
 * Wrap a promise and manage pending requests
 */
export const deduplicateRequest = (key, requestPromise) => {
  // If this request is already in flight, return the pending promise
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Store the promise as pending
  const pendingPromise = requestPromise
    .then((response) => {
      // Clear from pending on success
      pendingRequests.delete(key);
      return response;
    })
    .catch((error) => {
      // Clear from pending on error
      pendingRequests.delete(key);
      throw error;
    });

  pendingRequests.set(key, pendingPromise);
  return pendingPromise;
};

/**
 * Get current pending requests count (useful for debugging)
 */
export const getPendingRequestsCount = () => {
  return pendingRequests.size;
};

/**
 * Clear all pending requests (dangerous - use only for testing/logout)
 */
export const clearPendingRequests = () => {
  pendingRequests.clear();
};

export default {
  getCacheKey,
  deduplicateRequest,
  getPendingRequestsCount,
  clearPendingRequests,
};

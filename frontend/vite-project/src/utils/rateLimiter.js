/**
 * Request Rate Limiter
 * Prevents hitting API quotas by tracking and throttling requests
 * Gemini Free Tier Limits:
 * - 5 requests per minute (per model)
 * - 20 requests per day (per model)
 */

class RateLimiter {
  constructor() {
    this.minuteTimestamps = {};
    this.dayTimestamps = {};
  }

  /**
   * Check if a request type can be made based on rate limits
   */
  canMakeRequest(type = "default") {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneDayAgo = now - 86400000; // 24 hours

    // Initialize if not exists
    if (!this.minuteTimestamps[type]) {
      this.minuteTimestamps[type] = [];
    }
    if (!this.dayTimestamps[type]) {
      this.dayTimestamps[type] = [];
    }

    // Clean up old timestamps
    this.minuteTimestamps[type] = this.minuteTimestamps[type].filter(
      (timestamp) => timestamp > oneMinuteAgo
    );
    this.dayTimestamps[type] = this.dayTimestamps[type].filter(
      (timestamp) => timestamp > oneDayAgo
    );

    // Check minute limit (5 per minute)
    if (this.minuteTimestamps[type].length >= 5) {
      return false;
    }

    // Check day limit (20 per day)
    if (this.dayTimestamps[type].length >= 20) {
      return false;
    }

    return true;
  }

  /**
   * Record a request
   */
  recordRequest(type = "default") {
    const now = Date.now();

    if (!this.minuteTimestamps[type]) {
      this.minuteTimestamps[type] = [];
    }
    if (!this.dayTimestamps[type]) {
      this.dayTimestamps[type] = [];
    }

    this.minuteTimestamps[type].push(now);
    this.dayTimestamps[type].push(now);
  }

  /**
   * Get remaining requests available (returns minimum of both limits)
   */
  getRemainingRequests(type = "default") {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneDayAgo = now - 86400000;

    if (!this.minuteTimestamps[type]) {
      return 5; // minute limit
    }

    const activeMinuteRequests = this.minuteTimestamps[type].filter(
      (timestamp) => timestamp > oneMinuteAgo
    );
    const activeDayRequests = this.dayTimestamps[type].filter(
      (timestamp) => timestamp > oneDayAgo
    );

    const minuteRemaining = Math.max(0, 5 - activeMinuteRequests.length);
    const dayRemaining = Math.max(0, 20 - activeDayRequests.length);

    return Math.min(minuteRemaining, dayRemaining);
  }

  /**
   * Get time until next request can be made (in seconds)
   * Returns which limit is blocking and how long to wait
   */
  getRetryAfter(type = "default") {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneDayAgo = now - 86400000;

    // Check minute limit
    if (
      this.minuteTimestamps[type] &&
      this.minuteTimestamps[type].length >= 5
    ) {
      const oldestMinuteRequest = this.minuteTimestamps[type][0];
      const minuteWaitTime = oldestMinuteRequest + 60000 - now;
      if (minuteWaitTime > 0) {
        return {
          seconds: Math.ceil(minuteWaitTime / 1000),
          limit: "minute",
          limitType: "5 requests per minute",
        };
      }
    }

    // Check day limit
    if (this.dayTimestamps[type] && this.dayTimestamps[type].length >= 20) {
      const oldestDayRequest = this.dayTimestamps[type][0];
      const dayWaitTime = oldestDayRequest + 86400000 - now;
      if (dayWaitTime > 0) {
        return {
          seconds: Math.ceil(dayWaitTime / 1000),
          limit: "day",
          limitType: "20 requests per day",
        };
      }
    }

    return {
      seconds: 0,
      limit: null,
      limitType: null,
    };
  }

  /**
   * Reset all tracking (useful for testing or manual reset)
   */
  reset() {
    this.minuteTimestamps = {};
    this.dayTimestamps = {};
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Human-readable error message for rate limit
 */
export function getQuotaExceededMessage(retryInfo) {
  // Handle new format with retryInfo object
  if (retryInfo && typeof retryInfo === "object") {
    const { seconds, limit, limitType } = retryInfo;
    
    if (!seconds || seconds <= 0) {
      return "API quota exceeded. Please wait a moment before trying again.";
    }

    if (limit === "day") {
      const hours = Math.ceil(seconds / 3600);
      if (hours > 1) {
        return `Daily quota exceeded (20 requests/day). Please come back in ${hours} hour(s).`;
      }
      return `Daily quota exceeded. Please come back in ${seconds} second(s).`;
    }

    if (limit === "minute") {
      return `Per-minute quota exceeded (5 requests/minute). Please wait ${seconds} second(s).`;
    }

    return `API quota exceeded. Please wait ${seconds} second(s) before trying again.`;
  }

  // Fallback for legacy number format
  const seconds = retryInfo;
  if (seconds <= 0) {
    return "API quota exceeded. Please wait a moment before trying again.";
  }

  if (seconds > 60) {
    const minutes = Math.ceil(seconds / 60);
    return `Gemini API quota exceeded. Free tier allows 5 requests per minute. Please wait ${minutes} minute(s) before trying again.`;
  }

  return `Gemini API quota exceeded. Please wait ${seconds} second(s) before trying again.`;
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error) {
  return (
    error?.status === 429 ||
    error?.code === 429 ||
    error?.error?.code === 429 ||
    (error?.error?.message && error.error.message.includes("quota")) ||
    (error?.message && error.message.includes("quota"))
  );
}

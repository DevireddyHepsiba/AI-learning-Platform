/**
 * Centralized error handler for consistent error formatting across all services
 * Extracts meaningful error information from axios responses
 */

export const normalizeError = (error, defaultMessage = "An error occurred") => {
  // If already normalized, return as-is
  if (error.normalized) {
    return error;
  }

  let errorData = {
    normalized: true,
    status: null,
    statusCode: null,
    message: defaultMessage,
    error: null,
    details: null,
    retryable: false,
    originalError: error,
  };

  if (error.response) {
    // Axios error with response
    errorData.status = error.response.status;
    errorData.statusCode = error.response.status;
    errorData.retryable = error.retryable || (error.response.status >= 500);

    // Extract message from various response shapes
    const data = error.response.data;
    errorData.message =
      data?.message ||
      data?.error ||
      data?.msg ||
      error.message ||
      defaultMessage;

    errorData.details = data;
  } else if (error.code === "ECONNABORTED") {
    errorData.message = "Request timeout. Please try again.";
    errorData.retryable = true;
  } else if (error.code === "ERR_NETWORK") {
    errorData.message = "Network error. Please check your connection.";
    errorData.retryable = true;
  } else if (error.message) {
    errorData.message = error.message;
  }

  return errorData;
};

/**
 * Handle service errors and format for UI consumption
 */
export const handleServiceError = (error, defaultMessage = "Operation failed") => {
  const normalized = normalizeError(error, defaultMessage);

  // Log for debugging (only in development)
  if (process.env.NODE_ENV === "development") {
    console.error("[ServiceError]", {
      message: normalized.message,
      status: normalized.status,
      details: normalized.details,
    });
  }

  // Throw normalized error for consumption by components
  throw normalized;
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error) => {
  if (typeof error === "string") return error;
  if (!error) return "An error occurred";

  return error.message || "An error occurred";
};

/**
 * Check if error is retryable
 */
export const isRetryable = (error) => {
  const normalized = normalizeError(error);
  return normalized.retryable;
};

/**
 * Check if error is authentication-related
 */
export const isAuthError = (error) => {
  const normalized = normalizeError(error);
  return normalized.status === 401 || normalized.status === 403;
};

/**
 * Check if error is validation-related
 */
export const isValidationError = (error) => {
  const normalized = normalizeError(error);
  return normalized.status === 400 || normalized.status === 422;
};

export default {
  normalizeError,
  handleServiceError,
  getErrorMessage,
  isRetryable,
  isAuthError,
  isValidationError,
};

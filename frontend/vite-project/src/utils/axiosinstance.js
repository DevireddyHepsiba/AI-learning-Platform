import axios from "axios";
import { BASE_URL } from "./apiPath";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // Reduced from 80s to 30s for better UX
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request tracking to prevent infinite retry loops
const requestRetryCount = new Map();

// ================================
// Request Interceptor
// ================================
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("token");

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Initialize retry count
    config.retryCount = config.retryCount || 0;
    config.retryDelay = config.retryDelay || 1000;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ================================
// Response Interceptor with Retry Logic
// ================================
axiosInstance.interceptors.response.use(
  (response) => {
    // Clear retry count on success
    if (response.config) {
      requestRetryCount.delete(`${response.config.method}_${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const { config } = error;

    // Don't retry if no config or max retries exceeded
    if (!config || config.retryCount >= 3) {
      return Promise.reject(error);
    }

    // Don't retry for certain status codes
    if (error.response?.status === 401 || error.response?.status === 403) {
      return Promise.reject(error);
    }

    // Retry on network errors and 5xx errors
    const shouldRetry =
      !error.response || // Network error
      error.code === "ECONNABORTED" || // Timeout
      error.code === "ERR_NETWORK" ||
      (error.response?.status >= 500 && error.response?.status < 600); // Server errors

    if (shouldRetry && config.retryCount < 3) {
      config.retryCount += 1;
      const delayMs = config.retryDelay * config.retryCount;

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      return axiosInstance(config);
    }

    // Enhance error object with helpful context
    if (error.response) {
      error.retryable = shouldRetry && config.retryCount < 3;
      error.statusCode = error.response.status;
      error.message = error.response?.data?.message || error.message;
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

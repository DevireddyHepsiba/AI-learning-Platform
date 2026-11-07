import axiosInstance from "../utils/axiosinstance";
import { API_PATHS } from "../utils/apiPath";
import { rateLimiter, getQuotaExceededMessage, isRateLimitError } from "../utils/rateLimiter";

/**
 * Handle errors with better messaging for rate limits
 */
function handleAIError(error, defaultMessage, requestType = "ai") {
  // Check if it's a rate limit error
  if (isRateLimitError(error)) {
    const retryInfo = rateLimiter.getRetryAfter(requestType);
    return {
      ...(error.response?.data || error.error || {}),
      status: error.response?.status || error.code || 429,
      message: getQuotaExceededMessage(retryInfo),
      isRateLimitError: true,
    };
  }

  return {
    ...(error.response?.data || {}),
    status: error.response?.status,
    message:
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      defaultMessage,
  };
}

// ================================
// GENERATE FLASHCARDS
// ================================
const generateFlashcards = async (documentId, options) => {
  try {
    if (!rateLimiter.canMakeRequest("flashcards")) {
      throw {
        status: 429,
        code: 429,
        message: getQuotaExceededMessage(rateLimiter.getRetryAfter("flashcards")),
        isRateLimitError: true,
      };
    }

    rateLimiter.recordRequest("flashcards");
    const response = await axiosInstance.post(
      API_PATHS.AI.GENERATE_FLASHCARDS,
      { documentId, ...options }
    );

    return response.data;
  } catch (error) {
    throw handleAIError(error, "Failed to generate flashcards", "flashcards");
  }
};

// ================================
// GENERATE QUIZ
// ================================
const generateQuiz = async (documentId, options) => {
  try {
    if (!rateLimiter.canMakeRequest("quiz")) {
      throw {
        status: 429,
        code: 429,
        message: getQuotaExceededMessage(rateLimiter.getRetryAfter("quiz")),
        isRateLimitError: true,
      };
    }

    rateLimiter.recordRequest("quiz");
    const response = await axiosInstance.post(
      API_PATHS.AI.GENERATE_QUIZ,
      { documentId, ...options }
    );

    return response.data;
  } catch (error) {
    throw handleAIError(error, "Failed to generate quiz", "quiz");
  }
};

// ================================
// GENERATE SUMMARY
// ================================
const generateSummary = async (documentId) => {
  try {
    if (!rateLimiter.canMakeRequest("summary")) {
      throw {
        status: 429,
        code: 429,
        message: getQuotaExceededMessage(rateLimiter.getRetryAfter("summary")),
        isRateLimitError: true,
      };
    }

    rateLimiter.recordRequest("summary");
    const response = await axiosInstance.post(
      API_PATHS.AI.GENERATE_SUMMARY,
      { documentId }
    );

    return response.data?.data;
  } catch (error) {
    throw handleAIError(error, "Failed to generate summary", "summary");
  }
};

// ================================
// CHAT
// ================================
const chat = async (documentId, message) => {
  try {
    if (!rateLimiter.canMakeRequest("chat")) {
      throw {
        status: 429,
        code: 429,
        message: getQuotaExceededMessage(rateLimiter.getRetryAfter("chat")),
        isRateLimitError: true,
      };
    }

    rateLimiter.recordRequest("chat");
    const response = await axiosInstance.post(API_PATHS.AI.CHAT, {
      documentId,
      message,
    });

    return response.data;
  } catch (error) {
    throw handleAIError(error, "Chat request failed", "chat");
  }
};

// ================================
// EXPLAIN CONCEPT
// ================================
const explainConcept = async (documentId, concept) => {
  try {
    if (!rateLimiter.canMakeRequest("explain")) {
      throw {
        status: 429,
        code: 429,
        message: getQuotaExceededMessage(rateLimiter.getRetryAfter("explain")),
        isRateLimitError: true,
      };
    }

    rateLimiter.recordRequest("explain");
    const response = await axiosInstance.post(
      API_PATHS.AI.EXPLAIN_CONCEPT,
      { documentId, concept }
    );

    return response.data?.data;
  } catch (error) {
    throw handleAIError(error, "Failed to explain concept", "explain");
  }
};

// ================================
// QUICK CLARITY FOR SELECTED TEXT
// ================================
const quickClarity = async (selectedText, context = "") => {
  try {
    if (!rateLimiter.canMakeRequest("clarity")) {
      throw {
        status: 429,
        code: 429,
        message: getQuotaExceededMessage(rateLimiter.getRetryAfter("clarity")),
        isRateLimitError: true,
      };
    }

    rateLimiter.recordRequest("clarity");
    const response = await axiosInstance.post(API_PATHS.AI.QUICK_CLARITY, {
      selectedText,
      context,
    });

    return response.data?.data;
  } catch (error) {
    throw handleAIError(error, "Failed to generate clarity", "clarity");
  }
};

// ================================
// GET CHAT HISTORY
// ================================
const getChatHistory = async (documentId) => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.AI.GET_CHAT_HISTORY(documentId)
    );

    return response.data;
  } catch (error) {
    throw handleAIError(error, "Failed to fetch chat history", "history");
  }
};

export {
  generateFlashcards,
  generateQuiz,
  generateSummary,
  chat,
  explainConcept,
  quickClarity,
  getChatHistory,
};

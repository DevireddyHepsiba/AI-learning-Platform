import axiosInstance from "../utils/axiosinstance";
import { API_PATHS } from "../utils/apiPath";

// ================================
// GENERATE FLASHCARDS
// ================================
const generateFlashcards = async (documentId, options) => {
  try {
    const response = await axiosInstance.post(
      API_PATHS.AI.GENERATE_FLASHCARDS,
      { documentId, ...options }
    );

    return response.data;
  } catch (error) {
    throw {
      ...(error.response?.data || {}),
      status: error.response?.status,
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to generate flashcards",
    };
  }
};

// ================================
// GENERATE QUIZ
// ================================
const generateQuiz = async (documentId, options) => {
  try {
    const response = await axiosInstance.post(
      API_PATHS.AI.GENERATE_QUIZ,
      { documentId, ...options }
    );

    return response.data;
  } catch (error) {
    throw {
      ...(error.response?.data || {}),
      status: error.response?.status,
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to generate quiz",
    };
  }
};

// ================================
// GENERATE SUMMARY
// ================================
const generateSummary = async (documentId) => {
  try {
    const response = await axiosInstance.post(
      API_PATHS.AI.GENERATE_SUMMARY,
      { documentId }
    );

    return response.data?.data;
  } catch (error) {
    throw {
      ...(error.response?.data || {}),
      status: error.response?.status,
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to generate summary",
    };
  }
};

// ================================
// CHAT
// ================================
const chat = async (documentId, message) => {
  try {
    const response = await axiosInstance.post(API_PATHS.AI.CHAT, {
      documentId,
      message,
    });

    return response.data;
  } catch (error) {
    throw {
      ...(error.response?.data || {}),
      status: error.response?.status,
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Chat request failed",
    };
  }
};

// ================================
// EXPLAIN CONCEPT
// ================================
const explainConcept = async (documentId, concept) => {
  try {
    const response = await axiosInstance.post(
      API_PATHS.AI.EXPLAIN_CONCEPT,
      { documentId, concept }
    );

    return response.data?.data;
  } catch (error) {
    throw {
      ...(error.response?.data || {}),
      status: error.response?.status,
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to explain concept",
    };
  }
};

// ================================
// QUICK CLARITY FOR SELECTED TEXT
// ================================
const quickClarity = async (selectedText, context = "") => {
  try {
    const response = await axiosInstance.post(API_PATHS.AI.QUICK_CLARITY, {
      selectedText,
      context,
    });

    return response.data?.data;
  } catch (error) {
    throw {
      ...(error.response?.data || {}),
      status: error.response?.status,
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to generate clarity",
    };
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
    throw {
      ...(error.response?.data || {}),
      status: error.response?.status,
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to fetch chat history",
    };
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

import axiosInstance from "../utils/axiosinstance";
import { API_PATHS } from "../utils/apiPath";
import { deduplicateRequest, getCacheKey } from "../utils/requestDeduplicator";

// Simple in-memory cache for AI results (expires after 5 minutes)
const aiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached result if available and not expired
 */
const getCachedResult = (key) => {
  if (!aiCache.has(key)) return null;
  
  const { data, timestamp } = aiCache.get(key);
  if (Date.now() - timestamp > CACHE_DURATION) {
    aiCache.delete(key);
    return null;
  }
  
  console.log(`[Cache] Hit for key: ${key.substring(0, 30)}...`);
  return data;
};

/**
 * Store result in cache
 */
const setCachedResult = (key, data) => {
  aiCache.set(key, { data, timestamp: Date.now() });
};

// ================================
// GENERATE FLASHCARDS
// ================================
const generateFlashcards = async (documentId, options) => {
  const cacheKey = `flashcards:${documentId}`;
  
  // Check cache first
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  try {
    const requestKey = getCacheKey({
      method: "POST",
      url: API_PATHS.AI.GENERATE_FLASHCARDS,
      data: { documentId, ...options }
    });

    const response = await deduplicateRequest(requestKey, 
      axiosInstance.post(API_PATHS.AI.GENERATE_FLASHCARDS, { documentId, ...options })
    );

    const data = response.data;
    setCachedResult(cacheKey, data);
    return data;
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
  const cacheKey = `quiz:${documentId}`;
  
  // Check cache first
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  try {
    const requestKey = getCacheKey({
      method: "POST",
      url: API_PATHS.AI.GENERATE_QUIZ,
      data: { documentId, ...options }
    });

    const response = await deduplicateRequest(requestKey,
      axiosInstance.post(API_PATHS.AI.GENERATE_QUIZ, { documentId, ...options })
    );

    const data = response.data;
    setCachedResult(cacheKey, data);
    return data;
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
  const cacheKey = `summary:${documentId}`;
  
  // Check cache first
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  try {
    const requestKey = getCacheKey({
      method: "POST",
      url: API_PATHS.AI.GENERATE_SUMMARY,
      data: { documentId }
    });

    const response = await deduplicateRequest(requestKey,
      axiosInstance.post(API_PATHS.AI.GENERATE_SUMMARY, { documentId })
    );

    const data = response.data?.data;
    setCachedResult(cacheKey, data);
    return data;
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
    const requestKey = getCacheKey({
      method: "POST",
      url: API_PATHS.AI.CHAT,
      data: { documentId, message }
    });

    const response = await deduplicateRequest(requestKey,
      axiosInstance.post(API_PATHS.AI.CHAT, {
        documentId,
        message,
      })
    );

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
  const cacheKey = `explain:${documentId}:${concept}`;
  
  // Check cache first
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  try {
    const requestKey = getCacheKey({
      method: "POST",
      url: API_PATHS.AI.EXPLAIN_CONCEPT,
      data: { documentId, concept }
    });

    const response = await deduplicateRequest(requestKey,
      axiosInstance.post(
        API_PATHS.AI.EXPLAIN_CONCEPT,
        { documentId, concept }
      )
    );

    const data = response.data?.data;
    setCachedResult(cacheKey, data);
    return data;
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
  const cacheKey = `clarity:${selectedText.substring(0, 50)}:${context.substring(0, 50)}`;
  
  // Check cache first
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  try {
    const requestKey = getCacheKey({
      method: "POST",
      url: API_PATHS.AI.QUICK_CLARITY,
      data: { selectedText, context }
    });

    const response = await deduplicateRequest(requestKey,
      axiosInstance.post(API_PATHS.AI.QUICK_CLARITY, {
        selectedText,
        context,
      })
    );

    const data = response.data?.data;
    setCachedResult(cacheKey, data);
    return data;
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
  const cacheKey = `chatHistory:${documentId}`;
  
  // Check cache first
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  try {
    const requestKey = getCacheKey({
      method: "GET",
      url: API_PATHS.AI.GET_CHAT_HISTORY(documentId)
    });

    const response = await deduplicateRequest(requestKey,
      axiosInstance.get(API_PATHS.AI.GET_CHAT_HISTORY(documentId))
    );

    const data = response.data;
    setCachedResult(cacheKey, data);
    return data;
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

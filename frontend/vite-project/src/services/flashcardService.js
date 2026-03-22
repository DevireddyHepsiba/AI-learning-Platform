import axiosInstance from "../utils/axiosinstance";
import { API_PATHS } from "../utils/apiPath";
import { normalizeError } from "./errorHandler";

// ================================
// GET ALL FLASHCARD SETS
// ================================
const getAllFlashcardSets = async () => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.FLASHCARDS.GET_ALL_FLASHCARD_SETS
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error, "Failed to fetch flashcard sets");
  }
};

// ================================
// GET FLASHCARDS FOR DOCUMENT
// ================================
const getFlashcardsForDocument = async (documentId) => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.FLASHCARDS.GET_FLASHCARDS_FOR_DOC(documentId)
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error, "Failed to fetch flashcards");
  }
};

// ================================
// REVIEW FLASHCARD
// ================================
const reviewFlashcard = async (cardId, cardIndex) => {
  try {
    const response = await axiosInstance.post(
      API_PATHS.FLASHCARDS.REVIEW_FLASHCARD(cardId),
      { cardIndex }
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error, "Failed to review flashcard");
  }
};

// ================================
// TOGGLE STAR
// ================================
const toggleStar = async (cardId) => {
  try {
    const response = await axiosInstance.put(
      API_PATHS.FLASHCARDS.TOGGLE_STAR(cardId)
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error, "Failed to star flashcard");
  }
};

// ================================
// DELETE FLASHCARD SET
// ================================
const deleteFlashcardSet = async (id) => {
  try {
    const response = await axiosInstance.delete(
      API_PATHS.FLASHCARDS.DELETE_FLASHCARD_SET(id)
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error, "Failed to delete flashcards");
  }
};

// ================================
// EXPORT SERVICE
// ================================
const flashcardService = {
  getAllFlashcardSets,
  getFlashcardsForDocument,
  reviewFlashcard,
  toggleStar,
  deleteFlashcardSet,
};

export default flashcardService;

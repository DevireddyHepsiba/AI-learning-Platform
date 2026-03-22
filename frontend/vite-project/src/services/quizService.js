import axiosInstance from "../utils/axiosinstance";
import { API_PATHS } from "../utils/apiPath";
import { normalizeError } from "./errorHandler";

// ================================
// GET QUIZZES FOR DOCUMENT
// ================================
const getQuizzesForDocument = async (documentId) => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.QUIZZES.GET_QUIZZES_FOR_DOC(documentId)
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error, "Failed to fetch quizzes");
  }
};

// ================================
// GET QUIZ BY ID
// ================================
const getQuizById = async (quizId) => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.QUIZZES.GET_QUIZ_BY_ID(quizId)
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error, "Failed to fetch quiz");
  }
};

// ================================
// SUBMIT QUIZ
// ================================
const submitQuiz = async (quizId, answers) => {
  try {
    const response = await axiosInstance.post(
      API_PATHS.QUIZZES.SUBMIT_QUIZ(quizId),
      { userAnswers: answers }
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error, "Failed to submit quiz");
  }
};

// ================================
// GET QUIZ RESULTS
// ================================
const getQuizResults = async (quizId) => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.QUIZZES.GET_QUIZ_RESULTS(quizId)
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error, "Failed to fetch quiz results");
  }
};

// ================================
// DELETE QUIZ
// ================================
const deleteQuiz = async (quizId) => {
  try {
    const response = await axiosInstance.delete(
      API_PATHS.QUIZZES.DELETE_QUIZ(quizId)
    );

    return response.data;
  } catch (error) {
    throw normalizeError(error, "Failed to delete quiz");
  }
};

// ================================
// EXPORT SERVICE
// ================================
const quizService = {
  getQuizzesForDocument,
  getQuizById,
  submitQuiz,
  getQuizResults,
  deleteQuiz,
};

export default quizService;

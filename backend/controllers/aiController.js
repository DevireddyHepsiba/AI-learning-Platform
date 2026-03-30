import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import ChatHistory from "../models/ChatHistory.js";
import * as geminiService from "../utils/geminiService.js";

/* ======================================================
   GENERATE FLASHCARDS
   POST /api/ai/generate-flashcards
====================================================== */
export const generateFlashcards = async (req, res, next) => {
  try {
    const { documentId, count = 10 } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
      });
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
      });
    }

    const cards = await geminiService.generateFlashcards(
      document.extractedText,
      Number(count)
    );

    const flashcardSet = await Flashcard.create({
      userId: req.user._id,
      documentId: document._id,
      cards,
    });

    res.status(201).json({
      success: true,
      data: flashcardSet,
      message: "Flashcards generated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   GENERATE QUIZ
   POST /api/ai/generate-quiz
====================================================== */

export const generateQuiz = async (req, res, next) => {
  try {
    const { documentId, count = 5 } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
      });
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
      });
    }

    // 🔹 Generate quiz questions using Gemini
    const questions = await geminiService.generateQuiz(
      document.extractedText,
      Number(count)
    );

    // 🔹 FIX: provide required fields
    const quizSet = await Quiz.create({
      userId: req.user._id,
      documentId: document._id,
      title: `Quiz on ${document.title || "Document"}`,
      questions,
      totalQuestions: questions.length,
    });

    res.status(201).json({
      success: true,
      data: quizSet,
      message: "Quiz generated successfully",
    });
  } catch (error) {
    next(error);
  }
};


/* ======================================================
   GENERATE SUMMARY
   POST /api/ai/generate-summary
====================================================== */
export const generateSummary = async (req, res, next) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
      });
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
      });
    }

    const summary = await geminiService.generateSummary(
      document.extractedText
    );

    res.status(200).json({
      success: true,
      data: { summary },
      message: "Summary generated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   CHAT WITH DOCUMENT
   POST /api/ai/chat
====================================================== */
export const chat = async (req, res, next) => {
  try {
    const { documentId, message } = req.body;

    if (!documentId || !message) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId and message",
      });
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
      });
    }

    // 🔹 AI response
    const aiReply = await geminiService.chat(
      document.extractedText,
      message
    );

    // 🔹 Save properly in messages array
    const chatHistory = await ChatHistory.create({
      userId: req.user._id,
      documentId: document._id,
      messages: [
        { role: "user", content: message },
        { role: "assistant", content: aiReply }
      ]
    });

    res.status(200).json({
      success: true,
      data: chatHistory,
      message: "Chat response generated",
    });
  } catch (error) {
    next(error);
  }
};


/* ======================================================
   EXPLAIN CONCEPT
   POST /api/ai/explain-concept
====================================================== */
export const explainConcept = async (req, res, next) => {
  try {
    const { documentId, concept } = req.body;

    if (!documentId || !concept) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId and concept",
      });
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
      });
    }

    const explanation = await geminiService.explainConcept(
      document.extractedText,
      concept
    );

    res.status(200).json({
      success: true,
      data: { explanation },
      message: "Concept explanation generated",
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   GET CHAT HISTORY
   GET /api/ai/chat-history/:documentId
====================================================== */
export const getChatHistory = async (req, res, next) => {
  try {
    const documentId = req.params.documentId.trim(); // ✅ FIX

    const history = await ChatHistory.find({
      userId: req.user._id,
      documentId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   QUICK CLARITY (PUBLIC FOR SESSION USERS)
   POST /api/ai/quick-clarity
====================================================== */
export const quickClarity = async (req, res, next) => {
  try {
    const { selectedText, context } = req.body;

    if (!selectedText || String(selectedText).trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: "Please provide selectedText with at least 3 characters",
      });
    }

    console.log("[quickClarity] Processing request...");
    const explanation = await geminiService.clarifySelection(selectedText, context || "");

    res.status(200).json({
      success: true,
      data: { explanation },
      message: "Clarity generated successfully",
    });
  } catch (error) {
    console.error("[quickClarity] ERROR - Message:", error?.message);
    console.error("[quickClarity] ERROR - Full object:", JSON.stringify(error, null, 2));
    
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to generate clarity explanation",
    });
  }
};


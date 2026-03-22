import express from "express";
import {
  generateFlashcards,
  generateQuiz,
  generateSummary,
  chat,
  explainConcept,
  getChatHistory,
  quickClarity,
} from "../controllers/aiController.js";
import protect from "../middleware/auth.js";

const router = express.Router();

// health check
router.get("/ping", (req, res) => {
  res.json({ ok: true });
});

// AI routes (protected)
router.post("/generate-flashcards", protect, generateFlashcards);
router.post("/generate-quiz", protect, generateQuiz);
router.post("/generate-summary", protect, generateSummary);
router.post("/chat", protect, chat);
router.post("/explain-concept", protect, explainConcept);
router.get("/chat-history/:documentId", protect, getChatHistory);
router.post("/quick-clarity", quickClarity);

export default router;

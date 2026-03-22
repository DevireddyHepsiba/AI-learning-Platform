import express from "express";
import {
  getAllFlashcardSets,
  getFlashcards,
  reviewFlashcard,
  toggleStarFlashcard,
  deleteFlashcardSet,
} from "../controllers/flashcardController.js";
import protect from "../middleware/auth.js";

const router = express.Router();

/* Health check */
router.get("/ping", (req, res) => {
  res.json({ ok: true, msg: "Flashcard routes working" });
});

/* Protect all routes */
router.use(protect);

/* Routes */
router.get("/", getAllFlashcardSets);
router.get("/:documentId", getFlashcards);
router.post("/:cardId/review", reviewFlashcard);
router.put("/:cardId/star", toggleStarFlashcard);
router.delete("/:id", deleteFlashcardSet);

export default router;

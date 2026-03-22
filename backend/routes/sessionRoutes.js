import express from "express";
import protect from "../middleware/auth.js";
import {
  createSession,
  getSessionData,
  getUserSessions,
  endSession,
  updateSessionDocument,
} from "../controllers/sessionController.js";

const router = express.Router();

// Protected routes - require authentication
router.post("/", protect, createSession);
router.get("/", protect, getUserSessions);
router.get("/:sessionId", getSessionData); // Public - anyone can fetch session data
router.put("/:sessionId/document", protect, updateSessionDocument);
router.put("/:sessionId/end", protect, endSession);

export default router;

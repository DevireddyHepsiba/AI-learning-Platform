import express from "express";
import protect from "../middleware/auth.js";
import {
  inviteToSession,
  getNotifications,
  markAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

// Protected routes - require authentication
router.post("/invite-session", protect, inviteToSession);
router.get("/", protect, getNotifications);
router.patch("/:id/read", protect, markAsRead);
router.delete("/:id", protect, deleteNotification);

export default router;

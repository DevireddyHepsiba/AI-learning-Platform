import { v4 as uuidv4 } from "uuid";
import Session from "../models/Session.js";
import Highlight from "../models/Highlight.js";
import Comment from "../models/Comment.js";
import SessionNotes from "../models/SessionNotes.js";

/**
 * Create a new collaborative session
 * POST /api/sessions
 * Body: { documentUrl, documentName }
 * Returns: { sessionId, documentUrl }
 */
export const createSession = async (req, res) => {
  try {
    const { documentUrl, documentName, sessionName } = req.body;
    const userId = req.user.id;

    if (!documentUrl || !documentName) {
      return res.status(400).json({
        success: false,
        message: "documentUrl and documentName are required",
      });
    }

    const sessionId = uuidv4();

    // Create new session
    const session = new Session({
      sessionId,
      sessionName: sessionName || documentName,
      documentUrl,
      documentName,
      createdBy: userId,
      users: [{ userId, username: req.user.username }],
    });

    await session.save();

    // Initialize empty notes
    await SessionNotes.create({
      sessionId,
      content: "",
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId,
        sessionName: session.sessionName,
        documentUrl,
        documentName,
        shareLink: `${process.env.FRONTEND_URL || "http://localhost:5173"}/session/${sessionId}`,
      },
    });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create session",
      error: error.message,
    });
  }
};

/**
 * Fetch session data (initial state for joining)
 * GET /api/sessions/:sessionId
 * Returns: { session, highlights, comments, notes }
 */
export const getSessionData = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Validate session exists
    const session = await Session.findOne({ sessionId }).populate("createdBy", "username email");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Fetch highlights for this session
    const highlights = await Highlight.find({ sessionId }).select(
      "userId username text page position color createdAt"
    );

    // Fetch notes for this session
    const notes = await SessionNotes.findOne({ sessionId }).select("content");

    // Fetch comments with highlight details
    const comments = await Comment.find({ sessionId })
      .populate("highlightId", "text page")
      .select("highlightId userId username text createdAt");

    res.status(200).json({
      success: true,
      data: {
        session: {
          sessionId: session.sessionId,
          documentUrl: session.documentUrl,
          documentName: session.documentName,
          createdBy: session.createdBy,
          users: session.users,
          isActive: session.isActive,
        },
        highlights,
        comments,
        notes: notes?.content || "",
      },
    });
  } catch (error) {
    console.error("Get session data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch session data",
      error: error.message,
    });
  }
};

/**
 * Get all sessions created by user
 * GET /api/sessions
 * Returns: array of sessions
 */
export const getUserSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await Session.find({ createdBy: userId })
      .select("sessionId documentName createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error("Get user sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sessions",
      error: error.message,
    });
  }
};

/**
 * End a session
 * PUT /api/sessions/:sessionId/end
 */
export const endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Only creator can end session
    if (session.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only session creator can end session",
      });
    }

    session.isActive = false;
    await session.save();

    res.status(200).json({
      success: true,
      message: "Session ended",
    });
  } catch (error) {
    console.error("End session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to end session",
      error: error.message,
    });
  }
};

/**
 * Update session document (replace PDF for ongoing session)
 * PUT /api/sessions/:sessionId/document
 * Body: { documentUrl, documentName }
 */
export const updateSessionDocument = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { documentUrl, documentName } = req.body;
    const userId = req.user.id;

    if (!documentUrl || !documentName) {
      return res.status(400).json({
        success: false,
        message: "documentUrl and documentName are required",
      });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const isCreator = String(session.createdBy) === String(userId);
    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: "Only session creator can change the session PDF",
      });
    }

    session.documentUrl = documentUrl;
    session.documentName = documentName;
    if (!session.sessionName) {
      session.sessionName = documentName;
    }

    await session.save();

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        documentUrl: session.documentUrl,
        documentName: session.documentName,
      },
      message: "Session PDF updated successfully",
    });
  } catch (error) {
    console.error("Update session document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update session PDF",
      error: error.message,
    });
  }
};

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath} from 'url';
import { createServer } from "http";
import { Server } from "socket.io";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";

import connectDB from "./config/db.js";
import User from "./models/User.js";
import authRoutes from "./routes/authRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import documentationRoutes from "./routes/documentRoutes.js";
import flashcardRoutes from "./routes/flashcardRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import quizRoutes from './routes/quizRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import notificationRoutes from "./routes/notificationRoutes.js";
import Highlight from "./models/Highlight.js";
import Comment from "./models/Comment.js";
import SessionNotes from "./models/SessionNotes.js";
import Session from "./models/Session.js";

const app = express();
const httpServer = createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configuredOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Socket CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Real-time presence tracking: sessionId -> Map(socketId -> user)
const sessionPresence = new Map();
// Presenter state tracking: sessionId -> presenter payload
const presenterStateBySession = new Map();
// Media state tracking: sessionId -> Map(socketId -> media payload)
const mediaStateBySession = new Map();

const getPresenceList = (sessionId) => {
  const roomMap = sessionPresence.get(sessionId);
  if (!roomMap) return [];

  // De-duplicate by userId so refresh/reconnect doesn't inflate online count.
  const dedup = new Map();
  for (const [socketId, user] of roomMap.entries()) {
    dedup.set(String(user.userId), {
      ...user,
      socketId,
    });
  }

  return Array.from(dedup.values());
};

/* Connect DB */
connectDB();

/* Middlewares */
app.use(cors(corsOptions));
app.use(express.json());

/* Session & Passport Setup for OAuth */
app.use(session({
  secret: process.env.JWT_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: "lax",
  },
}));

app.set("trust proxy", 1); // Trust proxy for production (Render, Vercel, etc)

app.use(passport.initialize());
app.use(passport.session());

/* Google OAuth Strategy */
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.API_BASE_URL}/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Find or create user
    let user = await User.findOne({ googleId: profile.id });
    
    if (!user) {
      // Create new user from Google profile
      user = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        username: profile.displayName || profile.emails[0].value.split("@")[0],
        profileImage: profile.photos[0]?.value,
        password: null, // OAuth users don't have password
      });
      await user.save();
      console.log("✅ New user created via Google OAuth:", user.email);
    } else {
      console.log("✅ User authenticated via Google OAuth:", user.email);
    }
    
    return done(null, user);
  } catch (error) {
    console.error("❌ Google OAuth error:", error);
    return done(error);
  }
}));

/* Serialize user for session */
passport.serializeUser((user, done) => {
  done(null, user._id);
});

/* Deserialize user from session */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Backward-compatible PDF file serving:
// If a session references original file name (e.g. react_notes.pdf),
// resolve it to stored multer name (e.g. 12345-react_notes.pdf).
app.get("/uploads/documents/:fileName", async (req, res, next) => {
  try {
    const requested = decodeURIComponent(req.params.fileName || "").trim();
    if (!requested || requested.includes("..") || requested !== path.basename(requested)) {
      return res.status(400).json({ success: false, message: "Invalid file name" });
    }

    const docsDir = path.join(__dirname, "uploads", "documents");
    const exactPath = path.join(docsDir, requested);

    try {
      await fs.access(exactPath);
      return res.sendFile(exactPath);
    } catch {
      // Fallback match by original filename suffix: <timestamp>-<originalName>
    }

    const files = await fs.readdir(docsDir);
    const suffix = `-${requested}`;
    const matches = files.filter((f) => f.endsWith(suffix));

    if (matches.length === 0) {
      return res.status(404).json({ success: false, message: "PDF file not found" });
    }

    // Newest by lexical timestamp prefix from multer naming convention.
    const resolved = matches.sort().at(-1);
    return res.sendFile(path.join(docsDir, resolved));
  } catch (error) {
    return next(error);
  }
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ==================== GOOGLE OAUTH ROUTES (MUST BE FIRST) ==================== */
// Step 1: Initiate Google authentication
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Step 2: Google OAuth callback
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // ✅ User authenticated successfully
    console.log("✅ Google OAuth successful:", req.user.email);
    
    // Redirect to frontend dashboard
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/dashboard?authenticated=true`);
  }
);

// Get current user (protected)
app.get("/auth/user", (req, res) => {
  if (req.isAuthenticated() && req.user) {
    return res.json({
      success: true,
      user: {
        _id: req.user._id,
        email: req.user.email,
        username: req.user.username,
        profileImage: req.user.profileImage,
      }
    });
  }
  res.status(401).json({ success: false, message: "Not authenticated" });
});

// Logout
app.post("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    res.json({ success: true, message: "Logged out successfully" });
  });
});

/* Routes */
app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/documents", documentationRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/quizzes",quizRoutes);
app.use("/api/progress",progressRoutes);
app.use("/api/notifications", notificationRoutes);

/* ==================== SOCKET.IO EVENT HANDLERS ==================== */
io.on("connection", (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  /**
   * User joins a collaborative session
   * Payload: { sessionId, userId, username }
   * Note: userId can be either a MongoDB ObjectId or a guest string like 'guest-123456'
   */
  socket.on("join-session", async ({ sessionId, userId, username }) => {
    try {
      if (!sessionId || !userId) {
        socket.emit("error", { message: "sessionId and userId are required" });
        return;
      }

      const normalizedUserId = String(userId).trim();
      const normalizedUsername = String(username || "").trim() || `Guest-${normalizedUserId.slice(-4)}`;

      const sameSession = String(socket.data?.sessionId || "") === String(sessionId);
      const sameUser = String(socket.data?.userId || "") === normalizedUserId;
      if (sameSession && sameUser) {
        if (!sessionPresence.has(sessionId)) {
          sessionPresence.set(sessionId, new Map());
        }
        sessionPresence.get(sessionId).set(socket.id, {
          userId: normalizedUserId,
          username: normalizedUsername,
          joinedAt: new Date(),
        });

        socket.emit("presence-update", { users: getPresenceList(sessionId) });
        return;
      }

      socket.join(sessionId);
      console.log(`[Socket] ${normalizedUsername} (${normalizedUserId}) joined session ${sessionId}`);

      // Check if session exists
      const session = await Session.findOne({ sessionId });
      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      } else {
        // Check if user already in session
        const userExists = session.users.some((u) => String(u.userId) === normalizedUserId);
        if (!userExists) {
          // Add user to session
          await Session.findOneAndUpdate(
            { sessionId },
            {
              $push: {
                users: {
                  userId: normalizedUserId,
                  username: normalizedUsername,
                  joinedAt: new Date(),
                },
              },
            }
          );
          console.log(`[Socket] User ${normalizedUsername} added to session ${sessionId}`);
        } else {
          console.log(`[Socket] User ${normalizedUsername} already in session ${sessionId}`);
        }
      }

      // Track online presence by socket.
      if (!sessionPresence.has(sessionId)) {
        sessionPresence.set(sessionId, new Map());
      }
      sessionPresence.get(sessionId).set(socket.id, {
        userId: normalizedUserId,
        username: normalizedUsername,
        joinedAt: new Date(),
      });

      socket.data.sessionId = sessionId;
      socket.data.userId = normalizedUserId;
      socket.data.username = normalizedUsername;

      // Notify others in room about new user
      socket.to(sessionId).emit("user-joined", { userId: normalizedUserId, username: normalizedUsername });

      // Broadcast accurate online users list to everyone in the room.
      io.to(sessionId).emit("presence-update", { users: getPresenceList(sessionId) });

      // Send current presenter state if available.
      const presenterState = presenterStateBySession.get(sessionId);
      if (presenterState) {
        socket.emit("presenter-state", presenterState);
      }

      const mediaMap = mediaStateBySession.get(sessionId);
      if (mediaMap && mediaMap.size > 0) {
        socket.emit("media-state-sync", {
          participants: Array.from(mediaMap.entries()).map(([socketId, media]) => ({
            socketId,
            ...media,
          })),
        });
      }
    } catch (error) {
      console.error("[Socket] Join session error:", error);
      socket.emit("error", { message: "Failed to join session: " + error.message });
    }
  });

  /**
   * Broadcast participant media state
   * Payload: { sessionId, userId, username, hasMedia, micOn, camOn }
   */
  socket.on("media-state", (data) => {
    const { sessionId, userId, username, hasMedia, micOn, camOn } = data || {};
    if (!sessionId || !userId || !username) return;

    if (!mediaStateBySession.has(sessionId)) {
      mediaStateBySession.set(sessionId, new Map());
    }

    const mediaMap = mediaStateBySession.get(sessionId);

    const payload = {
      userId: String(userId),
      username,
      hasMedia: Boolean(hasMedia),
      micOn: Boolean(micOn),
      camOn: Boolean(camOn),
      updatedAt: new Date().toISOString(),
    };

    if (payload.hasMedia || payload.micOn || payload.camOn) {
      mediaMap.set(socket.id, payload);
    } else {
      mediaMap.delete(socket.id);
    }

    if (mediaMap.size === 0) {
      mediaStateBySession.delete(sessionId);
    }

    io.to(sessionId).emit("media-state", {
      socketId: socket.id,
      ...payload,
    });
  });

  /**
   * Update presenter state
   * Payload: { sessionId, userId, username, isPresenting, micOn, camOn }
   */
  socket.on("presenter-state", (data) => {
    const { sessionId, userId, username, isPresenting, micOn, camOn } = data || {};
    if (!sessionId || !userId || !username) {
      return;
    }

    const payload = {
      sessionId,
      userId: String(userId),
      username,
      isPresenting: Boolean(isPresenting),
      micOn: Boolean(micOn),
      camOn: Boolean(camOn),
      updatedAt: new Date().toISOString(),
    };

    if (payload.isPresenting) {
      presenterStateBySession.set(sessionId, payload);
    } else {
      const existing = presenterStateBySession.get(sessionId);
      if (existing && String(existing.userId) === String(userId)) {
        presenterStateBySession.delete(sessionId);
      }
    }

    io.to(sessionId).emit("presenter-state", payload);
  });

  /**
   * WebRTC signaling: presenter -> viewer offer relay
   * Payload: { targetSocketId, sdp, presenter }
   */
  socket.on("presenter-offer", ({ targetSocketId, sdp, presenter }) => {
    if (!targetSocketId || !sdp) return;
    io.to(targetSocketId).emit("presenter-offer", {
      fromSocketId: socket.id,
      sdp,
      presenter,
    });
  });

  /**
   * WebRTC signaling: participant -> participant offer relay
   * Payload: { targetSocketId, sdp }
   */
  socket.on("webrtc-offer", ({ targetSocketId, sdp }) => {
    if (!targetSocketId || !sdp) return;
    io.to(targetSocketId).emit("webrtc-offer", {
      fromSocketId: socket.id,
      sdp,
    });
  });

  /**
   * WebRTC signaling: viewer -> presenter answer relay
   * Payload: { targetSocketId, sdp }
   */
  socket.on("viewer-answer", ({ targetSocketId, sdp }) => {
    if (!targetSocketId || !sdp) return;
    io.to(targetSocketId).emit("viewer-answer", {
      fromSocketId: socket.id,
      sdp,
    });
  });

  /**
   * WebRTC signaling: participant -> participant answer relay
   * Payload: { targetSocketId, sdp }
   */
  socket.on("webrtc-answer", ({ targetSocketId, sdp }) => {
    if (!targetSocketId || !sdp) return;
    io.to(targetSocketId).emit("webrtc-answer", {
      fromSocketId: socket.id,
      sdp,
    });
  });

  /**
   * WebRTC signaling: ICE candidate relay (both directions)
   * Payload: { targetSocketId, candidate }
   */
  socket.on("webrtc-ice-candidate", ({ targetSocketId, candidate }) => {
    if (!targetSocketId || !candidate) return;
    io.to(targetSocketId).emit("webrtc-ice-candidate", {
      fromSocketId: socket.id,
      candidate,
    });
  });

  /**
   * Session document changed by a participant (after API update)
   * Payload: { sessionId, documentUrl, documentName, updatedBy }
   */
  socket.on("session-document-updated", (data) => {
    const { sessionId, documentUrl, documentName, updatedBy } = data || {};
    if (!sessionId || !documentUrl || !documentName) return;

    io.to(sessionId).emit("session-document-updated", {
      sessionId,
      documentUrl,
      documentName,
      updatedBy,
      updatedAt: new Date().toISOString(),
    });
  });

  /**
   * User highlights text in PDF
   * Payload: { sessionId, userId, username, text, page, position, color }
   */
  socket.on("highlight", async (data) => {
    try {
      const { sessionId, userId, username, text, page, position, color, clientId } = data;

      // Save highlight to DB
      const highlight = new Highlight({
        sessionId,
        userId,
        username,
        text,
        page,
        position,
        color,
      });

      const saved = await highlight.save();

      // Broadcast to all in room (including sender for confirmation)
      io.to(sessionId).emit("highlight", {
        _id: saved._id,
        clientId,
        userId,
        username,
        text,
        page,
        position,
        color,
        createdAt: saved.createdAt,
      });

      console.log(`[Socket] Highlight created in session ${sessionId}`);
    } catch (error) {
      console.error("[Socket] Highlight error:", error);
      socket.emit("error", { message: "Failed to save highlight" });
    }
  });

  /**
   * User adds comment to a highlight
   * Payload: { sessionId, highlightId, userId, username, text }
   */
  socket.on("send-comment", async (data) => {
    try {
      const { sessionId, highlightId, userId, username, text, clientId } = data;

      // Save comment to DB
      const comment = new Comment({
        sessionId,
        highlightId,
        userId,
        username,
        text,
      });

      const saved = await comment.save();

      // Broadcast to all in room
      io.to(sessionId).emit("receive-comment", {
        _id: saved._id,
        clientId,
        highlightId,
        userId,
        username,
        text,
        createdAt: saved.createdAt,
      });

      console.log(`[Socket] Comment added to highlight ${highlightId}`);
    } catch (error) {
      console.error("[Socket] Comment error:", error);
      socket.emit("error", { message: "Failed to save comment" });
    }
  });

  /**
   * User updates shared notes
   * Payload: { sessionId, userId, username, content }
   * Server debounces and broadcasts after 500ms pause
   */
  socket.on("update-notes", async (data) => {
    try {
      const { sessionId, userId, username, content } = data;

      // Update or create notes document
      await SessionNotes.findOneAndUpdate(
        { sessionId },
        {
          content,
          lastEditedBy: { userId, username },
        },
        { upsert: true }
      );

      // Broadcast to others in room (not sender to avoid echo)
      socket.to(sessionId).emit("update-notes", { content, username });

      console.log(`[Socket] Notes updated in session ${sessionId}`);
    } catch (error) {
      console.error("[Socket] Update notes error:", error);
      socket.emit("error", { message: "Failed to save notes" });
    }
  });

  /**
   * User changes PDF page
   * Payload: { sessionId, page, username }
   */
  socket.on("page-change", (data) => {
    const { sessionId, page, username } = data;

    // Broadcast to others in room (not sender)
    socket.to(sessionId).emit("page-change", { page, username });

    console.log(`[Socket] Page changed to ${page} in session ${sessionId}`);
  });

  /**
   * User moves cursor in PDF session
   * Payload: { sessionId, userId, username, x, y, page }
   */
  socket.on("cursor-move", (data) => {
    const { sessionId, userId, username, x, y, page } = data || {};
    if (!sessionId || !userId || !username) return;

    // Broadcast cursor position to all others in room (except sender)
    socket.to(sessionId).emit("remote-cursor-move", {
      socketId: socket.id,
      userId: String(userId),
      username,
      x: Math.round(x),
      y: Math.round(y),
      page: Number(page),
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * User leaves (cursor cleanup)
   */
  socket.on("cursor-leave", (data) => {
    const { sessionId } = data || {};
    if (!sessionId) return;

    socket.to(sessionId).emit("remote-cursor-leave", {
      socketId: socket.id,
    });
  });

  /**
   * User disconnects
   */
  socket.on("disconnect", () => {
    const { sessionId, userId, username } = socket.data || {};

    if (sessionId && sessionPresence.has(sessionId)) {
      const roomMap = sessionPresence.get(sessionId);
      roomMap.delete(socket.id);

      if (roomMap.size === 0) {
        sessionPresence.delete(sessionId);
      }

      if (userId && username) {
        socket.to(sessionId).emit("user-left", { userId, username });
      }
      io.to(sessionId).emit("presence-update", { users: getPresenceList(sessionId) });

      const presenterState = presenterStateBySession.get(sessionId);
      if (presenterState && String(presenterState.userId) === String(userId)) {
        presenterStateBySession.delete(sessionId);
        io.to(sessionId).emit("presenter-state", {
          sessionId,
          userId: String(userId),
          username,
          isPresenting: false,
          micOn: false,
          camOn: false,
          updatedAt: new Date().toISOString(),
        });
      }

      if (mediaStateBySession.has(sessionId)) {
        const mediaMap = mediaStateBySession.get(sessionId);
        mediaMap.delete(socket.id);

        if (mediaMap.size === 0) {
          mediaStateBySession.delete(sessionId);
        }

        io.to(sessionId).emit("media-state-left", {
          socketId: socket.id,
          userId: String(userId || ""),
          username,
        });
      }
    }

    console.log(`[Socket] User disconnected: ${socket.id}`);
  });
});

/* ==================== END SOCKET.IO ==================== */
/* 404 handler */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

/* Error handler */
app.use(errorHandler);

/* Start server */
const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`[Socket.io] Ready for WebSocket connections`);
});

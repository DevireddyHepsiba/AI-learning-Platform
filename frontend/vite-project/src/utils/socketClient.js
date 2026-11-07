import { io } from "socket.io-client";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000`;

let socket = null;
let currentSessionId = null;
let currentJoinParams = null;

/**
 * Initialize socket connection
 * Should be called once when joining a session
 */
export const initSocket = ({ sessionId, userId, username }) => {
  if (!sessionId || !userId) {
    console.error("[Socket] Invalid session params:", { sessionId, userId });
    return null;
  }

  // If already connected to SAME session, don't reinitialize
  if (socket?.connected && currentSessionId === sessionId) {
    console.log("[Socket] Already connected to session:", sessionId);
    return socket;
  }

  // Store join params for reconnection
  currentJoinParams = { sessionId, userId, username };
  currentSessionId = sessionId;

  const handleJoinSession = () => {
    if (!socket || !currentJoinParams) return;
    
    const { sessionId: sid, userId: uid, username: uname } = currentJoinParams;
    socket.emit("join-session", { sessionId: sid, userId: uid, username: uname });
    console.log(`[Socket] Emitting join-session for ${sid} as user ${uid}`);
  };

  // Close existing socket if switching sessions
  if (socket?.connected && currentSessionId !== sessionId) {
    console.log(`[Socket] Disconnecting from previous session: ${currentSessionId}`);
    socket.disconnect();
    socket = null;
  }

  // Create new socket if needed
  if (!socket) {
    console.log(`[Socket] Creating new socket connection to ${API_BASE}`);
    socket = io(API_BASE, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 15000,
      transports: ["websocket", "polling"],
      multiplex: false,
    });

    // Connection events
    socket.on("connect", () => {
      console.log(`[Socket] Connected with ID: ${socket.id}`);
      handleJoinSession();
    });

    socket.on("reconnect", () => {
      console.log(`[Socket] Reconnected with ID: ${socket.id}`);
      handleJoinSession();
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message || error);
    });

    socket.on("error", (error) => {
      console.error("[Socket] Error:", error.message || error);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected (${reason})`);
      if (reason === "io server disconnect" || reason === "io client namespace disconnect") {
        // Server kicked us off or we were forced to disconnect
        currentSessionId = null;
      }
    });
  } else if (socket.connected) {
    // Socket exists and is connected, just emit join for new session
    console.log(`[Socket] Socket connected, joining new session: ${sessionId}`);
    handleJoinSession();
  }

  return socket;
};

/**
 * Get current socket instance
 */
export const getSocket = () => socket;

/**
 * Emit highlight event
 */
export const emitHighlight = (data) => {
  if (socket?.connected) {
    socket.emit("highlight", data);
  }
};

/**
 * Emit comment event
 */
export const emitComment = (data) => {
  if (socket?.connected) {
    socket.emit("send-comment", data);
  }
};

/**
 * Emit notes update
 */
export const emitNotesUpdate = (data) => {
  if (socket?.connected) {
    socket.emit("update-notes", data);
  }
};

/**
 * Emit page change
 */
export const emitPageChange = (data) => {
  if (socket?.connected) {
    socket.emit("page-change", data);
  }
};

/**
 * Emit presenter state updates
 */
export const emitPresenterState = (data) => {
  if (socket?.connected) {
    socket.emit("presenter-state", data);
  }
};

/**
 * Emit cursor position
 */
export const emitCursorMove = (data) => {
  if (socket?.connected) {
    socket.emit("cursor-move", data);
  }
};

/**
 * Emit cursor leave
 */
export const emitCursorLeave = (data) => {
  if (socket?.connected) {
    socket.emit("cursor-leave", data);
  }
};

/**
 * Register event listeners
 */
export const on = (event, callback) => {
  if (socket) {
    socket.on(event, callback);
  }
};

/**
 * Unregister event listeners
 */
export const off = (event, callback) => {
  if (socket) {
    socket.off(event, callback);
  }
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    console.log("[Socket] Disconnecting from session:", currentSessionId);
    socket.disconnect();
    socket = null;
    currentSessionId = null;
    currentJoinParams = null;
  }
};

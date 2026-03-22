import { io } from "socket.io-client";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:8000`;

let socket = null;

/**
 * Initialize socket connection
 * Should be called once when joining a session
 */
export const initSocket = ({ sessionId, userId, username }) => {
  if (socket?.connected) {
    socket.emit("join-session", { sessionId, userId, username });
    console.warn("[Socket] Already connected, re-joining room");
    return socket;
  }

  socket = io(API_BASE, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    timeout: 10000,
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log(`[Socket] Connected with ID: ${socket.id}`);
    // Emit join-session after connection
    socket.emit("join-session", { sessionId, userId, username });
  });

  socket.on("connect_error", (error) => {
    console.error("[Socket] Connection error:", error);
  });

  socket.on("disconnect", () => {
    console.log("[Socket] Disconnected");
  });

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
    socket.disconnect();
    socket = null;
  }
};

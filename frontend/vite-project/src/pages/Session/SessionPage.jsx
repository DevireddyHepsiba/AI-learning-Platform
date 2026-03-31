import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PDFViewer from "../../components/session/PDFViewer";
import HighlightLayer from "../../components/session/HighlightLayer";
import RemoteCursorLayer from "../../components/session/RemoteCursorLayer";
import CommentsPanel from "../../components/session/CommentsPanel";
import NotesPanel from "../../components/session/NotesPanel";
import InviteModal from "../../components/session/InviteModal";
import {
  initSocket,
  disconnectSocket,
  getSocket,
  on,
  off,
  emitHighlight,
  emitComment,
  emitNotesUpdate,
  emitPageChange,
  emitCursorMove,
  emitCursorLeave,
} from "../../utils/socketClient";
import { prettifySnippet } from "../../utils/sessionHelpers";
import axiosInstance from "../../utils/axiosinstance";
import { quickClarity } from "../../services/aiService";
import documentService from "../../services/documentationService";
import {
  Share2,
  Users,
  X,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Download,
  Sparkles,
  Highlighter,
  Upload,
} from "lucide-react";

const CURSOR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#F7DC6F", "#BB8FCE", "#85C1E9", "#F8B88B", "#ABEBC6"
];

const normalize = (value = "") => String(value).replace(/\s+/g, " ").trim().toLowerCase();

const toId = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (value._id) return toId(value._id);
    if (value.id) return toId(value.id);
  }
  return String(value);
};

const resolveUsername = (candidateUser, guestName = "") => {
  const fromUser = String(candidateUser?.username || candidateUser?.name || "").trim();
  if (fromUser) return fromUser;

  const fromGuest = String(guestName || "").trim();
  if (fromGuest) return fromGuest;

  return "Guest";
};

const isSameHighlight = (a, b) => {
  if (!a || !b) return false;
  return (
    String(a.page) === String(b.page) &&
    normalize(a.text) === normalize(b.text) &&
    String(a.userId) === String(b.userId)
  );
};

const isSameComment = (a, b) => {
  if (!a || !b) return false;
  return (
    toId(a.highlightId) === toId(b.highlightId) &&
    normalize(a.text) === normalize(b.text) &&
    String(a.userId) === String(b.userId)
  );
};

function RemoteMediaTile({ stream, username, camOn = true, micOn = true }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream || null;
    if (stream) {
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          // Browser autoplay can be blocked until first interaction.
        });
      }
    }
  }, [stream]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/20 bg-slate-950 shadow-lg relative">
      <div className="px-3 py-2 text-xs font-semibold text-white bg-slate-900/90 flex items-center justify-between">
        <span>{username || "Participant"}</span>
        <span className="text-[10px] text-slate-200">{micOn ? "Mic On" : "Mic Off"} - {camOn ? "Cam On" : "Cam Off"}</span>
      </div>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        data-remote-media="1"
        className={camOn ? "h-40 w-full object-cover bg-black" : "absolute h-px w-px opacity-0 pointer-events-none -z-10"}
      />

      {!camOn && (
        <div className="h-40 w-full bg-slate-900 text-cyan-100 flex items-center justify-center text-sm font-medium">
          Camera is off
        </div>
      )}
    </div>
  );
}

export default function SessionPage() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [comments, setComments] = useState([]);
  const [notes, setNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [joinNotice, setJoinNotice] = useState("");
  const [selectionAction, setSelectionAction] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");

  const [isMediaOn, setIsMediaOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [mediaStates, setMediaStates] = useState({});
  const [mediaError, setMediaError] = useState("");
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfUpdateNotice, setPdfUpdateNotice] = useState("");
  const [remoteCursors, setRemoteCursors] = useState({});
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const stableUserIdRef = useRef("");
  const pdfInputRef = useRef(null);
  const cursorThrottleRef = useRef(null);
  const cursorColorMapRef = useRef(new Map());

  const iceConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const selfUser = currentUser || user;

  const getOrAssignCursorColor = (socketId) => {
    if (!cursorColorMapRef.current.has(socketId)) {
      const randomColor = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
      cursorColorMapRef.current.set(socketId, randomColor);
    }
    return cursorColorMapRef.current.get(socketId);
  };

  const resolveSessionUserId = useCallback((candidateUser) => {
    const explicitId = toId(candidateUser?.id || candidateUser?._id);
    if (explicitId) {
      stableUserIdRef.current = explicitId;
      return explicitId;
    }

    if (!stableUserIdRef.current) {
      stableUserIdRef.current = `guest-${Date.now()}`;
    }

    return stableUserIdRef.current;
  }, []);

  const stopLocalStream = useCallback(() => {
    setLocalStream((prev) => {
      if (prev) {
        prev.getTracks().forEach((track) => track.stop());
      }
      return null;
    });
  }, []);

  const closePeerConnection = useCallback((socketId) => {
    const pc = peerConnectionsRef.current[socketId];
    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[socketId];
    }

    setRemoteStreams((prev) => {
      if (!prev[socketId]) return prev;
      const copy = { ...prev };
      delete copy[socketId];
      return copy;
    });
  }, []);

  const closeAllPeerConnections = useCallback(() => {
    Object.keys(peerConnectionsRef.current).forEach((socketId) => {
      const pc = peerConnectionsRef.current[socketId];
      if (pc) pc.close();
      delete peerConnectionsRef.current[socketId];
    });
    setRemoteStreams({});
  }, []);

  const createPeerConnection = useCallback(
    (targetSocketId, streamForTracks = null) => {
      const socket = getSocket();
      if (!socket || !targetSocketId) return null;

      if (peerConnectionsRef.current[targetSocketId]) {
        return peerConnectionsRef.current[targetSocketId];
      }

      const pc = new RTCPeerConnection(iceConfig);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc-ice-candidate", {
            targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams?.[0]) {
          setRemoteStreams((prev) => ({
            ...prev,
            [targetSocketId]: event.streams[0],
          }));
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "failed" || state === "disconnected" || state === "closed") {
          closePeerConnection(targetSocketId);
        }
      };

      if (streamForTracks) {
        streamForTracks.getTracks().forEach((track) => {
          pc.addTrack(track, streamForTracks);
        });
      }

      peerConnectionsRef.current[targetSocketId] = pc;
      return pc;
    },
    [closePeerConnection]
  );

  const renegotiatePeer = useCallback(async (targetSocketId) => {
    const socket = getSocket();
    const pc = peerConnectionsRef.current[targetSocketId];
    if (!socket?.connected || !pc) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("webrtc-offer", {
        targetSocketId,
        sdp: offer,
      });
    } catch (error) {
      console.error("[WebRTC] Renegotiation failed:", error);
    }
  }, []);

  const applyRemoteOfferSafely = useCallback(async (pc, sdp) => {
    const remoteDesc = new RTCSessionDescription(sdp);

    if (pc.signalingState !== "stable") {
      try {
        await pc.setLocalDescription({ type: "rollback" });
      } catch {
        // If rollback fails, continue and attempt setting remote description.
      }
    }

    await pc.setRemoteDescription(remoteDesc);
  }, []);

  const emitMediaState = useCallback(() => {
    const socket = getSocket();
    if (!socket?.connected || !selfUser || !sessionId) return;
    const username = resolveUsername(selfUser, guestName);

    socket.emit("media-state", {
      sessionId,
      userId: resolveSessionUserId(selfUser),
      username,
      hasMedia: Boolean(isMediaOn && localStream),
      micOn: Boolean(isMediaOn && micOn),
      camOn: Boolean(isMediaOn && camOn),
    });
  }, [selfUser, sessionId, guestName, isMediaOn, localStream, micOn, camOn, resolveSessionUserId]);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided. Please create a session first.");
      setLoading(false);
      setTimeout(() => navigate("/dashboard"), 2000);
      return;
    }

    const fetchSessionData = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/api/sessions/${sessionId}`);

        if (response.data.success) {
          const sessionPayload = response.data.data.session || {};
          let cachedSessionName = "";

          try {
            cachedSessionName = localStorage.getItem(`session-name:${sessionId}`) || "";
          } catch {
            cachedSessionName = "";
          }

          setSession({
            ...sessionPayload,
            sessionName: sessionPayload.sessionName || cachedSessionName || sessionPayload.documentName,
          });
          setHighlights(response.data.data.highlights || []);
          setComments(response.data.data.comments || []);
          setNotes(response.data.data.notes || "");
          setActiveUsers([]);
          setError(null);
        } else {
          setError("Session not found");
        }
      } catch (err) {
        console.error("Failed to fetch session:", err);
        setError(err.response?.data?.message || "Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId, navigate]);

  useEffect(() => {
    if (!session) return;

    const userToUse = currentUser || user;
    if (!userToUse) {
      setShowGuestModal(true);
      return;
    }

    try {
      const username = resolveUsername(userToUse, guestName);
      initSocket({
        sessionId,
        userId: resolveSessionUserId(userToUse),
        username,
      });
    } catch (err) {
      console.error("[Session] Socket init error:", err);
      setError("Failed to connect to collaboration session");
    }

    return () => {
      disconnectSocket();
    };
  }, [session, currentUser, user, sessionId, guestName, resolveSessionUserId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const selfName = (currentUser || user)?.username || guestName;

    const handleHighlightSocket = (data) => {
      setHighlights((prev) => {
        if (prev.some((h) => toId(h._id) === toId(data._id))) return prev;

        const tempIndex = prev.findIndex((h) => h.clientId && data.clientId && h.clientId === data.clientId);
        if (tempIndex >= 0) {
          const updated = [...prev];
          updated[tempIndex] = { ...updated[tempIndex], ...data };
          return updated;
        }

        if (prev.some((h) => isSameHighlight(h, data))) return prev;

        return [...prev, data];
      });
    };

    const handleCommentSocket = (data) => {
      setComments((prev) => {
        if (prev.some((c) => toId(c._id) === toId(data._id))) return prev;

        const tempIndex = prev.findIndex((c) => c.clientId && data.clientId && c.clientId === data.clientId);
        if (tempIndex >= 0) {
          const updated = [...prev];
          updated[tempIndex] = { ...updated[tempIndex], ...data };
          return updated;
        }

        if (prev.some((c) => isSameComment(c, data))) return prev;

        return [...prev, data];
      });
    };

    const handleNotesUpdate = ({ content }) => {
      setNotes(content || "");
    };

    const handlePageUpdate = ({ page }) => {
      if (page) setCurrentPage(page);
    };

    const handleUserJoined = ({ username }) => {
      if (username && username !== selfName) {
        setJoinNotice(`${username} joined the session`);
        setTimeout(() => setJoinNotice(""), 2500);
      }
    };

    const handleUserLeft = ({ username }) => {
      if (username && username !== selfName) {
        setJoinNotice(`${username} left the session`);
        setTimeout(() => setJoinNotice(""), 2500);
      }
    };

    const handlePresenceUpdate = ({ users = [] }) => {
      setActiveUsers(
        users.map((u) => ({
          socketId: u.socketId,
          userId: u.userId,
          username: u.username,
          joinedAt: u.joinedAt,
        }))
      );
    };

    const handleMediaState = (data) => {
      if (!data?.socketId) return;
      setMediaStates((prev) => ({
        ...prev,
        [data.socketId]: data,
      }));
    };

    const handleMediaStateSync = ({ participants = [] }) => {
      const next = {};
      participants.forEach((participant) => {
        if (participant?.socketId) {
          next[participant.socketId] = participant;
        }
      });
      setMediaStates(next);
    };

    const handleMediaLeft = ({ socketId }) => {
      if (!socketId) return;
      setMediaStates((prev) => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });
      closePeerConnection(socketId);
    };

    const handleWebRtcOffer = async ({ fromSocketId, sdp }) => {
      try {
        if (!fromSocketId || !sdp) return;

        const pc = createPeerConnection(fromSocketId, localStream);
        if (!pc) return;

        await applyRemoteOfferSafely(pc, sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc-answer", {
          targetSocketId: fromSocketId,
          sdp: answer,
        });
      } catch (e) {
        console.error("[WebRTC] Failed handling offer:", e);
      }
    };

    const handleWebRtcAnswer = async ({ fromSocketId, sdp }) => {
      try {
        const pc = peerConnectionsRef.current[fromSocketId];
        if (!pc || !sdp) return;
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (e) {
        console.error("[WebRTC] Failed handling answer:", e);
      }
    };

    const handleIceCandidate = async ({ fromSocketId, candidate }) => {
      try {
        const pc = peerConnectionsRef.current[fromSocketId];
        if (!pc || !candidate) return;
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("[WebRTC] Failed adding ICE candidate:", e);
      }
    };

    const handleSocketError = ({ message }) => {
      setError(message || "Collaboration error");
    };

    const handleSessionDocumentUpdated = ({ documentUrl, documentName, updatedBy }) => {
      if (!documentUrl || !documentName) return;
      setSession((prev) => (prev ? { ...prev, documentUrl, documentName } : prev));
      setCurrentPage(1);
      setNumPages(0);

      if (updatedBy && updatedBy !== selfName) {
        setJoinNotice(`${updatedBy} changed the PDF`);
        setTimeout(() => setJoinNotice(""), 2500);
      }
    };

    const handleRemoteCursorMove = (data) => {
      const { socketId, userId, username, x, y, page } = data;
      // Only show cursors on same page
      if (Number(page) !== currentPage) return;

      setRemoteCursors((prev) => ({
        ...prev,
        [socketId]: {
          socketId,
          userId,
          username,
          x,
          y,
          page,
          color: getOrAssignCursorColor(socketId),
        },
      }));
    };

    const handleRemoteCursorLeave = (data) => {
      const { socketId } = data;
      setRemoteCursors((prev) => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });
    };

    on("highlight", handleHighlightSocket);
    on("receive-comment", handleCommentSocket);
    on("update-notes", handleNotesUpdate);
    on("page-change", handlePageUpdate);
    on("user-joined", handleUserJoined);
    on("user-left", handleUserLeft);
    on("presence-update", handlePresenceUpdate);
    on("media-state", handleMediaState);
    on("media-state-sync", handleMediaStateSync);
    on("media-state-left", handleMediaLeft);
    on("webrtc-offer", handleWebRtcOffer);
    on("webrtc-answer", handleWebRtcAnswer);
    on("webrtc-ice-candidate", handleIceCandidate);
    on("session-document-updated", handleSessionDocumentUpdated);
    on("remote-cursor-move", handleRemoteCursorMove);
    on("remote-cursor-leave", handleRemoteCursorLeave);
    on("error", handleSocketError);

    // Ensure current presence is synced even if initial join happened before listeners were attached.
    if (socket.connected && sessionId && selfUser) {
      socket.emit("join-session", {
        sessionId,
        userId: resolveSessionUserId(selfUser),
        username: resolveUsername(selfUser, guestName),
      });
    }

    return () => {
      off("highlight", handleHighlightSocket);
      off("receive-comment", handleCommentSocket);
      off("update-notes", handleNotesUpdate);
      off("page-change", handlePageUpdate);
      off("user-joined", handleUserJoined);
      off("user-left", handleUserLeft);
      off("presence-update", handlePresenceUpdate);
      off("media-state", handleMediaState);
      off("media-state-sync", handleMediaStateSync);
      off("media-state-left", handleMediaLeft);
      off("webrtc-offer", handleWebRtcOffer);
      off("webrtc-answer", handleWebRtcAnswer);
      off("webrtc-ice-candidate", handleIceCandidate);
      off("session-document-updated", handleSessionDocumentUpdated);
      off("remote-cursor-move", handleRemoteCursorMove);
      off("remote-cursor-leave", handleRemoteCursorLeave);
      off("error", handleSocketError);
    };
  }, [session, currentUser, user, guestName, sessionId, selfUser, currentPage, resolveSessionUserId, createPeerConnection, closePeerConnection, localStream, applyRemoteOfferSafely]);

  useEffect(() => {
    if (!sessionId || !selfUser) return;

    const handleMouseMove = (e) => {
      const now = Date.now();
      if (cursorThrottleRef.current && now - cursorThrottleRef.current < 100) {
        return; // Throttle to 100ms
      }
      cursorThrottleRef.current = now;

      const socket = getSocket();
      if (socket?.connected) {
        emitCursorMove({
          sessionId,
          userId: resolveSessionUserId(selfUser),
          username: resolveUsername(selfUser, guestName),
          x: e.clientX,
          y: e.clientY,
          page: currentPage,
        });
      }
    };

    const handleMouseLeave = () => {
      const socket = getSocket();
      if (socket?.connected) {
        emitCursorLeave({
          sessionId,
        });
      }
      setRemoteCursors({});
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [sessionId, selfUser, guestName, currentPage, resolveSessionUserId]);

  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;

    video.srcObject = localStream || null;
    if (localStream) {
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          // Browser autoplay can be blocked until first interaction.
        });
      }
    }
  }, [localStream]);

  useEffect(() => {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    const videoTrack = localStream.getVideoTracks()[0];
    if (audioTrack) audioTrack.enabled = micOn;
    if (videoTrack) videoTrack.enabled = camOn;

    emitMediaState();
  }, [localStream, micOn, camOn, emitMediaState]);

  useEffect(() => {
    if (!localStream) return;

    const peers = Object.entries(peerConnectionsRef.current);
    const renegotiateTargets = [];

    peers.forEach(([socketId, pc]) => {
      if (!pc) return;

      const senders = pc.getSenders();
      const existingTrackIds = new Set(
        senders
          .map((sender) => sender.track?.id)
          .filter(Boolean)
      );

      let addedTrack = false;
      localStream.getTracks().forEach((track) => {
        if (!existingTrackIds.has(track.id)) {
          pc.addTrack(track, localStream);
          addedTrack = true;
        }
      });

      if (addedTrack) {
        renegotiateTargets.push(socketId);
      }
    });

    renegotiateTargets.forEach((socketId) => {
      renegotiatePeer(socketId);
    });
  }, [localStream, renegotiatePeer]);

  useEffect(() => {
    emitMediaState();
  }, [emitMediaState]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket?.connected || !sessionId) return;

    const selfSocketId = socket.id;
    if (!selfSocketId) return;

    const peers = activeUsers.filter((u) => u.socketId && u.socketId !== selfSocketId);

    const connectToPeers = async () => {
      for (const peer of peers) {
        const peerState = mediaStates[peer.socketId] || {};
        const shouldConnect = Boolean((isMediaOn && localStream) || peerState.hasMedia);

        if (!shouldConnect) {
          closePeerConnection(peer.socketId);
          continue;
        }

        if (peerConnectionsRef.current[peer.socketId]) continue;

        // Stable glare-avoidance rule: lexicographically larger socket creates the offer.
        if (String(selfSocketId) < String(peer.socketId)) continue;

        const pc = createPeerConnection(peer.socketId, localStream);
        if (!pc) continue;

        try {
          await renegotiatePeer(peer.socketId);
        } catch (e) {
          console.error("[WebRTC] Failed creating offer:", e);
          closePeerConnection(peer.socketId);
        }
      }

      const activeIds = new Set(peers.map((p) => p.socketId));
      Object.keys(peerConnectionsRef.current).forEach((socketId) => {
        if (!activeIds.has(socketId)) {
          closePeerConnection(socketId);
        }
      });
    };

    connectToPeers();
  }, [activeUsers, mediaStates, isMediaOn, localStream, sessionId, createPeerConnection, closePeerConnection, renegotiatePeer]);

  useEffect(() => {
    if (!isMediaOn) return;

    const retryTimer = setInterval(() => {
      const socket = getSocket();
      if (!socket?.connected) return;
      const selfSocketId = socket.id;
      if (!selfSocketId) return;

      activeUsers.forEach((peer) => {
        if (!peer?.socketId || peer.socketId === selfSocketId) return;

        const peerState = mediaStates[peer.socketId];
        const hasIncomingStream = Boolean(remoteStreams[peer.socketId]);
        if (!peerState?.hasMedia || hasIncomingStream) return;

        const pc = createPeerConnection(peer.socketId, localStream);
        if (!pc) return;
        renegotiatePeer(peer.socketId);
      });
    }, 2500);

    return () => clearInterval(retryTimer);
  }, [isMediaOn, activeUsers, mediaStates, remoteStreams, localStream, createPeerConnection, renegotiatePeer]);

  const handleHighlight = useCallback(
    (data) => {
      const userToUse = currentUser || user;
      if (!userToUse) return;

      const normalizedText = String(data.text || "").trim();
      if (normalizedText.length < 3) return;

      const candidate = {
        ...data,
        text: normalizedText,
        userId: resolveSessionUserId(userToUse),
      };

      if (highlights.some((h) => isSameHighlight(h, candidate))) return;

      const clientId = `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      emitHighlight({
        ...candidate,
        clientId,
      });

      setHighlights((prev) => [
        ...prev,
        {
          _id: `temp-${clientId}`,
          ...candidate,
          clientId,
          createdAt: new Date(),
        },
      ]);
    },
    [user, currentUser, highlights, resolveSessionUserId]
  );

  const handleAddComment = useCallback(
    (data) => {
      const userToUse = currentUser || user;
      if (!userToUse) return;

      const normalizedText = String(data.text || "").trim();
      if (!normalizedText) return;

      const clientId = `cm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const candidate = {
        ...data,
        text: normalizedText,
        sessionId,
        userId: resolveSessionUserId(userToUse),
        clientId,
      };

      if (comments.some((c) => isSameComment(c, candidate))) return;

      emitComment(candidate);

      setComments((prev) => [
        ...prev,
        {
          _id: `temp-${clientId}`,
          ...candidate,
          createdAt: new Date(),
        },
      ]);
    },
    [sessionId, user, currentUser, comments, resolveSessionUserId]
  );

  const handleNotesChange = useCallback(
    (content) => {
      const userToUse = currentUser || user;
      if (!userToUse) return;
      const username = resolveUsername(userToUse, guestName);

      emitNotesUpdate({
        sessionId,
        content,
        userId: resolveSessionUserId(userToUse),
        username,
      });
    },
    [sessionId, user, currentUser, guestName, resolveSessionUserId]
  );

  const handlePageChange = useCallback(
    (page) => {
      const userToUse = currentUser || user;
      if (!userToUse) return;
      const username = resolveUsername(userToUse, guestName);

      setCurrentPage(page);
      emitPageChange({
        sessionId,
        page,
        username,
      });
    },
    [sessionId, user, currentUser, guestName]
  );

  const handlePDFLoadSuccess = (totalPages) => {
    setNumPages(totalPages);
  };

  const handleToggleAV = () => {
    if (isMediaOn) {
      setIsMediaOn(false);
      setMicOn(false);
      setCamOn(false);
      stopLocalStream();
      closeAllPeerConnections();
      setMediaError("");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        setIsMediaOn(true);
        setMicOn(true);
        setCamOn(true);
        setMediaError("");
      })
      .catch((err) => {
        console.error("[Media] getUserMedia failed:", err);
        setMediaError("Camera/Microphone permission denied or unavailable.");
      });
  };

  const handleSelectionAction = (payload) => {
    setAiResult("");
    setSelectionAction(payload);
  };

  const handleAskAiForSelection = async () => {
    if (!selectionAction?.text) return;
    try {
      setAiLoading(true);
      const result = await quickClarity(
        selectionAction.text,
        `Session: ${session?.documentName || "Collaborative Study Session"}`
      );
      setAiResult(result?.explanation || "No explanation generated.");
    } catch (err) {
      setAiResult(err?.message || "AI request failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadNotes = () => {
    const content = notes?.trim() || "No shared notes captured for this session.";
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(session?.documentName || "session-notes").replace(/\s+/g, "-").toLowerCase()}-${sessionId}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExitSession = () => {
    if (!window.confirm("Exit this session?")) return;

    setIsMediaOn(false);
    setMicOn(false);
    setCamOn(false);
    stopLocalStream();
    closeAllPeerConnections();
    navigate("/dashboard");
  };

  const handleGuestJoin = useCallback(() => {
    const trimmedName = String(guestName || "").trim();
    if (!trimmedName) return;

    const guestUser = {
      username: trimmedName,
      id: `guest-${Date.now()}`,
    };

    setCurrentUser(guestUser);
    setShowGuestModal(false);

    try {
      initSocket({
        sessionId,
        userId: resolveSessionUserId(guestUser),
        username: resolveUsername(guestUser, trimmedName),
      });
    } catch (err) {
      console.error("[Session] Guest socket init error:", err);
      setError("Failed to join collaboration session");
    }
  }, [guestName, sessionId, resolveSessionUserId]);

  const handleClickUploadPdf = () => {
    if (!user) {
      setPdfUpdateNotice("Login required to upload/replace PDF in session.");
      setTimeout(() => setPdfUpdateNotice(""), 2500);
      return;
    }
    pdfInputRef.current?.click();
  };

  const handlePdfFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (file.type !== "application/pdf") {
      setPdfUpdateNotice("Please select a PDF file.");
      setTimeout(() => setPdfUpdateNotice(""), 2500);
      return;
    }

    if (!user) {
      setPdfUpdateNotice("Login required to upload/replace PDF in session.");
      setTimeout(() => setPdfUpdateNotice(""), 2500);
      return;
    }

    try {
      setIsUploadingPdf(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.pdf$/i, ""));

      const uploadResponse = await documentService.uploadDocument(formData);
      const uploadedDoc = uploadResponse?.data;
      const documentUrl = uploadedDoc?.filePath;
      const documentName = uploadedDoc?.fileName || file.name;

      if (!documentUrl || !documentName) {
        throw new Error("Uploaded PDF information missing");
      }

      await axiosInstance.put(`/api/sessions/${sessionId}/document`, {
        documentUrl,
        documentName,
      });

      setSession((prev) => (prev ? { ...prev, documentUrl, documentName } : prev));
      setCurrentPage(1);
      setNumPages(0);

      const updatedBy = resolveUsername(selfUser, guestName);
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("session-document-updated", {
          sessionId,
          documentUrl,
          documentName,
          updatedBy,
        });
      }

      setPdfUpdateNotice("Session PDF updated successfully.");
      setTimeout(() => setPdfUpdateNotice(""), 2500);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to update session PDF";
      setPdfUpdateNotice(message);
      setTimeout(() => setPdfUpdateNotice(""), 3000);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  useEffect(() => {
    return () => {
      setIsMediaOn(false);
      stopLocalStream();
      closeAllPeerConnections();
    };
  }, [stopLocalStream, closeAllPeerConnections]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading collaborative session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Session Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const remoteEntries = Object.entries(remoteStreams);

  return (
    <div className="relative w-full h-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(6,182,212,0.2),transparent_32%),radial-gradient(circle_at_82%_14%,rgba(16,185,129,0.18),transparent_36%),radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.16),transparent_38%)]" />

      <div className="relative z-10 border-b border-white/10 bg-slate-900/65 p-2 md:p-4 shadow-lg backdrop-blur-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className="min-w-0">
            <h1 className="font-semibold text-slate-100 text-sm md:text-base truncate">{session.sessionName || session.documentName}</h1>
            <p className="text-xs text-cyan-200/80">Collaborative Study Session</p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-2 rounded-lg border border-cyan-300/30 bg-cyan-400/10 flex-shrink-0">
            <Users size={14} className="text-cyan-200 md:w-4 md:h-4" />
            <span className="text-xs md:text-sm font-medium text-cyan-100">{activeUsers.length}</span>
            <span className="text-[10px] md:text-xs text-cyan-100/90 animate-pulse hidden sm:inline">active</span>
          </div>

          <div className="hidden md:flex items-center gap-2 max-w-xs overflow-x-auto">
            {activeUsers.slice(0, 3).map((u) => (
              <span
                key={`${u.socketId || u.userId}-${u.username}`}
                className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-xs text-slate-100 whitespace-nowrap"
                title={u.username}
              >
                {u.username}
              </span>
            ))}
            {activeUsers.length > 3 && (
              <span className="text-xs text-slate-300">+{activeUsers.length - 3}</span>
            )}
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-2 rounded-lg border border-emerald-300/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20 transition text-xs md:text-sm flex-shrink-0"
            title="Invite people to session"
          >
            <Share2 size={14} className="md:w-4 md:h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={handleClickUploadPdf}
            disabled={isUploadingPdf}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-2 rounded-lg border border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 transition text-xs md:text-sm disabled:opacity-60 flex-shrink-0"
            title="Upload/replace PDF for this session"
          >
            <Upload size={14} className="md:w-4 md:h-4" />
            <span className="hidden sm:inline">{isUploadingPdf ? "Uploading..." : "PDF"}</span>
          </button>

          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handlePdfFileChange}
          />

          <button
            onClick={handleToggleAV}
            className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-2 rounded-lg transition text-xs md:text-sm flex-shrink-0 ${
              isMediaOn ? "border border-amber-300/30 bg-amber-400/15 text-amber-100" : "border border-white/20 bg-white/10 text-slate-100 hover:bg-white/20"
            }`}
            title="Join/leave live audio and video"
          >
            <span className="hidden sm:inline">{isMediaOn ? "Leave" : "Join"} AV</span>
            <span className="sm:hidden text-xs">{isMediaOn ? "✓" : "○"}</span>
          </button>

          <button
            onClick={() => setMicOn((v) => !v)}
            disabled={!isMediaOn}
            className="p-1.5 md:p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-40 flex-shrink-0"
            title="Toggle microphone"
          >
            {micOn ? <Mic size={14} className="md:w-4 md:h-4" /> : <MicOff size={14} className="md:w-4 md:h-4" />}
          </button>

          <button
            onClick={() => setCamOn((v) => !v)}
            disabled={!isMediaOn}
            className="p-1.5 md:p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-40 flex-shrink-0"
            title="Toggle camera"
          >
            {camOn ? <Camera size={14} className="md:w-4 md:h-4" /> : <CameraOff size={14} className="md:w-4 md:h-4" />}
          </button>

          <button
            onClick={handleDownloadNotes}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-2 rounded-lg border border-indigo-300/30 bg-indigo-400/10 text-indigo-100 hover:bg-indigo-400/20 transition text-xs md:text-sm flex-shrink-0"
            title="Download session notes"
          >
            <Download size={14} className="md:w-4 md:h-4" />
            <span className="hidden sm:inline">Notes</span>
          </button>

          {!showLeftSidebar && (
            <button
              onClick={() => setShowLeftSidebar(true)}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-2 rounded-lg border border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 transition text-xs md:text-sm flex-shrink-0"
              title="Show live participants"
            >
              <Users size={14} className="md:w-4 md:h-4" />
              <span className="hidden md:inline">Participants</span>
            </button>
          )}

          {!showRightSidebar && (
            <button
              onClick={() => setShowRightSidebar(true)}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-2 rounded-lg border border-emerald-300/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20 transition text-xs md:text-sm flex-shrink-0"
              title="Show highlights & notes"
            >
              <Highlighter size={14} className="md:w-4 md:h-4" />
              <span className="hidden md:inline">Highlights</span>
            </button>
          )}

          <button
            onClick={handleExitSession}
            className="p-1.5 md:p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition text-slate-200 hover:text-white flex-shrink-0"
            title="Exit session"
          >
            <X size={18} className="md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 overflow-hidden gap-2 md:gap-4 p-2 md:p-4 flex-col lg:flex-row">
        {joinNotice && (
          <div className="absolute top-20 right-3 md:right-6 z-40 rounded-lg border border-emerald-300/30 bg-emerald-500/90 px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white shadow-lg max-w-xs md:max-w-none">
            {joinNotice}
          </div>
        )}

        {pdfUpdateNotice && (
          <div className="absolute top-20 left-3 md:left-6 z-40 rounded-lg border border-cyan-300/30 bg-cyan-500/90 px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white shadow-lg max-w-xs md:max-w-none">
            {pdfUpdateNotice}
          </div>
        )}

        <aside className={`w-full lg:w-72 shrink-0 rounded-2xl border border-white/15 bg-slate-900/70 p-3 shadow-2xl backdrop-blur-xl flex flex-col max-h-48 lg:max-h-none order-2 lg:order-1 transition-all duration-300 ${
          showLeftSidebar ? "opacity-100 visible" : "opacity-0 invisible w-0 p-0"
        }`}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Live Members</p>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-100">
                {remoteEntries.length + (isMediaOn ? 1 : 0)} live
              </span>
              <button
                onClick={() => setShowLeftSidebar(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Close participants"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isMediaOn && (
              <div className="overflow-hidden rounded-xl border border-white/20 bg-black shadow-lg relative">
                <div className="px-3 py-2 text-xs font-semibold text-white bg-slate-900/80 flex items-center justify-between">
                  <span>You</span>
                  <span className="text-[10px] text-slate-200">{micOn ? "Mic On" : "Mic Off"} - {camOn ? "Cam On" : "Cam Off"}</span>
                </div>

                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={camOn ? "h-36 w-full object-cover bg-black" : "absolute h-px w-px opacity-0 pointer-events-none -z-10"}
                />

                {!camOn && (
                  <div className="h-36 w-full bg-slate-900 text-slate-200 flex items-center justify-center text-sm font-medium">
                    Your camera is off
                  </div>
                )}
              </div>
            )}

            {remoteEntries.map(([socketId, stream]) => {
              const participant = mediaStates[socketId] || activeUsers.find((u) => u.socketId === socketId) || {};
              return (
                <RemoteMediaTile
                  key={socketId}
                  stream={stream}
                  username={participant.username}
                  camOn={participant.camOn}
                  micOn={participant.micOn}
                />
              );
            })}

            {!isMediaOn && remoteEntries.length === 0 && (
              <div className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-slate-200">
                No one is live yet. Click "Join AV" to appear here.
              </div>
            )}
          </div>

          <div className="mt-3 border-t border-white/15 pt-3 text-[11px] text-slate-200 leading-relaxed">
            Session members: {activeUsers.map((u) => u.username).filter(Boolean).join(", ") || "No active members"}
          </div>
        </aside>

        {mediaError && (
          <div className="absolute top-32 right-6 z-40 rounded-lg border border-rose-300/30 bg-rose-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg">
            {mediaError}
          </div>
        )}

        <div className="flex-1 rounded-2xl border border-white/15 bg-white/95 shadow-2xl overflow-hidden relative order-1 lg:order-2 min-h-96">
          <PDFViewer
            documentUrl={session.documentUrl}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            numPages={numPages}
            onLoadSuccess={handlePDFLoadSuccess}
          />

          <HighlightLayer
            highlights={highlights}
            onHighlight={handleHighlight}
            onSelectionAction={handleSelectionAction}
            currentPage={currentPage}
            sessionId={sessionId}
            username={resolveUsername(currentUser || user, guestName)}
          />

          <RemoteCursorLayer remoteCursors={remoteCursors} />
        </div>

        <div className={`w-full lg:w-96 flex flex-col gap-3 md:gap-4 overflow-hidden order-3 md:order-3 max-h-64 md:max-h-none transition-all duration-300 ${
          showRightSidebar ? "opacity-100 visible" : "opacity-0 invisible w-0 gap-0"
        }`}>
          <div className="rounded-2xl border border-white/15 bg-white/95 shadow-2xl p-3 md:p-4 overflow-y-auto shrink-0 max-h-32 md:max-h-1/3">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <h3 className="font-semibold text-slate-900 text-sm md:text-base">Highlights ({highlights.length})</h3>
              <button
                onClick={() => setShowRightSidebar(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                title="Close highlights panel"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-1 md:space-y-2 text-xs md:text-sm max-h-24 md:max-h-40 overflow-y-auto">
              {highlights.slice(0, 5).map((h, idx) => (
                <button
                  key={h._id || idx}
                  onClick={() => {
                    setSelectedHighlight(h);
                    setCurrentPage(h.page);
                  }}
                  style={{ borderLeftColor: h.color }}
                  className="w-full text-left p-1.5 md:p-2 bg-slate-100/80 hover:bg-cyan-50 rounded border-l-4 transition cursor-pointer"
                >
                  <p className="text-xs font-medium text-slate-600 truncate">{h.username}</p>
                  <p className="text-slate-700 text-xs line-clamp-2">{prettifySnippet(h.text, 56)}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedHighlight ? (
            <CommentsPanel
              highlight={selectedHighlight}
              comments={comments}
              onAddComment={handleAddComment}
              onClose={() => setSelectedHighlight(null)}
              username={resolveUsername(currentUser || user, guestName)}
              userId={resolveSessionUserId(currentUser || user)}
            />
          ) : (
            <div className="flex-1 rounded-2xl border border-white/15 bg-white/95 shadow-2xl overflow-hidden flex flex-col">
              <NotesPanel
                notes={notes}
                onNotesChange={handleNotesChange}
                username={resolveUsername(currentUser || user, guestName)}
              />
            </div>
          )}
        </div>
      </div>

      {showGuestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">Join Study Session</h2>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">Please enter your name to join this collaborative session</p>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && guestName.trim()) {
                  handleGuestJoin();
                }
              }}
              placeholder="Enter your name"
              className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 caret-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 md:mb-6 text-sm md:text-base"
              autoFocus
            />
            <button
              onClick={handleGuestJoin}
              disabled={!guestName.trim()}
              className="w-full bg-blue-600 text-white py-2 md:py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 font-semibold text-sm md:text-base"
            >
              Join Session
            </button>
          </div>
        </div>
      )}

      {selectionAction && (
        <div className="fixed bottom-4 md:bottom-6 right-4 md:right-6 left-4 md:left-auto z-50 w-auto md:w-80 rounded-2xl border border-slate-200 bg-white p-3 md:p-4 shadow-2xl max-h-96 overflow-auto">
          <p className="text-xs font-semibold text-slate-500">Selected Text</p>
          <p className="mt-1 text-xs md:text-sm text-slate-800 line-clamp-3">{selectionAction.text}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                handleHighlight(selectionAction);
                setSelectionAction(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-100 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium text-yellow-800 hover:bg-yellow-200 whitespace-nowrap"
            >
              <Highlighter size={14} /> <span className="hidden md:inline">Highlight</span>
            </button>
            <button
              onClick={handleAskAiForSelection}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-100 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium text-violet-800 hover:bg-violet-200 whitespace-nowrap"
            >
              <Sparkles size={14} /> <span className="hidden sm:inline">{aiLoading ? "Thinking..." : "Ask AI"}</span><span className="sm:hidden">{aiLoading ? "..." : "AI"}</span>
            </button>
            <button
              onClick={() => {
                setSelectionAction(null);
                setAiResult("");
              }}
              className="ml-auto text-xs text-slate-500 underline hover:text-slate-700"
            >
              Close
            </button>
          </div>

          {aiResult && (
            <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-2 md:p-3 text-xs md:text-sm text-violet-900 whitespace-pre-wrap max-h-40 overflow-auto">
              {aiResult}
            </div>
          )}
        </div>
      )}

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        sessionId={sessionId}
        sessionName={session.sessionName || session.documentName}
        documentName={session.documentName}
      />
    </div>
  );
}

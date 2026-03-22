import { useState, useEffect } from "react";
import { X, Users, Copy, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosinstance";
import documentService from "../../services/documentationService";

/**
 * CreateSessionModal Component
 * Modal to create a new study session and get shareable link
 * Props:
 *   - isOpen: boolean to show/hide modal
 *   - onClose: callback to close modal
 */
export default function CreateSessionModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [sessionName, setSessionName] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createdSession, setCreatedSession] = useState(null);
  const [docLoading, setDocLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load documents on mount
  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      // Reset form when opening
      setSessionName("");
      setSelectedDocument("");
      setCreatedSession(null);
      setCopied(false);
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    try {
      setDocLoading(true);
      const docs = await documentService.getDocuments();
      setDocuments(Array.isArray(docs) ? docs : []);
      if (docs.length > 0) {
        setSelectedDocument(docs[0]._id);
      }
    } catch (err) {
      toast.error("Failed to load documents");
    } finally {
      setDocLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();

    if (!sessionName.trim()) {
      toast.error("Please enter a session name");
      return;
    }

    if (!selectedDocument) {
      toast.error("Please select a document");
      return;
    }

    try {
      setLoading(true);

      // Find selected document details
      const selectedDoc = documents.find((d) => d._id === selectedDocument);
      if (!selectedDoc) {
        toast.error("Selected document not found");
        return;
      }

      // Create session via API
      const apiBase = import.meta.env.VITE_API_BASE || "http://ai-learning-platform-c2jg.onrender.com";
      const normalizedDocUrl = selectedDoc.filePath?.startsWith("http")
        ? selectedDoc.filePath
        : `${apiBase}/uploads/documents/${selectedDoc.fileName || selectedDoc._id}`;

      const response = await axiosInstance.post("/api/sessions", {
        sessionName: sessionName.trim(),
        documentId: selectedDocument,
        documentUrl: normalizedDocUrl,
        documentName: selectedDoc.title,
      });

      // Extract session data from response
      const sessionData = response.data.data || response.data;
      const resolvedSessionName = (sessionData?.sessionName || sessionName || "").trim();

      // Frontend-only cache to preserve entered session name in UI when later payloads omit it.
      try {
        if (sessionData?.sessionId && resolvedSessionName) {
          localStorage.setItem(`session-name:${sessionData.sessionId}`, resolvedSessionName);
        }
      } catch {
        // Ignore storage failures.
      }

      setCreatedSession({
        sessionId: sessionData.sessionId,
        sessionName: resolvedSessionName,
        documentName: selectedDoc.title,
      });
      toast.success("Study session created!");
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdSession) return;

    const shareLink = `${window.location.origin}/session/${createdSession.sessionId}`;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");

    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinSession = () => {
    if (createdSession) {
      navigate(`/session/${createdSession.sessionId}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 p-8 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={24} />
        </button>

        {!createdSession ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 grid place-items-center">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Create Study Session</h2>
                <p className="text-slate-500 mt-1">Invite others to study together in real-time</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSession} className="space-y-6">
              {/* Session Name Input */}
              <div>
                <label htmlFor="sessionName" className="block text-sm font-semibold text-slate-700 mb-2">
                  Session Name
                </label>
                <input
                  id="sessionName"
                  type="text"
                  placeholder="e.g., Biology Chapter 5 Study Group"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-100"
                />
              </div>

              {/* Document Selection */}
              <div>
                <label htmlFor="document" className="block text-sm font-semibold text-slate-700 mb-2">
                  Select Document
                </label>
                {docLoading ? (
                  <div className="px-4 py-3 rounded-xl border border-slate-300 flex items-center gap-2 text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    Loading documents...
                  </div>
                ) : documents.length === 0 ? (
                  <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700">
                    No documents available. Please upload a document first.
                  </div>
                ) : (
                  <select
                    id="document"
                    value={selectedDocument}
                    onChange={(e) => setSelectedDocument(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-100"
                  >
                    {documents.map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Tip:</strong> You'll get a shareable link to invite others to this study session. They can highlight text, make comments, and share notes in real-time.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || documents.length === 0}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:bg-slate-300 flex items-center gap-2"
                >
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  {loading ? "Creating..." : "Create Session"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="text-center">
              {/* Success Icon */}
              <div className="h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center mx-auto mb-6">
                <Check size={40} />
              </div>

              <h2 className="text-3xl font-bold text-slate-900 mb-2">Session Created!</h2>
              <p className="text-slate-500 text-lg mb-8">Share this link with others to start studying together</p>

              {/* Share Link Box */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 mb-8">
                <p className="text-sm text-slate-500 mb-3">Session Link</p>
                <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-300 p-4">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/session/${createdSession.sessionId}`}
                    className="flex-1 outline-none text-slate-700 font-mono text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600 hover:text-slate-900"
                  >
                    {copied ? <Check size={20} className="text-emerald-600" /> : <Copy size={20} />}
                  </button>
                </div>
              </div>

              {/* Session Details */}
              <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                  <p className="text-xs text-blue-600 uppercase font-semibold mb-2">Session Name</p>
                  <p className="text-lg font-bold text-blue-900">{createdSession.sessionName}</p>
                </div>
                <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
                  <p className="text-xs text-purple-600 uppercase font-semibold mb-2">Document</p>
                  <p className="text-lg font-bold text-purple-900 line-clamp-2">{createdSession.documentName}</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button
                  onClick={handleJoinSession}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <Users size={18} />
                  Join Session
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

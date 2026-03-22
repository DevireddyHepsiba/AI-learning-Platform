import { useState } from "react";
import { X, Send, AlertCircle, CheckCircle } from "lucide-react";
import notificationService from "../../services/notificationService";

export default function InviteModal({ isOpen, onClose, sessionId, sessionName, documentName }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // "success" or "error"
  const [message, setMessage] = useState("");

  const handleSendInvite = async () => {
    if (!email.trim()) {
      setStatus("error");
      setMessage("Please enter an email address");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await notificationService.sendSessionInvite(
        sessionId,
        sessionName,
        documentName,
        email
      );

      setStatus("success");
      setMessage(`Invitation sent to ${email}!`);
      setEmail("");

      // Auto-close after 2 seconds
      setTimeout(() => {
        setEmail("");
        setStatus(null);
        setMessage("");
        onClose();
      }, 2000);
    } catch (error) {
      setStatus("error");
      setMessage(error.response?.data?.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Invite to Study Session</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Session Info */}
        <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
          <p className="text-gray-600">
            <span className="font-semibold">Session:</span> {sessionName}
          </p>
          <p className="text-gray-600">
            <span className="font-semibold">Document:</span> {documentName}
          </p>
        </div>

        {/* Email Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendInvite()}
            placeholder="friend@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 caret-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        {/* Status Messages */}
        {status === "success" && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded mb-4">
            <CheckCircle size={20} />
            <span>{message}</span>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded mb-4">
            <AlertCircle size={20} />
            <span>{message}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSendInvite}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2 disabled:bg-gray-400"
          >
            <Send size={18} />
            {loading ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

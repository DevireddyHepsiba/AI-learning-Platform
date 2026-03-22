import { useState } from "react";
import { formatTime } from "../../utils/sessionHelpers";
import { MessageCircle, X } from "lucide-react";

const toId = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (value._id) return toId(value._id);
    if (value.id) return toId(value.id);
  }
  return String(value);
};

/**
 * CommentsPanel Component
 * Displays comments for a specific highlight with ability to add new comments
 * Props:
 *   - highlight: The highlight object
 *   - comments: Comments array for this highlight
 *   - onAddComment: Callback to add a new comment
 *   - onClose: Callback to close the panel
 *   - username: Current user's username
 *   - userId: Current user's ID
 */
export default function CommentsPanel({
  highlight,
  comments = [],
  onAddComment,
  onClose,
  username,
  userId,
}) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const highlightComments = comments.filter((c) => toId(c.highlightId) === toId(highlight?._id));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newComment.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onAddComment({
        highlightId: highlight._id,
        text: newComment,
        username,
        userId,
      });

      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl flex flex-col border-l border-gray-200 z-50 animate-in slide-in-from-right">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-linear-to-r from-blue-50 to-blue-100">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">Personal Understanding on Highlight</h3>
          <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            {highlightComments.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Highlight Preview */}
      <div className="p-4 bg-slate-50 border-b border-gray-200">
        <p className="text-xs text-gray-500 mb-2">Highlighted text</p>
        <blockquote className="rounded-md border-l-4 border-blue-400 bg-white px-3 py-2 text-sm text-gray-800 leading-relaxed">
          {highlight.text}
        </blockquote>
        <p className="text-xs text-gray-500 mt-2">Highlighted by {highlight.username}</p>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {highlightComments.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            <MessageCircle size={32} className="mx-auto mb-2 opacity-20" />
            <p>No personal understanding yet</p>
            <p className="text-xs">Be the first to add your understanding!</p>
          </div>
        ) : (
          highlightComments.map((comment, idx) => (
            <div
              key={comment._id || idx}
              className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-gray-900">
                  {comment.username}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTime(comment.createdAt)}
                </span>
              </div>
              <p className="text-sm text-gray-700 wrap-break-word">{comment.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 p-4 border-t border-gray-200 bg-gray-50"
      >
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Write your personal understanding..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 caret-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition"
          >
            {isSubmitting ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

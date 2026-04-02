import { useEffect, useState } from "react";
import { debounce } from "../../utils/sessionHelpers";
import { FileText, Copy, Check } from "lucide-react";

/**
 * NotesPanel Component
 * Shared collaborative notes editor for the session
 * Props:
 *   - notes: Current notes content
 *   - onNotesChange: Callback when notes change (debounced)
 *   - username: Current user's username
 *   - isLoading: Loading state
 */
export default function NotesPanel({
  notes = "",
  onNotesChange,
  username,
  isLoading = false,
}) {
  const [content, setContent] = useState(notes);
  const [copied, setCopied] = useState(false);

  // Debounced update - wait 300ms after user stops typing before emitting
  const debouncedUpdate = debounce((text) => {
    onNotesChange?.(text);
  }, 300);

  const handleChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    debouncedUpdate(newContent);
  };

  // Update content when notes come from server
  useEffect(() => {
    setContent(notes);
  }, [notes]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-green-100">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={18} className="text-green-600 shrink-0" />
          <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">Shared Notes</h3>
        </div>
        <button
          onClick={handleCopy}
          title="Copy to clipboard"
          className="p-2 hover:bg-green-200 rounded-lg transition text-green-600 shrink-0"
        >
          {copied ? (
            <Check size={18} className="text-green-600" />
          ) : (
            <Copy size={18} />
          )}
        </button>
      </div>

      {/* User indicator */}
      <div className="px-3 md:px-4 py-2 text-xs text-gray-600 bg-gray-50 border-b border-gray-200">
        You are editing as <span className="font-semibold truncate">{username}</span>
      </div>

      {/* Notes Editor */}
      <textarea
        value={content}
        onChange={handleChange}
        disabled={isLoading}
        placeholder="📝 Type your notes here... All edits are shared in real-time with others in this session."
        className="flex-1 p-3 md:p-4 text-xs md:text-sm text-gray-900 placeholder:text-gray-500 caret-gray-900 resize-none border-0 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset disabled:bg-gray-100"
      />

      {/* Footer */}
      <div className="px-3 md:px-4 py-3 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
        {isLoading ? (
          <span>⏳ Syncing...</span>
        ) : (
          <span>✓ All changes are auto-saved</span>
        )}
      </div>
    </div>
  );
}

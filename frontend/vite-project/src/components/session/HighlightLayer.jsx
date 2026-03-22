import { useEffect, useRef, useState } from "react";
import { getUserColor, getSelectedText, getSelectionPosition, clearSelection } from "../../utils/sessionHelpers";

/**
 * HighlightLayer Component
 * Renders highlights on top of PDF and handles text selection for highlighting
 * Props:
 *   - highlights: Array of highlight objects
 *   - onHighlight: Callback when user creates a highlight
 *   - currentPage: Current page number
 *   - sessionId: Current session ID
 *   - username: Current user's username
 */
export default function HighlightLayer({
  highlights = [],
  onHighlight,
  onSelectionAction,
  currentPage,
  sessionId,
  username,
}) {
  const containerRef = useRef(null);
  const [scrollOffset, setScrollOffset] = useState({ left: 0, top: 0 });

  const getHighlightStyle = (highlight) => {
    const position = highlight.position || {};

    // New format: text-layer relative percentages for robust positioning.
    if (
      Number.isFinite(position.xPct) &&
      Number.isFinite(position.yPct) &&
      Number.isFinite(position.widthPct) &&
      Number.isFinite(position.heightPct)
    ) {
      const overlayRect = containerRef.current?.getBoundingClientRect();
      const textLayer = document.querySelector(".react-pdf__Page__textContent");
      const textLayerRect = textLayer?.getBoundingClientRect();

      if (overlayRect && textLayerRect) {
        return {
          left: (textLayerRect.left - overlayRect.left) + position.xPct * textLayerRect.width,
          top: (textLayerRect.top - overlayRect.top) + position.yPct * textLayerRect.height,
          width: Math.max(1, position.widthPct * textLayerRect.width),
          height: Math.max(1, position.heightPct * textLayerRect.height),
          backgroundColor: highlight.color || "#FFFF00",
          opacity: 0.3,
          border: `1px solid ${highlight.color || "#FFFF00"}`,
          pointerEvents: "none",
        };
      }
    }

    // Legacy format fallback: container-content coordinates.
    return {
      left: (position.x || 0) - scrollOffset.left,
      top: (position.y || 0) - scrollOffset.top,
      width: position.width || 100,
      height: position.height || 20,
      backgroundColor: highlight.color || "#FFFF00",
      opacity: 0.3,
      border: `1px solid ${highlight.color || "#FFFF00"}`,
      pointerEvents: "none",
    };
  };

  // Filter highlights for current page
  const pageHighlights = highlights.filter(h => h.page === currentPage);

  useEffect(() => {
    const handleMouseUp = () => {
      const selectedText = getSelectedText().trim();

      if (!selectedText || selectedText.length < 3) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return;
      }

      // Only allow highlight when selection comes from PDF text layer.
      const range = selection.getRangeAt(0);
      const textLayer = range.commonAncestorContainer.parentElement?.closest(
        ".react-pdf__Page__textContent"
      );
      if (!textLayer) {
        return;
      }

      const position = getSelectionPosition();
      if (!position) {
        return;
      }

      if (onSelectionAction) {
        onSelectionAction({
          sessionId,
          text: selectedText,
          page: currentPage,
          position,
          color: getUserColor(username),
          username,
        });
        return;
      }

      if (position && window.confirm("Highlight this text?")) {
        const color = getUserColor(username);

        onHighlight({
          sessionId,
          text: selectedText,
          page: currentPage,
          position,
          color,
          username,
        });

        clearSelection();
      }
    };

    // Listen globally; filter by selection source above.
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [currentPage, sessionId, username, onHighlight, onSelectionAction]);

  useEffect(() => {
    const scroller = document.querySelector(".pdf-scroll-container");
    if (!scroller) return;

    const updateOffset = () => {
      setScrollOffset({
        left: scroller.scrollLeft || 0,
        top: scroller.scrollTop || 0,
      });
    };

    updateOffset();
    scroller.addEventListener("scroll", updateOffset, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", updateOffset);
    };
  }, [currentPage]);

  return (
    <div
      ref={containerRef}
      className="session-highlight-overlay absolute inset-0 pointer-events-none"
      style={{
        zIndex: 5,
      }}
    >
      {/* Render highlight overlays */}
      {pageHighlights.map((highlight, idx) => (
        <div
          key={highlight._id || idx}
          className="absolute"
          title={`${highlight.username}: ${highlight.text}`}
          style={getHighlightStyle(highlight)}
        />
      ))}

      {/* Helper text */}
      <div className="absolute bottom-4 left-4 bg-blue-50 text-blue-700 text-xs px-3 py-2 rounded pointer-events-none">
        👆 Select text to highlight
      </div>
    </div>
  );
}

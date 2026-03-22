/**
 * Generate a consistent color for a user based on their username
 */
export const getUserColor = (username) => {
  // Predefined list of nice highlight colors
  const colors = [
    "#FFFF00", // Yellow
    "#FF6B6B", // Red
    "#4ECDC4", // Teal
    "#45B7D1", // Blue
    "#FFA07A", // Salmon
    "#98D8C8", // Mint
    "#F7DC6F", // Gold
    "#BB8FCE", // Purple
    "#85C1E2", // Sky Blue
    "#F8B88B", // Peach
  ];

  // Simple hash function to convert username to color index
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash << 5) - hash + username.charCodeAt(i);
  }

  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

/**
 * Debounce function - delays execution until called stops
 * Used for debouncing notes updates to avoid too many socket emissions
 */
export const debounce = (func, delay) => {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

/**
 * Throttle function - ensures function runs at most once per interval
 */
export const throttle = (func, limit) => {
  let lastFunc;
  let lastRan;

  return (...args) => {
    if (!lastRan) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

/**
 * Generate unique ID for highlights
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format timestamp to readable date
 */
export const formatTime = (date) => {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(d);
};

/**
 * Prettify long snippets to avoid abrupt mid-word cuts.
 */
export const prettifySnippet = (text = "", maxLength = 70) => {
  const cleaned = String(text).replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const sliced = cleaned.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace > 0) {
    return `${sliced.slice(0, lastSpace)}...`;
  }

  return `${sliced}...`;
};

/**
 * Extract text from PDF selection
 */
export const getSelectedText = () => {
  return window.getSelection().toString();
};

/**
 * Get screen position of selection
 */
export const getSelectionPosition = () => {
  const selection = window.getSelection();
  if (selection.toString().length === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (!rect || rect.width === 0 || rect.height === 0) {
    return null;
  }

  const textLayer = range.commonAncestorContainer.parentElement?.closest(
    ".react-pdf__Page__textContent"
  );

  // Prefer text-layer relative percentages so highlight position remains stable
  // even when the PDF text layer shifts due to scrolling or layout changes.
  if (textLayer) {
    const textLayerRect = textLayer.getBoundingClientRect();
    const safeWidth = Math.max(1, textLayerRect.width);
    const safeHeight = Math.max(1, textLayerRect.height);

    return {
      xPct: Math.max(0, Math.min(1, (rect.left - textLayerRect.left) / safeWidth)),
      yPct: Math.max(0, Math.min(1, (rect.top - textLayerRect.top) / safeHeight)),
      widthPct: Math.max(0, Math.min(1, rect.width / safeWidth)),
      heightPct: Math.max(0, Math.min(1, rect.height / safeHeight)),
      width: rect.width,
      height: rect.height,
    };
  }

  // Prefer container-relative coordinates for stable overlay placement.
  const container = document.querySelector(".session-highlight-overlay");
  const scrollContainer = document.querySelector(".pdf-scroll-container");
  if (container) {
    const containerRect = container.getBoundingClientRect();

    const scrollLeft = scrollContainer?.scrollLeft || 0;
    const scrollTop = scrollContainer?.scrollTop || 0;

    return {
      // Store content-relative coordinates so highlights remain tied to text across scroll.
      x: Math.max(0, rect.left - containerRect.left + scrollLeft),
      y: Math.max(0, rect.top - containerRect.top + scrollTop),
      width: rect.width,
      height: rect.height,
    };
  }

  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
};

/**
 * Clear selection after highlighting
 */
export const clearSelection = () => {
  window.getSelection().removeAllRanges();
};

import { useMemo } from "react";

const CURSOR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#F7DC6F", "#BB8FCE", "#85C1E9", "#F8B88B", "#ABEBC6"
];

function RemoteCursor({ userId, username, x, y, color }) {
  return (
    <div
      className="fixed pointer-events-none z-50 transition-all duration-75"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: `drop-shadow(0 0 2px ${color})` }}
      >
        <path
          d="M0 0L7 10.5L10.5 9L18 24H24V18L9 10.5L10.5 7L0 0Z"
          fill={color}
        />
      </svg>

      {/* Username label */}
      <div
        className="absolute top-6 left-2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap border pointer-events-none shadow-md"
        style={{ borderColor: color }}
      >
        {username || "Guest"}
      </div>
    </div>
  );
}

export default function RemoteCursorLayer({ remoteCursors = {} }) {
  const cursorElements = useMemo(() => {
    return Object.entries(remoteCursors).map(([socketId, cursor]) => (
      <RemoteCursor
        key={socketId}
        userId={cursor.userId}
        username={cursor.username}
        x={cursor.x}
        y={cursor.y}
        color={cursor.color}
      />
    ));
  }, [remoteCursors]);

  return <>{cursorElements}</>;
}

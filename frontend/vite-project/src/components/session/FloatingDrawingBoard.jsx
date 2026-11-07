import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Pen, Eraser, RotateCcw, Download, GripHorizontal } from "lucide-react";
import { getSocket } from "../../utils/socketClient";
import toast from "react-hot-toast";

const FloatingDrawingBoard = ({ sessionId, userId, isOpen, onClose }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const containerRef = useRef(null);
  const dragRef = useRef({ isDragging: false, x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const resizeRef = useRef({ isResizing: false, startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [position, setPosition] = useState({ x: 50, y: 100 });
  const [size, setSize] = useState({ width: 600, height: 400 });
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const lastPointRef = useRef(null);

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  // Broadcast drawing board state to all users
  useEffect(() => {
    const currentSocket = getSocket();
    
    console.log("=== [Drawing Board] State Change ===");
    console.log("isOpen:", isOpen);
    console.log("sessionId:", sessionId);
    console.log("userId:", userId);
    console.log("Socket connected:", currentSocket?.connected);
    console.log("Socket id:", currentSocket?.id);
    
    if (!currentSocket) {
      console.warn("[Drawing] ❌ NO SOCKET - Socket is null or undefined");
      return;
    }

    if (!sessionId || !userId) {
      console.warn("[Drawing] ❌ MISSING IDS", { sessionId, userId });
      return;
    }

    if (!currentSocket.connected) {
      console.warn("[Drawing] ❌ SOCKET NOT CONNECTED");
      return;
    }

    // Broadcast when drawing board opens or closes
    if (isOpen) {
      console.log("[Drawing] ✅ EMITTING: drawing-board-open", { sessionId, userId });
      currentSocket.emit("drawing-board-open", { sessionId, userId });
      console.log("[Drawing] ✅ EMITTED: drawing-board-open successfully");
    } else {
      console.log("[Drawing] ✅ EMITTING: drawing-board-close", { sessionId, userId });
      currentSocket.emit("drawing-board-close", { sessionId, userId });
      console.log("[Drawing] ✅ EMITTED: drawing-board-close successfully");
    }
  }, [isOpen, sessionId, userId]);

  // Handle remote drawing
  const handleRemoteDrawing = useCallback((data) => {
    const context = contextRef.current;
    if (!context) return;

    const { fromX, fromY, toX, toY, tool: remoteTool, color: remoteColor, brushSize: remoteBrushSize } = data;

    if (remoteTool === "eraser") {
      context.clearRect(fromX - remoteBrushSize / 2, fromY - remoteBrushSize / 2, remoteBrushSize, remoteBrushSize);
      context.clearRect(toX - remoteBrushSize / 2, toY - remoteBrushSize / 2, remoteBrushSize, remoteBrushSize);
    } else {
      context.strokeStyle = remoteColor;
      context.lineWidth = remoteBrushSize;
      context.beginPath();
      context.moveTo(fromX, fromY);
      context.lineTo(toX, toY);
      context.stroke();
    }
  }, []);

  // Handle remote clear
  const handleRemoteClear = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!context || !canvas) return;
    
    context.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Handle remote undo
  const handleRemoteUndo = useCallback((newIndex) => {
    const context = contextRef.current;
    const canvas = canvasRef.current;
    
    if (context && canvas && drawingHistory[newIndex]) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.putImageData(drawingHistory[newIndex], 0, 0);
      setHistoryIndex(newIndex);
    }
  }, [drawingHistory]);

  // Setup socket listeners for drawing events
  useEffect(() => {
    if (!isOpen) return;

    const currentSocket = getSocket();
    if (!currentSocket) return;

    console.log("[Drawing] Setting up socket listeners for canvas events");

    currentSocket.on("drawing-update", handleRemoteDrawing);
    currentSocket.on("drawing-clear", handleRemoteClear);
    currentSocket.on("drawing-undo", handleRemoteUndo);

    return () => {
      currentSocket.off("drawing-update", handleRemoteDrawing);
      currentSocket.off("drawing-clear", handleRemoteClear);
      currentSocket.off("drawing-undo", handleRemoteUndo);
    };
  }, [isOpen, handleRemoteDrawing, handleRemoteClear, handleRemoteUndo]);

  // Initialize canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = Math.max(1, canvas.clientWidth);
    canvas.height = Math.max(1, canvas.clientHeight);

    const context = canvas.getContext("2d");
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = brushSize;
    context.strokeStyle = color;
    contextRef.current = context;

    // Restore canvas from history if exists
    if (drawingHistory.length > 0 && historyIndex >= 0) {
      const imageData = drawingHistory[historyIndex];
      context.putImageData(imageData, 0, 0);
    }

    console.log("[Drawing] Canvas initialized", { width: canvas.width, height: canvas.height });
  }, [isOpen, size, viewport]);

  // Draw local line
  const drawLocalLine = useCallback((fromX, fromY, toX, toY) => {
    const context = contextRef.current;

    if (!context) {
      console.warn("[Drawing] Context not available for drawing");
      return;
    }

    if (tool === "eraser") {
      context.clearRect(fromX - brushSize / 2, fromY - brushSize / 2, brushSize, brushSize);
      context.clearRect(toX - brushSize / 2, toY - brushSize / 2, brushSize, brushSize);
    } else {
      context.strokeStyle = color;
      context.lineWidth = brushSize;
      context.beginPath();
      context.moveTo(fromX, fromY);
      context.lineTo(toX, toY);
      context.stroke();
    }

    // Broadcast to other users
    const currentSocket = getSocket();
    if (currentSocket && currentSocket.connected) {
      currentSocket.emit("drawing-stroke", {
        sessionId,
        userId,
        fromX,
        fromY,
        toX,
        toY,
        tool,
        color,
        brushSize,
      });
    }
  }, [tool, color, brushSize, sessionId, userId]);

  // Save state to history
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    
    if (!canvas || !context) return;
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = drawingHistory.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    
    setDrawingHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [drawingHistory, historyIndex]);

  // Pointer events support drawing with a mouse, pen, or touchscreen.
  const handlePointerDown = (e) => {
    if (!canvasRef.current || e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    lastPointRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDrawing(true);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const previous = lastPointRef.current || { x: offsetX, y: offsetY };
    drawLocalLine(previous.x, previous.y, offsetX, offsetY);
    lastPointRef.current = { x: offsetX, y: offsetY };
  };

  const handlePointerUp = useCallback(() => {
    if (isDrawing) {
      saveToHistory();
    }
    lastPointRef.current = null;
    setIsDrawing(false);
  }, [isDrawing, saveToHistory]);

  // Handle drag start
  const handleDragStart = (e) => {
    if (e.button !== 0) return; // Left mouse button only
    
    dragRef.current = {
      isDragging: true,
      x: e.clientX,
      y: e.clientY,
      offsetX: position.x,
      offsetY: position.y,
    };

    document.addEventListener("pointermove", handleDragMove);
    document.addEventListener("pointerup", handleDragEnd);
  };

  const handleDragMove = (e) => {
    if (!dragRef.current.isDragging) return;

    const deltaX = e.clientX - dragRef.current.x;
    const deltaY = e.clientY - dragRef.current.y;

    setPosition({
      x: Math.max(8, Math.min(viewport.width - 90, dragRef.current.offsetX + deltaX)),
      y: Math.max(8, Math.min(viewport.height - 90, dragRef.current.offsetY + deltaY)),
    });
  };

  const handleDragEnd = () => {
    dragRef.current.isDragging = false;
    document.removeEventListener("pointermove", handleDragMove);
    document.removeEventListener("pointerup", handleDragEnd);
  };

  // Handle resize start
  const handleResizeStart = (e) => {
    e.stopPropagation();
    
    resizeRef.current = {
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: containerRef.current?.getBoundingClientRect().width || size.width,
      startHeight: containerRef.current?.getBoundingClientRect().height || size.height,
    };

    document.addEventListener("pointermove", handleResizeMove);
    document.addEventListener("pointerup", handleResizeEnd);
  };

  const handleResizeMove = (e) => {
    if (!resizeRef.current.isResizing) return;

    const deltaX = e.clientX - resizeRef.current.startX;
    const deltaY = e.clientY - resizeRef.current.startY;

    const newWidth = Math.max(Math.min(260, viewport.width - 20), Math.min(viewport.width - 20, resizeRef.current.startWidth + deltaX));
    const newHeight = Math.max(Math.min(200, viewport.height - 20), Math.min(viewport.height - 20, resizeRef.current.startHeight + deltaY));

    setSize({
      width: newWidth,
      height: newHeight,
    });
  };

  const handleResizeEnd = () => {
    resizeRef.current.isResizing = false;
    document.removeEventListener("pointermove", handleResizeMove);
    document.removeEventListener("pointerup", handleResizeEnd);
  };

  // Clear canvas
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    
    if (!context || !canvas) return;
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    saveToHistory();

    // Notify others
    const currentSocket = getSocket();
    if (currentSocket && currentSocket.connected) {
      currentSocket.emit("drawing-clear", { sessionId, userId });
    }
    toast.success("Canvas cleared");
  }, [sessionId, userId, saveToHistory]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      
      const context = contextRef.current;
      const canvas = canvasRef.current;
      
      if (context && canvas && drawingHistory[newIndex]) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.putImageData(drawingHistory[newIndex], 0, 0);
      }

      // Notify others
      const currentSocket = getSocket();
      if (currentSocket && currentSocket.connected) {
        currentSocket.emit("drawing-undo", { sessionId, userId });
      }
    }
  }, [historyIndex, drawingHistory, sessionId, userId]);

  // Download drawing
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `drawing-${Date.now()}.png`;
    link.click();
    toast.success("Drawing downloaded!");
  }, []);

  if (!isOpen) return null;

  const visibleWidth = Math.min(size.width, viewport.width - 20);
  const visibleHeight = Math.min(size.height, viewport.height - 20);
  const visibleLeft = Math.max(10, Math.min(position.x, viewport.width - visibleWidth - 10));
  const visibleTop = Math.max(10, Math.min(position.y, viewport.height - visibleHeight - 10));

  return (
    <div
      ref={containerRef}
      className="drawing-board fixed bg-slate-800 rounded-2xl shadow-2xl border border-white/20 z-40 flex flex-col overflow-hidden"
      style={{
        left: `${visibleLeft}px`,
        top: `${visibleTop}px`,
        width: `${visibleWidth}px`,
        height: `${visibleHeight}px`,
      }}
    >
      {/* Header - Draggable */}
      <div
        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 flex items-center justify-between cursor-grab active:cursor-grabbing select-none hover:shadow-lg transition"
        onPointerDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={18} className="opacity-60" />
          <span className="text-sm font-bold">🎨 Drawing</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded transition"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <X size={18} />
        </button>
      </div>

      {/* Tools Bar */}
      <div className="bg-slate-700 border-b border-white/10 p-3 flex items-center gap-3 overflow-x-auto flex-wrap max-h-24">
        {/* Pen */}
        <button
          onClick={() => setTool("pen")}
          onPointerDown={(e) => e.stopPropagation()}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
            tool === "pen"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-slate-600 text-slate-100 hover:bg-slate-500"
          }`}
          title="Pen Tool"
        >
          <Pen size={16} /> Pen
        </button>

        {/* Eraser */}
        <button
          onClick={() => setTool("eraser")}
          onPointerDown={(e) => e.stopPropagation()}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
            tool === "eraser"
              ? "bg-red-600 text-white shadow-lg"
              : "bg-slate-600 text-slate-100 hover:bg-slate-500"
          }`}
          title="Eraser Tool"
        >
          <Eraser size={16} /> Erase
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-white/20" />

        {/* Color Picker */}
        {tool === "pen" && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-100">Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-10 h-10 rounded-lg cursor-pointer border-2 border-white/30 hover:border-white"
              title="Pick color"
            />
          </div>
        )}

        {/* Brush Size */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-100">Size:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-20 h-2 cursor-pointer accent-blue-500"
            title="Brush size"
          />
          <span className="text-sm text-slate-200 font-semibold w-8">{brushSize}px</span>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-white/20" />

        {/* Undo */}
        <button
          onClick={handleUndo}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={historyIndex <= 0}
          className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-600 text-slate-100 hover:bg-slate-500 disabled:opacity-40 transition whitespace-nowrap"
          title="Undo last stroke"
        >
          ↶ Undo
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-yellow-600 text-white hover:bg-yellow-700 transition whitespace-nowrap"
          title="Clear entire canvas"
        >
          <RotateCcw size={16} /> Clear
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition whitespace-nowrap"
          title="Download drawing as PNG"
        >
          <Download size={16} /> Save
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 cursor-crosshair bg-white touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 bg-gradient-to-tl from-purple-500 to-transparent cursor-se-resize hover:from-purple-400"
        onPointerDown={handleResizeStart}
      />
    </div>
  );
};

export default FloatingDrawingBoard;

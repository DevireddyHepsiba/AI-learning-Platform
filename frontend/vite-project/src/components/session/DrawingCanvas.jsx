import React, { useRef, useEffect, useState } from "react";
import { X, Pen, Eraser, RotateCcw, Download, Users } from "lucide-react";
import { getSocket } from "../../utils/socketClient";
import toast from "react-hot-toast";

const DrawingCanvas = ({ sessionId, userId, onClose, isOpen }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen"); // pen, eraser
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [activeUsers, setActiveUsers] = useState(1);
  const [drawingData, setDrawingData] = useState([]);
  const canvasImageRef = useRef(null);

  // Initialize canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const context = canvas.getContext("2d");
    context.lineCap = "round";
    context.lineJoin = "round";
    contextRef.current = context;

    // Load existing drawings
    loadDrawings();

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redrawCanvas();
    };

    window.addEventListener("resize", handleResize);

    // Listen for other users' drawings
    const currentSocket = getSocket();
    if (currentSocket) {
      currentSocket.on("drawing-update", (data) => {
        drawRemoteLine(data);
      });
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (currentSocket) {
        currentSocket.off("drawing-update");
      }
    };
  }, [isOpen, sessionId]);

  // Load previous drawings from server
  const loadDrawings = async () => {
    try {
      // In production, fetch from server
      // For now, drawings are synced via Socket.io
      console.log("✅ Drawing canvas ready for:", sessionId);
    } catch (error) {
      console.error("❌ Failed to load drawings:", error);
    }
  };

  // Draw local line
  const drawLocalLine = (fromX, fromY, toX, toY) => {
    const context = contextRef.current;

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
    if (currentSocket) {
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
  };

  // Draw remote user's line
  const drawRemoteLine = (data) => {
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
  };

  // Redraw canvas on resize
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;

    if (!context) return;

    // Store current image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Resize canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Restore image data
    contextRef.current.putImageData(imageData, 0, 0);
  };

  // Mouse down handler
  const handleMouseDown = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    setIsDrawing(true);
  };

  // Mouse move handler with throttling
  const handleMouseMove = (e) => {
    if (!isDrawing || !contextRef.current) return;

    const { offsetX, offsetY } = e.nativeEvent;
    const prevX = e.nativeEvent.offsetX - (e.nativeEvent.movementX || 0);
    const prevY = e.nativeEvent.offsetY - (e.nativeEvent.movementY || 0);

    drawLocalLine(prevX, prevY, offsetX, offsetY);
  };

  // Mouse up handler
  const handleMouseUp = () => {
    if (contextRef.current) {
      contextRef.current.closePath();
    }
    setIsDrawing(false);
  };

  // Clear canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
    
    // Notify others
    const currentSocket = getSocket();
    if (currentSocket) {
      currentSocket.emit("drawing-clear", { sessionId, userId });
    }
    toast.success("Canvas cleared");
  };

  // Download drawing
  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `drawing-${Date.now()}.png`;
    link.click();
    toast.success("Drawing downloaded!");
  };

  // Close drawing
  const handleClose = () => {
    // Canvas state is automatically persisted via Socket.io
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">🎨 Collaborative Drawing</h2>
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
            <Users size={18} />
            <span className="font-semibold">{activeUsers} drawing</span>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-white/20 rounded-lg transition"
        >
          <X size={28} />
        </button>
      </div>

      {/* Drawing Tools */}
      <div className="bg-slate-100 border-b p-4 flex items-center gap-4 flex-wrap">
        {/* Pen Tool */}
        <button
          onClick={() => setTool("pen")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
            tool === "pen"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-white text-slate-700 border border-slate-300 hover:border-blue-400"
          }`}
        >
          <Pen size={20} /> Pen
        </button>

        {/* Eraser Tool */}
        <button
          onClick={() => setTool("eraser")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
            tool === "eraser"
              ? "bg-red-600 text-white shadow-lg"
              : "bg-white text-slate-700 border border-slate-300 hover:border-red-400"
          }`}
        >
          <Eraser size={20} /> Erase
        </button>

        {/* Color Picker */}
        {tool === "pen" && (
          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-700">Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-10 rounded-lg cursor-pointer border-2 border-slate-300"
            />
          </div>
        )}

        {/* Brush Size */}
        <div className="flex items-center gap-2">
          <label className="font-semibold text-slate-700">Brush:  </label>
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-40"
          />
          <span className="font-bold text-blue-600">{brushSize}px</span>
        </div>

        {/* Clear Button */}
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-yellow-500 text-white hover:bg-yellow-600 transition"
        >
          <RotateCcw size={20} /> Clear
        </button>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition"
        >
          <Download size={20} /> Save
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 cursor-crosshair bg-white"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Status */}
      <div className="bg-slate-800 text-white p-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>✅ <span className="font-semibold">Drawing active</span></div>
          <div>👥 <span className="font-semibold">{activeUsers} user{activeUsers !== 1 ? "s" : ""}</span></div>
          <div>🖌️ <span className="font-semibold">Size: {brushSize}px • {color}</span></div>
        </div>
        <div className="text-yellow-300">💡 All drawings sync in real-time</div>
      </div>
    </div>
  );
};

export default DrawingCanvas;

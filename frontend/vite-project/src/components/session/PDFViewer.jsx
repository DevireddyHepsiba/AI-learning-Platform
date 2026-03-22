import { useState, useRef, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Vite-safe worker URL import for react-pdf.
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * PDFViewer Component
 * Displays PDF with page navigation
 * Props:
 *   - documentUrl: URL to PDF
 *   - currentPage: Current page number
 *   - onPageChange: Callback when page changes
 *   - numPages: Total number of pages
 *   - onLoadSuccess: Callback when PDF loads
 */
export default function PDFViewer({
  documentUrl,
  currentPage,
  onPageChange,
  numPages,
  onLoadSuccess,
}) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Process document URL to handle various formats
  const processedDocUrl = useMemo(() => {
    if (!documentUrl) return null;
    
    // If it's a data URL or full URL, use it directly
    if (documentUrl.startsWith("data:") || documentUrl.startsWith("http")) {
      // Backward-compatibility: old sessions saved frontend-origin upload URL.
      // Rewrite it to backend API base so it returns actual PDF bytes.
      if (documentUrl.includes("/uploads/documents/")) {
        try {
          const currentOrigin = window.location.origin;
          if (documentUrl.startsWith(currentOrigin)) {
            const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:8000";
            const pathname = new URL(documentUrl).pathname;
            return `${apiBase}${pathname}`;
          }
        } catch {
          // fall through to raw URL
        }
      }
      return documentUrl;
    }
    
    // If it's a relative path, prepend the backend URL
    const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:8000";
    
    // Handle various path formats
    if (documentUrl.startsWith("/")) {
      return `${apiBase}${documentUrl}`;
    }
    
    return `${apiBase}/uploads/${documentUrl}`;
  }, [documentUrl]);

  const handleDocumentLoadSuccess = ({ numPages }) => {
    setLoading(false);
    setError(null);
    onLoadSuccess?.(numPages);
  };

  const handleDocumentLoadError = (error) => {
    console.error("[PDF] Load error:", error);
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageInputChange = (e) => {
    const pageNum = parseInt(e.target.value, 10);
    if (pageNum >= 1 && pageNum <= numPages) {
      onPageChange(pageNum);
    }
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 rounded-lg p-4">
        <div className="text-center text-red-600 max-w-md">
          <p className="font-semibold text-lg mb-2">Error loading PDF</p>
          <p className="text-sm mb-3">{error}</p>
          <p className="text-xs text-gray-600 break-all bg-white p-2 rounded border border-red-200">
            URL: {processedDocUrl || documentUrl || "No URL provided"}
          </p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!processedDocUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-yellow-50 rounded-lg p-4">
        <div className="text-center text-yellow-600 max-w-md">
          <p className="font-semibold text-lg mb-2">No PDF Document</p>
          <p className="text-sm">No document URL provided for this session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* PDF Controls */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage <= 1 || loading}
            className="px-3 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 hover:bg-blue-600 transition"
          >
            ← Prev
          </button>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max={numPages || 1}
              value={currentPage}
              onChange={handlePageInputChange}
              disabled={loading}
              className="w-12 px-2 py-1 border border-gray-300 rounded text-center text-gray-900 bg-white caret-gray-900 disabled:bg-gray-100"
            />
            <span className="text-gray-600">of {numPages || "?"}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages || loading}
            className="px-3 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 hover:bg-blue-600 transition"
          >
            Next →
          </button>
        </div>

        {loading && (
          <span className="text-sm text-gray-500">Loading PDF...</span>
        )}
      </div>

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="pdf-scroll-container relative flex-1 overflow-auto flex justify-center bg-gray-100 p-4"
      >
        <Document
          file={processedDocUrl}
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={handleDocumentLoadError}
          loading={<div className="text-gray-500">Loading...</div>}
          error={<div className="text-red-500">Failed to load PDF</div>}
          noData={<div className="text-gray-500">No PDF data</div>}
        >
          <Page
            pageNumber={currentPage}
            className="bg-white shadow-lg"
            renderTextLayer={true}
            renderAnnotationLayer={true}
            width={Math.min(containerRef.current?.clientWidth || 800, 800)}
          />
        </Document>

        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100/80">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <div className="text-gray-500">Loading PDF document...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

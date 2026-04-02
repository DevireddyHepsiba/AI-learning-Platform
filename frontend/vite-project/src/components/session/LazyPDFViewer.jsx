import React, { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ChevronUp, ChevronDown, Loader } from "lucide-react";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * LazyPDFViewer Component
 * Loads PDF pages on-demand (lazy loading)
 * Caches recently viewed pages
 * Integrates with collaborative highlighting/drawing
 */
export function LazyPDFViewer({ documentId, sessionId, userId, onHighlight, onDraw }) {
  const [pdf, setPdf] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [renderedPages, setRenderedPages] = useState(new Set([1])); // Cache of rendered pages
  const [loadingPages, setLoadingPages] = useState(new Set());
  const [zoom, setZoom] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const containerRef = useRef(null);
  const canvasRefs = useRef({});
  const pageBufferSize = 3; // Load 3 pages ahead/behind current

  /**
   * Load PDF document
   */
  useEffect(() => {
    const loadPDF = async () => {
      try {
        // Fetch PDF file
        const pdfUrl = `/api/documents/${documentId}/file`;
        const arrayBuffer = await fetch(pdfUrl).then((res) => res.arrayBuffer());
        const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        setPdf(loadedPdf);
        setTotalPages(loadedPdf.numPages);
        console.log(`✅ PDF loaded: ${loadedPdf.numPages} pages`);
      } catch (error) {
        console.error("❌ Failed to load PDF:", error);
      }
    };

    if (documentId) {
      loadPDF();
    }
  }, [documentId]);

  /**
   * Render a single page
   */
  const renderPage = useCallback(
    async (pageNum) => {
      if (!pdf || renderedPages.has(pageNum)) return;

      setLoadingPages((prev) => new Set([...prev, pageNum]));

      try {
        const page = await pdf.getPage(pageNum);
        const scale = zoom;
        const viewport = page.getViewport({ scale });

        // Get or create canvas
        let canvas = canvasRefs.current[pageNum];
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvasRefs.current[pageNum] = canvas;
        }

        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render page
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        setRenderedPages((prev) => new Set([...prev, pageNum]));
        console.log(`✅ Page ${pageNum} rendered`);
      } catch (error) {
        console.error(`❌ Failed to render page ${pageNum}:`, error);
      } finally {
        setLoadingPages((prev) => {
          const updated = new Set(prev);
          updated.delete(pageNum);
          return updated;
        });
      }
    },
    [pdf, zoom, renderedPages]
  );

  /**
   * Load pages in buffer (current page ± pageBufferSize)
   */
  useEffect(() => {
    if (!pdf) return;

    const pagesToLoad = [];
    for (let i = Math.max(1, currentPage - pageBufferSize); i <= Math.min(totalPages, currentPage + pageBufferSize); i++) {
      if (!renderedPages.has(i) && !loadingPages.has(i)) {
        pagesToLoad.push(i);
      }
    }

    // Load pages in sequence
    pagesToLoad.forEach((pageNum) => renderPage(pageNum));

    // Cleanup old pages (keep last 10)
    if (renderedPages.size > 10) {
      const sortedPages = Array.from(renderedPages).sort((a, b) => a - b);
      const pagesToRemove = sortedPages.slice(0, sortedPages.length - 10);

      setRenderedPages((prev) => {
        const updated = new Set(prev);
        pagesToRemove.forEach((p) => {
          updated.delete(p);
          delete canvasRefs.current[p];
        });
        return updated;
      });
    }
  }, [currentPage, pdf, totalPages, renderedPages, loadingPages, renderPage, pageBufferSize]);

  /**
   * Handle page navigation
   */
  const goToPage = (pageNum) => {
    const newPage = Math.max(1, Math.min(totalPages, pageNum));
    setCurrentPage(newPage);
  };

  /**
   * Search text in PDF
   */
  const searchInPDF = async (query) => {
    setSearchText(query);

    if (!query.trim() || !pdf) {
      setSearchResults([]);
      return;
    }

    const results = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item) => item.str).join(" ");

        if (text.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            pageNum,
            text: text.substring(0, 100) + "...",
          });
        }
      } catch (error) {
        console.error(`Failed to search page ${pageNum}:`, error);
      }
    }

    setSearchResults(results);
  };

  /**
   * Handle zoom
   */
  const handleZoom = (direction) => {
    const newZoom = direction === "in" ? zoom + 0.2 : Math.max(0.5, zoom - 0.2);
    setZoom(newZoom);
    setRenderedPages(new Set()); // Clear cache on zoom change
  };

  /**
   * Render canvas for current page
   */
  const renderCurrentPageCanvas = () => {
    const canvas = canvasRefs.current[currentPage];
    if (!canvas) return null;

    return (
      <canvas
        ref={(node) => {
          if (node) {
            node.width = canvas.width;
            node.height = canvas.height;
            const ctx = node.getContext("2d");
            const sourceCtx = canvas.getContext("2d");
            ctx.putImageData(sourceCtx.getImageData(0, 0, canvas.width, canvas.height), 0, 0);
          }
        }}
        className="border border-gray-300 rounded-lg shadow-lg max-w-full h-auto"
      />
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            className="p-2 hover:bg-gray-100 rounded"
            title="Previous page"
          >
            <ChevronUp size={20} />
          </button>
          <input
            type="number"
            value={currentPage}
            onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
            className="w-16 px-2 py-1 border rounded text-center"
            min="1"
            max={totalPages}
          />
          <span className="text-sm text-gray-600">/ {totalPages}</span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            className="p-2 hover:bg-gray-100 rounded"
            title="Next page"
          >
            <ChevronDown size={20} />
          </button>
        </div>

        <input
          type="text"
          placeholder="Search in PDF..."
          value={searchText}
          onChange={(e) => searchInPDF(e.target.value)}
          className="flex-1 px-3 py-1 border rounded"
        />

        <div className="flex items-center gap-2">
          <button onClick={() => handleZoom("out")} className="px-2 py-1 hover:bg-gray-100 rounded text-sm">
            −
          </button>
          <span className="text-sm w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button onClick={() => handleZoom("in")} className="px-2 py-1 hover:bg-gray-100 rounded text-sm">
            +
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4" ref={containerRef}>
        {/* Loading indicator for current page */}
        {loadingPages.has(currentPage) && (
          <div className="flex items-center justify-center h-96">
            <div className="flex items-center gap-2 text-gray-600">
              <Loader className="animate-spin" size={24} />
              <span>Loading page {currentPage}...</span>
            </div>
          </div>
        )}

        {/* Rendered page */}
        {renderedPages.has(currentPage) && <div className="flex justify-center">{renderCurrentPageCanvas()}</div>}

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">Search Results ({searchResults.length})</h3>
            <div className="space-y-2">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => goToPage(result.pageNum)}
                  className="block w-full text-left p-2 hover:bg-blue-100 rounded text-sm"
                >
                  📄 Page {result.pageNum}: {result.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer - Page Info */}
      <div className="p-2 border-t text-xs text-gray-600 text-center">
        <span>
          Cached: {renderedPages.size} pages | Loaded: {totalPages - loadingPages.size}/{totalPages}
        </span>
      </div>
    </div>
  );
}

export default LazyPDFViewer;

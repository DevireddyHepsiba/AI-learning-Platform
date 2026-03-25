import express from "express";
import {
    uploadDocument,
    getDocuments,
    getDocument,
    deleteDocument,
    retryDocumentProcessing,
} from "../controllers/documentController.js";

import protect from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();
///All routes are protected
router.use(protect);

// Debug endpoint - test if a URL can be fetched and parsed
router.post('/debug/test-url', async (req, res, next) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }

    console.log(`[DEBUG] Testing URL: ${url}`);

    // Fetch from URL
    const response = await fetch(url, { timeout: 30000 });
    
    if (!response.ok) {
      return res.status(502).json({ error: `Failed to fetch: HTTP ${response.status}` });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[DEBUG] Downloaded ${buffer.length} bytes`);

    // Try parsing
    const { extractTextFromPDF } = await import('../utils/pdfParser.js');
    const result = await extractTextFromPDF(buffer);

    return res.json({
      success: true,
      bytesDownloaded: buffer.length,
      textExtracted: result.text?.length || 0,
      pages: result.numPages,
      firstChars: result.text?.substring(0, 200),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload', upload.single('file'), uploadDocument);
router.post('/:id/retry', retryDocumentProcessing);  // 🔄 Retry failed processing
router.get('/', getDocuments);
router.get('/:id', getDocument);
router.delete('/:id', deleteDocument);


export default router;

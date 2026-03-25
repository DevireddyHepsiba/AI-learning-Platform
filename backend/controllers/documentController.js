import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';

const resolvePublicBaseUrl = (req) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const requestHost = req.get('host');

  return (
    process.env.BACKEND_PUBLIC_URL ||
    process.env.PUBLIC_BASE_URL ||
    (requestHost ? `${protocol}://${requestHost}` : '') ||
    (process.env.NODE_ENV === 'production'
      ? 'https://ai-learning-platform-c2jg.onrender.com'
      : `http://localhost:${process.env.PORT || 8000}`)
  );
};

const normalizeDocumentFilePath = (filePath, req) => {
  const value = String(filePath || '').trim();
  if (!value) return value;

  if (!/^https?:\/\/localhost:\d+/i.test(value)) {
    return value;
  }

  try {
    const pathname = new URL(value).pathname;
    return `${resolvePublicBaseUrl(req)}${pathname}`;
  } catch {
    return value;
  }
};

//@desc upload pdf document
//@route POST /api/document/upload
//@access private
export const uploadDocument = async (req, res, next) => {
  try {
    console.log('[Document Upload] Request received');

    if (!req.file) {
      console.log('[Document Upload] ERROR: No file provided');
      return res.status(400).json({
        success: false,
        error: 'Please upload a PDF file',
        statusCode: 400,
      });
    }

    const { title } = req.body;

    if (!title) {
      console.log('[Document Upload] ERROR: No title provided');
      return res.status(400).json({
        success: false,
        error: 'Please provide a document title',
        statusCode: 400,
      });
    }

    if (!req.user || !req.user._id) {
      console.log('[Document Upload] ERROR: User not authenticated');
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        statusCode: 401,
      });
    }

    // req.file.path is the Cloudinary URL (from CloudinaryStorage)
    // req.file.buffer is available for processing BEFORE Cloudinary upload
    const cloudinaryUrl = req.file.path; // ✅ Cloudinary URL from multer-storage-cloudinary
    const fileBuffer = req.file.buffer;   // ✅ Keep buffer for PDF processing

    console.log('[Document Upload] Cloudinary URL:', cloudinaryUrl);
    console.log('[Document Upload] File buffer available:', !!fileBuffer);

    // Create database record immediately
    const document = await Document.create({
      userId: req.user._id,
      title,
      fileName: req.file.originalname,
      filePath: cloudinaryUrl, // ✅ Save Cloudinary URL
      fileSize: req.file.size,
      status: 'processing',
    });

    console.log('[Document Upload] Document created:', document._id);

    // Process PDF asynchronously using buffer (most reliable)
    processPDFBuffer(document._id, fileBuffer, cloudinaryUrl).catch((err) => {
      console.error('[Document Upload] PDF processing error:', err.message);
    });

    console.log('[Document Upload] Success - returning 201');
    res.status(201).json({
      success: true,
      data: document,
      message: 'Document uploaded successfully. Processing in progress...',
    });
  } catch (error) {
    console.error('[Document Upload] CAUGHT ERROR:', error.message || error);
    console.error('[Document Upload] ERROR STACK:', error.stack);
    next(error);
  }
};

// Helper function - Process PDF with buffer (primary) or fetch from URL (fallback)
const processPDFBuffer = async (documentId, fileBuffer, cloudinaryUrl) => {
  try {
    console.log(`[PDF Processing] Processing document ${documentId}...`);
    
    let text;

    // ✅ Try using buffer first (most reliable, no network needed)
    if (fileBuffer && Buffer.isBuffer(fileBuffer)) {
      console.log(`[PDF Processing] Using buffer from upload...`);
      try {
        const result = await extractTextFromPDF(fileBuffer);
        text = result.text;
        console.log(`[PDF Processing] Successfully extracted text from buffer (${text.length} chars)`);
      } catch (bufferError) {
        console.error(`[PDF Processing] Buffer processing failed:`, bufferError.message);
        // Fallback to URL
        throw bufferError;
      }
    } else {
      console.log(`[PDF Processing] No buffer available, fetching from Cloudinary...`);
      // Fallback: fetch from Cloudinary
      const response = await fetchWithRetry(cloudinaryUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await extractTextFromPDF(buffer);
      text = result.text;
      console.log(`[PDF Processing] Successfully extracted text from URL (${text.length} chars)`);
    }

    const chunks = chunkText(text, 500, 50);

    await Document.findByIdAndUpdate(documentId, {
      extractedText: text,
      chunks,
      status: 'ready',
    });
    
    console.log(`[PDF Processing] Document ${documentId} ready with ${chunks.length} chunks`);
  } catch (error) {
    console.error(`[PDF Processing] Error processing document ${documentId}:`, error.message);
    await Document.findByIdAndUpdate(documentId, {
      status: 'failed',
      extractedText: '',
      chunks: [],
    });
  }
};

// Retry fetch with exponential backoff
const fetchWithRetry = async (url, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Node.js)',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`[Fetch] Successfully fetched from URL (attempt ${attempt})`);
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`[Fetch] Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`[Fetch] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to fetch after ${maxRetries} attempts: ${lastError.message}`);
};

//@desc get all user documents
//@route GET /api/documents
//@access private
export const getDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({ userId: req.user._id });
    const normalizedDocuments = documents.map((doc) => {
      const documentData = doc.toObject();
      documentData.filePath = normalizeDocumentFilePath(documentData.filePath, req);
      return documentData;
    });

    res.status(200).json({
      success: true,
      data: normalizedDocuments,
    });
  } catch (error) {
    next(error);
  }
};

//@desc get single user document
//@route GET /api/documents/:id
//@access private
export const getDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        statusCode: 404,
      });
    }

    const flashcardCount = await Flashcard.countDocuments({
      documentId: document._id,
      userId: req.user._id,
    });

    const quizCount = await Quiz.countDocuments({
      documentId: document._id,
      userId: req.user._id,
    });

    document.lastAccessed = Date.now();
    await document.save();

    const documentData = document.toObject();
    documentData.filePath = normalizeDocumentFilePath(documentData.filePath, req);
    documentData.flashcardCount = flashcardCount;
    documentData.quizCount = quizCount;

    res.status(200).json({
      success: true,
      data: documentData,
    });
  } catch (error) {
    next(error);
  }
};

//@desc Delete document
//@route DELETE /api/document/:id
//@access Private
export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        statusCode: 404,
      });
    }

    // For Cloudinary: no local file to delete
    // Cloudinary auto-manages file lifecycle

    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

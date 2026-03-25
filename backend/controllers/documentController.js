import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';
import cloudinaryHelper from '../utils/cloudinaryHelper.js';
import logger from '../utils/logger.js';

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
    logger.info('[Document Upload] Request received');

    if (!req.file) {
      logger.warn('[Document Upload] ERROR: No file provided');
      return res.status(400).json({
        success: false,
        error: 'Please upload a PDF file',
        statusCode: 400,
      });
    }

    const { title } = req.body;

    if (!title) {
      logger.warn('[Document Upload] ERROR: No title provided');
      return res.status(400).json({
        success: false,
        error: 'Please provide a document title',
        statusCode: 400,
      });
    }

    if (!req.user || !req.user._id) {
      logger.warn('[Document Upload] ERROR: User not authenticated');
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        statusCode: 401,
      });
    }

    // Get file buffer from memory storage
    const fileBuffer = req.file.buffer;
    
    if (!fileBuffer || fileBuffer.length === 0) {
      logger.warn('[Document Upload] ERROR: No file buffer');
      return res.status(400).json({
        success: false,
        error: 'File buffer is empty',
        statusCode: 400,
      });
    }

    logger.info('[Document Upload] File buffer received', { bytes: fileBuffer.length });

    // Upload to Cloudinary (with helper)
    let cloudinaryUrl = null;
    let cloudinaryPublicId = null;
    try {
      logger.info('[Document Upload] Uploading to Cloudinary...');
      const uploadResult = await cloudinaryHelper.uploadBuffer(fileBuffer, { folder: 'ai-learning-documents' });
      cloudinaryUrl = uploadResult?.secure_url || null;
      cloudinaryPublicId = uploadResult?.public_id || null;
      logger.info('[Document Upload] Cloudinary upload success', { url: cloudinaryUrl, publicId: cloudinaryPublicId });
    } catch (uploadError) {
      logger.error('[Document Upload] Cloudinary upload failed', { err: uploadError.message || uploadError });
      return res.status(500).json({ success: false, error: 'Failed to upload file to cloud storage', statusCode: 500 });
    }

    // Create database record with Cloudinary URL and public id
    const document = await Document.create({
      userId: req.user._id,
      title,
      fileName: req.file.originalname,
      filePath: cloudinaryUrl,
      cloudinaryPublicId,
      fileSize: req.file.size,
      status: 'processing',
    });

    logger.info('[Document Upload] Document created', { documentId: document._id });

    // Process PDF asynchronously using buffer
    processPDFBuffer(document._id, fileBuffer, cloudinaryUrl).catch((err) => {
      logger.error('[Document Upload] PDF processing error', { err: err.message || err });
    });

    logger.info('[Document Upload] Success - returning 201');
    res.status(201).json({
      success: true,
      data: document,
      message: 'Document uploaded successfully. Processing in progress...',
    });
  } catch (error) {
    logger.error('[Document Upload] CAUGHT ERROR', { err: error.message || error, stack: error.stack });
    next(error);
  }
};

// Helper function - Process PDF ONLY from Cloudinary URL with retries
const processPDFBuffer = async (documentId, fileBuffer, cloudinaryUrl) => {
  try {
    logger.info('[PDF Processing] Starting', { documentId, url: cloudinaryUrl?.substring(0, 80) });
    
    let text = '';
    let numPages = 0;

    logger.info('[PDF Processing] Fetching from Cloudinary', { url: cloudinaryUrl?.substring(0, 80) });
    try {
      const response = await fetchWithTimeout(cloudinaryUrl, 30000);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      logger.info('[PDF Processing] Downloaded bytes', { bytes: buffer.length });

      // Extract text
      logger.info('[PDF Processing] Parsing PDF');
      const result = await extractTextFromPDF(buffer);
      text = result.text || '';
      numPages = result.numPages || 0;
      
      logger.info('[PDF Processing] Extracted text length', { length: text.length, pages: numPages });
    } catch (fetchError) {
      logger.error('[PDF Processing] Failed to fetch/parse', { err: fetchError.message || fetchError });
      throw fetchError;
    }

    // ⚠️ If text is empty, still mark as ready (might be scanned PDF)
    if (!text || text.trim().length === 0) {
      logger.warn('[PDF Processing] WARNING: No text extracted (might be image-based PDF)');
      // Don't fail - still update document
    }

    const chunks = text.trim().length > 0 ? chunkText(text, 500, 50) : [];
    logger.info('[PDF Processing] Created chunks', { count: chunks.length });

    // Update document with extracted content
    const updateResult = await Document.findByIdAndUpdate(
      documentId,
      {
        extractedText: text,
        chunks,
        status: 'ready', // Mark as ready even if text is empty
      },
      { new: true }
    );
    
    logger.info('[PDF Processing] Document is now ready', { documentId });
    return updateResult;
  } catch (error) {
    logger.error('[PDF Processing] CRITICAL ERROR', { documentId, err: error.message || error, stack: error.stack });
    
    // Mark as failed in database
    try {
      await Document.findByIdAndUpdate(documentId, {
        status: 'failed',
        extractedText: '',
        chunks: [],
      });
      logger.info('[PDF Processing] Marked as failed', { documentId });
    } catch (updateError) {
      logger.error('[PDF Processing] Failed to update status', { documentId, err: updateError.message || updateError });
    }
  }
};

// Simple fetch with timeout
const fetchWithTimeout = async (url, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Node.js)',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Fetch timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
};

// Retry fetch helper (LEGACY - may not be needed now)
const fetchWithRetry = async (url, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info('[Fetch] Attempt', { attempt, url: url?.substring(0, 80) });
      const response = await fetchWithTimeout(url, 30000);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      logger.info('[Fetch] Success', { attempt });
      return response;
    } catch (error) {
      lastError = error;
      logger.warn('[Fetch] Attempt failed', { attempt, err: error.message || error });
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        logger.info('[Fetch] Retrying after delay', { delay });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to fetch after ${maxRetries} attempts: ${lastError?.message}`);
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

//@desc Retry PDF processing for failed documents
//@route POST /api/documents/:id/retry
//@access Private
export const retryDocumentProcessing = async (req, res, next) => {
  try {
    logger.info('[Document Retry] Retrying document', { id: req.params.id });
    
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

    if (!document.filePath) {
      return res.status(400).json({
        success: false,
        error: 'Document has no file path (Cloudinary URL)',
        statusCode: 400,
      });
    }

    // Update status to processing
    document.status = 'processing';
    await document.save();

    logger.info('[Document Retry] Reprocessing', { id: req.params.id, url: document.filePath });

    // Call processing function with Cloudinary URL
    processPDFBuffer(document._id, null, document.filePath).catch((err) => {
      logger.error('[Document Retry] Processing error', { err: err.message || err });
    });

    res.status(200).json({
      success: true,
      message: 'Document reprocessing started. Please wait...',
      data: document,
    });
  } catch (error) {
    logger.error('[Document Retry] Error', { err: error.message || error });
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

    // If this document was stored on Cloudinary, attempt to delete the remote resource
    if (document.cloudinaryPublicId) {
      try {
        await cloudinaryHelper.deleteResource(document.cloudinaryPublicId, { resource_type: 'raw' });
        logger.info('[Document Delete] Cloudinary resource deleted', { publicId: document.cloudinaryPublicId });
      } catch (err) {
        logger.warn('[Document Delete] Failed to delete Cloudinary resource', { err: err.message || err });
        // proceed to delete DB record anyway
      }
    }

    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

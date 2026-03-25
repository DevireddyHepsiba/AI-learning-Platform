import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';
import cloudinary from '../config/cloudinary.js';

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

    // Get file buffer from memory storage
    const fileBuffer = req.file.buffer;
    
    if (!fileBuffer || fileBuffer.length === 0) {
      console.log('[Document Upload] ERROR: No file buffer');
      return res.status(400).json({
        success: false,
        error: 'File buffer is empty',
        statusCode: 400,
      });
    }

    console.log('[Document Upload] File buffer received:', fileBuffer.length, 'bytes');

    // Upload to Cloudinary
    let cloudinaryUrl = null;
    try {
      console.log('[Document Upload] 📤 Uploading to Cloudinary...');
      const uploadStream = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'ai-learning-documents',
            resource_type: 'auto',
            format: 'pdf',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(fileBuffer);
      });
      cloudinaryUrl = uploadStream.secure_url;
      console.log('[Document Upload] ✅ Uploaded to Cloudinary:', cloudinaryUrl);
    } catch (uploadError) {
      console.error('[Document Upload] ❌ Cloudinary upload failed:', uploadError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload file to cloud storage',
        statusCode: 500,
      });
    }

    // Create database record with Cloudinary URL
    const document = await Document.create({
      userId: req.user._id,
      title,
      fileName: req.file.originalname,
      filePath: cloudinaryUrl, // ✅ Save Cloudinary URL
      fileSize: req.file.size,
      status: 'processing',
    });

    console.log('[Document Upload] ✅ Document created:', document._id);

    // Process PDF asynchronously using buffer
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

// Helper function - Process PDF ONLY from Cloudinary URL with retries
const processPDFBuffer = async (documentId, fileBuffer, cloudinaryUrl) => {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[PDF Processing] 🚀 Starting for document ${documentId}`);
    console.log(`[PDF Processing] URL: ${cloudinaryUrl?.substring(0, 80)}...`);
    
    let text = '';
    let numPages = 0;
    let success = false;

    // ✅ ALWAYS fetch from Cloudinary with retries
    console.log(`[PDF Processing] 📥 Fetching from Cloudinary...`);
    try {
      const response = await fetchWithTimeout(cloudinaryUrl, 30000);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`[PDF Processing] ✅ Downloaded ${buffer.length} bytes`);

      // Extract text
      console.log(`[PDF Processing] 🔍 Parsing PDF...`);
      const result = await extractTextFromPDF(buffer);
      text = result.text || '';
      numPages = result.numPages || 0;
      success = true;
      
      console.log(`[PDF Processing] ✅ Extracted ${text.length} characters from PDF`);
      console.log(`[PDF Processing] ✅ Pages: ${numPages}`);
      console.log(`[PDF Processing] ✅ First 100 chars: "${text.substring(0, 100)}"`);
    } catch (fetchError) {
      console.error(`[PDF Processing] ❌ Failed to fetch/parse:`, fetchError.message);
      throw fetchError;
    }

    // ⚠️ If text is empty, still mark as ready (might be scanned PDF)
    if (!text || text.trim().length === 0) {
      console.warn(`[PDF Processing] ⚠️  WARNING: No text extracted (might be image-based PDF)`);
      // Don't fail - still update document
    }

    const chunks = text.trim().length > 0 ? chunkText(text, 500, 50) : [];
    console.log(`[PDF Processing] ✅ Created ${chunks.length} chunks`);

    // Update document with extracted content
    const updateResult = await Document.findByIdAndUpdate(
      documentId,
      {
        extractedText: text,
        chunks,
        status: 'ready', // ✅ Mark as ready even if text is empty
      },
      { new: true }
    );
    
    console.log(`[PDF Processing] ✅✅ Document ${documentId} is NOW READY`);
    console.log(`${'='.repeat(60)}\n`);
    return updateResult;
  } catch (error) {
    console.error(`\n${'!'.repeat(60)}`);
    console.error(`[PDF Processing] ❌❌ CRITICAL ERROR for ${documentId}:`, error.message || error);
    console.error(`[PDF Processing] Stack:`, error.stack);
    console.error(`${'!'.repeat(60)}\n`);
    
    // Mark as failed in database
    try {
      await Document.findByIdAndUpdate(documentId, {
        status: 'failed',
        extractedText: '',
        chunks: [],
      });
      console.log(`[PDF Processing] Marked ${documentId} as FAILED`);
    } catch (updateError) {
      console.error(`[PDF Processing] Failed to update status:`, updateError.message);
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
      console.log(`[Fetch] Attempt ${attempt}/${maxRetries} for ${url.substring(0, 80)}...`);
      const response = await fetchWithTimeout(url, 30000);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`[Fetch] ✅ Success on attempt ${attempt}`);
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`[Fetch] ❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[Fetch] Retrying in ${delay}ms...`);
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
    console.log(`[Document Retry] Retrying document ${req.params.id}`);
    
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

    console.log(`[Document Retry] Reprocessing ${req.params.id} from URL: ${document.filePath}`);

    // Call processing function with Cloudinary URL
    processPDFBuffer(document._id, null, document.filePath).catch((err) => {
      console.error('[Document Retry] Processing error:', err.message);
    });

    res.status(200).json({
      success: true,
      message: 'Document reprocessing started. Please wait...',
      data: document,
    });
  } catch (error) {
    console.error('[Document Retry] Error:', error.message);
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

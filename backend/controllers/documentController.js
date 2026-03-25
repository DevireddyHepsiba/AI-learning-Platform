import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads/documents directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'documents');
try {
  if (!fsSync.existsSync(uploadsDir)) {
    fsSync.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.error('[Init] Failed to create uploads directory:', err.message);
}

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
  let savedFilePath = null;
  
  try {
    console.log('[Document Upload] Request received');
    console.log('[Document Upload] req.file:', req.file ? { fieldname: req.file.fieldname, originalname: req.file.originalname, size: req.file.size } : 'NO FILE');
    console.log('[Document Upload] req.body:', req.body);

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

    // Ensure directory exists
    if (!fsSync.existsSync(uploadsDir)) {
      fsSync.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const filename = `${timestamp}-${randomId}-${req.file.originalname}`;
    savedFilePath = path.join(uploadsDir, filename);

    // Save file buffer to disk
    console.log('[Document Upload] Saving file to disk:', savedFilePath);
    await fs.writeFile(savedFilePath, req.file.buffer);
    console.log('[Document Upload] File saved successfully');

    // Create database record
    const baseUrl = resolvePublicBaseUrl(req);
    const fileUrl = `${baseUrl}/uploads/documents/${filename}`;

    console.log('[Document Upload] Creating document record...');
    const document = await Document.create({
      userId: req.user._id,
      title,
      fileName: req.file.originalname,
      filePath: fileUrl,
      fileSize: req.file.size,
      status: 'processing',
    });

    console.log('[Document Upload] Document created:', document._id);

    // Process PDF asynchronously
    processPDF(document._id, savedFilePath).catch((err) => {
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
    
    // Clean up saved file if upload failed
    if (savedFilePath) {
      try {
        await fs.unlink(savedFilePath);
        console.log('[Document Upload] Cleaned up partial file');
      } catch (cleanupErr) {
        console.error('[Document Upload] Failed to cleanup file:', cleanupErr.message);
      }
    }
    
    next(error);
  }
};

// Helper function - Process PDF from file path
const processPDF = async (documentId, filePath) => {
  try {
    const { text } = await extractTextFromPDF(filePath);

    const chunks = chunkText(text, 500, 50);

    await Document.findByIdAndUpdate(documentId, {
      extractedText: text,
      chunks,
      status: 'ready',
    });
  } catch (error) {
    console.error(`[PDF Processing] Error processing document ${documentId}:`, error);
    await Document.findByIdAndUpdate(documentId, {
      status: 'failed',
    });
  }
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

    // delete local file (convert URL → path if needed)
    await fs.unlink(`uploads/documents/${document.fileName}`).catch(() => {});

    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

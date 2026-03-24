import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';
import { uploadToGCS, deleteFromGCS } from '../utils/gcsService.js';
import fs from 'fs/promises';

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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a PDF file',
        statusCode: 400,
      });
    }

    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a document title',
        statusCode: 400,
      });
    }

    /**
     * Upload to Google Cloud Storage (persistent across server restarts)
     * If GCS is not configured, the file data is lost after processing
     * (multer memory storage is temporary)
     */
    const gcsResult = await uploadToGCS(req.file.buffer, req.file.originalname);

    // Use GCS URL if available, otherwise construct local URL as fallback
    let fileUrl;
    if (gcsResult) {
      fileUrl = gcsResult.url;
      console.log(`[Document] Using GCS URL: ${fileUrl}`);
    } else {
      // Fallback for local storage (not recommended on Render)
      const baseUrl = resolvePublicBaseUrl(req);
      fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;
      console.warn(
        "[Document] GCS not configured. Using local storage (temporary on Render)"
      );
    }

    const document = await Document.create({
      userId: req.user._id,
      title,
      fileName: req.file.originalname,
      filePath: fileUrl,
      fileSize: req.file.size,
      status: 'processing',
    });

    /**
     * Process PDF in background
     * Extract text and create chunks for AI features
     */
    processPDFBuffer(document._id, req.file.buffer).catch((err) => {
      console.error('PDF processing error:', err);
    });

    res.status(201).json({
      success: true,
      data: document,
      message: 'Document uploaded successfully. Processing in progress...',
    });
  } catch (error) {
    next(error);
  }
};

// Helper function - Process PDF buffer (from multer memory storage)
const processPDFBuffer = async (documentId, pdfBuffer) => {
  try {
    const { text } = await extractTextFromPDF(pdfBuffer);

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

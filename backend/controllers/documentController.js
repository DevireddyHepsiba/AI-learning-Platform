import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';

const normalizeDocumentFilePath = (filePath, req) => {
  const value = String(filePath || '').trim();
  if (!value) return value;

  if (!/^https?:\/\/localhost:\d+/i.test(value)) {
    return value;
  }

  try {
    const pathname = new URL(value).pathname;
    const protocol = req.protocol || 'http';
    const requestHost = req.get('host');
    const baseUrl = requestHost ? `${protocol}://${requestHost}` : '';
    return `${baseUrl}${pathname}`;
  } catch {
    return value;
  }
};

//@desc upload pdf document
//@route POST /api/document/upload
//@access private
export const uploadDocument = async (req, res, next) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
        statusCode: 400,
      });
    }

    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Please provide a document title",
        statusCode: 400,
      });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
        statusCode: 401,
      });
    }

    // file.path is provided by CloudinaryStorage (Cloudinary URL)
    const document = await Document.create({
      userId: req.user._id,
      title,
      fileName: file.originalname,
      filePath: file.path, // ✅ Cloudinary URL
      fileSize: file.size,
      status: "processing",
    });

    // Process PDF asynchronously
    processPDFFromUrl(document._id, file.path, file.buffer).catch((err) => {
      console.error('[Document Upload] PDF processing error:', err.message);
    });

    res.status(201).json({
      success: true,
      data: document,
      message: "Document uploaded successfully. Processing in progress...",
    });
  } catch (error) {
    console.error('[Document Upload] Error:', error.message);
    next(error);
  }
};

// Helper function - Process PDF from Cloudinary URL or buffer
const processPDFFromUrl = async (documentId, fileUrl, fileBuffer) => {
  try {
    // Use buffer if available, otherwise fetch from URL
    let text;
    if (fileBuffer) {
      const result = await extractTextFromPDF(fileBuffer);
      text = result.text;
    } else {
      const response = await fetch(fileUrl);
      const buffer = await response.buffer();
      const result = await extractTextFromPDF(buffer);
      text = result.text;
    }

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

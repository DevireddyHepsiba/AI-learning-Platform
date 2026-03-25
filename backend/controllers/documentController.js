import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';
import axios from 'axios';

//@desc upload pdf document
//@route POST /api/document/upload
//@access private
export const uploadDocument = async (req, res, next) => {
  try {
    // 🔍 DEBUG: Log environment configuration
    console.log('[Upload DEBUG] CLOUD_NAME:', process.env.CLOUD_NAME ? '✅ LOADED' : '❌ UNDEFINED');
    console.log('[Upload DEBUG] CLOUD_API_KEY:', process.env.CLOUD_API_KEY ? '✅ LOADED' : '❌ UNDEFINED');
    console.log('[Upload DEBUG] CLOUD_API_SECRET:', process.env.CLOUD_API_SECRET ? '✅ LOADED' : '❌ UNDEFINED');
    
    const file = req.file;
    
    // 🔍 DEBUG: Log file info
    console.log('[Upload DEBUG] File received:', file ? {
      originalname: file.originalname,
      path: file.path ? '✅ HAS PATH' : '❌ NO PATH',
      size: file.size,
      fieldname: file.fieldname,
    } : '❌ NO FILE');

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
    console.log('[Upload DEBUG] Cloudinary URL:', file.path);
    
    const document = await Document.create({
      userId: req.user._id,
      title,
      fileName: file.originalname,
      filePath: file.path, // ✅ Cloudinary URL
      fileSize: file.size,
      status: "processing",
    });

    console.log('[Upload DEBUG] Document created:', document._id);

    // Process PDF asynchronously
    processPDFFromUrl(document._id, file.path).catch((err) => {
      console.error('🔥 [PDF Processing Async Error]:', err);
    });

    res.status(201).json({
      success: true,
      data: document,
      message: "Document uploaded successfully. Processing in progress...",
    });
  } catch (error) {
    console.error('🔥 [Upload Controller Error]:', error);
    next(error);
  }
};

// Helper function - Process PDF from Cloudinary URL using axios
const processPDFFromUrl = async (documentId, fileUrl) => {
  try {
    console.log('[PDF Processing DEBUG] Starting for URL:', fileUrl);
    
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
    });
    
    console.log('[PDF Processing DEBUG] Axios response status:', response.status);
    
    const buffer = Buffer.from(response.data);
    console.log('[PDF Processing DEBUG] Buffer created:', buffer.length, 'bytes');

    const result = await extractTextFromPDF(buffer);
    console.log('[PDF Processing DEBUG] Text extracted:', result.text ? result.text.substring(0, 100) + '...' : 'EMPTY');
    
    const text = result.text;

    const chunks = chunkText(text, 500, 50);
    console.log('[PDF Processing DEBUG] Chunks created:', chunks.length);

    await Document.findByIdAndUpdate(documentId, {
      extractedText: text,
      chunks,
      status: 'ready',
    });
    
    console.log('[PDF Processing DEBUG] Document updated successfully ✅');
  } catch (error) {
    console.error('❌ PDF PROCESS ERROR:', error.message);
    console.error('[PDF Processing ERROR]', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    await Document.findByIdAndUpdate(documentId, {
      status: 'failed',
    }).catch(err => console.error('🔥 Failed to update document status:', err));
  }
};

//@desc get all user documents
//@route GET /api/documents
//@access private
export const getDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({ userId: req.user._id });

    res.status(200).json({
      success: true,
      data: documents,
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

    res.status(200).json({
      success: true,
      data: document,
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

    // Delete document from database (Cloudinary handles file cleanup)
    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

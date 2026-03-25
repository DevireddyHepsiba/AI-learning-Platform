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
// Advanced retry mechanism with exponential backoff
const retryFetch = async (fileUrl, maxRetries = 3, delayMs = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Fetch Retry] Attempt ${attempt}/${maxRetries}`, fileUrl);
      
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout per request
        headers: {
          'User-Agent': 'Node.js PDF Processor',
        },
      });

      // Validate response
      if (!response.data || response.data.length === 0) {
        throw new Error('Response data is empty');
      }

      console.log('[Fetch Retry] ✅ Success on attempt', attempt);
      return response;
    } catch (error) {
      console.error(`[Fetch Retry] ❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const waitTime = delayMs * Math.pow(2, attempt - 1); // exponential backoff
        console.log(`[Fetch Retry] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw new Error(`Failed to fetch PDF after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }
};

// Helper function - Process PDF from Cloudinary URL using axios with retry logic
const processPDFFromUrl = async (documentId, fileUrl) => {
  let retryCount = 0;
  
  try {
    console.log('[PDF Processing] 🚀 Starting async processing for:', fileUrl);
    
    // Step 1: Fetch with retries
    console.log('[PDF Processing] Step 1: Fetching PDF from URL...');
    const response = await retryFetch(fileUrl, 3, 1000);
    
    console.log('[PDF Processing] ✅ Fetch successful:', {
      status: response.status,
      dataSize: response.data.length,
      contentType: response.headers['content-type'],
    });

    // Step 2: Create buffer
    console.log('[PDF Processing] Step 2: Converting to buffer...');
    if (!response.data || response.data.length === 0) {
      throw new Error('Response returned empty data');
    }

    const buffer = Buffer.from(response.data);
    console.log('[PDF Processing] ✅ Buffer created:', buffer.length, 'bytes');

    // Validation: Check if buffer looks like a PDF
    if (buffer.length < 100) {
      throw new Error(`Buffer too small: ${buffer.length} bytes (minimum 100)`);
    }

    const magicBytes = buffer.subarray(0, 4).toString('ascii');
    if (!magicBytes.startsWith('%PDF')) {
      console.warn('[PDF Processing] ⚠️ Warning: Magic bytes indicate this may not be a valid PDF:', magicBytes);
    }

    // Step 3: Extract text
    console.log('[PDF Processing] Step 3: Extracting text from PDF...');
    const result = await extractTextFromPDF(buffer);
    
    console.log('[PDF Processing] ✅ Text extraction successful:', {
      textLength: result.text?.length || 0,
      pages: result.numPages,
      preview: result.text ? result.text.substring(0, 100) + '...' : '(empty)',
    });

    const text = result.text || '';

    // Step 4: Chunk text
    console.log('[PDF Processing] Step 4: Creating text chunks...');
    const chunks = chunkText(text, 500, 50);
    console.log('[PDF Processing] ✅ Chunks created:', chunks.length);

    // Step 5: Update database
    console.log('[PDF Processing] Step 5: Updating database...');
    await Document.findByIdAndUpdate(documentId, {
      extractedText: text,
      chunks,
      status: 'ready',
    });

    console.log('[PDF Processing] ✅ SUCCESS: Document processed completely! 🎉');
  } catch (error) {
    console.error('❌ PDF PROCESS ERROR:', {
      documentId: documentId,
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Update document with failure status
    try {
      await Document.findByIdAndUpdate(documentId, {
        status: 'failed',
      });
      console.log('[PDF Processing] Document status updated to "failed"');
    } catch (updateError) {
      console.error('🔥 Failed to update document status:', updateError.message);
    }
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

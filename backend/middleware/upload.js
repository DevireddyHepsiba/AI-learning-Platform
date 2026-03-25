import multer from "multer";
import logger from "../utils/logger.js";

// Use memory storage so controller can access req.file.buffer
const storage = multer.memoryStorage();

// Validate PDF magic bytes (first bytes should include %PDF)
const isPdfBuffer = (buffer) => {
  if (!buffer || buffer.length < 4) return false;
  const header = buffer.slice(0, 4).toString('utf8');
  return header === '%PDF';
};

// Only allow PDFs (basic check via mime and magic bytes in middleware)
const fileFilter = (req, file, cb) => {
  if (file.mimetype !== 'application/pdf') {
    logger.warn('Upload rejected: wrong mime type', { mimetype: file.mimetype });
    return cb(new Error('Only PDF files are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
});

// Wrap to perform an extra magic-bytes check after multer has parsed the file
export const uploadPdf = (fieldName = 'file') => async (req, res, next) => {
  const multerSingle = upload.single(fieldName);
  multerSingle(req, res, function (err) {
    if (err) return next(err);
    try {
      if (!req.file) return next();
      if (!isPdfBuffer(req.file.buffer)) {
        logger.warn('Upload rejected: magic bytes mismatch', { filename: req.file.originalname });
        return res.status(400).json({ success: false, error: 'Uploaded file is not a valid PDF' });
      }
      next();
    } catch (e) {
      next(e);
    }
  });
};

export default upload;

// backend/config/multer.js

import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads/documents directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Use disk storage for multer - files are saved to disk for PDF processing
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomId-originalName
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const originalName = file.originalname;
    cb(null, `${timestamp}-${randomId}-${originalName}`);
  },
});

// File filter - only PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

// Configure multer with disk storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB default
  },
});

export default upload;

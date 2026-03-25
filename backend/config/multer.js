// backend/config/multer.js

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

/**
 * Cloudinary Storage for unsigned uploads (no API key required)
 * Files go directly to Cloudinary without server processing
 */
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "ai-learning-documents",
    resource_type: "auto",
    use_filename: true,
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

// Configure multer with memory storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB default
  },
});

export default upload;

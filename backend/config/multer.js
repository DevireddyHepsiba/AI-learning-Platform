// backend/config/multer.js

import multer from "multer";

/**
 * Memory storage - keep file in RAM for processing
 * We'll handle Cloudinary upload manually in the controller
 * This allows us to process the PDF AND upload to Cloudinary
 */
const storage = multer.memoryStorage();

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

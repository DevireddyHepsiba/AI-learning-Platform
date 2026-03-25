import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// 🔍 DEBUG: Verify Cloudinary is initialized
console.log('[Cloudinary DEBUG] Config loaded:', {
  cloud_name: cloudinary.config().cloud_name ? '✅ SET' : '❌ UNDEFINED',
  api_key: cloudinary.config().api_key ? '✅ SET' : '❌ UNDEFINED',
  api_secret: cloudinary.config().api_secret ? '✅ SET' : '❌ UNDEFINED',
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "ai-learning-documents",
    resource_type: "raw", // important for PDF
    format: async (req, file) => "pdf",
    public_id: (req, file) => Date.now() + "-" + file.originalname,
  },
});

const upload = multer({ storage });

export default upload;

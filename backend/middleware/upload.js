import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

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

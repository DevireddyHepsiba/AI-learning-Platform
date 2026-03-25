import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  // Allow unsigned uploads without authentication
  unsigned: true,
  // Make all resources publicly accessible
  secure: true,
});

export const cloudinaryUnsignedPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'ai_learning_docs';

export default cloudinary;
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary using server-side credentials.
// Keep only supported config keys.
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true,
});

// Optional unsigned preset name (still okay to keep for client-side unsigned uploads)
export const cloudinaryUnsignedPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "ai_learning_docs";

export default cloudinary;

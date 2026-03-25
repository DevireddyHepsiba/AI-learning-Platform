import { v2 as cloudinary } from "cloudinary";

// Validate required env vars
const required = ['CLOUD_NAME', 'CLOUD_API_KEY', 'CLOUD_API_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`Missing Cloudinary env vars: ${missing.join(', ')}`);
  // do not throw to avoid breaking dev machines that use different flows,
  // but it's recommended to set these in production.
}

// Configure Cloudinary using server-side credentials.
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true,
});

// Optional unsigned preset name (still okay to keep for client-side unsigned uploads)
export const cloudinaryUnsignedPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "ai_learning_docs";

export default cloudinary;

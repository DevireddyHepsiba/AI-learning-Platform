import cloudinary from '../config/cloudinary.js';
import { promisify } from 'util';
import logger from './logger.js';

const uploaderUploadStream = cloudinary.uploader.upload_stream.bind(cloudinary.uploader);

// uploadBuffer: upload a Buffer to Cloudinary as raw resource
export const uploadBuffer = async (buffer, options = {}) => {
  const opts = Object.assign({ folder: 'ai-learning-documents', resource_type: 'raw' }, options);

  return new Promise((resolve, reject) => {
    try {
      const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
      stream.end(buffer);
    } catch (err) {
      reject(err);
    }
  });
};

// deleteResource: delete by public id
export const deleteResource = async (publicId, options = {}) => {
  if (!publicId) throw new Error('publicId is required');
  const opts = Object.assign({ resource_type: 'raw' }, options);
  try {
    const result = await cloudinary.uploader.destroy(publicId, opts);
    return result;
  } catch (err) {
    logger.warn('cloudinaryHelper.deleteResource failed', { publicId, err: err.message });
    throw err;
  }
};

export default { uploadBuffer, deleteResource };

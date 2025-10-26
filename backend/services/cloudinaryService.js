import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * Upload base64 image to Cloudinary
 * @param {string} base64 - Base64 encoded image string (data:image/...;base64,...)
 * @param {string} folder - Cloudinary folder path (default: 'revibe/listings')
 * @returns {Promise<string>} - Cloudinary URL
 */
export async function uploadBase64ToCloudinary(base64, folder = 'revibe/listings') {
  try {
    const result = await cloudinary.uploader.upload(base64, {
      folder,
      resource_type: 'image',
      // Optional: resize/compress images
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto' }
      ]
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
  }
}

/**
 * Upload multiple base64 images to Cloudinary
 * @param {string[]} base64Images - Array of base64 image strings
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise<string[]>} - Array of Cloudinary URLs
 */
export async function uploadMultipleBase64ToCloudinary(base64Images, folder = 'revibe/listings') {
  const urls = [];
  for (const base64 of base64Images) {
    try {
      const url = await uploadBase64ToCloudinary(base64, folder);
      urls.push(url);
    } catch (error) {
      console.error(`Failed to upload image: ${error.message}`);
      // Continue with other images even if one fails
      urls.push(''); // placeholder for failed upload
    }
  }
  return urls.filter(url => url); // remove empty placeholders
}

/**
 * Delete image from Cloudinary by URL
 * @param {string} url - Cloudinary URL to delete
 */
export async function deleteFromCloudinary(url) {
  if (!url || !url.includes('cloudinary.com')) return;

  try {
    // Extract public_id from URL
    const parts = url.split('/');
    const fileName = parts[parts.length - 1].split('.')[0];
    const folder = parts[parts.length - 2];
    const publicId = `revibe/listings/${fileName}`;

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
}

/**
 * Check if string is base64 encoded image
 * @param {string} str - String to check
 * @returns {boolean}
 */
export function isBase64Image(str) {
  return str && str.startsWith('data:image/') && str.includes(';base64,');
}

import express from 'express';
import { uploadSingle, uploadMultiple, getImageUrl, deleteImage, getImagePath } from '../middleware/imageUpload.js';
import fs from 'fs';

const router = express.Router();

/**
 * Upload a single image
 * Replaces Firebase Storage upload functionality
 * @param {string} fieldName - Form field name for the image (e.g., 'image', 'profileImage', 'bannerImage')
 * @body {file} The image file to upload
 * @returns {object} { success: true, filename: string, url: string }
 */
router.post('/single/:fieldName', uploadSingle('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fieldName = req.params.fieldName || 'products';
    const filename = req.file.filename;
    const imageUrl = getImageUrl(filename, fieldName);

    console.log('✅ Image uploaded successfully:', imageUrl);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      filename,
      url: imageUrl,
      path: imageUrl
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: error.message
    });
  }
});

/**
 * Upload multiple images
 * Replaces Firebase Storage batch upload functionality
 * @param {string} fieldName - Form field name for images
 * @body {files} Array of image files to upload
 * @returns {object} { success: true, files: [{filename, url}], urls: string[] }
 */
router.post('/multiple/:fieldName', uploadMultiple('images', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const fieldName = req.params.fieldName || 'products';
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      url: getImageUrl(file.filename, fieldName)
    }));

    const urls = uploadedFiles.map(f => f.url);

    console.log('✅ All images uploaded successfully');

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      count: uploadedFiles.length,
      files: uploadedFiles,
      urls
    });
  } catch (error) {
    console.error('❌ Error uploading multiple images:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading images',
      error: error.message
    });
  }
});

/**
 * Delete an image
 * Replaces Firebase Storage delete functionality
 * @param {string} filename - Name of the file to delete
 * @param {string} folder - Folder type (e.g., 'products', 'vendor-profiles', 'vendor-banners')
 * @returns {object} { success: true, message: string }
 */
router.delete('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const { folder = 'products' } = req.query;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required'
      });
    }

    deleteImage(filename, folder);

    console.log('✅ Image deleted successfully:', filename);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      filename
    });
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message
    });
  }
});

/**
 * Delete image by URL
 * Replaces Firebase Storage delete by URL functionality
 * @body {url} The image URL to delete (extracts filename from URL)
 * @returns {object} { success: true, message: string }
 */
router.post('/delete-by-url', (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    // Extract filename from URL (e.g., /uploads/products/filename.jpg -> filename.jpg)
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const folder = urlParts[urlParts.length - 2] || 'products';

    deleteImage(filename, folder);

    console.log('✅ Image deleted successfully:', url);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      url
    });
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message
    });
  }
});

export default router;

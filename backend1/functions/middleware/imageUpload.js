import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create subdirectories for different image types
const imageTypes = ['vendor-profiles', 'vendor-banners', 'products', 'licenses'];
imageTypes.forEach(type => {
  const typeDir = path.join(uploadsDir, type);
  if (!fs.existsSync(typeDir)) {
    fs.mkdirSync(typeDir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'products'; // default

    // Determine folder based on field name
    if (file.fieldname === 'profileImage') {
      folder = 'vendor-profiles';
    } else if (file.fieldname === 'bannerImage') {
      folder = 'vendor-banners';
    } else if (file.fieldname === 'businessLicenseImage') {
      folder = 'licenses';
    } else if (file.fieldname === 'image' || file.fieldname === 'images') {
      folder = 'products';
    }

    const uploadPath = path.join(uploadsDir, folder);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF files are allowed.'));
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Single file upload middleware
export const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// Multiple files upload middleware
export const uploadMultiple = (fieldName, maxFiles = 5) => {
  return upload.array(fieldName, maxFiles);
};

// Multiple different fields
export const uploadFields = (fields) => {
  return upload.fields(fields);
};

// Helper function to get image URL
export const getImageUrl = (filename, folder = 'products') => {
  if (!filename) return null;
  // Return absolute URL so frontend can load from correct origin
  const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
  return `${baseUrl}/uploads/${folder}/${filename}`;
};

// Helper function to delete image
export const deleteImage = (filename, folder = 'products') => {
  if (!filename) return;

  const filePath = path.join(uploadsDir, folder, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};

// Helper function to get full image path
export const getImagePath = (filename, folder = 'products') => {
  return path.join(uploadsDir, folder, filename);
};

export default upload;

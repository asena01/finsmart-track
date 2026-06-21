import express from 'express';
import { uploadFields} from '../middleware/imageUpload.js';
import {
  getVendorProfile,
  createOrUpdateVendorProfile,
  getVendorStats,
  getVendorProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getVendorOrders
} from '../controllers/vendorController.js';

const router = express.Router();

// Vendor Profile Routes
router.get('/profile/:userId', getVendorProfile);

router.post(
  '/profile/:userId',
  uploadFields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
    { name: 'businessLicenseImage', maxCount: 1 }
  ]),
  createOrUpdateVendorProfile
);

// Vendor Stats
router.get('/stats/:userId', getVendorStats);

// Product Routes
router.get('/products/:userId/:vendorType', getVendorProducts);

router.post(
  '/products/:userId/:vendorType',
  uploadFields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 5 }
  ]),
  createProduct
);

router.put(
  '/products/:userId/:vendorType/:productId',
  uploadFields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 5 }
  ]),
  updateProduct
);

router.delete('/products/:userId/:vendorType/:productId', deleteProduct);

// Order Routes
router.get('/orders/:userId', getVendorOrders);

export default router;

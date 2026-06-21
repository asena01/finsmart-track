import express from 'express';
import {
  getVendorProfile,
  createOrUpdateVendorProfile,
  getVendorStats
} from '../controllers/vendorController.js';

const router = express.Router();

// ============================================
// PROVIDER PROFILE ROUTES
// Maps /service-providers/* to vendor endpoints
// ============================================

// GET provider profile
router.get('/:providerId', async (req, res, next) => {
  req.params.userId = req.params.providerId;
  getVendorProfile(req, res);
});

// Update provider profile (PUT wrapper around POST)
router.put('/:providerId', async (req, res, next) => {
  req.params.userId = req.params.providerId;
  createOrUpdateVendorProfile(req, res);
});

// GET provider stats
router.get('/:providerId/stats', async (req, res, next) => {
  req.params.userId = req.params.providerId;
  getVendorStats(req, res);
});

// ============================================
// BADGE COUNTS ROUTES
// ============================================

// GET badge counts for dashboard sidenav
router.get('/:providerId/badge-counts', async (req, res, next) => {
  try {
    return res.status(200).json({
      status: 'success',
      data: {
        pendingAppointments: 0,
        pendingReviews: 0,
        activeIncidents: 0,
        unreadNotifications: 0
      }
    });
  } catch (error) {
    console.error('Error fetching badge counts:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      data: {
        pendingAppointments: 0,
        pendingReviews: 0,
        activeIncidents: 0,
        unreadNotifications: 0
      }
    });
  }
});

export default router;

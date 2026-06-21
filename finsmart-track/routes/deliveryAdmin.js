import express from 'express';
import * as deliveryAdminController from '../controllers/deliveryAdminController.js';

const router = express.Router();

// ============================================
// DELIVERY PARTNER ROUTES
// ============================================
router.post('/partners', deliveryAdminController.createDeliveryPartner);
router.get('/partners', deliveryAdminController.getDeliveryPartners);
router.patch('/partners/:id/verify', deliveryAdminController.verifyDeliveryPartner);
router.put('/partners/:id', deliveryAdminController.updateDeliveryPartner);

// ============================================
// DEFAULT ZONE TEMPLATES
// ============================================
router.get('/zones/templates/defaults', deliveryAdminController.getDefaultZoneTemplates);
router.post('/zones/templates/enable', deliveryAdminController.enableDefaultZone);

// ============================================
// DELIVERY ZONE ROUTES
// ============================================
router.post('/zones', deliveryAdminController.createDeliveryZone);
router.get('/zones', deliveryAdminController.getDeliveryZones);
router.put('/zones/:id', deliveryAdminController.updateDeliveryZone);

// ============================================
// DELIVERY CONFIGURATION ROUTES (Provider Settings)
// ============================================
router.get('/config/:providerId', deliveryAdminController.getProviderDeliveryConfig);
router.put('/config/:providerId', deliveryAdminController.updateProviderDeliveryConfig);
router.post('/config/:providerId/select-partner', deliveryAdminController.selectDeliveryPartner);
router.delete('/config/:providerId/partner/:partnerId', deliveryAdminController.removeDeliveryPartner);
router.patch('/config/:providerId/default-partner/:partnerId', deliveryAdminController.setDefaultDeliveryPartner);

// ============================================
// DELIVERY TRACKING ROUTES
// ============================================
router.get('/deliveries', deliveryAdminController.getDeliveries);
router.patch('/deliveries/:deliveryId/status', deliveryAdminController.updateDeliveryStatus);

// ============================================
// ANALYTICS & REPORTS
// ============================================
router.get('/analytics', deliveryAdminController.getDeliveryAnalytics);
router.post('/calculate-cost', deliveryAdminController.calculateDeliveryCost);

export default router;

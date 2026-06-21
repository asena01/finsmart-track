import express from 'express';
import {
  createCheckoutSession,
  getSessionDetails,
  handleWebhook,
  getOrder,
  getOrdersByEmail,
  createPaymentIntent,
  processPayment,
  getPaymentMethods
} from '../controllers/paymentController.js';

const router = express.Router();

// POST: Create checkout session
router.post('/checkout', createCheckoutSession);

// GET: Get session details
router.get('/session/:sessionId', getSessionDetails);

// POST: Create payment intent
router.post('/intent', createPaymentIntent);

// GET: Get order details
router.get('/order/:orderId', getOrder);

// GET: Get orders by email
router.get('/orders/:email', getOrdersByEmail);

// POST: Process manual payments (credit card, debit card, bank transfer, mobile money)
router.post('/process', processPayment);

// GET: Get available payment methods
router.get('/methods', getPaymentMethods);

// POST: Webhook endpoint (raw body, not JSON parsed)
router.post('/webhook', (req, res, _next) => {
  // This middleware will be added in server.js for proper webhook handling
  handleWebhook(req, res);
});

export default router;

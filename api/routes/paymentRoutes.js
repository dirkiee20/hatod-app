import express from 'express';
import {
  createCheckoutSession,
  handleWebhook,
  getPaymentStatus
} from '../controllers/paymentsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/payments/create-checkout-session
 * @desc    Create a PayMongo Payment Intent and get checkout URL
 * @access  Private (Customer)
 */
router.post('/create-checkout-session', authenticate, createCheckoutSession);

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle PayMongo webhook events (payment.paid, payment.failed)
 * @access  Public (PayMongo webhooks)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

/**
 * @route   GET /api/payments/status/:paymentIntentId
 * @desc    Get payment intent status
 * @access  Private (Customer)
 */
router.get('/status/:paymentIntentId', authenticate, getPaymentStatus);

export default router;

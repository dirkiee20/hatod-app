import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createPaymentSource,
  createPaymentFromSource,
  handlePaymongoWebhook,
  getPaymentStatus
} from '../controllers/paymentsController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Webhook endpoint (no auth required, uses signature verification)
router.post(
  '/webhook',
  handlePaymongoWebhook
);

// Authenticated routes
router.use(authenticate);

// Create GCash payment source
router.post(
  '/create-source',
  [
    body('orderId').isUUID().withMessage('Valid order ID is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('redirectSuccess').optional().isURL().withMessage('Invalid success URL'),
    body('redirectFailed').optional().isURL().withMessage('Invalid failed URL')
  ],
  validate,
  createPaymentSource
);

// Create payment from source
router.post(
  '/create-payment',
  [
    body('sourceId').notEmpty().withMessage('Source ID is required'),
    body('orderId').isUUID().withMessage('Valid order ID is required')
  ],
  validate,
  createPaymentFromSource
);

// Get payment status
router.get(
  '/status/:orderId',
  [param('orderId').isUUID()],
  validate,
  getPaymentStatus
);

export default router;


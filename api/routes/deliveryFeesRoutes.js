import { Router } from 'express';
import { param, body } from 'express-validator';
import {
  calculateDeliveryFee,
  getDeliveryFeeTiers,
  listAllDeliveryFeeTiers,
  upsertDeliveryFeeTier,
  deleteDeliveryFeeTier,
  getDeliveryFee
} from '../controllers/deliveryFeesController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Public endpoints
router.post('/calculate', [
  body('barangay').isString().notEmpty(),
  body('orderAmount').isFloat({ min: 0 })
], validate, calculateDeliveryFee);

router.get('/tiers', listAllDeliveryFeeTiers);
router.get('/tiers/:barangay', [param('barangay').isString()], validate, getDeliveryFeeTiers);

// Legacy endpoint for backward compatibility
router.get('/:barangay', [param('barangay').isString()], validate, getDeliveryFee);

// Admin endpoints
router.post('/tiers',
  authenticate,
  requireRoles('admin'),
  [
    body('barangay').isString().notEmpty(),
    body('minOrderAmount').isFloat({ min: 0 }),
    body('maxOrderAmount').isFloat({ min: 0 }),
    body('deliveryFee').isFloat({ min: 0 }),
    body('isActive').optional().isBoolean()
  ],
  validate,
  upsertDeliveryFeeTier
);

router.delete('/tiers/:tierId',
  authenticate,
  requireRoles('admin'),
  [param('tierId').isUUID()],
  validate,
  deleteDeliveryFeeTier
);

export default router;


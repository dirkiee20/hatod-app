import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createOrder,
  getOrderById,
  getCustomerOrders,
  updateOrderStatus,
  getOrderStatusHistory
} from '../controllers/ordersController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post(
  '/',
  authenticate,
  requireRoles('customer'),
  [
    body('customerId').isUUID(),
    body('restaurantId').isUUID(),
    body('orderType').optional().isIn(['delivery', 'pickup']),
    body('items').isArray({ min: 1 }),
    body('items.*.menuItemId').isUUID(),
    body('items.*.quantity').isInt({ min: 1 })
  ],
  validate,
  createOrder
);

router.get(
  '/',
  authenticate,
  requireRoles('customer'),
  getCustomerOrders
);

router.get(
  '/:orderId',
  authenticate,
  [param('orderId').isUUID()],
  validate,
  getOrderById
);

router.patch(
  '/:orderId/status',
  authenticate,
  [
    param('orderId').isUUID(),
    body('status').isString(),
    body('note').optional().isString()
  ],
  validate,
  updateOrderStatus
);

router.get(
  '/:orderId/history',
  authenticate,
  [param('orderId').isUUID()],
  validate,
  getOrderStatusHistory
);

export default router;


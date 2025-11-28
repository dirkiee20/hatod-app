import { Router } from 'express';
import { body, param, query } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getUsers,
  getUserStats,
  createRestaurantUser,
  createDeliveryUser,
  deactivateUser,
  activateUser,
  getOverviewStats,
  getAdminOrders,
  getRealTimeOrders,
  getDailyOrderVolume,
  getRevenueTrends,
  getAdminRestaurants,
  approveRestaurant,
  rejectRestaurant,
  adjustRestaurantPrices,
  resetRestaurantPrices,
  getPaymentQrCode,
  uploadPaymentQrCode,
  setMenuItemMarkup,
  getRestaurantMenuItems,
  generateDailyReport,
  getAdminProfile,
  updateAdminProfile,
  uploadAdminProfileImage
} from '../controllers/adminController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');

const ensureUploadDir = (subdir) => {
  const uploadPath = path.join(uploadsRoot, subdir);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return uploadPath;
};

const createImageUpload = (subdir, prefix) => multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, ensureUploadDir(subdir));
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const qrCodeImageUpload = createImageUpload('payment', 'qr-code');

const router = Router();
// Temporarily disable authentication for development
// router.use(authenticate, requireRoles('admin'));

router.get(
  '/users',
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('userType')
      .optional()
      .isIn(['all', 'customer', 'restaurant', 'delivery', 'admin']),
    query('status')
      .optional()
      .isIn(['all', 'active', 'inactive', 'suspended'])
  ],
  validate,
  getUsers
);

router.get('/users/stats', getUserStats);
router.get('/overview', getOverviewStats);
router.get('/orders/realtime', getRealTimeOrders);
router.get('/analytics/daily-orders', getDailyOrderVolume);
router.get('/analytics/revenue-trends', getRevenueTrends);

router.get(
  '/restaurants',
  [
    query('search').optional().isString(),
    query('approvalStatus').optional().isIn(['all', 'pending', 'approved', 'rejected']),
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  getAdminRestaurants
);
router.get(
  '/orders',
  [
    query('status').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('restaurantId').optional().isUUID(),
    query('customerId').optional().isUUID()
  ],
  validate,
  getAdminOrders
);

router.post(
  '/users/restaurant',
  [
    body('restaurantName').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
  ],
  validate,
  createRestaurantUser
);

router.post(
  '/users/delivery',
  [
    body('driverName').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
  ],
  validate,
  createDeliveryUser
);

router.patch(
  '/users/:userId/deactivate',
  [param('userId').isUUID()],
  validate,
  deactivateUser
);

router.patch(
  '/users/:userId/activate',
  [param('userId').isUUID()],
  validate,
  activateUser
);

// Restaurant management routes
router.post(
  '/restaurants/:restaurantId/approve',
  [param('restaurantId').isUUID()],
  validate,
  approveRestaurant
);

router.post(
  '/restaurants/:restaurantId/reject',
  [param('restaurantId').isUUID()],
  validate,
  rejectRestaurant
);

router.post(
  '/restaurants/:restaurantId/adjust-prices',
  [
    param('restaurantId').isUUID(),
    body('percentage').isFloat({ min: 0, max: 100 })
  ],
  validate,
  adjustRestaurantPrices
);

router.post(
  '/restaurants/:restaurantId/reset-prices',
  [param('restaurantId').isUUID()],
  validate,
  resetRestaurantPrices
);

// Get payment QR code
router.get(
  '/payment/qr-code',
  getPaymentQrCode
);

// Upload payment QR code
router.post(
  '/payment/qr-code',
  qrCodeImageUpload.single('qrCode'),
  uploadPaymentQrCode
);

// Menu item markup routes
router.post(
  '/restaurants/:restaurantId/menu-items/:menuItemId/markup',
  [
    param('restaurantId').isUUID(),
    param('menuItemId').isUUID(),
    body('markupAmount').isFloat({ min: 0 }).optional(),
    body('markupPercentage').isFloat({ min: 0, max: 100 }).optional(),
    body('approvalStatus').optional().isIn(['pending', 'approved', 'rejected'])
  ],
  validate,
  setMenuItemMarkup
);

router.get(
  '/restaurants/:restaurantId/menu-items',
  [
    param('restaurantId').isUUID()
  ],
  validate,
  getRestaurantMenuItems
);

// Generate daily report
router.get(
  '/reports/daily',
  validate,
  generateDailyReport
);

// Admin profile routes
router.get(
  '/profile',
  authenticate,
  requireRoles('admin'),
  getAdminProfile
);

router.patch(
  '/profile',
  authenticate,
  requireRoles('admin'),
  [
    body('fullName').optional().isString().isLength({ min: 1 }),
    body('phone').optional().isString()
  ],
  validate,
  updateAdminProfile
);

const adminProfileImageUpload = createImageUpload('profiles', 'admin');
router.post(
  '/profile/upload-image',
  authenticate,
  requireRoles('admin'),
  adminProfileImageUpload.single('image'),
  uploadAdminProfileImage
);

export default router;


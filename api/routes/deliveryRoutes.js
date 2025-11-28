import { Router } from 'express';
import { body, param, query } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  listAssignments,
  updateDeliveryStatus,
  claimDelivery,
  collectCashPayment,
  listAvailableOrders,
  getRiderStats,
  getRiderProfile,
  updateRiderProfile,
  toggleRiderAvailability,
  uploadRiderProfileImage,
  requestDelivery,
  requestRider,
  listAvailableRiders,
  acceptDeliveryRequest,
  rejectDeliveryRequest,
  listRestaurantDeliveryRequests,
  listRiderDeliveryRequests
} from '../controllers/deliveryController.js';
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
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const profileImageUpload = createImageUpload('profiles', 'rider');

const router = Router();

router.get(
  '/riders/:riderId/assignments',
  authenticate,
  requireRoles('delivery', 'admin'),
  [param('riderId').isUUID(), query('status').optional().isString()],
  validate,
  listAssignments
);

// Get current rider's assignments
router.get(
  '/riders/assignments',
  authenticate,
  requireRoles('delivery', 'admin'),
  [query('status').optional().isString()],
  validate,
  (req, res) => listAssignments(req, res)
);

router.patch(
  '/assignments/:deliveryId/status',
  authenticate,
  requireRoles('delivery', 'admin'),
  [param('deliveryId').isUUID(), body('status').notEmpty()],
  validate,
  updateDeliveryStatus
);

router.patch(
  '/assignments/:deliveryId/collect-cash',
  authenticate,
  requireRoles('delivery', 'admin'),
  [param('deliveryId').isUUID(), body('amount').isNumeric()],
  validate,
  collectCashPayment
);

router.post(
  '/assignments/:deliveryId/claim',
  authenticate,
  requireRoles('delivery', 'admin'),
  [param('deliveryId').isUUID()],
  validate,
  claimDelivery
);

// Get available orders for riders to claim (no auth required)
router.get(
  '/available-orders',
  listAvailableOrders
);

// Get rider statistics for dashboard
router.get(
  '/riders/stats',
  authenticate,
  requireRoles('delivery', 'admin'),
  getRiderStats
);

router.get(
  '/riders/:riderId/stats',
  authenticate,
  requireRoles('delivery', 'admin'),
  [param('riderId').isUUID()],
  validate,
  getRiderStats
);

// Get rider profile information
router.get(
  '/riders/:riderId/profile',
  authenticate,
  requireRoles('delivery', 'admin'),
  [param('riderId').isUUID()],
  validate,
  getRiderProfile
);

// Update rider profile information
router.patch(
  '/riders/:riderId/profile',
  authenticate,
  requireRoles('delivery', 'admin'),
  [
    param('riderId').isUUID(),
    body('fullName').optional().isString().isLength({ min: 1 }),
    body('phone').optional().isString(),
    body('vehicleType').optional().isString(),
    body('licenseNumber').optional().isString(),
    body('licenseExpiry').optional().isISO8601().toDate()
  ],
  validate,
  updateRiderProfile
);

// Upload rider profile image
router.post(
  '/riders/:riderId/profile/upload-image',
  authenticate,
  requireRoles('delivery', 'admin'),
  profileImageUpload.single('image'),
  [param('riderId').isUUID()],
  validate,
  uploadRiderProfileImage
);

// Toggle rider availability
router.patch(
  '/riders/:riderId/availability',
  authenticate,
  requireRoles('delivery', 'admin'),
  [
    param('riderId').isUUID(),
    body('isAvailable').isBoolean()
  ],
  validate,
  toggleRiderAvailability
);

// Rider requests to pick up an order
router.post(
  '/deliveries/:deliveryId/request',
  authenticate,
  requireRoles('delivery', 'admin'),
  [param('deliveryId').isUUID()],
  validate,
  requestDelivery
);

// Restaurant requests a specific rider
router.post(
  '/deliveries/:deliveryId/request-rider/:riderId',
  authenticate,
  requireRoles('restaurant', 'admin'),
  [param('deliveryId').isUUID(), param('riderId').isUUID()],
  validate,
  requestRider
);

// List available riders for restaurant
router.get(
  '/riders/available',
  authenticate,
  requireRoles('restaurant', 'admin'),
  listAvailableRiders
);

// Accept delivery request
router.post(
  '/requests/:requestId/accept',
  authenticate,
  requireRoles('restaurant', 'delivery', 'admin'),
  [param('requestId').isUUID()],
  validate,
  acceptDeliveryRequest
);

// Reject delivery request
router.post(
  '/requests/:requestId/reject',
  authenticate,
  requireRoles('restaurant', 'delivery', 'admin'),
  [param('requestId').isUUID()],
  validate,
  rejectDeliveryRequest
);

// List pending delivery requests for restaurant
router.get(
  '/restaurants/delivery-requests',
  authenticate,
  requireRoles('restaurant', 'admin'),
  listRestaurantDeliveryRequests
);

// List pending delivery requests for rider
router.get(
  '/riders/delivery-requests',
  authenticate,
  requireRoles('delivery', 'admin'),
  listRiderDeliveryRequests
);

export default router;


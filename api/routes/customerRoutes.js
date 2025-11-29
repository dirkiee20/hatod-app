import { Router } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import {
  getProfile,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  listCustomerOrders,
  uploadProfileImage,
  toggleFavorite,
  getFavorites,
  checkFavorite,
  deleteAccount
} from '../controllers/customersController.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

// Use memory storage for Supabase uploads
const profileImageUpload = multer({
  storage: multer.memoryStorage(),
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
}).single('image');

const router = Router({ mergeParams: true });

router.use(authenticate, requireRoles('customer', 'admin'));

router.get('/:customerId/profile', [param('customerId').isUUID()], validate, getProfile);
router.put(
  '/:customerId/profile',
  [
    param('customerId').isUUID(),
    body('fullName').optional().isString().isLength({ min: 1 }),
    body('phone').optional().isString(),
    body('barangay').optional().isString()
  ],
  validate,
  updateProfile
);
router.patch(
  '/:customerId/profile',
  [
    param('customerId').isUUID(),
    body('fullName').optional().isString().isLength({ min: 1 }),
    body('phone').optional().isString(),
    body('imageUrl').optional().isString(),
    body('barangay').optional().isString()
  ],
  validate,
  updateProfile
);

router.get(
  '/:customerId/addresses',
  [param('customerId').isUUID()],
  validate,
  listAddresses
);

router.post(
  '/:customerId/addresses',
  [
    param('customerId').isUUID(),
    body('streetAddress').notEmpty(),
    body('city').notEmpty(),
    body('zipCode').notEmpty(),
    body('isDefault').optional().isBoolean().toBoolean()
  ],
  validate,
  createAddress
);

router.put(
  '/:customerId/addresses/:addressId',
  [
    param('customerId').isUUID(),
    param('addressId').isUUID(),
    body('isDefault').optional().isBoolean().toBoolean()
  ],
  validate,
  updateAddress
);

router.delete(
  '/:customerId/addresses/:addressId',
  [param('customerId').isUUID(), param('addressId').isUUID()],
  validate,
  deleteAddress
);

router.get(
  '/:customerId/orders',
  [param('customerId').isUUID()],
  validate,
  listCustomerOrders
);

router.post(
  '/:customerId/profile/upload-image',
  profileImageUpload,
  [param('customerId').isUUID()],
  validate,
  uploadProfileImage
);

router.post(
  '/:customerId/favorites',
  [
    param('customerId').isUUID(),
    body('restaurantId').isUUID()
  ],
  validate,
  toggleFavorite
);

router.get(
  '/:customerId/favorites',
  [param('customerId').isUUID()],
  validate,
  getFavorites
);

router.get(
  '/:customerId/favorites/:restaurantId',
  [param('customerId').isUUID(), param('restaurantId').isUUID()],
  validate,
  checkFavorite
);

router.delete(
  '/:customerId/account',
  [param('customerId').isUUID()],
  validate,
  deleteAccount
);

export default router;


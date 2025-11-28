import { Router } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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

const profileImageUpload = createImageUpload('profiles', 'customer');

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
  profileImageUpload.single('image'),
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


import { Router } from 'express';
import { body, param, query } from 'express-validator';
import multer from 'multer';
import {
  listRestaurants,
  getRestaurant,
  getRestaurantMenu,
  getMenuItem,
  getCurrentUserRestaurant,
  createMenuCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createMenuItemVariant,
  updateMenuItemVariant,
  deleteMenuItemVariant,
  getRestaurantOrders,
  getRestaurantDashboardStats,
  updateRestaurantDetails,
  toggleRestaurantStatus,
  uploadRestaurantLogo,
  uploadRestaurantBanner,
  uploadMenuItemImage,
  getBusinessHours,
  updateBusinessHours
} from '../controllers/restaurantsController.js';
import { authenticate, optionalAuthenticate, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Use memory storage for Supabase uploads
const imageUpload = multer({
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
});

const logoUpload = imageUpload.single('logo');
const bannerUpload = imageUpload.single('banner');
const menuItemImageUpload = imageUpload.single('image');

// Public endpoints
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('isOpen').optional().isBoolean()
  ],
  validate,
  listRestaurants
);
router.get('/current/?', authenticate, requireRoles('restaurant', 'admin'), getCurrentUserRestaurant);
router.get('/:restaurantId', optionalAuthenticate, [param('restaurantId').isUUID()], validate, getRestaurant);
router.get(
  '/:restaurantId/menu',
  optionalAuthenticate,
  [param('restaurantId').isUUID()],
  validate,
  getRestaurantMenu
);
router.get(
  '/:restaurantId/menu/items/:menuItemId',
  [param('restaurantId').isUUID(), param('menuItemId').isUUID()],
  validate,
  getMenuItem
);

// Authenticated restaurant owners / admins
router.use(authenticate, requireRoles('restaurant', 'admin'));

router.post(
  '/:restaurantId/menu/categories',
  [
    param('restaurantId').isUUID(),
    body('name').notEmpty(),
    body('displayOrder').optional().isInt({ min: 0 })
  ],
  validate,
  createMenuCategory
);

router.post(
  '/:restaurantId/menu/items',
  [
    param('restaurantId').isUUID(),
    body('name').notEmpty(),
    body('price').isFloat({ gt: 0 })
  ],
  validate,
  createMenuItem
);

router.put(
  '/:restaurantId/menu/items/:menuItemId',
  [param('restaurantId').isUUID(), param('menuItemId').isUUID()],
  validate,
  updateMenuItem
);

router.delete(
  '/:restaurantId/menu/items/:menuItemId',
  [param('restaurantId').isUUID(), param('menuItemId').isUUID()],
  validate,
  deleteMenuItem
);

router.post(
  '/:restaurantId/menu/items/:menuItemId/variants',
  [
    param('restaurantId').isUUID(),
    param('menuItemId').isUUID(),
    body('name').notEmpty(),
    body('price').isFloat({ gt: 0 })
  ],
  validate,
  createMenuItemVariant
);

router.put(
  '/:restaurantId/menu/items/:menuItemId/variants/:variantId',
  [
    param('restaurantId').isUUID(),
    param('menuItemId').isUUID(),
    param('variantId').isUUID()
  ],
  validate,
  updateMenuItemVariant
);

router.delete(
  '/:restaurantId/menu/items/:menuItemId/variants/:variantId',
  [
    param('restaurantId').isUUID(),
    param('menuItemId').isUUID(),
    param('variantId').isUUID()
  ],
  validate,
  deleteMenuItemVariant
);

router.get(
  '/:restaurantId/orders',
  [param('restaurantId').isUUID()],
  validate,
  getRestaurantOrders
);

router.get(
  '/:restaurantId/dashboard/stats',
  [param('restaurantId').isUUID()],
  validate,
  getRestaurantDashboardStats
);

router.patch(
  '/:restaurantId',
  [param('restaurantId').isUUID()],
  validate,
  updateRestaurantDetails
);

router.post(
  '/:restaurantId/toggle-status',
  [param('restaurantId').isUUID()],
  validate,
  toggleRestaurantStatus
);

router.post(
  '/:restaurantId/logo',
  logoUpload,
  [param('restaurantId').isUUID()],
  validate,
  uploadRestaurantLogo
);

router.post(
  '/:restaurantId/banner',
  bannerUpload,
  [param('restaurantId').isUUID()],
  validate,
  uploadRestaurantBanner
);

router.post(
  '/:restaurantId/menu/items/upload-image',
  menuItemImageUpload,
  [param('restaurantId').isUUID()],
  validate,
  uploadMenuItemImage
);

router.get(
  '/:restaurantId/business-hours',
  [param('restaurantId').isUUID()],
  validate,
  getBusinessHours
);

router.put(
  '/:restaurantId/business-hours',
  [
    param('restaurantId').isUUID(),
    body('businessHours').isArray()
  ],
  validate,
  updateBusinessHours
);

export default router;


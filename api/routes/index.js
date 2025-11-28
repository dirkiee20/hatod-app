import { Router } from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import customerRoutes from './customerRoutes.js';
import restaurantRoutes from './restaurantRoutes.js';
import orderRoutes from './orderRoutes.js';
import deliveryRoutes from './deliveryRoutes.js';
import cartRoutes from './cartRoutes.js';
import deliveryFeesRoutes from './deliveryFeesRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/customers', customerRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/orders', orderRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/cart', cartRoutes);
router.use('/delivery-fees', deliveryFeesRoutes);

export default router;


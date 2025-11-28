import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount
} from '../controllers/cartController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);

// Get user's cart
router.get('/', getCart);

// Get cart count
router.get('/count', getCartCount);

// Add item to cart
router.post('/', addToCart);

// Update cart item
router.put('/:cartItemId', updateCartItem);

// Remove item from cart
router.delete('/:cartItemId', removeFromCart);

// Clear entire cart
router.delete('/', clearCart);

export default router;
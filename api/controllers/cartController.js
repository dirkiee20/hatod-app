import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';

// Get user's cart items
export const getCart = asyncHandler(async (req, res) => {
  const userId = req.user.sub;

  const result = await query(
    `SELECT ci.id,
            ci.quantity,
            ci.special_instructions AS "specialInstructions",
            mi.id AS "menuItemId",
            mi.name,
            mi.description,
            mi.price,
            mi.image_url AS "imageUrl",
            mi.is_available AS "isAvailable",
            r.id AS "restaurantId",
            r.name AS "restaurantName",
            r.image_url AS "restaurantImageUrl"
     FROM cart_items ci
     JOIN menu_items mi ON mi.id = ci.menu_item_id
     JOIN restaurants r ON r.id = mi.restaurant_id
     WHERE ci.user_id = $1
     ORDER BY ci.created_at ASC`,
    [userId]
  );

  res.json({
    status: 'success',
    data: result.rows
  });
});

// Add item to cart
export const addToCart = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { menuItemId, quantity = 1, specialInstructions } = req.body;

  if (!menuItemId) {
    throw badRequest('Menu item ID is required');
  }

  if (quantity < 1) {
    throw badRequest('Quantity must be at least 1');
  }

  // Check if menu item exists and is available
  const menuItemResult = await query(
    'SELECT id, is_available FROM menu_items WHERE id = $1',
    [menuItemId]
  );

  if (menuItemResult.rowCount === 0) {
    throw notFound('Menu item not found');
  }

  if (!menuItemResult.rows[0].is_available) {
    throw badRequest('Menu item is not available');
  }

  // Check if item already exists in cart
  const existingCartItem = await query(
    'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND menu_item_id = $2',
    [userId, menuItemId]
  );

  let result;
  if (existingCartItem.rowCount > 0) {
    // Update quantity
    result = await query(
      `UPDATE cart_items
       SET quantity = quantity + $1,
           special_instructions = COALESCE($2, special_instructions),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, quantity`,
      [quantity, specialInstructions, existingCartItem.rows[0].id]
    );
  } else {
    // Insert new item
    result = await query(
      `INSERT INTO cart_items (user_id, menu_item_id, quantity, special_instructions)
       VALUES ($1, $2, $3, $4)
       RETURNING id, quantity`,
      [userId, menuItemId, quantity, specialInstructions]
    );
  }

  res.status(201).json({
    status: 'success',
    data: result.rows[0]
  });
});

// Update cart item
export const updateCartItem = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { cartItemId } = req.params;
  const { quantity, specialInstructions } = req.body;

  if (quantity !== undefined && quantity < 1) {
    throw badRequest('Quantity must be at least 1');
  }

  const result = await query(
    `UPDATE cart_items
     SET quantity = COALESCE($1, quantity),
         special_instructions = COALESCE($2, special_instructions),
         updated_at = NOW()
     WHERE id = $3 AND user_id = $4
     RETURNING id, quantity, special_instructions AS "specialInstructions"`,
    [quantity, specialInstructions, cartItemId, userId]
  );

  if (result.rowCount === 0) {
    throw notFound('Cart item not found');
  }

  res.json({
    status: 'success',
    data: result.rows[0]
  });
});

// Remove item from cart
export const removeFromCart = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { cartItemId } = req.params;

  const result = await query(
    'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id',
    [cartItemId, userId]
  );

  if (result.rowCount === 0) {
    throw notFound('Cart item not found');
  }

  res.json({
    status: 'success',
    message: 'Item removed from cart'
  });
});

// Clear user's cart
export const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user.sub;

  await query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

  res.json({
    status: 'success',
    message: 'Cart cleared'
  });
});

// Get cart count
export const getCartCount = asyncHandler(async (req, res) => {
  const userId = req.user.sub;

  const result = await query(
    'SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE user_id = $1',
    [userId]
  );

  res.json({
    status: 'success',
    data: {
      count: parseInt(result.rows[0].count, 10)
    }
  });
});
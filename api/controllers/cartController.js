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
            ci.variant_id AS "variantId",
            mi.id AS "menuItemId",
            mi.name,
            mi.description,
            mi.price,
            mi.image_url AS "imageUrl",
            mi.is_available AS "isAvailable",
            mi.has_variants AS "hasVariants",
            r.id AS "restaurantId",
            r.name AS "restaurantName",
            r.image_url AS "restaurantImageUrl",
            mv.id AS "variantMenuVariantId",
            mv.name AS "variantName",
            mv.price AS "variantPrice"
     FROM cart_items ci
     JOIN menu_items mi ON mi.id = ci.menu_item_id
     JOIN restaurants r ON r.id = mi.restaurant_id
     LEFT JOIN menu_item_variants mv ON mv.id = ci.variant_id
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
  const { menuItemId, quantity = 1, specialInstructions, variantId } = req.body;

  if (!menuItemId) {
    throw badRequest('Menu item ID is required');
  }

  if (quantity < 1) {
    throw badRequest('Quantity must be at least 1');
  }

  // Check if menu item exists and get variant info
  const menuItemResult = await query(
    `SELECT id, is_available, has_variants 
     FROM menu_items 
     WHERE id = $1`,
    [menuItemId]
  );

  if (menuItemResult.rowCount === 0) {
    throw notFound('Menu item not found');
  }

  const menuItem = menuItemResult.rows[0];

  if (!menuItem.is_available) {
    throw badRequest('Menu item is not available');
  }

  // If menu item has variants, variantId is required
  if (menuItem.has_variants) {
    if (!variantId) {
      throw badRequest('Variant ID is required for items with variants');
    }

    // Validate that variant exists and belongs to this menu item
    const variantResult = await query(
      `SELECT id, is_available, price 
       FROM menu_item_variants 
       WHERE id = $1 AND menu_item_id = $2`,
      [variantId, menuItemId]
    );

    if (variantResult.rowCount === 0) {
      throw badRequest('Invalid variant for this menu item');
    }

    const variant = variantResult.rows[0];
    if (!variant.is_available) {
      throw badRequest('Variant is not available');
    }
  } else {
    // If item doesn't have variants, variantId should not be provided
    if (variantId) {
      throw badRequest('Variant ID should not be provided for items without variants');
    }
  }

  // Check if item already exists in cart (considering variant for items with variants)
  let existingCartItem;
  if (menuItem.has_variants && variantId) {
    existingCartItem = await query(
      `SELECT id, quantity 
       FROM cart_items 
       WHERE user_id = $1 AND menu_item_id = $2 AND variant_id = $3`,
      [userId, menuItemId, variantId]
    );
  } else {
    existingCartItem = await query(
      `SELECT id, quantity 
       FROM cart_items 
       WHERE user_id = $1 AND menu_item_id = $2 AND variant_id IS NULL`,
      [userId, menuItemId]
    );
  }

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
      `INSERT INTO cart_items (user_id, menu_item_id, variant_id, quantity, special_instructions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, quantity`,
      [userId, menuItemId, variantId || null, quantity, specialInstructions]
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
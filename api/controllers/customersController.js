import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  badRequest,
  notFound,
  unauthorized
} from '../utils/httpError.js';
import path from 'path';
import { uploadToSupabase } from '../utils/storage.js';

const ensureSameUser = (reqUser, paramId) => {
  if (reqUser.role !== 'admin' && reqUser.sub !== paramId) {
    throw unauthorized('You are not allowed to access this resource');
  }
};

export const getProfile = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  ensureSameUser(req.user, customerId);

  const result = await query(
    `SELECT id,
            email,
            full_name AS "fullName",
            phone,
            image_url AS "imageUrl",
            barangay,
            created_at AS "createdAt"
     FROM users
     WHERE id = $1 AND user_type = 'customer'`,
    [customerId]
  );

  if (result.rowCount === 0) {
    throw notFound('Customer not found');
  }

  res.json({ status: 'success', data: result.rows[0] });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { fullName, phone, imageUrl, barangay } = req.body;
  ensureSameUser(req.user, customerId);

  const result = await query(
    `UPDATE users
     SET full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         image_url = COALESCE($3, image_url),
         barangay = COALESCE($4, barangay),
         updated_at = NOW()
     WHERE id = $5 AND user_type = 'customer'
     RETURNING id, email, full_name AS "fullName", phone, image_url AS "imageUrl", barangay, updated_at AS "updatedAt"`,
    [fullName ?? null, phone ?? null, imageUrl ?? null, barangay ?? null, customerId]
  );

  if (result.rowCount === 0) {
    throw notFound('Customer not found');
  }

  res.json({ status: 'success', data: result.rows[0] });
});

export const listAddresses = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  ensureSameUser(req.user, customerId);

  const result = await query(
    `SELECT id,
            label,
            street_address AS "streetAddress",
            apartment,
            city,
            state,
            zip_code AS "zipCode",
            country,
            latitude,
            longitude,
            is_default AS "isDefault",
            created_at AS "createdAt"
     FROM addresses
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC`,
    [customerId]
  );

  res.json({ status: 'success', data: result.rows });
});

export const createAddress = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  ensureSameUser(req.user, customerId);

  const {
    label = 'Home',
    streetAddress,
    apartment,
    city,
    state,
    zipCode,
    country = 'USA',
    latitude,
    longitude,
    isDefault = false
  } = req.body;

  if (!streetAddress || !city || !zipCode) {
    throw badRequest('Street address, city and ZIP code are required');
  }

  if (isDefault) {
    await query(
      `UPDATE addresses SET is_default = false WHERE user_id = $1`,
      [customerId]
    );
  }

  const result = await query(
    `INSERT INTO addresses (user_id, label, street_address, apartment, city, state, zip_code, country, latitude, longitude, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id,
               label,
               street_address AS "streetAddress",
               apartment,
               city,
               state,
               zip_code AS "zipCode",
               country,
               latitude,
               longitude,
               is_default AS "isDefault",
               created_at AS "createdAt"`,
    [
      customerId,
      label ?? 'Home',
      streetAddress,
      apartment ?? null,
      city,
      state ?? null,
      zipCode,
      country,
      latitude ?? null,
      longitude ?? null,
      isDefault
    ]
  );

  res.status(201).json({ status: 'success', data: result.rows[0] });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const { customerId, addressId } = req.params;
  ensureSameUser(req.user, customerId);

  const {
    label,
    streetAddress,
    apartment,
    city,
    state,
    zipCode,
    country,
    isDefault
  } = req.body;

  if (isDefault === true) {
    await query(
      `UPDATE addresses SET is_default = false WHERE user_id = $1 AND id <> $2`,
      [customerId, addressId]
    );
  }

  const result = await query(
    `UPDATE addresses
     SET label = COALESCE($1, label),
         street_address = COALESCE($2, street_address),
         apartment = COALESCE($3, apartment),
         city = COALESCE($4, city),
         state = COALESCE($5, state),
         zip_code = COALESCE($6, zip_code),
         country = COALESCE($7, country),
         is_default = COALESCE($8, is_default)
     WHERE id = $9 AND user_id = $10
     RETURNING id,
               label,
               street_address AS "streetAddress",
               apartment,
               city,
               state,
               zip_code AS "zipCode",
               country,
               is_default AS "isDefault"`,
    [
      label ?? null,
      streetAddress ?? null,
      apartment ?? null,
      city ?? null,
      state ?? null,
      zipCode ?? null,
      country ?? null,
      isDefault ?? null,
      addressId,
      customerId
    ]
  );

  if (result.rowCount === 0) {
    throw notFound('Address not found');
  }

  res.json({ status: 'success', data: result.rows[0] });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const { customerId, addressId } = req.params;
  ensureSameUser(req.user, customerId);

  // First, check if the address exists and belongs to the user
  const addressCheck = await query(
    `SELECT id FROM addresses WHERE id = $1 AND user_id = $2`,
    [addressId, customerId]
  );

  if (addressCheck.rowCount === 0) {
    throw notFound('Address not found');
  }

  // Check if the address is used in any orders
  const orderCheck = await query(
    `SELECT id FROM orders WHERE delivery_address_id = $1 LIMIT 1`,
    [addressId]
  );

  if (orderCheck.rowCount > 0) {
    // If address is used in orders, set it to NULL in orders instead of deleting
    await query(
      `UPDATE orders SET delivery_address_id = NULL WHERE delivery_address_id = $1`,
      [addressId]
    );
  }

  // Now delete the address
  const result = await query(
    `DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id`,
    [addressId, customerId]
  );

  if (result.rowCount === 0) {
    throw notFound('Address not found');
  }

  res.json({ status: 'success', message: 'Address removed' });
});

export const listCustomerOrders = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  ensureSameUser(req.user, customerId);

  const result = await query(
    `SELECT o.id,
            o.status,
            o.total_amount AS "totalAmount",
            o.created_at AS "createdAt",
            o.estimated_delivery_time AS "estimatedDeliveryTime",
            r.name AS "restaurantName",
            r.image_url AS "restaurantImage",
            SUM(oi.quantity) AS "itemsCount"
     FROM orders o
     LEFT JOIN restaurants r ON r.id = o.restaurant_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.customer_id = $1
     GROUP BY o.id, r.id
     ORDER BY o.created_at DESC`,
    [customerId]
  );

  res.json({ status: 'success', data: result.rows });
});

export const toggleFavorite = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { restaurantId } = req.body;
  ensureSameUser(req.user, customerId);

  if (!restaurantId) {
    throw badRequest('Restaurant ID is required');
  }

  // Check if restaurant exists
  const restaurantCheck = await query(
    'SELECT id FROM restaurants WHERE id = $1',
    [restaurantId]
  );

  if (restaurantCheck.rowCount === 0) {
    throw notFound('Restaurant not found');
  }

  // Check if already favorited
  const existingFavorite = await query(
    'SELECT id FROM favorites WHERE user_id = $1 AND restaurant_id = $2',
    [customerId, restaurantId]
  );

  if (existingFavorite.rowCount > 0) {
    // Remove favorite
    await query(
      'DELETE FROM favorites WHERE user_id = $1 AND restaurant_id = $2',
      [customerId, restaurantId]
    );
    
    // Delete the 5-star review that was created when favoriting
    await query(
      'DELETE FROM reviews WHERE customer_id = $1 AND restaurant_id = $2 AND order_id IS NULL AND rating = 5',
      [customerId, restaurantId]
    );
    
    res.json({ status: 'success', data: { isFavorite: false } });
  } else {
    // Add favorite
    await query(
      'INSERT INTO favorites (user_id, restaurant_id) VALUES ($1, $2)',
      [customerId, restaurantId]
    );
    
    // Check if a review already exists for this customer-restaurant pair (without order_id)
    const existingReview = await query(
      'SELECT id FROM reviews WHERE customer_id = $1 AND restaurant_id = $2 AND order_id IS NULL',
      [customerId, restaurantId]
    );
    
    // Create a 5-star review if one doesn't exist
    if (existingReview.rowCount === 0) {
      await query(
        'INSERT INTO reviews (customer_id, restaurant_id, rating, comment, order_id, is_verified) VALUES ($1, $2, $3, $4, NULL, false)',
        [customerId, restaurantId, 5, 'Favorite restaurant']
      );
    } else {
      // Update existing review to 5 stars
      await query(
        'UPDATE reviews SET rating = 5, comment = COALESCE(comment, $1) WHERE customer_id = $2 AND restaurant_id = $3 AND order_id IS NULL',
        ['Favorite restaurant', customerId, restaurantId]
      );
    }
    
    res.json({ status: 'success', data: { isFavorite: true } });
  }
});

export const getFavorites = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  ensureSameUser(req.user, customerId);

  const result = await query(
    `SELECT f.restaurant_id AS "restaurantId",
            f.created_at AS "createdAt",
            r.name AS "restaurantName",
            r.image_url AS "restaurantImageUrl",
            r.cuisine_type AS "cuisineType",
            r.rating,
            r.delivery_fee AS "deliveryFee"
     FROM favorites f
     LEFT JOIN restaurants r ON r.id = f.restaurant_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [customerId]
  );

  res.json({ status: 'success', data: result.rows });
});

export const checkFavorite = asyncHandler(async (req, res) => {
  const { customerId, restaurantId } = req.params;
  ensureSameUser(req.user, customerId);

  const result = await query(
    'SELECT id FROM favorites WHERE user_id = $1 AND restaurant_id = $2',
    [customerId, restaurantId]
  );

  res.json({
    status: 'success',
    data: { isFavorite: result.rowCount > 0 }
  });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  ensureSameUser(req.user, customerId);

  // Verify it's a customer account
  const userCheck = await query(
    'SELECT user_type FROM users WHERE id = $1',
    [customerId]
  );

  if (userCheck.rowCount === 0) {
    throw notFound('User not found');
  }

  if (userCheck.rows[0].user_type !== 'customer') {
    throw badRequest('This endpoint is only for customer accounts');
  }

  // Delete user account (cascade will handle related data)
  // Note: This will delete all related data (orders, addresses, cart items, favorites, etc.)
  // If you want to soft delete instead, use: UPDATE users SET is_active = false WHERE id = $1
  await query('DELETE FROM users WHERE id = $1', [customerId]);

  res.json({
    status: 'success',
    message: 'Account deleted successfully'
  });
});

export const uploadProfileImage = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  ensureSameUser(req.user, customerId);

  if (!req.file) {
    throw badRequest('No image file provided');
  }

  // Generate unique filename
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const fileExtension = path.extname(req.file.originalname);
  const fileName = `customer-${uniqueSuffix}${fileExtension}`;
  const filePath = `profiles/${fileName}`;

  // Upload to Supabase Storage
  const { url } = await uploadToSupabase(
    req.file.buffer,
    'uploads',
    filePath,
    req.file.mimetype
  );

  const result = await query(
    `UPDATE users
     SET image_url = $1,
         updated_at = NOW()
     WHERE id = $2 AND user_type = 'customer'
     RETURNING id, image_url AS "imageUrl"`,
    [url, customerId]
  );

  if (result.rowCount === 0) {
    throw notFound('Customer not found');
  }

  res.json({
    status: 'success',
    data: {
      id: result.rows[0].id,
      imageUrl: result.rows[0].imageUrl
    }
  });
});


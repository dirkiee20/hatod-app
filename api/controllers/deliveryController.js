import { query, withTransaction } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  badRequest,
  forbidden,
  notFound
} from '../utils/httpError.js';
import path from 'path';
import { uploadToSupabase } from '../utils/storage.js';

const deliveryStatuses = ['assigned', 'picked_up', 'en_route', 'delivered'];

export const listAssignments = asyncHandler(async (req, res) => {
  const riderId = req.params.riderId || req.user.sub;

  if (req.user.role !== 'admin' && req.user.sub !== riderId) {
    throw forbidden('You can only view your own assignments');
  }

  const { status = 'assigned' } = req.query;
  const filters = ['d.rider_id = $1'];
  const params = [riderId];

  if (status !== 'all') {
    filters.push(`d.status = $2`);
    params.push(status);
  }

  const result = await query(
    `SELECT d.id,
            d.status,
            d.pickup_time AS "pickupTime",
            d.delivery_time AS "deliveryTime",
            d.estimated_delivery_time AS "estimatedDeliveryTime",
            d.cash_collected AS "cashCollected",
            d.cash_amount AS "cashAmount",
            d.created_at AS "createdAt",
            o.id AS "orderId",
            o.total_amount AS "totalAmount",
            o.delivery_fee AS "deliveryFee",
            o.tip_amount AS "tipAmount",
            o.created_at AS "orderCreatedAt",
            p.payment_method AS "paymentMethod",
            r.name AS "restaurantName",
            r.address AS "restaurantAddress",
            r.image_url AS "restaurantImageUrl",
            r.latitude AS "restaurantLatitude",
            r.longitude AS "restaurantLongitude",
            c.full_name AS "customerName",
            c.phone AS "customerPhone",
            a.street_address AS "streetAddress",
            a.city,
            a.state,
            a.zip_code AS "zipCode",
            a.latitude,
            a.longitude
     FROM deliveries d
     LEFT JOIN orders o ON o.id = d.order_id
     LEFT JOIN payments p ON p.order_id = o.id
     LEFT JOIN restaurants r ON r.id = o.restaurant_id
     LEFT JOIN users c ON c.id = o.customer_id
     LEFT JOIN addresses a ON a.id = o.delivery_address_id
     WHERE ${filters.join(' AND ')}
     ORDER BY d.created_at DESC`,
    params
  );

  // Convert numeric fields to numbers, handling null values
  const processedData = result.rows.map(row => ({
    ...row,
    totalAmount: row.totalAmount != null ? parseFloat(row.totalAmount) : 0,
    deliveryFee: row.deliveryFee != null ? parseFloat(row.deliveryFee) : 0,
    tipAmount: row.tipAmount != null ? parseFloat(row.tipAmount) : 0
  }));

  res.json({ status: 'success', data: processedData });
});

export const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const { status } = req.body;
  const riderId = req.user.sub;

  if (!deliveryStatuses.includes(status)) {
    throw badRequest('Invalid delivery status');
  }

  // First verify the delivery exists and belongs to the rider, and get order_id
  const deliveryCheck = await query(
    `SELECT d.id, d.status, d.rider_id, d.order_id 
     FROM deliveries d 
     WHERE d.id = $1`,
    [deliveryId]
  );

  if (deliveryCheck.rowCount === 0) {
    throw notFound('Delivery not found');
  }

  const delivery = deliveryCheck.rows[0];

  // Compare UUIDs - convert both to strings for comparison
  const deliveryRiderId = delivery.rider_id ? delivery.rider_id.toString() : null;
  const currentRiderId = riderId.toString();

  if (deliveryRiderId !== currentRiderId) {
    console.error('Permission denied:', {
      deliveryRiderId: deliveryRiderId,
      currentUserId: currentRiderId,
      match: deliveryRiderId === currentRiderId
    });
    throw forbidden('You do not have permission to update this delivery');
  }

  // Use transaction to update both delivery and order status
  const result = await withTransaction(async (client) => {
    // Build the update query based on status
    let updateFields = ['status = $1', 'updated_at = NOW()'];
    const params = [status, deliveryId, riderId];

    // Set pickup_time when status is 'picked_up'
    if (status === 'picked_up') {
      updateFields.push('pickup_time = NOW()');
    }

    // Set delivery_time and actual_delivery_time when status is 'delivered'
    if (status === 'delivered') {
      updateFields.push('delivery_time = NOW()');
      updateFields.push('actual_delivery_time = NOW()');
    }

    // Update the delivery status
    const updateQuery = `
      UPDATE deliveries
      SET ${updateFields.join(', ')}
      WHERE id = $2 AND rider_id = $3
      RETURNING id, status, pickup_time AS "pickupTime", delivery_time AS "deliveryTime", actual_delivery_time AS "actualDeliveryTime"
    `;

    const deliveryResult = await client.query(updateQuery, params);

    if (deliveryResult.rowCount === 0) {
      throw notFound('Delivery assignment not found or could not be updated');
    }

    // If delivery is marked as delivered, also update the order status
    if (status === 'delivered' && delivery.order_id) {
      // Update order status to delivered
      await client.query(
        `UPDATE orders
         SET status = 'delivered',
             actual_delivery_time = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [delivery.order_id]
      );

      // Add order status event for tracking
      await client.query(
        `INSERT INTO order_status_events (order_id, status, note, created_by)
         VALUES ($1, 'delivered', 'Order delivered by rider', $2)`,
        [delivery.order_id, riderId]
      );
    }

    return deliveryResult.rows[0];
  });

  res.json({ status: 'success', data: result });

  res.json({ status: 'success', data: result.rows[0] });
});

export const collectCashPayment = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const { amount } = req.body;

  const result = await query(
    `UPDATE deliveries
     SET cash_collected = true,
         cash_amount = $1,
         updated_at = NOW()
     WHERE id = $2 AND rider_id = $3
     RETURNING id, cash_collected AS "cashCollected", cash_amount AS "cashAmount"`,
    [amount, deliveryId, req.user.sub]
  );

  if (result.rowCount === 0) {
    throw notFound('Delivery assignment not found');
  }

  res.json({ status: 'success', data: result.rows[0] });
});

export const claimDelivery = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const riderId = req.user.sub;

  const result = await query(
    `UPDATE deliveries
     SET rider_id = $1,
         status = 'assigned',
         updated_at = NOW()
     WHERE id = $2 AND rider_id IS NULL
     RETURNING id, status, rider_id AS "riderId"`,
    [riderId, deliveryId]
  );

  if (result.rowCount === 0) {
    throw badRequest('Delivery is no longer available');
  }

  res.json({ status: 'success', data: result.rows[0] });
});

export const listAvailableOrders = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT d.id,
              d.status,
              d.created_at AS "createdAt",
              o.id AS "orderId",
              o.total_amount::numeric AS "totalAmount",
              o.delivery_fee::numeric AS "deliveryFee",
              p.payment_method AS "paymentMethod",
              r.name AS "restaurantName",
              r.address AS "restaurantAddress",
              r.image_url AS "restaurantImageUrl",
              r.latitude AS "restaurantLatitude",
              r.longitude AS "restaurantLongitude",
              c.full_name AS "customerName",
              c.phone AS "customerPhone",
              a.street_address AS "streetAddress",
              a.apartment,
              a.city,
              a.state,
              a.zip_code AS "zipCode",
              a.latitude,
              a.longitude
       FROM deliveries d
       LEFT JOIN orders o ON o.id = d.order_id
       LEFT JOIN payments p ON p.order_id = o.id
       LEFT JOIN restaurants r ON r.id = o.restaurant_id
       LEFT JOIN users c ON c.id = o.customer_id
       LEFT JOIN addresses a ON a.id = o.delivery_address_id
       WHERE d.rider_id IS NULL AND o.status = 'ready'
       ORDER BY d.created_at ASC`
  );

  // Convert string numbers to actual numbers and add deliveryLatitude/deliveryLongitude aliases
  const processedData = result.rows.map(row => ({
    ...row,
    totalAmount: parseFloat(row.totalAmount),
    deliveryFee: parseFloat(row.deliveryFee),
    deliveryLatitude: row.latitude,
    deliveryLongitude: row.longitude
  }));

  res.json({ status: 'success', data: processedData });
});

export const getRiderStats = asyncHandler(async (req, res) => {
  const riderId = req.params.riderId ?? req.user.sub;

  if (req.user.role !== 'admin' && req.user.sub !== riderId) {
    throw forbidden('You can only view your own statistics');
  }

  // Get today's deliveries count
  const todayResult = await query(
    `SELECT COUNT(*) as count
     FROM deliveries
     WHERE rider_id = $1
     AND DATE(created_at) = CURRENT_DATE`,
    [riderId]
  );

  // Get active deliveries count
  const activeResult = await query(
    `SELECT COUNT(*) as count
     FROM deliveries
     WHERE rider_id = $1
     AND status IN ('assigned', 'picked_up', 'en_route')`,
    [riderId]
  );

  // Get completed deliveries today
  const completedResult = await query(
    `SELECT COUNT(*) as count
     FROM deliveries
     WHERE rider_id = $1
     AND status = 'delivered'
     AND DATE(delivery_time) = CURRENT_DATE`,
    [riderId]
  );

  // Get today's cash collected
  const cashResult = await query(
    `SELECT COALESCE(SUM(cash_amount), 0) as cash_collected
     FROM deliveries
     WHERE rider_id = $1
     AND cash_collected = true
     AND DATE(updated_at) = CURRENT_DATE`,
    [riderId]
  );


  // Get average delivery time
  const avgTimeResult = await query(
    `SELECT AVG(EXTRACT(EPOCH FROM (d.delivery_time - d.pickup_time))/60) as avg_time
     FROM deliveries d
     WHERE d.rider_id = $1
     AND d.status = 'delivered'
     AND DATE(d.delivery_time) = CURRENT_DATE`,
    [riderId]
  );

  // Get customer rating (mock for now)
  const ratingResult = await query(
    `SELECT 4.9 as rating, 89 as total_ratings`
  );

  const stats = {
    todaysDeliveries: parseInt(todayResult.rows[0].count),
    activeDeliveries: parseInt(activeResult.rows[0].count),
    completedToday: parseInt(completedResult.rows[0].count),
    todaysCashCollected: parseFloat(cashResult.rows[0].cash_collected),
    avgDeliveryTime: Math.round(parseFloat(avgTimeResult.rows[0].avg_time || 0)),
    customerRating: parseFloat(ratingResult.rows[0].rating),
    totalRatings: parseInt(ratingResult.rows[0].total_ratings)
  };

  res.json({ status: 'success', data: stats });
});

export const getRiderProfile = asyncHandler(async (req, res) => {
  const riderId = req.params.riderId ?? req.user.sub;

  if (req.user.role !== 'admin' && req.user.sub !== riderId) {
    throw forbidden('You can only view your own profile');
  }

  const result = await query(
    `SELECT u.id,
            u.full_name AS "fullName",
            u.email,
            u.phone,
            u.image_url AS "imageUrl",
            u.created_at AS "createdAt",
            rp.vehicle_type AS "vehicleType",
            rp.license_number AS "licenseNumber",
            rp.license_expiry AS "licenseExpiry",
            COALESCE(rp.is_available, true) AS "isAvailable",
            u.is_active AS "isActive"
     FROM users u
     LEFT JOIN rider_profiles rp ON rp.user_id = u.id
     WHERE u.id = $1 AND u.user_type = 'rider'`,
    [riderId]
  );

  if (result.rows.length === 0) {
    throw notFound('Rider not found');
  }

  res.json({ status: 'success', data: result.rows[0] });
});

export const updateRiderProfile = asyncHandler(async (req, res) => {
  const { riderId } = req.params;
  const { fullName, phone, vehicleType, licenseNumber, licenseExpiry } = req.body;

  if (req.user.role !== 'admin' && req.user.sub !== riderId) {
    throw forbidden('You can only update your own profile');
  }

  // Update user information
  const userResult = await query(
    `UPDATE users
     SET full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         updated_at = NOW()
     WHERE id = $3 AND user_type = 'rider'
     RETURNING id, email, full_name AS "fullName", phone, image_url AS "imageUrl", created_at AS "createdAt"`,
    [fullName ?? null, phone ?? null, riderId]
  );

  if (userResult.rowCount === 0) {
    throw notFound('Rider not found');
  }

  // Update or insert rider profile
  await query(
    `INSERT INTO rider_profiles (user_id, vehicle_type, license_number, license_expiry, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       vehicle_type = COALESCE($2, rider_profiles.vehicle_type),
       license_number = COALESCE($3, rider_profiles.license_number),
       license_expiry = COALESCE($4, rider_profiles.license_expiry),
       updated_at = NOW()`,
    [riderId, vehicleType ?? null, licenseNumber ?? null, licenseExpiry ?? null]
  );

  // Fetch updated profile
  const profileResult = await query(
    `SELECT u.id,
            u.full_name AS "fullName",
            u.email,
            u.phone,
            u.image_url AS "imageUrl",
            u.created_at AS "createdAt",
            rp.vehicle_type AS "vehicleType",
            rp.license_number AS "licenseNumber",
            rp.license_expiry AS "licenseExpiry",
            u.is_active AS "isActive"
     FROM users u
     LEFT JOIN rider_profiles rp ON rp.user_id = u.id
     WHERE u.id = $1`,
    [riderId]
  );

  res.json({ status: 'success', data: profileResult.rows[0] });
});

export const toggleRiderAvailability = asyncHandler(async (req, res) => {
  const { riderId } = req.params;
  const { isAvailable } = req.body;

  if (req.user.role !== 'admin' && req.user.sub !== riderId) {
    throw forbidden('You can only update your own availability');
  }

  // Update or insert rider profile with availability
  await query(
    `INSERT INTO rider_profiles (user_id, is_available, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       is_available = $2,
       updated_at = NOW()`,
    [riderId, isAvailable !== undefined ? isAvailable : true]
  );

  // Fetch updated profile
  const profileResult = await query(
    `SELECT u.id,
            u.full_name AS "fullName",
            COALESCE(rp.is_available, true) AS "isAvailable"
     FROM users u
     LEFT JOIN rider_profiles rp ON rp.user_id = u.id
     WHERE u.id = $1`,
    [riderId]
  );

  res.json({
    status: 'success',
    data: {
      riderId: profileResult.rows[0].id,
      isAvailable: profileResult.rows[0].isAvailable
    },
    message: `Rider marked as ${profileResult.rows[0].isAvailable ? 'available' : 'unavailable'}`
  });
});

export const uploadRiderProfileImage = asyncHandler(async (req, res) => {
  const { riderId } = req.params;

  if (req.user.role !== 'admin' && req.user.sub !== riderId) {
    throw forbidden('You can only update your own profile');
  }

  if (!req.file) {
    throw badRequest('No image file provided');
  }

  try {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(req.file.originalname) || '.jpg';
    const fileName = `rider-${uniqueSuffix}${fileExtension}`;
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
       WHERE id = $2 AND user_type = 'rider'
       RETURNING id, image_url AS "imageUrl"`,
      [url, riderId]
    );

    if (result.rowCount === 0) {
      throw notFound('Rider not found');
    }

    res.json({
      status: 'success',
      data: {
        id: result.rows[0].id,
        imageUrl: result.rows[0].imageUrl
      }
    });
  } catch (error) {
    console.error('Error uploading rider profile image:', error);
    if (error.message?.includes('Supabase Storage is not configured')) {
      throw badRequest('Image upload service is not configured. Please contact support.');
    }
    throw error;
  }
});

// Rider requests to pick up an order
export const requestDelivery = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const riderId = req.user.sub;

  // Check if delivery exists and is available
  const deliveryCheck = await query(
    `SELECT d.id, d.order_id, o.restaurant_id, o.status as order_status, d.rider_id
     FROM deliveries d
     LEFT JOIN orders o ON o.id = d.order_id
     WHERE d.id = $1`,
    [deliveryId]
  );

  if (deliveryCheck.rowCount === 0) {
    throw notFound('Delivery not found');
  }

  const delivery = deliveryCheck.rows[0];

  if (delivery.rider_id) {
    throw badRequest('This delivery is already assigned to a rider');
  }

  if (delivery.order_status !== 'ready') {
    throw badRequest('Order is not ready for pickup');
  }

  // Check if rider already has a pending request for this delivery
  const existingRequest = await query(
    `SELECT id FROM delivery_requests
     WHERE delivery_id = $1 AND rider_id = $2 AND status = 'pending'`,
    [deliveryId, riderId]
  );

  if (existingRequest.rowCount > 0) {
    throw badRequest('You already have a pending request for this delivery');
  }

  // Create request
  const result = await query(
    `INSERT INTO delivery_requests (delivery_id, order_id, restaurant_id, rider_id, requested_by, status)
     VALUES ($1, $2, $3, $4, 'rider', 'pending')
     RETURNING id, status, created_at AS "createdAt"`,
    [deliveryId, delivery.order_id, delivery.restaurant_id, riderId]
  );

  res.status(201).json({
    status: 'success',
    data: result.rows[0],
    message: 'Delivery request sent to restaurant'
  });
});

// Restaurant requests a specific rider
export const requestRider = asyncHandler(async (req, res) => {
  const { deliveryId, riderId } = req.params;
  
  // Get restaurant ID from user
  const restaurantCheck = await query(
    `SELECT id FROM restaurants WHERE owner_id = $1`,
    [req.user.sub]
  );

  if (restaurantCheck.rowCount === 0) {
    throw forbidden('You must be a restaurant owner to request riders');
  }

  const restaurantId = restaurantCheck.rows[0].id;

  // Check if delivery exists and belongs to restaurant
  const deliveryCheck = await query(
    `SELECT d.id, d.order_id, o.restaurant_id, o.status as order_status, d.rider_id
     FROM deliveries d
     LEFT JOIN orders o ON o.id = d.order_id
     WHERE d.id = $1 AND o.restaurant_id = $2`,
    [deliveryId, restaurantId]
  );

  if (deliveryCheck.rowCount === 0) {
    throw notFound('Delivery not found or does not belong to your restaurant');
  }

  const delivery = deliveryCheck.rows[0];

  if (delivery.rider_id) {
    throw badRequest('This delivery is already assigned to a rider');
  }

  // Check if rider exists and is active
  const riderCheck = await query(
    `SELECT u.id, u.full_name, rp.vehicle_type
     FROM users u
     LEFT JOIN rider_profiles rp ON rp.user_id = u.id
     WHERE u.id = $1 AND u.user_type = 'rider' AND u.is_active = true`,
    [riderId]
  );

  if (riderCheck.rowCount === 0) {
    throw notFound('Rider not found or not available');
  }

  // Check if restaurant already has a pending request for this rider
  const existingRequest = await query(
    `SELECT id FROM delivery_requests
     WHERE delivery_id = $1 AND rider_id = $2 AND status = 'pending'`,
    [deliveryId, riderId]
  );

  if (existingRequest.rowCount > 0) {
    throw badRequest('You already have a pending request for this rider');
  }

  // Create request
  const result = await query(
    `INSERT INTO delivery_requests (delivery_id, order_id, restaurant_id, rider_id, requested_by, status)
     VALUES ($1, $2, $3, $4, 'restaurant', 'pending')
     RETURNING id, status, created_at AS "createdAt"`,
    [deliveryId, delivery.order_id, restaurantId, riderId]
  );

  res.status(201).json({
    status: 'success',
    data: result.rows[0],
    message: 'Rider request sent'
  });
});

// List available riders for a restaurant
export const listAvailableRiders = asyncHandler(async (req, res) => {
  // Get restaurant ID from user
  const restaurantCheck = await query(
    `SELECT id FROM restaurants WHERE owner_id = $1`,
    [req.user.sub]
  );

  if (restaurantCheck.rowCount === 0) {
    throw forbidden('You must be a restaurant owner to view available riders');
  }

  const restaurantId = restaurantCheck.rows[0].id;

  // Get active riders who are available and not currently assigned to a delivery
  const result = await query(
    `SELECT DISTINCT
            u.id,
            u.full_name AS "fullName",
            u.phone,
            u.email,
            rp.vehicle_type AS "vehicleType",
            rp.license_number AS "licenseNumber",
            COALESCE(rp.is_available, true) AS "isAvailable",
            COUNT(DISTINCT d.id) FILTER (WHERE d.status IN ('assigned', 'picked_up', 'en_route')) AS "activeDeliveries"
     FROM users u
     LEFT JOIN rider_profiles rp ON rp.user_id = u.id
     LEFT JOIN deliveries d ON d.rider_id = u.id AND d.status IN ('assigned', 'picked_up', 'en_route')
     WHERE u.user_type = 'rider'
       AND u.is_active = true
       AND COALESCE(rp.is_available, true) = true
     GROUP BY u.id, u.full_name, u.phone, u.email, rp.vehicle_type, rp.license_number, rp.is_available
     ORDER BY "activeDeliveries" ASC, u.full_name ASC`,
    []
  );

  res.json({ status: 'success', data: result.rows });
});

// Accept delivery request
export const acceptDeliveryRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user.sub;
  const userRole = req.user.role;

  // Normalize role (handle both 'delivery' and 'rider')
  const normalizedRole = userRole === 'delivery' ? 'rider' : userRole;

  // Get request details
  const requestCheck = await query(
    `SELECT dr.id, dr.delivery_id, dr.rider_id, dr.restaurant_id, dr.requested_by, dr.status,
            o.restaurant_id as order_restaurant_id, d.rider_id as delivery_rider_id
     FROM delivery_requests dr
     LEFT JOIN deliveries d ON d.id = dr.delivery_id
     LEFT JOIN orders o ON o.id = dr.order_id
     WHERE dr.id = $1`,
    [requestId]
  );

  if (requestCheck.rowCount === 0) {
    throw notFound('Request not found');
  }

  const request = requestCheck.rows[0];

  if (request.status !== 'pending') {
    throw badRequest('Request is no longer pending');
  }

  // Check permissions
  let hasPermission = false;
  if (request.requested_by === 'rider') {
    // Rider requested, restaurant must accept
    if (normalizedRole === 'restaurant') {
      const restaurantCheck = await query(
        `SELECT id FROM restaurants WHERE owner_id = $1 AND id = $2`,
        [userId, request.order_restaurant_id]
      );
      hasPermission = restaurantCheck.rowCount > 0;
    }
  } else if (request.requested_by === 'restaurant') {
    // Restaurant requested, rider must accept
    // Check if user is a rider and matches the request
    if (normalizedRole === 'rider') {
      // Also check user_type in database to be sure
      const riderCheck = await query(
        `SELECT id FROM users WHERE id = $1 AND user_type = 'rider'`,
        [userId]
      );
      hasPermission = riderCheck.rowCount > 0 && request.rider_id === userId;
    }
  }

  if (!hasPermission) {
    console.error('Permission denied:', {
      userId,
      userRole,
      normalizedRole,
      requestRiderId: request.rider_id,
      requestedBy: request.requested_by,
      riderIdMatch: request.rider_id === userId
    });
    throw forbidden('You do not have permission to accept this request');
  }

  if (request.delivery_rider_id) {
    throw badRequest('Delivery is already assigned to a rider');
  }

  // Use transaction to update delivery and request
  const result = await withTransaction(async (client) => {
    // Get all pending requests for this delivery to notify rejected riders
    const allPendingRequests = await client.query(
      `SELECT dr.id, dr.rider_id, u.full_name as rider_name, u.email as rider_email
       FROM delivery_requests dr
       LEFT JOIN users u ON u.id = dr.rider_id
       WHERE dr.delivery_id = $1 AND dr.status = 'pending'`,
      [request.delivery_id]
    );

    // Update delivery with rider
    const deliveryUpdate = await client.query(
      `UPDATE deliveries
       SET rider_id = $1, status = 'assigned', updated_at = NOW()
       WHERE id = $2 AND rider_id IS NULL
       RETURNING id, rider_id, status`,
      [request.rider_id, request.delivery_id]
    );

    if (deliveryUpdate.rowCount === 0) {
      throw badRequest('Delivery is no longer available');
    }

    // Update accepted request status
    await client.query(
      `UPDATE delivery_requests
       SET status = 'accepted', updated_at = NOW()
       WHERE id = $1`,
      [requestId]
    );

    // Reject all other pending requests for this delivery
    const rejectedResult = await client.query(
      `UPDATE delivery_requests
       SET status = 'rejected', updated_at = NOW()
       WHERE delivery_id = $1 AND id != $2 AND status = 'pending'
       RETURNING id, rider_id`,
      [request.delivery_id, requestId]
    );

    // Get order details for notification
    const orderDetails = await client.query(
      `SELECT o.id as order_id, o.status as order_status, r.name as restaurant_name
       FROM orders o
       LEFT JOIN restaurants r ON r.id = o.restaurant_id
       WHERE o.id = (SELECT order_id FROM deliveries WHERE id = $1)`,
      [request.delivery_id]
    );

    return {
      delivery: deliveryUpdate.rows[0],
      acceptedRiderId: request.rider_id,
      rejectedRiderIds: rejectedResult.rows.map(r => r.rider_id),
      allPendingRequests: allPendingRequests.rows,
      orderDetails: orderDetails.rows[0] || null
    };
  });

  // Prepare response with notification information
  const response = {
    status: 'success',
    message: request.requested_by === 'rider' 
      ? 'Rider request accepted. The rider has been assigned to pick up the order.'
      : 'Delivery request accepted. Please proceed to pick up the order.',
    data: {
      deliveryId: request.delivery_id,
      riderId: request.rider_id,
      orderId: result.orderDetails?.order_id,
      restaurantName: result.orderDetails?.restaurant_name
    },
    notifications: {
      acceptedRider: {
        riderId: result.acceptedRiderId,
        message: `Your request has been accepted! Please proceed to ${result.orderDetails?.restaurant_name || 'the restaurant'} to pick up order #${result.orderDetails?.order_id ? result.orderDetails.order_id.slice(-8).toUpperCase() : 'N/A'}.`
      },
      rejectedRiders: result.rejectedRiderIds.map(riderId => ({
        riderId: riderId,
        message: `The order you requested has been assigned to another rider.`
      }))
    }
  };

  res.json(response);
});

// Reject delivery request
export const rejectDeliveryRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user.sub;
  const userRole = req.user.role;

  // Get request details
  const requestCheck = await query(
    `SELECT dr.id, dr.rider_id, dr.restaurant_id, dr.requested_by, dr.status,
            o.restaurant_id as order_restaurant_id
     FROM delivery_requests dr
     LEFT JOIN orders o ON o.id = dr.order_id
     WHERE dr.id = $1`,
    [requestId]
  );

  if (requestCheck.rowCount === 0) {
    throw notFound('Request not found');
  }

  const request = requestCheck.rows[0];

  if (request.status !== 'pending') {
    throw badRequest('Request is no longer pending');
  }

  // Check permissions - either party can reject
  let hasPermission = false;
  if (request.requested_by === 'rider') {
    // Rider requested, restaurant or rider can reject
    if (userRole === 'restaurant') {
      const restaurantCheck = await query(
        `SELECT id FROM restaurants WHERE owner_id = $1 AND id = $2`,
        [userId, request.order_restaurant_id]
      );
      hasPermission = restaurantCheck.rowCount > 0;
    } else if (userRole === 'rider') {
      hasPermission = request.rider_id === userId;
    }
  } else {
    // Restaurant requested, restaurant or rider can reject
    if (userRole === 'restaurant') {
      const restaurantCheck = await query(
        `SELECT id FROM restaurants WHERE owner_id = $1 AND id = $2`,
        [userId, request.restaurant_id]
      );
      hasPermission = restaurantCheck.rowCount > 0;
    } else if (userRole === 'rider') {
      hasPermission = request.rider_id === userId;
    }
  }

  if (!hasPermission) {
    throw forbidden('You do not have permission to reject this request');
  }

  // Update request status
  const result = await query(
    `UPDATE delivery_requests
     SET status = 'rejected', updated_at = NOW()
     WHERE id = $1
     RETURNING id, status`,
    [requestId]
  );

  res.json({
    status: 'success',
    message: 'Delivery request rejected',
    data: result.rows[0]
  });
});

// List pending delivery requests for restaurant
// Only returns requests where the rider requested the restaurant (not restaurant-initiated requests)
export const listRestaurantDeliveryRequests = asyncHandler(async (req, res) => {
  // Get restaurant ID from user
  const restaurantCheck = await query(
    `SELECT id FROM restaurants WHERE owner_id = $1`,
    [req.user.sub]
  );

  if (restaurantCheck.rowCount === 0) {
    throw forbidden('You must be a restaurant owner to view delivery requests');
  }

  const restaurantId = restaurantCheck.rows[0].id;

  const result = await query(
    `SELECT dr.id,
            dr.delivery_id,
            dr.order_id,
            dr.rider_id,
            dr.requested_by,
            dr.status,
            dr.created_at AS "createdAt",
            u.full_name AS "riderName",
            u.phone AS "riderPhone",
            rp.vehicle_type AS "vehicleType",
            o.id AS "orderId",
            o.total_amount AS "totalAmount",
            o.status AS "orderStatus",
            c.full_name AS "customerName",
            a.street_address AS "deliveryAddress"
     FROM delivery_requests dr
     LEFT JOIN users u ON u.id = dr.rider_id
     LEFT JOIN rider_profiles rp ON rp.user_id = dr.rider_id
     LEFT JOIN orders o ON o.id = dr.order_id
     LEFT JOIN users c ON c.id = o.customer_id
     LEFT JOIN addresses a ON a.id = o.delivery_address_id
     WHERE dr.restaurant_id = $1 
       AND dr.status = 'pending'
       AND dr.requested_by = 'rider'
     ORDER BY dr.created_at DESC`,
    [restaurantId]
  );

  res.json({ status: 'success', data: result.rows });
});

// List pending delivery requests for rider
// Only returns requests where the restaurant requested the rider (not rider-initiated requests)
export const listRiderDeliveryRequests = asyncHandler(async (req, res) => {
  const riderId = req.user.sub;

  try {
    const result = await query(
      `SELECT dr.id,
              dr.delivery_id,
              dr.order_id,
              dr.restaurant_id,
              dr.requested_by,
              dr.status,
              dr.created_at AS "createdAt",
              r.name AS "restaurantName",
              r.address AS "restaurantAddress",
              r.image_url AS "restaurantImageUrl",
              o.id AS "orderId",
              o.total_amount AS "totalAmount",
              o.delivery_fee AS "deliveryFee",
              o.status AS "orderStatus",
              c.full_name AS "customerName",
              a.street_address AS "deliveryAddress",
              a.city,
              a.state,
              a.zip_code AS "zipCode"
       FROM delivery_requests dr
       LEFT JOIN restaurants r ON r.id = dr.restaurant_id
       LEFT JOIN orders o ON o.id = dr.order_id
       LEFT JOIN users c ON c.id = o.customer_id
       LEFT JOIN addresses a ON a.id = o.delivery_address_id
       WHERE dr.rider_id = $1 
         AND dr.status = 'pending'
         AND dr.requested_by = 'restaurant'
       ORDER BY dr.created_at DESC`,
      [riderId]
    );

    // Convert numeric fields to numbers, handling null values
    const processedData = result.rows.map(row => ({
      ...row,
      totalAmount: row.totalAmount != null ? parseFloat(row.totalAmount) : 0,
      deliveryFee: row.deliveryFee != null ? parseFloat(row.deliveryFee) : 0
    }));

    res.json({ status: 'success', data: processedData });
  } catch (error) {
    console.error('Error in listRiderDeliveryRequests:', error);
    throw error;
  }
});

// Update rider location for real-time tracking
export const updateRiderLocation = asyncHandler(async (req, res) => {
  const riderId = req.user.sub;
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    throw badRequest('Latitude and longitude are required');
  }

  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw badRequest('Invalid coordinates');
  }

  // Update rider location in rider_profiles
  const result = await query(
    `UPDATE rider_profiles
     SET latitude = $1,
         longitude = $2,
         location_updated_at = NOW(),
         updated_at = NOW()
     WHERE user_id = $3
     RETURNING latitude, longitude, location_updated_at AS "locationUpdatedAt"`,
    [latitude, longitude, riderId]
  );

  // If rider profile doesn't exist, create it
  if (result.rowCount === 0) {
    await query(
      `INSERT INTO rider_profiles (user_id, latitude, longitude, location_updated_at, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW(), NOW())
       RETURNING latitude, longitude, location_updated_at AS "locationUpdatedAt"`,
      [riderId, latitude, longitude]
    );
  }

  res.json({
    status: 'success',
    message: 'Location updated successfully',
    data: {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      locationUpdatedAt: result.rows[0]?.locationUpdatedAt || new Date().toISOString()
    }
  });
});


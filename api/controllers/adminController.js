import { query, withTransaction } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { hashPassword } from '../utils/password.js';
import path from 'path';
import { uploadToSupabase } from '../utils/storage.js';

const mapFrontUserTypeToDb = (type) => {
  if (!type) return null;
  if (type === 'delivery') return 'rider';
  return type;
};

const mapDbUserTypeToFront = (type) => {
  if (type === 'rider') return 'delivery';
  return type;
};

export const getUsers = asyncHandler(async (req, res) => {
  const {
    search = '',
    userType = 'all',
    status = 'all',
    page = '1',
    pageSize = '10'
  } = req.query;

  const filters = [];
  const params = [];
  let paramIndex = 1;

  if (search) {
    filters.push(
      `(LOWER(u.full_name) LIKE $${paramIndex} OR LOWER(u.email) LIKE $${paramIndex})`
    );
    params.push(`%${search.toLowerCase()}%`);
    paramIndex += 1;
  }

  if (userType !== 'all') {
    filters.push(`u.user_type = $${paramIndex}`);
    params.push(mapFrontUserTypeToDb(userType));
    paramIndex += 1;
  }

  if (status !== 'all') {
    if (status === 'suspended') {
      filters.push('u.is_active = false');
      filters.push('u.email_verified = false');
    } else if (status === 'active') {
      filters.push('u.is_active = true');
    } else if (status === 'inactive') {
      filters.push('u.is_active = false');
    } else {
      throw badRequest('Unknown status filter');
    }
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const pageNumber = Math.max(Number.parseInt(page, 10) || 1, 1);
  const limit = Math.max(Number.parseInt(pageSize, 10) || 10, 1);
  const offset = (pageNumber - 1) * limit;

  const usersQuery = `
    WITH base AS (
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.user_type,
        u.is_active,
        u.created_at,
        u.phone,
        COALESCE(r.name, '') AS restaurant_name,
        COALESCE(r.id::text, '') AS restaurant_id,
        COUNT(DISTINCT o.id) AS orders_count
      FROM users u
      LEFT JOIN restaurants r ON r.owner_id = u.id
      LEFT JOIN orders o ON o.customer_id = u.id
      ${whereClause}
      GROUP BY u.id, r.id
    )
    SELECT *
    FROM base
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  const countQuery = `SELECT COUNT(*) AS total FROM users u ${whereClause};`;

  const usersResult = await query(usersQuery, [...params, limit, offset]);
  const countResult = await query(countQuery, params);

  const total = Number.parseInt(countResult.rows[0]?.total ?? '0', 10);
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const users = usersResult.rows.map((user) => ({
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    userType: mapDbUserTypeToFront(user.user_type),
    status: user.is_active ? 'active' : 'inactive',
    joinedAt: user.created_at,
    phone: user.phone,
    restaurant: user.restaurant_id
      ? {
          id: user.restaurant_id,
          name: user.restaurant_name
        }
      : null,
    ordersCount: Number(user.orders_count ?? 0)
  }));

  res.json({
    status: 'success',
    data: users,
    meta: {
      total,
      page: pageNumber,
      pageSize: limit,
      totalPages
    }
  });
});

export const getUserStats = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE user_type = 'customer') AS customers,
       COUNT(*) FILTER (WHERE user_type = 'restaurant') AS restaurants,
       COUNT(*) FILTER (WHERE user_type = 'rider') AS riders,
       COUNT(*) FILTER (WHERE is_active = true) AS active_users
     FROM users;`,
    []
  );

  const activeThisMonthResult = await query(
    `SELECT COUNT(DISTINCT customer_id) AS active_customers
       FROM orders
       WHERE created_at >= NOW() - INTERVAL '30 days';`,
    []
  );

  res.json({
    status: 'success',
    data: {
      totals: {
        customers: Number(result.rows[0]?.customers ?? 0),
        restaurants: Number(result.rows[0]?.restaurants ?? 0),
        riders: Number(result.rows[0]?.riders ?? 0),
        activeThisMonth: Number(
          activeThisMonthResult.rows[0]?.active_customers ?? 0
        )
      },
      deltas: {
        customers: null,
        restaurants: null,
        activeThisMonth: null
      }
    }
  });
});

export const createRestaurantUser = asyncHandler(async (req, res) => {
  const {
    restaurantName,
    email,
    password
  } = req.body;

  if (!restaurantName || !email || !password) {
    throw badRequest('Restaurant name, email, and password are required');
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [
    email.toLowerCase()
  ]);

  if (existing.rowCount > 0) {
    throw conflict('A user with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const isActive = true; // Always create as active for simplified flow

  const result = await withTransaction(async (client) => {
    // Create user with minimal info - restaurant owner will complete profile later
    const userInsert = await client.query(
      `INSERT INTO users (email, password_hash, full_name, user_type, is_active, email_verified)
       VALUES ($1, $2, $3, 'restaurant', $4, true)
       RETURNING id, email, full_name AS "fullName", created_at AS "createdAt"`,
      [email.toLowerCase(), passwordHash, restaurantName, isActive] // Use restaurant name as initial full_name
    );

    const user = userInsert.rows[0];

    // Create basic restaurant record - owner will fill in details later
    // Restaurant starts closed since business hours are not yet set
    const restaurantInsert = await client.query(
      `INSERT INTO restaurants (owner_id, name, email, address, is_open)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, is_open AS "isOpen"`,
      [
        user.id,
        restaurantName,
        email.toLowerCase(),
        'Address to be updated by restaurant owner', // Placeholder address
        false // Start closed until business hours are configured
      ]
    );

    return {
      user,
      restaurant: restaurantInsert.rows[0]
    };
  });

  res.status(201).json({
    status: 'success',
    data: {
      user: {
        ...result.user,
        userType: 'restaurant',
        status: isActive ? 'active' : 'inactive'
      },
      restaurant: result.restaurant
    }
  });
});

export const createDeliveryUser = asyncHandler(async (req, res) => {
  const {
    driverName,
    email,
    password
  } = req.body;

  if (!driverName || !email || !password) {
    throw badRequest('Driver name, email, and password are required');
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [
    email.toLowerCase()
  ]);

  if (existing.rowCount > 0) {
    throw conflict('A user with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const isActive = true; // Always create as active for simplified flow

  const result = await withTransaction(async (client) => {
    const userInsert = await client.query(
      `INSERT INTO users (email, password_hash, full_name, user_type, is_active, email_verified)
       VALUES ($1, $2, $3, 'rider', $4, true)
       RETURNING id, email, full_name AS "fullName", created_at AS "createdAt"`,
      [email.toLowerCase(), passwordHash, driverName, isActive]
    );

    const user = userInsert.rows[0];

    // Create basic rider profile - driver will fill in details later
    await client.query(
      `INSERT INTO rider_profiles (user_id)
       VALUES ($1)`,
      [user.id]
    );

    return { user };
  });

  res.status(201).json({
    status: 'success',
    data: {
      user: {
        ...result.user,
        userType: 'delivery',
        status: isActive ? 'active' : 'inactive'
      }
    }
  });
});

export const getOverviewStats = asyncHandler(async (req, res) => {
  const [{ rows: totals }, { rows: revenue }, { rows: recentOrders }, { rows: deliveryFees }, { rows: markupAmounts }] =
    await Promise.all([
      query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending' AND DATE(created_at) = CURRENT_DATE) AS pending_orders,
           COUNT(*) FILTER (WHERE status = 'delivered' AND DATE(created_at) = CURRENT_DATE) AS completed_orders,
           COUNT(*) FILTER (WHERE status = 'cancelled' AND DATE(created_at) = CURRENT_DATE) AS cancelled_orders
         FROM orders;`
      ),
      query(
        `SELECT
           COALESCE(SUM(total_amount) FILTER (WHERE DATE(created_at) = CURRENT_DATE), 0) AS total_revenue,
           COALESCE(SUM(total_amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0)
             AS revenue_last_30_days
         FROM orders
         WHERE status IN ('confirmed', 'preparing', 'ready', 'picked_up', 'delivered')
           AND DATE(created_at) = CURRENT_DATE;`
      ),
      query(
        `SELECT o.id,
                o.total_amount,
                o.status,
                o.created_at,
                c.full_name AS customer_name,
                r.name AS restaurant_name
         FROM orders o
         LEFT JOIN users c ON c.id = o.customer_id
         LEFT JOIN restaurants r ON r.id = o.restaurant_id
         WHERE DATE(o.created_at) = CURRENT_DATE
         ORDER BY o.created_at DESC
         LIMIT 10;`
      ),
      // Total delivery fees from today's completed orders
      query(
        `SELECT COALESCE(SUM(delivery_fee), 0) AS total_delivery_fees
         FROM orders
         WHERE status IN ('delivered', 'picked_up')
           AND delivery_fee > 0
           AND DATE(created_at) = CURRENT_DATE;`
      ),
      // Total markup amounts from today's order items
      // Calculate actual markup income: (unit_price - restaurant_price) * quantity
      // unit_price is what customer paid (includes markup), restaurant_price is original price
      // This gives the actual markup revenue from today's completed orders
      query(
        `SELECT COALESCE(
           SUM(
             CASE 
               WHEN mi.price IS NOT NULL AND oi.unit_price > mi.price THEN
                 (oi.unit_price - mi.price) * oi.quantity
               WHEN mi.admin_markup_amount > 0 OR mi.admin_markup_percentage > 0 THEN
                 (COALESCE(mi.admin_markup_amount, 0) + 
                  (COALESCE(mi.price, 0) * COALESCE(mi.admin_markup_percentage, 0) / 100)) * oi.quantity
               ELSE 0
             END
           ), 
           0
         ) AS total_markup_amount
         FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
         WHERE o.status IN ('delivered', 'picked_up')
           AND mi.id IS NOT NULL
           AND DATE(o.created_at) = CURRENT_DATE;`
      )
    ]);

  res.json({
    status: 'success',
    data: {
      orders: totals[0] ?? {},
      revenue: revenue[0] ?? {
        total_revenue: 0,
        revenue_last_30_days: 0
      },
      totalDeliveryFees: Number(deliveryFees[0]?.total_delivery_fees ?? 0),
      totalMarkupAmount: Number(markupAmounts[0]?.total_markup_amount ?? 0),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        totalAmount: Number(order.total_amount ?? 0),
        status: order.status,
        createdAt: order.created_at,
        customerName: order.customer_name,
        restaurantName: order.restaurant_name
      }))
    }
  });
});

export const deactivateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await query(
    `UPDATE users SET is_active = false WHERE id = $1 RETURNING id`,
    [userId]
  );

  if (result.rowCount === 0) {
    throw notFound('User not found');
  }

  res.json({ status: 'success', message: 'User deactivated' });
});

export const activateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await query(
    `UPDATE users SET is_active = true WHERE id = $1 RETURNING id`,
    [userId]
  );

  if (result.rowCount === 0) {
    throw notFound('User not found');
  }

  res.json({ status: 'success', message: 'User activated' });
});

export const getAdminOrders = asyncHandler(async (req, res) => {
  const {
    status = 'all',
    page = '1',
    pageSize = '20',
    restaurantId,
    customerId
  } = req.query;

  const filters = [];
  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    filters.push(`o.status = $${paramIndex}`);
    params.push(status);
    paramIndex += 1;
  }

  if (restaurantId) {
    filters.push(`o.restaurant_id = $${paramIndex}`);
    params.push(restaurantId);
    paramIndex += 1;
  }

  if (customerId) {
    filters.push(`o.customer_id = $${paramIndex}`);
    params.push(customerId);
    paramIndex += 1;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const pageNumber = Math.max(Number.parseInt(page, 10) || 1, 1);
  const limit = Math.max(Number.parseInt(pageSize, 10) || 20, 1);
  const offset = (pageNumber - 1) * limit;

  const ordersQuery = `
    SELECT o.id,
           o.status,
           o.total_amount,
           o.subtotal,
           o.delivery_fee,
           o.tip_amount,
           o.created_at,
           c.full_name AS customer_name,
           c.email AS customer_email,
           r.name AS restaurant_name,
           r.image_url AS restaurant_logo
    FROM orders o
    LEFT JOIN users c ON c.id = o.customer_id
    LEFT JOIN restaurants r ON r.id = o.restaurant_id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  const countQuery = `SELECT COUNT(*) AS total FROM orders o ${whereClause};`;

  const [ordersResult, countResult] = await Promise.all([
    query(ordersQuery, [...params, limit, offset]),
    query(countQuery, params)
  ]);

  const total = Number.parseInt(countResult.rows[0]?.total ?? '0', 10);
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  res.json({
    status: 'success',
    data: ordersResult.rows.map((order) => ({
      id: order.id,
      status: order.status,
      totalAmount: Number(order.total_amount ?? 0),
      subtotal: Number(order.subtotal ?? 0),
      deliveryFee: Number(order.delivery_fee ?? 0),
      tipAmount: Number(order.tip_amount ?? 0),
      createdAt: order.created_at,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      restaurantName: order.restaurant_name,
      restaurantLogo: order.restaurant_logo
    })),
    meta: {
      total,
      page: pageNumber,
      pageSize: limit,
      totalPages
    }
  });
});

export const getRealTimeOrders = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT o.id,
            o.status,
            o.total_amount,
            o.created_at,
            c.full_name AS customer_name,
            c.email AS customer_email,
            r.name AS restaurant_name,
            r.image_url AS restaurant_logo,
            CASE
              WHEN o.status IN ('preparing', 'ready') THEN
                EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 60
              ELSE NULL
            END AS eta_minutes
     FROM orders o
     LEFT JOIN users c ON c.id = o.customer_id
     LEFT JOIN restaurants r ON r.id = o.restaurant_id
     WHERE o.status IN ('pending', 'confirmed', 'preparing', 'ready')
     ORDER BY o.created_at DESC
     LIMIT 20;`,
    []
  );

  res.json({
    status: 'success',
    data: result.rows.map((order) => ({
      id: order.id,
      status: order.status,
      totalAmount: Number(order.total_amount ?? 0),
      createdAt: order.created_at,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      restaurantName: order.restaurant_name,
      restaurantLogo: order.restaurant_logo,
      eta: order.eta_minutes ? `${Math.ceil(order.eta_minutes)} min` : 'N/A'
    }))
  });
});

export const getDailyOrderVolume = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT
       DATE(created_at) AS date,
       COUNT(*) AS value
     FROM orders
     WHERE created_at >= NOW() - INTERVAL '7 days'
       AND status IN ('confirmed', 'preparing', 'ready', 'picked_up', 'delivered')
     GROUP BY DATE(created_at)
     ORDER BY DATE(created_at);`,
    []
  );

  // Fill in missing days with 0
  const data = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const existing = result.rows.find(row => row.date.toISOString().split('T')[0] === dateStr);
    data.push({
      date: dateStr,
      value: existing ? Number(existing.value) : 0
    });
  }

  res.json({
    status: 'success',
    data
  });
});

export const approveRestaurant = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  const result = await query(
    `UPDATE restaurants
     SET is_open = true,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name`,
    [restaurantId]
  );

  if (result.rowCount === 0) {
    throw notFound('Restaurant not found');
  }

  res.json({
    status: 'success',
    message: 'Restaurant opened',
    data: result.rows[0]
  });
});

export const rejectRestaurant = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  const result = await query(
    `UPDATE restaurants
     SET is_open = false,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name`,
    [restaurantId]
  );

  if (result.rowCount === 0) {
    throw notFound('Restaurant not found');
  }

  res.json({
    status: 'success',
    message: 'Restaurant closed',
    data: result.rows[0]
  });
});

export const deleteRestaurant = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  // First check if restaurant exists
  const checkResult = await query(
    `SELECT id, name FROM restaurants WHERE id = $1`,
    [restaurantId]
  );

  if (checkResult.rowCount === 0) {
    throw notFound('Restaurant not found');
  }

  const restaurantName = checkResult.rows[0].name;

  // Delete restaurant (cascade will handle related data)
  // Note: Due to foreign key constraints, we need to delete in order:
  // 1. Order status events for restaurant orders
  // 2. Payments for restaurant orders
  // 3. Order items for restaurant orders
  // 4. Deliveries for restaurant orders
  // 5. Reviews for restaurant
  // 6. Favorites for restaurant
  // 7. Menu item variants
  // 8. Menu items
  // 9. Menu categories
  // 10. Business hours
  // 11. Orders
  // 12. Delivery requests
  // 13. Restaurant itself

  await query('BEGIN');

  try {
    // Delete order status events
    await query(
      `DELETE FROM order_status_events 
       WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = $1)`,
      [restaurantId]
    );

    // Delete payments
    await query(
      `DELETE FROM payments 
       WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = $1)`,
      [restaurantId]
    );

    // Delete order items
    await query(
      `DELETE FROM order_items 
       WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = $1)`,
      [restaurantId]
    );

    // Delete deliveries
    await query(
      `DELETE FROM deliveries 
       WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = $1)`,
      [restaurantId]
    );

    // Delete reviews
    await query(
      `DELETE FROM reviews WHERE restaurant_id = $1`,
      [restaurantId]
    );

    // Delete favorites
    await query(
      `DELETE FROM favorites WHERE restaurant_id = $1`,
      [restaurantId]
    );

    // Delete menu item variants
    await query(
      `DELETE FROM menu_item_variants 
       WHERE menu_item_id IN (SELECT id FROM menu_items WHERE restaurant_id = $1)`,
      [restaurantId]
    );

    // Delete menu items
    await query(
      `DELETE FROM menu_items WHERE restaurant_id = $1`,
      [restaurantId]
    );

    // Delete menu categories
    await query(
      `DELETE FROM menu_categories WHERE restaurant_id = $1`,
      [restaurantId]
    );

    // Delete business hours
    await query(
      `DELETE FROM business_hours WHERE restaurant_id = $1`,
      [restaurantId]
    );

    // Delete orders
    await query(
      `DELETE FROM orders WHERE restaurant_id = $1`,
      [restaurantId]
    );

    // Delete delivery requests
    await query(
      `DELETE FROM delivery_requests WHERE restaurant_id = $1`,
      [restaurantId]
    );

    // Finally delete the restaurant
    await query(
      `DELETE FROM restaurants WHERE id = $1`,
      [restaurantId]
    );

    await query('COMMIT');

    res.json({
      status: 'success',
      message: `Restaurant "${restaurantName}" deleted successfully`,
      data: { id: restaurantId, name: restaurantName }
    });
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
});

export const adjustRestaurantPrices = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  const { percentage } = req.body;

  if (!percentage || percentage < 0 || percentage > 100) {
    throw badRequest('Percentage must be between 0 and 100');
  }

  const multiplier = 1 + (percentage / 100);

  // First, store original prices if not already stored (before first adjustment)
  // This ensures we can reset later
  await query(
    `UPDATE menu_items
     SET original_price = price
     WHERE restaurant_id = $1 
       AND has_variants = false 
       AND price IS NOT NULL 
       AND original_price IS NULL`,
    [restaurantId]
  );

  // Store original prices for variants
  await query(
    `UPDATE menu_item_variants
     SET original_price = price
     WHERE menu_item_id IN (
       SELECT id FROM menu_items WHERE restaurant_id = $1 AND has_variants = true
     )
     AND original_price IS NULL
     AND price IS NOT NULL`,
    [restaurantId]
  );

  // Update menu item prices
  const itemsResult = await query(
    `UPDATE menu_items
     SET price = ROUND(price * $2, 2),
         updated_at = NOW()
     WHERE restaurant_id = $1 AND has_variants = false AND price IS NOT NULL
     RETURNING id, name, price`,
    [restaurantId, multiplier]
  );

  // Update menu item variant prices
  const variantsResult = await query(
    `UPDATE menu_item_variants
     SET price = ROUND(price * $2, 2),
         updated_at = NOW()
     WHERE menu_item_id IN (
       SELECT id FROM menu_items WHERE restaurant_id = $1 AND has_variants = true
     )
     RETURNING id, name, price`,
    [restaurantId, multiplier]
  );

  res.json({
    status: 'success',
    message: `Prices adjusted by ${percentage}%`,
    data: {
      itemsUpdated: itemsResult.rowCount,
      variantsUpdated: variantsResult.rowCount
    }
  });
});

export const resetRestaurantPrices = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  // Reset menu item prices from original_price and remove all admin markups
  const itemsResult = await query(
    `UPDATE menu_items
     SET price = COALESCE(original_price, price),
         admin_markup_amount = 0.00,
         admin_markup_percentage = 0.00,
         updated_at = NOW()
     WHERE restaurant_id = $1 
       AND has_variants = false 
       AND (original_price IS NOT NULL OR price IS NOT NULL)
     RETURNING id, name, price`,
    [restaurantId]
  );

  // Reset variant prices from original_price
  const variantsResult = await query(
    `UPDATE menu_item_variants
     SET price = COALESCE(original_price, price),
         updated_at = NOW()
     WHERE menu_item_id IN (
       SELECT id FROM menu_items WHERE restaurant_id = $1 AND has_variants = true
     )
     AND (original_price IS NOT NULL OR price IS NOT NULL)
     RETURNING id, name, price`,
    [restaurantId]
  );

  // Also reset markups for items with variants (they might have markups too)
  await query(
    `UPDATE menu_items
     SET admin_markup_amount = 0.00,
         admin_markup_percentage = 0.00,
         updated_at = NOW()
     WHERE restaurant_id = $1 
       AND has_variants = true
       AND (admin_markup_amount > 0 OR admin_markup_percentage > 0)`,
    [restaurantId]
  );

  res.json({
    status: 'success',
    message: 'All price adjustments and markups have been removed',
    data: {
      itemsReset: itemsResult.rowCount,
      variantsReset: variantsResult.rowCount
    }
  });
});

export const getAdminRestaurants = asyncHandler(async (req, res) => {
  const {
    search = '',
    approvalStatus = 'all',
    page = '1',
    pageSize = '20'
  } = req.query;

  const filters = [];
  const params = [];
  let index = 1;

  if (search) {
    filters.push(
      `(LOWER(r.name) LIKE $${index} OR LOWER(r.description) LIKE $${index})`
    );
    params.push(`%${search.toLowerCase()}%`);
    index += 1;
  }

  if (approvalStatus !== 'all') {
    filters.push(`r.approval_status = $${index}`);
    params.push(approvalStatus);
    index += 1;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const pageNumber = Math.max(Number.parseInt(page, 10) || 1, 1);
  const limit = Math.max(Number.parseInt(pageSize, 10) || 20, 1);
  const offset = (pageNumber - 1) * limit;

  const dataQuery = `
    SELECT r.id,
           r.name,
           r.description,
           r.phone,
           r.email,
           r.address,
           r.cuisine_type AS "cuisineType",
           r.price_range AS "priceRange",
           r.rating,
           r.total_reviews AS "totalReviews",
           r.delivery_fee AS "deliveryFee",
           r.minimum_order AS "minimumOrder",
           r.is_open AS "isOpen",
           r.image_url AS "imageUrl",
           'approved' AS "approvalStatus",
           u.full_name AS "ownerName",
           u.email AS "ownerEmail"
    FROM restaurants r
    LEFT JOIN users u ON u.id = r.owner_id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT $${index} OFFSET $${index + 1};
  `;

  const countQuery = `SELECT COUNT(*) AS total FROM restaurants r ${whereClause};`;

  const [dataResult, countResult] = await Promise.all([
    query(dataQuery, [...params, limit, offset]),
    query(countQuery, params)
  ]);

  const total = Number.parseInt(countResult.rows[0]?.total ?? '0', 10);
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  res.json({
    status: 'success',
    data: dataResult.rows,
    meta: {
      total,
      page: pageNumber,
      pageSize: limit,
      totalPages
    }
  });
});

export const getRevenueTrends = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT
       DATE_TRUNC('month', created_at) AS month,
       SUM(total_amount) AS value
     FROM orders
     WHERE created_at >= NOW() - INTERVAL '6 months'
       AND status IN ('confirmed', 'preparing', 'ready', 'picked_up', 'delivered')
     GROUP BY DATE_TRUNC('month', created_at)
     ORDER BY DATE_TRUNC('month', created_at);`,
    []
  );

  // Fill in missing months with 0
  const data = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthStr = date.toISOString().slice(0, 7);
    const existing = result.rows.find(row => {
      const rowMonth = new Date(row.month).toISOString().slice(0, 7);
      return rowMonth === monthStr;
    });
    data.push({
      month: monthStr,
      value: existing ? Number(existing.value) : 0
    });
  }

  res.json({
    status: 'success',
    data
  });
});

export const getPaymentQrCode = asyncHandler(async (req, res) => {
  // Get the current QR code URL from payment_settings table
  const result = await query(
    `SELECT value AS "qrCodeUrl", updated_at AS "updatedAt"
     FROM payment_settings
     WHERE key = 'qr_code_url'
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    return res.json({
      status: 'success',
      data: {
        qrCodeUrl: null,
        updatedAt: null
      }
    });
  }

  res.json({
    status: 'success',
    data: {
      qrCodeUrl: result.rows[0].qrCodeUrl,
      updatedAt: result.rows[0].updatedAt
    }
  });
});

export const uploadPaymentQrCode = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw badRequest('No QR code image file provided');
  }

  // Generate unique filename
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const fileExtension = path.extname(req.file.originalname);
  const fileName = `qr-code-${uniqueSuffix}${fileExtension}`;
  const filePath = `payment/${fileName}`;

  // Upload to Supabase Storage
  const { url } = await uploadToSupabase(
    req.file.buffer,
    'uploads',
    filePath,
    req.file.mimetype
  );

  // Insert or update the QR code URL in payment_settings
  const result = await query(
    `INSERT INTO payment_settings (key, value, updated_at)
     VALUES ('qr_code_url', $1, NOW())
     ON CONFLICT (key)
     DO UPDATE SET
       value = $1,
       updated_at = NOW()
     RETURNING value AS "qrCodeUrl", updated_at AS "updatedAt"`,
    [url]
  );

  res.json({
    status: 'success',
    data: {
      qrCodeUrl: result.rows[0].qrCodeUrl,
      updatedAt: result.rows[0].updatedAt
    }
  });
});

// Get restaurant menu items with markup info (for admin)
export const getRestaurantMenuItems = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  // Verify restaurant exists
  const restaurantCheck = await query(
    'SELECT id FROM restaurants WHERE id = $1',
    [restaurantId]
  );

  if (restaurantCheck.rowCount === 0) {
    throw notFound('Restaurant not found');
  }

  // Get categories
  const categories = await query(
    `SELECT c.id,
            c.name,
            c.description,
            c.display_order AS "displayOrder",
            c.is_active AS "isActive"
     FROM menu_categories c
     WHERE c.restaurant_id = $1
     ORDER BY c.display_order ASC, c.created_at ASC`,
    [restaurantId]
  );

  // Get menu items with markup and approval status
  const items = await query(
    `SELECT i.id,
            i.category_id AS "categoryId",
            i.name,
            i.description,
            i.price,
            i.image_url AS "imageUrl",
            i.is_available AS "isAvailable",
            i.approval_status AS "approvalStatus",
            i.admin_markup_amount AS "adminMarkupAmount",
            i.admin_markup_percentage AS "adminMarkupPercentage",
            i.has_variants AS "hasVariants",
            CASE 
              WHEN i.price IS NOT NULL THEN 
                ROUND(i.price + COALESCE(i.admin_markup_amount, 0) + (i.price * COALESCE(i.admin_markup_percentage, 0) / 100), 2)
              ELSE NULL
            END AS "finalPrice"
     FROM menu_items i
     WHERE i.restaurant_id = $1
     ORDER BY i.created_at ASC`,
    [restaurantId]
  );

  // Get variants if any
  const itemIds = items.rows.map(item => item.id);
  let variants = [];
  if (itemIds.length > 0) {
    const variantsResult = await query(
      `SELECT v.id,
              v.menu_item_id AS "menuItemId",
              v.name,
              v.price,
              v.is_available AS "isAvailable",
              v.display_order AS "displayOrder"
       FROM menu_item_variants v
       WHERE v.menu_item_id = ANY($1::uuid[])
       ORDER BY v.display_order ASC, v.created_at ASC`,
      [itemIds]
    );
    variants = variantsResult.rows;
  }

  // Attach variants to items and calculate final prices with markup
  const itemsWithVariants = items.rows.map(item => {
    const itemVariants = variants.filter(v => v.menuItemId === item.id);
    const markupAmount = parseFloat(item.adminMarkupAmount || 0);
    const markupPercentage = parseFloat(item.adminMarkupPercentage || 0);
    
    return {
      ...item,
      variants: itemVariants.map(v => {
        const variantPrice = parseFloat(v.price);
        // Apply parent item's markup to variant price
        const finalVariantPrice = variantPrice + markupAmount + (variantPrice * markupPercentage / 100);
        
        return {
          id: v.id,
          name: v.name,
          price: variantPrice,
          finalPrice: Math.round(finalVariantPrice * 100) / 100, // Round to 2 decimal places
          isAvailable: v.isAvailable,
          displayOrder: v.displayOrder
        };
      })
    };
  });

  // Group items by category
  const itemsByCategory = itemsWithVariants.reduce((acc, item) => {
    const key = item.categoryId ?? 'uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const result = categories.rows.map((category) => ({
    ...category,
    items: itemsByCategory[category.id] ?? []
  }));

  // Add uncategorized items if any exist
  if (itemsByCategory['uncategorized'] && itemsByCategory['uncategorized'].length > 0) {
    result.push({
      id: 'uncategorized',
      name: 'Uncategorized',
      description: null,
      displayOrder: 999,
      isActive: true,
      items: itemsByCategory['uncategorized']
    });
  }

  res.json({
    status: 'success',
    data: result
  });
});

// Set markup on menu item
// Generate daily report with restaurant revenues and admin totals
// Get admin profile
export const getAdminProfile = asyncHandler(async (req, res) => {
  const adminId = req.user.sub;

  const result = await query(
    `SELECT 
       id,
       email,
       full_name AS "fullName",
       phone,
       image_url AS "imageUrl",
       created_at AS "createdAt"
     FROM users
     WHERE id = $1 AND user_type = 'admin'`,
    [adminId]
  );

  if (result.rowCount === 0) {
    throw notFound('Admin not found');
  }

  res.json({ status: 'success', data: result.rows[0] });
});

// Update admin profile
export const updateAdminProfile = asyncHandler(async (req, res) => {
  const adminId = req.user.sub;
  const { fullName, phone } = req.body;

  const result = await query(
    `UPDATE users
     SET full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         updated_at = NOW()
     WHERE id = $3 AND user_type = 'admin'
     RETURNING id, email, full_name AS "fullName", phone, image_url AS "imageUrl", updated_at AS "updatedAt"`,
    [fullName ?? null, phone ?? null, adminId]
  );

  if (result.rowCount === 0) {
    throw notFound('Admin not found');
  }

  res.json({ status: 'success', data: result.rows[0] });
});

// Upload admin profile image
export const uploadAdminProfileImage = asyncHandler(async (req, res) => {
  const adminId = req.user.sub;

  if (!req.file) {
    throw badRequest('No image file provided');
  }

  // Generate unique filename
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const fileExtension = path.extname(req.file.originalname);
  const fileName = `admin-${uniqueSuffix}${fileExtension}`;
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
     WHERE id = $2 AND user_type = 'admin'
     RETURNING id, image_url AS "imageUrl"`,
    [url, adminId]
  );

  if (result.rowCount === 0) {
    throw notFound('Admin not found');
  }

  res.json({
    status: 'success',
    data: {
      id: result.rows[0].id,
      imageUrl: result.rows[0].imageUrl
    }
  });
});

export const generateDailyReport = asyncHandler(async (req, res) => {
  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Get restaurant revenues (original price only - without markup)
  // Restaurant revenue = sum of (original menu item price * quantity) for each restaurant
  // This is the amount restaurants should receive (before admin markup)
  const restaurantRevenues = await query(
    `SELECT 
       r.id,
       r.name AS restaurant_name,
       COALESCE(SUM(
         COALESCE(mi.price, 0) * oi.quantity
       ), 0) AS restaurant_revenue
     FROM restaurants r
     INNER JOIN orders o ON o.restaurant_id = r.id
       AND DATE(o.created_at) = CURRENT_DATE
       AND o.status IN ('delivered', 'picked_up')
     INNER JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE mi.price IS NOT NULL
     GROUP BY r.id, r.name
     HAVING COALESCE(SUM(COALESCE(mi.price, 0) * oi.quantity), 0) > 0
     ORDER BY restaurant_revenue DESC`,
    []
  );

  // Get admin totals for today
  const adminTotals = await query(
    `SELECT 
       COALESCE(SUM(o.delivery_fee), 0) AS total_delivery_fees,
       COALESCE(SUM(
         CASE 
           WHEN mi.price IS NOT NULL AND oi.unit_price > mi.price THEN
             (oi.unit_price - mi.price) * oi.quantity
           WHEN mi.admin_markup_amount > 0 OR mi.admin_markup_percentage > 0 THEN
             (COALESCE(mi.admin_markup_amount, 0) + 
              (COALESCE(mi.price, 0) * COALESCE(mi.admin_markup_percentage, 0) / 100)) * oi.quantity
           ELSE 0
         END
       ), 0) AS total_markup_amount,
       COALESCE(SUM(o.total_amount), 0) AS total_revenue
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE DATE(o.created_at) = CURRENT_DATE
       AND o.status IN ('delivered', 'picked_up')`,
    []
  );

  res.json({
    status: 'success',
    data: {
      date: today,
      restaurants: restaurantRevenues.rows.map(row => ({
        id: row.id,
        name: row.restaurant_name,
        revenue: Number(row.restaurant_revenue || 0)
      })),
      adminTotals: {
        totalDeliveryFees: Number(adminTotals.rows[0]?.total_delivery_fees || 0),
        totalMarkupAmount: Number(adminTotals.rows[0]?.total_markup_amount || 0),
        totalRevenue: Number(adminTotals.rows[0]?.total_revenue || 0)
      }
    }
  });
});

export const setMenuItemMarkup = asyncHandler(async (req, res) => {
  const { restaurantId, menuItemId } = req.params;
  const { markupAmount, markupPercentage, approvalStatus } = req.body;

  // Verify menu item belongs to restaurant
  const itemCheck = await query(
    'SELECT id, restaurant_id FROM menu_items WHERE id = $1',
    [menuItemId]
  );

  if (itemCheck.rowCount === 0) {
    throw notFound('Menu item not found');
  }

  if (itemCheck.rows[0].restaurant_id !== restaurantId) {
    throw badRequest('Menu item does not belong to this restaurant');
  }

  // Build update query
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (markupAmount !== undefined) {
    updates.push(`admin_markup_amount = $${paramIndex}`);
    params.push(markupAmount);
    paramIndex++;
  }

  if (markupPercentage !== undefined) {
    updates.push(`admin_markup_percentage = $${paramIndex}`);
    params.push(markupPercentage);
    paramIndex++;
  }

  if (approvalStatus !== undefined) {
    updates.push(`approval_status = $${paramIndex}`);
    params.push(approvalStatus);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw badRequest('No fields to update');
  }

  updates.push(`updated_at = NOW()`);
  params.push(menuItemId);

  const result = await query(
    `UPDATE menu_items
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id,
               name,
               price,
               has_variants AS "hasVariants",
               admin_markup_amount AS "adminMarkupAmount",
               admin_markup_percentage AS "adminMarkupPercentage",
               approval_status AS "approvalStatus",
               CASE 
                 WHEN price IS NOT NULL THEN 
                   ROUND(price + COALESCE(admin_markup_amount, 0) + (price * COALESCE(admin_markup_percentage, 0) / 100), 2)
                 ELSE NULL
               END AS "finalPrice"`,
    params
  );

  const updatedItem = result.rows[0];

  // If item has variants, fetch and calculate final prices for variants
  if (updatedItem.hasVariants) {
    const variantsResult = await query(
      `SELECT id,
              name,
              price,
              is_available AS "isAvailable",
              display_order AS "displayOrder"
       FROM menu_item_variants
       WHERE menu_item_id = $1
       ORDER BY display_order ASC, created_at ASC`,
      [menuItemId]
    );

    const markupAmount = parseFloat(updatedItem.adminMarkupAmount || 0);
    const markupPercentage = parseFloat(updatedItem.adminMarkupPercentage || 0);

    updatedItem.variants = variantsResult.rows.map(v => {
      const variantPrice = parseFloat(v.price);
      const finalVariantPrice = variantPrice + markupAmount + (variantPrice * markupPercentage / 100);
      
      return {
        id: v.id,
        name: v.name,
        price: variantPrice,
        finalPrice: Math.round(finalVariantPrice * 100) / 100,
        isAvailable: v.isAvailable,
        displayOrder: v.displayOrder
      };
    });
  }

  res.json({
    status: 'success',
    message: 'Menu item markup updated successfully',
    data: updatedItem
  });
});


import { query, withTransaction } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  badRequest,
  forbidden,
  notFound,
  unauthorized
} from '../utils/httpError.js';

const allowedStatuses = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked_up',
  'delivered',
  'cancelled'
];

const normalizeRole = (role) => (role === 'delivery' ? 'rider' : role);

const canMutateOrder = (reqUser, order) => {
  const role = normalizeRole(reqUser.role);

  if (role === 'admin') return true;
  if (role === 'customer' && order.customer_id === reqUser.sub) {
    return true;
  }
  if (role === 'restaurant' && order.restaurant_owner_id === reqUser.sub) {
    return true;
  }
  if (role === 'rider' && order.rider_id === reqUser.sub) {
    return true;
  }
  return false;
};

export const createOrder = asyncHandler(async (req, res) => {
  const {
    customerId,
    restaurantId,
    deliveryAddressId,
    orderType = 'delivery',
    tipAmount = 0,
    items,
    specialInstructions
  } = req.body;

  if (req.user.role !== 'admin' && req.user.sub !== customerId) {
    throw unauthorized('You cannot create orders for another customer');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest('Order items are required');
  }

  const menuItemsResult = await query(
    `SELECT id,
            price,
            name,
            is_available AS "isAvailable",
            has_variants AS "hasVariants"
     FROM menu_items
     WHERE id = ANY($1::uuid[])
       AND restaurant_id = $2`,
    [items.map((item) => item.menuItemId), restaurantId]
  );

  if (menuItemsResult.rowCount !== items.length) {
    throw badRequest('One or more menu items are invalid');
  }

  const menuItemsMap = menuItemsResult.rows.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  // Fetch variants for items that have variantId
  const variantIds = items
    .map((item) => item.variantId)
    .filter((id) => id != null);
  
  let variantsMap = {};
  if (variantIds.length > 0) {
    const variantsResult = await query(
      `SELECT id,
              menu_item_id,
              price,
              is_available AS "isAvailable"
       FROM menu_item_variants
       WHERE id = ANY($1::uuid[])`,
      [variantIds]
    );

    variantsMap = variantsResult.rows.reduce((acc, variant) => {
      acc[variant.id] = variant;
      return acc;
    }, {});

    // Validate all variants exist and are available
    for (const item of items) {
      if (item.variantId) {
        const variant = variantsMap[item.variantId];
        if (!variant) {
          throw badRequest(`Variant ${item.variantId} not found`);
        }
        if (!variant.isAvailable) {
          throw badRequest(`Variant ${item.variantId} is not available`);
        }
        // Verify variant belongs to the menu item
        if (variant.menu_item_id !== item.menuItemId) {
          throw badRequest(`Variant ${item.variantId} does not belong to menu item ${item.menuItemId}`);
        }
      }
    }
  }

  const subtotal = items.reduce((acc, item) => {
    const menuItem = menuItemsMap[item.menuItemId];
    if (!menuItem) {
      throw badRequest(`Menu item ${item.menuItemId} not found`);
    }
    if (!menuItem.isAvailable) {
      throw badRequest(`Menu item ${menuItem.name} is not available`);
    }
    
    // Use variant price if variantId is provided, otherwise use menu item price
    let unitPrice;
    if (item.variantId) {
      const variant = variantsMap[item.variantId];
      if (!variant) {
        throw badRequest(`Variant ${item.variantId} not found for menu item ${menuItem.name}`);
      }
      unitPrice = Number(variant.price);
    } else {
      // If menu item has variants but no variantId provided, that's an error
      if (menuItem.hasVariants) {
        throw badRequest(`Menu item ${menuItem.name} requires a variant selection`);
      }
      unitPrice = Number(menuItem.price);
    }
    
    const quantity = Number(item.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw badRequest('Quantity must be a positive integer');
    }
    return acc + unitPrice * quantity;
  }, 0);

  const restaurantResult = await query(
    `SELECT delivery_fee, minimum_order FROM restaurants WHERE id = $1`,
    [restaurantId]
  );

  if (restaurantResult.rowCount === 0) {
    throw notFound('Restaurant not found');
  }

  const { delivery_fee: restaurantDeliveryFee, minimum_order: minimumOrder } =
    restaurantResult.rows[0];

  if (orderType === 'delivery' && Number(minimumOrder ?? 0) > subtotal) {
    throw badRequest('Subtotal is below the restaurant minimum order amount');
  }

  // Calculate delivery fee based on barangay extracted from address and order amount
  let deliveryFee = 0;
  if (orderType === 'delivery' && deliveryAddressId) {
    // Get delivery address
    const addressResult = await query(
      `SELECT street_address, city
       FROM addresses
       WHERE id = $1 AND user_id = $2`,
      [deliveryAddressId, customerId]
    );

    if (addressResult.rowCount === 0) {
      throw badRequest('Delivery address not found');
    }

    const address = addressResult.rows[0];
    const addressString = (address.street_address || '').toLowerCase();
    const cityString = (address.city || '').toLowerCase();
    const combinedAddress = `${addressString} ${cityString}`;

    // Get all allowed barangays
    const allowedBarangaysResult = await query(
      `SELECT DISTINCT barangay
       FROM delivery_fee_tiers
       WHERE is_active = true
       ORDER BY barangay ASC`
    );

    const allowedBarangays = allowedBarangaysResult.rows.map(row => row.barangay);

    if (allowedBarangays.length === 0) {
      throw badRequest('No delivery fee tiers configured. Please contact support.');
    }

    // Extract barangay from address string
    let matchedBarangay = null;
    
    // Normalize barangay names for matching
    const normalizedBarangays = allowedBarangays.map(b => ({
      original: b,
      normalized: b.toLowerCase().replace(/^barangay\s+/i, '').trim(),
      fullLower: b.toLowerCase()
    }));

    // Try to match barangay from address string
    // Prioritize matching just the place name (e.g., "tayaga", "espina") without "Barangay" prefix
    const combinedAddressLower = combinedAddress.toLowerCase();
    
    for (const { original, normalized, fullLower } of normalizedBarangays) {
      // Prioritize: Check if normalized name (place name only) appears in address
      if (normalized.length >= 3) {
        // Use word boundaries for more accurate matching to avoid partial matches
        const normalizedRegex = new RegExp(`\\b${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (normalizedRegex.test(combinedAddressLower)) {
          matchedBarangay = original;
          break;
        }
      }
    }
    
    // If no match found with normalized name, try full "Barangay X" format
    if (!matchedBarangay) {
      for (const { original, normalized, fullLower } of normalizedBarangays) {
        // Check for "Barangay X" format
        const barangayPattern = `barangay ${normalized}`;
        const brgyPattern = `brgy[\\s\\.]${normalized}`;
        
        const patterns = [
          new RegExp(`\\b${barangayPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
          new RegExp(`\\b${brgyPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
          new RegExp(`\\b${fullLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        ];
        
        for (const pattern of patterns) {
          if (pattern.test(combinedAddressLower)) {
            matchedBarangay = original;
            break;
          }
        }
        if (matchedBarangay) break;
      }
    }

    if (!matchedBarangay) {
      throw badRequest(
        `Delivery is not available to your selected location. ` +
        `We currently deliver to: ${allowedBarangays.join(', ')}. ` +
        `Please ensure your address includes one of these barangays.`
      );
    }

    // Get the appropriate tier for this order amount
    const tierResult = await query(
      `SELECT delivery_fee
       FROM delivery_fee_tiers
       WHERE barangay = $1
         AND min_order_amount <= $2
         AND max_order_amount >= $2
         AND is_active = true
       ORDER BY min_order_amount DESC
       LIMIT 1`,
      [matchedBarangay, subtotal]
    );

    if (tierResult.rowCount > 0) {
      deliveryFee = parseFloat(tierResult.rows[0].delivery_fee);
    } else {
      // If no tier found, get the highest tier (for orders above 1500)
      const maxTierResult = await query(
        `SELECT delivery_fee
         FROM delivery_fee_tiers
         WHERE barangay = $1
           AND is_active = true
         ORDER BY max_order_amount DESC
         LIMIT 1`,
        [matchedBarangay]
      );
      
      if (maxTierResult.rowCount > 0) {
        deliveryFee = parseFloat(maxTierResult.rows[0].delivery_fee);
      } else {
        throw badRequest(`Delivery fee configuration not found for ${matchedBarangay}`);
      }
    }
  } else if (orderType === 'pickup') {
    deliveryFee = 0;
  } else {
    // Fallback to restaurant's default delivery fee (shouldn't happen for delivery orders)
    deliveryFee = Number(restaurantDeliveryFee ?? 0);
  }

  const taxAmount = 0; // Tax removed
  const totalAmount = subtotal + deliveryFee + Number(tipAmount ?? 0);

  const result = await withTransaction(async (client) => {
    const orderInsert = await client.query(
      `INSERT INTO orders (
          customer_id,
          restaurant_id,
          delivery_address_id,
          status,
          order_type,
          subtotal,
          delivery_fee,
          tax_amount,
          tip_amount,
          total_amount,
          special_instructions
       )
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        customerId,
        restaurantId,
        orderType === 'delivery' ? deliveryAddressId ?? null : null,
        orderType,
        subtotal,
        deliveryFee ?? 0,
        taxAmount,
        tipAmount ?? 0,
        totalAmount,
        specialInstructions ?? null
      ]
    );

    const order = orderInsert.rows[0];

    const orderItemsValues = items.flatMap((item) => {
      const menuItem = menuItemsMap[item.menuItemId];
      
      // Use variant price if variantId is provided, otherwise use menu item price
      let unitPrice;
      if (item.variantId) {
        const variant = variantsMap[item.variantId];
        if (!variant) {
          throw badRequest(`Variant ${item.variantId} not found`);
        }
        unitPrice = Number(variant.price);
      } else {
        unitPrice = Number(menuItem.price);
      }
      
      return [
        order.id,
        item.menuItemId,
        item.quantity,
        unitPrice,
        item.specialInstructions ?? null
      ];
    });

    const valuePlaceholders = items
      .map(
        (_, idx) =>
          `($${idx * 5 + 1}, $${idx * 5 + 2}, $${idx * 5 + 3}, $${
            idx * 5 + 4
          }, $${idx * 5 + 5})`
      )
      .join(', ');

    await client.query(
      `INSERT INTO order_items (
          order_id,
          menu_item_id,
          quantity,
          unit_price,
          special_instructions
       ) VALUES ${valuePlaceholders}`,
      orderItemsValues
    );

    if (orderType === 'delivery') {
      await client.query(
        `INSERT INTO deliveries (order_id, status)
         VALUES ($1, 'assigned')`,
        [order.id]
      );
    }

    return order;
  });

  res.status(201).json({
    status: 'success',
    data: {
      orderId: result.id,
      status: result.status,
      totalAmount,
      estimatedDeliveryTime: result.estimated_delivery_time
    }
  });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const orderResult = await query(
    `SELECT o.*,
            c.full_name AS customer_name,
            c.phone AS customer_phone,
            r.name AS restaurant_name,
            r.address AS restaurant_address,
            r.phone AS restaurant_phone,
            r.image_url AS restaurant_image_url,
            rp.vehicle_type AS rider_vehicle_type,
            ru.full_name AS rider_name,
            ru.phone AS rider_phone,
            u.full_name AS restaurant_owner_name,
            a.street_address AS delivery_street_address,
            a.city AS delivery_city,
            a.state AS delivery_state,
            a.zip_code AS delivery_zip_code
     FROM orders o
     LEFT JOIN users c ON c.id = o.customer_id
     LEFT JOIN restaurants r ON r.id = o.restaurant_id
     LEFT JOIN users u ON u.id = r.owner_id
     LEFT JOIN deliveries d ON d.order_id = o.id
     LEFT JOIN users ru ON ru.id = d.rider_id
     LEFT JOIN rider_profiles rp ON rp.user_id = d.rider_id
     LEFT JOIN addresses a ON a.id = o.delivery_address_id
     WHERE o.id = $1`,
    [orderId]
  );

  if (orderResult.rowCount === 0) {
    throw notFound('Order not found');
  }

  const order = orderResult.rows[0];

  const itemsResult = await query(
    `SELECT oi.id,
             oi.menu_item_id AS "menuItemId",
             mi.name AS "menuItemName",
             mi.image_url AS "imageUrl",
             oi.quantity,
             oi.unit_price AS "unitPrice",
             oi.special_instructions AS "specialInstructions"
      FROM order_items oi
      LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = $1`,
    [orderId]
  );

  res.json({
    status: 'success',
    data: {
      order: {
        id: order.id,
        status: order.status,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        restaurantName: order.restaurant_name,
        restaurantAddress: order.restaurant_address,
        restaurantPhone: order.restaurant_phone,
        restaurantImageUrl: order.restaurant_image_url,
        customerId: order.customer_id,
        restaurantId: order.restaurant_id,
        deliveryAddressId: order.delivery_address_id,
        deliveryAddress: order.delivery_street_address
          ? `${order.delivery_street_address}, ${order.delivery_city || ''}, ${order.delivery_state || ''} ${order.delivery_zip_code || ''}`.trim()
          : null,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.delivery_fee ?? 0),
        taxAmount: Number(order.tax_amount ?? 0),
        tipAmount: Number(order.tip_amount ?? 0),
        totalAmount: Number(order.total_amount),
        specialInstructions: order.special_instructions,
        estimatedDeliveryTime: order.estimated_delivery_time,
        actualDeliveryTime: order.actual_delivery_time,
        createdAt: order.created_at
      },
      items: itemsResult.rows,
      delivery: order.rider_name
        ? {
            riderName: order.rider_name,
            riderPhone: order.rider_phone,
            vehicleType: order.rider_vehicle_type
          }
        : null
    }
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, note } = req.body;

  if (!allowedStatuses.includes(status)) {
    throw badRequest('Invalid order status');
  }

  const orderResult = await query(
    `SELECT o.id,
            o.customer_id,
            o.restaurant_id,
            r.owner_id AS restaurant_owner_id,
            d.rider_id
     FROM orders o
     LEFT JOIN restaurants r ON r.id = o.restaurant_id
     LEFT JOIN deliveries d ON d.order_id = o.id
     WHERE o.id = $1`,
    [orderId]
  );

  if (orderResult.rowCount === 0) {
    throw notFound('Order not found');
  }

  const order = orderResult.rows[0];
  if (!canMutateOrder(req.user, order)) {
    throw unauthorized('You cannot modify this order');
  }

  const result = await withTransaction(async (client) => {
    const updatedOrder = await client.query(
      `UPDATE orders
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, status, updated_at AS "updatedAt"`,
      [status, orderId]
    );

    await client.query(
      `INSERT INTO order_status_events (order_id, status, note, created_by)
       VALUES ($1, $2, $3, $4)`,
      [orderId, status, note ?? null, req.user.sub]
    );

    if (
      status === 'picked_up' ||
      status === 'delivered' ||
      status === 'cancelled'
    ) {
      await client.query(
        `UPDATE deliveries
         SET status = $1,
             updated_at = NOW()
         WHERE order_id = $2`,
        [status === 'cancelled' ? 'assigned' : status, orderId]
      );
    }

    return updatedOrder.rows[0];
  });

  res.json({ status: 'success', data: result });
});

export const getCustomerOrders = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { status = 'all', page = '1', pageSize = '20' } = req.query;

  const filters = ['o.customer_id = $1'];
  const params = [userId];
  let index = 2;

  if (status !== 'all') {
    filters.push(`o.status = $${index}`);
    params.push(status);
    index += 1;
  }

  const whereClause = `WHERE ${filters.join(' AND ')}`;
  const pageNumber = Math.max(Number.parseInt(page, 10) || 1, 1);
  const limit = Math.max(Number.parseInt(pageSize, 10) || 20, 1);
  const offset = (pageNumber - 1) * limit;

  const ordersQuery = `
    SELECT o.id,
           o.status,
           o.total_amount AS "totalAmount",
           o.subtotal,
           o.delivery_fee AS "deliveryFee",
           o.tax_amount AS "taxAmount",
           o.created_at AS "createdAt",
           r.name AS "restaurantName",
           r.image_url AS "restaurantImageUrl",
           u.full_name AS "riderName",
           u.phone AS "riderPhone"
    FROM orders o
    LEFT JOIN restaurants r ON r.id = o.restaurant_id
    LEFT JOIN deliveries d ON d.order_id = o.id
    LEFT JOIN users u ON u.id = d.rider_id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT $${index} OFFSET $${index + 1};
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
    data: ordersResult.rows,
    meta: {
      total,
      page: pageNumber,
      pageSize: limit,
      totalPages
    }
  });
});

export const getOrderStatusHistory = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const result = await query(
    `SELECT id,
             status,
             note,
             created_at AS "createdAt",
             created_by AS "createdBy"
      FROM order_status_events
      WHERE order_id = $1
      ORDER BY created_at ASC`,
    [orderId]
  );

  res.json({ status: 'success', data: result.rows });
});


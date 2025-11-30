import { query, withTransaction } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import path from 'path';
import { uploadToSupabase } from '../utils/storage.js';
import {
  badRequest,
  forbidden,
  notFound,
  unauthorized
} from '../utils/httpError.js';

// Helper function to check if restaurant is open based on business hours
const isRestaurantOpen = (businessHours, currentTime = new Date()) => {
  if (!businessHours || businessHours.length === 0) {
    // If no business hours set, default to open (backward compatibility)
    return true;
  }

  const dayOfWeek = currentTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  // Find business hours for current day
  const todayHours = businessHours.find(bh => bh.dayOfWeek === dayOfWeek);

  if (!todayHours) {
    return false; // No hours set for today
  }

  if (todayHours.isClosed) {
    return false; // Explicitly closed
  }

  if (!todayHours.openTime || !todayHours.closeTime) {
    return false; // No hours set
  }

  // Parse time strings (HH:MM format)
  const [openHour, openMinute] = todayHours.openTime.split(':').map(Number);
  const [closeHour, closeMinute] = todayHours.closeTime.split(':').map(Number);
  
  const openTimeMinutes = openHour * 60 + openMinute;
  const closeTimeMinutes = closeHour * 60 + closeMinute;

  // Handle case where close time is next day (e.g., 22:00 to 02:00)
  if (closeTimeMinutes < openTimeMinutes) {
    // Closing time is next day
    return currentTimeMinutes >= openTimeMinutes || currentTimeMinutes <= closeTimeMinutes;
  } else {
    // Normal case: open and close on same day
    return currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
  }
};

const assertRestaurantOwner = async (reqUser, restaurantId) => {
  if (reqUser.role === 'admin') return;
  if (reqUser.role !== 'restaurant') {
    throw unauthorized('You are not allowed to manage restaurants');
  }

  const result = await query(
    `SELECT id FROM restaurants WHERE id = $1 AND owner_id = $2`,
    [restaurantId, reqUser.sub]
  );

  if (result.rowCount === 0) {
    throw forbidden('You are not allowed to manage this restaurant');
  }
};

export const listRestaurants = asyncHandler(async (req, res) => {
  const {
    search = '',
    cuisine,
    isOpen,
    minRating,
    priceRange,
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

  if (cuisine) {
    filters.push(`LOWER(r.cuisine_type) = $${index}`);
    params.push(cuisine.toLowerCase());
    index += 1;
  }

  if (isOpen === 'true' || isOpen === 'false') {
    filters.push(`r.is_open = $${index}`);
    params.push(isOpen === 'true');
    index += 1;
  }

  if (minRating) {
    filters.push(`r.rating >= $${index}`);
    params.push(Number(minRating));
    index += 1;
  }

  if (priceRange) {
    filters.push(`r.price_range = $${index}`);
    params.push(priceRange);
    index += 1;
  }

  // For public access (customers), show all restaurants
  // The isOpen status will be calculated based on business hours and base status
  // For authenticated admins, show all restaurants regardless of status
  // Note: We don't filter by is_open here - all restaurants are shown, but marked as open/closed based on business hours
  // Admins see all restaurants without filtering

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
           r.is_open AS "isOpenBase",
           r.image_url AS "imageUrl",
           r.banner_url AS "bannerUrl",
           'approved' AS "approvalStatus",
           u.full_name AS "ownerName",
           u.email AS "ownerEmail"
    FROM restaurants r
    LEFT JOIN users u ON u.id = r.owner_id
    ${whereClause}
    ORDER BY r.rating DESC NULLS LAST, r.name ASC
    LIMIT $${index} OFFSET $${index + 1};
  `;

  const countQuery = `SELECT COUNT(*) AS total FROM restaurants r ${whereClause};`;

  const [dataResult, countResult] = await Promise.all([
    query(dataQuery, [...params, limit, offset]),
    query(countQuery, params)
  ]);

  // Fetch business hours for all restaurants and calculate isOpen
  const restaurantIds = dataResult.rows.map(r => r.id);
  let businessHoursMap = {};

  if (restaurantIds.length > 0) {
    const placeholders = restaurantIds.map((_, i) => `$${i + 1}`).join(',');
    const hoursResult = await query(
      `SELECT restaurant_id, day_of_week, open_time, close_time, is_closed
       FROM business_hours
       WHERE restaurant_id IN (${placeholders})`,
      restaurantIds
    );

    // Group business hours by restaurant
    hoursResult.rows.forEach(row => {
      if (!businessHoursMap[row.restaurant_id]) {
        businessHoursMap[row.restaurant_id] = [];
      }
      businessHoursMap[row.restaurant_id].push({
        dayOfWeek: row.day_of_week,
        openTime: row.open_time,
        closeTime: row.close_time,
        isClosed: row.is_closed
      });
    });
  }

  // Calculate isOpen for each restaurant based on business hours
  const restaurantsWithStatus = dataResult.rows.map(restaurant => {
    const businessHours = businessHoursMap[restaurant.id] || [];
    const calculatedIsOpen = businessHours.length > 0 
      ? isRestaurantOpen(businessHours)
      : restaurant.isOpenBase; // Fallback to base is_open if no business hours set

    return {
      ...restaurant,
      isOpen: calculatedIsOpen && restaurant.isOpenBase, // Must be both open by hours AND base status
      businessHours: businessHours
    };
  });

  const total = Number.parseInt(countResult.rows[0]?.total ?? '0', 10);
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  res.json({
    status: 'success',
    data: restaurantsWithStatus,
    meta: {
      total,
      page: pageNumber,
      pageSize: limit,
      totalPages
    }
  });
});

export const getRestaurant = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  // Check if user is the restaurant owner
  let isOwner = false;
  if (req.user && req.user.role === 'restaurant') {
    const ownerCheck = await query(
      `SELECT id FROM restaurants WHERE id = $1 AND owner_id = $2`,
      [restaurantId, req.user.sub]
    );
    isOwner = ownerCheck.rowCount > 0;
  }

  // Build query based on user role
  let whereClause = 'r.id = $1';
  let params = [restaurantId];

  // For public access (customers), check both base is_open AND business hours
  // Admins can see all restaurants
  // Restaurant owners can see their own restaurant even if closed
  // Customers can only see open restaurants
  if (req.user && req.user.role === 'admin') {
    // Admins can see all - no additional filter needed
  } else if (isOwner) {
    // Restaurant owners can see their own restaurant even if closed
    // No additional filter needed
  } else {
    // For customers/public, require restaurant to be open
    whereClause += ' AND r.is_open = $2';
    params.push(true);
  }

  const result = await query(
    `SELECT r.id,
            r.name,
            r.description,
            r.phone,
            r.email,
            r.address,
            r.latitude,
            r.longitude,
            r.cuisine_type AS "cuisineType",
            r.price_range AS "priceRange",
            r.rating,
            r.total_reviews AS "totalReviews",
            r.delivery_time_minutes AS "deliveryTimeMinutes",
            r.delivery_fee AS "deliveryFee",
            r.minimum_order AS "minimumOrder",
            r.is_open AS "isOpen",
            r.image_url AS "imageUrl",
            r.banner_url AS "bannerUrl",
            'approved' AS "approvalStatus",
            NULL AS "approvedAt",
            u.full_name AS "ownerName",
            u.email AS "ownerEmail"
     FROM restaurants r
     LEFT JOIN users u ON u.id = r.owner_id
     WHERE ${whereClause}`,
    params
  );

  if (result.rowCount === 0) {
    throw notFound('Restaurant not found');
  }

  const restaurant = result.rows[0];

  // Fetch business hours and calculate isOpen
  const hoursResult = await query(
    `SELECT day_of_week, open_time, close_time, is_closed
     FROM business_hours
     WHERE restaurant_id = $1
     ORDER BY day_of_week ASC`,
    [restaurantId]
  );

  const businessHours = hoursResult.rows.map(row => ({
    dayOfWeek: row.day_of_week,
    openTime: row.open_time,
    closeTime: row.close_time,
    isClosed: row.is_closed
  }));

  const calculatedIsOpen = businessHours.length > 0
    ? isRestaurantOpen(businessHours)
    : restaurant.isOpen; // Fallback to base is_open if no business hours set

  res.json({
    status: 'success',
    data: {
      ...restaurant,
      isOpen: calculatedIsOpen && restaurant.isOpen, // Must be both open by hours AND base status
      businessHours: businessHours,
      owner: {
        fullName: restaurant.ownerName,
        email: restaurant.ownerEmail
      }
    }
  });
});

export const getCurrentUserRestaurant = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const result = await query(
    `SELECT r.id,
             r.name,
             r.description,
             r.phone,
             r.email,
             r.address,
             r.latitude,
             r.longitude,
             r.cuisine_type AS "cuisineType",
             r.price_range AS "priceRange",
             r.rating,
             r.total_reviews AS "totalReviews",
             r.delivery_time_minutes AS "deliveryTimeMinutes",
             r.delivery_fee AS "deliveryFee",
             r.minimum_order AS "minimumOrder",
             r.is_open AS "isOpen",
     r.image_url AS "imageUrl",
     r.banner_url AS "bannerUrl"
      FROM restaurants r
      WHERE r.owner_id = $1`,
    [userId]
  );

  if (result.rowCount === 0) {
    throw notFound('Restaurant not found for current user');
  }

  res.json({ status: 'success', data: result.rows[0] });
});

export const getRestaurantMenu = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  // Check if restaurant exists and user has access
  let restaurantQuery = 'SELECT id FROM restaurants WHERE id = $1';
  let params = [restaurantId];

  // For public access (customers), only show active restaurants
  if (!req.user || req.user.role !== 'admin') {
    restaurantQuery += ' AND is_open = $2';
    params.push(true);
  }

  const restaurantCheck = await query(restaurantQuery, params);
  if (restaurantCheck.rowCount === 0) {
    throw notFound('Restaurant not found');
  }

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

  // For customers, only show approved items with final price (restaurant price + admin markup)
  // For admin, show all items with markup info
  const isAdmin = req.user && req.user.role === 'admin';
  const approvalFilter = isAdmin ? '' : `AND i.approval_status = 'approved'`;

  const items = await query(
    `SELECT i.id,
            i.category_id AS "categoryId",
            i.name,
            i.description,
            i.price,
            i.image_url AS "imageUrl",
            i.is_available AS "isAvailable",
            i.is_vegetarian AS "isVegetarian",
            i.is_vegan AS "isVegan",
            i.is_gluten_free AS "isGlutenFree",
            i.preparation_time_minutes AS "preparationTimeMinutes",
            i.calories,
            i.allergens,
            i.has_variants AS "hasVariants",
            CASE 
              WHEN i.price IS NOT NULL THEN 
                ROUND(i.price + COALESCE(i.admin_markup_amount, 0) + (i.price * COALESCE(i.admin_markup_percentage, 0) / 100), 2)
              ELSE NULL
            END AS "finalPrice"
     FROM menu_items i
     WHERE i.restaurant_id = $1 ${approvalFilter}
     ORDER BY i.created_at ASC`,
    [restaurantId]
  );

  // Get variants for items that have them
  const itemIds = items.rows.filter(item => item.hasVariants).map(item => item.id);
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

  // Attach variants and use final price for customer display
  const itemsWithVariantsData = items.rows.map(item => {
    const itemVariants = variants.filter(v => v.menuItemId === item.id);
    // For customer view, use finalPrice; for admin, keep original price visible
    const displayPrice = isAdmin ? item.price : (item.finalPrice || item.price);
    
    return {
      ...item,
      price: displayPrice, // Use final price for customers
      variants: itemVariants.map(v => ({
        id: v.id,
        name: v.name,
        price: parseFloat(v.price), // Variants don't have markup yet, but can be added later
        isAvailable: v.isAvailable,
        displayOrder: v.displayOrder
      }))
    };
  });

  const itemsByCategory = itemsWithVariantsData.reduce((acc, item) => {
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

export const getMenuItem = asyncHandler(async (req, res) => {
  const { restaurantId, menuItemId } = req.params;

  // Check if restaurant exists
  // This is a public endpoint, so we only show items from open restaurants
  const restaurantCheck = await query(
    'SELECT id FROM restaurants WHERE id = $1 AND is_open = $2',
    [restaurantId, true]
  );
  
  if (restaurantCheck.rowCount === 0) {
    throw notFound('Restaurant not found or not open');
  }

  // Get menu item
  const itemResult = await query(
    `SELECT i.id,
            i.category_id AS "categoryId",
            i.name,
            i.description,
            i.price,
            i.image_url AS "imageUrl",
            i.is_available AS "isAvailable",
            i.is_vegetarian AS "isVegetarian",
            i.is_vegan AS "isVegan",
            i.is_gluten_free AS "isGlutenFree",
            i.preparation_time_minutes AS "preparationTimeMinutes",
            i.calories,
            i.allergens,
            EXISTS(SELECT 1 FROM menu_item_variants WHERE menu_item_id = i.id) AS "hasVariants"
     FROM menu_items i
     WHERE i.id = $1 AND i.restaurant_id = $2`,
    [menuItemId, restaurantId]
  );

  if (itemResult.rowCount === 0) {
    throw notFound('Menu item not found');
  }

  const item = itemResult.rows[0];

  // Get variants if they exist
  const variantsResult = await query(
    `SELECT id,
            name,
            price,
            display_order AS "displayOrder",
            is_available AS "isAvailable"
     FROM menu_item_variants
     WHERE menu_item_id = $1
     ORDER BY display_order ASC, created_at ASC`,
    [menuItemId]
  );

  item.variants = variantsResult.rows;
  item.hasVariants = item.hasVariants && item.variants.length > 0;

  res.json({
    status: 'success',
    data: item
  });
});

export const createMenuCategory = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  const { name, description, displayOrder = 0, isActive = true } = req.body;
  if (!name) {
    throw badRequest('Category name is required');
  }

  const result = await query(
    `INSERT INTO menu_categories (restaurant_id, name, description, display_order, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, description, display_order AS "displayOrder", is_active AS "isActive"`,
    [restaurantId, name, description ?? null, displayOrder, isActive]
  );

  res.status(201).json({ status: 'success', data: result.rows[0] });
});

export const createMenuItem = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  const {
    categoryId,
    name,
    description,
    price,
    imageUrl,
    isAvailable = true,
    isVegetarian = false,
    isVegan = false,
    isGlutenFree = false,
    preparationTimeMinutes,
    calories,
    allergens,
    hasVariants = false,
    variants = []
  } = req.body;

  if (!name) {
    throw badRequest('Name is required');
  }

  // If hasVariants is true, price is not required (variants will have prices)
  if (!hasVariants && !price) {
    throw badRequest('Price is required for items without variants');
  }

  const result = await query(
    `INSERT INTO menu_items (
        restaurant_id,
        category_id,
        name,
        description,
        price,
        image_url,
        is_available,
        is_vegetarian,
        is_vegan,
        is_gluten_free,
        preparation_time_minutes,
        calories,
        allergens
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id,
               category_id AS "categoryId",
               name,
               description,
               price,
               image_url AS "imageUrl",
               is_available AS "isAvailable",
               is_vegetarian AS "isVegetarian",
               is_vegan AS "isVegan",
               is_gluten_free AS "isGlutenFree",
               preparation_time_minutes AS "preparationTimeMinutes",
               calories,
               allergens`,
    [
      restaurantId,
      categoryId ?? null,
      name,
      description ?? null,
      price,
      imageUrl ?? null,
      isAvailable,
      isVegetarian,
      isVegan,
      isGlutenFree,
      preparationTimeMinutes ?? null,
      calories ?? null,
      allergens ?? null
    ]
  );

  const menuItem = result.rows[0];

  // Create variants if provided
  if (hasVariants && variants && variants.length > 0) {
    const variantValues = variants.map(variant =>
      `(${menuItem.id}, '${variant.name}', ${variant.price}, ${variant.displayOrder || 0}, ${variant.isAvailable !== false})`
    ).join(', ');

    await query(`
      INSERT INTO menu_item_variants (menu_item_id, name, price, display_order, is_available)
      VALUES ${variantValues}
    `);
  }

  res.status(201).json({ status: 'success', data: menuItem });
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const { restaurantId, menuItemId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  const {
    categoryId,
    name,
    description,
    price,
    imageUrl,
    isAvailable,
    isVegetarian,
    isVegan,
    isGlutenFree,
    preparationTimeMinutes,
    calories,
    allergens
  } = req.body;

  const result = await query(
    `UPDATE menu_items
     SET category_id = COALESCE($1, category_id),
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         price = COALESCE($4, price),
         image_url = COALESCE($5, image_url),
         is_available = COALESCE($6, is_available),
         is_vegetarian = COALESCE($7, is_vegetarian),
         is_vegan = COALESCE($8, is_vegan),
         is_gluten_free = COALESCE($9, is_gluten_free),
         preparation_time_minutes = COALESCE($10, preparation_time_minutes),
         calories = COALESCE($11, calories),
         allergens = COALESCE($12, allergens),
         updated_at = NOW()
     WHERE id = $13 AND restaurant_id = $14
     RETURNING id,
               category_id AS "categoryId",
               name,
               description,
               price,
               image_url AS "imageUrl",
               is_available AS "isAvailable",
               is_vegetarian AS "isVegetarian",
               is_vegan AS "isVegan",
               is_gluten_free AS "isGlutenFree",
               preparation_time_minutes AS "preparationTimeMinutes",
               calories,
               allergens`,
    [
      categoryId ?? null,
      name ?? null,
      description ?? null,
      price ?? null,
      imageUrl ?? null,
      isAvailable ?? null,
      isVegetarian ?? null,
      isVegan ?? null,
      isGlutenFree ?? null,
      preparationTimeMinutes ?? null,
      calories ?? null,
      allergens ?? null,
      menuItemId,
      restaurantId
    ]
  );

  if (result.rowCount === 0) {
    throw notFound('Menu item not found');
  }

  res.json({ status: 'success', data: result.rows[0] });
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  const { restaurantId, menuItemId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  const result = await query(
    `DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING id`,
    [menuItemId, restaurantId]
  );

  if (result.rowCount === 0) {
    throw notFound('Menu item not found');
  }

  res.json({ status: 'success', message: 'Menu item removed' });
});

export const createMenuItemVariant = asyncHandler(async (req, res) => {
  const { restaurantId, menuItemId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  const { name, price, displayOrder = 0, isAvailable = true } = req.body;

  if (!name || !price) {
    throw badRequest('Name and price are required');
  }

  // Verify the menu item belongs to this restaurant
  const itemCheck = await query(
    `SELECT id FROM menu_items WHERE id = $1 AND restaurant_id = $2`,
    [menuItemId, restaurantId]
  );

  if (itemCheck.rowCount === 0) {
    throw notFound('Menu item not found');
  }

  const result = await query(
    `INSERT INTO menu_item_variants (menu_item_id, name, price, display_order, is_available)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, menu_item_id AS "menuItemId", name, price, display_order AS "displayOrder", is_available AS "isAvailable"`,
    [menuItemId, name, price, displayOrder, isAvailable]
  );

  res.status(201).json({ status: 'success', data: result.rows[0] });
});

export const updateMenuItemVariant = asyncHandler(async (req, res) => {
  const { restaurantId, menuItemId, variantId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  const { name, price, displayOrder, isAvailable } = req.body;

  const result = await query(
    `UPDATE menu_item_variants
     SET name = COALESCE($1, name),
         price = COALESCE($2, price),
         display_order = COALESCE($3, display_order),
         is_available = COALESCE($4, is_available),
         updated_at = NOW()
     WHERE id = $5 AND menu_item_id = $6
     RETURNING id, menu_item_id AS "menuItemId", name, price, display_order AS "displayOrder", is_available AS "isAvailable"`,
    [name ?? null, price ?? null, displayOrder ?? null, isAvailable ?? null, variantId, menuItemId]
  );

  if (result.rowCount === 0) {
    throw notFound('Menu item variant not found');
  }

  res.json({ status: 'success', data: result.rows[0] });
});

export const deleteMenuItemVariant = asyncHandler(async (req, res) => {
  const { restaurantId, menuItemId, variantId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  const result = await query(
    `DELETE FROM menu_item_variants
     WHERE id = $1 AND menu_item_id = $2
     RETURNING id`,
    [variantId, menuItemId]
  );

  if (result.rowCount === 0) {
    throw notFound('Menu item variant not found');
  }

  res.json({ status: 'success', message: 'Variant removed' });
});

export const getRestaurantOrders = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  const { status = 'all', page = '1', pageSize = '20' } = req.query;

  const filters = ['o.restaurant_id = $1'];
  const params = [restaurantId];

  if (status !== 'all') {
    filters.push(`o.status = $2`);
    params.push(status);
  }

  const where = `WHERE ${filters.join(' AND ')}`;
  const pageNumber = Math.max(Number.parseInt(page, 10) || 1, 1);
  const limit = Math.max(Number.parseInt(pageSize, 10) || 20, 1);
  const offset = (pageNumber - 1) * limit;

  const ordersQuery = `
    SELECT o.id,
           o.status,
           o.total_amount AS "totalAmount",
           o.subtotal,
           o.delivery_fee AS "deliveryFee",
           o.tip_amount AS "tipAmount",
           o.created_at AS "createdAt",
           u.full_name AS "customerName",
           u.phone AS "customerPhone",
           a.street_address AS "streetAddress",
           a.city,
           a.state,
           a.zip_code AS "zipCode"
    FROM orders o
    LEFT JOIN users u ON u.id = o.customer_id
    LEFT JOIN addresses a ON a.id = o.delivery_address_id
    ${where}
    ORDER BY o.created_at DESC
    LIMIT $${status === 'all' ? 2 : 3} OFFSET $${status === 'all' ? 3 : 4};
  `;

  const countQuery = `SELECT COUNT(*) AS total FROM orders o ${where};`;

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

export const getRestaurantDashboardStats = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  // Get order statistics
  const orderStatsResult = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
       COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_orders,
       COUNT(*) FILTER (WHERE status = 'preparing') AS preparing_orders,
       COUNT(*) FILTER (WHERE status = 'ready') AS ready_orders,
       COUNT(*) FILTER (WHERE status = 'delivered') AS completed_orders,
       COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
       COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS today_orders
     FROM orders
     WHERE restaurant_id = $1`,
    [restaurantId]
  );

  // Get revenue statistics
  const revenueResult = await query(
    `SELECT
       COALESCE(SUM(total_amount), 0) AS total_revenue,
       COALESCE(SUM(total_amount) FILTER (WHERE DATE(created_at) = CURRENT_DATE), 0) AS today_revenue,
       COALESCE(SUM(total_amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days' AND status IN ('confirmed', 'preparing', 'ready', 'picked_up', 'delivered')), 0) AS revenue_last_30_days
     FROM orders
     WHERE restaurant_id = $1
       AND status IN ('confirmed', 'preparing', 'ready', 'picked_up', 'delivered')`,
    [restaurantId]
  );

  // Get recent orders
  const recentOrdersResult = await query(
    `SELECT o.id,
            o.status,
            o.total_amount AS "totalAmount",
            o.created_at AS "createdAt",
            u.full_name AS "customerName"
     FROM orders o
     LEFT JOIN users u ON u.id = o.customer_id
     WHERE o.restaurant_id = $1
     ORDER BY o.created_at DESC
     LIMIT 10`,
    [restaurantId]
  );

  // Get menu item count
  const menuItemsResult = await query(
    `SELECT COUNT(*) AS total_items,
            COUNT(*) FILTER (WHERE is_available = true) AS available_items
     FROM menu_items
     WHERE restaurant_id = $1`,
    [restaurantId]
  );

  const stats = {
    orders: orderStatsResult.rows[0] || {},
    revenue: revenueResult.rows[0] || {
      total_revenue: 0,
      today_revenue: 0,
      revenue_last_30_days: 0
    },
    recentOrders: recentOrdersResult.rows.map(order => ({
      id: order.id,
      status: order.status,
      totalAmount: Number(order.totalAmount || 0),
      createdAt: order.created_at,
      customerName: order.customerName
    })),
    menuItems: menuItemsResult.rows[0] || {
      total_items: 0,
      available_items: 0
    }
  };

  res.json({ status: 'success', data: stats });
});

export const updateRestaurantDetails = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  const {
    name,
    description,
    phone,
    email,
    address,
    latitude,
    longitude,
    cuisineType,
    priceRange,
    deliveryTimeMinutes,
    deliveryFee,
    minimumOrder,
    isOpen,
    imageUrl,
    bannerUrl
  } = req.body;

  // Normalize empty strings to null for fields with constraints
  const normalizedPriceRange = priceRange === '' || priceRange === null || priceRange === undefined 
    ? null 
    : priceRange;
  
  // Normalize address - empty string should be treated as null
  // But if address is provided, use it (even if it's an empty string, we want to update it)
  const normalizedAddress = (address === null || address === undefined) 
    ? null 
    : (address === '' ? null : address);
  
  // Normalize coordinates - convert to number or null
  const normalizedLatitude = (latitude === null || latitude === undefined || latitude === '') 
    ? null 
    : (typeof latitude === 'number' ? latitude : parseFloat(latitude));
  
  const normalizedLongitude = (longitude === null || longitude === undefined || longitude === '') 
    ? null 
    : (typeof longitude === 'number' ? longitude : parseFloat(longitude));

  console.log('Updating restaurant:', {
    restaurantId,
    address: normalizedAddress,
    latitude: normalizedLatitude,
    longitude: normalizedLongitude
  });

  const result = await query(
    `UPDATE restaurants
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         phone = COALESCE($3, phone),
         email = COALESCE($4, email),
         address = $5,
         latitude = $6,
         longitude = $7,
         cuisine_type = COALESCE($8, cuisine_type),
         price_range = COALESCE($9, price_range),
         delivery_time_minutes = COALESCE($10, delivery_time_minutes),
         delivery_fee = COALESCE($11, delivery_fee),
         minimum_order = COALESCE($12, minimum_order),
         is_open = COALESCE($13, is_open),
         image_url = COALESCE($14, image_url),
         banner_url = COALESCE($15, banner_url),
         updated_at = NOW()
     WHERE id = $16
     RETURNING id,
               name,
               description,
               phone,
               email,
               address,
               latitude,
               longitude,
               cuisine_type AS "cuisineType",
               price_range AS "priceRange",
               delivery_time_minutes AS "deliveryTimeMinutes",
               delivery_fee AS "deliveryFee",
               minimum_order AS "minimumOrder",
               is_open AS "isOpen",
               image_url AS "imageUrl",
               banner_url AS "bannerUrl"`,
    [
      name ?? null,
      description ?? null,
      phone ?? null,
      email ?? null,
      normalizedAddress,
      normalizedLatitude,
      normalizedLongitude,
      cuisineType ?? null,
      normalizedPriceRange,
      deliveryTimeMinutes ?? null,
      deliveryFee ?? null,
      minimumOrder ?? null,
      isOpen ?? null,
      imageUrl ?? null,
      bannerUrl ?? null,
      restaurantId
    ]
  );

  if (result.rowCount === 0) {
    throw notFound('Restaurant not found');
  }

  res.json({ status: 'success', data: result.rows[0] });
});

export const toggleRestaurantStatus = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  const result = await query(
    `UPDATE restaurants
     SET is_open = NOT is_open,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, is_open AS "isOpen"`,
    [restaurantId]
  );

  if (result.rowCount === 0) {
    throw notFound('Restaurant not found');
  }

  res.json({
    status: 'success',
    data: {
      id: result.rows[0].id,
      isOpen: result.rows[0].isOpen
    }
  });
});

// Get business hours for a restaurant
export const getBusinessHours = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  const result = await query(
    `SELECT day_of_week AS "dayOfWeek", 
            open_time AS "openTime", 
            close_time AS "closeTime", 
            is_closed AS "isClosed"
     FROM business_hours
     WHERE restaurant_id = $1
     ORDER BY day_of_week ASC`,
    [restaurantId]
  );

  res.json({ status: 'success', data: result.rows });
});

// Update business hours for a restaurant
export const updateBusinessHours = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  const { businessHours } = req.body;

  if (!Array.isArray(businessHours)) {
    throw badRequest('Business hours must be an array');
  }

  // Validate business hours data
  for (const hours of businessHours) {
    if (hours.dayOfWeek === undefined || hours.dayOfWeek < 0 || hours.dayOfWeek > 6) {
      throw badRequest('Invalid day of week. Must be 0-6 (0=Sunday, 6=Saturday)');
    }
  }

  await withTransaction(async (client) => {
    // Delete existing business hours
    await client.query(
      `DELETE FROM business_hours WHERE restaurant_id = $1`,
      [restaurantId]
    );

    // Insert new business hours
    for (const hours of businessHours) {
      const isClosed = hours.isClosed || false;
      const openTime = isClosed ? null : (hours.openTime || null);
      const closeTime = isClosed ? null : (hours.closeTime || null);

      await client.query(
        `INSERT INTO business_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (restaurant_id, day_of_week)
         DO UPDATE SET
           open_time = $3,
           close_time = $4,
           is_closed = $5,
           updated_at = NOW()`,
        [restaurantId, hours.dayOfWeek, openTime, closeTime, isClosed]
      );
    }
  });

  // Return updated business hours
  const result = await query(
    `SELECT day_of_week AS "dayOfWeek", 
            open_time AS "openTime", 
            close_time AS "closeTime", 
            is_closed AS "isClosed"
     FROM business_hours
     WHERE restaurant_id = $1
     ORDER BY day_of_week ASC`,
    [restaurantId]
  );

  res.json({ status: 'success', data: result.rows });
});

export const uploadRestaurantLogo = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  if (!req.file) {
    throw badRequest('No logo file provided');
  }

  // Generate unique filename
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const fileExtension = path.extname(req.file.originalname);
  const fileName = `restaurant-${uniqueSuffix}${fileExtension}`;
  const filePath = `logos/${fileName}`;

  // Upload to Supabase Storage
  const { url } = await uploadToSupabase(
    req.file.buffer,
    'uploads',
    filePath,
    req.file.mimetype
  );

  // Update restaurant with new logo URL
  const result = await query(
    `UPDATE restaurants
     SET image_url = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING id, image_url AS "imageUrl"`,
    [url, restaurantId]
  );

  if (result.rowCount === 0) {
    throw notFound('Restaurant not found');
  }

  res.json({
    status: 'success',
    data: {
      id: result.rows[0].id,
      imageUrl: result.rows[0].imageUrl
    }
  });
});

export const uploadRestaurantBanner = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  if (!req.file) {
    throw badRequest('No banner file provided');
  }

  // Generate unique filename
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const fileExtension = path.extname(req.file.originalname);
  const fileName = `banner-${uniqueSuffix}${fileExtension}`;
  const filePath = `banners/${fileName}`;

  // Upload to Supabase Storage
  const { url } = await uploadToSupabase(
    req.file.buffer,
    'uploads',
    filePath,
    req.file.mimetype
  );

  const result = await query(
    `UPDATE restaurants
     SET banner_url = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING id, banner_url AS "bannerUrl"`,
    [url, restaurantId]
  );

  if (result.rowCount === 0) {
    throw notFound('Restaurant not found');
  }

  res.json({
    status: 'success',
    data: {
      id: result.rows[0].id,
      bannerUrl: result.rows[0].bannerUrl
    }
  });
});

export const uploadMenuItemImage = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  await assertRestaurantOwner(req.user, restaurantId);

  if (!req.file) {
    throw badRequest('No image file provided');
  }

  // Generate unique filename
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const fileExtension = path.extname(req.file.originalname);
  const fileName = `menu-item-${uniqueSuffix}${fileExtension}`;
  const filePath = `menu-items/${fileName}`;

  // Upload to Supabase Storage
  const { url } = await uploadToSupabase(
    req.file.buffer,
    'uploads',
    filePath,
    req.file.mimetype
  );

  res.json({
    status: 'success',
    data: {
      imageUrl: url
    }
  });
});


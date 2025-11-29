import { query } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, badRequest } from '../utils/httpError.js';

// Calculate delivery fee based on barangay and order amount
export const calculateDeliveryFee = asyncHandler(async (req, res) => {
  const { barangay, orderAmount } = req.body;

  if (!barangay) {
    throw badRequest('Barangay is required');
  }

  if (orderAmount === undefined || orderAmount < 0) {
    throw badRequest('Valid order amount is required');
  }

  // Find the appropriate tier for this order amount
  const result = await query(
    `SELECT delivery_fee
     FROM delivery_fee_tiers
     WHERE barangay = $1
       AND min_order_amount <= $2
       AND max_order_amount >= $2
       AND is_active = true
     ORDER BY min_order_amount DESC
     LIMIT 1`,
    [barangay, orderAmount]
  );

  if (result.rowCount === 0) {
    // If no tier found, try to get the highest tier (for orders above 1500)
    const maxTierResult = await query(
      `SELECT delivery_fee
       FROM delivery_fee_tiers
       WHERE barangay = $1
         AND is_active = true
       ORDER BY max_order_amount DESC
       LIMIT 1`,
      [barangay]
    );

    if (maxTierResult.rowCount === 0) {
      throw notFound('Delivery fee not found for this barangay');
    }

    return res.json({
      status: 'success',
      data: {
        barangay,
        orderAmount,
        deliveryFee: parseFloat(maxTierResult.rows[0].delivery_fee),
        tier: 'max'
      }
    });
  }

  res.json({
    status: 'success',
    data: {
      barangay,
      orderAmount,
      deliveryFee: parseFloat(result.rows[0].delivery_fee)
    }
  });
});

// Get all delivery fee tiers for a barangay
export const getDeliveryFeeTiers = asyncHandler(async (req, res) => {
  const { barangay } = req.params;

  const result = await query(
    `SELECT id,
            barangay,
            min_order_amount AS "minOrderAmount",
            max_order_amount AS "maxOrderAmount",
            delivery_fee AS "deliveryFee",
            is_active AS "isActive",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
     FROM delivery_fee_tiers
     WHERE barangay = $1
     ORDER BY min_order_amount ASC`,
    [barangay]
  );

  if (result.rowCount === 0) {
    throw notFound('Delivery fee tiers not found for this barangay');
  }

  res.json({ status: 'success', data: result.rows });
});

// Get all barangays with their delivery fee tiers
export const listAllDeliveryFeeTiers = asyncHandler(async (req, res) => {
  try {
    const result = await query(
      `SELECT id,
              barangay,
              min_order_amount AS "minOrderAmount",
              max_order_amount AS "maxOrderAmount",
              delivery_fee AS "deliveryFee",
              is_active AS "isActive",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM delivery_fee_tiers
       WHERE is_active = true
       ORDER BY barangay ASC, min_order_amount ASC`
    );

    // Group by barangay
    const grouped = result.rows.reduce((acc, tier) => {
      if (!acc[tier.barangay]) {
        acc[tier.barangay] = [];
      }
      acc[tier.barangay].push(tier);
      return acc;
    }, {});

    res.json({ status: 'success', data: grouped });
  } catch (error) {
    // Check if table doesn't exist (error code 42P01 in PostgreSQL)
    if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation "delivery_fee_tiers"')) {
      console.warn('⚠️ delivery_fee_tiers table does not exist. Please run the migration: database/migrations/20250102_1000_add_tiered_delivery_fees.sql');
      // Return empty data instead of error so the admin page can still load
      res.json({ status: 'success', data: {}, message: 'No delivery fee tiers configured. Please run the database migration.' });
      return;
    }
    // Re-throw other errors
    throw error;
  }
});

// Create or update delivery fee tier (admin only)
export const upsertDeliveryFeeTier = asyncHandler(async (req, res) => {
  const { barangay, minOrderAmount, maxOrderAmount, deliveryFee, isActive = true } = req.body;

  if (!barangay || minOrderAmount === undefined || maxOrderAmount === undefined || deliveryFee === undefined) {
    throw badRequest('Barangay, min order amount, max order amount, and delivery fee are required');
  }

  if (minOrderAmount < 0 || maxOrderAmount < 0 || deliveryFee < 0) {
    throw badRequest('Amounts must be non-negative');
  }

  if (minOrderAmount >= maxOrderAmount) {
    throw badRequest('Min order amount must be less than max order amount');
  }

  const result = await query(
    `INSERT INTO delivery_fee_tiers (barangay, min_order_amount, max_order_amount, delivery_fee, is_active)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (barangay, min_order_amount, max_order_amount)
     DO UPDATE SET
       delivery_fee = EXCLUDED.delivery_fee,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()
     RETURNING id,
               barangay,
               min_order_amount AS "minOrderAmount",
               max_order_amount AS "maxOrderAmount",
               delivery_fee AS "deliveryFee",
               is_active AS "isActive",
               created_at AS "createdAt",
               updated_at AS "updatedAt"`,
    [barangay, minOrderAmount, maxOrderAmount, deliveryFee, isActive]
  );

  res.json({ status: 'success', data: result.rows[0] });
});

// Delete delivery fee tier (admin only)
export const deleteDeliveryFeeTier = asyncHandler(async (req, res) => {
  const { tierId } = req.params;

  const result = await query(
    `DELETE FROM delivery_fee_tiers
     WHERE id = $1
     RETURNING id, barangay`,
    [tierId]
  );

  if (result.rowCount === 0) {
    throw notFound('Delivery fee tier not found');
  }

  res.json({ status: 'success', message: 'Delivery fee tier deleted successfully' });
});

// Legacy: Get simple delivery fee (for backward compatibility)
export const getDeliveryFee = asyncHandler(async (req, res) => {
  const { barangay } = req.params;

  // Get the default tier (0-500) for backward compatibility
  const result = await query(
    `SELECT delivery_fee
     FROM delivery_fee_tiers
     WHERE barangay = $1
       AND min_order_amount = 0.00
       AND is_active = true
     LIMIT 1`,
    [barangay]
  );

  if (result.rowCount === 0) {
    throw notFound('Delivery fee not found for this barangay');
  }

  res.json({
    status: 'success',
    data: {
      barangay,
      deliveryFee: parseFloat(result.rows[0].delivery_fee)
    }
  });
});

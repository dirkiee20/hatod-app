import { query, pool } from './api/config/db.js';

async function testQuery() {
  try {
    // Test the exact query from the API
    const testRiderId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID for testing
    
    console.log('Testing delivery_requests query...');
    console.log('Using riderId:', testRiderId);
    
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
       WHERE dr.rider_id = $1 AND dr.status = 'pending'
       ORDER BY dr.created_at DESC`,
      [testRiderId]
    );

    console.log('✅ Query executed successfully!');
    console.log(`Found ${result.rows.length} rows`);
    
    if (result.rows.length > 0) {
      console.log('Sample row:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testQuery();


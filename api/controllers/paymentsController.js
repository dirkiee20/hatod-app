import { query, withTransaction } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createPaymentIntent,
  createPaymentMethod,
  attachPaymentIntent,
  retrievePaymentIntent,
  verifyWebhookSignature
} from '../utils/paymongo.js';
import {
  badRequest,
  notFound,
  unauthorized
} from '../utils/httpError.js';

/**
 * Create a checkout session with PayMongo
 * POST /api/payments/create-checkout-session
 */
export const createCheckoutSession = asyncHandler(async (req, res) => {
  const { orderData, returnUrl } = req.body;
  const customerId = req.user.sub;

  if (!orderData || !orderData.restaurantId || !orderData.items || !orderData.totalAmount) {
    throw badRequest('Invalid order data');
  }

  // Validate return URL
  const validReturnUrl = returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/customers/payment_success.html`;

  try {
    // Step 1: Create Payment Intent
    const paymentIntent = await createPaymentIntent(
      orderData.totalAmount,
      'PHP',
      {
        description: `Order from Restaurant ${orderData.restaurantId}`,
        customerId,
        restaurantId: orderData.restaurantId
      }
    );

    // Step 2: Create Payment Method (GCash)
    const paymentMethod = await createPaymentMethod('gcash');

    // Step 3: Attach Payment Method to Payment Intent
    const attachedPayment = await attachPaymentIntent(
      paymentIntent.id,
      paymentMethod.id,
      validReturnUrl
    );

    // Step 4: Store payment intent in database
    const result = await query(
      `INSERT INTO payment_intents (
        paymongo_payment_intent_id,
        customer_id,
        restaurant_id,
        amount,
        currency,
        status,
        payment_method,
        order_data,
        paymongo_response,
        redirect_url,
        return_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, paymongo_payment_intent_id AS "paymentIntentId", redirect_url AS "redirectUrl"`,
      [
        paymentIntent.id,
        customerId,
        orderData.restaurantId,
        orderData.totalAmount,
        'PHP',
        'awaiting_payment',
        'gcash',
        JSON.stringify(orderData),
        JSON.stringify(attachedPayment),
        attachedPayment.attributes.next_action?.redirect?.url || null,
        validReturnUrl
      ]
    );

    const savedIntent = result.rows[0];

    // Return checkout URL
    res.json({
      status: 'success',
      data: {
        paymentIntentId: savedIntent.paymentIntentId,
        checkoutUrl: savedIntent.redirectUrl,
        message: 'Redirect user to checkoutUrl to complete payment'
      }
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw badRequest(error.message || 'Failed to create payment session');
  }
});

/**
 * Handle PayMongo webhook events
 * POST /api/payments/webhook
 */
export const handleWebhook = asyncHandler(async (req, res) => {
  const event = req.body;

  // Verify webhook signature (if configured)
  const signature = req.headers['paymongo-signature'];
  if (!verifyWebhookSignature(JSON.stringify(req.body), signature)) {
    throw unauthorized('Invalid webhook signature');
  }

  console.log('PayMongo webhook received:', event.data?.attributes?.type);

  // Handle payment.paid event
  if (event.data?.attributes?.type === 'payment.paid') {
    const payment = event.data.attributes.data;
    const paymentIntentId = payment.attributes.payment_intent_id;

    try {
      // Find payment intent in database
      const intentResult = await query(
        `SELECT * FROM payment_intents WHERE paymongo_payment_intent_id = $1`,
        [paymentIntentId]
      );

      if (intentResult.rowCount === 0) {
        console.error('Payment intent not found:', paymentIntentId);
        return res.status(404).json({ error: 'Payment intent not found' });
      }

      const paymentIntentRecord = intentResult.rows[0];

      // Check if order already created
      if (paymentIntentRecord.order_id) {
        console.log('Order already created for payment intent:', paymentIntentId);
        return res.status(200).json({ message: 'Order already processed' });
      }

      // Create order from payment intent
      const orderId = await createOrderFromPaymentIntent(paymentIntentRecord);

      // Update payment intent with order ID
      await query(
        `UPDATE payment_intents SET status = $1, order_id = $2, updated_at = NOW() WHERE id = $3`,
        ['paid', orderId, paymentIntentRecord.id]
      );

      console.log('Order created successfully:', orderId);
      res.status(200).json({ message: 'Order created successfully', orderId });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Failed to process payment' });
    }
  } else if (event.data?.attributes?.type === 'payment.failed') {
    // Handle payment failure
    const payment = event.data.attributes.data;
    const paymentIntentId = payment.attributes.payment_intent_id;

    await query(
      `UPDATE payment_intents SET status = $1, updated_at = NOW() WHERE paymongo_payment_intent_id = $2`,
      ['failed', paymentIntentId]
    );

    res.status(200).json({ message: 'Payment failure recorded' });
  } else {
    // Acknowledge other events
    res.status(200).json({ message: 'Event received' });
  }
});

/**
 * Get payment status
 * GET /api/payments/status/:paymentIntentId
 */
export const getPaymentStatus = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.params;
  const customerId = req.user.sub;

  // Get payment intent from database
  const result = await query(
    `SELECT 
      pi.id,
      pi.paymongo_payment_intent_id AS "paymongoPaymentIntentId",
      pi.status,
      pi.amount,
      pi.currency,
      pi.order_id AS "orderId",
      pi.created_at AS "createdAt",
      o.status AS "orderStatus"
    FROM payment_intents pi
    LEFT JOIN orders o ON o.id = pi.order_id
    WHERE pi.paymongo_payment_intent_id = $1 AND pi.customer_id = $2`,
    [paymentIntentId, customerId]
  );

  if (result.rowCount === 0) {
    throw notFound('Payment intent not found');
  }

  const paymentIntent = result.rows[0];

  // If status is still awaiting_payment, check with PayMongo
  if (paymentIntent.status === 'awaiting_payment') {
    try {
      const paymongoIntent = await retrievePaymentIntent(paymentIntentId);
      const paymongoStatus = paymongoIntent.attributes.status;

      // Update local status if it changed
      if (paymongoStatus === 'succeeded') {
        await query(
          `UPDATE payment_intents SET status = $1, updated_at = NOW() WHERE paymongo_payment_intent_id = $2`,
          ['paid', paymentIntentId]
        );
        paymentIntent.status = 'paid';
      } else if (paymongoStatus === 'processing') {
        paymentIntent.status = 'awaiting_payment';
      }
    } catch (error) {
      console.error('Error checking PayMongo status:', error);
    }
  }

  res.json({
    status: 'success',
    data: paymentIntent
  });
});

/**
 * Helper function to create order from payment intent
 * Called by webhook when payment is confirmed
 */
async function createOrderFromPaymentIntent(paymentIntentRecord) {
  const orderData = paymentIntentRecord.order_data;
  
  return await withTransaction(async (client) => {
    // Create order
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
      VALUES ($1, $2, $3, 'confirmed', $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        paymentIntentRecord.customer_id,
        paymentIntentRecord.restaurant_id,
        orderData.deliveryAddressId || null,
        orderData.orderType || 'delivery',
        orderData.subtotal,
        orderData.deliveryFee || 0,
        orderData.taxAmount || 0,
        orderData.tipAmount || 0,
        paymentIntentRecord.amount,
        orderData.specialInstructions || null
      ]
    );

    const order = orderInsert.rows[0];

    // Create order items
    const items = orderData.items || [];
    if (items.length > 0) {
      const orderItemsValues = items.flatMap((item) => [
        order.id,
        item.menuItemId,
        item.quantity,
        item.unitPrice,
        item.specialInstructions || null
      ]);

      const valuePlaceholders = items
        .map((_, idx) => `($${idx * 5 + 1}, $${idx * 5 + 2}, $${idx * 5 + 3}, $${idx * 5 + 4}, $${idx * 5 + 5})`)
        .join(', ');

      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, special_instructions)
         VALUES ${valuePlaceholders}`,
        orderItemsValues
      );
    }

    // Create delivery record if needed
    if (orderData.orderType === 'delivery') {
      await client.query(
        `INSERT INTO deliveries (order_id, status) VALUES ($1, 'assigned')`,
        [order.id]
      );
    }

    // Create payment record
    await client.query(
      `INSERT INTO payments (
        order_id,
        payment_method,
        payment_status,
        amount,
        currency,
        transaction_id,
        payment_gateway,
        gateway_response
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        order.id,
        'gcash',
        'completed',
        paymentIntentRecord.amount,
        'PHP',
        paymentIntentRecord.paymongo_payment_intent_id,
        'paymongo',
        paymentIntentRecord.paymongo_response
      ]
    );

    return order.id;
  });
}

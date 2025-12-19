import { query, withTransaction } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  badRequest,
  notFound,
  unauthorized
} from '../utils/httpError.js';
import {
  createGcashSource,
  createPayment,
  getPayment,
  getSource,
  verifyWebhookSignature
} from '../utils/paymongo.js';

/**
 * Create a GCash payment source for an order
 * POST /api/payments/create-source
 */
export const createPaymentSource = asyncHandler(async (req, res) => {
  const { orderId, amount, redirectSuccess, redirectFailed } = req.body;

  if (!orderId) {
    throw badRequest('Order ID is required');
  }

  if (!amount || amount <= 0) {
    throw badRequest('Amount must be greater than 0');
  }

  // Verify order exists and belongs to user
  const orderResult = await query(
    `SELECT o.id, o.customer_id, o.restaurant_id, o.total_amount, o.status,
            r.name AS restaurant_name
     FROM orders o
     LEFT JOIN restaurants r ON r.id = o.restaurant_id
     WHERE o.id = $1`,
    [orderId]
  );

  if (orderResult.rowCount === 0) {
    throw notFound('Order not found');
  }

  const order = orderResult.rows[0];

  // Verify user owns the order (unless admin)
  if (req.user.role !== 'admin' && req.user.sub !== order.customer_id) {
    throw unauthorized('You can only create payments for your own orders');
  }

  // Verify order amount matches
  if (Math.abs(parseFloat(order.total_amount) - parseFloat(amount)) > 0.01) {
    throw badRequest('Amount does not match order total');
  }

  // Get or create payment record
  let paymentResult = await query(
    `SELECT id, payment_status, transaction_id
     FROM payments
     WHERE order_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [orderId]
  );

  let paymentId;
  if (paymentResult.rowCount > 0) {
    const payment = paymentResult.rows[0];
    paymentId = payment.id;

    // If payment already completed, don't create new source
    if (payment.payment_status === 'completed') {
      throw badRequest('Payment already completed');
    }
  } else {
    // Create payment record
    const newPaymentResult = await query(
      `INSERT INTO payments (
          order_id,
          payment_method,
          payment_status,
          amount,
          currency,
          payment_gateway
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [orderId, 'gcash', 'pending', amount, 'PHP', 'paymongo']
    );
    paymentId = newPaymentResult.rows[0].id;
  }

  // Create PayMongo GCash source
  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const successUrl = redirectSuccess || `${appBaseUrl}/pages/customers/payment_confirmation.html?orderId=${orderId}&status=success`;
  const failedUrl = redirectFailed || `${appBaseUrl}/pages/customers/payment_confirmation.html?orderId=${orderId}&status=failed`;

  const source = await createGcashSource({
    amount: parseFloat(amount),
    currency: 'PHP',
    redirectSuccess: successUrl,
    redirectFailed: failedUrl,
    metadata: {
      orderId: orderId,
      paymentId: paymentId,
      restaurantId: order.restaurant_id,
      restaurantName: order.restaurant_name
    }
  });

  // Update payment record with source ID
  await query(
    `UPDATE payments
     SET transaction_id = $1,
         gateway_response = $2,
         payment_status = 'processing',
         updated_at = NOW()
     WHERE id = $3`,
    [
      source.id,
      JSON.stringify({
        sourceId: source.id,
        checkoutUrl: source.attributes.redirect.checkout_url,
        status: source.attributes.status
      }),
      paymentId
    ]
  );

  res.json({
    status: 'success',
    data: {
      sourceId: source.id,
      checkoutUrl: source.attributes.redirect.checkout_url,
      status: source.attributes.status,
      paymentId: paymentId
    }
  });
});

/**
 * Create payment from source (after customer authorizes)
 * POST /api/payments/create-payment
 */
export const createPaymentFromSource = asyncHandler(async (req, res) => {
  const { sourceId, orderId } = req.body;

  if (!sourceId) {
    throw badRequest('Source ID is required');
  }

  if (!orderId) {
    throw badRequest('Order ID is required');
  }

  // Get order and payment info
  const orderResult = await query(
    `SELECT o.id, o.customer_id, o.total_amount, o.status,
            p.id AS payment_id, p.amount, p.payment_status
     FROM orders o
     LEFT JOIN payments p ON p.order_id = o.id
     WHERE o.id = $1
     ORDER BY p.created_at DESC
     LIMIT 1`,
    [orderId]
  );

  if (orderResult.rowCount === 0) {
    throw notFound('Order not found');
  }

  const order = orderResult.rows[0];

  // Verify user owns the order (unless admin)
  if (req.user.role !== 'admin' && req.user.sub !== order.customer_id) {
    throw unauthorized('You can only create payments for your own orders');
  }

  // Get source from PayMongo
  const source = await getSource(sourceId);

  if (source.attributes.status !== 'chargeable') {
    throw badRequest(`Source is not chargeable. Status: ${source.attributes.status}`);
  }

  // Create payment
  const payment = await createPayment({
    sourceId: source.id,
    amount: parseFloat(order.total_amount),
    currency: 'PHP',
    description: `Order ${orderId}`,
    metadata: {
      orderId: orderId,
      paymentId: order.payment_id
    }
  });

  // Update payment record
  const paymentStatus = payment.attributes.status === 'paid' ? 'completed' : 'processing';

  await query(
    `UPDATE payments
     SET transaction_id = $1,
         payment_status = $2,
         gateway_response = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [
      payment.id,
      paymentStatus,
      JSON.stringify({
        paymentId: payment.id,
        sourceId: source.id,
        status: payment.attributes.status,
        paidAt: payment.attributes.paid_at,
        amount: payment.attributes.amount
      }),
      order.payment_id
    ]
  );

  // If payment is completed, update order status
  if (paymentStatus === 'completed') {
    await query(
      `UPDATE orders
       SET status = 'confirmed',
           updated_at = NOW()
       WHERE id = $1 AND status = 'pending'`,
      [orderId]
    );
  }

  res.json({
    status: 'success',
    data: {
      paymentId: payment.id,
      status: payment.attributes.status,
      orderStatus: paymentStatus === 'completed' ? 'confirmed' : order.status
    }
  });
});

/**
 * Handle PayMongo webhook
 * POST /api/payments/webhook
 */
export const handlePaymongoWebhook = asyncHandler(async (req, res) => {
  // Get webhook signature from headers
  const signature = req.headers['paymongo-signature'] || req.headers['x-paymongo-signature'];
  const payload = JSON.stringify(req.body);

  // Verify webhook signature (if configured)
  if (!verifyWebhookSignature(signature, payload)) {
    console.error('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body.data;

  if (!event || event.type !== 'event') {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  const eventType = event.attributes.type;
  const eventData = event.attributes.data;

  console.log('PayMongo webhook received:', eventType, eventData);

  // Handle payment.paid event
  if (eventType === 'payment.paid') {
    const paymentId = eventData.id;
    const metadata = eventData.attributes.metadata || {};

    if (!metadata.orderId) {
      console.error('Payment webhook missing orderId in metadata');
      return res.status(400).json({ error: 'Missing orderId' });
    }

    // Update payment status
    await query(
      `UPDATE payments
       SET payment_status = 'completed',
           transaction_id = $1,
           gateway_response = $2,
           updated_at = NOW()
       WHERE order_id = $3
       RETURNING id`,
      [
        paymentId,
        JSON.stringify(eventData),
        metadata.orderId
      ]
    );

    // Update order status to confirmed
    await query(
      `UPDATE orders
       SET status = 'confirmed',
           updated_at = NOW()
       WHERE id = $1 AND status = 'pending'`,
      [metadata.orderId]
    );

    console.log(`Payment ${paymentId} completed for order ${metadata.orderId}`);
  }

  // Handle source.chargeable event (customer authorized payment)
  if (eventType === 'source.chargeable') {
    const sourceId = eventData.id;
    const metadata = eventData.attributes.metadata || {};

    if (!metadata.orderId) {
      console.error('Source webhook missing orderId in metadata');
      return res.status(400).json({ error: 'Missing orderId' });
    }

    try {
      // Get order details
      const orderResult = await query(
        `SELECT o.id, o.total_amount, p.id AS payment_id
         FROM orders o
         LEFT JOIN payments p ON p.order_id = o.id
         WHERE o.id = $1
         ORDER BY p.created_at DESC
         LIMIT 1`,
        [metadata.orderId]
      );

      if (orderResult.rowCount > 0) {
        const order = orderResult.rows[0];

        // Automatically create payment from chargeable source
        const payment = await createPayment({
          sourceId: sourceId,
          amount: parseFloat(order.total_amount),
          currency: 'PHP',
          description: `Order ${metadata.orderId}`,
          metadata: {
            orderId: metadata.orderId,
            paymentId: order.payment_id
          }
        });

        // Update payment record
        const paymentStatus = payment.attributes.status === 'paid' ? 'completed' : 'processing';

        await query(
          `UPDATE payments
           SET transaction_id = $1,
               payment_status = $2,
               gateway_response = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [
            payment.id,
            paymentStatus,
            JSON.stringify({
              paymentId: payment.id,
              sourceId: sourceId,
              status: payment.attributes.status,
              paidAt: payment.attributes.paid_at,
              amount: payment.attributes.amount
            }),
            order.payment_id
          ]
        );

        // If payment is completed, update order status
        if (paymentStatus === 'completed') {
          await query(
            `UPDATE orders
             SET status = 'confirmed',
                 updated_at = NOW()
             WHERE id = $1 AND status = 'pending'`,
            [metadata.orderId]
          );
        }

        console.log(`Payment ${payment.id} created from source ${sourceId} for order ${metadata.orderId}`);
      }
    } catch (error) {
      console.error('Error processing chargeable source:', error);
      // Don't fail webhook, log error
    }
  }

  res.json({ received: true });
});

/**
 * Get payment status
 * GET /api/payments/status/:orderId
 */
export const getPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const result = await query(
    `SELECT p.id,
            p.payment_method AS "paymentMethod",
            p.payment_status AS "paymentStatus",
            p.amount,
            p.currency,
            p.transaction_id AS "transactionId",
            p.payment_gateway AS "paymentGateway",
            p.gateway_response AS "gatewayResponse",
            p.qr_code_url AS "qrCodeUrl",
            p.created_at AS "createdAt",
            o.status AS "orderStatus"
     FROM payments p
     LEFT JOIN orders o ON o.id = p.order_id
     WHERE p.order_id = $1
     ORDER BY p.created_at DESC
     LIMIT 1`,
    [orderId]
  );

  if (result.rowCount === 0) {
    throw notFound('Payment not found');
  }

  const payment = result.rows[0];

  // Verify user owns the order (unless admin)
  const orderResult = await query(
    `SELECT customer_id FROM orders WHERE id = $1`,
    [orderId]
  );

  if (orderResult.rowCount > 0) {
    const order = orderResult.rows[0];
    if (req.user.role !== 'admin' && req.user.sub !== order.customer_id) {
      throw unauthorized('You can only view payments for your own orders');
    }
  }

  res.json({
    status: 'success',
    data: payment
  });
});


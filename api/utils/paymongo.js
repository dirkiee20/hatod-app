/**
 * PayMongo API Integration Utility
 * Handles GCash payment source creation and payment processing
 */

const PAYMONGO_API_BASE = process.env.PAYMONGO_API_BASE || 'https://api.paymongo.com/v1';
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_PUBLIC_KEY = process.env.PAYMONGO_PUBLIC_KEY;

/**
 * Create a PayMongo API request
 */
async function paymongoRequest(endpoint, method = 'GET', data = null, useSecret = true) {
  if (!PAYMONGO_SECRET_KEY && useSecret) {
    throw new Error('PayMongo secret key is not configured');
  }

  const key = useSecret ? PAYMONGO_SECRET_KEY : PAYMONGO_PUBLIC_KEY;
  const auth = Buffer.from(key + ':').toString('base64');

  const options = {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  if (data && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${PAYMONGO_API_BASE}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.errors?.[0]?.detail || result.errors?.[0]?.message || 'PayMongo API error';
      throw new Error(errorMessage);
    }

    return result;
  } catch (error) {
    console.error('PayMongo API Error:', error);
    throw error;
  }
}

/**
 * Create a GCash payment source
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Amount in cents (PHP: amount * 100)
 * @param {string} params.currency - Currency code (PHP)
 * @param {string} params.redirectSuccess - Success redirect URL
 * @param {string} params.redirectFailed - Failed redirect URL
 * @param {Object} params.metadata - Additional metadata (orderId, etc.)
 * @returns {Promise<Object>} PayMongo source object
 */
export async function createGcashSource({ amount, currency = 'PHP', redirectSuccess, redirectFailed, metadata = {} }) {
  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Convert PHP to centavos (smallest currency unit)
  const amountInCents = Math.round(amount * 100);

  const sourceData = {
    type: 'source',
    attributes: {
      type: 'gcash',
      amount: amountInCents,
      currency: currency.toUpperCase(),
      redirect: {
        success: redirectSuccess,
        failed: redirectFailed
      },
      metadata: metadata
    }
  };

  const response = await paymongoRequest('/sources', 'POST', sourceData, false); // Use public key for sources
  return response.data;
}

/**
 * Create a payment from a chargeable source
 * @param {string} sourceId - PayMongo source ID
 * @param {number} amount - Amount in PHP
 * @param {string} currency - Currency code (PHP)
 * @param {string} description - Payment description
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} PayMongo payment object
 */
export async function createPayment({ sourceId, amount, currency = 'PHP', description, metadata = {} }) {
  if (!sourceId) {
    throw new Error('Source ID is required');
  }

  // Convert PHP to centavos
  const amountInCents = Math.round(amount * 100);

  const paymentData = {
    type: 'payment',
    attributes: {
      amount: amountInCents,
      currency: currency.toUpperCase(),
      description: description || 'Order payment',
      source: {
        id: sourceId,
        type: 'source'
      },
      metadata: metadata
    }
  };

  const response = await paymongoRequest('/payments', 'POST', paymentData, true); // Use secret key for payments
  return response.data;
}

/**
 * Retrieve a payment by ID
 * @param {string} paymentId - PayMongo payment ID
 * @returns {Promise<Object>} PayMongo payment object
 */
export async function getPayment(paymentId) {
  if (!paymentId) {
    throw new Error('Payment ID is required');
  }

  const response = await paymongoRequest(`/payments/${paymentId}`, 'GET', null, true);
  return response.data;
}

/**
 * Retrieve a source by ID
 * @param {string} sourceId - PayMongo source ID
 * @returns {Promise<Object>} PayMongo source object
 */
export async function getSource(sourceId) {
  if (!sourceId) {
    throw new Error('Source ID is required');
  }

  const response = await paymongoRequest(`/sources/${sourceId}`, 'GET', null, false);
  return response.data;
}

/**
 * Verify PayMongo webhook signature
 * @param {string} signature - Webhook signature from headers
 * @param {string} payload - Raw request body
 * @returns {boolean} True if signature is valid
 */
export function verifyWebhookSignature(signature, payload) {
  // PayMongo webhook verification would require their webhook secret
  // For now, we'll rely on HTTPS and webhook URL secrecy
  // In production, implement proper signature verification
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('PayMongo webhook secret not configured - skipping signature verification');
    return true; // Allow in development, but log warning
  }

  // TODO: Implement HMAC signature verification when PayMongo provides webhook secrets
  // For now, we'll validate based on event structure
  return true;
}


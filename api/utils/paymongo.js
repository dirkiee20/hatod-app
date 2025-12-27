import axios from 'axios';
import crypto from 'crypto';

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_API_BASE = 'https://api.paymongo.com/v1';

if (!PAYMONGO_SECRET_KEY) {
  console.warn('Warning: PAYMONGO_SECRET_KEY is not set in environment variables');
}

/**
 * Create a Payment Intent with PayMongo
 * @param {number} amount - Amount in PHP (will be converted to centavos)
 * @param {string} currency - Currency code (default: PHP)
 * @param {object} metadata - Additional metadata to attach
 * @returns {Promise<object>} Payment Intent object
 */
export async function createPaymentIntent(amount, currency = 'PHP', metadata = {}) {
  try {
    const response = await axios.post(
      `${PAYMONGO_API_BASE}/payment_intents`,
      {
        data: {
          attributes: {
            amount: Math.round(amount * 100), // Convert to centavos
            payment_method_allowed: ['gcash'],
            payment_method_options: {
              card: { request_three_d_secure: 'any' }
            },
            currency,
            capture_type: 'automatic',
            description: metadata.description || 'HATOD Food Delivery Order',
            statement_descriptor: 'HATOD'
          }
        }
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('PayMongo createPaymentIntent error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to create payment intent');
  }
}

/**
 * Create a Payment Method (GCash)
 * @param {string} type - Payment method type (default: gcash)
 * @returns {Promise<object>} Payment Method object
 */
export async function createPaymentMethod(type = 'gcash') {
  try {
    const response = await axios.post(
      `${PAYMONGO_API_BASE}/payment_methods`,
      {
        data: {
          attributes: {
            type
          }
        }
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('PayMongo createPaymentMethod error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to create payment method');
  }
}

/**
 * Attach Payment Method to Payment Intent
 * @param {string} paymentIntentId - Payment Intent ID
 * @param {string} paymentMethodId - Payment Method ID
 * @param {string} returnUrl - URL to redirect after payment
 * @returns {Promise<object>} Updated Payment Intent with redirect URL
 */
export async function attachPaymentIntent(paymentIntentId, paymentMethodId, returnUrl) {
  try {
    const response = await axios.post(
      `${PAYMONGO_API_BASE}/payment_intents/${paymentIntentId}/attach`,
      {
        data: {
          attributes: {
            payment_method: paymentMethodId,
            return_url: returnUrl
          }
        }
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('PayMongo attachPaymentIntent error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to attach payment method');
  }
}

/**
 * Retrieve Payment Intent status
 * @param {string} paymentIntentId - Payment Intent ID
 * @returns {Promise<object>} Payment Intent object
 */
export async function retrievePaymentIntent(paymentIntentId) {
  try {
    const response = await axios.get(
      `${PAYMONGO_API_BASE}/payment_intents/${paymentIntentId}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY).toString('base64')}`
        }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('PayMongo retrievePaymentIntent error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to retrieve payment intent');
  }
}

/**
 * Verify webhook signature (for security)
 * @param {string} payload - Raw request body
 * @param {string} signatureHeader - Signature from header (t=...,v1=...)
 * @returns {boolean} Whether signature is valid
 */
export function verifyWebhookSignature(payload, signatureHeader) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('PAYMONGO_WEBHOOK_SECRET not set - webhook verification disabled');
    return true;
  }

  if (!signatureHeader) {
    console.error('No PayMongo signature header found');
    return false;
  }

  try {
    // Parse header (format: t=timestamp,v1=signature)
    const headerParts = signatureHeader.split(',');
    const timestampPart = headerParts.find(p => p.startsWith('t='));
    const signaturePart = headerParts.find(p => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      console.error('Invalid PayMongo signature header format');
      return false;
    }

    const timestamp = timestampPart.split('=')[1];
    const signature = signaturePart.split('=')[1];

    // PayMongo concatenates timestamp and payload with a dot
    const baseString = `${timestamp}.${payload}`;
    
    // Create HMAC
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(baseString)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

# PayMongo GCash Integration Guide

## Overview

This app now uses **PayMongo** as the payment gateway for GCash payments. PayMongo handles the entire payment flow, including customer authorization and payment processing.

## Setup Instructions

### 1. Get PayMongo API Keys

1. Sign up at [https://dashboard.paymongo.com](https://dashboard.paymongo.com)
2. Go to **Settings → API Keys**
3. Copy your **Secret Key** (starts with `sk_test_` for test, `sk_live_` for production)
4. Copy your **Public Key** (starts with `pk_test_` for test, `pk_live_` for production)

### 2. Configure Environment Variables

Add these to your `.env` file (see `docs/env.example`):

```env
# PayMongo API Configuration
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
PAYMONGO_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
PAYMONGO_API_BASE=https://api.paymongo.com/v1
PAYMONGO_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx  # Optional, for webhook verification
```

### 3. Set Up Webhook (Production)

1. Go to **Settings → Webhooks** in PayMongo dashboard
2. Add webhook URL: `https://your-api-domain.com/api/payments/webhook`
3. Select events:
   - `payment.paid`
   - `source.chargeable`
4. Copy the webhook secret and add to `PAYMONGO_WEBHOOK_SECRET`

### 4. Enable GCash in PayMongo

- GCash is automatically enabled in PayMongo accounts
- Test transactions work immediately
- Production GCash transactions are enabled within 5 business days after account activation

## Payment Flow

1. **Customer places order** → Order is created with `payment_status = 'pending'`
2. **Create PayMongo source** → Customer is redirected to PayMongo checkout URL
3. **Customer authorizes** → Customer completes payment in GCash app
4. **PayMongo webhook** → `source.chargeable` event triggers automatic payment creation
5. **Payment completed** → `payment.paid` event updates order status to `confirmed`

## API Endpoints

### Create Payment Source
```
POST /api/payments/create-source
Body: {
  orderId: "uuid",
  amount: 500.00,
  redirectSuccess: "https://...",
  redirectFailed: "https://..."
}
```

### Create Payment from Source
```
POST /api/payments/create-payment
Body: {
  sourceId: "src_xxx",
  orderId: "uuid"
}
```

### Get Payment Status
```
GET /api/payments/status/:orderId
```

### Webhook (PayMongo → Your Server)
```
POST /api/payments/webhook
```

## Important Notes

### Payment Collection Model
- **Current Implementation**: Payments are collected by your platform account
- **Restaurant Payouts**: You'll need to manually transfer funds to restaurants, or implement PayMongo's marketplace/sub-merchant features for automatic payouts

### For Direct-to-Restaurant Payments
If you want payments to go directly to restaurant GCash accounts (not through platform), you have two options:

1. **Keep the old QR code method** (customers scan restaurant's GCash QR)
2. **Use PayMongo Marketplace API** (requires additional setup and approval)

The current implementation uses PayMongo's standard payment flow where funds go to your platform account first.

## Testing

1. Use test API keys (`sk_test_` and `pk_test_`)
2. Test payments will be processed but not actually charged
3. Use PayMongo's test GCash numbers for testing

## Production Checklist

- [ ] Replace test keys with live keys
- [ ] Set up webhook URL in PayMongo dashboard
- [ ] Configure webhook secret
- [ ] Test payment flow end-to-end
- [ ] Set up payout process to restaurants (manual or automated)

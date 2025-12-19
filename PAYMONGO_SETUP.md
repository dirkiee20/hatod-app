# PayMongo Setup Instructions

## Your PayMongo Test Keys

⚠️ **IMPORTANT:** Add your actual keys to your `.env` file and Railway - never commit them to git!

Get your keys from: [PayMongo Dashboard](https://dashboard.paymongo.com) → Settings → API Keys

## Next Steps

### 1. Add Keys to Your .env File
Create or update `api/.env` (or your main `.env` file) with:

```env
# PayMongo API Configuration (TEST KEYS)
# Get your keys from: https://dashboard.paymongo.com/settings/api-keys
PAYMONGO_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
PAYMONGO_PUBLIC_KEY=pk_test_YOUR_PUBLIC_KEY_HERE
PAYMONGO_API_BASE=https://api.paymongo.com/v1
PAYMONGO_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx  # Optional, for webhook verification
```

**Important:** Never commit your `.env` file to git! It's already in `.gitignore`.

### 4. Set Up Webhook (Production)
1. Go to **Settings → Webhooks** in PayMongo dashboard
2. Add webhook URL: `https://your-api-domain.com/api/payments/webhook`
3. Select events:
   - `payment.paid`
   - `source.chargeable`
4. Copy the webhook secret and add to `PAYMONGO_WEBHOOK_SECRET` in `.env`

### 5. Test the Integration
- Your public key is already configured
- Once you add the secret key, the payment flow will work
- Test with a small amount first

## Production Keys (When Ready)

When you're ready for production, switch to LIVE keys:
- **Live Secret Key:** `sk_live_...` (get from PayMongo dashboard)
- **Live Public Key:** `pk_live_mLNQbFG1w4RLGm9JB5nPBwCG` (you already have this)

## Security Reminders

⚠️ **IMPORTANT:**
- Never commit `.env` files to git
- Never share your secret key publicly
- ✅ Currently using TEST keys (`sk_test_`/`pk_test_`) - safe for development
- Use live keys (`sk_live_`/`pk_live_`) only in production
- Public keys are safe to expose (they're used client-side)
- Secret keys must be kept private (server-side only)

## Payment Flow

1. Customer places order → Order created
2. System creates PayMongo source → Customer redirected to PayMongo
3. Customer pays in GCash → PayMongo processes payment
4. Webhook receives `source.chargeable` → Payment automatically created
5. Webhook receives `payment.paid` → Order status updated to `confirmed`

## Need Help?

See `PAYMONGO_INTEGRATION.md` for detailed integration documentation.


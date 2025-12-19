# Deploying PayMongo to Railway

## Add Environment Variables to Railway

### Step 1: Go to Your Railway Project
1. Log in to [Railway](https://railway.app)
2. Select your backend project/service

### Step 2: Add Environment Variables
1. Click on your service
2. Go to the **Variables** tab (or **Settings** → **Variables**)
3. Click **+ New Variable** for each of the following:

### Step 3: Add These Variables

Add these PayMongo environment variables:

```env
PAYMONGO_SECRET_KEY=sk_test_MXG8hdwTbR6oguQhcjYvBrC8
PAYMONGO_PUBLIC_KEY=pk_test_4M5C3PMLA1L86jqW1gVfB1hZ
PAYMONGO_API_BASE=https://api.paymongo.com/v1
```

**For each variable:**
- **Name:** `PAYMONGO_SECRET_KEY` (or `PAYMONGO_PUBLIC_KEY`, etc.)
- **Value:** The corresponding value (e.g., `sk_test_MXG8hdwTbR6oguQhcjYvBrC8`)
- Click **Add**

### Step 4: Update APP_BASE_URL (Important!)

Make sure your `APP_BASE_URL` is set to your production frontend URL:

```env
APP_BASE_URL=https://your-frontend-domain.com
```

Or if your frontend is also on Railway:
```env
APP_BASE_URL=https://your-railway-frontend-url.up.railway.app
```

This is used for PayMongo redirect URLs after payment.

### Step 5: Redeploy

After adding the variables:
1. Railway will automatically detect the changes
2. Your service will redeploy with the new environment variables
3. Check the deployment logs to ensure it starts successfully

## Webhook Setup (Production)

Once your backend is deployed on Railway:

### 1. Get Your Railway Webhook URL
Your webhook URL will be:
```
https://your-railway-backend-url.up.railway.app/api/payments/webhook
```

### 2. Configure Webhook in PayMongo
1. Go to [PayMongo Dashboard](https://dashboard.paymongo.com)
2. Navigate to **Settings → Webhooks**
3. Click **+ Add Webhook**
4. Enter your Railway webhook URL:
   ```
   https://your-railway-backend-url.up.railway.app/api/payments/webhook
   ```
5. Select events:
   - ✅ `payment.paid`
   - ✅ `source.chargeable`
6. Click **Create Webhook**
7. Copy the webhook secret (starts with `whsec_`)
8. Add it to Railway as `PAYMONGO_WEBHOOK_SECRET`

## Testing

After deployment:
1. Test creating an order
2. Verify PayMongo source creation
3. Test payment flow
4. Check webhook logs in Railway

## Railway Environment Variables Checklist

Make sure you have these in Railway:

- ✅ `PAYMONGO_SECRET_KEY` = Your test secret key (starts with `sk_test_`)
- ✅ `PAYMONGO_PUBLIC_KEY` = Your test public key (starts with `pk_test_`)
- ✅ `PAYMONGO_API_BASE` = `https://api.paymongo.com/v1`
- ✅ `APP_BASE_URL` = Your frontend URL
- ⚠️ `PAYMONGO_WEBHOOK_SECRET` = (Optional, add after setting up webhook)

## Production Keys (When Ready)

When switching to production:
1. Replace test keys with live keys in Railway
2. Update `PAYMONGO_SECRET_KEY` to `sk_live_...`
3. Update `PAYMONGO_PUBLIC_KEY` to `pk_live_mLNQbFG1w4RLGm9JB5nPBwCG`
4. Redeploy

## Troubleshooting

### Variables Not Working?
- Make sure you saved the variables in Railway
- Check that variable names match exactly (case-sensitive)
- Redeploy after adding variables

### Webhook Not Receiving Events?
- Verify webhook URL is accessible (test with curl)
- Check Railway logs for webhook requests
- Verify webhook secret is set correctly

### Payment Redirects Not Working?
- Check `APP_BASE_URL` is set correctly
- Verify redirect URLs in PayMongo source creation
- Check Railway logs for errors

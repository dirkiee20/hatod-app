# PayMongo GCash Integration - Setup Instructions

## ✅ What's Been Implemented

### Backend
- ✅ PayMongo utility module (`api/utils/paymongo.js`)
- ✅ Payment controller (`api/controllers/paymentsController.js`)
- ✅ Payment routes (`api/routes/paymentRoutes.js`)
- ✅ Database migration for `payment_intents` table
- ✅ Webhook handler for payment confirmation

### Frontend  
- ✅ Payment success page (`pages/customers/payment_success.html`)
- ⚠️ **MANUAL STEP REQUIRED**: Checkout page needs small modification (see below)

---

## 🔧 Required Setup Steps

### 1. Add PayMongo API Keys to Environment

Add these to `api/.env`:

```env
# PayMongo API Configuration
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
PAYMONGO_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
PAYMONGO_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Frontend URL for payment redirects
FRONTEND_URL=http://localhost:3000
```

**Get your keys from**: https://dashboard.paymongo.com/developers/api-keys

---

### 2. Restart Your Server

After adding environment variables:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run server
```

---

### 3. Manual Code Change Required

**File**: `pages/customers/checkout.html`

**Find this line** (around line 1844-1845):

```javascript
// Get selected payment method
const selectedPaymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'cash';
```

**Add this code AFTER the line above** (before the "Create orders for each restaurant" comment):

```javascript
// ===== PAYMONGO GCASH INTEGRATION START =====
// For GCash payments, use PayMongo payment intent flow
if (selectedPaymentMethod === 'gcash') {
    // Only support single restaurant orders for now
    if (restaurantIds.length > 1) {
        setPlaceOrderLoading(false);
        alert('PayMongo GCash payment currently only supports orders from a single restaurant.');
        return;
    }

    const restaurantId = restaurantIds[0];
    const restaurant = restaurants[restaurantId];

    // Calculate totals
    let subtotal = 0;
    cart.forEach(item => {
        const price = item.variantPrice ? parseFloat(item.variantPrice) : (item.price ? parseFloat(item.price) : 0);
        const quantity = item.quantity || 1;
        subtotal += price * quantity;
    });

    const deliveryFeeElement = document.querySelector('.restaurant-delivery-fee');
    const deliveryFee = deliveryFeeElement ? 
        parseFloat(deliveryFeeElement.textContent.replace('₱', '').replace(',', '')) : 0;
    const totalAmount = subtotal + deliveryFee;

    const items = restaurant.items.map(item => ({
        menuItemId: item.menuItemId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: item.variantPrice || item.price,
        specialInstructions: item.specialInstructions || null
    }));

    const orderData = {
        customerId,
        restaurantId,
        deliveryAddressId,
        orderType: 'delivery',
        subtotal,
        deliveryFee,
        taxAmount: 0,
        tipAmount: 0,
        totalAmount,
        items,
        specialInstructions: null,
        paymentMethod: 'gcash'
    };

    try {
        const returnUrl = `${window.location.origin}/pages/customers/payment_success.html`;
        
        const paymentResponse = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ orderData, returnUrl })
        });

        if (!paymentResponse.ok) {
            const errorData = await paymentResponse.json().catch(() => ({ message: 'Failed to create payment session' }));
            throw new Error(errorData.message || 'Failed to create payment session');
        }

        const paymentResult = await paymentResponse.json();
        console.log('Payment intent created:', paymentResult);

        localStorage.setItem('pendingPaymentIntentId', paymentResult.data.paymentIntentId);
        window.location.href = paymentResult.data.checkoutUrl;
        return; // Exit function - no order creation here
        
    } catch (paymentError) {
        console.error('Error creating payment:', paymentError);
        setPlaceOrderLoading(false);
        alert('Failed to initiate GCash payment: ' + paymentError.message);
        return;
    }
}
// ===== PAYMONGO GCASH INTEGRATION END =====

// Continue with cash payment flow...
```

**This ensures**:
- GCash payments → PayMongo flow (pay first, order later)
- Cash payments → Original flow (order first)

---

## 🧪 Testing

### Test with PayMongo Test Mode

1. **Select GCash payment** on checkout
2. **Click "Place Order"** → Should redirect to PayMongo GCash page
3. **Complete test payment** (use test credentials from PayMongo)
4. **Returns to payment_success.html** → Polls payment status
5. **Order created via webhook** → Redirects to order confirmation

### Check Logs

```bash
# Watch server logs for webhook events
npm run server
# Look for: "PayMongo webhook received: payment.paid"
```

---

## 📝 Webhook Configuration (Production)

### Development (Local Testing)
Use **ngrok** to expose your local server:

```bash
ngrok http 4000
# Copy the https URL (e.g., https://abc123.ngrok.io)
```

Then in PayMongo Dashboard > Webhooks:
- URL: `https://abc123.ngrok.io/api/payments/webhook`
- Events: `payment.paid`, `payment.failed`

### Production
- URL: `https://your-domain.com/api/payments/webhook`
- Copy webhook secret to `PAYMONGO_WEBHOOK_SECRET` in `.env`

---

## ⚠️ Important Notes

1. **Single Restaurant Only**: PayMongo flow currently supports one restaurant per order
2. **Test Mode**: Use `sk_test_` and `pk_test_` keys for testing
3. **Webhook Required**: Orders won't be created without webhook (critical!)
4. **Return URL**: Must match your frontend domain

---

## 🐛 Troubleshooting

### "GCash not redirecting"
- Check server logs for errors
- Verify `PAYMONGO_SECRET_KEY` is set correctly
- Check browser console for errors

### "Order not created after payment"
- Check webhook is configured
- Verify webhook secret matches
- Check server logs for webhook events

### "Payment session failed"
- Verify API keys are correct
- Check amount is > 0
- Ensure axios is installed

---

## 📚 Next Steps

1. Add environment variables
2. Restart server
3. Apply manual code change to checkout.html
4. Test with PayMongo test credentials
5. Configure webhooks for production

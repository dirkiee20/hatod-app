# 📱 Testing HATOD Android App with Railway API

This guide will help you configure and test your Android app with the deployed Railway backend.

## 🎯 Your Railway API URL

```
https://hatod-app-production.up.railway.app
```

All API endpoints: `https://hatod-app-production.up.railway.app/api/...`

---

## 📋 Step 1: Update API Configuration

### Option A: Use Global Config File (Recommended)

I've created a `public/config.js` file that automatically detects if you're running in Capacitor (Android app) and uses the Railway API URL.

**To use it in your HTML pages:**

1. Add this script tag **BEFORE** your other scripts in each HTML file:
   ```html
   <script src="../../public/config.js"></script>
   ```

2. Then use the global variable instead of hardcoded URLs:
   ```javascript
   // Instead of: const API_BASE_URL = 'http://localhost:4000/api';
   // Use:
   const API_BASE_URL = window.API_BASE_URL || 'http://localhost:4000/api';
   ```

### Option B: Update Capacitor Config

You can also configure the API URL in `capacitor.config.json`:

```json
{
  "appId": "com.example.app",
  "appName": "hatod",
  "webDir": "www",
  "bundledWebRuntime": false,
  "server": {
    "url": "https://hatod-app-production.up.railway.app",
    "cleartext": false
  }
}
```

**Note:** This is mainly for development. In production, your app should make direct API calls.

### Option C: Manual Update (Quick Test)

For a quick test, you can manually update the API URL in your HTML files:

1. Find all instances of:
   ```javascript
   const API_BASE_URL = 'http://localhost:4000/api';
   ```

2. Replace with:
   ```javascript
   const API_BASE_URL = 'https://hatod-app-production.up.railway.app/api';
   ```

---

## 🔨 Step 2: Build Your Android App

1. **Sync Capacitor:**
   ```bash
   npx cap sync android
   ```

2. **Open Android Studio:**
   ```bash
   npx cap open android
   ```

3. **Build the APK:**
   - In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Or use Gradle: `./gradlew assembleDebug`

4. **Install on Device:**
   - Connect your Android device via USB
   - Enable USB debugging
   - Run: `npx cap run android`

---

## 🧪 Step 3: Test the App

### Test 1: Health Check

When the app starts, it should be able to connect to the API. Check the app logs:

```bash
# View logs in Android Studio
# Or use adb:
adb logcat | grep -i "hatod\|api\|error"
```

### Test 2: Login/Register

1. **Open the app**
2. **Try to register a new account:**
   - Email: `test@example.com`
   - Password: `test123456`
   - Full Name: `Test User`
   - Role: `customer`

3. **Check if registration succeeds:**
   - You should see a success message
   - You should be redirected to the appropriate page

### Test 3: Browse Restaurants

1. **After logging in, try to browse restaurants**
2. **Check if restaurants load from the API**

### Test 4: Network Debugging

**Enable Network Logging in Android Studio:**

1. Open Android Studio
2. Go to **View → Tool Windows → Logcat**
3. Filter by: `NetworkSecurityConfig` or `OkHttp` or `Volley`

**Or use Chrome DevTools:**

1. Connect your device
2. Open Chrome and go to: `chrome://inspect`
3. Find your app and click **inspect**
4. Go to **Network** tab to see all API calls

---

## 🔍 Troubleshooting

### Issue: "Network request failed" or "Connection refused"

**Solution:**
- Make sure your device has internet connection
- Verify the Railway API is running (check Railway dashboard)
- Check if the API URL is correct (should be `https://`, not `http://`)

### Issue: "CORS error" in logs

**Solution:**
- CORS doesn't apply to mobile apps (only browsers)
- If you see CORS errors, you might be testing in a browser, not the actual Android app
- Make sure you're testing the built APK, not the web version

### Issue: "SSL/TLS handshake failed"

**Solution:**
- Railway uses HTTPS with valid SSL certificates
- Make sure your Android app allows HTTPS connections
- Check Android's network security config (usually not needed for production HTTPS)

### Issue: API returns 401 (Unauthorized)

**Solution:**
- This is normal if you're not logged in
- Try logging in first
- Check if the JWT token is being stored correctly in `localStorage`

### Issue: API returns 500 (Server Error)

**Solution:**
- Check Railway logs: Railway Dashboard → Your service → **Logs** tab
- The error message will show what went wrong
- Common issues: database connection, missing environment variables

---

## 📊 Monitoring API Calls

### View Railway Logs

1. Go to Railway Dashboard
2. Select your service
3. Click **Logs** tab
4. You'll see all API requests in real-time

### Test API Directly

You can test the API endpoints directly to verify they work:

**PowerShell:**
```powershell
# Health check
Invoke-RestMethod -Uri "https://hatod-app-production.up.railway.app/health"

# Test endpoint
Invoke-RestMethod -Uri "https://hatod-app-production.up.railway.app/api/test"
```

**Browser:**
- Open: `https://hatod-app-production.up.railway.app/health`
- Should see: `{"status":"ok","timestamp":"..."}`

---

## ✅ Success Checklist

- [ ] API URL updated to Railway URL
- [ ] Android app built successfully
- [ ] App installed on device
- [ ] App can connect to API (health check passes)
- [ ] User registration works
- [ ] User login works
- [ ] Can browse restaurants
- [ ] Can view restaurant details
- [ ] Can add items to cart
- [ ] Can place orders

---

## 🚀 Next Steps

Once everything is working:

1. **Test all features** in the app
2. **Monitor Railway logs** for any errors
3. **Check Railway metrics** for performance
4. **Prepare for production** release

---

## 📞 Need Help?

If you encounter issues:

1. **Check Railway Logs** - Most errors will show up there
2. **Check Android Logcat** - For app-side errors
3. **Test API directly** - Use Postman or browser to verify API works
4. **Verify environment variables** - Make sure all are set in Railway

---

**Your API is ready!** 🎉

The Railway backend is running and ready to serve your Android app. Just update the API URL in your app configuration and you're good to go!



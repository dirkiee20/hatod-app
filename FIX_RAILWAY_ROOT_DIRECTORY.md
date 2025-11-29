# Fix: Railway Root Directory Issue

## Problem
Your Railway service is serving the entire repository instead of just the `api` folder. This is why:
- ✅ Server is running (receiving requests)
- ❌ Routes return 404 (server running from wrong directory)
- ❌ Requests for `/pages/restaurants/...` are being received (serving entire repo)

## Solution: Set Root Directory to `api`

### Step-by-Step Fix:

1. **Go to Railway Dashboard**
   - Open https://railway.app
   - Click on your `hatod-app` service

2. **Open Settings Tab**
   - Click **"Settings"** in the left sidebar

3. **Set Root Directory**
   - Scroll down to **"Root Directory"** section
   - You'll see a text input (probably empty or set to `.`)
   - **Change it to:** `api`
   - Click **"Save"** or the checkmark

4. **Redeploy**
   - After saving, Railway will automatically trigger a new deployment
   - OR manually click **"Redeploy"** button at the bottom of Settings

5. **Wait for Deployment**
   - Wait 2-3 minutes for the new deployment to complete
   - Check the **"Deployments"** tab to see progress

6. **Verify**
   - Once deployed, test: `https://hatod-app-production.up.railway.app/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

## What This Does

**Before (Wrong):**
```
Repository Root
├── api/
│   ├── server.js  ← Your API code
│   └── package.json
├── pages/         ← Frontend files
└── public/        ← Static files
```
Railway runs from root → Can't find `server.js` → Routes don't work

**After (Correct):**
```
Repository Root
└── api/           ← Railway runs from here
    ├── server.js  ← Found! ✅
    └── package.json
```
Railway runs from `api/` → Finds `server.js` → Routes work! ✅

## Expected Logs After Fix

After setting Root Directory to `api`, you should see in logs:

```
> hatod-api@1.0.0 server
> node server.js

HATOD API server listening on port 10000
```

And requests should work:
- ✅ `GET /health` → `{"status":"ok","timestamp":"..."}`
- ✅ `GET /api/test` → `{"test":"ok"}`
- ✅ `GET /api/customers` → (with auth) customer data

## Still Not Working?

If after setting Root Directory to `api` it still doesn't work:

1. **Check Build Logs**
   - Go to **Deployments** tab
   - Click on the latest deployment
   - Check for build errors

2. **Check Runtime Logs**
   - Go to **Logs** tab
   - Look for:
     - `HATOD API server listening on port...` (good sign)
     - Any error messages (bad sign)

3. **Verify Environment Variables**
   - Settings → Variables tab
   - Ensure `DATABASE_URL`, `JWT_SECRET`, etc. are set

4. **Check Start Command**
   - Settings → Deploy tab
   - Should be: `npm run server` (or `npm start`)
   - This is set in your `railway.toml` ✅

## Quick Checklist

- [ ] Root Directory set to `api` in Settings
- [ ] Saved the change
- [ ] New deployment triggered
- [ ] Deployment shows ✅ Success
- [ ] Logs show "HATOD API server listening on port..."
- [ ] `/health` endpoint returns JSON
- [ ] `/api/test` endpoint returns JSON

---

**This is the #1 most common Railway deployment issue!** Setting Root Directory to `api` should fix it immediately. 🚀



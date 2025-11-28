# Railway API Troubleshooting Guide

## Your API URL
```
https://hatod-app-production.up.railway.app
```

## Common Issues & Fixes

### Issue 1: 404 Not Found

**Symptoms:** Getting 404 errors when accessing `/health` or `/api/test`

**Possible Causes:**
1. Root directory not set to `api`
2. Service not fully deployed
3. Environment variables missing
4. Build/deployment failed

**Fix Steps:**

#### Step 1: Check Root Directory
1. Go to Railway dashboard → Your service (`hatod-app`)
2. Click **Settings** tab
3. Scroll to **Root Directory**
4. **Must be set to:** `api`
5. If it's empty or wrong, change it to `api` and redeploy

#### Step 2: Check Deployment Status
1. Go to **Deployments** tab
2. Check if latest deployment shows:
   - ✅ **Success** (green checkmark)
   - ❌ **Failed** (red X) - if failed, check logs

#### Step 3: Check Logs
1. Go to **Logs** tab
2. Look for errors like:
   - `Failed to start server`
   - `Database connection failed`
   - `Cannot find module`
   - `PORT is not defined`

#### Step 4: Verify Environment Variables
Go to **Variables** tab and ensure these are set:

```
DATABASE_URL=postgresql://postgres.sjxzsjqjpuebtxxskdza:hatod%402025@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
JWT_SECRET=IiWhRo9RpmkVNgJg8ZpiQ/pOrkdIPzEsL2zdzwx1PH7CY+ysZEXT/Ygg+0lRXqEd97D9GC3Mj7jfHnj7aylf2g==
JWT_REFRESH_SECRET=<your-refresh-secret>
NODE_ENV=production
```

**Important:** If any are missing, add them and redeploy.

#### Step 5: Force Redeploy
1. Go to **Settings** tab
2. Scroll to bottom
3. Click **"Redeploy"** button
4. Wait 2-3 minutes for deployment

---

### Issue 2: Database Connection Errors

**Symptoms:** Logs show `ENOTFOUND` or `connection refused`

**Fix:**
1. Verify `DATABASE_URL` is correct in **Variables** tab
2. Check Supabase project is active (not paused)
3. Use session pooler URL (you're already using it ✅)
4. Ensure password is URL-encoded (`@` → `%40`)

---

### Issue 3: Service Not Starting

**Symptoms:** Deployment succeeds but API doesn't respond

**Check:**
1. **Logs** tab → Look for:
   ```
   HATOD API server listening on port 4000
   ```
   or
   ```
   HATOD API server listening on port <PORT>
   ```

2. If you see errors, check:
   - Missing dependencies
   - Syntax errors in code
   - Environment variable issues

---

### Issue 4: Wrong Port

**Symptoms:** Service starts but can't connect

**Fix:**
Railway automatically sets `PORT` environment variable. Your code should use:
```javascript
const PORT = Number(process.env.PORT ?? 4000);
```

✅ Your code already does this correctly!

---

## Quick Verification Checklist

- [ ] Root Directory set to `api` in Settings
- [ ] Latest deployment shows ✅ Success
- [ ] `DATABASE_URL` environment variable is set
- [ ] `JWT_SECRET` environment variable is set
- [ ] `JWT_REFRESH_SECRET` environment variable is set
- [ ] `NODE_ENV` is set to `production`
- [ ] Logs show "HATOD API server listening on port..."
- [ ] No errors in Logs tab

---

## Test Your API

Once everything is configured correctly, test these URLs in your browser:

1. **Health Check:**
   ```
   https://hatod-app-production.up.railway.app/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test Endpoint:**
   ```
   https://hatod-app-production.up.railway.app/api/test
   ```
   Should return: `{"test":"ok"}`

3. **API Routes:**
   ```
   https://hatod-app-production.up.railway.app/api/customers
   https://hatod-app-production.up.railway.app/api/orders
   etc.
   ```

---

## Still Not Working?

1. **Check Railway Status:**
   - Go to https://status.railway.app
   - See if there are any outages

2. **View Full Logs:**
   - Railway dashboard → Your service → Logs tab
   - Copy the full error message
   - Share it for help

3. **Try Manual Redeploy:**
   - Settings → Redeploy
   - Or trigger a new deployment by pushing to GitHub

4. **Verify Service is Running:**
   - Check the service status indicator (green/yellow/red dot)
   - Should be green if running

---

## Expected Log Output (When Working)

When your API is working correctly, you should see in the Logs:

```
> hatod-api@1.0.0 server
> node server.js

HATOD API server listening on port 10000
```

Or whatever port Railway assigns.

---

## Need Help?

If you're still stuck:
1. Share the full error from Logs tab
2. Share a screenshot of your Settings → Root Directory
3. Share a screenshot of your Variables tab (hide sensitive values)


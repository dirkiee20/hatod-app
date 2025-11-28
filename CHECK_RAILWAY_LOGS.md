# How to Check Railway Logs to Debug Healthcheck Failure

## The Problem
Build succeeds ✅, but healthcheck fails ❌. This means the server isn't starting or is crashing.

## Step 1: Check Runtime Logs

1. **Go to Railway Dashboard**
   - Open https://railway.app
   - Click on your `hatod-app` service

2. **Open Logs Tab**
   - Click **"Logs"** in the left sidebar
   - This shows real-time server logs

3. **Look for these messages:**

   ✅ **Good signs:**
   ```
   [STARTUP] Initializing server on port 10000...
   ✅ HATOD API server listening on port 10000
   ✅ Database connection successful
   ```

   ❌ **Bad signs:**
   ```
   ❌ Failed to import modules: ...
   ❌ Uncaught Exception: ...
   ❌ Server error: ...
   Error: Cannot find module...
   ```

## Step 2: Common Issues to Check

### Issue 1: Missing Environment Variables

**Symptoms:** Logs show database connection errors or missing env vars

**Fix:**
- Go to **Variables** tab
- Ensure these are set:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_REFRESH_SECRET`
  - `NODE_ENV=production`

### Issue 2: Module Import Errors

**Symptoms:** Logs show "Cannot find module" or import errors

**Fix:**
- Check if all dependencies are in `package.json`
- Railway should install them automatically
- Check build logs to see if `npm i` succeeded

### Issue 3: Database Connection Failing

**Symptoms:** Logs show database connection errors

**Fix:**
- Verify `DATABASE_URL` is correct
- Check Supabase project is active (not paused)
- Ensure password is URL-encoded (`@` → `%40`)

### Issue 4: Port Already in Use

**Symptoms:** Logs show "EADDRINUSE" error

**Fix:**
- Railway sets `PORT` automatically
- Don't hardcode port numbers
- The code already uses `process.env.PORT` ✅

## Step 3: What to Share

If you're still stuck, share:

1. **Full logs from "Logs" tab** (last 50-100 lines)
2. **Screenshot of Variables tab** (hide sensitive values)
3. **Any error messages** you see

## Quick Test

After checking logs, you can also test manually:

1. **Get your Railway URL** (from Settings → Domains)
2. **Test in browser:**
   ```
   https://hatod-app-production.up.railway.app/health
   ```
3. **Should return:**
   ```json
   {"status":"ok","timestamp":"..."}
   ```

## Expected Log Output

When working correctly, you should see:

```
[STARTUP] Initializing server on port 10000...
✅ HATOD API server listening on port 10000
✅ Database connection successful
```

If you see this, the server is running and healthcheck should pass! 🎉


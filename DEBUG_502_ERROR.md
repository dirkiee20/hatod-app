# Debugging 502 Bad Gateway Error

## The Problem
- ✅ `/health` route exists in your code
- ❌ Getting 502 errors means server isn't running or crashed

## Step 1: Check Railway Logs

1. **Go to Railway Dashboard**
   - Open https://railway.app
   - Click on your `hatod-app` service

2. **Open Logs Tab**
   - Click **"Logs"** in the left sidebar
   - Scroll to see the most recent logs

3. **Look for these messages:**

   ✅ **Good (Server Running):**
   ```
   [STARTUP] Initializing server on port 10000...
   ✅ HATOD API server listening on port 10000
   ✅ Database connection successful
   ```

   ❌ **Bad (Server Crashed):**
   ```
   ❌ Failed to start server: ...
   ❌ Uncaught Exception: ...
   Error: Cannot find module...
   Error: Database connection failed...
   ```

## Step 2: Common Causes & Fixes

### Cause 1: Server Crashed on Startup

**Symptoms:** Logs show error and then nothing

**Check:**
- Look for error messages in logs
- Common errors:
  - Missing environment variables
  - Database connection failed
  - Module import errors

**Fix:**
- Share the error from logs
- Verify all environment variables are set

### Cause 2: Server Never Started

**Symptoms:** No logs at all, or build succeeded but no server logs

**Check:**
- Verify `startCommand` in `railway.toml` is correct
- Should be: `npm run server`

**Fix:**
- Check Railway Settings → Deploy tab
- Verify start command matches `railway.toml`

### Cause 3: Database Connection Blocking Startup

**Symptoms:** Logs show database connection errors

**Check:**
- Railway Variables tab → Verify `DATABASE_URL` is set
- Check if Supabase project is active

**Fix:**
- The code should handle DB errors gracefully now
- But if it's crashing, check the logs for the exact error

### Cause 4: Port Binding Issue

**Symptoms:** Logs show "EADDRINUSE" or port errors

**Fix:**
- Railway sets `PORT` automatically
- Code already uses `process.env.PORT` ✅
- Should not be an issue

## Step 3: What to Share

If you're still stuck, share:

1. **Last 50-100 lines from Railway Logs tab**
2. **Any error messages** you see
3. **Screenshot of Variables tab** (hide sensitive values like passwords)

## Quick Test

After checking logs, try:

1. **Wait 30-60 seconds** (service might be starting)
2. **Test again:**
   ```
   https://hatod-app-production.up.railway.app/health
   ```
3. **Check if service is running:**
   - Railway Dashboard → Your service
   - Look for green/yellow/red status indicator
   - Should be green if running

## Expected Log Output

When working correctly, you should see:

```
[STARTUP] Initializing server on port 10000...
✅ HATOD API server listening on port 10000
✅ Database connection successful
```

If you see this, the server is running and `/health` should work!

## If Server Keeps Crashing

1. **Check for missing dependencies**
   - All packages in `package.json` should be installed
   - We already added `multer` ✅

2. **Check for syntax errors**
   - Railway build should catch these
   - But runtime errors might not show until logs

3. **Verify environment variables**
   - All required vars should be set
   - No typos in variable names

---

**Next Step:** Check Railway Logs tab and share what you see! 🔍



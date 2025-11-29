# Debugging 502 Error on Railway

## Current Issue

Getting 502 "Application failed to respond" when accessing:
- `https://hatod-app-production.up.railway.app/health`
- `https://hatod-app-production.up.railway.app/api/test`

This means Railway can't reach your application.

## Steps to Debug

### Step 1: Check Railway Logs

1. Go to **Railway Dashboard** → Your service
2. Click **Logs** tab
3. Look for:
   - ❌ Error messages
   - ❌ "Failed to start" messages
   - ❌ Database connection errors
   - ✅ "HATOD API server listening on port..." (should see this)
   - ✅ "Database connection successful" (should see this)

**Share the logs here** - especially any errors or the last 20-30 lines.

### Step 2: Check Deployment Status

1. Go to **Railway Dashboard** → Your service
2. Click **Deployments** tab
3. Check the latest deployment:
   - Status: Active / Failed / Building?
   - When did it deploy?
   - Any error messages?

### Step 3: Verify Environment Variables

1. Go to **Railway Dashboard** → Your service
2. Click **Variables** tab
3. Verify these are set:
   - ✅ `DATABASE_URL` - Should be your Supabase connection string
   - ✅ `JWT_SECRET` - Should be set
   - ✅ `JWT_REFRESH_SECRET` - Should be set
   - ✅ `NODE_ENV` - Should be `production`
   - ⚠️ `PORT` - Railway sets this automatically (don't override)

### Step 4: Check Build Logs

1. Go to **Railway Dashboard** → Your service
2. Click **Deployments** tab
3. Click on the latest deployment
4. Check the **Build** phase:
   - Did `npm install` complete?
   - Any errors during build?
   - Did it detect Node.js correctly?

## Common Causes of 502 Errors

### 1. Server Not Starting
- **Symptom**: No "server listening" message in logs
- **Cause**: Application crash on startup
- **Fix**: Check logs for startup errors

### 2. Wrong Port Binding
- **Symptom**: Server starts but Railway can't connect
- **Cause**: Server not binding to `0.0.0.0` or wrong port
- **Fix**: Already configured in `server.js` (should be OK)

### 3. Database Connection Failing
- **Symptom**: Server crashes when trying to connect to DB
- **Cause**: Wrong `DATABASE_URL` or database unavailable
- **Fix**: Verify `DATABASE_URL` in Railway variables

### 4. Missing Dependencies
- **Symptom**: "Cannot find module" errors
- **Cause**: Dependencies not installed
- **Fix**: Check if `npm install` completed in build logs

### 5. Application Crash
- **Symptom**: Server starts then immediately crashes
- **Cause**: Unhandled error or exception
- **Fix**: Check logs for error stack traces

## What to Share

Please share:
1. **Last 30-50 lines of Railway Logs** (from the Logs tab)
2. **Deployment status** (Active/Failed/Building)
3. **Any error messages** from the Deployments tab
4. **Build logs** if available

This will help identify the exact issue.

## Quick Test

While debugging, you can also check if the server is running locally:

```powershell
# Test local server (if running)
Invoke-RestMethod -Uri "http://localhost:4000/health"
```

If local works but Railway doesn't, it's a deployment/configuration issue.



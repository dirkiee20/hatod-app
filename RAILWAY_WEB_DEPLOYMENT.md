# Deploy HATOD Backend to Railway (Web Dashboard Method)

This guide uses Railway's web dashboard - no CLI installation needed!

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Click **"Start a New Project"** or **"Login"**
3. Sign up with GitHub (recommended) or email

## Step 2: Create New Project

1. In Railway dashboard, click **"New Project"**
2. Choose **"Deploy from GitHub repo"** (recommended)
   - OR choose **"Empty Project"** if you want to deploy manually

### Option A: Deploy from GitHub (Recommended)

1. **Connect your GitHub account** (if not already connected)
2. **Select your repository** (hatod)
3. **Select the branch** (usually `main` or `master`)
4. Railway will automatically detect it's a Node.js project

### Option B: Deploy from Local Files

1. Choose **"Empty Project"**
2. Click **"Add Service"** → **"GitHub Repo"**
3. Connect your repository

## Step 3: Configure the Service

1. Railway should auto-detect your `api` folder
2. If not, go to **Settings** → **Root Directory** → Set to `api`
3. Railway will automatically:
   - Detect Node.js
   - Run `npm install`
   - Start with `npm start` (or check your `package.json` scripts)

## Step 4: Set Environment Variables

In Railway dashboard → Your Service → **Variables** tab:

Add these environment variables:

```
DATABASE_URL=postgresql://postgres.sjxzsjqjpuebtxxskdza:hatod%402025@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

```
JWT_SECRET=<generate-a-secure-random-string-64-chars>
```

```
JWT_REFRESH_SECRET=<generate-another-secure-random-string-64-chars>
```

```
NODE_ENV=production
```

```
CORS_ORIGIN=<optional-if-you-have-web-frontend>
```

### Generate Secure JWT Secrets

You can generate secrets using:

**PowerShell:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Or use an online generator:**
- https://randomkeygen.com/
- Use "CodeIgniter Encryption Keys" - copy a 64 character key

## Step 5: Deploy

1. Railway will automatically deploy when you:
   - Push to your GitHub repo (if connected)
   - Or click **"Deploy"** button

2. Wait for deployment to complete (1-2 minutes)

3. Railway will show you a URL like:
   ```
   https://hatod-api-production.up.railway.app
   ```

## Step 6: Get Your API URL

1. In Railway dashboard → Your Service
2. Click on **"Settings"** tab
3. Scroll to **"Domains"** section
4. Copy your Railway-generated domain (e.g., `hatod-api-production.up.railway.app`)

Your API will be available at:
```
https://hatod-api-production.up.railway.app/api
```

## Step 7: Test Your Deployment

1. **Health Check:**
   ```
   https://your-api.railway.app/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test Endpoint:**
   ```
   https://your-api.railway.app/api/test
   ```
   Should return: `{"test":"ok"}`

## Step 8: Update Your Android App

In your Android app configuration, update the API base URL:

```kotlin
// Example
const val API_BASE_URL = "https://hatod-api-production.up.railway.app/api"
```

## Custom Domain (Optional)

1. In Railway → Settings → Domains
2. Click **"Custom Domain"**
3. Enter your domain (e.g., `api.hatod.com`)
4. Update DNS records as instructed
5. Railway will provision SSL automatically

## View Logs

1. In Railway dashboard → Your Service
2. Click **"Deployments"** tab
3. Click on a deployment to see logs
4. Or use **"Logs"** tab for real-time logs

## Troubleshooting

### Deployment Fails

1. Check **Logs** tab for errors
2. Verify environment variables are set correctly
3. Check that `DATABASE_URL` is correct
4. Ensure Supabase database is active

### API Not Responding

1. Check Railway logs
2. Verify PORT is set (Railway sets this automatically)
3. Test database connection
4. Check environment variables

### Database Connection Issues

1. Verify `DATABASE_URL` format is correct
2. Check Supabase project is active
3. Ensure password is URL-encoded (`@` → `%40`)

## Alternative: Manual CLI Installation (If Web Method Doesn't Work)

If you want to try CLI again:

1. **Download Railway CLI directly:**
   - Go to https://github.com/railwayapp/cli/releases
   - Download the Windows executable
   - Add to PATH

2. **Or use npx (no global install):**
   ```bash
   npx @railway/cli login
   npx @railway/cli init
   npx @railway/cli up
   ```

## Cost

- **Free Tier**: $5 credit/month (usually enough for small apps)
- **Hobby Plan**: $5/month for more resources
- **Pro Plan**: $20/month for production apps

## Next Steps

1. ✅ Backend deployed to Railway
2. ✅ Test API endpoints
3. ✅ Update Android app with Railway URL
4. ✅ Test from Android app
5. ✅ Deploy Android app to Play Store

Your backend is now live and ready for your Android app! 🚀


# Deploy HATOD Backend to Render (Alternative to Railway)

Render is another excellent platform - simple web dashboard, no CLI needed!

## Step 1: Create Render Account

1. Go to https://render.com
2. Click **"Get Started for Free"**
3. Sign up with GitHub (recommended) or email

## Step 2: Create New Web Service

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Choose **"Build and deploy from a Git repository"**
3. **Connect your GitHub account** (if not already)
4. **Select your repository** (hatod)
5. **Select branch** (usually `main` or `master`)

## Step 3: Configure Service

Fill in the form:

- **Name**: `hatod-api` (or any name you prefer)
- **Region**: Choose closest to your users (e.g., `Singapore` for Asia)
- **Branch**: `main` (or your default branch)
- **Root Directory**: `api` (important!)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

## Step 4: Set Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://postgres.sjxzsjqjpuebtxxskdza:hatod%402025@aws-1-ap-south-1.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | `<generate-64-char-random-string>` |
| `JWT_REFRESH_SECRET` | `<generate-another-64-char-random-string>` |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render sets this automatically, but you can specify) |

### Generate JWT Secrets

**PowerShell:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

## Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repo
   - Install dependencies
   - Start your server
3. Wait 2-3 minutes for first deployment

## Step 6: Get Your API URL

1. After deployment, Render shows your URL:
   ```
   https://hatod-api.onrender.com
   ```

2. Your API endpoints will be:
   ```
   https://hatod-api.onrender.com/api
   ```

## Step 7: Test Deployment

1. **Health Check:**
   ```
   https://hatod-api.onrender.com/health
   ```

2. **Test Endpoint:**
   ```
   https://hatod-api.onrender.com/api/test
   ```

## Custom Domain (Optional)

1. In Render → Settings → Custom Domain
2. Enter your domain (e.g., `api.hatod.com`)
3. Update DNS as instructed
4. SSL is automatic

## Auto-Deploy

Render automatically deploys when you push to your GitHub repo!

## Cost

- **Free Tier**: 
  - Services spin down after 15 minutes of inactivity
  - Spins up automatically on first request (may take 30-60 seconds)
  - Good for development/testing
  
- **Starter Plan**: $7/month
  - Always-on service
  - No spin-down delays
  - Better for production

## Render vs Railway

| Feature | Render | Railway |
|---------|--------|---------|
| Free Tier | ✅ (with spin-down) | ✅ ($5 credit) |
| Always-On Free | ❌ | ✅ |
| Setup Difficulty | ⭐ Easy | ⭐ Easy |
| Auto-Deploy | ✅ | ✅ |
| Custom Domain | ✅ Free | ✅ Free |
| SSL | ✅ Auto | ✅ Auto |

## Troubleshooting

### Service Keeps Spinning Down

- Upgrade to Starter plan ($7/month)
- Or use Railway (free tier doesn't spin down)

### Build Fails

1. Check **Logs** tab
2. Verify `Root Directory` is set to `api`
3. Check environment variables

### Database Connection Issues

1. Verify `DATABASE_URL` is correct
2. Check Supabase is active
3. Ensure password is URL-encoded

## Next Steps

1. ✅ Backend deployed to Render
2. ✅ Test API endpoints
3. ✅ Update Android app with Render URL
4. ✅ Test from Android app

Your backend is now live! 🚀


# Deploying HATOD Backend to Railway

This guide will help you deploy your HATOD backend API to Railway, which is perfect for hosting your REST API that your Android app will connect to.

## Why Railway for Mobile App Backend?

✅ **Perfect for REST APIs** - Railway hosts your Node.js/Express API  
✅ **Mobile apps don't need CORS** - Android/iOS apps can call any API  
✅ **Automatic HTTPS** - Railway provides SSL certificates  
✅ **Easy environment variables** - Simple configuration  
✅ **Free tier available** - $5 credit/month  
✅ **Auto-deployments** - Deploy from Git automatically  

## Architecture

```
📱 Android App (Play Store)
    ↓ HTTP/HTTPS requests
🚂 Railway Backend API (your-api.railway.app)
    ↓ PostgreSQL connection
🗄️ Supabase Database
```

## Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

## Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

## Step 3: Initialize Railway Project

```bash
cd api
railway init
```

Choose:
- **Create new project** (or link to existing)
- **Project name**: hatod-api (or your preferred name)

## Step 4: Deploy Your Backend

```bash
railway up
```

This will:
1. Build your application
2. Deploy it to Railway
3. Give you a URL like: `https://hatod-api-production.up.railway.app`

## Step 5: Set Environment Variables

In Railway dashboard or via CLI:

```bash
# Set database connection (use your Supabase pooler URL)
railway variables set DATABASE_URL="postgresql://postgres.sjxzsjqjpuebtxxskdza:hatod%402025@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# Generate secure JWT secrets (use a random string generator)
railway variables set JWT_SECRET="your-super-secure-random-string-min-32-chars"
railway variables set JWT_REFRESH_SECRET="another-super-secure-random-string-min-32-chars"

# Set environment
railway variables set NODE_ENV="production"

# CORS (optional - for web frontend if you have one)
railway variables set CORS_ORIGIN="https://your-web-frontend.com"

# Port (Railway sets this automatically, but you can override)
# railway variables set PORT="4000"
```

### Generate Secure JWT Secrets

You can generate secure secrets using:

**PowerShell:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 6: Verify Deployment

1. Check Railway dashboard for deployment status
2. Visit your API health endpoint:
   ```
   https://your-api.railway.app/health
   ```
3. Should return: `{"status":"ok","timestamp":"..."}`

## Step 7: Update Your Android App

In your Android app's configuration, update the API base URL:

```kotlin
// Example for Android (Kotlin)
const val API_BASE_URL = "https://your-api.railway.app/api"
```

Or in your Capacitor config (if using Capacitor):

```json
{
  "server": {
    "url": "https://your-api.railway.app"
  }
}
```

## Step 8: Test API Endpoints

Test your API from your Android app or using curl:

```bash
# Health check
curl https://your-api.railway.app/health

# Test endpoint
curl https://your-api.railway.app/api/test
```

## Important Notes for Mobile Apps

### CORS Configuration
- **Mobile apps don't need CORS** - Android/iOS apps are not restricted by browser CORS policies
- Your API is already configured to allow requests without origin (mobile apps)
- CORS only matters if you also have a web frontend

### API Base URL in Mobile App
Make sure your Android app uses the Railway URL:
- Development: `http://localhost:4000/api` (for testing)
- Production: `https://your-api.railway.app/api`

### SSL/HTTPS
- Railway automatically provides HTTPS
- Always use `https://` in production
- Your Android app must use HTTPS for production API calls

## Railway Dashboard Features

1. **Logs**: View real-time application logs
2. **Metrics**: Monitor CPU, memory, network usage
3. **Deployments**: See deployment history
4. **Variables**: Manage environment variables
5. **Settings**: Configure domain, scaling, etc.

## Custom Domain (Optional)

1. In Railway dashboard → Settings → Domains
2. Add your custom domain (e.g., `api.hatod.com`)
3. Update DNS records as instructed
4. Railway will provision SSL automatically

## Monitoring

- **Logs**: `railway logs` or view in dashboard
- **Metrics**: Dashboard → Metrics tab
- **Alerts**: Set up in Railway dashboard

## Troubleshooting

### API Not Responding
1. Check Railway logs: `railway logs`
2. Verify environment variables are set
3. Check database connection (Supabase)
4. Verify PORT is set correctly

### Database Connection Issues
1. Verify `DATABASE_URL` is correct
2. Check Supabase project is active
3. Ensure password is URL-encoded (`@` → `%40`)
4. Test connection: `railway run node -e "require('./config/db.js').pool.query('SELECT 1').then(() => console.log('Connected!'))"`

### Mobile App Can't Connect
1. Verify API URL is correct (HTTPS)
2. Check Android manifest allows internet permission
3. Check Railway logs for incoming requests
4. Test API with Postman or curl first

## Cost

- **Free Tier**: $5 credit/month (usually enough for small apps)
- **Paid Plans**: Start at $5/month for more resources
- **Database**: Supabase (separate, free tier available)

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Test API endpoints
3. ✅ Update Android app with Railway API URL
4. ✅ Test from Android app
5. ✅ Deploy Android app to Play Store

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check logs: `railway logs` or dashboard

Your backend is now ready to serve your Android app! 🚀


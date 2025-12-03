# Deploy Download Page to Railway

This guide shows you how to deploy **only** the `download.html` page to Railway as a separate service.

## Option 1: Railway Web Dashboard (Recommended)

### Step 1: Create New Service in Railway

1. Go to [Railway Dashboard](https://railway.app)
2. Open your existing HATOD project (or create a new one)
3. Click **"New Service"** → **"GitHub Repo"**
4. Select your repository and branch

### Step 2: Configure the Service

1. In Railway dashboard → Your new service → **Settings**
2. Set **Root Directory** to: `.` (root of repository)
3. Railway will detect Node.js automatically

### Step 3: Override Build Settings

1. Go to **Settings** → **Deploy**
2. Set **Start Command** to: `node static-server.js`
3. Set **Healthcheck Path** to: `/health`

### Step 4: Deploy

Railway will automatically:
- Install dependencies from root `package.json` (Express is already there)
- Start the server with `node static-server.js`
- Give you a URL like: `https://hatod-download-production.up.railway.app`

**Note:** Since Express is already in your root `package.json`, you don't need `static-package.json`. Railway will use the root `package.json` automatically.

### Step 5: Get Your URL

1. In Railway dashboard → Your service
2. Click **Settings** → **Domains**
3. Copy your Railway domain

Your download page will be available at:
```
https://your-service.railway.app/
```

## Option 2: Railway CLI

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login

```bash
railway login
```

### Step 3: Initialize in Root Directory

```bash
# Make sure you're in the project root
cd C:\Users\Administrator\Desktop\hatod\hatod

# Create new service
railway init
```

When prompted:
- **Create new project** or **Link to existing project**
- **Service name**: `hatod-download` (or your preferred name)

### Step 4: Deploy

```bash
railway up
```

Railway will:
- Detect `static-server.js`
- Install dependencies
- Deploy the service

### Step 5: Set Start Command (if needed)

```bash
railway variables set START_COMMAND="node static-server.js"
```

Or set it in Railway dashboard → Settings → Deploy

## Option 3: Manual File Upload (Alternative)

If you want to deploy without Git:

1. Create a new Railway project
2. Use Railway's file upload feature
3. Upload:
   - `download.html`
   - `static-server.js`
   - `static-package.json`
   - `css/` folder
   - `public/` folder
4. Set start command: `node static-server.js`

## Verify Deployment

1. Visit your Railway URL: `https://your-service.railway.app/`
2. You should see the download page
3. Check health endpoint: `https://your-service.railway.app/health`
   - Should return: `{"status":"ok","service":"download-page"}`

## Update Download Links

After deployment, you may want to update the APK download link in `download.html`:

1. If your APK is hosted elsewhere, update line 234:
   ```html
   <a href="https://your-cdn.com/app-debug.apk" class="download-btn" download>
   ```

2. Or host the APK on the same Railway service:
   - Upload APK to a `downloads/` folder
   - Update link to: `href="downloads/app-debug.apk"`

## Custom Domain (Optional)

1. In Railway dashboard → Settings → Domains
2. Click **"Custom Domain"**
3. Enter your domain (e.g., `download.hatod.com`)
4. Update DNS records as instructed
5. Railway will provision SSL automatically

## File Structure

The static server serves:
- `/` → `download.html`
- `/css/*` → CSS files
- `/public/*` → Logos and assets
- `/pages/*` → For the "Use Web App" link

## Troubleshooting

### Page Not Loading

1. Check Railway logs: Dashboard → Logs tab
2. Verify `static-server.js` is in root directory
3. Check that Express is installed (should auto-install)

### CSS/Images Not Loading

1. Verify paths in `download.html` are correct
2. Check that `css/` and `public/` folders are included
3. Check Railway logs for 404 errors

### Port Issues

- Railway automatically sets `PORT` environment variable
- The server uses `process.env.PORT || 3000`
- No manual configuration needed

## Cost

- **Free Tier**: $5 credit/month (usually enough for static sites)
- Static sites use minimal resources

## Next Steps

1. ✅ Download page deployed
2. ✅ Test the page on mobile devices
3. ✅ Update APK download link if needed
4. ✅ Share the URL with customers!

Your download page is now live! 🚀


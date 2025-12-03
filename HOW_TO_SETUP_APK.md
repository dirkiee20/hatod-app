# How to Set Up APK for Download Page (Option B)

This guide shows you how to copy your built APK to the download-page folder so users can download it.

## Step-by-Step Instructions

### Step 1: Build Your Android APK

From the project root, build your APK:

```bash
npm run apk:build
```

This will create the APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 2: Copy APK to Download Page Folder

#### Option A: Use the Automated Script (Recommended)

**Windows:**
```bash
scripts\build-and-copy-apk.bat
```

This script will:
1. Build the APK (if not already built)
2. Copy it to `download-page/apk/hatod.apk`
3. Rename it to `hatod.apk`

**Linux/Mac:**
```bash
cd download-page
chmod +x copy-apk.sh
./copy-apk.sh
```

#### Option B: Manual Copy

**Windows:**
```bash
copy android\app\build\outputs\apk\debug\app-debug.apk download-page\apk\hatod.apk
```

**Linux/Mac:**
```bash
cp android/app/build/outputs/apk/debug/app-debug.apk download-page/apk/hatod.apk
```

### Step 3: Commit the APK to Git

The APK file needs to be in your Git repository so Railway can access it:

```bash
git add download-page/apk/hatod.apk
git commit -m "Add APK for download page"
git push
```

**Note:** APK files are typically large (10-50MB). Make sure your Git repository can handle this. If it's too large, consider using Git LFS or hosting the APK separately.

### Step 4: Deploy to Railway

1. Go to Railway dashboard
2. Set **Root Directory** to: `download-page`
3. Deploy

The download page will now serve the APK at `/apk/hatod.apk`

## Updating the APK

When you build a new version of your app:

1. Build the new APK: `npm run apk:build`
2. Copy it: Use the script or manual copy (see Step 2)
3. Commit and push: `git add download-page/apk/hatod.apk && git commit -m "Update APK" && git push`
4. Railway will auto-deploy the new version

## File Structure

After setup, your `download-page` folder should look like:

```
download-page/
├── apk/
│   └── hatod.apk          ← Your APK file here
├── css/
├── public/
├── download.html
├── static-server.js
├── package.json
└── railway.toml
```

## Troubleshooting

### APK Not Found Error
- Make sure you've built the APK first: `npm run apk:build`
- Check the file exists: `android/app/build/outputs/apk/debug/app-debug.apk`
- Verify the copy was successful: Check `download-page/apk/hatod.apk` exists

### APK Not Downloading
- Check the file path in `download.html`: Should be `/apk/hatod.apk`
- Verify the static server is serving the `/apk` route
- Check Railway logs for errors

### File Too Large for Git
If your APK is too large for Git:
- Consider using Git LFS: `git lfs track "*.apk"`
- Or host the APK on a CDN/storage service and update the link in `download.html`

## Alternative: Host APK Separately

If you prefer not to commit the APK to Git, you can:

1. Upload APK to a storage service (AWS S3, Google Cloud Storage, etc.)
2. Get a public URL
3. Update the link in `download-page/download.html`:
   ```html
   <a href="https://your-storage-url.com/hatod.apk" class="download-btn" download="hatod.apk">
   ```

This way, the APK doesn't need to be in your Git repository.


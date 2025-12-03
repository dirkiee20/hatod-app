# HATOD Download Page

This is a standalone service that serves only the download page for the HATOD Android app.

## Railway Deployment

1. **Root Directory**: Set to `download-page` in Railway settings
2. **Start Command**: `node static-server.js` (auto-detected)
3. **Healthcheck Path**: `/health`

## Files

- `download.html` - The download page
- `static-server.js` - Express server that serves the page
- `css/` - Stylesheets needed for the page
- `public/` - Logos and assets needed for the page
- `package.json` - Dependencies (Express)

## Setting Up the APK (Option B)

After building your Android APK, copy it to the `download-page/apk/` folder:

### Windows:
```bash
# From project root:
scripts\build-and-copy-apk.bat

# Or manually copy after building:
copy android\app\build\outputs\apk\debug\app-debug.apk download-page\apk\hatod.apk
```

### Linux/Mac:
```bash
# From project root:
./download-page/copy-apk.sh

# Or manually copy after building:
cp android/app/build/outputs/apk/debug/app-debug.apk download-page/apk/hatod.apk
```

The APK file (`hatod.apk`) should be in the `download-page/apk/` folder before deploying to Railway.

## Local Testing

```bash
cd download-page
npm install
node static-server.js
```

Visit: http://localhost:3000


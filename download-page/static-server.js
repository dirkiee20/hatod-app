const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Main route - serve download.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'download.html'));
});

// Serve CSS files (needed for download.html)
app.use('/css', express.static(path.join(__dirname, 'css')));

// Serve public folder (logos, etc. - needed for download.html)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve APK file with correct headers
app.get('/apk/hatod.apk', (req, res) => {
    const apkPath = path.join(__dirname, 'apk', 'hatod.apk');
    
    // Check if file exists
    if (!fs.existsSync(apkPath)) {
        console.error('APK file not found at:', apkPath);
        return res.status(404).send('APK file not found');
    }
    
    // Get file stats
    const stats = fs.statSync(apkPath);
    const fileSize = stats.size;
    
    // Validate file size (APK files should be at least 1MB, typically 5-50MB)
    if (fileSize < 1024 * 1024) {
        console.error('APK file seems too small:', fileSize, 'bytes');
        return res.status(500).send('APK file appears to be corrupted or incomplete');
    }
    
    // Validate it's actually an APK file (APK files start with ZIP signature: PK)
    const fileBuffer = fs.readFileSync(apkPath, { start: 0, end: 3 });
    const isZipFile = fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B; // "PK" signature
    
    if (!isZipFile) {
        console.error('File does not appear to be a valid APK (missing ZIP signature)');
        return res.status(500).send('APK file appears to be corrupted or invalid');
    }
    
    // Set correct headers for APK files
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="hatod.apk"');
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Log the request
    console.log(`Serving APK file: ${fileSize} bytes to ${req.ip}`);
    
    // Stream the file to ensure it's sent completely
    const fileStream = fs.createReadStream(apkPath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
        console.error('Error streaming APK file:', err);
        if (!res.headersSent) {
            res.status(500).send('Error serving APK file');
        }
    });
});

// Serve other APK files from local apk folder (if any)
app.use('/apk', express.static(path.join(__dirname, 'apk'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.apk')) {
            res.setHeader('Content-Type', 'application/vnd.android.package-archive');
            res.setHeader('Content-Disposition', 'attachment');
        }
    }
}));

// Serve download.html directly if accessed via filename
app.get('/download.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'download.html'));
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'download-page' });
});

// Block all other routes - redirect to download page
app.get('*', (req, res) => {
    // Allow CSS, public assets, and APK files
    if (req.path.startsWith('/css/') || req.path.startsWith('/public/') || req.path.startsWith('/apk/')) {
        return res.status(404).send('Not found');
    }
    // Redirect everything else to download page
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Download page server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
    console.log(`Serving download.html only`);
});


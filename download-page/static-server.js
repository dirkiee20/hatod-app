const express = require('express');
const path = require('path');

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

// Serve APK file from local apk folder
app.use('/apk', express.static(path.join(__dirname, 'apk')));

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
    // Allow CSS and public assets
    if (req.path.startsWith('/css/') || req.path.startsWith('/public/')) {
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


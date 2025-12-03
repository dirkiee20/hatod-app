const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from root directory
app.use(express.static(__dirname));

// Serve CSS files
app.use('/css', express.static(path.join(__dirname, 'css')));

// Serve public folder (logos, etc.)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve pages folder (for the "Use Web App" link)
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// Main route - serve download.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'download.html'));
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'download-page' });
});

app.listen(PORT, () => {
    console.log(`Download page server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});


// HATOD API Configuration
// This file is used to configure the API base URL for all pages

// Detect if running in Capacitor (Android/iOS app)
const isCapacitor = window.Capacitor !== undefined;

// API Base URL Configuration
// For local development: 'http://localhost:4000/api'
// For production (Railway): 'https://hatod-app-production.up.railway.app/api'
const API_BASE_URL = isCapacitor 
    ? 'https://hatod-app-production.up.railway.app/api'  // Production API for mobile apps
    : (window.__HATOD_API_BASE_URL__ || 'http://localhost:4000/api');  // Allow override via window variable

// API Origin (base URL without /api)
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

// Export for use in other scripts
window.HATOD_CONFIG = {
    API_BASE_URL: API_BASE_URL,
    API_ORIGIN: API_ORIGIN,
    isCapacitor: isCapacitor
};

// For backward compatibility
window.API_BASE_URL = API_BASE_URL;
window.API_ORIGIN = API_ORIGIN;

console.log('[HATOD Config] API Base URL:', API_BASE_URL);
console.log('[HATOD Config] Running in Capacitor:', isCapacitor);



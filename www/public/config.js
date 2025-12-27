// HATOD API Configuration
// This file is used to configure the API base URL for all pages

// Detect if running in Capacitor (Android/iOS app)
const isCapacitor = window.Capacitor !== undefined;

// API Base URL Configuration
// For local development: 'http://localhost:4000/api'
// For production (Railway): 'https://hatod-app-production.up.railway.app/api'
const RAILWAY_API_URL = 'https://hatod-app-production.up.railway.app/api';
const LOCAL_API_URL = 'http://localhost:4000/api';

// Determine which API URL to use
// Use a function scope to avoid global const conflicts
(function() {
    let API_BASE_URL;
    if (isCapacitor) {
        // Mobile apps always use Railway
        API_BASE_URL = RAILWAY_API_URL;
    } else {
        // Web: Check if running on localhost or 127.0.0.1
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        // Use override if provided, otherwise use Local if on localhost, else Railway
        API_BASE_URL = window.__HATOD_API_BASE_URL__ || (isLocal ? LOCAL_API_URL : RAILWAY_API_URL);
    }
    
    // Set on window object for use in other scripts
    window.API_BASE_URL = API_BASE_URL;
    window.API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');
    
    // Logo URLs - Try multiple sources for reliability
    // Priority: 1) Supabase Storage (if configured), 2) Railway static files, 3) Relative path
    
    // Check if we can construct Supabase URL from environment (for future use)
    // For now, use Railway URL - if it fails, the browser will show broken image
    // You can upload logos to Supabase Storage and update these URLs
    const LOGO_URLS = {
        app_logo: `${window.API_ORIGIN}/public/logos/app_logo.png`,
        logo_192x192: `${window.API_ORIGIN}/public/logos/logo_192x192.png`
    };
    
    // Default avatar for users without profile pictures
    const DEFAULT_AVATAR_URL = `${window.API_ORIGIN}/public/default-avatar.svg`;
    
    // Alternative: Use Supabase Storage URLs (uncomment after uploading logos)
    // Replace 'your-project-id' with your actual Supabase project ID
    // const SUPABASE_STORAGE_BASE = 'https://your-project-id.supabase.co/storage/v1/object/public/images';
    // const LOGO_URLS = {
    //     app_logo: `${SUPABASE_STORAGE_BASE}/logos/app_logo.png`,
    //     logo_192x192: `${SUPABASE_STORAGE_BASE}/logos/logo_192x192.png`
    // };
    
    // Export for use in other scripts
    window.HATOD_CONFIG = {
        API_BASE_URL: API_BASE_URL,
        API_ORIGIN: window.API_ORIGIN,
        isCapacitor: isCapacitor,
        LOGO_URLS: LOGO_URLS,
        DEFAULT_AVATAR_URL: DEFAULT_AVATAR_URL
    };
    
    // Also set as a global constant for easy access
    window.DEFAULT_AVATAR_URL = DEFAULT_AVATAR_URL;
    
    console.log('[HATOD Config] API Base URL:', API_BASE_URL);
    console.log('[HATOD Config] Running in Capacitor:', isCapacitor);
    console.log('[HATOD Config] Logo URLs:', LOGO_URLS);
    
    // Automatically update logo images when DOM is ready
    (function() {
        function updateLogos() {
            // Update all logo images
            document.querySelectorAll('img[src*="public/logos/app_logo.png"]').forEach(img => {
                img.src = LOGO_URLS.app_logo;
            });
            
            document.querySelectorAll('img[src*="public/logos/logo_192x192.png"]').forEach(img => {
                img.src = LOGO_URLS.logo_192x192;
            });
            
            // Update favicon
            const favicon = document.querySelector('link[rel="icon"][href*="logo_192x192"]');
            if (favicon) {
                favicon.href = LOGO_URLS.logo_192x192;
            }
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateLogos);
        } else {
            updateLogos();
        }
    })();
})();

/**
 * Cache Manager Utility
 * Provides cache-first with background refresh strategy for better perceived performance
 */

class CacheManager {
    constructor() {
        this.CACHE_PREFIX = 'hatod_cache_';
        this.CACHE_VERSION = '1.0';
        this.DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default TTL
        this.STORAGE_TYPE = 'sessionStorage'; // Use sessionStorage (cleared on tab close)
    }

    /**
     * Get storage object (sessionStorage)
     */
    getStorage() {
        try {
            return window[this.STORAGE_TYPE];
        } catch (e) {
            console.warn('Storage not available:', e);
            return null;
        }
    }

    /**
     * Generate cache key
     */
    getCacheKey(key) {
        return `${this.CACHE_PREFIX}${this.CACHE_VERSION}_${key}`;
    }

    /**
     * Check if cache entry is valid (not expired)
     */
    isValid(cachedData) {
        if (!cachedData || !cachedData.timestamp) {
            return false;
        }
        const now = Date.now();
        const age = now - cachedData.timestamp;
        const ttl = cachedData.ttl || this.DEFAULT_TTL;
        return age < ttl;
    }

    /**
     * Get cached data
     */
    get(key) {
        const storage = this.getStorage();
        if (!storage) return null;

        try {
            const cacheKey = this.getCacheKey(key);
            const cached = storage.getItem(cacheKey);
            if (!cached) return null;

            const cachedData = JSON.parse(cached);
            if (this.isValid(cachedData)) {
                return cachedData.data;
            } else {
                // Remove expired cache
                storage.removeItem(cacheKey);
                return null;
            }
        } catch (e) {
            console.warn('Error reading cache:', e);
            return null;
        }
    }

    /**
     * Set cached data
     */
    set(key, data, ttl = null) {
        const storage = this.getStorage();
        if (!storage) return false;

        try {
            const cacheKey = this.getCacheKey(key);
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                ttl: ttl || this.DEFAULT_TTL
            };
            storage.setItem(cacheKey, JSON.stringify(cacheData));
            return true;
        } catch (e) {
            console.warn('Error writing cache:', e);
            // If quota exceeded, clear old caches
            this.clearExpired();
            return false;
        }
    }

    /**
     * Remove cached data
     */
    remove(key) {
        const storage = this.getStorage();
        if (!storage) return false;

        try {
            const cacheKey = this.getCacheKey(key);
            storage.removeItem(cacheKey);
            return true;
        } catch (e) {
            console.warn('Error removing cache:', e);
            return false;
        }
    }

    /**
     * Clear all expired caches
     */
    clearExpired() {
        const storage = this.getStorage();
        if (!storage) return;

        try {
            const keys = Object.keys(storage);
            keys.forEach(key => {
                if (key.startsWith(this.CACHE_PREFIX)) {
                    const cached = storage.getItem(key);
                    if (cached) {
                        try {
                            const cachedData = JSON.parse(cached);
                            if (!this.isValid(cachedData)) {
                                storage.removeItem(key);
                            }
                        } catch (e) {
                            // Invalid JSON, remove it
                            storage.removeItem(key);
                        }
                    }
                }
            });
        } catch (e) {
            console.warn('Error clearing expired cache:', e);
        }
    }

    /**
     * Clear all caches
     */
    clearAll() {
        const storage = this.getStorage();
        if (!storage) return;

        try {
            const keys = Object.keys(storage);
            keys.forEach(key => {
                if (key.startsWith(this.CACHE_PREFIX)) {
                    storage.removeItem(key);
                }
            });
        } catch (e) {
            console.warn('Error clearing all cache:', e);
        }
    }

    /**
     * Clear cache by pattern (e.g., 'cart', 'orders')
     */
    clearByPattern(pattern) {
        const storage = this.getStorage();
        if (!storage) return;

        try {
            const keys = Object.keys(storage);
            keys.forEach(key => {
                if (key.startsWith(this.CACHE_PREFIX) && key.includes(pattern)) {
                    storage.removeItem(key);
                }
            });
        } catch (e) {
            console.warn('Error clearing cache by pattern:', e);
        }
    }

    /**
     * Fetch with cache-first strategy
     * Returns: { data, fromCache, cached }
     */
    async fetchWithCache(key, fetchFn, options = {}) {
        const {
            ttl = null,
            forceRefresh = false,
            onCached = null,
            onFresh = null
        } = options;

        // Try to get from cache first (unless force refresh)
        if (!forceRefresh) {
            const cached = this.get(key);
            if (cached !== null) {
                // Return cached data immediately
                if (onCached) {
                    onCached(cached);
                }
                
                // Refresh in background
                this.refreshInBackground(key, fetchFn, ttl, onFresh);
                
                return {
                    data: cached,
                    fromCache: true,
                    cached: true
                };
            }
        }

        // No cache or force refresh - fetch fresh data
        try {
            const freshData = await fetchFn();
            this.set(key, freshData, ttl);
            
            if (onFresh) {
                onFresh(freshData);
            }
            
            return {
                data: freshData,
                fromCache: false,
                cached: false
            };
        } catch (error) {
            // If fetch fails, try to return stale cache as fallback
            const staleCache = this.get(key);
            if (staleCache !== null) {
                console.warn('Fetch failed, using stale cache:', error);
                return {
                    data: staleCache,
                    fromCache: true,
                    cached: true,
                    error: error
                };
            }
            throw error;
        }
    }

    /**
     * Refresh cache in background
     */
    async refreshInBackground(key, fetchFn, ttl = null, onFresh = null) {
        try {
            const freshData = await fetchFn();
            this.set(key, freshData, ttl);
            
            if (onFresh) {
                onFresh(freshData);
            }
        } catch (error) {
            console.warn('Background refresh failed:', error);
            // Don't throw - background refresh failures shouldn't break the app
        }
    }

    /**
     * Prefetch data (for smart prefetching)
     */
    async prefetch(key, fetchFn, ttl = null) {
        try {
            // Only prefetch if not already cached
            if (this.get(key) === null) {
                const data = await fetchFn();
                this.set(key, data, ttl);
                return true;
            }
            return false;
        } catch (error) {
            console.warn('Prefetch failed:', error);
            return false;
        }
    }
}

// Create global instance
window.CacheManager = new CacheManager();

// Helper function for common API fetch patterns
window.fetchWithCache = async function(cacheKey, url, options = {}) {
    const {
        headers = {},
        method = 'GET',
        body = null,
        ttl = null,
        forceRefresh = false,
        onCached = null,
        onFresh = null
    } = options;

    const fetchFn = async () => {
        const fetchOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (body) {
            fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result.data || result;
    };

    return await window.CacheManager.fetchWithCache(cacheKey, fetchFn, {
        ttl,
        forceRefresh,
        onCached,
        onFresh
    });
};

















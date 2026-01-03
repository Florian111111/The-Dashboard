/**
 * Application Configuration
 * API Base URL is determined based on environment
 */
export const config = {
    // Determine API base URL based on environment
    get API_BASE_URL() {
        // Check if we're in development (localhost)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        }
        
        // In production, use the same origin or configured API URL
        // You can set VITE_API_URL in your build environment
        if (import.meta.env?.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
        }
        
        // Default: use same origin (API should be on same domain or subdomain)
        // If API is on different domain, set VITE_API_URL environment variable
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        // If API is on api subdomain
        if (hostname.startsWith('www.')) {
            return `${protocol}//api.${hostname.substring(4)}`;
        }
        
        // Default: same origin
        return `${protocol}//${hostname}:3001`;
    },
    
    // Environment detection
    get isDevelopment() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    },
    
    get isProduction() {
        return !this.isDevelopment;
    }
};

// Export API_BASE_URL as default for convenience
export const API_BASE_URL = config.API_BASE_URL;


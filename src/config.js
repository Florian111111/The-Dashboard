/**
 * Application Configuration
 * API Base URL is determined based on environment
 */
export const config = {
    // Determine API base URL based on environment
    get API_BASE_URL() {
        // Check for runtime config (set by server or build)
        if (window.__API_BASE_URL__) {
            return window.__API_BASE_URL__;
        }

        // Check if we're in development (localhost)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        }

        // In production, use the same origin or configured API URL
        // You can set VITE_API_URL in your build environment
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
        }

        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;

        // Docker/Production: If accessed on port 3000, Python backend is on 3001
        // If behind reverse proxy (no port), try same origin with /api prefix first
        if (!port || port === '80' || port === '443') {
            // Behind reverse proxy - use same origin, API routes to Python backend
            // The reverse proxy should route /api/* to the Python backend
            return `${protocol}//${hostname}`;
        }

        // If accessed on port 3000, Python backend is likely on 3001
        if (port === '3000') {
            return `${protocol}//${hostname}:3001`;
        }

        // Default: same origin with port 3001
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


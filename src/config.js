/**
 * Application Configuration
 * API Base URL is determined based on environment
 * 
 * In production (Docker/Dokploy), all API requests go through Node.js server
 * which proxies Python backend requests internally.
 */
export const config = {
    // Determine API base URL based on environment
    get API_BASE_URL() {
        // Check for runtime config (set by server or build)
        if (window.__API_BASE_URL__) {
            return window.__API_BASE_URL__;
        }

        // In production, use the same origin or configured API URL
        // You can set VITE_API_URL in your build environment
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
        }

        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;

        // Development on localhost - can use Python backend directly
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // If on port 3000 (Node.js), use same origin (Node.js proxies to Python)
            if (port === '3000') {
                return `${protocol}//${hostname}:${port}`;
            }
            // Direct Python backend access for development
            return `${protocol}//${hostname}:3001`;
        }

        // Production: use relative URLs so requests always go to the same host that served the page.
        // This avoids proxy/routing issues where /api/map-layer/* or /api/vessels might return HTML.
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return '';
        }

        // Localhost with explicit port (e.g. dev server on different port)
        if (!port || port === '80' || port === '443') {
            return `${protocol}//${hostname}`;
        }
        return `${protocol}//${hostname}:${port}`;
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


/**
 * Intelligent caching utility for stock data
 * Different cache durations for different data types
 */

const CACHE_DURATIONS = {
	description: 24 * 60 * 60 * 1000,      // 24 hours - descriptions change rarely
	fundamentals: 2 * 60 * 60 * 1000,      // 2 hours - fundamentals change slowly
	analyst: 2 * 60 * 60 * 1000,           // 2 hours - analyst recommendations update periodically
	earnings: 2 * 60 * 60 * 1000,          // 2 hours - earnings data updates periodically
	dividends: 12 * 60 * 60 * 1000,        // 12 hours - dividends change rarely
	ownership: 12 * 60 * 60 * 1000,        // 12 hours - ownership data changes slowly
	'peer-comparison': 12 * 60 * 60 * 1000, // 12 hours - peer comparison data changes slowly
	news: 30 * 60 * 1000,                  // 30 minutes - news updates frequently
	sentiment: 1 * 60 * 60 * 1000,         // 1 hour - sentiment changes moderately
	chart: 5 * 60 * 1000,                  // 5 minutes - chart data updates frequently
	'ai-summary': 4 * 60 * 60 * 1000,     // 4 hours - AI summaries cached for 4 hours
	'market-summary': 4 * 60 * 60 * 1000, // 4 hours - Market summaries cached for 4 hours
	'stock-overview': 5 * 60 * 1000,      // 5 minutes - aggregated overview data (matches backend cache)
	'market-overview': 30 * 60 * 1000,    // 30 minutes - Market overview page data (indices, macro, currencies, commodities)
	'stock-analysis-page': 30 * 60 * 1000, // 30 minutes - Stock analysis page data
};

/**
 * Get cached data if available and still valid
 * @param {string} symbol - Stock symbol
 * @param {string} dataType - Type of data (description, fundamentals, etc.)
 * @returns {object|null} - Cached data or null if not available/expired
 */
export function getCachedData(symbol, dataType) {
	try {
		// Check if localStorage is available (may be blocked by browser privacy settings)
		if (typeof localStorage === 'undefined' || !localStorage) {
			return null;
		}
		
		const cacheKey = `stock_${symbol}_${dataType}`;
		const cached = localStorage.getItem(cacheKey);
		
		if (!cached) {
			return null;
		}
		
		const { data, timestamp } = JSON.parse(cached);
		const cacheDuration = CACHE_DURATIONS[dataType] || 60 * 60 * 1000; // Default 1 hour
		const now = Date.now();
		
		// Check if cache is still valid
		if (now - timestamp < cacheDuration) {
			console.log(`[Cache] Using cached ${dataType} for ${symbol} (age: ${Math.round((now - timestamp) / 1000 / 60)} minutes)`);
			return data;
		} else {
			// Cache expired, remove it
			try {
				localStorage.removeItem(cacheKey);
			} catch (e) {
				// Ignore errors when removing expired cache
			}
			console.log(`[Cache] Cache expired for ${dataType} (${symbol}), removing`);
			return null;
		}
	} catch (error) {
		// Silently handle localStorage errors (e.g., tracking prevention, quota exceeded)
		if (error.name === 'SecurityError' || error.name === 'QuotaExceededError') {
			return null;
		}
		console.error(`[Cache] Error reading cache for ${dataType} (${symbol}):`, error);
		return null;
	}
}

/**
 * Store data in cache
 * @param {string} symbol - Stock symbol
 * @param {string} dataType - Type of data
 * @param {object} data - Data to cache
 */
export function setCachedData(symbol, dataType, data) {
	try {
		// Check if localStorage is available (may be blocked by browser privacy settings)
		if (typeof localStorage === 'undefined' || !localStorage) {
			return;
		}
		
		const cacheKey = `stock_${symbol}_${dataType}`;
		const cacheEntry = {
			data: data,
			timestamp: Date.now()
		};
		localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
		console.log(`[Cache] Cached ${dataType} for ${symbol}`);
	} catch (error) {
		// Silently handle localStorage errors (e.g., tracking prevention, quota exceeded)
		if (error.name === 'SecurityError') {
			// Tracking prevention blocked access - silently fail
			return;
		}
		if (error.name === 'QuotaExceededError') {
			// If storage is full, try to clear old caches
			try {
				clearOldCaches();
				// Retry once
				localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
			} catch (retryError) {
				// Silently fail if retry also fails
			}
		} else {
			console.error(`[Cache] Error caching ${dataType} (${symbol}):`, error);
		}
	}
}

/**
 * Clear old cache entries to free up space
 */
function clearOldCaches() {
	try {
		const now = Date.now();
		const keysToRemove = [];
		
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith('stock_')) {
				try {
					const cached = JSON.parse(localStorage.getItem(key));
					if (cached && cached.timestamp) {
						// Remove entries older than 7 days
						if (now - cached.timestamp > 7 * 24 * 60 * 60 * 1000) {
							keysToRemove.push(key);
						}
					}
				} catch (e) {
					// Invalid cache entry, remove it
					keysToRemove.push(key);
				}
			}
		}
		
		keysToRemove.forEach(key => localStorage.removeItem(key));
		console.log(`[Cache] Cleared ${keysToRemove.length} old cache entries`);
	} catch (error) {
		console.error('[Cache] Error clearing old caches:', error);
	}
}

/**
 * Clear all cached data for a specific symbol
 * @param {string} symbol - Stock symbol
 */
export function clearSymbolCache(symbol) {
	try {
		const keysToRemove = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith(`stock_${symbol}_`)) {
				keysToRemove.push(key);
			}
		}
		keysToRemove.forEach(key => localStorage.removeItem(key));
		console.log(`[Cache] Cleared all cache for ${symbol}`);
	} catch (error) {
		console.error(`[Cache] Error clearing cache for ${symbol}:`, error);
	}
}

/**
 * Get data from aggregated stock-overview cache if available
 * This prevents duplicate API calls when multiple components need the same data
 * @param {string} symbol - Stock symbol
 * @param {string} dataType - Type of data to extract (fundamentals, dividends, earnings, etc.)
 * @returns {object|null} - Cached data or null if not available/expired
 */
export function getFromOverviewCache(symbol, dataType) {
	try {
		const overviewData = getCachedData(symbol, 'stock-overview');
		if (overviewData && overviewData[dataType]) {
			console.log(`[Cache] Using ${dataType} from aggregated overview cache for ${symbol}`);
			return overviewData[dataType];
		}
		return null;
	} catch (error) {
		console.error(`[Cache] Error reading overview cache for ${dataType} (${symbol}):`, error);
		return null;
	}
}

/**
 * Clear all stock caches
 */
export function clearAllCaches() {
	try {
		const keysToRemove = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith('stock_')) {
				keysToRemove.push(key);
			}
		}
		keysToRemove.forEach(key => localStorage.removeItem(key));
		console.log(`[Cache] Cleared all stock caches`);
	} catch (error) {
		console.error('[Cache] Error clearing all caches:', error);
	}
}


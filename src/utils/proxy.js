/**
 * Proxy utility - uses local Express backend if available, otherwise falls back to public proxies
 */
const BACKEND_URL = 'http://localhost:3000';

export async function fetchWithProxy(url, options = {}) {
	// Try local backend first (if running)
	if (url.includes('query1.finance.yahoo.com')) {
		try {
			// Extract symbol and params from Yahoo Finance URL
			const urlObj = new URL(url);
			const pathParts = urlObj.pathname.split('/');
			const symbol = pathParts[pathParts.length - 1];
			const params = new URLSearchParams(urlObj.search);
			
			// Determine endpoint based on URL structure
			let backendUrl;
			if (url.includes('/quoteSummary/')) {
				backendUrl = `${BACKEND_URL}/api/yahoo/quoteSummary/${symbol}?${params.toString()}`;
			} else if (url.includes('/chart/')) {
				backendUrl = `${BACKEND_URL}/api/yahoo/chart/${symbol}?${params.toString()}`;
			} else if (url.includes('/options/')) {
				backendUrl = `${BACKEND_URL}/api/yahoo/options/${symbol}?${params.toString()}`;
			} else if (url.includes('/quote')) {
				// Quote API - extract symbols from query params
				const symbols = params.get('symbols') || symbol;
				backendUrl = `${BACKEND_URL}/api/yahoo/quote?symbols=${symbols}`;
			} else {
				throw new Error('Unknown Yahoo Finance endpoint');
			}
			
			const response = await fetch(backendUrl);
			if (response.ok) {
				return await response.json();
			}
			// If backend returns error status, don't try public proxies (they won't work either)
			if (response.status === 503 || response.status === 500) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `Backend returned ${response.status}`);
			}
		} catch (error) {
			// Only try public proxies if it's a network error, not a 503/500
			if (error.message && (error.message.includes('503') || error.message.includes('500') || error.message.includes('Backend returned'))) {
				throw error; // Re-throw backend errors
			}
			console.warn('Local backend not available, trying public proxies:', error.message);
		}
	}
	
	// Fallback to public proxies
	const proxies = [
		`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
		`https://corsproxy.io/?${encodeURIComponent(url)}`,
		`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
	];
	
	let lastError = null;
	
	for (const proxyUrl of proxies) {
		try {
			const response = await fetch(proxyUrl, {
				method: 'GET',
				...options
			});
			
			if (!response.ok) {
				throw new Error(`Proxy returned ${response.status}`);
			}
			
			const data = await response.json();
			
			// Handle allorigins.win format
			if (data.contents) {
				if (data.contents.trim() === '' || data.contents === 'null') {
					throw new Error('Empty response from proxy');
				}
				try {
					return JSON.parse(data.contents);
				} catch (e) {
					// If it's not JSON, return as string
					return data.contents;
				}
			}
			
			// Handle other proxy formats (direct response)
			return data;
			
		} catch (error) {
			console.warn(`Proxy ${proxyUrl.substring(0, 30)}... failed:`, error.message);
			lastError = error;
			continue;
		}
	}
	
	throw new Error(`All proxies failed. Last error: ${lastError?.message || 'Unknown'}`);
}

/**
 * Fetch FRED data through local backend
 */
export async function fetchFredWithProxy(seriesId, apiKey, params = {}) {
	try {
		const queryParams = new URLSearchParams({
			series_id: seriesId,
			api_key: apiKey,
			file_type: 'json',
			...params
		});
		
		const backendUrl = `${BACKEND_URL}/api/fred/observations?${queryParams.toString()}`;
		const response = await fetch(backendUrl);
		
		if (response.ok) {
			return await response.json();
		}
		throw new Error(`Backend returned ${response.status}`);
	} catch (error) {
		console.warn('Local backend not available for FRED:', error.message);
		// Fallback to public proxy
		const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&${new URLSearchParams(params).toString()}`;
		return fetchWithProxy(url);
	}
}


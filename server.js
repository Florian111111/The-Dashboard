const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

const app = express();
const PORT = process.env.NODE_PORT || 3000;

// ===========================================
// API Keys from environment variables
// ===========================================
const FRED_API_KEY = process.env.FRED_API_KEY;
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;

if (!FRED_API_KEY) {
	console.warn('⚠️  WARNING: FRED_API_KEY not set in .env file');
}
if (!GEMINI_API_KEY) {
	console.warn('⚠️  WARNING: GOOGLE_API_KEY not set in .env file');
}

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files from the project root
// This must come before API routes to ensure static files are served correctly
app.use(express.static(__dirname, {
	// Don't serve index.html as static file - let SPA routing handle it
	index: false,
	// Set proper MIME types for JavaScript modules
	setHeaders: (res, path) => {
		if (path.endsWith('.js')) {
			res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
		}
	}
}));

// Cache for Yahoo Finance crumb and cookies
let yahooCrumb = null;
let yahooCookies = null;
let crumbExpiry = 0;

// Function to get Yahoo Finance crumb and cookies (with retry and fallback)
async function getYahooCrumb() {
	// Return cached crumb if still valid (cache for 1 hour)
	if (yahooCrumb && Date.now() < crumbExpiry) {
		return { crumb: yahooCrumb, cookies: yahooCookies };
	}

	// Try multiple methods to get crumb
	const methods = [
		// Method 1: Standard crumb endpoint
		async () => {
			const cookieResponse = await fetch('https://fc.yahoo.com');
			const cookies = cookieResponse.headers.get('set-cookie') || '';
			const crumbResponse = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
				headers: { 'Cookie': cookies }
			});
			if (!crumbResponse.ok) throw new Error(`Status ${crumbResponse.status}`);
			return { crumb: (await crumbResponse.text()).trim(), cookies };
		},
		// Method 2: Try without cookies
		async () => {
			const crumbResponse = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb');
			if (!crumbResponse.ok) throw new Error(`Status ${crumbResponse.status}`);
			return { crumb: (await crumbResponse.text()).trim(), cookies: null };
		}
	];

	for (const method of methods) {
		try {
			const result = await method();
			yahooCrumb = result.crumb;
			yahooCookies = result.cookies;
			crumbExpiry = Date.now() + (60 * 60 * 1000);
			console.log('Yahoo Finance crumb obtained');
			return { crumb: yahooCrumb, cookies: yahooCookies };
		} catch (error) {
			console.warn('Crumb method failed:', error.message);
			continue;
		}
	}

	// If all methods fail, return null (we'll try without crumb)
	console.warn('Could not obtain Yahoo crumb, will try without it');
	return { crumb: null, cookies: null };
}

// Input validation helper
function validateSymbol(symbol) {
	if (!symbol || typeof symbol !== 'string') {
		throw new Error('Symbol is required');
	}

	// Sanitize: remove whitespace, convert to uppercase
	symbol = symbol.trim().toUpperCase();

	// Prevent path traversal and injection attacks
	if (symbol.includes('..') || symbol.includes('/') || symbol.includes('\\') ||
		symbol.includes('?') || symbol.includes('&') || symbol.includes('#') ||
		symbol.includes('%') || symbol.length > 20) {
		throw new Error('Invalid symbol format');
	}

	// Validate format: Allow letters, numbers, dots, hyphens, caret (^), equals (=), X for Yahoo Finance symbols
	// Examples: ^GSPC, EURUSD=X, GC=F, JPY=X
	if (!/^[A-Z0-9.\-^=X]{1,20}$/.test(symbol)) {
		throw new Error('Invalid symbol format');
	}

	return symbol;
}

function validateInterval(interval) {
	const allowed = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'];
	return allowed.includes(interval) ? interval : '1d';
}

function validateRange(range) {
	const allowed = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'];
	return allowed.includes(range) ? range : '1y';
}

// Proxy endpoint for Yahoo Finance Quote API
app.get('/api/yahoo/quote', async (req, res) => {
	try {
		const symbols = req.query.symbols || '';
		if (!symbols) {
			return res.status(400).json({ error: 'Symbols parameter is required' });
		}

		// Try with crumb and cookies first
		try {
			const { crumb, cookies } = await getYahooCrumb();
			const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}${crumb ? `&crumb=${crumb}` : ''}`;

			const headers = {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				'Accept': 'application/json',
				'Referer': 'https://finance.yahoo.com/'
			};

			if (cookies) {
				headers['Cookie'] = cookies;
			}

			const response = await fetch(url, { headers });

			if (response.ok) {
				const data = await response.json();
				// Check for errors in response
				if (data.finance && data.finance.error) {
					throw new Error(`Yahoo Finance API error: ${data.finance.error.description || data.finance.error.code}`);
				}
				return res.json(data);
			}
		} catch (crumbError) {
			console.warn('Quote API with crumb failed, trying Chart API fallback:', crumbError.message);
		}

		// Fallback: Use Chart API to get quote data (more reliable)
		// Parse symbols and fetch each one via Chart API
		const symbolList = symbols.split(',').map(s => s.trim()).filter(s => s);
		const quoteResults = [];

		// First, fetch all quote data from Chart API
		for (const symbol of symbolList) {
			try {
				const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
				const chartResponse = await fetch(chartUrl);

				if (chartResponse.ok) {
					const chartData = await chartResponse.json();
					if (chartData.chart && chartData.chart.result && chartData.chart.result[0]) {
						const result = chartData.chart.result[0];
						const meta = result.meta;

						// Get market cap - try all possible field names (Chart API doesn't have it)
						let marketCap = meta.marketCap || meta.market_cap || meta.market_cap_raw || null;

						// Only calculate if we have both price and shares outstanding
						const sharesOutstanding = meta.sharesOutstanding || meta.shares_outstanding || null;
						if (!marketCap && meta.regularMarketPrice && sharesOutstanding) {
							marketCap = meta.regularMarketPrice * sharesOutstanding;
						}

						// Chart API uses chartPreviousClose instead of previousClose
						const previousClose = meta.previousClose || meta.chartPreviousClose;

						// Always include marketCap in response, even if null (will be filled from Finnhub)
						const quoteResult = {
							symbol: meta.symbol,
							regularMarketPrice: meta.regularMarketPrice,
							regularMarketPreviousClose: previousClose,
							regularMarketChange: previousClose ? (meta.regularMarketPrice - previousClose) : 0,
							regularMarketChangePercent: previousClose && previousClose > 0 ? ((meta.regularMarketPrice - previousClose) / previousClose) * 100 : 0,
							marketCap: marketCap, // Will be filled from Finnhub if null
							sharesOutstanding: sharesOutstanding,
							regularMarketTime: meta.regularMarketTime,
							currency: meta.currency,
							shortName: meta.shortName,
							longName: meta.longName
						};

						quoteResults.push(quoteResult);
					}
				}
			} catch (symbolError) {
				console.warn(`Failed to fetch ${symbol} via Chart API:`, symbolError.message);
			}
		}

		// Note: Market caps are now fetched directly by the frontend via /api/heatmap-quotes
		// This fallback is kept for backwards compatibility but shouldn't be needed

		if (quoteResults.length === 0) {
			throw new Error('Failed to fetch quote data via Chart API fallback');
		}

		// Return in Quote API format
		res.json({
			quoteResponse: {
				result: quoteResults,
				error: null
			}
		});
	} catch (error) {
		console.error('Error fetching quote:', error);
		res.status(500).json({ error: error.message || 'Failed to fetch quote data' });
	}
});

// Proxy endpoint for Yahoo Finance Chart API
app.get('/api/yahoo/chart/:symbol', async (req, res) => {
	try {
		// Validate and sanitize inputs
		const symbol = validateSymbol(req.params.symbol);
		const interval = validateInterval(req.query.interval || '1d');
		const range = validateRange(req.query.range || '1y');

		const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;

		// Use the same simple approach that works for charts
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Yahoo Finance API returned ${response.status}`);
		}

		const data = await response.json();
		res.json(data);
	} catch (error) {
		console.error('Yahoo Finance Chart API error:', error);
		res.status(500).json({ error: error.message });
	}
});

// Proxy endpoint for Yahoo Finance Quote Summary API
// Note: This endpoint is deprecated - use Chart API metadata instead (more reliable)
// Kept for backwards compatibility, but will likely fail due to authentication
// Options chain endpoint
app.get('/api/yahoo/options/:symbol', async (req, res) => {
	try {
		// Validate and sanitize inputs
		const symbol = validateSymbol(req.params.symbol);
		const date = req.query.date ? parseInt(req.query.date) : null;

		// Validate date if provided
		if (date && (isNaN(date) || date < 0)) {
			return res.status(400).json({ error: 'Invalid date parameter' });
		}

		// Get crumb and cookies for authentication
		const { crumb, cookies } = await getYahooCrumb();

		let url;
		if (date) {
			url = `https://query1.finance.yahoo.com/v7/finance/options/${symbol}?date=${date}&crumb=${crumb}`;
		} else {
			url = `https://query1.finance.yahoo.com/v7/finance/options/${symbol}?crumb=${crumb}`;
		}

		const headers = {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			'Accept': 'application/json',
			'Referer': `https://finance.yahoo.com/quote/${symbol}/options`
		};

		if (cookies) {
			headers['Cookie'] = cookies;
		}

		const response = await fetch(url, { headers });

		if (!response.ok) {
			// Try without crumb as fallback
			const fallbackUrl = date
				? `https://query1.finance.yahoo.com/v7/finance/options/${symbol}?date=${date}`
				: `https://query1.finance.yahoo.com/v7/finance/options/${symbol}`;

			const fallbackResponse = await fetch(fallbackUrl, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					'Accept': 'application/json'
				}
			});

			if (!fallbackResponse.ok) {
				throw new Error(`Yahoo Finance API returned ${response.status} (with crumb) and ${fallbackResponse.status} (without crumb)`);
			}

			const data = await fallbackResponse.json();
			res.json(data);
			return;
		}

		const data = await response.json();

		// Check for errors in response
		if (data.finance && data.finance.error) {
			throw new Error(`Yahoo Finance API error: ${data.finance.error.description || data.finance.error.code}`);
		}

		res.json(data);
	} catch (error) {
		console.error(`Error fetching options for ${symbol}:`, error);
		res.status(500).json({ error: error.message });
	}
});

app.get('/api/yahoo/quoteSummary/:symbol', async (req, res) => {
	try {
		// Validate and sanitize inputs
		const symbol = validateSymbol(req.params.symbol);
		const modules = req.query.modules || 'defaultKeyStatistics';

		// Validate modules parameter (prevent injection)
		if (!/^[a-zA-Z,]+$/.test(modules)) {
			return res.status(400).json({ error: 'Invalid modules parameter' });
		}

		console.log(`[QuoteSummary] Attempting direct API for ${symbol} (may fail due to auth)`);

		// Try direct API call (usually fails with 401/404 due to authentication)
		const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}`;
		const response = await fetch(url);

		if (!response.ok) {
			// Try v11 as fallback
			const v11Url = `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${symbol}?modules=${modules}`;
			const v11Response = await fetch(v11Url);

			if (!v11Response.ok) {
				throw new Error(`Yahoo Finance API returned ${response.status} (v10) and ${v11Response.status} (v11). Use Chart API metadata instead.`);
			}

			const data = await v11Response.json();

			if (data.finance && data.finance.error) {
				throw new Error(data.finance.error.description || 'Yahoo Finance API error');
			}

			if (!data.quoteSummary || !data.quoteSummary.result || data.quoteSummary.result.length === 0) {
				throw new Error('No data in v11 response');
			}

			console.log(`[QuoteSummary] Success with v11 for ${symbol}`);
			return res.json(data);
		}

		const data = await response.json();

		if (data.finance && data.finance.error) {
			throw new Error(data.finance.error.description || 'Yahoo Finance API error');
		}

		if (!data.quoteSummary || !data.quoteSummary.result || data.quoteSummary.result.length === 0) {
			throw new Error('No data in response');
		}

		console.log(`[QuoteSummary] Success with v10 for ${symbol}`);
		res.json(data);

	} catch (error) {
		console.error(`[QuoteSummary] Error for ${req.params.symbol}:`, error.message);
		res.status(500).json({
			error: error.message,
			details: 'Quote Summary API is unreliable. Frontend should use Chart API metadata instead.'
		});
	}
});

// ===========================================
// Frontend Config Endpoint
// Serves API keys to the frontend securely
// ===========================================
app.get('/api/config', (req, res) => {
	res.json({
		// Only expose keys that the frontend needs
		// These are public/semi-public keys for free APIs
		fredApiKey: FRED_API_KEY || '',
		geminiApiKey: GEMINI_API_KEY || '',
		// Don't expose sensitive keys here
	});
});

// Proxy endpoint for FRED API
// Now uses server-side API key if not provided
app.get('/api/fred/observations', async (req, res) => {
	try {
		const { series_id, api_key, ...params } = req.query;

		// Use provided api_key or fall back to server-side key
		const effectiveApiKey = api_key || FRED_API_KEY;

		if (!series_id) {
			return res.status(400).json({ error: 'series_id is required' });
		}

		if (!effectiveApiKey) {
			return res.status(500).json({ error: 'FRED API key not configured. Please set FRED_API_KEY in .env file.' });
		}

		const queryString = new URLSearchParams({ series_id, api_key: effectiveApiKey, file_type: 'json', ...params }).toString();
		const url = `https://api.stlouisfed.org/fred/series/observations?${queryString}`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`FRED API returned ${response.status}`);
		}

		const data = await response.json();
		res.json(data);
	} catch (error) {
		console.error('FRED API error:', error);
		res.status(500).json({ error: error.message });
	}
});

// Serve index.html for all other routes (SPA routing)
// This must come LAST - after all API routes and static file serving
// express.static will handle actual file requests before this route is reached
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
	console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
	console.log(`📊 Frontend available at http://localhost:${PORT}`);
	console.log(`🔌 API endpoints:`);
	console.log(`   - GET /api/yahoo/chart/:symbol?interval=1d&range=1y`);
	console.log(`   - GET /api/yahoo/quoteSummary/:symbol?modules=...`);
	console.log(`   - GET /api/fred/observations?series_id=...&api_key=...`);
});


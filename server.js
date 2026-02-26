const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const WebSocket = require('ws');

// Load environment variables from .env file
require('dotenv').config();

const app = express();
const PORT = process.env.NODE_PORT || 3000;

// ===========================================
// API Keys from environment variables
// ===========================================
const FRED_API_KEY = process.env.FRED_API_KEY;
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
const AISSTREAM_API_KEY = process.env.AISSTREAM_API_KEY;

if (!FRED_API_KEY) {
	console.warn('⚠️  WARNING: FRED_API_KEY not set in .env file');
}
if (!GEMINI_API_KEY) {
	console.warn('⚠️  WARNING: GOOGLE_API_KEY not set in .env file');
}
if (!AISSTREAM_API_KEY) {
	console.warn('⚠️  WARNING: AISSTREAM_API_KEY not set – Vessels layer will be empty. Get a free key at https://aisstream.io');
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

// Proxy endpoint for Yahoo Finance Screener API (top movers: day_gainers, day_losers, most_actives)
app.get('/api/yahoo/screener', async (req, res) => {
	try {
		const scrIds = req.query.scrIds || 'day_gainers';
		const count = Math.min(parseInt(req.query.count, 10) || 25, 50);
		const allowedIds = ['day_gainers', 'day_losers', 'most_actives', 'undervalued_growth_stocks', 'growth_technology_stocks'];
		const validId = allowedIds.includes(scrIds) ? scrIds : 'day_gainers';

		const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${validId}&count=${count}`;
		const response = await fetch(url, {
			headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json' }
		});
		if (!response.ok) {
			throw new Error(`Yahoo screener returned ${response.status}`);
		}
		const data = await response.json();
		res.json(data);
	} catch (error) {
		console.error('Yahoo screener error:', error);
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
// Health Check Endpoint
// ===========================================
app.get('/api/config', (req, res) => {
	// API keys are now read from .env on the backend only
	// No keys are exposed to the frontend
	res.json({
		status: 'ok',
		message: 'API keys are configured on the server'
	});
});

// ===========================================
// Proxy to Python Backend (port 3001)
// Forward all Python API requests
// ===========================================
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:3001';

// List of Python backend endpoints to proxy
const pythonApiPaths = [
	'/api/fundamentals',
	'/api/peers',
	'/api/search',
	'/api/analyst',
	'/api/sentiment',
	'/api/ownership',
	'/api/earnings',
	'/api/news',
	'/api/price-changes',
	'/api/dividends',
	'/api/profile',
	'/api/heatmap-quotes',
	'/api/ai-summary',
	'/api/ai-market-summary',
	'/api/swot',
	'/api/session-status',
	'/api/session-start',
	'/api/check-data',
	'/api/health',
	'/api/peer-comparison',
	'/api/dax-heatmap',
	'/api/sp500-heatmap',
	'/api/nikkei225-heatmap',
	'/api/nasdaq100-heatmap',
	'/api/hangseng-heatmap',
	'/api/market-cap',
	'/api/market-news',
	'/api/crypto-overview',
];

// Create proxy handler for Python backend
async function proxyToPython(req, res) {
	try {
		const targetUrl = `${PYTHON_BACKEND_URL}${req.originalUrl}`;
		console.log(`[Proxy] Forwarding to Python: ${req.method} ${targetUrl}`);

		const fetchOptions = {
			method: req.method,
			headers: {
				'Content-Type': 'application/json',
				'X-Forwarded-For': req.ip || req.connection.remoteAddress,
				'X-Real-IP': req.ip || req.connection.remoteAddress,
			},
		};

		// Include body for POST/PUT requests
		if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
			fetchOptions.body = JSON.stringify(req.body);
		}

		const response = await fetch(targetUrl, fetchOptions);

		// Forward status and headers
		res.status(response.status);

		// Forward important headers
		const contentType = response.headers.get('content-type');
		if (contentType) {
			res.set('Content-Type', contentType);
		}

		// Forward rate limit headers
		const retryAfter = response.headers.get('Retry-After');
		if (retryAfter) {
			res.set('Retry-After', retryAfter);
		}
		const rateLimitType = response.headers.get('X-RateLimit-Type');
		if (rateLimitType) {
			res.set('X-RateLimit-Type', rateLimitType);
		}
		
		// Forward session remaining header
		const sessionRemaining = response.headers.get('X-Session-Remaining');
		if (sessionRemaining !== null) {
			res.set('X-Session-Remaining', sessionRemaining);
		}

		// Get response data
		const data = await response.text();

		// Try to parse as JSON, otherwise send as-is
		try {
			const jsonData = JSON.parse(data);
			res.json(jsonData);
		} catch {
			res.send(data);
		}
	} catch (error) {
		console.error(`[Proxy] Error forwarding to Python backend:`, error.message);
		res.status(502).json({
			error: 'Python backend unavailable',
			details: error.message,
			hint: 'Make sure the Python backend is running on port 3001'
		});
	}
}

// Register proxy routes for all Python backend endpoints
pythonApiPaths.forEach(path => {
	app.all(`${path}*`, proxyToPython);
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

// ===========================================
// AIS Vessel positions (AISStream) – optional
// ===========================================
const vesselCache = new Map(); // mmsi -> { lat, lon, name, shipType, sog, cog, ... }
const vesselTrack = new Map(); // mmsi -> [{ lat, lon, ts }, ...] last N positions for route
const VESSEL_MAX_AGE_MS = 30 * 60 * 1000; // drop positions older than 30 min
const VESSEL_TRACK_MAX_POINTS = 200; // keep last 200 positions per vessel (~1–2 h at 30s interval)
let aisStreamMessageCount = 0;
let aisStreamRawCount = 0;

// Recursively get first number from obj that looks like MMSI (9 digits) or lat/lon
function findInObj(obj, keys, pred) {
	if (obj == null || typeof obj !== 'object') return undefined;
	for (const k of keys) {
		const v = obj[k];
		if (v != null && pred(v)) return v;
	}
	for (const v of Object.values(obj)) {
		if (typeof v === 'object' && v !== null) {
			const found = findInObj(v, keys, pred);
			if (found !== undefined) return found;
		}
	}
	return undefined;
}

function startAISStream() {
	if (!AISSTREAM_API_KEY) return;
	const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
	ws.on('open', () => {
		// AISStream: Apikey + BoundingBoxes (array of boxes: [[minLat, minLon], [maxLat, maxLon]])
		const sub = {
			Apikey: AISSTREAM_API_KEY,
			BoundingBoxes: [[[-90, -180], [90, 180]]]
		};
		ws.send(JSON.stringify(sub));
		console.log('AISStream WebSocket connected – subscription sent');
	});
	ws.on('message', (data) => {
		aisStreamRawCount++;
		try {
			const raw = data.toString();
			const msg = JSON.parse(raw);
			if (aisStreamRawCount <= 2) console.log('AISStream raw message #' + aisStreamRawCount + ' keys:', Object.keys(msg).join(', '), '| sample:', raw.slice(0, 300));
			// Handle error response from AISStream
			if (msg.error || msg.Error) {
				console.warn('AISStream server error:', msg.error || msg.Error);
				return;
			}
			// AISStream: MessageType + Message.PositionReport (UserID=MMSI, Latitude, Longitude) or Message.ShipStaticData
			const msgType = msg.MessageType || (msg.Meta && msg.Meta.MessageType);
			const inner = msg.Message || msg;
			const posPayload = (inner && (inner.PositionReport || inner.position_report)) || (msgType === 'PositionReport' && msg.PositionReport) || msg.PositionReport || msg.position_report || msg.StandardClassBPositionReport || (msg.Latitude != null || msg.lat != null ? msg : null);
			const pos = posPayload || (msgType && msg[msgType]) || null;
			const statPayload = (inner && (inner.ShipStaticData || inner.StaticData)) || msg.ShipStaticData || msg.StaticData || msg.ship_static_data;
			const stat = statPayload || null;
			let mmsi = (pos && (pos.UserID ?? pos.Mmsi ?? pos.mmsi)) || (stat && (stat.UserID ?? stat.Mmsi ?? stat.mmsi)) || (msg.Mmsi ?? msg.mmsi);
			if (!mmsi && msg) mmsi = findInObj(msg, ['UserID', 'Mmsi', 'mmsi', 'MMSI'], (v) => typeof v === 'number' && v >= 200000000 && v <= 799999999);
			if (!mmsi) return;
			aisStreamMessageCount++;
			let v = vesselCache.get(mmsi) || { mmsi, updated: 0 };
			if (pos) {
				let lat = pos.Latitude ?? pos.lat;
				let lon = pos.Longitude ?? pos.lon;
				if ((lat == null || lon == null) && msg) {
					lat = lat ?? findInObj(msg, ['Latitude', 'lat'], (x) => typeof x === 'number' && x >= -90 && x <= 90);
					lon = lon ?? findInObj(msg, ['Longitude', 'lon'], (x) => typeof x === 'number' && x >= -180 && x <= 180);
				}
				if (lat != null && lon != null) {
					v.lat = lat;
					v.lon = lon;
					v.sog = pos.Sog ?? pos.sog ?? pos.Speed ?? pos.speed;
					v.cog = pos.Cog ?? pos.cog ?? pos.Course ?? pos.course;
					v.heading = pos.Heading ?? pos.heading;
					v.updated = Date.now();
					// Append to track history for route display
					let track = vesselTrack.get(mmsi) || [];
					track.push({ lat, lon, ts: v.updated });
					if (track.length > VESSEL_TRACK_MAX_POINTS) track = track.slice(-VESSEL_TRACK_MAX_POINTS);
					vesselTrack.set(mmsi, track);
				}
			}
			if (stat) {
				v.name = stat.ShipName ?? stat.shipname ?? stat.Name ?? stat.name ?? v.name;
				v.shipType = stat.ShipType ?? stat.shiptype ?? stat.VesselType ?? stat.vessel_type ?? v.shipType;
				v.updated = Math.max(v.updated || 0, Date.now());
			}
			vesselCache.set(mmsi, v);
		} catch (e) {
			if (aisStreamRawCount <= 3) console.warn('AISStream parse error:', e.message, '| raw start:', data.toString().slice(0, 150));
		}
	});
	ws.on('error', (err) => console.warn('AISStream WebSocket error:', err.message));
	ws.on('close', (code, reason) => {
		console.log('AISStream WebSocket closed – code:', code, 'reason:', reason?.toString() || '-', '| reconnecting in 30s');
		setTimeout(startAISStream, 30000);
	});
}

// Proxy for map layers (avoids CORS when loading ArcGIS/NOAA from frontend)
const MAP_LAYER_PROXY = {
	'submarine-cables': 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/SubmarineCables/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson',
	'pipelines': 'https://gis.ngdc.noaa.gov/arcgis/rest/services/GulfDataAtlas/BOEM_OilAndGasPipelines/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=2000&f=geojson'
};
app.get('/api/map-layer/:name', async (req, res) => {
	const url = MAP_LAYER_PROXY[req.params.name];
	if (!url) return res.status(404).json({ error: 'Unknown map layer' });
	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(response.statusText);
		const data = await response.json();
		res.setHeader('Content-Type', 'application/json');
		res.json(data);
	} catch (e) {
		console.warn('Map layer proxy failed:', req.params.name, e.message);
		res.status(502).json({ type: 'FeatureCollection', features: [] });
	}
});

// GET /api/vessels/status – debug: cache size and message count (no auth)
app.get('/api/vessels/status', (req, res) => {
	res.json({ cacheSize: vesselCache.size, messageCount: aisStreamMessageCount, rawMessageCount: aisStreamRawCount, hasKey: !!AISSTREAM_API_KEY });
});

// GET /api/vessels – GeoJSON of vessel positions (from AISStream cache)
// Query: latmin, latmax, lonmin, lonmax (default world), cargoOnly=1 to filter cargo/container (ship type 70–79)
app.get('/api/vessels', (req, res) => {
	try {
		const latmin = parseFloat(req.query.latmin);
		const latmax = parseFloat(req.query.latmax);
		const lonmin = parseFloat(req.query.lonmin);
		const lonmax = parseFloat(req.query.lonmax);
		const cargoOnly = req.query.cargoOnly === '1' || req.query.cargoOnly === 'true';
		const now = Date.now();
		const features = [];
		for (const v of vesselCache.values()) {
			if (v.lat == null || v.updated == null || now - v.updated > VESSEL_MAX_AGE_MS) continue;
			const lat = Number(v.lat);
			const lon = Number(v.lon);
			if (isNaN(lat) || isNaN(lon)) continue;
			if (latmin != null && !isNaN(latmin) && lat < latmin) continue;
			if (latmax != null && !isNaN(latmax) && lat > latmax) continue;
			if (lonmin != null && !isNaN(lonmin) && lon < lonmin) continue;
			if (lonmax != null && !isNaN(lonmax) && lon > lonmax) continue;
			const shipType = v.shipType != null ? Number(v.shipType) : NaN;
			if (cargoOnly && !isNaN(shipType) && (shipType < 70 || shipType > 79)) continue; // 70–79 = cargo
			features.push({
				type: 'Feature',
				properties: {
					mmsi: v.mmsi,
					name: v.name || `MMSI ${v.mmsi}`,
					type: 'Vessel',
					description: v.shipType != null ? `Ship type: ${v.shipType}` : '',
					location: v.sog != null ? `Speed: ${Number(v.sog).toFixed(1)} kn` : '',
					sog: v.sog,
					cog: v.cog,
					shipType: v.shipType
				},
				geometry: { type: 'Point', coordinates: [lon, lat] }
			});
		}
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Cache-Control', 'no-store, max-age=0');
		res.json({ type: 'FeatureCollection', features });
	} catch (e) {
		console.error('Vessels API error:', e);
		res.status(500).json({ error: e.message || 'Vessels API error' });
	}
});

// GET /api/vessels/:mmsi/track – past positions for route (last ~1–2 h) + current vessel info
app.get('/api/vessels/:mmsi/track', (req, res) => {
	const mmsi = req.params.mmsi;
	const v = vesselCache.get(mmsi);
	const track = vesselTrack.get(mmsi) || [];
	const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
	const points = track.filter(p => p.ts >= twoHoursAgo).map(p => [p.lat, p.lon]);
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Cache-Control', 'no-store, max-age=0');
	if (!v) return res.json({ track: points, vessel: null });
	res.json({
		track: points,
		vessel: {
			mmsi: v.mmsi,
			name: v.name || `MMSI ${v.mmsi}`,
			lat: v.lat,
			lon: v.lon,
			sog: v.sog,
			cog: v.cog,
			shipType: v.shipType
		}
	});
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
	console.log(`   - GET /api/vessels?latmin=&latmax=&lonmin=&lonmax=&cargoOnly=1`);
	if (AISSTREAM_API_KEY) startAISStream();
});


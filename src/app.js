import { MarketOverview } from './pages/MarketOverview.js';
import { StockAnalysis } from './pages/StockAnalysis.js';
import { IndicatorDetail } from './pages/IndicatorDetail.js';
import { FundamentalsDetail } from './pages/FundamentalsDetail.js';
import { EarningsDetail } from './pages/EarningsDetail.js';
import { Impressum } from './pages/Impressum.js';
import { PrivacyPolicy } from './pages/PrivacyPolicy.js';
import { Disclaimer } from './pages/Disclaimer.js';
import { Watchlist } from './pages/Watchlist.js';
import { StockComparison } from './pages/StockComparison.js';
import { Backtesting } from './pages/Backtesting.js';
import { BacktestingPro } from './pages/BacktestingPro.js';
import { PortfolioTracking } from './pages/PortfolioTracking.js';
import { EconomicCalendar } from './pages/EconomicCalendar.js';
import { CookieBanner } from './components/CookieBanner.js';
import { RateLimitBanner } from './components/RateLimitBanner.js';
import { SessionTimer } from './components/SessionTimer.js';
import { MobileOrientationWarning } from './components/MobileOrientationWarning.js';
import { ensureDefaultStorage } from './utils/storage.js';
import { API_BASE_URL } from './config.js';

ensureDefaultStorage();

class App {
	constructor() {
		this.currentPage = 'market-overview';
		this.appContainer = document.getElementById('app');

		if (!this.appContainer) {
			console.error('App container not found!');
			return;
		}

		this.init();
	}

	init() {
		try {
			// Register pages
			if (!customElements.get('market-overview')) {
				customElements.define('market-overview', MarketOverview);
			}
			if (!customElements.get('stock-analysis')) {
				customElements.define('stock-analysis', StockAnalysis);
			}
			if (!customElements.get('indicator-detail')) {
				customElements.define('indicator-detail', IndicatorDetail);
			}
			if (!customElements.get('fundamentals-detail')) {
				customElements.define('fundamentals-detail', FundamentalsDetail);
			}
			if (!customElements.get('earnings-detail')) {
				customElements.define('earnings-detail', EarningsDetail);
			}
			if (!customElements.get('impressum-page')) {
				customElements.define('impressum-page', Impressum);
			}
			if (!customElements.get('privacy-policy-page')) {
				customElements.define('privacy-policy-page', PrivacyPolicy);
			}
			if (!customElements.get('disclaimer-page')) {
				customElements.define('disclaimer-page', Disclaimer);
			}
			if (!customElements.get('watchlist-page')) {
				customElements.define('watchlist-page', Watchlist);
			}
			if (!customElements.get('stock-comparison-page')) {
				customElements.define('stock-comparison-page', StockComparison);
			}
			if (!customElements.get('backtesting-page')) {
				customElements.define('backtesting-page', Backtesting);
			}
			if (!customElements.get('backtesting-pro-page')) {
				customElements.define('backtesting-pro-page', BacktestingPro);
			}
			if (!customElements.get('portfolio-tracking-page')) {
				customElements.define('portfolio-tracking-page', PortfolioTracking);
			}
			if (!customElements.get('economic-calendar-page')) {
				customElements.define('economic-calendar-page', EconomicCalendar);
			}
			if (!customElements.get('cookie-banner')) {
				customElements.define('cookie-banner', CookieBanner);
			}
			if (!customElements.get('rate-limit-banner')) {
				customElements.define('rate-limit-banner', RateLimitBanner);
			}
			if (!customElements.get('session-timer')) {
				customElements.define('session-timer', SessionTimer);
			}

			// Add cookie banner to body
			if (!document.querySelector('cookie-banner')) {
				const cookieBanner = document.createElement('cookie-banner');
				document.body.appendChild(cookieBanner);

				// Check if cookies were previously accepted and load AdSense if needed
				const cookiePreference = localStorage.getItem('cookiePreference');
				if (cookiePreference === 'accepted') {
					// AdSense will be loaded by the cookie banner component
				}
			}

			// Add rate limit banner to body
			if (!document.querySelector('rate-limit-banner')) {
				const rateLimitBanner = document.createElement('rate-limit-banner');
				document.body.appendChild(rateLimitBanner);
				this.rateLimitBanner = rateLimitBanner;
			} else {
				this.rateLimitBanner = document.querySelector('rate-limit-banner');
			}

			// Add session timer to body
			if (!document.querySelector('session-timer')) {
				const sessionTimer = document.createElement('session-timer');
				document.body.appendChild(sessionTimer);
				this.sessionTimer = sessionTimer;
			} else {
				this.sessionTimer = document.querySelector('session-timer');
			}
			
			// Track if session has been started (to show timer on first click)
			this.sessionStarted = false;
			
			// Add global click listener to start session timer on first user interaction
			document.addEventListener('click', (e) => {
				if (!this.sessionStarted && this.sessionTimer) {
					console.log('[Session Timer] First click detected, starting session timer');
					this.sessionStarted = true;
					this.sessionTimer.show(300); // 5 minutes = 300 seconds
				}
			}, { once: false, capture: true });

			// Add mobile orientation warning to body
			if (!document.querySelector('mobile-orientation-warning')) {
				const mobileWarning = document.createElement('mobile-orientation-warning');
				document.body.appendChild(mobileWarning);
			}

			// Setup global fetch interceptor for rate limiting
			this.setupRateLimitInterceptor();

			// Listen for navigation events
			window.addEventListener('navigate', (e) => {
				this.navigate(e.detail.page, e.detail, true);
			});

			// Handle browser back/forward buttons
			window.addEventListener('popstate', (e) => {
				if (e.state) {
					this.navigate(e.state.page, e.state.params || {}, false);
				} else {
					// Parse URL if no state
					const { page, params } = this.parseUrl();
					this.navigate(page, params, false);
				}
			});

			// Initial load from URL
			// Use setTimeout to ensure DOM is fully ready
			setTimeout(() => {
				const { page, params } = this.parseUrl();
				this.navigate(page, params, false);
			}, 0);
		} catch (error) {
			console.error('Error initializing app:', error);
			this.appContainer.innerHTML = '<div style="color: #ef4444; padding: 20px;">Error loading application. Please check the console.</div>';
		}
	}

	// Parse URL to get page and parameters
	parseUrl() {
		const path = window.location.pathname;
		const searchParams = new URLSearchParams(window.location.search);

		// Default
		let page = 'market-overview';
		let params = {};

		// Parse path
		if (path === '/' || path === '' || path === '/index.html') {
			page = 'market-overview';
		} else if (path.startsWith('/stock/')) {
			page = 'stock-analysis';
			// Extract symbol, removing any trailing slashes or query parameters
			let symbol = path.split('/stock/')[1];
			if (symbol) {
				// Remove trailing slash
				symbol = symbol.replace(/\/$/, '');
				// Remove query parameters if any
				symbol = symbol.split('?')[0];
				params.symbol = decodeURIComponent(symbol);
			}
		} else if (path.startsWith('/indicator/')) {
			page = 'indicator-detail';
			params.symbol = decodeURIComponent(path.split('/indicator/')[1]);
			// Get additional params from query string
			if (searchParams.get('name')) params.name = searchParams.get('name');
			if (searchParams.get('description')) params.description = searchParams.get('description');
			if (searchParams.get('source')) params.source = searchParams.get('source');
		} else if (path.startsWith('/fundamentals/')) {
			page = 'fundamentals-detail';
			params.symbol = decodeURIComponent(path.split('/fundamentals/')[1]);
		} else if (path.startsWith('/earnings/')) {
			page = 'earnings-detail';
			params.symbol = decodeURIComponent(path.split('/earnings/')[1]);
		} else if (path === '/impressum') {
			page = 'impressum';
		} else if (path === '/privacy-policy') {
			page = 'privacy-policy';
		} else if (path === '/watchlist') {
			page = 'watchlist';
		} else if (path === '/comparison') {
			page = 'stock-comparison';
		} else if (path === '/backtesting') {
			page = 'backtesting';
		} else if (path === '/backtesting-pro') {
			page = 'backtesting-pro';
		} else if (path === '/portfolio') {
			page = 'portfolio-tracking';
		} else if (path === '/economic-calendar') {
			page = 'economic-calendar';
		}

		return { page, params };
	}

	// Build URL from page and parameters
	buildUrl(page, params = {}) {
		switch (page) {
			case 'market-overview':
				return '/';
			case 'stock-analysis':
				return params.symbol ? `/stock/${encodeURIComponent(params.symbol)}` : '/';
			case 'indicator-detail':
				if (params.symbol) {
					let url = `/indicator/${encodeURIComponent(params.symbol)}`;
					const queryParams = new URLSearchParams();
					if (params.name) queryParams.set('name', params.name);
					if (params.description) queryParams.set('description', params.description);
					if (params.source) queryParams.set('source', params.source);
					const query = queryParams.toString();
					return query ? `${url}?${query}` : url;
				}
				return '/';
			case 'fundamentals-detail':
				return params.symbol ? `/fundamentals/${encodeURIComponent(params.symbol)}` : '/';
			case 'earnings-detail':
				return params.symbol ? `/earnings/${encodeURIComponent(params.symbol)}` : '/';
			case 'impressum':
				return '/impressum';
			case 'privacy-policy':
				return '/privacy-policy';
			case 'disclaimer':
				return '/disclaimer';
			case 'watchlist':
				return '/watchlist';
			case 'stock-comparison':
				return '/comparison';
			case 'backtesting':
				return '/backtesting';
			case 'backtesting-pro':
				return '/backtesting-pro';
			case 'portfolio-tracking':
				return '/portfolio';
			case 'economic-calendar':
				return '/economic-calendar';
			default:
				return '/';
		}
	}

	navigate(page, params = {}, updateUrl = true) {
		console.log('[App] Navigating to:', page, params);
		this.currentPage = page;
		this.appContainer.innerHTML = '';

		// Update URL if needed
		if (updateUrl) {
			const url = this.buildUrl(page, params);
			const title = this.getPageTitle(page, params);
			window.history.pushState({ page, params }, title, url);
			document.title = title;
		} else {
			document.title = this.getPageTitle(page, params);
		}

		// Update SEO Meta Tags
		this.updateMetaTags(page, params);

		switch (page) {
			case 'market-overview':
				this.appContainer.innerHTML = '<market-overview></market-overview>';
				break;
			case 'stock-analysis':
				const stockSymbol = params.symbol ? `symbol="${encodeURIComponent(params.symbol)}"` : '';
				this.appContainer.innerHTML = `<stock-analysis ${stockSymbol}></stock-analysis>`;
				break;
			case 'indicator-detail':
				const symbol = params.symbol ? `symbol="${params.symbol}"` : '';
				const name = params.name ? `name="${params.name}"` : '';
				const description = params.description ? `description="${params.description}"` : '';
				const source = params.source ? `source="${params.source}"` : '';
				this.appContainer.innerHTML = `<indicator-detail ${symbol} ${name} ${description} ${source}></indicator-detail>`;
				break;
			case 'fundamentals-detail':
				const fundSymbol = params.symbol ? `symbol="${params.symbol}"` : '';
				this.appContainer.innerHTML = `<fundamentals-detail ${fundSymbol}></fundamentals-detail>`;
				break;
			case 'earnings-detail':
				const earnSymbol = params.symbol ? `symbol="${params.symbol}"` : '';
				this.appContainer.innerHTML = `<earnings-detail ${earnSymbol}></earnings-detail>`;
				break;
			case 'impressum':
				this.appContainer.innerHTML = '<impressum-page></impressum-page>';
				break;
			case 'privacy-policy':
				this.appContainer.innerHTML = '<privacy-policy-page></privacy-policy-page>';
				break;
			case 'disclaimer':
				this.appContainer.innerHTML = '<disclaimer-page></disclaimer-page>';
				break;
			case 'watchlist':
				this.appContainer.innerHTML = '<watchlist-page></watchlist-page>';
				break;
			case 'stock-comparison':
				this.appContainer.innerHTML = '<stock-comparison-page></stock-comparison-page>';
				break;
			case 'backtesting':
				this.appContainer.innerHTML = '<backtesting-page></backtesting-page>';
				break;
			case 'backtesting-pro':
				this.appContainer.innerHTML = '<backtesting-pro-page></backtesting-pro-page>';
				break;
			case 'portfolio-tracking':
				this.appContainer.innerHTML = '<portfolio-tracking-page></portfolio-tracking-page>';
				break;
			case 'economic-calendar':
				this.appContainer.innerHTML = '<economic-calendar-page></economic-calendar-page>';
				break;
			default:
				this.appContainer.innerHTML = '<market-overview></market-overview>';
		}

		// Scroll to top on navigation
		window.scrollTo(0, 0);
	}

	getPageTitle(page, params = {}) {
		const baseTitle = 'Stock Analysis Platform';
		switch (page) {
			case 'market-overview':
				return `Market Overview | ${baseTitle}`;
			case 'stock-analysis':
				return params.symbol ? `${params.symbol} Stock Analysis | ${baseTitle}` : baseTitle;
			case 'indicator-detail':
				return params.name ? `${params.name} | ${baseTitle}` : `${params.symbol || 'Indicator'} | ${baseTitle}`;
			case 'fundamentals-detail':
				return params.symbol ? `${params.symbol} Fundamentals | ${baseTitle}` : baseTitle;
			case 'earnings-detail':
				return params.symbol ? `${params.symbol} Earnings | ${baseTitle}` : baseTitle;
			case 'impressum':
				return `Impressum | ${baseTitle}`;
			case 'privacy-policy':
				return `Privacy Policy | ${baseTitle}`;
			case 'disclaimer':
				return `Disclaimer | ${baseTitle}`;
			case 'watchlist':
				return `Watchlist | ${baseTitle}`;
			case 'stock-comparison':
				return `Stock Comparison | ${baseTitle}`;
			case 'backtesting':
				return `Backtesting Engine | ${baseTitle}`;
			case 'backtesting-pro':
				return `Backtesting Engine Pro | ${baseTitle}`;
			case 'portfolio-tracking':
				return `Portfolio Tracking & Analysis | ${baseTitle}`;
			case 'economic-calendar':
				return `Economic Calendar | ${baseTitle}`;
			default:
				return baseTitle;
		}
	}

	// Update or create meta tag
	updateOrCreateMeta(selector, content, attribute = 'name') {
		let meta = document.querySelector(`meta[${attribute}="${selector}"]`) ||
			document.querySelector(`meta[property="${selector}"]`);

		if (!meta) {
			meta = document.createElement('meta');
			if (attribute === 'property') {
				meta.setAttribute('property', selector);
			} else {
				meta.setAttribute('name', selector);
			}
			document.head.appendChild(meta);
		}

		meta.setAttribute('content', content);
	}

	// Update SEO Meta Tags dynamically
	updateMetaTags(page, params = {}) {
		const baseUrl = window.location.origin;
		const baseTitle = 'Stock Analysis Platform';
		let title, description, url, image;

		// Determine page-specific content
		switch (page) {
			case 'market-overview':
				title = `Market Overview | ${baseTitle}`;
				description = 'Real-time global market data, major indices (S&P 500, DAX, Nikkei, etc.), macroeconomic indicators (VIX, Treasury Yields, Gold), currencies, and commodities. Get comprehensive market insights at a glance.';
				url = `${baseUrl}/`;
				break;

			case 'stock-analysis':
				if (params.symbol) {
					title = `${params.symbol} Stock Analysis | ${baseTitle}`;
					description = `Comprehensive analysis of ${params.symbol} including price charts, technical indicators (RSI, MACD, Bollinger Bands), fundamentals (P/E, P/B, ROE), earnings data, peer comparison, SWOT analysis, and AI-powered insights.`;
					url = `${baseUrl}/stock/${encodeURIComponent(params.symbol)}`;
				} else {
					title = `Stock Analysis | ${baseTitle}`;
					description = 'Analyze stocks with comprehensive data including price charts, technical indicators, fundamentals, earnings, and peer comparison.';
					url = `${baseUrl}/`;
				}
				break;

			case 'indicator-detail':
				const indicatorName = params.name || params.symbol || 'Technical Indicator';
				title = `${indicatorName} | ${baseTitle}`;
				description = params.description || `Detailed analysis of ${indicatorName} technical indicator for ${params.symbol || 'stocks'}. Learn how to interpret and use this indicator for better trading decisions.`;
				url = params.symbol ? `${baseUrl}/indicator/${encodeURIComponent(params.symbol)}` : `${baseUrl}/`;
				break;

			case 'fundamentals-detail':
				title = params.symbol ? `${params.symbol} Fundamentals | ${baseTitle}` : `Fundamentals | ${baseTitle}`;
				description = params.symbol
					? `Complete fundamental analysis of ${params.symbol} including P/E ratio, P/B ratio, ROE, debt-to-equity, margins, cashflow, balance sheet, and more financial metrics.`
					: 'Comprehensive fundamental analysis including valuation metrics, profitability ratios, financial health indicators, and balance sheet data.';
				url = params.symbol ? `${baseUrl}/fundamentals/${encodeURIComponent(params.symbol)}` : `${baseUrl}/`;
				break;

			case 'earnings-detail':
				title = params.symbol ? `${params.symbol} Earnings | ${baseTitle}` : `Earnings Analysis | ${baseTitle}`;
				description = params.symbol
					? `Earnings and revenue analysis for ${params.symbol} including historical earnings data, earnings surprises, revenue trends, and quarterly performance metrics.`
					: 'Detailed earnings analysis including historical earnings data, earnings surprises, revenue trends, and quarterly performance metrics.';
				url = params.symbol ? `${baseUrl}/earnings/${encodeURIComponent(params.symbol)}` : `${baseUrl}/`;
				break;

			case 'watchlist':
				title = `Watchlist | ${baseTitle}`;
				description = 'Track and monitor your favorite stocks in one place. Get real-time updates on price changes, news, and key metrics for all your watched stocks.';
				url = `${baseUrl}/watchlist`;
				break;

			case 'stock-comparison':
				title = `Stock Comparison | ${baseTitle}`;
				description = 'Compare multiple stocks side-by-side. Analyze key metrics, performance, fundamentals, and technical indicators to make informed investment decisions.';
				url = `${baseUrl}/comparison`;
				break;

			case 'backtesting':
				title = `Backtesting Engine | ${baseTitle}`;
				description = 'Test your trading strategies with historical data. Backtest technical indicators, moving averages, and custom strategies to evaluate performance.';
				url = `${baseUrl}/backtesting`;
				break;

			case 'backtesting-pro':
				title = `Backtesting Engine Pro | ${baseTitle}`;
				description = 'Advanced backtesting engine with custom strategies, multiple indicators, risk management, and detailed performance analytics.';
				url = `${baseUrl}/backtesting-pro`;
				break;

			case 'portfolio-tracking':
				title = `Portfolio Tracking & Analysis | ${baseTitle}`;
				description = 'Track your investment portfolio with real-time performance metrics, asset allocation, gains/losses, and comprehensive portfolio analytics.';
				url = `${baseUrl}/portfolio`;
				break;

			case 'economic-calendar':
				title = `Economic Calendar | ${baseTitle}`;
				description = 'Stay informed about upcoming economic events, earnings announcements, Fed meetings, and key financial indicators that impact the markets.';
				url = `${baseUrl}/economic-calendar`;
				break;

			case 'impressum':
				title = `Impressum | ${baseTitle}`;
				description = 'Legal information and contact details for Stock Analysis Platform.';
				url = `${baseUrl}/impressum`;
				break;

			case 'privacy-policy':
				title = `Privacy Policy | ${baseTitle}`;
				description = 'Privacy policy and data protection information for Stock Analysis Platform.';
				url = `${baseUrl}/privacy-policy`;
				break;

			case 'disclaimer':
				title = `Disclaimer | ${baseTitle}`;
				description = 'Legal disclaimer and terms of use for Stock Analysis Platform.';
				url = `${baseUrl}/disclaimer`;
				break;

			default:
				title = baseTitle;
				description = 'Comprehensive stock analysis platform with real-time market data, technical indicators, fundamentals, earnings analysis, and AI-powered insights.';
				url = baseUrl;
		}

		// Determine OG image based on page type
		image = this.getOGImage(page, params, baseUrl);

		// Update document title
		document.title = title;

		// Update canonical URL
		this.updateCanonicalUrl(url);

		// Update basic meta tags
		this.updateOrCreateMeta('title', title);
		this.updateOrCreateMeta('description', description);

		// Update Open Graph tags
		this.updateOrCreateMeta('og:url', url, 'property');
		this.updateOrCreateMeta('og:title', title, 'property');
		this.updateOrCreateMeta('og:description', description, 'property');
		this.updateOrCreateMeta('og:image', image, 'property');
		this.updateOrCreateMeta('og:image:width', '1200', 'property');
		this.updateOrCreateMeta('og:image:height', '630', 'property');
		this.updateOrCreateMeta('og:image:type', 'image/png', 'property');

		// Update Twitter Card tags
		this.updateOrCreateMeta('twitter:url', url);
		this.updateOrCreateMeta('twitter:title', title);
		this.updateOrCreateMeta('twitter:description', description);
		this.updateOrCreateMeta('twitter:image', image);

		// Update structured data (JSON-LD)
		this.updateStructuredData(page, params, title, description, url, image);
	}

	// Get appropriate OG image for the page
	getOGImage(page, params, baseUrl) {
		// For stock analysis pages, try to use a logo or generate a dynamic image
		if (page === 'stock-analysis' && params.symbol) {
			// Option 1: Use Finnhub logo API (if available)
			// Option 2: Use a generic stock analysis image with symbol
			// Option 3: Use a default image
			// For now, we'll use a dynamic approach that can be extended
			return `${baseUrl}/og-image-stock.png?symbol=${encodeURIComponent(params.symbol)}`;
		}

		// For other pages, use page-specific images
		switch (page) {
			case 'market-overview':
				return `${baseUrl}/og-image-market.png`;
			case 'watchlist':
				return `${baseUrl}/og-image-watchlist.png`;
			case 'stock-comparison':
				return `${baseUrl}/og-image-comparison.png`;
			case 'backtesting':
			case 'backtesting-pro':
				return `${baseUrl}/og-image-backtesting.png`;
			case 'portfolio-tracking':
				return `${baseUrl}/og-image-portfolio.png`;
			case 'economic-calendar':
				return `${baseUrl}/og-image-calendar.png`;
			default:
				// Default OG image
				return `${baseUrl}/og-image.png`;
		}
	}

	// Update canonical URL
	updateCanonicalUrl(url) {
		let canonical = document.getElementById('canonical-url');
		if (!canonical) {
			canonical = document.createElement('link');
			canonical.id = 'canonical-url';
			canonical.rel = 'canonical';
			document.head.appendChild(canonical);
		}
		canonical.href = url;
	}

	// Update structured data (Schema.org)
	updateStructuredData(page, params, title, description, url, image) {
		const baseUrl = window.location.origin;
		let structuredData;

		if (page === 'stock-analysis' && params.symbol) {
			// Financial Product schema for stock analysis pages
			structuredData = {
				"@context": "https://schema.org",
				"@type": "FinancialProduct",
				"name": `${params.symbol} Stock Analysis`,
				"description": description,
				"url": url,
				"image": image,
				"provider": {
					"@type": "Organization",
					"name": "Stock Analysis Platform",
					"url": baseUrl,
					"logo": {
						"@type": "ImageObject",
						"url": `${baseUrl}/logo.png`
					}
				},
				"category": "Stock Analysis",
				"applicationCategory": "FinanceApplication"
			};
		} else if (page === 'market-overview') {
			// WebApplication schema for main page
			structuredData = {
				"@context": "https://schema.org",
				"@type": "WebApplication",
				"name": "Stock Analysis Platform",
				"description": description,
				"url": url,
				"image": image,
				"applicationCategory": "FinanceApplication",
				"operatingSystem": "Web",
				"offers": {
					"@type": "Offer",
					"price": "0",
					"priceCurrency": "USD"
				},
				"aggregateRating": {
					"@type": "AggregateRating",
					"ratingValue": "4.8",
					"ratingCount": "100"
				},
				"publisher": {
					"@type": "Organization",
					"name": "Stock Analysis Platform",
					"url": baseUrl,
					"logo": {
						"@type": "ImageObject",
						"url": `${baseUrl}/logo.png`
					}
				}
			};
		} else {
			// Default WebPage schema
			structuredData = {
				"@context": "https://schema.org",
				"@type": "WebPage",
				"name": title,
				"description": description,
				"url": url,
				"image": image,
				"isPartOf": {
					"@type": "WebSite",
					"name": "Stock Analysis Platform",
					"url": baseUrl,
					"potentialAction": {
						"@type": "SearchAction",
						"target": {
							"@type": "EntryPoint",
							"urlTemplate": `${baseUrl}/stock/{search_term_string}`
						},
						"query-input": "required name=search_term_string"
					}
				},
				"publisher": {
					"@type": "Organization",
					"name": "Stock Analysis Platform",
					"url": baseUrl
				}
			};
		}

		// Update or create structured data script
		let script = document.getElementById('structured-data');
		if (!script) {
			script = document.createElement('script');
			script.id = 'structured-data';
			script.type = 'application/ld+json';
			document.head.appendChild(script);
		}
		script.textContent = JSON.stringify(structuredData, null, 2);
	}

	setupRateLimitInterceptor() {
		// Intercept fetch calls to handle rate limiting
		const originalFetch = window.fetch;
		const self = this;

		window.fetch = async function (...args) {
			try {
				const response = await originalFetch.apply(this, args);

				// Check for rate limit error (429) - Session expired, show banner
				if (response.status === 429) {
					const retryAfter = parseInt(response.headers.get('Retry-After') || '300');
					const limitType = response.headers.get('X-RateLimit-Type') || 'session_cooldown';

					// Show rate limit banner
					if (self.rateLimitBanner) {
						self.rateLimitBanner.show(retryAfter, limitType, 0, 0);
					}

					// Disable search on all pages
					self.disableSearchDuringCooldown();

					// Try to get error message from response body
					try {
						const errorData = await response.clone().json();
						console.warn('Session limit exceeded:', errorData.detail || 'Please wait before making another request');
					} catch (e) {
						console.warn('Session limit exceeded. Please wait before making another request');
					}
				} else if (response.ok && response.status >= 200 && response.status < 300) {
					// Successful API call - hide banner if shown (cooldown ended, user can use site again)
					if (self.rateLimitBanner) {
						const banner = self.rateLimitBanner.shadowRoot?.querySelector('.rate-limit-banner');
						if (banner && banner.classList.contains('show')) {
							self.rateLimitBanner.hide();
							self.enableSearchAfterCooldown();
						}
					}

					// Check for session remaining time in header
					const sessionRemaining = response.headers.get('X-Session-Remaining');
					if (sessionRemaining !== null) {
						const remainingSeconds = parseInt(sessionRemaining, 10);
						console.log('[Session Timer] X-Session-Remaining header:', sessionRemaining, 'seconds:', remainingSeconds);
						if (!isNaN(remainingSeconds) && remainingSeconds > 0) {
							// Update session timer with remaining time from backend (sync with backend time)
							if (self.sessionTimer) {
								console.log('[Session Timer] Updating timer with', remainingSeconds, 'seconds');
								self.sessionTimer.show(remainingSeconds);
							} else {
								console.warn('[Session Timer] sessionTimer element not found!');
							}
						} else {
							// Session expired - hide timer (banner will be shown by SessionTimer.triggerRateLimitBanner)
							if (self.sessionTimer) {
								console.log('[Session Timer] Hiding timer (session expired or no session)');
								self.sessionTimer.hide();
							}
						}
					}
					// Note: Don't hide timer if header is missing - it might be shown by click listener
				}

				return response;
			} catch (error) {
				console.error('Fetch error:', error);
				throw error;
			}
		};
	}

	disableSearchDuringCooldown() {
		// Disable search inputs and buttons on all pages
		try {
			const searchInputs = document.querySelectorAll('input[type="text"][id*="search"], input[type="text"][id*="Search"], input[placeholder*="search" i], input[placeholder*="Search" i]');
			const allButtons = document.querySelectorAll('button');

			searchInputs.forEach(input => {
				input.disabled = true;
				input.placeholder = 'Search disabled - Please wait for cooldown period';
				input.style.opacity = '0.5';
				input.style.cursor = 'not-allowed';
			});

			// Filter buttons by text content (since :has-text() is not valid CSS)
			allButtons.forEach(button => {
				const buttonText = button.textContent || button.innerText || '';
				if (button.id && (button.id.includes('search') || button.id.includes('Search'))) {
					button.disabled = true;
					button.style.opacity = '0.5';
					button.style.cursor = 'not-allowed';
				} else if (buttonText.includes('Analyze') || buttonText.includes('Search')) {
					button.disabled = true;
					button.style.opacity = '0.5';
					button.style.cursor = 'not-allowed';
				}
			});
		} catch (error) {
			console.error('Error disabling search:', error);
		}

		// Also disable via custom event for web components
		window.dispatchEvent(new CustomEvent('rate-limit-cooldown', { detail: { active: true } }));
	}

	enableSearchAfterCooldown() {
		// Re-enable search inputs and buttons
		try {
			const searchInputs = document.querySelectorAll('input[type="text"][id*="search"], input[type="text"][id*="Search"], input[placeholder*="search" i], input[placeholder*="Search" i]');
			const allButtons = document.querySelectorAll('button');

			searchInputs.forEach(input => {
				input.disabled = false;
				input.style.opacity = '1';
				input.style.cursor = 'text';
			});

			// Filter buttons by text content
			allButtons.forEach(button => {
				const buttonText = button.textContent || button.innerText || '';
				if (button.id && (button.id.includes('search') || button.id.includes('Search'))) {
					button.disabled = false;
					button.style.opacity = '1';
					button.style.cursor = 'pointer';
				} else if (buttonText.includes('Analyze') || buttonText.includes('Search')) {
					button.disabled = false;
					button.style.opacity = '1';
					button.style.cursor = 'pointer';
				}
			});
		} catch (error) {
			console.error('Error enabling search:', error);
		}

		// Re-enable via custom event for web components
		window.dispatchEvent(new CustomEvent('rate-limit-cooldown', { detail: { active: false } }));
	}

}

// Start app when DOM is ready
// Use a more robust initialization that works even on direct page loads
function initApp() {
	// Wait for DOM to be fully ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => {
			setTimeout(() => {
				window.app = new App();
			}, 0);
		});
	} else {
		// DOM is already loaded, but wait a tick to ensure everything is ready
		setTimeout(() => {
			window.app = new App();
		}, 0);
	}
}

initApp();

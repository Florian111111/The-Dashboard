import { getCachedData, setCachedData } from '../utils/cache.js';

import { API_BASE_URL } from '../config.js';

export class StockNews extends HTMLElement {
	constructor() {
		super();
		this.symbol = null;
		this.currentHandle = null;
		this.widgetLoaded = false;
		this.widgetContainer = null;
	}

	static get observedAttributes() {
		return ['symbol'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'symbol' && newValue !== oldValue) {
			this.symbol = newValue;
			const newHandle = this.getCompanyTwitterHandle(this.symbol);
			
			// Only reload if handle actually changed
			if (newHandle !== this.currentHandle) {
				this.currentHandle = newHandle;
				this.widgetLoaded = false;
				if (this.innerHTML) {
					this.render();
					this.loadTwitterWidget();
					this.loadFinnhubNews();
				}
			} else if (this.symbol !== oldValue) {
				// Symbol changed but handle is same, only reload news
				this.loadFinnhubNews();
				this.loadAnalystData();
				this.loadEarningsData();
			}
		}
	}

	connectedCallback() {
		this.symbol = this.getAttribute('symbol');
		this.currentHandle = this.getCompanyTwitterHandle(this.symbol);
		this.render();
		this.loadTwitterWidget();
		this.loadFinnhubNews();
		this.loadAnalystData();
		this.loadEarningsData();
		
		// Apply saved theme
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.classList.add('light-mode');
		}
	}

	render() {
		const companyHandle = this.getCompanyTwitterHandle(this.symbol);
		const companyUrl = companyHandle ? `https://twitter.com/${companyHandle}` : null;
		const query = encodeURIComponent(`$${this.symbol} OR ${this.symbol} stock`);
		const searchUrl = `https://twitter.com/search?q=${query}&src=typed_query&f=live`;

		this.innerHTML = `
			<style>
			:host, stock-news {
				display: block;
				background: #121821;
				border: 1px solid #1f2a37;
				border-radius: 12px;
				padding: 20px;
			}
			:host(.light-mode), stock-news.light-mode {
				background: #d5dce5;
				border-color: #a0aab8;
				width: 100%;
				max-width: 100%;
				box-sizing: border-box;
				overflow-x: hidden;
			}
				h3 {
					margin: 0 0 20px 0;
					color: #e6edf3;
					font-size: 1.2rem;
				}
				:host(.light-mode) h3, stock-news.light-mode h3 {
					color: #0a0a0a;
				}
				.embeds-container {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
					gap: 20px;
					width: 100%;
					max-width: 100%;
					box-sizing: border-box;
				}
				.embed-section {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 12px;
				}
				:host(.light-mode) .embed-section, stock-news.light-mode .embed-section {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.embed-title {
					color: #4ea1f3;
					font-size: 0.9rem;
					font-weight: 600;
					margin-bottom: 12px;
				}
				.embed-wrapper {
					min-height: 200px;
					background: #0b0f14;
					position: relative;
				}
				:host(.light-mode) .embed-wrapper, stock-news.light-mode .embed-wrapper {
					background: #d5dce5;
				}
				.three-column-section {
					display: grid;
					grid-template-columns: repeat(3, 1fr);
					gap: 15px;
					width: 100%;
					max-width: 100%;
					box-sizing: border-box;
				}
				.embed-section {
					width: 100%;
					max-width: 100%;
					box-sizing: border-box;
					overflow: hidden;
				}
				@media (max-width: 1200px) {
					.three-column-section {
						grid-template-columns: 1fr;
					}
				}
				.direct-link {
					text-align: center;
					padding: 20px;
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					height: 100%;
					min-height: 120px;
				}
				.direct-link-button {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					gap: 8px;
					background: linear-gradient(135deg, #4ea1f3 0%, #3b82f6 100%);
					color: #ffffff;
					text-decoration: none;
					font-weight: 600;
					padding: 14px 28px;
					border-radius: 10px;
					transition: all 0.3s ease;
					margin-top: 15px;
					font-size: 1rem;
					box-shadow: 0 4px 12px rgba(78, 161, 243, 0.3);
					border: none;
					cursor: pointer;
				}
				.direct-link-button:hover {
					background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
					transform: translateY(-2px);
					box-shadow: 0 6px 16px rgba(78, 161, 243, 0.4);
				}
				.direct-link-button:active {
					transform: translateY(0);
				}
				.direct-link-button::after {
					content: '→';
					font-size: 1.2em;
					transition: transform 0.3s ease;
				}
				.direct-link-button:hover::after {
					transform: translateX(4px);
				}
				.direct-link-text {
					color: #9fb0c0;
					margin-bottom: 10px;
					font-size: 0.9rem;
					line-height: 1.5;
				}
				:host(.light-mode) .direct-link-text, stock-news.light-mode .direct-link-text {
					color: #1a1a1a;
				}
				.direct-link-note {
					color: #6b7280;
					font-size: 0.8rem;
					margin-top: 10px;
					font-style: italic;
				}
				:host(.light-mode) .direct-link-note, stock-news.light-mode .direct-link-note {
					color: #4a5568;
				}
				.widget-container {
					min-height: 400px;
					width: 100%;
				}
				.rate-limit-fallback {
					text-align: center;
					padding: 40px 20px;
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					min-height: 300px;
				}
				.rate-limit-message {
					color: #f59e0b;
					font-size: 1rem;
					margin-bottom: 15px;
					font-weight: 600;
				}
				.rate-limit-description {
					color: #9fb0c0;
					font-size: 0.9rem;
					margin-bottom: 20px;
					line-height: 1.5;
				}
				:host(.light-mode) .rate-limit-description, stock-news.light-mode .rate-limit-description {
					color: #0a0a0a;
				}
				.news-list {
					max-height: 200px;
					overflow-y: auto;
				}
				.news-item {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 15px;
					margin-bottom: 12px;
					transition: border-color 0.2s;
				}
				:host(.light-mode) .news-item, stock-news.light-mode .news-item {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.news-item:hover {
					border-color: #2d3a4a;
				}
				.news-item-header {
					display: flex;
					justify-content: space-between;
					align-items: flex-start;
					margin-bottom: 10px;
					gap: 10px;
				}
				.news-item-title {
					color: #4ea1f3;
					font-weight: 600;
					font-size: 0.95rem;
					line-height: 1.4;
					text-decoration: none;
					flex: 1;
				}
				.news-item-title:hover {
					color: #3b82f6;
					text-decoration: underline;
				}
				.news-item-date {
					color: #6b7280;
					font-size: 0.85rem;
					white-space: nowrap;
				}
				:host(.light-mode) .news-item-date, stock-news.light-mode .news-item-date {
					color: #4a5568;
				}
				.news-item-source {
					color: #9fb0c0;
					font-size: 0.85rem;
					margin-top: 8px;
				}
				:host(.light-mode) .news-item-source, stock-news.light-mode .news-item-source {
					color: #1a1a1a;
				}
				.news-summary {
					color: #9fb0c0;
					font-size: 0.85rem;
					margin-top: 8px;
					line-height: 1.5;
				}
				:host(.light-mode) .news-summary, stock-news.light-mode .news-summary {
					color: #0a0a0a;
				}
				.loading {
					color: #9fb0c0;
					text-align: center;
					padding: 40px;
				}
				:host(.light-mode) .loading, stock-news.light-mode .loading {
					color: #1a1a1a;
				}
				.error {
					color: #ef4444;
					text-align: center;
					padding: 40px;
				}
				.analyst-chart-container {
					margin: 15px 0;
					position: relative;
					height: 200px;
				}
				.analyst-bar-chart {
					display: flex;
					align-items: flex-end;
					justify-content: space-around;
					height: 120px;
					gap: 8px;
					padding: 8px 8px 35px 8px;
					background: #0b0f14;
					border-radius: 8px;
					border: 1px solid #1f2a37;
					position: relative;
				}
				.analyst-bar {
					flex: 1;
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: flex-end;
					position: relative;
					height: 100%;
				}
				.bar {
					width: 100%;
					border-radius: 4px 4px 0 0;
					transition: all 0.3s ease;
					min-height: 8px;
					position: relative;
					margin-bottom: 5px;
					box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
				}
				.bar:hover {
					opacity: 0.8;
					transform: scaleY(1.05);
				}
				.bar-strong-buy { background: linear-gradient(180deg, #10b981 0%, #059669 100%); }
				.bar-buy { background: linear-gradient(180deg, #34d399 0%, #10b981 100%); }
				.bar-hold { background: linear-gradient(180deg, #6b7280 0%, #4b5563 100%); }
				.bar-sell { background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%); }
				.bar-strong-sell { background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%); }
				.bar-label {
					color: #9fb0c0;
					font-size: 0.75rem;
					text-align: center;
					position: absolute;
					bottom: -30px;
					left: 50%;
					transform: translateX(-50%);
					white-space: nowrap;
					font-weight: 500;
					letter-spacing: 0.3px;
				}
				.bar-value {
					color: #e6edf3;
					font-size: 1rem;
					font-weight: 700;
					position: absolute;
					top: -32px;
					left: 50%;
					transform: translateX(-50%);
					white-space: nowrap;
					background: rgba(11, 15, 20, 0.95);
					padding: 4px 8px;
					border-radius: 6px;
					border: 1px solid rgba(31, 42, 55, 0.8);
					box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
					backdrop-filter: blur(4px);
					z-index: 2;
				}
				.earnings-calendar {
					padding: 15px;
				}
				.chart-container {
					position: relative;
					height: 250px;
					margin: 10px 0;
					padding: 8px;
					background: #0b0f14;
					border-radius: 8px;
					border: 1px solid #1f2a37;
					width: 100%;
					max-width: 100%;
					box-sizing: border-box;
					overflow: hidden;
				}
				.chart-container canvas {
					max-width: 100%;
					height: auto;
				}
				.earnings-labels {
					font-family: inherit;
				}
				.price-target-container {
					padding: 20px;
					background: #0b0f14;
					border-radius: 8px;
					border: 1px solid #1f2a37;
					margin-top: 15px;
				}
				.price-target-bar {
					position: relative;
					width: 100%;
					height: 40px;
					background: #1f2a37;
					border-radius: 20px;
					margin: 20px 0;
				}
				.price-target-marker {
					position: absolute;
					width: 12px;
					height: 12px;
					border-radius: 50%;
					top: 50%;
					transform: translateY(-50%);
					z-index: 3;
				}
				.price-target-marker.low {
					background: #6b7280;
					left: 0;
				}
				.price-target-marker.high {
					background: #6b7280;
					right: 0;
				}
				.price-target-marker.average {
					background: #4ea1f3;
					border: 2px solid #0b0f14;
					box-shadow: 0 0 0 2px #4ea1f3;
				}
				.price-target-marker.current {
					background: #e6edf3;
					border: 2px solid #0b0f14;
					box-shadow: 0 0 0 2px #e6edf3;
				}
				.price-target-label {
					position: absolute;
					top: -25px;
					font-size: 0.75rem;
					color: #9fb0c0;
					white-space: nowrap;
				}
				.price-target-value-box {
					position: absolute;
					top: -60px;
					left: 50%;
					transform: translateX(-50%);
					background: #121821;
					border: 2px solid #4ea1f3;
					border-radius: 6px;
					padding: 8px 12px;
					z-index: 4;
				}
				.price-target-value-box.current {
					border-color: #e6edf3;
					top: 50px;
				}
				.price-target-value {
					color: #e6edf3;
					font-weight: 600;
					font-size: 1.1rem;
				}
				.price-target-value-label {
					color: #9fb0c0;
					font-size: 0.7rem;
					margin-top: 2px;
				}
				.earnings-item {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 12px;
					margin-bottom: 10px;
				}
				.earnings-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 8px;
				}
				.earnings-date {
					color: #4ea1f3;
					font-weight: 600;
					font-size: 0.95rem;
				}
				.earnings-period {
					color: #9fb0c0;
					font-size: 0.85rem;
				}
				.earnings-metrics {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
					gap: 8px;
					margin-top: 10px;
				}
				.earnings-metric {
					background: #121821;
					border-radius: 6px;
					padding: 8px;
				}
				.earnings-metric-label {
					color: #9fb0c0;
					font-size: 0.75rem;
					margin-bottom: 4px;
				}
				.earnings-metric-value {
					color: #e6edf3;
					font-weight: 600;
					font-size: 0.9rem;
				}
				.surprise-positive {
					color: #10b981;
				}
				.surprise-negative {
					color: #ef4444;
				}
				@media (max-width: 900px) {
					.embeds-container {
						grid-template-columns: 1fr;
					}
				}
			</style>
			<h3 style="margin-top: 20px;">Latest News</h3>
			<div class="embeds-container">
				<div class="embed-section">
					<div class="embed-title">Company Official Account</div>
					<div class="embed-wrapper" id="company-timeline" style="min-height: 120px; max-height: 120px;">
						${companyHandle ? `
							<div class="direct-link" id="fallback-link" style="padding: 20px 20px; min-height: 120px;">
								<div class="direct-link-text">View recent discussions about ${this.symbol}'s official account on X/Twitter</div>
								<a href="${companyUrl}" target="_blank" class="direct-link-button">
									View @${companyHandle} on X/Twitter →
								</a>
								<div class="direct-link-note">Direct link to X/Twitter search</div>
							</div>
						` : `
							<div class="direct-link" style="padding: 20px 20px; min-height: 120px;">
								<div class="direct-link-text">Company Twitter account not found for this symbol.</div>
							</div>
						`}
					</div>
				</div>
				<div class="embed-section">
					<div class="embed-title">Stock Discussion ($${this.symbol || 'SYMBOL'})</div>
					<div class="embed-wrapper" id="search-timeline" style="min-height: 120px; max-height: 120px;">
						<div class="direct-link" style="padding: 20px 20px; min-height: 120px;">
							<div class="direct-link-text">View recent discussions about $${this.symbol} on X/Twitter</div>
							<a href="${searchUrl}" target="_blank" class="direct-link-button">
								View $${this.symbol} Discussion on X/Twitter →
							</a>
							<div class="direct-link-note">Direct link to X/Twitter search</div>
						</div>
					</div>
				</div>
				<div class="embed-section">
					<div class="embed-title">Latest News (Finnhub)</div>
					<div class="embed-wrapper" id="finnhub-news" style="min-height: 200px; max-height: 200px;">
						<div class="loading">Loading news...</div>
					</div>
				</div>
			</div>
		`;
	}

	loadTwitterWidget() {
		if (!this.symbol || !this.currentHandle) return;

		// Load Twitter Widgets script only once
		if (!window.twttr) {
			const existingScript = document.getElementById('twitter-wjs');
			if (existingScript) {
				// Script already loading, wait for it
				existingScript.onload = () => {
					if (window.twttr) {
						window.twttr.ready(() => this.mountWidget());
					}
				};
				return;
			}

			const script = document.createElement('script');
			script.src = 'https://platform.twitter.com/widgets.js';
			script.charset = 'utf-8';
			script.async = true;
			script.id = 'twitter-wjs';
			document.head.appendChild(script);
			
			script.onload = () => {
				if (window.twttr) {
					window.twttr.ready(() => this.mountWidget());
				}
			};
		} else {
			window.twttr.ready(() => this.mountWidget());
		}
	}

	mountWidget() {
		if (!this.currentHandle || this.widgetLoaded) return;

		const container = this.querySelector('#company-timeline');
		if (!container) return;

		// Don't clear the container - keep the button visible
		// Only add widget if it doesn't exist
		if (container.querySelector('.widget-container')) {
			return; // Widget already being loaded
		}

		// Create widget link
		const companyLink = document.createElement('a');
		companyLink.className = 'twitter-timeline';
		companyLink.setAttribute('data-theme', 'dark');
		companyLink.setAttribute('data-height', '600');
		companyLink.setAttribute('data-chrome', 'noheader nofooter');
		companyLink.setAttribute('data-dnt', 'true');
		companyLink.href = `https://twitter.com/${this.currentHandle}?ref_src=twsrc%5Etfw`;
		companyLink.textContent = `Tweets by @${this.currentHandle}`;
		companyLink.style.display = 'none'; // Hide the link, we just need it for the widget

		// Create wrapper
		this.widgetContainer = document.createElement('div');
		this.widgetContainer.className = 'widget-container';
		this.widgetContainer.id = `company-widget-${Date.now()}`;
		this.widgetContainer.style.display = 'none'; // Hide initially
		this.widgetContainer.appendChild(companyLink);

		container.appendChild(this.widgetContainer);

		// Load widget
		if (window.twttr && window.twttr.widgets) {
			window.twttr.widgets.load(this.widgetContainer).then(() => {
				console.log('[StockNews] Widget loaded successfully');
				
				// Check after 3 seconds if iframe was created
				setTimeout(() => {
					const iframe = this.widgetContainer.querySelector('iframe');
					if (iframe && iframe.src && !iframe.src.includes('429')) {
						// Widget loaded successfully - hide the button and show widget
						const fallbackLink = container.querySelector('#fallback-link');
						if (fallbackLink) {
							fallbackLink.style.display = 'none';
						}
						this.widgetContainer.style.display = 'block';
						this.widgetLoaded = true;
					} else {
						// Widget failed - keep button visible
						this.widgetContainer.style.display = 'none';
					}
				}, 3000);
			}).catch((error) => {
				console.error('[StockNews] Error loading widget:', error);
				// Keep button visible on error
				this.widgetContainer.style.display = 'none';
			});

			// Fallback after 5 seconds - if widget didn't load, keep button visible
			setTimeout(() => {
				const iframe = this.widgetContainer.querySelector('iframe');
				if (!iframe || !iframe.src || iframe.src.includes('429')) {
					// Widget failed - ensure button is visible
					this.widgetContainer.style.display = 'none';
					const fallbackLink = container.querySelector('#fallback-link');
					if (fallbackLink) {
						fallbackLink.style.display = 'block';
					}
				}
			}, 5000);
		} else {
			// No twttr available - keep button visible
			this.widgetContainer.style.display = 'none';
		}
	}

	showRateLimitFallback() {
		if (!this.currentHandle) return;

		const container = this.querySelector('#company-timeline');
		if (!container) return;

		// Don't replace the button - just ensure it's visible
		const fallbackLink = container.querySelector('#fallback-link');
		if (fallbackLink) {
			fallbackLink.style.display = 'block';
		}

		// Hide widget container if it exists
		if (this.widgetContainer) {
			this.widgetContainer.style.display = 'none';
		}
		this.widgetLoaded = false;
	}

	async loadFinnhubNews() {
		if (!this.symbol) return;

		const container = this.querySelector('#finnhub-news');
		if (!container) return;

		// Check aggregated overview cache first (most efficient)
		const overviewData = getCachedData(this.symbol, 'stock-overview');
		let cachedData = null;
		if (overviewData && overviewData.news) {
			console.log('[News] Using data from aggregated overview cache');
			cachedData = overviewData.news;
		} else {
			// Check individual cache as fallback
			cachedData = getCachedData(this.symbol, 'news');
		}
		
		if (cachedData && cachedData.news) {
			console.log('[News] Using cached data');
			if (cachedData.news.length === 0) {
				container.innerHTML = `
					<div class="direct-link">
						<div class="direct-link-text">No recent news found for ${this.symbol}</div>
					</div>
				`;
				return;
			}
			
			// Render news items from cache
			container.innerHTML = `
				<div class="news-list">
					${cachedData.news.map(news => {
						const date = new Date(news.datetime * 1000);
						const formattedDate = date.toLocaleDateString('en-US', { 
							year: 'numeric', 
							month: 'short', 
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit'
						});
						
						return `
							<div class="news-item">
								<div class="news-item-header">
									<a href="${news.url}" target="_blank" class="news-item-title">
										${this.escapeHtml(news.headline)}
									</a>
									<div class="news-item-date" title="${date.toLocaleString()}">
										${formattedDate}
									</div>
								</div>
								${news.summary ? `
									<div class="news-summary">
										${this.escapeHtml(news.summary.substring(0, 200))}${news.summary.length > 200 ? '...' : ''}
									</div>
								` : ''}
								${news.source ? `
									<div class="news-item-source">
										Source: ${this.escapeHtml(news.source)}
									</div>
								` : ''}
							</div>
						`;
					}).join('')}
				</div>
			`;
			return;
		}

		container.innerHTML = '<div class="loading">Loading news...</div>';

		try {
			// Check stock-overview cache first
			const overviewData = getCachedData(this.symbol, 'stock-overview');
			let data = null;
			
			if (overviewData && overviewData.news) {
				console.log('[News] Using data from stock-overview cache');
				data = overviewData.news;
			} else {
				// Fetch if not in cache
				const response = await fetch(`${API_BASE_URL}/api/news/${this.symbol}`);
				
				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.detail || `Backend returned ${response.status}`);
				}

				data = await response.json();
			}
			
			// Cache the news data
			setCachedData(this.symbol, 'news', data);
			
			if (!data.news || data.news.length === 0) {
				container.innerHTML = `
					<div class="direct-link">
						<div class="direct-link-text">No recent news found for ${this.symbol}</div>
					</div>
				`;
				return;
			}

			// Render news items
			container.innerHTML = `
				<div class="news-list">
					${data.news.map(news => {
						const date = new Date(news.datetime * 1000);
						const formattedDate = date.toLocaleDateString('en-US', { 
							year: 'numeric', 
							month: 'short', 
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit'
						});
						
						return `
							<div class="news-item">
								<div class="news-item-header">
									<a href="${news.url}" target="_blank" class="news-item-title">
										${this.escapeHtml(news.headline)}
									</a>
									<div class="news-item-date" title="${date.toLocaleString()}">
										${formattedDate}
									</div>
								</div>
								${news.summary ? `
									<div class="news-summary">
										${this.escapeHtml(news.summary.substring(0, 200))}${news.summary.length > 200 ? '...' : ''}
									</div>
								` : ''}
								${news.source ? `
									<div class="news-item-source">
										Source: ${this.escapeHtml(news.source)}
									</div>
								` : ''}
							</div>
						`;
					}).join('')}
				</div>
			`;

		} catch (error) {
			console.error('Error loading Finnhub news:', error);
			container.innerHTML = `
				<div class="error">
					Error loading news: ${error.message}<br>
					<small style="color: #6b7280;">Check backend logs and ensure Finnhub API is configured.</small>
				</div>
			`;
		}
	}

	escapeHtml(text) {
		if (!text) return '';
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	async loadAnalystData() {
		if (!this.symbol) return;
		const container = this.querySelector('#analyst-data');
		if (!container) return;
		container.innerHTML = '<div class="loading">Loading analyst data...</div>';
		try {
			const response = await fetch(`${API_BASE_URL}/api/analyst/${this.symbol}`);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.detail || `Backend returned ${response.status}`);
			}
			const data = await response.json();
			let html = '<div style="padding: 15px;">';
			if (data.priceTarget) {
				const target = data.priceTarget;
				html += `<div id="price-target-container" style="margin-bottom: 15px;"></div>`;
			}
			if (data.recommendations && Object.keys(data.recommendations).length > 0) {
				const rec = data.recommendations;
				const strongBuy = rec.strongBuy || 0;
				const buy = rec.buy || 0;
				const hold = rec.hold || 0;
				const sell = rec.sell || 0;
				const strongSell = rec.strongSell || 0;
				const total = strongBuy + buy + hold + sell + strongSell;
				const buyRatio = total > 0 ? (strongBuy + buy) / total : 0;
				let recommendation = 'Neutral';
				let recommendationColor = '#6b7280';
				if (buyRatio >= 0.6) {
					recommendation = 'Buy';
					recommendationColor = '#10b981';
				} else if (buyRatio <= 0.3) {
					recommendation = 'Sell';
					recommendationColor = '#ef4444';
				}
				// Scale bars to fill the full height (use total as max, but ensure minimum height for visibility)
				// Use total as maxValue so bars are proportional to their share of total recommendations
				const maxValue = total;
				
				html += `<div style="padding: 12px; background: #0b0f14; border-radius: 8px; border: 1px solid #1f2a37; margin-top: 15px;">
					<div style="color: #4ea1f3; font-weight: 600; margin-bottom: 10px; font-size: 0.95rem; letter-spacing: 0.3px;">Analyst Recommendation</div>
					<div style="color: ${recommendationColor}; font-size: 0.95rem; font-weight: 700; margin-bottom: 18px; text-align: left; letter-spacing: 0.3px; padding-left: 4px;">
						Analysts recommend: ${recommendation}
					</div>
					<div class="analyst-bar-chart" style="height: 150px; padding: 10px 10px 40px 10px;">
						<div class="analyst-bar">
							${strongBuy > 0 ? `<div class="bar bar-strong-buy" style="height: ${(strongBuy / maxValue) * 100}%;" title="Strong Buy: ${strongBuy}"></div>` : ''}
							${strongBuy > 0 ? `<div class="bar-value">${strongBuy}</div>` : ''}
							<div class="bar-label">Strong Buy</div>
						</div>
						<div class="analyst-bar">
							${buy > 0 ? `<div class="bar bar-buy" style="height: ${(buy / maxValue) * 100}%;" title="Buy: ${buy}"></div>` : ''}
							${buy > 0 ? `<div class="bar-value">${buy}</div>` : ''}
							<div class="bar-label">Buy</div>
						</div>
						<div class="analyst-bar">
							${hold > 0 ? `<div class="bar bar-hold" style="height: ${(hold / maxValue) * 100}%;" title="Hold: ${hold}"></div>` : ''}
							${hold > 0 ? `<div class="bar-value">${hold}</div>` : ''}
							<div class="bar-label">Hold</div>
						</div>
						<div class="analyst-bar">
							${sell > 0 ? `<div class="bar bar-sell" style="height: ${(sell / maxValue) * 100}%;" title="Sell: ${sell}"></div>` : ''}
							${sell > 0 ? `<div class="bar-value">${sell}</div>` : ''}
							<div class="bar-label">Sell</div>
						</div>
						<div class="analyst-bar">
							${strongSell > 0 ? `<div class="bar bar-strong-sell" style="height: ${(strongSell / maxValue) * 100}%;" title="Strong Sell: ${strongSell}"></div>` : ''}
							${strongSell > 0 ? `<div class="bar-value">${strongSell}</div>` : ''}
							<div class="bar-label">Strong Sell</div>
						</div>
					</div>
				</div>`;
			}
			if (html === '<div style="padding: 15px;">') {
				html += '<div style="color: #9fb0c0; text-align: center;">No analyst data available</div>';
			}
			html += '</div>';
			container.innerHTML = html;
			
			// Render price target chart if available
			if (data.priceTarget) {
				setTimeout(() => {
					this.renderPriceTarget(data.priceTarget, data.currentPrice);
				}, 100);
			}
			
			// Check for recommendation trends (timeline)
			console.log('[Analyst] Checking for recommendation trends:', data.recommendationTrends);
			if (data.recommendationTrends && Array.isArray(data.recommendationTrends) && data.recommendationTrends.length > 0) {
				console.log('[Analyst] Found recommendation trends, rendering timeline...');
				setTimeout(() => {
					this.renderRecommendationTimeline(data.recommendationTrends);
				}, 400);
			} else {
				console.log('[Analyst] No recommendation trends available');
			}
		} catch (error) {
			console.error('Error loading analyst data:', error);
			container.innerHTML = `<div class="error">Error loading analyst data: ${error.message}</div>`;
		}
	}
	
	renderPriceTarget(priceTarget, currentPrice) {
		const container = this.querySelector('#price-target-container');
		if (!container) return;
		
		const high = priceTarget.targetHigh;
		const low = priceTarget.targetLow;
		const mean = priceTarget.targetMean;
		
		if (!high || !low || !mean) {
			// Fallback to simple display
			container.innerHTML = `
				<div style="padding: 12px; background: #0b0f14; border-radius: 8px; border: 1px solid #1f2a37;">
					<div style="color: #4ea1f3; font-weight: 600; margin-bottom: 8px;">Price Target</div>
					${high ? `<div style="color: #9fb0c0; font-size: 0.9rem;">High: <span style="color: #e6edf3; font-weight: 600;">$${high.toFixed(2)}</span></div>` : ''}
					${mean ? `<div style="color: #9fb0c0; font-size: 0.9rem; margin-top: 4px;">Mean: <span style="color: #e6edf3; font-weight: 600;">$${mean.toFixed(2)}</span></div>` : ''}
					${low ? `<div style="color: #9fb0c0; font-size: 0.9rem; margin-top: 4px;">Low: <span style="color: #e6edf3; font-weight: 600;">$${low.toFixed(2)}</span></div>` : ''}
				</div>
			`;
			return;
		}
		
		const range = high - low;
		const meanPercent = ((mean - low) / range) * 100;
		const currentPercent = currentPrice ? ((currentPrice - low) / range) * 100 : null;
		
		container.innerHTML = `
			<div class="price-target-container">
				<div style="color: #4ea1f3; font-weight: 600; margin-bottom: 15px; font-size: 1.1rem;">Analyst Price Targets</div>
				<div class="price-target-bar">
					<div class="price-target-marker low" style="left: 0;">
						<div class="price-target-label" style="left: 0;">$${low.toFixed(2)}</div>
					</div>
					<div class="price-target-marker high" style="right: 0;">
						<div class="price-target-label" style="right: 0;">$${high.toFixed(2)}</div>
						<div style="position: absolute; right: 0; top: 20px; font-size: 0.7rem; color: #9fb0c0;">High</div>
					</div>
					<div class="price-target-marker average" style="left: ${meanPercent}%;">
						<div class="price-target-value-box">
							<div class="price-target-value">$${mean.toFixed(2)}</div>
							<div class="price-target-value-label">Average</div>
						</div>
					</div>
					${currentPrice && currentPrice < high && currentPrice > low ? `
						<div class="price-target-marker current" style="left: ${currentPercent}%;">
							<div class="price-target-value-box current">
								<div class="price-target-value">$${currentPrice.toFixed(2)}</div>
								<div class="price-target-value-label">Current</div>
							</div>
						</div>
					` : currentPrice ? `
						<div class="price-target-marker current" style="left: ${currentPrice < low ? '0' : '100'}%;">
							<div class="price-target-value-box current">
								<div class="price-target-value">$${currentPrice.toFixed(2)}</div>
								<div class="price-target-value-label">Current</div>
							</div>
						</div>
					` : ''}
				</div>
			</div>
		`;
	}
	
	renderEarningsChart(earnings) {
		console.log('[Earnings] renderEarningsChart called with:', earnings);
		
		// Find container first, then canvas
		const earningsContainer = this.querySelector('#earnings-data');
		if (!earningsContainer) {
			console.error('[Earnings] Earnings container not found');
			return;
		}
		
		const canvas = earningsContainer.querySelector('#earnings-chart');
		if (!canvas) {
			console.error('[Earnings] Canvas element not found in earnings container');
			return;
		}
		
		if (!window.Chart) {
			console.error('[Earnings] Chart.js not loaded. window.Chart:', window.Chart);
			return;
		}
		
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			console.error('[Earnings] Could not get canvas context');
			return;
		}
		
		console.log('[Earnings] Canvas and context ready, creating chart...');
		
		// Prepare data with better formatting
		const labels = earnings.map(e => {
			const dateStr = e.date || e.period || '';
			if (!dateStr) return 'N/A';
			try {
				const date = new Date(dateStr);
				if (!isNaN(date.getTime())) {
					// Format as Q1 FY25, Q2 FY25, etc.
					const quarter = Math.floor(date.getMonth() / 3) + 1;
					const year = date.getFullYear();
					const shortYear = year.toString().slice(-2);
					return `Q${quarter} FY${shortYear}`;
				}
			} catch (e) {}
			return dateStr;
		});
		
		// Prepare data arrays for Chart.js
		const epsActual = [];
		const epsEstimate = [];
		const actualColors = [];
		const actualBorders = [];
		
		earnings.forEach((e, index) => {
			const actual = e.epsActual !== null && e.epsActual !== undefined ? e.epsActual : null;
			const estimate = e.epsEstimate !== null && e.epsEstimate !== undefined ? e.epsEstimate : null;
			
			epsEstimate.push(estimate);
			epsActual.push(actual);
			
			// Determine color based on beat/miss
			if (actual !== null && estimate !== null) {
				if (actual > estimate) {
					// Beat - green
					actualColors.push('#10b981');
					actualBorders.push('#0b0f14');
				} else if (actual < estimate) {
					// Miss - red
					actualColors.push('#ef4444');
					actualBorders.push('#0b0f14');
				} else {
					// Equal - gray
					actualColors.push('#6b7280');
					actualBorders.push('#0b0f14');
				}
			} else {
				actualColors.push('#6b7280');
				actualBorders.push('#0b0f14');
			}
		});
		
		// Destroy existing chart if it exists
		if (this.earningsChart) {
			this.earningsChart.destroy();
		}
		
		// Use Chart.js with custom point colors via plugin
		const Chart = window.Chart;
		
		this.earningsChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: labels,
				datasets: [
					// Estimates (hollow circles, dashed line)
					{
						label: 'EPS Estimate',
						data: epsEstimate,
						borderColor: '#6b7280',
						backgroundColor: 'transparent',
						borderWidth: 2,
						borderDash: [5, 5],
						pointRadius: 8,
						pointBackgroundColor: 'transparent',
						pointBorderColor: '#6b7280',
						pointBorderWidth: 2,
						pointHoverRadius: 10,
						tension: 0.1,
						order: 2
					},
					// Actual (filled circles, no line, custom colors per point)
					{
						label: 'EPS Actual',
						data: epsActual,
						borderColor: '#10b981',
						backgroundColor: '#10b981',
						borderWidth: 0,
						pointRadius: 8,
						pointBackgroundColor: actualColors,
						pointBorderColor: actualBorders,
						pointBorderWidth: 3,
						pointHoverRadius: 10,
						tension: 0,
						order: 1,
						showLine: false
					}
				]
			},
			options: {
				maintainAspectRatio: false,
				responsive: true,
				interaction: {
					intersect: false,
					mode: 'index'
				},
				plugins: {
					title: {
						display: true,
						text: 'Earnings Per Share',
						color: '#e6edf3',
						font: { size: 18, weight: '600' },
						padding: { bottom: 20 }
					},
					legend: {
						display: false
					},
					tooltip: {
						backgroundColor: '#121821',
						titleColor: '#e6edf3',
						bodyColor: '#9fb0c0',
						borderColor: '#1f2a37',
						borderWidth: 1,
						padding: 12,
						callbacks: {
							label: function(context) {
								const label = context.dataset.label || '';
								const value = context.parsed.y;
								return `${label}: $${value.toFixed(2)}`;
							},
							afterBody: (items) => {
								const index = items[0].dataIndex;
								const earning = earnings[index];
								const lines = [];
								if (earning.epsActual !== null && earning.epsActual !== undefined && 
									earning.epsEstimate !== null && earning.epsEstimate !== undefined) {
									const diff = earning.epsActual - earning.epsEstimate;
									const isBeat = diff > 0;
									const sign = isBeat ? '+' : '';
									const color = isBeat ? '#10b981' : '#ef4444';
									const beatMiss = isBeat ? 'Beat' : 'Missed';
									lines.push(`${beatMiss}: ${sign}$${Math.abs(diff).toFixed(2)}`);
									if (earning.epsSurprisePercent !== null && earning.epsSurprisePercent !== undefined) {
										lines.push(`${sign}${earning.epsSurprisePercent.toFixed(1)}% Surprise`);
									}
								}
								return lines;
							}
						}
					}
				},
				scales: {
					x: {
						ticks: { 
							color: '#9fb0c0',
							font: { size: 11 }
						},
						grid: { 
							color: 'rgba(255,255,255,0.06)',
							display: true
						}
					},
					y: {
						ticks: { 
							color: '#9fb0c0',
							font: { size: 11 },
							callback: function(value) {
								return '$' + value.toFixed(2);
							}
						},
						grid: { 
							color: 'rgba(255,255,255,0.06)',
							display: true
						},
						title: {
							display: false
						}
					}
				}
			}
		});
		
		// Add custom labels below chart
		this.addEarningsLabels(earnings, labels);
	}
	
	addEarningsLabels(earnings, labels) {
		const chartContainer = this.querySelector('#earnings-chart')?.parentElement;
		if (!chartContainer) return;
		
		// Remove existing labels
		const existingLabels = chartContainer.querySelector('.earnings-labels');
		if (existingLabels) existingLabels.remove();
		
		const labelsContainer = document.createElement('div');
		labelsContainer.className = 'earnings-labels';
		labelsContainer.style.cssText = `
			display: flex;
			justify-content: space-around;
			margin-top: 15px;
			padding: 0 10px;
		`;
		
		earnings.forEach((earning, index) => {
			const labelDiv = document.createElement('div');
			labelDiv.style.cssText = `
				flex: 1;
				text-align: center;
				font-size: 0.75rem;
			`;
			
			const actual = earning.epsActual;
			const estimate = earning.epsEstimate;
			
			if (actual !== null && actual !== undefined && estimate !== null && estimate !== undefined) {
				const diff = actual - estimate;
				const isBeat = diff > 0;
				const sign = isBeat ? '+' : '';
				const color = isBeat ? '#10b981' : '#ef4444';
				const beatMiss = isBeat ? 'Beat' : 'Missed';
				
				labelDiv.innerHTML = `
					<div style="color: ${color}; font-weight: 600; margin-bottom: 2px;">${beatMiss}</div>
					<div style="color: #9fb0c0; font-size: 0.7rem;">${sign}$${Math.abs(diff).toFixed(2)}</div>
				`;
			} else if (estimate !== null && estimate !== undefined) {
				// Future earnings - show date
				const dateStr = earning.date || earning.period || '';
				let dateLabel = '';
				if (dateStr) {
					try {
						const date = new Date(dateStr);
						if (!isNaN(date.getTime())) {
							dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
						}
					} catch (e) {}
				}
				labelDiv.innerHTML = `
					<div style="color: #9fb0c0; font-size: 0.7rem;">${dateLabel || 'TBD'}</div>
				`;
			}
			
			labelsContainer.appendChild(labelDiv);
		});
		
		chartContainer.appendChild(labelsContainer);
	}
	
	async loadEarningsData() {
		if (!this.symbol) {
			console.log('[Earnings] No symbol provided');
			return;
		}

		const container = this.querySelector('#earnings-data');
		if (!container) {
			console.log('[Earnings] Container not found');
			return;
		}

		container.innerHTML = '<div class="loading">Loading earnings data...</div>';

		try {
			console.log(`[Earnings] Fetching earnings for ${this.symbol}...`);
			const response = await fetch(`${API_BASE_URL}/api/earnings/${this.symbol}`);
			
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.detail || `Backend returned ${response.status}`);
			}

			const data = await response.json();
			console.log('[Earnings] Received data:', data);
			
			if (!data.earnings || data.earnings.length === 0) {
				console.log('[Earnings] No earnings data available');
				container.innerHTML = `
					<div style="padding: 20px; text-align: center; color: #9fb0c0;">
						No earnings data available for ${this.symbol}
					</div>
				`;
				return;
			}

			// Render earnings chart only (calendar moved to separate page)
			const earningsForChart = data.earnings.slice(0, 8).reverse(); // Reverse to show oldest first
			const hasEarningsData = earningsForChart.some(e => e.epsActual !== null && e.epsActual !== undefined);
			
			console.log('[Earnings] Earnings for chart:', earningsForChart);
			console.log('[Earnings] Has earnings data:', hasEarningsData);
			
			let html = '';
			
			if (hasEarningsData) {
				html += `<div style="margin-bottom: 0; cursor: pointer;" class="earnings-chart-clickable" data-symbol="${this.symbol}">
					<div class="chart-container" style="position: relative;">
						<canvas id="earnings-chart"></canvas>
						<div style="position: absolute; top: 10px; right: 10px; background: rgba(11, 15, 20, 0.8); padding: 6px 12px; border-radius: 6px; color: #4ea1f3; font-size: 0.75rem; font-weight: 600; pointer-events: none;">
							Click to view details →
						</div>
					</div>
				</div>`;
			} else {
				html += '<div style="padding: 20px; text-align: center; color: #9fb0c0;">No earnings chart data available</div>';
			}
			
			container.innerHTML = html;
			
			// Add click handler for earnings chart
			const earningsChartClickable = container.querySelector('.earnings-chart-clickable');
			if (earningsChartClickable) {
				earningsChartClickable.addEventListener('click', () => {
					window.dispatchEvent(new CustomEvent('navigate', {
						detail: { page: 'earnings-detail', symbol: this.symbol }
					}));
				});
			}
			
			// Render Chart.js chart if data available
			if (hasEarningsData) {
				console.log('[Earnings] Rendering chart with data:', earningsForChart);
				console.log('[Earnings] Chart.js available:', typeof window.Chart !== 'undefined');
				// Wait for DOM to be ready
				setTimeout(() => {
					try {
						console.log('[Earnings] Looking for canvas in container...');
						const canvas = container.querySelector('#earnings-chart');
						console.log('[Earnings] Canvas element:', canvas);
						if (!canvas) {
							console.error('[Earnings] Canvas not found in container after render');
							console.log('[Earnings] Container HTML:', container.innerHTML.substring(0, 500));
							return;
						}
						console.log('[Earnings] Canvas found, rendering chart...');
						this.renderEarningsChart(earningsForChart);
					} catch (error) {
						console.error('[Earnings] Error rendering chart:', error);
						console.error('[Earnings] Error stack:', error.stack);
						const chartContainer = container.querySelector('.chart-container');
						if (chartContainer) {
							chartContainer.innerHTML = `
								<div style="padding: 20px; text-align: center; color: #ef4444;">
									Error rendering chart: ${error.message}
									<br><small style="color: #6b7280;">Check console for details</small>
								</div>
							`;
						}
					}
				}, 300);
			} else {
				console.log('[Earnings] No earnings data to chart');
			}

		} catch (error) {
			console.error('Error loading earnings data:', error);
			container.innerHTML = `
				<div class="error">
					Error loading earnings data: ${error.message}
				</div>
			`;
		}
	}

	formatNumber(num) {
		if (num === null || num === undefined) return 'N/A';
		if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
		if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
		if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
		if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
		return num.toFixed(2);
	}

	renderRecommendationTimeline(trends) {
		console.log('[Analyst] Rendering recommendation timeline with:', trends);
		console.log('[Analyst] Trends array length:', trends.length);
		
		// Find or create container for timeline
		let timelineContainer = this.querySelector('#recommendation-timeline-container');
		console.log('[Analyst] Timeline container found:', !!timelineContainer);
		
		if (!timelineContainer) {
			console.error('[Analyst] Timeline container not found in DOM');
			return;
		}
		
		timelineContainer.innerHTML = '<div style="color: #4ea1f3; font-weight: 600; margin-bottom: 15px; font-size: 0.95rem;">Analyst Recommendations Timeline</div><div class="chart-container" style="height: 280px; width: 100%; max-width: 100%; position: relative; box-sizing: border-box; overflow: hidden;"><canvas id="recommendation-timeline-chart" style="max-height: 280px; max-width: 100%;"></canvas></div>';
		console.log('[Analyst] Timeline container HTML set');
		
		setTimeout(() => {
			console.log('[Analyst] Looking for canvas element...');
			const canvas = timelineContainer.querySelector('#recommendation-timeline-chart');
			console.log('[Analyst] Canvas found:', !!canvas);
			console.log('[Analyst] Chart.js available:', typeof window.Chart !== 'undefined');
			
			if (!canvas) {
				console.error('[Analyst] Canvas element not found');
				return;
			}
			
			if (!window.Chart) {
				console.error('[Analyst] Chart.js not available');
				return;
			}
			
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				console.error('[Analyst] Could not get canvas context');
				return;
			}
			
			console.log('[Analyst] Canvas and context ready');
			
			// Group by month
			const monthlyData = {};
			console.log('[Analyst] Processing trends:', trends);
			
			trends.forEach((trend, index) => {
				console.log(`[Analyst] Trend ${index}:`, trend);
				
				// Try different date formats
				let date = null;
				
				// Try period as Unix timestamp (seconds)
				if (trend.period) {
					date = new Date(trend.period * 1000);
					if (isNaN(date.getTime())) {
						// Try as milliseconds
						date = new Date(trend.period);
					}
				}
				
				// Try date field
				if ((!date || isNaN(date.getTime())) && trend.date) {
					date = new Date(trend.date);
				}
				
				// If still no valid date, use index as fallback
				if (!date || isNaN(date.getTime())) {
					console.warn(`[Analyst] No valid date for trend ${index}, using fallback`);
					// Use a date based on index (months ago)
					date = new Date();
					date.setMonth(date.getMonth() - (trends.length - index - 1));
				}
				
				const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
				console.log(`[Analyst] Month key for trend ${index}:`, monthKey);
				
				if (!monthlyData[monthKey]) {
					monthlyData[monthKey] = {
						strongBuy: 0,
						buy: 0,
						hold: 0,
						sell: 0,
						strongSell: 0
					};
				}
				monthlyData[monthKey].strongBuy += trend.strongBuy || 0;
				monthlyData[monthKey].buy += trend.buy || 0;
				monthlyData[monthKey].hold += trend.hold || 0;
				monthlyData[monthKey].sell += trend.sell || 0;
				monthlyData[monthKey].strongSell += trend.strongSell || 0;
			});
			
			// Sort labels chronologically by date, not alphabetically
			const labelsWithDates = Object.keys(monthlyData).map(key => {
				// Parse the month key (e.g., "Aug 2025") to a date
				const parts = key.split(' ');
				const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
				const monthIndex = monthNames.indexOf(parts[0]);
				const year = parseInt(parts[1]);
				return {
					key: key,
					date: new Date(year, monthIndex, 1)
				};
			}).sort((a, b) => a.date - b.date);
			
			const labels = labelsWithDates.map(l => l.key);
			console.log('[Analyst] Monthly data keys (sorted):', labels);
			console.log('[Analyst] Monthly data:', monthlyData);
			
			if (labels.length === 0) {
				console.log('[Analyst] No valid timeline data - showing message');
				timelineContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #9fb0c0;">No timeline data available</div>';
				return;
			}
			
			const strongBuyData = labels.map(l => monthlyData[l].strongBuy);
			const buyData = labels.map(l => monthlyData[l].buy);
			const holdData = labels.map(l => monthlyData[l].hold);
			const sellData = labels.map(l => monthlyData[l].sell);
			const strongSellData = labels.map(l => monthlyData[l].strongSell);
			
			// Calculate totals for display
			const totals = labels.map((l, i) => 
				strongBuyData[i] + buyData[i] + holdData[i] + sellData[i] + strongSellData[i]
			);
			
			// Destroy existing chart if it exists
			if (this.recommendationTimelineChart) {
				this.recommendationTimelineChart.destroy();
			}
			
			console.log('[Analyst] Creating timeline chart with labels:', labels);
			console.log('[Analyst] Data arrays:', {
				strongBuy: strongBuyData,
				buy: buyData,
				hold: holdData,
				sell: sellData,
				strongSell: strongSellData,
				totals: totals
			});
			
			try {
				this.recommendationTimelineChart = new window.Chart(ctx, {
					type: 'bar',
					data: {
						labels: labels,
						datasets: [
							{
								label: 'Strong Buy',
								data: strongBuyData,
								backgroundColor: '#10b981',
								stack: 'stack1'
							},
							{
								label: 'Buy',
								data: buyData,
								backgroundColor: '#34d399',
								stack: 'stack1'
							},
							{
								label: 'Hold',
								data: holdData,
								backgroundColor: '#6b7280',
								stack: 'stack1'
							},
							{
								label: 'Sell',
								data: sellData,
								backgroundColor: '#f59e0b',
								stack: 'stack1'
							},
							{
								label: 'Strong Sell',
								data: strongSellData,
								backgroundColor: '#ef4444',
								stack: 'stack1'
							}
						]
					},
					options: {
						maintainAspectRatio: false,
						responsive: true,
						plugins: {
							title: {
								display: true,
								text: 'Analyst Recommendations',
								color: '#e6edf3',
								font: { size: 14, weight: '600' },
								padding: { bottom: 10 }
							},
							legend: {
								display: true,
								position: 'right',
								labels: {
									color: '#9fb0c0',
									font: { size: 10 },
									padding: 8,
									usePointStyle: true,
									pointStyle: 'circle'
								}
							},
							tooltip: {
								backgroundColor: '#121821',
								titleColor: '#e6edf3',
								bodyColor: '#9fb0c0',
								borderColor: '#1f2a37',
								borderWidth: 1,
								callbacks: {
									footer: (items) => {
										const index = items[0].dataIndex;
										return `Total: ${totals[index]}`;
									}
								}
							}
						},
						scales: {
							x: {
								stacked: true,
								ticks: { 
									color: '#9fb0c0',
									font: { size: 11 }
								},
								grid: { display: false }
							},
							y: {
								stacked: true,
								ticks: { 
									color: '#9fb0c0',
									font: { size: 10 },
									stepSize: 3
								},
								grid: { color: 'rgba(255,255,255,0.06)' },
								beginAtZero: true
							}
						}
					}
				});
			
				// Add total labels above bars using Chart.js animation callback
				this.recommendationTimelineChart.options.animation = {
					onComplete: () => {
						const meta = this.recommendationTimelineChart.getDatasetMeta(0);
						const ctx = this.recommendationTimelineChart.ctx;
						
						labels.forEach((label, index) => {
							const total = totals[index];
							if (total > 0 && meta.data[index]) {
								const bar = meta.data[index];
								const x = bar.x;
								const y = bar.y;
								
								ctx.save();
								ctx.fillStyle = '#e6edf3';
								ctx.font = 'bold 12px Inter, sans-serif';
								ctx.textAlign = 'center';
								ctx.textBaseline = 'bottom';
								ctx.fillText(total.toString(), x, y - 8);
								ctx.restore();
							}
						});
					}
				};
				
				// Also add labels on update
				const originalUpdate = this.recommendationTimelineChart.update;
				this.recommendationTimelineChart.update = function() {
					originalUpdate.call(this);
					const meta = this.getDatasetMeta(0);
					const ctx = this.ctx;
					
					labels.forEach((label, index) => {
						const total = totals[index];
						if (total > 0 && meta.data[index]) {
							const bar = meta.data[index];
							const x = bar.x;
							const y = bar.y;
							
							ctx.save();
							ctx.fillStyle = '#e6edf3';
							ctx.font = 'bold 12px Inter, sans-serif';
							ctx.textAlign = 'center';
							ctx.textBaseline = 'bottom';
							ctx.fillText(total.toString(), x, y - 8);
							ctx.restore();
						}
					});
				};
				
				// Trigger update to show totals
				this.recommendationTimelineChart.update();
				console.log('[Analyst] Timeline chart created successfully');
			} catch (error) {
				console.error('[Analyst] Error creating timeline chart:', error);
				timelineContainer.innerHTML = `
					<div style="padding: 20px; text-align: center; color: #ef4444;">
						Error rendering timeline chart: ${error.message}
					</div>
				`;
			}
		}, 200);
	}

	getCompanyTwitterHandle(symbol) {
		if (!symbol) return null;
		const companyMap = {
			'AAPL': 'Apple', 'MSFT': 'Microsoft', 'GOOGL': 'Google', 'GOOG': 'Google',
			'AMZN': 'amazon', 'META': 'Meta', 'TSLA': 'Tesla', 'NVDA': 'nvidia',
			'JPM': 'jpmorgan', 'V': 'Visa', 'JNJ': 'JNJNews', 'WMT': 'Walmart',
			'PG': 'ProcterGamble', 'MA': 'Mastercard', 'UNH': 'UnitedHealthGrp',
			'HD': 'HomeDepot', 'DIS': 'Disney', 'BAC': 'BankofAmerica', 'ADBE': 'Adobe',
			'CRM': 'salesforce', 'XOM': 'exxonmobil', 'VZ': 'Verizon', 'CVX': 'Chevron',
			'COST': 'Costco', 'ABBV': 'abbvie', 'AVGO': 'Broadcom', 'PEP': 'pepsi',
			'TMO': 'thermofisher', 'CSCO': 'Cisco', 'MCD': 'McDonalds', 'ABT': 'AbbottNews',
			'ACN': 'Accenture', 'WFC': 'WellsFargo', 'DHR': 'DanaherCorp', 'LIN': 'Lindeplc',
			'NKE': 'Nike', 'PM': 'AltriaNews', 'TXN': 'TXInstruments', 'BMY': 'BMSNews',
			'RTX': 'RaytheonTech', 'UPS': 'UPS', 'QCOM': 'Qualcomm', 'SPGI': 'SPGlobal',
			'AMGN': 'Amgen', 'LOW': 'Lowes', 'INTU': 'Intuit', 'CAT': 'CaterpillarInc',
			'GE': 'generalelectric', 'AXP': 'AmericanExpress', 'BKNG': 'Bookingcom',
			'GS': 'GoldmanSachs', 'AMAT': 'Applied4Tech', 'SAP': 'SAP', 'DELL': 'Dell',
			'AMD': 'AMD', 'INTC': 'intel', 'ORCL': 'Oracle', 'IBM': 'IBM', 'CSX': 'CSX',
			'CMCSA': 'Comcast', 'ADP': 'ADP', 'ISRG': 'IntuitiveSurg', 'VRTX': 'VertexPharma'
		};
		return companyMap[symbol.toUpperCase()] || null;
	}
}

customElements.define('stock-news', StockNews);

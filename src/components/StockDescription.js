import { getCachedData, setCachedData } from '../utils/cache.js';
import { API_BASE_URL } from '../config.js';

export class StockDescription extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.symbol = null;
		this.description = null;
	}

	static get observedAttributes() {
		return ['symbol'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'symbol' && newValue !== oldValue) {
			this.symbol = newValue;
			if (this.shadowRoot && this.shadowRoot.innerHTML && this.symbol) {
				this.loadDescription();
			}
		}
	}

	connectedCallback() {
		this.symbol = this.getAttribute('symbol');
		this.shadowRoot.innerHTML = `
			<style>
			:host {
				display: block;
				background: #121821;
				border: 1px solid #1f2a37;
				border-radius: 12px;
				padding: 20px;
				height: 100%;
				box-sizing: border-box;
			}
			:host(.light-mode) {
				background: #d5dce5;
				border-color: #a0aab8;
			}
				h3 {
					margin: 0 0 15px 0;
					color: #e6edf3;
					font-size: 1.2rem;
				}
				:host(.light-mode) h3 {
					color: #0a0a0a;
				}
				.description-content {
					color: #9fb0c0;
					line-height: 1.6;
					font-size: 0.95rem;
					max-height: calc(100% - 50px);
					overflow-y: auto;
					padding-right: 8px;
				}
				:host(.light-mode) .description-content {
					color: #1a1a1a;
				}
				.description-content::-webkit-scrollbar {
					width: 6px;
				}
				.description-content::-webkit-scrollbar-track {
					background: #0b0f14;
					border-radius: 3px;
				}
				:host(.light-mode) .description-content::-webkit-scrollbar-track {
					background: #c0c9d4;
				}
				.description-content::-webkit-scrollbar-thumb {
					background: #1f2a37;
					border-radius: 3px;
				}
				:host(.light-mode) .description-content::-webkit-scrollbar-thumb {
					background: #a0aab8;
				}
			.description-content::-webkit-scrollbar-thumb:hover {
				background: #233044;
			}
		.dividend-tiles {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
			gap: 10px;
			margin-top: 15px;
			padding-top: 15px;
			border-top: 1px solid #1f2a37;
		}
		.price-changes-tiles {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 10px;
			margin-top: 15px;
			padding-top: 15px;
			border-top: 1px solid #1f2a37;
		}
		:host(.light-mode) .price-changes-tiles {
			border-top-color: #a0aab8;
		}
		:host(.light-mode) .dividend-tiles {
			border-top-color: #a0aab8;
		}
		.dividend-item {
			background: #0b0f14;
			border: 1px solid #1f2a37;
			border-radius: 8px;
			padding: 10px;
		}
		:host(.light-mode) .dividend-item {
			background: #c0c9d4;
			border-color: #a0aab8;
		}
		.dividend-label {
			color: #9fb0c0;
			font-size: 0.75rem;
			margin-bottom: 4px;
		}
		:host(.light-mode) .dividend-label {
			color: #2a2a2a;
		}
		.dividend-value {
			color: #e6edf3;
			font-weight: 600;
			font-size: 0.9rem;
		}
		:host(.light-mode) .dividend-value {
			color: #0a0a0a;
		}
		.dividend-value.positive {
			color: #10b981;
		}
		.dividend-value.negative {
			color: #ef4444;
		}
		:host(.light-mode) .dividend-value.positive {
			color: #059669;
		}
		:host(.light-mode) .dividend-value.negative {
			color: #dc2626;
		}
		.loading {
			color: #9fb0c0;
			font-style: italic;
		}
		.error {
			color: #ef4444;
		}
			.progress-container {
				width: 100%;
				height: 4px;
				background: #0b0f14;
				border-radius: 2px;
				overflow: hidden;
				margin-bottom: 15px;
			}
			:host(.light-mode) .progress-container {
				background: #c0c9d4;
			}
			.progress-bar {
				height: 100%;
				background: linear-gradient(90deg, #4ea1f3, #3b82f6, #2563eb);
				border-radius: 2px;
				width: 0%;
				transition: width 0.2s ease;
			}
			.loading-text {
				color: #9fb0c0;
				font-size: 0.85rem;
				margin-top: 8px;
				text-align: center;
			}
			:host(.light-mode) .loading-text {
				color: #1a1a1a;
			}
				.company-info {
					margin-bottom: 15px;
					padding-bottom: 15px;
					border-bottom: 1px solid #1f2a37;
				}
				.company-info-item {
					margin-bottom: 8px;
					font-size: 0.9rem;
				}
				.company-info-label {
					color: #4ea1f3;
					font-weight: 600;
					display: inline-block;
					min-width: 100px;
				}
			.company-info-value {
				color: #e6edf3;
			}
			:host(.light-mode) .company-info-value {
				color: #0a0a0a;
			}
			:host(.light-mode) .company-info {
				border-bottom-color: #a0aab8;
			}
			:host(.light-mode) .description-content > div[style*="border-top"] {
				border-top-color: #a0aab8 !important;
			}
			:host(.light-mode) .loading {
				color: #1a1a1a;
			}
		</style>
			<h3>Description</h3>
			<div id="progress-container" class="progress-container" style="display: none;">
				<div class="progress-bar" id="progress-bar"></div>
			</div>
			<div class="description-content" id="description-content">
				<div class="loading">Loading company description...</div>
			</div>
		`;
		
		// Apply saved theme
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.classList.add('light-mode');
		}

		if (this.symbol) {
			this.loadDescription();
		}
	}

	async loadDescription() {
		if (!this.symbol) return;

		const contentEl = this.shadowRoot.getElementById('description-content');
		const progressContainer = this.shadowRoot.getElementById('progress-container');
		const progressBar = this.shadowRoot.getElementById('progress-bar');
		
		// Check cache first
		const cachedData = getCachedData(this.symbol, 'description');
		if (cachedData && cachedData.description) {
			console.log('[Description] Using cached data');
			// Use cached company info if available, otherwise use defaults
			const companyInfo = cachedData.companyInfo || {
				name: this.symbol,
				sector: 'N/A',
				industry: 'N/A',
				website: 'N/A',
				employees: 'N/A',
				country: 'N/A',
				city: 'N/A'
			};
			
			this.description = cachedData.description;
			// Render cached data immediately (without waiting for dividends/price-changes)
			await this.renderDescription(contentEl, cachedData.description, companyInfo, true);
			
			// If we have cached dividend data, update the UI immediately
			if (cachedData.dividendYield !== undefined || cachedData.dividendRate !== undefined) {
				const dividendYieldEl = contentEl.querySelector('#dividend-yield-value');
				const dividendRateEl = contentEl.querySelector('#dividend-rate-value');
				
				if (dividendYieldEl && cachedData.dividendYield !== undefined && cachedData.dividendYield !== null) {
					dividendYieldEl.textContent = `${cachedData.dividendYield.toFixed(2)}%`;
				} else if (dividendYieldEl) {
					dividendYieldEl.textContent = 'N/A';
				}
				
				if (dividendRateEl && cachedData.dividendRate !== undefined && cachedData.dividendRate !== null) {
					dividendRateEl.textContent = `$${cachedData.dividendRate.toFixed(2)}`;
				} else if (dividendRateEl) {
					dividendRateEl.textContent = 'N/A';
				}
			}
			
			// Still load fresh data in background to update cache
			this.loadAdditionalData(contentEl);
			return;
		}
		
		// Check aggregated overview cache for fundamentals and dividends
		const overviewData = getCachedData(this.symbol, 'stock-overview');
		if (overviewData) {
			console.log('[Description] Using data from aggregated overview cache');
			// Extract data from overview
			const fundamentalsData = overviewData.fundamentals || null;
			const dividendData = overviewData.dividends || null;
			
			// Process company info from fundamentals if available
			let companyInfo = {
				name: this.symbol,
				sector: 'N/A',
				industry: 'N/A',
				website: 'N/A'
			};
			
			if (fundamentalsData) {
				const profile = fundamentalsData?.quoteSummary?.result?.[0]?.summaryProfile || fundamentalsData?.profile || {};
				companyInfo = {
					name: profile.longName || profile.name || this.symbol,
					sector: profile.sector || 'N/A',
					industry: profile.industry || 'N/A',
					website: profile.weburl || profile.website || 'N/A'
				};
			}
			
			// Render with cached data
			const description = fundamentalsData?.quoteSummary?.result?.[0]?.summaryProfile?.longBusinessSummary || 
			                     fundamentalsData?.quoteSummary?.result?.[0]?.summaryProfile?.description ||
			                     fundamentalsData?.quoteSummary?.result?.[0]?.summaryProfile?.businessSummary ||
			                     fundamentalsData?.profile?.description ||
			                     `${companyInfo.name} (${this.symbol}) is a company operating in the ${companyInfo.industry} industry.`;
			
			await this.renderDescription(contentEl, description, companyInfo, false, dividendData ? dividendData : null);
			
			// Still load fresh data in background to update cache
			this.loadAdditionalData(contentEl);
			return;
		}
		
		// Show progress bar
		if (progressContainer && progressBar) {
			progressContainer.style.display = 'block';
			progressBar.style.width = '0%';
		}
		
		const startTime = Date.now();
		const estimatedDuration = 15000; // 15 seconds to reach 95%
		let dataLoaded = false;
		
		// Realistic progress: fast at start, slows down near the end
		const progressInterval = setInterval(() => {
			if (progressBar) {
				const elapsed = Date.now() - startTime;
				// Use easing function: fast start, slow end (ease-out cubic)
				const t = Math.min(elapsed / estimatedDuration, 1); // Can go to 100% of duration
				const progress = 1 - Math.pow(1 - t, 3); // Cubic ease-out
				const progressPercent = Math.min(progress * 95, 95); // Scale to max 95%
				progressBar.style.width = `${progressPercent}%`;
				
				// Stop interval when 15 seconds have passed and data is loaded
				if (elapsed >= estimatedDuration && dataLoaded) {
					clearInterval(progressInterval);
					if (progressBar) {
						progressBar.style.width = '100%';
					}
					setTimeout(() => {
						if (progressContainer) {
							progressContainer.style.display = 'none';
						}
					}, 200);
				}
			}
		}, 50);
		
		try {
			// OPTIMIZATION: Check stock-overview cache first, then try fundamentals endpoint
			const cachedOverview = getCachedData(this.symbol, 'stock-overview');
			let cachedFundamentals = null;
			
			if (cachedOverview && cachedOverview.fundamentals) {
				console.log('[Description] Using fundamentals from stock-overview cache');
				cachedFundamentals = cachedOverview.fundamentals;
			} else {
				// Try fundamentals endpoint (much faster - uses Finnhub, not yfinance)
				console.log('[Description] Trying fast fundamentals endpoint...');
				let response = await fetch(`${API_BASE_URL}/api/fundamentals/${this.symbol}`);
				if (response.ok) {
					cachedFundamentals = await response.json();
				}
			}
			
			let description = null;
			let companyInfo = {};
			let gotDescriptionFromFundamentals = false;
			
			if (cachedFundamentals) {
				const profile = cachedFundamentals?.quoteSummary?.result?.[0]?.summaryProfile || {};
				
				// Try to get description from fundamentals first (faster than yfinance)
				description = profile.longBusinessSummary || profile.description || profile.businessSummary || null;
				
				if (description && description.length > 50) {
					// We got description from fundamentals - much faster!
					console.log('[Description] Got description from fundamentals endpoint (fast path)');
					gotDescriptionFromFundamentals = true;
					companyInfo = {
						name: profile.longName || profile.name || this.symbol,
						sector: profile.sector || 'N/A',
						industry: profile.industry || 'N/A',
						website: profile.weburl || profile.website || 'N/A',
						employees: profile.fullTimeEmployees || 'N/A',
						country: profile.country || 'N/A',
						city: profile.city || 'N/A'
					};
					
					this.description = description;
					
					// Render immediately with description from fundamentals
					await this.renderDescription(contentEl, description, companyInfo, true);
					
					// Mark data as loaded and hide progress immediately
					dataLoaded = true;
					if (progressInterval) {
						clearInterval(progressInterval);
					}
					if (progressBar) {
						progressBar.style.width = '100%';
					}
					setTimeout(() => {
						if (progressContainer) {
							progressContainer.style.display = 'none';
						}
					}, 100);
					
					// Load dividends and price changes in background (non-blocking)
					this.loadAdditionalData(contentEl);
					
					// Cache the description along with company info
					setCachedData(this.symbol, 'description', { 
						description: description,
						companyInfo: companyInfo
					});
					
					return; // Exit early - we got everything we need from the fast endpoint!
				}
			}
			
			// Fallback: If fundamentals didn't have description, try dedicated description endpoint
			// (This uses yfinance which is slower, but has more complete descriptions)
			console.log('[Description] Fundamentals endpoint did not have description, trying yfinance endpoint...');
			response = await fetch(`${API_BASE_URL}/api/description/${this.symbol}`);
			
			// If rate limited (429), we already tried fundamentals, so show error
			if (!response.ok && response.status === 429) {
				console.warn('[Description] Rate limited on yfinance endpoint');
				// Clear interval on error
				if (progressInterval) {
					clearInterval(progressInterval);
				}
				if (progressContainer) {
					progressContainer.style.display = 'none';
				}
				// No description available even from fallback
				contentEl.innerHTML = `<div class="error">Description temporarily unavailable due to rate limiting. Please try again later.</div>`;
				return;
			}
			
			if (!response.ok) {
				// Clear interval on error
				if (progressInterval) {
					clearInterval(progressInterval);
				}
				if (progressContainer) {
					progressContainer.style.display = 'none';
				}
				if (response.status === 404) {
					contentEl.innerHTML = `<div class="error">No description available for this company.</div>`;
					return;
				}
				throw new Error(`Backend returned ${response.status}`);
			}

			const data = await response.json();
			description = data.description || 'No description available.';

			this.description = description;
			
			// Render description IMMEDIATELY with basic info (don't wait for company info)
			const basicCompanyInfo = {
				name: this.symbol,
				sector: 'N/A',
				industry: 'N/A',
				website: 'N/A',
				employees: 'N/A',
				country: 'N/A',
				city: 'N/A'
			};
			
			// Render immediately with basic info - this shows the description right away
			await this.renderDescription(contentEl, description, basicCompanyInfo, true);
			
			// Mark data as loaded (but keep progress bar running until 15 seconds)
			dataLoaded = true;
			
			// Check stock-overview cache first, then fetch if needed
			const cachedOverviewForUpdate = getCachedData(this.symbol, 'stock-overview');
			let cachedFundamentalsForUpdate = null;
			let cachedDividendForUpdate = null;
			
			if (cachedOverviewForUpdate) {
				console.log('[Description] Using data from stock-overview cache for background update');
				cachedFundamentalsForUpdate = cachedOverviewForUpdate.fundamentals || null;
				cachedDividendForUpdate = cachedOverviewForUpdate.dividends || null;
			}
			
			// Only fetch if not in cache
			if (!cachedFundamentalsForUpdate || !cachedDividendForUpdate) {
				Promise.all([
					cachedFundamentalsForUpdate ? Promise.resolve(cachedFundamentalsForUpdate) : fetch(`${API_BASE_URL}/api/fundamentals/${this.symbol}`)
						.then(r => r.ok ? r.json() : null)
						.catch(() => null),
					cachedDividendForUpdate ? Promise.resolve(cachedDividendForUpdate) : fetch(`${API_BASE_URL}/api/dividends/${this.symbol}`)
						.then(r => r.ok ? r.json() : null)
						.catch(() => null)
				]).then(([fundData, divData]) => {
					const finalFundamentals = fundData || cachedFundamentalsForUpdate;
					const finalDividend = divData || cachedDividendForUpdate;
					this.updateCompanyInfoAndDividends(contentEl, finalFundamentals, finalDividend, basicCompanyInfo);
				}).catch(error => {
					console.warn('[Description] Error loading additional data:', error);
				});
			} else {
				// Use cached data immediately
				this.updateCompanyInfoAndDividends(contentEl, cachedFundamentalsForUpdate, cachedDividendForUpdate, basicCompanyInfo);
			}
		} catch (error) {
			console.error('[Description] Error loading:', error);
			if (progressInterval) {
				clearInterval(progressInterval);
			}
			if (progressContainer) {
				progressContainer.style.display = 'none';
			}
			contentEl.innerHTML = `<div class="error">Error loading company description: ${error.message}</div>`;
		}
	}
	
	updateCompanyInfoAndDividends(contentEl, fundamentalsData, dividendData, basicCompanyInfo) {
			if (fundamentalsData || dividendData) {
				// Process company info
				let companyInfo = basicCompanyInfo;
				if (fundamentalsData) {
					const profile = fundamentalsData?.quoteSummary?.result?.[0]?.summaryProfile || {};
					companyInfo = {
						name: profile.longName || profile.name || this.symbol,
						sector: profile.sector || 'N/A',
						industry: profile.industry || 'N/A',
						website: profile.weburl || profile.website || 'N/A'
					};
					
					// Update the company info section if we got better data
					if (companyInfo && companyInfo.name !== this.symbol) {
						const companyInfoEl = contentEl.querySelector('.company-info');
						if (companyInfoEl) {
							companyInfoEl.innerHTML = `
								<div class="company-info-item">
									<span class="company-info-label">Name:</span>
									<span class="company-info-value">${companyInfo.name}</span>
								</div>
								${companyInfo.sector !== 'N/A' ? `
								<div class="company-info-item">
									<span class="company-info-label">Sector:</span>
									<span class="company-info-value">${companyInfo.sector}</span>
								</div>
								` : ''}
								${companyInfo.industry !== 'N/A' ? `
								<div class="company-info-item">
									<span class="company-info-label">Industry:</span>
									<span class="company-info-value">${companyInfo.industry}</span>
								</div>
								` : ''}
								${companyInfo.website !== 'N/A' ? `
								<div class="company-info-item">
									<span class="company-info-label">Website:</span>
									<span class="company-info-value"><a href="${companyInfo.website}" target="_blank" style="color: #4ea1f3; text-decoration: none;">${companyInfo.website}</a></span>
								</div>
								` : ''}
							`;
						}
					}
				}
				
				// Update dividends via loadAdditionalData
				const dividendContainer = contentEl.querySelector('#dividend-container');
				if (dividendContainer && dividendData) {
					const dividendYield = dividendData.dividendYield;
					const dividendRate = dividendData.dividendRate;
					
					dividendContainer.innerHTML = `
						${(dividendYield !== null && dividendYield !== undefined) || (dividendRate !== null && dividendRate !== undefined) ? `
						<div class="dividend-tiles">
							${dividendYield !== null && dividendYield !== undefined ? `
							<div class="dividend-item">
								<div class="dividend-label">Dividend Yield</div>
								<div class="dividend-value">${dividendYield.toFixed(2)}%</div>
							</div>
							` : ''}
							${dividendRate !== null && dividendRate !== undefined ? `
							<div class="dividend-item">
								<div class="dividend-label">Annual Rate</div>
								<div class="dividend-value">$${dividendRate.toFixed(2)}</div>
							</div>
							` : ''}
						</div>
						` : ''}
					`;
				}
				
				// Cache the description along with company info
				setCachedData(this.symbol, 'description', { 
					description: description,
					companyInfo: companyInfo
				});
			}
		}
	
	async renderDescription(contentEl, description, companyInfo, renderImmediately = false, dividendData = null) {
		// If renderImmediately is true, render description first without waiting for dividends
		if (renderImmediately) {
			// Render description and company info immediately
			contentEl.innerHTML = `
				<div class="company-info">
					<div class="company-info-item">
						<span class="company-info-label">Name:</span>
						<span class="company-info-value" id="company-name-value">${companyInfo.name !== 'N/A' && companyInfo.name !== this.symbol ? companyInfo.name : 'Loading...'}</span>
					</div>
					<div class="company-info-item">
						<span class="company-info-label">Sector:</span>
						<span class="company-info-value" id="company-sector-value">${companyInfo.sector !== 'N/A' ? companyInfo.sector : 'Loading...'}</span>
					</div>
					<div class="company-info-item">
						<span class="company-info-label">Industry:</span>
						<span class="company-info-value" id="company-industry-value">${companyInfo.industry !== 'N/A' ? companyInfo.industry : 'Loading...'}</span>
					</div>
					<div class="company-info-item">
						<span class="company-info-label">Website:</span>
						<span class="company-info-value" id="company-website-value">${companyInfo.website !== 'N/A' ? `<a href="${companyInfo.website}" target="_blank" style="color: #4ea1f3; text-decoration: none;">${companyInfo.website}</a>` : 'Loading...'}</span>
					</div>
				</div>
				${description && description !== 'No description available.' && description.length > 0 ? `
				<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #1f2a37;" class="description-content">
					${description}
				</div>
				` : ''}
				<div id="dividend-container" style="margin-top: 15px;">
					<!-- Dividend tiles -->
					<div class="dividend-tiles" id="dividend-yield-tiles">
						<div class="dividend-item">
							<div class="dividend-label">Dividend Yield</div>
							<div class="dividend-value" id="dividend-yield-value">Loading...</div>
						</div>
						<div class="dividend-item">
							<div class="dividend-label">Annual Rate</div>
							<div class="dividend-value" id="dividend-rate-value">Loading...</div>
						</div>
					</div>
				</div>
			`;
			
			// Now load dividends and price changes in parallel in the background
			this.loadAdditionalData(contentEl);
			return;
		}
		
		// Original synchronous loading (for cached data)
		// Check stock-overview cache first for dividend data
		const overviewData = getCachedData(this.symbol, 'stock-overview');
		let dividendYield = null;
		let dividendRate = null;
		
		if (overviewData && overviewData.dividends) {
			console.log('[Description] Using dividend data from stock-overview cache');
			dividendYield = overviewData.dividends.dividendYield;
			dividendRate = overviewData.dividends.dividendRate;
		} else {
			// Fetch dividend data if not in cache
			try {
				const dividendResponse = await fetch(`${API_BASE_URL}/api/dividends/${this.symbol}`);
				if (dividendResponse.ok) {
					const dividendData = await dividendResponse.json();
					dividendYield = dividendData.dividendYield;
					dividendRate = dividendData.dividendRate;
				}
			} catch (error) {
				console.warn('[Description] Could not fetch dividend data:', error);
			}
		}
		
		// Render description with company info and dividend data
		contentEl.innerHTML = `
			<div class="company-info">
				<div class="company-info-item">
					<span class="company-info-label">Name:</span>
					<span class="company-info-value" id="company-name-value">${companyInfo.name !== 'N/A' && companyInfo.name !== this.symbol ? companyInfo.name : 'Loading...'}</span>
				</div>
				<div class="company-info-item">
					<span class="company-info-label">Sector:</span>
					<span class="company-info-value" id="company-sector-value">${companyInfo.sector !== 'N/A' ? companyInfo.sector : 'Loading...'}</span>
				</div>
				<div class="company-info-item">
					<span class="company-info-label">Industry:</span>
					<span class="company-info-value" id="company-industry-value">${companyInfo.industry !== 'N/A' ? companyInfo.industry : 'Loading...'}</span>
				</div>
				<div class="company-info-item">
					<span class="company-info-label">Website:</span>
					<span class="company-info-value" id="company-website-value">${companyInfo.website !== 'N/A' ? `<a href="${companyInfo.website}" target="_blank" style="color: #4ea1f3; text-decoration: none;">${companyInfo.website}</a>` : 'Loading...'}</span>
				</div>
			</div>
			${description && description !== 'No description available.' && description.length > 0 ? `
			<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #1f2a37;" class="description-content">
				${description}
			</div>
			` : ''}
			${(dividendYield !== null && dividendYield !== undefined) || (dividendRate !== null && dividendRate !== undefined) ? `
			<div class="dividend-tiles">
				${dividendYield !== null && dividendYield !== undefined ? `
				<div class="dividend-item">
					<div class="dividend-label">Dividend Yield</div>
					<div class="dividend-value">${dividendYield.toFixed(2)}%</div>
				</div>
				` : ''}
				${dividendRate !== null && dividendRate !== undefined ? `
				<div class="dividend-item">
					<div class="dividend-label">Annual Rate</div>
					<div class="dividend-value">$${dividendRate.toFixed(2)}</div>
				</div>
				` : ''}
			</div>
			` : ''}
		`;
	}
	
	async loadAdditionalData(contentEl) {
		// Load dividends only (price changes removed)
		const dividendData = await Promise.allSettled([
			fetch(`${API_BASE_URL}/api/dividends/${this.symbol}`).then(r => r.ok ? r.json() : null).catch(() => null)
		]).then(results => results[0]);
		
		const dividendYield = dividendData.status === 'fulfilled' && dividendData.value ? dividendData.value.dividendYield : null;
		const dividendRate = dividendData.status === 'fulfilled' && dividendData.value ? dividendData.value.dividendRate : null;
		
		// Update dividend yield value
		const dividendYieldEl = contentEl.querySelector('#dividend-yield-value');
		if (dividendYieldEl) {
			if (dividendYield !== null && dividendYield !== undefined) {
				dividendYieldEl.textContent = `${dividendYield.toFixed(2)}%`;
			} else {
				dividendYieldEl.textContent = 'N/A';
			}
		}
		
		// Update dividend rate value
		const dividendRateEl = contentEl.querySelector('#dividend-rate-value');
		if (dividendRateEl) {
			if (dividendRate !== null && dividendRate !== undefined) {
				dividendRateEl.textContent = `$${dividendRate.toFixed(2)}`;
			} else {
				dividendRateEl.textContent = 'N/A';
			}
		}
		
		// Cache the description along with dividend data
		const cachedData = getCachedData(this.symbol, 'description') || {};
		setCachedData(this.symbol, 'description', {
			...cachedData,
			dividendYield: dividendYield,
			dividendRate: dividendRate
		});
	}
}

customElements.define('stock-description', StockDescription);


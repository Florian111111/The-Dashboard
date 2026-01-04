import { fetchWithProxy } from '../utils/proxy.js';

import { getCachedData, setCachedData } from '../utils/cache.js';

import { API_BASE_URL } from '../config.js';

export class StockFundamentals extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.symbol = null;
	}
	
	static get observedAttributes() {
		return ['symbol'];
	}
	
	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'symbol' && newValue !== oldValue) {
			this.symbol = newValue;
			if (this.shadowRoot && this.shadowRoot.innerHTML && this.symbol) {
				this.loadFundamentals();
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
				.content-wrapper {
					max-height: 350px;
					overflow-y: auto;
					padding-right: 8px;
				}
				.content-wrapper::-webkit-scrollbar {
					width: 6px;
				}
				.content-wrapper::-webkit-scrollbar-track {
					background: #0b0f14;
					border-radius: 3px;
				}
				.content-wrapper::-webkit-scrollbar-thumb {
					background: #1f2a37;
					border-radius: 3px;
				}
				.content-wrapper::-webkit-scrollbar-thumb:hover {
					background: #2d3a4a;
				}
				.grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
					gap: 12px;
				}
				.section {
					margin-bottom: 24px;
				}
				.section-title {
					color: #4ea1f3;
					font-size: 1rem;
					font-weight: 600;
					margin-bottom: 12px;
					padding-bottom: 8px;
					border-bottom: 1px solid #1f2a37;
				}
				.section-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
					gap: 12px;
				}
				.item {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 12px;
				}
				:host(.light-mode) .item {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.label {
					color: #9fb0c0;
					font-size: 0.85rem;
					margin-bottom: 6px;
				}
				:host(.light-mode) .label {
					color: #2a2a2a;
				}
				.value {
					color: #e6edf3;
					font-weight: 600;
					font-size: 1rem;
				}
				:host(.light-mode) .value {
					color: #0a0a0a;
				}
				.loading {
					color: #9fb0c0;
					text-align: center;
					padding: 20px;
				}
				:host(.light-mode) .loading {
					color: #2a2a2a;
				}
				.progress-container {
					width: 100%;
					height: 4px;
					background: #0b0f14;
					border-radius: 2px;
					overflow: hidden;
					margin-bottom: 15px;
					position: relative;
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
				.view-more-btn {
					background: #4ea1f3;
					color: #0b0f14;
					border: none;
					padding: 8px 16px;
					border-radius: 6px;
					font-size: 0.85rem;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s ease;
				}
				.view-more-btn:hover {
					background: #3b82f6;
					transform: translateY(-1px);
				}
				.panel-info-icon {
					width: 22px;
					height: 22px;
					border-radius: 50%;
					background: rgba(78, 161, 243, 0.15);
					border: 1px solid rgba(78, 161, 243, 0.3);
					color: #4ea1f3;
					display: flex;
					align-items: center;
					justify-content: center;
					cursor: pointer;
					font-size: 0.75rem;
					font-weight: 700;
					transition: all 0.2s ease;
					flex-shrink: 0;
				}
				.panel-info-icon:hover {
					background: rgba(78, 161, 243, 0.25);
					border-color: #4ea1f3;
					transform: scale(1.1);
				}
				:host(.light-mode) .panel-info-icon {
					background: rgba(29, 78, 216, 0.15);
					border-color: rgba(29, 78, 216, 0.3);
					color: #1d4ed8;
				}
				:host(.light-mode) .panel-info-icon:hover {
					background: rgba(29, 78, 216, 0.25);
					border-color: #1d4ed8;
				}
				/* Info Modal Styles - same as StockIndicators */
				.panel-info-modal-overlay {
					display: none;
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background: rgba(0, 0, 0, 0.7);
					backdrop-filter: blur(4px);
					z-index: 10000;
					align-items: center;
					justify-content: center;
				}
				.panel-info-modal-overlay.show {
					display: flex;
				}
				.panel-info-modal {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					width: 90%;
					max-width: 600px;
					max-height: 85vh;
					display: flex;
					flex-direction: column;
					box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
				}
				:host(.light-mode) .panel-info-modal {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.panel-info-modal-header {
					padding: 20px;
					border-bottom: 1px solid #1f2a37;
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-shrink: 0;
				}
				:host(.light-mode) .panel-info-modal-header {
					border-bottom-color: #a0aab8;
				}
				.panel-info-modal-title {
					font-size: 1.3rem;
					font-weight: 700;
					color: #e6edf3;
					display: flex;
					align-items: center;
					gap: 10px;
				}
				:host(.light-mode) .panel-info-modal-title {
					color: #0a0a0a;
				}
				.panel-info-modal-close {
					background: transparent;
					border: none;
					color: #9fb0c0;
					font-size: 1.5rem;
					cursor: pointer;
					padding: 8px;
					border-radius: 8px;
					transition: all 0.2s ease;
					line-height: 1;
				}
				.panel-info-modal-close:hover {
					background: rgba(239, 68, 68, 0.2);
					color: #ef4444;
				}
				.panel-info-modal-content {
					padding: 20px;
					overflow-y: auto;
					flex: 1;
					color: #e6edf3;
					line-height: 1.7;
					font-size: 0.95rem;
				}
				:host(.light-mode) .panel-info-modal-content {
					color: #0a0a0a;
				}
				.panel-info-modal-content h3 {
					font-size: 1.1rem;
					font-weight: 600;
					color: #4ea1f3;
					margin: 20px 0 10px 0;
				}
				:host(.light-mode) .panel-info-modal-content h3 {
					color: #1d4ed8;
				}
				.panel-info-modal-content h3:first-child {
					margin-top: 0;
				}
				.panel-info-modal-content p {
					margin: 10px 0;
					line-height: 1.7;
				}
				.panel-info-modal-content ul {
					margin: 10px 0;
					padding-left: 25px;
				}
				.panel-info-modal-content li {
					margin: 8px 0;
					line-height: 1.6;
				}
				.panel-info-modal-content strong {
					color: #4ea1f3;
					font-weight: 600;
				}
				:host(.light-mode) .panel-info-modal-content strong {
					color: #1d4ed8;
				}
				.panel-info-modal-content::-webkit-scrollbar {
					width: 8px;
				}
				.panel-info-modal-content::-webkit-scrollbar-track {
					background: #0b0f14;
					border-radius: 4px;
				}
				.panel-info-modal-content::-webkit-scrollbar-thumb {
					background: #1f2a37;
					border-radius: 4px;
				}
				.panel-info-modal-content::-webkit-scrollbar-thumb:hover {
					background: #2d3748;
				}
				:host(.light-mode) .panel-info-modal-content::-webkit-scrollbar-track {
					background: #c0c9d4;
				}
				:host(.light-mode) .panel-info-modal-content::-webkit-scrollbar-thumb {
					background: #a0aab8;
				}
				:host(.light-mode) .panel-info-modal-content::-webkit-scrollbar-thumb:hover {
					background: #8b95a3;
				}
				/* View More Modal Styles */
				.view-more-modal-overlay {
					display: none;
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background: rgba(0, 0, 0, 0.7);
					backdrop-filter: blur(4px);
					z-index: 10000;
					align-items: center;
					justify-content: center;
				}
				.view-more-modal-overlay.show {
					display: flex;
				}
				.view-more-modal {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					width: 90%;
					max-width: 1200px;
					max-height: 85vh;
					display: flex;
					flex-direction: column;
					box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
				}
				:host(.light-mode) .view-more-modal {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.view-more-modal-header {
					padding: 20px;
					border-bottom: 1px solid #1f2a37;
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-shrink: 0;
				}
				:host(.light-mode) .view-more-modal-header {
					border-bottom-color: #a0aab8;
				}
				.view-more-modal-title {
					font-size: 1.4rem;
					font-weight: 700;
					color: #e6edf3;
				}
				:host(.light-mode) .view-more-modal-title {
					color: #0a0a0a;
				}
				.view-more-modal-close {
					background: transparent;
					border: none;
					color: #9fb0c0;
					font-size: 1.5rem;
					cursor: pointer;
					padding: 8px;
					border-radius: 8px;
					transition: all 0.2s ease;
					line-height: 1;
				}
				.view-more-modal-close:hover {
					background: rgba(239, 68, 68, 0.2);
					color: #ef4444;
				}
				.view-more-modal-content {
					padding: 20px;
					overflow-y: auto;
					flex: 1;
				}
			</style>
			<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
				<div style="display: flex; align-items: center; gap: 10px;">
					<h3 style="margin: 0;">Fundamentals</h3>
					<div class="panel-info-icon" id="fundamentals-info-icon">i</div>
				</div>
				<button id="seeMoreBtn" class="view-more-btn">
					View More
				</button>
			</div>
			<div class="progress-container" id="progress-container" style="display: none;">
				<div class="progress-bar" id="progress-bar"></div>
			</div>
			<div id="content" class="content-wrapper">
				<div class="loading">Loading...</div>
			</div>
			
			<!-- Info Modal -->
			<div class="panel-info-modal-overlay" id="fundamentals-info-modal-overlay">
				<div class="panel-info-modal">
					<div class="panel-info-modal-header">
						<div class="panel-info-modal-title">
							<span>ℹ️</span>
							<span>Fundamentals</span>
						</div>
						<button class="panel-info-modal-close" id="fundamentals-info-modal-close">×</button>
					</div>
					<div class="panel-info-modal-content" id="fundamentals-info-modal-content">
						<!-- Content will be dynamically inserted -->
					</div>
				</div>
			</div>
			
			<!-- View More Modal -->
			<div class="view-more-modal-overlay" id="view-more-modal-overlay">
				<div class="view-more-modal">
					<div class="view-more-modal-header">
						<div class="view-more-modal-title">Fundamentals - Extended</div>
						<button class="view-more-modal-close" id="view-more-modal-close">×</button>
					</div>
					<div class="view-more-modal-content" id="view-more-modal-content">
						<div class="loading">Loading extended fundamentals...</div>
					</div>
				</div>
			</div>
		`;
		
		if (this.symbol) {
			this.loadFundamentals();
		}
		
		// Apply saved theme
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.classList.add('light-mode');
		}
		
		// Setup info icon
		this.setupInfoIcon();

		// Add event listener for "View More" button
		this.shadowRoot.getElementById('seeMoreBtn')?.addEventListener('click', () => {
			this.openViewMoreModal();
		});
	}
	
	setupInfoIcon() {
		const infoIcon = this.shadowRoot.getElementById('fundamentals-info-icon');
		const overlay = this.shadowRoot.getElementById('fundamentals-info-modal-overlay');
		const closeBtn = this.shadowRoot.getElementById('fundamentals-info-modal-close');
		const content = this.shadowRoot.getElementById('fundamentals-info-modal-content');
		
		if (!infoIcon || !overlay || !closeBtn || !content) return;
		
		infoIcon.addEventListener('click', () => {
			this.openInfoModal();
		});
		
		closeBtn.addEventListener('click', () => {
			overlay.classList.remove('show');
		});
		
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.classList.remove('show');
			}
		});
	}
	
	openInfoModal() {
		const overlay = this.shadowRoot.getElementById('fundamentals-info-modal-overlay');
		const content = this.shadowRoot.getElementById('fundamentals-info-modal-content');
		
		if (!overlay || !content) return;
		
		content.innerHTML = `
			<h3>What are Fundamentals?</h3>
			<p>Fundamentals refer to the quantitative and qualitative factors that determine a company's intrinsic value. These metrics help investors assess a company's financial health, profitability, and growth potential.</p>
			
			<h3>Key Fundamental Metrics</h3>
			<ul>
				<li><strong>P/E Ratio (Price-to-Earnings)</strong>: Compares a company's stock price to its earnings per share. A lower P/E may indicate undervaluation, while a higher P/E may suggest overvaluation or high growth expectations. Compare to industry averages for context.</li>
				<li><strong>EPS (Earnings Per Share)</strong>: The portion of a company's profit allocated to each outstanding share. Higher EPS generally indicates better profitability.</li>
				<li><strong>Market Cap</strong>: Total market value of all outstanding shares. Large-cap stocks (>$10B) are typically more stable, while small-cap stocks (<$2B) may offer higher growth potential but more volatility.</li>
				<li><strong>Revenue</strong>: Total income from business operations. Consistent revenue growth is a positive sign.</li>
				<li><strong>Net Income</strong>: Profit after all expenses. Positive and growing net income indicates financial health.</li>
				<li><strong>Operating Cash Flow</strong>: Cash generated from core business operations. Positive cash flow is essential for business sustainability.</li>
				<li><strong>Total Assets</strong>: All resources owned by the company. Growing assets can indicate expansion.</li>
				<li><strong>Debt-to-Equity Ratio</strong>: Measures financial leverage. Lower ratios generally indicate less financial risk.</li>
			</ul>
			
			<h3>How to Use Fundamentals</h3>
			<ul>
				<li><strong>Valuation</strong>: Compare P/E ratios to industry peers and historical averages to assess if a stock is fairly valued.</li>
				<li><strong>Profitability</strong>: Look for consistent or growing EPS, net income, and operating margins.</li>
				<li><strong>Financial Health</strong>: Positive cash flow and manageable debt levels indicate financial stability.</li>
				<li><strong>Growth Potential</strong>: Increasing revenue and earnings over time suggest growth potential.</li>
				<li><strong>Comparison</strong>: Always compare fundamentals to industry averages and competitors for context.</li>
			</ul>
			
			<h3>Understanding the Display</h3>
			<ul>
				<li><strong>Values</strong>: All metrics are displayed in their raw form without additional calculations or multiplications.</li>
				<li><strong>Currency</strong>: Values are typically shown in the company's reporting currency (usually USD for U.S. companies).</li>
				<li><strong>Time Period</strong>: Most metrics reflect the most recent reporting period (quarterly or annual).</li>
			</ul>
			
			<p><strong>Tip:</strong> Fundamentals provide a long-term view of a company's value. Combine fundamental analysis with technical analysis and market context for a comprehensive investment decision. Remember that past performance does not guarantee future results.</p>
		`;
		
		overlay.classList.add('show');
	}
	
	async loadFundamentals() {
		// Check aggregated overview cache first (most efficient)
		const overviewData = getCachedData(this.symbol, 'stock-overview');
		if (overviewData && overviewData.fundamentals) {
			console.log('[Fundamentals] Using data from aggregated overview cache');
			// Extract data from quoteSummary format if needed
			const fundamentalsData = this.extractFundamentalsData(overviewData.fundamentals);
			this.renderFundamentals(fundamentalsData);
			return;
		}
		
		// Check individual cache as fallback
		const cachedData = getCachedData(this.symbol, 'fundamentals');
		if (cachedData) {
			console.log('[Fundamentals] Using cached data');
			// Extract data from quoteSummary format if needed
			const fundamentalsData = this.extractFundamentalsData(cachedData);
			this.renderFundamentals(fundamentalsData);
			return;
		}
		
		const progressContainer = this.shadowRoot.getElementById('progress-container');
		const progressBar = this.shadowRoot.getElementById('progress-bar');
		let progressInterval = null;
		
		// Show progress bar
		let startTime = null;
		let dataLoaded = false;
		if (progressContainer && progressBar) {
			progressContainer.style.display = 'block';
			progressBar.style.width = '0%';
			startTime = Date.now();
			const estimatedDuration = 15000; // 15 seconds to reach 95%
			
			progressInterval = setInterval(() => {
				if (progressBar && startTime) {
					const elapsed = Date.now() - startTime;
					// Use easing function: fast start, slow end (ease-out cubic)
					const t = Math.min(elapsed / estimatedDuration, 1);
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
		}
		
		try {
			const quoteSummaryData = await this.fetchFundamentals(this.symbol);
			
			// Extract and process the data from quoteSummary format
			const fundamentalsData = this.extractFundamentalsData(quoteSummaryData);
			
			console.log('[Fundamentals] Processed data for rendering:', {
				hasTrailingPE: !!fundamentalsData.trailingPE,
				hasForwardPE: !!fundamentalsData.forwardPE,
				hasEPS: !!fundamentalsData.eps,
				hasMarketCap: !!fundamentalsData.marketCap,
				hasNetIncome: !!fundamentalsData.netIncome,
				hasTotalAssets: !!fundamentalsData.totalAssets,
				hasCashflow: !!fundamentalsData.operatingCashflow
			});
			
			// Store in instance variable for potential future use
			this.fundamentals = fundamentalsData;
			
			// Cache the fundamentals data (cache in quoteSummary format for consistency)
			setCachedData(this.symbol, 'fundamentals', quoteSummaryData);
			
			// Mark data as loaded, but let progress bar continue until 15 seconds
			dataLoaded = true;
			
			// Check if 15 seconds have already passed
			if (startTime) {
				const elapsed = Date.now() - startTime;
				const estimatedDuration = 15000;
				if (elapsed >= estimatedDuration) {
					// Clear interval if 15 seconds have passed
					if (progressInterval) {
						clearInterval(progressInterval);
					}
					// Complete progress bar
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
			// If less than 15 seconds, the interval will handle completion
			
			// Render the fundamentals
			this.renderFundamentals(fundamentalsData);
			
		} catch (error) {
			if (progressInterval) {
				clearInterval(progressInterval);
			}
			if (progressContainer) {
				progressContainer.style.display = 'none';
			}
			console.error('Error loading fundamentals:', error);
			console.error('Error details:', error.message, error.stack);
			
			// Show user-friendly error message
			let userFriendlyMessage = 'Too many users are currently using this feature. Please try again later.';
			const errorMsg = error.message || '';
			
			// Check if it's a session limit or API limit error
			if (errorMsg.includes('Session limit exceeded') || errorMsg.includes('rate limit') || errorMsg.includes('429') || errorMsg.includes('503') || errorMsg.includes('400')) {
				userFriendlyMessage = 'Too many users are currently using this feature. Please try again later.';
			}
			
			this.shadowRoot.getElementById('content').innerHTML = 
				`<div class="loading">${userFriendlyMessage}</div>`;
		}
	}
	
	extractFundamentalsData(quoteSummaryData) {
		// Check if data is already in flat format (has trailingPE directly)
		if (quoteSummaryData && quoteSummaryData.trailingPE !== undefined && !quoteSummaryData.quoteSummary) {
			// Already in flat format, return as-is
			return quoteSummaryData;
		}
		
		// Extract and process the data from quoteSummary format (from Python yfinance backend)
		const result = quoteSummaryData.quoteSummary?.result?.[0];
		if (!result) {
			// If no quoteSummary format, try to use data as-is (might already be flat)
			return quoteSummaryData;
		}
		
		const stats = result.defaultKeyStatistics || {};
		const financials = result.financialData || {};
		const profile = result.summaryProfile || {};
		const incomeStatement = result.incomeStatementHistory?.incomeStatementHistory?.[0] || {};
		const balanceSheet = result.balanceSheetHistory?.balanceSheetStatements?.[0] || {};
		const cashflow = result.cashflowStatementHistory?.cashflowStatements?.[0] || {};
		
		// Get data from all modules
		const marketCap = stats.marketCap?.raw || stats.marketCap || 0;
		const ebitda = financials.ebitda?.raw || incomeStatement.ebitda?.raw || null;
		const enterpriseValue = stats.enterpriseValue?.raw || financials.enterpriseValue?.raw || null;
		
		// Get EV ratios directly from financials (Finnhub provides these)
		const evEbitda = financials.evEbitda?.raw || ((enterpriseValue && ebitda && ebitda > 0) ? enterpriseValue / ebitda : null);
		const evRevenue = financials.evRevenue?.raw || null;
		
		// Get revenue from financialData or income statement
		const totalRevenue = financials.totalRevenue?.raw || incomeStatement.totalRevenue?.raw || null;
		
		// Convert to flat format that renderFundamentals expects
		return {
			// Basic Info
			name: profile?.longName || this.symbol,
			sector: profile?.sector || null,
			industry: profile?.industry || null,
			
			// Valuation Ratios
			trailingPE: stats.trailingPE?.raw || stats.trailingPE || null,
			forwardPE: stats.forwardPE?.raw || stats.forwardPE || null,
			pegRatio: stats.pegRatio?.raw || stats.pegRatio || null,
			priceToSales: stats.priceToSalesTrailing12Months?.raw || stats.priceToSalesTrailing12Months || null,
			priceToBook: stats.priceToBook?.raw || stats.priceToBook || null,
			enterpriseValue: enterpriseValue,
			evEbitda: evEbitda,
			evRevenue: evRevenue,
			beta: stats.beta?.raw || stats.beta || null,
			bookValue: stats.bookValue?.raw || stats.bookValue || null,
			priceToCashflow: financials?.priceToCashflow?.raw || financials?.priceToCashflow || null,
			priceToFreeCashflow: financials?.priceToFreeCashflow?.raw || financials?.priceToFreeCashflow || null,
			
			// Earnings
			eps: stats.trailingEps?.raw || stats.trailingEps || null,
			earningsGrowth: incomeStatement.earningsGrowth?.raw || incomeStatement.earningsGrowth3Y?.raw || null,
			revenueGrowth: incomeStatement.revenueGrowth?.raw || incomeStatement.revenueGrowth3Y?.raw || null,
			earningsGrowth3Y: incomeStatement.earningsGrowth3Y?.raw || null,
			earningsGrowth5Y: incomeStatement.earningsGrowth5Y?.raw || null,
			revenueGrowth3Y: incomeStatement.revenueGrowth3Y?.raw || null,
			revenueGrowth5Y: incomeStatement.revenueGrowth5Y?.raw || null,
			
			// Margins
			profitMargin: financials?.profitMargins?.raw || financials?.profitMargins || null,
			operatingMargin: financials?.operatingMargins?.raw || financials?.operatingMargins || null,
			grossMargin: financials?.grossMargins?.raw || financials?.grossMargins || null,
			pretaxMargin: financials?.pretaxMargins?.raw || financials?.pretaxMargins || null,
			
			// Income Statement (from Python yfinance - now available!)
			totalRevenue: totalRevenue,
			netIncome: incomeStatement.netIncome?.raw || null,
			ebit: incomeStatement.ebit?.raw || null,
			ebitda: ebitda,
			
			// Balance Sheet (from Python yfinance - now available!)
			totalAssets: balanceSheet.totalAssets?.raw || null,
			totalLiabilities: balanceSheet.totalLiab?.raw || null,
			
			// Cashflow (from Finnhub - now available!)
			operatingCashflow: cashflow.operatingCashflow?.raw || null,
			freeCashflow: cashflow.freeCashflow?.raw || null,
			
			// Ratios (from Finnhub)
			roe: financials?.roe?.raw || financials?.roe || null,
			roa: financials?.roa?.raw || financials?.roa || null,
			roi: financials?.roi?.raw || financials?.roi || null,
			currentRatio: financials?.currentRatio?.raw || financials?.currentRatio || null,
			quickRatio: financials?.quickRatio?.raw || financials?.quickRatio || null,
			debtToEquity: financials?.debtToEquity?.raw || financials?.debtToEquity || null,
			
			// Dividends (from Finnhub)
			dividendYield: financials?.dividendYield?.raw || financials?.dividendYield || null,
			payoutRatio: financials?.payoutRatio?.raw || financials?.payoutRatio || null
		};
	}

	async fetchFundamentals(symbol) {
		console.log('[Fundamentals] Fetching for:', symbol);
		console.log('[Fundamentals] Using Python yfinance backend (reliable approach)');
		
		// Use Python yfinance backend - this is the most reliable approach
		// Equivalent to: ticker = yf.Ticker("AAPL"); ticker.info['trailingPE']
		try {
			const backendUrl = `${API_BASE_URL}/api/fundamentals/${symbol}`;
			console.log('[Fundamentals] Calling Python backend:', backendUrl);
			
			const response = await fetch(backendUrl);
			console.log('[Fundamentals] Backend response status:', response.status);
			
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.detail || `Backend returned ${response.status}`);
			}
			
			const data = await response.json();
			console.log('[Fundamentals] Successfully fetched from Python yfinance backend');
			return data;
			
		} catch (error) {
			console.error('[Fundamentals] Error fetching from Python backend:', error);
			throw new Error('Could not fetch fundamentals from Python backend: ' + error.message);
		}
	}
	
	calculateGrowth(current, previous) {
		if (!current || !previous || previous === 0) return null;
		return ((current - previous) / Math.abs(previous)) * 100;
	}
	
	renderFundamentals(data) {
		const content = this.shadowRoot.getElementById('content');
		const items = [];
		
		// Valuation Ratios Section
		if (data.trailingPE !== null && data.trailingPE !== undefined) {
			items.push({ label: 'P/E Ratio (Trailing)', value: data.trailingPE.toFixed(2), section: 'Valuation' });
		}
		if (data.forwardPE !== null && data.forwardPE !== undefined) {
			items.push({ label: 'P/E Ratio (Forward)', value: data.forwardPE.toFixed(2), section: 'Valuation' });
		}
		if (data.pegRatio !== null && data.pegRatio !== undefined) {
			items.push({ label: 'PEG Ratio', value: data.pegRatio.toFixed(2), section: 'Valuation' });
		}
		if (data.priceToSales !== null && data.priceToSales !== undefined) {
			items.push({ label: 'Price/Sales', value: data.priceToSales.toFixed(2), section: 'Valuation' });
		}
		if (data.priceToBook !== null && data.priceToBook !== undefined) {
			items.push({ label: 'Price/Book', value: data.priceToBook.toFixed(2), section: 'Valuation' });
		}
		if (data.enterpriseValue !== null && data.enterpriseValue !== undefined) {
			items.push({ label: 'Enterprise Value', value: this.formatNumber(data.enterpriseValue), section: 'Valuation' });
		}
		if (data.evEbitda !== null && data.evEbitda !== undefined) {
			items.push({ label: 'EV/EBITDA', value: data.evEbitda.toFixed(2), section: 'Valuation' });
		}
		if (data.evRevenue !== null && data.evRevenue !== undefined) {
			items.push({ label: 'EV/Revenue', value: data.evRevenue.toFixed(2), section: 'Valuation' });
		}
		if (data.beta !== null && data.beta !== undefined) {
			items.push({ label: 'Beta', value: data.beta.toFixed(2), section: 'Valuation' });
		}
		if (data.bookValue !== null && data.bookValue !== undefined) {
			items.push({ label: 'Book Value/Share', value: data.bookValue.toFixed(2), section: 'Valuation' });
		}
		if (data.priceToCashflow !== null && data.priceToCashflow !== undefined) {
			items.push({ label: 'Price/Cashflow', value: data.priceToCashflow.toFixed(2), section: 'Valuation' });
		}
		if (data.priceToFreeCashflow !== null && data.priceToFreeCashflow !== undefined) {
			items.push({ label: 'Price/Free Cashflow', value: data.priceToFreeCashflow.toFixed(2), section: 'Valuation' });
		}
		
		// Earnings Section
		if (data.eps !== null && data.eps !== undefined) {
			items.push({ label: 'EPS (TTM)', value: data.eps.toFixed(2), section: 'Earnings' });
		}
		if (data.earningsGrowth !== null && data.earningsGrowth !== undefined) {
			// Display directly from API without calculations
			items.push({ label: 'Earnings Growth', value: data.earningsGrowth.toFixed(2) + '%', section: 'Earnings' });
		}
		if (data.revenueGrowth !== null && data.revenueGrowth !== undefined) {
			// Display directly from API without calculations
			items.push({ label: 'Revenue Growth (TTM)', value: data.revenueGrowth.toFixed(2) + '%', section: 'Earnings' });
		}
		if (data.revenueGrowth3Y !== null && data.revenueGrowth3Y !== undefined) {
			// Display directly from API without calculations
			items.push({ label: 'Revenue Growth (3Y)', value: data.revenueGrowth3Y.toFixed(2) + '%', section: 'Earnings' });
		}
		if (data.revenueGrowth5Y !== null && data.revenueGrowth5Y !== undefined) {
			// Display directly from API without calculations
			items.push({ label: 'Revenue Growth (5Y)', value: data.revenueGrowth5Y.toFixed(2) + '%', section: 'Earnings' });
		}
		if (data.earningsGrowth3Y !== null && data.earningsGrowth3Y !== undefined) {
			// Display directly from API without calculations
			items.push({ label: 'Earnings Growth (3Y)', value: data.earningsGrowth3Y.toFixed(2) + '%', section: 'Earnings' });
		}
		if (data.earningsGrowth5Y !== null && data.earningsGrowth5Y !== undefined) {
			// Display directly from API without calculations
			items.push({ label: 'Earnings Growth (5Y)', value: data.earningsGrowth5Y.toFixed(2) + '%', section: 'Earnings' });
		}
		
		// Margins Section - Display directly from API without calculations
		if (data.profitMargin !== null && data.profitMargin !== undefined) {
			items.push({ label: 'Profit Margin', value: data.profitMargin.toFixed(2) + '%', section: 'Margins' });
		}
		if (data.operatingMargin !== null && data.operatingMargin !== undefined) {
			items.push({ label: 'Operating Margin', value: data.operatingMargin.toFixed(2) + '%', section: 'Margins' });
		}
		if (data.grossMargin !== null && data.grossMargin !== undefined) {
			items.push({ label: 'Gross Margin', value: data.grossMargin.toFixed(2) + '%', section: 'Margins' });
		}
		if (data.pretaxMargin !== null && data.pretaxMargin !== undefined) {
			items.push({ label: 'Pretax Margin', value: data.pretaxMargin.toFixed(2) + '%', section: 'Margins' });
		}
		
		// Ratios Section - Display directly from API without calculations
		if (data.roe !== null && data.roe !== undefined) {
			items.push({ label: 'ROE (Return on Equity)', value: data.roe.toFixed(2) + '%', section: 'Ratios' });
		}
		if (data.roa !== null && data.roa !== undefined) {
			items.push({ label: 'ROA (Return on Assets)', value: data.roa.toFixed(2) + '%', section: 'Ratios' });
		}
		if (data.roi !== null && data.roi !== undefined) {
			items.push({ label: 'ROI (Return on Investment)', value: data.roi.toFixed(2) + '%', section: 'Ratios' });
		}
		if (data.currentRatio !== null && data.currentRatio !== undefined) {
			items.push({ label: 'Current Ratio', value: data.currentRatio.toFixed(2), section: 'Ratios' });
		}
		if (data.quickRatio !== null && data.quickRatio !== undefined) {
			items.push({ label: 'Quick Ratio', value: data.quickRatio.toFixed(2), section: 'Ratios' });
		}
		if (data.debtToEquity !== null && data.debtToEquity !== undefined) {
			items.push({ label: 'Debt/Equity', value: data.debtToEquity.toFixed(2), section: 'Ratios' });
		}
		
		// Dividends Section - Display directly from API without calculations
		if (data.dividendYield !== null && data.dividendYield !== undefined) {
			items.push({ label: 'Dividend Yield', value: data.dividendYield.toFixed(2) + '%', section: 'Dividends' });
		}
		if (data.payoutRatio !== null && data.payoutRatio !== undefined) {
			items.push({ label: 'Payout Ratio', value: data.payoutRatio.toFixed(2) + '%', section: 'Dividends' });
		}
		
		// Income Statement (GuV) Section
		if (data.totalRevenue !== null && data.totalRevenue !== undefined) {
			items.push({ label: 'Total Revenue', value: this.formatNumber(data.totalRevenue), section: 'Income Statement' });
		}
		if (data.netIncome !== null && data.netIncome !== undefined) {
			items.push({ label: 'Net Income', value: this.formatNumber(data.netIncome), section: 'Income Statement' });
		}
		if (data.ebit !== null && data.ebit !== undefined) {
			items.push({ label: 'EBIT', value: this.formatNumber(data.ebit), section: 'Income Statement' });
		}
		if (data.ebitda !== null && data.ebitda !== undefined) {
			items.push({ label: 'EBITDA', value: this.formatNumber(data.ebitda), section: 'Income Statement' });
		}
		
		// Balance Sheet Section
		if (data.totalAssets !== null && data.totalAssets !== undefined) {
			items.push({ label: 'Total Assets', value: this.formatNumber(data.totalAssets), section: 'Balance Sheet' });
		}
		if (data.totalLiabilities !== null && data.totalLiabilities !== undefined) {
			items.push({ label: 'Total Liabilities', value: this.formatNumber(data.totalLiabilities), section: 'Balance Sheet' });
		}
		
		// Cashflow Section
		if (data.operatingCashflow !== null && data.operatingCashflow !== undefined) {
			items.push({ label: 'Operating Cashflow', value: this.formatNumber(data.operatingCashflow), section: 'Cashflow' });
		}
		if (data.freeCashflow !== null && data.freeCashflow !== undefined) {
			items.push({ label: 'Free Cashflow', value: this.formatNumber(data.freeCashflow), section: 'Cashflow' });
		}
		
		if (items.length === 0) {
			content.innerHTML = '<div class="loading">No data available</div>';
			return;
		}
		
		// Group items by section
		const sections = {};
		items.forEach(item => {
			const section = item.section || 'Other';
			if (!sections[section]) {
				sections[section] = [];
			}
			sections[section].push(item);
		});
		
		// Render with sections
		content.innerHTML = Object.keys(sections).map(sectionName => {
			const sectionItems = sections[sectionName];
			return `
				<div class="section">
					<div class="section-title">${sectionName}</div>
					<div class="section-grid">
						${sectionItems.map(item => `
							<div class="item">
								<div class="label">${item.label}</div>
								<div class="value">${item.value}</div>
							</div>
						`).join('')}
					</div>
				</div>
			`;
		}).join('');
	}
	
	formatNumber(num) {
		if (num >= 1e12) {
			const trillions = num / 1e12;
			// For very large numbers, show more decimal places
			return trillions.toFixed(3) + 'T';
		}
		if (num >= 1e9) {
			const billions = num / 1e9;
			// For billions, show 3 decimal places for precision
			return billions.toFixed(3) + 'B';
		}
		if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
		if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
		return num.toFixed(2);
	}
	
	async openViewMoreModal() {
		const overlay = this.shadowRoot.getElementById('view-more-modal-overlay');
		const modalContent = this.shadowRoot.getElementById('view-more-modal-content');
		const closeBtn = this.shadowRoot.getElementById('view-more-modal-close');
		
		if (!overlay || !modalContent) return;
		
		overlay.classList.add('show');
		modalContent.innerHTML = '<div class="loading">Loading extended fundamentals...</div>';
		
		// Check if data is already loaded
		if (this.fundamentals) {
			// Data already loaded, render immediately
			this.renderFundamentalsInModal(modalContent, this.fundamentals);
		} else {
			// Data not loaded yet, load it now
			try {
				// Try cache first
				const cachedData = getCachedData(this.symbol, 'fundamentals');
				if (cachedData) {
					this.fundamentals = cachedData;
					this.renderFundamentalsInModal(modalContent, cachedData);
				} else {
					// Load from API
					const quoteSummaryData = await this.fetchFundamentals(this.symbol);
					const result = quoteSummaryData.quoteSummary?.result?.[0];
					if (!result) {
						throw new Error('No result in quoteSummary data');
					}
					
					const stats = result.defaultKeyStatistics || {};
					const financials = result.financialData || {};
					const profile = result.summaryProfile || {};
					const incomeStatement = result.incomeStatementHistory?.incomeStatementHistory?.[0] || {};
					const balanceSheet = result.balanceSheetHistory?.balanceSheetStatements?.[0] || {};
					const cashflow = result.cashflowStatementHistory?.cashflowStatements?.[0] || {};
					
					const marketCap = stats.marketCap?.raw || stats.marketCap || 0;
					const ebitda = financials.ebitda?.raw || incomeStatement.ebitda?.raw || null;
					const enterpriseValue = stats.enterpriseValue?.raw || financials.enterpriseValue?.raw || null;
					const evEbitda = financials.evEbitda?.raw || ((enterpriseValue && ebitda && ebitda > 0) ? enterpriseValue / ebitda : null);
					const evRevenue = financials.evRevenue?.raw || null;
					const totalRevenue = financials.totalRevenue?.raw || incomeStatement.totalRevenue?.raw || null;
					
					const fundamentalsData = {
						name: profile?.longName || this.symbol,
						sector: profile?.sector || null,
						industry: profile?.industry || null,
						trailingPE: stats.trailingPE?.raw || stats.trailingPE || null,
						forwardPE: stats.forwardPE?.raw || stats.forwardPE || null,
						pegRatio: stats.pegRatio?.raw || stats.pegRatio || null,
						priceToSales: stats.priceToSalesTrailing12Months?.raw || stats.priceToSalesTrailing12Months || null,
						priceToBook: stats.priceToBook?.raw || stats.priceToBook || null,
						enterpriseValue: enterpriseValue,
						evEbitda: evEbitda,
						evRevenue: evRevenue,
						beta: stats.beta?.raw || stats.beta || null,
						bookValue: stats.bookValue?.raw || stats.bookValue || null,
						priceToCashflow: financials?.priceToCashflow?.raw || financials?.priceToCashflow || null,
						priceToFreeCashflow: financials?.priceToFreeCashflow?.raw || financials?.priceToFreeCashflow || null,
						eps: stats.trailingEps?.raw || stats.trailingEps || null,
						earningsGrowth: incomeStatement.earningsGrowth?.raw || incomeStatement.earningsGrowth3Y?.raw || null,
						revenueGrowth: incomeStatement.revenueGrowth?.raw || incomeStatement.revenueGrowth3Y?.raw || null,
						earningsGrowth3Y: incomeStatement.earningsGrowth3Y?.raw || null,
						earningsGrowth5Y: incomeStatement.earningsGrowth5Y?.raw || null,
						revenueGrowth3Y: incomeStatement.revenueGrowth3Y?.raw || null,
						revenueGrowth5Y: incomeStatement.revenueGrowth5Y?.raw || null,
						profitMargin: financials?.profitMargins?.raw || financials?.profitMargins || null,
						operatingMargin: financials?.operatingMargins?.raw || financials?.operatingMargins || null,
						grossMargin: financials?.grossMargins?.raw || financials?.grossMargins || null,
						pretaxMargin: financials?.pretaxMargins?.raw || financials?.pretaxMargins || null,
						totalRevenue: totalRevenue,
						netIncome: incomeStatement.netIncome?.raw || null,
						ebit: incomeStatement.ebit?.raw || null,
						ebitda: ebitda,
						totalAssets: balanceSheet.totalAssets?.raw || null,
						totalLiabilities: balanceSheet.totalLiab?.raw || null,
						operatingCashflow: cashflow.operatingCashflow?.raw || null,
						freeCashflow: cashflow.freeCashflow?.raw || null,
						roe: financials?.roe?.raw || financials?.roe || null,
						roa: financials?.roa?.raw || financials?.roa || null,
						roi: financials?.roi?.raw || financials?.roi || null,
						currentRatio: financials?.currentRatio?.raw || financials?.currentRatio || null,
						quickRatio: financials?.quickRatio?.raw || financials?.quickRatio || null,
						debtToEquity: financials?.debtToEquity?.raw || financials?.debtToEquity || null,
						dividendYield: financials?.dividendYield?.raw || financials?.dividendYield || null,
						payoutRatio: financials?.payoutRatio?.raw || financials?.payoutRatio || null
					};
					
					this.fundamentals = fundamentalsData;
					setCachedData(this.symbol, 'fundamentals', fundamentalsData);
					this.renderFundamentalsInModal(modalContent, fundamentalsData);
				}
			} catch (error) {
				console.error('[Fundamentals Modal] Error loading data:', error);
				modalContent.innerHTML = `<div class="loading">Error loading extended fundamentals: ${error.message}</div>`;
			}
		}
		
		// Close button handler
		if (closeBtn) {
			const closeHandler = () => {
				overlay.classList.remove('show');
			};
			// Remove old listeners
			const newCloseBtn = closeBtn.cloneNode(true);
			closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
			newCloseBtn.addEventListener('click', closeHandler);
		}
		
		// Close on overlay click
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.classList.remove('show');
			}
		});
	}
	
	renderFundamentalsInModal(container, data) {
		// Use the same rendering logic as renderFundamentals
		const items = [];
		
		// Same logic as renderFundamentals - all sections
		// Valuation Ratios Section
		if (data.trailingPE !== null && data.trailingPE !== undefined) {
			items.push({ label: 'P/E Ratio (Trailing)', value: data.trailingPE.toFixed(2), section: 'Valuation' });
		}
		if (data.forwardPE !== null && data.forwardPE !== undefined) {
			items.push({ label: 'P/E Ratio (Forward)', value: data.forwardPE.toFixed(2), section: 'Valuation' });
		}
		if (data.pegRatio !== null && data.pegRatio !== undefined) {
			items.push({ label: 'PEG Ratio', value: data.pegRatio.toFixed(2), section: 'Valuation' });
		}
		if (data.priceToSales !== null && data.priceToSales !== undefined) {
			items.push({ label: 'Price/Sales', value: data.priceToSales.toFixed(2), section: 'Valuation' });
		}
		if (data.priceToBook !== null && data.priceToBook !== undefined) {
			items.push({ label: 'Price/Book', value: data.priceToBook.toFixed(2), section: 'Valuation' });
		}
		if (data.enterpriseValue !== null && data.enterpriseValue !== undefined) {
			items.push({ label: 'Enterprise Value', value: this.formatNumber(data.enterpriseValue), section: 'Valuation' });
		}
		if (data.evEbitda !== null && data.evEbitda !== undefined) {
			items.push({ label: 'EV/EBITDA', value: data.evEbitda.toFixed(2), section: 'Valuation' });
		}
		if (data.evRevenue !== null && data.evRevenue !== undefined) {
			items.push({ label: 'EV/Revenue', value: data.evRevenue.toFixed(2), section: 'Valuation' });
		}
		if (data.beta !== null && data.beta !== undefined) {
			items.push({ label: 'Beta', value: data.beta.toFixed(2), section: 'Valuation' });
		}
		if (data.bookValue !== null && data.bookValue !== undefined) {
			items.push({ label: 'Book Value/Share', value: data.bookValue.toFixed(2), section: 'Valuation' });
		}
		if (data.priceToCashflow !== null && data.priceToCashflow !== undefined) {
			items.push({ label: 'Price/Cashflow', value: data.priceToCashflow.toFixed(2), section: 'Valuation' });
		}
		if (data.priceToFreeCashflow !== null && data.priceToFreeCashflow !== undefined) {
			items.push({ label: 'Price/Free Cashflow', value: data.priceToFreeCashflow.toFixed(2), section: 'Valuation' });
		}
		
		// Earnings Section
		if (data.eps !== null && data.eps !== undefined) {
			items.push({ label: 'EPS (TTM)', value: data.eps.toFixed(2), section: 'Earnings' });
		}
		if (data.earningsGrowth !== null && data.earningsGrowth !== undefined) {
			items.push({ label: 'Earnings Growth', value: data.earningsGrowth.toFixed(2) + '%', section: 'Earnings' });
		}
		if (data.revenueGrowth !== null && data.revenueGrowth !== undefined) {
			items.push({ label: 'Revenue Growth (TTM)', value: data.revenueGrowth.toFixed(2) + '%', section: 'Earnings' });
		}
		if (data.revenueGrowth3Y !== null && data.revenueGrowth3Y !== undefined) {
			items.push({ label: 'Revenue Growth (3Y)', value: data.revenueGrowth3Y.toFixed(2) + '%', section: 'Earnings' });
		}
		if (data.revenueGrowth5Y !== null && data.revenueGrowth5Y !== undefined) {
			items.push({ label: 'Revenue Growth (5Y)', value: data.revenueGrowth5Y.toFixed(2) + '%', section: 'Earnings' });
		}
		if (data.earningsGrowth3Y !== null && data.earningsGrowth3Y !== undefined) {
			items.push({ label: 'Earnings Growth (3Y)', value: data.earningsGrowth3Y.toFixed(2) + '%', section: 'Earnings' });
		}
		if (data.earningsGrowth5Y !== null && data.earningsGrowth5Y !== undefined) {
			items.push({ label: 'Earnings Growth (5Y)', value: data.earningsGrowth5Y.toFixed(2) + '%', section: 'Earnings' });
		}
		
		// Margins Section
		if (data.profitMargin !== null && data.profitMargin !== undefined) {
			items.push({ label: 'Profit Margin', value: data.profitMargin.toFixed(2) + '%', section: 'Margins' });
		}
		if (data.operatingMargin !== null && data.operatingMargin !== undefined) {
			items.push({ label: 'Operating Margin', value: data.operatingMargin.toFixed(2) + '%', section: 'Margins' });
		}
		if (data.grossMargin !== null && data.grossMargin !== undefined) {
			items.push({ label: 'Gross Margin', value: data.grossMargin.toFixed(2) + '%', section: 'Margins' });
		}
		if (data.pretaxMargin !== null && data.pretaxMargin !== undefined) {
			items.push({ label: 'Pretax Margin', value: data.pretaxMargin.toFixed(2) + '%', section: 'Margins' });
		}
		
		// Ratios Section
		if (data.roe !== null && data.roe !== undefined) {
			items.push({ label: 'ROE (Return on Equity)', value: data.roe.toFixed(2) + '%', section: 'Ratios' });
		}
		if (data.roa !== null && data.roa !== undefined) {
			items.push({ label: 'ROA (Return on Assets)', value: data.roa.toFixed(2) + '%', section: 'Ratios' });
		}
		if (data.roi !== null && data.roi !== undefined) {
			items.push({ label: 'ROI (Return on Investment)', value: data.roi.toFixed(2) + '%', section: 'Ratios' });
		}
		if (data.currentRatio !== null && data.currentRatio !== undefined) {
			items.push({ label: 'Current Ratio', value: data.currentRatio.toFixed(2), section: 'Ratios' });
		}
		if (data.quickRatio !== null && data.quickRatio !== undefined) {
			items.push({ label: 'Quick Ratio', value: data.quickRatio.toFixed(2), section: 'Ratios' });
		}
		if (data.debtToEquity !== null && data.debtToEquity !== undefined) {
			items.push({ label: 'Debt/Equity', value: data.debtToEquity.toFixed(2), section: 'Ratios' });
		}
		
		// Dividends Section
		if (data.dividendYield !== null && data.dividendYield !== undefined) {
			items.push({ label: 'Dividend Yield', value: data.dividendYield.toFixed(2) + '%', section: 'Dividends' });
		}
		if (data.payoutRatio !== null && data.payoutRatio !== undefined) {
			items.push({ label: 'Payout Ratio', value: data.payoutRatio.toFixed(2) + '%', section: 'Dividends' });
		}
		
		// Income Statement Section
		if (data.totalRevenue !== null && data.totalRevenue !== undefined) {
			items.push({ label: 'Total Revenue', value: this.formatNumber(data.totalRevenue), section: 'Income Statement' });
		}
		if (data.netIncome !== null && data.netIncome !== undefined) {
			items.push({ label: 'Net Income', value: this.formatNumber(data.netIncome), section: 'Income Statement' });
		}
		if (data.ebit !== null && data.ebit !== undefined) {
			items.push({ label: 'EBIT', value: this.formatNumber(data.ebit), section: 'Income Statement' });
		}
		if (data.ebitda !== null && data.ebitda !== undefined) {
			items.push({ label: 'EBITDA', value: this.formatNumber(data.ebitda), section: 'Income Statement' });
		}
		
		// Balance Sheet Section
		if (data.totalAssets !== null && data.totalAssets !== undefined) {
			items.push({ label: 'Total Assets', value: this.formatNumber(data.totalAssets), section: 'Balance Sheet' });
		}
		if (data.totalLiabilities !== null && data.totalLiabilities !== undefined) {
			items.push({ label: 'Total Liabilities', value: this.formatNumber(data.totalLiabilities), section: 'Balance Sheet' });
		}
		
		// Cashflow Section
		if (data.operatingCashflow !== null && data.operatingCashflow !== undefined) {
			items.push({ label: 'Operating Cashflow', value: this.formatNumber(data.operatingCashflow), section: 'Cashflow' });
		}
		if (data.freeCashflow !== null && data.freeCashflow !== undefined) {
			items.push({ label: 'Free Cashflow', value: this.formatNumber(data.freeCashflow), section: 'Cashflow' });
		}
		
		if (items.length === 0) {
			container.innerHTML = '<div class="loading">No data available</div>';
			return;
		}
		
		// Group items by section
		const sections = {};
		items.forEach(item => {
			const section = item.section || 'Other';
			if (!sections[section]) {
				sections[section] = [];
			}
			sections[section].push(item);
		});
		
		// Render with sections
		container.innerHTML = Object.keys(sections).map(sectionName => {
			const sectionItems = sections[sectionName];
			return `
				<div class="section">
					<div class="section-title">${sectionName}</div>
					<div class="section-grid">
						${sectionItems.map(item => `
							<div class="item">
								<div class="label">${item.label}</div>
								<div class="value">${item.value}</div>
							</div>
						`).join('')}
					</div>
				</div>
			`;
		}).join('');
	}
}

customElements.define('stock-fundamentals', StockFundamentals);


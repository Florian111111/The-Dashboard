import { getCachedData, setCachedData } from '../utils/cache.js';

import { API_BASE_URL } from '../config.js';

export class StockDividends extends HTMLElement {
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
				this.loadDividendData();
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
				.loading {
					color: #9fb0c0;
					text-align: center;
					padding: 20px;
				}
				:host(.light-mode) .loading {
					color: #2a2a2a;
				}
				.error {
					color: #ef4444;
					text-align: center;
					padding: 20px;
				}
				.dividend-section {
					margin-bottom: 20px;
				}
				.dividend-section:last-child {
					margin-bottom: 0;
				}
				.section-title {
					font-size: 0.95rem;
					font-weight: 600;
					color: #9fb0c0;
					margin-bottom: 12px;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}
				:host(.light-mode) .section-title {
					color: #2a2a2a;
				}
				.dividend-list {
					display: flex;
					flex-direction: column;
					gap: 8px;
				}
				.dividend-item {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 12px;
					display: flex;
					justify-content: space-between;
					align-items: center;
					transition: all 0.2s ease;
				}
				.dividend-item:hover {
					border-color: #4ea1f3;
					transform: translateY(-1px);
				}
				:host(.light-mode) .dividend-item {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.dividend-date {
					color: #e6edf3;
					font-size: 0.9rem;
					font-weight: 500;
				}
				:host(.light-mode) .dividend-date {
					color: #0a0a0a;
				}
				.dividend-amount {
					color: #10b981;
					font-size: 1rem;
					font-weight: 700;
				}
				:host(.light-mode) .dividend-amount {
					color: #059669;
				}
				.no-dividends {
					color: #9fb0c0;
					text-align: center;
					padding: 20px;
					font-size: 0.9rem;
				}
				:host(.light-mode) .no-dividends {
					color: #2a2a2a;
				}
				.dividend-summary {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 12px;
					margin-bottom: 20px;
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
					gap: 12px;
				}
				:host(.light-mode) .dividend-summary {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.summary-item {
					text-align: center;
				}
				.summary-label {
					font-size: 0.75rem;
					color: #9fb0c0;
					margin-bottom: 4px;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}
				:host(.light-mode) .summary-label {
					color: #2a2a2a;
				}
				.summary-value {
					font-size: 1.1rem;
					font-weight: 700;
					color: #4ea1f3;
				}
				:host(.light-mode) .summary-value {
					color: var(--accent-blue);
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
			</style>
			<h3>Dividends</h3>
			<div class="progress-container" id="progress-container" style="display: none;">
				<div class="progress-bar" id="progress-bar"></div>
			</div>
			<div id="dividend-container">
				<div class="loading">Loading dividend data...</div>
			</div>
		`;
		
		// Apply saved theme FIRST
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.classList.add('light-mode');
		} else {
			this.classList.remove('light-mode');
		}
		
		// Load data after theme is set
		if (this.symbol) {
			setTimeout(() => {
				this.loadDividendData();
			}, 50);
		}
		
		// Listen for theme changes
		this.themeChangeHandler = () => {
			const savedTheme = localStorage.getItem('theme') || 'dark';
			if (savedTheme === 'light') {
				this.classList.add('light-mode');
			} else {
				this.classList.remove('light-mode');
			}
			setTimeout(() => {
				if (this.symbol) {
					this.loadDividendData();
				}
			}, 50);
		};
		window.addEventListener('storage', this.themeChangeHandler);
		window.addEventListener('themechange', this.themeChangeHandler);
		
		// Use MutationObserver to watch for class changes
		this.observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
					const savedTheme = localStorage.getItem('theme') || 'dark';
					if (savedTheme === 'light' && !this.classList.contains('light-mode')) {
						this.classList.add('light-mode');
					} else if (savedTheme === 'dark' && this.classList.contains('light-mode')) {
						this.classList.remove('light-mode');
					}
					setTimeout(() => {
						if (this.symbol) {
							this.loadDividendData();
						}
					}, 100);
				}
			});
		});
		this.observer.observe(this, { attributes: true, attributeFilter: ['class'] });
		
		// Also observe parent element if it exists
		const parent = this.getRootNode().host || this.parentElement;
		if (parent && parent.shadowRoot) {
			this.parentObserver = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
						const parentHasLightMode = parent.classList?.contains('light-mode');
						const savedTheme = localStorage.getItem('theme') || 'dark';
						const shouldBeLight = savedTheme === 'light' || parentHasLightMode;
						
						if (shouldBeLight && !this.classList.contains('light-mode')) {
							this.classList.add('light-mode');
						} else if (!shouldBeLight && this.classList.contains('light-mode')) {
							this.classList.remove('light-mode');
						}
						
						setTimeout(() => {
							if (this.symbol) {
								this.loadDividendData();
							}
						}, 100);
					}
				});
			});
			this.parentObserver.observe(parent, { attributes: true, attributeFilter: ['class'] });
		}
	}
	
	disconnectedCallback() {
		if (this.themeChangeHandler) {
			window.removeEventListener('storage', this.themeChangeHandler);
			window.removeEventListener('themechange', this.themeChangeHandler);
		}
		if (this.observer) {
			this.observer.disconnect();
		}
		if (this.parentObserver) {
			this.parentObserver.disconnect();
		}
	}

	async loadDividendData() {
		if (!this.symbol) return;
		const container = this.shadowRoot.getElementById('dividend-container');
		if (!container) return;
		
		// Check cache first
		const cachedData = getCachedData(this.symbol, 'dividends');
		if (cachedData) {
			console.log('[Dividends] Using cached data');
			this.renderDividends(container, cachedData.dividends, cachedData.dividendYield, cachedData.dividendRate);
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
			// Fetch dividend data from Python backend (uses yfinance)
			const response = await fetch(`${API_BASE_URL}/api/dividends/${this.symbol}`);
			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}
			const data = await response.json();
			console.log('[Dividends] Received data:', data);
			
			// Convert dividend history to Date objects
			const dividends = (data.dividendHistory || []).map(div => ({
				date: new Date(div.date * 1000),
				amount: div.amount || 0
			}));
			
			// Add next dividend if available
			if (data.nextDividendDate && data.dividendRate) {
				const nextDate = new Date(data.nextDividendDate * 1000);
				// Check if this date is in the future and not already in history
				const now = new Date();
				if (nextDate > now) {
					const exists = dividends.find(d => 
						Math.abs(d.date.getTime() - nextDate.getTime()) < 24 * 60 * 60 * 1000
					);
					if (!exists) {
						dividends.push({
							date: nextDate,
							amount: (data.dividendRate || 0) / 4 // Quarterly estimate
						});
					}
				}
			}
			
			// Sort by date, newest first
			dividends.sort((a, b) => b.date - a.date);
			
			// Cache the dividend data
			setCachedData(this.symbol, 'dividends', {
				dividends: dividends,
				dividendYield: data.dividendYield,
				dividendRate: data.dividendRate
			});
			
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
			
			this.renderDividends(container, dividends, data.dividendYield, data.dividendRate);
		} catch (error) {
			if (progressInterval) {
				clearInterval(progressInterval);
			}
			if (progressContainer) {
				progressContainer.style.display = 'none';
			}
			console.error('[Dividends] Error:', error);
			container.innerHTML = `<div class="error">Error loading dividend data: ${error.message}</div>`;
		}
	}
	
	renderDividends(container, dividends, dividendYield, dividendRate) {
		const isLightMode = this.classList.contains('light-mode');
		const now = new Date();
		const upcomingDividends = dividends.filter(d => d.date > now).sort((a, b) => a.date - b.date);
		const pastDividends = dividends.filter(d => d.date <= now).slice(0, 10); // Show last 10
		
		let html = '';
		
		// Summary section - always show if we have yield or rate data
		if (dividendYield !== null && dividendYield !== undefined || dividendRate !== null && dividendRate !== undefined) {
			html += '<div class="dividend-summary">';
			if (dividendYield !== null && dividendYield !== undefined) {
				// Finnhub returns yield as percentage (e.g., 0.3838 = 0.3838%), not decimal
				// Display directly without multiplying by 100
				html += `
					<div class="summary-item">
						<div class="summary-label">Dividend Yield</div>
						<div class="summary-value">${dividendYield.toFixed(2)}%</div>
					</div>
				`;
			}
			if (dividendRate !== null && dividendRate !== undefined) {
				html += `
					<div class="summary-item">
						<div class="summary-label">Annual Rate</div>
						<div class="summary-value">$${dividendRate.toFixed(2)}</div>
					</div>
				`;
			}
			if (pastDividends.length > 0) {
				const totalPastYear = pastDividends
					.filter(d => {
						const oneYearAgo = new Date(now);
						oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
						return d.date > oneYearAgo;
					})
					.reduce((sum, d) => sum + d.amount, 0);
				if (totalPastYear > 0) {
					html += `
						<div class="summary-item">
							<div class="summary-label">Last 12 Months</div>
							<div class="summary-value">$${totalPastYear.toFixed(2)}</div>
						</div>
					`;
				}
			}
			html += '</div>';
		}
		
		// Upcoming dividends
		if (upcomingDividends.length > 0) {
			html += '<div class="dividend-section">';
			html += '<div class="section-title">Upcoming Dividends</div>';
			html += '<div class="dividend-list">';
			upcomingDividends.forEach(dividend => {
				const dateStr = dividend.date.toLocaleDateString('en-US', { 
					year: 'numeric', 
					month: 'short', 
					day: 'numeric' 
				});
				html += `
					<div class="dividend-item">
						<div class="dividend-date">${dateStr}</div>
						<div class="dividend-amount">$${dividend.amount.toFixed(2)}</div>
					</div>
				`;
			});
			html += '</div>';
			html += '</div>';
		}
		
		// Past dividends
		if (pastDividends.length > 0) {
			html += '<div class="dividend-section">';
			html += '<div class="section-title">Recent Dividends</div>';
			html += '<div class="dividend-list">';
			pastDividends.forEach(dividend => {
				const dateStr = dividend.date.toLocaleDateString('en-US', { 
					year: 'numeric', 
					month: 'short', 
					day: 'numeric' 
				});
				html += `
					<div class="dividend-item">
						<div class="dividend-date">${dateStr}</div>
						<div class="dividend-amount">$${dividend.amount.toFixed(2)}</div>
					</div>
				`;
			});
			html += '</div>';
			html += '</div>';
		}
		
		// Only show "no data" message if we have no summary AND no dividends
		if (html === '' || ((upcomingDividends.length === 0 && pastDividends.length === 0) && 
			(dividendYield === null || dividendYield === undefined) && 
			(dividendRate === null || dividendRate === undefined))) {
			html = '<div class="no-dividends">No dividend data available for this stock.</div>';
		} else if (upcomingDividends.length === 0 && pastDividends.length === 0) {
			// Show message that history is not available, but summary is shown
			html += '<div class="no-dividends" style="margin-top: 15px; font-size: 0.85rem;">Dividend history is not available, but current dividend information is shown above.</div>';
		}
		
		container.innerHTML = html;
	}
}


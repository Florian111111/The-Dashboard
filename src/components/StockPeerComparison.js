import { getCachedData, setCachedData } from '../utils/cache.js';

import { API_BASE_URL } from '../config.js';

export class StockPeerComparison extends HTMLElement {
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
				this.loadPeerData();
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
					margin: 0;
					color: #e6edf3;
					font-size: 1.2rem;
				}
				:host(.light-mode) h3 {
					color: #0a0a0a;
				}
				.title-container {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 15px;
				}
				.title-wrapper {
					display: flex;
					align-items: center;
					gap: 10px;
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
				.industry-info {
					color: #9fb0c0;
					font-size: 0.8rem;
					margin-bottom: 16px;
					padding: 6px 10px;
					background: transparent;
					border-radius: 4px;
					border: none;
					font-weight: 400;
				}
				:host(.light-mode) .industry-info {
					color: #4a5568;
				}
				.comparison-table {
					width: 100%;
					border-collapse: collapse;
					margin-top: 15px;
				}
				.comparison-table {
					position: relative;
				}
				.comparison-table thead {
					position: sticky;
					top: 0;
					z-index: 10;
				}
				.comparison-table th {
					background: #0b0f14;
					color: #9fb0c0;
					font-size: 0.75rem;
					font-weight: 500;
					padding: 10px 8px;
					text-align: left;
					border-bottom: 1px solid #1f2a37;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}
				:host(.light-mode) .comparison-table th {
					background: #c0c9d4;
					color: #4a5568;
					border-bottom-color: #a0aab8;
				}
				.comparison-table td {
					padding: 12px 8px;
					border-bottom: 1px solid #1f2a37;
					color: #e6edf3;
					font-size: 0.875rem;
				}
				:host(.light-mode) .comparison-table td {
					color: #0a0a0a;
					border-bottom-color: #a0aab8;
				}
				.comparison-table tr:hover {
					background: rgba(78, 161, 243, 0.03);
				}
				:host(.light-mode) .comparison-table tr:hover {
					background: rgba(29, 78, 216, 0.03);
				}
				.comparison-table tr.current-stock {
					background: rgba(78, 161, 243, 0.06);
					font-weight: 500;
				}
				:host(.light-mode) .comparison-table tr.current-stock {
					background: rgba(29, 78, 216, 0.06);
				}
				.stock-name {
					font-weight: 500;
					color: #e6edf3;
				}
				:host(.light-mode) .stock-name {
					color: #0a0a0a;
				}
				.stock-symbol {
					font-size: 0.8rem;
					color: #9fb0c0;
					margin-left: 6px;
					font-weight: 400;
				}
				:host(.light-mode) .stock-symbol {
					color: #4a5568;
				}
				.metric-value {
					font-weight: 400;
					color: #e6edf3;
				}
				:host(.light-mode) .metric-value {
					color: #0a0a0a;
				}
				.metric-value.better {
					color: #10b981;
				}
				.metric-value.worse {
					color: #ef4444;
				}
				.metric-value.neutral {
					color: #9fb0c0;
				}
				:host(.light-mode) .metric-value.neutral {
					color: #4a5568;
				}
				.no-data {
					color: #9fb0c0;
					text-align: center;
					padding: 20px;
					font-size: 0.9rem;
				}
				:host(.light-mode) .no-data {
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
				.table-container {
					max-height: 350px;
					overflow-y: auto;
					border: none;
					border-radius: 0;
					position: relative;
				}
				.table-container::-webkit-scrollbar {
					width: 6px;
				}
				.table-container::-webkit-scrollbar-track {
					background: #0b0f14;
					border-radius: 3px;
				}
				:host(.light-mode) .table-container::-webkit-scrollbar-track {
					background: #c0c9d4;
				}
				.table-container::-webkit-scrollbar-thumb {
					background: #1f2a37;
					border-radius: 3px;
				}
				:host(.light-mode) 				.table-container::-webkit-scrollbar-thumb {
					background: #a0aab8;
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
				.view-more-btn:active {
					transform: translateY(0);
				}
				/* Modal Styles */
				.modal-overlay {
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
				.modal-overlay.show {
					display: flex;
				}
				.modal {
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
				:host(.light-mode) .modal {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.modal-header {
					padding: 20px;
					border-bottom: 1px solid #1f2a37;
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-shrink: 0;
				}
				:host(.light-mode) .modal-header {
					border-bottom-color: #a0aab8;
				}
				.modal-title {
					font-size: 1.4rem;
					font-weight: 700;
					color: #e6edf3;
				}
				:host(.light-mode) .modal-title {
					color: #0a0a0a;
				}
				.modal-close {
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
				.modal-close:hover {
					background: rgba(239, 68, 68, 0.2);
					color: #ef4444;
				}
				.modal-content {
					padding: 20px;
					overflow-y: auto;
					flex: 1;
				}
				.modal-table-container {
					max-height: 60vh;
					overflow-y: auto;
				}
			</style>
			<div class="title-container">
				<div class="title-wrapper">
					<h3>Peer Comparison</h3>
				</div>
				<button class="view-more-btn" id="view-more-btn" style="display: none;">View More</button>
			</div>
			<!-- Modal -->
			<div class="modal-overlay" id="modal-overlay">
				<div class="modal">
					<div class="modal-header">
						<div class="modal-title">Peer Comparison - Extended</div>
						<button class="modal-close" id="modal-close">×</button>
					</div>
					<div class="modal-content">
						<div class="modal-table-container" id="modal-table-container">
							<div class="loading">Loading extended comparison...</div>
						</div>
					</div>
				</div>
			</div>
			<div class="progress-container" id="progress-container" style="display: none;">
				<div class="progress-bar" id="progress-bar"></div>
			</div>
			<div id="peer-container">
				<div class="loading">Loading peer comparison...</div>
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
				this.loadPeerData();
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
					this.loadPeerData();
				}
			}, 50);
		};
		window.addEventListener('storage', this.themeChangeHandler);
		window.addEventListener('themechange', this.themeChangeHandler);
	}
	
	disconnectedCallback() {
		if (this.themeChangeHandler) {
			window.removeEventListener('storage', this.themeChangeHandler);
			window.removeEventListener('themechange', this.themeChangeHandler);
		}
	}

	async loadPeerData() {
		if (!this.symbol) return;
		const container = this.shadowRoot.getElementById('peer-container');
		if (!container) return;
		
		// First, try to get industry/sector from description cache
		let industry = null;
		let sector = null;
		try {
			const descriptionCache = getCachedData(this.symbol, 'description');
			if (descriptionCache && descriptionCache.companyInfo) {
				industry = descriptionCache.companyInfo.industry;
				sector = descriptionCache.companyInfo.sector;
				console.log('[Peer Comparison] Found industry/sector from description:', { industry, sector });
			}
		} catch (error) {
			console.warn('[Peer Comparison] Could not read description cache:', error);
		}
		
		// Check cache first
		const cachedData = getCachedData(this.symbol, 'peer-comparison');
		if (cachedData) {
			console.log('[Peer Comparison] Using cached data');
			this.renderPeerComparison(container, cachedData);
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
			// Build URL with industry/sector as query parameters if available
			let url = `${API_BASE_URL}/api/peer-comparison/${this.symbol}`;
			const params = new URLSearchParams();
			if (industry && industry !== 'N/A') {
				params.append('industry', industry);
			}
			if (sector && sector !== 'N/A') {
				params.append('sector', sector);
			}
			if (params.toString()) {
				url += '?' + params.toString();
			}
			
			console.log('[Peer Comparison] Fetching with industry/sector:', { industry, sector });
			// Fetch peer comparison data from Python backend
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}
			const data = await response.json();
			console.log('[Peer Comparison] Received data:', data);
			console.log('[Peer Comparison] Current stock:', data.currentStock);
			console.log('[Peer Comparison] Peers:', data.peers);
			console.log('[Peer Comparison] Industry:', data.industry);
			console.log('[Peer Comparison] Error:', data.error);
			
			// Cache the peer comparison data
			setCachedData(this.symbol, 'peer-comparison', data);
			
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
			
			this.renderPeerComparison(container, data);
		} catch (error) {
			if (progressInterval) {
				clearInterval(progressInterval);
			}
			if (progressContainer) {
				progressContainer.style.display = 'none';
			}
			console.error('[Peer Comparison] Error:', error);
			container.innerHTML = `<div class="error">Error loading peer comparison: ${error.message}</div>`;
		}
	}
	
	renderPeerComparison(container, data) {
		console.log('[Peer Comparison] Rendering with data:', data);
		
		if (data.error) {
			console.log('[Peer Comparison] Error in data:', data.error);
			container.innerHTML = `<div class="no-data">${data.error}</div>`;
			return;
		}
		
		// Even if no peers, show current stock data if available
		if (!data.currentStock) {
			console.log('[Peer Comparison] No current stock data');
			container.innerHTML = `<div class="no-data">No peer comparison data available for this stock.</div>`;
			return;
		}
		
		console.log('[Peer Comparison] Current stock exists, peers count:', data.peers ? data.peers.length : 0);
		
		let html = '';
		
		// Industry info
		if (data.industry) {
			html += `<div class="industry-info">Industry: ${data.industry}</div>`;
		}
		
		// Prepare all stocks for comparison (current + peers)
		// If no peers, still show current stock
		const allStocks = data.peers && data.peers.length > 0 
			? [data.currentStock, ...data.peers]
			: [data.currentStock];
		
		// Calculate averages for comparison
		const metrics = ['peRatio', 'peRatioForward', 'priceToBook'];
		const averages = {};
		const validValues = {};
		
		metrics.forEach(metric => {
			validValues[metric] = allStocks
				.map(stock => stock[metric])
				.filter(val => val !== null && val !== undefined && !isNaN(val) && isFinite(val));
			
			if (validValues[metric].length > 0) {
				averages[metric] = validValues[metric].reduce((a, b) => a + b, 0) / validValues[metric].length;
			}
		});
		
		// Helper function to format metric value
		const formatMetric = (value) => {
			if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
				return 'N/A';
			}
			if (value >= 1000) {
				return value.toFixed(1);
			}
			if (value >= 100) {
				return value.toFixed(2);
			}
			return value.toFixed(2);
		};
		
		// Helper function to determine if value is better/worse (lower is better for P/E, P/B, Debt/Equity; higher is better for ROE)
		const getMetricClass = (value, metric, currentValue) => {
			if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
				return 'neutral';
			}
			if (currentValue === null || currentValue === undefined || isNaN(currentValue) || !isFinite(currentValue)) {
				return 'neutral';
			}
			
			// Lower is better for P/E, P/E Forward, P/B
			return value < currentValue ? 'better' : value > currentValue ? 'worse' : 'neutral';
		};
		
		html += '<div class="table-container">';
		html += '<table class="comparison-table">';
		html += '<thead>';
		html += '<tr>';
		html += '<th>Stock</th>';
		html += '<th>P/E</th>';
		html += '<th>P/E Forward</th>';
		html += '<th>P/B</th>';
		html += '</tr>';
		html += '</thead>';
		html += '<tbody>';
		
		allStocks.forEach((stock, index) => {
			const isCurrent = index === 0;
			const rowClass = isCurrent ? 'current-stock' : '';
			
			// Ensure stock has valid data
			if (!stock || (!stock.name && !stock.symbol)) {
				console.warn('[Peer Comparison] Skipping invalid stock:', stock);
				return;
			}
			
			html += `<tr class="${rowClass}">`;
			
			// Stock name and symbol
			html += '<td>';
			const stockName = stock.name || stock.symbol || 'Unknown';
			const stockSymbol = stock.symbol || 'N/A';
			html += `<span class="stock-name">${stockName}</span>`;
			html += `<span class="stock-symbol">(${stockSymbol})</span>`;
			if (isCurrent) {
				html += ' <span style="font-size: 0.7rem; color: #9fb0c0; margin-left: 6px; font-weight: 400;">(Current)</span>';
			}
			html += '</td>';
			
			// PE Ratio
			const peValue = stock.peRatio;
			const peClass = isCurrent ? 'neutral' : getMetricClass(peValue, 'peRatio', data.currentStock.peRatio);
			html += `<td><span class="metric-value ${peClass}">${formatMetric(peValue)}</span></td>`;
			
			// PE Ratio Forward
			const peForwardValue = stock.peRatioForward;
			const peForwardClass = isCurrent ? 'neutral' : getMetricClass(peForwardValue, 'peRatioForward', data.currentStock.peRatioForward);
			html += `<td><span class="metric-value ${peForwardClass}">${formatMetric(peForwardValue)}</span></td>`;
			
			// Price Book Ratio
			const pbValue = stock.priceToBook;
			const pbClass = isCurrent ? 'neutral' : getMetricClass(pbValue, 'priceToBook', data.currentStock.priceToBook);
			html += `<td><span class="metric-value ${pbClass}">${formatMetric(pbValue)}</span></td>`;
			
			html += '</tr>';
		});
		
		html += '</tbody>';
		html += '</table>';
		html += '</div>';
		
		container.innerHTML = html;
		
		// Show View More button and set up event listener
		const viewMoreBtn = this.shadowRoot.getElementById('view-more-btn');
		if (viewMoreBtn) {
			viewMoreBtn.style.display = 'block';
			// Remove old listeners by cloning
			const newBtn = viewMoreBtn.cloneNode(true);
			viewMoreBtn.parentNode.replaceChild(newBtn, viewMoreBtn);
			newBtn.addEventListener('click', () => {
				this.openExtendedModal(data);
			});
		}
	}
	
	openExtendedModal(data) {
		const overlay = this.shadowRoot.getElementById('modal-overlay');
		const modalContainer = this.shadowRoot.getElementById('modal-table-container');
		const closeBtn = this.shadowRoot.getElementById('modal-close');
		
		if (!overlay || !modalContainer) return;
		
		overlay.classList.add('show');
		
		// Render extended table
		this.renderExtendedTable(modalContainer, data);
		
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
	
	renderExtendedTable(container, data) {
		if (data.error || !data.currentStock) {
			container.innerHTML = `<div class="no-data">${data.error || 'No extended comparison data available.'}</div>`;
			return;
		}
		
		const allStocks = data.peers && data.peers.length > 0 
			? [data.currentStock, ...data.peers]
			: [data.currentStock];
		
		const formatMetric = (value) => {
			if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
				return 'N/A';
			}
			if (value >= 1000) {
				return value.toFixed(1);
			}
			if (value >= 100) {
				return value.toFixed(2);
			}
			return value.toFixed(2);
		};
		
		const formatPercent = (value) => {
			if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
				return 'N/A';
			}
			return `${value.toFixed(2)}%`;
		};
		
		let html = '<div class="table-container">';
		html += '<table class="comparison-table">';
		html += '<thead>';
		html += '<tr>';
		html += '<th>Stock</th>';
		html += '<th>P/E</th>';
		html += '<th>P/E Forward</th>';
		html += '<th>P/B</th>';
		html += '<th>Beta</th>';
		html += '<th>Dividend Yield</th>';
		html += '</tr>';
		html += '</thead>';
		html += '<tbody>';
		
		allStocks.forEach((stock, index) => {
			const isCurrent = index === 0;
			const rowClass = isCurrent ? 'current-stock' : '';
			
			if (!stock || (!stock.name && !stock.symbol)) {
				return;
			}
			
			html += `<tr class="${rowClass}">`;
			
			// Stock name and symbol
			html += '<td>';
			const stockName = stock.name || stock.symbol || 'Unknown';
			const stockSymbol = stock.symbol || 'N/A';
			html += `<span class="stock-name">${stockName}</span>`;
			html += `<span class="stock-symbol">(${stockSymbol})</span>`;
			if (isCurrent) {
				html += ' <span style="font-size: 0.7rem; color: #9fb0c0; margin-left: 6px; font-weight: 400;">(Current)</span>';
			}
			html += '</td>';
			
			// P/E Ratio
			html += `<td><span class="metric-value">${formatMetric(stock.peRatio)}</span></td>`;
			
			// P/E Forward
			html += `<td><span class="metric-value">${formatMetric(stock.peRatioForward)}</span></td>`;
			
			// P/B
			html += `<td><span class="metric-value">${formatMetric(stock.priceToBook)}</span></td>`;
			
			// Beta
			html += `<td><span class="metric-value">${formatMetric(stock.beta)}</span></td>`;
			
			// Dividend Yield
			html += `<td><span class="metric-value">${formatPercent(stock.dividendYield)}</span></td>`;
			
			html += '</tr>';
		});
		
		html += '</tbody>';
		html += '</table>';
		html += '</div>';
		
		container.innerHTML = html;
	}
}

customElements.define('stock-peer-comparison', StockPeerComparison);


import { API_BASE_URL } from '../config.js';

export class SectorHeatmap extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.data = [];
	}

	connectedCallback() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					width: 100%;
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
					box-sizing: border-box;
				}
				.heatmap-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 20px;
				}
				.heatmap-title {
					font-size: 1.3rem;
					font-weight: 600;
					color: #e6edf3;
				}
				.stock-count {
					font-size: 0.9rem;
					color: #9fb0c0;
				}
				.heatmap-container {
					width: 100%;
					background: #0b0f14;
					border-radius: 8px;
				}
				.sector-section {
					margin-bottom: 20px;
				}
				.sector-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					font-size: 0.9rem;
					font-weight: 600;
					color: #4ea1f3;
					margin-bottom: 8px;
					padding-bottom: 6px;
					border-bottom: 1px solid #1f2a37;
				}
				.sector-name {
					display: flex;
					align-items: center;
					gap: 8px;
				}
				.sector-icon {
					font-size: 1rem;
				}
				.sector-stats {
					font-size: 0.7rem;
					color: #9fb0c0;
					font-weight: normal;
				}
				.stocks-grid {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
					gap: 3px;
				}
				.stock-tile {
					aspect-ratio: 1;
					border: 1px solid rgba(255, 255, 255, 0.08);
					border-radius: 3px;
					cursor: pointer;
					transition: all 0.15s ease;
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: center;
					padding: 2px;
					box-sizing: border-box;
					position: relative;
				}
				.stock-tile:hover {
					border-color: #4ea1f3;
					transform: scale(1.15);
					box-shadow: 0 3px 10px rgba(78, 161, 243, 0.5);
					z-index: 10;
				}
				.stock-ticker {
					font-weight: 700;
					font-size: 0.55rem;
					color: #0b0f14;
					margin-bottom: 1px;
					text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
					text-align: center;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					max-width: 100%;
					line-height: 1.1;
				}
				.stock-change {
					font-weight: 600;
					font-size: 0.45rem;
					color: #0b0f14;
					text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
					line-height: 1.1;
				}
				.loading {
					text-align: center;
					color: #9fb0c0;
					padding: 40px;
				}
				.loading-spinner {
					display: inline-block;
					width: 30px;
					height: 30px;
					border: 3px solid #1f2a37;
					border-radius: 50%;
					border-top-color: #4ea1f3;
					animation: spin 1s ease-in-out infinite;
					margin-bottom: 10px;
				}
				@keyframes spin {
					to { transform: rotate(360deg); }
				}
				.error {
					text-align: center;
					color: #ef4444;
					padding: 40px;
				}
				.progress-bar {
					width: 100%;
					height: 4px;
					background: #1f2a37;
					border-radius: 2px;
					margin-top: 15px;
					overflow: hidden;
				}
				.progress-fill {
					height: 100%;
					background: linear-gradient(90deg, #4ea1f3, #10b981);
					border-radius: 2px;
					transition: width 0.3s ease;
				}
			</style>
			<div class="heatmap-header">
				<div class="heatmap-title">S&P 500 Heatmap</div>
				<div class="stock-count" id="stock-count"></div>
			</div>
			<div class="heatmap-container" id="heatmap-container">
				<div class="loading">
					<div class="loading-spinner"></div>
					<div>Loading S&P 500 data...</div>
					<div class="progress-bar">
						<div class="progress-fill" id="progress-fill" style="width: 0%"></div>
					</div>
				</div>
			</div>
		`;

		this.loadHeatmapData();
	}

	async loadHeatmapData() {
		const container = this.shadowRoot.getElementById('heatmap-container');
		const stockCount = this.shadowRoot.getElementById('stock-count');
		const progressFill = this.shadowRoot.getElementById('progress-fill');
		
		try {
			console.log('[S&P 500 Heatmap] Fetching all stocks with optimized endpoint...');
			const startTime = performance.now();
			
			// Update progress
			if (progressFill) progressFill.style.width = '30%';
			
			// Use the optimized S&P 500 heatmap endpoint
			const response = await fetch('${API_BASE_URL}/api/sp500-heatmap');
			
			if (progressFill) progressFill.style.width = '70%';
			
			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}
			
			const quoteData = await response.json();
			const stockData = [];
			
			if (quoteData.quoteResponse && quoteData.quoteResponse.result) {
				quoteData.quoteResponse.result.forEach(quote => {
					if (quote && quote.regularMarketPrice && quote.regularMarketPrice > 0) {
						stockData.push({
							ticker: quote.symbol,
							sector: quote.sector,
							price: quote.regularMarketPrice,
							changePercent: quote.regularMarketChangePercent || 0
						});
					}
				});
			}
			
			if (progressFill) progressFill.style.width = '100%';
			
			const loadTime = (performance.now() - startTime).toFixed(0);
			console.log(`[S&P 500 Heatmap] Loaded ${stockData.length} stocks in ${loadTime}ms`);

			if (stockData.length === 0) {
				container.innerHTML = `
					<div class="error">
						<p>Unable to load S&P 500 stock data.</p>
						<p>Please ensure the Python backend is running on port 3001.</p>
					</div>
				`;
				return;
			}

			// Update stock count
			if (stockCount) {
				stockCount.textContent = `${stockData.length} stocks loaded`;
			}

			this.data = stockData;
			this.renderHeatmap();
		} catch (error) {
			console.error('Error loading S&P 500 heatmap data:', error);
			container.innerHTML = `<div class="error">Error loading heatmap data: ${error.message}</div>`;
		}
	}

	renderHeatmap() {
		const container = this.shadowRoot.getElementById('heatmap-container');
		container.innerHTML = '';

		// Group by sector
		const bySector = {};
		this.data.forEach(stock => {
			if (!bySector[stock.sector]) {
				bySector[stock.sector] = [];
			}
			bySector[stock.sector].push(stock);
		});

		// Sector icons
		const sectorIcons = {
			'Information Technology': '💻',
			'Health Care': '🏥',
			'Financials': '🏦',
			'Consumer Discretionary': '🛍️',
			'Communication Services': '📡',
			'Industrials': '🏭',
			'Consumer Staples': '🛒',
			'Energy': '⚡',
			'Utilities': '💡',
			'Real Estate': '🏢',
			'Materials': '🧱'
		};

		// Sort sectors by number of stocks (largest first)
		const sortedSectors = Object.keys(bySector).sort((a, b) => 
			bySector[b].length - bySector[a].length
		);

		// Render each sector
		sortedSectors.forEach(sector => {
			const stocks = bySector[sector];
			
			// Sort stocks within sector by change percent (descending)
			stocks.sort((a, b) => b.changePercent - a.changePercent);
			
			// Calculate sector average change
			const avgChange = stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length;
			const avgChangeSign = avgChange >= 0 ? '+' : '';
			const avgChangeColor = avgChange > 0 ? '#10b981' : avgChange < 0 ? '#ef4444' : '#9fb0c0';
			
			const sectorSection = document.createElement('div');
			sectorSection.className = 'sector-section';
			
			const sectorHeader = document.createElement('div');
			sectorHeader.className = 'sector-header';
			sectorHeader.innerHTML = `
				<div class="sector-name">
					<span class="sector-icon">${sectorIcons[sector] || '📊'}</span>
					<span>${sector}</span>
				</div>
				<div class="sector-stats">
					${stocks.length} stocks | Avg: <span style="color: ${avgChangeColor}">${avgChangeSign}${avgChange.toFixed(2)}%</span>
				</div>
			`;
			sectorSection.appendChild(sectorHeader);
			
			const stocksGrid = document.createElement('div');
			stocksGrid.className = 'stocks-grid';
			
			stocks.forEach(stock => {
				const tile = document.createElement('div');
				tile.className = 'stock-tile';
				
				// Color based on daily change percentage
				const changePercent = stock.changePercent || 0;
				let bgColor;
				if (changePercent > 0) {
					// Green for positive change - intensity based on percentage (max at 5%)
					const intensity = Math.min(1, Math.abs(changePercent) / 5);
					bgColor = `rgba(16, 185, 129, ${0.5 + intensity * 0.5})`;
				} else if (changePercent < 0) {
					// Red for negative change - intensity based on percentage (max at 5%)
					const intensity = Math.min(1, Math.abs(changePercent) / 5);
					bgColor = `rgba(239, 68, 68, ${0.5 + intensity * 0.5})`;
				} else {
					// Gray for no change
					bgColor = 'rgba(107, 114, 128, 0.6)';
				}
				tile.style.backgroundColor = bgColor;
				
				const tickerEl = document.createElement('div');
				tickerEl.className = 'stock-ticker';
				tickerEl.textContent = stock.ticker;
				
				const changeEl = document.createElement('div');
				changeEl.className = 'stock-change';
				const sign = changePercent >= 0 ? '+' : '';
				changeEl.textContent = `${sign}${changePercent.toFixed(1)}%`;
				
				tile.appendChild(tickerEl);
				tile.appendChild(changeEl);
				
				// Add click handler
				tile.addEventListener('click', () => {
					window.dispatchEvent(new CustomEvent('navigate', {
						detail: { page: 'stock-analysis', symbol: stock.ticker }
					}));
				});
				
				stocksGrid.appendChild(tile);
			});
			
			sectorSection.appendChild(stocksGrid);
			container.appendChild(sectorSection);
		});
	}
}

customElements.define('sector-heatmap', SectorHeatmap);

import { API_BASE_URL } from '../config.js';

export class Nasdaq100Heatmap extends HTMLElement {
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
				.stocks-grid {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
					gap: 4px;
				}
				.stock-tile {
					aspect-ratio: 1;
					border: 1px solid rgba(255, 255, 255, 0.08);
					border-radius: 4px;
					cursor: pointer;
					transition: all 0.15s ease;
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: center;
					padding: 4px;
					box-sizing: border-box;
					position: relative;
				}
				.stock-tile:hover {
					border-color: #4ea1f3;
					transform: scale(1.12);
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
			</style>
			<div class="heatmap-header">
				<div class="heatmap-title">Nasdaq 100 Heatmap</div>
				<div class="stock-count" id="stock-count"></div>
			</div>
			<div class="heatmap-container" id="heatmap-container">
				<div class="loading">
					<div class="loading-spinner"></div>
					<div>Loading Nasdaq 100 data...</div>
				</div>
			</div>
		`;

		this.loadHeatmapData();
	}

	async loadHeatmapData() {
		const container = this.shadowRoot.getElementById('heatmap-container');
		const stockCount = this.shadowRoot.getElementById('stock-count');
		
		try {
			console.log(`[Nasdaq 100 Heatmap] Fetching stocks with optimized endpoint...`);
			const startTime = performance.now();
			
			const response = await fetch('${API_BASE_URL}/api/nasdaq100-heatmap');
			
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
							name: quote.name || quote.symbol,
							price: quote.regularMarketPrice,
							changePercent: quote.regularMarketChangePercent || 0
						});
					}
				});
			}
			
			const loadTime = (performance.now() - startTime).toFixed(0);
			console.log(`[Nasdaq 100 Heatmap] Loaded ${stockData.length} stocks in ${loadTime}ms`);

			if (stockData.length === 0) {
				container.innerHTML = `
					<div class="error">
						<p>Unable to load Nasdaq 100 stock data for heatmap.</p>
						<p>Please ensure the Python backend is running on port 3001.</p>
					</div>
				`;
				return;
			}

			if (stockCount) {
				stockCount.textContent = `${stockData.length} stocks loaded`;
			}

			this.data = stockData;
			this.renderHeatmap();
		} catch (error) {
			console.error('Error loading Nasdaq 100 heatmap data:', error);
			container.innerHTML = `<div class="error">Error loading Nasdaq 100 heatmap data: ${error.message}</div>`;
		}
	}

	renderHeatmap() {
		const container = this.shadowRoot.getElementById('heatmap-container');
		container.innerHTML = '';

		const stocksGrid = document.createElement('div');
		stocksGrid.className = 'stocks-grid';
		
		// Sort stocks by ticker for consistent display
		const sortedStocks = [...this.data].sort((a, b) => a.ticker.localeCompare(b.ticker));
		
		sortedStocks.forEach(stock => {
			const tile = document.createElement('div');
			tile.className = 'stock-tile';
			
			// Color based on daily change percentage
			const changePercent = stock.changePercent || 0;
			let bgColor;
			if (changePercent > 0) {
				const intensity = Math.min(1, Math.abs(changePercent) / 5);
				bgColor = `rgba(16, 185, 129, ${0.5 + intensity * 0.5})`;
			} else if (changePercent < 0) {
				const intensity = Math.min(1, Math.abs(changePercent) / 5);
				bgColor = `rgba(239, 68, 68, ${0.5 + intensity * 0.5})`;
			} else {
				bgColor = 'rgba(107, 114, 128, 0.6)';
			}
			tile.style.backgroundColor = bgColor;
			
			const tickerEl = document.createElement('div');
			tickerEl.className = 'stock-ticker';
			tickerEl.textContent = stock.ticker;
			
			const changeEl = document.createElement('div');
			changeEl.className = 'stock-change';
			const sign = changePercent >= 0 ? '+' : '';
			changeEl.textContent = `${sign}${changePercent.toFixed(2)}%`;
			
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
		
		container.appendChild(stocksGrid);
	}
}

customElements.define('nasdaq100-heatmap', Nasdaq100Heatmap);


import { getCachedData, setCachedData } from '../utils/cache.js';

import { API_BASE_URL } from '../config.js';

export class StockSentiment extends HTMLElement {
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
			if (this.shadowRoot && this.shadowRoot.innerHTML) {
				this.loadSentimentData();
			}
		}
	}

	connectedCallback() {
		this.symbol = this.getAttribute('symbol');
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: flex;
					flex-direction: column;
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
					margin-bottom: 20px;
					min-height: 400px;
				}
				:host(.light-mode) {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				h3 {
					margin: 0 0 20px 0;
					color: #e6edf3;
					font-size: 1.2rem;
				}
				:host(.light-mode) h3 {
					color: #0a0a0a;
				}
				.loading {
					color: #9fb0c0;
					text-align: center;
					padding: 40px;
				}
				:host(.light-mode) .loading {
					color: #2a2a2a;
				}
				.error {
					color: #ef4444;
					text-align: center;
					padding: 40px;
				}
				.sentiment-content {
					background: #0b0f14;
					border-radius: 8px;
					border: 1px solid #1f2a37;
					padding: 20px;
				}
				:host(.light-mode) .sentiment-content {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.sentiment-section {
					margin-bottom: 25px;
				}
				.sentiment-section:last-child {
					margin-bottom: 0;
				}
				.section-title {
					color: #4ea1f3;
					font-size: 1rem;
					font-weight: 600;
					margin-bottom: 15px;
				}
				.insider-list {
					display: flex;
					flex-direction: column;
					gap: 12px;
					max-height: 300px;
					overflow-y: auto;
					padding-right: 8px;
				}
				.insider-list::-webkit-scrollbar {
					width: 8px;
				}
				.insider-list::-webkit-scrollbar-track {
					background: #0b0f14;
					border-radius: 4px;
				}
				.insider-list::-webkit-scrollbar-thumb {
					background: #1f2a37;
					border-radius: 4px;
				}
				.insider-list::-webkit-scrollbar-thumb:hover {
					background: #2d3a4a;
				}
				.insider-item {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 15px;
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-wrap: wrap;
				}
				:host(.light-mode) .insider-item {
					background: #d5dce5;
					border-color: #a0aab8;
					gap: 10px;
				}
				.insider-name {
					color: #e6edf3;
					font-weight: 600;
					flex: 1;
					min-width: 150px;
				}
				:host(.light-mode) .insider-name {
					color: #0a0a0a;
				}
				.insider-details {
					display: flex;
					gap: 20px;
					flex-wrap: wrap;
					align-items: center;
				}
				.insider-detail {
					display: flex;
					flex-direction: column;
					gap: 4px;
				}
				.insider-detail-label {
					color: #6b7280;
					font-size: 0.75rem;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}
				:host(.light-mode) .insider-detail-label {
					color: #4a5568;
				}
				.insider-detail-value {
					color: #e6edf3;
					font-size: 0.9rem;
					font-weight: 600;
				}
				:host(.light-mode) .insider-detail-value {
					color: #0a0a0a;
				}
				.insider-detail-value.positive {
					color: #10b981;
				}
				.insider-detail-value.negative {
					color: #ef4444;
				}
				.no-data {
					color: #6b7280;
					text-align: center;
				}
				:host(.light-mode) .no-data {
					color: #4a5568;
					padding: 20px;
					font-style: italic;
				}
			</style>
			<h3>Insider Transactions</h3>
			<div class="sentiment-content" id="sentiment-container">
				<div class="loading">Loading sentiment data...</div>
			</div>
		`;

		if (this.symbol) {
			this.loadSentimentData();
		}
		
		// Apply saved theme
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.classList.add('light-mode');
		}
	}

	async loadSentimentData() {
		if (!this.symbol) return;
		const container = this.shadowRoot.getElementById('sentiment-container');
		if (!container) return;

		// Check aggregated overview cache first (most efficient)
		const overviewData = getCachedData(this.symbol, 'stock-overview');
		let cachedData = null;
		if (overviewData && overviewData.sentiment) {
			console.log('[Sentiment] Using data from aggregated overview cache');
			cachedData = overviewData.sentiment;
		} else {
			// Check individual cache as fallback
			cachedData = getCachedData(this.symbol, 'sentiment');
		}
		
		if (cachedData) {
			console.log('[Sentiment] Using cached data');
			this.renderSentimentData(cachedData);
			return;
		}

		try {
			// Check stock-overview cache first
			const overviewData = getCachedData(this.symbol, 'stock-overview');
			let data = null;
			
			if (overviewData && overviewData.sentiment) {
				console.log('[Sentiment] Using data from stock-overview cache');
				data = overviewData.sentiment;
			} else {
				// Fetch if not in cache
				console.log(`[Sentiment] Fetching sentiment data for ${this.symbol}...`);
				const response = await fetch(`${API_BASE_URL}/api/sentiment/${this.symbol}`);
				
				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.detail || `Backend returned ${response.status}`);
				}

				data = await response.json();
			}
			console.log('[Sentiment] Received data:', data);
			
			// Cache the sentiment data
			setCachedData(this.symbol, 'sentiment', data);
			
			this.renderSentimentData(data);
		} catch (error) {
			console.error('[Sentiment] Error loading sentiment data:', error);
			container.innerHTML = `<div class="error">Error loading sentiment data: ${error.message}</div>`;
		}
	}

	renderSentimentData(data) {
		const container = this.shadowRoot.getElementById('sentiment-container');
		if (!container) return;

		let html = '';

		// Insider Transactions Section (Social Sentiment removed - not available in free plan)
		if (data.insiderTransactions && Array.isArray(data.insiderTransactions) && data.insiderTransactions.length > 0) {
			html += `
				<div class="sentiment-section">
					<div class="section-title">Insider Transactions</div>
					<div class="insider-list">
			`;

			data.insiderTransactions.forEach(transaction => {
				const change = transaction.change || 0;
				const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : '';
				const changeSign = change > 0 ? '+' : '';
				const date = transaction.transactionDate || transaction.filingDate || 'N/A';
				const price = transaction.transactionPrice ? `${transaction.transactionPrice} ${transaction.currency || ''}` : 'N/A';
				const name = transaction.name || 'Unknown';

				html += `
					<div class="insider-item">
						<div class="insider-name">${name}</div>
						<div class="insider-details">
							<div class="insider-detail">
								<div class="insider-detail-label">Change</div>
								<div class="insider-detail-value ${changeClass}">${changeSign}${change}</div>
							</div>
							<div class="insider-detail">
								<div class="insider-detail-label">Price</div>
								<div class="insider-detail-value">${price}</div>
							</div>
							<div class="insider-detail">
								<div class="insider-detail-label">Date</div>
								<div class="insider-detail-value">${date}</div>
							</div>
						</div>
					</div>
				`;
			});

			html += `
					</div>
				</div>
			`;
		} else {
			html += `
				<div class="sentiment-section">
					<div class="section-title">Insider Transactions</div>
					<div class="no-data">No insider transaction data available</div>
				</div>
			`;
		}

		container.innerHTML = html;
	}
}

customElements.define('stock-sentiment', StockSentiment);


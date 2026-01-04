import { API_BASE_URL } from '../config.js';

export class StockChart extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.chart = null;
		this.symbol = null;
		this.timeframe = '1y';
		this.overlays = {
			ma50: false,
			ma100: false,
			ma200: false,
			neutralValue: false,
			sp500: false,
			trancheStrategy: false,
			peRatio: false
		};
		this.customTickers = new Set(); // Track custom tickers
		this.historicalData = null; // Store historical data for MA calculations
		this.neutralValueData = null; // Store neutral value regression data
		this.trancheLevels = null; // Store 3-tranche strategy levels
		this.peRatio = null; // Store current PE Ratio value
		this.peRatioHistory = null; // Store historical PE Ratio data
	}

	static get observedAttributes() {
		return ['symbol'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'symbol' && newValue !== oldValue) {
			this.symbol = newValue;
			if (this.shadowRoot && this.shadowRoot.innerHTML && this.symbol) {
				this.loadData();
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
				margin-bottom: 0;
				height: 100%;
				box-sizing: border-box;
				width: 100%;
			}
			:host(.light-mode) {
				background: #d5dce5;
				border-color: #a0aab8;
			}
				.header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 20px;
					flex-wrap: wrap;
					gap: 15px;
				}
				.title-container {
					display: flex;
					align-items: center;
					gap: 12px;
					flex-wrap: wrap;
				}
				.title {
					font-size: 1.5rem;
					font-weight: 700;
					color: #e6edf3;
				}
				:host(.light-mode) .title {
					color: #0a0a0a;
				}
				.price-info {
					display: flex;
					align-items: center;
					gap: 12px;
					font-size: 0.95rem;
				}
				.current-price {
					font-weight: 600;
					color: #e6edf3;
				}
				:host(.light-mode) .current-price {
					color: #0a0a0a;
				}
				.price-change {
					font-weight: 500;
				}
				.price-change.positive {
					color: #10b981;
				}
				.price-change.negative {
					color: #ef4444;
				}
				.price-change-percent {
					font-weight: 500;
				}
				.price-change-percent.positive {
					color: #10b981;
				}
				.price-change-percent.negative {
					color: #ef4444;
				}
				.watchlist-btn {
					display: flex;
					align-items: center;
					gap: 6px;
					background: transparent;
					border: 1px solid #2d3748;
					color: #9fb0c0;
					padding: 6px 12px;
					border-radius: 6px;
					cursor: pointer;
					font-size: 0.85rem;
					font-weight: 500;
					transition: all 0.2s ease;
					opacity: 0.8;
				}
				.watchlist-btn:hover {
					background: rgba(78, 161, 243, 0.08);
					border-color: #4ea1f3;
					color: #4ea1f3;
					opacity: 1;
				}
				:host(.light-mode) .watchlist-btn {
					border-color: #a0aab8;
					color: #4b5563;
				}
				:host(.light-mode) .watchlist-btn:hover {
					background: rgba(29, 78, 216, 0.08);
					border-color: var(--accent-blue);
					color: var(--accent-blue);
				}
				.watchlist-btn.added {
					background: rgba(16, 185, 129, 0.1);
					border-color: #10b981;
					color: #10b981;
					opacity: 1;
				}
				.watchlist-btn.added:hover {
					background: rgba(16, 185, 129, 0.15);
					border-color: #059669;
					color: #059669;
				}
				.watchlist-icon {
					font-size: 1rem;
					line-height: 1;
					display: flex;
					align-items: center;
					justify-content: center;
				}
				.watchlist-btn.added .watchlist-icon {
					font-size: 0.9rem;
				}
				.ai-summary-btn {
					display: flex;
					align-items: center;
					gap: 6px;
					background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
					border: 1px solid #6d28d9;
					color: #ffffff;
					padding: 6px 12px;
					border-radius: 6px;
					cursor: pointer;
					font-size: 0.85rem;
					font-weight: 500;
					transition: all 0.2s ease;
					opacity: 0.9;
				}
				.ai-summary-btn:hover {
					background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
					border-color: #5b21b6;
					opacity: 1;
					transform: translateY(-1px);
					box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3);
				}
				.ai-summary-btn:active {
					transform: translateY(0);
				}
				.ai-summary-btn:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
				:host(.light-mode) .ai-summary-btn {
					background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
					border-color: #5b21b6;
				}
				:host(.light-mode) .ai-summary-btn:hover {
					background: linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%);
				}
				.ai-icon {
					font-size: 1rem;
					line-height: 1;
					display: flex;
					align-items: center;
					justify-content: center;
				}
				.ai-summary-modal-overlay {
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
				.ai-summary-modal-overlay.show {
					display: flex;
				}
				.ai-summary-modal {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					width: 90%;
					max-width: 800px;
					max-height: 85vh;
					display: flex;
					flex-direction: column;
					box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
				}
				:host(.light-mode) .ai-summary-modal {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.ai-summary-modal-header {
					padding: 20px;
					border-bottom: 1px solid #1f2a37;
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-shrink: 0;
				}
				:host(.light-mode) .ai-summary-modal-header {
					border-bottom-color: #a0aab8;
				}
				.ai-summary-modal-title {
					font-size: 1.3rem;
					font-weight: 700;
					color: #e6edf3;
					display: flex;
					align-items: center;
					gap: 10px;
				}
				:host(.light-mode) .ai-summary-modal-title {
					color: #0a0a0a;
				}
				.ai-summary-modal-close {
					background: none;
					border: none;
					color: #9fb0c0;
					font-size: 1.5rem;
					cursor: pointer;
					padding: 0;
					width: 32px;
					height: 32px;
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: 6px;
					transition: all 0.2s;
				}
				.ai-summary-modal-close:hover {
					background: #1f2a37;
					color: #e6edf3;
				}
				:host(.light-mode) .ai-summary-modal-close {
					color: #1a1a1a;
				}
				:host(.light-mode) .ai-summary-modal-close:hover {
					background: #a0aab8;
					color: #0a0a0a;
				}
				.ai-summary-modal-content {
					padding: 20px;
					overflow-y: auto;
					flex: 1;
					color: #e6edf3;
					line-height: 1.7;
					font-size: 0.95rem;
				}
				:host(.light-mode) .ai-summary-modal-content {
					color: #0a0a0a;
				}
				.ai-summary-modal-content h1 {
					font-size: 1.8rem;
					font-weight: 700;
					color: #e6edf3;
					margin: 20px 0 15px 0;
					padding-bottom: 10px;
					border-bottom: 2px solid #1f2a37;
				}
				:host(.light-mode) .ai-summary-modal-content h1 {
					color: #0a0a0a;
					border-bottom-color: #a0aab8;
				}
				.ai-summary-modal-content h2 {
					font-size: 1.4rem;
					font-weight: 700;
					color: #4ea1f3;
					margin: 25px 0 12px 0;
					padding-top: 10px;
				}
				:host(.light-mode) .ai-summary-modal-content h2 {
					color: #1d4ed8;
				}
				.ai-summary-modal-content h3 {
					font-size: 1.1rem;
					font-weight: 600;
					color: #9fb0c0;
					margin: 18px 0 10px 0;
				}
				:host(.light-mode) .ai-summary-modal-content h3 {
					color: #1a1a1a;
				}
				.ai-summary-modal-content p {
					margin: 12px 0;
					line-height: 1.7;
				}
				.ai-summary-modal-content ul {
					margin: 12px 0;
					padding-left: 25px;
				}
				.ai-summary-modal-content li {
					margin: 8px 0;
					line-height: 1.6;
				}
				.ai-summary-modal-content strong {
					color: #4ea1f3;
					font-weight: 600;
				}
				:host(.light-mode) .ai-summary-modal-content strong {
					color: #1d4ed8;
				}
				.ai-summary-modal-content::-webkit-scrollbar {
					width: 8px;
				}
				.ai-summary-modal-content::-webkit-scrollbar-track {
					background: #0b0f14;
					border-radius: 4px;
				}
				.ai-summary-modal-content::-webkit-scrollbar-thumb {
					background: #1f2a37;
					border-radius: 4px;
				}
				.ai-summary-modal-content::-webkit-scrollbar-thumb:hover {
					background: #2d3748;
				}
				:host(.light-mode) .ai-summary-modal-content::-webkit-scrollbar-track {
					background: #c0c9d4;
				}
				:host(.light-mode) .ai-summary-modal-content::-webkit-scrollbar-thumb {
					background: #a0aab8;
				}
				:host(.light-mode) .ai-summary-modal-content::-webkit-scrollbar-thumb:hover {
					background: #8b95a3;
				}
				.ai-summary-loading {
					text-align: center;
					padding: 40px;
					color: #9fb0c0;
				}
				:host(.light-mode) .ai-summary-loading {
					color: #1a1a1a;
				}
				.ai-summary-cache-info {
					background: rgba(78, 161, 243, 0.1);
					border: 1px solid rgba(78, 161, 243, 0.3);
					border-radius: 8px;
					padding: 12px 16px;
					margin-bottom: 20px;
					font-size: 0.85rem;
					color: #4ea1f3;
					text-align: center;
				}
				:host(.light-mode) .ai-summary-cache-info {
					background: rgba(29, 78, 216, 0.1);
					border-color: rgba(29, 78, 216, 0.3);
					color: #1d4ed8;
				}
				.ai-summary-error {
					text-align: center;
					padding: 40px;
					color: #ef4444;
				}
				:host(.light-mode) .ai-summary-error {
					color: #dc2626;
				}
				.ai-summary-disclaimer {
					padding: 15px;
					margin-top: 20px;
					border-top: 1px solid #1f2a37;
					font-size: 0.75rem;
					color: #6b7280;
					line-height: 1.5;
					flex-shrink: 0;
				}
				:host(.light-mode) .ai-summary-disclaimer {
					border-top-color: #a0aab8;
					color: #4b5563;
				}
				.controls {
					display: flex;
					gap: 10px;
					flex-wrap: wrap;
				}
				.timeframe-select {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					color: #e6edf3;
					padding: 8px 12px;
					border-radius: 8px;
					font-size: 0.9rem;
					cursor: pointer;
				}
				:host(.light-mode) .timeframe-select {
					background: #c0c9d4;
					border-color: #a0aab8;
					color: #0a0a0a;
				}
				.overlays-section {
					display: flex;
					gap: 15px;
					flex-wrap: wrap;
					margin-top: 15px;
					padding-top: 15px;
					border-top: 1px solid #1f2a37;
				}
				.overlay-label {
					display: flex;
					align-items: center;
					gap: 8px;
					color: #9fb0c0;
					font-size: 0.9rem;
				}
				:host(.light-mode) .overlay-label {
					color: #1a1a1a;
				}
			.overlay-label input[type="checkbox"] {
				width: 18px;
				height: 18px;
				cursor: pointer;
			}
			.info-icon {
				cursor: pointer;
				font-size: 0.75rem;
				margin-left: 6px;
				opacity: 0.6;
				transition: all 0.2s ease;
				user-select: none;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				width: 16px;
				height: 16px;
				border-radius: 50%;
				background: rgba(78, 161, 243, 0.15);
				color: #4ea1f3;
				font-weight: 600;
				line-height: 1;
				border: 1px solid rgba(78, 161, 243, 0.3);
			}
			.info-icon:hover {
				opacity: 1;
				background: rgba(78, 161, 243, 0.25);
				border-color: rgba(78, 161, 243, 0.5);
				transform: scale(1.1);
			}
			:host(.light-mode) .info-icon {
				background: rgba(78, 161, 243, 0.2);
				border-color: rgba(78, 161, 243, 0.4);
				color: #3b82f6;
			}
			:host(.light-mode) .info-icon:hover {
				background: rgba(78, 161, 243, 0.3);
				border-color: rgba(78, 161, 243, 0.6);
			}
			.info-modal {
				display: none;
				position: fixed;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				background: #121821;
				border: 1px solid #1f2a37;
				border-radius: 12px;
				padding: 0;
				max-width: 500px;
				width: 90%;
				max-height: 80vh;
				z-index: 10000;
				box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
				flex-direction: column;
			}
			:host(.light-mode) .info-modal {
				background: #d5dce5;
				border-color: #a0aab8;
			}
			.info-modal.show {
				display: flex;
			}
			.info-modal-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 20px;
				padding-bottom: 15px;
				border-bottom: 1px solid #1f2a37;
				flex-shrink: 0;
			}
			:host(.light-mode) .info-modal-header {
				border-bottom-color: var(--border-color);
			}
			.info-modal-title {
				font-size: 1.2rem;
				font-weight: 700;
				color: #e6edf3;
			}
			:host(.light-mode) .info-modal-title {
				color: #0a0a0a;
			}
			.info-modal-close {
				background: none;
				border: none;
				color: #9fb0c0;
				font-size: 1.5rem;
				cursor: pointer;
				padding: 0;
				width: 30px;
				height: 30px;
				display: flex;
				align-items: center;
				justify-content: center;
			}
			.info-modal-close:hover {
				color: #e6edf3;
			}
			:host(.light-mode) .info-modal-close {
				color: #1a1a1a;
			}
			:host(.light-mode) .info-modal-close:hover {
				color: #0a0a0a;
			}
			.info-modal-content {
				color: #9fb0c0;
				line-height: 1.6;
				font-size: 0.9rem;
				padding: 20px;
				overflow-y: auto;
				flex: 1;
			}
			.info-modal-content::-webkit-scrollbar {
				width: 8px;
			}
			.info-modal-content::-webkit-scrollbar-track {
				background: #0b0f14;
				border-radius: 4px;
			}
			.info-modal-content::-webkit-scrollbar-thumb {
				background: #1f2a37;
				border-radius: 4px;
			}
			.info-modal-content::-webkit-scrollbar-thumb:hover {
				background: #2d3748;
			}
			:host(.light-mode) .info-modal-content::-webkit-scrollbar-track {
				background: var(--bg-primary);
			}
			:host(.light-mode) .info-modal-content::-webkit-scrollbar-thumb {
				background: var(--border-color);
			}
			:host(.light-mode) .info-modal-content::-webkit-scrollbar-thumb:hover {
				background: var(--bg-tertiary);
			}
			:host(.light-mode) .info-modal-content {
				color: #1a1a1a;
			}
			.info-modal-overlay {
				display: none;
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background: rgba(0, 0, 0, 0.5);
				z-index: 9999;
			}
			.info-modal-overlay.show {
				display: block;
			}
				.custom-ticker-input {
					display: flex;
					gap: 8px;
					align-items: center;
				}
			.custom-ticker-input input {
				background: #0b0f14;
				border: 1px solid #1f2a37;
				color: #e6edf3;
				padding: 6px 10px;
				border-radius: 6px;
				font-size: 0.9rem;
				width: 140px;
			}
			:host(.light-mode) .custom-ticker-input input {
				background: #c0c9d4;
				border-color: #a0aab8;
				color: #0a0a0a;
			}
			:host(.light-mode) .custom-ticker-input input::placeholder {
				color: #5a6978;
			}
			.custom-ticker-input input:focus {
				outline: none;
				border-color: #4ea1f3;
			}
			.custom-ticker-input button {
				background: #4ea1f3;
				color: #0b0f14;
				border: none;
				padding: 6px 12px;
				border-radius: 6px;
				font-size: 0.9rem;
				font-weight: 600;
				cursor: pointer;
				transition: background 0.2s;
			}
				.custom-ticker-input button:hover {
					background: #3b82f6;
				}
				.custom-ticker-input button:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
				.neutral-value-warning {
					color: #ef4444;
					font-size: 0.85rem;
					margin-left: 10px;
					padding: 4px 8px;
					background: rgba(239, 68, 68, 0.1);
					border-radius: 4px;
					border-left: 3px solid #ef4444;
					white-space: nowrap;
				}
				.chart-container {
					position: relative;
					width: 100%;
					height: 400px;
					margin-top: 20px;
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
					box-sizing: border-box;
				}
				:host(.light-mode) .chart-container {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				#chart {
					width: 100% !important;
					max-width: 100%;
				}
			.status {
				color: #9fb0c0;
				text-align: center;
				padding: 20px;
			}
			:host(.light-mode) .status {
				color: #1a1a1a;
			}
		</style>
			<div class="header">
				<div class="title-container">
					<div class="title" id="title">${this.symbol || 'Stock Chart'}</div>
					<div class="price-info" id="price-info" style="display: none;">
						<span class="current-price" id="current-price">-</span>
						<span class="price-change" id="price-change">-</span>
						<span class="price-change-percent" id="price-change-percent">-</span>
					</div>
					<button class="watchlist-btn" id="watchlist-btn" style="display: none;">
						<span class="watchlist-icon" id="watchlist-icon">+</span>
						<span id="watchlist-text">Add to watchlist</span>
					</button>
					<button class="ai-summary-btn" id="ai-summary-btn" style="display: none;">
						<span class="ai-icon">🤖</span>
						<span>AI Summary</span>
					</button>
				</div>
				<div class="controls">
					<select class="timeframe-select" id="timeframe">
						<option value="1d">1 Day</option>
						<option value="5d">5 Days</option>
						<option value="1w">1 Week</option>
						<option value="1mo">1 Month</option>
						<option value="3mo">3 Months</option>
						<option value="6mo">6 Months</option>
						<option value="ytd">YTD</option>
						<option value="1y" selected>1 Year</option>
						<option value="2y">2 Years</option>
						<option value="5y">5 Years</option>
						<option value="10y">10 Years</option>
						<option value="max">Max</option>
					</select>
				</div>
			</div>
			<div class="overlays-section">
				<label class="overlay-label">
					<input type="checkbox" id="ma50" />
					<span>50 MA</span>
				</label>
				<label class="overlay-label">
					<input type="checkbox" id="ma100" />
					<span>100 MA</span>
				</label>
				<label class="overlay-label">
					<input type="checkbox" id="ma200" />
					<span>200 MA</span>
				</label>
				<label class="overlay-label">
					<input type="checkbox" id="neutralValue" />
					<span title="Note: Neutral Value is most meaningful for major indices, not individual stocks.">Neutral Value (Index)</span>
				</label>
				<label class="overlay-label">
					<input type="checkbox" id="sp500" />
					<span>S&P 500</span>
				</label>
				<label class="overlay-label">
					<input type="checkbox" id="trancheStrategy" />
					<span>3-Tranche Strategy</span>
					<span class="info-icon" id="tranche-info-icon" title="Click for information">i</span>
				</label>
				<label class="overlay-label">
					<input type="checkbox" id="peRatio" />
					<span>Fair Value (Stock)</span>
					<span class="info-icon" id="fairvalue-info-icon" title="Click for information">i</span>
				</label>
				<div class="custom-ticker-input">
					<input type="text" id="custom-ticker" placeholder="Add ticker (e.g., MSFT)" maxlength="10" />
					<button id="add-ticker-btn">Add</button>
					<div id="neutral-value-warning" class="neutral-value-warning" style="display: none;">
						Note: Neutral Value is most meaningful for major indices, not individual stocks.
					</div>
				</div>
			</div>
			<div class="ai-summary-modal-overlay" id="ai-summary-modal-overlay">
				<div class="ai-summary-modal">
					<div class="ai-summary-modal-header">
						<div class="ai-summary-modal-title">
							<span class="ai-icon">🤖</span>
							<span>AI Summary</span>
						</div>
						<button class="ai-summary-modal-close" id="ai-summary-modal-close">×</button>
					</div>
					<div class="ai-summary-modal-content" id="ai-summary-modal-content">
						<div class="ai-summary-loading">Loading AI summary...</div>
					</div>
					<div class="ai-summary-disclaimer">
						<strong>Disclaimer:</strong> This AI-generated summary is for informational purposes only and does not constitute investment advice, financial advice, trading advice, or any other form of recommendation. The information is generated by an AI model and may contain inaccuracies. Always conduct your own research and consult with a licensed financial advisor before making investment decisions. Past performance is not indicative of future results.
					</div>
				</div>
			</div>
			<div class="chart-container">
				<canvas id="chart"></canvas>
			</div>
			<div class="status" id="status"></div>
			<div class="info-modal-overlay" id="info-modal-overlay"></div>
			<div class="info-modal" id="tranche-info-modal">
				<div class="info-modal-header">
					<div class="info-modal-title">3-Tranche Strategy</div>
					<button class="info-modal-close" id="tranche-info-close">×</button>
				</div>
				<div class="info-modal-content">
					<p><strong>What is the 3-Tranche Strategy?</strong></p>
					<p>The 3-Tranche Strategy identifies three intelligent investment entry points. <strong>The strategy automatically adapts to your selected timeframe</strong> with different calculation methods:</p>
					<ul style="margin: 10px 0; padding-left: 20px;">
						<li><strong>Very Short Timeframes (1d, 5d, 1w):</strong> Uses ATR-based support levels from current price - ideal for short-term trading and pullback entries.</li>
						<li><strong>Medium to Long Timeframes (1mo+):</strong> Uses volatility-adjusted Fibonacci Retracements from high to low - ideal for swing trading and position building.</li>
					</ul>
					<ul style="margin: 10px 0; padding-left: 20px;">
						<li><strong>Tranche 1 (Aggressive) - 20% allocation:</strong> 38.2% Fibonacci Retracement adjusted by ATR - closest to current price</li>
						<li><strong>Tranche 2 (Moderate) - 30% allocation:</strong> 50% Fibonacci Retracement adjusted by ATR - middle level</li>
						<li><strong>Tranche 3 (Conservative) - 50% allocation:</strong> 61.8% Fibonacci Retracement (Golden Ratio) adjusted by ATR - strongest support</li>
					</ul>
					<p><strong>Key Features:</strong></p>
					<ul style="margin: 10px 0; padding-left: 20px;">
						<li><strong>Timeframe-Adaptive:</strong> The strategy calculates Fibonacci retracements from the high to low of your selected timeframe. Change the timeframe, and the tranche levels automatically adjust.</li>
						<li><strong>ATR-Based Volatility Adjustment:</strong> Levels are adjusted using ATR (Average True Range) to account for current market volatility. ATR measures the average price movement over a period, making the tranche levels more accurate than fixed Fibonacci levels. For shorter timeframes, the ATR adjustment is reduced to keep all tranches visible and relevant.</li>
						<li><strong>Optimal Weighting:</strong> More capital (50%) allocated to Tranche 3 where expected return is higher, less (20%) to Tranche 1 with lower risk/reward.</li>
					</ul>
					<p><strong>What is ATR (Average True Range)?</strong></p>
					<p>ATR is a volatility indicator that measures the average price movement of an asset over a specified period (typically 14 periods). It considers the true range, which accounts for gaps between periods. Higher ATR values indicate higher volatility, while lower values indicate lower volatility. The strategy uses ATR to adjust Fibonacci levels, making them more responsive to current market conditions.</p>
					<p><strong>How it works:</strong></p>
					<p>The strategy calculates Fibonacci retracements (38.2%, 50%, 61.8%) from the high to low of your selected timeframe. These base levels are then adjusted using ATR-based volatility. For very short timeframes (1d, 5d, 1w), the ATR adjustment is smaller (0.2×) to keep tranches closer together. For medium timeframes (1mo, 3mo), it's moderate (0.5×), and for longer timeframes, it uses the full ATR adjustment (1.0×).</p>
					<p><strong>Usage:</strong></p>
					<p>When first enabled, the chart automatically switches to a 5-year view. After that, <strong>the strategy adapts to any timeframe you select</strong> - from 1 day to maximum. Consider investing according to the weightings (20/30/50) as the price approaches each tranche level. Wait for confirmation signals (reversal candles, RSI turning up, volume spikes) before entering.</p>
				</div>
			</div>
			<div class="info-modal" id="fairvalue-info-modal">
				<div class="info-modal-header">
					<div class="info-modal-title">Fair Value Calculation</div>
					<button class="info-modal-close" id="fairvalue-info-close">×</button>
				</div>
				<div class="info-modal-content">
					<p><strong>What is Fair Value?</strong></p>
					<p>Fair Value represents the estimated intrinsic value of a stock based on its earnings and historical valuation patterns. The calculation uses a sophisticated method to smooth out earnings volatility and determine a neutral price-to-earnings ratio.</p>
					<p><strong>Calculation Method:</strong></p>
					<ol style="margin: 10px 0; padding-left: 20px;">
						<li><strong>EPS Smoothing (4-Quarter Rolling Average):</strong>
							<ul style="margin: 5px 0; padding-left: 20px;">
								<li>Earnings per share (EPS) data is smoothed using a rolling 4-quarter average</li>
								<li>This removes earnings jumps and provides a more stable earnings trend</li>
								<li>The smoothed EPS is then interpolated to daily frequency for continuous calculation</li>
							</ul>
						</li>
						<li><strong>Neutral P/E Ratio (Median of Last 8-10 Years):</strong>
							<ul style="margin: 5px 0; padding-left: 20px;">
								<li>Historical P/E ratios are calculated from the last 8-10 years (Price / EPS)</li>
								<li>Only positive EPS values are used</li>
								<li>The median (not average) is used to represent the typical market valuation</li>
								<li>This neutral P/E represents the stock's typical valuation pattern</li>
							</ul>
						</li>
						<li><strong>Fair Value Calculation:</strong>
							<ul style="margin: 5px 0; padding-left: 20px;">
								<li><strong>Fair Value = Smoothed EPS × Neutral P/E</strong></li>
								<li>This provides a continuous fair value line that moves smoothly over time</li>
								<li>The line represents what the price "should be" based on earnings and historical valuation</li>
							</ul>
						</li>
					</ol>
					<p><strong>Key Features:</strong></p>
					<ul style="margin: 10px 0; padding-left: 20px;">
						<li><strong>Continuous Line:</strong> Unlike step functions that jump at earnings releases, the fair value line is continuous and smooth</li>
						<li><strong>Earnings-Based:</strong> Uses actual earnings data, not forward estimates</li>
						<li><strong>Historical Context:</strong> Neutral P/E is based on 8-10 years of historical data, providing long-term context</li>
						<li><strong>Median-Based:</strong> Uses median instead of average to avoid outliers affecting the calculation</li>
					</ul>
					<p><strong>How to Use:</strong></p>
					<p>Compare the current stock price to the Fair Value line:</p>
					<ul style="margin: 10px 0; padding-left: 20px;">
						<li><strong>Price above Fair Value:</strong> The stock may be overvalued relative to its earnings and historical valuation</li>
						<li><strong>Price below Fair Value:</strong> The stock may be undervalued and could represent a buying opportunity</li>
						<li><strong>Price near Fair Value:</strong> The stock is trading at a fair valuation based on historical patterns</li>
					</ul>
					<p><strong>Note:</strong> Fair Value is a tool for analysis, not a guarantee of future performance. Market conditions, company fundamentals, and other factors can cause prices to deviate from fair value for extended periods.</p>
				</div>
			</div>
		`;

		// Event listeners
		this.shadowRoot.getElementById('timeframe')?.addEventListener('change', async (e) => {
			this.timeframe = e.target.value;
			await this.loadData();

			// If tranche strategy is enabled, recalculate it with new timeframe
			const trancheStrategyChecked = this.shadowRoot.getElementById('trancheStrategy')?.checked || false;
			if (trancheStrategyChecked) {
				await this.calculateTrancheStrategy();
			}

			// Dispatch event to notify other components about timeframe change
			this.dispatchEvent(new CustomEvent('timeframe-changed', {
				detail: { timeframe: this.timeframe, symbol: this.symbol },
				bubbles: true,
				composed: true
			}));
		});

		['ma50', 'ma100', 'ma200', 'neutralValue', 'sp500', 'trancheStrategy', 'peRatio'].forEach(id => {
			this.shadowRoot.getElementById(id)?.addEventListener('change', async (e) => {
				this.overlays[id] = e.target.checked;
				// Reload data if MA is enabled to get historical data
				if (['ma50', 'ma100', 'ma200'].includes(id)) {
					// Determine max period needed based on all checked MAs
					const ma50Checked = this.shadowRoot.getElementById('ma50')?.checked || false;
					const ma100Checked = this.shadowRoot.getElementById('ma100')?.checked || false;
					const ma200Checked = this.shadowRoot.getElementById('ma200')?.checked || false;
					const maxMAPeriod = ma200Checked ? 200 : (ma100Checked ? 100 : (ma50Checked ? 50 : 0));

					if (maxMAPeriod > 0) {
						await this.loadHistoricalDataForMA(maxMAPeriod);
					} else {
						this.historicalData = null;
					}
				}
				// Load neutral value data if enabled
				if (id === 'neutralValue' && e.target.checked) {
					await this.loadNeutralValueData();
					this.updateNeutralValueWarning(true);
				} else if (id === 'neutralValue' && !e.target.checked) {
					this.neutralValueData = null;
					this.updateNeutralValueWarning(false);
				}
				// Load 3-tranche strategy if enabled
				if (id === 'trancheStrategy' && e.target.checked) {
					// Check if this is the first time activating (trancheLevels is null)
					const isFirstActivation = this.trancheLevels === null;

					// On first activation, switch to 5y timeframe
					if (isFirstActivation && this.timeframe !== '5y') {
						this.timeframe = '5y';
						const timeframeSelect = this.shadowRoot.getElementById('timeframe');
						if (timeframeSelect) {
							timeframeSelect.value = '5y';
						}
						await this.loadData();
					} else {
						// Calculate tranches with current timeframe
						await this.calculateTrancheStrategy();
						// Note: updateChart() is called inside calculateTrancheStrategy() now
					}
				} else if (id === 'trancheStrategy' && !e.target.checked) {
					this.trancheLevels = null;
					this.updateChart();
				} else if (id === 'peRatio' && e.target.checked) {
					await this.loadPERatio();
					this.updateChart();
				} else if (id === 'peRatio' && !e.target.checked) {
					this.peRatio = null;
					this.updateChart();
				} else {
					this.updateChart();
				}
			});
		});

		// Custom ticker input
		const customTickerInput = this.shadowRoot.getElementById('custom-ticker');
		const addTickerBtn = this.shadowRoot.getElementById('add-ticker-btn');

		addTickerBtn?.addEventListener('click', () => {
			this.addCustomTicker();
		});

		customTickerInput?.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				this.addCustomTicker();
			}
		});

		// 3-Tranche Strategy Info icon click handler
		const trancheInfoIcon = this.shadowRoot.getElementById('tranche-info-icon');
		const trancheInfoModal = this.shadowRoot.getElementById('tranche-info-modal');
		const infoOverlay = this.shadowRoot.getElementById('info-modal-overlay');
		const trancheInfoClose = this.shadowRoot.getElementById('tranche-info-close');

		trancheInfoIcon?.addEventListener('click', (e) => {
			e.stopPropagation();
			trancheInfoModal?.classList.add('show');
			infoOverlay?.classList.add('show');
		});

		trancheInfoClose?.addEventListener('click', () => {
			trancheInfoModal?.classList.remove('show');
			infoOverlay?.classList.remove('show');
		});

		// Fair Value Info icon click handler
		const fairvalueInfoIcon = this.shadowRoot.getElementById('fairvalue-info-icon');
		const fairvalueInfoModal = this.shadowRoot.getElementById('fairvalue-info-modal');
		const fairvalueInfoClose = this.shadowRoot.getElementById('fairvalue-info-close');

		fairvalueInfoIcon?.addEventListener('click', (e) => {
			e.stopPropagation();
			fairvalueInfoModal?.classList.add('show');
			infoOverlay?.classList.add('show');
		});

		fairvalueInfoClose?.addEventListener('click', () => {
			fairvalueInfoModal?.classList.remove('show');
			infoOverlay?.classList.remove('show');
		});

		// Close modals when clicking overlay
		infoOverlay?.addEventListener('click', () => {
			trancheInfoModal?.classList.remove('show');
			fairvalueInfoModal?.classList.remove('show');
			infoOverlay?.classList.remove('show');
		});

		// Apply saved theme
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.classList.add('light-mode');
		}

		// Listen for theme changes
		this.themeChangeHandler = () => {
			this.updateChartTheme();
		};
		window.addEventListener('storage', this.themeChangeHandler);
		// Also listen for custom themechange event (for same-window changes)
		window.addEventListener('themechange', this.themeChangeHandler);

		// Use MutationObserver to watch for class changes
		this.observer = new MutationObserver(() => {
			this.updateChartTheme();
		});
		this.observer.observe(this, { attributes: true, attributeFilter: ['class'] });

		// Setup watchlist button after DOM is ready
		setTimeout(() => {
			this.setupWatchlistButton();
			this.checkWatchlistStatus();
			this.setupAISummaryButton();
		}, 0);

		if (this.symbol) {
			this.loadData();
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
	}

	updateChartTheme() {
		if (!this.chart) return;

		const isLightMode = localStorage.getItem('theme') === 'light' || this.classList.contains('light-mode');

		// Update chart colors
		this.chart.options.backgroundColor = isLightMode ? '#c0c9d4' : '#0b0f14';
		this.chart.options.scales.x.ticks.color = isLightMode ? '#0a0a0a' : '#9fb0c0';
		this.chart.options.scales.x.grid.color = isLightMode ? '#a0aab8' : 'rgba(255,255,255,0.06)';
		this.chart.options.scales.y.ticks.color = isLightMode ? '#0a0a0a' : '#9fb0c0';
		this.chart.options.scales.y.grid.color = isLightMode ? '#a0aab8' : 'rgba(255,255,255,0.06)';
		this.chart.options.plugins.legend.labels.color = isLightMode ? '#0a0a0a' : '#e6edf3';

		// Update chart container background
		const chartContainer = this.shadowRoot.querySelector('.chart-container');
		if (chartContainer) {
			chartContainer.style.background = isLightMode ? '#c0c9d4' : '#0b0f14';
			chartContainer.style.borderColor = isLightMode ? '#a0aab8' : '#1f2a37';
		}

		this.chart.update();
	}

	async loadData() {
		if (!this.symbol) return;

		this.setStatus('Loading...');

		try {
			const data = await this.fetchYahooFinanceData(this.symbol, this.timeframe);
			this.chartData = data;

			// Always load historical data for Moving Averages if any MA is enabled
			// Check overlays from checkboxes
			const ma50Checked = this.shadowRoot.getElementById('ma50')?.checked || false;
			const ma100Checked = this.shadowRoot.getElementById('ma100')?.checked || false;
			const ma200Checked = this.shadowRoot.getElementById('ma200')?.checked || false;
			const neutralValueChecked = this.shadowRoot.getElementById('neutralValue')?.checked || false;

			// Determine max period needed (always load for 200 if any MA is checked, to have data ready)
			const maxMAPeriod = ma200Checked ? 200 : (ma100Checked ? 100 : (ma50Checked ? 50 : 0));
			if (maxMAPeriod > 0) {
				await this.loadHistoricalDataForMA(maxMAPeriod);
			} else {
				this.historicalData = null;
			}

			// Load neutral value data if enabled
			if (neutralValueChecked) {
				await this.loadNeutralValueData();
				this.updateNeutralValueWarning(true);
			} else {
				this.neutralValueData = null;
				this.updateNeutralValueWarning(false);
			}

			// Load 3-tranche strategy if enabled
			const trancheStrategyChecked = this.shadowRoot.getElementById('trancheStrategy')?.checked || false;
			let trancheStrategyUpdatedChart = false;
			if (trancheStrategyChecked) {
				try {
					// Calculate tranches immediately
					await this.calculateTrancheStrategy();
					// Note: updateChart() is called inside calculateTrancheStrategy() if successful
					trancheStrategyUpdatedChart = true;
				} catch (error) {
					console.error('[3-Tranche] Error in loadData:', error);
					this.trancheLevels = null;
				}
			} else {
				this.trancheLevels = null;
			}

			// Clear status before updating chart
			if (!trancheStrategyChecked) {
				this.setStatus('');
			}

			// Only update chart if tranche strategy didn't already update it
			if (!trancheStrategyUpdatedChart) {
				this.updateChart();
			}

			// Dispatch event to notify other components about timeframe (after data is loaded)
			this.dispatchEvent(new CustomEvent('timeframe-changed', {
				detail: { timeframe: this.timeframe, symbol: this.symbol },
				bubbles: true,
				composed: true
			}));

			// Update watchlist button status after data is loaded
			this.checkWatchlistStatus();

			// Setup and show AI Summary button
			this.setupAISummaryButton();

			// Calculate and display price information based on selected timeframe
			this.updatePriceInfoFromChartData();
		} catch (error) {
			console.error('Error loading data:', error);
			this.setStatus('Error loading data. Please try again.');
		}
	}

	updatePriceInfoFromChartData() {
		if (!this.chartData || this.chartData.length === 0) {
			// Try to get current price from quote API as fallback
			this.loadCurrentPriceOnly();
			return;
		}

		// Get first and last prices from chart data
		const firstPrice = this.chartData[0]?.close;
		const lastPrice = this.chartData[this.chartData.length - 1]?.close;

		if (firstPrice === null || firstPrice === undefined ||
			lastPrice === null || lastPrice === undefined) {
			// Fallback to quote API
			this.loadCurrentPriceOnly();
			return;
		}

		// Calculate change for the selected timeframe
		const change = lastPrice - firstPrice;
		const changePercent = firstPrice !== 0 ? ((change / firstPrice) * 100) : 0;

		// Display with last price as current price
		this.updatePriceDisplay(lastPrice, change, changePercent);
	}

	async loadCurrentPriceOnly() {
		if (!this.symbol) return;

		try {
			const quoteUrl = `http://localhost:3000/api/yahoo/quote?symbol=${this.symbol}`;

			let data;
			try {
				const response = await fetch(quoteUrl);
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				data = await response.json();
			} catch (error) {
				console.error('[StockChart] Error fetching quote:', error);
				return;
			}

			// Extract current price only
			let price;

			if (data?.quoteResponse?.result?.[0]) {
				price = data.quoteResponse.result[0].regularMarketPrice;
			} else if (data?.finance?.result?.[0]) {
				price = data.finance.result[0].regularMarketPrice;
			} else if (data?.chart?.result?.[0]?.meta) {
				price = data.chart.result[0].meta.regularMarketPrice;
			} else if (data?.result?.[0]) {
				price = data.result[0].regularMarketPrice;
			}

			if (price !== undefined && price !== null) {
				// If we only have current price, show it without change info
				this.updatePriceDisplay(price, null, null);
			}
		} catch (error) {
			console.error('[StockChart] Error loading current price:', error);
		}
	}

	updatePriceDisplay(price, change, changePercent) {
		const priceInfo = this.shadowRoot.getElementById('price-info');
		const currentPriceEl = this.shadowRoot.getElementById('current-price');
		const priceChangeEl = this.shadowRoot.getElementById('price-change');
		const priceChangePercentEl = this.shadowRoot.getElementById('price-change-percent');

		if (!priceInfo || !currentPriceEl || !priceChangeEl || !priceChangePercentEl) return;

		// Format price
		const formattedPrice = new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(price);

		// Update current price
		currentPriceEl.textContent = formattedPrice;

		// Format and display change if available
		if (change !== null && change !== undefined && !isNaN(change)) {
			const changeValue = change;
			const changeSign = changeValue >= 0 ? '+' : '';
			const formattedChange = `${changeSign}${changeValue.toFixed(2)}`;
			priceChangeEl.textContent = formattedChange;

			// Apply color class
			const isPositive = changeValue >= 0;
			priceChangeEl.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
			priceChangeEl.style.display = '';
		} else {
			priceChangeEl.textContent = '-';
			priceChangeEl.style.display = 'none';
		}

		// Format and display change percent if available
		if (changePercent !== null && changePercent !== undefined && !isNaN(changePercent)) {
			const changePercentValue = changePercent;
			const changePercentSign = changePercentValue >= 0 ? '+' : '';
			const formattedChangePercent = `${changePercentSign}${changePercentValue.toFixed(2)}%`;
			priceChangePercentEl.textContent = formattedChangePercent;

			// Apply color class
			const isPositive = changePercentValue >= 0;
			priceChangePercentEl.className = `price-change-percent ${isPositive ? 'positive' : 'negative'}`;
			priceChangePercentEl.style.display = '';
		} else {
			priceChangePercentEl.textContent = '-';
			priceChangePercentEl.style.display = 'none';
		}

		// Show price info
		priceInfo.style.display = 'flex';
	}

	async fetchYahooFinanceData(symbol, range, useHourlyOverride = null) {
		// Use minute data for 1d, 5d, and 1w, daily for longer timeframes
		let interval = '1d';
		if (useHourlyOverride !== null) {
			interval = useHourlyOverride ? '1h' : '1d';
		} else if (range === '1d') {
			interval = '1m'; // 1-minute data for 1 day
		} else if (range === '5d') {
			interval = '5m'; // 5-minute data for 5 days
		} else if (range === '1w') {
			interval = '15m'; // 15-minute data for 1 week
		} else if (range === 'ytd') {
			interval = '1d'; // Daily data for year-to-date
		}

		const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;

		// Always use CORS proxy (direct fetch will be blocked by CORS)
		const { fetchWithProxy } = await import('../utils/proxy.js');
		let data;
		try {
			data = await fetchWithProxy(yahooUrl);
		} catch (error) {
			console.error('Error fetching chart data:', error);
			throw new Error('Failed to fetch data. Your browser may be blocking external requests. Try disabling Tracking Prevention in Edge settings.');
		}

		if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
			throw new Error('No data in response');
		}

		const result = data.chart.result[0];
		const timestamps = result.timestamp || [];
		const quotes = result.indicators?.quote?.[0] || {};
		const closes = quotes.close || [];
		const highs = quotes.high || [];
		const lows = quotes.low || [];
		const opens = quotes.open || [];
		const volumes = quotes.volume || [];

		const series = [];
		for (let i = 0; i < timestamps.length; i++) {
			if (closes[i] !== null && closes[i] !== undefined) {
				const date = new Date(timestamps[i] * 1000);
				// Format date based on interval
				let dateStr;
				if (interval === '1m' || interval === '5m' || interval === '15m') {
					// Minute data: show date and time
					dateStr = date.toISOString().slice(0, 16).replace('T', ' ');
				} else if (interval === '1h') {
					// Hourly data: show date and hour
					dateStr = date.toISOString().slice(0, 16).replace('T', ' ');
				} else {
					// Daily data: show only date
					dateStr = date.toISOString().split('T')[0];
				}

				series.push({
					date: dateStr,
					close: closes[i],
					high: highs[i] || closes[i],
					low: lows[i] || closes[i],
					open: opens[i] || closes[i],
					volume: volumes[i] || 0
				});
			}
		}

		return series;
	}

	async loadHistoricalDataForMA(maxPeriod) {
		// Determine how much historical data we need
		// For minute/hourly data (1d, 5d, 1w), we need more data points
		// For daily data, we need more days
		const useIntraday = ['1d', '5d', '1w'].includes(this.timeframe);

		// Calculate how much extra data we need before the current timeframe
		// We need at least maxPeriod data points BEFORE the current data starts
		// Strategy: Fetch a range that is large enough to include:
		// - The current timeframe's data
		// - Plus enough historical data before it to calculate the MA
		let historicalRange;
		if (useIntraday) {
			// For minute/hourly: need maxPeriod data points, but Yahoo Finance has limits
			// Use a longer range to get enough data
			if (this.timeframe === '1d') {
				// For 1d with 1m interval, use 5d range to get enough minutes
				historicalRange = maxPeriod <= 200 ? '5d' : '1mo';
			} else if (this.timeframe === '5d') {
				// For 5d with 5m interval, use 1mo range to get enough minutes
				historicalRange = maxPeriod <= 200 ? '1mo' : '3mo';
			} else if (this.timeframe === '1w') {
				// For 1w with 15m interval, use 1mo range to get enough minutes
				historicalRange = maxPeriod <= 200 ? '1mo' : '3mo';
			}
		} else {
			// For daily: need maxPeriod trading days BEFORE current data
			// We need to fetch a range that includes current timeframe + historical data
			// Trading days: ~252 per year, ~21 per month, ~63 per quarter

			// Map current timeframe to approximate trading days
			const timeframeDays = {
				'1mo': 21,
				'3mo': 63,
				'6mo': 126,
				'1y': 252,
				'2y': 504,
				'5y': 1260,
				'10y': 2520,
				'max': 10000 // Very large number
			};

			const currentDays = timeframeDays[this.timeframe] || 252;
			const totalDaysNeeded = currentDays + maxPeriod;

			// Determine the range that gives us enough data
			if (totalDaysNeeded <= 63) {
				historicalRange = '3mo';
			} else if (totalDaysNeeded <= 126) {
				historicalRange = '6mo';
			} else if (totalDaysNeeded <= 252) {
				historicalRange = '1y';
			} else if (totalDaysNeeded <= 504) {
				historicalRange = '2y';
			} else if (totalDaysNeeded <= 1260) {
				historicalRange = '5y';
			} else if (totalDaysNeeded <= 2520) {
				historicalRange = '10y';
			} else {
				historicalRange = 'max';
			}

			console.log(`[MA] Current timeframe: ${this.timeframe} (~${currentDays} days), Need ${maxPeriod} historical, Total: ${totalDaysNeeded} days, Fetching: ${historicalRange}`);
		}

		try {
			// Fetch historical data with the same interval as current data
			// This will include current data + historical data before it
			// Pass null to use the default interval logic based on timeframe
			const allData = await this.fetchYahooFinanceData(this.symbol, historicalRange, null);

			// Get current data dates for reference
			const currentDates = new Set(this.chartData.map(d => d.date));

			// Find the start date of current data
			const currentStartDate = this.chartData.length > 0 ? new Date(this.chartData[0].date) : null;

			// Filter to get only data BEFORE the current timeframe starts
			// This gives us the historical data we need for MA calculation
			let historicalOnly = [];
			if (currentStartDate) {
				historicalOnly = allData.filter(d => {
					const dataDate = new Date(d.date);
					return dataDate < currentStartDate;
				});
			} else {
				// Fallback: filter by date string comparison
				historicalOnly = allData.filter(d => !currentDates.has(d.date));
			}

			// Sort historical data by date
			historicalOnly.sort((a, b) => {
				const dateA = new Date(a.date);
				const dateB = new Date(b.date);
				return dateA - dateB;
			});

			// Take the last maxPeriod data points from historical data
			// This ensures we have enough data points right before current data starts
			if (historicalOnly.length > maxPeriod) {
				historicalOnly = historicalOnly.slice(-maxPeriod);
			}

			// Combine: historical first, then current
			const combinedData = [...historicalOnly, ...this.chartData];

			// Sort by date to ensure chronological order (just to be safe)
			combinedData.sort((a, b) => {
				const dateA = new Date(a.date);
				const dateB = new Date(b.date);
				return dateA - dateB;
			});

			// Store only the closes for MA calculation
			const allCloses = combinedData.map(d => d.close).filter(c => c !== null && c !== undefined);

			if (allCloses.length >= maxPeriod) {
				this.historicalData = allCloses;
				console.log(`[MA] Loaded ${historicalOnly.length} historical + ${this.chartData.length} current = ${allCloses.length} total data points for ${maxPeriod} period MA`);
			} else {
				console.warn(`[MA] Not enough historical data: ${allCloses.length} < ${maxPeriod}. Historical: ${historicalOnly.length}, Current: ${this.chartData.length}`);
				this.historicalData = allCloses.length > 0 ? allCloses : null;
			}
		} catch (error) {
			console.warn('Could not load historical data for MA:', error);
			this.historicalData = null;
		}
	}

	updateChart() {
		if (!this.chartData || this.chartData.length === 0) return;

		const canvas = this.shadowRoot?.getElementById('chart');
		if (!canvas) {
			console.warn('[StockChart] Canvas not found, skipping chart update');
			return;
		}

		const ctx = canvas.getContext('2d');
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();

		const width = rect.width > 0 ? rect.width : 800;
		const height = rect.height > 0 ? rect.height : 400;

		canvas.width = width * dpr;
		canvas.height = height * dpr;
		ctx.scale(dpr, dpr);
		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';

		const labels = this.chartData.map(d => d.date);
		const closes = this.chartData.map(d => d.close);

		const datasets = [{
			label: `${this.symbol} Close`,
			data: closes,
			borderColor: '#4ea1f3',
			backgroundColor: (context) => {
				const chart = context.chart;
				const { ctx, chartArea } = chart;
				if (!chartArea) {
					return null;
				}
				const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
				gradient.addColorStop(0, 'rgba(78, 161, 243, 0.3)');
				gradient.addColorStop(1, 'rgba(78, 161, 243, 0)');
				return gradient;
			},
			fill: true,
			tension: 0.1,
			pointRadius: 0,
			borderWidth: 2
		}];

		// Add overlays with historical data support
		if (this.overlays.ma50) {
			const ma50 = this.calculateMAWithHistory(closes, 50);
			// Ensure MA50 has the same length as closes array
			const paddedMA50 = this.padMAArray(ma50, closes.length);
			datasets.push({
				label: '50 MA',
				data: paddedMA50,
				borderColor: '#fbbf24',
				borderWidth: 1.5,
				pointRadius: 0,
				tension: 0.1,
				fill: false
			});
		}

		if (this.overlays.ma100) {
			const ma100 = this.calculateMAWithHistory(closes, 100);
			// Ensure MA100 has the same length as closes array
			const paddedMA100 = this.padMAArray(ma100, closes.length);
			datasets.push({
				label: '100 MA',
				data: paddedMA100,
				borderColor: '#f59e0b',
				borderWidth: 1.5,
				pointRadius: 0,
				tension: 0.1,
				fill: false
			});
		}

		if (this.overlays.ma200) {
			const ma200 = this.calculateMAWithHistory(closes, 200);
			// Ensure MA200 has the same length as closes array
			const paddedMA200 = this.padMAArray(ma200, closes.length);
			datasets.push({
				label: '200 MA',
				data: paddedMA200,
				borderColor: '#ef4444',
				borderWidth: 1.5,
				pointRadius: 0,
				tension: 0.1,
				fill: false
			});
		}

		if (this.overlays.neutralValue && this.neutralValueData) {
			// Calculate neutral value for current timeframe
			const neutralValues = this.calculateNeutralValueForTimeframe(closes, labels);

			// Add neutral value line
			datasets.push({
				label: 'Neutral Value (Index)',
				data: neutralValues,
				borderColor: '#8b5cf6',
				borderWidth: 2,
				borderDash: [10, 5],
				pointRadius: 0,
				tension: 0,
				fill: false
			});

			// Add 1 and 2 standard deviation bands using log-space transformation
			// Statistically correct: P̂_t · e^(±k·σ_log)
			if (this.neutralValueData.sigmaLog) {
				const sigmaLog = this.neutralValueData.sigmaLog;

				// Calculate bands: P̂_t · e^(±k·σ_log)
				const neutralPlus1SD = neutralValues.map(v => v !== null ? v * Math.exp(sigmaLog) : null);
				const neutralMinus1SD = neutralValues.map(v => v !== null ? v * Math.exp(-sigmaLog) : null);

				datasets.push({
					label: '+1σ',
					data: neutralPlus1SD,
					borderColor: '#a78bfa',
					borderWidth: 1,
					borderDash: [5, 5],
					pointRadius: 0,
					tension: 0,
					fill: false
				});

				datasets.push({
					label: '-1σ',
					data: neutralMinus1SD,
					borderColor: '#a78bfa',
					borderWidth: 1,
					borderDash: [5, 5],
					pointRadius: 0,
					tension: 0,
					fill: false
				});

				// Add 2 standard deviation bands
				const neutralPlus2SD = neutralValues.map(v => v !== null ? v * Math.exp(2 * sigmaLog) : null);
				const neutralMinus2SD = neutralValues.map(v => v !== null ? v * Math.exp(-2 * sigmaLog) : null);

				datasets.push({
					label: '+2σ',
					data: neutralPlus2SD,
					borderColor: '#c4b5fd',
					borderWidth: 1,
					borderDash: [3, 3],
					pointRadius: 0,
					tension: 0,
					fill: false
				});

				datasets.push({
					label: '-2σ',
					data: neutralMinus2SD,
					borderColor: '#c4b5fd',
					borderWidth: 1,
					borderDash: [3, 3],
					pointRadius: 0,
					tension: 0,
					fill: false
				});
			}
		}

		// Add PE Ratio overlay if enabled
		if (this.overlays.peRatio) {
			// Show historical PE Ratio trend if available
			if (this.peRatioHistory && this.peRatioHistory.length > 0) {
				// Step 1: Smooth EPS with 4-Quarter Rolling Average
				const smoothedEPS = [];
				for (let i = 0; i < this.peRatioHistory.length; i++) {
					if (i < 3) {
						// For first 3 quarters, use available data
						const availableEPS = this.peRatioHistory.slice(0, i + 1).map(d => d.eps);
						const avg = availableEPS.reduce((sum, val) => sum + val, 0) / availableEPS.length;
						smoothedEPS.push({
							date: this.peRatioHistory[i].date,
							eps: avg
						});
					} else {
						// 4-Quarter Rolling Average
						const quarterEPS = this.peRatioHistory.slice(i - 3, i + 1).map(d => d.eps);
						const avg = quarterEPS.reduce((sum, val) => sum + val, 0) / 4;
						smoothedEPS.push({
							date: this.peRatioHistory[i].date,
							eps: avg
						});
					}
				}

				// Step 2: Calculate historical PE ratios (Price / EPS) for last 8-10 years
				// We need to match EPS dates with price dates
				const historicalPEs = [];
				const tenYearsAgo = new Date();
				tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

				smoothedEPS.forEach(epsItem => {
					const epsDate = new Date(epsItem.date);
					if (epsDate >= tenYearsAgo) {
						// Find closest price for this EPS date
						let closestPrice = null;
						let minDiff = Infinity;

						for (let i = 0; i < this.chartData.length; i++) {
							const priceDate = new Date(this.chartData[i].date);
							const diff = Math.abs(priceDate - epsDate);

							// Allow up to 3 months difference
							if (diff < 90 * 24 * 60 * 60 * 1000 && diff < minDiff) {
								minDiff = diff;
								closestPrice = closes[i];
							}
						}

						if (closestPrice && closestPrice > 0 && epsItem.eps > 0) {
							const pe = closestPrice / epsItem.eps;
							if (pe > 0 && isFinite(pe)) {
								historicalPEs.push(pe);
							}
						}
					}
				});

				// Calculate median PE (neutral PE)
				let neutralPE = null;
				if (historicalPEs.length > 0) {
					const sortedPEs = [...historicalPEs].sort((a, b) => a - b);
					const mid = Math.floor(sortedPEs.length / 2);
					neutralPE = sortedPEs.length % 2 === 0
						? (sortedPEs[mid - 1] + sortedPEs[mid]) / 2
						: sortedPEs[mid];
					console.log(`[PE Ratio] Calculated neutral PE (median): ${neutralPE.toFixed(2)} from ${historicalPEs.length} data points`);
				} else {
					// Fallback to current PE if no historical data
					neutralPE = this.peRatio;
					console.log(`[PE Ratio] Using current PE as neutral PE: ${neutralPE}`);
				}

				// Step 3: Linearly interpolate smoothed EPS to daily frequency
				// Create a helper function to get interpolated EPS for any date
				const getInterpolatedEPS = (targetDate) => {
					// Find the two smoothed EPS points that bracket the target date
					let beforeIndex = -1;
					let afterIndex = -1;

					for (let i = 0; i < smoothedEPS.length; i++) {
						const epsDate = new Date(smoothedEPS[i].date);
						if (epsDate <= targetDate) {
							beforeIndex = i;
						} else if (afterIndex === -1) {
							afterIndex = i;
							break;
						}
					}

					// If target date is before first EPS date, use first value
					if (beforeIndex === -1) {
						return smoothedEPS[0]?.eps || null;
					}

					// If target date is after last EPS date, use last value
					if (afterIndex === -1) {
						return smoothedEPS[smoothedEPS.length - 1]?.eps || null;
					}

					// Linear interpolation between before and after EPS values
					const beforeEPS = smoothedEPS[beforeIndex];
					const afterEPS = smoothedEPS[afterIndex];
					const beforeDate = new Date(beforeEPS.date);
					const afterDate = new Date(afterEPS.date);

					// Calculate interpolation factor
					const totalTime = afterDate - beforeDate;
					const elapsedTime = targetDate - beforeDate;
					const t = totalTime > 0 ? elapsedTime / totalTime : 0;

					// Linear interpolation: EPS(t) = EPS_before + (EPS_after - EPS_before) * t
					const interpolatedEPS = beforeEPS.eps + (afterEPS.eps - beforeEPS.eps) * t;
					return interpolatedEPS;
				};

				console.log(`[PE Ratio] Prepared interpolation function for ${smoothedEPS.length} smoothed EPS points`);

				// Step 4: Calculate Fair Value for each chart point using interpolated daily EPS
				// Fair Value = interpolated daily EPS × PE_neutral
				const fairValuePrices = [];

				labels.forEach((label, index) => {
					const chartDate = new Date(this.chartData[index].date);

					// Get interpolated EPS for this exact chart date
					const applicableEPS = getInterpolatedEPS(chartDate);

					// Calculate Fair Value = interpolated daily EPS × PE_neutral
					if (applicableEPS && applicableEPS > 0 && neutralPE && neutralPE > 0) {
						const fairValue = applicableEPS * neutralPE;
						fairValuePrices.push(fairValue);
					} else {
						fairValuePrices.push(null);
					}
				});

				const validValues = fairValuePrices.filter(v => v !== null).length;
				console.log(`[PE Ratio] Calculated ${validValues} Fair Value prices from ${fairValuePrices.length} chart points`);
				if (validValues > 0) {
					console.log(`[PE Ratio] Sample Fair Values: first=${fairValuePrices.find(v => v !== null)?.toFixed(2)}, last=${fairValuePrices.slice().reverse().find(v => v !== null)?.toFixed(2)}`);
				}

				// Add Fair Value line (calculated from smoothed EPS × neutral PE)
				datasets.push({
					label: `Fair Value (Stock) - PE: ${neutralPE ? neutralPE.toFixed(2) : 'N/A'}`,
					data: fairValuePrices,
					borderColor: '#06b6d4',
					borderWidth: 2,
					borderDash: [8, 4],
					pointRadius: 0,
					tension: 0.3,
					fill: false,
					yAxisID: 'y' // Use same Y-axis as price
				});
			} else if (this.peRatio !== null && this.peRatio !== undefined) {
				// Fallback: Show current PE ratio as horizontal line if no history available
				const currentPrice = closes[closes.length - 1];

				datasets.push({
					label: `PE Ratio: ${this.peRatio.toFixed(2)} (Current)`,
					data: labels.map(() => currentPrice),
					borderColor: '#06b6d4',
					borderWidth: 2,
					borderDash: [8, 4],
					pointRadius: 0,
					tension: 0,
					fill: false
				});
			}
		}

		// Add 3-Tranche Strategy levels if enabled
		if (this.overlays.trancheStrategy && this.trancheLevels) {
			// Tranches are always active (trend filter removed)
			// Clear any previous status
			this.setStatus('');

			// Safety check: ensure tranche levels are valid
			if (this.trancheLevels.tranche1 === null || this.trancheLevels.tranche1 === undefined ||
				this.trancheLevels.tranche2 === null || this.trancheLevels.tranche2 === undefined ||
				this.trancheLevels.tranche3 === null || this.trancheLevels.tranche3 === undefined) {
				console.warn('[3-Tranche] Invalid tranche levels, skipping display');
				return;
			}

			const tranche1Value = this.trancheLevels.tranche1;
			const tranche2Value = this.trancheLevels.tranche2;
			const tranche3Value = this.trancheLevels.tranche3;
			const weights = this.trancheLevels.weights || { tranche1: 0.20, tranche2: 0.30, tranche3: 0.50 };
			const confirmations = this.trancheLevels.confirmations || {};

			// Helper function to format label with confirmation signals
			const formatLabel = (trancheNum, weight, confirmation) => {
				let label = `Tranche ${trancheNum} - ${(weight * 100).toFixed(0)}%`;
				if (confirmation && confirmation.confirmed && confirmation.signals.length > 0) {
					label += ` ✓ (${confirmation.signals.join(', ')})`;
				}
				return label;
			};

			// Create horizontal lines for each tranche level with weightings and confirmations
			datasets.push({
				label: formatLabel(1, weights.tranche1, confirmations.tranche1),
				data: labels.map(() => tranche1Value),
				borderColor: '#10b981',
				borderWidth: 2,
				borderDash: [8, 4],
				pointRadius: 0,
				fill: false
			});

			datasets.push({
				label: formatLabel(2, weights.tranche2, confirmations.tranche2),
				data: labels.map(() => tranche2Value),
				borderColor: '#f59e0b',
				borderWidth: 2,
				borderDash: [8, 4],
				pointRadius: 0,
				fill: false
			});

			datasets.push({
				label: formatLabel(3, weights.tranche3, confirmations.tranche3),
				data: labels.map(() => tranche3Value),
				borderColor: '#3b82f6',
				borderWidth: 2,
				borderDash: [8, 4],
				pointRadius: 0,
				fill: false
			});
		}

		// OLD: Add Gamma Heatmap visualization if enabled (REMOVED)
		if (false && this.overlays.gammaHeatmap && this.gammaData && this.gammaData.data && this.gammaData.data.length > 0) {
			console.log('[Gamma Heatmap] Rendering heatmap with', this.gammaData.data.length, 'strikes');

			// Group GEX by strike (combine calls and puts)
			const strikeMap = new Map();
			for (const item of this.gammaData.data) {
				if (!strikeMap.has(item.strike)) {
					strikeMap.set(item.strike, { strike: item.strike, totalGEX: 0, callGEX: 0, putGEX: 0 });
				}
				const entry = strikeMap.get(item.strike);
				if (item.type === 'call') {
					entry.callGEX += item.gex;
				} else {
					entry.putGEX += item.gex;
				}
				entry.totalGEX = entry.callGEX + entry.putGEX;
			}

			// Calculate max absolute GEX for normalization
			const maxAbsGEX = Math.max(...Array.from(strikeMap.values()).map(d => Math.abs(d.totalGEX)));
			if (maxAbsGEX === 0) {
				console.warn('[Gamma Heatmap] Max GEX is 0, skipping visualization');
			} else {
				// Sort strikes to create a heatmap
				const sortedStrikes = Array.from(strikeMap.entries()).sort((a, b) => a[0] - b[0]);

				// Create a single heatmap dataset showing GEX intensity
				// We'll show it as horizontal bands at each strike level
				for (const [strike, data] of sortedStrikes) {
					// Normalize GEX to 0-1 range for color intensity
					const intensity = Math.min(Math.abs(data.totalGEX) / maxAbsGEX, 1);
					const alpha = Math.max(intensity * 0.4, 0.1); // Minimum visibility
					const color = data.totalGEX > 0
						? `rgba(16, 185, 129, ${alpha})` // Green for positive (calls)
						: `rgba(239, 68, 68, ${alpha})`; // Red for negative (puts)

					// Add a dataset for this strike level (as a horizontal line/band)
					datasets.push({
						label: `GEX ${strike.toFixed(0)}`,
						data: labels.map(() => strike), // Constant strike price across all time
						borderColor: color,
						backgroundColor: color,
						borderWidth: 1,
						pointRadius: 0,
						fill: 'start', // Fill below the line
						stepped: false,
						hidden: false // Show in chart
					});
				}

				// Add Call Wall and Put Wall as horizontal lines
				if (this.gammaData.callWall) {
					datasets.push({
						label: 'Call Wall',
						data: labels.map(() => this.gammaData.callWall),
						borderColor: '#10b981',
						borderWidth: 3,
						borderDash: [10, 5],
						pointRadius: 0,
						fill: false
					});
				}

				if (this.gammaData.putWall) {
					datasets.push({
						label: 'Put Wall',
						data: labels.map(() => this.gammaData.putWall),
						borderColor: '#ef4444',
						borderWidth: 3,
						borderDash: [10, 5],
						pointRadius: 0,
						fill: false
					});
				}
			}
		} else {
			if (this.overlays.gammaHeatmap) {
				console.log('[Gamma Heatmap] Heatmap enabled but no data:', {
					hasOverlay: this.overlays.gammaHeatmap,
					hasData: !!this.gammaData,
					dataLength: this.gammaData?.data?.length || 0
				});
			}
		}

		if (this.chart) {
			this.chart.destroy();
		}

		if (typeof Chart === 'undefined') {
			this.setStatus('Chart.js not loaded. Please refresh the page.');
			return;
		}

		// Check theme from localStorage for reliable detection
		const isLightMode = localStorage.getItem('theme') === 'light';

		this.chart = new Chart(ctx, {
			type: 'line',
			data: { labels, datasets },
			options: {
				maintainAspectRatio: false,
				responsive: true,
				interaction: { intersect: false },
				backgroundColor: isLightMode ? '#c0c9d4' : '#0b0f14',
				scales: {
					x: {
						ticks: { color: isLightMode ? '#0a0a0a' : '#9fb0c0', maxTicksLimit: 10 },
						grid: { color: isLightMode ? '#a0aab8' : 'rgba(255,255,255,0.06)' }
					},
					y: {
						ticks: { color: isLightMode ? '#0a0a0a' : '#9fb0c0' },
						grid: { color: isLightMode ? '#a0aab8' : 'rgba(255,255,255,0.06)' }
					}
				},
				plugins: {
					legend: {
						labels: { color: isLightMode ? '#0a0a0a' : '#e6edf3' }
					},
					tooltip: {
						callbacks: {
							label: (context) => {
								const datasetLabel = context.dataset.label || '';
								const value = context.parsed.y;
								const formattedValue = value !== null && !isNaN(value) ? value.toFixed(2) : 'N/A';

								// Custom tooltip for Neutral Value with note
								if (datasetLabel === 'Neutral Value (Index)') {
									return [
										`${datasetLabel}: ${formattedValue}`,
										'',
										'Note: Neutral Value is most meaningful',
										'for major indices, not individual stocks.'
									];
								}

								return `${datasetLabel}: ${formattedValue}`;
							}
						}
					}
				}
			}
		});

		// Load overlays AFTER chart is created so they can update it
		// Use setTimeout to ensure chart is fully initialized
		setTimeout(() => {
			if (this.overlays.sp500) {
				// Load S&P 500 data for comparison
				this.loadComparisonTicker('^GSPC', 'S&P 500');
			}

			// Load custom tickers
			this.customTickers.forEach(ticker => {
				this.loadComparisonTicker(ticker, ticker);
			});
		}, 100);
	}

	addCustomTicker() {
		const input = this.shadowRoot.getElementById('custom-ticker');
		const ticker = input.value.trim().toUpperCase();

		if (!ticker) {
			return;
		}

		// Validate ticker format (basic check)
		if (!/^[A-Z.^]{1,10}$/.test(ticker)) {
			this.setStatus('Invalid ticker format. Use letters, dots, or ^ for indices.');
			return;
		}

		// Don't add if already exists
		if (this.customTickers.has(ticker)) {
			this.setStatus(`${ticker} is already added.`);
			return;
		}

		// Don't add if it's the same as the main symbol
		if (ticker === this.symbol) {
			this.setStatus('Cannot compare with the same ticker.');
			return;
		}

		this.customTickers.add(ticker);
		input.value = '';
		this.setStatus(`Loading ${ticker}...`);

		// Update chart with new ticker
		this.updateChart();
	}

	async loadComparisonTicker(tickerSymbol, tickerLabel, datasets = null, labels = null) {
		try {
			if (!this.chartData || this.chartData.length === 0) {
				console.warn('No chart data available for comparison');
				return;
			}

			this.setStatus(`Loading ${tickerLabel}...`);

			const tickerData = await this.fetchYahooFinanceData(tickerSymbol, this.timeframe);
			const tickerCloses = tickerData.map(d => d.close);

			// Normalize ticker to match the stock's scale (percentage change from first point)
			const stockCloses = this.chartData.map(d => d.close);
			const stockFirst = stockCloses[0];
			const tickerFirst = tickerCloses[0];

			if (!tickerFirst || !stockFirst) {
				throw new Error('Invalid data');
			}

			// Align arrays by date if possible, otherwise use index alignment
			const normalizedTicker = [];
			for (let i = 0; i < stockCloses.length; i++) {
				const tickerIndex = Math.floor((i / stockCloses.length) * tickerCloses.length);
				const tickerValue = tickerCloses[tickerIndex] || tickerCloses[tickerCloses.length - 1];
				normalizedTicker.push((tickerValue / tickerFirst) * stockFirst);
			}

			// Generate a unique color for each ticker
			const colors = ['#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'];
			const currentDatasets = this.chart ? this.chart.data.datasets : (datasets || []);
			const colorIndex = currentDatasets.length % colors.length;

			const newDataset = {
				label: `${tickerLabel} (normalized)`,
				data: normalizedTicker,
				borderColor: colors[colorIndex],
				borderWidth: 1.5,
				borderDash: [5, 5],
				pointRadius: 0,
				tension: 0.1
			};

			if (this.chart) {
				// Chart already exists, add dataset and update
				this.chart.data.datasets.push(newDataset);
				this.chart.update();
			} else if (datasets) {
				// Chart not yet created, add to datasets array
				datasets.push(newDataset);
			}

			this.setStatus('');
			console.log(`Successfully loaded ${tickerLabel} as overlay`);
		} catch (error) {
			console.error(`Error loading ${tickerLabel}:`, error);
			this.setStatus(`Could not load ${tickerLabel} comparison`);
			// Remove from set if it fails
			if (this.customTickers.has(tickerSymbol)) {
				this.customTickers.delete(tickerSymbol);
			}
		}
	}

	async loadSP500Comparison(datasets, labels) {
		// Legacy method - redirect to new method
		await this.loadComparisonTicker('^GSPC', 'S&P 500', datasets, labels);
	}

	calculateMA(values, period) {
		const ma = [];
		for (let i = 0; i < values.length; i++) {
			if (i < period - 1) {
				ma.push(null);
			} else {
				const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
				ma.push(sum / period);
			}
		}
		return ma;
	}

	calculateMAWithHistory(currentValues, period) {
		// If we have historical data, use it for MA calculation
		if (this.historicalData && this.historicalData.length >= period) {
			// Calculate MA for all historical + current values
			const allMA = this.calculateMA(this.historicalData, period);

			// The historical data structure is: [historical data points...current data points]
			// allMA is calculated from this combined array
			// The first (period - 1) values in allMA will be null (not enough data)
			// After that, we have valid MA values
			// We need the portion of allMA that corresponds to currentValues

			// Since historicalData ends with currentValues, allMA should end with MA values for currentValues
			// We want the last currentValues.length values from allMA
			const startIdx = Math.max(0, allMA.length - currentValues.length);
			let result = allMA.slice(startIdx);

			// Ensure result has exactly currentValues.length elements
			if (result.length < currentValues.length) {
				// Pad with nulls at the beginning if needed
				const padding = new Array(currentValues.length - result.length).fill(null);
				result = [...padding, ...result];
			} else if (result.length > currentValues.length) {
				// Take only the last currentValues.length values
				result = result.slice(-currentValues.length);
			}

			// Count how many non-null values we have
			const validCount = result.filter(v => v !== null).length;
			console.log(`[MA${period}] Historical: ${this.historicalData.length}, All MA: ${allMA.length}, Result: ${result.length}, Valid: ${validCount}, Target: ${currentValues.length}`);

			return result;
		} else {
			// Fallback to regular calculation if no historical data
			const available = this.historicalData ? this.historicalData.length : 0;
			console.warn(`[MA${period}] No historical data available (have: ${available}, need: ${period}), using regular calculation`);
			return this.calculateMA(currentValues, period);
		}
	}

	padMAArray(maArray, targetLength) {
		// If MA array is shorter than target, pad with nulls at the beginning
		if (maArray.length < targetLength) {
			const padding = new Array(targetLength - maArray.length).fill(null);
			return [...padding, ...maArray];
		}
		// If MA array is longer, take the last targetLength values
		if (maArray.length > targetLength) {
			return maArray.slice(-targetLength);
		}
		return maArray;
	}

	async loadPERatio() {
		if (!this.symbol) return;

		try {
			// First, get current PE ratio
			const response = await fetch(`${API_BASE_URL}/api/fundamentals/${this.symbol}`);
			if (!response.ok) {
				console.warn('[PE Ratio] Failed to fetch fundamentals');
				this.peRatio = null;
				this.peRatioHistory = null;
				return;
			}

			const data = await response.json();
			console.log('[PE Ratio] Full response structure:', Object.keys(data));

			// Extract current PE ratio from different possible locations
			let peRatio = null;

			// Try quoteSummary.defaultKeyStatistics format first (most common)
			if (data.quoteSummary?.result?.[0]?.defaultKeyStatistics) {
				const stats = data.quoteSummary.result[0].defaultKeyStatistics;
				console.log('[PE Ratio] Found defaultKeyStatistics:', Object.keys(stats));
				peRatio = stats.trailingPE?.raw || stats.forwardPE?.raw;
			}

			// Try quoteSummary.summaryDetail format
			if (!peRatio && data.quoteSummary?.result?.[0]?.summaryDetail) {
				const summary = data.quoteSummary.result[0].summaryDetail;
				console.log('[PE Ratio] Found quoteSummary.summaryDetail:', Object.keys(summary));
				peRatio = summary.trailingPE?.raw || summary.forwardPE?.raw;
			}

			// Try Finnhub format
			if (!peRatio && data.financials?.metric) {
				console.log('[PE Ratio] Found financials.metric:', Object.keys(data.financials.metric));
				peRatio = data.financials.metric.peTTM ||
					data.financials.metric.peExclExtraTTM ||
					data.financials.metric.peBasicExclExtraTTM ||
					data.financials.metric.forwardPE;
			}

			// Try direct metric format
			if (!peRatio && data.metric) {
				console.log('[PE Ratio] Found direct metric:', Object.keys(data.metric));
				peRatio = data.metric.peTTM ||
					data.metric.peExclExtraTTM ||
					data.metric.peBasicExclExtraTTM ||
					data.metric.forwardPE;
			}

			if (peRatio && peRatio > 0 && isFinite(peRatio)) {
				this.peRatio = peRatio;
				console.log(`[PE Ratio] Loaded current PE Ratio: ${this.peRatio}`);
			} else {
				console.warn('[PE Ratio] No valid current PE ratio found. Available keys:', JSON.stringify(Object.keys(data)).substring(0, 200));
				this.peRatio = null;
			}

			// Now fetch historical fundamentals to calculate PE ratio from EPS and price
			const historicalResponse = await fetch(`${API_BASE_URL}/api/fundamentals/historical/${this.symbol}`);
			if (!historicalResponse.ok) {
				console.warn('[PE Ratio] Failed to fetch historical fundamentals:', historicalResponse.status);
				this.peRatioHistory = null;
				return;
			}

			const historicalData = await historicalResponse.json();

			// Get metrics object
			let metricsObj = null;
			if (Array.isArray(historicalData)) {
				const metricsItem = historicalData.find(item => item && item.metrics);
				if (metricsItem) {
					metricsObj = metricsItem.metrics;
				} else if (historicalData[0] && typeof historicalData[0] === 'object') {
					metricsObj = historicalData[0].metrics;
				}
			} else if (historicalData && typeof historicalData === 'object') {
				metricsObj = historicalData.metrics;
			}

			if (!metricsObj || typeof metricsObj !== 'object' || Array.isArray(metricsObj)) {
				console.warn('[PE Ratio] No metrics object found');
				this.peRatioHistory = null;
				return;
			}

			// Get EPS data (earnings per share) - we'll use this to calculate PE ratio
			let epsSeries = null;
			if (metricsObj.eps) {
				epsSeries = metricsObj.eps;
				console.log('[PE Ratio] Found EPS data');
			} else {
				console.warn('[PE Ratio] No EPS data found. Available metrics:', Object.keys(metricsObj));
				this.peRatioHistory = null;
				return;
			}

			// Get EPS data points (prefer quarterly for smoothing, fallback to annual)
			let epsData = [];
			if (epsSeries.quarterly && epsSeries.quarterly.length > 0) {
				epsData = epsSeries.quarterly.map(item => ({
					date: item.period || item.date || item.year,
					eps: item.v !== undefined ? item.v : (item.value !== undefined ? item.value : null)
				})).filter(item => item.eps && item.eps > 0 && isFinite(item.eps) && item.date)
					.sort((a, b) => new Date(a.date) - new Date(b.date));
				console.log(`[PE Ratio] Loaded ${epsData.length} quarterly EPS data points`);
			} else if (epsSeries.annual && epsSeries.annual.length > 0) {
				epsData = epsSeries.annual.map(item => ({
					date: item.period || item.date || item.year,
					eps: item.v !== undefined ? item.v : (item.value !== undefined ? item.value : null)
				})).filter(item => item.eps && item.eps > 0 && isFinite(item.eps) && item.date)
					.sort((a, b) => new Date(a.date) - new Date(b.date));
				console.log(`[PE Ratio] Loaded ${epsData.length} annual EPS data points`);
			}

			if (epsData.length === 0) {
				console.warn('[PE Ratio] No valid EPS data found');
				this.peRatioHistory = null;
				return;
			}

			// Store EPS data for later calculation
			this.peRatioHistory = epsData;

			console.log(`[PE Ratio] Prepared ${this.peRatioHistory.length} EPS data points for PE ratio calculation`);
		} catch (error) {
			console.error('[PE Ratio] Error loading PE ratio:', error);
			this.peRatio = null;
			this.peRatioHistory = null;
		}
	}

	async loadNeutralValueData() {
		// Load last 30 years of data for static exponential regression
		// The neutral value will only be calculated for dates within or after this 30-year window
		try {
			// Fetch maximum available data
			const historicalData = await this.fetchYahooFinanceData(this.symbol, 'max', false);

			if (!historicalData || historicalData.length === 0) {
				console.warn('[Neutral Value] No historical data available');
				this.neutralValueData = null;
				return;
			}

			// Take last 30 years worth of data (approximately 30 * 252 = 7560 trading days)
			// But use all available data if less than 30 years
			const maxDays = 30 * 252; // ~30 years of trading days
			const dataToUse = historicalData.length > maxDays
				? historicalData.slice(-maxDays)
				: historicalData;

			// Extract dates and prices for regression
			const dates = dataToUse.map(d => new Date(d.date).getTime());
			const prices = dataToUse.map(d => d.close);

			// Filter out invalid data
			const validData = [];
			for (let i = 0; i < dates.length; i++) {
				if (dates[i] && prices[i] && prices[i] > 0 && !isNaN(dates[i])) {
					validData.push({
						date: dates[i],
						price: prices[i]
					});
				}
			}

			if (validData.length < 10) {
				console.warn('[Neutral Value] Not enough valid data points for regression');
				this.neutralValueData = null;
				return;
			}

			// Ensure data is sorted by date (chronologically)
			validData.sort((a, b) => a.date - b.date);

			// Store the date range of the regression window (using validData, not dataToUse)
			// windowStart is the first date of the valid data used for regression
			const windowStart = validData[0].date;
			const windowEnd = validData[validData.length - 1].date;

			// Perform exponential regression: y = a * e^(b*x)
			// Linearize: log(P_t) = log(a) + b*t
			const regression = this.exponentialRegression(validData);

			if (regression) {
				// Store the regression with window boundaries
				// Neutral value will only be calculated for dates >= windowStart
				this.neutralValueData = {
					...regression,
					windowStart: windowStart,
					windowEnd: windowEnd
				};
				const windowStartDate = new Date(windowStart);
				const windowEndDate = new Date(windowEnd);
				console.log(`[Neutral Value] Static regression calculated: a=${regression.a.toFixed(4)}, b=${regression.b.toFixed(6)}, sigmaLog=${regression.sigmaLog?.toFixed(4)}, using ${validData.length} data points`);
				console.log(`[Neutral Value] Window: ${windowStartDate.toISOString().split('T')[0]} to ${windowEndDate.toISOString().split('T')[0]}`);
			} else {
				this.neutralValueData = null;
			}
		} catch (error) {
			console.error('[Neutral Value] Error loading data:', error);
			this.neutralValueData = null;
		}
	}

	calculateATR(period = 14) {
		if (!this.chartData || this.chartData.length < period + 1) {
			return null;
		}

		const trueRanges = [];
		for (let i = 1; i < this.chartData.length; i++) {
			const high = this.chartData[i].high || this.chartData[i].close;
			const low = this.chartData[i].low || this.chartData[i].close;
			const prevClose = this.chartData[i - 1].close;

			const tr = Math.max(
				high - low,
				Math.abs(high - prevClose),
				Math.abs(low - prevClose)
			);
			trueRanges.push(tr);
		}

		// Calculate ATR as SMA of true ranges
		if (trueRanges.length < period) return null;

		const atrValues = [];
		for (let i = period - 1; i < trueRanges.length; i++) {
			const sum = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
			atrValues.push(sum / period);
		}

		// Return current ATR and median ATR
		const currentATR = atrValues[atrValues.length - 1];
		const sortedATR = [...atrValues].sort((a, b) => a - b);
		const medianATR = sortedATR[Math.floor(sortedATR.length / 2)];

		return { current: currentATR, median: medianATR, values: atrValues };
	}

	checkTrendFilter() {
		// Check if price is above 200-DMA or 200-DMA is flattening (not in steep downtrend)
		// If insufficient data, allow tranches but show warning
		if (!this.historicalData || this.historicalData.length < 200) {
			return { active: true, reason: 'Insufficient data for 200-DMA - trend filter bypassed', warning: true };
		}

		const ma200Values = this.calculateMAForCurrentValues(200);
		if (!ma200Values || ma200Values.length < 10) {
			return { active: true, reason: 'Cannot calculate 200-DMA - trend filter bypassed', warning: true };
		}

		const currentMA200 = ma200Values[ma200Values.length - 1];
		const prices = this.chartData.map(d => d.close);
		const currentPrice = prices[prices.length - 1];

		// Check if price is above 200-DMA
		const priceAboveMA = currentPrice > currentMA200;

		// Check if 200-DMA is flattening (slope of last 20 periods)
		const recentMA200 = ma200Values.slice(-20);
		if (recentMA200.length >= 2) {
			const ma200Slope = (recentMA200[recentMA200.length - 1] - recentMA200[0]) / recentMA200[0];
			const isFlattening = ma200Slope > -0.02; // Less than 2% decline over 20 periods

			if (priceAboveMA || isFlattening) {
				return { active: true, reason: priceAboveMA ? 'Price above 200-DMA' : '200-DMA flattening', warning: false };
			}
		}

		return { active: false, reason: 'Trend filter not met: price below 200-DMA and steep downtrend' };
	}

	checkConfirmationTriggers(trancheLevel) {
		// Optional: Check for confirmation signals before entry
		// Returns object with confirmation status and signals
		// Optimized: Use only last 10 periods for faster calculation
		if (!this.chartData || this.chartData.length < 10) {
			return { confirmed: false, signals: [] };
		}

		const recentData = this.chartData.slice(-10); // Last 10 periods (reduced from 14)
		const prices = recentData.map(d => d.close);
		const highs = recentData.map(d => d.high || d.close);
		const lows = recentData.map(d => d.low || d.close);
		const volumes = recentData.map(d => d.volume || 0);

		const currentPrice = prices[prices.length - 1];
		const prevPrice = prices[prices.length - 2];
		const prev2Price = prices[prices.length - 3];

		const signals = [];

		// 1. Reversal Candle: Check if current candle shows reversal pattern
		const currentHigh = highs[highs.length - 1];
		const currentLow = lows[lows.length - 1];
		const prevHigh = highs[highs.length - 2];
		const prevLow = lows[lows.length - 2];

		// Bullish reversal: price touched tranche level and closed higher
		if (currentLow <= trancheLevel * 1.01 && currentPrice > prevPrice && currentPrice > (currentHigh + currentLow) / 2) {
			signals.push('Reversal Candle');
		}

		// 2. RSI < 40 and turning up (optimized: use only available data)
		if (prices.length >= 7) {
			// Simplified RSI calculation using available data (minimum 7 periods)
			const rsiPeriod = Math.min(7, prices.length - 1);
			const gains = [];
			const losses = [];
			for (let i = 1; i < prices.length; i++) {
				const change = prices[i] - prices[i - 1];
				if (change > 0) {
					gains.push(change);
					losses.push(0);
				} else {
					gains.push(0);
					losses.push(Math.abs(change));
				}
			}

			if (gains.length >= rsiPeriod) {
				const avgGain = gains.slice(-rsiPeriod).reduce((a, b) => a + b, 0) / rsiPeriod;
				const avgLoss = losses.slice(-rsiPeriod).reduce((a, b) => a + b, 0) / rsiPeriod;

				if (avgLoss > 0) {
					const rs = avgGain / avgLoss;
					const rsi = 100 - (100 / (1 + rs));

					// Calculate previous RSI if enough data
					if (gains.length >= rsiPeriod + 1) {
						const prevGains = gains.slice(-rsiPeriod - 1, -1);
						const prevLosses = losses.slice(-rsiPeriod - 1, -1);
						const prevAvgGain = prevGains.reduce((a, b) => a + b, 0) / rsiPeriod;
						const prevAvgLoss = prevLosses.reduce((a, b) => a + b, 0) / rsiPeriod;

						if (prevAvgLoss > 0) {
							const prevRS = prevAvgGain / prevAvgLoss;
							const prevRSI = 100 - (100 / (1 + prevRS));

							if (rsi < 40 && rsi > prevRSI) {
								signals.push('RSI Turning Up');
							}
						}
					}
				}
			}
		}

		// 3. Volume Spike: Check if volume is above average near tranche level (optimized)
		if (volumes.length >= 5 && volumes[volumes.length - 1] > 0) {
			const avgVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
			const currentVolume = volumes[volumes.length - 1];

			if (currentVolume > avgVolume * 1.5 && Math.abs(currentPrice - trancheLevel) / trancheLevel < 0.02) {
				signals.push('Volume Spike');
			}
		}

		return {
			confirmed: signals.length > 0,
			signals: signals
		};
	}

	async calculateTrancheStrategy() {
		if (!this.chartData || this.chartData.length === 0) {
			console.warn('[3-Tranche] No chart data available');
			this.trancheLevels = null;
			return;
		}

		try {
			// Get price data from current timeframe
			if (!this.chartData || this.chartData.length === 0) {
				console.warn('[3-Tranche] No chart data available');
				this.trancheLevels = null;
				return;
			}

			const prices = this.chartData.map(d => d.close).filter(p => p !== null && p !== undefined && isFinite(p));
			if (prices.length === 0) {
				console.warn('[3-Tranche] No valid price data');
				this.trancheLevels = null;
				return;
			}

			const currentPrice = prices[prices.length - 1];
			if (!currentPrice || !isFinite(currentPrice)) {
				console.warn('[3-Tranche] Invalid current price');
				this.trancheLevels = null;
				return;
			}

			// Use the high/low from the current timeframe (not always 52 weeks)
			const timeframeHigh = Math.max(...prices);
			const timeframeLow = Math.min(...prices);
			const timeframeRange = timeframeHigh - timeframeLow;

			if (!isFinite(timeframeHigh) || !isFinite(timeframeLow) || !isFinite(timeframeRange) || timeframeRange <= 0) {
				console.warn('[3-Tranche] Invalid price range');
				this.trancheLevels = null;
				return;
			}

			// For display purposes, keep the old variable names but use timeframe data
			const high52w = timeframeHigh;
			const low52w = timeframeLow;
			const range52w = timeframeRange;

			// Trend filter removed - tranches are always active

			// Calculate ATR for volatility adjustment
			const atrData = this.calculateATR(14);
			const currentATR = atrData ? atrData.current : null;
			const medianATR = atrData ? atrData.median : null;

			// Determine if this is a short timeframe (needs adjusted ATR multiplier)
			const isShortTimeframe = ['1mo', '3mo'].includes(this.timeframe);
			const isVeryShortTimeframe = ['1d', '5d', '1w'].includes(this.timeframe);

			// Use Fibonacci retracements for all timeframes
			// Base Fibonacci retracements from high to low of timeframe
			const baseFib382 = high52w - (range52w * 0.382);
			const baseFib500 = high52w - (range52w * 0.500);
			const baseFib618 = high52w - (range52w * 0.618);

			let tranche1, tranche2, tranche3;

			if (currentATR && medianATR && medianATR > 0) {
				// Volatility adjustment factor (ATR ratio)
				const volAdjustment = currentATR / medianATR;

				// Adjust ATR multiplier based on timeframe
				// Very short timeframes: smaller ATR adjustment to keep tranches closer together
				// Longer timeframes: full ATR adjustment
				let atrMultiplier;
				if (isVeryShortTimeframe) {
					atrMultiplier = 0.2; // Very small adjustment for 1d, 5d, 1w
				} else if (isShortTimeframe) {
					atrMultiplier = 0.5; // Moderate adjustment for 1mo, 3mo
				} else {
					atrMultiplier = 1.0; // Full adjustment for longer timeframes
				}

				// ATR-adjusted Fibonacci retracements
				// Tranche 1: 0.5 × ATR below base Fib 38.2%
				// Tranche 2: 1.0 × ATR below base Fib 50%
				// Tranche 3: 1.5 × ATR below base Fib 61.8%
				tranche1 = baseFib382 - (currentATR * 0.5 * volAdjustment * atrMultiplier);
				tranche2 = baseFib500 - (currentATR * 1.0 * volAdjustment * atrMultiplier);
				tranche3 = baseFib618 - (currentATR * 1.5 * volAdjustment * atrMultiplier);
			} else {
				// Fallback to base Fibonacci if ATR not available
				tranche1 = baseFib382;
				tranche2 = baseFib500;
				tranche3 = baseFib618;
			}

			// Ensure all levels are below current price and above timeframe low
			// For shorter timeframes, adjust the constraints to keep all tranches visible
			const priceRange = timeframeHigh - timeframeLow;

			// Safety check: if price range is too small or zero, use fallback values
			if (priceRange <= 0 || !isFinite(priceRange)) {
				console.warn('[3-Tranche] Invalid price range, using fallback');
				this.trancheLevels = null;
				return;
			}

			// Adjust minimum distance based on timeframe (smaller for short timeframes)
			const minDistance = isShortTimeframe ? priceRange * 0.02 : priceRange * 0.05; // 2% for short, 5% for longer
			const minFromLow = isShortTimeframe ? priceRange * 0.01 : priceRange * 0.02; // 1% for short, 2% for longer

			// Calculate raw levels first
			let rawLevels = [tranche1, tranche2, tranche3]
				.map(level => Math.max(Math.min(level, currentPrice * 0.99), timeframeLow + minFromLow))
				.sort((a, b) => b - a); // Descending order

			// Ensure minimum spacing between tranches and that all are visible
			const levels = [];
			for (let i = 0; i < rawLevels.length; i++) {
				let level = rawLevels[i];

				// Ensure it's below current price
				level = Math.min(level, currentPrice * 0.99);

				// Ensure it's above the low
				level = Math.max(level, timeframeLow + minFromLow);

				// Ensure minimum distance from previous tranche (if exists)
				if (i > 0 && levels[i - 1] - level < minDistance) {
					level = levels[i - 1] - minDistance;
				}

				// Final check: ensure it's still within bounds
				level = Math.max(Math.min(level, currentPrice * 0.99), timeframeLow + minFromLow);

				levels.push(level);
			}

			// If any level is too close to the low or outside visible range, adjust all levels proportionally
			const minVisibleLevel = timeframeLow + minFromLow;
			const maxVisibleLevel = currentPrice * 0.99;
			const availableRange = maxVisibleLevel - minVisibleLevel;

			// Safety check: ensure available range is valid
			if (availableRange <= 0 || !isFinite(availableRange) || minVisibleLevel >= maxVisibleLevel) {
				console.warn('[3-Tranche] Invalid available range, using fallback distribution');
				// Distribute evenly across the price range
				const spacing = priceRange / 4; // Use 1/4 of range for spacing
				levels[0] = currentPrice - spacing * 1;
				levels[1] = currentPrice - spacing * 2;
				levels[2] = currentPrice - spacing * 3;
				// Ensure all are within bounds
				levels[0] = Math.max(Math.min(levels[0], currentPrice * 0.99), timeframeLow * 1.01);
				levels[1] = Math.max(Math.min(levels[1], currentPrice * 0.99), timeframeLow * 1.01);
				levels[2] = Math.max(Math.min(levels[2], currentPrice * 0.99), timeframeLow * 1.01);
			} else {
				// Check if all levels fit within the available range
				const lowestLevel = Math.min(...levels);
				const highestLevel = Math.max(...levels);
				const neededRange = highestLevel - lowestLevel;

				if (neededRange > availableRange || lowestLevel < minVisibleLevel) {
					// Need to compress or shift all levels
					// Distribute levels evenly across available range
					const spacing = availableRange / 3; // Even spacing for 3 tranches
					levels[0] = maxVisibleLevel - spacing * 0; // Highest tranche
					levels[1] = maxVisibleLevel - spacing * 1; // Middle tranche
					levels[2] = maxVisibleLevel - spacing * 2; // Lowest tranche

					// Ensure lowest is still above minimum
					if (levels[2] < minVisibleLevel) {
						const adjustment = minVisibleLevel - levels[2];
						levels[0] += adjustment;
						levels[1] += adjustment;
						levels[2] += adjustment;

						// Ensure highest is still below maximum
						if (levels[0] > maxVisibleLevel) {
							const overage = levels[0] - maxVisibleLevel;
							levels[0] -= overage;
							levels[1] -= overage;
							levels[2] -= overage;
						}
					}
				}
			}

			// Upgrade 3: Weightings (20/30/50)
			const weights = {
				tranche1: 0.20, // 20%
				tranche2: 0.30, // 30%
				tranche3: 0.50  // 50%
			};

			// Safety check: ensure all levels are valid numbers
			if (!levels || levels.length !== 3 || !levels.every(l => l !== null && l !== undefined && isFinite(l))) {
				console.warn('[3-Tranche] Invalid levels calculated:', levels);
				this.trancheLevels = null;
				return;
			}

			// Upgrade 4: Confirmation Triggers (optional) - calculate asynchronously after displaying tranches
			// First, display tranches immediately with empty confirmations
			this.trancheLevels = {
				tranche1: levels[0], // Aggressive (38.2% - highest)
				tranche2: levels[1], // Moderate (50% - middle)
				tranche3: levels[2], // Conservative (61.8% - lowest)
				weights: weights,
				confirmations: {
					tranche1: { confirmed: false, signals: [] },
					tranche2: { confirmed: false, signals: [] },
					tranche3: { confirmed: false, signals: [] }
				},
				currentPrice: currentPrice,
				high52w: high52w,
				low52w: low52w,
				atr: currentATR,
				volAdjusted: !!currentATR
			};

			console.log('[3-Tranche] Calculated levels:', this.trancheLevels);

			// Update chart immediately with tranches
			this.updateChart();

			// Calculate confirmation triggers asynchronously (non-blocking)
			setTimeout(() => {
				try {
					const confirmations = {
						tranche1: this.checkConfirmationTriggers(levels[0]),
						tranche2: this.checkConfirmationTriggers(levels[1]),
						tranche3: this.checkConfirmationTriggers(levels[2])
					};

					// Update trancheLevels with confirmations
					if (this.trancheLevels) {
						this.trancheLevels.confirmations = confirmations;
						this.updateChart(); // Update chart with confirmation signals
					}
				} catch (error) {
					console.warn('[3-Tranche] Error calculating confirmation triggers:', error);
				}
			}, 0);
		} catch (error) {
			console.error('[3-Tranche] Error calculating strategy:', error);
			this.trancheLevels = null;
		}
	}

	identifySupportLevels(prices, windowSize = 30) {
		const supportLevels = [];
		const tolerance = 0.02; // 2% tolerance for support level matching

		// Find local minima with a larger window
		for (let i = windowSize; i < prices.length - windowSize; i++) {
			const window = prices.slice(i - windowSize, i + windowSize);
			const localMin = Math.min(...window);

			// Check if current price is near the local minimum
			if (Math.abs(prices[i] - localMin) / localMin < tolerance) {
				// Check how many times price touched or bounced from this level
				let touchCount = 0;
				const levelTolerance = localMin * tolerance;

				// Check in a wider window (3x) for bounces
				const wideWindow = prices.slice(Math.max(0, i - windowSize * 3), Math.min(prices.length, i + windowSize * 3));
				for (let j = 0; j < wideWindow.length; j++) {
					if (Math.abs(wideWindow[j] - localMin) < levelTolerance) {
						touchCount++;
					}
				}

				// Only consider significant support levels (touched at least 3 times)
				if (touchCount >= 3) {
					supportLevels.push({
						price: localMin,
						touches: touchCount,
						index: i
					});
				}
			}
		}

		// Group similar support levels and keep the strongest
		const grouped = [];
		supportLevels.forEach(level => {
			let found = false;
			for (let i = 0; i < grouped.length; i++) {
				if (Math.abs(grouped[i].price - level.price) / level.price < tolerance) {
					// Merge with existing group (keep the one with more touches)
					if (level.touches > grouped[i].touches) {
						grouped[i] = level;
					}
					found = true;
					break;
				}
			}
			if (!found) {
				grouped.push(level);
			}
		});

		// Return sorted by price (descending) and filter out levels that are too close
		const sorted = grouped.sort((a, b) => b.price - a.price);
		const filtered = [];
		sorted.forEach(level => {
			if (filtered.length === 0 ||
				Math.abs(filtered[filtered.length - 1].price - level.price) / level.price > 0.05) {
				filtered.push(level);
			}
		});

		return filtered.map(l => l.price);
	}

	exponentialRegression(data) {
		// Exponential regression: y = a * e^(b*x)
		// Linearize: ln(y) = ln(a) + b*x
		// x = time (days since first date), y = price

		if (data.length < 2) return null;

		// Normalize dates to start from 0
		const firstDate = data[0].date;
		const xValues = data.map(d => (d.date - firstDate) / (1000 * 60 * 60 * 24)); // Convert to days
		const yValues = data.map(d => d.price);

		// Filter out non-positive values for logarithm
		const validIndices = [];
		for (let i = 0; i < yValues.length; i++) {
			if (yValues[i] > 0) {
				validIndices.push(i);
			}
		}

		if (validIndices.length < 2) return null;

		const validX = validIndices.map(i => xValues[i]);
		const validY = validIndices.map(i => Math.log(yValues[i])); // ln(y)

		// Linear regression: ln(y) = ln(a) + b*x
		const n = validX.length;
		const sumX = validX.reduce((a, b) => a + b, 0);
		const sumY = validY.reduce((a, b) => a + b, 0);
		const sumXY = validX.reduce((sum, x, i) => sum + x * validY[i], 0);
		const sumX2 = validX.reduce((sum, x) => sum + x * x, 0);

		const denominator = n * sumX2 - sumX * sumX;
		if (Math.abs(denominator) < 1e-10) return null;

		const b = (n * sumXY - sumX * sumY) / denominator;
		const lnA = (sumY - b * sumX) / n;
		const a = Math.exp(lnA);

		// Calculate log-residuals: ε_t = log(P_t) - log(P̂_t)
		// This is the statistically correct approach for exponential regression
		const logResiduals = [];
		for (let i = 0; i < validIndices.length; i++) {
			const predictedPrice = a * Math.exp(b * validX[i]);
			const actualPrice = yValues[validIndices[i]];
			// Calculate log-residual: log(actual) - log(predicted) = log(actual/predicted)
			if (predictedPrice > 0 && actualPrice > 0) {
				const logResidual = Math.log(actualPrice) - Math.log(predictedPrice);
				logResiduals.push(logResidual);
			}
		}

		// Calculate standard deviation in log-space: σ_log = std(ε_t)
		const meanLogResidual = logResiduals.reduce((a, b) => a + b, 0) / logResiduals.length;
		const variance = logResiduals.reduce((sum, r) => sum + Math.pow(r - meanLogResidual, 2), 0) / logResiduals.length;
		const sigmaLog = Math.sqrt(variance);

		return {
			a: a,
			b: b,
			firstDate: firstDate,
			sigmaLog: sigmaLog, // Standard deviation in log-space
			equation: (x) => a * Math.exp(b * x) // x in days since firstDate
		};
	}

	calculateNeutralValueForTimeframe(currentCloses, currentLabels) {
		if (!this.neutralValueData || !currentLabels || currentLabels.length === 0) {
			return currentCloses.map(() => null);
		}

		const { equation, firstDate, windowStart } = this.neutralValueData;
		const neutralValues = [];

		for (let i = 0; i < currentLabels.length; i++) {
			try {
				// Parse the date from the label
				let date;
				if (currentLabels[i].includes('T') || currentLabels[i].includes(' ')) {
					// ISO format or date-time format
					date = new Date(currentLabels[i]);
				} else {
					// Date-only format (YYYY-MM-DD)
					date = new Date(currentLabels[i] + 'T00:00:00');
				}

				if (isNaN(date.getTime())) {
					neutralValues.push(null);
					continue;
				}

				const dateTime = date.getTime();

				// Only calculate neutral value for dates >= windowStart
				// The regression is based on the last 30 years, so values before windowStart don't exist
				// windowStart is a timestamp (number), so we can compare directly
				if (!windowStart || dateTime < windowStart) {
					// Date is before the regression window - no neutral value available
					neutralValues.push(null);
					continue;
				}

				// Debug: Log if we're calculating for dates before windowStart (should not happen)
				if (i === 0 || i === currentLabels.length - 1) {
					const windowStartDate = new Date(windowStart);
					const currentDate = new Date(dateTime);
					if (dateTime < windowStart) {
						console.warn(`[Neutral Value] Date ${currentDate.toISOString().split('T')[0]} is before window start ${windowStartDate.toISOString().split('T')[0]}`);
					}
				}

				// Calculate days since first date (of regression window)
				const daysSinceFirst = (dateTime - firstDate) / (1000 * 60 * 60 * 24);

				// Calculate neutral value using exponential function
				// P̂(t) = e^(a + b*t) where a = log(a), b = b, t = days since first date
				const neutralValue = equation(daysSinceFirst);

				// Only include if value is positive and reasonable
				if (neutralValue > 0 && isFinite(neutralValue)) {
					neutralValues.push(neutralValue);
				} else {
					neutralValues.push(null);
				}
			} catch (error) {
				console.warn(`[Neutral Value] Error calculating for ${currentLabels[i]}:`, error);
				neutralValues.push(null);
			}
		}

		return neutralValues;
	}

	setStatus(message) {
		const statusEl = this.shadowRoot.getElementById('status');
		statusEl.textContent = message;
		statusEl.style.display = message ? 'block' : 'none';
	}

	updateNeutralValueWarning(show) {
		const warningEl = this.shadowRoot.getElementById('neutral-value-warning');
		if (warningEl) {
			warningEl.style.display = show ? 'inline-block' : 'none';
		}
	}

	// Black-Scholes Gamma calculation
	calculateGamma(S, K, T, r, sigma, optionType) {
		// S = spot price, K = strike, T = time to expiration (years), r = risk-free rate, sigma = IV
		if (T <= 0 || sigma <= 0 || S <= 0) return 0;

		const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
		const gamma = Math.exp(-0.5 * d1 * d1) / (S * sigma * Math.sqrt(T) * Math.sqrt(2 * Math.PI));

		return gamma;
	}

	// Calculate Gamma Exposure (GEX)
	calculateGEX(gamma, openInterest, spotPrice, contractMultiplier = 100) {
		// GEX ≈ Gamma × OI × Spot² × ContractMultiplier
		return gamma * openInterest * spotPrice * spotPrice * contractMultiplier;
	}

	async loadGammaHeatmapData() {
		if (!this.symbol) {
			console.warn('[Gamma Heatmap] No symbol available');
			return;
		}

		this.setStatus('Loading options chain...');
		try {
			console.log(`[Gamma Heatmap] Loading options for ${this.symbol}`);

			// Fetch options chain from Yahoo Finance (via proxy utility which tries backend first)
			const optionsUrl = `https://query1.finance.yahoo.com/v7/finance/options/${this.symbol}`;
			const { fetchWithProxy } = await import('../utils/proxy.js');
			const response = await fetchWithProxy(optionsUrl);

			console.log('[Gamma Heatmap] Options response structure:', {
				hasResponse: !!response,
				hasOptionChain: !!response?.optionChain,
				hasResult: !!response?.optionChain?.result,
				resultLength: response?.optionChain?.result?.length || 0,
				responseKeys: response ? Object.keys(response) : []
			});

			// Check for error in response
			if (response?.finance?.error) {
				const error = response.finance.error;
				console.error('[Gamma Heatmap] Yahoo Finance API error:', error);

				if (error.code === 'Unauthorized' || error.description?.includes('Invalid Crumb')) {
					throw new Error('Yahoo Finance API requires authentication. Please ensure the Node.js backend server is running on port 3000.');
				}
				throw new Error(`Yahoo Finance API error: ${error.description || error.code}`);
			}

			// Handle different response structures
			let optionChain;
			if (response?.optionChain?.result && response.optionChain.result.length > 0) {
				optionChain = response.optionChain.result[0];
			} else if (response?.result && response.result.length > 0) {
				optionChain = response.result[0];
			} else if (response?.optionChain) {
				optionChain = response.optionChain;
			} else if (response && !response.optionChain && !response.finance) {
				// Response might be the optionChain directly (only if no finance wrapper)
				optionChain = response;
			} else {
				console.error('[Gamma Heatmap] Invalid response structure:', JSON.stringify(response, null, 2).substring(0, 500));
				throw new Error('No options data available - invalid response structure. Please ensure the Node.js backend server is running.');
			}

			if (!optionChain) {
				console.error('[Gamma Heatmap] optionChain is null/undefined');
				throw new Error('No options data available');
			}

			console.log('[Gamma Heatmap] Parsed optionChain keys:', Object.keys(optionChain));
			console.log('[Gamma Heatmap] Full optionChain structure:', JSON.stringify(optionChain, null, 2).substring(0, 1000));

			// Try multiple ways to get spot price
			let spotPrice = optionChain.quote?.regularMarketPrice
				|| optionChain.quote?.currentPrice
				|| optionChain.quote?.price
				|| optionChain.regularMarketPrice
				|| optionChain.currentPrice
				|| optionChain.price;

			// Fallback: Use current price from chart data if available
			if (!spotPrice && this.chartData && this.chartData.length > 0) {
				spotPrice = this.chartData[this.chartData.length - 1].close;
				console.log(`[Gamma Heatmap] Using spot price from chart data: ${spotPrice}`);
			}

			const riskFreeRate = 0.05; // Approximate risk-free rate (5%)

			if (!spotPrice) {
				console.error('[Gamma Heatmap] Could not determine spot price. OptionChain structure:', {
					hasQuote: !!optionChain.quote,
					quoteKeys: optionChain.quote ? Object.keys(optionChain.quote) : [],
					optionChainKeys: Object.keys(optionChain),
					chartDataAvailable: !!this.chartData
				});
				throw new Error('Could not determine spot price');
			}

			console.log(`[Gamma Heatmap] Spot price: ${spotPrice}`);

			// Get current expiration dates
			const expirationDates = optionChain.expirationDates || optionChain.expirations || [];
			if (expirationDates.length === 0) {
				console.error('[Gamma Heatmap] No expiration dates. OptionChain structure:', Object.keys(optionChain));
				throw new Error('No expiration dates available');
			}

			// Use nearest expiration (0 DTE) or next expiration
			const targetExpiration = expirationDates[0];
			const expirationDate = new Date(targetExpiration * 1000);
			const now = new Date();
			const daysToExpiration = (expirationDate - now) / (1000 * 60 * 60 * 24);
			const timeToExpiration = Math.max(daysToExpiration / 365, 0.001); // Convert to years, minimum 0.001

			console.log(`[Gamma Heatmap] Target expiration: ${expirationDate.toISOString()}, DTE: ${daysToExpiration.toFixed(1)}`);

			// Fetch options for this expiration
			const optionsUrlWithExp = `https://query1.finance.yahoo.com/v7/finance/options/${this.symbol}?date=${targetExpiration}`;
			let optionsResponse;
			try {
				optionsResponse = await fetchWithProxy(optionsUrlWithExp);
			} catch (error) {
				console.warn('[Gamma Heatmap] Failed to fetch options for expiration, trying to use data from initial call');
				// If we can't fetch specific expiration, try to use data from the initial call
				optionsResponse = response;
			}

			// Handle different response structures
			let optionsData;
			if (optionsResponse?.optionChain?.result && optionsResponse.optionChain.result.length > 0) {
				optionsData = optionsResponse.optionChain.result[0];
			} else if (optionsResponse?.result && optionsResponse.result.length > 0) {
				optionsData = optionsResponse.result[0];
			} else if (optionsResponse?.optionChain) {
				optionsData = optionsResponse.optionChain;
			} else if (optionsResponse) {
				optionsData = optionsResponse;
			} else {
				throw new Error('No options data for expiration');
			}

			console.log('[Gamma Heatmap] Options data keys:', Object.keys(optionsData));

			// Extract calls and puts - handle different structures
			let calls = [];
			let puts = [];

			if (optionsData.options && optionsData.options[0]) {
				calls = optionsData.options[0].calls || [];
				puts = optionsData.options[0].puts || [];
			} else if (optionsData.calls && optionsData.puts) {
				calls = optionsData.calls;
				puts = optionsData.puts;
			} else if (Array.isArray(optionsData)) {
				// If optionsData is an array, try to find calls/puts
				for (const item of optionsData) {
					if (item.calls) calls = item.calls;
					if (item.puts) puts = item.puts;
					if (item.options && item.options[0]) {
						calls = item.options[0].calls || [];
						puts = item.options[0].puts || [];
					}
				}
			} else if (optionsData.result && optionsData.result[0]) {
				// Try nested result structure
				const nested = optionsData.result[0];
				if (nested.options && nested.options[0]) {
					calls = nested.options[0].calls || [];
					puts = nested.options[0].puts || [];
				} else if (nested.calls && nested.puts) {
					calls = nested.calls;
					puts = nested.puts;
				}
			}

			console.log(`[Gamma Heatmap] Found ${calls.length} calls and ${puts.length} puts`);

			if (calls.length === 0 && puts.length === 0) {
				console.error('[Gamma Heatmap] No calls or puts found. OptionsData structure:', {
					keys: Object.keys(optionsData),
					hasOptions: !!optionsData.options,
					hasCalls: !!optionsData.calls,
					hasPuts: !!optionsData.puts,
					isArray: Array.isArray(optionsData),
					sample: JSON.stringify(optionsData, null, 2).substring(0, 500)
				});
				throw new Error('No calls or puts data found in options response');
			}

			// Process options and calculate GEX
			const gammaData = [];
			let maxCallGEX = 0;
			let maxPutGEX = 0;
			let callWallStrike = null;
			let putWallStrike = null;

			// Process calls
			for (const call of calls) {
				if (!call.strike || !call.openInterest || !call.impliedVolatility) continue;

				const strike = call.strike;
				const openInterest = call.openInterest;
				const iv = call.impliedVolatility / 100; // Convert percentage to decimal

				const gamma = this.calculateGamma(spotPrice, strike, timeToExpiration, riskFreeRate, iv, 'call');
				const gex = this.calculateGEX(gamma, openInterest, spotPrice);

				gammaData.push({
					strike: strike,
					gex: gex,
					type: 'call',
					openInterest: openInterest
				});

				if (gex > maxCallGEX) {
					maxCallGEX = gex;
					callWallStrike = strike;
				}
			}

			// Process puts (GEX is negative for puts)
			for (const put of puts) {
				if (!put.strike || !put.openInterest || !put.impliedVolatility) continue;

				const strike = put.strike;
				const openInterest = put.openInterest;
				const iv = put.impliedVolatility / 100; // Convert percentage to decimal

				const gamma = this.calculateGamma(spotPrice, strike, timeToExpiration, riskFreeRate, iv, 'put');
				const gex = -this.calculateGEX(gamma, openInterest, spotPrice); // Negative for puts

				gammaData.push({
					strike: strike,
					gex: gex,
					type: 'put',
					openInterest: openInterest
				});

				if (Math.abs(gex) > Math.abs(maxPutGEX)) {
					maxPutGEX = gex;
					putWallStrike = strike;
				}
			}

			if (gammaData.length === 0) {
				throw new Error('No valid options data found');
			}

			this.gammaData = {
				data: gammaData,
				spotPrice: spotPrice,
				callWall: callWallStrike,
				putWall: putWallStrike,
				expirationDate: expirationDate,
				daysToExpiration: daysToExpiration
			};

			this.setStatus('');
			console.log(`[Gamma Heatmap] Loaded ${gammaData.length} strikes, Call Wall: ${callWallStrike}, Put Wall: ${putWallStrike}`);
			console.log('[Gamma Heatmap] Gamma data:', this.gammaData);

			// Update chart to show heatmap
			this.updateChart();
		} catch (error) {
			console.error('[Gamma Heatmap] Error loading data:', error);

			let errorMessage = error.message;
			if (errorMessage.includes('authentication') || errorMessage.includes('Crumb') || errorMessage.includes('backend')) {
				errorMessage = 'Options data requires the Node.js backend server. Please start it on port 3000.';
			} else if (errorMessage.includes('not available')) {
				errorMessage = `Options may not be available for ${this.symbol}. Try a major stock like AAPL, MSFT, or TSLA.`;
			}

			this.setStatus(`Error loading options data: ${errorMessage}`);
			this.gammaData = null;
		}
	}

	loadWatchlist() {
		try {
			const stored = localStorage.getItem('watchlist');
			return stored ? JSON.parse(stored) : [];
		} catch (e) {
			return [];
		}
	}

	saveWatchlist(watchlist) {
		localStorage.setItem('watchlist', JSON.stringify(watchlist));
	}

	setupWatchlistButton() {
		const watchlistBtn = this.shadowRoot.getElementById('watchlist-btn');
		if (!watchlistBtn) return;

		watchlistBtn.addEventListener('click', () => {
			if (!this.symbol) return;

			const watchlist = this.loadWatchlist();
			const isInWatchlist = watchlist.includes(this.symbol);

			if (isInWatchlist) {
				// Remove from watchlist
				const newWatchlist = watchlist.filter(s => s !== this.symbol);
				this.saveWatchlist(newWatchlist);
				this.updateWatchlistButton(false);
			} else {
				// Add to watchlist
				watchlist.push(this.symbol);
				this.saveWatchlist(watchlist);
				this.updateWatchlistButton(true);
			}
		});
	}

	updateWatchlistButton(isAdded) {
		const watchlistBtn = this.shadowRoot.getElementById('watchlist-btn');
		const watchlistIcon = this.shadowRoot.getElementById('watchlist-icon');
		const watchlistText = this.shadowRoot.getElementById('watchlist-text');

		if (!watchlistBtn || !watchlistIcon || !watchlistText) return;

		if (isAdded) {
			watchlistBtn.classList.add('added');
			watchlistIcon.textContent = '✓';
			watchlistText.textContent = 'Added to watchlist';
		} else {
			watchlistBtn.classList.remove('added');
			watchlistIcon.textContent = '+';
			watchlistText.textContent = 'Add to watchlist';
		}
	}

	checkWatchlistStatus() {
		if (!this.symbol) {
			const watchlistBtn = this.shadowRoot.getElementById('watchlist-btn');
			if (watchlistBtn) {
				watchlistBtn.style.display = 'none';
			}
			return;
		}

		const watchlist = this.loadWatchlist();
		const isInWatchlist = watchlist.includes(this.symbol);

		const watchlistBtn = this.shadowRoot.getElementById('watchlist-btn');
		if (watchlistBtn) {
			watchlistBtn.style.display = 'flex';
			this.updateWatchlistButton(isInWatchlist);
		}

		// Show AI Summary button
		const aiSummaryBtn = this.shadowRoot.getElementById('ai-summary-btn');
		if (aiSummaryBtn) {
			aiSummaryBtn.style.display = 'flex';
		}
	}

	setupAISummaryButton() {
		const aiSummaryBtn = this.shadowRoot.getElementById('ai-summary-btn');
		if (!aiSummaryBtn) {
			console.warn('[AI Summary] Button not found in DOM');
			return;
		}

		// Remove any existing event listeners by cloning
		const newBtn = aiSummaryBtn.cloneNode(true);
		aiSummaryBtn.parentNode.replaceChild(newBtn, aiSummaryBtn);

		newBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			console.log('[AI Summary] Button clicked, symbol:', this.symbol);
			if (!this.symbol) {
				console.warn('[AI Summary] No symbol available');
				return;
			}
			this.openAISummaryModal();
		});

		// Show button when symbol is available
		if (this.symbol) {
			newBtn.style.display = 'flex';
			console.log('[AI Summary] Button displayed for symbol:', this.symbol);
		}
	}

	async openAISummaryModal() {
		if (!this.symbol) {
			console.warn('[AI Summary] No symbol available');
			return;
		}

		console.log('[AI Summary] Opening modal for symbol:', this.symbol);

		const overlay = this.shadowRoot.getElementById('ai-summary-modal-overlay');
		const content = this.shadowRoot.getElementById('ai-summary-modal-content');
		const closeBtn = this.shadowRoot.getElementById('ai-summary-modal-close');
		const aiSummaryBtn = this.shadowRoot.getElementById('ai-summary-btn');

		if (!overlay || !content || !closeBtn) {
			console.error('[AI Summary] Modal elements not found', {
				overlay: !!overlay,
				content: !!content,
				closeBtn: !!closeBtn
			});
			return;
		}

		// Show modal
		overlay.classList.add('show');
		content.innerHTML = '<div class="ai-summary-loading">Generating AI summary...</div>';

		// Disable button
		if (aiSummaryBtn) {
			aiSummaryBtn.disabled = true;
		}

		// Close button handler
		const closeModal = () => {
			overlay.classList.remove('show');
			if (aiSummaryBtn) {
				aiSummaryBtn.disabled = false;
			}
		};

		closeBtn.onclick = closeModal;
		overlay.onclick = (e) => {
			if (e.target === overlay) {
				closeModal();
			}
		};

		// Check cache first
		const { getCachedData, setCachedData } = await import('../utils/cache.js');
		const cachedSummary = getCachedData(this.symbol, 'ai-summary');

		if (cachedSummary) {
			console.log('[AI Summary] Using cached summary');
			this.displayAISummary(cachedSummary, true);
			if (aiSummaryBtn) {
				aiSummaryBtn.disabled = false;
			}
			return;
		}

		// Generate AI summary using Gemini API (direct call, same as SWOT analysis)
		try {
			// Call backend API for AI summary - API key is read from .env on server
			const response = await fetch(`/api/ai-summary/${this.symbol}`);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.detail || `API error: ${response.status}`);
			}

			const data = await response.json();
			const summary = data.summary;

			// Cache the summary
			setCachedData(this.symbol, 'ai-summary', summary);

			// Display the summary
			this.displayAISummary(summary, false);
		} catch (error) {
			console.error('[AI Summary] Error:', error);
			const errorMessage = error.message || 'Unknown error';
			// Always show user-friendly message
			const userFriendlyMessage = 'Too many users are currently using this feature. Please try again later.';
			content.innerHTML = `<div class="ai-summary-error">${userFriendlyMessage}</div>`;
			// Re-enable button immediately after error
			if (aiSummaryBtn) {
				aiSummaryBtn.disabled = false;
			}
		} finally {
			// Ensure button is always enabled after operation completes
			if (aiSummaryBtn) {
				aiSummaryBtn.disabled = false;
			}
		}
	}

	async fetchCompanyInfoForSummary() {
		try {
			const response = await fetch(`${API_BASE_URL}/api/fundamentals/${this.symbol}`);
			if (!response.ok) {
				throw new Error(`Failed to fetch company info: ${response.status}`);
			}
			const data = await response.json();

			const quoteSummary = data?.quoteSummary?.result?.[0] || {};
			const profile = quoteSummary.summaryProfile || {};
			const stats = quoteSummary.defaultKeyStatistics || {};
			const financial = quoteSummary.financialData || {};

			return {
				name: profile.longName || profile.name || this.symbol,
				sector: profile.sector || 'N/A',
				industry: profile.industry || 'N/A',
				marketCap: stats.marketCap?.raw || null,
				currentPrice: financial.currentPrice?.raw || null,
				description: profile.longBusinessSummary || profile.description || null,
				peRatio: stats.trailingPE?.raw || null,
				profitMargin: financial.profitMargins?.raw || null,
				revenueGrowth: financial.revenueGrowth?.raw || null,
				earningsGrowth: financial.earningsGrowth?.raw || null
			};
		} catch (error) {
			console.warn('[AI Summary] Could not fetch company info:', error);
			return {
				name: this.symbol,
				sector: 'N/A',
				industry: 'N/A',
				marketCap: null,
				currentPrice: null,
				description: null,
				peRatio: null,
				profitMargin: null,
				revenueGrowth: null,
				earningsGrowth: null
			};
		}
	}

	displayAISummary(summary, fromCache) {
		const content = this.shadowRoot.getElementById('ai-summary-modal-content');
		if (!content) return;

		// Format and display the summary with proper heading formatting
		let formattedSummary = summary;

		// Convert numbered emoji headings (1️⃣, 2️⃣, etc.) to h2 headings FIRST (before other markdown)
		formattedSummary = formattedSummary.replace(/^(\d+️⃣)\s+(.*)$/gim, '<h2>$2</h2>');

		// Convert Markdown headings (process in order from most specific to least)
		formattedSummary = formattedSummary.replace(/^### (.*)$/gim, '<h3>$1</h3>');
		formattedSummary = formattedSummary.replace(/^## (.*)$/gim, '<h2>$1</h2>');
		formattedSummary = formattedSummary.replace(/^# (.*)$/gim, '<h1>$1</h1>');

		// Convert bold text (**text**) to <strong>
		formattedSummary = formattedSummary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

		// Convert bullet points (- or *) to proper list items
		// Only convert lines that start with - or * and are not already HTML
		formattedSummary = formattedSummary.replace(/^(?![<])([-*])\s+(.*)$/gim, '<li>$2</li>');

		// Wrap consecutive list items in <ul> tags
		formattedSummary = formattedSummary.replace(/(<li>.*?<\/li>(\n|$))+/g, (match) => {
			return '<ul>' + match.replace(/\n/g, '') + '</ul>';
		});

		// Split into lines and process
		const lines = formattedSummary.split('\n');
		let html = '';
		let currentParagraph = '';

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			if (!line) {
				// Empty line - close current paragraph if exists
				if (currentParagraph) {
					html += '<p>' + currentParagraph + '</p>';
					currentParagraph = '';
				}
				continue;
			}

			// If line is already HTML (heading, list, etc.), add it directly
			if (line.startsWith('<h') || line.startsWith('<ul>') || line.startsWith('</ul>') || line.startsWith('<li>')) {
				if (currentParagraph) {
					html += '<p>' + currentParagraph + '</p>';
					currentParagraph = '';
				}
				html += line + '\n';
			} else {
				// Regular text - add to current paragraph
				if (currentParagraph) {
					currentParagraph += '<br>' + line;
				} else {
					currentParagraph = line;
				}
			}
		}

		// Add any remaining paragraph
		if (currentParagraph) {
			html += '<p>' + currentParagraph + '</p>';
		}

		// Add cache information at the top
		const cacheInfo = fromCache
			? '<div class="ai-summary-cache-info">📦 This summary is cached and will be valid for 4 hours.</div>'
			: '<div class="ai-summary-cache-info">💾 This summary will be cached for 4 hours.</div>';

		content.innerHTML = cacheInfo + html;
	}
}

customElements.define('stock-chart', StockChart);


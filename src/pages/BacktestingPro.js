import { API_BASE_URL } from '../config.js';

export class BacktestingPro extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.symbol = '';
		this.buyHoldSymbol = ''; // Buy-and-Hold comparison stock
		this.priceData = [];
		this.buyHoldPriceData = []; // Price data for Buy-and-Hold comparison
		this.results = null;
		this.strategyDescription = ''; // Free text strategy description
		this.parsedStrategy = null; // Parsed strategy from Gemini (if used)
		this.overallStopLoss = 1.0; // 100% = no overall stop loss
		this.perTradeStopLoss = 1.0; // 100% = no per trade stop loss
		this.overallTakeProfit = 1.0; // 100% = no overall take profit
		this.perTradeTakeProfit = 1.0; // 100% = no per trade take profit
		this.maxHoldingPeriod = null; // null = no maximum holding period
		this.allowShort = false; // Default: short trades disabled
		this.initialCapital = 10000;
		this.commission = 0.001; // 0.1% commission
		this.timeRange = '5y'; // Default time range
		
		// Rate limiting for API calls
		this.apiCallHistory = [];
		this.maxApiCallsPerMinute = 20; // Limit to 20 API calls per minute
		this.maxApiCallsPerHour = 100; // Limit to 100 API calls per hour
		
		// Example strategy descriptions - showing variety and flexibility
		this.exampleStrategies = [
			"Buy when stock falls over 9% in one day and sell it 2 days after.",
			"Buy when stock falls over 2%",
			"Buy when RSI falls below 30 and sell when RSI rises above 70.",
			"Buy when RSI is below 25",
			"Buy when the 50-day moving average crosses above the 200-day moving average.",
			"Buy when price drops below the lower Bollinger Band and sell when it reaches the upper band.",
			"Buy when price breaks below Bollinger lower band",
			"Buy when MACD line crosses above the signal line and sell when it crosses below.",
			"Buy when MACD crosses above signal",
			"Buy when stock price increases by 5% over 3 days and sell after 1 week.",
			"Buy when price rises 3% in 5 days",
			"Buy when momentum is strong (price up 10% in 10 days) and sell when momentum weakens.",
			"Buy when price falls 8% in one day, hold for 3 days, then sell.",
			"Buy when price increases by 10% over 7 days",
			"Buy when the fast moving average (20 days) crosses above the slow moving average (50 days).",
			"Buy when 20-day MA crosses above 50-day MA",
			"Buy when stock drops 5% in one day",
			"Buy when price decreases by 3% over 2 days",
			"Buy when RSI is oversold (below 30)",
			"Buy when volume is above average and price increases",
			"Buy when price is above 200-day moving average",
			"Buy when stock falls below support level of $100",
			"Buy when price breaks resistance at $150",
			"Buy when stochastic is below 20",
			"Buy when Williams %R is below -80",
			"Buy when stock falls over 2% and RSI is below 30",
			"Buy when stock falls over 2% and RSI is below 100",
			"Buy when price drops 3% and volume is above average",
			"Buy when RSI is below 25 and price is above 50-day MA",
			"Buy when MACD crosses above signal and price increases by 2%",
			"Buy when stock falls over 5% and Bollinger Band is at lower level"
		];
		this.currentExampleIndex = Math.floor(Math.random() * this.exampleStrategies.length);
		this.hasUserTyped = false;
	}
	
	connectedCallback() {
		this.render();
		this.setupEventListeners();
		this.setupTheme();
		this.setupExampleStrategy();
	}
	
	setupExampleStrategy() {
		const examplesList = this.shadowRoot.getElementById('strategy-examples-list');
		if (examplesList) {
			examplesList.innerHTML = '';
			this.exampleStrategies.forEach((example, index) => {
				const exampleItem = document.createElement('div');
				exampleItem.className = 'example-strategy-item';
				exampleItem.textContent = example;
				exampleItem.addEventListener('click', () => {
					const textarea = this.shadowRoot.getElementById('strategy-description-input');
					if (textarea) {
						textarea.value = example;
						this.strategyDescription = example;
						this.hasUserTyped = true;
						textarea.focus();
						// Trigger parse
						this.parseStrategyDescription();
					}
				});
				examplesList.appendChild(exampleItem);
			});
		}
	}
	
	render() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					background: #0b0f14;
					min-height: 100vh;
					padding: 20px;
					max-width: 1600px;
					margin: 0 auto;
				}
				:host(.light-mode) {
					background: #c8d0da;
					--bg-primary: #c8d0da;
					--bg-secondary: #d5dce5;
					--bg-tertiary: #b8c2ce;
					--bg-card: #c0c9d4;
					--border-color: #a0aab8;
					--text-primary: #0a0a0a;
					--text-secondary: #1a1a1a;
					--text-muted: #2a2a2a;
					--accent-blue: #1d4ed8;
				}
				
				/* Theme Switch */
				.theme-switch {
					display: flex;
					align-items: center;
					gap: 10px;
					background: #1f2a37;
					padding: 6px 12px;
					border-radius: 20px;
					border: 1px solid #2d3748;
				}
				:host(.light-mode) .theme-switch {
					background: var(--bg-tertiary);
					border-color: var(--border-color);
				}
				.theme-switch-label {
					font-size: 0.7rem;
					color: #6b7a8a;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}
				:host(.light-mode) .theme-switch-label {
					color: var(--text-muted);
				}
				.theme-switch-track {
					width: 44px;
					height: 24px;
					background: #121821;
					border-radius: 12px;
					position: relative;
					cursor: pointer;
					border: 1px solid #1f2a37;
					transition: background 0.3s ease;
				}
				:host(.light-mode) .theme-switch-track {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.theme-switch-thumb {
					width: 18px;
					height: 18px;
					background: #4ea1f3;
					border-radius: 50%;
					position: absolute;
					top: 2px;
					left: 2px;
					transition: transform 0.3s ease;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 10px;
				}
				.theme-switch-track.light .theme-switch-thumb {
					transform: translateX(20px);
					background: #f59e0b;
				}
				.theme-icon {
					font-size: 11px;
				}
				
				.header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 30px;
				}
				h1 {
					color: #e6edf3;
					margin: 0;
					font-size: 2rem;
				}
				:host(.light-mode) h1 {
					color: var(--text-primary);
				}
				.back-btn {
					background: #233044;
					border: 1px solid #1f2a37;
					color: #e6edf3;
					padding: 10px 20px;
					border-radius: 8px;
					cursor: pointer;
					font-size: 0.95rem;
					transition: background 0.2s;
				}
				:host(.light-mode) .back-btn {
					background: var(--bg-tertiary);
					color: var(--text-primary);
					border-color: var(--border-color);
				}
				.back-btn:hover {
					background: #1f2a37;
				}
				:host(.light-mode) .back-btn:hover {
					background: var(--bg-secondary);
				}
				
				.setup-section {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 25px;
					margin-bottom: 25px;
				}
				:host(.light-mode) .setup-section {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.section-title {
					color: #4ea1f3;
					font-size: 1.3rem;
					font-weight: 600;
					margin-bottom: 20px;
				}
				:host(.light-mode) .section-title {
					color: var(--accent-blue);
				}
			.setup-grid {
				display: grid;
				grid-template-columns: repeat(3, 1fr);
				gap: 15px;
				margin-bottom: 20px;
			}
			@media (max-width: 1200px) {
				.setup-grid {
					grid-template-columns: repeat(2, 1fr);
				}
			}
			@media (max-width: 768px) {
				.setup-grid {
					grid-template-columns: 1fr;
				}
			}
			.input-group {
				display: flex;
				flex-direction: column;
				gap: 8px;
				align-items: flex-start;
			}
				.input-label {
					color: #9fb0c0;
					font-size: 0.9rem;
					font-weight: 500;
				}
				:host(.light-mode) .input-label {
					color: var(--text-secondary);
				}
			.input-field {
				background: #0b0f14;
				border: 1px solid #1f2a37;
				color: #e6edf3;
				padding: 10px 14px;
				border-radius: 8px;
				font-size: 0.95rem;
				box-sizing: border-box;
				min-width: 0;
			}
			.input-group > .input-field {
				width: 100%;
			}
				:host(.light-mode) .input-field {
					background: var(--bg-primary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
			.input-field:focus {
				outline: none;
				border-color: #4ea1f3;
			}
			:host(.light-mode) .input-field:focus {
				border-color: var(--accent-blue);
			}
			
			/* Autocomplete Dropdown */
			.autocomplete-dropdown {
				position: absolute;
				top: 100%;
				left: 0;
				min-width: 450px;
				width: max-content;
				max-width: 600px;
				background: #121821;
				border: 1px solid #1f2a37;
				border-radius: 0 0 8px 8px;
				max-height: 300px;
				overflow-y: auto;
				z-index: 1000;
				display: none;
				box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
				margin-top: 2px;
			}
			:host(.light-mode) .autocomplete-dropdown {
				background: var(--bg-secondary);
				border-color: var(--border-color);
			}
			.autocomplete-dropdown.show {
				display: block;
			}
			.autocomplete-item {
				padding: 10px 14px;
				cursor: pointer;
				display: flex;
				align-items: center;
				gap: 12px;
				border-bottom: 1px solid #1f2a37;
				transition: background 0.15s;
			}
			.autocomplete-item:last-child {
				border-bottom: none;
			}
			.autocomplete-item:hover,
			.autocomplete-item.selected {
				background: #1f2a37;
			}
			:host(.light-mode) .autocomplete-item {
				border-bottom-color: var(--border-color);
			}
			:host(.light-mode) .autocomplete-item:hover,
			:host(.light-mode) .autocomplete-item.selected {
				background: var(--bg-tertiary);
			}
			.autocomplete-symbol {
				font-weight: 700;
				color: #4ea1f3;
				min-width: 60px;
				font-size: 0.9rem;
				flex-shrink: 0;
			}
			:host(.light-mode) .autocomplete-symbol {
				color: var(--accent-blue);
			}
			.autocomplete-name {
				color: #e6edf3;
				flex: 1;
				font-size: 0.85rem;
				white-space: normal;
				overflow: visible;
				word-wrap: break-word;
			}
			:host(.light-mode) .autocomplete-name {
				color: var(--text-primary);
			}
			.autocomplete-type {
				color: #6b7a8a;
				font-size: 0.65rem;
				padding: 2px 6px;
				background: #0b0f14;
				border-radius: 4px;
				flex-shrink: 0;
				white-space: nowrap;
			}
			:host(.light-mode) .autocomplete-type {
				color: var(--text-muted);
				background: var(--bg-primary);
			}
			.autocomplete-loading,
			.autocomplete-empty {
				padding: 12px;
				color: #9fb0c0;
				text-align: center;
				font-size: 0.85rem;
			}
			:host(.light-mode) .autocomplete-loading,
			:host(.light-mode) .autocomplete-empty {
				color: var(--text-secondary);
			}
			
			.strategy-select {
				background: #0b0f14;
				border: 1px solid #1f2a37;
				color: #e6edf3;
				padding: 10px 14px;
				border-radius: 8px;
				font-size: 0.95rem;
				cursor: pointer;
				width: 100%;
				box-sizing: border-box;
				min-width: 0;
			}
				:host(.light-mode) .strategy-select {
					background: var(--bg-primary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
				.strategy-select:focus {
					outline: none;
					border-color: #4ea1f3;
				}
			.param-grid {
				display: grid;
				grid-template-columns: repeat(3, 1fr);
				gap: 15px;
				margin-top: 15px;
			}
			@media (max-width: 1200px) {
				.param-grid {
					grid-template-columns: repeat(2, 1fr);
				}
			}
			@media (max-width: 768px) {
				.param-grid {
					grid-template-columns: 1fr;
				}
			}
				.run-btn {
					background: linear-gradient(135deg, #4ea1f3 0%, #3b82f6 100%);
					color: #0b0f14;
					border: none;
					padding: 12px 30px;
					border-radius: 8px;
					font-size: 1rem;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s;
					box-shadow: 0 4px 12px rgba(78, 161, 243, 0.3);
				}
				.run-btn:hover {
					transform: translateY(-2px);
					box-shadow: 0 6px 20px rgba(78, 161, 243, 0.4);
				}
				.run-btn:disabled {
					opacity: 0.5;
					cursor: not-allowed;
					transform: none;
				}
				
				.results-section {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 25px;
					margin-bottom: 25px;
				}
				:host(.light-mode) .results-section {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.metrics-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
					gap: 15px;
					margin-bottom: 25px;
				}
				.metric-card {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 15px;
					text-align: center;
				}
				:host(.light-mode) .metric-card {
					background: var(--bg-card);
					border-color: var(--border-color);
				}
				.metric-label {
					color: #9fb0c0;
					font-size: 0.85rem;
					margin-bottom: 8px;
				}
				:host(.light-mode) .metric-label {
					color: var(--text-secondary);
				}
				.metric-value {
					color: #e6edf3;
					font-size: 1.5rem;
					font-weight: 700;
				}
				:host(.light-mode) .metric-value {
					color: var(--text-primary);
				}
				.metric-value.positive {
					color: #10b981;
				}
				.metric-value.negative {
					color: #ef4444;
				}
				:host(.light-mode) .metric-value.positive {
					color: #059669;
				}
				:host(.light-mode) .metric-value.negative {
					color: #dc2626;
				}
				
				.chart-container {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 15px;
					margin-bottom: 20px;
					height: 400px;
					position: relative;
				}
				:host(.light-mode) .chart-container {
					background: var(--bg-primary);
					border-color: var(--border-color);
				}
				
				.trades-table {
					width: 100%;
					border-collapse: collapse;
					margin-top: 20px;
				}
				.trades-table th {
					background: #1f2a37;
					color: #e6edf3;
					padding: 12px;
					text-align: left;
					font-size: 0.85rem;
					font-weight: 600;
					border-bottom: 2px solid #2d3748;
				}
				:host(.light-mode) .trades-table th {
					background: var(--bg-tertiary);
					color: var(--text-primary);
					border-bottom-color: var(--border-color);
				}
				.trades-table td {
					padding: 10px 12px;
					border-bottom: 1px solid #1f2a37;
					color: #e6edf3;
					font-size: 0.9rem;
				}
				:host(.light-mode) .trades-table td {
					border-bottom-color: var(--border-color);
					color: var(--text-primary);
				}
				.trades-table tr:hover {
					background: rgba(78, 161, 243, 0.1);
				}
				.profit {
					color: #10b981;
					font-weight: 600;
				}
				.loss {
					color: #ef4444;
					font-weight: 600;
				}
				:host(.light-mode) .profit {
					color: #059669;
				}
				:host(.light-mode) .loss {
					color: #dc2626;
				}
				
				.loading {
					text-align: center;
					color: #9fb0c0;
					padding: 40px;
					font-size: 1.1rem;
				}
				:host(.light-mode) .loading {
					color: var(--text-secondary);
				}
				.error {
					text-align: center;
					color: #ef4444;
					padding: 20px;
					background: rgba(239, 68, 68, 0.1);
					border-radius: 8px;
					border: 1px solid #ef4444;
				}
				:host(.light-mode) .error {
					background: rgba(220, 38, 38, 0.1);
					border-color: #dc2626;
				}
				
				.info-text {
					color: #9fb0c0;
					font-size: 0.85rem;
					margin-top: 5px;
				}
				:host(.light-mode) .info-text {
					color: var(--text-muted);
				}
				
				/* Info Icon Styles */
			.info-icon-wrapper {
				display: flex;
				align-items: center;
				gap: 8px;
				width: 100%;
			}
			.info-icon-wrapper .input-field {
				flex: 1;
				min-width: 0;
			}
				.info-icon {
					width: 18px;
					height: 18px;
					border-radius: 50%;
					background: #4ea1f3;
					color: #0b0f14;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 12px;
					font-weight: 700;
					cursor: help;
					position: relative;
					flex-shrink: 0;
					transition: background 0.2s;
				}
				:host(.light-mode) .info-icon {
					background: var(--accent-blue);
					color: #ffffff;
				}
				.info-icon:hover {
					background: #3b82f6;
				}
				.info-tooltip {
					position: absolute;
					bottom: calc(100% + 10px);
					left: 50%;
					transform: translateX(-50%);
					background: #121821;
					color: #e6edf3;
					padding: 16px 20px;
					border-radius: 8px;
					font-size: 0.95rem;
					line-height: 1.6;
					white-space: nowrap;
					opacity: 0;
					pointer-events: none;
					transition: opacity 0.2s;
					z-index: 1000;
					border: 1px solid #1f2a37;
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
					max-width: 450px;
					width: max-content;
					white-space: normal;
				}
				.strategy-tips-tooltip {
					max-width: 600px;
					width: 600px;
					white-space: normal;
					left: 0;
					transform: translateX(0);
					padding: 20px 24px;
				}
				.strategy-tips-tooltip::after {
					left: 20px;
					transform: translateX(0);
				}
				:host(.light-mode) .strategy-tips-tooltip {
					background: var(--bg-secondary);
					color: var(--text-primary);
					border-color: var(--border-color);
				}
				.examples-container {
					margin-top: 15px;
				}
				:host(.light-mode) .examples-container > div:first-child {
					color: var(--text-muted);
				}
				.examples-list {
					display: flex;
					flex-direction: column;
					gap: 8px;
				}
				.example-strategy-item {
					background: #1f2a37;
					border: 1px solid #2d3748;
					border-radius: 6px;
					padding: 12px 14px;
					cursor: pointer;
					transition: all 0.2s;
					color: #e6edf3;
					font-size: 0.9rem;
					line-height: 1.5;
				}
				.example-strategy-item:hover {
					background: #2d3748;
					border-color: #4ea1f3;
					transform: translateX(4px);
				}
				:host(.light-mode) .example-strategy-item {
					background: var(--bg-tertiary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
				:host(.light-mode) .example-strategy-item:hover {
					background: var(--bg-card);
					border-color: var(--accent-blue);
				}
				:host(.light-mode) .info-tooltip {
					background: var(--bg-secondary);
					color: var(--text-primary);
					border-color: var(--border-color);
				}
				.info-icon:hover .info-tooltip {
					opacity: 1;
					pointer-events: auto;
				}
				.info-tooltip::after {
					content: '';
					position: absolute;
					top: 100%;
					left: 50%;
					transform: translateX(-50%);
					border: 6px solid transparent;
					border-top-color: #121821;
				}
				:host(.light-mode) .info-tooltip::after {
					border-top-color: var(--bg-secondary);
				}
				
				/* Checkbox Styles */
				.checkbox-group {
					display: flex;
					align-items: center;
					gap: 10px;
					padding: 10px 0;
				}
				.checkbox-wrapper {
					display: flex;
					align-items: center;
					gap: 8px;
				}
				.checkbox-input {
					width: 20px;
					height: 20px;
					cursor: pointer;
					accent-color: #4ea1f3;
				}
				.checkbox-label {
					color: #9fb0c0;
					font-size: 0.9rem;
					font-weight: 500;
					cursor: pointer;
				}
			:host(.light-mode) .checkbox-label {
				color: var(--text-secondary);
			}
			
			/* ========== DISCLAIMER FOOTER ========== */
			.disclaimer-footer {
				margin-top: 40px;
				padding: 20px;
				text-align: center;
				color: #6b7280;
				font-size: 0.7rem;
				line-height: 1.6;
				border-top: 1px solid #1f2a37;
				display: flex;
				align-items: center;
				justify-content: center;
				min-height: 80px;
			}
			:host(.light-mode) .disclaimer-footer {
				color: #4b5563;
				border-top-color: var(--border-color);
			}
			.disclaimer-footer a {
				color: #4ea1f3;
				text-decoration: none;
				margin-left: 4px;
			}
			.disclaimer-footer a:hover {
				text-decoration: underline;
			}
			:host(.light-mode) .disclaimer-footer a {
				color: var(--accent-blue);
			}
		</style>
			
			<div class="header">
				<h1>🚀 Backtesting Engine Pro</h1>
				<div style="display: flex; gap: 15px; align-items: center;">
					<div class="theme-switch">
						<span class="theme-switch-label">Theme</span>
						<div class="theme-switch-track" id="theme-toggle">
							<div class="theme-switch-thumb">
								<span class="theme-icon">🌙</span>
							</div>
						</div>
					</div>
					<button class="back-btn" id="back-btn">← Back</button>
				</div>
			</div>
			
			<div class="setup-section">
				<div class="section-title">Strategy Configuration</div>
				<div class="setup-grid">
					<div class="input-group">
						<label class="input-label">Stock Symbol</label>
						<div style="position: relative;">
							<input type="text" class="input-field" id="symbol-input" placeholder="e.g., AAPL or Apple" maxlength="10" autocomplete="off" />
							<div class="autocomplete-dropdown" id="symbol-autocomplete-dropdown"></div>
						</div>
					</div>
					<div class="input-group">
						<label class="input-label">Buy-and-Hold Comparison Stock</label>
						<div style="position: relative;">
							<input type="text" class="input-field" id="buyhold-symbol-input" placeholder="e.g., SPY or S&P 500" maxlength="10" autocomplete="off" />
							<div class="autocomplete-dropdown" id="buyhold-autocomplete-dropdown"></div>
						</div>
					</div>
					<div class="input-group">
						<label class="input-label">Time Range</label>
						<select class="strategy-select" id="time-range-select">
							<option value="1y">1 Year</option>
							<option value="2y">2 Years</option>
							<option value="5y" selected>5 Years</option>
							<option value="10y">10 Years</option>
							<option value="max">Maximum</option>
						</select>
					</div>
					<div class="input-group" style="grid-column: 1 / -1;">
						<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
							<label class="input-label" style="margin: 0;">Strategy Description (Free Text)</label>
							<div class="info-icon" id="strategy-description-info" style="position: relative;">
								<span style="font-size: 11px;">i</span>
								<div class="info-tooltip strategy-tips-tooltip">
									<div style="font-weight: 600; margin-bottom: 12px; color: #4ea1f3; font-size: 1rem;">Tips for Writing Strategy Descriptions:</div>
									<ul style="margin: 0; padding-left: 24px; list-style: disc; font-size: 0.95rem; line-height: 1.8;">
										<li style="margin-bottom: 10px;">Be specific about entry conditions (e.g., "when RSI falls below 30")</li>
										<li style="margin-bottom: 10px;">Clearly state exit conditions (e.g., "sell when RSI rises above 70")</li>
										<li style="margin-bottom: 10px;">Include time periods when relevant (e.g., "in one day", "after 2 days")</li>
										<li style="margin-bottom: 10px;">Use percentages for price changes (e.g., "falls over 9%")</li>
										<li style="margin-bottom: 10px;">Mention indicators by name (RSI, MACD, Moving Average, Bollinger Bands)</li>
										<li style="margin-bottom: 10px;">Specify holding periods (e.g., "sell it 2 days after")</li>
										<li>Use natural language - the system will parse your description automatically</li>
									</ul>
								</div>
							</div>
						</div>
						<textarea class="input-field" id="strategy-description-input" placeholder="" rows="4" style="resize: vertical; min-height: 100px;"></textarea>
						<div class="examples-container" style="margin-top: 15px;">
							<div style="color: #9fb0c0; font-size: 0.9rem; margin-bottom: 10px; font-weight: 500;">
								📋 Example Strategies (click to use):
							</div>
							<div id="strategy-examples-list" class="examples-list"></div>
						</div>
					</div>
					<div class="input-group">
						<label class="input-label">Initial Capital ($)</label>
						<div class="info-icon-wrapper">
							<input type="number" class="input-field" id="initial-capital" value="10000" min="1000" step="1000" />
							<div class="info-icon" title="Starting capital for the backtest">
								<span style="font-size: 11px;">i</span>
								<div class="info-tooltip">Starting capital for the backtest. This is the initial amount of money available for trading.</div>
							</div>
						</div>
					</div>
					<div class="input-group">
						<label class="input-label">Commission (%)</label>
						<div class="info-icon-wrapper">
							<input type="number" class="input-field" id="commission" value="0.1" min="0" max="1" step="0.01" />
							<div class="info-icon" title="Commission rate charged per trade (e.g., 0.1% = $0.10 per $100 trade)">
								<span style="font-size: 11px;">i</span>
								<div class="info-tooltip">Commission rate charged per trade (e.g., 0.1% = $0.10 per $100 trade)</div>
							</div>
						</div>
					</div>
					<div class="input-group">
						<label class="input-label">Overall Stop Loss (%)</label>
						<div class="info-icon-wrapper">
							<input type="number" class="input-field" id="overall-stop-loss" value="100" min="0" max="100" step="1" />
							<div class="info-icon" title="Maximum portfolio loss before closing all positions. 100% = disabled">
								<span style="font-size: 11px;">i</span>
								<div class="info-tooltip">Maximum portfolio loss before closing all positions. 100% = disabled (no overall stop loss)</div>
							</div>
						</div>
					</div>
					<div class="input-group">
						<label class="input-label">Per Trade Stop Loss (%)</label>
						<div class="info-icon-wrapper">
							<input type="number" class="input-field" id="per-trade-stop-loss" value="100" min="0" max="100" step="1" />
							<div class="info-icon" title="Maximum loss per individual trade before closing position. 100% = disabled">
								<span style="font-size: 11px;">i</span>
								<div class="info-tooltip">Maximum loss per individual trade before closing position. 100% = disabled (no per trade stop loss)</div>
							</div>
						</div>
					</div>
					<div class="input-group">
						<label class="input-label">Overall Take Profit (%)</label>
						<div class="info-icon-wrapper">
							<input type="number" class="input-field" id="overall-take-profit" value="100" min="0" max="1000" step="1" />
							<div class="info-icon" title="Maximum portfolio gain before closing all positions. 100% = disabled">
								<span style="font-size: 11px;">i</span>
								<div class="info-tooltip">Maximum portfolio gain before closing all positions. If equity increases by this percentage from initial capital, all positions are closed and trading stops. 100% = disabled (no overall take profit)</div>
							</div>
						</div>
					</div>
					<div class="input-group">
						<label class="input-label">Per Trade Take Profit (%)</label>
						<div class="info-icon-wrapper">
							<input type="number" class="input-field" id="per-trade-take-profit" value="100" min="0" max="1000" step="1" />
							<div class="info-icon" title="Maximum gain per individual trade before closing position. 100% = disabled">
								<span style="font-size: 11px;">i</span>
								<div class="info-tooltip">Maximum gain percentage per individual trade. If a trade's profit reaches this percentage, the position is closed. 100% = disabled (no per trade take profit)</div>
							</div>
						</div>
					</div>
					<div class="input-group">
						<label class="input-label">Max Holding Period (days)</label>
						<div class="info-icon-wrapper">
							<input type="number" class="input-field" id="max-holding-period" value="" min="1" step="1" placeholder="No limit" />
							<div class="info-icon" title="Maximum number of days to hold a position. Leave empty for no limit">
								<span style="font-size: 11px;">i</span>
								<div class="info-tooltip">Maximum number of days to hold a position before automatically closing it. Leave empty for no limit. Useful for preventing positions from being held too long.</div>
							</div>
						</div>
					</div>
					<div class="input-group">
						<label class="input-label">Trading Options</label>
						<div class="checkbox-group">
							<div class="checkbox-wrapper">
								<input type="checkbox" class="checkbox-input" id="allow-short" />
								<label for="allow-short" class="checkbox-label">Allow Short Trades</label>
								<div class="info-icon" title="Enable short selling. When disabled, only long positions will be opened">
									<span style="font-size: 11px;">i</span>
									<div class="info-tooltip">Enable short selling. When disabled, only long positions will be opened. Short trades allow profiting from falling prices.</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				
				<div id="strategy-info" style="margin-top: 20px; padding: 15px; background: ${this.classList.contains('light-mode') ? '#d5dce5' : '#1f2a37'}; border-radius: 8px; border: 1px solid ${this.classList.contains('light-mode') ? '#a0aab8' : '#2d3748'}; display: none;">
					<div style="color: ${this.classList.contains('light-mode') ? '#2a2a2a' : '#9fb0c0'}; font-size: 0.9rem; line-height: 1.5;">
						<strong style="color: ${this.classList.contains('light-mode') ? '#1a1a1a' : '#e6edf3'};">Parsed Strategy:</strong> <span id="parsed-strategy-text">Processing...</span>
					</div>
				</div>
				
				<div style="margin-top: 20px; text-align: center;">
					<button class="run-btn" id="run-backtest-btn">Run Backtest</button>
				</div>
			</div>
			
		<div id="results-section" class="results-section" style="display: none;">
			<div class="section-title">Backtest Results</div>
			<div id="results-content"></div>
		</div>
		
		<div class="disclaimer-footer">
			<div>
				The information provided on this website is for general informational and educational purposes only and does not constitute investment advice, financial advice, trading advice, or any other form of recommendation. All content is provided without regard to individual financial circumstances, investment objectives, or risk tolerance. Past performance is not indicative of future results. Financial markets are subject to risk, and investing may result in the loss of part or all of your capital. Any actions taken based on the information on this website are strictly at your own risk. Before making any investment decision, you should conduct your own research and, where appropriate, consult a licensed financial advisor. By using this website, you acknowledge and agree to this disclaimer. <a href="#" id="disclaimer-link-full">Full Disclaimer</a>
			</div>
		</div>
	`;
	}
	
		setupEventListeners() {
		// Back button
		this.shadowRoot.getElementById('back-btn')?.addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'market-overview' } }));
		});
		
		// Setup autocomplete for symbol inputs
		// Store valid symbols from autocomplete suggestions
		this.validSymbols = {
			'symbol-input': new Set(),
			'buyhold-symbol-input': new Set()
		};
		
		this.setupAutocomplete('symbol-input', 'symbol-autocomplete-dropdown');
		this.setupAutocomplete('buyhold-symbol-input', 'buyhold-autocomplete-dropdown');
		
		// Strategy description input - parse on change (debounced)
		let parseTimeout;
		const strategyInput = this.shadowRoot.getElementById('strategy-description-input');
		if (strategyInput) {
			// Remove example placeholder when user starts typing
			strategyInput.addEventListener('focus', () => {
				if (!this.hasUserTyped && strategyInput.placeholder) {
					strategyInput.placeholder = '';
					this.hasUserTyped = true;
				}
			});
			
			// Handle input
			strategyInput.addEventListener('input', (e) => {
				if (!this.hasUserTyped) {
					this.hasUserTyped = true;
					strategyInput.placeholder = '';
				}
				this.strategyDescription = e.target.value.trim();
				clearTimeout(parseTimeout);
				parseTimeout = setTimeout(() => {
					this.parseStrategyDescription();
				}, 1000); // Debounce: parse after 1 second of no typing
			});
		}
		
		// Set initial checkbox state
		const allowShortCheckbox = this.shadowRoot.getElementById('allow-short');
		if (allowShortCheckbox) {
			allowShortCheckbox.checked = this.allowShort;
		}
		
		// Run backtest
		this.shadowRoot.getElementById('run-backtest-btn')?.addEventListener('click', () => {
			this.runBacktest();
		});
		
		// Time range
		this.shadowRoot.getElementById('time-range-select')?.addEventListener('change', (e) => {
			this.timeRange = e.target.value;
		});
		
		// Initial capital and commission
		this.shadowRoot.getElementById('initial-capital')?.addEventListener('change', (e) => {
			this.initialCapital = parseFloat(e.target.value) || 10000;
		});
		this.shadowRoot.getElementById('commission')?.addEventListener('change', (e) => {
			this.commission = (parseFloat(e.target.value) || 0.1) / 100;
		});
		this.shadowRoot.getElementById('overall-stop-loss')?.addEventListener('change', (e) => {
			this.overallStopLoss = parseFloat(e.target.value) / 100 || 1.0;
		});
		this.shadowRoot.getElementById('per-trade-stop-loss')?.addEventListener('change', (e) => {
			this.perTradeStopLoss = parseFloat(e.target.value) / 100 || 1.0;
		});
		this.shadowRoot.getElementById('overall-take-profit')?.addEventListener('change', (e) => {
			this.overallTakeProfit = parseFloat(e.target.value) / 100 || 1.0;
		});
		this.shadowRoot.getElementById('per-trade-take-profit')?.addEventListener('change', (e) => {
			this.perTradeTakeProfit = parseFloat(e.target.value) / 100 || 1.0;
		});
		this.shadowRoot.getElementById('max-holding-period')?.addEventListener('change', (e) => {
			const value = e.target.value.trim();
			this.maxHoldingPeriod = value === '' ? null : parseInt(value, 10);
		});
		this.shadowRoot.getElementById('allow-short')?.addEventListener('change', (e) => {
			this.allowShort = e.target.checked;
		});
		
		// Disclaimer link
		this.shadowRoot.getElementById('disclaimer-link-full')?.addEventListener('click', (e) => {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'disclaimer' } }));
		});
	}
	
	async parseStrategyDescription() {
		if (!this.strategyDescription || this.strategyDescription.length < 10) {
			// Too short, don't parse
			const infoEl = this.shadowRoot.getElementById('strategy-info');
			if (infoEl) infoEl.style.display = 'none';
			return;
		}
		
		// Security validation
		if (!this.validateStrategyDescription(this.strategyDescription)) {
			const infoEl = this.shadowRoot.getElementById('strategy-info');
			const textEl = this.shadowRoot.getElementById('parsed-strategy-text');
			if (infoEl) infoEl.style.display = 'block';
			if (textEl) {
				textEl.textContent = 'Invalid strategy description. Please use only trading-related terms.';
			}
			return;
		}
		
		// Show parsing indicator
		const infoEl = this.shadowRoot.getElementById('strategy-info');
		const textEl = this.shadowRoot.getElementById('parsed-strategy-text');
		if (infoEl) infoEl.style.display = 'block';
		if (textEl) textEl.textContent = 'Parsing strategy description...';
		
		try {
			// Use enhanced pattern matching parser
			this.parsedStrategy = this.enhancedStrategyParser(this.strategyDescription);
			
			// Debug: Log parsed strategy for troubleshooting
			if (this.strategyDescription.toLowerCase().includes('rsi') && this.strategyDescription.toLowerCase().includes('and')) {
				console.log('[Strategy Parser] Input:', this.strategyDescription);
				console.log('[Strategy Parser] Parsed:', JSON.stringify(this.parsedStrategy, null, 2));
			}
			
			if (textEl) {
				if (this.parsedStrategy.type === 'unknown') {
					textEl.textContent = 'Could not parse strategy. Please be more specific about entry and exit conditions.';
				} else {
					textEl.textContent = this.parsedStrategy.description || 'Strategy parsed successfully.';
				}
			}
		} catch (error) {
			console.error('Error parsing strategy:', error);
			if (textEl) {
				textEl.textContent = 'Error parsing strategy. Please refine your description.';
			}
		}
	}
	
	validateStrategyDescription(description) {
		// Security: Block potentially dangerous patterns
		const dangerousPatterns = [
			/script/i,
			/eval/i,
			/function/i,
			/\(\)\s*=>/,
			/import\s+/i,
			/require\s*\(/i,
			/exec\s*\(/i,
			/system\s*\(/i,
			/process\s*\./i,
			/window\s*\./i,
			/document\s*\./i,
			/localStorage/i,
			/sessionStorage/i,
			/fetch\s*\(/i,
			/xmlhttprequest/i,
			/websocket/i,
			/\$\{.*\}/, // Template literals
			/backdoor/i,
			/exploit/i,
			/hack/i,
			/malware/i
		];
		
		for (const pattern of dangerousPatterns) {
			if (pattern.test(description)) {
				console.warn('Blocked potentially dangerous strategy description');
				return false;
			}
		}
		
		// Check length (prevent extremely long inputs)
		if (description.length > 2000) {
			return false;
		}
		
		return true;
	}
	
	checkRateLimit() {
		const now = Date.now();
		const oneMinuteAgo = now - 60000;
		const oneHourAgo = now - 3600000;
		
		// Remove old entries
		this.apiCallHistory = this.apiCallHistory.filter(timestamp => timestamp > oneHourAgo);
		
		// Count calls in last minute
		const callsLastMinute = this.apiCallHistory.filter(timestamp => timestamp > oneMinuteAgo).length;
		const callsLastHour = this.apiCallHistory.length;
		
		if (callsLastMinute >= this.maxApiCallsPerMinute) {
			throw new Error(`Rate limit exceeded: Maximum ${this.maxApiCallsPerMinute} API calls per minute. Please wait before trying again.`);
		}
		
		if (callsLastHour >= this.maxApiCallsPerHour) {
			throw new Error(`Rate limit exceeded: Maximum ${this.maxApiCallsPerHour} API calls per hour. Please wait before trying again.`);
		}
		
		// Record this API call
		this.apiCallHistory.push(now);
		return true;
	}
	
	enhancedStrategyParser(description) {
		// Enhanced pattern matching parser that supports flexible strategies
		const desc = description.toLowerCase();
		
		let strategy = {
			type: 'unknown',
			params: {},
			description: description,
			entryCondition: null,
			exitCondition: null,
			hasExitCondition: false // Track if exit condition was explicitly specified
		};
		
		// Helper function to extract percentage
		const extractPercent = (text) => {
			const match = text.match(/(\d+(?:\.\d+)?).*?percent/i) || text.match(/(\d+(?:\.\d+)?)\s*%/i);
			return match ? parseFloat(match[1]) / 100 : null;
		};
		
		// Helper function to extract number
		const extractNumber = (text, pattern) => {
			const match = text.match(pattern);
			return match ? parseFloat(match[1]) : null;
		};
		
		// Helper function to check if exit condition exists
		const hasExit = desc.includes('sell') || desc.includes('exit') || desc.includes('close') || 
		                desc.includes('after') || desc.includes('hold') || desc.includes('then');
		
		// ========== CHECK FOR COMBINED STRATEGIES (Multiple conditions with AND/UND) ==========
		// Look for patterns like "buy when X and Y" or "buy when X, Y" or "buy when X und Y"
		// Check if there's an "and" or "und" after "buy when" and before "sell" (if present)
		const buyWhenMatch = desc.match(/buy.*?when\s+(.+?)(?:\s+and\s+|\s+und\s+|,)(.+?)(?:\s+sell|$)/i) ||
		                     desc.match(/buy.*?when\s+(.+?)(?:\s+and\s+|\s+und\s+|,)(.+)/i);
		
		// Also check for patterns like "buy when X and RSI Y" or "buy when price X and volume Y"
		const hasAndAfterWhen = /buy.*?when.*?(?:and|und)/i.test(desc);
		const hasMultipleIndicators = (desc.match(/rsi|macd|bollinger|volume|ma|moving average|stochastic|williams/gi) || []).length > 1;
		const hasPriceAndIndicator = (desc.includes('percent') || desc.includes('%') || desc.includes('fall') || desc.includes('drop') || desc.includes('rise') || desc.includes('falls')) && 
		                              (desc.includes('rsi') || desc.includes('macd') || desc.includes('volume') || desc.includes('ma') || desc.includes('bollinger') || desc.includes('stochastic') || desc.includes('williams'));
		
		// More lenient check: if there's "and" after "buy when", it's likely a combined strategy
		const hasCombinedConditions = buyWhenMatch !== null || 
		                              (hasAndAfterWhen && (hasMultipleIndicators || hasPriceAndIndicator)) ||
		                              (hasAndAfterWhen && desc.includes('stock') && (desc.includes('rsi') || desc.includes('macd') || desc.includes('volume')));
		
		if (hasCombinedConditions) {
			// Parse combined strategy
			strategy.type = 'combined_strategy';
			strategy.params.conditions = [];
			
			// Extract the part after "buy when"
			const buyWhenFullMatch = desc.match(/buy.*?when\s+(.+?)(?:\s+sell|$)/i);
			if (buyWhenFullMatch) {
				let conditionsText = buyWhenFullMatch[1];
				
				// Remove exit conditions from the conditions text
				conditionsText = conditionsText.replace(/\s+sell.*$/i, '').trim();
				
				// Split by "and" or "und" - be smart about it
				// First try splitting by " and " or " und " (with spaces)
				let conditionParts = conditionsText.split(/\s+(?:and|und)\s+/i).map(p => p.trim());
				
				// If that didn't work well, try more aggressive splitting
				if (conditionParts.length === 1 || conditionParts.some(p => p.length > 100)) {
					// Try splitting by comma first
					const commaSplit = conditionsText.split(',').map(p => p.trim());
					if (commaSplit.length > 1 && commaSplit.every(p => p.length < 100)) {
						conditionParts = commaSplit;
					} else {
						// Try to find natural break points
						// Look for patterns like "X and RSI" or "price X and volume Y"
						const andMatch = conditionsText.match(/^(.+?)\s+(?:and|und)\s+(.+)$/i);
						if (andMatch) {
							conditionParts = [andMatch[1].trim(), andMatch[2].trim()];
						}
					}
				}
				
				// Parse each condition
				for (const conditionText of conditionParts) {
					if (!conditionText || conditionText.length < 3) continue;
					
					const condition = this.parseSingleCondition(conditionText);
					if (condition && condition.type !== 'unknown') {
						strategy.params.conditions.push(condition);
					} else {
						// Debug: Log if condition parsing failed
						console.log('[Strategy Parser] Failed to parse condition:', conditionText, 'Result:', condition);
					}
				}
				
				// Debug: Log parsed conditions
				if (strategy.params.conditions.length > 0) {
					console.log('[Strategy Parser] Parsed conditions:', strategy.params.conditions.map(c => `${c.type}: ${c.description}`));
				}
			}
			
			// Check for exit condition
			strategy.hasExitCondition = hasExit;
			if (hasExit) {
				const exitMatch = desc.match(/sell.*?when.*?([^buy]+)/i) || desc.match(/sell.*?after.*?(\d+).*?(?:day|week|month)/i);
				if (exitMatch) {
					strategy.params.exitCondition = exitMatch[1] || exitMatch[0];
				}
			}
			
			if (strategy.params.conditions.length >= 2) {
				const conditionsDesc = strategy.params.conditions.map(c => c.description).join(' AND ');
				const exitText = strategy.hasExitCondition ? `, Exit: ${strategy.params.exitCondition || 'condition specified'}` : ' (no exit condition specified)';
				strategy.description = `Combined Strategy: ${conditionsDesc}${exitText}`;
				return strategy;
			} else if (strategy.params.conditions.length === 1) {
				// Only one condition found, treat as single condition strategy
				strategy.params.conditions = [];
			}
			// If parsing failed, fall through to single condition parsing
		}
		
		// ========== DAILY DROP STRATEGY ==========
		// "Buy when stock falls over X% in one day" or "falls over X% in one day"
		const hasFallDrop = desc.includes('fell') || desc.includes('fall') || desc.includes('drop') || desc.includes('decline') || desc.includes('drops');
		const hasPercent = desc.includes('percent') || desc.includes('%');
		const isSingleDay = desc.includes('one day') || desc.includes('a day') || desc.includes('in a day') || desc.includes('in one day') || 
		                    (desc.includes('day') && !desc.match(/over\s+\d+\s+day/i) && !desc.match(/\d+\s+day/i));
		
		if (hasFallDrop && hasPercent && isSingleDay) {
			strategy.type = 'daily_drop_strategy';
			const percent = extractPercent(desc);
			strategy.params.dropThreshold = percent !== null ? percent : 0.09;
			
			// Only set holdDays if explicitly mentioned
			let holdDays = null;
			const sellAfterMatch = desc.match(/sell.*?it.*?(\d+).*?day.*?after/i) ||
			                      desc.match(/sell.*?(\d+).*?day.*?after/i) ||
			                      desc.match(/sell.*?after.*?(\d+).*?day/i) ||
			                      desc.match(/(\d+).*?day.*?after/i) ||
			                      desc.match(/hold.*?for.*?(\d+).*?day/i) ||
			                      desc.match(/hold.*?(\d+).*?day/i);
			
			if (sellAfterMatch) {
				holdDays = parseInt(sellAfterMatch[1]);
				strategy.hasExitCondition = true;
			} else if (desc.includes('next day') || desc.includes('end of the next day')) {
				holdDays = 1;
				strategy.hasExitCondition = true;
			} else if (desc.includes('sell')) {
				// If "sell" is mentioned but no days specified, try to extract
				const sellIndex = desc.indexOf('sell');
				if (sellIndex >= 0) {
					const afterSell = desc.substring(sellIndex);
					const daysMatch = afterSell.match(/(\d+).*?day/i);
					if (daysMatch) {
						holdDays = parseInt(daysMatch[1]);
						strategy.hasExitCondition = true;
					}
				}
			}
			
			strategy.params.holdDays = holdDays;
			const exitText = holdDays ? `, sell after ${holdDays} day(s)` : ' (no exit condition specified)';
			strategy.description = `Daily Drop Strategy: Buy when stock falls ${(strategy.params.dropThreshold * 100).toFixed(1)}% in one day${exitText}`;
		}
		// ========== PRICE CHANGE STRATEGY (Multi-day) ==========
		else if (!isSingleDay && (desc.includes('price') || desc.includes('stock')) && 
		         (desc.includes('increase') || desc.includes('decrease') || desc.includes('rise') || desc.includes('fall') || 
		          desc.includes('rises') || desc.includes('drops') || desc.includes('goes up') || desc.includes('goes down')) &&
		         (desc.includes('percent') || desc.includes('%'))) {
			strategy.type = 'price_change_strategy';
			const percent = extractPercent(desc);
			const changePercent = percent !== null ? percent : 0.05;
			
			const isIncrease = desc.includes('increase') || desc.includes('rise') || desc.includes('up') || desc.includes('rises');
			strategy.params.changeThreshold = isIncrease ? changePercent : -changePercent;
			
			// Extract time period
			const periodMatch = desc.match(/over.*?(\d+).*?(?:day|hour|minute|week|month)/i) ||
			                   desc.match(/in.*?(\d+).*?(?:day|hour|minute|week|month)/i) ||
			                   desc.match(/(\d+).*?(?:day|hour|minute|week|month)/i);
			
			if (periodMatch) {
				const period = parseInt(periodMatch[1]);
				const unit = periodMatch[0].toLowerCase();
				strategy.params.lookbackPeriod = period;
				strategy.params.lookbackUnit = unit.includes('hour') ? 'hour' : 
				                               (unit.includes('minute') ? 'minute' : 
				                               (unit.includes('week') ? 'week' : 
				                               (unit.includes('month') ? 'month' : 'day')));
			} else {
				strategy.params.lookbackPeriod = 1;
				strategy.params.lookbackUnit = 'day';
			}
			
			// Check for exit condition
			if (hasExit) {
				strategy.hasExitCondition = true;
				const exitMatch = desc.match(/sell.*?after.*?(\d+).*?(?:day|week|month)/i) ||
				                  desc.match(/hold.*?for.*?(\d+).*?(?:day|week|month)/i);
				if (exitMatch) {
					strategy.params.exitAfter = parseInt(exitMatch[1]);
					strategy.params.exitUnit = exitMatch[0].includes('week') ? 'week' : 
					                          (exitMatch[0].includes('month') ? 'month' : 'day');
				}
			}
			
			const exitText = strategy.hasExitCondition && strategy.params.exitAfter ? 
			                 `, sell after ${strategy.params.exitAfter} ${strategy.params.exitUnit}(s)` : 
			                 (strategy.hasExitCondition ? ' (exit condition specified)' : ' (no exit condition specified)');
			strategy.description = `Price Change Strategy: Buy when price ${isIncrease ? 'increases' : 'decreases'} by ${(Math.abs(changePercent) * 100).toFixed(1)}% over ${strategy.params.lookbackPeriod} ${strategy.params.lookbackUnit}(s)${exitText}`;
		}
		// ========== SIMPLE PRICE DROP (no "in one day" specified) ==========
		else if (hasFallDrop && hasPercent && !isSingleDay && desc.includes('buy')) {
			strategy.type = 'price_change_strategy';
			const percent = extractPercent(desc);
			strategy.params.changeThreshold = percent !== null ? -percent : -0.05;
			strategy.params.lookbackPeriod = 1;
			strategy.params.lookbackUnit = 'day';
			strategy.hasExitCondition = hasExit;
			
			if (hasExit) {
				const exitMatch = desc.match(/sell.*?after.*?(\d+).*?(?:day|week|month)/i) ||
				                  desc.match(/hold.*?for.*?(\d+).*?(?:day|week|month)/i);
				if (exitMatch) {
					strategy.params.exitAfter = parseInt(exitMatch[1]);
					strategy.params.exitUnit = exitMatch[0].includes('week') ? 'week' : 
					                          (exitMatch[0].includes('month') ? 'month' : 'day');
				}
			}
			
			const exitText = strategy.hasExitCondition && strategy.params.exitAfter ? 
			                 `, sell after ${strategy.params.exitAfter} ${strategy.params.exitUnit}(s)` : 
			                 (strategy.hasExitCondition ? ' (exit condition specified)' : ' (no exit condition specified)');
			strategy.description = `Price Drop Strategy: Buy when stock falls ${(Math.abs(strategy.params.changeThreshold) * 100).toFixed(1)}%${exitText}`;
		}
		// ========== RSI STRATEGY ==========
		else if (desc.includes('rsi')) {
			strategy.type = 'rsi_strategy';
			const rsiPeriod = extractNumber(desc, /rsi.*?(\d+)/i) || extractNumber(desc, /(\d+).*?period.*?rsi/i) || 14;
			strategy.params.rsiPeriod = rsiPeriod;
			
			const oversold = extractNumber(desc, /oversold.*?(\d+)/i) || 
			                extractNumber(desc, /buy.*?below.*?(\d+)/i) || 
			                extractNumber(desc, /rsi.*?below.*?(\d+)/i) || 30;
			strategy.params.oversold = oversold;
			
			const overbought = extractNumber(desc, /overbought.*?(\d+)/i) || 
			                  extractNumber(desc, /sell.*?above.*?(\d+)/i) || 
			                  extractNumber(desc, /rsi.*?above.*?(\d+)/i);
			
			if (overbought !== null) {
				strategy.params.overbought = overbought;
				strategy.hasExitCondition = true;
			} else {
				strategy.params.overbought = 70; // Default but mark as not explicitly set
			}
			
			const exitText = strategy.hasExitCondition ? 
			                 `, Sell when RSI > ${strategy.params.overbought}` : 
			                 ' (no exit condition specified)';
			strategy.description = `RSI Strategy: Buy when RSI < ${strategy.params.oversold}${exitText} (${strategy.params.rsiPeriod}-period RSI)`;
		}
		// ========== MOVING AVERAGE CROSSOVER ==========
		else if (desc.includes('moving average') || desc.includes('ma') || desc.includes('crossover') || desc.includes('crosses')) {
			strategy.type = 'ma_crossover';
			
			// Extract fast MA
			const fastMatch = desc.match(/fast.*?(\d+)/i) || 
			                 desc.match(/(\d+).*?day.*?ma/i) ||
			                 desc.match(/(\d+).*?day.*?moving.*?average/i) ||
			                 desc.match(/(\d+).*?-day/i);
			strategy.params.fastMA = fastMatch ? parseInt(fastMatch[1]) : 50;
			
			// Extract slow MA
			const slowMatch = desc.match(/slow.*?(\d+)/i) || 
			                 desc.match(/(\d+).*?day.*?ma/i) ||
			                 desc.match(/(\d+).*?day.*?moving.*?average/i);
			
			// If we found a second number, use it as slow MA
			const allNumbers = desc.match(/(\d+)/g);
			if (allNumbers && allNumbers.length >= 2) {
				const firstNum = parseInt(allNumbers[0]);
				const secondNum = parseInt(allNumbers[1]);
				if (firstNum < secondNum) {
					strategy.params.fastMA = firstNum;
					strategy.params.slowMA = secondNum;
				} else {
					strategy.params.fastMA = secondNum;
					strategy.params.slowMA = firstNum;
				}
			} else {
			strategy.params.slowMA = slowMatch ? parseInt(slowMatch[1]) : 200;
			}
			
			// Check for exit condition
			strategy.hasExitCondition = desc.includes('sell') || desc.includes('exit') || desc.includes('crosses below');
			
			const exitText = strategy.hasExitCondition ? 
			                 ', Sell when fast MA crosses below slow MA' : 
			                 ' (no exit condition specified)';
			strategy.description = `Moving Average Crossover: Buy when ${strategy.params.fastMA}-day MA crosses above ${strategy.params.slowMA}-day MA${exitText}`;
		}
		// ========== PRICE ABOVE/BELOW MOVING AVERAGE ==========
		else if ((desc.includes('above') || desc.includes('below')) && (desc.includes('moving average') || desc.includes('ma'))) {
			strategy.type = 'ma_price_strategy';
			const maPeriod = extractNumber(desc, /(\d+).*?day.*?ma/i) || 
			                extractNumber(desc, /(\d+).*?day.*?moving.*?average/i) || 
			                extractNumber(desc, /(\d+).*?-day/i) || 200;
			strategy.params.maPeriod = maPeriod;
			
			const isAbove = desc.includes('above');
			strategy.params.condition = isAbove ? 'above' : 'below';
			strategy.hasExitCondition = desc.includes('sell') || desc.includes('exit');
			
			const exitText = strategy.hasExitCondition ? 
			                 `, Sell when price goes ${isAbove ? 'below' : 'above'} ${maPeriod}-day MA` : 
			                 ' (no exit condition specified)';
			strategy.description = `MA Price Strategy: Buy when price is ${isAbove ? 'above' : 'below'} ${maPeriod}-day MA${exitText}`;
		}
		// ========== MACD STRATEGY ==========
		else if (desc.includes('macd')) {
			strategy.type = 'macd_strategy';
			strategy.params.fastPeriod = extractNumber(desc, /fast.*?(\d+)/i) || 12;
			strategy.params.slowPeriod = extractNumber(desc, /slow.*?(\d+)/i) || 26;
			strategy.params.signalPeriod = extractNumber(desc, /signal.*?(\d+)/i) || 9;
			
			strategy.hasExitCondition = desc.includes('sell') || desc.includes('exit') || desc.includes('crosses below');
			
			const exitText = strategy.hasExitCondition ? 
			                 ', Sell when MACD crosses below signal line' : 
			                 ' (no exit condition specified)';
			strategy.description = `MACD Strategy: Buy when MACD crosses above signal line${exitText}`;
		}
		// ========== BOLLINGER BANDS ==========
		else if (desc.includes('bollinger') || desc.includes('bollinger band')) {
			strategy.type = 'bollinger_strategy';
			const period = extractNumber(desc, /(\d+).*?period/i) || 20;
			strategy.params.period = period;
			strategy.params.stdDev = extractNumber(desc, /std.*?dev.*?(\d+(?:\.\d+)?)/i) || 2;
			
			const isLower = desc.includes('lower') || desc.includes('below');
			strategy.params.band = isLower ? 'lower' : 'upper';
			strategy.hasExitCondition = desc.includes('sell') || desc.includes('upper') || desc.includes('exit');
			
			const exitText = strategy.hasExitCondition ? 
			                 (isLower ? ', Sell when price reaches upper band' : ', Sell when price reaches lower band') : 
			                 ' (no exit condition specified)';
			strategy.description = `Bollinger Bands: Buy at ${isLower ? 'lower' : 'upper'} band${exitText} (${period}-period)`;
		}
		// ========== MEAN REVERSION ==========
		else if (desc.includes('mean reversion') || desc.includes('revert') || desc.includes('mean')) {
			strategy.type = 'mean_reversion';
			const lookback = extractNumber(desc, /(\d+).*?day/i) || 20;
			strategy.params.lookback = lookback;
			strategy.params.threshold = extractNumber(desc, /threshold.*?(\d+(?:\.\d+)?)/i) || 2;
			strategy.hasExitCondition = desc.includes('sell') || desc.includes('exit');
			
			const exitText = strategy.hasExitCondition ? 
			                 ', Sell when price returns to mean' : 
			                 ' (no exit condition specified)';
			strategy.description = `Mean Reversion: Buy when price deviates significantly from mean${exitText} (${lookback}-day lookback)`;
		}
		// ========== MOMENTUM STRATEGY ==========
		else if (desc.includes('momentum')) {
			strategy.type = 'momentum';
			const period = extractNumber(desc, /(\d+).*?day/i) || 10;
			strategy.params.period = period;
			strategy.params.threshold = extractNumber(desc, /(\d+(?:\.\d+)?).*?percent/i) || 0.02;
			strategy.hasExitCondition = desc.includes('sell') || desc.includes('weakens') || desc.includes('exit');
			
			const exitText = strategy.hasExitCondition ? 
			                 ', Sell when momentum weakens' : 
			                 ' (no exit condition specified)';
			strategy.description = `Momentum Strategy: Buy on strong momentum${exitText} (${period}-day period)`;
		}
		// ========== VOLUME STRATEGY ==========
		else if (desc.includes('volume')) {
			strategy.type = 'volume_strategy';
			const isAbove = desc.includes('above') || desc.includes('high');
			strategy.params.volumeCondition = isAbove ? 'above' : 'below';
			strategy.params.volumePeriod = extractNumber(desc, /(\d+).*?day/i) || 20;
			strategy.hasExitCondition = desc.includes('sell') || desc.includes('exit');
			
			const exitText = strategy.hasExitCondition ? 
			                 ' (exit condition specified)' : 
			                 ' (no exit condition specified)';
			strategy.description = `Volume Strategy: Buy when volume is ${isAbove ? 'above' : 'below'} average${exitText}`;
		}
		// ========== SUPPORT/RESISTANCE ==========
		else if (desc.includes('support') || desc.includes('resistance') || desc.includes('breaks')) {
			strategy.type = 'support_resistance_strategy';
			const isSupport = desc.includes('support') || desc.includes('below');
			strategy.params.levelType = isSupport ? 'support' : 'resistance';
			
			// Try to extract price level
			const priceMatch = desc.match(/\$(\d+(?:\.\d+)?)/i) || desc.match(/(\d+(?:\.\d+)?).*?dollar/i);
			if (priceMatch) {
				strategy.params.level = parseFloat(priceMatch[1]);
			}
			
			strategy.hasExitCondition = desc.includes('sell') || desc.includes('exit');
			const exitText = strategy.hasExitCondition ? 
			                 `, Sell when price breaks ${isSupport ? 'below support' : 'above resistance'}` : 
			                 ' (no exit condition specified)';
			strategy.description = `Support/Resistance: Buy when price ${isSupport ? 'breaks below support' : 'breaks above resistance'}${exitText}`;
		}
		// ========== STOCHASTIC ==========
		else if (desc.includes('stochastic')) {
			strategy.type = 'stochastic_strategy';
			strategy.params.period = extractNumber(desc, /(\d+).*?period/i) || 14;
			const oversold = extractNumber(desc, /below.*?(\d+)/i) || 20;
			strategy.params.oversold = oversold;
			const overbought = extractNumber(desc, /above.*?(\d+)/i);
			if (overbought !== null) {
				strategy.params.overbought = overbought;
				strategy.hasExitCondition = true;
			} else {
				strategy.params.overbought = 80;
			}
			
			const exitText = strategy.hasExitCondition ? 
			                 `, Sell when stochastic > ${strategy.params.overbought}` : 
			                 ' (no exit condition specified)';
			strategy.description = `Stochastic Strategy: Buy when stochastic < ${oversold}${exitText}`;
		}
		// ========== WILLIAMS %R ==========
		else if (desc.includes('williams') || desc.includes('%r') || desc.includes('williams %r')) {
			strategy.type = 'williams_r_strategy';
			strategy.params.period = extractNumber(desc, /(\d+).*?period/i) || 14;
			const oversold = extractNumber(desc, /below.*?(-?\d+)/i) || -80;
			strategy.params.oversold = oversold;
			const overbought = extractNumber(desc, /above.*?(-?\d+)/i);
			if (overbought !== null) {
				strategy.params.overbought = overbought;
				strategy.hasExitCondition = true;
			} else {
				strategy.params.overbought = -20;
			}
			
			const exitText = strategy.hasExitCondition ? 
			                 `, Sell when Williams %R > ${strategy.params.overbought}` : 
			                 ' (no exit condition specified)';
			strategy.description = `Williams %R Strategy: Buy when Williams %R < ${oversold}${exitText}`;
		}
		// ========== GENERIC BUY/SELL STRATEGY ==========
		else if (desc.includes('buy')) {
			// Try to extract conditions
			const buyMatch = desc.match(/buy.*?when.*?([^sell]+)/i);
			const sellMatch = desc.match(/sell.*?when.*?([^buy]+)/i) || desc.match(/sell.*?at.*?([^buy]+)/i);
			
			if (buyMatch || sellMatch) {
				strategy.type = 'generic_strategy';
				strategy.params.buyCondition = buyMatch ? buyMatch[1].trim() : null;
				strategy.params.sellCondition = sellMatch ? sellMatch[1].trim() : null;
				strategy.hasExitCondition = sellMatch !== null;
				
				const exitText = strategy.hasExitCondition ? 
				                 `, Sell: ${strategy.params.sellCondition}` : 
				                 ' (no exit condition specified)';
				strategy.description = `Generic Strategy: Buy: ${strategy.params.buyCondition || 'condition specified'}${exitText}`;
			}
		}
		
		return strategy;
	}
	
	parseSingleCondition(conditionText) {
		// Parse a single condition (used for combined strategies)
		const cond = conditionText.toLowerCase().trim();
		
		const extractPercent = (text) => {
			const match = text.match(/(\d+(?:\.\d+)?).*?percent/i) || text.match(/(\d+(?:\.\d+)?)\s*%/i);
			return match ? parseFloat(match[1]) / 100 : null;
		};
		
		const extractNumber = (text, pattern) => {
			const match = text.match(pattern);
			return match ? parseFloat(match[1]) : null;
		};
		
		// Price drop/fall condition
		// First check for specific patterns like "stock falls over X%" or "falls over X%"
		const stockFallsMatch = cond.match(/(?:stock|price).*?fall.*?over.*?(\d+(?:\.\d+)?).*?%/i) || 
		                         cond.match(/(?:stock|price).*?drop.*?(\d+(?:\.\d+)?).*?%/i) ||
		                         cond.match(/fall.*?over.*?(\d+(?:\.\d+)?).*?%/i) ||
		                         cond.match(/drop.*?(\d+(?:\.\d+)?).*?%/i);
		if (stockFallsMatch) {
			const percent = parseFloat(stockFallsMatch[1]) / 100;
			return {
				type: 'price_drop',
				params: { threshold: percent },
				description: `Price falls ${(percent * 100).toFixed(1)}%`
			};
		}
		
		// Fallback: Check for "fall", "drop", etc. with percentage
		if ((cond.includes('fall') || cond.includes('drop') || cond.includes('drops') || cond.includes('fell') || cond.includes('decline')) && 
		    (cond.includes('percent') || cond.includes('%'))) {
			const percent = extractPercent(cond);
			return {
				type: 'price_drop',
				params: { threshold: percent !== null ? percent : 0.02 },
				description: `Price falls ${percent !== null ? (percent * 100).toFixed(1) : 2}%`
			};
		}
		
		// Price increase/rise condition
		if ((cond.includes('rise') || cond.includes('increase') || cond.includes('rises') || cond.includes('up')) && 
		    (cond.includes('percent') || cond.includes('%'))) {
			const percent = extractPercent(cond);
			return {
				type: 'price_increase',
				params: { threshold: percent !== null ? percent : 0.02 },
				description: `Price increases ${percent !== null ? (percent * 100).toFixed(1) : 2}%`
			};
		}
		
		// RSI condition
		if (cond.includes('rsi')) {
			const isBelow = cond.includes('below') || cond.includes('under') || cond.includes('<');
			const isAbove = cond.includes('above') || cond.includes('over') || cond.includes('>');
			const value = extractNumber(cond, /(\d+)/);
			
			if (isBelow && value !== null) {
				return {
					type: 'rsi_below',
					params: { threshold: value },
					description: `RSI < ${value}`
				};
			} else if (isAbove && value !== null) {
				return {
					type: 'rsi_above',
					params: { threshold: value },
					description: `RSI > ${value}`
				};
			} else if (cond.includes('oversold')) {
				return {
					type: 'rsi_below',
					params: { threshold: 30 },
					description: 'RSI oversold (< 30)'
				};
			} else if (cond.includes('overbought')) {
				return {
					type: 'rsi_above',
					params: { threshold: 70 },
					description: 'RSI overbought (> 70)'
				};
			}
		}
		
		// Volume condition
		if (cond.includes('volume')) {
			const isAbove = cond.includes('above') || cond.includes('high') || cond.includes('>');
			const isBelow = cond.includes('below') || cond.includes('low') || cond.includes('<');
			
			if (isAbove || cond.includes('average')) {
				return {
					type: 'volume_above',
					params: { period: extractNumber(cond, /(\d+).*?day/i) || 20 },
					description: 'Volume above average'
				};
			} else if (isBelow) {
				return {
					type: 'volume_below',
					params: { period: extractNumber(cond, /(\d+).*?day/i) || 20 },
					description: 'Volume below average'
				};
			}
		}
		
		// Moving Average condition
		if (cond.includes('ma') || cond.includes('moving average')) {
			const isAbove = cond.includes('above') || cond.includes('>');
			const isBelow = cond.includes('below') || cond.includes('<');
			const period = extractNumber(cond, /(\d+).*?day/i) || extractNumber(cond, /(\d+).*?ma/i) || 200;
			
			if (isAbove) {
				return {
					type: 'price_above_ma',
					params: { period },
					description: `Price above ${period}-day MA`
				};
			} else if (isBelow) {
				return {
					type: 'price_below_ma',
					params: { period },
					description: `Price below ${period}-day MA`
				};
			}
		}
		
		// MACD condition
		if (cond.includes('macd')) {
			if (cond.includes('cross') && cond.includes('above')) {
				return {
					type: 'macd_cross_above',
					params: {},
					description: 'MACD crosses above signal'
				};
			} else if (cond.includes('cross') && cond.includes('below')) {
				return {
					type: 'macd_cross_below',
					params: {},
					description: 'MACD crosses below signal'
				};
			}
		}
		
		// Bollinger Bands condition
		if (cond.includes('bollinger')) {
			if (cond.includes('lower') || cond.includes('below')) {
				return {
					type: 'bollinger_lower',
					params: { period: extractNumber(cond, /(\d+).*?period/i) || 20 },
					description: 'Price at lower Bollinger Band'
				};
			} else if (cond.includes('upper') || cond.includes('above')) {
				return {
					type: 'bollinger_upper',
					params: { period: extractNumber(cond, /(\d+).*?period/i) || 20 },
					description: 'Price at upper Bollinger Band'
				};
			}
		}
		
		// Stochastic condition
		if (cond.includes('stochastic')) {
			const isBelow = cond.includes('below') || cond.includes('<');
			const value = extractNumber(cond, /(\d+)/) || 20;
			
			if (isBelow) {
				return {
					type: 'stochastic_below',
					params: { threshold: value },
					description: `Stochastic < ${value}`
				};
			}
		}
		
		// Williams %R condition
		if (cond.includes('williams') || cond.includes('%r')) {
			const isBelow = cond.includes('below') || cond.includes('<');
			const value = extractNumber(cond, /(-?\d+)/) || -80;
			
			if (isBelow) {
				return {
					type: 'williams_r_below',
					params: { threshold: value },
					description: `Williams %R < ${value}`
				};
			}
		}
		
		return { type: 'unknown', params: {}, description: conditionText };
	}
	
	setupTheme() {
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.classList.add('light-mode');
			this.shadowRoot.getElementById('theme-toggle')?.classList.add('light');
			this.shadowRoot.querySelector('.theme-icon').textContent = '☀️';
		}
		
		this.shadowRoot.getElementById('theme-toggle')?.addEventListener('click', () => {
			const isLight = this.classList.contains('light-mode');
			this.classList.toggle('light-mode');
			this.shadowRoot.getElementById('theme-toggle')?.classList.toggle('light');
			this.shadowRoot.querySelector('.theme-icon').textContent = isLight ? '🌙' : '☀️';
			localStorage.setItem('theme', isLight ? 'dark' : 'light');
			document.body.style.background = isLight ? '#0b0f14' : '#c8d0da';
		});
	}
	
	// Removed getStrategyDescription, setupStrategyDescriptionListeners, and updateStrategyParams
	// These are no longer needed as we use free text strategy description
	// Strategy parameters are now parsed from the free text description
	
	async runBacktest() {
		const symbol = this.shadowRoot.getElementById('symbol-input').value.trim().toUpperCase();
		if (!symbol) {
			alert('Please enter a stock symbol');
			return;
		}
		
		// Validate that symbol exists in autocomplete suggestions
		if (!this.validSymbols || !this.validSymbols['symbol-input'] || !this.validSymbols['symbol-input'].has(symbol)) {
			alert(`Please select a valid stock from the suggestions. "${symbol}" is not a valid stock symbol.`);
			return;
		}
		
		const buyHoldSymbol = this.shadowRoot.getElementById('buyhold-symbol-input').value.trim().toUpperCase() || symbol;
		if (!buyHoldSymbol) {
			alert('Please enter a Buy-and-Hold comparison stock symbol');
			return;
		}
		
		// Validate buy-and-hold symbol exists in autocomplete suggestions
		if (!this.validSymbols || !this.validSymbols['buyhold-symbol-input'] || !this.validSymbols['buyhold-symbol-input'].has(buyHoldSymbol)) {
			alert(`Please select a valid stock from the suggestions for Buy-and-Hold. "${buyHoldSymbol}" is not a valid stock symbol.`);
			return;
		}
		
		if (!this.strategyDescription || this.strategyDescription.length < 10) {
			alert('Please enter a strategy description (at least 10 characters)');
			return;
		}
		
		if (!this.parsedStrategy || this.parsedStrategy.type === 'unknown') {
			alert('Could not parse strategy description. Please refine your description with clear entry and exit conditions.');
			return;
		}
		
		this.symbol = symbol;
		this.buyHoldSymbol = buyHoldSymbol;
		
		const runBtn = this.shadowRoot.getElementById('run-backtest-btn');
		runBtn.disabled = true;
		runBtn.textContent = 'Running Backtest...';
		
		try {
			// Check rate limit before making API calls
			this.checkRateLimit();
			
			// Parse strategy if not already parsed
			if (!this.parsedStrategy) {
				await this.parseStrategyDescription();
			}
			
			// Check rate limit again before data fetching
			this.checkRateLimit();
			
			// Fetch historical data for main stock
			await this.loadHistoricalData();
			
			// Check rate limit before second API call
			this.checkRateLimit();
			
			// Fetch historical data for Buy-and-Hold comparison stock
			await this.loadBuyHoldHistoricalData();
			
			// Run backtest
			this.results = this.executeBacktest();
			
			// Display results
			this.displayResults();
			
		} catch (error) {
			console.error('Backtest error:', error);
			this.shadowRoot.getElementById('results-section').style.display = 'block';
			this.shadowRoot.getElementById('results-content').innerHTML = `
				<div class="error">Error running backtest: ${error.message}</div>
			`;
		} finally {
			runBtn.disabled = false;
			runBtn.textContent = 'Run Backtest';
		}
	}
	
	async loadBuyHoldHistoricalData() {
		try {
			const response = await fetch(`http://localhost:3000/api/yahoo/chart/${this.buyHoldSymbol}?interval=1d&range=${this.timeRange}`);
			if (!response.ok) {
				throw new Error(`Failed to fetch Buy-and-Hold data: ${response.status}`);
			}
			
			const data = await response.json();
			if (!data.chart || !data.chart.result || !data.chart.result[0]) {
				throw new Error('No data returned for Buy-and-Hold symbol');
			}
			
			const result = data.chart.result[0];
			const timestamps = result.timestamp || [];
			const quotes = result.indicators?.quote?.[0] || {};
			const closes = quotes.close || [];
			
			this.buyHoldPriceData = timestamps.map((ts, i) => ({
				date: new Date(ts * 1000),
				timestamp: ts,
				close: closes[i] || 0
			})).filter(d => d.close > 0);
			
			if (this.buyHoldPriceData.length === 0) {
				throw new Error('No valid Buy-and-Hold price data found');
			}
			
		} catch (error) {
			console.error('Error loading Buy-and-Hold historical data:', error);
			throw new Error(`Failed to load Buy-and-Hold historical data: ${error.message}`);
		}
	}
	
	// Removed loadStrategyParams - now using parsedStrategy from description
	
	async loadHistoricalData() {
		// Fetch historical data based on selected time range
		try {
			const response = await fetch(`http://localhost:3000/api/yahoo/chart/${this.symbol}?interval=1d&range=${this.timeRange}`);
			if (!response.ok) {
				throw new Error(`Failed to fetch data: ${response.status}`);
			}
			
			const data = await response.json();
			if (!data.chart || !data.chart.result || !data.chart.result[0]) {
				throw new Error('No data returned for symbol');
			}
			
			const result = data.chart.result[0];
			const timestamps = result.timestamp || [];
			const quotes = result.indicators?.quote?.[0] || {};
			const closes = quotes.close || [];
			const opens = quotes.open || [];
			const highs = quotes.high || [];
			const lows = quotes.low || [];
			const volumes = quotes.volume || [];
			
			this.priceData = timestamps.map((ts, i) => ({
				date: new Date(ts * 1000),
				timestamp: ts,
				open: opens[i] || closes[i] || 0,
				high: highs[i] || closes[i] || 0,
				low: lows[i] || closes[i] || 0,
				close: closes[i] || 0,
				volume: volumes[i] || 0
			})).filter(d => d.close > 0);
			
			if (this.priceData.length === 0) {
				throw new Error('No valid price data found');
			}
			
		} catch (error) {
			console.error('Error loading historical data:', error);
			throw new Error(`Failed to load historical data: ${error.message}`);
		}
	}
	
	executeBacktest() {
		if (!this.parsedStrategy) {
			throw new Error('Strategy not parsed. Please enter a valid strategy description.');
		}
		
		const strategy = this.parsedStrategy.type;
		const params = this.parsedStrategy.params;
		
		// Calculate indicators
		const indicators = this.calculateIndicators(strategy, params);
		
		// Execute strategy
		const trades = this.generateTrades(strategy, params, indicators);
		
		// Calculate performance metrics
		const metrics = this.calculateMetrics(trades);
		
		// Calculate Buy-and-Hold strategy (using Buy-and-Hold stock)
		const buyAndHold = this.calculateBuyAndHold();
		
		return {
			strategy,
			params,
			trades,
			metrics,
			equityCurve: this.calculateEquityCurve(trades),
			buyAndHold,
			indicators,
			strategyDescription: this.parsedStrategy.description
		};
	}
	
	calculateBuyAndHold() {
		// Use Buy-and-Hold price data if available, otherwise use main stock data
		const priceData = this.buyHoldPriceData.length > 0 ? this.buyHoldPriceData : this.priceData;
		
		if (priceData.length === 0) {
			return {
				trades: [],
				metrics: {
					totalReturn: 0,
					annualizedReturn: 0,
					sharpeRatio: 0,
					maxDrawdown: 0,
					finalEquity: this.initialCapital
				},
				equityCurve: [this.initialCapital]
			};
		}
		
		const firstPrice = priceData[0].close;
		const lastPrice = priceData[priceData.length - 1].close;
		
		// Buy at first price
		const shares = Math.floor(this.initialCapital / (firstPrice * (1 + this.commission)));
		const cost = firstPrice * shares * (1 + this.commission);
		const remainingCash = this.initialCapital - cost;
		
		// Sell at last price
		const finalValue = lastPrice * shares * (1 - this.commission) + remainingCash;
		const totalReturn = ((finalValue - this.initialCapital) / this.initialCapital) * 100;
		
		// Calculate equity curve (daily values)
		const equityCurve = [];
		for (let i = 0; i < priceData.length; i++) {
			// Current value = shares * current price + remaining cash
			// Commission only applies when actually selling, not for daily valuation
			const currentValue = priceData[i].close * shares + remainingCash;
			equityCurve.push(currentValue);
		}
		
		// Calculate annualized return
		const days = (priceData[priceData.length - 1].date - priceData[0].date) / (1000 * 60 * 60 * 24);
		const years = days / 252;
		const annualizedReturn = years > 0 ? ((1 + totalReturn / 100) ** (1 / years) - 1) * 100 : 0;
		
		// Calculate max drawdown
		let maxDrawdown = 0;
		let peak = this.initialCapital;
		for (const equity of equityCurve) {
			if (equity > peak) peak = equity;
			const drawdown = ((peak - equity) / peak) * 100;
			if (drawdown > maxDrawdown) maxDrawdown = drawdown;
		}
		
		// Calculate Sharpe Ratio (simplified - using daily returns)
		const returns = [];
		for (let i = 1; i < equityCurve.length; i++) {
			const dailyReturn = ((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]) * 100;
			returns.push(dailyReturn);
		}
		const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
		const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
		const sharpeRatio = stdDev > 0 ? (avgReturn - (2 / 252)) / stdDev : 0; // Risk-free rate 2% annual = 2/252 daily
		
		return {
			trades: [{
				entryDate: priceData[0].date,
				exitDate: priceData[priceData.length - 1].date,
				entryPrice: firstPrice,
				exitPrice: lastPrice,
				shares: shares,
				profit: finalValue - this.initialCapital,
				return: totalReturn
			}],
			metrics: {
				totalReturn,
				annualizedReturn,
				sharpeRatio,
				maxDrawdown,
				finalEquity: finalValue
			},
			equityCurve
		};
	}
	
	calculateIndicators(strategy, params) {
		const closes = this.priceData.map(d => d.close);
		const highs = this.priceData.map(d => d.high);
		const lows = this.priceData.map(d => d.low);
		const volumes = this.priceData.map(d => d.volume);
		
		const indicators = {
			ma: {},
			rsi: [],
			macd: { macd: [], signal: [], histogram: [] },
			bollinger: { upper: [], middle: [], lower: [] },
			atr: []
		};
		
		// Moving Averages
		if (strategy === 'ma_crossover') {
			indicators.ma.fast = this.calculateMA(closes, params.fastMA);
			indicators.ma.slow = this.calculateMA(closes, params.slowMA);
		}
		
		// MA Price Strategy
		if (strategy === 'ma_price_strategy') {
			indicators.ma.price = this.calculateMA(closes, params.maPeriod);
		}
		
		// RSI - calculate for RSI strategy or generic strategies that might use RSI
		if (strategy === 'rsi_strategy' || strategy === 'generic_strategy') {
			const rsiPeriod = params.rsiPeriod || 14;
			indicators.rsi = this.calculateRSI(closes, rsiPeriod);
		}
		
		// MACD
		if (strategy === 'macd_strategy') {
			const macdData = this.calculateMACD(closes, params.fastPeriod, params.slowPeriod, params.signalPeriod);
			indicators.macd = macdData;
		}
		
		// Bollinger Bands
		if (strategy === 'bollinger_strategy') {
			const bb = this.calculateBollingerBands(closes, params.period, params.stdDev);
			indicators.bollinger = bb;
		}
		
		// Stochastic
		if (strategy === 'stochastic_strategy') {
			indicators.stochastic = this.calculateStochastic(highs, lows, closes, params.period || 14);
		}
		
		// Williams %R
		if (strategy === 'williams_r_strategy') {
			indicators.williamsR = this.calculateWilliamsR(highs, lows, closes, params.period || 14);
		}
		
		// Combined Strategy - calculate all needed indicators
		if (strategy === 'combined_strategy' && params.conditions) {
			// Calculate RSI if any condition uses it
			const needsRSI = params.conditions.some(c => c.type.includes('rsi'));
			if (needsRSI && (!indicators.rsi || indicators.rsi.length === 0)) {
				indicators.rsi = this.calculateRSI(closes, 14);
				console.log(`[Indicators] RSI calculated for combined strategy, length: ${indicators.rsi.length}, first non-null at index: ${indicators.rsi.findIndex(v => v !== null)}`);
			}
			
			// Calculate MACD if needed
			const needsMACD = params.conditions.some(c => c.type.includes('macd'));
			if (needsMACD && !indicators.macd.macd.length) {
				indicators.macd = this.calculateMACD(closes, 12, 26, 9);
			}
			
			// Calculate Bollinger Bands if needed
			const needsBB = params.conditions.some(c => c.type.includes('bollinger'));
			if (needsBB && !indicators.bollinger.upper.length) {
				indicators.bollinger = this.calculateBollingerBands(closes, 20, 2);
			}
			
			// Calculate Moving Averages if needed
			const needsMA = params.conditions.some(c => c.type.includes('ma') || c.type.includes('moving'));
			if (needsMA) {
				// Calculate common MAs
				const maPeriods = new Set();
				params.conditions.forEach(c => {
					if (c.params && c.params.period) {
						maPeriods.add(c.params.period);
					}
				});
				maPeriods.forEach(period => {
					if (!indicators.ma[`ma${period}`]) {
						indicators.ma[`ma${period}`] = this.calculateMA(closes, period);
					}
				});
			}
			
			// Calculate Volume average if needed
			const needsVolume = params.conditions.some(c => c.type.includes('volume'));
			if (needsVolume && !indicators.avgVolume) {
				const volumePeriod = params.conditions.find(c => c.type.includes('volume'))?.params?.period || 20;
				indicators.avgVolume = this.calculateMA(volumes, volumePeriod);
			}
			
			// Calculate Stochastic if needed
			const needsStochastic = params.conditions.some(c => c.type.includes('stochastic'));
			if (needsStochastic && !indicators.stochastic) {
				indicators.stochastic = this.calculateStochastic(highs, lows, closes, 14);
			}
			
			// Calculate Williams %R if needed
			const needsWilliamsR = params.conditions.some(c => c.type.includes('williams'));
			if (needsWilliamsR && !indicators.williamsR) {
				indicators.williamsR = this.calculateWilliamsR(highs, lows, closes, 14);
			}
		}
		
		// ATR (for stop loss) - always calculate
		indicators.atr = this.calculateATR(highs, lows, closes, 14);
		
		// For daily_drop_strategy and price_change_strategy, we don't need additional indicators
		// They work directly with price data
		
		return indicators;
	}
	
	calculateMA(prices, period) {
		const ma = [];
		for (let i = 0; i < prices.length; i++) {
			if (i < period - 1) {
				ma.push(null);
			} else {
				const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
				ma.push(sum / period);
			}
		}
		return ma;
	}
	
	calculateRSI(prices, period) {
		const rsi = [];
		const gains = [];
		const losses = [];
		
		for (let i = 1; i < prices.length; i++) {
			const change = prices[i] - prices[i - 1];
			gains.push(change > 0 ? change : 0);
			losses.push(change < 0 ? Math.abs(change) : 0);
		}
		
		for (let i = 0; i < prices.length; i++) {
			if (i < period) {
				rsi.push(null);
			} else {
				const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
				const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
				
				if (avgLoss === 0) {
					rsi.push(100);
				} else {
					const rs = avgGain / avgLoss;
					rsi.push(100 - (100 / (1 + rs)));
				}
			}
		}
		
		return rsi;
	}
	
	calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod) {
		const fastEMA = this.calculateEMA(prices, fastPeriod);
		const slowEMA = this.calculateEMA(prices, slowPeriod);
		
		const macdLine = fastEMA.map((fast, i) => fast !== null && slowEMA[i] !== null ? fast - slowEMA[i] : null);
		const signalLine = this.calculateEMA(macdLine.filter(v => v !== null), signalPeriod);
		
		// Pad signal line to match macd length
		const paddedSignal = new Array(macdLine.length - signalLine.length).fill(null).concat(signalLine);
		const histogram = macdLine.map((macd, i) => macd !== null && paddedSignal[i] !== null ? macd - paddedSignal[i] : null);
		
		return {
			macd: macdLine,
			signal: paddedSignal,
			histogram
		};
	}
	
	calculateEMA(prices, period) {
		const ema = [];
		const multiplier = 2 / (period + 1);
		
		// First EMA value is SMA
		let sum = 0;
		for (let i = 0; i < period && i < prices.length; i++) {
			sum += prices[i];
		}
		if (prices.length >= period) {
			ema.push(...new Array(period - 1).fill(null));
			ema.push(sum / period);
			
			// Calculate subsequent EMA values
			for (let i = period; i < prices.length; i++) {
				const emaValue = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
				ema.push(emaValue);
			}
		}
		
		return ema;
	}
	
	calculateBollingerBands(prices, period, stdDev) {
		const ma = this.calculateMA(prices, period);
		const upper = [];
		const lower = [];
		
		for (let i = 0; i < prices.length; i++) {
			if (ma[i] === null) {
				upper.push(null);
				lower.push(null);
			} else {
				// Calculate standard deviation
				const slice = prices.slice(Math.max(0, i - period + 1), i + 1);
				const mean = ma[i];
				const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / slice.length;
				const std = Math.sqrt(variance);
				
				upper.push(mean + (std * stdDev));
				lower.push(mean - (std * stdDev));
			}
		}
		
		return {
			upper,
			middle: ma,
			lower
		};
	}
	
	calculateATR(highs, lows, closes, period) {
		const tr = []; // True Range
		
		for (let i = 1; i < highs.length; i++) {
			const tr1 = highs[i] - lows[i];
			const tr2 = Math.abs(highs[i] - closes[i - 1]);
			const tr3 = Math.abs(lows[i] - closes[i - 1]);
			tr.push(Math.max(tr1, tr2, tr3));
		}
		
		const atr = [];
		for (let i = 0; i < closes.length; i++) {
			if (i < period) {
				atr.push(null);
			} else {
				const sum = tr.slice(i - period, i).reduce((a, b) => a + b, 0);
				atr.push(sum / period);
			}
		}
		
		return atr;
	}
	
	calculateStochastic(highs, lows, closes, period) {
		const stochastic = [];
		
		for (let i = 0; i < closes.length; i++) {
			if (i < period - 1) {
				stochastic.push(null);
			} else {
				const periodHighs = highs.slice(i - period + 1, i + 1);
				const periodLows = lows.slice(i - period + 1, i + 1);
				const highestHigh = Math.max(...periodHighs);
				const lowestLow = Math.min(...periodLows);
				
				if (highestHigh === lowestLow) {
					stochastic.push(50); // Neutral value when high == low
				} else {
					const k = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
					stochastic.push(k);
				}
			}
		}
		
		return stochastic;
	}
	
	calculateWilliamsR(highs, lows, closes, period) {
		const williamsR = [];
		
		for (let i = 0; i < closes.length; i++) {
			if (i < period - 1) {
				williamsR.push(null);
			} else {
				const periodHighs = highs.slice(i - period + 1, i + 1);
				const periodLows = lows.slice(i - period + 1, i + 1);
				const highestHigh = Math.max(...periodHighs);
				const lowestLow = Math.min(...periodLows);
				
				if (highestHigh === lowestLow) {
					williamsR.push(-50); // Neutral value when high == low
				} else {
					const wr = ((highestHigh - closes[i]) / (highestHigh - lowestLow)) * -100;
					williamsR.push(wr);
				}
			}
		}
		
		return williamsR;
	}
	
	generateTrades(strategy, params, indicators) {
		const trades = [];
		let position = null; // { type: 'long'|'short', entryPrice, entryIndex, stopLoss, takeProfit }
		const capital = this.initialCapital;
		let cash = capital;
		let shares = 0;
		let peakEquity = capital; // Track peak equity for overall stop loss
		
		// Debug counters
		let signalsGenerated = 0;
		let signalsIgnored = 0;
		let tradesOpened = 0;
		
		for (let i = 1; i < this.priceData.length; i++) {
			const currentPrice = this.priceData[i].close;
			const prevPrice = this.priceData[i - 1].close;
			
			// Calculate current equity
			let currentEquity;
			if (position) {
				if (position.type === 'long') {
					currentEquity = cash + (shares * currentPrice);
				} else {
					// Short: equity = cash - (currentPrice * shares)
					// Cash already includes proceeds from short sale
					// To close position, we need to buy back at currentPrice
					currentEquity = cash - (currentPrice * shares);
				}
			} else {
				currentEquity = cash;
			}
			if (currentEquity > peakEquity) {
				peakEquity = currentEquity;
			}
			
			// Check overall stop loss (portfolio-wide)
			if (this.overallStopLoss < 1.0) {
				const currentLossPercent = ((peakEquity - currentEquity) / this.initialCapital);
				// User enters percentage (e.g., 5%), we convert to decimal (0.05)
				// Stop when we've lost 5% of initial capital (overallStopLoss = 0.05)
				if (currentLossPercent >= (1 - this.overallStopLoss)) {
					// Close all positions and stop trading
					if (position) {
						const profit = position.type === 'long' 
							? (currentPrice - position.entryPrice) * shares
							: (position.entryPrice - currentPrice) * shares;
						const commission = (position.entryPrice + currentPrice) * shares * this.commission;
						const netProfit = profit - commission;
						
						trades.push({
							entryDate: this.priceData[position.entryIndex].date,
							exitDate: this.priceData[i].date,
							entryPrice: position.entryPrice,
							exitPrice: currentPrice,
							type: position.type,
							shares: shares,
							profit: netProfit,
							return: (netProfit / (position.entryPrice * shares)) * 100,
							exitReason: 'Overall Stop Loss',
							holdingPeriod: i - position.entryIndex
						});
						
						if (position.type === 'long') {
							// Long: sell shares, receive cash
							cash += currentPrice * shares * (1 - this.commission);
						} else {
							// Short: buy back shares, pay cash
							cash -= currentPrice * shares * (1 + this.commission);
						}
						shares = 0;
						position = null;
					}
					// Stop generating new trades
					continue;
				}
			}
			
			// Check overall take profit (portfolio-wide)
			if (this.overallTakeProfit < 1.0) {
				const currentGainPercent = ((currentEquity - this.initialCapital) / this.initialCapital);
				// User enters percentage (e.g., 50%), we convert to decimal (0.50)
				// Take profit when we've gained 50% of initial capital (overallTakeProfit = 0.50)
				if (currentGainPercent >= this.overallTakeProfit) {
					// Close all positions and stop trading
					if (position) {
						const profit = position.type === 'long' 
							? (currentPrice - position.entryPrice) * shares
							: (position.entryPrice - currentPrice) * shares;
						const commission = (position.entryPrice + currentPrice) * shares * this.commission;
						const netProfit = profit - commission;
						
						trades.push({
							entryDate: this.priceData[position.entryIndex].date,
							exitDate: this.priceData[i].date,
							entryPrice: position.entryPrice,
							exitPrice: currentPrice,
							type: position.type,
							shares: shares,
							profit: netProfit,
							return: (netProfit / (position.entryPrice * shares)) * 100,
							exitReason: 'Overall Take Profit',
							holdingPeriod: i - position.entryIndex
						});
						
						if (position.type === 'long') {
							// Long: sell shares, receive cash
							cash += currentPrice * shares * (1 - this.commission);
						} else {
							// Short: buy back shares, pay cash
							cash -= currentPrice * shares * (1 + this.commission);
						}
						shares = 0;
						position = null;
					}
					// Stop generating new trades
					continue;
				}
			}
			
			// Generate strategy signals (always, regardless of position)
			let signal = null;
			
			// Combined Strategy: Multiple conditions must all be true (AND logic)
			if (strategy === 'combined_strategy' && params.conditions && params.conditions.length > 0) {
				let allConditionsMet = true;
				let canEvaluateAllConditions = true; // Track if all conditions can be evaluated
				
				// Debug: Log on first few iterations
				if (i < 5) {
					console.log(`[Combined Strategy] Day ${i}, Conditions:`, params.conditions.map(c => `${c.type} (${c.description})`));
				}
				
				for (const condition of params.conditions) {
					let conditionMet = false;
					let conditionEvaluable = false; // Track if this condition can be evaluated
					
					// Price drop condition
					if (condition.type === 'price_drop') {
						if (i > 0) {
							const prevClose = this.priceData[i - 1].close;
							const dayChange = (currentPrice - prevClose) / prevClose;
							conditionMet = dayChange < 0 && Math.abs(dayChange) >= condition.params.threshold;
							conditionEvaluable = true;
							
							// Debug: Log price drop evaluation (show more when price drop condition is met)
							if ((i < 20 && dayChange < 0) || (conditionMet && i < 50)) {
								console.log(`[Combined Strategy] Day ${i}: Price drop ${(Math.abs(dayChange) * 100).toFixed(2)}%, threshold: ${(condition.params.threshold * 100).toFixed(2)}%, met: ${conditionMet}`);
							}
						}
					}
					// Price increase condition
					else if (condition.type === 'price_increase') {
						if (i > 0) {
							const prevClose = this.priceData[i - 1].close;
							const dayChange = (currentPrice - prevClose) / prevClose;
							conditionMet = dayChange >= condition.params.threshold;
							conditionEvaluable = true;
						}
					}
					// RSI below condition
					else if (condition.type === 'rsi_below') {
						// Check if RSI doesn't exist or is empty array
						if (!indicators.rsi || !Array.isArray(indicators.rsi) || indicators.rsi.length === 0) {
							indicators.rsi = this.calculateRSI(this.priceData.map(d => d.close), 14);
							console.log(`[Combined Strategy] RSI calculated in generateTrades, length: ${indicators.rsi.length}, first non-null at index: ${indicators.rsi.findIndex(v => v !== null)}`);
						}
						
						// Check if price drop condition is met (for debugging)
						let priceDropMet = false;
						const priceDropCondition = params.conditions.find(c => c.type === 'price_drop');
						if (priceDropCondition && i > 0) {
							const prevClose = this.priceData[i - 1].close;
							const dayChange = (currentPrice - prevClose) / prevClose;
							priceDropMet = dayChange < 0 && Math.abs(dayChange) >= priceDropCondition.params.threshold;
						}
						
						// Check RSI value
						if (indicators.rsi && indicators.rsi.length > i) {
							if (indicators.rsi[i] !== null && !isNaN(indicators.rsi[i])) {
								conditionMet = indicators.rsi[i] < condition.params.threshold;
								conditionEvaluable = true;
								
								// Debug: Log RSI evaluation, especially when price drop is met
								if (i >= 14 && (priceDropMet || i < 30)) {
									console.log(`[Combined Strategy] Day ${i}: RSI ${indicators.rsi[i].toFixed(2)}, threshold: ${condition.params.threshold}, met: ${conditionMet}, priceDropMet: ${priceDropMet}`);
								}
							} else {
								// Debug: Log when RSI is null, especially when price drop is met
								if (i >= 14 && priceDropMet) {
									console.log(`[Combined Strategy] Day ${i}: ⚠️ RSI is null or NaN at index ${i}, RSI array length: ${indicators.rsi.length}, RSI[${i}]: ${indicators.rsi[i]}, priceDropMet: ${priceDropMet}`);
								} else if (i < 20) {
									console.log(`[Combined Strategy] Day ${i}: RSI is null or NaN (RSI needs 14 periods, available from day 14)`);
								}
							}
						} else {
							console.log(`[Combined Strategy] Day ${i}: ⚠️ RSI array issue - length: ${indicators.rsi ? indicators.rsi.length : 'undefined'}, accessing index: ${i}`);
						}
					}
					// RSI above condition
					else if (condition.type === 'rsi_above') {
						if (!indicators.rsi) {
							indicators.rsi = this.calculateRSI(this.priceData.map(d => d.close), 14);
						}
						if (indicators.rsi[i] !== null && !isNaN(indicators.rsi[i])) {
							conditionMet = indicators.rsi[i] > condition.params.threshold;
							conditionEvaluable = true;
						}
					}
					// Volume above average
					else if (condition.type === 'volume_above') {
						if (!indicators.avgVolume) {
							indicators.avgVolume = this.calculateMA(this.priceData.map(d => d.volume), condition.params.period);
						}
						if (indicators.avgVolume[i] !== null && this.priceData[i].volume) {
							conditionMet = this.priceData[i].volume > indicators.avgVolume[i];
							conditionEvaluable = true;
						}
					}
					// Volume below average
					else if (condition.type === 'volume_below') {
						if (!indicators.avgVolume) {
							indicators.avgVolume = this.calculateMA(this.priceData.map(d => d.volume), condition.params.period);
						}
						if (indicators.avgVolume[i] !== null && this.priceData[i].volume) {
							conditionMet = this.priceData[i].volume < indicators.avgVolume[i];
							conditionEvaluable = true;
						}
					}
					// Price above MA
					else if (condition.type === 'price_above_ma') {
						const maKey = `ma${condition.params.period}`;
						if (!indicators.ma[maKey]) {
							indicators.ma[maKey] = this.calculateMA(this.priceData.map(d => d.close), condition.params.period);
						}
						if (indicators.ma[maKey][i] !== null && !isNaN(indicators.ma[maKey][i])) {
							conditionMet = currentPrice > indicators.ma[maKey][i];
							conditionEvaluable = true;
						}
					}
					// Price below MA
					else if (condition.type === 'price_below_ma') {
						const maKey = `ma${condition.params.period}`;
						if (!indicators.ma[maKey]) {
							indicators.ma[maKey] = this.calculateMA(this.priceData.map(d => d.close), condition.params.period);
						}
						if (indicators.ma[maKey][i] !== null && !isNaN(indicators.ma[maKey][i])) {
							conditionMet = currentPrice < indicators.ma[maKey][i];
							conditionEvaluable = true;
						}
					}
					// MACD cross above
					else if (condition.type === 'macd_cross_above') {
						if (!indicators.macd.macd.length) {
							indicators.macd = this.calculateMACD(this.priceData.map(d => d.close), 12, 26, 9);
						}
						if (indicators.macd.macd[i] !== null && indicators.macd.signal[i] !== null && i > 0) {
							const macdAbove = indicators.macd.macd[i] > indicators.macd.signal[i];
							const prevMacdAbove = indicators.macd.macd[i - 1] > indicators.macd.signal[i - 1];
							conditionMet = macdAbove && !prevMacdAbove;
							conditionEvaluable = true;
						}
					}
					// MACD cross below
					else if (condition.type === 'macd_cross_below') {
						if (!indicators.macd.macd.length) {
							indicators.macd = this.calculateMACD(this.priceData.map(d => d.close), 12, 26, 9);
						}
						if (indicators.macd.macd[i] !== null && indicators.macd.signal[i] !== null && i > 0) {
							const macdAbove = indicators.macd.macd[i] > indicators.macd.signal[i];
							const prevMacdAbove = indicators.macd.macd[i - 1] > indicators.macd.signal[i - 1];
							conditionMet = !macdAbove && prevMacdAbove;
							conditionEvaluable = true;
						}
					}
					// Bollinger lower
					else if (condition.type === 'bollinger_lower') {
						if (!indicators.bollinger.upper.length) {
							indicators.bollinger = this.calculateBollingerBands(this.priceData.map(d => d.close), condition.params.period, 2);
						}
						if (indicators.bollinger.lower[i] !== null && i > 0) {
							conditionMet = currentPrice <= indicators.bollinger.lower[i] && prevPrice > indicators.bollinger.lower[i];
							conditionEvaluable = true;
						}
					}
					// Bollinger upper
					else if (condition.type === 'bollinger_upper') {
						if (!indicators.bollinger.upper.length) {
							indicators.bollinger = this.calculateBollingerBands(this.priceData.map(d => d.close), condition.params.period, 2);
						}
						if (indicators.bollinger.upper[i] !== null && i > 0) {
							conditionMet = currentPrice >= indicators.bollinger.upper[i] && prevPrice < indicators.bollinger.upper[i];
							conditionEvaluable = true;
						}
					}
					// Stochastic below
					else if (condition.type === 'stochastic_below') {
						if (!indicators.stochastic) {
							indicators.stochastic = this.calculateStochastic(
								this.priceData.map(d => d.high),
								this.priceData.map(d => d.low),
								this.priceData.map(d => d.close),
								14
							);
						}
						if (indicators.stochastic[i] !== null && !isNaN(indicators.stochastic[i])) {
							conditionMet = indicators.stochastic[i] < condition.params.threshold;
							conditionEvaluable = true;
						}
					}
					// Williams %R below
					else if (condition.type === 'williams_r_below') {
						if (!indicators.williamsR) {
							indicators.williamsR = this.calculateWilliamsR(
								this.priceData.map(d => d.high),
								this.priceData.map(d => d.low),
								this.priceData.map(d => d.close),
								14
							);
						}
						if (indicators.williamsR[i] !== null && !isNaN(indicators.williamsR[i])) {
							conditionMet = indicators.williamsR[i] < condition.params.threshold;
							conditionEvaluable = true;
						}
					}
					
					// If condition couldn't be evaluated (indicator is null), skip this day
					if (!conditionEvaluable) {
						canEvaluateAllConditions = false;
						break; // Break early, can't evaluate all conditions
					}
					
					// If condition was evaluated but not met, mark as failed
					if (!conditionMet) {
						allConditionsMet = false;
						break;
					}
				}
				
				// Only generate signal if all conditions can be evaluated AND all are met
				if (canEvaluateAllConditions && allConditionsMet) {
					signal = 'long';
					// Always log when signal is generated
					console.log(`[Combined Strategy] Day ${i} (${this.priceData[i].date}): ✅ BUY SIGNAL generated! All conditions met.`);
				} else if (i < 20 || (i >= 14 && i < 30)) {
					if (!canEvaluateAllConditions) {
						console.log(`[Combined Strategy] Day ${i}: ⚠️ Cannot evaluate all conditions, skipping (likely RSI not available yet).`);
					} else if (!allConditionsMet) {
						// Only log occasionally to avoid spam
						if (i < 20 || i % 10 === 0) {
							console.log(`[Combined Strategy] Day ${i}: ❌ Conditions not met.`);
						}
					}
				}
				
				// Check for exit condition if position is open
				if (position && position.type === 'long' && this.parsedStrategy && this.parsedStrategy.hasExitCondition) {
					// For now, use standard exit conditions (stop loss, take profit, etc.)
					// Exit conditions for combined strategies can be added later
				}
			}
			// Daily Drop Strategy: Buy when stock falls X% in a day, sell after N days
			else if (strategy === 'daily_drop_strategy') {
				if (i > 0) {
					const prevClose = this.priceData[i - 1].close;
					const currentClose = this.priceData[i].close;
					const dayChange = (currentClose - prevClose) / prevClose;
					const dayChangePercent = Math.abs(dayChange) * 100;
					
					// Check if stock fell by the threshold percentage (negative change)
					if (dayChange < 0 && dayChangePercent >= params.dropThreshold * 100) {
						signal = 'long'; // Buy signal when stock falls
					}
					
					// Check if we should exit based on holding period (only if specified)
					if (position && position.type === 'long' && params.holdDays !== null && params.holdDays !== undefined) {
						const daysHeld = i - position.entryIndex;
						if (daysHeld >= params.holdDays) {
							signal = 'short'; // Sell signal (or exit signal) after holding period
						}
					}
				}
			}
			// Price Change Strategy: Buy when price increases/decreases by X% over N periods
			else if (strategy === 'price_change_strategy') {
				const lookback = params.lookbackPeriod;
				if (i >= lookback) {
					const pastPrice = this.priceData[i - lookback].close;
					const priceChange = (currentPrice - pastPrice) / pastPrice;
					
					// Check if price change meets threshold
					if (params.changeThreshold > 0 && priceChange >= params.changeThreshold) {
						signal = 'long'; // Buy on increase
					} else if (params.changeThreshold < 0 && priceChange <= params.changeThreshold) {
						signal = 'long'; // Buy on decrease (oversold)
					}
					
					// Exit condition: only if explicitly specified or if exitAfter is set
					if (position && position.type === 'long') {
						// Check for time-based exit
						if (params.exitAfter !== null && params.exitAfter !== undefined) {
							const daysHeld = i - position.entryIndex;
							const exitDays = params.exitUnit === 'week' ? params.exitAfter * 7 : 
							                 (params.exitUnit === 'month' ? params.exitAfter * 30 : params.exitAfter);
							if (daysHeld >= exitDays) {
								signal = 'short';
							}
						}
						// Otherwise, only exit on opposite signal if strategy has exit condition
						else if (this.parsedStrategy && this.parsedStrategy.hasExitCondition) {
						if (params.changeThreshold > 0 && priceChange < 0) {
							signal = 'short'; // Sell if price starts falling
						} else if (params.changeThreshold < 0 && priceChange > 0) {
							signal = 'short'; // Sell if price starts rising
							}
						}
					}
				}
			}
			// Generic Strategy: Try to interpret buy/sell conditions
			else if (strategy === 'generic_strategy') {
				// For generic strategies, we'll try to match common patterns
				// This is a fallback - ideally these should be parsed more specifically
				if (params.buyCondition && params.sellCondition) {
					// Try to match conditions (simplified - could be enhanced)
					const buyCond = params.buyCondition.toLowerCase();
					const sellCond = params.sellCondition.toLowerCase();
					
					// Simple pattern matching for common conditions
					if (buyCond.includes('rsi') && buyCond.includes('below')) {
						// Try to use RSI
						if (indicators.rsi && indicators.rsi[i] !== null) {
							const rsiValue = indicators.rsi[i];
							const threshold = parseInt(buyCond.match(/(\d+)/)?.[1]) || 30;
							if (rsiValue < threshold) {
								signal = 'long';
							}
						}
					}
					
					if (sellCond.includes('rsi') && sellCond.includes('above')) {
						if (indicators.rsi && indicators.rsi[i] !== null) {
							const rsiValue = indicators.rsi[i];
							const threshold = parseInt(sellCond.match(/(\d+)/)?.[1]) || 70;
							if (rsiValue > threshold) {
								signal = 'short';
							}
						}
					}
				}
			}
			else if (strategy === 'ma_crossover') {
				if (i >= params.slowMA - 1 && indicators.ma.fast[i] && indicators.ma.slow[i]) {
					const fastAbove = indicators.ma.fast[i] > indicators.ma.slow[i];
					const prevFastAbove = indicators.ma.fast[i - 1] > indicators.ma.slow[i - 1];
					
					if (fastAbove && !prevFastAbove) {
						signal = 'long';
					} else if (this.parsedStrategy && this.parsedStrategy.hasExitCondition && 
					           !fastAbove && prevFastAbove) {
						signal = 'short';
					}
				}
			} else if (strategy === 'ma_price_strategy') {
				// Calculate MA if not already calculated
				if (!indicators.ma.price) {
					indicators.ma.price = this.calculateMA(this.priceData.map(d => d.close), params.maPeriod);
				}
				if (indicators.ma.price[i] !== null) {
					const isAbove = currentPrice > indicators.ma.price[i];
					const prevIsAbove = prevPrice > indicators.ma.price[i - 1];
					
					if (params.condition === 'above' && isAbove && !prevIsAbove) {
						signal = 'long';
					} else if (params.condition === 'below' && !isAbove && prevIsAbove) {
						signal = 'long';
					} else if (this.parsedStrategy && this.parsedStrategy.hasExitCondition) {
						if (params.condition === 'above' && !isAbove && prevIsAbove) {
							signal = 'short';
						} else if (params.condition === 'below' && isAbove && !prevIsAbove) {
							signal = 'short';
						}
					}
				}
			} else if (strategy === 'rsi_strategy') {
				if (indicators.rsi[i] !== null) {
					if (indicators.rsi[i] < params.oversold && indicators.rsi[i - 1] >= params.oversold) {
						signal = 'long';
					} else if (this.parsedStrategy && this.parsedStrategy.hasExitCondition && 
					           indicators.rsi[i] > params.overbought && indicators.rsi[i - 1] <= params.overbought) {
						signal = 'short';
					}
				}
			} else if (strategy === 'macd_strategy') {
				if (indicators.macd.macd[i] !== null && indicators.macd.signal[i] !== null) {
					const macdAbove = indicators.macd.macd[i] > indicators.macd.signal[i];
					const prevMacdAbove = indicators.macd.macd[i - 1] > indicators.macd.signal[i - 1];
					
					if (macdAbove && !prevMacdAbove) {
						signal = 'long';
					} else if (this.parsedStrategy && this.parsedStrategy.hasExitCondition && 
					           !macdAbove && prevMacdAbove) {
						signal = 'short';
					}
				}
			} else if (strategy === 'bollinger_strategy') {
				if (indicators.bollinger.upper[i] && indicators.bollinger.lower[i]) {
					if (params.band === 'lower' && currentPrice <= indicators.bollinger.lower[i] && prevPrice > indicators.bollinger.lower[i]) {
						signal = 'long';
					} else if (params.band === 'upper' && currentPrice >= indicators.bollinger.upper[i] && prevPrice < indicators.bollinger.upper[i]) {
						signal = 'long';
					} else if (this.parsedStrategy && this.parsedStrategy.hasExitCondition) {
						if (params.band === 'lower' && currentPrice >= indicators.bollinger.upper[i] && prevPrice < indicators.bollinger.upper[i]) {
							signal = 'short';
						} else if (params.band === 'upper' && currentPrice <= indicators.bollinger.lower[i] && prevPrice > indicators.bollinger.lower[i]) {
						signal = 'short';
						}
					}
				}
			} else if (strategy === 'mean_reversion') {
				if (i >= params.lookback) {
					const slice = this.priceData.slice(i - params.lookback, i).map(d => d.close);
					const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
					const std = Math.sqrt(slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / slice.length);
					
					if (currentPrice < mean - (std * params.threshold)) {
						signal = 'long';
					} else if (this.parsedStrategy && this.parsedStrategy.hasExitCondition && 
					           currentPrice > mean + (std * params.threshold)) {
						signal = 'short';
					}
				}
			} else if (strategy === 'momentum') {
				if (i >= params.period) {
					const momentum = (currentPrice / this.priceData[i - params.period].close - 1) * 100;
					
					if (momentum > params.threshold * 100) {
						signal = 'long';
					} else if (this.parsedStrategy && this.parsedStrategy.hasExitCondition && 
					           momentum < -params.threshold * 100) {
						signal = 'short';
					}
				}
			} else if (strategy === 'volume_strategy') {
				// Calculate average volume
				if (!indicators.avgVolume) {
					const volumes = this.priceData.map(d => d.volume);
					indicators.avgVolume = this.calculateMA(volumes, params.volumePeriod);
				}
				if (indicators.avgVolume[i] !== null && this.priceData[i].volume) {
					const isAbove = this.priceData[i].volume > indicators.avgVolume[i];
					const prevIsAbove = this.priceData[i - 1].volume > indicators.avgVolume[i - 1];
					
					if (params.volumeCondition === 'above' && isAbove && !prevIsAbove && currentPrice > prevPrice) {
						signal = 'long';
					} else if (params.volumeCondition === 'below' && !isAbove && prevIsAbove) {
						signal = 'long';
					}
				}
			} else if (strategy === 'support_resistance_strategy') {
				if (params.level) {
					const isAbove = currentPrice > params.level;
					const prevIsAbove = prevPrice > params.level;
					
					if (params.levelType === 'support' && !isAbove && prevIsAbove) {
						signal = 'long'; // Price breaks below support
					} else if (params.levelType === 'resistance' && isAbove && !prevIsAbove) {
						signal = 'long'; // Price breaks above resistance
					} else if (this.parsedStrategy && this.parsedStrategy.hasExitCondition) {
						if (params.levelType === 'support' && isAbove && !prevIsAbove) {
							signal = 'short';
						} else if (params.levelType === 'resistance' && !isAbove && prevIsAbove) {
							signal = 'short';
						}
					}
				}
			} else if (strategy === 'stochastic_strategy') {
				// Calculate Stochastic if not already calculated
				if (!indicators.stochastic) {
					indicators.stochastic = this.calculateStochastic(
						this.priceData.map(d => d.high),
						this.priceData.map(d => d.low),
						this.priceData.map(d => d.close),
						params.period || 14
					);
				}
				if (indicators.stochastic[i] !== null) {
					if (indicators.stochastic[i] < params.oversold && indicators.stochastic[i - 1] >= params.oversold) {
						signal = 'long';
					} else if (this.parsedStrategy && this.parsedStrategy.hasExitCondition && 
					           indicators.stochastic[i] > params.overbought && indicators.stochastic[i - 1] <= params.overbought) {
						signal = 'short';
					}
				}
			} else if (strategy === 'williams_r_strategy') {
				// Calculate Williams %R if not already calculated
				if (!indicators.williamsR) {
					indicators.williamsR = this.calculateWilliamsR(
						this.priceData.map(d => d.high),
						this.priceData.map(d => d.low),
						this.priceData.map(d => d.close),
						params.period || 14
					);
				}
				if (indicators.williamsR[i] !== null) {
					if (indicators.williamsR[i] < params.oversold && indicators.williamsR[i - 1] >= params.oversold) {
						signal = 'long';
					} else if (this.parsedStrategy && this.parsedStrategy.hasExitCondition && 
					           indicators.williamsR[i] > params.overbought && indicators.williamsR[i - 1] <= params.overbought) {
						signal = 'short';
					}
				}
			}
			
			// Check for exit conditions first (including strategy signals that indicate exit)
			if (position) {
				let shouldExit = false;
				let exitReason = '';
				
				// Strategy signal-based exit:
				// - If we have a Long position and strategy generates a Short signal (and Short not allowed), close Long
				// - If we have a Short position and strategy generates a Long signal, close Short
				if (signal) {
					if (position.type === 'long' && signal === 'short' && !this.allowShort) {
						// Short signal when Short not allowed = sell signal for Long position
						shouldExit = true;
						exitReason = 'Strategy Signal (Sell)';
					} else if (position.type === 'short' && signal === 'long') {
						// Long signal = buy signal to close Short position
						shouldExit = true;
						exitReason = 'Strategy Signal (Buy to Close)';
					}
				}
				
				// Per trade stop loss
				if (!shouldExit && this.perTradeStopLoss < 1.0) {
					if (position.type === 'long' && currentPrice <= position.stopLoss) {
						shouldExit = true;
						exitReason = 'Stop Loss';
					} else if (position.type === 'short' && currentPrice >= position.stopLoss) {
						shouldExit = true;
						exitReason = 'Stop Loss';
					}
				}
				
				// Per trade take profit
				if (!shouldExit && this.perTradeTakeProfit < 1.0) {
					if (position.type === 'long') {
						const profitPercent = ((currentPrice - position.entryPrice) / position.entryPrice);
						if (profitPercent >= this.perTradeTakeProfit) {
							shouldExit = true;
							exitReason = 'Take Profit';
						}
					} else if (position.type === 'short') {
						const profitPercent = ((position.entryPrice - currentPrice) / position.entryPrice);
						if (profitPercent >= this.perTradeTakeProfit) {
							shouldExit = true;
							exitReason = 'Take Profit';
						}
					}
				}
				
				// Maximum holding period
				if (!shouldExit && this.maxHoldingPeriod !== null) {
					const holdingPeriod = i - position.entryIndex;
					if (holdingPeriod >= this.maxHoldingPeriod) {
						shouldExit = true;
						exitReason = 'Max Holding Period';
					}
				}
				
				if (shouldExit) {
					const profit = position.type === 'long' 
						? (currentPrice - position.entryPrice) * shares
						: (position.entryPrice - currentPrice) * shares;
					const commission = (position.entryPrice + currentPrice) * shares * this.commission;
					const netProfit = profit - commission;
					
					trades.push({
						entryDate: this.priceData[position.entryIndex].date,
						exitDate: this.priceData[i].date,
						entryPrice: position.entryPrice,
						exitPrice: currentPrice,
						type: position.type,
						shares: shares,
						profit: netProfit,
						return: (netProfit / (position.entryPrice * shares)) * 100,
						exitReason,
						holdingPeriod: i - position.entryIndex
					});
					
					if (position.type === 'long') {
						// Long: sell shares, receive cash
						cash += currentPrice * shares * (1 - this.commission);
					} else {
						// Short: buy back shares, pay cash
						cash -= currentPrice * shares * (1 + this.commission);
					}
					shares = 0;
					const cashAfterExit = cash; // Store cash after exit for debugging
					position = null;
					
					// Debug: Log position closure
					if (trades.length <= 5 || trades.length % 10 === 0) {
						console.log(`[Backtesting] Position closed on ${this.priceData[i].date}: ${exitReason}, Cash after exit: $${cashAfterExit.toFixed(2)}, Signal available: ${signal || 'none'}`);
					}
					
					// If we closed a position due to a strategy signal, don't use that signal to open a new position
					// (we already acted on it by closing the position)
					if (exitReason.includes('Strategy Signal')) {
						signal = null;
					}
					// For Stop Loss, Take Profit, or Max Holding Period exits, regenerate the signal
					// because the market conditions may have changed and we want to check if we should enter again
					else if (exitReason.includes('Stop Loss') || exitReason.includes('Take Profit') || exitReason.includes('Max Holding Period')) {
						// Regenerate signal after closing position to see if we should enter again
						// This helps catch cases where the signal was generated but we couldn't use it
						// because we had an open position
						signal = null; // Reset signal first
						
						// Regenerate signal based on current market conditions
						if (strategy === 'ma_crossover') {
							if (i >= params.slowMA - 1 && indicators.ma.fast[i] && indicators.ma.slow[i]) {
								const fastAbove = indicators.ma.fast[i] > indicators.ma.slow[i];
								const prevFastAbove = indicators.ma.fast[i - 1] > indicators.ma.slow[i - 1];
								
								if (fastAbove && !prevFastAbove) {
									signal = 'long';
								} else if (!fastAbove && prevFastAbove) {
									signal = 'short';
								}
							}
						} else if (strategy === 'rsi_strategy') {
							if (indicators.rsi[i] !== null) {
								if (indicators.rsi[i] < params.oversold && indicators.rsi[i - 1] >= params.oversold) {
									signal = 'long';
								} else if (indicators.rsi[i] > params.overbought && indicators.rsi[i - 1] <= params.overbought) {
									signal = 'short';
								}
							}
						} else if (strategy === 'macd_strategy') {
							if (indicators.macd.macd[i] !== null && indicators.macd.signal[i] !== null) {
								const macdAbove = indicators.macd.macd[i] > indicators.macd.signal[i];
								const prevMacdAbove = indicators.macd.macd[i - 1] > indicators.macd.signal[i - 1];
								
								if (macdAbove && !prevMacdAbove) {
									signal = 'long';
								} else if (!macdAbove && prevMacdAbove) {
									signal = 'short';
								}
							}
						} else if (strategy === 'bollinger_strategy') {
							if (indicators.bollinger.upper[i] && indicators.bollinger.lower[i]) {
								if (currentPrice <= indicators.bollinger.lower[i] && prevPrice > indicators.bollinger.lower[i]) {
									signal = 'long';
								} else if (currentPrice >= indicators.bollinger.upper[i] && prevPrice < indicators.bollinger.upper[i]) {
									signal = 'short';
								}
							}
						} else if (strategy === 'mean_reversion') {
							if (i >= params.lookback) {
								const slice = this.priceData.slice(i - params.lookback, i).map(d => d.close);
								const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
								const std = Math.sqrt(slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / slice.length);
								
								if (currentPrice < mean - (std * params.threshold)) {
									signal = 'long';
								} else if (currentPrice > mean + (std * params.threshold)) {
									signal = 'short';
								}
							}
						} else if (strategy === 'momentum') {
							if (i >= params.period) {
								const momentum = (currentPrice / this.priceData[i - params.period].close - 1) * 100;
								
								if (momentum > params.threshold * 100) {
									signal = 'long';
								} else if (momentum < -params.threshold * 100) {
									signal = 'short';
								}
							}
						}
					}
				}
			}
			
			// Check for entry signals (only if no position is open and we have a valid signal)
			// This includes cases where we just closed a position and have a signal ready
			if (!position && signal) {
				signalsGenerated++;
				// Debug: Log signal generation
				if (signalsGenerated <= 5) {
					console.log(`[Trade Generation] Day ${i}: Signal generated: ${signal}, Date: ${this.priceData[i].date}, Price: $${currentPrice.toFixed(2)}`);
				}
				
				// Check if short trades are allowed
				if (signal === 'short' && !this.allowShort) {
					signal = null; // Ignore short signals if not allowed
					signalsIgnored++;
				}
				
				if (signal) {
					if (signal === 'long') {
						shares = Math.floor(cash / (currentPrice * (1 + this.commission)));
						if (shares > 0) {
							const cost = currentPrice * shares * (1 + this.commission);
							cash -= cost;
						} else {
							// Debug: Log when we can't open a position due to insufficient cash
							if (trades.length <= 5 || trades.length % 10 === 0) {
								console.log(`[Backtesting] Long signal on ${this.priceData[i].date} but insufficient cash: $${cash.toFixed(2)}, Price: $${currentPrice.toFixed(2)}, Required: $${(currentPrice * (1 + this.commission)).toFixed(2)}`);
							}
						}
					} else {
						// Short: calculate shares based on available cash
						// When shorting, we receive proceeds from selling shares
						// For margin requirement, we assume we can short shares worth up to our cash
						shares = Math.floor(cash / (currentPrice * (1 + this.commission)));
						if (shares > 0) {
							// Short: sell shares, receive cash proceeds (minus commission)
							// The proceeds are added to cash, but we track the position separately
							const proceeds = currentPrice * shares * (1 - this.commission);
							cash += proceeds;
						} else {
							// Debug: Log when we can't open a position due to insufficient cash
							if (trades.length <= 5 || trades.length % 10 === 0) {
								console.log(`[Backtesting] Short signal on ${this.priceData[i].date} but insufficient cash: $${cash.toFixed(2)}, Price: $${currentPrice.toFixed(2)}, Required: $${(currentPrice * (1 + this.commission)).toFixed(2)}`);
							}
						}
					}
					
					// Note: If shares = 0, it means insufficient cash to open a new position
					// This is correct behavior - we can only trade with available cash
					// The strategy will continue to check for signals, but won't open trades until cash is available
					
					if (shares > 0) {
						tradesOpened++;
						// Calculate stop loss based on per trade stop loss setting
						// User enters percentage (e.g., 5%), we convert to decimal (0.05)
						// For long: stop when price drops to entry * 0.95 (5% loss)
						// For short: stop when price rises to entry * 1.05 (5% loss)
						const lossThreshold = 1 - this.perTradeStopLoss; // e.g., 1 - 0.05 = 0.95
						const stopLossPrice = this.perTradeStopLoss < 1.0
							? (signal === 'long' 
								? currentPrice * lossThreshold
								: currentPrice / lossThreshold)
							: null; // No stop loss if 100%
						
						position = {
							type: signal,
							entryPrice: currentPrice,
							entryIndex: i,
							stopLoss: stopLossPrice
						};
					} else if (signal) {
						// Signal generated but insufficient cash to open position
						signalsIgnored++;
					}
				}
			}
		}
		
		// Debug: Log statistics
		console.log(`[Backtesting] Trade Generation Stats:`);
		console.log(`  Signals generated: ${signalsGenerated}`);
		console.log(`  Signals ignored (short disabled or insufficient cash): ${signalsIgnored}`);
		console.log(`  Trades opened: ${tradesOpened}`);
		console.log(`  Final trades: ${trades.length}`);
		console.log(`  Final cash: $${cash.toFixed(2)}`);
		console.log(`  Final equity: $${(position ? (position.type === 'long' ? cash + (this.priceData[this.priceData.length - 1].close * shares) : cash - (this.priceData[this.priceData.length - 1].close * shares)) : cash).toFixed(2)}`);
		
		// Close any open position at the end
		if (position) {
			const finalPrice = this.priceData[this.priceData.length - 1].close;
			const profit = position.type === 'long'
				? (finalPrice - position.entryPrice) * shares
				: (position.entryPrice - finalPrice) * shares;
			const commission = (position.entryPrice + finalPrice) * shares * this.commission;
			const netProfit = profit - commission;
			
			trades.push({
				entryDate: this.priceData[position.entryIndex].date,
				exitDate: this.priceData[this.priceData.length - 1].date,
				entryPrice: position.entryPrice,
				exitPrice: finalPrice,
				type: position.type,
				shares: shares,
				profit: netProfit,
				return: (netProfit / (position.entryPrice * shares)) * 100,
				exitReason: 'End of Period',
				holdingPeriod: this.priceData.length - 1 - position.entryIndex
			});
			
			if (position.type === 'long') {
				// Long: sell shares, receive cash
				cash += finalPrice * shares * (1 - this.commission);
			} else {
				// Short: buy back shares, pay cash
				cash -= finalPrice * shares * (1 + this.commission);
			}
		}
		
		return trades;
	}
	
	calculateMetrics(trades) {
		if (trades.length === 0) {
			return {
				totalReturn: 0,
				annualizedReturn: 0,
				sharpeRatio: 0,
				maxDrawdown: 0,
				winRate: 0,
				profitFactor: 0,
				averageWin: 0,
				averageLoss: 0,
				totalTrades: 0,
				winningTrades: 0,
				losingTrades: 0,
				largestWin: 0,
				largestLoss: 0,
				averageHoldingPeriod: 0
			};
		}
		
		// Calculate equity curve first to get accurate final equity
		const equityCurve = this.calculateEquityCurve(trades);
		const finalEquity = equityCurve[equityCurve.length - 1];
		
		// Calculate total return based on final equity, not sum of trade profits
		const totalReturn = ((finalEquity - this.initialCapital) / this.initialCapital) * 100;
		
		const profits = trades.map(t => t.profit);
		const returns = trades.map(t => t.return);
		const winningTrades = trades.filter(t => t.profit > 0);
		const losingTrades = trades.filter(t => t.profit < 0);
		
		// Annualized return (assuming 252 trading days per year)
		const days = (this.priceData[this.priceData.length - 1].date - this.priceData[0].date) / (1000 * 60 * 60 * 24);
		const years = days / 252;
		const annualizedReturn = years > 0 ? ((1 + totalReturn / 100) ** (1 / years) - 1) * 100 : 0;
		
		// Sharpe Ratio (assuming risk-free rate of 2%)
		const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
		const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
		const sharpeRatio = stdDev > 0 ? (avgReturn - 2) / stdDev : 0;
		
		// Max Drawdown (equityCurve already calculated above)
		let maxDrawdown = 0;
		let peak = this.initialCapital;
		for (const equity of equityCurve) {
			if (equity > peak) peak = equity;
			const drawdown = ((peak - equity) / peak) * 100;
			if (drawdown > maxDrawdown) maxDrawdown = drawdown;
		}
		
		// Win Rate
		const winRate = (winningTrades.length / trades.length) * 100;
		
		// Profit Factor
		const grossProfit = winningTrades.reduce((sum, t) => sum + Math.abs(t.profit), 0);
		const grossLoss = losingTrades.reduce((sum, t) => sum + Math.abs(t.profit), 0);
		const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
		
		// Average Win/Loss
		const averageWin = winningTrades.length > 0 
			? winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length 
			: 0;
		const averageLoss = losingTrades.length > 0
			? losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length
			: 0;
		
		// Largest Win/Loss
		const largestWin = winningTrades.length > 0 
			? Math.max(...winningTrades.map(t => t.profit))
			: 0;
		const largestLoss = losingTrades.length > 0
			? Math.min(...losingTrades.map(t => t.profit))
			: 0;
		
		// Average Holding Period
		const avgHoldingPeriod = trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / trades.length;
		
		return {
			totalReturn,
			annualizedReturn,
			sharpeRatio,
			maxDrawdown,
			winRate,
			profitFactor,
			averageWin,
			averageLoss,
			totalTrades: trades.length,
			winningTrades: winningTrades.length,
			losingTrades: losingTrades.length,
			largestWin,
			largestLoss,
			averageHoldingPeriod: Math.round(avgHoldingPeriod)
		};
	}
	
	calculateEquityCurve(trades) {
		// Create daily equity curve based on trades
		const equity = [];
		
		// Track position state
		let position = null; // { entryPrice, shares, entryIndex, type: 'long'|'short', tradeIndex }
		let cash = this.initialCapital;
		let shares = 0;
		
		// Create a map of trades by entry and exit dates for faster lookup
		const tradesByEntryDate = new Map();
		const tradesByExitDate = new Map();
		
		trades.forEach((trade, idx) => {
			const entryDate = new Date(trade.entryDate).getTime();
			const exitDate = new Date(trade.exitDate).getTime();
			
			if (!tradesByEntryDate.has(entryDate)) {
				tradesByEntryDate.set(entryDate, []);
			}
			tradesByEntryDate.get(entryDate).push({ trade, idx });
			
			if (!tradesByExitDate.has(exitDate)) {
				tradesByExitDate.set(exitDate, []);
			}
			tradesByExitDate.get(exitDate).push({ trade, idx });
		});
		
		for (let i = 0; i < this.priceData.length; i++) {
			const currentDate = new Date(this.priceData[i].date).getTime();
			
			// Check if we need to close position first (before opening new one)
			if (position) {
				const exitTrades = tradesByExitDate.get(currentDate) || [];
				const matchingExit = exitTrades.find(et => et.idx === position.tradeIndex);
				
				if (matchingExit) {
					// Close position
					if (position.type === 'long' || position.type === 'LONG') {
						// Long: sell shares, receive cash
						cash += this.priceData[i].close * shares * (1 - this.commission);
					} else {
						// Short: buy back shares, pay cash
						cash -= this.priceData[i].close * shares * (1 + this.commission);
					}
					shares = 0;
					position = null;
				}
			}
			
			// Check if we need to open a new position (only if no position is open)
			if (!position) {
				// Find trades that start on this date
				const entryTrades = tradesByEntryDate.get(currentDate) || [];
				
				// Also check for trades within 1 day (in case of date mismatch)
				for (const [entryDate, tradeList] of tradesByEntryDate.entries()) {
					if (Math.abs(entryDate - currentDate) < 86400000 && entryDate !== currentDate) {
						entryTrades.push(...tradeList);
					}
				}
				
				// Find the first trade that hasn't been processed yet
				// We need to check if this trade's exit date is after the current date
				for (const { trade, idx } of entryTrades) {
					const tradeExitDate = new Date(trade.exitDate).getTime();
					
					// Only open if exit date is in the future or same day
					if (tradeExitDate >= currentDate) {
						shares = trade.shares;
						if (trade.type === 'long' || trade.type === 'LONG') {
							// Long: buy shares, pay cash
							cash -= trade.entryPrice * shares * (1 + this.commission);
						} else {
							// Short: sell shares, receive cash
							cash += trade.entryPrice * shares * (1 - this.commission);
						}
						position = { 
							entryPrice: trade.entryPrice, 
							shares: shares, 
							entryIndex: i, 
							type: trade.type,
							tradeIndex: idx
						};
						break; // Only open one position at a time
					}
				}
			}
			
			// Calculate current equity
			let currentEquity;
			if (position) {
				if (position.type === 'long' || position.type === 'LONG') {
					// Long: cash + shares * current price (no commission in unrealized value)
					currentEquity = cash + this.priceData[i].close * shares;
				} else {
					// Short: equity = cash - (currentPrice * shares)
					currentEquity = cash - this.priceData[i].close * shares;
				}
			} else {
				// No position: just cash
				currentEquity = cash;
			}
			
			equity.push(currentEquity);
		}
		
		return equity;
	}
	
	displayResults() {
		const resultsSection = this.shadowRoot.getElementById('results-section');
		const resultsContent = this.shadowRoot.getElementById('results-content');
		
		resultsSection.style.display = 'block';
		
		const { metrics, trades, equityCurve, buyAndHold } = this.results;
		
		let html = `
			<!-- 1. Chart First -->
			<div class="chart-container" style="margin-bottom: 30px;">
				<canvas id="equity-chart"></canvas>
			</div>
			
			<!-- 2. Results - Better Clustered -->
			<div style="margin-bottom: 30px;">
				<div class="section-title">Performance Metrics</div>
				<div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 25px;">
					<div class="metric-card">
						<div class="metric-label">Total Return</div>
						<div class="metric-value ${metrics.totalReturn >= 0 ? 'positive' : 'negative'}">
							${metrics.totalReturn.toFixed(2)}%
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Annualized Return</div>
						<div class="metric-value ${metrics.annualizedReturn >= 0 ? 'positive' : 'negative'}">
							${metrics.annualizedReturn.toFixed(2)}%
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Sharpe Ratio</div>
						<div class="metric-value ${metrics.sharpeRatio >= 1 ? 'positive' : metrics.sharpeRatio >= 0 ? '' : 'negative'}">
							${metrics.sharpeRatio.toFixed(2)}
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Max Drawdown</div>
						<div class="metric-value negative">
							${metrics.maxDrawdown.toFixed(2)}%
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Final Equity</div>
						<div class="metric-value ${equityCurve[equityCurve.length - 1] >= this.initialCapital ? 'positive' : 'negative'}">
							$${equityCurve[equityCurve.length - 1].toFixed(2)}
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Profit Factor</div>
						<div class="metric-value ${metrics.profitFactor >= 1.5 ? 'positive' : metrics.profitFactor >= 1 ? '' : 'negative'}">
							${metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
						</div>
					</div>
				</div>
			</div>
			
			<div style="margin-bottom: 30px;">
				<div class="section-title">Trade Statistics</div>
				<div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 25px;">
					<div class="metric-card">
						<div class="metric-label">Total Trades</div>
						<div class="metric-value">
							${metrics.totalTrades}
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Win Rate</div>
						<div class="metric-value ${metrics.winRate >= 50 ? 'positive' : 'negative'}">
							${metrics.winRate.toFixed(2)}%
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Winning Trades</div>
						<div class="metric-value positive">
							${metrics.winningTrades}
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Losing Trades</div>
						<div class="metric-value negative">
							${metrics.losingTrades}
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Avg Holding Period</div>
						<div class="metric-value">
							${metrics.averageHoldingPeriod} days
						</div>
					</div>
				</div>
			</div>
			
			<div style="margin-bottom: 30px;">
				<div class="section-title">Trade Performance</div>
				<div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 25px;">
					<div class="metric-card">
						<div class="metric-label">Avg Win</div>
						<div class="metric-value positive">
							$${metrics.averageWin.toFixed(2)}
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Avg Loss</div>
						<div class="metric-value negative">
							$${metrics.averageLoss.toFixed(2)}
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Largest Win</div>
						<div class="metric-value positive">
							$${metrics.largestWin.toFixed(2)}
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Largest Loss</div>
						<div class="metric-value negative">
							$${metrics.largestLoss.toFixed(2)}
						</div>
					</div>
				</div>
			</div>
			
			<div style="margin-bottom: 30px;">
				<div class="section-title">Strategy vs Buy-and-Hold Comparison</div>
				<div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 20px;">
					<div class="metric-card">
						<div class="metric-label">Strategy Return</div>
						<div class="metric-value ${metrics.totalReturn >= 0 ? 'positive' : 'negative'}">
							${metrics.totalReturn.toFixed(2)}%
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Buy-and-Hold Return</div>
						<div class="metric-value ${buyAndHold.metrics.totalReturn >= 0 ? 'positive' : 'negative'}">
							${buyAndHold.metrics.totalReturn.toFixed(2)}%
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Outperformance</div>
						<div class="metric-value ${(metrics.totalReturn - buyAndHold.metrics.totalReturn) >= 0 ? 'positive' : 'negative'}">
							${(metrics.totalReturn - buyAndHold.metrics.totalReturn).toFixed(2)}%
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Strategy Sharpe</div>
						<div class="metric-value ${metrics.sharpeRatio >= 1 ? 'positive' : ''}">
							${metrics.sharpeRatio.toFixed(2)}
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Buy-and-Hold Sharpe</div>
						<div class="metric-value ${buyAndHold.metrics.sharpeRatio >= 1 ? 'positive' : ''}">
							${buyAndHold.metrics.sharpeRatio.toFixed(2)}
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Strategy Max DD</div>
						<div class="metric-value negative">
							${metrics.maxDrawdown.toFixed(2)}%
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-label">Buy-and-Hold Max DD</div>
						<div class="metric-value negative">
							${buyAndHold.metrics.maxDrawdown.toFixed(2)}%
						</div>
					</div>
				</div>
			</div>
			
			<!-- 3. Trade History Table Last -->
			<div style="margin-top: 25px;">
				<div class="section-title">Trade History (${trades.length} trades)</div>
				<div style="max-height: 500px; overflow-y: auto;">
					<table class="trades-table">
						<thead>
							<tr>
								<th>Entry Date</th>
								<th>Exit Date</th>
								<th>Type</th>
								<th>Entry Price</th>
								<th>Exit Price</th>
								<th>Shares</th>
								<th>Profit</th>
								<th>Return %</th>
								<th>Holding Days</th>
								<th>Exit Reason</th>
							</tr>
						</thead>
						<tbody>
							${trades.map(trade => `
								<tr>
									<td>${trade.entryDate.toLocaleDateString()}</td>
									<td>${trade.exitDate.toLocaleDateString()}</td>
									<td style="color: ${trade.type === 'long' ? '#10b981' : '#ef4444'}; font-weight: 600;">
										${trade.type.toUpperCase()}
									</td>
									<td>$${trade.entryPrice.toFixed(2)}</td>
									<td>$${trade.exitPrice.toFixed(2)}</td>
									<td>${trade.shares}</td>
									<td class="${trade.profit >= 0 ? 'profit' : 'loss'}">
										${trade.profit >= 0 ? '+' : ''}$${trade.profit.toFixed(2)}
									</td>
									<td class="${trade.return >= 0 ? 'profit' : 'loss'}">
										${trade.return >= 0 ? '+' : ''}${trade.return.toFixed(2)}%
									</td>
									<td>${trade.holdingPeriod}</td>
									<td>${trade.exitReason}</td>
								</tr>
							`).join('')}
						</tbody>
					</table>
				</div>
			</div>
		`;
		
		resultsContent.innerHTML = html;
		
		// Render equity curve chart with comparison
		this.renderEquityChart(equityCurve, buyAndHold.equityCurve, trades, buyAndHold.trades);
	}
	
	renderEquityChart(strategyEquity, buyHoldEquity, strategyTrades = [], buyHoldTrades = []) {
		const canvas = this.shadowRoot.getElementById('equity-chart');
		if (!canvas) return;
		
		const ctx = canvas.getContext('2d');
		const width = canvas.parentElement.clientWidth - 30;
		const height = 400;
		canvas.width = width;
		canvas.height = height;
		
		const padding = { top: 30, right: 20, bottom: 50, left: 60 };
		const chartWidth = width - padding.left - padding.right;
		const chartHeight = height - padding.top - padding.bottom;
		
		// Find min/max for scaling (include both curves)
		const allEquity = [...strategyEquity, ...buyHoldEquity, this.initialCapital];
		const minEquity = Math.min(...allEquity);
		const maxEquity = Math.max(...allEquity);
		const range = maxEquity - minEquity || 1;
		
		// Draw background
		ctx.fillStyle = this.classList.contains('light-mode') ? '#c0c9d4' : '#0b0f14';
		ctx.fillRect(0, 0, width, height);
		
		// Draw grid
		ctx.strokeStyle = this.classList.contains('light-mode') ? '#a0aab8' : '#1f2a37';
		ctx.lineWidth = 1;
		
		// Horizontal grid lines
		for (let i = 0; i <= 5; i++) {
			const y = padding.top + (chartHeight / 5) * i;
			ctx.beginPath();
			ctx.moveTo(padding.left, y);
			ctx.lineTo(width - padding.right, y);
			ctx.stroke();
			
			// Labels
			const value = maxEquity - (range / 5) * i;
			ctx.fillStyle = this.classList.contains('light-mode') ? '#2a2a2a' : '#9fb0c0';
			ctx.font = '12px sans-serif';
			ctx.textAlign = 'right';
			ctx.fillText(`$${value.toFixed(0)}`, padding.left - 10, y + 4);
		}
		
		// Vertical grid lines
		const numPoints = Math.max(strategyEquity.length, buyHoldEquity.length);
		for (let i = 0; i <= 5; i++) {
			const x = padding.left + (chartWidth / 5) * i;
			ctx.beginPath();
			ctx.moveTo(x, padding.top);
			ctx.lineTo(x, height - padding.bottom);
			ctx.stroke();
		}
		
		// Draw Buy-and-Hold equity curve (dashed line)
		ctx.strokeStyle = this.classList.contains('light-mode') ? '#6b7280' : '#9fb0c0';
		ctx.lineWidth = 2;
		ctx.setLineDash([5, 5]);
		ctx.beginPath();
		
		for (let i = 0; i < buyHoldEquity.length; i++) {
			const x = padding.left + (chartWidth / (buyHoldEquity.length - 1)) * i;
			const y = padding.top + chartHeight - ((buyHoldEquity[i] - minEquity) / range) * chartHeight;
			
			if (i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		}
		ctx.stroke();
		ctx.setLineDash([]);
		
		// Draw Strategy equity curve (solid line)
		ctx.strokeStyle = '#4ea1f3';
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		
		for (let i = 0; i < strategyEquity.length; i++) {
			const x = padding.left + (chartWidth / (strategyEquity.length - 1)) * i;
			const y = padding.top + chartHeight - ((strategyEquity[i] - minEquity) / range) * chartHeight;
			
			if (i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		}
		ctx.stroke();
		
		// Draw initial capital line
		ctx.strokeStyle = this.classList.contains('light-mode') ? '#6b7280' : '#6b7280';
		ctx.lineWidth = 1;
		ctx.setLineDash([3, 3]);
		ctx.beginPath();
		const initialY = padding.top + chartHeight - ((this.initialCapital - minEquity) / range) * chartHeight;
		ctx.moveTo(padding.left, initialY);
		ctx.lineTo(width - padding.right, initialY);
		ctx.stroke();
		ctx.setLineDash([]);
		
		// Legend
		const legendY = padding.top - 10;
		ctx.font = '12px sans-serif';
		ctx.textAlign = 'left';
		
		// Strategy legend
		ctx.strokeStyle = '#4ea1f3';
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(padding.left, legendY);
		ctx.lineTo(padding.left + 30, legendY);
		ctx.stroke();
		ctx.fillStyle = this.classList.contains('light-mode') ? '#2a2a2a' : '#e6edf3';
		ctx.fillText('Strategy', padding.left + 35, legendY + 4);
		
		// Buy-and-Hold legend
		ctx.strokeStyle = this.classList.contains('light-mode') ? '#6b7280' : '#9fb0c0';
		ctx.lineWidth = 2;
		ctx.setLineDash([5, 5]);
		ctx.beginPath();
		ctx.moveTo(padding.left + 120, legendY);
		ctx.lineTo(padding.left + 150, legendY);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.fillText('Buy-and-Hold', padding.left + 155, legendY + 4);
		
		// Draw Strategy buy/sell markers on Buy-and-Hold curve
		// This shows when the strategy entered/exited positions, but displayed on the Buy-and-Hold line
		if (strategyTrades.length > 0) {
			for (const trade of strategyTrades) {
				// Find the index in priceData for entry and exit dates
				const entryIndex = this.priceData.findIndex(d => 
					Math.abs(new Date(d.date).getTime() - new Date(trade.entryDate).getTime()) < 86400000
				);
				const exitIndex = this.priceData.findIndex(d => 
					Math.abs(new Date(d.date).getTime() - new Date(trade.exitDate).getTime()) < 86400000
				);
				
				if (entryIndex >= 0 && entryIndex < buyHoldEquity.length) {
					// Green dot for buy (Long entry) or Short exit
					const x = padding.left + (chartWidth / (buyHoldEquity.length - 1)) * entryIndex;
					// Use Buy-and-Hold equity value at this point, not strategy equity
					const y = padding.top + chartHeight - ((buyHoldEquity[entryIndex] - minEquity) / range) * chartHeight;
					
					// Green for Long entry, different color for Short entry
					if (trade.type === 'long' || trade.type === 'LONG') {
						ctx.fillStyle = '#10b981'; // Green for Long entry
					} else {
						ctx.fillStyle = '#f59e0b'; // Orange for Short entry
					}
					ctx.beginPath();
					ctx.arc(x, y, 6, 0, Math.PI * 2);
					ctx.fill();
					// White border
					ctx.strokeStyle = this.classList.contains('light-mode') ? '#ffffff' : '#0b0f14';
					ctx.lineWidth = 2;
					ctx.stroke();
				}
				
				if (exitIndex >= 0 && exitIndex < buyHoldEquity.length) {
					// Red dot for sell (Long exit) or Short entry
					const x = padding.left + (chartWidth / (buyHoldEquity.length - 1)) * exitIndex;
					// Use Buy-and-Hold equity value at this point, not strategy equity
					const y = padding.top + chartHeight - ((buyHoldEquity[exitIndex] - minEquity) / range) * chartHeight;
					
					// Red for Long exit, different color for Short exit
					if (trade.type === 'long' || trade.type === 'LONG') {
						ctx.fillStyle = '#ef4444'; // Red for Long exit
					} else {
						ctx.fillStyle = '#8b5cf6'; // Purple for Short exit
					}
					ctx.beginPath();
					ctx.arc(x, y, 6, 0, Math.PI * 2);
					ctx.fill();
					// White border
					ctx.strokeStyle = this.classList.contains('light-mode') ? '#ffffff' : '#0b0f14';
					ctx.lineWidth = 2;
					ctx.stroke();
				}
			}
		}
		
		// Chart title
		ctx.fillStyle = this.classList.contains('light-mode') ? '#2a2a2a' : '#9fb0c0';
		ctx.textAlign = 'center';
		ctx.fillText('Equity Curve Comparison', width / 2, height - 10);
	}
	
	setupAutocomplete(inputId, dropdownId) {
		const input = this.shadowRoot.getElementById(inputId);
		const dropdown = this.shadowRoot.getElementById(dropdownId);
		
		if (!input || !dropdown) return;
		
		let debounceTimer = null;
		let selectedIndex = -1;
		
		// Input event for typing
		input.addEventListener('input', (e) => {
			const query = e.target.value.trim();
			
			if (debounceTimer) clearTimeout(debounceTimer);
			selectedIndex = -1;
			
			if (query.length < 1) {
				this.hideAutocomplete(dropdown);
				return;
			}
			
			dropdown.innerHTML = '<div class="autocomplete-loading">Searching...</div>';
			dropdown.classList.add('show');
			
			debounceTimer = setTimeout(() => {
				this.searchStockSymbols(query, dropdown, input);
			}, 300);
		});
		
		// Keyboard navigation
		input.addEventListener('keydown', (e) => {
			const items = dropdown.querySelectorAll('.autocomplete-item');
			
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
				this.updateAutocompleteSelection(items, selectedIndex);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				this.updateAutocompleteSelection(items, selectedIndex);
			} else if (e.key === 'Enter') {
				e.preventDefault();
				if (selectedIndex >= 0 && items[selectedIndex]) {
					const symbol = items[selectedIndex].dataset.symbol;
					input.value = symbol;
					this.hideAutocomplete(dropdown);
				} else {
					// Only allow if a suggestion is selected
					const symbol = input.value.trim().toUpperCase();
					if (!this.validSymbols || !this.validSymbols[input.id] || !this.validSymbols[input.id].has(symbol)) {
						alert('Please select a stock from the suggestions.');
					}
				}
			} else if (e.key === 'Escape') {
				this.hideAutocomplete(dropdown);
			}
		});
		
		// Close dropdown when clicking outside
		document.addEventListener('click', (e) => {
			if (!input.contains(e.target) && !dropdown.contains(e.target)) {
				this.hideAutocomplete(dropdown);
			}
		});
	}
	
	async searchStockSymbols(query, dropdown, input) {
		if (!dropdown) return;
		
		try {
			const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
			
			if (!response.ok) {
				dropdown.innerHTML = `<div class="autocomplete-empty">Server error (${response.status})</div>`;
				return;
			}
			
			const data = await response.json();
			const results = data.results || [];
			
			if (results.length === 0) {
				dropdown.innerHTML = '<div class="autocomplete-empty">No results found</div>';
				// Clear valid symbols for this input
				if (this.validSymbols && this.validSymbols[input.id]) {
					this.validSymbols[input.id].clear();
				}
				return;
			}
			
			// Store valid symbols for this input
			if (!this.validSymbols) {
				this.validSymbols = {
					'symbol-input': new Set(),
					'buyhold-symbol-input': new Set()
				};
			}
			if (!this.validSymbols[input.id]) {
				this.validSymbols[input.id] = new Set();
			}
			this.validSymbols[input.id].clear();
			results.forEach(item => {
				this.validSymbols[input.id].add(item.symbol.toUpperCase());
			});
			
			dropdown.innerHTML = results.map((item, index) => `
				<div class="autocomplete-item" data-symbol="${item.symbol}" data-index="${index}">
					<span class="autocomplete-symbol">${item.symbol}</span>
					<span class="autocomplete-name">${item.name}</span>
					<span class="autocomplete-type">${item.type}</span>
				</div>
			`).join('');
			
			// Add click handlers
			dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
				item.addEventListener('click', () => {
					const symbol = item.dataset.symbol;
					input.value = symbol;
					this.hideAutocomplete(dropdown);
				});
			});
			
		} catch (error) {
			console.error('[Autocomplete] Error:', error);
			if (error.name === 'TypeError' && error.message.includes('fetch')) {
				dropdown.innerHTML = '<div class="autocomplete-empty">Backend not available</div>';
			} else {
				dropdown.innerHTML = `<div class="autocomplete-empty">Connection error</div>`;
			}
		}
	}
	
	updateAutocompleteSelection(items, selectedIndex) {
		items.forEach((item, i) => {
			item.classList.toggle('selected', i === selectedIndex);
		});
		if (items[selectedIndex]) {
			items[selectedIndex].scrollIntoView({ block: 'nearest' });
		}
	}
	
	hideAutocomplete(dropdown) {
		if (dropdown) {
			dropdown.classList.remove('show');
			dropdown.innerHTML = '';
		}
	}
}

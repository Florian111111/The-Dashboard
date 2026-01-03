import { API_BASE_URL } from '../config.js';

export class StockComparison extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.symbols = [];
		this.stockData = [];
	}
	
	connectedCallback() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					background: #0b0f14;
					min-height: 100vh;
					padding: 20px;
					max-width: 1400px;
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
				.header-right {
					display: flex;
					align-items: center;
					gap: 15px;
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
					border-color: var(--border-color);
					color: var(--text-primary);
				}
				.back-btn:hover {
					background: #1f2a37;
				}
				:host(.light-mode) .back-btn:hover {
					background: var(--bg-secondary);
				}
				
				.input-section {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
					margin-bottom: 30px;
				}
				:host(.light-mode) .input-section {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.input-grid {
					display: grid;
					grid-template-columns: repeat(3, 1fr);
					gap: 15px;
					margin-bottom: 15px;
				}
				.input-group {
					display: flex;
					flex-direction: column;
					gap: 8px;
				}
				.input-label {
					color: #9fb0c0;
					font-size: 0.85rem;
					font-weight: 600;
				}
				:host(.light-mode) .input-label {
					color: var(--text-secondary);
				}
				.stock-input {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					color: #e6edf3;
					padding: 12px 16px;
					border-radius: 8px;
					font-size: 1rem;
					outline: none;
				}
				:host(.light-mode) .stock-input {
					background: var(--bg-primary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
			.stock-input:focus {
				border-color: #4ea1f3;
			}
			:host(.light-mode) .stock-input:focus {
				border-color: var(--accent-blue);
			}
			
			/* Autocomplete Dropdown */
			.autocomplete-dropdown {
				position: absolute;
				top: 100%;
				left: 0;
				right: 0;
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
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
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
			
			.compare-btn {
					background: linear-gradient(135deg, #4ea1f3 0%, #3b82f6 100%);
					color: #0b0f14;
					border: none;
					padding: 12px 24px;
					border-radius: 8px;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s;
					width: 100%;
				}
				.compare-btn:hover {
					background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
				}
				.compare-btn:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
				
				.comparison-grid {
					display: grid;
					grid-template-columns: repeat(3, 1fr);
					gap: 20px;
					margin-bottom: 30px;
				}
				.stock-card {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
				}
				:host(.light-mode) .stock-card {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.stock-card-header {
					margin-bottom: 15px;
					padding-bottom: 15px;
					border-bottom: 1px solid #1f2a37;
				}
				:host(.light-mode) .stock-card-header {
					border-bottom-color: var(--border-color);
				}
				.stock-symbol {
					font-size: 1.5rem;
					font-weight: 700;
					color: #4ea1f3;
					margin-bottom: 5px;
					cursor: pointer;
				}
				:host(.light-mode) .stock-symbol {
					color: var(--accent-blue);
				}
				.stock-symbol:hover {
					text-decoration: underline;
				}
				.stock-name {
					color: #9fb0c0;
					font-size: 0.9rem;
				}
				:host(.light-mode) .stock-name {
					color: var(--text-secondary);
				}
				.stock-price {
					font-size: 2rem;
					font-weight: 700;
					color: #e6edf3;
					margin-bottom: 10px;
				}
				:host(.light-mode) .stock-price {
					color: var(--text-primary);
				}
				.stock-change {
					font-size: 1.1rem;
					font-weight: 600;
					margin-bottom: 20px;
				}
				.stock-change.positive {
					color: #10b981;
				}
				.stock-change.negative {
					color: #ef4444;
				}
				:host(.light-mode) .stock-change.positive {
					color: #059669;
				}
				:host(.light-mode) .stock-change.negative {
					color: #dc2626;
				}
				.mini-chart {
					height: 140px;
					margin-bottom: 20px;
					background: #0b0f14;
					border-radius: 8px;
					padding: 8px;
					position: relative;
					overflow: hidden;
				}
				:host(.light-mode) .mini-chart {
					background: var(--bg-primary);
				}
				.mini-chart canvas {
					width: 100% !important;
					height: 100% !important;
				}
				.metrics-grid {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 12px;
				}
				.metric {
					background: #0b0f14;
					padding: 12px;
					border-radius: 8px;
					border: 1px solid #1f2a37;
				}
				:host(.light-mode) .metric {
					background: var(--bg-primary);
					border-color: var(--border-color);
				}
				.metric-label {
					color: #9fb0c0;
					font-size: 0.75rem;
					margin-bottom: 5px;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}
				:host(.light-mode) .metric-label {
					color: var(--text-secondary);
				}
				.metric-value {
					color: #e6edf3;
					font-size: 1.1rem;
					font-weight: 600;
				}
				:host(.light-mode) .metric-value {
					color: var(--text-primary);
				}
				
				.comparison-table {
					width: 100%;
					border-collapse: collapse;
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					overflow: hidden;
				}
				:host(.light-mode) .comparison-table {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.comparison-table thead {
					background: #0b0f14;
				}
				:host(.light-mode) .comparison-table thead {
					background: var(--bg-tertiary);
				}
				.comparison-table th {
					padding: 15px;
					text-align: left;
					color: #9fb0c0;
					font-size: 0.85rem;
					font-weight: 600;
					text-transform: uppercase;
					letter-spacing: 0.5px;
					border-bottom: 1px solid #1f2a37;
				}
				:host(.light-mode) .comparison-table th {
					color: var(--text-secondary);
					border-bottom-color: var(--border-color);
				}
				.comparison-table td {
					padding: 15px;
					border-bottom: 1px solid #1f2a37;
					color: #e6edf3;
				}
				:host(.light-mode) .comparison-table td {
					border-bottom-color: var(--border-color);
					color: var(--text-primary);
				}
				.comparison-table tr:last-child td {
					border-bottom: none;
				}
				.comparison-table tr:hover {
					background: #0b0f14;
				}
				:host(.light-mode) .comparison-table tr:hover {
					background: var(--bg-tertiary);
				}
				.best-value {
					background: rgba(16, 185, 129, 0.2);
					font-weight: 700;
				}
				.worst-value {
					background: rgba(239, 68, 68, 0.2);
					font-weight: 700;
				}
				.empty-state {
					text-align: center;
					padding: 60px 20px;
					color: #9fb0c0;
				}
				:host(.light-mode) .empty-state {
					color: var(--text-secondary);
				}
				.loading {
					text-align: center;
					padding: 40px;
					color: #9fb0c0;
				}
				:host(.light-mode) .loading {
					color: var(--text-secondary);
				}
				.autocomplete-dropdown {
					position: absolute;
					top: 100%;
					left: 0;
					right: 0;
					min-width: 450px;
					width: max-content;
					max-width: 600px;
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 0 0 12px 12px;
					max-height: 350px;
					overflow-y: auto;
					z-index: 1000;
					display: none;
					box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
					margin-top: 4px;
				}
				:host(.light-mode) .autocomplete-dropdown {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.autocomplete-dropdown.show {
					display: block;
				}
				.autocomplete-item {
					padding: 12px 16px;
					cursor: pointer;
					display: flex;
					align-items: center;
					gap: 15px;
					border-bottom: 1px solid #1f2a37;
					transition: background 0.15s;
				}
				:host(.light-mode) .autocomplete-item {
					border-bottom-color: var(--border-color);
				}
				.autocomplete-item:last-child {
					border-bottom: none;
				}
				.autocomplete-item:hover,
				.autocomplete-item.selected {
					background: #1f2a37;
				}
				:host(.light-mode) .autocomplete-item:hover,
				:host(.light-mode) .autocomplete-item.selected {
					background: var(--bg-tertiary);
				}
				.autocomplete-symbol {
					font-weight: 700;
					color: #4ea1f3;
					min-width: 65px;
					font-size: 0.95rem;
					flex-shrink: 0;
				}
				:host(.light-mode) .autocomplete-symbol {
					color: var(--accent-blue);
				}
				.autocomplete-name {
					color: #e6edf3;
					flex: 1;
					font-size: 0.9rem;
					white-space: nowrap;
				}
				:host(.light-mode) .autocomplete-name {
					color: var(--text-primary);
				}
				.autocomplete-type {
					color: #6b7a8a;
					font-size: 0.7rem;
					padding: 3px 8px;
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
					padding: 15px;
					color: #9fb0c0;
					text-align: center;
					font-size: 0.9rem;
				}
				:host(.light-mode) .autocomplete-loading,
				:host(.light-mode) .autocomplete-empty {
					color: var(--text-secondary);
				}
				.comparison-table .group-header td {
					background: #1f2a37 !important;
					color: #4ea1f3 !important;
					font-weight: 700 !important;
					padding: 12px !important;
					text-transform: uppercase;
					letter-spacing: 0.5px;
					font-size: 0.85rem;
					border-bottom: 2px solid #2d3748;
				}
			:host(.light-mode) .comparison-table .group-header td {
				background: var(--bg-tertiary) !important;
				color: var(--accent-blue) !important;
				border-bottom-color: var(--border-color);
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
				<h1>📊 Stock Comparison</h1>
				<div class="header-right">
					<div class="theme-switch">
						<span class="theme-switch-label">Theme</span>
						<div class="theme-switch-track" id="theme-toggle">
							<div class="theme-switch-thumb">
								<span class="theme-icon">🌙</span>
							</div>
						</div>
					</div>
					<button class="back-btn" id="back-btn">← Back to Market</button>
				</div>
			</div>
			
			<div class="input-section">
				<div class="input-grid">
					<div class="input-group">
						<label class="input-label">Stock 1</label>
						<div style="position: relative;">
							<input type="text" class="stock-input" id="stock1-input" placeholder="AAPL or Apple" autocomplete="off" />
							<div class="autocomplete-dropdown" id="autocomplete-dropdown-1"></div>
						</div>
					</div>
					<div class="input-group">
						<label class="input-label">Stock 2</label>
						<div style="position: relative;">
							<input type="text" class="stock-input" id="stock2-input" placeholder="MSFT or Microsoft" autocomplete="off" />
							<div class="autocomplete-dropdown" id="autocomplete-dropdown-2"></div>
						</div>
					</div>
					<div class="input-group">
						<label class="input-label">Stock 3 (Optional)</label>
						<div style="position: relative;">
							<input type="text" class="stock-input" id="stock3-input" placeholder="GOOGL or Google" autocomplete="off" />
							<div class="autocomplete-dropdown" id="autocomplete-dropdown-3"></div>
						</div>
					</div>
				</div>
				<button class="compare-btn" id="compare-btn">Compare Stocks</button>
			</div>
			
			<div id="comparison-content">
				<div class="empty-state">
					<div style="font-size: 4rem; margin-bottom: 20px;">📊</div>
					<h2 style="color: #e6edf3; margin-bottom: 10px;">Compare up to 3 stocks</h2>
					<p>Enter stock symbols above and click "Compare Stocks"</p>
				</div>
			</div>
			
			<div class="disclaimer-footer">
				<div>
					The information provided on this website is for general informational and educational purposes only and does not constitute investment advice, financial advice, trading advice, or any other form of recommendation. All content is provided without regard to individual financial circumstances, investment objectives, or risk tolerance. Past performance is not indicative of future results. Financial markets are subject to risk, and investing may result in the loss of part or all of your capital. Any actions taken based on the information on this website are strictly at your own risk. Before making any investment decision, you should conduct your own research and, where appropriate, consult a licensed financial advisor. By using this website, you acknowledge and agree to this disclaimer. <a href="#" id="disclaimer-link-full">Full Disclaimer</a>
				</div>
			</div>
		`;
		
		this.setupThemeToggle();
		this.setupEventListeners();
		this.setupAutocomplete();
	}
	
	setupThemeToggle() {
		const themeToggle = this.shadowRoot.getElementById('theme-toggle');
		if (!themeToggle) return;
		
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.classList.add('light-mode');
			themeToggle.classList.add('light');
		}
		
		themeToggle.addEventListener('click', () => {
			const isLight = this.classList.toggle('light-mode');
			themeToggle.classList.toggle('light', isLight);
			localStorage.setItem('theme', isLight ? 'light' : 'dark');
			document.body.style.background = isLight ? '#c8d0da' : '#0b0f14';
			window.dispatchEvent(new CustomEvent('themechange'));
		});
	}
	
	setupEventListeners() {
		const backBtn = this.shadowRoot.getElementById('back-btn');
		const compareBtn = this.shadowRoot.getElementById('compare-btn');
		
		backBtn?.addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'market-overview' } }));
		});
		
		compareBtn?.addEventListener('click', () => {
			this.compareStocks();
		});
		
		// Allow Enter key to trigger comparison
		['stock1-input', 'stock2-input', 'stock3-input'].forEach(id => {
			const input = this.shadowRoot.getElementById(id);
			input?.addEventListener('keypress', (e) => {
				if (e.key === 'Enter') {
					this.compareStocks();
				}
			});
		});
		
		// Listen for rate limit cooldown events
		window.addEventListener('rate-limit-cooldown', (e) => {
			this.handleRateLimitCooldown(e.detail.active);
		});
		
		// Disclaimer link
		this.shadowRoot.getElementById('disclaimer-link-full')?.addEventListener('click', (e) => {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'disclaimer' } }));
		});
	}
	
	handleRateLimitCooldown(active) {
		const inputs = ['stock1-input', 'stock2-input', 'stock3-input'];
		const compareBtn = this.shadowRoot.getElementById('compare-btn');
		
		inputs.forEach(id => {
			const input = this.shadowRoot.getElementById(id);
			if (input) {
				input.disabled = active;
				if (active) {
					input.placeholder = 'Search disabled - Please wait for cooldown period';
					input.style.opacity = '0.5';
					input.style.cursor = 'not-allowed';
				} else {
					input.placeholder = 'Enter stock symbol';
					input.style.opacity = '1';
					input.style.cursor = 'text';
				}
			}
		});
		
		if (compareBtn) {
			compareBtn.disabled = active;
			compareBtn.style.opacity = active ? '0.5' : '1';
			compareBtn.style.cursor = active ? 'not-allowed' : 'pointer';
		}
		
		// Hide autocomplete dropdowns
		if (active) {
			inputs.forEach(id => {
				const dropdown = this.shadowRoot.querySelector(`#${id}-dropdown`);
				if (dropdown) {
					dropdown.classList.remove('show');
				}
			});
		}
	}
	
	async compareStocks() {
		const stock1 = this.shadowRoot.getElementById('stock1-input').value.trim().toUpperCase();
		const stock2 = this.shadowRoot.getElementById('stock2-input').value.trim().toUpperCase();
		const stock3 = this.shadowRoot.getElementById('stock3-input').value.trim().toUpperCase();
		
		// Validate that all symbols exist in autocomplete suggestions
		const symbols = [stock1, stock2, stock3].filter(s => s);
		const inputIds = ['stock1-input', 'stock2-input', 'stock3-input'];
		const inputValues = [stock1, stock2, stock3];
		
		for (let i = 0; i < inputValues.length; i++) {
			if (inputValues[i] && (!this.validSymbols || !this.validSymbols[inputIds[i]] || !this.validSymbols[inputIds[i]].has(inputValues[i]))) {
				alert(`Please select a valid stock from the suggestions for Stock ${i + 1}. "${inputValues[i]}" is not a valid stock symbol.`);
				return;
			}
		}
		
		this.symbols = symbols;
		
		if (this.symbols.length < 2) {
			alert('Please enter at least 2 stocks to compare.');
			return;
		}
		
		if (this.symbols.length > 3) {
			alert('Maximum 3 stocks can be compared.');
			return;
		}
		
		const content = this.shadowRoot.getElementById('comparison-content');
		if (!content) {
			console.error('[Comparison] Content element not found');
			return;
		}
		
		content.innerHTML = '<div class="loading">Loading comparison data...</div>';
		
		console.log('[Comparison] Loading data for symbols:', this.symbols);
		
		// Load data for all stocks
		try {
			this.stockData = await Promise.all(this.symbols.map(symbol => this.loadStockData(symbol)));
			console.log('[Comparison] Data loaded:', this.stockData);
			this.renderComparison();
		} catch (e) {
			console.error('[Comparison] Error loading comparison data:', e);
			content.innerHTML = `
				<div class="empty-state">
					<div style="font-size: 4rem; margin-bottom: 20px;">⚠️</div>
					<h2 style="color: #e6edf3; margin-bottom: 10px;">Error loading data</h2>
					<p>Please make sure the Python backend (Port 3001) is running.</p>
				</div>
			`;
		}
	}
	
	async loadStockData(symbol) {
		try {
			console.log(`[Comparison] Loading data for ${symbol}...`);
			
			// Fetch fundamentals from Python backend
			const fundamentalsRes = await fetch(`${API_BASE_URL}/api/fundamentals/${symbol}`).catch((e) => {
				console.error(`[Comparison] Failed to fetch fundamentals for ${symbol}:`, e);
				return null;
			});
			
			if (!fundamentalsRes || !fundamentalsRes.ok) {
				console.error(`[Comparison] Fundamentals request failed for ${symbol}:`, fundamentalsRes?.status);
				throw new Error(`Failed to load fundamentals for ${symbol}`);
			}
			
			const fundamentals = await fundamentalsRes.json();
			console.log(`[Comparison] Fundamentals loaded for ${symbol}`);
			
			// Extract data from quoteSummary format (what the backend returns)
			const result = fundamentals?.quoteSummary?.result?.[0];
			if (!result) {
				throw new Error(`No result in fundamentals data for ${symbol}`);
			}
			
			const stats = result.defaultKeyStatistics || {};
			const financials = result.financialData || {};
			const profile = result.summaryProfile || {};
			
			// Get quote data (price, change) - need to fetch separately or use a proxy
			// For now, try to get from heatmap-quotes endpoint or use fundamentals data
			let price = 0;
			let change = 0;
			let changePercent = 0;
			let volume = null;
			let high52w = null;
			let low52w = null;
			
			try {
				// Try to get quote from heatmap endpoint
				const quoteRes = await fetch(`${API_BASE_URL}/api/heatmap-quotes?symbols=${symbol}`).catch(() => null);
				if (quoteRes?.ok) {
					const quoteData = await quoteRes.json();
					// The endpoint returns: { quoteResponse: { result: [...] } }
					const quotes = quoteData.quoteResponse?.result || [];
					const quote = quotes.find(q => q.symbol === symbol) || quotes[0];
					if (quote) {
						price = quote.regularMarketPrice || 0;
						change = quote.regularMarketChange || 0;
						changePercent = quote.regularMarketChangePercent || 0;
						// Note: heatmap-quotes endpoint doesn't return volume or 52w high/low
						volume = null;
						high52w = null;
						low52w = null;
						console.log(`[Comparison] Quote data loaded for ${symbol}:`, { price, change, changePercent });
					}
				}
			} catch (e) {
				console.warn(`[Comparison] Could not fetch quote data for ${symbol}:`, e);
			}
			
			// Extract other data from fundamentals
			const name = profile.longName || profile.name || symbol;
			const marketCap = stats.marketCap?.raw || stats.marketCap || null;
			const peRatio = stats.trailingPE?.raw || stats.forwardPE?.raw || stats.trailingPE || stats.forwardPE || null;
			const dividendYield = financials.dividendYield?.raw || financials.dividendYield || null;
			const beta = stats.beta?.raw || stats.beta || null;
			
			// Additional metrics from fundamentals
			const incomeStatement = result.incomeStatementHistory?.incomeStatementHistory?.[0] || {};
			const balanceSheet = result.balanceSheetHistory?.balanceSheetStatements?.[0] || {};
			const cashflow = result.cashflowStatementHistory?.cashflowStatements?.[0] || {};
			
			// Valuation metrics
			const forwardPE = stats.forwardPE?.raw || stats.forwardPE || null;
			const priceToBook = stats.priceToBook?.raw || stats.priceToBook || null;
			const priceToSales = stats.priceToSalesTrailing12Months?.raw || stats.priceToSalesTrailing12Months || null;
			const pegRatio = stats.pegRatio?.raw || stats.pegRatio || null;
			const enterpriseValue = stats.enterpriseValue?.raw || stats.enterpriseValue || null;
			
			// Profitability metrics
			const eps = stats.trailingEps?.raw || stats.trailingEps || null;
			const profitMargin = financials.profitMargins?.raw || financials.profitMargins || null;
			const operatingMargin = financials.operatingMargins?.raw || financials.operatingMargins || null;
			const roe = financials.roe?.raw || financials.roe || null;
			const roa = financials.roa?.raw || financials.roa || null;
			const roi = financials.roi?.raw || financials.roi || null;
			
			// Growth metrics
			const revenueGrowth = incomeStatement.revenueGrowth?.raw || incomeStatement.revenueGrowth || null;
			const earningsGrowth = incomeStatement.earningsGrowth?.raw || incomeStatement.earningsGrowth || null;
			const revenueGrowth3Y = incomeStatement.revenueGrowth3Y?.raw || incomeStatement.revenueGrowth3Y || null;
			const earningsGrowth3Y = incomeStatement.earningsGrowth3Y?.raw || incomeStatement.earningsGrowth3Y || null;
			
			// Financial health metrics
			const totalRevenue = financials.totalRevenue?.raw || incomeStatement.totalRevenue?.raw || null;
			const netIncome = incomeStatement.netIncome?.raw || null;
			const ebitda = financials.ebitda?.raw || incomeStatement.ebitda?.raw || null;
			const operatingCashflow = cashflow.operatingCashflow?.raw || null;
			const freeCashflow = cashflow.freeCashflow?.raw || null;
			const totalAssets = balanceSheet.totalAssets?.raw || null;
			const currentRatio = financials.currentRatio?.raw || financials.currentRatio || null;
			const debtToEquity = financials.debtToEquity?.raw || financials.debtToEquity || null;
			
			// Try Yahoo Finance chart for YTD mini chart
			let chartData = [];
			let chartTimestamps = [];
			try {
				// Fetch YTD data (year-to-date)
				const chartRes = await fetch(`http://localhost:3000/api/yahoo/chart/${symbol}?interval=1d&range=ytd`).catch(() => null);
				if (chartRes?.ok) {
					const chart = await chartRes.json();
					const result = chart?.chart?.result?.[0];
					if (result?.indicators?.quote?.[0]?.close) {
						chartData = result.indicators.quote[0].close;
						chartTimestamps = result.timestamp || [];
					}
				}
			} catch (e) {
				console.warn(`[Comparison] Chart data unavailable for ${symbol}`);
			}
			
			// If no chart data and we have a price, create a simple trend
			if (chartData.length === 0 && price > 0) {
				const basePrice = price * 0.95;
				chartData = Array.from({ length: 30 }, (_, i) => {
					const progress = i / 29;
					return basePrice + (price - basePrice) * progress + (Math.random() - 0.5) * price * 0.02;
				});
			}
			
			// Calculate YTD % change and absolute change from chart data if available
			let ytdChangePercent = changePercent; // Default to daily change
			let ytdChange = change; // Default to daily change
			if (chartData.length > 0 && price > 0) {
				// Find first valid price (YTD start)
				const validChartData = chartData.filter(v => v !== null && v !== undefined && !isNaN(v) && v > 0);
				if (validChartData.length > 0) {
					const firstPrice = validChartData[0];
					if (firstPrice > 0) {
						ytdChange = price - firstPrice; // Absolute YTD change
						ytdChangePercent = ((price - firstPrice) / firstPrice) * 100;
						console.log(`[Comparison] YTD change calculated for ${symbol}:`, {
							firstPrice,
							currentPrice: price,
							ytdChange,
							ytdChangePercent
						});
					}
				}
			}
			
			console.log(`[Comparison] Data extracted for ${symbol}:`, { price, name, marketCap, peRatio, ytdChangePercent });
			
			return {
				symbol,
				name,
				price,
				change: ytdChange, // Use calculated YTD absolute change
				changePercent: ytdChangePercent, // Use calculated YTD change
				marketCap,
				peRatio,
				volume,
				high52w,
				low52w,
				dividendYield,
				beta,
				// Valuation
				forwardPE,
				priceToBook,
				priceToSales,
				pegRatio,
				enterpriseValue,
				// Profitability
				eps,
				profitMargin,
				operatingMargin,
				roe,
				roa,
				roi,
				// Growth
				revenueGrowth,
				earningsGrowth,
				revenueGrowth3Y,
				earningsGrowth3Y,
				// Financial Health
				totalRevenue,
				netIncome,
				ebitda,
				operatingCashflow,
				freeCashflow,
				totalAssets,
				currentRatio,
				debtToEquity,
				chartData,
				chartTimestamps
			};
		} catch (e) {
			console.error(`[Comparison] Error loading data for ${symbol}:`, e);
			return {
				symbol,
				name: symbol,
				price: 0,
				change: 0,
				changePercent: 0,
				marketCap: null,
				peRatio: null,
				volume: null,
				high52w: null,
				low52w: null,
				dividendYield: null,
				beta: null,
				// Valuation
				forwardPE: null,
				priceToBook: null,
				priceToSales: null,
				pegRatio: null,
				enterpriseValue: null,
				// Profitability
				eps: null,
				profitMargin: null,
				operatingMargin: null,
				roe: null,
				roa: null,
				roi: null,
				// Growth
				revenueGrowth: null,
				earningsGrowth: null,
				revenueGrowth3Y: null,
				earningsGrowth3Y: null,
				// Financial Health
				totalRevenue: null,
				netIncome: null,
				ebitda: null,
				operatingCashflow: null,
				freeCashflow: null,
				totalAssets: null,
				currentRatio: null,
				debtToEquity: null,
				chartData: [],
				chartTimestamps: []
			};
		}
	}
	
	renderComparison() {
		const content = this.shadowRoot.getElementById('comparison-content');
		
		// Render stock cards
		const cardsHtml = this.stockData.map((stock, idx) => this.renderStockCard(stock, idx)).join('');
		
		// Render comparison table
		const tableHtml = this.renderComparisonTable();
		
		content.innerHTML = `
			<div class="comparison-grid">
				${cardsHtml}
			</div>
			${tableHtml}
		`;
		
		// Render mini charts
		this.stockData.forEach((stock, idx) => {
			this.renderMiniChart(stock, idx);
		});
	}
	
	renderStockCard(stock, idx) {
		// Use changePercent (YTD) for color logic
		const changeClass = stock.changePercent >= 0 ? 'positive' : 'negative';
		const changeSign = stock.changePercent >= 0 ? '+' : '';
		
		return `
			<div class="stock-card">
				<div class="stock-card-header">
					<div class="stock-symbol" data-symbol="${stock.symbol}">${stock.symbol}</div>
					<div class="stock-name">${stock.name}</div>
				</div>
				<div class="stock-price">$${stock.price.toFixed(2)}</div>
				<div class="stock-change ${changeClass}">
					${changeSign}${stock.change.toFixed(2)} (${changeSign}${stock.changePercent.toFixed(2)}% YTD)
				</div>
				<div class="mini-chart" id="chart-${idx}"></div>
				<div class="metrics-grid">
					<div class="metric">
						<div class="metric-label">Change % (YTD)</div>
						<div class="metric-value ${changeClass}">${changeSign}${stock.changePercent.toFixed(2)}%</div>
					</div>
					<div class="metric">
						<div class="metric-label">P/E Ratio</div>
						<div class="metric-value">${stock.peRatio ? stock.peRatio.toFixed(2) : 'N/A'}</div>
					</div>
					<div class="metric">
						<div class="metric-label">Beta</div>
						<div class="metric-value">${stock.beta ? stock.beta.toFixed(2) : 'N/A'}</div>
					</div>
					<div class="metric">
						<div class="metric-label">Price/Book</div>
						<div class="metric-value">${stock.priceToBook ? stock.priceToBook.toFixed(2) : 'N/A'}</div>
					</div>
				</div>
			</div>
		`;
	}
	
	renderComparisonTable() {
		const groups = [
			{
				name: 'Price & Market',
				rows: [
					{ label: 'Price', key: 'price', format: (v) => `$${v.toFixed(2)}`, best: 'highest' },
					{ label: 'Change % (YTD)', key: 'changePercent', format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, best: 'highest' },
					{ label: 'Market Cap', key: 'marketCap', format: (v) => v ? this.formatMarketCap(v) : 'N/A', best: 'highest' },
					{ label: 'Volume', key: 'volume', format: (v) => v ? this.formatVolume(v) : 'N/A', best: 'highest' },
					{ label: '52W High', key: 'high52w', format: (v) => v ? `$${v.toFixed(2)}` : 'N/A', best: 'highest' },
					{ label: '52W Low', key: 'low52w', format: (v) => v ? `$${v.toFixed(2)}` : 'N/A', best: 'lowest' }
				]
			},
			{
				name: 'Valuation',
				rows: [
					{ label: 'P/E Ratio (TTM)', key: 'peRatio', format: (v) => v ? v.toFixed(2) : 'N/A', best: 'lowest' },
					{ label: 'Forward P/E', key: 'forwardPE', format: (v) => v ? v.toFixed(2) : 'N/A', best: 'lowest' },
					{ label: 'PEG Ratio', key: 'pegRatio', format: (v) => v ? v.toFixed(2) : 'N/A', best: 'lowest' },
					{ label: 'Price/Book', key: 'priceToBook', format: (v) => v ? v.toFixed(2) : 'N/A', best: 'lowest' },
					{ label: 'Price/Sales', key: 'priceToSales', format: (v) => v ? v.toFixed(2) : 'N/A', best: 'lowest' },
					{ label: 'Enterprise Value', key: 'enterpriseValue', format: (v) => v ? this.formatMarketCap(v) : 'N/A', best: 'lowest' },
					{ label: 'Beta', key: 'beta', format: (v) => v ? v.toFixed(2) : 'N/A', best: 'lowest' }
				]
			},
			{
				name: 'Profitability',
				rows: [
					{ label: 'EPS (TTM)', key: 'eps', format: (v) => v ? this.formatCurrency(v, 2) : 'N/A', best: 'highest' },
					{ label: 'Profit Margin', key: 'profitMargin', format: (v) => v ? v.toFixed(2) + '%' : 'N/A', best: 'highest' },
					{ label: 'Operating Margin', key: 'operatingMargin', format: (v) => v ? v.toFixed(2) + '%' : 'N/A', best: 'highest' },
					{ label: 'ROE', key: 'roe', format: (v) => v ? this.formatROE(v) : 'N/A', best: 'highest' },
					{ label: 'ROA', key: 'roa', format: (v) => v ? this.formatROE(v) : 'N/A', best: 'highest' },
					{ label: 'ROI', key: 'roi', format: (v) => v ? this.formatROE(v) : 'N/A', best: 'highest' }
				]
			},
			{
				name: 'Growth',
				rows: [
					{ label: 'Revenue Growth (TTM)', key: 'revenueGrowth', format: (v) => v ? this.formatGrowth(v) : 'N/A', best: 'highest' },
					{ label: 'Earnings Growth (TTM)', key: 'earningsGrowth', format: (v) => v ? this.formatGrowth(v) : 'N/A', best: 'highest' },
					{ label: 'Revenue Growth (3Y)', key: 'revenueGrowth3Y', format: (v) => v ? this.formatGrowth(v) : 'N/A', best: 'highest' },
					{ label: 'Earnings Growth (3Y)', key: 'earningsGrowth3Y', format: (v) => v ? this.formatGrowth(v) : 'N/A', best: 'highest' }
				]
			},
			{
				name: 'Financial Health',
				rows: [
					{ label: 'Total Revenue', key: 'totalRevenue', format: (v) => v ? this.formatMarketCap(v) : 'N/A', best: 'highest' },
					{ label: 'Net Income', key: 'netIncome', format: (v) => v ? this.formatMarketCap(v) : 'N/A', best: 'highest' },
					{ label: 'EBITDA', key: 'ebitda', format: (v) => v ? this.formatMarketCap(v) : 'N/A', best: 'highest' },
					{ label: 'Operating Cashflow', key: 'operatingCashflow', format: (v) => v ? this.formatMarketCap(v) : 'N/A', best: 'highest' },
					{ label: 'Free Cashflow', key: 'freeCashflow', format: (v) => v ? this.formatMarketCap(v) : 'N/A', best: 'highest' },
					{ label: 'Total Assets', key: 'totalAssets', format: (v) => v ? this.formatMarketCap(v) : 'N/A', best: 'highest' },
					{ label: 'Current Ratio', key: 'currentRatio', format: (v) => v ? v.toFixed(2) : 'N/A', best: 'highest' },
					{ label: 'Debt/Equity', key: 'debtToEquity', format: (v) => v ? v.toFixed(2) : 'N/A', best: 'lowest' },
					{ label: 'Dividend Yield', key: 'dividendYield', format: (v) => v ? this.formatPercentage(v, true) : 'N/A', best: 'highest' }
				]
			}
		];
		
		const rows = groups.flatMap(group => group.rows);
		
		const tableRows = rows.map(row => {
			const values = this.stockData.map(stock => stock[row.key]);
			const formattedValues = values.map(v => row.format(v));
			
			// Check if all values are "N/A" - if so, skip this row
			const allNA = formattedValues.every(v => v === 'N/A' || v === null || v === undefined);
			if (allNA) {
				return ''; // Skip this row
			}
			
			const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
			
			let bestIdx = -1;
			let worstIdx = -1;
			
			if (validValues.length > 0) {
				if (row.best === 'highest') {
					bestIdx = values.indexOf(Math.max(...validValues));
					worstIdx = values.indexOf(Math.min(...validValues));
				} else {
					bestIdx = values.indexOf(Math.min(...validValues));
					worstIdx = values.indexOf(Math.max(...validValues));
				}
			}
			
			const cells = this.stockData.map((stock, idx) => {
				const value = stock[row.key];
				const formatted = row.format(value);
				let cellClass = '';
				if (bestIdx === idx && bestIdx !== worstIdx) cellClass = 'best-value';
				if (worstIdx === idx && bestIdx !== worstIdx) cellClass = 'worst-value';
				
				return `<td class="${cellClass}">${formatted}</td>`;
			}).join('');
			
			// Pad with empty cells if less than 3 stocks
			const emptyCells = Array(3 - this.stockData.length).fill('<td></td>').join('');
			
			return `
				<tr>
					<td><strong>${row.label}</strong></td>
					${cells}${emptyCells}
				</tr>
			`;
		}).filter(row => row !== '').join(''); // Filter out empty rows
		
		const headerCells = this.symbols.map(s => `<th>${s}</th>`).join('');
		const emptyHeaders = Array(3 - this.symbols.length).fill('<th></th>').join('');
		
		// Group rows by category
		let groupedRows = '';
		let currentGroup = null;
		groups.forEach(group => {
			const groupRows = group.rows.map(row => {
				const values = this.stockData.map(stock => stock[row.key]);
				const formattedValues = values.map(v => row.format(v));
				
				// Check if all values are "N/A" - if so, skip this row
				const allNA = formattedValues.every(v => v === 'N/A' || v === null || v === undefined);
				if (allNA) {
					return ''; // Skip this row
				}
				
				const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
				
				let bestIdx = -1;
				let worstIdx = -1;
				
				if (validValues.length > 0) {
					if (row.best === 'highest') {
						bestIdx = values.indexOf(Math.max(...validValues));
						worstIdx = values.indexOf(Math.min(...validValues));
					} else {
						bestIdx = values.indexOf(Math.min(...validValues));
						worstIdx = values.indexOf(Math.max(...validValues));
					}
				}
				
				const cells = this.stockData.map((stock, idx) => {
					const value = stock[row.key];
					const formatted = row.format(value);
					let cellClass = '';
					if (bestIdx === idx && bestIdx !== worstIdx) cellClass = 'best-value';
					if (worstIdx === idx && bestIdx !== worstIdx) cellClass = 'worst-value';
					
					return `<td class="${cellClass}">${formatted}</td>`;
				}).join('');
				
				const emptyCells = Array(3 - this.stockData.length).fill('<td></td>').join('');
				
				return `
					<tr>
						<td><strong>${row.label}</strong></td>
						${cells}${emptyCells}
					</tr>
				`;
			}).filter(row => row !== '').join(''); // Filter out empty rows
			
			groupedRows += `
				<tr class="group-header">
					<td colspan="${3 + 1}" style="background: #1f2a37; color: #4ea1f3; font-weight: 700; padding: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.85rem;">
						${group.name}
					</td>
				</tr>
				${groupRows}
			`;
		});
		
		return `
			<table class="comparison-table">
				<thead>
					<tr>
						<th>Metric</th>
						${headerCells}${emptyHeaders}
					</tr>
				</thead>
				<tbody>
					${groupedRows}
				</tbody>
			</table>
		`;
	}
	
	renderMiniChart(stock, idx) {
		const canvas = this.shadowRoot.getElementById(`chart-${idx}`);
		if (!canvas || !stock.chartData || stock.chartData.length === 0) return;
		
		// Use Chart.js if available for better rendering
		if (typeof Chart !== 'undefined') {
			// Clear canvas
			canvas.innerHTML = '<canvas></canvas>';
			const chartCanvas = canvas.querySelector('canvas');
			if (!chartCanvas) return;
			
			const ctx = chartCanvas.getContext('2d');
			const dpr = window.devicePixelRatio || 1;
			const rect = canvas.getBoundingClientRect();
			
			const width = rect.width > 0 ? rect.width : 300;
			const height = rect.height > 0 ? rect.height : 140;
			
			chartCanvas.width = width * dpr;
			chartCanvas.height = height * dpr;
			ctx.scale(dpr, dpr);
			chartCanvas.style.width = width + 'px';
			chartCanvas.style.height = height + 'px';
			
			const validData = stock.chartData.filter(v => v !== null && v !== undefined && !isNaN(v));
			if (validData.length === 0) return;
			
			// Create labels from timestamps (YTD dates)
			let labels = [];
			if (stock.chartTimestamps && stock.chartTimestamps.length === validData.length) {
				labels = stock.chartTimestamps.map(ts => {
					const date = new Date(ts * 1000);
					return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
				});
			} else {
				// Fallback: create labels from indices
				labels = validData.map((_, i) => {
					const date = new Date();
					date.setDate(date.getDate() - (validData.length - i));
					return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
				});
			}
			
			// Use changePercent (YTD) to determine color
			const isPositive = stock.changePercent >= 0;
			const lineColor = isPositive ? '#10b981' : '#ef4444';
			const fillColor = isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
			const gridColor = this.classList.contains('light-mode') ? '#a0aab8' : '#1a2330';
			const textColor = this.classList.contains('light-mode') ? '#1a1a1a' : '#9fb0c0';
			
			if (this.miniCharts && this.miniCharts[idx]) {
				this.miniCharts[idx].destroy();
			}
			if (!this.miniCharts) {
				this.miniCharts = [];
			}
			
			this.miniCharts[idx] = new Chart(ctx, {
				type: 'line',
				data: {
					labels: labels,
					datasets: [{
						label: stock.symbol,
						data: validData,
						borderColor: lineColor,
						backgroundColor: fillColor,
						borderWidth: 2,
						fill: true,
						tension: 0.4,
						pointRadius: 0,
						pointHoverRadius: 0
					}]
				},
				options: {
					maintainAspectRatio: false,
					responsive: true,
					plugins: {
						legend: { display: false },
						tooltip: { 
							enabled: true,
							callbacks: {
								label: (context) => {
									return `$${context.parsed.y.toFixed(2)}`;
								}
							}
						},
						title: {
							display: true,
							text: 'YTD',
							color: textColor,
							font: { size: 10 }
						}
					},
					scales: {
						x: { 
							display: true,
							grid: { 
								display: true,
								color: gridColor,
								lineWidth: 1
							},
							ticks: {
								color: textColor,
								font: { size: 9 },
								maxRotation: 45,
								minRotation: 45
							}
						},
						y: { 
							display: true,
							grid: { 
								display: true,
								color: gridColor,
								lineWidth: 1
							},
							ticks: {
								color: textColor,
								font: { size: 9 },
								callback: function(value) {
									return '$' + value.toFixed(0);
								}
							}
						}
					},
					interaction: { intersect: false, mode: 'index' }
				}
			});
			return;
		}
		
		// Fallback to simple canvas rendering
		const ctx = document.createElement('canvas');
		ctx.width = canvas.offsetWidth || 300;
		ctx.height = canvas.offsetHeight || 140;
		canvas.innerHTML = '';
		canvas.appendChild(ctx);
		
		const c = ctx.getContext('2d');
		const width = ctx.width;
		const height = ctx.height;
		const padding = 8;
		const chartWidth = width - (padding * 2);
		const chartHeight = height - (padding * 2);
		
		const validData = stock.chartData.filter(v => v !== null && v !== undefined);
		if (validData.length === 0) return;
		
		const min = Math.min(...validData);
		const max = Math.max(...validData);
		const range = max - min || 1;
		
		c.fillStyle = this.classList.contains('light-mode') ? '#c0c9d4' : '#0b0f14';
		c.fillRect(0, 0, width, height);
		
		// Use changePercent (YTD) to determine color
		c.strokeStyle = stock.changePercent >= 0 ? '#10b981' : '#ef4444';
		c.lineWidth = 2;
		c.beginPath();
		
		validData.forEach((value, i) => {
			const x = padding + (chartWidth / (validData.length - 1)) * i;
			const y = padding + chartHeight - ((value - min) / range) * chartHeight;
			
			if (i === 0) {
				c.moveTo(x, y);
			} else {
				c.lineTo(x, y);
			}
		});
		
		c.stroke();
		
		c.fillStyle = stock.changePercent >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
		c.lineTo(width - padding, height - padding);
		c.lineTo(padding, height - padding);
		c.closePath();
		c.fill();
	}
	
	formatMarketCap(cap) {
		if (!cap || isNaN(cap)) return 'N/A';
		// Validate that market cap is reasonable (should be at least 1M for stocks)
		// If it's too small, it's likely incorrect data
		if (cap < 1e6) {
			console.warn(`[Comparison] Market cap seems too small: ${cap}, returning N/A`);
			return 'N/A';
		}
		// Handle very large numbers (trillions)
		if (cap >= 1e12) return `$${(cap / 1e12).toFixed(3)}T`;
		// Handle billions - use 3 decimal places for precision
		if (cap >= 1e9) return `$${(cap / 1e9).toFixed(3)}B`;
		// Handle millions
		if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
		// For values less than 1M, return N/A (likely incorrect)
		return 'N/A';
	}
	
	formatVolume(vol) {
		if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
		if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
		if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
		return vol.toFixed(0);
	}
	
	formatCurrency(value, decimals = 2) {
		if (value === null || value === undefined || isNaN(value)) return 'N/A';
		// Format with thousand separators
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		}).format(value);
	}
	
	formatPercentage(value, isDecimal = false) {
		if (value === null || value === undefined || isNaN(value)) return 'N/A';
		
		// Display value directly from yfinance (no calculations)
		// yfinance provides values as-is, so we just format them
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value) + '%';
	}
	
	formatROE(value) {
		if (value === null || value === undefined || isNaN(value)) return 'N/A';
		// Display value directly from yfinance (no calculations)
		// yfinance provides values as-is, so we just format them
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value) + '%';
	}
	
	formatGrowth(value) {
		if (value === null || value === undefined || isNaN(value)) return 'N/A';
		// Display value directly from yfinance (no calculations)
		// yfinance provides values as-is, so we just format them
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value) + '%';
	}
	
	setupAutocomplete() {
		// Store valid symbols for each input
		if (!this.validSymbols) {
			this.validSymbols = {
				'stock1-input': new Set(),
				'stock2-input': new Set(),
				'stock3-input': new Set()
			};
		}
		
		['stock1-input', 'stock2-input', 'stock3-input'].forEach((inputId, idx) => {
			const input = this.shadowRoot.getElementById(inputId);
			const dropdown = this.shadowRoot.getElementById(`autocomplete-dropdown-${idx + 1}`);
			if (!input || !dropdown) {
				console.log(`[Autocomplete] Missing input or dropdown: input=${inputId}, dropdown=autocomplete-dropdown-${idx + 1}`);
				return;
			}
			
			let debounceTimer = null;
			let selectedIndex = -1;
			
			input.addEventListener('input', (e) => {
				const query = e.target.value.trim();
				
				if (debounceTimer) clearTimeout(debounceTimer);
				selectedIndex = -1;
				
				if (query.length < 1) {
					dropdown.classList.remove('show');
					return;
				}
				
				dropdown.innerHTML = '<div class="autocomplete-loading">Searching...</div>';
				dropdown.classList.add('show');
				
				debounceTimer = setTimeout(() => {
					this.searchSymbols(query, dropdown, inputId);
				}, 300);
			});
			
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
						dropdown.classList.remove('show');
					} else {
						// Only allow if a suggestion is selected
						const symbol = input.value.trim().toUpperCase();
						if (!this.validSymbols[inputId] || !this.validSymbols[inputId].has(symbol)) {
							alert('Please select a stock from the suggestions.');
						}
					}
				} else if (e.key === 'Escape') {
					dropdown.classList.remove('show');
				}
			});
			
			// Close dropdown when clicking outside
			document.addEventListener('click', (e) => {
				if (!this.shadowRoot.contains(e.target)) {
					dropdown.classList.remove('show');
				}
			});
		});
	}
	
	async searchSymbols(query, dropdown, inputId) {
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
				if (this.validSymbols && this.validSymbols[inputId]) {
					this.validSymbols[inputId].clear();
				}
				return;
			}
			
			// Store valid symbols for this input
			if (!this.validSymbols) {
				this.validSymbols = {
					'stock1-input': new Set(),
					'stock2-input': new Set(),
					'stock3-input': new Set()
				};
			}
			this.validSymbols[inputId].clear();
			results.slice(0, 8).forEach(item => {
				this.validSymbols[inputId].add(item.symbol.toUpperCase());
			});
			
			dropdown.innerHTML = results.slice(0, 8).map((item) => `
				<div class="autocomplete-item" data-symbol="${item.symbol}">
					<span class="autocomplete-symbol">${item.symbol}</span>
					<span class="autocomplete-name">${item.name}</span>
					<span class="autocomplete-type">${item.type}</span>
				</div>
			`).join('');
			
			// Add click handlers - find the input by matching the dropdown index
			const inputIndex = parseInt(dropdown.id.replace('autocomplete-dropdown-', '')) - 1;
			const inputIds = ['stock1-input', 'stock2-input', 'stock3-input'];
			const targetInput = this.shadowRoot.getElementById(inputIds[inputIndex]);
			
			dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
				item.addEventListener('click', () => {
					const symbol = item.dataset.symbol;
					if (targetInput) {
						targetInput.value = symbol;
						dropdown.classList.remove('show');
					}
				});
			});
		} catch (error) {
			console.error('[Autocomplete] Error:', error);
			dropdown.innerHTML = '<div class="autocomplete-empty">Connection error</div>';
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
}

// Handle clicks on symbol cells
document.addEventListener('click', (e) => {
	if (e.target.classList.contains('stock-symbol')) {
		const symbol = e.target.getAttribute('data-symbol');
		if (symbol) {
			window.dispatchEvent(new CustomEvent('navigate', { 
				detail: { page: 'stock-analysis', symbol } 
			}));
		}
	}
});


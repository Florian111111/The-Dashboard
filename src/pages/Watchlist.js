import { API_BASE_URL } from '../config.js';

export class Watchlist extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.watchlist = [];
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
				
				.add-stock-section {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
					margin-bottom: 30px;
				}
				:host(.light-mode) .add-stock-section {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.add-stock-form {
					display: flex;
					gap: 10px;
					align-items: center;
				}
				.add-stock-input {
					flex: 1;
					background: #0b0f14;
					border: 1px solid #1f2a37;
					color: #e6edf3;
					padding: 12px 16px;
					border-radius: 8px;
					font-size: 1rem;
					outline: none;
					width: 100%;
					box-sizing: border-box;
				}
				:host(.light-mode) .add-stock-input {
					background: var(--bg-primary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
				.add-stock-input:focus {
					border-color: #4ea1f3;
				}
				:host(.light-mode) .add-stock-input:focus {
					border-color: var(--accent-blue);
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
				.add-stock-btn {
					background: linear-gradient(135deg, #4ea1f3 0%, #3b82f6 100%);
					color: #0b0f14;
					border: none;
					padding: 12px 24px;
					border-radius: 8px;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s;
				}
				.add-stock-btn:hover {
					background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
				}
				
				.watchlist-table {
					width: 100%;
					border-collapse: collapse;
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					overflow: hidden;
				}
				:host(.light-mode) .watchlist-table {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.watchlist-table thead {
					background: #0b0f14;
				}
				:host(.light-mode) .watchlist-table thead {
					background: var(--bg-tertiary);
				}
				.watchlist-table th {
					padding: 15px;
					text-align: left;
					color: #9fb0c0;
					font-size: 0.85rem;
					font-weight: 600;
					text-transform: uppercase;
					letter-spacing: 0.5px;
					border-bottom: 1px solid #1f2a37;
				}
				:host(.light-mode) .watchlist-table th {
					color: var(--text-secondary);
					border-bottom-color: var(--border-color);
				}
				.watchlist-table td {
					padding: 15px;
					border-bottom: 1px solid #1f2a37;
					color: #e6edf3;
				}
				:host(.light-mode) .watchlist-table td {
					border-bottom-color: var(--border-color);
					color: var(--text-primary);
				}
				.watchlist-table tr:last-child td {
					border-bottom: none;
				}
				.watchlist-table tr:hover {
					background: #0b0f14;
				}
				:host(.light-mode) .watchlist-table tr:hover {
					background: var(--bg-tertiary);
				}
				.symbol-cell {
					font-weight: 700;
					color: #4ea1f3;
					cursor: pointer;
				}
				:host(.light-mode) .symbol-cell {
					color: var(--accent-blue);
				}
				.symbol-cell:hover {
					text-decoration: underline;
				}
				.price-cell {
					font-weight: 600;
					font-size: 1.1rem;
				}
				.change-cell.positive {
					color: #10b981;
				}
				.change-cell.negative {
					color: #ef4444;
				}
				:host(.light-mode) .change-cell.positive {
					color: #059669;
				}
				:host(.light-mode) .change-cell.negative {
					color: #dc2626;
				}
				.delete-btn {
					background: rgba(239, 68, 68, 0.2);
					border: 1px solid #ef4444;
					color: #ef4444;
					padding: 6px 12px;
					border-radius: 6px;
					cursor: pointer;
					font-size: 0.85rem;
					transition: all 0.2s;
				}
				.delete-btn:hover {
					background: rgba(239, 68, 68, 0.3);
				}
				:host(.light-mode) .delete-btn {
					background: rgba(220, 38, 38, 0.15);
					border-color: #dc2626;
					color: #dc2626;
				}
				.empty-state {
					text-align: center;
					padding: 60px 20px;
					color: #9fb0c0;
				}
				:host(.light-mode) .empty-state {
					color: var(--text-secondary);
				}
				.empty-state-icon {
					font-size: 4rem;
					margin-bottom: 20px;
				}
				.loading {
					text-align: center;
					padding: 40px;
					color: #9fb0c0;
				}
			:host(.light-mode) .loading {
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
				<h1>⭐ Watchlist</h1>
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
			
			<div class="add-stock-section">
				<div class="add-stock-form">
					<div style="position: relative; flex: 1;">
						<input type="text" class="add-stock-input" id="add-stock-input" placeholder="Enter stock symbol (e.g., AAPL)" autocomplete="off" />
						<div class="autocomplete-dropdown" id="autocomplete-dropdown"></div>
					</div>
					<button class="add-stock-btn" id="add-stock-btn">Add Stock</button>
				</div>
			</div>
			
		<div id="watchlist-content">
			<div class="loading">Loading watchlist...</div>
		</div>
		
		<div class="disclaimer-footer">
			<div>
				The information provided on this website is for general informational and educational purposes only and does not constitute investment advice, financial advice, trading advice, or any other form of recommendation. All content is provided without regard to individual financial circumstances, investment objectives, or risk tolerance. Past performance is not indicative of future results. Financial markets are subject to risk, and investing may result in the loss of part or all of your capital. Any actions taken based on the information on this website are strictly at your own risk. Before making any investment decision, you should conduct your own research and, where appropriate, consult a licensed financial advisor. By using this website, you acknowledge and agree to this disclaimer. <a href="#" id="disclaimer-link-full">Full Disclaimer</a>
			</div>
		</div>
	`;
		
		this.setupThemeToggle();
		this.setupEventListeners();
		
		// Load watchlist and render
		this.watchlist = this.loadWatchlist();
		this.renderWatchlist();
	}
	
	setupThemeToggle() {
		const themeToggle = this.shadowRoot.getElementById('theme-toggle');
		if (!themeToggle) return;
		
		// Load saved theme
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
		const addStockBtn = this.shadowRoot.getElementById('add-stock-btn');
		const addStockInput = this.shadowRoot.getElementById('add-stock-input');
		
		backBtn?.addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'market-overview' } }));
		});
		
		// Store valid symbols from autocomplete suggestions
		this.validSymbols = new Set();
		
		// Make addStock a method so it can be called from autocomplete
		this.addStock = () => {
			const symbol = addStockInput.value.trim().toUpperCase();
			if (!symbol) return;
			
			// Validate that symbol exists in autocomplete suggestions
			if (!this.validSymbols.has(symbol)) {
				alert(`Please select a valid stock from the suggestions. "${symbol}" is not a valid stock symbol.`);
				return;
			}
			
			if (this.watchlist.includes(symbol)) {
				alert(`${symbol} is already in your watchlist.`);
				return;
			}
			
			this.watchlist.push(symbol);
			this.saveWatchlist();
			addStockInput.value = '';
			this.validSymbols.clear(); // Clear valid symbols after adding
			this.renderWatchlist();
		};
		
		addStockBtn?.addEventListener('click', this.addStock);
		// Remove Enter key handler - only allow selection from autocomplete
		
		// Setup autocomplete
		this.setupAutocomplete();
	}
	
	loadWatchlist() {
		try {
			const stored = localStorage.getItem('watchlist');
			return stored ? JSON.parse(stored) : [];
		} catch (e) {
			return [];
		}
	}
	
	saveWatchlist() {
		localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
	}
	
	async renderWatchlist() {
		const content = this.shadowRoot.getElementById('watchlist-content');
		if (!content) {
			console.error('[Watchlist] Content element not found');
			return;
		}
		
		console.log('[Watchlist] Rendering watchlist with', this.watchlist.length, 'stocks');
		
		if (this.watchlist.length === 0) {
			content.innerHTML = `
				<div class="empty-state">
					<div class="empty-state-icon">⭐</div>
					<h2 style="color: #e6edf3; margin-bottom: 10px;">Your watchlist is empty</h2>
					<p>Add stocks to track their performance</p>
				</div>
			`;
			return;
		}
		
		content.innerHTML = `
			<table class="watchlist-table">
				<thead>
					<tr>
						<th>Symbol</th>
						<th>Name</th>
						<th>Price</th>
						<th>Change</th>
						<th>Change %</th>
						<th>Market Cap</th>
						<th>P/E Ratio</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody id="watchlist-tbody">
					${this.watchlist.map(() => '<tr><td colspan="8" class="loading">Loading...</td></tr>').join('')}
				</tbody>
			</table>
		`;
		
		// Load data for each stock
		const tbody = this.shadowRoot.getElementById('watchlist-tbody');
		const rows = await Promise.all(this.watchlist.map(symbol => this.loadStockData(symbol)));
		
		tbody.innerHTML = rows.join('');
		
		// Setup delete button listeners
		tbody.querySelectorAll('.delete-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const symbol = e.target.getAttribute('data-symbol');
				if (symbol && confirm(`Remove ${symbol} from watchlist?`)) {
					this.watchlist = this.watchlist.filter(s => s !== symbol);
					this.saveWatchlist();
					this.renderWatchlist();
				}
			});
		});
		
		// Setup symbol click listeners
		tbody.querySelectorAll('.symbol-cell').forEach(cell => {
			cell.addEventListener('click', () => {
				const symbol = cell.getAttribute('data-symbol');
				if (symbol) {
					window.dispatchEvent(new CustomEvent('navigate', { 
						detail: { page: 'stock-analysis', symbol } 
					}));
				}
			});
		});
	}
	
	async loadStockData(symbol) {
		try {
			console.log(`[Watchlist] Loading data for ${symbol}...`);
			
			// Fetch fundamentals from Python backend
			const fundamentalsRes = await fetch(`${API_BASE_URL}/api/fundamentals/${symbol}`).catch((e) => {
				console.error(`[Watchlist] Failed to fetch fundamentals for ${symbol}:`, e);
				return null;
			});
			
			if (!fundamentalsRes || !fundamentalsRes.ok) {
				console.error(`[Watchlist] Fundamentals request failed for ${symbol}:`, fundamentalsRes?.status);
				throw new Error(`Failed to load fundamentals for ${symbol}`);
			}
			
			const fundamentals = await fundamentalsRes.json();
			console.log(`[Watchlist] Fundamentals loaded for ${symbol}`);
			
			// Extract data from quoteSummary format (what the backend returns)
			const result = fundamentals?.quoteSummary?.result?.[0];
			if (!result) {
				throw new Error(`No result in fundamentals data for ${symbol}`);
			}
			
			const stats = result.defaultKeyStatistics || {};
			const financials = result.financialData || {};
			const profile = result.summaryProfile || {};
			
			// Get quote data (price, change) - try heatmap-quotes endpoint
			let price = 0;
			let change = 0;
			let changePercent = 0;
			
			try {
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
						console.log(`[Watchlist] Quote data loaded for ${symbol}:`, { price, change, changePercent });
					}
				}
			} catch (e) {
				console.warn(`[Watchlist] Could not fetch quote data for ${symbol}:`, e);
			}
			
			// Extract other data from fundamentals
			const name = profile.longName || profile.name || symbol;
			const marketCap = stats.marketCap?.raw || stats.marketCap || null;
			const peRatio = stats.trailingPE?.raw || stats.forwardPE?.raw || stats.trailingPE || stats.forwardPE || null;
			
			const changeClass = change >= 0 ? 'positive' : 'negative';
			const changeSign = change >= 0 ? '+' : '';
			
			return `
				<tr>
					<td class="symbol-cell" data-symbol="${symbol}">${symbol}</td>
					<td>${name}</td>
					<td class="price-cell">$${price.toFixed(2)}</td>
					<td class="change-cell ${changeClass}">${changeSign}${change.toFixed(2)}</td>
					<td class="change-cell ${changeClass}">${changeSign}${changePercent.toFixed(2)}%</td>
					<td>${marketCap ? this.formatMarketCap(marketCap) : 'N/A'}</td>
					<td>${peRatio ? peRatio.toFixed(2) : 'N/A'}</td>
					<td>
						<button class="delete-btn" data-symbol="${symbol}">Remove</button>
					</td>
				</tr>
			`;
		} catch (e) {
			return `
				<tr>
					<td class="symbol-cell">${symbol}</td>
					<td colspan="6">Error loading data</td>
					<td>
						<button class="delete-btn" data-symbol="${symbol}">Remove</button>
					</td>
				</tr>
			`;
		}
	}
	
	formatMarketCap(cap) {
		if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
		if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
		if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
		return `$${cap.toFixed(0)}`;
	}
	
	setupAutocomplete() {
		const input = this.shadowRoot.getElementById('add-stock-input');
		const dropdown = this.shadowRoot.getElementById('autocomplete-dropdown');
		if (!input || !dropdown) return;
		
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
				this.searchSymbols(query, dropdown);
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
					this.addStock();
				} else {
					// Only allow adding if a suggestion is selected
					alert('Please select a stock from the suggestions.');
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
		
		// Disclaimer link
		this.shadowRoot.getElementById('disclaimer-link-full')?.addEventListener('click', (e) => {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'disclaimer' } }));
		});
	}
	
	async searchSymbols(query, dropdown) {
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
				return;
			}
			
			// Store valid symbols
			this.validSymbols.clear();
			results.slice(0, 8).forEach(item => {
				this.validSymbols.add(item.symbol.toUpperCase());
			});
			
			dropdown.innerHTML = results.slice(0, 8).map((item) => `
				<div class="autocomplete-item" data-symbol="${item.symbol}">
					<span class="autocomplete-symbol">${item.symbol}</span>
					<span class="autocomplete-name">${item.name}</span>
					<span class="autocomplete-type">${item.type}</span>
				</div>
			`).join('');
			
			// Add click handlers
			dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
				item.addEventListener('click', () => {
					const symbol = item.dataset.symbol;
					const input = this.shadowRoot.getElementById('add-stock-input');
					if (input) {
						input.value = symbol;
						dropdown.classList.remove('show');
						this.addStock();
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


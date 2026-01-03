import { getCachedData, setCachedData } from '../utils/cache.js';

import { API_BASE_URL } from '../config.js';

export class StockAnalystRecommendation extends HTMLElement {
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
				this.loadAnalystData();
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
				#analyst-container {
					min-height: 320px;
				}
				.analyst-content {
					background: #0b0f14;
					border-radius: 8px;
					border: 1px solid #1f2a37;
					padding: 15px;
					min-height: 280px;
					height: 280px;
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: center;
					cursor: pointer;
					transition: all 0.2s;
				}
				.analyst-content:hover {
					border-color: #4ea1f3;
					transform: translateY(-2px);
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
				}
				:host(.light-mode) .analyst-content {
					background: #c0c9d4;
					border-color: #a0aab8;
					box-sizing: border-box;
					overflow: visible;
					position: relative;
				}
				:host(.light-mode) .analyst-content:hover {
					border-color: var(--accent-blue);
				}
				.analyst-bar-chart {
					cursor: pointer;
				}
				.analyst-bar-item {
					cursor: pointer;
					transition: all 0.2s;
				}
				.analyst-bar-item:hover {
					opacity: 0.8;
				}
				/* Modal Styles */
				.modal-overlay {
					position: fixed;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					background: rgba(0, 0, 0, 0.8);
					backdrop-filter: blur(4px);
					z-index: 10000;
					display: none;
					align-items: center;
					justify-content: center;
					opacity: 0;
					transition: opacity 0.3s ease;
				}
				.modal-overlay.visible {
					display: flex;
					opacity: 1;
				}
				.modal-content {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 16px;
					width: 90%;
					max-width: 800px;
					max-height: 85vh;
					overflow-y: auto;
					box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
					transform: translateY(20px);
					transition: transform 0.3s ease;
				}
				.modal-overlay.visible .modal-content {
					transform: translateY(0);
				}
				:host(.light-mode) .modal-content {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.modal-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					padding: 20px 24px;
					border-bottom: 1px solid #1f2a37;
					background: #0d1117;
				}
				:host(.light-mode) .modal-header {
					background: var(--bg-tertiary);
					border-bottom-color: var(--border-color);
				}
				.modal-title {
					font-size: 1.4rem;
					font-weight: 700;
					color: #e6edf3;
					margin: 0;
				}
				:host(.light-mode) .modal-title {
					color: var(--text-primary);
				}
				.modal-close {
					background: transparent;
					border: none;
					color: #9fb0c0;
					font-size: 1.5rem;
					cursor: pointer;
					padding: 8px;
					border-radius: 8px;
					transition: all 0.2s;
					line-height: 1;
				}
				.modal-close:hover {
					background: rgba(239, 68, 68, 0.2);
					color: #ef4444;
				}
				.modal-body {
					padding: 24px;
				}
				.modal-section {
					margin-bottom: 24px;
				}
				.modal-section-title {
					font-size: 1.1rem;
					font-weight: 600;
					color: #e6edf3;
					margin-bottom: 12px;
				}
				:host(.light-mode) .modal-section-title {
					color: var(--text-primary);
				}
				.price-target-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
					gap: 12px;
					margin-bottom: 20px;
				}
				.price-target-card {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 12px;
				}
				:host(.light-mode) .price-target-card {
					background: var(--bg-card);
					border-color: var(--border-color);
				}
				.price-target-label {
					font-size: 0.85rem;
					color: #9fb0c0;
					margin-bottom: 6px;
				}
				:host(.light-mode) .price-target-label {
					color: var(--text-secondary);
				}
				.price-target-value {
					font-size: 1.3rem;
					font-weight: 700;
					color: #4ea1f3;
				}
				:host(.light-mode) .price-target-value {
					color: var(--accent-blue);
				}
				.recommendation-details {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
					gap: 12px;
				}
				.recommendation-item {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 12px;
					text-align: center;
				}
				:host(.light-mode) .recommendation-item {
					background: var(--bg-card);
					border-color: var(--border-color);
				}
				.recommendation-item-label {
					font-size: 0.85rem;
					color: #9fb0c0;
					margin-bottom: 8px;
				}
				:host(.light-mode) .recommendation-item-label {
					color: var(--text-secondary);
				}
				.recommendation-item-value {
					font-size: 1.5rem;
					font-weight: 700;
					margin-bottom: 4px;
				}
				.recommendation-item-value.strong-buy {
					color: #10b981;
				}
				.recommendation-item-value.buy {
					color: #34d399;
				}
				.recommendation-item-value.hold {
					color: #6b7280;
				}
				.recommendation-item-value.sell {
					color: #f59e0b;
				}
				.recommendation-item-value.strong-sell {
					color: #ef4444;
				}
				.recommendation-item-percent {
					font-size: 0.75rem;
					color: #6b7280;
				}
				:host(.light-mode) .recommendation-item-percent {
					color: var(--text-muted);
				}
				.info-text {
					color: #9fb0c0;
					font-size: 0.9rem;
					line-height: 1.6;
					margin-top: 12px;
				}
				:host(.light-mode) .info-text {
					color: var(--text-secondary);
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
			<h3>Analyst Recommendation</h3>
			<div class="progress-container" id="progress-container" style="display: none;">
				<div class="progress-bar" id="progress-bar"></div>
			</div>
			<div id="analyst-container">
				<div class="loading">Loading analyst data...</div>
			</div>
			
			<!-- Modal for detailed analyst information -->
			<div class="modal-overlay" id="analyst-modal">
				<div class="modal-content">
					<div class="modal-header">
						<h2 class="modal-title">Analyst Details</h2>
						<button class="modal-close" id="modal-close">×</button>
					</div>
					<div class="modal-body" id="modal-body">
						<div class="loading">Loading details...</div>
					</div>
				</div>
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
			// Small delay to ensure theme class is applied
			setTimeout(() => {
				this.loadAnalystData();
			}, 50);
		}
		
		// Listen for theme changes
		this.themeChangeHandler = () => {
			// Update classList based on localStorage
			const savedTheme = localStorage.getItem('theme') || 'dark';
			if (savedTheme === 'light') {
				this.classList.add('light-mode');
			} else {
				this.classList.remove('light-mode');
			}
			// Small delay to ensure theme is applied
			setTimeout(() => {
				if (this.symbol) {
					this.loadAnalystData();
				}
			}, 50);
		};
		window.addEventListener('storage', this.themeChangeHandler);
		window.addEventListener('themechange', this.themeChangeHandler);
		
		// Use MutationObserver to watch for class changes
		this.observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
					// Update classList based on localStorage to ensure consistency
					const savedTheme = localStorage.getItem('theme') || 'dark';
					if (savedTheme === 'light' && !this.classList.contains('light-mode')) {
						this.classList.add('light-mode');
					} else if (savedTheme === 'dark' && this.classList.contains('light-mode')) {
						this.classList.remove('light-mode');
					}
					// Small delay to ensure theme is applied
					setTimeout(() => {
						if (this.symbol) {
							this.loadAnalystData();
						}
					}, 100);
				}
			});
		});
		this.observer.observe(this, { attributes: true, attributeFilter: ['class'] });
		
		// Also observe parent element if it exists (for StockAnalysis page)
		const parent = this.getRootNode().host || this.parentElement;
		if (parent && parent.shadowRoot) {
			this.parentObserver = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
						// Check if parent has light-mode class
						const parentHasLightMode = parent.classList?.contains('light-mode');
						const savedTheme = localStorage.getItem('theme') || 'dark';
						const shouldBeLight = savedTheme === 'light' || parentHasLightMode;
						
						if (shouldBeLight && !this.classList.contains('light-mode')) {
							this.classList.add('light-mode');
						} else if (!shouldBeLight && this.classList.contains('light-mode')) {
							this.classList.remove('light-mode');
						}
						
						// Small delay to ensure theme is applied
						setTimeout(() => {
							if (this.symbol) {
								this.loadAnalystData();
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

		async loadAnalystData() {
		if (!this.symbol) return;
		const container = this.shadowRoot.getElementById('analyst-container');
		if (!container) return;
		
		// Check cache first
		const cachedData = getCachedData(this.symbol, 'analyst');
		if (cachedData) {
			console.log('[Analyst] Using cached data');
			// Use the same rendering logic as normal load
			const data = cachedData;
			this.analystData = data;
			
			// Check theme for text colors - check multiple sources for reliability
			const savedTheme = localStorage.getItem('theme') || 'dark';
			const hasLightModeClass = this.classList.contains('light-mode');
			// Also check parent element (StockAnalysis) for light-mode class
			const parent = this.getRootNode().host || this.parentElement;
			const parentHasLightMode = parent && (parent.classList?.contains('light-mode') || parent.shadowRoot?.querySelector(':host(.light-mode)'));
			const isLightMode = savedTheme === 'light' || hasLightModeClass || parentHasLightMode;
			const labelColor = isLightMode ? '#0a0a0a' : '#9fb0c0';
			const numberBgColor = isLightMode ? 'rgba(192, 201, 212, 0.95)' : 'rgba(11, 15, 20, 0.95)';
			const numberBorderColor = isLightMode ? 'rgba(160, 170, 184, 0.8)' : 'rgba(31, 42, 55, 0.8)';
			const numberTextColor = isLightMode ? '#0a0a0a' : '#e6edf3';
			
			// Render analyst recommendation (same logic as normal load)
			let html = '<div class="analyst-content">';
			if (data.recommendations && Object.keys(data.recommendations).length > 0) {
				const rec = data.recommendations;
				const strongBuy = rec.strongBuy || 0;
				const buy = rec.buy || 0;
				const hold = rec.hold || 0;
				const sell = rec.sell || 0;
				const strongSell = rec.strongSell || 0;
				const total = strongBuy + buy + hold + sell + strongSell;
				const buyRatio = total > 0 ? (strongBuy + buy) / total : 0;
				let recommendation = 'Neutral';
				let recommendationColor = '#6b7280';
				if (buyRatio >= 0.6) {
					recommendation = 'Buy';
					recommendationColor = '#10b981';
				} else if (buyRatio <= 0.3) {
					recommendation = 'Sell';
					recommendationColor = '#ef4444';
				}
				const maxValue = total;
				
				html += `<div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box; padding: 10px;">
					<div style="color: ${recommendationColor}; font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; text-align: center; letter-spacing: 0.3px;">
						Analysts recommend: ${recommendation}
					</div>
					<div style="color: ${labelColor}; font-size: 0.7rem; margin-bottom: 8px; text-align: center; opacity: 0.7;">
						Click for detailed information
					</div>
					<div class="analyst-bar-chart" style="display: flex; align-items: flex-end; justify-content: space-around; width: 100%; max-width: 100%; height: 180px; gap: 8px; padding: 40px 8px 40px 8px; box-sizing: border-box; position: relative;">
						<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; height: 100%;">
							${strongBuy > 0 ? `<div style="color: ${numberTextColor}; font-size: 0.9rem; font-weight: 700; position: absolute; top: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: ${numberBgColor}; padding: 4px 8px; border-radius: 6px; border: 1px solid ${numberBorderColor}; z-index: 10;">${strongBuy}</div>` : ''}
							${strongBuy > 0 ? `<div style="width: 100%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #10b981 0%, #059669 100%); height: ${(strongBuy / maxValue) * 100}%; margin-bottom: 5px;" title="Strong Buy: ${strongBuy}"></div>` : ''}
							<div style="color: ${labelColor}; font-size: 0.75rem; text-align: center; position: absolute; bottom: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-weight: 500;">Strong Buy</div>
						</div>
						<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; height: 100%;">
							${buy > 0 ? `<div style="color: ${numberTextColor}; font-size: 0.9rem; font-weight: 700; position: absolute; top: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: ${numberBgColor}; padding: 4px 8px; border-radius: 6px; border: 1px solid ${numberBorderColor}; z-index: 10;">${buy}</div>` : ''}
							${buy > 0 ? `<div style="width: 100%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #34d399 0%, #10b981 100%); height: ${(buy / maxValue) * 100}%; margin-bottom: 5px;" title="Buy: ${buy}"></div>` : ''}
							<div style="color: ${labelColor}; font-size: 0.75rem; text-align: center; position: absolute; bottom: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-weight: 500;">Buy</div>
						</div>
						<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; height: 100%;">
							${hold > 0 ? `<div style="color: ${numberTextColor}; font-size: 0.9rem; font-weight: 700; position: absolute; top: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: ${numberBgColor}; padding: 4px 8px; border-radius: 6px; border: 1px solid ${numberBorderColor}; z-index: 10;">${hold}</div>` : ''}
							${hold > 0 ? `<div style="width: 100%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #6b7280 0%, #4b5563 100%); height: ${(hold / maxValue) * 100}%; margin-bottom: 5px;" title="Hold: ${hold}"></div>` : ''}
							<div style="color: ${labelColor}; font-size: 0.75rem; text-align: center; position: absolute; bottom: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-weight: 500;">Hold</div>
						</div>
						<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; height: 100%;">
							${sell > 0 ? `<div style="color: ${numberTextColor}; font-size: 0.9rem; font-weight: 700; position: absolute; top: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: ${numberBgColor}; padding: 4px 8px; border-radius: 6px; border: 1px solid ${numberBorderColor}; z-index: 10;">${sell}</div>` : ''}
							${sell > 0 ? `<div style="width: 100%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%); height: ${(sell / maxValue) * 100}%; margin-bottom: 5px;" title="Sell: ${sell}"></div>` : ''}
							<div style="color: ${labelColor}; font-size: 0.75rem; text-align: center; position: absolute; bottom: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-weight: 500;">Sell</div>
						</div>
						<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; height: 100%;">
							${strongSell > 0 ? `<div style="color: ${numberTextColor}; font-size: 0.9rem; font-weight: 700; position: absolute; top: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: ${numberBgColor}; padding: 4px 8px; border-radius: 6px; border: 1px solid ${numberBorderColor}; z-index: 10;">${strongSell}</div>` : ''}
							${strongSell > 0 ? `<div style="width: 100%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%); height: ${(strongSell / maxValue) * 100}%; margin-bottom: 5px;" title="Strong Sell: ${strongSell}"></div>` : ''}
							<div style="color: ${labelColor}; font-size: 0.75rem; text-align: center; position: absolute; bottom: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-weight: 500;">Strong Sell</div>
						</div>
					</div>
				</div>`;
			} else {
				html += `<div style="color: ${labelColor}; text-align: center;">No analyst data available</div>`;
			}
			html += '</div>';
			container.innerHTML = html;
			
			// Store data for modal
			this.analystData = data;
			
			// Add click listeners to open modal
			this.setupModalListeners();
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
			const response = await fetch(`${API_BASE_URL}/api/analyst/${this.symbol}`);
			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}
			const data = await response.json();
			
			// Check theme for text colors - check multiple sources for reliability
			const savedTheme = localStorage.getItem('theme') || 'dark';
			const hasLightModeClass = this.classList.contains('light-mode');
			// Also check parent element (StockAnalysis) for light-mode class
			const parent = this.getRootNode().host || this.parentElement;
			const parentHasLightMode = parent && (parent.classList?.contains('light-mode') || parent.shadowRoot?.querySelector(':host(.light-mode)'));
			const isLightMode = savedTheme === 'light' || hasLightModeClass || parentHasLightMode;
			const labelColor = isLightMode ? '#0a0a0a' : '#9fb0c0';
			const numberBgColor = isLightMode ? 'rgba(192, 201, 212, 0.95)' : 'rgba(11, 15, 20, 0.95)';
			const numberBorderColor = isLightMode ? 'rgba(160, 170, 184, 0.8)' : 'rgba(31, 42, 55, 0.8)';
			const numberTextColor = isLightMode ? '#0a0a0a' : '#e6edf3';
			
			// Render analyst recommendation (same logic as StockNews.js)
			let html = '<div class="analyst-content">';
			if (data.recommendations && Object.keys(data.recommendations).length > 0) {
				const rec = data.recommendations;
				const strongBuy = rec.strongBuy || 0;
				const buy = rec.buy || 0;
				const hold = rec.hold || 0;
				const sell = rec.sell || 0;
				const strongSell = rec.strongSell || 0;
				const total = strongBuy + buy + hold + sell + strongSell;
				const buyRatio = total > 0 ? (strongBuy + buy) / total : 0;
				let recommendation = 'Neutral';
				let recommendationColor = '#6b7280';
				if (buyRatio >= 0.6) {
					recommendation = 'Buy';
					recommendationColor = '#10b981';
				} else if (buyRatio <= 0.3) {
					recommendation = 'Sell';
					recommendationColor = '#ef4444';
				}
				const maxValue = total;
				
				html += `<div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box; padding: 10px;">
					<div style="color: ${recommendationColor}; font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; text-align: center; letter-spacing: 0.3px;">
						Analysts recommend: ${recommendation}
					</div>
					<div style="color: ${labelColor}; font-size: 0.7rem; margin-bottom: 8px; text-align: center; opacity: 0.7;">
						Click for detailed information
					</div>
					<div class="analyst-bar-chart" style="display: flex; align-items: flex-end; justify-content: space-around; width: 100%; max-width: 100%; height: 180px; gap: 8px; padding: 40px 8px 40px 8px; box-sizing: border-box; position: relative;">
						<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; height: 100%;">
							${strongBuy > 0 ? `<div style="color: ${numberTextColor}; font-size: 0.9rem; font-weight: 700; position: absolute; top: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: ${numberBgColor}; padding: 4px 8px; border-radius: 6px; border: 1px solid ${numberBorderColor}; z-index: 10;">${strongBuy}</div>` : ''}
							${strongBuy > 0 ? `<div style="width: 100%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #10b981 0%, #059669 100%); height: ${(strongBuy / maxValue) * 100}%; margin-bottom: 5px;" title="Strong Buy: ${strongBuy}"></div>` : ''}
							<div style="color: ${labelColor}; font-size: 0.75rem; text-align: center; position: absolute; bottom: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-weight: 500;">Strong Buy</div>
						</div>
						<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; height: 100%;">
							${buy > 0 ? `<div style="color: ${numberTextColor}; font-size: 0.9rem; font-weight: 700; position: absolute; top: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: ${numberBgColor}; padding: 4px 8px; border-radius: 6px; border: 1px solid ${numberBorderColor}; z-index: 10;">${buy}</div>` : ''}
							${buy > 0 ? `<div style="width: 100%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #34d399 0%, #10b981 100%); height: ${(buy / maxValue) * 100}%; margin-bottom: 5px;" title="Buy: ${buy}"></div>` : ''}
							<div style="color: ${labelColor}; font-size: 0.75rem; text-align: center; position: absolute; bottom: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-weight: 500;">Buy</div>
						</div>
						<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; height: 100%;">
							${hold > 0 ? `<div style="color: ${numberTextColor}; font-size: 0.9rem; font-weight: 700; position: absolute; top: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: ${numberBgColor}; padding: 4px 8px; border-radius: 6px; border: 1px solid ${numberBorderColor}; z-index: 10;">${hold}</div>` : ''}
							${hold > 0 ? `<div style="width: 100%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #6b7280 0%, #4b5563 100%); height: ${(hold / maxValue) * 100}%; margin-bottom: 5px;" title="Hold: ${hold}"></div>` : ''}
							<div style="color: ${labelColor}; font-size: 0.75rem; text-align: center; position: absolute; bottom: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-weight: 500;">Hold</div>
						</div>
						<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; height: 100%;">
							${sell > 0 ? `<div style="color: ${numberTextColor}; font-size: 0.9rem; font-weight: 700; position: absolute; top: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: ${numberBgColor}; padding: 4px 8px; border-radius: 6px; border: 1px solid ${numberBorderColor}; z-index: 10;">${sell}</div>` : ''}
							${sell > 0 ? `<div style="width: 100%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%); height: ${(sell / maxValue) * 100}%; margin-bottom: 5px;" title="Sell: ${sell}"></div>` : ''}
							<div style="color: ${labelColor}; font-size: 0.75rem; text-align: center; position: absolute; bottom: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-weight: 500;">Sell</div>
						</div>
						<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; height: 100%;">
							${strongSell > 0 ? `<div style="color: ${numberTextColor}; font-size: 0.9rem; font-weight: 700; position: absolute; top: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: ${numberBgColor}; padding: 4px 8px; border-radius: 6px; border: 1px solid ${numberBorderColor}; z-index: 10;">${strongSell}</div>` : ''}
							${strongSell > 0 ? `<div style="width: 100%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%); height: ${(strongSell / maxValue) * 100}%; margin-bottom: 5px;" title="Strong Sell: ${strongSell}"></div>` : ''}
							<div style="color: ${labelColor}; font-size: 0.75rem; text-align: center; position: absolute; bottom: -35px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-weight: 500;">Strong Sell</div>
						</div>
					</div>
				</div>`;
			} else {
				html += `<div style="color: ${labelColor}; text-align: center;">No analyst data available</div>`;
			}
			html += '</div>';
			container.innerHTML = html;
			
			// Store data for modal
			this.analystData = data;
			
			// Cache the analyst data
			setCachedData(this.symbol, 'analyst', data);
			
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
			
			// Add click listeners to open modal
			this.setupModalListeners();
		} catch (error) {
			if (progressInterval) {
				clearInterval(progressInterval);
			}
			if (progressContainer) {
				progressContainer.style.display = 'none';
			}
			console.error('[Analyst Recommendation] Error:', error);
			container.innerHTML = `<div class="error">Error loading analyst data: ${error.message}</div>`;
		}
	}
	
	setupModalListeners() {
		const analystContent = this.shadowRoot.querySelector('.analyst-content');
		const modal = this.shadowRoot.getElementById('analyst-modal');
		const modalClose = this.shadowRoot.getElementById('modal-close');
		const modalBody = this.shadowRoot.getElementById('modal-body');
		
		// Open modal when clicking on analyst content
		if (analystContent) {
			analystContent.addEventListener('click', () => {
				this.openModal();
			});
		}
		
		// Close modal
		if (modalClose) {
			modalClose.addEventListener('click', () => {
				this.closeModal();
			});
		}
		
		// Close modal when clicking outside
		if (modal) {
			modal.addEventListener('click', (e) => {
				if (e.target === modal) {
					this.closeModal();
				}
			});
		}
	}
	
	openModal() {
		const modal = this.shadowRoot.getElementById('analyst-modal');
		const modalBody = this.shadowRoot.getElementById('modal-body');
		
		if (!modal || !modalBody || !this.analystData) return;
		
		// Render modal content
		this.renderModalContent(modalBody);
		
		// Show modal
		modal.classList.add('visible');
		document.body.style.overflow = 'hidden';
	}
	
	closeModal() {
		const modal = this.shadowRoot.getElementById('analyst-modal');
		if (modal) {
			modal.classList.remove('visible');
			document.body.style.overflow = '';
		}
	}
	
	renderModalContent(container) {
		if (!this.analystData) return;
		
		const data = this.analystData;
		const isLightMode = this.classList.contains('light-mode');
		const textColor = isLightMode ? '#0a0a0a' : '#e6edf3';
		const secondaryColor = isLightMode ? '#1a1a1a' : '#9fb0c0';
		
		let html = '';
		
		// Price Target Section
		if (data.priceTarget) {
			const target = data.priceTarget;
			const currentPrice = data.currentPrice;
			html += `
				<div class="modal-section">
					<h3 class="modal-section-title">Price Targets</h3>
					<div class="price-target-grid">
						${currentPrice ? `
							<div class="price-target-card">
								<div class="price-target-label">Current Price</div>
								<div class="price-target-value">$${currentPrice.toFixed(2)}</div>
							</div>
						` : ''}
						${target.mean ? `
							<div class="price-target-card">
								<div class="price-target-label">Mean Target</div>
								<div class="price-target-value">$${target.mean.toFixed(2)}</div>
								${currentPrice ? `<div style="font-size: 0.75rem; color: ${secondaryColor}; margin-top: 4px;">
									${target.mean > currentPrice ? '+' : ''}${((target.mean / currentPrice - 1) * 100).toFixed(1)}%
								</div>` : ''}
							</div>
						` : ''}
						${target.median ? `
							<div class="price-target-card">
								<div class="price-target-label">Median Target</div>
								<div class="price-target-value">$${target.median.toFixed(2)}</div>
								${currentPrice ? `<div style="font-size: 0.75rem; color: ${secondaryColor}; margin-top: 4px;">
									${target.median > currentPrice ? '+' : ''}${((target.median / currentPrice - 1) * 100).toFixed(1)}%
								</div>` : ''}
							</div>
						` : ''}
						${target.high ? `
							<div class="price-target-card">
								<div class="price-target-label">High Target</div>
								<div class="price-target-value">$${target.high.toFixed(2)}</div>
								${currentPrice ? `<div style="font-size: 0.75rem; color: ${secondaryColor}; margin-top: 4px;">
									${target.high > currentPrice ? '+' : ''}${((target.high / currentPrice - 1) * 100).toFixed(1)}%
								</div>` : ''}
							</div>
						` : ''}
						${target.low ? `
							<div class="price-target-card">
								<div class="price-target-label">Low Target</div>
								<div class="price-target-value">$${target.low.toFixed(2)}</div>
								${currentPrice ? `<div style="font-size: 0.75rem; color: ${secondaryColor}; margin-top: 4px;">
									${target.low > currentPrice ? '+' : ''}${((target.low / currentPrice - 1) * 100).toFixed(1)}%
								</div>` : ''}
							</div>
						` : ''}
					</div>
					${target.numberOfAnalysts ? `
						<div class="info-text" style="color: ${secondaryColor}; margin-top: 12px;">
							Based on ${target.numberOfAnalysts} analyst price targets
						</div>
					` : ''}
				</div>
			`;
		}
		
		// Recommendations Section
		if (data.recommendations && Object.keys(data.recommendations).length > 0) {
			const rec = data.recommendations;
			const strongBuy = rec.strongBuy || 0;
			const buy = rec.buy || 0;
			const hold = rec.hold || 0;
			const sell = rec.sell || 0;
			const strongSell = rec.strongSell || 0;
			const total = strongBuy + buy + hold + sell + strongSell;
			
			html += `
				<div class="modal-section">
					<h3 class="modal-section-title">Analyst Recommendation Breakdown</h3>
					<div class="recommendation-details">
						${strongBuy > 0 ? `
							<div class="recommendation-item">
								<div class="recommendation-item-label">Strong Buy</div>
								<div class="recommendation-item-value strong-buy">${strongBuy}</div>
								<div class="recommendation-item-percent">${((strongBuy / total) * 100).toFixed(1)}% of analysts</div>
							</div>
						` : ''}
						${buy > 0 ? `
							<div class="recommendation-item">
								<div class="recommendation-item-label">Buy</div>
								<div class="recommendation-item-value buy">${buy}</div>
								<div class="recommendation-item-percent">${((buy / total) * 100).toFixed(1)}% of analysts</div>
							</div>
						` : ''}
						${hold > 0 ? `
							<div class="recommendation-item">
								<div class="recommendation-item-label">Hold</div>
								<div class="recommendation-item-value hold">${hold}</div>
								<div class="recommendation-item-percent">${((hold / total) * 100).toFixed(1)}% of analysts</div>
							</div>
						` : ''}
						${sell > 0 ? `
							<div class="recommendation-item">
								<div class="recommendation-item-label">Sell</div>
								<div class="recommendation-item-value sell">${sell}</div>
								<div class="recommendation-item-percent">${((sell / total) * 100).toFixed(1)}% of analysts</div>
							</div>
						` : ''}
						${strongSell > 0 ? `
							<div class="recommendation-item">
								<div class="recommendation-item-label">Strong Sell</div>
								<div class="recommendation-item-value strong-sell">${strongSell}</div>
								<div class="recommendation-item-percent">${((strongSell / total) * 100).toFixed(1)}% of analysts</div>
							</div>
						` : ''}
					</div>
					<div class="info-text" style="color: ${secondaryColor}; margin-top: 16px;">
						<strong>Total analysts covering this stock:</strong> ${total}
					</div>
				</div>
			`;
		}
		
		// How analysts reach their conclusions - specific to each recommendation type
		html += `
			<div class="modal-section">
				<h3 class="modal-section-title">How Analysts Determine Their Recommendations</h3>
				<div class="info-text" style="color: ${secondaryColor};">
					<p>Each analyst recommendation (Strong Buy, Buy, Hold, Sell, Strong Sell) is based on comprehensive research and analysis. Here's what typically drives each type of recommendation:</p>
					
					<div style="margin-top: 20px;">
						<strong style="color: ${textColor}; display: block; margin-bottom: 8px; margin-top: 16px;">Strong Buy / Buy Recommendations:</strong>
						<ul style="margin: 8px 0; padding-left: 20px; line-height: 1.8;">
							<li><strong>Strong Fundamentals:</strong> Robust revenue growth, improving profit margins, healthy cash flow, and strong balance sheet</li>
							<li><strong>Undervaluation:</strong> Current stock price is below intrinsic value based on DCF models, P/E ratios, or other valuation metrics</li>
							<li><strong>Competitive Advantage:</strong> Strong market position, unique products/services, or significant barriers to entry</li>
							<li><strong>Growth Prospects:</strong> Positive outlook for revenue and earnings growth, expansion opportunities, or market share gains</li>
							<li><strong>Management Quality:</strong> Experienced leadership with a track record of execution and strategic vision</li>
							<li><strong>Industry Trends:</strong> Favorable industry dynamics, emerging trends, or regulatory tailwinds</li>
						</ul>
					</div>
					
					<div style="margin-top: 20px;">
						<strong style="color: ${textColor}; display: block; margin-bottom: 8px; margin-top: 16px;">Hold Recommendations:</strong>
						<ul style="margin: 8px 0; padding-left: 20px; line-height: 1.8;">
							<li><strong>Fair Valuation:</strong> Stock price is approximately in line with intrinsic value</li>
							<li><strong>Mixed Signals:</strong> Some positive factors offset by concerns or uncertainties</li>
							<li><strong>Limited Upside/Downside:</strong> Expected returns are moderate in both directions</li>
							<li><strong>Wait-and-See:</strong> Need for more clarity on key factors (earnings, strategy, market conditions)</li>
						</ul>
					</div>
					
					<div style="margin-top: 20px;">
						<strong style="color: ${textColor}; display: block; margin-bottom: 8px; margin-top: 16px;">Sell / Strong Sell Recommendations:</strong>
						<ul style="margin: 8px 0; padding-left: 20px; line-height: 1.8;">
							<li><strong>Overvaluation:</strong> Stock price significantly exceeds intrinsic value or reasonable valuation metrics</li>
							<li><strong>Deteriorating Fundamentals:</strong> Declining revenue, shrinking margins, increasing debt, or cash flow concerns</li>
							<li><strong>Competitive Threats:</strong> Loss of market share, disruption risks, or inability to compete effectively</li>
							<li><strong>Management Issues:</strong> Poor execution, strategic missteps, or governance concerns</li>
							<li><strong>Industry Headwinds:</strong> Unfavorable industry trends, regulatory challenges, or cyclical downturns</li>
							<li><strong>High Risk:</strong> Significant uncertainties, potential for material downside, or structural challenges</li>
						</ul>
					</div>
					
					<div style="margin-top: 20px; padding: 12px; background: ${isLightMode ? 'rgba(192, 201, 212, 0.3)' : 'rgba(31, 42, 55, 0.5)'}; border-radius: 8px; border-left: 3px solid #4ea1f3;">
						<p style="margin: 0; font-size: 0.9rem;"><strong>Note:</strong> The data shown here represents aggregated recommendations from multiple analysts. Individual analyst reports contain detailed research, financial models, and specific reasoning for each recommendation. For complete analysis, consider reviewing individual analyst reports from major investment banks and research firms.</p>
					</div>
				</div>
			</div>
		`;
		
		container.innerHTML = html;
	}
}


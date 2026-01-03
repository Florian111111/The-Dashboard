import { getCachedData, setCachedData } from '../utils/cache.js';

import { API_BASE_URL } from '../config.js';

export class StockEarnings extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.symbol = null;
		this.earningsChart = null;
	}

	static get observedAttributes() {
		return ['symbol'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'symbol' && newValue !== oldValue) {
			this.symbol = newValue;
			if (this.shadowRoot && this.shadowRoot.innerHTML && this.symbol) {
				this.loadEarningsData();
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
				.header-section {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 15px;
				}
				h3 {
					margin: 0;
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
				#earnings-container {
					min-height: 320px;
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
				.chart-container {
					position: relative;
					height: 280px;
					margin: 10px 0;
					padding: 8px;
					background: #0b0f14;
					border-radius: 8px;
					border: 1px solid #1f2a37;
					width: 100%;
					max-width: 100%;
					box-sizing: border-box;
				}
				:host(.light-mode) .chart-container {
					background: #c0c9d4;
					border-color: #a0aab8;
					overflow: hidden;
					min-height: 280px;
				}
				.chart-container canvas {
					max-width: 100%;
					height: auto;
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
				/* View More Modal Styles */
				.view-more-modal-overlay {
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
				.view-more-modal-overlay.show {
					display: flex;
				}
				.view-more-modal {
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
				:host(.light-mode) .view-more-modal {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.view-more-modal-header {
					padding: 20px;
					border-bottom: 1px solid #1f2a37;
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-shrink: 0;
				}
				:host(.light-mode) .view-more-modal-header {
					border-bottom-color: #a0aab8;
				}
				.view-more-modal-title {
					font-size: 1.4rem;
					font-weight: 700;
					color: #e6edf3;
				}
				:host(.light-mode) .view-more-modal-title {
					color: #0a0a0a;
				}
				.view-more-modal-close {
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
				.view-more-modal-close:hover {
					background: rgba(239, 68, 68, 0.2);
					color: #ef4444;
				}
				.view-more-modal-content {
					padding: 20px;
					overflow-y: auto;
					flex: 1;
				}
				.modal-chart-container {
					position: relative;
					height: 400px;
					margin: 10px 0;
					padding: 8px;
					background: #0b0f14;
					border-radius: 8px;
					border: 1px solid #1f2a37;
					width: 100%;
					box-sizing: border-box;
				}
				:host(.light-mode) .modal-chart-container {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
			</style>
			<div class="header-section">
				<h3>Earnings & Revenue Surprise</h3>
				<button class="view-more-btn" id="view-more-btn" style="display: none;">View More</button>
			</div>
			<div class="progress-container" id="progress-container" style="display: none;">
				<div class="progress-bar" id="progress-bar"></div>
			</div>
			<div id="earnings-container">
				<div class="loading">Loading earnings data...</div>
			</div>
			
			<!-- View More Modal -->
			<div class="view-more-modal-overlay" id="view-more-modal-overlay">
				<div class="view-more-modal">
					<div class="view-more-modal-header">
						<div class="view-more-modal-title">Earnings & Revenue Surprise - Extended</div>
						<button class="view-more-modal-close" id="view-more-modal-close">×</button>
					</div>
					<div class="view-more-modal-content" id="view-more-modal-content">
						<div class="loading">Loading extended earnings data...</div>
					</div>
				</div>
			</div>
		`;
		
		if (this.symbol) {
			this.loadEarningsData();
		}
		
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
		window.addEventListener('themechange', this.themeChangeHandler);
		
		// Use MutationObserver to watch for class changes
		this.observer = new MutationObserver(() => {
			this.updateChartTheme();
		});
		this.observer.observe(this, { attributes: true, attributeFilter: ['class'] });
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
		if (!this.earningsChart) return;
		
		const isLightMode = localStorage.getItem('theme') === 'light' || this.classList.contains('light-mode');
		
		// Update chart colors
		this.earningsChart.options.scales.x.ticks.color = isLightMode ? '#0a0a0a' : '#9fb0c0';
		this.earningsChart.options.scales.x.grid.color = isLightMode ? '#a0aab8' : '#1f2a37';
		this.earningsChart.options.scales.y.ticks.color = isLightMode ? '#0a0a0a' : '#9fb0c0';
		this.earningsChart.options.scales.y.grid.color = isLightMode ? '#a0aab8' : '#1f2a37';
		
		// Update tooltip colors
		if (this.earningsChart.options.plugins.tooltip) {
			this.earningsChart.options.plugins.tooltip.backgroundColor = isLightMode ? '#d5dce5' : '#121821';
			this.earningsChart.options.plugins.tooltip.titleColor = isLightMode ? '#0a0a0a' : '#e6edf3';
			this.earningsChart.options.plugins.tooltip.bodyColor = isLightMode ? '#1a1a1a' : '#9fb0c0';
			this.earningsChart.options.plugins.tooltip.borderColor = isLightMode ? '#a0aab8' : '#1f2a37';
		}
		
		// Update chart container background
		const chartContainer = this.shadowRoot.querySelector('.chart-container');
		if (chartContainer) {
			chartContainer.style.background = isLightMode ? '#c0c9d4' : '#0b0f14';
			chartContainer.style.borderColor = isLightMode ? '#a0aab8' : '#1f2a37';
		}
		
		// Update beat/miss labels
		const labelsContainer = this.shadowRoot.querySelector('#earnings-container')?.querySelector('div[style*="display: flex"]');
		if (labelsContainer) {
			const labelTextColor = isLightMode ? '#1a1a1a' : '#9fb0c0';
			labelsContainer.querySelectorAll('div[style*="color"]').forEach(label => {
				const style = label.getAttribute('style') || '';
				if (style.includes('color: #9fb0c0') || style.includes('color: #1a1a1a')) {
					label.style.color = labelTextColor;
				}
			});
		}
		
		this.earningsChart.update();
	}

	async loadEarningsData() {
		if (!this.symbol) return;
		const container = this.shadowRoot.getElementById('earnings-container');
		if (!container) return;
		
		// Check aggregated overview cache first (most efficient)
		const overviewData = getCachedData(this.symbol, 'stock-overview');
		let cachedData = null;
		if (overviewData && overviewData.earnings) {
			console.log('[Earnings] Using data from aggregated overview cache');
			cachedData = overviewData.earnings;
		} else {
			// Check individual cache as fallback
			cachedData = getCachedData(this.symbol, 'earnings');
		}
		
		if (cachedData && cachedData.earnings) {
			console.log('[Earnings] Using cached data');
			const earningsForChart = cachedData.earnings.slice(0, 8).reverse();
			const hasEarningsData = earningsForChart.some(e => e.epsActual !== null && e.epsActual !== undefined);
			
			if (hasEarningsData) {
				container.innerHTML = `
					<div class="chart-container">
						<canvas id="earnings-chart"></canvas>
					</div>
				`;
				
				const viewMoreBtn = this.shadowRoot.getElementById('view-more-btn');
				if (viewMoreBtn) {
					viewMoreBtn.style.display = 'block';
					// Remove old listeners by cloning
					const newBtn = viewMoreBtn.cloneNode(true);
					viewMoreBtn.parentNode.replaceChild(newBtn, viewMoreBtn);
					newBtn.addEventListener('click', () => {
						this.openViewMoreModal(cachedData);
					});
				}
				
				setTimeout(() => {
					this.renderEarningsChart(earningsForChart);
				}, 300);
			} else {
				container.innerHTML = '<div style="color: #9fb0c0; text-align: center; padding: 20px;">No earnings chart data available</div>';
			}
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
			// Check stock-overview cache first
			const overviewData = getCachedData(this.symbol, 'stock-overview');
			let data = null;
			
			if (overviewData && overviewData.earnings) {
				console.log('[Earnings] Using data from stock-overview cache');
				data = overviewData.earnings;
			} else {
				// Fetch if not in cache
				const response = await fetch(`${API_BASE_URL}/api/earnings/${this.symbol}`);
				if (!response.ok) {
					throw new Error(`Backend returned ${response.status}`);
				}
				data = await response.json();
			}
			
			if (!data.earnings || data.earnings.length === 0) {
				// Clear interval on error
				if (progressInterval) {
					clearInterval(progressInterval);
				}
				if (progressContainer) {
					progressContainer.style.display = 'none';
				}
				container.innerHTML = '<div style="color: #9fb0c0; text-align: center; padding: 20px;">No earnings data available</div>';
				return;
			}
			
			// Cache the earnings data
			setCachedData(this.symbol, 'earnings', data);
			
			// Store in instance variable for modal
			this.earningsData = data;
			
			// Mark data as loaded, but let progress bar continue until 15 seconds
			dataLoaded = true;
			
			const earningsForChart = data.earnings.slice(0, 8).reverse();
			const hasEarningsData = earningsForChart.some(e => e.epsActual !== null && e.epsActual !== undefined);
			
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
						if (hasEarningsData) {
							container.innerHTML = `
								<div class="chart-container">
									<canvas id="earnings-chart"></canvas>
								</div>
							`;
							const viewMoreBtn = this.shadowRoot.getElementById('view-more-btn');
							if (viewMoreBtn) {
								viewMoreBtn.style.display = 'block';
								viewMoreBtn.addEventListener('click', () => {
									window.dispatchEvent(new CustomEvent('navigate', {
										detail: { page: 'earnings-detail', symbol: this.symbol }
									}));
								});
							}
							this.renderEarningsChart(earningsForChart);
						} else {
							container.innerHTML = '<div style="color: #9fb0c0; text-align: center; padding: 20px;">No earnings chart data available</div>';
						}
					}, 200);
				} else {
					// If less than 15 seconds, render chart but keep progress bar running
					if (hasEarningsData) {
						container.innerHTML = `
							<div class="chart-container">
								<canvas id="earnings-chart"></canvas>
							</div>
						`;
						const viewMoreBtn = this.shadowRoot.getElementById('view-more-btn');
						if (viewMoreBtn) {
							viewMoreBtn.style.display = 'block';
							viewMoreBtn.addEventListener('click', () => {
								window.dispatchEvent(new CustomEvent('navigate', {
									detail: { page: 'earnings-detail', symbol: this.symbol }
								}));
							});
						}
						this.renderEarningsChart(earningsForChart);
					} else {
						container.innerHTML = '<div style="color: #9fb0c0; text-align: center; padding: 20px;">No earnings chart data available</div>';
					}
				}
			} else {
				// No progress bar, render immediately
				if (hasEarningsData) {
					container.innerHTML = `
						<div class="chart-container">
							<canvas id="earnings-chart"></canvas>
						</div>
					`;
					const viewMoreBtn = this.shadowRoot.getElementById('view-more-btn');
					if (viewMoreBtn) {
						viewMoreBtn.style.display = 'block';
						viewMoreBtn.addEventListener('click', () => {
							window.dispatchEvent(new CustomEvent('navigate', {
								detail: { page: 'earnings-detail', symbol: this.symbol }
							}));
						});
					}
					this.renderEarningsChart(earningsForChart);
				} else {
					container.innerHTML = '<div style="color: #9fb0c0; text-align: center; padding: 20px;">No earnings chart data available</div>';
				}
			}
		} catch (error) {
			if (progressInterval) {
				clearInterval(progressInterval);
			}
			if (progressContainer) {
				progressContainer.style.display = 'none';
			}
			console.error('[Earnings] Error:', error);
			container.innerHTML = `<div class="error">Error loading earnings data: ${error.message}</div>`;
		}
	}

	renderEarningsChart(earnings, canvasId = 'earnings-chart') {
		// For modal, find canvas in shadowRoot directly
		const canvas = canvasId === 'modal-earnings-chart' 
			? this.shadowRoot.getElementById(canvasId)
			: this.shadowRoot.getElementById('earnings-container')?.querySelector(`#${canvasId}`);
		if (!canvas || !window.Chart) return;
		
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		
		const labels = earnings.map(e => {
			const dateStr = e.date || e.period || '';
			if (!dateStr) return 'N/A';
			try {
				const date = new Date(dateStr);
				if (!isNaN(date.getTime())) {
					const quarter = Math.floor(date.getMonth() / 3) + 1;
					const year = date.getFullYear();
					const shortYear = year.toString().slice(-2);
					return `Q${quarter} FY${shortYear}`;
				}
			} catch (e) {}
			return dateStr;
		});
		
		const epsActual = [];
		const epsEstimate = [];
		const actualColors = [];
		const actualBorders = [];
		
		earnings.forEach((e) => {
			const actual = e.epsActual !== null && e.epsActual !== undefined ? e.epsActual : null;
			const estimate = e.epsEstimate !== null && e.epsEstimate !== undefined ? e.epsEstimate : null;
			
			epsEstimate.push(estimate);
			epsActual.push(actual);
			
			if (actual !== null && estimate !== null) {
				if (actual > estimate) {
					actualColors.push('#10b981');
					actualBorders.push('#0b0f14');
				} else if (actual < estimate) {
					actualColors.push('#ef4444');
					actualBorders.push('#0b0f14');
				} else {
					actualColors.push('#6b7280');
					actualBorders.push('#0b0f14');
				}
			} else {
				actualColors.push('#6b7280');
				actualBorders.push('#0b0f14');
			}
		});
		
		if (this.earningsChart) {
			this.earningsChart.destroy();
		}
		
		// Check theme from localStorage for reliable detection
		const isLightMode = localStorage.getItem('theme') === 'light' || this.classList.contains('light-mode');
		
		this.earningsChart = new window.Chart(ctx, {
			type: 'line',
			data: {
				labels: labels,
				datasets: [
					{
						label: 'EPS Estimate',
						data: epsEstimate,
						borderColor: '#6b7280',
						backgroundColor: 'transparent',
						borderWidth: 2,
						borderDash: [5, 5],
						pointRadius: 8,
						pointBackgroundColor: 'transparent',
						pointBorderColor: '#6b7280',
						pointBorderWidth: 2,
						pointHoverRadius: 10,
						tension: 0.1,
						order: 2
					},
					{
						label: 'EPS Actual',
						data: epsActual,
						borderColor: '#10b981',
						backgroundColor: '#10b981',
						borderWidth: 0,
						pointRadius: 8,
						pointBackgroundColor: actualColors,
						pointBorderColor: actualBorders,
						pointBorderWidth: 3,
						pointHoverRadius: 10,
						tension: 0,
						order: 1,
						showLine: false
					}
				]
			},
			options: {
				maintainAspectRatio: false,
				responsive: true,
				interaction: { intersect: false, mode: 'index' },
				plugins: {
					title: { display: false },
					legend: { display: false },
					tooltip: {
						backgroundColor: isLightMode ? '#d5dce5' : '#121821',
						titleColor: isLightMode ? '#0a0a0a' : '#e6edf3',
						bodyColor: isLightMode ? '#1a1a1a' : '#9fb0c0',
						borderColor: isLightMode ? '#a0aab8' : '#1f2a37',
						borderWidth: 1,
						padding: 12,
						callbacks: {
							label: function(context) {
								const label = context.dataset.label || '';
								const value = context.parsed.y;
								return `${label}: $${value.toFixed(2)}`;
							},
							afterBody: (items) => {
								const index = items[0].dataIndex;
								const earning = earnings[index];
								const lines = [];
								if (earning.epsActual !== null && earning.epsActual !== undefined && 
									earning.epsEstimate !== null && earning.epsEstimate !== undefined) {
									const diff = earning.epsActual - earning.epsEstimate;
									const isBeat = diff > 0;
									const sign = isBeat ? '+' : '';
									const color = isBeat ? '#10b981' : '#ef4444';
									const beatMiss = isBeat ? 'Beat' : 'Missed';
									lines.push(`${beatMiss}: ${sign}$${Math.abs(diff).toFixed(2)}`);
									if (earning.epsSurprisePercent !== null && earning.epsSurprisePercent !== undefined) {
										lines.push(`${sign}${earning.epsSurprisePercent.toFixed(1)}% Surprise`);
									}
								}
								return lines;
							}
						}
					}
				},
			scales: {
				x: { 
					ticks: { color: localStorage.getItem('theme') === 'light' ? '#0a0a0a' : '#9fb0c0', font: { size: 11 } }, 
					grid: { color: localStorage.getItem('theme') === 'light' ? '#a0aab8' : '#1f2a37' } 
				},
				y: { 
					ticks: { color: localStorage.getItem('theme') === 'light' ? '#0a0a0a' : '#9fb0c0', font: { size: 11 } }, 
					grid: { color: localStorage.getItem('theme') === 'light' ? '#a0aab8' : '#1f2a37' } 
				}
			}
			}
		});
		
		// Add beat/miss labels below chart
		const labelsContainer = document.createElement('div');
		labelsContainer.style.cssText = 'display: flex; justify-content: space-around; margin-top: 10px; padding: 0 20px;';
	const labelTextColor = localStorage.getItem('theme') === 'light' ? '#1a1a1a' : '#9fb0c0';
	earnings.forEach((earning, index) => {
		const labelDiv = document.createElement('div');
		labelDiv.style.cssText = 'text-align: center; flex: 1;';
		const actual = earning.epsActual;
		const estimate = earning.epsEstimate;
		if (actual !== null && actual !== undefined && estimate !== null && estimate !== undefined) {
			const diff = actual - estimate;
			const isBeat = diff > 0;
			const sign = isBeat ? '+' : '';
			const color = isBeat ? '#10b981' : '#ef4444';
			const beatMiss = isBeat ? 'Beat' : 'Missed';
			labelDiv.innerHTML = `
				<div style="color: ${color}; font-weight: 600; margin-bottom: 2px;">${beatMiss}</div>
				<div style="color: ${labelTextColor}; font-size: 0.7rem;">${sign}$${Math.abs(diff).toFixed(2)}</div>
			`;
		} else if (estimate !== null && estimate !== undefined) {
			const dateStr = earning.date || earning.period || '';
			let dateLabel = '';
			if (dateStr) {
				try {
					const date = new Date(dateStr);
					if (!isNaN(date.getTime())) {
						dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
					}
				} catch (e) {}
			}
			labelDiv.innerHTML = `
				<div style="color: ${labelTextColor}; font-size: 0.7rem;">${dateLabel || 'TBD'}</div>
			`;
		}
		labelsContainer.appendChild(labelDiv);
	});
	
	// Find container to append labels
	const container = canvasId === 'modal-earnings-chart'
		? this.shadowRoot.getElementById('modal-earnings-chart-container')
		: this.shadowRoot.getElementById('earnings-container');
	
	if (container) {
		container.appendChild(labelsContainer);
	}
	}
	
	async openViewMoreModal(earningsData = null) {
		const overlay = this.shadowRoot.getElementById('view-more-modal-overlay');
		const modalContent = this.shadowRoot.getElementById('view-more-modal-content');
		const closeBtn = this.shadowRoot.getElementById('view-more-modal-close');
		
		if (!overlay || !modalContent) return;
		
		overlay.classList.add('show');
		modalContent.innerHTML = '<div class="loading">Loading extended earnings data...</div>';
		
		// Get earnings data from instance variable, cache, or parameter
		if (!earningsData) {
			earningsData = this.earningsData || getCachedData(this.symbol, 'earnings');
		}
		
		// If data not available, load it now
		if (!earningsData || !earningsData.earnings || earningsData.earnings.length === 0) {
			try {
				const response = await fetch(`${API_BASE_URL}/api/earnings/${this.symbol}`);
				if (!response.ok) {
					throw new Error(`Backend returned ${response.status}`);
				}
				earningsData = await response.json();
				
				if (!earningsData.earnings || earningsData.earnings.length === 0) {
					modalContent.innerHTML = '<div class="loading">No earnings data available.</div>';
					return;
				}
				
				// Cache and store the data
				setCachedData(this.symbol, 'earnings', earningsData);
				this.earningsData = earningsData;
			} catch (error) {
				console.error('[Earnings Modal] Error loading data:', error);
				modalContent.innerHTML = `<div class="loading">Error loading extended earnings: ${error.message}</div>`;
				return;
			}
		}
		
		// Render extended chart with all earnings data
		this.renderExtendedEarningsChart(modalContent, earningsData.earnings);
		
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
	
	renderExtendedEarningsChart(container, earnings) {
		// Use all earnings data (not just first 8)
		const allEarnings = earnings.slice().reverse();
		
		container.innerHTML = `
			<div class="modal-chart-container">
				<canvas id="modal-earnings-chart"></canvas>
			</div>
		`;
		
		// Wait for canvas to be in DOM
		setTimeout(() => {
			this.renderEarningsChart(allEarnings, 'modal-earnings-chart');
		}, 100);
	}
}


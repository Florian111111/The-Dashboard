import { getCachedData, setCachedData } from '../utils/cache.js';

import { API_BASE_URL } from '../config.js';

export class StockAnalystTimeline extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.symbol = null;
		this.recommendationTimelineChart = null;
	}

	static get observedAttributes() {
		return ['symbol'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'symbol' && newValue !== oldValue) {
			this.symbol = newValue;
			if (this.shadowRoot && this.shadowRoot.innerHTML && this.symbol) {
				this.loadTimelineData();
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
				#timeline-container {
					min-height: 200px;
				}
				.chart-container {
					position: relative;
					height: 280px;
					width: 100%;
					max-width: 100%;
					box-sizing: border-box;
					overflow: hidden;
					background: #0b0f14;
					border-radius: 8px;
					border: 1px solid #1f2a37;
				}
				:host(.light-mode) .chart-container {
					background: #c0c9d4;
					border-color: #a0aab8;
					padding: 10px;
					min-height: 280px;
				}
				#timeline-container {
					min-height: 320px;
				}
			</style>
			<h3>Analyst Recommendations Timeline</h3>
			<div id="timeline-container">
				<div class="loading">Loading timeline...</div>
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
				this.loadTimelineData();
			}, 50);
		}
		
		// Listen for theme changes
		this.themeChangeHandler = () => {
			// Update classList based on localStorage
			const currentTheme = localStorage.getItem('theme') || 'dark';
			if (currentTheme === 'light') {
				this.classList.add('light-mode');
			} else {
				this.classList.remove('light-mode');
			}
			// Small delay to ensure theme is applied
			setTimeout(() => {
				this.updateChartTheme();
			}, 50);
		};
		window.addEventListener('storage', this.themeChangeHandler);
		window.addEventListener('themechange', this.themeChangeHandler);
		
		// Use MutationObserver to watch for class changes
		this.observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
					// Update classList based on localStorage to ensure consistency
					const currentTheme = localStorage.getItem('theme') || 'dark';
					if (currentTheme === 'light' && !this.classList.contains('light-mode')) {
						this.classList.add('light-mode');
					} else if (currentTheme === 'dark' && this.classList.contains('light-mode')) {
						this.classList.remove('light-mode');
					}
					// Small delay to ensure theme is applied
					setTimeout(() => {
						this.updateChartTheme();
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
							this.updateChartTheme();
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
	
	updateChartTheme() {
		if (!this.recommendationTimelineChart) return;
		
		// Update classList based on localStorage to ensure consistency
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light' && !this.classList.contains('light-mode')) {
			this.classList.add('light-mode');
		} else if (savedTheme === 'dark' && this.classList.contains('light-mode')) {
			this.classList.remove('light-mode');
		}
		
		const isLightMode = savedTheme === 'light' || this.classList.contains('light-mode');
		
		// Update chart colors
		this.recommendationTimelineChart.options.scales.x.ticks.color = isLightMode ? '#0a0a0a' : '#9fb0c0';
		this.recommendationTimelineChart.options.scales.x.grid.color = isLightMode ? '#a0aab8' : '#1f2a37';
		this.recommendationTimelineChart.options.scales.y.ticks.color = isLightMode ? '#0a0a0a' : '#9fb0c0';
		this.recommendationTimelineChart.options.scales.y.grid.color = isLightMode ? '#a0aab8' : '#1f2a37';
		
		// Update legend labels
		if (this.recommendationTimelineChart.options.plugins.legend) {
			this.recommendationTimelineChart.options.plugins.legend.labels.color = isLightMode ? '#0a0a0a' : '#9fb0c0';
		}
		
		// Update tooltip colors
		if (this.recommendationTimelineChart.options.plugins.tooltip) {
			this.recommendationTimelineChart.options.plugins.tooltip.backgroundColor = isLightMode ? '#d5dce5' : '#121821';
			this.recommendationTimelineChart.options.plugins.tooltip.titleColor = isLightMode ? '#0a0a0a' : '#e6edf3';
			this.recommendationTimelineChart.options.plugins.tooltip.bodyColor = isLightMode ? '#1a1a1a' : '#9fb0c0';
			this.recommendationTimelineChart.options.plugins.tooltip.borderColor = isLightMode ? '#a0aab8' : '#1f2a37';
		}
		
		// Update chart container background
		const chartContainer = this.shadowRoot.querySelector('.chart-container');
		if (chartContainer) {
			chartContainer.style.background = isLightMode ? '#c0c9d4' : '#0b0f14';
			chartContainer.style.borderColor = isLightMode ? '#a0aab8' : '#1f2a37';
		}
		
		this.recommendationTimelineChart.update();
	}

	async loadTimelineData() {
		if (!this.symbol) return;
		const container = this.shadowRoot.getElementById('timeline-container');
		if (!container) return;
		
		// Check cache first
		const cachedData = getCachedData(this.symbol, 'analyst');
		if (cachedData && cachedData.recommendationTrends && Array.isArray(cachedData.recommendationTrends) && cachedData.recommendationTrends.length > 0) {
			console.log('[Analyst Timeline] Using cached data');
			setTimeout(() => {
				this.renderRecommendationTimeline(cachedData.recommendationTrends);
			}, 100);
			return;
		}
		
		try {
			const response = await fetch(`${API_BASE_URL}/api/analyst/${this.symbol}`);
			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}
			const data = await response.json();
			
			// Cache the data
			if (data.recommendationTrends) {
				setCachedData(this.symbol, 'analyst', data);
			}
			
			if (data.recommendationTrends && Array.isArray(data.recommendationTrends) && data.recommendationTrends.length > 0) {
				setTimeout(() => {
					this.renderRecommendationTimeline(data.recommendationTrends);
				}, 100);
			} else {
				container.innerHTML = '<div style="color: #9fb0c0; text-align: center; padding: 20px;">No timeline data available</div>';
			}
		} catch (error) {
			console.error('[Analyst Timeline] Error:', error);
			container.innerHTML = `<div class="error">Error loading timeline: ${error.message}</div>`;
		}
	}

	renderRecommendationTimeline(trends) {
		const container = this.shadowRoot.getElementById('timeline-container');
		if (!container) return;
		
		container.innerHTML = '<div class="chart-container"><canvas id="recommendation-timeline-chart" style="max-height: 280px; max-width: 100%;"></canvas></div>';
		
		setTimeout(() => {
			const canvas = container.querySelector('#recommendation-timeline-chart');
			if (!canvas || !window.Chart) return;
			
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			
			// Group by month (same logic as StockNews.js)
			const monthlyData = {};
			trends.forEach((trend) => {
				let date = null;
				if (trend.period) {
					date = new Date(trend.period * 1000);
					if (isNaN(date.getTime())) {
						date = new Date(trend.period);
					}
				}
				if ((!date || isNaN(date.getTime())) && trend.date) {
					date = new Date(trend.date);
				}
				if (!date || isNaN(date.getTime())) {
					date = new Date();
					date.setMonth(date.getMonth() - (trends.length - trends.indexOf(trend) - 1));
				}
				
				const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
				if (!monthlyData[monthKey]) {
					monthlyData[monthKey] = {
						strongBuy: 0,
						buy: 0,
						hold: 0,
						sell: 0,
						strongSell: 0,
						date: date
					};
				}
				monthlyData[monthKey].strongBuy += trend.strongBuy || 0;
				monthlyData[monthKey].buy += trend.buy || 0;
				monthlyData[monthKey].hold += trend.hold || 0;
				monthlyData[monthKey].sell += trend.sell || 0;
				monthlyData[monthKey].strongSell += trend.strongSell || 0;
			});
			
			const labels = Object.keys(monthlyData).sort((a, b) => {
				return monthlyData[a].date - monthlyData[b].date;
			});
			
			const strongBuyData = labels.map(l => monthlyData[l].strongBuy);
			const buyData = labels.map(l => monthlyData[l].buy);
			const holdData = labels.map(l => monthlyData[l].hold);
			const sellData = labels.map(l => monthlyData[l].sell);
			const strongSellData = labels.map(l => monthlyData[l].strongSell);
			const totals = labels.map((l, i) => 
				strongBuyData[i] + buyData[i] + holdData[i] + sellData[i] + strongSellData[i]
			);
			
			if (this.recommendationTimelineChart) {
				this.recommendationTimelineChart.destroy();
			}
			
			// Check theme from localStorage for reliable detection
			const isLightMode = localStorage.getItem('theme') === 'light' || this.classList.contains('light-mode');
			
			this.recommendationTimelineChart = new window.Chart(ctx, {
				type: 'bar',
				data: {
					labels: labels,
					datasets: [
						{ label: 'Strong Buy', data: strongBuyData, backgroundColor: '#10b981', stack: 'stack1' },
						{ label: 'Buy', data: buyData, backgroundColor: '#34d399', stack: 'stack1' },
						{ label: 'Hold', data: holdData, backgroundColor: '#6b7280', stack: 'stack1' },
						{ label: 'Sell', data: sellData, backgroundColor: '#f59e0b', stack: 'stack1' },
						{ label: 'Strong Sell', data: strongSellData, backgroundColor: '#ef4444', stack: 'stack1' }
					]
				},
				options: {
					maintainAspectRatio: false,
					responsive: true,
					plugins: {
						title: { 
							display: false
						},
						legend: { 
							display: true, 
							position: 'right', 
							labels: { 
								color: isLightMode ? '#0a0a0a' : '#9fb0c0', 
								font: { size: 10 }, 
								padding: 8, 
								usePointStyle: true, 
								pointStyle: 'circle' 
							} 
						},
						tooltip: { 
							backgroundColor: isLightMode ? '#d5dce5' : '#121821', 
							titleColor: isLightMode ? '#0a0a0a' : '#e6edf3', 
							bodyColor: isLightMode ? '#1a1a1a' : '#9fb0c0', 
							borderColor: isLightMode ? '#a0aab8' : '#1f2a37', 
							borderWidth: 1, 
							callbacks: { 
								footer: (items) => { 
									const index = items[0].dataIndex; 
									return `Total: ${totals[index]}`; 
								} 
							} 
						}
					},
				scales: {
					x: { 
						stacked: true, 
						ticks: { color: localStorage.getItem('theme') === 'light' ? '#0a0a0a' : '#9fb0c0', font: { size: 11 } }, 
						grid: { color: localStorage.getItem('theme') === 'light' ? '#a0aab8' : '#1f2a37' } 
					},
					y: { 
						stacked: true, 
						ticks: { color: localStorage.getItem('theme') === 'light' ? '#0a0a0a' : '#9fb0c0', font: { size: 11 } }, 
						grid: { color: localStorage.getItem('theme') === 'light' ? '#a0aab8' : '#1f2a37' } 
					}
				},
					animation: {
						onComplete: () => {
							// Total labels removed as requested
						}
					}
				}
			});
			
			// Total labels removed - no update hook needed
		}, 300);
	}
}


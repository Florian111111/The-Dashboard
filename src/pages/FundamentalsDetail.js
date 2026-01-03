import { fetchWithProxy } from '../utils/proxy.js';

import { API_BASE_URL } from '../config.js';

export class FundamentalsDetail extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.symbol = null;
		this.historicalData = null;
		this.charts = {};
	}

	static get observedAttributes() {
		return ['symbol'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'symbol' && newValue !== oldValue) {
			this.symbol = newValue;
			if (this.shadowRoot && this.shadowRoot.innerHTML && this.symbol) {
				this.loadHistoricalData();
			}
		}
	}

	connectedCallback() {
		this.symbol = this.getAttribute('symbol') || 'AAPL';
		this.render();
		this.loadHistoricalData();
		this.loadCompanyName();
	}
	
	async loadCompanyName() {
		const titleElement = this.shadowRoot.getElementById('page-title');
		if (!titleElement || !this.symbol) return;
		
		try {
			const response = await fetch(`${API_BASE_URL}/api/fundamentals/${this.symbol}`);
			if (!response.ok) return;
			
			const data = await response.json();
			let profile = {};
			if (data?.quoteSummary?.result?.[0]?.summaryProfile) {
				profile = data.quoteSummary.result[0].summaryProfile;
			} else if (data?.profile) {
				profile = data.profile;
			} else if (data?.quoteSummary?.result?.[0]) {
				const result = data.quoteSummary.result[0];
				profile = result.summaryProfile || result.profile || {};
			}
			
			const companyName = profile.longName || profile.name || profile.ticker || this.symbol;
			titleElement.textContent = `Historical Fundamentals: ${companyName}`;
			document.title = `${companyName} Fundamentals | Stock Analysis Platform`;
		} catch (error) {
			console.log('[FundamentalsDetail] Could not fetch company name:', error.message);
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
				}
				
				/* Theme Switch */
				.theme-switch {
					display: flex; align-items: center; gap: 10px;
					background: #1f2a37; padding: 6px 12px;
					border-radius: 20px; border: 1px solid #2d3748;
				}
				:host(.light-mode) .theme-switch { background: var(--bg-tertiary); border-color: var(--border-color); }
				.theme-switch-label { font-size: 0.7rem; color: #6b7a8a; text-transform: uppercase; }
				:host(.light-mode) .theme-switch-label { color: var(--text-muted); }
				.theme-switch-track { width: 44px; height: 24px; background: #121821; border-radius: 12px; position: relative; cursor: pointer; border: 1px solid #1f2a37; }
				:host(.light-mode) .theme-switch-track { background: var(--bg-secondary); border-color: var(--border-color); }
				.theme-switch-thumb { width: 18px; height: 18px; background: #4ea1f3; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: transform 0.3s; display: flex; align-items: center; justify-content: center; font-size: 10px; }
				.theme-switch-track.light .theme-switch-thumb { transform: translateX(20px); background: #f59e0b; }
				.theme-icon { font-size: 11px; }
				
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
				:host(.light-mode) h1 { color: var(--text-primary); }
				.back-button {
					background: #1f2a37;
					color: #e6edf3;
					border: 1px solid #2d3a4a;
					border-radius: 8px;
					padding: 10px 20px;
					cursor: pointer;
					font-size: 1rem;
					transition: background 0.2s;
				}
				:host(.light-mode) .back-button {
					background: var(--bg-tertiary);
					color: var(--text-primary);
					border-color: var(--border-color);
				}
				.back-button:hover {
					background: #2d3a4a;
				}
				:host(.light-mode) .back-button:hover {
					background: var(--bg-secondary);
				}
				.loading {
					color: #9fb0c0;
					text-align: center;
					padding: 40px;
					font-size: 1.1rem;
				}
				:host(.light-mode) .loading {
					color: var(--text-secondary);
				}
				.chart-section {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
					margin-bottom: 30px;
				}
				:host(.light-mode) .chart-section {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.chart-title {
					color: #4ea1f3;
					font-size: 1.3rem;
					margin-bottom: 15px;
					font-weight: 600;
				}
				.chart-container {
					position: relative;
					height: 400px;
					margin-bottom: 20px;
				}
				.freq-toggle {
					display: flex;
					gap: 10px;
					margin-bottom: 15px;
				}
				.freq-button {
					background: #1f2a37;
					color: #9fb0c0;
					border: 1px solid #2d3a4a;
					border-radius: 6px;
					padding: 8px 16px;
					cursor: pointer;
					font-size: 0.9rem;
					transition: all 0.2s;
				}
				:host(.light-mode) .freq-button {
					background: var(--bg-tertiary);
					color: var(--text-secondary);
					border-color: var(--border-color);
				}
				.freq-button.active {
					background: #4ea1f3;
					color: #e6edf3;
					border-color: #4ea1f3;
				}
				:host(.light-mode) .freq-button.active {
					background: #1d4ed8;
					color: #ffffff;
					border-color: #1d4ed8;
				}
				.freq-button:hover:not(.active) {
					background: #2d3a4a;
				}
				:host(.light-mode) .freq-button:hover:not(.active) {
					background: var(--bg-card);
				}
			.error {
				color: #ef4444;
				text-align: center;
				padding: 20px;
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
				<h1 id="page-title">Historical Fundamentals: ${this.symbol}</h1>
				<div style="display: flex; align-items: center; gap: 15px;">
					<div class="theme-switch">
						<span class="theme-switch-label">Theme</span>
						<div class="theme-switch-track" id="theme-toggle">
							<div class="theme-switch-thumb"><span class="theme-icon">🌙</span></div>
						</div>
					</div>
					<button class="back-button" id="backBtn">← Back to Analysis</button>
				</div>
			</div>
		<div id="content">
			<div class="loading">Loading historical data...</div>
		</div>
		
		<div class="disclaimer-footer">
			<div>
				The information provided on this website is for general informational and educational purposes only and does not constitute investment advice, financial advice, trading advice, or any other form of recommendation. All content is provided without regard to individual financial circumstances, investment objectives, or risk tolerance. Past performance is not indicative of future results. Financial markets are subject to risk, and investing may result in the loss of part or all of your capital. Any actions taken based on the information on this website are strictly at your own risk. Before making any investment decision, you should conduct your own research and, where appropriate, consult a licensed financial advisor. By using this website, you acknowledge and agree to this disclaimer. <a href="#" id="disclaimer-link-full">Full Disclaimer</a>
			</div>
		</div>
	`;

		this.shadowRoot.getElementById('backBtn').addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', {
				detail: { page: 'stock-analysis', symbol: this.symbol }
			}));
		});
		
		this.setupThemeToggle();
		
		// Disclaimer link
		this.shadowRoot.getElementById('disclaimer-link-full')?.addEventListener('click', (e) => {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'disclaimer' } }));
		});
	}
	
	setupThemeToggle() {
		const toggle = this.shadowRoot.getElementById('theme-toggle');
		if (!toggle) return;
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') this.applyLightMode(true);
		toggle.addEventListener('click', () => {
			this.applyLightMode(!this.classList.contains('light-mode'));
		});
	}
	
	applyLightMode(enable) {
		const toggle = this.shadowRoot.getElementById('theme-toggle');
		const icon = toggle?.querySelector('.theme-icon');
		if (enable) {
			this.classList.add('light-mode');
			toggle?.classList.add('light');
			if (icon) icon.textContent = '☀️';
			localStorage.setItem('theme', 'light');
			document.body.style.background = '#c8d0da';
		} else {
			this.classList.remove('light-mode');
			toggle?.classList.remove('light');
			if (icon) icon.textContent = '🌙';
			localStorage.setItem('theme', 'dark');
			document.body.style.background = '#0b0f14';
		}
		
		// Dispatch theme change event for chart components
		window.dispatchEvent(new CustomEvent('themechange'));
	}

	async loadHistoricalData() {
		try {
			console.log('[FundamentalsDetail] Fetching historical data for:', this.symbol);
			const response = await fetch(`${API_BASE_URL}/api/fundamentals/historical/${this.symbol}`);
			if (!response.ok) {
				const errorText = await response.text();
				console.error('[FundamentalsDetail] Backend error:', response.status, errorText);
				throw new Error(`Backend returned ${response.status}: ${errorText}`);
			}
			this.historicalData = await response.json();
			console.log('[FundamentalsDetail] Received data:', this.historicalData);
			console.log('[FundamentalsDetail] Statements keys:', Object.keys(this.historicalData.statements || {}));
			this.renderCharts();
		} catch (error) {
			console.error('Error loading historical fundamentals:', error);
			this.shadowRoot.getElementById('content').innerHTML = 
				`<div class="error">Error loading historical data: ${error.message}<br><small>Check console for details</small></div>`;
		}
	}

	renderCharts() {
		const content = this.shadowRoot.getElementById('content');
		if (!this.historicalData || !this.historicalData.metrics) {
			console.error('[FundamentalsDetail] No metrics in data:', this.historicalData);
			content.innerHTML = '<div class="error">No historical data available. Check backend logs.</div>';
			return;
		}

		const metrics = this.historicalData.metrics;
		const sharesOutstanding = this.historicalData.sharesOutstanding;
		console.log('[FundamentalsDetail] Available metrics:', Object.keys(metrics));
		console.log('[FundamentalsDetail] Shares outstanding:', sharesOutstanding);
		
		// Log details for each metric
		for (const [key, value] of Object.entries(metrics)) {
			console.log(`[FundamentalsDetail] ${key}:`, {
				hasAnnual: (value.annual || []).length > 0,
				hasQuarterly: (value.quarterly || []).length > 0,
				annualCount: (value.annual || []).length,
				quarterlyCount: (value.quarterly || []).length,
				isPerShare: value.isPerShare
			});
		}
		
		let html = '';

		// Combined Revenue & Net Income Chart (if both available)
		if (metrics.revenue && metrics.netIncome) {
			html += this.createCombinedRevenueNetIncomeSection();
		} else {
			// Individual charts if not both available
			if (metrics.revenue) {
				html += this.createChartSection('Revenue', 'revenue', 'revenue', metrics, sharesOutstanding);
			}
			if (metrics.netIncome) {
				html += this.createChartSection('Net Income', 'netIncome', 'netIncome', metrics, sharesOutstanding);
			}
		}

		// Book Value Chart
		if (metrics.bookValue) {
			html += this.createChartSection('Book Value', 'bookValue', 'bookValue', metrics, sharesOutstanding);
		}

		// Cash Flow Chart
		if (metrics.cashFlow) {
			html += this.createChartSection('Cash Flow per Share', 'cashFlow', 'cashFlow', metrics, sharesOutstanding);
		}

		// EPS Chart
		if (metrics.eps) {
			html += this.createChartSection('EPS (Earnings per Share)', 'eps', 'eps', metrics, sharesOutstanding);
		}

		if (html === '') {
			html = `<div class="error">No chartable data available<br>
				<small>Available metrics: ${Object.keys(metrics).join(', ')}</small><br>
				<small>Note: Historical financial statements require a paid Finnhub plan. Using available metric series data instead.</small></div>`;
		}

		content.innerHTML = html;

		// Initialize charts after a short delay to ensure DOM is ready
		setTimeout(() => {
			this.initializeCharts();
		}, 100);
	}

	createCombinedRevenueNetIncomeSection() {
		return `
			<div class="chart-section" id="revenue_netincome">
				<div class="chart-title">Revenue & Net Income</div>
				<div class="freq-toggle">
					<button class="freq-button active" data-freq="annual" data-section="revenue_netincome">Annual</button>
					<button class="freq-button" data-freq="quarterly" data-section="revenue_netincome">Quarterly</button>
				</div>
				<div class="chart-container">
					<canvas id="chart_revenue_netincome"></canvas>
				</div>
			</div>
		`;
	}

	createChartSection(title, metricKey, displayKey, metrics, sharesOutstanding) {
		const sectionId = metricKey;
		return `
			<div class="chart-section" id="${sectionId}">
				<div class="chart-title">${title}</div>
				<div class="freq-toggle">
					<button class="freq-button active" data-freq="annual" data-section="${sectionId}">Annual</button>
					<button class="freq-button" data-freq="quarterly" data-section="${sectionId}">Quarterly</button>
				</div>
				<div class="chart-container">
					<canvas id="chart_${sectionId}"></canvas>
				</div>
			</div>
		`;
	}

	initializeCharts() {
		const metrics = this.historicalData.metrics;
		const sharesOutstanding = this.historicalData.sharesOutstanding;

		// Create combined Revenue & Net Income chart first (if both available)
		if (metrics.revenue && metrics.netIncome) {
			this.createCombinedRevenueNetIncomeChart('revenue_netincome', metrics, sharesOutstanding);
		} else {
			// Individual charts if not both available
			if (metrics.revenue) {
				this.createChart('revenue', 'Revenue', 'revenue', metrics, sharesOutstanding);
			}
			if (metrics.netIncome) {
				this.createChart('netIncome', 'Net Income', 'netIncome', metrics, sharesOutstanding);
			}
		}
		if (metrics.bookValue) {
			this.createChart('bookValue', 'Book Value', 'bookValue', metrics, sharesOutstanding);
		}
		if (metrics.cashFlow) {
			this.createChart('cashFlow', 'Cash Flow per Share', 'cashFlow', metrics, sharesOutstanding);
		}
		if (metrics.eps) {
			this.createChart('eps', 'EPS', 'eps', metrics, sharesOutstanding);
		}

		// Add frequency toggle listeners
		this.shadowRoot.querySelectorAll('.freq-button').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const section = e.target.dataset.section;
				const freq = e.target.dataset.freq;
				
				// Update button states
				e.target.parentElement.querySelectorAll('.freq-button').forEach(b => b.classList.remove('active'));
				e.target.classList.add('active');
				
				// Update chart
				if (section === 'revenue_netincome') {
					this.updateCombinedChartFrequency(section, freq);
				} else {
					this.updateChartFrequency(section, freq);
				}
			});
		});
	}

	createCombinedRevenueNetIncomeChart(chartId, metrics, sharesOutstanding) {
		const canvas = this.shadowRoot.getElementById(`chart_${chartId}`);
		if (!canvas) return;

		// Get annual data (default)
		const revenueData = this.extractSeriesData(metrics.revenue.annual || [], sharesOutstanding, metrics.revenue.isPerShare);
		const revenueLabels = this.extractSeriesLabels(metrics.revenue.annual || [], 'annual');
		const netIncomeData = this.extractSeriesData(metrics.netIncome.annual || [], sharesOutstanding, metrics.netIncome.isPerShare);
		const netIncomeLabels = this.extractSeriesLabels(metrics.netIncome.annual || [], 'annual');

		// Get quarterly data for toggle
		const revenueDataQuarterly = this.extractSeriesData(metrics.revenue.quarterly || [], sharesOutstanding, metrics.revenue.isPerShare);
		const revenueLabelsQuarterly = this.extractSeriesLabels(metrics.revenue.quarterly || [], 'quarterly');
		const netIncomeDataQuarterly = this.extractSeriesData(metrics.netIncome.quarterly || [], sharesOutstanding, metrics.netIncome.isPerShare);
		const netIncomeLabelsQuarterly = this.extractSeriesLabels(metrics.netIncome.quarterly || [], 'quarterly');

		// Use annual if available, otherwise quarterly
		let labels = revenueLabels.length > 0 ? revenueLabels : revenueLabelsQuarterly;
		let revenueValues = revenueData.length > 0 ? revenueData : revenueDataQuarterly;
		let netIncomeValues = netIncomeData.length > 0 ? netIncomeData : netIncomeDataQuarterly;

		if (labels.length === 0 || revenueValues.length === 0) {
			canvas.parentElement.innerHTML = '<div style="color: #9fb0c0; text-align: center; padding: 20px;">No data available</div>';
			return;
		}

		// Create colors for Net Income (red if negative, green if positive)
		const netIncomeColors = netIncomeValues.map(value => {
			if (value === null || value === undefined) return '#6b7280'; // gray for null
			return value < 0 ? '#ef4444' : '#10b981'; // red for negative, green for positive
		});

		// Store chart reference
		this.charts[chartId] = {
			chart: new Chart(canvas, {
				type: 'bar',
				data: {
					labels: labels,
					datasets: [
						{
							label: 'Revenue',
							data: revenueValues,
							backgroundColor: '#4ea1f3',
							borderColor: '#2d7dd2',
							borderWidth: 1,
							yAxisID: 'y'
						},
						{
							label: 'Net Income',
							data: netIncomeValues,
							backgroundColor: netIncomeColors,
							borderColor: netIncomeColors.map(c => c === '#ef4444' ? '#dc2626' : '#059669'),
							borderWidth: 1,
							yAxisID: 'y'
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: true,
							position: 'top',
							labels: {
								color: '#9fb0c0'
							}
						},
						tooltip: {
							callbacks: {
								label: (context) => {
									return `${context.dataset.label}: ${this.formatNumber(context.parsed.y)}`;
								}
							}
						}
					},
					scales: {
						y: {
							beginAtZero: false, // Allow negative values
							ticks: {
								color: '#9fb0c0',
								callback: (value) => this.formatNumber(value)
							},
							grid: {
								color: '#1f2a37'
							}
						},
						x: {
							ticks: {
								color: '#9fb0c0'
							},
							grid: {
								color: '#1f2a37'
							}
						}
					}
				}
			}),
			annualData: {
				revenue: revenueData,
				netIncome: netIncomeData,
				labels: revenueLabels
			},
			quarterlyData: {
				revenue: revenueDataQuarterly,
				netIncome: netIncomeDataQuarterly,
				labels: revenueLabelsQuarterly
			}
		};
	}

	updateCombinedChartFrequency(sectionId, freq) {
		const chartId = sectionId;
		const chartInfo = this.charts[chartId];
		if (!chartInfo) return;

		const data = freq === 'annual' ? chartInfo.annualData : chartInfo.quarterlyData;

		if (!data.labels || data.labels.length === 0) {
			console.log(`[FundamentalsDetail] No ${freq} data for ${chartId}`);
			return;
		}

		// Update labels
		chartInfo.chart.data.labels = data.labels;

		// Update revenue data
		chartInfo.chart.data.datasets[0].data = data.revenue;

		// Update net income data and colors
		chartInfo.chart.data.datasets[1].data = data.netIncome;
		const netIncomeColors = data.netIncome.map(value => {
			if (value === null || value === undefined) return '#6b7280';
			return value < 0 ? '#ef4444' : '#10b981';
		});
		chartInfo.chart.data.datasets[1].backgroundColor = netIncomeColors;
		chartInfo.chart.data.datasets[1].borderColor = netIncomeColors.map(c => c === '#ef4444' ? '#dc2626' : '#059669');

		chartInfo.chart.update();
	}

	createChart(chartId, title, metricKey, metrics, sharesOutstanding) {
		const canvas = this.shadowRoot.getElementById(`chart_${chartId}`);
		if (!canvas) return;

		const metricData = metrics[metricKey];
		if (!metricData) {
			canvas.parentElement.innerHTML = '<div style="color: #9fb0c0; text-align: center; padding: 20px;">No data available</div>';
			return;
		}

		// Get data for annual (default)
		let data = this.extractSeriesData(metricData.annual || [], sharesOutstanding, metricData.isPerShare);
		let labels = this.extractSeriesLabels(metricData.annual || [], 'annual');

		if (!data || data.length === 0) {
			// Try quarterly if annual is not available
			data = this.extractSeriesData(metricData.quarterly || [], sharesOutstanding, metricData.isPerShare);
			labels = this.extractSeriesLabels(metricData.quarterly || [], 'quarterly');
		}

		if (!data || data.length === 0) {
			canvas.parentElement.innerHTML = '<div style="color: #9fb0c0; text-align: center; padding: 20px;">No data available</div>';
			return;
		}

		// Store chart reference
		this.charts[chartId] = {
			chart: new Chart(canvas, {
				type: 'bar',
				data: {
					labels: labels,
					datasets: [{
						label: title,
						data: data,
						backgroundColor: '#4ea1f3',
						borderColor: '#2d7dd2',
						borderWidth: 1
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: false
						},
						tooltip: {
							callbacks: {
								label: (context) => {
									return this.formatNumber(context.parsed.y);
								}
							}
						}
					},
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								color: '#9fb0c0',
								callback: (value) => this.formatNumber(value)
							},
							grid: {
								color: '#1f2a37'
							}
						},
						x: {
							ticks: {
								color: '#9fb0c0'
							},
							grid: {
								color: '#1f2a37'
							}
						}
					}
				}
			}),
			annualData: this.extractSeriesData(metricData.annual || [], sharesOutstanding, metricData.isPerShare),
			annualLabels: this.extractSeriesLabels(metricData.annual || [], 'annual'),
			quarterlyData: this.extractSeriesData(metricData.quarterly || [], sharesOutstanding, metricData.isPerShare),
			quarterlyLabels: this.extractSeriesLabels(metricData.quarterly || [], 'quarterly'),
			title: title,
			sharesOutstanding: sharesOutstanding,
			isPerShare: metricData.isPerShare
		};
	}

	updateChartFrequency(sectionId, freq) {
		const chartId = sectionId;
		const chartInfo = this.charts[chartId];
		if (!chartInfo) return;

		const data = freq === 'annual' ? chartInfo.annualData : chartInfo.quarterlyData;
		const labels = freq === 'annual' ? chartInfo.annualLabels : chartInfo.quarterlyLabels;

		if (!data || data.length === 0) {
			return;
		}

		chartInfo.chart.data.labels = labels;
		chartInfo.chart.data.datasets[0].data = data;
		chartInfo.chart.update();
	}

	extractSeriesData(seriesArray, sharesOutstanding, isPerShare) {
		if (!seriesArray || seriesArray.length === 0) {
			return [];
		}

		const data = [];
		for (const item of seriesArray) {
			if (item.v !== undefined && item.v !== null) {
				let value = item.v;
				// If it's per share and we have shares outstanding, convert to total
				if (isPerShare && sharesOutstanding) {
					value = value * sharesOutstanding;
				}
				data.push(value);
			}
		}

		return data.reverse(); // Most recent first
	}

	extractSeriesLabels(seriesArray, freq) {
		if (!seriesArray || seriesArray.length === 0) {
			return [];
		}

		const labels = [];
		for (const item of seriesArray) {
			if (item.period) {
				if (freq === 'quarterly') {
					// Format: YYYY-MM-DD -> Q1 2024
					const date = new Date(item.period);
					const quarter = Math.floor(date.getMonth() / 3) + 1;
					labels.push(`Q${quarter} ${date.getFullYear()}`);
				} else {
					// Format: YYYY-MM-DD -> 2024
					const date = new Date(item.period);
					labels.push(date.getFullYear().toString());
				}
			}
		}

		return labels.reverse(); // Most recent first
	}

	formatNumber(num) {
		if (num === null || num === undefined) return 'N/A';
		if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
		if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
		if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
		if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
		return num.toFixed(2);
	}
}

customElements.define('fundamentals-detail', FundamentalsDetail);


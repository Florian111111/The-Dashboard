import { getCachedData, setCachedData } from '../utils/cache.js';

import { API_BASE_URL } from '../config.js';

export class StockOwnership extends HTMLElement {
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
				this.loadOwnershipData();
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
				.ownership-section {
					margin-bottom: 20px;
				}
				.ownership-section:last-child {
					margin-bottom: 0;
				}
				.section-title {
					font-size: 0.95rem;
					font-weight: 600;
					color: #4ea1f3;
					margin-bottom: 12px;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}
				:host(.light-mode) .section-title {
					color: #1d4ed8;
				}
				.holder-list {
					display: flex;
					flex-direction: column;
					gap: 8px;
				}
				.holder-item {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 12px;
					display: flex;
					justify-content: space-between;
					align-items: center;
					transition: all 0.2s ease;
				}
				.holder-item:hover {
					border-color: #4ea1f3;
					transform: translateY(-1px);
				}
				:host(.light-mode) .holder-item {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.holder-name {
					color: #e6edf3;
					font-size: 0.9rem;
					font-weight: 500;
					flex: 1;
				}
				:host(.light-mode) .holder-name {
					color: #0a0a0a;
				}
				.holder-value {
					color: #4ea1f3;
					font-size: 0.95rem;
					font-weight: 700;
					margin-left: 12px;
				}
				:host(.light-mode) .holder-value {
					color: #1d4ed8;
				}
				.ownership-summary {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 12px;
					margin-bottom: 20px;
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
					gap: 12px;
				}
				:host(.light-mode) .ownership-summary {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.summary-item {
					text-align: center;
				}
				.summary-label {
					font-size: 0.75rem;
					color: #9fb0c0;
					margin-bottom: 4px;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}
				:host(.light-mode) .summary-label {
					color: #2a2a2a;
				}
				.summary-value {
					font-size: 1.1rem;
					font-weight: 700;
					color: #4ea1f3;
				}
				:host(.light-mode) .summary-value {
					color: #1d4ed8;
				}
				.no-data {
					color: #9fb0c0;
					text-align: center;
					padding: 20px;
					font-size: 0.9rem;
				}
				:host(.light-mode) .no-data {
					color: #2a2a2a;
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
				.pie-chart-container {
					display: flex;
					justify-content: center;
					align-items: center;
					margin: 20px 0;
					position: relative;
					height: 250px;
				}
				.pie-chart-wrapper {
					position: relative;
					width: 250px;
					height: 250px;
				}
				.pie-chart-legend {
					display: flex;
					flex-direction: column;
					gap: 12px;
					margin-left: 30px;
				}
				.legend-item {
					display: flex;
					align-items: center;
					gap: 10px;
				}
				.legend-color {
					width: 16px;
					height: 16px;
					border-radius: 3px;
					flex-shrink: 0;
				}
				.legend-label {
					color: #e6edf3;
					font-size: 0.9rem;
					font-weight: 500;
				}
				:host(.light-mode) .legend-label {
					color: #0a0a0a;
				}
				.legend-value {
					color: #4ea1f3;
					font-size: 0.9rem;
					font-weight: 700;
					margin-left: auto;
				}
				:host(.light-mode) .legend-value {
					color: #1d4ed8;
				}
			</style>
			<h3>Ownership Distribution</h3>
			<div class="progress-container" id="progress-container" style="display: none;">
				<div class="progress-bar" id="progress-bar"></div>
			</div>
			<div id="ownership-container">
				<div class="loading">Loading ownership data...</div>
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
			setTimeout(() => {
				this.loadOwnershipData();
			}, 50);
		}
		
		// Listen for theme changes
		this.themeChangeHandler = () => {
			const savedTheme = localStorage.getItem('theme') || 'dark';
			if (savedTheme === 'light') {
				this.classList.add('light-mode');
			} else {
				this.classList.remove('light-mode');
			}
			setTimeout(() => {
				if (this.symbol) {
					this.loadOwnershipData();
				}
			}, 50);
		};
		window.addEventListener('storage', this.themeChangeHandler);
		window.addEventListener('themechange', this.themeChangeHandler);
		
		// Use MutationObserver to watch for class changes
		this.observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
					const savedTheme = localStorage.getItem('theme') || 'dark';
					if (savedTheme === 'light' && !this.classList.contains('light-mode')) {
						this.classList.add('light-mode');
					} else if (savedTheme === 'dark' && this.classList.contains('light-mode')) {
						this.classList.remove('light-mode');
					}
					setTimeout(() => {
						if (this.symbol) {
							this.loadOwnershipData();
						}
					}, 100);
				}
			});
		});
		this.observer.observe(this, { attributes: true, attributeFilter: ['class'] });
		
		// Also observe parent element if it exists
		const parent = this.getRootNode().host || this.parentElement;
		if (parent && parent.shadowRoot) {
			this.parentObserver = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
						const parentHasLightMode = parent.classList?.contains('light-mode');
						const savedTheme = localStorage.getItem('theme') || 'dark';
						const shouldBeLight = savedTheme === 'light' || parentHasLightMode;
						
						if (shouldBeLight && !this.classList.contains('light-mode')) {
							this.classList.add('light-mode');
						} else if (!shouldBeLight && this.classList.contains('light-mode')) {
							this.classList.remove('light-mode');
						}
						
						setTimeout(() => {
							if (this.symbol) {
								this.loadOwnershipData();
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

	async loadOwnershipData() {
		if (!this.symbol) return;
		const container = this.shadowRoot.getElementById('ownership-container');
		if (!container) return;
		
		// Check cache first
		const cachedData = getCachedData(this.symbol, 'ownership');
		if (cachedData) {
			console.log('[Ownership] Using cached data');
			this.renderOwnership(container, cachedData);
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
			// Fetch ownership data from Python backend
			const response = await fetch(`${API_BASE_URL}/api/ownership/${this.symbol}`);
			if (!response.ok) {
				throw new Error(`Backend returned ${response.status}`);
			}
			const data = await response.json();
			console.log('[Ownership] Received data:', data);
			
			// Cache the ownership data
			setCachedData(this.symbol, 'ownership', data);
			
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
			
			this.renderOwnership(container, data);
		} catch (error) {
			if (progressInterval) {
				clearInterval(progressInterval);
			}
			if (progressContainer) {
				progressContainer.style.display = 'none';
			}
			console.error('[Ownership] Error:', error);
			container.innerHTML = `<div class="error">Error loading ownership data: ${error.message}</div>`;
		}
	}
	
	renderOwnership(container, data) {
		const isLightMode = this.classList.contains('light-mode');
		
		let html = '';
		
		// Summary section
		if (data.institutionalOwnership !== null && data.institutionalOwnership !== undefined ||
		    data.insiderOwnership !== null && data.insiderOwnership !== undefined ||
		    data.publicFloat !== null && data.publicFloat !== undefined) {
			html += '<div class="ownership-summary">';
			if (data.institutionalOwnership !== null && data.institutionalOwnership !== undefined) {
				html += `
					<div class="summary-item">
						<div class="summary-label">Institutional Ownership</div>
						<div class="summary-value">${(data.institutionalOwnership * 100).toFixed(2)}%</div>
					</div>
				`;
			}
			if (data.insiderOwnership !== null && data.insiderOwnership !== undefined) {
				html += `
					<div class="summary-item">
						<div class="summary-label">Insider Ownership</div>
						<div class="summary-value">${(data.insiderOwnership * 100).toFixed(2)}%</div>
					</div>
				`;
			}
			if (data.publicFloat !== null && data.publicFloat !== undefined) {
				const floatValue = data.publicFloat;
				const floatStr = floatValue >= 1e9 ? `${(floatValue / 1e9).toFixed(2)}B` :
				                floatValue >= 1e6 ? `${(floatValue / 1e6).toFixed(2)}M` :
				                floatValue >= 1e3 ? `${(floatValue / 1e3).toFixed(2)}K` :
				                floatValue.toFixed(0);
				html += `
					<div class="summary-item">
						<div class="summary-label">Public Float</div>
						<div class="summary-value">${floatStr}</div>
					</div>
				`;
			}
			html += '</div>';
		}
		
		// Institutional Holders
		if (data.institutionalHolders && data.institutionalHolders.length > 0) {
			html += '<div class="ownership-section">';
			html += '<div class="section-title">Top Institutional Holders</div>';
			html += '<div class="holder-list">';
			data.institutionalHolders.slice(0, 10).forEach(holder => {
				const sharesStr = holder.shares >= 1e9 ? `${(holder.shares / 1e9).toFixed(2)}B` :
				                 holder.shares >= 1e6 ? `${(holder.shares / 1e6).toFixed(2)}M` :
				                 holder.shares >= 1e3 ? `${(holder.shares / 1e3).toFixed(2)}K` :
				                 holder.shares.toFixed(0);
				const percentStr = holder.percent ? ` (${(holder.percent * 100).toFixed(2)}%)` : '';
				html += `
					<div class="holder-item">
						<div class="holder-name">${holder.name || 'N/A'}</div>
						<div class="holder-value">${sharesStr}${percentStr}</div>
					</div>
				`;
			});
			html += '</div>';
			html += '</div>';
		}
		
		// Major Holders (if available)
		if (data.majorHolders && data.majorHolders.length > 0) {
			html += '<div class="ownership-section">';
			html += '<div class="section-title">Major Holders</div>';
			html += '<div class="holder-list">';
			data.majorHolders.slice(0, 10).forEach(holder => {
				const sharesStr = holder.shares >= 1e9 ? `${(holder.shares / 1e9).toFixed(2)}B` :
				                 holder.shares >= 1e6 ? `${(holder.shares / 1e6).toFixed(2)}M` :
				                 holder.shares >= 1e3 ? `${(holder.shares / 1e3).toFixed(2)}K` :
				                 holder.shares.toFixed(0);
				const percentStr = holder.percent ? ` (${(holder.percent * 100).toFixed(2)}%)` : '';
				html += `
					<div class="holder-item">
						<div class="holder-name">${holder.name || 'N/A'}</div>
						<div class="holder-value">${sharesStr}${percentStr}</div>
					</div>
				`;
			});
			html += '</div>';
			html += '</div>';
		}
		
		// Pie Chart for Ownership Distribution
		const institutionalPercent = data.institutionalOwnership !== null && data.institutionalOwnership !== undefined ? data.institutionalOwnership : 0;
		const insiderPercent = data.insiderOwnership !== null && data.insiderOwnership !== undefined ? data.insiderOwnership : 0;
		const publicPercent = Math.max(0, 1 - institutionalPercent - insiderPercent);
		
		if (institutionalPercent > 0 || insiderPercent > 0 || publicPercent > 0) {
			html += '<div class="ownership-section">';
			html += '<div class="section-title">Ownership Distribution</div>';
			html += '<div class="pie-chart-container">';
			html += '<div class="pie-chart-wrapper">';
			html += `<canvas id="ownership-pie-chart" width="250" height="250"></canvas>`;
			html += '</div>';
			html += '<div class="pie-chart-legend">';
			if (institutionalPercent > 0) {
				html += `
					<div class="legend-item">
						<div class="legend-color" style="background: #4ea1f3;"></div>
						<div class="legend-label">Institutional</div>
						<div class="legend-value">${(institutionalPercent * 100).toFixed(2)}%</div>
					</div>
				`;
			}
			if (insiderPercent > 0) {
				html += `
					<div class="legend-item">
						<div class="legend-color" style="background: #10b981;"></div>
						<div class="legend-label">Insider</div>
						<div class="legend-value">${(insiderPercent * 100).toFixed(2)}%</div>
					</div>
				`;
			}
			if (publicPercent > 0) {
				html += `
					<div class="legend-item">
						<div class="legend-color" style="background: #8b5cf6;"></div>
						<div class="legend-label">Public/Other</div>
						<div class="legend-value">${(publicPercent * 100).toFixed(2)}%</div>
					</div>
				`;
			}
			html += '</div>';
			html += '</div>';
			html += '</div>';
		}
		
		// Only show "no data" message if we have no data at all
		if (html === '') {
			html = '<div class="no-data">No ownership data available for this stock.</div>';
		}
		
		container.innerHTML = html;
		
		// Render pie chart if we have ownership data
		if (institutionalPercent > 0 || insiderPercent > 0 || publicPercent > 0) {
			setTimeout(() => {
				this.renderPieChart(institutionalPercent, insiderPercent, publicPercent);
			}, 100);
		}
	}
	
	renderPieChart(institutionalPercent, insiderPercent, publicPercent) {
		const canvas = this.shadowRoot.getElementById('ownership-pie-chart');
		if (!canvas) return;
		
		// Check if Chart.js is available (check both window.Chart and global Chart)
		const ChartLib = window.Chart || (typeof Chart !== 'undefined' ? Chart : null);
		if (!ChartLib) {
			console.warn('[Ownership] Chart.js not available, skipping pie chart');
			return;
		}
		
		// Destroy existing chart if it exists
		if (this.pieChart) {
			this.pieChart.destroy();
		}
		
		const isLightMode = this.classList.contains('light-mode');
		
		// Prepare data
		const labels = [];
		const data = [];
		const backgroundColor = [];
		const borderColor = [];
		
		if (institutionalPercent > 0) {
			labels.push('Institutional');
			data.push(institutionalPercent * 100);
			backgroundColor.push('#4ea1f3');
			borderColor.push(isLightMode ? '#1d4ed8' : '#3b82f6');
		}
		if (insiderPercent > 0) {
			labels.push('Insider');
			data.push(insiderPercent * 100);
			backgroundColor.push('#10b981');
			borderColor.push(isLightMode ? '#059669' : '#059669');
		}
		if (publicPercent > 0) {
			labels.push('Public/Other');
			data.push(publicPercent * 100);
			backgroundColor.push('#8b5cf6');
			borderColor.push(isLightMode ? '#6d28d9' : '#7c3aed');
		}
		
		// Create pie chart
		this.pieChart = new ChartLib(canvas, {
			type: 'pie',
			data: {
				labels: labels,
				datasets: [{
					data: data,
					backgroundColor: backgroundColor,
					borderColor: borderColor,
					borderWidth: 2
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						callbacks: {
							label: function(context) {
								return context.label + ': ' + context.parsed.toFixed(2) + '%';
							}
						}
					}
				}
			}
		});
	}
}

customElements.define('stock-ownership', StockOwnership);


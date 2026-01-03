import { fetchWithProxy } from '../utils/proxy.js';

import { API_BASE_URL } from '../config.js';

export class EarningsDetail extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.symbol = null;
		this.earningsData = null;
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
		this.symbol = this.getAttribute('symbol') || 'AAPL';
		this.render();
		this.loadEarningsData();
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
			titleElement.textContent = `Earnings & Revenue Details - ${companyName}`;
			document.title = `${companyName} Earnings | Stock Analysis Platform`;
		} catch (error) {
			console.log('[EarningsDetail] Could not fetch company name:', error.message);
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
					--bg-primary: #c8d0da; --bg-secondary: #d5dce5; --bg-tertiary: #b8c2ce;
					--bg-card: #c0c9d4; --border-color: #a0aab8;
					--text-primary: #0a0a0a; --text-secondary: #1a1a1a; --text-muted: #2a2a2a;
				}
				.theme-switch { display: flex; align-items: center; gap: 10px; background: #1f2a37; padding: 6px 12px; border-radius: 20px; border: 1px solid #2d3748; }
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
					font-size: 1.8rem;
				}
				:host(.light-mode) h1 { color: var(--text-primary); }
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
				.content {
					background: #121821;
					border-radius: 12px;
					padding: 25px;
					border: 1px solid #1f2a37;
				}
				:host(.light-mode) .content {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.loading {
					text-align: center;
					color: #9fb0c0;
					padding: 40px;
				}
				:host(.light-mode) .loading {
					color: var(--text-secondary);
				}
				.error {
					text-align: center;
					color: #ef4444;
					padding: 40px;
				}
				.earnings-calendar {
					display: grid;
					gap: 15px;
					margin-top: 20px;
				}
				.earnings-item {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 15px;
					transition: border-color 0.2s;
				}
				:host(.light-mode) .earnings-item {
					background: var(--bg-card);
					border-color: var(--border-color);
				}
				.earnings-item:hover {
					border-color: #4ea1f3;
				}
				.earnings-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 12px;
					padding-bottom: 10px;
					border-bottom: 1px solid #1f2a37;
				}
				:host(.light-mode) .earnings-header {
					border-bottom-color: var(--border-color);
				}
				.earnings-date {
					color: #e6edf3;
					font-weight: 600;
					font-size: 1rem;
				}
				:host(.light-mode) .earnings-date {
					color: var(--text-primary);
				}
				.earnings-period {
					color: #9fb0c0;
					font-size: 0.85rem;
				}
				:host(.light-mode) .earnings-period {
					color: var(--text-secondary);
				}
				.earnings-metrics {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
					gap: 15px;
				}
				.earnings-metric {
					background: #121821;
					padding: 12px;
					border-radius: 6px;
					border: 1px solid #1f2a37;
				}
				:host(.light-mode) .earnings-metric {
					background: var(--bg-tertiary);
					border-color: var(--border-color);
				}
				.earnings-metric-label {
					color: #9fb0c0;
					font-size: 0.85rem;
					margin-bottom: 6px;
				}
				:host(.light-mode) .earnings-metric-label {
					color: var(--text-secondary);
				}
				.earnings-metric-value {
					color: #e6edf3;
					font-size: 1.1rem;
					font-weight: 600;
					margin-bottom: 4px;
				}
				:host(.light-mode) .earnings-metric-value {
					color: var(--text-primary);
				}
			.surprise-positive {
				color: #10b981;
			}
			.surprise-negative {
				color: #ef4444;
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
				<h1 id="page-title">Earnings & Revenue Details - ${this.symbol || 'N/A'}</h1>
				<div style="display: flex; align-items: center; gap: 15px;">
					<div class="theme-switch">
						<span class="theme-switch-label">Theme</span>
						<div class="theme-switch-track" id="theme-toggle">
							<div class="theme-switch-thumb"><span class="theme-icon">🌙</span></div>
						</div>
					</div>
					<button class="back-btn" id="back-btn">← Back to Stock Analysis</button>
				</div>
			</div>
		<div class="content" id="content">
			<div class="loading">Loading earnings data...</div>
		</div>
		
		<div class="disclaimer-footer">
			<div>
				The information provided on this website is for general informational and educational purposes only and does not constitute investment advice, financial advice, trading advice, or any other form of recommendation. All content is provided without regard to individual financial circumstances, investment objectives, or risk tolerance. Past performance is not indicative of future results. Financial markets are subject to risk, and investing may result in the loss of part or all of your capital. Any actions taken based on the information on this website are strictly at your own risk. Before making any investment decision, you should conduct your own research and, where appropriate, consult a licensed financial advisor. By using this website, you acknowledge and agree to this disclaimer. <a href="#" id="disclaimer-link-full">Full Disclaimer</a>
			</div>
		</div>
	`;
		
		this.shadowRoot.getElementById('back-btn')?.addEventListener('click', () => {
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

	formatNumber(num) {
		if (num === null || num === undefined) return 'N/A';
		if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
		if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
		if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
		return num.toFixed(2);
	}

	async loadEarningsData() {
		if (!this.symbol) return;
		
		const container = this.shadowRoot.getElementById('content');
		if (!container) return;
		
		try {
			const response = await fetch(`${API_BASE_URL}/api/earnings/${this.symbol}`);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			
			const data = await response.json();
			this.earningsData = data;
			this.renderEarningsCalendar();
		} catch (error) {
			console.error('[EarningsDetail] Error loading earnings:', error);
			container.innerHTML = `<div class="error">Error loading earnings data: ${error.message}</div>`;
		}
	}

	renderEarningsCalendar() {
		const container = this.shadowRoot.getElementById('content');
		if (!container || !this.earningsData) return;
		
		const earnings = this.earningsData.earnings || [];
		
		if (earnings.length === 0) {
			container.innerHTML = '<div class="error">No earnings data available</div>';
			return;
		}
		
		let html = '<div class="earnings-calendar">';
		
		earnings.slice(0, 10).forEach(earning => {
			const dateStr = earning.date || earning.period || '';
			let formattedDate = 'N/A';
			if (dateStr) {
				try {
					const date = new Date(dateStr);
					if (!isNaN(date.getTime())) {
						formattedDate = date.toLocaleDateString('en-US', { 
							year: 'numeric', 
							month: 'short', 
							day: 'numeric'
						});
					}
				} catch (e) {
					formattedDate = dateStr;
				}
			}
			
			const epsActual = earning.epsActual;
			const epsEstimate = earning.epsEstimate;
			const epsSurprisePercent = earning.epsSurprisePercent;
			
			const revenueActual = earning.revenueActual;
			const revenueEstimate = earning.revenueEstimate;
			const revenueSurprisePercent = earning.revenueSurprisePercent;
			
			html += `
				<div class="earnings-item">
					<div class="earnings-header">
						<div class="earnings-date">${formattedDate}</div>
						<div class="earnings-period">${earning.period || 'N/A'}</div>
					</div>
					<div class="earnings-metrics">
						${epsActual !== null && epsActual !== undefined ? `
							<div class="earnings-metric">
								<div class="earnings-metric-label">EPS Actual</div>
								<div class="earnings-metric-value">$${epsActual.toFixed(2)}</div>
								${epsEstimate !== null && epsEstimate !== undefined ? `
									<div class="earnings-metric-label" style="margin-top: 4px; font-size: 0.75rem;">
										Estimate: $${epsEstimate.toFixed(2)}
									</div>
								` : ''}
								${epsSurprisePercent !== null && epsSurprisePercent !== undefined ? `
									<div class="earnings-metric-label ${epsSurprisePercent >= 0 ? 'surprise-positive' : 'surprise-negative'}" style="margin-top: 2px; font-size: 0.75rem; font-weight: 600;">
										${epsSurprisePercent >= 0 ? '+' : ''}${epsSurprisePercent.toFixed(1)}% Surprise
									</div>
								` : ''}
							</div>
						` : ''}
						${revenueActual !== null && revenueActual !== undefined ? `
							<div class="earnings-metric">
								<div class="earnings-metric-label">Revenue Actual</div>
								<div class="earnings-metric-value">${this.formatNumber(revenueActual)}</div>
								${revenueEstimate !== null && revenueEstimate !== undefined ? `
									<div class="earnings-metric-label" style="margin-top: 4px; font-size: 0.75rem;">
										Estimate: ${this.formatNumber(revenueEstimate)}
									</div>
								` : ''}
								${revenueSurprisePercent !== null && revenueSurprisePercent !== undefined ? `
									<div class="earnings-metric-label ${revenueSurprisePercent >= 0 ? 'surprise-positive' : 'surprise-negative'}" style="margin-top: 2px; font-size: 0.75rem; font-weight: 600;">
										${revenueSurprisePercent >= 0 ? '+' : ''}${revenueSurprisePercent.toFixed(1)}% Surprise
									</div>
								` : ''}
							</div>
						` : ''}
					</div>
				</div>
			`;
		});
		
		html += '</div>';
		container.innerHTML = html;
	}
}


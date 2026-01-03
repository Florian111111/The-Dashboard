export class IndicatorDetail extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.symbol = null;
		this.name = null;
		this.description = null;
		this.source = null;
	}

	connectedCallback() {
		// Get parameters from URL or attributes
		const params = new URLSearchParams(window.location.search);
		this.symbol = this.getAttribute('symbol') || params.get('symbol');
		this.name = this.getAttribute('name') || params.get('name');
		this.description = this.getAttribute('description') || params.get('description');
		this.source = this.getAttribute('source') || params.get('source') || 'yahoo';

		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					width: 100%;
					padding: 20px;
					max-width: 1400px;
					margin: 0 auto;
				}
				:host(.light-mode) {
					--bg-primary: #c8d0da;
					--bg-secondary: #d5dce5;
					--bg-tertiary: #b8c2ce;
					--bg-card: #dde3ea;
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
				.theme-icon { font-size: 11px; }
				
				.header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 30px;
				}
				.header-left { display: flex; align-items: center; gap: 20px; }
				.back-btn {
					background: #233044;
					border: 1px solid #1f2a37;
					color: #e6edf3;
					padding: 8px 16px;
					border-radius: 8px;
					cursor: pointer;
					font-size: 0.9rem;
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
				.title {
					font-size: 2rem;
					font-weight: 700;
					color: #e6edf3;
					margin: 0;
				}
				:host(.light-mode) .title {
					color: var(--text-primary);
				}
				.chart-section {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
					margin-bottom: 20px;
				}
				:host(.light-mode) .chart-section {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.info-section {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
				}
				:host(.light-mode) .info-section {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.info-title {
					font-size: 1.3rem;
					font-weight: 600;
					color: #e6edf3;
					margin-bottom: 15px;
				}
				:host(.light-mode) .info-title {
					color: var(--text-primary);
				}
				.info-content {
					color: #9fb0c0;
					line-height: 1.8;
					font-size: 0.95rem;
				}
				:host(.light-mode) .info-content {
					color: var(--text-secondary);
				}
				.info-content p {
					margin: 0 0 12px 0;
				}
				.info-content ul {
					margin: 12px 0;
					padding-left: 20px;
				}
			.info-content li {
				margin: 8px 0;
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
				<div class="header-left">
					<button class="back-btn" id="back-btn">← Back to Market</button>
				</div>
				<h1 class="title" id="title">${this.name || 'Indicator'}</h1>
				<div class="theme-switch">
					<span class="theme-switch-label">Theme</span>
					<div class="theme-switch-track" id="theme-toggle">
						<div class="theme-switch-thumb">
							<span class="theme-icon">🌙</span>
						</div>
					</div>
				</div>
			</div>
			<div class="chart-section">
				<stock-chart symbol="${this.symbol}" id="indicator-chart"></stock-chart>
			</div>
			${(this.symbol === '^GSPC' || this.name === 'S&P 500') ? `
			<div class="chart-section" id="heatmap-section">
				<sector-heatmap></sector-heatmap>
			</div>
			` : ''}
			${(this.symbol === '^GDAXI' || this.name === 'DAX') ? `
			<div class="chart-section" id="heatmap-section">
				<dax-heatmap></dax-heatmap>
			</div>
			` : ''}
			${(this.symbol === '^N225' || this.name === 'Nikkei 225') ? `
			<div class="chart-section" id="heatmap-section">
				<nikkei225-heatmap></nikkei225-heatmap>
			</div>
			` : ''}
			${(this.symbol === '^NDX' || this.name === 'NASDAQ 100') ? `
			<div class="chart-section" id="heatmap-section">
				<nasdaq100-heatmap></nasdaq100-heatmap>
			</div>
			` : ''}
			${(this.symbol === '^HSI' || this.name === 'Hang Seng') ? `
			<div class="chart-section" id="heatmap-section">
				<hangseng-heatmap></hangseng-heatmap>
			</div>
			` : ''}
		<div class="info-section">
			<div class="info-title">About ${this.name || 'this Indicator'}</div>
			<div class="info-content" id="info-content">
				${this.getIndicatorInfo()}
			</div>
		</div>
		
		<div class="disclaimer-footer">
			<div>
				The information provided on this website is for general informational and educational purposes only and does not constitute investment advice, financial advice, trading advice, or any other form of recommendation. All content is provided without regard to individual financial circumstances, investment objectives, or risk tolerance. Past performance is not indicative of future results. Financial markets are subject to risk, and investing may result in the loss of part or all of your capital. Any actions taken based on the information on this website are strictly at your own risk. Before making any investment decision, you should conduct your own research and, where appropriate, consult a licensed financial advisor. By using this website, you acknowledge and agree to this disclaimer. <a href="#" id="disclaimer-link-full">Full Disclaimer</a>
			</div>
		</div>
	`;

		this.shadowRoot.getElementById('back-btn')?.addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'market-overview' } }));
		});
		
		// Setup theme toggle
		this.setupThemeToggle();
		
		// Disclaimer link
		this.shadowRoot.getElementById('disclaimer-link-full')?.addEventListener('click', (e) => {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'disclaimer' } }));
		});

		// Import and define StockChart component
		this.loadChart();
	}
	
	setupThemeToggle() {
		const toggle = this.shadowRoot.getElementById('theme-toggle');
		if (!toggle) return;
		
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.applyLightMode(true);
		}
		
		toggle.addEventListener('click', () => {
			const isLight = this.classList.contains('light-mode');
			this.applyLightMode(!isLight);
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

	async loadChart() {
		const { StockChart } = await import('../components/StockChart.js');
		if (!customElements.get('stock-chart')) {
			customElements.define('stock-chart', StockChart);
		}
		
		// Load SectorHeatmap if S&P 500
		if (this.symbol === '^GSPC' || this.name === 'S&P 500') {
			const { SectorHeatmap } = await import('../components/SectorHeatmap.js');
			if (!customElements.get('sector-heatmap')) {
				customElements.define('sector-heatmap', SectorHeatmap);
			}
		}
		
		// Load DaxHeatmap if DAX
		if (this.symbol === '^GDAXI' || this.name === 'DAX') {
			const { DaxHeatmap } = await import('../components/DaxHeatmap.js');
			if (!customElements.get('dax-heatmap')) {
				customElements.define('dax-heatmap', DaxHeatmap);
			}
		}
		
		// Load Nikkei225Heatmap if Nikkei 225
		if (this.symbol === '^N225' || this.name === 'Nikkei 225') {
			const { Nikkei225Heatmap } = await import('../components/Nikkei225Heatmap.js');
			if (!customElements.get('nikkei225-heatmap')) {
				customElements.define('nikkei225-heatmap', Nikkei225Heatmap);
			}
		}
		
		// Load Nasdaq100Heatmap if NASDAQ 100
		if (this.symbol === '^NDX' || this.name === 'NASDAQ 100') {
			const { Nasdaq100Heatmap } = await import('../components/Nasdaq100Heatmap.js');
			if (!customElements.get('nasdaq100-heatmap')) {
				customElements.define('nasdaq100-heatmap', Nasdaq100Heatmap);
			}
		}
		
		// Load HangSengHeatmap if Hang Seng
		if (this.symbol === '^HSI' || this.name === 'Hang Seng') {
			const { HangSengHeatmap } = await import('../components/HangSengHeatmap.js');
			if (!customElements.get('hangseng-heatmap')) {
				customElements.define('hangseng-heatmap', HangSengHeatmap);
			}
		}
	}

	getIndicatorInfo() {
		const infoMap = {
			'S&P 500': {
				description: 'The S&P 500 is a stock market index that measures the stock performance of 500 large companies listed on stock exchanges in the United States.',
				interpretation: 'It is widely regarded as the best single gauge of large-cap U.S. equities. A rising S&P 500 generally indicates a healthy economy and investor confidence.',
				usage: 'Investors use the S&P 500 as a benchmark for portfolio performance and as an indicator of overall market trends.'
			},
			'DAX': {
				description: 'The DAX (Deutscher Aktienindex) is Germany\'s primary stock index, representing 40 major German companies trading on the Frankfurt Stock Exchange.',
				interpretation: 'The DAX is a key indicator of the German economy\'s health. It reflects the performance of Germany\'s largest and most liquid companies.',
				usage: 'Used to gauge German economic performance and European market sentiment. Often moves in correlation with broader European markets.'
			},
			'Nikkei 225': {
				description: 'The Nikkei 225 is Japan\'s primary stock market index, tracking 225 large, publicly owned companies listed on the Tokyo Stock Exchange.',
				interpretation: 'As Japan\'s most widely quoted stock average, it serves as a barometer for the Japanese economy and Asian markets.',
				usage: 'Investors monitor the Nikkei to assess Japanese economic health and as a proxy for broader Asian market performance.'
			},
			'NASDAQ 100': {
				description: 'The NASDAQ-100 is a stock market index made up of 100 of the largest domestic and international non-financial companies listed on the NASDAQ stock exchange.',
				interpretation: 'Heavily weighted toward technology companies, the NASDAQ-100 is a key indicator of tech sector performance and innovation trends.',
				usage: 'Widely used to track technology and growth stock performance, often more volatile than broader market indices.'
			},
			'Hang Seng': {
				description: 'The Hang Seng Index (HSI) is the primary stock market index of Hong Kong, tracking the largest and most liquid companies listed on the Hong Kong Stock Exchange.',
				interpretation: 'As a major Asian market indicator, the Hang Seng reflects both Hong Kong\'s economy and broader Chinese market sentiment.',
				usage: 'Used to gauge Asian market trends and as an indicator of Chinese economic health and investor confidence.'
			},
			'VIX': {
				description: 'The VIX (Volatility Index) measures the market\'s expectation of 30-day volatility based on S&P 500 index options.',
				interpretation: 'Often called the "fear gauge," a high VIX indicates increased market fear and uncertainty, while a low VIX suggests calm, confident markets.',
				usage: 'Traders use the VIX to assess market sentiment and potential volatility. Values above 30 typically indicate high fear, while values below 20 suggest low fear.'
			},
			'10Y Treasury': {
				description: 'The 10-Year Treasury Yield represents the interest rate the U.S. government pays to borrow money for 10 years.',
				interpretation: 'Rising yields typically indicate expectations of economic growth and inflation, while falling yields suggest economic concerns or deflationary pressures.',
				usage: 'Used as a benchmark for mortgage rates, corporate bonds, and as an indicator of economic expectations. Often inversely correlated with stock prices.'
			},
			'5Y Treasury': {
				description: 'The 5-Year Treasury Yield represents the interest rate the U.S. government pays to borrow money for 5 years.',
				interpretation: 'Shorter-term yields are more sensitive to Federal Reserve policy changes and near-term economic expectations.',
				usage: 'Used to assess intermediate-term economic outlook and Federal Reserve policy expectations. Often compared to longer-term yields to gauge yield curve shape.'
			},
			'Dollar Index': {
				description: 'The U.S. Dollar Index (DXY) measures the value of the U.S. dollar against a basket of six major world currencies: EUR, JPY, GBP, CAD, SEK, and CHF.',
				interpretation: 'A rising dollar index indicates a stronger dollar relative to other currencies, which can impact exports, commodity prices, and emerging markets.',
				usage: 'Traders use it to assess dollar strength and its impact on global markets, commodities, and international trade.'
			},
			'Gold': {
				description: 'Gold prices represent the market value of gold, often traded as futures contracts or spot prices.',
				interpretation: 'Gold is considered a safe-haven asset. Rising gold prices often indicate economic uncertainty, inflation concerns, or currency devaluation fears.',
				usage: 'Investors use gold as a hedge against inflation, currency risk, and market volatility. Often moves inversely to the U.S. dollar and stock markets.'
			}
		};

		const info = infoMap[this.name] || {
			description: `${this.name} is a key market indicator used to track market performance and economic trends.`,
			interpretation: 'This indicator reflects market sentiment and economic conditions.',
			usage: 'Used by investors and analysts to assess market trends and make informed investment decisions.'
		};

		return `
			<p><strong>Description:</strong> ${info.description}</p>
			<p><strong>What it means:</strong> ${info.interpretation}</p>
			<p><strong>How to use it:</strong> ${info.usage}</p>
		`;
	}
}


import { fetchWithProxy } from '../utils/proxy.js';

export class StockRiskAnalysis extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.symbol = null;
		this.priceData = [];
		this.marketData = []; // For beta calculation (e.g., S&P 500)
	}

	static get observedAttributes() {
		return ['symbol'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'symbol' && newValue !== oldValue) {
			this.symbol = newValue;
			if (this.shadowRoot && this.shadowRoot.innerHTML && this.symbol) {
				this.loadRiskAnalysis();
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
					min-height: 400px;
					display: flex;
					flex-direction: column;
				}
				:host(.light-mode) {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.panel-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 20px;
				}
				h3 {
					margin: 0;
					color: #e6edf3;
					font-size: 1.2rem;
				}
				:host(.light-mode) h3 {
					color: #0a0a0a;
				}
				.panel-info-icon {
					width: 22px;
					height: 22px;
					border-radius: 50%;
					background: rgba(78, 161, 243, 0.15);
					border: 1px solid rgba(78, 161, 243, 0.3);
					color: #4ea1f3;
					display: flex;
					align-items: center;
					justify-content: center;
					cursor: pointer;
					font-size: 0.75rem;
					font-weight: 700;
					transition: all 0.2s ease;
					flex-shrink: 0;
				}
				.panel-info-icon:hover {
					background: rgba(78, 161, 243, 0.25);
					border-color: #4ea1f3;
					transform: scale(1.1);
				}
				:host(.light-mode) .panel-info-icon {
					background: rgba(29, 78, 216, 0.15);
					border-color: rgba(29, 78, 216, 0.3);
					color: #1d4ed8;
				}
				:host(.light-mode) .panel-info-icon:hover {
					background: rgba(29, 78, 216, 0.25);
					border-color: #1d4ed8;
				}
				/* Info Modal Styles */
				.panel-info-modal-overlay {
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
				.panel-info-modal-overlay.show {
					display: flex;
				}
				.panel-info-modal {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					width: 90%;
					max-width: 600px;
					max-height: 85vh;
					display: flex;
					flex-direction: column;
					box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
				}
				:host(.light-mode) .panel-info-modal {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.panel-info-modal-header {
					padding: 20px;
					border-bottom: 1px solid #1f2a37;
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-shrink: 0;
				}
				:host(.light-mode) .panel-info-modal-header {
					border-bottom-color: #a0aab8;
				}
				.panel-info-modal-title {
					font-size: 1.3rem;
					font-weight: 700;
					color: #e6edf3;
					display: flex;
					align-items: center;
					gap: 10px;
				}
				:host(.light-mode) .panel-info-modal-title {
					color: #0a0a0a;
				}
				.panel-info-modal-close {
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
				.panel-info-modal-close:hover {
					background: rgba(239, 68, 68, 0.2);
					color: #ef4444;
				}
				.panel-info-modal-content {
					padding: 20px;
					overflow-y: auto;
					flex: 1;
					color: #e6edf3;
					line-height: 1.7;
					font-size: 0.95rem;
				}
				:host(.light-mode) .panel-info-modal-content {
					color: #0a0a0a;
				}
				.panel-info-modal-content h3 {
					font-size: 1.1rem;
					font-weight: 600;
					color: #4ea1f3;
					margin: 20px 0 10px 0;
				}
				:host(.light-mode) .panel-info-modal-content h3 {
					color: #1d4ed8;
				}
				.panel-info-modal-content h3:first-child {
					margin-top: 0;
				}
				.panel-info-modal-content p {
					margin: 10px 0;
					line-height: 1.7;
				}
				.panel-info-modal-content ul {
					margin: 10px 0;
					padding-left: 25px;
				}
				.panel-info-modal-content li {
					margin: 8px 0;
					line-height: 1.6;
				}
				.panel-info-modal-content strong {
					color: #4ea1f3;
					font-weight: 600;
				}
				:host(.light-mode) .panel-info-modal-content strong {
					color: #1d4ed8;
				}
				.panel-info-modal-content::-webkit-scrollbar {
					width: 8px;
				}
				.panel-info-modal-content::-webkit-scrollbar-track {
					background: #0b0f14;
					border-radius: 4px;
				}
				.panel-info-modal-content::-webkit-scrollbar-thumb {
					background: #1f2a37;
					border-radius: 4px;
				}
				.panel-info-modal-content::-webkit-scrollbar-thumb:hover {
					background: #2d3748;
				}
				:host(.light-mode) .panel-info-modal-content::-webkit-scrollbar-track {
					background: #c0c9d4;
				}
				:host(.light-mode) .panel-info-modal-content::-webkit-scrollbar-thumb {
					background: #a0aab8;
				}
				:host(.light-mode) .panel-info-modal-content::-webkit-scrollbar-thumb:hover {
					background: #8b95a3;
				}
				.risk-content-wrapper {
					flex: 1;
					display: flex;
					flex-direction: column;
					gap: 15px;
				}
				.risk-metrics-grid {
					display: grid;
					grid-template-columns: repeat(3, 1fr);
					gap: 12px;
					margin-bottom: 15px;
				}
				.risk-card {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 15px;
					position: relative;
					overflow: hidden;
				}
				:host(.light-mode) .risk-card {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.risk-card::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 3px;
					background: #1f2a37;
					transition: background 0.2s ease;
				}
				.risk-card.low-risk::before {
					background: #10b981;
				}
				.risk-card.medium-risk::before {
					background: #f59e0b;
				}
				.risk-card.high-risk::before {
					background: #ef4444;
				}
				.risk-label {
					color: #9fb0c0;
					font-size: 0.85rem;
					margin-bottom: 8px;
					font-weight: 500;
				}
				:host(.light-mode) .risk-label {
					color: #2a2a2a;
				}
				.risk-value {
					font-size: 1.3rem;
					color: #e6edf3;
					font-weight: 700;
					margin-bottom: 4px;
				}
				:host(.light-mode) .risk-value {
					color: #0a0a0a;
				}
				.risk-description {
					font-size: 0.75rem;
					color: #6b7a8a;
					margin-top: 6px;
					line-height: 1.4;
				}
				:host(.light-mode) .risk-description {
					color: #1a1a1a;
				}
				.risk-score-container {
					background: linear-gradient(135deg, #1f2a37 0%, #2d3748 100%);
					border: 2px solid #4ea1f3;
					border-radius: 12px;
					padding: 20px;
					text-align: center;
					margin-bottom: 15px;
				}
				:host(.light-mode) .risk-score-container {
					background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-card) 100%);
					border-color: var(--accent-blue);
				}
				.risk-score-label {
					color: #9fb0c0;
					font-size: 0.9rem;
					margin-bottom: 10px;
					text-transform: uppercase;
					letter-spacing: 1px;
				}
				:host(.light-mode) .risk-score-label {
					color: #1a1a1a;
				}
				.risk-score-value {
					font-size: 3rem;
					font-weight: 700;
					margin-bottom: 10px;
				}
				.risk-score-value.low {
					color: #10b981;
				}
				.risk-score-value.medium {
					color: #f59e0b;
				}
				.risk-score-value.high {
					color: #ef4444;
				}
				.risk-score-interpretation {
					color: #9fb0c0;
					font-size: 0.9rem;
					font-weight: 500;
				}
				:host(.light-mode) .risk-score-interpretation {
					color: #1a1a1a;
				}
				.loading {
					color: #9fb0c0;
					text-align: center;
					padding: 20px;
				}
				:host(.light-mode) .loading {
					color: #2a2a2a;
				}
				.comparison-section {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 15px;
					margin-top: auto;
				}
				:host(.light-mode) .comparison-section {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.comparison-title {
					color: #4ea1f3;
					font-size: 0.95rem;
					font-weight: 600;
					margin-bottom: 12px;
					display: flex;
					align-items: center;
					gap: 8px;
				}
				:host(.light-mode) .comparison-title {
					color: var(--accent-blue);
				}
				.comparison-grid {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 12px;
				}
				.comparison-item {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 6px;
					padding: 12px;
					display: flex;
					flex-direction: column;
					gap: 6px;
				}
				:host(.light-mode) .comparison-item {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.comparison-label {
					color: #9fb0c0;
					font-size: 0.75rem;
					text-transform: uppercase;
					letter-spacing: 0.5px;
					font-weight: 500;
				}
				:host(.light-mode) .comparison-label {
					color: #2a2a2a;
				}
				.comparison-value {
					color: #e6edf3;
					font-weight: 700;
					font-size: 1rem;
				}
				:host(.light-mode) .comparison-value {
					color: #0a0a0a;
				}
			</style>
			<div class="panel-header">
				<h3>Risk Analysis</h3>
				<div class="panel-info-icon" id="risk-analysis-info-icon">i</div>
			</div>
			<div class="risk-content-wrapper">
				<div id="risk-content">
					<div class="loading">Loading risk analysis...</div>
				</div>
			</div>
			
			<!-- Info Modal -->
			<div class="panel-info-modal-overlay" id="risk-analysis-info-modal-overlay">
				<div class="panel-info-modal">
					<div class="panel-info-modal-header">
						<div class="panel-info-modal-title">
							<span>ℹ️</span>
							<span>Risk Analysis</span>
						</div>
						<button class="panel-info-modal-close" id="risk-analysis-info-modal-close">×</button>
					</div>
					<div class="panel-info-modal-content" id="risk-analysis-info-modal-content">
						<!-- Content will be dynamically inserted -->
					</div>
				</div>
			</div>
		`;
		
		if (this.symbol) {
			this.loadRiskAnalysis();
		}
		
		// Apply saved theme
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.classList.add('light-mode');
		}
		
		// Setup info icon
		this.setupInfoIcon();
	}
	
	setupInfoIcon() {
		const infoIcon = this.shadowRoot.getElementById('risk-analysis-info-icon');
		const overlay = this.shadowRoot.getElementById('risk-analysis-info-modal-overlay');
		const closeBtn = this.shadowRoot.getElementById('risk-analysis-info-modal-close');
		const content = this.shadowRoot.getElementById('risk-analysis-info-modal-content');
		
		if (!infoIcon || !overlay || !closeBtn || !content) return;
		
		infoIcon.addEventListener('click', () => {
			this.openInfoModal();
		});
		
		closeBtn.addEventListener('click', () => {
			overlay.classList.remove('show');
		});
		
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.classList.remove('show');
			}
		});
	}
	
	openInfoModal() {
		const overlay = this.shadowRoot.getElementById('risk-analysis-info-modal-overlay');
		const content = this.shadowRoot.getElementById('risk-analysis-info-modal-content');
		
		if (!overlay || !content) return;
		
		content.innerHTML = `
			<h3>What is Risk Analysis?</h3>
			<p>Risk Analysis evaluates the volatility and potential downside of a stock investment. It helps investors understand how much risk they're taking and how the stock's price movements compare to the broader market.</p>
			
			<h3>Key Risk Metrics Explained</h3>
			<ul>
				<li><strong>Volatility (Standard Deviation)</strong>: Measures how much a stock's price fluctuates. Higher volatility means larger price swings, indicating higher risk. Lower volatility suggests more stable, predictable price movements.</li>
				<li><strong>Beta</strong>: Compares the stock's price movements to the overall market (typically S&P 500). A beta of 1.0 means the stock moves in line with the market. Beta > 1.0 indicates the stock is more volatile than the market (amplifies market movements). Beta < 1.0 indicates the stock is less volatile (dampens market movements).</li>
				<li><strong>Maximum Drawdown</strong>: The largest peak-to-trough decline during a specific period. It shows the worst-case scenario loss an investor could have experienced. Lower drawdowns indicate better risk management.</li>
				<li><strong>Value at Risk (VaR)</strong>: Estimates the maximum potential loss over a specific time period with a given confidence level (e.g., 95% VaR). It helps quantify downside risk.</li>
				<li><strong>Sharpe Ratio</strong>: Measures risk-adjusted returns. Higher Sharpe ratios indicate better returns relative to the risk taken. A ratio above 1 is generally considered good, above 2 is very good, and above 3 is excellent.</li>
			</ul>
			
			<h3>How to Use Risk Analysis</h3>
			<ul>
				<li><strong>Risk Tolerance</strong>: Use volatility and drawdown metrics to assess if a stock matches your risk tolerance. Conservative investors should prefer lower volatility stocks.</li>
				<li><strong>Portfolio Diversification</strong>: Beta helps understand how a stock will behave relative to your portfolio. Low or negative beta stocks can help diversify a portfolio.</li>
				<li><strong>Risk-Adjusted Returns</strong>: The Sharpe Ratio helps compare investments on a risk-adjusted basis. A stock with lower returns but much lower risk might be preferable to one with higher returns but extreme volatility.</li>
				<li><strong>Downside Protection</strong>: Maximum Drawdown and VaR help you understand potential losses and prepare for worst-case scenarios.</li>
			</ul>
			
			<h3>Understanding the Display</h3>
			<ul>
				<li><strong>Risk Score</strong>: A composite score that combines multiple risk metrics. Lower scores indicate lower risk, higher scores indicate higher risk.</li>
				<li><strong>Color Coding</strong>: Green indicates low risk, yellow/orange indicates medium risk, red indicates high risk.</li>
				<li><strong>Market Comparison</strong>: Shows how the stock's risk metrics compare to the overall market (S&P 500).</li>
			</ul>
			
			<p><strong>Tip:</strong> Risk analysis is crucial for portfolio construction. Higher risk doesn't always mean higher returns. Consider your investment goals, time horizon, and risk tolerance when interpreting these metrics. Remember that past volatility does not guarantee future risk levels.</p>
		`;
		
		overlay.classList.add('show');
	}

	async loadRiskAnalysis() {
		try {
			// Fetch historical price data for the stock
			await this.fetchPriceData();
			
			// Fetch market data (S&P 500) for beta calculation
			await this.fetchMarketData();
			
			// Calculate risk metrics
			const riskMetrics = this.calculateRiskMetrics();
			
			// Render the results
			this.renderRiskAnalysis(riskMetrics);
		} catch (error) {
			console.error('Error loading risk analysis:', error);
			this.shadowRoot.getElementById('risk-content').innerHTML = 
				'<div class="loading">Error loading risk analysis</div>';
		}
	}

	async fetchPriceData() {
		try {
			const response = await fetch(`http://localhost:3000/api/yahoo/chart/${this.symbol}?interval=1d&range=1y`);
			if (!response.ok) throw new Error('Failed to fetch price data');
			
			const data = await response.json();
			if (!data.chart?.result?.[0]) throw new Error('No price data available');
			
			const result = data.chart.result[0];
			const timestamps = result.timestamp || [];
			const quotes = result.indicators?.quote?.[0] || {};
			const closes = quotes.close || [];
			
			this.priceData = timestamps.map((ts, i) => ({
				date: new Date(ts * 1000),
				close: closes[i] || 0
			})).filter(d => d.close > 0);
		} catch (error) {
			console.error('Error fetching price data:', error);
			throw error;
		}
	}

	async fetchMarketData() {
		try {
			// Use S&P 500 (^GSPC) as market benchmark
			const response = await fetch(`http://localhost:3000/api/yahoo/chart/^GSPC?interval=1d&range=1y`);
			if (!response.ok) throw new Error('Failed to fetch market data');
			
			const data = await response.json();
			if (!data.chart?.result?.[0]) throw new Error('No market data available');
			
			const result = data.chart.result[0];
			const timestamps = result.timestamp || [];
			const quotes = result.indicators?.quote?.[0] || {};
			const closes = quotes.close || [];
			
			this.marketData = timestamps.map((ts, i) => ({
				date: new Date(ts * 1000),
				close: closes[i] || 0
			})).filter(d => d.close > 0);
		} catch (error) {
			console.error('Error fetching market data:', error);
			// Continue without market data - beta will be N/A
		}
	}

	calculateRiskMetrics() {
		if (this.priceData.length < 30) {
			return null; // Not enough data
		}

		// Calculate daily returns
		const returns = [];
		for (let i = 1; i < this.priceData.length; i++) {
			const dailyReturn = (this.priceData[i].close - this.priceData[i - 1].close) / this.priceData[i - 1].close;
			returns.push(dailyReturn);
		}

		// Value at Risk (VaR) - 95% confidence level
		const sortedReturns = [...returns].sort((a, b) => a - b);
		const var95Index = Math.floor(sortedReturns.length * 0.05);
		const var95 = Math.abs(sortedReturns[var95Index]) * 100;

		// Historical Volatility (annualized)
		const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
		const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
		const stdDev = Math.sqrt(variance);
		const historicalVolatility = stdDev * Math.sqrt(252) * 100; // Annualized

		// Beta calculation (correlation with market)
		let beta = null;
		if (this.marketData.length > 0 && this.marketData.length === this.priceData.length) {
			const marketReturns = [];
			for (let i = 1; i < this.marketData.length; i++) {
				const marketReturn = (this.marketData[i].close - this.marketData[i - 1].close) / this.marketData[i - 1].close;
				marketReturns.push(marketReturn);
			}

			// Align returns (use shorter length)
			const minLength = Math.min(returns.length, marketReturns.length);
			const alignedReturns = returns.slice(-minLength);
			const alignedMarketReturns = marketReturns.slice(-minLength);

			const marketMean = alignedMarketReturns.reduce((a, b) => a + b, 0) / alignedMarketReturns.length;
			const stockMean = alignedReturns.reduce((a, b) => a + b, 0) / alignedReturns.length;

			// Calculate covariance and market variance
			let covariance = 0;
			let marketVariance = 0;
			for (let i = 0; i < minLength; i++) {
				covariance += (alignedReturns[i] - stockMean) * (alignedMarketReturns[i] - marketMean);
				marketVariance += Math.pow(alignedMarketReturns[i] - marketMean, 2);
			}
			covariance /= minLength;
			marketVariance /= minLength;

			beta = marketVariance > 0 ? covariance / marketVariance : null;
		}

		// Risk Score (0-100, higher = more risky)
		// Based on: volatility (40%), VaR (30%), beta (30%)
		let riskScore = 0;
		let riskFactors = [];

		// Volatility component (0-40 points)
		const volScore = Math.min(40, (historicalVolatility / 50) * 40); // 50% vol = 40 points
		riskScore += volScore;
		riskFactors.push({ name: 'Volatility', score: volScore, max: 40 });

		// VaR component (0-30 points)
		const varScore = Math.min(30, (var95 / 5) * 30); // 5% daily VaR = 30 points
		riskScore += varScore;
		riskFactors.push({ name: 'VaR', score: varScore, max: 30 });

		// Beta component (0-30 points)
		if (beta !== null) {
			// Beta > 1.5 = high risk (30 points), Beta < 0.5 = low risk (0 points)
			const betaScore = beta > 1 ? Math.min(30, (beta - 1) * 30) : Math.max(0, (beta - 0.5) * 20);
			riskScore += betaScore;
			riskFactors.push({ name: 'Beta', score: betaScore, max: 30 });
		} else {
			riskFactors.push({ name: 'Beta', score: 0, max: 30, note: 'N/A' });
		}

		riskScore = Math.min(100, Math.max(0, riskScore));

		return {
			var95,
			historicalVolatility,
			beta,
			riskScore,
			riskFactors
		};
	}

	renderRiskAnalysis(metrics) {
		if (!metrics) {
			this.shadowRoot.getElementById('risk-content').innerHTML = 
				'<div class="loading">Insufficient data for risk analysis (need at least 30 days)</div>';
			return;
		}

		const riskLevel = metrics.riskScore < 33 ? 'low' : metrics.riskScore < 66 ? 'medium' : 'high';
		const riskClass = `${riskLevel}-risk`;

		let html = `
			<div class="risk-metrics-grid">
				<div class="risk-card ${riskClass}">
					<div class="risk-label">Value at Risk (95%)</div>
					<div class="risk-value">${metrics.var95.toFixed(2)}%</div>
					<div class="risk-description">Maximum expected daily loss with 95% confidence</div>
				</div>
				<div class="risk-card ${riskClass}">
					<div class="risk-label">Historical Volatility</div>
					<div class="risk-value">${metrics.historicalVolatility.toFixed(2)}%</div>
					<div class="risk-description">Annualized price volatility (252 trading days)</div>
				</div>
				<div class="risk-card ${riskClass}">
					<div class="risk-label">Beta (vs. S&P 500)</div>
					<div class="risk-value">${metrics.beta !== null ? metrics.beta.toFixed(2) : 'N/A'}</div>
					<div class="risk-description">${metrics.beta !== null ? 
						(metrics.beta > 1 ? 'More volatile than market' : metrics.beta < 1 ? 'Less volatile than market' : 'Moves with market') : 
						'Market correlation data unavailable'}</div>
				</div>
			</div>
			<div class="risk-score-container">
				<div class="risk-score-label">Overall Risk Score</div>
				<div class="risk-score-value ${riskLevel}">${metrics.riskScore.toFixed(0)}</div>
				<div class="risk-score-interpretation">
					${riskLevel === 'low' ? 'Low Risk - Conservative investment' : 
					  riskLevel === 'medium' ? 'Medium Risk - Moderate volatility expected' : 
					  'High Risk - Significant volatility expected'}
				</div>
			</div>
		`;

		// Add comparison section if beta is available
		if (metrics.beta !== null) {
			const correlationLevel = metrics.beta > 1.2 ? 'High' : metrics.beta < 0.8 ? 'Low' : 'Moderate';
			const volatilityDiff = metrics.beta > 1 ? 
				`${((metrics.beta - 1) * 100).toFixed(0)}% higher` : 
				metrics.beta < 1 ? 
				`${((1 - metrics.beta) * 100).toFixed(0)}% lower` : 
				'Similar';
			
			html += `
				<div class="comparison-section">
					<div class="comparison-title">
						<span>📊</span>
						<span>Risk Comparison</span>
					</div>
					<div class="comparison-grid">
						<div class="comparison-item">
							<div class="comparison-label">Market Correlation</div>
							<div class="comparison-value">${correlationLevel}</div>
						</div>
						<div class="comparison-item">
							<div class="comparison-label">Volatility vs. Market</div>
							<div class="comparison-value">${volatilityDiff}</div>
						</div>
					</div>
				</div>
			`;
		}

		this.shadowRoot.getElementById('risk-content').innerHTML = html;
	}
}


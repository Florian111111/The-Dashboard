import { 
	computeSMA, 
	computeRSI, 
	computeEMA, 
	computeMACD, 
	computeBollingerBands,
	computeStochastic,
	computeWilliamsR
} from '../utils/indicators.js';

export class StockIndicators extends HTMLElement {
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
				this.loadIndicators();
			}
		}
	}
	
	connectedCallback() {
		this.symbol = this.getAttribute('symbol');
		this.timeframe = '1y'; // Default timeframe
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
				.panel-header {
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
				.indicators-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
					gap: 10px;
				}
				.indicator-tile {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 12px;
					text-align: center;
					transition: all 0.2s ease;
					position: relative;
					overflow: hidden;
				}
				:host(.light-mode) .indicator-tile {
					background: #c0c9d4;
					border-color: #a0aab8;
					cursor: pointer;
				}
				.indicator-tile:hover {
					transform: translateY(-2px);
					box-shadow: 0 4px 12px rgba(0,0,0,0.3);
				}
				.indicator-tile::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 3px;
					background: #1f2a37;
					transition: background 0.2s ease;
				}
				.indicator-tile.bullish::before { background: #10b981; }
				.indicator-tile.bearish::before { background: #ef4444; }
				.indicator-tile.neutral::before { background: #6b7280; }
				.indicator-name {
					font-size: 0.8rem;
					color: #9fb0c0;
					margin-bottom: 6px;
					font-weight: 500;
				}
				:host(.light-mode) .indicator-name {
					color: #2a2a2a;
				}
				.indicator-value {
					font-size: 1rem;
					color: #e6edf3;
					font-weight: 600;
					margin: 0;
				}
				:host(.light-mode) .indicator-value {
					color: #0a0a0a;
				}
				.indicator-status {
					font-size: 0.7rem;
					margin-top: 4px;
					opacity: 0.8;
				}
				.indicator-tile.bullish .indicator-status { color: #10b981; }
				.indicator-tile.bearish .indicator-status { color: #ef4444; }
				.indicator-tile.neutral .indicator-status { color: #6b7280; }
				.loading {
					color: #9fb0c0;
					text-align: center;
					padding: 20px;
				}
			</style>
			<div class="panel-header">
				<h3>Technical Indicators</h3>
				<div class="panel-info-icon" id="indicators-info-icon">i</div>
			</div>
			<div class="indicators-grid" id="indicators-grid">
				<div class="loading">Loading indicators...</div>
			</div>
			
			<!-- Info Modal -->
			<div class="panel-info-modal-overlay" id="indicators-info-modal-overlay">
				<div class="panel-info-modal">
					<div class="panel-info-modal-header">
						<div class="panel-info-modal-title">
							<span>ℹ️</span>
							<span>Technical Indicators</span>
						</div>
						<button class="panel-info-modal-close" id="indicators-info-modal-close">×</button>
					</div>
					<div class="panel-info-modal-content" id="indicators-info-modal-content">
						<!-- Content will be dynamically inserted -->
					</div>
				</div>
			</div>
		`;
		
		if (this.symbol) {
			this.loadIndicators();
		}
		
		// Listen for timeframe changes from stock-chart
		document.addEventListener('timeframe-changed', (e) => {
			if (e.detail && e.detail.symbol === this.symbol) {
				this.timeframe = e.detail.timeframe;
				this.loadIndicators();
			}
		});
		
		// Apply saved theme
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.classList.add('light-mode');
		}
		
		// Setup info icon
		this.setupInfoIcon();
	}
	
	setupInfoIcon() {
		const infoIcon = this.shadowRoot.getElementById('indicators-info-icon');
		const overlay = this.shadowRoot.getElementById('indicators-info-modal-overlay');
		const closeBtn = this.shadowRoot.getElementById('indicators-info-modal-close');
		const content = this.shadowRoot.getElementById('indicators-info-modal-content');
		
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
		const overlay = this.shadowRoot.getElementById('indicators-info-modal-overlay');
		const content = this.shadowRoot.getElementById('indicators-info-modal-content');
		
		if (!overlay || !content) return;
		
		content.innerHTML = `
			<h3>What are Technical Indicators?</h3>
			<p>Technical indicators are mathematical calculations based on price, volume, or open interest data. They help traders and investors identify potential buy and sell signals, trend direction, and market momentum.</p>
			
			<h3>Key Indicators Explained</h3>
			<ul>
				<li><strong>RSI (Relative Strength Index)</strong>: Measures the speed and magnitude of price changes. Values above 70 typically indicate overbought conditions (potential sell signal), while values below 30 indicate oversold conditions (potential buy signal).</li>
				<li><strong>MACD (Moving Average Convergence Divergence)</strong>: Shows the relationship between two moving averages. When MACD crosses above the signal line, it's a bullish signal. When it crosses below, it's bearish.</li>
				<li><strong>Bollinger Bands</strong>: Consist of a middle band (SMA) and two outer bands. When prices touch the upper band, the stock may be overbought. When they touch the lower band, it may be oversold.</li>
				<li><strong>Moving Averages (SMA/EMA)</strong>: Smooth out price data to identify trends. When price is above the moving average, it's generally bullish. When below, it's bearish. Crossovers between different period moving averages can signal trend changes.</li>
				<li><strong>Stochastic Oscillator</strong>: Compares closing price to the price range over a period. Values above 80 suggest overbought conditions, while values below 20 suggest oversold conditions.</li>
				<li><strong>Williams %R</strong>: Similar to Stochastic, measuring overbought/oversold conditions. Values above -20 indicate overbought, while values below -80 indicate oversold.</li>
			</ul>
			
			<h3>How to Use Technical Indicators</h3>
			<ul>
				<li><strong>Confirmation</strong>: Use multiple indicators together to confirm signals. For example, if RSI shows oversold conditions AND MACD shows a bullish crossover, it strengthens the buy signal.</li>
				<li><strong>Trend Following</strong>: Moving averages help identify and follow trends. Use longer periods (50, 200 days) for major trends.</li>
				<li><strong>Momentum</strong>: RSI and Stochastic help identify when a trend might be losing momentum or reversing.</li>
				<li><strong>Volatility</strong>: Bollinger Bands expand during high volatility and contract during low volatility, helping identify potential breakouts.</li>
			</ul>
			
			<h3>Understanding the Display</h3>
			<ul>
				<li><strong>Color Coding</strong>: Green (bullish) indicates positive signals, red (bearish) indicates negative signals, gray (neutral) indicates no clear signal.</li>
				<li><strong>Values</strong>: Each indicator shows its current calculated value, which you can compare to standard thresholds.</li>
				<li><strong>Status</strong>: The status text provides a quick interpretation of the indicator's signal.</li>
			</ul>
			
			<p><strong>Tip:</strong> No single indicator is perfect. Always use technical indicators in combination with fundamental analysis, market context, and risk management strategies. Past performance does not guarantee future results.</p>
		`;
		
		overlay.classList.add('show');
	}
	
	async loadIndicators() {
		try {
			const data = await this.fetchStockData(this.symbol);
			this.renderIndicators(data);
		} catch (error) {
			console.error('Error loading indicators:', error);
			this.shadowRoot.getElementById('indicators-grid').innerHTML = 
				'<div class="loading">Error loading indicators</div>';
		}
	}
	
	async fetchStockData(symbol) {
		// Map timeframe to Yahoo Finance range parameter
		const rangeMap = {
			'1d': '1d',
			'5d': '5d',
			'1w': '1wk',
			'1mo': '1mo',
			'3mo': '3mo',
			'6mo': '6mo',
			'1y': '1y',
			'2y': '2y',
			'5y': '5y',
			'10y': '10y',
			'max': 'max'
		};
		
		// Determine interval based on timeframe
		const intervalMap = {
			'1d': '1m',
			'5d': '5m',
			'1w': '15m',
			'1mo': '1d',
			'3mo': '1d',
			'6mo': '1d',
			'1y': '1d',
			'2y': '1d',
			'5y': '1wk',
			'10y': '1mo',
			'max': '1mo'
		};
		
		const range = rangeMap[this.timeframe] || '1y';
		const interval = intervalMap[this.timeframe] || '1d';
		
		const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
		
		// Always use CORS proxy (direct fetch will be blocked by CORS)
		const { fetchWithProxy } = await import('../utils/proxy.js');
		let data;
		try {
			data = await fetchWithProxy(yahooUrl);
		} catch (error) {
			console.error('Error fetching indicator data:', error);
			throw new Error('Failed to fetch data. Your browser may be blocking external requests.');
		}
		
		if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
			throw new Error('No data in response');
		}
		
		const result = data.chart.result[0];
		const timestamps = result.timestamp || [];
		const quotes = result.indicators?.quote?.[0] || {};
		const closes = quotes.close || [];
		const highs = quotes.high || [];
		const lows = quotes.low || [];
		
		const series = [];
		for (let i = 0; i < timestamps.length; i++) {
			if (closes[i] !== null && closes[i] !== undefined) {
				series.push({
					close: closes[i],
					high: highs[i] || closes[i],
					low: lows[i] || closes[i]
				});
			}
		}
		
		return series;
	}
	
	renderIndicators(series) {
		const closes = series.map(p => p.close);
		const highs = series.map(p => p.high);
		const lows = series.map(p => p.low);
		const currentPrice = closes[closes.length - 1];
		
		const indicators = this.calculateIndicators(closes, highs, lows, currentPrice);
		this.displayIndicators(indicators);
	}
	
	getIndicatorPeriods() {
		// Adjust indicator periods based on timeframe
		// Shorter timeframes need shorter periods, longer timeframes need longer periods
		const timeframe = this.timeframe || '1y';
		
		if (['1d', '5d'].includes(timeframe)) {
			// Very short timeframes: use very short periods
			return {
				sma1: 5,
				sma2: 10,
				ema: 8,
				rsi: 7,
				macdFast: 8,
				macdSlow: 17,
				macdSignal: 6,
				bb: 10,
				stoch: 7,
				williamsR: 7
			};
		} else if (['1w', '1mo'].includes(timeframe)) {
			// Short timeframes: use short periods
			return {
				sma1: 10,
				sma2: 20,
				ema: 10,
				rsi: 9,
				macdFast: 10,
				macdSlow: 21,
				macdSignal: 7,
				bb: 15,
				stoch: 9,
				williamsR: 9
			};
		} else if (['3mo', '6mo'].includes(timeframe)) {
			// Medium timeframes: use medium periods
			return {
				sma1: 20,
				sma2: 50,
				ema: 12,
				rsi: 14,
				macdFast: 12,
				macdSlow: 26,
				macdSignal: 9,
				bb: 20,
				stoch: 14,
				williamsR: 14
			};
		} else if (['1y', '2y'].includes(timeframe)) {
			// Standard timeframes: use standard periods
			return {
				sma1: 20,
				sma2: 50,
				ema: 12,
				rsi: 14,
				macdFast: 12,
				macdSlow: 26,
				macdSignal: 9,
				bb: 20,
				stoch: 14,
				williamsR: 14
			};
		} else {
			// Long timeframes (5y, 10y, max): use longer periods
			return {
				sma1: 50,
				sma2: 200,
				ema: 26,
				rsi: 14,
				macdFast: 12,
				macdSlow: 26,
				macdSignal: 9,
				bb: 20,
				stoch: 14,
				williamsR: 14
			};
		}
	}
	
	calculateIndicators(closes, highs, lows, currentPrice) {
		const periods = this.getIndicatorPeriods();
		
		// Ensure we have enough data points
		const maxPeriod = Math.max(periods.sma2, periods.macdSlow, periods.bb, periods.stoch);
		if (closes.length < maxPeriod) {
			// If not enough data, use available data with adjusted periods
			const availableData = closes.length;
			const adjustedPeriods = {
				sma1: Math.min(periods.sma1, Math.floor(availableData * 0.3)),
				sma2: Math.min(periods.sma2, Math.floor(availableData * 0.6)),
				ema: Math.min(periods.ema, Math.floor(availableData * 0.3)),
				rsi: Math.min(periods.rsi, Math.floor(availableData * 0.5)),
				macdFast: Math.min(periods.macdFast, Math.floor(availableData * 0.3)),
				macdSlow: Math.min(periods.macdSlow, Math.floor(availableData * 0.6)),
				macdSignal: Math.min(periods.macdSignal, Math.floor(availableData * 0.3)),
				bb: Math.min(periods.bb, Math.floor(availableData * 0.5)),
				stoch: Math.min(periods.stoch, Math.floor(availableData * 0.5)),
				williamsR: Math.min(periods.williamsR, Math.floor(availableData * 0.5))
			};
			
			// Use adjusted periods if original periods are too large
			if (adjustedPeriods.sma1 < 3) adjustedPeriods.sma1 = 3;
			if (adjustedPeriods.sma2 < 5) adjustedPeriods.sma2 = 5;
			if (adjustedPeriods.rsi < 5) adjustedPeriods.rsi = 5;
			
			Object.assign(periods, adjustedPeriods);
		}
		
		const sma1 = computeSMA(closes, periods.sma1).at(-1);
		const sma2 = computeSMA(closes, periods.sma2).at(-1);
		const ema = computeEMA(closes, periods.ema).at(-1);
		const rsi = computeRSI(closes, periods.rsi).at(-1);
		const macd = computeMACD(closes, periods.macdFast, periods.macdSlow, periods.macdSignal);
		const bb = computeBollingerBands(closes, periods.bb, 2);
		const stoch = computeStochastic(highs, lows, closes, periods.stoch, 3);
		const williamsR = computeWilliamsR(highs, lows, closes, periods.williamsR).at(-1);
		
		return [
			{ name: `SMA ${periods.sma1}`, value: sma1, status: this.getSMAStatus(currentPrice, sma1), formatted: sma1 ? sma1.toFixed(2) : '-' },
			{ name: `SMA ${periods.sma2}`, value: sma2, status: this.getSMAStatus(currentPrice, sma2), formatted: sma2 ? sma2.toFixed(2) : '-' },
			{ name: `EMA ${periods.ema}`, value: ema, status: this.getSMAStatus(currentPrice, ema), formatted: ema ? ema.toFixed(2) : '-' },
			{ name: `RSI ${periods.rsi}`, value: rsi, status: this.getRSIStatus(rsi, this.timeframe), formatted: rsi ? rsi.toFixed(1) : '-' },
			{ name: 'MACD', value: macd.macd.at(-1), status: this.getMACDStatus(macd), formatted: macd.macd.at(-1) ? macd.macd.at(-1).toFixed(3) : '-' },
			{ name: `Bollinger ${periods.bb}`, value: currentPrice, status: this.getBollingerStatus(currentPrice, bb), formatted: this.getBollingerPosition(currentPrice, bb) },
			{ name: `Stochastic ${periods.stoch}`, value: stoch.k.at(-1), status: this.getStochasticStatus(stoch.k.at(-1)), formatted: stoch.k.at(-1) ? stoch.k.at(-1).toFixed(1) : '-' },
			{ name: `Williams %R ${periods.williamsR}`, value: williamsR, status: this.getWilliamsRStatus(williamsR), formatted: williamsR ? williamsR.toFixed(1) : '-' }
		];
	}
	
	getSMAStatus(currentPrice, sma) {
		if (!currentPrice || !sma) return 'neutral';
		return currentPrice > sma ? 'bullish' : 'bearish';
	}
	
	getRSIStatus(rsi, timeframe) {
		if (!rsi) return 'neutral';
		
		// Adjust RSI thresholds based on timeframe
		// Shorter timeframes are more volatile, so use tighter thresholds
		// Longer timeframes are less volatile, so use standard thresholds
		const timeframe_short = timeframe || this.timeframe || '1y';
		
		if (['1d', '5d', '1w'].includes(timeframe_short)) {
			// Very short timeframes: tighter thresholds (more sensitive)
			if (rsi > 75) return 'bearish';
			if (rsi < 25) return 'bullish';
		} else if (['1mo', '3mo'].includes(timeframe_short)) {
			// Short timeframes: slightly tighter thresholds
			if (rsi > 72) return 'bearish';
			if (rsi < 28) return 'bullish';
		} else {
			// Standard timeframes: standard thresholds
			if (rsi > 70) return 'bearish';
			if (rsi < 30) return 'bullish';
		}
		
		return 'neutral';
	}
	
	getMACDStatus(macd) {
		const macdValue = macd.macd.at(-1);
		const signalValue = macd.signal.at(-1);
		if (!macdValue || !signalValue) return 'neutral';
		return macdValue > signalValue ? 'bullish' : 'bearish';
	}
	
	getBollingerStatus(currentPrice, bb) {
		const upper = bb.upper.at(-1);
		const lower = bb.lower.at(-1);
		if (!currentPrice || !upper || !lower) return 'neutral';
		if (currentPrice > upper) return 'bearish';
		if (currentPrice < lower) return 'bullish';
		return 'neutral';
	}
	
	getBollingerPosition(currentPrice, bb) {
		const upper = bb.upper.at(-1);
		const lower = bb.lower.at(-1);
		if (!currentPrice || !upper || !lower) return '-';
		if (currentPrice > upper) return 'Above';
		if (currentPrice < lower) return 'Below';
		return 'Middle';
	}
	
	getStochasticStatus(stochK) {
		if (!stochK) return 'neutral';
		
		// Adjust thresholds based on timeframe
		const timeframe_short = this.timeframe || '1y';
		
		if (['1d', '5d', '1w'].includes(timeframe_short)) {
			// Very short timeframes: tighter thresholds
			if (stochK > 85) return 'bearish';
			if (stochK < 15) return 'bullish';
		} else {
			// Standard thresholds
			if (stochK > 80) return 'bearish';
			if (stochK < 20) return 'bullish';
		}
		
		return 'neutral';
	}
	
	getWilliamsRStatus(williamsR) {
		if (!williamsR) return 'neutral';
		
		// Adjust thresholds based on timeframe
		const timeframe_short = this.timeframe || '1y';
		
		if (['1d', '5d', '1w'].includes(timeframe_short)) {
			// Very short timeframes: tighter thresholds
			if (williamsR > -15) return 'bearish';
			if (williamsR < -85) return 'bullish';
		} else {
			// Standard thresholds
			if (williamsR > -20) return 'bearish';
			if (williamsR < -80) return 'bullish';
		}
		
		return 'neutral';
	}
	
	displayIndicators(indicators) {
		const grid = this.shadowRoot.getElementById('indicators-grid');
		grid.innerHTML = indicators.map(indicator => `
			<div class="indicator-tile ${indicator.status}">
				<div class="indicator-name">${indicator.name}</div>
				<div class="indicator-value">${indicator.formatted}</div>
				<div class="indicator-status">${this.getStatusText(indicator.status)}</div>
			</div>
		`).join('');
	}
	
	getStatusText(status) {
		switch(status) {
			case 'bullish': return 'Bullish';
			case 'bearish': return 'Bearish';
			default: return 'Neutral';
		}
	}
}

customElements.define('stock-indicators', StockIndicators);


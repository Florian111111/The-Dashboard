import { 
	computeSMA, 
	computeRSI, 
	computeEMA, 
	computeMACD, 
	computeBollingerBands,
	computeStochastic,
	computeWilliamsR
} from '../utils/indicators.js';

export class IndicatorsPanel extends HTMLElement{
	constructor(){super();this.attachShadow({mode:'open'});}
	connectedCallback(){
		this.shadowRoot.innerHTML = `
			<style>
				h3{margin:0 0 12px 0}
				.indicators-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:0}
				.indicator-tile{
					background:var(--panel);border:1px solid var(--border);border-radius:8px;
					padding:8px;text-align:center;transition:all 0.2s ease;
					position:relative;overflow:hidden;
				}
				.indicator-tile::before{
					content:'';position:absolute;top:0;left:0;right:0;height:3px;
					background:var(--border);transition:background 0.2s ease;
				}
				.indicator-tile.bullish::before{background:#10b981}
				.indicator-tile.bearish::before{background:#ef4444}
				.indicator-tile.neutral::before{background:#6b7280}
				.indicator-name{font-size:0.8rem;color:#9fb0c0;margin-bottom:4px;font-weight:500}
				.indicator-value{font-size:1rem;color:#e6edf3;font-weight:600;margin:0}
				.indicator-status{font-size:0.7rem;margin-top:2px;opacity:0.8}
				.indicator-tile.bullish .indicator-status{color:#10b981}
				.indicator-tile.bearish .indicator-status{color:#ef4444}
				.indicator-tile.neutral .indicator-status{color:#6b7280}
			</style>
			<h3>Technical Indicators</h3>
			<div class="indicators-grid" id="indicators-grid">
				<!-- Indicators will be populated here - v2 -->
			</div>
		`;
		document.addEventListener('price-series-loaded',(e)=>{
			const series = e.detail?.series || [];
			if(series.length){ this.#render(series); }
		});
	}
	
	#render(series){
		const closes = series.map(p=>p.close);
		const currentPrice = closes[closes.length - 1];
		
		// Für Indikatoren die High/Low brauchen, verwenden wir Close als Approximation
		const highs = closes.map(c => c * 1.02); // +2% als High-Approximation
		const lows = closes.map(c => c * 0.98);  // -2% als Low-Approximation
		
		const indicators = this.#calculateIndicators(closes, highs, lows, currentPrice);
		this.#renderIndicators(indicators);
	}
	
	#calculateIndicators(closes, highs, lows, currentPrice){
		const sma20 = computeSMA(closes, 20).at(-1);
		const sma50 = computeSMA(closes, 50).at(-1);
		const ema12 = computeEMA(closes, 12).at(-1);
		const rsi14 = computeRSI(closes, 14).at(-1);
		const macd = computeMACD(closes, 12, 26, 9);
		const bb = computeBollingerBands(closes, 20, 2);
		const stoch = computeStochastic(highs, lows, closes, 14, 3);
		const williamsR = computeWilliamsR(highs, lows, closes, 14).at(-1);
		
		return [
			{
				name: 'SMA 20',
				value: sma20,
				status: this.#getSMAStatus(currentPrice, sma20),
				formatted: sma20 ? sma20.toFixed(2) : '-'
			},
			{
				name: 'SMA 50',
				value: sma50,
				status: this.#getSMAStatus(currentPrice, sma50),
				formatted: sma50 ? sma50.toFixed(2) : '-'
			},
			{
				name: 'EMA 12',
				value: ema12,
				status: this.#getSMAStatus(currentPrice, ema12),
				formatted: ema12 ? ema12.toFixed(2) : '-'
			},
			{
				name: 'RSI 14',
				value: rsi14,
				status: this.#getRSIStatus(rsi14),
				formatted: rsi14 ? rsi14.toFixed(1) : '-'
			},
			{
				name: 'MACD',
				value: macd.macd.at(-1),
				status: this.#getMACDStatus(macd),
				formatted: macd.macd.at(-1) ? macd.macd.at(-1).toFixed(3) : '-'
			},
			{
				name: 'Bollinger',
				value: currentPrice,
				status: this.#getBollingerStatus(currentPrice, bb),
				formatted: this.#getBollingerPosition(currentPrice, bb)
			},
			{
				name: 'Stochastic',
				value: stoch.k.at(-1),
				status: this.#getStochasticStatus(stoch.k.at(-1)),
				formatted: stoch.k.at(-1) ? stoch.k.at(-1).toFixed(1) : '-'
			},
			{
				name: 'Williams %R',
				value: williamsR,
				status: this.#getWilliamsRStatus(williamsR),
				formatted: williamsR ? williamsR.toFixed(1) : '-'
			}
		];
	}
	
	#getSMAStatus(currentPrice, sma){
		if(!currentPrice || !sma) return 'neutral';
		return currentPrice > sma ? 'bullish' : 'bearish';
	}
	
	#getRSIStatus(rsi){
		if(!rsi) return 'neutral';
		if(rsi > 70) return 'bearish'; // Overbought
		if(rsi < 30) return 'bullish'; // Oversold
		return 'neutral';
	}
	
	#getMACDStatus(macd){
		const macdValue = macd.macd.at(-1);
		const signalValue = macd.signal.at(-1);
		if(!macdValue || !signalValue) return 'neutral';
		return macdValue > signalValue ? 'bullish' : 'bearish';
	}
	
	#getBollingerStatus(currentPrice, bb){
		const upper = bb.upper.at(-1);
		const lower = bb.lower.at(-1);
		if(!currentPrice || !upper || !lower) return 'neutral';
		if(currentPrice > upper) return 'bearish'; // Overbought
		if(currentPrice < lower) return 'bullish'; // Oversold
		return 'neutral';
	}
	
	#getBollingerPosition(currentPrice, bb){
		const upper = bb.upper.at(-1);
		const lower = bb.lower.at(-1);
		if(!currentPrice || !upper || !lower) return '-';
		if(currentPrice > upper) return 'Above';
		if(currentPrice < lower) return 'Below';
		return 'Middle';
	}
	
	#getStochasticStatus(stochK){
		if(!stochK) return 'neutral';
		if(stochK > 80) return 'bearish'; // Overbought
		if(stochK < 20) return 'bullish'; // Oversold
		return 'neutral';
	}
	
	#getWilliamsRStatus(williamsR){
		if(!williamsR) return 'neutral';
		if(williamsR > -20) return 'bearish'; // Overbought
		if(williamsR < -80) return 'bullish'; // Oversold
		return 'neutral';
	}
	
	#renderIndicators(indicators){
		const grid = this.shadowRoot.getElementById('indicators-grid');
		grid.innerHTML = indicators.map(indicator => `
			<div class="indicator-tile ${indicator.status}">
				<div class="indicator-name">${indicator.name}</div>
				<div class="indicator-value">${indicator.formatted}</div>
				<div class="indicator-status">${this.#getStatusText(indicator.status)}</div>
			</div>
		`).join('');
	}
	
	#getStatusText(status){
		switch(status){
			case 'bullish': return 'Bullish';
			case 'bearish': return 'Bearish';
			default: return 'Neutral';
		}
	}
}

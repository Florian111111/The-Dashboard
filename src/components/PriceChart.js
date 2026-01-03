import { getLocal, getStorageKeys } from '../utils/storage.js';

const memoryCache = new Map();

export class PriceChart extends HTMLElement{
	constructor(){super();this.attachShadow({mode:'open'});this.chart=null;this.symbol=null;}
	connectedCallback(){
		this.shadowRoot.innerHTML = `
			<style>
				h3{margin:0 0 8px 0}
				.controls{display:flex;gap:8px;align-items:center;margin-bottom:8px}
				.tabs{display:flex;gap:4px;margin-bottom:8px}
				.tab{background:#233044;border:1px solid #1f2a37;color:#9fb0c0;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:.9rem;transition:all 0.2s}
				.tab.active{background:#4ea1f3;color:#0b0f14;border-color:#4ea1f3;font-weight:600}
				.tab:hover:not(.active){background:#1f2a37;color:#e6edf3}
				select{background:#0b0f14;border:1px solid #1f2a37;color:#e6edf3;border-radius:6px;padding:4px 8px;font-size:.9rem}
				.chart-container{position:relative;width:100%;height:280px;overflow:hidden;border:1px solid #1f2a37;border-radius:8px}
				canvas{width:100%;height:100%;display:block}
				.status{color:#9fb0c0;font-size:.9rem}
				.error{color:#fca5a5}
			</style>
			<h3>Price</h3>
			<div class="tabs">
				<div class="tab active" data-mode="absolute">Absolut</div>
				<div class="tab" data-mode="percentage">Prozentual</div>
			</div>
			<div class="controls">
				<select id="timeframe">
					<option value="1D">1 Tag</option>
					<option value="1W">1 Woche</option>
					<option value="2W">2 Wochen</option>
					<option value="1M">1 Monat</option>
					<option value="3M">3 Monate</option>
					<option value="6M">6 Monate</option>
					<option value="1Y" selected>1 Jahr</option>
					<option value="2Y">2 Jahre</option>
					<option value="5Y">5 Jahre</option>
				</select>
			</div>
			<div class="status" id="status">Waiting for symbol…</div>
			<div class="chart-container">
				<canvas id="canvas"></canvas>
			</div>
		`;
		const { LAST_SYMBOL } = getStorageKeys();
		const last = getLocal(LAST_SYMBOL, 'AAPL');
		this.loadSymbol(last);
		
		// Event listener für Zeitraum-Auswahl
		this.shadowRoot.getElementById('timeframe')?.addEventListener('change', (e) => {
			if(this.symbol) {
				this.loadSymbol(this.symbol);
			}
		});
		
		// Event listener für Tab-Auswahl
		this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
			tab.addEventListener('click', (e) => {
				// Alle Tabs deaktivieren
				this.shadowRoot.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
				// Aktiven Tab aktivieren
				e.target.classList.add('active');
				// Chart neu rendern
				if(this.symbol && this.currentSeries) {
					this.#renderChart(this.symbol, this.currentSeries);
				}
			});
		});
		
		document.addEventListener('symbol-selected',(e)=>{
			const s = e.detail?.symbol; if(s) this.loadSymbol(s);
		});
	}
	async loadSymbol(symbol){
		this.symbol = symbol;
		this.#setStatus(`Loading ${symbol}…`);
		try{
			const timeframe = this.shadowRoot.getElementById('timeframe')?.value || '1Y';
			const series = await this.#fetchDailySeries(symbol, timeframe);
			this.currentSeries = series; // Speichere die Serie für Tab-Wechsel
			// Small delay to ensure DOM is ready
			setTimeout(() => {
				this.#renderChart(symbol, series);
				this.#setStatus('');
				document.dispatchEvent(new CustomEvent('price-series-loaded',{detail:{symbol, series}}));
			}, 100);
		}catch(err){
			console.error(err);
			this.#setStatus('Could not load prices. Try adding an API key or retry.', true);
		}
	}
	async #fetchDailySeries(symbol, timeframe = '1Y'){
		const cacheKey = `${symbol}_${timeframe}`;
		if(memoryCache.has(cacheKey)) return memoryCache.get(cacheKey);
		
		// Alpha Vantage API key is not configured - use mock data
		// API keys are now handled server-side only
		const mock = this.#mockSeries(timeframe);
		memoryCache.set(cacheKey, mock);
		return mock;
		
		// Für kurze Zeiträume verwende intraday-Daten
		if(this.#isIntradayTimeframe(timeframe)){
			return await this.#fetchIntradaySeries(symbol, timeframe, key, cacheKey);
		}
		
		// Für längere Zeiträume verwende tägliche Daten
		const outputsize = this.#getOutputSize(timeframe);
		const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(symbol)}&outputsize=${outputsize}&apikey=${encodeURIComponent(key)}`;
		const res = await fetch(url);
		if(!res.ok) throw new Error('Network error');
		const data = await res.json();
		if(data['Error Message'] || data['Note']) throw new Error('API limit or error');
		const ts = data['Time Series (Daily)'] || {};
		const entries = Object.entries(ts).map(([date, o])=>({date, close: Number(o['5. adjusted close']||o['4. close'])}));
		entries.sort((a,b)=>new Date(a.date)-new Date(b.date));
		
		// Filtere Daten basierend auf Zeitraum
		const filtered = this.#filterByTimeframe(entries, timeframe);
		memoryCache.set(cacheKey, filtered);
		return filtered;
	}
	#isIntradayTimeframe(timeframe){
		return ['1D', '1W', '2W'].includes(timeframe);
	}
	
	async #fetchIntradaySeries(symbol, timeframe, key, cacheKey){
		// Bestimme das Intervall basierend auf Zeitraum
		const interval = this.#getIntradayInterval(timeframe);
		const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=compact&apikey=${encodeURIComponent(key)}`;
		
		const res = await fetch(url);
		if(!res.ok) throw new Error('Network error');
		const data = await res.json();
		if(data['Error Message'] || data['Note']) throw new Error('API limit or error');
		
		const tsKey = `Time Series (${interval})`;
		const ts = data[tsKey] || {};
		const entries = Object.entries(ts).map(([datetime, o])=>({
			date: datetime,
			close: Number(o['4. close'])
		}));
		entries.sort((a,b)=>new Date(a.date)-new Date(b.date));
		
		// Filtere Daten basierend auf Zeitraum
		const filtered = this.#filterIntradayByTimeframe(entries, timeframe);
		memoryCache.set(cacheKey, filtered);
		return filtered;
	}
	
	#getIntradayInterval(timeframe){
		switch(timeframe){
			case '1D': return '1min';  // 1-Minuten-Intervalle für 1 Tag
			case '1W': return '5min';  // 5-Minuten-Intervalle für 1 Woche
			case '2W': return '15min'; // 15-Minuten-Intervalle für 2 Wochen
			default: return '5min';
		}
	}
	
	#filterIntradayByTimeframe(entries, timeframe){
		const now = new Date();
		const cutoff = new Date();
		
		switch(timeframe){
			case '1D': cutoff.setDate(now.getDate() - 1); break;
			case '1W': cutoff.setDate(now.getDate() - 7); break;
			case '2W': cutoff.setDate(now.getDate() - 14); break;
			default: cutoff.setDate(now.getDate() - 1); break;
		}
		
		return entries.filter(entry => new Date(entry.date) >= cutoff);
	}
	
	#getOutputSize(timeframe){
		// Alpha Vantage: compact = ~100 Tage, full = ~20 Jahre
		return ['5Y'].includes(timeframe) ? 'full' : 'compact';
	}
	
	#filterByTimeframe(entries, timeframe){
		const now = new Date();
		const cutoff = new Date();
		
		switch(timeframe){
			case '1D': cutoff.setDate(now.getDate() - 1); break;
			case '1W': cutoff.setDate(now.getDate() - 7); break;
			case '2W': cutoff.setDate(now.getDate() - 14); break;
			case '1M': cutoff.setMonth(now.getMonth() - 1); break;
			case '3M': cutoff.setMonth(now.getMonth() - 3); break;
			case '6M': cutoff.setMonth(now.getMonth() - 6); break;
			case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
			case '2Y': cutoff.setFullYear(now.getFullYear() - 2); break;
			case '5Y': cutoff.setFullYear(now.getFullYear() - 5); break;
			default: cutoff.setFullYear(now.getFullYear() - 1); break;
		}
		
		return entries.filter(entry => new Date(entry.date) >= cutoff);
	}
	
	#mockSeries(timeframe = '1Y'){
		if(this.#isIntradayTimeframe(timeframe)){
			return this.#mockIntradaySeries(timeframe);
		}
		
		const days = this.#getDaysForTimeframe(timeframe);
		const out=[]; const now=new Date(); let price=100;
		for(let i=days;i>=0;i--){
			const d=new Date(now); d.setDate(now.getDate()-i);
			price += (Math.random()-0.5)*2;
			out.push({date:d.toISOString().slice(0,10), close: Math.max(10, Math.round(price*100)/100)});
		}
		return out;
	}
	
	#mockIntradaySeries(timeframe){
		const interval = this.#getIntradayInterval(timeframe);
		const minutes = this.#getMinutesForInterval(interval);
		const totalMinutes = this.#getTotalMinutesForTimeframe(timeframe);
		const dataPoints = Math.floor(totalMinutes / minutes);
		
		const out=[]; const now=new Date(); let price=100;
		for(let i=dataPoints;i>=0;i--){
			const d=new Date(now.getTime() - (i * minutes * 60000));
			price += (Math.random()-0.5)*0.5; // Kleinere Schwankungen für intraday
			out.push({
				date: d.toISOString().slice(0,19).replace('T', ' '),
				close: Math.max(10, Math.round(price*100)/100)
			});
		}
		return out;
	}
	
	#getMinutesForInterval(interval){
		switch(interval){
			case '1min': return 1;
			case '5min': return 5;
			case '15min': return 15;
			default: return 5;
		}
	}
	
	#getTotalMinutesForTimeframe(timeframe){
		switch(timeframe){
			case '1D': return 24 * 60; // 1 Tag = 1440 Minuten
			case '1W': return 7 * 24 * 60; // 1 Woche = 10080 Minuten
			case '2W': return 14 * 24 * 60; // 2 Wochen = 20160 Minuten
			default: return 24 * 60;
		}
	}
	
	#getDaysForTimeframe(timeframe){
		switch(timeframe){
			case '1D': return 1;
			case '1W': return 7;
			case '2W': return 14;
			case '1M': return 30;
			case '3M': return 90;
			case '6M': return 180;
			case '1Y': return 365;
			case '2Y': return 730;
			case '5Y': return 1825;
			default: return 365;
		}
	}
	#renderChart(symbol, series){
		const canvas = this.shadowRoot.getElementById('canvas');
		const ctx = canvas.getContext('2d');
		const labels = series.map(p=>p.date);
		
		// Bestimme den aktiven Modus
		const activeTab = this.shadowRoot.querySelector('.tab.active');
		const mode = activeTab?.dataset.mode || 'absolute';
		
		let data, label, yAxisLabel;
		if(mode === 'percentage'){
			// Berechne prozentuale Änderung vom ersten Wert
			const firstPrice = series[0]?.close || 1;
			data = series.map(p => ((p.close - firstPrice) / firstPrice) * 100);
			label = `${symbol} % Change`;
			yAxisLabel = 'Prozentuale Änderung (%)';
		} else {
			// Absolute Preise
			data = series.map(p=>p.close);
			label = `${symbol} Close`;
			yAxisLabel = 'Preis ($)';
		}
		
		if(this.chart){this.chart.destroy();}
		
		// Get device pixel ratio for crisp rendering
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		
		// Use fallback dimensions if getBoundingClientRect returns 0
		const width = rect.width > 0 ? rect.width : 400;
		const height = rect.height > 0 ? rect.height : 280;
		
		// Set actual canvas size in memory (scaled to account for extra pixel density)
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		
		// Scale the drawing context so everything will work at the higher ratio
		ctx.scale(dpr, dpr);
		
		// Set display size (css pixels)
		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';
		
		this.chart = new window.Chart(ctx,{
			type:'line',
			data:{labels,datasets:[{label,data,borderColor:'#4ea1f3',backgroundColor:'rgba(78,161,243,0.15)',tension:0.1,pointRadius:0,borderWidth:2}]},
			options:{
				maintainAspectRatio:false,
				responsive:true,
				interaction:{intersect:false},
				layout:{padding:{top:10,bottom:10,left:10,right:10}},
				scales:{
					x:{ticks:{color:'#9fb0c0'}, grid:{color:'rgba(255,255,255,0.06)'}}, 
					y:{
						ticks:{color:'#9fb0c0'}, 
						grid:{color:'rgba(255,255,255,0.06)'},
						title:{display:true, text:yAxisLabel, color:'#9fb0c0', font:{size:12}}
					}
				},
				plugins:{legend:{labels:{color:'#e6edf3'}}}
			}
		});
	}
	#setStatus(msg, isError=false){
		const el = this.shadowRoot.getElementById('status');
		el.textContent = msg;
		el.className = isError ? 'status error' : 'status';
		el.style.display = msg ? 'block' : 'none';
	}
}

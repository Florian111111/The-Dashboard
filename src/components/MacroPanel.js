import { getLocal, getStorageKeys } from '../utils/storage.js';

async function fetchFredSeries(seriesId, apiKey){
	const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(apiKey)}&file_type=json&observation_start=2015-01-01`;
	try {
		const res = await fetch(url);
		if(!res.ok) throw new Error('net');
		const data = await res.json();
		const obs = data.observations || [];
		const last = [...obs].reverse().find(o=>o.value !== '.' && o.value !== '');
		return last ? {date:last.date, value:Number(last.value)} : null;
	} catch(error) {
		// CORS error or network issue
		console.warn(`FRED API CORS error for ${seriesId}:`, error.message);
		throw new Error('CORS_BLOCKED');
	}
}

export class MacroPanel extends HTMLElement{
	constructor(){super();this.attachShadow({mode:'open'});}
	connectedCallback(){
		this.shadowRoot.innerHTML = `
			<style>
				h3{margin:0 0 8px 0}
				.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
				.card{background:#0b0f14;border:1px solid #1f2a37;border-radius:8px;padding:8px}
				.label{color:#9fb0c0;font-size:.85rem}
				.value{font-weight:700}
				.hint{color:#9fb0c0}
			</style>
			<h3>Macro Indicators</h3>
			<div class="grid">
				<div class="card"><div class="label">CPI (YoY) CPIAUCSL</div><div id="cpi" class="value">-</div></div>
				<div class="card"><div class="label">Unemployment Rate UNRATE</div><div id="ur" class="value">-</div></div>
			</div>
			<div id="hint" class="hint" style="display:none">Add a FRED key in Settings to load macro data.</div>
		`;
		this.load();
	}
	async load(){
		const key = getLocal(getStorageKeys().FRED_KEY,'');
		if(!key){ this.#showHint(); return; }
		this.#hideHint();
		try{
			const [cpi, ur] = await Promise.all([
				fetchFredSeries('CPIAUCSL', key),
				fetchFredSeries('UNRATE', key)
			]);
			this.shadowRoot.getElementById('cpi').textContent = cpi ? `${cpi.value.toFixed(2)} (${cpi.date})` : 'n/a';
			this.shadowRoot.getElementById('ur').textContent = ur ? `${ur.value.toFixed(2)} (${ur.date})` : 'n/a';
		}catch(e){
			if(e.message === 'CORS_BLOCKED'){
				this.shadowRoot.getElementById('cpi').textContent = 'CORS blocked';
				this.shadowRoot.getElementById('ur').textContent = 'CORS blocked';
				this.shadowRoot.getElementById('hint').style.display = 'block';
				this.shadowRoot.getElementById('hint').textContent = 'FRED API blocked by CORS. Use a CORS proxy or server-side fetch.';
			} else {
				this.shadowRoot.getElementById('cpi').textContent = 'n/a';
				this.shadowRoot.getElementById('ur').textContent = 'n/a';
			}
		}
	}
	#showHint(){ this.shadowRoot.getElementById('hint').style.display='block'; }
	#hideHint(){ this.shadowRoot.getElementById('hint').style.display='none'; }
}

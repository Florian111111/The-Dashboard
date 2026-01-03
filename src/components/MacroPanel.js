import { fetchFredWithProxy } from '../utils/proxy.js';

async function fetchFredSeries(seriesId) {
	try {
		// Use backend proxy - API key is read from .env on the server
		const data = await fetchFredWithProxy(seriesId, { observation_start: '2015-01-01' });
		const obs = data.observations || [];
		const last = [...obs].reverse().find(o => o.value !== '.' && o.value !== '');
		return last ? { date: last.date, value: Number(last.value) } : null;
	} catch (error) {
		console.warn(`FRED API error for ${seriesId}:`, error.message);
		throw error;
	}
}

export class MacroPanel extends HTMLElement {
	constructor() { super(); this.attachShadow({ mode: 'open' }); }
	connectedCallback() {
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
	async load() {
		try {
			const [cpi, ur] = await Promise.all([
				fetchFredSeries('CPIAUCSL'),
				fetchFredSeries('UNRATE')
			]);
			this.shadowRoot.getElementById('cpi').textContent = cpi ? `${cpi.value.toFixed(2)} (${cpi.date})` : 'n/a';
			this.shadowRoot.getElementById('ur').textContent = ur ? `${ur.value.toFixed(2)} (${ur.date})` : 'n/a';
			this.shadowRoot.getElementById('hint').style.display = 'none';
		} catch (e) {
			console.error('Error loading macro data:', e);
			this.shadowRoot.getElementById('cpi').textContent = 'n/a';
			this.shadowRoot.getElementById('ur').textContent = 'n/a';
			this.shadowRoot.getElementById('hint').textContent = 'Unable to load macro data';
			this.shadowRoot.getElementById('hint').style.display = 'block';
		}
	}
}

import { getLocal, getStorageKeys } from '../utils/storage.js';

export class FundamentalsPanel extends HTMLElement{
	constructor(){super();this.attachShadow({mode:'open'});}
	connectedCallback(){
		this.shadowRoot.innerHTML = `
			<style>
				h3{margin:0 0 8px 0}
				.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
				.item{background:#0b0f14;border:1px solid #1f2a37;border-radius:8px;padding:8px}
				.label{color:#9fb0c0;font-size:.85rem}
				.value{font-weight:600}
				.hint{color:#9fb0c0}
			</style>
			<h3>Fundamentals</h3>
			<div id="content" class="grid"></div>
			<div id="hint" class="hint" style="display:none">Fundamentals data is not available.</div>
		`;
		document.addEventListener('symbol-selected',(e)=>{
			const s = e.detail?.symbol; if(s) this.load(s);
		});
		// initial
		const sym = getLocal(getStorageKeys().LAST_SYMBOL,'AAPL');
		this.load(sym);
	}
	async load(symbol){
		// Alpha Vantage API is not configured - show hint
		// API keys are now handled server-side only
		this.#showHint();
	}
	#render(kv){
		const content = this.shadowRoot.getElementById('content');
		content.innerHTML = '';
		const entries = Object.entries(kv).filter(([,v])=>v!=null && v!=='');
		if(!entries.length){ content.textContent = 'No data'; return; }
		for(const [label,value] of entries){
			const div = document.createElement('div');
			div.className='item';
			div.innerHTML = `<div class="label">${label}</div><div class="value">${value}</div>`;
			content.appendChild(div);
		}
	}
	#showHint(){ this.shadowRoot.getElementById('hint').style.display='block'; this.#render({}); }
	#hideHint(){ this.shadowRoot.getElementById('hint').style.display='none'; }
}

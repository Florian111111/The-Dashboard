import { getLocal, setLocal, getStorageKeys } from '../utils/storage.js';

function keyFor(section, symbol){ return `swot:${symbol}:${section}`; }

export class SwotPanel extends HTMLElement{
	constructor(){super();this.attachShadow({mode:'open'});} 
	connectedCallback(){
		const sym = getLocal(getStorageKeys().LAST_SYMBOL,'AAPL');
		this.shadowRoot.innerHTML = `
			<style>
				h3{margin:0 0 8px 0}
				.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
				.box{display:flex;flex-direction:column;background:#0b0f14;border:1px solid #1f2a37;border-radius:8px;min-height:160px}
				.box h4{margin:8px 8px 0 8px}
				textarea{flex:1;margin:8px;background:transparent;border:none;color:#e6edf3;resize:vertical;min-height:100px}
				textarea:focus{outline:none}
				@media (max-width: 900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
			</style>
			<h3>SWOT Analysis</h3>
			<div class="grid">
				<div class="box"><h4>Strengths</h4><textarea id="strengths" placeholder="Bullet thoughts…"></textarea></div>
				<div class="box"><h4>Weaknesses</h4><textarea id="weaknesses" placeholder="Risks…"></textarea></div>
				<div class="box"><h4>Opportunities</h4><textarea id="opportunities" placeholder="Growth drivers…"></textarea></div>
				<div class="box"><h4>Threats</h4><textarea id="threats" placeholder="Competition, regulation…"></textarea></div>
			</div>
		`;
		this.#load(sym);
		document.addEventListener('symbol-selected',(e)=>{
			const s = e.detail?.symbol; if(s) this.#load(s);
		});
	}
	#load(symbol){
		['strengths','weaknesses','opportunities','threats'].forEach(id=>{
			const area = this.shadowRoot.getElementById(id);
			area.value = getLocal(keyFor(id, symbol), '');
			area.oninput = ()=> setLocal(keyFor(id, symbol), area.value);
		});
	}
}

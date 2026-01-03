import { getLocal, setLocal, getStorageKeys } from '../utils/storage.js';

export class SearchBar extends HTMLElement{
	constructor(){super();this.attachShadow({mode:'open'});}
	connectedCallback(){
		const { LAST_SYMBOL } = getStorageKeys();
		const last = getLocal(LAST_SYMBOL, 'AAPL');
		this.shadowRoot.innerHTML = `
			<style>
				.wrap{display:flex;gap:8px;align-items:center}
				input{flex:1;min-width:200px;background:#0b0f14;border:1px solid #1f2a37;color:#e6edf3;border-radius:8px;padding:8px}
				button{background:#4ea1f3;color:#0b0f14;border:1px solid #4ea1f3;border-radius:8px;padding:8px 12px;font-weight:600;cursor:pointer}
			</style>
			<div class="wrap">
				<input id="sym" placeholder="Search ticker (e.g., AAPL, MSFT)" value="${last}" maxlength="10"/>
				<button id="go">Load</button>
			</div>
		`;
		this.shadowRoot.getElementById('go')?.addEventListener('click',()=>this.#submit());
		this.shadowRoot.getElementById('sym')?.addEventListener('keydown',(e)=>{if(e.key==='Enter') this.#submit();});
	}
	#submit(){
		const input = this.shadowRoot.getElementById('sym');
		const raw = String(input.value || '').toUpperCase().trim();
		if(!/^[A-Z.]{1,10}$/.test(raw)){
			input.focus();
			return;
		}
		setLocal(getStorageKeys().LAST_SYMBOL, raw);
		this.dispatchEvent(new CustomEvent('symbol-selected',{bubbles:true,composed:true,detail:{symbol:raw}}));
	}
}

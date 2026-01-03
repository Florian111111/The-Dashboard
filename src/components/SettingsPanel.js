import { getLocal, setLocal, getStorageKeys } from '../utils/storage.js';

export class SettingsPanel extends HTMLElement{
	constructor(){
		super();
		this.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(0,0,0,0.5);
			display: none;
			z-index: 1000;
			align-items: center;
			justify-content: center;
		`;
	}
	connectedCallback(){
		const keys = getStorageKeys();
		const alpha = getLocal(keys.ALPHA_VANTAGE_KEY, '');
		const fred = getLocal(keys.FRED_KEY, '');
		
		this.innerHTML = `
			<div style="
				background: #121821;
				border: 1px solid #1f2a37;
				border-radius: 10px;
				width: min(560px, 92vw);
				padding: 16px;
				color: #e6edf3;
				font-family: inherit;
			">
				<h3 style="margin: 0 0 8px 0;">Settings</h3>
				<p style="margin: 0 0 12px 0; color: #9fb0c0; font-size: 0.9rem;">Store API keys locally in this browser.</p>
				<div style="display: flex; gap: 8px; align-items: center; margin: 8px 0;">
					<label>Alpha Vantage API Key</label>
					<input id="alpha" placeholder="alphavantage key" value="${alpha}" style="
						flex: 1;
						background: #0b0f14;
						border: 1px solid #1f2a37;
						color: #e6edf3;
						border-radius: 8px;
						padding: 8px;
					">
				</div>
				<div style="display: flex; gap: 8px; align-items: center; margin: 8px 0;">
					<label>FRED API Key</label>
					<input id="fred" placeholder="fred key" value="${fred}" style="
						flex: 1;
						background: #0b0f14;
						border: 1px solid #1f2a37;
						color: #e6edf3;
						border-radius: 8px;
						padding: 8px;
					">
				</div>
				<div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;">
					<button id="close" style="
						background: #233044;
						border: 1px solid #1f2a37;
						color: #e6edf3;
						border-radius: 8px;
						padding: 8px 12px;
						cursor: pointer;
					">Close</button>
					<button id="save" style="
						background: #4ea1f3;
						color: #0b0f14;
						border: 1px solid #4ea1f3;
						border-radius: 8px;
						padding: 8px 12px;
						cursor: pointer;
						font-weight: 600;
					">Save</button>
				</div>
			</div>
		`;
		
		this.addEventListener('click', (e) => {
			if (e.target === this) {
				console.log('Backdrop clicked');
				this.close();
			}
		});
		
		this.querySelector('#close')?.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			console.log('Close button clicked');
			this.close();
		});
		
		this.querySelector('#save')?.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			console.log('Save button clicked!', e);
			const alphaInput = this.querySelector('#alpha');
			const fredInput = this.querySelector('#fred');
			console.log('Input elements found:', {alpha: !!alphaInput, fred: !!fredInput});
			
			const a = alphaInput?.value?.trim() || '';
			const f = fredInput?.value?.trim() || '';
			console.log('Input values:', {alpha: a ? '***' : 'empty', fred: f ? '***' : 'empty'});
			
			try {
				if(a) setLocal(keys.ALPHA_VANTAGE_KEY, a); else localStorage.removeItem(keys.ALPHA_VANTAGE_KEY);
				if(f) setLocal(keys.FRED_KEY, f); else localStorage.removeItem(keys.FRED_KEY);
				console.log('Keys saved successfully');
				this.close();
			} catch(error) {
				console.error('Error saving keys:', error);
			}
		});
	}
	open(){
		console.log('Opening settings modal');
		this.style.display = 'flex';
	}
	close(){
		console.log('Closing settings modal');
		this.style.display = 'none';
		console.log('Modal closed');
	}
}

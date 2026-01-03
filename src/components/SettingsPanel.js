export class SettingsPanel extends HTMLElement {
	constructor() {
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
	connectedCallback() {
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
				<p style="margin: 0 0 12px 0; color: #9fb0c0; font-size: 0.9rem;">
					API keys are configured on the server. No manual configuration required.
				</p>
				<div style="
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 12px;
					margin: 8px 0;
				">
					<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
						<span style="color: #4ade80;">✓</span>
						<span>FRED API - Configured on server</span>
					</div>
					<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
						<span style="color: #4ade80;">✓</span>
						<span>Finnhub API - Configured on server</span>
					</div>
					<div style="display: flex; align-items: center; gap: 8px;">
						<span style="color: #4ade80;">✓</span>
						<span>Google Gemini API - Configured on server</span>
					</div>
				</div>
				<div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;">
					<button id="close" style="
						background: #4ea1f3;
						color: #0b0f14;
						border: 1px solid #4ea1f3;
						border-radius: 8px;
						padding: 8px 12px;
						cursor: pointer;
						font-weight: 600;
					">Close</button>
				</div>
			</div>
		`;

		this.addEventListener('click', (e) => {
			if (e.target === this) {
				this.close();
			}
		});

		this.querySelector('#close')?.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.close();
		});
	}
	open() {
		this.style.display = 'flex';
	}
	close() {
		this.style.display = 'none';
	}
}

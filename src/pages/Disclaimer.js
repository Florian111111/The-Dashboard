export class Disclaimer extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					max-width: 800px;
					margin: 0 auto;
					padding: 40px 20px;
					color: #e6edf3;
				}
				:host(.light-mode) {
					color: #0a0a0a;
					--bg-primary: #c8d0da; --bg-secondary: #d5dce5; --bg-tertiary: #b8c2ce;
					--bg-card: #c0c9d4; --border-color: #a0aab8;
					--text-primary: #0a0a0a; --text-secondary: #1a1a1a; --text-muted: #2a2a2a;
				}
				.header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
				.theme-switch { display: flex; align-items: center; gap: 10px; background: #1f2a37; padding: 6px 12px; border-radius: 20px; border: 1px solid #2d3748; }
				:host(.light-mode) .theme-switch { background: var(--bg-tertiary); border-color: var(--border-color); }
				.theme-switch-label { font-size: 0.7rem; color: #6b7a8a; text-transform: uppercase; }
				:host(.light-mode) .theme-switch-label { color: var(--text-muted); }
				.theme-switch-track { width: 44px; height: 24px; background: #121821; border-radius: 12px; position: relative; cursor: pointer; border: 1px solid #1f2a37; }
				:host(.light-mode) .theme-switch-track { background: var(--bg-secondary); border-color: var(--border-color); }
				.theme-switch-thumb { width: 18px; height: 18px; background: #4ea1f3; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: transform 0.3s; display: flex; align-items: center; justify-content: center; font-size: 10px; }
				.theme-switch-track.light .theme-switch-thumb { transform: translateX(20px); background: #f59e0b; }
				.theme-icon { font-size: 11px; }
				h1 {
					color: #4ea1f3;
					font-size: 2rem;
					margin-bottom: 30px;
					border-bottom: 2px solid #1f2a37;
					padding-bottom: 15px;
				}
				:host(.light-mode) h1 { border-bottom-color: var(--border-color); }
				p {
					color: #9fb0c0;
					line-height: 1.8;
					margin-bottom: 15px;
				}
				:host(.light-mode) p { color: var(--text-secondary); }
				.info-section {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 25px;
					margin-bottom: 20px;
				}
				:host(.light-mode) .info-section { background: var(--bg-secondary); border-color: var(--border-color); }
				.back-button {
					display: inline-block;
					background: #4ea1f3;
					color: #0b0f14;
					padding: 12px 24px;
					border-radius: 8px;
					text-decoration: none;
					font-weight: 600;
					margin-top: 30px;
					transition: background 0.2s;
					cursor: pointer;
					border: none;
					font-size: 1rem;
				}
				.back-button:hover {
					background: #3b82f6;
				}
			</style>
			<div class="header-bar">
				<h1 style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">Disclaimer</h1>
				<div class="theme-switch">
					<span class="theme-switch-label">Theme</span>
					<div class="theme-switch-track" id="theme-toggle">
						<div class="theme-switch-thumb"><span class="theme-icon">🌙</span></div>
					</div>
				</div>
			</div>
			
			<div class="info-section">
				<p>
					The information provided on this website is for general informational and educational purposes only and does not constitute investment advice, financial advice, trading advice, or any other form of recommendation.
				</p>
				<p>
					All content, including but not limited to market data, charts, indicators, analyses, opinions, and projections, is provided without regard to the individual financial circumstances, investment objectives, or risk tolerance of any specific person.
				</p>
				<p>
					The content on this website should not be interpreted as an offer, solicitation, or recommendation to buy, sell, or hold any financial instrument, security, cryptocurrency, derivative, or other investment product.
				</p>
				<p>
					Past performance is not indicative of future results. Financial markets are subject to risk, and investing may result in the loss of part or all of your capital.
				</p>
				<p>
					While we strive to ensure that the information presented is accurate and up to date, no guarantee is given regarding the accuracy, completeness, timeliness, or reliability of any data or analysis displayed. Market data may be delayed, incomplete, or sourced from third-party providers.
				</p>
				<p>
					Any actions taken based on the information on this website are strictly at your own risk. The website operator shall not be liable for any losses, damages, or expenses arising directly or indirectly from the use of or reliance on any information provided.
				</p>
				<p>
					Before making any investment decision, you should conduct your own research and, where appropriate, consult a licensed financial advisor or other qualified professional.
				</p>
				<p>
					By using this website, you acknowledge and agree to this disclaimer.
				</p>
			</div>

			<button class="back-button" id="back-button">Back to Homepage</button>
		`;

		this.setupThemeToggle();
		
		// Back button
		const backButton = this.shadowRoot.getElementById('back-button');
		backButton?.addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'market-overview' } }));
		});
	}
	
	setupThemeToggle() {
		const toggle = this.shadowRoot.getElementById('theme-toggle');
		if (!toggle) return;
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') this.applyLightMode(true);
		toggle.addEventListener('click', () => {
			this.applyLightMode(!this.classList.contains('light-mode'));
		});
	}
	
	applyLightMode(enable) {
		const toggle = this.shadowRoot.getElementById('theme-toggle');
		const icon = toggle?.querySelector('.theme-icon');
		if (enable) {
			this.classList.add('light-mode');
			toggle?.classList.add('light');
			if (icon) icon.textContent = '☀️';
			localStorage.setItem('theme', 'light');
			document.body.style.background = '#c8d0da';
		} else {
			this.classList.remove('light-mode');
			toggle?.classList.remove('light');
			if (icon) icon.textContent = '🌙';
			localStorage.setItem('theme', 'dark');
			document.body.style.background = '#0b0f14';
		}
		
		// Dispatch theme change event for chart components
		window.dispatchEvent(new CustomEvent('themechange'));
	}
}

customElements.define('disclaimer-page', Disclaimer);


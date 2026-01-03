export class Impressum extends HTMLElement {
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
				h2 {
					color: #4ea1f3;
					font-size: 1.5rem;
					margin-top: 30px;
					margin-bottom: 15px;
				}
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
				:host(.light-mode) .info-value { color: var(--text-primary); }
				.info-item {
					margin-bottom: 12px;
				}
				.info-label {
					color: #4ea1f3;
					font-weight: 600;
					display: inline-block;
					min-width: 120px;
				}
				.info-value {
					color: #e6edf3;
				}
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
				<h1 style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">Impressum</h1>
				<div class="theme-switch">
					<span class="theme-switch-label">Theme</span>
					<div class="theme-switch-track" id="theme-toggle">
						<div class="theme-switch-thumb"><span class="theme-icon">🌙</span></div>
					</div>
				</div>
			</div>
			
			<div class="info-section">
				<h2>Angaben gemäß § 5 TMG</h2>
				<div class="info-item">
					<span class="info-label">Name:</span>
					<span class="info-value">Florian Wendler</span>
				</div>
				<div class="info-item">
					<span class="info-label">Adresse:</span>
					<span class="info-value">Wengertweg 13, 71083 Herrenberg</span>
				</div>
				<div class="info-item">
					<span class="info-label">E-Mail:</span>
					<span class="info-value">florianwendler@web.de</span>
				</div>
				<div class="info-item">
					<span class="info-label">Telefon:</span>
					<span class="info-value">+49 1575 0667237</span>
				</div>
			</div>

			<div class="info-section">
				<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
				<p>Florian Wendler</p>
			</div>

			<div class="info-section">
				<h2>Haftungsausschluss</h2>
				<h3>Haftung für Inhalte</h3>
				<p>
					Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. 
					Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte 
					können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind 
					wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach 
					den allgemeinen Gesetzen verantwortlich.
				</p>
				<h3>Haftung für Links</h3>
				<p>
					Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren 
					Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden 
					Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten 
					Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten 
					verantwortlich.
				</p>
				<h3>Urheberrecht</h3>
				<p>
					Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen 
					Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, 
					Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der 
					Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des 
					jeweiligen Autors bzw. Erstellers.
				</p>
			</div>

			<button class="back-button" id="back-button">Zurück zur Startseite</button>
		`;

		// Add event listener for back button
		this.shadowRoot.getElementById('back-button').addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'market-overview' } }));
		});
		
		this.setupThemeToggle();
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

customElements.define('impressum-page', Impressum);


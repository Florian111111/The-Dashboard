export class PrivacyPolicy extends HTMLElement {
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
					--border-color: #a0aab8; --text-primary: #0a0a0a; --text-secondary: #1a1a1a; --text-muted: #2a2a2a;
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
				h3 {
					color: #4ea1f3;
					font-size: 1.2rem;
					margin-top: 20px;
					margin-bottom: 10px;
				}
				p {
					color: #9fb0c0;
					line-height: 1.8;
					margin-bottom: 15px;
				}
				:host(.light-mode) p { color: var(--text-secondary); }
				ul {
					color: #9fb0c0;
					line-height: 1.8;
					margin-bottom: 15px;
					padding-left: 20px;
				}
				:host(.light-mode) ul { color: var(--text-secondary); }
				li {
					margin-bottom: 8px;
				}
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
				.last-updated {
					color: #6b7280;
					font-size: 0.9rem;
					font-style: italic;
					margin-bottom: 20px;
				}
			</style>
			<div class="header-bar">
				<h1 style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">Privacy Policy</h1>
				<div class="theme-switch">
					<span class="theme-switch-label">Theme</span>
					<div class="theme-switch-track" id="theme-toggle">
						<div class="theme-switch-thumb"><span class="theme-icon">🌙</span></div>
					</div>
				</div>
			</div>
			<p class="last-updated">Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
			
			<div class="info-section">
				<h2>1. Introduction</h2>
				<p>
					This Privacy Policy describes how we collect, use, and protect your personal information 
					when you use our Stock Analysis Platform ("Service"). We are committed to protecting your 
					privacy and ensuring transparency about our data practices.
				</p>
			</div>

			<div class="info-section">
				<h2>2. Information We Collect</h2>
				<p>We currently do not collect or store any personally identifiable information (PII) from users. However, we use third-party services that may collect certain information:</p>
				<h3>2.1 Google AdSense</h3>
				<p>
					Our website uses Google AdSense, a service provided by Google LLC ("Google") for displaying 
					advertisements. Google AdSense uses cookies and similar technologies to:
				</p>
				<ul>
					<li>Display personalized advertisements based on your browsing behavior</li>
					<li>Measure the effectiveness of advertisements</li>
					<li>Prevent fraud and abuse</li>
				</ul>
				<p>
					Google may collect and process information about your visits to this website and other websites 
					to provide relevant advertisements. This information may include:
				</p>
				<ul>
					<li>IP address</li>
					<li>Browser type and version</li>
					<li>Operating system</li>
					<li>Pages visited and time spent on pages</li>
					<li>Referrer URL</li>
				</ul>
				<p>
					For more information about how Google uses data, please visit: 
					<a href="https://policies.google.com/privacy" target="_blank" style="color: #4ea1f3;">Google Privacy Policy</a>
				</p>
			</div>

			<div class="info-section">
				<h2>3. Cookies and Tracking Technologies</h2>
				<p>
					We use cookies and similar tracking technologies to track activity on our Service and hold 
					certain information. Cookies are files with a small amount of data which may include an 
					anonymous unique identifier.
				</p>
				<h3>3.1 Types of Cookies</h3>
				<ul>
					<li><strong>Essential Cookies:</strong> These cookies are necessary for the website to function properly.</li>
					<li><strong>Analytics Cookies:</strong> These cookies help us understand how visitors interact with our website.</li>
					<li><strong>Advertising Cookies:</strong> These cookies are used by Google AdSense to deliver personalized advertisements.</li>
				</ul>
				<p>
					You can control and manage cookies through your browser settings. However, disabling cookies 
					may affect the functionality of our Service.
				</p>
			</div>

			<div class="info-section">
				<h2>4. Your Rights and Choices</h2>
				<p>You have the following rights regarding your personal information:</p>
				<ul>
					<li><strong>Opt-Out of Cookies:</strong> You can opt-out of non-essential cookies using our cookie banner or your browser settings.</li>
					<li><strong>Google AdSense Opt-Out:</strong> You can opt-out of personalized advertising by visiting 
						<a href="https://www.google.com/settings/ads" target="_blank" style="color: #4ea1f3;">Google's Ad Settings</a> 
						or using the 
						<a href="https://tools.google.com/dlpage/gaoptout" target="_blank" style="color: #4ea1f3;">Google Analytics Opt-out Browser Add-on</a>.
					</li>
					<li><strong>Browser Settings:</strong> Most browsers allow you to refuse or delete cookies. Please refer to your browser's help documentation.</li>
				</ul>
			</div>

			<div class="info-section">
				<h2>5. Data Security</h2>
				<p>
					We implement appropriate technical and organizational measures to protect your information. 
					However, no method of transmission over the Internet or electronic storage is 100% secure.
				</p>
			</div>

			<div class="info-section">
				<h2>6. Third-Party Services</h2>
				<p>
					Our Service uses third-party services that may collect information used to identify you:
				</p>
				<ul>
					<li><strong>Google AdSense:</strong> For displaying advertisements. See 
						<a href="https://policies.google.com/privacy" target="_blank" style="color: #4ea1f3;">Google's Privacy Policy</a>.
					</li>
					<li><strong>Google Analytics:</strong> For website analytics (if used). See 
						<a href="https://policies.google.com/privacy" target="_blank" style="color: #4ea1f3;">Google's Privacy Policy</a>.
					</li>
				</ul>
			</div>

			<div class="info-section">
				<h2>7. Children's Privacy</h2>
				<p>
					Our Service is not intended for children under the age of 13. We do not knowingly collect 
					personal information from children under 13.
				</p>
			</div>

			<div class="info-section">
				<h2>8. Changes to This Privacy Policy</h2>
				<p>
					We may update our Privacy Policy from time to time. We will notify you of any changes by 
					posting the new Privacy Policy on this page and updating the "Last updated" date.
				</p>
			</div>

			<div class="info-section">
				<h2>9. Contact Us</h2>
				<p>If you have any questions about this Privacy Policy, please contact us:</p>
				<p>
					<strong>Email:</strong> florianwendler@web.de<br>
					<strong>Address:</strong> Wengertweg 13, 71083 Herrenberg, Germany
				</p>
			</div>

			<button class="back-button" id="back-button">Back to Homepage</button>
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

customElements.define('privacy-policy-page', PrivacyPolicy);


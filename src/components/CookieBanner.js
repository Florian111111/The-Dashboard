export class CookieBanner extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.cookiesAccepted = this.getCookiePreference();
	}

	getCookiePreference() {
		const preference = localStorage.getItem('cookiePreference');
		if (preference === null) return null; // No decision made yet
		return preference === 'accepted';
	}

	setCookiePreference(accepted) {
		localStorage.setItem('cookiePreference', accepted ? 'accepted' : 'rejected');
		this.cookiesAccepted = accepted;
		this.updateBanner();
		
		// Load or remove Google AdSense based on preference
		if (accepted) {
			this.loadGoogleAdSense();
		} else {
			this.removeGoogleAdSense();
		}
	}

	loadGoogleAdSense() {
		// Only load if not already loaded
		if (document.querySelector('script[src*="googlesyndication.com"]')) {
			console.log('[Cookie Banner] Google AdSense already loaded');
			return;
		}

		// Note: Replace YOUR_PUBLISHER_ID with your actual Google AdSense Publisher ID
		// You can find this in your Google AdSense account
		const publisherId = 'ca-pub-YOUR_PUBLISHER_ID'; // TODO: Replace with your actual Publisher ID

		// Load Google AdSense script
		const script = document.createElement('script');
		script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
		script.async = true;
		script.crossOrigin = 'anonymous';
		script.setAttribute('data-ad-client', publisherId);
		document.head.appendChild(script);

		// Initialize adsbygoogle
		window.adsbygoogle = window.adsbygoogle || [];
		window.adsbygoogle.push({});

		console.log('[Cookie Banner] Google AdSense loaded and initialized');
	}

	removeGoogleAdSense() {
		// Remove AdSense script if present
		const adsenseScript = document.querySelector('script[src*="googlesyndication.com"]');
		if (adsenseScript) {
			adsenseScript.remove();
		}

		// Clear any AdSense cookies (if possible)
		// Note: This is limited by browser security, but we can try
		const cookies = document.cookie.split(';');
		for (let cookie of cookies) {
			const eqPos = cookie.indexOf('=');
			const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
			if (name.includes('google') || name.includes('ads')) {
				document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
				document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
				document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + window.location.hostname;
			}
		}

		console.log('[Cookie Banner] Google AdSense removed');
	}

	updateBanner() {
		if (this.cookiesAccepted === null) {
			// Show banner
			this.shadowRoot.innerHTML = `
				<style>
					:host {
						display: block;
						position: fixed;
						bottom: 0;
						left: 0;
						right: 0;
						background: #121821;
						border-top: 2px solid #1f2a37;
						padding: 20px;
						z-index: 10000;
						box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
					}
					.banner-content {
						max-width: 1200px;
						margin: 0 auto;
						display: flex;
						align-items: center;
						justify-content: space-between;
						gap: 20px;
						flex-wrap: wrap;
					}
					.banner-text {
						flex: 1;
						min-width: 300px;
						color: #9fb0c0;
						line-height: 1.6;
					}
					.banner-text strong {
						color: #e6edf3;
					}
					.banner-text a {
						color: #4ea1f3;
						text-decoration: none;
					}
					.banner-text a:hover {
						text-decoration: underline;
					}
					.banner-buttons {
						display: flex;
						gap: 12px;
						flex-wrap: wrap;
					}
					.banner-button {
						padding: 12px 24px;
						border-radius: 8px;
						font-weight: 600;
						cursor: pointer;
						transition: all 0.2s;
						border: none;
						font-size: 0.95rem;
					}
					.accept-button {
						background: #4ea1f3;
						color: #0b0f14;
					}
					.accept-button:hover {
						background: #3b82f6;
					}
					.reject-button {
						background: transparent;
						color: #9fb0c0;
						border: 1px solid #1f2a37;
					}
					.reject-button:hover {
						background: #1f2a37;
						color: #e6edf3;
					}
					@media (max-width: 768px) {
						.banner-content {
							flex-direction: column;
							align-items: stretch;
						}
						.banner-buttons {
							width: 100%;
						}
						.banner-button {
							flex: 1;
						}
					}
				</style>
				<div class="banner-content">
					<div class="banner-text">
						<strong>Cookie Notice:</strong> We use cookies and similar technologies to provide you with a better experience, 
						analyze site traffic, and deliver personalized advertisements via Google AdSense. 
						By clicking "Accept All", you consent to our use of cookies. 
						<a href="#" id="privacy-link">Learn more in our Privacy Policy</a>.
					</div>
					<div class="banner-buttons">
						<button class="banner-button reject-button" id="reject-button">Reject All</button>
						<button class="banner-button accept-button" id="accept-button">Accept All</button>
					</div>
				</div>
			`;

			// Add event listeners
			this.shadowRoot.getElementById('accept-button').addEventListener('click', () => {
				this.setCookiePreference(true);
			});

			this.shadowRoot.getElementById('reject-button').addEventListener('click', () => {
				this.setCookiePreference(false);
			});

			this.shadowRoot.getElementById('privacy-link').addEventListener('click', (e) => {
				e.preventDefault();
				window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'privacy-policy' } }));
			});
		} else {
			// Hide banner if decision was made
			this.shadowRoot.innerHTML = '';
		}
	}

	connectedCallback() {
		this.updateBanner();
		
		// If cookies were previously accepted, load AdSense
		if (this.cookiesAccepted === true) {
			this.loadGoogleAdSense();
		}
	}

	// Method to check if cookies are accepted (for other components)
	static areCookiesAccepted() {
		const preference = localStorage.getItem('cookiePreference');
		return preference === 'accepted';
	}
}

customElements.define('cookie-banner', CookieBanner);


export class RateLimitBanner extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.countdownInterval = null;
		this.retryAfter = 0;
		this.limitType = null;
		this.limit = 0;
		this.window = 0;
	}

	connectedCallback() {
		this.render();
		
		// Check if cooldown exists in localStorage (persistent across page reloads)
		this.restoreCooldown();
	}
	
	restoreCooldown() {
		const cooldownEndTimestamp = localStorage.getItem('cooldown_end_timestamp');
		if (cooldownEndTimestamp) {
			const cooldownEnd = parseInt(cooldownEndTimestamp, 10);
			const now = Date.now();
			const remaining = Math.max(0, Math.floor((cooldownEnd - now) / 1000));
			
			if (remaining > 0) {
				// Cooldown still active - restore banner WITHOUT overwriting the timestamp
				console.log('[Rate Limit Banner] Restoring cooldown from localStorage:', remaining, 'seconds remaining');
				// Set properties directly without calling show() which would overwrite the timestamp
				this.retryAfter = remaining;
				this.limitType = 'session_cooldown';
				this.limit = 0;
				this.window = 0;
				this.sessionRemaining = 0;
				
				// Render and show banner
				this.render();
				this.startCountdown();
				const banner = this.shadowRoot.querySelector('.rate-limit-banner');
				if (banner) {
					banner.classList.add('show');
				}
				
				// Disable search
				const app = window.app;
				if (app && app.disableSearchDuringCooldown) {
					app.disableSearchDuringCooldown();
				}
			} else {
				// Cooldown expired - remove from localStorage
				console.log('[Rate Limit Banner] Cooldown expired');
				localStorage.removeItem('cooldown_end_timestamp');
			}
		}
	}

	disconnectedCallback() {
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
		}
	}

	show(retryAfter, limitType, limit, window, sessionRemaining = 0) {
		this.retryAfter = retryAfter;
		this.limitType = limitType;
		this.limit = limit;
		this.window = window;
		this.sessionRemaining = sessionRemaining;
		
		// Save cooldown_end timestamp to localStorage (persistent across page reloads)
		if (retryAfter > 0) {
			const cooldownEndTimestamp = Date.now() + (retryAfter * 1000);
			localStorage.setItem('cooldown_end_timestamp', cooldownEndTimestamp.toString());
		}
		
		this.render();
		this.startCountdown();
		this.shadowRoot.querySelector('.rate-limit-banner').classList.add('show');
	}

	hide() {
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
		}
		const banner = this.shadowRoot.querySelector('.rate-limit-banner');
		if (banner) {
			banner.classList.remove('show');
		}
		
		// Remove cooldown_end from localStorage when banner is hidden
		localStorage.removeItem('cooldown_end_timestamp');
	}

	startCountdown() {
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
		}

		const countdownElement = this.shadowRoot.querySelector('.countdown-time');
		if (!countdownElement) return;

		const updateCountdown = () => {
			// Recalculate remaining time from localStorage to handle page reloads
			const cooldownEndTimestamp = localStorage.getItem('cooldown_end_timestamp');
			let remaining = 0;
			
			if (cooldownEndTimestamp) {
				const cooldownEnd = parseInt(cooldownEndTimestamp, 10);
				const now = Date.now();
				remaining = Math.max(0, Math.floor((cooldownEnd - now) / 1000));
			} else {
				// Fallback to this.retryAfter if no localStorage entry
				remaining = this.retryAfter;
			}
			
			if (remaining <= 0) {
				clearInterval(this.countdownInterval);
				this.hide();
				// Re-enable search when cooldown ends
				if (window.app && window.app.enableSearchAfterCooldown) {
					window.app.enableSearchAfterCooldown();
				}
				return;
			}

			const minutes = Math.floor(remaining / 60);
			const seconds = remaining % 60;
			countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
		};

		updateCountdown();
		this.countdownInterval = setInterval(updateCountdown, 1000);
	}

	formatTimeWindow(windowSeconds) {
		if (windowSeconds >= 600) {
			return `${windowSeconds / 60} minutes`;
		}
		return `${windowSeconds} seconds`;
	}

	getLimitExplanation() {
		if (this.limitType === 'session_cooldown') {
			return `Your 5-minute usage session has ended. The free version limits usage to allow many users to access the platform simultaneously. Please wait 5 minutes before you can search for stocks or load stock analyses again.`;
		}
		return `Your session has ended. The free version limits usage to allow many users to access the platform simultaneously. Please wait before using the platform again.`;
	}

	render() {
		this.shadowRoot.innerHTML = `
			<style>
				.rate-limit-banner {
					position: fixed;
					top: 0;
					left: 0;
					right: 0;
					background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
					color: #ffffff;
					padding: 50px 20px;
					min-height: 180px;
					z-index: 10001;
					box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
					transform: translateY(-100%);
					transition: transform 0.3s ease;
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 20px;
					flex-wrap: wrap;
				}

				.rate-limit-banner.show {
					transform: translateY(0);
				}

				.banner-content {
					display: flex;
					align-items: center;
					gap: 16px;
					flex: 1;
					min-width: 0;
				}

				.banner-icon {
					font-size: 1.5rem;
					flex-shrink: 0;
				}

				.banner-text {
					flex: 1;
					min-width: 0;
				}

				.banner-title {
					font-weight: 700;
					font-size: 1rem;
					margin-bottom: 4px;
				}

				.banner-description {
					font-size: 0.9rem;
					opacity: 0.95;
					line-height: 1.4;
				}

				.banner-actions {
					display: flex;
					align-items: center;
					gap: 16px;
					flex-shrink: 0;
				}

				.countdown-container {
					display: flex;
					align-items: center;
					gap: 8px;
					background: rgba(255, 255, 255, 0.2);
					padding: 8px 16px;
					border-radius: 8px;
					font-weight: 600;
				}

				.countdown-label {
					font-size: 0.85rem;
					opacity: 0.9;
				}

				.countdown-time {
					font-size: 1.1rem;
					font-family: 'Courier New', monospace;
					min-width: 50px;
					text-align: center;
				}

				@media (max-width: 768px) {
					.rate-limit-banner {
						padding: 42px 16px;
						min-height: 190px;
						flex-direction: column;
						align-items: flex-start;
					}

					.banner-content {
						width: 100%;
					}

					.banner-actions {
						width: 100%;
						justify-content: space-between;
					}

					.countdown-container {
						flex: 1;
					}
				}
			</style>
			<div class="rate-limit-banner">
				<div class="banner-content">
					<div class="banner-icon">⏱️</div>
				<div class="banner-text">
					<div class="banner-title">Rate Limit Exceeded</div>
					<div class="banner-description">${this.getLimitExplanation()}</div>
					<div class="banner-conditions" style="margin-top: 8px; font-size: 0.85rem; opacity: 0.9;">
						<strong>Usage Policy:</strong> 5 minutes of usage, then 5 minutes cooldown period
					</div>
				</div>
				</div>
					<div class="banner-actions">
						<div class="countdown-container">
							<span class="countdown-label">Wait:</span>
							<span class="countdown-time">${Math.floor(this.retryAfter / 60)}:${(this.retryAfter % 60).toString().padStart(2, '0')}</span>
						</div>
					</div>
			</div>
		`;
	}
}

customElements.define('rate-limit-banner', RateLimitBanner);


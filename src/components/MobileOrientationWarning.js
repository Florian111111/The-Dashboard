export class MobileOrientationWarning extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.dismissed = false;
		this.storageKey = 'mobile-orientation-warning-dismissed';
		this.rendered = false;
	}

	connectedCallback() {
		this.checkAndShow();
		// Only listen for orientation changes, not resize events
		// This prevents the warning from reappearing when the screen moves
		window.addEventListener('orientationchange', () => {
			// Only check on orientation change, not on every resize
			// The warning should only show once per page load if dismissed
			if (!this.isDismissed()) {
				setTimeout(() => this.checkAndShow(), 100);
			}
		});
	}

	isMobileDevice() {
		return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
			(window.innerWidth <= 768 && window.innerHeight <= 1024);
	}

	isDismissed() {
		// Check if user has dismissed the warning in this session
		// Using sessionStorage so it only persists until page reload
		return sessionStorage.getItem(this.storageKey) === 'true';
	}

	setDismissed() {
		// Mark as dismissed for this session
		sessionStorage.setItem(this.storageKey, 'true');
		this.dismissed = true;
	}

	checkAndShow() {
		// Check if user has already dismissed the warning
		if (this.isDismissed()) {
			return;
		}

		// Check if mobile device
		if (!this.isMobileDevice()) {
			// Hide warning if not on mobile
			const overlay = this.shadowRoot.querySelector('.mobile-warning-overlay');
			if (overlay) {
				overlay.classList.remove('show');
			}
			return;
		}

		// Check if overlay already exists
		let overlay = this.shadowRoot.querySelector('.mobile-warning-overlay');
		
		// Only render once - if overlay doesn't exist or hasn't been rendered, create it
		if (!overlay || !this.rendered) {
			this.render();
			this.rendered = true;
			overlay = this.shadowRoot.querySelector('.mobile-warning-overlay');
		}
		
		// Show warning if overlay exists and not already shown
		if (overlay && !overlay.classList.contains('show')) {
			overlay.classList.add('show');
		}
	}

	dismiss() {
		// Hide the overlay and save dismissal state
		const overlay = this.shadowRoot.querySelector('.mobile-warning-overlay');
		if (overlay) {
			overlay.classList.remove('show');
		}
		// Save dismissal state so it won't reappear until page reload
		this.setDismissed();
	}

	render() {
		this.shadowRoot.innerHTML = `
			<style>
				* {
					box-sizing: border-box;
				}
				
				.mobile-warning-overlay {
					position: fixed;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					width: 100vw;
					height: 100vh;
					max-width: 100vw;
					max-height: 100vh;
					background: rgba(11, 15, 20, 0.98);
					backdrop-filter: blur(10px);
					z-index: 10002;
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					padding: 0;
					margin: 0;
					opacity: 0;
					visibility: hidden;
					transition: opacity 0.3s ease, visibility 0.3s ease;
					overflow: hidden;
				}
				
				/* Portrait mode - overlay should fill entire screen */
				@media (orientation: portrait) and (max-width: 1024px) {
					.mobile-warning-overlay {
						align-items: stretch;
						justify-content: stretch;
						padding: 0;
						width: 100vw !important;
						height: 100vh !important;
						max-width: 100vw !important;
						max-height: 100vh !important;
					}
				}

				.mobile-warning-overlay.show {
					opacity: 1;
					visibility: visible;
				}

				.warning-content {
					background: linear-gradient(135deg, #1a1f2e 0%, #0f1419 100%);
					border-radius: 0;
					padding: 40px 50px;
					max-width: 600px;
					width: 90%;
					box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
					border: 1px solid rgba(255, 255, 255, 0.1);
					text-align: center;
					position: relative;
				}
				
				.close-button {
					position: absolute;
					top: 15px;
					right: 15px;
					background: rgba(255, 255, 255, 0.1);
					border: none;
					border-radius: 50%;
					width: 36px;
					height: 36px;
					cursor: pointer;
					display: flex;
					align-items: center;
					justify-content: center;
					color: #ffffff;
					font-size: 20px;
					line-height: 1;
					transition: all 0.2s ease;
				}

				.close-button:hover {
					background: rgba(255, 255, 255, 0.2);
					transform: scale(1.1);
				}

				.close-button:active {
					transform: scale(0.95);
				}

				.phone-icon-container {
					margin-bottom: 30px;
					display: flex;
					justify-content: center;
					align-items: center;
					height: 120px;
				}

				.phone-icon {
					width: 80px;
					height: 140px;
					position: relative;
					background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
					border-radius: 12px;
					border: 3px solid rgba(255, 255, 255, 0.2);
					box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
					animation: rotatePhone 2s ease-in-out infinite;
				}

				.phone-icon::before {
					content: '';
					position: absolute;
					top: 8px;
					left: 50%;
					transform: translateX(-50%);
					width: 40px;
					height: 6px;
					background: rgba(0, 0, 0, 0.3);
					border-radius: 3px;
				}

				.phone-icon::after {
					content: '';
					position: absolute;
					bottom: 8px;
					left: 50%;
					transform: translateX(-50%);
					width: 50px;
					height: 50px;
					background: rgba(255, 255, 255, 0.1);
					border-radius: 50%;
					border: 2px solid rgba(255, 255, 255, 0.2);
				}

				@keyframes rotatePhone {
					0% {
						transform: rotate(0deg);
					}
					25% {
						transform: rotate(90deg);
					}
					50% {
						transform: rotate(90deg);
					}
					75% {
						transform: rotate(0deg);
					}
					100% {
						transform: rotate(0deg);
					}
				}

				/* Default styles - desktop and landscape */
				.warning-title {
					font-size: 1.8rem;
					font-weight: 700;
					color: #ffffff;
					margin-bottom: 20px;
					line-height: 1.3;
				}

				.warning-message {
					font-size: 1.15rem;
					color: #9fb0c0;
					line-height: 1.7;
					margin-bottom: 30px;
				}

				.recommendation {
					font-size: 1rem;
					color: #6b7a8a;
					margin-top: 25px;
					padding-top: 25px;
					border-top: 1px solid rgba(255, 255, 255, 0.1);
				}

				@media (max-width: 768px) and (orientation: landscape) {
					.mobile-warning-overlay {
						padding: 0;
						align-items: center;
						justify-content: center;
					}

					.warning-content {
						padding: 40px 30px;
						max-width: 90vw;
						width: 90vw;
						border-radius: 12px;
						display: flex;
						flex-direction: column;
						justify-content: center;
						box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
						border: 1px solid rgba(255, 255, 255, 0.1);
						margin: 0;
						position: relative;
						min-height: auto;
						height: auto;
					}

					.warning-title {
						font-size: 2rem;
						margin-bottom: 20px;
					}

					.warning-message {
						font-size: 1.2rem;
						line-height: 1.6;
						margin-bottom: 25px;
					}

					.recommendation {
						font-size: 1rem;
						margin-top: 25px;
						padding-top: 25px;
					}

					.phone-icon {
						width: 100px;
						height: 180px;
					}

					.phone-icon-container {
						height: 160px;
						margin-bottom: 30px;
					}

					.close-button {
						width: 44px;
						height: 44px;
						font-size: 24px;
						top: 20px;
						right: 20px;
					}
				}

				@media (max-width: 480px) and (orientation: portrait) {
					.warning-content {
						padding: 25px 20px !important;
						min-height: 100vh !important;
						height: 100vh !important;
						width: 100vw !important;
						max-width: 100vw !important;
						position: fixed !important;
						top: 0 !important;
						left: 0 !important;
						right: 0 !important;
						bottom: 0 !important;
					}

					.warning-title {
						font-size: 1.6rem !important;
						margin-bottom: 20px !important;
						line-height: 1.3 !important;
					}

					.warning-message {
						font-size: 1rem !important;
						line-height: 1.4 !important;
						margin-bottom: 20px !important;
					}

					.recommendation {
						font-size: 0.95rem !important;
						margin-top: 20px !important;
						padding-top: 20px !important;
						line-height: 1.3 !important;
					}

					.phone-icon {
						width: 90px !important;
						height: 160px !important;
					}

					.phone-icon-container {
						height: 140px !important;
						margin-bottom: 25px !important;
					}

					.close-button {
						width: 48px !important;
						height: 48px !important;
						font-size: 26px !important;
						top: 20px !important;
						right: 20px !important;
					}
				}

				/* Extra small phones in portrait */
				@media (max-width: 360px) and (orientation: portrait) {
					.warning-content {
						padding: 25px 15px !important;
					}

					.warning-title {
						font-size: 1.8rem !important;
						margin-bottom: 20px !important;
					}

					.warning-message {
						font-size: 1.1rem !important;
						line-height: 1.4 !important;
						margin-bottom: 20px !important;
					}

					.recommendation {
						font-size: 1rem !important;
						margin-top: 20px !important;
						padding-top: 20px !important;
						line-height: 1.3 !important;
					}

					.phone-icon {
						width: 90px !important;
						height: 160px !important;
					}

					.phone-icon-container {
						height: 140px !important;
						margin-bottom: 25px !important;
					}
				}

				/* Portrait mode - fullscreen - MUST BE LAST to override all other styles */
				@media (orientation: portrait) and (max-width: 1024px) {
					.warning-content {
						padding: 30px 25px !important;
						max-width: 100vw !important;
						width: 100vw !important;
						min-height: 100vh !important;
						height: 100vh !important;
						border-radius: 0 !important;
						display: flex !important;
						flex-direction: column !important;
						justify-content: center !important;
						box-shadow: none !important;
						border: none !important;
						margin: 0 !important;
						position: fixed !important;
						top: 0 !important;
						left: 0 !important;
						right: 0 !important;
						bottom: 0 !important;
					}
					
					.warning-title {
						font-size: 1.8rem !important;
						margin-bottom: 25px !important;
						line-height: 1.3 !important;
					}
					
					.warning-message {
						font-size: 1.1rem !important;
						line-height: 1.5 !important;
						margin-bottom: 25px !important;
					}
					
					.recommendation {
						font-size: 1rem !important;
						margin-top: 25px !important;
						padding-top: 25px !important;
						line-height: 1.4 !important;
					}
					
					.phone-icon {
						width: 100px !important;
						height: 180px !important;
					}
					
					.phone-icon-container {
						height: 150px !important;
						margin-bottom: 30px !important;
					}
					
					.close-button {
						width: 50px !important;
						height: 50px !important;
						font-size: 28px !important;
						top: 25px !important;
						right: 25px !important;
					}
				}
			</style>
			<div class="mobile-warning-overlay">
				<div class="warning-content">
					<button class="close-button" id="close-warning">&times;</button>
					<div class="phone-icon-container">
						<div class="phone-icon"></div>
					</div>
					<h2 class="warning-title">Optimized for Desktop</h2>
					<p class="warning-message">
						This website is optimized for desktop viewing. For the best experience, we recommend accessing it from a computer or tablet in landscape mode.
					</p>
					<p class="recommendation">
						💡 Tip: Rotate your device to landscape mode for a better viewing experience.
					</p>
				</div>
			</div>
		`;

		// Add event listeners
		const closeButton = this.shadowRoot.getElementById('close-warning');
		const overlay = this.shadowRoot.querySelector('.mobile-warning-overlay');
		
		if (closeButton) {
			closeButton.addEventListener('click', () => this.dismiss());
		}
		
		if (overlay) {
			overlay.addEventListener('click', (e) => {
				// Close if clicking on overlay (but not on content)
				if (e.target === overlay) {
					this.dismiss();
				}
			});
		}
	}
}

customElements.define('mobile-orientation-warning', MobileOrientationWarning);


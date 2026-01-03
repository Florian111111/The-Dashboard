export class MobileOrientationWarning extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.dismissed = false;
	}

	connectedCallback() {
		this.checkAndShow();
		// Listen for orientation changes
		window.addEventListener('orientationchange', () => {
			setTimeout(() => this.checkAndShow(), 100);
		});
		// Listen for resize events (in case user rotates device)
		window.addEventListener('resize', () => {
			setTimeout(() => this.checkAndShow(), 100);
		});
	}

	isMobileDevice() {
		return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
			(window.innerWidth <= 768 && window.innerHeight <= 1024);
	}

	checkAndShow() {
		// Check if mobile device
		if (!this.isMobileDevice()) {
			// Hide warning if not on mobile
			const overlay = this.shadowRoot.querySelector('.mobile-warning-overlay');
			if (overlay) {
				overlay.classList.remove('show');
			}
			return;
		}

		// Check if overlay already exists and is shown
		let overlay = this.shadowRoot.querySelector('.mobile-warning-overlay');
		if (overlay && overlay.classList.contains('show')) {
			// Already shown, don't re-render
			return;
		}

		// Show warning (render if needed, then show)
		if (!overlay) {
			this.render();
			overlay = this.shadowRoot.querySelector('.mobile-warning-overlay');
		}
		if (overlay) {
			overlay.classList.add('show');
		}
	}

	dismiss() {
		// Only hide the overlay, don't remove it or save to localStorage
		// This way it will show again next time the page loads on mobile
		const overlay = this.shadowRoot.querySelector('.mobile-warning-overlay');
		if (overlay) {
			overlay.classList.remove('show');
		}
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
				
				/* Portrait mode - fullscreen */
				@media (orientation: portrait) and (max-width: 1024px) {
					.warning-content {
						padding: 60px 40px;
						max-width: 100vw !important;
						width: 100vw !important;
						min-height: 100vh !important;
						height: 100vh !important;
						border-radius: 0 !important;
						display: flex;
						flex-direction: column;
						justify-content: center;
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
						font-size: 3rem;
						margin-bottom: 40px;
					}
					
					.warning-message {
						font-size: 1.8rem;
						line-height: 2;
						margin-bottom: 50px;
					}
					
					.recommendation {
						font-size: 1.6rem;
						margin-top: 50px;
						padding-top: 50px;
					}
					
					.phone-icon {
						width: 140px;
						height: 240px;
					}
					
					.phone-icon-container {
						height: 220px;
						margin-bottom: 60px;
					}
					
					.close-button {
						width: 56px;
						height: 56px;
						font-size: 32px;
						top: 40px;
						right: 40px;
					}
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
						padding: 50px 30px;
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
						font-size: 2.5rem;
						margin-bottom: 35px;
					}

					.warning-message {
						font-size: 1.6rem;
						line-height: 2;
						margin-bottom: 45px;
					}

					.recommendation {
						font-size: 1.4rem;
						margin-top: 45px;
						padding-top: 45px;
					}

					.phone-icon {
						width: 120px;
						height: 210px;
					}

					.phone-icon-container {
						height: 200px;
						margin-bottom: 50px;
					}

					.close-button {
						width: 52px;
						height: 52px;
						font-size: 30px;
						top: 30px;
						right: 30px;
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


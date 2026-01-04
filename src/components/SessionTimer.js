export class SessionTimer extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.remainingSeconds = 0;
		this.countdownInterval = null;
		this.render();
	}

	connectedCallback() {
		this.render();
	}

	disconnectedCallback() {
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}
	}

	show(remainingSeconds) {
		if (remainingSeconds <= 0) {
			this.hide();
			return;
		}
		
		this.remainingSeconds = remainingSeconds;
		const timerElement = this.shadowRoot.querySelector('.session-timer');
		if (timerElement) {
			timerElement.classList.add('show');
		}
		
		this.startCountdown();
	}

	hide() {
		const timerElement = this.shadowRoot.querySelector('.session-timer');
		if (timerElement) {
			timerElement.classList.remove('show');
		}
		
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}
		
		this.remainingSeconds = 0;
		this.updateDisplay();
	}

	startCountdown() {
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
		}
		
		this.updateDisplay();
		
		this.countdownInterval = setInterval(() => {
			if (this.remainingSeconds > 0) {
				this.remainingSeconds--;
				this.updateDisplay();
			} else {
				this.hide();
			}
		}, 1000);
	}

	updateDisplay() {
		const timeElement = this.shadowRoot.querySelector('.timer-time');
		if (timeElement) {
			const minutes = Math.floor(this.remainingSeconds / 60);
			const seconds = this.remainingSeconds % 60;
			timeElement.textContent = `${minutes} : ${seconds.toString().padStart(2, '0')}`;
		}
	}

	render() {
		this.shadowRoot.innerHTML = `
			<style>
				.session-timer {
					position: fixed;
					top: 20px;
					left: 50%;
					transform: translateX(-50%);
					z-index: 10000;
					opacity: 0;
					visibility: hidden;
					transition: opacity 0.3s ease, visibility 0.3s ease;
				}

				.session-timer.show {
					opacity: 1;
					visibility: visible;
				}

				.timer-container {
					display: flex;
					align-items: center;
					gap: 8px;
					background: rgba(255, 255, 255, 0.2);
					padding: 8px 16px;
					border-radius: 8px;
					font-weight: 600;
					backdrop-filter: blur(10px);
					box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
				}

				.timer-label {
					font-size: 0.85rem;
					opacity: 0.9;
					color: #ffffff;
				}

				.timer-time {
					font-size: 1.1rem;
					font-family: 'Courier New', monospace;
					min-width: 50px;
					text-align: center;
					color: #ffffff;
				}

				@media (max-width: 768px) {
					.session-timer {
						top: 15px;
					}
					
					.timer-container {
						padding: 6px 12px;
					}
					
					.timer-label {
						font-size: 0.75rem;
					}
					
					.timer-time {
						font-size: 0.95rem;
					}
				}
			</style>
			<div class="session-timer">
				<div class="timer-container">
					<span class="timer-label">Session:</span>
					<span class="timer-time">0 : 00</span>
				</div>
			</div>
		`;
	}
}


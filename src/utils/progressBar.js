/**
 * Utility functions for progress bars in stock components
 */

export function createProgressBarHTML() {
	return `
		<div class="progress-container" id="progress-container" style="display: none;">
			<div class="progress-bar" id="progress-bar"></div>
		</div>
	`;
}

export function getProgressBarCSS() {
	return `
		.progress-container {
			width: 100%;
			height: 4px;
			background: #0b0f14;
			border-radius: 2px;
			overflow: hidden;
			margin-bottom: 15px;
			position: relative;
		}
		:host(.light-mode) .progress-container {
			background: #c0c9d4;
		}
		.progress-bar {
			height: 100%;
			background: linear-gradient(90deg, #4ea1f3, #3b82f6, #2563eb);
			border-radius: 2px;
			width: 0%;
			transition: width 0.3s ease;
			position: relative;
			overflow: hidden;
		}
		.progress-bar::after {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			bottom: 0;
			right: 0;
			background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
			animation: shimmer 1.5s infinite;
		}
		@keyframes shimmer {
			0% {
				transform: translateX(-100%);
			}
			100% {
				transform: translateX(100%);
			}
		}
	`;
}

export function startProgressBar(shadowRoot, estimatedDuration = 3000) {
	const progressContainer = shadowRoot.getElementById('progress-container');
	const progressBar = shadowRoot.getElementById('progress-bar');
	
	if (!progressContainer || !progressBar) return null;
	
	progressContainer.style.display = 'block';
	progressBar.style.width = '0%';
	
	const startTime = Date.now();
	
	const progressInterval = setInterval(() => {
		if (progressBar) {
			const elapsed = Date.now() - startTime;
			const progress = Math.min((elapsed / estimatedDuration) * 90, 90); // Max 90% until done
			progressBar.style.width = `${progress}%`;
		}
	}, 50);
	
	return progressInterval;
}

export function completeProgressBar(shadowRoot, delay = 300) {
	const progressContainer = shadowRoot.getElementById('progress-container');
	const progressBar = shadowRoot.getElementById('progress-bar');
	
	if (progressBar) {
		progressBar.style.width = '100%';
	}
	
	setTimeout(() => {
		if (progressContainer) {
			progressContainer.style.display = 'none';
		}
	}, delay);
}

export function hideProgressBar(shadowRoot) {
	const progressContainer = shadowRoot.getElementById('progress-container');
	if (progressContainer) {
		progressContainer.style.display = 'none';
	}
}


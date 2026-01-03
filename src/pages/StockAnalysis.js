import { API_BASE_URL } from '../config.js';

export class StockAnalysis extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.symbol = null;
	}
	
	static get observedAttributes() {
		return ['symbol'];
	}
	
	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'symbol' && newValue !== oldValue && newValue) {
			this.symbol = newValue;
			if (this.shadowRoot && this.shadowRoot.innerHTML) {
				// Set the input value and load the stock
				const input = this.shadowRoot.getElementById('symbol-input');
				if (input) {
					input.value = newValue;
					this.loadStock(newValue);
				}
			}
		}
	}
	
	connectedCallback() {
		this.symbol = this.getAttribute('symbol');
		this.shadowRoot.innerHTML = `
			<style>
				/* ========== THEME VARIABLES ========== */
				:host {
					display: block;
					width: 100%;
					max-width: 100vw;
					overflow-x: hidden;
					background: #0b0f14;
					min-height: 100vh;
					box-sizing: border-box;
				}
				:host(.light-mode) {
					background: #c8d0da;
					--bg-primary: #c8d0da;
					--bg-secondary: #d5dce5;
					--bg-tertiary: #b8c2ce;
					--bg-card: #c0c9d4;
					--border-color: #a0aab8;
					--text-primary: #0a0a0a;
					--text-secondary: #1a1a1a;
					--text-muted: #2a2a2a;
					--accent-blue: #1d4ed8;
				}
				
				/* ========== THEME SWITCH ========== */
				.theme-switch {
					display: flex;
					align-items: center;
					gap: 10px;
					background: #1f2a37;
					padding: 6px 12px;
					border-radius: 20px;
					border: 1px solid #2d3748;
				}
				:host(.light-mode) .theme-switch {
					background: var(--bg-tertiary);
					border-color: var(--border-color);
				}
				.theme-switch-label {
					font-size: 0.7rem;
					color: #6b7a8a;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}
				:host(.light-mode) .theme-switch-label {
					color: var(--text-muted);
				}
				.theme-switch-track {
					width: 44px;
					height: 24px;
					background: #121821;
					border-radius: 12px;
					position: relative;
					cursor: pointer;
					border: 1px solid #1f2a37;
					transition: background 0.3s ease;
				}
				:host(.light-mode) .theme-switch-track {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.theme-switch-track:hover {
					border-color: #4ea1f3;
				}
				.theme-switch-thumb {
					width: 18px;
					height: 18px;
					background: #4ea1f3;
					border-radius: 50%;
					position: absolute;
					top: 2px;
					left: 2px;
					transition: transform 0.3s ease;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 10px;
				}
				.theme-switch-track.light .theme-switch-thumb {
					transform: translateX(20px);
					background: #f59e0b;
				}
				.theme-icon {
					font-size: 11px;
				}
				.header {
					display: grid;
					grid-template-columns: auto 1fr auto;
					align-items: center;
					margin-bottom: 20px;
					padding: 0 20px;
					gap: 20px;
					max-width: 1400px;
					margin-left: auto;
					margin-right: auto;
				}
				.back-btn {
					background: #233044;
					border: 1px solid #1f2a37;
					color: #e6edf3;
					padding: 8px 16px;
					border-radius: 8px;
					cursor: pointer;
					font-size: 0.9rem;
				}
				:host(.light-mode) .back-btn {
					background: var(--bg-tertiary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
				.back-btn:hover {
					background: #1f2a37;
				}
				:host(.light-mode) .back-btn:hover {
					background: var(--bg-secondary);
				}
				.header-center {
					display: flex;
					justify-content: center;
					align-items: center;
					gap: 20px;
				}
				.page-title-text {
					margin: 0;
					color: #e6edf3;
				}
				:host(.light-mode) .page-title-text {
					color: var(--text-primary);
				}
				.header-right {
					display: flex;
					justify-content: flex-end;
					align-items: center;
					gap: 12px;
				}
				.refresh-controls {
					display: flex;
					align-items: center;
					gap: 8px;
				}
				.refresh-btn, .share-btn {
					background: #233044;
					border: 1px solid #1f2a37;
					color: #e6edf3;
					padding: 8px 14px;
					border-radius: 8px;
					cursor: pointer;
					font-size: 0.85rem;
					display: flex;
					align-items: center;
					gap: 6px;
					transition: all 0.2s;
				}
				:host(.light-mode) .refresh-btn,
				:host(.light-mode) .share-btn {
					background: var(--bg-tertiary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
				.refresh-btn:hover, .share-btn:hover {
					background: #1f2a37;
					border-color: #4ea1f3;
				}
				:host(.light-mode) .refresh-btn:hover,
				:host(.light-mode) .share-btn:hover {
					background: var(--bg-secondary);
					border-color: var(--accent-blue);
				}
				.refresh-btn:active, .share-btn:active {
					transform: scale(0.98);
				}
				.refresh-btn.refreshing {
					opacity: 0.7;
					cursor: not-allowed;
				}
				.refresh-icon, .share-icon {
					width: 14px;
					height: 14px;
					display: inline-block;
				}
				.refresh-icon.refreshing {
					animation: spin 1s linear infinite;
				}
				@keyframes spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}
				.info-icon {
					width: 18px;
					height: 18px;
					cursor: pointer;
					color: #9fb0c0;
					transition: color 0.2s;
					position: relative;
				}
				:host(.light-mode) .info-icon {
					color: #4a5568;
				}
				.info-icon:hover {
					color: #4ea1f3;
				}
				:host(.light-mode) .info-icon:hover {
					color: var(--accent-blue);
				}
				.info-modal {
					position: fixed;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					background: rgba(0, 0, 0, 0.6);
					display: none;
					align-items: center;
					justify-content: center;
					z-index: 10000;
				}
				.info-modal.show {
					display: flex;
				}
				.info-modal-content {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 24px;
					max-width: 500px;
					width: 90%;
					max-height: 80vh;
					overflow-y: auto;
					box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
				}
				:host(.light-mode) .info-modal-content {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.info-modal-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 16px;
				}
				.info-modal-title {
					color: #e6edf3;
					font-size: 1.2rem;
					font-weight: 600;
					margin: 0;
				}
				:host(.light-mode) .info-modal-title {
					color: var(--text-primary);
				}
				.info-modal-close {
					background: none;
					border: none;
					color: #9fb0c0;
					font-size: 1.5rem;
					cursor: pointer;
					padding: 0;
					width: 28px;
					height: 28px;
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: 4px;
					transition: all 0.2s;
				}
				.info-modal-close:hover {
					background: #1f2a37;
					color: #e6edf3;
				}
				:host(.light-mode) .info-modal-close:hover {
					background: var(--bg-tertiary);
					color: var(--text-primary);
				}
				.info-modal-body {
					color: #9fb0c0;
					font-size: 0.9rem;
					line-height: 1.6;
				}
				:host(.light-mode) .info-modal-body {
					color: var(--text-secondary);
				}
				.info-modal-body p {
					margin: 0 0 12px 0;
				}
				.info-modal-body p:last-child {
					margin-bottom: 0;
				}
				/* Share Modal Styles */
				.share-modal {
					position: fixed;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					background: rgba(0, 0, 0, 0.6);
					display: none;
					align-items: center;
					justify-content: center;
					z-index: 10000;
				}
				.share-modal.show {
					display: flex;
				}
				.share-modal-content {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 24px;
					max-width: 500px;
					width: 90%;
					max-height: 80vh;
					overflow-y: auto;
					box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
				}
				:host(.light-mode) .share-modal-content {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.share-modal-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 20px;
				}
				.share-modal-title {
					color: #e6edf3;
					font-size: 1.2rem;
					font-weight: 600;
					margin: 0;
					display: flex;
					align-items: center;
					gap: 8px;
				}
				:host(.light-mode) .share-modal-title {
					color: var(--text-primary);
				}
				.share-modal-close {
					background: none;
					border: none;
					color: #9fb0c0;
					font-size: 1.5rem;
					cursor: pointer;
					padding: 0;
					width: 28px;
					height: 28px;
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: 4px;
					transition: all 0.2s;
				}
				.share-modal-close:hover {
					background: #1f2a37;
					color: #e6edf3;
				}
				:host(.light-mode) .share-modal-close:hover {
					background: var(--bg-tertiary);
					color: var(--text-primary);
				}
				.share-url-container {
					display: flex;
					gap: 8px;
					margin-bottom: 20px;
					align-items: center;
				}
				.share-url-input {
					flex: 1;
					background: #0b0f14;
					border: 1px solid #1f2a37;
					color: #e6edf3;
					padding: 10px 12px;
					border-radius: 8px;
					font-size: 0.9rem;
					font-family: monospace;
				}
				:host(.light-mode) .share-url-input {
					background: var(--bg-primary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
				.share-url-input:focus {
					outline: none;
					border-color: #4ea1f3;
				}
				.copy-btn {
					background: #4ea1f3;
					border: none;
					color: #0b0f14;
					padding: 10px 16px;
					border-radius: 8px;
					cursor: pointer;
					font-size: 0.85rem;
					font-weight: 600;
					white-space: nowrap;
					transition: all 0.2s;
				}
				.copy-btn:hover {
					background: #3b82f6;
				}
				.copy-btn:active {
					transform: scale(0.98);
				}
				.copy-btn.copied {
					background: #10b981;
				}
				.share-options {
					display: grid;
					grid-template-columns: repeat(3, 1fr);
					gap: 12px;
					margin-bottom: 20px;
				}
				.share-option {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 16px;
					cursor: pointer;
					text-align: center;
					transition: all 0.2s;
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 8px;
				}
				:host(.light-mode) .share-option {
					background: var(--bg-primary);
					border-color: var(--border-color);
				}
				.share-option:hover {
					border-color: #4ea1f3;
					transform: translateY(-2px);
					box-shadow: 0 4px 12px rgba(78, 161, 243, 0.2);
				}
				.share-option-icon {
					font-size: 1.5rem;
					line-height: 1;
				}
				.share-option-label {
					color: #e6edf3;
					font-size: 0.85rem;
					font-weight: 600;
				}
				:host(.light-mode) .share-option-label {
					color: var(--text-primary);
				}
				.share-option.twitter {
					border-color: #1da1f2;
				}
				.share-option.twitter:hover {
					background: rgba(29, 161, 242, 0.1);
					border-color: #1da1f2;
				}
				.share-option.linkedin {
					border-color: #0077b5;
				}
				.share-option.linkedin:hover {
					background: rgba(0, 119, 181, 0.1);
					border-color: #0077b5;
				}
				.share-option.facebook {
					border-color: #1877f2;
				}
				.share-option.facebook:hover {
					background: rgba(24, 119, 242, 0.1);
					border-color: #1877f2;
				}
				.share-option.native {
					border-color: #4ea1f3;
				}
				.share-option.native:hover {
					background: rgba(78, 161, 243, 0.1);
					border-color: #4ea1f3;
				}
				.share-divider {
					height: 1px;
					background: #1f2a37;
					margin: 20px 0;
				}
				:host(.light-mode) .share-divider {
					background: var(--border-color);
				}
				.share-note {
					color: #9fb0c0;
					font-size: 0.8rem;
					text-align: center;
					margin-top: 12px;
				}
				:host(.light-mode) .share-note {
					color: var(--text-secondary);
				}
				.search-section {
					display: none;
				}
				.search-box {
					display: flex;
					gap: 10px;
					align-items: center;
					position: relative;
				}
				.search-input-wrapper {
					position: relative;
					flex: 1;
					min-width: 300px;
				}
				.search-box input {
					width: 100%;
					background: #0b0f14;
					border: 1px solid #1f2a37;
					color: #e6edf3;
					padding: 12px;
					border-radius: 8px;
					font-size: 1rem;
					box-sizing: border-box;
				}
				:host(.light-mode) .search-box input {
					background: var(--bg-primary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
				.search-box input:focus {
					outline: none;
					border-color: #4ea1f3;
				}
				.search-box button {
					background: #4ea1f3;
					color: #0b0f14;
					border: none;
					padding: 12px 24px;
					border-radius: 8px;
					font-weight: 600;
					cursor: pointer;
					white-space: nowrap;
				}
				.autocomplete-dropdown {
					position: absolute;
					top: 100%;
					left: 0;
					min-width: 450px;
					width: max-content;
					max-width: 600px;
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 0 0 12px 12px;
					max-height: 350px;
					overflow-y: auto;
					z-index: 1000;
					display: none;
					box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
				}
				:host(.light-mode) .autocomplete-dropdown {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.autocomplete-dropdown.show {
					display: block;
				}
				.autocomplete-item {
					padding: 12px 16px;
					cursor: pointer;
					display: flex;
					align-items: center;
					gap: 15px;
					border-bottom: 1px solid #1f2a37;
					transition: background 0.15s;
				}
				:host(.light-mode) .autocomplete-item {
					border-bottom-color: var(--border-color);
				}
				:host(.light-mode) .autocomplete-item:hover,
				:host(.light-mode) .autocomplete-item.selected {
					background: var(--bg-tertiary);
				}
				.autocomplete-item:last-child {
					border-bottom: none;
				}
				.autocomplete-item:hover,
				.autocomplete-item.selected {
					background: #1f2a37;
				}
				.autocomplete-symbol {
					font-weight: 700;
					color: #4ea1f3;
					min-width: 65px;
					font-size: 0.95rem;
					flex-shrink: 0;
				}
				:host(.light-mode) .autocomplete-symbol {
					color: var(--accent-blue);
				}
				.autocomplete-name {
					color: #e6edf3;
					flex: 1;
					font-size: 0.9rem;
					white-space: nowrap;
				}
				:host(.light-mode) .autocomplete-name {
					color: var(--text-primary);
				}
				.autocomplete-type {
					color: #6b7a8a;
					font-size: 0.7rem;
				}
				:host(.light-mode) .autocomplete-type {
					color: var(--text-muted);
					background: var(--bg-primary);
					padding: 3px 8px;
					background: #0b0f14;
					border-radius: 4px;
					flex-shrink: 0;
					white-space: nowrap;
				}
				.autocomplete-score {
					display: flex;
					align-items: center;
					gap: 6px;
					margin-left: auto;
					flex-shrink: 0;
				}
				.score-dot {
					width: 8px;
					height: 8px;
					border-radius: 50%;
					background: #ef4444;
				}
				.score-dot.filled {
					background: #22c55e;
				}
				.score-label {
					font-size: 0.7rem;
					color: #6b7a8a;
				}
				.loading-dots {
					display: inline-flex;
					gap: 4px;
					align-items: center;
				}
				.loading-dots span {
					width: 5px;
					height: 5px;
					background: #4ea1f3;
					border-radius: 50%;
					animation: dotWave 1s ease-in-out infinite;
				}
				.loading-dots span:nth-child(2) {
					animation-delay: 0.15s;
				}
				.loading-dots span:nth-child(3) {
					animation-delay: 0.3s;
				}
				@keyframes dotWave {
					0%, 100% {
						transform: translateY(0);
						opacity: 0.3;
					}
					50% {
						transform: translateY(-5px);
						opacity: 1;
					}
				}
				.autocomplete-loading {
					padding: 15px;
					color: #9fb0c0;
					text-align: center;
					font-size: 0.9rem;
				}
				:host(.light-mode) .autocomplete-loading {
					color: var(--text-secondary);
				}
				.autocomplete-empty {
					padding: 15px;
					color: #6b7a8a;
					text-align: center;
					font-size: 0.9rem;
				}
				:host(.light-mode) .autocomplete-empty {
					color: var(--text-muted);
				}
				.content {
					padding: 20px;
					width: 100%;
					max-width: 100vw;
					box-sizing: border-box;
					overflow: hidden;
				}
				.loading-overlay {
					position: fixed;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					background: rgba(11, 15, 20, 0.95);
					backdrop-filter: blur(8px);
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					z-index: 1000;
					transition: opacity 0.3s ease;
				}
				:host(.light-mode) .loading-overlay {
					background: rgba(200, 208, 218, 0.95);
				}
				.loading-overlay.hidden {
					opacity: 0;
					pointer-events: none;
				}
				.loading-content {
					text-align: center;
				}
				.loading-text {
					color: #e6edf3;
					font-size: 1.2rem;
					font-weight: 600;
					margin-bottom: 20px;
				}
				:host(.light-mode) .loading-text {
					color: var(--text-primary);
				}
				.loading-subtext {
					color: #9fb0c0;
					font-size: 0.9rem;
					margin-bottom: 30px;
				}
				:host(.light-mode) .loading-subtext {
					color: var(--text-secondary);
				}
				.progress-bar-container {
					width: 300px;
					height: 6px;
					background: #1f2a37;
					border-radius: 3px;
					overflow: hidden;
					position: relative;
				}
				:host(.light-mode) .progress-bar-container {
					background: var(--bg-tertiary);
				}
				.progress-bar {
					height: 100%;
					background: linear-gradient(90deg, #4ea1f3, #3b82f6);
					border-radius: 3px;
					width: 0%;
					transition: width 0.3s ease;
					animation: pulse 2s ease-in-out infinite;
				}
				:host(.light-mode) .progress-bar {
					background: linear-gradient(90deg, #1d4ed8, #2563eb);
				}
				@keyframes pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.7; }
				}
				
				/* ========== DISCLAIMER FOOTER ========== */
				.disclaimer-footer {
					margin-top: 40px;
					padding: 20px;
					text-align: center;
					color: #6b7280;
					font-size: 0.7rem;
					line-height: 1.6;
					border-top: 1px solid #1f2a37;
					display: flex;
					align-items: center;
					justify-content: center;
					min-height: 80px;
				}
				:host(.light-mode) .disclaimer-footer {
					color: #4b5563;
					border-top-color: var(--border-color);
				}
				.disclaimer-footer a {
					color: #4ea1f3;
					text-decoration: none;
					margin-left: 4px;
				}
				.disclaimer-footer a:hover {
					text-decoration: underline;
				}
				:host(.light-mode) .disclaimer-footer a {
					color: var(--accent-blue);
				}
				
				/* ========== MOBILE TOUCH IMPROVEMENTS ========== */
				@media (max-width: 768px) {
					/* Larger touch targets (minimum 44x44px) */
					button,
					.back-btn,
					.refresh-btn,
					.share-btn,
					.search-box button,
					.autocomplete-item,
					.info-icon {
						min-height: 44px;
						min-width: 44px;
						padding: 12px 16px;
					}
					
					.refresh-controls {
						gap: 12px;
					}
					
					.header-right {
						gap: 16px;
					}
					
					/* Larger icons on mobile */
					.refresh-icon, 
					.share-icon, 
					.info-icon {
						width: 20px;
						height: 20px;
					}
					
					/* Touch feedback - active states */
					button:active,
					.back-btn:active,
					.refresh-btn:active,
					.share-btn:active,
					.autocomplete-item:active {
						transform: scale(0.95);
						opacity: 0.8;
						transition: transform 0.1s, opacity 0.1s;
					}
					
					.info-icon:active {
						transform: scale(0.9);
						opacity: 0.7;
					}
					
					/* Smooth scrolling for modals */
					.share-modal-content,
					.info-modal-content {
						-webkit-overflow-scrolling: touch;
						overscroll-behavior: contain;
					}
					
					/* Better spacing for touch */
					.autocomplete-dropdown {
						-webkit-overflow-scrolling: touch;
					}
					
					.autocomplete-item {
						padding: 14px 16px;
					}
				}
			</style>
			<div class="header">
				<button class="back-btn" id="back-btn">← Back to Market</button>
				<div class="header-center">
					<h2 id="page-title" class="page-title-text">Stock Analysis</h2>
					<div class="theme-switch">
						<span class="theme-switch-label">Theme</span>
						<div class="theme-switch-track" id="theme-toggle">
							<div class="theme-switch-thumb">
								<span class="theme-icon">🌙</span>
							</div>
						</div>
					</div>
				</div>
				<div class="header-right">
					<div class="refresh-controls">
						<button class="share-btn" id="share-btn" title="Share this analysis">
							<svg class="share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="18" cy="5" r="3"></circle>
								<circle cx="6" cy="12" r="3"></circle>
								<circle cx="18" cy="19" r="3"></circle>
								<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
								<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
							</svg>
							<span>Share</span>
						</button>
						<button class="refresh-btn" id="refresh-btn" title="Refresh all data">
							<svg class="refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
							</svg>
							<span>Refresh</span>
						</button>
						<svg class="info-icon" id="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="12" y1="16" x2="12" y2="12"></line>
							<line x1="12" y1="8" x2="12.01" y2="8"></line>
						</svg>
					</div>
					<div class="search-box">
						<div class="search-input-wrapper">
							<input type="text" id="symbol-input" placeholder="Search by name or symbol (e.g., Apple, AAPL)" autocomplete="off" />
							<div class="autocomplete-dropdown" id="autocomplete-dropdown"></div>
						</div>
						<button id="search-btn">Analyze</button>
					</div>
				</div>
				<div class="info-modal" id="info-modal">
					<div class="info-modal-content">
						<div class="info-modal-header">
							<h3 class="info-modal-title">Refresh Data</h3>
							<button class="info-modal-close" id="info-modal-close">&times;</button>
						</div>
						<div class="info-modal-body">
							<p>The Refresh button clears all cached data for the current stock and reloads all information from the server.</p>
							<p>This is useful when you want to ensure you're viewing the most up-to-date data, especially for frequently changing information like stock prices, news, and analyst recommendations.</p>
							<p><strong>Note:</strong> Refreshing will temporarily show loading indicators while new data is being fetched.</p>
						</div>
					</div>
				</div>
				
				<!-- Share Modal -->
				<div class="share-modal" id="share-modal">
					<div class="share-modal-content">
						<div class="share-modal-header">
							<h3 class="share-modal-title">
								<span>🔗</span>
								<span>Share Analysis</span>
							</h3>
							<button class="share-modal-close" id="share-modal-close">&times;</button>
						</div>
						<div class="share-url-container">
							<input type="text" class="share-url-input" id="share-url-input" readonly />
							<button class="copy-btn" id="copy-url-btn">Copy Link</button>
						</div>
						<div class="share-options" id="share-options">
							<!-- Share options will be dynamically generated -->
						</div>
						<div class="share-note">
							Share this analysis with others using the link above or social media buttons.
						</div>
					</div>
				</div>
			</div>
			<div class="content" id="content">
				<div style="text-align: center; color: #9fb0c0; padding: 40px;">
					Enter a stock symbol to begin analysis
				</div>
			</div>
			<div class="loading-overlay hidden" id="loading-overlay">
				<div class="loading-content">
					<div class="loading-text">Loading data</div>
					<div class="loading-subtext">Hang tight, traffic is booming.</div>
					<div class="progress-bar-container">
						<div class="progress-bar" id="progress-bar"></div>
					</div>
				</div>
			</div>
			
			<div class="disclaimer-footer">
				<div>
					The information provided on this website is for general informational and educational purposes only and does not constitute investment advice, financial advice, trading advice, or any other form of recommendation. All content is provided without regard to individual financial circumstances, investment objectives, or risk tolerance. Past performance is not indicative of future results. Financial markets are subject to risk, and investing may result in the loss of part or all of your capital. Any actions taken based on the information on this website are strictly at your own risk. Before making any investment decision, you should conduct your own research and, where appropriate, consult a licensed financial advisor. By using this website, you acknowledge and agree to this disclaimer. <a href="#" id="disclaimer-link-full">Full Disclaimer</a>
				</div>
			</div>
		`;
		
		this.shadowRoot.getElementById('back-btn')?.addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'market-overview' } }));
		});
		
		// Setup refresh button
		this.setupRefreshButton();
		
		// Setup share button
		this.setupShareButton();
		
		// Setup info icon
		this.setupInfoIcon();
		
		// Setup theme toggle
		this.setupThemeToggle();
		
		// Setup autocomplete
		this.setupAutocomplete();
		
		// Listen for rate limit cooldown events
		window.addEventListener('rate-limit-cooldown', (e) => {
			this.handleRateLimitCooldown(e.detail.active);
		});
		
		this.shadowRoot.getElementById('search-btn')?.addEventListener('click', () => {
			const symbol = this.shadowRoot.getElementById('symbol-input').value.trim().toUpperCase();
			if (symbol) {
				this.hideAutocomplete();
				this.loadStock(symbol);
			}
		});
		
		this.shadowRoot.getElementById('symbol-input')?.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				const symbol = e.target.value.trim().toUpperCase();
				if (symbol) {
					this.hideAutocomplete();
					this.loadStock(symbol);
				}
			}
		});
		
		// Disclaimer link
		this.shadowRoot.getElementById('disclaimer-link-full')?.addEventListener('click', (e) => {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'disclaimer' } }));
		});
		
		// If symbol is provided as attribute, load it automatically
		// Use multiple fallbacks to ensure symbol is loaded even on direct URL access
		const checkAndLoadSymbol = () => {
			// Try multiple ways to get the symbol
			let symbol = this.symbol || this.getAttribute('symbol');
			
			// If still no symbol, try to parse from URL (for direct access)
			if (!symbol) {
				const path = window.location.pathname;
				if (path.startsWith('/stock/')) {
					symbol = decodeURIComponent(path.split('/stock/')[1].split('/')[0].split('?')[0]);
				}
			}
			
			if (symbol) {
				console.log('[StockAnalysis] Symbol found on load:', symbol);
				this.symbol = symbol;
				requestAnimationFrame(() => {
					const input = this.shadowRoot.getElementById('symbol-input');
					if (input) {
						input.value = symbol;
					}
					// Always load stock, even if input not found yet
					this.loadStock(symbol);
				});
			} else {
				console.log('[StockAnalysis] No symbol provided on load');
			}
		};
		
		// Try immediately
		checkAndLoadSymbol();
		
		// Also try after a short delay to catch any timing issues
		setTimeout(checkAndLoadSymbol, 100);
	}
	
	setupRefreshButton() {
		const refreshBtn = this.shadowRoot.getElementById('refresh-btn');
		if (!refreshBtn) return;
		
		refreshBtn.addEventListener('click', () => {
			if (!this.symbol) {
				console.log('[StockAnalysis] No symbol to refresh');
				return;
			}
			
			// Prevent multiple clicks
			if (refreshBtn.classList.contains('refreshing')) {
				return;
			}
			
			// Import clearSymbolCache function
			import('../utils/cache.js').then(({ clearSymbolCache }) => {
				// Clear cache for current symbol
				clearSymbolCache(this.symbol);
				console.log(`[StockAnalysis] Cleared cache for ${this.symbol}, reloading...`);
				
				// Show refreshing state
				refreshBtn.classList.add('refreshing');
				const icon = refreshBtn.querySelector('.refresh-icon');
				if (icon) icon.classList.add('refreshing');
				
				// Reload stock data
				this.loadStock(this.symbol).finally(() => {
					// Remove refreshing state after a short delay
					setTimeout(() => {
						refreshBtn.classList.remove('refreshing');
						if (icon) icon.classList.remove('refreshing');
					}, 1000);
				});
			}).catch(error => {
				console.error('[StockAnalysis] Error importing cache utils:', error);
			});
		});
	}
	
	setupShareButton() {
		const shareBtn = this.shadowRoot.getElementById('share-btn');
		const shareModal = this.shadowRoot.getElementById('share-modal');
		const shareModalClose = this.shadowRoot.getElementById('share-modal-close');
		const shareUrlInput = this.shadowRoot.getElementById('share-url-input');
		const copyUrlBtn = this.shadowRoot.getElementById('copy-url-btn');
		const shareOptions = this.shadowRoot.getElementById('share-options');
		
		if (!shareBtn || !shareModal) return;
		
		// Open modal on share button click
		shareBtn.addEventListener('click', () => {
			if (!this.symbol) {
				alert('Please select a stock to share.');
				return;
			}
			
			// Generate share URL
			const shareUrl = this.getShareUrl();
			if (shareUrlInput) {
				shareUrlInput.value = shareUrl;
			}
			
			// Generate share options
			this.renderShareOptions(shareOptions, shareUrl);
			
			// Show modal
			shareModal.classList.add('show');
		});
		
		// Close modal on close button click
		if (shareModalClose) {
			shareModalClose.addEventListener('click', () => {
				shareModal.classList.remove('show');
			});
		}
		
		// Close modal on background click
		shareModal.addEventListener('click', (e) => {
			if (e.target === shareModal) {
				shareModal.classList.remove('show');
			}
		});
		
		// Close modal on Escape key
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && shareModal.classList.contains('show')) {
				shareModal.classList.remove('show');
			}
		});
		
		// Copy URL to clipboard
		if (copyUrlBtn && shareUrlInput) {
			copyUrlBtn.addEventListener('click', async () => {
				try {
					await navigator.clipboard.writeText(shareUrlInput.value);
					const originalText = copyUrlBtn.textContent;
					copyUrlBtn.textContent = 'Copied!';
					copyUrlBtn.classList.add('copied');
					
					setTimeout(() => {
						copyUrlBtn.textContent = originalText;
						copyUrlBtn.classList.remove('copied');
					}, 2000);
				} catch (err) {
					// Fallback for older browsers
					shareUrlInput.select();
					document.execCommand('copy');
					const originalText = copyUrlBtn.textContent;
					copyUrlBtn.textContent = 'Copied!';
					copyUrlBtn.classList.add('copied');
					
					setTimeout(() => {
						copyUrlBtn.textContent = originalText;
						copyUrlBtn.classList.remove('copied');
					}, 2000);
				}
			});
		}
	}
	
	getShareUrl() {
		if (!this.symbol) return window.location.href;
		
		const baseUrl = window.location.origin;
		return `${baseUrl}/stock/${encodeURIComponent(this.symbol)}`;
	}
	
	renderShareOptions(container, shareUrl) {
		if (!container) return;
		
		const shareText = `${this.symbol} Stock Analysis - Comprehensive analysis with charts, fundamentals, earnings, and more`;
		const encodedUrl = encodeURIComponent(shareUrl);
		const encodedText = encodeURIComponent(shareText);
		
		// Check if Web Share API is available
		const hasWebShare = navigator.share !== undefined;
		
		container.innerHTML = '';
		
		// Native Share (if available)
		if (hasWebShare) {
			const nativeOption = document.createElement('div');
			nativeOption.className = 'share-option native';
			nativeOption.innerHTML = `
				<div class="share-option-icon">📱</div>
				<div class="share-option-label">Share</div>
			`;
			nativeOption.addEventListener('click', async () => {
				try {
					await navigator.share({
						title: `${this.symbol} Stock Analysis`,
						text: shareText,
						url: shareUrl
					});
				} catch (err) {
					if (err.name !== 'AbortError') {
						console.error('Error sharing:', err);
					}
				}
			});
			container.appendChild(nativeOption);
		}
		
		// Twitter
		const twitterOption = document.createElement('div');
		twitterOption.className = 'share-option twitter';
		twitterOption.innerHTML = `
			<div class="share-option-icon">🐦</div>
			<div class="share-option-label">Twitter</div>
		`;
		twitterOption.addEventListener('click', () => {
			const twitterUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
			window.open(twitterUrl, '_blank', 'width=550,height=420');
		});
		container.appendChild(twitterOption);
		
		// LinkedIn
		const linkedinOption = document.createElement('div');
		linkedinOption.className = 'share-option linkedin';
		linkedinOption.innerHTML = `
			<div class="share-option-icon">💼</div>
			<div class="share-option-label">LinkedIn</div>
		`;
		linkedinOption.addEventListener('click', () => {
			const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
			window.open(linkedinUrl, '_blank', 'width=550,height=420');
		});
		container.appendChild(linkedinOption);
		
		// Facebook
		const facebookOption = document.createElement('div');
		facebookOption.className = 'share-option facebook';
		facebookOption.innerHTML = `
			<div class="share-option-icon">📘</div>
			<div class="share-option-label">Facebook</div>
		`;
		facebookOption.addEventListener('click', () => {
			const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
			window.open(facebookUrl, '_blank', 'width=550,height=420');
		});
		container.appendChild(facebookOption);
	}
	
	setupInfoIcon() {
		const infoIcon = this.shadowRoot.getElementById('info-icon');
		const infoModal = this.shadowRoot.getElementById('info-modal');
		const closeBtn = this.shadowRoot.getElementById('info-modal-close');
		
		if (!infoIcon || !infoModal) return;
		
		// Open modal on icon click
		infoIcon.addEventListener('click', () => {
			infoModal.classList.add('show');
		});
		
		// Close modal on close button click
		if (closeBtn) {
			closeBtn.addEventListener('click', () => {
				infoModal.classList.remove('show');
			});
		}
		
		// Close modal on background click
		infoModal.addEventListener('click', (e) => {
			if (e.target === infoModal) {
				infoModal.classList.remove('show');
			}
		});
		
		// Close modal on Escape key
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && infoModal.classList.contains('show')) {
				infoModal.classList.remove('show');
			}
		});
	}
	
	setupThemeToggle() {
		const toggle = this.shadowRoot.getElementById('theme-toggle');
		if (!toggle) return;
		
		// Check saved preference
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.applyLightMode(true);
		}
		
		toggle.addEventListener('click', () => {
			const isLight = this.classList.contains('light-mode');
			this.applyLightMode(!isLight);
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
		
		// Update all child components
		this.updateChildComponentsTheme(enable);
		
		// Dispatch theme change event for chart components
		window.dispatchEvent(new CustomEvent('themechange'));
	}
	
	updateChildComponentsTheme(enable) {
		const content = this.shadowRoot.getElementById('content');
		if (!content) return;
		
		const components = content.querySelectorAll('stock-chart, stock-description, stock-indicators, stock-fundamentals, stock-peer-comparison, stock-news, stock-earnings, stock-sentiment, stock-analyst-recommendation, stock-analyst-timeline, stock-swot, stock-risk-analysis');
		components.forEach(comp => {
			if (enable) {
				comp.classList.add('light-mode');
			} else {
				comp.classList.remove('light-mode');
			}
		});
	}
	
	setupAutocomplete() {
		const input = this.shadowRoot.getElementById('symbol-input');
		const dropdown = this.shadowRoot.getElementById('autocomplete-dropdown');
		if (!input || !dropdown) return;
		
		let debounceTimer = null;
		let selectedIndex = -1;
		let results = [];
		
		// Input event for typing
		input.addEventListener('input', (e) => {
			const query = e.target.value.trim();
			
			// Clear previous timer
			if (debounceTimer) clearTimeout(debounceTimer);
			
			// Reset selection
			selectedIndex = -1;
			
			if (query.length < 1) {
				this.hideAutocomplete();
				return;
			}
			
			// Show loading
			dropdown.innerHTML = '<div class="autocomplete-loading">Searching...</div>';
			dropdown.classList.add('show');
			
			// Debounce the search
			debounceTimer = setTimeout(() => {
				this.searchSymbols(query);
			}, 300);
		});
		
		// Keyboard navigation
		input.addEventListener('keydown', (e) => {
			const items = dropdown.querySelectorAll('.autocomplete-item');
			
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
				this.updateSelection(items, selectedIndex);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				this.updateSelection(items, selectedIndex);
			} else if (e.key === 'Enter' && selectedIndex >= 0 && items[selectedIndex]) {
				e.preventDefault();
				const symbol = items[selectedIndex].dataset.symbol;
				input.value = symbol;
				this.hideAutocomplete();
				this.loadStock(symbol);
			} else if (e.key === 'Escape') {
				this.hideAutocomplete();
			}
		});
		
		// Close dropdown when clicking outside
		document.addEventListener('click', (e) => {
			if (!this.shadowRoot.contains(e.target)) {
				this.hideAutocomplete();
			}
		});
		
		// Also close when clicking inside shadowRoot but outside search box
		this.shadowRoot.addEventListener('click', (e) => {
			const searchBox = this.shadowRoot.querySelector('.search-box');
			if (searchBox && !searchBox.contains(e.target)) {
				this.hideAutocomplete();
			}
		});
	}
	
	async searchSymbols(query) {
		const dropdown = this.shadowRoot.getElementById('autocomplete-dropdown');
		if (!dropdown) return;
		
		try {
			console.log('[Search] Fetching:', `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
			const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
			
			console.log('[Search] Response status:', response.status);
			
			if (!response.ok) {
				console.error('[Search] Server error:', response.status, response.statusText);
				dropdown.innerHTML = `<div class="autocomplete-empty">Server error (${response.status})</div>`;
				return;
			}
			
			const data = await response.json();
			console.log('[Search] Results:', data);
			const results = data.results || [];
			
			if (results.length === 0) {
				dropdown.innerHTML = '<div class="autocomplete-empty">No results found - try a different term</div>';
				return;
			}
			
			dropdown.innerHTML = results.map((item, index) => `
				<div class="autocomplete-item" data-symbol="${item.symbol}" data-index="${index}">
					<span class="autocomplete-symbol">${item.symbol}</span>
					<span class="autocomplete-name">${item.name}</span>
					<span class="autocomplete-type">${item.type}</span>
					<div class="autocomplete-score" id="score-${item.symbol.replace('.', '-')}">
						<div class="loading-dots"><span></span><span></span><span></span></div>
					</div>
				</div>
			`).join('');
			
			// Add click handlers
			dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
				item.addEventListener('click', () => {
					const symbol = item.dataset.symbol;
					const input = this.shadowRoot.getElementById('symbol-input');
					if (input) input.value = symbol;
					this.hideAutocomplete();
					this.loadStock(symbol);
				});
			});
			
			// Load data scores asynchronously
			this.loadDataScores(results.map(r => r.symbol));
			
		} catch (error) {
			console.error('[Autocomplete] Error:', error);
			// Check if it's a network error (server not running)
			if (error.name === 'TypeError' && error.message.includes('fetch')) {
				dropdown.innerHTML = '<div class="autocomplete-empty">Backend not running - start python_backend.py</div>';
			} else {
				dropdown.innerHTML = `<div class="autocomplete-empty">Connection error</div>`;
			}
		}
	}
	
	updateSelection(items, selectedIndex) {
		items.forEach((item, i) => {
			item.classList.toggle('selected', i === selectedIndex);
		});
		
		// Scroll into view if needed
		if (items[selectedIndex]) {
			items[selectedIndex].scrollIntoView({ block: 'nearest' });
		}
	}
	
	hideAutocomplete() {
		const dropdown = this.shadowRoot.getElementById('autocomplete-dropdown');
		if (dropdown) {
			dropdown.classList.remove('show');
			dropdown.innerHTML = '';
		}
	}
	
	renderDataScore(score, maxScore = 1) {
		const isComplete = score >= 1;
		const dot = isComplete 
			? '<span class="score-dot filled"></span>' 
			: '<span class="score-dot"></span>';
		const label = isComplete ? 'Complete Data' : 'Incomplete Data';
		const labelColor = isComplete ? '#22c55e' : '#ef4444';
		return `<span class="score-label" style="color: ${labelColor};">${label}</span>${dot}`;
	}
	
	async loadDataScores(symbols) {
		if (!symbols || symbols.length === 0) return;
		
		try {
			const response = await fetch(`${API_BASE_URL}/api/check-data?symbols=${symbols.join(',')}`);
			if (!response.ok) return;
			
			const data = await response.json();
			const scores = data.scores || {};
			
			// Update the score displays
			for (const symbol of symbols) {
				const scoreData = scores[symbol];
				if (scoreData) {
					const scoreEl = this.shadowRoot.getElementById(`score-${symbol.replace('.', '-')}`);
					if (scoreEl) {
						scoreEl.innerHTML = this.renderDataScore(scoreData.score, scoreData.maxScore);
					}
				}
			}
			
			// Re-sort items by score
			const dropdown = this.shadowRoot.getElementById('autocomplete-dropdown');
			if (dropdown) {
				const items = Array.from(dropdown.querySelectorAll('.autocomplete-item'));
				items.sort((a, b) => {
					const scoreA = scores[a.dataset.symbol]?.score || 0;
					const scoreB = scores[b.dataset.symbol]?.score || 0;
					return scoreB - scoreA;
				});
				items.forEach(item => dropdown.appendChild(item));
			}
		} catch (error) {
			console.log('[DataScores] Could not load scores:', error.message);
		}
	}
	
	async loadStock(symbol) {
		this.symbol = symbol;
		
		const content = this.shadowRoot.getElementById('content');
		const loadingOverlay = this.shadowRoot.getElementById('loading-overlay');
		const pageTitle = this.shadowRoot.getElementById('page-title');
		
		// Don't show loading overlay - render components immediately
		if (loadingOverlay) {
			loadingOverlay.classList.add('hidden');
			loadingOverlay.style.display = 'none';
		}
		
		// Fetch company name for the header
		this.updatePageTitle(symbol, pageTitle);
		
		// Render components IMMEDIATELY - don't wait for anything
		// The custom elements will initialize automatically once their classes are loaded
		content.innerHTML = `
			<div style="display: grid; gap: 15px; max-width: 1400px; width: 100%; margin: 0 auto; box-sizing: border-box;">
				<div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px; align-items: stretch; min-width: 0;">
					<stock-chart symbol="${symbol}" style="min-width: 0; overflow: hidden;"></stock-chart>
					<stock-description symbol="${symbol}" style="min-width: 0; overflow: hidden;"></stock-description>
				</div>
				<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; min-width: 0;">
					<stock-indicators symbol="${symbol}" style="min-width: 0; overflow: hidden;"></stock-indicators>
					<stock-fundamentals symbol="${symbol}" style="min-width: 0; overflow: hidden;"></stock-fundamentals>
					<stock-peer-comparison symbol="${symbol}" style="min-width: 0; overflow: hidden;"></stock-peer-comparison>
				</div>
				<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; min-width: 0;">
					<stock-analyst-recommendation symbol="${symbol}" style="min-width: 0; overflow: hidden;"></stock-analyst-recommendation>
					<stock-analyst-timeline symbol="${symbol}" style="min-width: 0; overflow: hidden;"></stock-analyst-timeline>
					<stock-earnings symbol="${symbol}" style="min-width: 0; overflow: hidden;"></stock-earnings>
				</div>
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; min-width: 0;">
					<stock-risk-analysis symbol="${symbol}" style="min-width: 0; overflow: hidden;"></stock-risk-analysis>
					<stock-sentiment symbol="${symbol}" style="min-width: 0; overflow: hidden;"></stock-sentiment>
				</div>
				<stock-news symbol="${symbol}" style="min-width: 0; overflow: hidden;"></stock-news>
				<stock-swot symbol="${symbol}" style="min-width: 0; overflow: hidden;"></stock-swot>
			</div>
		`;
		
		// Hide overlay immediately so chart can load
		if (loadingOverlay) {
			loadingOverlay.classList.add('hidden');
			loadingOverlay.style.display = 'none';
		}
		
		// Load aggregated stock overview data and import components in parallel (non-blocking)
		// This happens in the background while components are already visible
		Promise.all([
			// Load aggregated data
			(async () => {
				try {
					const { getCachedData, setCachedData } = await import('../utils/cache.js');
					
					// Check if we have fresh cached overview data
					const cachedOverview = getCachedData(symbol, 'stock-overview');
					if (!cachedOverview) {
						console.log(`[StockAnalysis] Loading aggregated data for ${symbol}...`);
						
						// Fetch aggregated data from backend
						const overviewResponse = await fetch(`${API_BASE_URL}/api/stock-overview/${symbol}`);
						if (overviewResponse.ok) {
							const overviewData = await overviewResponse.json();
							
							// Cache the aggregated data
							setCachedData(symbol, 'stock-overview', overviewData);
							
							// Also cache individual data types for components that might check individual caches
							if (overviewData.fundamentals) {
								setCachedData(symbol, 'fundamentals', overviewData.fundamentals);
							}
							if (overviewData.dividends) {
								setCachedData(symbol, 'dividends', overviewData.dividends);
							}
							if (overviewData.earnings) {
								setCachedData(symbol, 'earnings', overviewData.earnings);
							}
							if (overviewData.price_changes) {
								setCachedData(symbol, 'price-changes', overviewData.price_changes);
							}
							if (overviewData.sentiment) {
								setCachedData(symbol, 'sentiment', overviewData.sentiment);
							}
							if (overviewData.news) {
								setCachedData(symbol, 'news', overviewData.news);
							}
							
							console.log(`[StockAnalysis] Cached aggregated data for ${symbol}`);
						} else {
							console.warn(`[StockAnalysis] Failed to load aggregated data: ${overviewResponse.status}`);
						}
					} else {
						console.log(`[StockAnalysis] Using cached aggregated data for ${symbol}`);
					}
				} catch (error) {
					console.warn(`[StockAnalysis] Error loading aggregated data:`, error);
				}
			})(),
			// Import components
			(async () => {
				try {
					// Load all modules in parallel
					const [
						chartModule,
						indicatorsModule,
						fundamentalsModule,
						peerModule,
						swotModule,
						newsModule,
						analystRecModule,
						analystTimelineModule,
						earningsModule,
						sentimentModule,
						descriptionModule,
						riskModule
					] = await Promise.all([
						import('../components/StockChart.js'),
						import('../components/StockIndicators.js'),
						import('../components/StockFundamentals.js'),
						import('../components/StockPeerComparison.js'),
						import('../components/StockSwot.js'),
						import('../components/StockNews.js'),
						import('../components/StockAnalystRecommendation.js'),
						import('../components/StockAnalystTimeline.js'),
						import('../components/StockEarnings.js'),
						import('../components/StockSentiment.js'),
						import('../components/StockDescription.js'),
						import('../components/StockRiskAnalysis.js')
					]);
					
					// Define custom elements if not already defined
					if (!customElements.get('stock-chart')) customElements.define('stock-chart', chartModule.StockChart);
					if (!customElements.get('stock-indicators')) customElements.define('stock-indicators', indicatorsModule.StockIndicators);
					if (!customElements.get('stock-fundamentals')) customElements.define('stock-fundamentals', fundamentalsModule.StockFundamentals);
					if (!customElements.get('stock-peer-comparison')) customElements.define('stock-peer-comparison', peerModule.StockPeerComparison);
					if (!customElements.get('stock-swot')) customElements.define('stock-swot', swotModule.StockSwot);
					if (!customElements.get('stock-news')) customElements.define('stock-news', newsModule.StockNews);
					if (!customElements.get('stock-analyst-recommendation')) customElements.define('stock-analyst-recommendation', analystRecModule.StockAnalystRecommendation);
					if (!customElements.get('stock-analyst-timeline')) customElements.define('stock-analyst-timeline', analystTimelineModule.StockAnalystTimeline);
					if (!customElements.get('stock-earnings')) customElements.define('stock-earnings', earningsModule.StockEarnings);
					if (!customElements.get('stock-sentiment')) customElements.define('stock-sentiment', sentimentModule.StockSentiment);
					if (!customElements.get('stock-description')) customElements.define('stock-description', descriptionModule.StockDescription);
					if (!customElements.get('stock-risk-analysis')) customElements.define('stock-risk-analysis', riskModule.StockRiskAnalysis);
					
					// Ensure components are properly initialized after DOM update
					setTimeout(() => {
						// Apply current theme to all child components
						const isLightMode = this.classList.contains('light-mode');
						this.updateChildComponentsTheme(isLightMode);
						
						// Force attribute change to trigger data loading if needed
						const components = content.querySelectorAll('stock-chart, stock-indicators, stock-fundamentals, stock-peer-comparison, stock-swot, stock-analyst-recommendation, stock-analyst-timeline, stock-earnings, stock-sentiment, stock-risk-analysis');
						components.forEach(comp => {
							if (comp.hasAttribute('symbol')) {
								const sym = comp.getAttribute('symbol');
								comp.setAttribute('symbol', sym); // Trigger attributeChangedCallback
							}
						});
					}, 100);
				} catch (error) {
					console.error('Error importing components:', error);
					// Don't show error - components might already be defined from previous load
				}
			})()
		]).catch(error => {
			console.warn('[StockAnalysis] Error in background loading:', error);
			// Continue anyway - components will work with fallback endpoints
		});
	}
	
	async updatePageTitle(symbol, titleElement) {
		if (!titleElement) return;
		
		// Keep title as "Stock Analysis" - company name is shown in the chart tile
		titleElement.textContent = 'Stock Analysis';
		
		// Set default title immediately - don't wait for API call
		document.title = `${symbol} | Stock Analysis Platform`;
		
		// Try to fetch company name in background (non-blocking)
		// This is optional and won't delay page loading
		fetch(`${API_BASE_URL}/api/fundamentals/${symbol}`)
			.then(response => {
				if (!response.ok) return null;
				return response.json();
			})
			.then(data => {
				if (!data) return;
				
				// Extract company name from profile
				let profile = {};
				if (data?.quoteSummary?.result?.[0]?.summaryProfile) {
					profile = data.quoteSummary.result[0].summaryProfile;
				} else if (data?.profile) {
					profile = data.profile;
				} else if (data?.quoteSummary?.result?.[0]) {
					const result = data.quoteSummary.result[0];
					profile = result.summaryProfile || result.profile || {};
				}
				
				const companyName = profile.longName || profile.name || profile.ticker || symbol;
				
				// Update browser tab title only, not the page title element
				document.title = `${companyName} | Stock Analysis Platform`;
			})
			.catch(error => {
				// Silently fail - default title is already set
				console.log('[StockAnalysis] Could not fetch company name:', error.message);
			});
	}
	
	setupTouchGestures() {
		// Only enable on mobile devices
		if (window.innerWidth > 768) return;
		
		let touchStartX = 0;
		let touchStartY = 0;
		let touchEndX = 0;
		let touchEndY = 0;
		const minSwipeDistance = 50;
		
		// Prevent default touch behaviors that interfere with gestures
		document.addEventListener('touchstart', (e) => {
			touchStartX = e.changedTouches[0].screenX;
			touchStartY = e.changedTouches[0].screenY;
		}, { passive: true });
		
		document.addEventListener('touchend', (e) => {
			touchEndX = e.changedTouches[0].screenX;
			touchEndY = e.changedTouches[0].screenY;
			this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY, minSwipeDistance);
		}, { passive: true });
	}
	
	handleSwipe(startX, startY, endX, endY, minDistance) {
		const deltaX = endX - startX;
		const deltaY = endY - startY;
		
		// Check if it's a horizontal swipe (more horizontal than vertical)
		if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minDistance) {
			if (deltaX > 0) {
				// Swipe right → Go back
				const backBtn = this.shadowRoot.getElementById('back-btn');
				if (backBtn && !this.isModalOpen()) {
					backBtn.click();
				}
			}
			// Swipe left could be used for forward navigation in the future
		}
	}
	
	isModalOpen() {
		// Check if any modal is currently open
		const shareModal = this.shadowRoot.getElementById('share-modal');
		const infoModal = this.shadowRoot.getElementById('info-modal');
		
		return (shareModal && shareModal.classList.contains('show')) ||
		       (infoModal && infoModal.classList.contains('show'));
	}
	
	handleRateLimitCooldown(active) {
		const input = this.shadowRoot.getElementById('symbol-input');
		const searchBtn = this.shadowRoot.getElementById('search-btn');
		const dropdown = this.shadowRoot.getElementById('autocomplete-dropdown');
		
		if (input) {
			input.disabled = active;
			if (active) {
				input.placeholder = 'Search disabled - Please wait for cooldown period';
				input.style.opacity = '0.5';
				input.style.cursor = 'not-allowed';
			} else {
				input.placeholder = 'Search by name or symbol (e.g., Apple, AAPL)';
				input.style.opacity = '1';
				input.style.cursor = 'text';
			}
		}
		
		if (searchBtn) {
			searchBtn.disabled = active;
			searchBtn.style.opacity = active ? '0.5' : '1';
			searchBtn.style.cursor = active ? 'not-allowed' : 'pointer';
		}
		
		if (active && dropdown) {
			dropdown.classList.remove('show');
		}
	}
}


import { API_BASE_URL } from '../config.js';

export class MarketOverview extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.selectedTimeRange = '1D'; // Default: 1 Day
		this.cachedData = null; // Cache for index/macro data
		this.topPerformers = []; // Cache for top performers
		this.searchController = null; // AbortController for search requests
		this.currentSearchQuery = null; // Track current search query to avoid race conditions
	}

	connectedCallback() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					width: 100%;
					min-width: 1200px;
					padding: 20px;
					padding-top: 50px;
					max-width: 1400px;
					margin: 0 auto;
				}
				
				/* Light Mode Variables - only applied when class is set */
				:host(.light-mode) {
					--bg-primary: #c8d0da;
					--bg-secondary: #d5dce5;
					--bg-tertiary: #b8c2ce;
					--bg-card: #dde3ea;
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
				:host(.light-mode) .theme-switch-track:hover {
					border-color: var(--accent-blue);
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
				
				/* ========== AI SUMMARY BUTTON ========== */
				.ai-summary-btn {
					display: flex;
					align-items: center;
					gap: 8px;
					background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
					color: #ffffff;
					border: none;
					padding: 8px 16px;
					border-radius: 20px;
					font-size: 0.85rem;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s ease;
					box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
					margin-left: 12px;
				}
				.ai-summary-btn:hover {
					background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
					box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4);
					transform: translateY(-1px);
				}
				.ai-summary-btn:active {
					transform: translateY(0);
				}
				.ai-summary-btn:disabled {
					opacity: 0.6;
					cursor: not-allowed;
					transform: none;
				}
				.ai-icon {
					font-size: 1rem;
					line-height: 1;
				}
				
				/* ========== REFRESH BUTTON ========== */
				.refresh-btn {
					display: flex;
					align-items: center;
					gap: 8px;
					background: linear-gradient(135deg, #10b981 0%, #059669 100%);
					color: #ffffff;
					border: none;
					padding: 8px 16px;
					border-radius: 20px;
					font-size: 0.85rem;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s ease;
					box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
					margin-right: 12px;
				}
				.refresh-btn:hover {
					background: linear-gradient(135deg, #059669 0%, #047857 100%);
					box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
					transform: translateY(-1px);
				}
				.refresh-btn:active {
					transform: translateY(0);
				}
				.refresh-btn:disabled {
					opacity: 0.6;
					cursor: not-allowed;
					transform: none;
				}
				.refresh-btn.refreshing .refresh-icon {
					animation: spin 1s linear infinite;
				}
				.refresh-icon {
					font-size: 1rem;
					line-height: 1;
					display: inline-block;
				}
				@keyframes spin {
					from {
						transform: rotate(0deg);
					}
					to {
						transform: rotate(360deg);
					}
				}
				:host(.light-mode) .refresh-btn {
					background: linear-gradient(135deg, #10b981 0%, #059669 100%);
				}
				
				/* ========== AI SUMMARY MODAL ========== */
				.ai-summary-modal-overlay {
					display: none;
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background: rgba(0, 0, 0, 0.7);
					backdrop-filter: blur(4px);
					z-index: 10000;
					align-items: center;
					justify-content: center;
				}
				.ai-summary-modal-overlay.show {
					display: flex;
				}
				.ai-summary-modal {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					width: 90%;
					max-width: 800px;
					max-height: 85vh;
					display: flex;
					flex-direction: column;
					box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
				}
				:host(.light-mode) .ai-summary-modal {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.ai-summary-modal-header {
					padding: 20px;
					border-bottom: 1px solid #1f2a37;
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-shrink: 0;
				}
				:host(.light-mode) .ai-summary-modal-header {
					border-bottom-color: #a0aab8;
				}
				.ai-summary-modal-title {
					font-size: 1.4rem;
					font-weight: 700;
					color: #e6edf3;
					display: flex;
					align-items: center;
					gap: 12px;
				}
				:host(.light-mode) .ai-summary-modal-title {
					color: #0a0a0a;
				}
				.ai-summary-modal-close {
					background: transparent;
					border: none;
					color: #9fb0c0;
					font-size: 1.5rem;
					cursor: pointer;
					padding: 8px;
					border-radius: 8px;
					transition: all 0.2s ease;
					line-height: 1;
				}
				.ai-summary-modal-close:hover {
					background: rgba(239, 68, 68, 0.2);
					color: #ef4444;
				}
				.ai-summary-modal-content {
					padding: 20px;
					overflow-y: auto;
					flex: 1;
					color: #e6edf3;
					line-height: 1.7;
					font-size: 0.95rem;
				}
				:host(.light-mode) .ai-summary-modal-content {
					color: #0a0a0a;
				}
				.ai-summary-modal-content h1 {
					font-size: 1.8rem;
					font-weight: 700;
					color: #e6edf3;
					margin: 20px 0 15px 0;
					padding-bottom: 10px;
					border-bottom: 2px solid #1f2a37;
				}
				:host(.light-mode) .ai-summary-modal-content h1 {
					color: #0a0a0a;
					border-bottom-color: #a0aab8;
				}
				.ai-summary-modal-content h2 {
					font-size: 1.4rem;
					font-weight: 700;
					color: #4ea1f3;
					margin: 25px 0 12px 0;
					padding-top: 10px;
				}
				:host(.light-mode) .ai-summary-modal-content h2 {
					color: #1d4ed8;
				}
				.ai-summary-modal-content h3 {
					font-size: 1.1rem;
					font-weight: 600;
					color: #9fb0c0;
					margin: 18px 0 10px 0;
				}
				:host(.light-mode) .ai-summary-modal-content h3 {
					color: #1a1a1a;
				}
				.ai-summary-modal-content p {
					margin: 12px 0;
					line-height: 1.7;
				}
				.ai-summary-modal-content ul {
					margin: 12px 0;
					padding-left: 25px;
				}
				.ai-summary-modal-content li {
					margin: 8px 0;
					line-height: 1.6;
				}
				.ai-summary-modal-content strong {
					color: #4ea1f3;
					font-weight: 600;
				}
				:host(.light-mode) .ai-summary-modal-content strong {
					color: #1d4ed8;
				}
				.ai-summary-modal-content::-webkit-scrollbar {
					width: 8px;
				}
				.ai-summary-modal-content::-webkit-scrollbar-track {
					background: #0b0f14;
					border-radius: 4px;
				}
				.ai-summary-modal-content::-webkit-scrollbar-thumb {
					background: #1f2a37;
					border-radius: 4px;
				}
				.ai-summary-modal-content::-webkit-scrollbar-thumb:hover {
					background: #2d3748;
				}
				:host(.light-mode) .ai-summary-modal-content::-webkit-scrollbar-track {
					background: #c0c9d4;
				}
				:host(.light-mode) .ai-summary-modal-content::-webkit-scrollbar-thumb {
					background: #a0aab8;
				}
				:host(.light-mode) .ai-summary-modal-content::-webkit-scrollbar-thumb:hover {
					background: #8b95a3;
				}
				.ai-summary-loading {
					text-align: center;
					padding: 40px;
					color: #9fb0c0;
				}
				:host(.light-mode) .ai-summary-loading {
					color: #1a1a1a;
				}
				.ai-summary-cache-info {
					background: rgba(78, 161, 243, 0.1);
					border: 1px solid rgba(78, 161, 243, 0.3);
					border-radius: 8px;
					padding: 12px 16px;
					margin-bottom: 20px;
					font-size: 0.85rem;
					color: #4ea1f3;
					text-align: center;
				}
				:host(.light-mode) .ai-summary-cache-info {
					background: rgba(29, 78, 216, 0.1);
					border-color: rgba(29, 78, 216, 0.3);
					color: #1d4ed8;
				}
				.ai-summary-error {
					text-align: center;
					padding: 40px;
					color: #ef4444;
				}
				.ai-summary-modal-disclaimer {
					padding: 15px 20px;
					border-top: 1px solid #1f2a37;
					font-size: 0.75rem;
					color: #6b7280;
					line-height: 1.5;
					flex-shrink: 0;
				}
				:host(.light-mode) .ai-summary-modal-disclaimer {
					border-top-color: #a0aab8;
					color: #4b5563;
				}
				
				/* ========== OVERVIEW INFO MODAL ========== */
				.overview-info-modal-overlay {
					display: none;
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background: rgba(0, 0, 0, 0.7);
					backdrop-filter: blur(4px);
					z-index: 10000;
					align-items: center;
					justify-content: center;
				}
				.overview-info-modal-overlay.show {
					display: flex;
				}
				.overview-info-modal {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					width: 90%;
					max-width: 600px;
					max-height: 85vh;
					display: flex;
					flex-direction: column;
					box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
				}
				:host(.light-mode) .overview-info-modal {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.overview-info-modal-header {
					padding: 20px;
					border-bottom: 1px solid #1f2a37;
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-shrink: 0;
				}
				:host(.light-mode) .overview-info-modal-header {
					border-bottom-color: #a0aab8;
				}
				.overview-info-modal-title {
					font-size: 1.3rem;
					font-weight: 700;
					color: #e6edf3;
					display: flex;
					align-items: center;
					gap: 10px;
				}
				:host(.light-mode) .overview-info-modal-title {
					color: #0a0a0a;
				}
				.overview-info-modal-close {
					background: transparent;
					border: none;
					color: #9fb0c0;
					font-size: 1.5rem;
					cursor: pointer;
					padding: 8px;
					border-radius: 8px;
					transition: all 0.2s ease;
					line-height: 1;
				}
				.overview-info-modal-close:hover {
					background: rgba(239, 68, 68, 0.2);
					color: #ef4444;
				}
				.overview-info-modal-content {
					padding: 20px;
					overflow-y: auto;
					flex: 1;
					color: #e6edf3;
					line-height: 1.7;
					font-size: 0.95rem;
				}
				:host(.light-mode) .overview-info-modal-content {
					color: #0a0a0a;
				}
				.overview-info-modal-content h3 {
					font-size: 1.1rem;
					font-weight: 600;
					color: #4ea1f3;
					margin: 20px 0 10px 0;
				}
				:host(.light-mode) .overview-info-modal-content h3 {
					color: #1d4ed8;
				}
				.overview-info-modal-content h3:first-child {
					margin-top: 0;
				}
				.overview-info-modal-content p {
					margin: 10px 0;
					line-height: 1.7;
				}
				.overview-info-modal-content ul {
					margin: 10px 0;
					padding-left: 25px;
				}
				.overview-info-modal-content li {
					margin: 8px 0;
					line-height: 1.6;
				}
				.overview-info-modal-content strong {
					color: #4ea1f3;
					font-weight: 600;
				}
				:host(.light-mode) .overview-info-modal-content strong {
					color: #1d4ed8;
				}
				.overview-info-modal-content::-webkit-scrollbar {
					width: 8px;
				}
				.overview-info-modal-content::-webkit-scrollbar-track {
					background: #0b0f14;
					border-radius: 4px;
				}
				.overview-info-modal-content::-webkit-scrollbar-thumb {
					background: #1f2a37;
					border-radius: 4px;
				}
				.overview-info-modal-content::-webkit-scrollbar-thumb:hover {
					background: #2d3748;
				}
				:host(.light-mode) .overview-info-modal-content::-webkit-scrollbar-track {
					background: #c0c9d4;
				}
				:host(.light-mode) .overview-info-modal-content::-webkit-scrollbar-thumb {
					background: #a0aab8;
				}
				:host(.light-mode) .overview-info-modal-content::-webkit-scrollbar-thumb:hover {
					background: #8b95a3;
				}
				
				/* ========== TOP PERFORMERS TICKER BAR ========== */
				.ticker-bar-wrapper {
					position: fixed;
					top: 0;
					left: 0;
					height: 36px;
					min-width: 1200px;
					width: 100%;
					background: #0b0f14;
					border-bottom: 1px solid #1f2a37;
					z-index: 1000;
					display: flex;
					justify-content: center;
				}
				:host(.light-mode) .ticker-bar-wrapper {
					background: var(--bg-primary);
					border-bottom-color: var(--border-color);
				}
				.ticker-bar {
					width: 100%;
					max-width: 1400px;
					height: 100%;
					background: #121821;
					overflow: hidden;
					cursor: pointer;
					display: flex;
					align-items: center;
					border-left: 1px solid #1f2a37;
					border-right: 1px solid #1f2a37;
				}
				:host(.light-mode) .ticker-bar {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.ticker-bar:hover {
					background: #161b22;
				}
				:host(.light-mode) .ticker-bar:hover {
					background: var(--bg-tertiary);
				}
				.ticker-label {
					background: #1f2a37;
					color: #e6edf3;
					padding: 0 16px;
					font-size: 0.7rem;
					font-weight: 600;
					text-transform: uppercase;
					letter-spacing: 1px;
					white-space: nowrap;
					z-index: 2;
					flex-shrink: 0;
					height: 100%;
					display: flex;
					align-items: center;
					border-right: 1px solid #2d3748;
				}
				:host(.light-mode) .ticker-label {
					background: var(--bg-tertiary);
					color: var(--text-primary);
					border-right-color: var(--border-color);
				}
				.ticker-track {
					flex: 1;
					overflow: hidden;
					position: relative;
					height: 100%;
				}
				.ticker-content {
					display: flex;
					align-items: center;
					height: 100%;
					animation: ticker-scroll 60s linear infinite;
					white-space: nowrap;
				}
				.ticker-content:hover {
					animation-play-state: paused;
				}
				@keyframes ticker-scroll {
					0% { transform: translateX(0); }
					100% { transform: translateX(-50%); }
				}
				.ticker-item {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					padding: 0 20px;
					font-size: 0.75rem;
					color: #e6edf3;
					border-right: 1px solid #21262d;
					height: 100%;
				}
				:host(.light-mode) .ticker-item {
					color: var(--text-primary);
					border-right-color: var(--border-color);
				}
				.ticker-item:last-child {
					border-right: none;
				}
				.ticker-symbol {
					font-weight: 700;
					color: #4ea1f3;
				}
				:host(.light-mode) .ticker-symbol {
					color: var(--accent-blue);
				}
				.ticker-price {
					color: #9fb0c0;
				}
				:host(.light-mode) .ticker-price {
					color: var(--text-secondary);
				}
				.ticker-change {
					font-weight: 600;
					padding: 2px 6px;
					border-radius: 4px;
					font-size: 0.7rem;
				}
				.ticker-change.positive {
					color: #10b981;
					background: rgba(16, 185, 129, 0.15);
				}
				.ticker-change.negative {
					color: #ef4444;
					background: rgba(239, 68, 68, 0.15);
				}
				.ticker-loading {
					color: #9fb0c0;
					font-size: 0.75rem;
					padding: 0 20px;
				}
				
				/* ========== TOP PERFORMERS MODAL ========== */
				.performers-modal-overlay {
					position: fixed;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					background: rgba(0, 0, 0, 0.8);
					backdrop-filter: blur(4px);
					z-index: 2000;
					display: none;
					align-items: center;
					justify-content: center;
					opacity: 0;
					transition: opacity 0.3s ease;
				}
				.performers-modal-overlay.visible {
					display: flex;
					opacity: 1;
				}
				.performers-modal {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 16px;
					width: 90%;
					max-width: 1200px;
					max-height: 85vh;
					overflow: hidden;
					display: flex;
					flex-direction: column;
					box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
					transform: translateY(20px);
					transition: transform 0.3s ease;
				}
				:host(.light-mode) .performers-modal {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.performers-modal-overlay.visible .performers-modal {
					transform: translateY(0);
				}
				.performers-modal-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					padding: 20px 24px;
					border-bottom: 1px solid #1f2a37;
					background: #0d1117;
				}
				:host(.light-mode) .performers-modal-header {
					border-bottom-color: var(--border-color);
					background: var(--bg-tertiary);
				}
				.performers-modal-title {
					font-size: 1.4rem;
					font-weight: 700;
					color: #e6edf3;
					display: flex;
					align-items: center;
					gap: 12px;
				}
				:host(.light-mode) .performers-modal-title {
					color: var(--text-primary);
				}
				.performers-modal-title .icon {
					font-size: 1.6rem;
				}
				.performers-tabs {
					display: flex;
					gap: 8px;
				}
				.performers-tab {
					padding: 8px 16px;
					background: transparent;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					color: #9fb0c0;
					font-size: 0.85rem;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s ease;
				}
				:host(.light-mode) .performers-tab {
					border-color: var(--border-color);
					color: var(--text-secondary);
				}
				.performers-tab:hover {
					background: rgba(78, 161, 243, 0.1);
					border-color: #4ea1f3;
					color: #e6edf3;
				}
				:host(.light-mode) .performers-tab:hover {
					color: var(--text-primary);
				}
				.performers-tab.active {
					background: linear-gradient(135deg, #4ea1f3 0%, #3b82f6 100%);
					border-color: transparent;
					color: #0b0f14;
				}
				.performers-close-btn {
					background: transparent;
					border: none;
					color: #9fb0c0;
					font-size: 1.5rem;
					cursor: pointer;
					padding: 8px;
					border-radius: 8px;
					transition: all 0.2s ease;
					line-height: 1;
				}
				.performers-close-btn:hover {
					background: rgba(239, 68, 68, 0.2);
					color: #ef4444;
				}
				.performers-modal-body {
					flex: 1;
					overflow-y: auto;
					padding: 20px 24px;
				}
				.performers-grid {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
					gap: 16px;
				}
				.performer-card {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 16px;
					cursor: pointer;
					transition: all 0.2s ease;
					position: relative;
					overflow: hidden;
				}
				:host(.light-mode) .performer-card {
					background: #c0c9d4;
					border-color: var(--border-color);
				}
				.performer-card::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 3px;
					transition: background 0.2s ease;
				}
				.performer-card.gainer::before {
					background: #10b981;
				}
				.performer-card.loser::before {
					background: #ef4444;
				}
				.performer-card:hover {
					border-color: #4ea1f3;
					transform: translateY(-2px);
					box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
				}
				.performer-header {
					display: flex;
					justify-content: space-between;
					align-items: flex-start;
					margin-bottom: 12px;
				}
				.performer-info {
					flex: 1;
				}
				.performer-symbol {
					font-size: 1.1rem;
					font-weight: 700;
					color: #4ea1f3;
					margin-bottom: 2px;
				}
				:host(.light-mode) .performer-symbol {
					color: var(--accent-blue);
				}
				.performer-name {
					font-size: 0.75rem;
					color: #9fb0c0;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
					max-width: 200px;
				}
				.performer-change-badge {
					padding: 6px 12px;
					border-radius: 8px;
					font-size: 0.9rem;
					font-weight: 700;
				}
				.performer-change-badge.positive {
					background: rgba(16, 185, 129, 0.2);
					color: #10b981;
				}
				.performer-change-badge.negative {
					background: rgba(239, 68, 68, 0.2);
					color: #ef4444;
				}
				.performer-body {
					display: flex;
					gap: 16px;
					align-items: stretch;
				}
				.performer-data {
					flex: 1;
				}
				.performer-price {
					font-size: 1.3rem;
					font-weight: 700;
					color: #e6edf3;
					margin-bottom: 8px;
				}
				:host(.light-mode) .performer-price {
					color: var(--text-primary);
				}
				:host(.light-mode) .performer-name {
					color: var(--text-secondary);
				}
				:host(.light-mode) .performer-change-badge.positive {
					background: rgba(5, 150, 105, 0.15);
					color: #059669;
				}
				:host(.light-mode) .performer-change-badge.negative {
					background: rgba(220, 38, 38, 0.15);
					color: #dc2626;
				}
				.performer-details {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 8px;
					font-size: 0.75rem;
				}
				.performer-detail {
					display: flex;
					flex-direction: column;
					gap: 2px;
				}
				.performer-detail-label {
					color: #6b7280;
					text-transform: uppercase;
					letter-spacing: 0.5px;
					font-size: 0.65rem;
				}
				.performer-detail-value {
					color: #e6edf3;
					font-weight: 600;
				}
				.performer-chart {
					width: 120px;
					height: 60px;
					flex-shrink: 0;
				}
				.performer-chart canvas {
					width: 100%;
					height: 100%;
				}
				.performers-loading {
					text-align: center;
					padding: 40px;
					color: #9fb0c0;
				}
				.header {
					display: grid;
					grid-template-columns: 1fr 1fr 1fr;
					align-items: center;
					margin-bottom: 20px;
					gap: 20px;
					width: 100%;
					min-width: 100%;
					box-sizing: border-box;
				}
				.header-center {
					display: flex;
					justify-content: center;
					align-items: center;
					gap: 15px;
					height: 100%;
				}
				/* ========== FEATURES BUTTONS ========== */
				.features-buttons-container {
					display: grid;
					grid-template-columns: repeat(3, auto);
					grid-template-rows: repeat(2, 1fr);
					gap: 8px;
					height: 100%;
					align-items: stretch;
					justify-content: center;
				}
				.feature-btn {
					background: #1f2a37;
					border: 1px solid #2d3748;
					color: #e6edf3;
					padding: 8px 12px;
					border-radius: 8px;
					font-size: 0.8rem;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s ease;
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 6px;
					white-space: nowrap;
					height: 100%;
					box-sizing: border-box;
				}
				:host(.light-mode) .feature-btn {
					background: var(--bg-tertiary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
				.feature-btn:hover {
					background: #2d3748;
					border-color: #4ea1f3;
					transform: translateY(-1px);
				}
				:host(.light-mode) .feature-btn:hover {
					background: var(--bg-secondary);
					border-color: var(--accent-blue);
				}
				.feature-btn:active {
					transform: translateY(0);
				}
				.features-menu-icon {
					font-size: 1rem;
					flex-shrink: 0;
				}
				.feature-btn span:not(.features-menu-icon) {
					font-size: 0.75rem;
				}
				.header-left {
					display: flex;
					align-items: center;
					justify-content: flex-start;
					padding: 0;
					margin: 0;
					box-sizing: border-box;
				}
				.header-right {
					display: flex;
					align-items: center;
					justify-content: flex-end;
					gap: 0;
					width: 100%;
					min-width: 0;
				}
				.page-title-container {
					width: 100%;
					margin-bottom: 20px;
					box-sizing: border-box;
				}
				.page-title {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 15px 30px;
					box-sizing: border-box;
					width: 100%;
					position: relative;
					display: grid;
					grid-template-columns: auto 1fr auto;
					align-items: center;
					gap: 20px;
				}
				.page-title-left {
					display: flex;
					align-items: center;
					justify-content: flex-start;
					gap: 12px;
				}
				.page-title-center {
					display: flex;
					align-items: center;
					justify-content: center;
				}
				.page-title-right {
					display: flex;
					align-items: center;
					justify-content: flex-end;
				}
				:host(.light-mode) .page-title {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.page-title h1 {
					font-size: 1.8rem;
					margin: 0;
					color: #e6edf3;
				}
				:host(.light-mode) .page-title h1 {
					color: var(--text-primary);
				}
				.header-buttons {
					display: flex;
					gap: 12px;
					align-items: center;
					position: relative;
				}
				.search-label {
					padding: 12px 16px;
					background: linear-gradient(135deg, #4ea1f3 0%, #3b82f6 100%);
					color: #0b0f14;
					border: none;
					border-radius: 12px 0 0 12px;
					font-size: 1rem;
					font-weight: 600;
					line-height: 1.2;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					box-sizing: border-box;
					box-shadow: 0 4px 12px rgba(78, 161, 243, 0.3);
					height: 56px;
					min-height: 56px;
					flex-shrink: 0;
					text-align: center;
				}
				.search-container {
					display: flex;
					gap: 0;
					align-items: center;
					width: auto;
					max-width: 100%;
					box-sizing: border-box;
					margin: 0;
					padding: 0;
				}
				.search-box {
					display: flex;
					gap: 10px;
					background: #121821;
					border: 1px solid #1f2a37;
					border-left: none;
					border-radius: 0 12px 12px 0;
					padding: 12px;
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
					height: 56px;
					min-height: 56px;
					align-items: center;
					box-sizing: border-box;
				}
				:host(.light-mode) .search-box {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.search-box input {
					flex: 1;
					background: #0b0f14;
					border: 1px solid #1f2a37;
					color: #e6edf3;
					padding: 12px 16px;
					border-radius: 8px;
					font-size: 1rem;
					outline: none;
				}
				.search-box input:focus {
					border-color: #4ea1f3;
				}
				.search-box input::placeholder {
					color: #6b7280;
				}
				:host(.light-mode) .search-box input {
					background: var(--bg-primary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
				:host(.light-mode) .search-box input:focus {
					border-color: var(--accent-blue);
				}
				:host(.light-mode) .search-box input::placeholder {
					color: var(--text-muted);
				}
				.search-box button {
					background: linear-gradient(135deg, #4ea1f3 0%, #3b82f6 100%);
					color: #0b0f14;
					border: none;
					padding: 12px 24px;
					border-radius: 8px;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s ease;
					box-shadow: 0 4px 12px rgba(78, 161, 243, 0.3);
				}
				.search-box button:hover {
					background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
					box-shadow: 0 6px 20px rgba(78, 161, 243, 0.4);
				}
				.search-input-wrapper {
					position: relative;
					flex: 1;
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
				.autocomplete-item:last-child {
					border-bottom: none;
				}
				.autocomplete-item:hover,
				.autocomplete-item.selected {
					background: #1f2a37;
				}
				:host(.light-mode) .autocomplete-item {
					border-bottom-color: var(--border-color);
				}
				:host(.light-mode) .autocomplete-item:hover,
				:host(.light-mode) .autocomplete-item.selected {
					background: var(--bg-tertiary);
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
					padding: 3px 8px;
					background: #0b0f14;
					border-radius: 4px;
					flex-shrink: 0;
				}
				:host(.light-mode) .autocomplete-type {
					color: var(--text-muted);
					background: var(--bg-primary);
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
				.autocomplete-loading,
				.autocomplete-empty {
					padding: 15px;
					color: #9fb0c0;
					text-align: center;
					font-size: 0.9rem;
				}
				.recent-searches-header {
					padding: 12px 16px;
					border-bottom: 1px solid #1f2a37;
					font-size: 0.75rem;
					font-weight: 600;
					color: #6b7a8a;
					text-transform: uppercase;
					letter-spacing: 0.5px;
					background: #0b0f14;
				}
				:host(.light-mode) .recent-searches-header {
					border-bottom-color: var(--border-color);
					background: var(--bg-primary);
					color: var(--text-muted);
				}
				.recent-search-item {
					padding: 10px 16px;
					cursor: pointer;
					display: flex;
					align-items: center;
					gap: 12px;
					border-bottom: 1px solid #1f2a37;
					transition: background 0.15s;
				}
				:host(.light-mode) .recent-search-item {
					border-bottom-color: var(--border-color);
				}
				.recent-search-item:last-child {
					border-bottom: none;
				}
				.recent-search-item:hover {
					background: #1f2a37;
				}
				:host(.light-mode) .recent-search-item:hover {
					background: var(--bg-tertiary);
				}
				.recent-search-icon {
					font-size: 0.9rem;
					color: #6b7a8a;
					flex-shrink: 0;
				}
				.recent-search-symbol {
					font-weight: 700;
					color: #4ea1f3;
					font-size: 0.95rem;
					min-width: 65px;
					flex-shrink: 0;
				}
				:host(.light-mode) .recent-search-symbol {
					color: var(--accent-blue);
				}
				.recent-search-name {
					color: #e6edf3;
					font-size: 0.9rem;
					flex: 1;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				:host(.light-mode) .recent-search-name {
					color: var(--text-primary);
				}
				.stock-analysis-btn, .feedback-btn {
					padding: 16px 40px;
					background: linear-gradient(135deg, #4ea1f3 0%, #3b82f6 100%);
					color: #0b0f14;
					border: none;
					border-radius: 12px;
					font-size: 1.2rem;
					font-weight: 700;
					cursor: pointer;
					transition: all 0.3s ease;
					box-shadow: 0 4px 12px rgba(78, 161, 243, 0.3);
					white-space: nowrap;
					text-align: center;
					text-decoration: none;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					box-sizing: border-box;
				}
				.feedback-btn {
					width: auto;
					min-width: 120px;
					padding: 16px 24px;
					background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
					box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
					flex: 0 0 auto;
					box-sizing: border-box;
					display: flex;
					align-items: center;
					justify-content: center;
					white-space: normal;
					word-wrap: break-word;
					text-align: center;
					line-height: 1.3;
				}
				.stock-analysis-btn:hover, .feedback-btn:hover {
					transform: translateY(-2px);
					box-shadow: 0 6px 20px rgba(78, 161, 243, 0.4);
				}
				.feedback-btn:hover {
					box-shadow: 0 6px 20px rgba(107, 114, 128, 0.4);
				}
			.three-column-layout {
				display: grid;
				grid-template-columns: 1.25fr 1.25fr 0.75fr;
				gap: 20px;
				width: 100%;
				min-width: 100%;
				box-sizing: border-box;
			}
				.left-column,
				.middle-column,
				.right-column {
					display: flex;
					flex-direction: column;
					gap: 20px;
					min-width: 0;
				}
				.section-group {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
					box-sizing: border-box;
					width: 100%;
				}
				:host(.light-mode) .section-group {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.two-column-layout {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 20px;
				}
				.column-title {
					font-size: 1.3rem;
					font-weight: 600;
					color: #e6edf3;
					margin-bottom: 15px;
					display: flex;
					align-items: center;
					justify-content: space-between;
					position: relative;
					margin-top: 0;
					padding: 0;
					text-align: center;
				}
				:host(.light-mode) .column-title {
					color: var(--text-primary);
				}
				.column-title:first-of-type {
					margin-top: 0;
				}
				.global-overview-panel {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 15px;
					margin-bottom: 20px;
					position: relative;
					overflow: hidden;
					min-height: 180px;
					display: flex;
					flex-direction: column;
				}
				.overview-info-icon {
					width: 22px;
					height: 22px;
					border-radius: 50%;
					background: rgba(78, 161, 243, 0.15);
					border: 1px solid rgba(78, 161, 243, 0.3);
					color: #4ea1f3;
					display: flex;
					align-items: center;
					justify-content: center;
					cursor: pointer;
					font-size: 0.75rem;
					font-weight: 700;
					transition: all 0.2s ease;
					flex-shrink: 0;
					margin-left: 10px;
				}
				.overview-info-icon:hover {
					background: rgba(78, 161, 243, 0.25);
					border-color: #4ea1f3;
					transform: scale(1.1);
				}
				:host(.light-mode) .overview-info-icon {
					background: rgba(29, 78, 216, 0.15);
					border-color: rgba(29, 78, 216, 0.3);
					color: #1d4ed8;
				}
				:host(.light-mode) .overview-info-icon:hover {
					background: rgba(29, 78, 216, 0.25);
					border-color: #1d4ed8;
				}
				:host(.light-mode) .global-overview-panel {
					background: var(--bg-card);
					border-color: var(--border-color);
				}
				.global-overview-panel::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 3px;
					background: #6b7280;
					transition: background 0.3s ease;
				}
				.time-range-selector {
					display: flex;
					gap: 4px;
					background: #1f2a37;
					border-radius: 8px;
					padding: 4px;
				}
				:host(.light-mode) .time-range-selector {
					background: var(--bg-tertiary);
				}
				.time-range-btn {
					padding: 6px 10px;
					font-size: 0.7rem;
					font-weight: 600;
					color: #9fb0c0;
					background: transparent;
					border: none;
					border-radius: 6px;
					cursor: pointer;
					transition: all 0.2s ease;
					white-space: nowrap;
				}
				.time-range-btn:hover {
					color: #e6edf3;
					background: rgba(78, 161, 243, 0.2);
				}
				.time-range-btn.active {
					color: #0b0f14;
					background: linear-gradient(135deg, #4ea1f3 0%, #3b82f6 100%);
					box-shadow: 0 2px 8px rgba(78, 161, 243, 0.4);
				}
				:host(.light-mode) .time-range-btn {
					color: var(--text-secondary);
				}
				:host(.light-mode) .time-range-btn:hover {
					color: var(--text-primary);
				}
				:host(.light-mode) .time-range-btn.active {
					background: linear-gradient(135deg, var(--accent-blue) 0%, #3b82f6 100%);
				}
				.global-overview-panel.risk-high::before,
				.global-overview-panel.majority-negative::before {
					background: #ef4444;
				}
				.global-overview-panel.risk-low::before,
				.global-overview-panel.majority-positive::before {
					background: #10b981;
				}
				.global-overview-panel.risk-neutral::before {
					background: #6b7280;
				}
				.global-index-name {
					font-size: 0.75rem;
					font-weight: 600;
					color: #e6edf3;
					margin-bottom: 6px;
					line-height: 1.2;
					display: -webkit-box;
					-webkit-line-clamp: 2;
					-webkit-box-orient: vertical;
					overflow: hidden;
					text-overflow: ellipsis;
					min-height: 1.8rem;
					height: 1.8rem;
				}
				.global-overview-header {
					display: none;
				}
				.global-indices-grid {
					display: flex;
					justify-content: space-between;
					gap: 10px;
					margin-bottom: 15px;
				}
				.macro-indicators-row {
					display: flex;
					flex-wrap: wrap;
					gap: 6px;
					margin-bottom: 12px;
				}
				.macro-indicators-row .global-index-item.macro-compact {
					flex: 1;
					min-width: 70px;
					padding: 6px 4px;
					font-size: 0.7rem;
				}
				.macro-indicators-row .global-index-item.macro-compact .global-index-name {
					font-size: 0.65rem;
					margin-bottom: 4px;
				}
				.macro-indicators-row .global-index-item.macro-compact .global-index-price {
					font-size: 0.7rem;
					margin-bottom: 2px;
				}
				.macro-indicators-row .global-index-item.macro-compact .global-index-change {
					font-size: 0.65rem;
				}
				.global-index-item {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 10px;
					padding: 10px 8px;
					text-align: center;
					transition: all 0.3s ease;
					cursor: pointer;
					position: relative;
					overflow: hidden;
					flex: 1;
					min-width: 0;
				}
				:host(.light-mode) .global-index-item {
					background: #c0c9d4;
					border-color: var(--border-color);
				}
				.global-index-item::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 3px;
					transition: background 0.3s ease;
				}
				.global-index-item.positive::before {
					background: #10b981;
				}
				.global-index-item.negative::before {
					background: #ef4444;
				}
				.global-index-item.neutral::before {
					background: #6b7280;
				}
				.global-index-item:hover {
					transform: translateY(-3px);
					box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
					border-color: #4ea1f3;
				}
				.global-index-flag {
					font-size: 1.5rem;
					margin-bottom: 6px;
					line-height: 1;
				}
				.global-index-name {
					font-size: 0.75rem;
					font-weight: 600;
					color: #e6edf3;
					margin-bottom: 4px;
					line-height: 1.2;
					display: -webkit-box;
					-webkit-line-clamp: 2;
					-webkit-box-orient: vertical;
					overflow: hidden;
					text-overflow: ellipsis;
					min-height: 1.8rem;
					height: 1.8rem;
				}
				:host(.light-mode) .global-index-name {
					color: var(--text-primary);
				}
				.global-index-price {
					font-size: 0.95rem;
					font-weight: 700;
					color: #4ea1f3;
					margin-bottom: 3px;
				}
				:host(.light-mode) .global-index-price {
					color: #1d4ed8;
				}
				.global-index-change {
					font-size: 0.7rem;
					font-weight: 600;
				}
				.global-index-change.positive {
					color: #10b981;
				}
				.global-index-change.negative {
					color: #ef4444;
				}
				.global-index-change.neutral {
					color: #6b7280;
				}
				:host(.light-mode) .global-index-change.positive {
					color: #059669;
				}
				:host(.light-mode) .global-index-change.negative {
					color: #dc2626;
				}
				.global-summary {
					margin-top: 12px;
					padding-top: 12px;
					border-top: 1px solid #1f2a37;
					display: flex;
					justify-content: space-around;
					flex-wrap: wrap;
					gap: 10px;
				}
				:host(.light-mode) .global-summary {
					border-top-color: var(--border-color);
				}
				.global-summary-item {
					text-align: center;
				}
				.global-summary-label {
					font-size: 0.7rem;
					color: #9fb0c0;
					margin-bottom: 3px;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}
				:host(.light-mode) .global-summary-label {
					color: #0a0a0a;
				}
				.global-summary-value {
					font-size: 1.1rem;
					font-weight: 700;
					color: #e6edf3;
				}
				.global-summary-value.positive {
					color: #10b981;
				}
				.global-summary-value.negative {
					color: #ef4444;
				}
				.market-grid {
					display: grid;
					gap: 15px;
				}
				.index-card, .macro-card {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 10px;
					padding: 12px;
					transition: transform 0.2s, box-shadow 0.2s;
					position: relative;
					overflow: hidden;
				}
				:host(.light-mode) .index-card,
				:host(.light-mode) .macro-card {
					background: #c0c9d4;
					border-color: var(--border-color);
				}
				.index-card::before, .macro-card::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 4px;
					transition: background 0.2s ease;
				}
				.index-card.high::before, .macro-card.high::before {
					background: #ef4444;
				}
				.index-card.low::before, .macro-card.low::before {
					background: #10b981;
				}
				.index-card.neutral::before, .macro-card.neutral::before {
					background: #6b7280;
				}
				.index-card:hover, .macro-card:hover {
					transform: translateY(-2px);
					box-shadow: 0 8px 24px rgba(0,0,0,0.4);
				}
				.card-header {
					display: flex;
					justify-content: space-between;
					align-items: flex-start;
					margin-bottom: 8px;
				}
				.card-name {
					font-size: 0.95rem;
					font-weight: 600;
					color: #e6edf3;
				}
				:host(.light-mode) .card-name {
					color: var(--text-primary);
				}
				.historical-indication {
					font-size: 0.75rem;
					padding: 4px 8px;
					border-radius: 6px;
					font-weight: 600;
					text-transform: uppercase;
				}
				.historical-indication.high {
					background: rgba(239, 68, 68, 0.2);
					color: #ef4444;
				}
				.historical-indication.low {
					background: rgba(16, 185, 129, 0.2);
					color: #10b981;
				}
				.historical-indication.neutral {
					background: rgba(107, 114, 128, 0.2);
					color: #6b7280;
				}
				.card-price {
					font-size: 1.2rem;
					font-weight: 700;
					color: #4ea1f3;
					margin-bottom: 4px;
				}
				.card-change {
					font-size: 0.85rem;
					margin-bottom: 4px;
				}
				.card-ytd {
					font-size: 0.75rem;
					color: #9fb0c0;
					margin-bottom: 6px;
				}
				:host(.light-mode) .card-ytd {
					color: #0a0a0a;
				}
				.card-change.positive {
					color: #10b981;
				}
				.card-change.negative {
					color: #ef4444;
				}
			.historical-text {
				font-size: 0.7rem;
				color: #9fb0c0;
				margin-top: 4px;
			}
			:host(.light-mode) .historical-text {
				color: #0a0a0a;
			}
			.card-description {
				font-size: 0.75rem;
				color: #9fb0c0;
				margin-top: 6px;
				line-height: 1.3;
			}
			:host(.light-mode) .card-description {
				color: #1a1a1a;
			}
				.card-content {
					display: flex;
					gap: 12px;
					align-items: stretch;
				}
				.card-data {
					flex: 1;
					min-width: 0;
				}
				.chart-container {
					flex: 1.5;
					min-width: 0;
					height: 100%;
					min-height: 90px;
					position: relative;
					background: #0b0f14;
					border-radius: 6px;
					padding: 4px;
					overflow: hidden;
					display: flex;
					flex-direction: column;
				}
				:host(.light-mode) .chart-container {
					background: #a8b4c2;
				}
				.chart-title {
					font-size: 0.7rem;
					color: #9fb0c0;
					text-align: center;
					margin-bottom: 2px;
					font-weight: 500;
					flex-shrink: 0;
				}
				:host(.light-mode) .chart-title {
					color: #0a0a0a;
				}
				.chart-container canvas {
					flex: 1;
					min-height: 0;
				}
				.loading {
					color: #9fb0c0;
					text-align: center;
					padding: 20px;
				}
				:host(.light-mode) .loading {
					color: var(--text-secondary);
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
				.loading-subtext {
					color: #9fb0c0;
					font-size: 0.9rem;
					margin-bottom: 30px;
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
					background: var(--border-color);
				}
				.progress-bar {
					height: 100%;
					background: linear-gradient(90deg, #4ea1f3, #3b82f6);
					border-radius: 3px;
					width: 0%;
					transition: width 0.3s ease;
					animation: pulse 2s ease-in-out infinite;
				}
				@keyframes pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.7; }
				}
				
				/* ========== MOBILE PORTRAIT WARNING ========== */
				.mobile-rotate-overlay {
					display: none;
					position: fixed;
					top: 0;
					left: 0;
					width: 100vw;
					height: 100vh;
					background: linear-gradient(135deg, #0b0f14 0%, #121821 50%, #0b0f14 100%);
					z-index: 10000;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					text-align: center;
					padding: 30px;
					box-sizing: border-box;
				}
				.mobile-rotate-overlay.hidden {
					display: none !important;
				}
				.rotate-content {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					text-align: center;
					max-width: 320px;
				}
				.rotate-icon {
					font-size: 4rem;
					margin-bottom: 24px;
					animation: rotate-phone 2s ease-in-out infinite;
				}
				@keyframes rotate-phone {
					0%, 100% { transform: rotate(0deg); }
					25% { transform: rotate(-15deg); }
					75% { transform: rotate(90deg); }
				}
				.rotate-title {
					font-size: 1.5rem;
					font-weight: 700;
					color: #e6edf3;
					margin-bottom: 16px;
					text-align: center;
				}
				.rotate-message {
					font-size: 1rem;
					color: #9fb0c0;
					line-height: 1.6;
					text-align: center;
					margin-bottom: 16px;
				}
				.rotate-hint {
					font-size: 0.85rem;
					color: #6b7280;
					margin-bottom: 30px;
				}
				.rotate-continue-btn {
					background: transparent;
					border: 1px solid #374151;
					color: #9fb0c0;
					padding: 12px 24px;
					border-radius: 8px;
					font-size: 0.9rem;
					cursor: pointer;
					transition: all 0.2s ease;
				}
				.rotate-continue-btn:hover {
					background: rgba(255, 255, 255, 0.05);
					border-color: #4b5563;
					color: #e6edf3;
				}
				
				/* Show overlay only on mobile devices in portrait mode */
				/* Note: JavaScript will control visibility based on dismissal state */
				@media only screen and (max-width: 900px) and (orientation: portrait) {
					.mobile-rotate-overlay:not(.hidden):not(.dismissed) {
						display: flex;
					}
				}
				
				/* ========== MOBILE RESPONSIVE ========== */
				@media only screen and (max-width: 1200px) {
					:host {
						min-width: 0;
						padding: 15px;
						padding-top: 60px; /* Space for Top Movers ticker bar */
					}
					
					.page-header {
						flex-wrap: wrap;
						gap: 15px;
					}
					
					.header-left,
					.header-center,
					.header-right {
						width: 100%;
						justify-content: center;
					}
					
					.header-right {
						order: 3;
						margin-top: 10px;
					}
					
					.features-buttons-container {
						width: 100%;
						justify-content: center;
					}
					
					.feedback-btn {
						width: 100%;
						max-width: 300px;
						white-space: normal;
						word-wrap: break-word;
						line-height: 1.3;
					}
					
					.page-title {
						flex-direction: column;
						gap: 15px;
						padding: 15px 20px;
					}
					
					.page-title-left,
					.page-title-center,
					.page-title-right {
						width: 100%;
						justify-content: center;
					}
					
					.page-title-center {
						order: 1;
					}
					
					.page-title-left {
						order: 2;
						justify-content: center;
						flex-wrap: wrap;
						gap: 10px;
					}
					
					.page-title-right {
						order: 3;
						flex-wrap: wrap;
						gap: 10px;
						justify-content: center;
					}
					
					.refresh-btn {
						margin-right: 0;
					}
					
					.ai-summary-btn {
						margin-left: 0;
					}
				}
				
				@media only screen and (max-width: 768px) {
					:host {
						padding-top: 50px; /* Less space on smaller screens */
					}
					
					.ticker-bar-wrapper {
						min-width: 0;
					}
					
					.features-buttons-container {
						grid-template-columns: repeat(2, 1fr);
						grid-template-rows: repeat(3, 1fr);
						gap: 8px;
					}
					
					.feature-btn {
						font-size: 0.8rem;
						padding: 12px 8px;
					}
					
					.feedback-btn {
						font-size: 0.85rem;
						padding: 12px 16px;
						min-height: 50px; /* Ensure enough height for text wrapping */
						white-space: normal;
						word-wrap: break-word;
						line-height: 1.3;
					}
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
					.feature-btn,
					.time-range-btn,
					.ai-summary-btn,
					.refresh-btn,
					.search-submit-btn,
					.autocomplete-item,
					.performers-tab,
					.performers-close-btn,
					.rotate-continue-btn {
						min-height: 44px;
						min-width: 44px;
						padding: 12px 16px;
					}
					
					/* Larger icons on mobile */
					.search-icon,
					.feature-icon {
						width: 20px;
						height: 20px;
					}
					
					/* Better spacing for touch */
					.header-right {
						gap: 16px;
					}
					
					.time-range-selector {
						gap: 8px;
					}
					
					/* Touch feedback - active states */
					button:active,
					.feature-btn:active,
					.time-range-btn:active,
					.ai-summary-btn:active,
					.refresh-btn:active,
					.autocomplete-item:active,
					.performers-tab:active {
						transform: scale(0.95);
						opacity: 0.8;
						transition: transform 0.1s, opacity 0.1s;
					}
					
					/* Smooth scrolling for modals and dropdowns */
					.autocomplete-dropdown,
					.performers-modal-content,
					.ai-summary-modal-content {
						-webkit-overflow-scrolling: touch;
						overscroll-behavior: contain;
					}
					
					.autocomplete-item {
						padding: 14px 16px;
					}
					
					.recent-search-item {
						padding: 14px 16px;
						min-height: 44px;
					}
				}
			</style>
			
			<!-- Mobile Portrait Warning -->
			<div class="mobile-rotate-overlay" id="mobile-rotate-overlay">
				<div class="rotate-content">
					<div class="rotate-icon">📱</div>
					<div class="rotate-title">Please Rotate Your Device</div>
					<div class="rotate-message">
						For the best experience, please switch to landscape mode. 
						This dashboard is optimized for wider screens.
					</div>
					<div class="rotate-hint">↻ Turn your phone sideways</div>
					<button class="rotate-continue-btn" id="rotate-continue-btn">Continue in portrait mode</button>
				</div>
			</div>
			
			<!-- Top Performers Ticker Bar -->
			<div class="ticker-bar-wrapper">
				<div class="ticker-bar" id="ticker-bar">
					<div class="ticker-label">TOP MOVERS</div>
					<div class="ticker-track">
						<div class="ticker-content" id="ticker-content">
							<span class="ticker-loading">Loading top performers...</span>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Top Performers Modal -->
			<div class="performers-modal-overlay" id="performers-modal">
				<div class="performers-modal">
					<div class="performers-modal-header">
						<div class="performers-modal-title">
							<span class="icon">📊</span>
							Top Market Movers
						</div>
						<div class="performers-tabs">
							<button class="performers-tab active" data-type="gainers">🚀 Gainers</button>
							<button class="performers-tab" data-type="losers">📉 Losers</button>
							<button class="performers-tab" data-type="active">⚡ Most Active</button>
						</div>
						<button class="performers-close-btn" id="performers-close">✕</button>
					</div>
					<div class="performers-modal-body">
						<div class="performers-grid" id="performers-grid">
							<div class="performers-loading">Loading data...</div>
						</div>
					</div>
				</div>
			</div>
			
			<div class="header">
				<div class="header-left">
					<div class="search-container" id="search-container">
						<div class="search-label">Stock<br>Analysis</div>
						<div class="search-box">
							<div class="search-input-wrapper">
								<input type="text" id="stock-search-input" placeholder="Enter stock ticker (e.g., AAPL, MSFT) or search by name" autocomplete="off" />
								<div class="autocomplete-dropdown" id="autocomplete-dropdown"></div>
							</div>
							<button id="search-submit-btn">Analyze</button>
						</div>
					</div>
				</div>
				<div class="header-center">
					<div class="features-buttons-container">
						<button class="feature-btn" id="menu-watchlist">
							<span class="features-menu-icon">⭐</span>
							<span>Watchlist</span>
						</button>
						<button class="feature-btn" id="menu-comparison">
							<span class="features-menu-icon">📊</span>
							<span>Stock Comparison</span>
						</button>
						<button class="feature-btn" id="menu-backtesting">
							<span class="features-menu-icon">🔬</span>
							<span>Backtesting Engine</span>
						</button>
						<button class="feature-btn" id="menu-backtesting-pro">
							<span class="features-menu-icon">🚀</span>
							<span>Backtesting Engine Pro</span>
						</button>
						<button class="feature-btn" id="menu-portfolio">
							<span class="features-menu-icon">📈</span>
							<span>Portfolio Tracking</span>
						</button>
						<button class="feature-btn" id="menu-economic-calendar">
							<span class="features-menu-icon">📅</span>
							<span>Economic Calendar</span>
						</button>
					</div>
				</div>
				<div class="header-right">
					<a href="https://docs.google.com/forms/d/e/1FAIpQLSdOEM7_n5EAWneDHQAHFIqsFbTRHtVAkC1qei0UKyNvxMXW_A/viewform?usp=sharing&ouid=115094271774307791514" 
					   target="_blank" 
					   rel="noopener noreferrer" 
					   class="feedback-btn">
						💬 Give Feedback
					</a>
				</div>
			</div>
			<div class="page-title-container">
				<div class="page-title">
					<div class="page-title-left">
						<div class="theme-switch">
							<span class="theme-switch-label">Theme</span>
							<div class="theme-switch-track" id="theme-toggle">
								<div class="theme-switch-thumb">
									<span class="theme-icon">🌙</span>
								</div>
							</div>
						</div>
						<button class="ai-summary-btn" id="market-ai-summary-btn">
							<span class="ai-icon">🤖</span>
							<span>AI Market Summary</span>
						</button>
					</div>
					<div class="page-title-center">
						<h1>Market Overview</h1>
					</div>
					<div class="page-title-right">
						<button class="refresh-btn" id="refresh-btn" title="Refresh market data">
							<span class="refresh-icon">🔄</span>
							<span>Refresh</span>
						</button>
						<div class="time-range-selector" id="global-time-range">
							<button class="time-range-btn active" data-range="1D">1D</button>
							<button class="time-range-btn" data-range="1W">1W</button>
							<button class="time-range-btn" data-range="1M">1M</button>
							<button class="time-range-btn" data-range="3M">3M</button>
							<button class="time-range-btn" data-range="YTD">YTD</button>
							<button class="time-range-btn" data-range="1Y">1Y</button>
						</div>
					</div>
				</div>
			</div>
			<div class="three-column-layout">
				<div class="left-column">
					<div class="section-group">
						<div class="column-title">
							<span>Global Market Overview</span>
							<div class="overview-info-icon" id="global-overview-info-icon" data-panel="global">i</div>
						</div>
						<div class="global-overview-panel" id="global-overview-panel">
							<div id="global-overview-content">
								<div class="loading">Loading global overview...</div>
							</div>
						</div>
					</div>
					<div class="section-group">
						<div class="column-title">Major Indices</div>
						<div class="market-grid" id="indices-grid">
							<div class="loading">Loading indices...</div>
						</div>
					</div>
				</div>
				<div class="middle-column">
					<div class="section-group">
						<div class="column-title">
							<span>Macroeconomic Risk Overview</span>
							<div class="overview-info-icon" id="macro-overview-info-icon" data-panel="macro">i</div>
						</div>
						<div class="global-overview-panel" id="macro-overview-panel">
						</div>
					</div>
					<div class="section-group">
						<div class="column-title">Macroeconomic Risk Indicators</div>
						<div class="market-grid" id="macro-grid">
							<div class="loading">Loading macro indicators...</div>
						</div>
					</div>
				</div>
				<div class="right-column">
					<div class="section-group">
						<div class="column-title">
							<span>Currencies Overview</span>
							<div class="overview-info-icon" id="currencies-overview-info-icon" data-panel="currencies">i</div>
						</div>
						<div class="global-overview-panel" id="currencies-overview-panel">
						</div>
					</div>
					<div class="section-group">
						<div class="column-title">Currencies</div>
						<div class="market-grid" id="currencies-grid">
							<div class="loading">Loading currencies...</div>
						</div>
					</div>
					<div class="section-group">
						<div class="column-title">Commodities</div>
						<div class="market-grid" id="commodities-grid">
							<div class="loading">Loading commodities...</div>
						</div>
					</div>
				</div>
			</div>
			<div class="loading-overlay" id="loading-overlay">
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
			
			<!-- Overview Info Modal -->
			<div class="overview-info-modal-overlay" id="overview-info-modal-overlay">
				<div class="overview-info-modal">
					<div class="overview-info-modal-header">
						<div class="overview-info-modal-title">
							<span>ℹ️</span>
							<span id="overview-info-modal-title-text">Information</span>
						</div>
						<button class="overview-info-modal-close" id="overview-info-modal-close">×</button>
					</div>
					<div class="overview-info-modal-content" id="overview-info-modal-content">
						<!-- Content will be dynamically inserted -->
					</div>
				</div>
			</div>
			
			<!-- AI Summary Modal -->
			<div class="ai-summary-modal-overlay" id="ai-summary-modal-overlay">
				<div class="ai-summary-modal">
					<div class="ai-summary-modal-header">
						<div class="ai-summary-modal-title">
							<span class="ai-icon">🤖</span>
							AI Market Summary
						</div>
						<button class="ai-summary-modal-close" id="ai-summary-modal-close">×</button>
					</div>
					<div class="ai-summary-modal-content" id="ai-summary-modal-content">
						<div class="ai-summary-loading">Generating AI market summary...</div>
					</div>
					<div class="ai-summary-modal-disclaimer">
						<strong>Disclaimer:</strong> This AI-generated summary is for informational purposes only and does not constitute investment advice, financial advice, trading advice, or any other form of recommendation. The information is generated by an AI model and may contain inaccuracies. Always conduct your own research and consult with a licensed financial advisor before making investment decisions. Past performance is not indicative of future results.
					</div>
				</div>
			</div>
		`;

		// Theme toggle functionality - MUST be first so charts render with correct colors
		this.setupThemeToggle();

		// Features menu
		this.setupFeaturesMenu();

		// Time range selector functionality
		this.setupTimeRangeSelector();

		// Refresh button functionality
		this.setupRefreshButton();

		// Search functionality with autocomplete
		this.setupSearchAutocomplete();

		// Listen for rate limit cooldown events
		window.addEventListener('rate-limit-cooldown', (e) => {
			this.handleRateLimitCooldown(e.detail.active);
		});

		// Setup touch gestures for mobile
		this.setupTouchGestures();

		// Load market data AFTER theme is set (non-blocking)
		// Defer top performers ticker to load after main content
		setTimeout(() => {
			this.loadMarketData();
		}, 0);
		
		// Top Performers ticker setup - defer to not block initial render
		setTimeout(() => {
			this.setupTopPerformersTicker();
		}, 100);

		// Mobile rotate overlay - continue button
		// Check if already dismissed (same storage key as MobileOrientationWarning)
		const storageKey = 'mobile-orientation-warning-dismissed';
		const rotateOverlay = this.shadowRoot.getElementById('mobile-rotate-overlay');
		const continueBtn = this.shadowRoot.getElementById('rotate-continue-btn');
		
		// Check if already dismissed OR if global MobileOrientationWarning is showing
		// Only show MarketOverview warning if global one doesn't exist or is hidden
		const globalWarning = document.querySelector('mobile-orientation-warning');
		const globalWarningOverlay = globalWarning?.shadowRoot?.querySelector('.mobile-warning-overlay');
		const isGlobalWarningShowing = globalWarningOverlay?.classList.contains('show');
		
		if (sessionStorage.getItem(storageKey) === 'true' || isGlobalWarningShowing) {
			rotateOverlay?.classList.add('hidden', 'dismissed');
		}
		
		continueBtn?.addEventListener('click', () => {
			rotateOverlay?.classList.add('hidden', 'dismissed');
			// Save dismissal state so it won't reappear until page reload
			sessionStorage.setItem(storageKey, 'true');
		});

		// Disclaimer link
		const disclaimerLink = this.shadowRoot.getElementById('disclaimer-link-full');
		disclaimerLink?.addEventListener('click', (e) => {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'disclaimer' } }));
		});
	}

	async setupTopPerformersTicker() {
		const tickerBar = this.shadowRoot.getElementById('ticker-bar');
		const tickerContent = this.shadowRoot.getElementById('ticker-content');
		const modal = this.shadowRoot.getElementById('performers-modal');
		const closeBtn = this.shadowRoot.getElementById('performers-close');
		const performersGrid = this.shadowRoot.getElementById('performers-grid');

		// Load top performers data
		await this.loadTopPerformers();

		// Ticker bar click handler - open modal
		tickerBar?.addEventListener('click', () => {
			modal?.classList.add('visible');
			this.renderPerformersModal('gainers');
		});

		// Close modal
		closeBtn?.addEventListener('click', () => {
			modal?.classList.remove('visible');
		});

		// Close on overlay click
		modal?.addEventListener('click', (e) => {
			if (e.target === modal) {
				modal.classList.remove('visible');
			}
		});

		// Tab switching
		const tabs = this.shadowRoot.querySelectorAll('.performers-tab');
		tabs.forEach(tab => {
			tab.addEventListener('click', () => {
				tabs.forEach(t => t.classList.remove('active'));
				tab.classList.add('active');
				this.renderPerformersModal(tab.dataset.type);
			});
		});

		// Close on Escape key
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && modal?.classList.contains('visible')) {
				modal.classList.remove('visible');
			}
		});
	}

	async loadTopPerformers() {
		const tickerContent = this.shadowRoot.getElementById('ticker-content');

		try {
			// Fetch gainers and losers from Yahoo Finance via proxy
			const { fetchWithProxy } = await import('../utils/proxy.js');

			// Use Yahoo Finance screener API for market movers
			const gainersUrl = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_gainers&count=25';
			const losersUrl = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_losers&count=25';
			const activeUrl = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&count=25';

			// Fetch all in parallel
			const [gainersData, losersData, activeData] = await Promise.all([
				fetchWithProxy(gainersUrl).catch(() => null),
				fetchWithProxy(losersUrl).catch(() => null),
				fetchWithProxy(activeUrl).catch(() => null)
			]);

			// Parse results
			const parseScreenerResult = (data) => {
				if (!data?.finance?.result?.[0]?.quotes) return [];
				return data.finance.result[0].quotes.map(q => ({
					symbol: q.symbol,
					name: q.shortName || q.longName || q.symbol,
					price: q.regularMarketPrice,
					change: q.regularMarketChange,
					changePercent: q.regularMarketChangePercent,
					volume: q.regularMarketVolume,
					marketCap: q.marketCap,
					avgVolume: q.averageDailyVolume3Month,
					high: q.regularMarketDayHigh,
					low: q.regularMarketDayLow,
					open: q.regularMarketOpen,
					prevClose: q.regularMarketPreviousClose
				}));
			};

			this.topPerformers = {
				gainers: parseScreenerResult(gainersData),
				losers: parseScreenerResult(losersData),
				active: parseScreenerResult(activeData)
			};

			// Render ticker content
			this.renderTickerContent();

		} catch (error) {
			console.error('[Top Performers] Error loading data:', error);
			if (tickerContent) {
				tickerContent.innerHTML = '<span class="ticker-loading">Unable to load top performers</span>';
			}
		}
	}

	renderTickerContent() {
		const tickerContent = this.shadowRoot.getElementById('ticker-content');
		if (!tickerContent) return;

		// Combine top gainers and losers for the ticker
		const gainers = this.topPerformers.gainers?.slice(0, 10) || [];
		const losers = this.topPerformers.losers?.slice(0, 10) || [];

		// Interleave gainers and losers
		const combined = [];
		const maxLen = Math.max(gainers.length, losers.length);
		for (let i = 0; i < maxLen; i++) {
			if (gainers[i]) combined.push({ ...gainers[i], type: 'gainer' });
			if (losers[i]) combined.push({ ...losers[i], type: 'loser' });
		}

		if (combined.length === 0) {
			tickerContent.innerHTML = '<span class="ticker-loading">No data available</span>';
			return;
		}

		// Create ticker items (duplicate for infinite scroll)
		const createItems = (items) => items.map(item => `
			<div class="ticker-item">
				<span class="ticker-symbol">${item.symbol}</span>
				<span class="ticker-price">$${item.price?.toFixed(2) || 'N/A'}</span>
				<span class="ticker-change ${item.changePercent >= 0 ? 'positive' : 'negative'}">
					${item.changePercent >= 0 ? '+' : ''}${item.changePercent?.toFixed(2) || 0}%
				</span>
			</div>
		`).join('');

		// Duplicate content for seamless infinite scroll
		tickerContent.innerHTML = createItems(combined) + createItems(combined);
	}

	async renderPerformersModal(type = 'gainers') {
		const grid = this.shadowRoot.getElementById('performers-grid');
		if (!grid) return;

		const performers = this.topPerformers[type] || [];

		if (performers.length === 0) {
			grid.innerHTML = '<div class="performers-loading">No data available</div>';
			return;
		}

		// Render performer cards
		grid.innerHTML = performers.map(p => `
			<div class="performer-card ${type === 'losers' ? 'loser' : 'gainer'}" data-symbol="${p.symbol}">
				<div class="performer-header">
					<div class="performer-info">
						<div class="performer-symbol">${p.symbol}</div>
						<div class="performer-name">${p.name}</div>
					</div>
					<div class="performer-change-badge ${p.changePercent >= 0 ? 'positive' : 'negative'}">
						${p.changePercent >= 0 ? '+' : ''}${p.changePercent?.toFixed(2) || 0}%
					</div>
				</div>
				<div class="performer-body">
					<div class="performer-data">
						<div class="performer-price">$${p.price?.toFixed(2) || 'N/A'}</div>
						<div class="performer-details">
							<div class="performer-detail">
								<span class="performer-detail-label">Change</span>
								<span class="performer-detail-value" style="color: ${p.change >= 0 ? '#10b981' : '#ef4444'}">
									${p.change >= 0 ? '+' : ''}$${p.change?.toFixed(2) || 0}
								</span>
							</div>
							<div class="performer-detail">
								<span class="performer-detail-label">Volume</span>
								<span class="performer-detail-value">${this.formatVolume(p.volume)}</span>
							</div>
							<div class="performer-detail">
								<span class="performer-detail-label">Day Range</span>
								<span class="performer-detail-value">$${p.low?.toFixed(2) || 'N/A'} - $${p.high?.toFixed(2) || 'N/A'}</span>
							</div>
							<div class="performer-detail">
								<span class="performer-detail-label">Prev Close</span>
								<span class="performer-detail-value">$${p.prevClose?.toFixed(2) || 'N/A'}</span>
							</div>
						</div>
					</div>
					<div class="performer-chart">
						<canvas id="performer-chart-${p.symbol.replace(/[^a-zA-Z0-9]/g, '')}"></canvas>
					</div>
				</div>
			</div>
		`).join('');

		// Add click handlers to cards
		grid.querySelectorAll('.performer-card').forEach(card => {
			card.addEventListener('click', () => {
				const symbol = card.dataset.symbol;
				if (symbol) {
					// Close modal and navigate to stock analysis
					this.shadowRoot.getElementById('performers-modal')?.classList.remove('visible');
					window.dispatchEvent(new CustomEvent('navigate', {
						detail: { page: 'stock-analysis', symbol: symbol }
					}));
				}
			});
		});

		// Load mini charts for each performer
		this.loadPerformerCharts(performers);
	}

	async loadPerformerCharts(performers) {
		const { fetchWithProxy } = await import('../utils/proxy.js');

		for (const p of performers.slice(0, 12)) { // Limit to first 12 for performance
			try {
				const url = `https://query1.finance.yahoo.com/v8/finance/chart/${p.symbol}?interval=5m&range=1d`;
				const data = await fetchWithProxy(url);

				if (data?.chart?.result?.[0]) {
					const result = data.chart.result[0];
					const quotes = result.indicators?.quote?.[0];
					const closes = quotes?.close || [];
					const validCloses = closes.filter(c => c !== null);

					if (validCloses.length > 0) {
						const canvasId = `performer-chart-${p.symbol.replace(/[^a-zA-Z0-9]/g, '')}`;
						const canvas = this.shadowRoot.getElementById(canvasId);
						if (canvas) {
							this.renderPerformerMiniChart(canvas, validCloses, p.changePercent >= 0);
						}
					}
				}
			} catch (error) {
				console.warn(`[Performer Chart] Error loading chart for ${p.symbol}:`, error);
			}
		}
	}

	renderPerformerMiniChart(canvas, data, isPositive) {
		if (!canvas || !data || data.length === 0) return;

		const ctx = canvas.getContext('2d');
		const dpr = window.devicePixelRatio || 1;

		canvas.width = 120 * dpr;
		canvas.height = 60 * dpr;
		canvas.style.width = '120px';
		canvas.style.height = '60px';

		ctx.scale(dpr, dpr);

		const width = 120;
		const height = 60;
		const padding = 4;

		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;

		ctx.clearRect(0, 0, width, height);

		// Draw area
		const color = isPositive ? '#10b981' : '#ef4444';
		const bgColor = isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';

		ctx.fillStyle = bgColor;
		ctx.beginPath();
		ctx.moveTo(padding, height - padding);

		data.forEach((value, i) => {
			const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
			const y = padding + (1 - (value - min) / range) * (height - 2 * padding);
			ctx.lineTo(x, y);
		});

		ctx.lineTo(width - padding, height - padding);
		ctx.closePath();
		ctx.fill();

		// Draw line
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.5;
		ctx.beginPath();

		data.forEach((value, i) => {
			const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
			const y = padding + (1 - (value - min) / range) * (height - 2 * padding);
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		});

		ctx.stroke();
	}

	formatVolume(volume) {
		if (!volume) return 'N/A';
		if (volume >= 1e9) return (volume / 1e9).toFixed(1) + 'B';
		if (volume >= 1e6) return (volume / 1e6).toFixed(1) + 'M';
		if (volume >= 1e3) return (volume / 1e3).toFixed(1) + 'K';
		return volume.toString();
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

		// Setup AI Summary Button
		this.setupAISummaryButton();

		// Setup Overview Info Icons
		this.setupOverviewInfoIcons();
	}

	applyLightMode(enable) {
		const toggle = this.shadowRoot.getElementById('theme-toggle');
		const thumb = toggle?.querySelector('.theme-switch-thumb');
		const icon = toggle?.querySelector('.theme-icon');

		if (enable) {
			this.classList.add('light-mode');
			toggle?.classList.add('light');
			if (icon) icon.textContent = '☀️';
			localStorage.setItem('theme', 'light');
			// Also update body for global elements
			document.body.style.background = '#f8fafc';
		} else {
			this.classList.remove('light-mode');
			toggle?.classList.remove('light');
			if (icon) icon.textContent = '🌙';
			localStorage.setItem('theme', 'dark');
			document.body.style.background = '#0b0f14';
		}

		// Dispatch theme change event for chart components
		window.dispatchEvent(new CustomEvent('themechange'));

		// Re-render all mini charts with new theme colors
		this.rerenderAllMiniCharts();
	}

	setupTimeRangeSelector() {
		const timeRangeContainer = this.shadowRoot.getElementById('global-time-range');
		if (!timeRangeContainer) return;

		const buttons = timeRangeContainer.querySelectorAll('.time-range-btn');
		buttons.forEach(btn => {
			btn.addEventListener('click', async (e) => {
				const newRange = e.target.dataset.range;
				if (newRange === this.selectedTimeRange) return;

				// Update active state
				buttons.forEach(b => b.classList.remove('active'));
				e.target.classList.add('active');

				this.selectedTimeRange = newRange;

				// Reload data with new time range
				await this.loadMarketData();
			});
		});
	}

	setupRefreshButton() {
		const refreshBtn = this.shadowRoot.getElementById('refresh-btn');
		if (!refreshBtn) return;

		refreshBtn.addEventListener('click', async () => {
			await this.refreshMarketData();
		});
	}

	async refreshMarketData() {
		const refreshBtn = this.shadowRoot.getElementById('refresh-btn');
		if (!refreshBtn) return;

		// Disable button and show spinning animation
		refreshBtn.disabled = true;
		refreshBtn.classList.add('refreshing');

		try {
			// Clear local cache
			this.cachedData = null;
			this.topPerformers = [];

			// Clear localStorage cache entries for market data
			// Remove cache entries that start with 'stock_' for market indices and indicators
			try {
				const marketSymbols = [
					'^GSPC', '^GDAXI', '^N225', '^NDX', '^HSI', // Indices
					'^VIX', 'DX-Y.NYB', 'GC=F', 'DGS10', 'T5YIFR', 'BAMLC0A0CM', 
					'TEDRATE', 'STLFSI4', 'DCOILWTICO', 'DCOILBRENTEU', 'RRPONTSYD', // Macro indicators
					'EURUSD=X', 'GBPUSD=X', 'JPY=X', // Currencies
					'SI=F', 'CL=F' // Commodities
				];

				if (typeof localStorage !== 'undefined' && localStorage) {
					const keysToRemove = [];
					for (let i = 0; i < localStorage.length; i++) {
						const key = localStorage.key(i);
						if (key && key.startsWith('stock_')) {
							// Check if this cache entry is for a market symbol
							for (const symbol of marketSymbols) {
								if (key.includes(symbol.replace(/[^a-zA-Z0-9]/g, ''))) {
									keysToRemove.push(key);
									break;
								}
							}
						}
					}
					keysToRemove.forEach(key => localStorage.removeItem(key));
					console.log(`[Refresh] Cleared ${keysToRemove.length} cache entries`);
				}
			} catch (error) {
				console.warn('[Refresh] Error clearing cache:', error);
			}

			// Reload market data and top performers
			await Promise.all([
				this.loadMarketData(),
				this.loadTopPerformers()
			]);
		} catch (error) {
			console.error('[Refresh] Error refreshing data:', error);
		} finally {
			// Re-enable button and remove spinning animation
			refreshBtn.disabled = false;
			refreshBtn.classList.remove('refreshing');
		}
	}

	setupFeaturesMenu() {
		const watchlistItem = this.shadowRoot.getElementById('menu-watchlist');
		const comparisonItem = this.shadowRoot.getElementById('menu-comparison');
		const backtestingItem = this.shadowRoot.getElementById('menu-backtesting');
		const backtestingProItem = this.shadowRoot.getElementById('menu-backtesting-pro');
		const portfolioItem = this.shadowRoot.getElementById('menu-portfolio');

		// Navigate to watchlist
		watchlistItem?.addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', {
				detail: { page: 'watchlist' }
			}));
		});

		// Navigate to comparison
		comparisonItem?.addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', {
				detail: { page: 'stock-comparison' }
			}));
		});

		// Navigate to backtesting
		backtestingItem?.addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', {
				detail: { page: 'backtesting' }
			}));
		});

		// Navigate to backtesting pro
		backtestingProItem?.addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', {
				detail: { page: 'backtesting-pro' }
			}));
		});

		// Navigate to portfolio
		portfolioItem?.addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', {
				detail: { page: 'portfolio-tracking' }
			}));
		});

		// Navigate to economic calendar
		const economicCalendarItem = this.shadowRoot.getElementById('menu-economic-calendar');
		economicCalendarItem?.addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', {
				detail: { page: 'economic-calendar' }
			}));
		});
	}

	setupSearchAutocomplete() {
		const searchInput = this.shadowRoot.getElementById('stock-search-input');
		const searchSubmitBtn = this.shadowRoot.getElementById('search-submit-btn');
		const dropdown = this.shadowRoot.getElementById('autocomplete-dropdown');

		if (!searchInput || !dropdown) return;

		// Store valid symbols from autocomplete suggestions
		this.validSymbols = new Set();

		let debounceTimer = null;
		let selectedIndex = -1;

		// Handle search submission
		// Helper function to check if input looks like a ticker symbol
		const looksLikeTicker = (input) => {
			if (!input) return false;
			const trimmed = input.trim().toUpperCase();
			// Ticker symbols are typically:
			// - 1-10 characters
			// - Only letters, numbers, and dots
			// - No spaces
			// - Usually all uppercase letters or mix of letters and numbers
			return /^[A-Z0-9.]{1,10}$/.test(trimmed) && trimmed.length <= 10;
		};

		const handleSearch = (symbol, skipValidation = false) => {
			if (!symbol) return;

			const symbolUpper = symbol.toUpperCase().trim();

			// Allow direct ticker input without validation if it looks like a ticker
			const isTickerFormat = looksLikeTicker(symbolUpper);

			// Validate that symbol exists in autocomplete suggestions (unless skipValidation is true or it's a ticker format)
			if (!skipValidation && !isTickerFormat && !this.validSymbols.has(symbolUpper)) {
				alert(`Please select a valid stock from the suggestions or enter a stock ticker symbol (e.g., AAPL, MSFT). "${symbol}" is not recognized.`);
				return;
			}

			// Save to recent searches
			this.saveRecentSearch(symbolUpper);

			this.hideSearchAutocomplete();
			window.dispatchEvent(new CustomEvent('navigate', {
				detail: { page: 'stock-analysis', symbol: symbolUpper }
			}));
			searchInput.value = '';
		};

		// Submit button click
		searchSubmitBtn?.addEventListener('click', () => {
			const symbol = searchInput?.value.trim().toUpperCase();
			if (looksLikeTicker(symbol) || this.validSymbols.has(symbol)) {
				handleSearch(symbol);
			} else {
				alert('Please enter a stock ticker symbol (e.g., AAPL, MSFT) or select a stock from the suggestions.');
			}
		});

		// Show recent searches on focus or click (if input is empty)
		const showRecentIfEmpty = () => {
			const query = searchInput.value.trim();
			if (query.length === 0) {
				console.log('[Recent Searches] Showing recent searches on focus/click');
				this.showRecentSearches();
			}
		};

		searchInput.addEventListener('focus', showRecentIfEmpty);
		searchInput.addEventListener('click', showRecentIfEmpty);

		// Input event for typing
		searchInput.addEventListener('input', (e) => {
			const query = e.target.value.trim();

			if (debounceTimer) clearTimeout(debounceTimer);
			selectedIndex = -1;

			if (query.length < 1) {
				// Show recent searches if input is empty
				this.showRecentSearches();
				return;
			}

			dropdown.innerHTML = '<div class="autocomplete-loading">Searching...</div>';
			dropdown.classList.add('show');

			debounceTimer = setTimeout(() => {
				this.searchStockSymbols(query);
			}, 150); // Reduced from 300ms to 150ms for faster response
		});

		// Keyboard navigation
		searchInput.addEventListener('keydown', (e) => {
			const items = dropdown.querySelectorAll('.autocomplete-item, .recent-search-item');

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				if (items.length > 0) {
					selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
					this.updateSearchSelection(items, selectedIndex);
				}
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				if (items.length > 0) {
					selectedIndex = Math.max(selectedIndex - 1, 0);
					this.updateSearchSelection(items, selectedIndex);
				}
			} else if (e.key === 'Enter') {
				e.preventDefault();
				if (selectedIndex >= 0 && items[selectedIndex]) {
					const symbol = items[selectedIndex].dataset.symbol;
					if (symbol) {
						handleSearch(symbol);
					}
				} else {
					// Allow direct ticker input or if it's in valid symbols
					const symbol = searchInput.value.trim().toUpperCase();
					if (looksLikeTicker(symbol) || this.validSymbols.has(symbol)) {
						handleSearch(symbol);
					} else {
						alert('Please enter a stock ticker symbol (e.g., AAPL, MSFT) or select a stock from the suggestions.');
					}
				}
			} else if (e.key === 'Escape') {
				this.hideSearchAutocomplete();
			}
		});

		// Close dropdown when clicking outside
		this.shadowRoot.addEventListener('click', (e) => {
			const searchBox = this.shadowRoot.querySelector('.search-box');
			if (searchBox && !searchBox.contains(e.target)) {
				this.hideSearchAutocomplete();
			}
		});
	}

	async searchStockSymbols(query) {
		const dropdown = this.shadowRoot.getElementById('autocomplete-dropdown');
		if (!dropdown) return;

		// Abort previous search request if it exists
		if (this.searchController) {
			this.searchController.abort();
		}

		// Set current search query to track which request should update the UI
		this.currentSearchQuery = query;

		// Check frontend cache first for instant results
		const cacheKey = `search_${query.toLowerCase()}`;
		const cached = sessionStorage.getItem(cacheKey);
		if (cached) {
			try {
				const cachedData = JSON.parse(cached);
				const cacheTime = cachedData.timestamp || 0;
				const now = Date.now();
				// Cache valid for 5 minutes
				if (now - cacheTime < 5 * 60 * 1000) {
					// Only use cache if this is still the current query
					if (this.currentSearchQuery === query) {
						console.log('[Search] Using cached results for:', query);
						this.renderSearchResults(cachedData.results, dropdown);
						// Still load scores asynchronously for fresh data
						this.loadDataScores(cachedData.results.map(r => r.symbol));
					}
					return;
				}
			} catch (e) {
				// Cache invalid, continue with API call
			}
		}

		try {
			console.log('[Search] Fetching:', `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
			const startTime = Date.now();

			// Create new abort controller for this request
			this.searchController = new AbortController();
			const timeoutId = setTimeout(() => {
				if (this.searchController) {
					this.searchController.abort();
				}
			}, 5000); // 5 second timeout

			const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`, {
				signal: this.searchController.signal
			});
			clearTimeout(timeoutId);

			// Check if this is still the current query (avoid race conditions)
			if (this.currentSearchQuery !== query) {
				console.log('[Search] Query changed, ignoring response for:', query);
				return;
			}

			const fetchTime = Date.now() - startTime;
			console.log('[Search] Response status:', response.status, `(${fetchTime}ms)`);

			if (!response.ok) {
				console.error('[Search] Server error:', response.status, response.statusText);
				if (this.currentSearchQuery === query) {
					dropdown.innerHTML = `<div class="autocomplete-empty">Server error (${response.status})</div>`;
				}
				return;
			}

			const data = await response.json();
			console.log('[Search] Results:', data);
			const results = data.results || [];

			// Check again if this is still the current query
			if (this.currentSearchQuery !== query) {
				console.log('[Search] Query changed after fetch, ignoring results for:', query);
				return;
			}

			// Cache results in sessionStorage
			try {
				sessionStorage.setItem(cacheKey, JSON.stringify({
					results: results,
					timestamp: Date.now()
				}));
			} catch (e) {
				// Ignore storage errors (quota exceeded, etc.)
			}

			if (results.length === 0) {
				if (this.currentSearchQuery === query) {
					dropdown.innerHTML = '<div class="autocomplete-empty">No results found - try a different term</div>';
					// Clear valid symbols
					this.validSymbols.clear();
				}
				return;
			}

			// Final check before rendering
			if (this.currentSearchQuery === query) {
				this.renderSearchResults(results, dropdown);
				// Load data scores asynchronously (non-blocking)
				this.loadDataScores(results.map(r => r.symbol));
			}

		} catch (error) {
			// Silently ignore AbortError (expected when request is cancelled)
			if (error.name === 'AbortError') {
				console.log('[Search] Request aborted for:', query);
				return;
			}

			// Only show error if this is still the current query
			if (this.currentSearchQuery !== query) {
				return;
			}

			console.error('[Autocomplete] Error:', error);
			// Check if it's a network error (server not running)
			if (error.name === 'TypeError' && error.message.includes('fetch')) {
				dropdown.innerHTML = '<div class="autocomplete-empty">Backend not running - start python_backend.py</div>';
			} else {
				dropdown.innerHTML = `<div class="autocomplete-empty">Connection error</div>`;
			}
		} finally {
			// Clear controller if this was the last request
			if (this.currentSearchQuery === query) {
				this.searchController = null;
			}
		}
	}

	updateSearchSelection(items, selectedIndex) {
		items.forEach((item, i) => {
			item.classList.toggle('selected', i === selectedIndex);
		});
		if (items[selectedIndex]) {
			items[selectedIndex].scrollIntoView({ block: 'nearest' });
		}
	}

	hideSearchAutocomplete() {
		const dropdown = this.shadowRoot.getElementById('autocomplete-dropdown');
		if (dropdown) {
			dropdown.classList.remove('show');
			dropdown.innerHTML = '';
		}
	}

	// Recent searches functionality
	getRecentSearches() {
		try {
			const stored = localStorage.getItem('recentStockSearches');
			if (stored) {
				return JSON.parse(stored);
			}
		} catch (error) {
			console.error('[Recent Searches] Error loading:', error);
		}
		return [];
	}

	saveRecentSearch(symbol) {
		try {
			let recent = this.getRecentSearches();
			// Remove if already exists
			recent = recent.filter(item => item.symbol !== symbol);
			// Add to beginning
			recent.unshift({ symbol, timestamp: Date.now() });
			// Keep only last 10
			recent = recent.slice(0, 10);
			// Save to localStorage
			localStorage.setItem('recentStockSearches', JSON.stringify(recent));
		} catch (error) {
			console.error('[Recent Searches] Error saving:', error);
		}
	}

	async showRecentSearches() {
		const dropdown = this.shadowRoot.getElementById('autocomplete-dropdown');
		if (!dropdown) {
			console.log('[Recent Searches] Dropdown not found');
			return;
		}

		const recent = this.getRecentSearches();
		console.log('[Recent Searches] Found', recent.length, 'recent searches:', recent);

		if (recent.length === 0) {
			console.log('[Recent Searches] No recent searches found');
			dropdown.classList.remove('show');
			return;
		}

		// Show recent searches immediately with symbols (fast)
		const recentItems = recent.slice(0, 10).map(item => ({
			...item,
			name: item.symbol, // Default to symbol, will be updated if API call succeeds
			type: 'Stock'
		}));

		dropdown.innerHTML = `
			<div class="recent-searches-header">Recent Searches</div>
			${recentItems.map((item) => `
				<div class="recent-search-item" data-symbol="${item.symbol}">
					<span class="recent-search-icon">🕒</span>
					<span class="recent-search-symbol">${item.symbol}</span>
					<span class="recent-search-name" id="name-${item.symbol.replace(/\./g, '-')}">${item.symbol}</span>
				</div>
			`).join('')}
		`;

		dropdown.classList.add('show');

		// Add click handlers for recent searches
		dropdown.querySelectorAll('.recent-search-item').forEach(item => {
			item.addEventListener('click', (e) => {
				e.stopPropagation();
				const symbol = item.dataset.symbol;
				console.log('[Recent Searches] Clicked on:', symbol);
				// Add to valid symbols so navigation works
				this.validSymbols.add(symbol.toUpperCase());
				// Save to recent searches (move to top)
				this.saveRecentSearch(symbol);
				// Navigate directly
				this.hideSearchAutocomplete();
				window.dispatchEvent(new CustomEvent('navigate', {
					detail: { page: 'stock-analysis', symbol: symbol.toUpperCase() }
				}));
				const searchInput = this.shadowRoot.getElementById('stock-search-input');
				if (searchInput) searchInput.value = '';
			});
		});

		// Try to fetch names asynchronously (non-blocking)
		recentItems.forEach(async (item) => {
			try {
				const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(item.symbol)}`);
				if (response.ok) {
					const data = await response.json();
					const match = data.results?.find(r => r.symbol.toUpperCase() === item.symbol.toUpperCase());
					if (match) {
						const nameElement = dropdown.querySelector(`#name-${item.symbol.replace(/\./g, '-')}`);
						if (nameElement) {
							nameElement.textContent = match.name;
						}
					}
				}
			} catch (error) {
				// Silently fail - symbol is already displayed
				console.log(`[Recent Searches] Could not fetch name for ${item.symbol}`);
			}
		});
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

	renderSearchResults(results, dropdown) {
		// Store valid symbols
		this.validSymbols.clear();
		results.forEach(item => {
			this.validSymbols.add(item.symbol.toUpperCase());
		});

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
				// Symbol is already validated since it comes from the dropdown
				// Save to recent searches
				this.saveRecentSearch(symbol);
				this.hideSearchAutocomplete();
				window.dispatchEvent(new CustomEvent('navigate', {
					detail: { page: 'stock-analysis', symbol: symbol }
				}));
				const searchInput = this.shadowRoot.getElementById('stock-search-input');
				if (searchInput) searchInput.value = '';
			});
		});
	}

	async loadDataScores(symbols) {
		if (!symbols || symbols.length === 0) return;

		try {
			// Use a shorter timeout for score loading (non-critical)
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

			const response = await fetch(`${API_BASE_URL}/api/check-data?symbols=${symbols.join(',')}`, {
				signal: controller.signal
			});
			clearTimeout(timeoutId);

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

			// Re-sort items by score (only if dropdown still exists and is visible)
			const dropdown = this.shadowRoot.getElementById('autocomplete-dropdown');
			if (dropdown && dropdown.classList.contains('show')) {
				const items = Array.from(dropdown.querySelectorAll('.autocomplete-item'));
				if (items.length > 0) {
					items.sort((a, b) => {
						const scoreA = scores[a.dataset.symbol]?.score || 0;
						const scoreB = scores[b.dataset.symbol]?.score || 0;
						return scoreB - scoreA;
					});
					// Only re-sort if scores actually changed the order
					const needsResort = items.some((item, index) => {
						const originalIndex = parseInt(item.dataset.index || '999');
						return index !== originalIndex;
					});
					if (needsResort) {
						items.forEach(item => dropdown.appendChild(item));
					}
				}
			}
		} catch (error) {
			if (error.name !== 'AbortError') {
				console.log('[DataScores] Could not load scores:', error.message);
			}
		}
	}

	getTimeRangeParams(timeRange) {
		// Returns { range: string, interval: string, daysBack: number } for Yahoo Finance API
		const params = {
			'1D': { range: '1d', interval: '5m', daysBack: 1 },
			'1W': { range: '5d', interval: '15m', daysBack: 7 },
			'1M': { range: '1mo', interval: '1d', daysBack: 30 },
			'3M': { range: '3mo', interval: '1d', daysBack: 90 },
			'YTD': { range: 'ytd', interval: '1d', daysBack: null }, // Special case
			'1Y': { range: '1y', interval: '1d', daysBack: 365 }
		};
		return params[timeRange] || params['1D'];
	}

	calculateChangeForTimeRange(data, timeRange) {
		// Calculate change based on the selected time range
		if (!data || !data.chartData || data.chartData.length === 0) {
			return { change: 0, changePercent: 0 };
		}

		const chartData = data.chartData;
		const currentPrice = data.currentPrice;
		let startPrice = chartData[0]?.value || currentPrice;

		if (timeRange === 'YTD') {
			// For YTD, find the price at the start of the year
			const currentYear = new Date().getFullYear();
			const yearStart = new Date(currentYear, 0, 1).getTime();
			const yearStartData = chartData.find(d => d.time >= yearStart);
			startPrice = yearStartData?.value || chartData[0]?.value || currentPrice;
		}

		const change = currentPrice - startPrice;
		const changePercent = startPrice !== 0 ? (change / startPrice) * 100 : 0;

		return { change, changePercent };
	}

	getChartTitle() {
		// Returns a human-readable chart title based on the selected time range
		const titles = {
			'1D': 'Today',
			'1W': 'Last 5 Days',
			'1M': 'Last Month',
			'3M': 'Last 3 Months',
			'YTD': 'Year to Date',
			'1Y': 'Last Year'
		};
		return titles[this.selectedTimeRange] || 'Last 3 Months';
	}

	async loadMarketData() {
		// Major Indices - with fallback symbols
		const indices = [
			{ symbol: '^GSPC', name: 'S&P 500', fallback: null },
			{ symbol: '^GDAXI', name: 'DAX', fallback: 'DAX' },
			{ symbol: '^N225', name: 'Nikkei 225', fallback: null },
			{ symbol: '^NDX', name: 'NASDAQ 100', fallback: null },
			{ symbol: '^HSI', name: 'Hang Seng', fallback: 'HSI' }
		];

		// Macro Risk Indicators
		// Some use Yahoo Finance, others use FRED API
		const macroIndicators = [
			{ symbol: '^VIX', name: 'VIX', description: 'Volatility Index', source: 'yahoo', fallback: 'VIX' },
			{ symbol: 'DGS10', name: '10Y Treasury', description: '10-Year Yield', source: 'fred' },
			{ symbol: 'T5YIFR', name: '5y5y Inflation Expectations', description: '5-Year, 5-Year Forward Inflation Expectation', source: 'fred' },
			{ symbol: 'BAMLC0A0CM', name: 'US Investment Grade OAS', description: 'Investment Grade Corporate Spread', source: 'fred' },
			{ symbol: 'TEDRATE', name: 'TED Spread', description: 'Treasury-Eurodollar Spread', source: 'fred' },
			{ symbol: 'STLFSI4', name: 'St. Louis Fed Financial Stress Index', description: 'Financial Stress Index', source: 'fred' },
			{ symbol: 'DCOILWTICO', name: 'WTI Crude Oil Price', description: 'West Texas Intermediate', source: 'fred' },
			{ symbol: 'DCOILBRENTEU', name: 'Brent Crude Oil Price', description: 'Brent Crude Oil', source: 'fred' },
			{ symbol: 'RRPONTSYD', name: 'ON RRP Usage', description: 'Overnight Reverse Repo', source: 'fred' },
			{ symbol: 'DX-Y.NYB', name: 'Dollar Index', description: 'USD Strength', source: 'yahoo', fallback: 'DX=F' },
			{ symbol: 'GC=F', name: 'Gold', description: 'Safe Haven Asset', source: 'yahoo', fallback: 'GC' }
		];

		// Currencies
		const currencies = [
			{ symbol: 'EURUSD=X', name: 'USD/EUR', fallback: null },
			{ symbol: 'GBPUSD=X', name: 'USD/GBP', fallback: null },
			{ symbol: 'JPY=X', name: 'USD/JPY', fallback: null }
		];

		// Commodities
		const commodities = [
			{ symbol: 'GC=F', name: 'Gold', fallback: 'GC' },
			{ symbol: 'SI=F', name: 'Silver', fallback: 'SI' },
			{ symbol: 'CL=F', name: 'WTI Crude Oil', fallback: 'CL' }
		];

		const indicesGrid = this.shadowRoot.getElementById('indices-grid');
		const macroGrid = this.shadowRoot.getElementById('macro-grid');
		const currenciesGrid = this.shadowRoot.getElementById('currencies-grid');
		const commoditiesGrid = this.shadowRoot.getElementById('commodities-grid');

		// Don't clear grids yet - keep old data visible during loading
		// Grids will be cleared only after new data is ready

		// Show loading overlay
		const loadingOverlay = this.shadowRoot.getElementById('loading-overlay');
		const progressBar = this.shadowRoot.getElementById('progress-bar');
		if (loadingOverlay) {
			loadingOverlay.classList.remove('hidden');
			loadingOverlay.style.display = 'flex';
		}

		// Set maximum display time to 3 seconds
		const maxDisplayTime = 2000;
		let overlayHidden = false;
		const hideOverlayAfterMaxTime = setTimeout(() => {
			if (loadingOverlay && !overlayHidden) {
				overlayHidden = true;
				if (progressBar) {
					progressBar.style.width = '100%';
				}
				setTimeout(() => {
					if (loadingOverlay) {
						loadingOverlay.classList.add('hidden');
						setTimeout(() => {
							if (loadingOverlay) {
								loadingOverlay.style.display = 'none';
							}
						}, 300);
					}
				}, 200);
			}
		}, maxDisplayTime);

		// Simulate progress (we'll update this as data loads)
		let progress = 0;
		const totalItems = indices.length + macroIndicators.length + currencies.length + commodities.length;
		let loadedItems = 0;

		const updateProgress = () => {
			loadedItems++;
			progress = Math.min(95, (loadedItems / totalItems) * 100);
			if (progressBar) {
				progressBar.style.width = progress + '%';
			}
		};

		// Load indices in parallel - fetch current and historical data in parallel for each index
		// Add small delay to avoid rate limiting (stagger requests slightly)
		const indexPromises = indices.map(async (index, idx) => {
			// Stagger requests by 50ms to avoid overwhelming the API
			if (idx > 0) {
				await new Promise(resolve => setTimeout(resolve, 50 * idx));
			}
			try {
				let data, historical;
				let symbol = index.symbol;

				try {
					// Fetch current and historical data in parallel
					[data, historical] = await Promise.all([
						this.fetchIndexData(symbol),
						this.fetchHistoricalData(symbol)
					]);
				} catch (error) {
					// Try fallback symbol if available
					if (index.fallback && index.fallback !== symbol) {
						console.log(`Trying fallback symbol ${index.fallback} for ${index.name}`);
						symbol = index.fallback;
						[data, historical] = await Promise.all([
							this.fetchIndexData(symbol),
							this.fetchHistoricalData(symbol)
						]);
					} else {
						throw error;
					}
				}

				const indication = this.calculateHistoricalIndication(data.currentPrice, historical);
				updateProgress();
				return { success: true, index, data, indication };
			} catch (error) {
				console.error(`Error loading ${index.name}:`, error);
				updateProgress();
				return { success: false, index, error };
			}
		});

		// Load macro indicators in parallel - fetch current and historical data in parallel
		// Add small delay to avoid rate limiting (stagger requests slightly)
		const macroPromises = macroIndicators.map(async (indicator, idx) => {
			// Stagger requests by 50ms to avoid overwhelming the API
			if (idx > 0) {
				await new Promise(resolve => setTimeout(resolve, 50 * idx));
			}
			try {
				let data, historical;
				let symbol = indicator.symbol;

				if (indicator.source === 'fred') {
					// FRED data - fetch in parallel
					[data, historical] = await Promise.all([
						this.fetchFredData(indicator.symbol),
						this.fetchFredHistoricalData(indicator.symbol)
					]);
				} else {
					try {
						// Yahoo Finance - fetch in parallel
						[data, historical] = await Promise.all([
							this.fetchIndexData(symbol),
							this.fetchHistoricalData(symbol)
						]);
					} catch (error) {
						// Try fallback symbol if available
						if (indicator.fallback && indicator.fallback !== symbol) {
							console.log(`Trying fallback symbol ${indicator.fallback} for ${indicator.name}`);
							symbol = indicator.fallback;
							[data, historical] = await Promise.all([
								this.fetchIndexData(symbol),
								this.fetchHistoricalData(symbol)
							]);
						} else {
							throw error;
						}
					}
				}

				const indication = this.calculateHistoricalIndication(data.currentPrice, historical);
				updateProgress();
				return { success: true, indicator, data, indication };
			} catch (error) {
				console.error(`Error loading ${indicator.name}:`, error);
				updateProgress();
				return { success: false, indicator, error };
			}
		});

		// Load currencies in parallel
		const currencyPromises = currencies.map(async (currency, idx) => {
			if (idx > 0) {
				await new Promise(resolve => setTimeout(resolve, 50 * idx));
			}
			try {
				let data, historical;
				let symbol = currency.symbol;

				try {
					[data, historical] = await Promise.all([
						this.fetchIndexData(symbol),
						this.fetchHistoricalData(symbol)
					]);
				} catch (error) {
					if (currency.fallback && currency.fallback !== symbol) {
						console.log(`Trying fallback symbol ${currency.fallback} for ${currency.name}`);
						symbol = currency.fallback;
						[data, historical] = await Promise.all([
							this.fetchIndexData(symbol),
							this.fetchHistoricalData(symbol)
						]);
					} else {
						throw error;
					}
				}

				const indication = this.calculateHistoricalIndication(data.currentPrice, historical);
				updateProgress();
				return { success: true, currency, data, indication };
			} catch (error) {
				console.error(`Error loading ${currency.name}:`, error);
				updateProgress();
				return { success: false, currency, error };
			}
		});

		// Load commodities in parallel
		const commodityPromises = commodities.map(async (commodity, idx) => {
			if (idx > 0) {
				await new Promise(resolve => setTimeout(resolve, 50 * idx));
			}
			try {
				let data, historical;
				let symbol = commodity.symbol;

				try {
					[data, historical] = await Promise.all([
						this.fetchIndexData(symbol),
						this.fetchHistoricalData(symbol)
					]);
				} catch (error) {
					if (commodity.fallback && commodity.fallback !== symbol) {
						console.log(`Trying fallback symbol ${commodity.fallback} for ${commodity.name}`);
						symbol = commodity.fallback;
						[data, historical] = await Promise.all([
							this.fetchIndexData(symbol),
							this.fetchHistoricalData(symbol)
						]);
					} else {
						throw error;
					}
				}

				const indication = this.calculateHistoricalIndication(data.currentPrice, historical);
				updateProgress();
				return { success: true, commodity, data, indication };
			} catch (error) {
				console.error(`Error loading ${commodity.name}:`, error);
				updateProgress();
				return { success: false, commodity, error };
			}
		});

		// Wait for all promises to complete in parallel
		const [indexResults, macroResults, currencyResults, commodityResults] = await Promise.all([
			Promise.all(indexPromises),
			Promise.all(macroPromises),
			Promise.all(currencyPromises),
			Promise.all(commodityPromises)
		]);

		// Clear grids only after new data is ready to replace old data
		indicesGrid.innerHTML = '';
		macroGrid.innerHTML = '';
		currenciesGrid.innerHTML = '';
		commoditiesGrid.innerHTML = '';

		// Render global overview panel
		this.renderGlobalOverview(indexResults);

		// Render indices
		indexResults.forEach((result, idx) => {
			if (result.success) {
				const index = indices[idx];
				const card = this.createIndexCard(result.index.name, result.data, result.indication, index.symbol, 'yahoo');
				indicesGrid.appendChild(card);
			} else {
				const card = this.createErrorCard(result.index.name);
				indicesGrid.appendChild(card);
			}
		});

		// Render macro overview panel
		this.renderMacroOverview(macroResults);

		// Render macro indicators
		macroResults.forEach((result, idx) => {
			if (result.success) {
				const indicator = macroIndicators[idx];
				const card = this.createMacroCard(result.indicator.name, result.indicator.description, result.data, result.indication, indicator.symbol, indicator.source);
				macroGrid.appendChild(card);
			} else {
				const card = this.createErrorCard(result.indicator.name);
				macroGrid.appendChild(card);
			}
		});

		// Render currencies overview panel
		this.renderCurrenciesOverview(currencyResults, commodityResults);

		// Render currencies
		currencyResults.forEach((result, idx) => {
			if (result.success) {
				const currency = currencies[idx];
				const card = this.createIndexCard(result.currency.name, result.data, result.indication, currency.symbol, 'yahoo');
				currenciesGrid.appendChild(card);
			} else {
				const card = this.createErrorCard(result.currency.name);
				currenciesGrid.appendChild(card);
			}
		});

		// Render commodities
		commodityResults.forEach((result, idx) => {
			if (result.success) {
				const commodity = commodities[idx];
				const card = this.createIndexCard(result.commodity.name, result.data, result.indication, commodity.symbol, 'yahoo');
				commoditiesGrid.appendChild(card);
			} else {
				const card = this.createErrorCard(result.commodity.name);
				commoditiesGrid.appendChild(card);
			}
		});

		// Hide loading overlay (only if not already hidden by timeout)
		clearTimeout(hideOverlayAfterMaxTime);
		if (!overlayHidden) {
			overlayHidden = true;
			if (progressBar) {
				progressBar.style.width = '100%';
			}
			setTimeout(() => {
				if (loadingOverlay) {
					loadingOverlay.classList.add('hidden');
					setTimeout(() => {
						if (loadingOverlay) {
							loadingOverlay.style.display = 'none';
						}
					}, 300);
				}
			}, 200);
		}
	}

	renderGlobalOverview(indexResults) {
		const panel = this.shadowRoot.getElementById('global-overview-panel');
		const contentContainer = this.shadowRoot.getElementById('global-overview-content');
		if (!panel || !contentContainer) {
			console.error('[Global Overview] Panel or content container not found');
			return;
		}

		console.log('[Global Overview] Rendering with results:', indexResults);
		const successfulIndices = indexResults.filter(r => r.success);
		console.log('[Global Overview] Successful indices:', successfulIndices.length);

		if (successfulIndices.length === 0) {
			contentContainer.innerHTML = '<div class="loading">No data available</div>';
			return;
		}

		// Map indices to flags and regions
		const indexMap = {
			'S&P 500': { flag: '🇺🇸', region: 'North America' },
			'DAX': { flag: '🇩🇪', region: 'Europe' },
			'Nikkei 225': { flag: '🇯🇵', region: 'Asia' },
			'NASDAQ 100': { flag: '🇺🇸', region: 'North America' },
			'Hang Seng': { flag: '🇭🇰', region: 'Asia' }
		};

		// Calculate summary statistics
		let totalPositive = 0;
		let totalNegative = 0;
		let totalNeutral = 0;
		let avgChange = 0;
		let validChanges = 0;

		successfulIndices.forEach(result => {
			const change = result.data?.changePercent || 0;
			if (change > 0) totalPositive++;
			else if (change < 0) totalNegative++;
			else totalNeutral++;

			if (change !== 0) {
				avgChange += change;
				validChanges++;
			}
		});

		avgChange = validChanges > 0 ? avgChange / validChanges : 0;

		// Get the original indices array to get symbols
		const indices = [
			{ symbol: '^GSPC', name: 'S&P 500' },
			{ symbol: '^GDAXI', name: 'DAX' },
			{ symbol: '^N225', name: 'Nikkei 225' },
			{ symbol: '^NDX', name: 'NASDAQ 100' },
			{ symbol: '^HSI', name: 'Hang Seng' }
		];

		// Determine panel color based on majority
		const panelColorClass = totalPositive > totalNegative ? 'majority-positive' : totalNegative > totalPositive ? 'majority-negative' : 'risk-neutral';

		// Render global overview (only update content container, not the entire panel)
		contentContainer.innerHTML = `
			<div class="global-indices-grid">
				${successfulIndices.map((result, idx) => {
			const originalIndex = indices.find(i => i.name === result.index.name) || indices[idx];
			const indexInfo = indexMap[result.index.name] || { flag: '📊', region: 'Global' };
			const change = result.data?.changePercent || 0;
			const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
			const changeSign = change > 0 ? '+' : '';
			const price = result.data?.currentPrice || 0;
			const symbol = originalIndex?.symbol || result.index.symbol || '';
			const displayName = result.index.name;

			return `
						<div class="global-index-item ${changeClass}" data-symbol="${symbol}">
							<div class="global-index-name">${displayName}</div>
							<div class="global-index-price">${this.formatPrice(price)}</div>
							<div class="global-index-change ${changeClass}">
								${changeSign}${change.toFixed(2)}%
							</div>
						</div>
					`;
		}).join('')}
			</div>
			<div class="global-summary">
				<div class="global-summary-item">
					<div class="global-summary-label">Up (${this.selectedTimeRange})</div>
					<div class="global-summary-value positive">${this.formatNumberWithSeparator(totalPositive)}</div>
				</div>
				<div class="global-summary-item">
					<div class="global-summary-label">Down (${this.selectedTimeRange})</div>
					<div class="global-summary-value negative">${this.formatNumberWithSeparator(totalNegative)}</div>
				</div>
				<div class="global-summary-item">
					<div class="global-summary-label">Avg (${this.selectedTimeRange})</div>
					<div class="global-summary-value ${avgChange >= 0 ? 'positive' : 'negative'}">
						${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%
					</div>
				</div>
			</div>
		`;

		// Set panel color based on majority
		panel.className = `global-overview-panel ${panelColorClass}`;

		// Add click handlers to navigate to detail pages
		panel.querySelectorAll('.global-index-item').forEach(item => {
			item.addEventListener('click', () => {
				const symbol = item.dataset.symbol;
				const name = item.querySelector('.global-index-name')?.textContent || '';
				if (symbol) {
					window.dispatchEvent(new CustomEvent('navigate', {
						detail: { page: 'indicator-detail', symbol: symbol, name: name }
					}));
				}
			});
		});
	}

	renderCurrenciesOverview(currencyResults, commodityResults) {
		const panel = this.shadowRoot.getElementById('currencies-overview-panel');
		if (!panel) {
			console.error('[Currencies Overview] Panel not found');
			return;
		}

		const successfulCurrencies = currencyResults.filter(r => r.success);

		if (successfulCurrencies.length === 0) {
			panel.innerHTML = '<div class="loading">No data available</div>';
			return;
		}

		// Map currencies to icons
		const itemMap = {
			'USD/EUR': { icon: '💶', category: 'Currency' },
			'USD/GBP': { icon: '💷', category: 'Currency' },
			'USD/JPY': { icon: '💴', category: 'Currency' }
		};

		// Calculate summary statistics
		let totalPositive = 0;
		let totalNegative = 0;
		let totalNeutral = 0;
		let avgChange = 0;
		let validChanges = 0;

		successfulCurrencies.forEach(result => {
			const change = result.data?.changePercent || 0;
			if (change > 0) totalPositive++;
			else if (change < 0) totalNegative++;
			else totalNeutral++;

			if (change !== 0) {
				avgChange += change;
				validChanges++;
			}
		});

		avgChange = validChanges > 0 ? avgChange / validChanges : 0;

		// Determine panel color based on majority
		const panelColorClass = totalPositive > totalNegative ? 'majority-positive' : totalNegative > totalPositive ? 'majority-negative' : 'risk-neutral';

		// Render currencies overview
		panel.innerHTML = `
			<div class="global-indices-grid">
				${successfulCurrencies.map((result) => {
			const itemName = result.currency?.name || '';
			const itemInfo = itemMap[itemName] || { icon: '📊', category: 'Currency' };
			const change = result.data?.changePercent || 0;
			const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
			const changeSign = change > 0 ? '+' : '';
			const price = result.data?.currentPrice || 0;
			const symbol = result.currency?.symbol || '';
			const displayName = itemName;

			return `
						<div class="global-index-item ${changeClass}" data-symbol="${symbol}" data-source="yahoo">
							<div class="global-index-name">${displayName}</div>
							<div class="global-index-price">${this.formatCurrencyCommodityPrice(price, itemName)}</div>
							<div class="global-index-change ${changeClass}">
								${changeSign}${change.toFixed(2)}%
							</div>
						</div>
					`;
		}).join('')}
			</div>
			<div class="global-summary">
				<div class="global-summary-item">
					<div class="global-summary-label">Up (${this.selectedTimeRange})</div>
					<div class="global-summary-value positive">${this.formatNumberWithSeparator(totalPositive)}</div>
				</div>
				<div class="global-summary-item">
					<div class="global-summary-label">Down (${this.selectedTimeRange})</div>
					<div class="global-summary-value negative">${this.formatNumberWithSeparator(totalNegative)}</div>
				</div>
				<div class="global-summary-item">
					<div class="global-summary-label">Avg (${this.selectedTimeRange})</div>
					<div class="global-summary-value ${avgChange >= 0 ? 'positive' : 'negative'}">
						${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%
					</div>
				</div>
			</div>
		`;

		// Set panel color based on majority
		panel.className = `global-overview-panel ${panelColorClass}`;

		// Add click handlers to navigate to detail pages
		panel.querySelectorAll('.global-index-item').forEach(item => {
			item.addEventListener('click', () => {
				const symbol = item.dataset.symbol;
				const name = item.querySelector('.global-index-name')?.textContent || '';
				if (symbol) {
					window.dispatchEvent(new CustomEvent('navigate', {
						detail: { page: 'indicator-detail', symbol: symbol, name: name, source: 'yahoo' }
					}));
				}
			});
		});
	}

	formatNumberWithSeparator(num) {
		return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}

	formatCurrencyCommodityPrice(price, name) {
		// Format currencies (typically 4-5 decimal places)
		if (name.includes('USD/EUR') || name.includes('USD/GBP') || name.includes('USD/JPY')) {
			if (price >= 100) return this.formatNumberWithSeparator(parseFloat(price.toFixed(2)));
			return price.toFixed(4);
		}
		// Format commodities
		if (name.includes('Gold') || name.includes('Silver')) {
			return '$' + this.formatNumberWithSeparator(parseFloat(price.toFixed(2)));
		}
		if (name.includes('Oil')) {
			return '$' + this.formatNumberWithSeparator(parseFloat(price.toFixed(2)));
		}
		return this.formatNumberWithSeparator(parseFloat(price.toFixed(2)));
	}

	renderMacroOverview(macroResults) {
		const panel = this.shadowRoot.getElementById('macro-overview-panel');
		if (!panel) {
			console.error('[Macro Overview] Panel not found');
			return;
		}

		const successfulMacros = macroResults.filter(r => r.success);

		if (successfulMacros.length === 0) {
			panel.innerHTML = '<div class="loading">No data available</div>';
			return;
		}

		// Filter to only show the 5 most important indicators: VIX, Gold, Inflation Expectations, Oil, Dollar Index
		const importantIndicators = ['VIX', 'Gold', '5y5y Inflation Expectations', 'WTI Crude Oil Price', 'Dollar Index'];
		const filteredMacros = successfulMacros.filter(result => {
			const name = result.indicator.name;
			return importantIndicators.some(important => name.includes(important) || important.includes(name));
		});

		// Calculate summary statistics based on ALL macro indicators (not just filtered ones)
		// For Macro Risk: Up (increasing risk) is BAD (red), Down (decreasing risk) is GOOD (green)
		// VIX and Gold are inverse: rising VIX/Gold = bad (red), falling = good (green)
		let totalBad = 0;  // Increasing risk indicators (red)
		let totalGood = 0; // Decreasing risk indicators (green)
		let totalNeutral = 0;

		successfulMacros.forEach(result => {
			const change = result.data?.changePercent || 0;
			const name = result.indicator.name;
			const isInverse = name.includes('VIX') || name.includes('Gold');

			// For inverse indicators: positive change is bad, negative change is good
			// For normal indicators: positive change is bad (increasing risk), negative change is good
			if (isInverse) {
				if (change > 0) totalBad++;  // VIX/Gold rising = bad
				else if (change < 0) totalGood++;  // VIX/Gold falling = good
				else totalNeutral++;
			} else {
				if (change > 0) totalBad++;  // Risk indicator rising = bad
				else if (change < 0) totalGood++;  // Risk indicator falling = good
				else totalNeutral++;
			}
		});

		// Get the original macro indicators array to get symbols
		const macroIndicators = [
			{ symbol: '^VIX', name: 'VIX', source: 'yahoo' },
			{ symbol: 'DGS10', name: '10Y Treasury', source: 'fred' },
			{ symbol: 'T5YIFR', name: '5y5y Inflation Expectations', source: 'fred' },
			{ symbol: 'BAMLC0A0CM', name: 'US Investment Grade OAS', source: 'fred' },
			{ symbol: 'TEDRATE', name: 'TED Spread', source: 'fred' },
			{ symbol: 'STLFSI4', name: 'St. Louis Fed Financial Stress Index', source: 'fred' },
			{ symbol: 'DCOILWTICO', name: 'WTI Crude Oil Price', source: 'fred' },
			{ symbol: 'DCOILBRENTEU', name: 'Brent Crude Oil Price', source: 'fred' },
			{ symbol: 'RRPONTSYD', name: 'ON RRP Usage', source: 'fred' },
			{ symbol: 'DX-Y.NYB', name: 'Dollar Index', source: 'yahoo' },
			{ symbol: 'GC=F', name: 'Gold', source: 'yahoo' }
		];

		// Shorten names for 2-line display
		const shortenName = (name) => {
			const shortNames = {
				'VIX': 'VIX',
				'Gold': 'Gold',
				'5y5y Inflation Expectations': '5y5y Inflation',
				'WTI Crude Oil Price': 'WTI Oil',
				'Dollar Index': 'Dollar Index'
			};
			return shortNames[name] || name;
		};

		// Determine panel color based on majority (more bad = red, more good = green)
		const panelColorClass = totalBad > totalGood ? 'risk-high' : totalGood > totalBad ? 'risk-low' : 'risk-neutral';

		// Render macro overview - display like Global Market Overview (5 items in a row)
		panel.innerHTML = `
			<div class="global-indices-grid">
				${filteredMacros.map((result, idx) => {
			const originalMacro = macroIndicators.find(m => m.name === result.indicator.name) || macroIndicators[idx];
			const change = result.data?.changePercent || 0;
			const name = result.indicator.name;
			const isInverse = name.includes('VIX') || name.includes('Gold');

			// For inverse indicators: positive change = bad (red), negative change = good (green)
			// For normal indicators: positive change = bad (red), negative change = good (green)
			let changeClass;
			if (isInverse) {
				changeClass = change > 0 ? 'negative' : change < 0 ? 'positive' : 'neutral';
			} else {
				changeClass = change > 0 ? 'negative' : change < 0 ? 'positive' : 'neutral';
			}

			const changeSign = change > 0 ? '+' : '';
			const price = result.data?.currentPrice || 0;
			const symbol = originalMacro?.symbol || '';
			const displayName = shortenName(result.indicator.name);

			return `
						<div class="global-index-item ${changeClass}" data-symbol="${symbol}" data-source="${originalMacro?.source || 'yahoo'}">
							<div class="global-index-name">${displayName}</div>
							<div class="global-index-price">${this.formatMacroPrice(price, result.indicator.name)}</div>
							<div class="global-index-change ${changeClass}">
								${changeSign}${change.toFixed(2)}%
							</div>
						</div>
					`;
		}).join('')}
			</div>
			<div class="global-summary">
				<div class="global-summary-item">
					<div class="global-summary-label">Up (${this.selectedTimeRange})</div>
					<div class="global-summary-value negative">${this.formatNumberWithSeparator(totalBad)}</div>
				</div>
				<div class="global-summary-item">
					<div class="global-summary-label">Down (${this.selectedTimeRange})</div>
					<div class="global-summary-value positive">${this.formatNumberWithSeparator(totalGood)}</div>
				</div>
			</div>
		`;

		// Set panel color based on majority
		panel.className = `global-overview-panel ${panelColorClass}`;

		// Add click handlers to navigate to detail pages
		panel.querySelectorAll('.global-index-item').forEach(item => {
			item.addEventListener('click', () => {
				const symbol = item.dataset.symbol;
				const source = item.dataset.source || 'yahoo';
				const name = item.querySelector('.global-index-name')?.textContent || '';
				if (symbol) {
					window.dispatchEvent(new CustomEvent('navigate', {
						detail: { page: 'indicator-detail', symbol: symbol, name: name, source: source }
					}));
				}
			});
		});
	}

	formatMacroPrice(price, name) {
		// Format differently based on indicator type
		if (name.includes('Treasury') || name.includes('Yield') || name.includes('Inflation') || name.includes('OAS') || name.includes('TED Spread')) {
			return price.toFixed(3) + '%';
		}
		if (name.includes('ON RRP') || name.includes('Usage')) {
			// Format large numbers (billions)
			if (price >= 1e9) return this.formatNumberWithSeparator(parseFloat((price / 1e9).toFixed(1))) + 'B';
			if (price >= 1e6) return this.formatNumberWithSeparator(parseFloat((price / 1e6).toFixed(1))) + 'M';
			return this.formatNumberWithSeparator(parseFloat(price.toFixed(0)));
		}
		if (name.includes('Oil') || name.includes('Crude')) {
			return '$' + this.formatNumberWithSeparator(parseFloat(price.toFixed(2)));
		}
		if (name.includes('Financial Stress')) {
			return this.formatNumberWithSeparator(parseFloat(price.toFixed(2)));
		}
		if (price >= 1000) return this.formatNumberWithSeparator(parseFloat(price.toFixed(1)));
		if (price >= 100) return this.formatNumberWithSeparator(parseFloat(price.toFixed(2)));
		if (price >= 10) return this.formatNumberWithSeparator(parseFloat(price.toFixed(2)));
		return price.toFixed(3);
	}

	formatPrice(price) {
		let formatted;
		if (price >= 10000) formatted = price.toFixed(0);
		else if (price >= 1000) formatted = price.toFixed(1);
		else if (price >= 100) formatted = price.toFixed(2);
		else formatted = price.toFixed(2);
		return this.formatNumberWithSeparator(parseFloat(formatted));
	}

	async fetchIndexData(symbol, retries = 2, useSelectedTimeRange = true) {
		const timeParams = useSelectedTimeRange ? this.getTimeRangeParams(this.selectedTimeRange) : { range: '3mo', interval: '1d' };
		const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${timeParams.interval}&range=${timeParams.range}`;

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				// Always use CORS proxy (direct fetch will be blocked by CORS)
				const { fetchWithProxy } = await import('../utils/proxy.js');
				const data = await fetchWithProxy(yahooUrl);

				// Check for API errors in response
				if (data.chart && data.chart.error) {
					throw new Error(data.chart.error.description || 'API error');
				}

				const parsedData = this.parseYahooData(data, symbol);

				// Calculate change based on selected time range
				if (useSelectedTimeRange) {
					const rangeChange = this.calculateChangeForTimeRange(parsedData, this.selectedTimeRange);
					parsedData.change = rangeChange.change;
					parsedData.changePercent = rangeChange.changePercent;
				}

				return parsedData;
			} catch (error) {
				if (attempt === retries) {
					throw error;
				}
				// Wait before retry (exponential backoff)
				await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
			}
		}
	}

	async fetchMultipleIndexData(symbols) {
		// Yahoo Finance API supports multiple symbols: symbol1,symbol2,symbol3
		const symbolsStr = symbols.join(',');
		const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolsStr}?interval=1d&range=3mo`;

		let response;
		let data;
		try {
			response = await fetch(yahooUrl);
			if (!response.ok) throw new Error('Direct fetch failed');
			data = await response.json();
		} catch (error) {
			const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;
			response = await fetch(proxyUrl);
			if (!response.ok) throw new Error('Proxy fetch failed');
			const proxyData = await response.json();
			data = JSON.parse(proxyData.contents);
		}

		// Parse multi-symbol response
		if (!data.chart || !data.chart.result) {
			throw new Error('Invalid response format');
		}

		const results = {};
		data.chart.result.forEach((result, index) => {
			const symbol = symbols[index];
			if (symbol && result) {
				try {
					results[symbol] = this.parseYahooData({ chart: { result: [result] } }, symbol);
				} catch (e) {
					console.error(`Error parsing data for ${symbol}:`, e);
				}
			}
		});

		return results;
	}

	async fetchHistoricalData(symbol, retries = 2) {
		// Fetch data based on selected time range for historical comparison
		// Use a longer range for historical comparison (always 1Y for the indication)
		const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`;

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				// Always use CORS proxy (direct fetch will be blocked by CORS)
				const { fetchWithProxy } = await import('../utils/proxy.js');
				const data = await fetchWithProxy(yahooUrl);

				// Check for API errors
				if (data.chart && data.chart.error) {
					throw new Error(data.chart.error.description || 'API error');
				}

				if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
					return null;
				}

				const result = data.chart.result[0];
				const quotes = result.indicators?.quote?.[0];
				const closes = quotes?.close || [];

				// Filter out null values
				const validCloses = closes.filter(c => c !== null && c !== undefined);
				if (validCloses.length === 0) return null;

				return {
					min: Math.min(...validCloses),
					max: Math.max(...validCloses),
					median: validCloses.sort((a, b) => a - b)[Math.floor(validCloses.length / 2)],
					values: validCloses
				};
			} catch (error) {
				if (attempt === retries) {
					console.warn(`Failed to fetch historical data for ${symbol} after ${retries + 1} attempts:`, error);
					return null; // Return null instead of throwing, so we can still show current data
				}
				// Wait before retry (exponential backoff)
				await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
			}
		}
	}

	async fetchFredData(seriesId, retries = 2) {
		const timeParams = this.getTimeRangeParams(this.selectedTimeRange);

		// Calculate how many data points we need based on time range
		const daysToFetch = timeParams.daysBack || 365; // Default to 1 year for YTD

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				// Use proxy utility for FRED API - API key is read from .env on backend
				const { fetchFredWithProxy } = await import('../utils/proxy.js');
				const data = await fetchFredWithProxy(seriesId, { limit: Math.max(daysToFetch, 365), sort_order: 'desc' });

				// Check for FRED API errors
				if (data.error_message) {
					throw new Error(data.error_message);
				}

				const observations = data.observations || [];
				const validObs = observations.filter(o => o.value !== '.' && o.value !== '' && !isNaN(Number(o.value)));

				if (validObs.length === 0) {
					throw new Error('No valid data');
				}

				const currentPrice = Number(validObs[0].value);

				// Build chart data (reversed for chronological order)
				const chartData = validObs.slice().reverse().map(o => ({
					time: new Date(o.date).getTime(),
					value: Number(o.value)
				}));

				// Calculate change based on selected time range
				let startPrice = currentPrice;
				const now = Date.now();

				if (this.selectedTimeRange === 'YTD') {
					const currentYear = new Date().getFullYear();
					const yearStart = new Date(currentYear, 0, 1).getTime();
					const yearStartData = chartData.find(d => d.time >= yearStart);
					startPrice = yearStartData?.value || chartData[0]?.value || currentPrice;
				} else if (this.selectedTimeRange === '1D') {
					// For 1D, use the previous observation
					startPrice = validObs.length > 1 ? Number(validObs[1].value) : currentPrice;
				} else {
					// Find the data point closest to the start of the time range
					const targetTime = now - (daysToFetch * 24 * 60 * 60 * 1000);
					const targetData = chartData.find(d => d.time >= targetTime);
					startPrice = targetData?.value || chartData[0]?.value || currentPrice;
				}

				const change = currentPrice - startPrice;
				const changePercent = startPrice !== 0 ? (change / startPrice) * 100 : 0;

				// Calculate YTD for FRED data (always calculated for YTD display)
				const currentYear = new Date().getFullYear();
				const yearStart = new Date(currentYear, 0, 1).getTime();
				const yearStartValue = chartData.find(d => d.time >= yearStart)?.value || currentPrice;
				const ytdChange = currentPrice - yearStartValue;
				const ytdPercent = yearStartValue !== 0 ? (ytdChange / yearStartValue) * 100 : 0;

				// Filter chart data to only include data within the selected time range
				let filteredChartData = chartData;
				if (this.selectedTimeRange !== 'YTD') {
					const cutoffTime = now - (daysToFetch * 24 * 60 * 60 * 1000);
					filteredChartData = chartData.filter(d => d.time >= cutoffTime);
				} else {
					filteredChartData = chartData.filter(d => d.time >= yearStart);
				}

				return {
					currentPrice,
					change,
					changePercent,
					ytdChange,
					ytdPercent,
					chartData: filteredChartData.length > 0 ? filteredChartData : chartData.slice(-90)
				};
			} catch (error) {
				if (attempt === retries) {
					console.error(`FRED API error for ${seriesId} after ${retries + 1} attempts:`, error);
					throw error;
				}
				// Wait before retry (exponential backoff)
				await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
			}
		}
	}

	async fetchFredHistoricalData(seriesId, retries = 2) {
		const observationStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				// Use proxy utility for FRED API - API key is read from .env on backend
				const { fetchFredWithProxy } = await import('../utils/proxy.js');
				const data = await fetchFredWithProxy(seriesId, { observation_start: observationStart, sort_order: 'asc' });

				// Check for FRED API errors
				if (data.error_message) {
					throw new Error(data.error_message);
				}

				const observations = data.observations || [];
				const validValues = observations
					.filter(o => o.value !== '.' && o.value !== '' && !isNaN(Number(o.value)))
					.map(o => Number(o.value));

				if (validValues.length === 0) return null;

				return {
					min: Math.min(...validValues),
					max: Math.max(...validValues),
					median: validValues.sort((a, b) => a - b)[Math.floor(validValues.length / 2)],
					values: validValues
				};
			} catch (error) {
				if (attempt === retries) {
					console.warn(`FRED historical data error for ${seriesId} after ${retries + 1} attempts:`, error);
					return null; // Return null instead of throwing
				}
				// Wait before retry (exponential backoff)
				await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
			}
		}
	}

	calculateHistoricalIndication(currentPrice, historical) {
		if (!historical || !currentPrice) {
			return { status: 'neutral', text: 'N/A', percentile: null };
		}

		const { min, max, values } = historical;
		const range = max - min;
		if (range === 0) {
			return { status: 'neutral', text: 'Stable', percentile: 50 };
		}

		// Calculate percentile
		const below = values.filter(v => v < currentPrice).length;
		const percentile = (below / values.length) * 100;

		let status, text;
		if (percentile >= 80) {
			status = 'high';
			text = `High ${percentile.toFixed(0)}th`;
		} else if (percentile <= 20) {
			status = 'low';
			text = `Low ${percentile.toFixed(0)}th`;
		} else {
			status = 'neutral';
			text = `Normal ${percentile.toFixed(0)}th`;
		}

		return { status, text, percentile };
	}

	parseYahooData(data, symbol) {
		if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
			throw new Error('No data in response');
		}

		const result = data.chart.result[0];
		const meta = result.meta;

		if (!meta) {
			throw new Error('No metadata in response');
		}

		const timestamps = result.timestamp || [];
		const quotes = result.indicators?.quote?.[0];
		const closes = quotes?.close || [];

		const validData = [];
		for (let i = 0; i < timestamps.length; i++) {
			if (closes[i] !== null && closes[i] !== undefined) {
				validData.push({
					time: timestamps[i] * 1000,
					value: closes[i]
				});
			}
		}

		const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
		// Get previous close from chart data if not in meta
		let previousClose = meta.previousClose;
		if (!previousClose && validData.length > 1) {
			// Use second-to-last value as previous close
			previousClose = validData[validData.length - 2]?.value || currentPrice;
		}
		previousClose = previousClose || currentPrice;
		const change = currentPrice - previousClose;
		const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

		// Calculate YTD (Year-to-Date)
		const currentYear = new Date().getFullYear();
		const yearStart = new Date(currentYear, 0, 1).getTime();
		const yearStartData = validData.find(d => d.time >= yearStart);
		const ytdStartPrice = yearStartData?.value || validData[0]?.value || currentPrice;
		const ytdChange = currentPrice - ytdStartPrice;
		const ytdPercent = ytdStartPrice !== 0 ? (ytdChange / ytdStartPrice) * 100 : 0;

		return {
			currentPrice,
			change,
			changePercent,
			ytdChange,
			ytdPercent,
			chartData: validData // Keep all 3 months of data
		};
	}

	getCardDescription(name) {
		const descriptions = {
			'S&P 500': 'US stock market benchmark index',
			'DAX': 'German stock market index',
			'Nikkei 225': 'Japanese stock market index',
			'NASDAQ 100': 'US technology stock index',
			'Hang Seng': 'Hong Kong stock market index',
			'VIX': 'Market volatility indicator',
			'10Y Treasury': 'US government bond yield',
			'5y5y Inflation Expectations': 'Long-term inflation outlook',
			'US Investment Grade OAS': 'Corporate credit risk measure',
			'TED Spread': 'Interbank lending risk indicator',
			'St. Louis Fed Financial Stress Index': 'Financial market stress gauge',
			'WTI Crude Oil Price': 'US oil benchmark price',
			'Brent Crude Oil Price': 'International oil benchmark',
			'ON RRP Usage': 'Federal Reserve liquidity tool',
			'Dollar Index': 'US dollar strength measure',
			'Gold': 'Precious metal safe haven asset',
			'USD/EUR': 'Euro exchange rate',
			'USD/GBP': 'British pound exchange rate',
			'USD/JPY': 'Japanese yen exchange rate'
		};
		return descriptions[name] || 'Market indicator';
	}

	createIndexCard(name, data, indication, symbol, source = 'yahoo') {
		const card = document.createElement('div');
		card.className = `index-card ${indication.status}`;
		card.style.cursor = 'pointer';

		const changeClass = data.change >= 0 ? 'positive' : 'negative';
		const changeSign = data.change >= 0 ? '+' : '';
		const description = this.getCardDescription(name);

		// Get chart title based on time range
		const chartTitle = this.getChartTitle();

		card.innerHTML = `
			<div class="card-header">
				<div class="card-name">${name}</div>
				<div class="historical-indication ${indication.status}" title="Percentile based on 1-year historical data: ${indication.text}">
					${indication.text}
					<span style="font-size: 0.7rem; opacity: 0.7; margin-left: 4px;">(vs. 1Y)</span>
				</div>
			</div>
			<div class="card-content">
				<div class="card-data">
					<div class="card-price">${this.formatPrice(data.currentPrice)}</div>
					<div class="card-change ${changeClass}">
						${this.selectedTimeRange}: ${changeSign}${data.change.toFixed(2)} (${changeSign}${data.changePercent.toFixed(2)}%)
					</div>
					<div class="card-description">${description}</div>
				</div>
				<div class="chart-container">
					<div class="chart-title">${chartTitle}</div>
					<canvas id="chart-${name}"></canvas>
				</div>
			</div>
		`;

		// Make card clickable - use capture phase to ensure it works
		card.addEventListener('click', (e) => {
			e.stopPropagation();
			console.log('Card clicked:', name, symbol);
			window.dispatchEvent(new CustomEvent('navigate', {
				detail: {
					page: 'indicator-detail',
					symbol: symbol,
					name: name,
					description: '',
					source: source
				}
			}));
		}, true);

		setTimeout(() => {
			this.renderMiniChart(card.querySelector('canvas'), data.chartData, data.changePercent);
		}, 200);

		return card;
	}

	createMacroCard(name, description, data, indication, symbol, source = 'yahoo') {
		const card = document.createElement('div');
		card.className = `macro-card ${indication.status}`;
		card.style.cursor = 'pointer';

		const changeClass = data.change >= 0 ? 'positive' : 'negative';
		const changeSign = data.change >= 0 ? '+' : '';

		// Get chart title based on time range
		const chartTitle = this.getChartTitle();

		card.innerHTML = `
			<div class="card-header">
				<div>
					<div class="card-name">${name}</div>
					<div style="font-size: 0.75rem; color: #9fb0c0; margin-top: 2px;">${description}</div>
				</div>
				<div class="historical-indication ${indication.status}" title="Percentile based on 1-year historical data: ${indication.text}">
					${indication.text}
					<span style="font-size: 0.7rem; opacity: 0.7; margin-left: 4px;">(vs. 1Y)</span>
				</div>
			</div>
			<div class="card-content">
				<div class="card-data">
					<div class="card-price">${data.currentPrice.toFixed(2)}</div>
					<div class="card-change ${changeClass}">
						${this.selectedTimeRange}: ${changeSign}${data.change.toFixed(2)} (${changeSign}${data.changePercent.toFixed(2)}%)
					</div>
					<div class="card-description">${description}</div>
				</div>
				<div class="chart-container">
					<div class="chart-title">${chartTitle}</div>
					<canvas id="chart-${name}"></canvas>
				</div>
			</div>
		`;

		// Make card clickable - use capture phase to ensure it works
		card.addEventListener('click', (e) => {
			e.stopPropagation();
			console.log('Card clicked:', name, symbol);
			window.dispatchEvent(new CustomEvent('navigate', {
				detail: {
					page: 'indicator-detail',
					symbol: symbol,
					name: name,
					description: description,
					source: source
				}
			}));
		}, true);

		setTimeout(() => {
			this.renderMiniChart(card.querySelector('canvas'), data.chartData, data.changePercent);
		}, 200);

		return card;
	}

	setupAISummaryButton() {
		// Use setTimeout to ensure DOM is ready
		setTimeout(() => {
			const aiSummaryBtn = this.shadowRoot.getElementById('market-ai-summary-btn');
			const overlay = this.shadowRoot.getElementById('ai-summary-modal-overlay');
			const closeBtn = this.shadowRoot.getElementById('ai-summary-modal-close');

			if (!aiSummaryBtn) {
				console.error('[AI Market Summary] Button not found');
				return;
			}

			if (!overlay) {
				console.error('[AI Market Summary] Modal overlay not found');
				return;
			}

			if (!closeBtn) {
				console.error('[AI Market Summary] Close button not found');
				return;
			}

			console.log('[AI Market Summary] Setting up button listeners');

			aiSummaryBtn.addEventListener('click', () => {
				console.log('[AI Market Summary] Button clicked');
				this.openAISummaryModal();
			});

			closeBtn.addEventListener('click', () => {
				overlay.classList.remove('show');
				if (aiSummaryBtn) {
					aiSummaryBtn.disabled = false;
				}
			});

			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) {
					overlay.classList.remove('show');
					if (aiSummaryBtn) {
						aiSummaryBtn.disabled = false;
					}
				}
			});
		}, 100);
	}

	async openAISummaryModal() {
		const overlay = this.shadowRoot.getElementById('ai-summary-modal-overlay');
		const content = this.shadowRoot.getElementById('ai-summary-modal-content');
		const aiSummaryBtn = this.shadowRoot.getElementById('market-ai-summary-btn');

		if (!overlay || !content) return;

		overlay.classList.add('show');
		content.innerHTML = '<div class="ai-summary-loading">Generating AI market summary...</div>';

		if (aiSummaryBtn) {
			aiSummaryBtn.disabled = true;
		}

		// Check cache first - include time range in cache key
		const { getCachedData, setCachedData } = await import('../utils/cache.js');
		const cacheKey = `market-summary-${this.selectedTimeRange}`;
		const cachedSummary = getCachedData('market', cacheKey);

		if (cachedSummary) {
			console.log(`[AI Market Summary] Using cached summary for time range: ${this.selectedTimeRange}`);
			this.displayMarketSummary(cachedSummary, true);
			if (aiSummaryBtn) {
				aiSummaryBtn.disabled = false;
			}
			return;
		}

		try {
			// Collect all market data (includes current time range)
			const marketData = this.collectMarketData();

			// Call backend API for AI market summary - API key is read from .env on server
			const response = await fetch('/api/ai-market-summary', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ marketData })
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.detail || `API error: ${response.status}`);
			}

			const data = await response.json();
			const summary = data.summary;

			// Cache the summary with time range in key
			setCachedData('market', cacheKey, summary);

			// Display the summary
			this.displayMarketSummary(summary, false);
		} catch (error) {
			console.error('[AI Market Summary] Error:', error);
			const errorMessage = error.message || 'Unknown error';
			// Always show user-friendly message
			const userFriendlyMessage = 'Too many users are currently using this feature. Please try again later.';
			content.innerHTML = `<div class="ai-summary-error">${userFriendlyMessage}</div>`;
			// Re-enable button immediately after error
			if (aiSummaryBtn) {
				aiSummaryBtn.disabled = false;
			}
		} finally {
			// Ensure button is always enabled after operation completes
			if (aiSummaryBtn) {
				aiSummaryBtn.disabled = false;
			}
		}
	}

	collectMarketData() {
		const marketData = {
			timeRange: this.selectedTimeRange,
			indices: [],
			topMovers: {
				gainers: [],
				losers: [],
				mostActive: []
			},
			currencies: [],
			macroIndicators: [],
			commodities: []
		};

		// Collect indices data from DOM
		const globalOverviewPanel = this.shadowRoot.getElementById('global-overview-panel');
		if (globalOverviewPanel) {
			const indexItems = globalOverviewPanel.querySelectorAll('.global-index-item');
			indexItems.forEach(item => {
				const symbol = item.dataset.symbol;
				const name = item.querySelector('.global-index-name')?.textContent || '';
				const priceText = item.querySelector('.global-index-price')?.textContent || '';
				const changeText = item.querySelector('.global-index-change')?.textContent || '';

				const price = parseFloat(priceText.replace(/[^0-9.-]/g, '')) || 0;
				const changePercent = parseFloat(changeText.replace(/[^0-9.-]/g, '')) || 0;

				marketData.indices.push({
					symbol,
					name,
					price,
					changePercent
				});
			});
		}

		// Collect top movers
		if (this.topPerformers) {
			marketData.topMovers.gainers = (this.topPerformers.gainers || []).slice(0, 5).map(p => ({
				symbol: p.symbol,
				name: p.name || p.symbol,
				price: p.price || 0,
				changePercent: p.changePercent || 0
			}));

			marketData.topMovers.losers = (this.topPerformers.losers || []).slice(0, 5).map(p => ({
				symbol: p.symbol,
				name: p.name || p.symbol,
				price: p.price || 0,
				changePercent: p.changePercent || 0
			}));

			marketData.topMovers.mostActive = (this.topPerformers.active || []).slice(0, 5).map(p => ({
				symbol: p.symbol,
				name: p.name || p.symbol,
				price: p.price || 0,
				changePercent: p.changePercent || 0
			}));
		}

		// Collect currencies
		const currenciesPanel = this.shadowRoot.getElementById('currencies-overview-panel');
		if (currenciesPanel) {
			const currencyItems = currenciesPanel.querySelectorAll('.global-index-item');
			currencyItems.forEach(item => {
				const symbol = item.dataset.symbol || '';
				const name = item.querySelector('.global-index-name')?.textContent || '';
				const priceText = item.querySelector('.global-index-price')?.textContent || '';
				const changeText = item.querySelector('.global-index-change')?.textContent || '';

				const price = parseFloat(priceText.replace(/[^0-9.-]/g, '')) || 0;
				const changePercent = parseFloat(changeText.replace(/[^0-9.-]/g, '')) || 0;

				marketData.currencies.push({
					symbol,
					name,
					price,
					changePercent
				});
			});
		}

		return marketData;
	}

	displayMarketSummary(summary, fromCache) {
		const content = this.shadowRoot.getElementById('ai-summary-modal-content');
		if (!content) return;

		// Format and display the summary
		let formattedSummary = summary;

		// Convert numbered emoji headings (1️⃣, 2️⃣, etc.) to h2 headings FIRST
		formattedSummary = formattedSummary.replace(/^(\d+️⃣)\s+(.*)$/gim, '<h2>$2</h2>');

		// Convert Markdown headings
		formattedSummary = formattedSummary.replace(/^### (.*)$/gim, '<h3>$1</h3>');
		formattedSummary = formattedSummary.replace(/^## (.*)$/gim, '<h2>$1</h2>');
		formattedSummary = formattedSummary.replace(/^# (.*)$/gim, '<h1>$1</h1>');

		// Convert bold text (**text**) to <strong>
		formattedSummary = formattedSummary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

		// Convert bullet points (- or *) to proper list items
		formattedSummary = formattedSummary.replace(/^(?![<])([-*])\s+(.*)$/gim, '<li>$2</li>');

		// Wrap consecutive list items in <ul> tags
		formattedSummary = formattedSummary.replace(/(<li>.*?<\/li>(\n|$))+/g, (match) => {
			return '<ul>' + match.replace(/\n/g, '') + '</ul>';
		});

		// Split into lines and process
		const lines = formattedSummary.split('\n');
		let html = '';
		let currentParagraph = '';

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			if (!line) {
				if (currentParagraph) {
					html += '<p>' + currentParagraph + '</p>';
					currentParagraph = '';
				}
				continue;
			}

			if (line.startsWith('<h') || line.startsWith('<ul>') || line.startsWith('</ul>') || line.startsWith('<li>')) {
				if (currentParagraph) {
					html += '<p>' + currentParagraph + '</p>';
					currentParagraph = '';
				}
				html += line + '\n';
			} else {
				if (currentParagraph) {
					currentParagraph += '<br>' + line;
				} else {
					currentParagraph = line;
				}
			}
		}

		if (currentParagraph) {
			html += '<p>' + currentParagraph + '</p>';
		}

		// Add cache information at the top
		const cacheInfo = fromCache
			? '<div class="ai-summary-cache-info">📦 This summary is cached and will be valid for 4 hours.</div>'
			: '<div class="ai-summary-cache-info">💾 This summary will be cached for 4 hours.</div>';

		content.innerHTML = cacheInfo + html;
	}

	setupOverviewInfoIcons() {
		// Setup info icons for all three overview panels
		const globalInfoIcon = this.shadowRoot.getElementById('global-overview-info-icon');
		const macroInfoIcon = this.shadowRoot.getElementById('macro-overview-info-icon');
		const currenciesInfoIcon = this.shadowRoot.getElementById('currencies-overview-info-icon');

		if (globalInfoIcon) {
			globalInfoIcon.addEventListener('click', () => {
				this.openOverviewInfoModal('global');
			});
		}

		if (macroInfoIcon) {
			macroInfoIcon.addEventListener('click', () => {
				this.openOverviewInfoModal('macro');
			});
		}

		if (currenciesInfoIcon) {
			currenciesInfoIcon.addEventListener('click', () => {
				this.openOverviewInfoModal('currencies');
			});
		}

		// Setup modal close handlers
		const overlay = this.shadowRoot.getElementById('overview-info-modal-overlay');
		const closeBtn = this.shadowRoot.getElementById('overview-info-modal-close');

		if (closeBtn) {
			closeBtn.addEventListener('click', () => {
				if (overlay) {
					overlay.classList.remove('show');
				}
			});
		}

		if (overlay) {
			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) {
					overlay.classList.remove('show');
				}
			});
		}
	}

	openOverviewInfoModal(panelType) {
		const overlay = this.shadowRoot.getElementById('overview-info-modal-overlay');
		const title = this.shadowRoot.getElementById('overview-info-modal-title-text');
		const content = this.shadowRoot.getElementById('overview-info-modal-content');

		if (!overlay || !title || !content) return;

		// Set title and content based on panel type
		let titleText = '';
		let infoContent = '';

		switch (panelType) {
			case 'global':
				titleText = 'Global Market Overview';
				infoContent = `
					<h3>What is the Global Market Overview?</h3>
					<p>The Global Market Overview displays the performance of major stock market indices from around the world, providing a snapshot of global market sentiment and trends.</p>
					
					<h3>Major Indices Explained</h3>
					<ul>
						<li><strong>S&P 500 (^GSPC)</strong>: A market-capitalization-weighted index of 500 large-cap U.S. companies. It's considered one of the best representations of the U.S. stock market and is widely used as a benchmark for investment performance.</li>
						<li><strong>DAX (^GDAXI)</strong>: Germany's blue-chip stock market index, consisting of the 40 major German companies trading on the Frankfurt Stock Exchange. It's a key indicator of European economic health.</li>
						<li><strong>Nikkei 225 (^N225)</strong>: Japan's premier stock market index, tracking 225 large, publicly-owned companies listed on the Tokyo Stock Exchange. It's the most widely quoted average of Japanese equities.</li>
						<li><strong>NASDAQ 100 (^NDX)</strong>: An index of the 100 largest non-financial companies listed on the NASDAQ stock exchange, heavily weighted toward technology and growth companies.</li>
						<li><strong>Hang Seng (^HSI)</strong>: Hong Kong's primary stock market index, tracking the largest and most liquid companies listed on the Hong Kong Stock Exchange. It's a key indicator of Asian market performance.</li>
					</ul>
					
					<h3>How to Use This Information</h3>
					<ul>
						<li><strong>Market Sentiment</strong>: Positive performance across multiple indices suggests global economic optimism, while widespread declines may indicate risk-off sentiment.</li>
						<li><strong>Regional Trends</strong>: Compare performance across regions (North America, Europe, Asia) to identify regional economic strengths or weaknesses.</li>
						<li><strong>Diversification</strong>: Use these indices to understand how different markets are performing, which can inform international diversification strategies.</li>
						<li><strong>Risk Assessment</strong>: The color-coded top bar (green/red/gray) provides a quick visual indicator of overall market direction.</li>
					</ul>
					
					<h3>Understanding the Display</h3>
					<ul>
						<li><strong>Price</strong>: Current index value in the selected currency</li>
						<li><strong>Change %</strong>: Percentage change for the selected time period (1D, 1W, 1M, 3M, YTD, 1Y)</li>
						<li><strong>Summary Statistics</strong>: Shows how many indices are up, down, and the average change</li>
					</ul>
					
					<p><strong>Tip:</strong> Click on any index card to view detailed historical data, charts, and additional metrics.</p>
				`;
				break;

			case 'macro':
				titleText = 'Macroeconomic Risk Overview';
				infoContent = `
					<h3>What is the Macroeconomic Risk Overview?</h3>
					<p>The Macroeconomic Risk Overview displays key economic indicators that help assess the overall health of the economy and potential risks to financial markets.</p>
					
					<h3>Indicators Explained</h3>
					<ul>
						<li><strong>VIX (CBOE Volatility Index)</strong>: Also known as the "fear gauge," the VIX measures market expectations of near-term volatility based on S&P 500 index options. A rising VIX indicates increased market fear and uncertainty, while a falling VIX suggests market confidence. Values above 20 typically indicate elevated fear, while values below 12 suggest complacency.</li>
						<li><strong>5y5y Inflation Expectations</strong>: This forward-looking measure estimates what inflation will be 5 years from now, over a 5-year period (i.e., 5-10 years in the future). It's derived from Treasury Inflation-Protected Securities (TIPS) and reflects market expectations of long-term inflation. Rising expectations may signal economic overheating, while falling expectations may indicate deflationary concerns.</li>
						<li><strong>WTI Crude Oil Price</strong>: West Texas Intermediate (WTI) is a grade of crude oil used as a benchmark in oil pricing. Oil prices are a key indicator of global economic activity and inflation. Rising oil prices can increase production costs and consumer prices, while falling prices may signal weak demand or oversupply.</li>
						<li><strong>Dollar Index (DXY)</strong>: The U.S. Dollar Index measures the value of the U.S. dollar against a basket of foreign currencies (EUR, JPY, GBP, CAD, SEK, CHF). A rising dollar index makes U.S. exports more expensive and can hurt multinational companies, while a falling dollar can boost exports and commodity prices.</li>
						<li><strong>Gold</strong>: Gold is often considered a safe-haven asset and a hedge against inflation and currency devaluation. Rising gold prices may indicate economic uncertainty, inflation concerns, or currency weakness. Gold typically moves inversely to the U.S. dollar and real interest rates.</li>
					</ul>
					
					<h3>How to Use This Information</h3>
					<ul>
						<li><strong>Risk Assessment</strong>: Monitor these indicators to gauge overall economic health and identify potential market risks or opportunities. High VIX and rising gold may signal risk-off sentiment.</li>
						<li><strong>Inflation Monitoring</strong>: The 5y5y inflation expectations help assess long-term inflation trends, which can inform bond and equity investment decisions.</li>
						<li><strong>Market Sentiment</strong>: VIX levels provide insight into market fear or complacency, which can help time entry and exit points.</li>
						<li><strong>Currency Impact</strong>: The Dollar Index affects international investments, commodity prices, and export-oriented companies.</li>
					</ul>
					
					<h3>Understanding the Display</h3>
					<ul>
						<li><strong>Current Value</strong>: The latest available value for each indicator</li>
						<li><strong>Change %</strong>: Percentage change for the selected time period (1D, 1W, 1M, 3M, YTD, 1Y)</li>
						<li><strong>Color Coding</strong>: For risk indicators, green typically means decreasing risk (good), while red means increasing risk (bad). For VIX and Gold, rising values (red) indicate higher risk/fear.</li>
					</ul>
					
					<p><strong>Tip:</strong> These indicators work together to provide a comprehensive view of economic conditions. High VIX with rising gold and falling dollar may indicate significant market stress, while low VIX with stable inflation expectations suggests market confidence.</p>
				`;
				break;

			case 'currencies':
				titleText = 'Currencies Overview';
				infoContent = `
					<h3>What is the Currencies Overview?</h3>
					<p>The Currencies Overview displays the performance of major currency pairs, providing insights into global economic relationships, trade flows, and relative economic strength between countries.</p>
					
					<h3>Major Currency Pairs Explained</h3>
					<ul>
						<li><strong>USD/EUR</strong>: The exchange rate between the U.S. Dollar and the Euro. A rising USD/EUR means the dollar is strengthening against the euro. This pair is the most traded currency pair globally and reflects the economic relationship between the U.S. and Eurozone.</li>
						<li><strong>USD/GBP</strong>: The exchange rate between the U.S. Dollar and the British Pound. Also known as "Cable," this pair reflects economic conditions in the U.S. and U.K., as well as Brexit-related impacts.</li>
						<li><strong>USD/JPY</strong>: The exchange rate between the U.S. Dollar and the Japanese Yen. A rising USD/JPY means the dollar is strengthening. This pair is heavily influenced by interest rate differentials and is often used as a risk sentiment indicator.</li>
					</ul>
					
					<h3>How to Use This Information</h3>
					<ul>
						<li><strong>Economic Strength</strong>: A strengthening currency often reflects a strong economy, higher interest rates, or positive economic outlook. Conversely, a weakening currency may indicate economic weakness or monetary easing.</li>
						<li><strong>Trade Impact</strong>: Currency movements affect international trade. A stronger dollar makes U.S. exports more expensive but imports cheaper, while a weaker dollar has the opposite effect.</li>
						<li><strong>Investment Decisions</strong>: Currency movements can significantly impact international investments. A strengthening home currency reduces returns from foreign investments, while a weakening home currency enhances them.</li>
						<li><strong>Risk Sentiment</strong>: Safe-haven currencies (like USD, JPY, CHF) tend to strengthen during market stress, while risk-on currencies (like AUD, NZD) strengthen during market optimism.</li>
					</ul>
					
					<h3>Understanding the Display</h3>
					<ul>
						<li><strong>Exchange Rate</strong>: Shows how many units of the quote currency (second currency) equal one unit of the base currency (first currency)</li>
						<li><strong>Change %</strong>: Percentage change in the exchange rate for the selected time period</li>
						<li><strong>Historical Context</strong>: The percentile indicator shows where the current rate stands relative to historical values</li>
					</ul>
					
					<h3>Key Factors Influencing Currency Movements</h3>
					<ul>
						<li><strong>Interest Rates</strong>: Higher interest rates typically attract foreign investment, strengthening the currency</li>
						<li><strong>Economic Data</strong>: GDP growth, employment, inflation, and trade balance all influence currency values</li>
						<li><strong>Central Bank Policy</strong>: Monetary policy decisions, quantitative easing, and forward guidance impact currency strength</li>
						<li><strong>Political Stability</strong>: Political events, elections, and policy changes can cause significant currency movements</li>
						<li><strong>Market Sentiment</strong>: Risk-on vs. risk-off sentiment drives flows into or out of currencies</li>
					</ul>
					
					<p><strong>Tip:</strong> Currency movements are complex and influenced by many factors. Use this overview as one tool among many in your investment analysis, and consider consulting with a financial advisor for currency-related investment decisions.</p>
				`;
				break;
		}

		title.textContent = titleText;
		content.innerHTML = infoContent;
		overlay.classList.add('show');
	}

	renderMiniChart(canvas, data, changePercent = null) {
		if (!canvas || !data || data.length === 0) return;

		// Store chart data and changePercent in canvas element for later re-rendering
		canvas.setAttribute('data-chart-data', JSON.stringify(data));
		if (changePercent !== null && changePercent !== undefined) {
			canvas.setAttribute('data-change-percent', changePercent.toString());
		}

		setTimeout(() => {
			const ctx = canvas.getContext('2d');
			const dpr = window.devicePixelRatio || 1;
			const rect = canvas.getBoundingClientRect();

			if (rect.width === 0 || rect.height === 0) {
				canvas.width = 300 * dpr;
				canvas.height = 80 * dpr;
				canvas.style.width = '300px';
				canvas.style.height = '80px';
			} else {
				canvas.width = rect.width * dpr;
				canvas.height = rect.height * dpr;
				canvas.style.width = rect.width + 'px';
				canvas.style.height = rect.height + 'px';
			}

			ctx.scale(dpr, dpr);

			const width = canvas.width / dpr;
			const height = canvas.height / dpr;
			const paddingLeft = 30;
			const paddingRight = 3;
			const paddingTop = 12;
			const paddingBottom = 20;
			const chartWidth = width - paddingLeft - paddingRight;
			const chartHeight = height - paddingTop - paddingBottom;

			const values = data.map(d => d.value);
			const dataMin = Math.min(...values);
			const dataMax = Math.max(...values);
			const dataRange = dataMax - dataMin || 1;

			// Add substantial padding to Y-axis scale to ensure full visibility
			// Use 20% of the range, but at least 5% of the max value
			const rangePadding = dataRange * 0.20;
			const minPadding = dataMax * 0.05;
			const scalePadding = Math.max(rangePadding, minPadding);

			const min = Math.max(0, dataMin - scalePadding); // Don't go below 0 for positive values
			const max = dataMax + scalePadding;
			const range = max - min || 1;

			ctx.clearRect(0, 0, width, height);

			// Check if light mode is active
			const isLightMode = this.classList.contains('light-mode');
			const gridColor = isLightMode ? '#8090a0' : '#1a2330';
			const labelColor = isLightMode ? '#0a0a0a' : '#9fb0c0';

			// Draw grid lines
			ctx.strokeStyle = gridColor;
			ctx.lineWidth = 1;
			for (let i = 0; i <= 4; i++) {
				const y = paddingTop + (chartHeight / 4) * i;
				ctx.beginPath();
				ctx.moveTo(paddingLeft, y);
				ctx.lineTo(width - paddingRight, y);
				ctx.stroke();
			}

			// Draw Y-axis labels (more readable)
			ctx.fillStyle = labelColor;
			ctx.font = '9px Inter, sans-serif';
			ctx.textAlign = 'right';
			ctx.textBaseline = 'middle';
			for (let i = 0; i <= 4; i++) {
				const value = max - (range / 4) * i;
				const y = paddingTop + (chartHeight / 4) * i;
				// Format numbers better - remove unnecessary decimals
				let label;
				if (value >= 1000) {
					label = value.toFixed(0);
				} else if (value >= 100) {
					label = value.toFixed(1);
				} else if (value >= 10) {
					label = value.toFixed(2);
				} else {
					label = value.toFixed(3);
				}
				ctx.fillText(label, paddingLeft - 4, y);
			}

			// Calculate stepX first (needed for both chart and labels)
			const stepX = chartWidth / (data.length - 1 || 1);
			const xAxisY = height - paddingBottom;

			// Draw chart line and area FIRST (so X-axis is on top)
			// Use changePercent if available (from selected time range), otherwise fall back to first vs last value
			let isPositive;
			if (changePercent !== null && changePercent !== undefined) {
				isPositive = changePercent >= 0;
			} else {
				const firstValue = values[0];
				const lastValue = values[values.length - 1];
				isPositive = lastValue >= firstValue;
			}
			ctx.strokeStyle = isPositive ? '#10b981' : '#ef4444';
			ctx.fillStyle = isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
			ctx.lineWidth = 1.5;

			// Helper function to calculate Y position, ensuring it stays within bounds
			const getY = (value) => {
				const normalized = (value - min) / range;
				const clamped = Math.max(0, Math.min(1, normalized)); // Clamp between 0 and 1
				return paddingTop + chartHeight - (clamped * chartHeight);
			};

			// Draw area
			ctx.beginPath();

			data.forEach((point, i) => {
				const x = paddingLeft + (i * stepX);
				const y = getY(point.value);

				if (i === 0) {
					ctx.moveTo(x, xAxisY);
					ctx.lineTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			});

			ctx.lineTo(width - paddingRight, xAxisY);
			ctx.closePath();
			ctx.fill();

			// Draw line
			ctx.beginPath();
			data.forEach((point, i) => {
				const x = paddingLeft + (i * stepX);
				const y = getY(point.value);

				if (i === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			});
			ctx.stroke();

			// Draw X-axis line LAST (so it's on top and visible)
			ctx.strokeStyle = '#4ea1f3';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(paddingLeft, xAxisY);
			ctx.lineTo(width - paddingRight, xAxisY);
			ctx.stroke();

			// Draw X-axis labels
			ctx.fillStyle = labelColor;
			ctx.font = '8px Inter, sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';

			// Show month labels for 3 months: start, middle, end
			const labelIndices = [0, Math.floor(data.length / 2), data.length - 1];
			const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
			labelIndices.forEach(idx => {
				if (idx < data.length) {
					const x = paddingLeft + (idx * stepX);
					const date = new Date(data[idx].time);
					const label = `${monthNames[date.getMonth()]} ${date.getDate()}`;
					ctx.fillText(label, x, xAxisY + 4);
				}
			});
		}, 50);
	}

	createErrorCard(name) {
		const card = document.createElement('div');
		card.className = 'index-card';
		card.innerHTML = `
			<div class="card-header">
				<div class="card-name">${name}</div>
				<div style="color: #9fb0c0;">Error loading data</div>
			</div>
		`;
		return card;
	}

	rerenderAllMiniCharts() {
		// Find all canvas elements with chart data
		const canvases = this.shadowRoot.querySelectorAll('canvas[data-chart-data]');
		canvases.forEach(canvas => {
			const chartDataStr = canvas.getAttribute('data-chart-data');
			if (chartDataStr) {
				try {
					const chartData = JSON.parse(chartDataStr);
					const changePercentStr = canvas.getAttribute('data-change-percent');
					const changePercent = changePercentStr !== null ? parseFloat(changePercentStr) : null;
					this.renderMiniChart(canvas, chartData, changePercent);
				} catch (e) {
					console.error('Error parsing chart data:', e);
				}
			}
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
			// On Market Overview, we don't need swipe navigation
			// But we could use it for refreshing data or other actions in the future
			// For now, we just prevent accidental swipes from interfering with scrolling
		}
	}

	handleRateLimitCooldown(active) {
		const searchInput = this.shadowRoot.getElementById('stock-search-input');
		const searchBtn = this.shadowRoot.getElementById('search-submit-btn');
		const dropdown = this.shadowRoot.getElementById('autocomplete-dropdown');

		if (searchInput) {
			searchInput.disabled = active;
			if (active) {
				searchInput.placeholder = 'Search disabled - Please wait for cooldown period';
				searchInput.style.opacity = '0.5';
				searchInput.style.cursor = 'not-allowed';
			} else {
				searchInput.placeholder = 'Enter stock ticker (e.g., AAPL, MSFT) or search by name';
				searchInput.style.opacity = '1';
				searchInput.style.cursor = 'text';
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

import { getLocal, setLocal } from '../utils/storage.js';

function keyFor(section, symbol) {
	return `swot:${symbol}:${section}`;
}

export class StockSwot extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.symbol = null;
		this.isGenerating = false; // Flag to prevent multiple simultaneous requests
	}

	static get observedAttributes() {
		return ['symbol'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'symbol' && newValue !== oldValue) {
			this.symbol = newValue;
			if (this.shadowRoot && this.shadowRoot.innerHTML && this.symbol) {
				this.load(this.symbol);
			}
		}
	}

	connectedCallback() {
		this.symbol = this.getAttribute('symbol');
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
				}
				:host(.light-mode) {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.panel-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 15px;
				}
				h3 {
					margin: 0;
					color: #e6edf3;
					font-size: 1.2rem;
				}
				:host(.light-mode) h3 {
					color: #0a0a0a;
				}
				.panel-info-icon {
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
				}
				.panel-info-icon:hover {
					background: rgba(78, 161, 243, 0.25);
					border-color: #4ea1f3;
					transform: scale(1.1);
				}
				:host(.light-mode) .panel-info-icon {
					background: rgba(29, 78, 216, 0.15);
					border-color: rgba(29, 78, 216, 0.3);
					color: #1d4ed8;
				}
				:host(.light-mode) .panel-info-icon:hover {
					background: rgba(29, 78, 216, 0.25);
					border-color: #1d4ed8;
				}
				/* Info Modal Styles */
				.panel-info-modal-overlay {
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
				.panel-info-modal-overlay.show {
					display: flex;
				}
				.panel-info-modal {
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
				:host(.light-mode) .panel-info-modal {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.panel-info-modal-header {
					padding: 20px;
					border-bottom: 1px solid #1f2a37;
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-shrink: 0;
				}
				:host(.light-mode) .panel-info-modal-header {
					border-bottom-color: #a0aab8;
				}
				.panel-info-modal-title {
					font-size: 1.3rem;
					font-weight: 700;
					color: #e6edf3;
					display: flex;
					align-items: center;
					gap: 10px;
				}
				:host(.light-mode) .panel-info-modal-title {
					color: #0a0a0a;
				}
				.panel-info-modal-close {
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
				.panel-info-modal-close:hover {
					background: rgba(239, 68, 68, 0.2);
					color: #ef4444;
				}
				.panel-info-modal-content {
					padding: 20px;
					overflow-y: auto;
					flex: 1;
					color: #e6edf3;
					line-height: 1.7;
					font-size: 0.95rem;
				}
				:host(.light-mode) .panel-info-modal-content {
					color: #0a0a0a;
				}
				.panel-info-modal-content h3 {
					font-size: 1.1rem;
					font-weight: 600;
					color: #4ea1f3;
					margin: 20px 0 10px 0;
				}
				:host(.light-mode) .panel-info-modal-content h3 {
					color: #1d4ed8;
				}
				.panel-info-modal-content h3:first-child {
					margin-top: 0;
				}
				.panel-info-modal-content p {
					margin: 10px 0;
					line-height: 1.7;
				}
				.panel-info-modal-content ul {
					margin: 10px 0;
					padding-left: 25px;
				}
				.panel-info-modal-content li {
					margin: 8px 0;
					line-height: 1.6;
				}
				.panel-info-modal-content strong {
					color: #4ea1f3;
					font-weight: 600;
				}
				:host(.light-mode) .panel-info-modal-content strong {
					color: #1d4ed8;
				}
				.panel-info-modal-content::-webkit-scrollbar {
					width: 8px;
				}
				.panel-info-modal-content::-webkit-scrollbar-track {
					background: #0b0f14;
					border-radius: 4px;
				}
				.panel-info-modal-content::-webkit-scrollbar-thumb {
					background: #1f2a37;
					border-radius: 4px;
				}
				.panel-info-modal-content::-webkit-scrollbar-thumb:hover {
					background: #2d3748;
				}
				:host(.light-mode) .panel-info-modal-content::-webkit-scrollbar-track {
					background: #c0c9d4;
				}
				:host(.light-mode) .panel-info-modal-content::-webkit-scrollbar-thumb {
					background: #a0aab8;
				}
				:host(.light-mode) .panel-info-modal-content::-webkit-scrollbar-thumb:hover {
					background: #8b95a3;
				}
				.grid {
					display: grid;
					grid-template-columns: repeat(4, minmax(0, 1fr));
					gap: 15px;
				}
				.box {
					display: flex;
					flex-direction: column;
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					min-height: 200px;
				}
				:host(.light-mode) .box {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.box h4 {
					margin: 12px 12px 0 12px;
					color: #e6edf3;
					font-size: 1rem;
				}
				:host(.light-mode) .box h4 {
					color: #0a0a0a;
				}
				textarea {
					flex: 1;
					margin: 12px;
					background: transparent;
					border: none;
					color: #e6edf3;
					resize: none;
					min-height: 150px;
					font-family: inherit;
					font-size: 0.95rem;
					cursor: default;
				}
				:host(.light-mode) textarea {
					color: #0a0a0a;
					line-height: 1.8;
					overflow-y: auto;
					white-space: pre-wrap;
					word-wrap: break-word;
				}
				textarea:focus {
					outline: none;
				}
				textarea[readonly] {
					cursor: default;
				}
				.box {
					display: flex;
					flex-direction: column;
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					min-height: 150px;
					height: auto;
					max-height: none;
				}
				textarea::placeholder {
					color: #6b7280;
				}
				.analyze-btn {
					background: linear-gradient(135deg, #4ea1f3 0%, #3b82f6 100%);
					color: #0b0f14;
					border: none;
					border-radius: 8px;
					padding: 10px 20px;
					font-weight: 600;
					cursor: pointer;
					margin-bottom: 15px;
					transition: all 0.3s ease;
					display: inline-flex;
					align-items: center;
					gap: 8px;
				}
				.analyze-btn:hover:not(:disabled) {
					transform: translateY(-2px);
					box-shadow: 0 4px 12px rgba(78, 161, 243, 0.3);
				}
				.analyze-btn:disabled {
					opacity: 0.6;
					cursor: not-allowed;
				}
				.bullet-point {
					margin: 6px 0;
					padding-left: 8px;
					line-height: 1.5;
				}
				.bullet-point.high-priority {
					color: #e6edf3;
					font-weight: 600;
				}
				:host(.light-mode) .bullet-point.high-priority {
					color: #0a0a0a;
				}
				.bullet-point.medium-priority {
					color: #cbd5e0;
					font-weight: 500;
				}
				:host(.light-mode) .bullet-point.medium-priority {
					color: #1a1a1a;
				}
				.bullet-point.low-priority {
					color: #9fb0c0;
					font-weight: 400;
				}
				:host(.light-mode) .bullet-point.low-priority {
					color: #2a2a2a;
				}
				.loading-indicator {
					display: inline-block;
					width: 14px;
					height: 14px;
					border: 2px solid rgba(11, 15, 20, 0.3);
					border-top-color: #0b0f14;
					border-radius: 50%;
					animation: spin 0.8s linear infinite;
				}
				@keyframes spin {
					to { transform: rotate(360deg); }
				}
				@media (max-width: 900px) {
					.grid {
						grid-template-columns: repeat(2, minmax(0, 1fr));
					}
				}
			</style>
			<div class="panel-header">
				<div style="display: flex; align-items: center; gap: 10px;">
					<h3 style="margin: 0;">SWOT Analysis</h3>
					<div class="panel-info-icon" id="swot-info-icon">i</div>
				</div>
				<button class="analyze-btn" id="analyze-btn">
					🤖 Generate SWOT Analysis
				</button>
			</div>
			<div class="grid">
				<div class="box">
					<h4>Strengths</h4>
					<textarea id="strengths" placeholder="Key strengths and competitive advantages…" readonly></textarea>
				</div>
				<div class="box">
					<h4>Weaknesses</h4>
					<textarea id="weaknesses" placeholder="Areas of concern and vulnerabilities…" readonly></textarea>
				</div>
				<div class="box">
					<h4>Opportunities</h4>
					<textarea id="opportunities" placeholder="Growth drivers and market opportunities…" readonly></textarea>
				</div>
				<div class="box">
					<h4>Threats</h4>
					<textarea id="threats" placeholder="Competition, regulation, market risks…" readonly></textarea>
				</div>
			</div>
			
			<!-- Info Modal -->
			<div class="panel-info-modal-overlay" id="swot-info-modal-overlay">
				<div class="panel-info-modal">
					<div class="panel-info-modal-header">
						<div class="panel-info-modal-title">
							<span>ℹ️</span>
							<span>SWOT Analysis</span>
						</div>
						<button class="panel-info-modal-close" id="swot-info-modal-close">×</button>
					</div>
					<div class="panel-info-modal-content" id="swot-info-modal-content">
						<!-- Content will be dynamically inserted -->
					</div>
				</div>
			</div>
		`;

		// Setup info icon
		this.setupInfoIcon();

		// Register analyze button listener ONCE in connectedCallback
		const analyzeBtn = this.shadowRoot.getElementById('analyze-btn');
		if (analyzeBtn) {
			// Remove any existing listeners first
			const newBtn = analyzeBtn.cloneNode(true);
			analyzeBtn.parentNode.replaceChild(newBtn, analyzeBtn);
			// Add listener to the new button
			newBtn.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.generateSwotAnalysis();
			});
		}

		if (this.symbol) {
			this.load(this.symbol);
		}

		// Apply saved theme
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.classList.add('light-mode');
		}
	}

	setupInfoIcon() {
		const infoIcon = this.shadowRoot.getElementById('swot-info-icon');
		const overlay = this.shadowRoot.getElementById('swot-info-modal-overlay');
		const closeBtn = this.shadowRoot.getElementById('swot-info-modal-close');
		const content = this.shadowRoot.getElementById('swot-info-modal-content');

		if (!infoIcon || !overlay || !closeBtn || !content) return;

		infoIcon.addEventListener('click', () => {
			this.openInfoModal();
		});

		closeBtn.addEventListener('click', () => {
			overlay.classList.remove('show');
		});

		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.classList.remove('show');
			}
		});
	}

	openInfoModal() {
		const overlay = this.shadowRoot.getElementById('swot-info-modal-overlay');
		const content = this.shadowRoot.getElementById('swot-info-modal-content');

		if (!overlay || !content) return;

		content.innerHTML = `
			<h3>What is SWOT Analysis?</h3>
			<p>SWOT Analysis is a strategic planning framework that evaluates a company's Strengths, Weaknesses, Opportunities, and Threats. It provides a comprehensive view of the company's internal capabilities and external environment.</p>
			
			<h3>The Four Components Explained</h3>
			<ul>
				<li><strong>Strengths</strong>: Internal positive attributes and resources that give the company a competitive advantage. Examples include strong brand recognition, proprietary technology, excellent management team, strong financial position, or market leadership.</li>
				<li><strong>Weaknesses</strong>: Internal factors that put the company at a disadvantage. Examples include high debt levels, limited product diversification, weak brand recognition, poor management, or outdated technology.</li>
				<li><strong>Opportunities</strong>: External factors that the company could exploit to its advantage. Examples include emerging markets, technological advances, favorable regulatory changes, competitor weaknesses, or growing customer demand.</li>
				<li><strong>Threats</strong>: External factors that could harm the company's performance. Examples include intense competition, economic downturns, changing consumer preferences, regulatory changes, or disruptive technologies.</li>
			</ul>
			
			<h3>How to Use SWOT Analysis</h3>
			<ul>
				<li><strong>Investment Decision Making</strong>: Use SWOT to assess whether a company's strengths and opportunities outweigh its weaknesses and threats.</li>
				<li><strong>Risk Assessment</strong>: Identify potential threats that could impact your investment and evaluate if the company has the strengths to mitigate them.</li>
				<li><strong>Competitive Positioning</strong>: Compare a company's SWOT to its competitors to understand its relative position in the market.</li>
				<li><strong>Strategic Planning</strong>: Understand how the company might leverage opportunities and address weaknesses to improve performance.</li>
			</ul>
			
			<h3>Understanding the Display</h3>
			<ul>
				<li><strong>AI-Generated Analysis</strong>: Click "Generate SWOT Analysis" to create an AI-powered SWOT analysis based on current company data and market conditions.</li>
				<li><strong>Four Quadrants</strong>: The analysis is organized into four sections (Strengths, Weaknesses, Opportunities, Threats) for easy comparison.</li>
				<li><strong>Prioritized Points</strong>: Key points are highlighted to help you focus on the most important factors.</li>
			</ul>
			
			<p><strong>Tip:</strong> SWOT Analysis is most valuable when updated regularly as market conditions and company circumstances change. Use it as one tool in your investment analysis toolkit, combined with fundamental analysis, technical analysis, and market research. Remember that this analysis is AI-generated and should be verified with additional research.</p>
		`;

		overlay.classList.add('show');
	}

	load(symbol) {
		this.symbol = symbol;
		['strengths', 'weaknesses', 'opportunities', 'threats'].forEach(id => {
			const area = this.shadowRoot.getElementById(id);
			if (area) {
				area.value = getLocal(keyFor(id, symbol), '');
				// Fields are readonly, no need for oninput handler
			}
		});
	}

	async generateSwotAnalysis() {
		// CRITICAL: Prevent multiple simultaneous requests using flag
		if (this.isGenerating) {
			console.warn('SWOT analysis already in progress, ignoring duplicate request');
			return;
		}

		const analyzeBtn = this.shadowRoot.getElementById('analyze-btn');
		if (!analyzeBtn) {
			console.error('Analyze button not found');
			return;
		}

		if (!this.symbol) {
			alert('No stock symbol available.');
			return;
		}

		// Set flag FIRST, before any async operations
		this.isGenerating = true;
		analyzeBtn.disabled = true;
		const originalText = analyzeBtn.innerHTML;
		analyzeBtn.innerHTML = '<span class="loading-indicator"></span> Analyzing...';

		console.log('=== STARTING SWOT ANALYSIS ===');
		console.log('Symbol:', this.symbol);
		console.log('Timestamp:', new Date().toISOString());

		try {
			// Call backend API for SWOT analysis - API key is read from .env on server
			console.log('Calling backend SWOT API...');
			const response = await fetch(`/api/swot/${this.symbol}`);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.detail || `API error: ${response.status}`);
			}

			const data = await response.json();
			const swotAnalysis = data.analysis;
			console.log('SWOT analysis received:', swotAnalysis);

			// Parse and fill SWOT fields
			this.fillSwotFields(swotAnalysis);
			console.log('=== SWOT ANALYSIS COMPLETE ===');

		} catch (error) {
			console.error('=== ERROR IN SWOT ANALYSIS ===');
			console.error('Error:', error);
			const errorMessage = error.message || 'Unknown error';

			// Show user-friendly message for all errors
			if (errorMessage.includes('overloaded') || errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429') || errorMessage.includes('503') || errorMessage.includes('400') || errorMessage.includes('Session limit exceeded')) {
				alert('Too many users are currently using this feature. Please try again later.');
			} else {
				alert('Too many users are currently using this feature. Please try again later.');
			}
		} finally {
			// Always reset flag and button state
			console.log('Resetting button state...');
			this.isGenerating = false;
			analyzeBtn.disabled = false;
			analyzeBtn.innerHTML = originalText;
		}
	}


	async fetchCompanyInfo(symbol) {
		try {
			// Fetch from Yahoo Finance
			const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`;
			let response;
			let data;

			try {
				response = await fetch(url);
				if (!response.ok) throw new Error('Direct fetch failed');
				data = await response.json();
			} catch (error) {
				const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
				response = await fetch(proxyUrl);
				if (!response.ok) throw new Error('Proxy fetch failed');
				const proxyData = await response.json();
				data = JSON.parse(proxyData.contents);
			}

			if (data.chart && data.chart.result && data.chart.result.length > 0) {
				const result = data.chart.result[0];
				const meta = result.meta || {};
				return {
					symbol: symbol,
					name: meta.longName || meta.shortName || symbol,
					sector: meta.sector || 'Unknown',
					industry: meta.industry || 'Unknown',
					marketCap: meta.marketCap || null,
					currentPrice: meta.regularMarketPrice || meta.previousClose || null
				};
			}
		} catch (error) {
			console.warn('Could not fetch company info:', error);
		}

		return { symbol: symbol, name: symbol };
	}

	async fetchWithRetries(url, options = {}, maxRetries = 3) {
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			let response;
			try {
				response = await fetch(url, options);
			} catch (err) {
				// Netzwerkfehler -> nur dann retry, wenn noch Versuche übrig
				if (attempt === maxRetries) {
					throw new Error(`Network error: ${err.message}`);
				}
				const delay = (2 ** attempt + Math.random()) * 1000; // Backoff + Jitter
				console.warn(`Network error, retrying in ${Math.round(delay)}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
				await new Promise(res => setTimeout(res, delay));
				continue;
			}

			// Bei 503/429: Backoff + Retry
			if (response.status === 503 || response.status === 429) {
				if (attempt === maxRetries) {
					let errorText;
					try {
						const errJson = await response.json();
						errorText = errJson.error?.message || JSON.stringify(errJson);
					} catch {
						errorText = `HTTP ${response.status} ${response.statusText}`;
					}
					throw new Error(`Service overloaded or rate-limited: ${errorText}`);
				}

				const delay = (2 ** attempt + Math.random()) * 1000;
				console.warn(`Gemini overloaded / rate-limited (status ${response.status}). Retry in ${Math.round(delay)}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
				await new Promise(res => setTimeout(res, delay));
				continue;
			}

			// Andere Fehler ohne Retry
			if (!response.ok) {
				let errorData;
				try {
					errorData = await response.json();
				} catch (e) {
					errorData = { error: { message: `HTTP ${response.status}: ${response.statusText}` } };
				}
				const errorMsg = errorData.error?.message || errorData.message || `API error: ${response.status}`;
				throw new Error(errorMsg);
			}

			// Erfolg
			return response;
		}
	}

	fillSwotFields(swotAnalysis) {
		const sections = ['strengths', 'weaknesses', 'opportunities', 'threats'];

		sections.forEach(section => {
			const area = this.shadowRoot.getElementById(section);
			if (!area || !swotAnalysis[section]) return;

			// Sort by priority (high first, then medium, then low)
			const sorted = [...swotAnalysis[section]].sort((a, b) => {
				const priorityOrder = { high: 0, medium: 1, low: 2 };
				return priorityOrder[a.priority] - priorityOrder[b.priority];
			});

			// Format as clean bullet points with better spacing
			const plainText = sorted.map((item) => {
				// Use simple bullet point, no emojis
				return `• ${item.point}`;
			}).join('\n\n'); // Double line break for better readability

			area.value = plainText;

			// Auto-resize textarea to fit content (no scrolling needed)
			setTimeout(() => {
				area.style.height = 'auto';
				const newHeight = Math.max(150, area.scrollHeight + 20);
				area.style.height = newHeight + 'px';

				// Also adjust the box height to match
				const box = area.closest('.box');
				if (box) {
					box.style.height = 'auto';
					box.style.minHeight = 'auto';
				}
			}, 50);
		});
	}
}

customElements.define('stock-swot', StockSwot);


export class StockMacro extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
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
				h3 {
					margin: 0 0 15px 0;
					color: #e6edf3;
					font-size: 1.2rem;
				}
				:host(.light-mode) h3 {
					color: #0a0a0a;
				}
				.grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
					gap: 12px;
				}
				.card {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 12px;
				}
				:host(.light-mode) .card {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.label {
					color: #9fb0c0;
					font-size: 0.85rem;
					margin-bottom: 6px;
				}
				:host(.light-mode) .label {
					color: #2a2a2a;
				}
				.value {
					color: #e6edf3;
					font-weight: 600;
					font-size: 1rem;
				}
				:host(.light-mode) .value {
					color: #0a0a0a;
				}
				.loading {
					color: #9fb0c0;
					text-align: center;
					padding: 20px;
				}
				:host(.light-mode) .loading {
					color: #2a2a2a;
				}
			</style>
			<h3>Macro Indicators</h3>
			<div class="grid" id="content">
				<div class="loading">Loading macro data...</div>
			</div>
		`;

		// Apply saved theme
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.classList.add('light-mode');
		}

		this.load();
	}

	async load() {
		try {
			// Fetch macro data from backend - API key is read from .env on server
			const [cpi, ur, gdp, fed] = await Promise.all([
				this.fetchFredSeries('CPIAUCSL'),
				this.fetchFredSeries('UNRATE'),
				this.fetchFredSeries('GDP'),
				this.fetchFredSeries('FEDFUNDS')
			]);

			const items = [];
			if (cpi) items.push({ label: 'CPI (YoY)', value: cpi.value.toFixed(2), date: cpi.date });
			if (ur) items.push({ label: 'Unemployment', value: ur.value.toFixed(2) + '%', date: ur.date });
			if (gdp) items.push({ label: 'GDP Growth', value: gdp.value.toFixed(2) + '%', date: gdp.date });
			if (fed) items.push({ label: 'Fed Funds Rate', value: fed.value.toFixed(2) + '%', date: fed.date });

			this.render(items);
		} catch (error) {
			console.error('Error loading macro data:', error);
			this.shadowRoot.getElementById('content').innerHTML =
				'<div class="loading">Unable to load macro data</div>';
		}
	}

	async fetchFredSeries(seriesId) {
		try {
			// Use proxy utility - API key is read from .env on the backend
			const { fetchFredWithProxy } = await import('../utils/proxy.js');
			const data = await fetchFredWithProxy(seriesId, {
				observation_start: '2020-01-01',
				limit: 1,
				sort_order: 'desc'
			});

			const obs = data.observations || [];
			const last = obs.find(o => o.value !== '.' && o.value !== '');
			return last ? { date: last.date, value: Number(last.value) } : null;
		} catch (error) {
			console.warn(`FRED API error for ${seriesId}:`, error);
			return null;
		}
	}

	render(items) {
		const content = this.shadowRoot.getElementById('content');

		if (items.length === 0) {
			content.innerHTML = '<div class="loading">No data available</div>';
			return;
		}

		content.innerHTML = items.map(item => `
			<div class="card">
				<div class="label">${item.label}</div>
				<div class="value">${item.value}</div>
				<div class="label" style="margin-top: 4px; font-size: 0.75rem;">${item.date}</div>
			</div>
		`).join('');
	}
}

customElements.define('stock-macro', StockMacro);


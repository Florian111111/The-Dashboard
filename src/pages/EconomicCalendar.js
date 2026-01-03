
export class EconomicCalendar extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.currentDate = new Date();
		this.events = [];
		this.viewMode = 'month'; // 'month' or 'week'
		this.activeFilter = 'all';
	}
	
	connectedCallback() {
		this.render();
		this.setupEventListeners();
		this.updateDateDisplay();
		this.loadEvents();
	}
	
	render() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					background: #0b0f14;
					min-height: 100vh;
					padding: 20px;
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
				
				.header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 30px;
				}
				h1 {
					color: #e6edf3;
					margin: 0;
					font-size: 2rem;
				}
				:host(.light-mode) h1 {
					color: var(--text-primary);
				}
				.back-button {
					background: #1f2a37;
					color: #e6edf3;
					border: 1px solid #2d3a4a;
					border-radius: 8px;
					padding: 10px 20px;
					cursor: pointer;
					font-size: 1rem;
					transition: background 0.2s;
				}
				:host(.light-mode) .back-button {
					background: var(--bg-tertiary);
					color: var(--text-primary);
					border-color: var(--border-color);
				}
				.back-button:hover {
					background: #2d3a4a;
				}
				:host(.light-mode) .back-button:hover {
					background: var(--bg-secondary);
				}
				
				.calendar-controls {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 20px;
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 15px 20px;
					flex-wrap: wrap;
					gap: 15px;
				}
				:host(.light-mode) .calendar-controls {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				.controls-left {
					display: flex;
					align-items: center;
					gap: 15px;
					flex-wrap: wrap;
				}
				.view-toggle {
					display: flex;
					background: #1f2a37;
					border: 1px solid #2d3748;
					border-radius: 8px;
					padding: 4px;
					gap: 4px;
				}
				:host(.light-mode) .view-toggle {
					background: var(--bg-tertiary);
					border-color: var(--border-color);
				}
				.view-toggle-btn {
					background: transparent;
					border: none;
					color: #9fb0c0;
					padding: 6px 16px;
					border-radius: 6px;
					cursor: pointer;
					font-size: 0.85rem;
					font-weight: 600;
					transition: all 0.2s;
				}
				:host(.light-mode) .view-toggle-btn {
					color: var(--text-secondary);
				}
				.view-toggle-btn.active {
					background: #4ea1f3;
					color: #0b0f14;
				}
				:host(.light-mode) .view-toggle-btn.active {
					background: var(--accent-blue);
					color: #ffffff;
				}
				.date-navigation {
					display: flex;
					align-items: center;
					gap: 15px;
				}
				.nav-button {
					background: #1f2a37;
					border: 1px solid #2d3748;
					color: #e6edf3;
					padding: 8px 16px;
					border-radius: 8px;
					cursor: pointer;
					font-size: 0.9rem;
					transition: all 0.2s;
				}
				:host(.light-mode) .nav-button {
					background: var(--bg-tertiary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
				.nav-button:hover {
					background: #2d3748;
					border-color: #4ea1f3;
				}
				:host(.light-mode) .nav-button:hover {
					background: var(--bg-secondary);
					border-color: var(--accent-blue);
				}
				.current-date {
					font-size: 1.1rem;
					font-weight: 600;
					color: #e6edf3;
					min-width: 200px;
					text-align: center;
				}
				:host(.light-mode) .current-date {
					color: var(--text-primary);
				}
				.filter-buttons {
					display: flex;
					gap: 8px;
					flex-wrap: wrap;
				}
				.filter-btn {
					background: #1f2a37;
					border: 1px solid #2d3748;
					color: #9fb0c0;
					padding: 6px 12px;
					border-radius: 6px;
					cursor: pointer;
					font-size: 0.85rem;
					transition: all 0.2s;
				}
				:host(.light-mode) .filter-btn {
					background: var(--bg-tertiary);
					border-color: var(--border-color);
					color: var(--text-secondary);
				}
				.filter-btn:hover {
					background: #2d3748;
					border-color: #4ea1f3;
					color: #e6edf3;
				}
				:host(.light-mode) .filter-btn:hover {
					background: var(--bg-secondary);
					border-color: var(--accent-blue);
					color: var(--text-primary);
				}
				.filter-btn.active {
					background: #4ea1f3;
					border-color: #4ea1f3;
					color: #0b0f14;
				}
				:host(.light-mode) .filter-btn.active {
					background: var(--accent-blue);
					color: #ffffff;
				}
				
				.calendar-container {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
					overflow-x: auto;
				}
				:host(.light-mode) .calendar-container {
					background: var(--bg-secondary);
					border-color: var(--border-color);
				}
				
				/* Month View */
				.calendar-month {
					display: grid;
					grid-template-columns: repeat(7, minmax(0, 1fr));
					gap: 0;
					background: #1f2a37;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					overflow: hidden;
					width: 100%;
				}
				:host(.light-mode) .calendar-month {
					background: var(--border-color);
					border-color: var(--border-color);
				}
				.calendar-header-day {
					background: #0b0f14;
					padding: 12px 8px;
					text-align: center;
					font-weight: 600;
					font-size: 0.85rem;
					color: #9fb0c0;
					text-transform: uppercase;
					border-right: 1px solid #1f2a37;
					border-bottom: 2px solid #1f2a37;
					box-sizing: border-box;
				}
				.calendar-header-day:nth-child(7n) {
					border-right: none;
				}
				:host(.light-mode) .calendar-header-day {
					background: var(--bg-card);
					color: var(--text-secondary);
					border-right-color: var(--border-color);
					border-bottom-color: var(--border-color);
				}
				.calendar-day {
					background: #0b0f14;
					min-height: 140px;
					height: 140px;
					padding: 8px;
					border-right: 1px solid #1f2a37;
					border-bottom: 1px solid #1f2a37;
					position: relative;
					cursor: pointer;
					transition: all 0.2s;
					display: flex;
					flex-direction: column;
					overflow: hidden;
				}
				.calendar-day:nth-child(7n) {
					border-right: none;
				}
				:host(.light-mode) .calendar-day {
					background: var(--bg-card);
					border-right-color: var(--border-color);
					border-bottom-color: var(--border-color);
				}
				.calendar-day:hover {
					background: #121821;
					border-color: #4ea1f3;
					z-index: 5;
				}
				:host(.light-mode) .calendar-day:hover {
					background: var(--bg-secondary);
					border-color: var(--accent-blue);
				}
				.calendar-day.other-month {
					opacity: 0.4;
					background: #0a0d11;
				}
				:host(.light-mode) .calendar-day.other-month {
					background: var(--bg-primary);
				}
				.calendar-day.today {
					background: rgba(78, 161, 243, 0.1);
					border-color: #4ea1f3;
				}
				:host(.light-mode) .calendar-day.today {
					background: rgba(29, 78, 216, 0.1);
					border-color: var(--accent-blue);
				}
				.day-number {
					font-size: 0.9rem;
					font-weight: 600;
					color: #e6edf3;
					margin-bottom: 6px;
					flex-shrink: 0;
				}
				:host(.light-mode) .day-number {
					color: var(--text-primary);
				}
				.day-events {
					display: flex;
					flex-direction: column;
					gap: 4px;
					flex: 1;
					overflow: hidden;
				}
				.day-event {
					font-size: 0.7rem;
					padding: 4px 6px;
					border-radius: 4px;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					cursor: pointer;
					transition: all 0.2s;
					flex-shrink: 0;
					line-height: 1.3;
				}
				.day-event:hover {
					transform: scale(1.02);
					z-index: 10;
					position: relative;
					white-space: normal;
					overflow: visible;
				}
				.day-event.fed {
					background: rgba(78, 161, 243, 0.3);
					color: #4ea1f3;
					border-left: 3px solid #4ea1f3;
				}
				.day-event.cpi {
					background: rgba(239, 68, 68, 0.3);
					color: #ef4444;
					border-left: 3px solid #ef4444;
				}
				.day-event.earnings {
					background: rgba(16, 185, 129, 0.3);
					color: #10b981;
					border-left: 3px solid #10b981;
				}
				.day-event.nfp {
					background: rgba(245, 158, 11, 0.3);
					color: #f59e0b;
					border-left: 3px solid #f59e0b;
				}
				.day-event.gdp {
					background: rgba(139, 92, 246, 0.3);
					color: #8b5cf6;
					border-left: 3px solid #8b5cf6;
				}
				.event-count {
					font-size: 0.7rem;
					color: #6b7280;
					margin-top: auto;
					padding-top: 4px;
					flex-shrink: 0;
				}
				:host(.light-mode) .event-count {
					color: var(--text-muted);
				}
				
				/* Week View */
				.calendar-week {
					display: grid;
					grid-template-columns: 80px repeat(7, 1fr);
					gap: 1px;
					background: #1f2a37;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					overflow: hidden;
				}
				:host(.light-mode) .calendar-week {
					background: var(--border-color);
					border-color: var(--border-color);
				}
				.week-time-header {
					background: #0b0f14;
					border-right: 2px solid #1f2a37;
				}
				:host(.light-mode) .week-time-header {
					background: var(--bg-card);
					border-right-color: var(--border-color);
				}
				.week-day-header {
					background: #0b0f14;
					padding: 12px;
					text-align: center;
					border-bottom: 2px solid #1f2a37;
				}
				:host(.light-mode) .week-day-header {
					background: var(--bg-card);
					border-bottom-color: var(--border-color);
				}
				.week-day-name {
					font-weight: 600;
					font-size: 0.85rem;
					color: #9fb0c0;
					text-transform: uppercase;
					margin-bottom: 4px;
				}
				:host(.light-mode) .week-day-name {
					color: var(--text-secondary);
				}
				.week-day-number {
					font-size: 1.2rem;
					font-weight: 700;
					color: #e6edf3;
				}
				:host(.light-mode) .week-day-number {
					color: var(--text-primary);
				}
				.week-day-number.today {
					color: #4ea1f3;
				}
				:host(.light-mode) .week-day-number.today {
					color: var(--accent-blue);
				}
				.week-time-slot {
					background: #0b0f14;
					border-right: 2px solid #1f2a37;
					padding: 8px;
					font-size: 0.75rem;
					color: #6b7280;
					text-align: right;
					border-bottom: 1px solid #1f2a37;
					min-height: 60px;
				}
				:host(.light-mode) .week-time-slot {
					background: var(--bg-card);
					border-right-color: var(--border-color);
					border-bottom-color: var(--border-color);
					color: var(--text-muted);
				}
				.week-day-column {
					display: flex;
					flex-direction: column;
				}
				.week-day-cell {
					background: #0b0f14;
					border-bottom: 1px solid #1f2a37;
					min-height: 60px;
					padding: 4px;
					position: relative;
				}
				:host(.light-mode) .week-day-cell {
					background: var(--bg-card);
					border-bottom-color: var(--border-color);
				}
				.week-event {
					position: absolute;
					left: 4px;
					right: 4px;
					padding: 4px 6px;
					border-radius: 4px;
					font-size: 0.75rem;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s;
					z-index: 1;
				}
				.week-event:hover {
					transform: scale(1.02);
					z-index: 10;
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
				}
				.week-event.fed {
					background: rgba(78, 161, 243, 0.4);
					color: #4ea1f3;
					border-left: 3px solid #4ea1f3;
				}
				.week-event.cpi {
					background: rgba(239, 68, 68, 0.4);
					color: #ef4444;
					border-left: 3px solid #ef4444;
				}
				.week-event.earnings {
					background: rgba(16, 185, 129, 0.4);
					color: #10b981;
					border-left: 3px solid #10b981;
				}
				.week-event.nfp {
					background: rgba(245, 158, 11, 0.4);
					color: #f59e0b;
					border-left: 3px solid #f59e0b;
				}
				.week-event.gdp {
					background: rgba(139, 92, 246, 0.4);
					color: #8b5cf6;
					border-left: 3px solid #8b5cf6;
				}
				
				.no-events {
					text-align: center;
					padding: 40px;
					color: #9fb0c0;
					font-size: 1rem;
				}
				:host(.light-mode) .no-events {
					color: var(--text-secondary);
				}
				.loading {
					text-align: center;
					padding: 40px;
					color: #9fb0c0;
					font-size: 1rem;
				}
				:host(.light-mode) .loading {
					color: var(--text-secondary);
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
			</style>
			<div class="header">
				<h1>Economic Calendar</h1>
				<button class="back-button" id="back-button">← Back to Home</button>
			</div>
			
			<div class="calendar-controls">
				<div class="controls-left">
					<div class="view-toggle">
						<button class="view-toggle-btn active" id="view-month" data-view="month">Month</button>
						<button class="view-toggle-btn" id="view-week" data-view="week">Week</button>
					</div>
					<div class="date-navigation">
						<button class="nav-button" id="prev-period">← Previous</button>
						<div class="current-date" id="current-date"></div>
						<button class="nav-button" id="next-period">Next →</button>
					</div>
				</div>
				<div class="filter-buttons">
					<button class="filter-btn active" data-filter="all">All Events</button>
					<button class="filter-btn" data-filter="fed">Fed Meetings</button>
					<button class="filter-btn" data-filter="cpi">CPI Release</button>
					<button class="filter-btn" data-filter="earnings">Earnings</button>
					<button class="filter-btn" data-filter="nfp">NFP</button>
					<button class="filter-btn" data-filter="gdp">GDP</button>
				</div>
			</div>
			
			<div class="calendar-container" id="calendar-container">
				<div class="loading">Loading calendar...</div>
			</div>
			
			<div class="disclaimer-footer">
				<div>
					The information provided on this website is for general informational and educational purposes only and does not constitute investment advice, financial advice, trading advice, or any other form of recommendation. All content is provided without regard to individual financial circumstances, investment objectives, or risk tolerance. Past performance is not indicative of future results. Financial markets are subject to risk, and investing may result in the loss of part or all of your capital. Any actions taken based on the information on this website are strictly at your own risk. Before making any investment decision, you should conduct your own research and, where appropriate, consult a licensed financial advisor. By using this website, you acknowledge and agree to this disclaimer. <a href="#" id="disclaimer-link-full">Full Disclaimer</a>
				</div>
			</div>
		`;
	}
	
	setupEventListeners() {
		const backButton = this.shadowRoot.getElementById('back-button');
		backButton?.addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', { 
				detail: { page: 'market-overview' } 
			}));
		});
		
		const prevPeriod = this.shadowRoot.getElementById('prev-period');
		prevPeriod?.addEventListener('click', () => {
			if (this.viewMode === 'month') {
				this.currentDate.setMonth(this.currentDate.getMonth() - 1);
			} else {
				this.currentDate.setDate(this.currentDate.getDate() - 7);
			}
			this.updateDateDisplay();
			this.loadEvents();
		});
		
		const nextPeriod = this.shadowRoot.getElementById('next-period');
		nextPeriod?.addEventListener('click', () => {
			if (this.viewMode === 'month') {
				this.currentDate.setMonth(this.currentDate.getMonth() + 1);
			} else {
				this.currentDate.setDate(this.currentDate.getDate() + 7);
			}
			this.updateDateDisplay();
			this.loadEvents();
		});
		
		const viewMonth = this.shadowRoot.getElementById('view-month');
		const viewWeek = this.shadowRoot.getElementById('view-week');
		viewMonth?.addEventListener('click', () => {
			this.viewMode = 'month';
			viewMonth.classList.add('active');
			viewWeek.classList.remove('active');
			this.updateDateDisplay();
			this.loadEvents();
		});
		viewWeek?.addEventListener('click', () => {
			this.viewMode = 'week';
			viewWeek.classList.add('active');
			viewMonth.classList.remove('active');
			this.updateDateDisplay();
			this.loadEvents();
		});
		
		const filterButtons = this.shadowRoot.querySelectorAll('.filter-btn');
		filterButtons.forEach(btn => {
			btn.addEventListener('click', () => {
				filterButtons.forEach(b => b.classList.remove('active'));
				btn.classList.add('active');
				this.activeFilter = btn.dataset.filter;
				this.renderCalendar();
			});
		});
		
		const disclaimerLink = this.shadowRoot.getElementById('disclaimer-link-full');
		disclaimerLink?.addEventListener('click', (e) => {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent('navigate', { 
				detail: { page: 'disclaimer' } 
			}));
		});
	}
	
	updateDateDisplay() {
		const dateElement = this.shadowRoot.getElementById('current-date');
		if (dateElement) {
			if (this.viewMode === 'month') {
				const options = { year: 'numeric', month: 'long' };
				dateElement.textContent = this.currentDate.toLocaleDateString('en-US', options);
			} else {
				const weekStart = this.getWeekStart();
				const weekEnd = new Date(weekStart);
				weekEnd.setDate(weekEnd.getDate() + 6);
				dateElement.textContent = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
			}
		}
	}
	
	getWeekStart() {
		const date = new Date(this.currentDate);
		const day = date.getDay();
		const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
		return new Date(date.setDate(diff));
	}
	
	loadEvents() {
		this.events = this.generateSampleEvents();
		this.renderCalendar();
	}
	
	generateSampleEvents() {
		const events = [];
		const year = this.currentDate.getFullYear();
		const month = this.currentDate.getMonth();
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		
		// Fed Meetings
		const fedDates = [2, 15, 22];
		fedDates.forEach(day => {
			if (day <= daysInMonth) {
				events.push({
					date: new Date(year, month, day),
					time: '14:00',
					title: 'Federal Reserve FOMC Meeting',
					description: 'Federal Open Market Committee meeting to discuss monetary policy',
					type: 'fed'
				});
			}
		});
		
		// CPI Release
		if (daysInMonth >= 12) {
			events.push({
				date: new Date(year, month, 12),
				time: '08:30',
				title: 'Consumer Price Index (CPI) Release',
				description: 'Monthly inflation data release by the Bureau of Labor Statistics',
				type: 'cpi'
			});
		}
		
		// Non-Farm Payrolls
		const firstDay = new Date(year, month, 1);
		const firstFriday = 5 - firstDay.getDay() + 1;
		if (firstFriday > 0 && firstFriday <= daysInMonth) {
			events.push({
				date: new Date(year, month, firstFriday),
				time: '08:30',
				title: 'Non-Farm Payrolls (NFP) Report',
				description: 'Monthly employment report showing job creation and unemployment rate',
				type: 'nfp'
			});
		}
		
		// GDP Release
		if (month % 3 === 2 && daysInMonth >= 28) {
			events.push({
				date: new Date(year, month, 28),
				time: '08:30',
				title: 'Gross Domestic Product (GDP) Release',
				description: 'Quarterly economic growth data release',
				type: 'gdp'
			});
		}
		
		// Major Earnings Reports
		const earningsCompanies = [
			{ symbol: 'AAPL', name: 'Apple Inc.', day: 5 },
			{ symbol: 'MSFT', name: 'Microsoft Corporation', day: 10 },
			{ symbol: 'GOOGL', name: 'Alphabet Inc.', day: 15 },
			{ symbol: 'AMZN', name: 'Amazon.com Inc.', day: 20 },
			{ symbol: 'TSLA', name: 'Tesla Inc.', day: 25 }
		];
		
		earningsCompanies.forEach(company => {
			if (company.day <= daysInMonth) {
				events.push({
					date: new Date(year, month, company.day),
					time: '16:00',
					title: `${company.name} (${company.symbol}) Earnings Report`,
					description: `Quarterly earnings release for ${company.name}`,
					type: 'earnings'
				});
			}
		});
		
		return events.sort((a, b) => {
			if (a.date.getTime() !== b.date.getTime()) {
				return a.date.getTime() - b.date.getTime();
			}
			return a.time.localeCompare(b.time);
		});
	}
	
	renderCalendar() {
		const container = this.shadowRoot.getElementById('calendar-container');
		if (!container) return;
		
		const filteredEvents = this.activeFilter === 'all' 
			? this.events 
			: this.events.filter(event => event.type === this.activeFilter);
		
		if (this.viewMode === 'month') {
			container.innerHTML = this.renderMonthView(filteredEvents);
		} else {
			container.innerHTML = this.renderWeekView(filteredEvents);
		}
	}
	
	renderMonthView(filteredEvents) {
		const year = this.currentDate.getFullYear();
		const month = this.currentDate.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startDate = new Date(firstDay);
		const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
		startDate.setDate(startDate.getDate() - dayOfWeek); // Start from Sunday
		const endDate = new Date(lastDay);
		const lastDayOfWeek = lastDay.getDay();
		endDate.setDate(endDate.getDate() + (6 - lastDayOfWeek)); // End on Saturday
		
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		
		const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		let html = '<div class="calendar-month">';
		
		// Header - first row of the grid
		weekDays.forEach(day => {
			html += `<div class="calendar-header-day">${day}</div>`;
		});
		
		// Calendar days - subsequent rows
		const currentDate = new Date(startDate);
		let dayIndex = 0;
		while (currentDate <= endDate) {
			const dateStr = currentDate.toDateString();
			const dayEvents = filteredEvents.filter(e => {
				const eventDate = new Date(e.date);
				eventDate.setHours(0, 0, 0, 0);
				return eventDate.getTime() === currentDate.getTime();
			});
			
			const isOtherMonth = currentDate.getMonth() !== month;
			const isToday = currentDate.getTime() === today.getTime();
			
			html += `<div class="calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">`;
			html += `<div class="day-number">${currentDate.getDate()}</div>`;
			html += '<div class="day-events">';
			
			dayEvents.slice(0, 3).forEach(event => {
				html += `<div class="day-event ${event.type}" title="${event.title} - ${event.time}">${event.title}</div>`;
			});
			
			if (dayEvents.length > 3) {
				html += `<div class="event-count">+${dayEvents.length - 3} more</div>`;
			}
			
			html += '</div></div>';
			
			currentDate.setDate(currentDate.getDate() + 1);
		}
		
		html += '</div>';
		return html;
	}
	
	renderWeekView(filteredEvents) {
		const weekStart = this.getWeekStart();
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		
		const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
		const timeSlots = [];
		for (let hour = 0; hour < 24; hour++) {
			timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
		}
		
		let html = '<div class="calendar-week">';
		
		// Time column header
		html += '<div class="week-time-header"></div>';
		
		// Day headers
		for (let i = 0; i < 7; i++) {
			const date = new Date(weekStart);
			date.setDate(date.getDate() + i);
			const isToday = date.getTime() === today.getTime();
			html += `<div class="week-day-header">
				<div class="week-day-name">${weekDays[i]}</div>
				<div class="week-day-number ${isToday ? 'today' : ''}">${date.getDate()}</div>
			</div>`;
		}
		
		// Time slots and events
		timeSlots.forEach(time => {
			html += `<div class="week-time-slot">${time}</div>`;
			
			for (let i = 0; i < 7; i++) {
				const date = new Date(weekStart);
				date.setDate(date.getDate() + i);
				const dayEvents = filteredEvents.filter(e => {
					const eventDate = new Date(e.date);
					eventDate.setDate(eventDate.getDate());
					const eventTime = e.time.substring(0, 2);
					return eventDate.getTime() === date.getTime() && eventTime === time.substring(0, 2);
				});
				
				html += '<div class="week-day-cell">';
				dayEvents.forEach(event => {
					html += `<div class="week-event ${event.type}" title="${event.title} - ${event.time}">
						${event.title}
					</div>`;
				});
				html += '</div>';
			}
		});
		
		html += '</div>';
		return html;
	}
}

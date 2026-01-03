import { fetchWithProxy } from '../utils/proxy.js';

import { API_BASE_URL } from '../config.js';

export class PortfolioTracking extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.portfolio = this.loadPortfolio();
		this.timeframe = '1y';
	}

	connectedCallback() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					width: 100%;
					max-width: 1400px;
					margin: 0 auto;
					padding: 20px;
					background: #0b0f14;
					min-height: 100vh;
					box-sizing: border-box;
				}
				:host(.light-mode) {
					background: #c8d0da;
				}
				.header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 30px;
					padding-bottom: 20px;
					border-bottom: 1px solid #1f2a37;
				position: relative;
				}
				:host(.light-mode) .header {
					border-bottom-color: #a0aab8;
				}
				.page-title {
					font-size: 2rem;
					font-weight: 700;
					color: #e6edf3;
					margin: 0;
				}
				:host(.light-mode) .page-title {
					color: #0a0a0a;
				}
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
				.back-btn {
					background: #233044;
					border: 1px solid #1f2a37;
					color: #e6edf3;
					padding: 8px 16px;
					border-radius: 8px;
					cursor: pointer;
					font-size: 0.9rem;
					margin-bottom: 20px;
				}
				:host(.light-mode) .back-btn {
					background: var(--bg-tertiary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
				.back-btn:hover {
					background: #1f2a37;
				}
				.portfolio-section {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
					margin-bottom: 20px;
				}
				:host(.light-mode) .portfolio-section {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.section-title {
					font-size: 1.3rem;
					font-weight: 600;
					color: #e6edf3;
				margin: 0;
			}
			.chart-section-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
					margin-bottom: 20px;
				}
				:host(.light-mode) .section-title {
					color: #0a0a0a;
				}
				.input-group {
					display: flex;
					gap: 10px;
					margin-bottom: 15px;
					align-items: flex-end;
				}
				.input-field {
					flex: 1;
					background: #0b0f14;
					border: 1px solid #1f2a37;
					color: #e6edf3;
					padding: 12px;
					border-radius: 8px;
					font-size: 1rem;
				}
				:host(.light-mode) .input-field {
					background: var(--bg-primary);
					border-color: var(--border-color);
					color: var(--text-primary);
				}
				.input-field:focus {
					outline: none;
					border-color: #4ea1f3;
				}
			
			/* Autocomplete Dropdown */
			.autocomplete-dropdown {
				position: absolute;
				top: 100%;
				left: 0;
				right: 0;
				background: #121821;
				border: 1px solid #1f2a37;
				border-radius: 0 0 8px 8px;
				max-height: 300px;
				overflow-y: auto;
				z-index: 1000;
				display: none;
				box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
				margin-top: 2px;
			}
			:host(.light-mode) .autocomplete-dropdown {
				background: var(--bg-secondary);
				border-color: var(--border-color);
			}
			.autocomplete-dropdown.show {
				display: block;
			}
			.autocomplete-item {
				padding: 10px 14px;
				cursor: pointer;
				display: flex;
				align-items: center;
				gap: 12px;
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
				min-width: 60px;
				font-size: 0.9rem;
				flex-shrink: 0;
			}
			:host(.light-mode) .autocomplete-symbol {
				color: var(--accent-blue);
			}
			.autocomplete-name {
				color: #e6edf3;
				flex: 1;
				font-size: 0.85rem;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			:host(.light-mode) .autocomplete-name {
				color: var(--text-primary);
			}
			.autocomplete-type {
				color: #6b7a8a;
				font-size: 0.65rem;
				padding: 2px 6px;
				background: #0b0f14;
				border-radius: 4px;
				flex-shrink: 0;
				white-space: nowrap;
			}
			:host(.light-mode) .autocomplete-type {
				color: var(--text-muted);
				background: var(--bg-primary);
			}
			.autocomplete-loading,
			.autocomplete-empty {
				padding: 12px;
				color: #9fb0c0;
				text-align: center;
				font-size: 0.85rem;
			}
			:host(.light-mode) .autocomplete-loading,
			:host(.light-mode) .autocomplete-empty {
				color: var(--text-secondary);
			}
			
				.input-label {
					display: block;
					color: #9fb0c0;
					font-size: 0.85rem;
					margin-bottom: 6px;
					font-weight: 500;
				}
				:host(.light-mode) .input-label {
					color: #2a2a2a;
				}
				.input-wrapper {
					flex: 1;
				}
				.percent-input {
					width: 120px;
				}
				.add-btn {
					background: linear-gradient(135deg, #4ea1f3 0%, #3b82f6 100%);
					color: #0b0f14;
					border: none;
					padding: 12px 24px;
					border-radius: 8px;
					font-weight: 600;
					cursor: pointer;
					white-space: nowrap;
				}
				.add-btn:hover {
					background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
				}
				.portfolio-content-wrapper {
					display: grid;
					grid-template-columns: 1fr 300px;
					gap: 20px;
					margin-top: 20px;
					align-items: start;
				}
				.portfolio-list-container {
					min-width: 0;
				}
				.portfolio-list {
				display: block;
				width: 100%;
			}
			.portfolio-table {
				width: 100%;
				border-collapse: collapse;
				background: #0b0f14;
				border-radius: 12px;
				overflow: hidden;
			}
			:host(.light-mode) .portfolio-table {
				background: #c0c9d4;
			}
			.portfolio-table-header {
				background: #1f2a37;
				border-bottom: 2px solid #2d3748;
			}
			:host(.light-mode) .portfolio-table-header {
				background: var(--bg-tertiary);
				border-bottom-color: var(--border-color);
			}
			.portfolio-table-header th {
				padding: 12px 16px;
				text-align: left;
				font-size: 0.85rem;
				font-weight: 600;
				color: #9fb0c0;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}
			:host(.light-mode) .portfolio-table-header th {
				color: var(--text-secondary);
			}
			.portfolio-table-row {
				border-bottom: 1px solid #1f2a37;
				transition: background 0.2s ease;
			}
			.portfolio-table-row:hover {
				background: rgba(78, 161, 243, 0.1);
			}
			:host(.light-mode) .portfolio-table-row {
				border-bottom-color: var(--border-color);
			}
			:host(.light-mode) .portfolio-table-row:hover {
				background: rgba(29, 78, 216, 0.1);
			}
			.portfolio-table-row:last-child {
				border-bottom: none;
			}
			.portfolio-table-row td {
				padding: 14px 16px;
				font-size: 0.9rem;
				color: #e6edf3;
			}
			:host(.light-mode) .portfolio-table-row td {
				color: var(--text-primary);
			}
			.portfolio-table-row .symbol-cell {
				font-weight: 700;
				color: #4ea1f3;
			}
			:host(.light-mode) .portfolio-table-row .symbol-cell {
				color: var(--accent-blue);
			}
			.portfolio-table-row .value-cell {
				font-weight: 600;
			}
			.portfolio-table-row .positive {
				color: #10b981;
			}
			.portfolio-table-row .negative {
				color: #ef4444;
			}
			:host(.light-mode) .portfolio-table-row .positive {
				color: #059669;
			}
			:host(.light-mode) .portfolio-table-row .negative {
				color: #dc2626;
			}
			.delete-cell, .action-cell {
				width: 50px;
				padding: 8px !important;
				text-align: center;
			}
			.action-cell {
				display: flex;
				gap: 4px;
				justify-content: center;
			}
			.delete-btn, .sell-btn {
				background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
				color: white;
				border: none;
				padding: 6px 10px;
				border-radius: 6px;
				cursor: pointer;
				font-weight: 700;
				font-size: 14px;
				width: 32px;
				height: 32px;
				display: flex;
				align-items: center;
				justify-content: center;
				line-height: 1;
				transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
				opacity: 0.85;
				box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
			}
			.sell-btn {
				background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
				box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
			}
			.delete-btn:hover {
				background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
				opacity: 1;
				transform: scale(1.05);
				box-shadow: 0 4px 10px rgba(239, 68, 68, 0.5);
			}
			.sell-btn:hover {
				background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
				opacity: 1;
				transform: scale(1.05);
				box-shadow: 0 4px 10px rgba(245, 158, 11, 0.5);
			}
			.delete-btn:active, .sell-btn:active {
				transform: scale(0.95);
			}
			
			.sell-modal {
				display: none;
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background: rgba(0, 0, 0, 0.7);
				z-index: 10000;
				align-items: center;
				justify-content: center;
			}
			.sell-modal.show {
				display: flex;
			}
			.sell-modal-content {
				background: #0b0f14;
				border: 1px solid #1f2a37;
				border-radius: 12px;
				padding: 24px;
				max-width: 500px;
				width: 90%;
				box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
			}
			:host(.light-mode) .sell-modal-content {
				background: var(--bg-primary);
				border-color: var(--border-color);
			}
			.sell-modal-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 20px;
			}
			.sell-modal-title {
				font-size: 1.2rem;
				font-weight: 700;
				color: #e6edf3;
			}
			:host(.light-mode) .sell-modal-title {
				color: var(--text-primary);
			}
			.sell-modal-close {
				background: transparent;
				border: none;
				color: #9fb0c0;
				font-size: 24px;
				cursor: pointer;
				padding: 0;
				width: 30px;
				height: 30px;
				display: flex;
				align-items: center;
				justify-content: center;
				border-radius: 6px;
				transition: all 0.2s;
			}
			.sell-modal-close:hover {
				background: rgba(239, 68, 68, 0.2);
				color: #ef4444;
			}
			.sell-options {
				display: flex;
				flex-direction: column;
				gap: 12px;
			}
			.sell-option-btn {
				padding: 14px 20px;
				background: #1f2a37;
				border: 1px solid #2d3748;
				border-radius: 8px;
				color: #e6edf3;
				font-size: 0.95rem;
				cursor: pointer;
				transition: all 0.2s;
				text-align: left;
			}
			:host(.light-mode) .sell-option-btn {
				background: var(--bg-tertiary);
				border-color: var(--border-color);
				color: var(--text-primary);
			}
			.sell-option-btn:hover {
				background: #2d3748;
				border-color: #4ea1f3;
			}
			:host(.light-mode) .sell-option-btn:hover {
				background: var(--bg-secondary);
				border-color: var(--accent-blue);
			}
			.sell-option-title {
				font-weight: 600;
				margin-bottom: 4px;
			}
			.sell-option-desc {
				font-size: 0.85rem;
				color: #9fb0c0;
				opacity: 0.8;
			}
			:host(.light-mode) .sell-option-desc {
				color: var(--text-secondary);
			}
			.sell-manual-form {
				display: none;
				margin-top: 20px;
				padding-top: 20px;
				border-top: 1px solid #1f2a37;
			}
			:host(.light-mode) .sell-manual-form {
				border-top-color: var(--border-color);
			}
			.sell-manual-form.show {
				display: block;
			}
			.sell-form-actions {
				display: flex;
					gap: 10px;
				margin-top: 20px;
				justify-content: flex-end;
			}
			.sell-form-btn {
				padding: 10px 20px;
				border: none;
				border-radius: 8px;
				font-size: 0.9rem;
				font-weight: 600;
				cursor: pointer;
				transition: all 0.2s;
			}
			.sell-form-btn-primary {
				background: linear-gradient(135deg, #4ea1f3 0%, #3b82f6 100%);
				color: white;
			}
			.sell-form-btn-primary:hover {
				background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
				transform: translateY(-1px);
				box-shadow: 0 4px 12px rgba(78, 161, 243, 0.4);
			}
			.sell-form-btn-secondary {
				background: #2d3748;
				color: #e6edf3;
				border: 1px solid #3a4553;
			}
			:host(.light-mode) .sell-form-btn-secondary {
				background: var(--bg-tertiary);
				border-color: var(--border-color);
				color: var(--text-primary);
			}
			.sell-form-btn-secondary:hover {
				background: #3a4553;
			}
			:host(.light-mode) .sell-form-btn-secondary:hover {
				background: var(--bg-secondary);
				}
				.pie-chart-container {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 15px;
					display: flex;
					align-items: center;
					justify-content: center;
					min-height: 300px;
					position: sticky;
					top: 20px;
				}
				:host(.light-mode) .pie-chart-container {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.pie-chart-container canvas {
					max-width: 100%;
					max-height: 100%;
				}
				.empty-chart-message {
					color: #9fb0c0;
					text-align: center;
					font-size: 0.9rem;
					padding: 20px;
				}
				:host(.light-mode) .empty-chart-message {
					color: #2a2a2a;
				}
				.item-percent {
					font-size: 0.85rem;
					color: #e6edf3;
					font-weight: 700;
					background: linear-gradient(135deg, rgba(78, 161, 243, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%);
					padding: 5px 12px;
					border-radius: 16px;
					display: inline-block;
					border: 1px solid rgba(78, 161, 243, 0.3);
					backdrop-filter: blur(10px);
					box-shadow: 0 2px 6px rgba(78, 161, 243, 0.2);
				}
				:host(.light-mode) .item-percent {
					color: #0a0a0a;
					background: linear-gradient(135deg, rgba(29, 78, 216, 0.2) 0%, rgba(30, 64, 175, 0.15) 100%);
					border-color: rgba(29, 78, 216, 0.4);
					box-shadow: 0 2px 6px rgba(29, 78, 216, 0.15);
				}
			.item-details {
					display: flex;
				flex-direction: column;
				gap: 4px;
				margin-top: 8px;
				font-size: 0.75rem;
			}
			.item-detail-row {
				display: flex;
				justify-content: space-between;
					align-items: center;
				padding: 2px 0;
			}
			.item-detail-label {
				color: #9fb0c0;
				font-weight: 500;
			}
			:host(.light-mode) .item-detail-label {
				color: var(--text-secondary);
			}
			.item-detail-value {
				color: #e6edf3;
				font-weight: 600;
			}
			:host(.light-mode) .item-detail-value {
				color: var(--text-primary);
			}
			.item-detail-value.positive {
				color: #10b981;
			}
			.item-detail-value.negative {
				color: #ef4444;
			}
			:host(.light-mode) .item-detail-value.positive {
				color: #059669;
			}
			:host(.light-mode) .item-detail-value.negative {
				color: #dc2626;
			}
			.total-value-display {
				margin-top: 20px;
				padding: 16px 20px;
				border-top: 2px solid #1f2a37;
				background: #0b0f14;
				border-radius: 0 0 12px 12px;
				display: flex;
				justify-content: space-between;
				align-items: center;
				flex-wrap: wrap;
				gap: 20px;
				font-size: 0.95rem;
			}
			:host(.light-mode) .total-value-display {
					border-top-color: #a0aab8;
				background: var(--bg-primary);
			}
			.total-value-item {
				display: flex;
				flex-direction: column;
				gap: 4px;
			}
			.total-value-label {
				font-size: 0.75rem;
				color: #9fb0c0;
				text-transform: uppercase;
				letter-spacing: 0.5px;
				font-weight: 600;
			}
			:host(.light-mode) .total-value-label {
				color: var(--text-secondary);
			}
			.total-value-amount {
					font-weight: 700;
					font-size: 1.1rem;
				color: #e6edf3;
				}
			:host(.light-mode) .total-value-amount {
				color: var(--text-primary);
				}
			.total-value-amount.positive {
					color: #10b981;
				}
			.total-value-amount.negative {
				color: #ef4444;
			}
			:host(.light-mode) .total-value-amount.positive {
				color: #059669;
			}
			:host(.light-mode) .total-value-amount.negative {
				color: #dc2626;
				}
				.chart-section {
					background: #121821;
					border: 1px solid #1f2a37;
					border-radius: 12px;
					padding: 20px;
					margin-bottom: 20px;
				}
				:host(.light-mode) .chart-section {
					background: #d5dce5;
					border-color: #a0aab8;
				}
				.chart-controls {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 20px;
					gap: 20px;
					flex-wrap: wrap;
				}
				.timeframe-selector {
					display: flex;
					gap: 8px;
					flex-wrap: wrap;
				}
				.chart-option {
					display: flex;
					align-items: center;
				}
				.checkbox-label {
					display: flex;
					align-items: center;
					gap: 8px;
					cursor: pointer;
					color: #9fb0c0;
					font-size: 0.9rem;
					user-select: none;
				}
				:host(.light-mode) .checkbox-label {
					color: #2a2a2a;
				}
				.checkbox-label input[type="checkbox"] {
					width: 18px;
					height: 18px;
					cursor: pointer;
					accent-color: #4ea1f3;
				}
				:host(.light-mode) .checkbox-label input[type="checkbox"] {
					accent-color: var(--accent-blue);
				}
			
			.toggle-switch {
				display: flex;
				align-items: center;
				gap: 10px;
			}
			
			.toggle-label {
				font-size: 0.9rem;
				color: #9fb0c0;
				user-select: none;
			}
			
			:host(.light-mode) .toggle-label {
				color: #2a2a2a;
			}
			
			.toggle-switch-track {
				width: 44px;
				height: 24px;
				background: #2a3441;
				border: 1px solid #3a4553;
				border-radius: 12px;
				position: relative;
				cursor: pointer;
				transition: all 0.2s ease;
			}
			
			:host(.light-mode) .toggle-switch-track {
				background: var(--bg-secondary);
				border-color: var(--border-color);
			}
			
			.toggle-switch-track:hover {
				border-color: #4ea1f3;
			}
			
			.toggle-switch-track.active {
				background: #4ea1f3;
				border-color: #4ea1f3;
			}
			
			.toggle-switch-thumb {
				width: 18px;
				height: 18px;
				background: #fff;
				border-radius: 50%;
				position: absolute;
				top: 2px;
				left: 2px;
				transition: transform 0.2s ease;
			}
			
			.toggle-switch-track.active .toggle-switch-thumb {
				transform: translateX(20px);
			}
			
				.timeframe-btn {
					padding: 8px 16px;
					background: #1f2a37;
					border: 1px solid #2d3748;
					border-radius: 8px;
					color: #9fb0c0;
					font-size: 0.85rem;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s ease;
				}
				:host(.light-mode) .timeframe-btn {
					background: var(--bg-tertiary);
					border-color: var(--border-color);
					color: var(--text-secondary);
				}
				.timeframe-btn:hover {
					background: #2d3748;
					border-color: #4ea1f3;
					color: #e6edf3;
				}
				:host(.light-mode) .timeframe-btn:hover {
					background: var(--bg-secondary);
					border-color: var(--accent-blue);
					color: var(--text-primary);
				}
				.timeframe-btn.active {
					background: linear-gradient(135deg, #4ea1f3 0%, #3b82f6 100%);
					border-color: transparent;
					color: #0b0f14;
				}
				:host(.light-mode) .timeframe-btn.active {
					background: linear-gradient(135deg, var(--accent-blue) 0%, #3b82f6 100%);
				}
				.chart-container {
					height: 400px;
					position: relative;
					background: #0b0f14;
					border-radius: 8px;
					padding: 10px;
				}
				:host(.light-mode) .chart-container {
					background: #a8b4c2;
				}
				.metrics-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
					gap: 15px;
					margin-top: 20px;
				}
				.metric-card {
					background: #0b0f14;
					border: 1px solid #1f2a37;
					border-radius: 8px;
					padding: 15px;
				}
				:host(.light-mode) .metric-card {
					background: #c0c9d4;
					border-color: #a0aab8;
				}
				.metric-label {
					font-size: 0.85rem;
					color: #9fb0c0;
					margin-bottom: 8px;
					font-weight: 500;
				}
				:host(.light-mode) .metric-label {
					color: #2a2a2a;
				}
				.metric-value {
					font-size: 1.5rem;
					font-weight: 700;
					color: #e6edf3;
				}
				:host(.light-mode) .metric-value {
					color: #0a0a0a;
				}
				.metric-value.positive {
					color: #10b981;
				}
				.metric-value.negative {
					color: #ef4444;
				}
				.metric-value.neutral {
					color: #f59e0b;
				}
				:host(.light-mode) .metric-value.neutral {
					color: #d97706;
				}
				.loading {
					color: #9fb0c0;
					text-align: center;
					padding: 40px;
				}
				:host(.light-mode) .loading {
					color: #2a2a2a;
				}
				.error {
					color: #ef4444;
					text-align: center;
					padding: 20px;
				}
				.empty-state {
					text-align: center;
					padding: 40px;
					color: #9fb0c0;
				}
				:host(.light-mode) .empty-state {
					color: #2a2a2a;
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
			<button class="back-btn" id="back-btn">← Back to Market</button>
			<div class="header">
				<h1 class="page-title">Portfolio Tracking & Analysis</h1>
				<div class="theme-switch">
					<span class="theme-switch-label">Theme</span>
					<div class="theme-switch-track" id="theme-toggle">
						<div class="theme-switch-thumb">
							<span style="font-size: 10px;">🌙</span>
						</div>
					</div>
				</div>
			</div>
			
			<div class="portfolio-section">
				<h2 class="section-title">Portfolio Composition</h2>
				<div class="input-group">
					<div class="input-wrapper">
						<label class="input-label">Stock/ETF Symbol</label>
						<div style="position: relative;">
							<input type="text" class="input-field" id="symbol-input" placeholder="e.g., AAPL or Apple" maxlength="10" autocomplete="off" />
							<div class="autocomplete-dropdown" id="symbol-autocomplete-dropdown"></div>
						</div>
					</div>
					<div class="input-wrapper">
						<label class="input-label">Purchase Price ($)</label>
						<input type="number" class="input-field" id="purchase-price-input" placeholder="e.g., 150.50" min="0" step="0.01" />
					</div>
					<div class="input-wrapper">
						<label class="input-label">Number of Shares</label>
						<input type="number" class="input-field" id="shares-input" placeholder="e.g., 10" min="0" step="0.01" />
					</div>
					<div class="input-wrapper">
						<label class="input-label">Purchase Date</label>
						<input type="date" class="input-field" id="purchase-date-input" />
					</div>
					<button class="add-btn" id="add-btn">Add to Portfolio</button>
				</div>
				<div class="portfolio-content-wrapper">
					<div class="portfolio-list-container">
						<div class="portfolio-list" id="portfolio-list">
							<div class="loading">Loading portfolio...</div>
						</div>
						${this.portfolio.length > 0 ? `
							<div class="total-value-display">
								Total Portfolio Value: <span class="total-value-amount">$${this.getTotalInvestment().toFixed(2)}</span>
							</div>
						` : ''}
					</div>
					<div class="pie-chart-container" id="pie-chart-container">
						${this.portfolio.length > 0 ? '<canvas id="portfolio-pie-chart"></canvas>' : '<div class="empty-chart-message">Add stocks to see portfolio allocation</div>'}
					</div>
				</div>
			</div>
			
			<div class="chart-section" id="chart-section">
				<div class="chart-section-header">
				<h2 class="section-title">Portfolio Performance</h2>
					<button class="reset-btn" id="reset-btn" title="Reset entire portfolio">
						<span class="reset-btn-icon">🔄</span>
						<span>Reset</span>
					</button>
				</div>
				<div class="chart-controls">
					<div class="timeframe-selector">
						<button class="timeframe-btn ${this.timeframe === '1d' ? 'active' : ''}" data-timeframe="1d">1D</button>
						<button class="timeframe-btn ${this.timeframe === '1w' ? 'active' : ''}" data-timeframe="1w">1W</button>
						<button class="timeframe-btn ${this.timeframe === '1m' ? 'active' : ''}" data-timeframe="1m">1M</button>
						<button class="timeframe-btn ${this.timeframe === '3m' ? 'active' : ''}" data-timeframe="3m">3M</button>
						<button class="timeframe-btn ${this.timeframe === '1y' ? 'active' : ''}" data-timeframe="1y">1Y</button>
						<button class="timeframe-btn ${this.timeframe === '2y' ? 'active' : ''}" data-timeframe="2y">2Y</button>
						<button class="timeframe-btn ${this.timeframe === '5y' ? 'active' : ''}" data-timeframe="5y">5Y</button>
						<button class="timeframe-btn ${this.timeframe === '10y' ? 'active' : ''}" data-timeframe="10y">10Y</button>
						<button class="timeframe-btn ${this.timeframe === 'max' ? 'active' : ''}" data-timeframe="max">Max</button>
					</div>
					<div class="chart-options">
					<div class="chart-option">
						<label class="checkbox-label">
							<input type="checkbox" id="show-individual-stocks" />
							<span>Show individual stocks</span>
						</label>
						</div>
						<div class="chart-option">
							<div class="toggle-switch">
								<span class="toggle-label">Show absolute values ($)</span>
								<div class="toggle-switch-track" id="toggle-absolute-values">
									<div class="toggle-switch-thumb"></div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="chart-container" id="chart-container">
					<div class="loading">Loading chart...</div>
				</div>
			</div>
			
			<div class="portfolio-section" id="metrics-section">
				<h2 class="section-title">Portfolio Metrics</h2>
				<div class="metrics-grid" id="metrics-grid">
					<div class="loading">Calculating metrics...</div>
				</div>
			</div>
			
			<!-- Sell Modal -->
			<div class="sell-modal" id="sell-modal">
				<div class="sell-modal-content">
					<div class="sell-modal-header">
						<h3 class="sell-modal-title" id="sell-modal-title">Sell Stock</h3>
						<button class="sell-modal-close" id="sell-modal-close">×</button>
					</div>
					<div class="sell-options">
						<button class="sell-option-btn" id="sell-current-price-btn">
							<div class="sell-option-title">Sell at Current Price</div>
							<div class="sell-option-desc">Sell all shares at the current market price</div>
						</button>
						<button class="sell-option-btn" id="sell-manual-btn">
							<div class="sell-option-title">Manual Entry</div>
							<div class="sell-option-desc">Enter sale price and date manually</div>
						</button>
					</div>
					<div class="sell-manual-form" id="sell-manual-form">
						<div class="input-group">
							<div class="input-wrapper">
								<label class="input-label">Sale Price ($)</label>
								<input type="number" class="input-field" id="sell-price-input" placeholder="e.g., 150.50" min="0" step="0.01" />
							</div>
							<div class="input-wrapper">
								<label class="input-label">Sale Date</label>
								<input type="date" class="input-field" id="sell-date-input" />
							</div>
							<div class="input-wrapper">
								<label class="input-label">Number of Shares</label>
								<input type="number" class="input-field" id="sell-shares-input" placeholder="e.g., 10" min="0" step="0.01" />
							</div>
						</div>
						<div class="sell-form-actions">
							<button class="sell-form-btn sell-form-btn-secondary" id="sell-cancel-btn">Cancel</button>
							<button class="sell-form-btn sell-form-btn-primary" id="sell-confirm-btn">Confirm Sale</button>
						</div>
					</div>
				</div>
			</div>
		
		<div class="disclaimer-footer">
			<div>
				The information provided on this website is for general informational and educational purposes only and does not constitute investment advice, financial advice, trading advice, or any other form of recommendation. All content is provided without regard to individual financial circumstances, investment objectives, or risk tolerance. Past performance is not indicative of future results. Financial markets are subject to risk, and investing may result in the loss of part or all of your capital. Any actions taken based on the information on this website are strictly at your own risk. Before making any investment decision, you should conduct your own research and, where appropriate, consult a licensed financial advisor. By using this website, you acknowledge and agree to this disclaimer. <a href="#" id="disclaimer-link-full">Full Disclaimer</a>
				</div>
			</div>
		`;

		this.setupEventListeners();
		// Load sales history
		this.salesHistory = this.loadSalesHistory();
		// Load portfolio list with current prices
		this.updatePortfolioList();
		// Render pie chart if portfolio has items
		if (this.portfolio.length > 0) {
			setTimeout(() => this.renderPieChart(), 200);
		}
		this.loadChart();
		this.loadMetrics();

		// Apply saved theme
		const savedTheme = localStorage.getItem('theme') || 'dark';
		if (savedTheme === 'light') {
			this.classList.add('light-mode');
			this.shadowRoot.getElementById('theme-toggle').classList.add('light');
		}
	}

	attachDeleteListeners() {
		// Use event delegation on the portfolio list container
		// This works for both initial load and dynamically added items
		const list = this.shadowRoot.getElementById('portfolio-list');
		if (!list) return;
		
		// Remove any existing listeners by cloning
		const newList = list.cloneNode(true);
		list.parentNode.replaceChild(newList, list);
		
		// Add event delegation - listen for clicks on the container
		newList.addEventListener('click', (e) => {
			// Check if the clicked element or its parent is a delete button
			const deleteBtn = e.target.closest('.delete-btn');
			if (deleteBtn) {
				e.preventDefault();
				e.stopPropagation();
				const id = deleteBtn.getAttribute('data-id');
				console.log('[Portfolio] Delete clicked, id:', id);
				if (id) {
					// Try to parse as number (new ID format) or use as symbol (legacy)
					const numericId = parseFloat(id);
					if (!isNaN(numericId)) {
						this.deleteFromPortfolio(numericId);
					} else {
						// Legacy: delete by symbol (remove all entries with this symbol)
						this.portfolio = this.portfolio.filter(item => item.symbol !== id);
						this.savePortfolio();
						this.updateWeights();
						this.updatePortfolioList();
						this.loadChart();
						this.loadMetrics();
					}
				}
			}
		});
	}
	
	attachSellListeners() {
		const list = this.shadowRoot.getElementById('portfolio-list');
		if (!list) return;
		
		// Add event delegation for sell buttons
		list.addEventListener('click', (e) => {
			const sellBtn = e.target.closest('.sell-btn');
			if (sellBtn) {
				e.preventDefault();
				e.stopPropagation();
				const id = sellBtn.getAttribute('data-id');
				const symbol = sellBtn.getAttribute('data-symbol');
				if (id && symbol) {
					this.openSellModal(id, symbol);
				}
			}
		});
	}
	
	openSellModal(id, symbol) {
		const modal = this.shadowRoot.getElementById('sell-modal');
		const modalTitle = this.shadowRoot.getElementById('sell-modal-title');
		const currentPriceBtn = this.shadowRoot.getElementById('sell-current-price-btn');
		const manualBtn = this.shadowRoot.getElementById('sell-manual-btn');
		const manualForm = this.shadowRoot.getElementById('sell-manual-form');
		const closeBtn = this.shadowRoot.getElementById('sell-modal-close');
		const cancelBtn = this.shadowRoot.getElementById('sell-cancel-btn');
		const confirmBtn = this.shadowRoot.getElementById('sell-confirm-btn');
		
		if (!modal) return;
		
		// Find portfolio item by ID
		const numericId = parseFloat(id);
		const portfolioItem = !isNaN(numericId) 
			? this.portfolio.find(item => item.id === numericId)
			: this.portfolio.find(item => item.symbol === symbol);
		if (!portfolioItem) return;
		
		// Store current ID and symbol for later use
		this.currentSellId = id;
		this.currentSellSymbol = symbol;
		
		// Update modal title
		modalTitle.textContent = `Sell ${symbol}`;
		
		// Show modal
		modal.classList.add('show');
		
		// Reset form
		manualForm.classList.remove('show');
		this.shadowRoot.getElementById('sell-price-input').value = '';
		this.shadowRoot.getElementById('sell-date-input').value = '';
		this.shadowRoot.getElementById('sell-shares-input').value = portfolioItem.shares || '';
		
		// Event listeners
		const closeModal = () => {
			modal.classList.remove('show');
			manualForm.classList.remove('show');
		};
		
		// Remove existing listeners by replacing elements
		const newCloseBtn = closeBtn.cloneNode(true);
		closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
		newCloseBtn.addEventListener('click', closeModal);
		
		const newCancelBtn = cancelBtn.cloneNode(true);
		cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
		newCancelBtn.addEventListener('click', closeModal);
		
		// Close on background click
		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				closeModal();
			}
		});
		
		// Current price option
		const newCurrentPriceBtn = currentPriceBtn.cloneNode(true);
		currentPriceBtn.parentNode.replaceChild(newCurrentPriceBtn, currentPriceBtn);
		newCurrentPriceBtn.addEventListener('click', async () => {
			// Fetch current price
			try {
				const response = await fetch(`http://localhost:3000/api/yahoo/quote?symbols=${symbol}`);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const data = await response.json();
				let currentPrice = null;
				
				// Check for server fallback format: data.quoteResponse.result
				if (data && data.quoteResponse && data.quoteResponse.result && Array.isArray(data.quoteResponse.result) && data.quoteResponse.result.length > 0) {
					const quote = data.quoteResponse.result[0];
					currentPrice = quote?.regularMarketPrice || null;
				}
				// Check for Quote API format: data.finance.result
				else if (data && data.finance && data.finance.result && Array.isArray(data.finance.result) && data.finance.result.length > 0) {
					const quote = data.finance.result[0];
					currentPrice = quote?.regularMarketPrice || null;
				}
				// Check for Chart API fallback format: data.chart.result[0]
				else if (data && data.chart && data.chart.result && Array.isArray(data.chart.result) && data.chart.result.length > 0) {
					const result = data.chart.result[0];
					const meta = result.meta;
					currentPrice = meta?.regularMarketPrice || null;
				}
				// Check for direct result array (fallback)
				else if (data && data.result && Array.isArray(data.result) && data.result.length > 0) {
					const quote = data.result[0];
					currentPrice = quote?.regularMarketPrice || null;
				}
				
				if (currentPrice !== null && currentPrice !== undefined && !isNaN(currentPrice) && portfolioItem.shares) {
					await this.recordSale(symbol, currentPrice, portfolioItem.shares, Date.now());
					closeModal();
				} else {
					console.error('Could not extract current price. Response data:', data);
					alert('Could not fetch current price. Please use manual entry.');
				}
			} catch (error) {
				console.error('Error fetching current price:', error);
				alert('Error fetching current price. Please use manual entry.');
			}
		});
		
		// Manual entry option
		const newManualBtn = manualBtn.cloneNode(true);
		manualBtn.parentNode.replaceChild(newManualBtn, manualBtn);
		newManualBtn.addEventListener('click', () => {
			manualForm.classList.add('show');
		});
		
		// Confirm manual sale
		const newConfirmBtn = confirmBtn.cloneNode(true);
		confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
		newConfirmBtn.addEventListener('click', async () => {
			const priceInput = this.shadowRoot.getElementById('sell-price-input');
			const dateInput = this.shadowRoot.getElementById('sell-date-input');
			const sharesInput = this.shadowRoot.getElementById('sell-shares-input');
			
			const salePrice = parseFloat(priceInput.value);
			const saleDateStr = dateInput.value;
			const saleShares = parseFloat(sharesInput.value);
			
			if (isNaN(salePrice) || salePrice <= 0) {
				alert('Please enter a valid sale price');
				return;
			}
			
			if (!saleDateStr) {
				alert('Please enter a sale date');
				return;
			}
			
			if (isNaN(saleShares) || saleShares <= 0) {
				alert('Please enter a valid number of shares');
				return;
			}
			
			if (saleShares > (portfolioItem.shares || 0)) {
				alert('Cannot sell more shares than you own');
				return;
			}
			
			const saleDate = new Date(saleDateStr).getTime();
			if (isNaN(saleDate)) {
				alert('Please enter a valid sale date');
				return;
			}
			
			await this.recordSale(id, symbol, salePrice, saleShares, saleDate);
			closeModal();
		});
	}
	
	async recordSale(id, symbol, salePrice, saleShares, saleDate) {
		// Find portfolio item by ID
		const numericId = parseFloat(id);
		const portfolioItem = !isNaN(numericId) 
			? this.portfolio.find(item => item.id === numericId)
			: this.portfolio.find(item => item.symbol === symbol);
		if (!portfolioItem) return;
		
		// Initialize sales array if it doesn't exist
		if (!portfolioItem.sales) {
			portfolioItem.sales = [];
		}
		
		// Add sale record
		const saleRecord = {
			price: salePrice,
			shares: saleShares,
			date: saleDate,
			value: salePrice * saleShares,
			symbol: symbol,
			purchasePrice: portfolioItem.purchasePrice,
			purchaseDate: portfolioItem.purchaseDate
		};
		portfolioItem.sales.push(saleRecord);
		
		// Save sale to history (for chart display even after item is removed)
		if (!this.salesHistory) {
			this.salesHistory = [];
		}
		this.salesHistory.push(saleRecord);
		this.saveSalesHistory();
		
		// Update remaining shares
		portfolioItem.shares = (portfolioItem.shares || 0) - saleShares;
		
		// Keep the item in portfolio even if all shares are sold (for chart history)
		// Only explicit deletion (X button) removes items from portfolio
		if (portfolioItem.shares < 0) {
			portfolioItem.shares = 0; // Ensure shares don't go negative
		}
		
		// Save and update
		this.savePortfolio();
		await this.updateWeights();
		await this.updatePortfolioList();
		this.loadChart();
		this.loadMetrics();
	}

	setupEventListeners() {
		// Back button
		this.shadowRoot.getElementById('back-btn').addEventListener('click', () => {
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'market-overview' } }));
		});
		
		// Store valid symbols from autocomplete suggestions
		this.validSymbols = new Set();
		
		// Setup autocomplete for symbol input
		this.setupAutocomplete('symbol-input', 'symbol-autocomplete-dropdown');

		// Theme toggle
		this.shadowRoot.getElementById('theme-toggle').addEventListener('click', () => {
			const currentTheme = localStorage.getItem('theme') || 'dark';
			const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
			localStorage.setItem('theme', newTheme);
			
			if (newTheme === 'light') {
				this.classList.add('light-mode');
				this.shadowRoot.getElementById('theme-toggle').classList.add('light');
			} else {
				this.classList.remove('light-mode');
				this.shadowRoot.getElementById('theme-toggle').classList.remove('light');
			}
			
			window.dispatchEvent(new CustomEvent('themechange'));
		});

		// Add to portfolio
		this.shadowRoot.getElementById('add-btn').addEventListener('click', () => {
			this.addToPortfolio();
		});

		// Enter key on inputs - only allow if valid symbol is selected
		this.shadowRoot.getElementById('symbol-input').addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				// Check if symbol is in valid symbols set
				const symbol = this.shadowRoot.getElementById('symbol-input').value.trim().toUpperCase();
				if (this.validSymbols.has(symbol)) {
					this.addToPortfolio();
				} else {
					alert('Please select a valid stock from the suggestions.');
				}
			}
		});
		this.shadowRoot.getElementById('purchase-price-input').addEventListener('keypress', (e) => {
			if (e.key === 'Enter') this.addToPortfolio();
		});
		this.shadowRoot.getElementById('shares-input').addEventListener('keypress', (e) => {
			if (e.key === 'Enter') this.addToPortfolio();
		});

		// Timeframe buttons
		this.shadowRoot.querySelectorAll('.timeframe-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				this.timeframe = btn.dataset.timeframe;
				this.shadowRoot.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
				btn.classList.add('active');
				this.loadChart();
				this.loadMetrics();
			});
		});

		// Show individual stocks checkbox
		const showIndividualCheckbox = this.shadowRoot.getElementById('show-individual-stocks');
		if (showIndividualCheckbox) {
			showIndividualCheckbox.addEventListener('change', () => {
				this.loadChart();
			});
		}
		
		// Show absolute values toggle
		const toggleAbsoluteValues = this.shadowRoot.getElementById('toggle-absolute-values');
		if (toggleAbsoluteValues) {
			toggleAbsoluteValues.addEventListener('click', () => {
				toggleAbsoluteValues.classList.toggle('active');
				this.loadChart();
			});
		}
		
		// Disclaimer link
		this.shadowRoot.getElementById('disclaimer-link-full')?.addEventListener('click', (e) => {
			e.preventDefault();
			window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'disclaimer' } }));
		});
		
		// Reset portfolio button
		const resetBtn = this.shadowRoot.getElementById('reset-btn');
		if (resetBtn) {
			resetBtn.addEventListener('click', () => {
				if (confirm('Are you sure you want to reset the entire portfolio? This will delete all stocks and sales data. This action cannot be undone.')) {
					this.resetPortfolio();
				}
			});
		}
	}

	getTotalInvestment() {
		return this.portfolio.reduce((sum, item) => {
			if (item.purchasePrice && item.shares) {
				return sum + (item.purchasePrice * item.shares);
			}
			return sum;
		}, 0);
	}

	formatCurrency(value) {
		if (value === null || value === undefined || isNaN(value)) return 'N/A';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value);
	}

	formatNumber(value, decimals = 2) {
		if (value === null || value === undefined || isNaN(value)) return 'N/A';
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		}).format(value);
	}

	async calculateWeight(item, currentPrice) {
		// Calculate weight based on current market value
		if (!currentPrice || !item.shares) return 0;
		const currentValue = currentPrice * item.shares;
		
		// Get total current portfolio value
		const totalCurrentValue = await this.getTotalCurrentValue();
		if (totalCurrentValue === 0) return 0;
		
		return (currentValue / totalCurrentValue) * 100;
	}

	async getTotalCurrentValue() {
		if (this.portfolio.length === 0) return 0;
		
		// Fetch current prices for all stocks
		const promises = this.portfolio.map(item => 
			fetch(`http://localhost:3000/api/yahoo/quote?symbols=${item.symbol}`)
				.then(res => res.json())
				.then(data => {
					const quote = data?.result?.[0];
					const currentPrice = quote?.regularMarketPrice || null;
					return { symbol: item.symbol, currentPrice, shares: item.shares };
				})
				.catch(() => ({ symbol: item.symbol, currentPrice: null, shares: item.shares }))
		);
		
		const results = await Promise.all(promises);
		return results.reduce((sum, r) => {
			if (r.currentPrice && r.shares) {
				return sum + (r.currentPrice * r.shares);
			}
			return sum;
		}, 0);
	}

	async addToPortfolio() {
		const symbolInput = this.shadowRoot.getElementById('symbol-input');
		const purchasePriceInput = this.shadowRoot.getElementById('purchase-price-input');
		const sharesInput = this.shadowRoot.getElementById('shares-input');
		const purchaseDateInput = this.shadowRoot.getElementById('purchase-date-input');
		
		const symbol = symbolInput.value.trim().toUpperCase();
		const purchasePrice = parseFloat(purchasePriceInput.value);
		const shares = parseFloat(sharesInput.value);
		const purchaseDateStr = purchaseDateInput.value;

		if (!symbol) {
			alert('Please enter a symbol');
			return;
		}

		// Validate that symbol exists in autocomplete suggestions
		if (!this.validSymbols.has(symbol)) {
			alert(`Please select a valid stock from the suggestions. "${symbol}" is not a valid stock symbol.`);
			return;
		}

		// Purchase price and shares are required
		if (isNaN(purchasePrice) || purchasePrice <= 0) {
			alert('Please enter a valid purchase price greater than 0');
			return;
		}

		if (isNaN(shares) || shares <= 0) {
			alert('Please enter a valid number of shares greater than 0');
				return;
			}

		// Validate purchase date
		if (!purchaseDateStr) {
			alert('Please enter a purchase date');
			return;
		}

		// Convert purchase date to timestamp
		const purchaseDate = new Date(purchaseDateStr).getTime();
		if (isNaN(purchaseDate)) {
			alert('Please enter a valid purchase date');
			return;
		}

		// Allow multiple entries for the same symbol (different purchase dates/prices)
		// Add new position with purchase date (always add, don't update existing)
		this.portfolio.push({ 
			symbol, 
			purchasePrice, 
			shares,
			purchaseDate: purchaseDate, // Store purchase timestamp
			id: Date.now() + Math.random() // Unique ID for this portfolio entry
		});

		// Calculate weights for all items (will always sum to 100%)
		await this.updateWeights();

		this.savePortfolio();
		await this.updatePortfolioList();
		
		symbolInput.value = '';
		purchasePriceInput.value = '';
		sharesInput.value = '';
		purchaseDateInput.value = '';
		
		this.loadChart();
		this.loadMetrics();
	}

	async updateWeights() {
		// Calculate weight for each item based on current market value
		if (this.portfolio.length === 0) return;
		
		// Fetch current prices for all stocks
		const promises = this.portfolio.map(item => 
			fetch(`http://localhost:3000/api/yahoo/quote?symbols=${item.symbol}`)
				.then(res => {
					if (!res.ok) {
						console.error(`[Portfolio] Failed to fetch quote for ${item.symbol} in updateWeights:`, res.status);
						throw new Error(`HTTP ${res.status}`);
					}
					return res.json();
				})
				.then(data => {
					let currentPrice = null;
					
					// Check for server fallback format: data.quoteResponse.result
					if (data && data.quoteResponse && data.quoteResponse.result && Array.isArray(data.quoteResponse.result) && data.quoteResponse.result.length > 0) {
						const quote = data.quoteResponse.result[0];
						currentPrice = quote?.regularMarketPrice || null;
					}
					// Check for Quote API format: data.finance.result
					else if (data && data.finance && data.finance.result && Array.isArray(data.finance.result) && data.finance.result.length > 0) {
						const quote = data.finance.result[0];
						currentPrice = quote?.regularMarketPrice || null;
					}
					// Check for Chart API fallback format: data.chart.result[0]
					else if (data && data.chart && data.chart.result && Array.isArray(data.chart.result) && data.chart.result.length > 0) {
						const result = data.chart.result[0];
						const meta = result.meta;
						currentPrice = meta?.regularMarketPrice || null;
					}
					// Check for direct result array (fallback)
					else if (data && data.result && Array.isArray(data.result) && data.result.length > 0) {
						const quote = data.result[0];
						currentPrice = quote?.regularMarketPrice || null;
					}
					
					return { symbol: item.symbol, currentPrice, item };
				})
				.catch(error => {
					console.error(`[Portfolio] Error in updateWeights for ${item.symbol}:`, error);
					return { symbol: item.symbol, currentPrice: null, item };
				})
		);
		
		const results = await Promise.all(promises);
		const totalCurrentValue = results.reduce((sum, r) => {
			if (r.currentPrice && r.item.shares) {
				return sum + (r.currentPrice * r.item.shares);
			}
			return sum;
		}, 0);
		
		if (totalCurrentValue === 0) return;
		
		// Update weights based on current values
		results.forEach(r => {
			if (r.currentPrice && r.item.shares) {
				const currentValue = r.currentPrice * r.item.shares;
				r.item.weight = (currentValue / totalCurrentValue) * 100;
				r.item.currentPrice = r.currentPrice; // Store for later use
			}
		});
	}

	async deleteFromPortfolio(id) {
		console.log('[Portfolio] deleteFromPortfolio called with id:', id);
		console.log('[Portfolio] Current portfolio before delete:', JSON.stringify(this.portfolio));
		this.portfolio = this.portfolio.filter(item => item.id !== id);
		console.log('[Portfolio] Portfolio after delete:', JSON.stringify(this.portfolio));
		await this.updateWeights();
		this.savePortfolio();
		await this.updatePortfolioList();
		this.loadChart();
		this.loadMetrics();
	}

	async resetPortfolio() {
		// Clear portfolio
		this.portfolio = [];
		this.savePortfolio();
		
		// Clear sales history
		this.salesHistory = [];
		this.saveSalesHistory();
		
		// Clear input fields
		const symbolInput = this.shadowRoot.getElementById('symbol-input');
		const purchasePriceInput = this.shadowRoot.getElementById('purchase-price-input');
		const sharesInput = this.shadowRoot.getElementById('shares-input');
		const purchaseDateInput = this.shadowRoot.getElementById('purchase-date-input');
		
		if (symbolInput) symbolInput.value = '';
		if (purchasePriceInput) purchasePriceInput.value = '';
		if (sharesInput) sharesInput.value = '';
		if (purchaseDateInput) purchaseDateInput.value = '';
		
		// Reload everything
		await this.updatePortfolioList();
		this.loadChart();
		this.loadMetrics();
		
		// Destroy pie chart if it exists
		if (this.pieChart) {
			this.pieChart.destroy();
			this.pieChart = null;
		}
		
		// Destroy portfolio chart if it exists
		if (this.portfolioChart) {
			this.portfolioChart.destroy();
			this.portfolioChart = null;
		}
	}

	async updatePortfolioList() {
		const list = this.shadowRoot.getElementById('portfolio-list');
		if (!list) return;
		
		list.innerHTML = '<div class="loading">Loading portfolio data...</div>';
		
		// Render with current prices
		const html = await this.renderPortfolioList();
		list.innerHTML = html;
		
		// Re-attach delete listeners using event delegation
		this.attachDeleteListeners();
		this.attachSellListeners();
		
		// Update weights based on current prices
		await this.updateWeights();
		
		// Update pie chart
		setTimeout(() => this.renderPieChart(), 100);

		// Update total portfolio value display (current value, not investment)
		const section = this.shadowRoot.querySelector('.portfolio-section');
		if (section) {
			const existingTotal = section.querySelector('.total-value-display');
			if (existingTotal) {
				existingTotal.remove();
			}
			if (this.portfolio.length > 0) {
				// Calculate total current value from the price map used in renderPortfolioList
				// We need to fetch prices again or use the same price map
				const pricePromises = this.portfolio.map(item => 
					fetch(`http://localhost:3000/api/yahoo/quote?symbols=${item.symbol}`)
						.then(res => {
							if (!res.ok) throw new Error(`HTTP ${res.status}`);
							return res.json();
						})
						.then(data => {
							let currentPrice = null;
							if (data && data.quoteResponse && data.quoteResponse.result && Array.isArray(data.quoteResponse.result) && data.quoteResponse.result.length > 0) {
								const quote = data.quoteResponse.result[0];
								currentPrice = quote?.regularMarketPrice || null;
							} else if (data && data.finance && data.finance.result && Array.isArray(data.finance.result) && data.finance.result.length > 0) {
								const quote = data.finance.result[0];
								currentPrice = quote?.regularMarketPrice || null;
							} else if (data && data.chart && data.chart.result && Array.isArray(data.chart.result) && data.chart.result.length > 0) {
								const result = data.chart.result[0];
								const meta = result.meta;
								currentPrice = meta?.regularMarketPrice || null;
							} else if (data && data.result && Array.isArray(data.result) && data.result.length > 0) {
								const quote = data.result[0];
								currentPrice = quote?.regularMarketPrice || null;
							}
							return { symbol: item.symbol, currentPrice, shares: item.shares };
						})
						.catch(() => ({ symbol: item.symbol, currentPrice: null, shares: item.shares }))
				);
				
				const priceResults = await Promise.all(pricePromises);
				const totalCurrentValue = priceResults.reduce((sum, r) => {
					if (r.currentPrice && r.shares) {
						return sum + (r.currentPrice * r.shares);
					}
					return sum;
				}, 0);
				
				const totalInvestment = this.getTotalInvestment();
				const totalPL = totalCurrentValue - totalInvestment;
				const totalPLPercent = totalInvestment > 0 ? ((totalPL / totalInvestment) * 100) : 0;
				const plClass = totalPL >= 0 ? 'positive' : 'negative';
				
				const totalDiv = document.createElement('div');
				totalDiv.className = 'total-value-display';
				totalDiv.innerHTML = `
					<div class="total-value-item">
						<div class="total-value-label">Purchase Value</div>
						<div class="total-value-amount">${this.formatCurrency(totalInvestment)}</div>
					</div>
					<div class="total-value-item">
						<div class="total-value-label">Current Value</div>
						<div class="total-value-amount">${this.formatCurrency(totalCurrentValue)}</div>
					</div>
					<div class="total-value-item">
						<div class="total-value-label">P/L %</div>
						<div class="total-value-amount ${plClass}">${totalPLPercent >= 0 ? '+' : ''}${this.formatNumber(totalPLPercent, 2)}%</div>
					</div>
					<div class="total-value-item">
						<div class="total-value-label">P/L $</div>
						<div class="total-value-amount ${plClass}">${totalPL >= 0 ? '+' : ''}${this.formatCurrency(totalPL)}</div>
					</div>
				`;
				section.appendChild(totalDiv);
			}
		}
	}

	async renderPortfolioList() {
		if (this.portfolio.length === 0) {
			return '<div class="empty-state" style="grid-column: 1 / -1;">No stocks in portfolio. Add stocks above to get started.</div>';
		}

		// Fetch current prices for all stocks
		const pricePromises = this.portfolio.map(item => 
			fetch(`http://localhost:3000/api/yahoo/quote?symbols=${item.symbol}`)
				.then(res => {
					if (!res.ok) {
						console.error(`[Portfolio] Failed to fetch quote for ${item.symbol}:`, res.status, res.statusText);
						throw new Error(`HTTP ${res.status}`);
					}
					return res.json();
				})
				.then(data => {
					console.log(`[Portfolio] Quote data for ${item.symbol}:`, data);
					let currentPrice = null;
					
					// Check for server fallback format: data.quoteResponse.result
					if (data && data.quoteResponse && data.quoteResponse.result && Array.isArray(data.quoteResponse.result) && data.quoteResponse.result.length > 0) {
						const quote = data.quoteResponse.result[0];
						currentPrice = quote?.regularMarketPrice || null;
						console.log(`[Portfolio] Current price for ${item.symbol} (from quoteResponse.result):`, currentPrice);
					}
					// Check for Quote API format: data.finance.result
					else if (data && data.finance && data.finance.result && Array.isArray(data.finance.result) && data.finance.result.length > 0) {
						const quote = data.finance.result[0];
						currentPrice = quote?.regularMarketPrice || null;
						console.log(`[Portfolio] Current price for ${item.symbol} (from finance.result):`, currentPrice);
					}
					// Check for Chart API fallback format: data.chart.result[0]
					else if (data && data.chart && data.chart.result && Array.isArray(data.chart.result) && data.chart.result.length > 0) {
						const result = data.chart.result[0];
						const meta = result.meta;
						currentPrice = meta?.regularMarketPrice || null;
						console.log(`[Portfolio] Current price for ${item.symbol} (from Chart API):`, currentPrice);
					}
					// Check for direct result array (fallback from server)
					else if (data && data.result && Array.isArray(data.result) && data.result.length > 0) {
						const quote = data.result[0];
						currentPrice = quote?.regularMarketPrice || null;
						console.log(`[Portfolio] Current price for ${item.symbol} (from direct result):`, currentPrice);
					}
					
					if (currentPrice === null) {
						console.warn(`[Portfolio] No result data for ${item.symbol}. Data structure:`, Object.keys(data || {}));
					}
					
					return { symbol: item.symbol, currentPrice };
				})
				.catch(error => {
					console.error(`[Portfolio] Error fetching quote for ${item.symbol}:`, error);
					return { symbol: item.symbol, currentPrice: null };
				})
		);
		
		const priceResults = await Promise.all(pricePromises);
		const priceMap = new Map(priceResults.map(r => [r.symbol, r.currentPrice]));
		
		// Calculate total current value for weight calculation
		const totalCurrentValue = this.portfolio.reduce((sum, item) => {
			const currentPrice = priceMap.get(item.symbol);
			if (currentPrice && item.shares) {
				return sum + (currentPrice * item.shares);
			}
			return sum;
		}, 0);

			// Build table header
			const header = `
				<thead class="portfolio-table-header">
					<tr>
						<th class="action-cell"></th>
						<th>Symbol</th>
						<th>Purchase Date</th>
						<th>Purchase Price</th>
						<th>Shares</th>
						<th>Investment</th>
						<th>Current Value</th>
						<th>Weight</th>
						<th>P/L %</th>
						<th>P/L $</th>
					</tr>
				</thead>
			`;

		// Build table rows - filter out items with 0 shares (sold items)
		const activeItems = this.portfolio.filter(item => (item.shares || 0) > 0);
		
		if (activeItems.length === 0) {
			return '<div class="empty-state" style="grid-column: 1 / -1;">No active stocks in portfolio. All stocks have been sold.</div>';
		}
		
		const rows = activeItems.map(item => {
			// Always show purchase price, shares, and investment (these are always available)
			const purchasePrice = item.purchasePrice ? this.formatCurrency(item.purchasePrice) : 'N/A';
			const shares = item.shares ? this.formatNumber(item.shares, 2) : 'N/A';
			const investment = item.purchasePrice && item.shares ? this.formatCurrency(item.purchasePrice * item.shares) : 'N/A';
			
			// Format purchase date
			const purchaseDate = item.purchaseDate 
				? new Date(item.purchaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
				: 'N/A';
			
			// Get current price from price map
			const currentPrice = priceMap.get(item.symbol);
			const hasCurrentPrice = currentPrice !== null && currentPrice !== undefined;
			const currentValue = hasCurrentPrice && item.shares ? currentPrice * item.shares : null;
			const currentValueStr = currentValue ? this.formatCurrency(currentValue) : (hasCurrentPrice === false ? 'N/A' : 'Loading...');
			
			// Calculate weight based on current value
			let weight = 'N/A';
			if (totalCurrentValue > 0 && currentValue) {
				weight = `${this.formatNumber((currentValue / totalCurrentValue) * 100, 2)}%`;
			} else if (hasCurrentPrice === false) {
				weight = 'N/A';
			}
			
			// Calculate profit/loss
			let profitLossPercent = null;
			let profitLossAbsolute = null;
			let profitLossClass = '';
			
			if (hasCurrentPrice && item.purchasePrice) {
				profitLossPercent = ((currentPrice - item.purchasePrice) / item.purchasePrice) * 100;
				if (item.shares) {
					profitLossAbsolute = (currentPrice - item.purchasePrice) * item.shares;
				}
				profitLossClass = profitLossPercent >= 0 ? 'positive' : 'negative';
			}
			
			const profitLossPercentStr = profitLossPercent !== null ? `${profitLossPercent >= 0 ? '+' : ''}${this.formatNumber(profitLossPercent, 2)}%` : 'N/A';
			const profitLossAbsoluteStr = profitLossAbsolute !== null ? `${profitLossAbsolute >= 0 ? '+' : ''}${this.formatCurrency(profitLossAbsolute)}` : 'N/A';
			
			return `
				<tr class="portfolio-table-row">
					<td class="action-cell">
						<button class="sell-btn" data-id="${item.id || item.symbol}" data-symbol="${item.symbol}" title="Sell ${item.symbol}">$</button>
				<button class="delete-btn" data-id="${item.id || item.symbol}" data-symbol="${item.symbol}" title="Remove ${item.symbol}">×</button>
					</td>
					<td class="symbol-cell">${item.symbol}</td>
					<td class="value-cell">${purchaseDate}</td>
					<td class="value-cell">${purchasePrice}</td>
					<td class="value-cell">${shares}</td>
					<td class="value-cell">${investment}</td>
					<td class="value-cell">${currentValueStr}</td>
					<td class="value-cell">${weight}</td>
					<td class="value-cell ${profitLossClass}">${profitLossPercentStr}</td>
					<td class="value-cell ${profitLossClass}">${profitLossAbsoluteStr}</td>
				</tr>
			`;
		}).join('');

		return `
			<table class="portfolio-table">
				${header}
				<tbody>
					${rows}
				</tbody>
			</table>
		`;
	}

	loadPortfolio() {
		try {
			const saved = localStorage.getItem('portfolio');
			return saved ? JSON.parse(saved) : [];
		} catch (e) {
			return [];
		}
	}

	savePortfolio() {
		localStorage.setItem('portfolio', JSON.stringify(this.portfolio));
	}
	
	loadSalesHistory() {
		try {
			const saved = localStorage.getItem('portfolioSalesHistory');
			return saved ? JSON.parse(saved) : [];
		} catch (e) {
			return [];
		}
	}
	
	saveSalesHistory() {
		if (this.salesHistory) {
			localStorage.setItem('portfolioSalesHistory', JSON.stringify(this.salesHistory));
		} else {
			localStorage.removeItem('portfolioSalesHistory');
		}
	}

	async loadChart() {
		const container = this.shadowRoot.getElementById('chart-container');
		if (this.portfolio.length === 0) {
			container.innerHTML = '<div class="empty-state">Add stocks to your portfolio to see the chart</div>';
			return;
		}

		container.innerHTML = '<div class="loading">Loading chart data...</div>';

		try {
			// Map timeframe to range
			const rangeMap = {
				'1d': '1d',
				'1w': '5d',
				'1m': '1mo',
				'3m': '3mo',
				'1y': '1y',
				'2y': '2y',
				'5y': '5y',
				'10y': '10y',
				'max': 'max'
			};
			const range = rangeMap[this.timeframe] || '1y';

			// Get earliest purchase date from portfolio
			const purchaseDates = this.portfolio
				.filter(item => item.purchaseDate)
				.map(item => item.purchaseDate);
			const earliestPurchaseDate = purchaseDates.length > 0 
				? Math.min(...purchaseDates) 
				: Date.now() - (365 * 24 * 60 * 60 * 1000); // Default to 1 year ago if no date
			
			// Calculate how many years back we need to go from earliest purchase date
			let apiRange = range;
			if (range === 'max' || range === '10y') {
				// Calculate years between earliest purchase and now
				const yearsSincePurchase = earliestPurchaseDate 
					? (Date.now() - earliestPurchaseDate) / (365.25 * 24 * 60 * 60 * 1000)
					: 10;
				
				// Use 'max' if we need more than 10 years, otherwise use calculated range
				if (yearsSincePurchase > 10) {
					apiRange = 'max'; // Yahoo Finance 'max' should return all available data
				} else if (yearsSincePurchase > 5) {
					apiRange = '10y';
				} else if (yearsSincePurchase > 2) {
					apiRange = '5y';
				} else if (yearsSincePurchase > 1) {
					apiRange = '2y';
				} else {
					apiRange = '1y';
				}
			}
			// Determine interval based on range for better resolution
			// For longer ranges, use weekly data for better performance while maintaining visibility
			let interval = '1d'; // Default to daily
			if (range === '10y' || range === 'max') {
				interval = '1wk'; // Weekly for 10y and max for better resolution
			} else if (range === '5y') {
				interval = '1d'; // Daily for 5y
			}
			
			const promises = this.portfolio.map(item => {
				// Calculate original shares (before any sales)
				const originalShares = (item.shares || 0) + (item.sales && Array.isArray(item.sales) 
					? item.sales.reduce((sum, sale) => sum + sale.shares, 0) 
					: 0);
				
				return fetch(`http://localhost:3000/api/yahoo/chart/${item.symbol}?interval=${interval}&range=${apiRange}`)
					.then(res => res.json())
					.then(data => ({ 
						symbol: item.symbol, 
						weight: item.weight || 0, 
						purchasePrice: item.purchasePrice || null,
						shares: originalShares, // Use original shares for chart calculation
						currentShares: item.shares || 0, // Current remaining shares
						purchaseDate: item.purchaseDate || Date.now(), // Include purchase date
						sales: item.sales || [], // Include sales data
						data 
					}))
					.catch(err => ({ 
						symbol: item.symbol, 
						weight: item.weight || 0, 
						purchasePrice: item.purchasePrice || null,
						shares: originalShares,
						currentShares: item.shares || 0,
						purchaseDate: item.purchaseDate || Date.now(),
						sales: item.sales || [],
						error: err.message 
					}));
			});

			const results = await Promise.all(promises);
			
			// Calculate weighted portfolio values
			const portfolioData = this.calculatePortfolioData(results, range);
			
			// Render chart
			this.renderChart(portfolioData);

		} catch (error) {
			console.error('Error loading chart:', error);
			container.innerHTML = `<div class="error">Error loading chart: ${error.message}</div>`;
		}
	}

	calculatePortfolioData(results, range) {
		// Find the stock with the most data points (reference)
		const validResults = results.filter(r => !r.error && r.data?.chart?.result?.[0]);
		if (validResults.length === 0) return null;

		// Get earliest purchase date from all portfolio items
		const purchaseDates = validResults
			.map(r => r.purchaseDate)
			.filter(date => date != null);
		const earliestPurchaseDate = purchaseDates.length > 0 
			? Math.min(...purchaseDates) 
			: null;

		// Find reference stock and filter timestamps
		const reference = validResults[0].data.chart.result[0];
		const originalTimestamps = reference.timestamp || [];
		
		// Determine the start timestamp based on range
		let startTimestamp = null;
		
		// For fixed time ranges (1y, 2y, 5y, 10y), show only the last N years from today
		// For 'max', show from earliest purchase date onwards
		if (range === '10y') {
			// Show only last 10 years from today
			const tenYearsAgo = Date.now() - (10 * 365.25 * 24 * 60 * 60 * 1000);
			startTimestamp = Math.floor(tenYearsAgo / 1000);
		} else if (range === '5y') {
			// Show only last 5 years from today
			const fiveYearsAgo = Date.now() - (5 * 365.25 * 24 * 60 * 60 * 1000);
			startTimestamp = Math.floor(fiveYearsAgo / 1000);
		} else if (range === '2y') {
			// Show only last 2 years from today
			const twoYearsAgo = Date.now() - (2 * 365.25 * 24 * 60 * 60 * 1000);
			startTimestamp = Math.floor(twoYearsAgo / 1000);
		} else if (range === '1y') {
			// Show only last 1 year from today
			const oneYearAgo = Date.now() - (365.25 * 24 * 60 * 60 * 1000);
			startTimestamp = Math.floor(oneYearAgo / 1000);
		} else if (range === 'max' && earliestPurchaseDate) {
			// For 'max', show from earliest purchase date onwards
			startTimestamp = Math.floor(earliestPurchaseDate / 1000);
		} else if (earliestPurchaseDate) {
			// For other ranges or if no range specified, use earliest purchase date
			startTimestamp = Math.floor(earliestPurchaseDate / 1000);
		}
		
		// Filter timestamps based on start timestamp
		let timestamps = originalTimestamps;
		if (startTimestamp !== null) {
			// Filter to only include timestamps from start timestamp onwards
			timestamps = originalTimestamps.filter(ts => ts >= startTimestamp);
			
			// If no timestamps after start, try to find the closest timestamp
			if (timestamps.length === 0) {
				// Find the first timestamp that is >= start timestamp
				const closestIndex = originalTimestamps.findIndex(ts => ts >= startTimestamp);
				if (closestIndex >= 0) {
					timestamps = originalTimestamps.slice(closestIndex);
				} else {
					// If start is in the future, use the last available timestamp
					if (originalTimestamps.length > 0) {
						timestamps = [originalTimestamps[originalTimestamps.length - 1]];
					}
				}
			}
		}
		
		// Find the starting index for filtered timestamps
		const startIndex = startTimestamp !== null && timestamps.length > 0
			? originalTimestamps.findIndex(ts => ts === timestamps[0])
			: 0;
		
		// Ensure we have valid timestamps
		if (timestamps.length === 0) {
			// Fallback: use all available timestamps
			timestamps = originalTimestamps;
		}
		
		// Calculate portfolio value for each timestamp based on actual shares and prices
		const portfolioValues = [];
		
		// Calculate base portfolio value (total investment at purchase) for stocks at the FIRST timestamp
		// This baseline should remain constant throughout the entire chart
		// It only includes stocks that were purchased by or at the first timestamp
		const firstTimestamp = timestamps.length > 0 ? timestamps[0] : null;
		let basePortfolioValue = 0;
		
		validResults.forEach(result => {
			const resultPurchaseTimestamp = result.purchaseDate 
				? Math.floor(result.purchaseDate / 1000) 
				: null;
			
			// Only include in base value if stock was purchased by or at the first timestamp
			if (firstTimestamp && resultPurchaseTimestamp && resultPurchaseTimestamp > firstTimestamp) {
				return; // Stock not purchased yet at the first timestamp
			}
			
			if (result.purchasePrice && result.shares) {
				basePortfolioValue += result.purchasePrice * result.shares;
			} else if (result.weight) {
				// Fallback to weight-based calculation if purchase price/shares not available
			const stockData = result.data.chart.result[0];
			const prices = stockData.indicators?.quote?.[0]?.close || [];
				if (prices[startIndex] !== null && prices[startIndex] !== undefined) {
					// Estimate shares based on weight (assuming equal total investment)
					const estimatedInvestment = basePortfolioValue || 10000; // Default assumption
					const estimatedShares = (estimatedInvestment * result.weight / 100) / prices[startIndex];
					basePortfolioValue += prices[startIndex] * estimatedShares;
				}
			}
		});
		
		if (basePortfolioValue === 0) {
			basePortfolioValue = 1; // Prevent division by zero
		}

		// Calculate percentage change for each timestamp
		// The key insight: For each timestamp, we need to calculate:
		// 1. The base investment value (what was invested up to this point) - using purchase prices
		// 2. The current portfolio value (current market value of all stocks purchased up to this point)
		// 3. The percentage change = (current - base) / base * 100
		// When a new stock is added, it starts at 0% performance (purchase price = current price at purchase time)
		// This ensures smooth transitions without jumps
		for (let i = 0; i < timestamps.length; i++) {
			const currentTimestamp = timestamps[i];
			let currentPortfolioValue = 0;
			let baseValueForThisTimestamp = 0; // Base value for this timestamp (what was invested up to this point)
			
			// First, calculate what the base investment was at this timestamp
			// This includes all stocks purchased up to and including this timestamp
			// We use the purchase price, not the current price at purchase time
			validResults.forEach(result => {
				const resultPurchaseTimestamp = result.purchaseDate 
					? Math.floor(result.purchaseDate / 1000) 
					: null;
				
				// Only include in base value if stock was purchased by this timestamp
				if (resultPurchaseTimestamp && currentTimestamp < resultPurchaseTimestamp) {
					return; // Stock not purchased yet
				}
				
				if (result.purchasePrice && result.shares) {
					// Calculate remaining shares at this timestamp (accounting for sales)
					const remainingShares = this.getRemainingShares(result.symbol, result.shares, currentTimestamp);
					// Use purchase price for base value calculation (only for remaining shares)
					baseValueForThisTimestamp += result.purchasePrice * remainingShares;
				} else if (result.weight) {
					// Fallback to weight-based calculation
				const stockData = result.data.chart.result[0];
				const prices = stockData.indicators?.quote?.[0]?.close || [];
					const originalTimestamps = stockData.timestamp || [];
					
					// Find the price at purchase time (or at first timestamp if no purchase date)
					let purchasePriceIndex = startIndex;
					if (resultPurchaseTimestamp && originalTimestamps.length > 0) {
						const purchaseIndex = originalTimestamps.findIndex(ts => ts >= resultPurchaseTimestamp);
						if (purchaseIndex !== -1 && purchaseIndex < prices.length) {
							purchasePriceIndex = purchaseIndex;
						}
					}
					
					if (purchasePriceIndex < prices.length && prices[purchasePriceIndex] !== null && prices[purchasePriceIndex] !== undefined) {
						const basePrice = prices[purchasePriceIndex];
						const estimatedInvestment = basePortfolioValue || 10000;
						const estimatedShares = (estimatedInvestment * result.weight / 100) / basePrice;
						baseValueForThisTimestamp += basePrice * estimatedShares;
					}
				}
			});
			
			// Now calculate current portfolio value at this timestamp
			validResults.forEach(result => {
				const stockData = result.data.chart.result[0];
				const prices = stockData.indicators?.quote?.[0]?.close || [];
				const originalTimestamps = stockData.timestamp || [];
				
				// Find the index in original timestamps that matches current timestamp
				const originalIndex = originalTimestamps.findIndex(ts => ts === currentTimestamp);
				if (originalIndex === -1 || originalIndex >= prices.length) {
					return; // No data available for this timestamp
				}
				
				// Only include stock if it was purchased by this timestamp
				const resultPurchaseTimestamp = result.purchaseDate 
					? Math.floor(result.purchaseDate / 1000) 
					: null;
				
				if (resultPurchaseTimestamp && currentTimestamp < resultPurchaseTimestamp) {
					return; // Stock not purchased yet
				}
				
				// For stocks purchased exactly at this timestamp, use purchase price to avoid jumps
				// This ensures that new stocks start at 0% performance
				if (resultPurchaseTimestamp && currentTimestamp === resultPurchaseTimestamp) {
					if (result.purchasePrice && result.shares) {
						// At purchase time, no sales have occurred yet
						currentPortfolioValue += result.purchasePrice * result.shares;
					}
				} else if (prices[originalIndex] !== null && prices[originalIndex] !== undefined && !isNaN(prices[originalIndex])) {
					if (result.purchasePrice && result.shares) {
						// Calculate remaining shares at this timestamp (accounting for sales)
						const remainingShares = this.getRemainingShares(result.symbol, result.shares, currentTimestamp);
						// Use remaining shares and current price
						currentPortfolioValue += prices[originalIndex] * remainingShares;
					} else if (result.weight) {
						// Fallback to weight-based calculation
						const basePrice = prices[startIndex] || 1;
						const estimatedInvestment = basePortfolioValue || 10000;
						const estimatedShares = (estimatedInvestment * result.weight / 100) / basePrice;
						currentPortfolioValue += prices[originalIndex] * estimatedShares;
					}
				}
			});
			
			// Calculate percentage change relative to the base value for this timestamp
			// This ensures that when a new stock is added, the percentage is calculated correctly
			// without causing jumps, because we're comparing current value to the investment made up to that point
			if (baseValueForThisTimestamp > 0 && currentPortfolioValue > 0) {
				const percentageChange = ((currentPortfolioValue - baseValueForThisTimestamp) / baseValueForThisTimestamp) * 100;
				// Ensure we don't have NaN or Infinity values
				if (isFinite(percentageChange) && !isNaN(percentageChange)) {
				portfolioValues.push(percentageChange);
			} else {
					// If calculation resulted in invalid value, use previous value or 0
					const prevValue = portfolioValues.length > 0 ? portfolioValues[portfolioValues.length - 1] : 0;
					portfolioValues.push(prevValue);
				}
			} else if (baseValueForThisTimestamp > 0 && currentPortfolioValue === 0) {
				// If we have base value but no current value (data missing), use previous value
				const prevValue = portfolioValues.length > 0 ? portfolioValues[portfolioValues.length - 1] : 0;
				portfolioValues.push(prevValue);
			} else {
				// No base value means no stocks purchased yet, so 0% performance
				portfolioValues.push(0);
			}
		}

		// Additional smoothing: if there are sudden jumps (likely due to data issues), smooth them out
		// This helps prevent spikes at the end or when data is missing
		if (portfolioValues.length > 2) {
			for (let i = 1; i < portfolioValues.length - 1; i++) {
				const prevValue = portfolioValues[i - 1];
				const currentValue = portfolioValues[i];
				const nextValue = portfolioValues[i + 1];
				
				// Check for sudden jumps (more than 30% change in one step)
				const changeFromPrev = Math.abs(currentValue - prevValue);
				const changeToNext = Math.abs(nextValue - currentValue);
				
				// If there's a sudden jump followed by a reversal, it's likely a data issue
				if (changeFromPrev > 30 && changeToNext > 30 && 
					Math.sign(currentValue - prevValue) !== Math.sign(nextValue - currentValue)) {
					// Smooth by interpolating between previous and next value
					portfolioValues[i] = (prevValue + nextValue) / 2;
				}
			}
		}

		// Calculate individual stock values (percentage change from purchase price)
		// Only show data from purchase date onwards, aligned with filtered timestamps
		const individualStocks = {};
		validResults.forEach(result => {
			const stockData = result.data.chart.result[0];
			const prices = stockData.indicators?.quote?.[0]?.close || [];
			const originalTimestamps = stockData.timestamp || [];
			const resultPurchaseTimestamp = result.purchaseDate 
				? Math.floor(result.purchaseDate / 1000) 
				: null;
			
			// Find purchase price index in original timestamps
			let purchasePriceIndex = 0;
			if (resultPurchaseTimestamp && originalTimestamps.length > 0) {
				const purchaseIndex = originalTimestamps.findIndex(ts => ts >= resultPurchaseTimestamp);
				if (purchaseIndex !== -1) {
					purchasePriceIndex = purchaseIndex;
				}
			}
			
			const basePrice = result.purchasePrice || prices[purchasePriceIndex] || prices[0];
			
			if (prices.length > 0 && basePrice !== null && basePrice !== undefined && basePrice > 0) {
				const stockValues = [];
				// Only calculate values for timestamps that match our filtered timestamps
				for (let i = 0; i < timestamps.length; i++) {
					const currentTimestamp = timestamps[i];
					const originalIndex = originalTimestamps.findIndex(ts => ts === currentTimestamp);
					
					// Only show data from purchase date onwards
					if (resultPurchaseTimestamp && currentTimestamp < resultPurchaseTimestamp) {
						stockValues.push(null);
						continue;
					}
					
					if (originalIndex !== -1 && prices[originalIndex] !== null && prices[originalIndex] !== undefined) {
						const percentageChange = ((prices[originalIndex] - basePrice) / basePrice) * 100;
						stockValues.push(percentageChange);
					} else {
						stockValues.push(null);
					}
				}
				individualStocks[result.symbol] = {
					values: stockValues,
					weight: result.weight || 0
				};
			}
		});

		return {
			labels: timestamps.map(ts => new Date(ts * 1000)),
			values: portfolioValues,
			individualStocks: individualStocks
		};
	}

	renderChart(data) {
		if (!data || !data.values || data.values.length === 0) {
			this.shadowRoot.getElementById('chart-container').innerHTML = 
				'<div class="error">No data available for chart</div>';
			return;
		}

		const container = this.shadowRoot.getElementById('chart-container');
		container.innerHTML = '<canvas id="portfolio-chart"></canvas>';

		// Format labels for chart (simple date strings)
		const formattedLabels = data.labels.map(date => {
			const month = date.getMonth() + 1;
			const day = date.getDate();
			const year = date.getFullYear().toString().slice(-2);
			return `${month}/${day}/${year}`;
		});

		// Import Chart.js dynamically
		import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js').then(() => {
			const ctx = container.querySelector('#portfolio-chart').getContext('2d');
			const isLightMode = this.classList.contains('light-mode');
			const showIndividual = this.shadowRoot.getElementById('show-individual-stocks')?.checked || false;
			const toggleAbsolute = this.shadowRoot.getElementById('toggle-absolute-values');
			const showAbsolute = toggleAbsolute?.classList.contains('active') || false;
			
			// Calculate absolute values if needed
			// We need to recalculate the absolute portfolio values for each timestamp
			let chartData = data.values;
			let individualChartData = {};
			
			if (showAbsolute) {
				// Recalculate absolute values by going through the same calculation as in calculatePortfolioData
				// but storing the absolute currentPortfolioValue instead of percentage
				// For now, we'll use a simpler approach: calculate from percentage using the base value for each timestamp
				// This requires us to recalculate, but for simplicity, we'll use the percentage and convert
				// We need to get the base values for each timestamp
				chartData = [];
				const rangeMap = {
					'1d': '1d',
					'1w': '5d',
					'1m': '1mo',
					'3m': '3mo',
					'1y': '1y',
					'2y': '2y',
					'5y': '5y',
					'10y': '10y',
					'max': 'max'
				};
				const range = rangeMap[this.timeframe] || '1y';
				
				// Recalculate absolute values
				this.calculatePortfolioDataAbsolute(data.labels.map(d => Math.floor(d.getTime() / 1000)), range).then(absoluteData => {
					if (absoluteData) {
						chartData = absoluteData.values;
						individualChartData = absoluteData.individualStocks || {};
						const purchaseEvents = this.preparePurchaseEvents(data.labels, showAbsolute, chartData);
						this.renderChartWithData(chartData, individualChartData, purchaseEvents, showIndividual, showAbsolute, isLightMode, formattedLabels, ctx, container);
					}
				}).catch(err => {
					console.error('Error calculating absolute values:', err);
					// Fallback to percentage-based calculation
					const totalInvestment = this.getTotalInvestment();
					chartData = data.values.map(percent => totalInvestment * (1 + percent / 100));
					const purchaseEvents = this.preparePurchaseEvents(data.labels, showAbsolute, chartData);
					this.renderChartWithData(chartData, {}, purchaseEvents, showIndividual, showAbsolute, isLightMode, formattedLabels, ctx, container);
				});
				return; // Exit early, will render after async calculation
			} else {
				chartData = data.values;
				individualChartData = data.individualStocks || {};
			}
			
			// Prepare purchase events data for markers
			const purchaseEvents = this.preparePurchaseEvents(data.labels, showAbsolute, chartData);
			
			this.renderChartWithData(chartData, individualChartData, purchaseEvents, showIndividual, showAbsolute, isLightMode, formattedLabels, ctx, container);
		}).catch(err => {
			console.error('Error loading Chart.js:', err);
			container.innerHTML = '<div class="error">Error loading chart library</div>';
		});
	}
	
	getRemainingShares(symbol, originalShares, timestamp) {
		// Find portfolio item
		const portfolioItem = this.portfolio.find(item => item.symbol === symbol);
		if (!portfolioItem || !portfolioItem.sales || !Array.isArray(portfolioItem.sales)) {
			return originalShares;
		}
		
		// Calculate total shares sold up to this timestamp
		let totalSold = 0;
		portfolioItem.sales.forEach(sale => {
			const saleTimestamp = Math.floor(sale.date / 1000);
			if (saleTimestamp <= timestamp) {
				totalSold += sale.shares;
			}
		});
		
		// Return remaining shares
		return Math.max(0, originalShares - totalSold);
	}
	
	preparePurchaseEvents(labels, showAbsolute, chartData) {
		// Create arrays to mark purchase and sale events
		const purchaseEventData = new Array(labels.length).fill(null);
		const purchaseEventInfo = new Array(labels.length).fill(null).map(() => null);
		const saleEventData = new Array(labels.length).fill(null);
		const saleEventInfo = new Array(labels.length).fill(null).map(() => null);
		
		// Process all portfolio items (including those that were sold, i.e., with 0 shares)
		// Load from localStorage to include all items (even those with 0 shares)
		const allPortfolioItems = this.loadPortfolio();
		
		allPortfolioItems.forEach(item => {
			// Process purchase events
			if (item.purchaseDate) {
				const purchaseDate = new Date(item.purchaseDate);
				// Find the closest label index
				let closestIndex = -1;
				let minDiff = Infinity;
				
				for (let i = 0; i < labels.length; i++) {
					const diff = Math.abs(labels[i].getTime() - purchaseDate.getTime());
					if (diff < minDiff) {
						minDiff = diff;
						closestIndex = i;
					}
				}
				
				// Only add if within reasonable range
				// For weekly data (10y), use larger tolerance to ensure events are visible
				const maxDiff = 90 * 24 * 60 * 60 * 1000; // 90 days tolerance for weekly data
				if (closestIndex >= 0 && minDiff < maxDiff) {
					const originalShares = item.shares || 0;
					// Calculate total shares purchased (including sold ones)
					let totalPurchasedShares = originalShares;
					if (item.sales && Array.isArray(item.sales)) {
						totalPurchasedShares += item.sales.reduce((sum, sale) => sum + sale.shares, 0);
					}
					
					// Use the actual chart value at this point (portfolio value at purchase time)
					// This ensures events are positioned correctly on the chart line
					let value = chartData[closestIndex] !== null && chartData[closestIndex] !== undefined 
						? chartData[closestIndex] 
						: (showAbsolute ? (item.purchasePrice * totalPurchasedShares) : 0);
					
					// Ensure value is not null or undefined (Chart.js won't display null values)
					if (value === null || value === undefined || isNaN(value)) {
						// Fallback to 0 for percentage view or purchase value for absolute view
						value = showAbsolute ? (item.purchasePrice * totalPurchasedShares) : 0;
					}
					
					// If there's already an event at this index, combine them
					if (purchaseEventData[closestIndex] !== null) {
						// Multiple purchases on same day - use the chart value (portfolio value at this time)
						const chartValue = chartData[closestIndex] !== null && chartData[closestIndex] !== undefined 
							? chartData[closestIndex] 
							: value;
						purchaseEventData[closestIndex] = (chartValue !== null && chartValue !== undefined && !isNaN(chartValue)) 
							? chartValue 
							: value;
						// Ensure purchaseEventInfo[closestIndex] is an array before pushing
						if (!purchaseEventInfo[closestIndex] || !Array.isArray(purchaseEventInfo[closestIndex])) {
							purchaseEventInfo[closestIndex] = [];
						}
						purchaseEventInfo[closestIndex].push({
							symbol: item.symbol,
							date: purchaseDate,
							price: item.purchasePrice,
							shares: totalPurchasedShares,
							value: item.purchasePrice * totalPurchasedShares,
							type: 'purchase'
						});
					} else {
						purchaseEventData[closestIndex] = value;
						purchaseEventInfo[closestIndex] = [{
							symbol: item.symbol,
							date: purchaseDate,
							price: item.purchasePrice,
							shares: totalPurchasedShares,
							value: item.purchasePrice * totalPurchasedShares,
							type: 'purchase'
						}];
					}
				}
			}
			
			// Process sale events
			if (item.sales && Array.isArray(item.sales)) {
				item.sales.forEach(sale => {
					const saleDate = new Date(sale.date);
					// Find the closest label index
					let closestIndex = -1;
					let minDiff = Infinity;
					
					for (let i = 0; i < labels.length; i++) {
						const diff = Math.abs(labels[i].getTime() - saleDate.getTime());
						if (diff < minDiff) {
							minDiff = diff;
							closestIndex = i;
						}
					}
					
					// Only add if within reasonable range
					// For weekly data (10y), use larger tolerance to ensure events are visible
					const maxDiff = 90 * 24 * 60 * 60 * 1000; // 90 days tolerance for weekly data
					if (closestIndex >= 0 && minDiff < maxDiff) {
						// Use the actual chart value at this point (portfolio value at sale time)
						// This ensures events are positioned correctly on the chart line
						let value = chartData[closestIndex] !== null && chartData[closestIndex] !== undefined 
							? chartData[closestIndex] 
							: (showAbsolute ? sale.value : 0);
						
						// If there's already an event at this index, combine them
						if (saleEventData[closestIndex] !== null) {
							// Multiple sales on same day - use the chart value (portfolio value at this time)
							value = chartData[closestIndex] !== null && chartData[closestIndex] !== undefined 
								? chartData[closestIndex] 
								: value;
							saleEventData[closestIndex] = value;
							saleEventInfo[closestIndex].push({
								symbol: item.symbol,
								date: saleDate,
								price: sale.price,
								shares: sale.shares,
								value: sale.value,
								purchasePrice: sale.purchasePrice || item.purchasePrice || null,
								purchaseDate: sale.purchaseDate || item.purchaseDate || null,
								type: 'sale'
							});
						} else {
							saleEventData[closestIndex] = value;
							saleEventInfo[closestIndex] = [{
								symbol: item.symbol,
								date: saleDate,
								price: sale.price,
								shares: sale.shares,
								value: sale.value,
								purchasePrice: sale.purchasePrice || item.purchasePrice || null,
								purchaseDate: sale.purchaseDate || item.purchaseDate || null,
								type: 'sale'
							}];
						}
					}
				});
			}
		});
		
		return { 
			purchases: { data: purchaseEventData, info: purchaseEventInfo },
			sales: { data: saleEventData, info: saleEventInfo }
		};
	}
	
	async calculatePortfolioDataAbsolute(timestamps, range) {
		// Get earliest purchase date to determine correct API range
		const purchaseDates = this.portfolio
			.filter(item => item.purchaseDate)
			.map(item => item.purchaseDate);
		const earliestPurchaseDate = purchaseDates.length > 0 
			? Math.min(...purchaseDates) 
			: Date.now() - (365 * 24 * 60 * 60 * 1000);
		
		// Calculate how many years back we need to go from earliest purchase date
		let apiRange = range;
		if (range === 'max' || range === '10y') {
			const yearsSincePurchase = earliestPurchaseDate 
				? (Date.now() - earliestPurchaseDate) / (365.25 * 24 * 60 * 60 * 1000)
				: 10;
			
			if (yearsSincePurchase > 10) {
				apiRange = 'max'; // Yahoo Finance 'max' should return all available data
			} else if (yearsSincePurchase > 5) {
				apiRange = '10y';
			} else if (yearsSincePurchase > 2) {
				apiRange = '5y';
			} else if (yearsSincePurchase > 1) {
				apiRange = '2y';
			} else {
				apiRange = '1y';
			}
		}
		const promises = this.portfolio.map(item => {
			// Calculate original shares (before any sales) for chart calculation
			const originalShares = (item.shares || 0) + (item.sales && Array.isArray(item.sales) 
				? item.sales.reduce((sum, sale) => sum + sale.shares, 0) 
				: 0);
			
			return fetch(`http://localhost:3000/api/yahoo/chart/${item.symbol}?interval=1d&range=${apiRange}`)
				.then(res => res.json())
				.then(data => ({ 
					symbol: item.symbol, 
					weight: item.weight || 0, 
					purchasePrice: item.purchasePrice || null,
					shares: originalShares, // Use original shares for chart calculation
					currentShares: item.shares || 0, // Current remaining shares
					purchaseDate: item.purchaseDate || null,
					sales: item.sales || [], // Include sales data
					data 
				}))
				.catch(() => ({ 
					symbol: item.symbol, 
					weight: item.weight || 0, 
					purchasePrice: item.purchasePrice || null,
					shares: originalShares,
					currentShares: item.shares || 0,
					purchaseDate: item.purchaseDate || null,
					sales: item.sales || [],
					error: true 
				}));
		});
		
		const results = await Promise.all(promises);
		const validResults = results.filter(r => !r.error && r.data?.chart?.result?.[0]);
		
		if (validResults.length === 0) return null;
		
		const portfolioValues = [];
		const individualStocks = {};
		
		// Calculate absolute portfolio value for each timestamp
		for (let i = 0; i < timestamps.length; i++) {
			const currentTimestamp = timestamps[i];
			let currentPortfolioValue = 0;
			
			validResults.forEach(result => {
				const stockData = result.data.chart.result[0];
				const prices = stockData.indicators?.quote?.[0]?.close || [];
				const originalTimestamps = stockData.timestamp || [];
				
				const originalIndex = originalTimestamps.findIndex(ts => ts === currentTimestamp);
				if (originalIndex === -1 || originalIndex >= prices.length) {
					return;
				}
				
				const resultPurchaseTimestamp = result.purchaseDate 
					? Math.floor(result.purchaseDate / 1000) 
					: null;
				
				if (resultPurchaseTimestamp && currentTimestamp < resultPurchaseTimestamp) {
					return;
				}
				
				if (prices[originalIndex] !== null && prices[originalIndex] !== undefined && !isNaN(prices[originalIndex])) {
					if (result.purchasePrice && result.shares) {
						// Calculate remaining shares at this timestamp
						const remainingShares = this.getRemainingShares(result.symbol, result.shares, currentTimestamp);
						if (resultPurchaseTimestamp && currentTimestamp === resultPurchaseTimestamp) {
							currentPortfolioValue += result.purchasePrice * remainingShares;
						} else {
							currentPortfolioValue += prices[originalIndex] * remainingShares;
						}
					}
				}
			});
			
			portfolioValues.push(currentPortfolioValue);
		}
		
		// Calculate individual stock absolute values
		validResults.forEach(result => {
			const stockData = result.data.chart.result[0];
			const prices = stockData.indicators?.quote?.[0]?.close || [];
			const originalTimestamps = stockData.timestamp || [];
			const resultPurchaseTimestamp = result.purchaseDate 
				? Math.floor(result.purchaseDate / 1000) 
				: null;
			
			if (result.purchasePrice && result.shares && prices.length > 0) {
				const stockValues = [];
				for (let i = 0; i < timestamps.length; i++) {
					const currentTimestamp = timestamps[i];
					const originalIndex = originalTimestamps.findIndex(ts => ts === currentTimestamp);
					
					if (resultPurchaseTimestamp && currentTimestamp < resultPurchaseTimestamp) {
						stockValues.push(null);
						continue;
					}
					
					if (originalIndex !== -1 && originalIndex < prices.length && 
						prices[originalIndex] !== null && prices[originalIndex] !== undefined) {
						// Calculate remaining shares at this timestamp
						const remainingShares = this.getRemainingShares(result.symbol, result.shares, currentTimestamp);
						if (resultPurchaseTimestamp && currentTimestamp === resultPurchaseTimestamp) {
							stockValues.push(result.purchasePrice * remainingShares);
						} else {
							stockValues.push(prices[originalIndex] * remainingShares);
						}
					} else {
						stockValues.push(null);
					}
				}
				individualStocks[result.symbol] = {
					values: stockValues,
					weight: result.weight || 0
				};
			}
		});
		
		return {
			values: portfolioValues,
			individualStocks: individualStocks
		};
	}
	
	renderChartWithData(chartData, individualChartData, purchaseEvents, showIndividual, showAbsolute, isLightMode, formattedLabels, ctx, container) {
			// Generate colors for individual stocks
			const stockColors = [
				'#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
				'#ec4899', '#14b8a6', '#f97316', '#6366f1', '#a855f7',
				'#22c55e', '#eab308', '#3b82f6', '#06b6d4', '#f43f5e'
			];
			
			// Build datasets
			const datasets = [{
			label: showAbsolute ? 'Portfolio Value ($)' : 'Portfolio Performance (%)',
			data: chartData,
				borderColor: '#4ea1f3',
				backgroundColor: 'rgba(78, 161, 243, 0.1)',
				borderWidth: 3,
				fill: true,
				tension: 0.3,
			pointRadius: 0,
			pointHoverRadius: 5
		}];
		
		// Add zero line (baseline) only for percentage view
		if (!showAbsolute) {
			datasets.push({
				label: 'Baseline (0%)',
				data: new Array(chartData.length).fill(0),
				borderColor: '#6b7280',
				backgroundColor: 'transparent',
				borderWidth: 1,
				borderDash: [5, 5],
				fill: false,
				pointRadius: 0,
				pointHoverRadius: 0
			});
		}
			
			// Add individual stock lines if checkbox is checked
		if (showIndividual && individualChartData && Object.keys(individualChartData).length > 0) {
				let colorIndex = 0;
			Object.keys(individualChartData).forEach(symbol => {
				const stockData = individualChartData[symbol];
				
					datasets.push({
						label: `${symbol} (${stockData.weight.toFixed(1)}%)`,
						data: stockData.values,
						borderColor: stockColors[colorIndex % stockColors.length],
						backgroundColor: 'transparent',
						borderWidth: 1.5,
						fill: false,
						tension: 0.3,
						pointRadius: 0,
						borderDash: [5, 5]
					});
					colorIndex++;
				});
			}
		
		// Add purchase events as markers (green)
		if (purchaseEvents && purchaseEvents.purchases && purchaseEvents.purchases.data) {
			datasets.push({
				label: 'Purchase Events',
				data: purchaseEvents.purchases.data,
				borderColor: '#10b981',
				backgroundColor: '#10b981',
				borderWidth: 2,
				pointRadius: 6,
				pointHoverRadius: 8,
				pointStyle: 'circle',
				showLine: false,
				order: 0 // Show on top
			});
		}
		
		// Add sale events as markers (red)
		if (purchaseEvents && purchaseEvents.sales && purchaseEvents.sales.data) {
			datasets.push({
				label: 'Sale Events',
				data: purchaseEvents.sales.data,
				borderColor: '#ef4444',
				backgroundColor: '#ef4444',
				borderWidth: 2,
				pointRadius: 6,
				pointHoverRadius: 8,
				pointStyle: 'circle',
				showLine: false,
				order: 0 // Show on top
				});
			}
			
			// Destroy existing chart if it exists
			if (this.portfolioChart) {
				this.portfolioChart.destroy();
			}
			
			this.portfolioChart = new Chart(ctx, {
				type: 'line',
				data: {
					labels: formattedLabels,
					datasets: datasets
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: true,
						position: 'top',
							labels: {
							color: isLightMode ? '#0a0a0a' : '#e6edf3',
							font: {
								size: 12
							},
							filter: (item) => {
								// Hide baseline from legend
								if (item.text === 'Baseline (0%)') {
									return false;
								}
								return true;
							}
							}
						},
						tooltip: {
							mode: 'index',
						intersect: false,
						callbacks: {
							label: (context) => {
								// Special handling for purchase events
								if (context.dataset.label === 'Purchase Events' && purchaseEvents && purchaseEvents.purchases && purchaseEvents.purchases.info) {
									const events = purchaseEvents.purchases.info[context.dataIndex];
									if (events && Array.isArray(events) && events.length > 0) {
										// Multiple purchases possible on same day
										const labels = [];
										events.forEach((event, idx) => {
											if (idx > 0) labels.push('---');
											labels.push(
												`🟢 Purchase: ${event.symbol}`,
												`Date: ${event.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`,
												`Purchase Price: ${this.formatCurrency(event.price)}`,
												`Shares: ${this.formatNumber(event.shares, 2)}`,
												`Total Investment: ${this.formatCurrency(event.value)}`
											);
										});
										return labels;
									}
								}
								
								// Special handling for sale events
								if (context.dataset.label === 'Sale Events' && purchaseEvents && purchaseEvents.sales && purchaseEvents.sales.info) {
									const events = purchaseEvents.sales.info[context.dataIndex];
									if (events && Array.isArray(events) && events.length > 0) {
										// Multiple sales possible on same day
										const labels = [];
										events.forEach((event, idx) => {
											if (idx > 0) labels.push('---');
											
											// Calculate profit/loss if purchase price is available
											let profitLossInfo = [];
											if (event.purchasePrice && event.price) {
												const profitLossAbsolute = (event.price - event.purchasePrice) * event.shares;
												const profitLossPercent = ((event.price - event.purchasePrice) / event.purchasePrice) * 100;
												const profitLossSign = profitLossAbsolute >= 0 ? '+' : '';
												const profitLossClass = profitLossAbsolute >= 0 ? 'positive' : 'negative';
												
												profitLossInfo = [
													`Purchase Price: ${this.formatCurrency(event.purchasePrice)}`,
													`Sale Price: ${this.formatCurrency(event.price)}`,
													`P/L: ${profitLossSign}${this.formatCurrency(profitLossAbsolute)} (${profitLossSign}${this.formatNumber(profitLossPercent, 2)}%)`
												];
											}
											
											labels.push(
												`🔴 Sale: ${event.symbol}`,
												`Date: ${event.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`,
												...profitLossInfo,
												`Shares Sold: ${this.formatNumber(event.shares, 2)}`,
												`Sale Value: ${this.formatCurrency(event.value)}`
											);
										});
										return labels;
									}
								}
								
								let label = context.dataset.label || '';
								if (label) {
									label += ': ';
								}
								if (showAbsolute) {
									label += this.formatCurrency(context.parsed.y);
								} else {
									label += context.parsed.y.toFixed(2) + '%';
								}
								return label;
							}
						}
						}
					},
					scales: {
						x: {
							ticks: {
								color: isLightMode ? '#0a0a0a' : '#9fb0c0',
								maxTicksLimit: 10
							},
							grid: {
								color: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)'
							}
						},
						y: {
						beginAtZero: showAbsolute ? false : true,
							ticks: {
								color: isLightMode ? '#0a0a0a' : '#9fb0c0',
							callback: (value) => {
								if (showAbsolute) {
									return this.formatCurrency(value);
								}
									return value.toFixed(0) + '%';
								}
							},
							grid: {
								color: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)'
							}
						}
					}
				}
		});
	}

	async loadMetrics() {
		const grid = this.shadowRoot.getElementById('metrics-grid');
		if (this.portfolio.length === 0) {
			grid.innerHTML = '<div class="empty-state">Add stocks to calculate metrics</div>';
			return;
		}

		grid.innerHTML = '<div class="loading">Calculating metrics...</div>';

		try {
			const rangeMap = {
				'1d': '1d',
				'1w': '5d',
				'1m': '1mo',
				'3m': '3mo',
				'1y': '1y',
				'2y': '2y',
				'5y': '5y',
				'10y': '10y',
				'max': 'max'
			};
			const range = rangeMap[this.timeframe] || '1y';
			
			// Get earliest purchase date to determine correct API range
			const purchaseDates = this.portfolio
				.filter(item => item.purchaseDate)
				.map(item => item.purchaseDate);
			const earliestPurchaseDate = purchaseDates.length > 0 
				? Math.min(...purchaseDates) 
				: Date.now() - (365 * 24 * 60 * 60 * 1000);
			
			// Calculate how many years back we need to go from earliest purchase date
			let apiRange = range;
			if (range === 'max' || range === '10y') {
				const yearsSincePurchase = earliestPurchaseDate 
					? (Date.now() - earliestPurchaseDate) / (365.25 * 24 * 60 * 60 * 1000)
					: 10;
				
				if (yearsSincePurchase > 10) {
					apiRange = 'max'; // Yahoo Finance 'max' should return all available data
				} else if (yearsSincePurchase > 5) {
					apiRange = '10y';
				} else if (yearsSincePurchase > 2) {
					apiRange = '5y';
				} else if (yearsSincePurchase > 1) {
					apiRange = '2y';
				} else {
					apiRange = '1y';
				}
			}

			// Fetch data for all stocks
			const promises = this.portfolio.map(item => 
				fetch(`http://localhost:3000/api/yahoo/chart/${item.symbol}?interval=1d&range=${apiRange}`)
					.then(res => res.json())
				.then(data => ({ 
					symbol: item.symbol, 
					weight: item.weight || 0, 
					purchasePrice: item.purchasePrice || null,
					shares: item.shares || null,
					data 
				}))
				.catch(() => ({ 
					symbol: item.symbol, 
					weight: item.weight || 0, 
					purchasePrice: item.purchasePrice || null,
					shares: item.shares || null,
					error: true 
				}))
			);

			const results = await Promise.all(promises);
			const validResults = results.filter(r => !r.error && r.data?.chart?.result?.[0]);

			// Calculate portfolio metrics
			const metrics = await this.calculatePortfolioMetrics(validResults);
			this.renderMetrics(metrics);

		} catch (error) {
			console.error('Error loading metrics:', error);
			grid.innerHTML = `<div class="error">Error calculating metrics: ${error.message}</div>`;
		}
	}

	async calculatePortfolioMetrics(results) {
		if (results.length === 0) return null;

		// Calculate actual portfolio value and returns based on purchase price and shares
		let totalInvestment = 0;
		let currentPortfolioValue = 0;
		let totalReturn = 0;
		let totalWeight = 0;
		const returns = [];

		results.forEach(result => {
			const stockData = result.data.chart.result[0];
			const prices = stockData.indicators?.quote?.[0]?.close || [];
			
			if (result.purchasePrice && result.shares && prices.length >= 1) {
				// Use actual purchase price and shares
				const investment = result.purchasePrice * result.shares;
				const currentPrice = prices[prices.length - 1];
				const currentValue = currentPrice * result.shares;
				const stockReturn = ((currentPrice - result.purchasePrice) / result.purchasePrice) * 100;
				
				totalInvestment += investment;
				currentPortfolioValue += currentValue;
				totalReturn += stockReturn * (investment / (totalInvestment || 1));
				returns.push({ return: stockReturn, weight: investment / (totalInvestment || 1) });
			} else if (prices.length >= 2 && result.weight) {
				// Fallback to weight-based calculation
				const startPrice = prices[0];
				const endPrice = prices[prices.length - 1];
				const stockReturn = ((endPrice - startPrice) / startPrice) * 100;
				totalReturn += stockReturn * (result.weight / 100);
				totalWeight += result.weight / 100;
				returns.push({ return: stockReturn, weight: result.weight / 100 });
			}
		});
		
		// Calculate overall portfolio return
		if (totalInvestment > 0) {
			totalReturn = ((currentPortfolioValue - totalInvestment) / totalInvestment) * 100;
		} else if (totalWeight > 0) {
			totalReturn = totalReturn / totalWeight;
		}

		// Calculate portfolio volatility (weighted)
		const portfolioReturns = [];
		const portfolioValues = [];

		// Get aligned returns for all stocks
		const minLength = Math.min(...results.map(r => {
			const prices = r.data.chart.result[0].indicators?.quote?.[0]?.close || [];
			return prices.length;
		}));

		for (let i = 1; i < minLength; i++) {
			let weightedReturn = 0;
			let totalW = 0;
			let portfolioValue = 0;
			
			results.forEach(result => {
				const prices = result.data.chart.result[0].indicators?.quote?.[0]?.close || [];
				if (prices[i] && prices[i-1]) {
					const dailyReturn = (prices[i] - prices[i-1]) / prices[i-1];
					weightedReturn += dailyReturn * (result.weight / 100);
					totalW += result.weight / 100;
					
					// Calculate portfolio value (normalized to start = 100)
					const basePrice = prices[0] || 1;
					const normalizedPrice = (prices[i] / basePrice) * 100;
					portfolioValue += normalizedPrice * (result.weight / 100);
				}
			});
			
			if (totalW > 0) {
				portfolioReturns.push(weightedReturn / totalW);
				portfolioValues.push(portfolioValue / totalW * 100);
			}
		}

		// Calculate volatility
		const meanReturn = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
		const variance = portfolioReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / portfolioReturns.length;
		const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized

		// Calculate Max Drawdown
		let maxDrawdown = 0;
		let peak = portfolioValues[0] || 100;
		for (let i = 0; i < portfolioValues.length; i++) {
			if (portfolioValues[i] > peak) {
				peak = portfolioValues[i];
			}
			const drawdown = ((peak - portfolioValues[i]) / peak) * 100;
			if (drawdown > maxDrawdown) {
				maxDrawdown = drawdown;
			}
		}

		// Calculate VaR (95% confidence)
		const sortedReturns = [...portfolioReturns].sort((a, b) => a - b);
		const var95Index = Math.floor(sortedReturns.length * 0.05);
		const var95 = Math.abs(sortedReturns[var95Index] || 0) * 100;

		// Calculate Beta (fetch S&P 500 data)
		let beta = 1.0;
		try {
			const rangeMap = {
				'1d': '1d',
				'1w': '5d',
				'1m': '1mo',
				'3m': '3mo',
				'1y': '1y',
				'2y': '2y',
				'5y': '5y',
				'10y': '10y',
				'max': 'max'
			};
			const range = rangeMap[this.timeframe] || '1y';
			
			// Get earliest purchase date to determine correct API range
			const purchaseDates = this.portfolio
				.filter(item => item.purchaseDate)
				.map(item => item.purchaseDate);
			const earliestPurchaseDate = purchaseDates.length > 0 
				? Math.min(...purchaseDates) 
				: Date.now() - (365 * 24 * 60 * 60 * 1000);
			
			// Calculate how many years back we need to go from earliest purchase date
			let apiRange = range;
			if (range === 'max' || range === '10y') {
				const yearsSincePurchase = earliestPurchaseDate 
					? (Date.now() - earliestPurchaseDate) / (365.25 * 24 * 60 * 60 * 1000)
					: 10;
				
				if (yearsSincePurchase > 10) {
					apiRange = 'max'; // Yahoo Finance 'max' should return all available data
				} else if (yearsSincePurchase > 5) {
					apiRange = '10y';
				} else if (yearsSincePurchase > 2) {
					apiRange = '5y';
				} else if (yearsSincePurchase > 1) {
					apiRange = '2y';
				} else {
					apiRange = '1y';
				}
			}
			
			const sp500Response = await fetch(`http://localhost:3000/api/yahoo/chart/^GSPC?interval=1d&range=${apiRange}`);
			if (sp500Response.ok) {
				const sp500Data = await sp500Response.json();
				const sp500Prices = sp500Data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
				if (sp500Prices.length >= 2) {
					const sp500Returns = [];
					for (let i = 1; i < Math.min(sp500Prices.length, minLength); i++) {
						if (sp500Prices[i] && sp500Prices[i-1]) {
							sp500Returns.push((sp500Prices[i] - sp500Prices[i-1]) / sp500Prices[i-1]);
						}
					}
					
					// Calculate beta
					const alignedReturns = portfolioReturns.slice(0, sp500Returns.length);
					const sp500Mean = sp500Returns.reduce((a, b) => a + b, 0) / sp500Returns.length;
					const portfolioMean = alignedReturns.reduce((a, b) => a + b, 0) / alignedReturns.length;
					
					let covariance = 0;
					let marketVariance = 0;
					for (let i = 0; i < alignedReturns.length; i++) {
						covariance += (alignedReturns[i] - portfolioMean) * (sp500Returns[i] - sp500Mean);
						marketVariance += Math.pow(sp500Returns[i] - sp500Mean, 2);
					}
					
					if (marketVariance > 0) {
						beta = covariance / marketVariance;
					}
				}
			}
		} catch (e) {
			console.warn('Could not calculate Beta:', e);
		}

		// Calculate Sharpe Ratio
		const riskFreeRate = 0.02; // 2% assumed
		const portfolioReturn = totalInvestment > 0 ? totalReturn / 100 : (totalWeight > 0 ? totalReturn / totalWeight / 100 : 0);
		const sharpeRatio = volatility > 0 ? (portfolioReturn - riskFreeRate) / (volatility / 100) : 0;

		// Calculate Sortino Ratio (downside deviation)
		const downsideReturns = portfolioReturns.filter(r => r < 0);
		const downsideVariance = downsideReturns.length > 0 
			? downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length 
			: 0;
		const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(252) * 100;
		const sortinoRatio = downsideDeviation > 0 ? (portfolioReturn - riskFreeRate) / (downsideDeviation / 100) : 0;

		// Calculate Win Rate (days with positive returns)
		const positiveDays = portfolioReturns.filter(r => r > 0).length;
		const winRate = (positiveDays / portfolioReturns.length) * 100;

		return {
			totalReturn,
			totalInvestment,
			currentPortfolioValue,
			volatility,
			beta,
			sharpeRatio,
			sortinoRatio,
			maxDrawdown,
			var95,
			winRate,
			numStocks: results.length
		};
	}

	renderMetrics(metrics) {
		if (!metrics) {
			this.shadowRoot.getElementById('metrics-grid').innerHTML = 
				'<div class="error">Unable to calculate metrics</div>';
			return;
		}

		const isLightMode = this.classList.contains('light-mode');
		const returnClass = metrics.totalReturn >= 0 ? 'positive' : 'negative';
		const sharpeClass = metrics.sharpeRatio >= 1 ? 'positive' : metrics.sharpeRatio >= 0.5 ? 'neutral' : 'negative';
		const sortinoClass = metrics.sortinoRatio >= 1 ? 'positive' : metrics.sortinoRatio >= 0.5 ? 'neutral' : 'negative';
		const betaClass = metrics.beta > 1.2 ? 'negative' : metrics.beta < 0.8 ? 'neutral' : 'positive';
		const drawdownClass = metrics.maxDrawdown < 10 ? 'positive' : metrics.maxDrawdown < 20 ? 'neutral' : 'negative';
		const varClass = metrics.var95 < 2 ? 'positive' : metrics.var95 < 5 ? 'neutral' : 'negative';
		const winRateClass = metrics.winRate >= 55 ? 'positive' : metrics.winRate >= 45 ? 'neutral' : 'negative';

		this.shadowRoot.getElementById('metrics-grid').innerHTML = `
			<div class="metric-card">
				<div class="metric-label">Total Investment</div>
				<div class="metric-value">$${metrics.totalInvestment ? metrics.totalInvestment.toFixed(2) : 'N/A'}</div>
			</div>
			<div class="metric-card">
				<div class="metric-label">Current Portfolio Value</div>
				<div class="metric-value ${returnClass}">$${metrics.currentPortfolioValue ? metrics.currentPortfolioValue.toFixed(2) : 'N/A'}</div>
			</div>
			<div class="metric-card">
				<div class="metric-label">Total Return</div>
				<div class="metric-value ${returnClass}">${metrics.totalReturn.toFixed(2)}%</div>
			</div>
			<div class="metric-card">
				<div class="metric-label">Volatility (Annualized)</div>
				<div class="metric-value">${metrics.volatility.toFixed(2)}%</div>
			</div>
			<div class="metric-card">
				<div class="metric-label">Beta (vs. S&P 500)</div>
				<div class="metric-value ${betaClass}">${metrics.beta.toFixed(2)}</div>
			</div>
			<div class="metric-card">
				<div class="metric-label">Sharpe Ratio</div>
				<div class="metric-value ${sharpeClass}">${metrics.sharpeRatio.toFixed(2)}</div>
			</div>
			<div class="metric-card">
				<div class="metric-label">Sortino Ratio</div>
				<div class="metric-value ${sortinoClass}">${metrics.sortinoRatio.toFixed(2)}</div>
			</div>
			<div class="metric-card">
				<div class="metric-label">Max Drawdown</div>
				<div class="metric-value ${drawdownClass}">${metrics.maxDrawdown.toFixed(2)}%</div>
			</div>
			<div class="metric-card">
				<div class="metric-label">Value at Risk (95%)</div>
				<div class="metric-value ${varClass}">${metrics.var95.toFixed(2)}%</div>
			</div>
			<div class="metric-card">
				<div class="metric-label">Win Rate</div>
				<div class="metric-value ${winRateClass}">${metrics.winRate.toFixed(1)}%</div>
			</div>
			<div class="metric-card">
				<div class="metric-label">Number of Holdings</div>
				<div class="metric-value">${metrics.numStocks}</div>
			</div>
		`;
	}

	renderPieChart() {
		const container = this.shadowRoot.getElementById('pie-chart-container');
		if (!container) return;

		// Filter out stocks with 0 shares (sold stocks)
		const activeStocks = this.portfolio.filter(item => (item.shares || 0) > 0);

		// Update container HTML
		if (activeStocks.length === 0) {
			container.innerHTML = '<div class="empty-chart-message">No active stocks in portfolio</div>';
			if (this.pieChart) {
				this.pieChart.destroy();
				this.pieChart = null;
			}
			return;
		}

		container.innerHTML = '<canvas id="portfolio-pie-chart"></canvas>';

		// Wait for Chart.js to be available
		if (typeof window.Chart === 'undefined') {
			// Chart.js is loaded in index.html, but might not be ready yet
			setTimeout(() => this.renderPieChart(), 100);
			return;
		}

		const canvas = container.querySelector('#portfolio-pie-chart');
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		const isLightMode = this.classList.contains('light-mode');

		// Generate colors for each stock
		const colors = [
			'#4ea1f3', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
			'#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
			'#a855f7', '#22c55e', '#eab308', '#3b82f6', '#06b6d4'
		];

		// Prepare data - only include active stocks (shares > 0)
		const labels = activeStocks.map(item => item.symbol);
		const data = activeStocks.map(item => item.weight || 0);
		const backgroundColors = activeStocks.map((_, index) => colors[index % colors.length]);
		const borderColors = isLightMode ? '#a0aab8' : '#1f2a37';

		// Destroy existing chart if it exists
		if (this.pieChart) {
			this.pieChart.destroy();
		}

		this.pieChart = new Chart(ctx, {
			type: 'pie',
			data: {
				labels: labels,
				datasets: [{
					data: data,
					backgroundColor: backgroundColors,
					borderColor: borderColors,
					borderWidth: 2
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				aspectRatio: 1,
				plugins: {
					legend: {
						display: true,
						position: 'bottom',
						labels: {
							color: isLightMode ? '#0a0a0a' : '#9fb0c0',
							font: {
								size: 11
							},
							padding: 8,
							usePointStyle: true
						}
					},
					tooltip: {
						callbacks: {
							label: (context) => {
								const label = context.label || '';
								const value = context.parsed || 0;
								return `${label}: ${value.toFixed(2)}%`;
							}
						}
					}
				}
			}
		});
	}

	renderPieChart() {
		const container = this.shadowRoot.getElementById('pie-chart-container');
		if (!container) return;

		// Filter out stocks with 0 shares (sold stocks)
		const activeStocks = this.portfolio.filter(item => (item.shares || 0) > 0);

		// Update container HTML
		if (activeStocks.length === 0) {
			container.innerHTML = '<div class="empty-chart-message">No active stocks in portfolio</div>';
			if (this.pieChart) {
				this.pieChart.destroy();
				this.pieChart = null;
			}
			return;
		}

		container.innerHTML = '<canvas id="portfolio-pie-chart"></canvas>';

		// Wait for Chart.js to be available
		if (typeof window.Chart === 'undefined') {
			// Chart.js is loaded in index.html, but might not be ready yet
			setTimeout(() => this.renderPieChart(), 100);
			return;
		}

		const canvas = container.querySelector('#portfolio-pie-chart');
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		const isLightMode = this.classList.contains('light-mode');

		// Generate colors for each stock
		const colors = [
			'#4ea1f3', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
			'#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
			'#a855f7', '#22c55e', '#eab308', '#3b82f6', '#06b6d4'
		];

		// Prepare data - only include active stocks (shares > 0)
		const labels = activeStocks.map(item => item.symbol);
		const data = activeStocks.map(item => item.weight || 0);
		const backgroundColors = activeStocks.map((_, index) => colors[index % colors.length]);
		const borderColors = isLightMode ? '#a0aab8' : '#1f2a37';

		// Destroy existing chart if it exists
		if (this.pieChart) {
			this.pieChart.destroy();
		}

		this.pieChart = new Chart(ctx, {
			type: 'pie',
			data: {
				labels: labels,
				datasets: [{
					data: data,
					backgroundColor: backgroundColors,
					borderColor: borderColors,
					borderWidth: 2
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				aspectRatio: 1,
				plugins: {
					legend: {
						display: true,
						position: 'bottom',
						labels: {
							color: isLightMode ? '#0a0a0a' : '#9fb0c0',
							font: {
								size: 11
							},
							padding: 8,
							usePointStyle: true
						}
					},
					tooltip: {
						callbacks: {
							label: (context) => {
								const label = context.label || '';
								const value = context.parsed || 0;
								return `${label}: ${value.toFixed(2)}%`;
							}
						}
					}
				}
			}
		});
	}
	
	setupAutocomplete(inputId, dropdownId) {
		const input = this.shadowRoot.getElementById(inputId);
		const dropdown = this.shadowRoot.getElementById(dropdownId);
		
		if (!input || !dropdown) return;
		
		let debounceTimer = null;
		let selectedIndex = -1;
		
		// Input event for typing
		input.addEventListener('input', (e) => {
			const query = e.target.value.trim();
			
			if (debounceTimer) clearTimeout(debounceTimer);
			selectedIndex = -1;
			
			if (query.length < 1) {
				this.hideAutocomplete(dropdown);
				return;
			}
			
			dropdown.innerHTML = '<div class="autocomplete-loading">Searching...</div>';
			dropdown.classList.add('show');
			
			debounceTimer = setTimeout(() => {
				this.searchStockSymbols(query, dropdown, input);
			}, 300);
		});
		
		// Keyboard navigation
		input.addEventListener('keydown', (e) => {
			const items = dropdown.querySelectorAll('.autocomplete-item');
			
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
				this.updateAutocompleteSelection(items, selectedIndex);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				this.updateAutocompleteSelection(items, selectedIndex);
			} else if (e.key === 'Enter') {
				e.preventDefault();
				if (selectedIndex >= 0 && items[selectedIndex]) {
					const symbol = items[selectedIndex].dataset.symbol;
					input.value = symbol;
					this.hideAutocomplete(dropdown);
				} else {
					// Only allow if a suggestion is selected
					const symbol = input.value.trim().toUpperCase();
					if (this.validSymbols.has(symbol)) {
						// Symbol is valid, allow it
					} else {
						alert('Please select a stock from the suggestions.');
					}
				}
			} else if (e.key === 'Escape') {
				this.hideAutocomplete(dropdown);
			}
		});
		
		// Close dropdown when clicking outside
		document.addEventListener('click', (e) => {
			if (!input.contains(e.target) && !dropdown.contains(e.target)) {
				this.hideAutocomplete(dropdown);
			}
		});
	}
	
	async searchStockSymbols(query, dropdown, input) {
		if (!dropdown) return;
		
		try {
			const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
			
			if (!response.ok) {
				dropdown.innerHTML = `<div class="autocomplete-empty">Server error (${response.status})</div>`;
				return;
			}
			
			const data = await response.json();
			const results = data.results || [];
			
			if (results.length === 0) {
				dropdown.innerHTML = '<div class="autocomplete-empty">No results found</div>';
				return;
			}
			
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
				</div>
			`).join('');
			
			// Add click handlers
			dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
				item.addEventListener('click', () => {
					const symbol = item.dataset.symbol;
					input.value = symbol;
					this.hideAutocomplete(dropdown);
				});
			});
			
		} catch (error) {
			console.error('[Autocomplete] Error:', error);
			if (error.name === 'TypeError' && error.message.includes('fetch')) {
				dropdown.innerHTML = '<div class="autocomplete-empty">Backend not available</div>';
			} else {
				dropdown.innerHTML = `<div class="autocomplete-empty">Connection error</div>`;
			}
		}
	}
	
	updateAutocompleteSelection(items, selectedIndex) {
		items.forEach((item, i) => {
			item.classList.toggle('selected', i === selectedIndex);
		});
		if (items[selectedIndex]) {
			items[selectedIndex].scrollIntoView({ block: 'nearest' });
		}
	}
	
	hideAutocomplete(dropdown) {
		if (dropdown) {
			dropdown.classList.remove('show');
			dropdown.innerHTML = '';
		}
	}
}


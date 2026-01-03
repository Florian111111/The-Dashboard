# Stock Analysis Platform

A comprehensive stock analysis platform with market overview, technical indicators, fundamentals, and SWOT analysis.

## Features

- **Market Overview**: Real-time data for major indices (S&P 500, DAX, Nikkei, etc.) and macroeconomic indicators (VIX, Treasury Yields, Gold, etc.)
- **Stock Analysis**: Detailed analysis with price charts, technical indicators, fundamentals, and AI-powered SWOT analysis
- **Technical Indicators**: SMA, EMA, RSI, MACD, Bollinger Bands, Stochastic, Williams %R
- **Fundamentals**: Comprehensive financial data including P/E ratios, margins, cashflow, balance sheet, and more
- **SWOT Analysis**: AI-generated SWOT analysis using Google Gemini
- **Latest News**: X/Twitter embeds showing company official account timeline and stock discussion (no API key needed)

## Quick Start

### Option 1: Start Both Backends at Once (Recommended - Easiest)

**Prerequisites**: 
- Install Node.js from https://nodejs.org/ (LTS version)
- Install Python from https://www.python.org/downloads/ (3.8+)

**On Windows, simply double-click:** `START_ALL.bat`

This will:
- ✅ Check if Node.js and Python are installed
- ✅ Install dependencies automatically (first time only)
- ✅ Start both backends in separate windows
- ✅ Open your browser automatically

**Backends:**
- **Node.js (Port 3000)**: Handles Yahoo Finance Chart API and FRED API
- **Python (Port 3001)**: Handles Fundamentals using Finnhub API

**X/Twitter News Feature:**
- Uses official Twitter/X embed widgets (free, no API key needed)
- Shows company official account timeline and stock discussion
- Fully compliant with Twitter Terms of Service

### Option 2: Start Backends Separately

**Start Node.js Backend** (for Charts and FRED API):
   ```bash
   npm install
   npm start
   ```
   **Or on Windows, double-click:** `START_EXPRESS.bat`
   
   This runs on `http://localhost:3000`

**Start Python Backend** (for Fundamentals using yfinance):
   ```bash
   pip install -r requirements.txt
   python python_backend.py
   ```
   **Or on Windows, double-click:** `START_PYTHON_BACKEND.bat`
   
   This runs on `http://localhost:3001`

Then open your browser and visit: `http://localhost:3000`

### Option 2: Node.js Only (Limited Fundamentals)

**Prerequisites**: Install Node.js from https://nodejs.org/ (LTS version)

1. Install dependencies (first time only):
```bash
npm install
```

2. Start the Express proxy server:
```bash
npm start
```

**Or on Windows, simply double-click:** `START_EXPRESS.bat`

3. Open your browser and visit: `http://localhost:3000`

**Note**: Fundamentals may be limited without the Python backend.

### Option 2: Static Server (May have CORS issues in some browsers)

**On Windows, double-click:** `START_SERVER.bat`

**Or manually:**
```bash
# Python
python -m http.server 8000
# Node
npx serve . -l 8000 --single
```

Visit `http://localhost:8000`.

**Note**: Some browsers (like Edge with Tracking Prevention) may block external API requests. Using the Express backend (Option 1) solves this.

## API Keys

The FRED API key is pre-configured. For SWOT analysis, the Gemini API key is hardcoded in the application.

- **FRED API**: Pre-configured (for macroeconomic data)
- **Gemini API**: Pre-configured (for SWOT analysis)
- **Yahoo Finance**: No API key required (free public API)

## Project Structure

```
├── server.js              # Express proxy server
├── package.json           # Node.js dependencies
├── index.html            # Main HTML file
├── styles.css            # Global styles
├── src/
│   ├── app.js            # Main application router
│   ├── pages/            # Page components
│   │   ├── MarketOverview.js
│   │   ├── StockAnalysis.js
│   │   └── IndicatorDetail.js
│   ├── components/       # UI components
│   │   ├── StockChart.js
│   │   ├── StockIndicators.js
│   │   ├── StockFundamentals.js
│   │   ├── StockMacro.js
│   │   └── StockSwot.js
│   └── utils/            # Utility functions
│       ├── proxy.js      # Proxy utility
│       ├── storage.js    # LocalStorage helpers
│       └── indicators.js # Technical indicator calculations
```

## API Endpoints (Express Backend)

- `GET /api/yahoo/chart/:symbol?interval=1d&range=1y` - Yahoo Finance chart data
- `GET /api/yahoo/quoteSummary/:symbol?modules=...` - Yahoo Finance fundamentals
- `GET /api/fred/observations?series_id=...&api_key=...` - FRED economic data

## Notes

- All external API calls go through the Express backend to avoid CORS issues
- Data is cached in memory for better performance
- SWOT analysis uses Google Gemini AI (free tier)
- Technical indicators are calculated client-side

"""
Python FastAPI Backend for Stock Fundamentals using Finnhub API
Runs on port 3001
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import requests
import time
import re
import json
from datetime import datetime, timedelta
import os
import logging
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
import xml.etree.ElementTree as ET

# Load environment variables from .env file
load_dotenv()

# ===========================================
# Environment Variables Validation
# ===========================================

def check_environment_variables():
    """
    Check all required and optional environment variables.
    Prints a status report to console on startup.
    """
    print("\n" + "=" * 60)
    print("🔧 PYTHON BACKEND - ENVIRONMENT VARIABLES CHECK")
    print("=" * 60)
    
    errors = []
    warnings = []
    
    # Required API Keys
    required_vars = {
        "FINNHUB_API_KEY": os.getenv("FINNHUB_API_KEY"),
    }
    
    # Optional but recommended API Keys
    optional_vars = {
        "GOOGLE_API_KEY": os.getenv("GOOGLE_API_KEY"),
        "FRED_API_KEY": os.getenv("FRED_API_KEY"),
    }
    
    # Server Configuration
    config_vars = {
        "ENVIRONMENT": os.getenv("ENVIRONMENT", "development"),
        "NODE_ENV": os.getenv("NODE_ENV", "production"),
        "NODE_PORT": os.getenv("NODE_PORT", "3000"),
        "PYTHON_PORT": os.getenv("PYTHON_PORT", "3001"),
    }
    
    # Rate Limiting
    rate_limit_vars = {
        "SESSION_DURATION": os.getenv("SESSION_DURATION", "300"),
        "COOLDOWN_DURATION": os.getenv("COOLDOWN_DURATION", "300"),
        "RATE_LIMIT_REQUESTS": os.getenv("RATE_LIMIT_REQUESTS", "100"),
        "RATE_LIMIT_WINDOW": os.getenv("RATE_LIMIT_WINDOW", "60"),
    }
    
    # Feature Flags
    feature_vars = {
        "USE_YFINANCE_EXTRAS": os.getenv("USE_YFINANCE_EXTRAS", "false"),
    }
    
    # Check required variables
    print("\n📋 REQUIRED API KEYS:")
    for var, value in required_vars.items():
        if value:
            # Show first 10 chars only for security
            masked = value[:10] + "..." if len(value) > 10 else value
            print(f"   ✅ {var} = {masked}")
        else:
            print(f"   ❌ {var} = NOT SET")
            errors.append(f"{var} is required but not set!")
    
    # Check optional variables
    print("\n📋 OPTIONAL API KEYS:")
    for var, value in optional_vars.items():
        if value:
            masked = value[:10] + "..." if len(value) > 10 else value
            print(f"   ✅ {var} = {masked}")
        else:
            print(f"   ⚠️  {var} = NOT SET")
            warnings.append(f"{var} is not set. Some features may be disabled.")
    
    # Show server configuration
    print("\n📋 SERVER CONFIGURATION:")
    for var, value in config_vars.items():
        print(f"   ℹ️  {var} = {value}")
    
    # Show rate limiting
    print("\n📋 RATE LIMITING:")
    for var, value in rate_limit_vars.items():
        print(f"   ℹ️  {var} = {value}")
    
    # Show feature flags
    print("\n📋 FEATURE FLAGS:")
    for var, value in feature_vars.items():
        print(f"   ℹ️  {var} = {value}")
    
    # Summary
    print("\n" + "-" * 60)
    if errors:
        print("❌ ERRORS FOUND:")
        for error in errors:
            print(f"   • {error}")
    
    if warnings:
        print("⚠️  WARNINGS:")
        for warning in warnings:
            print(f"   • {warning}")
    
    if not errors and not warnings:
        print("✅ All environment variables are properly configured!")
    elif not errors:
        print("✅ Required variables OK, but some optional variables are missing.")
    
    print("=" * 60 + "\n")
    
    return len(errors) == 0

# Run environment check on startup
env_check_passed = check_environment_variables()

if not env_check_passed:
    print("❌ FATAL: Required environment variables are missing!")
    print("   Please check your .env file or docker-compose.yml")
    print("   The application may not work correctly.\n")

# Feature flag: Set USE_YFINANCE_EXTRAS=True to enable yfinance as fallback
# Default: False - yfinance causes delays and errors, Finnhub provides all needed data
USE_YFINANCE_EXTRAS = os.getenv("USE_YFINANCE_EXTRAS", "False").lower() == "true"

# Try to import yfinance (only used if USE_YFINANCE_EXTRAS=True)
try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False
    print("[Python Backend] yfinance not available, using Finnhub only")

if not USE_YFINANCE_EXTRAS:
    print("[Python Backend] yfinance extras disabled - using Finnhub only for maximum performance")

# ===========================================
# API Keys - Load from environment variables
# ===========================================

# Finnhub API Key (required for fundamentals data)
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

if not FINNHUB_API_KEY:
    raise ValueError("FINNHUB_API_KEY environment variable is required! Please set it in .env file or docker-compose.yml")

# Google Gemini API Key (required for AI SWOT analysis)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# FRED API Key (for macroeconomic data - used by frontend through this backend)
FRED_API_KEY = os.getenv("FRED_API_KEY")

# Configure logging
logging.basicConfig(
    level=logging.INFO if os.getenv("ENVIRONMENT", "development") == "production" else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend.log') if os.getenv("ENVIRONMENT") == "production" else logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Simple in-memory cache (expires after 2 hours)
cache = {}
CACHE_DURATION = timedelta(hours=2)

# Error caches to avoid repeated failed API calls
# Cache for yfinance errors (e.g., "symbol may be delisted")
yfinance_error_cache = {}  # {symbol: {"error": str, "timestamp": datetime}}
YFINANCE_ERROR_TTL = timedelta(hours=1)  # Cache errors for 1 hour

# Cache for sentiment 403 errors
sentiment_403_cache = {}  # {symbol: datetime}
SENTIMENT_403_TTL = timedelta(hours=24)  # Cache 403 errors for 24 hours

# Cache for price-changes errors (no data available)
price_changes_error_cache = {}  # {symbol: datetime}
PRICE_CHANGES_ERROR_TTL = timedelta(hours=1)  # Cache errors for 1 hour

# ===========================================
# Rate Limiting Configuration (from environment)
# ===========================================

# Rate limiting per IP (in-memory, resets on server restart)
rate_limit_cache = {}
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # Max requests per window
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # Time window in seconds

# Session-based rate limiting: 5 minutes usage, then 5 minutes cooldown
session_rate_limit_cache = {}
SESSION_DURATION = int(os.getenv("SESSION_DURATION", "300"))  # 5 minutes usage
COOLDOWN_DURATION = int(os.getenv("COOLDOWN_DURATION", "300"))  # 5 minutes cooldown

def check_rate_limit(ip: str) -> bool:
    """Check if IP has exceeded rate limit"""
    now = time.time()
    if ip not in rate_limit_cache:
        rate_limit_cache[ip] = {'count': 0, 'reset_time': now + RATE_LIMIT_WINDOW}
    
    entry = rate_limit_cache[ip]
    
    # Reset if window expired
    if now > entry['reset_time']:
        entry['count'] = 0
        entry['reset_time'] = now + RATE_LIMIT_WINDOW
    
    # Check limit
    if entry['count'] >= RATE_LIMIT_REQUESTS:
        return False
    
    entry['count'] += 1
    return True

def check_session_rate_limit(ip: str, start_session_if_new: bool = False) -> dict:
    """
    Check session-based rate limit:
    - User can use the website for 5 minutes (timer starts on first API request)
    - Timer continues running even if more API requests are made (does NOT reset)
    - Then must wait 5 minutes before using again (cooldown)
    - During cooldown, no searches/stock analyses are allowed
    - After cooldown: Session only starts when start_session_if_new=True (i.e., when API is actually used)
    - If no action is taken after cooldown, no session starts (session_remaining=0)
    
    Returns: {"allowed": bool, "retry_after": int, "session_remaining": int}
    """
    now = time.time()
    
    if ip not in session_rate_limit_cache:
        # First time user - only start session if API is actually being used
        if start_session_if_new:
            session_rate_limit_cache[ip] = {
                'session_start': now,
                'session_end': now + SESSION_DURATION,
                'cooldown_end': None
            }
            return {
                "allowed": True,
                "retry_after": 0,
                "session_remaining": SESSION_DURATION
            }
        else:
            # No session started yet - user hasn't made any API requests
            return {
                "allowed": True,
                "retry_after": 0,
                "session_remaining": 0  # No session active
            }
    
    entry = session_rate_limit_cache[ip]
    
    # Check if in cooldown period
    if entry.get('cooldown_end') and now < entry['cooldown_end']:
        retry_after = int(entry['cooldown_end'] - now)
        return {
            "allowed": False,
            "retry_after": retry_after,
            "session_remaining": 0
        }
    
    # Check if cooldown has ended
    if entry.get('cooldown_end') and now >= entry['cooldown_end']:
        # Cooldown ended - but only start new session if user is making an API request
        if start_session_if_new:
            # User is making an API request after cooldown - start new session
            entry['session_start'] = now
            entry['session_end'] = now + SESSION_DURATION
            entry['cooldown_end'] = None
            session_remaining = SESSION_DURATION
            return {
                "allowed": True,
                "retry_after": 0,
                "session_remaining": session_remaining
            }
        else:
            # Cooldown ended but no API request - no session active
            # Remove entry from cache so next API request (with start_session_if_new=True) will start fresh
            del session_rate_limit_cache[ip]
            return {
                "allowed": True,
                "retry_after": 0,
                "session_remaining": 0  # No session active - waiting for user action
            }
    
    # Check if session has expired
    if entry.get('session_end') and now >= entry['session_end']:
        # Session expired - start cooldown
        entry['cooldown_end'] = now + COOLDOWN_DURATION
        entry['session_start'] = None
        entry['session_end'] = None
        retry_after = COOLDOWN_DURATION
        return {
            "allowed": False,
            "retry_after": retry_after,
            "session_remaining": 0
        }
    
    # Session is active - timer continues from original start (NOT reset on new requests)
    session_remaining = int(entry['session_end'] - now)
    return {
        "allowed": True,
        "retry_after": 0,
        "session_remaining": session_remaining
    }

# Old advanced rate limit function removed - using session-based rate limiting instead

def get_remote_address(request: Request) -> str:
    """Get client IP address from request"""
    # Try to get real IP from proxy headers
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    return request.client.host if request.client else "unknown"

def validate_symbol(symbol: str) -> str:
    """Validate and sanitize stock symbol"""
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")
    
    # Remove any whitespace and convert to uppercase
    symbol = symbol.strip().upper()
    
    # Validate format: Only letters, numbers, dots, hyphens allowed, max 10 chars
    if not re.match(r'^[A-Z0-9.\-]{1,10}$', symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    
    # Additional security: prevent path traversal attempts
    if '..' in symbol or '/' in symbol or '\\' in symbol:
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    
    return symbol

# Enable CORS - UPDATE FOR PRODUCTION!
# In production, replace "*" with your actual domain(s)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Error handling middleware
@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except HTTPException:
        # Re-raise HTTP exceptions (they're intentional)
        raise
    except Exception as e:
        # Log unexpected errors without exposing sensitive information
        logger.error(f"Unexpected error in {request.url.path}: {type(e).__name__}", exc_info=True)
        # Don't expose internal error details in production
        if os.getenv("ENVIRONMENT") == "production":
            raise HTTPException(status_code=500, detail="Internal server error")
        else:
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Session remaining header middleware
@app.middleware("http")
async def add_session_remaining_header(request: Request, call_next):
    response = await call_next(request)
    
    # Only add header for successful API responses
    if response.status_code >= 200 and response.status_code < 300:
        # Check if this is an API endpoint that uses session rate limiting
        path = request.url.path
        if path.startswith("/api/"):
            # Get client IP
            client_ip = get_remote_address(request)
            
            # Check if session exists and is active
            if client_ip in session_rate_limit_cache:
                entry = session_rate_limit_cache[client_ip]
                now = time.time()
                
                # Check if session is active (not in cooldown and session_end exists and is in future)
                if entry.get('session_end') and now < entry['session_end']:
                    session_remaining = int(entry['session_end'] - now)
                    response.headers["X-Session-Remaining"] = str(session_remaining)
                else:
                    # No active session (either expired or in cooldown)
                    response.headers["X-Session-Remaining"] = "0"
            else:
                # No session in cache - check if we should have started one
                # For endpoints that start sessions, the session should now be in cache
                # If not, it means the endpoint doesn't use session rate limiting
                response.headers["X-Session-Remaining"] = "0"
    
    return response

# Root API health check (different from SPA root)
@app.get("/api/health")
def api_health():
    return {"message": "Python Finnhub Backend", "status": "running"}


# Frontend config endpoint - NO API keys exposed
@app.get("/api/config")
def get_config():
    """
    Returns configuration status (NO API keys exposed to frontend).
    All API calls are handled by the backend.
    """
    return {
        "status": "ok",
        "message": "API keys are configured on the server"
    }


@app.get("/api/session-status")
async def get_session_status(request: Request = None):
    """
    Get the current session status for the requesting IP.
    This endpoint does NOT count towards rate limiting - it's just for status checking.
    Returns: {"allowed": bool, "retry_after": int, "session_remaining": int}
    """
    if not request:
        return {"allowed": True, "retry_after": 0, "session_remaining": 0}
    
    client_ip = get_remote_address(request)
    # Don't start session for status check - only check existing session
    rate_limit_result = check_session_rate_limit(client_ip, start_session_if_new=False)
    
    return {
        "allowed": rate_limit_result["allowed"],
        "retry_after": rate_limit_result["retry_after"],
        "session_remaining": rate_limit_result["session_remaining"]
    }


def _check_fundamentals(symbol: str) -> bool:
    """Check if Finnhub fundamentals are available."""
    try:
        url = f"{FINNHUB_BASE_URL}/stock/metric?symbol={symbol}&metric=all&token={FINNHUB_API_KEY}"
        resp = requests.get(url, timeout=1.5)
        if resp.status_code == 200:
            metrics = resp.json().get("metric", {})
            return bool(metrics.get("peBasicExclExtraTTM") or metrics.get("peTTM") or 
                       metrics.get("marketCapitalization") or metrics.get("revenuePerShareTTM"))
    except:
        pass
    return False

def _check_price(symbol: str) -> bool:
    """Check if Yahoo Finance price data is available."""
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d"
        resp = requests.get(url, timeout=1.5, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code == 200:
            result = resp.json().get("chart", {}).get("result")
            if result and len(result) > 0:
                return result[0].get("meta", {}).get("regularMarketPrice") is not None
    except:
        pass
    return False

def check_data_availability(symbol: str) -> dict:
    """
    Check if fundamentals AND price data is available for a symbol.
    Runs both checks in parallel for speed.
    """
    with ThreadPoolExecutor(max_workers=2) as executor:
        fund_future = executor.submit(_check_fundamentals, symbol)
        price_future = executor.submit(_check_price, symbol)
        
        has_fundamentals = fund_future.result()
        has_price = price_future.result()
    
    is_complete = has_fundamentals and has_price
    return {"score": 1 if is_complete else 0, "full": is_complete, "maxScore": 1}


@app.get("/api/check-data")
async def check_data_endpoint(symbols: str = "", request: Request = None):
    """
    Check data availability for a list of symbols (comma-separated).
    Returns scores for each symbol.
    Aggressively cached to reduce redundant API calls.
    """
    if not symbols:
        return {"scores": {}}
    
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:10]
    
    if not symbol_list:
        return {"scores": {}}
    
    # Check cache first - cache key is sorted symbol list for consistency
    cache_key = f"check_data_{','.join(sorted(symbol_list))}"
    if cache_key in cache:
        cached_data, cached_time = cache[cache_key]
        # Cache for 5 minutes (check-data doesn't change frequently)
        if datetime.now() - cached_time < timedelta(minutes=5):
            print(f"[DataCheck] Returning cached data for {len(symbol_list)} symbols")
            return cached_data
    
    print(f"[DataCheck] Checking {len(symbol_list)} symbols: {symbol_list}")
    
    # Check in parallel
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(check_data_availability, symbol_list))
    
    scores = {}
    for i, symbol in enumerate(symbol_list):
        scores[symbol] = results[i]
    
    result = {"scores": scores}
    
    # Cache the result for 5 minutes
    cache[cache_key] = (result, datetime.now())
    
    print(f"[DataCheck] Results: {[(s, scores[s]['score']) for s in scores]}")
    return result


@app.get("/api/search")
async def search_symbols(q: str = "", request: Request = None):
    """
    Search for stock symbols by company name or ticker.
    Uses Finnhub's symbol search API.
    Fast search - data availability is checked separately via /api/check-data
    """
    logger.info(f"[Search] Received query: '{q}'")
    
    # Rate limiting (only if request is available)
    if request:
        client_ip = get_remote_address(request)
        if not check_rate_limit(client_ip):
            logger.warning(f"[Search] Rate limit exceeded for {client_ip}")
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    if not q or len(q.strip()) < 1:
        logger.debug("[Search] Empty query, returning empty results")
        return {"results": []}
    
    # Sanitize input
    q = q.strip()[:50]  # Limit query length
    
    # Check cache
    cache_key = f"search_{q.lower()}"
    if cache_key in cache:
        cached_data, cached_time = cache[cache_key]
        if datetime.now() - cached_time < timedelta(minutes=30):
            logger.debug(f"[Search] Returning cached results for '{q}'")
            return cached_data
    
    try:
        # Use Finnhub symbol search
        url = f"{FINNHUB_BASE_URL}/search?q={q}&token={FINNHUB_API_KEY}"
        logger.debug(f"[Search] Fetching from Finnhub: {url[:80]}...")
        response = requests.get(url, timeout=3)  # Reduced timeout from 10s to 3s for faster response
        
        logger.debug(f"[Search] Finnhub response status: {response.status_code}")
        
        if response.status_code != 200:
            logger.warning(f"[Search] Finnhub error response: {response.status_code} - {response.text[:200]}")
            return {"results": []}
        
        data = response.json()
        logger.info(f"[Search] Finnhub returned {len(data.get('result', []))} results for query '{q}'")
        results = []
        
        # Filter and format results - prioritize US stocks
        if data.get("result"):
            for item in data["result"][:20]:  # Limit to 20 results
                symbol = item.get("symbol", "")
                description = item.get("description", "")
                item_type = item.get("type", "")
                
                # Skip if no symbol or description
                if not symbol or not description:
                    continue
                
                # Prioritize common stock types
                if item_type in ["Common Stock", "ADR", "ETF", ""]:
                    results.append({
                        "symbol": symbol,
                        "name": description,
                        "type": item_type or "Stock"
                    })
        
        # Sort by relevance
        query_upper = q.upper()
        query_lower = q.lower()
        
        def sort_key(item):
            symbol = item["symbol"].upper()
            name = item["name"].lower()
            
            # Priority 1: Exact symbol match (highest priority)
            if symbol == query_upper:
                return (0, 0, 0, len(symbol))
            
            # Priority 2: Symbol starts with query (e.g., "AAPL" for "aa")
            if symbol.startswith(query_upper):
                return (1, 0, 0, len(symbol))
            
            # Priority 3: Name starts with query (e.g., "Apple Inc" for "apple")
            if name.startswith(query_lower):
                has_dot = '.' in symbol
                return (2, has_dot, 0, len(symbol))
            
            # Priority 4: Name contains query as a word
            if f" {query_lower}" in f" {name}" or query_lower in name.split()[0] if name.split() else False:
                has_dot = '.' in symbol
                return (3, has_dot, 0, len(symbol))
            
            # Priority 5: Name contains query anywhere
            if query_lower in name:
                has_dot = '.' in symbol
                return (4, has_dot, 0, len(symbol))
            
            # Priority 6: Everything else
            has_dot = '.' in symbol
            return (5, has_dot, 0, len(symbol))
        
        results.sort(key=sort_key)
        
        # Return top 10 results
        result = {"results": results[:10]}
        logger.info(f"[Search] Returning {len(result['results'])} results for query '{q}'")
        
        # Cache result
        cache[cache_key] = (result, datetime.now())
        
        return result
        
    except requests.exceptions.Timeout:
        logger.error(f"[Search] Timeout fetching from Finnhub for query '{q}'")
        return {"results": []}
    except requests.exceptions.RequestException as e:
        logger.error(f"[Search] Request error for query '{q}': {str(e)}")
        return {"results": []}
    except Exception as e:
        logger.error(f"[Search] Unexpected error for query '{q}': {str(e)}", exc_info=True)
        return {"results": []}


def fetch_from_yfinance(symbol: str):
    """
    Fetch company description from yfinance using the exact approach:
    ticker = yf.Ticker(symbol)
    info = ticker.info
    beschreibung = info.get("longBusinessSummary")
    
    Note: Yahoo Finance has strict rate limiting. If we get 429 errors,
    we'll return None and fall back to Finnhub.
    """
    if not YFINANCE_AVAILABLE:
        print(f"[Python Backend] yfinance not available for {symbol}")
        return None
    
    try:
        # Add a small delay to avoid rate limiting
        time.sleep(1)
        
        print(f"[Python Backend] Fetching description from yfinance for {symbol}")
        ticker = yf.Ticker(symbol)
        
        # Try to get info with timeout
        try:
            info = ticker.info
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "Too Many Requests" in error_str:
                print(f"[Python Backend] Yahoo Finance rate limited (429) for {symbol}, skipping yfinance")
                return None
            else:
                raise  # Re-raise if it's a different error
        
        # Debug: Print all available keys in info
        print(f"[Python Backend] yfinance info keys (first 30): {list(info.keys())[:30]}")
        
        # Get longBusinessSummary as primary description (exactly as requested)
        long_business_summary = info.get("longBusinessSummary")
        
        print(f"[Python Backend] yfinance longBusinessSummary type: {type(long_business_summary)}")
        print(f"[Python Backend] yfinance longBusinessSummary value: '{long_business_summary}'")
        print(f"[Python Backend] yfinance longBusinessSummary length: {len(long_business_summary) if long_business_summary else 0}")
        
        if long_business_summary:
            print(f"[Python Backend] yfinance longBusinessSummary preview (first 300 chars): {long_business_summary[:300]}")
        else:
            print(f"[Python Backend] No longBusinessSummary found for {symbol}, trying fallbacks")
            long_business_summary = info.get("longDescription") or info.get("description") or ""
            print(f"[Python Backend] Fallback description length: {len(long_business_summary) if long_business_summary else 0}")
            if long_business_summary:
                print(f"[Python Backend] Fallback description preview: {long_business_summary[:300]}")
        
        # Extract all relevant fields from yfinance
        description_data = {
            "longBusinessSummary": long_business_summary or "",
            "description": long_business_summary or info.get("longDescription") or info.get("description") or "",
            "businessSummary": long_business_summary or info.get("longDescription") or "",
            "longName": info.get("longName") or info.get("name") or symbol,
            "name": info.get("longName") or info.get("name") or symbol,
            "sector": info.get("sector") or "",
            "industry": info.get("industry") or "",
            "website": info.get("website") or "",
            "fullTimeEmployees": info.get("fullTimeEmployees") or None,
            "country": info.get("country") or "",
            "city": info.get("city") or "",
        }
        
        print(f"[Python Backend] Final description_data longBusinessSummary length: {len(description_data.get('longBusinessSummary', ''))}")
        print(f"[Python Backend] Final description_data longBusinessSummary preview: {description_data.get('longBusinessSummary', '')[:300]}")
        return description_data
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "Too Many Requests" in error_str:
            print(f"[Python Backend] Yahoo Finance rate limited (429) for {symbol}, will use Finnhub fallback")
            return None
        else:
            print(f"[Python Backend] yfinance error for description: {e}")
            import traceback
            traceback.print_exc()
            return None

def generate_company_description(company_name: str, sector: str, industry: str, symbol: str):
    """
    Generate a simple company description from available data.
    This is a fallback when external APIs don't work.
    """
    description_parts = []
    
    if company_name and company_name != symbol:
        description_parts.append(f"{company_name} ({symbol})")
    else:
        description_parts.append(f"{symbol}")
    
    if industry and industry != "N/A":
        description_parts.append(f"is a company operating in the {industry} industry.")
    elif sector and sector != "N/A":
        description_parts.append(f"is a company in the {sector} sector.")
    else:
        description_parts.append("is a publicly traded company.")
    
    if sector and sector != "N/A" and industry and industry != "N/A" and sector != industry:
        description_parts.append(f"The company is classified in the {sector} sector.")
    
    return " ".join(description_parts) if description_parts else f"{symbol} is a publicly traded company."

def fetch_company_description_from_wikipedia(symbol: str, company_name: str = None):
    """
    Fetch company description from Wikipedia API.
    """
    try:
        # Try to find Wikipedia article for the company
        search_terms = []
        if company_name:
            search_terms.append(company_name)
        search_terms.append(symbol)
        
        for search_term in search_terms:
            try:
                # Wikipedia API: Search for articles
                search_url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + requests.utils.quote(search_term.replace(" ", "_"))
                print(f"[Python Backend] Trying Wikipedia for: {search_term}")
                
                wiki_response = requests.get(search_url, timeout=10)
                if wiki_response.status_code == 200:
                    wiki_data = wiki_response.json()
                    extract = wiki_data.get("extract", "")
                    if extract and len(extract) > 50:  # Only return if we have substantial content
                        print(f"[Python Backend] Found Wikipedia description (length: {len(extract)})")
                        return extract
            except Exception as e:
                print(f"[Python Backend] Wikipedia search failed for {search_term}: {e}")
                continue
        
        return None
    except Exception as e:
        print(f"[Python Backend] Wikipedia API error: {e}")
        return None

def fetch_from_finnhub(symbol: str):
    """
    Fetch fundamentals using Finnhub API (reliable, no rate limiting issues).
    """
    try:
        print(f"[Python Backend] Fetching from Finnhub API for {symbol}")
        
        # Fetch company profile
        profile_url = f"{FINNHUB_BASE_URL}/stock/profile2"
        profile_params = {
            "symbol": symbol,
            "token": FINNHUB_API_KEY
        }
        
        print(f"[Python Backend] Fetching company profile...")
        profile_response = requests.get(profile_url, params=profile_params, timeout=10)
        
        if profile_response.status_code != 200:
            raise Exception(f"Finnhub profile API returned {profile_response.status_code}: {profile_response.text}")
        
        profile_data = profile_response.json()
        
        if not profile_data or profile_data.get("ticker") is None:
            raise Exception(f"No profile data returned for {symbol}")
        
        # Fetch basic financials/metrics
        financials_url = f"{FINNHUB_BASE_URL}/stock/metric"
        financials_params = {
            "symbol": symbol,
            "metric": "all",
            "token": FINNHUB_API_KEY
        }
        
        print(f"[Python Backend] Fetching basic financials...")
        financials_response = requests.get(financials_url, params=financials_params, timeout=10)
        
        financials_data = {}
        if financials_response.status_code == 200:
            financials_data = financials_response.json()
        else:
            print(f"[Python Backend] Financials API returned {financials_response.status_code}, continuing without it...")
        
        # Combine data
        result = {
            "profile": profile_data,
            "financials": financials_data
        }
        
        # Debug: Print raw metric data for inspection
        if financials_data and "metric" in financials_data:
            metric_data = financials_data["metric"]
            print(f"[Python Backend] DEBUG - Raw metric keys for {symbol}: {list(metric_data.keys())[:20]}...")
            print(f"[Python Backend] DEBUG - Sample metric values for {symbol}:")
            sample_keys = ["netProfitMarginTTM", "operatingMarginTTM", "revenuePerShareTTM", "sharesOutstanding", "roeTTM", "roaTTM", "currentDividendYieldTTM"]
            for key in sample_keys:
                if key in metric_data:
                    print(f"  {key}: {metric_data[key]}")
        
        print(f"[Python Backend] Successfully fetched from Finnhub for {symbol}")
        return result
        
    except Exception as e:
        print(f"[Python Backend] Finnhub API error: {str(e)}")
        raise

@app.get("/api/fundamentals/historical/debug/{symbol}")
def debug_historical_fundamentals(symbol: str):
    """Debug endpoint to see raw Finnhub API response"""
    try:
        symbol_upper = symbol.upper()
        url = f"{FINNHUB_BASE_URL}/stock/financials"
        params = {
            "symbol": symbol_upper,
            "statement": "ic",  # income statement
            "freq": "annual",
            "token": FINNHUB_API_KEY
        }
        response = requests.get(url, params=params, timeout=10)
        return {
            "status_code": response.status_code,
            "response": response.json() if response.status_code == 200 else response.text
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/fundamentals/historical/{symbol}")
async def get_historical_fundamentals(symbol: str, request: Request):
    """
    Get historical financial data from Finnhub metric endpoint (uses series data).
    The /stock/financials endpoint requires a paid plan, so we use /stock/metric which has historical series data.
    """
    # Rate limiting check
    client_ip = get_remote_address(request)
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
    
    # Validate and sanitize input
    symbol = validate_symbol(symbol)
    
    try:
        # Handle German stocks (e.g., DHL.DE -> DHL-DE or DHL)
        symbol_upper = symbol.upper()
        # Try original symbol first
        test_symbol = symbol_upper
        
        # Fetch metric data which includes historical series
        url = f"{FINNHUB_BASE_URL}/stock/metric"
        params = {
            "symbol": test_symbol,
            "metric": "all",
            "token": FINNHUB_API_KEY
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        # If 404 or no data, try alternative symbol formats for German stocks
        if response.status_code == 404 or (response.status_code == 200 and not response.json().get('series')):
            # Try without .DE suffix
            if '.DE' in test_symbol:
                test_symbol = test_symbol.replace('.DE', '')
                params["symbol"] = test_symbol
                response = requests.get(url, params=params, timeout=10)
                print(f"[Python Backend] Trying symbol without .DE: {test_symbol}")
            
            # Try with -DE suffix
            if response.status_code == 404 and '.DE' in symbol_upper:
                test_symbol = symbol_upper.replace('.DE', '-DE')
                params["symbol"] = test_symbol
                response = requests.get(url, params=params, timeout=10)
                print(f"[Python Backend] Trying symbol with -DE: {test_symbol}")
        
        if response.status_code != 200:
            raise Exception(f"Finnhub metric API returned {response.status_code} for {symbol_upper}. Tried: {test_symbol}. Response: {response.text[:200]}")
        
        data = response.json()
        
        if not data or 'series' not in data:
            raise Exception(f"No series data in metric response for {symbol_upper}. Response keys: {list(data.keys()) if data else 'empty'}")
        
        series = data.get('series', {})
        annual_series = series.get('annual', {})
        quarterly_series = series.get('quarterly', {})
        
        # Extract available metrics from series
        available_metrics = {}
        
        # Log all available series keys for debugging
        print(f"[Python Backend] Available annual series keys: {list(annual_series.keys())}")
        print(f"[Python Backend] Available quarterly series keys: {list(quarterly_series.keys())}")
        
        # Revenue (from revenuePerShare * sharesOutstanding)
        # Try different possible field names
        revenue_field = None
        for field in ['revenuePerShare', 'revenuePerShareAnnual', 'revenueShare', 'salesPerShare', 'revenue']:
            if field in annual_series or field in quarterly_series:
                revenue_field = field
                print(f"[Python Backend] Found revenue field: {revenue_field}")
                break
        
        if revenue_field:
            available_metrics['revenue'] = {
                'annual': annual_series.get(revenue_field, []),
                'quarterly': quarterly_series.get(revenue_field, []),
                'isPerShare': True if 'PerShare' in revenue_field else False
            }
            print(f"[Python Backend] Revenue annual data points: {len(available_metrics['revenue']['annual'])}")
            print(f"[Python Backend] Revenue quarterly data points: {len(available_metrics['revenue']['quarterly'])}")
        else:
            print(f"[Python Backend] No revenue field found in series")
        
        # Net Income (from EPS * sharesOutstanding, or direct netIncome if available)
        net_income_field = None
        for field in ['netIncome', 'netIncomeCommon', 'netIncomeToCommon', 'netIncomeAvailable']:
            if field in annual_series or field in quarterly_series:
                net_income_field = field
                print(f"[Python Backend] Found netIncome field: {net_income_field}")
                break
        
        if net_income_field:
            available_metrics['netIncome'] = {
                'annual': annual_series.get(net_income_field, []),
                'quarterly': quarterly_series.get(net_income_field, []),
                'isPerShare': False
            }
            print(f"[Python Backend] Net Income annual data points: {len(available_metrics['netIncome']['annual'])}")
        elif 'eps' in annual_series or 'eps' in quarterly_series:
            # Calculate Net Income from EPS * sharesOutstanding
            print(f"[Python Backend] Calculating Net Income from EPS * sharesOutstanding")
            available_metrics['netIncome'] = {
                'annual': annual_series.get('eps', []),
                'quarterly': quarterly_series.get('eps', []),
                'isPerShare': True,  # Will be converted to total using sharesOutstanding
                'calculatedFrom': 'eps'
            }
            print(f"[Python Backend] Net Income (from EPS) annual data points: {len(available_metrics['netIncome']['annual'])}")
        else:
            print(f"[Python Backend] No netIncome or EPS field found")
        
        # Book Value (already available)
        if 'bookValue' in annual_series or 'bookValue' in quarterly_series:
            available_metrics['bookValue'] = {
                'annual': annual_series.get('bookValue', []),
                'quarterly': quarterly_series.get('bookValue', []),
                'isPerShare': False
            }
            print(f"[Python Backend] Book Value annual data points: {len(available_metrics['bookValue']['annual'])}")
        
        # Cash Flow per Share
        if 'cashFlowPerShare' in annual_series or 'cashFlowPerShare' in quarterly_series:
            available_metrics['cashFlow'] = {
                'annual': annual_series.get('cashFlowPerShare', []),
                'quarterly': quarterly_series.get('cashFlowPerShare', []),
                'isPerShare': True
            }
            print(f"[Python Backend] Cash Flow annual data points: {len(available_metrics['cashFlow']['annual'])}")
        
        # EPS
        if 'eps' in annual_series or 'eps' in quarterly_series:
            available_metrics['eps'] = {
                'annual': annual_series.get('eps', []),
                'quarterly': quarterly_series.get('eps', []),
                'isPerShare': True
            }
            print(f"[Python Backend] EPS annual data points: {len(available_metrics['eps']['annual'])}")
        
        # PE Ratio (try different field names)
        pe_field = None
        for field in ['peTTM', 'peExclExtraTTM', 'peBasicExclExtraTTM', 'pe', 'priceToEarnings']:
            if field in annual_series or field in quarterly_series:
                pe_field = field
                print(f"[Python Backend] Found PE ratio field: {pe_field}")
                break
        
        if pe_field:
            available_metrics['peRatio'] = {
                'annual': annual_series.get(pe_field, []),
                'quarterly': quarterly_series.get(pe_field, []),
                'isPerShare': False
            }
            print(f"[Python Backend] PE Ratio annual data points: {len(available_metrics['peRatio']['annual'])}")
            print(f"[Python Backend] PE Ratio quarterly data points: {len(available_metrics['peRatio']['quarterly'])}")
        else:
            print(f"[Python Backend] No PE ratio field found in series")
        
        # Forward PE Ratio (try different field names)
        forward_pe_field = None
        for field in ['forwardPE', 'forwardPe', 'peForward', 'priceToEarningsForward']:
            if field in annual_series or field in quarterly_series:
                forward_pe_field = field
                print(f"[Python Backend] Found Forward PE ratio field: {forward_pe_field}")
                break
        
        if forward_pe_field:
            available_metrics['forwardPE'] = {
                'annual': annual_series.get(forward_pe_field, []),
                'quarterly': quarterly_series.get(forward_pe_field, []),
                'isPerShare': False
            }
            print(f"[Python Backend] Forward PE Ratio annual data points: {len(available_metrics['forwardPE']['annual'])}")
            print(f"[Python Backend] Forward PE Ratio quarterly data points: {len(available_metrics['forwardPE']['quarterly'])}")
        else:
            print(f"[Python Backend] No Forward PE ratio field found in series")
        
        # Get shares outstanding to calculate total values
        metric = data.get('metric', {})
        shares_outstanding = metric.get('sharesOutstanding')
        
        # Convert per-share values to total values where applicable
        result = {
            "symbol": symbol_upper,
            "sharesOutstanding": shares_outstanding,
            "metrics": {}
        }
        
        for metric_name, metric_data in available_metrics.items():
            result["metrics"][metric_name] = {
                "annual": metric_data.get('annual', []),
                "quarterly": metric_data.get('quarterly', []),
                "isPerShare": metric_data.get('isPerShare', False)
            }
        
        print(f"[Python Backend] Extracted {len(available_metrics)} metrics with historical data")
        print(f"[Python Backend] Available metrics: {list(available_metrics.keys())}")
        
        return result
        
    except Exception as e:
        error_msg = str(e)
        print(f"[Python Backend] Error in get_historical_fundamentals: {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching historical fundamentals: {error_msg}")

@app.get("/api/fundamentals/{symbol}")
def get_fundamentals(symbol: str, request: Request = None):
    """
    Get comprehensive fundamental data for a stock using Finnhub API.
    Protected by session-based rate limiting: 5 minutes usage, then 5 minutes cooldown.
    """
    # Session-based rate limiting
    if request:
        client_ip = get_remote_address(request)
        # Start session if this is the first API request
        rate_limit_result = check_session_rate_limit(client_ip, start_session_if_new=True)
        if not rate_limit_result["allowed"]:
            raise HTTPException(
                status_code=429,
                detail=f"Session limit exceeded. Please wait {rate_limit_result['retry_after']} seconds.",
                headers={
                    "Retry-After": str(rate_limit_result["retry_after"]),
                    "X-RateLimit-Type": "session_cooldown"
                }
            )
    
    try:
        # Check cache first - aggressive caching for fundamentals
        symbol_upper = symbol.upper()
        cache_key = f"fundamentals_{symbol_upper}"
        if cache_key in cache:
            cached_data, cached_time = cache[cache_key]
            # Use shorter cache duration (15 minutes) for fundamentals to balance freshness and performance
            if datetime.now() - cached_time < timedelta(minutes=15):
                print(f"[Python Backend] Returning cached fundamentals data for {symbol_upper}")
                return cached_data
        
        # Use Finnhub API (reliable, no rate limiting issues)
        # Note: yfinance is disabled due to Yahoo Finance rate limiting (429 errors)
        finnhub_data = fetch_from_finnhub(symbol)
        
        profile = finnhub_data.get("profile", {})
        financials = finnhub_data.get("financials", {})
        
        # Generate company description from Finnhub data (fast, reliable)
        # Wikipedia and yfinance descriptions are removed from hot path for performance
        # Use /api/company-description/{symbol} for detailed descriptions if needed
        company_name = profile.get("name") or symbol
        sector = profile.get("finnhubIndustry") or ""
        industry = profile.get("finnhubIndustry") or ""
        
        # Generate description from available Finnhub data
        company_description = generate_company_description(company_name, sector, industry, symbol)
        print(f"[Python Backend] Generated description from Finnhub data: {company_description[:100]}...")
        
        # Initialize variables for yfinance data (only used if USE_YFINANCE_EXTRAS=True)
        yfinance_profile_data = {}
        
        # Extract metrics from Finnhub financials
        metric = financials.get("metric", {})
        series = financials.get("series", {})
        
        # Valuation Ratios - Initialize to None (will be overridden by yfinance if available)
        current_pe = metric.get("peTTM") or metric.get("peExclExtraTTM")
        forward_pe = metric.get("forwardPE")
        peg_ratio = metric.get("pegTTM")
        price_to_sales = metric.get("psTTM") or metric.get("psAnnual")
        price_to_book = metric.get("pb") or metric.get("pbAnnual")
        market_cap = profile.get("marketCapitalization") or metric.get("marketCapitalization")
        enterprise_value = None  # Will be set by yfinance
        ev_ebitda = metric.get("evEbitdaTTM")
        ev_revenue = metric.get("evRevenueTTM")
        price_to_cashflow = metric.get("pcfShareTTM") or metric.get("pcfShareAnnual")
        price_to_free_cashflow = metric.get("pfcfShareTTM") or metric.get("pfcfShareAnnual")
        beta = metric.get("beta")
        book_value_per_share = metric.get("bookValuePerShareAnnual") or metric.get("bookValuePerShareQuarterly")
        
        # Earnings
        eps = metric.get("epsTTM") or metric.get("epsExclExtraItemsTTM")
        eps_annual = metric.get("epsAnnual") or metric.get("epsExclExtraItemsAnnual")
        earnings_growth_3y = metric.get("epsGrowth3Y")
        earnings_growth_5y = metric.get("epsGrowth5Y")
        earnings_growth_ttm = metric.get("epsGrowthTTMYoy")
        revenue_growth_3y = metric.get("revenueGrowth3Y")
        revenue_growth_5y = metric.get("revenueGrowth5Y")
        revenue_growth_ttm = metric.get("revenueGrowthTTMYoy")
        
        # Margins - Pass through raw values from Finnhub
        # Frontend will handle the formatting based on the actual value
        profit_margin_raw = metric.get("netProfitMarginTTM") or metric.get("netProfitMarginAnnual")
        operating_margin_raw = metric.get("operatingMarginTTM") or metric.get("operatingMarginAnnual")
        gross_margin_raw = metric.get("grossMarginTTM") or metric.get("grossMarginAnnual")
        pretax_margin_raw = metric.get("pretaxMarginTTM") or metric.get("pretaxMarginAnnual")
        
        # Log raw values for debugging
        print(f"[Python Backend] DEBUG - Raw margin values from Finnhub for {symbol}:")
        print(f"  profit_margin_raw: {profit_margin_raw}")
        print(f"  operating_margin_raw: {operating_margin_raw}")
        print(f"  gross_margin_raw: {gross_margin_raw}")
        print(f"  pretax_margin_raw: {pretax_margin_raw}")
        
        # Initialize all variables to None (will be overridden by yfinance if available)
        profit_margin = profit_margin_raw
        operating_margin = operating_margin_raw
        gross_margin = gross_margin_raw
        pretax_margin = pretax_margin_raw
        
        # Financial Data - Initialize to None (will be set by yfinance if available)
        total_revenue = None
        ebitda = None
        operating_cashflow = None
        free_cashflow = None
        net_income = None
        ebit = None
        
        # Ratios - Initialize to None (will be set by yfinance if available)
        roe = None
        roa = None
        roi = None
        current_ratio = None
        quick_ratio = None
        debt_to_equity = None
        
        # Dividends - Initialize to None (will be set by yfinance if available)
        dividend_yield = None
        payout_ratio = None
        
        # yfinance is disabled by default (USE_YFINANCE_EXTRAS=False)
        # Only use yfinance if explicitly enabled via feature flag
        use_yfinance = USE_YFINANCE_EXTRAS and YFINANCE_AVAILABLE and symbol_upper not in yfinance_error_cache
        
        if use_yfinance:
            try:
                print(f"[Python Backend] Fetching fundamental data from yfinance (as fallback/supplement)...")
                ticker = yf.Ticker(symbol_upper)
                info = ticker.info
                
                # Override ALL values with yfinance data (direct values, no calculations)
                # Valuation Ratios
                if "trailingPE" in info and info["trailingPE"]:
                    current_pe = info["trailingPE"]
                if "forwardPE" in info and info["forwardPE"]:
                    forward_pe = info["forwardPE"]
                if "pegRatio" in info and info["pegRatio"]:
                    peg_ratio = info["pegRatio"]
                if "priceToSalesTrailing12Months" in info and info["priceToSalesTrailing12Months"]:
                    price_to_sales = info["priceToSalesTrailing12Months"]
                if "priceToBook" in info and info["priceToBook"]:
                    price_to_book = info["priceToBook"]
                if "marketCap" in info and info["marketCap"]:
                    market_cap = info["marketCap"]
                if "enterpriseValue" in info and info["enterpriseValue"] is not None:
                    enterprise_value = info["enterpriseValue"]
                    print(f"[Python Backend] Got enterpriseValue from yfinance: {enterprise_value}")
                if "enterpriseToEbitda" in info and info["enterpriseToEbitda"]:
                    ev_ebitda = info["enterpriseToEbitda"]
                if "enterpriseToRevenue" in info and info["enterpriseToRevenue"]:
                    ev_revenue = info["enterpriseToRevenue"]
                if "priceToCashflow" in info and info["priceToCashflow"]:
                    price_to_cashflow = info["priceToCashflow"]
                if "priceToFreeCashflow" in info and info["priceToFreeCashflow"]:
                    price_to_free_cashflow = info["priceToFreeCashflow"]
                if "beta" in info and info["beta"]:
                    beta = info["beta"]
                if "bookValue" in info and info["bookValue"]:
                    book_value_per_share = info["bookValue"]
                
                # Earnings
                if "trailingEps" in info and info["trailingEps"]:
                    eps = info["trailingEps"]
                if "earningsGrowth" in info and info["earningsGrowth"]:
                    earnings_growth_ttm = info["earningsGrowth"]
                if "revenueGrowth" in info and info["revenueGrowth"]:
                    revenue_growth_ttm = info["revenueGrowth"]
                
                # Margins - Direct from yfinance (already as decimals, e.g., 0.25 for 25%)
                if "profitMargins" in info and info["profitMargins"] is not None:
                    profit_margin = info["profitMargins"]
                if "operatingMargins" in info and info["operatingMargins"] is not None:
                    operating_margin = info["operatingMargins"]
                if "grossMargins" in info and info["grossMargins"] is not None:
                    gross_margin = info["grossMargins"]
                if "pretaxMargins" in info and info["pretaxMargins"] is not None:
                    pretax_margin = info["pretaxMargins"]
                
                # Financial Data - Absolute values directly from yfinance
                if "totalRevenue" in info and info["totalRevenue"]:
                    total_revenue = info["totalRevenue"]
                    print(f"[Python Backend] Got totalRevenue from yfinance: {total_revenue}")
                if "ebitda" in info and info["ebitda"]:
                    ebitda = info["ebitda"]
                    print(f"[Python Backend] Got ebitda from yfinance: {ebitda}")
                if "operatingCashflow" in info and info["operatingCashflow"]:
                    operating_cashflow = info["operatingCashflow"]
                    print(f"[Python Backend] Got operatingCashflow from yfinance: {operating_cashflow}")
                if "freeCashflow" in info and info["freeCashflow"]:
                    free_cashflow = info["freeCashflow"]
                    print(f"[Python Backend] Got freeCashflow from yfinance: {free_cashflow}")
                if "netIncomeToCommon" in info and info["netIncomeToCommon"]:
                    net_income = info["netIncomeToCommon"]
                    print(f"[Python Backend] Got netIncome from yfinance: {net_income}")
                if "ebit" in info and info["ebit"]:
                    ebit = info["ebit"]
                    print(f"[Python Backend] Got ebit from yfinance: {ebit}")
                
                # Ratios - Direct from yfinance
                if "returnOnEquity" in info and info["returnOnEquity"] is not None:
                    roe = info["returnOnEquity"]
                if "returnOnAssets" in info and info["returnOnAssets"] is not None:
                    roa = info["returnOnAssets"]
                if "returnOnInvestment" in info and info["returnOnInvestment"] is not None:
                    roi = info["returnOnInvestment"]
                if "currentRatio" in info and info["currentRatio"] is not None:
                    current_ratio = info["currentRatio"]
                if "quickRatio" in info and info["quickRatio"] is not None:
                    quick_ratio = info["quickRatio"]
                if "debtToEquity" in info and info["debtToEquity"] is not None:
                    debt_to_equity = info["debtToEquity"]
                
                # Dividends - Direct from yfinance
                if "dividendYield" in info and info["dividendYield"] is not None:
                    dividend_yield = info["dividendYield"]
                if "payoutRatio" in info and info["payoutRatio"] is not None:
                    payout_ratio = info["payoutRatio"]
                
                print(f"[Python Backend] Successfully fetched fundamentals from yfinance")
            except Exception as e:
                error_msg = str(e)
                print(f"[Python Backend] yfinance error for {symbol_upper}: {error_msg}")
                import traceback
                traceback.print_exc()
                
                # Cache the error to avoid repeated calls
                # Check if it's a "delisted" or "no data" type error
                if "delisted" in error_msg.lower() or "no data" in error_msg.lower() or "expecting value" in error_msg.lower():
                    yfinance_error_cache[symbol_upper] = {
                        "error": error_msg,
                        "timestamp": datetime.now()
                    }
                    print(f"[Python Backend] Cached yfinance error for {symbol_upper} (will skip for {YFINANCE_ERROR_TTL})")
                
                # If yfinance fails, values stay as None (use Finnhub data if available)
                print(f"[Python Backend] Using Finnhub data as fallback")
        
        # NO CALCULATIONS - if yfinance doesn't provide it, it stays None
        
        # Balance Sheet - Try yfinance only if feature flag enabled
        total_assets = None
        if USE_YFINANCE_EXTRAS and use_yfinance:
            try:
                ticker = yf.Ticker(symbol_upper)
                info = ticker.info
                if "totalAssets" in info and info["totalAssets"]:
                    total_assets = info["totalAssets"]
            except Exception as e:
                error_msg = str(e)
                if "delisted" in error_msg.lower() or "no data" in error_msg.lower():
                    yfinance_error_cache[symbol_upper] = {
                        "error": error_msg,
                        "timestamp": datetime.now()
                    }
                pass
        
        # If yfinance didn't provide it, try Finnhub (but only as last resort)
        if total_assets is None:
            annual_series = series.get("annual", {})
            book_value_series = annual_series.get("bookValue", [])
            if book_value_series and len(book_value_series) > 0:
                total_assets = book_value_series[0].get("v")
        
        # Ratios - ONLY from yfinance (already set above in yfinance block)
        # If yfinance didn't provide them, they stay None (no Finnhub fallback)
        # roe, roa, roi, current_ratio, quick_ratio, debt_to_equity are already set from yfinance above
        
        # Dividends - ONLY from yfinance (already set above in yfinance block)
        # If yfinance didn't provide them, they stay None (no Finnhub fallback)
        # dividend_yield and payout_ratio are already set from yfinance above
        
        # Convert to quoteSummary format for compatibility
        response = {
            "quoteSummary": {
                "result": [{
                    "defaultKeyStatistics": {
                        "trailingPE": {"raw": current_pe} if current_pe else None,
                        "forwardPE": {"raw": forward_pe} if forward_pe else None,
                        "trailingEps": {"raw": eps} if eps else None,
                        "marketCap": {"raw": market_cap} if market_cap else None,
                        "priceToSalesTrailing12Months": {"raw": price_to_sales} if price_to_sales else None,
                        "priceToBook": {"raw": price_to_book} if price_to_book else None,
                        "pegRatio": {"raw": peg_ratio} if peg_ratio else None,
                        "enterpriseValue": {"raw": enterprise_value} if enterprise_value else None,
                        "beta": {"raw": beta} if beta else None,
                        "bookValue": {"raw": book_value_per_share} if book_value_per_share else None,
                    },
                    "financialData": {
                        "profitMargins": {"raw": profit_margin} if profit_margin else None,
                        "operatingMargins": {"raw": operating_margin} if operating_margin else None,
                        "grossMargins": {"raw": gross_margin} if gross_margin else None,
                        "pretaxMargins": {"raw": pretax_margin} if pretax_margin else None,
                        "ebitda": {"raw": ebitda} if ebitda else None,
                        "totalRevenue": {"raw": total_revenue} if total_revenue else None,
                        "evEbitda": {"raw": ev_ebitda} if ev_ebitda else None,
                        "evRevenue": {"raw": ev_revenue} if ev_revenue else None,
                        "roe": {"raw": roe} if roe else None,
                        "roa": {"raw": roa} if roa else None,
                        "roi": {"raw": roi} if roi else None,
                        "currentRatio": {"raw": current_ratio} if current_ratio else None,
                        "quickRatio": {"raw": quick_ratio} if quick_ratio else None,
                        "debtToEquity": {"raw": debt_to_equity} if debt_to_equity else None,
                        "dividendYield": {"raw": dividend_yield} if dividend_yield else None,
                        "payoutRatio": {"raw": payout_ratio} if payout_ratio else None,
                        "priceToCashflow": {"raw": price_to_cashflow} if price_to_cashflow else None,
                        "priceToFreeCashflow": {"raw": price_to_free_cashflow} if price_to_free_cashflow else None,
                    },
                    "summaryProfile": {
                        "longName": yfinance_profile_data.get("longName") or profile.get("name") or symbol,
                        "name": yfinance_profile_data.get("name") or profile.get("name") or symbol,
                        "sector": yfinance_profile_data.get("sector") or profile.get("finnhubIndustry") or "",
                        "industry": yfinance_profile_data.get("industry") or profile.get("finnhubIndustry") or "",
                        "longBusinessSummary": company_description or "",
                        "description": company_description or "",
                        "businessSummary": company_description or "",
                        "website": yfinance_profile_data.get("website") or profile.get("weburl") or "",
                        "weburl": yfinance_profile_data.get("website") or profile.get("weburl") or "",
                        "fullTimeEmployees": yfinance_profile_data.get("fullTimeEmployees") or None,
                        "country": yfinance_profile_data.get("country") or profile.get("country") or "",
                        "city": yfinance_profile_data.get("city") or profile.get("city") or "",
                    },
                    "incomeStatementHistory": {
                        "incomeStatementHistory": [{
                            "totalRevenue": {"raw": total_revenue} if total_revenue else None,
                            "netIncome": {"raw": net_income} if net_income else None,
                            "ebit": {"raw": ebit} if ebit else None,
                            "ebitda": {"raw": ebitda} if ebitda else None,
                            "revenueGrowth": {"raw": revenue_growth_ttm} if revenue_growth_ttm else None,
                            "earningsGrowth": {"raw": earnings_growth_ttm} if earnings_growth_ttm else None,
                            "revenueGrowth3Y": {"raw": revenue_growth_3y} if revenue_growth_3y else None,
                            "revenueGrowth5Y": {"raw": revenue_growth_5y} if revenue_growth_5y else None,
                            "earningsGrowth3Y": {"raw": earnings_growth_3y} if earnings_growth_3y else None,
                            "earningsGrowth5Y": {"raw": earnings_growth_5y} if earnings_growth_5y else None,
                        }]
                    },
                    "balanceSheetHistory": {
                        "balanceSheetStatements": [{
                            "totalAssets": None,
                            "totalLiab": None,
                        }]
                    },
                    "cashflowStatementHistory": {
                        "cashflowStatements": [{
                            "operatingCashflow": {"raw": operating_cashflow} if operating_cashflow else None,
                            "freeCashflow": {"raw": free_cashflow} if free_cashflow else None,
                        }]
                    },
                }]
            }
        }
        
        print(f"[Python Backend] Successfully got fundamentals from Finnhub")
        print(f"[Python Backend] Extracted: PE={current_pe}, MarketCap={market_cap}, EPS={eps}")
        
        # Cache the response with consistent cache key
        cache[cache_key] = (response, datetime.now())
        print(f"[Python Backend] Cached fundamentals data for {symbol_upper} (TTL: 15 minutes)")
        
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 429) as-is
        raise
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[Python Backend] Error for {symbol} ({error_type}): {error_msg}")
        print(f"[Python Backend] Full error: {repr(e)}")
        
        # Provide meaningful error message
        if not error_msg or error_msg.strip() == "":
            error_msg = f"Unknown error occurred: {error_type}"
        
        raise HTTPException(status_code=500, detail=f"Error fetching fundamentals: {error_msg}")

@app.get("/api/debug/{symbol}")
def debug_finnhub(symbol: str):
    """Debug endpoint to see what fields are actually returned by Finnhub"""
    try:
        finnhub_data = fetch_from_finnhub(symbol)
        metric = finnhub_data.get("financials", {}).get("metric", {})
        
        # Extract key margin and revenue fields for inspection
        debug_info = {
            "symbol": symbol,
            "profile_keys": list(finnhub_data.get("profile", {}).keys()),
            "financials_keys": list(finnhub_data.get("financials", {}).keys()),
            "metric_keys": list(metric.keys()),
            "raw_margins": {
                "netProfitMarginTTM": metric.get("netProfitMarginTTM"),
                "netProfitMarginAnnual": metric.get("netProfitMarginAnnual"),
                "operatingMarginTTM": metric.get("operatingMarginTTM"),
                "operatingMarginAnnual": metric.get("operatingMarginAnnual"),
                "grossMarginTTM": metric.get("grossMarginTTM"),
                "grossMarginAnnual": metric.get("grossMarginAnnual"),
            },
            "raw_revenue": {
                "revenuePerShareTTM": metric.get("revenuePerShareTTM"),
                "revenuePerShareAnnual": metric.get("revenuePerShareAnnual"),
                "sharesOutstanding": metric.get("sharesOutstanding"),
                "profile_shareOutstanding": finnhub_data.get("profile", {}).get("shareOutstanding"),
            },
            "raw_ratios": {
                "roeTTM": metric.get("roeTTM"),
                "roaTTM": metric.get("roaTTM"),
                "roiTTM": metric.get("roiTTM"),
            },
            "full_metric": metric  # Full metric data for inspection
        }
        return debug_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pe/{symbol}")
def get_pe_ratio(symbol: str):
    """Quick endpoint to get just the P/E ratio"""
    try:
        finnhub_data = fetch_from_finnhub(symbol)
        metric = finnhub_data.get("financials", {}).get("metric", {})
        pe = metric.get("peTTM") or metric.get("peExclExtraTTM")
        if pe is None:
            raise HTTPException(status_code=404, detail=f"P/E ratio not available for {symbol}")
        return {"symbol": symbol, "trailingPE": pe}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/news/{symbol}")
async def get_stock_news(symbol: str, request: Request):
    """
    Get latest news for a stock from Finnhub API.
    """
    # Rate limiting check
    client_ip = get_remote_address(request)
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
    
    # Validate and sanitize input
    symbol = validate_symbol(symbol)
    
    try:
        symbol_upper = symbol.upper()
        
        # Fetch news from Finnhub
        url = f"{FINNHUB_BASE_URL}/company-news"
        params = {
            "symbol": symbol_upper,
            "from": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
            "to": datetime.now().strftime("%Y-%m-%d"),
            "token": FINNHUB_API_KEY
        }
        
        print(f"[Python Backend] Fetching news for {symbol_upper}...")
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            raise Exception(f"Finnhub news API returned {response.status_code}: {response.text[:200]}")
        
        data = response.json()
        
        if not data or not isinstance(data, list):
            raise Exception("Invalid response format from Finnhub news API")
        
        # Sort by date (newest first) and limit to 20
        news_items = sorted(data, key=lambda x: x.get('datetime', 0), reverse=True)[:20]
        
        print(f"[Python Backend] Found {len(news_items)} news items for {symbol_upper}")
        
        return {
            "symbol": symbol_upper,
            "news": news_items,
            "count": len(news_items)
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"[Python Backend] Error fetching news: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Error fetching news: {error_msg}")

@app.get("/api/market-news")
async def get_market_news(request: Request, filter: str = None):
    """
    Get latest market news from Google News RSS feed (finance/business related).
    Parses RSS XML and returns as JSON.
    
    Query parameters:
    - filter: Optional filter category (all, stocks, crypto, earnings, mergers, fed, economic)
    """
    # Rate limiting check
    client_ip = get_remote_address(request)
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
    
    # Define filter mappings to Google News RSS queries
    filter_queries = {
        'all': 'stock+market+finance+business',
        'stocks': 'stock+market+shares+equities+trading',
        'crypto': 'cryptocurrency+bitcoin+crypto+blockchain',
        'earnings': 'earnings+quarterly+results+financial+results',
        'mergers': 'mergers+acquisitions+M&A+takeover',
        'fed': 'Federal+Reserve+central+bank+interest+rates',
        'economic': 'economic+data+GDP+inflation+unemployment+employment'
    }
    
    # Get query based on filter (default to 'all')
    filter_key = filter.lower() if filter else 'all'
    query = filter_queries.get(filter_key, filter_queries['all'])
    
    try:
        # Google News RSS feed with filter query
        rss_url = f"https://news.google.com/rss/search?q={query}&hl=en&gl=US&ceid=US:en"
        
        print(f"[Python Backend] Fetching market news from Google News RSS...")
        response = requests.get(rss_url, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        if response.status_code != 200:
            raise Exception(f"Google News RSS returned {response.status_code}: {response.text[:200]}")
        
        # Parse RSS XML
        try:
            root = ET.fromstring(response.content)
        except ET.ParseError as e:
            raise Exception(f"Failed to parse RSS XML: {str(e)}")
        
        # RSS 2.0 namespace
        namespaces = {'': 'http://www.w3.org/2005/Atom', 'rss': 'http://purl.org/rss/1.0/'}
        
        # Try RSS 2.0 format first
        items = root.findall('.//item')
        if not items:
            # Try Atom format
            items = root.findall('.//entry', namespaces)
        
        news_items = []
        
        for item in items[:20]:  # Limit to 20 most recent items
            try:
                # RSS 2.0 format
                title_elem = item.find('title')
                link_elem = item.find('link')
                pub_date_elem = item.find('pubDate')
                description_elem = item.find('description')
                
                # Atom format fallback
                if title_elem is None:
                    title_elem = item.find('.//{http://www.w3.org/2005/Atom}title', namespaces)
                if link_elem is None:
                    link_elem = item.find('.//{http://www.w3.org/2005/Atom}link', namespaces)
                    if link_elem is not None:
                        link_elem.text = link_elem.get('href', '')
                if pub_date_elem is None:
                    pub_date_elem = item.find('.//{http://www.w3.org/2005/Atom}published', namespaces)
                if description_elem is None:
                    description_elem = item.find('.//{http://www.w3.org/2005/Atom}summary', namespaces)
                
                title = title_elem.text if title_elem is not None else 'No title'
                link = link_elem.text if link_elem is not None else (link_elem.get('href') if link_elem is not None else '')
                pub_date = pub_date_elem.text if pub_date_elem is not None else ''
                description = description_elem.text if description_elem is not None else ''
                
                # Clean HTML tags from description
                if description:
                    description = re.sub(r'<[^>]+>', '', description)
                    description = description.strip()
                
                # Parse date
                datetime_obj = None
                if pub_date:
                    try:
                        # Try parsing RSS date format: "Wed, 15 Jan 2025 12:00:00 GMT"
                        datetime_obj = datetime.strptime(pub_date.split(',', 1)[1].strip()[:25], '%d %b %Y %H:%M:%S')
                    except:
                        try:
                            # Try ISO format
                            datetime_obj = datetime.fromisoformat(pub_date.replace('Z', '+00:00'))
                        except:
                            pass
                
                news_items.append({
                    'title': title,
                    'link': link,
                    'pubDate': pub_date,
                    'datetime': int(datetime_obj.timestamp() * 1000) if datetime_obj else int(time.time() * 1000),
                    'description': description,
                    'source': 'Google News'
                })
            except Exception as e:
                print(f"[Python Backend] Error parsing news item: {str(e)}")
                continue
        
        # Sort by date (newest first)
        news_items.sort(key=lambda x: x.get('datetime', 0), reverse=True)
        
        print(f"[Python Backend] Found {len(news_items)} market news items")
        
        return {
            "news": news_items,
            "count": len(news_items),
            "source": "Google News RSS"
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"[Python Backend] Error fetching market news: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Error fetching market news: {error_msg}")

# Cache für Beschreibungen (separat vom Hauptcache)
description_cache = {}  # {symbol: (timestamp, description)}
DESCRIPTION_CACHE_TTL = timedelta(hours=24)

def get_cached_description(symbol: str):
    """Holt gecachte Beschreibung wenn noch gültig"""
    now = datetime.utcnow()
    data = description_cache.get(symbol)
    if not data:
        return None
    ts, desc = data
    if now - ts > DESCRIPTION_CACHE_TTL:
        return None
    return desc

def set_cached_description(symbol: str, desc: str):
    """Speichert Beschreibung im Cache"""
    description_cache[symbol] = (datetime.utcnow(), desc)

@app.get("/api/company-description/{symbol}")
def get_company_description(symbol: str, request: Request = None):
    """
    Optional endpoint for detailed company descriptions.
    This is NOT called during normal page load - only when user explicitly requests it.
    Uses yfinance and Wikipedia if USE_YFINANCE_EXTRAS=True, otherwise returns generated description.
    """
    symbol_upper = symbol.upper()
    
    # Check cache first
    cached = get_cached_description(symbol_upper)
    if cached:
        print(f"[Company Description] Returning cached description for {symbol_upper}")
        return {"symbol": symbol_upper, "description": cached, "source": "cache"}
    
    # Try yfinance if enabled
    if USE_YFINANCE_EXTRAS and YFINANCE_AVAILABLE:
        try:
            print(f"[Company Description] Fetching longBusinessSummary from yfinance for {symbol_upper}")
            ticker = yf.Ticker(symbol_upper)
            info = ticker.info
            
            desc = info.get("longBusinessSummary")
            if not desc:
                desc = info.get("longName") or info.get("name")
            
            if desc:
                set_cached_description(symbol_upper, desc)
                return {"symbol": symbol_upper, "description": desc, "source": "yfinance"}
        except Exception as e:
            print(f"[Company Description] yfinance failed: {e}")
    
    # Try Wikipedia if yfinance didn't work
    try:
        # Get company name from fundamentals for Wikipedia search
        finnhub_data = fetch_from_finnhub(symbol_upper)
        company_name = finnhub_data.get("profile", {}).get("name")
        wiki_desc = fetch_company_description_from_wikipedia(symbol_upper, company_name)
        if wiki_desc:
            set_cached_description(symbol_upper, wiki_desc)
            return {"symbol": symbol_upper, "description": wiki_desc, "source": "wikipedia"}
    except Exception as e:
        print(f"[Company Description] Wikipedia failed: {e}")
    
    # Fallback: Generate from Finnhub data
    finnhub_data = fetch_from_finnhub(symbol_upper)
    profile = finnhub_data.get("profile", {})
    company_name = profile.get("name") or symbol_upper
    sector = profile.get("finnhubIndustry") or ""
    industry = profile.get("finnhubIndustry") or ""
    generated_desc = generate_company_description(company_name, sector, industry, symbol_upper)
    
    return {"symbol": symbol_upper, "description": generated_desc, "source": "generated"}

@app.get("/api/stock-overview/{symbol}")
async def get_stock_overview(symbol: str, request: Request = None):
    """
    Aggregated endpoint that fetches multiple data sources in parallel for the Stock Analysis page.
    This reduces the number of HTTP requests from the frontend.
    Returns: fundamentals, dividends, earnings, price-changes, sentiment, news
    """
    symbol_upper = symbol.upper()
    
    # Check cache for aggregated data
    cache_key = f"stock_overview_{symbol_upper}"
    if cache_key in cache:
        cached_data, cached_time = cache[cache_key]
        if datetime.now() - cached_time < timedelta(minutes=5):  # Shorter cache for overview
            print(f"[Stock Overview] Returning cached data for {symbol_upper}")
            return cached_data
    
    print(f"[Stock Overview] Fetching aggregated data for {symbol_upper}...")
    
    # Import here to avoid circular dependencies
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    results = {
        "symbol": symbol_upper,
        "fundamentals": None,
        "dividends": None,
        "earnings": None,
        "price_changes": None,
        "sentiment": None,
        "news": None,
        "errors": {}
    }
    
    # Fetch all data in parallel using asyncio.gather
    # Note: get_fundamentals is sync, others are async
    import asyncio
    
    try:
        # Run sync function in thread pool, async functions directly
        fundamentals_task = asyncio.to_thread(get_fundamentals, symbol_upper, request)
        
        # Execute all in parallel
        fundamentals, dividends, earnings, price_changes, sentiment, news = await asyncio.gather(
            fundamentals_task,
            get_dividends_data(symbol_upper, request),
            get_earnings_data(symbol_upper, request),
            get_price_changes(symbol_upper, request),
            get_sentiment_data(symbol_upper, request),
            get_stock_news(symbol_upper, request),
            return_exceptions=True
        )
        
        # Handle results
        if not isinstance(fundamentals, Exception):
            results["fundamentals"] = fundamentals
        else:
            results["errors"]["fundamentals"] = str(fundamentals)
        
        if not isinstance(dividends, Exception):
            results["dividends"] = dividends
        else:
            results["errors"]["dividends"] = str(dividends)
        
        if not isinstance(earnings, Exception):
            results["earnings"] = earnings
        else:
            results["errors"]["earnings"] = str(earnings)
        
        if not isinstance(price_changes, Exception):
            results["price_changes"] = price_changes
        else:
            results["errors"]["price_changes"] = str(price_changes)
        
        if not isinstance(sentiment, Exception):
            results["sentiment"] = sentiment
        else:
            results["errors"]["sentiment"] = str(sentiment)
        
        if not isinstance(news, Exception):
            results["news"] = news
        else:
            results["errors"]["news"] = str(news)
            
    except Exception as e:
        print(f"[Stock Overview] Error in parallel fetch: {e}")
        import traceback
        traceback.print_exc()
    
    # Cache the results
    cache[cache_key] = (results, datetime.now())
    
    print(f"[Stock Overview] Completed fetching data for {symbol_upper}")
    return results

@app.get("/api/analyst/{symbol}")
async def get_analyst_data(symbol: str, request: Request):
    """
    Get analyst recommendations and price targets from Finnhub API.
    """
    try:
        symbol_upper = symbol.upper()
        
        # Fetch recommendation trends
        rec_url = f"{FINNHUB_BASE_URL}/stock/recommendation"
        rec_params = {
            "symbol": symbol_upper,
            "token": FINNHUB_API_KEY
        }
        
        print(f"[Python Backend] Fetching analyst recommendations for {symbol_upper}...")
        rec_response = requests.get(rec_url, params=rec_params, timeout=10)
        
        recommendations = []
        recommendation_trends = []
        if rec_response.status_code == 200:
            rec_data = rec_response.json()
            if isinstance(rec_data, list) and len(rec_data) > 0:
                # Get most recent recommendation
                recommendations = rec_data[0] if rec_data else {}
                # Get all trends for timeline chart
                recommendation_trends = rec_data if rec_data else []
        
        # Fetch price target
        target_url = f"{FINNHUB_BASE_URL}/stock/price-target"
        target_params = {
            "symbol": symbol_upper,
            "token": FINNHUB_API_KEY
        }
        
        print(f"[Python Backend] Fetching price target for {symbol_upper}...")
        target_response = requests.get(target_url, params=target_params, timeout=10)
        
        price_target = None
        if target_response.status_code == 200:
            target_data = target_response.json()
            if target_data:
                price_target = target_data
        
        # Fetch current price for price target visualization
        current_price = None
        try:
            quote_url = f"{FINNHUB_BASE_URL}/quote"
            quote_params = {
                "symbol": symbol_upper,
                "token": FINNHUB_API_KEY
            }
            quote_response = requests.get(quote_url, params=quote_params, timeout=10)
            if quote_response.status_code == 200:
                quote_data = quote_response.json()
                if quote_data and 'c' in quote_data:
                    current_price = quote_data['c']
        except:
            pass
        
        return {
            "symbol": symbol_upper,
            "recommendations": recommendations,
            "recommendationTrends": recommendation_trends,
            "priceTarget": price_target,
            "currentPrice": current_price
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"[Python Backend] Error fetching analyst data: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Error fetching analyst data: {error_msg}")

@app.get("/api/sentiment/{symbol}")
async def get_sentiment_data(symbol: str, request: Request):
    """
    Get social sentiment and insider transactions from Finnhub API.
    """
    try:
        symbol_upper = symbol.upper()
        
        # Fetch social sentiment
        sentiment_url = f"{FINNHUB_BASE_URL}/stock/social-sentiment"
        sentiment_params = {
            "symbol": symbol_upper,
            "token": FINNHUB_API_KEY
        }
        
        # Check if sentiment is known to return 403 for this symbol
        sentiment = None
        if symbol_upper in sentiment_403_cache:
            cache_time = sentiment_403_cache[symbol_upper]
            if datetime.now() - cache_time < SENTIMENT_403_TTL:
                print(f"[Python Backend] Skipping sentiment API for {symbol_upper} - known to return 403 (cached)")
            else:
                # Cache expired, remove it
                del sentiment_403_cache[symbol_upper]
                # Fetch sentiment after cache expired
                print(f"[Python Backend] Fetching social sentiment for {symbol_upper}...")
                sentiment_response = requests.get(sentiment_url, params=sentiment_params, timeout=10)
                
                if sentiment_response.status_code == 200:
                    sentiment_data = sentiment_response.json()
                    print(f"[Python Backend] Sentiment response: {sentiment_data}")
                    if sentiment_data and 'reddit' in sentiment_data:
                        reddit_data = sentiment_data.get('reddit', [])
                        if reddit_data and len(reddit_data) > 0:
                            sentiment = sentiment_data
                            print(f"[Python Backend] Found {len(reddit_data)} Reddit sentiment entries")
                        else:
                            print(f"[Python Backend] Reddit data is empty")
                    else:
                        print(f"[Python Backend] No 'reddit' key in sentiment data")
                elif sentiment_response.status_code == 403:
                    # Cache 403 errors to avoid repeated calls
                    sentiment_403_cache[symbol_upper] = datetime.now()
                    print(f"[Python Backend] Sentiment API returned 403 for {symbol_upper} - caching to skip future requests for {SENTIMENT_403_TTL}")
                else:
                    print(f"[Python Backend] Sentiment API returned status {sentiment_response.status_code}")
        else:
            # Not in cache, fetch sentiment
            print(f"[Python Backend] Fetching social sentiment for {symbol_upper}...")
            sentiment_response = requests.get(sentiment_url, params=sentiment_params, timeout=10)
            
            if sentiment_response.status_code == 200:
                sentiment_data = sentiment_response.json()
                print(f"[Python Backend] Sentiment response: {sentiment_data}")
                if sentiment_data and 'reddit' in sentiment_data:
                    reddit_data = sentiment_data.get('reddit', [])
                    if reddit_data and len(reddit_data) > 0:
                        sentiment = sentiment_data
                        print(f"[Python Backend] Found {len(reddit_data)} Reddit sentiment entries")
                    else:
                        print(f"[Python Backend] Reddit data is empty")
                else:
                    print(f"[Python Backend] No 'reddit' key in sentiment data")
            elif sentiment_response.status_code == 403:
                # Cache 403 errors to avoid repeated calls
                sentiment_403_cache[symbol_upper] = datetime.now()
                print(f"[Python Backend] Sentiment API returned 403 for {symbol_upper} - caching to skip future requests for {SENTIMENT_403_TTL}")
            else:
                print(f"[Python Backend] Sentiment API returned status {sentiment_response.status_code}")
        
        # Fetch insider transactions
        insider_url = f"{FINNHUB_BASE_URL}/stock/insider-transactions"
        insider_params = {
            "symbol": symbol_upper,
            "token": FINNHUB_API_KEY
        }
        
        print(f"[Python Backend] Fetching insider transactions for {symbol_upper}...")
        insider_response = requests.get(insider_url, params=insider_params, timeout=10)
        
        insider_transactions = []
        if insider_response.status_code == 200:
            insider_data = insider_response.json()
            print(f"[Python Backend] Insider transactions response type: {type(insider_data)}")
            
            # Handle both list and dict responses
            if isinstance(insider_data, list):
                # Direct list response
                insider_transactions = insider_data[:10] if insider_data else []
                print(f"[Python Backend] Found {len(insider_transactions)} insider transactions (list format)")
            elif isinstance(insider_data, dict):
                # Dictionary response with 'data' key
                if 'data' in insider_data and isinstance(insider_data['data'], list):
                    insider_transactions = insider_data['data'][:10] if insider_data['data'] else []
                    print(f"[Python Backend] Found {len(insider_transactions)} insider transactions (dict format)")
                else:
                    print(f"[Python Backend] Insider data dict doesn't contain 'data' list: {insider_data.keys() if isinstance(insider_data, dict) else 'N/A'}")
            else:
                print(f"[Python Backend] Insider data is neither list nor dict: {type(insider_data)}")
        else:
            print(f"[Python Backend] Insider transactions API returned status {insider_response.status_code}")
        
        result = {
            "symbol": symbol_upper,
            "sentiment": sentiment,
            "insiderTransactions": insider_transactions
        }
        print(f"[Python Backend] Returning sentiment data: sentiment={sentiment is not None}, transactions={len(insider_transactions)}")
        return result
        
    except Exception as e:
        error_msg = str(e)
        print(f"[Python Backend] Error fetching sentiment data: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Error fetching sentiment data: {error_msg}")

@app.get("/api/ai-summary/{symbol}")
async def get_ai_summary(symbol: str, request: Request):
    """
    Get AI-generated summary for a stock using Google Gemini API.
    """
    try:
        symbol_upper = symbol.upper()
        
        if not GOOGLE_API_KEY:
            print("[Python Backend] ERROR: GOOGLE_API_KEY not configured")
            raise HTTPException(
                status_code=503, 
                detail="AI Summary feature is not available. Google API key not configured. Please set GOOGLE_API_KEY environment variable or contact the administrator."
            )
        
        # Fetch comprehensive stock data
        print(f"[Python Backend] Fetching data for AI summary: {symbol_upper}")
        
        # Get fundamentals
        fundamentals_data = None
        try:
            fundamentals_data = get_fundamentals(symbol_upper)
        except Exception as e:
            print(f"[Python Backend] Warning: Could not fetch fundamentals: {str(e)}")
            pass
        
        # Get analyst data
        analyst_data = None
        try:
            analyst_data = await get_analyst_data(symbol_upper, request)
        except Exception as e:
            print(f"[Python Backend] Warning: Could not fetch analyst data: {str(e)}")
            pass
        
        # Get current price
        current_price = None
        try:
            quote_url = f"{FINNHUB_BASE_URL}/quote"
            quote_params = {
                "symbol": symbol_upper,
                "token": FINNHUB_API_KEY
            }
            quote_response = requests.get(quote_url, params=quote_params, timeout=10)
            if quote_response.status_code == 200:
                quote_data = quote_response.json()
                if quote_data and 'c' in quote_data:
                    current_price = quote_data['c']
        except:
            pass
        
        # Build comprehensive prompt
        company_name = symbol_upper
        sector = "N/A"
        industry = "N/A"
        market_cap = None
        description = None
        
        if fundamentals_data:
            quote_summary = fundamentals_data.get("quoteSummary", {})
            if quote_summary and "result" in quote_summary and len(quote_summary["result"]) > 0:
                profile = quote_summary["result"][0].get("summaryProfile", {})
                company_name = profile.get("longName") or profile.get("name") or symbol_upper
                sector = profile.get("sector") or "N/A"
                industry = profile.get("industry") or "N/A"
                description = profile.get("longBusinessSummary") or profile.get("description") or None
            
            # Get market cap and other metrics
            try:
                if quote_summary.get("result") and len(quote_summary["result"]) > 0:
                    if "defaultKeyStatistics" in quote_summary["result"][0]:
                        stats = quote_summary["result"][0]["defaultKeyStatistics"]
                        if "marketCap" in stats and stats["marketCap"]:
                            market_cap = stats["marketCap"].get("raw")
            except Exception as e:
                print(f"[Python Backend] Warning: Could not extract market cap: {str(e)}")
                pass
        
        # Build financial metrics string
        financial_metrics = []
        if fundamentals_data:
            quote_summary = fundamentals_data.get("quoteSummary", {})
            if quote_summary and "result" in quote_summary and len(quote_summary["result"]) > 0:
                result = quote_summary["result"][0]
                
                # Valuation metrics
                if "defaultKeyStatistics" in result:
                    stats = result["defaultKeyStatistics"]
                    if "trailingPE" in stats and stats["trailingPE"]:
                        financial_metrics.append(f"P/E Ratio: {stats['trailingPE'].get('raw', 'N/A')}")
                    if "priceToBook" in stats and stats["priceToBook"]:
                        financial_metrics.append(f"Price/Book: {stats['priceToBook'].get('raw', 'N/A')}")
                    if "beta" in stats and stats["beta"]:
                        financial_metrics.append(f"Beta: {stats['beta'].get('raw', 'N/A')}")
                
                # Financials
                if "financialData" in result:
                    financial = result["financialData"]
                    if "profitMargins" in financial and financial["profitMargins"]:
                        financial_metrics.append(f"Profit Margin: {financial['profitMargins'].get('raw', 'N/A') * 100:.2f}%")
                    if "revenueGrowth" in financial and financial["revenueGrowth"]:
                        financial_metrics.append(f"Revenue Growth: {financial['revenueGrowth'].get('raw', 'N/A') * 100:.2f}%")
                    if "earningsGrowth" in financial and financial["earningsGrowth"]:
                        financial_metrics.append(f"Earnings Growth: {financial['earningsGrowth'].get('raw', 'N/A') * 100:.2f}%")
        
        # Build analyst recommendations string
        analyst_info = []
        if analyst_data:
            if "recommendations" in analyst_data and analyst_data["recommendations"]:
                rec = analyst_data["recommendations"]
                if isinstance(rec, dict):
                    analyst_info.append(f"Strong Buy: {rec.get('strongBuy', 0)}")
                    analyst_info.append(f"Buy: {rec.get('buy', 0)}")
                    analyst_info.append(f"Hold: {rec.get('hold', 0)}")
                    analyst_info.append(f"Sell: {rec.get('sell', 0)}")
                    analyst_info.append(f"Strong Sell: {rec.get('strongSell', 0)}")
            
            if "priceTarget" in analyst_data and analyst_data["priceTarget"]:
                target = analyst_data["priceTarget"]
                if isinstance(target, dict):
                    if "targetMean" in target:
                        analyst_info.append(f"Mean Price Target: ${target['targetMean']:.2f}")
                    if "targetHigh" in target:
                        analyst_info.append(f"High Price Target: ${target['targetHigh']:.2f}")
                    if "targetLow" in target:
                        analyst_info.append(f"Low Price Target: ${target['targetLow']:.2f}")
        
        # Create comprehensive prompt
        prompt = f"""Analyze the stock {symbol_upper} ({company_name}) and provide a comprehensive investment summary.

Company Information:
- Symbol: {symbol_upper}
- Name: {company_name}
- Sector: {sector}
- Industry: {industry}
{f"- Market Cap: ${market_cap:,.0f}" if market_cap else ""}
{f"- Current Price: ${current_price:.2f}" if current_price else ""}

{f"Company Description: {description[:500]}..." if description else ""}

Financial Metrics:
{chr(10).join(f"- {metric}" for metric in financial_metrics) if financial_metrics else "- Financial data not available"}

Analyst Recommendations:
{chr(10).join(f"- {info}" for info in analyst_info) if analyst_info else "- Analyst data not available"}

Please provide a comprehensive summary covering:
1. **Company Overview**: What does this company do? What is its main business?
2. **Financial Health**: How is the company financially positioned? Include key metrics like profitability, growth, valuation ratios.
3. **Investment Analysis**: Based on the financial data and analyst recommendations, provide a buy/hold/sell recommendation with reasoning.
4. **Key Strengths**: What are the main strengths of this company?
5. **Key Risks**: What are the main risks or concerns investors should be aware of?
6. **Overall Assessment**: A concise summary for investors.

Format the response in clear, readable paragraphs. Be specific and data-driven. Use the financial metrics and analyst data provided to support your analysis."""

        # Call Gemini API - Use gemini-1.5-flash-latest
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GOOGLE_API_KEY}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }]
        }
        
        print(f"[Python Backend] Calling Gemini API for {symbol_upper}...")
        print(f"[Python Backend] Prompt length: {len(prompt)} characters")
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
        except requests.exceptions.RequestException as e:
            print(f"[Python Backend] Request exception: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to connect to Gemini API: {str(e)}")
        
        if response.status_code != 200:
            error_text = response.text
            print(f"[Python Backend] Gemini API error: {response.status_code} - {error_text}")
            try:
                error_json = response.json()
                error_detail = error_json.get("error", {}).get("message", error_text)
            except:
                error_detail = error_text
            raise HTTPException(status_code=response.status_code, detail=f"Gemini API error: {error_detail}")
        
        try:
            data = response.json()
        except Exception as e:
            print(f"[Python Backend] Failed to parse Gemini response: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Invalid response from Gemini API: {str(e)}")
        
        # Extract summary text
        summary = ""
        try:
            if "candidates" in data and len(data["candidates"]) > 0:
                candidate = data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    for part in candidate["content"]["parts"]:
                        if "text" in part:
                            summary += part["text"]
        except Exception as e:
            print(f"[Python Backend] Error extracting summary from response: {str(e)}")
            print(f"[Python Backend] Response structure: {list(data.keys())}")
            raise HTTPException(status_code=500, detail=f"Could not extract summary from Gemini response: {str(e)}")
        
        if not summary:
            print(f"[Python Backend] No summary text found in response. Response keys: {list(data.keys())}")
            raise HTTPException(status_code=500, detail="No summary generated by Gemini API")
        
        return {
            "symbol": symbol_upper,
            "summary": summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Python Backend] Error in get_ai_summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/swot/{symbol}")
async def get_swot_analysis(symbol: str, request: Request):
    """
    Generate SWOT analysis for a stock using Google Gemini API.
    API key is read from .env file - never exposed to frontend.
    """
    try:
        symbol_upper = symbol.upper()
        
        if not GOOGLE_API_KEY:
            print("[Python Backend] ERROR: GOOGLE_API_KEY not configured")
            raise HTTPException(
                status_code=503, 
                detail="SWOT Analysis feature is not available. Google API key not configured."
            )
        
        # Fetch company information
        print(f"[SWOT Analysis] Fetching company info for {symbol_upper}...")
        company_info = {}
        try:
            finnhub_data = fetch_from_finnhub(symbol_upper)
            if finnhub_data:
                profile = finnhub_data.get("profile", {})
                financials = finnhub_data.get("financials", {})
                metrics = financials.get("metric", {}) if financials else {}
                
                company_info = {
                    "name": profile.get("name") or symbol_upper,
                    "sector": profile.get("finnhubIndustry") or "N/A",
                    "industry": profile.get("finnhubIndustry") or "N/A",
                    "marketCap": profile.get("marketCapitalization"),
                    "pe": metrics.get("peTTM") or metrics.get("peExclExtraTTM"),
                    "profitMargin": metrics.get("netProfitMarginTTM"),
                    "revenueGrowth": metrics.get("revenueGrowthTTMYoy"),
                }
        except Exception as e:
            print(f"[SWOT Analysis] Error fetching company info: {e}")
        
        # Build SWOT prompt - request JSON format
        company_name = company_info.get("name", symbol_upper)
        sector = company_info.get("sector", "N/A")
        industry = company_info.get("industry", "N/A")
        
        prompt = f"""Analyze the company {company_name} ({symbol_upper}) and provide a SWOT analysis.

Company Information:
- Symbol: {symbol_upper}
- Name: {company_name}
- Sector: {sector}
- Industry: {industry}
{f"- Market Cap: ${company_info['marketCap']:,.0f}M" if company_info.get('marketCap') else ""}
{f"- P/E Ratio: {company_info['pe']:.2f}" if company_info.get('pe') else ""}
{f"- Profit Margin: {company_info['profitMargin']:.2f}%" if company_info.get('profitMargin') else ""}
{f"- Revenue Growth: {company_info['revenueGrowth']:.2f}%" if company_info.get('revenueGrowth') else ""}

Please provide a SWOT analysis in the following JSON format:
{{
  "strengths": [
    {{"point": "Most important strength", "priority": "high"}},
    {{"point": "Second important strength", "priority": "high"}},
    {{"point": "Less important strength", "priority": "medium"}},
    {{"point": "Minor strength", "priority": "low"}}
  ],
  "weaknesses": [
    {{"point": "Most critical weakness", "priority": "high"}},
    {{"point": "Second weakness", "priority": "medium"}},
    {{"point": "Minor weakness", "priority": "low"}}
  ],
  "opportunities": [
    {{"point": "Major opportunity", "priority": "high"}},
    {{"point": "Secondary opportunity", "priority": "medium"}},
    {{"point": "Small opportunity", "priority": "low"}}
  ],
  "threats": [
    {{"point": "Major threat", "priority": "high"}},
    {{"point": "Secondary threat", "priority": "medium"}},
    {{"point": "Minor threat", "priority": "low"}}
  ]
}}

Rank each point by priority: "high" for most important, "medium" for moderately important, and "low" for less critical points.
Provide 3-5 points per category, ranked by importance. Return ONLY valid JSON, no additional text or markdown."""

        # Call Gemini API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GOOGLE_API_KEY}"
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }]
        }
        
        print(f"[SWOT Analysis] Calling Gemini API for {symbol_upper}...")
        
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
        
        if response.status_code != 200:
            error_text = response.text
            print(f"[SWOT Analysis] Gemini API error: {response.status_code} - {error_text}")
            raise HTTPException(status_code=response.status_code, detail=f"Gemini API error: {error_text}")
        
        data = response.json()
        
        # Extract analysis text
        analysis_text = ""
        if "candidates" in data and len(data["candidates"]) > 0:
            candidate = data["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                for part in candidate["content"]["parts"]:
                    if "text" in part:
                        analysis_text += part["text"]
        
        if not analysis_text:
            raise HTTPException(status_code=500, detail="No analysis generated by Gemini API")
        
        # Parse JSON from response (might have markdown code blocks)
        json_text = analysis_text.strip()
        if json_text.startswith("```"):
            json_text = json_text.replace("```json", "").replace("```", "").strip()
        
        try:
            analysis = json.loads(json_text)
        except json.JSONDecodeError as e:
            print(f"[SWOT Analysis] JSON parse error: {e}")
            print(f"[SWOT Analysis] Raw response: {analysis_text}")
            raise HTTPException(status_code=500, detail="Failed to parse SWOT analysis from API response")
        
        return {
            "symbol": symbol_upper,
            "analysis": analysis,
            "companyInfo": company_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[SWOT Analysis] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai-market-summary")
async def get_ai_market_summary(request: Request):
    """
    Generate AI market summary using Google Gemini API.
    Accepts market data as POST body and returns AI-generated analysis.
    API key is read from .env file - never exposed to frontend.
    """
    try:
        if not GOOGLE_API_KEY:
            print("[Python Backend] ERROR: GOOGLE_API_KEY not configured")
            raise HTTPException(
                status_code=503, 
                detail="AI Summary feature is not available. Google API key not configured."
            )
        
        # Get market data from request body
        body = await request.json()
        market_data = body.get("marketData", {})
        
        if not market_data:
            raise HTTPException(status_code=400, detail="marketData is required")
        
        # Build prompt from market data
        time_range = market_data.get("timeRange", "1D")
        indices = market_data.get("indices", [])
        top_movers = market_data.get("topMovers", {})
        currencies = market_data.get("currencies", [])
        
        indices_text = "\n".join([
            f"- {idx.get('name', idx.get('symbol'))} ({idx.get('symbol')}): ${idx.get('price', 0):.2f} ({'+' if idx.get('changePercent', 0) >= 0 else ''}{idx.get('changePercent', 0):.2f}%)"
            for idx in indices
        ]) if indices else "No index data available"
        
        gainers_text = "\n".join([
            f"- {g.get('symbol')}: ${g.get('price', 0):.2f} ({'+' if g.get('changePercent', 0) >= 0 else ''}{g.get('changePercent', 0):.2f}%)"
            for g in top_movers.get('gainers', [])
        ]) if top_movers.get('gainers') else "No data"
        
        losers_text = "\n".join([
            f"- {l.get('symbol')}: ${l.get('price', 0):.2f} ({'+' if l.get('changePercent', 0) >= 0 else ''}{l.get('changePercent', 0):.2f}%)"
            for l in top_movers.get('losers', [])
        ]) if top_movers.get('losers') else "No data"
        
        currencies_text = "\n".join([
            f"- {c.get('name', c.get('symbol'))} ({c.get('symbol')}): {c.get('price', 0):.4f} ({'+' if c.get('changePercent', 0) >= 0 else ''}{c.get('changePercent', 0):.2f}%)"
            for c in currencies
        ]) if currencies else "No currency data available"
        
        prompt = f"""Create a comprehensive, well-structured market analysis based on the following current market data.

The analysis should provide investors with a solid overview of the current market situation.

Please structure the output clearly with headings, bullet points, and visual emphasis.

Language: English | Style: professional, analytical, objective | Target: Investors

Current Market Data (Time Range: {time_range}):

**Indices:**
{indices_text}

**Top Gainers:**
{gainers_text}

**Top Losers:**
{losers_text}

**Currencies:**
{currencies_text}

Structure & Content (follow strictly):

1️⃣ Executive Summary
– 2-4 key statements about the current market situation
– Quick verdict: Bullish / Neutral / Bearish + brief reasoning

2️⃣ Market Overview
– Overall assessment of indices (performance, trends)
– Regional differences (North America, Europe, Asia)
– Market sentiment (Risk-on vs. Risk-off)

3️⃣ Top Movers Analysis
– Analysis of biggest winners and losers
– Possible reasons for the movements
– Sectors/industries particularly affected

4️⃣ Currency & Macro Environment
– Currency movements and their significance
– Macroeconomic factors
– Central bank policy and its effects

5️⃣ Market Outlook & Risks
– Short-term perspective (next days/week)
– Key risks and opportunities
– Recommendations for investors

6️⃣ Key Takeaways
– 3-5 most important points for investors
– Action recommendations

Please use the provided data and ensure logical, understandable argumentation.
The output should be high-quality, precise and visually well-structured."""

        # Call Gemini API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GOOGLE_API_KEY}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }]
        }
        
        print(f"[AI Market Summary] Calling Gemini API...")
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code != 200:
            error_text = response.text
            print(f"[AI Market Summary] Gemini API error: {response.status_code} - {error_text}")
            raise HTTPException(status_code=response.status_code, detail=f"Gemini API error: {error_text}")
        
        data = response.json()
        
        # Extract summary text
        summary = ""
        if "candidates" in data and len(data["candidates"]) > 0:
            candidate = data["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                for part in candidate["content"]["parts"]:
                    if "text" in part:
                        summary += part["text"]
        
        if not summary:
            raise HTTPException(status_code=500, detail="No summary generated by Gemini API")
        
        return {"summary": summary}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AI Market Summary] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/price-changes/{symbol}")
async def get_price_changes(symbol: str, request: Request):
    """
    Get percentage price changes for different time periods (1 day, 1 month, 1 year, 10 years).
    No rate limiting - this is a secondary endpoint called as part of stock analysis.
    """
    try:
        symbol_upper = symbol.upper()
        
        # Check error cache first
        if symbol_upper in price_changes_error_cache:
            cache_time = price_changes_error_cache[symbol_upper]
            if datetime.now() - cache_time < PRICE_CHANGES_ERROR_TTL:
                print(f"[Python Backend] Skipping price changes for {symbol_upper} - cached error (no data available)")
                return {
                    "change1D": None,
                    "change1M": None,
                    "change1Y": None,
                    "change10Y": None
                }
            else:
                # Cache expired, remove it
                del price_changes_error_cache[symbol_upper]
        
        print(f"[Python Backend] Fetching price changes for {symbol_upper}...")
        
        if not YFINANCE_AVAILABLE:
            raise HTTPException(status_code=503, detail="yfinance library not available")
        
        # Use the provided symbol directly - no variant searching to avoid delays
        # User explicitly requested not to search for other tickers as it takes too long
        ticker = None
        working_symbol = symbol_upper
        
        try:
            print(f"[Python Backend] Using symbol directly (no variant search): {working_symbol}")
            ticker = yf.Ticker(working_symbol)
            
            # Try to get current price to verify the symbol works
            test_hist = ticker.history(period="5d")
            if test_hist is None or len(test_hist) == 0:
                print(f"[Python Backend] No data found for {working_symbol}")
                # Cache the error
                price_changes_error_cache[symbol_upper] = datetime.now()
                ticker = None
        except Exception as e:
            error_msg = str(e)
            print(f"[Python Backend] Error with symbol {working_symbol}: {error_msg}")
            # Cache errors like "delisted" or "no data"
            if "delisted" in error_msg.lower() or "no data" in error_msg.lower() or "expecting value" in error_msg.lower():
                price_changes_error_cache[symbol_upper] = datetime.now()
                print(f"[Python Backend] Cached price changes error for {symbol_upper}")
            ticker = None
        
        if ticker is None:
            print(f"[Python Backend] Could not find data for symbol: {working_symbol}")
            return {
                "change1D": None,
                "change1M": None,
                "change1Y": None,
                "change10Y": None
            }
        
        try:
            
            # Get current price - prioritize history over info (more reliable, less rate-limited)
            current_price = None
            
            # First, try to get from history (most reliable, works even with rate limiting)
            try:
                hist = ticker.history(period="5d", interval="1d")
                if hist is not None and len(hist) > 0:
                    current_price = float(hist['Close'].iloc[-1])
                    print(f"[Python Backend] Got current price from history: {current_price}")
            except Exception as e:
                print(f"[Python Backend] Could not get price from history: {e}")
            
            # Fallback: try info (may be rate-limited)
            if current_price is None:
                try:
                    info = ticker.info
                    current_price = info.get("regularMarketPrice") or info.get("currentPrice")
                    if current_price:
                        print(f"[Python Backend] Got current price from info: {current_price}")
                except Exception as e:
                    print(f"[Python Backend] Could not get price from info: {e}")
            
            # Fallback: try fast_info
            if current_price is None:
                try:
                    fast_info = ticker.fast_info
                    current_price = fast_info.get("lastPrice") or fast_info.get("regularMarketPrice")
                    if current_price:
                        print(f"[Python Backend] Got current price from fast_info: {current_price}")
                except Exception as e:
                    print(f"[Python Backend] Could not get price from fast_info: {e}")
            
            if current_price is None:
                print(f"[Python Backend] Could not determine current price for {working_symbol}")
                return {
                    "change1D": None,
                    "change1M": None,
                    "change1Y": None,
                    "change10Y": None
                }
            
            current_price = float(current_price)
            print(f"[Python Backend] Using current price: {current_price} for {working_symbol}")
            
            # Calculate changes for different periods
            changes = {}
            
            # Helper function to calculate percentage change
            def calc_change(old_price, new_price):
                if old_price is None or new_price is None or old_price <= 0:
                    return None
                try:
                    return ((new_price - old_price) / old_price) * 100
                except:
                    return None
            
            # 1 Day: Get yesterday's close (use the same 5d history we already have)
            try:
                hist_1d = ticker.history(period="5d", interval="1d")
                if hist_1d is not None and len(hist_1d) >= 2:
                    yesterday_close = float(hist_1d['Close'].iloc[-2])
                    changes["change1D"] = calc_change(yesterday_close, current_price)
                    if changes["change1D"] is not None:
                        print(f"[Python Backend] 1D: current={current_price}, yesterday={yesterday_close}, change={changes['change1D']:.2f}%")
                    else:
                        print(f"[Python Backend] Could not calculate 1D change")
                else:
                    print(f"[Python Backend] Not enough data for 1D: {len(hist_1d) if hist_1d is not None else 0} days")
                    changes["change1D"] = None
            except Exception as e:
                print(f"[Python Backend] Error calculating 1D change: {e}")
                import traceback
                traceback.print_exc()
                changes["change1D"] = None
            
            # 1 Month: Get price from 30 days ago
            try:
                hist_1m = ticker.history(period="1mo", interval="1d")
                if hist_1m is not None and len(hist_1m) >= 1:
                    month_ago_close = float(hist_1m['Close'].iloc[0])
                    changes["change1M"] = calc_change(month_ago_close, current_price)
                    if changes["change1M"] is not None:
                        print(f"[Python Backend] 1M: current={current_price}, month_ago={month_ago_close}, change={changes['change1M']:.2f}%")
                    else:
                        print(f"[Python Backend] Could not calculate 1M change")
                else:
                    print(f"[Python Backend] Not enough data for 1M: {len(hist_1m) if hist_1m is not None else 0} days")
                    changes["change1M"] = None
            except Exception as e:
                print(f"[Python Backend] Error calculating 1M change: {e}")
                import traceback
                traceback.print_exc()
                changes["change1M"] = None
            
            # 1 Year: Get price from 1 year ago
            try:
                hist_1y = ticker.history(period="1y", interval="1d")
                if hist_1y is not None and len(hist_1y) > 0:
                    year_ago_close = float(hist_1y['Close'].iloc[0])
                    changes["change1Y"] = calc_change(year_ago_close, current_price)
                    if changes["change1Y"] is not None:
                        print(f"[Python Backend] 1Y: current={current_price}, year_ago={year_ago_close}, change={changes['change1Y']:.2f}%")
                    else:
                        print(f"[Python Backend] Could not calculate 1Y change")
                else:
                    print(f"[Python Backend] Not enough data for 1Y: {len(hist_1y) if hist_1y is not None else 0} days")
                    changes["change1Y"] = None
            except Exception as e:
                print(f"[Python Backend] Error calculating 1Y change: {e}")
                import traceback
                traceback.print_exc()
                changes["change1Y"] = None
            
            # 10 Years: Get price from 10 years ago
            try:
                hist_10y = ticker.history(period="10y", interval="1d")
                if hist_10y is not None and len(hist_10y) > 0:
                    ten_years_ago_close = float(hist_10y['Close'].iloc[0])
                    changes["change10Y"] = calc_change(ten_years_ago_close, current_price)
                    if changes["change10Y"] is not None:
                        print(f"[Python Backend] 10Y: current={current_price}, 10y_ago={ten_years_ago_close}, change={changes['change10Y']:.2f}%")
                    else:
                        print(f"[Python Backend] Could not calculate 10Y change")
                else:
                    print(f"[Python Backend] Not enough data for 10Y: {len(hist_10y) if hist_10y is not None else 0} days")
                    changes["change10Y"] = None
            except Exception as e:
                print(f"[Python Backend] Error calculating 10Y change: {e}")
                import traceback
                traceback.print_exc()
                changes["change10Y"] = None
            
            print(f"[Python Backend] Price changes for {symbol_upper}: 1D={changes.get('change1D')}, 1M={changes.get('change1M')}, 1Y={changes.get('change1Y')}, 10Y={changes.get('change10Y')}")
            
            return {
                "change1D": changes.get("change1D"),
                "change1M": changes.get("change1M"),
                "change1Y": changes.get("change1Y"),
                "change10Y": changes.get("change10Y")
            }
            
        except Exception as e:
            print(f"[Python Backend] Error fetching price changes: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Error fetching price changes: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Python Backend] Unexpected error in get_price_changes: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dividends/{symbol}")
async def get_dividends_data(symbol: str, request: Request):
    """
    Get dividend history and upcoming dividends using Finnhub API.
    No rate limiting - this is a secondary endpoint called as part of stock analysis.
    """
    try:
        symbol_upper = symbol.upper()
        
        print(f"[Python Backend] Fetching dividend data from Finnhub for {symbol_upper}...")
        
        dividend_history = []
        dividend_yield = None
        dividend_rate = None
        ex_dividend_date = None
        next_dividend_date = None
        
        # Get dividend history - use yfinance only if feature flag enabled
        use_yfinance_dividends = USE_YFINANCE_EXTRAS and YFINANCE_AVAILABLE and symbol_upper not in yfinance_error_cache
        
        if use_yfinance_dividends:
            try:
                print(f"[Python Backend] Fetching dividend history from yfinance for {symbol_upper}...")
                ticker = yf.Ticker(symbol_upper)
                
                # Get dividends directly (no need to download full history)
                dividends_df = ticker.dividends
                print(f"[Python Backend] yfinance dividends_df type: {type(dividends_df)}, length: {len(dividends_df) if dividends_df is not None else 0}")
                
                if dividends_df is not None and len(dividends_df) > 0:
                    for date, amount in dividends_df.items():
                        dividend_history.append({
                            "date": int(date.timestamp()),
                            "amount": float(amount)
                        })
                    # Sort by date, newest first
                    dividend_history.sort(key=lambda x: x["date"], reverse=True)
                    print(f"[Python Backend] Found {len(dividend_history)} dividends from yfinance")
                else:
                    print(f"[Python Backend] No dividends found in yfinance dividends_df. Trying actions...")
                    # Try actions as alternative
                    try:
                        actions = ticker.actions
                        if actions is not None and len(actions) > 0 and 'Dividends' in actions.columns:
                            print(f"[Python Backend] Found dividends in actions: {len(actions)} rows")
                            for date, row in actions.iterrows():
                                if 'Dividends' in row and row['Dividends'] > 0:
                                    dividend_history.append({
                                        "date": int(date.timestamp()),
                                        "amount": float(row['Dividends'])
                                    })
                            dividend_history.sort(key=lambda x: x["date"], reverse=True)
                            print(f"[Python Backend] Found {len(dividend_history)} dividends from actions")
                    except Exception as e2:
                        print(f"[Python Backend] Error fetching from actions: {e2}")
            except Exception as e:
                error_msg = str(e)
                print(f"[Python Backend] Error fetching dividend history from yfinance: {error_msg}")
                import traceback
                traceback.print_exc()
                
                # Cache the error if it's a persistent issue
                if "delisted" in error_msg.lower() or "no data" in error_msg.lower() or "expecting value" in error_msg.lower():
                    yfinance_error_cache[symbol_upper] = {
                        "error": error_msg,
                        "timestamp": datetime.now()
                    }
                    print(f"[Python Backend] Cached yfinance error for {symbol_upper} dividends")
        else:
            if symbol_upper in yfinance_error_cache:
                print(f"[Python Backend] Skipping yfinance dividends for {symbol_upper} - cached error")
            else:
                print(f"[Python Backend] yfinance not available, cannot fetch dividend history")
        
        # Get dividend yield and rate from Finnhub metrics
        try:
            print(f"[Python Backend] Fetching dividend metrics from Finnhub for {symbol_upper}...")
            fundamentals_url = f"{FINNHUB_BASE_URL}/stock/metric"
            fundamentals_params = {
                "symbol": symbol_upper,
                "metric": "all",
                "token": FINNHUB_API_KEY
            }
            fundamentals_response = requests.get(fundamentals_url, params=fundamentals_params, timeout=10)
            
            if fundamentals_response.status_code == 200:
                fundamentals_data = fundamentals_response.json()
                if fundamentals_data and "metric" in fundamentals_data:
                    metric = fundamentals_data["metric"]
                    dividend_yield_raw = metric.get("currentDividendYieldTTM") or metric.get("dividendYieldIndicatedAnnual")
                    dividend_rate = metric.get("dividendPerShareTTM") or metric.get("dividendPerShareAnnual")
                    
                    if dividend_yield_raw:
                        dividend_yield = dividend_yield_raw
                        # Finnhub's currentDividendYieldTTM returns as decimal (e.g., 0.0038 for 0.38% or 0.2626 for 26.26%)
                        # It's already in decimal format, so we don't need to convert
                        # The value is already correct (0.2626 = 26.26%)
                        print(f"[Python Backend] Found dividend yield from Finnhub (raw): {dividend_yield_raw}, using as decimal: {dividend_yield}")
                    
                    if dividend_rate:
                        print(f"[Python Backend] Found dividend rate from Finnhub: {dividend_rate}")
        except Exception as e:
            print(f"[Python Backend] Error fetching dividend metrics from Finnhub: {e}")
        
        # Calculate next dividend date based on last dividend
        if dividend_history and len(dividend_history) > 0:
            try:
                last_dividend_date = datetime.fromtimestamp(dividend_history[0]["date"])
                # Most US stocks pay quarterly (~90 days)
                # Calculate next expected date
                next_dividend_date = int((last_dividend_date + timedelta(days=90)).timestamp())
                print(f"[Python Backend] Calculated next dividend date: {datetime.fromtimestamp(next_dividend_date)}")
            except Exception as e:
                print(f"[Python Backend] Error calculating next dividend date: {e}")
        
        return {
            "symbol": symbol_upper,
            "dividendHistory": dividend_history,
            "dividendYield": dividend_yield,
            "dividendRate": dividend_rate,
            "exDividendDate": ex_dividend_date,
            "nextDividendDate": next_dividend_date
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"[Python Backend] Error fetching dividend data: {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching dividend data: {error_msg}")

@app.get("/api/ownership/{symbol}")
async def get_ownership_data(symbol: str, request: Request):
    """
    Get ownership data (major holders, institutional holders, insider transactions) using yfinance.
    """
    try:
        symbol_upper = symbol.upper()
        
        print(f"[Python Backend] Fetching ownership data for {symbol_upper}...")
        
        if not YFINANCE_AVAILABLE:
            raise HTTPException(status_code=503, detail="yfinance library not available")
        
        major_holders = []
        institutional_holders = []
        insider_transactions = []
        institutional_ownership = None
        insider_ownership = None
        public_float = None
        
        try:
            ticker = yf.Ticker(symbol_upper)
            
            # Get major holders
            try:
                major_holders_df = ticker.major_holders
                if major_holders_df is not None and len(major_holders_df) > 0:
                    print(f"[Python Backend] Found major holders: {len(major_holders_df)} rows")
                    for idx, row in major_holders_df.iterrows():
                        holder_info = str(row.iloc[0]) if len(row) > 0 else "N/A"
                        # Parse holder info (format: "X.XX% Name" or "Name")
                        parts = holder_info.split('%', 1)
                        if len(parts) == 2:
                            percent_str = parts[0].strip()
                            name = parts[1].strip()
                            try:
                                percent = float(percent_str) / 100
                            except:
                                percent = None
                        else:
                            name = holder_info
                            percent = None
                        major_holders.append({
                            "name": name,
                            "percent": percent
                        })
            except Exception as e:
                print(f"[Python Backend] Error fetching major holders: {e}")
            
            # Get institutional holders
            try:
                institutional_holders_df = ticker.institutional_holders
                if institutional_holders_df is not None and len(institutional_holders_df) > 0:
                    print(f"[Python Backend] Found institutional holders: {len(institutional_holders_df)} rows")
                    for idx, row in institutional_holders_df.iterrows():
                        holder_name = row.iloc[0] if len(row) > 0 else "N/A"
                        shares = row.iloc[1] if len(row) > 1 else 0
                        percent = row.iloc[2] if len(row) > 2 else None
                        # Convert percent to decimal if it's a percentage
                        if percent is not None:
                            try:
                                if isinstance(percent, str):
                                    percent = float(percent.replace('%', '')) / 100
                                elif percent > 1:
                                    percent = percent / 100
                            except:
                                percent = None
                        institutional_holders.append({
                            "name": str(holder_name),
                            "shares": float(shares) if shares else 0,
                            "percent": percent
                        })
            except Exception as e:
                print(f"[Python Backend] Error fetching institutional holders: {e}")
            
            # Get insider transactions (from Finnhub if available, otherwise try yfinance)
            try:
                if FINNHUB_API_KEY:
                    insider_url = f"{FINNHUB_BASE_URL}/stock/insider-transactions"
                    insider_params = {
                        "symbol": symbol_upper,
                        "token": FINNHUB_API_KEY
                    }
                    insider_response = requests.get(insider_url, params=insider_params, timeout=10)
                    if insider_response.status_code == 200:
                        insider_data = insider_response.json()
                        if insider_data and isinstance(insider_data, list):
                            insider_transactions = insider_data[:10] if insider_data else []
                            print(f"[Python Backend] Found {len(insider_transactions)} insider transactions from Finnhub")
                        elif insider_data and isinstance(insider_data, dict) and 'data' in insider_data:
                            insider_transactions = insider_data['data'][:10] if insider_data['data'] else []
                            print(f"[Python Backend] Found {len(insider_transactions)} insider transactions from Finnhub (dict format)")
            except Exception as e:
                print(f"[Python Backend] Error fetching insider transactions: {e}")
            
            # Get ownership percentages and public float from info
            try:
                info = ticker.info
                if info:
                    # Institutional ownership
                    if 'heldPercentInstitutions' in info and info['heldPercentInstitutions'] is not None:
                        institutional_ownership = float(info['heldPercentInstitutions']) / 100 if info['heldPercentInstitutions'] > 1 else float(info['heldPercentInstitutions'])
                    elif 'institutionalOwnership' in info and info['institutionalOwnership'] is not None:
                        institutional_ownership = float(info['institutionalOwnership']) / 100 if info['institutionalOwnership'] > 1 else float(info['institutionalOwnership'])
                    
                    # Insider ownership
                    if 'heldPercentInsiders' in info and info['heldPercentInsiders'] is not None:
                        insider_ownership = float(info['heldPercentInsiders']) / 100 if info['heldPercentInsiders'] > 1 else float(info['heldPercentInsiders'])
                    elif 'insiderOwnership' in info and info['insiderOwnership'] is not None:
                        insider_ownership = float(info['insiderOwnership']) / 100 if info['insiderOwnership'] > 1 else float(info['insiderOwnership'])
                    
                    # Public float
                    if 'floatShares' in info and info['floatShares'] is not None:
                        public_float = float(info['floatShares'])
                    elif 'sharesOutstanding' in info and info['sharesOutstanding'] is not None:
                        # If we have shares outstanding and institutional ownership, estimate float
                        shares_outstanding = float(info['sharesOutstanding'])
                        if institutional_ownership:
                            # Rough estimate: float = outstanding - (institutional + insider)
                            estimated_float = shares_outstanding * (1 - (institutional_ownership or 0) - (insider_ownership or 0))
                            public_float = estimated_float
                        else:
                            public_float = shares_outstanding
                    
                    print(f"[Python Backend] Ownership info: institutional={institutional_ownership}, insider={insider_ownership}, float={public_float}")
            except Exception as e:
                print(f"[Python Backend] Error fetching ownership info: {e}")
        
        except Exception as e:
            print(f"[Python Backend] Error fetching ownership data from yfinance: {e}")
            import traceback
            traceback.print_exc()
        
        return {
            "symbol": symbol_upper,
            "majorHolders": major_holders,
            "institutionalHolders": institutional_holders,
            "insiderTransactions": insider_transactions,
            "institutionalOwnership": institutional_ownership,
            "insiderOwnership": insider_ownership,
            "publicFloat": public_float
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"[Python Backend] Error fetching ownership data: {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/api/peer-comparison/{symbol}")
async def get_peer_comparison(symbol: str, request: Request, industry: str = None, sector: str = None):
    """
    Get peer comparison data (P/E, P/B, ROE, Debt/Equity) for stocks in the same industry.
    Uses fundamentals endpoint data for current stock metrics to avoid redundant API calls.
    No rate limiting - this is a secondary endpoint called as part of stock analysis.
    """
    try:
        symbol_upper = symbol.upper()
        
        print(f"[Python Backend] Fetching peer comparison for {symbol_upper}...")
        
        if not YFINANCE_AVAILABLE:
            raise HTTPException(status_code=503, detail="yfinance library not available")
        
        # Get current stock's industry and metrics
        current_stock_data = {}
        current_industry = None
        current_sector = None
        
        # First, use industry/sector from query parameters (from description cache)
        if industry:
            current_industry = industry
            print(f"[Python Backend] Using industry from query parameter: {current_industry}")
        if sector:
            current_sector = sector
            print(f"[Python Backend] Using sector from query parameter: {current_sector}")
        
        # Fetch current stock metrics using Finnhub API directly (same as peers)
        try:
            print(f"[Python Backend] Fetching current stock metrics from Finnhub for {symbol_upper} (same as peers)...")
            finnhub_data = fetch_from_finnhub(symbol_upper)
            
            if finnhub_data:
                profile = finnhub_data.get("profile", {})
                financials = finnhub_data.get("financials", {})
                metrics = financials.get("metric", {}) if financials else {}
                
                # Get name from profile
                peer_name = profile.get("name") or profile.get("ticker") or symbol_upper
                
                # Extract PE ratios and Price/Book from Finnhub metrics (same as peers)
                trailing_pe = metrics.get("peTTM") or metrics.get("peExclExtraTTM")
                forward_pe = metrics.get("forwardPE")
                price_to_book = metrics.get("pb") or metrics.get("pbAnnual")
                beta = metrics.get("beta")
                dividend_yield = metrics.get("currentDividendYieldTTM") or metrics.get("dividendYieldTTM")
                
                # Get industry/sector from profile if not provided
                if not current_industry:
                    current_industry = profile.get("finnhubIndustry") or profile.get("industry")
                if not current_sector:
                    current_sector = profile.get("sector")
                
                current_stock_data = {
                    "symbol": symbol_upper,
                    "name": peer_name,
                    "peRatio": trailing_pe if trailing_pe is not None else None,
                    "peRatioForward": forward_pe if forward_pe is not None else None,
                    "priceToBook": price_to_book if price_to_book is not None else None,
                    "beta": beta if beta is not None else None,
                    "dividendYield": dividend_yield if dividend_yield is not None else None,
                    "industry": current_industry,
                    "sector": current_sector
                }
                
                print(f"[Python Backend] Successfully fetched current stock metrics from Finnhub: {current_stock_data}")
            else:
                # Fallback: use basic data
                current_stock_data = {
                    "symbol": symbol_upper,
                    "name": symbol_upper,
                    "peRatio": None,
                    "peRatioForward": None,
                    "priceToBook": None,
                    "beta": None,
                    "dividendYield": None,
                    "industry": current_industry,
                    "sector": current_sector
                }
        except Exception as finnhub_error:
            print(f"[Python Backend] Error fetching from Finnhub for current stock: {finnhub_error}")
            import traceback
            traceback.print_exc()
            # Fallback: use basic data
            current_stock_data = {
                "symbol": symbol_upper,
                "name": symbol_upper,
                "peRatio": None,
                "peRatioForward": None,
                "priceToBook": None,
                "industry": current_industry,
                "sector": current_sector
            }
        
        # Ensure current_stock_data has at least symbol and name
        if not current_stock_data or not current_stock_data.get('symbol'):
            current_stock_data = {
                "symbol": symbol_upper,
                "name": symbol_upper,  # Fallback to symbol if name not available
                "peRatio": None,
                "peRatioForward": None,
                "priceToBook": None,
                "industry": current_industry,
                "sector": current_sector
            }
        
        # Use sector as fallback if industry is not available
        search_term = current_industry or current_sector
        potential_peers = []  # Initialize potential_peers
        
        # If no search term, try to infer from symbol or use smart defaults
        if not search_term:
            print(f"[Python Backend] WARNING: No industry or sector found for {symbol_upper}, trying to infer from symbol")
            # Try to infer sector from common stock symbols
            symbol_upper_lower = symbol_upper.lower()
            if any(bank in symbol_upper_lower for bank in ['jpm', 'bac', 'wfc', 'c', 'gs', 'ms', 'schw', 'blk']):
                search_term = "Financial Services"
                potential_peers = ["JPM", "BAC", "WFC", "C", "GS", "MS", "BLK", "SCHW"]
            elif any(tech in symbol_upper_lower for tech in ['aapl', 'msft', 'googl', 'meta', 'nvda', 'amd', 'intc']):
                search_term = "Technology"
                potential_peers = ["AAPL", "MSFT", "GOOGL", "META", "NVDA", "AMD", "INTC", "CRM"]
            elif any(health in symbol_upper_lower for health in ['jnj', 'pfe', 'unh', 'abt', 'tmo', 'abbv', 'mrk', 'lly']):
                search_term = "Healthcare"
                potential_peers = ["JNJ", "PFE", "UNH", "ABT", "TMO", "ABBV", "MRK", "LLY"]
            elif any(media in symbol_upper_lower for media in ['nflx', 'dis', 'cmcsa', 'wbd', 'foxa', 'para']):
                search_term = "Media"
                potential_peers = ["DIS", "NFLX", "CMCSA", "FOXA", "PARA", "WBD", "LGF.A", "MSGS"]
            else:
                # Default to major stocks across sectors
                search_term = "Diversified"
                potential_peers = ["AAPL", "MSFT", "GOOGL", "JPM", "BAC", "WFC", "JNJ", "PFE"]
        
        # Define peer stocks by industry (user-provided peer lists)
        industry_peers = {
            "Technology": ["AAPL", "MSFT", "GOOG", "META", "IBM", "ORCL", "NVDA"],
            "Software": ["MSFT", "ADBE", "CRM", "ORCL", "INTU", "SAP", "SNOW"],
            "Software—Infrastructure": ["MSFT", "NOW", "ORCL", "SNOW", "MDB", "DDOG", "SPLK"],
            "Application Software": ["CRM", "ADBE", "INTU", "SHOP", "SQ", "ZM", "TEAM"],
            "Enterprise Software": ["MSFT", "ORCL", "SAP", "CRM", "NOW", "ADBE", "WDAY"],
            "Semiconductors": ["NVDA", "AMD", "INTC", "TSM", "AVGO", "QCOM", "TXN", "ASML"],
            "Consumer Electronics": ["AAPL", "SONY", "SSNLF", "LG", "GRMN"],
            "Internet Content & Information": ["GOOG", "META", "BABA", "BIDU", "YNDX", "TWTR", "SNAP"],
            "Financial Services": ["JPM", "BAC", "C", "WFC", "GS", "MS", "SCHW"],
            "Banks": ["JPM", "BAC", "C", "WFC", "PNC", "USB", "HSBC"],
            "Healthcare": ["UNH", "JNJ", "PFE", "MRK", "ABBV", "DHR", "TMO"],
            "Pharmaceuticals": ["PFE", "MRK", "JNJ", "BMY", "NVS", "AZN", "LLY"],
            "Biotechnology": ["AMGN", "GILD", "REGN", "BIIB", "VRTX", "BNTX", "MRNA"],
            "Retail": ["WMT", "COST", "TGT", "AMZN", "HD", "LOW", "KR"],
            "Consumer Cyclical": ["NKE", "SBUX", "HD", "MCD", "TGT", "DIS", "BKNG"],
            "Automotive": ["TSLA", "GM", "F", "TM", "HMC", "VWAGY", "RIVN", "NIO"],
            "Energy": ["XOM", "CVX", "BP", "SHEL", "TOT", "COP", "OXY"],
            "Oil & Gas": ["XOM", "CVX", "BP", "SHEL", "TOT", "ENB", "SU"],
            "Telecommunications": ["VZ", "T", "TMUS", "VOD", "ORAN", "NTT", "BT"],
            "Utilities": ["NEE", "DUK", "SO", "AEP", "EXC", "ED", "XEL"],
            "Industrial": ["GE", "HON", "MMM", "CAT", "DE", "RTX", "EMR"],
            "Aerospace & Defense": ["LMT", "RTX", "BA", "NOC", "GD", "HWM", "TXT"],
            "Real Estate": ["SPG", "O", "PLD", "AMT", "VICI", "AVB", "EQR"],
            "Consumer Staples": ["PG", "KO", "PEP", "WMT", "COST", "CL", "KMB"],
            "Food & Beverages": ["KO", "PEP", "MDLZ", "KHC", "SBUX", "DPS", "STZ"],
            "Media": ["NFLX", "DIS", "CMCSA", "WBD", "PARA", "FOXA", "ROKU"],
            "Entertainment": ["DIS", "NFLX", "WBD", "LYV", "SPOT", "CMCSA", "RBLX"]
        }
        
        # Find peers based on industry or sector (case-insensitive partial matching)
        # Only search if potential_peers wasn't already set by symbol inference
        if not potential_peers:
            search_term_lower = search_term.lower() if search_term else ""
            
            for industry_key, peer_symbols in industry_peers.items():
                if search_term_lower and industry_key.lower() in search_term_lower:
                    potential_peers = peer_symbols
                    print(f"[Python Backend] Found peers for industry key: {industry_key}")
                    break
        
        # If no exact match, try sector-based matching
        if not potential_peers and current_sector:
            sector_peers = {
                "Technology": ["AAPL", "MSFT", "GOOGL", "META", "NVDA", "AMD", "INTC", "CRM", "SAP", "ORCL", "ADBE"],
                "Financial Services": ["JPM", "BAC", "WFC", "C", "GS", "MS", "BLK", "SCHW"],
                "Healthcare": ["JNJ", "PFE", "UNH", "ABT", "TMO", "ABBV", "MRK", "LLY"],
                "Consumer Cyclical": ["AMZN", "TSLA", "NKE", "SBUX", "MCD", "YUM", "CMG", "LULU"],
                "Energy": ["XOM", "CVX", "COP", "SLB", "EOG", "MPC", "VLO", "PSX"],
                "Industrials": ["BA", "CAT", "GE", "HON", "ETN", "EMR", "ITW", "PH"],
                "Consumer Defensive": ["PG", "KO", "PEP", "WMT", "COST", "CL", "KMB", "CHD"],
                "Utilities": ["NEE", "DUK", "SO", "AEP", "SRE", "EXC", "XEL", "PEG"],
                "Real Estate": ["AMT", "PLD", "EQIX", "PSA", "WELL", "SPG", "O", "DLR"],
                "Communication Services": ["GOOGL", "META", "DIS", "NFLX", "T", "VZ", "CMCSA", "WBD"],
                "Basic Materials": ["LIN", "APD", "SHW", "ECL", "DD", "PPG", "FCX", "NEM"]
            }
            sector_lower = current_sector.lower() if current_sector else ""
            for sector_key, peer_symbols in sector_peers.items():
                if sector_lower and sector_key.lower() in sector_lower:
                    potential_peers = peer_symbols
                    print(f"[Python Backend] Found peers for sector: {sector_key}")
                    break
        
        # If still no peers, use a default list of major stocks
        if not potential_peers:
            potential_peers = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "JPM"]
        
        # Remove current symbol from peers
        potential_peers = [p for p in potential_peers if p.upper() != symbol_upper]
        
        # Limit to 5-7 peers
        potential_peers = potential_peers[:5]  # Only 5 peers instead of 7-10
        
        print(f"[Python Backend] Final potential_peers list: {potential_peers}")
        print(f"[Python Backend] Will fetch data for {len(potential_peers)} peers")
        
        # Fetch metrics for each peer using Finnhub API directly - IN PARALLEL for speed
        peers_data = []
        
        def fetch_peer_data(peer_symbol):
            """Helper function to fetch data for a single peer"""
            try:
                print(f"[Python Backend] Fetching data for peer {peer_symbol} using Finnhub...")
                
                # Use Finnhub API directly instead of yfinance
                try:
                    finnhub_data = fetch_from_finnhub(peer_symbol)
                    
                    if finnhub_data:
                        profile = finnhub_data.get("profile", {})
                        financials = finnhub_data.get("financials", {})
                        metrics = financials.get("metric", {}) if financials else {}
                        
                        peer_name = profile.get("name") or profile.get("ticker") or peer_symbol
                        
                        # Extract PE ratios and Price/Book from Finnhub metrics
                        # Finnhub metric keys: peTTM, forwardPE, pb
                        trailing_pe = metrics.get("peTTM") or metrics.get("peExclExtraTTM")
                        forward_pe = metrics.get("forwardPE")
                        price_to_book = metrics.get("pb") or metrics.get("pbAnnual")
                        beta = metrics.get("beta")
                        dividend_yield = metrics.get("currentDividendYieldTTM") or metrics.get("dividendYieldTTM")
                        
                        peer_data = {
                            "symbol": peer_symbol,
                            "name": peer_name,
                            "peRatio": trailing_pe if trailing_pe is not None else None,
                            "peRatioForward": forward_pe if forward_pe is not None else None,
                            "priceToBook": price_to_book if price_to_book is not None else None,
                            "beta": beta if beta is not None else None,
                            "dividendYield": dividend_yield if dividend_yield is not None else None
                        }
                        
                        print(f"[Python Backend] Successfully fetched peer data for {peer_symbol} from Finnhub")
                        return peer_data
                    else:
                        # Fallback: add peer with symbol only
                        peer_data = {
                            "symbol": peer_symbol,
                            "name": peer_symbol,
                            "peRatio": None,
                            "peRatioForward": None,
                            "priceToBook": None,
                            "beta": None,
                            "dividendYield": None
                        }
                        print(f"[Python Backend] Added peer {peer_symbol} with limited data (no Finnhub data)")
                        return peer_data
                        
                except Exception as finnhub_error:
                    print(f"[Python Backend] Error fetching from Finnhub for {peer_symbol}: {finnhub_error}")
                    # Fallback: add peer with symbol only
                    peer_data = {
                        "symbol": peer_symbol,
                        "name": peer_symbol,
                        "peRatio": None,
                        "peRatioForward": None,
                        "priceToBook": None
                    }
                    print(f"[Python Backend] Added peer {peer_symbol} with fallback data (Finnhub error)")
                    return peer_data
                    
            except Exception as e:
                # Even on error, add peer with symbol so it's visible
                print(f"[Python Backend] Unexpected error for peer {peer_symbol}: {e}")
                import traceback
                traceback.print_exc()
                peer_data = {
                    "symbol": peer_symbol,
                    "name": peer_symbol,
                    "peRatio": None,
                    "peRatioForward": None,
                    "priceToBook": None
                }
                print(f"[Python Backend] Added peer {peer_symbol} with fallback data due to error")
                return peer_data
        
        # Fetch all peers in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=5) as executor:
            peers_data = list(executor.map(fetch_peer_data, potential_peers))
        
        print(f"[Python Backend] Total peers_data count: {len(peers_data)}")
        
        return {
            "currentStock": current_stock_data,
            "peers": peers_data,
            "industry": current_industry or current_sector,  # Use sector as fallback for display
            "sector": current_sector
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"[Python Backend] Error fetching peer comparison: {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/api/earnings/{symbol}")
async def get_earnings_data(symbol: str, request: Request):
    """
    Get earnings calendar and surprise data from Finnhub API.
    No rate limiting - this is a secondary endpoint called as part of stock analysis.
    """
    try:
        symbol_upper = symbol.upper()
        
        # Fetch earnings calendar (upcoming and past)
        earnings_url = f"{FINNHUB_BASE_URL}/calendar/earnings"
        earnings_params = {
            "symbol": symbol_upper,
            "from": (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d"),
            "to": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
            "token": FINNHUB_API_KEY
        }
        
        print(f"[Python Backend] Fetching earnings calendar for {symbol_upper}...")
        earnings_response = requests.get(earnings_url, params=earnings_params, timeout=10)
        
        earnings_calendar = []
        if earnings_response.status_code == 200:
            calendar_data = earnings_response.json()
            if calendar_data and 'earningsCalendar' in calendar_data:
                earnings_calendar = calendar_data['earningsCalendar']
        
        # Fetch historical earnings with surprises
        historical_url = f"{FINNHUB_BASE_URL}/stock/earnings"
        historical_params = {
            "symbol": symbol_upper,
            "token": FINNHUB_API_KEY
        }
        
        print(f"[Python Backend] Fetching historical earnings for {symbol_upper}...")
        historical_response = requests.get(historical_url, params=historical_params, timeout=10)
        
        historical_earnings = []
        if historical_response.status_code == 200:
            historical_data = historical_response.json()
            if isinstance(historical_data, list):
                # Get most recent earnings (last 8 quarters)
                historical_earnings = historical_data[:8] if historical_data else []
        
        # Combine and sort by date (newest first)
        all_earnings = []
        
        # Add historical earnings
        for earning in historical_earnings:
            all_earnings.append({
                "date": earning.get("period", ""),
                "period": earning.get("period", ""),
                "epsActual": earning.get("actual"),
                "epsEstimate": earning.get("estimate"),
                "epsSurprise": earning.get("surprise"),
                "epsSurprisePercent": earning.get("surprisePercent"),
                "revenueActual": None,  # Not available in earnings endpoint
                "revenueEstimate": None,
                "revenueSurprise": None,
                "revenueSurprisePercent": None
            })
        
        # Add calendar earnings (if available and not duplicates)
        for earning in earnings_calendar:
            if earning.get("symbol", "").upper() == symbol_upper:
                date_str = earning.get("date", "")
                # Check if not already in historical
                if not any(e["date"] == date_str for e in all_earnings):
                    all_earnings.append({
                        "date": date_str,
                        "period": earning.get("quarter", ""),
                        "epsActual": earning.get("epsActual"),
                        "epsEstimate": earning.get("epsEstimate"),
                        "epsSurprise": earning.get("epsSurprise"),
                        "epsSurprisePercent": earning.get("epsSurprisePercent"),
                        "revenueActual": earning.get("revenueActual"),
                        "revenueEstimate": earning.get("revenueEstimate"),
                        "revenueSurprise": earning.get("revenueSurprise"),
                        "revenueSurprisePercent": earning.get("revenueSurprisePercent")
                    })
        
        # Sort by date (newest first)
        all_earnings.sort(key=lambda x: x.get("date", ""), reverse=True)
        
        print(f"[Python Backend] Found {len(all_earnings)} earnings records for {symbol_upper}")
        
        return {
            "symbol": symbol_upper,
            "earnings": all_earnings[:10]  # Return last 10
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"[Python Backend] Error fetching earnings data: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Error fetching earnings data: {error_msg}")

@app.get("/api/heatmap-quotes")
async def get_heatmap_quotes(symbols: str, request: Request):
    """
    Get all data needed for heatmap (price, market cap, change) from Finnhub
    symbols: comma-separated list of symbols (e.g., "AAPL,MSFT,NVDA")
    Returns: list of quote objects with all needed data
    Protected by session-based rate limiting: 5 minutes usage, then 5 minutes cooldown.
    """
    # Session-based rate limiting
    client_ip = get_remote_address(request)
    # Start session if this is the first API request
    rate_limit_result = check_session_rate_limit(client_ip, start_session_if_new=True)
    if not rate_limit_result["allowed"]:
        raise HTTPException(
            status_code=429,
            detail=f"Session limit exceeded. Please wait {rate_limit_result['retry_after']} seconds.",
            headers={
                "Retry-After": str(rate_limit_result["retry_after"]),
                "X-RateLimit-Type": "session_cooldown"
            }
        )
    
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(',') if s.strip()]
        if not symbol_list:
            raise HTTPException(status_code=400, detail="No symbols provided")
        
        # Check cache first
        cache_key = f"heatmap_quotes_{','.join(sorted(symbol_list))}"
        if cache_key in cache:
            cached_data, cached_time = cache[cache_key]
            if datetime.now() - cached_time < timedelta(minutes=5):  # Cache for 5 minutes
                return cached_data
        
        # Fetch data in parallel using ThreadPoolExecutor for better performance
        # Skip profile fetch for heatmap - only need quote data (price + change)
        def fetch_symbol_data(symbol):
            try:
                # Try multiple symbol formats for German stocks
                symbol_variants = []
                
                # For German stocks (.DE), try multiple formats that Finnhub accepts
                if '.DE' in symbol.upper():
                    base_symbol = symbol.upper().replace('.DE', '')
                    # Finnhub format priority: SYMBOL.F (Frankfurt), SYMBOL-DE (Xetra), SYMBOL
                    symbol_variants = [
                        f"{base_symbol}.F",  # Frankfurt format (most reliable for German stocks)
                        symbol.upper().replace('.DE', '.F'),  # Direct Frankfurt format
                        symbol.upper().replace('.', '-'),  # SAP.DE -> SAP-DE (Xetra)
                        base_symbol,  # Just the symbol
                        symbol.upper(),  # Original format
                    ]
                else:
                    symbol_variants = [symbol.upper()]
                
                # Try each variant until one works
                for finnhub_symbol in symbol_variants:
                    try:
                        # Only fetch quote data - profile is not needed for heatmap
                        quote_url = f"{FINNHUB_BASE_URL}/quote"
                        quote_params = {
                            "symbol": finnhub_symbol,
                            "token": FINNHUB_API_KEY
                        }
                        
                        # Single request with short timeout for speed
                        quote_response = requests.get(quote_url, params=quote_params, timeout=5)
                        
                        if quote_response.status_code == 200:
                            quote_data = quote_response.json()
                            
                            # Extract data
                            current_price = quote_data.get("c")  # current price
                            previous_close = quote_data.get("pc")  # previous close
                            change = quote_data.get("d")  # change
                            change_percent = quote_data.get("dp")  # change percent
                            
                            if current_price and current_price > 0:
                                # Return with the original symbol format for proper matching
                                return {
                                    "symbol": symbol,  # Keep original symbol format (e.g., SAP.DE)
                                    "regularMarketPrice": current_price,
                                    "regularMarketPreviousClose": previous_close,
                                    "regularMarketChange": change,
                                    "regularMarketChangePercent": change_percent,
                                    "marketCap": None  # Not needed for heatmap
                                }
                    except requests.exceptions.Timeout:
                        # Try next variant quickly
                        continue
                    except Exception as e:
                        # Try next variant
                        continue
                
                return None
                
            except Exception as e:
                print(f"[Heatmap Quotes] Error fetching {symbol}: {e}")
                return None
        
        # Use ThreadPoolExecutor to fetch in parallel
        # Use 40 workers to fetch all DAX stocks simultaneously
        max_workers = min(40, len(symbol_list))  # Max 40 workers for DAX 40
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            results = list(executor.map(fetch_symbol_data, symbol_list))
            results = [r for r in results if r is not None]  # Filter out None values
        
        print(f"[Heatmap Quotes] Successfully fetched {len(results)} out of {len(symbol_list)} symbols")
        
        result = {
            "quoteResponse": {
                "result": results,
                "error": None
            }
        }
        
        # Cache the result
        cache[cache_key] = (result, datetime.now())
        
        return result
        
    except Exception as e:
        print(f"[Heatmap Quotes] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching heatmap quotes: {str(e)}")

# =============================================================================
# FAST BATCH QUOTE FETCHING FOR HEATMAPS
# =============================================================================

def fetch_batch_quotes(symbols: list, name_map: dict = None, sector_map: dict = None):
    """
    Fetch quotes for multiple symbols in a single batch request.
    Much faster than individual requests - can fetch 100+ stocks in ~500ms.
    """
    if not symbols:
        return []
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    results = []
    chunk_size = 150
    
    for i in range(0, len(symbols), chunk_size):
        chunk = symbols[i:i + chunk_size]
        symbols_str = ','.join(chunk)
        
        try:
            url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={symbols_str}"
            response = requests.get(url, headers=headers, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'quoteResponse' in data and 'result' in data['quoteResponse']:
                    for quote in data['quoteResponse']['result']:
                        symbol = quote.get('symbol', '')
                        current_price = quote.get('regularMarketPrice')
                        previous_close = quote.get('regularMarketPreviousClose')
                        change = quote.get('regularMarketChange')
                        change_percent = quote.get('regularMarketChangePercent')
                        
                        if current_price and current_price > 0:
                            result = {
                                "symbol": symbol,
                                "regularMarketPrice": round(current_price, 2),
                                "regularMarketPreviousClose": round(previous_close, 2) if previous_close else round(current_price, 2),
                                "regularMarketChange": round(change, 2) if change else 0,
                                "regularMarketChangePercent": round(change_percent, 2) if change_percent else 0
                            }
                            if name_map and symbol in name_map:
                                result["name"] = name_map[symbol]
                            if sector_map and symbol in sector_map:
                                result["sector"] = sector_map[symbol]
                            results.append(result)
            else:
                print(f"[Batch Quote] HTTP {response.status_code} for chunk {i//chunk_size + 1}")
                
        except Exception as e:
            print(f"[Batch Quote] Error fetching chunk {i//chunk_size + 1}: {e}")
    
    return results


def fetch_chart_quotes_parallel(symbols: list, name_map: dict = None, sector_map: dict = None):
    """
    Fallback: Fetch quotes using chart API in parallel (for international stocks).
    Slower than batch but more reliable for .DE, .T, .HK stocks.
    """
    if not symbols:
        return []
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    def fetch_single(symbol):
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5d"
            response = requests.get(url, headers=headers, timeout=8)
            
            if response.status_code == 200:
                data = response.json()
                if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                    result = data['chart']['result'][0]
                    meta = result.get('meta', {})
                    
                    current_price = meta.get('regularMarketPrice')
                    previous_close = meta.get('previousClose') or meta.get('chartPreviousClose')
                    
                    if not current_price:
                        indicators = result.get('indicators', {})
                        quote = indicators.get('quote', [{}])[0]
                        closes = quote.get('close', [])
                        if closes:
                            valid_closes = [c for c in closes if c is not None]
                            if valid_closes:
                                current_price = valid_closes[-1]
                                if len(valid_closes) >= 2:
                                    previous_close = valid_closes[-2]
                    
                    if current_price and current_price > 0:
                        if not previous_close or previous_close <= 0:
                            previous_close = current_price
                        
                        change = current_price - previous_close
                        change_percent = (change / previous_close) * 100 if previous_close > 0 else 0
                        
                        res = {
                            "symbol": symbol,
                            "regularMarketPrice": round(current_price, 2),
                            "regularMarketPreviousClose": round(previous_close, 2),
                            "regularMarketChange": round(change, 2),
                            "regularMarketChangePercent": round(change_percent, 2)
                        }
                        if name_map and symbol in name_map:
                            res["name"] = name_map[symbol]
                        if sector_map and symbol in sector_map:
                            res["sector"] = sector_map[symbol]
                        return res
            return None
        except:
            return None
    
    with ThreadPoolExecutor(max_workers=30) as executor:
        results = list(executor.map(fetch_single, symbols))
        return [r for r in results if r is not None]


@app.get("/api/dax-heatmap")
async def get_dax_heatmap(request: Request):
    """
    Get all DAX 40 stock data for heatmap.
    Uses parallel chart API calls (more reliable for .DE stocks).
    """
    client_ip = request.client.host
    
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
    
    try:
        cache_key = "dax_heatmap_data"
        if cache_key in cache:
            cached_data, cached_time = cache[cache_key]
            if datetime.now() - cached_time < timedelta(minutes=5):
                print(f"[DAX Heatmap] Returning cached data ({len(cached_data.get('quoteResponse', {}).get('result', []))} stocks)")
                return cached_data
        
        # DAX 40 stocks
        dax_stocks = [
            ('ADS.DE', 'Adidas'), ('ALV.DE', 'Allianz'), ('BAS.DE', 'BASF'),
            ('BAYN.DE', 'Bayer'), ('BEI.DE', 'Beiersdorf'), ('BMW.DE', 'BMW'),
            ('CON.DE', 'Continental'), ('1COV.DE', 'Covestro'), ('DBK.DE', 'Deutsche Bank'),
            ('DB1.DE', 'Deutsche Boerse'), ('DHL.DE', 'DHL Group'), ('DTE.DE', 'Deutsche Telekom'),
            ('EOAN.DE', 'E.ON'), ('FRE.DE', 'Fresenius'), ('HEI.DE', 'Heidelberg Materials'),
            ('HEN3.DE', 'Henkel'), ('IFX.DE', 'Infineon'), ('MRK.DE', 'Merck'),
            ('MTX.DE', 'MTU Aero Engines'), ('MUV2.DE', 'Munich Re'), ('PAH3.DE', 'Porsche Holding'),
            ('P911.DE', 'Porsche AG'), ('PUM.DE', 'Puma'), ('QIA.DE', 'Qiagen'),
            ('RHM.DE', 'Rheinmetall'), ('RWE.DE', 'RWE'), ('SAP.DE', 'SAP'),
            ('SIE.DE', 'Siemens'), ('ENR.DE', 'Siemens Energy'), ('SHL.DE', 'Siemens Healthineers'),
            ('SY1.DE', 'Symrise'), ('VOW3.DE', 'Volkswagen'), ('VNA.DE', 'Vonovia'),
            ('ZAL.DE', 'Zalando'), ('AIR.DE', 'Airbus'), ('HNR1.DE', 'Hannover Re'),
            ('SRT3.DE', 'Sartorius'), ('CBK.DE', 'Commerzbank'), ('BNR.DE', 'Brenntag'),
            ('FME.DE', 'Fresenius Medical Care'),
        ]
        
        symbols = [s[0] for s in dax_stocks]
        name_map = {s[0]: s[1] for s in dax_stocks}
        
        print(f"[DAX Heatmap] Fetching {len(symbols)} stocks using parallel chart API...")
        import time as t
        start = t.time()
        
        # Use chart API for German stocks (more reliable than batch quote API for .DE)
        results = fetch_chart_quotes_parallel(symbols, name_map=name_map)
        
        elapsed = (t.time() - start) * 1000
        print(f"[DAX Heatmap] Chart API returned {len(results)} stocks in {elapsed:.0f}ms")
        
        response_data = {
            "quoteResponse": {
                "result": results,
                "error": None,
                "count": len(results)
            }
        }
        
        cache[cache_key] = (response_data, datetime.now())
        return response_data
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DAX Heatmap] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching DAX heatmap data: {str(e)}")


@app.get("/api/sp500-heatmap")
async def get_sp500_heatmap(request: Request):
    """
    Get all S&P 500 stock data for heatmap using Yahoo Finance batch quote API.
    FAST: Fetches all ~500 stocks in 3-4 batch API calls (~800ms total).
    """
    client_ip = request.client.host
    
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
    
    try:
        cache_key = "sp500_heatmap_data"
        if cache_key in cache:
            cached_data, cached_time = cache[cache_key]
            if datetime.now() - cached_time < timedelta(minutes=5):
                print(f"[S&P 500 Heatmap] Returning cached data ({len(cached_data.get('quoteResponse', {}).get('result', []))} stocks)")
                return cached_data
        
        # S&P 500 stocks by sector
        sp500_by_sector = {
            'Information Technology': [
                'AAPL', 'MSFT', 'NVDA', 'AVGO', 'ORCL', 'CRM', 'ADBE', 'AMD', 'CSCO', 'ACN',
                'INTC', 'IBM', 'QCOM', 'TXN', 'INTU', 'AMAT', 'NOW', 'ADI', 'LRCX', 'MU',
                'KLAC', 'SNPS', 'CDNS', 'PANW', 'FTNT', 'MCHP', 'MSI', 'APH', 'NXPI', 'TEL',
                'ADSK', 'HPQ', 'CTSH', 'IT', 'ROP', 'GLW', 'ON', 'ANSS', 'KEYS', 'MPWR',
                'CDW', 'HPE', 'FSLR', 'TYL', 'ZBRA', 'TRMB', 'PTC', 'TDY', 'SWKS', 'NTAP'
            ],
            'Health Care': [
                'LLY', 'UNH', 'JNJ', 'ABBV', 'MRK', 'TMO', 'ABT', 'PFE', 'DHR', 'AMGN',
                'BMY', 'MDT', 'ISRG', 'ELV', 'GILD', 'VRTX', 'SYK', 'BSX', 'REGN', 'CI',
                'ZTS', 'CVS', 'BDX', 'MCK', 'HCA', 'EW', 'HUM', 'IDXX', 'IQV', 'CNC',
                'A', 'GEHC', 'DXCM', 'RMD', 'MTD', 'CAH', 'BIIB', 'BAX', 'WST', 'CRL',
                'COO', 'HOLX', 'MOH', 'ALGN', 'ZBH', 'ILMN', 'LH', 'DGX', 'TECH', 'RVTY'
            ],
            'Financials': [
                'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'SPGI', 'AXP',
                'BLK', 'C', 'SCHW', 'PGR', 'CB', 'MMC', 'CME', 'ICE', 'USB', 'AON',
                'MCO', 'PNC', 'TFC', 'AIG', 'MET', 'AJG', 'AFL', 'TRV', 'PRU', 'ALL',
                'MSCI', 'BK', 'COF', 'FIS', 'DFS', 'STT', 'FITB', 'NDAQ', 'TROW', 'HIG',
                'MTB', 'CINF', 'RJF', 'NTRS', 'SYF', 'WRB', 'KEY', 'HBAN', 'L', 'CFG'
            ],
            'Consumer Discretionary': [
                'AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'LOW', 'BKNG', 'TJX', 'SBUX', 'CMG',
                'ORLY', 'MAR', 'GM', 'AZO', 'HLT', 'F', 'ROST', 'DHI', 'YUM', 'LULU',
                'LEN', 'NVR', 'DECK', 'EBAY', 'ULTA', 'GRMN', 'PHM', 'GPC', 'DRI', 'RCL',
                'LVS', 'POOL', 'WYNN', 'CZR', 'CCL', 'EXPE', 'KMX', 'DPZ', 'BBY', 'APTV'
            ],
            'Communication Services': [
                'GOOGL', 'GOOG', 'META', 'NFLX', 'DIS', 'CMCSA', 'VZ', 'T', 'TMUS', 'CHTR',
                'EA', 'WBD', 'TTWO', 'OMC', 'LYV', 'MTCH', 'IPG', 'NWSA', 'PARA', 'FOX'
            ],
            'Industrials': [
                'GE', 'CAT', 'RTX', 'HON', 'UNP', 'UPS', 'BA', 'DE', 'LMT', 'ADP',
                'ETN', 'WM', 'ITW', 'GD', 'NOC', 'EMR', 'PH', 'CSX', 'NSC', 'TT',
                'FDX', 'JCI', 'PCAR', 'CARR', 'CTAS', 'ODFL', 'ROK', 'CPRT', 'CMI', 'AME',
                'FAST', 'PAYX', 'VRSK', 'GWW', 'RSG', 'PWR', 'LHX', 'OTIS', 'EFX', 'XYL',
                'WAB', 'DOV', 'HWM', 'IR', 'DAL', 'SWK', 'LUV', 'UAL', 'URI', 'JBHT'
            ],
            'Consumer Staples': [
                'PG', 'COST', 'KO', 'PEP', 'WMT', 'PM', 'MO', 'MDLZ', 'TGT', 'CL',
                'KMB', 'STZ', 'GIS', 'ADM', 'SYY', 'KHC', 'HSY', 'MKC', 'KDP', 'K',
                'EL', 'KR', 'CLX', 'MNST', 'CHD', 'TSN', 'CAG', 'HRL', 'CPB', 'SJM'
            ],
            'Energy': [
                'XOM', 'CVX', 'COP', 'SLB', 'MPC', 'EOG', 'PXD', 'PSX', 'VLO', 'OXY',
                'WMB', 'HES', 'KMI', 'OKE', 'HAL', 'DVN', 'FANG', 'BKR', 'CTRA', 'TRGP'
            ],
            'Utilities': [
                'NEE', 'DUK', 'SO', 'D', 'SRE', 'AEP', 'CEG', 'PCG', 'EXC', 'XEL',
                'ED', 'WEC', 'EIX', 'AWK', 'DTE', 'ES', 'ETR', 'AEE', 'PPL', 'FE',
                'CMS', 'CNP', 'EVRG', 'ATO', 'NI', 'LNT', 'NRG', 'PNW', 'AES', 'PEG'
            ],
            'Real Estate': [
                'PLD', 'AMT', 'EQIX', 'WELL', 'PSA', 'SPG', 'DLR', 'O', 'CCI', 'VICI',
                'CBRE', 'AVB', 'EQR', 'WY', 'SBAC', 'ARE', 'EXR', 'MAA', 'INVH', 'IRM',
                'VTR', 'ESS', 'KIM', 'HST', 'UDR', 'REG', 'CPT', 'BXP', 'FRT'
            ],
            'Materials': [
                'LIN', 'SHW', 'APD', 'FCX', 'ECL', 'NUE', 'NEM', 'DD', 'DOW', 'CTVA',
                'VMC', 'MLM', 'PPG', 'ALB', 'CE', 'IFF', 'LYB', 'CF', 'BALL', 'PKG',
                'MOS', 'FMC', 'AVY', 'EMN', 'AMCR', 'IP', 'WRK', 'SEE'
            ]
        }
        
        # Build symbol list and sector map
        symbols = []
        sector_map = {}
        for sector, sector_symbols in sp500_by_sector.items():
            for symbol in sector_symbols:
                symbols.append(symbol)
                sector_map[symbol] = sector
        
        print(f"[S&P 500 Heatmap] Fetching {len(symbols)} stocks...")
        import time as t
        start = t.time()
        
        # Try batch API first (faster for US stocks)
        results = fetch_batch_quotes(symbols, sector_map=sector_map)
        
        elapsed = (t.time() - start) * 1000
        print(f"[S&P 500 Heatmap] Batch API returned {len(results)} stocks in {elapsed:.0f}ms")
        
        # If batch API returned less than 50% of stocks, fall back to chart API
        if len(results) < len(symbols) * 0.5:
            print(f"[S&P 500 Heatmap] Batch API insufficient, using parallel chart API fallback...")
            start = t.time()
            results = fetch_chart_quotes_parallel(symbols, sector_map=sector_map)
            elapsed = (t.time() - start) * 1000
            print(f"[S&P 500 Heatmap] Chart API returned {len(results)} stocks in {elapsed:.0f}ms")
        
        # Sort by sector
        results.sort(key=lambda x: (x.get('sector', ''), x['symbol']))
        
        response_data = {
            "quoteResponse": {
                "result": results,
                "error": None,
                "count": len(results),
                "sectors": list(sp500_by_sector.keys())
            }
        }
        
        cache[cache_key] = (response_data, datetime.now())
        return response_data
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[S&P 500 Heatmap] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching S&P 500 heatmap data: {str(e)}")


@app.get("/api/nikkei225-heatmap")
async def get_nikkei225_heatmap(request: Request):
    """
    Get Nikkei 225 stock data for heatmap using Yahoo Finance batch quote API.
    FAST: Fetches all ~100 stocks in a single API call (~400ms).
    """
    client_ip = request.client.host
    
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
    
    try:
        cache_key = "nikkei225_heatmap_data"
        if cache_key in cache:
            cached_data, cached_time = cache[cache_key]
            if datetime.now() - cached_time < timedelta(minutes=5):
                print(f"[Nikkei 225 Heatmap] Returning cached data ({len(cached_data.get('quoteResponse', {}).get('result', []))} stocks)")
                return cached_data
        
        # Major Nikkei 225 stocks (.T suffix for Tokyo Stock Exchange)
        nikkei_stocks = [
            ('7203.T', 'Toyota'), ('6758.T', 'Sony'), ('9984.T', 'SoftBank'),
            ('6861.T', 'Keyence'), ('8306.T', 'MUFJ'), ('9432.T', 'NTT'),
            ('6501.T', 'Hitachi'), ('7741.T', 'HOYA'), ('4063.T', 'Shin-Etsu'),
            ('8035.T', 'Tokyo Electron'), ('6098.T', 'Recruit'), ('6594.T', 'Nidec'),
            ('4519.T', 'Chugai'), ('7974.T', 'Nintendo'), ('9433.T', 'KDDI'),
            ('4502.T', 'Takeda'), ('6367.T', 'Daikin'), ('8058.T', 'Mitsubishi'),
            ('8316.T', 'SMFG'), ('6971.T', 'Kyocera'), ('6752.T', 'Panasonic'),
            ('7267.T', 'Honda'), ('4568.T', 'Daiichi Sankyo'), ('6762.T', 'TDK'),
            ('7751.T', 'Canon'), ('4661.T', 'Oriental Land'), ('8766.T', 'Tokio Marine'),
            ('8001.T', 'Itochu'), ('9020.T', 'JR East'), ('2914.T', 'JT'),
            ('6954.T', 'Fanuc'), ('8031.T', 'Mitsui'), ('3382.T', 'Seven & I'),
            ('4503.T', 'Astellas'), ('9022.T', 'JR Central'), ('6981.T', 'Murata'),
            ('5108.T', 'Bridgestone'), ('4911.T', 'Shiseido'), ('6702.T', 'Fujitsu'),
            ('8411.T', 'Mizuho'), ('6301.T', 'Komatsu'), ('8802.T', 'Mitsubishi Estate'),
            ('4901.T', 'Fujifilm'), ('6503.T', 'Mitsubishi Electric'), ('8591.T', 'Orix'),
            ('2502.T', 'Asahi'), ('4452.T', 'Kao'), ('7269.T', 'Suzuki'),
            ('8750.T', 'Dai-ichi Life'), ('5401.T', 'Nippon Steel'), ('7201.T', 'Nissan'),
            ('2801.T', 'Kikkoman'), ('6506.T', 'Yaskawa'), ('4543.T', 'Terumo'),
            ('7011.T', 'MHI'), ('6857.T', 'Advantest'), ('6723.T', 'Renesas'),
            ('9766.T', 'Konami'), ('4578.T', 'Otsuka'), ('8267.T', 'Aeon'),
            ('7270.T', 'Subaru'), ('6326.T', 'Kubota'), ('9613.T', 'NTT Data'),
            ('8604.T', 'Nomura'), ('9983.T', 'Fast Retailing'), ('4755.T', 'Rakuten'),
            ('2413.T', 'M3'), ('6273.T', 'SMC'), ('9434.T', 'SoftBank Corp'),
            ('6988.T', 'Nitto Denko'), ('4523.T', 'Eisai'), ('7832.T', 'Bandai Namco'),
            ('6645.T', 'Omron'), ('4689.T', 'Z Holdings'), ('6504.T', 'Fuji Electric'),
            ('6526.T', 'Socionext'), ('3407.T', 'Asahi Kasei'), ('6902.T', 'Denso'),
        ]
        
        symbols = [s[0] for s in nikkei_stocks]
        name_map = {s[0]: s[1] for s in nikkei_stocks}
        
        print(f"[Nikkei 225 Heatmap] Fetching {len(symbols)} stocks using parallel chart API...")
        import time as t
        start = t.time()
        
        # Use chart API for Japanese stocks (more reliable for .T suffix)
        results = fetch_chart_quotes_parallel(symbols, name_map=name_map)
        
        elapsed = (t.time() - start) * 1000
        print(f"[Nikkei 225 Heatmap] Chart API returned {len(results)} stocks in {elapsed:.0f}ms")
        
        response_data = {
            "quoteResponse": {
                "result": results,
                "error": None,
                "count": len(results)
            }
        }
        
        cache[cache_key] = (response_data, datetime.now())
        return response_data
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Nikkei 225 Heatmap] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching Nikkei 225 heatmap data: {str(e)}")


@app.get("/api/nasdaq100-heatmap")
async def get_nasdaq100_heatmap(request: Request):
    """
    Get Nasdaq 100 stock data for heatmap using Yahoo Finance batch quote API.
    FAST: Fetches all 100 stocks in a single API call (~400ms).
    """
    client_ip = request.client.host
    
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
    
    try:
        cache_key = "nasdaq100_heatmap_data"
        if cache_key in cache:
            cached_data, cached_time = cache[cache_key]
            if datetime.now() - cached_time < timedelta(minutes=5):
                print(f"[Nasdaq 100 Heatmap] Returning cached data ({len(cached_data.get('quoteResponse', {}).get('result', []))} stocks)")
                return cached_data
        
        # Nasdaq 100 stocks
        nasdaq100_stocks = [
            ('AAPL', 'Apple'), ('MSFT', 'Microsoft'), ('AMZN', 'Amazon'), ('NVDA', 'NVIDIA'),
            ('GOOGL', 'Alphabet A'), ('META', 'Meta'), ('TSLA', 'Tesla'), ('AVGO', 'Broadcom'),
            ('COST', 'Costco'), ('GOOG', 'Alphabet C'), ('NFLX', 'Netflix'), ('AMD', 'AMD'),
            ('ADBE', 'Adobe'), ('PEP', 'PepsiCo'), ('CSCO', 'Cisco'), ('TMUS', 'T-Mobile'),
            ('INTC', 'Intel'), ('CMCSA', 'Comcast'), ('QCOM', 'Qualcomm'), ('INTU', 'Intuit'),
            ('TXN', 'Texas Inst'), ('HON', 'Honeywell'), ('AMGN', 'Amgen'), ('AMAT', 'Applied Mat'),
            ('BKNG', 'Booking'), ('ISRG', 'Intuitive'), ('SBUX', 'Starbucks'), ('VRTX', 'Vertex'),
            ('ADP', 'ADP'), ('LRCX', 'Lam Research'), ('GILD', 'Gilead'), ('MU', 'Micron'),
            ('MDLZ', 'Mondelez'), ('ADI', 'Analog Dev'), ('REGN', 'Regeneron'), ('PANW', 'Palo Alto'),
            ('SNPS', 'Synopsys'), ('KLAC', 'KLA'), ('CDNS', 'Cadence'), ('ASML', 'ASML'),
            ('PDD', 'PDD'), ('MELI', 'MercadoLibre'), ('PYPL', 'PayPal'), ('CTAS', 'Cintas'),
            ('ORLY', 'OReilly'), ('ABNB', 'Airbnb'), ('FTNT', 'Fortinet'), ('CSX', 'CSX'),
            ('MAR', 'Marriott'), ('MNST', 'Monster'), ('NXPI', 'NXP'), ('MRVL', 'Marvell'),
            ('PCAR', 'PACCAR'), ('WDAY', 'Workday'), ('DXCM', 'DexCom'), ('AEP', 'AEP'),
            ('KDP', 'Keurig'), ('CPRT', 'Copart'), ('ROP', 'Roper'), ('MCHP', 'Microchip'),
            ('CEG', 'Constellation'), ('AZN', 'AstraZeneca'), ('EXC', 'Exelon'), ('PAYX', 'Paychex'),
            ('ROST', 'Ross'), ('LULU', 'Lululemon'), ('IDXX', 'IDEXX'), ('ODFL', 'Old Dominion'),
            ('KHC', 'Kraft Heinz'), ('FAST', 'Fastenal'), ('GEHC', 'GE Healthcare'), ('VRSK', 'Verisk'),
            ('EA', 'EA'), ('CTSH', 'Cognizant'), ('BKR', 'Baker Hughes'), ('XEL', 'Xcel'),
            ('ON', 'ON Semi'), ('CSGP', 'CoStar'), ('ZS', 'Zscaler'), ('DDOG', 'Datadog'),
            ('FANG', 'Diamondback'), ('ANSS', 'ANSYS'), ('DLTR', 'Dollar Tree'), ('TTD', 'Trade Desk'),
            ('ILMN', 'Illumina'), ('WBD', 'Warner Bros'), ('TEAM', 'Atlassian'), ('ALGN', 'Align'),
            ('GFS', 'GlobalFoundries'), ('CRWD', 'CrowdStrike'), ('BIIB', 'Biogen'), ('MDB', 'MongoDB'),
            ('DASH', 'DoorDash'), ('ENPH', 'Enphase'), ('SIRI', 'Sirius'), ('LCID', 'Lucid'),
            ('RIVN', 'Rivian'), ('ZM', 'Zoom'), ('OKTA', 'Okta'), ('SPLK', 'Splunk'),
        ]
        
        symbols = [s[0] for s in nasdaq100_stocks]
        name_map = {s[0]: s[1] for s in nasdaq100_stocks}
        
        print(f"[Nasdaq 100 Heatmap] Fetching {len(symbols)} stocks...")
        import time as t
        start = t.time()
        
        # Try batch API first
        results = fetch_batch_quotes(symbols, name_map=name_map)
        
        elapsed = (t.time() - start) * 1000
        print(f"[Nasdaq 100 Heatmap] Batch API returned {len(results)} stocks in {elapsed:.0f}ms")
        
        # Fallback to chart API if batch returned less than 50%
        if len(results) < len(symbols) * 0.5:
            print(f"[Nasdaq 100 Heatmap] Batch API insufficient, using parallel chart API fallback...")
            start = t.time()
            results = fetch_chart_quotes_parallel(symbols, name_map=name_map)
            elapsed = (t.time() - start) * 1000
            print(f"[Nasdaq 100 Heatmap] Chart API returned {len(results)} stocks in {elapsed:.0f}ms")
        
        response_data = {
            "quoteResponse": {
                "result": results,
                "error": None,
                "count": len(results)
            }
        }
        
        cache[cache_key] = (response_data, datetime.now())
        return response_data
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Nasdaq 100 Heatmap] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching Nasdaq 100 heatmap data: {str(e)}")


@app.get("/api/hangseng-heatmap")
async def get_hangseng_heatmap(request: Request):
    """
    Get Hang Seng Index stock data for heatmap using Yahoo Finance batch quote API.
    FAST: Fetches all ~85 stocks in a single API call (~400ms).
    """
    client_ip = request.client.host
    
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
    
    try:
        cache_key = "hangseng_heatmap_data"
        if cache_key in cache:
            cached_data, cached_time = cache[cache_key]
            if datetime.now() - cached_time < timedelta(minutes=5):
                print(f"[Hang Seng Heatmap] Returning cached data ({len(cached_data.get('quoteResponse', {}).get('result', []))} stocks)")
                return cached_data
        
        # Major Hang Seng Index stocks (.HK suffix)
        hangseng_stocks = [
            ('0700.HK', 'Tencent'), ('9988.HK', 'Alibaba'), ('0941.HK', 'China Mobile'),
            ('1299.HK', 'AIA'), ('0005.HK', 'HSBC'), ('0939.HK', 'CCB'),
            ('1398.HK', 'ICBC'), ('2318.HK', 'Ping An'), ('3988.HK', 'BOC'),
            ('0883.HK', 'CNOOC'), ('0388.HK', 'HKEX'), ('0016.HK', 'SHK Properties'),
            ('0027.HK', 'Galaxy'), ('0002.HK', 'CLP'), ('0003.HK', 'HK Gas'),
            ('0011.HK', 'Hang Seng Bank'), ('0012.HK', 'Henderson'), ('0017.HK', 'New World'),
            ('0066.HK', 'MTR'), ('0175.HK', 'Geely'), ('0267.HK', 'CITIC'),
            ('0288.HK', 'WH Group'), ('0386.HK', 'Sinopec'), ('0688.HK', 'China Overseas'),
            ('0762.HK', 'China Unicom'), ('0823.HK', 'Link REIT'), ('0857.HK', 'PetroChina'),
            ('1038.HK', 'CK Infra'), ('1093.HK', 'CSPC'), ('1113.HK', 'CK Asset'),
            ('1177.HK', 'Sino Biopharm'), ('1211.HK', 'BYD'), ('1288.HK', 'ABC'),
            ('1810.HK', 'Xiaomi'), ('1928.HK', 'Sands China'), ('2020.HK', 'ANTA'),
            ('2269.HK', 'WuXi Bio'), ('2313.HK', 'Shenzhou'), ('2319.HK', 'Mengniu'),
            ('2331.HK', 'Li Ning'), ('2382.HK', 'Sunny Optical'), ('2388.HK', 'BOCHK'),
            ('2628.HK', 'China Life'), ('2688.HK', 'ENN'), ('3690.HK', 'Meituan'),
            ('3968.HK', 'CMB'), ('9618.HK', 'JD'), ('9633.HK', 'Nongfu'),
            ('9888.HK', 'Baidu'), ('9901.HK', 'NetEase'), ('9961.HK', 'Trip.com'),
            ('0001.HK', 'CK Hutchison'), ('0006.HK', 'Power Assets'), ('0019.HK', 'Swire'),
            ('0083.HK', 'Sino Land'), ('0151.HK', 'Want Want'), ('0241.HK', 'Ali Health'),
            ('0291.HK', 'CR Beer'), ('0669.HK', 'Techtronic'), ('0728.HK', 'China Telecom'),
            ('0992.HK', 'Lenovo'), ('1024.HK', 'Kuaishou'), ('1088.HK', 'Shenhua'),
        ]
        
        symbols = [s[0] for s in hangseng_stocks]
        name_map = {s[0]: s[1] for s in hangseng_stocks}
        
        print(f"[Hang Seng Heatmap] Fetching {len(symbols)} stocks using parallel chart API...")
        import time as t
        start = t.time()
        
        # Use chart API for HK stocks (more reliable for .HK suffix)
        results = fetch_chart_quotes_parallel(symbols, name_map=name_map)
        
        elapsed = (t.time() - start) * 1000
        print(f"[Hang Seng Heatmap] Chart API returned {len(results)} stocks in {elapsed:.0f}ms")
        
        response_data = {
            "quoteResponse": {
                "result": results,
                "error": None,
                "count": len(results)
            }
        }
        
        cache[cache_key] = (response_data, datetime.now())
        return response_data
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Hang Seng Heatmap] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching Hang Seng heatmap data: {str(e)}")


@app.get("/api/market-cap")
async def get_market_cap(symbols: str, request: Request):
    """
    Get market cap for multiple symbols from Finnhub
    symbols: comma-separated list of symbols (e.g., "AAPL,MSFT,NVDA")
    Returns: dict with symbol -> marketCap mapping
    Protected by session-based rate limiting: 5 minutes usage, then 5 minutes cooldown.
    """
    # Session-based rate limiting
    client_ip = get_remote_address(request)
    # Start session if this is the first API request
    rate_limit_result = check_session_rate_limit(client_ip, start_session_if_new=True)
    if not rate_limit_result["allowed"]:
        raise HTTPException(
            status_code=429,
            detail=f"Session limit exceeded. Please wait {rate_limit_result['retry_after']} seconds.",
            headers={
                "Retry-After": str(rate_limit_result["retry_after"]),
                "X-RateLimit-Type": "session_cooldown"
            }
        )
    
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(',') if s.strip()]
        if not symbol_list:
            raise HTTPException(status_code=400, detail="No symbols provided")
        
        # Check cache first
        cache_key = f"market_cap_{','.join(sorted(symbol_list))}"
        if cache_key in cache:
            cached_data, cached_time = cache[cache_key]
            if datetime.now() - cached_time < CACHE_DURATION:
                return cached_data
        
        market_caps = {}
        
        # Fetch market cap for each symbol from Finnhub
        for symbol in symbol_list:
            try:
                # Normalize symbol (e.g., DHL.DE -> DHL-DE for Finnhub)
                finnhub_symbol = symbol.replace('.', '-')
                
                quote_url = f"{FINNHUB_BASE_URL}/quote"
                params = {
                    "symbol": finnhub_symbol,
                    "token": FINNHUB_API_KEY
                }
                
                response = requests.get(quote_url, params=params, timeout=10)
                response.raise_for_status()
                quote_data = response.json()
                
                # Finnhub quote returns: c (current price), h (high), l (low), o (open), pc (previous close), t (timestamp)
                # Market cap is not in quote, need to use profile2 or metric
                # Let's try profile2 first
                profile_url = f"{FINNHUB_BASE_URL}/stock/profile2"
                profile_params = {
                    "symbol": finnhub_symbol,
                    "token": FINNHUB_API_KEY
                }
                
                profile_response = requests.get(profile_url, params=profile_params, timeout=10)
                if profile_response.status_code == 200:
                    profile_data = profile_response.json()
                    # Finnhub profile2 has marketCapitalization
                    market_cap = profile_data.get("marketCapitalization")
                    if market_cap:
                        market_caps[symbol] = market_cap
                        continue
                
                # If profile2 doesn't have it, try metric
                metric_url = f"{FINNHUB_BASE_URL}/stock/metric"
                metric_params = {
                    "symbol": finnhub_symbol,
                    "metric": "all",
                    "token": FINNHUB_API_KEY
                }
                
                metric_response = requests.get(metric_url, params=metric_params, timeout=10)
                if metric_response.status_code == 200:
                    metric_data = metric_response.json()
                    # Check various possible fields
                    if isinstance(metric_data, dict):
                        market_cap = (
                            metric_data.get("metric", {}).get("marketCapitalization") or
                            metric_data.get("marketCapitalization") or
                            None
                        )
                        if market_cap:
                            market_caps[symbol] = market_cap
                            continue
                
                # If still no market cap, log but don't fail
                print(f"[Market Cap] No market cap found for {symbol}")
                market_caps[symbol] = None
                
                # Small delay to avoid rate limiting
                time.sleep(0.1)
                
            except Exception as e:
                print(f"[Market Cap] Error fetching market cap for {symbol}: {e}")
                market_caps[symbol] = None
                continue
        
        result = {
            "marketCaps": market_caps
        }
        
        # Cache the result
        cache[cache_key] = (result, datetime.now())
        
        return result
        
    except Exception as e:
        print(f"[Market Cap] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching market cap: {str(e)}")


# ============================================================
# STATIC FILE SERVING & SPA ROUTING
# ============================================================

# Get the directory where this script is located
BASE_DIR = Path(__file__).resolve().parent

# Serve static files from src directory
app.mount("/src", StaticFiles(directory=BASE_DIR / "src"), name="src")

# Serve styles.css
@app.get("/styles.css")
async def serve_styles():
    return FileResponse(BASE_DIR / "styles.css", media_type="text/css")

# Serve index.html for root
@app.get("/")
async def serve_root():
    """Serve index.html for root path"""
    index_path = BASE_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="index.html not found")

# SPA Fallback: All non-API routes serve index.html
# This must be the LAST route defined
# IMPORTANT: FastAPI checks routes in order, but mounts might not work as expected
# So we explicitly exclude paths that should be handled by mounts/routes above
@app.get("/{path:path}")
async def serve_spa(path: str = ""):
    """Serve index.html for all non-API routes (SPA routing)"""
    # CRITICAL: Exclude paths that should be handled by mounts/routes above
    # FastAPI should handle these first, but we add explicit checks as safety
    # Check these BEFORE any other logic to prevent serving HTML for JS files
    if path.startswith("src/"):
        # This should be handled by the /src mount, but if we reach here,
        # it means the mount didn't work. Return 404 to prevent serving HTML.
        print(f"[SPA] ERROR: /{path} reached SPA fallback but should be handled by /src mount!")
        raise HTTPException(status_code=404, detail="Static file not found")
    
    if path == "styles.css":
        # This should be handled by the /styles.css route above
        print(f"[SPA] ERROR: /{path} reached SPA fallback but should be handled by /styles.css route!")
        raise HTTPException(status_code=404, detail="Static file not found")
    
    # If it's an API route that wasn't matched, return 404
    if path.startswith("api/"):
        print(f"[SPA] API route not found: /{path}")
        raise HTTPException(status_code=404, detail=f"API endpoint not found: /{path}")
    
    # Check if it's a static file request in root directory (not in src/)
    file_path = BASE_DIR / path
    if file_path.exists() and file_path.is_file() and not path.startswith("src/"):
        # Determine content type
        suffix = file_path.suffix.lower()
        content_types = {
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.html': 'text/html',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
        }
        return FileResponse(file_path, media_type=content_types.get(suffix, 'application/octet-stream'))
    
    # For all other routes, serve index.html (SPA routing)
    index_path = BASE_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path, media_type="text/html")
    
    raise HTTPException(status_code=404, detail="Not found")


if __name__ == "__main__":
    import uvicorn
    import logging
    import socket
    import sys
    
    # Filter out h11 protocol errors (connection closed noise)
    class H11ErrorFilter(logging.Filter):
        def filter(self, record):
            # Filter out h11 LocalProtocolError messages
            if "LocalProtocolError" in str(record.getMessage()):
                return False
            if "can't handle event type ConnectionClosed" in str(record.getMessage()):
                return False
            if "Can't send data when our state is ERROR" in str(record.getMessage()):
                return False
            return True
    
    # Apply filter to uvicorn and h11 loggers
    logging.getLogger("uvicorn.error").addFilter(H11ErrorFilter())
    logging.getLogger("h11").addFilter(H11ErrorFilter())
    
    # Check if port 3001 is already in use by a listening server
    def is_port_in_use(port):
        """Check if a port is actively being used by a listening server"""
        try:
            # First, try to connect to see if there's a server listening
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as test_socket:
                test_socket.settimeout(0.3)  # Short timeout
                result = test_socket.connect_ex(('localhost', port))
                if result == 0:
                    # Connection successful - there's a server listening
                    test_socket.close()
                    return True
                # Connection failed - either port is free or in TIME_WAIT
                # Try to bind to check if we can actually use it
                test_socket.close()
        except:
            pass
        
        # Try to bind to the port to see if it's actually available
        # With SO_REUSEADDR, we can bind even if port is in TIME_WAIT
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as bind_socket:
                bind_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                bind_socket.bind(('0.0.0.0', port))
                bind_socket.close()
                return False  # Port is available (we can bind to it)
        except OSError as e:
            # Port is truly in use (not just TIME_WAIT)
            if e.errno == 10048 or (hasattr(e, 'winerror') and e.winerror == 10048):
                return True
            return False
    
    # Check port before starting
    port_check_result = is_port_in_use(3001)
    if port_check_result:
        print(f"[Error] Port 3001 is already in use!")
        print("[Info] Another instance of the backend is already running.")
        print("")
        
        # Try to find and kill the process using port 3001
        try:
            import subprocess
            # Get PID using netstat
            result = subprocess.run(
                ['netstat', '-ano'], 
                capture_output=True, 
                text=True, 
                timeout=2
            )
            pid = None
            for line in result.stdout.split('\n'):
                if ':3001' in line and 'LISTENING' in line:
                    parts = line.split()
                    if len(parts) > 0:
                        try:
                            pid = int(parts[-1])
                            break
                        except (ValueError, IndexError):
                            pass
            
            if pid:
                print(f"[Found] Process using port 3001: PID {pid}")
                print("[Action] Attempting to terminate the process...")
                try:
                    # On Windows, use taskkill
                    kill_result = subprocess.run(
                        ['taskkill', '/F', '/PID', str(pid)], 
                        capture_output=True, 
                        text=True,
                        timeout=5
                    )
                    if kill_result.returncode == 0:
                        print(f"[Success] Process {pid} terminated.")
                        print("[Info] Waiting 2 seconds for port to be released...")
                        import time
                        time.sleep(2)
                        # Check again
                        if not is_port_in_use(3001):
                            print("[OK] Port 3001 is now free. Starting backend...")
                            port_check_result = False
                        else:
                            print("[Warning] Port still in use after termination attempt.")
                    else:
                        print(f"[Error] Could not terminate process {pid}.")
                        print(f"         Error: {kill_result.stderr}")
                except (subprocess.TimeoutExpired, FileNotFoundError) as e:
                    print(f"[Error] Could not terminate process {pid}: {e}")
                    print("[Info] You may need to run as administrator or manually end the process.")
            else:
                print("[Info] Could not determine which process is using port 3001.")
        except Exception as e:
            print(f"[Info] Could not automatically find/kill process: {e}")
        
        if port_check_result:
            print("")
            print("[Info] Please close the other instance manually:")
            print("       1. Open Task Manager (Ctrl+Shift+Esc)")
            print("       2. Find 'python.exe' process")
            print("       3. Right-click → End Task")
            print("       4. Or use command: taskkill /F /PID <PID>")
            print("")
            print("[Tip] To find the PID, use: netstat -ano | findstr :3001")
            sys.exit(1)
    
    print("[Python] Starting Python Finnhub Backend on http://localhost:3001")
    print("[API] Endpoints:")
    print("   - GET /api/fundamentals/{symbol}")
    print("   - GET /api/stock-overview/{symbol} (aggregated endpoint)")
    print("   - GET /api/company-description/{symbol} (optional, detailed)")
    print("   - GET /api/pe/{symbol}")
    print("   - GET /api/debug/{symbol}")
    print("   - GET /api/news/{symbol}")
    print("   - GET /api/market-news (Google News RSS)")
    print("   - GET /api/analyst/{symbol}")
    print("   - GET /api/sentiment/{symbol}")
    print("   - GET /api/earnings/{symbol}")
    print("   - GET /api/dax-heatmap (40 DAX stocks)")
    print("   - GET /api/sp500-heatmap (500 S&P 500 stocks by sector)")
    print("   - GET /api/nikkei225-heatmap (100 Nikkei 225 stocks)")
    print("   - GET /api/nasdaq100-heatmap (100 Nasdaq 100 stocks)")
    print("   - GET /api/hangseng-heatmap (85 Hang Seng stocks)")
    print("   - GET /api/market-cap?symbols=AAPL,MSFT,...")
    print("   - GET /api/heatmap-quotes?symbols=AAPL,MSFT,...")
    print("   - GET /api/search?q=apple (stock symbol search)")
    print("[SPA] URL Routing enabled:")
    print("   - /                    -> Market Overview")
    print("   - /stock/{symbol}      -> Stock Analysis")
    print("   - /indicator/{symbol}  -> Indicator Detail")
    print("   - /fundamentals/{symbol} -> Fundamentals Detail")
    print("   - /earnings/{symbol}   -> Earnings Detail")
    print("   - /impressum           -> Impressum")
    print("   - /privacy-policy      -> Privacy Policy")
    print("[OK] Using Finnhub API for fundamentals (reliable, no rate limiting)")
    print(f"[API] Finnhub API Key configured: {FINNHUB_API_KEY[:10]}...")
    print(f"[Config] USE_YFINANCE_EXTRAS: {USE_YFINANCE_EXTRAS} (yfinance disabled by default for performance)")
    print("[X] X/Twitter: Using official embed widgets (no API key needed)")
    print("[Logging] h11 protocol errors filtered (connection closed noise)")
    uvicorn.run(app, host="0.0.0.0", port=3001, timeout_keep_alive=30)

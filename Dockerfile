# ===========================================
# Stock Analysis Platform - Multi-Service Dockerfile
# Runs both Node.js (port 3000) and Python (port 3001) backends
# ===========================================

FROM node:20-slim AS base

# Install Python and supervisord
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# ===========================================
# Install Node.js dependencies
# ===========================================
COPY package*.json ./
RUN npm ci --only=production

# ===========================================
# Install Python dependencies
# ===========================================
COPY requirements.txt ./
RUN python3 -m pip install --no-cache-dir -r requirements.txt --break-system-packages

# ===========================================
# Copy application code
# ===========================================
COPY . .

# ===========================================
# Configure supervisord
# ===========================================
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ===========================================
# Build arguments (read from docker-compose or --build-arg)
# ===========================================

# API Keys
ARG FINNHUB_API_KEY
ARG GOOGLE_API_KEY
ARG FRED_API_KEY

# Server Configuration
ARG NODE_ENV=production
ARG ENVIRONMENT=production
ARG NODE_PORT=3000
ARG PYTHON_PORT=3001

# Rate Limiting
ARG SESSION_DURATION=300
ARG COOLDOWN_DURATION=300
ARG RATE_LIMIT_REQUESTS=100
ARG RATE_LIMIT_WINDOW=60

# Feature Flags
ARG USE_YFINANCE_EXTRAS=false

# ===========================================
# Set environment variables from build args
# ===========================================

# API Keys
ENV FINNHUB_API_KEY=${FINNHUB_API_KEY}
ENV GOOGLE_API_KEY=${GOOGLE_API_KEY}
ENV FRED_API_KEY=${FRED_API_KEY}

# Server Configuration
ENV NODE_ENV=${NODE_ENV}
ENV ENVIRONMENT=${ENVIRONMENT}
ENV NODE_PORT=${NODE_PORT}
ENV PYTHON_PORT=${PYTHON_PORT}

# Rate Limiting
ENV SESSION_DURATION=${SESSION_DURATION}
ENV COOLDOWN_DURATION=${COOLDOWN_DURATION}
ENV RATE_LIMIT_REQUESTS=${RATE_LIMIT_REQUESTS}
ENV RATE_LIMIT_WINDOW=${RATE_LIMIT_WINDOW}

# Feature Flags
ENV USE_YFINANCE_EXTRAS=${USE_YFINANCE_EXTRAS}

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/config || exit 1

# Start supervisord to manage both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]


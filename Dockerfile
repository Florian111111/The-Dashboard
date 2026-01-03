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
# Environment variables (defaults, override with .env or docker env)
# ===========================================
ENV NODE_ENV=production
ENV NODE_PORT=3000
ENV PYTHON_PORT=3001

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/config || exit 1

# Start supervisord to manage both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]


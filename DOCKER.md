# Docker Deployment Guide

This guide explains how to deploy the Stock Analysis Platform using Docker, specifically for **Dokploy**.

## Architecture

The application consists of two backend services:

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| **Node.js** | 3000 | Express.js | Frontend, Yahoo Finance & FRED API proxy |
| **Python** | 3001 | FastAPI | Finnhub API, Google Gemini AI features |

## Deployment Options

### Option 1: Single Container (Recommended for Dokploy)

Uses `supervisord` to run both services in one container.

```bash
# Build
docker build -t stock-analysis-platform .

# Run
docker run -d \
  --name stock-dashboard \
  -p 3000:3000 \
  -p 3001:3001 \
  --env-file .env \
  stock-analysis-platform
```

### Option 2: Docker Compose

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 3: Separate Containers

Use the individual Dockerfiles for more flexibility:

```bash
# Python backend
docker build -f Dockerfile.python -t stock-api-python .
docker run -d -p 3001:3001 --env-file .env stock-api-python

# Node.js frontend
docker build -f Dockerfile.node -t stock-api-node .
docker run -d -p 3000:3000 --env-file .env stock-api-node
```

## Dokploy Deployment

### Step 1: Prepare Environment Variables

In Dokploy, add these environment variables:

```env
# Required API Keys
FINNHUB_API_KEY=your_finnhub_key
GOOGLE_API_KEY=your_gemini_key
FRED_API_KEY=your_fred_key

# Server Config
NODE_ENV=production
ENVIRONMENT=production
NODE_PORT=3000
PYTHON_PORT=3001
```

### Step 2: Configure Dokploy

1. **Create a new application** in Dokploy
2. **Connect your Git repository**
3. **Set the Dockerfile path** to `Dockerfile` (the main multi-service one)
4. **Add environment variables** (listed above)
5. **Configure ports**:
   - Expose port `3000` (main web interface)
   - Optionally expose port `3001` (API - if needed directly)

### Step 3: Configure Domain/Proxy

In Dokploy, set up your domain to point to port `3000`.

If you need the Python API accessible separately:
- Create a subdomain (e.g., `api.yourdomain.com`) pointing to port `3001`

### Step 4: Deploy

Click **Deploy** in Dokploy. The build will:
1. Install Node.js dependencies
2. Install Python dependencies
3. Start both services via supervisord

## Reverse Proxy Configuration

If using a reverse proxy (Traefik, Nginx, Caddy), you may want to route API calls:

### Traefik Labels (docker-compose.yml)

```yaml
services:
  app:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`yourdomain.com`)"
      - "traefik.http.services.dashboard.loadbalancer.server.port=3000"
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (Node.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Python API (if you want /api to route to Python)
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Health Checks

The containers include health checks:

- **Node.js**: `GET http://localhost:3000/api/config`
- **Python**: `GET http://localhost:3001/api/health`

## Troubleshooting

### View logs inside container

```bash
# Supervisord logs
docker exec -it stock-dashboard cat /var/log/supervisor/supervisord.log

# Node.js logs
docker exec -it stock-dashboard cat /var/log/supervisor/nodejs.out.log
docker exec -it stock-dashboard cat /var/log/supervisor/nodejs.err.log

# Python logs
docker exec -it stock-dashboard cat /var/log/supervisor/python.out.log
docker exec -it stock-dashboard cat /var/log/supervisor/python.err.log
```

### Check if services are running

```bash
docker exec -it stock-dashboard supervisorctl status
```

### Restart a service

```bash
docker exec -it stock-dashboard supervisorctl restart nodejs
docker exec -it stock-dashboard supervisorctl restart python
```

## Resource Recommendations

| Environment | CPU | Memory |
|-------------|-----|--------|
| Development | 1 core | 512MB |
| Production | 2 cores | 1GB |

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-service container (Node.js + Python) |
| `Dockerfile.node` | Node.js only container |
| `Dockerfile.python` | Python only container |
| `docker-compose.yml` | Docker Compose configuration |
| `supervisord.conf` | Process manager configuration |
| `.dockerignore` | Files to exclude from build |


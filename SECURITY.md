# Security Configuration Guide

## API Keys

**IMPORTANT**: Before deploying, move all API keys to environment variables!

### Python Backend (python_backend.py)

Currently, the Finnhub API key is hardcoded. To secure it:

1. Create a `.env` file in the project root:
   ```
   FINNHUB_API_KEY=your_actual_key_here
   ```

2. Install python-dotenv:
   ```bash
   pip install python-dotenv
   ```

3. Update `python_backend.py` to load from environment:
   ```python
   from dotenv import load_dotenv
   load_dotenv()
   FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
   ```

### Node.js Backend (server.js)

No API keys are currently hardcoded in server.js (good!).

## Rate Limiting

Rate limiting has been implemented to prevent abuse:
- **Python Backend**: 100 requests per minute per IP
- **Node.js Backend**: 100 requests per minute per IP

Adjust these limits in the code if needed.

## CORS Configuration

Currently, CORS allows all origins (`*`). For production:

1. **Python Backend**: Update `allow_origins` in `python_backend.py`:
   ```python
   allow_origins=["https://yourdomain.com", "https://www.yourdomain.com"]
   ```

2. **Node.js Backend**: Add CORS origin restriction in `server.js`:
   ```javascript
   app.use(cors({
     origin: ['https://yourdomain.com', 'https://www.yourdomain.com']
   }));
   ```

## Input Validation

- Ticker symbols are validated with regex: `/^[A-Z.]{1,10}$/`
- All user inputs are sanitized before use
- SQL injection is not applicable (no database)

## Security Headers

Security headers have been added to both backends:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

## Deployment Checklist

- [ ] Move API keys to environment variables
- [ ] Update CORS origins to your domain
- [ ] Set up HTTPS (required for production)
- [ ] Configure firewall rules
- [ ] Set up monitoring/logging
- [ ] Review rate limits (adjust if needed)
- [ ] Test all endpoints with invalid inputs
- [ ] Enable security headers
- [ ] Set up backup strategy


# Deployment Guide - Schritt-für-Schritt Anleitung

## ✅ Vorbereitung abgeschlossen

Die folgenden Punkte wurden bereits implementiert:
- ✅ API-Keys werden aus Umgebungsvariablen geladen (keine hardcoded Keys mehr)
- ✅ Frontend verwendet konfigurierbare API-URL (automatische Erkennung Development/Production)
- ✅ CORS-Konfiguration über Umgebungsvariablen
- ✅ Error Handling Middleware implementiert
- ✅ Strukturiertes Logging implementiert

## 🚀 Deployment-Schritte

### 1. Umgebungsvariablen einrichten

**Erstelle eine `.env` Datei im Projekt-Root:**

```bash
# Kopiere die .env.example Datei
cp .env.example .env
```

**Bearbeite `.env` und trage deine API-Keys ein:**

```env
FINNHUB_API_KEY=dein_echter_finnhub_key
GOOGLE_API_KEY=dein_echter_google_key
ALLOWED_ORIGINS=https://deine-domain.com,https://www.deine-domain.com
ENVIRONMENT=production
```

**WICHTIG:** 
- In Development: `ALLOWED_ORIGINS=*` (erlaubt alle Origins)
- In Production: Spezifische Domain(s) angeben!

### 2. Python Backend starten

```bash
# Installiere Dependencies (falls noch nicht geschehen)
pip install -r requirements.txt

# Starte Backend
uvicorn python_backend:app --host 0.0.0.0 --port 3001
```

**Für Production mit HTTPS:**
```bash
uvicorn python_backend:app --host 0.0.0.0 --port 3001 --ssl-keyfile=/path/to/key.pem --ssl-certfile=/path/to/cert.pem
```

### 3. Frontend konfigurieren

**Option A: API auf gleicher Domain (empfohlen)**
- Frontend und Backend auf gleicher Domain
- API-Base-URL wird automatisch erkannt

**Option B: API auf Subdomain**
- Frontend: `www.deine-domain.com`
- Backend: `api.deine-domain.com`
- Setze Umgebungsvariable beim Build: `VITE_API_URL=https://api.deine-domain.com`

**Option C: API auf anderer Domain**
- Setze beim Build: `VITE_API_URL=https://api.andere-domain.com`

### 4. HTTPS einrichten

**Let's Encrypt (kostenlos):**
```bash
# Installiere certbot
sudo apt-get install certbot

# Erstelle Zertifikat
sudo certbot certonly --standalone -d deine-domain.com -d www.deine-domain.com
```

**Nginx Konfiguration (Beispiel):**
```nginx
server {
    listen 80;
    server_name deine-domain.com www.deine-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name deine-domain.com www.deine-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/deine-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/deine-domain.com/privkey.pem;
    
    # Frontend
    location / {
        root /var/www/stockwebsite;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 5. Logging überwachen

**Log-Datei (Production):**
```bash
tail -f backend.log
```

**Log-Level:**
- Development: `DEBUG` (detailliert)
- Production: `INFO` (nur wichtige Events)

### 6. Monitoring einrichten

**Empfohlene Überwachung:**
- Server-Logs auf Fehler prüfen
- Rate-Limit-Verstöße überwachen
- API-Response-Zeiten tracken
- Disk-Space überwachen (Log-Dateien)

## 🔒 Sicherheits-Checkliste

- [ ] `.env` Datei ist NICHT in Git committed (prüfe `.gitignore`)
- [ ] CORS ist auf spezifische Domain(s) beschränkt (nicht `*` in Production)
- [ ] HTTPS ist aktiviert
- [ ] API-Keys sind in `.env` Datei (nicht im Code)
- [ ] Rate Limits sind angemessen konfiguriert
- [ ] Security Headers sind aktiviert (bereits implementiert)
- [ ] Error Messages enthalten keine sensiblen Informationen

## 📝 Wichtige Dateien

- `.env` - Umgebungsvariablen (NICHT committen!)
- `.env.example` - Vorlage für Umgebungsvariablen
- `python_backend.py` - Backend Server
- `src/config.js` - Frontend API-Konfiguration
- `backend.log` - Log-Datei (Production)

## 🐛 Troubleshooting

**Problem: API-Keys werden nicht geladen**
- Prüfe, ob `.env` Datei im Projekt-Root existiert
- Prüfe, ob `python-dotenv` installiert ist: `pip install python-dotenv`
- Prüfe, ob `load_dotenv()` in `python_backend.py` aufgerufen wird

**Problem: CORS-Fehler**
- Prüfe `ALLOWED_ORIGINS` in `.env`
- In Development: `ALLOWED_ORIGINS=*`
- In Production: Spezifische Domain(s) angeben

**Problem: Frontend kann Backend nicht erreichen**
- Prüfe, ob Backend läuft: `curl http://localhost:3001/api/session-status`
- Prüfe Firewall-Regeln
- Prüfe, ob Port 3001 offen ist

## 📞 Support

Bei Problemen:
1. Prüfe Log-Dateien (`backend.log`)
2. Prüfe Browser-Konsole (F12)
3. Prüfe Network-Tab im Browser (F12 → Network)


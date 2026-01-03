# Deployment Checklist - Sicherheits- und Veröffentlichungs-Checkliste

## ✅ Bereits implementiert

### Sicherheit
- ✅ **Rate Limiting**: 100 Requests/Minute pro IP (beide Backends)
- ✅ **Input-Validierung**: Alle User-Inputs werden validiert und sanitized
- ✅ **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- ✅ **Request-Limits**: 10MB max request size
- ✅ **Path Traversal Protection**: Verhindert `..`, `/`, `\` in Inputs
- ✅ **Symbol-Validierung**: Regex-basierte Validierung für Ticker-Symbole

### API Keys
- ⚠️ **Finnhub API Key**: Aktuell hardcoded, sollte in Umgebungsvariable verschoben werden
- ✅ **FRED API Key**: Wird vom Frontend übergeben (nicht im Backend gespeichert)

## 🔧 Vor der Veröffentlichung zu erledigen

### 1. API Keys sichern

**Python Backend (`python_backend.py`):**
```bash
# Erstelle .env Datei:
FINNHUB_API_KEY=dein_aktueller_key_hier
ALLOWED_ORIGINS=https://deine-domain.com,https://www.deine-domain.com
```

**Installiere python-dotenv:**
```bash
pip install python-dotenv
```

**Aktualisiere python_backend.py:**
```python
from dotenv import load_dotenv
load_dotenv()
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
```

### 2. CORS einschränken

**Python Backend:**
- Setze `ALLOWED_ORIGINS` Umgebungsvariable mit deiner Domain

**Node.js Backend:**
- Setze `ALLOWED_ORIGINS` Umgebungsvariable:
```bash
ALLOWED_ORIGINS=https://deine-domain.com,https://www.deine-domain.com
```

### 3. HTTPS einrichten
- **WICHTIG**: Website muss über HTTPS laufen (für Google AdSense erforderlich)
- SSL-Zertifikat einrichten (z.B. Let's Encrypt)
- Alle HTTP-Requests auf HTTPS umleiten

### 4. Google AdSense Publisher-ID eintragen
- In `src/components/CookieBanner.js` Zeile 33:
  ```javascript
  const publisherId = 'ca-pub-DEINE_PUBLISHER_ID';
  ```

### 5. Debug-Endpunkte entfernen (optional)
- `/api/fundamentals/historical/debug/{symbol}` - nur für Entwicklung
- `/api/debug/{symbol}` - nur für Entwicklung

### 6. Error-Handling prüfen
- Stelle sicher, dass keine sensiblen Informationen in Error-Messages stehen
- Logging konfigurieren (nicht zu detailliert in Production)

### 7. Monitoring einrichten
- Server-Logs überwachen
- Rate-Limit-Verstöße loggen
- Fehler-Alerts einrichten

## 📊 Rate Limits (aktuell)

- **Python Backend**: 100 Requests/Minute pro IP
- **Node.js Backend**: 100 Requests/Minute pro IP

**Anpassung:** Falls zu niedrig/hoch, ändere in:
- `python_backend.py`: `RATE_LIMIT_REQUESTS` und `RATE_LIMIT_WINDOW`
- `server.js`: `max: 100` und `windowMs: 60 * 1000`

## 🔒 Sicherheits-Features

### Input-Validierung
- Ticker-Symbole: `/^[A-Z0-9.\-]{1,10}$/`
- Interval/Range: Whitelist-basiert
- Path Traversal: Blockiert

### Rate Limiting
- In-Memory (resettet bei Server-Neustart)
- Pro IP-Adresse
- 100 Requests pro Minute

### Security Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

## ⚠️ Wichtige Hinweise

1. **API Keys**: Niemals in Git committen! Verwende `.env` Dateien und füge sie zu `.gitignore` hinzu.

2. **CORS**: In Production niemals `*` verwenden! Immer spezifische Domains angeben.

3. **HTTPS**: Zwingend erforderlich für Google AdSense und allgemeine Sicherheit.

4. **Rate Limits**: Teste die Limits mit normaler Nutzung. 100/Minute sollte für normale Nutzer ausreichen.

5. **Monitoring**: Setze Logging und Monitoring auf, um Missbrauch früh zu erkennen.

## 🚀 Deployment-Schritte

1. ✅ API Keys in `.env` verschieben
2. ✅ CORS auf deine Domain beschränken
3. ✅ HTTPS einrichten
4. ✅ Google AdSense Publisher-ID eintragen
5. ✅ Rate Limits testen
6. ✅ Security Headers prüfen
7. ✅ Website testen
8. ✅ Monitoring einrichten


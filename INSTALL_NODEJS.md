# Node.js Installation - Schritt für Schritt

## 1. Node.js herunterladen

1. Öffne deinen Browser
2. Gehe zu: **https://nodejs.org/**
3. Klicke auf den großen grünen Button **"Download Node.js (LTS)"**
   - LTS = Long Term Support (stabile Version)
   - Die Datei heißt z.B. `node-v20.x.x-x64.msi`

## 2. Node.js installieren

1. Führe die heruntergeladene `.msi` Datei aus
2. Klicke durch den Installationsassistenten:
   - Klicke "Next" bei allen Schritten
   - **Wichtig:** Lasse alle Optionen aktiviert (besonders "Add to PATH")
3. Klicke "Install" (benötigt Administratorrechte)
4. Warte bis die Installation fertig ist
5. Klicke "Finish"

## 3. Installation prüfen

1. **Schließe alle geöffneten Terminal/PowerShell-Fenster**
2. Öffne ein **neues** PowerShell-Fenster
3. Tippe ein:
   ```bash
   node --version
   ```
   Sollte z.B. `v20.x.x` anzeigen

4. Tippe ein:
   ```bash
   npm --version
   ```
   Sollte z.B. `10.x.x` anzeigen

## 4. Zurück zum Projekt

1. Navigiere zum Projektordner:
   ```bash
   cd "C:\Users\Flori\OneDrive\Dokumente\StockWebsite"
   ```

2. Installiere Dependencies:
   ```bash
   npm install
   ```

3. Starte den Server:
   ```bash
   npm start
   ```
   
   Oder einfach: Doppelklick auf `START_EXPRESS.bat`

## 5. Browser öffnen

Öffne: **http://localhost:3000**

---

## Alternative: Schnellinstallation mit Chocolatey

Falls du Chocolatey installiert hast:
```bash
choco install nodejs-lts
```

## Hilfe bei Problemen

- **"npm wird nicht erkannt"**: Terminal/PowerShell komplett schließen und neu öffnen
- **Installation schlägt fehl**: Als Administrator ausführen
- **Port 3000 bereits belegt**: Anderen Server beenden oder Port in `server.js` ändern


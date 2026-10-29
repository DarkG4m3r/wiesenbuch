# Wiesenbuch – Version 1

Notiz-App für die Apfelwiese: Mängel mit Foto, Standort und Wiese festhalten.
Läuft als PWA. Alle Daten bleiben offline am Handy, Sicherung als ZIP.

## Online stellen (GitHub Pages)

1. Auf github.com ein neues Repository anlegen, z. B. `wiesenbuch` (Public).
2. Den Inhalt dieses Ordners hochladen, über „Add file → Upload files“ oder per Git:
   ```
   git init && git add . && git commit -m "Wiesenbuch v1"
   git branch -M main
   git remote add origin https://github.com/<DEIN-NAME>/wiesenbuch.git
   git push -u origin main
   ```
3. Im Repository auf **Settings → Pages** gehen, unter „Source“ *Deploy from a branch* wählen, dann `main` / `/ (root)` → **Save**.
4. Nach 1–2 Minuten ist die App erreichbar unter `https://<DEIN-NAME>.github.io/wiesenbuch/`.

## Aufs Handy installieren

1. Den Link in **Chrome** öffnen.
2. Menü ⋮ → **„App installieren“** bzw. „Zum Startbildschirm hinzufügen“.
3. Beim ersten Foto bzw. Standort die Erlaubnisse bestätigen.
4. Die App einmal mit Internet öffnen. Danach funktioniert sie offline.

## Updates

- Geänderte Dateien hochladen. Die Handys holen sich die neue Version im Hintergrund, aktiv wird sie beim nächsten Öffnen.
- Bei größeren Änderungen in `sw.js` die `VERSION` erhöhen.

## Hinweise

- **Sichern:** Unter Einstellungen → „Sicherung erstellen“ entsteht eine ZIP mit allen Einträgen und Fotos, die man z. B. per WhatsApp verschicken kann. „Sicherung einspielen“ führt die Daten zusammen.
- **Luftbild:** Das Orthofoto der Provinz Bozen wird per WMS geladen. Layername und URL stehen oben in `app.js` (`ORTHO`). Ist es nicht erreichbar, schaltet die App automatisch auf OpenStreetMap um.
- **Offline-Karte:** Einmal angesehene Kartenausschnitte bleiben gespeichert. Am besten die Wiesen einmal mit WLAN auf der Karte durchzoomen.
- **Spracheingabe:** Der Mikrofon-Knopf braucht meist Internet. Offline geht das Mikrofon der Android-Tastatur.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Grundgerüst |
| `app.js` | Screens und Logik |
| `db.js` | Speicher am Handy (IndexedDB) |
| `sw.js` | Offline-Betrieb, Kartenkacheln |
| `style.css` | Aussehen |
| `vendor/` | Leaflet (Karte), JSZip (Sicherung) |

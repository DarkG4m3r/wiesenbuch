// Service Worker: hält die App offline verfügbar und merkt sich Kartenkacheln.
const VERSION = 'wb-1.1.1';
const SHELL = `shell-${VERSION}`;
const TILES = 'tiles-v1';
const FONTS = 'fonts-v1';
const MAX_TILES = 4000;

const ASSETS = [
  './', './index.html', './style.css', './app.js', './db.js', './manifest.webmanifest',
  './vendor/leaflet.js', './vendor/leaflet.css', './vendor/jszip.min.js',
  './vendor/images/layers.png', './vendor/images/layers-2x.png',
  './vendor/images/marker-icon.png', './vendor/images/marker-icon-2x.png', './vendor/images/marker-shadow.png',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('shell-') && k !== SHELL).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function trimTiles() {
  const c = await caches.open(TILES);
  const keys = await c.keys();
  if (keys.length > MAX_TILES) await Promise.all(keys.slice(0, keys.length - MAX_TILES).map((k) => c.delete(k)));
}

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Kartenkacheln: zuerst aus dem Speicher, sonst laden und merken
  const isTile = url.hostname === 'tile.openstreetmap.org' || url.hostname.endsWith('buergernetz.bz.it');
  if (isTile) {
    ev.respondWith((async () => {
      const c = await caches.open(TILES);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); trimTiles(); }
        return res;
      } catch (e) {
        return new Response('', { status: 504 });
      }
    })());
    return;
  }

  // Schrift von Google Fonts
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    ev.respondWith((async () => {
      const c = await caches.open(FONTS);
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; } catch (e) { return new Response('', { status: 504 }); }
    })());
    return;
  }

  // App selbst: sofort aus dem Speicher (schnell auch bei schlechtem Empfang),
  // im Hintergrund aktualisieren
  if (url.origin === self.location.origin) {
    ev.respondWith((async () => {
      const c = await caches.open(SHELL);
      const hit = (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await c.match('./index.html') : null);
      const net = fetch(req.url, { cache: 'no-cache' }).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
      if (hit) { ev.waitUntil(net); return hit; }
      return (await net) || new Response('', { status: 504 });
    })());
  }
});

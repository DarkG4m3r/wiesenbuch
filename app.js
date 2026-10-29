/* Wiesenbuch – Notizen für die Wiese
   Version 1: läuft komplett offline am Handy (IndexedDB). */

const APP_VERSION = '1.0.0';
const ANDERES = '_anderes';
const CATS = ['Säule', 'Draht', 'Hagelnetz', 'Bewässerung', 'Baum', 'Sonstiges'];
const MAP_START = { lat: 46.628, lng: 10.776, zoom: 13 }; // Vinschgau (Schlanders)

// Luftbild der Provinz Bozen (WMS). Layername bei Bedarf hier anpassen.
const ORTHO = {
  url: 'https://geoservices.buergernetz.bz.it/mapproxy/p_bz-Orthoimagery/wms',
  layers: 'Aerial-2020-RGB',
  attribution: 'Orthofoto © Autonome Provinz Bozen',
};

const I = {
  back: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  gear: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  plus: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  plusS: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  cam: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  camBig: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  gal: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 8"/></svg>',
  list: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  map: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  mic: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  check: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  locate: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  layers: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
  edit: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  nav: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z"/></svg>',
  share: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
};
const pinSvg = (color, size = 34) =>
  `<svg width="${size}" height="${Math.round(size * 1.33)}" viewBox="0 0 24 32" aria-hidden="true"><path d="M12 31C12 31 22 19 22 11a10 10 0 0 0-20 0c0 8 10 20 10 20z" fill="${color}" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="11" r="4" fill="#fff"/></svg>`;

/* ---------- Hilfsfunktionen ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const app = $('#app');
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = () => new Date().toISOString();

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const t = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((today - day) / 86400000);
  if (diff === 0) return `Heute, ${t}`;
  if (diff === 1) return `Gestern, ${t}`;
  if (diff < 7) return `${d.toLocaleDateString('de-DE', { weekday: 'short' })}, ${t}`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function distM(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

let toastTimer;
function toast(msg, ms = 2600) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
}

function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

/* ---------- Fotos ---------- */
const urlCache = new Map();
async function photoUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const p = await DB.get('photos', id);
  if (!p) return null;
  const u = URL.createObjectURL(p.blob);
  urlCache.set(id, u);
  return u;
}

async function compressImage(file, max = 1600, q = 0.8) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close && bmp.close();
    return await new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', q));
  } catch (e) {
    return file;
  }
}

/* ---------- Daten ---------- */
async function getWiesen() {
  const w = await DB.all('wiesen');
  return w.sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
async function getEntries() {
  const e = (await DB.all('entries')).filter((x) => !x.deleted);
  return e.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}
function wieseLabel(entry, wiesenById) {
  if (entry.wieseId === ANDERES) return entry.ort ? `Hof · ${entry.ort}` : 'Hof / Anderes';
  const w = wiesenById[entry.wieseId];
  const name = w ? w.name : (entry.wieseName || 'Ohne Wiese');
  return entry.reihe ? `${name} · Reihe ${entry.reihe}` : name;
}
function entryTitle(e) { return e.todo || e.kategorie || 'Eintrag'; }

let persistAsked = false;
async function askPersist() {
  if (persistAsked) return;
  persistAsked = true;
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
}

/* ---------- Karte ---------- */
function baseLayers() {
  const luftbild = L.tileLayer.wms(ORTHO.url, {
    layers: ORTHO.layers, format: 'image/jpeg', transparent: false, version: '1.3.0',
    maxZoom: 20, maxNativeZoom: 19, attribution: ORTHO.attribution,
  });
  const karte = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20, maxNativeZoom: 19, attribution: '© OpenStreetMap-Mitwirkende',
  });
  return { luftbild, karte };
}

async function makeMap(el, opts = {}) {
  const map = L.map(el, { zoomControl: false, attributionControl: true });
  const layers = baseLayers();
  let current = await DB.getMeta('mapLayer', 'luftbild');
  if (!layers[current]) current = 'luftbild';
  let ok = 0, bad = 0;
  layers.luftbild.on('tileload', () => ok++);
  layers.luftbild.on('tileerror', () => {
    bad++;
    if (bad >= 6 && ok === 0 && map.hasLayer(layers.luftbild) && navigator.onLine) {
      map.removeLayer(layers.luftbild); layers.karte.addTo(map);
      toast('Luftbild gerade nicht erreichbar – normale Karte aktiv');
    }
  });
  layers[current].addTo(map);
  map._wbToggle = () => {
    const next = map.hasLayer(layers.luftbild) ? 'karte' : 'luftbild';
    map.eachLayer((l) => { if (l === layers.luftbild || l === layers.karte) map.removeLayer(l); });
    layers[next].addTo(map);
    DB.setMeta('mapLayer', next);
    toast(next === 'luftbild' ? 'Luftbild' : 'Karte');
  };
  if (opts.center) map.setView(opts.center, opts.zoom || 18);
  else map.setView([MAP_START.lat, MAP_START.lng], MAP_START.zoom);
  setTimeout(() => map.invalidateSize(), 50);
  return map;
}

function pinIcon(color, size) {
  const s = size || 34;
  return L.divIcon({ className: 'pin-icon', html: pinSvg(color, s), iconSize: [s, Math.round(s * 1.33)], iconAnchor: [s / 2, Math.round(s * 1.33)] });
}
const meIcon = L.divIcon({ className: 'pin-icon', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

function locateOnce(opts = {}) {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('kein GPS'));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      rej, { enableHighAccuracy: true, timeout: opts.timeout || 15000, maximumAge: opts.maxAge ?? 10000 });
  });
}

/* ---------- Gerüst ---------- */
function topbar({ title, sub, back, right }) {
  return `<header class="topbar">
    ${back ? `<a class="iconbtn" href="${back}" aria-label="Zurück">${I.back}</a>` : ''}
    <h1>${esc(title)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</h1>
    ${right || ''}
  </header>`;
}
function bottomnav(active) {
  return `<nav class="bottomnav" aria-label="Hauptnavigation">
    <a href="#liste" class="${active === 'liste' ? 'on' : ''}">${I.list}Liste</a>
    <a href="#karte" class="${active === 'karte' ? 'on' : ''}">${I.map}Karte</a>
  </nav>`;
}

let currentMap = null;
let leaveHooks = [];
function cleanup() {
  leaveHooks.forEach((f) => { try { f(); } catch (e) {} });
  leaveHooks = [];
  if (currentMap) { currentMap.remove(); currentMap = null; }
}

/* ---------- Router ---------- */
async function render() {
  cleanup();
  const h = location.hash.replace(/^#/, '') || 'liste';
  const [route, id] = h.split('/');
  window.scrollTo(0, 0);
  try {
    if (route === 'liste') await viewList();
    else if (route === 'neu') await viewForm(null);
    else if (route === 'bearbeiten') await viewForm(id);
    else if (route === 'eintrag') await viewDetail(id);
    else if (route === 'karte') await viewMap();
    else if (route === 'wiesen') await viewWiesen();
    else if (route === 'einstellungen') await viewSettings();
    else go('#liste');
  } catch (e) {
    console.error(e);
    app.innerHTML = `${topbar({ title: 'Wiesenbuch', back: '#liste' })}<div class="content"><p class="empty">Da ist etwas schiefgelaufen.<br>${esc(e.message)}</p></div>`;
  }
}
window.addEventListener('hashchange', render);

/* ---------- 1 · Liste ---------- */
let listFilter = 'offen';
async function viewList() {
  const [entries, wiesen] = await Promise.all([getEntries(), getWiesen()]);
  const byId = Object.fromEntries(wiesen.map((w) => [w.id, w]));
  const offen = entries.filter((e) => e.status !== 'erledigt');
  const shown = listFilter === 'alle' ? entries : entries.filter((e) => (listFilter === 'offen' ? e.status !== 'erledigt' : e.status === 'erledigt'));
  // Offene: dringend zuerst
  if (listFilter === 'offen') shown.sort((a, b) => (b.prio === 'dringend') - (a.prio === 'dringend') || (b.createdAt || '').localeCompare(a.createdAt || ''));

  const sub = offen.length === 1 ? '1 offener Punkt' : `${offen.length} offene Punkte`;
  app.innerHTML = `
    ${topbar({ title: 'Wiesenbuch', sub, right: `<a class="iconbtn filled" href="#einstellungen" aria-label="Einstellungen">${I.gear}</a>` })}
    <div class="headwrap" role="group" aria-label="Filter">
      <button class="chip-h ${listFilter === 'offen' ? 'on' : ''}" data-f="offen">Offen (${offen.length})</button>
      <button class="chip-h ${listFilter === 'erledigt' ? 'on' : ''}" data-f="erledigt">Erledigt</button>
      <button class="chip-h ${listFilter === 'alle' ? 'on' : ''}" data-f="alle">Alle</button>
    </div>
    <main class="content" id="list">
      ${shown.length ? shown.map((e) => `
        <a class="card ${e.status === 'erledigt' ? 'done' : ''}" href="#eintrag/${e.id}">
          ${e.photoIds && e.photoIds.length ? `<img class="thumb" data-photo="${e.photoIds[0]}" alt="">` : `<div class="thumb">${I.camBig}</div>`}
          <div class="body">
            <div class="row"><h2>${esc(entryTitle(e))}</h2>
              ${e.status === 'erledigt' ? '<span class="badge ok">Erledigt</span>' : e.prio === 'dringend' ? '<span class="badge">Dringend</span>' : ''}</div>
            <span class="l1">${esc(wieseLabel(e, byId))}</span>
            ${e.braucht ? `<span class="l2">Braucht: ${esc(e.braucht)}</span>` : ''}
            <span class="l3">${esc(fmtDate(e.createdAt))}${e.author ? ' · ' + esc(e.author) : ''}</span>
          </div>
        </a>`).join('') : `<p class="empty">${listFilter === 'erledigt' ? 'Noch nichts erledigt.' : 'Keine offenen Punkte.<br>Mit „Neuer Eintrag“ geht’s los.'}</p>`}
    </main>
    <div class="fabwrap"><a class="fab" href="#neu">${I.plus}Neuer Eintrag</a></div>
    ${bottomnav('liste')}`;

  $$('.chip-h').forEach((b) => b.addEventListener('click', () => { listFilter = b.dataset.f; render(); }));
  $$('img[data-photo]').forEach(async (img) => { const u = await photoUrl(img.dataset.photo); if (u) img.src = u; });
}

/* ---------- 2 · Neuer Eintrag / Bearbeiten ---------- */
let draft = null;
let draftSaveTimer = null;
function saveDraftSoon() {
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => { if (draft) DB.setMeta('draft', draft); }, 300);
}

async function viewForm(editId) {
  const wiesen = await getWiesen();
  if (editId) {
    const e = await DB.get('entries', editId);
    if (!e) return go('#liste');
    // laufenden Bearbeiten-Entwurf desselben Eintrags weiterführen
    const d = await DB.getMeta('draft', null);
    draft = d && d.id === editId ? d : { ...e, _edit: true, photoIds: [...(e.photoIds || [])] };
  } else {
    const d = await DB.getMeta('draft', null);
    if (d && !d._edit) draft = d;
    else {
      draft = { id: uid(), _new: true, status: 'offen', prio: 'normal', photoIds: [], wieseId: null, _wieseManual: false, todo: '', beschreibung: '', braucht: '', reihe: '', ort: '', kategorie: '' };
    }
  }
  await DB.setMeta('draft', draft);

  const isEdit = !!draft._edit;
  app.innerHTML = `
    ${topbar({ title: isEdit ? 'Eintrag bearbeiten' : 'Neuer Eintrag', back: isEdit ? `#eintrag/${draft.id}` : '#liste' })}
    <main class="content form">
      <section class="sec" aria-label="Fotos">
        <div id="photos"></div>
        <div class="grid2">
          <button class="btn" id="btnCam">${I.cam}Foto</button>
          <button class="btn" id="btnGal">${I.gal}Galerie</button>
        </div>
      </section>

      <section class="loc" aria-live="polite">
        <div class="mapmini">${pinSvg('#C2362B', 24)}</div>
        <div class="txt">
          <b id="locTitle">Standort</b>
          <span class="l1" id="locSub"></span>
          <div class="links">
            <button class="linkbtn" id="btnPick">Auf Karte anpassen</button>
            <button class="linkbtn" id="btnRelocate">Neu messen</button>
          </div>
        </div>
      </section>

      <section class="sec">
        <div class="sechead"><h2>Welche Wiese?</h2><a href="#wiesen" id="lnkWiesen">Wiesen bearbeiten</a></div>
        <span class="hint" id="wHint"></span>
        <div class="grid2" id="wiesenOpts"></div>
        <div id="wExtra"></div>
      </section>

      <section class="sec">
        <label class="h" for="todo">Was ist zu erledigen?</label>
        <input class="inp" id="todo" autocomplete="off" placeholder="z. B. Säule tauschen" value="${esc(draft.todo)}">
        <span class="hint">Oder schnell wählen:</span>
        <div class="grid2" id="cats">
          ${CATS.map((c) => `<button class="opt ${draft.kategorie === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>
      </section>

      <section class="sec">
        <label class="h" for="besch">Beschreibung</label>
        <div style="position:relative">
          <textarea class="inp" id="besch" rows="3" placeholder="Was genau ist los?">${esc(draft.beschreibung)}</textarea>
          <button class="mic hidden" id="btnMic" aria-label="Sprechen statt tippen">${I.mic}</button>
        </div>
      </section>

      <section class="sec">
        <label class="h" for="braucht">Was wird gebraucht?</label>
        <input class="inp" id="braucht" autocomplete="off" placeholder="z. B. 1 Betonsäule 3,5 m" value="${esc(draft.braucht)}">
      </section>

      <section class="sec">
        <h2>Wie dringend?</h2>
        <div class="grid2">
          <button class="opt ${draft.prio !== 'dringend' ? 'on' : ''}" data-prio="normal">Normal</button>
          <button class="opt urgent ${draft.prio === 'dringend' ? 'on' : ''}" data-prio="dringend">Dringend</button>
        </div>
      </section>

      <button class="btn big" id="btnSave">${I.check}Speichern</button>
      ${isEdit ? `<button class="btn danger" id="btnDelete">Eintrag löschen</button>` : `<button class="btn" id="btnDiscard">Verwerfen</button>`}
    </main>`;

  renderPhotos();
  renderWiesenOpts(wiesen);
  updateLocUi();

  // Eingaben
  const bind = (id, key) => $('#' + id).addEventListener('input', (ev) => { draft[key] = ev.target.value; saveDraftSoon(); });
  bind('todo', 'todo'); bind('besch', 'beschreibung'); bind('braucht', 'braucht');

  $$('#cats .opt').forEach((b) => b.addEventListener('click', () => {
    const c = b.dataset.cat;
    const was = draft.kategorie;
    draft.kategorie = was === c ? '' : c;
    const todo = $('#todo');
    if (draft.kategorie && (!todo.value.trim() || CATS.includes(todo.value.trim()))) { todo.value = draft.kategorie; draft.todo = draft.kategorie; }
    else if (!draft.kategorie && todo.value.trim() === was) { todo.value = ''; draft.todo = ''; }
    $$('#cats .opt').forEach((x) => x.classList.toggle('on', x.dataset.cat === draft.kategorie));
    saveDraftSoon();
  }));
  $$('[data-prio]').forEach((b) => b.addEventListener('click', () => {
    draft.prio = b.dataset.prio;
    $$('[data-prio]').forEach((x) => x.classList.toggle('on', x.dataset.prio === draft.prio));
    saveDraftSoon();
  }));

  // Fotos
  $('#btnCam').addEventListener('click', () => $('#camInput').click());
  $('#btnGal').addEventListener('click', () => $('#galInput').click());

  // Standort
  $('#btnRelocate').addEventListener('click', () => startLocating(true));
  $('#btnPick').addEventListener('click', () => pickOnMap());
  if (draft.lat == null) startLocating(false);

  // Diktat
  setupMic();

  $('#lnkWiesen').addEventListener('click', () => { sessionStorage.setItem('wbReturn', location.hash); });

  $('#btnSave').addEventListener('click', saveDraft);
  const disc = $('#btnDiscard');
  if (disc) disc.addEventListener('click', async () => {
    if ((draft.photoIds.length || draft.todo || draft.beschreibung) && !confirm('Eintrag wirklich verwerfen?')) return;
    for (const pid of draft.photoIds) await DB.del('photos', pid);
    draft = null; await DB.setMeta('draft', null); go('#liste');
  });
  const del = $('#btnDelete');
  if (del) del.addEventListener('click', async () => {
    if (!confirm('Eintrag endgültig löschen?')) return;
    const e = await DB.get('entries', draft.id);
    for (const pid of new Set([...(e?.photoIds || []), ...draft.photoIds])) await DB.del('photos', pid);
    // als gelöscht markieren (für späteren Abgleich), Inhalt leeren
    await DB.put('entries', { id: draft.id, deleted: true, updatedAt: now() });
    draft = null; await DB.setMeta('draft', null);
    toast('Gelöscht'); go('#liste');
  });

  leaveHooks.push(() => { stopLocating(); stopMic(); if (draft) DB.setMeta('draft', draft); });
}

async function renderPhotos() {
  const box = $('#photos');
  if (!box || !draft) return;
  if (!draft.photoIds.length) { box.innerHTML = `<div class="photoempty">Noch kein Foto</div>`; return; }
  box.innerHTML = `<div class="photos">${draft.photoIds.map((id) => `<div class="ph"><img data-photo="${id}" alt="Foto"><button data-rm="${id}" aria-label="Foto entfernen">${I.x}</button></div>`).join('')}</div>`;
  $$('img[data-photo]', box).forEach(async (img) => { const u = await photoUrl(img.dataset.photo); if (u) img.src = u; });
  $$('[data-rm]', box).forEach((b) => b.addEventListener('click', async () => {
    const id = b.dataset.rm;
    draft.photoIds = draft.photoIds.filter((x) => x !== id);
    // Foto erst beim Speichern löschen, falls es zum bestehenden Eintrag gehört
    if (!draft._edit) await DB.del('photos', id);
    saveDraftSoon(); renderPhotos();
  }));
}

async function addPhotoFiles(files) {
  if (!draft || !files || !files.length) return;
  for (const f of files) {
    const blob = await compressImage(f);
    const id = uid();
    await DB.put('photos', { id, entryId: draft.id, blob, createdAt: now() });
    draft.photoIds.push(id);
  }
  await DB.setMeta('draft', draft);
  renderPhotos();
}
$('#camInput').addEventListener('change', async (ev) => { await addPhotoFiles(ev.target.files); ev.target.value = ''; });
$('#galInput').addEventListener('change', async (ev) => { await addPhotoFiles(ev.target.files); ev.target.value = ''; });

/* Standort */
let watchId = null, watchTimer = null, locState = 'idle';
function startLocating(force) {
  if (!navigator.geolocation) { locState = 'none'; updateLocUi(); return; }
  stopLocating();
  if (force) { draft.lat = null; draft.acc = null; }
  locState = 'searching'; updateLocUi();
  watchId = navigator.geolocation.watchPosition((p) => {
    const acc = Math.round(p.coords.accuracy);
    if (draft.lat == null || draft.acc == null || acc <= draft.acc) {
      draft.lat = p.coords.latitude; draft.lng = p.coords.longitude; draft.acc = acc; draft.locManual = false;
      suggestWiese();
      saveDraftSoon();
    }
    locState = 'ok'; updateLocUi();
    if (acc <= 8) stopLocating();
  }, (err) => {
    locState = err.code === 1 ? 'denied' : (draft.lat != null ? 'ok' : 'fail');
    updateLocUi(); stopLocating();
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
  watchTimer = setTimeout(() => { stopLocating(); if (draft && draft.lat == null) { locState = 'fail'; updateLocUi(); } }, 30000);
}
function stopLocating() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null; clearTimeout(watchTimer);
}
function updateLocUi() {
  const t = $('#locTitle'), s = $('#locSub');
  if (!t || !draft) return;
  if (draft.lat != null) {
    t.textContent = draft.locManual ? 'Standort gesetzt' : (locState === 'searching' ? 'Standort wird genauer …' : 'Standort erfasst');
    s.textContent = draft.locManual ? 'Auf der Karte festgelegt' : `Genauigkeit ±${draft.acc} m`;
  } else if (locState === 'searching') { t.textContent = 'Standort wird ermittelt …'; s.textContent = 'GPS sucht'; }
  else if (locState === 'denied') { t.textContent = 'Kein Standort'; s.textContent = 'Standort-Erlaubnis fehlt – in den Einstellungen erlauben'; }
  else if (locState === 'none') { t.textContent = 'Kein Standort'; s.textContent = 'Dieses Gerät hat kein GPS'; }
  else { t.textContent = 'Kein Standort'; s.textContent = 'GPS nicht gefunden – „Neu messen“ oder auf Karte setzen'; }
}

async function suggestWiese() {
  if (!draft || draft._wieseManual || draft.lat == null) return;
  const wiesen = (await getWiesen()).filter((w) => w.lat != null);
  let best = null, bestD = Infinity;
  for (const w of wiesen) { const d = distM(draft, w); if (d < bestD) { bestD = d; best = w; } }
  if (best && bestD <= 500) {
    if (draft.wieseId !== best.id) { draft.wieseId = best.id; saveDraftSoon(); renderWiesenOpts(await getWiesen()); }
    const h = $('#wHint'); if (h) h.textContent = `Vorschlag nach Standort: ${best.name}`;
  }
}

function renderWiesenOpts(wiesen) {
  const box = $('#wiesenOpts');
  if (!box) return;
  const opts = [...wiesen.map((w) => ({ id: w.id, name: w.name })), { id: ANDERES, name: 'Hof / Anderes' }];
  box.innerHTML = opts.map((o) => `<button class="opt ${draft.wieseId === o.id ? 'on' : ''}" data-w="${esc(o.id)}">${esc(o.name)}</button>`).join('');
  if (!wiesen.length) $('#wHint').textContent = 'Noch keine Wiesen angelegt – über „Neue Wiese“ anlegen.';
  $$('[data-w]', box).forEach((b) => b.addEventListener('click', () => {
    draft.wieseId = draft.wieseId === b.dataset.w ? null : b.dataset.w;
    draft._wieseManual = true;
    saveDraftSoon(); renderWiesenOpts(wiesen);
  }));
  const ex = $('#wExtra');
  if (draft.wieseId === ANDERES) {
    ex.innerHTML = `<div class="sec"><label class="lbl" for="ort">Wo genau?</label>
      <input class="inp" id="ort" autocomplete="off" placeholder="z. B. Garagentor" value="${esc(draft.ort)}"></div>`;
    $('#ort').addEventListener('input', (ev) => { draft.ort = ev.target.value; saveDraftSoon(); });
  } else {
    ex.innerHTML = `<div class="grid2">
        <div class="sec" style="gap:4px"><label class="lbl" for="reihe">Reihe (optional)</label>
          <input class="inp" id="reihe" inputmode="numeric" autocomplete="off" value="${esc(draft.reihe)}"></div>
        <div style="display:flex;flex-direction:column;justify-content:flex-end">
          <a class="btn dashed" href="#wiesen" id="lnkNewW">${I.plusS}Neue Wiese</a></div>
      </div>`;
    $('#reihe').addEventListener('input', (ev) => { draft.reihe = ev.target.value; saveDraftSoon(); });
    $('#lnkNewW').addEventListener('click', () => { sessionStorage.setItem('wbReturn', location.hash); sessionStorage.setItem('wbFocusNew', '1'); });
  }
}

/* Auf Karte festlegen */
async function pickOnMap(opts = {}) {
  const start = opts.start || (draft && draft.lat != null ? { lat: draft.lat, lng: draft.lng } : null);
  const m = document.createElement('div');
  m.className = 'modal full';
  m.innerHTML = `<div class="box" role="dialog" aria-label="Standort wählen">
      <div class="pickhead"><b>${esc(opts.title || 'Karte verschieben, bis der Pin passt')}</b>
        <button class="btn" id="pkCancel" style="min-height:48px">Abbrechen</button></div>
      <div class="pickbody">
        <div class="pickmap"></div>
        <div class="crosshair">${pinSvg('#C2362B', 40)}</div>
        <div class="mapctl"><button id="pkLayer" aria-label="Kartenart wechseln">${I.layers}</button><button id="pkMe" aria-label="Mein Standort">${I.locate}</button></div>
        <div class="sheet"><button class="btn solid" id="pkOk">${I.check}Hier übernehmen</button></div>
      </div></div>`;
  document.body.appendChild(m);
  const map = await makeMap($('.pickmap', m), start ? { center: [start.lat, start.lng], zoom: 18 } : {});
  const close = () => { map.remove(); m.remove(); };
  return new Promise((resolve) => {
    $('#pkCancel', m).onclick = () => { close(); resolve(null); };
    $('#pkLayer', m).onclick = () => map._wbToggle();
    $('#pkMe', m).onclick = async () => { try { const p = await locateOnce(); map.setView([p.lat, p.lng], 18); } catch (e) { toast('Standort nicht gefunden'); } };
    $('#pkOk', m).onclick = () => {
      const c = map.getCenter(); close();
      if (opts.onPick) { opts.onPick(c); resolve(c); return; }
      draft.lat = c.lat; draft.lng = c.lng; draft.acc = null; draft.locManual = true;
      stopLocating(); locState = 'ok'; updateLocUi(); suggestWiese(); saveDraftSoon();
      resolve(c);
    };
  });
}

/* Diktat (Spracheingabe) */
let recog = null;
function setupMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $('#btnMic');
  if (!SR || !btn) return;
  btn.classList.remove('hidden');
  btn.addEventListener('click', () => {
    if (recog) { stopMic(); return; }
    recog = new SR();
    recog.lang = 'de-DE'; recog.interimResults = false; recog.continuous = false;
    recog.onresult = (ev) => {
      const txt = [...ev.results].map((r) => r[0].transcript).join(' ').trim();
      if (!txt) return;
      const ta = $('#besch');
      ta.value = ta.value.trim() ? ta.value.trim() + ' ' + txt : txt.charAt(0).toUpperCase() + txt.slice(1);
      draft.beschreibung = ta.value; saveDraftSoon();
    };
    recog.onerror = (ev) => { toast(ev.error === 'not-allowed' ? 'Mikrofon nicht erlaubt' : 'Spracheingabe braucht meist Internet – sonst Mikrofon der Tastatur nutzen'); };
    recog.onend = () => { recog = null; btn.classList.remove('rec'); };
    btn.classList.add('rec');
    try { recog.start(); } catch (e) { recog = null; btn.classList.remove('rec'); }
  });
}
function stopMic() { if (recog) { try { recog.stop(); } catch (e) {} } recog = null; const b = $('#btnMic'); if (b) b.classList.remove('rec'); }

async function saveDraft() {
  if (!draft) return;
  if (!draft.todo.trim() && !draft.beschreibung.trim() && !draft.photoIds.length) { toast('Bitte zumindest kurz eintragen, was zu tun ist'); $('#todo').focus(); return; }
  stopLocating();
  const author = await DB.getMeta('author', '');
  const wiesen = await getWiesen();
  const w = wiesen.find((x) => x.id === draft.wieseId);
  const old = draft._edit ? await DB.get('entries', draft.id) : null;
  const entry = {
    id: draft.id,
    createdAt: old?.createdAt || now(),
    updatedAt: now(),
    author: old?.author || author,
    editedBy: old ? author : undefined,
    status: old?.status || 'offen',
    erledigtAt: old?.erledigtAt || null,
    wieseId: draft.wieseId || null,
    wieseName: draft.wieseId === ANDERES ? 'Hof / Anderes' : (w ? w.name : ''),
    ort: draft.wieseId === ANDERES ? (draft.ort || '').trim() : '',
    reihe: draft.wieseId === ANDERES ? '' : (draft.reihe || '').trim(),
    todo: draft.todo.trim(),
    kategorie: draft.kategorie || '',
    beschreibung: draft.beschreibung.trim(),
    braucht: draft.braucht.trim(),
    prio: draft.prio || 'normal',
    lat: draft.lat ?? null, lng: draft.lng ?? null, acc: draft.acc ?? null, locManual: !!draft.locManual,
    photoIds: [...draft.photoIds],
  };
  if (old) { for (const pid of old.photoIds || []) if (!entry.photoIds.includes(pid)) await DB.del('photos', pid); }
  await DB.put('entries', entry);
  draft = null; await DB.setMeta('draft', null);
  askPersist();
  toast('Gespeichert');
  go(old ? `#eintrag/${entry.id}` : '#liste');
}

/* ---------- Eintrag-Detail ---------- */
async function viewDetail(id) {
  const e = await DB.get('entries', id);
  if (!e || e.deleted) return go('#liste');
  const wiesen = await getWiesen();
  const byId = Object.fromEntries(wiesen.map((w) => [w.id, w]));
  const done = e.status === 'erledigt';
  const hasLoc = e.lat != null;
  app.innerHTML = `
    ${topbar({ title: entryTitle(e), back: '#liste', right: `<a class="iconbtn filled" href="#bearbeiten/${e.id}" aria-label="Bearbeiten">${I.edit}</a>` })}
    <main class="content form">
      ${e.photoIds && e.photoIds.length ? `<div class="gallery">${e.photoIds.map((p) => `<img data-photo="${p}" alt="Foto">`).join('')}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${done ? '<span class="badge ok">Erledigt</span>' : e.prio === 'dringend' ? '<span class="badge">Dringend</span>' : '<span class="pill">Offen</span>'}
      </div>
      <dl class="facts">
        <div><dt>Wo</dt><dd>${esc(wieseLabel(e, byId))}${hasLoc ? `<br><span class="small">${e.locManual ? 'Auf Karte gesetzt' : 'GPS ±' + e.acc + ' m'}</span>` : ''}</dd></div>
        ${e.todo ? `<div><dt>Zu erledigen</dt><dd>${esc(e.todo)}</dd></div>` : ''}
        ${e.beschreibung ? `<div><dt>Beschreibung</dt><dd>${esc(e.beschreibung)}</dd></div>` : ''}
        ${e.braucht ? `<div><dt>Wird gebraucht</dt><dd>${esc(e.braucht)}</dd></div>` : ''}
        <div><dt>Erfasst</dt><dd>${esc(fmtDate(e.createdAt))}${e.author ? ' von ' + esc(e.author) : ''}</dd></div>
        ${done ? `<div><dt>Erledigt</dt><dd>${esc(fmtDate(e.erledigtAt))}${e.erledigtVon ? ' von ' + esc(e.erledigtVon) : ''}</dd></div>` : ''}
      </dl>
      <button class="btn ${done ? '' : 'solid'}" id="btnDone" style="min-height:64px;font-size:19px">${done ? 'Wieder öffnen' : I.check + 'Erledigt'}</button>
      <div class="grid2">
        ${hasLoc ? `<a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}&travelmode=walking" target="_blank" rel="noopener">${I.nav}Hinführen</a>` : `<span></span>`}
        <button class="btn" id="btnShare">${I.share}Teilen</button>
      </div>
      ${hasLoc ? `<a class="btn" href="#karte" id="btnOnMap">${I.map}Auf Karte zeigen</a>` : ''}
    </main>`;
  $$('img[data-photo]').forEach(async (img) => { const u = await photoUrl(img.dataset.photo); if (u) img.src = u; });
  $('#btnDone').addEventListener('click', async () => {
    const author = await DB.getMeta('author', '');
    const upd = done ? { ...e, status: 'offen', erledigtAt: null, erledigtVon: null, updatedAt: now() }
                     : { ...e, status: 'erledigt', erledigtAt: now(), erledigtVon: author, updatedAt: now() };
    await DB.put('entries', upd);
    toast(done ? 'Wieder offen' : 'Erledigt ✓');
    go(done ? `#eintrag/${e.id}` : '#liste');
  });
  const onMap = $('#btnOnMap');
  if (onMap) onMap.addEventListener('click', () => sessionStorage.setItem('wbFocusEntry', e.id));
  $('#btnShare').addEventListener('click', () => shareEntry(e, byId));
}

async function shareEntry(e, byId) {
  const lines = [
    `Wiesenbuch: ${entryTitle(e)}`,
    `Wo: ${wieseLabel(e, byId)}`,
    e.beschreibung ? `Beschreibung: ${e.beschreibung}` : '',
    e.braucht ? `Braucht: ${e.braucht}` : '',
    e.prio === 'dringend' ? 'DRINGEND' : '',
    e.lat != null ? `Karte: https://www.google.com/maps?q=${e.lat},${e.lng}` : '',
  ].filter(Boolean);
  const text = lines.join('\n');
  const files = [];
  for (const pid of (e.photoIds || []).slice(0, 4)) {
    const p = await DB.get('photos', pid);
    if (p) files.push(new File([p.blob], `foto-${pid.slice(0, 6)}.jpg`, { type: 'image/jpeg' }));
  }
  try {
    if (files.length && navigator.canShare && navigator.canShare({ files })) await navigator.share({ text, files });
    else if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); toast('Text kopiert'); }
  } catch (err) { if (err.name !== 'AbortError') toast('Teilen nicht möglich'); }
}

/* ---------- 3 · Karte ---------- */
async function viewMap() {
  const [entries, wiesen] = await Promise.all([getEntries(), getWiesen()]);
  const byId = Object.fromEntries(wiesen.map((w) => [w.id, w]));
  const showDone = sessionStorage.getItem('wbShowDone') === '1';
  const list = entries.filter((e) => e.lat != null && (showDone || e.status !== 'erledigt'));
  app.innerHTML = `
    ${topbar({ title: 'Karte', sub: `${list.length} ${showDone ? 'Einträge' : 'offene Punkte'}`, right: `<button class="iconbtn filled" id="btnDoneToggle" aria-label="Erledigte ${showDone ? 'ausblenden' : 'einblenden'}" title="Erledigte ${showDone ? 'ausblenden' : 'einblenden'}">${I.check}</button>` })}
    <div class="mapwrap">
      <div id="map"></div>
      <div class="mapctl">
        <button id="btnLayer" aria-label="Luftbild oder Karte">${I.layers}</button>
        <button id="btnMe" aria-label="Mein Standort">${I.locate}</button>
      </div>
      <div class="sheet hidden" id="sheet"></div>
    </div>
    ${bottomnav('karte')}`;

  const map = await makeMap($('#map'));
  currentMap = map;
  const markers = {};
  for (const e of list) {
    const color = e.status === 'erledigt' ? '#7D877A' : e.prio === 'dringend' ? '#C2362B' : '#1F3D2B';
    const mk = L.marker([e.lat, e.lng], { icon: pinIcon(color, e.prio === 'dringend' ? 40 : 34), title: entryTitle(e), keyboard: true }).addTo(map);
    mk.on('click', () => showSheet(e));
    markers[e.id] = mk;
  }
  for (const w of wiesen) {
    if (w.lat == null) continue;
    L.marker([w.lat, w.lng], { icon: L.divIcon({ className: 'pin-icon', html: `<span style="background:rgba(255,255,255,.9);font:700 13px Atkinson Hyperlegible,system-ui;padding:3px 8px;border-radius:6px;white-space:nowrap;color:#17201A">${esc(w.name)}</span>`, iconSize: null }), interactive: false }).addTo(map);
  }

  const focus = sessionStorage.getItem('wbFocusEntry');
  sessionStorage.removeItem('wbFocusEntry');
  const fe = focus && list.find((e) => e.id === focus);
  if (fe) { map.setView([fe.lat, fe.lng], 18); showSheet(fe); }
  else if (list.length) map.fitBounds(L.latLngBounds(list.map((e) => [e.lat, e.lng])).pad(0.3), { maxZoom: 18 });
  else if (wiesen.some((w) => w.lat != null)) map.fitBounds(L.latLngBounds(wiesen.filter((w) => w.lat != null).map((w) => [w.lat, w.lng])).pad(0.3), { maxZoom: 17 });

  let meMarker = null, meWatch = null;
  if (navigator.geolocation) {
    meWatch = navigator.geolocation.watchPosition((p) => {
      const ll = [p.coords.latitude, p.coords.longitude];
      if (!meMarker) meMarker = L.marker(ll, { icon: meIcon, interactive: false }).addTo(map); else meMarker.setLatLng(ll);
      if (!list.length && !fe && !map._wbCentered) { map._wbCentered = true; map.setView(ll, 17); }
    }, () => {}, { enableHighAccuracy: true, maximumAge: 15000 });
    leaveHooks.push(() => navigator.geolocation.clearWatch(meWatch));
  }

  $('#btnLayer').onclick = () => map._wbToggle();
  $('#btnMe').onclick = async () => {
    if (meMarker) { map.setView(meMarker.getLatLng(), 18); return; }
    try { const p = await locateOnce(); map.setView([p.lat, p.lng], 18); } catch (e) { toast('Standort nicht gefunden'); }
  };
  $('#btnDoneToggle').onclick = () => { sessionStorage.setItem('wbShowDone', showDone ? '0' : '1'); render(); };
  map.on('click', () => $('#sheet').classList.add('hidden'));

  async function showSheet(e) {
    const s = $('#sheet');
    let dist = '';
    if (meMarker) { const d = distM(meMarker.getLatLng(), e); dist = ` · ${d < 1000 ? Math.round(d) + ' m' : (d / 1000).toFixed(1) + ' km'} entfernt`; }
    s.innerHTML = `
      <a class="card" href="#eintrag/${e.id}">
        ${e.photoIds && e.photoIds.length ? `<img class="thumb" style="width:64px;height:64px" data-photo="${e.photoIds[0]}" alt="">` : ''}
        <div class="body"><h2>${esc(entryTitle(e))}</h2>
          <span class="l1">${esc(wieseLabel(e, byId))}${dist}</span>
          ${e.braucht ? `<span class="l2">Braucht: ${esc(e.braucht)}</span>` : ''}</div>
      </a>
      <div class="grid2">
        <a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}&travelmode=walking" target="_blank" rel="noopener">${I.nav}Hinführen</a>
        <a class="btn solid" href="#eintrag/${e.id}">Details</a>
      </div>`;
    s.classList.remove('hidden');
    const img = $('img[data-photo]', s); if (img) img.src = await photoUrl(img.dataset.photo);
  }
}

/* ---------- 4 · Meine Wiesen ---------- */
async function viewWiesen() {
  const [wiesen, entries] = await Promise.all([getWiesen(), getEntries()]);
  const back = sessionStorage.getItem('wbReturn') || '#einstellungen';
  const offenBy = {};
  entries.forEach((e) => { if (e.status !== 'erledigt' && e.wieseId) offenBy[e.wieseId] = (offenBy[e.wieseId] || 0) + 1; });
  app.innerHTML = `
    ${topbar({ title: 'Meine Wiesen', back })}
    <main class="content form">
      <div class="list-plain">
        ${wiesen.length ? wiesen.map((w) => `
          <button class="wrow" data-edit="${w.id}" style="border:0;text-align:left;width:100%">
            <div class="body"><b>${esc(w.name)}</b>
              <span class="l1">${[w.reihen ? w.reihen + ' Reihen' : '', w.lat != null ? 'Standort gemerkt' : 'ohne Standort'].filter(Boolean).join(' · ')}</span></div>
            <span class="pill">${offenBy[w.id] || 0} offen</span>
          </button>`).join('') : `<p class="empty" style="padding:16px">Noch keine Wiesen. Unten die erste anlegen.</p>`}
      </div>
      <section class="boxed dash" id="newW">
        <h2>Neue Wiese anlegen</h2>
        <label class="lbl" for="wName">Name</label>
        <input class="inp" id="wName" autocomplete="off" placeholder="z. B. Etschwiese">
        <label class="lbl" for="wReihen">Anzahl Reihen (optional)</label>
        <input class="inp" id="wReihen" inputmode="numeric" autocomplete="off">
        <div class="small" id="wLocInfo">Standort: noch nicht gesetzt. Damit schlägt die App die Wiese automatisch vor.</div>
        <div class="grid2">
          <button class="btn" id="wHere">${I.locate}Bin gerade dort</button>
          <button class="btn" id="wPick">${I.map}Auf Karte</button>
        </div>
        <button class="btn solid" id="wSave">Wiese speichern</button>
      </section>
    </main>`;

  let newLoc = null;
  const info = () => { $('#wLocInfo').textContent = newLoc ? 'Standort: gesetzt ✓' : 'Standort: noch nicht gesetzt. Damit schlägt die App die Wiese automatisch vor.'; };
  $('#wHere').onclick = async () => { toast('Standort wird ermittelt …'); try { newLoc = await locateOnce({ maxAge: 0 }); info(); } catch (e) { toast('Standort nicht gefunden'); } };
  $('#wPick').onclick = async () => { const c = await pickOnMap({ title: 'Mitte der Wiese wählen', onPick: () => {} }); if (c) { newLoc = { lat: c.lat, lng: c.lng }; info(); } };
  $('#wSave').onclick = async () => {
    const name = $('#wName').value.trim();
    if (!name) { toast('Bitte einen Namen eingeben'); $('#wName').focus(); return; }
    if (wiesen.some((w) => w.name.toLowerCase() === name.toLowerCase())) { toast('Diese Wiese gibt es schon'); return; }
    const w = { id: uid(), name, reihen: $('#wReihen').value.trim(), lat: newLoc?.lat ?? null, lng: newLoc?.lng ?? null, updatedAt: now() };
    await DB.put('wiesen', w);
    askPersist();
    // im laufenden Entwurf gleich auswählen
    const d = await DB.getMeta('draft', null);
    if (d && sessionStorage.getItem('wbReturn')?.match(/^#(neu|bearbeiten)/)) { d.wieseId = w.id; d._wieseManual = true; await DB.setMeta('draft', d); }
    toast(`„${name}“ angelegt`);
    const ret = sessionStorage.getItem('wbReturn');
    sessionStorage.removeItem('wbReturn');
    if (ret && /^#(neu|bearbeiten)/.test(ret)) go(ret); else render();
  };
  $$('[data-edit]').forEach((b) => b.addEventListener('click', () => editWiese(wiesen.find((w) => w.id === b.dataset.edit), offenBy)));
  if (sessionStorage.getItem('wbFocusNew')) { sessionStorage.removeItem('wbFocusNew'); setTimeout(() => $('#wName').focus(), 100); }
  leaveHooks.push(() => { if (!/^#wiesen/.test(location.hash) && !/^#(neu|bearbeiten)/.test(location.hash)) sessionStorage.removeItem('wbReturn'); });
}

function editWiese(w, offenBy) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="box" role="dialog" aria-label="Wiese bearbeiten">
    <h2>Wiese bearbeiten</h2>
    <label class="lbl" for="ewName">Name</label><input class="inp" id="ewName" value="${esc(w.name)}">
    <label class="lbl" for="ewReihen">Anzahl Reihen</label><input class="inp" id="ewReihen" inputmode="numeric" value="${esc(w.reihen)}">
    <div class="small" id="ewLoc">${w.lat != null ? 'Standort gemerkt ✓' : 'Kein Standort gemerkt'}</div>
    <div class="grid2"><button class="btn" id="ewHere">${I.locate}Bin gerade dort</button><button class="btn" id="ewPick">${I.map}Auf Karte</button></div>
    <button class="btn solid" id="ewSave">Speichern</button>
    <div class="grid2"><button class="btn danger" id="ewDel">Löschen</button><button class="btn" id="ewCancel">Abbrechen</button></div>
  </div>`;
  document.body.appendChild(m);
  let loc = w.lat != null ? { lat: w.lat, lng: w.lng } : null;
  const close = () => m.remove();
  m.addEventListener('click', (ev) => { if (ev.target === m) close(); });
  $('#ewCancel', m).onclick = close;
  $('#ewHere', m).onclick = async () => { try { loc = await locateOnce({ maxAge: 0 }); $('#ewLoc', m).textContent = 'Standort gesetzt ✓'; } catch (e) { toast('Standort nicht gefunden'); } };
  $('#ewPick', m).onclick = async () => { const c = await pickOnMap({ title: 'Mitte der Wiese wählen', start: loc, onPick: () => {} }); if (c) { loc = { lat: c.lat, lng: c.lng }; $('#ewLoc', m).textContent = 'Standort gesetzt ✓'; } };
  $('#ewSave', m).onclick = async () => {
    const name = $('#ewName', m).value.trim();
    if (!name) return toast('Bitte einen Namen eingeben');
    await DB.put('wiesen', { ...w, name, reihen: $('#ewReihen', m).value.trim(), lat: loc?.lat ?? null, lng: loc?.lng ?? null, updatedAt: now() });
    close(); render();
  };
  $('#ewDel', m).onclick = async () => {
    const n = offenBy[w.id] || 0;
    if (!confirm(n ? `„${w.name}“ löschen? ${n} offene Einträge behalten den Namen.` : `„${w.name}“ löschen?`)) return;
    await DB.del('wiesen', w.id); close(); render();
  };
}

/* ---------- Einstellungen, Sichern ---------- */
async function viewSettings() {
  const author = await DB.getMeta('author', '');
  const lastExport = await DB.getMeta('lastExport', null);
  const entries = await getEntries();
  let storage = '';
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      storage = `${(est.usage / 1048576).toFixed(1)} MB belegt · ${persisted ? 'dauerhaft gespeichert ✓' : 'nicht dauerhaft geschützt'}`;
    }
  } catch (e) {}
  app.innerHTML = `
    ${topbar({ title: 'Einstellungen', back: '#liste' })}
    <main class="content form">
      <section class="boxed">
        <h2>Wer benutzt dieses Handy?</h2>
        <label class="lbl" for="sAuthor">Name (steht bei den Einträgen)</label>
        <input class="inp" id="sAuthor" value="${esc(author)}" placeholder="z. B. Tata">
        <button class="btn solid" id="sAuthorSave">Name speichern</button>
      </section>
      <a class="btn" href="#wiesen" id="sWiesen">${I.map}Meine Wiesen verwalten</a>
      <section class="boxed">
        <h2>Sichern</h2>
        <p class="small" style="margin:0">Alle ${entries.length} Einträge mit Fotos als ZIP-Datei sichern – z. B. per WhatsApp schicken oder in die Cloud legen. ${lastExport ? 'Zuletzt gesichert: ' + esc(fmtDate(lastExport)) + '.' : 'Noch nie gesichert.'}</p>
        <button class="btn solid" id="sExport">${I.share}Sicherung erstellen</button>
        <button class="btn" id="sImport">Sicherung einspielen</button>
        <p class="small" style="margin:0">Beim Einspielen wird zusammengeführt: Neuere Änderungen gewinnen, nichts wird doppelt.</p>
      </section>
      <section class="boxed">
        <h2>Abgleich mit pCloud</h2>
        <p class="small" style="margin:0">Kommt in Version 2: Einträge zwischen mehreren Handys teilen.</p>
      </section>
      <p class="small">Wiesenbuch ${APP_VERSION}${storage ? ' · ' + storage : ''}</p>
    </main>`;
  $('#sWiesen').onclick = () => sessionStorage.setItem('wbReturn', '#einstellungen');
  $('#sAuthorSave').onclick = async () => { await DB.setMeta('author', $('#sAuthor').value.trim()); toast('Gespeichert'); };
  $('#sExport').onclick = exportZip;
  $('#sImport').onclick = () => $('#importInput').click();
}

async function exportZip() {
  toast('Sicherung wird erstellt …', 6000);
  const zip = new JSZip();
  const entries = await DB.all('entries');
  const wiesen = await DB.all('wiesen');
  const photos = await DB.all('photos');
  zip.file('wiesenbuch.json', JSON.stringify({ app: 'wiesenbuch', version: 1, exportedAt: now(), entries, wiesen, photos: photos.map((p) => ({ id: p.id, entryId: p.entryId, createdAt: p.createdAt })) }, null, 2));
  const used = new Set(entries.flatMap((e) => e.photoIds || []));
  for (const p of photos) if (used.has(p.id)) zip.file(`fotos/${p.id}.jpg`, p.blob);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  const name = `wiesenbuch-${new Date().toISOString().slice(0, 10)}.zip`;
  const file = new File([blob], name, { type: 'application/zip' });
  await DB.setMeta('lastExport', now());
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Wiesenbuch-Sicherung' }); toast('Sicherung geteilt'); render(); return; }
  } catch (err) { if (err.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  toast('Sicherung heruntergeladen'); render();
}

$('#importInput').addEventListener('change', async (ev) => {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  try {
    const zip = await JSZip.loadAsync(f);
    const jf = zip.file('wiesenbuch.json');
    if (!jf) throw new Error('Keine Wiesenbuch-Sicherung');
    const data = JSON.parse(await jf.async('string'));
    let nE = 0, nW = 0;
    for (const w of data.wiesen || []) {
      const old = await DB.get('wiesen', w.id);
      if (!old || (w.updatedAt || '') > (old.updatedAt || '')) { await DB.put('wiesen', w); nW++; }
    }
    for (const e of data.entries || []) {
      const old = await DB.get('entries', e.id);
      if (!old || (e.updatedAt || '') > (old.updatedAt || '')) {
        for (const pid of e.photoIds || []) {
          if (!(await DB.get('photos', pid))) {
            const pf = zip.file(`fotos/${pid}.jpg`);
            if (pf) await DB.put('photos', { id: pid, entryId: e.id, blob: new Blob([await pf.async('arraybuffer')], { type: 'image/jpeg' }), createdAt: now() });
          }
        }
        await DB.put('entries', e); nE++;
      }
    }
    toast(`Eingespielt: ${nE} Einträge, ${nW} Wiesen`);
    render();
  } catch (err) {
    toast('Datei konnte nicht gelesen werden: ' + err.message, 4000);
  }
});

/* ---------- Erststart ---------- */
async function firstRun() {
  const author = await DB.getMeta('author', null);
  if (author !== null) return;
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="box" role="dialog" aria-label="Willkommen">
    <h2>Willkommen im Wiesenbuch</h2>
    <p class="small" style="margin:0">Wer benutzt dieses Handy? Der Name steht später bei den Einträgen.</p>
    <label class="lbl" for="frName">Name</label>
    <input class="inp" id="frName" placeholder="z. B. Tata">
    <button class="btn solid" id="frOk">Los geht’s</button>
  </div>`;
  document.body.appendChild(m);
  $('#frOk', m).onclick = async () => { await DB.setMeta('author', $('#frName', m).value.trim()); m.remove(); };
}

/* ---------- Start ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    const hadController = !!navigator.serviceWorker.controller;
    let shown = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (shown || !hadController) return; shown = true;
      toast('Neue Version installiert – wird beim nächsten Öffnen aktiv', 4000);
    });
  });
}
render();
firstRun();

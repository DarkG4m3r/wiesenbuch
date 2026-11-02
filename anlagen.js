/* Wiesenbuch – Anlagen, Leitungen, Karte mit Kartenmenü, „Mehr“ (ab 0.2)
   Wird vor app.js geladen; alles hier wird erst beim Aufruf benutzt. */

const ANL_BLUE = '#234B8A';
const ANL_TYPES = ['Schacht', 'Schieber', 'Hydrant', 'Pumpe', 'Strom', 'Beregnung', 'Leitung'];
const ANL_ICON = {
  Schacht: '<circle cx="12" cy="12" r="8"/><path d="M6.5 9h11M5 12h14M6.5 15h11"/>',
  Schieber: '<path d="M3 7v10l9-5zM21 7v10l-9-5z"/><path d="M12 12V4M9 4h6"/>',
  Hydrant: '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/>',
  Pumpe: '<circle cx="12" cy="12" r="8"/><path d="M12 12l5-3M12 12l-5-3M12 12v6"/>',
  Strom: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  Beregnung: '<path d="M12 21v-9M12 12l-6-5M12 12l6-5M12 12V4"/><path d="M4 5h.01M20 5h.01M12 2h.01M7 3h.01M17 3h.01"/>',
  Leitung: '<circle cx="4" cy="18" r="2"/><circle cx="20" cy="6" r="2"/><path d="M6 18h6V6h6"/>',
  _: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
};
const LINE_COLORS = [['Wasser', '#234B8A'], ['Strom', '#C99700'], ['Drainage', '#7A4E2D'], ['Frostberegnung', '#0F7F7F'], ['Sonstiges', '#8E3B8E'], ['Grau', '#5E6A5B']];
const PHOTO_CAP = 1000;
const MORE_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';

function anlIcon(typ, size = 24) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ANL_ICON[typ] || ANL_ICON._}</svg>`;
}
async function getAnlagen() {
  return (await DB.all('anlagen')).filter((a) => !a.deleted)
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de', { numeric: true }));
}
async function getCustomTypes() { return DB.getMeta('customTypes', []); }
async function allTypes() { const c = await getCustomTypes(); return [...ANL_TYPES, ...c.filter((t) => !ANL_TYPES.includes(t))]; }
function lineLength(points) { let s = 0; for (let i = 1; i < (points || []).length; i++) s += distM(points[i - 1], points[i]); return s; }
function wieseName(id, byId, fallback) { return id === ANDERES ? 'Hof / Anderes' : (byId[id]?.name || fallback || ''); }
function anlSub(a, byId) {
  if (a.typ === 'Leitung') return [a.colorName || 'Leitung', `${Math.round(lineLength(a.points))} m`, `${(a.points || []).length} Punkte`, a.dim].filter(Boolean).join(' · ');
  return [a.typ, wieseName(a.wieseId, byId, a.wieseName), a.lage, a.dim].filter(Boolean).join(' · ');
}
function nextName(typ, anlagen, exceptId) {
  const re = new RegExp('^' + typ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+(\\d+)$');
  let max = 0;
  for (const a of anlagen) { if (a.id === exceptId || a.typ !== typ) continue; const m = (a.name || '').match(re); max = Math.max(max, m ? +m[1] : 0); }
  const count = anlagen.filter((a) => a.typ === typ && a.id !== exceptId).length;
  return `${typ} ${Math.max(max, count) + 1}`;
}
function nearestWiese(wiesen, p) {
  let best = null, bestD = Infinity;
  for (const w of wiesen) { if (w.lat == null) continue; const d = distM(p, w); if (d < bestD) { bestD = d; best = w; } }
  return best && bestD <= 500 ? best : null;
}
function wieseOptsHtml(wiesen, sel) {
  return [...wiesen.map((w) => ({ id: w.id, name: w.name })), { id: ANDERES, name: 'Hof / Anderes' }]
    .map((o) => `<button class="opt ${sel === o.id ? 'on' : ''}" data-w="${esc(o.id)}">${esc(o.name)}</button>`).join('');
}
function bottomnavHtml(active) {
  const t = (key, href, icon, label) => `<a href="${href}" class="${active === key ? 'on' : ''} ${key === 'anlagen' ? 'blue' : ''}" ${active === key ? 'aria-current="page"' : ''}>${icon}${label}</a>`;
  return `<nav class="bottomnav four" aria-label="Hauptnavigation">
    ${t('liste', '#liste', I.list, 'Aufgaben')}
    ${t('karte', '#karte', I.map, 'Karte')}
    ${t('anlagen', '#anlagen', anlIcon('Schacht', 24), 'Anlagen')}
    ${t('mehr', '#mehr', MORE_ICON, 'Mehr')}
    <span class="tabind" aria-hidden="true"></span>
  </nav>`;
}
function topbarBlue(opts) { return topbar(opts).replace('class="topbar"', 'class="topbar blue"'); }

/* ---------- Fotos (mehrere je Anlage / Punkt) ---------- */
function pickFiles(camera) {
  return new Promise((resolve) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = 'image/*';
    if (camera) i.setAttribute('capture', 'environment'); else i.multiple = true;
    i.onchange = () => resolve([...i.files]);
    i.click();
  });
}
async function storePhotos(files, ownerId) {
  const ids = [];
  for (const f of files) {
    const blob = await compressImage(f);
    const id = uid();
    await DB.put('photos', { id, entryId: ownerId, blob, createdAt: now() });
    ids.push(id);
  }
  askPersist();
  setTimeout(() => enforcePhotoCap().catch(() => {}), 800);
  return ids;
}
// Höchstens 1000 Fotos: zuerst Fotos erledigter Aufgaben, dann offener, zuletzt Anlagen – jeweils das älteste zuerst
async function enforcePhotoCap() {
  const photos = await DB.all('photos');
  if (photos.length <= PHOTO_CAP) return;
  let excess = photos.length - PHOTO_CAP;
  const created = Object.fromEntries(photos.map((p) => [p.id, p.createdAt || '']));
  const entries = await DB.all('entries'), anlagen = await DB.all('anlagen');
  const groups = [[], [], []];
  for (const e of entries) for (const pid of e.photoIds || []) if (pid in created) groups[e.status === 'erledigt' ? 0 : 1].push({ pid, owner: e, store: 'entries' });
  for (const a of anlagen) {
    for (const pid of a.photoIds || []) if (pid in created) groups[2].push({ pid, owner: a, store: 'anlagen' });
    for (const pt of a.points || []) for (const pid of pt.photoIds || []) if (pid in created) groups[2].push({ pid, owner: a, store: 'anlagen', pt });
  }
  const changed = new Map();
  for (const g of groups) {
    g.sort((x, y) => created[x.pid].localeCompare(created[y.pid]));
    for (const it of g) {
      if (excess <= 0) break;
      await DB.del('photos', it.pid); excess--;
      if (it.pt) it.pt.photoIds = it.pt.photoIds.filter((x) => x !== it.pid);
      else it.owner.photoIds = it.owner.photoIds.filter((x) => x !== it.pid);
      changed.set(it.store + ':' + it.owner.id, it);
    }
    if (excess <= 0) break;
  }
  for (const it of changed.values()) await DB.put(it.store, it.owner);
}
function mountPhotoGrid(el, o) {
  let ids = [...(o.ids || [])];
  let fresh = new Set();
  const editable = o.editable !== false;
  const render = () => {
    el.innerHTML = `<div class="photos">
      ${ids.map((id, i) => `<div class="ph ${fresh.has(id) ? 'pop' : ''}"><button class="phopen" data-i="${i}" aria-label="Foto ${i + 1} groß anzeigen"><img data-photo="${id}" alt=""></button>${editable ? `<button class="phrm" data-rm="${id}" aria-label="Foto entfernen">${I.x}</button>` : ''}</div>`).join('')}
      ${editable ? `<button class="ph add" data-add="cam">${I.cam}<span>Foto</span></button><button class="ph add" data-add="gal">${I.gal}<span>Galerie</span></button>` : ''}
    </div>${!ids.length && !editable ? '<p class="small">Keine Fotos</p>' : ''}`;
    $$('img[data-photo]', el).forEach(async (img) => { const u = await photoUrl(img.dataset.photo); if (u) img.src = u; });
    $$('[data-rm]', el).forEach((b) => b.onclick = async () => {
      if (!confirm('Dieses Foto löschen?')) return;
      await DB.del('photos', b.dataset.rm);
      ids = ids.filter((x) => x !== b.dataset.rm); render(); o.onChange && o.onChange([...ids]);
    });
    $$('[data-add]', el).forEach((b) => b.onclick = async () => {
      const files = await pickFiles(b.dataset.add === 'cam');
      if (!files.length) return;
      if (b.dataset.add === 'cam') camFlash();
      toast(files.length > 1 ? `${files.length} Fotos werden gespeichert …` : 'Foto wird gespeichert …', 1500);
      const nids = await storePhotos(files, o.ownerId);
      ids.push(...nids); fresh = new Set(nids); render(); fresh = new Set(); o.onChange && o.onChange([...ids]);
    });
    $$('.phopen', el).forEach((b) => b.onclick = () => openPhotoViewer(ids, +b.dataset.i));
  };
  render();
}
async function openPhotoViewer(ids, start) {
  if (!ids.length) return;
  let i = start || 0;
  const m = document.createElement('div');
  m.className = 'viewer';
  m.innerHTML = `<div class="vtop"><span id="vCount"></span><button class="iconbtn" id="vClose" aria-label="Schließen">${I.x}</button></div>
    <img id="vImg" alt="Foto"><div class="vnav"><button class="btn light" id="vPrev">‹ Zurück</button><button class="btn light" id="vNext">Weiter ›</button></div>`;
  document.body.appendChild(m);
  const show = async () => {
    $('#vCount', m).textContent = `Foto ${i + 1} von ${ids.length}`;
    $('#vImg', m).src = (await photoUrl(ids[i])) || '';
    $('#vPrev', m).disabled = i === 0; $('#vNext', m).disabled = i === ids.length - 1;
  };
  $('#vClose', m).onclick = () => m.remove();
  $('#vPrev', m).onclick = () => { if (i > 0) { i--; show(); } };
  $('#vNext', m).onclick = () => { if (i < ids.length - 1) { i++; show(); } };
  let sx = null;
  m.addEventListener('touchstart', (ev) => { sx = ev.touches[0].clientX; }, { passive: true });
  m.addEventListener('touchend', (ev) => { if (sx == null) return; const dx = ev.changedTouches[0].clientX - sx; if (dx > 50 && i > 0) { i--; show(); } else if (dx < -50 && i < ids.length - 1) { i++; show(); } sx = null; });
  show();
}

/* ---------- Verknüpfte Aufgaben ---------- */
async function linkedTasksHtml(anlId) {
  const tasks = (await getEntries()).filter((e) => e.anlageId === anlId)
    .sort((a, b) => (a.status === 'erledigt') - (b.status === 'erledigt') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  return `<section class="sec">
    <h2>Aufgaben zu dieser Anlage</h2>
    ${tasks.length ? `<div class="list-plain">${tasks.map((e) => `
      <a class="wrow" href="#eintrag/${e.id}" style="text-decoration:none;color:inherit;${e.status === 'erledigt' ? 'opacity:.75' : ''}">
        <span class="dot" style="background:${e.status === 'erledigt' ? '#1F3D2B' : e.prio === 'dringend' ? '#B4530A' : '#5B6558'}"></span>
        <div class="body"><b>${esc(entryTitle(e))}</b><span class="l1">${e.status === 'erledigt' ? 'Erledigt · ' + esc(fmtDate(e.erledigtAt)) : 'Offen · ' + esc(fmtDate(e.createdAt))}${e.author ? ' · ' + esc(e.author) : ''}</span></div>
      </a>`).join('')}</div>` : '<p class="small" style="margin:0">Noch keine Aufgaben verknüpft.</p>'}
    <button class="btn dashed" id="btnTaskFor">${I.plusS}Aufgabe dazu erstellen</button>
    <span class="hint">Ort, Wiese und Anlage werden automatisch übernommen.</span>
  </section>`;
}
async function newTaskFor(a, pt) {
  const cur = await DB.getMeta('draft', null);
  if (cur && !cur._edit && (cur.todo || cur.beschreibung || (cur.photoIds || []).length) && !confirm('Ein angefangener Eintrag wird verworfen. Weiter?')) return;
  if (cur && !cur._edit) for (const pid of cur.photoIds || []) await DB.del('photos', pid);
  const p = pt || a;
  await DB.setMeta('draft', {
    id: uid(), _new: true, status: 'offen', prio: 'normal', photoIds: [], kategorie: '', todo: '', beschreibung: '', braucht: '',
    wieseId: a.wieseId || null, _wieseManual: !!a.wieseId,
    reihe: a.wieseId === ANDERES ? '' : (a.lage || ''), ort: a.wieseId === ANDERES ? (a.lage || a.name) : '',
    anlageId: a.id, lat: p.lat ?? null, lng: p.lng ?? null, acc: null, locManual: p.lat != null,
  });
  go('#neu');
}
// Im Aufgaben-Formular: Anlage in der Nähe vorschlagen / Verknüpfung anzeigen
async function renderAnlLink() {
  const box = $('#anlLink');
  if (!box || !draft) return;
  const anl = await getAnlagen();
  if (draft.anlageId) {
    const a = anl.find((x) => x.id === draft.anlageId);
    box.innerHTML = a ? `<div class="anlchip"><span class="anlicon sm">${anlIcon(a.typ, 18)}</span><span>Gehört zu <b>${esc(a.name)}</b></span><button class="iconbtn" id="anlUnlink" aria-label="Verknüpfung entfernen" style="width:40px;height:40px">${I.x}</button></div>` : '';
    const u = $('#anlUnlink'); if (u) u.onclick = () => { draft.anlageId = null; saveDraftSoon(); renderAnlLink(); };
    return;
  }
  if (draft.lat == null) { box.innerHTML = ''; return; }
  let best = null, bestD = Infinity;
  for (const a of anl) {
    const pts = a.typ === 'Leitung' ? (a.points || []) : (a.lat != null ? [a] : []);
    for (const p of pts) { const d = distM(draft, p); if (d < bestD) { bestD = d; best = a; } }
  }
  if (best && bestD <= 15) {
    box.innerHTML = `<button class="btn dashed blue" id="anlSuggest">${anlIcon(best.typ, 20)}Zu „${esc(best.name)}“ zuordnen (${Math.round(bestD)} m)</button>`;
    $('#anlSuggest').onclick = () => { draft.anlageId = best.id; saveDraftSoon(); renderAnlLink(); };
  } else box.innerHTML = '';
}

/* ---------- 7 · Anlagen-Liste ---------- */
let anlFilter = 'Alle';
async function viewAnlagen() {
  const [anl, wiesen, entries, collapsed] = await Promise.all([getAnlagen(), getWiesen(), getEntries(), DB.getMeta('anlCollapsed', {})]);
  const byId = Object.fromEntries(wiesen.map((w) => [w.id, w]));
  const openBy = {};
  entries.forEach((e) => { if (e.anlageId && e.status !== 'erledigt') openBy[e.anlageId] = (openBy[e.anlageId] || 0) + 1; });
  const present = [...new Set(anl.map((a) => a.typ))];
  if (anlFilter !== 'Alle' && !present.includes(anlFilter)) anlFilter = 'Alle';
  const shown = anl.filter((a) => anlFilter === 'Alle' || a.typ === anlFilter);
  const keyOf = (a) => (a.wieseId === ANDERES ? ANDERES : a.wieseId && byId[a.wieseId] ? a.wieseId : '_ohne');
  const groups = new Map();
  for (const a of shown) { const k = keyOf(a); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(a); }
  const order = [...wiesen.map((w) => w.id).filter((k) => groups.has(k)), ...(groups.has(ANDERES) ? [ANDERES] : []), ...(groups.has('_ohne') ? ['_ohne'] : [])];
  const nameOf = (k) => (k === ANDERES ? 'Hof / Anderes' : k === '_ohne' ? 'Ohne Wiese' : byId[k].name);
  const newId = sessionStorage.getItem('wbNew'); sessionStorage.removeItem('wbNew');
  const row = (a) => `<a class="arow ${a.id === newId ? 'is-new' : ''}" href="#${a.typ === 'Leitung' ? 'leitung' : 'anlage'}/${a.id}">
      <span class="anlicon" style="background:${a.typ === 'Leitung' ? (a.color || ANL_BLUE) : ANL_BLUE}">${anlIcon(a.typ, 24)}</span>
      <span class="body"><b>${esc(a.name)}</b><span class="l1">${esc(anlSub(a, byId))}</span></span>
      ${openBy[a.id] ? `<span class="badge">${openBy[a.id]} ${openBy[a.id] > 1 ? 'Aufgaben' : 'Aufgabe'}</span>` : ''}
    </a>`;
  const body = !anl.length
    ? `<p class="empty">Noch keine Anlagen.<br>Schächte, Schieber, Leitungen … mit „Neue Anlage“ erfassen.</p>`
    : order.map((k) => {
      const items = groups.get(k), isOpen = !collapsed[k];
      return `<section class="grp">
        <button class="grphead" data-g="${esc(k)}" aria-expanded="${isOpen}">
          <span class="gname">${esc(nameOf(k))}</span>
          <span class="pill blue">${items.length} ${items.length === 1 ? 'Anlage' : 'Anlagen'}</span>
          <svg class="chev ${isOpen ? 'up' : ''}" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        ${isOpen ? `<div class="grpbody">${items.map(row).join('')}</div>` : ''}
      </section>`;
    }).join('');
  const nW = new Set(anl.map(keyOf)).size;
  app.innerHTML = `
    ${topbar({ title: 'Anlagen', sub: anl.length ? `${anl.length} ${anl.length === 1 ? 'Anlage' : 'Anlagen'} auf ${nW} ${nW === 1 ? 'Wiese' : 'Wiesen'}` : 'Schächte, Schieber, Leitungen …' })}
    ${present.length > 1 ? `<div class="headwrap"><div class="chips scroll" role="group" aria-label="Nach Typ filtern">
      ${['Alle', ...present].map((t) => `<button class="chip-h ${anlFilter === t ? 'on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}
    </div></div>` : ''}
    <main class="content">${body}</main>
    <div class="fabwrap"><a class="fab blue" href="#anlage-neu">${I.plus}Neue Anlage</a></div>
    ${bottomnavHtml('anlagen')}`;
  $$('.chip-h[data-t]').forEach((b) => b.onclick = () => { anlFilter = b.dataset.t; render(); });
  $$('.grphead').forEach((b) => b.onclick = async () => {
    const c = await DB.getMeta('anlCollapsed', {}); c[b.dataset.g] = !c[b.dataset.g]; await DB.setMeta('anlCollapsed', c);
    const y = window.scrollY; await render(); window.scrollTo(0, y);
  });
}

/* ---------- 8 · Anlage erfassen / bearbeiten ---------- */
let ad = null, adTimer = null, mWatch = null, mTimer = null, mState = 'idle';
const saveAdSoon = () => { clearTimeout(adTimer); adTimer = setTimeout(() => { if (ad) DB.setMeta('anlDraft', ad); }, 300); };

async function viewAnlageForm(editId) {
  const [wiesen, anl] = await Promise.all([getWiesen(), getAnlagen()]);
  let types = await allTypes();
  if (editId) {
    const a = await DB.get('anlagen', editId);
    if (!a || a.deleted) return go('#anlagen');
    if (a.typ === 'Leitung') return go('#leitung/' + editId);
    const d = await DB.getMeta('anlDraft', null);
    ad = d && d.id === editId ? d : { ...a, _edit: true, photoIds: [...(a.photoIds || [])], nameTouched: true, wieseManual: true };
  } else {
    const d = await DB.getMeta('anlDraft', null);
    ad = d && !d._edit ? d : { id: uid(), typ: 'Schacht', name: nextName('Schacht', anl), nameTouched: false, wieseId: null, wieseManual: false, lage: '', lat: null, lng: null, acc: null, locManual: false, photoIds: [], dim: '', tiefe: '', notiz: '' };
  }
  await DB.setMeta('anlDraft', ad);
  if (ad._edit) types = types.filter((t) => t !== 'Leitung');
  const isEdit = !!ad._edit;

  app.innerHTML = `
    ${topbarBlue({ title: isEdit ? 'Anlage bearbeiten' : 'Neue Anlage', back: isEdit ? `#anlage/${ad.id}` : '#anlagen' })}
    <main class="content form">
      <section class="sec">
        <h2>Was ist es?</h2>
        <div class="typegrid" id="types"></div>
        <div id="newType"></div>
      </section>
      <section class="sec">
        <label class="h" for="aName">Bezeichnung</label>
        <input class="inp" id="aName" autocomplete="off" value="${esc(ad.name)}">
        <span class="hint">Nummer wird automatisch vorgeschlagen – kann überschrieben werden.</span>
      </section>
      <section class="boxed bluebox" aria-live="polite">
        <div style="display:flex;gap:12px;align-items:center">
          <div class="mcircle">${I.locate}</div>
          <div style="display:flex;flex-direction:column;gap:3px;flex:1"><b id="mTitle">Genau einmessen</b><span class="l1" id="mSub">Direkt über die Anlage stellen</span></div>
        </div>
        <div class="progress"><div id="mBar"></div></div>
        <div class="grid2"><button class="btn bl" id="mStart">Neu messen</button><button class="btn bl" id="mPick">Auf Karte</button></div>
      </section>
      <section class="sec">
        <h2>Welche Wiese?</h2>
        <span class="hint" id="awHint"></span>
        <div class="grid2" id="aWiesen">${wieseOptsHtml(wiesen, ad.wieseId)}</div>
        <label class="lbl" for="aLage">Reihe / Lage (optional)</label>
        <input class="inp" id="aLage" autocomplete="off" placeholder="z. B. Reihe 12, Mitte" value="${esc(ad.lage)}">
      </section>
      <section class="sec">
        <h2>Fotos</h2>
        <div id="aPhotos"></div>
      </section>
      <section class="sec">
        <h2>Details (optional)</h2>
        <div class="grid2">
          <div class="sec" style="gap:4px"><label class="lbl" for="aDim">Dimension</label><input class="inp" id="aDim" autocomplete="off" placeholder="z. B. DN 50" value="${esc(ad.dim)}"></div>
          <div class="sec" style="gap:4px"><label class="lbl" for="aTiefe">Tiefe</label><input class="inp" id="aTiefe" autocomplete="off" placeholder="z. B. 0,8 m" value="${esc(ad.tiefe)}"></div>
        </div>
        <label class="lbl" for="aNotiz">Notiz</label>
        <textarea class="inp" id="aNotiz" rows="3" style="padding-right:12px">${esc(ad.notiz)}</textarea>
      </section>
      <button class="btn big blue" id="aSave">${I.check}Anlage speichern</button>
      ${isEdit ? '<button class="btn danger" id="aDelete">Anlage löschen</button>' : '<button class="btn" id="aDiscard">Verwerfen</button>'}
    </main>`;

  const renderTypes = () => {
    $('#types').innerHTML = types.map((t) => `<button class="tbtn ${ad.typ === t ? 'on' : ''}" data-t="${esc(t)}" ${ANL_TYPES.includes(t) ? '' : 'data-custom="1"'}>${anlIcon(t, 26)}<span>${esc(t)}</span></button>`).join('')
      + `<button class="tbtn" id="tNew">${I.plusS.replace('width="20" height="20"', 'width="26" height="26"')}<span>Neuer Typ</span></button>`;
    $$('#types [data-t]').forEach((b) => {
      const t = b.dataset.t;
      b.onclick = async () => {
        if (b._long) { b._long = false; return; }
        if (t === 'Leitung') { await DB.setMeta('anlDraft', null); ad = null; go('#leitung-neu'); return; }
        ad.typ = t;
        if (!ad.nameTouched) { ad.name = nextName(t, anl, ad.id); $('#aName').value = ad.name; }
        saveAdSoon(); renderTypes();
      };
      if (b.dataset.custom) {
        let timer = null;
        const startHold = () => { timer = setTimeout(() => { b._long = true; customTypeMenu(t); }, 650); };
        const endHold = () => clearTimeout(timer);
        b.addEventListener('pointerdown', startHold); b.addEventListener('pointerup', endHold); b.addEventListener('pointerleave', endHold);
        b.addEventListener('contextmenu', (ev) => { ev.preventDefault(); });
      }
    });
    $('#tNew').onclick = () => {
      $('#newType').innerHTML = `<div class="boxed bluebox">
        <label class="h" for="ntName" style="font-size:17px;font-weight:700">Name des neuen Typs</label>
        <input class="inp" id="ntName" autocomplete="off" placeholder="z. B. Wetterstation">
        <button class="btn solid blue" id="ntAdd">Typ hinzufügen</button>
        <span class="hint">Wird gespeichert und erscheint danach als eigener Knopf. Lange drücken: umbenennen oder löschen.</span>
      </div>`;
      $('#ntName').focus();
      $('#ntAdd').onclick = async () => {
        const n = $('#ntName').value.trim();
        if (!n) return toast('Bitte einen Namen eingeben');
        const custom = await getCustomTypes();
        if (![...ANL_TYPES, ...custom].some((x) => x.toLowerCase() === n.toLowerCase())) { custom.push(n); await DB.setMeta('customTypes', custom); }
        types = (await allTypes()).filter((t) => !ad._edit || t !== 'Leitung');
        ad.typ = types.find((x) => x.toLowerCase() === n.toLowerCase()) || n;
        if (!ad.nameTouched) { ad.name = nextName(ad.typ, anl, ad.id); $('#aName').value = ad.name; }
        $('#newType').innerHTML = ''; saveAdSoon(); renderTypes();
      };
    };
  };
  const customTypeMenu = async (t) => {
    const n = prompt(`Typ „${t}“ umbenennen.\nFeld leeren und OK = Typ löschen.`, t);
    if (n === null) return;
    const custom = await getCustomTypes();
    if (!n.trim()) {
      if (!confirm(`Typ „${t}“ löschen? Bestehende Anlagen behalten ihn.`)) return;
      await DB.setMeta('customTypes', custom.filter((x) => x !== t));
    } else {
      await DB.setMeta('customTypes', custom.map((x) => (x === t ? n.trim() : x)));
      for (const a of await DB.all('anlagen')) if (a.typ === t) await DB.put('anlagen', { ...a, typ: n.trim(), updatedAt: now() });
      if (ad.typ === t) ad.typ = n.trim();
    }
    types = (await allTypes()).filter((x) => !ad._edit || x !== 'Leitung');
    if (!types.includes(ad.typ)) ad.typ = 'Schacht';
    saveAdSoon(); renderTypes();
  };
  renderTypes();

  const bindW = () => $$('#aWiesen [data-w]').forEach((b) => b.onclick = () => {
    ad.wieseId = ad.wieseId === b.dataset.w ? null : b.dataset.w; ad.wieseManual = true;
    $('#aWiesen').innerHTML = wieseOptsHtml(wiesen, ad.wieseId); bindW(); saveAdSoon();
  });
  bindW();
  const suggest = () => {
    if (ad.lat == null) return;
    const w = nearestWiese(wiesen, ad);
    if (w) {
      $('#awHint').textContent = `Vorschlag nach Standort: ${w.name}`;
      if (!ad.wieseManual && ad.wieseId !== w.id) { ad.wieseId = w.id; $('#aWiesen').innerHTML = wieseOptsHtml(wiesen, ad.wieseId); bindW(); }
    }
  };
  const bind = (id, key) => $('#' + id).addEventListener('input', (ev) => { ad[key] = ev.target.value; if (key === 'name') ad.nameTouched = true; saveAdSoon(); });
  bind('aName', 'name'); bind('aLage', 'lage'); bind('aDim', 'dim'); bind('aTiefe', 'tiefe'); bind('aNotiz', 'notiz');
  mountPhotoGrid($('#aPhotos'), { ids: ad.photoIds, ownerId: ad.id, onChange: (ids) => { ad.photoIds = ids; DB.setMeta('anlDraft', ad); } });

  // Einmessen: bis zu 20 GPS-Werte mitteln (genauere zählen mehr)
  const updM = (n) => {
    const t = $('#mTitle'), s = $('#mSub'), bar = $('#mBar');
    if (!t) return;
    const mc = $('.mcircle');
    if (mc) {
      mc.classList.toggle('pulsing', mState === 'measuring');
      const ok = mState !== 'measuring' && ad.lat != null;
      if (ok && !mc.classList.contains('ok')) { mc.classList.add('ok'); mc.innerHTML = I.check; }
      else if (!ok && mc.classList.contains('ok')) { mc.classList.remove('ok'); mc.innerHTML = I.locate; }
    }
    if (mState === 'measuring') { t.textContent = 'Messe …'; s.textContent = n ? `${n} von 20 Werten · aktuell ±${ad.acc} m` : 'GPS sucht – direkt über die Anlage stellen'; bar.style.width = `${(n / 20) * 100}%`; }
    else if (ad.lat != null) { t.textContent = ad.locManual ? 'Auf Karte gesetzt' : 'Eingemessen ✓'; s.textContent = ad.locManual ? 'Position auf dem Luftbild festgelegt' : `Genauigkeit ca. ±${ad.acc} m`; bar.style.width = '100%'; }
    else if (mState === 'denied') { t.textContent = 'Kein Standort'; s.textContent = 'Standort-Erlaubnis fehlt'; bar.style.width = '0'; }
    else { t.textContent = 'Genau einmessen'; s.textContent = 'Direkt über die Anlage stellen, dann „Neu messen“'; bar.style.width = '0'; }
  };
  const stopM = () => { if (mWatch != null) navigator.geolocation.clearWatch(mWatch); mWatch = null; clearTimeout(mTimer); };
  const startM = () => {
    if (!navigator.geolocation) { toast('Dieses Gerät hat kein GPS'); return; }
    stopM();
    const S = [];
    mState = 'measuring'; updM(0);
    const finish = () => { stopM(); mState = 'idle'; updM(); if (S.length) toast(`Eingemessen aus ${S.length} Werten`); saveAdSoon(); };
    mWatch = navigator.geolocation.watchPosition((p) => {
      const acc = p.coords.accuracy;
      if (acc > 40) { $('#mSub').textContent = `Warte auf genaueres GPS (±${Math.round(acc)} m) …`; return; }
      S.push({ lat: p.coords.latitude, lng: p.coords.longitude, w: 1 / (acc * acc), acc });
      const W = S.reduce((s, x) => s + x.w, 0);
      ad.lat = S.reduce((s, x) => s + x.lat * x.w, 0) / W;
      ad.lng = S.reduce((s, x) => s + x.lng * x.w, 0) / W;
      ad.acc = Math.max(1, Math.round(Math.min(...S.map((x) => x.acc))));
      ad.locManual = false;
      updM(S.length); suggest();
      if (S.length >= 20) finish();
    }, (err) => { stopM(); mState = err.code === 1 ? 'denied' : 'idle'; updM(); if (err.code !== 1) toast('GPS nicht gefunden – „Auf Karte“ nutzen'); },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 60000 });
    mTimer = setTimeout(finish, 45000);
  };
  $('#mStart').onclick = startM;
  $('#mPick').onclick = async () => {
    stopM(); mState = 'idle';
    const c = await pickOnMap({ title: 'Karte verschieben, bis der Pin auf der Anlage sitzt', start: ad.lat != null ? { lat: ad.lat, lng: ad.lng } : null, onPick: () => {} });
    if (c) { ad.lat = c.lat; ad.lng = c.lng; ad.acc = null; ad.locManual = true; suggest(); saveAdSoon(); }
    updM();
  };
  updM(); suggest();
  if (ad.lat == null && !isEdit) startM();

  $('#aSave').onclick = async () => {
    if (!ad.name.trim()) { toast('Bitte eine Bezeichnung eingeben'); $('#aName').focus(); return; }
    stopM();
    const author = await DB.getMeta('author', '');
    const old = isEdit ? await DB.get('anlagen', ad.id) : null;
    const w = wiesen.find((x) => x.id === ad.wieseId);
    const a = {
      ...(old || {}), id: ad.id, typ: ad.typ, name: ad.name.trim(),
      wieseId: ad.wieseId || null, wieseName: ad.wieseId === ANDERES ? 'Hof / Anderes' : (w ? w.name : ''),
      lage: (ad.lage || '').trim(), lat: ad.lat ?? null, lng: ad.lng ?? null, acc: ad.acc ?? null, locManual: !!ad.locManual,
      photoIds: [...ad.photoIds], dim: (ad.dim || '').trim(), tiefe: (ad.tiefe || '').trim(), notiz: (ad.notiz || '').trim(),
      createdAt: old?.createdAt || now(), author: old?.author || author, updatedAt: now(),
    };
    await DB.put('anlagen', a);
    await savedFx($('#aSave'));
    ad = null; await DB.setMeta('anlDraft', null); askPersist();
    toast('Gespeichert'); go('#anlage/' + a.id);
  };
  const disc = $('#aDiscard');
  if (disc) disc.onclick = async () => {
    if (ad.photoIds.length && !confirm('Anlage und Fotos verwerfen?')) return;
    for (const pid of ad.photoIds) await DB.del('photos', pid);
    ad = null; await DB.setMeta('anlDraft', null); go('#anlagen');
  };
  const del = $('#aDelete');
  if (del) del.onclick = async () => {
    if (!confirm('Anlage endgültig löschen? Verknüpfte Aufgaben bleiben erhalten.')) return;
    for (const pid of ad.photoIds) await DB.del('photos', pid);
    await DB.put('anlagen', { id: ad.id, deleted: true, updatedAt: now() });
    ad = null; await DB.setMeta('anlDraft', null); toast('Gelöscht'); go('#anlagen');
  };
  leaveHooks.push(() => { stopM(); if (ad) DB.setMeta('anlDraft', ad); });
}

/* ---------- 9 · Anlage-Detail ---------- */
async function viewAnlageDetail(id) {
  const a = await DB.get('anlagen', id);
  if (!a || a.deleted) return go('#anlagen');
  if (a.typ === 'Leitung') return go('#leitung/' + id);
  const wiesen = await getWiesen();
  const byId = Object.fromEntries(wiesen.map((w) => [w.id, w]));
  const wn = wieseName(a.wieseId, byId, a.wieseName);
  app.innerHTML = `
    ${topbarBlue({ title: a.name, sub: [a.typ, wn].filter(Boolean).join(' · '), back: '#anlagen', right: `<a class="iconbtn filled" href="#anlage-bearbeiten/${a.id}" aria-label="Bearbeiten">${I.edit}</a>` })}
    <main class="content form">
      <section class="sec"><div id="dPhotos"></div></section>
      <dl class="facts">
        <div><dt>Lage</dt><dd>${esc([wn, a.lage].filter(Boolean).join(' · ') || '–')}${a.lat != null ? `<br><span class="small">${a.locManual ? 'Auf Karte gesetzt' : 'Eingemessen ±' + a.acc + ' m'}</span>` : '<br><span class="small">Kein Standort</span>'}</dd></div>
        ${a.dim || a.tiefe ? `<div class="grid2">${a.dim ? `<div><dt>Dimension</dt><dd>${esc(a.dim)}</dd></div>` : '<span></span>'}${a.tiefe ? `<div><dt>Tiefe</dt><dd>${esc(a.tiefe)}</dd></div>` : ''}</div>` : ''}
        ${a.notiz ? `<div><dt>Notiz</dt><dd>${esc(a.notiz)}</dd></div>` : ''}
        <div><dt>Erfasst</dt><dd>${esc(fmtDate(a.createdAt))}${a.author ? ' von ' + esc(a.author) : ''}</dd></div>
      </dl>
      ${a.lat != null ? `<div class="grid2">
        <a class="btn solid blue" href="#peilen/a~${a.id}">${I.target}Anpeilen</a>
        <a class="btn bl" href="#karte" id="dMap">${I.map}Auf Karte</a>
      </div>` : ''}
      ${await linkedTasksHtml(a.id)}
    </main>`;
  mountPhotoGrid($('#dPhotos'), { ids: a.photoIds || [], ownerId: a.id, onChange: async (ids) => {
    const cur = await DB.get('anlagen', a.id); await DB.put('anlagen', { ...cur, photoIds: ids, updatedAt: now() });
  } });
  const m = $('#dMap'); if (m) m.onclick = () => sessionStorage.setItem('wbFocusAnlage', a.id);
  $('#btnTaskFor').onclick = () => newTaskFor(a);
}

/* ---------- 11 · Leitung einzeichnen ---------- */
let ld = null;
const saveLd = () => DB.setMeta('lineDraft', ld);

async function viewLeitungDraw() {
  ld = (await DB.getMeta('lineDraft', null)) || { id: uid(), color: LINE_COLORS[0][1], colorName: LINE_COLORS[0][0], points: [], mode: 'tap' };
  const anl = await getAnlagen();
  app.innerHTML = `
    ${topbarBlue({ title: 'Leitung einzeichnen', back: '#anlagen' })}
    <div class="segwrap blue"><div class="seg" role="group" aria-label="Art des Einzeichnens">
      <button data-m="tap">Auf Karte tippen</button><button data-m="walk">Abgehen (GPS)</button>
    </div></div>
    <div class="mapwrap full" id="ldWrap">
      <div id="map"></div>
      <div class="crosshair2" id="ldCross" aria-hidden="true"><svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="14" fill="none" stroke="#C2362B" stroke-width="3"/><path d="M24 0v14M24 34v14M0 24h14M34 24h14" stroke="#C2362B" stroke-width="3"/></svg></div>
      <div class="mapctl"><button id="ldLayer" aria-label="Luftbild oder Karte">${I.layers}</button><button id="ldMe" aria-label="Mein Standort">${I.locate}</button></div>
      <div class="sheet" id="ldSheet"></div>
    </div>`;
  const wrap = $('#ldWrap');
  const place = () => { const h = $('.topbar').offsetHeight + $('.segwrap').offsetHeight; wrap.style.top = h + 'px'; };
  place();
  const map = await makeMap($('#map'), ld.points.length ? { center: [ld.points[ld.points.length - 1].lat, ld.points[ld.points.length - 1].lng], zoom: 19 } : {});
  currentMap = map;
  for (const a of anl) if (a.typ !== 'Leitung' && a.lat != null) L.marker([a.lat, a.lng], { icon: anlMarkerIcon(a), interactive: false, opacity: 0.85 }).addTo(map);
  const line = L.polyline([], { color: ld.color, weight: 6, lineCap: 'round', lineJoin: 'round' }).addTo(map);
  const ptLayer = L.layerGroup().addTo(map);
  let me = null, meMk = null, follow = true, justAdded = false;

  const redraw = () => {
    line.setStyle({ color: ld.color });
    line.setLatLngs(ld.points.map((p) => [p.lat, p.lng]));
    ptLayer.clearLayers();
    ld.points.forEach((p, i) => L.marker([p.lat, p.lng], { icon: numIcon(i + 1, (p.photoIds || []).length ? 'photo' : 'plain', ld.color, justAdded && i === ld.points.length - 1), interactive: false }).addTo(ptLayer));
    justAdded = false;
    sheet();
  };
  const sheet = () => {
    const n = ld.points.length, last = ld.points[n - 1];
    const k = last ? (last.photoIds || []).length : 0;
    $('#ldSheet').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b style="font-size:18px">${n} ${n === 1 ? 'Punkt' : 'Punkte'} · ${Math.round(lineLength(ld.points))} m</b>
        <span class="small">${esc(ld.colorName)}</span></div>
      <div class="swatches" role="group" aria-label="Farbe">${LINE_COLORS.map(([nm, hex]) => `<button class="sw ${ld.color === hex ? 'on' : ''}" data-c="${hex}" data-n="${esc(nm)}" style="background:${hex}" aria-label="${esc(nm)}"></button>`).join('')}</div>
      ${last ? `<div class="lastpt"><span class="num" style="background:${ld.color}">${n}</span><span style="flex:1">Punkt ${n}${k ? ` · ${k} ${k === 1 ? 'Foto' : 'Fotos'}` : ' – Fotos dazu?'}</span>
        <button class="btn solid blue sm" id="ldCam" aria-label="Foto zu Punkt ${n}">${I.cam}</button><button class="btn bl sm" id="ldGal" aria-label="Fotos aus Galerie zu Punkt ${n}">${I.gal}</button></div>` : ''}
      <span class="small">${ld.mode === 'tap' ? 'Karte verschieben, bis das Kreuz passt, dann „Punkt setzen“. Nahe Anlagen rasten ein.' : `Entlang der Leitung gehen – an jeder Ecke „Punkt hier“.${me ? ` GPS ±${Math.round(me.acc)} m` : ' GPS sucht …'}`}</span>
      <div class="grid12"><button class="btn bl" id="ldUndo" ${n ? '' : 'disabled'}>Zurück</button><button class="btn solid blue" id="ldAdd">${ld.mode === 'tap' ? '+ Punkt setzen' : '+ Punkt hier'}</button></div>
      <button class="btn solid" id="ldDone" ${n >= 2 ? '' : 'disabled'}>${I.check}Fertig – Details eintragen</button>`;
    $$('.sw').forEach((b) => b.onclick = () => { ld.color = b.dataset.c; ld.colorName = b.dataset.n; saveLd(); redraw(); });
    $('#ldUndo').onclick = async () => {
      const p = ld.points[ld.points.length - 1];
      if (p && (p.photoIds || []).length && !confirm(`Punkt ${ld.points.length} mit Fotos entfernen?`)) return;
      for (const pid of p?.photoIds || []) await DB.del('photos', pid);
      ld.points.pop(); saveLd(); redraw();
    };
    $('#ldAdd').onclick = addPoint;
    $('#ldDone').onclick = () => lineDetailsModal(null);
    const addPh = async (cam) => { const files = await pickFiles(cam); if (!files.length) return; const ids = await storePhotos(files, ld.id); last.photoIds = [...(last.photoIds || []), ...ids]; saveLd(); redraw(); };
    if (last) { $('#ldCam').onclick = () => addPh(true); $('#ldGal').onclick = () => addPh(false); }
  };
  const addPoint = () => {
    let p;
    if (ld.mode === 'tap') {
      const c = map.getCenter(); p = { lat: c.lat, lng: c.lng };
      let snap = null, sd = Infinity;
      for (const a of anl) if (a.typ !== 'Leitung' && a.lat != null) { const d = distM(p, a); if (d < sd) { sd = d; snap = a; } }
      if (snap && sd <= 6) { p = { lat: snap.lat, lng: snap.lng, anlageId: snap.id, note: snap.name }; toast(`An „${snap.name}“ eingerastet`); }
    } else {
      if (!me) { toast('Noch kein GPS – kurz warten'); return; }
      p = { lat: me.lat, lng: me.lng, acc: Math.round(me.acc) };
    }
    ld.points.push({ note: '', photoIds: [], ...p });
    buzz(30); justAdded = true;
    saveLd(); redraw();
  };
  const setMode = (m) => {
    ld.mode = m; saveLd();
    $$('.segwrap [data-m]').forEach((b) => { b.classList.toggle('on', b.dataset.m === m); b.setAttribute('aria-pressed', b.dataset.m === m); });
    $('#ldCross').classList.toggle('hidden', m !== 'tap');
    if (m === 'walk') { follow = true; if (me) map.setView([me.lat, me.lng], Math.max(map.getZoom(), 18)); }
    sheet();
  };
  $$('.segwrap [data-m]').forEach((b) => b.onclick = () => setMode(b.dataset.m));
  $('#ldLayer').onclick = () => map._wbToggle();
  $('#ldMe').onclick = () => { if (me) { follow = true; map.setView([me.lat, me.lng], 19); } else toast('GPS sucht …'); };
  map.on('dragstart', () => { follow = false; });

  if (navigator.geolocation) {
    const w = navigator.geolocation.watchPosition((pos) => {
      me = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
      if (!meMk) { meMk = L.marker([me.lat, me.lng], { icon: meIcon, interactive: false }).addTo(map); if (!ld.points.length) map.setView([me.lat, me.lng], 19); }
      else meMk.setLatLng([me.lat, me.lng]);
      if (ld.mode === 'walk' && follow) map.panTo([me.lat, me.lng]);
      if (ld.mode === 'walk') { const s = $('#ldSheet .small'); if (s) s.textContent = `Entlang der Leitung gehen – an jeder Ecke „Punkt hier“. GPS ±${Math.round(me.acc)} m`; }
    }, () => {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 60000 });
    leaveHooks.push(() => navigator.geolocation.clearWatch(w));
  }
  setMode(ld.mode || 'tap');
  redraw();
  window.addEventListener('resize', place);
  leaveHooks.push(() => window.removeEventListener('resize', place));
}
function numIcon(n, kind, color, drop) {
  const c = color || ANL_BLUE;
  const st = kind === 'sel' ? 'background:#C2362B;color:#fff;border:3px solid #fff;box-shadow:0 0 0 3px #C2362B'
    : kind === 'photo' ? `background:${c};color:#fff;border:3px solid #fff` : `background:#fff;color:${c};border:3px solid ${c}`;
  return L.divIcon({ className: 'pin-icon', html: `<div class="numpin ${drop ? 'drop' : ''}" style="${st}">${n}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
}
function anlMarkerIcon(a) {
  return L.divIcon({ className: 'pin-icon', html: `<div class="anl-mk" title="${esc(a.name)}">${anlIcon(a.typ, 18)}</div>`, iconSize: [36, 36], iconAnchor: [18, 18] });
}

// Details der Leitung: nach dem Zeichnen (a = null) oder zum Bearbeiten
async function lineDetailsModal(a) {
  const [wiesen, anl] = await Promise.all([getWiesen(), getAnlagen()]);
  const isNew = !a;
  const src = a || ld;
  let wieseId = a ? a.wieseId : (nearestWiese(wiesen, ld.points[0])?.id || null);
  let color = src.color, colorName = src.colorName;
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="box" role="dialog" aria-label="Leitung – Details">
    <h2>${isNew ? 'Leitung speichern' : 'Leitung bearbeiten'}</h2>
    <label class="lbl" for="lnName">Bezeichnung</label>
    <input class="inp" id="lnName" autocomplete="off" value="${esc(a ? a.name : nextName('Leitung', anl))}">
    <span class="lbl">Farbe / Art</span>
    <div class="swatches" id="lnSw">${LINE_COLORS.map(([nm, hex]) => `<button class="sw ${color === hex ? 'on' : ''}" data-c="${hex}" data-n="${esc(nm)}" style="background:${hex}" aria-label="${esc(nm)}"></button>`).join('')}<span id="lnCn" style="font-weight:700">${esc(colorName)}</span></div>
    <span class="lbl">Welche Wiese?</span>
    <div class="grid2" id="lnW">${wieseOptsHtml(wiesen, wieseId)}</div>
    <div class="grid2">
      <div class="sec" style="gap:4px"><label class="lbl" for="lnDim">Dimension</label><input class="inp" id="lnDim" placeholder="z. B. DN 63" value="${esc(a?.dim || '')}"></div>
      <div class="sec" style="gap:4px"><label class="lbl" for="lnTiefe">Tiefe</label><input class="inp" id="lnTiefe" placeholder="z. B. 0,8 m" value="${esc(a?.tiefe || '')}"></div>
    </div>
    <label class="lbl" for="lnNotiz">Notiz</label>
    <textarea class="inp" id="lnNotiz" rows="2" style="padding-right:12px">${esc(a?.notiz || '')}</textarea>
    <button class="btn solid blue" id="lnSave">${I.check}Speichern</button>
    <div class="grid2">${isNew ? '<button class="btn danger" id="lnDiscard">Verwerfen</button>' : '<button class="btn danger" id="lnDel">Löschen</button>'}<button class="btn" id="lnCancel">${isNew ? 'Weiter zeichnen' : 'Abbrechen'}</button></div>
  </div>`;
  document.body.appendChild(m);
  const close = () => m.remove();
  const bindSw = () => $$('#lnSw .sw', m).forEach((b) => b.onclick = () => { color = b.dataset.c; colorName = b.dataset.n; $$('#lnSw .sw', m).forEach((x) => x.classList.toggle('on', x === b)); $('#lnCn', m).textContent = colorName; });
  bindSw();
  const bindW = () => $$('#lnW [data-w]', m).forEach((b) => b.onclick = () => { wieseId = wieseId === b.dataset.w ? null : b.dataset.w; $('#lnW', m).innerHTML = wieseOptsHtml(wiesen, wieseId); bindW(); });
  bindW();
  $('#lnCancel', m).onclick = close;
  $('#lnSave', m).onclick = async () => {
    const name = $('#lnName', m).value.trim();
    if (!name) return toast('Bitte eine Bezeichnung eingeben');
    const author = await DB.getMeta('author', '');
    const w = wiesen.find((x) => x.id === wieseId);
    const base = a ? await DB.get('anlagen', a.id) : { id: ld.id, typ: 'Leitung', points: ld.points, photoIds: [], createdAt: now(), author };
    const rec = {
      ...base, name, color, colorName, wieseId: wieseId || null, wieseName: wieseId === ANDERES ? 'Hof / Anderes' : (w ? w.name : ''),
      dim: $('#lnDim', m).value.trim(), tiefe: $('#lnTiefe', m).value.trim(), notiz: $('#lnNotiz', m).value.trim(),
      lat: base.points[0].lat, lng: base.points[0].lng, updatedAt: now(),
    };
    await DB.put('anlagen', rec);
    await savedFx($('#lnSave', m));
    if (isNew) { ld = null; await DB.setMeta('lineDraft', null); sessionStorage.setItem('wbNew', rec.id); }
    askPersist(); close(); toast('Gespeichert');
    if (isNew) go('#leitung/' + rec.id); else render();
  };
  const disc = $('#lnDiscard', m);
  if (disc) disc.onclick = async () => {
    if (!confirm('Gezeichnete Leitung samt Fotos verwerfen?')) return;
    for (const p of ld.points) for (const pid of p.photoIds || []) await DB.del('photos', pid);
    ld = null; await DB.setMeta('lineDraft', null); close(); go('#anlagen');
  };
  const del = $('#lnDel', m);
  if (del) del.onclick = async () => {
    if (!confirm(`„${a.name}“ endgültig löschen?`)) return;
    for (const p of a.points || []) for (const pid of p.photoIds || []) await DB.del('photos', pid);
    for (const pid of a.photoIds || []) await DB.del('photos', pid);
    await DB.put('anlagen', { id: a.id, deleted: true, updatedAt: now() });
    close(); toast('Gelöscht'); go('#anlagen');
  };
}

/* ---------- 12 · Leitung mit Punkt-Fotos ---------- */
async function viewLeitungDetail(id) {
  const a = await DB.get('anlagen', id);
  if (!a || a.deleted) return go('#anlagen');
  if (a.typ !== 'Leitung') return go('#anlage/' + id);
  const wiesen = await getWiesen();
  const byId = Object.fromEntries(wiesen.map((w) => [w.id, w]));
  const pts = a.points || [];
  const key = 'wbLtPt_' + id;
  let i = Math.min(+(sessionStorage.getItem(key) || 0), pts.length - 1);
  const color = a.color || ANL_BLUE;
  const wn = wieseName(a.wieseId, byId, a.wieseName);
  app.innerHTML = `
    ${topbarBlue({ title: a.name, sub: anlSub(a, byId), back: '#anlagen', right: `<button class="iconbtn filled" id="ltEdit" aria-label="Bearbeiten">${I.edit}</button>` })}
    <div class="ltmap"><div id="map"></div><span class="maphint">Punkt antippen → Fotos</span></div>
    <main class="content form">
      <section class="boxed" id="ptPanel" aria-live="polite"></section>
      <dl class="facts">
        <div><dt>Wiese</dt><dd>${esc(wn || '–')}</dd></div>
        ${a.dim || a.tiefe ? `<div class="grid2">${a.dim ? `<div><dt>Dimension</dt><dd>${esc(a.dim)}</dd></div>` : '<span></span>'}${a.tiefe ? `<div><dt>Tiefe</dt><dd>${esc(a.tiefe)}</dd></div>` : ''}</div>` : ''}
        ${a.notiz ? `<div><dt>Notiz</dt><dd>${esc(a.notiz)}</dd></div>` : ''}
        <div><dt>Erfasst</dt><dd>${esc(fmtDate(a.createdAt))}${a.author ? ' von ' + esc(a.author) : ''}</dd></div>
      </dl>
      <section class="sec"><h2>Alle Punkte</h2><div class="ptstrip" id="ptStrip"></div></section>
      <a class="btn bl" href="#karte" id="ltMap">${I.map}Auf großer Karte zeigen</a>
      ${await linkedTasksHtml(a.id)}
    </main>`;
  const map = await makeMap($('#map'), {});
  currentMap = map;
  L.polyline(pts.map((p) => [p.lat, p.lng]), { color, weight: 6, lineCap: 'round', lineJoin: 'round' }).addTo(map);
  const mks = pts.map((p, k) => L.marker([p.lat, p.lng], { icon: numIcon(k + 1, 'plain', color), keyboard: true, title: `Punkt ${k + 1}` }).addTo(map).on('click', () => select(k)));
  if (pts.length) map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])).pad(0.25), { maxZoom: 19 });

  const persist = async () => { const cur = await DB.get('anlagen', a.id); await DB.put('anlagen', { ...cur, points: pts, updatedAt: now() }); };
  const ptTitle = (k) => (k === 0 ? 'Start' : k === pts.length - 1 ? 'Ende' : `Punkt ${k + 1}`) + (pts[k].note && pts[k].anlageId ? ` · ${pts[k].note}` : '');
  const select = (k) => {
    i = k; sessionStorage.setItem(key, k);
    mks.forEach((mk, j) => mk.setIcon(numIcon(j + 1, j === i ? 'sel' : (pts[j].photoIds || []).length ? 'photo' : 'plain', color)));
    const p = pts[i];
    $('#ptPanel').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <span class="ptbadge" style="background:${color}">Punkt ${i + 1} von ${pts.length}</span>
        <span class="small">${esc(ptTitle(i).replace(/^Punkt \d+/, '').replace(/^ · /, '') || '')}</span>
      </div>
      <div id="ptPhotos"></div>
      <label class="lbl" for="ptNote">Notiz zu diesem Punkt</label>
      <input class="inp" id="ptNote" autocomplete="off" placeholder="z. B. Abzweig, 0,8 m tief" value="${esc(p.note || '')}">
      <div class="grid3">
        <button class="btn bl" id="ptPrev" ${i === 0 ? 'disabled' : ''}>‹ Vorher</button>
        <a class="btn solid blue" href="#peilen/l~${a.id}~${i}">Anpeilen</a>
        <button class="btn bl" id="ptNext" ${i === pts.length - 1 ? 'disabled' : ''}>Nächster ›</button>
      </div>`;
    mountPhotoGrid($('#ptPhotos'), { ids: p.photoIds || [], ownerId: a.id, onChange: async (ids) => { p.photoIds = ids; await persist(); select(i); strip(); } });
    $('#ptNote').onchange = async (ev) => { p.note = ev.target.value.trim(); await persist(); };
    $('#ptPrev').onclick = () => { if (i > 0) { select(i - 1); map.panTo([pts[i].lat, pts[i].lng]); } };
    $('#ptNext').onclick = () => { if (i < pts.length - 1) { select(i + 1); map.panTo([pts[i].lat, pts[i].lng]); } };
    strip();
  };
  const strip = () => {
    $('#ptStrip').innerHTML = pts.map((p, k) => {
      const ph = (p.photoIds || [])[0];
      return `<button class="ptthumb ${k === i ? 'on' : ''} ${ph ? '' : 'empty'}" data-k="${k}" aria-label="Punkt ${k + 1}${ph ? ', ' + p.photoIds.length + ' Fotos' : ', ohne Foto'}">
        ${ph ? `<img data-photo="${ph}" alt="">` : ''}<span class="n">${k + 1}</span>${ph ? `<span class="c">${p.photoIds.length}</span>` : '<span class="c0">kein Foto</span>'}</button>`;
    }).join('');
    $$('#ptStrip img[data-photo]').forEach(async (img) => { const u = await photoUrl(img.dataset.photo); if (u) img.src = u; });
    $$('#ptStrip [data-k]').forEach((b) => b.onclick = () => { select(+b.dataset.k); map.panTo([pts[i].lat, pts[i].lng]); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  };
  if (pts.length) select(Math.max(0, i));
  $('#ltEdit').onclick = () => lineDetailsModal(a);
  $('#ltMap').onclick = () => sessionStorage.setItem('wbFocusAnlage', a.id);
  $('#btnTaskFor').onclick = () => newTaskFor(a, pts[i]);
}

/* ---------- Anpeilen: Ziel bestimmen (Aufgabe, Anlage oder Leitungspunkt) ---------- */
async function resolvePeil(id) {
  const parts = String(id || '').split('~');
  const wiesen = await getWiesen();
  const byId = Object.fromEntries(wiesen.map((w) => [w.id, w]));
  if (parts[0] === 'a' || parts[0] === 'l') {
    const a = await DB.get('anlagen', parts[1]);
    if (!a || a.deleted) return null;
    if (parts[0] === 'l') {
      const k = +parts[2] || 0, p = (a.points || [])[k];
      if (!p) return null;
      return { lat: p.lat, lng: p.lng, title: a.name, sub: `Punkt ${k + 1} von ${a.points.length}`, back: '#leitung/' + a.id, photoId: (p.photoIds || [])[0], info: p.note || a.notiz || '', anlage: a };
    }
    if (a.lat == null) return null;
    return { lat: a.lat, lng: a.lng, title: a.name, sub: anlSub(a, byId), back: '#anlage/' + a.id, photoId: (a.photoIds || [])[0], info: [a.tiefe && 'Tiefe ' + a.tiefe, a.notiz].filter(Boolean).join(' · '), anlage: a };
  }
  const e = await DB.get('entries', id);
  if (!e || e.deleted || e.lat == null) return null;
  return { lat: e.lat, lng: e.lng, title: entryTitle(e), sub: wieseLabel(e, byId), back: '#eintrag/' + e.id, photoId: (e.photoIds || [])[0], info: e.braucht ? 'Braucht: ' + e.braucht : (e.beschreibung || ''), entry: e };
}

/* ---------- 10 · Karte mit Kartenmenü ---------- */
async function viewMap() {
  const [entries, wiesen, anl, mode0, typesOff, showDone, bg] = await Promise.all([
    getEntries(), getWiesen(), getAnlagen(), DB.getMeta('mapAnl', 'aus'), DB.getMeta('mapTypesOff', {}), DB.getMeta('mapShowDone', false), DB.getMeta('mapLayer', 'luftbild'),
  ]);
  const byId = Object.fromEntries(wiesen.map((w) => [w.id, w]));
  const focusE = sessionStorage.getItem('wbFocusEntry'); sessionStorage.removeItem('wbFocusEntry');
  const focusA = sessionStorage.getItem('wbFocusAnlage'); sessionStorage.removeItem('wbFocusAnlage');
  let mode = mode0;
  if (focusA && mode === 'aus') mode = 'dazu';
  if (focusE && mode === 'nur') mode = 'dazu';
  const showT = mode !== 'nur', showA = mode !== 'aus';
  const typeKey = (a) => (a.typ === 'Leitung' ? 'Leitungen' : a.typ);
  const tasks = showT ? entries.filter((e) => e.lat != null && (showDone || e.status !== 'erledigt')) : [];
  const anlShown = showA ? anl.filter((a) => (!typesOff[typeKey(a)] || a.id === focusA) && (a.typ === 'Leitung' ? (a.points || []).length > 1 : a.lat != null)) : [];
  const sub = [showT ? `${tasks.length} ${showDone ? (tasks.length === 1 ? 'Aufgabe' : 'Aufgaben') : (tasks.length === 1 ? 'offene Aufgabe' : 'offene Aufgaben')}` : '', showA ? `${anlShown.length} ${anlShown.length === 1 ? 'Anlage' : 'Anlagen'}` : ''].filter(Boolean).join(' · ');

  app.innerHTML = `
    ${topbar({ title: 'Karte', sub })}
    <div class="mapwrap">
      <div id="map"></div>
      <div class="mapctl">
        <button id="btnMenu" aria-label="Kartenmenü: Ebenen und Filter" aria-haspopup="dialog">${I.layers}${showA ? '<span class="mdot"></span>' : ''}</button>
        <button id="btnMe" aria-label="Mein Standort">${I.locate}</button>
      </div>
      <div class="sheet hidden" id="sheet"></div>
      <div class="mapmenu hidden" id="mapMenu" role="dialog" aria-label="Kartenmenü"></div>
    </div>
    ${bottomnavHtml('karte')}`;

  const map = await makeMap($('#map'));
  currentMap = map;
  const all = [];
  for (const a of anlShown) {
    if (a.typ === 'Leitung') {
      const ll = a.points.map((p) => [p.lat, p.lng]);
      L.polyline(ll, { color: '#fff', weight: 10, opacity: 0.7, interactive: false }).addTo(map);
      L.polyline(ll, { color: a.color || ANL_BLUE, weight: 6 }).addTo(map).on('click', () => showLineSheet(a));
      all.push(...ll);
    } else {
      L.marker([a.lat, a.lng], { icon: anlMarkerIcon(a), title: a.name, keyboard: true }).addTo(map).on('click', () => showAnlSheet(a));
      all.push([a.lat, a.lng]);
    }
  }
  for (const e of tasks) {
    const color = e.status === 'erledigt' ? '#7D877A' : e.prio === 'dringend' ? '#C2362B' : '#1F3D2B';
    L.marker([e.lat, e.lng], { icon: pinIcon(color, e.prio === 'dringend' ? 40 : 34), title: entryTitle(e), keyboard: true }).addTo(map).on('click', () => showSheet(e));
    all.push([e.lat, e.lng]);
  }
  for (const w of wiesen) {
    if (w.lat == null) continue;
    L.marker([w.lat, w.lng], { icon: L.divIcon({ className: 'pin-icon', html: `<span class="wlabel">${esc(w.name)}</span>`, iconSize: null }), interactive: false }).addTo(map);
  }

  const saved = JSON.parse(sessionStorage.getItem('wbMapView') || 'null');
  const fe = focusE && tasks.find((e) => e.id === focusE);
  const fa = focusA && anlShown.find((a) => a.id === focusA);
  if (fe) { map.setView([fe.lat, fe.lng], 18); showSheet(fe); }
  else if (fa) {
    if (fa.typ === 'Leitung') { map.fitBounds(L.latLngBounds(fa.points.map((p) => [p.lat, p.lng])).pad(0.3), { maxZoom: 19 }); showLineSheet(fa); }
    else { map.setView([fa.lat, fa.lng], 19); showAnlSheet(fa); }
  } else if (saved) map.setView([saved.lat, saved.lng], saved.z);
  else if (all.length) map.fitBounds(L.latLngBounds(all).pad(0.3), { maxZoom: 18 });
  else if (wiesen.some((w) => w.lat != null)) map.fitBounds(L.latLngBounds(wiesen.filter((w) => w.lat != null).map((w) => [w.lat, w.lng])).pad(0.3), { maxZoom: 17 });
  map.on('moveend', () => { const c = map.getCenter(); sessionStorage.setItem('wbMapView', JSON.stringify({ lat: c.lat, lng: c.lng, z: map.getZoom() })); });

  let meMarker = null;
  if (navigator.geolocation) {
    const w = navigator.geolocation.watchPosition((p) => {
      const ll = [p.coords.latitude, p.coords.longitude];
      if (!meMarker) meMarker = L.marker(ll, { icon: meIcon, interactive: false }).addTo(map); else meMarker.setLatLng(ll);
      if (!all.length && !saved && !fe && !fa && !map._wbCentered) { map._wbCentered = true; map.setView(ll, 17); }
    }, () => {}, { enableHighAccuracy: true, maximumAge: 15000 });
    leaveHooks.push(() => navigator.geolocation.clearWatch(w));
  }
  $('#btnMe').onclick = async () => {
    if (meMarker) { map.setView(meMarker.getLatLng(), 18); return; }
    try { const p = await locateOnce(); map.setView([p.lat, p.lng], 18); } catch (e) { toast('Standort nicht gefunden'); }
  };
  map.on('click', () => { $('#sheet').classList.add('hidden'); $('#mapMenu').classList.add('hidden'); });
  const distTxt = (p) => (meMarker ? ` · ${fmtDist(distM(meMarker.getLatLng(), p))} entfernt` : '');

  async function showSheet(e) {
    const s = $('#sheet');
    s.innerHTML = `
      <a class="card" href="#eintrag/${e.id}">
        ${e.photoIds && e.photoIds.length ? `<img class="thumb" style="width:64px;height:64px" data-photo="${e.photoIds[0]}" alt="">` : ''}
        <div class="body"><h2>${esc(entryTitle(e))}</h2>
          <span class="l1">${esc(wieseLabel(e, byId))}${distTxt(e)}</span>
          ${e.braucht ? `<span class="l2">Braucht: ${esc(e.braucht)}</span>` : ''}</div>
      </a>
      <div class="grid2"><a class="btn" href="#peilen/${e.id}">${I.target}Anpeilen</a><a class="btn solid" href="#eintrag/${e.id}">Details</a></div>`;
    s.classList.remove('hidden'); $('#mapMenu').classList.add('hidden');
    const img = $('img[data-photo]', s); if (img) img.src = await photoUrl(img.dataset.photo);
  }
  function showAnlSheet(a) {
    const s = $('#sheet');
    s.innerHTML = `
      <a class="card" href="#anlage/${a.id}">
        <span class="anlicon" style="width:56px;height:56px">${anlIcon(a.typ, 28)}</span>
        <div class="body"><h2>${esc(a.name)}</h2><span class="l1">${esc([a.typ, a.dim, a.tiefe && a.tiefe + ' tief'].filter(Boolean).join(' · '))}${distTxt(a)}</span></div>
      </a>
      <div class="grid2"><a class="btn bl" href="#peilen/a~${a.id}">${I.target}Anpeilen</a><a class="btn solid blue" href="#anlage/${a.id}">Details</a></div>`;
    s.classList.remove('hidden'); $('#mapMenu').classList.add('hidden');
  }
  function showLineSheet(a) {
    const s = $('#sheet');
    s.innerHTML = `
      <a class="card" href="#leitung/${a.id}">
        <span class="anlicon" style="width:56px;height:56px;background:${a.color || ANL_BLUE}">${anlIcon('Leitung', 28)}</span>
        <div class="body"><h2>${esc(a.name)}</h2><span class="l1">${esc(anlSub(a, byId))}</span></div>
      </a>
      <a class="btn solid blue" href="#leitung/${a.id}">Punkte & Fotos ansehen</a>`;
    s.classList.remove('hidden'); $('#mapMenu').classList.add('hidden');
  }

  // Kartenmenü
  const presentTypes = [...new Set(anl.map(typeKey))];
  const menu = $('#mapMenu');
  const hints = { aus: 'Standard: nur Aufgaben sichtbar.', dazu: 'Aufgaben und Anlagen zusammen.', nur: 'Nur Anlagen und Leitungen – Aufgaben ausgeblendet.' };
  const renderMenu = () => {
    menu.innerHTML = `
      <div class="mmhead"><h2>Kartenmenü</h2><button class="iconbtn" id="mmClose" aria-label="Schließen">${I.x}</button></div>
      <span class="mmlbl">Hintergrund</span>
      <div class="seg light"><button data-bg="luftbild" class="${bg !== 'karte' ? 'on' : ''}">Luftbild</button><button data-bg="karte" class="${bg === 'karte' ? 'on' : ''}">Karte</button></div>
      <span class="mmlbl">Anlagen & Leitungen</span>
      <div class="seg light three">${[['aus', 'Aus'], ['dazu', 'Dazu'], ['nur', 'Nur Anlagen']].map(([k, l]) => `<button data-am="${k}" class="${mode === k ? 'on blue' : ''}" aria-pressed="${mode === k}">${l}</button>`).join('')}</div>
      <span class="small">${hints[mode]}${!anl.length ? ' Noch keine Anlagen erfasst.' : ''}</span>
      ${showA && presentTypes.length ? `<span class="mmlbl">Welche Anlagen?</span>
        <div class="chips">${presentTypes.map((t) => `<button class="tchip ${typesOff[t] ? '' : 'on'}" data-tt="${esc(t)}" aria-pressed="${!typesOff[t]}">${esc(t)}</button>`).join('')}</div>` : ''}
      <label class="chk"><input type="checkbox" id="mmDone" ${showDone ? 'checked' : ''}> Erledigte Aufgaben auch zeigen</label>`;
    $('#mmClose').onclick = () => { menu.classList.add('hidden'); sessionStorage.removeItem('wbMenuOpen'); };
    $$('[data-bg]', menu).forEach((b) => b.onclick = async () => { if ((await DB.getMeta('mapLayer', 'luftbild')) !== b.dataset.bg) map._wbToggle(); $$('[data-bg]', menu).forEach((x) => x.classList.toggle('on', x === b)); });
    const rerender = () => { sessionStorage.setItem('wbMenuOpen', '1'); render(); };
    $$('[data-am]', menu).forEach((b) => b.onclick = async () => { await DB.setMeta('mapAnl', b.dataset.am); rerender(); });
    $$('[data-tt]', menu).forEach((b) => b.onclick = async () => { const o = await DB.getMeta('mapTypesOff', {}); o[b.dataset.tt] = !o[b.dataset.tt]; await DB.setMeta('mapTypesOff', o); rerender(); });
    $('#mmDone').onchange = async (ev) => { await DB.setMeta('mapShowDone', ev.target.checked); rerender(); };
  };
  renderMenu();
  $('#btnMenu').onclick = () => { $('#sheet').classList.add('hidden'); menu.classList.toggle('hidden'); if (menu.classList.contains('hidden')) sessionStorage.removeItem('wbMenuOpen'); };
  if (sessionStorage.getItem('wbMenuOpen')) menu.classList.remove('hidden');
}

/* ---------- 13 · Mehr ---------- */
async function viewMehr() {
  const [author, lastExport, entries, anl, wiesen, custom] = await Promise.all([
    DB.getMeta('author', ''), DB.getMeta('lastExport', null), getEntries(), getAnlagen(), getWiesen(), getCustomTypes(),
  ]);
  let storage = '', nPhotos = 0;
  try {
    nPhotos = (await DB.all('photos')).length;
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      storage = `${(est.usage / 1048576).toFixed(1).replace('.', ',')} MB · ${persisted ? 'dauerhaft gespeichert' : 'nicht dauerhaft geschützt'}`;
    }
  } catch (e) {}
  const age = lastExport ? Math.floor((Date.now() - new Date(lastExport)) / 86400000) : null;
  const warn = (entries.length || anl.length) && (age === null || age >= 14);
  app.innerHTML = `
    ${topbar({ title: 'Mehr', sub: author ? `Angemeldet als ${author}` : '' })}
    <main class="content form">
      <section class="menulist">
        <a href="#wiesen" id="mWiesen">${I.map}<span class="body"><b>Meine Wiesen</b><span class="l1">${wiesen.length} ${wiesen.length === 1 ? 'Wiese' : 'Wiesen'}</span></span>›</a>
        <button id="mTypes">${anlIcon('_', 22)}<span class="body"><b>Eigene Anlagentypen</b><span class="l1">${custom.length ? esc(custom.join(', ')) : 'Noch keine'}</span></span>›</button>
      </section>
      <section class="boxed">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><h2>Sichern</h2>
          <span class="small" style="${warn ? 'color:#B4530A;font-weight:700' : ''}">${age === null ? 'noch nie' : age === 0 ? 'heute' : age === 1 ? 'gestern' : `vor ${age} Tagen`}</span></div>
        <p class="small" style="margin:0">${entries.length} ${entries.length === 1 ? 'Aufgabe' : 'Aufgaben'}, ${anl.length} ${anl.length === 1 ? 'Anlage' : 'Anlagen'} und ${nPhotos} ${nPhotos === 1 ? 'Foto' : 'Fotos'} als ZIP – z. B. per WhatsApp schicken.</p>
        <div class="grid2"><button class="btn solid" id="sExport">Sichern</button><button class="btn" id="sImport">Einspielen</button></div>
      </section>
      <section class="menulist">
        <label class="switch"><span class="body"><b>Animationen</b><span class="l1">${reducedMotion.matches ? 'Am Handy ist „Animationen entfernen“ aktiv' : 'Weiche Übergänge und Rückmeldungen'}</span></span><input type="checkbox" id="sAnim" ${WB.anim ? 'checked' : ''}></label>
        <label class="switch"><span class="body"><b>Vibration</b><span class="l1">Bei Gespeichert, Erledigt, Punkt gesetzt, Du bist da</span></span><input type="checkbox" id="sVibe" ${WB.vibe ? 'checked' : ''}></label>
      </section>
      <section class="boxed">
        <label class="h" for="sAuthor" style="font-size:18px;font-weight:700">Wer benutzt dieses Handy?</label>
        <input class="inp" id="sAuthor" value="${esc(author)}" placeholder="z. B. Tata">
        <button class="btn" id="sAuthorSave">Name speichern</button>
      </section>
      <p class="small" style="text-align:center">Wiesenbuch ${APP_VERSION}${storage ? ' · ' + storage : ''} · max. ${PHOTO_CAP} Fotos</p>
    </main>
    ${bottomnavHtml('mehr')}`;
  $('#mWiesen').onclick = () => sessionStorage.setItem('wbReturn', '#mehr');
  $('#sAuthorSave').onclick = async () => { await DB.setMeta('author', $('#sAuthor').value.trim()); toast('Gespeichert'); render(); };
  $('#sExport').onclick = exportZip;
  $('#sImport').onclick = () => $('#importInput').click();
  $('#sAnim').onchange = async (ev) => { WB.anim = ev.target.checked; await DB.setMeta('anim', WB.anim); applyAnimClass(); toast(WB.anim ? 'Animationen an' : 'Animationen aus'); };
  $('#sVibe').onchange = async (ev) => { WB.vibe = ev.target.checked; await DB.setMeta('vibe', WB.vibe); if (WB.vibe) buzz(30); toast(WB.vibe ? 'Vibration an' : 'Vibration aus'); };
  $('#mTypes').onclick = async () => {
    if (!custom.length) { toast('Eigene Typen legst du bei „Neue Anlage“ → „Neuer Typ“ an', 3500); return; }
    const t = prompt(`Welchen Typ umbenennen oder löschen?\n${custom.join(', ')}`, custom[0]);
    if (t === null) return;
    if (!custom.includes(t.trim())) return toast('Diesen Typ gibt es nicht');
    const n = prompt(`Neuer Name für „${t.trim()}“.\nFeld leeren und OK = löschen.`, t.trim());
    if (n === null) return;
    if (!n.trim()) { if (confirm(`„${t.trim()}“ löschen? Bestehende Anlagen behalten ihn.`)) await DB.setMeta('customTypes', custom.filter((x) => x !== t.trim())); }
    else {
      await DB.setMeta('customTypes', custom.map((x) => (x === t.trim() ? n.trim() : x)));
      for (const a of await DB.all('anlagen')) if (a.typ === t.trim()) await DB.put('anlagen', { ...a, typ: n.trim(), updatedAt: now() });
    }
    render();
  };
}

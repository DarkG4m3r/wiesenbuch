/* Wiesenbuch – Animationen & Vibration (ab 0.2.1)
   Kurz und ruhig: 200–450 ms. Aus, wenn in „Mehr“ abgeschaltet oder am Handy
   „Animationen entfernen“ aktiv ist. */

const WB = { anim: true, vibe: true, loaded: false };
const reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const animOn = () => WB.anim && !reducedMotion.matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadPrefs() {
  WB.anim = await DB.getMeta('anim', true);
  WB.vibe = await DB.getMeta('vibe', true);
  WB.loaded = true;
  applyAnimClass();
}
function applyAnimClass() { document.documentElement.classList.toggle('no-anim', !animOn()); }
if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', applyAnimClass);

function buzz(pattern) {
  if (!WB.vibe || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch (e) {}
}

// Knopf wird kurz zum Häkchen, dann geht es weiter
async function savedFx(btn) {
  buzz(30);
  if (!animOn() || !btn) return;
  btn.classList.add('saved');
  await sleep(380);
}

// Kurzer heller Blitz nach einer Kamera-Aufnahme
function camFlash() {
  if (!animOn()) return;
  const f = document.createElement('div');
  f.className = 'camflash';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 400);
}

/* Seitenwechsel: tiefer = von rechts, zurück = von links, Tabs = überblenden */
const ROUTE_LEVEL = { liste: 0, karte: 0, anlagen: 0, mehr: 0, einstellungen: 0, eintrag: 1, anlage: 1, leitung: 1, wiesen: 1, neu: 1, 'anlage-neu': 1, 'leitung-neu': 1, bearbeiten: 2, 'anlage-bearbeiten': 2, peilen: 2 };
const TAB_ORDER = ['liste', 'karte', 'anlagen', 'mehr'];
let fxPrevKey = null, fxPrevTab = null;

function animateEnter(key) {
  const route = key.split('/')[0];
  const tabIdx = TAB_ORDER.indexOf(route === 'einstellungen' ? 'mehr' : route);
  const prev = fxPrevKey;
  fxPrevKey = key;
  // Balken unter dem aktiven Tab gleitet vom vorherigen Tab herüber
  const ind = document.querySelector('.bottomnav .tabind');
  if (ind && tabIdx >= 0) {
    const pos = (i) => `calc(${i} * 25% + 12.5% - 16px)`;
    if (animOn() && fxPrevTab != null && fxPrevTab !== tabIdx) {
      ind.style.transition = 'none'; ind.style.left = pos(fxPrevTab);
      void ind.offsetWidth;
      ind.style.transition = ''; ind.style.left = pos(tabIdx);
    } else ind.style.left = pos(tabIdx);
  }
  if (tabIdx >= 0) fxPrevTab = tabIdx;
  if (!animOn() || !prev || prev === key) return;
  const lf = ROUTE_LEVEL[prev.split('/')[0]] ?? 0, lt = ROUTE_LEVEL[route] ?? 0;
  const cls = lt > lf ? 'pg-fwd' : lt < lf ? 'pg-back' : 'pg-fade';
  document.querySelectorAll('#app .topbar, #app .headwrap, #app .segwrap, #app main.content, #app .mapwrap, #app .peil, #app .ltmap').forEach((el) => {
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  });
}

/* Antippen: kleine Welle; nach unten wischen schließt Fenster */
function initFx() {
  const RIPPLE = '.card, .arow, .wrow, .btn, .opt, .tbtn, .grphead, .menulist > a, .menulist > button, .chip-h, .fab';
  document.addEventListener('pointerdown', (ev) => {
    if (!animOn()) return;
    const el = ev.target.closest(RIPPLE);
    if (!el || el.disabled) return;
    const r = el.getBoundingClientRect();
    const s = Math.max(r.width, r.height) * 1.2;
    const sp = document.createElement('span');
    sp.className = 'ripple';
    sp.style.cssText = `width:${s}px;height:${s}px;left:${ev.clientX - r.left - s / 2}px;top:${ev.clientY - r.top - s / 2}px`;
    el.appendChild(sp);
    setTimeout(() => sp.remove(), 550);
  }, { passive: true });

  let drag = null;
  document.addEventListener('touchstart', (ev) => {
    const box = ev.target.closest('.modal:not(.full) .box, .mapmenu');
    if (!box || box.scrollTop > 0 || ev.target.closest('input, textarea, .swatches, .chips')) return;
    drag = { box, y0: ev.touches[0].clientY, dy: 0 };
  }, { passive: true });
  document.addEventListener('touchmove', (ev) => {
    if (!drag) return;
    drag.dy = Math.max(0, ev.touches[0].clientY - drag.y0);
    drag.box.style.transition = 'none';
    drag.box.style.transform = `translateY(${drag.dy}px)`;
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!drag) return;
    const { box, dy } = drag; drag = null;
    box.style.transition = 'transform .2s ease';
    if (dy > 90) {
      box.style.transform = 'translateY(110%)';
      setTimeout(() => {
        box.style.transform = ''; box.style.transition = '';
        if (box.classList.contains('mapmenu')) { box.classList.add('hidden'); sessionStorage.removeItem('wbMenuOpen'); }
        else { const m = box.closest('.modal'); if (m) m.remove(); }
      }, 200);
    } else { box.style.transform = ''; setTimeout(() => { box.style.transition = ''; }, 200); }
  });
}

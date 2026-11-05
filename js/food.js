// Aliments : Open Food Facts (code-barres + recherche), cache local dans state.foods.
import { state, save } from './store.js';
import { fetchRetry } from './net.js';
import { BASE_FOODS } from './foods-base.js';
import { getLang } from './i18n.js';

const OFF = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,product_name_fr,brands,nutriments,serving_quantity';

function fromOff(p) {
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : null);
  if (kcal == null) return null;
  return {
    id: 'off:' + p.code,
    name: [p.product_name_fr || p.product_name, p.brands?.split(',')[0]].filter(Boolean).join(' — ') || 'Produit ' + p.code,
    per100: { kcal: +kcal, p: +(n.proteins_100g || 0), c: +(n.carbohydrates_100g || 0), f: +(n.fat_100g || 0), fib: +(n.fiber_100g || 0) },
    serving: Number(p.serving_quantity) || 100,
    source: 'Open Food Facts',
  };
}

export async function lookupBarcode(ean) {
  const code = String(ean).replace(/\D/g, '');
  if (state.foods['off:' + code]) return state.foods['off:' + code];
  const r = await fetchRetry(`${OFF}/api/v2/product/${code}.json?fields=${FIELDS}`, {}, { retries: 1, timeoutMs: 10000 });
  if (!r.ok) throw new Error('Produit introuvable (' + r.status + ')');
  const j = await r.json();
  if (j.status !== 1 || !j.product) throw new Error('Produit introuvable dans Open Food Facts');
  const food = fromOff(j.product);
  if (!food) throw new Error('Pas de valeurs nutritionnelles pour ce produit');
  state.foods[food.id] = food; save();
  return food;
}

// Normalisation : minuscules sans accents (œ -> oe, æ -> ae) pour une recherche tolérante.
const norm = (s) => String(s || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Recherche dans la base embarquée (instantanée, hors ligne) : 3 langues, jusqu'à 12 résultats.
// Classement : nom qui commence par la requête, puis mot qui commence, puis contient.
export function searchBase(q, lang = getLang()) {
  const nq = norm(q).trim();
  if (!nq) return [];
  const hits = [];
  for (const b of BASE_FOODS) {
    let best = 9;
    for (const l of ['fr', 'en', 'nl']) {
      const n = norm(b.name[l]);
      const i = n.indexOf(nq);
      if (i < 0) continue;
      const rank = i === 0 ? 0 : n.split(/[^a-z0-9]+/).some((w) => w.startsWith(nq)) ? 1 : 2;
      // Un match dans la langue courante prime sur un match dans une autre langue.
      best = Math.min(best, rank * 2 + (l === lang ? 0 : 1));
    }
    if (best < 9) hits.push([best, b]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  return hits.slice(0, 12).map(([, b]) => ({
    id: b.id, name: b.name[lang] || b.name.fr, per100: { ...b.per100 }, serving: b.serving, source: b.source,
  }));
}

let last = 0;
export async function searchFood(q) {
  const nq = norm(q);
  const local = Object.values(state.foods).filter((f) => norm(f.name).includes(nq));
  const base = searchBase(q);
  // Limite OFF ~10 req/min : on espace les appels.
  const wait = 6000 - (Date.now() - last);
  if (wait > 0) return { local, base, remote: [], throttled: Math.ceil(wait / 1000) };
  last = Date.now();
  const url = `${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&lc=fr&cc=fr&fields=${FIELDS}`;
  // La recherche texte OFF est souvent indisponible (503) : on renvoie alors les résultats locaux seuls.
  try {
    const r = await fetchRetry(url, {}, { retries: 0, timeoutMs: 6000 }); // repli rapide sur les résultats locaux
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    return { local, base, remote: (j.products || []).map(fromOff).filter(Boolean) };
  } catch {
    return { local, base, remote: [], offline: true };
  }
}

export function saveFood(food) {
  state.foods[food.id] = food; save();
}

// Entrée de journal pour `grams` d'un aliment.
export function entryFor(food, grams, meal) {
  const k = grams / 100, p = food.per100;
  return {
    name: food.name, foodId: food.id, grams, meal, source: food.source,
    kcal: Math.round(p.kcal * k), p: +(p.p * k).toFixed(1), c: +(p.c * k).toFixed(1), f: +(p.f * k).toFixed(1), fib: +(p.fib * k).toFixed(1),
  };
}

// ---- Scan code-barres ----
// iPhone/Safari n'a pas de BarcodeDetector : on utilise ZXing compilé en WebAssembly (moteur C++, embarqué dans vendor/).
// Améliorations : caméra arrière haute résolution + autofocus continu, analyse limitée à la zone de visée,
// lecture confirmée 2 fois (évite les faux positifs), lampe torche si l'appareil la propose.

const FORMATS = ['EAN13', 'EAN8', 'UPCA', 'UPCE'];
let zxingReady = null;

export function loadZXing() {
  if (!zxingReady) {
    zxingReady = new Promise((ok, ko) => {
      if (window.ZXingWASM) return ok(window.ZXingWASM);
      const s = document.createElement('script');
      s.src = 'vendor/zxing/reader.js';
      s.onload = () => ok(window.ZXingWASM);
      s.onerror = () => ko(new Error('Lecteur code-barres non chargé (réseau ?)'));
      document.head.appendChild(s);
    }).then((Z) => {
      Z.setZXingModuleOverrides({ locateFile: (path) => (path.endsWith('.wasm') ? 'vendor/zxing/' + path : path) });
      return Z.prepareZXingModule({ fireImmediately: true }).then(() => Z);
    }).catch((e) => { zxingReady = null; throw e; });
  }
  return zxingReady;
}

// Décode une image (ImageData) : renvoie le texte du premier code valide, ou null.
export async function decodeImage(imageData) {
  const Z = await loadZXing();
  const res = await Z.readBarcodes(imageData, { formats: FORMATS, tryHarder: true, tryRotate: true, maxNumberOfSymbols: 1 });
  const hit = res.find((r) => r.isValid && r.text);
  return hit ? hit.text : null;
}

// Démarre la caméra dans `video` ; onCode(ean) est appelé une seule fois. Renvoie { stop, torch? }.
export async function startScan(video, onCode) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Caméra non disponible dans ce navigateur');
  const zx = loadZXing(); // chargement en parallèle de l'ouverture caméra
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
  });
  video.setAttribute('playsinline', ''); video.muted = true;
  video.srcObject = stream;
  await video.play();
  const track = stream.getVideoTracks()[0];
  const caps = track.getCapabilities?.() || {};
  if (caps.focusMode?.includes('continuous')) track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});

  let stopped = false, last = null, busy = false;
  const stop = () => { stopped = true; stream.getTracks().forEach((t) => t.stop()); video.srcObject = null; };
  const found = (code) => {
    // Deux lectures identiques d'affilée avant de valider.
    if (code !== last) { last = code; return; }
    stop(); navigator.vibrate?.(60); onCode(code);
  };

  const native = 'BarcodeDetector' in window
    ? await window.BarcodeDetector.getSupportedFormats?.().then((f) => f.includes('ean_13')).catch(() => false) : false;
  const det = native ? new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }) : null;
  if (!det) await zx;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const tick = async () => {
    if (stopped) return;
    if (!busy && video.videoWidth) {
      busy = true;
      try {
        if (det) {
          const c = await det.detect(video);
          if (c[0]) found(c[0].rawValue);
        } else {
          // Zone de visée : bande centrale (90 % de large, 45 % de haut), réduite à 1280 px max.
          const vw = video.videoWidth, vh = video.videoHeight;
          const sw = vw * 0.9, sh = vh * 0.45, sx = (vw - sw) / 2, sy = (vh - sh) / 2;
          const k = Math.min(1, 1280 / sw);
          canvas.width = Math.round(sw * k); canvas.height = Math.round(sh * k);
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
          const code = await decodeImage(ctx.getImageData(0, 0, canvas.width, canvas.height));
          if (code) found(code);
        }
      } catch {}
      busy = false;
    }
    if (!stopped) setTimeout(tick, 120);
  };
  tick();

  const torch = caps.torch ? (on) => track.applyConstraints({ advanced: [{ torch: on }] }).catch(() => {}) : null;
  return { stop, torch };
}

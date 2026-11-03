// Aliments : Open Food Facts (code-barres + recherche), cache local dans state.foods.
import { state, save } from './store.js';

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
  const r = await fetch(`${OFF}/api/v2/product/${code}.json?fields=${FIELDS}`);
  if (!r.ok) throw new Error('Produit introuvable (' + r.status + ')');
  const j = await r.json();
  if (j.status !== 1 || !j.product) throw new Error('Produit introuvable dans Open Food Facts');
  const food = fromOff(j.product);
  if (!food) throw new Error('Pas de valeurs nutritionnelles pour ce produit');
  state.foods[food.id] = food; save();
  return food;
}

let last = 0;
export async function searchFood(q) {
  const local = Object.values(state.foods).filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));
  // Limite OFF ~10 req/min : on espace les appels.
  const wait = 6000 - (Date.now() - last);
  if (wait > 0) return { local, remote: [], throttled: Math.ceil(wait / 1000) };
  last = Date.now();
  const url = `${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&lc=fr&cc=fr&fields=${FIELDS}`;
  // La recherche texte OFF est souvent indisponible (503) : on renvoie alors les résultats locaux seuls.
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    return { local, remote: (j.products || []).map(fromOff).filter(Boolean) };
  } catch {
    return { local, remote: [], offline: true };
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

// Scan code-barres : BarcodeDetector natif si dispo, sinon ZXing chargé à la demande.
export async function startScan(video, onCode) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  await video.play();
  let stopped = false;
  const stop = () => { stopped = true; stream.getTracks().forEach((t) => t.stop()); };

  if ('BarcodeDetector' in window) {
    const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    const tick = async () => {
      if (stopped) return;
      try { const c = await det.detect(video); if (c[0]) { stop(); return onCode(c[0].rawValue); } } catch {}
      requestAnimationFrame(tick);
    };
    tick();
    return stop;
  }
  if (!window.ZXing) {
    await new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js';
      s.onload = ok; s.onerror = () => ko(new Error('Lecteur code-barres non chargé (réseau ?)'));
      document.head.appendChild(s);
    });
  }
  const hints = new Map([[window.ZXing.DecodeHintType.POSSIBLE_FORMATS, [
    window.ZXing.BarcodeFormat.EAN_13, window.ZXing.BarcodeFormat.EAN_8, window.ZXing.BarcodeFormat.UPC_A, window.ZXing.BarcodeFormat.UPC_E]]]);
  const reader = new window.ZXing.MultiFormatReader();
  reader.setHints(hints);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const tick = () => {
    if (stopped) return;
    if (video.videoWidth) {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      try {
        const lum = new window.ZXing.HTMLCanvasElementLuminanceSource(canvas);
        const res = reader.decode(new window.ZXing.BinaryBitmap(new window.ZXing.HybridBinarizer(lum)));
        if (res) { stop(); return onCode(res.getText()); }
      } catch {}
    }
    setTimeout(tick, 200);
  };
  tick();
  return stop;
}

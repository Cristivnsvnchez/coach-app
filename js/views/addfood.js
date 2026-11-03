// Feuille « Ajouter un aliment » : récents, favoris, recherche, scan, IA, saisie manuelle.
import { state, save, dayLog, recentFoods, uid } from '../store.js';
import { searchFood, lookupBarcode, entryFor, saveFood, startScan } from '../food.js';
import { estimateMeal, imageToBase64, hasKey } from '../ai.js';
import { esc, fmt, sheet, toast } from '../ui.js';

export const MEALS = { dej: 'Petit-déjeuner', midi: 'Déjeuner', diner: 'Dîner', snack: 'Collations' };

export function openAddFood(meal, date, done) {
  let stopScan = null;
  let scanId = 0; // invalide un démarrage de caméra encore en cours si on ferme ou change d'onglet
  const s = sheet(`
    <h3>Ajouter — ${MEALS[meal]}</h3>
    <form class="row" data-f="search"><input name="q" type="search" placeholder="Rechercher un aliment" autocomplete="off" enterkeyhint="search"><button class="btn">OK</button></form>
    <div class="chips">
      <button class="chip" data-a="scan">📷 Code-barres</button>
      <button class="chip" data-a="ai">✨ Photo / texte IA</button>
      <button class="chip" data-a="manual">✍️ Manuel</button>
    </div>
    <div class="results"></div>`, () => { scanId++; stopScan && stopScan(); });
  const res = s.querySelector('.results');

  const list = (title, foods) => !foods.length ? '' : `<p class="label">${title}</p><ul class="list">${foods.map((f) => `
    <li data-food="${esc(f.id)}"><div><b>${esc(f.name)}</b><small>${fmt(f.per100.kcal)} kcal · P ${fmt(f.per100.p, 1)} · G ${fmt(f.per100.c, 1)} · L ${fmt(f.per100.f, 1)} /100 g · ${esc(f.source)}</small></div><span class="chev">›</span></li>`).join('')}</ul>`;

  const showHome = () => {
    const rec = recentFoods();
    const favs = state.favorites.map((id) => state.foods[id]).filter(Boolean);
    res.innerHTML = `${list('Favoris', favs)}
      ${rec.length ? `<p class="label">Récents</p><ul class="list">${rec.map((e, i) => `<li data-recent="${i}"><div><b>${esc(e.name)}</b><small>${fmt(e.grams)} g · ${fmt(e.kcal)} kcal</small></div><span class="plus">＋</span></li>`).join('')}</ul>` : ''}
      ${!rec.length && !favs.length ? '<p class="muted center">Cherche un aliment, scanne un code-barres ou décris ton repas à l\'IA.</p>' : ''}`;
    res.onclick = (e) => {
      const r = e.target.closest('[data-recent]');
      if (r) { const src = rec[+r.dataset.recent]; addEntries([{ ...src, meal }]); return; }
      const f = e.target.closest('[data-food]');
      if (f) pickGrams(state.foods[f.dataset.food]);
    };
  };

  const addEntries = (entries) => {
    const log = dayLog(date);
    entries.forEach((en) => log.meals.push({ ...en, id: uid(), meal }));
    save(); toast(entries.length > 1 ? `${entries.length} aliments ajoutés` : 'Ajouté ✓');
    s.close(); done();
  };

  const pickGrams = (food) => {
    if (!food) return;
    const fav = state.favorites.includes(food.id);
    res.innerHTML = `<div class="card">
      <b>${esc(food.name)}</b><small class="muted block">${esc(food.source)} · ${fmt(food.per100.kcal)} kcal /100 g</small>
      <label>Quantité (g)<input type="number" inputmode="decimal" name="g" value="${food.serving || 100}" min="1"></label>
      <p class="preview"></p>
      <div class="row"><button class="btn ghost" data-a="fav">${fav ? '★ Favori' : '☆ Favori'}</button><button class="btn primary" data-a="add">Ajouter</button></div></div>`;
    const g = res.querySelector('[name=g]'), pv = res.querySelector('.preview');
    const upd = () => { const e = entryFor(food, +g.value || 0, meal); pv.textContent = `${e.kcal} kcal · P ${e.p} g · G ${e.c} g · L ${e.f} g · Fibres ${e.fib} g`; };
    g.oninput = upd; upd(); g.focus();
    res.onclick = (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'add') { saveFood(food); addEntries([entryFor(food, +g.value || 0, meal)]); }
      if (a === 'fav') {
        saveFood(food);
        state.favorites = fav ? state.favorites.filter((x) => x !== food.id) : [...state.favorites, food.id];
        save(); pickGrams(food);
      }
    };
  };

  const doSearch = async (q) => {
    if (!q.trim()) return showHome();
    res.innerHTML = '<p class="muted center">Recherche…</p>';
    try {
      const { local, remote, throttled, offline } = await searchFood(q);
      res.innerHTML = list('Mes aliments', local) + list('Open Food Facts', remote)
        + (throttled ? `<p class="muted center small">Recherche en ligne possible dans ${throttled} s (limite Open Food Facts).</p>` : '')
        + (offline ? '<p class="muted center small">Recherche Open Food Facts indisponible pour le moment.</p>' : '')
        + `<button class="btn primary wide" data-a="aiq">✨ Estimer « ${esc(q)} » avec l'IA (Ciqual/USDA)</button>`;
      const all = [...local, ...remote];
      res.onclick = (e) => {
        if (e.target.closest('[data-a=aiq]')) return doAi(q);
        const f = e.target.closest('[data-food]'); if (f) pickGrams(all.find((x) => x.id === f.dataset.food));
      };
    } catch (err) { res.innerHTML = `<p class="error">${esc(err.message)}</p>`; }
  };

  const doScan = async () => {
    res.innerHTML = `<video class="scan" muted playsinline></video><p class="muted center">Vise le code-barres</p>
      <form class="row" data-f="ean"><input name="ean" inputmode="numeric" placeholder="ou tape le code (EAN)"><button class="btn">OK</button></form>`;
    const byCode = async (code) => {
      res.innerHTML = '<p class="muted center">Recherche du produit…</p>';
      try { pickGrams(await lookupBarcode(code)); } catch (err) { res.innerHTML = `<p class="error">${esc(err.message)}</p>`; }
    };
    res.querySelector('[data-f=ean]').onsubmit = (e) => { e.preventDefault(); scanId++; stopScan && stopScan(); byCode(e.target.ean.value); };
    const id = ++scanId;
    try {
      const stop = await startScan(res.querySelector('video'), (code) => { if (id === scanId) byCode(code); });
      if (id !== scanId) stop(); else stopScan = stop;
    }
    catch (err) { res.querySelector('video')?.remove(); res.insertAdjacentHTML('afterbegin', `<p class="error">Caméra indisponible : ${esc(err.message)}</p>`); }
  };

  const doAi = (prefill = '') => {
    if (!hasKey()) { res.innerHTML = '<p class="error">Ajoute ta clé API Claude dans Profil pour utiliser l\'IA.</p>'; return; }
    res.innerHTML = `<form data-f="ai" class="stack">
      <label class="btn ghost file">📸 Prendre / choisir une photo<input type="file" accept="image/*" name="img" hidden></label>
      <span class="muted small imgname"></span>
      <textarea name="desc" rows="3" placeholder="Ex : 150 g de poulet, riz basmati, une cuillère d'huile d'olive">${esc(prefill)}</textarea>
      <button class="btn primary">Estimer</button></form>`;
    const f = res.querySelector('form');
    f.img.onchange = () => (res.querySelector('.imgname').textContent = f.img.files[0]?.name || '');
    f.onsubmit = async (e) => {
      e.preventDefault();
      const file = f.img.files[0], desc = f.desc.value.trim();
      if (!file && !desc) return toast('Ajoute une photo ou une description');
      res.innerHTML = '<p class="muted center">Analyse en cours… (10–30 s)</p>';
      try {
        const out = await estimateMeal({ imageB64: file ? await imageToBase64(file) : null, description: desc });
        showAiResult(out);
      } catch (err) { res.innerHTML = `<p class="error">${esc(err.message)}</p>`; }
    };
  };

  const showAiResult = (out) => {
    res.innerHTML = `<p class="label">Estimation IA — modifie si besoin</p>
      ${out.note ? `<p class="muted small">${esc(out.note)}</p>` : ''}
      <ul class="list edit">${out.items.map((it, i) => `<li><div><b>${esc(it.name)}</b><small>${fmt(it.kcal)} kcal · P ${fmt(it.p, 1)} · G ${fmt(it.c, 1)} · L ${fmt(it.f, 1)}</small></div>
        <input type="number" inputmode="decimal" data-i="${i}" value="${Math.round(it.grams)}" aria-label="grammes"> g</li>`).join('')}</ul>
      <button class="btn primary wide" data-a="addai">Tout ajouter</button>`;
    res.onclick = (e) => {
      if (e.target.closest('[data-a=addai]')) {
        const entries = out.items.map((it, i) => {
          const g = +res.querySelector(`[data-i="${i}"]`).value || it.grams;
          const k = it.grams ? g / it.grams : 1;
          return { name: it.name, grams: g, source: 'Estimation IA', kcal: Math.round(it.kcal * k), p: +(it.p * k).toFixed(1), c: +(it.c * k).toFixed(1), f: +(it.f * k).toFixed(1), fib: +(it.fib * k).toFixed(1) };
        });
        addEntries(entries);
      }
    };
  };

  const doManual = () => {
    res.innerHTML = `<form data-f="manual" class="grid2">
      <label class="span2">Nom<input name="name" required placeholder="Ex : Skyr nature"></label>
      <label>kcal /100 g<input name="kcal" type="number" inputmode="decimal" required></label>
      <label>Protéines<input name="p" type="number" inputmode="decimal" value="0"></label>
      <label>Glucides<input name="c" type="number" inputmode="decimal" value="0"></label>
      <label>Lipides<input name="f" type="number" inputmode="decimal" value="0"></label>
      <label>Fibres<input name="fib" type="number" inputmode="decimal" value="0"></label>
      <label>Portion (g)<input name="serving" type="number" inputmode="decimal" value="100"></label>
      <button class="btn primary span2">Créer l'aliment</button></form>`;
    res.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(e.target));
      const food = { id: 'perso:' + uid(), name: v.name, source: 'Perso', serving: +v.serving || 100,
        per100: { kcal: +v.kcal, p: +v.p, c: +v.c, f: +v.f, fib: +v.fib } };
      saveFood(food); pickGrams(food);
    };
  };

  s.querySelector('[data-f=search]').onsubmit = (e) => { e.preventDefault(); doSearch(e.target.q.value); };
  s.querySelector('.chips').onclick = (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    scanId++; stopScan && stopScan(); stopScan = null;
    ({ scan: doScan, ai: () => doAi(), manual: doManual })[a]?.();
  };
  showHome();
}

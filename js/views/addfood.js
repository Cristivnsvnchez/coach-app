// Feuille « Ajouter un aliment » : récents, favoris, recherche, scan, IA, saisie manuelle.
import { state, save, dayLog, planDay, recentFoods, uid } from '../store.js';
import { searchFood, searchBase, lookupBarcode, entryFor, saveFood, startScan } from '../food.js';
import { esc, fmt, sheet, toast, group } from '../ui.js';
import { icon } from '../icons.js';
import { getLang, t, register } from '../i18n.js';
import { current } from '../metrics.js';

register({
  en: { 'Petit-déj': 'Breakfast', 'Collation': 'Snack', '{k} kcal · {p} g prot. /100 g': '{k} kcal · {p} g prot. /100 g', 'Base embarquée + Open Food Facts': 'Built-in base + Open Food Facts', 'Ajouter {g} g': 'Add {g} g', '1 portion · {g} g': '1 serving · {g} g', '{m} · {k} kcal /100 g': '{m} · {k} kcal /100 g', 'Résultats': 'Results', 'Choisis une quantité supérieure à 0': 'Pick an amount above 0' },
  nl: { 'Petit-déj': 'Ontbijt', 'Collation': 'Tussendoor', '{k} kcal · {p} g prot. /100 g': '{k} kcal · {p} g eiwit /100 g', 'Base embarquée + Open Food Facts': 'Ingebouwde lijst + Open Food Facts', 'Ajouter {g} g': '{g} g toevoegen', '1 portion · {g} g': '1 portie · {g} g', '{m} · {k} kcal /100 g': '{m} · {k} kcal /100 g', 'Résultats': 'Resultaten', 'Choisis une quantité supérieure à 0': 'Kies een hoeveelheid boven 0' },
});

export const MEALS = { dej: 'Petit-déjeuner', midi: 'Déjeuner', diner: 'Dîner', snack: 'Collations' };

// `pick(entries)` (optionnel) remplace l'écriture dans le Journal/planning : sert à la liste de courses, qui
// réutilise la même recherche. `title` remplace alors le titre, `extra` ajoute une puce (ex. article libre).
export function openAddFood(meal0, date, done, { target = 'log', pick = null, title = '', extra = null } = {}) {
  let meal = meal0;
  let stopScan = null;
  let scanId = 0; // invalide un démarrage de caméra encore en cours si on ferme ou change d'onglet
  const SHORT = { dej: 'Petit-déj', midi: 'Déjeuner', diner: 'Dîner', snack: 'Collation' };
  const s = sheet(`
    <div class="sheet-head af-head"><h3 class="title2">${title ? esc(title) : t(target === 'plan' ? 'Planifier — {meal}' : 'Ajouter un aliment', { meal: t(MEALS[meal]) })}</h3>
      <button class="v2-cb af-scan" data-a="scan" aria-label="${t('Code-barres')}">${icon('barcode')}</button></div>
    ${pick ? '' : `<div class="seg af-meals" role="tablist">${Object.keys(MEALS).map((k) => `<button role="tab" data-meal="${k}" class="${k === meal ? 'on' : ''}" aria-selected="${k === meal}">${t(SHORT[k])}</button>`).join('')}</div>`}
    <form data-f="search" class="row af-search">
      <label class="searchbar" style="flex:1">${icon('search')}<input name="q" type="search" placeholder="${t('Rechercher un aliment')}" autocomplete="off" enterkeyhint="search" aria-label="${t('Rechercher un aliment')}"></label>
    </form>
    <div class="chips af-chips">
      <button class="chip" data-a="manual">${icon('pencil')} ${t('Manuel')}</button>
      ${extra ? `<button class="chip" data-a="extra">${icon('plus')} ${esc(extra.label)}</button>` : ''}
    </div>
    <div class="results"></div>
    <p class="af-src">${t('Base embarquée + Open Food Facts')}</p>`, () => { scanId++; stopScan && stopScan(); });
  s.querySelector('.af-meals')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-meal]'); if (!b) return;
    meal = b.dataset.meal;
    s.querySelectorAll('.af-meals button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
  });
  s.querySelector('.af-scan').onclick = () => { scanId++; stopScan && stopScan(); stopScan = null; doScan(); };
  const res = s.querySelector('.results');

  const foodCells = (foods) => foods.map((f, i) => `<li class="cell tap af-row" data-food="${esc(f.id)}"><div class="grow"><span class="t">${esc(f.name)}</span>
    <span class="s num">${t('{k} kcal · {p} g prot. /100 g', { k: fmt(f.per100.kcal), p: fmt(f.per100.p, 0) })}${f.source && f.source !== 'base' ? ' · ' + esc(t(f.source)) : ''}</span></div><span class="af-plus ${i === 0 ? 'first' : ''}" aria-hidden="true">${icon('plus')}</span></li>`).join('');
  const list = (title, foods) => (!foods.length ? '' : group(title, `<ul class="cells">${foodCells(foods)}</ul>`));

  const showHome = () => {
    const rec = recentFoods();
    const favs = state.favorites.map((id) => state.foods[id]).filter(Boolean);
    res.innerHTML = `${list(t('Favoris'), favs)}
      ${rec.length ? group(t('Récents'), `<div class="af-recent">${rec.map((e, i) => `<button class="chip" data-recent="${i}" aria-label="${t('Ajouter')} ${esc(e.name)}${e.grams ? ' · ' + fmt(e.grams) + ' g' : ''}">${esc(e.name)}</button>`).join('')}</div>`) : ''}
      ${!rec.length && !favs.length ? `<p class="empty footnote">${t('Cherche un aliment ou scanne un code-barres.')}</p>` : ''}`;
    res.onclick = (e) => {
      const r = e.target.closest('[data-recent]');
      if (r) { const src = rec[+r.dataset.recent]; addEntries([{ ...src, meal }]); return; }
      const f = e.target.closest('[data-food]');
      if (f) pickGrams(state.foods[f.dataset.food]);
    };
  };

  const addEntries = (entries) => {
    if (pick) { pick(entries); s.close(); done(); return; }
    const bucket = target === 'plan' ? planDay(date)[meal] : dayLog(date).meals;
    entries.forEach((en) => bucket.push({ ...en, id: uid(), meal }));
    save(); toast(entries.length > 1 ? t('{n} aliments ajoutés', { n: entries.length }) : t('Ajouté ✓'));
    s.close(); done();
  };

  // Portion (canevas repas-4) : anneau kcal, barres macros, portions rapides, curseur, champ en grammes.
  const pickGrams = (food) => {
    if (!food) return;
    const fav = state.favorites.includes(food.id);
    const budget = current().targets?.kcal || 2000;
    const serving = +food.serving || 100;
    const presets = [...new Set([serving, 100, 150, 200].map((x) => Math.round(x)))].slice(0, 4);
    res.innerHTML = `<div class="af-pick"><div class="af-ph"><div class="grow"><h3 class="af-name">${esc(food.name)}</h3>
        <span class="v2-sm">${pick ? esc(t(food.source)) : t('{m} · {k} kcal /100 g', { m: t(MEALS[meal]), k: fmt(food.per100.kcal) })}</span></div>
        <button class="v2-cb" data-a="fav" aria-label="${t('Favori')}" aria-pressed="${fav}">${icon('heart')}</button></div>
      <div class="af-viz"><div class="af-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--a-fill)" stroke-width="12"/>
          <circle class="af-arc" cx="60" cy="60" r="52" fill="none" stroke="var(--a-food)" stroke-width="12" stroke-linecap="round" transform="rotate(-90 60 60)"/></svg>
          <span><b class="v2-num af-k"></b><small>kcal</small></span></div>
        <div class="af-macros">${[['p', t('Protéines'), 'var(--a-deep)'], ['c', t('Glucides'), 'var(--a-mid)'], ['f', t('Lipides'), 'var(--a-warm)']].map(([k, l, c]) =>
          `<div><span class="v2-row"><span class="grow v2-sm">${l}</span><b class="num" data-m="${k}"></b></span><div class="v2-bar"><i data-b="${k}" style="background:${c}"></i></div></div>`).join('')}</div></div>
      <div class="chips af-portions">${presets.map((g) => `<button class="chip" data-g="${g}">${g === serving && serving !== 100 ? t('1 portion · {g} g', { g }) : g + ' g'}</button>`).join('')}
        <label class="chip af-gin"><input type="number" inputmode="decimal" name="g" value="${esc(serving)}" min="1" aria-label="${t('Quantité (g)')}"> g</label></div>
      <input class="af-range" type="range" min="5" max="500" step="5" value="${Math.min(500, serving)}" aria-label="${t('Quantité (g)')}">
      <p class="v2-sm af-fib num"></p>
      <button class="btn filled large wide v2-go" data-a="add"></button></div>`;
    const g = res.querySelector('[name=g]'), rg = res.querySelector('.af-range'), btn = res.querySelector('[data-a=add]');
    const C = 2 * Math.PI * 52;
    const upd = () => {
      const gr = +g.value || 0, e = entryFor(food, gr, meal);
      res.querySelector('.af-k').textContent = fmt(e.kcal);
      res.querySelector('.af-arc').setAttribute('stroke-dasharray', `${(C * Math.min(1, e.kcal / budget)).toFixed(1)} ${C.toFixed(1)}`);
      for (const k of ['p', 'c', 'f']) {
        res.querySelector(`[data-m=${k}]`).textContent = `${fmt(e[k], 1)} g`;
        res.querySelector(`[data-b=${k}]`).style.width = Math.min(100, (e[k] / 60) * 100) + '%';
      }
      res.querySelector('.af-fib').textContent = `${t('Fibres')} ${fmt(e.fib, 1)} g`;
      btn.textContent = t('Ajouter {g} g', { g: fmt(gr) });
      res.querySelectorAll('[data-g]').forEach((c) => c.classList.toggle('on', +c.dataset.g === gr));
    };
    g.oninput = () => { rg.value = Math.min(500, +g.value || 0); upd(); };
    rg.oninput = () => { g.value = rg.value; upd(); };
    upd();
    res.onclick = (e) => {
      const pg = e.target.closest('[data-g]');
      if (pg) { g.value = pg.dataset.g; rg.value = Math.min(500, +pg.dataset.g); return upd(); }
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'add') {
        if (!((+g.value || 0) > 0)) return toast(t('Choisis une quantité supérieure à 0'));
        saveFood(food); addEntries([entryFor(food, +g.value || 0, meal)]);
      }
      if (a === 'fav') {
        saveFood(food);
        state.favorites = fav ? state.favorites.filter((x) => x !== food.id) : [...state.favorites, food.id];
        save(); pickGrams(food);
      }
    };
  };

  // Pendant la frappe : résultats instantanés et hors ligne (aliments courants + mes aliments), sans réseau.
  const norm = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const quick = (q) => {
    if (!q.trim()) return showHome();
    const base = searchBase(q, getLang());
    const local = Object.values(state.foods).filter((f) => norm(f.name).includes(norm(q)) && !f.id.startsWith('base:')).slice(0, 8);
    res.innerHTML = list(t('Mes aliments'), local) + list(t('Résultats'), base)
      + (!base.length && !local.length ? `<p class="empty footnote">${t('Rien dans les aliments courants.')}</p>` : '')
      + `<div class="af-more"><button class="btn" data-a="off">${icon('search')} ${esc(t('Chercher « {q} » en ligne', { q }))}</button></div>`;
    const all = [...local, ...base];
    res.onclick = (e) => {
      if (e.target.closest('[data-a=off]')) return doSearch(q);
      const f = e.target.closest('[data-food]'); if (f) pickGrams(all.find((x) => x.id === f.dataset.food));
    };
  };

  const doSearch = async (q) => {
    if (!q.trim()) return showHome();
    res.innerHTML = `<p class="empty footnote">${t('Recherche…')}</p>`;
    try {
      const { local, remote, base = [], throttled, offline } = await searchFood(q);
      res.innerHTML = list(t('Mes aliments'), local) + list(t('Aliments courants'), base) + list('Open Food Facts', remote)
        + (throttled ? `<p class="empty footnote">${t('Recherche en ligne possible dans {n} s (limite Open Food Facts).', { n: throttled })}</p>` : '')
        + (offline ? `<p class="empty footnote">${t('Recherche Open Food Facts indisponible pour le moment.')}</p>` : '')
        + (!local.length && !base.length && !remote.length ? `<p class="empty footnote">${t('Rien trouvé. Ajoute-le en manuel, il sera proposé la prochaine fois.')}</p>` : '');
      const all = [...local, ...base, ...remote];
      res.onclick = (e) => {
        const f = e.target.closest('[data-food]'); if (f) pickGrams(all.find((x) => x.id === f.dataset.food));
      };
    } catch (err) { res.innerHTML = `<p class="error">${esc(err.message)}</p>`; }
  };

  const doScan = async () => {
    res.innerHTML = `<div class="scan-wrap"><video class="scan" muted playsinline autoplay></video><div class="scan-guide"><span class="scan-line"></span></div>
      <button class="icon-btn round scan-torch" data-a="torch" hidden aria-label="${t('Lampe')}">${icon('bolt')}</button></div>
      <p class="empty footnote">${t('Place le code-barres dans le cadre, à 10–20 cm')}</p>
      <form class="row" data-f="ean"><input class="input" name="ean" inputmode="numeric" placeholder="${t('ou tape le code (EAN)')}"><button class="btn filled">${t('OK')}</button></form>`;
    const byCode = async (code) => {
      res.innerHTML = `<p class="empty footnote">${t('Recherche du produit…')}</p>`;
      try { pickGrams(await lookupBarcode(code)); } catch (err) { res.innerHTML = `<p class="error">${esc(t(err.message, err.vars))}</p>`; }
    };
    res.querySelector('[data-f=ean]').onsubmit = (e) => { e.preventDefault(); scanId++; stopScan && stopScan(); byCode(e.target.ean.value); };
    const id = ++scanId;
    try {
      const cam = await startScan(res.querySelector('video'), (code) => { if (id === scanId) byCode(code); });
      if (id !== scanId) return cam.stop();
      stopScan = cam.stop;
      const tb = res.querySelector('[data-a=torch]');
      if (cam.torch && tb) { let on = false; tb.hidden = false; tb.onclick = () => { on = !on; cam.torch(on); tb.classList.toggle('on', on); }; }
    }
    catch (err) { res.querySelector('video')?.remove(); res.insertAdjacentHTML('afterbegin', `<p class="error">${esc(t('Caméra indisponible : {e}', { e: t(err.message, err.vars) }))}</p>`); }
  };

  const doManual = () => {
    const field = (name, label, attrs = '') => `<label class="cell field"><span>${label}</span><input name="${name}" type="number" inputmode="decimal" ${attrs}></label>`;
    res.innerHTML = `<form data-f="manual">${group('', `<div class="cells">
      <label class="cell field"><span>${t('Nom')}</span><input name="name" required placeholder="${t('Ex : Skyr nature')}"></label>
      ${field('kcal', t('kcal /100 g'), 'required')}${field('p', t('Protéines'), 'value="0"')}${field('c', t('Glucides'), 'value="0"')}
      ${field('f', t('Lipides'), 'value="0"')}${field('fib', t('Fibres'), 'value="0"')}${field('serving', t('Portion (g)'), 'value="100"')}</div>`)}
      <button class="btn filled large">${t("Créer l'aliment")}</button></form>`;
    res.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(e.target));
      const food = { id: 'perso:' + uid(), name: v.name, source: 'Perso', serving: +v.serving || 100,
        per100: { kcal: +v.kcal, p: +v.p, c: +v.c, f: +v.f, fib: +v.fib } };
      saveFood(food); pickGrams(food);
    };
  };

  const form = s.querySelector('[data-f=search]');
  form.onsubmit = (e) => { e.preventDefault(); e.target.q.blur(); doSearch(e.target.q.value); };
  let typing = 0;
  form.q.addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(() => quick(form.q.value), 120); });
  s.querySelector('.chips').onclick = (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    scanId++; stopScan && stopScan(); stopScan = null;
    if (a === 'extra') { s.close(); return extra.run(); }
    ({ scan: doScan, manual: doManual })[a]?.();
  };
  showHome();
}

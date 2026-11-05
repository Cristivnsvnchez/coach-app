// Feuille « Ajouter un aliment » : récents, favoris, recherche, scan, IA, saisie manuelle.
import { state, save, dayLog, recentFoods, uid } from '../store.js';
import { searchFood, searchBase, lookupBarcode, entryFor, saveFood, startScan } from '../food.js';
import { estimateMeal, imageToBase64, hasKey } from '../ai.js';
import { esc, fmt, sheet, toast, group } from '../ui.js';
import { icon } from '../icons.js';
import { getLang, t } from '../i18n.js';

export const MEALS = { dej: 'Petit-déjeuner', midi: 'Déjeuner', diner: 'Dîner', snack: 'Collations' };

export function openAddFood(meal, date, done) {
  let stopScan = null;
  let scanId = 0; // invalide un démarrage de caméra encore en cours si on ferme ou change d'onglet
  const s = sheet(`
    <div class="sheet-head"><h3 class="title2">${t('Ajouter — {meal}', { meal: t(MEALS[meal]) })}</h3></div>
    <form data-f="search" class="row" style="margin-bottom:.5rem">
      <label class="searchbar" style="flex:1">${icon('search')}<input name="q" type="search" placeholder="${t('Rechercher un aliment')}" autocomplete="off" enterkeyhint="search" aria-label="${t('Rechercher un aliment')}"></label>
    </form>
    <div class="chips">
      <button class="chip" data-a="scan">${icon('barcode')} ${t('Code-barres')}</button>
      <button class="chip" data-a="ai">${icon('sparkles')} ${t('Photo / texte IA')}</button>
      <button class="chip" data-a="manual">${icon('pencil')} ${t('Manuel')}</button>
    </div>
    <div class="results"></div>`, () => { scanId++; stopScan && stopScan(); });
  const res = s.querySelector('.results');

  const foodCells = (foods) => foods.map((f) => `<li class="cell tap" data-food="${esc(f.id)}"><div class="grow"><span class="t">${esc(f.name)}</span>
    <span class="s num">${fmt(f.per100.kcal)} kcal · P ${fmt(f.per100.p, 1)} · G ${fmt(f.per100.c, 1)} · L ${fmt(f.per100.f, 1)} /100 g · ${esc(t(f.source))}</span></div>${icon('chevronRight', { cls: 'chev' })}</li>`).join('');
  const list = (title, foods) => (!foods.length ? '' : group(title, `<ul class="cells">${foodCells(foods)}</ul>`));

  const showHome = () => {
    const rec = recentFoods();
    const favs = state.favorites.map((id) => state.foods[id]).filter(Boolean);
    res.innerHTML = `${list(t('Favoris'), favs)}
      ${rec.length ? group(t('Récents'), `<ul class="cells">${rec.map((e, i) => `<li class="cell tap" data-recent="${i}"><div class="grow"><span class="t">${esc(e.name)}</span><span class="s num">${e.grams ? fmt(e.grams) + ' g · ' : ''}${fmt(e.kcal)} kcal</span></div><span class="tint">${icon('plus')}</span></li>`).join('')}</ul>`) : ''}
      ${!rec.length && !favs.length ? `<p class="empty footnote">${t("Cherche un aliment, scanne un code-barres ou décris ton repas à l'IA.")}</p>` : ''}`;
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
    save(); toast(entries.length > 1 ? t('{n} aliments ajoutés', { n: entries.length }) : t('Ajouté ✓'));
    s.close(); done();
  };

  const pickGrams = (food) => {
    if (!food) return;
    const fav = state.favorites.includes(food.id);
    res.innerHTML = group(esc(t(food.source)), `<div class="cells">
      <div class="cell"><div class="grow"><span class="t headline">${esc(food.name)}</span><span class="s num">${fmt(food.per100.kcal)} kcal /100 g</span></div>
        <button class="icon-btn" data-a="fav" aria-label="${t('Favori')}" aria-pressed="${fav}">${icon('star', { filled: fav })}</button></div>
      <label class="cell field"><span>${t('Quantité (g)')}</span><input type="number" inputmode="decimal" name="g" value="${food.serving || 100}" min="1"></label>
      <div class="preview num"></div></div>`)
      + `<button class="btn filled large" data-a="add">${t('Ajouter')}</button>`;
    const g = res.querySelector('[name=g]'), pv = res.querySelector('.preview');
    const upd = () => { const e = entryFor(food, +g.value || 0, meal); pv.textContent = `${e.kcal} kcal · P ${e.p} g · G ${e.c} g · L ${e.f} g · ${t('Fibres')} ${e.fib} g`; };
    g.oninput = upd; upd(); g.focus(); g.select();
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

  // Pendant la frappe : résultats instantanés et hors ligne (aliments courants + mes aliments), sans réseau.
  const norm = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const quick = (q) => {
    if (!q.trim()) return showHome();
    const base = searchBase(q, getLang());
    const local = Object.values(state.foods).filter((f) => norm(f.name).includes(norm(q)) && !f.id.startsWith('base:')).slice(0, 8);
    res.innerHTML = list(t('Mes aliments'), local) + list(t('Aliments courants'), base)
      + (!base.length && !local.length ? `<p class="empty footnote">${t('Rien dans les aliments courants.')}</p>` : '')
      + `<div class="af-more"><button class="btn" data-a="off">${icon('search')} ${esc(t('Chercher « {q} » en ligne', { q }))}</button>
         <button class="btn" data-a="aiq">${icon('sparkles')} ${t("Estimer avec l'IA")}</button></div>`;
    const all = [...local, ...base];
    res.onclick = (e) => {
      if (e.target.closest('[data-a=off]')) return doSearch(q);
      if (e.target.closest('[data-a=aiq]')) return doAi(q);
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
        + `<button class="btn large" data-a="aiq">${icon('sparkles')} ${esc(t("Estimer « {q} » avec l'IA (Ciqual/USDA)", { q }))}</button>`;
      const all = [...local, ...base, ...remote];
      res.onclick = (e) => {
        if (e.target.closest('[data-a=aiq]')) return doAi(q);
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

  const doAi = (prefill = '') => {
    if (!hasKey()) { res.innerHTML = `<p class="error">${t("Ajoute ta clé API Claude dans Profil pour utiliser l'IA.")}</p>`; return; }
    res.innerHTML = `<form data-f="ai" class="stack">
      <label class="btn">${icon('camera')} ${t('Prendre / choisir une photo')}<input type="file" accept="image/*" name="img" hidden></label>
      <span class="footnote secondary imgname"></span>
      <textarea class="input" name="desc" rows="3" placeholder="${t("Ex : 150 g de poulet, riz basmati, une cuillère d'huile d'olive")}">${esc(prefill)}</textarea>
      <button class="btn filled large">${icon('sparkles')} ${t('Estimer')}</button></form>`;
    const f = res.querySelector('form');
    f.img.onchange = () => (res.querySelector('.imgname').textContent = f.img.files[0]?.name || '');
    f.onsubmit = async (e) => {
      e.preventDefault();
      const file = f.img.files[0], desc = f.desc.value.trim();
      if (!file && !desc) return toast(t('Ajoute une photo ou une description'));
      res.innerHTML = `<p class="empty footnote"><span class="typing-dots"><i></i><i></i><i></i></span><br>${t('Analyse en cours… (10–30 s)')}</p>`;
      try {
        const out = await estimateMeal({ imageB64: file ? await imageToBase64(file) : null, description: desc });
        showAiResult(out);
      } catch (err) { res.innerHTML = `<p class="error">${esc(t(err.message, err.vars))}</p>`; }
    };
  };

  const showAiResult = (out) => {
    res.innerHTML = group(t('Estimation IA — modifie si besoin'), `<ul class="cells">${out.items.map((it, i) => `<li class="cell"><div class="grow"><span class="t">${esc(it.name)}</span>
        <span class="s num">${fmt(it.kcal)} kcal · P ${fmt(it.p, 1)} · G ${fmt(it.c, 1)} · L ${fmt(it.f, 1)}</span></div>
        <input class="input num" style="width:5rem;text-align:right" type="number" inputmode="decimal" data-i="${i}" value="${Math.round(it.grams)}" aria-label="${t('grammes')}"> g</li>`).join('')}</ul>`, out.note ? esc(out.note) : '')
      + `<button class="btn filled large" data-a="addai">${t('Tout ajouter')}</button>`;
    res.onclick = (e) => {
      if (!e.target.closest('[data-a=addai]')) return;
      const entries = out.items.map((it, i) => {
        const g = +res.querySelector(`[data-i="${i}"]`).value || it.grams;
        const k = it.grams ? g / it.grams : 1;
        return { name: it.name, grams: g, source: 'Estimation IA', kcal: Math.round(it.kcal * k), p: +(it.p * k).toFixed(1), c: +(it.c * k).toFixed(1), f: +(it.f * k).toFixed(1), fib: +(it.fib * k).toFixed(1) };
      });
      addEntries(entries);
    };
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
    ({ scan: doScan, ai: () => doAi(), manual: doManual })[a]?.();
  };
  showHome();
}

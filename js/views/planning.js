// Vue « Planifier mes repas » : calendrier des repas prévus (distinct du Journal = repas mangés) + liste de
// courses générée automatiquement, groupée par magasin. Pas d'IA, pas d'API externe : le magasin d'un aliment
// est un champ que l'utilisateur renseigne lui-même une fois (voir js/shopping.js).
import { state, save, planDay, uid, today as todayIso } from '../store.js';
import { isoDate, parseDate } from '../science.js';
import { esc, fmt, fmtDate, nav, group, sheet, toast } from '../ui.js';
import { icon } from '../icons.js';
import { t, register } from '../i18n.js';
import { MEALS, openAddFood } from './addfood.js';
import { dateRange, aggregatePlan, regenerate, knownStores, byStore } from '../shopping.js';

register({
  en: {
    'Planifier mes repas': 'Plan my meals', 'Aucun repas prévu.': 'No meal planned yet.',
    'Liste de courses': 'Shopping list', 'Non classé': 'Unsorted', 'Ajouter un article': 'Add an item',
    'Nom de l\'article': 'Item name', 'Magasin': 'Store', 'Ex : Albert Heijn': 'E.g. Albert Heijn',
    'Régénérer depuis le planning (7 prochains jours)': 'Regenerate from plan (next 7 days)',
    'Rien dans la liste. Régénère depuis le planning ou ajoute un article.': 'Nothing in the list yet. Regenerate from the plan or add an item.',
    'Article ajouté': 'Item added', 'Supprimer': 'Delete', 'Enregistrer': 'Save',
  },
  nl: {
    'Planifier mes repas': 'Maaltijden plannen', 'Aucun repas prévu.': 'Nog geen maaltijd gepland.',
    'Liste de courses': 'Boodschappenlijst', 'Non classé': 'Niet gesorteerd', 'Ajouter un article': 'Artikel toevoegen',
    'Nom de l\'article': 'Naam artikel', 'Magasin': 'Winkel', 'Ex : Albert Heijn': 'Bijv. Albert Heijn',
    'Régénérer depuis le planning (7 prochains jours)': 'Opnieuw genereren vanuit plan (volgende 7 dagen)',
    'Rien dans la liste. Régénère depuis le planning ou ajoute un article.': 'Nog niets in de lijst. Genereer vanuit het plan of voeg een artikel toe.',
    'Article ajouté': 'Artikel toegevoegd', 'Supprimer': 'Verwijderen', 'Enregistrer': 'Opslaan',
  },
});

let date = null;

export function render(root, go) {
  if (!date) date = todayIso();
  const day = planDay(date);
  const keep = () => { const y = root.scrollTop; render(root, go); root.scrollTop = y; };

  const days = Array.from({ length: 7 }, (_, i) => { const d = parseDate(todayIso()); d.setDate(d.getDate() + i); return isoDate(d); });
  const strip = `<div class="pl-strip">${days.map((d) => `<button class="pl-day ${d === date ? 'on' : ''}" data-day="${d}">
      <span class="pl-dname">${esc(fmtDate(d, { weekday: 'short' }))}</span><span class="pl-dnum">${esc(fmtDate(d, { day: 'numeric' }))}</span></button>`).join('')}</div>`;

  const meals = Object.entries(MEALS).map(([k, label]) => {
    const items = day[k];
    return `<section class="td-card td-meal"><div class="td-mhead"><div class="grow"><b>${t(label)}</b></div>
        <button class="td-add" data-add="${k}" aria-label="${t('Ajouter')} — ${t(label)}">${icon('plus')}</button></div>
      ${items.length ? `<ul class="td-items">${items.map((m) => `<li class="td-item" data-item="${esc(m.id)}" data-meal="${k}" role="button" tabindex="0"><div class="grow"><span class="t">${esc(m.name)}</span>
        <span class="s num">${m.grams ? fmt(m.grams) + ' g' : ''}</span></div></li>`).join('')}</ul>` : `<p class="empty footnote pl-empty">${t('Aucun repas prévu.')}</p>`}
    </section>`;
  }).join('');

  root.innerHTML = `${nav(t('Planifier mes repas'), { left: `<button class="btn plain" data-back>${icon('chevronLeft')} ${t('Journal')}</button>` })}
    ${strip}
    <button class="btn filled wide pl-shop-btn" data-a="shop">${icon('copy')} ${t('Liste de courses')}</button>
    ${meals}`;

  root.onclick = (e) => {
    if (e.target.closest('[data-back]')) return go('today');
    const d = e.target.closest('[data-day]'); if (d) { date = d.dataset.day; return render(root, go); }
    if (e.target.closest('[data-a=shop]')) return openShoppingList();
    const add = e.target.closest('[data-add]'); if (add) return openAddFood(add.dataset.add, date, keep, { target: 'plan' });
    const item = e.target.closest('[data-item]'); if (item) return editPlanItem(day[item.dataset.meal], item.dataset.item, keep);
  };
}

// Feuille d'un repas prévu : changer la quantité ou le retirer du planning.
function editPlanItem(items, id, done) {
  const m = items.find((x) => x.id === id);
  if (!m) return;
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${esc(m.name)}</h3></div>
    ${m.grams ? group('', `<div class="cells"><label class="cell field"><span>${t('Quantité (g)')}</span><input name="g" type="number" inputmode="decimal" value="${m.grams}"></label></div>`) : ''}
    ${m.grams ? `<button class="btn filled large" data-a="save">${t('Enregistrer')}</button>` : ''}
    ${group('', `<div class="cells"><div class="cell action destructive" data-a="del" role="button">${t('Supprimer')}</div></div>`)}`, done);
  s.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'save') { const g = s.querySelector('[name=g]'); const k = (+g.value || 0) / m.grams; Object.assign(m, { grams: +g.value || m.grams, kcal: Math.round(m.kcal * k), p: +(m.p * k).toFixed(1), c: +(m.c * k).toFixed(1), f: +(m.f * k).toFixed(1), fib: +(m.fib * k).toFixed(1) }); save(); s.close(); }
    if (a === 'del') { items.splice(items.indexOf(m), 1); save(); s.close(); }
  });
}

// Feuille « Liste de courses » : groupée par magasin, coche persistée, article manuel, édition du magasin.
function openShoppingList() {
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Liste de courses')}</h3></div><div class="pl-shop"></div>`);
  const box = s.querySelector('.pl-shop');

  const itemRow = (it) => `<li class="cell"><button class="icon-btn round pl-check" data-check="${esc(it.id)}" aria-pressed="${it.checked}" aria-label="${esc(it.name)}">${icon('check')}</button>
      <div class="grow ${it.checked ? 'pl-done' : ''}"><span class="t">${esc(it.name)}</span>${it.grams ? `<span class="s num">${fmt(it.grams)} g</span>` : ''}</div>
      <button class="btn plain" data-store="${esc(it.id)}">${esc(it.store || t('Magasin'))}</button></li>`;
  const storeGroup = ([store, items]) => group(esc(store || t('Non classé')), `<ul class="cells">${items.map(itemRow).join('')}</ul>`);
  const actions = `<div class="pl-shop-actions">
      <button class="btn large" data-a="regen">${icon('arrowDown')} ${t('Régénérer depuis le planning (7 prochains jours)')}</button>
      <button class="btn large" data-a="add">${icon('plus')} ${t('Ajouter un article')}</button></div>`;

  const draw = () => {
    const body = state.shoppingList.length
      ? byStore(state.shoppingList).map(storeGroup).join('')
      : `<p class="empty footnote">${t('Rien dans la liste. Régénère depuis le planning ou ajoute un article.')}</p>`;
    box.innerHTML = body + actions;
  };
  draw();

  box.onclick = (e) => {
    const chk = e.target.closest('[data-check]');
    if (chk) { const it = state.shoppingList.find((x) => x.id === chk.dataset.check); it.checked = !it.checked; save(); return draw(); }
    const st = e.target.closest('[data-store]');
    if (st) return editStore(state.shoppingList.find((x) => x.id === st.dataset.store), draw);
    if (e.target.closest('[data-a=regen]')) {
      const dates = dateRange(todayIso(), 7);
      const agg = aggregatePlan(state.mealPlan, dates);
      state.shoppingList = regenerate(state.shoppingList, agg, state.foods);
      save(); return draw();
    }
    if (e.target.closest('[data-a=add]')) return addManualItem(draw);
  };
}

// Feuille : nom du magasin pour un article (texte libre, datalist des magasins déjà utilisés pour rester cohérent).
function editStore(item, redraw) {
  if (!item) return;
  const stores = knownStores(state.foods);
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${esc(item.name)}</h3></div>
    ${group('', `<div class="cells"><label class="cell field"><span>${t('Magasin')}</span>
      <input name="store" list="pl-stores" value="${esc(item.store || '')}" placeholder="${t('Ex : Albert Heijn')}"></label></div>`)}
    <datalist id="pl-stores">${stores.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
    <button class="btn filled large" data-a="save">${t('Enregistrer')}</button>`, () => redraw());
  s.querySelector('[data-a=save]').onclick = () => {
    const v = s.querySelector('[name=store]').value.trim();
    item.store = v;
    if (item.foodId && state.foods[item.foodId]) state.foods[item.foodId].store = v; // réutilisé la prochaine fois
    save(); s.close();
  };
}

// Feuille : article ajouté à la main (pas lié à un aliment du catalogue, ex. « papier toilette »).
function addManualItem(redraw) {
  const stores = knownStores(state.foods);
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Ajouter un article')}</h3></div>
    ${group('', `<div class="cells">
      <label class="cell field"><span>${t("Nom de l'article")}</span><input name="name" required></label>
      <label class="cell field"><span>${t('Magasin')}</span><input name="store" list="pl-stores" placeholder="${t('Ex : Albert Heijn')}"></label></div>`)}
    <datalist id="pl-stores">${stores.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
    <button class="btn filled large" data-a="add">${t('Ajouter')}</button>`, () => redraw());
  s.querySelector('[data-a=add]').onclick = () => {
    const name = s.querySelector('[name=name]').value.trim();
    if (!name) return;
    const store = s.querySelector('[name=store]').value.trim();
    state.shoppingList.push({ id: uid(), foodId: null, name, grams: 0, store, checked: false, auto: false });
    save(); toast(t('Article ajouté')); s.close();
  };
}

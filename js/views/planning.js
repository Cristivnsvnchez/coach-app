// Vue « Planifier mes repas » : calendrier des repas prévus (distinct du Journal = repas mangés) + liste de
// courses générée automatiquement, groupée par magasin. Pas d'IA, pas d'API externe : le magasin d'un aliment
// est un champ que l'utilisateur renseigne lui-même une fois (voir js/shopping.js).
import { state, save, planDay, uid, today as todayIso } from '../store.js';
import { isoDate, parseDate } from '../science.js';
import { esc, fmt, fmtDate, nav, group, sheet, toast } from '../ui.js';
import { icon } from '../icons.js';
import { t, register } from '../i18n.js';
import { MEALS, openAddFood } from './addfood.js';
import { regenerate, knownStores, byStore, listToText, tripFor, tripDates, assignTrips, aggregateTrip, visibleTrips, tripDay, tripMealDates, remapShopDay } from '../shopping.js';

register({
  en: {
    'Planifier mes repas': 'Plan my meals', 'Aucun repas prévu.': 'No meal planned yet.',
    'Liste de courses': 'Shopping list', 'Non classé': 'Unsorted', 'Ajouter un article': 'Add an item',
    'Nom de l\'article': 'Item name', 'Magasin': 'Store', 'Ex : Albert Heijn': 'E.g. Albert Heijn',
    'Rien à acheter pour cette semaine. Planifie des repas ou ajoute un article.': 'Nothing to buy for this week. Plan meals or add an item.',
    'Jour des courses': 'Shopping day', 'Courses du {d}': 'Shopping on {d}', 'pour les repas du {a} au {b}': 'for meals from {a} to {b}',
    'Article libre': 'Other item', 'Quantité (g, facultatif)': 'Quantity (g, optional)',
    "Courses d'aujourd'hui": "Today's shopping", 'pour les repas du {a}': 'for meals on {a}', "Ajoute ce que tu achètes aujourd'hui, ou planifie des repas.": "Add what you're buying today, or plan meals.",
    'pas encore marquée faite': 'not marked as done yet', 'Courses faites': 'Shopping done', 'Courses faites ✓': 'Shopping done ✓',
    'Article ajouté': 'Item added', 'Supprimer': 'Delete', 'Enregistrer': 'Save',
    'Partager la liste': 'Share the list', 'Liste copiée': 'List copied', 'Tout est acheté.': 'Everything is bought.',
    'Article supprimé': 'Item removed', 'Retiré du planning': 'Removed from plan',
  },
  nl: {
    'Planifier mes repas': 'Maaltijden plannen', 'Aucun repas prévu.': 'Nog geen maaltijd gepland.',
    'Liste de courses': 'Boodschappenlijst', 'Non classé': 'Niet gesorteerd', 'Ajouter un article': 'Artikel toevoegen',
    'Nom de l\'article': 'Naam artikel', 'Magasin': 'Winkel', 'Ex : Albert Heijn': 'Bijv. Albert Heijn',
    'Rien à acheter pour cette semaine. Planifie des repas ou ajoute un article.': 'Niets te kopen voor deze week. Plan maaltijden of voeg een artikel toe.',
    'Jour des courses': 'Boodschappendag', 'Courses du {d}': 'Boodschappen op {d}', 'pour les repas du {a} au {b}': 'voor maaltijden van {a} tot {b}',
    'Article libre': 'Ander artikel', 'Quantité (g, facultatif)': 'Hoeveelheid (g, optioneel)',
    "Courses d'aujourd'hui": 'Boodschappen van vandaag', 'pour les repas du {a}': 'voor maaltijden op {a}', "Ajoute ce que tu achètes aujourd'hui, ou planifie des repas.": 'Voeg toe wat je vandaag koopt, of plan maaltijden.',
    'pas encore marquée faite': 'nog niet als gedaan gemarkeerd', 'Courses faites': 'Boodschappen gedaan', 'Courses faites ✓': 'Boodschappen gedaan ✓',
    'Article ajouté': 'Artikel toegevoegd', 'Supprimer': 'Verwijderen', 'Enregistrer': 'Opslaan',
    'Partager la liste': 'Lijst delen', 'Liste copiée': 'Lijst gekopieerd', 'Tout est acheté.': 'Alles is gekocht.',
    'Article supprimé': 'Artikel verwijderd', 'Retiré du planning': 'Uit planning verwijderd',
  },
});

let date = null;

export function render(root, go) {
  if (!date || date < todayIso()) date = todayIso(); // le lendemain, on revient à aujourd'hui (jours passés absents du bandeau)
  const day = planDay(date);
  const keep = () => { const y = root.scrollTop; render(root, go); root.scrollTop = y; };

  const days = Array.from({ length: 14 }, (_, i) => { const d = parseDate(todayIso()); d.setDate(d.getDate() + i); return isoDate(d); });
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
    if (a === 'save') { const g = s.querySelector('[name=g]'); if (!((+g.value || 0) > 0)) return toast(t('Quantité supérieure à 0, ou touche Supprimer')); const k = +g.value / m.grams; Object.assign(m, { grams: +g.value, kcal: Math.round(m.kcal * k), p: +(m.p * k).toFixed(1), c: +(m.c * k).toFixed(1), f: +(m.f * k).toFixed(1), fib: +(m.fib * k).toFixed(1) }); save(); s.close(); }
    if (a === 'del') {
      const k = items.indexOf(m); items.splice(k, 1); save(); s.close();
      toast(t('Retiré du planning'), { undo: () => { items.splice(k, 0, m); save(); done(); } });
    }
  });
}

// Grandes enseignes belges proposées dans le champ magasin (texte libre : n'importe quel magasin marche).
const BE_STORES = ['Albert Heijn', 'Aldi', 'Carrefour', 'Colruyt', 'Delhaize', 'Intermarché', 'Lidl', 'Okay', 'Spar'];
const storeOptions = () => [...new Set([...knownStores(state.foods), ...BE_STORES])];

// Feuille « Liste de courses » : une liste par sortie courses (par défaut le samedi avant la semaine des repas),
// synchronisée avec le planning à chaque ouverture/modification. Groupée par magasin, coche persistée.
let trip = null;
function openShoppingList() {
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Liste de courses')}</h3></div><div class="pl-shop"></div>`);
  const box = s.querySelector('.pl-shop');
  const shopDay = () => state.settings.shopDay ?? 6;
  const done = () => state.shoppingDone;
  const now = todayIso();
  // Anciens articles sans liste : rattachés à la liste du jour.
  for (const it of state.shoppingList) if (!it.trip) it.trip = now;

  // Rattache les nouveaux repas prévus (liste du jour ou sortie régulière), puis met à jour les listes ouvertes.
  // Les listes faites sont figées : on n'y touche plus.
  const sync = () => {
    assignTrips(state.mealPlan, now, shopDay(), done());
    for (const tr of visibleTrips(now, shopDay(), state.shoppingList, state.mealPlan, done())) {
      state.shoppingList = regenerate(state.shoppingList, aggregateTrip(state.mealPlan, tr), state.foods, tr);
    }
    save();
  };

  const itemRow = (it) => `<li class="cell"><button class="icon-btn round pl-check" data-check="${esc(it.id)}" aria-pressed="${it.checked}" aria-label="${esc(it.name)}">${icon('check')}</button>
      <div class="grow ${it.checked ? 'pl-done' : ''}"><span class="t">${esc(it.name)}</span>${it.grams ? `<span class="s num">${fmt(it.grams)} g</span>` : ''}</div>
      <button class="btn plain" data-store="${esc(it.id)}">${esc(it.store || t('Magasin'))}</button></li>`;
  const storeGroup = ([store, items]) => group(esc(store || t('Non classé')), `<ul class="cells">${items.map(itemRow).join('')}</ul>`);
  const dayNames = Array.from({ length: 7 }, (_, i) => fmtDate(isoDate(new Date(2026, 10, 1 + i, 12)), { weekday: 'long' })); // 1er nov. 2026 = dimanche
  const nth = (id) => (id.includes('~') ? ` (${id.split('~')[1]})` : '');
  const tabLabel = (id) => (tripDay(id) === now ? t("Aujourd'hui") : fmtDate(tripDay(id), { weekday: 'short', day: 'numeric', month: 'short' })) + nth(id);
  const short = (d) => fmtDate(d, { day: 'numeric', month: 'short' });

  const info = (id) => {
    const d = tripDay(id), meals = tripMealDates(state.mealPlan, id);
    const title = d === now ? t("Courses d'aujourd'hui") + nth(id) : t('Courses du {d}', { d: fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' }) }) + nth(id);
    let sub;
    if (meals.length) sub = meals.length > 1 ? t('pour les repas du {a} au {b}', { a: short(meals[0]), b: short(meals[meals.length - 1]) }) : t('pour les repas du {a}', { a: short(meals[0]) });
    else if (d > now && !id.includes('~')) { const w = tripDates(id, shopDay()); sub = t('pour les repas du {a} au {b}', { a: short(w[0]), b: short(w[6]) }); }
    else sub = t("Ajoute ce que tu achètes aujourd'hui, ou planifie des repas.");
    if (d < now) sub += ' · ' + t('pas encore marquée faite');
    return `<b>${esc(title)}</b><br>${esc(sub)}`;
  };

  const draw = () => {
    sync();
    const trips = visibleTrips(now, shopDay(), state.shoppingList, state.mealPlan, done());
    if (!trips.includes(trip)) trip = trips.find((x) => tripDay(x) >= now) || trips[0];
    const items = state.shoppingList.filter((x) => x.trip === trip && !x.removed);
    box.innerHTML = `<label class="pl-shopday">${t('Jour des courses')}
        <select name="shopDay">${dayNames.map((n, i) => `<option value="${i}" ${i === shopDay() ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <div class="chips pl-trips">${trips.map((tr) => `<button class="chip ${tr === trip ? 'on' : ''}" data-trip="${tr}" aria-pressed="${tr === trip}">${esc(tabLabel(tr))}</button>`).join('')}</div>
      <p class="footnote pl-trip-info">${info(trip)}</p>
      ${items.length ? byStore(items).map(storeGroup).join('') : `<p class="empty footnote">${t('Rien à acheter pour cette semaine. Planifie des repas ou ajoute un article.')}</p>`}
      <div class="pl-shop-actions">
        <button class="btn large" data-a="add">${icon('plus')} ${t('Ajouter un article')}</button>
        ${items.length ? `<button class="btn large" data-a="share">${icon('share')} ${t('Partager la liste')}</button>
        <button class="btn filled large" data-a="done">${icon('check')} ${t('Courses faites')}</button>` : ''}</div>`;
  };
  draw();

  box.onchange = (e) => {
    if (e.target.name !== 'shopDay') return;
    const from = shopDay(), to = +e.target.value;
    remapShopDay(state.mealPlan, state.shoppingList, from, to, now, done());
    trip = null; state.settings.shopDay = to; save(); draw();
  };
  box.onclick = (e) => {
    const tb = e.target.closest('[data-trip]'); if (tb) { trip = tb.dataset.trip; return draw(); }
    const chk = e.target.closest('[data-check]');
    if (chk) { const it = state.shoppingList.find((x) => x.id === chk.dataset.check); it.checked = !it.checked; save(); return draw(); }
    const st = e.target.closest('[data-store]');
    if (st) return editItem(state.shoppingList.find((x) => x.id === st.dataset.store), draw);
    if (e.target.closest('[data-a=share]')) return shareList(state.shoppingList.filter((x) => x.trip === trip));
    if (e.target.closest('[data-a=add]')) return addItem(trip, draw);
    if (e.target.closest('[data-a=done]')) {
      // Liste figée et masquée ; ce qui est planifié ensuite part dans une nouvelle liste.
      const id = trip; state.shoppingDone.push(id); trip = null; save(); draw();
      toast(t('Courses faites ✓'), { undo: () => { state.shoppingDone = state.shoppingDone.filter((x) => x !== id); trip = id; save(); draw(); } });
    }
  };
}

// Ajout d'un article : même recherche que pour un repas (aliments courants, mes aliments, Open Food Facts,
// code-barres) ; la puce « Article libre » garde la saisie texte pour le non-alimentaire (papier toilette…).
function addItem(tr, redraw) {
  openAddFood(null, tr, redraw, {
    title: t('Ajouter un article'),
    extra: { label: t('Article libre'), run: () => addManualItem(tr, redraw) },
    pick: (entries) => {
      for (const en of entries) {
        state.shoppingList.push({ id: uid(), foodId: en.foodId || null, name: en.name, grams: en.grams || 0, store: (en.foodId && state.foods[en.foodId]?.store) || '', checked: false, auto: false, trip: tr });
      }
      save(); toast(t('Article ajouté'));
    },
  });
}

// Partage la liste (ce qui reste à acheter) en texte : feuille de partage iOS, sinon presse-papiers.
async function shareList(list) {
  const text = listToText(list, { title: t('Liste de courses'), unsorted: t('Non classé') });
  if (!text) return toast(t('Tout est acheté.'));
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e?.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); toast(t('Liste copiée')); } catch {}
}

// Feuille d'un article : magasin (datalist des magasins déjà utilisés), nom si ajouté à la main, suppression.
// Un article auto supprimé est masqué (pas effacé) : il ne revient pas tant que le planning ne change pas d'aliment.
function editItem(item, redraw) {
  if (!item) return;
  const stores = storeOptions();
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${esc(item.name)}</h3></div>
    ${group('', `<div class="cells">
      ${item.auto ? '' : `<label class="cell field"><span>${t("Nom de l'article")}</span><input name="name" value="${esc(item.name)}"></label>`}
      <label class="cell field"><span>${t('Magasin')}</span>
      <input name="store" list="pl-stores" value="${esc(item.store || '')}" placeholder="${t('Ex : Albert Heijn')}"></label></div>`)}
    <datalist id="pl-stores">${stores.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
    <button class="btn filled large" data-a="save">${t('Enregistrer')}</button>
    ${group('', `<div class="cells"><div class="cell action destructive" data-a="del" role="button">${t('Supprimer')}</div></div>`)}`, () => redraw());
  s.querySelector('[data-a=save]').onclick = () => {
    const v = s.querySelector('[name=store]').value.trim();
    const name = s.querySelector('[name=name]')?.value.trim();
    if (name) item.name = name;
    item.store = v;
    if (item.foodId && state.foods[item.foodId]) state.foods[item.foodId].store = v; // réutilisé la prochaine fois
    save(); s.close();
  };
  s.querySelector('[data-a=del]').onclick = () => {
    const k = state.shoppingList.indexOf(item);
    if (item.auto) item.removed = true; // sinon il reviendrait à la prochaine synchro avec le planning
    else state.shoppingList.splice(k, 1);
    save(); s.close();
    toast(t('Article supprimé'), { undo: () => { if (item.auto) delete item.removed; else state.shoppingList.splice(k, 0, item); save(); redraw(); } });
  };
}

// Feuille : article libre (pas lié à un aliment du catalogue, ex. « papier toilette »).
function addManualItem(tr, redraw) {
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Article libre')}</h3></div>
    ${group('', `<div class="cells">
      <label class="cell field"><span>${t("Nom de l'article")}</span><input name="name" required></label>
      <label class="cell field"><span>${t('Quantité (g, facultatif)')}</span><input name="g" type="number" inputmode="decimal"></label>
      <label class="cell field"><span>${t('Magasin')}</span><input name="store" list="pl-stores" placeholder="${t('Ex : Albert Heijn')}"></label></div>`)}
    <datalist id="pl-stores">${storeOptions().map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
    <button class="btn filled large" data-a="add">${t('Ajouter')}</button>`, () => redraw());
  s.querySelector('[data-a=add]').onclick = () => {
    const name = s.querySelector('[name=name]').value.trim();
    if (!name) return;
    const store = s.querySelector('[name=store]').value.trim();
    state.shoppingList.push({ id: uid(), foodId: null, name, grams: +s.querySelector('[name=g]').value || 0, store, checked: false, auto: false, trip: tr });
    save(); toast(t('Article ajouté')); s.close();
  };
}

// Liste de courses (pure, testée sous Node) : agrège les repas prévus (mealPlan) sur une période,
// groupés par aliment puis par magasin. Pas d'API externe : le magasin est un champ que l'utilisateur
// renseigne lui-même sur l'aliment (state.foods[id].store), réutilisé d'une liste à l'autre.
import { isoDate, parseDate } from './science.js';

// N jours consécutifs à partir de `start` (inclus), au format 'YYYY-MM-DD'.
export function dateRange(start, days = 7) {
  const d = parseDate(start), out = [];
  for (let i = 0; i < days; i++) { out.push(isoDate(d)); d.setDate(d.getDate() + 1); }
  return out;
}

// Somme les grammes par aliment (clé = foodId, ou le nom si jamais absent) sur les jours donnés.
export function aggregatePlan(mealPlan, dates) {
  const byFood = {};
  for (const d of dates) {
    const day = mealPlan[d]; if (!day) continue;
    for (const items of Object.values(day)) {
      for (const it of items) {
        const key = it.foodId || it.name;
        if (!byFood[key]) byFood[key] = { foodId: it.foodId || null, name: it.name, grams: 0 };
        byFood[key].grams += Number(it.grams) || 0;
      }
    }
  }
  return Object.values(byFood);
}

// Reconstruit la liste : garde les articles ajoutés à la main (non auto) et leur coche, régénère les
// articles automatiques depuis l'agrégation (coche conservée si l'article existait déjà, magasin repris
// de l'aliment sinon de l'article précédent).
export function regenerate(list, aggregated, foods) {
  const manual = list.filter((x) => !x.auto);
  const prevByKey = Object.fromEntries(list.filter((x) => x.auto).map((x) => [x.foodId || x.name, x]));
  const auto = aggregated.map((a) => {
    const key = a.foodId || a.name;
    const prev = prevByKey[key];
    const store = (a.foodId && foods[a.foodId]?.store) || prev?.store || '';
    return { id: prev?.id || key, foodId: a.foodId, name: a.name, grams: Math.round(a.grams), store, checked: prev?.checked || false, auto: true };
  });
  return [...manual, ...auto];
}

// Magasins déjà utilisés sur des aliments, pour proposer une saisie cohérente (pas de vraie source externe).
export function knownStores(foods) {
  return [...new Set(Object.values(foods).map((f) => f.store).filter(Boolean))].sort();
}

// Groupe une liste de courses par magasin (clé '' = non classé, mise en dernier).
export function byStore(list) {
  const groups = {};
  for (const it of list) (groups[it.store || ''] ||= []).push(it);
  return Object.entries(groups).sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)));
}

// Texte à partager (message, notes) : seulement ce qui reste à acheter (non coché), groupé par magasin.
// Libellés passés en paramètre pour garder ce module pur (pas d'i18n ici). '' si rien à acheter.
export function listToText(list, { title = '', unsorted = '' } = {}) {
  const groups = byStore(list.filter((x) => !x.checked));
  if (!groups.length) return '';
  const blocks = groups.map(([store, items]) =>
    [store || unsorted, ...items.map((it) => `- ${it.name}${it.grams ? ` (${it.grams} g)` : ''}`)].filter(Boolean).join('\n'));
  return [title, ...blocks].filter(Boolean).join('\n\n');
}

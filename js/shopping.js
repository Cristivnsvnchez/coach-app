// Liste de courses (pure, testée sous Node) : agrège les repas prévus (mealPlan) sur une période,
// groupés par aliment puis par magasin. Pas d'API externe : le magasin est un champ que l'utilisateur
// renseigne lui-même sur l'aliment (state.foods[id].store), réutilisé d'une liste à l'autre.
import { isoDate, parseDate } from './science.js';
import { BASE_FOODS } from './foods-base.js';

// Rayons, dans l'ordre d'un magasin (les libellés sont traduits dans la vue).
export const AISLES = ['fruits', 'viandes', 'cremerie', 'boulangerie', 'sale', 'sucre', 'boissons', 'autre'];
const BASE_AISLE = Object.fromEntries(BASE_FOODS.map((f) => [f.id, f.aisle]));
// Rayon d'un article : choix fait sur l'article, sinon celui de l'aliment, sinon celui de la base, sinon « autre ».
export function aisleOf(item, foods = {}) {
  const a = item.aisle || (item.foodId && (foods[item.foodId]?.aisle || BASE_AISLE[item.foodId]));
  return AISLES.includes(a) ? a : 'autre';
}
// Groupe les articles d'un magasin par rayon, dans l'ordre de AISLES : [[rayon, articles]].
export function byAisle(items, foods = {}) {
  const g = {};
  for (const it of items) (g[aisleOf(it, foods)] ||= []).push(it);
  return AISLES.filter((a) => g[a]).map((a) => [a, g[a]]);
}

// N jours consécutifs à partir de `start` (inclus), au format 'YYYY-MM-DD'.
export function dateRange(start, days = 7) {
  const d = parseDate(start), out = [];
  for (let i = 0; i < days; i++) { out.push(isoDate(d)); d.setDate(d.getDate() + 1); }
  return out;
}

// Reconstruit la liste d'une sortie courses (`trip`, date 'YYYY-MM-DD' ; sans trip = toute la liste) :
// garde les articles manuels et leur coche, régénère les articles auto depuis l'agrégation (coche et
// suppression conservées si l'article existait déjà, magasin repris de l'aliment sinon de l'article précédent).
// Les articles des autres sorties passent tels quels.
export function regenerate(list, aggregated, foods, trip) {
  const mine = (x) => trip === undefined || x.trip === trip;
  const others = list.filter((x) => !mine(x));
  const manual = list.filter((x) => mine(x) && !x.auto);
  const prevByKey = Object.fromEntries(list.filter((x) => mine(x) && x.auto).map((x) => [x.foodId || x.name, x]));
  const auto = aggregated.map((a) => {
    const key = a.foodId || a.name;
    const prev = prevByKey[key];
    const store = (a.foodId && foods[a.foodId]?.store) || prev?.store || '';
    const it = { id: prev?.id || (trip ? `${trip}:${key}` : key), foodId: a.foodId, name: a.name, grams: Math.round(a.grams), store, checked: prev?.checked || false, auto: true };
    if (trip) it.trip = trip;
    if (prev?.removed) it.removed = true;
    return it;
  });
  return [...others, ...manual, ...auto];
}

// Sortie courses d'un repas : le dernier `shopDay` (0 = dimanche … 6 = samedi) avant le lundi de sa semaine
// (le lundi lui-même si on fait les courses le lundi). Ex. samedi : repas du lun. 9 au dim. 15 → courses du sam. 7.
export function tripFor(date, shopDay = 6) {
  const d = parseDate(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lundi de la semaine
  d.setDate(d.getDate() - ((1 - shopDay + 7) % 7));
  return isoDate(d);
}

// Les 7 jours (lun → dim) couverts par une sortie courses.
export function tripDates(trip, shopDay = 6) {
  const d = parseDate(trip);
  d.setDate(d.getDate() + ((1 - shopDay + 7) % 7));
  return dateRange(isoDate(d), 7);
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
  const groups = byStore(list.filter((x) => !x.checked && !x.removed));
  if (!groups.length) return '';
  const blocks = groups.map(([store, items]) =>
    [store || unsorted, ...items.map((it) => `- ${it.name}${it.grams ? ` (${it.grams} g)` : ''}`)].filter(Boolean).join('\n'));
  return [title, ...blocks].filter(Boolean).join('\n\n');
}

// ---- Listes de courses réelles : tous les cas d'usage ----
// Une liste = une sortie courses, identifiée par sa date ('YYYY-MM-DD'), ou 'YYYY-MM-DD~2' pour une 2e liste le même
// jour (courses déjà faites ce jour-là). Chaque repas prévu est rattaché UNE fois à une liste (entry.trip), puis n'en
// bouge plus : un repas acheté samedi reste sur la liste du samedi même quand samedi est passé.

// Date d'une liste (sans le suffixe ~2).
export const tripDay = (id) => String(id).slice(0, 10);

// Liste du jour : aujourd'hui, ou une 2e/3e liste si celle du jour est déjà faite.
export function todayTrip(today, closed = []) {
  let id = today, n = 2;
  while (closed.includes(id)) id = `${today}~${n++}`;
  return id;
}

// Prochaine sortie courses régulière (jour choisi) encore ouverte, à partir d'aujourd'hui.
export function nextScheduled(today, shopDay = 6, closed = []) {
  let d = parseDate(tripFor(today, shopDay));
  while (isoDate(d) < today || closed.includes(isoDate(d))) d.setDate(d.getDate() + 7);
  return isoDate(d);
}

// Rattache chaque repas prévu (aujourd'hui ou plus tard) pas encore rattaché :
// - à la sortie régulière d'avant sa semaine si elle est encore à venir et pas faite (ex. repas de mardi prochain → samedi) ;
// - sinon à la liste du jour (repas d'aujourd'hui, de cette semaine après le samedi, ou ajouté après les courses).
// Les repas passés ne vont sur aucune liste. Modifie mealPlan en place.
export function assignTrips(mealPlan, today, shopDay = 6, closed = []) {
  for (const [d, dayPlan] of Object.entries(mealPlan)) {
    if (d < today) continue;
    for (const items of Object.values(dayPlan)) {
      for (const it of items) {
        if (it.trip) continue;
        const sched = tripFor(d, shopDay);
        it.trip = sched >= today && !closed.includes(sched) ? sched : todayTrip(today, closed);
      }
    }
  }
}

// Grammes par aliment des repas rattachés à une liste.
export function aggregateTrip(mealPlan, trip) {
  const byFood = {};
  for (const dayPlan of Object.values(mealPlan)) {
    for (const items of Object.values(dayPlan)) {
      for (const it of items) {
        if (it.trip !== trip) continue;
        const key = it.foodId || it.name;
        if (!byFood[key]) byFood[key] = { foodId: it.foodId || null, name: it.name, grams: 0 };
        byFood[key].grams += Number(it.grams) || 0;
      }
    }
  }
  return Object.values(byFood);
}

// Dates des repas rattachés à une liste (pour « pour les repas du … au … »).
export function tripMealDates(mealPlan, trip) {
  return Object.entries(mealPlan).filter(([, p]) => Object.values(p).some((items) => items.some((it) => it.trip === trip))).map(([d]) => d).sort();
}

// Listes à afficher : liste du jour, prochaine sortie régulière, toute liste à venir qui a des repas ou des articles,
// et les listes passées pas marquées faites qui ont encore des articles à acheter (rien ne se perd). Listes faites masquées.
export function visibleTrips(today, shopDay = 6, list = [], mealPlan = {}, closed = []) {
  const set = new Set([todayTrip(today, closed), nextScheduled(today, shopDay, closed)]);
  for (const p of Object.values(mealPlan)) for (const items of Object.values(p)) for (const it of items) {
    if (it.trip && tripDay(it.trip) >= today && !closed.includes(it.trip)) set.add(it.trip);
  }
  for (const it of list) {
    if (!it.trip || closed.includes(it.trip) || it.removed) continue;
    if (tripDay(it.trip) >= today || !it.checked) set.add(it.trip);
  }
  return [...set].sort();
}

// Changement du jour des courses : les sorties régulières à venir (pas faites) passent au nouveau jour, pour la même
// semaine de repas (ou à la liste du jour si le nouveau jour est déjà passé). Liste du jour et listes passées : inchangées.
export function remapShopDay(mealPlan, list, from, to, today, closed = []) {
  const map = (id) => {
    if (!id || id.includes('~') || id <= today || closed.includes(id) || parseDate(id).getDay() !== from) return id;
    const n = tripFor(tripDates(id, from)[0], to);
    return n >= today && !closed.includes(n) ? n : todayTrip(today, closed);
  };
  for (const p of Object.values(mealPlan)) for (const items of Object.values(p)) for (const it of items) it.trip = map(it.trip);
  for (const it of list) it.trip = map(it.trip);
}

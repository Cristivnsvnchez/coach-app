// Repères ANSES (pur, testé sous Node) : portions de fruits & légumes (5/jour) et de poisson (2/semaine).
// Stockage : fg['YYYY-MM-DD'] = { fruitVeg: n, fish: n }.
export const GOALS = { fruitVeg: 5, fish: 2 };

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const shiftDay = (date, n) => { const d = parse(date); d.setDate(d.getDate() + n); return iso(d); };

export const getPortions = (fg, date, key) => Math.max(0, +fg?.[date]?.[key] || 0);

// Ajoute (ou retire, delta < 0) des portions, jamais en dessous de 0. Modifie fg et renvoie la nouvelle valeur.
export function addPortion(fg, date, key, delta = 1) {
  const day = (fg[date] ||= { fruitVeg: 0, fish: 0 });
  day[key] = Math.max(0, getPortions(fg, date, key) + delta);
  return day[key];
}

// Les 7 jours de la semaine (lundi → dimanche) contenant `date`.
export function weekDates(date) {
  const back = (parse(date).getDay() + 6) % 7;
  const mon = shiftDay(date, -back);
  return Array.from({ length: 7 }, (_, i) => shiftDay(mon, i));
}

export const weekTotal = (fg, date, key) => weekDates(date).reduce((a, d) => a + getPortions(fg, d, key), 0);

// Moyenne quotidienne sur les 7 jours se terminant à `date` (arrondie à 0,1).
export function avg7(fg, date, key) {
  let s = 0;
  for (let i = 0; i < 7; i++) s += getPortions(fg, shiftDay(date, -i), key);
  return Math.round((s / 7) * 10) / 10;
}

// Bilan de l'année (pur, testé sous Node) : grille des 53 dernières semaines (lundi → dimanche),
// intensité par jour d'après les séries de travail faites, et chiffres clés de la période.
import { isoDate, parseDate } from './science.js';

const DAY = 86400000;
const addDays = (iso, n) => isoDate(new Date(parseDate(iso).getTime() + n * DAY));
const mondayOf = (iso) => addDays(iso, -((parseDate(iso).getDay() + 6) % 7));

// Séries de travail faites dans une séance (les échauffements ne comptent pas).
const workSets = (w) => (w.exercises || []).reduce((n, ex) => n + (ex.sets || []).filter((s) => s.done !== false && s.type !== 'warmup').length, 0);

// Niveau d'un jour : 0 rien, 1 séance légère (< 10 séries), 2 séance (10–19), 3 grosse séance (≥ 20).
export const level = (sets) => (sets <= 0 ? 0 : sets < 10 ? 1 : sets < 20 ? 2 : 3);

// weeks : 53 colonnes de 7 jours { date, sets, level, future } ; stats sur les 365 derniers jours.
export function yearReview(workouts, today) {
  const start = mondayOf(addDays(today, -52 * 7));
  const from = addDays(today, -364);
  const byDay = new Map();
  for (const w of workouts || []) if (w?.date >= start && w.date <= today) byDay.set(w.date, (byDay.get(w.date) || 0) + Math.max(1, workSets(w)));
  const weeks = [];
  for (let k = 0; k < 53; k++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, k * 7 + d), sets = byDay.get(date) || 0;
      days.push({ date, sets, level: level(sets), future: date > today });
    }
    weeks.push(days);
  }
  const inYear = (workouts || []).filter((w) => w?.date >= from && w.date <= today);
  const activeWeeks = weeks.map((wk) => wk.some((d) => d.sets > 0 && d.date >= from));
  let best = 0, run = 0;
  for (const a of activeWeeks) { run = a ? run + 1 : 0; best = Math.max(best, run); }
  return { weeks, sessions: inYear.length, activeDays: new Set(inYear.map((w) => w.date)).size,
    activeWeeks: activeWeeks.filter(Boolean).length, bestStreak: best, sets: inYear.reduce((n, w) => n + workSets(w), 0) };
}

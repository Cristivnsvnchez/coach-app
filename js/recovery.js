// Récupération musculaire et correction d'une séance enregistrée. Fonctions pures (testées sous Node).
// Repères : un muscle travaillé dur récupère en 48–72 h ; viser chaque muscle ≥ 2 fois par semaine (Schoenfeld 2016).
import { MUSCLES, parseDate } from './science.js';
import { workoutVolume } from './workout.js';

const valid = (s) => s && s.done && s.type !== 'warmup' && (Number(s.reps) || 0) > 0;
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);

// État de chaque muscle à la date `today` :
// - 'recup'     : travaillé il y a moins de 48 h (plus d'une série de travail, secondaires comptées à moitié) ;
// - 'pret'      : travaillé depuis 7 jours au plus, récupéré ;
// - 'reprendre' : rien depuis plus de 7 jours (ou jamais).
// `days` = jours depuis la dernière séance qui l'a travaillé (null si jamais).
export function recoveryMap(workouts, today, lookup = () => null) {
  const last = {}, recent = {};
  for (const w of workouts) {
    const d = daysBetween(w.date, today);
    if (d < 0) continue;
    for (const ex of w.exercises || []) {
      const n = (ex.sets || []).filter(valid).length;
      if (!n) continue;
      const info = lookup(ex.name) || {};
      const parts = [[ex.muscle || info.muscle, n], ...(ex.secondary || info.secondary || []).map((m) => [m, n * 0.5])];
      for (const [m, k] of parts) {
        if (!m) continue;
        if (last[m] === undefined || d < last[m]) last[m] = d;
        if (d < 2) recent[m] = (recent[m] || 0) + k;
      }
    }
  }
  const out = {};
  for (const m of new Set([...MUSCLES, ...Object.keys(last)])) {
    const days = last[m] ?? null;
    const status = days === null || days > 7 ? 'reprendre' : days < 2 && (recent[m] || 0) > 1 ? 'recup' : 'pret';
    out[m] = { status, days };
  }
  return out;
}

// Séance enregistrée corrigée : nom, date (pas dans le futur), séries sans répétition retirées, volume recalculé.
// Renvoie null si la date est invalide ou s'il ne reste aucune série.
export function editedWorkout(w, { name, date } = {}, today, bw = 0) {
  const d = date || w.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > today) return null;
  const exercises = (w.exercises || [])
    .map((ex) => ({ ...ex, sets: (ex.sets || []).filter((s) => (Number(s.reps) || 0) > 0).map((s) => ({ ...s, kg: Number(s.kg) || 0, reps: Number(s.reps), done: true })) }))
    .filter((ex) => ex.sets.length);
  if (!exercises.length) return null;
  const nm = String(name ?? w.name ?? '').trim() || w.name || 'Séance';
  const out = { ...w, name: nm, dayName: nm, date: d, exercises };
  out.volume = Math.round(workoutVolume(out, bw));
  return out;
}

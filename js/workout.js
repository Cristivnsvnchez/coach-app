// Logique des séances (pure, testée sous Node) : volume, records, précédent, streak hebdo, disques, échauffement.
// Choix documentés (règles non publiées par les apps de référence) :
//  - les séries d'échauffement ne comptent ni dans le volume ni dans les records ;
//  - e1RM = Epley ; muscles secondaires = 0,5 série.
import { epley1RM, isoDate, parseDate } from './science.js';

export const SET_TYPES = ['normal', 'warmup', 'drop', 'failure'];
export const SET_LABEL = { normal: null, warmup: 'É', drop: 'D', failure: 'F' };

// Types d'exercice → colonnes affichées.
export const EX_TYPES = {
  weight_reps: { cols: ['kg', 'reps'] },
  bodyweight: { cols: ['reps'] },
  weighted_bw: { cols: ['kg', 'reps'] },   // lest ajouté au poids du corps
  assisted_bw: { cols: ['kg', 'reps'] },   // kg = assistance (pas de record de poids)
  duration: { cols: ['sec'] },
};

const counts = (s) => s.done && s.type !== 'warmup';

// Charge effective d'une série (poids du corps inclus pour lesté / assisté si connu).
export function effectiveLoad(ex, s, bodyweight = 0) {
  const kg = Number(s.kg) || 0;
  if (ex.type === 'weighted_bw') return (bodyweight || 0) + kg;
  if (ex.type === 'assisted_bw') return Math.max(0, (bodyweight || 0) - kg);
  if (ex.type === 'bodyweight') return bodyweight || 0;
  return kg;
}

export const setVolume = (ex, s, bw) => (counts(s) ? effectiveLoad(ex, s, bw) * (Number(s.reps) || 0) : 0);
export const exerciseVolume = (ex, bw) => ex.sets.reduce((a, s) => a + setVolume(ex, s, bw), 0);
export const workoutVolume = (w, bw) => w.exercises.reduce((a, ex) => a + exerciseVolume(ex, bw), 0);
export const doneSets = (w) => w.exercises.reduce((a, ex) => a + ex.sets.filter(counts).length, 0);

// Records d'un exercice sur un historique de séances (ordre chronologique).
export function exerciseRecords(workouts, name, bw = 0) {
  const r = { maxKg: 0, e1rm: 0, bestSet: 0, bestSession: 0, maxReps: 0, sessions: 0 };
  for (const w of workouts) {
    const ex = w.exercises.find((e) => e.name === name);
    if (!ex || !ex.sets.some(counts)) continue;
    r.sessions++;
    for (const s of ex.sets.filter(counts)) {
      const load = effectiveLoad(ex, s, bw), reps = Number(s.reps) || 0;
      if (ex.type !== 'assisted_bw' && ex.type !== 'bodyweight') r.maxKg = Math.max(r.maxKg, load);
      if (load && reps) r.e1rm = Math.max(r.e1rm, epley1RM(load, reps));
      r.bestSet = Math.max(r.bestSet, load * reps);
      r.maxReps = Math.max(r.maxReps, reps);
    }
    r.bestSession = Math.max(r.bestSession, exerciseVolume(ex, bw));
  }
  return r;
}

// Records battus par une série, comparés à l'historique (aucun record à la toute première séance).
export function setPRs(prev, ex, s, bw = 0) {
  if (!prev.sessions || !counts(s)) return [];
  const load = effectiveLoad(ex, s, bw), reps = Number(s.reps) || 0, out = [];
  if (ex.type !== 'assisted_bw' && ex.type !== 'bodyweight' && load > prev.maxKg) out.push('maxKg');
  if (load && reps && epley1RM(load, reps) > prev.e1rm + 1e-9) out.push('e1rm');
  if (load * reps > prev.bestSet) out.push('bestSet');
  if (reps > prev.maxReps) out.push('maxReps');
  return out;
}

// Séries de la dernière séance contenant l'exercice (colonne « Précédent »).
export function previousSets(workouts, name) {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const ex = workouts[i].exercises.find((e) => e.name === name);
    if (ex && ex.sets.some((s) => s.done)) return ex.sets.filter((s) => s.done);
  }
  return [];
}

// Points du graphique d'un exercice : une valeur par séance.
export function exerciseSeries(workouts, name, metric = 'e1rm', bw = 0) {
  const pts = [];
  for (const w of workouts) {
    const ex = w.exercises.find((e) => e.name === name);
    if (!ex) continue;
    const sets = ex.sets.filter(counts);
    if (!sets.length) continue;
    const y = metric === 'volume' ? exerciseVolume(ex, bw)
      : metric === 'maxKg' ? Math.max(...sets.map((s) => effectiveLoad(ex, s, bw)))
      : Math.max(...sets.map((s) => epley1RM(effectiveLoad(ex, s, bw), Number(s.reps) || 0)));
    if (y > 0) pts.push({ date: w.date, y });
  }
  return pts;
}

// Lundi de la semaine ISO d'une date 'YYYY-MM-DD'.
export function weekStart(date) {
  const d = parseDate(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDate(d);
}

// Streak hebdomadaire : semaines consécutives (lundi → dimanche) avec ≥ 1 séance.
// La semaine en cours ne casse pas la série tant qu'elle n'est pas terminée.
export function weekStreak(workouts, today) {
  const weeks = new Set(workouts.map((w) => weekStart(w.date)));
  let n = 0, cur = weekStart(today);
  for (let i = 0; i < 520; i++) {
    if (weeks.has(cur)) n++;
    else if (i > 0) break;
    const d = parseDate(cur); d.setDate(d.getDate() - 7); cur = isoDate(d);
  }
  return n;
}

export function restDays(workouts, today) {
  if (!workouts.length) return null;
  const last = workouts.reduce((a, w) => (w.date > a ? w.date : a), '');
  return Math.round((parseDate(today) - parseDate(last)) / 86400000);
}

// Séries par muscle sur une période (principal = 1, secondaires = 0,5).
export function muscleSets(workouts, since, lookup = () => null) {
  const out = {};
  for (const w of workouts) {
    if (w.date < since) continue;
    for (const ex of w.exercises) {
      const n = ex.sets.filter(counts).length;
      if (!n) continue;
      const info = lookup(ex.name) || {};
      const primary = ex.muscle || info.muscle;
      if (primary) out[primary] = (out[primary] || 0) + n;
      for (const m of ex.secondary || info.secondary || []) out[m] = (out[m] || 0) + n * 0.5;
    }
  }
  return out;
}

// Calculateur de disques : par côté, algorithme glouton.
export function plates(target, bar = 20, available = [25, 20, 15, 10, 5, 2.5, 1.25]) {
  let side = (target - bar) / 2;
  if (side < 0) return { perSide: [], remainder: target - bar };
  const perSide = [];
  for (const p of available) {
    while (side >= p - 1e-9) { perSide.push(p); side -= p; }
  }
  return { perSide, remainder: +(side * 2).toFixed(2) };
}

// Échauffement progressif avant la charge de travail (convention courante, arrondi à 2,5 kg).
export function warmupSets(workKg, bar = 20) {
  const r = (x) => Math.max(bar, Math.round(x / 2.5) * 2.5);
  if (!workKg || workKg <= bar) return [];
  const steps = [[0, 10], [0.5, 8], [0.7, 5], [0.85, 3]];
  const out = steps.map(([p, reps]) => ({ kg: p ? r(workKg * p) : bar, reps, type: 'warmup', done: false, rir: null }));
  return out.filter((s, i) => i === 0 || s.kg > out[i - 1].kg); // pas de doublons pour les charges légères
}

// Les routines diffèrent-elles de la séance (nombre de séries / exercices) ? Sert à proposer la mise à jour.
export function routineDiffers(routine, w) {
  if (!routine) return false;
  if (routine.exercises.length !== w.exercises.length) return true;
  return routine.exercises.some((e, i) => e.name !== w.exercises[i].name || e.sets !== w.exercises[i].sets.filter((s) => s.type !== 'warmup').length);
}

// Ancien format { program: { days } } → routines rangées dans un dossier.
export function migrateProgram(program) {
  if (!program?.days?.length) return [];
  return program.days.map((d, i) => ({ id: 'r' + i + '-' + Math.random().toString(36).slice(2, 7), name: d.name, folder: program.name,
    exercises: d.exercises.map((e) => ({ ...e, rest: e.upper ? 90 : 150 })) }));
}

// Notes épinglées par exercice ({ nom: texte }) : chaînes seulement, rognées, 300 caractères max (import de fichier).
export function cleanNotes(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== 'string' || !k || k.length > 120) continue;
    const txt = v.trim().slice(0, 300);
    if (txt) out[k] = txt;
  }
  return out;
}

// Chrono de série (exercices en durée). sw = { i, j, start } ou null. Le temps se calcule depuis l'heure de départ :
// il reste juste après une mise en veille ou un rechargement. Toucher la série en cours l'arrête et donne les secondes.
export function toggleStopwatch(sw, i, j, now) {
  if (sw && sw.i === i && sw.j === j) return { sw: null, fill: { i, j, sec: Math.max(1, Math.round((now - sw.start) / 1000)) } };
  return { sw: { i, j, start: now }, fill: null }; // autre série : l'ancien chrono est abandonné
}

// Records par nombre de reps : pour chaque nombre de reps fait (1 à 20), la charge la plus lourde et sa date.
// Séries validées hors échauffement ; exercices au poids du corps pur ou assistés exclus (pas de charge à battre).
export function repRecords(workouts, name, bw = 0) {
  const best = new Map();
  for (const w of workouts) {
    const ex = w.exercises.find((e) => e.name === name);
    if (!ex || ex.type === 'bodyweight' || ex.type === 'assisted_bw' || ex.type === 'duration') continue;
    for (const s of ex.sets.filter(counts)) {
      const reps = Math.round(Number(s.reps) || 0), kg = effectiveLoad(ex, s, bw);
      if (reps < 1 || reps > 20 || kg <= 0) continue;
      const cur = best.get(reps);
      if (!cur || kg > cur.kg) best.set(reps, { reps, kg, date: w.date }); // à égalité, la première fois compte
    }
  }
  return [...best.values()].sort((a, b) => a.reps - b.reps);
}

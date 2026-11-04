// État persistant dans localStorage (données uniquement sur le téléphone).
import { isoDate } from './science.js';
import { DEFAULT_HABITS } from './habits.js';
import { migrateProgram } from './workout.js';
import { DEFAULT_PROGRAM } from './exercises.js';

const KEY = 'coach.v1';

const empty = () => ({
  profile: { goal: 'perte', rate: 0.5, activity: 'leger' },
  settings: { apiKey: '', model: 'claude-opus-5-5', budgetEur: 10, look: 'glass', palette: 'ocean', shape: 'flow' },
  usage: null,    // { month: 'YYYY-MM', usd, calls } : dépense IA estimée du mois
  foods: {},      // id -> { name, per100: {kcal,p,c,f,fib}, source, serving }
  favorites: [],  // ids d'aliments
  logs: {},       // 'YYYY-MM-DD' -> { meals: [entry], water: ml }
  weights: [],    // [{ date, kg }]
  program: null,  // { name, days: [{ name, exercises: [{ name, muscle, sets, repMin, repMax, upper }] }] }
  workouts: [],   // [{ id, date, dayName, exercises: [{ name, muscle, upper, repMin, repMax, sets: [{ kg, reps, rir, done }] }] }]
  chat: [],       // [{ role, text, sources }]
  habits: DEFAULT_HABITS.map((h) => ({ ...h })), // [{ id, auto?, name? }]
  habitLog: {},   // 'YYYY-MM-DD' -> { habitId: true } (cases cochées à la main)
  routines: [],   // [{ id, name, folder, exercises: [{ name, muscle, secondary, type, sets, repMin, repMax, rest, upper }] }]
  customExercises: [], // [{ name, muscle, secondary, equipment, type, upper }]
  milestones: [], // étapes de poids estimées : [{ id, kg, date?, label?, done?, doneOn? }]
  cycle: { enabled: false, periods: [], logs: {}, cycleLen: 28, periodLen: 5, hormonal: false }, // suivi du cycle (utilisatrices)
  foodGroups: {}, // 'YYYY-MM-DD' -> { fruitVeg: n, fish: n } (repères ANSES)
  strava: null,   // { clientId, clientSecret, token, refresh, expiresAt, athlete, activities: [], lastSync, prefs }
  plan: null,     // programme daté : { id, name, goal, start, end, weeks, weekdays, deloadEvery, phases, routineIds }
});

export let state = empty();

export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    state = sanitize(raw ? JSON.parse(raw) : {}); // aussi au premier lancement : crée les routines par défaut
  } catch {
    // Données illisibles : on garde une copie brute avant de repartir de zéro.
    try { if (raw) localStorage.setItem(KEY + '.corrupt', raw); } catch {}
    state = empty();
  }
  return state;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {
    alert('Stockage plein : exporte tes données depuis Profil.');
  }
}

// Fusion avec les valeurs par défaut + types vérifiés (import de fichier, ancienne version).
function sanitize(data) {
  const base = empty(), out = { ...base, ...data };
  for (const k of ['weights', 'workouts', 'chat', 'favorites', 'habits', 'routines', 'customExercises', 'milestones']) if (!Array.isArray(out[k])) out[k] = base[k];
  for (const k of ['profile', 'settings', 'foods', 'logs', 'habitLog']) if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = base[k];
  out.settings = { ...base.settings, ...out.settings };
  if (out.plan && (!Array.isArray(out.plan.routineIds) || !Array.isArray(out.plan.weekdays))) out.plan = null;
  for (const d in out.logs) {
    const l = out.logs[d];
    if (!l || !Array.isArray(l.meals)) out.logs[d] = { meals: [], water: Number(l?.water) || 0 };
  }
  // Ancien « programme » (ou premier lancement) → routines rangées dans un dossier.
  if (!out.routines.length) out.routines = migrateProgram(out.program || DEFAULT_PROGRAM);
  return out;
}

export function replace(data) {
  state = sanitize(data);
  save();
}

export const today = () => isoDate(new Date());

export function dayLog(date = today()) {
  if (!state.logs[date]) state.logs[date] = { meals: [], water: 0 };
  return state.logs[date];
}

export const uid = () => Math.random().toString(36).slice(2, 10);

// Totaux d'une liste d'entrées repas.
export function sum(entries) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, fib: 0 };
  for (const e of entries) for (const k in t) t[k] += Number(e[k]) || 0;
  return t;
}

// { date: kcal } pour le calcul adaptatif.
export function intakesByDay() {
  const out = {};
  for (const [d, l] of Object.entries(state.logs)) out[d] = sum(l.meals).kcal;
  return out;
}

export function latestWeight() {
  const w = [...state.weights].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return w ? w.kg : state.profile.weight;
}

// Aliments récents (dédoublonnés par nom), du plus récent au plus ancien.
export function recentFoods(limit = 12) {
  const seen = new Set(), out = [];
  const days = Object.keys(state.logs).sort().reverse();
  for (const d of days) {
    for (const e of [...state.logs[d].meals].reverse()) {
      if (seen.has(e.name)) continue;
      seen.add(e.name); out.push(e);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

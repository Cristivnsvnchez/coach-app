// État persistant dans localStorage (données uniquement sur le téléphone).
import { isoDate } from './science.js';
import { DEFAULT_HABITS, cleanDayTasks, migrateHabits } from './habits.js';
import { migrateProgram } from './workout.js';
import { DEFAULT_PROGRAM } from './exercises.js';

const KEY = 'coach.v1';
// Version du schéma des données : incrémenter et ajouter une étape dans MIGRATIONS à chaque changement de forme.
export const SCHEMA = 4;
const MIGRATIONS = {
  // 1 → 2 : TrackMe (palette, matière, cycle, repères ANSES, Strava) ; les champs manquants viennent de empty().
  2: (d) => d,
  // 2 → 3 : Strava retiré.
  3: (d) => { delete d.strava; return d; },
  // 3 → 4 : habitudes par défaut devenues des actions (« Faire 10 000 pas »…), fruits/légumes laissés à l'anneau ANSES.
  4: (d) => { if (Array.isArray(d.habits)) d.habits = migrateHabits(d.habits); return d; },
};

const empty = () => ({
  _v: SCHEMA,
  profile: { goal: 'perte', rate: 0.5, activity: 'leger' },
  settings: { look: 'glass', palette: 'ocean', shape: 'flow', surface: 'brume', scheme: 'auto', backupEvery: 7, outfit: 0, shopDay: 6 },
  foods: {},      // id -> { name, per100: {kcal,p,c,f,fib}, source, serving }
  favorites: [],  // ids d'aliments
  logs: {},       // 'YYYY-MM-DD' -> { meals: [entry], water: ml }
  weights: [],    // [{ date, kg }]
  program: null,  // { name, days: [{ name, exercises: [{ name, muscle, sets, repMin, repMax, upper }] }] }
  workouts: [],   // [{ id, date, dayName, exercises: [{ name, muscle, upper, repMin, repMax, sets: [{ kg, reps, rir, done }] }] }]
  habits: DEFAULT_HABITS.map((h) => ({ ...h })), // [{ id, auto?, name? }]
  habitLog: {},   // 'YYYY-MM-DD' -> { habitId: true } (cases cochées à la main)
  dayTasks: {},   // 'YYYY-MM-DD' -> [{ id, name, done }] (tâches ponctuelles de ce jour seulement : courses, démarche…)
  routines: [],   // [{ id, name, folder, exercises: [{ name, muscle, secondary, type, sets, repMin, repMax, rest, upper }] }]
  customExercises: [], // [{ name, muscle, secondary, equipment, type, upper }]
  milestones: [], // étapes de poids estimées : [{ id, kg, date?, label?, done?, doneOn? }]
  cycle: { enabled: false, periods: [], logs: {}, cycleLen: 28, periodLen: 5, hormonal: false }, // suivi du cycle (utilisatrices)
  foodGroups: {}, // 'YYYY-MM-DD' -> { fruitVeg: n, fish: n } (repères ANSES)
  plan: null,     // programme daté : { id, name, goal, start, end, weeks, weekdays, deloadEvery, phases, routineIds }
  mealPlan: {},   // 'YYYY-MM-DD' -> { dej: [entry], midi: [entry], diner: [entry], snack: [entry] } (repas prévus, distinct de logs = repas mangés)
  shoppingDone: [], // ids des listes de courses marquées « Courses faites » (figées, masquées)
  shoppingList: [], // [{ id, foodId, name, grams, store, checked, auto, trip, removed }] (auto = regénéré depuis mealPlan, sinon ajouté à la main ; trip = date de la sortie courses ; removed = article auto masqué)
});

export let state = empty();

export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    state = sanitize(raw ? JSON.parse(raw) : {}); // aussi au premier lancement : crée les routines par défaut
    // Ancienne clé API / historique du Coach IA (retiré) : on réécrit tout de suite pour ne pas les laisser sur le téléphone.
    // Essai séparé : un échec d'écriture (quota…) ne doit pas faire passer les données pour illisibles.
    if (raw && /"apiKey"|"chat"|"usage"/.test(raw)) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
  } catch {
    // Données illisibles : on garde une copie brute avant de repartir de zéro.
    try { if (raw) localStorage.setItem(KEY + '.corrupt', raw); } catch {}
    state = empty();
  }
  return state;
}

// Enregistrement groupé : plusieurs save() dans la même tâche donnent une seule écriture (sérialisation coûteuse).
// Écriture forcée quand l'app passe en arrière-plan (iOS peut la fermer sans prévenir).
let pending = false;
export function save() {
  if (pending) return;
  pending = true;
  queueMicrotask(flush);
}
export function flush() {
  pending = false;
  const json = JSON.stringify(state);
  try { localStorage.setItem(KEY, json); return; } catch {}
  // Stockage plein : on libère d'abord ce qui se régénère (ancien historique du coach), puis on réessaie.
  try { localStorage.removeItem(KEY + '.corrupt'); localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { alert('Stockage plein : exporte tes données depuis Profil.'); }
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && pending) flush(); });
  addEventListener('pagehide', () => { if (pending) flush(); });
}

// Fusion avec les valeurs par défaut + types vérifiés (import de fichier, ancienne version).
function sanitize(data) {
  for (let v = (Number(data._v) || 1) + 1; v <= SCHEMA; v++) data = MIGRATIONS[v]?.(data) ?? data;
  const base = empty(), out = { ...base, ...data, _v: SCHEMA };
  for (const k of ['weights', 'workouts', 'favorites', 'habits', 'routines', 'customExercises', 'milestones']) if (!Array.isArray(out[k])) out[k] = base[k];
  for (const k of ['profile', 'settings', 'foods', 'logs', 'habitLog']) if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = base[k];
  out.settings = { ...base.settings, ...out.settings };
  delete out.chat; delete out.usage; delete out.settings.apiKey; delete out.settings.model; delete out.settings.budgetEur; // Coach IA retiré : on n'en garde aucune trace
  for (const k of ['foodGroups', 'mealPlan']) if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = base[k];
  out.dayTasks = cleanDayTasks(out.dayTasks);
  if (!Array.isArray(out.shoppingList)) out.shoppingList = base.shoppingList;
  if (!Array.isArray(out.shoppingDone)) out.shoppingDone = base.shoppingDone;
  for (const d in out.mealPlan) {
    const p = out.mealPlan[d];
    if (!p || typeof p !== 'object') { out.mealPlan[d] = { dej: [], midi: [], diner: [], snack: [] }; continue; }
    for (const k of ['dej', 'midi', 'diner', 'snack']) if (!Array.isArray(p[k])) p[k] = [];
  }
  const c = out.cycle && typeof out.cycle === 'object' ? out.cycle : {};
  out.cycle = { ...base.cycle, ...c, periods: Array.isArray(c.periods) ? c.periods : [], logs: c.logs && typeof c.logs === 'object' ? c.logs : {} };
  delete out.strava; // intégration Strava retirée (v17) : on efface les anciens jetons
  if (out.plan && (!Array.isArray(out.plan.routineIds) || !Array.isArray(out.plan.weekdays))) out.plan = null;
  for (const d in out.logs) {
    const l = out.logs[d];
    if (!l || !Array.isArray(l.meals)) out.logs[d] = { meals: [], water: Number(l?.water) || 0 };
  }
  // Ancien « programme » (ou premier lancement) → routines rangées dans un dossier.
  if (!out.routines.length) out.routines = migrateProgram(out.program || DEFAULT_PROGRAM);
  cleanFields(out);
  return out;
}

// Sécurité (sauvegarde importée) : ids, types et nombres sont insérés tels quels dans le HTML (data-*, value="", classes).
// On n'y laisse que des caractères sûrs ; les textes libres (noms, notes) restent intacts et passent par esc() à l'affichage.
const ID = (x) => (x == null ? x : String(x).replace(/[^\w:.-]/g, ''));
const NUM = (x) => (x == null || typeof x === 'number' || typeof x === 'boolean' ? x
  : typeof x === 'string' && (x.trim() === '' || Number.isFinite(+x)) ? x : null);
const objs = (a) => (Array.isArray(a) ? a.filter((x) => x && typeof x === 'object' && !Array.isArray(x)) : []);
function fix(o, ids, nums) {
  for (const k of ids) if (k in o) o[k] = ID(o[k]);
  for (const k of nums) if (k in o) o[k] = NUM(o[k]);
  return o;
}
const MACROS = ['grams', 'kcal', 'p', 'c', 'f', 'fib'];
function fixExercise(e) {
  fix(e, ['type', 'supersetId'], ['repMin', 'repMax', 'rest']);
  if (Array.isArray(e.sets)) e.sets = objs(e.sets).map((s) => fix(s, ['type'], ['kg', 'reps', 'rir']));
  else if ('sets' in e) e.sets = NUM(e.sets);
  return e;
}
function cleanFields(out) {
  // Cycle : durées entières et bornées (affichées telles quelles quand aucune règle n'est saisie).
  const int = (v, lo, hi, d) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || d));
  out.cycle.cycleLen = int(out.cycle.cycleLen, 18, 45, 28);
  out.cycle.periodLen = int(out.cycle.periodLen, 1, 12, 5);
  const meals = (a) => objs(a).map((m) => fix(m, ['foodId', 'id'], MACROS));
  out.routines = objs(out.routines).map((r) => { fix(r, ['id'], []); r.exercises = objs(r.exercises).map(fixExercise); return r; });
  out.workouts = objs(out.workouts).map((w) => { fix(w, ['id', 'routineId'], ['minutes']); w.exercises = objs(w.exercises).map(fixExercise); return w; });
  out.habits = objs(out.habits).map((h) => fix(h, ['id'], []));
  out.milestones = objs(out.milestones).map((m) => fix(m, ['id'], ['kg']));
  out.weights = objs(out.weights).map((w) => fix(w, [], ['kg']));
  out.shoppingList = objs(out.shoppingList).map((s) => fix(s, ['id', 'foodId'], ['grams']));
  out.favorites = out.favorites.map(ID);
  out.shoppingDone = out.shoppingDone.map(ID);
  for (const d in out.logs) { const l = out.logs[d]; l.meals = meals(l.meals); l.water = NUM(l.water); }
  for (const d in out.mealPlan) for (const k of ['dej', 'midi', 'diner', 'snack']) out.mealPlan[d][k] = meals(out.mealPlan[d][k]);
  for (const id in out.foods) {
    const f = out.foods[id];
    if (!f || typeof f !== 'object') { delete out.foods[id]; continue; }
    fix(f, ['id'], ['serving']);
    if (f.per100 && typeof f.per100 === 'object') fix(f.per100, [], MACROS);
  }
  if (out.plan) { fix(out.plan, ['id'], []); out.plan.routineIds = out.plan.routineIds.map(ID); out.plan.weekdays = out.plan.weekdays.map(NUM); }
  const c = out.profile.custom;
  if (c && typeof c === 'object') for (const k in c) if (k !== 'enabled') c[k] = NUM(c[k]);
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

// Repas prévus (planning), distinct des repas réellement mangés (dayLog).
export function planDay(date = today()) {
  if (!state.mealPlan[date]) state.mealPlan[date] = { dej: [], midi: [], diner: [], snack: [] };
  return state.mealPlan[date];
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

// Poids saisi hors de l'écran Poids (Profil) : devient la pesée du jour, seule source du poids courant dès qu'il y a des pesées.
export function recordWeight(kg, date = today()) {
  if (!(kg >= 20 && kg <= 400)) return;
  const w = state.weights.find((x) => x.date === date);
  if (w) w.kg = kg; else state.weights.push({ date, kg });
  state.profile.weight = kg;
  save();
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

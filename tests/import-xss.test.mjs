// Sauvegarde importée piégée : sanitize() (via replace) doit neutraliser ids, types et nombres
// avant qu'ils n'atteignent les gabarits HTML (attributs data-*, value="", classes, texte).
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const store = await import('../js/store.js'); // store.state est réassigné par replace() : toujours le relire
const flushAll = () => new Promise((r) => setTimeout(r, 0));

const X = '"><img src=x onerror=alert(1)>';
const bad = /[<>"'&]/;

// Parcourt l'état et renvoie les chemins des champs « techniques » (ids, types, nombres) contenant du HTML.
const TECH = new Set(['id', 'routineId', 'routineIds', 'foodId', 'supersetId', 'type', 'sets', 'repMin', 'repMax', 'rest', 'minutes',
  'kg', 'reps', 'rir', 'grams', 'serving', 'kcal', 'p', 'c', 'f', 'fib', 'water', 'enabled', 'cycleLen', 'periodLen']);
function leaks(v, path = '', tech = false) {
  if (Array.isArray(v)) return v.flatMap((x, i) => leaks(x, `${path}[${i}]`, tech));
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => leaks(x, `${path}.${k}`, tech || TECH.has(k)));
  return tech && bad.test(String(v)) ? [path] : [];
}

test('import piégé : aucun id, type ou nombre ne garde de HTML', async () => {
  store.replace({
    profile: { custom: { enabled: true, kcal: X, p: '120' } },
    logs: { '2026-11-07': { water: X, meals: [{ name: 'Pomme', foodId: X, grams: X, kcal: X, p: 1, c: 2, f: 3, fib: [X] }] } },
    foods: { a: { id: X, name: 'A', serving: X, per100: { kcal: X, p: 1, c: 1, f: 1, fib: 1 } } },
    routines: [{ id: X, name: 'R', folder: 'F', exercises: [{ name: 'Squat', type: X, sets: X, repMin: X, repMax: X, rest: X, supersetId: X }] }],
    workouts: [{ id: X, date: '2026-11-07', minutes: X, exercises: [{ name: 'Squat', type: X, repMin: X, sets: [{ kg: X, reps: X, rir: X, type: X, done: true }] }] }],
    habits: [{ id: X, name: 'H' }],
    plan: { id: X, routineIds: [X], weekdays: [1] },
    mealPlan: { '2026-11-07': { dej: [{ name: 'B', grams: X, foodId: X }] } },
    shoppingList: [{ id: X, foodId: X, name: 'Lait', grams: X }],
    milestones: [{ id: X, kg: X }],
    weights: [{ date: '2026-11-07', kg: X }],
    cycle: { enabled: true, cycleLen: X, periodLen: X },
  });
  await flushAll();
  assert.deepEqual(leaks(store.state), []);
});

test('import : durées du cycle entières et bornées (18–45 j, 1–12 j)', async () => {
  const len = async (cycleLen, periodLen) => { store.replace({ profile: {}, logs: {}, cycle: { enabled: true, cycleLen, periodLen } }); await flushAll(); return [store.state.cycle.cycleLen, store.state.cycle.periodLen]; };
  assert.deepEqual(await len(X, X), [28, 5]);
  assert.deepEqual(await len(3, 40), [18, 12]);
  assert.deepEqual(await len(99, 0), [45, 5]);
  assert.deepEqual(await len('29.6', 4), [30, 4]);
});

test('import : périodes et notes du cycle limitées aux dates AAAA-MM-JJ', async () => {
  store.replace({ profile: {}, logs: {}, cycle: { enabled: true,
    periods: [{ start: X }, { start: '2026-10-01', end: X }, { start: '2026-10-01', end: '2026-10-05' }, { start: '2026-11-01' }, null],
    logs: { [X]: { flow: 'light' }, '2026-11-02': { flow: 'light' } } } });
  await flushAll();
  assert.deepEqual(store.state.cycle.periods, [{ start: '2026-10-01', end: '2026-10-05' }, { start: '2026-11-01' }]);
  assert.deepEqual(Object.keys(store.state.cycle.logs), ['2026-11-02']);
});

test('import sain : les valeurs légitimes restent identiques', async () => {
  const routine = { id: 'r0-ab1c2', name: 'Push <A>', folder: 'Mes routines', exercises: [
    { name: 'Développé couché', muscle: 'Pectoraux', type: 'weight_reps', sets: 3, repMin: 8, repMax: 12, rest: 90, upper: true, supersetId: null }] };
  const workout = { id: 'k3j4h5', date: '2026-11-07', minutes: 45, dayName: 'Push', exercises: [
    { name: 'Développé couché', type: 'weight_reps', repMin: 8, repMax: 12, sets: [{ kg: 60, reps: 10, rir: null, type: 'normal', done: true }, { kg: '', reps: '', rir: 2, type: 'warmup', done: false }] }] };
  const meal = { name: 'Pomme', foodId: 'base:pomme', grams: 150, kcal: 78, p: 0.4, c: 18, f: 0.3, fib: 3.6, meal: 'snack' };
  store.replace({
    profile: { goal: 'perte', custom: { enabled: true, kcal: 1800, p: 120 } },
    logs: { '2026-11-07': { water: 1500, meals: [meal] } },
    foods: { 'off:3017620422003': { id: 'off:3017620422003', name: 'Nutella', serving: 15, per100: { kcal: 539, p: 6.3, c: 57.5, f: 30.9, fib: 0 } } },
    routines: [routine], workouts: [workout],
    habits: [{ id: 'protein', auto: true }, { id: 'x7y8z9', name: 'Lire' }],
    plan: { id: 'p1', routineIds: ['r0-ab1c2'], weekdays: [1, 3] },
    shoppingList: [{ id: 's1', foodId: 'base:lait', name: 'Lait', grams: 1000, store: 'Lidl' }],
    milestones: [{ id: 'm1', kg: 75 }], weights: [{ date: '2026-11-07', kg: 80.2 }],
  });
  await flushAll();
  assert.deepEqual(store.state.routines, [routine]);
  assert.deepEqual(store.state.workouts, [workout]);
  assert.deepEqual(store.state.logs['2026-11-07'], { water: 1500, meals: [meal] });
  assert.deepEqual(store.state.foods['off:3017620422003'].per100, { kcal: 539, p: 6.3, c: 57.5, f: 30.9, fib: 0 });
  assert.deepEqual(store.state.habits, [{ id: 'protein', auto: true }, { id: 'x7y8z9', name: 'Lire' }]);
  assert.deepEqual(store.state.plan.routineIds, ['r0-ab1c2']);
  assert.deepEqual(store.state.profile.custom, { enabled: true, kcal: 1800, p: 120 });
  assert.equal(store.state.shoppingList[0].grams, 1000);
  assert.equal(store.state.weights[0].kg, 80.2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../js/workout.js';

const ex = (sets, extra = {}) => ({ name: 'Squat', type: 'weight_reps', sets, ...extra });
const set = (kg, reps, type = 'normal', done = true) => ({ kg, reps, type, done });
const wk = (date, sets, extra) => ({ date, exercises: [ex(sets, extra)] });

test("volume : séries validées hors échauffement", () => {
  const w = wk('2026-01-01', [set(20, 10, 'warmup'), set(100, 5), set(100, 5), set(100, 5, 'normal', false)]);
  assert.equal(W.workoutVolume(w), 1000);
  assert.equal(W.doneSets(w), 2);
});

test('lesté et assisté : poids du corps pris en compte', () => {
  assert.equal(W.effectiveLoad({ type: 'weighted_bw' }, { kg: 10 }, 80), 90);
  assert.equal(W.effectiveLoad({ type: 'assisted_bw' }, { kg: 20 }, 80), 60);
});

test('records et PR en direct (aucun PR à la première séance)', () => {
  const hist = [wk('2026-01-01', [set(100, 5)]), wk('2026-01-03', [set(105, 3)])];
  const r = W.exerciseRecords(hist, 'Squat');
  assert.equal(r.maxKg, 105);
  assert.equal(r.bestSet, 500);
  assert.deepEqual(W.setPRs(r, ex([]), set(110, 2)), ['maxKg', 'e1rm']); // 110×2 → e1RM 117,3 > 116,7
  assert.ok(W.setPRs(r, ex([]), set(100, 8)).includes('e1rm'));
  assert.deepEqual(W.setPRs(W.exerciseRecords([], 'Squat'), ex([]), set(200, 5)), []);
});

test('précédent : dernière séance avec séries validées', () => {
  const hist = [wk('2026-01-01', [set(100, 5)]), wk('2026-01-03', [set(0, 0, 'normal', false)])];
  assert.equal(W.previousSets(hist, 'Squat')[0].kg, 100);
});

test('streak hebdomadaire (lundi → dimanche), semaine en cours non bloquante', () => {
  const ws = [{ date: '2026-01-05', exercises: [] }, { date: '2026-01-14', exercises: [] }]; // lun. 5 et mer. 14 janv.
  assert.equal(W.weekStart('2026-01-11'), '2026-01-05'); // dimanche → lundi précédent
  assert.equal(W.weekStreak(ws, '2026-01-16'), 2);
  assert.equal(W.weekStreak(ws, '2026-01-20'), 2);   // semaine du 19 pas encore faite
  assert.equal(W.weekStreak(ws, '2026-01-27'), 0);   // semaine du 19 manquée
  assert.equal(W.restDays(ws, '2026-01-16'), 2);
});

test('séries par muscle : secondaires à 0,5', () => {
  const ws = [{ date: '2026-01-05', exercises: [{ name: 'Développé couché', muscle: 'Pectoraux', secondary: ['Triceps', 'Épaules'], sets: [set(80, 8), set(80, 8)] }] }];
  assert.deepEqual(W.muscleSets(ws, '2026-01-01'), { Pectoraux: 2, Triceps: 1, 'Épaules': 1 });
});

test('disques : 100 kg avec barre de 20 = 25 + 15 par côté', () => {
  assert.deepEqual(W.plates(100).perSide, [25, 15]);
  assert.equal(W.plates(101).remainder, 1);
});

test('échauffement : paliers croissants, sans doublon', () => {
  const w = W.warmupSets(100);
  assert.deepEqual(w.map((s) => s.kg), [20, 50, 70, 85]);
  assert.ok(W.warmupSets(30).length <= 2);
});

test('premier lancement : les routines par défaut sont créées', async () => {
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  const store = await import('../js/store.js?fresh');
  store.load();
  assert.ok(store.state.routines.length >= 3);
});

test('notes épinglées : texte seulement, rogné, 300 caractères max', () => {
  assert.deepEqual(W.cleanNotes(null), {});
  assert.deepEqual(W.cleanNotes(['x']), {});
  const n = W.cleanNotes({ Squat: '  siège cran 4  ', Vide: '   ', Objet: { a: 1 }, Long: 'x'.repeat(400), '': 'sans nom' });
  assert.deepEqual(Object.keys(n), ['Squat', 'Long']);
  assert.equal(n.Squat, 'siège cran 4');
  assert.equal(n.Long.length, 300);
});

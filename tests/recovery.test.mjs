import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryMap, editedWorkout } from '../js/recovery.js';

const set = (kg, reps, done = true, type = 'normal') => ({ kg, reps, done, type });
const w = (date, exercises, extra = {}) => ({ id: date, name: 'S', date, exercises, ...extra });
const ex = (name, muscle, sets, secondary = []) => ({ name, muscle, secondary, type: 'weight_reps', sets });
const TODAY = '2026-11-07';

test('récupération : < 48 h = en récupération, 2–7 j = prêt, > 7 j ou jamais = à reprendre', () => {
  const ws = [
    w('2026-11-06', [ex('Squat', 'Quadriceps', [set(100, 5), set(100, 5), set(100, 5)], ['Fessiers'])]),
    w('2026-11-03', [ex('Développé couché', 'Pectoraux', [set(80, 8), set(80, 8)], ['Triceps'])]),
    w('2026-10-20', [ex('Rowing', 'Dos', [set(60, 10), set(60, 10)])]),
  ];
  const r = recoveryMap(ws, TODAY);
  assert.equal(r.Quadriceps.status, 'recup');
  assert.equal(r.Quadriceps.days, 1);
  assert.equal(r.Fessiers.status, 'recup');     // secondaire : 3 × 0,5 = 1,5 série, compte quand même
  assert.equal(r.Pectoraux.status, 'pret');
  assert.equal(r.Pectoraux.days, 4);
  assert.equal(r.Dos.status, 'reprendre');
  assert.equal(r.Mollets.status, 'reprendre');
  assert.equal(r.Mollets.days, null);
});

test('récupération : échauffements et séries non faites ne comptent pas ; un petit volume récent ne fatigue pas', () => {
  const ws = [w('2026-11-07', [
    ex('Curl', 'Biceps', [set(10, 12, true, 'warmup'), set(14, 10, false)]),
    ex('Mollets debout', 'Mollets', [set(40, 15)]),
  ])];
  const r = recoveryMap(ws, TODAY);
  assert.equal(r.Biceps.status, 'reprendre');   // rien de valide
  assert.equal(r.Mollets.status, 'pret');       // 1 série : entraîné mais pas en récupération
});

test('séance modifiée : séries vides retirées, exercices vides retirés, volume recalculé, date future refusée', () => {
  const src = w('2026-11-05', [
    ex('Squat', 'Quadriceps', [set(100, 5), set(100, 0), set(0, 0)]),
    ex('Curl', 'Biceps', [set(10, 0)]),
  ], { volume: 9999, dayName: 'old' });
  const out = editedWorkout(src, { name: '  Jambes  ', date: '2026-11-04' }, TODAY, 70);
  assert.equal(out.name, 'Jambes');
  assert.equal(out.dayName, 'Jambes');
  assert.equal(out.date, '2026-11-04');
  assert.equal(out.exercises.length, 1);
  assert.equal(out.exercises[0].sets.length, 1);
  assert.equal(out.volume, 500);
  assert.ok(out.exercises[0].sets.every((s) => s.done));
  assert.equal(editedWorkout(src, { date: '2026-12-01' }, TODAY, 70), null);   // futur
  assert.equal(editedWorkout(w(TODAY, [ex('Curl', 'Biceps', [set(10, 0)])]), {}, TODAY, 70), null); // plus aucune série
});

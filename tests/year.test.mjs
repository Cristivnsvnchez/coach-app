import test from 'node:test';
import assert from 'node:assert/strict';
import { yearReview, level } from '../js/year.js';

const set = (done = true, type = 'normal') => ({ kg: 50, reps: 8, done, type });
const w = (date, n, extra = []) => ({ id: date, date, exercises: [{ name: 'Squat', sets: [...Array.from({ length: n }, () => set()), ...extra] }] });
const TODAY = '2026-11-08'; // dimanche

test('bilan : 53 semaines du lundi au dimanche, la dernière contient aujourd\'hui', () => {
  const r = yearReview([], TODAY);
  assert.equal(r.weeks.length, 53);
  assert.ok(r.weeks.every((wk) => wk.length === 7));
  assert.equal(r.weeks[0][0].date, '2025-11-03'); // un lundi, 53 semaines pleines jusqu'à dimanche
  assert.equal(r.weeks[52][6].date, TODAY);
  assert.equal(r.weeks[52][6].future, false);
});

test('bilan : niveau par séries de travail, échauffements et séries non faites exclus', () => {
  assert.deepEqual([0, 1, 9, 10, 19, 20].map(level), [0, 1, 1, 2, 2, 3]);
  const r = yearReview([w('2026-11-06', 12, [set(true, 'warmup'), set(false)])], TODAY);
  const day = r.weeks.flat().find((d) => d.date === '2026-11-06');
  assert.equal(day.sets, 12);
  assert.equal(day.level, 2);
});

test('bilan : séances, jours et semaines actives, plus longue série de semaines', () => {
  const ws = [w('2026-11-02', 5), w('2026-11-04', 5), w('2026-10-28', 5), w('2026-10-20', 5), w('2026-09-01', 5), w('2024-01-01', 5), w('2026-11-09', 5)];
  const r = yearReview(ws, TODAY);
  assert.equal(r.sessions, 5); // hors 2024 et hors futur
  assert.equal(r.activeDays, 5);
  assert.equal(r.activeWeeks, 4);
  assert.equal(r.bestStreak, 3); // semaines du 19/10, 26/10, 02/11
  assert.equal(r.sets, 25);
});

test('bilan : semaine en cours partiellement future marquée', () => {
  const r = yearReview([], '2026-11-04'); // mercredi
  const last = r.weeks[52];
  assert.deepEqual(last.map((d) => d.future), [false, false, false, true, true, true, true]);
});

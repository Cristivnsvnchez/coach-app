import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/science.js';

const man = { sex: 'M', age: 30, height: 180, weight: 80, activity: 'actif', goal: 'perte', rate: 0.5 };
const near = (a, b, eps = 1) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test('Mifflin-St Jeor homme 80 kg / 180 cm / 30 ans = 1780', () => near(S.bmr(man), 1780, 0.01));
test('Mifflin femme = homme − 166', () => near(S.bmr({ ...man, sex: 'F' }), 1614, 0.01));
test('Katch-McArdle si % masse grasse', () => near(S.bmr({ ...man, bodyFat: 20 }), 370 + 21.6 * 64, 0.01));

test('targets() renvoie null si profil incomplet', () => {
  assert.equal(S.targets({ sex: 'M' }), null);
  assert.equal(S.targets(null), null);
});

test('perte 0,5 %/sem : déficit ≈ 440 kcal, protéines 2 g/kg', () => {
  const t = S.targets(man, 3000);
  near(t.kcal, 3000 - 440);
  assert.equal(t.protein, 160);
  assert.ok(t.fat >= 48);
  assert.ok(t.fiber >= 30);
});

test('déficit plafonné à 25 % du TDEE', () => {
  const t = S.targets({ ...man, rate: 1 }, 2000);
  assert.equal(t.kcal, 1500);
});

test('plancher 1200 kcal femme', () => {
  const t = S.targets({ ...man, sex: 'F', rate: 1 }, 1400);
  assert.equal(t.kcal, 1200);
  assert.equal(t.floored, true);
});

test('obésité : protéines sur poids IMC 24,9', () => {
  const t = S.targets({ ...man, weight: 130 }, 3000);
  near(t.protein, 24.9 * 1.8 ** 2 * 2, 1);
});

test('EMA α 0,1', () => {
  const tr = S.emaTrend([{ date: '2026-01-01', kg: 80 }, { date: '2026-01-02', kg: 81 }]);
  near(tr[1].trend, 80.1, 1e-9);
});

function series(days, startKg, kgPerDay, kcal) {
  const weights = [], intakes = {};
  for (let i = 0; i < days; i++) {
    const d = S.isoDate(new Date(Date.UTC(2026, 0, 1 + i, 12)));
    weights.push({ date: d, kg: startKg + kgPerDay * i });
    if (kcal) intakes[d] = kcal;
  }
  return { weights, intakes, today: weights[weights.length - 1].date };
}

test('moins de 10 jours loggés → formule', () => {
  const { weights, today } = series(21, 80, -0.05, 0);
  const intakes = { [today]: 2000 };
  const r = S.adaptiveTdee({ profile: man, weights, intakes, today });
  assert.equal(r.method, 'formule');
});

test('adaptatif : 2200 kcal et −0,05 kg/j → TDEE observé ≈ 2585 (avant pondération)', () => {
  const { weights, intakes, today } = series(60, 80, -0.05, 2200);
  const r = S.adaptiveTdee({ profile: man, weights, intakes, today });
  assert.equal(r.method, 'adaptatif');
  // La tendance EMA retarde la pente réelle ; on vérifie un ordre de grandeur cohérent.
  assert.ok(r.observed > 2400 && r.observed < 2700, String(r.observed));
});

test('jours sans saisie exclus de la moyenne', () => {
  const { weights, intakes, today } = series(30, 80, 0, 2500);
  Object.keys(intakes).slice(-5).forEach((d) => (intakes[d] = 0));
  const r = S.adaptiveTdee({ profile: { ...man, activity: 'sedentaire' }, weights, intakes, today });
  assert.equal(r.loggedDays, 16);
  near(r.observed, Math.min(2500, S.tdeeInitial({ ...man, activity: 'sedentaire' }) * 1.4), 1);
});

test('fourchette poids idéal 180 cm', () => {
  const r = S.idealRange({ height: 180, sex: 'M' });
  near(r.bmiMin, 59.9, 0.1);
  near(r.bmiMax, 80.7, 0.1);
  near(r.formulas.devine, 50 + 2.3 * (180 / 2.54 - 60), 0.01);
});

test('ETA : 80 → 75 kg à −0,5 kg/sem = 70 jours', () => {
  const d = S.etaDate(80, 75, -0.5, '2026-01-01');
  assert.equal(S.isoDate(d), '2026-03-12');
  assert.equal(S.etaDate(80, 75, 0.5, '2026-01-01'), null);
});

test('Epley', () => near(S.epley1RM(100, 10), 133.33, 0.01));

test('double progression', () => {
  assert.equal(S.nextSet({ load: 60, reps: [12, 12, 12], repMin: 8, repMax: 12, upper: true }).reps, 8);
  assert.ok(S.nextSet({ load: 60, reps: [12, 12, 12], repMin: 8, repMax: 12, upper: true }).load > 60);
  assert.deepEqual(
    { load: S.nextSet({ load: 60, reps: [10, 9, 9], repMin: 8, repMax: 12 }).load, reps: S.nextSet({ load: 60, reps: [10, 9, 9], repMin: 8, repMax: 12 }).reps },
    { load: 60, reps: 10 });
  assert.equal(S.nextSet({ load: 100, reps: [5], repMin: 6, repMax: 10, failedSessions: 2 }).load, 90);
});

test('poids du corps : progression en reps, jamais de charge fantôme', () => {
  const n = S.nextSet({ load: 0, reps: [10, 10, 10], repMin: 6, repMax: 12 });
  assert.deepEqual([n.load, n.reps], [0, 11]);
});

test('la journée en cours est exclue du calcul adaptatif', () => {
  const { weights, intakes, today } = series(30, 80, 0, 2500);
  const a = S.adaptiveTdee({ profile: man, weights, intakes, today });
  const b = S.adaptiveTdee({ profile: man, weights, intakes: { ...intakes, [today]: 400 }, today });
  assert.equal(a.tdee, b.tdee);
});

import * as H from '../js/habits.js';

test('habitudes : auto-cochage protéines/kcal et case manuelle', () => {
  const habits = [{ id: 'protein', auto: true }, { id: 'kcal', auto: true }, { id: 'sleep', name: 'Sommeil' }];
  const ctx = { totals: { p: 160, kcal: 2300, fib: 20 }, targets: { protein: 165, kcal: 2400, fiber: 30 }, water: 0, weighed: false, trained: false };
  const st = H.dayStatus(habits, ctx, { sleep: true });
  assert.deepEqual(st.map((s) => s.done), [true, true, true]);
  assert.equal(st[0].tappable, false);
  assert.equal(H.completion(st), 1);
});

test('série : aujourd\'hui incomplet ne casse pas la série', () => {
  const r = { '2026-01-10': 0.2, '2026-01-09': 1, '2026-01-08': 0.8, '2026-01-07': 0.5 };
  assert.equal(H.streak(r, '2026-01-10'), 2);
  assert.equal(H.streak({ ...r, '2026-01-10': 0.9 }, '2026-01-10'), 3);
});

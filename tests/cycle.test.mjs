import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/cycle.js';

const c = { enabled: true, cycleLen: 28, periodLen: 5, periods: [{ start: '2026-01-01', end: '2026-01-05' }, { start: '2026-01-30', end: '2026-02-03' }, { start: '2026-02-27' }] };

test('durées moyennes calculées depuis l\'historique', () => {
  assert.equal(C.avgCycleLen(c), 29); // (29 + 28) / 2 = 28,5 → 29
  assert.equal(C.avgPeriodLen(c), 5);
  assert.equal(C.avgCycleLen({ cycleLen: 30, periods: [{ start: '2026-01-01' }] }), 30);
});

test('phase d\'un jour : règles, ovulation, fenêtre fertile, SPM', () => {
  const base = { enabled: true, cycleLen: 28, periodLen: 5, periods: [{ start: '2026-03-01' }] };
  assert.equal(C.phaseOn(base, '2026-03-02').phase, 'menstruelle');
  assert.equal(C.phaseOn(base, '2026-03-14').phase, 'ovulatoire'); // jour 14
  assert.equal(C.phaseOn(base, '2026-03-09').fertile, true);       // jour 9 = O−5
  assert.equal(C.phaseOn(base, '2026-03-26').pms, true);           // jour 26
  assert.equal(C.phaseOn(base, '2026-03-31').predicted, true);     // cycle suivant prédit
  assert.equal(C.phaseOn({ ...base, enabled: false }, '2026-03-02'), null);
});

test('prédictions et contraception hormonale', () => {
  const base = { enabled: true, cycleLen: 28, periodLen: 5, periods: [{ start: '2026-03-01' }] };
  assert.deepEqual(C.nextStarts(base, '2026-03-10', 2), ['2026-03-29', '2026-04-26']);
  assert.equal(C.nextOvulation(base, '2026-03-10'), '2026-03-14');
  const h = { ...base, hormonal: true };
  assert.equal(C.phaseOn(h, '2026-03-14').fertile, false);
  assert.equal(C.nextOvulation(h, '2026-03-10'), null);
});

test('effets poids / entraînement et garde-fous', () => {
  const base = { enabled: true, cycleLen: 28, periodLen: 5, periods: [{ start: '2026-03-01' }], logs: { '2026-03-02': { symptoms: ['Crampes'] } } };
  assert.equal(C.weightNote(base, '2026-03-26'), 'retention');
  assert.equal(C.weightNote(base, '2026-03-10'), null);
  assert.equal(C.trainingNote(base, '2026-03-02'), 'ease');
  assert.deepEqual(C.alerts(base, '2026-07-01'), ['amenorrhea']);
  const irr = { enabled: true, periods: [{ start: '2026-01-01' }, { start: '2026-01-19' }, { start: '2026-02-06' }] };
  assert.deepEqual(C.alerts(irr, '2026-02-10'), ['irregular']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { addPortion, getPortions, weekDates, weekTotal, avg7 } from '../js/foodgroups.js';

test('addPortion ne descend pas sous 0', () => {
  const fg = {};
  assert.equal(addPortion(fg, '2026-11-04', 'fish', 1), 1);
  assert.equal(addPortion(fg, '2026-11-04', 'fish', -1), 0);
  assert.equal(addPortion(fg, '2026-11-04', 'fish', -1), 0);
});
test('semaine lundi → dimanche', () => {
  const w = weekDates('2026-11-04'); // mercredi
  assert.equal(w[0], '2026-11-02'); assert.equal(w[6], '2026-11-08');
  assert.equal(weekDates('2026-11-08')[0], '2026-11-02'); // dimanche
  assert.equal(weekDates('2026-11-02')[0], '2026-11-02'); // lundi
});
test('total semaine et moyenne 7 jours', () => {
  const fg = {};
  addPortion(fg, '2026-11-02', 'fish'); addPortion(fg, '2026-11-08', 'fish');
  addPortion(fg, '2026-11-09', 'fish');
  assert.equal(weekTotal(fg, '2026-11-05', 'fish'), 2);
  for (let i = 0; i < 7; i++) addPortion(fg, '2026-11-04', 'fruitVeg', 1);
  assert.equal(getPortions(fg, '2026-11-04', 'fruitVeg'), 7);
  assert.equal(avg7(fg, '2026-11-04', 'fruitVeg'), 1);
});

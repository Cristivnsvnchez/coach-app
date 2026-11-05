import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_FOODS } from '../js/foods-base.js';
import { searchBase } from '../js/food.js';

const ALCOOL = new Set(['base:biere', 'base:vin-rouge', 'base:vin-blanc', 'base:whisky']);

test('valeurs cohérentes (kcal ≈ 4p + 4c + 9f)', () => {
  for (const b of BASE_FOODS) {
    const { kcal, p, c, f, fib } = b.per100;
    for (const v of [kcal, p, c, f, fib]) assert.ok(Number.isFinite(v) && v >= 0, b.id);
    assert.ok(b.serving > 0, b.id + ' serving');
    if (ALCOOL.has(b.id)) continue;
    const calc = 4 * p + 4 * c + 9 * f;
    assert.ok(Math.abs(kcal - calc) <= Math.max(25, 0.25 * calc), `${b.id}: ${kcal} vs ${calc}`);
  }
});
test('ids uniques, 3 langues non vides', () => {
  const ids = new Set(BASE_FOODS.map((b) => b.id));
  assert.equal(ids.size, BASE_FOODS.length);
  for (const b of BASE_FOODS) {
    assert.equal(b.source, 'base');
    for (const l of ['fr', 'en', 'nl']) assert.ok(b.name[l] && b.name[l].trim(), b.id + ' ' + l);
  }
});
test('recherche insensible casse/accents, multilingue', () => {
  assert.ok(searchBase('banane').some((f) => f.id === 'base:banane'));
  assert.ok(searchBase('BANAAN').some((f) => f.id === 'base:banane'));
  assert.ok(searchBase('cafe').some((f) => f.id === 'base:cafe'));
  assert.equal(searchBase('banane', 'nl')[0].name, 'Banaan');
  assert.ok(searchBase('e').length <= 12);
  assert.deepEqual(searchBase('  '), []);
});

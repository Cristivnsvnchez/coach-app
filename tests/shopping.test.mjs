import test from 'node:test';
import assert from 'node:assert/strict';
import { dateRange, aggregatePlan, regenerate, knownStores, byStore, listToText } from '../js/shopping.js';

test('dateRange : n jours consécutifs à partir du départ', () => {
  const d = dateRange('2026-11-04', 3);
  assert.deepEqual(d, ['2026-11-04', '2026-11-05', '2026-11-06']);
});

test('aggregatePlan : somme les grammes par aliment sur plusieurs jours et repas', () => {
  const plan = {
    '2026-11-04': { dej: [{ foodId: 'banane', name: 'Banane', grams: 120 }], midi: [], diner: [{ foodId: 'riz', name: 'Riz', grams: 200 }], snack: [] },
    '2026-11-05': { dej: [{ foodId: 'banane', name: 'Banane', grams: 100 }], midi: [], diner: [], snack: [] },
  };
  const agg = aggregatePlan(plan, ['2026-11-04', '2026-11-05']);
  const banane = agg.find((a) => a.foodId === 'banane');
  assert.equal(banane.grams, 220);
  assert.equal(agg.find((a) => a.foodId === 'riz').grams, 200);
});

test('regenerate : garde les articles manuels et leur coche, régénère les articles auto', () => {
  const foods = { banane: { store: 'Albert Heijn' } };
  const prev = [
    { id: 'm1', foodId: null, name: 'Papier toilette', grams: 0, store: '', checked: true, auto: false },
    { id: 'banane', foodId: 'banane', name: 'Banane', grams: 100, store: '', checked: true, auto: true },
  ];
  const agg = [{ foodId: 'banane', name: 'Banane', grams: 220 }, { foodId: 'riz', name: 'Riz', grams: 200 }];
  const out = regenerate(prev, agg, foods);
  assert.equal(out.length, 3);
  const manual = out.find((x) => x.id === 'm1');
  assert.equal(manual.checked, true); // article manuel intact
  const banane = out.find((x) => x.foodId === 'banane');
  assert.equal(banane.grams, 220); // quantité mise à jour
  assert.equal(banane.checked, true); // coche conservée (même article)
  assert.equal(banane.store, 'Albert Heijn'); // magasin repris de l'aliment
  const riz = out.find((x) => x.foodId === 'riz');
  assert.equal(riz.checked, false); // nouvel article, pas encore coché
});

test('knownStores : magasins uniques déjà utilisés, triés', () => {
  const foods = { a: { store: 'Albert Heijn' }, b: { store: 'Lidl' }, c: { store: 'Albert Heijn' }, d: {} };
  assert.deepEqual(knownStores(foods), ['Albert Heijn', 'Lidl']);
});

test('byStore : groupe par magasin, non classé en dernier', () => {
  const list = [
    { name: 'Riz', store: 'Lidl' }, { name: 'Papier', store: '' }, { name: 'Banane', store: 'Albert Heijn' },
  ];
  const groups = byStore(list);
  assert.deepEqual(groups.map(([k]) => k), ['Albert Heijn', 'Lidl', '']);
});

test('listToText : articles non cochés groupés par magasin, non classés à la fin', () => {
  const list = [
    { id: '1', name: 'Papier', grams: 0, store: '', checked: false },
    { id: '2', name: 'Banane', grams: 240, store: 'Albert Heijn', checked: false },
    { id: '3', name: 'Riz', grams: 500, store: 'Albert Heijn', checked: true },
  ];
  const txt = listToText(list, { title: 'Liste de courses', unsorted: 'Non classé' });
  assert.equal(txt, 'Liste de courses\n\nAlbert Heijn\n- Banane (240 g)\n\nNon classé\n- Papier');
});

test('listToText : liste vide ou tout coché → chaîne vide', () => {
  assert.equal(listToText([], {}), '');
  assert.equal(listToText([{ id: '1', name: 'Riz', grams: 0, store: '', checked: true }], {}), '');
});

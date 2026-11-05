import test from 'node:test';
import assert from 'node:assert/strict';
import { dateRange, regenerate, knownStores, byStore, listToText, tripFor, tripDates, assignTrips, aggregateTrip, visibleTrips, tripDay, remapShopDay } from '../js/shopping.js';

test('dateRange : n jours consécutifs à partir du départ', () => {
  const d = dateRange('2026-11-04', 3);
  assert.deepEqual(d, ['2026-11-04', '2026-11-05', '2026-11-06']);
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

// 2026-11-05 = jeudi. Semaine suivante = lun. 9 → dim. 15 nov. ; samedi d'avant = 7 nov.
test('tripFor : un repas de la semaine prochaine tombe dans les courses du samedi d\'avant', () => {
  assert.equal(tripFor('2026-11-09', 6), '2026-11-07'); // lundi
  assert.equal(tripFor('2026-11-14', 6), '2026-11-07'); // samedi même semaine
  assert.equal(tripFor('2026-11-15', 6), '2026-11-07'); // dimanche
  assert.equal(tripFor('2026-11-16', 6), '2026-11-14'); // lundi suivant
  assert.equal(tripFor('2026-11-12', 0), '2026-11-08'); // courses le dimanche d'avant
  assert.equal(tripFor('2026-11-12', 1), '2026-11-09'); // courses le lundi : le jour même de la semaine
});

test('tripDates : les 7 jours (lun → dim) couverts par une sortie courses', () => {
  assert.deepEqual(tripDates('2026-11-07', 6), ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
});

test('regenerate par sortie : ne touche pas aux autres sorties, garde les articles auto supprimés masqués', () => {
  const prev = [
    { id: 'riz', foodId: 'riz', name: 'Riz', grams: 100, store: '', checked: false, auto: true, trip: '2026-10-31' },
    { id: 'pic', foodId: 'picanha', name: 'Picanha', grams: 400, store: '', checked: false, auto: true, trip: '2026-11-07', removed: true },
  ];
  const out = regenerate(prev, [{ foodId: 'picanha', name: 'Picanha', grams: 500 }], {}, '2026-11-07');
  assert.equal(out.find((x) => x.foodId === 'riz').trip, '2026-10-31');
  const pic = out.find((x) => x.foodId === 'picanha');
  assert.equal(pic.removed, true);
  assert.equal(pic.trip, '2026-11-07');
  assert.equal(out.length, 2);
});

test('listToText ignore les articles supprimés', () => {
  assert.equal(listToText([{ id: '1', name: 'Riz', grams: 0, store: '', checked: false, removed: true }], {}), '');
});

// ---- Rattachement des repas aux listes (tous les cas d'usage) — aujourd'hui = jeu. 5 nov., courses le samedi ----
const day = (items = {}) => ({ dej: [], midi: [], diner: [], snack: [], ...items });

test('assignTrips : repas du jour → liste du jour (le samedi d\'avant est déjà passé)', () => {
  const plan = { '2026-11-05': day({ midi: [{ id: 'a', foodId: 'riz', name: 'Riz', grams: 100 }] }) };
  assignTrips(plan, '2026-11-05', 6, []);
  assert.equal(plan['2026-11-05'].midi[0].trip, '2026-11-05');
});

test('assignTrips : repas de la semaine prochaine → courses du samedi d\'avant', () => {
  const plan = { '2026-11-10': day({ diner: [{ id: 'b', foodId: 'picanha', name: 'Picanha', grams: 400 }] }) };
  assignTrips(plan, '2026-11-05', 6, []);
  assert.equal(plan['2026-11-10'].diner[0].trip, '2026-11-07');
});

test('assignTrips : rattachement figé (le samedi passé, le repas reste sur la liste où il a été acheté)', () => {
  const plan = { '2026-11-10': day({ diner: [{ id: 'b', name: 'Picanha', grams: 400, trip: '2026-11-07' }] }) };
  assignTrips(plan, '2026-11-08', 6, []);
  assert.equal(plan['2026-11-10'].diner[0].trip, '2026-11-07');
});

test('assignTrips : courses du samedi faites → un repas ajouté ensuite va dans la liste du jour', () => {
  const plan = { '2026-11-10': day({ midi: [{ id: 'c', name: 'Saumon', grams: 200 }] }) };
  assignTrips(plan, '2026-11-07', 6, ['2026-11-07']); // on est samedi, liste déjà faite
  assert.equal(plan['2026-11-10'].midi[0].trip, '2026-11-07~2');
  const plan2 = { '2026-11-10': day({ midi: [{ id: 'd', name: 'Saumon', grams: 200 }] }) };
  assignTrips(plan2, '2026-11-06', 6, ['2026-11-07']); // vendredi, samedi marqué fait en avance
  assert.equal(plan2['2026-11-10'].midi[0].trip, '2026-11-06');
});

test('assignTrips : un repas passé n\'entre dans aucune liste', () => {
  const plan = { '2026-11-03': day({ midi: [{ id: 'e', name: 'Riz', grams: 100 }] }) };
  assignTrips(plan, '2026-11-05', 6, []);
  assert.equal(plan['2026-11-03'].midi[0].trip, undefined);
});

test('aggregateTrip : somme seulement les repas rattachés à cette liste', () => {
  const plan = {
    '2026-11-05': day({ midi: [{ foodId: 'riz', name: 'Riz', grams: 100, trip: '2026-11-05' }] }),
    '2026-11-10': day({ midi: [{ foodId: 'riz', name: 'Riz', grams: 150, trip: '2026-11-07' }], diner: [{ foodId: 'riz', name: 'Riz', grams: 50, trip: '2026-11-07' }] }),
  };
  assert.deepEqual(aggregateTrip(plan, '2026-11-07'), [{ foodId: 'riz', name: 'Riz', grams: 200 }]);
  assert.deepEqual(aggregateTrip(plan, '2026-11-05'), [{ foodId: 'riz', name: 'Riz', grams: 100 }]);
});

test('visibleTrips : liste du jour + prochain samedi + ancienne liste avec des articles pas cochés ; listes faites masquées', () => {
  const list = [
    { trip: '2026-10-31', name: 'Lait', checked: false },
    { trip: '2026-10-24', name: 'Pain', checked: true },
    { trip: '2026-10-17', name: 'Œufs', checked: false },
  ];
  assert.deepEqual(visibleTrips('2026-11-05', 6, list, {}, ['2026-10-17']), ['2026-10-31', '2026-11-05', '2026-11-07']);
  // Le samedi même : une seule liste (celle du jour est la liste du samedi).
  assert.deepEqual(visibleTrips('2026-11-07', 6, [], {}, []), ['2026-11-07']);
  // Samedi après « courses faites » : nouvelle liste du jour + samedi suivant.
  assert.deepEqual(visibleTrips('2026-11-07', 6, [], {}, ['2026-11-07']), ['2026-11-07~2', '2026-11-14']);
});

test('tripDay : date d\'une liste, même pour une 2e liste le même jour', () => {
  assert.equal(tripDay('2026-11-07~2'), '2026-11-07');
  assert.equal(tripDay('2026-11-07'), '2026-11-07');
});

test('remapShopDay : samedi → dimanche, les listes futures suivent ; liste du jour et listes passées ne bougent pas', () => {
  const plan = { '2026-11-10': day({ midi: [{ name: 'Riz', grams: 100, trip: '2026-11-07' }] }), '2026-11-05': day({ midi: [{ name: 'Pâtes', grams: 100, trip: '2026-11-05' }] }) };
  const list = [{ name: 'Riz', trip: '2026-11-07' }, { name: 'Pâtes', trip: '2026-11-05' }, { name: 'Lait', trip: '2026-10-31' }];
  remapShopDay(plan, list, 6, 0, '2026-11-05', []);
  assert.equal(plan['2026-11-10'].midi[0].trip, '2026-11-08');
  assert.deepEqual(list.map((x) => x.trip), ['2026-11-08', '2026-11-05', '2026-10-31']);
});

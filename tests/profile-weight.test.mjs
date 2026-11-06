import test from 'node:test';
import assert from 'node:assert/strict';
const mem = {}; globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: (k) => { delete mem[k]; } };
const S = await import('../js/store.js'); // `state` est remplacé par load() : toujours relire S.state
const { load, recordWeight, latestWeight, today } = S;

test('poids du Profil : devient la pesée du jour et le poids courant, même si des pesées existent', () => {
  load(); S.state.weights = [{ date: '2020-01-01', kg: 90 }]; S.state.profile.weight = 90;
  recordWeight(70);
  assert.equal(latestWeight(), 70);
  assert.equal(S.state.profile.weight, 70);
  assert.deepEqual(S.state.weights.find((w) => w.date === today()), { date: today(), kg: 70 });
  recordWeight(71); // deuxième saisie le même jour : remplace, n'ajoute pas
  assert.equal(S.state.weights.filter((w) => w.date === today()).length, 1);
  assert.equal(latestWeight(), 71);
});
test('poids du Profil : une valeur absurde ou vide ne touche à rien', () => {
  load(); S.state.weights = [{ date: '2020-01-01', kg: 90 }];
  for (const x of [null, 0, 7, 900]) recordWeight(x);
  assert.equal(latestWeight(), 90);
});

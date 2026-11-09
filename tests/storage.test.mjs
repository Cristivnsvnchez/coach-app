import test from 'node:test';
import assert from 'node:assert/strict';
import { requestPersistence } from '../js/store.js';

const nav = (persisted, grant, { throws = false } = {}) => {
  const calls = { persist: 0 };
  return { calls, storage: {
    persisted: async () => persisted,
    persist: async () => { calls.persist++; if (throws) throw new Error('refus'); return grant; },
  } };
};

test('stockage persistant : déjà protégé, pas de nouvelle demande', async () => {
  const n = nav(true, true);
  assert.equal(await requestPersistence(n), 'persisted');
  assert.equal(n.calls.persist, 0);
});

test('stockage persistant : demandé si pas encore protégé, accordé ou refusé', async () => {
  const yes = nav(false, true), no = nav(false, false);
  assert.equal(await requestPersistence(yes), 'granted');
  assert.equal(yes.calls.persist, 1);
  assert.equal(await requestPersistence(no), 'denied');
});

test('stockage persistant : navigateur sans support ou en erreur, sans planter', async () => {
  assert.equal(await requestPersistence({}), 'unsupported');
  assert.equal(await requestPersistence(undefined), 'unsupported');
  assert.equal(await requestPersistence(nav(false, true, { throws: true })), 'denied');
});

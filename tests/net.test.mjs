import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retryDelay, shouldRetry, fetchRetry } from '../js/net.js';

test('retryDelay : Retry-After prioritaire et plafonné, sinon backoff croissant', () => {
  assert.equal(retryDelay(0, '2'), 2000);
  assert.equal(retryDelay(0, '60'), 8000);
  const d0 = retryDelay(0), d2 = retryDelay(2);
  assert.ok(d0 >= 420 && d0 <= 780);
  assert.ok(d2 >= 1680 && d2 <= 3120);
});

test('shouldRetry : surcharge oui, erreurs client non', () => {
  for (const s of [429, 503, 529]) assert.ok(shouldRetry(s));
  for (const s of [400, 401, 404]) assert.ok(!shouldRetry(s));
});

test('fetchRetry : réessaie sur 529 puis renvoie la réponse OK', async () => {
  let n = 0;
  globalThis.fetch = async () => (++n < 2 ? new Response('', { status: 529, headers: { 'retry-after': '0' } }) : new Response('ok'));
  const r = await fetchRetry('x', {}, { retries: 2 });
  assert.equal(r.status, 200); assert.equal(n, 2);
});

test('fetchRetry : pas de nouvelle tentative sur 401', async () => {
  let n = 0;
  globalThis.fetch = async () => { n++; return new Response('', { status: 401 }); };
  const r = await fetchRetry('x');
  assert.equal(r.status, 401); assert.equal(n, 1);
});

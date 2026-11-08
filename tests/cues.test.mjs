import test from 'node:test';
import assert from 'node:assert/strict';
import { wakeController, restBeep } from '../js/cues.js';

// Doublures : un navigateur qui accorde des verrous et un document dont on change la visibilité.
function fakes({ grant = true } = {}) {
  const calls = { request: 0, release: 0 };
  const listeners = {};
  const doc = { visibilityState: 'visible', addEventListener: (n, f) => { listeners[n] = f; } };
  const nav = { wakeLock: { request: async () => {
    calls.request++;
    if (!grant) throw new Error('NotAllowedError');
    const ev = {};
    return { addEventListener: (n, f) => { ev[n] = f; }, release: async () => { calls.release++; ev.release?.(); } };
  } } };
  const hide = () => { doc.visibilityState = 'hidden'; };
  const show = async () => { doc.visibilityState = 'visible'; await listeners.visibilitychange?.(); await new Promise((r) => setTimeout(r)); };
  return { nav, doc, calls, hide, show };
}

test('écran allumé : verrou pris au début de la séance, relâché à la fin', async () => {
  const f = fakes(); const w = wakeController(f.nav, f.doc);
  await w.set(true);
  assert.equal(w.active, true);
  await w.set(true); // déjà actif : pas de seconde demande
  assert.equal(f.calls.request, 1);
  await w.set(false);
  assert.equal(w.active, false);
  assert.equal(f.calls.release, 1);
});

test("écran allumé : redemandé au retour dans l'app, pas après la fin de séance", async () => {
  const f = fakes(); const w = wakeController(f.nav, f.doc);
  await w.set(true);
  const lockRelease = f.calls.release;
  f.hide(); await w.set(true); // masqué : le système relâche, on ne redemande pas tant que c'est caché
  assert.equal(f.calls.request, 1);
  await f.show();
  assert.equal(f.calls.request, 1, 'verrou encore tenu : pas de doublon');
  await w.set(false);
  await f.show();
  assert.equal(f.calls.request, 1, 'séance finie : rien au retour');
  assert.equal(f.calls.release, lockRelease + 1);
});

test('écran allumé : refus et absence de support sans erreur', async () => {
  const f = fakes({ grant: false }); const w = wakeController(f.nav, f.doc);
  await w.set(true);
  assert.equal(w.active, false);
  const none = wakeController({}, f.doc);
  assert.equal(none.supported(), false);
  await none.set(true);
  assert.equal(none.active, false);
});

test('son de fin de repos : silencieux tant que le son n\'est pas débloqué', () => {
  assert.equal(restBeep(), false);
});

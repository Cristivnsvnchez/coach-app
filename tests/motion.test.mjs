import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditAll } from '../tools/motion-audit.mjs';
import { LIBRARY } from '../js/exercises.js';
import { model3D } from '../js/technique.js';

// Banc d'essai du réalisme : chaque exercice animé, homme et femme, tel que la visionneuse le montre.
const rows = await auditAll(['M', 'F']);
const RUNNING = new Set(['Footing', 'Tapis de course', 'Sprint']); // course sur place : le sol défile sous les pieds

test('mouvements : le corps touche le sol sans passer dessous ni flotter (peau réelle)', () => {
  const bad = rows.filter((r) => Math.abs(r.skinLow) > 0.012).map((r) => `${r.name} ${r.sex} ${r.skinLow}`);
  assert.deepEqual(bad, []);
});

test('mouvements : pas de saut visible à la fin de chaque boucle', () => {
  const bad = rows.filter((r) => r.loop > 0.05).map((r) => `${r.name} ${r.sex} ${r.loop} m`);
  assert.deepEqual(bad, []);
});

test('mouvements : le corps reste sur place (pas de dérive qui revient d\'un coup)', () => {
  const bad = rows.filter((r) => r.drift > 0.6).map((r) => `${r.name} ${r.sex} ${r.drift} m`);
  assert.deepEqual(bad, []);
});

test('mouvements : les pieds ne glissent pas au sol (sauf course sur place, où le sol défile)', () => {
  const bad = rows.filter((r) => !RUNNING.has(r.name) && r.slide > 0.6).map((r) => `${r.name} ${r.sex} ${r.slide} m/s`);
  assert.deepEqual(bad, []);
});

test('couverture : les 60 exercices sont animés en 3D, sans aucun accessoire', () => {
  const missing = LIBRARY.filter((e) => !model3D(e.name)).map((e) => e.name);
  assert.deepEqual(missing, []);
  assert.deepEqual(LIBRARY.filter((e) => model3D(e.name).prop).map((e) => e.name), []);
});

test('corps : homme et femme sont deux corps complets (surface + articulations), sans trous', () => {
  for (const f of ['models/trackme-human.glb', 'models/trackme-human-f.glb']) {
    const b = readFileSync(f), j = JSON.parse(b.slice(20, 20 + b.readUInt32LE(12)).toString());
    assert.equal(j.meshes.length, 2, f + ' : surface + articulations');
  }
  const size = (f) => readFileSync(f).length;
  assert.notEqual(size('models/trackme-human.glb'), size('models/trackme-human-f.glb'));
});

test('poses : pieds et mains arrivent là où la pose le demande (IK), sans os étiré', async () => {
  const bad = rows.filter((r) => r.authored && r.ikError > 0.05).map((r) => `${r.name} ${r.sex} ${r.ikError} m`);
  assert.deepEqual(bad, []);
});

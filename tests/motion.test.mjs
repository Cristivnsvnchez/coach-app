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

test('corps : homme et femme sont deux corps complets (peau, short ; brassière pour la femme)', () => {
  const sizes = [];
  for (const f of ['models/trackme-human.glb', 'models/trackme-human-f.glb']) {
    const b = readFileSync(f), j = JSON.parse(b.slice(20, 20 + b.readUInt32LE(12)).toString());
    const mats = j.materials.map((m) => m.name).join(' ');
    for (const z of ['TM_Skin', 'TM_Shorts', ...(f.includes('-f') ? ['TM_Top'] : [])]) assert.match(mats, new RegExp(z), f);
    assert.ok(b.length < 3.5e6, f + ' trop lourd pour iPhone');
    sizes.push(b.length);
  }
  assert.notEqual(sizes[0], sizes[1]);
});

test('poses : pieds et mains arrivent là où la pose le demande (IK), sans os étiré', async () => {
  const bad = rows.filter((r) => r.authored && r.ikError > 0.05).map((r) => `${r.name} ${r.sex} ${r.ikError} m`);
  assert.deepEqual(bad, []);
});

// Biomécanique : angles anatomiques image par image (voir LIMITS et EXCEPTIONS dans tools/motion-audit.mjs).
const bioBad = (filter) => rows.filter(filter).flatMap((r) => Object.entries(r.bio).map(([k, e]) => `${r.name} ${r.sex} — ${k} : ${e.value} (limite ${+(+e.limit).toFixed(1)})`));

test('biomécanique : les 33 mouvements par poses respectent les limites articulaires', () => {
  assert.deepEqual(bioBad((r) => r.authored), []);
});

test('biomécanique : les clips Mixamo gardés respectent les limites articulaires', () => {
  assert.deepEqual(bioBad((r) => !r.authored), []);
});

test('biomécanique : cheville, le pied reste dans l\'axe du tibia sur tous les mouvements', () => {
  const bad = rows.flatMap((r) => r.bio['pied/tibia : écart d\'orientation'] ? [`${r.name} ${r.sex} ${r.bio['pied/tibia : écart d\'orientation'].value}°`] : []);
  assert.deepEqual(bad, []);
});

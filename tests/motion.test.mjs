import test from 'node:test';
import assert from 'node:assert/strict';
import { auditAll } from '../tools/motion-audit.mjs';

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

test('accessoires : une barre tenue n\'apparaît que si la prise est stable, une barre sur le dos que si les mains sont aux épaules', () => {
  const bad = [];
  for (const r of rows) {
    if (r.prop === 'barHands' && r.gripMax - r.gripMin > 0.12) bad.push(`${r.name} ${r.sex} : mains ${r.gripMin}-${r.gripMax} m sur une barre rigide`);
    if (r.prop === 'barBack' && r.handShoulderMax > 0.42) bad.push(`${r.name} ${r.sex} : mains à ${r.handShoulderMax} m des épaules, barre sur le dos`);
    if (r.prop === 'kettlebell' && r.gripMax > 0.2) bad.push(`${r.name} ${r.sex} : mains écartées de ${r.gripMax} m sur une seule poignée`);
  }
  assert.deepEqual(bad, []);
});

test('supports : un mouvement qui monte et reste en hauteur (> 30 cm) a un support sous les pieds (box)', () => {
  const bad = rows.filter((r) => r.boxTop && r.prop !== 'box').map((r) => `${r.name} ${r.sex} : pieds posés à ${r.boxTop} m sans support`);
  assert.deepEqual(bad, []);
  const box = rows.filter((r) => r.prop === 'box');
  assert.ok(box.length && box.every((r) => r.boxTop > 0.25 && r.boxTop < 0.8), JSON.stringify(box.map((r) => r.boxTop)));
});

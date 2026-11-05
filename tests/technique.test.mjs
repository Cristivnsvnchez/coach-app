import test from 'node:test';
import assert from 'node:assert/strict';
import { LIBRARY } from '../js/exercises.js';
import { TECH, LEVELS, missingTechniques, getTechnique } from '../js/technique.js';

test('chaque exercice de la bibliothèque a une fiche complète FR/EN/NL', () => {
  assert.deepEqual(missingTechniques(), []);
  for (const { name } of LIBRARY) {
    const f = getTechnique(name);
    assert.ok(f, name);
    assert.ok(LEVELS.includes(f.level), `${name} niveau`);
    assert.ok(f.pose, `${name} pictogramme`);
    for (const l of ['fr', 'en', 'nl']) {
      assert.ok(f.steps[l].length >= 3 && f.steps[l].length <= 5, `${name} étapes ${l}`);
      assert.ok(f.mistakes[l].length >= 2 && f.mistakes[l].length <= 3, `${name} erreurs ${l}`);
      assert.ok(f.tips[l].length >= 2 && f.tips[l].length <= 3, `${name} conseils ${l}`);
      for (const s of [...f.steps[l], ...f.mistakes[l], ...f.tips[l]]) assert.ok(s.trim().length > 5);
    }
  }
});

test('aucune fiche orpheline (clé absente de la bibliothèque)', () => {
  const names = new Set(LIBRARY.map((e) => e.name));
  for (const k of Object.keys(TECH)) assert.ok(names.has(k), k);
});

test('model3D : chaque exercice avec un clip 3D pointe vers un fichier d\'animation qui existe', async () => {
  const { existsSync } = await import('node:fs');
  const { LIBRARY } = await import('../js/exercises.js');
  const { model3D } = await import('../js/technique.js');
  const withClip = LIBRARY.map((e) => model3D(e.name)).filter(Boolean);
  assert.ok(withClip.length >= 11, `au moins 11 exercices animés (trouvé ${withClip.length})`);
  for (const m of withClip) {
    assert.ok(existsSync(m.url), m.url);
    if (m.anim) assert.ok(existsSync(m.anim), `${m.name} → ${m.anim}`);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Garde-fou : tout texte t('…') doit avoir une entrée EN et NL (voir tests/i18n-scan.mjs).
test('i18n : aucune traduction EN ou NL manquante', () => {
  const out = execFileSync(process.execPath, ['tests/i18n-scan.mjs', '--json'], { encoding: 'utf8' });
  const miss = JSON.parse(out.trim().split('\n').pop());
  assert.deepEqual(miss, { en: [], nl: [] });
});

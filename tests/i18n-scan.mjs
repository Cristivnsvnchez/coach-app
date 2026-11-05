// Outil : liste les textes t('…') sans traduction EN ou NL (node tests/i18n-scan.mjs [--json]).
import { readFileSync, readdirSync } from 'node:fs';
globalThis.addEventListener ??= () => {}; globalThis.matchMedia ??= () => ({ matches: false });
const store = {}; globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };

const files = ['js/' , 'js/views/'].flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.js')).map((f) => d + f));
const i18n = await import('../js/i18n.js');
await import('../js/i18n/nl-base.js'); await import('../js/i18n/extra.js');
const failed = [];
for (const f of files) { try { await import('../' + f); } catch (e) { failed.push(f + ': ' + e.message.split('\n')[0]); } }
const keys = new Set();
const re = /\bt\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(re)) if (m[1] !== '`' || !m[2].includes('${')) keys.add(m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
const SAME = /^(kcal|Halo|Strava|TrackMe|Palette|Lagune|Papier|Aurora|Instagram|ok|OK|[\d\s{}%.,:–—\-/+]+)$/;
const miss = { en: [], nl: [] };
for (const l of ['en', 'nl']) { i18n.setLang(l); for (const k of keys) if (i18n.t(k) === k && !SAME.test(k)) miss[l].push(k); }
if (process.argv.includes('--json')) console.log(JSON.stringify(miss));
else console.log(`clés: ${keys.size} · EN manquantes: ${miss.en.length} · NL manquantes: ${miss.nl.length}\nimports en échec: ${failed.join(' | ') || 'aucun'}`);

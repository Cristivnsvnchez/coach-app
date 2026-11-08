// Outil de développement : essaie des réglages de poses clés et classe les combinaisons par le banc d'essai
// (tools/motion-audit.mjs), homme et femme. Les poses ne sont modifiées qu'en mémoire.
// node tools/pose-grid.mjs "<exercice>" '[[clés|"all", "champ", [valeurs…]], …]' [--fault]
//   clés : un indice, une liste d'indices ou "all" ; champ : clé de la pose (hips, torso, hand, foot, L, R…).
import { POSES } from '../js/poses.js';
import { auditOne } from './motion-audit.mjs';

const [name, spec] = process.argv.slice(2), fault = process.argv.includes('--fault');
const K = POSES[name].keys, grid = JSON.parse(spec), res = [];
const combos = grid.reduce((acc, [k, f, vals]) => acc.flatMap((c) => vals.map((v) => [...c, [k, f, v]])), [[]]);
for (const c of combos) {
  for (const [k, f, v] of c) for (const i of k === 'all' ? K.map((_, j) => j) : [].concat(k)) K[i][f] = v;
  let worst = 0; const txt = [];
  for (const sex of ['M', 'F']) {
    const r = await auditOne(name, sex, { fault });
    for (const [kk, e] of Object.entries(r.bio)) { worst += e.value / (e.limit || 0.01); txt.push(`${sex} ${kk} ${e.value}`); }
    if (r.ikError > 0.03) { txt.push(`${sex} IK ${r.ikError}`); worst += r.ikError * 50; }
  }
  res.push([txt.length, worst.toFixed(2), JSON.stringify(c.map((x) => x[2])), txt.join(' | ')]);
}
res.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
console.log(res.slice(0, 6).map((r) => r.join('  ')).join('\n'));

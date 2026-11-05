// Corrections des clips Mixamo avant affichage (pures, partagées par la visionneuse, le banc d'essai
// tools/motion-audit.mjs et le rendu des vignettes) : une animation doit rester sur place et boucler sans saut.

// Valeur d'une piste à l'image i (tableau de `size` nombres).
const at = (tr, i) => Array.from(tr.values.subarray(i * tr.getValueSize(), (i + 1) * tr.getValueSize()));

// 1. Dérive : le bassin finit ailleurs qu'au départ (sprint qui avance, répétition qui recule) → on retire la
// translation nette, répartie linéairement sur le clip. Le rebond et le balancement restent.
function removeDrift(clip) {
  const tr = clip.tracks.find((t) => /Hips\.position$/.test(t.name));
  if (!tr || tr.times.length < 2) return;
  const n = tr.times.length, s = tr.getValueSize(), a = at(tr, 0), b = at(tr, n - 1), T = tr.times[n - 1] - tr.times[0];
  const d = a.map((x, k) => b[k] - x);
  // Axe vertical du squelette = plus grande composante à la 1re image (les clips « sur place » partent centrés :
  // seule la hauteur du bassin est grande). On ne retire que la dérive horizontale, sinon une répétition qui
  // finit debout s'enfoncerait ou décollerait.
  const abs = a.map(Math.abs); d[abs.indexOf(Math.max(...abs))] = 0;
  if (Math.hypot(...d) < 1e-6) return;
  for (let i = 0; i < n; i++) {
    const w = (tr.times[i] - tr.times[0]) / T;
    for (let k = 0; k < s; k++) tr.values[i * s + k] -= d[k] * w;
  }
}

// 2. Raccord de boucle : si la dernière pose diffère de la première (une seule répétition, qui ne revient pas au
// départ), on ajoute un retour vers la pose de départ (positions en ligne droite, rotations en slerp).
const quatAngle = (p, q) => 2 * Math.acos(Math.min(1, Math.abs(p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3])));
function slerp(p, q, t) {
  let dot = p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3];
  const qq = dot < 0 ? q.map((x) => -x) : q; dot = Math.abs(dot);
  if (dot > 0.9995) { const r = p.map((x, k) => x + (qq[k] - x) * t); const l = Math.hypot(...r); return r.map((x) => x / l); }
  const th = Math.acos(dot), s = Math.sin(th), a = Math.sin((1 - t) * th) / s, b = Math.sin(t * th) / s;
  return p.map((x, k) => a * x + b * qq[k]);
}
export function loopGap(clip) {
  let rot = 0, pos = 0;
  for (const tr of clip.tracks) {
    const n = tr.times.length; if (n < 2) continue;
    if (/quaternion$/.test(tr.name)) rot = Math.max(rot, quatAngle(at(tr, 0), at(tr, n - 1)));
    else if (/position$/.test(tr.name)) pos = Math.max(pos, Math.hypot(...at(tr, 0).map((x, k) => x - at(tr, n - 1)[k])));
  }
  return { rot, pos };
}
// Retour calme ajouté APRÈS la répétition (elle reste intacte) : on prolonge chaque piste de `extra` secondes,
// de la dernière pose vers la première, en douceur — comme on repose la barre avant la répétition suivante.
function closeLoop(clip, extra) {
  const T = clip.duration, steps = Math.max(4, Math.round(extra * 30));
  for (const tr of clip.tracks) {
    const n = tr.times.length; if (n < 1) continue;
    const s = tr.getValueSize(), first = at(tr, 0), last = at(tr, n - 1), quat = /quaternion$/.test(tr.name);
    const times = new Float32Array(n + steps), values = new Float32Array((n + steps) * s);
    times.set(tr.times); values.set(tr.values);
    if (tr.times[n - 1] < T) { /* piste plus courte que le clip : elle tient sa dernière valeur jusqu'à T */ }
    for (let j = 1; j <= steps; j++) {
      const u = j / steps, w = u * u * (3 - 2 * u);
      const out = quat ? slerp(last, first, w) : last.map((x, k) => x + (first[k] - x) * w);
      times[n + j - 1] = T + extra * u;
      values.set(out, (n + j - 1) * s);
    }
    tr.times = times; tr.values = values;
  }
  clip.duration = T + extra;
}

// Seuils : en dessous, le clip boucle déjà proprement et on n'y touche pas.
const GAP_ROT = 0.12; // rad (~7°)
const GAP_POS = 3;    // unités du squelette Mixamo (cm avant la mise à l'échelle)

// Prépare un clip une seule fois (marqué, car les clips sont partagés via le cache des glb).
export function prepareClip(clip) {
  if (!clip || clip.userData?.tmPrepared) return clip;
  clip.userData = { ...(clip.userData || {}), tmPrepared: true };
  removeDrift(clip);
  const g = loopGap(clip);
  if (g.rot > GAP_ROT || g.pos > GAP_POS) closeLoop(clip, 1.2);
  return clip;
}

// Box du box jump : d'après les images où plus rien ne touche le sol pendant un moment (point de peau le plus bas
// > 25 cm, au moins 3 images : pas un simple saut), hauteur du dessus de la box et position (milieu des pieds).
// `frames` : [{ skin: y le plus bas de la peau, feet: [Vector3…] }] en coordonnées monde, sol à y = 0.
export function landingBox(frames) {
  const up = frames.filter((f) => f.skin > 0.25);
  if (up.length < 3) return null;
  const ys = up.map((f) => f.skin).sort((a, b) => a - b);
  const top = ys[Math.floor(ys.length / 2)];
  let x = 0, z = 0; for (const f of up) for (const q of f.feet) { x += q.x / (up.length * f.feet.length); z += q.z / (up.length * f.feet.length); }
  return { top, x, z };
}

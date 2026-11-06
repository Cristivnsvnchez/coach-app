// Banc d'essai du réalisme des mouvements 3D (sous Node, sans navigateur) : charge chaque corps + animation comme la
// visionneuse (corps normalisé à 1,75 m, pieds au sol), échantillonne le clip et mesure ce qui trahit un mouvement
// faux. Utilisé par tests/motion.test.mjs ; lancé seul, affiche le tableau : `node tools/motion-audit.mjs`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from '../vendor/three/three.module.min.js';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import { clone } from '../vendor/three/SkeletonUtils.js';
import { model3D } from '../js/technique.js';
import { LIBRARY } from '../js/exercises.js';
import { prepareClip, landingBox } from '../js/motion-fix.js';
import { buildPoseClip } from '../js/poses.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const cache = new Map();
const parse = (f) => {
  if (!cache.has(f)) cache.set(f, new Promise((res, rej) => {
    const b = readFileSync(ROOT + f);
    new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', res, rej);
  }));
  return cache.get(f);
};

const N = 60; // instants échantillonnés par clip
const v = () => new THREE.Vector3();

export async function auditOne(name, sex = 'M') {
  const m = model3D(name, sex); if (!m) return null;
  const body = await parse(m.url), anim = m.anim ? await parse(m.anim) : null;
  const obj = clone(body.scene);
  const clip = m.pose ? buildPoseClip(THREE, obj, m.pose, m.clip) : prepareClip(anim?.animations[0] || body.animations[0]); // mêmes corrections que la visionneuse
  const bone = (re) => { let b = null; obj.traverse((o) => { if (!b && o.isBone && re.test(o.name)) b = o; }); return b; };
  const bones = []; obj.traverse((o) => { if (o.isBone) bones.push(o); });
  // Normalisation identique à la visionneuse : 1,75 m de la tête aux orteils, pieds au sol, centré.
  obj.updateMatrixWorld(true);
  const top = bone(/HeadTop_End/).getWorldPosition(v()), foot = (bone(/LeftToe_?End/) || bone(/LeftFoot/)).getWorldPosition(v());
  obj.scale.multiplyScalar(1.75 / Math.max(0.01, top.y - foot.y)); obj.updateMatrixWorld(true);
  const f2 = (bone(/LeftToe_?End/) || bone(/LeftFoot/)).getWorldPosition(v()), h0 = bone(/Hips$/).getWorldPosition(v());
  obj.position.set(-h0.x, -f2.y, -h0.z);
  const mixer = new THREE.AnimationMixer(obj); mixer.clipAction(clip).play();
  const feet = [/LeftToe_?End/, /RightToe_?End/, /LeftFoot$/, /RightFoot$/].map(bone).filter(Boolean);
  const [hips, lh, rh, ls, rs] = [/Hips$/, /LeftHand$/, /RightHand$/, /LeftShoulder$/, /RightShoulder$/].map(bone);
  // Peau réelle (sommets skinnés, 1 sur 15) : seul moyen de juger le contact au sol (un os est au centre du membre).
  const skins = []; obj.traverse((o) => { if (o.isSkinnedMesh) skins.push(o); });
  const skinMin = () => { let y = Infinity; const t = v(); for (const s of skins) { const n = s.geometry.attributes.position.count;
    for (let k = 0; k < n; k += 15) { s.getVertexPosition(k, t); t.applyMatrix4(s.matrixWorld); if (t.y < y) y = t.y; } } return y; };
  const frames = [];
  for (let i = 0; i <= N; i++) {
    // i = N : juste avant la fin (setTime(duration) retombe sur 0 en boucle) pour mesurer le raccord.
    mixer.setTime(i === N ? clip.duration - 1e-3 : (clip.duration * i) / N); obj.updateMatrixWorld(true);
    const p = (b) => b.getWorldPosition(v());
    frames.push({ all: bones.map(p), feet: feet.map(p), hips: p(hips), lh: p(lh), rh: p(rh), ls: p(ls), rs: p(rs), skin: skinMin() });
  }
  // Sol comme la visionneuse : le point de peau le plus bas sur tout le clip est posé à y = 0.
  const ground = Math.min(...frames.map((f) => f.skin));
  for (const f of frames) { f.skin -= ground; for (const q of [...f.all, ...f.feet, f.hips, f.lh, f.rh, f.ls, f.rs]) q.y -= ground; }
  const dt = clip.duration / N;
  // 1. Sol : point le plus bas du corps (négatif = sous le sol) et des pieds (les pieds doivent toucher le sol).
  const bodyMin = Math.min(...frames.flatMap((f) => f.all.map((q) => q.y)));
  const feetMin = Math.min(...frames.map((f) => Math.min(...f.feet.map((q) => q.y))));
  // 2. Glissade : vitesse horizontale moyenne d'un pied pendant qu'il est posé (< 4 cm du sol), en m/s.
  let slide = 0, slideT = 0;
  for (let i = 1; i < frames.length; i++) for (let k = 0; k < feet.length; k++) {
    const a = frames[i - 1].feet[k], b = frames[i].feet[k];
    if (a.y < 0.04 && b.y < 0.04) { slide += Math.hypot(b.x - a.x, b.z - a.z); slideT += dt; }
  }
  // 3. Dérive : le bassin s'éloigne de sa position de départ (le clip doit rester sur place).
  const drift = Math.max(...frames.map((f) => Math.hypot(f.hips.x - frames[0].hips.x, f.hips.z - frames[0].hips.z)));
  // 4. Raccord de boucle : écart moyen des os entre la dernière et la première image (saut visible à chaque boucle).
  const last = frames[frames.length - 1], loop = last.all.reduce((s, q, k) => s + q.distanceTo(frames[0].all[k]), 0) / bones.length;
  // 5. Prise de barre : écart des mains (une barre rigide impose un écart à peu près constant) et distance mains-épaules.
  const grip = frames.map((f) => f.lh.distanceTo(f.rh));
  const handShoulder = Math.max(...frames.map((f) => Math.max(f.lh.distanceTo(f.ls), f.rh.distanceTo(f.rs))));
  // 6. Peau : plus bas point sur tout le clip (référence du sol) et hauteur de vol maximale au-dessus.
  const skinLow = Math.min(...frames.map((f) => f.skin)), skinHigh = Math.max(...frames.map((f) => f.skin));
  const box = landingBox(frames);
  const r = (x, d = 2) => +x.toFixed(d);
  return { name, sex, clip: m.clip, authored: !!m.pose, ikError: r(clip.userData?.ikError ?? 0), equipment: m.equipment, prop: m.prop, duration: r(clip.duration),
    bodyMin: r(bodyMin, 3), feetMin: r(feetMin, 3), slide: slideT ? r(slide / slideT, 3) : 0, drift: r(drift), loop: r(loop, 3),
    gripMin: r(Math.min(...grip)), gripMax: r(Math.max(...grip)), handShoulderMax: r(handShoulder), skinLow: r(skinLow, 3), skinAir: r(skinHigh - skinLow), boxTop: box ? r(box.top) : null };
}

export async function auditAll(sexes = ['M', 'F']) {
  const out = [];
  for (const sex of sexes) for (const e of LIBRARY) { const a = await auditOne(e.name, sex); if (a) out.push(a); }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = await auditAll(process.argv.includes('--f') ? ['F'] : ['M']);
  console.table(rows.map(({ name, equipment, skinLow, skinAir, slide, drift, loop, gripMin, gripMax, handShoulderMax }) =>
    ({ name, eq: equipment, skinLow, air: skinAir, slide, drift, loop, grip: `${gripMin}-${gripMax}`, hS: handShoulderMax })));
}

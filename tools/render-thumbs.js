// Outil de développement (pas chargé par l'app) : rend les vignettes « avatar » des exercices animés,
// 2 poses par exercice (départ + pose la plus éloignée), homme et femme, en WebP transparent 640×640.
// Usage : dans la page TrackMe servie en local, `const m = await import('/tools/render-thumbs.js'); await m.renderAll(post)`
// où post(path, base64) enregistre le fichier (récepteur local de développement).
import * as THREE from '../vendor/three/three.module.min.js';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import { clone } from '../vendor/three/SkeletonUtils.js';
import { model3D, outfitsFor } from '../js/technique.js';
import { LIBRARY } from '../js/exercises.js';
import { prepareClip } from '../js/motion-fix.js';
import { buildPoseClip } from '../js/poses.js';

const SIZE = 640;
const loader = new GLTFLoader();
const cache = new Map();
const load = (u) => { if (!cache.has(u)) cache.set(u, loader.loadAsync(u)); return cache.get(u); };

function setup() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(SIZE, SIZE);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f9c, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2.5, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb9c8ff, 1.2); rim.position.set(-3, 2.5, -2.5); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  return { renderer, scene, camera };
}

// Corps habillé (tenue par défaut du sexe), sans la lueur musculaire de la visionneuse.
function dress(obj, outfit) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    // Matériaux opaques neufs, comme la visionneuse (ceux du glb peuvent être transparents → trous dans le corps).
    o.material = mats.map((m) => {
      const kind = /short|pantslong/i.test(m.name) ? 'shorts' : /shoe/i.test(m.name) && !/sole/i.test(m.name) ? 'shoes' : /top|sleeve/i.test(m.name) ? 'top' : 'skin';
      const color = kind === 'skin' ? 0xeceef2 : outfit[kind] ?? m.color;
      return new THREE.MeshStandardMaterial({ color, roughness: kind === 'skin' ? 0.5 : 0.78, metalness: 0 });
    });
    if (o.material.length === 1) o.material = o.material[0];
    o.frustumCulled = false;
  });
}

const bones = (obj) => { const b = []; obj.traverse((o) => { if (o.isBone) b.push(o); }); return b; };

export async function renderOne(ctx, name, sex) {
  const m = model3D(name, sex); if (!m) return null;
  const body = await load(m.url), anim = m.anim ? await load(m.anim) : null;
  const obj = clone(body.scene); dress(obj, outfitsFor(sex)[0]);
  const clip = m.pose ? buildPoseClip(THREE, obj, m.pose, m.clip) : prepareClip(anim?.animations[0] || body.animations[0]); // mêmes corrections que la visionneuse
  ctx.scene.add(obj);
  const mixer = new THREE.AnimationMixer(obj); mixer.clipAction(clip).play();
  const bs = bones(obj);
  const sample = (t) => { mixer.setTime(t); obj.updateMatrixWorld(true); return bs.map((b) => b.getWorldPosition(new THREE.Vector3())); };
  // Sol comme la visionneuse : point de peau le plus bas sur tout le clip à y = 0.
  const skins = []; obj.traverse((o) => { if (o.isSkinnedMesh) skins.push(o); });
  const tv = new THREE.Vector3();
  let ground = Infinity;
  for (let i = 0; i < 24; i++) { mixer.setTime((clip.duration * i) / 24); obj.updateMatrixWorld(true);
    for (const sk of skins) for (let k = 0; k < sk.geometry.attributes.position.count; k += 15) { sk.getVertexPosition(k, tv); tv.applyMatrix4(sk.matrixWorld); ground = Math.min(ground, tv.y); } }
  if (Number.isFinite(ground)) obj.position.y -= ground;
  // Échelle 1,75 m d'après le corps au repos (comme la visionneuse), pieds au sol.
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3(), N = 24, frames = [];
  for (let i = 0; i < N; i++) { const p = sample((clip.duration * i) / N); frames.push(p); p.forEach((v) => box.expandByPoint(v)); }
  // Pose 2 : la plus éloignée de la pose de départ (somme des déplacements des os).
  let best = 0, bestD = -1;
  frames.forEach((p, i) => { const d = p.reduce((s, v, k) => s + v.distanceTo(frames[0][k]), 0); if (d > bestD) { bestD = d; best = i; } });
  // Cadrage commun aux 2 poses montrées (pas tout le mouvement : vignette plus grande), vue 3/4 légèrement plongeante.
  // Chaque pose est centrée sur elle-même (un sprint avance), à la même distance pour garder la même échelle.
  const boxes = [0, best].map((i) => new THREE.Box3().setFromPoints(frames[i]));
  const r = Math.max(...boxes.map((b) => { const s = b.getSize(new THREE.Vector3()); return Math.max(s.x, s.y, s.z); })) * 0.5 + 0.12; // marge tête et mains
  const dist = r / Math.sin(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
  const dir = new THREE.Vector3(0.62, 0.22, 1).normalize(); // le corps regarde vers +Z : vue 3/4 de face
  const shots = [];
  for (const [k, i] of [0, best].entries()) {
    const c = boxes[k].getCenter(new THREE.Vector3());
    ctx.camera.position.copy(c).addScaledVector(dir, dist); ctx.camera.lookAt(c); ctx.camera.updateProjectionMatrix();
    sample((clip.duration * i) / N);
    ctx.renderer.render(ctx.scene, ctx.camera);
    const blob = await new Promise((res) => ctx.renderer.domElement.toBlob(res, 'image/webp', 0.86));
    const b64 = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
    shots.push(b64);
  }
  ctx.scene.remove(obj);
  return { clip: m.clip, shots };
}

export async function renderAll(post, { names = null, sexes = ['M', 'F'] } = {}) {
  const ctx = setup(), done = {};
  const list = names || LIBRARY.filter((e) => model3D(e.name)).map((e) => e.name);
  const seen = new Set();
  for (const sex of sexes) {
    for (const name of list) {
      const m = model3D(name, sex); if (!m || seen.has(sex + m.clip)) continue;
      seen.add(sex + m.clip);
      const r = await renderOne(ctx, name, sex);
      const dir = sex === 'F' ? 'f' : 'm';
      for (let k = 0; k < 2; k++) await post(`img/ex/${dir}/${r.clip}-${k + 1}.webp`, r.shots[k]);
      done[dir + '/' + r.clip] = true;
    }
  }
  ctx.renderer.dispose();
  return Object.keys(done);
}

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
// Sous Node il n'y a pas d'images : on retire les textures du glb (seule la géométrie compte ici).
function withoutTextures(b) {
  const len = b.readUInt32LE(12), j = JSON.parse(b.subarray(20, 20 + len).toString());
  if (!j.textures) return b;
  for (const m of j.materials || []) { delete m.pbrMetallicRoughness?.baseColorTexture; delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture; delete m.pbrMetallicRoughness?.metallicRoughnessTexture; }
  delete j.textures; delete j.images; delete j.samplers;
  j.extensionsUsed = (j.extensionsUsed || []).filter((e) => e !== 'EXT_texture_webp'); j.extensionsRequired = (j.extensionsRequired || []).filter((e) => e !== 'EXT_texture_webp');
  let t = Buffer.from(JSON.stringify(j)); if (t.length % 4) t = Buffer.concat([t, Buffer.alloc(4 - t.length % 4, 0x20)]);
  const rest = b.subarray(20 + len), head = Buffer.alloc(20); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(20 + t.length + rest.length, 8); head.writeUInt32LE(t.length, 12); head.writeUInt32LE(0x4E4F534A, 16);
  return Buffer.concat([head, t, rest]);
}
const parse = (f) => {
  if (!cache.has(f)) cache.set(f, new Promise((res, rej) => {
    const g = withoutTextures(readFileSync(ROOT + f));
    new GLTFLoader().parse(g.buffer.slice(g.byteOffset, g.byteOffset + g.byteLength), '', res, rej);
  }));
  return cache.get(f);
};

const N = 60; // instants échantillonnés par clip
const v = () => new THREE.Vector3();


// ───────────── Biomécanique : angles anatomiques par image ─────────────
// Flexions : angles entre segments, calculés depuis les positions des os. Rotations axiales, varus/valgus, inversion :
// invisibles dans les positions (un os tourne autour de son axe sans bouger ses extrémités), or c'est le défaut signalé
// par l'utilisateur (cheville tordue) : ils sont calculés depuis l'orientation des os par rapport au repos.
// Convention de Grood & Suntay : flexion sur l'axe du segment proximal, rotation axiale sur l'axe du segment distal.
// Repère : X = gauche du personnage, Y = haut, Z = avant. Au repos (bras en T, jambes presque droites, pied à plat) D = identité.
export const LIMITS = {
  knee: { flexMax: 150, hyperMax: 5, valgusMax: 15, rotBase: 15, rotPerFlex: 0.35, rotMax: 45 }, // le tibia ne tourne presque pas genou tendu
  ankle: { dorsiMax: 30, plantarMax: 50, invMax: 20, yawMax: 15 }, // yaw : écart d'orientation pied / tibia
  elbow: { flexMax: 150, hyperMax: 5, varusMax: 20, pronoMax: 95 },
  wrist: { flexMax: 80, extMax: 75, devMax: 35, twistMax: 30 },
  shoulder: { axialMax: 120 },
  hip: { flexMax: 130, extMax: 30, abdMax: 55, addMax: 30, rotMax: 50 },
  spine: { linkFlex: 35, linkExt: 15, linkLat: 20, linkTwist: 20, totalFlex: 85, totalExt: 40, totalLat: 40, totalTwist: 50, kink: 25 },
  neck: { flexMax: 70, extMax: 60, latMax: 45, twistMax: 80 },
  speed: { strength: 500, ballistic: 1300 }, // °/s : un mouvement de force reste loin de ce qu'atteint un sprint (~1000 °/s)
  soleTilt: 8, plantTravel: 0.02, sym: { mean: 8, max: 15 }, handBody: 0.085,
};
// Exceptions : chacune avec sa raison, jamais une limite relâchée pour tout le monde. Clé : exercice → { contrôle: valeur }.
export const EXCEPTIONS = {};
const UNILATERAL = new Set(['Fentes bulgares', 'Fentes marchées', 'Squat pistol', 'Rowing haltère', 'Crunch vélo', 'Footing', 'Tapis de course', 'Sprint', 'Étirement de la nuque', 'Étirement des bras', 'Échauffement', 'Épaulé-jeté', 'Burpee']);
const BALLISTIC = new Set(['Burpee', 'Arraché', 'Épaulé-jeté', 'Box jump', 'Pompes sautées', 'Jumping jacks', 'Corde à sauter', 'Footing', 'Tapis de course', 'Sprint', 'Kettlebell swing', 'Échauffement']);
// Pieds censés rester à plat et immobiles pendant tout le mouvement (l'exercice ne décolle pas les talons).
const FLAT_FEET = new Set(['Squat', 'Squat avant', 'Squat overhead', 'Soulevé de terre', 'Soulevé de terre roumain', 'Tirage sumo', 'Rowing barre', 'Rowing haltère', 'Développé militaire', 'Développé épaules haltères', 'Élévations latérales', 'Élévations frontales', 'Face pull', 'Curl haltères', 'Curl barre', 'Curl marteau', 'Extensions triceps', 'Écarté poulie', 'Hip thrust', 'Développé couché', 'Développé couché haltères', 'Développé incliné haltères', 'Barre au front', 'Étirement de la nuque']);
// Pied avant seul à plat pendant la fente, pied arrière sur les orteils (pas de limite de planéité sur lui).
const FLAT_FRONT = { 'Fentes bulgares': 'Right', 'Fentes marchées': 'Right' };
const STILL_FEET = new Set([...FLAT_FEET, 'Fentes bulgares', 'Mollets debout', 'Mollets assis', 'Leg extension', 'Tirage horizontal']);
// Mouvements couchés : le dos repose au sol au moins pendant la position de départ (sinon le corps flotte).
const LYING = new Set(['Développé couché', 'Développé couché haltères', 'Barre au front', 'Relevés de jambes', 'Hip thrust', 'Presse à cuisses', 'Sit-up', 'Gainage / crunch', 'Crunch vélo', 'Crunch circulaire']);
export const AUDIT_SETS = { UNILATERAL, BALLISTIC, FLAT_FEET, STILL_FEET, LYING };

const DEG = 180 / Math.PI;
const quatOf = (b) => b.getWorldQuaternion(new THREE.Quaternion());
const euler = new THREE.Euler();
const rel = (dp, dd) => dp.clone().invert().multiply(dd);
const ang = (o, a) => { euler.setFromQuaternion(a, o); return [euler.x * DEG, euler.y * DEG, euler.z * DEG]; };
const angleBetween = (a, b) => a.angleTo(b) * DEG;
const quatAngleDeg = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.dot(b)))) * DEG;

function restFrame(obj, names) {
  const rest = {};
  for (const [k, b] of Object.entries(names)) rest[k] = { q: quatOf(b).invert(), p: b.getWorldPosition(v()) };
  const r = (a, b) => rest[b].p.clone().sub(rest[a].p).normalize();
  const flexOf = (a, b, c) => { const u = r(a, b), w = r(b, c); return angleBetween(u, w); };
  const abd = (S) => { const u = r(S + 'UpLeg', S + 'Leg'); return Math.atan2(Math.abs(u.x), -u.y) * DEG; };
  return { rest, kneeRest: { Left: flexOf('LeftUpLeg', 'LeftLeg', 'LeftFoot'), Right: flexOf('RightUpLeg', 'RightLeg', 'RightFoot') }, abd: { Left: abd('Left'), Right: abd('Right') } };
}

// Angles d'une image. `B` : os par nom court, `R` : mesure au repos.
function measure(B, R) {
  const d = {}, P = {};
  for (const k of Object.keys(B)) { d[k] = quatOf(B[k]).multiply(R.rest[k].q); P[k] = B[k].getWorldPosition(v()); }
  const m = {};
  for (const [S, sg] of [['Left', 1], ['Right', -1]]) {
    // Genou : angle cuisse/tibia depuis les positions, signe (hyperextension) depuis l'orientation.
    const th = P[S + 'Leg'].clone().sub(P[S + 'UpLeg']), sh = P[S + 'Foot'].clone().sub(P[S + 'Leg']);
    const [kx, ky, kz] = ang('XZY', rel(d[S + 'UpLeg'], d[S + 'Leg'])); // kx : flexion, kz : valgus (signé), ky : rotation du tibia
    const kPos = angleBetween(th, sh), kFlex = kx + R.kneeRest[S] < 0 ? -kPos : kPos;
    m['knee.flex.' + S] = kFlex; m['knee.valgus.' + S] = kz * sg; m['knee.rot.' + S] = ky * sg;
    // Cheville : flexion plantaire/dorsale, écart pied/tibia (yaw), inversion/éversion.
    const [ax, ay, az] = ang('XYZ', rel(d[S + 'Leg'], d[S + 'Foot']));
    m['ankle.plantar.' + S] = ax; m['ankle.yaw.' + S] = ay * sg; m['ankle.ev.' + S] = az * sg;
    // Hanche (bassin → cuisse).
    const [hx, hy, hz] = ang('XZY', rel(d.Hips, d[S + 'UpLeg']));
    m['hip.flex.' + S] = -hx; m['hip.abd.' + S] = hz * sg + R.abd[S]; m['hip.rot.' + S] = hy * sg;
    // Coude : la flexion amène l'avant-bras vers l'avant du corps (autour de Y au repos, bras en T).
    const up = P[S + 'ForeArm'].clone().sub(P[S + 'Arm']), fo = P[S + 'Hand'].clone().sub(P[S + 'ForeArm']);
    const [ex, ey, ez] = ang('YZX', rel(d[S + 'Arm'], d[S + 'ForeArm']));
    const eFlex = -ey * sg;
    m['elbow.flex.' + S] = eFlex < 0 ? -angleBetween(up, fo) : angleBetween(up, fo); m['elbow.varus.' + S] = ez * sg; m['elbow.prono.' + S] = ex * sg;
    // Poignet.
    const [wx, wy, wz] = ang('ZYX', rel(d[S + 'ForeArm'], d[S + 'Hand']));
    m['wrist.flex.' + S] = -wz * sg; m['wrist.dev.' + S] = wy * sg; m['wrist.twist.' + S] = wx * sg;
    // Épaule : direction du bras dans le repère du tronc (x vers l'extérieur, y haut, z avant).
    const a = up.clone().normalize().applyQuaternion(d.Spine2.clone().invert()); const ax2 = a.x * sg, ay2 = a.y, az2 = a.z;
    const back = az2 < 0 ? Math.asin(Math.min(1, -az2)) * DEG : 0, med = ax2 < 0 ? Math.asin(Math.min(1, -ax2)) * DEG : 0;
    m['shoulder.back.' + S] = back; m['shoulder.backMax.' + S] = 45 - (ay2 > 0 ? 20 * ay2 : -20 * -ay2);
    m['shoulder.medial.' + S] = med; m['shoulder.medialMax.' + S] = 50 * Math.max(az2, 0) + 25 * (1 - Math.max(az2, 0));
    // Rotation axiale de l'humérus : écart à la rotation minimale depuis le T (singulière seulement bras croisé à l'horizontale, impossible).
    const swing = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(sg, 0, 0), a);
    const tw = swing.clone().invert().multiply(d.Spine2.clone().invert().multiply(d[S + 'Arm']));
    m['shoulder.axial.' + S] = 2 * Math.atan2(tw.x, tw.w) * DEG * sg;
    // Sol : inclinaison de la semelle (0 = à plat, comme au repos).
    m['sole.tilt.' + S] = angleBetween(new THREE.Vector3(0, 1, 0).applyQuaternion(d[S + 'Foot']), new THREE.Vector3(0, 1, 0));
    // Mains et coudes hors du tronc (segment bassin → cou).
    const seg = new THREE.Line3(P.Hips, P.Neck), c = v();
    const distTo = (q) => { seg.closestPointToPoint(q, true, c); return c.distanceTo(q); };
    m['body.hand.' + S] = distTo(P[S + 'Hand']); m['body.elbow.' + S] = distTo(P[S + 'ForeArm']);
    m['foot.y.' + S] = P[S + 'Foot'].y;
  }
  // Colonne : chaque maillon, cumul, et cassure entre maillons voisins.
  const links = [['Hips', 'Spine'], ['Spine', 'Spine1'], ['Spine1', 'Spine2']].map(([a, b]) => ang('XZY', rel(d[a], d[b])));
  links.forEach(([x, y, z], i) => { m['spine.flex.' + i] = x; m['spine.twist.' + i] = y; m['spine.lat.' + i] = z; });
  const [tx, ty, tz] = ang('XZY', rel(d.Hips, d.Spine2)); m['spine.flex.total'] = tx; m['spine.twist.total'] = ty; m['spine.lat.total'] = tz;
  m['spine.kink'] = Math.max(Math.abs(links[0][0] - links[1][0]), Math.abs(links[1][0] - links[2][0]));
  const [nx, ny, nz] = ang('XZY', rel(d.Spine2, d.Head)); m['neck.flex'] = nx; m['neck.twist'] = ny; m['neck.lat'] = nz;
  // Bassin : orientation dans le monde (de face).
  const [, py] = ang('XZY', d.Hips); m['pelvis.yaw'] = py;
  return { m, d };
}

// Contrôle une image et ajoute les dépassements à `out[contrôle] = pire valeur`.
function checkFrame(name, m, out, ctx) {
  const L = LIMITS, ex = EXCEPTIONS[name] || {};
  const lim = (k, val) => ex[k] ?? val;
  const hit = (k, value, limit) => { if (value > limit + 1e-6) { const e = (out[k] ||= { value: 0, limit, n: 0 }); e.n++; if (value > e.value) e.value = +value.toFixed(1); } };
  for (const S of ['Left', 'Right']) {
    const f = m['knee.flex.' + S];
    hit('genou flexion > 150°', f, lim('kneeFlex', L.knee.flexMax));
    hit('genou hyperextension', -f, L.knee.hyperMax);
    hit('genou valgus/varus', Math.abs(m['knee.valgus.' + S]), L.knee.valgusMax);
    hit('rotation du tibia', Math.abs(m['knee.rot.' + S]), Math.min(L.knee.rotMax, L.knee.rotBase + L.knee.rotPerFlex * Math.max(f, 0)));
    hit('cheville dorsiflexion', -m['ankle.plantar.' + S], lim('dorsi', L.ankle.dorsiMax));
    hit('cheville flexion plantaire', m['ankle.plantar.' + S], lim('plantar', L.ankle.plantarMax));
    hit('cheville inversion/éversion', Math.abs(m['ankle.ev.' + S]), L.ankle.invMax);
    hit('pied/tibia : écart d\'orientation', Math.abs(m['ankle.yaw.' + S]), lim('footYaw', L.ankle.yawMax));
    hit('hanche flexion', m['hip.flex.' + S], lim('hipFlex', L.hip.flexMax));
    hit('hanche extension', -m['hip.flex.' + S], L.hip.extMax);
    hit('hanche abduction', m['hip.abd.' + S], L.hip.abdMax);
    hit('hanche adduction', -m['hip.abd.' + S], L.hip.addMax);
    hit('hanche rotation', Math.abs(m['hip.rot.' + S]), L.hip.rotMax);
    hit('coude flexion > 150°', m['elbow.flex.' + S], L.elbow.flexMax);
    hit('coude hyperextension', -m['elbow.flex.' + S], L.elbow.hyperMax);
    hit('coude varus/valgus', Math.abs(m['elbow.varus.' + S]), L.elbow.varusMax);
    hit('coude pronosupination', Math.abs(m['elbow.prono.' + S]), L.elbow.pronoMax);
    hit('poignet flexion', m['wrist.flex.' + S], L.wrist.flexMax);
    hit('poignet extension', -m['wrist.flex.' + S], L.wrist.extMax);
    hit('poignet déviation', Math.abs(m['wrist.dev.' + S]), L.wrist.devMax);
    hit('poignet torsion', Math.abs(m['wrist.twist.' + S]), L.wrist.twistMax);
    hit('épaule : bras trop en arrière', m['shoulder.back.' + S], m['shoulder.backMax.' + S]);
    hit('épaule : bras croisé', m['shoulder.medial.' + S], m['shoulder.medialMax.' + S]);
    hit('épaule : rotation de l\'humérus', Math.abs(m['shoulder.axial.' + S]), L.shoulder.axialMax);
    hit('main dans le tronc', L.handBody - m['body.hand.' + S], 0);
    hit('coude dans le tronc', L.handBody - m['body.elbow.' + S], 0);
    if (ctx.flat || ctx.flatSide === S) hit('pied pas à plat', m['sole.tilt.' + S], L.soleTilt);
  }
  for (const i of [0, 1, 2]) {
    hit('colonne : flexion d\'un maillon', m['spine.flex.' + i], L.spine.linkFlex);
    hit('colonne : extension d\'un maillon', -m['spine.flex.' + i], L.spine.linkExt);
    hit('colonne : inclinaison d\'un maillon', Math.abs(m['spine.lat.' + i]), L.spine.linkLat);
    hit('colonne : torsion d\'un maillon', Math.abs(m['spine.twist.' + i]), L.spine.linkTwist);
  }
  hit('colonne : flexion totale', m['spine.flex.total'], L.spine.totalFlex);
  hit('colonne : extension totale', -m['spine.flex.total'], L.spine.totalExt);
  hit('colonne : inclinaison totale', Math.abs(m['spine.lat.total']), L.spine.totalLat);
  hit('colonne : torsion totale', Math.abs(m['spine.twist.total']), L.spine.totalTwist);
  hit('colonne : cassure entre maillons', m['spine.kink'], L.spine.kink);
  hit('cou flexion', m['neck.flex'], L.neck.flexMax);
  hit('cou extension', -m['neck.flex'], L.neck.extMax);
  hit('cou inclinaison', Math.abs(m['neck.lat']), L.neck.latMax);
  hit('cou rotation', Math.abs(m['neck.twist']), L.neck.twistMax);
}

// Bilan biomécanique d'un clip complet à partir des images mesurées.
function biomech(name, seq, dt) {
  const v2 = {}, ctx = { flat: FLAT_FEET.has(name), flatSide: FLAT_FRONT[name] };
  for (const { m } of seq) checkFrame(name, m, v2, ctx);
  const hit = (k, value, limit) => { if (value > limit) v2[k] = { value: +value.toFixed(1), limit, n: 1 }; };
  // Symétrie gauche/droite des mouvements bilatéraux.
  if (!UNILATERAL.has(name)) for (const k of ['knee.flex', 'hip.flex', 'elbow.flex', 'ankle.plantar']) {
    const diffs = seq.map(({ m }) => Math.abs(m[k + '.Left'] - m[k + '.Right']));
    hit('symétrie moyenne : ' + k, diffs.reduce((a, b) => a + b, 0) / diffs.length, LIMITS.sym.mean);
    hit('symétrie max : ' + k, Math.max(...diffs), LIMITS.sym.max);
  }
  // Vitesse angulaire : variation d'orientation d'un os par rapport à son parent entre deux images.
  const speedLim = BALLISTIC.has(name) ? LIMITS.speed.ballistic : LIMITS.speed.strength;
  const pairs = { knee: ['UpLeg', 'Leg'], ankle: ['Leg', 'Foot'], hip: [null, 'UpLeg'], elbow: ['Arm', 'ForeArm'], shoulder: [null, 'Arm'] };
  let worst = 0;
  for (let i = 1; i < seq.length - 1; i++) for (const S of ['Left', 'Right']) for (const [j, [a, b]] of Object.entries(pairs)) {
    const par = a ? S + a : j === 'hip' ? 'Hips' : 'Spine2', kid = S + b;
    const r0 = rel(seq[i - 1].d[par], seq[i - 1].d[kid]), r1 = rel(seq[i].d[par], seq[i].d[kid]);
    worst = Math.max(worst, quatAngleDeg(r0, r1) / dt);
  }
  hit('vitesse angulaire', worst, speedLim);
  return v2;
}

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
  obj.updateMatrixWorld(true);
  const REST = restFrame(obj, Object.fromEntries(['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', ...['Left', 'Right'].flatMap((S) => ['UpLeg', 'Leg', 'Foot', 'Arm', 'ForeArm', 'Hand'].map((n) => S + n))].map((n) => [n, bone(new RegExp(n + '$'))])));
  const mixer = new THREE.AnimationMixer(obj); mixer.clipAction(clip).play();
  const feet = [/LeftToe_?End/, /RightToe_?End/, /LeftFoot$/, /RightFoot$/].map(bone).filter(Boolean);
  const [hips, lh, rh, ls, rs] = [/Hips$/, /LeftHand$/, /RightHand$/, /LeftShoulder$/, /RightShoulder$/].map(bone);
  // Peau réelle (sommets skinnés, 1 sur 15) : seul moyen de juger le contact au sol (un os est au centre du membre).
  const skins = []; obj.traverse((o) => { if (o.isSkinnedMesh) skins.push(o); });
  const skinMin = () => { let y = Infinity; const t = v(); for (const s of skins) { const n = s.geometry.attributes.position.count;
    for (let k = 0; k < n; k += 15) { s.getVertexPosition(k, t); t.applyMatrix4(s.matrixWorld); if (t.y < y) y = t.y; } } return y; };
  // Os mesurés ; repos pris avant l'animation (le mixeur n'a encore rien posé).
  const BN = {}; for (const n of ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head']) BN[n] = bone(new RegExp(n + '$'));
  for (const S of ['Left', 'Right']) for (const n of ['UpLeg', 'Leg', 'Foot', 'Arm', 'ForeArm', 'Hand']) BN[S + n] = bone(new RegExp(S + n + '$'));
  const frames = [], seq = [];
  for (let i = 0; i <= N; i++) {
    // i = N : juste avant la fin (setTime(duration) retombe sur 0 en boucle) pour mesurer le raccord.
    mixer.setTime(i === N ? clip.duration - 1e-3 : (clip.duration * i) / N); obj.updateMatrixWorld(true);
    const p = (b) => b.getWorldPosition(v());
    frames.push({ all: bones.map(p), feet: feet.map(p), hips: p(hips), lh: p(lh), rh: p(rh), ls: p(ls), rs: p(rs), skin: skinMin() });
    seq.push(measure(BN, REST));
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
  // 7. Biomécanique : dépassements par contrôle (voir LIMITS), plus appuis qui bougent et dos qui flotte.
  const bio = biomech(name, seq, dt);
  if (STILL_FEET.has(name)) for (const k of [0, 1]) { // chevilles (index 2 et 3 de `feet`)
    const q = frames.map((f) => f.feet[2 + k]), a = q[0];
    const travel = Math.max(...q.map((x) => x.distanceTo(a)));
    if (travel > LIMITS.plantTravel && !(name === 'Mollets debout' || name === 'Mollets assis')) bio['appui qui bouge (m)'] = { value: +travel.toFixed(3), limit: LIMITS.plantTravel, n: 1 };
  }
  if (LYING.has(name)) { const low = Math.min(...seq.map((_, i) => frames[i].hips.y)); if (low > 0.2) bio['couché : bassin en l\'air (m)'] = { value: +low.toFixed(2), limit: 0.2, n: 1 }; }
  const r = (x, d = 2) => +x.toFixed(d);
  return { name, sex, clip: m.clip, authored: !!m.pose, ikError: r(clip.userData?.ikError ?? 0), equipment: m.equipment, prop: m.prop, duration: r(clip.duration),
    bodyMin: r(bodyMin, 3), feetMin: r(feetMin, 3), slide: slideT ? r(slide / slideT, 3) : 0, drift: r(drift), loop: r(loop, 3),
    gripMin: r(Math.min(...grip)), gripMax: r(Math.max(...grip)), handShoulderMax: r(handShoulder), skinLow: r(skinLow, 3), skinAir: r(skinHigh - skinLow), boxTop: box ? r(box.top) : null, bio, angles: seq.map((f) => f.m) };
}

export async function auditAll(sexes = ['M', 'F']) {
  const out = [];
  for (const sex of sexes) for (const e of LIBRARY) { const a = await auditOne(e.name, sex); if (a) out.push(a); }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = await auditAll(process.argv.includes('--f') ? ['F'] : ['M']);
  if (process.argv.includes('--bio')) {
    for (const r of rows) {
      const ks = Object.entries(r.bio);
      console.log(`${r.authored ? 'POSE ' : 'CLIP '} ${r.name}${ks.length ? '' : ' : ok'}`);
      for (const [k, e] of ks) console.log(`      ${k} : ${e.value} (limite ${+(+e.limit).toFixed(1)}, ${e.n}/61 images)`);
    }
    console.log(`\n${rows.filter((r) => Object.keys(r.bio).length).length}/${rows.length} exercices en défaut, ${rows.reduce((s, r) => s + Object.keys(r.bio).length, 0)} contrôles en dépassement`);
  } else console.table(rows.map(({ name, equipment, skinLow, skinAir, slide, drift, loop, gripMin, gripMax, handShoulderMax }) =>
    ({ name, eq: equipment, skinLow, air: skinAir, slide, drift, loop, grip: `${gripMin}-${gripMax}`, hS: handShoulderMax })));
}

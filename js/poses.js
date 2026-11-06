// Mouvements 3D décrits par poses clés (exercices absents de Mixamo : soulevé de terre, développé couché, fentes…).
// Une pose donne le bassin, l'orientation du tronc et la cible des pieds et des mains : genoux et coudes sont résolus
// par IK à 2 os, donc les appuis ne glissent pas et la longueur des membres reste exacte. Pas d'accessoire : ce qui se
// fait d'habitude allongé ou assis se fait au sol, rien ne flotte.
// Repère du personnage, en mètres pour un corps de 1,75 m : [côté (vers l'extérieur du corps), hauteur, avant]
// (origine : au sol, sous le bassin au repos). Une valeur `arm`/`fore`/`thigh`/`shin` donne directement la direction
// du segment au lieu d'une cible. Les clés sans L/R valent pour les deux côtés, en miroir.

const STAND = { hips: [0, 0.95, 0], torso: [0, 1, 0], feet: [0.12, 0.08, 0], arm: [0.1, -1, 0], fore: [0.08, -1, 0.1] };
const pose = (...parts) => Object.assign({}, ...parts);
// Allongé sur le dos, jambes fléchies pieds au sol : base des exercices couchés.
const SUPINE = { hips: [0, 0.16, 0], torso: [0, 0, -1], feet: [0.17, 0.08, 0.52], kneeHint: [0, 1, 0.2] };
// À genoux, buste droit (remplace le siège des machines).
const KNEEL = { hips: [0, 0.58, 0], torso: [0, 1, 0], thigh: [0.09, -1, 0.05], shin: [0.05, -0.06, -1] };
// Assis au sol, jambes vers l'avant.
const SEATED = { hips: [0, 0.14, 0], torso: [0, 1, -0.12], feet: [0.15, 0.1, 0.7], kneeHint: [0, 1, 0.2] };
const OUT_DOWN = [0.8, -0.6, -0.1], BACK = [0.25, 0, -1], BACK_UP = [0.3, 0.8, -0.6];
const SIDE_ARMS = { arm: [0.32, -0.5, 0.55], fore: [0.2, -0.25, 0.95] }; // bras le long du corps, couché
const HOLD_HEAD = { arm: [0.45, 0.72, 0.45], fore: [-0.35, 0.3, 0.9] }; // mains près de la tête

const benchPress = (a, b, base = SUPINE) => [pose(base, { hands: a, elbowHint: OUT_DOWN }), pose(base, { hands: b, elbowHint: OUT_DOWN })];
const hangLegs = { thigh: [0.07, -1, 0.14], shin: [0.03, -0.72, -0.7] };
const pullUp = [pose(hangLegs, { hips: [0, 0.92, 0], torso: [0, 1, 0.04], hands: [0.33, 1.98, 0.03] }),
  pose(hangLegs, { hips: [0, 1.3, 0], torso: [0, 0.99, -0.12], hands: [0.33, 1.98, 0.03], elbowHint: [0.85, -0.3, -0.4] })];
const dips = [pose(hangLegs, { hips: [0, 0.97, 0], torso: [0, 0.98, 0.18], hands: [0.27, 1.02, 0.08] }),
  pose(hangLegs, { hips: [0, 0.72, -0.03], torso: [0, 0.94, 0.34], hands: [0.27, 1.02, 0.08], elbowHint: BACK })];
const LUNGE_FEET = { footR: [0.12, 0.08, 0.42], footL: [0.1, 0.17, -0.5], foot: { L: [0, -0.75, 0.66] } };
const lunge = [pose(STAND, LUNGE_FEET, { hips: [0, 0.8, -0.05] }), pose(STAND, LUNGE_FEET, { hips: [0, 0.47, -0.06], torso: [0, 1, 0.06] })];
const hinge = (hips, torso, hands, extra) => pose(STAND, { hips, torso, hands, elbowHint: [0.4, 0, -1] }, extra);
const rowBase = { hips: [0, 0.84, -0.14], torso: [0, 0.48, 0.88] };

export const POSES = {
  'Presse à cuisses': { t: 3, keys: [
    { hips: [0, 0.16, 0], torso: [0, 0.3, -0.95], feet: [0.14, 0.86, 0.5], kneeHint: [0, 0.5, -1], ...SIDE_ARMS },
    { hips: [0, 0.16, 0], torso: [0, 0.3, -0.95], feet: [0.14, 0.7, 0.45], kneeHint: [0, 0.5, -1], thigh: [0.1, 0.72, 0.68], shin: [0.1, 0.72, 0.68], ...SIDE_ARMS }] },
  'Fentes bulgares': { t: 3.2, keys: lunge },
  'Fentes marchées': { t: 2.8, keys: lunge },
  'Leg extension': { t: 2.8, keys: [
    { hips: [0, 0.14, 0], torso: [0, 0.9, -0.42], thigh: [0.1, 0.62, 0.78], shin: [0.05, -0.75, 0.66], hands: [0.26, 0.06, -0.34] },
    { hips: [0, 0.14, 0], torso: [0, 0.9, -0.42], thigh: [0.1, 0.62, 0.78], shin: [0.08, 0.5, 0.86], hands: [0.26, 0.06, -0.34] }] },
  'Soulevé de terre': { t: 3.4, keys: [
    hinge([0, 0.64, -0.22], [0, 0.62, 0.78], [0.2, 0.3, 0.12]),
    hinge([0, 0.94, 0], [0, 1, -0.03], [0.2, 0.74, 0.05])] },
  'Soulevé de terre roumain': { t: 3.4, keys: [
    hinge([0, 0.84, -0.18], [0, 0.32, 0.95], [0.2, 0.46, 0.22]),
    hinge([0, 0.94, 0], [0, 1, -0.03], [0.2, 0.74, 0.05])] },
  'Leg curl': { t: 2.8, keys: [
    { hips: [0, 0.14, 0], torso: [0, 0.05, 1], thigh: [0.08, 0, -1], shin: [0.05, 0, -1], foot: { L: [0, -0.2, -1], R: [0, -0.2, -1] }, arm: [0.3, -0.12, 0.95], fore: [0.1, -0.1, 1] },
    { hips: [0, 0.14, 0], torso: [0, 0.05, 1], thigh: [0.08, 0, -1], shin: [0.05, 0.88, -0.48], arm: [0.3, -0.12, 0.95], fore: [0.1, -0.1, 1] }] },
  'Hip thrust': { t: 2.8, keys: [
    { hips: [0, 0.16, -0.25], torso: [0, -0.08, -1], feet: [0.15, 0.08, 0.28], kneeHint: [0, 1, 0.3], ...SIDE_ARMS },
    { hips: [0, 0.54, -0.25], torso: [0, -0.68, -0.73], feet: [0.15, 0.08, 0.28], kneeHint: [0, 1, 0.3], arm: [0.3, -0.4, 0.86], fore: [0.2, -0.5, 0.84] }] },
  'Mollets debout': { t: 2.2, keys: [
    pose(STAND, {}),
    pose(STAND, { hips: [0, 1.04, 0], feet: [0.12, 0.17, -0.02], foot: { L: [0, -0.8, 0.6], R: [0, -0.8, 0.6] } })] },
  'Mollets assis': { t: 2.2, keys: [
    pose(SEATED, { torso: [0, 1, 0.1], feet: [0.15, 0.08, 0.5], hands: [0.15, 0.58, 0.36] }),
    pose(SEATED, { torso: [0, 1, 0.1], feet: [0.15, 0.16, 0.5], foot: { L: [0, -0.8, 0.6], R: [0, -0.8, 0.6] }, hands: [0.15, 0.62, 0.36] })] },
  'Développé couché': { t: 2.8, keys: benchPress([0.34, 0.33, -0.42], [0.2, 0.72, -0.46]) },
  'Développé couché haltères': { t: 2.8, keys: benchPress([0.36, 0.33, -0.42], [0.14, 0.72, -0.46]) },
  'Développé incliné haltères': { t: 2.8, keys: (() => { const b = pose(SUPINE, { hips: [0, 0.14, -0.05], torso: [0, 0.5, -0.87] });
    return benchPress([0.36, 0.56, -0.3], [0.14, 0.92, -0.2], b); })() },
  'Écarté poulie': { t: 2.8, keys: [
    pose(STAND, { torso: [0, 0.97, 0.2], hands: [0.68, 1.32, 0.12], elbowHint: [0.2, -0.3, -1] }),
    pose(STAND, { torso: [0, 0.97, 0.2], hands: [0.08, 1.12, 0.52], elbowHint: [1, -0.1, -0.1] })] },
  Dips: { t: 2.8, keys: dips },
  'Dips assistés': { t: 3, keys: dips },
  Tractions: { t: 3, keys: pullUp },
  'Tractions assistées': { t: 3.2, keys: pullUp },
  'Tractions / tirage vertical': { t: 3, keys: pullUp },
  'Tirage vertical': { t: 2.8, keys: [
    pose(KNEEL, { torso: [0, 1, -0.1], hands: [0.32, 1.52, 0.1] }),
    pose(KNEEL, { torso: [0, 1, -0.2], hands: [0.3, 1.0, 0.12], elbowHint: [0.8, -0.5, -0.4] })] },
  'Rowing barre': { t: 2.6, keys: [
    hinge(rowBase.hips, rowBase.torso, [0.2, 0.42, 0.3]),
    hinge(rowBase.hips, rowBase.torso, [0.22, 0.8, 0.1], { elbowHint: BACK_UP })] },
  'Rowing haltère': { t: 2.6, keys: [
    hinge(rowBase.hips, rowBase.torso, [0.2, 0.42, 0.3], { handL: [0.2, 0.62, 0.34] }),
    hinge(rowBase.hips, rowBase.torso, [0.22, 0.8, 0.1], { handL: [0.2, 0.62, 0.34], elbowHint: BACK_UP })] },
  'Tirage horizontal': { t: 2.8, keys: [
    pose(SEATED, { torso: [0, 0.92, 0.34], hands: [0.2, 0.42, 0.66], elbowHint: BACK }),
    pose(SEATED, { torso: [0, 1, -0.14], hands: [0.26, 0.56, 0.12], elbowHint: BACK })] },
  'Développé militaire': { t: 2.8, keys: [
    pose(STAND, { hands: [0.3, 1.5, 0.1], elbowHint: OUT_DOWN }),
    pose(STAND, { hands: [0.2, 2.02, 0.03], elbowHint: OUT_DOWN })] },
  'Développé épaules haltères': { t: 2.8, keys: [
    pose(STAND, { hands: [0.36, 1.5, 0.05], elbowHint: OUT_DOWN }),
    pose(STAND, { hands: [0.18, 2.02, 0.02], elbowHint: OUT_DOWN })] },
  'Élévations latérales': { t: 2.6, keys: [
    pose(STAND, { arm: [0.25, -1, 0.02], fore: [0.3, -1, 0.05] }),
    pose(STAND, { arm: [1, 0.02, 0.06], fore: [1, 0.08, 0.1] })] },
  'Face pull': { t: 2.6, keys: [
    pose(STAND, { hands: [0.2, 1.42, 0.62], elbowHint: [0.7, 0, -0.5] }),
    pose(STAND, { hands: [0.3, 1.62, 0.14], elbowHint: [1, 0.2, -0.4] })] },
  'Curl marteau': { t: 2.4, keys: [
    pose(STAND, { arm: [0.08, -1, 0], fore: [0.06, -1, 0.1] }),
    pose(STAND, { arm: [0.08, -1, 0.05], fore: [0.08, 0.86, 0.5] })] },
  'Extensions triceps': { t: 2.4, keys: [
    pose(STAND, { torso: [0, 0.97, 0.2], arm: [0.1, -1, -0.04], fore: [0.04, 0.42, 0.9] }),
    pose(STAND, { torso: [0, 0.97, 0.2], arm: [0.1, -1, -0.04], fore: [0.05, -1, 0.04] })] },
  'Barre au front': { t: 2.6, keys: [
    pose(SUPINE, { arm: [0.12, 0.86, 0.5], fore: [0.06, 0.5, -0.86] }),
    pose(SUPINE, { arm: [0.12, 0.86, 0.5], fore: [0.1, 0.86, 0.5] })] },
  'Relevés de jambes': { t: 2.8, keys: [
    { hips: [0, 0.13, 0], torso: [0, 0, -1], thigh: [0.06, 0.06, 1], shin: [0.05, 0.06, 1], ...SIDE_ARMS },
    { hips: [0, 0.13, 0], torso: [0, 0, -1], thigh: [0.06, 0.95, 0.3], shin: [0.05, 0.95, 0.3], ...SIDE_ARMS }] },
  'Crunch poulie': { t: 2.4, keys: [
    pose(KNEEL, HOLD_HEAD, { torso: [0, 1, 0.05] }),
    pose(KNEEL, HOLD_HEAD, { hips: [0, 0.56, -0.05], torso: [0, 0.62, 0.78] })] },
  'Box jump': { t: 1.8, keys: [
    pose(STAND, { hips: [0, 0.62, -0.14], torso: [0, 0.72, 0.7], arm: [0.14, -0.7, -0.7], fore: [0.1, -0.8, -0.6] }),
    pose(STAND, { hips: [0, 1.22, 0], feet: [0.12, 0.38, 0.02], foot: { L: [0, -0.7, 0.7], R: [0, -0.7, 0.7] }, arm: [0.2, 0.86, 0.46], fore: [0.1, 0.96, 0.25] })] },
};

const CHAINS = [['Hips', 'Spine'], ['Spine', 'Spine1'], ['Spine1', 'Spine2'], ['Spine2', 'Neck'], ['Neck', 'Head'], ['Head', 'HeadTop_End'],
  ['LeftShoulder', null], ['RightShoulder', null], ['LeftArm', 'LeftForeArm'], ['RightArm', 'RightForeArm'], ['LeftForeArm', 'LeftHand'], ['RightForeArm', 'RightHand'],
  ['LeftUpLeg', 'LeftLeg'], ['RightUpLeg', 'RightLeg'], ['LeftLeg', 'LeftFoot'], ['RightLeg', 'RightFoot'], ['LeftFoot', 'LeftToeBase'], ['RightFoot', 'RightToeBase']];
const smooth = (x) => x * x * (3 - 2 * x);

// Construit l'AnimationClip d'un exercice sur un corps au repos. Écart max entre cibles IK et position obtenue dans
// clip.userData.ikError (utilisé par le banc d'essai).
export function buildPoseClip(THREE, obj, def, name = 'pose') {
  const V = (...a) => new THREE.Vector3(...a);
  const bones = {}; obj.traverse((o) => { if (o.isBone) { const n = o.name.replace(/^mixamorig:?/, ''); bones[n] ||= o; } });
  const saved = Object.values(bones).map((b) => [b, b.quaternion.clone(), b.position.clone()]);
  obj.updateMatrixWorld(true);
  const wp = (b) => b.getWorldPosition(V()), wq = (b) => b.getWorldQuaternion(new THREE.Quaternion());
  // Repère du personnage, mesuré sur le squelette au repos.
  const U = V(0, 1, 0), R = wp(bones.RightArm).sub(wp(bones.LeftArm)).setY(0).normalize(), F = V().crossVectors(U, R);
  const toe = wp(bones.LeftToeBase), restH = wp(bones.HeadTop_End).y - wp(bones.LeftToeBase).y, s = 1.75 / restH; // s : mètres « 1,75 m » par unité monde
  const origin = wp(bones.Hips).setY(toe.y);
  const rest = {}, restDir = {};
  for (const [b, c] of CHAINS) { rest[b] = wq(bones[b]); if (c) restDir[b] = wp(bones[c]).sub(wp(bones[b])).normalize(); }
  const len = (a, b) => wp(bones[a]).distanceTo(wp(bones[b])) * s;
  const L = { thigh: len('LeftUpLeg', 'LeftLeg'), shin: len('LeftLeg', 'LeftFoot'), arm: len('LeftArm', 'LeftForeArm'), fore: len('LeftForeArm', 'LeftHand') };
  const hipOff = wp(bones.LeftUpLeg).sub(wp(bones.Hips)).multiplyScalar(s), shOff = wp(bones.LeftArm).sub(wp(bones.Spine2)).multiplyScalar(s);
  const side = (a, sgn) => V().addScaledVector(R, a[0] * sgn).addScaledVector(U, a[1]).addScaledVector(F, a[2]);
  const flat = V().addScaledVector(F, 1).addScaledVector(U, -0.35).normalize();
  // Pose = position bassin + directions de chaque segment ; IK à 2 os pour les cibles.
  const ik = (root, target, a, b, hint) => {
    const d = target.clone().sub(root), dist = Math.min(d.length(), (a + b) * 0.999), dir = d.normalize();
    const x = (a * a - b * b + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, a * a - x * x));
    const bend = hint.clone().addScaledVector(dir, -hint.dot(dir)).normalize();
    const mid = root.clone().addScaledVector(dir, x).addScaledVector(bend, h);
    return [mid.clone().sub(root).normalize(), root.clone().addScaledVector(dir, dist).sub(mid).normalize()];
  };
  const resolve = (p) => {
    const hips = side(p.hips, 1), torso = side(p.torso, 1).normalize(), out = { hips, dirs: {}, targets: [] };
    for (const b of ['Hips', 'Spine', 'Spine1', 'Spine2']) out.dirs[b] = torso;
    const neck = torso.clone().multiplyScalar(0.65).addScaledVector(U, 0.35).normalize();
    out.dirs.Neck = neck; out.dirs.Head = neck;
    // Rotation du tronc au repos → pose : sert à placer hanches et épaules avant l'IK.
    const q = new THREE.Quaternion().setFromUnitVectors(U, torso);
    const hOff = hipOff.clone().applyQuaternion(q), spine2 = wp(bones.Spine2).sub(wp(bones.Hips)).multiplyScalar(s).applyQuaternion(q), sOff = shOff.clone().applyQuaternion(q);
    for (const [S, sgn] of [['Left', -1], ['Right', 1]]) {
      const k = S[0]; // L ou R
      const hipW = hips.clone().add(sgn === -1 ? hOff : hOff.clone().sub(V().addScaledVector(R, -2 * hipOff.dot(R) * -1).applyQuaternion(q)));
      const footT = p['foot' + k] || p.feet;
      if (p.thigh && p.shin) { out.dirs[S + 'UpLeg'] = side(p.thigh, sgn).normalize(); out.dirs[S + 'Leg'] = side(p.shin, sgn).normalize(); }
      else if (footT) {
        const t = side(footT, sgn); const hint = side(p.kneeHint || [0.08, 0, 1], sgn);
        [out.dirs[S + 'UpLeg'], out.dirs[S + 'Leg']] = ik(hipW, t, L.thigh, L.shin, hint); out.targets.push(['foot', S, t]);
      }
      const shin = out.dirs[S + 'Leg'];
      out.dirs[S + 'Foot'] = p.foot?.[k] ? side(p.foot[k], sgn).normalize()
        : shin.dot(U) < -0.5 ? flat.clone().add(V().addScaledVector(R, 0.12 * sgn)).normalize() : null; // pied posé à plat, sinon suit le tibia
      const shW = hips.clone().add(spine2).add(sgn === -1 ? sOff : sOff.clone().sub(V().addScaledVector(R, 2 * shOff.dot(R)).applyQuaternion(q)));
      const handT = p['hand' + k] || p.hands;
      if (handT) {
        const t = side(handT, sgn);
        [out.dirs[S + 'Arm'], out.dirs[S + 'ForeArm']] = ik(shW, t, L.arm, L.fore, side(p.elbowHint || [0.35, -0.2, -1], sgn)); out.targets.push(['hand', S, t]);
      } else { out.dirs[S + 'Arm'] = side(p.arm, sgn).normalize(); out.dirs[S + 'ForeArm'] = side(p.fore || p.arm, sgn).normalize(); }
    }
    return out;
  };
  const keys = def.keys.map(resolve), n = 48, K = keys.length, fps = n / def.t;
  // Aller-retour : A → B → A, avec tenue douce à chaque extrémité.
  const at = (i) => { const u = (i / n) * 2 * (K - 1), seg = u <= K - 1 ? u : 2 * (K - 1) - u, a = Math.min(K - 2, Math.floor(seg)); return [keys[a], keys[a + 1], smooth(seg - a)]; };
  const tracks = {}, parentName = Object.fromEntries(CHAINS.map(([b]) => [b, bones[b].parent.name.replace(/^mixamorig:?/, '')]));
  const hipPos = []; let ikError = 0;
  for (let i = 0; i <= n; i++) {
    const [A, B, w] = at(i), world = {};
    for (const [b] of CHAINS) {
      const pName = parentName[b], pDelta = world[pName]?.delta || new THREE.Quaternion();
      const da = A.dirs[b], db = B.dirs[b];
      const target = da && db ? da.clone().lerp(db, w).normalize() : (da || db) && !(da && db) && w < 0.5 ? da : (db && !da && w >= 0.5 ? db : null);
      let delta = pDelta.clone();
      if (target && restDir[b]) { const from = restDir[b].clone().applyQuaternion(pDelta); delta = new THREE.Quaternion().setFromUnitVectors(from, target).multiply(pDelta); }
      world[b] = { delta, abs: delta.clone().multiply(rest[b]) };
      const parentAbs = world[pName]?.abs || wq(bones[b].parent);
      const local = parentAbs.clone().invert().multiply(world[b].abs);
      (tracks[b] ||= []).push(local.x, local.y, local.z, local.w);
    }
    const h = A.hips.clone().lerp(B.hips, w).multiplyScalar(1 / s).add(origin);
    hipPos.push(bones.Hips.parent.worldToLocal(h.clone()));
  }
  const times = Array.from({ length: n + 1 }, (_, i) => i / fps);
  const list = Object.entries(tracks).map(([b, v]) => new THREE.QuaternionKeyframeTrack(bones[b].name.replace(/[.:\s/[\]]/g, '') + '.quaternion', times, v));
  list.push(new THREE.VectorKeyframeTrack(bones.Hips.name.replace(/[.:\s/[\]]/g, '') + '.position', times, hipPos.flatMap((p) => [p.x, p.y, p.z])));
  const clip = new THREE.AnimationClip(name, def.t, list);
  // Contrôle : chaque cible IK de chaque pose clé est-elle atteinte ?
  keys.forEach((k, idx) => {
    const frame = idx * (n / 2) / Math.max(1, K - 1), f = Math.round(frame);
    for (const [b] of CHAINS) { const v = tracks[b].slice(f * 4, f * 4 + 4); bones[b].quaternion.set(v[0], v[1], v[2], v[3]); }
    bones.Hips.position.copy(hipPos[f]); obj.updateMatrixWorld(true);
    for (const [kind, S, t] of k.targets) {
      const got = wp(bones[S + (kind === 'foot' ? 'Foot' : 'Hand')]).sub(origin).multiplyScalar(s);
      // Cible hors de portée = bras/jambe tendus vers elle : on ne compte que l'erreur due au placement, pas la distance excédentaire.
      ikError = Math.max(ikError, Math.max(0, got.distanceTo(t) - (kind === 'hand' ? 0.35 : 0.08)));
    }
  });
  for (const [b, q, p] of saved) { b.quaternion.copy(q); b.position.copy(p); }
  obj.updateMatrixWorld(true);
  clip.userData = { tmPrepared: true, ikError };
  return clip;
}

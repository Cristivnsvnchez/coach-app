// Limites articulaires appliquées aux clips Mixamo, image par image (partagé : visionneuse, vignettes, banc d'essai).
// Les clips sont des captures retouchées : poignets cassés à 95°, chevilles tordues, cou renversé, bras derrière le dos,
// hanches fléchies au-delà de ce que permet le bassin. Comme une étape de reciblage, on ramène chaque articulation dans
// son amplitude réelle, avec les mêmes mesures que tools/motion-audit.mjs (repère : X côté, Y haut, Z avant ; angles
// des os par rapport au repos, convention de Grood & Suntay), un peu en deçà des limites pour garder une marge.
// - Hanche fléchie au-delà de ~127° : c'est le bassin qui bascule en arrière (rythme lombo-pelvien), la cuisse garde
//   son orientation (pieds et genoux ne bougent pas) et le bas du dos s'enroule d'autant ;
// - cheville, poignet, rotation de l'avant-bras, cou, épaule, maillons de la colonne : ramenés à la limite (le reste suit) ;
// - exercice bilatéral : gauche et droite font le même geste (moyenne en miroir, plan sagittal), tronc sans torsion.

const LIM = {
  ankle: { dorsi: 29, plantar: 49, yaw: 14, inv: 19 },
  wrist: { flex: 78, ext: 73, dev: 33 }, forearm: 98,
  neck: { flex: 69, ext: 59, lat: 44, twist: 79 },
  hipFlex: 127, kneeFlex: 149, spine: { flex: 34, ext: 14 },
};
const DEG = 180 / Math.PI;
const SIDES = [['Left', 1], ['Right', -1]];
const CHAIN_C = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'];
const CHAIN_S = ['UpLeg', 'Leg', 'Foot', 'ToeBase', 'Shoulder', 'Arm', 'ForeArm', 'Hand'];

export function limitJoints(THREE, clip, obj, { symmetric = false } = {}) {
  if (!clip || !obj) return clip;
  const memo = (clip.userData ||= {}).tmLimited ||= {};
  const key = symmetric ? 'sym' : 'one';
  if (memo[key]) return memo[key];
  const Q = () => new THREE.Quaternion(), E = new THREE.Euler();
  const B = {}; obj.traverse((o) => { if (o.isBone) B[o.name.replace(/^mixamorig:?/, '')] ||= o; });
  if (!B.Hips || !B.LeftFoot) return clip;
  const saved = Object.values(B).map((b) => [b, b.quaternion.clone(), b.position.clone()]);
  obj.updateMatrixWorld(true);
  const objQ = obj.getWorldQuaternion(Q()), objQi = objQ.clone().invert();
  // Orientations « monde » exprimées dans le repère du corps (le corps peut être tourné dans la scène).
  const wq = (n) => objQi.clone().multiply(B[n].getWorldQuaternion(Q()));
  const restW = {}; for (const n in B) restW[n] = wq(n);
  const d = (n) => wq(n).multiply(restW[n].clone().invert()); // rotation depuis le repos
  const setD = (n, dq) => { // impose l'orientation (dans le repère du corps) d'un os, ses enfants suivent
    const b = B[n], world = objQ.clone().multiply(dq.clone().multiply(restW[n]));
    const pw = b.parent.getWorldQuaternion(Q());
    b.quaternion.copy(pw.invert().multiply(world)); b.updateMatrixWorld(true);
  };
  const rel = (a, b) => d(a).invert().multiply(d(b));
  const ang = (order, q) => { E.setFromQuaternion(q, order); return [E.x * DEG, E.y * DEG, E.z * DEG]; };
  const fromAng = (order, [x, y, z]) => Q().setFromEuler(new THREE.Euler(x / DEG, y / DEG, z / DEG, order));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const mirror = (q) => new THREE.Quaternion(q.x, -q.y, -q.z, q.w); // miroir par le plan sagittal (X = côté)
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const pos = (n) => B[n].getWorldPosition(V()).applyMatrix4(obj.matrixWorld.clone().invert());

  const tracked = clip.tracks.filter((t) => /\.quaternion$/.test(t.name)).map((t) => [t.name.replace(/^mixamorig:?/, '').replace(/\.quaternion$/, ''), t])
    .filter(([n]) => B[n]);
  const fps = 30, T = clip.duration, n = Math.max(2, Math.round(T * fps) + 1);
  const mixer = new THREE.AnimationMixer(obj), act = mixer.clipAction(clip);
  act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; act.play();
  const out = Object.fromEntries(tracked.map(([nm]) => [nm, new Float32Array(n * 4)]));

  const fixFrame = () => {
    // 1. Symétrie : on relève toutes les orientations, puis on impose les cibles du haut vers le bas.
    if (symmetric) {
      const D0 = {}; for (const nm of [...CHAIN_C, ...SIDES.flatMap(([S]) => CHAIN_S.map((c) => S + c))]) if (B[nm]) D0[nm] = d(nm);
      const tgt = {};
      for (const c of CHAIN_C) if (D0[c]) tgt[c] = D0[c].clone().slerp(mirror(D0[c]), 0.5);
      for (const c of CHAIN_S) if (D0['Left' + c] && D0['Right' + c]) {
        const L = D0['Left' + c].clone().slerp(mirror(D0['Right' + c]), 0.5); tgt['Left' + c] = L; tgt['Right' + c] = mirror(L);
      }
      for (const c of CHAIN_C) if (tgt[c]) setD(c, tgt[c]);
      for (const c of CHAIN_S) for (const [S] of SIDES) if (tgt[S + c]) setD(S + c, tgt[S + c]);
    }
    // 2. Hanche : au-delà de la flexion possible, le bassin bascule en arrière ; cuisses et thorax gardent leur orientation.
    for (let it = 0; it < 2; it++) {
      const flex = Math.max(...SIDES.map(([S]) => -ang('XZY', rel('Hips', S + 'UpLeg'))[0]));
      const e = flex - LIM.hipFlex; if (e <= 0.2) break;
      const keep = { L: d('LeftUpLeg'), R: d('RightUpLeg'), s1: d('Spine1'), s2: d('Spine2') };
      const lat = V(1, 0, 0).applyQuaternion(d('Hips')); // axe latéral du bassin
      const hips = Q().setFromAxisAngle(lat, -e / DEG).multiply(d('Hips'));
      setD('Hips', hips); setD('Spine', hips.clone().slerp(keep.s1, 0.5)); setD('Spine1', keep.s1); setD('Spine2', keep.s2);
      setD('LeftUpLeg', keep.L); setD('RightUpLeg', keep.R);
    }
    // 2b. Colonne : aucun maillon fléchi au-delà de sa limite ; l'excès passe au maillon du dessus (le thorax garde son orientation).
    const links = [['Hips', 'Spine'], ['Spine', 'Spine1'], ['Spine1', 'Spine2']];
    for (let k = 0; k < links.length; k++) {
      const [pa, ch] = links[k], [fx, fy, fz] = ang('XZY', rel(pa, ch));
      const c = clamp(fx, -LIM.spine.ext, LIM.spine.flex); if (Math.abs(c - fx) < 0.05) continue;
      const keepUp = k < 2 ? d(links[k + 1][1]) : null;
      setD(ch, d(pa).multiply(fromAng('XZY', [c, fy, fz])));
      if (keepUp) setD(links[k + 1][1], keepUp); // le maillon suivant reprend l'excès
    }
    for (const [S, sg] of SIDES) {
      // 3. Genou : flexion maximale.
      const th = pos(S + 'Leg').sub(pos(S + 'UpLeg')), sh = pos(S + 'Foot').sub(pos(S + 'Leg')), kf = th.angleTo(sh) * DEG;
      if (kf > LIM.kneeFlex) { const axis = V().crossVectors(th, sh).normalize(); setD(S + 'Leg', Q().setFromAxisAngle(axis, -(kf - LIM.kneeFlex) / DEG).multiply(d(S + 'Leg'))); }
      // 4. Cheville : flexion dorsale / plantaire, pied dans l'axe du tibia, inversion / éversion.
      const [ax, ay, az] = ang('XYZ', rel(S + 'Leg', S + 'Foot'));
      const fa = [clamp(ax, -LIM.ankle.dorsi, LIM.ankle.plantar), clamp(ay, -LIM.ankle.yaw, LIM.ankle.yaw), clamp(az, -LIM.ankle.inv, LIM.ankle.inv)];
      if (fa.some((x, k) => Math.abs(x - [ax, ay, az][k]) > 0.05)) { const keepToe = d(S + 'ToeBase'), dFoot = d(S + 'Leg').multiply(fromAng('XYZ', fa)); setD(S + 'Foot', dFoot);
        if (B[S + 'ToeBase']) setD(S + 'ToeBase', keepToe.clone().slerp(dFoot, 0.5)); }
      // 5. Épaule : bras ni trop en arrière, ni croisé devant le corps (direction du bras dans le repère du thorax).
      const chest = d('Spine2'), up = pos(S + 'ForeArm').sub(pos(S + 'Arm')).normalize(), a = up.clone().applyQuaternion(chest.clone().invert());
      // Si le bras dépasse, on le ramène vers « bras le long du corps » juste assez (recherche par dichotomie, marge 3°) :
      // la correction varie continûment d'une image à l'autre.
      const ok = (v, m) => { const x = v.x * sg; return Math.asin(Math.max(0, -v.z)) * DEG <= 45 - 20 * v.y - m
        && Math.asin(Math.max(0, -x)) * DEG <= 50 * Math.max(v.z, 0) + 25 * (1 - Math.max(v.z, 0)) - m; };
      if (!ok(a, 0)) {
        const safe = V(0.2 * sg, -0.98, 0.02).normalize(), at = (t) => a.clone().lerp(safe, t).normalize();
        let lo = 0, hi = 1; for (let it = 0; it < 14; it++) { const mid = (lo + hi) / 2; if (ok(at(mid), 3)) hi = mid; else lo = mid; }
        setD(S + 'Arm', Q().setFromUnitVectors(up, at(hi).applyQuaternion(chest)).multiply(d(S + 'Arm')));
      }
      // 6. Poignet (flexion, extension, déviation) et rotation de l'avant-bras (coude + poignet).
      const ex = ang('YZX', rel(S + 'Arm', S + 'ForeArm'))[2];
      let [wx, wy, wz] = ang('ZYX', rel(S + 'ForeArm', S + 'Hand'));
      const w0 = [wx, wy, wz];
      // flexion = -wz·sg ∈ [-ext, flex]
      wz = sg > 0 ? clamp(wz, -LIM.wrist.flex, LIM.wrist.ext) : clamp(wz, -LIM.wrist.ext, LIM.wrist.flex);
      wy = clamp(wy, -LIM.wrist.dev, LIM.wrist.dev);
      let fa2 = -(ex + wx); while (fa2 > 180) fa2 -= 360; while (fa2 < -180) fa2 += 360;
      if (Math.abs(fa2) > LIM.forearm) wx += fa2 - Math.sign(fa2) * LIM.forearm;
      if ([wx, wy, wz].some((v, k) => Math.abs(v - w0[k]) > 0.05)) setD(S + 'Hand', d(S + 'ForeArm').multiply(fromAng('ZYX', [wx, wy, wz])));
    }
    // 8. Cou (tête par rapport au thorax).
    const [nx, ny, nz] = ang('XZY', rel('Spine2', 'Head'));
    const na = [clamp(nx, -LIM.neck.ext, LIM.neck.flex), clamp(ny, -LIM.neck.twist, LIM.neck.twist), clamp(nz, -LIM.neck.lat, LIM.neck.lat)];
    if (na.some((v, k) => Math.abs(v - [nx, ny, nz][k]) > 0.05)) setD('Head', d('Spine2').multiply(fromAng('XZY', na)));
  };

  for (let i = 0; i < n; i++) {
    mixer.setTime(Math.min(T, (T * i) / (n - 1))); obj.updateMatrixWorld(true);
    fixFrame();
    for (const [nm] of tracked) { const q = B[nm].quaternion; out[nm].set([q.x, q.y, q.z, q.w], i * 4); }
  }
  mixer.stopAllAction(); mixer.uncacheRoot(obj);
  for (const [b, q, p] of saved) { b.quaternion.copy(q); b.position.copy(p); }
  obj.updateMatrixWorld(true);

  // Lissage léger (1-2-1, trois passes) : une articulation qui touche sa limite puis la quitte ne doit pas faire d'à-coup.
  const qa = Q(), qb = Q(), qc = Q();
  for (const nm in out) for (let pass = 0; pass < 3; pass++) {
    const src = Float32Array.from(out[nm]);
    for (let i = 1; i < n - 1; i++) {
      qa.fromArray(src, (i - 1) * 4); qb.fromArray(src, i * 4); qc.fromArray(src, (i + 1) * 4);
      if (qa.dot(qb) < 0) qa.set(-qa.x, -qa.y, -qa.z, -qa.w); if (qc.dot(qb) < 0) qc.set(-qc.x, -qc.y, -qc.z, -qc.w);
      const m = qa.clone().slerp(qc, 0.5); qb.slerp(m, 0.5).normalize().toArray(out[nm], i * 4);
    }
  }
  const times = Float32Array.from({ length: n }, (_, i) => (T * i) / (n - 1));
  const tracks = clip.tracks.map((t) => {
    const hit = tracked.find(([, tt]) => tt === t);
    return hit ? new THREE.QuaternionKeyframeTrack(t.name, times, out[hit[0]]) : t.clone();
  });
  const c = new THREE.AnimationClip(clip.name, T, tracks);
  c.userData = { ...clip.userData, tmLimited: undefined, limited: true };
  return (memo[key] = c);
}

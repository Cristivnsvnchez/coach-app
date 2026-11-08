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


// Jambes qui se croisent : capsules effilées (mêmes rayons que le banc d'essai) + 3 cm de marge, car le lissage et l’interpolation entre images
// final adoucit un peu la correction. Renvoie l'enfoncement le plus fort (m), 0 si les jambes passent l'une à côté de l'autre.
function segD(a0, a1, b0, b1) {
  let best = [Infinity, 0, 0];
  for (let i = 0; i <= 16; i++) { const s = i / 16, p = a0.clone().lerp(a1, s);
    const ab = b1.clone().sub(b0), t = Math.max(0, Math.min(1, p.clone().sub(b0).dot(ab) / ab.lengthSq()));
    const d = b0.clone().addScaledVector(ab, t).distanceTo(p); if (d < best[0]) best = [d, s, t]; }
  return best;
}
const LEG_R = { th: [0.075, 0.048], sh: [0.046, 0.03] };
function sepNeeded(P, k = 1) { // k : échelle du corps vers 1,75 m (la visionneuse le normalise)
  const seg = (S, k) => (k === 'th' ? [P(S + 'UpLeg'), P(S + 'Leg')] : [P(S + 'Leg'), P(S + 'Foot')]);
  let worst = 0;
  for (const [ka, kb, A, Bs] of [['th', 'th', 'Left', 'Right'], ['sh', 'sh', 'Left', 'Right'], ['th', 'sh', 'Left', 'Right'], ['th', 'sh', 'Right', 'Left']]) {
    const [a0, a1] = seg(A, ka), [b0, b1] = seg(Bs, kb), [d, s, t] = segD(a0, a1, b0, b1);
    const r = (LEG_R[ka][0] + (LEG_R[ka][1] - LEG_R[ka][0]) * s + LEG_R[kb][0] + (LEG_R[kb][1] - LEG_R[kb][0]) * t) / k;
    worst = Math.max(worst, (r + 0.03 / k - d) * k);
  }
  return worst;
}

// Avant-bras qui entre dans l'autre avant-bras, une cuisse ou le tronc : enfoncement le plus fort (m, + 1 cm de marge) et
// points les plus proches, pour repousser le bras depuis l'épaule.
const ARM_R = [0.032, 0.024], THIGH_R = [0.075, 0.048], TRUNK_R = [0.1, 0.1];
function armClash(P, k, S) {
  const O = S === 'Left' ? 'Right' : 'Left', a0 = P(S + 'ForeArm'), a1 = P(S + 'Hand');
  let worst = { pen: 0 };
  for (const [b0n, b1n, R] of [[O + 'ForeArm', O + 'Hand', ARM_R], ['LeftUpLeg', 'LeftLeg', THIGH_R], ['RightUpLeg', 'RightLeg', THIGH_R], ['Hips', 'Spine1', TRUNK_R], ['Spine1', 'Spine2', TRUNK_R]]) {
    const b0 = P(b0n), b1 = P(b1n), [d, s, t] = segD(a0, a1, b0, b1);
    const r = (ARM_R[0] + (ARM_R[1] - ARM_R[0]) * s + R[0] + (R[1] - R[0]) * t) / k, pen = (r + 0.01 / k - d) * k;
    if (pen > worst.pen) worst = { pen, pA: a0.clone().lerp(a1, s), pB: b0.clone().lerp(b1, t), share: R === ARM_R ? 0.5 : 1 };
  }
  return worst;
}

// Masses des segments (Dempster, fraction du corps), comme le banc d'essai : centre de masse du corps.
const SEG = [['Hips', 'Neck', 0.497], ['Neck', 'HeadTop_End', 0.081], ['LeftArm', 'LeftForeArm', 0.028], ['RightArm', 'RightForeArm', 0.028], ['LeftForeArm', 'LeftHand', 0.016], ['RightForeArm', 'RightHand', 0.016],
  ['LeftUpLeg', 'LeftLeg', 0.1], ['RightUpLeg', 'RightLeg', 0.1], ['LeftLeg', 'LeftFoot', 0.0465], ['RightLeg', 'RightFoot', 0.0465], ['LeftFoot', 'LeftToeBase', 0.0145], ['RightFoot', 'RightToeBase', 0.0145]];

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
  // Taille au repos (sommet du crâne → orteils), pour exprimer les rayons des membres à l'échelle du corps.
  const hb = Object.keys(B).find((k) => /HeadTop_End/.test(k)), tb = Object.keys(B).find((k) => /LeftToe_?End/.test(k)) || 'LeftFoot';
  const lp = (n) => B[n].getWorldPosition(new THREE.Vector3()).applyMatrix4(obj.matrixWorld.clone().invert());
  const bodyK = hb ? 1.75 / Math.max(0.01, lp(hb).y - lp(tb).y) : 1;
  const restAnkle = B.LeftToe_End ? lp('LeftFoot').y - lp('LeftToe_End').y : 0; // cheville au-dessus du bout des orteils, pied à plat
  const d = (n) => wq(n).multiply(restW[n].clone().invert()); // rotation depuis le repos
  const setD = (n, dq) => { // impose l'orientation (dans le repère du corps) d'un os, ses enfants suivent
    const b = B[n], world = objQ.clone().multiply(dq.clone().multiply(restW[n]));
    const pw = b.parent.getWorldQuaternion(Q());
    b.quaternion.copy(pw.invert().multiply(world)); b.updateMatrixWorld(true);
  };
  // Écarte les deux cuisses de `a` radians au total (abduction pure : axe ⟂ à la cuisse et à l'axe latéral du bassin,
  // pour qu'une jambe levée devant s'écarte au lieu de tourner sur elle-même).
  // Appui sur les mains et les pieds (planche, burpee) : écarter les jambes ferait glisser les pieds au sol.
  const plankLike = () => feetPlanted() && ['Left', 'Right'].some((S) => B[S + 'HandMiddle1'] && (pos(S + 'HandMiddle1').y - toeMin) * bodyK < 0.25);
  const feetPlanted = () => B.LeftToe_End && B.RightToe_End && ['Left', 'Right'].every((S) => (pos(S + 'Toe_End').y - toeMin) * bodyK < 0.03);
  const abdMax = () => Math.max(...[['Left', 1], ['Right', -1]].map(([S, sg]) => { // abduction de hanche (°), dans le repère du bassin
    const th = pos(S + 'Leg').sub(pos(S + 'UpLeg')).applyQuaternion(d('Hips').invert()).normalize(); return Math.asin(Math.max(-1, Math.min(1, sg * th.x))) * DEG; })); // angle hors du plan sagittal, juste même cuisse levée
  const abduct = (a) => {
    const lat = V(1, 0, 0).applyQuaternion(d('Hips'));
    for (const [S, sg] of [['Left', 1], ['Right', -1]]) {
      const th = pos(S + 'Leg').sub(pos(S + 'UpLeg')).normalize(), ax = V().crossVectors(th, lat);
      if (ax.lengthSq() < 1e-6) continue;
      setD(S + 'UpLeg', Q().setFromAxisAngle(ax.normalize(), (sg * a) / 2).multiply(d(S + 'UpLeg')));
    }
  };
  // Repousse l'avant-bras `S` hors de ce qu'il traverse : rotation du bras à l'épaule, de `a` radians, dans le sens
  // qui éloigne le point de contact (recalculé à chaque image, donc valable aussi en fondu sur les images voisines).
  const crossed = (S) => { const out = V(S === 'Left' ? 1 : -1, 0, 0).applyQuaternion(d('Spine2')); return -pos(S + 'ForeArm').sub(pos(S + 'Arm')).normalize().dot(out); };
  const pushArm = (S, a) => {
    const c = armClash((m) => pos(m), bodyK, S); if (!c.pA) return;
    const sh = pos(S + 'Arm'), lever = c.pA.clone().sub(sh), n = c.pA.clone().sub(c.pB).normalize();
    // Jamais vers l'autre côté du corps : l'épaule est déjà au bout du bras croisé dans les étirements.
    const out = V(S === 'Left' ? 1 : -1, 0, 0).applyQuaternion(d('Spine2')), o = n.dot(out);
    if (o < 0) { n.addScaledVector(out, -o); if (n.lengthSq() < 0.04) return; }
    const ax = V().crossVectors(lever, n); if (ax.lengthSq() < 1e-8) return;
    setD(S + 'Arm', Q().setFromAxisAngle(ax.normalize(), a).multiply(d(S + 'Arm')));
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
  const out = Object.fromEntries(tracked.map(([nm]) => [nm, new Float32Array(n * 4)])), outHips = new Float32Array(n * 3);

  let hipsPos = null; // position du bassin imposée par le contrôleur d'équilibre (repère du parent), sinon null
  const balanceStanding = () => {
    hipsPos = null;
    if (!stance || !B.LeftToe_End || !B.RightToe_End || !B.HeadTop_End || !feetPlanted()) return;
    const k = 1 / bodyK, P = (m) => pos(m);
    for (const S of ['Left', 'Right']) if (B[S + 'HandMiddle1'] && P(S + 'HandMiddle1').y - toeMin < 0.25 * k) return; // appui sur les mains
    if (P('Hips').y - toeMin < 0.55 * k) return; // assis, accroupi, à genoux : pas debout
    const com = V(); let m = 0; for (const [a, b, w] of SEG) if (B[a] && B[b]) { com.addScaledVector(P(a).add(P(b)).multiplyScalar(0.5), w); m += w; }
    com.multiplyScalar(1 / m);
    const aL = P('LeftFoot'), aR = P('RightFoot'), A = aL.clone().add(aR).multiplyScalar(0.5);
    const F = P('LeftToe_End').sub(aL).add(P('RightToe_End').sub(aR)).setY(0).normalize(), up = V(0, 1, 0);
    const along = (q) => q.clone().sub(A).dot(F);
    // Talon posé tant que la cheville reste à sa hauteur pied à plat (+ 3 cm) ; sinon l'appui commence à l'avant-pied.
    const back = (S, a) => (a.y - toeMin < restAnkle + 0.03 * k ? along(a) - 0.05 * k : along(P(S + 'ToeBase')) - 0.02 * k);
    const lo = Math.min(back('Left', aL), back('Right', aR)), hi = Math.max(along(P('LeftToe_End')), along(P('RightToe_End'))), c = along(com);
    const margin = 0.06 * k, delta = c < lo + margin ? lo + margin - c : c > hi - margin ? hi - margin - c : 0;
    if (!delta) return;
    const h = Math.max(0.3 * k, com.y - A.y), R = Q().setFromAxisAngle(V().crossVectors(up, F).normalize(), delta / h);
    const keep = {}; for (const S of ['Left', 'Right']) for (const nm of [S + 'Foot', S + 'ToeBase']) if (B[nm]) keep[nm] = d(nm);
    const hp = P('Hips').sub(A).applyQuaternion(R).add(A); // le bassin tourne autour des chevilles
    setD('Hips', R.clone().multiply(d('Hips')));
    const w = hp.applyMatrix4(obj.matrixWorld); B.Hips.position.copy(B.Hips.parent.worldToLocal(w)); obj.updateMatrixWorld(true);
    for (const nm in keep) setD(nm, keep[nm]); // pieds à plat, au même endroit
    hipsPos = B.Hips.position.clone();
  };
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
    // 8. Jambes qui se croisent (course, sauts) : si un tibia passe dans l'autre jambe, les deux cuisses s'écartent
    //    juste assez (rotation autour de l'axe avant du bassin), comme un appui un peu plus large.
    for (let it = 0; it < 8; it++) {
      const P = (n) => pos(n), gap = sepNeeded(P, bodyK);
      if (gap <= 0 || feetPlanted() || abdMax() > 50) break; // pieds posés : corrigés après coup, d'un bloc (voir plus bas)
      abduct(Math.min(0.12, gap / 0.85));
    }
    // 8 bis. Équilibre debout (contrôleur d'équilibre, comme dans un moteur de jeu) : deux pieds posés, ni mains ni
    //    fesses au sol, centre de masse devant les orteils ou derrière les talons → tout le corps pivote autour des
    //    chevilles (les tibias s'inclinent), pieds fixes et à plat, jusqu'à revenir à 6 cm à l'intérieur de l'appui.
    balanceStanding();
    // 9. Cou (tête par rapport au thorax).
    const [nx, ny, nz] = ang('XZY', rel('Spine2', 'Head'));
    const na = [clamp(nx, -LIM.neck.ext, LIM.neck.flex), clamp(ny, -LIM.neck.twist, LIM.neck.twist), clamp(nz, -LIM.neck.lat, LIM.neck.lat)];
    if (na.some((v, k) => Math.abs(v - [nx, ny, nz][k]) > 0.05)) setD('Head', d('Spine2').multiply(fromAng('XZY', na)));
  };

  // Sol du clip (orteil le plus bas sur tout le geste), pour savoir quand les deux pieds sont posés.
  let toeMin = Infinity, stance = false;
  if (B.LeftToe_End && B.RightToe_End) {
    const toes = [];
    for (let i = 0; i < n; i++) { mixer.setTime(Math.min(T, (T * i) / (n - 1))); obj.updateMatrixWorld(true); const l = pos('LeftToe_End'), r = pos('RightToe_End'); toes.push([l, r]); toeMin = Math.min(toeMin, l.y, r.y); }
    // Position tenue (étirements, debout sur place) : les deux pieds restent posés au même endroit tout le geste.
    // Seuls ces gestes reçoivent le contrôleur d'équilibre ; sauts, course et haltérophilie gardent leur dynamique.
    const k = 1 / bodyK, [l0, r0] = toes[0];
    stance = toes.every(([l, r]) => l.y - toeMin < 0.03 * k && r.y - toeMin < 0.03 * k && Math.hypot(l.x - l0.x, l.z - l0.z) < 0.1 * k && Math.hypot(r.x - r0.x, r.z - r0.z) < 0.1 * k);
    act.reset(); act.play(); // l'action s'arrête en fin de clip (LoopOnce) : on la relance pour le vrai passage
  }
  for (let i = 0; i < n; i++) {
    mixer.setTime(Math.min(T, (T * i) / (n - 1))); obj.updateMatrixWorld(true);
    fixFrame();
    for (const [nm] of tracked) { const q = B[nm].quaternion; out[nm].set([q.x, q.y, q.z, q.w], i * 4); }
    B.Hips.position.toArray(outHips, i * 3);
  }

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
  // Membres qui se traversent, après lissage (le lissage dilue la correction image par image) : jambes qui se croisent,
  // avant-bras dans l'autre avant-bras ou dans une cuisse. On mesure l'écart manquant sur le geste lissé, puis on
  // l'applique en fondu sur ±5 images pour ne créer aucun à-coup (réponse aux collisions, comme dans un moteur de jeu).
  const legTracks = ['LeftUpLeg', 'RightUpLeg'].map((nm) => tracked.find(([m]) => m === nm));
  if (legTracks.every(Boolean)) {
    const setPose = (i) => { mixer.setTime(Math.min(T, (T * i) / (n - 1))); for (const [nm] of tracked) B[nm].quaternion.fromArray(out[nm], i * 4); B.Hips.position.fromArray(outHips, i * 3); obj.updateMatrixWorld(true); };
    const onFloor = new Uint8Array(n), need = new Float32Array(n), needL = new Float32Array(n), needR = new Float32Array(n), hasArms = B.LeftForeArm && B.RightForeArm;
    for (let i = 0; i < n; i++) {
      setPose(i); let tot = 0;
      // Deux pieds posés : écarter les cuisses ferait glisser les pieds (jambes serrées en planche) ; hanche déjà très
      // ouverte : on n’écarte pas au-delà de 50° (mesure proche de celle du banc d’essai, avec marge) d'abduction.
      const planted = plankLike();
      if (!planted) for (let it = 0; it < 10; it++) { const g = sepNeeded((m) => pos(m), bodyK); if (g <= 0 || abdMax() > 50) break; const a = Math.min(0.12, g / 0.85); abduct(a); tot += a; }
      need[i] = tot; onFloor[i] = feetPlanted() ? 1 : 0;
      if (hasArms) for (const [S, arr] of [['Left', needL], ['Right', needR]].sort((x, y) => crossed(x[0]) - crossed(y[0]))) for (let it = 0; it < 10; it++) { // le bras le moins croisé s'écarte d'abord
        const c = armClash((m) => pos(m), bodyK, S); if (c.pen <= 0) break;
        const a = Math.min(0.15, c.pen / Math.max(0.2, c.pA.distanceTo(pos(S + 'Arm')))); pushArm(S, a); arr[i] += a;
      }
    }
    const W = 5, fade = (nd) => Float32Array.from({ length: n }, (_, i) => { let m = 0; for (let j = Math.max(0, i - W); j <= Math.min(n - 1, i + W); j++) m = Math.max(m, nd[j] * (1 - Math.abs(i - j) / (W + 1))); return m; });
    if ([need, needL, needR].some((nd) => nd.some((x) => x > 0))) {
      const A = fade(need), AL = fade(needL), AR = fade(needR);
      // Pieds posés : une seule valeur sur tout l'appui (la plus forte), sinon les pieds glisseraient d'une image à l'autre.
      for (let i = 0; i < n;) { if (!onFloor[i]) { i++; continue; } let j = i; while (j < n && onFloor[j]) j++;
        let m = 0; for (let q = i; q < j; q++) m = Math.max(m, A[q]); for (let q = i; q < j; q++) A[q] = m; i = j; }
      for (let i = 0; i < n; i++) if (A[i] > 0 || AL[i] > 0 || AR[i] > 0) {
        setPose(i); if (A[i] > 0 && !plankLike()) { const room = Math.max(0, (50 - abdMax()) / DEG) * 2; abduct(Math.min(A[i], room)); } for (const [S, a] of [['Left', AL[i]], ['Right', AR[i]]]) for (let r = a; r > 1e-4; r -= 0.05) pushArm(S, Math.min(0.05, r)); // par petits pas : la direction de poussée suit le contact
        for (const nm of ['LeftUpLeg', 'RightUpLeg', 'LeftArm', 'RightArm']) if (out[nm]) B[nm].quaternion.toArray(out[nm], i * 4);
      }
    }
  }
  mixer.stopAllAction(); mixer.uncacheRoot(obj);
  obj.updateMatrixWorld(true);
  for (const [b, q, p] of saved) { b.quaternion.copy(q); b.position.copy(p); }
  obj.updateMatrixWorld(true);
  const tracks = clip.tracks.map((t) => {
    const hit = tracked.find(([, tt]) => tt === t);
    if (hit) return new THREE.QuaternionKeyframeTrack(t.name, times, out[hit[0]]);
    if (/Hips\.position$/.test(t.name)) return new THREE.VectorKeyframeTrack(t.name, times, outHips); // contrôleur d'équilibre
    return t.clone();
  });
  const c = new THREE.AnimationClip(clip.name, T, tracks);
  c.userData = { ...clip.userData, tmLimited: undefined, limited: true };
  return (memo[key] = c);
}

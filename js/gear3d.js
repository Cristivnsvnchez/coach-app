// Matériel 3D (models/gear.glb, modélisé par tools/build-gear.py) accroché au corps animé : haltères et barre dans les
// mains, barre sur le haut du dos (squat), kettlebell à deux mains, banc posé au sol. Partagé par la visionneuse,
// les vignettes et le banc d'essai : la position est recalculée à chaque image depuis les os (pas de matériel qui flotte).
//
// `gear` (voir model3D dans technique.js) : { hold, bench }
// - hold : 'bar' (barre entre les deux mains), 'barBack' (barre sur les trapèzes, mains dessus), 'barFront' (barre posée
//   sur l'avant des épaules, doigts dessous : squat avant), 'dumbbells' (une par main),
//   'dumbbellR' / 'dumbbellL' (une seule main), 'kettlebell' (une, à deux mains) ;
// - bench : { type: 'flat' | 'incline', at: [côté, hauteur, avant] } dans le repère des poses (js/poses.js, mètres pour 1,75 m),
//   origine au sol sous le bassin au repos ; `yaw` en degrés (0 : banc dans l'axe du corps).

const NAMES = { bar: 'TM_Barbell', barBack: 'TM_Barbell', dumbbell: 'TM_Dumbbell', kettlebell: 'TM_Kettlebell', flat: 'TM_Bench', incline: 'TM_BenchIncline',
  legpress: 'TM_LegPress', legext: 'TM_LegExt' };
// Machines : partie fixe posée comme un banc (`gear.machine = { type, at, yaw }`), parties mobiles animées depuis les os.
const LEGPRESS_RAIL = Math.PI / 4; // le chariot glisse à 45° (tools/build-gear.py)
const LEGEXT_PIVOT = [0, 0.58, 0.38]; // axe du bras, à hauteur du genou (repère des poses, machine en [0, 0, 0])

// Centre de la prise et axe de la poignée, depuis les os de la main (poing fermé autour de la poignée).
export function gripOf(THREE, B, S, out = { c: new THREE.Vector3(), axis: new THREE.Vector3(), dir: new THREE.Vector3() }) {
  const p = (n) => B[S + n].getWorldPosition(new THREE.Vector3());
  const h = p('Hand'), i1 = p('HandIndex1'), p1 = p('HandPinky1'), m1 = p('HandMiddle1'), m2 = p('HandMiddle2'), fa = p('ForeArm');
  out.dir.subVectors(h, fa).normalize(); // direction de l'avant-bras (la main la prolonge)
  out.axis.subVectors(i1, p1).normalize(); // de l'auriculaire vers l'index : la poignée traverse la paume
  // Paume : du dos de la main vers l'intérieur du poing (côté où les doigts se referment).
  const palm = new THREE.Vector3().subVectors(m2, m1);
  palm.addScaledVector(out.axis, -palm.dot(out.axis)).addScaledVector(out.dir, -palm.dot(out.dir));
  if (palm.lengthSq() < 1e-8) palm.crossVectors(out.axis, out.dir);
  palm.normalize();
  const len = m1.distanceTo(h); // longueur de la paume (s'adapte à l'échelle du corps)
  // Poing fermé : la poignée est au centre du « tube » que forment les doigts repliés (cercle passant par les
  // articulations de chaque doigt). Main ouverte (tube trop large) : point fixe dans la paume.
  let n = 0; const sum = new THREE.Vector3();
  for (const f of ['Index', 'Middle', 'Ring']) {
    const t = tube(p('Hand' + f + '2'), p('Hand' + f + '3'), p('Hand' + f + '4'));
    if (t && t.r < 0.45 * len) { sum.add(t.c); n++; }
  }
  if (n === 3) out.c.copy(sum.multiplyScalar(1 / n));
  else out.c.copy(m1).addScaledVector(out.dir, -0.18 * len).addScaledVector(palm, 0.42 * len);
  return out;
}
// Cercle passant par trois points (centre, rayon) ; null s'ils sont presque alignés (doigt tendu).
export function tube(a, b, c) {
  const ab = b.clone().sub(a), ac = c.clone().sub(a), nrm = ab.clone().cross(ac), d = 2 * nrm.lengthSq();
  if (d < 1e-12) return null;
  const o = nrm.clone().cross(ab).multiplyScalar(ac.lengthSq()).add(ac.clone().cross(nrm).multiplyScalar(ab.lengthSq())).divideScalar(d);
  return { c: a.clone().add(o), r: o.length() };
}

// Où la barre doit reposer au squat (sur les trapèzes, derrière la base du cou) : le banc d'essai vérifie que les poings
// l'y amènent (tools/motion-audit.mjs).
export function barOnBack(THREE, B) {
  const p = (n) => B[n].getWorldPosition(new THREE.Vector3());
  const n = p('Neck'), s2 = p('Spine2'), axis = p('RightShoulder').sub(p('LeftShoulder')).normalize(), up = n.clone().sub(s2).normalize();
  const back = new THREE.Vector3().crossVectors(axis, up).normalize(); // épaule gauche → droite × haut = vers l'arrière
  const len = n.distanceTo(s2);
  return { c: n.addScaledVector(up, -0.1 * len).addScaledVector(back, 0.22 * len), axis, up };
}

// Où la barre repose au squat avant : sur l'avant des épaules (deltoïdes), devant la base du cou.
export function barOnFront(THREE, B) {
  const p = (n) => B[n].getWorldPosition(new THREE.Vector3());
  const n = p('Neck'), s2 = p('Spine2'), axis = p('RightShoulder').sub(p('LeftShoulder')).normalize(), up = n.clone().sub(s2).normalize();
  const fwd = new THREE.Vector3().crossVectors(up, axis).normalize(), len = n.distanceTo(s2);
  return { c: n.addScaledVector(up, -0.15 * len).addScaledVector(fwd, 0.36 * len), axis, up };
}

export function attachGear(THREE, gearGltf, obj, gear, clip) {
  const none = { update() {}, points: () => [], meshes: [], dispose() {} };
  if (!gear || !gearGltf) return none;
  const B = {}; obj.traverse((o) => { if (o.isBone) { const n = o.name.replace(/^mixamorig:?/, ''); B[n] ||= o; } });
  const src = (n) => gearGltf.scene.getObjectByName(n);
  const meshes = [], items = [];
  const add = (name) => { const m = src(name)?.clone(); if (!m) return null; m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); meshes.push(m); return m; };
  // Le corps est mis à l'échelle (1,75 m) : le matériel, à taille réelle, vit dans un groupe frère du corps, sans
  // transformation (coordonnées monde), recalculé à chaque image.
  const holder = new THREE.Group(); (obj.parent || obj).add(holder);
  const h = gear.hold;
  if (h === 'bar' || h === 'barBack' || h === 'barFront') items.push({ kind: h, mesh: add(NAMES.bar) });
  if (h === 'dumbbells' || h === 'dumbbellR') items.push({ kind: 'db', S: 'Right', mesh: add(NAMES.dumbbell) });
  if (h === 'dumbbells' || h === 'dumbbellL') items.push({ kind: 'db', S: 'Left', mesh: add(NAMES.dumbbell) });
  if (h === 'kettlebell') items.push({ kind: 'kb', mesh: add(NAMES.kettlebell) });
  for (const it of items) if (it.mesh) holder.add(it.mesh);
  // Banc : repère des poses (clip.userData.frame) → monde, au moment de la construction ; ensuite il suit le corps.
  let bench = null, benchLocal = null;
  const fr = clip?.userData?.frame;
  if (gear.bench && fr) {
    bench = add(NAMES[gear.bench.type]);
    if (bench) {
      const [x, y, z] = gear.bench.at, w = new THREE.Vector3().copy(fr.origin).addScaledVector(fr.R, x / fr.s).addScaledVector(fr.U, y / fr.s).addScaledVector(fr.F, z / fr.s);
      benchLocal = obj.worldToLocal(w.clone()); // suit le corps quand la visionneuse recale le sol
      bench.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fr.F.clone().applyAxisAngle(fr.U, ((gear.bench.yaw || 0) * Math.PI) / 180));
      holder.add(bench);
    }
  }
  // Machine : partie fixe comme un banc ; repère machine (position + orientation) gardé pour les parties mobiles.
  let mach = null, machLocal = null;
  const machQ = new THREE.Quaternion(), toMachine = (p) => p.clone().sub(mach.position).applyQuaternion(machQ.clone().invert());
  const fromMachine = (v) => v.clone().applyQuaternion(machQ).add(mach.position);
  let sled = null, railO = null, railD = null, legArm = null;
  if (gear.machine && fr) {
    mach = add(NAMES[gear.machine.type]);
    if (mach) {
      const [x, y, z] = gear.machine.at, w = new THREE.Vector3().copy(fr.origin).addScaledVector(fr.R, x / fr.s).addScaledVector(fr.U, y / fr.s).addScaledVector(fr.F, z / fr.s);
      machLocal = obj.worldToLocal(w.clone()); mach.position.copy(w);
      machQ.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fr.F.clone().applyAxisAngle(fr.U, ((gear.machine.yaw || 0) * Math.PI) / 180)); mach.quaternion.copy(machQ);
      holder.add(mach);
      if (gear.machine.type === 'legpress') { sled = add('TM_LegPressSled'); if (sled) holder.add(sled); }
      if (gear.machine.type === 'legext') { legArm = add('TM_LegExtArm'); if (legArm) holder.add(legArm); }
    }
  }
  const ankleMid = () => B.LeftFoot.getWorldPosition(new THREE.Vector3()).add(B.RightFoot.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
  const gA = gripOf(THREE, B, 'Left'), gB = { c: new THREE.Vector3(), axis: new THREE.Vector3(), dir: new THREE.Vector3() };
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3(), m4 = new THREE.Matrix4();
  // Oriente un objet dont l'axe est X (barre, poignée) sur `axis`, avec `up` comme direction secondaire (Y local).
  const orient = (mesh, axis, up) => {
    const x = axis.clone().normalize(), z = new THREE.Vector3().crossVectors(x, up).normalize(), y = new THREE.Vector3().crossVectors(z, x);
    if (z.lengthSq() < 1e-6) { mesh.quaternion.setFromUnitVectors(X, x); return; }
    mesh.quaternion.setFromRotationMatrix(m4.makeBasis(x, y, z));
  };
  const update = () => {
    obj.updateMatrixWorld(true);
    if (bench) bench.position.copy(obj.localToWorld(benchLocal.clone()));
    if (mach) {
      mach.position.copy(obj.localToWorld(machLocal.clone()));
      if (sled) { // chariot de la presse : son plateau reste contre la plante des pieds, il glisse le long du rail
        railD ||= new THREE.Vector3(0, Math.sin(LEGPRESS_RAIL), Math.cos(LEGPRESS_RAIL)).applyQuaternion(machQ);
        const sole = ankleMid().addScaledVector(railD, 0.07);
        // Ligne du rail : passe par la plante des pieds (point donné dans le repère de la machine, `gear.machine.rail` = [haut, avant]).
        railO ||= new THREE.Vector3(0, gear.machine.rail[0], gear.machine.rail[1]); const O = fromMachine(railO);
        sled.position.copy(O).addScaledVector(railD, sole.sub(O).dot(railD));
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(machQ); up.addScaledVector(railD, -up.dot(railD)).normalize();
        const xx = new THREE.Vector3().crossVectors(up, railD);
        sled.quaternion.setFromRotationMatrix(m4.makeBasis(xx, up, railD));
      }
      if (legArm) { // leg extension : le bras tourne autour de l'axe du genou, le rouleau sur le bas des tibias
        const pivot = fromMachine(new THREE.Vector3(-LEGEXT_PIVOT[0], LEGEXT_PIVOT[1], LEGEXT_PIVOT[2]));
        const shin = B.LeftFoot.getWorldPosition(new THREE.Vector3()).sub(B.LeftLeg.getWorldPosition(new THREE.Vector3())).normalize();
        const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(machQ).cross(shin).normalize(); // devant du tibia
        const target = toMachine(ankleMid().addScaledVector(shin, -0.06).addScaledVector(fwd, 0.065).sub(pivot).add(mach.position));
        legArm.position.copy(pivot);
        legArm.quaternion.copy(machQ).multiply(new THREE.Quaternion().setFromAxisAngle(X, Math.atan2(-target.z, -target.y)));
      }
    }
    for (const it of items) {
      const m = it.mesh; if (!m) continue;
      if (it.kind === 'db') {
        const g = gripOf(THREE, B, it.S, gB);
        m.position.copy(g.c); orient(m, g.axis, g.dir.clone().negate());
      } else if (it.kind === 'barFront') { // squat avant : posée sur l'avant des épaules, les doigts dessous
        const { c, axis, up } = barOnFront(THREE, B); m.position.copy(c); orient(m, axis, up);
      } else if (it.kind === 'bar' || it.kind === 'barBack' || it.kind === 'kb') { // tenue par les deux poings (sur le dos : voir barOnBack)
        const a = gripOf(THREE, B, 'Left', gA), b = gripOf(THREE, B, 'Right', gB);
        const axis = tmp.subVectors(b.c, a.c);
        m.position.addVectors(a.c, b.c).multiplyScalar(0.5);
        if (it.kind !== 'kb') orient(m, axis, Y);
        else { // kettlebell : poignée entre les mains, la boule pend dans le prolongement des avant-bras
          const down = a.dir.clone().add(b.dir).normalize();
          orient(m, axis, down.negate());
        }
      }
    }
  };
  update();
  // Points extrêmes du matériel (cadrage de la caméra) : bouts de barre avec le rayon des disques, banc.
  const box = new THREE.Box3();
  const points = () => { const out = []; for (const m of meshes) { box.setFromObject(m); out.push(box.min.clone(), box.max.clone(), new THREE.Vector3(box.min.x, box.max.y, box.max.z), new THREE.Vector3(box.max.x, box.max.y, box.min.z)); } return out; };
  const dispose = () => { holder.removeFromParent(); };
  return { update, points, meshes, bench, holder, dispose, debug: () => ({ sled: sled?.position.toArray(), ankle: ankleMid().toArray(), mach: mach?.position.toArray(), railD: railD?.toArray() }) };
}

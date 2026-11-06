// Matériel 3D (models/gear.glb, modélisé par tools/build-gear.py) accroché au corps animé : haltères et barre dans les
// mains, barre sur le haut du dos (squat), kettlebell à deux mains, banc posé au sol. Partagé par la visionneuse,
// les vignettes et le banc d'essai : la position est recalculée à chaque image depuis les os (pas de matériel qui flotte).
//
// `gear` (voir model3D dans technique.js) : { hold, bench }
// - hold : 'bar' (barre entre les deux mains), 'barBack' (barre sur les trapèzes, mains dessus), 'dumbbells' (une par main),
//   'dumbbellR' / 'dumbbellL' (une seule main), 'kettlebell' (une, à deux mains) ;
// - bench : { type: 'flat' | 'incline', at: [côté, hauteur, avant] } dans le repère des poses (js/poses.js, mètres pour 1,75 m),
//   origine au sol sous le bassin au repos ; `yaw` en degrés (0 : banc dans l'axe du corps).

const NAMES = { bar: 'TM_Barbell', barBack: 'TM_Barbell', dumbbell: 'TM_Dumbbell', kettlebell: 'TM_Kettlebell', flat: 'TM_Bench', incline: 'TM_BenchIncline' };

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
  out.c.copy(m1).addScaledVector(out.dir, -0.18 * len).addScaledVector(palm, 0.42 * len);
  return out;
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
  if (h === 'bar' || h === 'barBack') items.push({ kind: h, mesh: add(NAMES.bar) });
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
    for (const it of items) {
      const m = it.mesh; if (!m) continue;
      if (it.kind === 'db') {
        const g = gripOf(THREE, B, it.S, gB);
        m.position.copy(g.c); orient(m, g.axis, g.dir.clone().negate());
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
  return { update, points, meshes, bench, holder, dispose };
}

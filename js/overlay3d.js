// Tracés par-dessus la scène 3D (façon vidéos de technique) : ligne-guide reliant des articulations (dos droit,
// genou au-dessus du pied…) et flèche courbe qui suit le trajet d'un point du corps ou du matériel pendant la
// répétition. Toujours visibles (dessinés après le corps, sans test de profondeur), avec un halo plus large.

export const GREEN = 0x3ddc84, RED = 0xff4d4d;

// Tube lumineux le long d'une suite de points (coordonnées monde) : cœur + halo.
function tubeMeshes(THREE, color) {
  const core = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false });
  const halo = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const a = new THREE.Mesh(new THREE.BufferGeometry(), core), b = new THREE.Mesh(new THREE.BufferGeometry(), halo);
  a.renderOrder = 20; b.renderOrder = 19; a.frustumCulled = b.frustumCulled = false;
  return [a, b];
}
function setTube(THREE, [a, b], pts, r) {
  if (pts.length < 2) { a.visible = b.visible = false; return; }
  a.visible = b.visible = true;
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const seg = Math.max(8, pts.length * 6);
  a.geometry.dispose(); b.geometry.dispose();
  a.geometry = new THREE.TubeGeometry(curve, seg, r, 6, false);
  b.geometry = new THREE.TubeGeometry(curve, seg, r * 2.6, 6, false);
}

// Ligne-guide : relie des os, recalculée à chaque image.
export function guideLine(THREE, bones, color, radius = 0.011) {
  const group = new THREE.Group(), meshes = tubeMeshes(THREE, color);
  group.add(...meshes);
  const update = () => setTube(THREE, meshes, bones.filter(Boolean).map((b) => b.getWorldPosition(new THREE.Vector3())), radius);
  const dispose = () => { meshes.forEach((m) => { m.geometry.dispose(); m.material.dispose(); }); group.removeFromParent(); };
  return { group, update, dispose };
}

// Flèche : trajet échantillonné (points monde), du départ jusqu'au point le plus éloigné (une demi-répétition),
// légèrement écarté du corps (`offset`), terminé par une pointe.
export function pathArrow(THREE, path, color, { offset = null, radius = 0.009 } = {}) {
  const group = new THREE.Group();
  if (path.length < 3) return { group, dispose() {} };
  let far = 0, fd = 0; path.forEach((p, i) => { const d = p.distanceTo(path[0]); if (d > fd) { fd = d; far = i; } });
  if (fd < 0.06) return { group, dispose() {} }; // presque immobile : pas de flèche
  let len = 0; for (let i = 1; i < path.length; i++) len += path[i].distanceTo(path[i - 1]);
  if (len > 4.5 * fd) return { group, dispose() {} }; // trajet en boucle (course, sauts) : une flèche serait illisible
  const pts = path.slice(0, far + 1).map((p) => (offset ? p.clone().add(offset) : p.clone()));
  // Points trop proches retirés (la courbe reste lisse).
  const clean = [pts[0]]; for (const p of pts) if (p.distanceTo(clean[clean.length - 1]) > 0.02) clean.push(p);
  if (clean.length < 2) return { group, dispose() {} };
  const end = clean[clean.length - 1], dir = end.clone().sub(clean[clean.length - 2]).normalize();
  const shaft = clean.slice(0, -1).concat([end.clone().addScaledVector(dir, -0.045)]);
  const meshes = tubeMeshes(THREE, color); setTube(THREE, meshes, shaft, radius); group.add(...meshes);
  const headMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false });
  const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 3.2, 0.07, 14), headMat);
  head.position.copy(end).addScaledVector(dir, -0.012); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  head.renderOrder = 21; group.add(head);
  const dispose = () => { meshes.forEach((m) => { m.geometry.dispose(); m.material.dispose(); }); head.geometry.dispose(); headMat.dispose(); group.removeFromParent(); };
  return { group, dispose };
}

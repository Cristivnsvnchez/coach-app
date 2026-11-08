// Studio 3D partagé par la visionneuse (viewer3d.js) et les vignettes (tools/render-thumbs.js) : mannequin d'argile
// grise mate sous une lumière de studio photo (principale chaude, deux contre-jours qui détourent la silhouette).

export const CLAY = 0xb2b4b8; // argile grise mate (peau sans texture de couleur)
export const CLOTH = { top: 0x141518, shorts: 0x111214 }; // brassière et short noirs
export const NORMAL_BOOST = 1.7; // relief des muscles (texture normale cuite) accentué sur la peau

// Lampes posées pour une caméra en +Z : faire tourner le groupe avec la caméra garde le même éclairage sous tous les angles.
export function studioLights(THREE, { shadow = true } = {}) {
  const group = new THREE.Group();
  const hemi = new THREE.HemisphereLight(0xdfe3ea, 0x2a2b2e, 0.55);
  const key = new THREE.DirectionalLight(0xfff4e8, 2.6); key.position.set(1.6, 3.6, 2.6);
  if (shadow) {
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.002; key.shadow.normalBias = 0.05; key.shadow.radius = 4; // biais forts : sur iPhone (précision réduite) des taches apparaissaient au sol
    Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 9 });
  }
  const fill = new THREE.DirectionalLight(0xcfd6e4, 0.45); fill.position.set(-2.5, 1.2, 2.2);
  const rimL = new THREE.DirectionalLight(0xffffff, 3.2); rimL.position.set(-2.4, 2.2, -2.6);
  const rimR = new THREE.DirectionalLight(0xe8eeff, 2.6); rimR.position.set(2.6, 1.6, -2.4);
  group.add(key, fill, rimL, rimR);
  return { group, hemi, key };
}

// Type d'un matériau du corps d'après son nom (TM_Skin, TM_Shorts, TM_Top…).
export const kindOf = (name = '') => /short/i.test(name) ? 'shorts' : /shoe/i.test(name) ? 'shoes' : /top/i.test(name) ? 'top' : /hair/i.test(name) ? 'hair' : /sock/i.test(name) ? 'socks' : 'skin';

// Matériau de base (sans lueur musculaire) : argile pour la peau, tissu mat pour les vêtements.
export function clayMaterial(THREE, m, outfit = null) {
  const kind = kindOf(m.name), skin = kind === 'skin', cloth = ['top', 'shorts', 'shoes'].includes(kind);
  const color = cloth ? (outfit?.[kind] ?? CLOTH[kind] ?? 0x111214) : m.map ? 0xffffff : CLAY;
  const normalScale = m.normalMap ? (m.normalScale || new THREE.Vector2(1, 1)).clone().multiplyScalar(skin ? NORMAL_BOOST : 1) : undefined;
  const mm = new THREE.MeshStandardMaterial({ map: m.map, normalMap: m.normalMap, normalScale, color, roughness: skin ? 0.86 : 0.72, metalness: 0 });
  return { mm, kind, skin, cloth };
}

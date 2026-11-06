// Visionneuse 3D 360° des exercices : modèle humain animé (glb exporté de Blender depuis Mixamo), à tourner au doigt.
// three.js n'est chargé qu'à l'ouverture d'une fiche (vendor/three, ~700 Ko, mis en cache hors ligne par le service worker).
// En cas d'échec (pas de WebGL, fichier absent), le contenu de repli déjà présent dans le conteneur reste affiché.

const cache = new Map(); // url → Promise<gltf> : un seul téléchargement par session

const noop3D = { dispose() {}, setOutfit() {}, setMode() {} };

// `showcase` : vitrine (carte « Mouvement du jour ») — fond transparent sur un décor HTML, sans grille ni ombre,
// sans interaction (la carte reste cliquable), cadrage un peu plus serré.
export async function mount3D(box, { url, anim: animUrl, clip, muscles = {}, mistake, pose }, outfit = null, { showcase = false } = {}) {
  let THREE, GLTFLoader, OrbitControls, fix, buildPoseClip, studio;
  try {
    THREE = await import('../vendor/three/three.module.min.js');
    ({ GLTFLoader } = await import('../vendor/three/GLTFLoader.js'));
    ({ OrbitControls } = await import('../vendor/three/OrbitControls.js'));
    ({ buildPoseClip } = await import('./poses.js'));
    fix = await import('./motion-fix.js'); // corrections partagées avec le banc d'essai (tests/motion.test.mjs)
    studio = await import('./studio3d.js'); // argile et lumière partagées avec les vignettes
  } catch { return noop3D; }

  const canvas = document.createElement('canvas');
  canvas.className = 'v3d-canvas';
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch { return noop3D; } // pas de WebGL : on garde le repli
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x1e1f22, 0); // fond : dégradé gris studio de la carte (CSS), transparent en vitrine
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; // une seule ombre : la lampe principale

  // Studio façon « mannequin d'argile » : lumière principale chaude en 3/4 avant, deux contre-jours froids qui détourent
  // la silhouette, un peu de lumière d'ambiance, sol gris sombre qui reçoit une ombre douce et se fond dans le fond.
  const scene = new THREE.Scene();
  if (!showcase) scene.fog = new THREE.Fog(0x232427, 3.2, 7.5);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  const { group: lights, hemi, key } = studio.studioLights(THREE);
  scene.add(hemi, lights, key.target);
  // Sol de course sur place (grille discrète, montrée seulement si le sol défile) ; sol de studio : disque qui reçoit l'ombre.
  const grid = new THREE.GridHelper(12, 48, 0x4a4c52, 0x34363b);
  grid.material.transparent = true; grid.material.opacity = 0.35; grid.material.fog = true; grid.position.y = 0.001;
  const fc = document.createElement('canvas'); fc.width = fc.height = 256;
  const fx = fc.getContext('2d'), fg = fx.createRadialGradient(128, 128, 10, 128, 128, 128);
  fg.addColorStop(0, 'rgba(255,255,255,1)'); fg.addColorStop(0.4, 'rgba(255,255,255,.7)'); fg.addColorStop(1, 'rgba(255,255,255,0)');
  fx.fillStyle = fg; fx.fillRect(0, 0, 256, 256);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.5, 64), new THREE.MeshStandardMaterial({ color: 0x202124, roughness: 0.95, metalness: 0, alphaMap: new THREE.CanvasTexture(fc), transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; if (!showcase) scene.add(floor);
  // En vitrine (fond de palette) : seulement l'ombre portée, sur un sol invisible.
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: 0.28 }));
  catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; if (showcase) scene.add(catcher);

  // Ombre de contact douce (disque à dégradé radial) sous les pieds, en plus de l'ombre portée.
  const g = document.createElement('canvas'); g.width = g.height = 128;
  const gc = g.getContext('2d'), grad = gc.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,.45)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  gc.fillStyle = grad; gc.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(g), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; scene.add(shadow);

  // Corps (homme/femme) + animation de l'exercice dans un petit fichier à part (models/anim/<clip>.glb, squelette seul,
  // commun aux deux corps : mêmes os Mixamo). Chargés en parallèle, gardés en cache pour la session.
  const load = (u) => { if (!cache.has(u)) cache.set(u, new GLTFLoader().loadAsync(u)); return cache.get(u); };
  let gltf, animGltf = null;
  try {
    [gltf, animGltf] = await Promise.all([load(url), animUrl ? load(animUrl).catch(() => { cache.delete(animUrl); return null; }) : null]);
  } catch { cache.delete(url); renderer.dispose(); return noop3D; }

  const model = gltf.scene; // le cache garde l'original : on travaille sur une copie liée au squelette
  const { clone } = await import('../vendor/three/SkeletonUtils.js');
  const obj = clone(model);
  scene.add(obj);
  // Taille et position mesurées sur le squelette (la boîte englobante d'un maillage skinné est peu fiable),
  // puis normalisées à 1,75 m, pieds au sol, centré.
  const bonePos = (re) => { let p = null; obj.traverse((o) => { if (!p && o.isBone && re.test(o.name)) p = o.getWorldPosition(new THREE.Vector3()); }); return p; };
  obj.updateMatrixWorld(true);
  let top = bonePos(/HeadTop_End/), foot = bonePos(/LeftToe_?End|LeftFoot/), hips = bonePos(/Hips/);
  if (top && foot) {
    obj.scale.multiplyScalar(1.75 / Math.max(0.01, top.y - foot.y)); obj.updateMatrixWorld(true);
    foot = bonePos(/LeftToe_?End|LeftFoot/); hips = bonePos(/Hips/);
    obj.position.x -= hips.x; obj.position.z -= hips.z; obj.position.y -= foot.y - 0.02;
  }
  const size = new THREE.Vector3(0.6, 1.75, 0.6);

  // Matière « mannequin d'argile » : gris mat, relief des muscles (texture normale accentuée), muscles travaillés lumineux.
  // Le masque musculaire vient des poids de peau : chaque sommet sait à quels os il est lié (cuisses, dos, bras…).
  const uTime = { value: 0 };
  const uHighlight = { value: 1 }; // boosté à l'onglet Conseils : la lueur musculaire devient une planche anatomique
  const byKind = {}; // kind ('top'/'shorts'/'shoes') → matériaux à recolorer quand on change de tenue
  obj.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    o.castShadow = true; o.frustumCulled = false; // la boîte englobante d'un maillage skinné ne suit pas l'animation
    const names = o.skeleton.bones.map((b) => b.name.replace(/^mixamorig:?/, ''));
    // Lueur par os et par face : [avant, arrière] (biceps devant / triceps derrière sur le même os).
    const WF = new Array(96).fill(0), WB = new Array(96).fill(0);
    names.forEach((n, i) => { if (i < 96 && muscles[n]) { WF[i] = muscles[n][0]; WB[i] = muscles[n][1]; } });
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = mats.map((m) => {
      // Peau : argile grise ; vêtements : tissu noir recolorable sans recharger. La brassière laisse passer la lueur des pectoraux.
      const { mm, kind, skin, cloth } = studio.clayMaterial(THREE, m, outfit);
      const hair = kind === 'hair', glows = skin || kind === 'top';
      if (cloth) (byKind[kind] ||= []).push(mm);
      mm.customProgramCacheKey = () => 'tm-' + kind; // sinon three.js réutilise le 1er shader compilé
      mm.onBeforeCompile = (sh) => {
        sh.uniforms.uWF = { value: WF }; sh.uniforms.uWB = { value: WB }; sh.uniforms.uTime = uTime; sh.uniforms.uHighlight = uHighlight;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWF[96];\nuniform float uWB[96];\nvarying float vMask;')
          .replace('#include <skinning_vertex>', `#include <skinning_vertex>
            float back = smoothstep(0.55, -0.55, objectNormal.z); // les corps regardent vers +Z : dos = -Z (0 devant, 1 derrière)
            vMask = 0.0;
            for (int k = 0; k < 4; k++) { int ib = int(skinIndex[k]); vMask += mix(uWF[ib], uWB[ib], back) * skinWeight[k]; }`);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uHighlight;\nvarying float vMask;')
          .replace('#include <map_fragment>', cloth && m.map ? `#include <map_fragment>
            float grain = dot(sampledDiffuseColor.rgb, vec3(0.3, 0.59, 0.11));
            diffuseColor.rgb = diffuse * clamp(0.55 + grain * 0.9, 0.0, 1.25);` : '#include <map_fragment>')
          .replace('#include <dithering_fragment>', `
            float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.4);
            gl_FragColor.rgb += vec3(0.85, 0.88, 0.95) * fres * ${skin ? '0.07' : '0.04'}; // léger liseré neutre (les contre-jours font le reste)
            float m = smoothstep(0.2, 0.7, vMask) * ${glows ? '1.0' : '0.0'};
            float pulse = 0.85 + 0.15 * sin(uTime * 2.6);
            // Lueur : orange vif qui garde le relief de l'argile (multiplié par l'éclairage), bords plus chauds et plus clairs.
            float lum = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
            vec3 glow = mix(vec3(1.0, 0.52, 0.16), vec3(1.0, 0.3, 0.05), clamp(fres * 1.4, 0.0, 1.0)) * (0.45 + 1.1 * lum) + vec3(0.18, 0.05, 0.0);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, glow, clamp(m * 0.9 * pulse * uHighlight, 0.0, 1.0));
            #include <dithering_fragment>`);
      };
      return mm;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });

  const findBone = (re) => { let b = null; obj.traverse((o) => { if (!b && o.isBone && re.test(o.name)) b = o; }); return b; };
  // Onglet Erreurs : rotation fixe ajoutée par-dessus l'animation sur quelques os, pour montrer le défaut typique.
  // Onglet Conseils : pose figée + lueur musculaire renforcée, façon planche anatomique.
  let mistakeMode = false;
  const mistakeBones = Object.entries(mistake || {}).map(([n, off]) => ({ bone: findBone(new RegExp(n + '$')), off })).filter((x) => x.bone);
  const setMode = (tab) => {
    mistakeMode = tab === 'mistakes' && mistakeBones.length > 0;
    uHighlight.value = tab === 'tips' ? 1.7 : 1;
    if (act && !reduce) act.paused = tab === 'tips';
  };

  const mixer = new THREE.AnimationMixer(obj);
  // Clip corrigé (dérive retirée, retour vers la pose de départ si la répétition ne boucle pas) : voir motion-fix.js.
  const anim = pose ? buildPoseClip(THREE, obj, pose, clip) : fix.prepareClip(animGltf?.animations[0] || gltf.animations.find((a) => a.name.toLowerCase() === (clip || '').toLowerCase()) || gltf.animations[0], /-f\.glb$/.test(url) ? 'F' : 'M');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let act = null;
  if (anim) { act = mixer.clipAction(anim); act.play(); }

  // Cadrage sur TOUT le mouvement (pas seulement la pose de repos) : on échantillonne le clip, on relève la position
  // monde des os (+ les bouts de la barre), et on garde pour chaque point sa distance à l'axe vertical du corps
  // (ρ) et sa hauteur (y) — l'orbite tourne autour de cet axe, donc seuls ρ et y comptent.
  const MARGIN = 0.15; // tête, mains, pieds : l'os est au centre du membre
  const pts = []; // [ρ, y, marge]
  const wp = new THREE.Vector3();
  // Sol réel : point de peau le plus bas (sommets skinnés, 1 sur 15) + pieds, à chaque instant échantillonné.
  const skins = []; obj.traverse((o) => { if (o.isSkinnedMesh) skins.push(o); });
  const feetB = [/LeftToe_?End/, /RightToe_?End/, /LeftFoot$/, /RightFoot$/].map(findBone).filter(Boolean);
  const gframes = [], tv = new THREE.Vector3();
  const skinMin = () => { let y = Infinity; for (const sk of skins) { const n = sk.geometry.attributes.position.count;
    for (let k = 0; k < n; k += 15) { sk.getVertexPosition(k, tv); tv.applyMatrix4(sk.matrixWorld); if (tv.y < y) y = tv.y; } } return y; };
  const addPt = (v, m) => pts.push([Math.hypot(v.x, v.z), v.y, m]);
  const samplePose = () => {
    obj.updateMatrixWorld(true);
    obj.traverse((o) => { if (o.isBone) addPt(o.getWorldPosition(wp), MARGIN); });
    gframes.push({ skin: skinMin(), feet: feetB.map((b) => b.getWorldPosition(new THREE.Vector3())) });
  };
  const NS = 24;
  if (anim) { for (let i = 0; i < NS; i++) { mixer.setTime(anim.duration * i / NS); samplePose(); } mixer.setTime(0); }
  else samplePose();
  // Pieds au sol : le point de peau le plus bas sur tout le mouvement est posé à y = 0 (ni dans le sol, ni en l'air).
  const ground = Math.min(...gframes.map((f) => f.skin));
  if (Number.isFinite(ground)) {
    obj.position.y -= ground; obj.updateMatrixWorld(true);
    for (const q of pts) q[1] -= ground;
    for (const f of gframes) { f.skin -= ground; f.feet.forEach((q) => { q.y -= ground; }); }
  }
  // Course sur place : le sol défile à la vitesse des pieds posés (comme un tapis), sinon ils glisseraient.
  const beltV = new THREE.Vector3();
  if (anim && gframes.length > 2) {
    let n = 0; const dtS = anim.duration / NS;
    for (let i = 1; i < gframes.length; i++) gframes[i].feet.forEach((q, k) => { const a = gframes[i - 1].feet[k];
      if (a.y < 0.04 && q.y < 0.04) { beltV.x += (q.x - a.x) / dtS; beltV.z += (q.z - a.z) / dtS; n++; } });
    if (n) beltV.multiplyScalar(1 / n);
    if (beltV.length() < 0.6) beltV.set(0, 0, 0);
  }
  if (beltV.lengthSq() && !showcase) scene.add(grid); // course sur place : lignes au sol pour voir le sol défiler
  if (reduce && act) { act.paused = true; act.time = anim.duration * 0.5; }
  let yMin = 0, yMax = 0;
  for (const [, y, m] of pts) { yMin = Math.min(yMin, y - m); yMax = Math.max(yMax, y + m); }
  if (!pts.length) { yMin = 0; yMax = size.y || 1.7; }
  const yMid = (yMin + yMax) / 2;

  // Direction de vue 3/4 inchangée (rapport 1,05 : 0,62 : 1,5) ; seule la distance s'adapte au mouvement et au format.
  const viewDir = new THREE.Vector3(1.05, 0.62, 1.5).normalize();
  const elev = Math.asin(viewDir.y), cE = Math.cos(elev), sE = Math.sin(elev);
  // Distance minimale pour que chaque point tienne dans le champ vertical ET horizontal, quel que soit l'angle
  // d'orbite (16 azimuts testés). Pour un point p (relatif à la cible) : profondeur = D − p·dir, donc
  // D ≥ p·dir + |p·haut| / tan(fov/2) et D ≥ p·dir + |p·droite| / tan(hfov/2).
  const fitDistance = (aspect, list = pts, cap = true, mid = yMid) => {
    const tV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), tH = tV * aspect;
    let D = 0;
    for (const [rho, y, m] of list) {
      const r = rho + m;
      for (const dy of [y + m - mid, y - m - mid]) {
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2, f = r * Math.cos(a), s = r * Math.sin(a); // f : vers la caméra, s : latéral
          const depth = f * cE + dy * sE, up = -f * sE + dy * cE;
          D = Math.max(D, depth + Math.abs(up) / tV, depth + Math.abs(s) / tH);
        }
      }
    }
    // Plafond : 1,3 × le cadrage d'un corps debout (1,75 m). Sans ça, une planche (burpee, pompes) vue sous tous
    // les angles d'orbite éloigne trop la caméra et le mannequin devient minuscule ; on accepte qu'un bout dépasse.
    if (cap) D = Math.min(D, 1.3 * fitDistance(aspect, [[0.3, 0, 0.15], [0.3, 1.75, 0.15]], false, 0.875));
    return (D || 3.2) * (showcase && cap ? 1.06 : 1); // vitrine : léger recul, comme avant
  };

  // Caméra 3/4, orbite au doigt (pas de translation), légère rotation automatique tant qu'on ne touche pas.
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, yMid, 0);
  let fitD = fitDistance(1);
  const fogFor = (d) => { if (scene.fog) { scene.fog.near = d * 1.0; scene.fog.far = d * 2.35; } };
  fogFor(fitD);
  camera.position.copy(viewDir).multiplyScalar(fitD).add(controls.target);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = fitD * 0.5; controls.maxDistance = fitD * 1.65;
  controls.minPolarAngle = 0.25; controls.maxPolarAngle = Math.PI / 2 - 0.05; // jamais sous le sol
  controls.autoRotate = !reduce; controls.autoRotateSpeed = 1.2;
  controls.addEventListener('start', () => { controls.autoRotate = false; box.classList.add('touched'); });
  if (showcase) { controls.enabled = false; controls.autoRotateSpeed = 0.8; }
  controls.update();

  box.prepend(canvas);
  box.classList.add('ready');
  // Au redimensionnement : nouvel aspect → nouvelle distance de cadrage. On garde l'angle d'orbite courant et le
  // zoom éventuel de l'utilisateur (rapport distance actuelle / distance de cadrage).
  const camOff = new THREE.Vector3();
  const fit = () => {
    const w = box.clientWidth, hh = box.clientHeight; renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix();
    if (!w || !hh) return;
    camOff.subVectors(camera.position, controls.target);
    const zoom = THREE.MathUtils.clamp(camOff.length() / fitD, 0.5, 1.65);
    fitD = fitDistance(camera.aspect);
    fogFor(fitD);
    if (showcase) { // vitrine : le sol (y = 0) tombe près du bas de la carte, l'avatar a les pieds posés
      const halfH = fitD * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * cE;
      controls.target.y = Math.max(yMid, halfH * 0.78);
    }
    controls.minDistance = fitD * 0.5; controls.maxDistance = fitD * 1.65;
    camera.position.copy(controls.target).add(camOff.setLength(fitD * zoom));
    controls.update();
  };
  const ro = new ResizeObserver(fit); ro.observe(box); fit();

  // Boucle de rendu : arrêtée quand la fiche n'est pas visible (économie de batterie).
  const clock = new THREE.Clock();
  let raf = 0, visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) loop(); });
  io.observe(box);
  function loop() {
    if (!visible || document.hidden) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    mixer.update(dt); uTime.value += dt;
    if (beltV.lengthSq()) { grid.position.addScaledVector(beltV, dt); grid.position.x %= 0.25; grid.position.z %= 0.25; } // cases de 25 cm
    if (mistakeMode) for (const { bone, off } of mistakeBones) {
      if (off.x) bone.rotation.x += off.x; if (off.y) bone.rotation.y += off.y; if (off.z) bone.rotation.z += off.z;
    }
    controls.update();
    lights.rotation.y = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
    renderer.render(scene, camera);
  }
  const onVis = () => { if (!document.hidden && !raf) { clock.getDelta(); loop(); } };
  document.addEventListener('visibilitychange', onVis);
  loop();

  // Changer de tenue sans recharger le modèle : recolore juste les matériaux déjà en place.
  const setOutfit = (next) => { for (const k in byKind) if (next?.[k]) byKind[k].forEach((m) => m.color.set(next[k])); };

  // Nettoyage à la fermeture de la fiche : GPU, écouteurs, boucle.
  const dispose = () => {
    cancelAnimationFrame(raf); raf = 0; visible = false;
    io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis);
    controls.dispose(); mixer.stopAllAction();
    obj.traverse((o) => { o.geometry?.dispose?.(); [].concat(o.material || []).forEach((m) => m.dispose?.()); });
    grid.geometry.dispose(); grid.material.dispose(); floor.geometry.dispose(); floor.material.alphaMap.dispose(); floor.material.dispose(); catcher.geometry.dispose(); catcher.material.dispose();
    shadow.geometry.dispose(); shadow.material.map.dispose(); shadow.material.dispose();
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); // rend le contexte WebGL tout de suite (Safari en limite le nombre)
  };
  // Outils de développement (tools/look.html, vignettes) : figer le clip à une fraction, orienter la caméra.
  const dev = {
    seek(f) { if (!act) return; act.paused = true; act.time = anim.duration * f; mixer.update(0); },
    azimuth(deg) { controls.autoRotate = false; const r = camera.position.clone().sub(controls.target), a = THREE.MathUtils.degToRad(deg);
      const h = Math.hypot(r.x, r.z); camera.position.set(controls.target.x + h * Math.sin(a), camera.position.y, controls.target.z + h * Math.cos(a)); controls.update(); },
  };
  return { dispose, setOutfit, setMode, dev };
}

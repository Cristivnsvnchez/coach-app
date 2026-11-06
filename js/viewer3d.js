// Visionneuse 3D 360° des exercices : modèle humain animé (glb exporté de Blender depuis Mixamo), à tourner au doigt.
// three.js n'est chargé qu'à l'ouverture d'une fiche (vendor/three, ~700 Ko, mis en cache hors ligne par le service worker).
// En cas d'échec (pas de WebGL, fichier absent), le contenu de repli déjà présent dans le conteneur reste affiché.

const cache = new Map(); // url → Promise<gltf> : un seul téléchargement par session

const noop3D = { dispose() {}, setOutfit() {}, setMode() {} };

// `showcase` : vitrine (carte « Mouvement du jour ») — fond transparent sur un décor HTML, sans grille ni ombre,
// sans interaction (la carte reste cliquable), cadrage un peu plus serré.
export async function mount3D(box, { url, anim: animUrl, clip, muscles = {}, mistake, pose }, outfit = null, { showcase = false } = {}) {
  let THREE, GLTFLoader, OrbitControls, fix, buildPoseClip;
  try {
    THREE = await import('../vendor/three/three.module.min.js');
    ({ GLTFLoader } = await import('../vendor/three/GLTFLoader.js'));
    ({ OrbitControls } = await import('../vendor/three/OrbitControls.js'));
    ({ buildPoseClip } = await import('./poses.js'));
    fix = await import('./motion-fix.js'); // corrections partagées avec le banc d'essai (tests/motion.test.mjs)
  } catch { return noop3D; }

  const canvas = document.createElement('canvas');
  canvas.className = 'v3d-canvas';
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch { return noop3D; } // pas de WebGL : on garde le repli
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x12151c, showcase ? 0 : 1); // décor de studio sombre, comme les fiches de référence (transparent en vitrine)

  const scene = new THREE.Scene();
  if (!showcase) scene.fog = new THREE.Fog(0x12151c, 3.2, 7.5); // la grille se fond dans le noir
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  const grid = new THREE.GridHelper(12, 48, 0x3d7bff, 0x22355e);
  grid.material.transparent = true; grid.material.opacity = 0.55; grid.material.fog = true; if (!showcase) scene.add(grid);
  scene.add(new THREE.HemisphereLight(0xeef2ff, 0x8a8f9c, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2.5, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9db4ff, 1.4); rim.position.set(-3, 2.5, -2.5); scene.add(rim);

  // Ombre de contact douce (disque à dégradé radial), sans calcul d'ombre coûteux.
  const g = document.createElement('canvas'); g.width = g.height = 128;
  const gc = g.getContext('2d'), grad = gc.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(20,30,70,.35)'); grad.addColorStop(1, 'rgba(20,30,70,0)');
  gc.fillStyle = grad; gc.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(g), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

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

  // Matière « mannequin anatomique » : blanc mat + liseré bleu (effet rayons X) + muscles travaillés lumineux.
  // Le masque musculaire vient des poids de peau : chaque sommet sait à quels os il est lié (cuisses, dos, bras…).
  const uTime = { value: 0 };
  const uHighlight = { value: 1 }; // boosté à l'onglet Conseils : la lueur musculaire devient une planche anatomique
  const byKind = {}; // kind ('top'/'shorts'/'shoes') → matériaux à recolorer quand on change de tenue
  obj.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const names = o.skeleton.bones.map((b) => b.name.replace(/^mixamorig:?/, ''));
    // Lueur par os et par face : [avant, arrière] (biceps devant / triceps derrière sur le même os).
    const WF = new Array(64).fill(0), WB = new Array(64).fill(0);
    names.forEach((n, i) => { if (i < 64 && muscles[n]) { WF[i] = muscles[n][0]; WB[i] = muscles[n][1]; } });
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = mats.map((m) => {
      // Peau : blanc mat + lueur. Haut : tissu sombre, la lueur passe à travers (pectoraux, dos). Short et chaussures : sans lueur.
      const kind = /short|pantslong/i.test(m.name) ? 'shorts' : /shoe/i.test(m.name) ? 'shoes' : /top|sleeve/i.test(m.name) ? 'top' : 'skin';
      const sole = /sole/i.test(m.name); // semelle : jamais recolorée par la tenue, reste neutre
      const skin = kind === 'skin', glows = kind === 'skin' || kind === 'top';
      const tint = outfit && outfit[kind] && !sole ? outfit[kind] : m.color;
      const mm = new THREE.MeshStandardMaterial({ color: skin ? 0xeceef2 : tint, roughness: skin ? 0.5 : 0.78, metalness: 0 });
      if (!skin && !sole) (byKind[kind] ||= []).push(mm);
      mm.customProgramCacheKey = () => 'tm-' + kind; // sinon three.js réutilise le 1er shader compilé
      mm.onBeforeCompile = (sh) => {
        sh.uniforms.uWF = { value: WF }; sh.uniforms.uWB = { value: WB }; sh.uniforms.uTime = uTime; sh.uniforms.uHighlight = uHighlight;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWF[64];\nuniform float uWB[64];\nvarying float vMask;')
          .replace('#include <skinning_vertex>', `#include <skinning_vertex>
            float back = smoothstep(0.15, -0.35, objectNormal.z); // les corps regardent vers +Z : dos = -Z (0 devant, 1 derrière)
            vMask = 0.0;
            for (int k = 0; k < 4; k++) { int ib = int(skinIndex[k]); vMask += mix(uWF[ib], uWB[ib], back) * skinWeight[k]; }`);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uHighlight;\nvarying float vMask;')
          .replace('#include <dithering_fragment>', `
            float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.4);
            gl_FragColor.rgb += vec3(0.32, 0.56, 1.0) * fres * ${skin ? '0.85' : '0.4'};
            float m = smoothstep(0.12, 0.75, vMask) * ${glows ? '1.0' : '0.0'};
            float pulse = 0.85 + 0.15 * sin(uTime * 2.6);
            // Lueur : cœur jaune chaud, bords orange plus lumineux (comme un muscle qui « chauffe »).
            vec3 glow = mix(vec3(1.0, 0.88, 0.42), vec3(1.0, 0.38, 0.06), clamp(fres * 1.6, 0.0, 1.0));
            gl_FragColor.rgb = mix(gl_FragColor.rgb, glow * (1.05 + 0.5 * fres), clamp(m * (0.62 + 0.3 * fres) * pulse * uHighlight, 0.0, 1.0));
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
  const anim = pose ? buildPoseClip(THREE, obj, pose, clip) : fix.prepareClip(animGltf?.animations[0] || gltf.animations.find((a) => a.name.toLowerCase() === (clip || '').toLowerCase()) || gltf.animations[0]);
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
    grid.geometry.dispose(); grid.material.dispose();
    shadow.geometry.dispose(); shadow.material.map.dispose(); shadow.material.dispose();
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); // rend le contexte WebGL tout de suite (Safari en limite le nombre)
  };
  return { dispose, setOutfit, setMode };
}

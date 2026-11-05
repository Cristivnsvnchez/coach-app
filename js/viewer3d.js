// Visionneuse 3D 360° des exercices : modèle humain animé (glb exporté de Blender depuis Mixamo), à tourner au doigt.
// three.js n'est chargé qu'à l'ouverture d'une fiche (vendor/three, ~700 Ko, mis en cache hors ligne par le service worker).
// En cas d'échec (pas de WebGL, fichier absent), le contenu de repli déjà présent dans le conteneur reste affiché.

const cache = new Map(); // url → Promise<gltf> : un seul téléchargement par session

const noop3D = { dispose() {}, setOutfit() {} };

export async function mount3D(box, { url, clip, muscles = {} }, outfit = null) {
  let THREE, GLTFLoader, OrbitControls;
  try {
    THREE = await import('../vendor/three/three.module.min.js');
    ({ GLTFLoader } = await import('../vendor/three/GLTFLoader.js'));
    ({ OrbitControls } = await import('../vendor/three/OrbitControls.js'));
  } catch { return noop3D; }

  const canvas = document.createElement('canvas');
  canvas.className = 'v3d-canvas';
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch { return noop3D; } // pas de WebGL : on garde le repli
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x12151c, 1); // décor de studio sombre, comme les fiches de référence

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x12151c, 3.2, 7.5); // la grille se fond dans le noir
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  const grid = new THREE.GridHelper(12, 48, 0x3d7bff, 0x22355e);
  grid.material.transparent = true; grid.material.opacity = 0.55; grid.material.fog = true; scene.add(grid);
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

  let gltf;
  try {
    if (!cache.has(url)) cache.set(url, new GLTFLoader().loadAsync(url));
    gltf = await cache.get(url);
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
  const byKind = {}; // kind ('top'/'shorts'/'shoes') → matériaux à recolorer quand on change de tenue
  obj.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const names = o.skeleton.bones.map((b) => b.name.replace(/^mixamorig:?/, ''));
    // Valeur > 0 : tout le segment ; valeur < 0 : face arrière seulement (ex. fessiers = os Hips, côté dos).
    const W = new Array(64).fill(0);
    names.forEach((n, i) => { if (i < 64 && muscles[n]) W[i] = muscles[n]; });
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = mats.map((m) => {
      // Peau : blanc mat + lueur. Haut : tissu sombre, la lueur passe à travers (pectoraux, dos). Short et chaussures : sans lueur.
      const kind = /short/i.test(m.name) ? 'shorts' : /shoe/i.test(m.name) ? 'shoes' : /top/i.test(m.name) ? 'top' : 'skin';
      const sole = /sole/i.test(m.name); // semelle : jamais recolorée par la tenue, reste neutre
      const skin = kind === 'skin', glows = kind === 'skin' || kind === 'top';
      const tint = outfit && outfit[kind] && !sole ? outfit[kind] : m.color;
      const mm = new THREE.MeshStandardMaterial({ color: skin ? 0xeceef2 : tint, roughness: skin ? 0.5 : 0.78, metalness: 0 });
      if (!skin && !sole) (byKind[kind] ||= []).push(mm);
      mm.customProgramCacheKey = () => 'tm-' + kind; // sinon three.js réutilise le 1er shader compilé
      mm.onBeforeCompile = (sh) => {
        sh.uniforms.uW = { value: W }; sh.uniforms.uTime = uTime;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uW[64];\nvarying float vMask;')
          .replace('#include <skinning_vertex>', `#include <skinning_vertex>
            float back = smoothstep(-0.15, 0.35, objectNormal.z); // le modèle exporté regarde vers -Z : dos = +Z
            vMask = 0.0;
            for (int k = 0; k < 4; k++) { float wv = uW[int(skinIndex[k])]; vMask += (wv < 0.0 ? -wv * back : wv) * skinWeight[k]; }`);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vMask;')
          .replace('#include <dithering_fragment>', `
            float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.4);
            gl_FragColor.rgb += vec3(0.32, 0.56, 1.0) * fres * ${skin ? '0.85' : '0.4'};
            float m = smoothstep(0.12, 0.75, vMask) * ${glows ? '1.0' : '0.0'};
            float pulse = 0.85 + 0.15 * sin(uTime * 2.6);
            // Lueur : cœur jaune chaud, bords orange plus lumineux (comme un muscle qui « chauffe »).
            vec3 glow = mix(vec3(1.0, 0.88, 0.42), vec3(1.0, 0.38, 0.06), clamp(fres * 1.6, 0.0, 1.0));
            gl_FragColor.rgb = mix(gl_FragColor.rgb, glow * (1.05 + 0.5 * fres), m * (0.62 + 0.3 * fres) * pulse);
            #include <dithering_fragment>`);
      };
      return mm;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });

  const mixer = new THREE.AnimationMixer(obj);
  const anim = gltf.animations.find((a) => a.name.toLowerCase().includes((clip || '').toLowerCase())) || gltf.animations[0];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (anim) { const act = mixer.clipAction(anim); act.play(); if (reduce) { act.paused = true; act.time = anim.duration * 0.5; } }

  // Caméra 3/4, orbite au doigt (pas de translation), légère rotation automatique tant qu'on ne touche pas.
  const h = size.y || 1.7;
  camera.position.set(h * 1.05, h * 0.62, h * 1.5);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, h * 0.48, 0);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = h * 0.9; controls.maxDistance = h * 3;
  controls.minPolarAngle = 0.25; controls.maxPolarAngle = Math.PI / 2 - 0.05; // jamais sous le sol
  controls.autoRotate = !reduce; controls.autoRotateSpeed = 1.2;
  controls.addEventListener('start', () => { controls.autoRotate = false; box.classList.add('touched'); });
  controls.update();

  box.prepend(canvas);
  box.classList.add('ready');
  const fit = () => { const w = box.clientWidth, hh = box.clientHeight; renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); };
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
    renderer.dispose(); canvas.remove();
  };
  return { dispose, setOutfit };
}

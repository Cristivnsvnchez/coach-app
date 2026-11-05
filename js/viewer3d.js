// Visionneuse 3D 360° des exercices : modèle humain animé (glb exporté de Blender depuis Mixamo), à tourner au doigt.
// three.js n'est chargé qu'à l'ouverture d'une fiche (vendor/three, ~700 Ko, mis en cache hors ligne par le service worker).
// En cas d'échec (pas de WebGL, fichier absent), le contenu de repli déjà présent dans le conteneur reste affiché.

const cache = new Map(); // url → Promise<gltf> : un seul téléchargement par session

export async function mount3D(box, { url, clip }) {
  let THREE, GLTFLoader, OrbitControls;
  try {
    THREE = await import('../vendor/three/three.module.min.js');
    ({ GLTFLoader } = await import('../vendor/three/GLTFLoader.js'));
    ({ OrbitControls } = await import('../vendor/three/OrbitControls.js'));
  } catch { return () => {}; }

  const canvas = document.createElement('canvas');
  canvas.className = 'v3d-canvas';
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch { return () => {}; } // pas de WebGL : on garde le repli
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
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
  } catch { cache.delete(url); renderer.dispose(); return () => {}; }

  const model = gltf.scene; // le cache garde l'original : on travaille sur une copie liée au squelette
  const { clone } = await import('../vendor/three/SkeletonUtils.js');
  const obj = clone(model);
  scene.add(obj);
  const bb = new THREE.Box3().setFromObject(obj), size = bb.getSize(new THREE.Vector3()), center = bb.getCenter(new THREE.Vector3());
  obj.position.sub(new THREE.Vector3(center.x, bb.min.y, center.z)); // pieds au sol, centré

  const mixer = new THREE.AnimationMixer(obj);
  const anim = gltf.animations.find((a) => a.name.toLowerCase().includes((clip || '').toLowerCase())) || gltf.animations[0];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (anim) { const act = mixer.clipAction(anim); act.play(); if (reduce) { act.paused = true; act.time = anim.duration * 0.5; } }

  // Caméra 3/4, orbite au doigt (pas de translation), légère rotation automatique tant qu'on ne touche pas.
  const h = size.y || 1.7;
  camera.position.set(h * 1.35, h * 0.75, h * 1.9);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, h * 0.48, 0);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = h * 1.2; controls.maxDistance = h * 3.4;
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
    mixer.update(Math.min(clock.getDelta(), 0.05));
    controls.update();
    renderer.render(scene, camera);
  }
  const onVis = () => { if (!document.hidden && !raf) { clock.getDelta(); loop(); } };
  document.addEventListener('visibilitychange', onVis);
  loop();

  // Nettoyage à la fermeture de la fiche : GPU, écouteurs, boucle.
  return () => {
    cancelAnimationFrame(raf); raf = 0; visible = false;
    io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis);
    controls.dispose(); mixer.stopAllAction();
    obj.traverse((o) => { o.geometry?.dispose?.(); });
    shadow.geometry.dispose(); shadow.material.map.dispose(); shadow.material.dispose();
    renderer.dispose(); canvas.remove();
  };
}

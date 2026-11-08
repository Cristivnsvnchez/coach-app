// Onglet Erreurs : la faute la plus fréquente de chaque exercice, montrée comme un VRAI mouvement (pas des os tordus
// par-dessus l'animation). Mouvements par poses (js/poses.js) : la faute modifie les poses clés (genou dirigé vers
// l'intérieur, bassin qui ne suit pas le buste, coudes ouverts…) et le moteur la résout comme un geste normal.
// Clips Mixamo : le décalage est cuit dans le clip puis ramené dans les amplitudes réelles (js/joint-limits.js).
// Le banc d'essai (tools/motion-audit.mjs, `fault: true`) vérifie que la version fautive reste humainement possible.
//
// Chaque faute dit aussi quoi montrer : `track` = l'os dont on trace le trajet (flèche verte sur le bon geste, rouge
// sur la faute), `guide` = la ligne de repère (os reliés), comme les vidéos de technique.

export const FAULTS = {
  kneeCave: { track: 'RightLeg', guide: ['RightUpLeg', 'RightLeg', 'RightFoot'] }, // genoux qui rentrent
  backRound: { track: 'Neck', guide: ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck'] }, // dos qui s'arrondit
  elbowFlare: { track: 'RightForeArm', guide: ['RightArm', 'RightForeArm', 'RightHand'] }, // coudes trop ouverts
  elbowDrift: { track: 'RightForeArm', guide: ['RightArm', 'RightForeArm', 'RightHand'] }, // coudes qui avancent
  hipsDrop: { track: 'Hips', guide: ['Neck', 'Spine1', 'Hips', 'RightLeg', 'RightFoot'] }, // bassin qui tombe
  overArch: { track: 'Neck', guide: ['RightLeg', 'Hips', 'Spine1', 'Spine2', 'Neck'] }, // dos cambré, côtes qui s'ouvrent
  swing: { track: 'Neck', guide: ['Hips', 'Spine1', 'Spine2', 'Neck'] }, // élan du buste vers l'arrière (curl, tirages)
  leanBack: { track: 'Neck', guide: ['RightLeg', 'Hips', 'Spine1', 'Spine2', 'Neck'] }, // dos cambré debout (développés au-dessus de la tête)
  twist: { track: 'RightArm', guide: ['LeftArm', 'Spine2', 'RightArm'] }, // buste qui tourne (rowing un bras)
  hipsUp: { track: 'Hips', guide: ['Neck', 'Spine1', 'Hips', 'RightLeg'] }, // bassin qui décolle
  kneeBend: { track: 'RightLeg', guide: ['RightUpLeg', 'RightLeg', 'RightFoot'] }, // genoux qui plient (rebond)
  neckPull: { track: 'Head', guide: ['Spine1', 'Spine2', 'Neck', 'Head'] }, // tirer sur la nuque (crunch, sit-up)
};

// Faute par exercice : règle par catégorie + muscle principal, quelques exceptions nommées.
const BY_NAME = { 'Hip thrust': 'overArch', 'Relevés de jambes': 'overArch', Pompes: 'hipsDrop', Planche: 'hipsDrop', 'Pompes sautées': 'hipsDrop', Burpee: 'hipsDrop',
  Dips: 'elbowFlare', 'Dips assistés': 'elbowFlare', 'Barre au front': 'elbowFlare', 'Fentes bulgares': 'kneeCave', 'Fentes marchées': 'kneeCave',
  'Développé militaire': 'leanBack', 'Développé épaules haltères': 'leanBack', 'Élévations latérales': 'swing', 'Élévations frontales': 'swing', 'Face pull': 'swing',
  Tractions: 'swing', 'Tractions assistées': 'swing', 'Tractions / tirage vertical': 'swing', 'Tirage vertical': 'swing', 'Tirage horizontal': 'swing',
  'Rowing haltère': 'twist', 'Écarté poulie': 'swing', 'Leg extension': 'hipsUp', 'Mollets assis': 'swing', 'Leg curl': 'hipsUp', 'Mollets debout': 'kneeBend', 'Échauffement': 'swing',
  'Sit-up': 'neckPull', 'Gainage / crunch': 'neckPull', 'Crunch vélo': 'neckPull', 'Crunch circulaire': 'neckPull' };
export function faultOf(e) {
  if (!e) return null;
  if (BY_NAME[e.name]) return BY_NAME[e.name];
  if (e.category === 'jambes') return /Dos|Ischios|Fessiers/.test(e.muscle) ? 'backRound' : 'kneeCave';
  if (e.category === 'abdos') return 'hipsDrop';
  if (e.category === 'haut') {
    if (e.muscle === 'Pectoraux') return 'elbowFlare';
    if (e.muscle === 'Biceps' || e.muscle === 'Triceps') return 'swing';
    return 'backRound';
  }
  return 'backRound';
}

const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
// Tourne une direction [côté, haut, avant] dans le plan sagittal (degrés, > 0 : vers l'arrière/le haut).
const pitchBack = (v, deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return norm([v[0], v[1] * c + v[2] * s, -v[1] * s + v[2] * c]); };
const pitchOf = (t) => (Math.atan2(t[2], t[1]) * 180) / Math.PI;

// Applique `fn` à la partie commune d'une pose clé et à ses côtés L/R.
const eachSide = (k, fn) => { const o = { ...k }; fn(o); for (const S of ['L', 'R']) if (k[S]) { o[S] = { ...k[S] }; fn(o[S], true); } return o; };

const POSE_FAULT = {
  // Genoux vers l'intérieur (debout ou en fente, pas assis) : la charnière du genou vise un peu l'intérieur.
  kneeCave: (k) => { if ((k.hips?.[1] ?? 1) < 0.3) { // couché (presse) : seuls les genoux rentrent
      return k.kneeHint ? { ...k, kneeHint: norm([k.kneeHint[0] - 0.45, k.kneeHint[1], k.kneeHint[2]]) } : k; } // pieds moins ouverts, genoux vers l'intérieur, un peu moins profond
    const o = eachSide(k, (x) => { if (x.foot && !x.foot.free) { x.foot = { ...x.foot, yaw: Math.min(x.foot.yaw ?? 8, 6) }; x.kneeHint = [-0.1, 0.05, 1]; } });
    if (o.hips && o.hips[1] < 0.7 && !k.L?.foot?.free && !k.R?.foot?.free) o.hips = [o.hips[0], o.hips[1] + 0.015, o.hips[2]]; // pas en fente arrière surélevée
    return o; },
  // Dos rond (buste penché, pas allongé) : le bassin reste plus droit que le buste → la colonne s'enroule ; tête basse.
  backRound: (k) => { if (!k.torso) return k; const p = pitchOf(k.torso); if (p < 15 || p > 75) return k;
    // Bassin un peu plus bas sur les poses très penchées : dos rond, les mains descendent quand même jusqu'à la barre au sol.
    return { ...k, pelvis: pitchBack(k.torso, Math.min(30, p * 0.55)), neck: (k.neck ?? 0) + 12, hips: k.hips && p > 40 ? [k.hips[0], k.hips[1] - 0.022, k.hips[2]] : k.hips }; },
  // Coudes trop ouverts : la pointe du coude part vers l'extérieur.
  elbowFlare: (k) => eachSide(k, (o) => { if (o.hand || o.chest) { const h = o.elbowHint || [0.25, -0.1, -1]; o.elbowHint = norm([h[0] + 0.45, h[1], h[2] * 0.7]); } }),
  // Coudes qui avancent : le bras quitte le flanc, la pointe du coude reste vers le bas.
  elbowDrift: (k) => eachSide(k, (o) => { if (o.arm) { o.arm = norm([o.arm[0], o.arm[1], (o.arm[2] || 0) + 0.3]); o.elbowHint = [0.25, -0.6, -0.6]; } else if (o.hand) o.elbowHint = [0.1, -0.5, 0.8]; }),
  // Élan : le buste part en arrière (pose clé de fin du mouvement), le bassin avance.
  swing: (k, i) => (i === 0 || Math.abs(pitchOf(k.torso || [0, 1, 0])) > 60 ? k : { ...k, torso: pitchBack(k.torso || [0, 1, 0], 14), hips: k.hips ? [k.hips[0], k.hips[1], k.hips[2] + 0.04] : k.hips }),
  neckPull: (k) => ({ ...k, neck: (k.neck ?? 0) + 30 }),
  // Dos cambré debout : le buste part en arrière, le bassin reste en place (la courbure se fait dans le bas du dos).
  leanBack: (k) => ({ ...k, torso: pitchBack(k.torso || [0, 1, 0], 15), pelvis: k.pelvis || k.torso || [0, 1, 0] }),
  // Le buste tourne vers le côté qui tire (pose clé de fin).
  twist: (k, i) => (i === 0 ? k : { ...k, twist: (k.twist || 0) - 25 }),
  // Le bassin décolle (pose clé de fin).
  hipsUp: (k, i) => (i === 0 || !k.hips ? k : { ...k, hips: [k.hips[0], k.hips[1] + 0.07, k.hips[2]] }),
  // Genoux qui plient en haut du mouvement (rebond au lieu de monter sur la pointe des pieds).
  kneeBend: (k, i) => (i === 0 || !k.hips ? k : { ...k, hips: [k.hips[0], k.hips[1] - 0.07, k.hips[2] - 0.02] }),
  // Bassin qui tombe (gainage, pompes) : hanches plus basses.
  hipsDrop: (k) => (k.hips && k.hips[1] < 0.6 ? { ...k, hips: [k.hips[0], k.hips[1] - 0.06, k.hips[2]] } : k),
  // Dos cambré (bassin basculé vers l'avant, les épaules ne bougent pas) : seulement buste presque horizontal.
  overArch: (k) => { if (!k.torso || Math.abs(pitchOf(k.torso)) < 60) return k; return { ...k, pelvis: pitchBack(k.pelvis || k.torso, -20), neck: (k.neck ?? 0) - 15 }; },
};

// Mouvement par poses → même mouvement avec la faute (définition de poses, résolue par buildPoseClip).
export function faultyPose(def, kind) {
  const f = POSE_FAULT[kind]; if (!def || !f) return def;
  return { ...def, keys: def.keys.map((k, i) => f(k, i)), F: undefined }; // `def` a déjà ses réglages par corps (model3D)
}

// Clip Mixamo → même clip avec la faute cuite (rotations ajoutées aux os, en radians, repère local).
const CLIP_FAULT = {
  kneeCave: { LeftUpLeg: { z: 0.12 }, RightUpLeg: { z: -0.12 } }, // la cuisse rentre : le genou part vers l'intérieur
  swing: { Spine: { x: -0.12 }, Spine1: { x: -0.1 } },
  neckPull: { Neck: { x: 0.35 }, Head: { x: 0.2 } },
  kneeBend: { LeftUpLeg: { x: -0.2 }, RightUpLeg: { x: -0.2 }, LeftLeg: { x: 0.35 }, RightLeg: { x: 0.35 } },
  leanBack: { Spine1: { x: -0.12 }, Spine2: { x: -0.1 } },
  backRound: { Spine1: { x: 0.16 }, Spine2: { x: 0.12 } },
  elbowFlare: { LeftArm: { z: 0.25 }, RightArm: { z: -0.25 } },
  elbowDrift: { LeftArm: { x: -0.22 }, RightArm: { x: -0.22 } },
  hipsDrop: { Spine: { x: 0.2 }, Hips: { x: 0.12 } },
  overArch: { Spine1: { x: -0.18 }, Spine2: { x: -0.14 } },
};
export function faultyClip(THREE, clip, kind) {
  const off = CLIP_FAULT[kind]; if (!clip || !off) return clip;
  const c = clip.clone(), q = new THREE.Quaternion(), d = new THREE.Quaternion();
  for (const tr of c.tracks) {
    // Nom de l'os (chiffres compris : Spine1, Spine2).
    const m = /([A-Za-z0-9_]+)\.quaternion$/.exec(tr.name.replace(/^mixamorig:?/, '')); const o = m && off[m[1]]; if (!o) continue;
    d.setFromEuler(new THREE.Euler(o.x || 0, o.y || 0, o.z || 0));
    const v = Float32Array.from(tr.values);
    for (let i = 0; i < v.length; i += 4) { q.fromArray(v, i).multiply(d).toArray(v, i); }
    tr.values = v;
  }
  c.userData = {}; // les corrections (joint-limits) seront refaites sur cette copie
  return c;
}

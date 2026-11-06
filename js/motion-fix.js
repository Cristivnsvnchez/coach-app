// Corrections des clips Mixamo avant affichage (pures, partagées par la visionneuse, le banc d'essai
// tools/motion-audit.mjs et le rendu des vignettes) : une animation doit rester sur place et boucler sans saut.

// Valeur d'une piste à l'image i (tableau de `size` nombres).
const at = (tr, i) => Array.from(tr.values.subarray(i * tr.getValueSize(), (i + 1) * tr.getValueSize()));

// 1. Dérive : le bassin finit ailleurs qu'au départ (sprint qui avance, répétition qui recule) → on retire la
// translation nette, répartie linéairement sur le clip. Le rebond et le balancement restent.
function removeDrift(clip) {
  const tr = clip.tracks.find((t) => /Hips\.position$/.test(t.name));
  if (!tr || tr.times.length < 2) return;
  const n = tr.times.length, s = tr.getValueSize(), a = at(tr, 0), b = at(tr, n - 1), T = tr.times[n - 1] - tr.times[0];
  const d = a.map((x, k) => b[k] - x);
  // Axe vertical du squelette = plus grande composante à la 1re image (les clips « sur place » partent centrés :
  // seule la hauteur du bassin est grande). On ne retire que la dérive horizontale, sinon une répétition qui
  // finit debout s'enfoncerait ou décollerait.
  const abs = a.map(Math.abs); d[abs.indexOf(Math.max(...abs))] = 0;
  if (Math.hypot(...d) < 1e-6) return;
  for (let i = 0; i < n; i++) {
    const w = (tr.times[i] - tr.times[0]) / T;
    for (let k = 0; k < s; k++) tr.values[i * s + k] -= d[k] * w;
  }
}

// 2. Raccord de boucle : si la dernière pose diffère de la première (une seule répétition, qui ne revient pas au
// départ), on ajoute un retour vers la pose de départ (positions en ligne droite, rotations en slerp).
const quatAngle = (p, q) => 2 * Math.acos(Math.min(1, Math.abs(p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3])));
function slerp(p, q, t) {
  let dot = p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3];
  const qq = dot < 0 ? q.map((x) => -x) : q; dot = Math.abs(dot);
  if (dot > 0.9995) { const r = p.map((x, k) => x + (qq[k] - x) * t); const l = Math.hypot(...r); return r.map((x) => x / l); }
  const th = Math.acos(dot), s = Math.sin(th), a = Math.sin((1 - t) * th) / s, b = Math.sin(t * th) / s;
  return p.map((x, k) => a * x + b * qq[k]);
}
export function loopGap(clip) {
  let rot = 0, pos = 0;
  for (const tr of clip.tracks) {
    const n = tr.times.length; if (n < 2) continue;
    if (/quaternion$/.test(tr.name)) rot = Math.max(rot, quatAngle(at(tr, 0), at(tr, n - 1)));
    else if (/position$/.test(tr.name)) pos = Math.max(pos, Math.hypot(...at(tr, 0).map((x, k) => x - at(tr, n - 1)[k])));
  }
  return { rot, pos };
}
// Retour calme ajouté APRÈS la répétition (elle reste intacte) : on prolonge chaque piste de `extra` secondes,
// de la dernière pose vers la première, en douceur — comme on repose la barre avant la répétition suivante.
function closeLoop(clip, extra) {
  const T = clip.duration, steps = Math.max(4, Math.round(extra * 30));
  for (const tr of clip.tracks) {
    const n = tr.times.length; if (n < 1) continue;
    const s = tr.getValueSize(), first = at(tr, 0), last = at(tr, n - 1), quat = /quaternion$/.test(tr.name);
    const times = new Float32Array(n + steps), values = new Float32Array((n + steps) * s);
    times.set(tr.times); values.set(tr.values);
    if (tr.times[n - 1] < T) { /* piste plus courte que le clip : elle tient sa dernière valeur jusqu'à T */ }
    for (let j = 1; j <= steps; j++) {
      const u = j / steps, w = u * u * (3 - 2 * u);
      const out = quat ? slerp(last, first, w) : last.map((x, k) => x + (first[k] - x) * w);
      times[n + j - 1] = T + extra * u;
      values.set(out, (n + j - 1) * s);
    }
    tr.times = times; tr.values = values;
  }
  clip.duration = T + extra;
}

// Seuils : en dessous, le clip boucle déjà proprement et on n'y touche pas.
const GAP_ROT = 0.12; // rad (~7°)
const GAP_POS = 3;    // unités du squelette Mixamo (cm avant la mise à l'échelle)

// 3. Retargetage : les clips ont été figés (COPY_ROTATION + bake, docs/HANDOFF.md §13) sur l'ancien corps
// (Bryce/Sophie, même repos que Mixamo Y Bot/X Bot). Le corps actuel a un repos un peu différent par os (pieds,
// mains, bras, épaules) : rejoué tel quel, chaque articulation garde un décalage constant (cheville ~11°, d'où un
// pied qui semble tordu). Le maillage bouge de `Q(t)·Qrepos⁻¹` par os (rotations monde) : pour qu'il refasse le
// mouvement d'origine, on veut Qnouv(t) = Qanc(t)·B avec B = Qrepos_anc⁻¹·Qrepos_nouv (monde), soit en local
// L = B(parent)⁻¹ · L_anc · B(os). Tables mesurées sur les glb exportés (os absent = écart < 0,05°), [w, x, y, z].
const RETARGET = {
  M: {
    LeftToe_End: [0.99756,-0.0123,-0.03323,-0.06012], LeftToeBase: [0.99756,-0.0123,-0.03323,-0.06012], LeftFoot: [0.99493,0.08897,0.01893,-0.0429],
    LeftLeg: [0.99925,0.02256,0.00115,-0.03137], LeftUpLeg: [0.99892,0.01287,-0.00069,-0.04458], RightToe_End: [0.99757,-0.01223,0.0335,0.05986],
    RightToeBase: [0.99757,-0.01223,0.0335,0.05986], RightFoot: [0.99481,0.0902,-0.0192,0.04309], RightLeg: [0.99928,0.02152,-0.00086,0.03136],
    RightUpLeg: [0.99885,0.01744,0.00093,0.04456], LeftHandIndex4: [0.98406,-0.14432,-0.05231,-0.08982], LeftHandIndex3: [0.98384,-0.14467,-0.05625,-0.08926],
    LeftHandIndex2: [0.98752,-0.11695,-0.05371,-0.09081], LeftHandIndex1: [0.99306,-0.05195,-0.04765,-0.09413], LeftHandMiddle4: [0.99051,-0.12132,-0.04797,-0.04325],
    LeftHandMiddle3: [0.99031,-0.12154,-0.05242,-0.04205], LeftHandMiddle2: [0.98818,-0.13782,-0.05311,-0.04118], LeftHandMiddle1: [0.99654,-0.04888,-0.04921,-0.04577],
    LeftHandPinky4: [0.98431,-0.16821,-0.04876,-0.02175], LeftHandPinky3: [0.98411,-0.16832,-0.05269,-0.02049], LeftHandPinky2: [0.98484,-0.16396,-0.05264,-0.02095],
    LeftHandPinky1: [0.99541,-0.07727,-0.05058,-0.02511], LeftHandRing4: [0.9984,-0.03597,-0.04342,0.0043], LeftHandRing3: [0.99805,-0.03591,-0.05083,0.0038],
    LeftHandRing2: [0.98975,-0.13337,-0.05021,0.00875], LeftHandRing1: [0.9906,-0.12691,-0.05027,0.00843], LeftHandThumb4: [0.99866,-0.01602,-0.04433,0.02145],
    LeftHandThumb3: [0.98392,-0.0191,-0.17068,-0.04914], LeftHandThumb2: [0.98327,-0.04045,-0.17171,-0.04543], LeftHandThumb1: [0.98406,0.00891,-0.16921,-0.05398],
    LeftHand: [0.99739,-0.04014,-0.04933,-0.03412], LeftForeArm: [0.99832,0.01554,0.04913,-0.02656], LeftArm: [0.99818,-0.02646,0.04663,0.02773],
    LeftShoulder: [0.98701,-0.12607,0.03866,-0.09176], RightHandIndex4: [0.98954,-0.09967,0.04458,0.09429], RightHandIndex3: [0.98935,-0.10029,0.05109,0.09225],
    RightHandIndex2: [0.98674,-0.12335,0.05323,0.09103], RightHandIndex1: [0.99279,-0.05704,0.04701,0.09439], RightHandMiddle4: [0.99473,-0.08531,0.04278,0.03749],
    RightHandMiddle3: [0.99436,-0.08544,0.04959,0.03862], RightHandMiddle2: [0.98838,-0.13837,0.05158,0.03592], RightHandMiddle1: [0.9965,-0.05517,0.04839,0.04011],
    RightHandPinky4: [0.98297,-0.17786,0.04296,0.01709], RightHandPinky3: [0.98262,-0.17802,0.05092,0.0134], RightHandPinky2: [0.98425,-0.16875,0.05079,0.01389],
    RightHandPinky1: [0.99558,-0.07773,0.0493,0.01848], RightHandRing4: [0.9991,0.00034,0.04211,-0.00456], RightHandRing3: [0.99875,0.00045,0.04972,-0.00425],
    RightHandRing2: [0.98816,-0.14511,0.04857,-0.01146], RightHandRing1: [0.99091,-0.12496,0.04879,-0.01047], RightHandThumb4: [0.99867,0.01803,0.04222,-0.02332],
    RightHandThumb3: [0.98438,0.01464,0.16764,0.05184], RightHandThumb2: [0.98346,-0.04482,0.17046,0.04163], RightHandThumb1: [0.98441,0.01184,0.16779,0.05137],
    RightHand: [0.99754,-0.0387,0.04803,0.03336], RightForeArm: [0.99842,0.01571,-0.04729,0.02578], RightArm: [0.9982,-0.02632,-0.0448,-0.02986],
    RightShoulder: [0.98659,-0.12615,-0.03795,0.09636], Spine2: [0.99892,0.04639,0,0.00004], Spine1: [0.99994,-0.01134,-0.00001,0.00004],
    Spine: [0.99993,-0.01154,-0.00001,0.00005],
  },
  F: {
    LeftToe_End: [0.99912,-0.02382,-0.0307,-0.0161], LeftToeBase: [0.99941,-0.02363,-0.01883,-0.01638], LeftFoot: [0.99927,-0.00519,-0.02862,-0.0248],
    LeftLeg: [0.99929,0.00199,-0.00053,-0.03765], LeftUpLeg: [0.99724,0.04616,-0.00269,-0.05808], RightToe_End: [0.99912,-0.02409,0.03026,0.01626],
    RightToeBase: [0.9994,-0.0239,0.01866,0.01654], RightFoot: [0.99927,-0.00496,0.0286,0.02481], RightLeg: [0.99929,-0.00052,0.00078,0.03766],
    RightUpLeg: [0.99715,0.04817,0.00281,0.05806], LeftHandIndex4: [0.9806,-0.17729,0.0702,-0.04541], LeftHandIndex3: [0.98058,-0.17727,0.07057,-0.04547],
    LeftHandIndex2: [0.98306,-0.16295,0.07124,-0.04437], LeftHandIndex1: [0.98572,-0.14596,0.07198,-0.04323], LeftHandMiddle4: [0.99152,-0.10915,0.07052,-0.00266],
    LeftHandMiddle3: [0.99144,-0.10915,0.07154,-0.0028], LeftHandMiddle2: [0.98996,-0.12189,0.07149,-0.00374], LeftHandMiddle1: [0.99122,-0.11116,0.07153,-0.00299],
    LeftHandPinky4: [0.98415,-0.13383,0.0667,0.09533], LeftHandPinky3: [0.98407,-0.13388,0.06751,0.09551], LeftHandPinky2: [0.98952,-0.0846,0.06267,0.09883],
    LeftHandPinky1: [0.99001,-0.07832,0.06206,0.09943], LeftHandRing4: [0.98981,-0.11826,0.06984,0.03749], LeftHandRing3: [0.98985,-0.11824,0.06935,0.03754],
    LeftHandRing2: [0.98981,-0.11856,0.06936,0.03751], LeftHandRing1: [0.99346,-0.08257,0.06796,0.04001], LeftHandThumb4: [0.9952,-0.0402,0.07658,-0.04584],
    LeftHandThumb3: [0.99408,-0.0538,-0.0476,-0.08158], LeftHandThumb2: [0.99536,-0.03536,-0.04682,-0.07625], LeftHandThumb1: [0.99652,-0.00707,-0.04589,-0.06919],
    LeftHand: [0.99365,-0.08522,0.06948,0.02381], LeftForeArm: [0.9976,0.01227,0.06233,-0.02753], LeftArm: [0.99686,-0.05051,0.05814,0.0183],
    LeftShoulder: [0.98538,-0.13428,0.04663,-0.09396], HeadTop_End: [0.99815,-0.06086,0,0], Head: [0.99815,-0.06086,0,0],
    Neck: [0.99815,-0.06086,0,0], RightHandIndex4: [0.98849,-0.11669,-0.08298,0.04888], RightHandIndex3: [0.98841,-0.11663,-0.08398,0.04891],
    RightHandIndex2: [0.98051,-0.17071,-0.08116,0.05353], RightHandIndex1: [0.98356,-0.15225,-0.08219,0.05174], RightHandMiddle4: [0.98992,-0.11632,-0.08076,0.00164],
    RightHandMiddle3: [0.98985,-0.1163,-0.0817,0.00158], RightHandMiddle2: [0.98896,-0.12364,-0.08164,0.00251], RightHandMiddle1: [0.98911,-0.12237,-0.08175,0.00157],
    RightHandPinky4: [0.98127,-0.14312,-0.07562,-0.10446], RightHandPinky3: [0.98115,-0.14329,-0.07716,-0.10419], RightHandPinky2: [0.9886,-0.07735,-0.06997,-0.10863],
    RightHandPinky1: [0.98841,-0.07852,-0.07017,-0.10938], RightHandRing4: [0.97536,-0.20048,-0.08255,-0.04087], RightHandRing3: [0.97538,-0.20055,-0.08253,-0.04006],
    RightHandRing2: [0.99021,-0.10529,-0.07826,-0.04775], RightHandRing1: [0.99514,-0.03626,-0.07474,-0.05285], RightHandThumb4: [0.99463,-0.04476,-0.09035,0.02334],
    RightHandThumb3: [0.99575,-0.05729,0.02931,0.06585], RightHandThumb2: [0.99714,-0.03695,0.0287,0.05942], RightHandThumb1: [0.99828,-0.00764,0.02828,0.05082],
    RightHand: [0.99277,-0.08719,-0.08003,-0.02027], RightForeArm: [0.99757,0.01206,-0.06101,0.03137], RightArm: [0.99687,-0.05021,-0.0562,-0.02384],
    RightShoulder: [0.98524,-0.13434,-0.04636,0.09543], Spine2: [1,-0.00297,0,0], Spine1: [0.99987,-0.01585,0,0],
    Spine: [0.99987,-0.01585,0,0], Hips: [0.99998,0.00646,0,0],
  },
};
const PARENT = {"LeftToe_End":"LeftToeBase","LeftToeBase":"LeftFoot","LeftFoot":"LeftLeg","LeftLeg":"LeftUpLeg","LeftUpLeg":"Hips","RightToe_End":"RightToeBase","RightToeBase":"RightFoot","RightFoot":"RightLeg","RightLeg":"RightUpLeg","RightUpLeg":"Hips","LeftHandIndex4":"LeftHandIndex3","LeftHandIndex3":"LeftHandIndex2","LeftHandIndex2":"LeftHandIndex1","LeftHandIndex1":"LeftHand","LeftHandMiddle4":"LeftHandMiddle3","LeftHandMiddle3":"LeftHandMiddle2","LeftHandMiddle2":"LeftHandMiddle1","LeftHandMiddle1":"LeftHand","LeftHandPinky4":"LeftHandPinky3","LeftHandPinky3":"LeftHandPinky2","LeftHandPinky2":"LeftHandPinky1","LeftHandPinky1":"LeftHand","LeftHandRing4":"LeftHandRing3","LeftHandRing3":"LeftHandRing2","LeftHandRing2":"LeftHandRing1","LeftHandRing1":"LeftHand","LeftHandThumb4":"LeftHandThumb3","LeftHandThumb3":"LeftHandThumb2","LeftHandThumb2":"LeftHandThumb1","LeftHandThumb1":"LeftHand","LeftHand":"LeftForeArm","LeftForeArm":"LeftArm","LeftArm":"LeftShoulder","LeftShoulder":"Spine2","HeadTop_End":"Head","Head":"Neck","Neck":"Spine2","RightHandIndex4":"RightHandIndex3","RightHandIndex3":"RightHandIndex2","RightHandIndex2":"RightHandIndex1","RightHandIndex1":"RightHand","RightHandMiddle4":"RightHandMiddle3","RightHandMiddle3":"RightHandMiddle2","RightHandMiddle2":"RightHandMiddle1","RightHandMiddle1":"RightHand","RightHandPinky4":"RightHandPinky3","RightHandPinky3":"RightHandPinky2","RightHandPinky2":"RightHandPinky1","RightHandPinky1":"RightHand","RightHandRing4":"RightHandRing3","RightHandRing3":"RightHandRing2","RightHandRing2":"RightHandRing1","RightHandRing1":"RightHand","RightHandThumb4":"RightHandThumb3","RightHandThumb3":"RightHandThumb2","RightHandThumb2":"RightHandThumb1","RightHandThumb1":"RightHand","RightHand":"RightForeArm","RightForeArm":"RightArm","RightArm":"RightShoulder","RightShoulder":"Spine2","Spine2":"Spine1","Spine1":"Spine","Spine":"Hips"};
// Produit de Hamilton en [x, y, z, w] (convention three.js/glTF).
const mul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const xyzw = (q) => q ? [q[1], q[2], q[3], q[0]] : [0, 0, 0, 1];
const inv = (q) => [-q[0], -q[1], -q[2], q[3]];
// Seules les jambes sont corrigées : c'est là que le décalage se voit (pied pas à plat, cheville tordue) ; appliquée aux
// bras, la même correction fait passer les coudes en hyperextension (mesuré : 0 → 18 cas). Un os non corrigé garde B = 1.
const CORRECTED = /(UpLeg|Leg|Foot|Toe)/;
function retarget(clip, sex) {
  const all = RETARGET[sex === 'F' ? 'F' : 'M'], T = (n) => (n && CORRECTED.test(n) ? all[n] : undefined);
  for (const tr of clip.tracks) {
    const m = /^mixamorig:?([A-Za-z0-9_]+)\.quaternion$/.exec(tr.name); // three.js retire le « : » des noms de nœuds
    if (!m) continue;
    if (!T(m[1]) && !T(PARENT[m[1]])) continue;
    const B = xyzw(T(m[1])), Pi = inv(xyzw(T(PARENT[m[1]])));
    for (let i = 0; i < tr.times.length; i++) {
      const o = i * 4, r = mul(mul(Pi, [tr.values[o], tr.values[o + 1], tr.values[o + 2], tr.values[o + 3]]), B);
      tr.values[o] = r[0]; tr.values[o + 1] = r[1]; tr.values[o + 2] = r[2]; tr.values[o + 3] = r[3];
    }
  }
  return clip;
}

// Prépare un clip : une copie corrigée par sexe, mise en cache sur le clip d'origine (partagé par les deux corps via
// le cache des glb : le corriger sur place le fausserait pour l'autre corps). `sex` : 'M' ou 'F' (retargetage, §3).
export function prepareClip(clip, sex = 'M') {
  if (!clip) return clip;
  const cache = (clip.userData ||= {}).tmPrepared ||= {};
  if (cache[sex]) return cache[sex];
  const c = clip.clone();
  retarget(c, sex);
  removeDrift(c);
  const g = loopGap(c);
  if (g.rot > GAP_ROT || g.pos > GAP_POS) closeLoop(c, 1.2);
  return (cache[sex] = c);
}

// Box du box jump : d'après les images où plus rien ne touche le sol pendant un moment (point de peau le plus bas
// > 25 cm, au moins 3 images : pas un simple saut), hauteur du dessus de la box et position (milieu des pieds).
// `frames` : [{ skin: y le plus bas de la peau, feet: [Vector3…] }] en coordonnées monde, sol à y = 0.
export function landingBox(frames) {
  const up = frames.filter((f) => f.skin > 0.25);
  if (up.length < 3) return null;
  const ys = up.map((f) => f.skin).sort((a, b) => a - b);
  const top = ys[Math.floor(ys.length / 2)];
  let x = 0, z = 0; for (const f of up) for (const q of f.feet) { x += q.x / (up.length * f.feet.length); z += q.z / (up.length * f.feet.length); }
  return { top, x, z };
}

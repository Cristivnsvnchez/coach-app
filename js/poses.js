// Mouvements 3D décrits par poses clés (exercices absents de Mixamo : soulevé de terre, développé couché, fentes…).
// Une pose donne le bassin, le tronc et les appuis ; le moteur résout genoux et coudes par IK à chaque image, pas
// seulement aux poses clés : un pied posé ne bouge pas et une barre suit une ligne droite. Chaque os reçoit une
// orientation complète, jamais une simple rotation minimale :
// - le pied décide : la direction du pied posé fixe le plan du genou (genou dans l'axe du pied), le tibia ne vrille pas ;
// - genou et coude sont de vraies charnières : cuisse et tibia (bras et avant-bras) partagent le même axe de flexion ;
// - la rotation de l'avant-bras (`palm`) se répartit entre coude et poignet, comme le radius autour du cubitus ;
// - clavicule et colonne participent : le bras levé emmène l'omoplate, le buste penché se répartit bassin + vertèbres.
// Matériel réel quand l'exercice en a (`gear`, voir js/gear3d.js) : banc, barre, haltères ; sinon au sol, rien ne flotte.
//
// Repère du personnage, en mètres pour un corps de 1,75 m : [côté (vers l'extérieur du corps), hauteur, avant], origine
// au sol sous le bassin au repos. Les clés valent pour les deux côtés, en miroir ; `L: {…}` ou `R: {…}` pour un seul côté.
// - hips : position du bassin ; torso : direction du haut du tronc ; pelvis : direction du bassin (sinon déduite) ;
//   twist : rotation du thorax sur le bassin (degrés) ; neck : flexion du cou (degrés, négatif = regard relevé).
// - foot : appui au sol { x, z, heel, lift, yaw } : (x, z) = cheville quand le talon est posé, heel = talon levé en degrés
//   (la pointe reste fixe au sol, les orteils restent à plat), lift = hauteur au-dessus du sol, yaw = pointe ouverte.
//   Pied en l'air : { x, y, z, free: 1, plantar } (la cheville suit le tibia, plantar en degrés) ; avec `toe: 1`, (x, y, z)
//   est la base des orteils, posée (dessus du pied sur un banc) : elle reste fixe et la cheville pivote autour.
// - thigh + shin : directions directes de la cuisse et du tibia ; kneeHint : direction du genou si ce n'est pas celle du pied.
// - hand : cible du poignet ; chest : cible du poignet dans le repère du thorax ; arm + fore : directions directes ;
//   elbowHint : direction de la pointe du coude ; palm : direction de la paume ; wrist : flexion du poignet (négatif = extension) ;
//   grip : 0 main ouverte, 1 main fermée ; gripAt : 1 → `hand` est le centre du poing (barre : écart des mains fixe).
// `beats` : [pose clé à atteindre, secondes, enchaîner sans s'arrêter ?]. Durée = somme. Le clip part de la pose 0 et doit y revenir.
// `F: { i: {…} }` : réglages de la pose clé i propres au corps féminin (appliqués par model3D dans technique.js).

const flat = (x = 0.13, z = 0, yaw = 8, heel = 0) => ({ x, z, yaw, heel, lift: 0 });
const STAND_H = 0.923; // bassin debout, genoux à peine déverrouillés
const STAND = { hips: [0, STAND_H, 0], torso: [0, 1, 0.02], foot: flat(), arm: [0.07, -1, 0.02], fore: [0.03, -1, 0.14], grip: 0.25 };
const pose = (...parts) => Object.assign({}, ...parts);
// Couché sur le dos, jambes fléchies, pieds à plat : le dos et la tête reposent au sol.
const SUPINE = { hips: [0, 0.115, 0], torso: [0, 0, -1], neck: 0, foot: flat(0.17, 0.5, 6), kneeHint: [0.02, 1, 0.25], grip: 0.25 };
// Bras posés au sol le long du corps, paumes au sol.
const armsOnFloor = (z = 0) => ({ hand: [0.36, 0.05, z], elbowHint: [0.3, -1, -0.1], palm: [0, -1, 0], grip: 0.1 });
// À genoux (dessus des pieds au sol, orteils allongés), buste droit : remplace le siège des machines.
const KNEEL = { hips: [0, 0.535, 0], torso: [0, 1, 0.02], thigh: [0.05, -1, 0.03], shin: [0.02, -0.03, -1], plantar: 45 };
// Assis au sol, jambes vers l'avant, genoux à peine fléchis.
const SEATED = { hips: [0, 0.135, 0], torso: [0, 1, -0.05], foot: { x: 0.14, y: 0.095, z: 0.76, free: 1, plantar: -5 }, kneeHint: [0.04, 1, 0.1] };

// Développé au sol : les triceps touchent le sol en bas, l'avant-bras reste vertical, la barre monte à la verticale.
const press = (base, low, high, palm = [0, 0.1, 1], beats = [[1, 1.0], [1, 0.25], [0, 1.6], [0, 0.35]]) => ({ beats, keys: [
  pose(base, { hand: low, elbowHint: [0.72, -0.62, 0.3], palm, grip: 1, wrist: -10 }),
  pose(base, { hand: high, elbowHint: [0.72, -0.62, 0.3], palm, grip: 1, wrist: -10 })] });

// Suspendu : jambes légèrement fléchies, pieds relâchés.
const HANG_LEGS = { thigh: [0.05, -1, 0.14], shin: [0.02, -0.82, -0.56], plantar: 22 };
const pullUp = { beats: [[1, 1.1], [1, 0.3], [0, 1.7], [0, 0.3]], keys: [
  pose(HANG_LEGS, { hips: [0, 1.0, 0], torso: [0, 1, 0.02], neck: -5, hand: [0.36, 1.98, 0.02], elbowHint: [0.9, -0.1, 0.35], palm: [0, 0.05, 1], grip: 1 }),
  pose(HANG_LEGS, { hips: [0, 1.4, -0.07], torso: [0, 0.98, -0.2], neck: -12, hand: [0.36, 1.98, 0.02], elbowHint: [0.9, -0.3, 0.25], palm: [0, 0.05, 1], grip: 1 })] };
const dips = { beats: [[1, 1.6], [1, 0.2], [0, 1.0], [0, 0.3]], keys: [
  pose(HANG_LEGS, { hips: [0, 0.93, -0.01], torso: [0, 1, 0.1], neck: 0, hand: [0.28, 0.88, 0.05], elbowHint: [0.35, -0.25, -1], palm: [-0.95, -0.1, 0.3], grip: 1 }),
  pose(HANG_LEGS, { hips: [0, 0.69, -0.13], torso: [0, 0.93, 0.37], neck: -8, hand: [0.28, 0.88, 0.05], elbowHint: [0.35, 0.05, -1], palm: [-0.95, -0.1, 0.3], grip: 1 })] };

// Charnière de hanche : bras tendus à la verticale, les mains suivent les épaules (une barre reste au-dessus du milieu du pied).
const HANGING = { arm: [0.07, -1, 0], fore: [0.03, -1, 0.015], elbowHint: [0.25, 0, -1], palm: [0, 0.1, -1], grip: 1 };
const HANG_BAR = { gripAt: 1 }; // barre : les poings à écart fixe
const deadlift = { beats: [[1, 0.9, true], [2, 1.0], [2, 0.5], [1, 0.9, true], [0, 1.0], [0, 0.4]], keys: [
  pose(STAND, HANGING, { hips: [0, 0.585, -0.24], torso: [0, 0.57, 0.82], neck: -22, foot: flat(0.13, 0, 6) }),
  pose(STAND, HANGING, { hips: [0, 0.75, -0.2], torso: [0, 0.76, 0.65], neck: -16, foot: flat(0.13, 0, 6) }),
  pose(STAND, HANGING, { hips: [0, 0.922, 0], torso: [0, 1, 0], neck: -2, foot: flat(0.13, 0, 6) })] };
const rdl = { beats: [[1, 1.8], [1, 0.25], [0, 1.2], [0, 0.45]], keys: [
  pose(STAND, HANGING, { hips: [0, 0.915, 0], torso: [0, 1, 0], neck: -2, foot: flat(0.13, 0, 6) }),
  pose(STAND, HANGING, { hips: [0, 0.855, -0.2], torso: [0, 0.42, 0.91], neck: -28, foot: flat(0.13, 0, 6) })] };

// Rowing : dos fixe, seuls les bras bougent (les coudes passent le long du corps).
const ROW = { hips: [0, 0.83, -0.17], torso: [0, 0.54, 0.84], neck: -24, foot: flat(0.14, 0, 8) };
const rowTop = { elbowHint: [0.16, 0.5, -0.85], palm: [0, -0.3, -1], grip: 1, gripAt: 1 };
// Fente : pied avant à plat, pied arrière sur la pointe (talon levé, cheville en flexion plantaire), bassin de face.
const LUNGE_FRONT = { x: 0.13, z: 0.36, yaw: 5, heel: 0, lift: 0 };
const LUNGE_REAR = (heel) => ({ x: 0.12, z: -0.52, yaw: 2, heel, lift: 0 });
const LUNGE_ARMS = { arm: [0.13, -1, 0.04], fore: [0.08, -1, 0.1], grip: 1 };
const bulgarian = { beats: [[1, 1.6], [1, 0.25], [0, 1.1], [0, 0.35]], keys: [
  pose(LUNGE_ARMS, { hips: [0, 0.79, 0.0], torso: [0, 1, 0.1], neck: -4, R: { foot: LUNGE_FRONT }, L: { foot: LUNGE_REAR(50) } }),
  pose(LUNGE_ARMS, { hips: [0, 0.53, 0.09], torso: [0, 1, 0.2], neck: -8, R: { foot: LUNGE_FRONT }, L: { foot: LUNGE_REAR(82) } })] };

// Fente marchée sur place : le pied part devant (passage levé, sinon il rase le sol), le corps avance dessus,
// descend, puis repousse et ramène le pied. Une jambe, puis l'autre. Le pied d'appui ne quitte pas le sol.
const walkLunge = (() => {
  const FRONT = { x: 0.13, z: 0.8, yaw: 6, heel: 0, lift: 0 }, REAR = (heel) => ({ x: 0.13, z: 0, yaw: 6, heel, lift: 0 }), HOME = flat(0.13, 0, 6);
  const side = (a, b) => [
    pose(LUNGE_ARMS, { hips: [0, STAND_H, 0.05], torso: [0, 1, 0.03], neck: 0, [a]: { foot: { ...HOME, heel: 8, lift: 0.1, z: 0.3 } }, [b]: { foot: HOME } }),
    pose(LUNGE_ARMS, { hips: [0, 0.8, 0.4], torso: [0, 1, 0.08], neck: -3, [a]: { foot: FRONT }, [b]: { foot: REAR(40) } }),
    pose(LUNGE_ARMS, { hips: [0, 0.5, 0.53], torso: [0, 1, 0.13], neck: -6, [a]: { foot: FRONT }, [b]: { foot: REAR(80) } })];
  const home = pose(LUNGE_ARMS, { hips: [0, STAND_H, 0], torso: [0, 1, 0.02], neck: 0, foot: HOME });
  const [r1, r2, r3] = side('R', 'L'), [l1, l2, l3] = side('L', 'R');
  return { keys: [home, r1, r2, r3, l1, l2, l3], beats: [[1, 0.35, true], [2, 0.35], [3, 0.8], [3, 0.15], [2, 0.7, true], [1, 0.3, true], [0, 0.35], [0, 0.15],
    [4, 0.35, true], [5, 0.35], [6, 0.8], [6, 0.15], [5, 0.7, true], [4, 0.3, true], [0, 0.35], [0, 0.15]] };
})();

const SEAT_ON_HANDS = { hips: [0, 0.13, 0], torso: [0, 0.9, -0.42], neck: 10, hand: [0.25, 0.05, -0.36], elbowHint: [0.25, 0, -1], palm: [0, -1, 0], wrist: -55, grip: 0 };
const curlKeys = (top, elbowFront = 0.07, extra = {}) => [
  pose(STAND, { neck: 0, arm: [0.1, -1, 0.02], fore: [0.07, -1, 0.13], grip: 1 }, extra),
  pose(STAND, { neck: 0, arm: [0.1, -1, elbowFront], fore: top, grip: 1 }, extra)];
const TEMPO_CURL = [[1, 0.9], [1, 0.2], [0, 1.4], [0, 0.3]];
const incline = pose(SUPINE, { hips: [0, 0.12, -0.02], torso: [0, 0.62, -0.78], neck: 6, foot: flat(0.17, 0.55, 6) });

// ───── Avec le vrai matériel (js/gear3d.js) : banc plat (dessus à 0,44 m), banc incliné à 40°, barre, haltères ─────
// Squat barre sur le dos : pieds largeur d'épaules, pointes ouvertes, genoux dans l'axe des pieds, talons au sol ;
// en bas, cuisses à peine au-dessus de l'horizontale, buste penché d'environ 43° pour garder la barre au-dessus du milieu du pied.
const SQUAT_FOOT = flat(0.165, 0, 22);
// Mains un peu plus larges que les épaules, coudes vers le bas et l'arrière ; cibles réglées pour que la barre tenue
// repose sur les trapèzes en haut comme en bas (contrôlé par tools/motion-audit.mjs, homme et femme).
const BAR_ON_BACK = { elbowHint: [0.45, -1, -0.9], palm: [0, 0.15, 1], grip: 1, wrist: -12 };
const backSquat = { gear: { hold: 'barBack' }, beats: [[1, 1.5], [1, 0.25], [0, 1.15], [0, 0.6]], keys: [
  pose(BAR_ON_BACK, { chest: [0.46, 0.25, -0.08], hips: [0, 0.915, 0], torso: [0, 1, 0.05], neck: 0, foot: SQUAT_FOOT }),
  pose(BAR_ON_BACK, { chest: [0.46, 0.22, -0.05], hips: [0, 0.525, -0.2], torso: [0, 0.73, 0.68], neck: -26, foot: SQUAT_FOOT })] };
// Couché sur le banc plat : dos et tête sur le coussin, pieds à plat au sol de part et d'autre du banc, léger cambré.
const BENCH_LIE = { hips: [0, 0.545, 0], torso: [0, 0.06, -1], neck: 2, foot: flat(0.3, 0.44, 14) };
const ON_FLAT_BENCH = { type: 'flat', at: [0, 0, -0.36] };
// Assis sur le banc incliné (dossier à 40°) : bassin au fond de l'assise, dos sur le dossier, pieds à plat devant.
const BENCH_INCLINE = { hips: [0, 0.56, 0.07], torso: [0, 0.64, -0.77], neck: -6, foot: flat(0.22, 0.58, 12), kneeHint: [0.25, 1, 0.3] };
// Fente bulgare : dessus du pied arrière posé sur le banc, pied avant à plat ; en bas le genou arrière frôle le sol.
const BSS_FRONT = { x: 0.13, z: 0.27, yaw: 6, heel: 0, lift: 0 };
const BSS_REAR = { x: 0.11, y: 0.53, z: -0.73, free: 1, toe: 1, plantar: 46 }; // base des orteils sur le coussin
const BSS_ARMS = { arm: [0.12, -1, 0.02], fore: [0.08, -1, 0.06], elbowHint: [0.3, 0, -1], palm: [-1, 0, 0.1], grip: 1 };
const bulgarianBench = { gear: { hold: 'dumbbells', bench: { type: 'flat', at: [-0.01, 0, -1.12] } }, beats: [[1, 1.6], [1, 0.25], [0, 1.1], [0, 0.4]], keys: [
  pose(BSS_ARMS, { hips: [0, 0.84, 0.0], torso: [0, 1, 0.16], neck: -6, R: { foot: BSS_FRONT }, L: { foot: BSS_REAR, kneeHint: [0, -0.6, 1] } }),
  pose(BSS_ARMS, { hips: [0, 0.535, -0.02], torso: [0, 1, 0.34], neck: -12, R: { foot: BSS_FRONT }, L: { foot: BSS_REAR, kneeHint: [0, -1, 0.15] } })] };
// Rowing haltère : genou et main gauches sur le banc, pied droit au sol, dos à plat ; l'haltère monte vers la hanche.
const ROW_BENCH_L = { foot: { x: 0.11, y: 0.52, z: -0.42, free: 1, plantar: 40 }, kneeHint: [0, -1, 0.2], hand: [0.15, 0.535, 0.5], elbowHint: [0.4, 0, -1], palm: [-0.5, -1, 0], wrist: -55, grip: 0.15 };
const rowBench = (hand, elbowHint, twist = 0) => pose(STAND, { hips: [0, 0.905, -0.02], torso: [0, 0.18, 0.98], neck: -26, twist, grip: 1,
  L: ROW_BENCH_L, R: { foot: flat(0.21, 0.02, 10), hand, elbowHint, palm: [-1, 0, 0.05] } });
const dumbbellRow = { gear: { hold: 'dumbbellR', bench: { type: 'flat', at: [-0.13, 0, 0.02] } }, beats: [[1, 0.8], [1, 0.35], [0, 1.4], [0, 0.25]], keys: [
  rowBench([0.21, 0.48, 0.42], [0.25, 0.2, -1]),
  rowBench([0.22, 0.8, 0.16], [0.12, 1, -0.35], -6)] };

export const POSES = {
  // Au sol, sur le dos : les pieds poussent une plateforme imaginaire ; le bassin reste au sol, seuls hanches et genoux bougent.
  'Presse à cuisses': { beats: [[1, 1.0], [1, 0.15], [0, 1.7], [0, 0.25]], keys: [
    pose(SUPINE, armsOnFloor(), { foot: { x: 0.15, y: 0.56, z: 0.24, free: 1, plantar: -4 }, kneeHint: [0.1, 0.45, -0.9] }),
    pose(SUPINE, armsOnFloor(), { foot: { x: 0.15, y: 0.67, z: 0.52, free: 1, plantar: -4 }, kneeHint: [0.1, 0.45, -0.9] })] },
  Squat: backSquat,
  'Fentes bulgares': bulgarianBench,
  'Fentes marchées': { ...walkLunge, gear: { hold: 'dumbbells' } },
  // Assis au sol, en appui sur les mains : seule la jambe bouge, la cuisse reste fixe.
  'Leg extension': { beats: [[1, 0.9], [1, 0.7], [0, 1.7], [0, 0.2]], keys: [
    pose(SEAT_ON_HANDS, { thigh: [0.1, 0.62, 0.78], shin: [0.03, -0.72, 0.69], plantar: 4 }),
    pose(SEAT_ON_HANDS, { thigh: [0.1, 0.62, 0.78], shin: [0.08, 0.5, 0.86], plantar: -4 })] },
  // Chaque répétition repart de la barre posée. Femme : bras plus courts, bassin un peu plus bas pour atteindre la barre.
  'Soulevé de terre': { ...deadlift, gear: { hold: 'bar', fromFloor: true }, F: { 0: { hips: [0, 0.545, -0.25], torso: [0, 0.52, 0.85] } } },
  'Soulevé de terre roumain': { ...rdl, gear: { hold: 'bar' } },
  // À plat ventre : hanches au sol, le talon vient vers les fesses, front posé sur les mains.
  'Leg curl': { beats: [[1, 1.0], [1, 0.3], [0, 1.6], [0, 0.2]], keys: [
    { hips: [0, 0.115, 0], torso: [0, 0, 1], neck: -18, thigh: [0.05, -0.02, -1], shin: [0.03, -0.02, -1], plantar: 40, kneeHint: [0, -1, 0], hand: [0.2, 0.11, 0.64], elbowHint: [1, -0.1, -0.2], palm: [-0.2, -1, 0], grip: 0.2 },
    { hips: [0, 0.115, 0], torso: [0, 0, 1], neck: -18, thigh: [0.05, -0.02, -1], shin: [0.03, 0.85, -0.52], plantar: 12, kneeHint: [0, -1, 0], hand: [0.2, 0.11, 0.64], elbowHint: [1, -0.1, -0.2], palm: [-0.2, -1, 0], grip: 0.2 }] },
  // Pont au sol : les épaules restent au sol, épaules-hanches-genoux alignés en haut, tibia vertical.
  'Hip thrust': { beats: [[1, 1.0], [1, 0.6], [0, 1.4], [0, 0.2]], keys: [
    pose(SUPINE, armsOnFloor(0), { foot: flat(0.15, 0.3, 6), hips: [0, 0.115, 0], torso: [0, 0, -1] }),
    pose(SUPINE, armsOnFloor(0), { foot: flat(0.15, 0.3, 6), hips: [0, 0.36, -0.07], torso: [0, -0.53, -0.85], pelvis: [0, -0.53, -0.85], neck: 28 })] },
  'Mollets debout': { beats: [[1, 0.8], [1, 0.8], [0, 1.2], [0, 0.2]], keys: [
    pose(STAND, { hips: [0, STAND_H, 0], foot: flat(0.13, 0, 5) }),
    pose(STAND, { hips: [0, 0.98, 0.05], foot: flat(0.13, 0, 5, 36) })] },
  // Assis au sol, pieds à plat, mains sur les genoux : seuls talons et genoux montent.
  'Mollets assis': { beats: [[1, 0.8], [1, 0.8], [0, 1.2], [0, 0.2]], keys: [
    { hips: [0, 0.135, 0], torso: [0, 1, -0.36], neck: 12, foot: flat(0.14, 0.35, 5), kneeHint: [0.05, 1, 0.2], hand: [0.17, 0.5, 0.24], elbowHint: [0.3, -0.2, -1], palm: [0, -1, 0], grip: 0.1 },
    { hips: [0, 0.135, 0], torso: [0, 1, -0.36], neck: 12, foot: flat(0.14, 0.35, 5, 20), kneeHint: [0.05, 1, 0.2], hand: [0.17, 0.55, 0.24], elbowHint: [0.3, -0.2, -1], palm: [0, -1, 0], grip: 0.1 }] },
  // Barre : descend sur le bas des pectoraux, remonte au-dessus des épaules ; avant-bras verticaux, coudes à ~50° du buste.
  'Développé couché': { ...press(pose(BENCH_LIE, { gripAt: 1 }), [0.4, 0.77, -0.31], [0.4, 1.08, -0.43]), gear: { hold: 'bar', bench: ON_FLAT_BENCH } },
  // Haltères : les mains se rapprochent en montant, paumes vers les pieds.
  'Développé couché haltères': { ...press(BENCH_LIE, [0.42, 0.66, -0.3], [0.22, 1.03, -0.42]), gear: { hold: 'dumbbells', bench: ON_FLAT_BENCH } },
  // Sans banc : buste relevé à 40° au-dessus du bassin, à la force des abdos (moins naturel, faute d'appui).
  'Développé incliné haltères': { ...press(BENCH_INCLINE, [0.42, 0.86, -0.13], [0.2, 1.31, -0.26]), gear: { hold: 'dumbbells', bench: { type: 'incline', at: [0, 0, -0.04] } } },
  'Écarté poulie': { beats: [[1, 1.0], [1, 0.4], [0, 1.5], [0, 0.2]], keys: [
    pose(STAND, { hips: [0, 0.91, -0.02], torso: [0, 0.97, 0.22], neck: -10, foot: flat(0.15, 0, 8), arm: [0.96, -0.12, -0.08], fore: [0.92, -0.1, 0.32], elbowHint: [0.2, 0.3, -1], palm: [0, 0, 1], grip: 1 }),
    pose(STAND, { hips: [0, 0.91, -0.02], torso: [0, 0.97, 0.22], neck: -10, foot: flat(0.15, 0, 8), arm: [0.12, -0.4, 0.92], fore: [-0.38, -0.2, 0.92], elbowHint: [1, 0.1, -0.2], palm: [-1, 0, 0.1], grip: 1 })] },
  Dips: dips,
  'Dips assistés': dips,
  Tractions: pullUp,
  'Tractions assistées': pullUp,
  'Tractions / tirage vertical': pullUp,
  // À genoux : le buste recule à peine, les coudes descendent le long du corps.
  'Tirage vertical': { beats: [[1, 0.9], [1, 0.3], [0, 1.4], [0, 0.2]], keys: [
    pose(KNEEL, { neck: -6, torso: [0, 1, -0.08], hand: [0.34, 1.47, 0.08], elbowHint: [0.9, 0, 0.3], palm: [0, 0.1, 1], grip: 1 }),
    pose(KNEEL, { neck: -10, torso: [0, 1, -0.2], hand: [0.32, 1.02, 0.13], elbowHint: [0.85, -0.4, -0.3], palm: [0, 0.1, 1], grip: 1 })] },
  'Rowing barre': { gear: { hold: 'bar' }, beats: [[1, 0.8], [1, 0.3], [0, 1.3], [0, 0.2]], keys: [
    pose(STAND, ROW, rowTop, { elbowHint: [0.28, 0, -1], hand: [0.23, 0.6, 0.22] }),
    pose(STAND, ROW, rowTop, { hand: [0.23, 0.8, 0.1] })] },
  'Rowing haltère': dumbbellRow,
  // Assis au sol : le buste part un peu en avant, finit droit, les coudes passent le long du corps.
  'Tirage horizontal': { beats: [[1, 1.0], [1, 0.4], [0, 1.4], [0, 0.2]], keys: [
    pose(SEATED, { torso: [0, 1, 0.26], neck: -8, hand: [0.2, 0.54, 0.6], elbowHint: [0.3, -0.3, -1], palm: [-1, 0, 0.1], grip: 1 }),
    pose(SEATED, { torso: [0, 1, -0.1], neck: -3, hand: [0.24, 0.47, 0.17], elbowHint: [0.25, -0.1, -1], palm: [-1, 0, 0.1], grip: 1 })] },
  // Barre : mains à écart fixe, la barre passe devant le visage, la tête recule puis revient.
  'Développé militaire': { gear: { hold: 'bar' }, beats: [[1, 1.0], [1, 0.3], [0, 1.4], [0, 0.2]], keys: [
    pose(STAND, { hips: [0, 0.92, 0], torso: [0, 1, 0], neck: -5, hand: [0.34, 1.56, 0.12], elbowHint: [0.55, -0.72, 0.38], palm: [0, 0.2, 1], wrist: -18, grip: 1, gripAt: 1 }),
    pose(STAND, { hips: [0, 0.92, 0], torso: [0, 1, -0.02], neck: 2, hand: [0.34, 1.93, 0.02], elbowHint: [0.75, -0.6, 0.2], palm: [0, 0.2, 1], wrist: -10, grip: 1, gripAt: 1 })] },
  'Développé épaules haltères': { gear: { hold: 'dumbbells' }, beats: [[1, 1.0], [1, 0.2], [0, 1.5], [0, 0.2]], keys: [
    pose(STAND, { hips: [0, 0.92, 0], torso: [0, 1, 0], neck: 0, hand: [0.4, 1.4, 0.07], elbowHint: [0.8, -0.6, 0.15], palm: [0, 0, 1], wrist: -10, grip: 1 }),
    pose(STAND, { hips: [0, 0.92, 0], torso: [0, 1, 0], neck: 0, hand: [0.19, 1.93, 0.02], elbowHint: [0.85, -0.5, 0.1], palm: [0, 0, 1], wrist: -8, grip: 1 })] },
  'Élévations latérales': { gear: { hold: 'dumbbells' }, beats: [[1, 1.0], [1, 0.25], [0, 1.5], [0, 0.15]], keys: [
    pose(STAND, { hips: [0, 0.915, 0], neck: 0, arm: [0.17, -1, 0.03], fore: [0.1, -1, 0.14], elbowHint: [0.3, 0, -1], palm: [-1, 0, 0.05], grip: 1 }),
    pose(STAND, { hips: [0, 0.915, 0], neck: 0, arm: [1, 0.02, 0.2], fore: [1, -0.1, 0.34], elbowHint: [0.3, 0, -1], palm: [0, -1, 0.05], grip: 1 })] },
  'Face pull': { beats: [[1, 0.9], [1, 0.3], [0, 1.2], [0, 0.2]], keys: [
    pose(STAND, { hips: [0, 0.91, -0.03], torso: [0, 1, -0.05], neck: 0, foot: flat(0.15, 0, 8), hand: [0.1, 1.42, 0.5], elbowHint: [0.8, 0.1, -0.6], palm: [-1, 0, 0], grip: 1 }),
    pose(STAND, { hips: [0, 0.91, -0.03], torso: [0, 1, -0.05], neck: 0, foot: flat(0.15, 0, 8), hand: [0.27, 1.56, 0.1], elbowHint: [0.95, 0.15, -0.25], palm: [-1, 0, 0.15], grip: 1 })] },
  // Le coude reste près du corps, seul l'avant-bras monte ; paumes face à face tout du long.
  'Curl marteau': { gear: { hold: 'dumbbells' }, beats: TEMPO_CURL, keys: curlKeys([0.06, 0.8, 0.6], 0.08, { palm: [-1, 0, 0] }) },
  // Barre : les deux bras ensemble, paumes vers l'avant.
  'Curl barre': { gear: { hold: 'bar' }, beats: TEMPO_CURL, keys: [
    pose(STAND, { neck: 0, arm: [0.1, -1, 0.02], fore: [0.03, -1, 0.14], palm: [-0.25, 0, 1], grip: 1 }),
    pose(STAND, { neck: 0, arm: [0.1, -1, 0.08], fore: [0.02, 0.8, 0.6], palm: [-0.25, 0.75, -0.65], grip: 1 })] },
  'Extensions triceps': { beats: [[1, 0.8], [1, 0.25], [0, 1.2], [0, 0.15]], keys: [
    pose(STAND, { hips: [0, 0.91, -0.03], torso: [0, 0.97, 0.22], neck: -10, arm: [0.1, -1, 0.08], fore: [0.06, 0.05, 1], palm: [0, -1, 0.05], grip: 1 }),
    pose(STAND, { hips: [0, 0.91, -0.03], torso: [0, 0.97, 0.22], neck: -10, arm: [0.1, -1, 0.08], fore: [0.05, -1, 0.1], palm: [0, 0, -1], grip: 1 })] },
  // Bras presque verticaux et immobiles : seul le coude plie, la barre descend vers le front.
  'Barre au front': { beats: [[1, 1.5], [1, 0.2], [0, 1.0], [0, 0.25]], keys: [
    pose(SUPINE, { arm: [-0.02, 1, -0.12], fore: [-0.03, 1, -0.17], elbowHint: [0.15, 0, 1], palm: [0, -0.1, 1], grip: 1 }),
    pose(SUPINE, { arm: [-0.02, 1, -0.12], fore: [-0.02, 0.42, -0.9], elbowHint: [0.15, 0, 1], palm: [0, 0.9, 0.42], grip: 1 })] },
  // Jambes presque tendues ; en haut, le bas du dos s'enroule (bassin en rétroversion).
  'Relevés de jambes': { beats: [[1, 1.0], [1, 0.25], [0, 1.6], [0, 0.15]], keys: [
    pose(SUPINE, armsOnFloor(0), { thigh: [0.05, 0.1, 1], shin: [0.04, 0.03, 1], plantar: 16, kneeHint: [0, 1, 0] }),
    pose(SUPINE, armsOnFloor(0), { thigh: [0.05, 0.98, 0.18], shin: [0.04, 0.99, 0.1], plantar: 12, kneeHint: [0, 0.2, 1], pelvis: [0, -0.3, -0.95] })] },
  // Hanches fixes : c'est la colonne qui s'enroule, le bassin bouge à peine ; les mains restent près du front.
  'Crunch poulie': { beats: [[1, 0.9], [1, 0.3], [0, 1.3], [0, 0.2]], keys: [
    pose(KNEEL, { neck: 0, torso: [0, 1, 0.08], pelvis: [0, 1, 0.02], chest: [0.09, 0.62, 0.17], elbowHint: [0.5, -0.3, 0.8], palm: [-0.8, 0, -0.4], grip: 1 }),
    pose(KNEEL, { neck: 15, hips: [0, 0.53, -0.02], torso: [0, 0.3, 0.95], pelvis: [0, 0.98, 0.18], chest: [0.09, 0.62, 0.17], elbowHint: [0.5, -0.3, 0.8], palm: [-0.8, 0, -0.4], grip: 1 })] },
  // Saut sur place (sans box) : flexion, bras en arrière, les bras repartent devant, extension complète, jambes groupées
  // en l'air, réception amortie talons posés.
  'Box jump': { beats: [[1, 0.65], [1, 0.08], [2, 0.12, true], [3, 0.1, true], [4, 0.2], [5, 0.2, true], [6, 0.16], [6, 0.1], [0, 0.65], [0, 0.3]], keys: [
    pose(STAND, { neck: 0, arm: [0.08, -1, 0.05], fore: [0.04, -1, 0.14] }),
    pose(STAND, { hips: [0, 0.66, -0.17], torso: [0, 0.74, 0.67], neck: -25, foot: flat(0.14, 0, 8), arm: [0.12, -0.72, -0.68], fore: [0.08, -0.86, -0.5] }),
    pose(STAND, { hips: [0, 0.8, -0.05], torso: [0, 0.9, 0.42], neck: -14, foot: flat(0.14, 0, 8, 10), arm: [0.12, -0.85, 0.5], fore: [0.08, -0.7, 0.7] }),
    pose(STAND, { hips: [0, 1.0, 0.03], torso: [0, 1, 0.06], neck: -6, foot: flat(0.14, 0, 8, 42), arm: [0.15, 0.7, 0.7], fore: [0.1, 0.86, 0.5] }),
    pose(STAND, { hips: [0, 1.15, 0], torso: [0, 0.92, 0.4], neck: -14, foot: { x: 0.14, z: -0.04, yaw: 8, heel: 30, lift: 0.32 }, arm: [0.18, 0.5, 0.85], fore: [0.1, 0.68, 0.72] }),
    pose(STAND, { hips: [0, 0.96, 0.02], torso: [0, 1, 0.1], neck: -6, foot: flat(0.14, 0, 8, 28), arm: [0.18, -0.1, 0.98], fore: [0.1, -0.2, 0.98] }),
    pose(STAND, { hips: [0, 0.64, -0.16], torso: [0, 0.76, 0.65], neck: -25, foot: flat(0.14, 0, 8), arm: [0.15, -0.5, 0.85], fore: [0.1, -0.5, 0.85] })] },
};

const SPINE = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'];
const LIMB = ['Shoulder', 'Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot', 'ToeBase'];
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
const CHAIN = [...SPINE, ...['Left', 'Right'].flatMap((S) => LIMB.map((n) => S + n))];
const RAD = Math.PI / 180;
const smooth = (x) => x * x * (3 - 2 * x);

// Pose complète → une description par côté (les réglages communs valent pour les deux, en miroir).
function perSide(p) {
  const { L = {}, R = {}, ...common } = p;
  const { hips, torso, pelvis, twist, neck, ...limb } = common;
  return { hips, torso, pelvis, twist, neck, L: { ...limb, ...L }, R: { ...limb, ...R } };
}
// Mélange deux valeurs de même forme (nombres, vecteurs, objets). Absente d'un côté : celle qui existe.
function mix(a, b, w) {
  if (a === undefined) return b;
  if (b === undefined) return a;
  if (typeof a === 'number') return a + (b - a) * w;
  if (Array.isArray(a)) return a.map((x, i) => x + (b[i] - x) * w);
  if (a && typeof a === 'object') { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = mix(a[k], b[k], w); return o; }
  return w < 0.5 ? a : b;
}
// Plan de lecture : segments [clé départ, clé arrivée, t0, durée]. Les segments enchaînés partagent une seule courbe
// d'accélération (pas d'arrêt sur la pose intermédiaire).
function timeline(def) {
  const beats = def.beats || def.keys.map((_, i) => [i, 1]).slice(1).concat([[0, 1]]);
  const groups = []; let from = 0, group = null, t = 0;
  for (const [to, sec, flow] of beats) {
    (group ||= { t0: t, segs: [], T: 0 }).segs.push({ from, to, sec }); group.T += sec; t += sec; from = to;
    if (!flow) { groups.push(group); group = null; }
  }
  if (group) groups.push(group);
  const sample = (time) => {
    const g = groups.find((x) => time <= x.t0 + x.T + 1e-9) || groups[groups.length - 1];
    let u = smooth(Math.min(1, Math.max(0, (time - g.t0) / g.T))) * g.T;
    for (const s of g.segs) { if (u <= s.sec + 1e-9) return [s.from, s.to, s.sec ? u / s.sec : 1]; u -= s.sec; }
    const s = g.segs[g.segs.length - 1]; return [s.from, s.to, 1];
  };
  return { T: t, sample };
}

// Construit l'AnimationClip d'un exercice sur un corps au repos. Écart max entre cibles IK et position obtenue dans
// clip.userData.ikError (utilisé par le banc d'essai).
export function buildPoseClip(THREE, obj, def, name = 'pose') {
  const V = (...a) => new THREE.Vector3(...a), Q = () => new THREE.Quaternion();
  const bones = {}; obj.traverse((o) => { if (o.isBone) { const n = o.name.replace(/^mixamorig:?/, ''); bones[n] ||= o; } });
  const saved = Object.values(bones).map((b) => [b, b.quaternion.clone(), b.position.clone()]);
  obj.updateMatrixWorld(true);
  const wp = (b) => b.getWorldPosition(V()), wq = (b) => b.getWorldQuaternion(Q());
  // Repère du personnage, mesuré sur le squelette au repos.
  const U = V(0, 1, 0), R = wp(bones.RightArm).sub(wp(bones.LeftArm)).setY(0).normalize(), F = V().crossVectors(U, R), LEFT = R.clone().negate();
  const toeY = wp(bones.LeftToeBase).y, restH = wp(bones.HeadTop_End).y - toeY, s = 1.75 / restH; // s : mètres « 1,75 m » par unité monde
  const origin = wp(bones.Hips).setY(toeY);
  const restP = {}, restQ = {};
  for (const b of CHAIN) { restP[b] = wp(bones[b]).sub(origin).multiplyScalar(s); restQ[b] = wq(bones[b]); }
  const off = (a, b) => restP[b].clone().sub(restP[a]); // segment au repos, en mètres
  const chainDir = (a, b) => off(a, b).normalize();
  const side = (a, sgn) => V().addScaledVector(R, a[0] * sgn).addScaledVector(U, a[1]).addScaledVector(F, a[2]);
  const rot = (axis, deg) => Q().setFromAxisAngle(axis, deg * RAD);
  const L = { thigh: off('LeftUpLeg', 'LeftLeg').length(), shin: off('LeftLeg', 'LeftFoot').length(), arm: off('LeftArm', 'LeftForeArm').length(), fore: off('LeftForeArm', 'LeftHand').length() };
  const ankleH = restP.LeftFoot.y;
  // Centre du poing fermé par rapport au poignet, au repos (même règle que gripOf dans js/gear3d.js) : sert aux cibles
  // `gripAt` (barre tenue à écart fixe). Au repos la paume regarde vers le bas.
  const gripOff = {};
  for (const S of ['Left', 'Right']) {
    const m1 = wp(bones[S + 'HandMiddle1']).sub(origin).multiplyScalar(s), h = restP[S + 'Hand'], dir = chainDir(S + 'ForeArm', S + 'Hand'), len = m1.distanceTo(h);
    gripOff[S] = m1.sub(h).addScaledVector(dir, -0.18 * len).addScaledVector(U, -0.42 * len);
  }

  // Orientation qui amène le repère de repos du segment (axe long + axe de charnière) sur son repère en pose.
  const basis = (dir, axis) => { const x = axis.clone().addScaledVector(dir, -axis.dot(dir)).normalize(), z = V().crossVectors(x, dir).normalize(); return new THREE.Matrix4().makeBasis(x, dir, z); };
  const frame = (restDir, restAxis, dir, axis) => Q().setFromRotationMatrix(basis(dir, axis).multiply(basis(restDir, restAxis).clone().invert()));
  // IK à 2 os : directions des deux segments, le coude/genou du côté de `hint`.
  // Près de la pleine extension, la distance est adoucie : sans ça, le coude ou le genou se verrouillerait d'un coup.
  const ik = (root, target, a, b, hint) => {
    const d = target.clone().sub(root), reach = a + b, soft = 0.965 * reach, raw = d.length(), dir = d.normalize();
    const dist = Math.max(Math.abs(a - b) + 0.01, raw <= soft ? raw : soft + (reach * 0.9995 - soft) * (1 - Math.exp(-(raw - soft) / (reach * 0.9995 - soft))));
    const x = (a * a - b * b + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, a * a - x * x));
    const bend = hint.clone().addScaledVector(dir, -hint.dot(dir)).normalize();
    const mid = root.clone().addScaledVector(dir, x).addScaledVector(bend, h);
    return { upper: mid.clone().sub(root).normalize(), lower: root.clone().addScaledVector(dir, dist).sub(mid).normalize(), axis: V().crossVectors(bend, dir).normalize() };
  };
  // Axe de charnière d'un membre donné par ses directions : plan des deux segments, stabilisé par `hint` quand il est tendu.
  const hingeAxis = (u, w, hint) => { const a = V().crossVectors(u, w).multiplyScalar(8), b = hint.clone().addScaledVector(u, -hint.dot(u)); return a.add(V().crossVectors(b, u)).normalize(); };

  // Résout une pose (déjà mélangée) : orientation de chaque os par rapport au repos, position du bassin.
  const resolve = (p) => {
    const hips = side(p.hips, 1), torso = side(p.torso, 1).normalize(), d = {}, targets = [];
    const pitch = Math.atan2(torso.dot(F), torso.dot(U)) / RAD; // > 0 : buste penché en avant
    const qTrunk = Q().setFromUnitVectors(U, torso);
    const qChest = qTrunk.clone().multiply(rot(U, p.twist || 0));
    // Bassin : suit le buste (colonne à peine enroulée quand on se penche), sauf s'il est donné explicitement.
    const qPelvis = p.pelvis ? Q().setFromUnitVectors(U, side(p.pelvis, 1).normalize()) : Q().slerp(qTrunk, pitch > 0 ? 0.85 : 1);
    d.Hips = qPelvis; d.Spine = qPelvis.clone().slerp(qChest, 1 / 3); d.Spine1 = qPelvis.clone().slerp(qChest, 2 / 3); d.Spine2 = qChest;
    // Cou : par défaut, le regard reste à l'horizontale aux deux tiers ; `neck` donne la flexion directement.
    const neck = p.neck ?? -0.35 * pitch;
    d.Neck = qChest.clone().multiply(rot(LEFT, neck * 0.5)); d.Head = qChest.clone().multiply(rot(LEFT, neck));
    // Cinématique directe bassin → thorax.
    const pSpine = hips.clone().add(off('Hips', 'Spine').applyQuaternion(d.Hips));
    const pSpine1 = pSpine.clone().add(off('Spine', 'Spine1').applyQuaternion(d.Spine));
    const pSpine2 = pSpine1.clone().add(off('Spine1', 'Spine2').applyQuaternion(d.Spine1));
    for (const [S, sgn, k] of [['Left', -1, 'L'], ['Right', 1, 'R']]) {
      const q = p[k], kind = S; // réglages de ce côté
      // ── Jambe ──
      const hip = hips.clone().add(off('Hips', S + 'UpLeg').applyQuaternion(d.Hips));
      const f = q.foot, yawDeg = (f?.yaw ?? 8) * (S === 'Left' ? 1 : -1), qYaw = rot(U, yawDeg), footF = F.clone().applyQuaternion(qYaw);
      const hint = q.kneeHint ? side(q.kneeHint, sgn) : footF.clone().addScaledVector(U, 0.05);
      let thigh, shin, kneeAxis, ground = false, qFoot = null;
      if (f && !f.free) { // pied au sol : il décide de la direction du genou
        ground = true;
        const heel = f.heel || 0; qFoot = qYaw.clone().multiply(rot(LEFT, heel));
        const v = off(S + 'Foot', S + 'ToeBase'), ball = side([f.x, ankleH + (f.lift || 0), f.z], sgn).add(v.clone().applyQuaternion(qYaw));
        const ankle = ball.clone().sub(v.applyQuaternion(qFoot));
        const r = ik(hip, ankle, L.thigh, L.shin, hint); thigh = r.upper; shin = r.lower; kneeAxis = r.axis; targets.push(['Foot', S, ankle]);
      } else if (f && f.toe) { // dessus du pied posé (banc) : la base des orteils reste fixe, la cheville pivote autour
        const ball = side([f.x, f.y, f.z], sgn), v = off(S + 'Foot', S + 'ToeBase');
        let ankle = ball.clone().sub(v.clone().applyQuaternion(rot(LEFT, f.plantar ?? 14))), r;
        for (let it = 0; it < 4; it++) { // le pied suit le tibia, le tibia dépend de la cheville : quelques passes suffisent
          r = ik(hip, ankle, L.thigh, L.shin, hint);
          const qLeg = frame(chainDir(S + 'Leg', S + 'Foot'), LEFT, r.lower, r.axis);
          ankle = ball.clone().sub(v.clone().applyQuaternion(qLeg.multiply(rot(LEFT, f.plantar ?? 14))));
        }
        r = ik(hip, ankle, L.thigh, L.shin, hint); thigh = r.upper; shin = r.lower; kneeAxis = r.axis; targets.push(['Foot', S, ankle], ['ToeBase', S, ball]);
      } else if (f) { // pied en l'air, cible de la cheville
        const ankle = side([f.x, f.y, f.z], sgn);
        const r = ik(hip, ankle, L.thigh, L.shin, hint); thigh = r.upper; shin = r.lower; kneeAxis = r.axis; targets.push(['Foot', S, ankle]);
      } else { thigh = side(q.thigh, sgn).normalize(); shin = side(q.shin, sgn).normalize(); kneeAxis = hingeAxis(thigh, shin, hint); }
      d[S + 'UpLeg'] = frame(chainDir(S + 'UpLeg', S + 'Leg'), LEFT, thigh, kneeAxis);
      d[S + 'Leg'] = frame(chainDir(S + 'Leg', S + 'Foot'), LEFT, shin, kneeAxis);
      // Pied en l'air : la cheville suit le tibia, seule la flexion plantaire change (axe de la charnière du genou).
      d[S + 'Foot'] = ground ? qFoot : d[S + 'Leg'].clone().multiply(rot(LEFT, f?.plantar ?? q.plantar ?? 14));
      d[S + 'ToeBase'] = ground ? qYaw : f?.toe ? rot(LEFT, 180) : d[S + 'Foot']; // orteils à plat sur le banc, dessus vers le bas
      // ── Bras ──
      const aRest = LEFT.clone().multiplyScalar(0).addScaledVector(U, sgn); // axe du coude au repos (bras en T) : flexion vers l'avant
      const rUp = chainDir(S + 'Arm', S + 'ForeArm'), rFo = chainDir(S + 'ForeArm', S + 'Hand');
      const clav = off('Spine2', S + 'Shoulder').applyQuaternion(qChest).add(pSpine2), toArm = off(S + 'Shoulder', S + 'Arm');
      const targetOf = (shoulder) => q.hand ? side(q.hand, sgn) : q.chest ? pSpine2.clone().add(side(q.chest, sgn).applyQuaternion(qChest)) : null;
      // Clavicule : deux passes (la direction du bras dépend de l'épaule et inversement).
      let qClav = qChest.clone(), shoulder = clav.clone().add(toArm.clone().applyQuaternion(qClav));
      for (let i = 0; i < 2; i++) {
        const t0 = targetOf(shoulder), dirArm = t0 ? t0.clone().sub(shoulder).normalize() : side(q.arm, sgn).normalize();
        const inChest = dirArm.clone().applyQuaternion(qChest.clone().invert());
        const raise = Math.min(1, Math.max(0, (inChest.y + 0.15) / 1.15)) * 16, forward = THREE.MathUtils.clamp(inChest.z, -1, 1) * 9;
        // Le bras levé fait monter l'épaule, le bras devant la fait avancer. Sens miroir à droite.
        const sg = S === 'Left' ? 1 : -1;
        qClav = qChest.clone().multiply(rot(F, sg * raise)).multiply(rot(U, -sg * forward));
        shoulder = clav.clone().add(toArm.clone().applyQuaternion(qClav));
      }
      d[S + 'Shoulder'] = qClav;
      const target = targetOf(shoulder), elbowHint = side(q.elbowHint || [0.25, -0.1, -1], sgn);
      // Bras complet pour une cible du poignet (ou sans cible : directions données).
      const solveArm = (wrist) => {
        let up, fo, elbowAxis;
        if (wrist) { const r = ik(shoulder, wrist, L.arm, L.fore, elbowHint); up = r.upper; fo = r.lower; elbowAxis = r.axis; }
        else { up = side(q.arm, sgn).normalize(); fo = side(q.fore || q.arm, sgn).normalize(); elbowAxis = hingeAxis(up, fo, elbowHint); }
        const dUp = frame(rUp, aRest, up, elbowAxis), dFo = frame(rFo, aRest, fo, elbowAxis);
        // Rotation de l'avant-bras : amène la paume (vers le bas au repos) sur la direction demandée, moitié coude, moitié poignet.
        let twist = 0;
        if (q.palm) {
          const now = U.clone().negate().applyQuaternion(dFo), want = side(q.palm, sgn);
          now.addScaledVector(fo, -now.dot(fo)).normalize(); want.addScaledVector(fo, -want.dot(fo)).normalize();
          twist = Math.atan2(V().crossVectors(now, want).dot(fo), now.dot(want));
        }
        return { dUp, dFo: Q().setFromAxisAngle(fo, twist * 0.5).multiply(dFo),
          dHand: Q().setFromAxisAngle(fo, twist).multiply(dFo).multiply(rot(F, (q.wrist || 0) * (S === 'Left' ? -1 : 1))) };
      };
      let arm;
      if (target && q.gripAt) { // la cible est le centre du poing (barre rigide) : on corrige le poignet jusqu'à l'y amener
        let wrist = target.clone();
        for (let it = 0; it < 4; it++) { arm = solveArm(wrist); wrist.add(target.clone().sub(wrist.clone().add(gripOff[S].clone().applyQuaternion(arm.dHand)))); }
        arm = solveArm(wrist); targets.push(['Grip', S, target]);
      } else { arm = solveArm(target); if (target) targets.push(['Hand', S, target]); }
      d[S + 'Arm'] = arm.dUp; d[S + 'ForeArm'] = arm.dFo; d[S + 'Hand'] = arm.dHand;
      d[kind + 'Grip'] = q.grip || 0;
    }
    return { hips, d, targets };
  };

  const { T, sample } = timeline(def), keys = def.keys.map(perSide), n = Math.max(48, Math.round(T * 20)), fps = n / T;
  const list0 = CHAIN, tracks = {}, parentName = Object.fromEntries(CHAIN.map((b) => [b, bones[b].parent.name.replace(/^mixamorig:?/, '')]));
  const hipPos = [], frames = [];
  for (let i = 0; i <= n; i++) {
    const [a, b, w] = sample(Math.min(T, i / fps)), r = resolve(mix(keys[a], keys[b], w));
    frames.push(r);
    const abs = {};
    for (const bn of list0) {
      abs[bn] = r.d[bn].clone().multiply(restQ[bn]);
      const par = abs[parentName[bn]] || wq(bones[bn].parent);
      const local = par.clone().invert().multiply(abs[bn]);
      (tracks[bn] ||= []).push(local.x, local.y, local.z, local.w);
    }
    hipPos.push(bones.Hips.parent.worldToLocal(r.hips.clone().multiplyScalar(1 / s).add(origin)));
  }
  const times = Array.from({ length: n + 1 }, (_, i) => i / fps);
  const safe = (b) => b.name.replace(/[.:\s/[\]]/g, '');
  const list = Object.entries(tracks).map(([b, v]) => new THREE.QuaternionKeyframeTrack(safe(bones[b]) + '.quaternion', times, v));
  list.push(new THREE.VectorKeyframeTrack(safe(bones.Hips) + '.position', times, hipPos.flatMap((p) => [p.x, p.y, p.z])));
  // Doigts : refermés autour de la prise (axe : perpendiculaire à l'os et à la paume, mesuré au repos).
  for (const S of ['Left', 'Right']) for (const fg of FINGERS) for (const j of [1, 2, 3]) {
    const b = bones[`${S}Hand${fg}${j}`]; if (!b) continue;
    const q0 = wq(b).invert(), child = b.children.find((c) => c.isBone); if (!child) continue;
    const dir = wp(child).sub(wp(b)).normalize(), toward = U.clone().negate();
    const axisL = V().crossVectors(dir, toward).normalize().applyQuaternion(q0);
    const amount = (fg === 'Thumb' ? 0.45 : j === 1 ? 1.2 : 1.0);
    const vals = frames.flatMap((r) => { const q = b.quaternion.clone().multiply(Q().setFromAxisAngle(axisL, r.d[S + 'Grip'] * amount)); return [q.x, q.y, q.z, q.w]; });
    list.push(new THREE.QuaternionKeyframeTrack(safe(b) + '.quaternion', times, vals));
  }
  const clip = new THREE.AnimationClip(name, T, list);
  // Contrôle sur le squelette réel : les cibles IK sont-elles atteintes, à toutes les images (pas seulement aux clés) ?
  let ikError = 0;
  for (let f = 0; f <= n; f += 3) {
    for (const bn of list0) { const v = tracks[bn]; bones[bn].quaternion.set(v[f * 4], v[f * 4 + 1], v[f * 4 + 2], v[f * 4 + 3]); }
    bones.Hips.position.copy(hipPos[f]); obj.updateMatrixWorld(true);
    for (const [bone, S, t] of frames[f].targets) {
      const p = bone === 'Grip' ? wp(bones[S + 'Hand']).sub(origin).multiplyScalar(s).add(gripOff[S].clone().applyQuaternion(wq(bones[S + 'Hand']).multiply(restQ[S + 'Hand'].clone().invert())))
        : wp(bones[S + bone]).sub(origin).multiplyScalar(s);
      ikError = Math.max(ikError, p.distanceTo(t));
    }
  }
  for (const [b, q, p] of saved) { b.quaternion.copy(q); b.position.copy(p); }
  obj.updateMatrixWorld(true);
  clip.userData = { tmPrepared: true, ikError, frame: { origin: origin.clone(), s, R: R.clone(), U: U.clone(), F: F.clone() } }; // repère des poses (banc posé par gear3d.js)
  return clip;
}

// Fiches technique (apprentissage) : niveau, étapes, erreurs fréquentes, conseils en FR / EN / NL + pictogramme SVG au trait.
// Clé = nom français exact de l'exercice dans LIBRARY (js/exercises.js). Contenu pédagogique général, sans valeur de conseil médical :
// en cas de douleur ou de pathologie, demander l'avis d'un professionnel de santé.
import { LIBRARY } from './exercises.js';

export const LEVELS = ['debutant', 'intermediaire', 'avance'];
export const LEVEL_LABEL = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };
export const LANGS_T = ['fr', 'en', 'nl'];

// --- Pictogrammes : silhouettes schématiques de profil, viewBox 96×96, trait 4,5 px, tête = cercle (r = 6). ---
const G = 'M14 89h68'; // sol
const HEAD = (x, y) => `<circle cx="${x}" cy="${y}" r="6"/>`;
const P = (...d) => d.map((s) => `<path d="${s}"/>`).join('');
const POSES = {
  // debout, barre sur les épaules / devant
  squat: HEAD(46, 16) + P('M46 24L40 50L58 62L50 85', 'M26 30h40', 'M44 30l-8 6', G),
  frontsquat: HEAD(46, 16) + P('M46 24L42 50L58 62L50 85', 'M34 36h28', 'M44 32l12 4', G),
  legpress: HEAD(22, 40) + P('M28 46L42 64L62 46L74 62', 'M76 34L86 70', 'M14 70h34', 'M14 52v18'),
  bulgarian: HEAD(46, 14) + P('M46 22V48L64 56V86', 'M46 48L30 60h-12', 'M12 56h14', 'M46 28v14', G),
  lunge: HEAD(46, 14) + P('M46 22V48L64 56V86', 'M46 48L28 68L16 86', 'M46 28v16', G),
  legext: HEAD(32, 16) + P('M32 24V54H54L80 52', 'M24 60h16', 'M24 54v30', 'M76 44l8 10'),
  legcurl: HEAD(26, 38) + P('M12 52h46', 'M58 52L74 64L66 80', 'M20 46h-8', 'M14 60v24'),
  deadlift: HEAD(66, 30) + P('M62 36L38 52L42 70V86', 'M60 38L58 68', 'M48 68h22', G),
  rdl: HEAD(68, 28) + P('M64 34L38 50L42 68V86', 'M60 38L58 62', 'M48 62h22', G),
  hipthrust: HEAD(16, 44) + P('M22 50L50 46L66 62V86', 'M8 58h28', 'M50 38v8', 'M44 38h12', G),
  calf: HEAD(48, 14) + P('M48 22V50V80L54 88', 'M34 24h28', 'M40 88h24'),
  calfseat: HEAD(32, 20) + P('M32 28V54H58', 'M58 54L64 80L70 88', 'M50 46h20', 'M56 88h22'),
  // poussées
  bench: HEAD(14, 58) + P('M22 62H58L66 76V86', 'M36 62V36', 'M24 36h24', 'M10 68h52'),
  dbbench: HEAD(14, 58) + P('M22 62H58L66 76V86', 'M36 62V38', 'M30 38h12', 'M10 68h52'),
  incline: HEAD(18, 46) + P('M24 52L52 68H66V86', 'M36 58L40 34', 'M34 34h12', 'M12 56L44 76'),
  cablefly: HEAD(48, 20) + P('M48 28V56L42 86', 'M48 56L56 86', 'M48 34L26 44', 'M48 34L70 44', 'M14 12L26 44', 'M82 12L70 44'),
  pushup: HEAD(76, 32) + P('M70 38L16 64', 'M64 42V68', 'M12 69h6', G),
  dips: HEAD(48, 14) + P('M48 22V52L58 68L48 82', 'M48 28L38 44', 'M28 44h22', 'M28 44v30'),
  dipsassist: HEAD(44, 14) + P('M44 22V52L54 66', 'M44 28L34 44', 'M24 44h22', 'M54 66h18v22', 'M60 88h20'),
  // tractions
  pullup: HEAD(48, 20) + P('M18 8h60', 'M38 8L42 32', 'M58 8L54 32', 'M48 28V56L52 72L42 84'),
  pullupassist: HEAD(46, 20) + P('M18 8h60', 'M36 8L40 32', 'M56 8L52 32', 'M46 28V54L56 64', 'M58 64v24', 'M50 88h20'),
  pulldown: HEAD(46, 30) + P('M22 8h52', 'M30 8L36 36', 'M62 8L56 36', 'M46 38L50 66H70', 'M36 72h28'),
  row: HEAD(68, 28) + P('M64 34L38 50L42 68V86', 'M60 38L54 54', 'M48 62h22', G),
  dbrow: HEAD(66, 30) + P('M60 36L34 44', 'M34 44L42 66V86', 'M34 44L22 62V86', 'M52 40L56 62', 'M50 62h12', 'M62 40l14 4'),
  cablerow: HEAD(36, 22) + P('M36 30V58H58', 'M58 58L66 84', 'M36 36L58 44L72 50', 'M72 44v14', 'M22 72h22'),
  // épaules
  ohp: HEAD(48, 24) + P('M48 32V58L42 86', 'M48 58L56 86', 'M48 38L36 28V10', 'M24 10h28'),
  dbohp: HEAD(48, 26) + P('M48 34V60L42 86', 'M48 60L56 86', 'M48 38L34 30V12', 'M48 38L62 30V12', 'M28 12h12', 'M56 12h12'),
  lateral: HEAD(48, 18) + P('M48 26V56L42 86', 'M48 56L56 86', 'M48 32L18 36', 'M48 32L78 36', 'M12 32v8', 'M84 32v8'),
  facepull: HEAD(46, 20) + P('M46 28V56L40 86', 'M46 56L54 86', 'M46 34L58 40L52 24', 'M10 20L46 24', 'M66 28L52 24'),
  // bras
  curl: HEAD(46, 16) + P('M46 24V54L40 86', 'M46 54L54 86', 'M46 30L50 50L68 38', 'M64 32l8 12'),
  curlbar: HEAD(46, 16) + P('M46 24V54L40 86', 'M46 54L54 86', 'M46 30L50 50L68 38', 'M62 30h14'),
  hammer: HEAD(46, 16) + P('M46 24V54L40 86', 'M46 54L54 86', 'M46 30L50 50L66 36', 'M66 28v16'),
  triceps: HEAD(44, 20) + P('M44 28V56L38 86', 'M44 56L52 86', 'M44 34L52 50L60 66', 'M30 6h20', 'M40 6L56 62'),
  skull: HEAD(14, 58) + P('M22 62H58L66 76V86', 'M36 62V38L24 34', 'M16 34h16', 'M10 68h52'),
  // abdominaux
  crunch: HEAD(40, 44) + P('M14 74h42L68 56L70 74', 'M46 52L30 66', 'M44 44l-8-4'),
  plank: HEAD(78, 48) + P('M72 54L14 68', 'M66 56v14', 'M60 70h14', G),
  legraise: HEAD(14, 66) + P('M22 70H46', 'M46 70L72 46', 'M30 70v6', 'M10 78h40'),
  cablecrunch: HEAD(40, 28) + P('M46 36L52 58L38 74', 'M52 58H68L72 74', 'M36 14L42 34', 'M36 6v8'),
  // Jambes (pistol, overhead squat) · cardio (burpee) · haltérophilie (arraché, épaulé-jeté, tirage sumo) · épaules (frontales)
  pistolsquat: HEAD(46, 14) + P('M46 22V46L34 58V86', 'M46 46L70 50L88 40', 'M34 58L12 62', G),
  overheadsquat: HEAD(46, 8) + P('M46 16L40 44L58 56L50 85', 'M22 8h48', 'M46 16V8', G),
  burpee: HEAD(16, 58) + P('M22 62H58L74 48', 'M54 62V84', 'M68 52l10 10', G),
  snatch: HEAD(50, 10) + P('M50 18V44L40 56V86', 'M50 44L58 66H44', 'M50 18L30 8', 'M50 18L70 8', G),
  cleanjerk: HEAD(46, 14) + P('M46 22V48L54 60V86', 'M46 48L30 60L18 86', 'M30 30h32', 'M46 36l-10-6', G),
  sumopull: HEAD(48, 16) + P('M48 24V50L40 62V86', 'M48 24L56 86', 'M20 50h56', 'M48 50L58 30', G),
  frontraise: HEAD(46, 14) + P('M46 22V54L40 86', 'M46 54L52 86', 'M46 30V10', 'M46 30L72 20', G),
};
const SVG_ATTR = 'viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
// Figures 3D (mannequin argile rendu dans Blender, design/mannequin.blend) : 2 poses par exercice, enchaînées en boucle.
// Les exercices sans rendu gardent le pictogramme au trait.
const FIGURES = { Squat: 'squat' };
export const hasFigure = (name) => !!FIGURES[name];
// Modèles 3D animés (humain Mixamo converti dans Blender) : un fichier glb par sexe, plusieurs animations dedans
// (une par exercice, ajoutées au fur et à mesure des imports Mixamo).
const BODY = { M: 'models/trackme-human.glb', F: 'models/trackme-human-f.glb' };
// Clip Mixamo par exercice (nom du LIBRARY → nom de l'animation dans le glb). Pas encore de clip = figure 2D.
const CLIPS = { Squat: 'squat' };
// Muscle (nom FR de exercises.js) → os du squelette Mixamo, intensité de la lueur.
// Valeur > 0 : tout le segment ; valeur < 0 : face arrière seulement (ex. fessiers = os Hips, côté dos).
const MUSCLE_BONES = {
  Quadriceps: { LeftUpLeg: 1, RightUpLeg: 1 },
  Fessiers: { Hips: -0.9 },
  Ischios: { LeftUpLeg: -0.55, RightUpLeg: -0.55 },
  Mollets: { LeftLeg: 1, RightLeg: 1 },
  Dos: { Spine1: -0.9, Spine2: -0.9 },
  Pectoraux: { Spine2: 0.85, Spine1: 0.3 },
  Triceps: { LeftForeArm: 1, RightForeArm: 1 },
  Épaules: { LeftShoulder: 1, RightShoulder: 1, LeftArm: 0.4, RightArm: 0.4 },
  Biceps: { LeftArm: -0.7, RightArm: -0.7 },
  Abdos: { Spine: 1 },
};
// Combine muscle principal (intensité pleine) + secondaires (0,55×) : à os partagé, la plus forte intensité l'emporte.
function combineMuscles(primary, secondary = []) {
  const W = {};
  const add = (name, scale) => { const b = MUSCLE_BONES[name]; if (!b) return;
    for (const bone in b) { const v = b[bone] * scale; if (!(bone in W) || Math.abs(v) > Math.abs(W[bone])) W[bone] = v; } };
  add(primary, 1); secondary.forEach((m) => add(m, 0.55));
  return W;
}
// Déformation du mouvement correct pour illustrer l'erreur la plus fréquente (onglet Erreurs), appliquée en plus
// de l'animation telle quelle : un décalage de rotation fixe sur certains os, visible pendant tout le mouvement.
const MISTAKES = {
  Squat: { LeftLeg: { z: -0.3 }, RightLeg: { z: 0.3 } }, // genoux qui rentrent vers l'intérieur
};
export function model3D(name, sex = 'M') {
  const clip = CLIPS[name]; if (!clip) return null;
  const e = LIBRARY.find((x) => x.name === name);
  return { url: BODY[sex === 'F' ? 'F' : 'M'], clip, muscles: combineMuscles(e?.muscle, e?.secondary || []), equipment: e?.equipment, mistake: MISTAKES[name], name };
}
// Tenues : 3 par sexe, couleurs tirées de références photo (haut / bas / chaussures). Choix dans la visionneuse,
// appliqué en recolorant les matériaux du modèle déjà chargé (voir setOutfit dans viewer3d.js).
export const OUTFITS = {
  M: [
    { id: 'survet-gris', label: 'Survêtement gris', top: 0xb8b8bc, shorts: 0xc2c2c6, shoes: 0xf4f4f2 },
    { id: 'hoodie-marine', label: 'Hoodie marine', top: 0x10172a, shorts: 0xa9acb2, shoes: 0xb8babd },
    { id: 'hoodie-cosy', label: 'Hoodie cosy', top: 0x9b9b92, shorts: 0xa8a89e, shoes: 0xf2f0ec },
  ],
  F: [
    { id: 'zip-blanc', label: 'Col zippé blanc', top: 0xf5f4f0, shorts: 0x16161a, shoes: 0xe8e8e6 },
    { id: 'crop-gris', label: 'Crop gris', top: 0x9c9ca0, shorts: 0xb7b7bb, shoes: 0xc3c5c8 },
    { id: 'demizip-gris', label: 'Demi-zip gris', top: 0xd7d7d4, shorts: 0x54545a, shoes: 0xf2f0ec },
  ],
};
export const outfitsFor = (sex) => OUTFITS[sex === 'F' ? 'F' : 'M'];
export const pictogram = (name, cls = '') => {
  const f = FIGURES[name];
  if (f) return `<span class="lrn-pic lrn-3d ${cls}" aria-hidden="true"><img src="img/ex/${f}-1.webp" alt="" decoding="async"><img src="img/ex/${f}-2.webp" alt="" decoding="async"></span>`;
  const k = (TECH[name] || {}).pose;
  return `<svg class="lrn-pic ${cls}" ${SVG_ATTR}>${POSES[k] || POSES.plank}</svg>`;
};

// Fabrique une fiche : E(niveau, pose, [fr, en, nl]) avec chaque langue = [étapes, erreurs, conseils].
const E = (level, pose, [fr, en, nl]) => {
  const f = (i) => ({ fr: fr[i], en: en[i], nl: nl[i] });
  return { level, pose, steps: f(0), mistakes: f(1), tips: f(2) };
};

const TECH = {
  'Squat': E('intermediaire', 'squat', [
    [['Place la barre sur le haut des trapèzes, mains largeur d\'épaules ou un peu plus, coudes sous la barre.', 'Pieds à largeur de bassin ou un peu plus, pointes légèrement ouvertes ; inspire et gaine le ventre.', 'Descends en poussant les genoux dans l\'axe des pieds et le bassin vers l\'arrière, buste gainé.', 'Descends jusqu\'à la profondeur que tu contrôles sans arrondir le bas du dos.', 'Remonte en poussant le sol de tout le pied et expire en haut.'],
      ['Les genoux qui rentrent vers l\'intérieur.', 'Le bas du dos qui s\'arrondit en bas du mouvement.', 'Les talons qui décollent ou le buste qui s\'effondre vers l\'avant.'],
      ['Tempo conseillé : 2 s à la descente, remontée contrôlée.', 'Garde 1 à 3 reps en réserve (RIR) sur la plupart des séries.', 'Commence léger pour apprivoiser la profondeur et l\'équilibre ; utilise des cales de sécurité ou une cage.']],
    [['Set the bar on your upper traps, hands about shoulder width or slightly wider, elbows under the bar.', 'Feet hip-width or a bit wider, toes slightly out; breathe in and brace your abs.', 'Sit down by pushing the knees in line with the feet and the hips back, trunk braced.', 'Go as deep as you can control without rounding the lower back.', 'Drive up through the whole foot and breathe out at the top.'],
      ['Knees caving inward.', 'Lower back rounding at the bottom.', 'Heels lifting or the chest collapsing forward.'],
      ['Suggested tempo: 2 s down, controlled way up.', 'Keep 1-3 reps in reserve (RIR) on most sets.', 'Start light to learn depth and balance; use safety pins or a rack.']],
    [['Leg de stang op je bovenste trapezius, handen ongeveer schouderbreed of iets breder, ellebogen onder de stang.', 'Voeten heupbreed of iets breder, tenen licht naar buiten; adem in en span je buik aan.', 'Zak door de knieën in lijn met de voeten te duwen en je heupen naar achteren te brengen, romp gespannen.', 'Ga zo diep als je kunt beheersen zonder je onderrug te ronden.', 'Duw omhoog door je hele voet en adem boven uit.'],
      ['Knieën die naar binnen zakken.', 'Onderrug die rondt onderaan de beweging.', 'Hielen die loskomen of een romp die naar voren klapt.'],
      ['Aanbevolen tempo: 2 s omlaag, gecontroleerd omhoog.', 'Houd bij de meeste sets 1-3 herhalingen in reserve (RIR).', 'Begin licht om diepte en balans te leren; gebruik veiligheidspennen of een rek.']]]),
  'Squat avant': E('avance', 'frontsquat', [
    [['Pose la barre sur l\'avant des épaules, coudes hauts, doigts sous la barre (prise « clean » ou bras croisés).', 'Pieds à largeur de bassin ; inspire et gaine le ventre.', 'Descends bien droit, coudes hauts, genoux dans l\'axe des pieds.', 'Descends jusqu\'à une profondeur contrôlée, buste vertical.', 'Remonte en poussant le sol et en gardant les coudes hauts.'],
      ['Les coudes qui tombent et la barre qui roule vers l\'avant.', 'Le haut du dos qui s\'arrondit.', 'Les talons qui décollent.'],
      ['Charge plus légère que le squat classique : c\'est normal.', 'Tempo : 2 s à la descente, 1 s en bas, remontée contrôlée.', 'Un travail de mobilité des poignets et des chevilles aide beaucoup.']],
    [['Rest the bar on the front of your shoulders, elbows high, fingers under the bar (clean grip or crossed arms).', 'Feet hip-width; breathe in and brace your abs.', 'Descend straight down, elbows high, knees in line with the feet.', 'Go to a controlled depth keeping the torso upright.', 'Stand up by pushing the floor and keeping the elbows high.'],
      ['Elbows dropping so the bar rolls forward.', 'Upper back rounding.', 'Heels lifting.'],
      ['Use a lighter load than back squats: that is normal.', 'Tempo: 2 s down, 1 s pause, controlled way up.', 'Wrist and ankle mobility work helps a lot.']],
    [['Leg de stang op de voorkant van je schouders, ellebogen hoog, vingers onder de stang (clean-greep of gekruiste armen).', 'Voeten heupbreed; adem in en span je buik aan.', 'Zak recht naar beneden, ellebogen hoog, knieën in lijn met de voeten.', 'Ga tot een beheersbare diepte met een rechtop gehouden romp.', 'Kom omhoog door de vloer weg te duwen en je ellebogen hoog te houden.'],
      ['Ellebogen die zakken waardoor de stang naar voren rolt.', 'Bovenrug die rondt.', 'Hielen die loskomen.'],
      ['Gebruik een lichter gewicht dan bij de gewone squat: dat is normaal.', 'Tempo: 2 s omlaag, 1 s pauze, gecontroleerd omhoog.', 'Mobiliteitswerk voor polsen en enkels helpt veel.']]]),
  'Presse à cuisses': E('debutant', 'legpress', [
    [['Assieds-toi, dos et bassin bien collés au dossier ; pieds à largeur d\'épaules sur la plateforme.', 'Déverrouille les sécurités et descends la plateforme en contrôle.', 'Arrête-toi quand les genoux sont fléchis à environ 90° ou un peu plus, sans que le bassin décolle.', 'Pousse la plateforme sans verrouiller brutalement les genoux en haut.'],
      ['Le bassin qui se décolle du siège et arrondit le bas du dos.', 'Les genoux qui rentrent vers l\'intérieur.', 'Le verrouillage violent des genoux en haut.'],
      ['Tempo : 2 s à la descente, poussée régulière.', 'Garde 1 à 3 reps en réserve (RIR).', 'Des pieds plus hauts sollicitent davantage fessiers et ischios, plus bas les quadriceps.']],
    [['Sit with your back and hips flat against the pad; feet shoulder-width on the platform.', 'Release the safety handles and lower the platform under control.', 'Stop when your knees are bent around 90° or a bit more, before your hips lift off the seat.', 'Press the platform away without slamming your knees into lockout.'],
      ['Hips lifting off the seat and the lower back rounding.', 'Knees caving inward.', 'Slamming the knees into lockout at the top.'],
      ['Tempo: 2 s down, smooth press.', 'Keep 1-3 reps in reserve (RIR).', 'Higher foot placement works glutes and hamstrings more, lower works quads more.']],
    [['Ga zitten met rug en heupen plat tegen de leuning; voeten schouderbreed op het platform.', 'Haal de veiligheidshendels los en laat het platform gecontroleerd zakken.', 'Stop bij ongeveer 90° knieflexie of iets meer, voordat je heupen loskomen van de zitting.', 'Duw het platform weg zonder je knieën hard te vergrendelen.'],
      ['Heupen die loskomen van de zitting waardoor de onderrug rondt.', 'Knieën die naar binnen zakken.', 'Knieën hard vergrendelen bovenaan.'],
      ['Tempo: 2 s omlaag, vloeiende duw.', 'Houd 1-3 herhalingen in reserve (RIR).', 'Hogere voetplaatsing belast bilspieren en hamstrings meer, lager de quadriceps.']]]),
  'Fentes bulgares': E('intermediaire', 'bulgarian', [
    [['Place le pied arrière, dessus du pied ou orteils, sur un banc derrière toi ; l\'autre pied à environ un grand pas devant.', 'Tiens un haltère dans chaque main, buste légèrement penché vers l\'avant.', 'Descends en fléchissant la jambe avant, genou dans l\'axe du pied.', 'Descends jusqu\'à ce que la cuisse avant approche l\'horizontale.', 'Remonte en poussant dans le talon et le milieu du pied avant.'],
      ['Le pied avant trop près du banc, ce qui projette le genou.', 'Le genou avant qui rentre vers l\'intérieur.', 'Le bassin qui bascule d\'un côté.'],
      ['Tempo : 2 s à la descente, poussée contrôlée.', 'Commence sans charge pour trouver l\'équilibre, puis ajoute des haltères.', 'Garde 1 à 3 reps en réserve (RIR) ; fais le même nombre de reps de chaque côté.']],
    [['Rest the back foot (top of the foot or toes) on a bench behind you; the other foot about one long step forward.', 'Hold a dumbbell in each hand, torso leaning slightly forward.', 'Lower by bending the front leg, knee in line with the foot.', 'Go until the front thigh is close to parallel.', 'Drive back up through the heel and mid-foot of the front leg.'],
      ['Front foot too close to the bench, pushing the knee forward.', 'Front knee caving inward.', 'Hips tilting to one side.'],
      ['Tempo: 2 s down, controlled drive.', 'Start with no weight to find balance, then add dumbbells.', 'Keep 1-3 reps in reserve (RIR); do the same number of reps on each side.']],
    [['Leg je achterste voet (wreef of tenen) op een bank achter je; de andere voet ongeveer één grote stap naar voren.', 'Houd een dumbbell in elke hand, romp licht voorover.', 'Zak door het voorste been te buigen, knie in lijn met de voet.', 'Ga tot het voorste bovenbeen bijna horizontaal is.', 'Duw omhoog via de hiel en het midden van de voorste voet.'],
      ['Voorste voet te dicht bij de bank waardoor de knie naar voren schiet.', 'Voorste knie die naar binnen zakt.', 'Heupen die opzij kantelen.'],
      ['Tempo: 2 s omlaag, gecontroleerde duw.', 'Begin zonder gewicht om balans te vinden, voeg daarna dumbbells toe.', 'Houd 1-3 herhalingen in reserve (RIR); doe aan beide kanten evenveel herhalingen.']]]),
  'Fentes marchées': E('debutant', 'lunge', [
    [['Tiens un haltère dans chaque main, debout, buste droit, regard devant.', 'Fais un grand pas en avant et pose le pied entier au sol.', 'Fléchis les deux genoux jusqu\'à ce que le genou arrière frôle le sol, genou avant dans l\'axe du pied.', 'Pousse dans le pied avant et ramène l\'autre jambe devant pour le pas suivant.'],
      ['Un pas trop court qui fait avancer le genou au-delà des orteils de façon excessive.', 'Le buste qui penche ou s\'effondre.', 'Les pas sur une ligne étroite qui font perdre l\'équilibre.'],
      ['Tempo : 2 s à la descente, poussée fluide.', 'Pieds à largeur de bassin sur deux « rails » pour rester stable.', 'Garde 1 à 3 reps en réserve (RIR) ; commence sans charge si tu débutes.']],
    [['Hold a dumbbell in each hand, standing tall, eyes forward.', 'Take a big step forward and plant the whole foot.', 'Bend both knees until the back knee almost touches the floor, front knee in line with the foot.', 'Push through the front foot and bring the back leg forward for the next step.'],
      ['A step too short, sending the knee far past the toes.', 'Leaning or collapsing through the torso.', 'Stepping on a narrow line, which hurts balance.'],
      ['Tempo: 2 s down, smooth drive.', 'Keep feet hip-width apart on two "rails" to stay stable.', 'Keep 1-3 reps in reserve (RIR); start unloaded if you are new.']],
    [['Houd een dumbbell in elke hand, sta rechtop, kijk vooruit.', 'Zet een grote stap naar voren en plaats de hele voet.', 'Buig beide knieën tot de achterste knie bijna de grond raakt, voorste knie in lijn met de voet.', 'Duw af met de voorste voet en breng het achterste been naar voren voor de volgende stap.'],
      ['Een te korte stap waardoor de knie ver voorbij de tenen komt.', 'Voorover leunen of in de romp inzakken.', 'Op één smalle lijn stappen, wat je balans verslechtert.'],
      ['Tempo: 2 s omlaag, vloeiende duw.', 'Houd je voeten heupbreed op twee "rails" voor stabiliteit.', 'Houd 1-3 herhalingen in reserve (RIR); begin zonder gewicht als je beginner bent.']]]),
  'Leg extension': E('debutant', 'legext', [
    [['Règle le dossier pour que le genou soit aligné avec l\'axe de la machine ; le coussin repose sur le bas des tibias.', 'Attrape les poignées et garde le dos contre le dossier.', 'Étends les jambes jusqu\'à presque tendre les genoux et contracte les quadriceps une seconde.', 'Redescends lentement sans laisser les plaques se reposer.'],
      ['Balancer la charge avec élan.', 'Verrouiller violemment les genoux en haut.', 'Décoller les fesses du siège.'],
      ['Tempo : 1 s en montée, 3 s en descente.', 'Idéal en fin de séance, série proche de l\'échec technique avec 1 à 2 reps en réserve (RIR).', 'Choisis une charge qui reste confortable pour les genoux.']],
    [['Adjust the backrest so your knee lines up with the machine axis; the pad sits on your lower shins.', 'Grip the handles and keep your back against the pad.', 'Extend the legs until the knees are almost straight and squeeze the quads for one second.', 'Lower slowly without letting the plates rest.'],
      ['Swinging the weight with momentum.', 'Slamming the knees into lockout.', 'Lifting the hips off the seat.'],
      ['Tempo: 1 s up, 3 s down.', 'Works well late in the session, sets near technical failure with 1-2 reps in reserve (RIR).', 'Choose a load that stays comfortable for your knees.']],
    [['Stel de rugleuning zo in dat je knie in lijn is met de as van het apparaat; het kussen ligt op je onderste scheenbenen.', 'Pak de handgrepen vast en houd je rug tegen de leuning.', 'Strek de benen tot de knieën bijna gestrekt zijn en span de quadriceps een seconde aan.', 'Laat langzaam zakken zonder de gewichten te laten rusten.'],
      ['Het gewicht met momentum omhoog zwaaien.', 'De knieën hard vergrendelen.', 'De billen van de zitting tillen.'],
      ['Tempo: 1 s omhoog, 3 s omlaag.', 'Past goed aan het einde van de training, sets dicht bij technisch falen met 1-2 herhalingen in reserve (RIR).', 'Kies een gewicht dat prettig blijft voor je knieën.']]]),
  'Soulevé de terre': E('avance', 'deadlift', [
    [['Barre au-dessus du milieu des pieds, pieds à largeur de bassin ; penche-toi en poussant le bassin vers l\'arrière et saisis la barre.', 'Dos neutre, épaules au-dessus ou légèrement devant la barre ; inspire et gaine le ventre.', 'Pousse le sol avec les jambes, la barre reste collée au corps.', 'Termine debout, bassin et genoux étendus, sans te cambrer excessivement.', 'Redescends en poussant le bassin vers l\'arrière puis en fléchissant les genoux, barre toujours proche.'],
      ['Le dos qui s\'arrondit en tirant.', 'La barre qui s\'éloigne du corps.', 'Le bassin qui monte plus vite que les épaules.'],
      ['Commence avec une charge légère pour apprendre la position.', 'Garde au moins 2 reps en réserve (RIR) : cet exercice est très exigeant.', 'Relâche complètement entre les reps ou garde une cadence régulière, au choix.']],
    [['Bar over mid-foot, feet hip-width; hinge at the hips and grip the bar.', 'Neutral back, shoulders over or slightly ahead of the bar; breathe in and brace your abs.', 'Push the floor away with your legs, keeping the bar close to your body.', 'Finish standing tall, hips and knees extended, without over-arching.', 'Lower by pushing the hips back then bending the knees, bar staying close.'],
      ['Rounding the back while pulling.', 'The bar drifting away from the body.', 'Hips rising faster than the shoulders.'],
      ['Start light to learn the position.', 'Keep at least 2 reps in reserve (RIR): this lift is very demanding.', 'Reset fully between reps or keep a steady rhythm, as you prefer.']],
    [['Stang boven het midden van je voeten, voeten heupbreed; buig vanuit de heupen en pak de stang vast.', 'Neutrale rug, schouders boven of iets voor de stang; adem in en span je buik aan.', 'Duw de vloer weg met je benen en houd de stang dicht bij je lichaam.', 'Eindig rechtop met gestrekte heupen en knieën, zonder te veel hol te staan.', 'Laat zakken door de heupen naar achteren te duwen en dan de knieën te buigen, stang dicht bij je.'],
      ['Een ronde rug tijdens het trekken.', 'De stang die van het lichaam wegdrijft.', 'Heupen die sneller omhoog gaan dan de schouders.'],
      ['Begin licht om de positie te leren.', 'Houd minstens 2 herhalingen in reserve (RIR): deze oefening is erg zwaar.', 'Reset volledig tussen herhalingen of houd een vast ritme, zoals je zelf wilt.']]]),
  'Soulevé de terre roumain': E('intermediaire', 'rdl', [
    [['Debout, barre tenue devant les cuisses, pieds à largeur de bassin, genoux légèrement fléchis.', 'Pousse le bassin vers l\'arrière en faisant glisser la barre le long des cuisses, dos neutre.', 'Descends jusqu\'à sentir l\'étirement des ischios, souvent sous les genoux ou à mi-tibia.', 'Remonte en poussant les hanches vers l\'avant et en contractant les fessiers.'],
      ['Arrondir le dos pour descendre plus bas.', 'Plier trop les genoux, ce qui en fait un squat.', 'La barre qui s\'éloigne des jambes.'],
      ['Tempo : 3 s à la descente, remontée contrôlée.', 'Le mouvement vient de la charnière des hanches, pas du bas du dos.', 'Garde 1 à 3 reps en réserve (RIR).']],
    [['Stand holding the bar in front of your thighs, feet hip-width, knees slightly bent.', 'Push the hips back, sliding the bar along your thighs, back neutral.', 'Lower until you feel the hamstrings stretch, often just below the knees or mid-shin.', 'Drive the hips forward and squeeze the glutes to stand up.'],
      ['Rounding the back to reach lower.', 'Bending the knees too much, turning it into a squat.', 'Letting the bar drift away from the legs.'],
      ['Tempo: 3 s down, controlled way up.', 'The movement comes from the hip hinge, not the lower back.', 'Keep 1-3 reps in reserve (RIR).']],
    [['Sta rechtop met de stang voor je bovenbenen, voeten heupbreed, knieën licht gebogen.', 'Duw de heupen naar achteren en laat de stang langs je bovenbenen glijden, rug neutraal.', 'Zak tot je de hamstrings voelt rekken, vaak net onder de knieën of halverwege de scheen.', 'Duw de heupen naar voren en span de bilspieren aan om omhoog te komen.'],
      ['De rug ronden om dieper te komen.', 'De knieën te veel buigen zodat het een squat wordt.', 'De stang van de benen laten wegdrijven.'],
      ['Tempo: 3 s omlaag, gecontroleerd omhoog.', 'De beweging komt uit het scharnieren van de heupen, niet uit de onderrug.', 'Houd 1-3 herhalingen in reserve (RIR).']]]),
  'Leg curl': E('debutant', 'legcurl', [
    [['Règle la machine : le genou aligné avec l\'axe, le coussin juste au-dessus des talons.', 'Allonge-toi ou assieds-toi selon la machine, hanches bien appuyées.', 'Fléchis les genoux pour amener les talons vers les fesses.', 'Marque une courte pause en haut puis redescends lentement jusqu\'à presque tendre les jambes.'],
      ['Décoller le bassin pour tricher avec le bas du dos.', 'Utiliser l\'élan.', 'Raccourcir l\'amplitude en bas.'],
      ['Tempo : 1 s en montée, 3 s en descente.', 'Garde 1 à 2 reps en réserve (RIR).', 'Les orteils tirés vers soi ou non : choisis ce qui est confortable.']],
    [['Adjust the machine: knee aligned with the axis, pad just above the heels.', 'Lie or sit depending on the machine, hips well supported.', 'Bend the knees to bring the heels toward the glutes.', 'Pause briefly at the top, then lower slowly until the legs are almost straight.'],
      ['Lifting the hips and cheating with the lower back.', 'Using momentum.', 'Cutting the range short at the bottom.'],
      ['Tempo: 1 s up, 3 s down.', 'Keep 1-2 reps in reserve (RIR).', 'Toes pulled up or not: choose what feels comfortable.']],
    [['Stel het apparaat in: knie in lijn met de as, kussen net boven de hielen.', 'Lig of zit afhankelijk van het apparaat, heupen goed ondersteund.', 'Buig de knieën om de hielen naar de billen te brengen.', 'Pauzeer kort bovenaan en laat dan langzaam zakken tot de benen bijna gestrekt zijn.'],
      ['De heupen optillen en valsspelen met de onderrug.', 'Momentum gebruiken.', 'Het bereik onderaan inkorten.'],
      ['Tempo: 1 s omhoog, 3 s omlaag.', 'Houd 1-2 herhalingen in reserve (RIR).', 'Tenen opgetrokken of niet: kies wat prettig voelt.']]]),
  'Hip thrust': E('intermediaire', 'hipthrust', [
    [['Assieds-toi au sol, haut du dos contre un banc, barre (avec coussin) sur le pli des hanches.', 'Pieds à plat, largeur de bassin, genoux fléchis à environ 90° en haut du mouvement.', 'Pousse dans les talons et monte le bassin jusqu\'à aligner épaules, hanches et genoux.', 'Contracte les fessiers en haut, menton légèrement rentré, puis redescends sans poser la charge.'],
      ['Se cambrer excessivement en haut au lieu de pousser avec les fessiers.', 'Les pieds trop proches ou trop loin des fesses.', 'Les genoux qui rentrent vers l\'intérieur.'],
      ['Tempo : montée puissante, pause 1 s en haut, descente en 2 s.', 'Garde 1 à 3 reps en réserve (RIR).', 'Utilise un tapis de barre pour le confort et une charge progressive.']],
    [['Sit on the floor with your upper back against a bench, bar (padded) across your hip crease.', 'Feet flat, hip-width, knees about 90° at the top.', 'Drive through your heels and lift the hips until shoulders, hips and knees line up.', 'Squeeze the glutes at the top, chin slightly tucked, then lower without resting the weight.'],
      ['Over-arching the lower back instead of using the glutes.', 'Feet too close to or too far from the hips.', 'Knees caving inward.'],
      ['Tempo: strong rise, 1 s pause at the top, 2 s down.', 'Keep 1-3 reps in reserve (RIR).', 'Use a bar pad for comfort and progress the load gradually.']],
    [['Zit op de grond met je bovenrug tegen een bank, stang (met kussen) over je heupplooi.', 'Voeten plat, heupbreed, knieën ongeveer 90° bovenaan.', 'Duw door je hielen en til de heupen tot schouders, heupen en knieën op één lijn staan.', 'Span de bilspieren bovenaan aan, kin licht ingetrokken, en laat dan zakken zonder het gewicht neer te leggen.'],
      ['Te veel hol staan in de onderrug in plaats van de bilspieren te gebruiken.', 'Voeten te dicht bij of te ver van de billen.', 'Knieën die naar binnen zakken.'],
      ['Tempo: krachtig omhoog, 1 s pauze bovenaan, 2 s omlaag.', 'Houd 1-3 herhalingen in reserve (RIR).', 'Gebruik een stangkussen voor comfort en bouw het gewicht geleidelijk op.']]]),
  'Mollets debout': E('debutant', 'calf', [
    [['Place les épaules sous les coussins de la machine, l\'avant des pieds sur la plateforme, talons dans le vide.', 'Genoux presque tendus, buste droit.', 'Descends les talons pour étirer les mollets.', 'Monte sur la pointe des pieds le plus haut possible et marque une pause d\'une seconde.'],
      ['Faire des mouvements courts et rapides.', 'Plier les genoux pour aider.', 'Ne pas descendre assez pour étirer le mollet.'],
      ['Tempo : 1 s en montée, 1 s de pause en haut, 2 s en descente.', 'Les mollets récupèrent vite : des séries de 10 à 20 reps conviennent bien.', 'Garde 1 à 2 reps en réserve (RIR).']],
    [['Place your shoulders under the machine pads, balls of the feet on the platform, heels hanging off.', 'Knees almost straight, torso tall.', 'Lower the heels to stretch the calves.', 'Rise onto your toes as high as you can and pause for a second.'],
      ['Using short, fast bounces.', 'Bending the knees to help.', 'Not lowering far enough to stretch the calf.'],
      ['Tempo: 1 s up, 1 s pause at the top, 2 s down.', 'Calves recover quickly: sets of 10-20 reps work well.', 'Keep 1-2 reps in reserve (RIR).']],
    [['Plaats je schouders onder de kussens, voorvoeten op het platform, hielen in de lucht.', 'Knieën bijna gestrekt, romp rechtop.', 'Laat de hielen zakken om de kuiten te rekken.', 'Kom zo hoog mogelijk op je tenen en pauzeer een seconde.'],
      ['Korte, snelle stuiterbewegingen maken.', 'De knieën buigen om te helpen.', 'Niet diep genoeg zakken om de kuit te rekken.'],
      ['Tempo: 1 s omhoog, 1 s pauze bovenaan, 2 s omlaag.', 'Kuiten herstellen snel: sets van 10-20 herhalingen werken goed.', 'Houd 1-2 herhalingen in reserve (RIR).']]]),
  'Mollets assis': E('debutant', 'calfseat', [
    [['Assieds-toi, coussin sur le bas des cuisses, l\'avant des pieds sur la plateforme.', 'Déverrouille la machine et laisse les talons descendre pour étirer les mollets.', 'Pousse sur l\'avant des pieds pour monter les talons le plus haut possible.', 'Marque une pause en haut puis redescends lentement.'],
      ['Utiliser l\'élan avec des rebonds.', 'Réduire l\'amplitude.', 'Pousser avec les côtés ou l\'extérieur du pied uniquement.'],
      ['Tempo : 1 s en montée, 1 s de pause en haut, 2 s en descente.', 'Genou fléchi : ce sont surtout les muscles profonds du mollet qui travaillent.', 'Garde 1 à 2 reps en réserve (RIR).']],
    [['Sit with the pad on your lower thighs, balls of the feet on the platform.', 'Release the machine and let your heels drop to stretch the calves.', 'Press through the front of the feet to raise the heels as high as possible.', 'Pause at the top, then lower slowly.'],
      ['Bouncing with momentum.', 'Cutting the range short.', 'Pushing only through the outer edge of the foot.'],
      ['Tempo: 1 s up, 1 s pause at the top, 2 s down.', 'With bent knees, the deeper calf muscle does more of the work.', 'Keep 1-2 reps in reserve (RIR).']],
    [['Ga zitten met het kussen op je onderste bovenbenen, voorvoeten op het platform.', 'Ontgrendel het apparaat en laat de hielen zakken om de kuiten te rekken.', 'Duw door de voorvoet om de hielen zo hoog mogelijk te tillen.', 'Pauzeer bovenaan en laat dan langzaam zakken.'],
      ['Stuiteren met momentum.', 'Het bereik inkorten.', 'Alleen via de buitenkant van de voet duwen.'],
      ['Tempo: 1 s omhoog, 1 s pauze bovenaan, 2 s omlaag.', 'Met gebogen knieën doet de diepere kuitspier meer van het werk.', 'Houd 1-2 herhalingen in reserve (RIR).']]]),
  'Développé couché': E('intermediaire', 'bench', [
    [['Allonge-toi, yeux sous la barre, pieds à plat au sol, omoplates serrées et légèrement vers le bas.', 'Prise un peu plus large que les épaules ; décroche la barre bras tendus.', 'Descends la barre en contrôle vers le bas des pectoraux, avant-bras proches de la verticale.', 'Pousse la barre vers le haut, en gardant les fesses sur le banc et les pieds ancrés.'],
      ['Les fesses qui décollent du banc.', 'Les coudes trop écartés à 90° du corps.', 'Rebondir la barre sur la poitrine.'],
      ['Tempo : 2 s à la descente, poussée puissante.', 'Garde 1 à 3 reps en réserve (RIR) ; demande un pareur ou utilise une cage de sécurité pour les charges lourdes.', 'Garde les poignets droits, dans le prolongement des avant-bras.']],
    [['Lie down with eyes under the bar, feet flat, shoulder blades pinched and slightly down.', 'Grip a little wider than shoulders; unrack with straight arms.', 'Lower the bar under control to the lower chest, forearms near vertical.', 'Press the bar up, keeping the hips on the bench and feet planted.'],
      ['Hips lifting off the bench.', 'Elbows flared out at 90° from the body.', 'Bouncing the bar off the chest.'],
      ['Tempo: 2 s down, strong press.', 'Keep 1-3 reps in reserve (RIR); use a spotter or safety rack for heavy loads.', 'Keep the wrists straight, stacked over the forearms.']],
    [['Ga liggen met je ogen onder de stang, voeten plat, schouderbladen samengeknepen en licht naar beneden.', 'Greep iets breder dan de schouders; haal de stang met gestrekte armen van het rek.', 'Laat de stang gecontroleerd zakken naar de onderkant van de borst, onderarmen bijna verticaal.', 'Duw de stang omhoog, billen op de bank en voeten stevig geplant.'],
      ['Billen die van de bank komen.', 'Ellebogen die 90° van het lichaam wegwijzen.', 'De stang van de borst laten stuiteren.'],
      ['Tempo: 2 s omlaag, krachtige duw.', 'Houd 1-3 herhalingen in reserve (RIR); gebruik een spotter of veiligheidsrek bij zware gewichten.', 'Houd de polsen recht, in het verlengde van de onderarmen.']]]),
  'Développé couché haltères': E('debutant', 'dbbench', [
    [['Assieds-toi avec les haltères sur les cuisses, puis allonge-toi en les montant à hauteur de poitrine.', 'Omoplates serrées, pieds à plat, haltères au-dessus des épaules, bras tendus.', 'Descends en contrôle, coudes à environ 45–60° du corps, jusqu\'à sentir l\'étirement des pectoraux.', 'Pousse les haltères vers le haut en les rapprochant légèrement.'],
      ['Descendre trop bas en forçant sur les épaules.', 'Des coudes complètement écartés.', 'Des haltères qui partent dans des trajectoires différentes.'],
      ['Tempo : 2 s à la descente, poussée régulière.', 'Garde 1 à 3 reps en réserve (RIR).', 'Pour poser les haltères, ramène-les sur les cuisses puis assieds-toi.']],
    [['Sit with the dumbbells on your thighs, then lie back and bring them to chest level.', 'Shoulder blades pinched, feet flat, dumbbells over the shoulders, arms straight.', 'Lower under control with elbows at about 45-60° from the body until you feel a chest stretch.', 'Press up, bringing the dumbbells slightly together.'],
      ['Going too low and straining the shoulders.', 'Elbows flared fully out.', 'Dumbbells following different paths.'],
      ['Tempo: 2 s down, smooth press.', 'Keep 1-3 reps in reserve (RIR).', 'To finish, bring the dumbbells back to your thighs, then sit up.']],
    [['Ga zitten met de dumbbells op je bovenbenen, leun dan achterover en breng ze naar borsthoogte.', 'Schouderbladen samengeknepen, voeten plat, dumbbells boven de schouders, armen gestrekt.', 'Laat gecontroleerd zakken met ellebogen op ongeveer 45-60° van het lichaam tot je een rek in de borst voelt.', 'Duw omhoog en breng de dumbbells licht naar elkaar toe.'],
      ['Te diep zakken en de schouders belasten.', 'Ellebogen volledig naar buiten.', 'Dumbbells die verschillende banen volgen.'],
      ['Tempo: 2 s omlaag, vloeiende duw.', 'Houd 1-3 herhalingen in reserve (RIR).', 'Breng de dumbbells na afloop terug naar je bovenbenen en ga dan zitten.']]]),
  'Développé incliné haltères': E('intermediaire', 'incline', [
    [['Règle le banc entre 30° et 45°, assieds-toi avec les haltères sur les cuisses puis allonge-toi.', 'Omoplates serrées, haltères à hauteur de haut de poitrine, bras tendus au départ.', 'Descends en contrôle, coudes à environ 45–60° du corps.', 'Pousse vers le haut en gardant les poignets droits.'],
      ['Un banc trop incliné qui transforme le mouvement en développé d\'épaules.', 'Le dos qui se cambre fortement.', 'Les épaules qui montent vers les oreilles.'],
      ['Tempo : 2 s à la descente, poussée contrôlée.', 'Garde 1 à 3 reps en réserve (RIR).', 'Une inclinaison de 30° suffit souvent à cibler le haut des pectoraux.']],
    [['Set the bench to 30-45°, sit with the dumbbells on your thighs, then lie back.', 'Shoulder blades pinched, dumbbells at upper-chest level, arms straight to start.', 'Lower under control with elbows at about 45-60° from the body.', 'Press up keeping the wrists straight.'],
      ['A bench too steep, turning it into a shoulder press.', 'Strongly arching the back.', 'Shoulders shrugging toward the ears.'],
      ['Tempo: 2 s down, controlled press.', 'Keep 1-3 reps in reserve (RIR).', 'A 30° angle is often enough to target the upper chest.']],
    [['Stel de bank in op 30-45°, ga zitten met de dumbbells op je bovenbenen en leun dan achterover.', 'Schouderbladen samengeknepen, dumbbells op bovenborsthoogte, armen aan het begin gestrekt.', 'Laat gecontroleerd zakken met ellebogen op ongeveer 45-60° van het lichaam.', 'Duw omhoog met rechte polsen.'],
      ['Een te steile bank waardoor het een schouderpress wordt.', 'De rug sterk hol trekken.', 'Schouders die richting de oren omhoog gaan.'],
      ['Tempo: 2 s omlaag, gecontroleerde duw.', 'Houd 1-3 herhalingen in reserve (RIR).', 'Een hoek van 30° is vaak genoeg voor de bovenborst.']]]),
  'Écarté poulie': E('intermediaire', 'cablefly', [
    [['Règle les poulies à hauteur d\'épaules ou plus haut, saisis une poignée dans chaque main et avance d\'un pas.', 'Buste légèrement incliné, coudes légèrement fléchis, pieds en fente stable.', 'Ramène les mains devant la poitrine en arc de cercle, comme pour serrer quelqu\'un dans les bras.', 'Marque une pause en contractant les pectoraux, puis reviens lentement en contrôlant l\'étirement.'],
      ['Plier et tendre les coudes comme pour un développé.', 'Utiliser l\'élan du corps.', 'Étirer trop loin en arrière avec les épaules en avant.'],
      ['Tempo : 1 s en fermeture, 3 s en retour.', 'Une charge modérée suffit : c\'est un exercice d\'isolation.', 'Garde 1 à 3 reps en réserve (RIR).']],
    [['Set the pulleys at shoulder height or higher, grab one handle in each hand and step forward.', 'Slight forward lean, elbows slightly bent, feet in a stable split stance.', 'Bring the hands together in front of the chest in an arc, as if hugging someone.', 'Pause while squeezing the chest, then return slowly while controlling the stretch.'],
      ['Bending and straightening the elbows like a press.', 'Using body momentum.', 'Stretching too far back with the shoulders rolled forward.'],
      ['Tempo: 1 s closing, 3 s returning.', 'A moderate load is enough: this is an isolation exercise.', 'Keep 1-3 reps in reserve (RIR).']],
    [['Stel de katrollen op schouderhoogte of hoger in, pak in elke hand een handgreep en stap naar voren.', 'Romp licht voorovergebogen, ellebogen licht gebogen, voeten in een stabiele spreidstand.', 'Breng de handen in een boog voor je borst bij elkaar, alsof je iemand omhelst.', 'Pauzeer terwijl je de borst aanspant en keer dan langzaam terug terwijl je de rek beheerst.'],
      ['De ellebogen buigen en strekken als bij een press.', 'Momentum van het lichaam gebruiken.', 'Te ver naar achteren rekken met naar voren gerolde schouders.'],
      ['Tempo: 1 s sluiten, 3 s terugkeren.', 'Een matig gewicht is genoeg: dit is een isolatieoefening.', 'Houd 1-3 herhalingen in reserve (RIR).']]]),
  'Pompes': E('debutant', 'pushup', [
    [['Mains au sol un peu plus larges que les épaules, bras tendus, corps aligné de la tête aux talons.', 'Gaine le ventre et les fessiers.', 'Descends la poitrine vers le sol, coudes à environ 45° du corps.', 'Pousse le sol pour revenir bras tendus, sans cambrer.'],
      ['Le bassin qui s\'affaisse ou monte trop haut.', 'Les coudes complètement écartés.', 'Une amplitude trop courte.'],
      ['Tempo : 2 s à la descente, poussée contrôlée.', 'Trop dur ? Pose les mains sur un support surélevé ou les genoux au sol.', 'Arrête la série quand la forme se dégrade, avec 1 à 2 reps en réserve (RIR).']],
    [['Hands on the floor slightly wider than shoulders, arms straight, body in one line from head to heels.', 'Brace your abs and glutes.', 'Lower the chest toward the floor, elbows at about 45° from the body.', 'Push the floor away to return to straight arms without arching.'],
      ['Hips sagging or piking up.', 'Elbows flared fully out.', 'Too short a range of motion.'],
      ['Tempo: 2 s down, controlled push.', 'Too hard? Put your hands on a raised surface or your knees on the floor.', 'End the set when form breaks down, with 1-2 reps in reserve (RIR).']],
    [['Handen op de grond iets breder dan de schouders, armen gestrekt, lichaam in één lijn van hoofd tot hielen.', 'Span buik en billen aan.', 'Laat de borst naar de grond zakken, ellebogen op ongeveer 45° van het lichaam.', 'Duw de grond weg tot gestrekte armen zonder hol te staan.'],
      ['Heupen die doorzakken of te hoog komen.', 'Ellebogen volledig naar buiten.', 'Een te klein bewegingsbereik.'],
      ['Tempo: 2 s omlaag, gecontroleerde duw.', 'Te zwaar? Zet je handen op een verhoging of je knieën op de grond.', 'Stop de set als je vorm verslechtert, met 1-2 herhalingen in reserve (RIR).']]]),
  'Dips': E('avance', 'dips', [
    [['Saisis les barres parallèles, bras tendus, épaules basses, jambes fléchies derrière toi.', 'Penche légèrement le buste vers l\'avant pour solliciter les pectoraux, ou reste vertical pour les triceps.', 'Descends en fléchissant les coudes jusqu\'à environ 90° ou jusqu\'à une amplitude sans gêne à l\'épaule.', 'Pousse pour remonter, bras presque tendus.'],
      ['Descendre trop bas en forçant sur l\'épaule.', 'Les épaules qui montent vers les oreilles.', 'Balancer le corps pour prendre de l\'élan.'],
      ['Tempo : 2 s à la descente, poussée contrôlée.', 'Maîtrise d\'abord ton poids du corps avec les dips assistés avant d\'ajouter une charge.', 'Arrête en cas de gêne à l\'épaule ; garde 1 à 2 reps en réserve (RIR).']],
    [['Grip the parallel bars with straight arms, shoulders down, legs bent behind you.', 'Lean the torso slightly forward to emphasise the chest, or stay upright for the triceps.', 'Lower by bending the elbows to about 90°, or to a range your shoulder tolerates comfortably.', 'Press back up until the arms are almost straight.'],
      ['Going too low and straining the shoulder.', 'Shoulders shrugging toward the ears.', 'Swinging the body for momentum.'],
      ['Tempo: 2 s down, controlled press.', 'Master your bodyweight with assisted dips before adding load.', 'Stop if the shoulder is uncomfortable; keep 1-2 reps in reserve (RIR).']],
    [['Pak de dipstangen vast met gestrekte armen, schouders laag, benen gebogen achter je.', 'Leun de romp licht voorover voor meer borst, of blijf rechtop voor meer triceps.', 'Zak door de ellebogen te buigen tot ongeveer 90°, of tot een bereik dat je schouder prettig verdraagt.', 'Duw omhoog tot de armen bijna gestrekt zijn.'],
      ['Te diep zakken en de schouder belasten.', 'Schouders die richting de oren omhoog gaan.', 'Het lichaam heen en weer zwaaien voor momentum.'],
      ['Tempo: 2 s omlaag, gecontroleerde duw.', 'Beheers eerst je lichaamsgewicht met begeleide dips voordat je gewicht toevoegt.', 'Stop bij ongemak in de schouder; houd 1-2 herhalingen in reserve (RIR).']]]),
  'Dips assistés': E('debutant', 'dipsassist', [
    [['Règle l\'assistance de la machine (plus de contrepoids = plus facile), monte et saisis les poignées.', 'Épaules basses, buste légèrement penché vers l\'avant.', 'Descends en fléchissant les coudes jusqu\'à environ 90°.', 'Pousse pour remonter, sans verrouiller brutalement les coudes.'],
      ['Descendre trop bas en forçant sur l\'épaule.', 'Lever les épaules vers les oreilles.', 'Utiliser trop d\'assistance pour toujours.'],
      ['Tempo : 2 s à la descente, poussée régulière.', 'Réduis l\'assistance progressivement quand 3 séries propres deviennent faciles.', 'Garde 1 à 2 reps en réserve (RIR).']],
    [['Set the machine assistance (more counterweight = easier), step on and grip the handles.', 'Shoulders down, torso leaning slightly forward.', 'Lower by bending the elbows to about 90°.', 'Press up without slamming the elbows into lockout.'],
      ['Going too low and straining the shoulder.', 'Shrugging the shoulders to the ears.', 'Staying on heavy assistance forever.'],
      ['Tempo: 2 s down, smooth press.', 'Reduce the assistance gradually once 3 clean sets feel easy.', 'Keep 1-2 reps in reserve (RIR).']],
    [['Stel de assistentie van het apparaat in (meer tegengewicht = makkelijker), stap erop en pak de handgrepen.', 'Schouders laag, romp licht voorover.', 'Zak door de ellebogen te buigen tot ongeveer 90°.', 'Duw omhoog zonder de ellebogen hard te vergrendelen.'],
      ['Te diep zakken en de schouder belasten.', 'De schouders naar de oren optrekken.', 'Voor altijd op veel assistentie blijven.'],
      ['Tempo: 2 s omlaag, vloeiende duw.', 'Verminder de assistentie geleidelijk zodra 3 schone sets makkelijk voelen.', 'Houd 1-2 herhalingen in reserve (RIR).']]]),
  'Tractions': E('avance', 'pullup', [
    [['Saisis la barre un peu plus large que les épaules, paumes vers l\'avant, bras tendus.', 'Descends les omoplates et gaine le ventre.', 'Tire les coudes vers le bas et les hanches pour amener le menton au-dessus de la barre.', 'Redescends en contrôle jusqu\'à bras presque tendus.'],
      ['Balancer le corps pour prendre de l\'élan (kipping).', 'Les épaules qui montent vers les oreilles au lieu de tirer avec le dos.', 'Une amplitude partielle en bas.'],
      ['Tempo : 1 s en montée, 3 s en descente.', 'Pas encore possible ? Passe par les tractions assistées ou le tirage vertical.', 'Garde 1 à 2 reps en réserve (RIR).']],
    [['Grip the bar slightly wider than shoulders, palms facing forward, arms straight.', 'Pull the shoulder blades down and brace your abs.', 'Drive the elbows down toward the hips to bring the chin above the bar.', 'Lower under control until the arms are almost straight.'],
      ['Swinging the body for momentum (kipping).', 'Shrugging toward the ears instead of pulling with the back.', 'Stopping short at the bottom.'],
      ['Tempo: 1 s up, 3 s down.', 'Not possible yet? Use assisted pull-ups or the lat pulldown.', 'Keep 1-2 reps in reserve (RIR).']],
    [['Pak de stang iets breder dan schouderbreed, handpalmen naar voren, armen gestrekt.', 'Trek de schouderbladen naar beneden en span je buik aan.', 'Trek de ellebogen naar de heupen om de kin boven de stang te brengen.', 'Laat gecontroleerd zakken tot de armen bijna gestrekt zijn.'],
      ['Het lichaam zwaaien voor momentum (kipping).', 'De schouders naar de oren optrekken in plaats van met de rug te trekken.', 'Onderaan niet volledig zakken.'],
      ['Tempo: 1 s omhoog, 3 s omlaag.', 'Nog niet mogelijk? Gebruik begeleide optrekkers of de lat pulldown.', 'Houd 1-2 herhalingen in reserve (RIR).']]]),
  'Tractions assistées': E('debutant', 'pullupassist', [
    [['Règle l\'assistance (plus de contrepoids = plus facile), place genoux ou pieds sur le support.', 'Saisis les poignées, bras tendus, omoplates basses.', 'Tire les coudes vers le bas pour amener le menton au niveau de la barre.', 'Redescends lentement, bras presque tendus.'],
      ['Utiliser l\'élan.', 'Hausser les épaules vers les oreilles.', 'Trop d\'assistance qui rend la série trop facile.'],
      ['Tempo : 1 s en montée, 3 s en descente.', 'Réduis l\'assistance progressivement.', 'Garde 1 à 2 reps en réserve (RIR).']],
    [['Set the assistance (more counterweight = easier), place knees or feet on the support.', 'Grip the handles with straight arms, shoulder blades down.', 'Drive the elbows down to bring the chin to bar level.', 'Lower slowly until the arms are almost straight.'],
      ['Using momentum.', 'Shrugging the shoulders to the ears.', 'Too much assistance, making the set too easy.'],
      ['Tempo: 1 s up, 3 s down.', 'Reduce the assistance gradually.', 'Keep 1-2 reps in reserve (RIR).']],
    [['Stel de assistentie in (meer tegengewicht = makkelijker), zet knieën of voeten op de steun.', 'Pak de handgrepen met gestrekte armen, schouderbladen laag.', 'Trek de ellebogen omlaag om de kin op stanghoogte te brengen.', 'Laat langzaam zakken tot de armen bijna gestrekt zijn.'],
      ['Momentum gebruiken.', 'De schouders naar de oren optrekken.', 'Te veel assistentie waardoor de set te makkelijk wordt.'],
      ['Tempo: 1 s omhoog, 3 s omlaag.', 'Verminder de assistentie geleidelijk.', 'Houd 1-2 herhalingen in reserve (RIR).']]]),
  'Tractions / tirage vertical': E('intermediaire', 'pullup', [
    [['Choisis la variante adaptée : tractions à la barre si tu en fais, sinon tirage vertical à la poulie.', 'Prise un peu plus large que les épaules, omoplates basses, ventre gainé.', 'Tire les coudes vers le bas et les hanches jusqu\'à ce que la barre arrive au niveau du menton ou du haut de la poitrine.', 'Remonte lentement, bras presque tendus.'],
      ['Se pencher en arrière et tirer avec l\'élan.', 'Hausser les épaules.', 'Une amplitude trop courte.'],
      ['Tempo : 1 s en tirant, 3 s en revenant.', 'Passe à la version suivante quand tu fais 12 reps propres.', 'Garde 1 à 2 reps en réserve (RIR).']],
    [['Pick the variation that fits: bar pull-ups if you can do them, otherwise the cable lat pulldown.', 'Grip slightly wider than shoulders, shoulder blades down, abs braced.', 'Drive the elbows down toward the hips until the bar reaches chin or upper-chest level.', 'Return slowly with the arms almost straight.'],
      ['Leaning back and pulling with momentum.', 'Shrugging the shoulders.', 'Too short a range of motion.'],
      ['Tempo: 1 s pulling, 3 s returning.', 'Progress to the harder version once you get 12 clean reps.', 'Keep 1-2 reps in reserve (RIR).']],
    [['Kies de passende variant: optrekken aan de stang als je dat kunt, anders de lat pulldown aan de kabel.', 'Greep iets breder dan de schouders, schouderbladen laag, buik aangespannen.', 'Trek de ellebogen naar de heupen tot de stang kin- of bovenborsthoogte bereikt.', 'Keer langzaam terug met bijna gestrekte armen.'],
      ['Achterover leunen en met momentum trekken.', 'De schouders optrekken.', 'Een te klein bewegingsbereik.'],
      ['Tempo: 1 s trekken, 3 s terugkeren.', 'Ga naar de zwaardere variant zodra je 12 schone herhalingen haalt.', 'Houd 1-2 herhalingen in reserve (RIR).']]]),
  'Tirage vertical': E('debutant', 'pulldown', [
    [['Règle le coussin sur les cuisses, saisis la barre un peu plus large que les épaules.', 'Penche légèrement le buste en arrière, poitrine sortie.', 'Tire la barre vers le haut de la poitrine en amenant les coudes vers le bas et l\'arrière.', 'Remonte la barre en contrôle jusqu\'à bras presque tendus.'],
      ['Se pencher trop en arrière pour tirer avec l\'élan.', 'Tirer la barre derrière la nuque.', 'Hausser les épaules.'],
      ['Tempo : 1 s en tirant, 3 s en remontant.', 'Pense à tirer avec les coudes plutôt qu\'avec les mains.', 'Garde 1 à 3 reps en réserve (RIR).']],
    [['Adjust the thigh pad and grip the bar slightly wider than shoulders.', 'Lean the torso back slightly with the chest up.', 'Pull the bar to the upper chest, driving the elbows down and back.', 'Return the bar under control until the arms are almost straight.'],
      ['Leaning back too far and using momentum.', 'Pulling the bar behind the neck.', 'Shrugging the shoulders.'],
      ['Tempo: 1 s pulling, 3 s returning.', 'Think of pulling with the elbows rather than the hands.', 'Keep 1-3 reps in reserve (RIR).']],
    [['Stel het dijkussen in en pak de stang iets breder dan schouderbreed.', 'Leun de romp licht achterover met de borst vooruit.', 'Trek de stang naar de bovenborst en breng de ellebogen omlaag en naar achteren.', 'Laat de stang gecontroleerd terugkeren tot de armen bijna gestrekt zijn.'],
      ['Te ver achterover leunen en momentum gebruiken.', 'De stang achter de nek trekken.', 'De schouders optrekken.'],
      ['Tempo: 1 s trekken, 3 s terugkeren.', 'Denk eraan met de ellebogen te trekken in plaats van met de handen.', 'Houd 1-3 herhalingen in reserve (RIR).']]]),
  'Rowing barre': E('intermediaire', 'row', [
    [['Barre devant toi, pieds à largeur de bassin ; penche le buste à environ 45° avec le dos neutre et les genoux fléchis.', 'Bras tendus sous les épaules, ventre gainé.', 'Tire la barre vers le bas du ventre en ramenant les coudes vers l\'arrière.', 'Marque une pause, serre les omoplates, puis redescends lentement.'],
      ['Arrondir le dos ou se redresser à chaque rep.', 'Tirer avec les biceps et les épaules uniquement.', 'Utiliser l\'élan du bassin.'],
      ['Tempo : 1 s en tirant, 2 à 3 s en descendant.', 'Si le dos fatigue, passe au rowing haltère à une main ou à la poulie.', 'Garde 1 à 3 reps en réserve (RIR).']],
    [['Bar in front, feet hip-width; hinge the torso to about 45° with a neutral back and bent knees.', 'Arms straight beneath the shoulders, abs braced.', 'Row the bar toward the lower belly by driving the elbows back.', 'Pause, squeeze the shoulder blades, then lower slowly.'],
      ['Rounding the back or standing up a little on each rep.', 'Pulling only with the biceps and shoulders.', 'Using hip momentum.'],
      ['Tempo: 1 s pulling, 2-3 s lowering.', 'If the lower back tires, switch to the one-arm dumbbell row or cable row.', 'Keep 1-3 reps in reserve (RIR).']],
    [['Stang voor je, voeten heupbreed; buig de romp naar ongeveer 45° met een neutrale rug en gebogen knieën.', 'Armen gestrekt onder de schouders, buik aangespannen.', 'Trek de stang naar de onderbuik door de ellebogen naar achteren te brengen.', 'Pauzeer, knijp de schouderbladen samen en laat dan langzaam zakken.'],
      ['De rug ronden of bij elke herhaling iets rechterop komen.', 'Alleen met biceps en schouders trekken.', 'Momentum uit de heupen gebruiken.'],
      ['Tempo: 1 s trekken, 2-3 s zakken.', 'Als je onderrug moe wordt, kies dan de eenarmige dumbbellrow of kabelrow.', 'Houd 1-3 herhalingen in reserve (RIR).']]]),
  'Rowing haltère': E('debutant', 'dbrow', [
    [['Pose un genou et une main sur un banc, dos plat et parallèle au sol, haltère dans l\'autre main, bras tendu.', 'Ventre gainé, nuque dans le prolongement du dos.', 'Tire l\'haltère vers la hanche en menant avec le coude.', 'Marque une pause, puis redescends lentement jusqu\'à bras tendu.'],
      ['Faire tourner le buste pour soulever plus lourd.', 'Tirer vers l\'épaule avec le biceps.', 'Arrondir le dos.'],
      ['Tempo : 1 s en tirant, 3 s en descendant.', 'Fais le même nombre de reps des deux côtés.', 'Garde 1 à 3 reps en réserve (RIR).']],
    [['Place one knee and hand on a bench, back flat and parallel to the floor, dumbbell in the other hand with the arm straight.', 'Abs braced, neck in line with the back.', 'Row the dumbbell toward the hip, leading with the elbow.', 'Pause, then lower slowly until the arm is straight.'],
      ['Twisting the torso to lift heavier.', 'Pulling toward the shoulder using the biceps.', 'Rounding the back.'],
      ['Tempo: 1 s pulling, 3 s lowering.', 'Do the same number of reps on both sides.', 'Keep 1-3 reps in reserve (RIR).']],
    [['Zet één knie en één hand op een bank, rug plat en parallel aan de grond, dumbbell in de andere hand met gestrekte arm.', 'Buik aangespannen, nek in het verlengde van de rug.', 'Trek de dumbbell naar de heup en leid met de elleboog.', 'Pauzeer en laat dan langzaam zakken tot de arm gestrekt is.'],
      ['De romp draaien om zwaarder te tillen.', 'Naar de schouder trekken met de biceps.', 'De rug ronden.'],
      ['Tempo: 1 s trekken, 3 s zakken.', 'Doe aan beide kanten evenveel herhalingen.', 'Houd 1-3 herhalingen in reserve (RIR).']]]),
  'Tirage horizontal': E('debutant', 'cablerow', [
    [['Assieds-toi, pieds sur les appuis, genoux légèrement fléchis, dos droit et poitrine sortie.', 'Saisis la poignée, bras tendus, épaules basses.', 'Tire la poignée vers le bas du ventre en ramenant les coudes le long du corps.', 'Serre les omoplates une seconde, puis reviens lentement sans t\'arrondir.'],
      ['Se pencher en avant et en arrière avec l\'élan.', 'Hausser les épaules.', 'Tirer uniquement avec les bras.'],
      ['Tempo : 1 s en tirant, 3 s en revenant.', 'Garde le buste presque immobile.', 'Garde 1 à 3 reps en réserve (RIR).']],
    [['Sit with your feet on the supports, knees slightly bent, back straight and chest up.', 'Grip the handle with straight arms, shoulders down.', 'Pull the handle toward the lower belly, keeping the elbows close to your body.', 'Squeeze the shoulder blades for a second, then return slowly without rounding.'],
      ['Rocking forward and back with momentum.', 'Shrugging the shoulders.', 'Pulling only with the arms.'],
      ['Tempo: 1 s pulling, 3 s returning.', 'Keep the torso almost still.', 'Keep 1-3 reps in reserve (RIR).']],
    [['Ga zitten met je voeten op de steunen, knieën licht gebogen, rug recht en borst vooruit.', 'Pak de handgreep met gestrekte armen, schouders laag.', 'Trek de handgreep naar de onderbuik en houd de ellebogen dicht bij je lichaam.', 'Knijp de schouderbladen een seconde samen en keer dan langzaam terug zonder te ronden.'],
      ['Met momentum voor- en achterover wiegen.', 'De schouders optrekken.', 'Alleen met de armen trekken.'],
      ['Tempo: 1 s trekken, 3 s terugkeren.', 'Houd de romp bijna stil.', 'Houd 1-3 herhalingen in reserve (RIR).']]]),
  'Développé militaire': E('intermediaire', 'ohp', [
    [['Debout, barre à hauteur des clavicules, mains un peu plus larges que les épaules, coudes légèrement devant la barre.', 'Fessiers et ventre gainés, jambes tendues sans verrouiller les genoux.', 'Pousse la barre à la verticale en passant la tête légèrement en arrière puis en avant.', 'Termine bras tendus au-dessus de la tête, puis redescends en contrôle.'],
      ['Se cambrer fortement pour aider la poussée.', 'La barre qui part vers l\'avant.', 'Pousser avec les jambes (c\'est un autre mouvement).'],
      ['Tempo : poussée puissante, descente en 2 s.', 'Si les épaules sont raides ou gênées, essaie la version avec haltères.', 'Garde 1 à 3 reps en réserve (RIR).']],
    [['Stand with the bar at collarbone height, hands slightly wider than shoulders, elbows just in front of the bar.', 'Squeeze glutes and abs, legs straight without locking the knees.', 'Press the bar vertically, moving the head slightly back then forward.', 'Finish with arms straight overhead, then lower under control.'],
      ['Leaning back strongly to help the press.', 'The bar drifting forward.', 'Pushing with the legs (a different lift).'],
      ['Tempo: strong press, 2 s lowering.', 'If your shoulders feel stiff or uncomfortable, try the dumbbell version.', 'Keep 1-3 reps in reserve (RIR).']],
    [['Sta rechtop met de stang op sleutelbeenhoogte, handen iets breder dan de schouders, ellebogen net voor de stang.', 'Span bilspieren en buik aan, benen gestrekt zonder de knieën te vergrendelen.', 'Duw de stang verticaal omhoog en beweeg je hoofd licht naar achteren en dan weer naar voren.', 'Eindig met gestrekte armen boven je hoofd en laat dan gecontroleerd zakken.'],
      ['Sterk hol staan om de duw te helpen.', 'De stang die naar voren drijft.', 'Met de benen meeduwen (een andere oefening).'],
      ['Tempo: krachtige duw, 2 s zakken.', 'Als je schouders stijf of onprettig voelen, probeer dan de dumbbellvariant.', 'Houd 1-3 herhalingen in reserve (RIR).']]]),
  'Développé épaules haltères': E('debutant', 'dbohp', [
    [['Assieds-toi dossier droit (ou debout), haltères à hauteur d\'épaules, coudes légèrement devant le corps.', 'Gaine le ventre, poitrine sortie.', 'Pousse les haltères vers le haut jusqu\'à bras presque tendus, sans les cogner.', 'Redescends lentement jusqu\'à hauteur d\'épaules ou d\'oreilles.'],
      ['Cambrer le dos pour pousser.', 'Les coudes trop écartés dans le plan du dos.', 'Un mouvement trop rapide en bas.'],
      ['Tempo : 1 s en poussant, 2 à 3 s en descendant.', 'Garde 1 à 3 reps en réserve (RIR).', 'Avec un dossier légèrement incliné, le dos est souvent plus confortable.']],
    [['Sit with the backrest upright (or stand), dumbbells at shoulder height, elbows slightly in front of the body.', 'Brace the abs, chest up.', 'Press the dumbbells up until the arms are almost straight, without clanging them.', 'Lower slowly to shoulder or ear height.'],
      ['Arching the back to press.', 'Elbows flared straight out to the sides.', 'Dropping too fast at the bottom.'],
      ['Tempo: 1 s pressing, 2-3 s lowering.', 'Keep 1-3 reps in reserve (RIR).', 'A slightly reclined backrest is often more comfortable for the back.']],
    [['Ga zitten met rechte rugleuning (of sta), dumbbells op schouderhoogte, ellebogen iets voor het lichaam.', 'Span de buik aan, borst vooruit.', 'Duw de dumbbells omhoog tot de armen bijna gestrekt zijn, zonder ze tegen elkaar te slaan.', 'Laat langzaam zakken tot schouder- of oorhoogte.'],
      ['De rug hol trekken om te duwen.', 'Ellebogen recht naar de zijkant.', 'Onderaan te snel laten vallen.'],
      ['Tempo: 1 s duwen, 2-3 s zakken.', 'Houd 1-3 herhalingen in reserve (RIR).', 'Een licht achterover geleunde rugleuning is vaak prettiger voor de rug.']]]),
  'Élévations latérales': E('debutant', 'lateral', [
    [['Debout, un haltère léger dans chaque main le long du corps, légère flexion des genoux.', 'Coudes légèrement fléchis, buste droit.', 'Lève les bras sur les côtés jusqu\'à hauteur d\'épaules, coudes menant le mouvement.', 'Marque une courte pause, puis redescends lentement.'],
      ['Balancer le buste pour monter la charge.', 'Hausser les épaules (trapèzes).', 'Lever les mains plus haut que les coudes.'],
      ['Tempo : 1 s en montée, 3 s en descente.', 'Une charge légère suffit : privilégie la technique.', 'Séries de 12 à 20 reps avec 1 à 2 reps en réserve (RIR).']],
    [['Stand with a light dumbbell in each hand at your sides, knees slightly bent.', 'Elbows slightly bent, torso upright.', 'Raise the arms out to the sides to shoulder height, elbows leading the movement.', 'Pause briefly, then lower slowly.'],
      ['Swinging the torso to lift the weight.', 'Shrugging (trapezius takes over).', 'Lifting the hands higher than the elbows.'],
      ['Tempo: 1 s up, 3 s down.', 'A light weight is enough: prioritise technique.', 'Sets of 12-20 reps with 1-2 reps in reserve (RIR).']],
    [['Sta rechtop met een lichte dumbbell in elke hand langs je lichaam, knieën licht gebogen.', 'Ellebogen licht gebogen, romp rechtop.', 'Til de armen zijwaarts tot schouderhoogte, ellebogen leiden de beweging.', 'Pauzeer kort en laat dan langzaam zakken.'],
      ['De romp zwaaien om het gewicht omhoog te krijgen.', 'De schouders optrekken (trapezius neemt over).', 'De handen hoger tillen dan de ellebogen.'],
      ['Tempo: 1 s omhoog, 3 s omlaag.', 'Een licht gewicht is genoeg: geef voorrang aan techniek.', 'Sets van 12-20 herhalingen met 1-2 herhalingen in reserve (RIR).']]]),
  'Face pull': E('debutant', 'facepull', [
    [['Règle la poulie à hauteur du visage avec une corde, saisis-la paumes face à face et recule d\'un pas.', 'Bras tendus devant toi, ventre gainé, genoux légèrement fléchis.', 'Tire la corde vers le visage en écartant les mains de chaque côté de la tête, coudes hauts.', 'Marque une courte pause, serre les omoplates, puis reviens lentement.'],
      ['Charge trop lourde qui fait se pencher en arrière.', 'Tirer vers le menton ou la poitrine au lieu du visage.', 'Les coudes qui tombent sous les poignets.'],
      ['Tempo : 1 s en tirant, 3 s en revenant.', 'Charge légère à modérée, séries de 12 à 20 reps.', 'Garde 1 à 3 reps en réserve (RIR).']],
    [['Set the pulley at face height with a rope, grip it palms facing each other and step back.', 'Arms straight in front, abs braced, knees slightly bent.', 'Pull the rope toward your face, spreading the hands to each side of the head with high elbows.', 'Pause briefly, squeeze the shoulder blades, then return slowly.'],
      ['A load too heavy, making you lean back.', 'Pulling toward the chin or chest instead of the face.', 'Elbows dropping below the wrists.'],
      ['Tempo: 1 s pulling, 3 s returning.', 'Light to moderate load, sets of 12-20 reps.', 'Keep 1-3 reps in reserve (RIR).']],
    [['Stel de katrol op gezichtshoogte in met een touw, pak het met handpalmen naar elkaar en stap achteruit.', 'Armen gestrekt voor je, buik aangespannen, knieën licht gebogen.', 'Trek het touw naar je gezicht en spreid de handen naast je hoofd, ellebogen hoog.', 'Pauzeer kort, knijp de schouderbladen samen en keer dan langzaam terug.'],
      ['Een te zwaar gewicht waardoor je achterover leunt.', 'Naar de kin of borst trekken in plaats van naar het gezicht.', 'Ellebogen die onder de polsen zakken.'],
      ['Tempo: 1 s trekken, 3 s terugkeren.', 'Licht tot matig gewicht, sets van 12-20 herhalingen.', 'Houd 1-3 herhalingen in reserve (RIR).']]]),
  'Curl haltères': E('debutant', 'curl', [
    [['Debout, un haltère dans chaque main, paumes vers l\'avant, coudes le long du corps.', 'Fléchis les coudes pour monter les haltères vers les épaules, coudes fixes.', 'Contracte les biceps en haut sans te pencher en arrière.', 'Redescends lentement jusqu\'à bras presque tendus.'],
      ['Balancer le buste pour monter la charge.', 'Les coudes qui avancent ou reculent.', 'Une descente trop rapide.'],
      ['Tempo : 1 s en montée, 3 s en descente.', 'Garde 1 à 3 reps en réserve (RIR).', 'Tu peux alterner les bras ou les faire ensemble.']],
    [['Stand with a dumbbell in each hand, palms forward, elbows by your sides.', 'Bend the elbows to bring the dumbbells to the shoulders, elbows staying still.', 'Squeeze the biceps at the top without leaning back.', 'Lower slowly until the arms are almost straight.'],
      ['Swinging the torso to lift the weight.', 'Elbows drifting forward or backward.', 'Dropping the weight too fast.'],
      ['Tempo: 1 s up, 3 s down.', 'Keep 1-3 reps in reserve (RIR).', 'You can alternate arms or curl both together.']],
    [['Sta rechtop met een dumbbell in elke hand, handpalmen naar voren, ellebogen langs je lichaam.', 'Buig de ellebogen om de dumbbells naar de schouders te brengen, ellebogen blijven stil.', 'Span de biceps bovenaan aan zonder achterover te leunen.', 'Laat langzaam zakken tot de armen bijna gestrekt zijn.'],
      ['De romp zwaaien om het gewicht omhoog te krijgen.', 'Ellebogen die naar voren of achteren drijven.', 'Het gewicht te snel laten zakken.'],
      ['Tempo: 1 s omhoog, 3 s omlaag.', 'Houd 1-3 herhalingen in reserve (RIR).', 'Je kunt de armen afwisselen of samen krullen.']]]),
  'Curl barre': E('debutant', 'curlbar', [
    [['Debout, barre droite ou EZ en prise supination à largeur d\'épaules, coudes le long du corps.', 'Gaine le ventre, genoux légèrement fléchis.', 'Fléchis les coudes pour monter la barre vers les épaules, coudes fixes.', 'Redescends lentement jusqu\'à bras presque tendus.'],
      ['Se pencher en arrière pour monter la barre.', 'Les coudes qui partent vers l\'avant.', 'Une amplitude partielle.'],
      ['Tempo : 1 s en montée, 3 s en descente.', 'Une barre EZ ménage souvent mieux les poignets.', 'Garde 1 à 3 reps en réserve (RIR).']],
    [['Stand holding a straight or EZ bar with an underhand shoulder-width grip, elbows by your sides.', 'Brace the abs, knees slightly bent.', 'Bend the elbows to bring the bar toward the shoulders, elbows staying still.', 'Lower slowly until the arms are almost straight.'],
      ['Leaning back to swing the bar up.', 'Elbows drifting forward.', 'Partial range of motion.'],
      ['Tempo: 1 s up, 3 s down.', 'An EZ bar is often kinder on the wrists.', 'Keep 1-3 reps in reserve (RIR).']],
    [['Sta rechtop met een rechte of EZ-stang in onderhandse greep op schouderbreedte, ellebogen langs je lichaam.', 'Buik aangespannen, knieën licht gebogen.', 'Buig de ellebogen om de stang naar de schouders te brengen, ellebogen blijven stil.', 'Laat langzaam zakken tot de armen bijna gestrekt zijn.'],
      ['Achterover leunen om de stang omhoog te zwaaien.', 'Ellebogen die naar voren drijven.', 'Een onvolledig bewegingsbereik.'],
      ['Tempo: 1 s omhoog, 3 s omlaag.', 'Een EZ-stang is vaak vriendelijker voor de polsen.', 'Houd 1-3 herhalingen in reserve (RIR).']]]),
  'Curl marteau': E('debutant', 'hammer', [
    [['Debout, un haltère dans chaque main, paumes face à face (prise neutre), coudes le long du corps.', 'Fléchis les coudes pour monter les haltères vers les épaules, poignets droits.', 'Contracte en haut sans balancer le buste.', 'Redescends lentement jusqu\'à bras presque tendus.'],
      ['Balancer le buste.', 'Les coudes qui partent vers l\'avant.', 'Les poignets qui plient.'],
      ['Tempo : 1 s en montée, 3 s en descente.', 'Cette prise sollicite aussi les muscles de l\'avant-bras.', 'Garde 1 à 3 reps en réserve (RIR).']],
    [['Stand with a dumbbell in each hand, palms facing each other (neutral grip), elbows by your sides.', 'Bend the elbows to bring the dumbbells toward the shoulders, wrists straight.', 'Squeeze at the top without swinging the torso.', 'Lower slowly until the arms are almost straight.'],
      ['Swinging the torso.', 'Elbows drifting forward.', 'Bending the wrists.'],
      ['Tempo: 1 s up, 3 s down.', 'This grip also works the forearm muscles.', 'Keep 1-3 reps in reserve (RIR).']],
    [['Sta rechtop met een dumbbell in elke hand, handpalmen naar elkaar (neutrale greep), ellebogen langs je lichaam.', 'Buig de ellebogen om de dumbbells naar de schouders te brengen, polsen recht.', 'Span bovenaan aan zonder de romp te zwaaien.', 'Laat langzaam zakken tot de armen bijna gestrekt zijn.'],
      ['De romp zwaaien.', 'Ellebogen die naar voren drijven.', 'De polsen buigen.'],
      ['Tempo: 1 s omhoog, 3 s omlaag.', 'Deze greep belast ook de onderarmspieren.', 'Houd 1-3 herhalingen in reserve (RIR).']]]),
  'Extensions triceps': E('debutant', 'triceps', [
    [['Place la poulie haute avec une corde ou une barre, saisis-la, coudes collés au corps, buste légèrement penché.', 'Pars avec les avant-bras à environ 90°.', 'Étends les coudes jusqu\'à bras presque tendus et contracte les triceps.', 'Remonte lentement jusqu\'à retrouver 90° sans décoller les coudes.'],
      ['Les coudes qui s\'écartent ou avancent.', 'Utiliser le poids du corps pour pousser.', 'Une amplitude trop courte.'],
      ['Tempo : 1 s en poussant, 3 s en remontant.', 'Garde 1 à 3 reps en réserve (RIR).', 'Séries de 10 à 15 reps avec une charge qui permet de garder les coudes fixes.']],
    [['Set the pulley high with a rope or bar, grip it with elbows tucked to your sides, torso leaning slightly forward.', 'Start with the forearms at about 90°.', 'Extend the elbows until the arms are almost straight and squeeze the triceps.', 'Return slowly to about 90° without letting the elbows move.'],
      ['Elbows flaring out or drifting forward.', 'Using body weight to push down.', 'Too short a range of motion.'],
      ['Tempo: 1 s pushing, 3 s returning.', 'Keep 1-3 reps in reserve (RIR).', 'Sets of 10-15 reps with a load that lets the elbows stay fixed.']],
    [['Stel de katrol hoog in met een touw of stang, pak vast met de ellebogen tegen je zij en de romp licht voorover.', 'Begin met de onderarmen op ongeveer 90°.', 'Strek de ellebogen tot de armen bijna gestrekt zijn en span de triceps aan.', 'Keer langzaam terug naar ongeveer 90° zonder de ellebogen te bewegen.'],
      ['Ellebogen die naar buiten of naar voren gaan.', 'Lichaamsgewicht gebruiken om omlaag te duwen.', 'Een te klein bewegingsbereik.'],
      ['Tempo: 1 s duwen, 3 s terugkeren.', 'Houd 1-3 herhalingen in reserve (RIR).', 'Sets van 10-15 herhalingen met een gewicht waarbij de ellebogen stil blijven.']]]),
  'Barre au front': E('intermediaire', 'skull', [
    [['Allonge-toi sur un banc, barre EZ à bras tendus au-dessus des épaules.', 'Plie uniquement les coudes pour descendre la barre vers le front ou juste derrière la tête.', 'Étends les coudes pour remonter, en gardant les bras supérieurs presque immobiles.', 'Marque une courte pause en haut sans verrouiller violemment.'],
      ['Les coudes qui s\'écartent ou avancent trop.', 'Une charge trop lourde qui transforme l\'exercice en développé.', 'Une descente incontrôlée vers le visage.'],
      ['Tempo : 3 s à la descente, poussée contrôlée.', 'Utilise une barre EZ et demande un pareur si la charge est lourde.', 'Garde 1 à 3 reps en réserve (RIR).']],
    [['Lie on a bench holding an EZ bar over your shoulders with straight arms.', 'Bend only the elbows to lower the bar toward the forehead or just behind the head.', 'Extend the elbows to raise it, keeping the upper arms almost still.', 'Pause briefly at the top without slamming into lockout.'],
      ['Elbows flaring out or drifting too far forward.', 'A load too heavy that turns the lift into a press.', 'Uncontrolled lowering toward the face.'],
      ['Tempo: 3 s down, controlled press.', 'Use an EZ bar and a spotter if the load is heavy.', 'Keep 1-3 reps in reserve (RIR).']],
    [['Ga op een bank liggen met een EZ-stang met gestrekte armen boven je schouders.', 'Buig alleen de ellebogen om de stang naar het voorhoofd of net achter het hoofd te laten zakken.', 'Strek de ellebogen om omhoog te komen en houd de bovenarmen bijna stil.', 'Pauzeer kort bovenaan zonder hard te vergrendelen.'],
      ['Ellebogen die naar buiten of te ver naar voren gaan.', 'Een te zwaar gewicht waardoor het een press wordt.', 'Ongecontroleerd naar het gezicht zakken.'],
      ['Tempo: 3 s omlaag, gecontroleerde duw.', 'Gebruik een EZ-stang en een spotter bij zware gewichten.', 'Houd 1-3 herhalingen in reserve (RIR).']]]),
  'Gainage / crunch': E('debutant', 'crunch', [
    [['Allonge-toi sur le dos, genoux fléchis, pieds à plat, mains aux tempes ou croisées sur la poitrine.', 'Expire en enroulant le haut du dos pour décoller les omoplates du sol, bas du dos au contact.', 'Marque une courte pause en contractant les abdominaux.', 'Redescends lentement, nuque relâchée.'],
      ['Tirer sur la nuque avec les mains.', 'Monter trop haut avec l\'élan.', 'Retenir sa respiration.'],
      ['Tempo : 1 s en montée, 3 s en descente.', 'Garde 1 à 3 reps en réserve (RIR) et reste sur de petites amplitudes.', 'Qualité avant quantité ; une douleur au cou ou au dos est un signal pour arrêter.']],
    [['Lie on your back with knees bent and feet flat, hands at your temples or crossed on your chest.', 'Exhale and curl the upper back to lift the shoulder blades off the floor, lower back staying in contact.', 'Pause briefly while squeezing the abs.', 'Lower slowly with a relaxed neck.'],
      ['Pulling on the neck with the hands.', 'Coming up too high with momentum.', 'Holding the breath.'],
      ['Tempo: 1 s up, 3 s down.', 'Keep 1-3 reps in reserve (RIR) and stay in a small range.', 'Quality over quantity; pain in the neck or back is a signal to stop.']],
    [['Ga op je rug liggen met gebogen knieën en voeten plat, handen bij de slapen of gekruist op de borst.', 'Adem uit en rol de bovenrug op zodat de schouderbladen loskomen, onderrug blijft in contact.', 'Pauzeer kort terwijl je de buikspieren aanspant.', 'Laat langzaam zakken met een ontspannen nek.'],
      ['Met de handen aan de nek trekken.', 'Met momentum te hoog komen.', 'De adem inhouden.'],
      ['Tempo: 1 s omhoog, 3 s omlaag.', 'Houd 1-3 herhalingen in reserve (RIR) en blijf in een klein bereik.', 'Kwaliteit boven kwantiteit; pijn in nek of rug is een signaal om te stoppen.']]]),
  'Planche': E('debutant', 'plank', [
    [['Place les avant-bras au sol, coudes sous les épaules, jambes tendues en appui sur les orteils.', 'Aligne la tête, les épaules, le bassin et les talons.', 'Gaine le ventre et les fessiers, regard vers le sol.', 'Tiens la position en respirant normalement pendant la durée prévue.'],
      ['Le bassin qui s\'affaisse ou monte trop haut.', 'Retenir sa respiration.', 'Les épaules qui s\'effondrent entre les omoplates.'],
      ['Commence par 20 à 30 s et ajoute du temps progressivement.', 'Arrête quand la forme se dégrade, avec 1 à 2 reps en réserve (RIR) en termes de durée.', 'Trop dur ? Pose les genoux au sol.']],
    [['Place your forearms on the floor, elbows under the shoulders, legs straight on your toes.', 'Line up head, shoulders, hips and heels.', 'Brace the abs and glutes, eyes toward the floor.', 'Hold the position, breathing normally, for the planned time.'],
      ['Hips sagging or piking up.', 'Holding the breath.', 'Shoulders sinking between the shoulder blades.'],
      ['Start with 20-30 s and add time gradually.', 'Stop when form breaks down, leaving a little in reserve.', 'Too hard? Put your knees on the floor.']],
    [['Leg de onderarmen op de grond, ellebogen onder de schouders, benen gestrekt op de tenen.', 'Breng hoofd, schouders, heupen en hielen op één lijn.', 'Span buik en billen aan, blik naar de grond.', 'Houd de positie vast terwijl je normaal ademt gedurende de geplande tijd.'],
      ['Heupen die doorzakken of te hoog komen.', 'De adem inhouden.', 'Schouders die tussen de schouderbladen zakken.'],
      ['Begin met 20-30 s en voeg geleidelijk tijd toe.', 'Stop zodra je vorm verslechtert en houd iets in reserve.', 'Te zwaar? Zet je knieën op de grond.']]]),
  'Relevés de jambes': E('intermediaire', 'legraise', [
    [['Allonge-toi sur le dos, mains sous les fessiers ou le long du corps, bas du dos au sol.', 'Jambes tendues ou légèrement fléchies, lève-les jusqu\'à la verticale.', 'Redescends lentement sans laisser le bas du dos se cambrer.', 'Arrête la descente avant que le bas du dos ne décolle.'],
      ['Le bas du dos qui se cambre en descendant.', 'Balancer les jambes avec l\'élan.', 'Retenir sa respiration.'],
      ['Tempo : 1 s en montée, 3 s en descente.', 'Trop dur ? Fléchis les genoux ou réduis l\'amplitude.', 'Garde 1 à 3 reps en réserve (RIR).']],
    [['Lie on your back with hands under your glutes or by your sides, lower back on the floor.', 'Legs straight or slightly bent, raise them to vertical.', 'Lower slowly without letting the lower back arch.', 'Stop the descent before the lower back lifts.'],
      ['The lower back arching on the way down.', 'Swinging the legs with momentum.', 'Holding the breath.'],
      ['Tempo: 1 s up, 3 s down.', 'Too hard? Bend the knees or shorten the range.', 'Keep 1-3 reps in reserve (RIR).']],
    [['Ga op je rug liggen met de handen onder je billen of langs je lichaam, onderrug op de grond.', 'Benen gestrekt of licht gebogen, til ze tot verticaal.', 'Laat langzaam zakken zonder dat je onderrug hol komt.', 'Stop het zakken voordat je onderrug loskomt.'],
      ['De onderrug die hol komt tijdens het zakken.', 'De benen met momentum zwaaien.', 'De adem inhouden.'],
      ['Tempo: 1 s omhoog, 3 s omlaag.', 'Te zwaar? Buig de knieën of verklein het bereik.', 'Houd 1-3 herhalingen in reserve (RIR).']]]),
  'Crunch poulie': E('intermediaire', 'cablecrunch', [
    [['Mets-toi à genoux face à la poulie haute, saisis la corde et tiens-la près de ton front.', 'Hanches fixes, dos neutre au départ.', 'Enroule le buste vers le bas en rapprochant les côtes du bassin.', 'Marque une pause, puis remonte lentement sans bouger les hanches.'],
      ['Tirer avec les bras au lieu d\'enrouler le tronc.', 'Faire reculer les hanches.', 'Une charge trop lourde qui fait perdre le contrôle.'],
      ['Tempo : 1 s en enroulant, 3 s en remontant.', 'Pense à expirer en enroulant.', 'Garde 1 à 3 reps en réserve (RIR).']],
    [['Kneel facing the high pulley, grip the rope and hold it near your forehead.', 'Hips still, back neutral to start.', 'Curl the torso down, bringing the ribs toward the pelvis.', 'Pause, then return slowly without moving the hips.'],
      ['Pulling with the arms instead of curling the trunk.', 'Letting the hips move backward.', 'A load too heavy, which loses control.'],
      ['Tempo: 1 s curling, 3 s returning.', 'Exhale as you curl down.', 'Keep 1-3 reps in reserve (RIR).']],
    [['Kniel met je gezicht naar de hoge katrol, pak het touw en houd het bij je voorhoofd.', 'Heupen stil, rug aan het begin neutraal.', 'Rol de romp omlaag en breng de ribben naar het bekken.', 'Pauzeer en keer dan langzaam terug zonder de heupen te bewegen.'],
      ['Met de armen trekken in plaats van de romp op te rollen.', 'De heupen naar achteren laten gaan.', 'Een te zwaar gewicht waardoor je de controle verliest.'],
      ['Tempo: 1 s oprollen, 3 s terugkeren.', 'Adem uit terwijl je omlaag rolt.', 'Houd 1-3 herhalingen in reserve (RIR).']]]),
  'Squat pistol': E('avance', 'pistolsquat', [
    [['Tiens-toi debout sur une jambe, l\'autre tendue devant toi, bras en avant pour l\'équilibre.', 'Descends lentement en pliant le genou d\'appui, dos droit et talon au sol.', 'Va aussi bas que tu contrôles, puis remonte en poussant dans le talon.'],
      ['Le talon qui décolle.', 'Le genou qui part vers l\'intérieur.', 'Vouloir aller trop bas trop vite sans la mobilité nécessaire.'],
      ['Commence assisté (main sur un support ou appui sur une boîte basse) avant la version libre.', 'Garde la jambe tendue devant toi tout du long.', 'Travaille la mobilité de cheville en amont : c\'est souvent le facteur limitant.']],
    [['Stand on one leg, the other leg extended in front of you, arms forward for balance.', 'Slowly lower by bending the standing knee, keeping your back straight and heel on the ground.', 'Go as low as you can control, then stand back up by pushing through the heel.'],
      ['The heel lifting off the ground.', 'The knee caving inward.', 'Trying to go too low too fast without the needed mobility.'],
      ['Start assisted (hand on support or stepping onto a low box) before the free version.', 'Keep the front leg extended throughout.', 'Work on ankle mobility beforehand: it is often the limiting factor.']],
    [['Sta op één been, het andere been gestrekt voor je, armen naar voren voor evenwicht.', 'Zak langzaam door de knie van het steunbeen, met een rechte rug en de hiel op de grond.', 'Ga zo diep als je kunt beheersen, kom dan omhoog door door de hiel te duwen.'],
      ['De hiel die loskomt van de grond.', 'De knie die naar binnen zakt.', 'Te snel te diep willen gaan zonder de nodige mobiliteit.'],
      ['Begin ondersteund (hand op een steun of op een lage box) voor de vrije versie.', 'Houd het voorste been de hele tijd gestrekt.', 'Werk vooraf aan enkelmobiliteit: dat is vaak de beperkende factor.']]]),
  'Squat overhead': E('avance', 'overheadsquat', [
    [['Tiens une barre légère à bout de bras au-dessus de la tête, prise large.', 'Descends en squat en gardant la barre alignée au-dessus des pieds, bras verrouillés.', 'Va à profondeur contrôlée puis remonte sans perdre l\'alignement barre-épaules-chevilles.'],
      ['Les bras qui partent vers l\'avant.', 'Le bas du dos qui s\'arrondit.', 'Une charge trop lourde pour la mobilité des épaules.'],
      ['Commence à vide (bâton) pour apprendre la position avant de charger.', 'Travaille la mobilité des épaules et des chevilles en amont.', 'Garde le regard droit devant, pas vers le plafond.']],
    [['Hold a light bar at arm\'s length overhead, wide grip.', 'Squat down keeping the bar aligned above your feet, arms locked.', 'Go to a controlled depth then stand back up without losing the bar-shoulders-ankles alignment.'],
      ['The arms drifting forward.', 'The lower back rounding.', 'A load too heavy for your shoulder mobility.'],
      ['Start with just a stick to learn the position before loading.', 'Work on shoulder and ankle mobility beforehand.', 'Keep your gaze straight ahead, not at the ceiling.']],
    [['Houd een lichte stang op armlengte boven je hoofd, brede grip.', 'Zak door de knieën met de stang boven je voeten uitgelijnd, armen gestrekt.', 'Ga tot een beheersbare diepte en kom dan omhoog zonder de uitlijning stang-schouders-enkels te verliezen.'],
      ['De armen die naar voren zakken.', 'De onderrug die rondt.', 'Een te zware belasting voor je schoudermobiliteit.'],
      ['Begin met alleen een stok om de positie te leren voor je belast.', 'Werk vooraf aan schouder- en enkelmobiliteit.', 'Houd je blik recht vooruit, niet naar het plafond.']]]),
  'Burpee': E('intermediaire', 'burpee', [
    [['Depuis debout, pose les mains au sol et envoie les pieds en arrière pour une position de planche.', 'Fais une pompe (optionnelle selon ton niveau), puis ramène les pieds vers les mains.', 'Saute verticalement, bras tendus au-dessus de la tête, puis enchaîne.'],
      ['Le bas du dos qui s\'affaisse en planche.', 'Atterrir genoux tendus au saut.', 'Aller trop vite au point de perdre la position.'],
      ['Enlève la pompe ou le saut pour une version plus facile.', 'Respire sur un rythme régulier, ne bloque pas ta respiration.', 'Garde le ventre gainé pendant toute la planche.']],
    [['From standing, place your hands on the floor and kick your feet back into a plank.', 'Do a push-up (optional depending on your level), then bring your feet back to your hands.', 'Jump straight up, arms overhead, then repeat.'],
      ['The lower back sagging in the plank.', 'Landing with straight knees after the jump.', 'Going too fast to the point of losing form.'],
      ['Drop the push-up or the jump for an easier version.', 'Breathe at a steady rhythm, do not hold your breath.', 'Keep your core braced throughout the plank.']],
    [['Plaats vanuit stand je handen op de grond en gooi je voeten naar achteren in een plank.', 'Doe een push-up (optioneel, naar niveau), breng dan je voeten terug naar je handen.', 'Spring recht omhoog, armen boven je hoofd, en herhaal.'],
      ['De onderrug die doorzakt in de plank.', 'Landen met gestrekte knieën na de sprong.', 'Te snel gaan waardoor je de houding verliest.'],
      ['Laat de push-up of de sprong weg voor een makkelijkere versie.', 'Adem op een regelmatig ritme, hou je adem niet in.', 'Houd je buik aangespannen tijdens de hele plank.']]]),
  'Arraché': E('avance', 'snatch', [
    [['Barre au sol, prise large, tire en gardant la barre proche du corps.', 'Étends hanches et genoux en explosant vers le haut, puis tire sous la barre.', 'Réceptionne en squat profond, bras tendus au-dessus de la tête, puis relève-toi.'],
      ['La barre qui s\'éloigne du corps pendant le tirage.', 'Les bras qui tirent trop tôt au lieu des jambes et des hanches.', 'Une réception instable, bras pliés.'],
      ['Mouvement technique : apprends-le avec un coach ou une barre légère avant de charger.', 'Décompose-le en blocs (tirage, extension, réception) avant de l\'enchaîner.', 'La mobilité des épaules et des hanches conditionne la qualité de la réception.']],
    [['Bar on the floor, wide grip, pull while keeping the bar close to your body.', 'Extend hips and knees explosively, then pull yourself under the bar.', 'Catch in a deep squat, arms locked overhead, then stand up.'],
      ['The bar drifting away from the body during the pull.', 'The arms pulling too early instead of the legs and hips.', 'An unstable catch with bent arms.'],
      ['A technical lift: learn it with a coach or a light bar before loading.', 'Break it into blocks (pull, extension, catch) before linking them.', 'Shoulder and hip mobility largely determine catch quality.']],
    [['Stang op de grond, brede grip, trek met de stang dicht bij je lichaam.', 'Strek heupen en knieën explosief, trek jezelf dan onder de stang.', 'Vang op in een diepe squat, armen gestrekt boven je hoofd, kom dan omhoog.'],
      ['De stang die van het lichaam wegdrijft tijdens de trek.', 'De armen die te vroeg trekken in plaats van de benen en heupen.', 'Een onstabiele vangst met gebogen armen.'],
      ['Een technische lift: leer hem met een coach of een lichte stang voor je belast.', 'Splits hem in delen (trek, strekking, vangst) voor je ze aan elkaar rijgt.', 'Schouder- en heupmobiliteit bepalen grotendeels de kwaliteit van de vangst.']]]),
  'Épaulé-jeté': E('avance', 'cleanjerk', [
    [['Tire la barre du sol jusqu\'aux épaules en pivotant les coudes vers l\'avant (épaulé).', 'Stabilise la barre sur les épaules, prends une respiration.', 'Plie légèrement les jambes puis pousse la barre au-dessus de la tête en split ou en squat (jeté).'],
      ['Les coudes qui restent bas à la réception de l\'épaulé.', 'Pousser uniquement avec les bras au jeté, sans les jambes.', 'Une barre qui part vers l\'avant au-dessus de la tête.'],
      ['Travaille l\'épaulé et le jeté séparément avant de les enchaîner.', 'Une barre légère suffit pour apprendre la technique.', 'La mobilité des poignets et des épaules facilite la position de réception.']],
    [['Pull the bar from the floor to your shoulders, rotating the elbows forward (clean).', 'Stabilize the bar on your shoulders and take a breath.', 'Dip your legs slightly then drive the bar overhead in a split or squat stance (jerk).'],
      ['The elbows staying low on the clean catch.', 'Pushing with the arms only on the jerk, without the legs.', 'The bar drifting forward overhead.'],
      ['Practice the clean and the jerk separately before linking them.', 'A light bar is enough to learn the technique.', 'Wrist and shoulder mobility make the catch position easier.']],
    [['Trek de stang van de grond naar je schouders, met de ellebogen naar voren (clean).', 'Stabiliseer de stang op je schouders en haal adem.', 'Buig licht door de benen en duw de stang dan boven je hoofd in een split of squat (jerk).'],
      ['De ellebogen die laag blijven bij het vangen van de clean.', 'Alleen met de armen duwen bij de jerk, zonder de benen.', 'De stang die naar voren drijft boven het hoofd.'],
      ['Oefen de clean en de jerk apart voor je ze aan elkaar rijgt.', 'Een lichte stang volstaat om de techniek te leren.', 'Pols- en schoudermobiliteit maken de vangpositie makkelijker.']]]),
  'Tirage sumo': E('intermediaire', 'sumopull', [
    [['Pieds larges, barre au sol, prise resserrée entre les jambes.', 'Tire la barre le long du corps jusque sous le menton, coudes hauts et vers l\'extérieur.', 'Redescends la barre de façon contrôlée jusqu\'au sol.'],
      ['Le dos qui s\'arrondit au départ.', 'Tirer avec les bras au lieu des hanches et des jambes.', 'Les coudes qui restent bas.'],
      ['Commence léger pour apprendre le trajet de la barre.', 'Garde la barre proche du corps du début à la fin.', 'Pense « pousser le sol » avec les jambes avant de tirer avec les bras.']],
    [['Wide stance, bar on the floor, grip narrower than your legs.', 'Pull the bar up along the body to under the chin, elbows high and out.', 'Lower the bar back down with control.'],
      ['The back rounding at the start.', 'Pulling with the arms instead of the hips and legs.', 'The elbows staying low.'],
      ['Start light to learn the bar path.', 'Keep the bar close to the body throughout.', 'Think “push the floor” with the legs before pulling with the arms.']],
    [['Brede stand, stang op de grond, grip smaller dan je benen.', 'Trek de stang langs het lichaam omhoog tot onder de kin, ellebogen hoog en naar buiten.', 'Laat de stang gecontroleerd weer zakken.'],
      ['De rug die rondt bij de start.', 'Trekken met de armen in plaats van de heupen en benen.', 'De ellebogen die laag blijven.'],
      ['Begin licht om het traject van de stang te leren.', 'Houd de stang de hele tijd dicht bij het lichaam.', 'Denk "de vloer wegduwen" met de benen voor je met de armen trekt.']]]),
  'Élévations frontales': E('debutant', 'frontraise', [
    [['Debout, haltères le long du corps, prise neutre ou pronation.', 'Lève un ou les deux bras tendus devant toi jusqu\'à hauteur d\'épaule.', 'Redescends lentement sans élan.'],
      ['Utiliser l\'élan du bas du corps pour lancer le poids.', 'Monter au-dessus de la hauteur des épaules.', 'Cambrer le bas du dos pour compenser une charge trop lourde.'],
      ['Charge légère : c\'est un mouvement d\'isolation, pas de force brute.', 'Tempo lent à la descente pour plus de tension.', 'Alterne les bras si tenir les deux est inconfortable pour les épaules.']],
    [['Standing, dumbbells by your sides, neutral or overhand grip.', 'Raise one or both arms straight in front of you to shoulder height.', 'Lower back down slowly without momentum.'],
      ['Using lower-body momentum to swing the weight up.', 'Raising above shoulder height.', 'Arching the lower back to compensate for a load that is too heavy.'],
      ['Light load: this is an isolation move, not a strength one.', 'Slow tempo on the way down for more tension.', 'Alternate arms if holding both is uncomfortable for your shoulders.']],
    [['Sta rechtop, halters naast je lichaam, neutrale of bovenhandse grip.', 'Hef één of beide armen gestrekt voor je tot schouderhoogte.', 'Laat langzaam zakken zonder zwaai.'],
      ['Zwaai vanuit de benen gebruiken om het gewicht omhoog te krijgen.', 'Hoger dan schouderhoogte heffen.', 'De onderrug hol trekken om een te zware belasting te compenseren.'],
      ['Lichte belasting: dit is een isolatieoefening, geen krachtoefening.', 'Langzaam tempo bij het zakken voor meer spanning.', 'Wissel van arm als beide tegelijk vasthouden onprettig is voor je schouders.']]]),
};

// Fiche d'un exercice : { level, pose, steps:{fr,en,nl}, mistakes:{...}, tips:{...} } ou null (exercice personnalisé).
export const getTechnique = (name) => TECH[name] || null;
export const allTechniques = () => TECH;
// Noms des exercices de la bibliothèque (garde-fou : toute la bibliothèque doit avoir une fiche).
export const missingTechniques = () => LIBRARY.map((e) => e.name).filter((n) => !TECH[n]);
export { TECH };

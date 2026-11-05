// Bibliothèque d'exercices (noms français = clés de l'historique ; traduits à l'affichage).
// [nom, muscle principal, muscles secondaires, équipement, type, haut du corps ?, catégorie]
const RAW = [
  ['Squat', 'Quadriceps', ['Fessiers', 'Ischios'], 'barre', 'weight_reps', false, 'jambes'],
  ['Squat avant', 'Quadriceps', ['Fessiers', 'Abdos'], 'barre', 'weight_reps', false, 'jambes'],
  ['Presse à cuisses', 'Quadriceps', ['Fessiers'], 'machine', 'weight_reps', false, 'jambes'],
  ['Fentes bulgares', 'Fessiers', ['Quadriceps'], 'haltères', 'weight_reps', false, 'jambes'],
  ['Fentes marchées', 'Quadriceps', ['Fessiers'], 'haltères', 'weight_reps', false, 'jambes'],
  ['Leg extension', 'Quadriceps', [], 'machine', 'weight_reps', false, 'jambes'],
  ['Soulevé de terre', 'Dos', ['Ischios', 'Fessiers'], 'barre', 'weight_reps', false, 'jambes'],
  ['Soulevé de terre roumain', 'Ischios', ['Fessiers', 'Dos'], 'barre', 'weight_reps', false, 'jambes'],
  ['Leg curl', 'Ischios', [], 'machine', 'weight_reps', false, 'jambes'],
  ['Hip thrust', 'Fessiers', ['Ischios'], 'barre', 'weight_reps', false, 'jambes'],
  ['Mollets debout', 'Mollets', [], 'machine', 'weight_reps', false, 'jambes'],
  ['Mollets assis', 'Mollets', [], 'machine', 'weight_reps', false, 'jambes'],
  ['Squat pistol', 'Quadriceps', ['Fessiers', 'Abdos'], 'aucun', 'bodyweight', false, 'jambes'],
  ['Squat overhead', 'Quadriceps', ['Épaules', 'Abdos'], 'barre', 'weight_reps', false, 'jambes'],
  ['Développé couché', 'Pectoraux', ['Triceps', 'Épaules'], 'barre', 'weight_reps', true, 'haut'],
  ['Développé couché haltères', 'Pectoraux', ['Triceps', 'Épaules'], 'haltères', 'weight_reps', true, 'haut'],
  ['Développé incliné haltères', 'Pectoraux', ['Épaules', 'Triceps'], 'haltères', 'weight_reps', true, 'haut'],
  ['Écarté poulie', 'Pectoraux', [], 'poulie', 'weight_reps', true, 'haut'],
  ['Pompes', 'Pectoraux', ['Triceps', 'Épaules'], 'aucun', 'bodyweight', true, 'haut'],
  ['Dips', 'Triceps', ['Pectoraux', 'Épaules'], 'aucun', 'weighted_bw', true, 'haut'],
  ['Dips assistés', 'Triceps', ['Pectoraux'], 'machine', 'assisted_bw', true, 'haut'],
  ['Tractions', 'Dos', ['Biceps'], 'aucun', 'weighted_bw', true, 'haut'],
  ['Tractions assistées', 'Dos', ['Biceps'], 'machine', 'assisted_bw', true, 'haut'],
  ['Tractions / tirage vertical', 'Dos', ['Biceps'], 'poulie', 'weight_reps', true, 'haut'],
  ['Tirage vertical', 'Dos', ['Biceps'], 'poulie', 'weight_reps', true, 'haut'],
  ['Rowing barre', 'Dos', ['Biceps', 'Épaules'], 'barre', 'weight_reps', true, 'haut'],
  ['Rowing haltère', 'Dos', ['Biceps'], 'haltères', 'weight_reps', true, 'haut'],
  ['Tirage horizontal', 'Dos', ['Biceps'], 'poulie', 'weight_reps', true, 'haut'],
  ['Développé militaire', 'Épaules', ['Triceps'], 'barre', 'weight_reps', true, 'haut'],
  ['Développé épaules haltères', 'Épaules', ['Triceps'], 'haltères', 'weight_reps', true, 'haut'],
  ['Élévations latérales', 'Épaules', [], 'haltères', 'weight_reps', true, 'haut'],
  ['Élévations frontales', 'Épaules', [], 'haltères', 'weight_reps', true, 'haut'],
  ['Face pull', 'Épaules', ['Dos'], 'poulie', 'weight_reps', true, 'haut'],
  ['Curl haltères', 'Biceps', [], 'haltères', 'weight_reps', true, 'haut'],
  ['Curl barre', 'Biceps', [], 'barre', 'weight_reps', true, 'haut'],
  ['Curl marteau', 'Biceps', [], 'haltères', 'weight_reps', true, 'haut'],
  ['Extensions triceps', 'Triceps', [], 'poulie', 'weight_reps', true, 'haut'],
  ['Barre au front', 'Triceps', [], 'barre', 'weight_reps', true, 'haut'],
  ['Gainage / crunch', 'Abdos', [], 'aucun', 'bodyweight', true, 'abdos'],
  ['Planche', 'Abdos', [], 'aucun', 'duration', true, 'abdos'],
  ['Relevés de jambes', 'Abdos', [], 'aucun', 'bodyweight', true, 'abdos'],
  ['Crunch poulie', 'Abdos', [], 'poulie', 'weight_reps', true, 'abdos'],
  ['Burpee', 'Abdos', ['Pectoraux', 'Quadriceps'], 'aucun', 'duration', true, 'cardio'],
  ['Arraché', 'Dos', ['Épaules', 'Quadriceps'], 'barre', 'weight_reps', false, 'haltero'],
  ['Épaulé-jeté', 'Quadriceps', ['Épaules', 'Dos'], 'barre', 'weight_reps', false, 'haltero'],
  ['Tirage sumo', 'Dos', ['Fessiers', 'Ischios'], 'barre', 'weight_reps', false, 'haltero'],
  // Mouvements animés par Mixamo (ajoutés avec leur clip 3D).
  ["Sit-up", "Abdos", [], "aucun", "bodyweight", true, "abdos"],
  ["Crunch vélo", "Abdos", [], "aucun", "bodyweight", true, "abdos"],
  ["Crunch circulaire", "Abdos", [], "aucun", "bodyweight", true, "abdos"],
  ["Pompes sautées", "Pectoraux", ["Triceps", "Épaules"], "aucun", "bodyweight", true, "haut"],
  ["Jumping jacks", "Mollets", ["Épaules", "Quadriceps"], "aucun", "duration", false, "cardio"],
  ["Corde à sauter", "Mollets", ["Épaules"], "aucun", "duration", false, "cardio"],
  ["Box jump", "Quadriceps", ["Fessiers", "Mollets"], "aucun", "bodyweight", false, "cardio"],
  ["Footing", "Quadriceps", ["Ischios", "Mollets"], "aucun", "duration", false, "cardio"],
  ["Tapis de course", "Quadriceps", ["Ischios", "Mollets"], "machine", "duration", false, "cardio"],
  ["Sprint", "Ischios", ["Quadriceps", "Fessiers", "Mollets"], "aucun", "duration", false, "cardio"],
  ["Kettlebell swing", "Fessiers", ["Ischios", "Dos"], "haltères", "weight_reps", false, "haltero"],
  ["Échauffement", "Épaules", ["Quadriceps"], "aucun", "duration", true, "mobilite"],
  ["Étirement de la nuque", "Épaules", [], "aucun", "duration", true, "mobilite"],
  ["Étirement des bras", "Épaules", ["Triceps", "Pectoraux"], "aucun", "duration", true, "mobilite"],
];

export const LIBRARY = RAW.map(([name, muscle, secondary, equipment, type, upper, category]) => ({ name, muscle, secondary, equipment, type, upper, category }));
export const EQUIPMENT = ['barre', 'haltères', 'machine', 'poulie', 'aucun'];
// Catégories « Apprendre » (section, pas seulement haut/bas du corps) : ordre d'affichage des groupes.
export const CATEGORIES = ['jambes', 'haut', 'abdos', 'cardio', 'haltero', 'mobilite'];
export const CATEGORY_LABEL = { jambes: 'Jambes', haut: 'Haut du corps', abdos: 'Abdos', cardio: 'Cardio', haltero: 'Haltéro', mobilite: 'Mobilité' };

// Exercice par nom : bibliothèque + exercices personnalisés.
export function findExercise(name, custom = []) {
  return custom.find((e) => e.name === name) || LIBRARY.find((e) => e.name === name) || null;
}

// Programme par défaut : full body 3 j/sem (chaque muscle ≥ 2×/sem, Schoenfeld 2016).
// Les noms restent en français (clés de l'historique) et sont traduits à l'affichage.
export const DEFAULT_PROGRAM = {
  name: 'Full body 3 jours (débutant/intermédiaire)',
  days: [
    { name: 'Jour A', exercises: [
      { name: 'Squat', muscle: 'Quadriceps', sets: 3, repMin: 6, repMax: 10, upper: false },
      { name: 'Développé couché', muscle: 'Pectoraux', sets: 3, repMin: 6, repMax: 10, upper: true },
      { name: 'Rowing barre', muscle: 'Dos', sets: 3, repMin: 8, repMax: 12, upper: true },
      { name: 'Élévations latérales', muscle: 'Épaules', sets: 3, repMin: 12, repMax: 20, upper: true },
      { name: 'Curl haltères', muscle: 'Biceps', sets: 2, repMin: 10, repMax: 15, upper: true },
    ] },
    { name: 'Jour B', exercises: [
      { name: 'Soulevé de terre roumain', muscle: 'Ischios', sets: 3, repMin: 6, repMax: 10, upper: false },
      { name: 'Développé militaire', muscle: 'Épaules', sets: 3, repMin: 6, repMax: 10, upper: true },
      { name: 'Tractions / tirage vertical', muscle: 'Dos', sets: 3, repMin: 6, repMax: 12, upper: true },
      { name: 'Fentes bulgares', muscle: 'Fessiers', sets: 3, repMin: 8, repMax: 12, upper: false },
      { name: 'Extensions triceps', muscle: 'Triceps', sets: 2, repMin: 10, repMax: 15, upper: true },
    ] },
    { name: 'Jour C', exercises: [
      { name: 'Presse à cuisses', muscle: 'Quadriceps', sets: 3, repMin: 10, repMax: 15, upper: false },
      { name: 'Développé incliné haltères', muscle: 'Pectoraux', sets: 3, repMin: 8, repMax: 12, upper: true },
      { name: 'Rowing haltère', muscle: 'Dos', sets: 3, repMin: 8, repMax: 12, upper: true },
      { name: 'Leg curl', muscle: 'Ischios', sets: 3, repMin: 10, repMax: 15, upper: false },
      { name: 'Mollets debout', muscle: 'Mollets', sets: 3, repMin: 10, repMax: 20, upper: false },
      { name: 'Gainage / crunch', muscle: 'Abdos', sets: 3, repMin: 10, repMax: 20, upper: true },
    ] },
  ],
};

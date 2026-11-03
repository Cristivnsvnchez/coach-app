// Bibliothèque d'exercices (noms français = clés de l'historique ; traduits à l'affichage).
// [nom, muscle principal, muscles secondaires, équipement, type, haut du corps ?]
const RAW = [
  ['Squat', 'Quadriceps', ['Fessiers', 'Ischios'], 'barre', 'weight_reps', false],
  ['Squat avant', 'Quadriceps', ['Fessiers', 'Abdos'], 'barre', 'weight_reps', false],
  ['Presse à cuisses', 'Quadriceps', ['Fessiers'], 'machine', 'weight_reps', false],
  ['Fentes bulgares', 'Fessiers', ['Quadriceps'], 'haltères', 'weight_reps', false],
  ['Fentes marchées', 'Quadriceps', ['Fessiers'], 'haltères', 'weight_reps', false],
  ['Leg extension', 'Quadriceps', [], 'machine', 'weight_reps', false],
  ['Soulevé de terre', 'Dos', ['Ischios', 'Fessiers'], 'barre', 'weight_reps', false],
  ['Soulevé de terre roumain', 'Ischios', ['Fessiers', 'Dos'], 'barre', 'weight_reps', false],
  ['Leg curl', 'Ischios', [], 'machine', 'weight_reps', false],
  ['Hip thrust', 'Fessiers', ['Ischios'], 'barre', 'weight_reps', false],
  ['Mollets debout', 'Mollets', [], 'machine', 'weight_reps', false],
  ['Mollets assis', 'Mollets', [], 'machine', 'weight_reps', false],
  ['Développé couché', 'Pectoraux', ['Triceps', 'Épaules'], 'barre', 'weight_reps', true],
  ['Développé couché haltères', 'Pectoraux', ['Triceps', 'Épaules'], 'haltères', 'weight_reps', true],
  ['Développé incliné haltères', 'Pectoraux', ['Épaules', 'Triceps'], 'haltères', 'weight_reps', true],
  ['Écarté poulie', 'Pectoraux', [], 'poulie', 'weight_reps', true],
  ['Pompes', 'Pectoraux', ['Triceps', 'Épaules'], 'aucun', 'bodyweight', true],
  ['Dips', 'Triceps', ['Pectoraux', 'Épaules'], 'aucun', 'weighted_bw', true],
  ['Dips assistés', 'Triceps', ['Pectoraux'], 'machine', 'assisted_bw', true],
  ['Tractions', 'Dos', ['Biceps'], 'aucun', 'weighted_bw', true],
  ['Tractions assistées', 'Dos', ['Biceps'], 'machine', 'assisted_bw', true],
  ['Tractions / tirage vertical', 'Dos', ['Biceps'], 'poulie', 'weight_reps', true],
  ['Tirage vertical', 'Dos', ['Biceps'], 'poulie', 'weight_reps', true],
  ['Rowing barre', 'Dos', ['Biceps', 'Épaules'], 'barre', 'weight_reps', true],
  ['Rowing haltère', 'Dos', ['Biceps'], 'haltères', 'weight_reps', true],
  ['Tirage horizontal', 'Dos', ['Biceps'], 'poulie', 'weight_reps', true],
  ['Développé militaire', 'Épaules', ['Triceps'], 'barre', 'weight_reps', true],
  ['Développé épaules haltères', 'Épaules', ['Triceps'], 'haltères', 'weight_reps', true],
  ['Élévations latérales', 'Épaules', [], 'haltères', 'weight_reps', true],
  ['Face pull', 'Épaules', ['Dos'], 'poulie', 'weight_reps', true],
  ['Curl haltères', 'Biceps', [], 'haltères', 'weight_reps', true],
  ['Curl barre', 'Biceps', [], 'barre', 'weight_reps', true],
  ['Curl marteau', 'Biceps', [], 'haltères', 'weight_reps', true],
  ['Extensions triceps', 'Triceps', [], 'poulie', 'weight_reps', true],
  ['Barre au front', 'Triceps', [], 'barre', 'weight_reps', true],
  ['Gainage / crunch', 'Abdos', [], 'aucun', 'bodyweight', true],
  ['Planche', 'Abdos', [], 'aucun', 'duration', true],
  ['Relevés de jambes', 'Abdos', [], 'aucun', 'bodyweight', true],
  ['Crunch poulie', 'Abdos', [], 'poulie', 'weight_reps', true],
];

export const LIBRARY = RAW.map(([name, muscle, secondary, equipment, type, upper]) => ({ name, muscle, secondary, equipment, type, upper }));
export const EQUIPMENT = ['barre', 'haltères', 'machine', 'poulie', 'aucun'];

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

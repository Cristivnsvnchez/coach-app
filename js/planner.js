// Planification (pure, testée sous Node) : modèles de programmes, programme daté (phases + décharges),
// répartition des séances sur les jours choisis.
// Conventions (pas de consensus chiffré) : décharge 1 semaine sur 4 (1 sur 6 pour débutant), volume ×0,6 en décharge.
import { isoDate, parseDate } from './science.js';

const ex = (name, muscle, sets, repMin, repMax, upper = true) => ({ name, muscle, sets, repMin, repMax, upper });

// Plages de répétitions par objectif (Schoenfeld 2017 : hypertrophie 6–30 près de l'échec ; force 1–6).
export const GOAL_REPS = {
  force: [3, 6], hypertrophie: [6, 12], seche: [6, 12], forme: [8, 15], evenement: [5, 10],
};
export const PLAN_GOALS = {
  hypertrophie: 'Prendre du muscle', force: 'Devenir plus fort', seche: 'Perdre du gras en gardant le muscle',
  forme: 'Remise en forme / santé', evenement: 'Préparer une date précise',
};

// Modèles : chaque jour = liste d'exercices (séries par défaut). Les reps sont ajustées à l'objectif.
export const TEMPLATES = {
  fullbody3: { name: 'Full body', days: 3, equipment: ['salle', 'maison'], level: 'débutant → intermédiaire',
    why: 'Chaque muscle 3×/semaine avec peu de séances : idéal pour progresser vite et rester régulier.',
    plan: [
      { name: 'Full body A', exercises: [ex('Squat', 'Quadriceps', 3, 6, 10, false), ex('Développé couché', 'Pectoraux', 3, 6, 10), ex('Rowing barre', 'Dos', 3, 8, 12), ex('Élévations latérales', 'Épaules', 2, 12, 20), ex('Curl haltères', 'Biceps', 2, 10, 15)] },
      { name: 'Full body B', exercises: [ex('Soulevé de terre roumain', 'Ischios', 3, 6, 10, false), ex('Développé militaire', 'Épaules', 3, 6, 10), ex('Tirage vertical', 'Dos', 3, 8, 12), ex('Fentes bulgares', 'Fessiers', 3, 8, 12, false), ex('Extensions triceps', 'Triceps', 2, 10, 15)] },
      { name: 'Full body C', exercises: [ex('Presse à cuisses', 'Quadriceps', 3, 10, 15, false), ex('Développé incliné haltères', 'Pectoraux', 3, 8, 12), ex('Rowing haltère', 'Dos', 3, 8, 12), ex('Leg curl', 'Ischios', 3, 10, 15, false), ex('Gainage / crunch', 'Abdos', 3, 10, 20)] },
    ] },
  upperlower4: { name: 'Haut / Bas', days: 4, equipment: ['salle'], level: 'intermédiaire',
    why: 'Chaque muscle 2×/semaine avec plus de volume par séance : le meilleur compromis à 4 jours.',
    plan: [
      { name: 'Haut A', exercises: [ex('Développé couché', 'Pectoraux', 4, 5, 8), ex('Rowing barre', 'Dos', 4, 6, 10), ex('Développé épaules haltères', 'Épaules', 3, 8, 12), ex('Tirage vertical', 'Dos', 3, 8, 12), ex('Curl barre', 'Biceps', 2, 8, 12), ex('Extensions triceps', 'Triceps', 2, 10, 15)] },
      { name: 'Bas A', exercises: [ex('Squat', 'Quadriceps', 4, 5, 8, false), ex('Soulevé de terre roumain', 'Ischios', 3, 6, 10, false), ex('Fentes marchées', 'Quadriceps', 3, 8, 12, false), ex('Mollets debout', 'Mollets', 4, 8, 15, false), ex('Relevés de jambes', 'Abdos', 3, 10, 15)] },
      { name: 'Haut B', exercises: [ex('Développé incliné haltères', 'Pectoraux', 3, 8, 12), ex('Tractions', 'Dos', 4, 6, 10), ex('Développé militaire', 'Épaules', 3, 6, 10), ex('Tirage horizontal', 'Dos', 3, 10, 12), ex('Élévations latérales', 'Épaules', 3, 12, 20), ex('Curl marteau', 'Biceps', 2, 10, 15)] },
      { name: 'Bas B', exercises: [ex('Soulevé de terre', 'Dos', 3, 3, 6, false), ex('Presse à cuisses', 'Quadriceps', 3, 10, 15, false), ex('Hip thrust', 'Fessiers', 3, 8, 12, false), ex('Leg curl', 'Ischios', 3, 10, 15, false), ex('Mollets assis', 'Mollets', 3, 10, 15, false)] },
    ] },
  ppl: { name: 'Push / Pull / Legs', days: 6, equipment: ['salle'], level: 'intermédiaire → avancé',
    why: 'Volume élevé par muscle, 2×/semaine à 6 jours (ou 1× à 3 jours). Demande du temps et une bonne récupération.',
    plan: [
      { name: 'Push', exercises: [ex('Développé couché', 'Pectoraux', 4, 5, 8), ex('Développé militaire', 'Épaules', 3, 6, 10), ex('Développé incliné haltères', 'Pectoraux', 3, 8, 12), ex('Élévations latérales', 'Épaules', 3, 12, 20), ex('Extensions triceps', 'Triceps', 3, 10, 15)] },
      { name: 'Pull', exercises: [ex('Tractions', 'Dos', 4, 6, 10), ex('Rowing barre', 'Dos', 3, 6, 10), ex('Tirage horizontal', 'Dos', 3, 10, 12), ex('Face pull', 'Épaules', 3, 12, 20), ex('Curl barre', 'Biceps', 3, 8, 12)] },
      { name: 'Legs', exercises: [ex('Squat', 'Quadriceps', 4, 5, 8, false), ex('Soulevé de terre roumain', 'Ischios', 3, 6, 10, false), ex('Presse à cuisses', 'Quadriceps', 3, 10, 15, false), ex('Leg curl', 'Ischios', 3, 10, 15, false), ex('Mollets debout', 'Mollets', 4, 8, 15, false)] },
    ] },
  force3: { name: 'Force — 3 jours', days: 3, equipment: ['salle'], level: 'tous niveaux',
    why: 'Mouvements de base lourds en alternance A/B, progression de charge chaque séance tant que possible.',
    plan: [
      { name: 'Force A', exercises: [ex('Squat', 'Quadriceps', 5, 3, 5, false), ex('Développé couché', 'Pectoraux', 5, 3, 5), ex('Rowing barre', 'Dos', 4, 5, 8), ex('Gainage / crunch', 'Abdos', 3, 10, 15)] },
      { name: 'Force B', exercises: [ex('Squat', 'Quadriceps', 5, 3, 5, false), ex('Développé militaire', 'Épaules', 5, 3, 5), ex('Soulevé de terre', 'Dos', 3, 3, 5, false), ex('Tractions', 'Dos', 3, 5, 8)] },
    ] },
  bodyweight3: { name: 'Poids du corps', days: 3, equipment: ['aucun'], level: 'tous niveaux', why: 'Aucun matériel : seulement des mouvements au poids du corps.', plan: [
      { name: 'Corps A', exercises: [ex('Fentes marchées', 'Quadriceps', 3, 8, 15, false), ex('Pompes', 'Pectoraux', 3, 8, 20), ex('Hip thrust', 'Fessiers', 3, 10, 20, false), ex('Planche', 'Abdos', 3, 30, 60)] },
      { name: 'Corps B', exercises: [ex('Squat pistol', 'Quadriceps', 3, 5, 10, false), ex('Pompes sautées', 'Pectoraux', 3, 5, 10), ex('Relevés de jambes', 'Abdos', 3, 8, 15), ex('Burpee', 'Quadriceps', 3, 8, 15, false)] },
    ] },
  home3: { name: 'Maison (haltères)', days: 3, equipment: ['maison'], level: 'débutant',
    why: 'Sans salle : variantes au poids du corps et haltères, à rendre plus difficiles quand les reps dépassent la plage.',
    plan: [
      { name: 'Maison A', exercises: [ex('Fentes bulgares', 'Fessiers', 3, 8, 15, false), ex('Pompes', 'Pectoraux', 3, 8, 20), ex('Rowing haltère', 'Dos', 3, 8, 15), ex('Planche', 'Abdos', 3, 30, 60)] },
      { name: 'Maison B', exercises: [ex('Squat avant', 'Quadriceps', 3, 8, 15, false), ex('Développé épaules haltères', 'Épaules', 3, 8, 15), ex('Tractions assistées', 'Dos', 3, 6, 12), ex('Relevés de jambes', 'Abdos', 3, 10, 15)] },
    ] },
};

// Modèle conseillé selon le nombre de jours et le matériel.
export function recommendTemplate({ days = 3, equipment = 'salle', goal = 'hypertrophie' } = {}) {
  if (equipment === 'aucun') return 'bodyweight3';
  if (equipment !== 'salle') return 'home3';
  if (goal === 'force') return 'force3';
  if (days >= 5) return 'ppl';
  if (days === 4) return 'upperlower4';
  return 'fullbody3';
}

const addDays = (iso, n) => { const d = parseDate(iso); d.setDate(d.getDate() + n); return isoDate(d); };
const weekdayOf = (iso) => ((parseDate(iso).getDay() + 6) % 7) + 1; // 1 = lundi … 7 = dimanche

// Jours d'entraînement conseillés (étalés pour récupérer) pour n séances / semaine.
export function defaultWeekdays(n) {
  return ({ 1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 7] })[Math.max(1, Math.min(7, n))];
}

// Construit un programme daté. Renvoie { plan, routines } (routines rangées dans le dossier du plan).
export function buildPlan({ templateId, goal = 'hypertrophie', start, end, weekdays, level = 'intermédiaire', id = 'p' + Date.now().toString(36) }) {
  const tpl = TEMPLATES[templateId] || TEMPLATES.fullbody3;
  const weeks = Math.max(4, Math.min(52, Math.ceil(((parseDate(end || addDays(start, 84)) - parseDate(start)) / 86400000 + 1) / 7)));
  const deloadEvery = level === 'débutant' ? 6 : 4;
  const [rMin, rMax] = GOAL_REPS[goal] || GOAL_REPS.hypertrophie;
  const folder = `${tpl.name} · ${PLAN_GOALS[goal] || ''}`.trim();
  const routines = tpl.plan.map((d, i) => ({
    id: `${id}-${i}`, name: d.name, folder,
    exercises: d.exercises.map((e) => {
      // Gros mouvements polyarticulaires : bas de plage ; isolation : haut de plage.
      const heavy = e.repMax <= 10;
      const repMin = e.muscle === 'Abdos' && e.repMin >= 30 ? e.repMin : heavy ? rMin : Math.max(rMin, Math.round((rMin + rMax) / 2));
      const repMax = e.muscle === 'Abdos' && e.repMin >= 30 ? e.repMax : heavy ? Math.max(repMin + 2, Math.round((rMin + rMax) / 2) + 2) : rMax + 3;
      return { ...e, repMin, repMax, rest: heavy ? (goal === 'force' ? 180 : 150) : 90 };
    }),
  }));
  const phases = weeks >= 8
    ? [{ from: 1, to: Math.floor(weeks / 2), name: 'Accumulation', focus: 'Volume élevé, charges modérées, technique.' },
       { from: Math.floor(weeks / 2) + 1, to: weeks - (goal === 'force' || goal === 'evenement' ? 1 : 0), name: 'Intensification', focus: 'Charges plus lourdes, un peu moins de séries.' },
       ...(goal === 'force' || goal === 'evenement' ? [{ from: weeks, to: weeks, name: 'Affûtage', focus: 'Volume réduit de moitié, intensité maintenue : arriver frais.' }] : [])]
    : [{ from: 1, to: weeks, name: 'Progression', focus: 'Double progression : reps puis charge.' }];
  const end2 = addDays(start, weeks * 7 - 1);
  return {
    plan: { id, templateId, name: folder, goal, level, start, end: end2, weeks, weekdays: [...weekdays].sort(), deloadEvery, phases, routineIds: routines.map((r) => r.id) },
    routines,
  };
}

export const weekOf = (plan, iso) => Math.floor((parseDate(iso) - parseDate(plan.start)) / (7 * 86400000)) + 1;
export const isDeload = (plan, week) => week > 0 && week % plan.deloadEvery === 0 && week !== plan.weeks;
export const phaseOf = (plan, week) => plan.phases.find((p) => week >= p.from && week <= p.to) || plan.phases[plan.phases.length - 1];

// Séances prévues entre deux dates : rotation des routines dans l'ordre sur les jours choisis.
export function schedule(plan, from = plan.start, to = plan.end) {
  const out = [];
  let k = 0;
  for (let d = plan.start; d <= plan.end; d = addDays(d, 1)) {
    if (!plan.weekdays.includes(weekdayOf(d))) continue;
    const week = weekOf(plan, d);
    const ev = { date: d, routineId: plan.routineIds[k % plan.routineIds.length], week, deload: isDeload(plan, week) };
    k++;
    if (d >= from && d <= to) out.push(ev);
  }
  return out;
}

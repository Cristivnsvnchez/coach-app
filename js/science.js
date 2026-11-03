// Calculs nutrition / entraînement. Fonctions pures, sans DOM (testées sous Node).
// Références affichées dans l'app : voir REFS en bas de fichier.

export const KCAL_PER_KG = 7700;
const DAY = 86400000;

// Niveaux d'activité physique (PAL), FAO/WHO/UNU 2004.
export const PAL = {
  sedentaire: { value: 1.45, label: 'Sédentaire (bureau, peu de marche)' },
  leger: { value: 1.6, label: 'Légèrement actif (marche, 1–2 séances/sem)' },
  actif: { value: 1.8, label: 'Actif (3–4 séances/sem)' },
  tres_actif: { value: 2.0, label: 'Très actif (5–6 séances/sem)' },
  extreme: { value: 2.2, label: 'Extrêmement actif (travail physique + sport)' },
};

export const GOALS = {
  perte: { label: 'Perte de gras', proteinPerKg: 2.0, rates: [0.25, 0.5, 0.75, 1] },
  maintien: { label: 'Maintien / recomposition', proteinPerKg: 1.6, rates: [0] },
  prise: { label: 'Prise de muscle', proteinPerKg: 1.8, rates: [0.25, 0.5] },
};

export const isProfileComplete = (p) =>
  !!(p && p.sex && p.age > 0 && p.height > 0 && p.weight > 0 && PAL[p.activity] && GOALS[p.goal]);

export const parseDate = (s) => new Date(s + 'T12:00:00');
export const isoDate = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / DAY);

// Métabolisme de base : Mifflin-St Jeor 1990, ou Katch-McArdle si % de masse grasse connu.
export function bmr({ weight, height, age, sex, bodyFat }) {
  if (bodyFat > 0 && bodyFat < 70) return 370 + 21.6 * weight * (1 - bodyFat / 100);
  return 10 * weight + 6.25 * height - 5 * age + (sex === 'M' ? 5 : -161);
}

export const tdeeInitial = (p) => bmr(p) * PAL[p.activity].value;

// Moyenne mobile exponentielle des pesées (α = 0,1).
export function emaTrend(weights, alpha = 0.1) {
  const sorted = [...weights].sort((a, b) => (a.date < b.date ? -1 : 1));
  let t = null;
  return sorted.map((w) => {
    t = t === null ? w.kg : t + alpha * (w.kg - t);
    return { date: w.date, kg: w.kg, trend: t };
  });
}

// Pente (kg/jour) par régression linéaire sur des points {x: jours, y: kg}.
export function slope(points) {
  const n = points.length;
  if (n < 2) return 0;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0, den = 0;
  for (const p of points) { num += (p.x - mx) * (p.y - my); den += (p.x - mx) ** 2; }
  return den ? num / den : 0;
}

// Pente de la tendance sur les `window` derniers jours.
export function trendSlope(trend, today, window = 21) {
  const pts = trend
    .map((t) => ({ x: daysBetween(today, t.date), y: t.trend }))
    .filter((p) => p.x > -window && p.x <= 0);
  return pts.length >= 2 && pts[pts.length - 1].x - pts[0].x >= 7 ? slope(pts) : null;
}

// Dépense adaptative : apport moyen loggé − variation de la tendance × 7700.
// intakes : { 'YYYY-MM-DD': kcal }. Jours non loggés (0 ou absents) exclus.
export function adaptiveTdee({ profile, weights, intakes, today, window = 21, minDays = 10 }) {
  const formula = tdeeInitial(profile);
  const logged = Object.entries(intakes).filter(([d, k]) => {
    const x = daysBetween(today, d);
    return k > 0 && x > -window && x < 0; // la journée en cours, incomplète, est exclue
  });
  const s = trendSlope(emaTrend(weights), today, window);
  if (logged.length < minDays || s === null) {
    return { tdee: formula, formula, method: 'formule', loggedDays: logged.length };
  }
  const meanIn = logged.reduce((a, [, k]) => a + k, 0) / logged.length;
  const observed = Math.min(Math.max(meanIn - s * KCAL_PER_KG, formula * 0.7), formula * 1.4);
  const w = Math.min(1, logged.length / 28);
  return {
    tdee: (1 - w) * formula + w * observed,
    formula, observed, method: 'adaptatif', loggedDays: logged.length,
  };
}

export const bmi = (kg, cm) => kg / (cm / 100) ** 2;

// Objectifs journaliers. Renvoie null si le profil est incomplet.
export function targets(profile, tdee = profile && isProfileComplete(profile) ? tdeeInitial(profile) : 0) {
  if (!isProfileComplete(profile)) return null;
  const { weight: w, sex, goal, height } = profile;
  const rate = goal === 'maintien' ? 0 : Number(profile.rate ?? 0.5);
  const weekly = (w * rate) / 100 * KCAL_PER_KG / 7;
  const floor = sex === 'F' ? 1200 : 1500;
  let kcal = tdee, floored = false;
  if (goal === 'perte') {
    kcal = tdee - Math.min(weekly, 0.25 * tdee);
    if (kcal < floor) { kcal = floor; floored = true; }
  } else if (goal === 'prise') {
    kcal = tdee + Math.min(weekly, 0.15 * tdee);
  }
  // En cas d'obésité, protéines calculées sur le poids correspondant à un IMC de 24,9.
  const refW = bmi(w, height) >= 30 ? 24.9 * (height / 100) ** 2 : w;
  const protein = refW * GOALS[goal].proteinPerKg;
  const fat = Math.max(0.6 * w, (0.25 * kcal) / 9);
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  return {
    kcal: Math.round(kcal), tdee: Math.round(tdee), floored,
    protein: Math.round(protein), fat: Math.round(fat), carbs: Math.round(carbs),
    fiber: Math.max(30, Math.round((14 * kcal) / 1000)),
    waterL: (sex === 'M' ? 2.5 : 2.0),
    weeklyChangeKg: goal === 'maintien' ? 0 : ((goal === 'perte' ? -1 : 1) * w * rate) / 100,
  };
}

// Poids de référence : fourchette IMC OMS + formules Devine 1974, Robinson 1983, Hamwi 1964.
export function idealRange({ height, sex }) {
  const m2 = (height / 100) ** 2;
  const inch = Math.max(0, height / 2.54 - 60);
  const M = sex === 'M';
  const formulas = {
    devine: (M ? 50 : 45.5) + 2.3 * inch,
    robinson: M ? 52 + 1.9 * inch : 49 + 1.7 * inch,
    hamwi: M ? 48 + 2.7 * inch : 45.5 + 2.2 * inch,
  };
  const vals = Object.values(formulas);
  return {
    bmiMin: 18.5 * m2, bmiMax: 24.9 * m2,
    formulas, formulaMin: Math.min(...vals), formulaMax: Math.max(...vals),
    reliable: height >= 152,
  };
}

// Date estimée d'arrivée au poids cible. kgPerWeek signé (négatif = perte).
export function etaDate(currentKg, targetKg, kgPerWeek, today) {
  const gap = targetKg - currentKg;
  if (Math.abs(gap) < 0.1) return parseDate(today);
  if (!kgPerWeek || Math.sign(gap) !== Math.sign(kgPerWeek)) return null;
  return new Date(parseDate(today).getTime() + (gap / kgPerWeek) * 7 * DAY);
}

// Jalons intermédiaires (25 %, 50 %, 75 %, 100 % du chemin).
export function milestones(startKg, targetKg, kgPerWeek, today) {
  return [0.25, 0.5, 0.75, 1].map((f) => {
    const kg = startKg + (targetKg - startKg) * f;
    return { pct: f * 100, kg, date: etaDate(startKg, kg, kgPerWeek, today) };
  });
}

export const epley1RM = (kg, reps) => (reps <= 1 ? kg : kg * (1 + reps / 30));

const round05 = (x) => Math.round(x * 2) / 2;

// Double progression (ACSM 2009) : toutes les séries au rep max avec RIR ≥ 1 → charge +2,5 % (haut du corps)
// ou +5 % (bas), retour au rep min ; 2 séances ratées → décharge −10 % ; sinon +1 rep.
export function nextSet({ load, reps, repMin, repMax, rir = 2, upper = true, failedSessions = 0 }) {
  // Poids du corps (0 kg) : on progresse en répétitions uniquement.
  if (!load) {
    const top = reps.length ? Math.max(...reps) : repMin;
    return { load: 0, reps: Math.max(repMin, top + 1), why: top + 1 > repMax ? 'Poids du corps : passe à une variante plus difficile ou ajoute du lest' : 'Poids du corps : +1 rep' };
  }
  if (failedSessions >= 2) return { load: round05(load * 0.9), reps: repMin, why: 'Décharge −10 % après 2 séances ratées' };
  if (reps.length && reps.every((r) => r >= repMax) && rir >= 1) {
    const inc = upper ? 1.025 : 1.05;
    return { load: Math.max(round05(load * inc), load + (upper ? 1 : 2.5)), reps: repMin, why: `Toutes les séries à ${repMax} reps → charge augmentée` };
  }
  const minDone = reps.length ? Math.min(...reps) : repMin;
  return { load, reps: Math.min(repMax, Math.max(repMin, minDone + 1)), why: 'Même charge, +1 rep' };
}

export const MUSCLES = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Quadriceps', 'Ischios', 'Fessiers', 'Mollets', 'Abdos'];

export const REFS = [
  { k: 'Mifflin 1990', t: 'Mifflin MD et al. Am J Clin Nutr 51:241-7', url: 'https://doi.org/10.1093/ajcn/51.2.241' },
  { k: 'FAO/OMS 2004', t: 'Human energy requirements (PAL)', url: 'https://www.fao.org/4/y5686e/y5686e07.htm' },
  { k: 'Hall 2011', t: 'Hall KD et al. Lancet 378:826-37 — dynamique de la perte de poids', url: 'https://doi.org/10.1016/S0140-6736(11)60812-X' },
  { k: 'Helms 2014', t: 'Helms ER et al. JISSN 11:20 — préparation physique naturelle', url: 'https://doi.org/10.1186/1550-2783-11-20' },
  { k: 'Helms 2014b', t: 'Helms ER et al. IJSNEM 24:127-38 — protéines en déficit (2,3–3,1 g/kg masse maigre)', url: 'https://doi.org/10.1123/ijsnem.2013-0054' },
  { k: 'Garthe 2011', t: 'Garthe I et al. IJSNEM 21:97-104 — perte lente vs rapide', url: 'https://pubmed.ncbi.nlm.nih.gov/21558571/' },
  { k: 'Morton 2018', t: 'Morton RW et al. Br J Sports Med 52:376-84 — protéines', url: 'https://doi.org/10.1136/bjsports-2017-097608' },
  { k: 'Jäger 2017', t: 'Position ISSN protéines, JISSN 14:20', url: 'https://doi.org/10.1186/s12970-017-0177-8' },
  { k: 'Schoenfeld 2017', t: 'Volume et hypertrophie, J Sports Sci 35:1073-82', url: 'https://doi.org/10.1080/02640414.2016.1210197' },
  { k: 'OMS 2020', t: 'Bull FC et al. Br J Sports Med 54:1451-62 — activité physique', url: 'https://doi.org/10.1136/bjsports-2020-102955' },
];

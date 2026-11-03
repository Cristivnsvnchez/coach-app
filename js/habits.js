// Checklist quotidienne : habitudes auto-cochées d'après les données du jour + habitudes manuelles, et série de jours.
// Fonctions pures (testées sous Node) : l'état est passé en paramètre.
import { isoDate, parseDate } from './science.js';

// Habitudes auto : `check(ctx)` reçoit { totals, targets, water, weighed, trained }.
export const AUTO = {
  protein: { name: 'Protéines atteintes', check: (c) => c.targets && c.totals.p >= c.targets.protein * 0.95 },
  kcal: { name: 'Kcal dans la cible (±10 %)', check: (c) => c.targets && c.totals.kcal > 0 && Math.abs(c.totals.kcal - c.targets.kcal) <= c.targets.kcal * 0.1 },
  fiber: { name: 'Fibres ≥ objectif', check: (c) => c.targets && c.totals.fib >= c.targets.fiber },
  water: { name: "Objectif d'eau", check: (c) => c.water >= (c.targets?.waterL ?? 2) * 1000 },
  weigh: { name: 'Pesée du jour', check: (c) => c.weighed },
  workout: { name: 'Séance ou repos actif', check: (c) => c.trained, manual: true }, // cochable à la main les jours de repos
};

export const DEFAULT_HABITS = [
  { id: 'protein', auto: true }, { id: 'kcal', auto: true }, { id: 'water', auto: true },
  { id: 'weigh', auto: true }, { id: 'workout', auto: true },
  { id: 'sleep', name: 'Sommeil ≥ 7 h' },
  { id: 'steps', name: '8 000 pas' },
  { id: 'veg', name: '5 portions de fruits et légumes' },
];

export const habitName = (h) => (h.auto ? AUTO[h.id]?.name : h.name) || h.name || h.id;

// État de chaque habitude pour un jour. manualLog = { habitId: true } pour ce jour.
export function dayStatus(habits, ctx, manualLog = {}) {
  return habits.map((h) => {
    const a = h.auto ? AUTO[h.id] : null;
    const autoDone = a ? !!a.check(ctx) : false;
    const done = autoDone || !!manualLog[h.id];
    return { ...h, name: habitName(h), done, autoDone, tappable: !a || !!a.manual };
  });
}

// Taux de complétion d'un jour (0–1).
export const completion = (status) => (status.length ? status.filter((s) => s.done).length / status.length : 0);

// Série : jours consécutifs (en remontant depuis aujourd'hui) où le taux ≥ seuil.
// Aujourd'hui, encore en cours, ne casse pas la série s'il n'est pas atteint.
export function streak(ratesByDay, today, threshold = 0.8) {
  let n = 0;
  const d = parseDate(today);
  for (let i = 0; i < 3650; i++) {
    const key = isoDate(new Date(d.getTime() - i * 86400000));
    const r = ratesByDay[key] ?? 0;
    if (r >= threshold) n++;
    else if (i > 0) break;
  }
  return n;
}

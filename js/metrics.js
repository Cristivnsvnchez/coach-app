// Objectifs du jour calculés à partir du profil, du dernier poids et de la dépense adaptative.
import * as S from './science.js';
import { state, latestWeight, intakesByDay, today } from './store.js';

export function current() {
  const profile = { ...state.profile, weight: latestWeight() };
  if (!S.isProfileComplete(profile)) return { profile, targets: null, energy: null };
  // Garde-fou : pas d'objectifs chiffrés pour mineurs, grossesse/allaitement, TCA ou pathologie déclarée.
  if (profile.age < 18 || profile.medical) return { profile, targets: null, energy: null, blocked: true };
  const energy = S.adaptiveTdee({ profile, weights: state.weights, intakes: intakesByDay(), today: today() });
  return { profile, energy, targets: S.targets(profile, energy.tdee) };
}

// Vitesse réelle (kg/sem) d'après la tendance des 21 derniers jours, ou null.
export function observedKgPerWeek() {
  const s = S.trendSlope(S.emaTrend(state.weights), today(), 21);
  return s === null ? null : s * 7;
}

// Volume hebdomadaire (séries effectuées) par groupe musculaire, 7 derniers jours.
export function weeklyVolume() {
  const since = S.isoDate(new Date(Date.now() - 7 * 86400000));
  const vol = Object.fromEntries(S.MUSCLES.map((m) => [m, 0]));
  for (const w of state.workouts) {
    if (w.date < since) continue;
    for (const ex of w.exercises) vol[ex.muscle] = (vol[ex.muscle] || 0) + ex.sets.filter((s) => s.done).length;
  }
  return vol;
}

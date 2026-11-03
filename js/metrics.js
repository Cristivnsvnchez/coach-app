// Objectifs du jour calculés à partir du profil, du dernier poids et de la dépense adaptative.
import * as S from './science.js';
import { state, latestWeight, intakesByDay, today, sum } from './store.js';
import { dayStatus, completion } from './habits.js';

export function current() {
  const profile = { ...state.profile, weight: latestWeight() };
  if (!S.isProfileComplete(profile)) return { profile, targets: null, energy: null };
  // Garde-fou : pas d'objectifs chiffrés pour mineurs, grossesse/allaitement, TCA ou pathologie déclarée.
  if (profile.age < 18 || profile.medical) return { profile, targets: null, energy: null, blocked: true };
  const energy = S.adaptiveTdee({ profile, weights: state.weights, intakes: intakesByDay(), today: today() });
  const auto = S.targets(profile, energy.tdee);
  return { profile, energy, auto, targets: S.applyCustom(auto, state.profile.custom, profile.sex) };
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

// Checklist d'un jour : contexte calculé à partir du journal, des pesées et des séances.
export function habitStatus(date = today(), targets = current().targets) {
  const log = state.logs[date] || { meals: [], water: 0 };
  const ctx = {
    totals: sum(log.meals), targets, water: log.water,
    weighed: state.weights.some((w) => w.date === date),
    trained: state.workouts.some((w) => w.date === date),
  };
  return dayStatus(state.habits, ctx, state.habitLog[date] || {});
}

// Taux de complétion des `days` derniers jours : { date: 0–1 }.
export function habitRates(days = 60) {
  const out = {}, targets = current().targets; // objectifs actuels appliqués aux jours passés (approximation)
  for (let i = 0; i < days; i++) {
    const d = S.isoDate(new Date(Date.now() - i * 86400000));
    out[d] = completion(habitStatus(d, targets));
  }
  return out;
}

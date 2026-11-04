// Suivi du cycle menstruel (pur, testé sous Node) : durées moyennes, prédictions, phase d'un jour,
// effets à signaler sur le poids et l'entraînement, garde-fous. Méthode calendrier = estimation, jamais contraception.
import { isoDate, parseDate } from './science.js';

const DAY = 86400000;
const diffDays = (a, b) => Math.round((parseDate(b) - parseDate(a)) / DAY);
const add = (iso, n) => isoDate(new Date(parseDate(iso).getTime() + n * DAY));

export const SYMPTOMS = ['Crampes', 'Fatigue', 'Ballonnements', 'Maux de tête', 'Humeur basse', 'Seins sensibles', 'Fringales', 'Sommeil perturbé', 'Acné'];
export const FLOWS = { light: 'Léger', medium: 'Moyen', heavy: 'Abondant' };

const starts = (c) => [...(c?.periods || [])].map((p) => p.start).filter(Boolean).sort();

// Durée moyenne du cycle : moyenne des 6 derniers intervalles plausibles (18–45 j), sinon valeur saisie.
export function avgCycleLen(c) {
  const s = starts(c);
  const gaps = s.slice(1).map((d, i) => diffDays(s[i], d)).filter((g) => g >= 18 && g <= 45).slice(-6);
  return gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : (c?.cycleLen || 28);
}
export function avgPeriodLen(c) {
  const done = (c?.periods || []).filter((p) => p.start && p.end).map((p) => diffDays(p.start, p.end) + 1).filter((n) => n >= 1 && n <= 12).slice(-6);
  return done.length ? Math.round(done.reduce((a, b) => a + b, 0) / done.length) : (c?.periodLen || 5);
}

// Début de cycle applicable à une date : dernier début réel ≤ date, sinon prolongé par la durée moyenne (prédit).
export function cycleStartFor(c, date) {
  const s = starts(c).filter((d) => d <= date);
  if (!s.length) return null;
  const L = avgCycleLen(c);
  let start = s[s.length - 1], predicted = false;
  while (diffDays(start, date) >= L) { start = add(start, L); predicted = true; }
  return { start, predicted };
}

// Phase d'un jour. Ovulation estimée = jour (L − 14) ; fenêtre fertile = ovulation −5 à +1 ; SPM ≈ 5 derniers jours.
export function phaseOn(c, date) {
  if (!c?.enabled) return null;
  const cs = cycleStartFor(c, date);
  if (!cs) return null;
  const L = avgCycleLen(c), P = avgPeriodLen(c), day = diffDays(cs.start, date) + 1;
  const isPeriod = day <= P;
  if (c.hormonal) return { day, L, phase: isPeriod ? 'menstruelle' : 'hormonale', isPeriod, fertile: false, pms: false, predicted: cs.predicted };
  const O = L - 14;
  const phase = isPeriod ? 'menstruelle' : day < O - 1 ? 'folliculaire' : day <= O + 1 ? 'ovulatoire' : 'lutéale';
  return { day, L, O, phase, isPeriod, fertile: day >= O - 5 && day <= O + 1, pms: day > L - 5, predicted: cs.predicted };
}

// Prochains débuts de règles prédits (à partir du dernier début réel).
export function nextStarts(c, today, n = 3) {
  const s = starts(c);
  if (!s.length) return [];
  const L = avgCycleLen(c);
  let d = s[s.length - 1];
  const out = [];
  while (out.length < n) { d = add(d, L); if (d > today) out.push(d); }
  return out;
}

export function nextOvulation(c, today) {
  if (!c?.enabled || c.hormonal) return null;
  const L = avgCycleLen(c);
  const cs = cycleStartFor(c, today);
  if (!cs) return null;
  let ov = add(cs.start, L - 14 - 1);
  if (ov < today) ov = add(ov, L);
  return ov;
}

// Effet probable sur la pesée : rétention d'eau fréquente en fin de phase lutéale et en début de règles.
export function weightNote(c, date) {
  const ph = phaseOn(c, date);
  if (!ph) return null;
  if (ph.pms || (ph.isPeriod && ph.day <= 2)) return 'retention';
  return null;
}

// Conseil d'entraînement : basé sur les symptômes du jour, pas sur des règles rigides par phase.
export function trainingNote(c, date) {
  const ph = phaseOn(c, date);
  if (!ph) return null;
  const sym = c.logs?.[date]?.symptoms || [];
  if (sym.some((x) => ['Crampes', 'Fatigue', 'Maux de tête'].includes(x)) || c.logs?.[date]?.flow === 'heavy') return 'ease';
  if (ph.isPeriod && ph.day <= 2) return 'listen';
  return null;
}

// Garde-fous : cycles très courts / longs, absence de règles prolongée.
export function alerts(c, today) {
  if (!c?.enabled || c.hormonal) return [];
  const s = starts(c), out = [];
  if (s.length >= 3) { const L = avgCycleLen(c); if (L < 21 || L > 35) out.push('irregular'); }
  if (s.length && diffDays(s[s.length - 1], today) > 90) out.push('amenorrhea');
  return out;
}

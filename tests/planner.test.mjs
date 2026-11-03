import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../js/planner.js';
import { LIBRARY } from '../js/exercises.js';

test('modèle conseillé selon jours, matériel et objectif', () => {
  assert.equal(P.recommendTemplate({ days: 3 }), 'fullbody3');
  assert.equal(P.recommendTemplate({ days: 4 }), 'upperlower4');
  assert.equal(P.recommendTemplate({ days: 6 }), 'ppl');
  assert.equal(P.recommendTemplate({ days: 3, equipment: 'maison' }), 'home3');
  assert.equal(P.recommendTemplate({ days: 3, goal: 'force' }), 'force3');
});

test('tous les exercices des modèles existent dans la bibliothèque', () => {
  const names = new Set(LIBRARY.map((e) => e.name));
  for (const tpl of Object.values(P.TEMPLATES)) for (const d of tpl.plan) for (const e of d.exercises) assert.ok(names.has(e.name), e.name);
});

test('programme daté : semaines, phases, décharges, rotation sur les jours choisis', () => {
  // Lundi 5 janv. 2026 → dimanche 29 mars 2026 = 12 semaines, lun/mer/ven.
  const { plan, routines } = P.buildPlan({ templateId: 'fullbody3', goal: 'force', start: '2026-01-05', end: '2026-03-29', weekdays: [1, 3, 5] });
  assert.equal(plan.weeks, 12);
  assert.equal(routines.length, 3);
  assert.equal(plan.phases.at(-1).name, 'Affûtage');
  assert.ok(P.isDeload(plan, 4) && P.isDeload(plan, 8) && !P.isDeload(plan, 12));
  const ev = P.schedule(plan);
  assert.equal(ev.length, 36);
  assert.deepEqual(ev.slice(0, 4).map((e) => e.date), ['2026-01-05', '2026-01-07', '2026-01-09', '2026-01-12']);
  assert.equal(ev[3].routineId, routines[0].id); // rotation A, B, C, A…
  assert.ok(ev.filter((e) => e.deload).every((e) => e.week === 4 || e.week === 8));
  // Force : gros mouvements en 3–5/6 reps
  assert.equal(routines[0].exercises[0].repMin, 3);
});

test('export .ics : événements, heure locale, rappel', () => {
  const ics = P.toICS([{ date: '2026-01-05', routineId: 'r1', title: 'Full body A, semaine 1' }], { time: '07:30', minutes: 45, alarm: 15 });
  assert.match(ics, /BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20260105T073000\r\n/);
  assert.match(ics, /DTEND:20260105T081500\r\n/);
  assert.match(ics, /SUMMARY:Full body A\\, semaine 1/);
  assert.match(ics, /TRIGGER:-PT15M/);
});

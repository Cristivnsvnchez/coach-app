import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/strava.js';

const run = { id: 1, type: 'Run', name: 'Footing', start_date_local: '2026-03-04T07:30:00Z', distance: 10000, moving_time: 3000, total_elevation_gain: 40, average_heartrate: 150, max_heartrate: 175 };

test('normalisation : date locale, FC, kcal estimées par MET', () => {
  const a = S.normalize(run, 70);
  assert.equal(a.date, '2026-03-04');
  assert.equal(a.avg_hr, 150);
  assert.equal(a.est, true);
  assert.equal(a.calories, Math.round(9.8 * 70 * (3000 / 3600)));
});
test('kcal officielles conservées, vélo = kJ', () => {
  assert.equal(S.normalize({ ...run, calories: 612 }, 70).calories, 612);
  assert.equal(S.estimateKcal({ type: 'Ride', kj: 800, moving_s: 7200 }, 70), 800);
  assert.equal(S.estimateKcal({ type: 'Walk', moving_s: 3600 }, 80), 280);
  assert.equal(S.estimateKcal({ type: 'Swim', moving_s: 3600 }, 70), 560);
  assert.equal(S.estimateKcal({ type: 'Yoga', moving_s: 3600 }, 70), 420);
  assert.equal(S.estimateKcal({ type: 'Run', moving_s: 3600 }, 0), Math.round(9.8 * 70));
});
test('familles et filtres', () => {
  assert.equal(S.kindOf('TrailRun'), 'run'); assert.equal(S.kindOf('VirtualRide'), 'ride');
  assert.equal(S.filterOf({ type: 'Hike' }), 'other');
  assert.equal(S.applyFilter([{ type: 'Run' }, { type: 'Swim' }], 'swim').length, 1);
});
test('charge = minutes × facteur FC', () => {
  assert.equal(S.trainingLoad({ moving_s: 3600, avg_hr: 0 }), 60);
  assert.equal(S.trainingLoad({ moving_s: 3600, avg_hr: 150 }), 78);
  assert.equal(S.trainingLoad({ moving_s: 3600, avg_hr: 170 }), 96);
  assert.equal(S.isHeavy({ moving_s: 3600, avg_hr: 170 }), true);
  assert.equal(S.isHeavy({ moving_s: 1800, avg_hr: 130 }), false);
});
const mk = (id, date, min, hr = 0) => ({ id, type: 'Run', date, distance_m: 5000, moving_s: min * 60, calories: min * 10, avg_hr: hr });
test('regroupement semaine (lundi) et par jour', () => {
  const l = [mk(1, '2026-03-02', 30), mk(2, '2026-03-02', 30), mk(3, '2026-03-08', 60), mk(4, '2026-03-09', 99)];
  const w = S.weekSummary(l, '2026-03-02');
  assert.equal(w.count, 3); assert.equal(w.km, 15); assert.equal(w.min, 120); assert.equal(w.kcal, 1200);
  assert.equal(w.days[0].count, 2); assert.equal(w.days[6].min, 60);
  assert.equal(Object.keys(S.groupByDay(l)).length, 3);
});
test('comparaison à la moyenne des 4 semaines', () => {
  const l = [mk(1, '2026-02-02', 100), mk(2, '2026-02-09', 100), mk(3, '2026-02-16', 100), mk(4, '2026-02-23', 100), mk(5, '2026-03-03', 150)];
  assert.deepEqual(S.compareLoad(l, '2026-03-02'), { current: 150, avg: 100, pct: 50 });
  assert.equal(S.compareLoad([], '2026-03-02').pct, null);
});
test('fusion : kcal officielles gardées, tri récent d\'abord', () => {
  const m = S.mergeActivities([{ id: 1, date: '2026-03-01', calories: 500, est: false }], [{ id: 1, date: '2026-03-01', calories: 300, est: true }, { id: 2, date: '2026-03-05', calories: 100, est: true }]);
  assert.equal(m[1].calories, 500); assert.equal(m[0].id, 2);
});
test('URL d\'autorisation et zones FC', () => {
  const u = new URL(S.authorizeUrl(' 123 '));
  assert.equal(u.searchParams.get('client_id'), '123');
  assert.equal(u.searchParams.get('redirect_uri'), 'https://cristivnsvnchez.github.io/coach-app/strava-callback.html');
  assert.equal(u.searchParams.get('scope'), 'read,activity:read_all');
  assert.equal(u.searchParams.get('approval_prompt'), 'auto');
  assert.equal(S.hrZone(150, 180), 4); assert.equal(S.hrZone(0, 180), 0);
});
test('contrat : non connecté par défaut', () => {
  assert.equal(S.isConnected(), false); assert.deepEqual(S.activitiesOn('2026-03-01'), []); assert.equal(S.kcalBurnedOn('2026-03-01'), 0);
});

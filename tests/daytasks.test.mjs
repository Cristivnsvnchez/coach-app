import test from 'node:test';
import assert from 'node:assert/strict';
import { addTask, toggleTask, removeTask, tasksLeft, cleanDayTasks, suggestTasks } from '../js/habits.js';

const D = '2026-11-06';

test('tâche du jour : ajout limité à ce jour, nom nettoyé, vide refusé', () => {
  const by = {};
  assert.equal(addTask(by, D, '   '), null);
  const t = addTask(by, D, '  Aller au magasin  ', 'a');
  assert.deepEqual(t, { id: 'a', name: 'Aller au magasin', done: false });
  assert.deepEqual(Object.keys(by), [D]);
  assert.equal(addTask(by, D, 'x'.repeat(200), 'b').name.length, 80);
});

test('tâche du jour : cocher, compter les restantes, supprimer', () => {
  const by = {};
  addTask(by, D, 'Courses', 'a'); addTask(by, D, 'Poster le colis', 'b');
  assert.equal(tasksLeft(by, D), 2);
  toggleTask(by, D, 'a');
  assert.equal(tasksLeft(by, D), 1);
  assert.equal(tasksLeft(by, '2026-11-07'), 0);
  assert.equal(removeTask(by, D, 'a'), true);
  assert.equal(removeTask(by, D, 'zz'), false);
  removeTask(by, D, 'b');
  assert.deepEqual(by, {}); // jour vidé : clé retirée
});

test('tâches du jour : données importées nettoyées', () => {
  const out = cleanDayTasks({ [D]: [{ id: 'a', name: 'Courses', done: 1 }, { name: '' }, null, 'x'], bad: 'x', '2026-11-07': [] });
  assert.deepEqual(out, { [D]: [{ id: 'a', name: 'Courses', done: true }] });
  assert.deepEqual(cleanDayTasks(null), {});
  assert.deepEqual(cleanDayTasks([]), {});
});

test('idées du jour : courses le jour des courses et la veille, séance prévue nommée', () => {
  // 2026-11-07 = samedi (shopDay 6), 2026-11-06 = vendredi (veille), 2026-11-04 = mercredi
  const keys = (o) => suggestTasks(o).map((s) => s.name);
  const shop = 'Faire les courses pour la semaine prochaine';
  assert.ok(keys({ date: '2026-11-07', shopDay: 6 }).includes(shop));
  assert.ok(keys({ date: '2026-11-06', shopDay: 6 }).includes(shop));
  assert.ok(!keys({ date: '2026-11-04', shopDay: 6 }).includes(shop));
  assert.equal(keys({ date: '2026-11-04', shopDay: 6 })[0], 'Aller au sport');
  const s = suggestTasks({ date: '2026-11-04', workoutName: 'Jour A' })[0];
  assert.deepEqual(s, { name: 'Aller au sport : {r}', vars: { r: 'Jour A' } });
  assert.equal(new Set(keys({ date: '2026-11-07' })).size, keys({ date: '2026-11-07' }).length);
});

test('habitudes par défaut : actions concrètes, anciennes valeurs par défaut migrées', async () => {
  const { DEFAULT_HABITS, migrateHabits } = await import('../js/habits.js');
  const names = DEFAULT_HABITS.filter((h) => !h.auto).map((h) => h.name);
  assert.deepEqual(names, ['Faire 10 000 pas', 'Dormir au moins 7 h']);
  const old = [{ id: 'protein', auto: true }, { id: 'sleep', name: 'Sommeil ≥ 7 h' }, { id: 'steps', name: '8 000 pas' },
    { id: 'veg', name: '5 portions de fruits et légumes' }, { id: 'c-1', name: 'Créatine' }, { id: 'steps2', name: '8 000 pas' }];
  assert.deepEqual(migrateHabits(old).map((h) => h.name || h.id), ['protein', 'Dormir au moins 7 h', 'Faire 10 000 pas', 'Créatine', '8 000 pas']);
  // une habitude renommée par l'utilisateur n'est pas touchée
  assert.equal(migrateHabits([{ id: 'steps', name: '12 000 pas' }])[0].name, '12 000 pas');
});

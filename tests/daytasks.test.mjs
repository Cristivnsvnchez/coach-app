import test from 'node:test';
import assert from 'node:assert/strict';
import { addTask, toggleTask, removeTask, tasksLeft, cleanDayTasks } from '../js/habits.js';

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

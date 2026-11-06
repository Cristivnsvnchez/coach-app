// Checklist du jour (rendue dans l'onglet Aujourd'hui) + feuille de réglage des habitudes.
import { state, save, today, uid } from '../store.js';
import { habitStatus, habitRates } from '../metrics.js';
import { AUTO, streak, habitName, addTask, toggleTask, removeTask, tasksLeft } from '../habits.js';
import { isoDate, parseDate } from '../science.js';
import { esc, sheet, group, fmtDate, toast } from '../ui.js';
import { icon } from '../icons.js';
import { t, register } from '../i18n.js';

register({
  en: { 'Pour ce jour seulement': 'For this day only', 'Ex : aller au magasin, poster un colis…': 'E.g. go to the store, post a parcel…',
    '{n} tâche(s) à faire': '{n} task(s) to do', 'Tâche supprimée': 'Task removed', 'Ajouter une tâche pour ce jour': 'Add a task for this day' },
  nl: { 'Pour ce jour seulement': 'Alleen voor deze dag', 'Ex : aller au magasin, poster un colis…': 'Bijv. naar de winkel, pakje posten…',
    '{n} tâche(s) à faire': '{n} taak/taken te doen', 'Tâche supprimée': 'Taak verwijderd', 'Ajouter une tâche pour ce jour': 'Taak toevoegen voor deze dag' },
});

// Tâche ponctuelle du jour : case à cocher + suppression.
const taskRow = (x) => `<li class="cell sub habit tap ${x.done ? 'done' : ''}" data-task="${esc(x.id)}" role="checkbox" aria-checked="${x.done}">
    <span class="check"><span class="ring-o">${x.done ? icon('check') : ''}</span></span>
    <div class="grow"><span class="t">${esc(x.name)}</span><span class="s">${t('Pour ce jour seulement')}</span></div>
    <button class="icon-btn" data-task-del="${esc(x.id)}" aria-label="${t('Supprimer')}">${icon('trash')}</button></li>`;

// Checklist repliable : une ligne résumé (x/y · série), qui se déplie sur les habitudes du jour.
let expanded = false;
export const toggleHabits = () => (expanded = !expanded);

export function habitsCells(date) {
  const status = habitStatus(date);
  const rates = habitRates(60);
  const n = streak(rates, today());
  const done = status.filter((s) => s.done).length;
  const pct = status.length ? done / status.length : 0;
  const tasks = state.dayTasks[date] || [], left = tasksLeft(state.dayTasks, date);
  const head = `<li class="cell tap" data-a="habits-toggle" role="button" aria-expanded="${expanded}">
      <span class="mini-ring" style="--p:${Math.round(pct * 100)}%" aria-hidden="true"></span>
      <div class="grow"><span class="t">${t('Checklist du jour')}</span><span class="s">${done}/${status.length}${n ? ' · ' + t('{n} jours de suite', { n }) : ''}${left ? ' · ' + t('{n} tâche(s) à faire', { n: left }) : ''}</span></div>
      ${icon(expanded ? 'chevronUp' : 'chevronDown', { cls: 'chev' })}</li>`;
  // Les tâches du jour restent visibles même repliée : ce sont les choses à ne pas oublier aujourd'hui.
  const addRow = `<li class="cell sub"><form class="row" data-f="task" style="flex:1"><input class="input" name="n" enterkeyhint="done" placeholder="${t('Ex : aller au magasin, poster un colis…')}" maxlength="80" aria-label="${t('Ajouter une tâche pour ce jour')}"><button class="btn filled">${t('Ajouter')}</button></form></li>`;
  if (!expanded) return head + tasks.map(taskRow).join('');
  const week = Array.from({ length: 7 }, (_, i) => isoDate(new Date(parseDate(today()).getTime() - (6 - i) * 86400000)));
  const dots = `<li class="cell sub" style="display:block"><div class="week">${week.map((d) => {
    const r = rates[d] ?? 0;
    return `<div class="wday ${d === date ? 'sel' : ''}"><span class="caption secondary">${fmtDate(d, { weekday: 'narrow' })}</span>
      <span class="wdot" style="--p:${Math.round(r * 100)}%" aria-label="${fmtDate(d, { weekday: 'long' })} ${Math.round(r * 100)} %"></span></div>`;
  }).join('')}</div></li>`;
  return head + dots + status.map((h) => `<li class="cell sub habit ${h.tappable ? 'tap' : ''} ${h.done ? 'done' : ''}" ${h.tappable ? `data-habit="${esc(h.id)}" role="checkbox" aria-checked="${h.done}"` : ''}>
      <span class="check"><span class="ring-o">${h.done ? icon('check') : ''}</span></span>
      <div class="grow"><span class="t">${esc(t(h.name))}</span>${h.auto ? `<span class="s">${h.autoDone ? t('Validé automatiquement') : t('Se coche automatiquement')}</span>` : ''}</div></li>`).join('')
    + tasks.map(taskRow).join('') + addRow
    + `<li class="cell sub action" data-a="habits-edit" role="button">${t('Modifier mes habitudes')}</li>`;
}

// Envoi du champ « tâche du jour ». Renvoie true si l'événement a été traité.
export function handleTaskSubmit(e, date, rerender) {
  const f = e.target.closest?.('[data-f=task]'); if (!f) return false;
  e.preventDefault();
  if (addTask(state.dayTasks, date, f.n.value, 'tk-' + uid())) { save(); rerender(); navigator.vibrate?.(10); }
  return true;
}

// Clic sur une habitude manuelle : bascule la case du jour. Renvoie true si l'événement a été traité.
export function handleHabitClick(e, date, rerender) {
  const del = e.target.closest('[data-task-del]');
  if (del) {
    const id = del.dataset.taskDel, before = JSON.parse(JSON.stringify(state.dayTasks[date] || []));
    removeTask(state.dayTasks, date, id); save(); rerender();
    toast(t('Tâche supprimée'), { undo: () => { state.dayTasks[date] = before; save(); rerender(); } });
    return true;
  }
  const tk = e.target.closest('[data-task]');
  if (tk) { toggleTask(state.dayTasks, date, tk.dataset.task); save(); rerender(); navigator.vibrate?.(10); return true; }
  if (e.target.closest('[data-f=task]')) return true; // clic dans le champ : ne replie pas la liste
  const h = e.target.closest('[data-habit]');
  if (h) {
    const log = (state.habitLog[date] ||= {});
    if (log[h.dataset.habit]) delete log[h.dataset.habit]; else log[h.dataset.habit] = true;
    save(); rerender(); navigator.vibrate?.(10);
    return true;
  }
  if (e.target.closest('[data-a=habits-edit]')) { editHabits(rerender); return true; }
  if (e.target.closest('[data-a=habits-toggle]')) { toggleHabits(); rerender(); return true; }
  return false;
}

function editHabits(rerender) {
  const draw = () => {
    const active = new Set(state.habits.map((h) => h.id));
    const autos = Object.keys(AUTO).map((id) => ({ id, auto: true }));
    const customs = state.habits.filter((h) => !h.auto);
    s.querySelector('.body').innerHTML = group(t('Automatiques'), `<ul class="cells">${autos.map((h) => `<li class="cell toggle-row"><span class="grow">${esc(t(habitName(h)))}</span>
        <label class="switch"><input type="checkbox" data-auto="${h.id}" ${active.has(h.id) ? 'checked' : ''} aria-label="${esc(t(habitName(h)))}"><span></span></label></li>`).join('')}</ul>`,
      t("Cochées d'après ton journal, tes pesées et tes séances."))
      + group(t('Personnelles'), `<ul class="cells">${customs.map((h) => `<li class="cell"><span class="grow">${esc(t(h.name))}</span>
        <button class="icon-btn" data-del="${esc(h.id)}" aria-label="${t('Supprimer')}">${icon('trash')}</button></li>`).join('')}
        <li class="cell"><form class="row" data-f="add" style="flex:1"><input class="input" name="n" placeholder="${t('Ex : Créatine 3 g, 10 min de marche…')}" maxlength="60"><button class="btn filled">${t('Ajouter')}</button></form></li></ul>`);
    s.querySelector('[data-f=add]').onsubmit = (e) => {
      e.preventDefault();
      const name = e.target.n.value.trim(); if (!name) return;
      state.habits.push({ id: 'c-' + uid(), name }); save(); draw();
    };
  };
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Mes habitudes')}</h3></div><div class="body"></div>`, rerender);
  s.addEventListener('change', (e) => {
    const id = e.target.dataset.auto; if (!id) return;
    if (e.target.checked) { if (!state.habits.some((h) => h.id === id)) state.habits.unshift({ id, auto: true }); }
    else state.habits = state.habits.filter((h) => h.id !== id);
    save();
  });
  s.addEventListener('click', (e) => {
    const d = e.target.closest('[data-del]'); if (!d) return;
    state.habits = state.habits.filter((h) => h.id !== d.dataset.del); save(); draw();
  });
  draw();
}

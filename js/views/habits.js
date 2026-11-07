// Checklist du jour (rendue dans l'onglet Aujourd'hui) + feuille de réglage des habitudes.
import { state, save, today, uid } from '../store.js';
import { habitStatus, habitRates } from '../metrics.js';
import { AUTO, streak, habitName, addTask, toggleTask, removeTask, suggestTasks } from '../habits.js';
import { schedule } from '../planner.js';
import { isoDate, parseDate } from '../science.js';
import { esc, sheet, group, fmtDate, toast } from '../ui.js';
import { icon } from '../icons.js';
import { t, register } from '../i18n.js';

register({
  en: { 'Tâche supprimée': 'Task removed', 'Ajouter une tâche pour ce jour': 'Add a task for this day',
    'À faire aujourd\'hui': 'To do today', 'Aujourd\'hui seulement': 'Today only', 'Chaque jour': 'Every day', 'Ajouter une action pour aujourd\'hui…': 'Add something to do today…',
    'Idées': 'Ideas', 'Suivi automatique': 'Auto-tracked', 'Se coche avec ton journal': 'Ticks itself from your log', 'Coche-le si tu as fait du repos actif': 'Tick it if you did active rest',
    'Aller au sport': 'Go to the gym', 'Aller au sport : {r}': 'Go to the gym: {r}', 'Faire les courses pour la semaine prochaine': 'Do the shopping for next week',
    'Préparer mes repas de demain': "Prep tomorrow's meals", 'Au lit avant 23 h': 'In bed before 11 pm', '10 min d\'étirements': '10 min of stretching',
    'Faire 10 000 pas': 'Walk 10,000 steps', 'Dormir au moins 7 h': 'Sleep at least 7 h', 'Habitude supprimée': 'Habit removed' },
  nl: { 'Tâche supprimée': 'Taak verwijderd', 'Ajouter une tâche pour ce jour': 'Taak toevoegen voor deze dag',
    'À faire aujourd\'hui': 'Vandaag te doen', 'Aujourd\'hui seulement': 'Alleen vandaag', 'Chaque jour': 'Elke dag', 'Ajouter une action pour aujourd\'hui…': 'Iets toevoegen voor vandaag…',
    'Idées': 'Ideeën', 'Suivi automatique': 'Automatisch gevolgd', 'Se coche avec ton journal': 'Wordt afgevinkt via je dagboek', 'Coche-le si tu as fait du repos actif': 'Vink aan als je actief hebt gerust',
    'Aller au sport': 'Naar de sportschool', 'Aller au sport : {r}': 'Naar de sportschool: {r}', 'Faire les courses pour la semaine prochaine': 'Boodschappen doen voor volgende week',
    'Préparer mes repas de demain': 'Maaltijden voor morgen voorbereiden', 'Au lit avant 23 h': 'Voor 23 u in bed', '10 min d\'étirements': '10 min stretchen',
    'Faire 10 000 pas': '10.000 stappen zetten', 'Dormir au moins 7 h': 'Minstens 7 u slapen', 'Habitude supprimée': 'Gewoonte verwijderd' },
});

// Une action à cocher : habitude quotidienne (« Chaque jour ») ou tâche de ce jour seulement (supprimable).
const actionRow = ({ id, name, done, task }) => `<li class="hb-act ${done ? 'done' : ''}">
    <button class="hb-tick" ${task ? `data-task="${esc(id)}"` : `data-habit="${esc(id)}"`} role="checkbox" aria-checked="${done}">
      <span class="ring-o" aria-hidden="true">${done ? icon('check') : ''}</span>
      <span class="grow"><span class="t">${esc(task ? name : t(name))}</span><span class="s">${t(task ? 'Aujourd\'hui seulement' : 'Chaque jour')}</span></span></button>
    ${task ? `<button class="icon-btn hb-del" data-task-del="${esc(id)}" aria-label="${t('Supprimer')} — ${esc(name)}">${icon('trash')}</button>` : ''}</li>`;

// Icône de chaque habitude automatique (bande « Suivi automatique »).
const AUTO_ICON = { protein: 'bolt', kcal: 'flame', fiber: 'meal', water: 'drop', weigh: 'weight', workout: 'dumbbell' };

// Séance prévue ce jour par le programme (nom de la routine), sinon null.
function plannedWorkout(date) {
  if (!state.plan || state.workouts.some((w) => w.date === date)) return null;
  const ev = schedule(state.plan, date, date)[0];
  return ev ? t(state.routines.find((r) => r.id === ev.routineId)?.name || 'Séance') : null;
}

// Le suivi automatique (protéines, kcal, eau…) est replié en une bande d'icônes ; il se déplie au toucher.
let expanded = false;
export const toggleHabits = () => (expanded = !expanded);

export function habitsCells(date) {
  const status = habitStatus(date);
  const rates = habitRates(60);
  const n = streak(rates, today());
  const autos = status.filter((h) => h.auto), manual = status.filter((h) => !h.auto);
  const tasks = state.dayTasks[date] || [];
  const actions = [...manual.map((h) => ({ id: h.id, name: h.name, done: h.done })), ...tasks.map((x) => ({ ...x, task: true }))];
  const doneN = actions.filter((a) => a.done).length, autoN = autos.filter((h) => h.done).length;
  const pct = actions.length ? doneN / actions.length : 0;

  // Idées : on cache celles déjà présentes dans la liste du jour.
  const taken = new Set(actions.map((a) => (a.task ? a.name : t(a.name)).toLowerCase()));
  const ideas = suggestTasks({ date, shopDay: state.settings.shopDay ?? 6, workoutName: plannedWorkout(date) })
    .map((s) => t(s.name, s.vars)).filter((s) => !taken.has(s.toLowerCase())).slice(0, 4);

  const head = `<li class="hb-head"><span class="mini-ring" style="--p:${Math.round(pct * 100)}%" aria-hidden="true"></span>
      <div class="grow"><span class="t">${t('À faire aujourd\'hui')}</span><span class="s num">${doneN}/${actions.length}${n ? ' · ' + t('{n} jours de suite', { n }) : ''}</span></div></li>`;
  const list = actions.map(actionRow).join('');
  const add = `<li class="hb-add"><form class="row" data-f="task"><input class="input" name="n" enterkeyhint="done" placeholder="${t('Ajouter une action pour aujourd\'hui…')}" maxlength="80" aria-label="${t('Ajouter une tâche pour ce jour')}"><button class="btn filled">${t('Ajouter')}</button></form></li>`;
  const idea = ideas.length ? `<li class="hb-ideas"><span class="caption secondary">${t('Idées')}</span>
      <div class="chips hb-chips">${ideas.map((s) => `<button class="chip" data-idea="${esc(s)}">${icon('plus')} ${esc(s)}</button>`).join('')}</div></li>` : '';
  const strip = `<li><button class="hb-auto" data-a="habits-toggle" aria-expanded="${expanded}">
      <span class="hb-pips" aria-hidden="true">${autos.map((h) => `<span class="hb-pip ${h.done ? 'on' : ''}">${icon(AUTO_ICON[h.id] || 'check')}</span>`).join('')}</span>
      <span class="grow"><span class="t">${t('Suivi automatique')}</span><span class="s num">${autoN}/${autos.length} · ${t('Se coche avec ton journal')}</span></span>
      ${icon(expanded ? 'chevronUp' : 'chevronDown', { cls: 'chev' })}</button></li>`;
  if (!expanded) return head + list + add + idea + strip;

  const week = Array.from({ length: 7 }, (_, i) => isoDate(new Date(parseDate(today()).getTime() - (6 - i) * 86400000)));
  const dots = `<li class="hb-week"><div class="week">${week.map((d) => {
    const r = rates[d] ?? 0;
    return `<div class="wday ${d === date ? 'sel' : ''}"><span class="caption secondary">${fmtDate(d, { weekday: 'narrow' })}</span>
      <span class="wdot" style="--p:${Math.round(r * 100)}%" aria-label="${fmtDate(d, { weekday: 'long' })} ${Math.round(r * 100)} %"></span></div>`;
  }).join('')}</div></li>`;
  const autoRows = autos.map((h) => `<li class="hb-arow ${h.done ? 'done' : ''}">
      ${h.tappable ? `<button class="hb-tick" data-habit="${esc(h.id)}" role="checkbox" aria-checked="${h.done}">` : '<div class="hb-tick">'}
      <span class="hb-pip ${h.done ? 'on' : ''}" aria-hidden="true">${icon(AUTO_ICON[h.id] || 'check')}</span>
      <span class="grow"><span class="t">${esc(t(h.name))}</span><span class="s">${h.autoDone ? t('Validé automatiquement') : h.tappable ? t('Coche-le si tu as fait du repos actif') : t('Se coche automatiquement')}</span></span>
      ${h.tappable ? '</button>' : '</div>'}</li>`).join('');
  return head + list + add + idea + strip + autoRows + dots
    + `<li><button class="hb-edit" data-a="habits-edit">${icon('pencil')} ${t('Modifier mes habitudes')}</button></li>`;
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
  const idea = e.target.closest('[data-idea]');
  if (idea) { addTask(state.dayTasks, date, idea.dataset.idea, 'tk-' + uid()); save(); rerender(); navigator.vibrate?.(10); return true; }
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
        <label class="switch"><input type="checkbox" data-auto="${esc(h.id)}" ${active.has(h.id) ? 'checked' : ''} aria-label="${esc(t(habitName(h)))}"><span></span></label></li>`).join('')}</ul>`,
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
    const before = state.habits.slice();
    state.habits = state.habits.filter((h) => h.id !== d.dataset.del); save(); draw();
    toast(t('Habitude supprimée'), { undo: () => { state.habits = before; save(); if (s.isConnected) draw(); rerender(); } });
  });
  draw();
}

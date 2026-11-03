// Checklist du jour (rendue dans l'onglet Aujourd'hui) + feuille de réglage des habitudes.
import { state, save, today, uid } from '../store.js';
import { habitStatus, habitRates } from '../metrics.js';
import { AUTO, streak, habitName } from '../habits.js';
import { isoDate, parseDate } from '../science.js';
import { esc, sheet, group, fmtDate } from '../ui.js';
import { icon } from '../icons.js';
import { t } from '../i18n.js';

export function habitsSection(date) {
  const status = habitStatus(date);
  const rates = habitRates(60);
  const n = streak(rates, today());
  const done = status.filter((s) => s.done).length;
  const week = Array.from({ length: 7 }, (_, i) => isoDate(new Date(parseDate(today()).getTime() - (6 - i) * 86400000)));
  const dots = `<div class="week">${week.map((d) => {
    const r = rates[d] ?? 0;
    return `<div class="wday ${d === date ? 'sel' : ''}"><span class="caption secondary">${fmtDate(d, { weekday: 'narrow' })}</span>
      <span class="wdot" style="--p:${Math.round(r * 100)}%" aria-label="${fmtDate(d, { weekday: 'long' })} ${Math.round(r * 100)} %"></span></div>`;
  }).join('')}</div>`;
  return group(`${t('Checklist du jour')}<b class="num">${done}/${status.length}</b>`, `<ul class="cells habits">
      <li class="cell streak-row"><span class="badge bg-orange">${icon('flame')}</span><div class="grow"><span class="t headline">${t('{n} jours de suite', { n })}</span><span class="s">${t('Série : ≥ 80 % des habitudes cochées')}</span></div></li>
      <li class="cell" style="display:block">${dots}</li>
      ${status.map((h) => `<li class="cell ${h.tappable ? 'tap' : ''} ${h.done ? 'done' : ''}" ${h.tappable ? `data-habit="${esc(h.id)}" role="checkbox" aria-checked="${h.done}"` : ''}>
        <span class="check"><span class="ring-o">${h.done ? icon('check') : ''}</span></span>
        <div class="grow"><span class="t">${esc(t(h.name))}</span>${h.auto ? `<span class="s">${h.autoDone ? t('Validé automatiquement') : t('Se coche automatiquement')}</span>` : ''}</div></li>`).join('')}
      <li class="cell action" data-a="habits-edit" role="button">${icon('pencil')} ${t('Modifier mes habitudes')}</li></ul>`);
}

// Clic sur une habitude manuelle : bascule la case du jour. Renvoie true si l'événement a été traité.
export function handleHabitClick(e, date, rerender) {
  const h = e.target.closest('[data-habit]');
  if (h) {
    const log = (state.habitLog[date] ||= {});
    if (log[h.dataset.habit]) delete log[h.dataset.habit]; else log[h.dataset.habit] = true;
    save(); rerender(); navigator.vibrate?.(10);
    return true;
  }
  if (e.target.closest('[data-a=habits-edit]')) { editHabits(rerender); return true; }
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

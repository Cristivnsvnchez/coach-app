// Onglet Entraînement : routines (dossiers), séance en direct, calendrier et streak, muscles, exercices, historique.
import * as S from '../science.js';
import * as W from '../workout.js';
import { state, save, today, uid, latestWeight } from '../store.js';
import { findExercise } from '../exercises.js';
import { esc, fmt, fmtDate, sheet, nav, group } from '../ui.js';
import { icon } from '../icons.js';
import { t, locale } from '../i18n.js';
import { active, startWorkout, renderSession } from './session.js';
import { pickExercise, openExercise, platesSheet } from './exsheets.js';

let month = null; // mois affiché dans le calendrier ('YYYY-MM')

export function render(root, go) {
  const back = () => render(root, go);
  if (active) return renderSession(root, go, back);
  const ws = state.workouts;
  const bw = latestWeight() || 0;
  const streak = W.weekStreak(ws, today());
  const rest = W.restDays(ws, today());
  const since7 = S.isoDate(new Date(Date.now() - 6 * 86400000));
  const msets = W.muscleSets(ws, since7, (n) => findExercise(n, state.customExercises));
  const folders = [...new Set(state.routines.map((r) => r.folder || ''))];
  const doneNames = [...new Set(ws.flatMap((w) => w.exercises.map((e) => e.name)))];

  root.innerHTML = `
    ${nav(t('Entraînement'), { right: `<button class="btn plain bold" data-a="coach">${icon('sparkles')} ${t('Programme IA')}</button>` })}
    <div class="cells stats" style="margin-bottom:1.25rem">
      <div><small>${t('Série')}</small><b>${streak} <span class="u">${t('sem.')}</span></b></div>
      <div><small>${t('Repos')}</small><b>${rest ?? '–'} <span class="u">${t('j')}</span></b></div>
      <div><small>${t('Ce mois-ci')}</small><b>${ws.filter((w) => w.date.slice(0, 7) === today().slice(0, 7)).length} <span class="u">${t('séances')}</span></b></div>
    </div>
    <button class="btn filled large" data-a="empty" style="margin-bottom:1.75rem">${icon('plus')} ${t('Démarrer une séance vide')}</button>
    ${folders.map((f) => group(esc(t(f || 'Mes routines')), `<ul class="cells">${state.routines.filter((r) => (r.folder || '') === f).map((r) => `
      <li class="cell with-icon"><span class="badge bg-blue">${icon('dumbbell')}</span>
        <button class="grow routine-open" data-edit="${r.id}"><span class="t headline">${esc(t(r.name))}</span>
        <span class="s" style="white-space:normal">${r.exercises.map((e) => esc(t(e.name))).join(' · ') || '—'}</span></button>
        <button class="btn filled pill" data-start="${r.id}">${t('Démarrer')}</button></li>`).join('')}</ul>`)).join('')}
    ${group('', `<div class="cells"><div class="cell action" data-a="new-routine">${icon('plus')} ${t('Nouvelle routine')}</div></div>`)}
    ${calendar()}
    ${group(t('Muscles — 7 derniers jours'), `<div class="cells"><div class="vol">${S.MUSCLES.map((m) => { const n = msets[m] || 0;
      return `<div class="vol-row"><span>${t(m)}</span><div class="bar-track"><div class="bar-fill ${n >= 10 ? 'ok' : ''}" style="width:${Math.min(100, (n / 20) * 100)}%"></div></div><span>${fmt(n, n % 1 ? 1 : 0)}</span></div>`; }).join('')}</div></div>`,
      t('Séries validées hors échauffement : muscle principal = 1, secondaires = 0,5. Cible 10–20 séries/muscle/semaine (Schoenfeld 2017).'))}
    ${doneNames.length ? group(t('Exercices'), `<ul class="cells">${doneNames.map((n) => { const r = W.exerciseRecords(ws, n, bw);
      return `<li class="cell tap" data-ex="${esc(n)}"><div class="grow"><span class="t">${esc(t(n))}</span><span class="s num">${t('1RM estimé')} ${fmt(r.e1rm, 1)} kg · ${r.sessions} ${t('séances')}</span></div>${icon('chevronRight', { cls: 'chev' })}</li>`; }).join('')}</ul>`) : ''}
    ${group(t('Historique'), `<ul class="cells">${[...ws].reverse().slice(0, 20).map((w) => `<li class="cell tap" data-w="${esc(w.id)}"><div class="grow"><span class="t">${esc(t(w.name || w.dayName))}</span>
      <span class="s num">${fmtDate(w.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmt(w.minutes || 0)} min · ${fmt(w.volume ?? W.workoutVolume(w, bw))} kg · ${W.doneSets(w)} ${t('séries')}</span></div>${icon('chevronRight', { cls: 'chev' })}</li>`).join('') || `<li class="empty">${t('Aucune séance.')}</li>`}</ul>`)}
    ${group(t('Outils'), `<div class="cells"><div class="cell tap with-icon" data-a="plates"><span class="badge bg-teal">${icon('dumbbell')}</span><span class="grow">${t('Calculateur de disques')}</span>${icon('chevronRight', { cls: 'chev' })}</div></div>`,
      t("OMS 2020 : 150–300 min d'activité modérée/sem + renforcement ≥ 2 j/sem."))}`;

  root.onclick = (e) => {
    const el = e.target.closest('[data-a],[data-start],[data-edit],[data-ex],[data-w],[data-cal]');
    if (!el) return;
    if (el.dataset.start) { startWorkout(state.routines.find((r) => r.id === el.dataset.start)); return render(root, go); }
    if (el.dataset.edit) return editRoutine(state.routines.find((r) => r.id === el.dataset.edit), back);
    if (el.dataset.ex) return openExercise(el.dataset.ex);
    if (el.dataset.w) return workoutDetail(el.dataset.w, back);
    if (el.dataset.cal) { month = el.dataset.cal; return render(root, go); }
    const a = el.dataset.a;
    if (a === 'empty') { startWorkout(null); return render(root, go); }
    if (a === 'coach') return go('coach', 'programme');
    if (a === 'plates') return platesSheet();
    if (a === 'new-routine') {
      const r = { id: uid(), name: t('Nouvelle routine'), folder: '', exercises: [] };
      state.routines.push(r); save(); return editRoutine(r, back);
    }
  };
}

// Calendrier du mois : jours d'entraînement marqués.
function calendar() {
  month = month || today().slice(0, 7);
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // lundi en premier
  const trained = new Set(state.workouts.filter((w) => w.date.startsWith(month)).map((w) => +w.date.slice(8)));
  const shift = (n) => { const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const dow = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'narrow' }));
  const td = today();
  return group('', `<div class="cells"><div class="cal">
    <div class="cal-head"><button class="icon-btn" data-cal="${shift(-1)}" aria-label="${t('Mois précédent')}">${icon('chevronLeft')}</button>
      <span class="headline" style="text-transform:capitalize">${first.toLocaleDateString(locale(), { month: 'long', year: 'numeric' })}</span>
      <button class="icon-btn" data-cal="${shift(1)}" aria-label="${t('Mois suivant')}">${icon('chevronRight')}</button></div>
    <div class="cal-grid">${dow.map((d) => `<span class="caption secondary">${d}</span>`).join('')}
      ${'<span></span>'.repeat(offset)}${Array.from({ length: days }, (_, i) => {
        const d = i + 1, iso = `${month}-${String(d).padStart(2, '0')}`;
        return `<span class="cal-d ${trained.has(d) ? 'on' : ''} ${iso === td ? 'today' : ''}">${d}</span>`; }).join('')}</div>
  </div></div>`);
}

function workoutDetail(id, back) {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) return;
  const bw = latestWeight() || 0;
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${esc(t(w.name || w.dayName))}</h3></div>
    <p class="footnote secondary" style="margin:-.5rem 0 1rem">${fmtDate(w.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <div class="cells stats" style="margin-bottom:1.25rem"><div><small>${t('Durée')}</small><b>${fmt(w.minutes || 0)} <span class="u">min</span></b></div>
      <div><small>${t('Volume')}</small><b>${fmt(W.workoutVolume(w, bw))} <span class="u">kg</span></b></div><div><small>${t('Séries')}</small><b>${W.doneSets(w)}</b></div></div>
    ${w.exercises.map((ex) => group(esc(t(ex.name)), `<ul class="cells">${ex.sets.filter((x) => x.done).map((x, j) => `<li class="cell"><span class="set-type static">${W.SET_LABEL[x.type] || j + 1}</span>
      <span class="grow num">${x.kg ? fmt(x.kg, 1) + ' kg × ' : ''}${x.reps}${x.rir != null && x.rir !== '' ? ` · RIR ${x.rir}` : ''}</span></li>`).join('')}</ul>`, ex.note ? esc(ex.note) : '')).join('')}
    ${group('', `<div class="cells"><div class="cell action destructive" data-a="del">${t('Supprimer la séance')}</div></div>`)}`);
  s.querySelector('[data-a=del]').onclick = () => {
    if (!confirm(t('Supprimer cette séance ? (irréversible)'))) return;
    state.workouts = state.workouts.filter((x) => x.id !== id); save(); s.close(); back();
  };
}

function editRoutine(r, back) {
  if (!r) return;
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Routine')}</h3></div><div class="body"></div>`, back);
  const draw = () => {
    s.querySelector('.body').innerHTML = `
      ${group('', `<div class="cells">
        <label class="cell field"><span>${t('Nom')}</span><input data-f="name" value="${esc(t(r.name))}"></label>
        <label class="cell field"><span>${t('Dossier')}</span><input data-f="folder" value="${esc(t(r.folder || ''))}" placeholder="${t('Mes routines')}"></label></div>`)}
      ${r.exercises.map((ex, i) => group(esc(t(ex.name)), `<div class="cells">
        <label class="cell field"><span>${t('Séries')}</span><input type="number" inputmode="numeric" data-i="${i}" data-k="sets" value="${ex.sets}"></label>
        <label class="cell field"><span>${t('Reps min – max')}</span><span class="row" style="justify-content:flex-end"><input type="number" inputmode="numeric" data-i="${i}" data-k="repMin" value="${ex.repMin}" style="width:3rem">–<input type="number" inputmode="numeric" data-i="${i}" data-k="repMax" value="${ex.repMax}" style="width:3rem"></span></label>
        <label class="cell field"><span>${t('Repos (s)')}</span><input type="number" inputmode="numeric" data-i="${i}" data-k="rest" value="${ex.rest ?? 90}"></label>
        <div class="cell row" style="justify-content:space-between"><span class="row"><button class="icon-btn" data-up="${i}" aria-label="${t('Monter')}">${icon('arrowUp')}</button><button class="icon-btn" data-down="${i}" aria-label="${t('Descendre')}">${icon('arrowDown')}</button></span>
          <button class="btn destructive" data-rm="${i}">${t('Retirer')}</button></div></div>`)).join('')}
      ${group('', `<div class="cells"><div class="cell action" data-a="add">${icon('plus')} ${t('Ajouter un exercice')}</div></div>`)}
      ${group('', `<div class="cells"><div class="cell action destructive" data-a="delr">${t('Supprimer la routine')}</div></div>`)}`;
  };
  s.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.f) r[el.dataset.f] = el.value.trim() || (el.dataset.f === 'name' ? t('Nouvelle routine') : '');
    if (el.dataset.k) r.exercises[+el.dataset.i][el.dataset.k] = Math.max(el.dataset.k === 'rest' ? 0 : 1, Math.round(+el.value || 0));
    save();
  });
  s.addEventListener('click', (e) => {
    const el = e.target.closest('[data-up],[data-down],[data-rm],[data-a]'); if (!el) return;
    const L = r.exercises;
    if (el.dataset.up) { const i = +el.dataset.up; if (i > 0) [L[i - 1], L[i]] = [L[i], L[i - 1]]; }
    if (el.dataset.down) { const i = +el.dataset.down; if (i < L.length - 1) [L[i + 1], L[i]] = [L[i], L[i + 1]]; }
    if (el.dataset.rm) L.splice(+el.dataset.rm, 1);
    if (el.dataset.a === 'add') {
      return pickExercise((name) => {
        const info = findExercise(name, state.customExercises) || {};
        L.push({ name, muscle: info.muscle, secondary: info.secondary, type: info.type, upper: info.upper, sets: 3, repMin: 8, repMax: 12, rest: info.upper === false ? 150 : 90 });
        save(); editRoutine(r, back);
      });
    }
    if (el.dataset.a === 'delr') {
      if (!confirm(t('Supprimer cette routine ?'))) return;
      state.routines = state.routines.filter((x) => x.id !== r.id); save(); s.close(); return;
    }
    save(); draw();
  });
  draw();
}

// Import d'un programme généré par l'IA → routines dans un dossier.
export function importProgram(p) {
  if (!p?.days?.length) throw new Error(t('Programme invalide'));
  const folder = String(p.name || 'Programme IA');
  state.routines = state.routines.filter((r) => r.folder !== folder).concat(p.days.map((d) => ({
    id: uid(), name: String(d.name), folder,
    exercises: (d.exercises || []).map((e) => {
      const info = findExercise(String(e.name), state.customExercises) || {};
      const upper = e.upper !== false;
      return { name: String(e.name), muscle: S.MUSCLES.includes(e.muscle) ? e.muscle : info.muscle || 'Abdos', secondary: info.secondary || [], type: info.type || 'weight_reps',
        sets: Math.max(1, Math.min(8, +e.sets || 3)), repMin: +e.repMin || 8, repMax: +e.repMax || 12, upper, rest: upper ? 90 : 150 };
    }),
  })));
  save();
}

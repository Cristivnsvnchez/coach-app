// Onglet Entraînement : routines (dossiers), séance en direct, calendrier et streak, muscles, exercices, historique.
import * as S from '../science.js';
import * as W from '../workout.js';
import { state, save, today, uid, latestWeight } from '../store.js';
import { findExercise } from '../exercises.js';
import { esc, fmt, fmtDate, sheet, nav, group, toast } from '../ui.js';
import { icon } from '../icons.js';
import { t, locale, register } from '../i18n.js';
import { active, startWorkout, renderSession } from './session.js';
import { pickExercise, openExercise, platesSheet } from './exsheets.js';
import { openWizard, planCard, plannedDays } from './program.js';
import { isDeload, weekOf } from '../planner.js';
import { recoveryMap, editedWorkout } from '../recovery.js';

register({ en: { 'Apprendre les mouvements': 'Learn the movements', 'Apprends les bons mouvements': 'Learn the right movements',
    'Cette routine fait partie de ton programme : ses séances prévues seront retirées. Supprimer ?': 'This routine is part of your program: its planned sessions will be removed. Delete it?',
    'Muscles · récupération': 'Muscles · recovery', 'Récupère': 'Recovering', 'Prêt': 'Ready', 'À reprendre': 'Train again', 'il y a {n} j': '{n} d ago', "aujourd'hui": 'today',
    'Prêts aujourd\'hui : {list}': 'Ready today: {list}', 'À travailler en priorité : {list}': 'Train first: {list}', 'Tous tes muscles récupèrent : jour de repos conseillé.': 'All your muscles are recovering: a rest day is advised.',
    'Récupère : travaillé il y a moins de 48 h. Prêt : récupéré, travaillé cette semaine. À reprendre : rien depuis plus de 7 jours. Barre : séries des 7 derniers jours (secondaires = 0,5), cible 10–20 par semaine (Schoenfeld 2016, 2017).': 'Recovering: trained under 48 h ago. Ready: recovered, trained this week. Train again: nothing for over 7 days. Bar: sets over the last 7 days (secondary = 0.5), target 10–20 per week (Schoenfeld 2016, 2017).',
    'Modifier la séance': 'Edit workout', 'Saisir une séance passée': 'Log a past workout', 'Séance passée': 'Past workout', 'Séance modifiée': 'Workout updated', 'Séance ajoutée': 'Workout added',
    'Ajoute au moins une série avec des répétitions, à une date passée.': 'Add at least one set with reps, on a past date.', 'Date': 'Date', 'Retirer la série': 'Remove set' },
  nl: { 'Apprendre les mouvements': 'Bewegingen leren', 'Apprends les bons mouvements': 'Leer de juiste bewegingen',
    'Cette routine fait partie de ton programme : ses séances prévues seront retirées. Supprimer ?': 'Deze routine hoort bij je programma: de geplande trainingen worden verwijderd. Verwijderen?',
    'Muscles · récupération': 'Spieren · herstel', 'Récupère': 'Herstelt', 'Prêt': 'Klaar', 'À reprendre': 'Weer trainen', 'il y a {n} j': '{n} d geleden', "aujourd'hui": 'vandaag',
    'Prêts aujourd\'hui : {list}': 'Vandaag klaar: {list}', 'À travailler en priorité : {list}': 'Eerst trainen: {list}', 'Tous tes muscles récupèrent : jour de repos conseillé.': 'Al je spieren herstellen: een rustdag is aangeraden.',
    'Récupère : travaillé il y a moins de 48 h. Prêt : récupéré, travaillé cette semaine. À reprendre : rien depuis plus de 7 jours. Barre : séries des 7 derniers jours (secondaires = 0,5), cible 10–20 par semaine (Schoenfeld 2016, 2017).': 'Herstelt: minder dan 48 u geleden getraind. Klaar: hersteld, deze week getraind. Weer trainen: niets in meer dan 7 dagen. Balk: sets van de laatste 7 dagen (secundair = 0,5), doel 10–20 per week (Schoenfeld 2016, 2017).',
    'Modifier la séance': 'Training bewerken', 'Saisir une séance passée': 'Eerdere training invoeren', 'Séance passée': 'Eerdere training', 'Séance modifiée': 'Training bijgewerkt', 'Séance ajoutée': 'Training toegevoegd',
    'Ajoute au moins une série avec des répétitions, à une date passée.': 'Voeg minstens één set met herhalingen toe, op een eerdere datum.', 'Date': 'Datum', 'Retirer la série': 'Set verwijderen' } });

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
    ${nav(t('Entraînement'), { right: `<button class="btn plain bold" data-a="wizard">${icon('sparkles')} ${t('Programme')}</button>` })}
    <div class="cells stats" style="margin-bottom:1.25rem">
      <div><small>${t('Régularité')}</small><b>${streak} <span class="u">${t('sem.')}</span></b></div>
      <div><small>${t('Repos')}</small><b>${rest ?? '–'} <span class="u">${t('j')}</span></b></div>
      <div><small>${t('Ce mois-ci')}</small><b>${ws.filter((w) => w.date.slice(0, 7) === today().slice(0, 7)).length} <span class="u">${t('séances')}</span></b></div>
    </div>
    <button class="lrn-entry" data-a="learn"><span class="lrn-entry-ic">${icon('sparkles')}</span><span class="grow"><b>${t('Apprendre les mouvements')}</b><small>${t('Apprends les bons mouvements')}</small></span>${icon('chevronRight', { cls: 'chev' })}</button>
    ${planCard()}
    <button class="btn large" data-a="empty" style="margin-bottom:1.75rem">${icon('plus')} ${t('Démarrer une séance vide')}</button>
    ${folders.map((f) => group(esc(t(f || 'Mes routines')), `<ul class="cells">${state.routines.filter((r) => (r.folder || '') === f).map((r) => `
      <li class="cell with-icon"><span class="badge bg-blue">${icon('dumbbell')}</span>
        <button class="grow routine-open" data-edit="${esc(r.id)}"><span class="t headline">${esc(t(r.name))}</span>
        <span class="s" style="white-space:normal">${r.exercises.map((e) => esc(t(e.name))).join(' · ') || '—'}</span></button>
        <button class="btn filled pill" data-start="${esc(r.id)}">${t('Démarrer')}</button></li>`).join('')}</ul>`)).join('')}
    ${group('', `<div class="cells"><div class="cell action" data-a="new-routine">${icon('plus')} ${t('Nouvelle routine')}</div></div>`)}
    ${calendar()}
    ${musclesCard(ws, msets)}
    ${doneNames.length ? group(t('Exercices'), `<ul class="cells">${doneNames.map((n) => { const r = W.exerciseRecords(ws, n, bw);
      return `<li class="cell tap" data-ex="${esc(n)}"><div class="grow"><span class="t">${esc(t(n))}</span><span class="s num">${t('1RM estimé')} ${fmt(r.e1rm, 1)} kg · ${r.sessions} ${t('séances')}</span></div>${icon('chevronRight', { cls: 'chev' })}</li>`; }).join('')}</ul>`) : ''}
    ${group(t('Historique'), `<ul class="cells">${[...ws].reverse().slice(0, 20).map((w) => `<li class="cell tap" data-w="${esc(w.id)}"><div class="grow"><span class="t">${esc(t(w.name || w.dayName))}</span>
      <span class="s num">${fmtDate(w.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmt(w.minutes || 0)} min · ${fmt(w.volume ?? W.workoutVolume(w, bw))} kg · ${W.doneSets(w)} ${t('séries')}</span></div>${icon('chevronRight', { cls: 'chev' })}</li>`).join('') || `<li class="empty">${t('Aucune séance.')}</li>`}</ul>`)}
    ${group('', `<div class="cells"><div class="cell action" data-a="log-past" role="button">${icon('plus')} ${t('Saisir une séance passée')}</div></div>`)}
    ${group(t('Outils'), `<div class="cells"><div class="cell tap with-icon" data-a="plates"><span class="badge bg-teal">${icon('dumbbell')}</span><span class="grow">${t('Calculateur de disques')}</span>${icon('chevronRight', { cls: 'chev' })}</div></div>`,
      t("OMS 2020 : 150–300 min d'activité modérée/sem + renforcement ≥ 2 j/sem."))}`;

  root.onclick = (e) => {
    const el = e.target.closest('[data-a],[data-start],[data-start-plan],[data-edit],[data-ex],[data-w],[data-cal]');
    if (!el) return;
    if (el.dataset.startPlan) {
      const deload = isDeload(state.plan, weekOf(state.plan, today()));
      startWorkout(state.routines.find((r) => r.id === el.dataset.startPlan), { deload }); return render(root, go);
    }
    if (el.dataset.start) { startWorkout(state.routines.find((r) => r.id === el.dataset.start)); return render(root, go); }
    if (el.dataset.edit) return editRoutine(state.routines.find((r) => r.id === el.dataset.edit), back);
    if (el.dataset.ex) return openExercise(el.dataset.ex);
    if (el.dataset.w) return workoutDetail(el.dataset.w, back);
    if (el.dataset.cal) { month = el.dataset.cal; return render(root, go); }
    const a = el.dataset.a;
    if (a === 'empty') { startWorkout(null); return render(root, go); }
    if (a === 'learn') return go('learn', 'training');
    if (a === 'wizard') return openWizard(back);
    if (a === 'plates') return platesSheet();
    if (a === 'log-past') return editWorkout(null, back);
    if (a === 'new-routine') {
      const r = { id: uid(), name: t('Nouvelle routine'), folder: '', exercises: [] };
      state.routines.push(r); save(); return editRoutine(r, back, { isNew: true });
    }
  };
}

// Carte Muscles : état de récupération (couleur + texte) et séries des 7 derniers jours, muscles prêts en tête.
const REC = { recup: 'Récupère', pret: 'Prêt', reprendre: 'À reprendre' };
function musclesCard(ws, msets) {
  const rec = recoveryMap(ws, today(), (n) => findExercise(n, state.customExercises));
  // En tête : d'abord les muscles délaissés (> 7 j), sinon ceux qui sont prêts, sinon conseil de repos.
  const of = (st) => S.MUSCLES.filter((m) => rec[m].status === st).map((m) => t(m)).join(', ');
  const todo = of('reprendre'), ready = of('pret');
  const head = ws.length ? `<p class="rc-head">${todo ? t('À travailler en priorité : {list}', { list: todo }) : ready ? t('Prêts aujourd\'hui : {list}', { list: ready }) : t('Tous tes muscles récupèrent : jour de repos conseillé.')}</p>` : '';
  const rows = S.MUSCLES.map((m) => {
    const r = rec[m], n = msets[m] || 0;
    const when = r.days === null ? '' : ' · ' + (r.days === 0 ? t("aujourd'hui") : t('il y a {n} j', { n: r.days }));
    return `<div class="rc-row"><span class="rc-dot rc-${r.status}" aria-hidden="true"></span>
      <span class="rc-name"><b>${t(m)}</b><small class="rc-${r.status}-t">${t(REC[r.status])}${when}</small></span>
      <div class="bar-track" role="img" aria-label="${fmt(n, n % 1 ? 1 : 0)} ${t('séries')}"><div class="bar-fill ${n >= 10 ? 'ok' : ''}" style="width:${Math.min(100, (n / 20) * 100)}%"></div></div>
      <span class="num">${fmt(n, n % 1 ? 1 : 0)}</span></div>`;
  }).join('');
  return group(t('Muscles · récupération'), `<div class="cells"><div class="vol rc">${head}${rows}</div></div>`,
    t('Récupère : travaillé il y a moins de 48 h. Prêt : récupéré, travaillé cette semaine. À reprendre : rien depuis plus de 7 jours. Barre : séries des 7 derniers jours (secondaires = 0,5), cible 10–20 par semaine (Schoenfeld 2016, 2017).'));
}

// Calendrier du mois : jours d'entraînement marqués.
function calendar() {
  month = month || today().slice(0, 7);
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // lundi en premier
  const trained = new Set(state.workouts.filter((w) => w.date.startsWith(month)).map((w) => +w.date.slice(8)));
  const planned = plannedDays(month);
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
        const pl = planned.get(iso);
        return `<span class="cal-d ${trained.has(d) ? 'on' : pl ? (iso < td ? 'missed' : 'plan') : ''} ${pl?.deload ? 'deload' : ''} ${iso === td ? 'today' : ''}">${d}</span>`; }).join('')}</div>
    <div class="cal-legend caption secondary"><span><i class="lg on"></i>${t('Fait')}</span><span><i class="lg plan"></i>${t('Prévu')}</span><span><i class="lg missed"></i>${t('Manqué')}</span></div>
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
    ${group('', `<div class="cells"><div class="cell action" data-a="edit" role="button">${icon('pencil')} ${t('Modifier la séance')}</div></div>`)}
    ${group('', `<div class="cells"><div class="cell action destructive" data-a="del">${t('Supprimer la séance')}</div></div>`)}`);
  s.querySelector('[data-a=edit]').onclick = () => { s.close(); editWorkout(w, back); };
  s.querySelector('[data-a=del]').onclick = () => {
    if (!confirm(t('Supprimer cette séance ? (irréversible)'))) return;
    state.workouts = state.workouts.filter((x) => x.id !== id); save(); s.close(); back();
  };
}

// Modifier une séance enregistrée (nom, date, séries) ou en saisir une passée (w = null). Travaille sur une copie :
// fermer sans « Enregistrer » ne change rien. editedWorkout() refuse une date future ou une séance sans série.
function editWorkout(w, back) {
  const isNew = !w;
  const yesterday = S.isoDate(new Date(Date.now() - 86400000));
  const d = JSON.parse(JSON.stringify(w || { id: uid(), name: t('Séance passée'), date: yesterday, minutes: 0, exercises: [] }));
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t(isNew ? 'Saisir une séance passée' : 'Modifier la séance')}</h3></div><div class="body"></div>`, back);
  const draw = () => {
    s.querySelector('.body').innerHTML = `
      ${group('', `<div class="cells">
        <label class="cell field"><span>${t('Nom')}</span><input data-f="name" value="${esc(t(d.name || d.dayName || ''))}"></label>
        <label class="cell field"><span>${t('Date')}</span><input data-f="date" type="date" max="${today()}" value="${d.date}"></label></div>`)}
      ${d.exercises.map((ex, i) => group(esc(t(ex.name)), `<div class="cells">${ex.sets.map((x, j) => `<div class="cell we-set">
          <span class="set-type static">${W.SET_LABEL[x.type] || j + 1}</span>
          <label class="we-in"><input type="number" inputmode="decimal" step="0.5" data-i="${i}" data-j="${j}" data-k="kg" value="${x.kg ?? 0}" aria-label="kg"><span>kg</span></label>
          <label class="we-in"><input type="number" inputmode="numeric" data-i="${i}" data-j="${j}" data-k="reps" value="${x.reps ?? 0}" aria-label="${t('reps')}"><span>${t('reps')}</span></label>
          <button class="icon-btn" data-rm-set="${i}:${j}" aria-label="${t('Retirer la série')}">${icon('trash')}</button></div>`).join('')}
        <div class="cell action" data-add-set="${i}" role="button">${icon('plus')} ${t('Série')}</div></div>`)).join('')}
      ${group('', `<div class="cells"><div class="cell action" data-a="add-ex" role="button">${icon('plus')} ${t('Ajouter un exercice')}</div></div>`)}
      <button class="btn filled large" data-a="save">${t('Enregistrer')}</button>`;
  };
  s.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.f) d[el.dataset.f] = el.value;
    if (el.dataset.k) d.exercises[+el.dataset.i].sets[+el.dataset.j][el.dataset.k] = parseFloat(String(el.value).replace(',', '.')) || 0;
  });
  s.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm-set]'), add = e.target.closest('[data-add-set]'), a = e.target.closest('[data-a]')?.dataset.a;
    if (rm) {
      const [i, j] = rm.dataset.rmSet.split(':').map(Number);
      d.exercises[i].sets.splice(j, 1);
      if (!d.exercises[i].sets.length) d.exercises.splice(i, 1);
      return draw();
    }
    if (add) { const ex = d.exercises[+add.dataset.addSet], last = ex.sets[ex.sets.length - 1] || { kg: 0, reps: 8 }; ex.sets.push({ kg: last.kg, reps: last.reps, type: 'normal', done: true }); return draw(); }
    if (a === 'add-ex') {
      return pickExercise((name) => {
        const info = findExercise(name, state.customExercises) || {};
        d.exercises.push({ name, muscle: info.muscle, secondary: info.secondary || [], type: info.type || 'weight_reps', upper: info.upper ?? true, repMin: 8, repMax: 12, sets: [{ kg: 0, reps: 8, type: 'normal', done: true }] });
        draw();
      });
    }
    if (a === 'save') {
      const out = editedWorkout(d, { name: d.name, date: d.date }, today(), latestWeight() || 0);
      if (!out) return toast(t('Ajoute au moins une série avec des répétitions, à une date passée.'));
      const k = state.workouts.findIndex((x) => x.id === out.id);
      if (k >= 0) state.workouts[k] = out; else state.workouts.push(out);
      state.workouts.sort((x, y) => x.date.localeCompare(y.date)); // l'historique suit l'ordre des dates
      save(); s.close(); toast(t(isNew ? 'Séance ajoutée' : 'Séance modifiée'));
    }
  });
  draw();
}

function editRoutine(r, back, { isNew = false } = {}) {
  if (!r) return;
  // Routine neuve refermée sans exercice : on ne la garde pas (sinon une routine vide reste dans la liste).
  const onClose = () => {
    if (isNew && !r.exercises.length && state.routines.includes(r)) { state.routines = state.routines.filter((x) => x !== r); save(); }
    back();
  };
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Routine')}</h3></div><div class="body"></div>`, onClose);
  const draw = () => {
    s.querySelector('.body').innerHTML = `
      ${group('', `<div class="cells">
        <label class="cell field"><span>${t('Nom')}</span><input data-f="name" value="${esc(t(r.name))}"></label>
        <label class="cell field"><span>${t('Dossier')}</span><input data-f="folder" value="${esc(t(r.folder || ''))}" placeholder="${t('Mes routines')}"></label></div>`)}
      ${r.exercises.map((ex, i) => group(esc(t(ex.name)), `<div class="cells">
        <label class="cell field"><span>${t('Séries')}</span><input type="number" inputmode="numeric" data-i="${i}" data-k="sets" value="${esc(ex.sets)}"></label>
        <label class="cell field"><span>${t('Reps min – max')}</span><span class="row" style="justify-content:flex-end"><input type="number" inputmode="numeric" data-i="${i}" data-k="repMin" value="${esc(ex.repMin)}" style="width:3rem">–<input type="number" inputmode="numeric" data-i="${i}" data-k="repMax" value="${esc(ex.repMax)}" style="width:3rem"></span></label>
        <label class="cell field"><span>${t('Repos (s)')}</span><input type="number" inputmode="numeric" data-i="${i}" data-k="rest" value="${esc(ex.rest ?? 90)}"></label>
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
    if (el.dataset.rm) {
      const k = +el.dataset.rm, [gone] = L.splice(k, 1);
      toast(t('Exercice retiré'), { undo: () => { L.splice(k, 0, gone); save(); if (s.isConnected) draw(); } });
    }
    if (el.dataset.a === 'add') {
      return pickExercise((name) => {
        const info = findExercise(name, state.customExercises) || {};
        L.push({ name, muscle: info.muscle, secondary: info.secondary, type: info.type, upper: info.upper, sets: 3, repMin: 8, repMax: 12, rest: info.upper === false ? 150 : 90 });
        save(); draw(); // redessine la feuille ouverte (rouvrir editRoutine empilait une 2e feuille)
      });
    }
    if (el.dataset.a === 'delr') {
      // Routine du programme daté : on prévient, puis on la retire aussi du programme (sinon ses jours affichaient « — »).
      const inPlan = state.plan?.routineIds?.includes(r.id);
      if (!confirm(t(inPlan ? 'Cette routine fait partie de ton programme : ses séances prévues seront retirées. Supprimer ?' : 'Supprimer cette routine ?'))) return;
      state.routines = state.routines.filter((x) => x.id !== r.id);
      if (inPlan) { state.plan.routineIds = state.plan.routineIds.filter((id) => id !== r.id); if (!state.plan.routineIds.length) state.plan = null; }
      save(); s.close(); return;
    }
    save(); draw();
  });
  draw();
}


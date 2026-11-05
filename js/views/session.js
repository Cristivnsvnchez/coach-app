// Séance en direct : chrono/volume/séries, types de série, colonne « Précédent », repos par exercice (±15 s),
// superset, notes, réordonner/remplacer/supprimer, échauffement auto, records en direct, fin de séance.
import * as S from '../science.js';
import * as W from '../workout.js';
import { state, save, today, uid, latestWeight } from '../store.js';
import { findExercise } from '../exercises.js';
import { esc, fmt, toast, sheet, nav, group } from '../ui.js';
import { icon } from '../icons.js';
import { t, register } from '../i18n.js';
import { trainingNote } from '../cycle.js';
import { pickExercise, openExercise, platesSheet } from './exsheets.js';

register({
  en: { 'Cycle : séance plus douce conseillée. Tu peux retirer une série par exercice.': 'Cycle: an easier session is advised. You can drop one set per exercise.',
    'Retirer une série par exercice': 'Remove one set per exercise', 'Cycle : écoute tes sensations aujourd\'hui, adapte si besoin.': 'Cycle: listen to your body today and adjust if needed.',
    'Voir mon cycle': 'See my cycle', 'Séries retirées': 'Sets removed' },
  nl: { 'Cycle : séance plus douce conseillée. Tu peux retirer une série par exercice.': 'Cyclus: een rustigere training wordt aangeraden. Je kunt één set per oefening schrappen.',
    'Retirer une série par exercice': 'Eén set per oefening schrappen', 'Cycle : écoute tes sensations aujourd\'hui, adapte si besoin.': 'Cyclus: luister vandaag naar je lichaam en pas aan indien nodig.',
    'Voir mon cycle': 'Mijn cyclus bekijken', 'Séries retirées': 'Sets geschrapt' },
});

const ACTIVE_KEY = 'coach.active';
export let active = null;
try { active = JSON.parse(localStorage.getItem(ACTIVE_KEY)); } catch {}
let restEnd = 0, restTotal = 0, ticker = null;
let prevRecords = {}; // records historiques par exercice, calculés au démarrage

export function persist() {
  try { active ? localStorage.setItem(ACTIVE_KEY, JSON.stringify(active)) : localStorage.removeItem(ACTIVE_KEY); } catch {}
}

const bw = () => latestWeight() || 0;
const SS_COLORS = ['var(--purple)', 'var(--orange)', 'var(--teal)', 'var(--blue)'];

// Prépare un exercice de séance à partir d'une entrée de routine ou de la bibliothèque.
function sessionExercise(src) {
  const info = findExercise(src.name, state.customExercises) || {};
  const ex = { name: src.name, muscle: src.muscle || info.muscle || 'Abdos', secondary: src.secondary || info.secondary || [],
    type: src.type || info.type || 'weight_reps', upper: src.upper ?? info.upper ?? true,
    repMin: src.repMin || 8, repMax: src.repMax || 12, rest: src.rest || (src.upper ?? info.upper ?? true ? 90 : 150), note: '', supersetId: null };
  const prev = W.previousSets(state.workouts, ex.name).filter((s) => s.type !== 'warmup');
  let load = prev[0]?.kg ?? 0, reps = ex.repMin, why = prev.length ? null : 'Première fois : choisis une charge laissant 2–3 reps en réserve', whyVars;
  if (prev.length) {
    ({ load, reps, why, whyVars } = S.nextSet({ load: prev[0].kg || 0, reps: prev.map((s) => s.reps), repMin: ex.repMin, repMax: ex.repMax,
      rir: Math.min(...prev.map((s) => s.rir ?? 2)), upper: ex.upper }));
  }
  const n = src.sets || 3;
  return { ...ex, why, whyVars, sets: Array.from({ length: n }, () => ({ kg: load, reps, rir: 2, type: 'normal', done: false })) };
}

// deload : semaine de décharge du programme → ~60 % des séries (au moins 1), charges inchangées.
export function startWorkout(routine = null, { deload = false } = {}) {
  active = { id: uid(), name: routine?.name || 'Séance libre', routineId: routine?.id || null, date: today(), start: Date.now(), deload,
    exercises: (routine?.exercises || []).map((e) => sessionExercise(deload ? { ...e, sets: Math.max(1, Math.round((e.sets || 3) * 0.6)) } : e)) };
  persist();
}

function loadRecords() {
  prevRecords = {};
  for (const ex of active.exercises) prevRecords[ex.name] = W.exerciseRecords(state.workouts, ex.name, bw());
}

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;
const hms = (ms) => { const s = Math.floor(ms / 1000); return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : mmss(s); };

// Mise à jour 1×/s du chrono de séance et du minuteur de repos, sans re-rendre la vue.
function tick() {
  const el = document.querySelector('[data-live=dur]');
  if (!el || !active) { clearInterval(ticker); ticker = null; return; }
  el.textContent = hms(Date.now() - active.start);
  const rest = document.querySelector('.rest');
  const left = Math.round((restEnd - Date.now()) / 1000);
  if (rest) {
    rest.hidden = left <= 0;
    if (left > 0) {
      rest.querySelector('.rest-t').textContent = mmss(left);
      rest.querySelector('.rest-bar').style.width = `${(left / restTotal) * 100}%`;
    }
  }
  if (restEnd && left <= 0) { restEnd = 0; navigator.vibrate?.([200, 100, 200]); toast(t('Repos terminé 💪')); }
}

function startRest(sec) { restTotal = sec; restEnd = Date.now() + sec * 1000; tick(); }

export function renderSession(root, go, back) {
  if (!Object.keys(prevRecords).length) loadRecords();
  const vol = W.workoutVolume(active, bw()), sets = W.doneSets(active);
  const ssIndex = {}; let ssN = 0;
  for (const ex of active.exercises) if (ex.supersetId && !(ex.supersetId in ssIndex)) ssIndex[ex.supersetId] = ssN++;

  root.innerHTML = `
    ${nav(t(active.name), {
      left: `<button class="btn plain" data-a="discard">${t('Annuler')}</button>`,
      right: `<button class="btn filled" style="min-height:34px;border-radius:17px" data-a="finish">${t('Terminer')}</button>`,
    })}
    ${active.deload ? `<p class="footnote tint" style="margin:-.5rem 0 .75rem">${t('Semaine de décharge : volume réduit (~60 %).')}</p>` : ''}
    ${cycleBanner()}
    <p class="live-line"><b data-live="dur">${hms(Date.now() - active.start)}</b> · ${fmt(vol)} kg · ${sets} ${t(sets > 1 ? 'séries' : 'série')}</p>
    <div class="rest" hidden role="timer"><div class="rest-bar"></div>
      <button class="icon-btn" data-a="rest-" aria-label="−15 s">−15</button>
      <span>${icon('timer')}<span class="rest-t num"></span></span>
      <button class="icon-btn" data-a="rest+" aria-label="+15 s">+15</button>
      <button class="btn plain" data-a="skip">${t('Passer')}</button></div>
    ${active.exercises.map((ex, i) => exerciseCard(ex, i, ssIndex)).join('')}
    <button class="btn large" data-a="add-ex" style="margin-bottom:1rem">${icon('plus')} ${t('Ajouter un exercice')}</button>
    <p class="group-foot center">${t('Touche le numéro d\'une série pour changer son type (É = échauffement, D = drop set, F = échec). Touche « Précédent » pour recopier.')}</p>`;

  if (!ticker) ticker = setInterval(tick, 1000);
  tick();

  root.oninput = (e) => {
    const el = e.target; if (!el.dataset.k) return;
    const s = active.exercises[el.dataset.i].sets[el.dataset.j];
    s[el.dataset.k] = el.dataset.k === 'note' ? el.value : parseFloat(String(el.value).replace(',', '.')) || 0;
    persist();
  };
  root.onchange = (e) => {
    if (e.target.dataset.note !== undefined) { active.exercises[+e.target.dataset.note].note = e.target.value; persist(); }
  };
  root.onclick = (e) => onClick(e, root, go, back);
}

// Série précédente correspondante : on aligne échauffements entre eux et séries de travail entre elles.
function prevFor(prev, sets, j) {
  const warm = (s) => s.type === 'warmup';
  const rank = sets.slice(0, j).filter((s) => warm(s) === warm(sets[j])).length;
  return prev.filter((s) => warm(s) === warm(sets[j]))[rank] || null;
}

// Bandeau cycle : conseil du jour (trainingNote) si le suivi est actif ; lien vers la vue cycle.
function cycleBanner() {
  const c = state.cycle;
  if (!c?.enabled || state.profile?.sex !== 'F') return '';
  const note = trainingNote(c, today());
  if (!note) return '';
  const removable = active.exercises.some((ex) => ex.sets.filter((x) => x.type !== 'warmup' && !x.done).length > 1);
  return `<div class="cy-banner" role="note"><span>${t(note === 'ease' ? 'Cycle : séance plus douce conseillée. Tu peux retirer une série par exercice.' : 'Cycle : écoute tes sensations aujourd\'hui, adapte si besoin.')}</span>
    <div class="row">${note === 'ease' && removable ? `<button class="btn pill" data-a="cy-ease">${t('Retirer une série par exercice')}</button>` : ''}
    <button class="link" data-a="cy-open">${t('Voir mon cycle')}</button></div></div>`;
}

function exerciseCard(ex, i, ssIndex) {
  const prev = W.previousSets(state.workouts, ex.name);
  const cols = W.EX_TYPES[ex.type]?.cols || ['kg', 'reps'];
  const hasKg = cols.includes('kg'), isDur = cols.includes('sec');
  const pr = prevRecords[ex.name] || W.exerciseRecords([], ex.name);
  const rir = !!state.settings.showRir;
  let normalN = 0;
  const color = ex.supersetId ? SS_COLORS[ssIndex[ex.supersetId] % SS_COLORS.length] : null;
  return `<section class="group ex-card" ${color ? `style="--ss:${color}"` : ''}>
    <div class="cells ${color ? 'superset' : ''}">
      <div class="ex-head">
        <button class="ex-name" data-a="info" data-i="${i}"><span class="headline">${esc(t(ex.name))}</span>
          <span class="footnote secondary">${ex.repMin}–${ex.repMax} ${t('reps')} · ${esc(t(ex.muscle))}${color ? ` · <span style="color:${color}">${t('Superset')}</span>` : ''}</span></button>
        <button class="icon-btn" data-a="menu" data-i="${i}" aria-label="${t('Options')}">${icon('more')}</button>
      </div>
      ${ex.why ? `<p class="ex-why">${icon('chart')} ${esc(t(ex.why, ex.whyVars))}</p>` : ''}
      ${ex.note || ex.showNote ? `<textarea class="ex-note input" rows="1" data-note="${i}" placeholder="${t('Ajouter une note…')}" aria-label="${t('Note')}">${esc(ex.note || '')}</textarea>` : ''}
      <div class="sets s2 ${rir ? 'with-rir' : ''}">
        <div class="set head"><span>${t('Série')}</span><span>${t('Précédent')}</span>${hasKg ? `<span>${ex.type === 'assisted_bw' ? t('Aide') : ex.type === 'weighted_bw' ? '+kg' : 'kg'}</span>` : '<span></span>'}<span>${isDur ? 's' : t('reps')}</span>${rir ? `<span>${t('RIR')}</span>` : ''}<span></span></div>
        ${ex.sets.map((s, j) => {
          const label = W.SET_LABEL[s.type] || String(++normalN);
          const p = prevFor(prev, ex.sets, j);
          const prs = s.done ? W.setPRs(pr, ex, s, bw()) : [];
          const prevTxt = p ? (isDur ? `${p.reps} s` : hasKg ? `${fmt(p.kg, p.kg % 1 ? 1 : 0)}×${p.reps}` : `×${p.reps}`) : '—';
          return `<div class="set ${s.done ? 'done' : ''} t-${s.type}">
            <button class="set-type" data-a="type" data-i="${i}" data-j="${j}" aria-label="${t('Type de série')}">${label}</button>
            <button class="prev" data-a="prev" data-i="${i}" data-j="${j}" ${p ? '' : 'disabled'}>${prevTxt}</button>
            ${hasKg ? `<input type="number" inputmode="decimal" step="0.5" data-i="${i}" data-j="${j}" data-k="kg" value="${s.kg}" aria-label="kg">` : '<span></span>'}
            <input type="number" inputmode="numeric" data-i="${i}" data-j="${j}" data-k="reps" value="${s.reps}" aria-label="${isDur ? 's' : t('reps')}">
            ${rir ? `<input type="number" inputmode="numeric" min="0" max="5" data-i="${i}" data-j="${j}" data-k="rir" value="${s.rir ?? ''}" aria-label="${t('RIR')}">` : ''}
            <button class="check" data-a="done" data-i="${i}" data-j="${j}" aria-label="${t('Série faite')}" aria-pressed="${s.done}"><span class="ring-o">${s.done ? icon('check') : ''}</span></button>
            ${prs.length ? `<span class="pr-badge">${icon('trophy')} PR</span>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="row ex-actions"><button class="btn plain" data-a="add-set" data-i="${i}">${icon('plus')} ${t('Série')}</button>
        <button class="btn plain" data-a="rest-cfg" data-i="${i}">${icon('timer')} ${mmss(ex.rest)}</button></div>
    </div></section>`;
}

function onClick(e, root, go, back) {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const a = el.dataset.a, i = +el.dataset.i, j = +el.dataset.j;
  const ex = active.exercises[i];
  const keep = () => { persist(); const y = root.scrollTop; renderSession(root, go, back); root.scrollTop = y; };

  if (a === 'cy-open') return go('cycle');
  if (a === 'cy-ease') { // retire la dernière série de travail non faite de chaque exercice (au moins 1 série restante)
    for (const x of active.exercises) {
      const idx = x.sets.map((q, k) => (q.type !== 'warmup' && !q.done ? k : -1)).filter((k) => k >= 0);
      if (idx.length > 1) x.sets.splice(idx[idx.length - 1], 1);
    }
    toast(t('Séries retirées')); return keep();
  }

  if (a === 'discard') {
    if (!confirm(t('Abandonner la séance ?'))) return;
    active = null; persist(); restEnd = 0; prevRecords = {}; return back();
  }
  if (a === 'finish') return finish(root, go, back);
  if (a === 'skip') { restEnd = 0; tick(); return; }
  if (a === 'rest-' || a === 'rest+') { restEnd = Math.max(Date.now(), restEnd + (a === 'rest+' ? 15000 : -15000)); restTotal = Math.max(restTotal, (restEnd - Date.now()) / 1000); return tick(); }
  if (a === 'add-ex') return pickExercise((name) => { active.exercises.push(sessionExercise({ name })); loadRecords(); keep(); });
  if (a === 'info') return openExercise(ex.name);
  if (a === 'type') { const s = ex.sets[j]; s.type = W.SET_TYPES[(W.SET_TYPES.indexOf(s.type || 'normal') + 1) % W.SET_TYPES.length]; return keep(); }
  if (a === 'prev') { const p = prevFor(W.previousSets(state.workouts, ex.name), ex.sets, j); if (p) { Object.assign(ex.sets[j], { kg: p.kg, reps: p.reps }); keep(); } return; }
  if (a === 'add-set') { const last = ex.sets[ex.sets.length - 1] || { kg: 0, reps: ex.repMin, rir: 2 }; ex.sets.push({ ...last, type: 'normal', done: false }); return keep(); }
  if (a === 'rest-cfg') {
    const v = prompt(t('Temps de repos pour cet exercice (secondes)'), ex.rest);
    if (v !== null && +v >= 0) { ex.rest = Math.round(+v); keep(); }
    return;
  }
  if (a === 'done') {
    const s = ex.sets[j];
    s.done = !s.done;
    keep();
    if (s.done) {
      const prs = W.setPRs(prevRecords[ex.name] || {}, ex, s, bw());
      if (prs.length) { toast(t('Nouveau record ! 🏆')); navigator.vibrate?.([30, 50, 30]); }
      // Pas de repos avant un drop set ; en superset, repos seulement après le dernier exercice du groupe.
      const next = ex.sets[j + 1];
      const lastOfSuperset = !ex.supersetId || active.exercises[i + 1]?.supersetId !== ex.supersetId;
      if (next?.type !== 'drop' && lastOfSuperset && ex.rest > 0) startRest(ex.rest);
    }
    return;
  }
  if (a === 'menu') return exerciseMenu(i, keep);
}

function exerciseMenu(i, keep) {
  const ex = active.exercises[i];
  const top = ex.sets.find((s) => s.type !== 'warmup')?.kg || 0;
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${esc(t(ex.name))}</h3></div>
    ${group('', `<ul class="cells">
      <li class="cell tap with-icon" data-m="note"><span class="badge">${icon('pencil')}</span><span class="grow">${t('Note')}</span></li>
      <li class="cell tap with-icon" data-m="rir"><span class="badge">${icon('chart')}</span><span class="grow">${state.settings.showRir ? t('Masquer la colonne RIR') : t('Afficher la colonne RIR')}</span></li>
      <li class="cell tap with-icon" data-m="warmup"><span class="badge bg-orange">${icon('flame')}</span><span class="grow">${t('Ajouter les séries d\'échauffement')}</span></li>
      <li class="cell tap with-icon" data-m="plates"><span class="badge bg-blue">${icon('dumbbell')}</span><span class="grow">${t('Calculateur de disques')}</span></li>
      <li class="cell tap with-icon" data-m="superset"><span class="badge bg-purple">${icon('link')}</span><span class="grow">${ex.supersetId ? t('Retirer du superset') : t('Superset avec l\'exercice suivant')}</span></li>
      <li class="cell tap with-icon" data-m="up"><span class="badge bg-teal">${icon('arrowUp')}</span><span class="grow">${t('Monter')}</span></li>
      <li class="cell tap with-icon" data-m="down"><span class="badge bg-teal">${icon('arrowDown')}</span><span class="grow">${t('Descendre')}</span></li>
      <li class="cell tap with-icon" data-m="replace"><span class="badge bg-green">${icon('swap')}</span><span class="grow">${t('Remplacer l\'exercice')}</span></li>
      <li class="cell tap with-icon" data-m="delset"><span class="badge bg-red">${icon('minus')}</span><span class="grow">${t('Supprimer la dernière série')}</span></li>
    </ul>`)}
    ${group('', `<div class="cells"><div class="cell action destructive" data-m="remove">${t('Retirer l\'exercice')}</div></div>`)}`);
  s.addEventListener('click', (e) => {
    const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
    const list = active.exercises;
    if (m === 'warmup') {
      const w = W.warmupSets(top);
      if (!w.length) return toast(t('Renseigne d\'abord la charge de travail'));
      ex.sets = [...w, ...ex.sets.filter((x) => x.type !== 'warmup')];
    }
    if (m === 'plates') { s.close(); return platesSheet(top); }
    if (m === 'note') ex.showNote = true;
    if (m === 'rir') { state.settings.showRir = !state.settings.showRir; save(); }
    if (m === 'superset') {
      if (ex.supersetId) { const id = ex.supersetId; list.forEach((x) => { if (x.supersetId === id) x.supersetId = null; }); }
      else if (list[i + 1]) { const id = list[i + 1].supersetId || uid(); ex.supersetId = id; list[i + 1].supersetId = id; }
      else return toast(t('Ajoute un exercice après celui-ci'));
    }
    if (m === 'up' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
    if (m === 'down' && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
    if (m === 'delset') ex.sets.pop();
    if (m === 'remove') list.splice(i, 1);
    if (m === 'replace') {
      s.close();
      return pickExercise((name) => {
        const fresh = sessionExercise({ name, sets: ex.sets.length, repMin: ex.repMin, repMax: ex.repMax, rest: ex.rest });
        list[i] = { ...fresh, supersetId: ex.supersetId, note: ex.note };
        loadRecords(); keep();
      });
    }
    s.close(); keep();
  });
}

function finish(root, go, back) {
  const sets = W.doneSets(active);
  if (!sets) return toast(t('Valide au moins une série'));
  const minutes = Math.max(1, Math.round((Date.now() - active.start) / 60000));
  const vol = W.workoutVolume(active, bw());
  const prs = [];
  for (const ex of active.exercises) {
    const kinds = new Set();
    for (const s of ex.sets) W.setPRs(prevRecords[ex.name] || {}, ex, s, bw()).forEach((k) => kinds.add(k));
    if (kinds.size) prs.push({ name: ex.name, kinds: [...kinds] });
  }
  const routine = state.routines.find((r) => r.id === active.routineId);
  const differs = W.routineDiffers(routine, active);
  const PRL = { maxKg: 'Charge max', e1rm: '1RM estimé', bestSet: 'Meilleure série', maxReps: 'Reps max' };
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Séance terminée 🎉')}</h3></div>
    <div class="cells stats" style="margin-bottom:1.25rem"><div><small>${t('Durée')}</small><b>${minutes} <span class="u">min</span></b></div>
      <div><small>${t('Volume')}</small><b>${fmt(vol)} <span class="u">kg</span></b></div><div><small>${t('Séries')}</small><b>${sets}</b></div></div>
    <p class="footnote secondary center" style="margin:-.5rem 0 1rem">${t('Séance n° {n}', { n: state.workouts.length + 1 })}</p>
    ${prs.length ? group(t('Records'), `<ul class="cells">${prs.map((p) => `<li class="cell with-icon"><span class="badge bg-orange">${icon('trophy')}</span><div class="grow"><span class="t">${esc(t(p.name))}</span><span class="s">${p.kinds.map((k) => t(PRL[k])).join(' · ')}</span></div></li>`).join('')}</ul>`) : ''}
    ${group('', `<div class="cells"><label class="cell field"><span>${t('Nom')}</span><input name="wname" value="${esc(t(active.name))}"></label>
      ${differs ? `<div class="cell toggle-row"><span class="grow subhead">${t('Mettre à jour la routine avec cette séance')}</span><label class="switch"><input type="checkbox" name="upd" checked><span></span></label></div>` : ''}</div>`)}
    <button class="btn filled large" data-a="save">${t('Enregistrer la séance')}</button>`);
  s.querySelector('[data-a=save]').onclick = () => {
    const w = { ...active, name: s.querySelector('[name=wname]').value.trim() || active.name, minutes, volume: Math.round(vol) };
    w.exercises = w.exercises.map(({ why, whyVars, ...ex }) => ({ ...ex, sets: ex.sets.filter((x) => x.done) })).filter((ex) => ex.sets.length);
    delete w.start;
    w.dayName = w.name; // compatibilité avec l'historique existant
    if (differs && s.querySelector('[name=upd]')?.checked) {
      routine.exercises = active.exercises.map((ex) => ({ name: ex.name, muscle: ex.muscle, secondary: ex.secondary, type: ex.type, upper: ex.upper,
        sets: ex.sets.filter((x) => x.type !== 'warmup').length || 1, repMin: ex.repMin, repMax: ex.repMax, rest: ex.rest }));
    }
    state.workouts.push(w); save();
    active = null; persist(); restEnd = 0; prevRecords = {};
    s.close(); back();
  };
}

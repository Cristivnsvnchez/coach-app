// Séance en direct : chrono/volume/séries, types de série, colonne « Précédent », repos par exercice (±15 s),
// superset, notes, réordonner/remplacer/supprimer, échauffement auto, records en direct, fin de séance.
import * as S from '../science.js';
import * as W from '../workout.js';
import { state, save, today, uid, latestWeight } from '../store.js';
import { findExercise } from '../exercises.js';
import { esc, fmt, toast, sheet, group } from '../ui.js';
import { icon } from '../icons.js';
import { t, register, locale } from '../i18n.js';
import { trainingNote } from '../cycle.js';
import { schedule } from '../planner.js';
import { pickExercise, openExercise, platesSheet } from './exsheets.js';
import { wake, unlockAudio, restBeep } from '../cues.js';

register({
  en: { 'Cycle : séance plus douce conseillée. Tu peux retirer une série par exercice.': 'Cycle: an easier session is advised. You can drop one set per exercise.',
    'Retirer une série par exercice': 'Remove one set per exercise', 'Cycle : écoute tes sensations aujourd\'hui, adapte si besoin.': 'Cycle: listen to your body today and adjust if needed.',
    'Voir mon cycle': 'See my cycle', 'Séries retirées': 'Sets removed',
    'Séance en cours': 'Workout in progress', 'kg soulevés': 'kg lifted', 'séries faites': 'sets done', 'Exercice retiré': 'Exercise removed', 'Série supprimée': 'Set removed',
    'Aucune série validée : terminer sans enregistrer la séance ?': 'No set logged: finish without saving the workout?', 'Abandonner sans enregistrer': 'Discard without saving',
    'Abandonner': 'Discard', 'Terminer la séance': 'Finish workout', 'Temps de repos': 'Rest time', 'Aucun': 'None',
    'Séance commencée il y a {h} h. Tu l\'as oubliée ?': 'Workout started {h} h ago. Did you forget it?', 'Continuer': 'Continue',
    'Séance enregistrée': 'Workout saved', 'Séance enregistrée · prochaine : {n}, {d}': 'Workout saved · next: {n}, {d}',
    'Revenir au Journal': 'Back to Journal', '{n} séries faites': '{n} sets done', 'précédent {kg} kg': 'last {kg} kg', 'Repos': 'Rest', 'Nouveau record · {kg} kg × {r}': 'New record · {kg} kg × {r}',
    'Repos · série {n} à {kg} kg': 'Rest · set {n} at {kg} kg', '1 record': '1 record', '{n} records': '{n} records', '{n} séries': '{n} sets' },
  nl: { 'Cycle : séance plus douce conseillée. Tu peux retirer une série par exercice.': 'Cyclus: een rustigere training wordt aangeraden. Je kunt één set per oefening schrappen.',
    'Retirer une série par exercice': 'Eén set per oefening schrappen', 'Cycle : écoute tes sensations aujourd\'hui, adapte si besoin.': 'Cyclus: luister vandaag naar je lichaam en pas aan indien nodig.',
    'Voir mon cycle': 'Mijn cyclus bekijken', 'Séries retirées': 'Sets geschrapt',
    'Séance en cours': 'Training bezig', 'kg soulevés': 'kg getild', 'séries faites': 'sets gedaan', 'Exercice retiré': 'Oefening verwijderd', 'Série supprimée': 'Set verwijderd',
    'Aucune série validée : terminer sans enregistrer la séance ?': 'Geen set afgevinkt: training beëindigen zonder op te slaan?', 'Abandonner sans enregistrer': 'Verwerpen zonder op te slaan',
    'Abandonner': 'Afbreken', 'Terminer la séance': 'Training afronden', 'Temps de repos': 'Rusttijd', 'Aucun': 'Geen',
    'Séance commencée il y a {h} h. Tu l\'as oubliée ?': 'Training {h} u geleden gestart. Vergeten?', 'Continuer': 'Doorgaan',
    'Séance enregistrée': 'Training opgeslagen', 'Séance enregistrée · prochaine : {n}, {d}': 'Training opgeslagen · volgende: {n}, {d}',
    'Revenir au Journal': 'Terug naar Dagboek', '{n} séries faites': '{n} sets gedaan', 'précédent {kg} kg': 'vorige {kg} kg', 'Repos': 'Rust', 'Nouveau record · {kg} kg × {r}': 'Nieuw record · {kg} kg × {r}',
    'Repos · série {n} à {kg} kg': 'Rust · set {n} met {kg} kg', '1 record': '1 record', '{n} records': '{n} records', '{n} séries': '{n} sets' },
});

const ACTIVE_KEY = 'coach.active';
export let active = null;
try { active = JSON.parse(localStorage.getItem(ACTIVE_KEY)); } catch {}
let restEnd = 0, restTotal = 0, ticker = null;
let prevRecords = {}; // records historiques par exercice, calculés au démarrage

// Oublie la séance en cours, en mémoire ET dans le stockage (effacement / restauration des données depuis Profil).
export function clearActive() { active = null; restEnd = 0; prevRecords = {}; persist(); }

export function persist() {
  try { active ? localStorage.setItem(ACTIVE_KEY, JSON.stringify(active)) : localStorage.removeItem(ACTIVE_KEY); } catch {}
  wake?.set(!!active); // écran allumé pendant toute la séance, relâché à la fin
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

// Ajoute un exercice à la séance en cours (fiche Apprendre). false si pas de séance ou déjà présent.
export function addToActive(name) {
  if (!active || active.exercises.some((e) => e.name === name)) return false;
  active.exercises.push(sessionExercise({ name })); loadRecords(); persist();
  return true;
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
      const arc = rest.querySelector('.rest-arc');
      if (arc) arc.setAttribute('stroke-dasharray', `${(RC * left / Math.max(1, restTotal)).toFixed(1)} ${RC.toFixed(1)}`);
    }
  }
  if (restEnd && left <= 0) { restEnd = 0; navigator.vibrate?.([200, 100, 200]); restBeep(); toast(t('Repos terminé')); }
}

const RC = 2 * Math.PI * 20;
let restInfo = '';
function startRest(sec, info = '') { restTotal = sec; restInfo = info; restEnd = Date.now() + sec * 1000; const r = document.querySelector('.rest small'); if (r) r.textContent = info; tick(); }

// Pilule « Nouveau record » (canevas seance-4) : orange, en bas, 3 s.
function recordPill(text) {
  document.querySelector('.se-pr')?.remove();
  const el = document.createElement('div');
  el.className = 'se-pr'; el.setAttribute('role', 'status');
  el.innerHTML = `${icon('trophy')}<span>${esc(text)}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function renderSession(root, go, back) {
  if (!Object.keys(prevRecords).length) loadRecords();
  wake?.set(true);
  const vol = W.workoutVolume(active, bw()), sets = W.doneSets(active);
  const ssIndex = {}; let ssN = 0;
  for (const ex of active.exercises) if (ex.supersetId && !(ex.supersetId in ssIndex)) ssIndex[ex.supersetId] = ssN++;

  const total = active.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const pct = total ? Math.round((sets / total) * 100) : 0;
  // Exercice ouvert : celui touché, sinon le premier qui n'est pas terminé (les autres sont repliés).
  const firstOpen = active.exercises.findIndex((ex) => !ex.sets.length || ex.sets.some((x) => !x.done));
  if (active.open == null || !active.exercises[active.open]) active.open = firstOpen < 0 ? 0 : firstOpen;
  root.innerHTML = `
    <section class="v2-hero se-hero2"><div class="v2-blobs" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i></div>
      <div class="v2-top se-top2"><button class="v2-cb glass" data-a="leave" aria-label="${t('Revenir au Journal')}">${icon('chevronLeft')}</button>
        <button class="se-term" data-a="finish">${t('Terminer')}</button></div>
      <p class="se-k">${esc(t(active.name))} · ${t('Séance en cours')}</p>
      <div class="se-nums"><div><b class="num" data-live="dur">${hms(Date.now() - active.start)}</b><small>${t('Durée')}</small></div>
        <div><b class="num">${fmt(vol)}</b><small>${t('kg soulevés')}</small></div>
        <div><b class="num">${sets}</b><small>${t('séries faites')}</small></div></div>
      <div class="se-prog" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${t('séries faites')}"><i style="width:${pct}%"></i></div>
    </section>
    <div class="v2-leaf se-leaf">
    ${active.deload ? `<p class="footnote tint se-note">${t('Semaine de décharge : volume réduit (~60 %).')}</p>` : ''}
    ${Date.now() - active.start > 12 * 3600000 && !active.staleOk ? `<div class="cy-banner" role="note"><span>${t('Séance commencée il y a {h} h. Tu l\'as oubliée ?', { h: Math.floor((Date.now() - active.start) / 3600000) })}</span>
      <div class="row"><button class="btn pill" data-a="discard">${t('Abandonner')}</button><button class="link" data-a="stale-ok">${t('Continuer')}</button></div></div>` : ''}
    ${cycleBanner()}
    ${active.exercises.map((ex, i) => (i === active.open ? exerciseCard(ex, i, ssIndex) : miniCard(ex, i, ssIndex))).join('')}
    <button class="btn large wide se-add" data-a="add-ex">${icon('plus')} ${t('Ajouter un exercice')}</button>
    <p class="group-foot center">${t('Touche le numéro d\'une série pour changer son type (É = échauffement, D = drop set, F = échec). Touche « Précédent » pour recopier.')}</p>
    </div>
    <div class="rest se-rest" hidden role="timer"><button class="se-rring" data-a="skip" aria-label="${t('Passer')}"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="5"/>
        <circle class="rest-arc" cx="24" cy="24" r="20" fill="none" stroke="var(--a-warm)" stroke-width="5" stroke-linecap="round" transform="rotate(-90 24 24)"/></svg></button>
      <div class="grow"><b class="rest-t num"></b><small>${esc(restInfo)}</small></div>
      <button class="se-rbtn" data-a="rest-" aria-label="−15 s">−15</button><button class="se-rbtn" data-a="rest+" aria-label="+15 s">+15</button></div>`;

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

// Exercice replié (canevas seance-2) : pictogramme, nom, séries prévues et charge précédente.
function miniCard(ex, i, ssIndex) {
  const prev = W.previousSets(state.workouts, ex.name).filter((x) => x.type !== 'warmup');
  const color = ex.supersetId ? SS_COLORS[ssIndex[ex.supersetId] % SS_COLORS.length] : null;
  const nDone = ex.sets.filter((x) => x.done).length, complete = ex.sets.length > 0 && nDone === ex.sets.length;
  const reps = ex.sets.find((x) => x.type !== 'warmup')?.reps ?? ex.repMin;
  return `<button class="v2-card v2-row se-mini ${complete ? 'complete' : ''}" data-a="open" data-i="${i}" ${color ? `style="--ss:${color}"` : ''}>
    <span class="v2-av">${icon(complete ? 'check' : 'training')}</span><span class="grow"><span class="v2-lb" style="display:block">${esc(t(ex.name))}</span>
    <span class="v2-sm num">${complete ? t('{n} séries faites', { n: nDone }) : `${ex.sets.length} × ${reps}${prev[0]?.kg ? ' · ' + t('précédent {kg} kg', { kg: fmt(prev[0].kg, prev[0].kg % 1 ? 1 : 0) }) : ''}`}</span></span>
    ${icon('chevronRight', { cls: 'v2-chev' })}</button>`;
}

function exerciseCard(ex, i, ssIndex) {
  const prev = W.previousSets(state.workouts, ex.name);
  const cols = W.EX_TYPES[ex.type]?.cols || ['kg', 'reps'];
  const hasKg = cols.includes('kg'), isDur = cols.includes('sec');
  const pr = prevRecords[ex.name] || W.exerciseRecords([], ex.name);
  const rir = !!state.settings.showRir;
  let normalN = 0;
  const color = ex.supersetId ? SS_COLORS[ssIndex[ex.supersetId] % SS_COLORS.length] : null;
  return `<section class="v2-card se-card ${color ? 'superset' : ''}" ${color ? `style="--ss:${color}"` : ''}>
      <div class="se-ch"><div class="grow"><button class="ex-name" data-a="info" data-i="${i}">${esc(t(ex.name))}</button>
          <span class="v2-sm"><button class="se-restlink" data-a="rest-cfg" data-i="${i}">${t('Repos')} ${ex.rest ? mmss(ex.rest) : t('Aucun')}</button> · ${esc(ex.repMin)}–${esc(ex.repMax)} ${t('reps')} · ${esc(t(ex.muscle))}${color ? ` · <span style="color:${color}">${t('Superset')}</span>` : ''}</span></div>
        <button class="v2-cb" data-a="menu" data-i="${i}" aria-label="${t('Options')}">${icon('more')}</button></div>
      ${ex.why ? `<p class="ex-why">${icon('chart')} ${esc(t(ex.why, ex.whyVars))}</p>` : ''}
      ${ex.note || ex.showNote ? `<textarea class="ex-note input" rows="1" data-note="${i}" placeholder="${t('Ajouter une note…')}" aria-label="${t('Note')}">${esc(ex.note || '')}</textarea>` : ''}
      <div class="se-grid ${rir ? 'rir' : ''}">
        <div class="se-row head"><span>${t('Série')}</span><span>${t('Précédent')}</span>${hasKg ? `<span>${ex.type === 'assisted_bw' ? t('Aide') : ex.type === 'weighted_bw' ? '+kg' : 'kg'}</span>` : '<span></span>'}<span>${isDur ? 's' : t('reps')}</span>${rir ? `<span>${t('RIR')}</span>` : ''}<span></span></div>
        ${ex.sets.map((s, j) => {
          const label = W.SET_LABEL[s.type] || String(++normalN);
          const p = prevFor(prev, ex.sets, j);
          const prs = s.done ? W.setPRs(pr, ex, s, bw()) : [];
          const prevTxt = p ? (isDur ? `${p.reps} s` : hasKg ? `${fmt(p.kg, p.kg % 1 ? 1 : 0)} × ${p.reps}` : `× ${p.reps}`) : '—';
          return `<div class="se-row ${s.done ? 'done' : ''} t-${esc(s.type)}">
            <button class="set-type" data-a="type" data-i="${i}" data-j="${j}" aria-label="${t('Type de série')}">${label}</button>
            <button class="prev" data-a="prev" data-i="${i}" data-j="${j}" ${p ? '' : 'disabled'}>${prevTxt}</button>
            ${hasKg ? `<input type="number" inputmode="decimal" step="0.5" data-i="${i}" data-j="${j}" data-k="kg" value="${esc(s.kg)}" aria-label="kg">` : '<span></span>'}
            <input type="number" inputmode="numeric" data-i="${i}" data-j="${j}" data-k="reps" value="${esc(s.reps)}" aria-label="${isDur ? 's' : t('reps')}">
            ${rir ? `<input type="number" inputmode="numeric" min="0" max="5" data-i="${i}" data-j="${j}" data-k="rir" value="${esc(s.rir)}" aria-label="${t('RIR')}">` : ''}
            <button class="se-chk" data-a="done" data-i="${i}" data-j="${j}" aria-label="${t('Série faite')}" aria-pressed="${s.done}">${s.done ? icon('check') : ''}</button>
            ${prs.length ? `<span class="pr-badge">${icon('trophy')}</span>` : ''}
          </div>`;
        }).join('')}
      </div>
      <button class="btn wide se-addset" data-a="add-set" data-i="${i}">${icon('plus')} ${t('Série')}</button>
    </section>`;
}

function onClick(e, root, go, back) {
  unlockAudio(); // iOS : le son de fin de repos n'est permis qu'après un toucher
  wake?.set(true); // redemandé au toucher si le système l'a refusé au démarrage
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const a = el.dataset.a, i = +el.dataset.i, j = +el.dataset.j;
  const ex = active.exercises[i];
  const keep = () => { persist(); const y = root.scrollTop; renderSession(root, go, back); root.scrollTop = y; };

  if (a === 'cy-open') return go('cycle');
  if (a === 'leave') return go('today');
  if (a === 'open') { active.open = i; return keep(); }
  if (a === 'cy-ease') { // retire la dernière série de travail non faite de chaque exercice (au moins 1 série restante)
    for (const x of active.exercises) {
      const idx = x.sets.map((q, k) => (q.type !== 'warmup' && !q.done ? k : -1)).filter((k) => k >= 0);
      if (idx.length > 1) x.sets.splice(idx[idx.length - 1], 1);
    }
    toast(t('Séries retirées')); return keep();
  }

  if (a === 'discard') {
    if (!confirm(t('Abandonner la séance ?'))) return;
    return endSession(back);
  }
  if (a === 'finish') return finish(root, go, back);
  if (a === 'skip') { restEnd = 0; tick(); return; }
  if (a === 'rest-' || a === 'rest+') { if (!restEnd) return; restEnd = Math.max(Date.now(), restEnd + (a === 'rest+' ? 15000 : -15000)); restTotal = Math.max(restTotal, (restEnd - Date.now()) / 1000); return tick(); }
  if (a === 'add-ex') return pickExercise((name) => { active.exercises.push(sessionExercise({ name })); loadRecords(); keep(); });
  if (a === 'info') return openExercise(ex.name);
  if (a === 'type') { const s = ex.sets[j]; s.type = W.SET_TYPES[(W.SET_TYPES.indexOf(s.type || 'normal') + 1) % W.SET_TYPES.length]; return keep(); }
  if (a === 'prev') { const p = prevFor(W.previousSets(state.workouts, ex.name), ex.sets, j); if (p) { Object.assign(ex.sets[j], { kg: p.kg, reps: p.reps }); keep(); } return; }
  if (a === 'add-set') { const last = ex.sets[ex.sets.length - 1] || { kg: 0, reps: ex.repMin, rir: 2 }; ex.sets.push({ ...last, type: 'normal', done: false }); return keep(); }
  if (a === 'rest-cfg') return restSheet(ex, keep);
  if (a === 'stale-ok') { active.staleOk = true; return keep(); }
  if (a === 'done') {
    const s = ex.sets[j];
    s.done = !s.done;
    keep();
    if (s.done) {
      const prs = W.setPRs(prevRecords[ex.name] || {}, ex, s, bw());
      if (prs.length) { recordPill(t('Nouveau record · {kg} kg × {r}', { kg: fmt(s.kg, s.kg % 1 ? 1 : 0), r: s.reps })); navigator.vibrate?.([30, 50, 30]); }
      // Pas de repos avant un drop set ; en superset, repos seulement après le dernier exercice du groupe.
      const next = ex.sets[j + 1];
      const lastOfSuperset = !ex.supersetId || active.exercises[i + 1]?.supersetId !== ex.supersetId;
      const nx = next || null;
      if (next?.type !== 'drop' && lastOfSuperset && ex.rest > 0) startRest(ex.rest, nx ? t('Repos · série {n} à {kg} kg', { n: j + 2, kg: fmt(nx.kg, nx.kg % 1 ? 1 : 0) }) : t('Repos'));
      // Toutes les séries faites : l'exercice suivant s'ouvre.
      if (ex.sets.every((x) => x.done)) { const k = active.exercises.findIndex((x, n) => n > i && x.sets.some((q) => !q.done)); if (k >= 0) { active.open = k; keep(); } }
    }
    return;
  }
  if (a === 'menu') return exerciseMenu(i, keep);
}

// Repos d'un exercice : −15 / +15 s et valeurs courantes ; 0 = pas de minuteur.
function restSheet(ex, keep) {
  let v = ex.rest;
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Temps de repos')}</h3></div>
    <p class="footnote secondary" style="margin:-.5rem 0 1rem">${esc(t(ex.name))}</p>
    <div class="se-rest-pick"><button class="icon-btn round" data-r="-15" aria-label="−15 s">${icon('minus')}</button>
      <b class="num" aria-live="polite"></b><button class="icon-btn round" data-r="15" aria-label="+15 s">${icon('plus')}</button></div>
    <div class="chips wrap se-rest-chips">${[0, 60, 90, 120, 150, 180].map((x) => `<button class="chip" data-set="${x}">${x ? mmss(x) : t('Aucun')}</button>`).join('')}</div>
    <button class="btn filled large" data-a="ok">${t('Enregistrer')}</button>`);
  const draw = () => { s.querySelector('.se-rest-pick b').textContent = v ? mmss(v) : t('Aucun'); s.querySelectorAll('[data-set]').forEach((b) => b.classList.toggle('on', +b.dataset.set === v)); };
  s.addEventListener('click', (e) => {
    const r = e.target.closest('[data-r]'), p = e.target.closest('[data-set]');
    if (r) v = Math.max(0, Math.min(600, v + +r.dataset.r));
    if (p) v = +p.dataset.set;
    if (e.target.closest('[data-a=ok]')) { ex.rest = v; s.close(); return keep(); }
    draw();
  });
  draw();
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
    if (m === 'delset' || m === 'remove') {
      // Suppression réversible : on garde une copie de la liste d'exercices pour « Annuler ».
      const before = JSON.parse(JSON.stringify(list));
      if (m === 'delset') ex.sets.pop(); else list.splice(i, 1);
      s.close(); keep();
      return toast(t(m === 'remove' ? 'Exercice retiré' : 'Série supprimée'), { undo: () => { if (!active) return; active.exercises = before; keep(); } });
    }
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

// Ferme la séance en cours sans l'enregistrer.
// Après l'enregistrement : la prochaine séance du programme (dans les 14 jours), pour savoir quoi faire ensuite.
function nextSessionText() {
  const plan = state.plan; if (!plan) return '';
  const from = S.isoDate(new Date(Date.now() + 86400000)), to = S.isoDate(new Date(Date.now() + 14 * 86400000));
  const ev = schedule(plan, from, to)[0]; if (!ev) return '';
  const r = state.routines.find((x) => x.id === ev.routineId); if (!r) return '';
  const day = new Date(ev.date + 'T12:00').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'short' });
  return t('Séance enregistrée · prochaine : {n}, {d}', { n: t(r.name), d: day });
}

function endSession(back) { active = null; persist(); restEnd = 0; prevRecords = {}; back(); }

function finish(root, go, back) {
  const sets = W.doneSets(active);
  // Aucune série validée : rien à enregistrer, mais on doit pouvoir sortir (sinon la séance reste bloquée).
  if (!sets) { if (confirm(t('Aucune série validée : terminer sans enregistrer la séance ?'))) endSession(back); return; }
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
  const best = (name) => { const ex = active.exercises.find((x) => x.name === name); const d = ex?.sets.filter((x) => x.done) || [];
    const top = d.reduce((m, x) => ((+x.kg || 0) > (+m?.kg || 0) ? x : m), d[0]); return top ? `${fmt(top.kg, top.kg % 1 ? 1 : 0)} kg × ${top.reps}` : ''; };
  const now = new Date();
  const s = sheet(`<div class="fs-bar"><span class="fs-bar-t">${t('Terminer la séance')}</span></div>
    <input class="fs-name" name="wname" value="${esc(t(active.name))}" aria-label="${t('Nom')}">
    <p class="v2-sm fs-date">${now.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })} · ${now.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })} · ${t('Séance n° {n}', { n: state.workouts.length + 1 })}</p>
    <div class="wd-stats"><div class="v2-card"><b class="v2-num">${minutes} min</b><small>${t('Durée')}</small></div>
      <div class="v2-card"><b class="v2-num">${fmt(vol)}</b><small>${t('kg soulevés')}</small></div><div class="v2-card"><b class="v2-num">${sets}</b><small>${t('séries')}</small></div></div>
    ${prs.length ? `<div class="fs-pr"><span class="fs-pr-ic">${icon('trophy')}</span><div><b>${t(prs.length === 1 ? '1 record' : '{n} records', { n: prs.length })}</b>
      ${prs.map((p) => `<span class="v2-sm" style="display:block">${esc(t(p.name))} ${best(p.name)} · ${p.kinds.map((k) => t(PRL[k])).join(' · ')}</span>`).join('')}</div></div>` : ''}
    <div class="v2-card wd-list">${active.exercises.filter((ex) => ex.sets.some((x) => x.done)).map((ex) => { const d = ex.sets.filter((x) => x.done);
      return `<div class="v2-li fs-ex"><span class="fs-ok">${icon('check')}</span><span class="grow"><span class="v2-lb" style="display:block">${esc(t(ex.name))}</span>
        <span class="v2-sm num">${t('{n} séries', { n: d.length })} · ${fmt(W.workoutVolume({ exercises: [{ ...ex, sets: d }] }, bw()))} kg</span></span></div>`; }).join('')}</div>
    ${differs ? `<div class="v2-card fs-upd"><span class="grow">${t('Mettre à jour la routine avec cette séance')}</span><label class="switch"><input type="checkbox" name="upd" checked><span></span></label></div>` : ''}
    <button class="btn filled large wide v2-go" data-a="save">${t('Enregistrer la séance')}</button>
    <button class="btn plain wide fs-drop" data-a="drop">${t('Abandonner')}</button>`);
  // On doit toujours pouvoir sortir sans enregistrer (la croix, elle, ramène à la séance en cours).
  s.querySelector('[data-a=drop]').onclick = () => {
    if (!confirm(t('Abandonner la séance ?'))) return;
    s.close(); endSession(back);
  };
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
    toast(nextSessionText() || t('Séance enregistrée'), { ms: 4000 });
  };
}

// Feuilles liées aux exercices : sélection (bibliothèque + perso), fiche (graphique, records, historique), disques.
import * as W from '../workout.js';
import { MUSCLES, parseDate } from '../science.js';
import { state, save, latestWeight } from '../store.js';
import { LIBRARY, EQUIPMENT, findExercise } from '../exercises.js';
import { esc, fmt, fmtDate, sheet, group, lineChart, toast } from '../ui.js';
import { icon } from '../icons.js';
import { t, register } from '../i18n.js';
import { getTechnique } from '../technique.js';

register({ en: { 'Technique': 'Technique' }, nl: { 'Technique': 'Techniek' } });

const TYPE_LABEL = { weight_reps: 'Charge + reps', bodyweight: 'Poids du corps', weighted_bw: 'Poids du corps lesté', assisted_bw: 'Poids du corps assisté', duration: 'Durée' };

// Sélecteur d'exercice. onPick(name).
export function pickExercise(onPick) {
  let q = '', muscle = '';
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Ajouter un exercice')}</h3></div>
    <label class="searchbar" style="margin-bottom:.5rem">${icon('search')}<input type="search" name="q" placeholder="${t('Rechercher un exercice')}" autocomplete="off" aria-label="${t('Rechercher un exercice')}"></label>
    <div class="chips"><button class="chip on" data-mu="">${t('Tous')}</button>${MUSCLES.map((m) => `<button class="chip" data-mu="${m}">${t(m)}</button>`).join('')}</div>
    <div class="list"></div>`);
  const all = () => [...state.customExercises.map((e) => ({ ...e, custom: true })), ...LIBRARY];
  const draw = () => {
    const ql = q.toLowerCase();
    const items = all().filter((e) => (!muscle || e.muscle === muscle) && (!ql || e.name.toLowerCase().includes(ql) || t(e.name).toLowerCase().includes(ql)));
    s.querySelector('.list').innerHTML = group('', `<ul class="cells">${items.map((e) => `<li class="cell tap" data-pick="${esc(e.name)}"><div class="grow"><span class="t">${esc(t(e.name))}</span>
      <span class="s">${esc(t(e.muscle))}${e.secondary?.length ? ' · ' + e.secondary.map((m) => esc(t(m))).join(', ') : ''}${e.custom ? ' · ' + t('Perso') : ''}</span></div>${icon('plus', { cls: 'tint' })}</li>`).join('')
      || `<li class="empty">${t('Aucun exercice trouvé.')}</li>`}
      <li class="cell action" data-a="custom">${icon('pencil')} ${t('Créer un exercice personnalisé')}</li></ul>`);
  };
  s.querySelector('[name=q]').oninput = (e) => { q = e.target.value; draw(); };
  s.addEventListener('click', (e) => {
    const mu = e.target.closest('[data-mu]');
    if (mu) { muscle = mu.dataset.mu; s.querySelectorAll('[data-mu]').forEach((b) => b.classList.toggle('on', b === mu)); return draw(); }
    const p = e.target.closest('[data-pick]');
    if (p) { s.close(); return onPick(p.dataset.pick); }
    if (e.target.closest('[data-a=custom]')) { s.close(); customExercise(q, onPick); }
  });
  draw();
}

function customExercise(name, onPick) {
  const opt = (arr, lab = (x) => x) => arr.map((x) => `<option value="${x}">${esc(t(lab(x)))}</option>`).join('');
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Nouvel exercice')}</h3></div>
    <form>${group('', `<div class="cells">
      <label class="cell field"><span>${t('Nom')}</span><input name="name" required value="${esc(name)}"></label>
      <label class="cell field"><span>${t('Muscle principal')}</span><select name="muscle">${opt(MUSCLES)}</select></label>
      <label class="cell field"><span>${t('Équipement')}</span><select name="equipment">${opt(EQUIPMENT)}</select></label>
      <label class="cell field"><span>${t('Type')}</span><select name="type">${opt(Object.keys(TYPE_LABEL), (k) => TYPE_LABEL[k])}</select></label>
      <div class="cell toggle-row"><span class="grow">${t('Haut du corps')}</span><label class="switch"><input type="checkbox" name="upper" checked><span></span></label></div></div>`,
      t('Le type ne pourra plus être changé ensuite (il détermine les colonnes et le calcul du volume).'))}
      <button class="btn filled large">${t('Créer')}</button></form>`);
  s.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    const n = v.name.trim();
    if (findExercise(n, state.customExercises)) return toast(t('Cet exercice existe déjà'));
    state.customExercises.push({ name: n, muscle: v.muscle, secondary: [], equipment: v.equipment, type: v.type, upper: !!v.upper });
    save(); s.close(); onPick(n);
  };
}

// Fiche exercice : graphique (e1RM / charge max / volume), records, historique.
export function openExercise(name) {
  let metric = 'e1rm', range = 90;
  const bw = latestWeight() || 0;
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${esc(t(name))}</h3></div><div class="body"></div>`);
  const draw = () => {
    const info = findExercise(name, state.customExercises) || {};
    const r = W.exerciseRecords(state.workouts, name, bw);
    const since = range ? Date.now() - range * 86400000 : 0;
    const pts = W.exerciseSeries(state.workouts, name, metric, bw).filter((p) => parseDate(p.date) >= since);
    const hist = state.workouts.filter((w) => w.exercises.some((e) => e.name === name)).slice(-15).reverse();
    s.querySelector('.body').innerHTML = `
      <p class="footnote secondary" style="margin:-.5rem 0 1rem">${esc(t(info.muscle || ''))}${info.secondary?.length ? ' · ' + info.secondary.map((m) => esc(t(m))).join(', ') : ''}${info.type ? ' · ' + t(TYPE_LABEL[info.type]) : ''}</p>
      ${getTechnique(name) ? `<button class="btn plain bold" data-tech style="margin:-.5rem 0 .75rem">${icon('sparkles')} ${t('Technique')}</button>` : ''}
      ${group('', `<div class="cells"><div class="cell chart-cell" style="display:block">
        <div class="seg">${[['e1rm', '1RM estimé'], ['maxKg', 'Charge max'], ['volume', 'Volume']].map(([k, l]) => `<button data-m="${k}" class="${k === metric ? 'on' : ''}">${t(l)}</button>`).join('')}</div>
        ${lineChart([{ points: pts.map((p) => ({ x: parseDate(p.date), y: p.y })), cls: 'trend', dots: true }], { yPad: 2 })}
        <div class="seg" style="margin-top:.5rem">${[[90, '3 mois'], [365, '1 an'], [0, 'Tout']].map(([k, l]) => `<button data-r="${k}" class="${k === range ? 'on' : ''}">${t(l)}</button>`).join('')}</div>
      </div></div>`)}
      ${group(t('Records'), `<ul class="cells">
        <li class="cell"><span class="grow">${t('1RM estimé')}</span><span class="val">${fmt(r.e1rm, 1)} kg</span></li>
        <li class="cell"><span class="grow">${t('Charge max')}</span><span class="val">${fmt(r.maxKg, 1)} kg</span></li>
        <li class="cell"><span class="grow">${t('Meilleure série (kg × reps)')}</span><span class="val">${fmt(r.bestSet)} kg</span></li>
        <li class="cell"><span class="grow">${t('Meilleur volume en une séance')}</span><span class="val">${fmt(r.bestSession)} kg</span></li>
        <li class="cell"><span class="grow">${t('Reps max')}</span><span class="val">${fmt(r.maxReps)}</span></li></ul>`, t('Hors séries d\'échauffement. 1RM estimé : formule d\'Epley.'))}
      ${group(t('Historique'), `<ul class="cells">${hist.map((w) => {
        const ex = w.exercises.find((e) => e.name === name);
        return `<li class="cell"><div class="grow"><span class="t">${fmtDate(w.date, { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}</span>
          <span class="s num" style="white-space:normal">${ex.sets.filter((x) => x.done).map((x) => `${x.type && x.type !== 'normal' ? W.SET_LABEL[x.type] + ' ' : ''}${x.kg ? fmt(x.kg, 1) + '×' : ''}${x.reps}`).join(' · ')}</span></div></li>`;
      }).join('') || `<li class="empty">${t('Aucune séance.')}</li>`}</ul>`)}`;
  };
  s.addEventListener('click', async (e) => {
    if (e.target.closest('[data-tech]')) { const { openTechnique } = await import('./learn.js'); return openTechnique(name); } // import différé : évite le cycle learn ↔ exsheets
    const m = e.target.closest('[data-m]'); if (m) { metric = m.dataset.m; return draw(); }
    const r = e.target.closest('[data-r]'); if (r) { range = +r.dataset.r; draw(); }
  });
  draw();
}

// Calculateur de disques (barre 20 kg par défaut).
export function platesSheet(kg = 60) {
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Calculateur de disques')}</h3></div>
    ${group('', `<div class="cells">
      <label class="cell field"><span>${t('Charge totale (kg)')}</span><input name="kg" type="number" inputmode="decimal" step="0.5" value="${kg || 60}"></label>
      <label class="cell field"><span>${t('Barre (kg)')}</span><input name="bar" type="number" inputmode="decimal" value="20"></label></div>`)}
    <div class="plates-out"></div>`);
  const draw = () => {
    const total = +s.querySelector('[name=kg]').value || 0, bar = +s.querySelector('[name=bar]').value || 0;
    const p = W.plates(total, bar);
    s.querySelector('.plates-out').innerHTML = group(t('Par côté'), `<div class="cells"><div class="cell plates-viz">
      <span class="bar-end"></span>${p.perSide.map((x) => `<span class="plate" style="--h:${40 + Math.min(60, x * 2.4)}%">${fmt(x, x % 1 ? 2 : 0)}</span>`).join('') || `<span class="secondary">${t('Barre seule')}</span>`}</div></div>`,
      p.remainder ? t('Impossible exactement : il manque {r} kg.', { r: fmt(p.remainder, 2) }) : '');
  };
  s.addEventListener('input', draw);
  draw();
}

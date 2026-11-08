// Onglet Journal : en-tête (Planning, Profil), héros palette (kcal restantes, mangé / brûlé), tuiles macros, pastille cycle,
// checklist + eau, une carte par repas, repères ANSES (fruits & légumes, poisson).
import { state, save, dayLog, sum, today, uid } from '../store.js';
import { current } from '../metrics.js';
import { isoDate, parseDate } from '../science.js';
import { esc, fmt, fmtDate, toast, group, sheet } from '../ui.js';
import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { register } from '../i18n.js';
import { phaseOn, nextStarts } from '../cycle.js';
import { GOALS, addPortion, getPortions, weekTotal, avg7 } from '../foodgroups.js';
import { openAddFood, MEALS } from './addfood.js';
import { countUp } from '../motion.js';
import { habitsCells, handleHabitClick, handleTaskSubmit } from './habits.js';

register({
  en: {
    'Journal': 'Journal', 'Mangé': 'Eaten', 'objectif': 'goal', 'Brûlé': 'Burned', 'dont 50 % des kcal brûlées ajoutées au budget': 'incl. 50% of burned kcal added to the budget',
    'Cycle · {phase}, jour {n}': 'Cycle · {phase}, day {n}', 'menstruelle': 'menstrual', 'folliculaire': 'follicular', 'ovulatoire': 'ovulatory', 'lutéale': 'luteal', 'hormonale': 'hormonal',
    'Repères ANSES': 'ANSES guidelines', 'Fruits et légumes': 'Fruits and vegetables', 'Poisson': 'Fish', 'portions aujourd\'hui': 'servings today', 'Moyenne 7 jours : {n} / jour': '7-day average: {n} / day',
    'Cette semaine : {n} / 2 (dont 1 gras)': 'This week: {n} / 2 (including 1 oily)', 'Retirer une portion': 'Remove a serving', 'Ajouter une portion': 'Add a serving', 'Coach': 'Coach', 'Profil': 'Profile', 'Aucun aliment': 'No food yet', 'Voir le cycle': 'Open cycle',
    'Quantité supérieure à 0, ou touche Supprimer': 'Enter more than 0, or tap Delete',
    'kcal restantes sur {n}': 'kcal left of {n}', 'kcal en trop sur {n}': 'kcal over {n}', 'Rien de saisi': 'Nothing logged', 'règles': 'period', 'phase fertile': 'fertile phase',
    'phase {p}': '{p} phase', 'Jour {n} · {phase}': 'Day {n} · {phase}', 'Prochaines règles vers le {d}': 'Next period around {d}', '{n} aliments': '{n} foods',
  },
  nl: {
    'Journal': 'Dagboek', 'Mangé': 'Gegeten', 'objectif': 'doel', 'Brûlé': 'Verbrand', 'dont 50 % des kcal brûlées ajoutées au budget': 'incl. 50% van de verbrande kcal toegevoegd aan het budget',
    'Cycle · {phase}, jour {n}': 'Cyclus · {phase}, dag {n}', 'menstruelle': 'menstruatie', 'folliculaire': 'folliculair', 'ovulatoire': 'ovulatie', 'lutéale': 'luteaal', 'hormonale': 'hormonaal',
    'Repères ANSES': 'ANSES-richtlijnen', 'Fruits et légumes': 'Groente en fruit', 'Poisson': 'Vis', 'portions aujourd\'hui': 'porties vandaag', 'Moyenne 7 jours : {n} / jour': 'Gemiddelde 7 dagen: {n} / dag',
    'Cette semaine : {n} / 2 (dont 1 gras)': 'Deze week: {n} / 2 (waarvan 1 vette)', 'Retirer une portion': 'Een portie verwijderen', 'Ajouter une portion': 'Een portie toevoegen', 'Coach': 'Coach', 'Profil': 'Profiel', 'Aucun aliment': 'Nog geen voedingsmiddel', 'Voir le cycle': 'Cyclus openen',
    'Quantité supérieure à 0, ou touche Supprimer': 'Vul meer dan 0 in, of tik op Verwijderen',
    'kcal restantes sur {n}': 'kcal over van {n}', 'kcal en trop sur {n}': 'kcal boven {n}', 'Rien de saisi': 'Niets ingevoerd', 'règles': 'menstruatie', 'phase fertile': 'vruchtbare fase',
    'phase {p}': '{p} fase', 'Jour {n} · {phase}': 'Dag {n} · {phase}', 'Prochaines règles vers le {d}': 'Volgende menstruatie rond {d}', '{n} aliments': '{n} voedingsmiddelen',
  },
});

let date = null;
let lastShown = null; // { date, big, bars } : dernières valeurs affichées, pour animer d'un rendu à l'autre
let renderedOn = null; // jour réel du dernier rendu : si on a changé de jour, on revient à aujourd'hui

// Pictogrammes de repas (trait 1,9 px), locaux à la vue.
const MEAL_ICONS = {
  dej: '<path d="M4 11h13v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 12h1.5a2 2 0 0 1 0 4H16.5M8 4v3M12 4v3"/>',
  midi: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
  diner: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  snack: '<path d="M12 8c-3-2.5-7-1-7 3.5C5 16 8 20 12 20s7-4 7-8.5C19 7 15 5.5 12 8z"/><path d="M12 8c0-2 1-3.5 3-4"/>',
};
const mealIcon = (k) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MEAL_ICONS[k] || ''}</svg>`;

// Anneau de portions (SVG), le centre affiche le compte.
function portionRing(n, goal) {
  const r = 30, c = 2 * Math.PI * r, p = Math.min(1, n / goal);
  return `<svg class="td-pring" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="${r}" fill="none" stroke="var(--fill)" stroke-width="8"/>
    <circle cx="36" cy="36" r="${r}" fill="none" stroke="var(--p-deep)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 36 36)"/>
    <text x="36" y="42" text-anchor="middle" class="td-pnum">${n}</text></svg>`;
}

// Largeur de départ d'une barre : celle du rendu précédent (même jour), sinon la cible (pas d'animation).
let prevBars = {};
const startW = (key, pct) => prevBars[key] ?? pct;

export function render(root, go) {
  if (!date || renderedOn !== today()) date = today();
  renderedOn = today();
  const log = dayLog(date);
  const tot = sum(log.meals);
  const { targets, energy, blocked } = current();
  const shift = (n) => { const d = parseDate(date); d.setDate(d.getDate() + n); date = isoDate(d); render(root, go); };
  const isToday = date === today();
  const title = isToday ? t("Aujourd'hui") : fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
  const waterGoal = (targets?.waterL ?? 2) * 1000;
  const keep = () => { const y = root.scrollTop; render(root, go); root.scrollTop = y; };
  state.foodGroups ||= {};

  // Héros plein cadre (canevas Parcours v2) : date, logotype, kcal restantes, anneau « mangé », pastilles.
  const budget = targets ? targets.kcal : 0;
  const diff = budget - tot.kcal;
  prevBars = lastShown?.date === date ? lastShown.bars : {};
  const eatPct = budget ? Math.min(100, Math.round((tot.kcal / budget) * 100)) : 0;
  const longDate = fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
  const R = 41.5, C = 2 * Math.PI * R;
  const ring = `<div class="v2-ring" aria-label="${eatPct} %"><svg viewBox="0 0 92 92" aria-hidden="true"><circle cx="46" cy="46" r="${R}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="9"/>
      <circle cx="46" cy="46" r="${R}" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(C * eatPct / 100).toFixed(1)} ${C.toFixed(1)}"/></svg><span class="num">${eatPct} %</span></div>`;
  const kpi = blocked ? `<div class="jr-hero-msg"><b>${t('Objectifs chiffrés désactivés')}</b></div>`
    : !targets ? `<div class="jr-hero-msg"><b>${t('Complète ton profil')}</b></div>`
    : `<div class="jr-kpi"><div class="grow"><div class="jr-big">${fmt(Math.abs(diff))}</div>
        <div class="jr-cap">${diff < 0 ? t('kcal en trop sur {n}', { n: fmt(budget) }) : t('kcal restantes sur {n}', { n: fmt(budget) })}</div>
        </div>${ring}</div>
        <div class="jr-pills"><span class="v2-pill">${icon('leaf')} ${t('Mangé')} ${fmt(tot.kcal)}</span>
          <span class="v2-pill" title="${energy.method === 'adaptatif' ? t('dépense adaptative') : t('dépense estimée')}${targets.floored ? ' · ' + t('plancher de sécurité appliqué') : ''}">${icon('burn')} ${t('Dépense')} ${fmt(targets.tdee)}</span></div>`;
  const hero = `<section class="v2-hero jr-hero"><div class="v2-blobs" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i></div>
      <header class="v2-top"><div><div class="jr-date"><button class="jr-arrow" data-a="prev" aria-label="${t('Jour précédent')}">${icon('chevronLeft')}</button>
          <span>${esc(longDate)}</span><button class="jr-arrow" data-a="next" aria-label="${t('Jour suivant')}" ${isToday ? 'disabled' : ''}>${icon('chevronRight')}</button></div>
        <h1 class="jr-word">TrackMe<i>.</i></h1></div>
        <div class="v2-cbs"><button class="v2-cb glass" data-a="planning" aria-label="${t('Planifier mes repas')}">${icon('calendar')}</button>
          <button class="v2-cb glass" data-a="profile" aria-label="${t('Profil')}">${icon('profile')}</button></div></header>
      ${kpi}</section>`;

  const macroTile = (label, v, max, key, color) => {
    const over = max && v > max, pct = max ? Math.min(100, Math.round((v / max) * 100)) : 0;
    return `<div class="v2-card jr-macro ${over ? 'over' : ''}"><span class="v2-sm">${label}</span><span class="v2-num">${fmt(v, 0)}<small> / ${fmt(max || 0, 0)} g</small></span>
      <div class="v2-bar"><i style="width:${startW(key, pct)}%;background:${over ? 'var(--a-warn)' : color}" data-to="${pct}" data-k="${key}"></i></div></div>`;
  };
  const summary = blocked ? `<div class="v2-card jr-msg"><b class="v2-lb">${t('Objectifs chiffrés désactivés')}</b><p>${t('Ta situation (âge < 18 ans, grossesse/allaitement, trouble alimentaire ou pathologie) nécessite un suivi par un professionnel de santé. Le journal reste disponible.')}</p></div>`
    : !targets ? `<div class="v2-card jr-msg"><b class="v2-lb">${t('Complète ton profil')}</b><p>${t('Âge, taille, poids, activité et objectif pour calculer tes besoins.')}</p><button class="btn filled" data-a="profile">${t('Compléter')}</button></div>`
    : `<div class="jr-macros">${macroTile(t('Protéines'), tot.p, targets.protein, 'p', 'var(--a-deep)')}${macroTile(t('Glucides'), tot.c, targets.carbs, 'c', 'var(--a-mid)')}${macroTile(t('Lipides'), tot.f, targets.fat, 'f', 'var(--a-warm)')}</div>`;

  // Carte cycle (utilisatrice, suivi activé) : jour, phase, prochaines règles.
  const ph = state.cycle?.enabled && state.profile?.sex === 'F' ? phaseOn(state.cycle, date) : null;
  const nextP = ph ? nextStarts(state.cycle, date, 1)[0] : null;
  const phaseName = ph ? (ph.isPeriod ? t('règles') : ph.fertile ? t('phase fertile') : t('phase {p}', { p: t(ph.phase) })) : '';
  const cyclePill = ph ? `<button class="v2-card v2-row jr-cycle ${ph.isPeriod ? 'period' : ''}" data-a="cycle" aria-label="${t('Voir le cycle')}"><span class="v2-av">${icon('heart')}</span>
      <span class="grow"><span class="v2-lb" style="display:block">${t('Jour {n} · {phase}', { n: ph.day, phase: phaseName })}</span>
      ${nextP ? `<span class="v2-sm">${t('Prochaines règles vers le {d}', { d: fmtDate(nextP, { day: 'numeric', month: 'short' }) })}</span>` : ''}</span>${icon('chevronRight', { cls: 'v2-chev' })}</button>` : '';

  const quick = `<div class="td-card td-quick"><ul class="cells">
      ${habitsCells(date)}
      <li class="cell">
        <span class="mini-ring water" style="--p:${Math.min(100, Math.round((log.water / waterGoal) * 100))}%" aria-hidden="true"></span>
        <div class="grow"><span class="t">${t('Eau')}</span><span class="s num">${fmt(log.water / 1000, 2)} / ${fmt(waterGoal / 1000, 1)} L</span></div>
        <div class="stepper"><button class="icon-btn" data-a="water-" aria-label="−250 ml">${icon('minus')}</button><button class="icon-btn round" data-a="water+" aria-label="+250 ml">${icon('plus')}</button></div>
      </li></ul></div>`;

  // Repas : une carte, une ligne par repas (pictogramme, aliments, kcal ou « Ajouter »).
  const meals = `<div class="v2-card jr-meals">` + Object.entries(MEALS).map(([k, label]) => {
    const items = log.meals.filter((m) => m.meal === k);
    return `<button class="v2-li" data-meal="${k}" aria-label="${t(label)}"><span class="v2-av">${icon('leaf')}</span>
      <span class="grow"><span class="v2-lb" style="display:block">${t(label)}</span><span class="v2-sm">${items.length ? esc(items.map((m) => m.name).join(', ')) : t('Rien de saisi')}</span></span>
      ${items.length ? `<span class="v2-num">${fmt(sum(items).kcal)}</span>` : `<span class="jr-add">${t('Ajouter')}</span>`}</button>`;
  }).join('') + `</div><button class="btn plain wide" data-a="copy">${icon('copy')} ${t('Copier les repas de la veille')}</button>`;

  // Repères ANSES : un anneau par groupe, toucher = +1, « − » = −1.
  const fv = getPortions(state.foodGroups, date, 'fruitVeg'), fish = getPortions(state.foodGroups, date, 'fish');
  const fishWeek = weekTotal(state.foodGroups, date, 'fish');
  const anses = `<h2 class="td-h">${t('Repères ANSES')}</h2><div class="td-anses">
    <div class="td-card td-group"><button class="td-ringbtn" data-pg="fruitVeg" data-d="1" aria-label="${t('Ajouter une portion')} — ${t('Fruits et légumes')}">${portionRing(fv, GOALS.fruitVeg)}</button>
      <b>${t('Fruits et légumes')}</b><span class="s num">${fv} / ${GOALS.fruitVeg} ${t("portions aujourd'hui")}</span>
      <span class="s num">${t('Moyenne 7 jours : {n} / jour', { n: fmt(avg7(state.foodGroups, date, 'fruitVeg'), 1) })}</span>
      <button class="td-minus" data-pg="fruitVeg" data-d="-1" aria-label="${t('Retirer une portion')}" ${fv ? '' : 'disabled'}>${icon('minus')}</button></div>
    <div class="td-card td-group"><button class="td-ringbtn" data-pg="fish" data-d="1" aria-label="${t('Ajouter une portion')} — ${t('Poisson')}">${portionRing(fishWeek, GOALS.fish)}</button>
      <b>${t('Poisson')}</b><span class="s num">${t('Cette semaine : {n} / 2 (dont 1 gras)', { n: fishWeek })}</span>
      <span class="s num">${t('Moyenne 7 jours : {n} / jour', { n: fmt(avg7(state.foodGroups, date, 'fish'), 1) })}</span>
      <button class="td-minus" data-pg="fish" data-d="-1" aria-label="${t('Retirer une portion')}" ${fish ? '' : 'disabled'}>${icon('minus')}</button></div></div>`;

  root.innerHTML = `${hero}<div class="v2-leaf">${summary}${cyclePill}${meals}${quick}${anses}</div>`;

  // Animations : chiffre héros et barres partent de leur ancienne valeur (même jour seulement).
  const bars = {};
  root.querySelectorAll('[data-to]').forEach((b) => { bars[b.dataset.k] = +b.dataset.to; });
  void root.offsetWidth; // fixe la largeur de départ avant d'appliquer la cible
  root.querySelectorAll('[data-to]').forEach((b) => { b.style.width = b.dataset.to + '%'; });
  const bigEl = root.querySelector('.jr-big');
  const big = bigEl ? Math.abs(diff) : null;
  if (bigEl && lastShown?.date === date && lastShown.big != null && lastShown.big !== big) countUp(bigEl, lastShown.big, big);
  lastShown = { date, big, bars };

  root.onsubmit = (e) => handleTaskSubmit(e, date, keep);
  root.onclick = (e) => {
    if (handleHabitClick(e, date, keep)) return;
    const pg = e.target.closest('[data-pg]');
    if (pg) { addPortion(state.foodGroups, date, pg.dataset.pg, +pg.dataset.d); save(); navigator.vibrate?.(8); return keep(); }
    const el = e.target.closest('[data-a],[data-add],[data-item],[data-meal]');
    if (!el) return;
    const a = el.dataset.a;
    if (a === 'prev') return shift(-1);
    if (a === 'next') return shift(1);
    if (a === 'profile') return go('profile');
    if (a === 'planning') return go('planning');
    if (a === 'cycle') return go('cycle');
    if (a === 'water+' || a === 'water-') { log.water = Math.max(0, log.water + (a === 'water+' ? 250 : -250)); save(); return keep(); }
    if (a === 'copy') {
      const d = parseDate(date); d.setDate(d.getDate() - 1);
      const prev = state.logs[isoDate(d)];
      if (!prev?.meals.length) return toast(t('Rien à copier pour la veille'));
      const before = log.meals.slice();
      prev.meals.forEach((m) => log.meals.push({ ...m, id: uid() }));
      save(); toast(t('{n} aliments copiés', { n: prev.meals.length }), { undo: () => { log.meals = before; save(); keep(); } }); return keep();
    }
    if (el.dataset.meal) return log.meals.some((m) => m.meal === el.dataset.meal) ? mealSheet(log, el.dataset.meal, date, keep) : openAddFood(el.dataset.meal, date, keep);
    if (el.dataset.add) return openAddFood(el.dataset.add, date, keep);
    if (el.dataset.item) return editItem(log, el.dataset.item, keep);
  };
}

// La fermeture d'une feuille recule l'historique (asynchrone) : on attend ce recul avant d'ouvrir la suivante.
function afterBack(fn) {
  let fired = false;
  const run = () => { if (fired) return; fired = true; removeEventListener('popstate', run); setTimeout(fn, 0); };
  addEventListener('popstate', run); setTimeout(run, 450);
}

// Feuille d'un repas : ses aliments (toucher = modifier) et « Ajouter un aliment ».
function mealSheet(log, meal, date, done) {
  const draw = () => {
    const items = log.meals.filter((m) => m.meal === meal);
    return `<div class="sheet-head"><h3 class="title2">${t(MEALS[meal])}</h3></div>
      <div class="ml-total"><span class="v2-sm">${t('{n} aliments', { n: items.length })}</span><b class="v2-num">${fmt(sum(items).kcal)} kcal</b></div>
      <div class="v2-card ml-list">${items.map((m) => `<button class="v2-li" data-item="${esc(m.id)}"><span class="grow"><span class="v2-lb" style="display:block">${esc(m.name)}</span>
        <span class="v2-sm num">${m.grams ? fmt(m.grams) + ' g · ' : ''}P ${fmt(m.p, 0)} · G ${fmt(m.c, 0)} · L ${fmt(m.f, 0)}</span></span><span class="v2-num">${fmt(m.kcal)}</span></button>`).join('')}</div>
      <button class="btn filled large wide v2-go" data-a="add">${t('Ajouter un aliment')}</button>`;
  };
  const s = sheet(draw(), done);
  s.addEventListener('click', (e) => {
    const it = e.target.closest('[data-item]');
    if (it) { s.close(); return afterBack(() => editItem(log, it.dataset.item, done)); }
    if (e.target.closest('[data-a="add"]')) { s.close(); afterBack(() => openAddFood(meal, date, done)); }
  });
}

// Feuille d'un aliment du journal : changer la quantité (macros recalculées au prorata) ou supprimer.
function editItem(log, id, done) {
  const m = log.meals.find((x) => x.id === id);
  if (!m) return;
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${esc(m.name)}</h3></div>
    ${group('', `<div class="cells">
      ${m.grams ? `<label class="cell field"><span>${t('Quantité (g)')}</span><input name="g" type="number" inputmode="decimal" value="${esc(m.grams)}"></label>` : ''}
      <div class="cell"><span class="grow secondary preview-line num"></span></div></div>`)}
    ${m.grams ? `<button class="btn filled large" data-a="save">${t('Enregistrer')}</button>` : ''}
    ${group('', `<div class="cells"><div class="cell action destructive" data-a="del" role="button">${t('Supprimer')}</div></div>`)}`, done);
  const g = s.querySelector('[name=g]'), pv = s.querySelector('.preview-line');
  const scaled = () => { const k = g ? (+g.value || 0) / m.grams : 1; return { kcal: Math.round(m.kcal * k), p: m.p * k, c: m.c * k, f: m.f * k, fib: m.fib * k }; };
  const upd = () => { const v = scaled(); pv.textContent = `${v.kcal} kcal · P ${fmt(v.p, 1)} · G ${fmt(v.c, 1)} · L ${fmt(v.f, 1)} g`; };
  if (g) g.oninput = upd;
  upd();
  s.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'save') {
      // 0 g effacerait les macros pour de bon (on recalcule toujours au prorata) : on refuse et on propose Supprimer.
      if (!((+g.value || 0) > 0)) return toast(t('Quantité supérieure à 0, ou touche Supprimer'));
      const v = scaled();
      Object.assign(m, { grams: +g.value, kcal: v.kcal, p: +v.p.toFixed(1), c: +v.c.toFixed(1), f: +v.f.toFixed(1), fib: +v.fib.toFixed(1) });
      save(); s.close();
    }
    if (a === 'del') {
      const before = log.meals; log.meals = log.meals.filter((x) => x.id !== id); save(); s.close();
      toast(t('Aliment supprimé'), { undo: () => { log.meals = before; save(); done(); } });
    }
  });
}

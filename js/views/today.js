// Onglet Journal : en-tête (Coach, Profil), héros palette (kcal restantes, mangé / brûlé), tuiles macros, pastille cycle,
// checklist + eau, une carte par repas, repères ANSES (fruits & légumes, poisson).
import { state, save, dayLog, sum, today, uid } from '../store.js';
import { current } from '../metrics.js';
import { isoDate, parseDate } from '../science.js';
import { esc, fmt, fmtDate, toast, group, sheet } from '../ui.js';
import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { register } from '../i18n.js';
import { shape } from '../theme.js';
import { phaseOn } from '../cycle.js';
import { GOALS, addPortion, getPortions, weekTotal, avg7 } from '../foodgroups.js';
import { openAddFood, MEALS } from './addfood.js';
import { countUp } from '../motion.js';
import { habitsCells, handleHabitClick } from './habits.js';

register({
  en: {
    'Journal': 'Journal', 'Mangé': 'Eaten', 'objectif': 'goal', 'Brûlé': 'Burned', 'dont 50 % des kcal brûlées ajoutées au budget': 'incl. 50% of burned kcal added to the budget',
    'Cycle · {phase}, jour {n}': 'Cycle · {phase}, day {n}', 'menstruelle': 'menstrual', 'folliculaire': 'follicular', 'ovulatoire': 'ovulatory', 'lutéale': 'luteal', 'hormonale': 'hormonal',
    'Repères ANSES': 'ANSES guidelines', 'Fruits et légumes': 'Fruits and vegetables', 'Poisson': 'Fish', 'portions aujourd\'hui': 'servings today', 'Moyenne 7 jours : {n} / jour': '7-day average: {n} / day',
    'Cette semaine : {n} / 2 (dont 1 gras)': 'This week: {n} / 2 (including 1 oily)', 'Retirer une portion': 'Remove a serving', 'Ajouter une portion': 'Add a serving', 'Coach': 'Coach', 'Profil': 'Profile', 'Aucun aliment': 'No food yet', 'Voir le cycle': 'Open cycle',
  },
  nl: {
    'Journal': 'Dagboek', 'Mangé': 'Gegeten', 'objectif': 'doel', 'Brûlé': 'Verbrand', 'dont 50 % des kcal brûlées ajoutées au budget': 'incl. 50% van de verbrande kcal toegevoegd aan het budget',
    'Cycle · {phase}, jour {n}': 'Cyclus · {phase}, dag {n}', 'menstruelle': 'menstruatie', 'folliculaire': 'folliculair', 'ovulatoire': 'ovulatie', 'lutéale': 'luteaal', 'hormonale': 'hormonaal',
    'Repères ANSES': 'ANSES-richtlijnen', 'Fruits et légumes': 'Groente en fruit', 'Poisson': 'Vis', 'portions aujourd\'hui': 'porties vandaag', 'Moyenne 7 jours : {n} / jour': 'Gemiddelde 7 dagen: {n} / dag',
    'Cette semaine : {n} / 2 (dont 1 gras)': 'Deze week: {n} / 2 (waarvan 1 vette)', 'Retirer une portion': 'Een portie verwijderen', 'Ajouter une portion': 'Een portie toevoegen', 'Coach': 'Coach', 'Profil': 'Profiel', 'Aucun aliment': 'Nog geen voedingsmiddel', 'Voir le cycle': 'Cyclus openen',
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

const macroTile = (label, v, max, key) => {
  const over = max && v > max;
  const pct = max ? Math.min(100, Math.round((v / max) * 100)) : 0;
  return `<div class="td-macro ${over ? 'over' : ''}"><span class="td-ml">${label}</span><b class="num">${fmt(v, 0)}<small> / ${fmt(max || 0, 0)} g</small></b>
    <span class="td-track"><i style="width:${startW(key, pct)}%" data-to="${pct}" data-k="${key}"></i></span></div>`;
};

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

  // Héros : budget du jour = objectif calorique.
  const budget = targets ? targets.kcal : 0;
  const diff = budget - tot.kcal;
  prevBars = lastShown?.date === date ? lastShown.bars : {};
  const eatPct = budget ? Math.min(100, Math.round((tot.kcal / budget) * 100)) : 0;
  const dayNav = `<div class="td-daynav"><button class="td-arrow" data-a="prev" aria-label="${t('Jour précédent')}">${icon('chevronLeft')}</button>
      <span>${esc(isToday ? t("Aujourd'hui") : fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' }))}</span>
      <button class="td-arrow" data-a="next" aria-label="${t('Jour suivant')}" ${isToday ? 'disabled' : ''}>${icon('chevronRight')}</button></div>`;

  const summary = blocked ? `<div class="cta"><b class="headline">${t('Objectifs chiffrés désactivés')}</b><p>${t('Ta situation (âge < 18 ans, grossesse/allaitement, trouble alimentaire ou pathologie) nécessite un suivi par un professionnel de santé. Le journal reste disponible.')}</p></div>`
    : !targets ? `<div class="cta"><b class="headline">${t('Complète ton profil')}</b><p>${t('Âge, taille, poids, activité et objectif pour calculer tes besoins.')}</p><button class="btn filled" data-a="profile">${t('Compléter')}</button></div>`
    : `<section class="tm-hero td-hero">${shape({ cls: 'td-shape' })}
        ${dayNav}
        <p class="td-sub">${t('Mangé')} ${fmt(tot.kcal)} · ${t('objectif')} ${fmt(budget)} kcal</p>
        <div class="td-big num">${fmt(Math.abs(diff))}</div>
        <p class="td-cap">${diff < 0 ? t('kcal en trop') : t('kcal restantes')}</p>
        <div class="td-bars"><div class="td-bar"><span>${t('Mangé')} <b class="num">${fmt(tot.kcal)}</b></span><i><u style="width:${startW('eat', eatPct)}%" data-to="${eatPct}" data-k="eat"></u></i></div></div>
        <p class="td-note">${energy.method === 'adaptatif' ? t('dépense adaptative') : t('dépense estimée')} ${fmt(targets.tdee)}${targets.floored ? ' · ' + t('plancher de sécurité appliqué') : ''}</p>
      </section>
      <div class="td-macros">${macroTile(t('Protéines'), tot.p, targets.protein, 'p')}${macroTile(t('Glucides'), tot.c, targets.carbs, 'c')}${macroTile(t('Lipides'), tot.f, targets.fat, 'f')}</div>`;

  // Pastille cycle (utilisatrice, suivi activé).
  const ph = state.cycle?.enabled && state.profile?.sex === 'F' ? phaseOn(state.cycle, date) : null;
  const cyclePill = ph ? `<button class="td-cycle" data-a="cycle" aria-label="${t('Voir le cycle')}"><span class="dot"></span>${t('Cycle · {phase}, jour {n}', { phase: t(ph.phase), n: ph.day })}${icon('chevronRight', { cls: 'chev' })}</button>` : '';

  const quick = `<div class="td-card td-quick"><ul class="cells">
      ${habitsCells(date)}
      <li class="cell">
        <span class="mini-ring water" style="--p:${Math.min(100, Math.round((log.water / waterGoal) * 100))}%" aria-hidden="true"></span>
        <div class="grow"><span class="t">${t('Eau')}</span><span class="s num">${fmt(log.water / 1000, 2)} / ${fmt(waterGoal / 1000, 1)} L</span></div>
        <div class="stepper"><button class="icon-btn" data-a="water-" aria-label="−250 ml">${icon('minus')}</button><button class="icon-btn round" data-a="water+" aria-label="+250 ml">${icon('plus')}</button></div>
      </li></ul></div>`;

  const meals = `<h2 class="td-h">${t('Repas')}<b class="num">${fmt(tot.kcal)} kcal</b></h2>` + Object.entries(MEALS).map(([k, label]) => {
    const items = log.meals.filter((m) => m.meal === k);
    return `<section class="td-card td-meal"><div class="td-mhead"><span class="td-pill">${mealIcon(k)}</span>
        <div class="grow"><b>${t(label)}</b><span class="s num">${fmt(sum(items).kcal)} kcal</span></div>
        <button class="td-add" data-add="${k}" aria-label="${t('Ajouter')} — ${t(label)}">${icon('plus')}</button></div>
      ${items.length ? `<ul class="td-items">${items.map((m) => `<li class="td-item" data-item="${esc(m.id)}" role="button" tabindex="0"><div class="grow"><span class="t">${esc(m.name)}</span>
        <span class="s num">${m.grams ? fmt(m.grams) + ' g · ' : ''}P ${fmt(m.p, 0)} · G ${fmt(m.c, 0)} · L ${fmt(m.f, 0)}</span></div><span class="val num">${fmt(m.kcal)}</span></li>`).join('')}</ul>` : ''}
    </section>`;
  }).join('') + `<button class="btn plain wide" data-a="copy">${icon('copy')} ${t('Copier les repas de la veille')}</button>`;

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

  root.innerHTML = `
    <header class="td-head"><h1 class="td-title">${esc(title)}</h1>
      <div class="td-btns"><button class="td-round" data-a="profile" aria-label="${t('Profil')}">${icon('profile')}</button></div></header>
    <div class="split td-split"><div>${summary}${cyclePill}${quick}${anses}</div><div>${meals}</div></div>`;

  // Animations : chiffre héros et barres partent de leur ancienne valeur (même jour seulement).
  const bars = {};
  root.querySelectorAll('[data-to]').forEach((b) => { bars[b.dataset.k] = +b.dataset.to; });
  void root.offsetWidth; // fixe la largeur de départ avant d'appliquer la cible
  root.querySelectorAll('[data-to]').forEach((b) => { b.style.width = b.dataset.to + '%'; });
  const bigEl = root.querySelector('.td-big');
  const big = bigEl ? Math.abs(diff) : null;
  if (bigEl && lastShown?.date === date && lastShown.big != null && lastShown.big !== big) countUp(bigEl, lastShown.big, big);
  lastShown = { date, big, bars };

  root.onclick = (e) => {
    if (handleHabitClick(e, date, keep)) return;
    const pg = e.target.closest('[data-pg]');
    if (pg) { addPortion(state.foodGroups, date, pg.dataset.pg, +pg.dataset.d); save(); navigator.vibrate?.(8); return keep(); }
    const el = e.target.closest('[data-a],[data-add],[data-item]');
    if (!el) return;
    const a = el.dataset.a;
    if (a === 'prev') return shift(-1);
    if (a === 'next') return shift(1);
    if (a === 'profile') return go('profile');
    if (a === 'coach') return go('coach');
    if (a === 'cycle') return go('cycle');
    if (a === 'water+' || a === 'water-') { log.water = Math.max(0, log.water + (a === 'water+' ? 250 : -250)); save(); return keep(); }
    if (a === 'copy') {
      const d = parseDate(date); d.setDate(d.getDate() - 1);
      const prev = state.logs[isoDate(d)];
      if (!prev?.meals.length) return toast(t('Rien à copier pour la veille'));
      prev.meals.forEach((m) => log.meals.push({ ...m, id: uid() }));
      save(); toast(t('{n} aliments copiés', { n: prev.meals.length })); return keep();
    }
    if (el.dataset.add) return openAddFood(el.dataset.add, date, keep);
    if (el.dataset.item) return editItem(log, el.dataset.item, keep);
  };
}

// Feuille d'un aliment du journal : changer la quantité (macros recalculées au prorata) ou supprimer.
function editItem(log, id, done) {
  const m = log.meals.find((x) => x.id === id);
  if (!m) return;
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${esc(m.name)}</h3></div>
    ${group('', `<div class="cells">
      ${m.grams ? `<label class="cell field"><span>${t('Quantité (g)')}</span><input name="g" type="number" inputmode="decimal" value="${m.grams}"></label>` : ''}
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
      const v = scaled();
      Object.assign(m, { grams: +g.value || m.grams, kcal: v.kcal, p: +v.p.toFixed(1), c: +v.c.toFixed(1), f: +v.f.toFixed(1), fib: +v.fib.toFixed(1) });
      save(); s.close();
    }
    if (a === 'del') { log.meals = log.meals.filter((x) => x.id !== id); save(); s.close(); }
  });
}

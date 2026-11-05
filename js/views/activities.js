// Vue « activities » : semaine, filtres, liste des activités Strava et détail avec l'effet dans TrackMe.
import { state } from '../store.js';
import { nav, esc, fmt, fmtDate, sheet, toast } from '../ui.js';
import { icon } from '../icons.js';
import { t, register } from '../i18n.js';
import { parseDate, isoDate } from '../science.js';
import * as S from '../strava.js';

const TXT = [
  ['Activités', 'Activities', 'Activiteiten'],
  ['Connecte Strava', 'Connect Strava', 'Koppel Strava'],
  ['Retrouve ici tes sorties (course, vélo, natation…), leurs calories et leur effet sur ton budget et tes séances.', 'See your outings (running, cycling, swimming…) here, with their calories and their effect on your budget and workouts.', 'Zie hier je activiteiten (hardlopen, fietsen, zwemmen…), hun calorieën en hun effect op je budget en trainingen.'],
  ['Connecter Strava', 'Connect Strava', 'Strava koppelen'],
  ['Cette semaine', 'This week', 'Deze week'],
  ['Semaine du ', 'Week of ', 'Week van '],
  ['Semaine précédente', 'Previous week', 'Vorige week'],
  ['Semaine suivante', 'Next week', 'Volgende week'],
  ['Durée', 'Duration', 'Duur'],
  ['Distance', 'Distance', 'Afstand'],
  ['Dénivelé', 'Elevation', 'Hoogteverschil'],
  ['Charge', 'Load', 'Belasting'],
  ['Charge d’entraînement', 'Training load', 'Trainingsbelasting'],
  ['de plus que ta moyenne sur 4 semaines', 'above your 4-week average', 'meer dan je gemiddelde van 4 weken'],
  ['de moins que ta moyenne sur 4 semaines', 'below your 4-week average', 'minder dan je gemiddelde van 4 weken'],
  ['Pas encore de moyenne sur 4 semaines.', 'No 4-week average yet.', 'Nog geen gemiddelde van 4 weken.'],
  ['Dans ta moyenne sur 4 semaines.', 'In line with your 4-week average.', 'In lijn met je gemiddelde van 4 weken.'],
  ['Tout', 'All', 'Alles'],
  ['Course', 'Run', 'Hardlopen'],
  ['Vélo', 'Ride', 'Fietsen'],
  ['Natation', 'Swim', 'Zwemmen'],
  ['Autre', 'Other', 'Overig'],
  ['Aucune activité sur cette période. Une sortie enregistrée sur Strava apparaîtra ici après la synchro.', 'No activities in this period. A workout recorded on Strava will show up here after syncing.', 'Geen activiteiten in deze periode. Een activiteit die op Strava is opgeslagen verschijnt hier na het synchroniseren.'],
  ['Synchro…', 'Syncing…', 'Synchroniseren…'],
  ['Synchroniser', 'Sync', 'Synchroniseren'],
  ['Activités synchronisées.', 'Activities synced.', 'Activiteiten gesynchroniseerd.'],
  ['Réglages Strava', 'Strava settings', 'Strava-instellingen'],
  ['FC moyenne', 'Avg HR', 'Gem. hartslag'],
  ['FC max', 'Max HR', 'Max. hartslag'],
  ['Zone cardio', 'Heart-rate zone', 'Hartslagzone'],
  ['Zone 1 · très facile', 'Zone 1 · very easy', 'Zone 1 · heel makkelijk'],
  ['Zone 2 · endurance', 'Zone 2 · endurance', 'Zone 2 · duurtraining'],
  ['Zone 3 · modérée', 'Zone 3 · moderate', 'Zone 3 · gematigd'],
  ['Zone 4 · seuil', 'Zone 4 · threshold', 'Zone 4 · drempel'],
  ['Zone 5 · maximale', 'Zone 5 · maximal', 'Zone 5 · maximaal'],
  ['Dans TrackMe', 'In TrackMe', 'In TrackMe'],
  [' kcal brûlées, dont ', ' kcal burned, of which ', ' kcal verbrand, waarvan '],
  [' kcal ajoutées à ton budget du jour.', ' kcal added to your daily budget.', ' kcal toegevoegd aan je dagbudget.'],
  ['Budget du jour inchangé (option désactivée dans Réglages).', 'Daily budget unchanged (option off in Settings).', 'Dagbudget ongewijzigd (optie uit in Instellingen).'],
  ['Grosse sortie : demain, vise une séance plus légère (moins de séries, RIR 3) ou un jour de repos.', 'Big outing: tomorrow, aim for a lighter session (fewer sets, RIR 3) or a rest day.', 'Zware activiteit: mik morgen op een lichtere training (minder sets, RIR 3) of een rustdag.'],
  ['Effort modéré : ta séance de demain reste inchangée.', 'Moderate effort: tomorrow’s session stays as planned.', 'Gematigde inspanning: je training van morgen blijft zoals gepland.'],
  ['Récupération : 20 à 40 g de protéines dans les 2 h qui suivent.', 'Recovery: 20 to 40 g of protein within the next 2 h.', 'Herstel: 20 tot 40 g eiwit binnen de volgende 2 uur.'],
  ['Estimation (MET × poids × durée)', 'Estimate (MET × weight × time)', 'Schatting (MET × gewicht × tijd)'],
  ['Calories Strava', 'Strava calories', 'Strava-calorieën'],
  ['Voir sur Strava', 'View on Strava', 'Bekijk op Strava'],
  ['Dernière synchro : ', 'Last sync: ', 'Laatste synchronisatie: '],
  ['jamais', 'never', 'nooit'],
  ['Sortie', 'Workout', 'Activiteit'],
];
register({ en: Object.fromEntries(TXT.map(([f, e]) => [f, e])), nl: Object.fromEntries(TXT.map(([f, , n]) => [f, n])) });

const FILTERS = [['all', 'Tout'], ['run', 'Course'], ['ride', 'Vélo'], ['swim', 'Natation'], ['other', 'Autre']];
let filter = 'all', offset = 0, syncing = false;

const hm = (s) => { const m = Math.round(s / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };
const km = (m) => fmt(m / 1000, m >= 10000 ? 1 : 2) + ' km';
const typeLabel = (a) => ({ run: 'Course', ride: 'Vélo', swim: 'Natation' }[S.kindOf(a.type)] || null);
const weekIso = () => { const d = parseDate(S.weekStart(isoDate(new Date()))); d.setDate(d.getDate() + 7 * offset); return isoDate(d); };

function bars(week) {
  const max = Math.max(30, ...week.days.map((d) => d.min));
  const lab = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  return `<div class="ac-bars" role="img" aria-label="${t('Durée')}">${week.days.map((d, i) =>
    `<div class="ac-col"><div class="ac-bar-wrap"><div class="ac-bar ${d.count ? '' : 'nil'}" style="height:${Math.max(4, (d.min / max) * 100)}%"></div></div><span>${lab[i]}</span></div>`).join('')}</div>`;
}

function loadLine(cmp) {
  if (cmp.pct == null) return t('Pas encore de moyenne sur 4 semaines.');
  if (Math.abs(cmp.pct) < 5) return t('Dans ta moyenne sur 4 semaines.');
  return `${cmp.pct > 0 ? '+' : '−'}${Math.abs(cmp.pct)} % ${t(cmp.pct > 0 ? 'de plus que ta moyenne sur 4 semaines' : 'de moins que ta moyenne sur 4 semaines')}`;
}

function detail(a, p) {
  const zone = S.hrZone(a.avg_hr, state.profile?.age > 0 ? 220 - state.profile.age : a.max_hr);
  const heavy = S.isHeavy(a), bonus = Math.round(a.calories * 0.5);
  const zl = ['', 'Zone 1 · très facile', 'Zone 2 · endurance', 'Zone 3 · modérée', 'Zone 4 · seuil', 'Zone 5 · maximale'];
  const stat = (l, v) => `<div class="ac-stat"><b>${v}</b><span>${t(l)}</span></div>`;
  return `<h2 class="ac-h">${esc(a.name || t('Sortie'))}</h2>
    <p class="footnote">${fmtDate(a.date, { weekday: 'long', day: 'numeric', month: 'long' })}${a.device ? ' · ' + esc(a.device) : ''}</p>
    <div class="ac-stats">${a.distance_m ? stat('Distance', km(a.distance_m)) : ''}${stat('Durée', hm(a.moving_s))}${stat('Calories', fmt(a.calories) + ' kcal')}
      ${a.elev_m ? stat('Dénivelé', fmt(a.elev_m) + ' m') : ''}${a.avg_hr ? stat('FC moyenne', a.avg_hr + ' bpm') : ''}${a.max_hr ? stat('FC max', a.max_hr + ' bpm') : ''}</div>
    <p class="footnote">${a.est ? t('Estimation (MET × poids × durée)') : t('Calories Strava')}</p>
    ${zone ? `<div class="ac-zone"><span>${t('Zone cardio')}</span><div class="ac-zbar">${[1, 2, 3, 4, 5].map((z) => `<i class="${z <= zone ? 'on' : ''}"></i>`).join('')}</div><b>${t(zl[zone])}</b></div>` : ''}
    <h3 class="ac-sub">${t('Dans TrackMe')}</h3>
    <ul class="ac-tm">
      <li>${icon('flame')}<span>${p.kcal ? `${fmt(a.calories)}${t(' kcal brûlées, dont ')}${fmt(bonus)}${t(' kcal ajoutées à ton budget du jour.')}` : t('Budget du jour inchangé (option désactivée dans Réglages).')}</span></li>
      ${p.adapt ? `<li>${icon('dumbbell')}<span>${t(heavy ? 'Grosse sortie : demain, vise une séance plus légère (moins de séries, RIR 3) ou un jour de repos.' : 'Effort modéré : ta séance de demain reste inchangée.')}</span></li>` : ''}
      <li>${icon('meal')}<span>${t('Récupération : 20 à 40 g de protéines dans les 2 h qui suivent.')}</span></li>
    </ul>
    <a class="ac-strava" href="https://www.strava.com/activities/${a.id}" target="_blank" rel="noopener">${t('Voir sur Strava')} ${icon('chevronRight')}</a>`;
}

export function render(root, go) {
  if (!S.isConnected()) {
    root.innerHTML = `${nav(t('Activités'))}<section class="ac-welcome"><span class="ac-logo" aria-hidden="true">${icon('bolt')}</span>
      <h2>${t('Connecte Strava')}</h2><p>${t('Retrouve ici tes sorties (course, vélo, natation…), leurs calories et leur effet sur ton budget et tes séances.')}</p>
      <button class="btn filled large" data-go>${t('Connecter Strava')}</button></section>`;
    root.onclick = (e) => { if (e.target.closest('[data-go]')) go('connect'); };
    return;
  }
  const all = state.strava.activities || [];
  const ws = weekIso(), week = S.weekSummary(all, ws), cmp = S.compareLoad(all, ws);
  const list = S.applyFilter(all, filter);
  const when = offset === 0 ? t('Cette semaine') : t('Semaine du ') + fmtDate(ws);
  root.innerHTML = `${nav(t('Activités'), { right: `<button class="icon-btn round" data-set aria-label="${t('Réglages Strava')}">${icon('more')}</button>` })}
    <section class="ac-week">
      <div class="ac-wh"><button class="icon-btn round" data-wk="-1" aria-label="${t('Semaine précédente')}">${icon('chevronLeft')}</button><b>${when}</b>
        <button class="icon-btn round" data-wk="1" aria-label="${t('Semaine suivante')}" ${offset >= 0 ? 'disabled' : ''}>${icon('chevronRight')}</button></div>
      <div class="ac-kpis"><div><b>${fmt(week.km, 1)}</b><span>km</span></div><div><b>${hm(week.min * 60)}</b><span>${t('Durée')}</span></div><div><b>${fmt(week.kcal)}</b><span>kcal</span></div></div>
      ${bars(week)}
      <p class="ac-load"><b>${t('Charge d’entraînement')} ${fmt(week.load)}</b><br>${loadLine(cmp)}</p>
    </section>
    <div class="seg ac-filters" role="tablist">${FILTERS.map(([k, l]) => `<button data-f="${k}" class="${k === filter ? 'on' : ''}" role="tab" aria-selected="${k === filter}">${t(l)}</button>`).join('')}</div>
    ${list.length ? `<div class="cells ac-list">${list.slice(0, 60).map((a) => `<div class="cell tap ac-row" data-id="${a.id}" role="button" tabindex="0">
        <span class="ac-ic">${icon({ run: 'flame', ride: 'timer', swim: 'drop' }[S.kindOf(a.type)] || 'bolt')}</span>
        <span class="grow"><span class="t">${esc(a.name || typeLabel(a) || t('Sortie'))}</span><span class="s">${fmtDate(a.date)} · ${hm(a.moving_s)}${a.distance_m ? ' · ' + km(a.distance_m) : ''}</span></span>
        <span class="val">${fmt(a.calories)} kcal</span>${icon('chevronRight', { cls: 'chev' })}</div>`).join('')}</div>`
      : `<p class="empty">${t('Aucune activité sur cette période. Une sortie enregistrée sur Strava apparaîtra ici après la synchro.')}</p>`}
    <div class="ac-foot"><button class="btn" data-sync ${syncing ? 'disabled' : ''}>${syncing ? t('Synchro…') : t('Synchroniser')}</button>
      <p class="footnote">${t('Dernière synchro : ')}${state.strava.lastSync ? fmtDate(new Date(state.strava.lastSync), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : t('jamais')}</p></div>`;

  const doSync = async (quiet) => {
    if (syncing) return;
    syncing = true; render(root, go);
    try { await S.sync(); if (!quiet) toast(t('Activités synchronisées.')); } catch (e) { toast(e.message); }
    syncing = false;
    if (root.dataset.view === 'activities') render(root, go);
  };
  root.onclick = (e) => {
    const el = e.target.closest('[data-f],[data-wk],[data-sync],[data-set],[data-id]'); if (!el) return;
    if (el.dataset.f) { filter = el.dataset.f; render(root, go); }
    else if (el.dataset.wk) { offset = Math.min(0, offset + Number(el.dataset.wk)); render(root, go); }
    else if ('sync' in el.dataset) doSync(false);
    else if ('set' in el.dataset) go('connect');
    else { const a = all.find((x) => String(x.id) === el.dataset.id); if (a) sheet(detail(a, S.prefs())); }
  };
  // Synchro automatique à l'ouverture (au plus toutes les 10 minutes).
  if (S.prefs().auto && !syncing && Date.now() - (state.strava.lastSync || 0) > 600000 && !root._autoTried) {
    root._autoTried = true; setTimeout(() => { root._autoTried = false; }, 600000);
    doSync(true);
  }
}

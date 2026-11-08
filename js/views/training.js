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
import { isDeload, weekOf, schedule } from '../planner.js';
import { recoveryMap, editedWorkout } from '../recovery.js';
import { yearReview } from '../year.js';

register({ en: { 'Apprendre les mouvements': 'Learn the movements', 'Apprends les bons mouvements': 'Learn the right movements',
    'Cette routine fait partie de ton programme : ses séances prévues seront retirées. Supprimer ?': 'This routine is part of your program: its planned sessions will be removed. Delete it?',
    'Muscles · récupération': 'Muscles · recovery', 'Récupère': 'Recovering', 'Prêt': 'Ready', 'À reprendre': 'Train again', 'il y a {n} j': '{n} d ago', "aujourd'hui": 'today',
    'Prêts aujourd\'hui : {list}': 'Ready today: {list}', 'À travailler en priorité : {list}': 'Train first: {list}', 'Tous tes muscles récupèrent : jour de repos conseillé.': 'All your muscles are recovering: a rest day is advised.',
    'Récupère : travaillé il y a moins de 48 h. Prêt : récupéré, travaillé cette semaine. À reprendre : rien depuis plus de 7 jours. Barre : séries des 7 derniers jours (secondaires = 0,5), cible 10–20 par semaine (Schoenfeld 2016, 2017).': 'Recovering: trained under 48 h ago. Ready: recovered, trained this week. Train again: nothing for over 7 days. Bar: sets over the last 7 days (secondary = 0.5), target 10–20 per week (Schoenfeld 2016, 2017).',
    'Modifier la séance': 'Edit workout', 'Saisir une séance passée': 'Log a past workout', 'Séance passée': 'Past workout', 'Séance modifiée': 'Workout updated', 'Séance ajoutée': 'Workout added',
    'Ajoute au moins une série avec des répétitions, à une date passée.': 'Add at least one set with reps, on a past date.', 'Date': 'Date', 'Retirer la série': 'Remove set',
    '{n} semaines d\'affilée': '{n} weeks in a row', '{d} séances sur {p} cette semaine': '{d} of {p} workouts this week', '{d} séances cette semaine': '{d} workouts this week',
    'semaine {w} sur {n}': 'week {w} of {n}', '{n} exercices · environ {m} min': '{n} exercises · about {m} min', 'Semaine complète': 'Week complete', '{n} semaines d\'affilée.': '{n} weeks in a row.',
    'Prochaine séance : {r}, {d}.': 'Next workout: {r}, {d}.', 'Séance du jour faite': "Today's workout done", 'Repos aujourd\'hui': 'Rest day today', 'Ajoute tes exercices au fil de la séance.': 'Add exercises as you go.',
    '{n} exercices': '{n} exercises', '1 semaine d\'affilée': '1 week in a row', '{d} séance sur {p} cette semaine': '{d} of {p} workouts this week', '{d} séance cette semaine': '{d} workout this week', 'Calendrier': 'Calendar', 'record': 'record', 'Démarrer la séance': 'Start workout', 'Ajoute au moins un exercice.': 'Add at least one exercise.',
    '<b>À travailler en priorité :</b> {list}': '<b>Train first:</b> {list}', '<b>Prêts aujourd\'hui :</b> {list}': '<b>Ready today:</b> {list}', '7 jours': '7 days', 'Séances': 'Workouts',
    "Bilan de l'année": 'Year in review', '12 derniers mois': 'Last 12 months', 'semaines actives': 'active weeks', "sem. d'affilée max": 'best week streak',
    '{n} séances sur les 12 derniers mois': '{n} workouts in the last 12 months', 'Moins': 'Less', 'Plus': 'More', '{n} séries': '{n} sets', 'séances': 'workouts', 'séries': 'sets' },
  nl: { 'Apprendre les mouvements': 'Bewegingen leren', 'Apprends les bons mouvements': 'Leer de juiste bewegingen',
    'Cette routine fait partie de ton programme : ses séances prévues seront retirées. Supprimer ?': 'Deze routine hoort bij je programma: de geplande trainingen worden verwijderd. Verwijderen?',
    'Muscles · récupération': 'Spieren · herstel', 'Récupère': 'Herstelt', 'Prêt': 'Klaar', 'À reprendre': 'Weer trainen', 'il y a {n} j': '{n} d geleden', "aujourd'hui": 'vandaag',
    'Prêts aujourd\'hui : {list}': 'Vandaag klaar: {list}', 'À travailler en priorité : {list}': 'Eerst trainen: {list}', 'Tous tes muscles récupèrent : jour de repos conseillé.': 'Al je spieren herstellen: een rustdag is aangeraden.',
    'Récupère : travaillé il y a moins de 48 h. Prêt : récupéré, travaillé cette semaine. À reprendre : rien depuis plus de 7 jours. Barre : séries des 7 derniers jours (secondaires = 0,5), cible 10–20 par semaine (Schoenfeld 2016, 2017).': 'Herstelt: minder dan 48 u geleden getraind. Klaar: hersteld, deze week getraind. Weer trainen: niets in meer dan 7 dagen. Balk: sets van de laatste 7 dagen (secundair = 0,5), doel 10–20 per week (Schoenfeld 2016, 2017).',
    'Modifier la séance': 'Training bewerken', 'Saisir une séance passée': 'Eerdere training invoeren', 'Séance passée': 'Eerdere training', 'Séance modifiée': 'Training bijgewerkt', 'Séance ajoutée': 'Training toegevoegd',
    'Ajoute au moins une série avec des répétitions, à une date passée.': 'Voeg minstens één set met herhalingen toe, op een eerdere datum.', 'Date': 'Datum', 'Retirer la série': 'Set verwijderen',
    '{n} semaines d\'affilée': '{n} weken op rij', '{d} séances sur {p} cette semaine': '{d} van {p} trainingen deze week', '{d} séances cette semaine': '{d} trainingen deze week',
    'semaine {w} sur {n}': 'week {w} van {n}', '{n} exercices · environ {m} min': '{n} oefeningen · ongeveer {m} min', 'Semaine complète': 'Week voltooid', '{n} semaines d\'affilée.': '{n} weken op rij.',
    'Prochaine séance : {r}, {d}.': 'Volgende training: {r}, {d}.', 'Séance du jour faite': 'Training van vandaag gedaan', 'Repos aujourd\'hui': 'Rustdag vandaag', 'Ajoute tes exercices au fil de la séance.': 'Voeg oefeningen toe tijdens de training.',
    '{n} exercices': '{n} oefeningen', '1 semaine d\'affilée': '1 week op rij', '{d} séance sur {p} cette semaine': '{d} van {p} trainingen deze week', '{d} séance cette semaine': '{d} training deze week', 'Calendrier': 'Kalender', 'record': 'record', 'Démarrer la séance': 'Training starten', 'Ajoute au moins un exercice.': 'Voeg minstens één oefening toe.',
    '<b>À travailler en priorité :</b> {list}': '<b>Eerst trainen:</b> {list}', '<b>Prêts aujourd\'hui :</b> {list}': '<b>Vandaag klaar:</b> {list}', '7 jours': '7 dagen', 'Séances': 'Trainingen',
    "Bilan de l'année": 'Jaaroverzicht', '12 derniers mois': 'Laatste 12 maanden', 'semaines actives': 'actieve weken', "sem. d'affilée max": 'langste reeks weken',
    '{n} séances sur les 12 derniers mois': '{n} trainingen in de laatste 12 maanden', 'Moins': 'Minder', 'Plus': 'Meer', '{n} séries': '{n} sets', 'séances': 'trainingen', 'séries': 'sets' } });

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

  // Parcours v2 : semaine en bandeau, carte du jour (ou semaine complète), routines, historique en carte.
  const td = today(), plan = state.plan;
  const wk0 = (() => { const d = S.parseDate(td); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(wk0); d.setDate(d.getDate() + i); return S.isoDate(d); });
  const doneDays = new Set(ws.map((w) => w.date));
  const planned = plan ? new Map(schedule(plan, week[0], week[6]).map((e) => [e.date, e])) : new Map();
  const doneWeek = week.filter((d) => doneDays.has(d)).length;
  const dow = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'narrow' }));
  const strip = `<div class="tr-week">${week.map((d, i) => `<div class="tr-day"><small>${dow[i]}</small><span class="${doneDays.has(d) ? 'done' : ''} ${d === td ? 'today' : ''} ${planned.has(d) && !doneDays.has(d) ? 'plan' : ''}">${+d.slice(8)}</span></div>`).join('')}</div>
    <p class="tr-cap">${icon('timer')} ${t(streak === 1 ? '1 semaine d\'affilée' : '{n} semaines d\'affilée', { n: streak })} · ${planned.size ? t(doneWeek === 1 ? '{d} séance sur {p} cette semaine' : '{d} séances sur {p} cette semaine', { d: doneWeek, p: planned.size }) : t(doneWeek === 1 ? '{d} séance cette semaine' : '{d} séances cette semaine', { d: doneWeek })}</p>`;
  const todayEv = planned.get(td);
  const rOf = (id) => state.routines.find((r) => r.id === id);
  const estMin = (r) => Math.max(10, Math.round(r.exercises.reduce((m, e) => m + (+e.sets || 3) * ((+e.rest || 90) + 40), 0) / 60 / 5) * 5);
  let hero = '';
  if (todayEv && !doneDays.has(td) && rOf(todayEv.routineId)) {
    const r = rOf(todayEv.routineId);
    hero = `<section class="tr-hero"><div class="v2-blobs" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i></div>
      <p class="tr-hero-k">${t("Aujourd'hui")} · ${t('semaine {w} sur {n}', { w: Math.max(1, weekOf(plan, td)), n: plan.weeks })}${todayEv.deload ? ' · ' + t('décharge') : ''}</p>
      <h2 class="tr-hero-t">${esc(t(r.name))}</h2><p class="tr-hero-s">${t('{n} exercices · environ {m} min', { n: r.exercises.length, m: estMin(r) })}</p>
      <button class="tr-go" data-start-plan="${esc(r.id)}">${icon('play')} ${t('Démarrer')}</button></section>`;
  } else if (planned.size && doneWeek >= planned.size) {
    const nextEv = schedule(plan, S.isoDate(new Date(S.parseDate(td).getTime() + 86400000)), plan.end)[0];
    const R = 52, C = 2 * Math.PI * R;
    hero = `<section class="v2-card tr-done"><div class="tr-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--a-food)" stroke-width="10" stroke-dasharray="${C} ${C}"/></svg><b class="v2-num">${doneWeek}/${planned.size}</b></div>
      <h2 class="tr-done-t">${t('Semaine complète')}</h2>
      <p class="v2-sm">${t('{n} semaines d\'affilée.', { n: streak })}${nextEv ? ' ' + t('Prochaine séance : {r}, {d}.', { r: t(rOf(nextEv.routineId)?.name || 'Séance'), d: fmtDate(nextEv.date, { weekday: 'long', day: 'numeric', month: 'short' }) }) : ''}</p></section>`;
  } else {
    const nextEv = plan ? schedule(plan, td, plan.end).find((e) => e.date > td) : null;
    hero = `<section class="tr-hero"><div class="v2-blobs" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i></div>
      <p class="tr-hero-k">${doneDays.has(td) ? t('Séance du jour faite') : nextEv ? t('Repos aujourd\'hui') : t("Aujourd'hui")}</p>
      <h2 class="tr-hero-t">${nextEv ? esc(t(rOf(nextEv.routineId)?.name || 'Séance')) : t('Séance libre')}</h2>
      <p class="tr-hero-s">${nextEv ? fmtDate(nextEv.date, { weekday: 'long', day: 'numeric', month: 'short' }) : t('Ajoute tes exercices au fil de la séance.')}</p>
      <button class="tr-go" data-a="empty">${icon('play')} ${t('Démarrer une séance vide')}</button></section>`;
  }
  const dayOf = (r) => { if (!plan?.routineIds?.includes(r.id)) return ''; const ev = schedule(plan, td, plan.end).find((e) => e.routineId === r.id); return ev ? ' · ' + fmtDate(ev.date, { weekday: 'long' }) : ''; };
  const best = (w) => { const prev = ws.filter((x) => x.date < w.date); return w.exercises.some((ex) => { const now = W.exerciseRecords([w], ex.name, bw).e1rm || 0; return now > 0 && prev.some((x) => x.exercises.some((e) => e.name === ex.name)) && now > (W.exerciseRecords(prev, ex.name, bw).e1rm || 0); }); };

  root.innerHTML = `
    ${nav(t('Séances'), { large: false })}
    <div class="wt-title"><h1 class="large-title">${t('Séances')}</h1><div class="v2-cbs"><button class="v2-cb" data-a="wizard" aria-label="${t('Programme')}">${icon('sparkles')}</button><button class="v2-cb" data-a="cal" aria-label="${t('Calendrier')}">${icon('calendar')}</button></div></div>
    ${strip}${hero}
    ${todayEv && !doneDays.has(td) ? `<button class="btn large wide tr-empty" data-a="empty">${icon('plus')} ${t('Démarrer une séance vide')}</button>` : ''}
    ${folders.map((f) => `<h2 class="v2-xs tr-h">${esc(t(f || 'Mes routines'))}</h2><div class="v2-card tr-list">${state.routines.filter((r) => (r.folder || '') === f).map((r) => `
      <button class="v2-li" data-edit="${esc(r.id)}"><span class="v2-av">${icon('training')}</span><span class="grow"><span class="v2-lb" style="display:block">${esc(t(r.name))}</span>
        <span class="v2-sm">${t('{n} exercices', { n: r.exercises.length })}${dayOf(r)}</span></span>${icon('chevronRight', { cls: 'v2-chev' })}</button>`).join('')}</div>`).join('')}
    <div class="v2-card tr-list"><button class="v2-li tr-act" data-a="new-routine"><span class="v2-av">${icon('plus')}</span><span class="grow v2-lb">${t('Nouvelle routine')}</span></button></div>
    <button class="lrn-entry" data-a="learn"><span class="lrn-entry-ic">${icon('book')}</span><span class="grow"><b>${t('Apprendre les mouvements')}</b><small>${t('Apprends les bons mouvements')}</small></span>${icon('chevronRight', { cls: 'chev' })}</button>
    ${musclesCard(ws, msets)}
    ${yearCard(ws, td)}
    <h2 class="v2-xs tr-h">${t('Historique')}</h2>
    <div class="v2-card tr-list">${[...ws].reverse().slice(0, 20).map((w) => { const pr = best(w); return `<button class="v2-li" data-w="${esc(w.id)}"><span class="v2-av ${pr ? 'pr' : ''}">${icon(pr ? 'trophy' : 'training')}</span>
      <span class="grow"><span class="v2-lb" style="display:block">${esc(t(w.name || w.dayName))} · ${w.date === td ? t("aujourd'hui") : fmtDate(w.date, { weekday: 'long', day: 'numeric' })}</span>
      <span class="v2-sm num">${fmt(w.minutes || 0)} min · ${fmt(w.volume ?? W.workoutVolume(w, bw))} kg${pr ? ' · ' + t('record') : ''}</span></span>${icon('chevronRight', { cls: 'v2-chev' })}</button>`; }).join('') || `<p class="v2-sm" style="padding:12px 0">${t('Aucune séance.')}</p>`}
      <button class="v2-li tr-act" data-a="log-past"><span class="v2-av">${icon('plus')}</span><span class="grow v2-lb">${t('Saisir une séance passée')}</span></button></div>
    ${planCard()}
    <div class="cells stats tr-stats">
      <div><small>${t('Régularité')}</small><b>${streak} <span class="u">${t('sem.')}</span></b></div>
      <div><small>${t('Repos')}</small><b>${rest ?? '–'} <span class="u">${t('j')}</span></b></div>
      <div><small>${t('Ce mois-ci')}</small><b>${ws.filter((w) => w.date.slice(0, 7) === td.slice(0, 7)).length} <span class="u">${t('séances')}</span></b></div>
    </div>
    ${doneNames.length ? group(t('Exercices'), `<ul class="cells">${doneNames.map((n) => { const r = W.exerciseRecords(ws, n, bw);
      return `<li class="cell tap" data-ex="${esc(n)}"><div class="grow"><span class="t">${esc(t(n))}</span><span class="s num">${t('1RM estimé')} ${fmt(r.e1rm, 1)} kg · ${r.sessions} ${t('séances')}</span></div>${icon('chevronRight', { cls: 'chev' })}</li>`; }).join('')}</ul>`) : ''}
    ${group(t('Outils'), `<div class="cells"><div class="cell tap with-icon" data-a="plates"><span class="badge bg-teal">${icon('dumbbell')}</span><span class="grow">${t('Calculateur de disques')}</span>${icon('chevronRight', { cls: 'chev' })}</div></div>`,
      t("OMS 2020 : 150–300 min d'activité modérée/sem + renforcement ≥ 2 j/sem."))}`;

  const yr = root.querySelector('.yr-scroll'); if (yr) yr.scrollLeft = yr.scrollWidth;
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
    if (a === 'cal') return calendarSheet(back);
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
  const head = ws.length ? `<p class="rc-head">${icon('target')}<span>${todo ? t('<b>À travailler en priorité :</b> {list}', { list: todo }) : ready ? t('<b>Prêts aujourd\'hui :</b> {list}', { list: ready }) : t('Tous tes muscles récupèrent : jour de repos conseillé.')}</span></p>` : '';
  const rows = S.MUSCLES.map((m) => {
    const r = rec[m], n = msets[m] || 0;
    const when = r.days === null ? '' : ' · ' + (r.days === 0 ? t("aujourd'hui") : t('il y a {n} j', { n: r.days }));
    return `<div class="rc-row"><span class="rc-dot rc-${r.status}" aria-hidden="true"></span>
      <span class="rc-name"><b>${t(m)}</b><small>${t(REC[r.status])}${when}</small></span>
      <div class="v2-bar rc-bar" role="img" aria-label="${fmt(n, n % 1 ? 1 : 0)} ${t('séries')}"><i class="rc-${r.status}-b" style="width:${Math.min(100, (n / 12) * 100)}%"></i></div>
      <span class="v2-num">${fmt(n, n % 1 ? 1 : 0)}</span></div>`;
  }).join('');
  return `<section class="v2-card rc"><div class="rc-top"><h2 class="rc-title">${t('Muscles · récupération')}</h2><span class="v2-sm">${t('7 jours')}</span></div>${head}${rows}
    <p class="rc-foot">${t('Récupère : travaillé il y a moins de 48 h. Prêt : récupéré, travaillé cette semaine. À reprendre : rien depuis plus de 7 jours. Barre : séries des 7 derniers jours (secondaires = 0,5), cible 10–20 par semaine (Schoenfeld 2016, 2017).')}</p></section>`;
}

// Bilan de l'année : grille des 53 dernières semaines (une case par jour, plus foncée = plus de séries) + chiffres clés.
function yearCard(ws, td) {
  const r = yearReview(ws, td);
  const months = r.weeks.map((wk, k) => { const first = wk.find((d) => d.date.slice(8) === '01'); return first ? `<span style="grid-column:${k + 1}">${esc(fmtDate(first.date, { month: 'short' }))}</span>` : ''; }).join('');
  const cells = r.weeks.map((wk) => wk.map((d) => `<i class="yr-l${d.future ? 'f' : d.level}"${d.sets ? ` title="${esc(fmtDate(d.date, { day: 'numeric', month: 'short' }))} · ${t('{n} séries', { n: d.sets })}"` : ''}></i>`).join('')).join('');
  const stat = (v, l) => `<div><b class="v2-num">${v}</b><small>${l}</small></div>`;
  return `<section class="v2-card yr"><div class="rc-top"><h2 class="rc-title">${t("Bilan de l'année")}</h2><span class="v2-sm">${t('12 derniers mois')}</span></div>
    <div class="yr-stats">${stat(fmt(r.sessions), t('séances'))}${stat(`${r.activeWeeks}<small>/52</small>`, t('semaines actives'))}${stat(r.bestStreak, t('sem. d\'affilée max'))}${stat(fmt(r.sets), t('séries'))}</div>
    <div class="yr-scroll" role="img" aria-label="${t('{n} séances sur les 12 derniers mois', { n: r.sessions })}"><div class="yr-months" aria-hidden="true">${months}</div><div class="yr-grid" aria-hidden="true">${cells}</div></div>
    <div class="yr-legend" aria-hidden="true"><span>${t('Moins')}</span><i class="yr-l0"></i><i class="yr-l1"></i><i class="yr-l2"></i><i class="yr-l3"></i><span>${t('Plus')}</span></div></section>`;
}

// Calendrier en feuille (bouton calendrier de l'en-tête).
function calendarSheet(back) {
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Calendrier')}</h3></div><div class="body">${calendar()}</div>`, back);
  s.addEventListener('click', (e) => { const c = e.target.closest('[data-cal]'); if (c) { month = c.dataset.cal; s.querySelector('.body').innerHTML = calendar(); } });
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
  const sum = (ex) => { const d = ex.sets.filter((x) => x.done); if (!d.length) return '—';
    const reps = [...new Set(d.map((x) => x.reps))], kg = Math.max(...d.map((x) => +x.kg || 0));
    return `${d.length} × ${reps.length === 1 ? reps[0] : Math.min(...reps) + '–' + Math.max(...reps)}${kg ? ' · ' + fmt(kg, 1) + ' kg' : ''}`; };
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${esc(t(w.name || w.dayName))}</h3></div>
    <p class="v2-sm wd-date">${fmtDate(w.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <div class="wd-stats"><div class="v2-card"><b class="v2-num">${fmt(w.minutes || 0)} min</b><small>${t('Durée')}</small></div>
      <div class="v2-card"><b class="v2-num">${fmt(W.workoutVolume(w, bw))}</b><small>kg</small></div><div class="v2-card"><b class="v2-num">${W.doneSets(w)}</b><small>${t('séries')}</small></div></div>
    <div class="v2-card wd-list">${w.exercises.map((ex) => `<div class="v2-li wd-ex"><span class="grow"><span class="v2-lb" style="display:block">${esc(t(ex.name))}</span><span class="v2-sm num">${sum(ex)}</span>${ex.note ? `<span class="v2-sm" style="display:block">${esc(ex.note)}</span>` : ''}</span></div>`).join('')}</div>
    <div class="v2-card wd-list"><button class="v2-li wd-edit" data-a="edit">${icon('pencil')}<span class="grow">${t('Modifier la séance')}</span>${icon('chevronRight', { cls: 'v2-chev' })}</button>
      <button class="v2-li wd-del" data-a="del">${icon('trash')}<span class="grow">${t('Supprimer la séance')}</span></button></div>`);
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
        <div class="cell we-add"><button class="btn wide" data-add-set="${i}">${icon('plus')} ${t('Série')}</button></div></div>`)).join('')}
      <button class="btn plain wide we-addex" data-a="add-ex">${icon('plus')} ${t('Ajouter un exercice')}</button>
      <button class="btn filled large wide v2-go" data-a="save">${t('Enregistrer')}</button>`;
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
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Routine')}</h3></div><div class="body"></div>
    <button class="btn filled large wide v2-go tr-start" data-a="start">${t('Démarrer la séance')}</button>`, onClose);
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
    if (el.dataset.a === 'start') {
      if (!r.exercises.length) return toast(t('Ajoute au moins un exercice.'));
      startWorkout(r); s.close(); return;
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


// Assistant de programme : brief (objectif, date, jours, durée, niveau, blessures) → programmes proposés
// → création locale ou personnalisation par le coach IA (questions puis génération). Carte « Mon programme ».
import * as P from '../planner.js';
import { MUSCLES, isoDate, parseDate } from '../science.js';
import { state, save, today } from '../store.js';
import { LIBRARY, findExercise } from '../exercises.js';
import { esc, fmtDate, sheet, group, toast } from '../ui.js';
import { icon } from '../icons.js';
import { t, locale } from '../i18n.js';

const DAYS = [1, 2, 3, 4, 5, 6, 7];
const dayLabel = (n) => new Date(2024, 0, n).toLocaleDateString(locale(), { weekday: 'short' }); // 1 janv. 2024 = lundi
const nextMonday = () => { const d = parseDate(today()); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return isoDate(d); };
const plus = (iso, days) => { const d = parseDate(iso); d.setDate(d.getDate() + days); return isoDate(d); };

export function openWizard(done) {
  const p = state.profile;
  const b = { goal: { perte: 'seche', prise: 'hypertrophie', maintien: 'forme' }[p.goal] || 'hypertrophie', start: nextMonday(), end: plus(nextMonday(), 83),
    weekdays: P.defaultWeekdays(p.sessions || 3), level: 'intermédiaire', equipment: p.equipment || 'salle' };
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Nouveau programme')}</h3></div><div class="body"></div>`, done);
  const body = s.querySelector('.body');

  // Étape 1 : le brief
  const step1 = () => {
    body.innerHTML = `
      ${group(t('Ton objectif'), `<ul class="cells">${Object.entries(P.PLAN_GOALS).map(([k, l]) => `<li class="cell tap" data-goal="${k}"><span class="grow">${t(l)}</span>${b.goal === k ? icon('check', { cls: 'tint' }) : ''}</li>`).join('')}</ul>`)}
      ${group(t('Quand ?'), `<div class="cells">
        <label class="cell field"><span>${t('Début')}</span><input type="date" name="start" value="${b.start}"></label>
        <label class="cell field"><span>${b.goal === 'evenement' ? t('Date de l\'épreuve') : t('Date cible')}</span><input type="date" name="end" value="${b.end}"></label></div>`,
        t('Le programme est découpé en phases jusqu\'à cette date, avec une semaine de décharge régulière.'))}
      ${group(t('Tes jours d\'entraînement'), `<div class="cells"><div class="cell"><div class="daypick">${DAYS.map((d) => `<button type="button" class="${b.weekdays.includes(d) ? 'on' : ''}" data-day="${d}" aria-pressed="${b.weekdays.includes(d)}">${dayLabel(d)}</button>`).join('')}</div></div>
        <label class="cell field"><span>${t('Niveau')}</span><select name="level">${['débutant', 'intermédiaire', 'avancé'].map((l) => `<option value="${l}" ${l === b.level ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></label>
        <label class="cell field"><span>${t('Matériel')}</span><select name="equipment">${[['salle', 'Salle complète'], ['maison', 'Haltères à la maison'], ['aucun', 'Poids du corps']].map(([k, l]) => `<option value="${k}" ${k === b.equipment ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></label></div>`)}
      <button class="btn filled large" data-a="next">${t('Voir les programmes proposés')}</button>`;
    body.onclick = (e) => {
      const g = e.target.closest('[data-goal]'); if (g) { read(); b.goal = g.dataset.goal; return step1(); }
      const d = e.target.closest('[data-day]');
      if (d) { const n = +d.dataset.day; b.weekdays = b.weekdays.includes(n) ? b.weekdays.filter((x) => x !== n) : [...b.weekdays, n].sort(); d.classList.toggle('on'); d.setAttribute('aria-pressed', b.weekdays.includes(n)); return; }
      if (e.target.closest('[data-a=next]')) {
        read();
        if (!b.weekdays.length) return toast(t('Choisis au moins un jour'));
        if (b.end <= b.start) return toast(t('La date cible doit être après le début'));
        step2();
      }
    };
  };
  const read = () => {
    const v = (n) => body.querySelector(`[name=${n}]`)?.value;
    if (!body.querySelector('[name=start]')) return;
    Object.assign(b, { start: v('start'), end: v('end'), level: v('level'), equipment: v('equipment') });
  };

  // Étape 2 : programmes proposés (conseillé en premier), détail de chaque séance
  const step2 = () => {
    const rec = P.recommendTemplate({ days: b.weekdays.length, equipment: b.equipment, goal: b.goal });
    const ids = [rec, ...Object.keys(P.TEMPLATES).filter((k) => k !== rec && P.TEMPLATES[k].equipment.includes(b.equipment))];
    const weeks = Math.ceil(((parseDate(b.end) - parseDate(b.start)) / 86400000 + 1) / 7);
    body.innerHTML = `<p class="footnote secondary" style="margin:-.25rem .25rem 1rem">${t(P.PLAN_GOALS[b.goal])} · ${weeks} ${t('semaines')} · ${b.weekdays.map(dayLabel).join(', ')}</p>
      ${ids.map((id) => { const tp = P.TEMPLATES[id];
        return group(`${t(tp.name)}${id === rec ? `<b class="tint">${t('Conseillé')}</b>` : ''}`, `<div class="cells">
          <div class="cell"><span class="grow subhead">${t(tp.why)}</span></div>
          ${tp.plan.map((d) => `<div class="cell"><div class="grow"><span class="t headline">${esc(t(d.name))}</span><span class="s" style="white-space:normal">${d.exercises.map((x) => esc(t(x.name))).join(' · ')}</span></div></div>`).join('')}
          <div class="cell action" data-tpl="${id}" role="button">${t('Choisir ce programme')}</div></div>`,
          `${t('Niveau')} : ${t(tp.level)} · ${t('{n} séances différentes', { n: tp.plan.length })}`); }).join('')}
      <button class="btn plain wide" data-a="back">${t('Modifier mes réponses')}</button>`;
    body.onclick = (e) => {
      if (e.target.closest('[data-a=back]')) return step1();
      const tp = e.target.closest('[data-tpl]');
      if (tp) { const { plan, routines } = P.buildPlan({ templateId: tp.dataset.tpl, goal: b.goal, start: b.start, end: b.end, weekdays: b.weekdays, level: b.level }); install(plan, routines); }
    };
  };

  const install = (plan, routines) => {
    // Remplace l'ancien programme daté (ses routines), garde les routines perso.
    // L'ancien programme (et ses routines, même retouchées) est remplacé : « Annuler » le remet tel quel.
    const prev = { plan: state.plan, routines: state.routines.slice() };
    const old = new Set(state.plan?.routineIds || []);
    state.routines = state.routines.filter((r) => !old.has(r.id)).concat(routines);
    state.plan = plan;
    save(); s.close();
    toast(t('Programme créé'), prev.plan ? { undo: () => { state.plan = prev.plan; state.routines = prev.routines; save(); done?.(); } } : {});
  };
  step1();
}

// Carte « Mon programme » : semaine, phase, prochaines séances.
export function planCard() {
  const plan = state.plan;
  if (!plan) return group(t('Mon programme'), `<div class="cells"><div class="cell" style="display:block"><p class="t" style="white-space:normal;margin:.25rem 0">${t('Crée un programme daté : le coach le découpe en phases jusqu\'à ta date cible et le cale sur tes jours.')}</p></div>
    <div class="cell action" data-a="wizard" role="button">${icon('plus')} ${t('Nouveau programme')}</div></div>`);
  const td = today();
  const week = Math.max(1, Math.min(plan.weeks, P.weekOf(plan, td)));
  const phase = P.phaseOf(plan, week);
  const upcoming = P.schedule(plan, td, plan.end).slice(0, 4);
  const doneDates = new Set(state.workouts.map((w) => w.date));
  const rname = (id) => state.routines.find((r) => r.id === id)?.name || '—';
  const pct = Math.round((Math.min(week, plan.weeks) / plan.weeks) * 100);
  return group(esc(t(plan.name)), `<ul class="cells">
    <li class="cell" style="display:block"><div class="bar-head"><span>${td < plan.start ? t('Commence {d}', { d: fmtDate(plan.start, { weekday: 'long', day: 'numeric', month: 'short' }) }) + ' · ' + t('{n} semaines', { n: plan.weeks }) : t('Semaine {w} sur {n}', { w: week, n: plan.weeks }) + ' · ' + t(phase.name)}</span><span>${fmtDate(plan.end, { day: 'numeric', month: 'short' })}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${td < plan.start ? 0 : pct}%"></div></div>
      <p class="footnote secondary" style="margin:.4rem 0 0">${t(phase.focus)}${P.isDeload(plan, week) ? ' · ' + t('Semaine de décharge : volume réduit (~60 %).') : ''}</p></li>
    ${upcoming.map((e) => `<li class="cell ${e.date === td ? 'tap' : ''}" ${e.date === td && !doneDates.has(td) ? `data-start-plan="${esc(e.routineId)}"` : ''}>
      <div class="grow"><span class="t">${esc(t(rname(e.routineId)))}${e.deload ? ` · <span class="secondary">${t('décharge')}</span>` : ''}</span>
      <span class="s">${e.date === td ? t("Aujourd'hui") : fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'short' })}</span></div>
      ${e.date === td && !doneDates.has(td) ? `<span class="btn filled pill">${t('Démarrer')}</span>` : ''}</li>`).join('') || `<li class="empty">${t('Programme terminé')}</li>`}
    <li class="cell action" data-a="wizard" role="button">${t('Nouveau programme')}</li>
    </ul>`, plan.rationale ? esc(plan.rationale) : '');
}

// Séances prévues d'un mois (pour le calendrier de l'onglet Sport).
export function plannedDays(month) {
  if (!state.plan) return new Map();
  const from = `${month}-01`, to = `${month}-31`;
  return new Map(P.schedule(state.plan, from, to).map((e) => [e.date, e]));
}


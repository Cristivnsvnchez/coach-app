// Assistant de programme : brief (objectif, date, jours, durée, niveau, blessures) → programmes proposés
// → création locale ou personnalisation par le coach IA (questions puis génération). Carte « Mon programme ».
import * as P from '../planner.js';
import { MUSCLES, isoDate, parseDate } from '../science.js';
import { state, save, today } from '../store.js';
import { LIBRARY, findExercise } from '../exercises.js';
import { hasKey, programQuestions, programGenerate } from '../ai.js';
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
    weekdays: P.defaultWeekdays(p.sessions || 3), minutes: 60, level: 'intermédiaire', injuries: '', equipment: p.equipment || 'salle' };
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
        <label class="cell field"><span>${t('Durée par séance')}</span><select name="minutes">${[30, 45, 60, 75, 90].map((m) => `<option value="${m}" ${m === b.minutes ? 'selected' : ''}>${m} min</option>`).join('')}</select></label>
        <label class="cell field"><span>${t('Niveau')}</span><select name="level">${['débutant', 'intermédiaire', 'avancé'].map((l) => `<option value="${l}" ${l === b.level ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></label>
        <label class="cell field"><span>${t('Matériel')}</span><select name="equipment">${[['salle', 'Salle complète'], ['maison', 'Haltères à la maison'], ['aucun', 'Poids du corps']].map(([k, l]) => `<option value="${k}" ${k === b.equipment ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></label>
        <label class="cell field"><span>${t('Blessures / douleurs')}</span><input name="injuries" value="${esc(b.injuries)}" placeholder="${t('aucune')}"></label></div>`)}
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
    Object.assign(b, { start: v('start'), end: v('end'), minutes: +v('minutes'), level: v('level'), equipment: v('equipment'), injuries: v('injuries').trim() });
  };

  // Étape 2 : programmes proposés (conseillé en premier), détail de chaque séance
  const step2 = () => {
    const rec = P.recommendTemplate({ days: b.weekdays.length, equipment: b.equipment, goal: b.goal });
    const ids = [rec, ...Object.keys(P.TEMPLATES).filter((k) => k !== rec && P.TEMPLATES[k].equipment.includes(b.equipment))];
    const weeks = Math.ceil(((parseDate(b.end) - parseDate(b.start)) / 86400000 + 1) / 7);
    body.innerHTML = `<p class="footnote secondary" style="margin:-.25rem .25rem 1rem">${t(P.PLAN_GOALS[b.goal])} · ${weeks} ${t('semaines')} · ${b.weekdays.map(dayLabel).join(', ')} · ${b.minutes} min</p>
      ${hasKey() ? `<button class="btn large" data-a="ai" style="margin-bottom:1.25rem">${icon('sparkles')} ${t('Programme sur mesure avec le coach IA')}</button>` : ''}
      ${ids.map((id) => { const tp = P.TEMPLATES[id];
        return group(`${t(tp.name)}${id === rec ? `<b class="tint">${t('Conseillé')}</b>` : ''}`, `<div class="cells">
          <div class="cell"><span class="grow subhead">${t(tp.why)}</span></div>
          ${tp.plan.map((d) => `<div class="cell"><div class="grow"><span class="t headline">${esc(t(d.name))}</span><span class="s" style="white-space:normal">${d.exercises.map((x) => esc(t(x.name))).join(' · ')}</span></div></div>`).join('')}
          <div class="cell action" data-tpl="${id}" role="button">${t('Choisir ce programme')}</div></div>`,
          `${t('Niveau')} : ${t(tp.level)} · ${t('{n} séances différentes', { n: tp.plan.length })}`); }).join('')}
      <button class="btn plain wide" data-a="back">${t('Modifier mes réponses')}</button>`;
    body.onclick = (e) => {
      if (e.target.closest('[data-a=back]')) return step1();
      if (e.target.closest('[data-a=ai]')) return stepAiQuestions();
      const tp = e.target.closest('[data-tpl]');
      if (tp) { const { plan, routines } = P.buildPlan({ templateId: tp.dataset.tpl, goal: b.goal, start: b.start, end: b.end, weekdays: b.weekdays, level: b.level }); install(plan, routines); }
    };
  };

  // Étape IA : le coach pose ses questions, puis génère
  const stepAiQuestions = async () => {
    body.innerHTML = `<p class="empty footnote"><span class="typing-dots"><i></i><i></i><i></i></span><br>${t('Le coach lit ton brief…')}</p>`;
    try {
      const qs = await programQuestions(b);
      if (!qs.length) return stepAiGenerate([]);
      body.innerHTML = `${group(t('Le coach a quelques questions'), `<div class="cells">${qs.map((q, i) => `<div class="cell" style="display:block">
          <p class="t" style="white-space:normal;margin:.25rem 0 .5rem">${esc(q.q)}</p>
          ${q.options?.length ? `<div class="chips wrap" style="margin:0;padding:0">${q.options.map((o) => `<button type="button" class="chip" data-q="${i}" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : ''}
          <input class="input" data-ans="${i}" placeholder="${t('Ta réponse')}" style="margin-top:.5rem"></div>`).join('')}</div>`)}
        <button class="btn filled large" data-a="gen">${icon('sparkles')} ${t('Générer mon programme')}</button>`;
      body.onclick = (e) => {
        const o = e.target.closest('[data-opt]');
        if (o) { body.querySelector(`[data-ans="${o.dataset.q}"]`).value = o.dataset.opt; body.querySelectorAll(`[data-q="${o.dataset.q}"]`).forEach((x) => x.classList.toggle('on', x === o)); return; }
        if (e.target.closest('[data-a=gen]')) stepAiGenerate(qs.map((q, i) => ({ question: q.q, reponse: body.querySelector(`[data-ans="${i}"]`).value.trim() || '—' })));
      };
    } catch (err) { body.innerHTML = `<p class="error">${esc(t(err.message, err.vars))}</p>`; }
  };

  const stepAiGenerate = async (answers) => {
    body.innerHTML = `<p class="empty footnote"><span class="typing-dots"><i></i><i></i><i></i></span><br>${t('Le coach construit ton programme… (20–60 s)')}</p>`;
    try {
      const g = await programGenerate(b, answers, MUSCLES, LIBRARY.map((x) => x.name));
      const { plan } = P.buildPlan({ templateId: 'fullbody3', goal: b.goal, start: b.start, end: b.end, weekdays: b.weekdays, level: b.level });
      const folder = g.name;
      const routines = g.days.slice(0, 7).map((d, i) => ({ id: `${plan.id}-${i}`, name: d.name, folder, exercises: d.exercises.map((x) => {
        const info = findExercise(x.name, state.customExercises) || {};
        return { name: x.name, muscle: MUSCLES.includes(x.muscle) ? x.muscle : info.muscle || 'Abdos', secondary: info.secondary || [], type: info.type || 'weight_reps',
          upper: info.upper ?? !['Quadriceps', 'Ischios', 'Fessiers', 'Mollets'].includes(x.muscle), sets: Math.max(1, Math.min(8, x.sets)), repMin: x.repMin, repMax: Math.max(x.repMin, x.repMax), rest: x.rest };
      }) }));
      Object.assign(plan, { name: folder, templateId: 'ia', routineIds: routines.map((r) => r.id), rationale: g.rationale });
      body.innerHTML = `${group(esc(folder), `<div class="cells"><div class="cell"><span class="grow subhead" style="white-space:normal">${esc(g.rationale)}</span></div>
        ${routines.map((r) => `<div class="cell"><div class="grow"><span class="t headline">${esc(r.name)}</span><span class="s" style="white-space:normal">${r.exercises.map((x) => `${esc(t(x.name))} ${x.sets}×${x.repMin}–${x.repMax}`).join(' · ')}</span></div></div>`).join('')}</div>`)}
        <button class="btn filled large" data-a="ok">${t('Utiliser ce programme')}</button>`;
      body.querySelector('[data-a=ok]').onclick = () => install(plan, routines);
    } catch (err) { body.innerHTML = `<p class="error">${esc(t(err.message, err.vars))}</p>`; }
  };

  const install = (plan, routines) => {
    // Remplace l'ancien programme daté (ses routines), garde les routines perso.
    const old = new Set(state.plan?.routineIds || []);
    state.routines = state.routines.filter((r) => !old.has(r.id)).concat(routines);
    state.plan = plan;
    save(); toast(t('Programme créé ✓')); s.close();
  };
  step1();
}

// Carte « Mon programme » : semaine, phase, prochaines séances, export calendrier.
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
    ${upcoming.map((e) => `<li class="cell ${e.date === td ? 'tap' : ''}" ${e.date === td && !doneDates.has(td) ? `data-start-plan="${e.routineId}"` : ''}>
      <div class="grow"><span class="t">${esc(t(rname(e.routineId)))}${e.deload ? ` · <span class="secondary">${t('décharge')}</span>` : ''}</span>
      <span class="s">${e.date === td ? t("Aujourd'hui") : fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'short' })}</span></div>
      ${e.date === td && !doneDates.has(td) ? `<span class="btn filled pill">${t('Démarrer')}</span>` : ''}</li>`).join('') || `<li class="empty">${t('Programme terminé 🎉')}</li>`}
    <li class="cell action" data-a="ics" role="button">${icon('calendar')} ${t('Ajouter au calendrier de l\'iPhone')}</li>
    <li class="cell action" data-a="wizard" role="button">${t('Nouveau programme')}</li>
    </ul>`, plan.rationale ? esc(plan.rationale) : '');
}

// Séances prévues d'un mois (pour le calendrier de l'onglet Sport).
export function plannedDays(month) {
  if (!state.plan) return new Map();
  const from = `${month}-01`, to = `${month}-31`;
  return new Map(P.schedule(state.plan, from, to).map((e) => [e.date, e]));
}

// Export .ics : réglages (heure, durée, rappel) puis feuille de partage / ouverture dans Calendrier.
export function exportCalendar() {
  const plan = state.plan; if (!plan) return;
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Calendrier de l\'iPhone')}</h3></div>
    ${group('', `<div class="cells">
      <label class="cell field"><span>${t('Heure de séance')}</span><input type="time" name="time" value="18:00"></label>
      <label class="cell field"><span>${t('Durée (min)')}</span><input type="number" name="min" value="60" inputmode="numeric"></label>
      <label class="cell field"><span>${t('Rappel avant (min)')}</span><input type="number" name="alarm" value="30" inputmode="numeric"></label></div>`,
      t('Crée un fichier calendrier avec toutes tes séances prévues. Sur iPhone : touche « Ajouter tout » dans l\'aperçu, ou choisis Calendrier dans la feuille de partage.'))}
    <button class="btn filled large" data-a="go">${icon('calendar')} ${t('Exporter {n} séances', { n: P.schedule(plan, today(), plan.end).length })}</button>`);
  s.querySelector('[data-a=go]').onclick = async () => {
    const v = (n) => s.querySelector(`[name=${n}]`).value;
    const rname = (id) => t(state.routines.find((r) => r.id === id)?.name || 'Séance');
    const events = P.schedule(plan, today(), plan.end).map((e) => ({ ...e, uid: `${plan.id}-${e.date}`,
      title: `${rname(e.routineId)}${e.deload ? ' (' + t('décharge') + ')' : ''}`,
      description: `${t(plan.name)} — ${t('Semaine {w} sur {n}', { w: e.week, n: plan.weeks })}. ${t(P.phaseOf(plan, e.week).focus)}` }));
    const ics = P.toICS(events, { time: v('time'), minutes: +v('min') || 60, alarm: +v('alarm') || 0, calName: 'Coach' });
    const file = new File([ics], 'coach-seances.ics', { type: 'text/calendar' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Coach' }); s.close(); return; } catch {} }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000); s.close();
  };
}


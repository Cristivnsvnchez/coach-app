// Onglet Poids : pesée, courbe (pesées, tendance, projection, cible, étapes), poids de référence,
// timeline d'étapes (auto + estimations de l'utilisateur) avec statut atteint / avance / retard.
import * as S from '../science.js';
import { state, save, today, uid } from '../store.js';
import { current, observedKgPerWeek } from '../metrics.js';
import { esc, fmt, fmtDate, lineChart, toast, nav, group, sheet } from '../ui.js';
import { icon } from '../icons.js';
import { t } from '../i18n.js';
import * as Cy from '../cycle.js';
import { register } from '../i18n.js';
register({ en: { 'rétention d\'eau probable': 'water retention likely', 'Points roses : pesées en rétention d\'eau probable (cycle). ': 'Pink dots: weigh-ins with likely water retention (cycle). ' },
  nl: { 'rétention d\'eau probable': 'waarschijnlijk vochtretentie', 'Points roses : pesées en rétention d\'eau probable (cycle). ': 'Roze stippen: wegingen met waarschijnlijke vochtretentie (cyclus). ' } });

let range = 90;

export function render(root, go) {
  const p = state.profile;
  const trend = S.emaTrend(state.weights);
  const last = trend[trend.length - 1];
  const start = trend[0];
  const ideal = p.height && p.sex ? S.idealRange(p) : null;
  const { targets } = current();
  const obs = observedKgPerWeek();
  const target = Number(p.targetWeight) || null;
  const down = target && last ? target < (start?.kg ?? last.trend) : true;
  const speed = obs && target && Math.sign(target - (last?.trend ?? 0)) === Math.sign(obs) ? obs : targets?.weeklyChangeKg;
  const eta = last && target ? S.etaDate(last.trend, target, speed, today()) : null;
  const custom = state.milestones || [];
  const progress = start && last && target && start.kg !== target ? Math.min(1, Math.max(0, (start.kg - last.trend) / (start.kg - target))) : 0;
  const keep = () => { const y = root.scrollTop; render(root, go); root.scrollTop = y; };

  // Graphique : fenêtre = période choisie, étendue jusqu'à l'arrivée estimée si elle est proche.
  const since = range ? Date.now() - range * 86400000 : 0;
  const shown = trend.filter((x) => S.parseDate(x.date) >= since);
  const proj = last && target && eta && (eta - Date.now()) < 400 * 86400000 ? S.projection(last.trend, target, speed, today()) : [];
  const msPts = custom.filter((m) => m.date).map((m) => {
    const st = S.milestoneStatus(m, trend, speed, today(), down);
    return { x: S.parseDate(m.date), y: m.kg, done: st.reached };
  }).filter((m) => !since || +m.x >= since);
  // Cycle actif : pesées tombant en rétention d'eau probable (fin de phase lutéale, début des règles).
  const retention = (d) => state.cycle?.enabled && Cy.weightNote(state.cycle, d) === 'retention';
  const chart = !trend.length ? `<p class="empty footnote">${t('Enregistre ta première pesée pour voir la courbe.')}</p>` : lineChart([
    { points: shown.map((x) => ({ x: S.parseDate(x.date), y: x.kg })), cls: 'raw', dots: true },
    { points: shown.map((x) => ({ x: S.parseDate(x.date), y: x.trend })), cls: 'trend' },
    { points: shown.filter((x) => retention(x.date)).map((x) => ({ x: S.parseDate(x.date), y: x.kg })), cls: 'cyc', dots: true },
    { points: proj, cls: 'proj' },
    { points: msPts.filter((m) => !m.done), cls: 'ms', dots: true },
    { points: msPts.filter((m) => m.done), cls: 'msdone', dots: true },
  ].filter((s) => s.points.length), { hline: target ? { y: target, label: `${t('Cible')} ${fmt(target, 1)}` } : null, band: ideal ? { y1: ideal.bmiMin, y2: ideal.bmiMax } : null });

  // Timeline : étapes auto (25/50/75/100 %) + étapes de l'utilisateur, triées dans le sens de l'objectif.
  const autoSteps = target && start ? S.milestones(start.kg, target, speed, today()).map((m) => ({ id: 'auto-' + m.pct, kg: +m.kg.toFixed(1), label: m.pct === 100 ? t('Cible') : `${m.pct} %`, auto: true })) : [];
  const steps = [...autoSteps.filter((a) => !custom.some((c) => Math.abs(c.kg - a.kg) < 0.25)), ...custom]
    .sort((a, b) => (down ? b.kg - a.kg : a.kg - b.kg));
  const delta = (d) => (d == null || d === 0 ? '' : d < 0 ? `<span class="delta ahead">${t('{n} j d\'avance', { n: -d })}</span>` : `<span class="delta late">${t('{n} j de retard', { n: d })}</span>`);
  // Étape = un nœud sur la ligne de progression. Le rond coche/décoche d'un tap ; la ligne ouvre l'étape
  // (une étape automatique devient alors une étape personnalisée, modifiable).
  const stepRow = (m) => {
    const st = S.milestoneStatus(m, trend, speed, today(), down);
    const right = st.reached
      ? `<span class="val">${t('Atteint')}${st.reachedOn ? ' · ' + fmtDate(st.reachedOn, { day: 'numeric', month: 'short' }) : ''}</span>`
      : `<span class="val">${st.eta ? fmtDate(st.eta, { day: 'numeric', month: 'short', year: '2-digit' }) : '–'}</span>`;
    const byTrend = st.reached && !m.done; // atteinte par la tendance : pas de décochage manuel possible
    return `<li class="cell tap ms-row ${st.reached ? 'done' : ''}" data-ms="${esc(m.id)}">
      <button type="button" class="ms-node" data-toggle="${esc(m.id)}" aria-pressed="${st.reached}" ${byTrend ? 'disabled' : ''}
        aria-label="${st.reached ? t('Marquer comme non atteinte') : t('Marquer comme atteinte')}">${icon('check')}</button>
      <div class="grow"><span class="t num">${fmt(m.kg, 1)} kg${m.label ? ` · <span class="secondary">${esc(m.label)}</span>` : ''}</span>
        <span class="s">${m.date ? t('Prévu le {d}', { d: fmtDate(m.date, { day: 'numeric', month: 'short', year: '2-digit' }) }) : m.auto ? t('Étape proposée') : ''}${delta(st.deltaDays)}</span></div>
      ${right}${icon('chevronRight', { cls: 'chev' })}</li>`;
  };

  const kgIn = (name, ph, val) => `<input class="input num" name="${name}" type="number" step="0.1" inputmode="decimal" placeholder="${ph}" value="${val ?? ''}" aria-label="${ph}">`;
  root.innerHTML = `
    ${nav(t('Poids'))}
    ${group('', `<form class="row" data-f="w">${kgIn('kg', t('Poids du jour (kg)'), state.weights.find((w) => w.date === today())?.kg)}<button class="btn filled">${t('Enregistrer')}</button></form>`)}
    ${group('', `<div class="cells">
      <div class="stats">
        <div><small>${t('Tendance')}</small><b>${last ? fmt(last.trend, 1) : '–'} <span class="u">kg</span></b></div>
        <div><small>${t('Vitesse')}</small><b>${obs !== null ? (obs > 0 ? '+' : '') + fmt(obs, 2) : '–'} <span class="u">${t('kg/sem')}</span></b></div>
        <div><small>${t('Objectif')}</small><b>${target ? fmt(target, 1) : '–'} <span class="u">kg</span></b></div>
      </div>
      <div class="cell chart-cell" style="display:block">
        <div class="seg" role="tablist">${[[30, t('{n} j', { n: 30 })], [90, t('{n} j', { n: 90 })], [365, t('1 an')], [0, t('Tout')]].map(([r, l]) => `<button role="tab" aria-selected="${r === range}" data-r="${r}" class="${r === range ? 'on' : ''}">${l}</button>`).join('')}</div>
        ${chart}
      </div></div>`,
      trend.length < 2 ? t('Pèse-toi 3 à 7 fois par semaine, le matin à jeun : la tendance devient fiable après une à deux semaines.')
        : (state.cycle?.enabled ? t('Points roses : pesées en rétention d\'eau probable (cycle). ') : '') + t('Points : pesées · ligne pleine : tendance lissée · pointillés : projection jusqu\'à ta cible · ronds orange : tes étapes estimées.'))}
    ${group(t('Timeline'), !target ? `<div class="cells"><div class="cell" style="display:block"><p class="t wrap" style="margin:.25rem 0">${t('Définis ton poids cible (plus bas) pour voir la date d\'arrivée estimée et tes étapes.')}</p></div></div>`
      : `<ul class="cells">
        <li class="cell ms-head" style="display:block"><div class="row-between"><span class="t headline">${t('Arrivée estimée')}</span>
          <span class="val headline">${eta ? fmtDate(eta, { day: 'numeric', month: 'short', year: 'numeric' }) : '–'}</span></div>
          <div class="ms-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress * 100)}"><i style="width:${(progress * 100).toFixed(1)}%"></i></div>
          <span class="s">${t('{p} % du chemin · {k} kg restants', { p: Math.round(progress * 100), k: fmt(Math.abs((last?.trend ?? target) - target), 1) })} · ${eta ? (speed === obs ? t('vitesse réelle') : t('rythme prévu')) + ` ${fmt(Math.abs(speed), 2)} ${t('kg/sem')}` : t("Pas d'estimation : la tendance va dans le mauvais sens ou le rythme est nul.")}</span></li>
        ${steps.map(stepRow).join('')}
        <li class="cell action" data-a="add-ms" role="button">${icon('plus')} ${t('Ajouter une étape')}</li></ul>`,
      t('Touche un rond pour cocher une étape. Elle se coche aussi toute seule quand ta tendance l\'atteint. Projection indicative : la perte ralentit avec le temps (Hall 2011).'))}
    ${ideal ? group(t('Poids de référence pour {h} cm', { h: fmt(p.height) }), `<div class="cells">
        <div class="cell"><div class="grow"><span class="t wrap">${t('Fourchette santé (IMC 18,5–24,9, OMS)')}</span></div><span class="val headline">${fmt(ideal.bmiMin, 1)} – ${fmt(ideal.bmiMax, 1)} kg</span></div>
        <form class="cell" data-f="target">${kgIn('t', t('Mon poids cible (kg)'), target)}<button class="btn">${t('Définir')}</button></form></div>`,
      t('Formules cliniques (Devine, Robinson, Hamwi) : {a} – {b} kg', { a: fmt(ideal.formulaMin, 1), b: fmt(ideal.formulaMax, 1) })
        + (ideal.reliable ? '' : t(' (peu fiables sous 152 cm)')) + '. ' + t("L'IMC ignore la masse musculaire : si tu es musclé, vise plutôt un % de masse grasse."))
    : `<div class="cta"><b class="headline">${t('Renseigne taille et sexe dans Profil')}</b><button class="btn filled" data-a="profile">${t('Profil')}</button></div>`}
    ${group(t('Historique'), `<ul class="cells">${[...trend].reverse().slice(0, 30).map((x) => `<li class="cell"><div class="grow"><span class="t num">${retention(x.date) ? '<span class="cy-wdot" aria-hidden="true"></span>' : ''}${fmt(x.kg, 1)} kg</span><span class="s">${retention(x.date) ? `<span class="cy-wnote">${t('rétention d\'eau probable')}</span> · ` : ''}${fmtDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${t('tendance')} ${fmt(x.trend, 1)}</span></div>
      <button class="icon-btn" data-del="${x.date}" aria-label="${t('Supprimer')}">${icon('trash')}</button></li>`).join('') || `<li class="empty">${t('Aucune pesée.')}</li>`}</ul>`)}`;

  root.querySelector('[data-f=w]').onsubmit = (e) => {
    e.preventDefault();
    const kg = parseFloat(String(e.target.kg.value).replace(',', '.'));
    if (!(kg > 20 && kg < 400)) return toast(t('Poids invalide'));
    state.weights = state.weights.filter((w) => w.date !== today()).concat({ date: today(), kg });
    if (!state.profile.weight) state.profile.weight = kg;
    const before = steps.filter((m) => S.milestoneStatus(m, trend, speed, today(), down).reached).length;
    save();
    // Félicitations si la nouvelle pesée fait franchir une étape.
    const tr2 = S.emaTrend(state.weights);
    const after = steps.filter((m) => S.milestoneStatus(m, tr2, speed, today(), down).reached).length;
    toast(after > before ? t('Étape atteinte ! 🎉') : t('Pesée enregistrée'));
    keep();
  };
  const tf = root.querySelector('[data-f=target]');
  if (tf) tf.onsubmit = (e) => {
    e.preventDefault();
    const v = parseFloat(String(e.target.t.value).replace(',', '.'));
    state.profile.targetWeight = v > 20 ? v : null;
    if (ideal && v < ideal.bmiMin) toast(t('Attention : sous la fourchette santé'));
    save(); keep();
  };
  root.onclick = (e) => {
    const r = e.target.closest('[data-r]');
    if (r) { range = +r.dataset.r; return keep(); }
    const d = e.target.closest('[data-del]');
    if (d && confirm(t('Supprimer cette pesée ?'))) { state.weights = state.weights.filter((w) => w.date !== d.dataset.del); save(); return keep(); }
    if (e.target.closest('[data-a=profile]')) return go('profile');
    if (e.target.closest('[data-a=add-ms]')) return editMilestone(null, { last, target, keep });
    const tg = e.target.closest('[data-toggle]');
    if (tg) { const m = steps.find((x) => x.id === tg.dataset.toggle);
      toggleMilestone(m); navigator.vibrate?.(8); keep();
      // Animation de la coche sur l'étape qui vient d'être cochée (une étape automatique cochée reçoit un nouvel id).
      const id = m?.auto ? state.milestones.at(-1)?.id : m?.id;
      const row = [...root.querySelectorAll('[data-ms]')].find((r) => r.dataset.ms === id);
      if (row?.classList.contains('done')) row.querySelector('.ms-node')?.classList.add('ms-pop');
      return; }
    const ms = e.target.closest('[data-ms]');
    if (ms) { const m = steps.find((x) => x.id === ms.dataset.ms); editMilestone(m?.auto ? null : m, { last, target, keep, preset: m?.auto ? m : null }); }
  };
}

// Cocher / décocher à la main. Une étape automatique cochée devient une étape personnalisée (elle garde son poids).
function toggleMilestone(m) {
  if (!m) return;
  if (m.auto) { (state.milestones ||= []).push({ id: uid(), kg: m.kg, label: m.label, date: null, done: true, doneOn: today() }); return save(); }
  const real = state.milestones.find((x) => x.id === m.id);
  if (real) { real.done = !real.done; real.doneOn = real.done ? today() : null; save(); }
}

// Ajouter / modifier une étape : poids, date prévue, nom, cochée à la main, supprimer. `preset` = étape proposée à personnaliser.
function editMilestone(m, { last, target, keep, preset }) {
  const isNew = !m;
  const kg0 = m?.kg ?? preset?.kg ?? (last && target ? +((last.trend + target) / 2).toFixed(1) : '');
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${preset ? t('Personnaliser l\'étape') : isNew ? t('Nouvelle étape') : t('Étape')}</h3></div>
    <form>${group('', `<div class="cells">
      <label class="cell field"><span>${t('Poids (kg)')}</span><input name="kg" type="number" step="0.1" inputmode="decimal" required value="${kg0}"></label>
      <label class="cell field"><span>${t('Date estimée')}</span><input name="date" type="date" value="${m?.date || ''}"></label>
      <label class="cell field"><span>${t('Nom')}</span><input name="label" value="${esc(m?.label || preset?.label || '')}" placeholder="${t('Ex : mariage, vacances…')}"></label>
      ${isNew ? '' : `<div class="cell toggle-row"><span class="grow">${t('Atteinte (cocher à la main)')}</span><label class="switch"><input type="checkbox" name="done" ${m.done ? 'checked' : ''}><span></span></label></div>`}</div>`,
      t('La date estimée sert à voir si tu es en avance ou en retard. L\'étape se coche toute seule quand ta tendance l\'atteint.'))}
      <button class="btn filled large">${t('Enregistrer')}</button></form>
    ${isNew ? '' : group('', `<div class="cells"><div class="cell action destructive" data-a="del" role="button">${t('Supprimer')}</div></div>`)}`, keep);
  s.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    const kg = parseFloat(String(f.kg.value).replace(',', '.'));
    if (!(kg > 20 && kg < 400)) return toast(t('Poids invalide'));
    const v = { kg, date: f.date.value || null, label: f.label.value.trim() };
    if (isNew) (state.milestones ||= []).push({ id: uid(), ...v });
    else Object.assign(m, v, f.done ? { done: f.done.checked, doneOn: f.done.checked ? (m.doneOn || today()) : null } : {});
    save(); s.close();
  };
  s.querySelector('[data-a=del]')?.addEventListener('click', () => { state.milestones = state.milestones.filter((x) => x.id !== m.id); save(); s.close(); });
}

// Onglet Poids : pesée, courbe brute + tendance, fourchette cible, date d'arrivée, jalons.
import * as S from '../science.js';
import { state, save, today } from '../store.js';
import { current, observedKgPerWeek } from '../metrics.js';
import { fmt, fmtDate, lineChart, toast, nav, group } from '../ui.js';
import { icon } from '../icons.js';
import { t } from '../i18n.js';

let range = 90;

export function render(root, go) {
  const p = state.profile;
  const trend = S.emaTrend(state.weights);
  const last = trend[trend.length - 1];
  const since = Date.now() - range * 86400000;
  const shown = trend.filter((x) => S.parseDate(x.date) >= since);
  const ideal = p.height && p.sex ? S.idealRange(p) : null;
  const { targets } = current();
  const obs = observedKgPerWeek();
  const target = Number(p.targetWeight) || null;
  const speed = obs && target && Math.sign(target - (last?.trend ?? 0)) === Math.sign(obs) ? obs : targets?.weeklyChangeKg;
  const eta = last && target ? S.etaDate(last.trend, target, speed, today()) : null;
  const start = trend[0];
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
        <div class="seg" role="tablist">${[30, 90, 365].map((r) => `<button role="tab" aria-selected="${r === range}" data-r="${r}" class="${r === range ? 'on' : ''}">${r === 365 ? t('1 an') : t('{n} j', { n: r })}</button>`).join('')}</div>
        ${lineChart([
          { points: shown.map((x) => ({ x: S.parseDate(x.date), y: x.kg })), cls: 'raw', dots: true },
          { points: shown.map((x) => ({ x: S.parseDate(x.date), y: x.trend })), cls: 'trend' },
        ], { band: ideal ? { y1: ideal.bmiMin, y2: ideal.bmiMax } : null })}
      </div></div>`,
      t("Points : pesées brutes · ligne : tendance lissée (moyenne exponentielle). Les variations d'un jour à l'autre sont surtout de l'eau : regarde la tendance."))}
    ${ideal ? group(t('Poids de référence pour {h} cm', { h: fmt(p.height) }), `<div class="cells">
        <div class="cell"><div class="grow"><span class="t wrap">${t('Fourchette santé (IMC 18,5–24,9, OMS)')}</span></div><span class="val headline">${fmt(ideal.bmiMin, 1)} – ${fmt(ideal.bmiMax, 1)} kg</span></div>
        <form class="cell" data-f="target">${kgIn('t', t('Mon poids cible (kg)'), target)}<button class="btn">${t('Définir')}</button></form></div>`,
      t('Formules cliniques (Devine, Robinson, Hamwi) : {a} – {b} kg', { a: fmt(ideal.formulaMin, 1), b: fmt(ideal.formulaMax, 1) })
        + (ideal.reliable ? '' : t(' (peu fiables sous 152 cm)')) + '. ' + t("L'IMC ignore la masse musculaire : si tu es musclé, vise plutôt un % de masse grasse."))
    : `<div class="cta"><b class="headline">${t('Renseigne taille et sexe dans Profil')}</b><button class="btn filled" data-a="profile">${t('Profil')}</button></div>`}
    ${target && last ? group(t('Timeline'), `<ul class="cells timeline">
      <li class="cell"><div class="grow"><span class="t">${t('Arrivée estimée')}</span><span class="s">${eta ? (speed === obs ? t('vitesse réelle') : t('rythme prévu')) + ` · ${fmt(Math.abs(speed), 2)} ${t('kg/sem')}` : ''}</span></div>
        <span class="val headline">${eta ? fmtDate(eta, { day: 'numeric', month: 'short', year: 'numeric' }) : '–'}</span></li>
      ${eta ? S.milestones(start.kg, target, speed, today()).map((m) => {
        const reached = target < start.kg ? last.trend <= m.kg : last.trend >= m.kg;
        const d = S.etaDate(last.trend, m.kg, speed, today());
        return `<li class="cell ${reached ? 'done' : ''}"><span class="dot"></span><div class="grow"><span class="t num">${fmt(m.kg, 1)} kg</span><span class="s">${m.pct} %</span></div>
          <span class="val">${reached ? t('✓ atteint') : d ? fmtDate(d, { day: 'numeric', month: 'short', year: '2-digit' }) : '–'}</span></li>`; }).join('')
      : `<li class="cell"><span class="secondary footnote">${t("Pas d'estimation : la tendance va dans le mauvais sens ou le rythme est nul.")}</span></li>`}</ul>`,
      t('Projection indicative : la perte ralentit avec le temps (adaptation métabolique, Hall 2011). Recalculée à chaque pesée.')) : ''}
    ${group(t('Historique'), `<ul class="cells">${[...trend].reverse().slice(0, 30).map((x) => `<li class="cell"><div class="grow"><span class="t num">${fmt(x.kg, 1)} kg</span><span class="s">${fmtDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${t('tendance')} ${fmt(x.trend, 1)}</span></div>
      <button class="icon-btn" data-del="${x.date}" aria-label="${t('Supprimer')}">${icon('trash')}</button></li>`).join('') || `<li class="empty">${t('Aucune pesée.')}</li>`}</ul>`)}`;

  root.querySelector('[data-f=w]').onsubmit = (e) => {
    e.preventDefault();
    const kg = parseFloat(String(e.target.kg.value).replace(',', '.'));
    if (!(kg > 20 && kg < 400)) return toast(t('Poids invalide'));
    state.weights = state.weights.filter((w) => w.date !== today()).concat({ date: today(), kg });
    if (!state.profile.weight) state.profile.weight = kg;
    save(); toast(t('Pesée enregistrée')); render(root, go);
  };
  const tf = root.querySelector('[data-f=target]');
  if (tf) tf.onsubmit = (e) => {
    e.preventDefault();
    const v = parseFloat(String(e.target.t.value).replace(',', '.'));
    state.profile.targetWeight = v > 20 ? v : null;
    if (ideal && v < ideal.bmiMin) toast(t('Attention : sous la fourchette santé'));
    save(); render(root, go);
  };
  root.onclick = (e) => {
    const r = e.target.closest('[data-r]');
    if (r) { range = +r.dataset.r; return render(root, go); }
    const d = e.target.closest('[data-del]');
    if (d && confirm(t('Supprimer cette pesée ?'))) { state.weights = state.weights.filter((w) => w.date !== d.dataset.del); save(); render(root, go); }
    if (e.target.closest('[data-a=profile]')) go('profile');
  };
}

// Onglet Poids : pesée, courbe brute + tendance, fourchette cible, date d'arrivée, jalons.
import * as S from '../science.js';
import { state, save, today } from '../store.js';
import { current, observedKgPerWeek } from '../metrics.js';
import { esc, fmt, fmtDate, lineChart, toast } from '../ui.js';

let range = 90;

export function render(root, go) {
  const p = state.profile;
  const trend = S.emaTrend(state.weights);
  const last = trend[trend.length - 1];
  const since = Date.now() - range * 86400000;
  const shown = trend.filter((t) => S.parseDate(t.date) >= since);
  const ideal = p.height && p.sex ? S.idealRange(p) : null;
  const { targets } = current();
  const obs = observedKgPerWeek();
  const target = Number(p.targetWeight) || null;
  const speed = obs && target && Math.sign(target - (last?.trend ?? 0)) === Math.sign(obs) ? obs : targets?.weeklyChangeKg;
  const eta = last && target ? S.etaDate(last.trend, target, speed, today()) : null;
  const start = trend[0];

  root.innerHTML = `
    <header class="top"><h1>Poids</h1></header>
    <form class="card row" data-f="w">
      <input name="kg" type="number" step="0.1" inputmode="decimal" placeholder="Poids du jour (kg)" value="${state.weights.find((w) => w.date === today())?.kg ?? ''}" required>
      <button class="btn primary">Enregistrer</button></form>
    <section class="card">
      <div class="stats">
        <div><small>Tendance</small><b>${last ? fmt(last.trend, 1) : '–'} kg</b></div>
        <div><small>Vitesse</small><b>${obs !== null ? (obs > 0 ? '+' : '') + fmt(obs, 2) : '–'} kg/sem</b></div>
        <div><small>Objectif</small><b>${target ? fmt(target, 1) + ' kg' : '–'}</b></div>
      </div>
      <div class="seg">${[30, 90, 365].map((r) => `<button data-r="${r}" class="${r === range ? 'on' : ''}">${r === 365 ? '1 an' : r + ' j'}</button>`).join('')}</div>
      ${lineChart([
        { points: shown.map((t) => ({ x: S.parseDate(t.date), y: t.kg })), cls: 'raw', dots: true },
        { points: shown.map((t) => ({ x: S.parseDate(t.date), y: t.trend })), cls: 'trend' },
      ], { band: ideal ? { y1: ideal.bmiMin, y2: ideal.bmiMax } : null })}
      <p class="muted small">Points : pesées brutes · ligne : tendance lissée (moyenne exponentielle). Les variations d'un jour à l'autre sont surtout de l'eau : regarde la tendance.</p>
    </section>
    ${ideal ? `<section class="card">
      <b>Poids de référence pour ${fmt(p.height)} cm</b>
      <p>Fourchette santé (IMC 18,5–24,9, OMS) : <b>${fmt(ideal.bmiMin, 1)} – ${fmt(ideal.bmiMax, 1)} kg</b></p>
      <p class="muted small">Formules cliniques (Devine, Robinson, Hamwi) : ${fmt(ideal.formulaMin, 1)} – ${fmt(ideal.formulaMax, 1)} kg${ideal.reliable ? '' : ' (peu fiables sous 152 cm)'}. L'IMC ignore la masse musculaire : si tu es musclé, vise plutôt un % de masse grasse.</p>
      <form class="row" data-f="target"><input name="t" type="number" step="0.1" inputmode="decimal" placeholder="Mon poids cible (kg)" value="${target ?? ''}"><button class="btn">Définir</button></form>
    </section>` : '<div class="card cta"><b>Renseigne taille et sexe dans Profil</b><button class="btn" data-a="profile">Profil</button></div>'}
    ${target && last ? `<section class="card">
      <b>Timeline</b>
      <p>${eta ? `Arrivée estimée : <b>${fmtDate(eta, { day: 'numeric', month: 'long', year: 'numeric' })}</b> (à ${fmt(Math.abs(speed), 2)} kg/sem${speed === obs ? ', vitesse réelle' : ', rythme prévu'})` : 'Pas d\'estimation : la tendance va dans le mauvais sens ou le rythme est nul.'}</p>
      ${eta ? `<ol class="timeline">${S.milestones(start.kg, target, speed, today())
        .map((m) => { const reached = target < start.kg ? last.trend <= m.kg : last.trend >= m.kg;
          m.date = S.etaDate(last.trend, m.kg, speed, today());
          return `<li class="${reached ? 'done' : ''}"><b>${fmt(m.kg, 1)} kg</b> <span class="muted">${m.pct}%</span><span>${reached ? '✓ atteint' : m.date ? fmtDate(m.date, { day: 'numeric', month: 'short', year: '2-digit' }) : '–'}</span></li>`; }).join('')}</ol>` : ''}
      <p class="muted small">Projection indicative : la perte ralentit avec le temps (adaptation métabolique, Hall 2011). Recalculée à chaque pesée.</p>
    </section>` : ''}
    <section class="card"><b>Historique</b>
      <ul class="list">${[...trend].reverse().slice(0, 30).map((t) => `<li><div><b>${fmt(t.kg, 1)} kg</b><small>${fmtDate(t.date, { weekday: 'short', day: 'numeric', month: 'short' })} · tendance ${fmt(t.trend, 1)}</small></div><button class="icon del" data-del="${t.date}" aria-label="Supprimer">✕</button></li>`).join('') || '<li class="muted">Aucune pesée.</li>'}</ul>
    </section>`;

  root.querySelector('[data-f=w]').onsubmit = (e) => {
    e.preventDefault();
    const kg = parseFloat(String(e.target.kg.value).replace(',', '.'));
    if (!(kg > 20 && kg < 400)) return toast('Poids invalide');
    state.weights = state.weights.filter((w) => w.date !== today()).concat({ date: today(), kg });
    if (!state.profile.weight) state.profile.weight = kg;
    save(); toast('Pesée enregistrée'); render(root, go);
  };
  const tf = root.querySelector('[data-f=target]');
  if (tf) tf.onsubmit = (e) => {
    e.preventDefault();
    const t = parseFloat(String(e.target.t.value).replace(',', '.'));
    state.profile.targetWeight = t > 20 ? t : null;
    if (ideal && t < ideal.bmiMin) toast('Attention : sous la fourchette santé');
    save(); render(root, go);
  };
  root.onclick = (e) => {
    const r = e.target.closest('[data-r]');
    if (r) { range = +r.dataset.r; return render(root, go); }
    const d = e.target.closest('[data-del]');
    if (d && confirm('Supprimer cette pesée ?')) { state.weights = state.weights.filter((w) => w.date !== d.dataset.del); save(); render(root, go); }
    if (e.target.closest('[data-a=profile]')) go('profile');
  };
}

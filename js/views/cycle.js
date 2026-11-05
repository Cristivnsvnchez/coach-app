// Vue « cycle » : héros (phase du jour, prochaines ovulation / règles), calendrier mensuel filtrable, statistiques,
// effets sur le poids et la séance, alertes, saisie des règles / flux / symptômes. Méthode calendrier = estimation.
import * as C from '../cycle.js';
import { isoDate, parseDate } from '../science.js';
import { state, save, today } from '../store.js';
import { esc, fmtDate, nav, group, sheet, toast } from '../ui.js';
import { icon } from '../icons.js';
import { t, register, locale } from '../i18n.js';

register({
  en: {
    'Disponible pour les utilisatrices': 'Available for female users',
    'Le suivi du cycle est réservé aux profils féminins.': 'Cycle tracking is for female profiles only.',
    'Retour': 'Back',
    'Suivre mon cycle': 'Track my cycle',
    'Les données restent sur ton téléphone. Estimation par la méthode calendrier : ce n\'est pas une contraception.': 'Your data stays on your phone. Calendar-method estimate: this is not contraception.',
    'Début des dernières règles': 'First day of last period',
    'Durée du cycle (jours)': 'Cycle length (days)',
    'Durée des règles (jours)': 'Period length (days)',
    'Contraception hormonale': 'Hormonal contraception',
    'Activer le suivi': 'Turn on tracking',
    'Date invalide': 'Invalid date',
    'Suivi du cycle activé': 'Cycle tracking on',
    'Règles': 'Period', 'Fertile': 'Fertile', 'SPM': 'PMS', 'Tout': 'All',
    'Règles · jour {n}': 'Period · day {n}',
    'Phase folliculaire · jour {n}': 'Follicular phase · day {n}',
    'Phase ovulatoire · jour {n}': 'Ovulation window · day {n}',
    'Phase lutéale · jour {n}': 'Luteal phase · day {n}',
    'Cycle sous contraception · jour {n}': 'Cycle on contraception · day {n}',
    'Aujourd\'hui': 'Today',
    'Prochaine ovulation': 'Next ovulation',
    'Prochaines règles': 'Next period',
    'dans {n} j': 'in {n} d',
    'Cycle': 'Cycle',
    'Durée moyenne du cycle': 'Average cycle length',
    'Durée moyenne des règles': 'Average period length',
    '{n} j': '{n} d',
    'Effets cette semaine': 'Effects this week',
    'Poids : rétention d\'eau probable (~+0,5 kg), sans lien avec la masse grasse. (Kanellakis 2023)': 'Weight: water retention likely (~+0.5 kg), unrelated to body fat. (Kanellakis 2023)',
    'Séance : écoute tes sensations, adapte charge et volume si besoin. (McNulty 2020)': 'Workout: listen to your body and adjust load and volume if needed. (McNulty 2020)',
    'Rien de particulier prévu cette semaine.': 'Nothing in particular expected this week.',
    'Cycles irréguliers (moins de 21 ou plus de 35 jours en moyenne) : parles-en à un professionnel de santé.': 'Irregular cycles (average under 21 or over 35 days): talk to a healthcare professional.',
    'Plus de 90 jours sans règles : consulte un professionnel de santé.': 'Over 90 days without a period: see a healthcare professional.',
    'Noter mes règles': 'Log my period',
    'Estimation par la méthode calendrier : ce n\'est pas une contraception.': 'Calendar-method estimate: this is not contraception.',
    'Début des règles': 'Period start',
    'Fin des règles': 'Period end',
    'Jour concerné': 'Day',
    'Flux': 'Flow', 'Spotting': 'Spotting', 'Léger': 'Light', 'Moyen': 'Medium', 'Abondant': 'Heavy',
    'Symptômes': 'Symptoms',
    'Enregistrer': 'Save',
    'Règles enregistrées': 'Period saved',
    'Mois précédent': 'Previous month', 'Mois suivant': 'Next month',
    'Crampes': 'Cramps', 'Fatigue': 'Fatigue', 'Ballonnements': 'Bloating', 'Maux de tête': 'Headache', 'Humeur basse': 'Low mood',
    'Seins sensibles': 'Breast tenderness', 'Fringales': 'Cravings', 'Sommeil perturbé': 'Poor sleep', 'Acné': 'Acne',
    'Annuler': 'Cancel',
    'prédit': 'predicted', 'réel': 'logged',
    'Désactiver le suivi': 'Turn off tracking',
    'Cycle ±{n} j': '±{n} d',
  },
  nl: {
    'Disponible pour les utilisatrices': 'Beschikbaar voor vrouwelijke gebruikers',
    'Le suivi du cycle est réservé aux profils féminins.': 'Cyclusregistratie is alleen voor vrouwelijke profielen.',
    'Retour': 'Terug',
    'Suivre mon cycle': 'Mijn cyclus volgen',
    'Les données restent sur ton téléphone. Estimation par la méthode calendrier : ce n\'est pas une contraception.': 'Je gegevens blijven op je telefoon. Schatting via de kalendermethode: dit is geen anticonceptie.',
    'Début des dernières règles': 'Eerste dag van je laatste menstruatie',
    'Durée du cycle (jours)': 'Cycluslengte (dagen)',
    'Durée des règles (jours)': 'Duur menstruatie (dagen)',
    'Contraception hormonale': 'Hormonale anticonceptie',
    'Activer le suivi': 'Registratie inschakelen',
    'Date invalide': 'Ongeldige datum',
    'Suivi du cycle activé': 'Cyclusregistratie aan',
    'Règles': 'Menstruatie', 'Fertile': 'Vruchtbaar', 'SPM': 'PMS', 'Tout': 'Alles',
    'Règles · jour {n}': 'Menstruatie · dag {n}',
    'Phase folliculaire · jour {n}': 'Folliculaire fase · dag {n}',
    'Phase ovulatoire · jour {n}': 'Ovulatievenster · dag {n}',
    'Phase lutéale · jour {n}': 'Luteale fase · dag {n}',
    'Cycle sous contraception · jour {n}': 'Cyclus met anticonceptie · dag {n}',
    'Aujourd\'hui': 'Vandaag',
    'Prochaine ovulation': 'Volgende ovulatie',
    'Prochaines règles': 'Volgende menstruatie',
    'dans {n} j': 'over {n} d',
    'Cycle': 'Cyclus',
    'Durée moyenne du cycle': 'Gemiddelde cycluslengte',
    'Durée moyenne des règles': 'Gemiddelde duur menstruatie',
    '{n} j': '{n} d',
    'Effets cette semaine': 'Effecten deze week',
    'Poids : rétention d\'eau probable (~+0,5 kg), sans lien avec la masse grasse. (Kanellakis 2023)': 'Gewicht: waarschijnlijk vochtretentie (~+0,5 kg), los van vetmassa. (Kanellakis 2023)',
    'Séance : écoute tes sensations, adapte charge et volume si besoin. (McNulty 2020)': 'Training: luister naar je lichaam en pas gewicht en volume aan indien nodig. (McNulty 2020)',
    'Rien de particulier prévu cette semaine.': 'Niets bijzonders verwacht deze week.',
    'Cycles irréguliers (moins de 21 ou plus de 35 jours en moyenne) : parles-en à un professionnel de santé.': 'Onregelmatige cycli (gemiddeld minder dan 21 of meer dan 35 dagen): bespreek dit met een zorgverlener.',
    'Plus de 90 jours sans règles : consulte un professionnel de santé.': 'Meer dan 90 dagen zonder menstruatie: raadpleeg een zorgverlener.',
    'Noter mes règles': 'Menstruatie noteren',
    'Estimation par la méthode calendrier : ce n\'est pas une contraception.': 'Schatting via de kalendermethode: dit is geen anticonceptie.',
    'Début des règles': 'Begin menstruatie',
    'Fin des règles': 'Einde menstruatie',
    'Jour concerné': 'Dag',
    'Flux': 'Bloeding', 'Spotting': 'Spotting', 'Léger': 'Licht', 'Moyen': 'Matig', 'Abondant': 'Hevig',
    'Symptômes': 'Symptomen',
    'Enregistrer': 'Opslaan',
    'Règles enregistrées': 'Menstruatie opgeslagen',
    'Mois précédent': 'Vorige maand', 'Mois suivant': 'Volgende maand',
    'Crampes': 'Krampen', 'Fatigue': 'Vermoeidheid', 'Ballonnements': 'Opgeblazen gevoel', 'Maux de tête': 'Hoofdpijn', 'Humeur basse': 'Sombere stemming',
    'Seins sensibles': 'Gevoelige borsten', 'Fringales': 'Trek', 'Sommeil perturbé': 'Slecht slapen', 'Acné': 'Acne',
    'Annuler': 'Annuleren',
    'prédit': 'voorspeld', 'réel': 'genoteerd',
    'Désactiver le suivi': 'Registratie uitschakelen',
    'Cycle ±{n} j': '±{n} d',
  },
});

const DAY = 86400000;
const addDays = (iso, n) => isoDate(new Date(parseDate(iso).getTime() + n * DAY));
const diff = (a, b) => Math.round((parseDate(b) - parseDate(a)) / DAY);
const FLOW_LABEL = { spotting: 'Spotting', light: 'Léger', medium: 'Moyen', heavy: 'Abondant' };
const PHASE_KEY = { menstruelle: 'Règles · jour {n}', folliculaire: 'Phase folliculaire · jour {n}', ovulatoire: 'Phase ovulatoire · jour {n}', 'lutéale': 'Phase lutéale · jour {n}', hormonale: 'Cycle sous contraception · jour {n}' };

let month = null; // 'YYYY-MM' affiché
let filter = 'all';

// Jours de règles réellement saisis (début → fin ou durée moyenne).
function loggedPeriodDays(c) {
  const set = new Set();
  const P = C.avgPeriodLen(c);
  for (const p of c.periods || []) {
    if (!p.start) continue;
    const n = (p.end ? diff(p.start, p.end) + 1 : P);
    for (let i = 0; i < Math.max(1, Math.min(n, 12)); i++) set.add(addDays(p.start, i));
  }
  return set;
}

export function render(root, go) {
  const c = state.cycle;
  if (state.profile?.sex !== 'F') {
    root.innerHTML = `${nav(t('Cycle'))}<div class="cy-empty"><p class="cy-lead">${t('Disponible pour les utilisatrices')}</p>
      <p class="footnote secondary">${t('Le suivi du cycle est réservé aux profils féminins.')}</p>
      <button class="btn large" data-a="back">${t('Retour')}</button></div>`;
    root.onclick = (e) => { if (e.target.closest('[data-a=back]')) go('today'); };
    return;
  }
  if (!c.enabled) return renderOnboarding(root, go);

  const td = today();
  const ph = C.phaseOn(c, td);
  const logged = loggedPeriodDays(c);
  if (!month) month = td.slice(0, 7);
  const keep = () => { const y = root.scrollTop; render(root, go); root.scrollTop = y; };

  // Héros
  const nextP = C.nextStarts(c, td, 1)[0];
  const sd = C.cycleSd(c);
  const ov = C.nextOvulation(c, td);
  const heroTitle = ph ? t(PHASE_KEY[ph.phase], { n: ph.day }) : t('Cycle');
  const until = (d) => t('dans {n} j', { n: diff(td, d) });
  const hero = `<section class="cy-hero" aria-label="${t('Cycle')}">
    <p class="cy-hero-k">${t('Aujourd\'hui')}</p>
    <h2 class="cy-hero-t">${esc(heroTitle)}</h2>
    <div class="cy-hero-rows">
      ${ov ? `<div><small>${t('Prochaine ovulation')}</small><b>${fmtDate(ov)}</b><span>${until(ov)}</span></div>` : ''}
      ${nextP ? `<div><small>${t('Prochaines règles')}</small><b>${fmtDate(nextP)}${sd ? ` <i>${t('Cycle ±{n} j', { n: sd })}</i>` : ''}</b><span>${until(nextP)}</span></div>` : ''}
    </div></section>`;

  // Calendrier du mois, lundi → dimanche
  const [Y, M] = month.split('-').map(Number);
  const first = `${month}-01`;
  const lead = (parseDate(first).getDay() + 6) % 7;
  const nDays = new Date(Y, M, 0).getDate();
  const label = new Date(Y, M - 1, 1).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
  const wk = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'narrow' }));
  let cells = '<span></span>'.repeat(lead);
  for (let d = 1; d <= nDays; d++) {
    const iso = `${month}-${String(d).padStart(2, '0')}`;
    const p = C.phaseOn(c, iso);
    const isReal = logged.has(iso);
    let kind = '', pred = false;
    if (isReal) kind = 'period';
    else if (p?.isPeriod) { kind = 'period'; pred = true; }
    else if (p?.fertile) { kind = 'fertile'; pred = p.predicted || iso > td; }
    else if (p?.pms) { kind = 'pms'; pred = p.predicted || iso > td; }
    if (kind && p && p.predicted && kind !== 'period') pred = true;
    const dim = filter !== 'all' && kind !== filter ? ' dim' : '';
    const has = c.logs?.[iso] ? ' has-log' : '';
    const nm = kind ? `, ${t({ period: 'Règles', fertile: 'Fertile', pms: 'SPM' }[kind])}${pred ? ' (' + t('prédit') + ')' : ''}` : '';
    cells += `<button class="cy-day ${kind ? 'k-' + kind : ''}${pred ? ' pred' : ''}${dim}${has}${iso === td ? ' today' : ''}" data-day="${iso}" aria-label="${fmtDate(iso, { day: 'numeric', month: 'long' })}${nm}">${d}</button>`;
  }
  const FILTERS = [['period', 'Règles'], ['fertile', 'Fertile'], ['pms', 'SPM'], ['all', 'Tout']].filter(([k]) => !(c.hormonal && k === 'fertile'));
  const calendar = `<section class="cy-card">
    <div class="cy-monthbar"><button class="icon-btn" data-m="-1" aria-label="${t('Mois précédent')}">${icon('chevronLeft')}</button>
      <b class="cy-month">${esc(label)}</b>
      <button class="icon-btn" data-m="1" aria-label="${t('Mois suivant')}">${icon('chevronRight')}</button></div>
    <div class="cy-chips">${FILTERS.map(([k, l]) => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${k}">${t(l)}</button>`).join('')}</div>
    <div class="cy-grid" role="grid"><div class="cy-wk">${wk.map((w) => `<span>${esc(w)}</span>`).join('')}</div>
      <div class="cy-days">${cells}</div></div></section>`;

  const tiles = `<div class="cy-tiles"><div><small>${t('Durée moyenne du cycle')}</small><b>${t('{n} j', { n: C.avgCycleLen(c) })}</b></div>
    <div><small>${t('Durée moyenne des règles')}</small><b>${t('{n} j', { n: C.avgPeriodLen(c) })}</b></div></div>`;

  // Effets de la semaine
  let wNote = null, tNote = C.trainingNote(c, td);
  for (let i = 0; i < 7; i++) {
    const d = addDays(td, i);
    wNote = wNote || C.weightNote(c, d);
    if (!tNote && i > 0) tNote = C.trainingNote(c, d) === 'listen' ? 'listen' : null;
  }
  const effects = [wNote === 'retention' ? `<li class="cy-fx"><span class="cy-dot"></span>${t('Poids : rétention d\'eau probable (~+0,5 kg), sans lien avec la masse grasse. (Kanellakis 2023)')}</li>` : '',
    tNote ? `<li class="cy-fx"><span class="cy-dot"></span>${t('Séance : écoute tes sensations, adapte charge et volume si besoin. (McNulty 2020)')}</li>` : ''].join('');
  const fxHtml = `<section class="cy-card"><h3 class="cy-h">${t('Effets cette semaine')}</h3>
    <ul class="cy-fxs">${effects || `<li class="footnote secondary">${t('Rien de particulier prévu cette semaine.')}</li>`}</ul></section>`;

  const AL = { irregular: 'Cycles irréguliers (moins de 21 ou plus de 35 jours en moyenne) : parles-en à un professionnel de santé.', amenorrhea: 'Plus de 90 jours sans règles : consulte un professionnel de santé.' };
  const alertsHtml = C.alerts(c, td).map((a) => `<p class="cy-alert" role="alert">${t(AL[a])}</p>`).join('');

  root.innerHTML = `${nav(t('Cycle'), { left: `<button class="btn plain" data-a="back">${icon('chevronLeft')} ${t('Retour')}</button>` })}
    <div class="cy">${hero}${alertsHtml}${calendar}${tiles}${fxHtml}
      <button class="btn filled large" data-a="log">${t('Noter mes règles')}</button>
      <p class="group-foot center">${t('Estimation par la méthode calendrier : ce n\'est pas une contraception.')}</p>
      <button class="btn plain destructive cy-off" data-a="off">${t('Désactiver le suivi')}</button></div>`;

  root.onclick = (e) => {
    const m = e.target.closest('[data-m]');
    if (m) { month = isoDate(new Date(Y, M - 1 + +m.dataset.m, 1)).slice(0, 7); return keep(); }
    const f = e.target.closest('[data-f]');
    if (f) { filter = f.dataset.f; return keep(); }
    const d = e.target.closest('[data-day]');
    if (d) return openLog(d.dataset.day, keep);
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'back') return go('today');
    if (a === 'log') return openLog(td, keep);
    if (a === 'off' && confirm(t('Désactiver le suivi') + ' ?')) { c.enabled = false; save(); keep(); }
  };
}

// Écran d'activation : dernières règles, durées, contraception hormonale.
function renderOnboarding(root, go) {
  const c = state.cycle;
  root.innerHTML = `${nav(t('Suivre mon cycle'), { left: `<button class="btn plain" data-a="back">${icon('chevronLeft')} ${t('Retour')}</button>` })}
    <div class="cy"><form>${group('', `<div class="cells">
      <label class="cell field"><span>${t('Début des dernières règles')}</span><input name="last" type="date" max="${today()}" required value="${c.periods?.slice(-1)[0]?.start || ''}"></label>
      <label class="cell field"><span>${t('Durée du cycle (jours)')}</span><input name="cl" type="number" inputmode="numeric" min="18" max="45" value="${c.cycleLen || 28}"></label>
      <label class="cell field"><span>${t('Durée des règles (jours)')}</span><input name="pl" type="number" inputmode="numeric" min="1" max="12" value="${c.periodLen || 5}"></label>
      <div class="cell toggle-row"><span class="grow">${t('Contraception hormonale')}</span><label class="switch"><input type="checkbox" name="hor" ${c.hormonal ? 'checked' : ''}><span></span></label></div></div>`,
      t('Les données restent sur ton téléphone. Estimation par la méthode calendrier : ce n\'est pas une contraception.'))}
      <button class="btn filled large">${t('Activer le suivi')}</button></form></div>`;
  root.onclick = (e) => { if (e.target.closest('[data-a=back]')) go('today'); };
  root.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target, last = f.last.value;
    if (!last || last > today()) return toast(t('Date invalide'));
    c.cycleLen = Math.min(45, Math.max(18, +f.cl.value || 28));
    c.periodLen = Math.min(12, Math.max(1, +f.pl.value || 5));
    c.hormonal = f.hor.checked;
    c.periods = (c.periods || []).filter((p) => p.start !== last).concat({ start: last }).sort((a, b) => a.start.localeCompare(b.start));
    c.enabled = true; save(); toast(t('Suivi du cycle activé')); render(root, go);
  };
}

// Feuille de saisie : début / fin des règles, flux et symptômes du jour choisi.
function openLog(day, done) {
  const c = state.cycle;
  const log = c.logs?.[day] || {};
  const cur = (c.periods || []).find((p) => p.start <= day && (p.end ? p.end >= day : diff(p.start, day) < C.avgPeriodLen(c)));
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Noter mes règles')}</h3></div>
    <form>${group('', `<div class="cells">
      <label class="cell field"><span>${t('Début des règles')}</span><input name="start" type="date" max="${today()}" value="${cur?.start || ''}"></label>
      <label class="cell field"><span>${t('Fin des règles')}</span><input name="end" type="date" max="${today()}" value="${cur?.end || ''}"></label>
      <label class="cell field"><span>${t('Jour concerné')}</span><input name="day" type="date" max="${today()}" required value="${day > today() ? today() : day}"></label></div>`)}
      ${group(t('Flux'), `<div class="cy-chips wrap">${Object.entries(FLOW_LABEL).map(([k, l]) => `<label class="chip ${log.flow === k ? 'on' : ''}"><input type="radio" name="flow" value="${k}" ${log.flow === k ? 'checked' : ''} hidden>${t(l)}</label>`).join('')}</div>`)}
      ${group(t('Symptômes'), `<div class="cy-chips wrap">${C.SYMPTOMS.map((x) => `<label class="chip ${(log.symptoms || []).includes(x) ? 'on' : ''}"><input type="checkbox" name="sym" value="${esc(x)}" ${(log.symptoms || []).includes(x) ? 'checked' : ''} hidden>${t(x)}</label>`).join('')}</div>`)}
      <button class="btn filled large">${t('Enregistrer')}</button>
      <p class="group-foot center">${t('Estimation par la méthode calendrier : ce n\'est pas une contraception.')}</p></form>`, done);
  // Pastilles : état visuel suivant la case/radio cachée (un radio peut être décoché en retouchant).
  s.addEventListener('click', (e) => {
    const chip = e.target.closest('label.chip'); if (!chip) return;
    const inp = chip.querySelector('input');
    e.preventDefault();
    if (inp.type === 'radio') { const was = inp.checked; s.querySelectorAll('input[name=flow]').forEach((r) => { r.checked = false; r.closest('.chip').classList.remove('on'); }); inp.checked = !was; }
    else inp.checked = !inp.checked;
    chip.classList.toggle('on', inp.checked);
  });
  s.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target, start = f.start.value, end = f.end.value, d = f.day.value;
    if (!d || d > today() || (start && start > today()) || (end && start && end < start)) return toast(t('Date invalide'));
    if (start) {
      const p = (c.periods ||= []).find((x) => x.start === start);
      if (p) { if (end) p.end = end; else delete p.end; } else c.periods.push(end ? { start, end } : { start });
      c.periods.sort((a, b) => a.start.localeCompare(b.start));
    }
    const flow = f.querySelector('[name=flow]:checked')?.value || null;
    const symptoms = [...f.querySelectorAll('[name=sym]:checked')].map((x) => x.value);
    (c.logs ||= {});
    if (flow || symptoms.length) c.logs[d] = { ...(flow ? { flow } : {}), symptoms }; else delete c.logs[d];
    save(); s.close(); toast(t('Règles enregistrées'));
  };
}

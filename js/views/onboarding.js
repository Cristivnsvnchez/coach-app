// Onboarding : accueil, puis une question par écran, surtout par sélection (cartes, pastilles, stepper).
// Remplit le profil, active le suivi du cycle si l'utilisatrice le souhaite, montre les besoins calculés.
import * as S from '../science.js';
import { state, save, today } from '../store.js';
import { esc, fmt } from '../ui.js';
import { icon } from '../icons.js';
import { t, getLang, setLang } from '../i18n.js';

const p = () => state.profile;

// Chaque étape : { id, title, why?, body(), valid?(), skip?() } — `skip` masque l'étape (ex. cycle pour un homme).
const STEPS = [
  { id: 'lang', title: () => t('Choisis ta langue'), body: () => choice('lang', { fr: 'Français', en: 'English' }, getLang()) },
  { id: 'sex', title: () => t('Tu es…'), why: () => t('Sert au calcul de ta dépense énergétique (Mifflin-St Jeor).'),
    body: () => choice('sex', { F: t('Une femme'), M: t('Un homme') }, p().sex), valid: () => !!p().sex },
  { id: 'body', title: () => t('Tes mesures'), why: () => t('Pour calculer tes besoins. Tu pourras les changer à tout moment.'),
    body: () => stepper('age', t('Âge'), p().age ?? 30, 14, 99, 1, t('ans')) + stepper('height', t('Taille'), p().height ?? 170, 120, 230, 1, 'cm') + stepper('weight', t('Poids'), p().weight ?? 70, 30, 300, 0.5, 'kg'),
    valid: () => p().age >= 14 && p().height > 0 && p().weight > 0 },
  { id: 'goal', title: () => t('Ton objectif principal'), body: () => choice('goal', Object.fromEntries(Object.entries(S.GOALS).map(([k, g]) => [k, t(g.label)])), p().goal), valid: () => !!p().goal },
  { id: 'target', title: () => t('Ton poids cible'), why: () => t('Optionnel : il sert à estimer ta date d\'arrivée et tes étapes.'), skip: () => p().goal === 'maintien',
    body: () => stepper('targetWeight', t('Poids cible'), p().targetWeight ?? Math.round((p().weight || 70) * (p().goal === 'prise' ? 1.05 : 0.92)), 30, 300, 0.5, 'kg')
      + (S.GOALS[p().goal]?.rates.length > 1 ? `<p class="onb-label">${t('Rythme')}</p>` + choice('rate', Object.fromEntries(S.GOALS[p().goal].rates.map((r) => [r, `${String(r).replace('.', ',')} % ${t('par semaine')}`])), p().rate ?? S.GOALS[p().goal].rates[1]) : '') },
  { id: 'activity', title: () => t('Ton activité au quotidien'), body: () => choice('activity', Object.fromEntries(Object.entries(S.PAL).map(([k, v]) => [k, t(v.label)])), p().activity), valid: () => !!p().activity },
  { id: 'training', title: () => t('Ton entraînement'), why: () => t('Pour te proposer un programme qui tient dans ta semaine.'),
    body: () => stepper('sessions', t('Séances par semaine'), p().sessions ?? 3, 1, 7, 1, '')
      + `<p class="onb-label">${t('Matériel')}</p>` + choice('equipment', { salle: t('Salle complète'), maison: t('Haltères à la maison'), aucun: t('Poids du corps') }, p().equipment || 'salle') },
  { id: 'diet', title: () => t('Ton alimentation'), why: () => t('Le coach en tient compte dans ses recettes.'),
    body: () => chips('diet', ['Végétarien', 'Vegan', 'Halal', 'Sans gluten', 'Sans lactose', 'Pescétarien', 'Sans porc'], (p().diet || '').split(', ').filter(Boolean)) },
  { id: 'cycle', title: () => t('Suivi de ton cycle'), skip: () => p().sex !== 'F',
    why: () => t('Optionnel. Il aide à lire tes variations de poids (rétention d\'eau) et à adapter tes séances selon tes sensations. Tes données restent sur ton téléphone.'),
    body: () => choice('cycleOn', { yes: t('Oui, activer le suivi'), no: t('Non merci') }, state.cycle?.enabled ? 'yes' : state.cycle?.enabled === false ? 'no' : null)
      + (state.cycle?.enabled ? `<label class="onb-field"><span>${t('Début de tes dernières règles')}</span><input type="date" name="lastStart" max="${today()}" value="${state.cycle.periods?.[0]?.start || ''}"></label>`
        + stepper('cycleLen', t('Durée habituelle du cycle'), state.cycle.cycleLen ?? 28, 18, 45, 1, t('jours'))
        + stepper('periodLen', t('Durée des règles'), state.cycle.periodLen ?? 5, 2, 10, 1, t('jours'))
        + `<p class="onb-label">${t('Contraception hormonale (pilule, stérilet hormonal, implant…)')}</p>` + choice('hormonal', { no: t('Non'), yes: t('Oui') }, state.cycle.hormonal ? 'yes' : 'no') : '') },
  { id: 'done', title: () => t('C\'est prêt'), body: summary },
];

function choice(name, opts, sel) {
  return `<div class="onb-choices" role="radiogroup">${Object.entries(opts).map(([k, l]) => `<button type="button" role="radio" aria-checked="${String(k) === String(sel)}" class="onb-choice ${String(k) === String(sel) ? 'on' : ''}" data-set="${name}" data-v="${esc(k)}"><span>${esc(l)}</span>${String(k) === String(sel) ? icon('check') : ''}</button>`).join('')}</div>`;
}
function chips(name, opts, sel) {
  return `<div class="onb-chips">${opts.map((o) => `<button type="button" class="chip ${sel.includes(o) ? 'on' : ''}" data-chip="${name}" data-v="${esc(o)}" aria-pressed="${sel.includes(o)}">${esc(t(o))}</button>`).join('')}</div>`;
}
function stepper(name, label, val, min, max, step, unit) {
  return `<div class="onb-stepper" data-name="${name}" data-min="${min}" data-max="${max}" data-step="${step}"><span class="onb-step-label">${label}</span>
    <div class="onb-step-row"><button type="button" class="icon-btn round" data-step-dir="-1" aria-label="−">${icon('minus')}</button>
      <input class="onb-num num" name="${name}" type="number" inputmode="decimal" step="${step}" min="${min}" max="${max}" value="${val}" aria-label="${label}"><span class="onb-unit">${unit}</span>
      <button type="button" class="icon-btn round" data-step-dir="1" aria-label="+">${icon('plus')}</button></div></div>`;
}
function summary() {
  const prof = { ...p() };
  const tg = S.isProfileComplete(prof) ? S.targets(prof, S.tdeeInitial(prof)) : null;
  if (!tg) return `<p class="secondary">${t('Complète les étapes précédentes pour voir tes besoins.')}</p>`;
  return `<div class="onb-hero"><p class="onb-hero-t">${t('{k} kcal par jour', { k: `<b class="num">${fmt(tg.kcal)}</b>` })}</p>
      <div class="onb-tiles"><div><b class="num">${fmt(tg.protein)} g</b><span>${t('Protéines')}</span></div><div><b class="num">${fmt(tg.carbs)} g</b><span>${t('Glucides')}</span></div><div><b class="num">${fmt(tg.fat)} g</b><span>${t('Lipides')}</span></div></div></div>
    <p class="secondary onb-note">${t('Calculé avec Mifflin-St Jeor et ton activité. Après 10 jours de saisie, la dépense s\'ajuste à tes vrais résultats. Tu peux modifier ces objectifs dans Profil.')}</p>`;
}

export function needsOnboarding() { return !state.onboarded && !S.isProfileComplete(state.profile); }

export function openOnboarding(done) {
  let i = -1; // -1 = écran d'accueil
  const el = document.createElement('div');
  el.className = 'onb';
  document.body.appendChild(el);
  const steps = () => STEPS.filter((s) => !s.skip?.());

  const draw = () => {
    if (i < 0) {
      el.innerHTML = `<div class="onb-welcome"><div class="onb-glow" aria-hidden="true"></div>
        <div class="onb-welcome-text"><h1>${t('Ton coach sport et nutrition')}</h1><p>${t('Calories, poids, séances et conseils sourcés, dans une seule app qui reste sur ton téléphone. 2 minutes pour démarrer.')}</p></div>
        <button class="btn filled large" data-a="start">${t('Commencer')}</button>
        <button class="btn plain wide" data-a="skip">${t('Passer, je remplirai plus tard')}</button></div>`;
      return;
    }
    const list = steps(), st = list[i];
    el.innerHTML = `<div class="onb-top"><button class="icon-btn" data-a="back" aria-label="${t('Retour')}">${icon('chevronLeft')}</button>
        <div class="onb-progress" role="progressbar" aria-valuenow="${i + 1}" aria-valuemax="${list.length}"><i style="width:${((i + 1) / list.length) * 100}%"></i></div>
        <button class="btn plain" data-a="skip">${t('Passer')}</button></div>
      <div class="onb-body"><h2>${st.title()}</h2>${st.why ? `<p class="onb-why">${st.why()}</p>` : ''}<div class="onb-content">${st.body()}</div></div>
      <div class="onb-foot"><button class="btn filled large" data-a="next">${st.id === 'done' ? t('Aller à mon tableau de bord') : t('Continuer')}</button></div>`;
  };

  const readInputs = () => {
    el.querySelectorAll('.onb-num').forEach((inp) => {
      const v = parseFloat(String(inp.value).replace(',', '.'));
      if (!Number.isFinite(v)) return;
      if (['cycleLen', 'periodLen'].includes(inp.name)) { if (state.cycle) state.cycle[inp.name] = v; }
      else p()[inp.name] = v;
    });
    const ls = el.querySelector('[name=lastStart]');
    if (ls && state.cycle) state.cycle.periods = ls.value ? [{ start: ls.value }] : [];
  };

  const finish = () => {
    readInputs();
    state.onboarded = true;
    if (p().weight && !state.weights.length) state.weights.push({ date: today(), kg: p().weight });
    save(); el.classList.add('out');
    setTimeout(() => { el.remove(); done(); }, 250);
  };

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a],[data-set],[data-chip],[data-step-dir]');
    if (!b) return;
    if (b.dataset.stepDir) {
      const box = b.closest('.onb-stepper'), inp = box.querySelector('input');
      const v = Math.min(+box.dataset.max, Math.max(+box.dataset.min, (+inp.value || 0) + (+b.dataset.stepDir) * (+box.dataset.step)));
      inp.value = +v.toFixed(1); navigator.vibrate?.(5); return;
    }
    if (b.dataset.set) {
      readInputs();
      const k = b.dataset.set, v = b.dataset.v;
      if (k === 'lang') { setLang(v); }
      else if (k === 'cycleOn') { state.cycle = { ...(state.cycle || {}), enabled: v === 'yes' }; }
      else if (k === 'hormonal') { state.cycle.hormonal = v === 'yes'; }
      else if (k === 'rate') p().rate = +v;
      else if (k === 'goal') { p().goal = v; p().rate = S.GOALS[v].rates[Math.min(1, S.GOALS[v].rates.length - 1)]; }
      else p()[k] = v;
      return draw();
    }
    if (b.dataset.chip) {
      const cur = (p().diet || '').split(', ').filter(Boolean);
      p().diet = (cur.includes(b.dataset.v) ? cur.filter((x) => x !== b.dataset.v) : [...cur, b.dataset.v]).join(', ');
      return draw();
    }
    const a = b.dataset.a;
    if (a === 'start') { i = 0; return draw(); }
    if (a === 'skip') return finish();
    if (a === 'back') { readInputs(); i = Math.max(-1, i - 1); return draw(); }
    if (a === 'next') {
      readInputs();
      const list = steps(), st = list[i];
      if (st.valid && !st.valid()) { el.querySelector('.onb-content').classList.add('shake'); setTimeout(() => el.querySelector('.onb-content')?.classList.remove('shake'), 400); return; }
      if (st.id === 'done') return finish();
      i = Math.min(steps().length - 1, i + 1); draw();
    }
  });
  draw();
}

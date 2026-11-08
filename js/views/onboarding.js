// Onboarding : accueil, puis une question par écran, surtout par sélection (cartes, pastilles, stepper).
// Remplit le profil, active le suivi du cycle si l'utilisatrice le souhaite, montre les besoins calculés.
import * as S from '../science.js';
import { state, save, today, replace } from '../store.js';
import { esc, fmt, toast } from '../ui.js';
import { icon } from '../icons.js';
import { t, getLang, setLang, register, LANGS } from '../i18n.js';
import { shape, wordmark } from '../theme.js';
import { exportBackup } from '../install.js';

register({
  en: { 'Ton corps, tes chiffres, ton rythme.': 'Your body, your numbers, your rhythm.', "J'ai déjà mes données": 'I already have my data',
    'Tes calories': 'Your calories', 'Proposition : {k} kcal': 'Suggested: {k} kcal', 'Revenir à la proposition': 'Back to the suggestion',
    'Modifiable par pas de 50 kcal. Les macros se recalculent.': 'Adjust in steps of 50 kcal. Macros are recalculated.',
    'Baisser de 50 kcal': 'Lower by 50 kcal', 'Monter de 50 kcal': 'Raise by 50 kcal', 'Étape {i} sur {n}': 'Step {i} of {n}',
    'Protège tes données': 'Protect your data', "Tes données restent sur ton iPhone. Une copie dans iCloud Drive te protège si tu changes de téléphone ou supprimes l'app.": 'Your data stays on your iPhone. A copy in iCloud Drive protects you if you change phones or delete the app.',
    "Sur ton iPhone uniquement : personne d'autre ne les voit.": 'On your iPhone only: nobody else sees it.', 'Touche « Sauvegarder », puis « Enregistrer dans Fichiers » → iCloud Drive.': 'Tap "Back up", then "Save to Files" → iCloud Drive.',
    'TrackMe te rappelle de refaire une copie.': 'TrackMe reminds you to make a new copy.', 'Sauvegardé · refaire une copie': 'Backed up · make a new copy', 'Sauvegarder dans iCloud Drive': 'Back up to iCloud Drive',
    'Me le rappeler': 'Remind me', 'Chaque semaine': 'Every week', 'Chaque mois': 'Every month', 'Jamais': 'Never' },
  nl: { 'Ton corps, tes chiffres, ton rythme.': 'Jouw lichaam, jouw cijfers, jouw ritme.', "J'ai déjà mes données": 'Ik heb al gegevens',
    'Tes calories': 'Jouw calorieën', 'Proposition : {k} kcal': 'Voorstel: {k} kcal', 'Revenir à la proposition': 'Terug naar het voorstel',
    'Modifiable par pas de 50 kcal. Les macros se recalculent.': "Aanpasbaar in stappen van 50 kcal. De macro's worden herberekend.",
    'Baisser de 50 kcal': '50 kcal minder', 'Monter de 50 kcal': '50 kcal meer', 'Étape {i} sur {n}': 'Stap {i} van {n}',
    'Protège tes données': 'Bescherm je gegevens', "Tes données restent sur ton iPhone. Une copie dans iCloud Drive te protège si tu changes de téléphone ou supprimes l'app.": 'Je gegevens blijven op je iPhone. Een kopie in iCloud Drive beschermt je als je van telefoon wisselt of de app verwijdert.',
    "Sur ton iPhone uniquement : personne d'autre ne les voit.": 'Alleen op je iPhone: niemand anders ziet ze.', 'Touche « Sauvegarder », puis « Enregistrer dans Fichiers » → iCloud Drive.': 'Tik op „Back-up maken” en daarna „Bewaar in Bestanden” → iCloud Drive.',
    'TrackMe te rappelle de refaire une copie.': 'TrackMe herinnert je eraan een nieuwe kopie te maken.', 'Sauvegardé · refaire une copie': 'Opgeslagen · nieuwe kopie maken', 'Sauvegarder dans iCloud Drive': 'Back-up naar iCloud Drive',
    'Me le rappeler': 'Herinner me', 'Chaque semaine': 'Elke week', 'Chaque mois': 'Elke maand', 'Jamais': 'Nooit' },
});

const p = () => state.profile;
let langPicked = false; // la langue a déjà été choisie sur l'écran d'accueil
let kc = null; // calories modifiées : { base, val } (null = proposition Mifflin-St Jeor)

// Même garde-fou que metrics.current() : aucun objectif chiffré pour un mineur ou une situation médicale déclarée.
const blocked = () => p().age < 18 || !!p().medical;
const proposal = () => (S.isProfileComplete(p()) && !blocked() ? S.targets({ ...p() }, S.tdeeInitial(p())) : null);
const shownKcal = () => { const tg = proposal(); if (!tg) return null; if (kc && kc.base !== tg.kcal) kc = null; return kc ? kc.val : tg.kcal; };

// Chaque étape : { id, title, why?, body(), valid?(), skip?() } — `skip` masque l'étape (ex. cycle pour un homme).
// Étape « Protège tes données » : sauvegarde immédiate vers iCloud Drive (feuille de partage → Fichiers) + rythme du rappel.
const safeBody = () => {
  const every = state.settings.backupEvery ?? 7;
  return `<ul class="onb-safe">
      <li><span class="onb-safe-ic">${icon('profile')}</span><span>${t('Sur ton iPhone uniquement : personne d\'autre ne les voit.')}</span></li>
      <li><span class="onb-safe-ic">${icon('share')}</span><span>${t('Touche « Sauvegarder », puis « Enregistrer dans Fichiers » → iCloud Drive.')}</span></li>
      <li><span class="onb-safe-ic">${icon('calendar')}</span><span>${t('TrackMe te rappelle de refaire une copie.')}</span></li></ul>
    <button type="button" class="btn large onb-backup" data-a="backup">${icon('download')} ${state.lastBackup ? t('Sauvegardé · refaire une copie') : t('Sauvegarder dans iCloud Drive')}</button>
    <p class="onb-label">${t('Me le rappeler')}</p>
    ${choice('backupEvery', { d7: t('Chaque semaine'), d30: t('Chaque mois'), d0: t('Jamais') }, 'd' + every)}`;
};

const STEPS = [
  { id: 'lang', title: () => t('Choisis ta langue'), skip: () => langPicked, body: () => choice('lang', LANGS, getLang()) },
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
  { id: 'cycle', title: () => t('Suivi de ton cycle'), skip: () => p().sex !== 'F',
    why: () => t('Optionnel. Il aide à lire tes variations de poids (rétention d\'eau) et à adapter tes séances selon tes sensations. Tes données restent sur ton téléphone.'),
    body: () => choice('cycleOn', { yes: t('Oui, activer le suivi'), no: t('Non merci') }, state.cycle?.enabled ? 'yes' : state.cycle?.enabled === false ? 'no' : null)
      + (state.cycle?.enabled ? `<label class="onb-field"><span>${t('Début de tes dernières règles')}</span><input type="date" name="lastStart" max="${today()}" value="${state.cycle.periods?.[0]?.start || ''}"></label>`
        + stepper('cycleLen', t('Durée habituelle du cycle'), state.cycle.cycleLen ?? 28, 18, 45, 1, t('jours'))
        + stepper('periodLen', t('Durée des règles'), state.cycle.periodLen ?? 5, 2, 10, 1, t('jours'))
        + `<p class="onb-label">${t('Contraception hormonale (pilule, stérilet hormonal, implant…)')}</p>` + choice('hormonal', { no: t('Non'), yes: t('Oui') }, state.cycle.hormonal ? 'yes' : 'no') : '') },
  { id: 'calories', title: () => t('Tes calories'), why: () => t('Modifiable par pas de 50 kcal. Les macros se recalculent.'), body: summary, skip: blocked },
  { id: 'safe', title: () => t('Protège tes données'), why: () => t("Tes données restent sur ton iPhone. Une copie dans iCloud Drive te protège si tu changes de téléphone ou supprimes l'app."), body: safeBody },
];

function choice(name, opts, sel) {
  return `<div class="onb-choices" role="radiogroup">${Object.entries(opts).map(([k, l]) => `<button type="button" role="radio" aria-checked="${String(k) === String(sel)}" class="onb-choice ${String(k) === String(sel) ? 'on' : ''}" data-set="${name}" data-v="${esc(k)}">${name === 'sex' ? `<span class="onb-ico">${icon('profile')}</span>` : ''}<span class="grow">${esc(l)}</span><span class="onb-radio" aria-hidden="true">${String(k) === String(sel) ? icon('check') : ''}</span></button>`).join('')}</div>`;
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
  const base = proposal();
  if (!base) return `<p class="secondary">${t('Complète les étapes précédentes pour voir tes besoins.')}</p>`;
  const kcal = shownKcal(), tg = kc ? S.applyCustom(base, { enabled: true, kcal }, p().sex) : base;
  return `<div class="onb-hero"><p class="onb-kcal"><b class="num" aria-live="polite">${fmt(tg.kcal)}</b><span>${t('kcal/j')}</span></p>
      <div class="onb-kcal-row"><button type="button" class="icon-btn round" data-kc="-50" aria-label="${t('Baisser de 50 kcal')}">${icon('minus')}</button>
        <span class="onb-prop">${t('Proposition : {k} kcal', { k: fmt(base.kcal) })}</span>
        <button type="button" class="icon-btn round" data-kc="50" aria-label="${t('Monter de 50 kcal')}">${icon('plus')}</button></div>
      ${kc ? `<button type="button" class="btn plain" data-a="kc-reset">${t('Revenir à la proposition')}</button>` : ''}
      <div class="onb-tiles"><div><b class="num">${fmt(tg.protein)} g</b><span>${t('Protéines')}</span></div><div><b class="num">${fmt(tg.carbs)} g</b><span>${t('Glucides')}</span></div><div><b class="num">${fmt(tg.fat)} g</b><span>${t('Lipides')}</span></div></div></div>
    ${tg.floored ? `<p class="secondary onb-note">${t('plancher de sécurité appliqué')}</p>` : ''}
    <p class="secondary onb-note">${t('Calculé avec Mifflin-St Jeor et ton activité. Après 10 jours de saisie, la dépense s\'ajuste à tes vrais résultats. Tu peux modifier ces objectifs dans Profil.')}</p>`;
}

export function needsOnboarding() { return !state.onboarded && !S.isProfileComplete(state.profile); }

export function openOnboarding(done) {
  let i = -1; // -1 = écran d'accueil
  const el = document.createElement('div');
  el.className = 'onb';
  document.body.appendChild(el);
  const steps = () => STEPS.filter((s) => !s.skip?.());

  const cta = (a, label) => `<button class="btn filled large onb-cta" data-a="${a}"><span>${label}</span><i class="onb-arrow">${icon('chevronRight')}</i></button>`;
  const draw = () => {
    if (i < 0) {
      el.innerHTML = `<div class="onb-welcome"><div class="onb-stage">${shape({ cls: 'onb-bigshape', grain: 0.55 })}
          ${wordmark('onb-brand')}
          <div class="onb-langs seg" role="radiogroup">${Object.entries(LANGS).map(([k, l]) => `<button type="button" role="radio" aria-checked="${getLang() === k}" class="${getLang() === k ? 'on' : ''}" data-set="lang" data-v="${k}">${k.toUpperCase()}<span class="sr-only"> ${l}</span></button>`).join('')}</div></div>
        <div class="onb-sheet"><h1>${t('Ton corps, tes chiffres, ton rythme.')}</h1>
          <p>${t('Calories, poids, séances et conseils sourcés, dans une seule app qui reste sur ton téléphone. 2 minutes pour démarrer.')}</p>
          ${cta('start', t('Commencer'))}
          <label class="onb-have btn plain wide">${t("J'ai déjà mes données")}<input type="file" accept="application/json" hidden data-a="import"></label>
          <button class="btn plain wide" data-a="skip">${t('Passer, je remplirai plus tard')}</button></div></div>`;
      return;
    }
    const list = steps(), st = list[i];
    el.innerHTML = `<div class="onb-step">${shape({ cls: 'onb-orb', grain: 0.4 })}
      <div class="onb-top"><button class="v2-cb" data-a="back" aria-label="${t('Retour')}">${icon('chevronLeft')}</button>
        <div class="onb-progress seg-prog" role="progressbar" aria-label="${t('Étape {i} sur {n}', { i: i + 1, n: list.length })}" aria-valuenow="${i + 1}" aria-valuemin="1" aria-valuemax="${list.length}">${list.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <span class="onb-count num">${i + 1}/${list.length}</span><button class="btn plain" data-a="skip">${t('Passer')}</button></div>
      <div class="onb-body"><h2>${st.title()}</h2>${st.why ? `<p class="onb-why">${st.why()}</p>` : ''}<div class="onb-content">${st.body()}</div></div>
      <div class="onb-foot">${cta('next', st.id === 'safe' ? t('Aller à mon tableau de bord') : t('Continuer'))}</div></div>`;
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
    const tg = proposal(), v = shownKcal();
    if (kc && tg && v !== tg.kcal) p().custom = { enabled: true, kcal: v }; // seulement si modifiée
    state.onboarded = true;
    if (p().weight && !state.weights.length) state.weights.push({ date: today(), kg: p().weight });
    save(); el.classList.add('out');
    setTimeout(() => { el.remove(); done(); }, 250);
  };

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a],[data-set],[data-chip],[data-step-dir],[data-kc]');
    if (!b) return;
    if (b.dataset.kc) {
      const base = proposal(); if (!base) return;
      const floor = p().sex === 'F' ? 1200 : 1500;
      kc = { base: base.kcal, val: Math.max(floor, Math.round((shownKcal() + +b.dataset.kc) / 50) * 50) };
      if (kc.val === base.kcal) kc = null;
      navigator.vibrate?.(5); return draw();
    }
    if (b.dataset.stepDir) {
      const box = b.closest('.onb-stepper'), inp = box.querySelector('input');
      const v = Math.min(+box.dataset.max, Math.max(+box.dataset.min, (+inp.value || 0) + (+b.dataset.stepDir) * (+box.dataset.step)));
      inp.value = +v.toFixed(1); navigator.vibrate?.(5); return;
    }
    if (b.dataset.set) {
      readInputs();
      const k = b.dataset.set, v = b.dataset.v;
      if (k === 'lang') { setLang(v); langPicked = true; }
      else if (k === 'cycleOn') { state.cycle = { ...(state.cycle || {}), enabled: v === 'yes' }; }
      else if (k === 'hormonal') { state.cycle.hormonal = v === 'yes'; }
      else if (k === 'rate') p().rate = +v;
      else if (k === 'backupEvery') state.settings.backupEvery = +v.slice(1);
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
    if (a === 'backup') { readInputs(); state.onboarded = true; save(); return exportBackup().then(draw); }
    if (a === 'kc-reset') { kc = null; return draw(); }
    // « Passer » en haut d'une étape saute cette étape seulement ; sur l'accueil (i < 0) il termine l'onboarding.
    if (a === 'skip') {
      if (i < 0) return finish();
      readInputs(); i++;
      return i >= steps().length ? finish() : draw();
    }
    if (a === 'back') { readInputs(); i = Math.max(-1, i - 1); return draw(); }
    if (a === 'next') {
      readInputs();
      const list = steps(), st = list[i];
      if (st.valid && !st.valid()) { el.querySelector('.onb-content').classList.add('shake'); setTimeout(() => el.querySelector('.onb-content')?.classList.remove('shake'), 400); return; }
      if (st.id === 'safe') return finish(); // dernière étape
      i = Math.min(steps().length - 1, i + 1); draw();
    }
  });
  // « J'ai déjà mes données » : restaure une sauvegarde JSON exportée depuis Profil.
  el.addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f || e.target.dataset.a !== 'import') return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.profile || !data.logs) throw new Error('bad');
      replace({ ...data, onboarded: true }); el.classList.add('out');
      setTimeout(() => { el.remove(); done(); }, 250);
    } catch { toast(t('Fichier non reconnu')); }
    e.target.value = '';
  });
  draw();
}

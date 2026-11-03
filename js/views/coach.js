// Onglet Coach IA : chat sourcé + actions (recette, programme, bilan hebdo).
import { state, save, dayLog, sum, today, uid, intakesByDay } from '../store.js';
import { current, weeklyVolume, observedKgPerWeek } from '../metrics.js';
import { ask, hasKey, userContext, extractJson, stripJson } from '../ai.js';
import { importProgram } from './training.js';
import { openWizard } from './program.js';
import { MEALS } from './addfood.js';
import { esc, md, toast, fmt, nav } from '../ui.js';
import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { MUSCLES, isoDate } from '../science.js';

let busy = false;

const RECIPE_FORMAT = 'Termine par un bloc ```json {"name": string, "portions": number, "per_portion": {"kcal": number, "p": number, "c": number, "f": number, "fib": number}} ``` (valeurs par portion, en grammes pour p/c/f/fib).';
const PROGRAM_FORMAT = `Termine par un bloc \`\`\`json {"name": string, "days": [{"name": string, "exercises": [{"name": string, "muscle": une de ces clés exactes ${JSON.stringify(MUSCLES)}, "sets": number, "repMin": number, "repMax": number, "upper": boolean}]}]} \`\`\``;

function remaining() {
  const { targets } = current();
  if (!targets) return null;
  const s = sum(dayLog().meals);
  return { kcal: targets.kcal - s.kcal, proteines_g: targets.protein - s.p, glucides_g: targets.carbs - s.c, lipides_g: targets.fat - s.f, fibres_g: targets.fiber - s.fib };
}

function weekSummary() {
  const intakes = intakesByDay();
  const since = isoDate(new Date(Date.now() - 7 * 86400000));
  const days = Object.entries(intakes).filter(([d, k]) => k > 0 && d >= since);
  const { targets, energy } = current();
  return {
    objectifs: targets, depense: energy && { kcal: Math.round(energy.tdee), methode: energy.method, jours_logges_21j: energy.loggedDays },
    apport_moyen_7j: days.length ? Math.round(days.reduce((a, [, k]) => a + k, 0) / days.length) : null, jours_logges_7j: days.length,
    vitesse_poids_kg_sem: observedKgPerWeek(), poids_recents: state.weights.slice(-10),
    seances_7j: state.workouts.filter((w) => w.date >= since).length,
    volume_series_par_muscle_7j: weeklyVolume(),
  };
}

export const ACTIONS = {
  recette: {
    label: 'Recette pour mes macros restantes', icon: 'meal',
    prompt: () => `Propose UNE recette simple (≤ 30 min, ingrédients de supermarché courants) qui s'insère dans mes macros restantes aujourd'hui : ${JSON.stringify(remaining())}. Donne ingrédients avec grammages, étapes courtes, et macros par portion calculées à partir de Ciqual/USDA. Si utile, cite une étude sur un point nutritionnel clé (ex : répartition protéique). ${RECIPE_FORMAT}`,
    search: true,
  },
  programme: {
    label: 'Générer mon programme', icon: 'dumbbell',
    prompt: () => `Conçois mon programme de musculation fondé sur les preuves (volume 10–20 séries/muscle/sem, fréquence ≥ 2×/sem par muscle, plages de reps et RIR adaptés à mon objectif). Tiens compte de mon nombre de séances par semaine et de mon matériel. Explique brièvement les choix avec références (Schoenfeld, ACSM…). ${PROGRAM_FORMAT}`,
    search: true,
  },
  bilan: {
    label: 'Bilan de ma semaine', icon: 'chart',
    prompt: () => `Fais mon bilan hebdomadaire à partir de ces données : ${JSON.stringify(weekSummary())}. 1) Ce qui va bien, 2) ce qui bloque, 3) 3 ajustements concrets max (kcal, macros, entraînement) avec la raison scientifique. Rappelle que la tendance de poids prime sur les pesées isolées.`,
    search: false,
  },
};

async function send(root, go, text, { search = true, label = null } = {}) {
  if (busy) return;
  if (!hasKey()) { toast(t('Ajoute ta clé API dans Profil')); return go('profile'); }
  busy = true;
  // `label` = texte court affiché dans la bulle (l'invite complète part à l'API).
  state.chat.push({ id: uid(), role: 'user', text, label });
  state.chat.push({ id: uid(), role: 'assistant', text: '', pending: true });
  render(root, go);
  const history = state.chat.filter((m) => !m.pending).slice(-10).map((m) => ({ role: m.role, content: m.text || '…' }));
  // L'API exige que la conversation commence par un message utilisateur.
  while (history.length && history[0].role !== 'user') history.shift();
  history[history.length - 1].content = `Contexte utilisateur : ${userContext({ date: today() })}\n\n${text}`;
  const msg = state.chat[state.chat.length - 1];
  try {
    const r = await ask(history, { search, effort: 'medium' });
    const data = extractJson(r.text);
    msg.text = data ? stripJson(r.text) : r.text;
    msg.sources = r.sources;
    if (data?.per_portion) msg.action = { type: 'recipe', data };
    else if (data?.days) msg.action = { type: 'program', data };
  } catch (err) {
    msg.text = '⚠️ ' + t(err.message, err.vars); msg.error = true;
  }
  delete msg.pending; busy = false;
  state.chat = state.chat.slice(-60);
  save();
  // L'utilisateur a pu changer d'onglet pendant la requête.
  if (root.dataset.view === 'coach') render(root, go);
  else toast(t('Réponse du coach prête ✓'));
}

export function render(root, go, autoAction) {
  root.innerHTML = `
    ${nav(t('Coach'), { right: state.chat.length ? `<button class="btn plain" data-a="clear">${t('Effacer')}</button>` : '' })}
    ${!hasKey() ? `<div class="cta"><b class="headline">${t("Active l'IA")}</b><p>${t('Colle ta clé API Claude dans Profil (console.anthropic.com → API Keys). Coût : quelques centimes par demande.')}</p><button class="btn filled" data-a="profile">${t('Ajouter ma clé')}</button></div>` : ''}
    <div class="chips">${Object.entries(ACTIONS).map(([k, a]) => `<button class="chip" data-act="${k}">${icon(a.icon)} ${t(a.label)}</button>`).join('')}</div>
    <div class="chat" aria-live="polite">${state.chat.map((m) => `<div class="msg ${m.role} ${m.error ? 'err' : ''}">
      ${m.pending ? `<span class="typing-dots" aria-label="${t('Recherche dans la littérature…')}"><i></i><i></i><i></i></span>`
        : m.role === 'user' ? `<span class="ut">${esc(m.label ? t(m.label) : m.text.length > 280 ? m.text.slice(0, 280) + '…' : m.text)}</span>` : md(m.text)}
      ${m.sources?.length ? `<details class="sources"><summary>${icon('flask')} ${m.sources.length} ${t('source(s)')}</summary><ol>${m.sources.filter((s) => /^https?:/i.test(s.url)).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ol></details>` : ''}
      ${m.action?.type === 'recipe' ? `<div class="row"><select class="input" data-meal="${m.id}" aria-label="${t('Ajouter')}">${Object.entries(MEALS).map(([k, l]) => `<option value="${k}">${t(l)}</option>`).join('')}</select><button class="btn filled" data-addrecipe="${m.id}">${icon('plus')} ${t('1 portion ({k} kcal)', { k: fmt(m.action.data.per_portion.kcal) })}</button></div>` : ''}
      ${m.action?.type === 'program' ? `<div class="row"><button class="btn filled" data-useprog="${m.id}">${t('Utiliser ce programme')}</button></div>` : ''}
    </div>`).join('') || `<p class="empty footnote">${t("Pose une question (nutrition, entraînement, récupération…) ou choisis une action ci-dessus. Les réponses s'appuient sur PubMed, ANSES, EFSA, OMS et sont sourcées.")}</p>`}</div>
    <form class="composer" data-f="chat">
      <label class="sci" title="${t('Recherche scientifique')}">${icon('flask')}<input type="checkbox" name="s" checked aria-label="${t('Recherche scientifique')}"></label>
      <textarea name="q" rows="1" placeholder="${t('Ta question au coach…')}" ${busy ? 'disabled' : ''} aria-label="${t('Ta question au coach…')}"></textarea>
      <button class="send" ${busy ? 'disabled' : ''} aria-label="${t('Envoyer')}">${icon('send')}</button></form>`;

  requestAnimationFrame(() => root.scrollTo?.(0, root.scrollHeight));
  const form = root.querySelector('[data-f=chat]');
  // Les derniers messages ne doivent jamais passer sous la zone de saisie, quelle que soit sa hauteur.
  const pad = () => (root.style.paddingBottom = form.offsetHeight + 16 + 'px');
  form.q.oninput = () => { form.q.style.height = 'auto'; form.q.style.height = Math.min(140, form.q.scrollHeight) + 'px'; pad(); };
  form.q.onfocus = () => document.body.classList.add('typing');
  form.q.onblur = () => document.body.classList.remove('typing');
  pad();
  form.onsubmit = (e) => {
    e.preventDefault();
    const q = form.q.value.trim();
    if (q) send(root, go, q, { search: form.s.checked });
  };
  root.onclick = (e) => {
    const el = e.target.closest('[data-a],[data-act],[data-addrecipe],[data-useprog]');
    if (!el) return;
    if (el.dataset.a === 'profile') return go('profile');
    if (el.dataset.a === 'clear') { if (confirm(t('Effacer la conversation ?'))) { state.chat = []; save(); render(root, go); } return; }
    if (el.dataset.act) return runAction(el.dataset.act);
    const m = state.chat.find((x) => x.id === (el.dataset.addrecipe || el.dataset.useprog));
    if (!m) return;
    if (el.dataset.addrecipe) {
      const d = m.action.data, pp = d.per_portion, meal = root.querySelector(`[data-meal="${m.id}"]`).value;
      dayLog().meals.push({ id: uid(), meal, name: d.name + ' (1 portion)', grams: 0, source: 'Recette IA', kcal: Math.round(pp.kcal), p: pp.p, c: pp.c, f: pp.f, fib: pp.fib || 0 });
      save(); toast(t('Ajouté au journal ✓'));
    }
    if (el.dataset.useprog) {
      try { importProgram(m.action.data); toast(t('Programme activé ✓')); go('training'); } catch (err) { toast(err.message, err.vars); }
    }
  };
  const runAction = (k) => {
    if (k === 'programme') return openWizard(() => go('training')); // le coach pose ses questions dans l'assistant
    const a = ACTIONS[k];
    if (k === 'recette' && !remaining()) { toast(t("Complète ton profil d'abord")); return go('profile'); }
    send(root, go, a.prompt(), { search: a.search, label: a.label });
  };
  if (autoAction && ACTIONS[autoAction] && hasKey()) runAction(autoAction);
}

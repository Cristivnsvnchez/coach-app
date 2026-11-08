// Point d'entrée TrackMe : menu (capsule + « + » central), routes, thème palette, onboarding, service worker.
import { load, state, flush, save, dayLog, today as todayIso } from './store.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { applyTheme, applyScheme, wordmark } from './theme.js';
import { banner, sheetPop, sheet, toast, fmt } from './ui.js';
import './i18n/nl-base.js'; // traductions néerlandaises des textes existants
import './i18n/extra.js'; // compléments EN + NL (tests/i18n-scan.mjs)
import * as today from './views/today.js';
import * as weight from './views/weight.js';
import * as training from './views/training.js';
import * as profile from './views/profile.js';
import * as cycle from './views/cycle.js';
import * as learn from './views/learn.js';
import * as planning from './views/planning.js';
import { needsOnboarding, openOnboarding } from './views/onboarding.js';
import { openAddFood } from './views/addfood.js';
import { openWeigh } from './views/weight.js';
import { current } from './metrics.js';
import { plannedWorkout } from './views/habits.js';
import { fmtDate } from './ui.js';
import { startupNudges } from './install.js';

// Toutes les vues routables. Le menu n'en montre que 4 ; les autres s'ouvrent depuis les écrans.
const VIEWS = { today, weight, training, profile, cycle, learn, planning };
// Ordre du canevas Parcours v2 : Journal, Sport, « + », Poids, Apprendre.
const TABS = [['today', 'Journal', 'home'], ['training', 'Séances', 'training'], ['add'], ['weight', 'Poids', 'scale'], ['learn', 'Apprendre', 'book']];
const TAB_OF = { cycle: 'today', profile: 'today', planning: 'today' };
const main = document.getElementById('view');
const tabbar = document.querySelector('.tabbar');
let tab = 'today';
let enterTimer = 0; // retire .tm-enter après la cascade : les re-rendus suivants (eau, repas…) ne rejouent pas l'entrée

// Mobile : capsule 4 onglets + « + » central. Ordinateur (CSS ≥ 1024 px) : la même barre devient une barre latérale
// avec le logotype, le libellé du « + » et les écrans secondaires (éléments .side-only, masqués sur mobile).
const SIDE = () => [...(state.profile?.sex === 'F' && state.cycle?.enabled ? [['cycle', 'Cycle', 'drop']] : [])];
function drawTabbar(pop = false) {
  const active = tab;
  // .on = écran affiché ; .parent = onglet du menu mobile qui contient l'écran (Coach, Cycle… → Journal).
  const btn = ([k, label, ic], cls = '') => `<button data-tab="${k}" class="${cls} ${k === active && pop ? 'tm-pop' : ''} ${k === active ? 'on' : TAB_OF[active] === k ? 'parent' : ''}" ${k === active ? 'aria-current="page"' : ''} aria-label="${t(label)}">${icon(ic)}<span>${t(label)}</span></button>`;
  tabbar.innerHTML = `<span class="side-only side-brand">${wordmark()}</span>` + TABS.map((x) => x[0] === 'add'
    ? `<button class="tm-fab" data-tab="add" aria-label="${t('Ajouter un aliment')}">${icon('plus')}<span class="side-only">${t('Ajouter un aliment')}</span></button>`
    : btn(x)).join('') + `<span class="side-only side-sep" aria-hidden="true"></span>` + SIDE().map((x) => btn(x, 'side-only')).join('')
    + btn(['profile', 'Profil', 'profile'], 'side-only side-foot');
}

// Repas proposé par le « + » selon l'heure.
const mealNow = () => { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 10.5 ? 'dej' : h < 15 ? 'midi' : h < 21 ? 'diner' : 'snack'; };

// Navigation : historique du navigateur (bouton retour, geste retour Android, souris) + fondu court entre écrans.
export function go(name, arg, { push = true } = {}) {
  if (!VIEWS[name]) return;
  const changed = name !== tab, first = !tab;
  if (changed && tab) VIEWS[tab].leave?.(); // libère ce que l'écran quitté garde en vie (ex. 3D de la carte du jour)
  tab = name;
  drawTabbar(changed && !first); // rebond de l'icône du nouvel onglet
  main.scrollTo(0, 0);
  main.classList.remove('scrolled');
  main.dataset.view = name;
  main.style.paddingBottom = '';
  document.body.classList.remove('typing');
  VIEWS[name].render(main, go, arg);
  // Fondu court à l'arrivée sur un autre écran (rendu synchrone : un tap = une réaction immédiate).
  if (changed && !first) { main.classList.remove('tm-enter'); void main.offsetWidth; main.classList.add('tm-enter'); clearTimeout(enterTimer); enterTimer = setTimeout(() => main.classList.remove('tm-enter'), 600); }
  if (push && changed) history.pushState({ tab: name }, '', '#' + name);
  try { sessionStorage.setItem('tab', name); } catch {}
}
addEventListener('popstate', (e) => {
  if (sheetPop()) return;
  const t0 = e.state?.tab in VIEWS ? e.state.tab : location.hash.slice(1) in VIEWS ? location.hash.slice(1) : 'today';
  go(t0, undefined, { push: false });
});

main.addEventListener('scroll', () => main.classList.toggle('scrolled', main.scrollTop > 8), { passive: true });

load();
document.documentElement.dataset.look = 'glass';
document.documentElement.classList.add('tm');
applyTheme(state.settings.palette, state.settings.shape, state.settings.surface);
applyScheme(state.settings.scheme);
addEventListener('load', () => applyScheme(state.settings.scheme)); // feuilles de style chargées après le module

tabbar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  if (b.dataset.tab === 'add') return quickAdd();
  if (b.dataset.tab === tab) main.scrollTo({ top: 0, behavior: 'smooth' });
  else go(b.dataset.tab);
});
// « + » central : quatre actions rapides, la plus fréquente (repas) en premier.
const MEAL_LABEL = { dej: 'Petit-déjeuner', midi: 'Déjeuner', diner: 'Dîner', snack: 'Collation' };
function quickAdd() {
  const log = dayLog(todayIso()), goal = (current().targets?.waterL ?? 2);
  const card = (a, ic, title, sub) => `<button class="qa-card" data-q="${a}"><span class="qa-ic">${icon(ic)}</span><span><b>${title}</b><br><small>${sub}</small></span></button>`;
  // Sous-titres du canevas : repas en cours, dernière pesée, séance prévue, eau du jour.
  const last = state.weights.length ? [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).pop().date : null;
  const ago = last ? Math.round((new Date(todayIso() + 'T12:00:00') - new Date(last + 'T12:00:00')) / 864e5) : null;
  const lastTxt = ago === null ? t('Aucune pour l\'instant') : ago === 0 ? t('Dernière : aujourd\'hui') : ago === 1 ? t('Dernière : hier') : ago < 7 ? t('Dernière : il y a {n} j', { n: ago }) : t('Dernière : {d}', { d: fmtDate(last) });
  const plan = plannedWorkout(todayIso());
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Ajouter')}</h3></div>
    <div class="qa-grid">${card('meal', 'leaf', t('Un repas'), t('{m} en cours', { m: t(MEAL_LABEL[mealNow()]) }))}${card('weigh', 'scale', t('Une pesée'), lastTxt)}
      ${card('train', 'training', t('Une séance'), plan ? t('{n} prévue', { n: plan }) : t('Démarrer ou reprendre'))}${card('water', 'drop', t('De l\'eau'), t('{v} L sur {g} L', { v: fmt(log.water / 1000, 1), g: fmt(goal, 1) }))}</div>
    <button class="btn plain qa-cancel" data-q="cancel">${t('Annuler')}</button>`);
  s.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]')?.dataset.q; if (!q) return;
    s.close();
    if (q === 'cancel') return;
    // La fermeture recule l'historique (asynchrone) : on attend ce recul, sinon il refermerait la feuille suivante.
    let fired = false;
    const after = (fn) => { const run = () => { if (fired) return; fired = true; removeEventListener('popstate', run); setTimeout(fn, 0); }; addEventListener('popstate', run); setTimeout(run, 450); };
    const refresh = () => { if (tab === 'today' || tab === 'weight') go(tab); };
    if (q === 'meal') return after(() => openAddFood(mealNow(), todayIso(), refresh));
    if (q === 'weigh') return after(() => openWeigh(refresh));
    if (q === 'train') return after(() => go('training'));
    if (q === 'water') { const l = dayLog(todayIso()); l.water += 250; save(); refresh(); toast(t('+250 ml d\'eau · {v} L', { v: fmt(l.water / 1000, 2) })); }
  });
}

let saved = location.hash.slice(1) in VIEWS ? location.hash.slice(1) : null;
// Onglet mémorisé : seulement s'il existe encore (ex. « coach » retiré → sinon écran vide sans menu).
try { const s = sessionStorage.getItem('tab'); if (!saved && s in VIEWS) saved = s; } catch {}
tab = '';
go(saved || 'today', undefined, { push: false });
history.replaceState({ tab }, '', '#' + tab);
if (needsOnboarding()) openOnboarding(() => { applyTheme(state.settings.palette, state.settings.shape, state.settings.surface); go('today'); startupNudges(); });
else startupNudges();

let day = todayIso();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || day === todayIso()) return;
  day = todayIso();
  if (!document.querySelector('.sheet-wrap')) VIEWS[tab].render(main, go);
});

navigator.storage?.persist?.().catch(() => {});

// Hors ligne : l'app continue (données locales) ; on le dit sans bloquer.
addEventListener('offline', () => banner(t('Hors ligne : tes saisies restent enregistrées.')));
addEventListener('online', () => banner(t('De nouveau en ligne.'), { ms: 1800 }));

// Mise à jour : la nouvelle version prend la main en arrière-plan ; on recharge une seule fois, sans perdre de saisie.
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    const reload = () => { reloading = true; flush(); location.reload(); };
    if (!document.querySelector('.sheet-wrap') && document.visibilityState === 'hidden') return reload();
    banner(t('Nouvelle version de TrackMe prête.'), { action: t('Mettre à jour'), onAction: reload });
  });
  navigator.serviceWorker.register('./sw.js').then((r) => {
    // Vérifie les mises à jour à chaque retour dans l'app (iOS garde l'app ouverte longtemps).
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') r.update().catch(() => {}); });
  }).catch(() => {});
}

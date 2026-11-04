// Point d'entrée TrackMe : menu (capsule + « + » central), routes, thème palette, onboarding, service worker.
import { load, state, today as todayIso } from './store.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { applyTheme } from './theme.js';
import './i18n/nl-base.js'; // traductions néerlandaises des textes existants
import * as today from './views/today.js';
import * as weight from './views/weight.js';
import * as training from './views/training.js';
import * as coach from './views/coach.js';
import * as profile from './views/profile.js';
import * as cycle from './views/cycle.js';
import * as activities from './views/activities.js';
import * as connect from './views/connect.js';
import * as learn from './views/learn.js';
import { needsOnboarding, openOnboarding } from './views/onboarding.js';
import { openAddFood } from './views/addfood.js';

// Toutes les vues routables. Le menu n'en montre que 4 ; les autres s'ouvrent depuis les écrans.
const VIEWS = { today, weight, training, coach, profile, cycle, activities, connect, learn };
const TABS = [['today', 'Journal', 'calendar'], ['weight', 'Poids', 'weight'], ['add'], ['training', 'Sport', 'training'], ['activities', 'Activités', 'bolt']];
const TAB_OF = { cycle: 'today', coach: 'today', profile: 'today', learn: 'training', connect: 'activities' };
const main = document.getElementById('view');
const tabbar = document.querySelector('.tabbar');
let tab = 'today';

function drawTabbar() {
  const active = TAB_OF[tab] || tab;
  tabbar.innerHTML = TABS.map(([k, label, ic]) => k === 'add'
    ? `<button class="tm-fab" data-tab="add" aria-label="${t('Ajouter un aliment')}">${icon('plus')}</button>`
    : `<button data-tab="${k}" class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''} aria-label="${t(label)}">${icon(ic)}<span>${t(label)}</span></button>`).join('');
}

// Repas proposé par le « + » selon l'heure.
const mealNow = () => { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 10.5 ? 'dej' : h < 15 ? 'midi' : h < 21 ? 'diner' : 'snack'; };

export function go(name, arg) {
  if (!VIEWS[name]) return;
  tab = name;
  drawTabbar();
  main.scrollTo(0, 0);
  main.classList.remove('scrolled');
  main.dataset.view = name;
  main.style.paddingBottom = '';
  document.body.classList.remove('typing');
  VIEWS[name].render(main, go, arg);
  try { sessionStorage.setItem('tab', name); } catch {}
}

main.addEventListener('scroll', () => main.classList.toggle('scrolled', main.scrollTop > 8), { passive: true });

load();
document.documentElement.dataset.look = 'glass';
document.documentElement.classList.add('tm');
applyTheme(state.settings.palette, state.settings.shape);

tabbar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  if (b.dataset.tab === 'add') return openAddFood(mealNow(), todayIso(), () => { if (tab === 'today') go('today'); });
  if (b.dataset.tab === tab) main.scrollTo({ top: 0, behavior: 'smooth' });
  else go(b.dataset.tab);
});
let saved = null;
try { saved = sessionStorage.getItem('tab'); } catch {}
go(saved || tab);
if (needsOnboarding()) openOnboarding(() => { applyTheme(state.settings.palette, state.settings.shape); go('today'); });

let day = todayIso();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || day === todayIso()) return;
  day = todayIso();
  if (tab !== 'coach' && !document.querySelector('.sheet-wrap')) VIEWS[tab].render(main, go);
});

navigator.storage?.persist?.().catch(() => {});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

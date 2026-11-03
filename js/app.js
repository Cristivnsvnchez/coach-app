// Point d'entrée : onglets, persistance, service worker.
import { load, today as todayIso } from './store.js';
import * as today from './views/today.js';
import * as weight from './views/weight.js';
import * as training from './views/training.js';
import * as coach from './views/coach.js';
import * as profile from './views/profile.js';

const VIEWS = { today, weight, training, coach, profile };
const main = document.getElementById('view');
let tab = 'today';

function go(name, arg) {
  if (!VIEWS[name]) return;
  tab = name;
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  main.scrollTo(0, 0);
  main.dataset.view = name;
  main.style.paddingBottom = '';
  document.body.classList.remove('typing');
  VIEWS[name].render(main, go, arg);
  try { sessionStorage.setItem('tab', name); } catch {}
}

load();
document.querySelector('.tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (b) go(b.dataset.tab);
});
let saved = null;
try { saved = sessionStorage.getItem('tab'); } catch {}
go(saved || tab);

// Retour au premier plan : on ne re-rend que si le jour a changé (sinon on perdrait la saisie et le défilement).
let day = todayIso();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || day === todayIso()) return;
  day = todayIso();
  if (tab !== 'coach' && !document.querySelector('.sheet-wrap')) VIEWS[tab].render(main, go);
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

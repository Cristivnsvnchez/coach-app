// Point d'entrée : onglets, barre de navigation au défilement, persistance, service worker.
import { load, state, today as todayIso } from './store.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import * as today from './views/today.js';
import * as weight from './views/weight.js';
import * as training from './views/training.js';
import * as coach from './views/coach.js';
import * as profile from './views/profile.js';

const VIEWS = { today, weight, training, coach, profile };
const TABS = [['today', "Aujourd'hui"], ['weight', 'Poids'], ['training', 'Sport'], ['coach', 'Coach'], ['profile', 'Profil']];
const main = document.getElementById('view');
const tabbar = document.querySelector('.tabbar');
let tab = 'today';

// Onglet actif : icône pleine (HIG : état sélectionné de la barre d'onglets).
function drawTabbar() {
  tabbar.innerHTML = TABS.map(([k, label]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}" ${k === tab ? 'aria-current="page"' : ''}>${icon(k, { filled: k === tab })}<span>${t(label)}</span></button>`).join('');
}

function go(name, arg) {
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

// Barre de navigation : transparente en haut, matériau verre dès que le contenu défile dessous.
main.addEventListener('scroll', () => main.classList.toggle('scrolled', main.scrollTop > 8), { passive: true });

load();
// Apparence : 'classic' ou 'glass' (Liquid Glass).
export const applyLook = (look) => { document.documentElement.dataset.look = look || 'classic'; };
applyLook(state.settings.look);
tabbar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  if (b.dataset.tab === tab) main.scrollTo({ top: 0, behavior: 'smooth' }); // retoucher l'onglet actif remonte en haut
  else go(b.dataset.tab);
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

// Demande au navigateur de ne jamais effacer les données de l'app pour libérer de l'espace.
navigator.storage?.persist?.().catch(() => {});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

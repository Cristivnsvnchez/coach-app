// Section « Apparence » du Profil : mode (auto / clair / sombre) et matière (Papier / Brume).
// La palette (Océan) et la forme (Vague) sont fixes : plus de choix pour l'utilisateur.
import { state, save } from '../store.js';
import { t, register } from '../i18n.js';
import { SURFACES, SCHEMES, applyScheme, applyTheme } from '../theme.js';

register({
  en: { 'Mode': 'Mode', 'Automatique': 'Automatic', 'Clair': 'Light', 'Sombre': 'Dark', 'Matière': 'Finish', 'Papier': 'Paper', 'Brume': 'Mist', 'Mat et chaleureux': 'Matte and warm', 'Flou et verre givré': 'Blur and frosted glass' },
  nl: { 'Mode': 'Modus', 'Automatique': 'Automatisch', 'Clair': 'Licht', 'Sombre': 'Donker', 'Matière': 'Afwerking', 'Papier': 'Papier', 'Brume': 'Nevel', 'Mat et chaleureux': 'Mat en warm', 'Flou et verre givré': 'Wazig en matglas' },
});

const SCHEME_NAMES = { auto: 'Automatique', light: 'Clair', dark: 'Sombre' };
const SURFACE_INFO = { papier: ['Papier', 'Mat et chaleureux'], brume: ['Brume', 'Flou et verre givré'] };

// HTML : mode clair/sombre + cartes de matière.
export function paletteSection() {
  const srf = SURFACES.includes(state.settings.surface) ? state.settings.surface : 'papier';
  const mt = SURFACES.map((k) => `<button type="button" class="pal-srf ${k === srf ? 'on' : ''}" data-srf="${k}" role="radio" aria-checked="${k === srf}">
      <span class="pal-srf-thumb pal-srf-${k}"><i></i></span><span><b>${t(SURFACE_INFO[k][0])}</b><small>${t(SURFACE_INFO[k][1])}</small></span></button>`).join('');
  const sc = SCHEMES.includes(state.settings.scheme) ? state.settings.scheme : 'auto';
  const modes = `<div class="seg pal-scheme" role="radiogroup">${SCHEMES.map((k) => `<button type="button" role="radio" aria-checked="${k === sc}" class="${k === sc ? 'on' : ''}" data-sch="${k}">${t(SCHEME_NAMES[k])}</button>`).join('')}</div>`;
  return `<div class="pal">
    <p class="onb-label">${t('Mode')}</p>${modes}
    <p class="onb-label">${t('Matière')}</p><div class="pal-srfs" role="radiogroup">${mt}</div></div>`;
}

// Gère un clic sur le mode ou la matière : applique, enregistre, puis appelle rerender(). Renvoie true si géré.
export function handlePaletteClick(e, rerender) {
  const b = e.target.closest('[data-srf],[data-sch]');
  if (!b) return false;
  if (b.dataset.sch) { state.settings.scheme = b.dataset.sch; applyScheme(b.dataset.sch); }
  else { state.settings.surface = b.dataset.srf; applyTheme(null, null, b.dataset.srf); }
  save(); navigator.vibrate?.(5);
  rerender?.();
  return true;
}

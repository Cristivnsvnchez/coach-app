// Choix de la palette (6 couleurs) et de la forme (3 variantes), avec aperçu en direct.
// Partagé par l'onboarding (étape « Ta palette ») et le Profil (section « Apparence »).
import { state, save } from '../store.js';
import { t, register } from '../i18n.js';
import { PALETTES, VARIANTS, SURFACES, SCHEMES, applyScheme, wordmark, applyTheme, shape, palette, variant, colors } from '../theme.js';
import { icon } from '../icons.js';

register({
  en: { 'Vague': 'Wave', 'Halo': 'Halo', 'Spirale': 'Swirl', 'Palette': 'Palette', 'Forme': 'Shape', 'Aperçu': 'Preview',
    'Mode': 'Mode', 'Automatique': 'Automatic', 'Clair': 'Light', 'Sombre': 'Dark', 'Matière': 'Finish', 'Papier': 'Paper', 'Brume': 'Mist', 'Mat et chaleureux': 'Matte and warm', 'Flou et verre givré': 'Blur and frosted glass',
    'Océan': 'Ocean', 'Aurore': 'Aurora', 'Lagune': 'Lagoon', 'Braise': 'Ember', 'Prairie': 'Meadow', 'Encre': 'Ink' },
  nl: { 'Vague': 'Golf', 'Halo': 'Halo', 'Spirale': 'Spiraal', 'Palette': 'Palet', 'Forme': 'Vorm', 'Aperçu': 'Voorbeeld',
    'Mode': 'Modus', 'Automatique': 'Automatisch', 'Clair': 'Licht', 'Sombre': 'Donker', 'Matière': 'Afwerking', 'Papier': 'Papier', 'Brume': 'Nevel', 'Mat et chaleureux': 'Mat en warm', 'Flou et verre givré': 'Wazig en matglas',
    'Océan': 'Oceaan', 'Aurore': 'Aurora', 'Lagune': 'Lagune', 'Braise': 'Gloed', 'Prairie': 'Weide', 'Encre': 'Inkt' },
});

const SHAPE_NAMES = { flow: 'Vague', orb: 'Halo', swirl: 'Spirale' };
const SCHEME_NAMES = { auto: 'Automatique', light: 'Clair', dark: 'Sombre' };
const SURFACE_INFO = { papier: ['Papier', 'Mat et chaleureux'], brume: ['Brume', 'Flou et verre givré'] };

// Palette et forme actives (réglages enregistrés, sinon thème courant).
const cur = () => ({ pal: PALETTES[state.settings.palette] ? state.settings.palette : palette(), shp: VARIANTS.includes(state.settings.shape) ? state.settings.shape : variant() });

// HTML : aperçu en direct + pastilles de palette + cartes de forme.
export function paletteSection() {
  const { pal, shp } = cur();
  const sw = Object.keys(PALETTES).map((k) => {
    const c = colors(k), on = k === pal;
    return `<button type="button" class="pal-sw ${on ? 'on' : ''}" data-pal="${k}" role="radio" aria-checked="${on}" aria-label="${t(c.name)}">
      <i style="background:linear-gradient(135deg,${c.deep} 0 45%,${c.mid} 45% 75%,${c.warm} 75%)"></i><span>${t(c.name)}</span></button>`;
  }).join('');
  const sh = VARIANTS.map((v) => `<button type="button" class="pal-shape ${v === shp ? 'on' : ''}" data-shp="${v}" role="radio" aria-checked="${v === shp}" aria-label="${t(SHAPE_NAMES[v])}">
      <span class="pal-thumb">${shape({ key: pal, v, grain: 0.3 })}</span><span>${t(SHAPE_NAMES[v])}</span>${v === shp ? icon('check') : ''}</button>`).join('');
  const srf = SURFACES.includes(state.settings.surface) ? state.settings.surface : 'papier';
  const mt = SURFACES.map((k) => `<button type="button" class="pal-srf ${k === srf ? 'on' : ''}" data-srf="${k}" role="radio" aria-checked="${k === srf}">
      <span class="pal-srf-thumb pal-srf-${k}"><i></i></span><span><b>${t(SURFACE_INFO[k][0])}</b><small>${t(SURFACE_INFO[k][1])}</small></span></button>`).join('');
  const sc = SCHEMES.includes(state.settings.scheme) ? state.settings.scheme : 'auto';
  const modes = `<div class="seg pal-scheme" role="radiogroup">${SCHEMES.map((k) => `<button type="button" role="radio" aria-checked="${k === sc}" class="${k === sc ? 'on' : ''}" data-sch="${k}">${t(SCHEME_NAMES[k])}</button>`).join('')}</div>`;
  return `<div class="pal">
    <div class="pal-preview" aria-label="${t('Aperçu')}">${shape({ key: pal, v: shp })}<span class="pal-chip">${wordmark()}</span></div>
    <p class="onb-label">${t('Mode')}</p>${modes}
    <p class="onb-label">${t('Palette')}</p><div class="pal-swatches" role="radiogroup">${sw}</div>
    <p class="onb-label">${t('Matière')}</p><div class="pal-srfs" role="radiogroup">${mt}</div>
    <p class="onb-label">${t('Forme')}</p><div class="pal-shapes" role="radiogroup">${sh}</div></div>`;
}

// Gère un clic sur une pastille/forme : applique le thème, enregistre, puis appelle rerender(). Renvoie true si géré.
export function handlePaletteClick(e, rerender) {
  const b = e.target.closest('[data-pal],[data-shp],[data-srf],[data-sch]');
  if (!b) return false;
  if (b.dataset.sch) { state.settings.scheme = b.dataset.sch; applyScheme(b.dataset.sch); save(); rerender?.(); return true; }
  if (b.dataset.srf) state.settings.surface = b.dataset.srf;
  const { pal, shp } = cur();
  const next = b.dataset.pal || pal, nextShape = b.dataset.shp || shp;
  state.settings.palette = next; state.settings.shape = nextShape;
  applyTheme(next, nextShape, state.settings.surface); save();
  navigator.vibrate?.(5);
  rerender?.();
  return true;
}

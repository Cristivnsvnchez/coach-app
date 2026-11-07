// Palette TrackMe (fixe : Océan) : variables CSS (--p-deep, --p-mid, --p-warm, --p-tint) et formes
// en dégradé granuleux (SVG flou + grain) réutilisables par toutes les vues. Voir DESIGN.md.
// L'utilisateur ne choisit plus ni la palette ni la forme : réglages enregistrés ignorés, tout le monde sur Océan + Vague.

// [nom, principale (boutons, progression ; contraste ≥ 4,5:1 avec le blanc), moyenne, chaude, teinte]
export const PALETTES = { ocean: ['Océan', '#1b3fd1', '#2f7bff', '#ff8a3d', '#e6ecff'] };
// Matière du fond : papier crème mat, ou brume (fond flou à dégradé neutre + contrôles en verre givré).
export const SURFACES = ['papier', 'brume'];

let current = 'ocean', currentVariant = 'flow';
export const palette = () => current;
export const variant = () => currentVariant;
export const colors = (key = current) => { const [name, deep, mid, warm, tint] = PALETTES[key] || PALETTES.ocean; return { name, deep, mid, warm, tint }; };

// key / v (anciens choix de palette et de forme) sont ignorés : seule la matière reste au choix.
export function applyTheme(key, v, surface) {
  if (surface !== undefined) document.documentElement.dataset.surface = SURFACES.includes(surface) ? surface : 'papier';
  current = 'ocean';
  currentVariant = 'flow';
  const c = colors();
  const r = document.documentElement.style;
  r.setProperty('--p-deep', c.deep); r.setProperty('--p-mid', c.mid); r.setProperty('--p-warm', c.warm); r.setProperty('--p-tint', c.tint);
  document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', c.deep);
}

const SHAPES = {
  flow: [[90, 120, 95, 60, 'deep', 0.95, -25], [170, 200, 80, 55, 'mid', 0.9, 20], [225, 285, 70, 48, 'warm', 0.95, -10], [130, 175, 60, 40, 'mid', 0.6, 35]],
  orb: [[155, 200, 115, 115, 'deep', 0.95, 0], [190, 160, 80, 80, 'mid', 0.85, 0], [110, 270, 90, 50, 'warm', 0.9, -20], [200, 270, 60, 40, 'warm', 0.6, 10]],
  swirl: [[110, 150, 90, 40, 'deep', 0.9, -35], [190, 210, 85, 38, 'mid', 0.9, 40], [130, 265, 80, 36, 'warm', 0.9, -20], [160, 205, 40, 40, 'deep', 0.7, 0]],
};
let uid = 0;

// Forme décorative en SVG (aria-hidden). `cls` positionne/dimensionne la forme côté CSS.
export function shape({ key = current, v = currentVariant, grain = 0.5, cls = '' } = {}) {
  const c = colors(key), id = 's' + (++uid);
  const blobs = (SHAPES[v] || SHAPES.flow).map(([cx, cy, rx, ry, tone, op, rot]) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c[tone]}" opacity="${op}" transform="rotate(${rot} ${cx} ${cy})"/>`).join('');
  return `<svg class="tm-shape ${cls}" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs><filter id="${id}b" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${v === 'orb' ? 22 : 26}"/></filter>
    <filter id="${id}g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0"/></filter></defs>
    <g filter="url(#${id}b)">${blobs}</g><rect width="300" height="400" filter="url(#${id}g)" opacity="${grain}" style="mix-blend-mode:multiply"/></svg>`;
}

// Logotype TrackMe : Funnel Display serrée, point final à la couleur de la palette (voir DESIGN.md → Marque).
export const wordmark = (cls = '') => `<span class="tm-wordmark ${cls}" aria-label="TrackMe">TrackMe<i aria-hidden="true"></i></span>`;

// Mode d'affichage choisi (Profil → Apparence) : 'auto' suit l'iPhone, 'light' / 'dark' forcent.
// Les styles sombres sont écrits en @media (prefers-color-scheme: dark) ; on réécrit ces conditions à la volée
// (vraie / fausse) plutôt que de dupliquer chaque règle. Le texte d'origine est gardé pour revenir en automatique.
export const SCHEMES = ['auto', 'light', 'dark'];
const ORIGINAL = new WeakMap();
const TRUE = '(min-width: 0px)', FALSE = '(min-width: 999999px)';
export function applyScheme(mode = 'auto') {
  const m = SCHEMES.includes(mode) ? mode : 'auto';
  const darkOn = m === 'dark', lightOn = m === 'light';
  const walk = (rules) => {
    for (const r of rules) {
      if (r.media && r.cssRules) {
        if (!ORIGINAL.has(r)) ORIGINAL.set(r, r.media.mediaText);
        const src = ORIGINAL.get(r);
        if (/prefers-color-scheme/.test(src)) {
          r.media.mediaText = m === 'auto' ? src : src
            .replace(/\(\s*prefers-color-scheme:\s*dark\s*\)/g, darkOn ? TRUE : FALSE)
            .replace(/\(\s*prefers-color-scheme:\s*light\s*\)/g, lightOn ? TRUE : FALSE);
        }
        walk(r.cssRules);
      }
    }
  };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }
  const root = document.documentElement;
  root.dataset.scheme = m;
  root.style.colorScheme = m === 'auto' ? 'light dark' : m; // contrôles natifs (champs, sélecteurs, barres de défilement)
}

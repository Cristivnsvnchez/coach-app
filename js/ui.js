// Petits utilitaires DOM, composants iOS et graphiques SVG.
import { locale, t } from './i18n.js';
import { icon } from './icons.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const fmt = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString(locale(), { maximumFractionDigits: d, minimumFractionDigits: d }) : '–');
// Une chaîne 'YYYY-MM-DD' est lue en heure locale (new Date('YYYY-MM-DD') serait en UTC).
export const fmtDate = (d, opts = { day: 'numeric', month: 'short' }) =>
  (d ? (typeof d === 'string' && d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d)).toLocaleDateString(locale(), opts) : '–');

// Barre de navigation iOS : titre compact (visible au défilement) + grand titre.
export function nav(title, { left = '', right = '', large = true } = {}) {
  return `<header class="nav"><div class="nav-l">${left}</div><div class="nav-title">${esc(title)}</div><div class="nav-r">${right}</div></header>
    ${large ? `<h1 class="large-title">${esc(title)}</h1>` : ''}`;
}

// Section groupée : titre, contenu (cellules), note de bas.
export const group = (title, body, foot = '') =>
  `<section class="group">${title ? `<h2 class="group-title">${title}</h2>` : ''}${body}${foot ? `<p class="group-foot">${foot}</p>` : ''}</section>`;

// Anneau de progression (kcal).
export function ring(value, max, label, sub) {
  const r = 52, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const over = value > max;
  return `<svg class="ring" viewBox="0 0 128 128" role="img" aria-label="${esc(label)} ${esc(sub)}">
    <circle cx="64" cy="64" r="${r}" class="ring-bg"/>
    <circle cx="64" cy="64" r="${r}" class="ring-fg ${over ? 'over' : ''}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" transform="rotate(-90 64 64)"/>
    <text x="64" y="64" class="ring-big">${esc(label)}</text>
    <text x="64" y="82" class="ring-sub">${esc(sub)}</text>
  </svg>`;
}

export function bar(label, value, max, unit = 'g', cls = '') {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return `<div class="bar ${cls}" role="img" aria-label="${esc(label)} ${fmt(value)} / ${fmt(max)} ${unit}"><div class="bar-head"><span>${esc(label)}</span><span>${fmt(value)} / ${fmt(max)} ${unit}</span></div>
    <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div>`;
}

// Courbe : series = [{ points: [{x: Date|number, y}], cls, dots }], band = {y1, y2} optionnel.
export function lineChart(series, { height = 180, band = null, yPad = 1 } = {}) {
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) return `<p class="empty footnote">${t('Ajoute au moins 2 pesées pour voir la courbe.')}</p>`;
  const W = 340, H = height, L = 34, R = 8, T = 10, B = 22;
  const xs = all.map((p) => +p.x);
  let ys = all.map((p) => p.y);
  if (band) ys = ys.concat([band.y1, band.y2].filter((v) => v > Math.min(...ys) - 8 && v < Math.max(...ys) + 8));
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys) - yPad, y1 = Math.max(...ys) + yPad;
  const sx = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const sy = (y) => T + (1 - (y - y0) / (y1 - y0 || 1)) * (H - T - B);
  const ticks = [y0, (y0 + y1) / 2, y1].map((y) => `<text x="${L - 4}" y="${sy(y) + 4}" class="axis" text-anchor="end">${fmt(y, 1)}</text>
    <line x1="${L}" x2="${W - R}" y1="${sy(y)}" y2="${sy(y)}" class="grid"/>`).join('');
  const bandSvg = band ? `<rect x="${L}" width="${W - L - R}" y="${sy(Math.min(y1, band.y2))}" height="${Math.max(0, sy(Math.max(y0, band.y1)) - sy(Math.min(y1, band.y2)))}" class="band"/>` : '';
  const lines = series.map((s) => {
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(+p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
    const dots = s.dots ? s.points.map((p) => `<circle cx="${sx(+p.x)}" cy="${sy(p.y)}" r="2.5" class="${s.cls}-dot"/>`).join('') : '';
    return `<path d="${d}" class="${s.cls}"/>${dots}`;
  }).join('');
  const lab = (x, anchor) => `<text x="${sx(x)}" y="${H - 6}" class="axis" text-anchor="${anchor}">${fmtDate(x)}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${bandSvg}${ticks}${lines}${lab(x0, 'start')}${lab(x1, 'end')}</svg>`;
}

// Petit rendu Markdown sûr (titres, gras, listes, liens) pour les réponses IA.
export function md(text) {
  const lines = esc(text).split('\n');
  let html = '', list = false;
  for (let l of lines) {
    l = l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const li = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
    if (li) { if (!list) { html += '<ul>'; list = true; } html += `<li>${li[1]}</li>`; continue; }
    if (list) { html += '</ul>'; list = false; }
    const h = l.match(/^#{1,4}\s+(.*)/);
    if (h) html += `<h4>${h[1]}</h4>`;
    else if (l.trim()) html += `<p>${l}</p>`;
  }
  return html + (list ? '</ul>' : '');
}

export function toast(msg) {
  document.querySelectorAll('.toast').forEach((x) => x.remove());
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

// Feuille modale du bas (style iOS). Renvoie l'élément pour brancher les événements.
export function sheet(html, onClose) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><button class="icon-btn round sheet-close" aria-label="${t('Annuler')}">${icon('close')}</button>${html}</div>`;
  const close = () => { wrap.remove(); onClose && onClose(); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('.sheet-close')) close(); });
  document.body.appendChild(wrap);
  wrap.close = close;
  return wrap;
}

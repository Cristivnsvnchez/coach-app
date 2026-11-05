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
export function lineChart(series, { height = 180, band = null, yPad = 1, hline = null } = {}) {
  const all = series.flatMap((s) => s.points);
  if (all.length < 1) return `<p class="empty footnote">${t('Ajoute au moins 2 pesées pour voir la courbe.')}</p>`;
  const W = 340, H = height, L = 34, R = 8, T = 10, B = 22;
  const xs = all.map((p) => +p.x);
  let ys = all.map((p) => p.y);
  if (hline) ys = ys.concat(hline.y);
  if (band) ys = ys.concat([band.y1, band.y2].filter((v) => v > Math.min(...ys) - 8 && v < Math.max(...ys) + 8));
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys) - yPad, y1 = Math.max(...ys) + yPad;
  // Toutes les dates identiques (plusieurs séances le même jour) : on répartit les points par rang.
  const sameX = x1 === x0;
  const sx = (x, i = 0, n = 1) => L + (sameX ? (n > 1 ? i / (n - 1) : 0.5) : (x - x0) / (x1 - x0)) * (W - L - R);
  const sy = (y) => T + (1 - (y - y0) / (y1 - y0 || 1)) * (H - T - B);
  const ticks = [y0, (y0 + y1) / 2, y1].map((y) => `<text x="${L - 4}" y="${sy(y) + 4}" class="axis" text-anchor="end">${fmt(y, 1)}</text>
    <line x1="${L}" x2="${W - R}" y1="${sy(y)}" y2="${sy(y)}" class="grid"/>`).join('');
  const bandSvg = band ? `<rect x="${L}" width="${W - L - R}" y="${sy(Math.min(y1, band.y2))}" height="${Math.max(0, sy(Math.max(y0, band.y1)) - sy(Math.min(y1, band.y2)))}" class="band"/>` : '';
  const lines = series.map((s) => {
    const n = s.points.length;
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(+p.x, i, n).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
    const dots = s.dots ? s.points.map((p, i) => `<circle cx="${sx(+p.x, i, n)}" cy="${sy(p.y)}" r="2.5" class="${s.cls}-dot"/>`).join('') : '';
    return `<path d="${d}" class="${s.cls}"/>${dots}`;
  }).join('');
  const lab = (x, anchor, pos) => `<text x="${pos}" y="${H - 6}" class="axis" text-anchor="${anchor}">${fmtDate(x)}</text>`;
  const labels = sameX ? lab(x0, 'middle', (L + W - R) / 2) : lab(x0, 'start', L) + lab(x1, 'end', W - R);
  const hl = hline ? `<line x1="${L}" x2="${W - R}" y1="${sy(hline.y)}" y2="${sy(hline.y)}" class="hline"/><text x="${W - R - 2}" y="${sy(hline.y) - 4}" class="axis" text-anchor="end">${esc(hline.label || '')}</text>` : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="aspect-ratio:${W}/${H}" aria-hidden="true">${bandSvg}${ticks}${hl}${lines}${labels}</svg>`;
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

export function toast(msg, { undo = null, ms = undo ? 5000 : 2200 } = {}) {
  document.querySelectorAll('.toast').forEach((x) => x.remove());
  const el = document.createElement('div');
  el.className = 'toast' + (undo ? ' with-undo' : ''); el.setAttribute('role', 'status');
  const span = document.createElement('span'); span.textContent = msg; el.appendChild(span);
  // « Annuler » après une suppression : le bouton rejoue l'état d'avant (fourni par l'appelant), une seule fois.
  if (undo) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'toast-undo'; b.textContent = t('Annuler');
    b.onclick = () => { el.remove(); undo(); };
    el.appendChild(b);
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// Feuille modale du bas (style iOS). Renvoie l'élément pour brancher les événements.
// Feuille modale façon iOS : glisser vers le bas pour fermer, Échap, bouton retour du navigateur, focus géré.
let skipPop = 0;
export function sheet(html, onClose) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><span class="sheet-grab" aria-hidden="true"></span><button class="icon-btn round sheet-close" aria-label="${t('Annuler')}">${icon('close')}</button>${html}</div>`;
  const el = wrap.querySelector('.sheet'), before = document.activeElement;
  let closed = false;
  const close = (fromHistory = false) => {
    if (closed) return; closed = true;
    wrap.remove(); removeEventListener('keydown', onKey);
    if (!fromHistory && history.state?.sheet) { skipPop++; history.back(); }
    before?.focus?.({ preventScroll: true });
    onClose && onClose();
  };
  const onKey = (e) => { if (e.key === 'Escape' && wrap === [...document.querySelectorAll('.sheet-wrap')].pop()) close(); };
  addEventListener('keydown', onKey);
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('.sheet-close')) close(); });
  dragToClose(el, () => close());
  document.body.appendChild(wrap);
  history.pushState({ ...(history.state || {}), sheet: true }, '');
  if (matchMedia('(pointer: fine)').matches) (el.querySelector('input:not([type=hidden]), select, textarea') || el.querySelector('.sheet-close'))?.focus({ preventScroll: true });
  wrap.close = close;
  return wrap;
}

// Appelé par le routeur sur « popstate » : true si l'évènement concernait une feuille (fermée ici).
export function sheetPop() {
  if (skipPop) { skipPop--; return true; }
  const open = [...document.querySelectorAll('.sheet-wrap')].pop();
  if (open) { open.close?.(true); return true; }
  return false;
}

// Glisser une feuille vers le bas (doigt seulement, quand elle est défilée en haut) : > 110 px ou geste rapide = fermer.
function dragToClose(el, close) {
  let y0 = 0, t0 = 0, dy = 0, active = false;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || el.scrollTop > 0 || e.target.closest('input, textarea, select, .seg, .chips, [data-nodrag]')) return;
    y0 = e.clientY; t0 = e.timeStamp; dy = 0; active = true;
  });
  el.addEventListener('pointermove', (e) => {
    if (!active) return;
    dy = e.clientY - y0;
    if (dy <= 0) { el.style.transform = ''; return; }
    el.classList.add('dragging'); el.style.transform = `translateY(${dy}px)`;
  });
  const end = (e) => {
    if (!active) return; active = false; el.classList.remove('dragging');
    const fast = dy > 40 && dy / Math.max(1, e.timeStamp - t0) > 0.6;
    if (dy > 110 || fast) { el.classList.add('closing'); el.style.transform = 'translateY(100%)'; setTimeout(close, 200); }
    else el.style.transform = '';
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}

// Bandeau discret en haut (hors ligne, mise à jour…), avec une action facultative.
export function banner(msg, { action, onAction, ms = action ? 0 : 3200 } = {}) {
  document.querySelectorAll('.tm-banner').forEach((x) => x.remove());
  const el = document.createElement('div');
  el.className = 'tm-banner'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button class="btn filled" data-go>${esc(action)}</button><button class="icon-btn tm-banner-x" data-x aria-label="${t('Fermer')}">${icon('close')}</button>` : ''}`;
  el.querySelector('[data-go]')?.addEventListener('click', () => { el.remove(); onAction?.(); });
  el.querySelector('[data-x]')?.addEventListener('click', () => el.remove());
  document.body.appendChild(el);
  if (ms) setTimeout(() => el.remove(), ms);
  return el;
}

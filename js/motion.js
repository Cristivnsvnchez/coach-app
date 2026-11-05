// Motion : petits utilitaires d'animation (compteur animé, préférence « réduire les animations »).
import { fmt } from './ui.js';

export const reducedMotion = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const running = new WeakMap(); // élément → identifiant du requestAnimationFrame en cours
const easeOutCubic = (x) => 1 - (1 - x) ** 3;

// Fait défiler le nombre affiché dans `el` de `from` à `to` (format français, comme fmt). Relancer sur le même
// élément annule l'animation précédente. Le texte final est toujours `to`, même si la page est masquée ou l'animation coupée.
export function countUp(el, from, to, ms = 600) {
  if (!el) return;
  cancelAnimationFrame(running.get(el));
  running.delete(el);
  if (reducedMotion() || !Number.isFinite(from) || !Number.isFinite(to) || from === to || ms <= 0) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / ms);
    el.textContent = fmt(Math.round(from + (to - from) * easeOutCubic(p)));
    if (p < 1) running.set(el, requestAnimationFrame(step));
    else running.delete(el);
  };
  running.set(el, requestAnimationFrame(step));
}

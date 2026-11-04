// Vue « learn » : à implémenter (voir docs/plan-trackme.md). Contrat : export function render(root, go, arg).
import { nav } from '../ui.js';
import { t } from '../i18n.js';
export function render(root) { root.innerHTML = nav(t('learn')) + '<p class="empty">…</p>'; }

// Onglet Aujourd'hui : kcal restantes, macros, eau, repas.
import { state, save, dayLog, sum, today } from '../store.js';
import { current } from '../metrics.js';
import { isoDate, parseDate } from '../science.js';
import { esc, fmt, ring, bar, fmtDate, toast } from '../ui.js';
import { openAddFood, MEALS } from './addfood.js';

let date = null;
let renderedOn = null; // jour réel du dernier rendu : si on a changé de jour, on revient à aujourd'hui

export function render(root, go) {
  if (!date || renderedOn !== today()) date = today();
  renderedOn = today();
  const log = dayLog(date);
  const tot = sum(log.meals);
  const { targets, energy, blocked } = current();
  const shift = (n) => { const d = parseDate(date); d.setDate(d.getDate() + n); date = isoDate(d); render(root, go); };
  const isToday = date === today();

  root.innerHTML = `
    <header class="top"><button class="icon" data-a="prev" aria-label="Jour précédent">‹</button>
      <h1>${isToday ? "Aujourd'hui" : esc(fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' }))}</h1>
      <button class="icon" data-a="next" aria-label="Jour suivant" ${isToday ? 'disabled' : ''}>›</button></header>
    ${blocked ? `<div class="card cta"><b>Objectifs chiffrés désactivés</b><p class="muted">Ta situation (âge < 18 ans, grossesse/allaitement, trouble alimentaire ou pathologie) nécessite un suivi par un professionnel de santé. Le journal reste disponible.</p></div>` : !targets ? `<div class="card cta"><b>Complète ton profil</b><p class="muted">Âge, taille, poids, activité et objectif pour calculer tes besoins.</p><button class="btn primary" data-a="profile">Compléter</button></div>` : `
    <section class="card summary">
      ${ring(tot.kcal, targets.kcal, fmt(Math.abs(targets.kcal - tot.kcal)), tot.kcal > targets.kcal ? 'kcal en trop' : 'kcal restantes')}
      <div class="macros">
        ${bar('Protéines', tot.p, targets.protein, 'g', 'p')}
        ${bar('Glucides', tot.c, targets.carbs, 'g', 'c')}
        ${bar('Lipides', tot.f, targets.fat, 'g', 'f')}
        ${bar('Fibres', tot.fib, targets.fiber, 'g', 'fib')}
      </div>
      <p class="muted small span">Objectif ${fmt(targets.kcal)} kcal · mangé ${fmt(tot.kcal)} · dépense ${energy.method === 'adaptatif' ? 'adaptative' : 'estimée'} ${fmt(targets.tdee)} kcal${targets.floored ? ' · plancher de sécurité appliqué' : ''}</p>
    </section>`}
    <section class="card water">
      <div><b>Eau</b><small class="muted block">${fmt(log.water / 1000, 2)} / ${fmt(targets?.waterL ?? 2, 1)} L (boissons + aliments)</small></div>
      <div class="row"><button class="btn ghost" data-a="water-">−</button><button class="btn" data-a="water+">+ 250 ml</button></div>
    </section>
    ${Object.entries(MEALS).map(([k, label]) => {
      const items = log.meals.filter((m) => m.meal === k);
      const t = sum(items);
      return `<section class="card meal"><div class="meal-head"><b>${label}</b><span class="muted">${fmt(t.kcal)} kcal</span></div>
        ${items.length ? `<ul class="list">${items.map((m) => `<li><div><b>${esc(m.name)}</b><small>${fmt(m.grams)} g · ${fmt(m.kcal)} kcal · P ${fmt(m.p, 1)} g</small></div><button class="icon del" data-del="${esc(m.id)}" aria-label="Supprimer">✕</button></li>`).join('')}</ul>` : ''}
        <button class="btn ghost wide" data-add="${k}">＋ Ajouter</button></section>`;
    }).join('')}
    <button class="btn ghost wide" data-a="copy">⧉ Copier les repas de la veille</button>`;

  root.onclick = (e) => {
    const t = e.target.closest('[data-a],[data-add],[data-del]');
    if (!t) return;
    const a = t.dataset.a;
    if (a === 'prev') return shift(-1);
    if (a === 'next') return shift(1);
    if (a === 'profile') return go('profile');
    if (a === 'water+' || a === 'water-') { log.water = Math.max(0, log.water + (a === 'water+' ? 250 : -250)); save(); return render(root, go); }
    if (a === 'copy') {
      const d = parseDate(date); d.setDate(d.getDate() - 1);
      const prev = state.logs[isoDate(d)];
      if (!prev?.meals.length) return toast('Rien à copier pour la veille');
      prev.meals.forEach((m) => log.meals.push({ ...m, id: Math.random().toString(36).slice(2, 10) }));
      save(); toast(`${prev.meals.length} aliments copiés`); return render(root, go);
    }
    if (t.dataset.add) return openAddFood(t.dataset.add, date, () => render(root, go));
    if (t.dataset.del) { log.meals = log.meals.filter((m) => m.id !== t.dataset.del); save(); render(root, go); }
  };
}

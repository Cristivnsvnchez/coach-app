// Onglet Aujourd'hui : kcal restantes, macros, eau, repas.
import { state, save, dayLog, sum, today, uid } from '../store.js';
import { current } from '../metrics.js';
import { isoDate, parseDate } from '../science.js';
import { esc, fmt, ring, bar, fmtDate, toast, nav, group } from '../ui.js';
import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { openAddFood, MEALS } from './addfood.js';
import { habitsSection, handleHabitClick } from './habits.js';

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
  const title = isToday ? t("Aujourd'hui") : fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
  const left = targets ? Math.abs(targets.kcal - tot.kcal) : 0;

  root.innerHTML = `
    ${nav(title, {
      left: `<button class="icon-btn" data-a="prev" aria-label="${t('Jour précédent')}">${icon('chevronLeft')}</button>`,
      right: `<button class="icon-btn" data-a="next" aria-label="${t('Jour suivant')}" ${isToday ? 'disabled' : ''}>${icon('chevronRight')}</button>`,
    })}
    ${blocked ? `<div class="cta"><b class="headline">${t('Objectifs chiffrés désactivés')}</b><p>${t('Ta situation (âge < 18 ans, grossesse/allaitement, trouble alimentaire ou pathologie) nécessite un suivi par un professionnel de santé. Le journal reste disponible.')}</p></div>`
    : !targets ? `<div class="cta"><b class="headline">${t('Complète ton profil')}</b><p>${t('Âge, taille, poids, activité et objectif pour calculer tes besoins.')}</p><button class="btn filled" data-a="profile">${t('Compléter')}</button></div>`
    : group('', `
      <div class="summary">
        ${ring(tot.kcal, targets.kcal, fmt(left), tot.kcal > targets.kcal ? t('kcal en trop') : t('kcal restantes'))}
        <div class="macros">
          ${bar(t('Protéines'), tot.p, targets.protein, 'g', 'p')}
          ${bar(t('Glucides'), tot.c, targets.carbs, 'g', 'c')}
          ${bar(t('Lipides'), tot.f, targets.fat, 'g', 'f')}
          ${bar(t('Fibres'), tot.fib, targets.fiber, 'g', 'fib')}
        </div>
      </div>`,
      `${t('Objectif')} ${fmt(targets.kcal)} kcal · ${t('mangé')} ${fmt(tot.kcal)} · ${energy.method === 'adaptatif' ? t('dépense adaptative') : t('dépense estimée')} ${fmt(targets.tdee)} kcal${targets.floored ? ' · ' + t('plancher de sécurité appliqué') : ''}`)}
    ${group('', `<div class="cells"><div class="cell with-icon">
      <span class="badge bg-teal">${icon('drop')}</span>
      <div class="grow"><span class="t headline">${t('Eau')}</span><span class="s num">${fmt(log.water / 1000, 2)} / ${fmt(targets?.waterL ?? 2, 1)} L ${t('(boissons + aliments)')}</span></div>
      <div class="stepper"><button class="icon-btn round" data-a="water-" aria-label="−250 ml">${icon('minus')}</button><button class="icon-btn round" data-a="water+" aria-label="+250 ml">${icon('plus')}</button></div>
    </div></div>`)}
    ${habitsSection(date)}
    ${Object.entries(MEALS).map(([k, label]) => {
      const items = log.meals.filter((m) => m.meal === k);
      const s = sum(items);
      return group(`${t(label)}<b class="num">${fmt(s.kcal)} kcal</b>`, `<ul class="cells">
        ${items.map((m) => `<li class="cell"><div class="grow"><span class="t">${esc(m.name)}</span><span class="s num">${m.grams ? fmt(m.grams) + ' g · ' : ''}${fmt(m.kcal)} kcal · P ${fmt(m.p, 1)} g</span></div>
          <button class="icon-btn" data-del="${esc(m.id)}" aria-label="${t('Supprimer')} ${esc(m.name)}">${icon('trash')}</button></li>`).join('')}
        <li class="cell action" data-add="${k}" role="button">${icon('plus')} ${t('Ajouter')}</li></ul>`);
    }).join('')}
    ${group('', `<div class="cells"><div class="cell action" data-a="copy" role="button">${icon('copy')} ${t('Copier les repas de la veille')}</div></div>`)}`;

  root.onclick = (e) => {
    if (handleHabitClick(e, date, () => { const y = root.scrollTop; render(root, go); root.scrollTop = y; })) return;
    const el = e.target.closest('[data-a],[data-add],[data-del]');
    if (!el) return;
    const a = el.dataset.a;
    if (a === 'prev') return shift(-1);
    if (a === 'next') return shift(1);
    if (a === 'profile') return go('profile');
    if (a === 'water+' || a === 'water-') { log.water = Math.max(0, log.water + (a === 'water+' ? 250 : -250)); save(); return render(root, go); }
    if (a === 'copy') {
      const d = parseDate(date); d.setDate(d.getDate() - 1);
      const prev = state.logs[isoDate(d)];
      if (!prev?.meals.length) return toast(t('Rien à copier pour la veille'));
      prev.meals.forEach((m) => log.meals.push({ ...m, id: uid() }));
      save(); toast(t('{n} aliments copiés', { n: prev.meals.length })); return render(root, go);
    }
    if (el.dataset.add) return openAddFood(el.dataset.add, date, () => render(root, go));
    if (el.dataset.del) { log.meals = log.meals.filter((m) => m.id !== el.dataset.del); save(); render(root, go); }
  };
}

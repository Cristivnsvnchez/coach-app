// Onglet Aujourd'hui : anneau kcal + macros en haut, checklist repliable et eau, puis les repas en une seule liste.
// Sur écran large (iPad, ordinateur), deux colonnes : résumé à gauche, repas à droite.
import { state, save, dayLog, sum, today, uid } from '../store.js';
import { current } from '../metrics.js';
import { isoDate, parseDate } from '../science.js';
import { esc, fmt, ring, bar, fmtDate, toast, nav, group, sheet } from '../ui.js';
import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { openAddFood, MEALS } from './addfood.js';
import { habitsCells, handleHabitClick } from './habits.js';

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
  const waterGoal = (targets?.waterL ?? 2) * 1000;
  const keep = () => { const y = root.scrollTop; render(root, go); root.scrollTop = y; };

  const summary = blocked ? `<div class="cta"><b class="headline">${t('Objectifs chiffrés désactivés')}</b><p>${t('Ta situation (âge < 18 ans, grossesse/allaitement, trouble alimentaire ou pathologie) nécessite un suivi par un professionnel de santé. Le journal reste disponible.')}</p></div>`
    : !targets ? `<div class="cta"><b class="headline">${t('Complète ton profil')}</b><p>${t('Âge, taille, poids, activité et objectif pour calculer tes besoins.')}</p><button class="btn filled" data-a="profile">${t('Compléter')}</button></div>`
    : group('', `<div class="summary">
        ${ring(tot.kcal, targets.kcal, fmt(left), tot.kcal > targets.kcal ? t('kcal en trop') : t('kcal restantes'))}
        <div class="macros">
          ${bar(t('Protéines'), tot.p, targets.protein, 'g', 'p')}
          ${bar(t('Glucides'), tot.c, targets.carbs, 'g', 'c')}
          ${bar(t('Lipides'), tot.f, targets.fat, 'g', 'f')}
          ${bar(t('Fibres'), tot.fib, targets.fiber, 'g', 'fib')}
        </div></div>`,
      `${t('Objectif')} ${fmt(targets.kcal)} kcal · ${t('mangé')} ${fmt(tot.kcal)} · ${energy.method === 'adaptatif' ? t('dépense adaptative') : t('dépense estimée')} ${fmt(targets.tdee)}${targets.floored ? ' · ' + t('plancher de sécurité appliqué') : ''}`);

  const quick = group('', `<ul class="cells">
      ${habitsCells(date)}
      <li class="cell">
        <span class="mini-ring water" style="--p:${Math.min(100, Math.round((log.water / waterGoal) * 100))}%" aria-hidden="true"></span>
        <div class="grow"><span class="t">${t('Eau')}</span><span class="s num">${fmt(log.water / 1000, 2)} / ${fmt(waterGoal / 1000, 1)} L</span></div>
        <div class="stepper"><button class="icon-btn" data-a="water-" aria-label="−250 ml">${icon('minus')}</button><button class="icon-btn round" data-a="water+" aria-label="+250 ml">${icon('plus')}</button></div>
      </li></ul>`);

  const meals = group(`${t('Repas')}<b class="num">${fmt(tot.kcal)} kcal</b>`, `<ul class="cells meals">${Object.entries(MEALS).map(([k, label]) => {
      const items = log.meals.filter((m) => m.meal === k);
      return `<li class="cell meal-head"><div class="grow"><span class="t headline">${t(label)}</span></div>
          <span class="val num">${fmt(sum(items).kcal)}</span>
          <button class="icon-btn round" data-add="${k}" aria-label="${t('Ajouter')} — ${t(label)}">${icon('plus')}</button></li>
        ${items.map((m) => `<li class="cell sub tap" data-item="${esc(m.id)}"><div class="grow"><span class="t">${esc(m.name)}</span>
          <span class="s num">${m.grams ? fmt(m.grams) + ' g · ' : ''}P ${fmt(m.p, 0)} · G ${fmt(m.c, 0)} · L ${fmt(m.f, 0)}</span></div><span class="val num">${fmt(m.kcal)}</span></li>`).join('')}`;
    }).join('')}</ul>`)
    + `<button class="btn plain wide" data-a="copy">${icon('copy')} ${t('Copier les repas de la veille')}</button>`;

  root.innerHTML = `
    ${nav(title, {
      left: `<button class="icon-btn" data-a="prev" aria-label="${t('Jour précédent')}">${icon('chevronLeft')}</button>`,
      right: `<button class="icon-btn" data-a="next" aria-label="${t('Jour suivant')}" ${isToday ? 'disabled' : ''}>${icon('chevronRight')}</button>`,
    })}
    <div class="split"><div>${summary}${quick}</div><div>${meals}</div></div>`;

  root.onclick = (e) => {
    if (handleHabitClick(e, date, keep)) return;
    const el = e.target.closest('[data-a],[data-add],[data-item]');
    if (!el) return;
    const a = el.dataset.a;
    if (a === 'prev') return shift(-1);
    if (a === 'next') return shift(1);
    if (a === 'profile') return go('profile');
    if (a === 'water+' || a === 'water-') { log.water = Math.max(0, log.water + (a === 'water+' ? 250 : -250)); save(); return keep(); }
    if (a === 'copy') {
      const d = parseDate(date); d.setDate(d.getDate() - 1);
      const prev = state.logs[isoDate(d)];
      if (!prev?.meals.length) return toast(t('Rien à copier pour la veille'));
      prev.meals.forEach((m) => log.meals.push({ ...m, id: uid() }));
      save(); toast(t('{n} aliments copiés', { n: prev.meals.length })); return keep();
    }
    if (el.dataset.add) return openAddFood(el.dataset.add, date, keep);
    if (el.dataset.item) return editItem(log, el.dataset.item, keep);
  };
}

// Feuille d'un aliment du journal : changer la quantité (macros recalculées au prorata) ou supprimer.
function editItem(log, id, done) {
  const m = log.meals.find((x) => x.id === id);
  if (!m) return;
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${esc(m.name)}</h3></div>
    ${group('', `<div class="cells">
      ${m.grams ? `<label class="cell field"><span>${t('Quantité (g)')}</span><input name="g" type="number" inputmode="decimal" value="${m.grams}"></label>` : ''}
      <div class="cell"><span class="grow secondary preview-line num"></span></div></div>`)}
    ${m.grams ? `<button class="btn filled large" data-a="save">${t('Enregistrer')}</button>` : ''}
    ${group('', `<div class="cells"><div class="cell action destructive" data-a="del" role="button">${t('Supprimer')}</div></div>`)}`, done);
  const g = s.querySelector('[name=g]'), pv = s.querySelector('.preview-line');
  const scaled = () => { const k = g ? (+g.value || 0) / m.grams : 1; return { kcal: Math.round(m.kcal * k), p: m.p * k, c: m.c * k, f: m.f * k, fib: m.fib * k }; };
  const upd = () => { const v = scaled(); pv.textContent = `${v.kcal} kcal · P ${fmt(v.p, 1)} · G ${fmt(v.c, 1)} · L ${fmt(v.f, 1)} g`; };
  if (g) g.oninput = upd;
  upd();
  s.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'save') {
      const v = scaled();
      Object.assign(m, { grams: +g.value || m.grams, kcal: v.kcal, p: +v.p.toFixed(1), c: +v.c.toFixed(1), f: +v.f.toFixed(1), fib: +v.fib.toFixed(1) });
      save(); s.close();
    }
    if (a === 'del') { log.meals = log.meals.filter((x) => x.id !== id); save(); s.close(); }
  });
}

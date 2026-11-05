// Onglet Profil : langue, données perso, objectif, clé API, sauvegarde, références.
import * as S from '../science.js';
import { state, save, replace, today } from '../store.js';
import { current } from '../metrics.js';
import { MODELS, usage, testConnection } from '../ai.js';
import { esc, fmt, fmtDate, toast, nav, group, sheet } from '../ui.js';
import { icon } from '../icons.js';
import { t, getLang, setLang, LANGS } from '../i18n.js';
import { paletteSection, handlePaletteClick } from './palette.js';
import { exportBackup } from '../install.js';

const opt = (obj, sel, lab = (v) => v.label ?? v) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${String(k) === String(sel) ? 'selected' : ''}>${esc(t(lab(v)))}</option>`).join('');
const rateOpts = (goal, sel) => opt(Object.fromEntries((S.GOALS[goal]?.rates || [0]).map((r) => [r, r ? t('{r} % du poids / semaine', { r: fmt(r, 2).replace(/[,.]?0+$/, '') }) : '—'])), sel);

export function render(root, go) {
  const p = state.profile, st = state.settings;
  const { targets, energy, auto } = current();
  const num = (name, label, val, attrs = '') => `<label class="cell field"><span>${label}</span><input name="${name}" type="number" inputmode="decimal" value="${val ?? ''}" ${attrs}></label>`;
  const sel = (name, label, options) => `<label class="cell field"><span>${label}</span><select name="${name}">${options}</select></label>`;
  const txt = (name, label, val, ph = '') => `<label class="cell field"><span>${label}</span><input name="${name}" value="${esc(val ?? '')}" placeholder="${esc(ph)}"></label>`;

  root.innerHTML = `
    ${nav(t('Profil'))}
    ${group(t('Apparence'), `<div class="cells"><div class="cell pal-cell">${paletteSection()}</div></div>`)}
    ${group(t('Langue'), `<div class="cells"><div class="cell"><div class="seg" style="flex:1" role="tablist">${Object.entries(LANGS).map(([k, l]) => `<button type="button" data-lang="${k}" class="${getLang() === k ? 'on' : ''}" aria-selected="${getLang() === k}">${l}</button>`).join('')}</div></div></div>`)}
    ${targets ? group(targets.custom ? t('Mes objectifs (personnalisés)') : t('Tes besoins calculés'), `<div class="cells"><div class="stats">
        <div><small>${t('Dépense')}</small><b>${fmt(targets.tdee)}</b><small>${energy.method === 'adaptatif' ? t('adaptative ({n} j)', { n: energy.loggedDays }) : t('formule')}</small></div>
        <div><small>${t('Objectif')}</small><b>${fmt(targets.kcal)}</b><small>${t('kcal/j')}</small></div>
        <div><small>${t('Protéines')}</small><b>${fmt(targets.protein)} g</b><small>${fmt(targets.protein / p.weight, 1)} g/kg</small></div>
      </div>
      <div class="cell"><span class="grow subhead secondary num">${t('Lipides')} ${fmt(targets.fat)} g · ${t('Glucides')} ${fmt(targets.carbs)} g · ${t('Fibres')} ${fmt(targets.fiber)} g</span></div>
      <div class="cell action" data-a="edit-needs" role="button">${icon('pencil')} ${t('Modifier mes objectifs')}</div></div>`,
      t("Formule de départ : Mifflin-St Jeor{k} × niveau d'activité FAO/OMS. Après 10 jours de saisie et des pesées sur ≥ 7 jours, la dépense s'ajuste à tes résultats réels (apport moyen − variation de la tendance × 7700 kcal/kg).", { k: p.bodyFat ? ' / Katch-McArdle' : '' })) : ''}
    <form data-f="profile">
      ${group(t('Mes informations'), `<div class="cells">
        ${sel('sex', t('Sexe'), `<option value="">—</option>${opt({ M: 'Homme', F: 'Femme' }, p.sex)}`)}
        ${num('age', t('Âge'), p.age, 'inputmode="numeric"')}
        ${num('height', t('Taille (cm)'), p.height)}
        ${num('weight', t('Poids (kg)'), p.weight, 'step="0.1"')}
        ${num('bodyFat', t('% masse grasse (optionnel, plus précis)'), p.bodyFat, 'step="0.1" placeholder="—"')}
        ${sel('activity', t('Activité'), opt(S.PAL, p.activity))}</div>`)}
      ${group(t('Mon objectif'), `<div class="cells">
        ${sel('goal', t('Objectif'), opt(S.GOALS, p.goal))}
        ${sel('rate', t('Rythme'), rateOpts(p.goal, p.rate))}
        ${num('sessions', t('Séances / sem'), p.sessions ?? 3, 'inputmode="numeric"')}
        ${sel('equipment', t('Matériel'), opt({ salle: 'Salle complète', maison: 'Haltères à la maison', aucun: 'Poids du corps' }, p.equipment))}</div>`)}
      ${group(t('Préférences'), `<div class="cells">
        ${txt('diet', t('Régime / préférences'), p.diet, t('Ex : végétarien, halal, pas de poisson'))}
        ${txt('allergies', t('Allergies / intolérances'), p.allergies, '—')}
        <div class="cell toggle-row"><span class="grow subhead">${t('Grossesse/allaitement, trouble du comportement alimentaire ou pathologie chronique')}</span>
          <label class="switch"><input type="checkbox" name="medical" ${p.medical ? 'checked' : ''} aria-label="${t('Grossesse/allaitement, trouble du comportement alimentaire ou pathologie chronique')}"><span></span></label></div></div>`)}
      <button class="btn filled large" style="margin-bottom:1.75rem">${t('Enregistrer')}</button>
    </form>
    <form data-f="ai">${group(t('Intelligence artificielle'), `<div class="cells">
      <label class="cell field"><span>${t('Clé API Claude')}</span><input name="apiKey" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(st.apiKey)}"></label>
      ${sel('model', t('Modèle'), opt(MODELS, st.model))}
      <label class="cell field"><span>${t('Budget mensuel (€)')}</span><input name="budgetEur" type="number" inputmode="decimal" min="0" step="1" value="${st.budgetEur ?? 10}"></label>
      <div class="cell" style="display:block">${(() => { const u = usage(); const pct = u.budget ? Math.min(100, (u.eur / u.budget) * 100) : 0;
        return `<div class="bar-head"><span>${t('Dépensé ce mois-ci')}</span><span>${fmt(u.eur, 2)} € / ${fmt(u.budget)} € · ${u.calls} ${t('requêtes')}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;${pct >= 80 ? 'background:var(--orange)' : ''}"></div></div>`; })()}</div>
      <button type="button" class="cell action" data-a="test" style="border:0;width:100%;background:none;font:inherit">${t('Tester la connexion')}</button>
      <button class="cell action" style="border:0;width:100%;background:none;font:inherit">${t('Enregistrer')}</button></div>`,
      t("La clé reste sur ce téléphone et n'est envoyée qu'à api.anthropic.com. Crée-la sur console.anthropic.com → API Keys, et fixe une limite de dépense mensuelle.") + ' ' + t("L'app bloque toute requête qui pourrait dépasser ton budget (estimation : tarifs publics, 1 $ ≈ 0,92 €). Pour une garantie absolue, fixe aussi la même limite dans console.anthropic.com → Billing → Limits."))}</form>
    ${group(t('Sauvegarde'), `<div class="cells">
      <div class="cell tap with-icon" data-a="export" role="button"><span class="badge bg-blue">${icon('share')}</span><span class="grow"><span class="t">${t('Sauvegarder mes données')}</span><span class="s">${state.lastBackup ? t('Dernière sauvegarde : {d}', { d: fmtDate(state.lastBackup, { day: 'numeric', month: 'long' }) }) : t('Jamais sauvegardé · vers Fichiers ou iCloud Drive')}</span></span>${icon('chevronRight', { cls: 'chev' })}</div>
      <label class="cell field"><span>${t('Me le rappeler')}</span><select name="backupEvery" data-backup-every>${[[7, t('Chaque semaine')], [30, t('Chaque mois')], [0, t('Jamais')]].map(([v, l]) => `<option value="${v}" ${v === (state.settings.backupEvery ?? 7) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="cell tap with-icon"><span class="badge bg-green">${icon('download')}</span><span class="grow">${t('Importer')}</span>${icon('chevronRight', { cls: 'chev' })}<input type="file" accept="application/json" hidden data-a="import"></label>
    </div>`, t('Tes données sont uniquement sur ce téléphone. Exporte-les régulièrement (Fichiers / iCloud Drive).'))}
    ${group(t('Références scientifiques'), `<ul class="cells md-ref">${S.REFS.map((r) => `<li class="cell tap"><a href="${r.url}" target="_blank" rel="noopener" class="grow"><div class="grow"><span class="t">${esc(r.k)}</span><span class="s" style="white-space:normal">${esc(r.t)}</span></div>${icon('chevronRight', { cls: 'chev' })}</a></li>`).join('')}</ul>`,
      t('Cette app ne remplace pas un avis médical.'))}
    ${group('', `<div class="cells"><div class="cell action destructive" data-a="reset" role="button">${t('Tout effacer')}</div></div>`)}`;

  root.querySelector('[data-f=profile]').onsubmit = (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    const n = (x) => (x === '' || x == null ? null : parseFloat(String(x).replace(',', '.')));
    const rates = S.GOALS[v.goal].rates;
    Object.assign(state.profile, {
      sex: v.sex, age: n(v.age), height: n(v.height), weight: n(v.weight), bodyFat: n(v.bodyFat),
      activity: v.activity, goal: v.goal, rate: v.goal === 'maintien' ? 0 : (rates.includes(n(v.rate)) ? n(v.rate) : rates[Math.min(1, rates.length - 1)]),
      sessions: n(v.sessions), equipment: v.equipment, diet: v.diet, allergies: v.allergies, medical: !!v.medical,
    });
    // La première saisie de poids alimente aussi la courbe.
    if (state.profile.weight && !state.weights.length) state.weights.push({ date: today(), kg: state.profile.weight });
    save(); toast(t('Profil enregistré')); const y = root.scrollTop; render(root, go); root.scrollTop = y;
  };
  // Changer d'objectif ne met à jour que la liste des rythmes (sans perdre la saisie en cours).
  root.querySelector('[data-f=profile] [name=goal]').onchange = (e) => {
    const rs = S.GOALS[e.target.value].rates;
    root.querySelector('[data-f=profile] [name=rate]').innerHTML = rateOpts(e.target.value, rs[Math.min(1, rs.length - 1)]);
  };
  root.querySelector('[data-f=ai]').onsubmit = (e) => {
    e.preventDefault();
    state.settings.apiKey = e.target.apiKey.value.trim();
    state.settings.model = e.target.model.value;
    state.settings.budgetEur = Math.max(0, parseFloat(String(e.target.budgetEur.value).replace(',', '.')) || 0);
    save(); toast(t('Réglages IA enregistrés'));
  };
  root.querySelector('[data-backup-every]')?.addEventListener('change', (e) => { state.settings.backupEvery = +e.target.value; save(); });
  root.onclick = (e) => {
    if (handlePaletteClick(e, () => { const y = root.scrollTop; render(root, go); root.scrollTop = y; })) return;
    const lg = e.target.closest('[data-lang]');
    if (lg) { setLang(lg.dataset.lang); return go('profile'); }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'edit-needs') return editNeeds(auto, () => render(root, go));
    if (a === 'test') {
      const f = root.querySelector('[data-f=ai]');
      state.settings.apiKey = f.apiKey.value.trim(); save();
      toast(t('Test en cours…'));
      testConnection().then(() => { toast(t('Connexion OK ✓')); const y = root.scrollTop; render(root, go); root.scrollTop = y; })
        .catch((err) => toast(t(err.message, err.vars)));
      return;
    }
    if (a === 'export') return exportBackup();
    if (a === 'reset' && confirm(t("Effacer TOUTES les données de l'app ? (irréversible)"))) { replace({}); render(root, go); }
  };
  root.querySelector('[data-a=import]').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.profile || !data.logs) throw new Error(t('Fichier non reconnu'));
      if (!confirm(t('Remplacer les données actuelles par cette sauvegarde ?'))) return;
      // On garde les secrets de cet appareil (absents des sauvegardes).
      const keep = state.strava ? { clientSecret: state.strava.clientSecret, token: state.strava.token, refresh: state.strava.refresh, expiresAt: state.strava.expiresAt } : {};
      replace({ ...data, settings: { ...data.settings, apiKey: state.settings.apiKey }, strava: data.strava ? { ...data.strava, ...keep } : state.strava });
      toast(t('Sauvegarde restaurée')); render(root, go);
    } catch (err) { toast(t('Import impossible : {e}', { e: err.message })); }
  };
}

// Modifier ses objectifs : champs vides = valeur calculée ; glucides vides = reste des kcal.
function editNeeds(auto, done) {
  const c = state.profile.custom || {};
  const f = (k, label, unit) => `<label class="cell field"><span>${label}</span><input name="${k}" type="number" inputmode="numeric" value="${c.enabled && c[k] ? c[k] : ''}" placeholder="${fmt(auto[k])} ${unit}"></label>`;
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Mes objectifs')}</h3></div>
    <form>${group('', `<div class="cells">${f('kcal', t('Calories'), 'kcal')}${f('protein', t('Protéines'), 'g')}${f('fat', t('Lipides'), 'g')}${f('carbs', t('Glucides'), 'g')}</div>`,
      t('Laisse un champ vide pour garder la valeur calculée (en gris). Glucides vides = le reste de tes calories. Par sécurité, les calories ne descendent jamais sous 1200 (femme) / 1500 (homme).'))}
      <p class="footnote secondary live-check" style="margin:-.75rem .25rem 1rem"></p>
      <button class="btn filled large">${t('Enregistrer')}</button></form>
    ${c.enabled ? group('', `<div class="cells"><div class="cell action" data-a="reset-needs" role="button">${t('Revenir au calcul automatique')}</div></div>`) : ''}`, done);
  const form = s.querySelector('form');
  const read = () => Object.fromEntries(['kcal', 'protein', 'fat', 'carbs'].map((k) => [k, parseFloat(form[k].value) || null]));
  const check = () => {
    const r = S.applyCustom(auto, { enabled: true, ...read() }, state.profile.sex);
    s.querySelector('.live-check').textContent = `→ ${fmt(r.kcal)} kcal · P ${fmt(r.protein)} · L ${fmt(r.fat)} · G ${fmt(r.carbs)} g`
      + (r.mismatch ? ' · ' + t('Attention : tes macros ne correspondent pas aux calories saisies.') : '') + (r.floored ? ' · ' + t('plancher de sécurité appliqué') : '');
  };
  form.addEventListener('input', check); check();
  form.onsubmit = (e) => {
    e.preventDefault();
    const v = read();
    state.profile.custom = Object.values(v).some(Boolean) ? { enabled: true, ...v } : null;
    save(); toast(t('Objectifs enregistrés')); s.close();
  };
  s.querySelector('[data-a=reset-needs]')?.addEventListener('click', () => { state.profile.custom = null; save(); s.close(); });
}

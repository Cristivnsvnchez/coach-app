// Onglet Profil : données perso, objectif, clé API, sauvegarde, références.
import * as S from '../science.js';
import { state, save, replace, today } from '../store.js';
import { current } from '../metrics.js';
import { MODELS } from '../ai.js';
import { esc, fmt, toast } from '../ui.js';

const opt = (obj, sel, lab = (v) => v.label ?? v) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${String(k) === String(sel) ? 'selected' : ''}>${esc(lab(v))}</option>`).join('');

export function render(root, go) {
  const p = state.profile, st = state.settings;
  const { targets, energy } = current();
  const rates = Object.fromEntries((S.GOALS[p.goal]?.rates || [0]).map((r) => [r, r ? `${String(r).replace('.', ',')} % du poids / semaine` : '—']));

  root.innerHTML = `
    <header class="top"><h1>Profil</h1></header>
    <form class="card grid2" data-f="profile">
      <label>Sexe<select name="sex"><option value="">—</option>${opt({ M: 'Homme', F: 'Femme' }, p.sex)}</select></label>
      <label>Âge<input name="age" type="number" inputmode="numeric" value="${p.age ?? ''}"></label>
      <label>Taille (cm)<input name="height" type="number" inputmode="decimal" value="${p.height ?? ''}"></label>
      <label>Poids (kg)<input name="weight" type="number" step="0.1" inputmode="decimal" value="${p.weight ?? ''}"></label>
      <label class="span2">% masse grasse (optionnel, plus précis)<input name="bodyFat" type="number" step="0.1" inputmode="decimal" value="${p.bodyFat ?? ''}"></label>
      <label class="span2">Activité<select name="activity">${opt(S.PAL, p.activity)}</select></label>
      <label>Objectif<select name="goal">${opt(S.GOALS, p.goal)}</select></label>
      <label>Rythme<select name="rate">${opt(rates, p.rate)}</select></label>
      <label>Séances / sem<input name="sessions" type="number" inputmode="numeric" value="${p.sessions ?? 3}"></label>
      <label>Matériel<select name="equipment">${opt({ salle: 'Salle complète', maison: 'Haltères à la maison', aucun: 'Poids du corps' }, p.equipment)}</select></label>
      <label class="span2">Régime / préférences<input name="diet" placeholder="Ex : végétarien, halal, pas de poisson" value="${esc(p.diet ?? '')}"></label>
      <label class="span2">Allergies / intolérances<input name="allergies" value="${esc(p.allergies ?? '')}"></label>
      <label class="span2 checkline"><input type="checkbox" name="medical" ${p.medical ? 'checked' : ''}> Grossesse/allaitement, trouble du comportement alimentaire ou pathologie chronique</label>
      <button class="btn primary span2">Enregistrer</button>
    </form>
    ${targets ? `<section class="card"><b>Tes besoins calculés</b>
      <div class="stats">
        <div><small>Dépense</small><b>${fmt(targets.tdee)}</b><small>${energy.method === 'adaptatif' ? `adaptative (${energy.loggedDays} j)` : 'formule'}</small></div>
        <div><small>Objectif</small><b>${fmt(targets.kcal)}</b><small>kcal/j</small></div>
        <div><small>Protéines</small><b>${fmt(targets.protein)} g</b><small>${fmt(targets.protein / p.weight, 1)} g/kg</small></div>
      </div>
      <p class="muted small">Formule de départ : Mifflin-St Jeor${p.bodyFat ? ' / Katch-McArdle' : ''} × niveau d'activité FAO/OMS. Après 10 jours de saisie et des pesées sur ≥ 7 jours, la dépense s'ajuste à tes résultats réels (apport moyen − variation de la tendance × 7700 kcal/kg).</p>
    </section>` : ''}
    <form class="card stack" data-f="ai">
      <b>Intelligence artificielle</b>
      <label>Clé API Claude<input name="apiKey" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(st.apiKey)}"></label>
      <label>Modèle<select name="model">${opt(MODELS, st.model)}</select></label>
      <p class="muted small">La clé reste sur ce téléphone et n'est envoyée qu'à api.anthropic.com. Crée-la sur console.anthropic.com → API Keys, et fixe une limite de dépense mensuelle.</p>
      <button class="btn">Enregistrer</button>
    </form>
    <section class="card stack"><b>Sauvegarde</b>
      <p class="muted small">Tes données sont uniquement sur ce téléphone. Exporte-les régulièrement (Fichiers / iCloud Drive).</p>
      <div class="row"><button class="btn" data-a="export">Exporter</button><label class="btn ghost file">Importer<input type="file" accept="application/json" hidden data-a="import"></label></div>
      <button class="btn danger" data-a="reset">Tout effacer</button>
    </section>
    <section class="card"><b>Références scientifiques</b>
      <ul class="list refs">${S.REFS.map((r) => `<li><a href="${r.url}" target="_blank" rel="noopener"><b>${esc(r.k)}</b><small>${esc(r.t)}</small></a></li>`).join('')}</ul>
      <p class="muted small">Cette app ne remplace pas un avis médical.</p>
    </section>`;

  root.querySelector('[data-f=profile]').onsubmit = (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    const num = (x) => (x === '' || x == null ? null : parseFloat(String(x).replace(',', '.')));
    Object.assign(state.profile, {
      sex: v.sex, age: num(v.age), height: num(v.height), weight: num(v.weight), bodyFat: num(v.bodyFat),
      activity: v.activity, goal: v.goal, rate: v.goal === 'maintien' ? 0 : num(v.rate) || S.GOALS[v.goal].rates[1] || S.GOALS[v.goal].rates[0],
      sessions: num(v.sessions), equipment: v.equipment, diet: v.diet, allergies: v.allergies, medical: !!v.medical,
    });
    if (!S.GOALS[v.goal].rates.includes(state.profile.rate)) state.profile.rate = S.GOALS[v.goal].rates[Math.min(1, S.GOALS[v.goal].rates.length - 1)];
    // La première saisie de poids alimente aussi la courbe.
    if (state.profile.weight && !state.weights.length) state.weights.push({ date: today(), kg: state.profile.weight });
    save(); toast('Profil enregistré'); render(root, go);
  };
  // Changer d'objectif ne met à jour que la liste des rythmes (sans perdre la saisie en cours).
  root.querySelector('[data-f=profile] [name=goal]').onchange = (e) => {
    const rs = S.GOALS[e.target.value].rates;
    root.querySelector('[data-f=profile] [name=rate]').innerHTML = opt(
      Object.fromEntries(rs.map((r) => [r, r ? `${String(r).replace('.', ',')} % du poids / semaine` : '—'])), rs[Math.min(1, rs.length - 1)]);
  };
  root.querySelector('[data-f=ai]').onsubmit = (e) => {
    e.preventDefault();
    state.settings.apiKey = e.target.apiKey.value.trim();
    state.settings.model = e.target.model.value;
    save(); toast('Réglages IA enregistrés');
  };
  root.onclick = (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'export') {
      const data = { ...state, settings: { ...state.settings, apiKey: '' } };
      const name = `coach-sauvegarde-${today()}.json`;
      const file = new File([JSON.stringify(data, null, 1)], name, { type: 'application/json' });
      // Sur iPhone, la feuille de partage permet d'enregistrer dans Fichiers / iCloud Drive.
      if (navigator.canShare?.({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(() => {}); return; }
      const url = URL.createObjectURL(file);
      const l = document.createElement('a');
      l.href = url; l.download = name; l.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (a === 'reset' && confirm('Effacer TOUTES les données de l\'app ? (irréversible)')) { replace({}); render(root, go); }
  };
  root.querySelector('[data-a=import]').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.profile || !data.logs) throw new Error('Fichier non reconnu');
      if (!confirm('Remplacer les données actuelles par cette sauvegarde ?')) return;
      replace({ ...data, settings: { ...data.settings, apiKey: state.settings.apiKey } });
      toast('Sauvegarde restaurée'); render(root, go);
    } catch (err) { toast('Import impossible : ' + err.message); }
  };
}

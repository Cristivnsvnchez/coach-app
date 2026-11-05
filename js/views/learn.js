// Vue « Apprendre » : bibliothèque d'apprentissage des mouvements (recherche, niveaux, maîtrise, fiche Étapes / Erreurs / Conseils).
import { nav, esc, sheet, toast } from '../ui.js';
import { icon } from '../icons.js';
import { t, register, getLang } from '../i18n.js';
import { state, save } from '../store.js';
import { LIBRARY, findExercise } from '../exercises.js';
import { getTechnique, pictogram, model3D, outfitsFor, LEVELS, LEVEL_LABEL } from '../technique.js';
import { mount3D } from '../viewer3d.js';
import { active, persist } from './session.js';
import { openExercise } from './exsheets.js';
import * as W from '../workout.js';

register({
  en: { 'Apprends les bons mouvements': 'Learn the right movements', 'Glisse pour tourner': 'Swipe to rotate', 'Apprendre les mouvements': 'Learn the movements', 'Rechercher un mouvement': 'Search a movement',
    'Geste du jour': 'Move of the day', 'Voir la technique': 'See the technique', 'Débutant': 'Beginner', 'Intermédiaire': 'Intermediate', 'Avancé': 'Advanced',
    'Étapes': 'Steps', 'Erreurs': 'Mistakes', 'Conseils': 'Tips', 'Voir mes records': 'See my records', 'Ajouter à ma séance': 'Add to my workout',
    'Ajouté à ta séance': 'Added to your workout', 'Maîtrise': 'Mastery', '{n}/8 séances': '{n}/8 workouts', 'Haut du corps': 'Upper body', 'Bas du corps': 'Lower body',
    'Technique': 'Technique', 'Aucun mouvement trouvé.': 'No movement found.', 'Tous les niveaux': 'All levels', 'Niveau': 'Level',
    'Repères généraux : en cas de douleur, arrête et demande l\'avis d\'un professionnel.': 'General guidance: if you feel pain, stop and ask a professional.',
    'barre': 'barbell', 'haltères': 'dumbbells', 'machine': 'machine', 'poulie': 'cable', 'aucun': 'bodyweight', 'Fiche à venir pour cet exercice.': 'No guide yet for this exercise.',
    'Habiller': 'Outfit', 'Choisir une tenue': 'Choose an outfit', 'Survêtement gris': 'Grey tracksuit', 'Hoodie marine': 'Navy hoodie', 'Hoodie cosy': 'Cosy hoodie',
    'Col zippé blanc': 'White zip top', 'Crop gris': 'Grey crop top', 'Demi-zip gris': 'Grey half-zip' },
  nl: { 'Apprends les bons mouvements': 'Leer de juiste bewegingen', 'Glisse pour tourner': 'Veeg om te draaien', 'Apprendre les mouvements': 'Bewegingen leren', 'Rechercher un mouvement': 'Zoek een beweging',
    'Geste du jour': 'Beweging van de dag', 'Voir la technique': 'Bekijk de techniek', 'Débutant': 'Beginner', 'Intermédiaire': 'Gevorderd', 'Avancé': 'Expert',
    'Étapes': 'Stappen', 'Erreurs': 'Fouten', 'Conseils': 'Tips', 'Voir mes records': 'Mijn records bekijken', 'Ajouter à ma séance': 'Toevoegen aan mijn training',
    'Ajouté à ta séance': 'Toegevoegd aan je training', 'Maîtrise': 'Beheersing', '{n}/8 séances': '{n}/8 trainingen', 'Haut du corps': 'Bovenlichaam', 'Bas du corps': 'Onderlichaam',
    'Technique': 'Techniek', 'Aucun mouvement trouvé.': 'Geen beweging gevonden.', 'Tous les niveaux': 'Alle niveaus', 'Niveau': 'Niveau',
    'Repères généraux : en cas de douleur, arrête et demande l\'avis d\'un professionnel.': 'Algemene richtlijnen: stop bij pijn en vraag advies aan een professional.',
    'barre': 'stang', 'haltères': 'dumbbells', 'machine': 'apparaat', 'poulie': 'kabel', 'aucun': 'lichaamsgewicht', 'Fiche à venir pour cet exercice.': 'Nog geen uitleg voor deze oefening.',
    'Habiller': 'Kleding', 'Choisir une tenue': 'Kies een outfit', 'Survêtement gris': 'Grijs trainingspak', 'Hoodie marine': 'Marineblauwe hoodie', 'Hoodie cosy': 'Knusse hoodie',
    'Col zippé blanc': 'Witte rits-top', 'Crop gris': 'Grijze crop top', 'Demi-zip gris': 'Grijze halve rits' },
});

let q = '', level = ''; // filtres de la liste (conservés pendant la session)

// Nombre de séances réalisées avec l'exercice (maîtrise = n / 8, plafonnée à 1).
export const sessionsWith = (name) => state.workouts.filter((w) => w.exercises.some((e) => e.name === name)).length;
// Geste du jour : rotation quotidienne déterministe parmi la bibliothèque.
export function dayExercise(date = new Date()) {
  const n = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return LIBRARY[n % LIBRARY.length];
}
const tr = (obj) => obj[getLang()] || obj.fr;

function card(e) {
  const f = getTechnique(e.name), n = sessionsWith(e.name), pct = Math.min(100, (n / 8) * 100);
  return `<li class="lrn-card" data-open="${esc(e.name)}" tabindex="0" role="button" aria-label="${esc(t(e.name))}">
    <span class="lrn-pic-box">${pictogram(e.name)}</span>
    <span class="lrn-info"><span class="lrn-name">${esc(t(e.name))}</span>
      <span class="lrn-muscles">${esc([e.muscle, ...e.secondary].map((m) => t(m)).join(' · '))}</span>
      <span class="lrn-mastery" role="img" aria-label="${esc(t('Maîtrise'))} ${esc(t('{n}/8 séances', { n: Math.min(n, 8) }))}"><span class="lrn-track"><span class="lrn-fill" style="width:${pct}%"></span></span>
        <small>${esc(t('{n}/8 séances', { n: Math.min(n, 8) }))}</small></span></span>
    <span class="lrn-lvl lrn-lvl-${f?.level || 'debutant'}">${esc(t(LEVEL_LABEL[f?.level] || 'Débutant'))}</span></li>`;
}

export function render(root, go) {
  const day = dayExercise();
  const draw = () => {
    const ql = q.trim().toLowerCase();
    const items = LIBRARY.filter((e) => (!level || getTechnique(e.name)?.level === level)
      && (!ql || e.name.toLowerCase().includes(ql) || t(e.name).toLowerCase().includes(ql) || t(e.muscle).toLowerCase().includes(ql)));
    root.querySelector('.lrn-list').innerHTML = items.map(card).join('') || `<li class="empty">${t('Aucun mouvement trouvé.')}</li>`;
  };
  root.innerHTML = `${nav(t('Apprends les bons mouvements'), { left: `<button class="btn plain" data-back>${icon('chevronLeft')} ${t('Sport')}</button>` })}
    <label class="searchbar lrn-search">${icon('search')}<input type="search" name="q" value="${esc(q)}" placeholder="${t('Rechercher un mouvement')}" autocomplete="off" aria-label="${t('Rechercher un mouvement')}"></label>
    <section class="lrn-day"><small>${t('Geste du jour')}</small><h2>${esc(t(day.name))}</h2>
      <p>${esc([day.muscle, ...day.secondary].map((m) => t(m)).join(' · '))}</p>
      <span class="lrn-day-pic">${pictogram(day.name)}</span>
      <button class="btn lrn-day-btn" data-open="${esc(day.name)}">${t('Voir la technique')} ${icon('chevronRight')}</button></section>
    <div class="chips lrn-levels" role="group" aria-label="${t('Niveau')}">
      <button class="chip ${level ? '' : 'on'}" data-lvl="">${t('Tous les niveaux')}</button>
      ${LEVELS.map((l) => `<button class="chip ${level === l ? 'on' : ''}" data-lvl="${l}">${t(LEVEL_LABEL[l])}</button>`).join('')}</div>
    <ul class="lrn-list"></ul>
    <p class="group-foot">${t('Repères généraux : en cas de douleur, arrête et demande l\'avis d\'un professionnel.')}</p>`;
  draw();
  root.querySelector('[name=q]').oninput = (e) => { q = e.target.value; draw(); };
  root.onclick = (e) => {
    if (e.target.closest('[data-back]')) return go('training');
    const l = e.target.closest('[data-lvl]');
    if (l) { level = l.dataset.lvl; root.querySelectorAll('[data-lvl]').forEach((b) => b.classList.toggle('on', b === l)); return draw(); }
    const o = e.target.closest('[data-open]');
    if (o) openTechnique(o.dataset.open, go);
  };
  root.onkeydown = (e) => { if (e.key === 'Enter') { const o = e.target.closest?.('.lrn-card[data-open]'); if (o) openTechnique(o.dataset.open, go); } };
}

// Fiche d'apprentissage : pictogramme, tags, onglets Étapes / Erreurs / Conseils, actions.
export function openTechnique(name, go) {
  const info = findExercise(name, state.customExercises) || {}, f = getTechnique(name);
  let tab = 'steps';
  const sex = state.profile.sex === 'F' ? 'F' : 'M';
  const outfits = outfitsFor(sex);
  let outfitIdx = Math.min(state.settings.outfit || 0, outfits.length - 1);
  // Le visuel (3D 360° si disponible, sinon figure) est posé une fois : changer d'onglet ne recharge pas le modèle.
  const m3d = model3D(name, sex);
  let dispose = () => {}, setOutfit = () => {};
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${esc(t(name))}</h3></div>
    <div class="lrn-hero ${m3d ? 'v3d' : ''}">${pictogram(name, 'big')}${m3d ? `<span class="v3d-hint">${icon('swap')} ${t('Glisse pour tourner')}</span>
      <button class="icon-btn round v3d-dress" aria-label="${t('Habiller')}" data-dress>${icon('shirt')}</button>` : ''}</div><div class="body"></div>`, () => dispose());
  if (m3d) mount3D(s.querySelector('.lrn-hero'), m3d, outfits[outfitIdx]).then((d) => { dispose = d.dispose; setOutfit = d.setOutfit; });
  const openDress = () => {
    const ds = sheet(`<div class="sheet-head"><h3 class="title2">${t('Choisir une tenue')}</h3></div>
      <ul class="v3d-outfits">${outfits.map((o, i) => `<li><button class="v3d-outfit ${i === outfitIdx ? 'on' : ''}" data-outfit="${i}">
        <span class="v3d-swatch" style="background:#${o.top.toString(16).padStart(6, '0')}"></span>
        <span class="v3d-swatch" style="background:#${o.shorts.toString(16).padStart(6, '0')}"></span>
        <span class="v3d-outfit-label">${esc(t(o.label))}</span>${i === outfitIdx ? icon('check') : ''}</button></li>`).join('')}</ul>`);
    ds.addEventListener('click', (e) => {
      const b = e.target.closest('[data-outfit]'); if (!b) return;
      outfitIdx = +b.dataset.outfit; state.settings.outfit = outfitIdx; save();
      setOutfit(outfits[outfitIdx]); ds.close();
    });
  };
  const draw = () => {
    const tags = [info.equipment && t(info.equipment), f && t(LEVEL_LABEL[f.level]), info.upper != null && t(info.upper ? 'Haut du corps' : 'Bas du corps')].filter(Boolean);
    s.querySelector('.body').innerHTML = `<div class="lrn-tags">${tags.map((x) => `<span class="lrn-tag">${esc(x)}</span>`).join('')}</div>
      ${f ? `<div class="seg lrn-tabs" role="tablist">${[['steps', 'Étapes'], ['mistakes', 'Erreurs'], ['tips', 'Conseils']].map(([k, l]) =>
        `<button role="tab" aria-selected="${k === tab}" data-tab="${k}" class="${k === tab ? 'on' : ''}">${t(l)}</button>`).join('')}</div>
        <ol class="lrn-steps">${tr(f[tab]).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : `<p class="empty">${t('Fiche à venir pour cet exercice.')}</p>`}
      <div class="lrn-actions">${active ? `<button class="btn filled large" data-add>${icon('plus')} ${t('Ajouter à ma séance')}</button>` : ''}
        <button class="btn large" data-rec>${t('Voir mes records')}</button></div>`;
  };
  s.addEventListener('click', (e) => {
    if (e.target.closest('[data-dress]')) return openDress();
    const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; return draw(); }
    if (e.target.closest('[data-rec]')) { s.close(); return openExercise(name); }
    if (e.target.closest('[data-add]') && active) {
      const up = info.upper ?? true, prev = W.previousSets(state.workouts, name).filter((x) => x.type !== 'warmup');
      const load = prev[0]?.kg ?? 0, reps = 8;
      active.exercises.push({ name, muscle: info.muscle || 'Abdos', secondary: info.secondary || [], type: info.type || 'weight_reps', upper: up, repMin: 8, repMax: 12,
        rest: up ? 90 : 150, note: '', supersetId: null, sets: Array.from({ length: 3 }, () => ({ kg: load, reps, rir: 2, type: 'normal', done: false })) });
      persist(); toast(t('Ajouté à ta séance')); s.close(); go?.('training');
    }
  });
  draw();
}

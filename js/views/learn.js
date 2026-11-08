// Vue « Apprendre » : bibliothèque d'apprentissage des mouvements (recherche, niveaux, maîtrise, fiche Étapes / Erreurs / Conseils).
import { nav, esc, sheet, toast } from '../ui.js';
import { icon } from '../icons.js';
import { t, register, getLang } from '../i18n.js';
import { state, save } from '../store.js';
import { LIBRARY, findExercise, CATEGORIES, CATEGORY_LABEL } from '../exercises.js';
import { getTechnique, pictogram, model3D, outfitsFor, LEVELS, LEVEL_LABEL } from '../technique.js';
import { mount3D } from '../viewer3d.js';
import { shape } from '../theme.js';
import { active, addToActive } from './session.js';
import { openExercise } from './exsheets.js';

register({
  en: { 'Apprends les bons mouvements': 'Learn the right movements', 'Glisse pour tourner': 'Swipe to rotate', 'Apprendre les mouvements': 'Learn the movements', 'Rechercher un mouvement': 'Search a movement',
    'À découvrir': 'Discover', 'Voir la technique': 'See the technique', 'Débutant': 'Beginner', 'Intermédiaire': 'Intermediate', 'Avancé': 'Advanced',
    'Étapes': 'Steps', 'Erreurs': 'Mistakes', 'Bon geste': 'Good form', 'Erreur': 'Mistake', 'Conseils': 'Tips', 'Voir mes records': 'See my records', 'Ajouter à ma séance': 'Add to my workout',
    'Ajouté à ta séance': 'Added to your workout', 'Maîtrise': 'Mastery', '{n}/8 séances': '{n}/8 workouts', 'Haut du corps': 'Upper body', 'Bas du corps': 'Lower body',
    'Technique': 'Technique', 'Aucun mouvement trouvé.': 'No movement found.', 'Tous les niveaux': 'All levels', 'Niveau': 'Level',
    'Repères généraux : en cas de douleur, arrête et demande l\'avis d\'un professionnel.': 'General guidance: if you feel pain, stop and ask a professional.',
    'barre': 'barbell', 'haltères': 'dumbbells', 'machine': 'machine', 'poulie': 'cable', 'aucun': 'bodyweight', 'Fiche à venir pour cet exercice.': 'No guide yet for this exercise.',
    'Habiller': 'Outfit', 'Choisir une tenue': 'Choose an outfit', 'Survêtement gris': 'Grey tracksuit', 'Hoodie marine': 'Navy hoodie', 'Hoodie cosy': 'Cosy hoodie',
    'Col zippé blanc': 'White zip top', 'Crop gris': 'Grey crop top', 'Demi-zip gris': 'Grey half-zip',
    'Toutes les catégories': 'All categories', 'Catégorie': 'Category', 'Jambes': 'Legs', 'Abdos': 'Abs', 'Cardio': 'Cardio', 'Haltéro': 'Weightlifting', 'Mobilité': 'Mobility' },
  nl: { 'Apprends les bons mouvements': 'Leer de juiste bewegingen', 'Glisse pour tourner': 'Veeg om te draaien', 'Apprendre les mouvements': 'Bewegingen leren', 'Rechercher un mouvement': 'Zoek een beweging',
    'À découvrir': 'Ontdek', 'Voir la technique': 'Bekijk de techniek', 'Débutant': 'Beginner', 'Intermédiaire': 'Gevorderd', 'Avancé': 'Expert',
    'Étapes': 'Stappen', 'Erreurs': 'Fouten', 'Bon geste': 'Goede uitvoering', 'Erreur': 'Fout', 'Conseils': 'Tips', 'Voir mes records': 'Mijn records bekijken', 'Ajouter à ma séance': 'Toevoegen aan mijn training',
    'Ajouté à ta séance': 'Toegevoegd aan je training', 'Maîtrise': 'Beheersing', '{n}/8 séances': '{n}/8 trainingen', 'Haut du corps': 'Bovenlichaam', 'Bas du corps': 'Onderlichaam',
    'Technique': 'Techniek', 'Aucun mouvement trouvé.': 'Geen beweging gevonden.', 'Tous les niveaux': 'Alle niveaus', 'Niveau': 'Niveau',
    'Repères généraux : en cas de douleur, arrête et demande l\'avis d\'un professionnel.': 'Algemene richtlijnen: stop bij pijn en vraag advies aan een professional.',
    'barre': 'stang', 'haltères': 'dumbbells', 'machine': 'apparaat', 'poulie': 'kabel', 'aucun': 'lichaamsgewicht', 'Fiche à venir pour cet exercice.': 'Nog geen uitleg voor deze oefening.',
    'Habiller': 'Kleding', 'Choisir une tenue': 'Kies een outfit', 'Survêtement gris': 'Grijs trainingspak', 'Hoodie marine': 'Marineblauwe hoodie', 'Hoodie cosy': 'Knusse hoodie',
    'Col zippé blanc': 'Witte rits-top', 'Crop gris': 'Grijze crop top', 'Demi-zip gris': 'Grijze halve rits',
    'Toutes les catégories': 'Alle categorieën', 'Catégorie': 'Categorie', 'Jambes': 'Benen', 'Abdos': 'Buik', 'Cardio': 'Cardio', 'Haltéro': 'Gewichtheffen', 'Mobilité': 'Mobiliteit' },
});

let q = '', level = '', cat = ''; // filtres de la liste (conservés pendant la session)

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
    <span class="lrn-pic-box">${pictogram(e.name, '', state.profile?.sex)}</span>
    <span class="lrn-info"><span class="lrn-name">${esc(t(e.name))}</span>
      <span class="lrn-muscles">${esc([e.muscle, ...e.secondary].map((m) => t(m)).join(' · '))}</span>
      <span class="lrn-mastery" role="img" aria-label="${esc(t('Maîtrise'))} ${esc(t('{n}/8 séances', { n: Math.min(n, 8) }))}"><span class="lrn-track"><span class="lrn-fill" style="width:${pct}%"></span></span>
        <small>${esc(t('{n}/8 séances', { n: Math.min(n, 8) }))}</small></span></span>
    <span class="lrn-lvl lrn-lvl-${f?.level || 'debutant'}">${esc(t(LEVEL_LABEL[f?.level] || 'Débutant'))}</span></li>`;
}

// Mouvement mis en avant : un exercice animé au hasard à chaque retour sur l'écran (jamais deux fois de suite le même),
// joué par l'avatar 3D sur le fond de la palette (même forme que l'aperçu du Profil). Sans 3D possible : figure à la place.
let showcase = null; // visionneuse de la carte, libérée à chaque nouveau rendu (une seule contexte WebGL à la fois)
function pickShowcase() {
  const pool = LIBRARY.filter((e) => model3D(e.name));
  let last = null; try { last = sessionStorage.getItem('lrn-day'); } catch {}
  const choices = pool.filter((e) => e.name !== last);
  const e = (choices.length ? choices : pool)[Math.floor(Math.random() * (choices.length || pool.length))] || dayExercise();
  try { sessionStorage.setItem('lrn-day', e.name); } catch {}
  return e;
}

// Appelé par app.js quand on quitte Apprendre : la visionneuse de la carte ne doit pas rester en vie.
export function leave() { showcase?.dispose(); showcase = null; }

export function render(root, go, from) {
  leave();
  const day = pickShowcase();
  const sex = state.profile?.sex === 'F' ? 'F' : 'M';
  const draw = () => {
    const ql = q.trim().toLowerCase();
    const items = LIBRARY.filter((e) => (!level || getTechnique(e.name)?.level === level) && (!cat || e.category === cat)
      && (!ql || e.name.toLowerCase().includes(ql) || t(e.name).toLowerCase().includes(ql) || t(e.muscle).toLowerCase().includes(ql)));
    const list = root.querySelector('.lrn-list');
    if (!items.length) { list.innerHTML = `<li class="empty">${t('Aucun mouvement trouvé.')}</li>`; return; }
    if (cat || ql || level) { list.innerHTML = items.map(card).join(''); return; }
    // Aucun filtre : vue d'ensemble groupée par catégorie (Jambes, Haut du corps, Abdos…).
    list.innerHTML = CATEGORIES.map((c) => {
      const g = items.filter((e) => e.category === c);
      return g.length ? `<li class="lrn-group-head">${esc(t(CATEGORY_LABEL[c]))}</li>${g.map(card).join('')}` : '';
    }).join('');
  };
  // Onglet du menu : pas de retour ; ouvert depuis Sport (« Apprendre les mouvements ») : « ‹ Sport ».
  root.innerHTML = `${nav(t('Apprendre'), { large: false, ...(from === 'training' ? { left: `<button class="btn plain" data-back>${icon('chevronLeft')} ${t('Séances')}</button>` } : {}) })}
    <h1 class="large-title lrn-title">${t('Apprendre')}</h1><p class="v2-sm lrn-sub">${t('Apprends les bons mouvements')}</p>
    <label class="searchbar lrn-search">${icon('search')}<input type="search" name="q" value="${esc(q)}" placeholder="${t('Rechercher un mouvement')}" autocomplete="off" aria-label="${t('Rechercher un mouvement')}"></label>
    <section class="lrn-day tm-hero">${shape({ cls: 'lrn-day-shape' })}
      <small>${t('À découvrir')}</small><h2>${esc(t(day.name))}</h2>
      <p>${esc([day.muscle, ...day.secondary].map((m) => t(m)).join(' · '))}</p>
      <button class="btn lrn-day-btn" data-open="${esc(day.name)}">${t('Voir la technique')} ${icon('chevronRight')}</button></section>
    <div class="chips lrn-cats" role="group" aria-label="${t('Catégorie')}">
      <button class="chip ${cat ? '' : 'on'}" data-cat="" aria-label="${t('Toutes les catégories')}">${t('Tout')}</button>
      ${CATEGORIES.map((c) => `<button class="chip ${cat === c ? 'on' : ''}" data-cat="${c}">${t(CATEGORY_LABEL[c])}</button>`).join('')}</div>
    <div class="seg lrn-levels" role="group" aria-label="${t('Niveau')}">
      <button class="${level ? '' : 'on'}" data-lvl="" aria-label="${t('Tous les niveaux')}">${t('Tous')}</button>
      ${LEVELS.map((l) => `<button class="${level === l ? 'on' : ''}" data-lvl="${l}">${t(LEVEL_LABEL[l])}</button>`).join('')}</div>
    <ul class="lrn-list"></ul>
    <p class="group-foot">${t('Repères généraux : en cas de douleur, arrête et demande l\'avis d\'un professionnel.')}</p>`;
  draw();
  // Bannière sans personnage (demande de l'utilisateur) : titre, muscles et bouton seulement.
  root.querySelector('[name=q]').oninput = (e) => { q = e.target.value; draw(); };
  root.onclick = (e) => {
    if (e.target.closest('[data-back]')) return go('training');
    const l = e.target.closest('[data-lvl]');
    if (l) { level = l.dataset.lvl; root.querySelectorAll('[data-lvl]').forEach((b) => b.classList.toggle('on', b === l)); return draw(); }
    const c = e.target.closest('[data-cat]');
    if (c) { cat = c.dataset.cat; root.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('on', b === c)); return draw(); }
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
  let dispose = () => {}, setOutfit = () => {}, setMode = () => {};
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${esc(t(name))}</h3></div>
    <div class="lrn-hero ${m3d ? 'v3d' : ''}" style="--v3d-ok-label:${esc(JSON.stringify(t('Bon geste')))};--v3d-ko-label:${esc(JSON.stringify(t('Erreur')))}">${pictogram(name, 'big', state.profile?.sex)}${m3d?.worked?.length ? `<div class="v3d-worked"><b>${esc(t(m3d.worked[0]))}</b>${m3d.worked.slice(1).map((x) => `<span>${esc(t(x))}</span>`).join('')}</div>` : ''}${m3d ? `<span class="v3d-hint">${icon('swap')} ${t('Glisse pour tourner')}</span>
      <button class="icon-btn round v3d-dress" aria-label="${t('Habiller')}" data-dress>${icon('shirt')}</button>` : ''}</div><div class="body"></div>`, () => dispose());
  s.querySelector('.sheet').classList.add('lrn-fiche'); // canevas apprendre-2 : scène fixe en haut, onglets qui défilent dessous
  if (m3d) mount3D(s.querySelector('.lrn-hero'), m3d, outfits[outfitIdx]).then((d) => { dispose = d.dispose; setOutfit = d.setOutfit; setMode = d.setMode; setMode(tab); }).catch(() => {});
  const openDress = () => {
    const ds = sheet(`<div class="sheet-head"><h3 class="title2">${t('Choisir une tenue')}</h3></div>
      <ul class="v3d-outfits">${outfits.map((o, i) => `<li><button class="v3d-outfit ${i === outfitIdx ? 'on' : ''}" data-outfit="${i}">
        ${o.top != null ? `<span class="v3d-swatch" style="background:#${o.top.toString(16).padStart(6, '0')}"></span>` : ''}
        <span class="v3d-swatch" style="background:#${o.shorts.toString(16).padStart(6, '0')}"></span>
        <span class="v3d-outfit-label">${esc(t(o.label))}</span>${i === outfitIdx ? icon('check') : ''}</button></li>`).join('')}</ul>`);
    ds.addEventListener('click', (e) => {
      const b = e.target.closest('[data-outfit]'); if (!b) return;
      outfitIdx = +b.dataset.outfit; state.settings.outfit = outfitIdx; save();
      setOutfit(outfits[outfitIdx]); showcase?.setOutfit?.(outfits[outfitIdx]); ds.close();
    });
  };
  const draw = () => {
    const tags = [info.equipment && t(info.equipment), f && t(LEVEL_LABEL[f.level]), info.category && t(CATEGORY_LABEL[info.category])].filter(Boolean);
    s.querySelector('.body').innerHTML = `<div class="lrn-tags">${tags.map((x) => `<span class="lrn-tag">${esc(x)}</span>`).join('')}</div>
      ${f ? `<div class="seg lrn-tabs" role="tablist">${[['steps', 'Étapes'], ['mistakes', 'Erreurs'], ['tips', 'Conseils']].map(([k, l]) =>
        `<button role="tab" aria-selected="${k === tab}" data-tab="${k}" class="${k === tab ? 'on' : ''}">${t(l)}</button>`).join('')}</div>
        <ol class="lrn-steps">${tr(f[tab]).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : `<p class="empty">${t('Fiche à venir pour cet exercice.')}</p>`}
      <div class="lrn-actions">${active && !active.exercises.some((x) => x.name === name) ? `<button class="btn filled large" data-add>${icon('plus')} ${t('Ajouter à ma séance')}</button>` : ''}
        <button class="btn large" data-rec>${t('Voir mes records')}</button></div>`;
  };
  s.addEventListener('click', (e) => {
    if (e.target.closest('[data-dress]')) return openDress();
    const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; setMode(tab); return draw(); }
    if (e.target.closest('[data-rec]')) { s.close(); return openExercise(name); }
    if (e.target.closest('[data-add]') && addToActive(name)) { toast(t('Ajouté à ta séance')); s.close(); go?.('training'); }
  });
  draw();
}

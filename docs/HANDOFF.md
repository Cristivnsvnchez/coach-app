# TrackMe — passation (à lire en premier par la prochaine session Claude)

Dernière mise à jour : 2026-11-05 · version en ligne : **trackme-v22** · https://cristivnsvnchez.github.io/coach-app/

## 1. Le projet en 30 secondes
- PWA iPhone (installée depuis Safari → « Sur l'écran d'accueil ») : coach sportif + diététicien. Vanilla JS ES modules, **pas de build**, données uniquement sur le téléphone (localStorage, schéma versionné v3).
- Dépôt : `Cristivnsvnchez/coach-app` (public, GitHub Pages branche `main`). Source locale de l'utilisateur : `~/coach-app-preview`.
- Lire ensuite : `MAP.md` (carte des fichiers + exports, régénérée à chaque publication), `PRODUCT.md`, `DESIGN.md`, `docs/plan-trackme.md`.
- Langues : FR (source dans `t('…')`) + EN + NL **pour chaque nouveau texte** (`register({ en, nl })` dans le module, ou `js/i18n/extra.js`). Vérifier avec `node tests/i18n-scan.mjs`.

## 2. L'utilisateur
- Écrit en français, veut des réponses courtes, l'action d'abord, une étape à la fois (profil TDAH : listes numérotées, pas de blabla).
- Veut un produit **utilisable sur iPhone**, design moderne et natif (verre/flou, dégradés, arrondis, pas « linéaire »), et que l'on fasse le travail à sa place.
- Ne jamais saisir ses mots de passe, clés API ni identifiants : il se connecte lui-même dans le navigateur.

## 3. Publier une version (checklist)
1. Incrémenter `VERSION` dans `sw.js` et ajouter tout nouveau fichier au tableau `SHELL`.
2. `node --test tests/*.test.mjs` (53 tests verts) · `node --check` sur les JS · `node tests/i18n-scan.mjs`.
3. Régénérer `MAP.md` (boucle bash : 1re ligne de chaque fichier + `grep -oE '^export …'`).
4. `git commit` + `git push origin main` ; attendre que `https://cristivnsvnchez.github.io/coach-app/sw.js` affiche la nouvelle VERSION.
- Test local : `python3 -m http.server 5173` dans le dossier ; vider service worker + caches avant de vérifier (`fetch(f,{cache:'reload'})`).

## 4. Ce qui existe (v20)
Onboarding par choix (12 étapes, palette, kcal Mifflin modifiables, « Protège tes données » → copie iCloud Drive) · Journal (héros kcal, macros, repas, repères ANSES, checklist) · Poids (tendance, projection, Timeline cochable) · Sport (routines, séances, programme daté .ics) · Coach IA (Claude API, clé de l'utilisateur, budget) · Cycle (utilisatrices) · Apprendre (39 fiches FR/EN/NL) · Profil (Apparence : mode Auto/Clair/Sombre, palette, matière Brume/Papier) · format PC (barre latérale) · motion (ressorts, cascade, compteurs) · recherche d'aliments hors ligne (215 aliments) · Strava **retiré**.

## 5. 3D des exercices (chantier en cours)
- Visionneuse : `js/viewer3d.js` (three.js 0.170 embarqué dans `vendor/three/`, chargé à l'ouverture d'une fiche). Rotation 360° au doigt, animation en boucle, décor sombre à grille, liseré bleu (fresnel), **muscles travaillés lumineux** calculés dans le shader depuis les poids de peau (`muscles: { NomDeLOs: intensité }`, valeur négative = face arrière seulement, ex. fessiers = `Hips: -0.9`).
- Modèle : `models/trackme-human.glb` (1,5 Mo) = **X Bot Mixamo** habillé dans Blender (`design/trackme-human.blend`) : débardeur marine `TM_Top`, short noir `TM_Shorts`, baskets `TM_Shoes`/`TM_Shoes_Sole`, peau blanche `TM_Skin`. Zones de vêtements attribuées par hauteur + poids d'os (script Blender dans l'historique ; logique : short = 0,405–0,565 × H et os UpLeg/Hips ; haut = 0,548–0,80 × H et os Spine/Hips ; pieds = os Foot/Toe).
- Déclaration par exercice : `MODELS` dans `js/technique.js` (url, clip, muscles). Seul **Squat** est fait.
- Pipeline Mixamo (session de l'utilisateur ouverte dans le navigateur intégré, token `localStorage.access_token`, en-têtes `Authorization: Bearer …`, `X-Api-Key: mixamo2`) :
  1. `GET /api/v1/products/{motionId}?similar=0&character_id={charId}` → `details.gms_hash`
  2. `POST /api/v1/animations/export` (format `fbx7_2019`, skin `true`, fps `30`, reducekf `0`, `inplace: true`)
  3. `GET /api/v1/characters/{charId}/monitor` jusqu'à `completed` → `job_result` (URL S3 valable 5 min) → `curl` vers `~/trackme-3d/`
  - X Bot = `2dee24f8-3b49-48af-b735-c6377509eaac` · Air Squat = `c9caa63d-b96c-11e4-a802-0aaa78deedf9`. Recherche : `GET /api/v1/products?type=Motion&query=…`.
- Blender (addon MCP, port 9876) : importer FBX dans un `bpy.context.temp_override(window, area VIEW_3D)` ; exporter glTF (`export_animation_mode='ACTIONS'`, sans textures). Ne pas utiliser `read_factory_settings` (désactive l'addon).
- Accès fichiers Mac : Téléchargements / Documents / iCloud illisibles → travailler dans `~/trackme-3d` et `~/coach-app-preview`.

## 6. Tenues homme/femme (v21 : fait pour Squat, reste à étendre à tous les exercices)
> « Mets-lui des habits type, selon que c'est une femme ou un homme. Au moment où il accède à la partie où on voit la 3D, proposer s'il veut modifier et l'habiller : plusieurs tenues, quelque chose de qualitatif. »
> Demande complémentaire : faire ça pour TOUS les exercices (pas que Squat), importer les mouvements Mixamo manquants, réorganiser et catégoriser la bibliothèque Apprendre.

**Fait (v21) :**
- Y Bot (mannequin féminin Mixamo) exporté : `models/trackme-human-f.glb`, mêmes zones de vêtements que l'homme (débardeur/short/baskets), squelette identique → même pipeline d'animation.
- `js/technique.js` : `model3D(name, sex)` choisit le bon glb par sexe ; `MUSCLE_BONES` + `combineMuscles()` dérivent automatiquement la lueur musculaire depuis `muscle`/`secondary` de `exercises.js` (plus besoin de la régler à la main par exercice) ; `CLIPS` associe un exercice à un clip d'animation présent dans le glb (seul `Squat` → `'squat'` pour l'instant).
- `OUTFITS` (3 tenues par sexe, couleurs tirées des 6 photos de référence `~/trackme-3d/refs/`) + `outfitsFor(sex)`.
- `js/viewer3d.js` : `mount3D()` renvoie `{ dispose, setOutfit }` ; `setOutfit(outfit)` recolore les matériaux `TM_Top`/`TM_Shorts`/`TM_Shoes` en direct, sans recharger le modèle (la semelle `TM_Shoes_Sole` reste neutre). Tenue retenue dans `state.settings.outfit` (index global, persiste entre les deux sexes).
- Bouton « Habiller » (icône `shirt` ajoutée dans `js/icons.js`) posé en haut à droite de la visionneuse dans `js/views/learn.js` → feuille de choix (vignettes couleur + libellé), i18n FR/EN/NL.
- Testé en local sur les deux sexes (profil M et F), 53 tests verts, i18n-scan sans nouvelle lacune.

**Fait (suite, même session) — catégorisation + 7 nouveaux mouvements :**
- `js/exercises.js` : chaque exercice a désormais une `category` (`jambes`/`haut`/`abdos`/`cardio`/`haltero`/`mobilite`), exportée via `CATEGORIES` (ordre d'affichage) et `CATEGORY_LABEL`. 7 mouvements ajoutés à `LIBRARY` + fiche complète FR/EN/NL dans `js/technique.js` (pictogramme 2D dédié, pas encore de clip 3D — voir blocage Mixamo ci-dessous) : **Squat pistol**, **Squat overhead**, **Burpee**, **Arraché** (Snatch), **Épaulé-jeté** (Clean and jerk), **Tirage sumo** (Sumo high pull), **Élévations frontales** (Front raises).
- `js/views/learn.js` : nouvelle rangée de puces Catégorie (en plus de Niveau) ; sans filtre actif, la liste se regroupe par catégorie (`.lrn-group-head`) au lieu d'être plate ; le tag de la fiche détail affiche la catégorie au lieu du générique Haut/Bas du corps.

**⚠️ Bloqué : export Mixamo cassé côté serveur (2026-11-05).** L'API `/api/v1/animations/export` renvoie systématiquement `ERROR occured on export: no implicit conversion of String into Integer`, reproduit même en rejouant exactement l'appel qui avait généré le clip squat existant (motion Air Squat, X Bot) — donc pas un problème d'identifiants ni de format de requête, un bug/une panne côté Mixamo. À retester plus tard ; si ça remarche, voici les IDs déjà repérés pour la recherche « workout » (character X Bot = `2dee24f8-3b49-48af-b735-c6377509eaac`) :
  - Pistol `c9cad647-b96c-11e4-a802-0aaa78deedf9` → **Squat pistol**
  - Overhead Squat `c9cb21a5-b96c-11e4-a802-0aaa78deedf9` → **Squat overhead**
  - Burpee `c9cad103-b96c-11e4-a802-0aaa78deedf9` → **Burpee**
  - Snatch `c9cb2022-b96c-11e4-a802-0aaa78deedf9` → **Arraché**
  - Clean And Jerk `c9cb20e3-b96c-11e4-a802-0aaa78deedf9` → **Épaulé-jeté**
  - Sumo High Pull `c9cb2a1a-b96c-11e4-a802-0aaa78deedf9` → **Tirage sumo**
  - Front Raises `c9cb36c6-b96c-11e4-a802-0aaa78deedf9` → **Élévations frontales**
  - Bicep Curl `c9cb3360-b96c-11e4-a802-0aaa78deedf9` → clip pour **Curl haltères** / **Curl barre** (déjà dans LIBRARY, juste besoin du clip)
  - Air Squat Bent Arms `c9cb991f-b96c-11e4-a802-0aaa78deedf9` → clip pour **Squat avant** (déjà dans LIBRARY, juste besoin du clip)
  - Raccourci trouvé : une seule animation téléchargée (avec `skin:true` sur X Bot) suffit pour les deux sexes — dans Blender, l'Action est réutilisable telle quelle sur l'armature Y Bot (mêmes noms d'os `mixamorig:…`), pas besoin de la télécharger deux fois.
  - ⚠️ Le `.blend` actuel (`design/trackme-human.blend`) ne contient plus que le corps **féminin** (Armature + Beta_Joints + Beta_Surface) — le corps masculin habillé a été remplacé en cours de route par une session précédente. Pour ajouter des clips au glb homme, réimporter d'abord `models/trackme-human.glb` dans Blender pour récupérer son armature + mesh avant d'assigner les nouvelles actions.

**Reste à faire pour ce chantier :**
1. Dès que Mixamo refonctionne : télécharger les 9 motions ci-dessus, les assigner aux deux squelettes (réimporter le corps homme d'abord, voir note ⚠️ ci-dessus), exporter les 2 glb multi-clips, remplir `CLIPS` dans `js/technique.js`.
2. Puis continuer avec les ~20 autres mouvements repérés (mobilité notamment — rien trouvé encore sur ce point) et les ~36 exercices de `LIBRARY` qui n'ont toujours pas de clip.
3. Coupes de vêtements manches longues / pantalon large / legging / chaussettes (actuellement toutes les tenues réutilisent la même coupe débardeur+short, seules les couleurs changent) — décidé de livrer vite avec les couleurs seules ; les vraies coupes sont un chantier Blender à part, plus long.
4. Vignettes des tenues dans la feuille « Habiller » : pour l'instant juste 2 pastilles de couleur (haut/bas) + libellé, pas de rendu Blender comme prévu initialement.

Références photo : 6 images gardées en local chez l’utilisateur (`~/trackme-3d/refs/`, non publiées : photos de personnes réelles). Description :
- **Homme** : survêtement gris chiné zippé + t-shirt blanc + baskets blanches · hoodie marine + jogging gris large + baskets argent · hoodie + jogging gris « cosy » + chaussettes blanches.
- **Femme** : top blanc ajusté à col zippé + pantalon large noir à 3 bandes blanches · crop top gris manches longues + pantalon large gris · sweat demi-zip gris + legging anthracite + chaussettes blanches.

Proposition de réalisation :
1. Morphologie selon `state.profile.sex` : homme = X Bot, femme = **Y Bot** (Mixamo, même squelette → mêmes animations). Exporter Y Bot comme X Bot.
2. Tenues = **jeux de couleurs/matériaux** sur des zones de vêtements (haut manches longues ou courtes, bas large ou ajusté, chaussettes, baskets) découpées dans Blender comme aujourd'hui, + léger relief tissu (rugosité, chiné via bruit dans le shader). Pas de vraie simulation de tissu (trop lourd pour iPhone).
3. Dans la visionneuse : bouton « Habiller » → feuille avec 3 tenues par sexe (vignettes rendues dans Blender), choix enregistré dans `state.settings.outfit`, appliqué en changeant les couleurs des matériaux (`TM_Top`, `TM_Shorts`…) sans recharger le modèle.
4. Les muscles lumineux doivent rester visibles à travers les vêtements (déjà le cas pour le haut).

## 7. Reste à faire ensuite
1. Importer les 25 autres mouvements Mixamo repérés, **rangés par catégorie** dans Apprendre : Jambes (back squat, overhead squat, pistol) · Haut du corps (push-up, jump push-up, bicep curl, front raises) · Abdos/gainage (situps, bicycle crunch, circle crunch, plank) · Cardio/pliométrie (burpee, jumping jacks, box jump, jump rope, jogging, treadmill, sprint) · Haltérophilie/kettlebell (snatch, clean & jerk, sumo high pull, kettlebell swing) · Mobilité (stretch cou, bras, échauffement boxe). Chaque mouvement : fiche FR/EN/NL + muscles + catégorie. Conseil : un glb « modèle » + un petit glb d'animation par exercice chargé à la demande.
2. Accessoires attachés aux mains (haltères, barre, kettlebell, box, tapis) dans three.js.
3. Bandeau de petits corps (face/dos) avec le muscle ciblé en surbrillance + séries × répétitions (« 3×15 ») sur l'animation (références visuelles de l'utilisateur : style studio sombre, mannequin blanc, muscle orange/violet lumineux).
4. Tester sur un vrai iPhone (installation, encoche, caméra code-barres, sauvegarde iCloud, 3D).
5. Écrans Séance et Coach au nouveau style ; « Annuler » après suppression ; IndexedDB.

# TrackMe — passation (à lire en premier par la prochaine session Claude)

Dernière mise à jour : 2026-11-06 · version en ligne : **trackme-v34** (voir section 16 pour le travail en cours) · https://cristivnsvnchez.github.io/coach-app/

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
2. `node --test tests/*.test.mjs` (73 tests verts, dont `tests/i18n.test.mjs` qui échoue s'il manque une traduction EN ou NL) · `node --check` sur les JS · `node tests/i18n-scan.mjs` pour voir la liste.
3. Régénérer `MAP.md` (boucle bash : 1re ligne de chaque fichier + `grep -oE '^export …'`).
4. `git commit` + `git push origin main` ; attendre que `https://cristivnsvnchez.github.io/coach-app/sw.js` affiche la nouvelle VERSION.
- Test local : `python3 -m http.server 5173` dans le dossier ; vider service worker + caches avant de vérifier (`fetch(f,{cache:'reload'})`).

## 4. Ce qui existe (v20)
Onboarding par choix (12 étapes, palette, kcal Mifflin modifiables, « Protège tes données » → copie iCloud Drive) · Journal (héros kcal, macros, repas, repères ANSES, checklist) · Poids (tendance, projection, Timeline cochable) · Sport (routines, séances, programme daté .ics) · Coach IA **retiré** (voir section 14) · Cycle (utilisatrices) · Apprendre (39 fiches FR/EN/NL) · Profil (Apparence : mode Auto/Clair/Sombre, palette, matière Brume/Papier) · format PC (barre latérale) · motion (ressorts, cascade, compteurs) · recherche d'aliments hors ligne (215 aliments) · Strava **retiré**.

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

**Fait (v23) — vrais vêtements, objets en main, Erreurs/Conseils différents en 3D :**
- **Vraies coupes** (plus seulement de la couleur) : zones `TM_Sleeve`/`TM_PantsLong` ajoutées dans Blender sur les deux corps (sélection par poids de peau sur les os bras/avant-bras et cuisse/jambe, matériau copié depuis `TM_Skin` puis réassigné). Classées comme `top`/`shorts` dans `viewer3d.js` (regex `kind`), donc recolorées avec les mêmes couleurs de tenue sans code en plus. Les 2 glb (`models/trackme-human.glb`, `models/trackme-human-f.glb`) ont été réexportés avec ces 7 zones. ⚠️ Le corps homme a dû être réimporté dans `trackme-human.blend` (il n'y était plus, voir note plus bas) — le fichier contient maintenant les deux squelettes.
- **Objets en main** (`js/viewer3d.js`) : barre (`equipment: 'barre'`, accrochée à `Spine2`) et haltères (`equipment: 'haltères'`, accrochés à `LeftHand`/`RightHand`) — géométrie three.js simple, pas de modèle Blender. Suivent l'os chaque frame en recopiant sa position/rotation (`matrixWorld.decompose`), **pas** en enfant direct du bone : certains bones ont une échelle parasite (objet Armature à 0.01 après réimport glTF) qui déformerait un enfant non skinné.
- **Onglet Erreurs** : `MISTAKES` dans `technique.js` (ex. Squat → genoux qui rentrent, rotation Z fixe sur `LeftLeg`/`RightLeg`) appliquée par-dessus l'animation tant que l'onglet Erreurs est ouvert (`setMode('mistakes')`), retirée sur Étapes/Conseils.
- **Onglet Conseils** : pose figée (`act.paused = true`) + lueur musculaire renforcée (`uHighlight` ×1.7) façon planche anatomique, au lieu du texte seul.
- `mount3D()` renvoie maintenant `{ dispose, setOutfit, setMode }` ; `model3D()` renvoie en plus `equipment` et `mistake`.

**Fait (v24) — décors de machines (en attente de clip réel) :**
- `js/viewer3d.js` : décor statique (posé au sol, ne suit aucun os) pour `equipment === 'poulie'` (tour à poulie générique : montant, pile de poids, bras + câble — sert pour Tirage vertical/horizontal, Écarté poulie, Face pull, Extensions triceps, Crunch poulie) et pour `name === 'Presse à cuisses'` (rails inclinés, assise, dossier, cale-pieds). `model3D()` renvoie maintenant aussi `name`, utile pour cibler un décor par exercice précis (pas seulement par type d'équipement).
- ⚠️ **Pas encore visible dans l'app** : aucun de ces exercices n'a de clip 3D (Mixamo toujours en panne, voir plus haut), donc `model3D()` renvoie `null` pour eux et la fiche 2D s'affiche. Vérifié uniquement via un harnais de test dans la console (mount3D appelé à la main avec le clip squat + `equipment`/`name` forcés) — le décor s'affiche et a l'air correct, mais jamais testé avec une vraie pose assise/allongée puisqu'elle n'existe pas encore.
- Mollets debout/assis, Dips assistés, Tractions assistées (aussi `equipment: 'machine'`) : pas encore de décor dédié — à faire quand on y arrive, chacun a une forme très différente.

**Fait (v25) — tout le monde est « prêt » côté app, reste la vraie matière première :**
- `mistakeFor(e)` (remplace l'ancien `MISTAKES` statique à une seule entrée) : règle générique par catégorie + muscle principal → 1 des 4 défauts réutilisables (`kneeCave`, `backRound`, `elbowFlare`, `elbowDrift`, `hipsDrop`). Couvre tout de suite les 46 exercices de `LIBRARY`, y compris ceux ajoutés plus tard, sans réglage manuel par nom (Squat garde le même résultat qu'avant, déjà vérifié).
- Décor ajouté pour Leg extension/Leg curl (bâti + levier), Mollets debout/assis (plateforme + épaulières ou genouillères), Dips assistés/Tractions assistées (portique + plateforme de contrepoids) — même esprit que Presse à cuisses/poulie : vérifié seulement en harnais de test, pas avec une vraie pose.

**⚠️ Point important pour la suite (demande explicite de l'utilisateur : « il me les faut pour tous les exercices ») :**
Tout ce qui NE dépend PAS d'une animation réelle est maintenant générique et prêt pour les 46 exercices de `LIBRARY` (lueur musculaire, objets en main, décor de machine, déformation Erreurs, pose figée + surbrillance Conseils). **Mais aucun de ces automatismes ne peut s'afficher sans un clip 3D**, et la seule source de clips (export Mixamo) reste cassée côté serveur Adobe (revérifié 3 fois dans cette session, dernière fois juste avant ce commit, toujours la même erreur serveur). Ce n'est pas un bug de l'app : impossible de dire si/quand ça remarche. Prochaine session : retester l'export en premier (voir code dans l'historique de conversation ou refaire l'appel décrit section 5) avant de promettre une date à l'utilisateur.

**Reste à faire pour ce chantier :**
1. Dès que Mixamo refonctionne : télécharger les 9 motions notées plus haut (section 6), les assigner aux deux squelettes (le corps homme est déjà réimporté), exporter les 2 glb multi-clips, remplir `CLIPS` dans `js/technique.js` — tout le reste (muscles, objets, décor, erreurs, conseils) suit automatiquement.
2. Puis continuer avec les ~20 autres mouvements repérés et les ~36 exercices de `LIBRARY` qui n'ont toujours pas de clip.
3. Une fois des clips réels en place, revisiter la position des décors/objets en main et l'angle des défauts Erreurs (tout réglé à l'œil sur une pose debout générique, pas sur le vrai mouvement).
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

## 8. Chantier en cours : repas sans IA + calendrier + liste de courses

**Décision utilisateur (2026-11-05) : plus d'IA dans l'app pour la nutrition.** Le bouton « Photo / texte IA » dans Ajouter un aliment est retiré (v26) — trop peu fiable/pas assez optimisé pour lui en passant par une API. Le Coach IA (onglet séparé, `js/ai.js`, chat + génération de programme) n'a pas été touché, personne n'a demandé sa suppression à ce stade.

**Constat important : le catalogue existant couvre déjà la plupart des besoins sans IA.** `js/foods-base.js` (215 aliments) a déjà des plats composés (ex. `lasagnes` 150 kcal/100g portion 300g, `pizza`…), + recherche Open Food Facts en ligne, + scan code-barres. Avant d'ajouter un plat « manquant », vérifier qu'il n'est pas déjà dans `foods-base.js`.

**Demande : calendrier de repas + liste de courses par magasin** (ex. « bananes → Albert Heijn »). Pas d'API publique Albert Heijn (vérifié par recherche web) : seulement des libs non-officielles (reverse-engineering de l'API interne de l'app AH, nécessitent parfois un compte AH) ou des scrapers payants (Apify) — aucune fiabilité garantie, risque de casser sans préavis, zone grise CGU. **Décision : ne pas construire là-dessus.** À la place :
1. Un champ « magasin » optionnel sur un aliment (`state.foods[id].store` ou équivalent) que l'utilisateur renseigne lui-même une fois ; l'app s'en souvient.
2. Un calendrier de repas (jour → repas → aliments prévus), réutilisant le catalogue existant (`js/food.js`, `foods-base.js`, Open Food Facts).
3. Une liste de courses générée depuis le calendrier, groupée par magasin, éditable à la main.

Aucune dépendance externe ni IA pour ce chantier — 100 % local, l'utilisateur alimente les magasins lui-même au fil de l'eau.

**Fait (v27) :**
- `js/store.js` : `mealPlan` (repas prévus, distinct de `logs` = repas mangés) et `shoppingList` ajoutés au schéma (pas de bump `SCHEMA`, juste de nouveaux champs backfillés par `sanitize()`). `planDay(date)` miroir de `dayLog(date)`.
- `js/shopping.js` (nouveau, pur, testé sous Node — `tests/shopping.test.mjs`) : `dateRange`, `aggregatePlan` (somme les grammes par aliment sur une période), `regenerate` (fusionne avec la liste existante : garde les articles manuels + les coches, met à jour les quantités auto), `knownStores`, `byStore`.
- `js/views/planning.js` (nouveau) : bandeau 7 jours, 4 sections repas (réutilise `openAddFood` avec `{ target: 'plan' }`, nouveau paramètre qui écrit dans `planDay()` au lieu de `dayLog()`), feuille « Liste de courses » groupée par magasin avec coche persistée, édition du magasin par article (texte libre + datalist des magasins déjà vus), ajout d'article manuel. Accessible depuis un bouton calendrier dans l'en-tête du Journal (`js/views/today.js`).
- `js/views/addfood.js` : bouton IA retiré (v26, voir plus haut) ; signature étendue `openAddFood(meal, date, done, { target })`.
- Testé en local : ajout d'une banane au planning, régénération de la liste, coche, tag magasin (persiste sur l'aliment → réutilisé la prochaine fois), ajout manuel. Tout fonctionne.

**Reste à faire pour ce chantier :**
1. Édition/suppression d'un article de liste déjà ajouté à la main (pour l'instant seule la coche et le magasin sont modifiables après coup ; pas de suppression individuelle dans l'UI — l'utilisateur peut décocher au pire).
2. Copier un repas déjà mangé (Journal) vers le planning, ou l'inverse (actuellement deux systèmes séparés, pas de pont).
3. Export/partage de la liste de courses (texte, pour l'envoyer par message par exemple).

## 9. Liste de courses — suite (2026-11-05, v28)
Complète les points 1 et 3 du « Reste à faire » de la section 8 :
- **Modifier/supprimer un article** : le bouton magasin d'une ligne ouvre `editItem()` (`js/views/planning.js`) : magasin, nom (articles libres seulement), bouton Supprimer. Un article auto supprimé est masqué (`removed: true`), pas effacé, sinon la synchro le recréerait.
- **Une liste par sortie courses** (demande : « la picanha de la semaine prochaine doit arriver dans la liste du samedi d'avant ») : `tripFor(date, shopDay)` = dernier jour de courses avant le lundi de la semaine du repas ; `tripDates`, `upcomingTrips` (`js/shopping.js`, testés). Jour réglable dans la feuille (`state.settings.shopDay`, défaut 6 = samedi) ; changer le jour recale tous les articles sur la même semaine de repas. Synchro automatique avec le planning à chaque ouverture (plus de bouton Régénérer). Le bandeau du planning passe à 14 jours.
- **Ajouter un article = même recherche que pour un repas** : `openAddFood()` accepte `{ pick, title, extra }` ; la puce « Article libre » garde la saisie texte (non-alimentaire). Magasins proposés : ceux déjà saisis + grandes enseignes belges (`BE_STORES`), texte libre accepté.
- **Partager la liste** : `listToText()` (`js/shopping.js`, pur, 2 tests) → texte des articles non cochés groupés par magasin ; `navigator.share({ text })` (feuille iOS), sinon copie dans le presse-papiers.
- Publié en **trackme-v28**.
- Aucune donnée n'est récupérée chez Albert Heijn ni ailleurs : le magasin est un champ saisi par l'utilisateur.
- Reste : point 2 de la section 8 (pont Journal ↔ planning).

## 10. Écrans Séance et Coach au nouveau style + « Annuler » (2026-11-05, v29)
- **Séance** (`js/views/session.js`, `css/session.css`) : héros palette (`tm-hero` + `shape()`) avec grand chrono (`data-live="dur"`, toujours mis à jour par `tick()`), kg soulevés, séries faites/total, nombre d'exercices, barre de progression. Cartes d'exercice : pastille numéro (coche quand tout est fait), nom en couleur texte, compteur `2/3`, coches à la couleur de la palette.
- **Coach** (`js/views/coach.js`, `css/coach.css`) : en-tête du Journal (`td-head`) + corbeille ronde ; conversation vide → héros + 3 tuiles d'action (les puces étaient coupées) ; sinon puces défilantes. Bulles utilisateur en dégradé palette.
- **Annuler** : `toast(msg, { undo })` (`js/ui.js`, bouton 5 s). Branché sur : retirer un exercice / supprimer la dernière série (Séance), effacer la conversation (remplace le `confirm`), supprimer un aliment (Journal), supprimer une pesée (remplace le `confirm`), retirer du planning, supprimer un article de courses. Restent en `confirm` : abandonner la séance, supprimer une séance de l'historique ou une routine, tout effacer.
- Corrigé au passage : l'erreur d'import de programme du Coach s'affichait sans traduction (`toast(err.message, err.vars)`).
- Vérifié dans le navigateur (mobile clair/sombre, PC) ; pas sur un vrai iPhone. `sw.js` : `css/session.css` et `css/coach.css` ajoutés à `SHELL`. Publié en **trackme-v29**.

## 11. Listes de courses : tous les cas d'usage (2026-11-05, v30)
Demande : « si je rajoute une course pour aujourd'hui et j'achète aujourd'hui, je n'ai pas de liste » + préparer la semaine prochaine sans tout remettre sur le samedi déjà fait.
- **Rattachement figé** : chaque repas prévu reçoit une fois `entry.trip` (`assignTrips`, `js/shopping.js`) et n'en bouge plus — un repas acheté samedi reste sur la liste du samedi.
  - Sortie régulière d'avant sa semaine si elle est à venir et pas faite (repas de mardi prochain → samedi 7).
  - Sinon **liste du jour** (`todayTrip`) : repas d'aujourd'hui, de cette semaine après le samedi, ou ajouté après les courses.
  - Repas passés : aucune liste.
- **« Courses faites »** : ferme une liste (`state.shoppingDone`, nouveau champ backfillé par `sanitize()`), figée et masquée, avec Annuler. Un repas ajouté ensuite le même jour part dans `YYYY-MM-DD~2` (onglet « Aujourd'hui (2) »).
- **Onglets** (`visibleTrips`) : liste du jour, prochaine sortie régulière, listes à venir qui ont du contenu, et listes passées pas marquées faites qui ont encore des articles non cochés (rien ne se perd).
- Changement du jour des courses : `remapShopDay` déplace seulement les sorties régulières à venir. `aggregatePlan`/`upcomingTrips` supprimées (remplacées par `aggregateTrip`/`visibleTrips`). 73 tests verts.

## 12. Mixamo : PAS une panne Adobe — corriger le format de `params` (2026-11-05)
Retesté depuis la session Mixamo de l'utilisateur (navigateur intégré, Air Squat sur X Bot) :
- `gms_hash[0].params` envoyé **en tableau** `[["Overdrive", 0]]` (tel que renvoyé par `GET /api/v1/products/…`) → POST 202 puis monitor `failed` (c'est l'erreur « no implicit conversion of String into Integer » de la section 6).
- `params` envoyé **en texte** : valeurs jointes par des virgules, `g.params.map((x) => x[1]).join(',')` → `"0"` → monitor `completed` + `job_result` (URL de téléchargement).
- Corps qui marche : `{ character_id, product_name, type: 'Motion', preferences: { format: 'fbx7_2019', skin: 'true', fps: '30', reducekf: '0' }, gms_hash: [{ 'model-id', mirror, trim, overdrive: 0, params: "<valeurs,jointes>", 'arm-space', inplace: true }] }`.
- Rien n'a été téléchargé ni modifié côté 3D (réservé à la session Blender) : la section 6 « Reste à faire » est débloquée.

## 13. 3D : 28 exercices animés + 14 nouveaux mouvements (2026-11-05, v31)
- **Pipeline Mixamo qui marche** (voir section 12 pour `params`) : export depuis la session de l'utilisateur dans le navigateur intégré ; la CSP de mixamo.com bloque `fetch` vers le Mac, donc la page *navigue* vers un récepteur local (`http://127.0.0.1:5199/?name=…&url=…`, script jetable, télécharge le FBX dans `~/trackme-3d/mx-<clip>.fbx` puis renvoie vers Mixamo).
- **Retarget obligatoire dans Blender** : les FBX Mixamo n'ont pas la même orientation d'os au repos que nos corps (réimportés depuis glTF). Pour chaque clip : import FBX → contraintes `COPY_ROTATION` (monde) sur chaque os de `Armature.001` + `COPY_LOCATION` sur Hips → `nla.bake` (visual keying, contraintes retirées) → action nommée `<clip>` (fake user) dans `design/trackme-human.blend`. Sans ça, le corps est tordu.
- **Un fichier d'animation par exercice** : `models/anim/<clip>.glb` (squelette seul, 80-790 Ko), commun aux deux corps (mêmes os). Exporté depuis `Armature.001` en `ACTIVE_ACTIONS`. Les corps `models/trackme-human(-f).glb` ne gardent que `squat` (doublon `squat.001` supprimé). `viewer3d.js` charge corps + animation en parallèle (`anim` dans `model3D()`), le service worker met l'animation en cache à la première ouverture.
- **CLIPS** (`js/technique.js`) : 28 exercices animés. Nouveaux mouvements (fiche FR/EN/NL, catégorie, clip) : Sit-up, Crunch vélo, Crunch circulaire (abdos) · Pompes sautées (haut) · Jumping jacks, Corde à sauter, Box jump, Footing, Tapis de course, Sprint (cardio) · Kettlebell swing (haltéro) · Échauffement, Étirement de la nuque, Étirement des bras (mobilité). 3D ajoutée à Pompes, Planche, Gainage / crunch.
- Test `technique.test.mjs` : chaque clip pointe vers un fichier existant.
- À revoir : cadrage pendant les sauts (tête hors champ au burpee/box jump), décors de machines pas encore réglés sur les vraies poses ; Mixamo n'a rien d'utilisable pour fentes, soulevé de terre, mountain climber.
- **Vignettes avatar** (Apprendre) : `img/ex/<m|f>/<clip>-1|2.webp` rendues par `tools/render-thumbs.js` (outil de dev, pas chargé par l'app : à lancer dans la page servie en local + un récepteur local qui écrit les fichiers). Pose 1 = départ, pose 2 = la plus éloignée ; fond studio sombre dans `.lrn-pic-box`. Corps homme : `Beta_Joints.001` ajouté à l'export (trous aux articulations avant).
- **Geste du jour** : exercice animé au hasard à chaque retour (jamais le même deux fois de suite, `sessionStorage`), sur le fond de la palette (`tm-hero` + `shape()`, comme l'aperçu du Profil — les décors Miami/San Francisco ont été essayés puis retirés : avatar sans sol commun, incohérent). Visionneuse en mode `showcase` (fond transparent, sans grille ni interaction, sol calé en bas de la carte). Libérée en quittant Apprendre (`leave()` appelé par `go()` dans `app.js`) et à chaque rendu ; `dispose()` fait `forceContextLoss()`.
- **Barre à deux mains** : `equipment === 'barre'` → barre de 1,3 m posée au milieu de LeftHand/RightHand, orientée main gauche → main droite, à chaque frame.

## 14. Coach IA retiré (2026-11-05, demande de l'utilisateur : « il ne va pas être implémenté »)
- Supprimés : `js/ai.js`, `js/views/coach.js`, `css/coach.css`, section « Intelligence artificielle » du Profil (clé API, modèle, budget), bouton « Programme sur mesure avec le coach IA » de l'assistant de programme (les modèles de programme restent), `importProgram`, historique `state.chat`, test du coût IA.
- `store.js` : `sanitize()` supprime `settings.apiKey/model/budgetEur` et `chat` ; `load()` réécrit tout de suite le stockage s'il en trouve (la clé ne reste pas sur le téléphone).
- Menu mobile : l'onglet Coach est remplacé par **Apprendre** (Journal · Poids · + · Sport · Apprendre). Plus aucune dépendance réseau vers api.anthropic.com.
- 57 clés i18n orphelines liées à l'IA supprimées (`js/i18n.js`, `js/i18n/nl-base.js`, `js/i18n/extra.js`). Onglet mémorisé (`sessionStorage`/historique) validé contre `VIEWS` : un ancien `coach` ne donne plus un écran vide.
- **Cadrage 3D** (`viewer3d.js`) : calculé sur tout le mouvement (24 instants, os + disques de barre, 16 angles d'orbite), plafonné à 1,3 × le cadrage d'un corps debout ; brouillard calé sur la distance. Barre dans les mains sauf `Squat` (sur le dos) ; kettlebell unique à deux mains pour `Kettlebell swing`.

## 15. Réalisme des mouvements 3D : banc d'essai automatique (2026-11-05, v32)
Demande : « il y a des barres là où il faut pas… les mouvements doivent être naturels, fais quelque chose pour tester de manière cohérente ».
- **`tools/motion-audit.mjs`** (Node, three.js sans navigateur) : charge corps + animation comme la visionneuse, échantillonne 60 instants, mesure sur la **peau réelle** (sommets skinnés) : contact au sol, hauteur en l'air, glissade des pieds posés, dérive du bassin, raccord de boucle, écart des mains (barre rigide), mains-épaules (barre sur le dos). `node tools/motion-audit.mjs` (homme) ou `--f` (femme) affiche le tableau.
- **`tests/motion.test.mjs`** (6 tests, homme + femme) : sol à ±1,2 cm, raccord < 5 cm, dérive < 60 cm, glissade < 0,6 m/s (sauf course sur place), accessoire seulement si le clip le tient (barre : prise stable à 12 cm près ; barre sur le dos : mains < 42 cm des épaules ; kettlebell : mains < 20 cm), support obligatoire si le corps reste > 25 cm du sol.
- **`js/motion-fix.js`** (partagé visionneuse / banc d'essai / vignettes) : `prepareClip` retire la dérive horizontale du bassin (axe vertical = plus grande composante à la 1re image) et, si la fin ne raccorde pas (> 7° ou > 3 cm), ajoute 1,2 s de retour calme vers la pose de départ après la répétition ; `landingBox` déduit la box du box jump.
- **Visionneuse** : sol = point de peau le plus bas sur tout le clip ; accessoires par `prop` (`technique.js` `PROPS`) : barre à deux mains (squat avant, overhead), barre sur le dos (Squat, nouveau clip Mixamo **Back Squat**), kettlebell, haltères ; **pas de barre** sur arraché, épaulé-jeté, tirage sumo, curl barre (les clips écartent les mains de 25-45 cm). Box réelle sous le box jump. Course sur place (footing, tapis, sprint) : la grille défile à la vitesse des pieds posés.
- Défauts trouvés et corrigés : sprint qui partait de 3 m et revenait d'un coup, arraché/tirage sumo qui sautaient à chaque boucle (50 cm), sit-up et crunchs dans le sol ou en l'air (3-4 cm), box jump sur une box invisible, barre derrière la nuque au Squat avec les mains devant.


## 16. ÉTAT ACTUEL ET REPRISE (2026-11-06) — À LIRE EN PRIORITÉ, remplace les sections 5 à 7 et 13 sur la 3D
**En ligne (`main`, v34)** : 60/60 exercices animés, corps Bryce/Sophie (humains Mixamo). **Pas encore publié, sur la branche `wip-3d-mpfb`** : tout ce qui suit. Reprendre depuis cette branche (`git fetch origin wip-3d-mpfb && git checkout wip-3d-mpfb`). Elle est en cours : `tests/motion.test.mjs` y est rouge (voir point 1), ne pas la publier en l'état.

### Demandes de l'utilisateur, à respecter
- Corps 3D comme la chaîne YouTube DEMIC : anatomique, musclé, blanc mat, avec un visage, short de sport, muscle travaillé lumineux. Pas d'accessoires ni de machines (« irréalistes et inutiles ») : ce qui se fait assis ou couché se fait au sol.
- « Certains mouvements ne sont pas réalistes, il faut que ce soit cohérent avec le physique et les muscles. Exemple : au bulgarian split squat il tord sa cheville. »
- Changer de sexe dans Profil doit changer l'avatar. Plus largement : tout choix doit avoir son effet sans action cachée.

### Sur la branche
- **Corps MPFB** (extension Blender libre, MakeHuman) : `models/trackme-human.glb` (homme musclé, short, torse nu) et `-f.glb` (femme, brassière + short), ~0,8 Mo, sans texture. Script : `tools/build-mpfb-body.py`, source `design/trackme-human-real.blend` non versionnée (122 Mo) : à régénérer. Recette : `HumanService.create_human(... feet_on_ground=True, scale=0.1, macro_detail_dict=...)` (homme gender 1, muscle 1, weight .55 ; femme gender 0, muscle .75, weight .42), `add_builtin_rig(b, 'game_engine', import_weights=True)`, puis `build(body, rig, ref, tag, female)`. `ref` = armature de Y Bot (homme) ou X Bot (femme), importée de `~/trackme-3d/ybot-squat.fbx` / `xbot-squat.fbx`. Pièges : le rig `mixamo` de MPFB ne colle pas au corps (bras en A) ; « pieds au sol » laisse le rig 0,9 m plus bas (`align_rig`) ; lancer les opérateurs dans `temp_override(window, area, screen)` sans `object=`.
- **Corps sculptés (2026-11-06, remplacent les précédents)** : même recette MPFB (muscles max + cibles pectoraux/dos/bras/jambes), puis « wrap » sur une sculpture Sketchfab CC BY 4.0 (homme : *Anatomy study 2.0* de varvarwork ; femme : *Study Human Female Sculpt* de uladzislau, jambes MPFB gardées sous le genou), tête en œuf lisse sans visage (celle de l'homme, mise à l'échelle pour la femme), mains/pieds/squelette MPFB conservés, relief cuit en texture normale 1024 px (JPEG dans le glb, ~1 Mo par corps). Source : `design/trackme-human-sculpt.blend` (non versionnée, collections `TM_Preview` = corps posés + clé `SF_Wrap`, `TM_Build2` = corps exportés). Crédits affichés dans Profil (« Crédits 3D »).
- `js/motion-fix.js` : `prepareClip(clip, sex)` renvoie une copie par sexe (les clips sont partagés entre corps) et corrige le repos des **jambes** (`L = B(parent)⁻¹·L·B`, B = écart de repos monde ancien→nouveau, table mesurée sur les glb) : « pied pas à plat » 7 → 0. Bras non corrigés (coudes en hyperextension sinon). Mesure clé : sur le corps d'origine Bryce/Sophie, les clips Mixamo font déjà 167 violations → le reste vient des clips eux-mêmes.
- `js/viewer3d.js` : matériaux sans texture gérés, texture normale reprise du glb, tenue recolorée en direct. `OUTFITS` : homme = short seul, femme = brassière + short.
- Profil : enregistrement à chaque changement (plus de bouton oublié), le poids saisi crée la pesée du jour (`recordWeight`, testé), lien vers le suivi du cycle pour une femme, reset/import réappliquent l'apparence et vident la séance en cours.
- Retirés car sans effet : Blessures, Durée, Régime, Allergies, étape Alimentation. Nouveau modèle `bodyweight3` (aucun matériel).

### Reste à faire, dans l'ordre
1. **Biomécanique** : `tools/motion-audit.mjs` + `tests/motion.test.mjs` mesurent les limites articulaires et relevaient 429 violations (test écrit, corrections pas encore faites quand ce document a été écrit ; un agent y travaillait dans la session d'origine, ses corrections peuvent manquer sur la branche). Corriger `js/poses.js` : `buildPoseClip` n'impose rien sur la torsion, le pied ne suit pas le plan du genou (cheville tordue). Puis revoir les 33 poses selon `js/technique.js`, mesurer les 27 clips Mixamo et remplacer ceux qui sont faux. Contrôle visuel obligatoire : les chiffres ne suffisent pas. Ne pas relâcher les limites pour faire passer le test.
   État au 2026-11-06 après les corps sculptés : 143 violations sur les clips, 16 sur les poses, 4 erreurs d'IK (Développé incliné haltères, Rowing haltère) ; 81/85 tests verts, les 4 rouges sont la biomécanique. À faire aussi : aisselle qui se déforme bras levés (squat), petites taches de la texture femme (poignet, mamelon, pli fessier).
2. ~~Régénérer les vignettes~~ fait (232 images, nouveaux corps). L'outil ne retouche plus le shader des vêtements sans texture (cassait les shorts).
3. Vérifier au format iPhone : passage Homme↔Femme dans Profil, 3D, tenues. Puis `VERSION` de `sw.js` (déjà v35), `MAP.md`, tests, publication sur `main`.
4. Mineurs relevés en revue, non faits : `state.settings.outfit` partagé entre sexes ; besoins périmés dans Profil après une saisie au clavier jusqu'au redessin.
5. Si l'utilisateur le veut : bandeau de petits corps avec le muscle ciblé, séries × reps sur l'animation, reprise de fonctions Hevy.

### Limites à dire à l'utilisateur
Corps sans cheveux ni yeux détaillés (assets MPFB non installés). Lueur par segment d'os, pas par muscle dessiné. Jamais testé sur un vrai iPhone. Droits Mixamo à vérifier avant d'ouvrir l'app à d'autres (animations et squelette dans un dépôt public).

### Outils de la session d'origine
Blender + addon MCP sur le Mac de l'utilisateur (port 9876, extension MPFB installée). Session Mixamo ouverte dans le navigateur intégré : token `localStorage.access_token`, `params` en texte (section 12). Ne jamais saisir ses identifiants.

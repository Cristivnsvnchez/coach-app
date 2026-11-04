# TrackMe — plan d'exécution (agents parallèles)

Dépôt : `~/coach-app-preview` (git, servi en local sur http://localhost:5173). Lire d'abord `MAP.md`, `DESIGN.md`, `PRODUCT.md`.
Prototype validé (référence visuelle) : https://claude.ai/artifact/FfBejohxNWm8stkPQkz32J.

## Règles communes
- Vanilla JS ES modules, pas de build, pas de nouvelle dépendance réseau. Code commenté en français comme l'existant.
- Rendu : `export function render(root, go, arg)` ; helpers `nav, group, sheet, toast, esc, fmt, fmtDate, lineChart, ring, bar` (js/ui.js) ; icônes `icon(name)` (js/icons.js, ajouter des icônes au trait 1,9 px si besoin) ; formes `shape({v})` et couleurs `colors()` (js/theme.js).
- Style : uniquement dans TON fichier CSS (`css/<vue>.css`), classes préfixées par la vue. Variables : `--p-deep --p-mid --p-warm --p-tint --bg --cell --label --label-2 --separator --fill`. Boutons : `.btn.filled.large` (principal), `.btn` (secondaire), `.btn.plain`. Arrondis : cartes 24–28 px, boutons 28 px, feuilles 32–40 px.
- Textes : source FR dans `t('…')` ; dans TON module, `import { register } from '../i18n.js'; register({ en: {...}, nl: {...} })` pour chaque nouveau texte (EN + NL obligatoires).
- État : `state` / `save()` de js/store.js. Champs déjà prévus : `state.cycle`, `state.foodGroups`, `state.strava`, `state.settings.palette|shape`.
- Tests purs dans `tests/<module>.test.mjs` (node:test) pour toute logique calculée. `node --test tests/*.test.mjs` doit rester vert.
- Ne touche QUE tes fichiers. Ne commit pas, ne publie pas. Termine par un rapport : fichiers modifiés, comment tester, limites.

## Lots
| Agent | Fichiers possédés | Livrable |
|---|---|---|
| Onboarding | js/views/onboarding.js, js/views/palette.js (nouveau), js/views/profile.js, css/onboarding.css | Accueil non linéaire (forme palette + feuille crème), étapes par sélection, étape palette+forme, kcal proposées Mifflin-St Jeor modifiables (state.profile.custom), langue FR/EN/NL ; Profil → Apparence (palette) et Langue (3) |
| Journal | js/views/today.js, js/views/habits.js, css/today.css | Héros palette (grand chiffre kcal restantes/en trop, barre mangé/brûlé via `kcalBurnedOn` de js/strava.js, budget = objectif + 50 % brûlé si `state.strava.prefs.kcal`), tuiles macros, cartes repas +, repères ANSES (fruits & légumes 5/j, poisson 2/sem) dans state.foodGroups, checklist repliable, pastille cycle (si activé) → go('cycle'), boutons Coach et Profil dans l'en-tête |
| Cycle | js/views/cycle.js, css/cycle.css, js/views/weight.js, js/views/session.js | Écran cycle (héros, calendrier pastilles + filtres, stats, saisie flux/symptômes, alertes) avec js/cycle.js ; poids : bande/annotation rétention ; séance : bandeau conseil `trainingNote`. Masqué si sexe ≠ F ou cycle désactivé |
| Strava | js/strava.js, js/views/activities.js, js/views/connect.js, strava-callback.html, css/activities.css, tests/strava.test.mjs | OAuth personnel (client id/secret saisis, autorisation → page callback qui affiche le code à copier, échange + refresh du token), sync activités (API v3, CORS OK), liste/filtre/détail, « Dans TrackMe » (kcal au budget, alléger la séance suivante), contrat `isConnected, activitiesOn, kcalBurnedOn` |
| Apprendre | js/views/learn.js, js/technique.js, css/learn.css, js/views/training.js, js/views/exsheets.js | Bibliothèque d'apprentissage : recherche, niveaux, cartes avec pictogramme SVG, maîtrise (séances faites /8), fiche Étapes/Erreurs/Conseils pour les 39 exercices de js/exercises.js (FR/EN/NL) ; accès depuis Sport et depuis la fiche exercice |
| i18n | js/i18n/nl-base.js | Traduction NL de toutes les clés du dictionnaire EN de js/i18n.js |
| Prototype | artifact canvas | Appliquer palette, boutons pilule 56 px, arrondis et nouveau menu aux écrans restants du canvas |

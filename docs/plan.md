# Coach PWA — Implementation Plan

> Exécution : native (Claude implémente), puis 1 agent de revue + 1 agent de vérification des références.

**Goal:** PWA iPhone hors ligne : suivi kcal/macros, poids + tendance, entraînement avec progression, coach IA sourcé.
**Architecture:** Vanilla JS en modules ES, pas de build. Logique scientifique pure dans `js/science.js` (testée sous Node). État persistant dans `localStorage` via `js/store.js`. Vues par onglet dans `js/views/`. Service worker = cache hors ligne.
**Tech Stack:** HTML/CSS/JS ES2022, node:test, API Claude (navigateur), Open Food Facts, ZXing (chargé à la demande pour le scan).
**Spec:** `DESIGN.md`

## Global Constraints
- Aucune dépendance au build ; graphiques en SVG maison.
- Interface en français ; unités métriques.
- Plancher kcal 1200 F / 1500 H ; déficit ≤ 25 % TDEE ; rythme perte 0,25–1 %/sem.
- Poids cible toujours en fourchette.
- Clé API uniquement dans le stockage local du téléphone.
- Modèle par défaut `claude-sonnet-5-5`, web search limité à la liste blanche.

## Review Focus
1. Profil incomplet → l'app ne plante pas, invite à compléter (test : `targets()` renvoie `null` si profil incomplet).
2. Moins de 10 jours loggés → TDEE = formule, pas d'adaptatif (test dédié).
3. Jours sans saisie → exclus de l'apport moyen (test dédié).
4. Pas de réseau / pas de clé → message clair dans Coach IA et recherche d'aliments.
5. Réponse IA non-JSON → affichée en texte, pas d'erreur bloquante.

## Files
- `index.html`, `manifest.webmanifest`, `sw.js`, `icons/`
- `css/app.css`
- `js/science.js` — `bmr, tdeeInitial, emaTrend, adaptiveTdee, targets, idealRange, etaDate, epley1RM, nextSet`
- `js/store.js` — `load(), save(), state, today(), dayLog(date)`
- `js/food.js` — `lookupBarcode(ean), searchFood(q)`
- `js/ai.js` — `ask(messages, {search, system, json})`
- `js/ui.js` — helpers DOM, `lineChart()`, `ring()`
- `js/views/{today,weight,training,coach,profile}.js` — `render(root)`
- `tests/science.test.mjs`

## Tasks
1. **science.js + tests** — valeurs : Mifflin (H 80 kg/180 cm/30 ans = 1780), PAL FAO, EMA α 0,1, adaptatif fenêtre 21 j min 10 jours loggés lissé 0,8/0,2, protéines 2,0/1,6/1,8 g/kg, lipides max(0,6 g/kg, 20 %), fibres ≥ 30, IMC 18,5–24,9 + Devine/Robinson/Hamwi, Epley, double progression (+2,5 % haut / +5 % bas, décharge −10 % après 2 échecs). Run `node --test tests/`.
2. **store + shell + SW + manifest** — onglets, persistance, installable. Vérif : preview mobile, rechargement hors ligne.
3. **Aujourd'hui + food.js** — log repas, récents, copier hier, scan/recherche OFF, eau.
4. **Poids** — pesée, graphique brut+tendance, fourchette, ETA, jalons.
5. **Entraînement** — programmes, séance pré-remplie, minuteur repos, records, volume/muscle.
6. **Coach IA + ai.js** — chat, recette, programme (import dans Entraînement), photo repas, bilan hebdo.
7. **Profil** — formulaire, garde-fous (mineur/grossesse/TCA), clé, export/import JSON.
8. **Revue agent + vérif DOI**, corrections, déploiement HTTPS.

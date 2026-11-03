# Coach — design V1 (2026-11-03)

## Intention
App perso iPhone : coach sportif + diététicien, sans compte développeur Apple.
Données sur le téléphone. IA qui s'appuie sur des sources scientifiques, pas des blogs.

## Approches considérées
| Approche | Pour | Contre |
|---|---|---|
| **PWA (retenue)** — HTML/JS installée via Safari « Sur l'écran d'accueil » | Gratuit, plein écran, hors ligne, pas de Mac/Xcode à chaque mise à jour | Pas d'App Store, notifications seulement si installée (iOS 16.4+) |
| App native Swift + sideload (AltStore / Xcode gratuit) | Vraie app native | Re-signature obligatoire tous les 7 jours sans compte payant |
| Expo Go (React Native) | Proche du natif | Dépend de l'app Expo Go, pas autonome |

## Écrans (5 onglets)
1. **Aujourd'hui** — anneau kcal restantes, barres protéines/glucides/lipides/fibres, eau, repas du jour, saisie express (récents, favoris, « copier hier », macros manuelles).
2. **Poids** — pesée du jour, courbe brute + tendance lissée (EMA α=0,1), fourchette de poids cible (IMC OMS + Devine/Robinson/Hamwi), date d'arrivée estimée, timeline des jalons.
3. **Entraînement** — programme, log de séance pré-rempli depuis la dernière, double progression automatique, minuteur de repos, records + 1RM (Epley), volume hebdo par muscle vs cible 10–20 séries.
4. **Coach IA** — chat + actions : « recette selon mes macros restantes », « génère mon programme », « analyse photo de repas », « bilan de la semaine ». Recherche web limitée à une liste blanche (PubMed, ANSES/Ciqual, EFSA, OMS, USDA, ISSN…) avec citations affichées.
5. **Profil** — âge, sexe, taille, activité, objectif, rythme (0,25–1 %/sem), clé API Claude, export/import JSON.

## Science (codée)
- TDEE initial Mifflin-St Jeor × PAL FAO/OMS ; puis TDEE adaptatif après ≥10 jours loggés (apport moyen − pente tendance × 7700, lissé 80/20).
- Déficit ≤ 25 % TDEE, rythme 0,5–1 %/sem ; plancher 1200 F / 1500 H.
- Protéines 1,6 / 2,0 / 1,8 g/kg (maintien / sèche / prise) ; lipides ≥ max(0,6 g/kg, 20 %) ; fibres ≥ 30 g.
- Avertissement + redirection pro si mineur, grossesse ou TCA.

## Données & APIs
- Stockage : localStorage local (pas de serveur ; quelques Mo suffisent pour des années de texte). Export JSON pour sauvegarde.
- Recherche texte : Open Food Facts quand disponible (souvent en 503), sinon estimation IA (valeurs Ciqual/USDA). Table Ciqual embarquée : à faire (téléchargement ANSES bloqué aux robots).
- Aliments : Open Food Facts (code-barres + recherche, CORS OK), cache local.
- IA : API Claude appelée directement depuis le téléphone (clé perso, usage strictement personnel).

## Non-objectifs V1
Sync multi-appareils, Apple Santé, Apple Watch, social, abonnement.

## Choix laissés au builder (mes calls)
Pas de framework (vanilla JS + Chart.js), design sombre/clair auto, modèle Claude par défaut `claude-sonnet-5-5`.

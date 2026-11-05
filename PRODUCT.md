# TrackMe — produit

## Ce que c'est
TrackMe est une app personnelle iPhone (PWA installée depuis Safari) qui réunit coach sportif et diététicien :
calories et macros, poids et tendance, séances de musculation, apprentissage des mouvements, suivi du cycle
(utilisatrices). Le coach IA a été retiré (voir docs/HANDOFF.md, section 14). Les données restent sur le téléphone.

## Pour qui
Une personne qui s'entraîne seule, veut des chiffres justes et des conseils fondés sur la science, sans bruit.
Usage : plusieurs fois par jour, quelques secondes à chaque fois (saisir un repas, cocher une série, se peser),
souvent d'une main, en salle ou en cuisine.

## Langues
Français (source), anglais, néerlandais. Chaque nouveau texte existe dans les trois langues.

## Mode
Operate : l'interface sert la tâche. Lisibilité, constance et gestes natifs iOS priment sur l'expression.

## Principes
- Proposer, laisser décider : tout chiffre calculé (kcal Mifflin-St Jeor, macros, charges) est une proposition modifiable.
- Science sourcée, ton simple : chaque recommandation dit pourquoi en une phrase.
- Jamais culpabilisant : écarts et retards affichés en neutre, avec la prochaine action.
- Sécurité : planchers caloriques, garde-fous santé (mineurs, grossesse, TCA, cycle), le cycle n'est pas une contraception.

## Intégrations
- Strava : retiré (v17). L'ouverture à d'autres comptes dépend d'une validation Strava incertaine (quota d'un athlète, règles IA).
- Montres et Apple Santé : plus tard, via un raccourci iPhone (export des séances), sans serveur.
- Nourriture : base embarquée de 215 aliments (hors ligne) + Open Food Facts + scan code-barres. Estimation IA retirée (v26), comme le coach IA (voir docs/HANDOFF.md, sections 8 et 14).

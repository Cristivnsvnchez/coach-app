# TrackMe — système de design

Monde : « précision calme ». Fond clair légèrement froid, cartes blanches, encre presque noire pour l'action,
couleur réservée aux données. Une seule voix typographique (Geist). Verre uniquement sur la couche de contrôle
(barre d'onglets, minuteur, feuilles).

## Parcours v2 (référence actuelle)
Source : canevas Design « TrackMe Parcours v2 » (claude.ai/artifact/5Aq8TtTfuJzch1b4Zr9ftZ), 41 écrans à 375 × 812.
Implémentation : `css/v2.css`, chargée en dernier ; elle prime sur trackme.css et les CSS par vue.
- Jetons : profond #1B3FD1, moyen #2F7BFF, chaud #FF8A3D, teinte #E6ECFF, encre #141418 / #5E5E6A, filet #E6E6EB,
  carte blanc 88 %, feuille #F3F4F8 ; couleurs de données : repas #1F8A4C, eau #1C8FA0, cycle #C2255C, fertile #7A4BD1,
  SPM #B35A1F, effort #D9480F, alerte #A15C00, danger #C92A2A. Fond : gris bleuté #EEF1F7 avec deux halos.
- Sombre : dérivé (le canevas est en clair) ; les textes bleus passent à #9DB8FF pour rester lisibles.
- En-tête plein cadre (`.v2-hero`) : halos flous profond / moyen / chaud (cycle : framboise → violet), texte blanc,
  boutons ronds en verre 44 px ; le contenu suit dans une feuille arrondie 40 px (`.v2-leaf`). Écrans : Journal,
  séance en direct, Cycle, Étape atteinte.
- Cartes 24 px (`.v2-card`), listes à lignes (`.v2-li`) avec pastille 40 px (`.v2-av`) et chevron.
- Bouton principal : pilule 56 px en dégradé profond → moyen avec pastille flèche à droite (`.btn.filled.large.v2-go`).
- Barre d'onglets : capsule blanche 62 px, icônes seules, onglet actif en pastille teintée avec libellé, « + » surélevé 60 px.
  Ordre : Journal, Séances, +, Poids, Apprendre.
- Feuilles : fond #F7F7FA, rayon 40, poignée 40 × 5. Toast : pilule encre en haut, sous l'île.
- Écarts assumés avec le canevas : pastille « Dépense » au lieu de « Brûlé » (rien ne mesure les kcal brûlées),
  segment « Tout » sur la courbe de poids, sections détaillées gardées sous chaque écran (aucune fonction retirée).

## Palette fixe : Océan (prépondérante)
Une seule palette domine l'app : Océan, avec la forme Vague. L'utilisateur ne choisit plus ni la palette ni la forme
(étape retirée de l'onboarding et de Profil → Apparence, qui ne garde que le mode clair/sombre et la matière).
Les anciens choix enregistrés sont ignorés. Fond papier crème #F3F0EA ; formes en dégradés organiques flous avec
grain (SVG feGaussianBlur + feTurbulence).

| Palette | Principale (boutons, progression) | Moyenne | Chaude | Teinte (bouton secondaire) |
|---|---|---|---|---|
| Océan | #1B3FD1 | #2F7BFF | #FF8A3D | #E6ECFF |

La couleur principale garde un contraste ≥ 4,5:1 avec le blanc. Elle remplace `--ink` pour
les boutons principaux et `--brand` pour la progression. Restent fixes pour garder leur sens : cycle (rose),
alerte et erreur.

## Couleurs (tokens)
| Rôle | Clair | Sombre | Usage |
|---|---|---|---|
| `--bg` fond | #F4F4F6 | #0B0B0D | arrière-plan |
| `--surface` carte | #FFFFFF | #18181C | cartes, listes |
| `--ink` texte / action | #141418 | #F4F4F6 | titres, texte, **boutons principaux** |
| `--ink-2` texte secondaire | #5E5E6A | #A3A3AE | sous-titres (≥ 4,5:1) |
| `--line` séparateur | #E6E6EB | #2A2A30 | filets |
| `--fill` contrôle neutre | #EDEDF1 | #26262C | boutons secondaires, champs |
| `--brand` vert TrackMe | #1F8A4C | #3FD07A | progression, états positifs, onglet actif |

Couleurs de données (jamais sur un bouton d'action) :
- nutrition `--d-food` #1F8A4C · hydratation `--d-water` #1C8FA0 · sommeil `--d-sleep` #5F7F4A
- cycle `--d-cycle` #C2255C (règles), #7A4BD1 (fertile), #B35A1F (SPM)
- effort `--d-effort` #D9480F
- alerte `--warn` #A15C00 · erreur `--danger` #C92A2A

Dégradés : uniquement sur la carte héros d'un domaine (nutrition vert→turquoise, cycle rose→violet) ; texte blanc ≥ 4,5:1.

## Composition
Pas d'empilement linéaire : une forme de la palette déborde du cadre, une feuille crème arrondie (40 px en haut)
la chevauche, des pastilles flottent sur la forme. Arrondis : bouton 28 px (hauteur 56), carte 24–28 px,
pastille 17–20 px, feuille 40 px.

## Menu
Capsule blanche flottante (62 px, rayon 31). L'onglet actif s'élargit en pastille teintée de la palette avec son
libellé ; les autres sont des icônes seules. Le « + » central est un cercle de 60 px à la couleur principale,
surélevé, entouré d'un anneau couleur fond.

## Boutons (une seule hiérarchie partout)
- **Principal** : pilule couleur principale de la palette, 56 px, rayon 28, texte blanc 600, flèche dans une pastille
  à droite. Un seul par écran.
- **Secondaire** : pilule teinte de la palette, texte couleur principale.
- **Discret** : texte `--ink` 600, sans fond (Annuler, Passer).
- **Icône** : cercle 44 px `--fill`, icône `--ink`.
- **Destructif** : texte `--danger`, sans fond.
- Pastilles de filtre : inactive `--surface` + filet `--line` ; active `--ink` + texte `--surface`.
Les couleurs de données n'apparaissent jamais en fond de bouton.

## Marque
Logotype « TrackMe. » : Funnel Display 650, approche -0.055em, point final rond (couleur chaude de la palette, blanc sur
une forme). Icône d'app : monogramme « T. » blanc sur la forme Océan granuleuse. Pas d'autre ornement.

## Typographie
Deux voix, toutes deux OFL et embarquées : **Funnel Display** (affichage : logotype, titres, grands chiffres ; 600,
approche -0.035em, chiffres tabulaires) et **Geist** (texte courant, libellés, contrôles). Titres en casse de phrase.
32/600 titre d'écran · 24/600 titre de feuille · 19/600 titre de section · 16/600 libellé · 15/400 corps ·
13/400 secondaire · 11/500 légende. Grand chiffre du Journal : 72/500.

## Matière
Profil → Apparence → Matière. **Papier** : fond crème #F3F0EA mat. **Brume** (par défaut) : fond flou à dégradé
neutre bleu-gris teinté par la palette, cartes blanches translucides sans flou, verre givré (blur 22 px) réservé aux
contrôles posés sur le contenu (menu, segments, pastilles, boutons ronds, feuilles). Bouton principal en dégradé
principale → moyenne. Respecte `prefers-reduced-transparency`.

## Icônes
Un seul jeu dessiné, trait 1,9 px, extrémités rondes, grille 24 px. Onglet actif : pastille `--ink`, icône `--surface`.
Pas d'emoji dans l'interface.

## Formes et espace
Rayons : carte 24 px, carte héros 28 px, champ 14 px, pilule 999 px. Espacement : 4 · 8 · 12 · 16 · 24 · 32.
Cibles tactiles ≥ 44 px. Ombres : douces avec décalage (0 6 18 rgba(0,0,0,.05)) ; aucune lueur.

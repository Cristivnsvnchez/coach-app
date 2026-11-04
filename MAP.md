# MAP.md — carte du code TrackMe (générée, à lire AVANT d'ouvrir les fichiers)

PWA vanilla JS (modules ES), pas de build. Tests : `node --test tests/*.test.mjs`. Système de design : DESIGN.md. Produit : PRODUCT.md.

## index.html (25 lignes) — 


## sw.js (32 lignes) —  Cache hors ligne de l'app. Incrémenter VERSION à chaque mise à jour pour forcer le rafraîchissement.


## css/app.css (486 lignes) —  Système de design aligné sur les Human Interface Guidelines d'Apple (iOS) :


## js/ai.js (228 lignes) —  Appels à l'API Claude directement depuis le téléphone (clé perso, usage strictement personnel).
- MODELS - ALLOWED_DOMAINS - SYSTEM - hasKey - PRICES - USD_TO_EUR - usage - costUsd - userContext - ask - testConnection - extractJson - stripJson - imageToBase64 - estimateMeal - programQuestions - programGenerate 

## js/app.js (65 lignes) —  Point d'entrée : onglets, barre de navigation au défilement, persistance, service worker.
- applyLook 

## js/cycle.js (94 lignes) —  Suivi du cycle menstruel (pur, testé sous Node) : durées moyennes, prédictions, phase d'un jour,
- SYMPTOMS - FLOWS - avgCycleLen - avgPeriodLen - cycleStartFor - phaseOn - nextStarts - nextOvulation - weightNote - trainingNote - alerts 

## js/exercises.js (81 lignes) —  Bibliothèque d'exercices (noms français = clés de l'historique ; traduits à l'affichage).
- LIBRARY - EQUIPMENT - findExercise - DEFAULT_PROGRAM 

## js/food.js (155 lignes) —  Aliments : Open Food Facts (code-barres + recherche), cache local dans state.foods.
- lookupBarcode - searchFood - saveFood - entryFor - loadZXing - decodeImage - startScan 

## js/habits.js (50 lignes) —  Checklist quotidienne : habitudes auto-cochées d'après les données du jour + habitudes manuelles, et série de jours.
- AUTO - DEFAULT_HABITS - habitName - dayStatus - completion - streak 

## js/i18n.js (255 lignes) —  Traduction FR/EN. La clé est le texte français ; `t()` renvoie l'anglais si la langue active est 'en'.
- getLang - locale - setLang - t 

## js/icons.js (50 lignes) —  Icônes SVG au trait, dessinées pour l'app (les SF Symbols ne sont pas licenciés pour le web).
- icon 

## js/metrics.js (52 lignes) —  Objectifs du jour calculés à partir du profil, du dernier poids et de la dépense adaptative.
- current - observedKgPerWeek - weeklyVolume - habitStatus - habitRates 

## js/planner.js (138 lignes) —  Planification (pure, testée sous Node) : modèles de programmes, programme daté (phases + décharges),
- GOAL_REPS - PLAN_GOALS - TEMPLATES - recommendTemplate - defaultWeekdays - buildPlan - weekOf - isDeload - phaseOf - schedule - toICS 

## js/science.js (230 lignes) —  Calculs nutrition / entraînement. Fonctions pures, sans DOM (testées sous Node).
- KCAL_PER_KG - PAL - GOALS - isProfileComplete - parseDate - isoDate - bmr - tdeeInitial - emaTrend - slope - trendSlope - adaptiveTdee - bmi - targets - applyCustom - idealRange - etaDate - milestones - reachedOn - milestoneStatus - projection - epley1RM - nextSet - MUSCLES - REFS 

## js/store.js (110 lignes) —  État persistant dans localStorage (données uniquement sur le téléphone).
- state - load - save - replace - today - dayLog - uid - sum - intakesByDay - latestWeight - recentFoods 

## js/ui.js (106 lignes) —  Petits utilitaires DOM, composants iOS et graphiques SVG.
- esc - fmt - fmtDate - nav - group - ring - bar - lineChart - md - toast - sheet 

## js/workout.js (165 lignes) —  Logique des séances (pure, testée sous Node) : volume, records, précédent, streak hebdo, disques, échauffement.
- SET_TYPES - SET_LABEL - EX_TYPES - effectiveLoad - setVolume - exerciseVolume - workoutVolume - doneSets - exerciseRecords - setPRs - previousSets - exerciseSeries - weekStart - weekStreak - restDays - muscleSets - plates - warmupSets - routineDiffers - migrateProgram 

## js/views/addfood.js (173 lignes) —  Feuille « Ajouter un aliment » : récents, favoris, recherche, scan, IA, saisie manuelle.
- MEALS - openAddFood 

## js/views/coach.js (142 lignes) —  Onglet Coach IA : chat sourcé + actions (recette, programme, bilan hebdo).
- ACTIONS - render 

## js/views/exsheets.js (113 lignes) —  Feuilles liées aux exercices : sélection (bibliothèque + perso), fiche (graphique, records, historique), disques.
- pickExercise - openExercise - platesSheet 

## js/views/habits.js (80 lignes) —  Checklist du jour (rendue dans l'onglet Aujourd'hui) + feuille de réglage des habitudes.
- toggleHabits - habitsCells - handleHabitClick 

## js/views/onboarding.js (141 lignes) —  Onboarding : accueil, puis une question par écran, surtout par sélection (cartes, pastilles, stepper).
- needsOnboarding - openOnboarding 

## js/views/profile.js (165 lignes) —  Onglet Profil : langue, données perso, objectif, clé API, sauvegarde, références.
- render 

## js/views/program.js (182 lignes) —  Assistant de programme : brief (objectif, date, jours, durée, niveau, blessures) → programmes proposés
- openWizard - planCard - plannedDays - exportCalendar 

## js/views/session.js (283 lignes) —  Séance en direct : chrono/volume/séries, types de série, colonne « Précédent », repos par exercice (±15 s),
- active - persist - startWorkout - renderSession 

## js/views/today.js (110 lignes) —  Onglet Aujourd'hui : anneau kcal + macros en haut, checklist repliable et eau, puis les repas en une seule liste.
- render 

## js/views/training.js (178 lignes) —  Onglet Entraînement : routines (dossiers), séance en direct, calendrier et streak, muscles, exercices, historique.
- render - importProgram 

## js/views/weight.js (150 lignes) —  Onglet Poids : pesée, courbe (pesées, tendance, projection, cible, étapes), poids de référence,
- render 


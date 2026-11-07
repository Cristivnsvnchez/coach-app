# MAP — carte du code TrackMe (générée)

## index.html (34 l.)
<!doctype html>

## sw.js (36 l.)
Cache hors ligne de l'app. Incrémenter VERSION à chaque mise à jour pour forcer le rafraîchissement.

## css/app.css (489 l.)
Système de design aligné sur les Human Interface Guidelines d'Apple (iOS) :

## css/cycle.css (58 l.)
TrackMe — styles de la vue cycle (voir DESIGN.md, css/trackme.css).

## css/learn.css (113 l.)
TrackMe — styles de la vue learn (voir DESIGN.md, css/trackme.css).

## css/motion.css (51 l.)
TrackMe : motion design sobre et natif iOS (ressort au toucher, entrée des écrans, feuilles, coche).

## css/onboarding.css (125 l.)
TrackMe — styles de la vue onboarding (voir DESIGN.md, css/trackme.css).

## css/planning.css (18 l.)
TrackMe — vue Planifier mes repas (calendrier + liste de courses, voir DESIGN.md, css/trackme.css).

## css/session.css (65 l.)
TrackMe — écran Séance en direct (voir DESIGN.md, css/trackme.css). Héros palette + cartes d'exercice rayon 24.

## css/today.css (112 l.)
TrackMe — vue Journal (today). Fond var(--bg), cartes var(--cell) rayon 24, pas de filets durs.

## css/trackme.css (296 l.)
TrackMe : couche de style au-dessus de app.css (voir DESIGN.md).

## js/app.js (121 l.)
Point d'entrée TrackMe : menu (capsule + « + » central qui ouvre 4 actions rapides : repas, pesée, séance, eau), routes, thème, onboarding, service worker.
exports: go

## js/cycle.js (102 l.)
Suivi du cycle menstruel (pur, testé sous Node) : durées moyennes, prédictions, phase d'un jour,
exports: SYMPTOMS,FLOWS avgCycleLen,cycleSd avgPeriodLen,cycleStartFor phaseOn,nextStarts nextOvulation,weightNote trainingNote,alerts

## js/exercises.js (106 l.)
Bibliothèque d'exercices (noms français = clés de l'historique ; traduits à l'affichage).
exports: LIBRARY,EQUIPMENT CATEGORIES,CATEGORY_LABEL findExercise,DEFAULT_PROGRAM

## js/food.js (187 l.)
Aliments : Open Food Facts (code-barres + recherche), cache local dans state.foods.
exports: lookupBarcode,searchBase searchFood,saveFood entryFor,loadZXing decodeImage,startScan

## js/foodgroups.js (32 l.)
Repères ANSES (pur, testé sous Node) : portions de fruits & légumes (5/jour) et de poisson (2/semaine).
exports: GOALS,getPortions addPortion,weekDates weekTotal,avg7

## js/foods-base.js (240 l.)
Base d'aliments génériques embarquée (recherche instantanée, hors ligne).
exports: BASE_FOODS

## js/habits.js (104 l.)
Checklist quotidienne : habitudes auto-cochées d'après les données du jour + habitudes manuelles, et série de jours.
exports: AUTO,DEFAULT_HABITS habitName,dayStatus migrateHabits,suggestTasks addTask,toggleTask removeTask,tasksLeft cleanDayTasks,completion streak

## js/i18n.js (236 l.)
Traduction FR/EN. La clé est le texte français ; `t()` renvoie l'anglais si la langue active est 'en'.
exports: register,hasTranslation LANGS,getLang locale,setLang t

## js/icons.js (52 l.)
Icônes SVG au trait, dessinées pour l'app (les SF Symbols ne sont pas licenciés pour le web).
exports: icon

## js/install.js (77 l.)
Installation et sécurité des données : aide « Sur l'écran d'accueil » (Safari iOS n'a pas de bouton d'installation),
exports: isStandalone,exportBackup startupNudges

## js/metrics.js (52 l.)
Objectifs du jour calculés à partir du profil, du dernier poids et de la dépense adaptative.
exports: current,observedKgPerWeek weeklyVolume,habitStatus habitRates

## js/motion-fix.js (176 l.)
Corrections des clips Mixamo avant affichage (pures, partagées par la visionneuse, le banc d'essai
exports: loopGap,prepareClip landingBox

## js/motion.js (24 l.)
Motion : petits utilitaires d'animation (compteur animé, préférence « réduire les animations »).
exports: reducedMotion,countUp

## js/net.js (35 l.)
Réseau résilient pour toutes les API externes (Claude, Open Food Facts) :
exports: retryDelay,shouldRetry fetchRetry

## js/planner.js (122 l.)
Planification (pure, testée sous Node) : modèles de programmes, programme daté (phases + décharges),
exports: GOAL_REPS,PLAN_GOALS TEMPLATES,recommendTemplate defaultWeekdays,buildPlan weekOf,isDeload phaseOf,schedule 

## js/poses.js (389 l.)
Mouvements 3D décrits par poses clés (exercices absents de Mixamo : soulevé de terre, développé couché, fentes…).
exports: POSES,buildPoseClip

## js/recovery.js (53 l.)
Récupération musculaire (récupère < 48 h / prêt / à reprendre > 7 j) et correction d'une séance enregistrée. Pures, testées.
exports: recoveryMap,editedWorkout

## js/science.js (230 l.)
Calculs nutrition / entraînement. Fonctions pures, sans DOM (testées sous Node).
exports: KCAL_PER_KG,PAL GOALS,isProfileComplete parseDate,isoDate bmr,tdeeInitial emaTrend,slope trendSlope,adaptiveTdee bmi,targets applyCustom,idealRange etaDate,milestones reachedOn,milestoneStatus projection,epley1RM nextSet,MUSCLES REFS

## js/shopping.js (156 l.)
Liste de courses (pure, testée sous Node) : agrège les repas prévus (mealPlan) sur une période,
exports: dateRange,regenerate tripFor,tripDates knownStores,byStore listToText,tripDay todayTrip,nextScheduled assignTrips,aggregateTrip tripMealDates,visibleTrips remapShopDay

## js/store.js (172 l.)
État persistant dans localStorage (données uniquement sur le téléphone).
exports: SCHEMA,state load,save flush,replace today,dayLog planDay,uid sum,intakesByDay latestWeight,recentFoods

## js/technique.js (664 l.)
Fiches technique (apprentissage) : niveau, étapes, erreurs fréquentes, conseils en FR / EN / NL + pictogramme SVG au trait.
exports: LEVELS,LEVEL_LABEL LANGS_T,hasFigure combineMuscles,model3D OUTFITS,outfitsFor pictogram,getTechnique allTechniques,missingTechniques

## js/theme.js (74 l.)
Palette TrackMe (fixe : Océan) : variables CSS (--p-deep, --p-mid, --p-warm, --p-tint) et formes
exports: PALETTES,SURFACES palette,variant colors,applyTheme shape,wordmark SCHEMES,applyScheme

## js/ui.js (172 l.)
Petits utilitaires DOM, composants iOS et graphiques SVG.
exports: esc,fmt fmtDate,nav group,ring bar,lineChart md,toast sheet,sheetPop banner

## js/viewer3d.js (279 l.)
Visionneuse 3D 360° des exercices : modèle humain animé (glb exporté de Blender depuis Mixamo), à tourner au doigt.
exports: mount3D

## js/workout.js (165 l.)
Logique des séances (pure, testée sous Node) : volume, records, précédent, streak hebdo, disques, échauffement.
exports: SET_TYPES,SET_LABEL EX_TYPES,effectiveLoad setVolume,exerciseVolume workoutVolume,doneSets exerciseRecords,setPRs previousSets,exerciseSeries weekStart,weekStreak restDays,muscleSets plates,warmupSets routineDiffers,migrateProgram

## js/i18n/extra.js (64 l.)
Textes EN + NL manquants repérés par tests/i18n-scan.mjs (clés déjà utilisées sans traduction).

## js/i18n/nl-base.js (204 l.)
NL : traductions néerlandaises. register({ nl: { 'texte FR': 'NL' } })

## js/views/addfood.js (157 l.)
Feuille « Ajouter un aliment » : récents, favoris, recherche, scan, IA, saisie manuelle.
exports: MEALS,openAddFood

## js/views/cycle.js (306 l.)
Vue « cycle » : héros (phase du jour, prochaines ovulation / règles), calendrier mensuel filtrable, statistiques,
exports: render

## js/views/exsheets.js (118 l.)
Feuilles liées aux exercices : sélection (bibliothèque + perso), fiche (graphique, records, historique), disques.
exports: pickExercise,openExercise platesSheet

## js/views/habits.js (154 l.)
Checklist du jour (rendue dans l'onglet Aujourd'hui) + feuille de réglage des habitudes.
exports: toggleHabits,habitsCells handleHabitClick,handleTaskSubmit

## js/views/learn.js (165 l.)
Vue « Apprendre » : bibliothèque d'apprentissage des mouvements (recherche, niveaux, maîtrise, fiche Étapes / Erreurs / Conseils).
exports: sessionsWith,dayExercise leave,render openTechnique

## js/views/onboarding.js (219 l.)
Onboarding : accueil, puis une question par écran, surtout par sélection (cartes, pastilles, stepper).
exports: needsOnboarding,openOnboarding

## js/views/palette.js (36 l.)
Section « Apparence » du Profil : mode (auto / clair / sombre) et matière (Papier / Brume).
exports: paletteSection,handlePaletteClick

## js/views/planning.js (247 l.)
Vue « Planifier mes repas » : calendrier des repas prévus (distinct du Journal = repas mangés) + liste de
exports: render

## js/views/profile.js (156 l.)
Onglet Profil : langue, données perso, objectif, clé API, sauvegarde, références.
exports: render

## js/views/program.js (116 l.)
Assistant de programme : brief (objectif, date, jours, durée, niveau, blessures) → programmes proposés
exports: openWizard,planCard plannedDays

## js/views/session.js (380 l.)
Séance en direct : chrono/volume/séries, types de série, colonne « Précédent », repos par exercice (±15 s),
exports: active,clearActive addToActive,persist startWorkout,renderSession

## js/views/today.js (207 l.)
Onglet Journal : en-tête (Planning, Profil), héros palette (kcal restantes, mangé / brûlé), tuiles macros, pastille cycle,
exports: render

## js/views/training.js (268 l.)
Onglet Entraînement : routines (dossiers), séance en direct, calendrier et streak, muscles, exercices, historique.
exports: render

## js/views/weight.js (187 l.)
Onglet Poids : pesée, courbe (pesées, tendance, projection, cible, étapes), poids de référence,
feuille de pesée (−/+ 0,1 kg, appui long) et écran « Étape atteinte ».
exports: render,openWeigh


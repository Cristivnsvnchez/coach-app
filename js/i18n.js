// Traduction FR/EN. La clé est le texte français ; `t()` renvoie l'anglais si la langue active est 'en'.
// Interpolation : t('Patiente {n} s', { n: 5 }).

const EN = {
  // Navigation
  "Aujourd'hui": 'Today', 'Poids': 'Weight', 'Sport': 'Training', 'Coach': 'Coach', 'Profil': 'Profile',
  'Entraînement': 'Training',
  // Aujourd'hui
  'Jour précédent': 'Previous day', 'Jour suivant': 'Next day',
  'Complète ton profil': 'Complete your profile',
  'Âge, taille, poids, activité et objectif pour calculer tes besoins.': 'Age, height, weight, activity and goal to calculate your needs.',
  'Compléter': 'Complete',
  'Objectifs chiffrés désactivés': 'Numeric targets disabled',
  'Ta situation (âge < 18 ans, grossesse/allaitement, trouble alimentaire ou pathologie) nécessite un suivi par un professionnel de santé. Le journal reste disponible.':
    'Your situation (under 18, pregnancy/breastfeeding, eating disorder or medical condition) requires follow-up by a health professional. The food log remains available.',
  'kcal restantes': 'kcal left', 'kcal en trop': 'kcal over',
  'Protéines': 'Protein', 'Glucides': 'Carbs', 'Lipides': 'Fat', 'Fibres': 'Fiber',
  'Objectif': 'Goal', 'mangé': 'eaten', 'dépense adaptative': 'adaptive expenditure', 'dépense estimée': 'estimated expenditure',
  'plancher de sécurité appliqué': 'safety floor applied',
  'Eau': 'Water', '(boissons + aliments)': '(drinks + food)',
  'Petit-déjeuner': 'Breakfast', 'Déjeuner': 'Lunch', 'Dîner': 'Dinner', 'Collations': 'Snacks',
  'Ajouter': 'Add', 'Supprimer': 'Delete', 'Copier les repas de la veille': "Copy yesterday's meals",
  'Rien à copier pour la veille': 'Nothing to copy from yesterday', '{n} aliments copiés': '{n} foods copied',
  // Ajout d'aliment
  'Ajouter — {meal}': 'Add — {meal}', 'Rechercher un aliment': 'Search for a food', 'OK': 'Go',
  'Code-barres': 'Barcode', 'Manuel': 'Manual',
  'Favoris': 'Favorites', 'Récents': 'Recent',
  'Cherche un aliment ou scanne un code-barres.': 'Search for a food or scan a barcode.',
  'Rien trouvé. Ajoute-le en manuel, il sera proposé la prochaine fois.': "Nothing found. Add it manually, it'll be suggested next time.",
  'Ajouté ✓': 'Added ✓', '{n} aliments ajoutés': '{n} foods added',
  'Quantité (g)': 'Quantity (g)', 'Favori': 'Favorite',
  'Recherche…': 'Searching…', 'Mes aliments': 'My foods',
  'Recherche en ligne possible dans {n} s (limite Open Food Facts).': 'Online search available in {n} s (Open Food Facts limit).',
  'Recherche Open Food Facts indisponible pour le moment.': 'Open Food Facts search is unavailable right now.',
  "Estimer « {q} » avec l'IA (Ciqual/USDA)": 'Estimate “{q}” with AI (Ciqual/USDA)',
  'Vise le code-barres': 'Point at the barcode', 'ou tape le code (EAN)': 'or type the code (EAN)',
  'Recherche du produit…': 'Looking up product…', 'Caméra indisponible : {e}': 'Camera unavailable: {e}',
  "Ajoute ta clé API Claude dans Profil pour utiliser l'IA.": 'Add your Claude API key in Profile to use AI.',
  'Prendre / choisir une photo': 'Take / choose a photo',
  "Ex : 150 g de poulet, riz basmati, une cuillère d'huile d'olive": 'E.g. 150 g chicken, basmati rice, a spoon of olive oil',
  'Estimer': 'Estimate', 'Ajoute une photo ou une description': 'Add a photo or a description',
  'Analyse en cours… (10–30 s)': 'Analyzing… (10–30 s)', 'Estimation IA — modifie si besoin': 'AI estimate — edit if needed',
  'grammes': 'grams', 'Tout ajouter': 'Add all', 'Nom': 'Name', 'Ex : Skyr nature': 'E.g. Plain skyr',
  'kcal /100 g': 'kcal /100 g', 'Portion (g)': 'Serving (g)', "Créer l'aliment": 'Create food',
  'Estimation IA': 'AI estimate', 'Perso': 'Custom',
  // Poids
  'Poids du jour (kg)': "Today's weight (kg)", 'Enregistrer': 'Save', 'Tendance': 'Trend', 'Vitesse': 'Rate',
  'kg/sem': 'kg/wk', '1 an': '1 yr', '{n} j': '{n} d',
  'Ajoute au moins 2 pesées pour voir la courbe.': 'Add at least 2 weigh-ins to see the chart.',
  "Points : pesées brutes · ligne : tendance lissée (moyenne exponentielle). Les variations d'un jour à l'autre sont surtout de l'eau : regarde la tendance.":
    'Dots: raw weigh-ins · line: smoothed trend (exponential average). Day-to-day swings are mostly water: watch the trend.',
  'Poids de référence pour {h} cm': 'Reference weight for {h} cm',
  'Fourchette santé (IMC 18,5–24,9, OMS)': 'Healthy range (BMI 18.5–24.9, WHO)',
  'Formules cliniques (Devine, Robinson, Hamwi) : {a} – {b} kg': 'Clinical formulas (Devine, Robinson, Hamwi): {a} – {b} kg',
  ' (peu fiables sous 152 cm)': ' (unreliable under 152 cm)',
  "L'IMC ignore la masse musculaire : si tu es musclé, vise plutôt un % de masse grasse.": 'BMI ignores muscle mass: if you are muscular, target a body-fat % instead.',
  'Mon poids cible (kg)': 'My target weight (kg)', 'Définir': 'Set',
  'Renseigne taille et sexe dans Profil': 'Enter height and sex in Profile',
  'Timeline': 'Timeline', 'Arrivée estimée': 'Estimated arrival', 'vitesse réelle': 'actual rate', 'rythme prévu': 'planned rate',
  "Pas d'estimation : la tendance va dans le mauvais sens ou le rythme est nul.": 'No estimate: the trend is going the wrong way or the rate is zero.',
  '✓ atteint': '✓ reached',
  'Projection indicative : la perte ralentit avec le temps (adaptation métabolique, Hall 2011). Recalculée à chaque pesée.':
    'Indicative projection: loss slows over time (metabolic adaptation, Hall 2011). Recalculated at every weigh-in.',
  'Historique': 'History', 'Aucune pesée.': 'No weigh-ins yet.', 'tendance': 'trend',
  'Poids invalide': 'Invalid weight', 'Pesée enregistrée': 'Weigh-in saved', 'Attention : sous la fourchette santé': 'Warning: below the healthy range',
  'Supprimer cette pesée ?': 'Delete this weigh-in?',
  // Entraînement
  'Nouveau programme IA': 'New AI program', 'prochaine': 'next', 'Démarrer': 'Start',
  'Volume de la semaine': 'Weekly volume', 'Séries effectuées / cible 10–20 par muscle (Schoenfeld 2017)': 'Sets done / target 10–20 per muscle (Schoenfeld 2017)',
  'Records (1RM estimé, Epley)': 'Records (estimated 1RM, Epley)', 'Termine une séance pour voir tes records.': 'Finish a workout to see your records.',
  'séries': 'sets', 'Aucune séance.': 'No workouts yet.',
  "OMS 2020 : 150–300 min d'activité modérée/sem + renforcement ≥ 2 j/sem.": 'WHO 2020: 150–300 min moderate activity/week + strength training ≥ 2 days/week.',
  'Annuler': 'Cancel', 'Terminer': 'Finish', 'Passer': 'Skip', 'Repos {t}': 'Rest {t}', 'Repos terminé 💪': 'Rest over 💪',
  'reps': 'reps', 'RIR': 'RIR', 'Série': 'Set', 'Série faite': 'Set done',
  'RIR = répétitions en réserve (vise 1–3). Le minuteur de repos démarre à chaque série validée.': 'RIR = reps in reserve (aim for 1–3). The rest timer starts each time you check a set.',
  'Abandonner la séance ?': 'Discard this workout?', 'Valide au moins une série': 'Check at least one set',
  'Séance terminée 🎉': 'Workout complete 🎉',
  '{n} séries en {m} min. Les charges de la prochaine séance sont calculées automatiquement.': '{n} sets in {m} min. Next session loads are calculated automatically.',
  'Première fois : choisis une charge laissant 2–3 reps en réserve': 'First time: pick a load leaving 2–3 reps in reserve',
  'Décharge −10 % après 2 séances ratées': 'Deload −10% after 2 missed sessions',
  'Toutes les séries à {n} reps → charge augmentée': 'All sets at {n} reps → load increased',
  'Même charge, +1 rep': 'Same load, +1 rep',
  'Poids du corps : passe à une variante plus difficile ou ajoute du lest': 'Bodyweight: move to a harder variation or add weight',
  'Poids du corps : +1 rep': 'Bodyweight: +1 rep',
  'Programme invalide': 'Invalid program',
  // Muscles
  'Pectoraux': 'Chest', 'Dos': 'Back', 'Épaules': 'Shoulders', 'Biceps': 'Biceps', 'Triceps': 'Triceps',
  'Quadriceps': 'Quads', 'Ischios': 'Hamstrings', 'Fessiers': 'Glutes', 'Mollets': 'Calves', 'Abdos': 'Abs',
  // Coach
  'Effacer': 'Clear', "Active l'IA": 'Turn on AI',
  'Colle ta clé API Claude dans Profil (console.anthropic.com → API Keys). Coût : quelques centimes par demande.':
    'Paste your Claude API key in Profile (console.anthropic.com → API Keys). Cost: a few cents per request.',
  'Ajouter ma clé': 'Add my key', 'Recette pour mes macros restantes': 'Recipe for my remaining macros',
  'Générer mon programme': 'Generate my program', 'Bilan de ma semaine': 'My weekly review',
  'Recherche dans la littérature…': 'Searching the literature…', 'source(s)': 'source(s)',
  '1 portion ({k} kcal)': '1 serving ({k} kcal)', 'Utiliser ce programme': 'Use this program',
  "Pose une question (nutrition, entraînement, récupération…) ou choisis une action ci-dessus. Les réponses s'appuient sur PubMed, ANSES, EFSA, OMS et sont sourcées.":
    'Ask a question (nutrition, training, recovery…) or pick an action above. Answers draw on PubMed, EFSA, WHO and national agencies, with sources.',
  'Ta question au coach…': 'Ask your coach…', 'Recherche scientifique': 'Scientific search', 'Envoyer': 'Send',
  'Effacer la conversation ?': 'Clear the conversation?', 'Ajoute ta clé API dans Profil': 'Add your API key in Profile',
  "Complète ton profil d'abord": 'Complete your profile first', 'Ajouté au journal ✓': 'Added to log ✓',
  'Programme activé ✓': 'Program activated ✓', 'Réponse du coach prête ✓': 'Coach reply ready ✓',
  // Profil
  'Sexe': 'Sex', 'Homme': 'Male', 'Femme': 'Female', 'Âge': 'Age', 'Taille (cm)': 'Height (cm)', 'Poids (kg)': 'Weight (kg)',
  '% masse grasse (optionnel, plus précis)': 'Body fat % (optional, more accurate)', 'Activité': 'Activity', 'Rythme': 'Rate',
  'Séances / sem': 'Sessions / week', 'Matériel': 'Equipment', 'Salle complète': 'Full gym', 'Haltères à la maison': 'Dumbbells at home', 'Poids du corps': 'Bodyweight',
  'Régime / préférences': 'Diet / preferences', 'Ex : végétarien, halal, pas de poisson': 'E.g. vegetarian, halal, no fish',
  'Allergies / intolérances': 'Allergies / intolerances',
  'Grossesse/allaitement, trouble du comportement alimentaire ou pathologie chronique': 'Pregnancy/breastfeeding, eating disorder or chronic condition',
  'Mes informations': 'About me', 'Mon objectif': 'My goal', 'Préférences': 'Preferences',
  'Tes besoins calculés': 'Your calculated needs', 'Dépense': 'Expenditure', 'adaptative ({n} j)': 'adaptive ({n} d)', 'formule': 'formula', 'kcal/j': 'kcal/day',
  "Formule de départ : Mifflin-St Jeor{k} × niveau d'activité FAO/OMS. Après 10 jours de saisie et des pesées sur ≥ 7 jours, la dépense s'ajuste à tes résultats réels (apport moyen − variation de la tendance × 7700 kcal/kg).":
    'Starting formula: Mifflin-St Jeor{k} × FAO/WHO activity level. After 10 logged days and weigh-ins over ≥ 7 days, expenditure adapts to your real results (average intake − trend change × 7700 kcal/kg).',
  'Intelligence artificielle': 'Artificial intelligence', 'Clé API Claude': 'Claude API key', 'Modèle': 'Model',
  "La clé reste sur ce téléphone et n'est envoyée qu'à api.anthropic.com. Crée-la sur console.anthropic.com → API Keys, et fixe une limite de dépense mensuelle.":
    'The key stays on this phone and is only sent to api.anthropic.com. Create it at console.anthropic.com → API Keys, and set a monthly spend limit.',
  'Sauvegarde': 'Backup', 'Tes données sont uniquement sur ce téléphone. Exporte-les régulièrement (Fichiers / iCloud Drive).': 'Your data lives only on this phone. Export it regularly (Files / iCloud Drive).',
  'Exporter': 'Export', 'Importer': 'Import', 'Tout effacer': 'Erase all data',
  'Références scientifiques': 'Scientific references', 'Cette app ne remplace pas un avis médical.': 'This app does not replace medical advice.',
  'Profil enregistré': 'Profile saved', 'Réglages IA enregistrés': 'AI settings saved',
  "Effacer TOUTES les données de l'app ? (irréversible)": 'Erase ALL app data? (cannot be undone)',
  'Fichier non reconnu': 'Unrecognized file', 'Remplacer les données actuelles par cette sauvegarde ?': 'Replace current data with this backup?',
  'Sauvegarde restaurée': 'Backup restored', 'Import impossible : {e}': 'Import failed: {e}',
  'Langue': 'Language', '{r} % du poids / semaine': '{r}% of body weight / week',
  'Stockage plein : exporte tes données depuis Profil.': 'Storage full: export your data from Profile.',
  // Science
  'Sédentaire (bureau, peu de marche)': 'Sedentary (desk job, little walking)', 'Légèrement actif (marche, 1–2 séances/sem)': 'Lightly active (walking, 1–2 sessions/wk)',
  'Actif (3–4 séances/sem)': 'Active (3–4 sessions/wk)', 'Très actif (5–6 séances/sem)': 'Very active (5–6 sessions/wk)',
  'Extrêmement actif (travail physique + sport)': 'Extremely active (physical job + sport)',
  'Perte de gras': 'Fat loss', 'Maintien / recomposition': 'Maintenance / recomp', 'Prise de muscle': 'Muscle gain',
  // Erreurs IA / aliments
  'Ajoute ta clé API Claude dans Profil.': 'Add your Claude API key in Profile.', 'Pas de connexion internet.': 'No internet connection.',
  'Clé API invalide. Vérifie-la dans Profil.': 'Invalid API key. Check it in Profile.', 'Trop de requêtes, réessaie dans une minute.': 'Too many requests, try again in a minute.',
  'Crédit API épuisé : recharge sur console.anthropic.com.': 'API credit exhausted: top up at console.anthropic.com.',
  'Demande refusée par le filtre de sécurité. Reformule ta question.': 'Request declined by the safety filter. Rephrase your question.',
  "Réponse trop longue, réessaie avec moins d'aliments.": 'Response too long, try again with fewer foods.',
  'La recherche a pris trop de temps. Réessaie ou décoche 🔬.': 'The search took too long. Try again or turn off scientific search.',
  "Réponse de l'IA illisible, réessaie.": 'Unreadable AI response, try again.',
  'Produit introuvable dans Open Food Facts': 'Product not found in Open Food Facts', 'Pas de valeurs nutritionnelles pour ce produit': 'No nutrition values for this product',
  'Lecteur code-barres non chargé (réseau ?)': 'Barcode reader failed to load (network?)',
  // Programme par défaut
  'Full body 3 jours (débutant/intermédiaire)': 'Full body 3 days (beginner/intermediate)', 'Jour A': 'Day A', 'Jour B': 'Day B', 'Jour C': 'Day C',
  'Squat': 'Squat', 'Développé couché': 'Bench press', 'Rowing barre': 'Barbell row', 'Élévations latérales': 'Lateral raises', 'Curl haltères': 'Dumbbell curl',
  'Soulevé de terre roumain': 'Romanian deadlift', 'Développé militaire': 'Overhead press', 'Tractions / tirage vertical': 'Pull-ups / lat pulldown',
  'Fentes bulgares': 'Bulgarian split squat', 'Extensions triceps': 'Triceps extensions', 'Presse à cuisses': 'Leg press',
  'Développé incliné haltères': 'Incline dumbbell press', 'Rowing haltère': 'Dumbbell row', 'Leg curl': 'Leg curl', 'Mollets debout': 'Standing calf raise', 'Gainage / crunch': 'Plank / crunch',
  'Programme IA': 'AI program',
  // Séances (mécaniques type Hevy)
  'Patiente {n} s': 'Wait {n} s', 'source(s)': 'source(s)',
  'Ajouter un exercice': 'Add exercise', 'Rechercher un exercice': 'Search exercises', 'Tous': 'All', 'Aucun exercice trouvé.': 'No exercise found.',
  'Créer un exercice personnalisé': 'Create custom exercise', 'Nouvel exercice': 'New exercise', 'Muscle principal': 'Primary muscle', 'Équipement': 'Equipment',
  'Type': 'Type', 'Haut du corps': 'Upper body', 'Le type ne pourra plus être changé ensuite (il détermine les colonnes et le calcul du volume).': 'The type cannot be changed later (it sets the columns and how volume is calculated).',
  'Créer': 'Create', 'Cet exercice existe déjà': 'This exercise already exists', 'Records': 'Records', '1RM estimé': 'Estimated 1RM', 'Charge max': 'Heaviest weight',
  'Meilleure série (kg × reps)': 'Best set (kg × reps)', 'Meilleur volume en une séance': 'Best session volume', 'Reps max': 'Most reps', 'Meilleure série': 'Best set',
  "Hors séries d'échauffement. 1RM estimé : formule d'Epley.": 'Warm-up sets excluded. Estimated 1RM: Epley formula.',
  'Calculateur de disques': 'Plate calculator', 'Charge totale (kg)': 'Total weight (kg)', 'Barre (kg)': 'Bar (kg)', 'Par côté': 'Per side', 'Barre seule': 'Empty bar',
  'Impossible exactement : il manque {r} kg.': 'Not exact: {r} kg short.', 'Durée': 'Duration', 'Volume': 'Volume', 'Séries': 'Sets',
  "Touche le numéro d'une série pour changer son type (É = échauffement, D = drop set, F = échec). Touche « Précédent » pour recopier.": 'Tap a set number to change its type (É = warm-up, D = drop set, F = failure). Tap “Previous” to copy it.',
  'Options': 'Options', 'Ajouter une note…': 'Add a note…', 'Note': 'Note', 'Précédent': 'Previous', 'Aide': 'Assist', 'Type de série': 'Set type',
  'Temps de repos pour cet exercice (secondes)': 'Rest time for this exercise (seconds)', 'Nouveau record ! 🏆': 'New record! 🏆',
  "Ajouter les séries d'échauffement": 'Add warm-up sets', 'Retirer du superset': 'Remove from superset', "Superset avec l'exercice suivant": 'Superset with next exercise',
  'Monter': 'Move up', 'Descendre': 'Move down', "Remplacer l'exercice": 'Replace exercise', 'Supprimer la dernière série': 'Delete last set', "Retirer l'exercice": 'Remove exercise',
  "Renseigne d'abord la charge de travail": 'Enter your working weight first', 'Ajoute un exercice après celui-ci': 'Add an exercise after this one',
  'Séance n° {n}': 'Workout #{n}', 'Mettre à jour la routine avec cette séance': 'Update the routine with this workout', 'Enregistrer la séance': 'Save workout',
  'sem.': 'wk', 'Régularité': 'Streak', 'Repos': 'Rest', 'j': 'd', 'Ce mois-ci': 'This month', 'séances': 'workouts', 'Démarrer une séance vide': 'Start empty workout', 'Nouvelle routine': 'New routine',
  'Muscles — 7 derniers jours': 'Muscles — last 7 days',
  'Séries validées hors échauffement : muscle principal = 1, secondaires = 0,5. Cible 10–20 séries/muscle/semaine (Schoenfeld 2017).': 'Completed sets excluding warm-ups: primary muscle = 1, secondary = 0.5. Target 10–20 sets/muscle/week (Schoenfeld 2017).',
  'Exercices': 'Exercises', 'Outils': 'Tools', 'Mois précédent': 'Previous month', 'Mois suivant': 'Next month', 'Supprimer la séance': 'Delete workout',
  'Supprimer cette séance ? (irréversible)': 'Delete this workout? (cannot be undone)', 'Routine': 'Routine', 'Dossier': 'Folder', 'Mes routines': 'My routines',
  'Reps min – max': 'Rep range', 'Repos (s)': 'Rest (s)', 'Retirer': 'Remove', 'Supprimer la routine': 'Delete routine', 'Supprimer cette routine ?': 'Delete this routine?',
  'Charge + reps': 'Weight + reps', 'Poids du corps lesté': 'Weighted bodyweight', 'Poids du corps assisté': 'Assisted bodyweight', '3 mois': '3 months', 'Tout': 'All',
  'Séance libre': 'Free workout', 'barre': 'barbell', 'haltères': 'dumbbells', 'poulie': 'cable', 'aucun': 'none',
  'Squat avant': 'Front squat', 'Fentes marchées': 'Walking lunges', 'Soulevé de terre': 'Deadlift', 'Mollets assis': 'Seated calf raise',
  'Développé couché haltères': 'Dumbbell bench press', 'Écarté poulie': 'Cable fly', 'Pompes': 'Push-ups', 'Dips assistés': 'Assisted dips', 'Tractions': 'Pull-ups',
  'Tractions assistées': 'Assisted pull-ups', 'Tirage vertical': 'Lat pulldown', 'Tirage horizontal': 'Seated cable row', 'Développé épaules haltères': 'Dumbbell shoulder press',
  'Curl barre': 'Barbell curl', 'Curl marteau': 'Hammer curl', 'Barre au front': 'Skull crushers', 'Planche': 'Plank', 'Relevés de jambes': 'Leg raises', 'Crunch poulie': 'Cable crunch',
  'Squat pistol': 'Pistol squat', 'Squat overhead': 'Overhead squat', 'Burpee': 'Burpee', 'Arraché': 'Snatch', 'Épaulé-jeté': 'Clean and jerk', 'Tirage sumo': 'Sumo high pull', 'Élévations frontales': 'Front raises',
  'Lampe': 'Flashlight', 'Place le code-barres dans le cadre, à 10–20 cm': 'Place the barcode inside the frame, 10–20 cm away',
  'Caméra non disponible dans ce navigateur': 'Camera not available in this browser',
  'Budget mensuel (€)': 'Monthly budget (€)', 'Dépensé ce mois-ci': 'Spent this month', 'requêtes': 'requests', 'Tester la connexion': 'Test connection',
  'Test en cours…': 'Testing…', 'Connexion OK ✓': 'Connection OK ✓',
  "L'app bloque toute requête qui pourrait dépasser ton budget (estimation : tarifs publics, 1 $ ≈ 0,92 €). Pour une garantie absolue, fixe aussi la même limite dans console.anthropic.com → Billing → Limits.": 'The app blocks any request that could exceed your budget (estimate: public prices, $1 ≈ €0.92). For a hard guarantee, also set the same limit at console.anthropic.com → Billing → Limits.',
  'Budget IA du mois atteint ({x} € sur {b} €). Augmente-le dans Profil ou attends le mois prochain.': 'Monthly AI budget reached (€{x} of €{b}). Raise it in Profile or wait for next month.',
  'Repas': 'Meals', 'série': 'set', 'Afficher la colonne RIR': 'Show RIR column', 'Masquer la colonne RIR': 'Hide RIR column',
  'Mes objectifs (personnalisés)': 'My targets (custom)', 'Modifier mes objectifs': 'Edit my targets', 'Mes objectifs': 'My targets', 'Calories': 'Calories',
  'Laisse un champ vide pour garder la valeur calculée (en gris). Glucides vides = le reste de tes calories. Par sécurité, les calories ne descendent jamais sous 1200 (femme) / 1500 (homme).': 'Leave a field empty to keep the calculated value (grey). Empty carbs = the rest of your calories. For safety, calories never go below 1,200 (women) / 1,500 (men).',
  'Attention : tes macros ne correspondent pas aux calories saisies.': "Heads-up: your macros don't add up to the calories you entered.", 'Objectifs enregistrés': 'Targets saved', 'Revenir au calcul automatique': 'Back to automatic calculation',
  // Programme daté
  'Nouveau programme': 'New program', 'Ton objectif': 'Your goal', 'Quand ?': 'When?', 'Début': 'Start', "Date de l'épreuve": 'Event date', 'Date cible': 'Target date',
  "Le programme est découpé en phases jusqu'à cette date, avec une semaine de décharge régulière.": 'The program is split into phases up to this date, with a regular deload week.',
  "Tes jours d'entraînement": 'Your training days', 'Durée par séance': 'Session length', 'Niveau': 'Level', 'Blessures / douleurs': 'Injuries / pain', 'aucune': 'none',
  'Voir les programmes proposés': 'See suggested programs', 'Choisis au moins un jour': 'Pick at least one day', 'La date cible doit être après le début': 'The target date must be after the start',
  'semaines': 'weeks', 'Programme sur mesure avec le coach IA': 'Custom program with the AI coach', 'Conseillé': 'Recommended', 'Choisir ce programme': 'Choose this program',
  '{n} séances différentes': '{n} different sessions', 'Modifier mes réponses': 'Edit my answers', 'Le coach lit ton brief…': 'Your coach is reading your brief…',
  'Le coach a quelques questions': 'Your coach has a few questions', 'Ta réponse': 'Your answer', 'Le coach construit ton programme… (20–60 s)': 'Your coach is building your program… (20–60 s)',
  'Programme créé ✓': 'Program created ✓', 'Mon programme': 'My program',
  "Crée un programme daté : le coach le découpe en phases jusqu'à ta date cible et le cale sur tes jours.": 'Create a dated program: your coach splits it into phases up to your target date and fits it to your days.',
  'Semaine {w} sur {n}': 'Week {w} of {n}', 'Commence {d}': 'Starts {d}', '{n} semaines': '{n} weeks', 'Semaine de décharge : volume réduit (~60 %).': 'Deload week: reduced volume (~60%).', 'décharge': 'deload', 'Programme terminé 🎉': 'Program complete 🎉',
  "Ajouter au calendrier de l'iPhone": 'Add to iPhone Calendar', "Calendrier de l'iPhone": 'iPhone Calendar', 'Heure de séance': 'Session time', 'Durée (min)': 'Duration (min)', 'Rappel avant (min)': 'Reminder before (min)',
  "Crée un fichier calendrier avec toutes tes séances prévues. Sur iPhone : touche « Ajouter tout » dans l'aperçu, ou choisis Calendrier dans la feuille de partage.": 'Creates a calendar file with all your planned sessions. On iPhone: tap “Add All” in the preview, or pick Calendar in the share sheet.',
  'Exporter {n} séances': 'Export {n} sessions', 'Programme': 'Program', 'Fait': 'Done', 'Prévu': 'Planned', 'Manqué': 'Missed',
  'débutant': 'beginner', 'intermédiaire': 'intermediate', 'avancé': 'advanced', 'débutant → intermédiaire': 'beginner → intermediate', 'intermédiaire → avancé': 'intermediate → advanced', 'tous niveaux': 'all levels',
  'Prendre du muscle': 'Build muscle', 'Devenir plus fort': 'Get stronger', 'Perdre du gras en gardant le muscle': 'Lose fat, keep muscle', 'Remise en forme / santé': 'Fitness / health', 'Préparer une date précise': 'Prepare for a specific date',
  'Haut / Bas': 'Upper / Lower', 'Force — 3 jours': 'Strength — 3 days', 'Maison / poids du corps': 'Home / bodyweight',
  'Full body A': 'Full body A', 'Haut A': 'Upper A', 'Bas A': 'Lower A', 'Haut B': 'Upper B', 'Bas B': 'Lower B', 'Force A': 'Strength A', 'Force B': 'Strength B', 'Maison A': 'Home A', 'Maison B': 'Home B',
  'Chaque muscle 3×/semaine avec peu de séances : idéal pour progresser vite et rester régulier.': 'Each muscle 3×/week with few sessions: ideal to progress fast and stay consistent.',
  'Chaque muscle 2×/semaine avec plus de volume par séance : le meilleur compromis à 4 jours.': 'Each muscle 2×/week with more volume per session: the best 4-day balance.',
  'Volume élevé par muscle, 2×/semaine à 6 jours (ou 1× à 3 jours). Demande du temps et une bonne récupération.': 'High volume per muscle, 2×/week on 6 days (or 1× on 3 days). Needs time and good recovery.',
  'Mouvements de base lourds en alternance A/B, progression de charge chaque séance tant que possible.': 'Heavy compound lifts alternating A/B, adding load every session for as long as possible.',
  'Sans salle : variantes au poids du corps et haltères, à rendre plus difficiles quand les reps dépassent la plage.': 'No gym: bodyweight and dumbbell variations, made harder once reps exceed the range.',
  'Accumulation': 'Accumulation', 'Intensification': 'Intensification', 'Affûtage': 'Taper', 'Progression': 'Progression',
  'Volume élevé, charges modérées, technique.': 'High volume, moderate loads, technique.', 'Charges plus lourdes, un peu moins de séries.': 'Heavier loads, slightly fewer sets.',
  'Volume réduit de moitié, intensité maintenue : arriver frais.': 'Volume halved, intensity kept: arrive fresh.', 'Double progression : reps puis charge.': 'Double progression: reps, then load.',
  'Enregistre ta première pesée pour voir la courbe.': 'Log your first weigh-in to see the chart.', 'Cible': 'Target',
  'Pèse-toi 3 à 7 fois par semaine, le matin à jeun : la tendance devient fiable après une à deux semaines.': 'Weigh yourself 3–7 times a week, in the morning before eating: the trend becomes reliable after one to two weeks.',
  "Points : pesées · ligne pleine : tendance lissée · pointillés : projection jusqu'à ta cible · ronds orange : tes étapes estimées.": 'Dots: weigh-ins · solid line: smoothed trend · dashed: projection to your target · orange rings: your estimated milestones.',
  "Définis ton poids cible (plus bas) pour voir la date d'arrivée estimée et tes étapes.": 'Set your target weight (below) to see the estimated arrival date and your milestones.',
  "{n} j d'avance": '{n} d ahead', '{n} j de retard': '{n} d behind', 'Atteint': 'Reached', 'Estimé : {d}': 'Estimated: {d}', 'Étape automatique': 'Automatic milestone', 'Sans date': 'No date',
  'Ajouter une étape estimée': 'Add an estimated milestone',
  "Une étape est cochée automatiquement quand ta tendance l'atteint ; tu peux aussi la cocher à la main. Projection indicative : la perte ralentit avec le temps (Hall 2011).": 'A milestone is checked automatically when your trend reaches it; you can also check it by hand. Indicative projection: loss slows over time (Hall 2011).',
  'Étape atteinte ! 🎉': 'Milestone reached! 🎉', 'Nouvelle étape': 'New milestone', 'Étape': 'Milestone', 'Date estimée': 'Estimated date', 'Ex : mariage, vacances…': 'E.g. wedding, holidays…',
  'Atteinte (cocher à la main)': 'Reached (check by hand)',
  "La date estimée sert à voir si tu es en avance ou en retard. L'étape se coche toute seule quand ta tendance l'atteint.": "The estimated date shows whether you're ahead or behind. The milestone checks itself when your trend reaches it.",
  'Apparence': 'Appearance', 'Classique': 'Classic',
  // Checklist
  'Checklist du jour': "Today's checklist", '{n} jours de suite': '{n}-day streak', 'Série : ≥ 80 % des habitudes cochées': 'Streak: ≥ 80% of habits checked',
  'Validé automatiquement': 'Checked automatically', 'Se coche automatiquement': 'Checks itself automatically', 'Modifier mes habitudes': 'Edit my habits',
  'Mes habitudes': 'My habits', 'Automatiques': 'Automatic', 'Personnelles': 'Personal', "Cochées d'après ton journal, tes pesées et tes séances.": 'Checked from your food log, weigh-ins and workouts.',
  'Ex : Créatine 3 g, 10 min de marche…': 'E.g. Creatine 3 g, 10-min walk…',
  'Protéines atteintes': 'Protein target hit', 'Kcal dans la cible (±10 %)': 'Calories on target (±10%)', 'Fibres ≥ objectif': 'Fiber ≥ target',
  "Objectif d'eau": 'Water goal', 'Pesée du jour': "Today's weigh-in", 'Séance ou repos actif': 'Workout or active rest',
  'Sommeil ≥ 7 h': 'Sleep ≥ 7 h', '8 000 pas': '8,000 steps', '5 portions de fruits et légumes': '5 servings of fruit & veg',
  'Claude Opus 5.5 — le plus fiable (~4 $/20 $ par M tokens)': 'Claude Opus 5.5 — most reliable (~$4/$20 per M tokens)',
  'Claude Sonnet 5.5 — bon compromis (~2 $/10 $)': 'Claude Sonnet 5.5 — good balance (~$2/$10)',
  'Claude Haiku 5.5 — le moins cher (~0,10 $/0,50 $)': 'Claude Haiku 5.5 — cheapest (~$0.10/$0.50)',
  'Open Food Facts': 'Open Food Facts', 'Recette IA': 'AI recipe',
};

const KEY = 'coach.lang';
// Dictionnaires : EN ci-dessus (base) ; NL et ajouts par module via register({ en: {...}, nl: {...} }).
const DICT = { en: EN, nl: {} };
export function register(d) { for (const l of ['en', 'nl']) if (d?.[l]) Object.assign(DICT[l], d[l]); }
export const LANGS = { fr: 'Français', en: 'English', nl: 'Nederlands' };

let lang = 'fr';
try {
  const nav = (typeof navigator !== 'undefined' && navigator.language || 'fr').toLowerCase();
  lang = localStorage.getItem(KEY) || (nav.startsWith('fr') ? 'fr' : nav.startsWith('nl') ? 'nl' : 'en');
} catch {}
if (typeof document !== "undefined") document.documentElement.lang = lang;

export const getLang = () => lang;
export const locale = () => ({ en: 'en-US', nl: 'nl-NL' })[lang] || 'fr-FR';

export function setLang(l) {
  lang = LANGS[l] ? l : 'fr';
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  try { localStorage.setItem(KEY, lang); } catch {}
}

// Texte source en français ; repli NL → EN → FR si une traduction manque.
export function t(fr, vars) {
  let s = lang === 'fr' ? fr : (DICT[lang][fr] ?? (lang === 'nl' ? EN[fr] : undefined) ?? fr);
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return s;
}

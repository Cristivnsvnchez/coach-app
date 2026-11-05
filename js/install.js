// Installation et sécurité des données : aide « Sur l'écran d'accueil » (Safari iOS n'a pas de bouton d'installation),
// invite native sur Android / ordinateur, sauvegarde sans secrets et rappel mensuel de sauvegarde.
import { state, save, today } from './store.js';
import { t, register } from './i18n.js';
import { icon } from './icons.js';
import { sheet, banner } from './ui.js';

register({
  en: {
    "Installe TrackMe sur ton iPhone": 'Install TrackMe on your iPhone', 'Touche {i} Partager en bas de Safari.': 'Tap {i} Share at the bottom of Safari.',
    "Choisis « Sur l'écran d'accueil », puis Ajouter.": 'Choose "Add to Home Screen", then Add.', "Ouvre TrackMe depuis son icône.": 'Open TrackMe from its icon.',
    "Installée, l'app s'ouvre en plein écran, marche hors ligne et iOS conserve tes données.": 'Installed, the app opens full screen, works offline and iOS keeps your data.',
    'Plus tard': 'Later', 'Installer TrackMe': 'Install TrackMe', 'Installer': 'Install',
    'Pense à sauvegarder tes données.': 'Remember to back up your data.', 'Sauvegarder': 'Back up', 'Sauvegarde enregistrée': 'Backup saved',
  },
  nl: {
    "Installe TrackMe sur ton iPhone": 'Installeer TrackMe op je iPhone', 'Touche {i} Partager en bas de Safari.': 'Tik op {i} Deel onderaan in Safari.',
    "Choisis « Sur l'écran d'accueil », puis Ajouter.": 'Kies „Zet op beginscherm” en daarna Voeg toe.', "Ouvre TrackMe depuis son icône.": 'Open TrackMe via het icoon.',
    "Installée, l'app s'ouvre en plein écran, marche hors ligne et iOS conserve tes données.": 'Geïnstalleerd opent de app schermvullend, werkt hij offline en bewaart iOS je gegevens.',
    'Plus tard': 'Later', 'Installer TrackMe': 'TrackMe installeren', 'Installer': 'Installeren',
    'Pense à sauvegarder tes données.': 'Denk eraan je gegevens te back-uppen.', 'Sauvegarder': 'Back-up maken', 'Sauvegarde enregistrée': 'Back-up opgeslagen',
  },
});

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const daysSince = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 864e5 : Infinity);
const mark = (k) => { (state.settings.nudges ||= {})[k] = today(); save(); };
const seen = (k, days) => daysSince(state.settings.nudges?.[k]) < days;

// Sauvegarde JSON sans secrets (clé IA, jetons Strava). iPhone : feuille de partage → Fichiers / iCloud Drive.
export async function exportBackup() {
  const { clientSecret, token, refresh, ...strava } = state.strava || {};
  const data = { ...state, settings: { ...state.settings, apiKey: '' }, strava: state.strava ? strava : null };
  const name = `trackme-backup-${today()}.json`;
  const file = new File([JSON.stringify(data, null, 1)], name, { type: 'application/json' });
  const done = () => { state.lastBackup = today(); save(); banner(t('Sauvegarde enregistrée'), { ms: 1800 }); };
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); done(); } catch {} // annulé : pas de rappel « fait »
    return;
  }
  const url = URL.createObjectURL(file);
  const l = document.createElement('a');
  l.href = url; l.download = name; l.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  done();
}

// Aide à l'installation sur iPhone (Safari, pas encore installée) : au plus une fois par semaine.
function iosInstallHelp() {
  const s = sheet(`<div class="sheet-head"><h3 class="title2">${t('Installe TrackMe sur ton iPhone')}</h3></div>
    <ol class="inst-steps">
      <li><b>1</b><span>${t('Touche {i} Partager en bas de Safari.', { i: `<i class="inst-ic">${icon('share')}</i>` })}</span></li>
      <li><b>2</b><span>${t("Choisis « Sur l'écran d'accueil », puis Ajouter.")}</span></li>
      <li><b>3</b><span>${t('Ouvre TrackMe depuis son icône.')}</span></li></ol>
    <p class="footnote inst-why">${t("Installée, l'app s'ouvre en plein écran, marche hors ligne et iOS conserve tes données.")}</p>
    <button class="btn large" data-a="later">${t('Plus tard')}</button>`, () => mark('install'));
  s.querySelector('[data-a=later]').onclick = () => s.close();
}

// Android / ordinateur : invite d'installation native, proposée dans un bandeau.
let deferred = null;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferred = e;
  if (seen('install', 7)) return;
  banner(t('Installer TrackMe'), { action: t('Installer'), onAction: async () => { mark('install'); deferred.prompt(); deferred = null; } });
});

// Au démarrage (après l'onboarding) : aide d'installation si besoin, sinon rappel de sauvegarde tous les 30 jours.
export function startupNudges() {
  if (isIOS() && !isStandalone() && !seen('install', 7)) return setTimeout(iosInstallHelp, 1200);
  const hasData = Object.keys(state.logs).length >= 7 || state.weights.length >= 5 || state.workouts.length >= 3;
  if (hasData && daysSince(state.lastBackup) > 30 && !seen('backup', 7)) {
    setTimeout(() => banner(t('Pense à sauvegarder tes données.'), { action: t('Sauvegarder'), onAction: () => { mark('backup'); exportBackup(); } }), 1500);
  }
}

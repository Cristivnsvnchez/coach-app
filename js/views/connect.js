// Vue « connect » : connexion à Strava (OAuth personnel, flux « coller le code ») et réglages de l'intégration.
import { state, save } from '../store.js';
import { nav, esc, toast, fmtDate } from '../ui.js';
import { icon } from '../icons.js';
import { t, register } from '../i18n.js';
import * as S from '../strava.js';

const TXT = [
  ['Connexions', 'Connections', 'Koppelingen'],
  ['Statut', 'Status', 'Status'],
  ['Connecté', 'Connected', 'Gekoppeld'],
  ['Non connecté', 'Not connected', 'Niet gekoppeld'],
  ['Dernière synchro : ', 'Last sync: ', 'Laatste synchronisatie: '],
  ['jamais', 'never', 'nooit'],
  ['Strava personnel : tes identifiants restent sur ce téléphone, usage strictement personnel.', 'Personal Strava: your credentials stay on this phone, strictly personal use.', 'Persoonlijke Strava: je gegevens blijven op deze telefoon, strikt persoonlijk gebruik.'],
  ['Crée ton app API', 'Create your API app', 'Maak je API-app'],
  ['Sur strava.com/settings/api, crée une app. Mets « cristivnsvnchez.github.io » dans Authorization Callback Domain, puis copie le Client ID et le Client Secret ci-dessous.', 'On strava.com/settings/api, create an app. Set “cristivnsvnchez.github.io” as Authorization Callback Domain, then copy the Client ID and Client Secret below.', 'Maak op strava.com/settings/api een app. Zet “cristivnsvnchez.github.io” als Authorization Callback Domain en kopieer de Client ID en het Client Secret hieronder.'],
  ['Autorise TrackMe', 'Authorize TrackMe', 'Autoriseer TrackMe'],
  ['Appuie sur Autoriser : Strava s’ouvre dans Safari. Accepte, puis copie le code affiché.', 'Tap Authorize: Strava opens in Safari. Accept, then copy the code shown.', 'Tik op Autoriseren: Strava opent in Safari. Accepteer en kopieer de getoonde code.'],
  ['Colle le code', 'Paste the code', 'Plak de code'],
  ['Reviens ici, colle le code et valide.', 'Come back here, paste the code and confirm.', 'Kom hier terug, plak de code en bevestig.'],
  ['Client ID', 'Client ID', 'Client ID'],
  ['Client Secret', 'Client Secret', 'Client Secret'],
  ['Autoriser sur Strava', 'Authorize on Strava', 'Autoriseren op Strava'],
  ['Code reçu de Strava', 'Code from Strava', 'Code van Strava'],
  ['Valider', 'Confirm', 'Bevestigen'],
  ['Strava connecté.', 'Strava connected.', 'Strava gekoppeld.'],
  ['Déconnecter Strava', 'Disconnect Strava', 'Strava ontkoppelen'],
  ['Déconnecter Strava ? Les activités en cache seront effacées.', 'Disconnect Strava? Cached activities will be erased.', 'Strava ontkoppelen? De gecachte activiteiten worden gewist.'],
  ['Réglages', 'Settings', 'Instellingen'],
  ['Ajouter 50 % des kcal au budget', 'Add 50% of kcal to the budget', '50% van de kcal aan het budget toevoegen'],
  ['Les calories brûlées en activité agrandissent ton budget du jour de moitié.', 'Calories burned in activities raise your daily budget by half.', 'Verbrande calorieën in activiteiten verhogen je dagbudget met de helft.'],
  ['Alléger la séance après une grosse sortie', 'Lighten the workout after a big outing', 'Training verlichten na een zware activiteit'],
  ['Un conseil de séance plus douce apparaît le lendemain d’une grosse sortie.', 'A lighter-session tip shows the day after a big outing.', 'De dag na een zware activiteit verschijnt een tip voor een lichtere training.'],
  ['Synchroniser à l’ouverture', 'Sync on open', 'Synchroniseren bij openen'],
  ['Montres Garmin, Coros, Suunto : active leur synchronisation vers Strava pour que tes sorties arrivent ici.', 'Garmin, Coros, Suunto watches: turn on their sync to Strava so your workouts arrive here.', 'Garmin-, Coros-, Suunto-horloges: schakel hun synchronisatie naar Strava in zodat je activiteiten hier aankomen.'],
  ['Apple Santé', 'Apple Health', 'Apple Gezondheid'],
  ['Plus tard', 'Later', 'Later'],
  ['Strava', 'Strava', 'Strava'],
  ['Connecté en tant que ', 'Connected as ', 'Gekoppeld als '],
  ['Synchroniser', 'Sync', 'Synchroniseren'],
  ['Synchro…', 'Syncing…', 'Synchroniseren…'],
];
register({ en: Object.fromEntries(TXT.map(([f, e]) => [f, e])), nl: Object.fromEntries(TXT.map(([f, , n]) => [f, n])) });

const sw = (name, on, label, sub) => `<div class="cell toggle-row"><span class="grow"><span class="t wrap">${t(label)}</span><span class="s">${t(sub)}</span></span>
  <label class="switch"><input type="checkbox" data-pref="${name}" ${on ? 'checked' : ''} aria-label="${t(label)}"><span></span></label></div>`;
const step = (n, title, body) => `<div class="cn-step"><span class="cn-n">${n}</span><div><strong>${t(title)}</strong><p class="footnote">${t(body)}</p></div></div>`;

export function render(root, go) {
  const st = state.strava, on = S.isConnected(), p = S.prefs();
  root.innerHTML = `${nav(t('Connexions'), { left: `<button class="btn plain" data-back>${icon('chevronLeft')}${t('Activités')}</button>` })}
    <section class="cn-card">
      <div class="cn-head"><span class="cn-logo" aria-hidden="true">${icon('bolt')}</span>
        <div class="grow"><h2>${t('Strava')}</h2>
        <p class="footnote">${on ? esc(t('Connecté en tant que ') + (st.athlete?.name || '')) + ' · ' + t('Dernière synchro : ') + (st.lastSync ? fmtDate(new Date(st.lastSync), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : t('jamais')) : t('Non connecté')}</p></div>
        <span class="cn-pill ${on ? 'on' : ''}">${on ? t('Connecté') : t('Non connecté')}</span></div>
      ${on ? `<div class="cn-actions"><button class="btn filled large" data-sync>${t('Synchroniser')}</button>
          <button class="btn destructive" data-off>${t('Déconnecter Strava')}</button></div>` : `
      <p class="footnote">${t('Strava personnel : tes identifiants restent sur ce téléphone, usage strictement personnel.')}</p>
      <div class="cn-steps">
        ${step(1, 'Crée ton app API', 'Sur strava.com/settings/api, crée une app. Mets « cristivnsvnchez.github.io » dans Authorization Callback Domain, puis copie le Client ID et le Client Secret ci-dessous.')}
        <div class="cn-fields">
          <input class="input" data-cid inputmode="numeric" autocomplete="off" placeholder="${t('Client ID')}" value="${esc(st?.clientId || '')}" aria-label="${t('Client ID')}">
          <input class="input" data-sec type="password" autocomplete="off" autocapitalize="off" placeholder="${t('Client Secret')}" value="${esc(st?.clientSecret || '')}" aria-label="${t('Client Secret')}">
        </div>
        ${step(2, 'Autorise TrackMe', 'Appuie sur Autoriser : Strava s’ouvre dans Safari. Accepte, puis copie le code affiché.')}
        <button class="btn filled large" data-auth>${t('Autoriser sur Strava')}</button>
        ${step(3, 'Colle le code', 'Reviens ici, colle le code et valide.')}
        <div class="row"><input class="input" data-code autocomplete="off" autocapitalize="off" placeholder="${t('Code reçu de Strava')}" aria-label="${t('Code reçu de Strava')}">
          <button class="btn" data-ok>${t('Valider')}</button></div>
      </div>`}
      <p class="cn-err footnote" role="alert" hidden></p>
    </section>
    <section class="group"><h2 class="group-title">${t('Réglages')}</h2><div class="cells">
      ${sw('kcal', p.kcal, 'Ajouter 50 % des kcal au budget', 'Les calories brûlées en activité agrandissent ton budget du jour de moitié.')}
      ${sw('adapt', p.adapt, 'Alléger la séance après une grosse sortie', 'Un conseil de séance plus douce apparaît le lendemain d’une grosse sortie.')}
      ${sw('auto', p.auto, 'Synchroniser à l’ouverture', '')}</div>
      <p class="group-foot">${t('Montres Garmin, Coros, Suunto : active leur synchronisation vers Strava pour que tes sorties arrivent ici.')}</p></section>
    <section class="group"><div class="cells"><div class="cell"><span class="grow">${t('Apple Santé')}</span><span class="val">${t('Plus tard')}</span></div></div></section>`;

  const $ = (s) => root.querySelector(s);
  const err = (m) => { const e = $('.cn-err'); e.textContent = m || ''; e.hidden = !m; };
  const readCreds = () => { try { S.saveCredentials($('[data-cid]').value, $('[data-sec]').value); return true; } catch (e) { err(e.message); return false; } };

  root.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-back')) return go('activities');
    if (b.hasAttribute('data-auth')) {
      if (!readCreds()) return;
      err(''); window.open(S.authorizeUrl(state.strava.clientId), '_blank', 'noopener');
    } else if (b.hasAttribute('data-ok')) {
      if (!readCreds()) return;
      b.disabled = true; err('');
      try { await S.exchangeCode($('[data-code]').value); toast(t('Strava connecté.')); S.sync().catch(() => {}); go('activities'); }
      catch (x) { err(x.message); b.disabled = false; }
    } else if (b.hasAttribute('data-sync')) {
      b.disabled = true; b.textContent = t('Synchro…'); err('');
      let msg = '';
      try { await S.sync(); } catch (x) { msg = x.message; }
      render(root, go);
      if (msg) { const el = root.querySelector('.cn-err'); el.textContent = msg; el.hidden = false; }
    } else if (b.hasAttribute('data-off')) {
      if (confirm(t('Déconnecter Strava ? Les activités en cache seront effacées.'))) { S.disconnect(); render(root, go); }
    }
  };
  root.onchange = (e) => {
    const k = e.target.dataset?.pref; if (!k) return;
    state.strava = state.strava || { activities: [], lastSync: 0 };
    state.strava.prefs = { ...S.prefs(), [k]: e.target.checked }; save();
  };
}

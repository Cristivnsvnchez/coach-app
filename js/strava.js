// Strava : OAuth personnel (client id/secret saisis par l'utilisateur), synchro des activités (API v3, CORS OK)
// et calculs purs (normalisation, kcal, regroupements, charge d'entraînement), testés sous Node.
// Contrat utilisé par les autres modules : isConnected(), activitiesOn(dateISO), kcalBurnedOn(dateISO).
import { state, save, latestWeight } from './store.js';
import { parseDate, isoDate } from './science.js';
import { weekStart } from './workout.js';
import { t, register } from './i18n.js';

export const REDIRECT_URI = 'https://cristivnsvnchez.github.io/coach-app/strava-callback.html';
const API = 'https://www.strava.com/api/v3';
const TOKEN_URL = 'https://www.strava.com/oauth/token';
export const DEFAULT_PREFS = { kcal: true, adapt: true, auto: true };

register({
  en: {
    'Reconnecte Strava (session expirée ou refusée).': 'Reconnect Strava (session expired or refused).',
    'Strava limite les requêtes : réessaie dans 15 minutes.': 'Strava is rate-limiting requests: try again in 15 minutes.',
    'Strava est injoignable. Vérifie ta connexion.': 'Strava is unreachable. Check your connection.',
    'Erreur Strava : ': 'Strava error: ',
    'Colle ton Client ID et ton Client Secret.': 'Paste your Client ID and Client Secret.',
    'Code invalide ou expiré : refais l’autorisation.': 'Invalid or expired code: authorize again.',
  },
  nl: {
    'Reconnecte Strava (session expirée ou refusée).': 'Verbind Strava opnieuw (sessie verlopen of geweigerd).',
    'Strava limite les requêtes : réessaie dans 15 minutes.': 'Strava beperkt het aantal verzoeken: probeer het over 15 minuten opnieuw.',
    'Strava est injoignable. Vérifie ta connexion.': 'Strava is onbereikbaar. Controleer je verbinding.',
    'Erreur Strava : ': 'Strava-fout: ',
    'Colle ton Client ID et ton Client Secret.': 'Plak je Client ID en Client Secret.',
    'Code invalide ou expiré : refais l’autorisation.': 'Ongeldige of verlopen code: autoriseer opnieuw.',
  },
});

/* ---------- Fonctions pures ---------- */

// Famille d'une activité Strava : run | ride | swim | walk | other.
export function kindOf(type) {
  const s = String(type || '');
  if (/run/i.test(s)) return 'run';
  if (/ride|bike|cycling/i.test(s)) return 'ride';
  if (/swim/i.test(s)) return 'swim';
  if (/walk|hike/i.test(s)) return 'walk';
  return 'other';
}
// Filtre d'affichage : all | run | ride | swim | other (la marche entre dans « Autre »).
export const filterOf = (a) => { const k = kindOf(a.type); return k === 'walk' ? 'other' : k; };
export const applyFilter = (list, f) => (f === 'all' ? list : list.filter((a) => filterOf(a) === f));

const MET = { run: 9.8, walk: 3.5, swim: 8, other: 6 };

// kcal estimées : vélo = kJ × 1 (kJ ≈ kcal pour un cycliste), sinon MET × poids × heures.
export function estimateKcal(a, kg) {
  if (kindOf(a.type) === 'ride' && a.kj > 0) return Math.round(a.kj);
  const h = (a.moving_s || 0) / 3600;
  const met = MET[kindOf(a.type)] || MET.other;
  return Math.round(met * (kg > 0 ? kg : 70) * h);
}

// Activité brute (liste ou détail Strava) → forme stockée. La date est celle du lieu (start_date_local).
export function normalize(raw, kg) {
  const a = {
    id: raw.id,
    type: raw.sport_type || raw.type || 'Workout',
    name: raw.name || '',
    date: String(raw.start_date_local || raw.start_date || '').slice(0, 10),
    distance_m: Math.round(raw.distance || 0),
    moving_s: Math.round(raw.moving_time || 0),
    elev_m: Math.round(raw.total_elevation_gain || 0),
    avg_hr: raw.average_heartrate ? Math.round(raw.average_heartrate) : 0,
    max_hr: raw.max_heartrate ? Math.round(raw.max_heartrate) : 0,
    calories: Math.round(raw.calories || 0),
    kj: Math.round(raw.kilojoules || 0),
    device: raw.device_name || '',
  };
  a.est = !a.calories;
  if (a.est) a.calories = estimateKcal(a, kg);
  return a;
}

// Facteur de charge simple selon la FC moyenne (1 sans capteur).
export function hrFactor(avgHr) {
  if (!avgHr) return 1;
  return avgHr < 120 ? 0.7 : avgHr < 140 ? 1 : avgHr < 160 ? 1.3 : 1.6;
}
// Charge d'entraînement = minutes × facteur FC.
export const trainingLoad = (a) => Math.round(((a.moving_s || 0) / 60) * hrFactor(a.avg_hr));

export function groupByDay(list) {
  const out = {};
  for (const a of list) (out[a.date] ||= []).push(a);
  return out;
}

// Bilan d'une semaine (lundi → dimanche) : km, durée, kcal, charge, et par jour.
export function weekSummary(list, weekStartIso) {
  const days = [];
  for (let i = 0; i < 7; i++) { const d = parseDate(weekStartIso); d.setDate(d.getDate() + i); days.push(isoDate(d)); }
  const by = groupByDay(list);
  const perDay = days.map((date) => {
    const acts = by[date] || [];
    return { date, km: acts.reduce((s, a) => s + a.distance_m, 0) / 1000, min: acts.reduce((s, a) => s + a.moving_s, 0) / 60, kcal: acts.reduce((s, a) => s + a.calories, 0), load: acts.reduce((s, a) => s + trainingLoad(a), 0), count: acts.length };
  });
  const sum = (k) => perDay.reduce((s, d) => s + d[k], 0);
  return { start: weekStartIso, days: perDay, km: sum('km'), min: sum('min'), kcal: sum('kcal'), load: sum('load'), count: sum('count') };
}

// Charge de la semaine vs moyenne des 4 semaines précédentes → { current, avg, pct } (pct null sans historique).
export function compareLoad(list, weekStartIso) {
  const cur = weekSummary(list, weekStartIso).load;
  const prev = [];
  for (let i = 1; i <= 4; i++) { const d = parseDate(weekStartIso); d.setDate(d.getDate() - 7 * i); prev.push(weekSummary(list, isoDate(d)).load); }
  const avg = prev.reduce((s, v) => s + v, 0) / 4;
  return { current: cur, avg: Math.round(avg), pct: avg > 0 ? Math.round((cur / avg - 1) * 100) : null };
}

// Grosse sortie : charge ≥ 90 ou plus de 1 h 30.
export const isHeavy = (a) => trainingLoad(a) >= 90 || a.moving_s >= 5400;

// Zones FC simples (% de la FC max estimée 220 − âge, ou FC max observée si pas d'âge) pour la FC moyenne.
export function hrZone(avgHr, maxHr) {
  if (!avgHr || !maxHr) return 0;
  const p = avgHr / maxHr;
  return p < 0.6 ? 1 : p < 0.7 ? 2 : p < 0.8 ? 3 : p < 0.9 ? 4 : 5;
}

// Intervalle de dates à synchroniser : 60 jours en arrière.
export const afterTs = (now = new Date(), days = 60) => Math.floor(now.getTime() / 1000) - days * 86400;

// Fusion : garde les kcal officielles déjà obtenues par le détail ; supprime les doublons.
export function mergeActivities(oldList, fresh) {
  const prev = new Map(oldList.map((a) => [a.id, a]));
  const out = fresh.map((a) => { const p = prev.get(a.id); return p && !p.est && a.est ? { ...a, calories: p.calories, est: false } : a; });
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
}

export const authorizeUrl = (clientId) => 'https://www.strava.com/oauth/authorize?' + new URLSearchParams({
  client_id: String(clientId || '').trim(), response_type: 'code', redirect_uri: REDIRECT_URI, approval_prompt: 'auto', scope: 'read,activity:read_all',
});

/* ---------- Contrat pour les autres modules ---------- */

const S = () => state.strava;
export const isConnected = () => !!(S() && S().refresh);
export const prefs = () => ({ ...DEFAULT_PREFS, ...(S()?.prefs || {}) });
export const activitiesOn = (dateISO) => (isConnected() ? (S().activities || []).filter((a) => a.date === dateISO) : []);
export const kcalBurnedOn = (dateISO) => activitiesOn(dateISO).reduce((s, a) => s + (a.calories || 0), 0);
// Vrai si une grosse sortie a eu lieu ce jour-là et que l'option « alléger » est active (pour la séance suivante).
export const shouldLighten = (dateISO) => isConnected() && prefs().adapt && activitiesOn(dateISO).some(isHeavy);

/* ---------- Réseau ---------- */

function fail(code, msg) { const e = new Error(msg); e.code = code; return e; }

async function call(url, opts) {
  let r;
  try { r = await fetch(url, opts); } catch { throw fail('network', t('Strava est injoignable. Vérifie ta connexion.')); }
  if (r.status === 401 || r.status === 403) throw fail('auth', t('Reconnecte Strava (session expirée ou refusée).'));
  if (r.status === 429) throw fail('rate', t('Strava limite les requêtes : réessaie dans 15 minutes.'));
  if (!r.ok) throw fail('http', t('Erreur Strava : ') + r.status);
  return r.json();
}

function tokenCall(params) {
  return call(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
}
function applyToken(j) {
  Object.assign(S(), { token: j.access_token, refresh: j.refresh_token, expiresAt: j.expires_at });
  if (j.athlete) S().athlete = { id: j.athlete.id, name: [j.athlete.firstname, j.athlete.lastname].filter(Boolean).join(' ') };
  save();
}

// Enregistre les identifiants saisis (sans toucher aux activités déjà en cache).
export function saveCredentials(clientId, clientSecret) {
  const id = String(clientId || '').trim(), secret = String(clientSecret || '').trim();
  if (!id || !secret) throw fail('input', t('Colle ton Client ID et ton Client Secret.'));
  state.strava = { activities: [], lastSync: 0, ...(state.strava || {}), clientId: id, clientSecret: secret, prefs: prefs() };
  save();
}

// Échange le code collé (ou l'URL complète) contre les jetons.
export async function exchangeCode(code) {
  if (!S()?.clientId) throw fail('input', t('Colle ton Client ID et ton Client Secret.'));
  const m = String(code || '').match(/[?&]code=([^&\s]+)/);
  const c = (m ? m[1] : String(code || '')).trim();
  if (!c) throw fail('input', t('Code invalide ou expiré : refais l’autorisation.'));
  try { applyToken(await tokenCall({ client_id: S().clientId, client_secret: S().clientSecret, code: c, grant_type: 'authorization_code' })); }
  catch (e) { if (e.code === 'auth' || e.code === 'http') throw fail('input', t('Code invalide ou expiré : refais l’autorisation.')); throw e; }
}

// Jeton valide (rafraîchi automatiquement s'il expire dans moins d'une minute).
export async function accessToken() {
  if (!isConnected()) throw fail('auth', t('Reconnecte Strava (session expirée ou refusée).'));
  if (!S().token || (S().expiresAt || 0) < Date.now() / 1000 + 60) {
    applyToken(await tokenCall({ client_id: S().clientId, client_secret: S().clientSecret, grant_type: 'refresh_token', refresh_token: S().refresh }));
  }
  return S().token;
}

// Déconnexion : efface les jetons et le cache, garde Client ID/Secret pour se reconnecter vite.
export function disconnect() {
  if (!state.strava) return;
  const { clientId, clientSecret, prefs: p } = state.strava;
  state.strava = { clientId, clientSecret, prefs: p || { ...DEFAULT_PREFS }, activities: [], lastSync: 0 };
  save();
}

// Synchro : liste des 60 derniers jours, puis détail (kcal) des 20 plus récentes sans calories officielles.
// 1 + 20 requêtes au plus : bien sous la limite de 100 / 15 min.
let running = null;
export function sync() {
  if (!running) running = doSync().finally(() => { running = null; });
  return running;
}
async function doSync() {
  const token = await accessToken();
  const headers = { Authorization: 'Bearer ' + token };
  const kg = latestWeight();
  const raws = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await call(`${API}/athlete/activities?after=${afterTs()}&per_page=100&page=${page}`, { headers });
    raws.push(...batch);
    if (batch.length < 100) break;
  }
  const old = S().activities || [];
  let list = mergeActivities(old, raws.map((r) => normalize(r, kg)));
  const todo = list.filter((a) => a.est && !a.noDetail).slice(0, 20);
  for (const a of todo) {
    try {
      const d = await call(`${API}/activities/${a.id}`, { headers });
      const n = normalize(d, kg);
      Object.assign(a, { calories: n.calories, est: n.est, avg_hr: n.avg_hr || a.avg_hr, max_hr: n.max_hr || a.max_hr, device: n.device || a.device, kj: n.kj || a.kj });
      if (n.est) a.noDetail = true; // Strava n'a pas de calories pour celle-ci : inutile de redemander
    } catch (e) {
      if (e.code === 'rate' || e.code === 'auth') { S().activities = list; save(); throw e; }
    }
  }
  S().activities = list;
  S().lastSync = Date.now();
  save();
  return list.length;
}

export { weekStart };

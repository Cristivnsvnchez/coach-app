// Réseau résilient pour toutes les API externes (Claude, Open Food Facts, Strava) :
// délai maximum, nouvelles tentatives espacées (backoff exponentiel + aléa) sur surcharge ou coupure,
// respect de l'en-tête Retry-After. Pas de nouvelle tentative sur les erreurs du client (400, 401, 403, 404).

const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 529]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Attente avant la tentative n (0, 1, 2…) : Retry-After si fourni (plafonné), sinon 0,6 s × 2^n ± 30 %.
export function retryDelay(n, retryAfter, base = 600, cap = 8000) {
  const s = Number(retryAfter);
  if (Number.isFinite(s) && s >= 0) return Math.min(s * 1000, cap);
  const d = base * 2 ** n;
  return Math.min(cap, Math.round(d * (0.7 + Math.random() * 0.6)));
}

export const shouldRetry = (status) => RETRY_STATUS.has(status);

// fetch avec délai (timeoutMs) et `retries` nouvelles tentatives. Renvoie la dernière réponse (même en erreur) ;
// lève une erreur seulement si le réseau est injoignable après toutes les tentatives.
export async function fetchRetry(url, opts = {}, { retries = 2, timeoutMs = 20000 } = {}) {
  for (let n = 0; ; n++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { ...opts, signal: ctrl.signal });
      if (n < retries && shouldRetry(r.status)) { await sleep(retryDelay(n, r.headers.get('retry-after'))); continue; }
      return r;
    } catch (e) {
      if (n >= retries || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
        throw new Error(e.name === 'AbortError' ? 'Le serveur met trop de temps à répondre.' : 'Pas de connexion internet.');
      }
      await sleep(retryDelay(n));
    } finally { clearTimeout(timer); }
  }
}

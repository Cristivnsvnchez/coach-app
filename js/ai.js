// Appels à l'API Claude directement depuis le téléphone (clé perso, usage strictement personnel).
// Pas de SDK : l'app n'a pas d'étape de build, on appelle l'API Messages en HTTP.
import { state, save } from './store.js';
import { getLang } from './i18n.js';
import { fetchRetry } from './net.js';

export const MODELS = {
  'claude-opus-5-5': 'Claude Opus 5.5 — le plus fiable (~4 $/20 $ par M tokens)',
  'claude-sonnet-5-5': 'Claude Sonnet 5.5 — bon compromis (~2 $/10 $)',
  'claude-haiku-5-5': 'Claude Haiku 5.5 — le moins cher (~0,10 $/0,50 $)',
};

// Sources autorisées pour la recherche web (littérature scientifique, agences, bases de composition).
export const ALLOWED_DOMAINS = [
  'pubmed.ncbi.nlm.nih.gov', 'ncbi.nlm.nih.gov', 'doi.org', 'cochranelibrary.com',
  'jissn.biomedcentral.com', 'bjsm.bmj.com', 'journals.lww.com', 'link.springer.com',
  'academic.oup.com', 'tandfonline.com', 'nature.com', 'thelancet.com',
  'who.int', 'fao.org', 'efsa.europa.eu', 'anses.fr', 'ciqual.anses.fr', 'mangerbouger.fr',
  'nih.gov', 'ods.od.nih.gov', 'acsm.org', 'fdc.nal.usda.gov', 'nhs.uk',
];

export const SYSTEM = `Tu es le coach personnel de l'utilisateur : docteur en sciences du sport et diététicien-nutritionniste.
Règles :
- Réponds de façon concise et actionnable (listes courtes, chiffres précis, unités métriques).
- Appuie-toi sur des preuves : méta-analyses, essais contrôlés, positions ISSN/ACSM/OMS/EFSA/ANSES. Quand tu cherches sur le web, cite tes sources (auteur, année, revue) et distingue le niveau de preuve.
- Valeurs nutritionnelles : préfère Ciqual (ANSES) ou USDA FoodData Central ; indique la source.
- Ne fais pas de diagnostic médical. Si l'utilisateur est mineur, enceinte/allaitante, a un trouble du comportement alimentaire, une maladie chronique ou un IMC < 18,5, recommande un professionnel de santé et reste prudent.
- Ne propose jamais moins de 1200 kcal/j (femme) ou 1500 kcal/j (homme) sans suivi médical, ni plus de 1 % de perte de poids par semaine.
Posture de coach :
- Tu raisonnes comme un préparateur physique expérimenté : périodisation, surcharge progressive, gestion de la fatigue, récupération, technique, adhérence.
- Avant de proposer un plan ou un conseil personnalisé, vérifie que tu connais l'essentiel : objectif précis et échéance, niveau et historique d'entraînement, jours et durée disponibles, blessures ou douleurs, matériel, sommeil/stress, préférences. S'il manque une information qui changerait vraiment ta réponse, pose d'abord 1 à 3 questions courtes et précises (avec des choix quand c'est possible) et attends la réponse.
- Explique brièvement le « pourquoi » de chaque choix, en langage simple, puis donne l'action concrète.`;

export const hasKey = () => !!state.settings.apiKey;

// ---- Budget : coût suivi localement à partir de l'usage renvoyé par l'API ----
// Tarifs publics en $ par million de tokens (entrée, sortie) ; recherche web : 10 $ / 1 000 requêtes.
// Conversion €/$ approximative : la limite fixée dans la Console Anthropic reste la seule garantie côté serveur.
export const PRICES = {
  'claude-opus-5-5': [4, 20], 'claude-sonnet-5-5': [2, 10], 'claude-haiku-5-5': [0.1, 0.5],
};
const SEARCH_USD = 0.01;
export const USD_TO_EUR = 0.92;
const monthKey = () => new Date().toISOString().slice(0, 7);

export function usage() {
  const u = state.usage && state.usage.month === monthKey() ? state.usage : { month: monthKey(), usd: 0, calls: 0 };
  const budget = Number(state.settings.budgetEur ?? 10);
  return { ...u, eur: u.usd * USD_TO_EUR, budget };
}

// Coût d'une réponse de l'API (dollars).
export function costUsd(model, u = {}) {
  const [pin, pout] = PRICES[model] || PRICES['claude-opus-5-5'];
  const input = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) * 1.25 + (u.cache_read_input_tokens || 0) * 0.1;
  return (input * pin + (u.output_tokens || 0) * pout) / 1e6 + (u.server_tool_use?.web_search_requests || 0) * SEARCH_USD;
}

function record(usd) {
  const u = usage();
  state.usage = { month: u.month, usd: u.usd + usd, calls: u.calls + 1 };
  save();
}

// Bloque la requête si le pire cas (toute la sortie consommée) dépasserait le budget du mois.
function checkBudget(model, body, search) {
  const u = usage();
  if (!(u.budget > 0)) return;
  const [pin, pout] = PRICES[model] || PRICES['claude-opus-5-5'];
  const inTok = JSON.stringify(body.messages).length / 3;
  const worst = ((inTok * pin + body.max_tokens * pout) / 1e6 + (search ? 6 * SEARCH_USD : 0)) * USD_TO_EUR;
  if (u.eur + worst > u.budget) {
    const err = new Error('Budget IA du mois atteint ({x} € sur {b} €). Augmente-le dans Profil ou attends le mois prochain.');
    err.vars = { x: u.eur.toFixed(2), b: u.budget };
    throw err;
  }
}

// Contexte utilisateur compact injecté dans les demandes.
export function userContext(extra = {}) {
  const p = state.profile;
  return JSON.stringify({
    profil: { sexe: p.sex, age: p.age, taille_cm: p.height, poids_kg: p.weight, masse_grasse_pct: p.bodyFat || null, activite: p.activity, objectif: p.goal, rythme_pct_semaine: p.rate, regime: p.diet || null, allergies: p.allergies || null, materiel: p.equipment || null, seances_semaine: p.sessions || null },
    ...extra,
  });
}

// messages : [{ role, content }]. Renvoie { text, sources: [{url,title}], raw }.
export async function ask(messages, { search = false, json = null, maxTokens = 8000, effort = 'medium' } = {}) {
  if (!hasKey()) throw new Error('Ajoute ta clé API Claude dans Profil.');
  if (!navigator.onLine) throw new Error('Pas de connexion internet.');
  const model = state.settings.model || 'claude-opus-5-5';
  const lang = getLang() === 'en' ? '\n- Réponds en ANGLAIS (English), unités métriques.' : '\n- Réponds en français.';
  const body = { model, max_tokens: maxTokens, system: SYSTEM + lang, messages: [...messages], output_config: { effort } };
  const headers = {
    'content-type': 'application/json',
    'x-api-key': state.settings.apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  // Repli automatique si un filtre de sécurité refuse la demande (modèles qui le supportent).
  if (model !== 'claude-haiku-5-5') { body.fallbacks = 'default'; headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'; }
  // Haiku n'a que la version de base de la recherche web.
  const searchType = model === 'claude-haiku-5-5' ? 'web_search_20250305' : 'web_search_20260209';
  if (search) body.tools = [{ type: searchType, name: 'web_search', max_uses: 6, allowed_domains: ALLOWED_DOMAINS }];
  if (json) body.output_config.format = { type: 'json_schema', schema: json };
  checkBudget(model, body, search);

  const content = [];
  let paused = false;
  for (let turn = 0; turn < 4; turn++) {
    // Surcharge (429/529) ou coupure : jusqu'à 2 nouvelles tentatives espacées ; recherche web longue → délai 120 s.
    const r = await fetchRetry('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) }, { retries: 2, timeoutMs: 120000 });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = j.error?.message || r.statusText;
      if (r.status === 401) throw new Error('Clé API invalide. Vérifie-la dans Profil.');
      if (r.status === 429 || r.status === 529) throw new Error('Service IA surchargé, réessaie dans une minute.');
      if (r.status === 400 && /credit|balance/i.test(msg)) throw new Error('Crédit API épuisé : recharge sur console.anthropic.com.');
      throw new Error(`Erreur API ${r.status} : ${msg}`);
    }
    record(costUsd(j.model || model, j.usage));
    content.push(...(j.content || []));
    if (j.stop_reason === 'refusal') throw new Error('Demande refusée par le filtre de sécurité. Reformule ta question.');
    if (j.stop_reason === 'max_tokens' && json) throw new Error('Réponse trop longue, réessaie avec moins d\'aliments.');
    // Recherche longue : l'API rend la main, on relance avec tout le contenu partiel cumulé.
    paused = j.stop_reason === 'pause_turn';
    if (paused) { body.messages = [...messages, { role: 'assistant', content: [...content] }]; continue; }
    break;
  }
  if (paused) throw new Error('La recherche a pris trop de temps. Réessaie ou décoche 🔬.');

  const text = content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const sources = new Map();
  for (const b of content) {
    for (const c of b.citations || []) if (c.url) sources.set(c.url, c.title || c.url);
  }
  if (!sources.size) {
    for (const b of content) if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content.slice(0, 5)) if (r.url) sources.set(r.url, r.title || r.url);
    }
  }
  return { text, sources: [...sources].map(([url, title]) => ({ url, title })), raw: content };
}

// Test de connexion : requête minimale sur le modèle le moins cher (≈ 0,0001 €).
export async function testConnection() {
  if (!hasKey()) throw new Error('Ajoute ta clé API Claude dans Profil.');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': state.settings.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 16, messages: [{ role: 'user', content: 'Réponds juste : OK' }] }),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error('Clé API invalide. Vérifie-la dans Profil.');
  if (!r.ok) throw new Error(`Erreur API ${r.status} : ${j.error?.message || r.statusText}`);
  record(costUsd('claude-haiku-5-5', j.usage));
  return true;
}

// Extrait le dernier bloc ```json ... ``` d'un texte (ou null).
export function extractJson(text) {
  const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/g)];
  if (!blocks.length) return null;
  try { return JSON.parse(blocks[blocks.length - 1][1]); } catch { return null; }
}
export const stripJson = (text) => text.replace(/```json[\s\S]*?```/g, '').trim();

// Photo → base64 JPEG redimensionnée (≤ 1024 px) pour limiter le coût.
export async function imageToBase64(file, max = 1024) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85).split(',')[1];
}

const MEAL_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['items', 'note'],
  properties: {
    note: { type: 'string' },
    items: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['name', 'grams', 'kcal', 'p', 'c', 'f', 'fib'],
      properties: { name: { type: 'string' }, grams: { type: 'number' }, kcal: { type: 'number' }, p: { type: 'number' }, c: { type: 'number' }, f: { type: 'number' }, fib: { type: 'number' } },
    } },
  },
};

// Estimation d'un repas depuis une photo et/ou une description libre.
export async function estimateMeal({ imageB64, description }) {
  const content = [];
  if (imageB64) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 } });
  content.push({ type: 'text', text: `Estime les aliments, grammages et valeurs nutritionnelles (kcal, protéines p, glucides c, lipides f, fibres fib en g) de ce repas, en te basant sur les valeurs Ciqual/USDA. ${description ? 'Description : ' + description : ''}
Si une quantité est incertaine, prends une portion standard et dis-le dans "note" (1 phrase).` });
  const r = await ask([{ role: 'user', content }], { json: MEAL_SCHEMA, maxTokens: 4000, effort: 'low' });
  try { return JSON.parse(r.text); } catch { throw new Error('Réponse de l\'IA illisible, réessaie.'); }
}

// ---- Programme : questions du coach puis génération (sorties JSON structurées) ----
const Q_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['questions'],
  properties: { questions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['q', 'options'],
    properties: { q: { type: 'string' }, options: { type: 'array', items: { type: 'string' } } } } } },
};

// Le coach lit le brief et pose 0 à 3 questions déterminantes (avec options de réponse si possible).
export async function programQuestions(brief) {
  const r = await ask([{ role: 'user', content: `Je veux un programme d'entraînement. Voici mon brief : ${JSON.stringify(brief)}. Contexte : ${userContext()}.
Avant de concevoir quoi que ce soit, pose-moi uniquement les questions (0 à 3) dont la réponse changerait vraiment le programme (ex. blessure à préciser, expérience sur les mouvements de base, échéance ou épreuve précise, préférence d'exercices, sport pratiqué à côté). Fournis 2 à 4 options courtes quand c'est pertinent (sinon une liste vide). Si le brief est complet, renvoie une liste vide.` }],
  { json: Q_SCHEMA, maxTokens: 2000, effort: 'medium' });
  try { return JSON.parse(r.text).questions.slice(0, 3); } catch { throw new Error("Réponse de l'IA illisible, réessaie."); }
}

export async function programGenerate(brief, answers, muscles, library) {
  const schema = {
    type: 'object', additionalProperties: false, required: ['name', 'rationale', 'days'],
    properties: {
      name: { type: 'string' }, rationale: { type: 'string' },
      days: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'exercises'], properties: {
        name: { type: 'string' },
        exercises: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'muscle', 'sets', 'repMin', 'repMax', 'rest'], properties: {
          name: { type: 'string' }, muscle: { type: 'string', enum: muscles }, sets: { type: 'integer' }, repMin: { type: 'integer' }, repMax: { type: 'integer' }, rest: { type: 'integer' } } } } } } },
    },
  };
  const r = await ask([{ role: 'user', content: `Conçois mon programme. Brief : ${JSON.stringify(brief)}. Réponses à tes questions : ${JSON.stringify(answers)}. Contexte : ${userContext()}.
Contraintes : exactement ${brief.weekdays.length} séances différentes ou moins (elles tourneront sur mes jours), chaque séance tient en ${brief.minutes} min échauffement compris, 10–20 séries/muscle/semaine pour l'hypertrophie, fréquence ≥ 2×/semaine par muscle si possible, adapte aux blessures. Utilise de préférence ces noms d'exercices exacts : ${library.join(', ')}. "rest" en secondes. "rationale" : 3 à 5 phrases simples expliquant les choix (structure, volume, progression, décharges).` }],
  { json: schema, maxTokens: 6000, effort: 'high' });
  try { return JSON.parse(r.text); } catch { throw new Error("Réponse de l'IA illisible, réessaie."); }
}

// Appels à l'API Claude directement depuis le téléphone (clé perso, usage strictement personnel).
// Pas de SDK : l'app n'a pas d'étape de build, on appelle l'API Messages en HTTP.
import { state } from './store.js';

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
- Réponds en français, de façon concise et actionnable (listes courtes, chiffres précis, unités métriques).
- Appuie-toi sur des preuves : méta-analyses, essais contrôlés, positions ISSN/ACSM/OMS/EFSA/ANSES. Quand tu cherches sur le web, cite tes sources (auteur, année, revue) et distingue le niveau de preuve.
- Valeurs nutritionnelles : préfère Ciqual (ANSES) ou USDA FoodData Central ; indique la source.
- Ne fais pas de diagnostic médical. Si l'utilisateur est mineur, enceinte/allaitante, a un trouble du comportement alimentaire, une maladie chronique ou un IMC < 18,5, recommande un professionnel de santé et reste prudent.
- Ne propose jamais moins de 1200 kcal/j (femme) ou 1500 kcal/j (homme) sans suivi médical, ni plus de 1 % de perte de poids par semaine.`;

export const hasKey = () => !!state.settings.apiKey;

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
  const body = { model, max_tokens: maxTokens, system: SYSTEM, messages: [...messages], output_config: { effort } };
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

  const content = [];
  let paused = false;
  for (let turn = 0; turn < 4; turn++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = j.error?.message || r.statusText;
      if (r.status === 401) throw new Error('Clé API invalide. Vérifie-la dans Profil.');
      if (r.status === 429) throw new Error('Trop de requêtes, réessaie dans une minute.');
      if (r.status === 400 && /credit|balance/i.test(msg)) throw new Error('Crédit API épuisé : recharge sur console.anthropic.com.');
      throw new Error(`Erreur API ${r.status} : ${msg}`);
    }
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

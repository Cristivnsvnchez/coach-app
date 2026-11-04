// Strava : à implémenter (voir docs/plan-trackme.md). Contrat utilisé par les autres modules :
// isConnected() → bool ; activitiesOn(dateISO) → [activité] ; kcalBurnedOn(dateISO) → nombre (kcal brûlées ce jour).
export const isConnected = () => false;
export const activitiesOn = () => [];
export const kcalBurnedOn = () => 0;

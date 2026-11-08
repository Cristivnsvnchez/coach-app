// Signaux de séance : écran maintenu allumé (Screen Wake Lock) et son de fin de repos (Web Audio).
// iOS ignore navigator.vibrate : le son prend le relais. Le bouton silencieux de l'iPhone peut le couper.
// Contrôleur testable sous Node : on lui passe navigator et document (ou des doublures).

export function wakeController(nav = globalThis.navigator, doc = globalThis.document) {
  let wanted = false, lock = null, pending = null;
  const supported = () => !!nav?.wakeLock?.request;
  async function acquire() {
    if (!wanted || lock || pending || !supported() || doc?.visibilityState === 'hidden') return;
    pending = nav.wakeLock.request('screen')
      .then((l) => {
        pending = null;
        if (!wanted) { l.release?.(); return; }
        lock = l;
        l.addEventListener?.('release', () => { if (lock === l) lock = null; });
      })
      .catch(() => { pending = null; }); // refus (batterie faible, onglet masqué) : on réessaiera au retour
    return pending;
  }
  // Le système relâche le verrou quand l'app passe en arrière-plan : on le redemande au retour.
  doc?.addEventListener?.('visibilitychange', () => { if (doc.visibilityState === 'visible') acquire(); });
  return {
    supported,
    get active() { return !!lock; },
    async set(on) {
      wanted = !!on;
      if (wanted) return acquire();
      const l = lock; lock = null;
      try { await l?.release?.(); } catch {}
    },
  };
}

let ctx = null;
// À appeler depuis un geste de l'utilisateur (toucher) : iOS n'autorise le son qu'après une interaction.
export function unlockAudio() {
  try {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return false;
    ctx = ctx || new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  } catch { return false; }
}

// Trois bips courts et montants (fin du repos). Sans contexte audio débloqué : rien.
export function restBeep() {
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime + 0.02;
    [660, 660, 990].forEach((f, k) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const s = t0 + k * 0.22, d = k === 2 ? 0.32 : 0.14;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.35, s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, s + d);
      o.connect(g).connect(ctx.destination);
      o.start(s); o.stop(s + d + 0.02);
    });
    return true;
  } catch { return false; }
}

export const wake = typeof document === 'undefined' ? null : wakeController();

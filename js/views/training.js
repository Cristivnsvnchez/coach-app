// Onglet Entraînement : programme, séance pré-remplie avec double progression, minuteur de repos, records, volume.
import * as S from '../science.js';
import { state, save, today, uid } from '../store.js';
import { weeklyVolume } from '../metrics.js';
import { esc, fmt, fmtDate, toast, sheet } from '../ui.js';

// Programme par défaut : full body 3 j/sem (chaque muscle ≥ 2×/sem, Schoenfeld 2016).
export const DEFAULT_PROGRAM = {
  name: 'Full body 3 jours (débutant/intermédiaire)',
  days: [
    { name: 'Jour A', exercises: [
      { name: 'Squat', muscle: 'Quadriceps', sets: 3, repMin: 6, repMax: 10, upper: false },
      { name: 'Développé couché', muscle: 'Pectoraux', sets: 3, repMin: 6, repMax: 10, upper: true },
      { name: 'Rowing barre', muscle: 'Dos', sets: 3, repMin: 8, repMax: 12, upper: true },
      { name: 'Élévations latérales', muscle: 'Épaules', sets: 3, repMin: 12, repMax: 20, upper: true },
      { name: 'Curl haltères', muscle: 'Biceps', sets: 2, repMin: 10, repMax: 15, upper: true },
    ] },
    { name: 'Jour B', exercises: [
      { name: 'Soulevé de terre roumain', muscle: 'Ischios', sets: 3, repMin: 6, repMax: 10, upper: false },
      { name: 'Développé militaire', muscle: 'Épaules', sets: 3, repMin: 6, repMax: 10, upper: true },
      { name: 'Tractions / tirage vertical', muscle: 'Dos', sets: 3, repMin: 6, repMax: 12, upper: true },
      { name: 'Fentes bulgares', muscle: 'Fessiers', sets: 3, repMin: 8, repMax: 12, upper: false },
      { name: 'Extensions triceps', muscle: 'Triceps', sets: 2, repMin: 10, repMax: 15, upper: true },
    ] },
    { name: 'Jour C', exercises: [
      { name: 'Presse à cuisses', muscle: 'Quadriceps', sets: 3, repMin: 10, repMax: 15, upper: false },
      { name: 'Développé incliné haltères', muscle: 'Pectoraux', sets: 3, repMin: 8, repMax: 12, upper: true },
      { name: 'Rowing haltère', muscle: 'Dos', sets: 3, repMin: 8, repMax: 12, upper: true },
      { name: 'Leg curl', muscle: 'Ischios', sets: 3, repMin: 10, repMax: 15, upper: false },
      { name: 'Mollets debout', muscle: 'Mollets', sets: 3, repMin: 10, repMax: 20, upper: false },
      { name: 'Gainage / crunch', muscle: 'Abdos', sets: 3, repMin: 10, repMax: 20, upper: true },
    ] },
  ],
};

// Séance en cours : gardée dans une clé dédiée, car iOS peut tuer la PWA en arrière-plan entre deux séries.
const ACTIVE_KEY = 'coach.active';
let active = null;
try { active = JSON.parse(localStorage.getItem(ACTIVE_KEY)); } catch {}
let timer = null;

function persistActive() {
  try { active ? localStorage.setItem(ACTIVE_KEY, JSON.stringify(active)) : localStorage.removeItem(ACTIVE_KEY); } catch {}
}

// Dernière séance où l'exercice a au moins une série validée.
function lastOf(name) {
  for (let i = state.workouts.length - 1; i >= 0; i--) {
    const ex = state.workouts[i].exercises.find((e) => e.name === name);
    if (ex && ex.sets.some((s) => s.done)) return { ex, idx: i };
  }
  return null;
}

// Séances ratées consécutives (au moins une série sous le rep min).
function failedStreak(name, repMin) {
  let n = 0;
  for (let i = state.workouts.length - 1; i >= 0 && n < 3; i--) {
    const ex = state.workouts[i].exercises.find((e) => e.name === name);
    if (!ex) continue;
    if (ex.sets.some((s) => s.done && s.reps < repMin)) n++; else break;
  }
  return n;
}

function startSession(day) {
  active = { id: uid(), date: today(), dayName: day.name, start: Date.now(), exercises: day.exercises.map((ex) => {
    const prev = lastOf(ex.name);
    let load = 0, reps = ex.repMin, why = 'Première fois : choisis une charge laissant 2–3 reps en réserve';
    if (prev) {
      const done = prev.ex.sets.filter((s) => s.done);
      const rir = Math.min(...done.map((s) => s.rir ?? 2));
      const n = S.nextSet({ load: done[0]?.kg ?? 0, reps: done.map((s) => s.reps), repMin: ex.repMin, repMax: ex.repMax, rir, upper: ex.upper, failedSessions: failedStreak(ex.name, ex.repMin) });
      ({ load, reps, why } = n);
    }
    return { ...ex, why, sets: Array.from({ length: ex.sets }, () => ({ kg: load, reps, rir: 2, done: false })) };
  }) };
  persistActive();
}

function restTimer(sec = 120) {
  clearInterval(timer);
  const end = Date.now() + sec * 1000;
  const tick = () => {
    // La vue est re-rendue à chaque série : on relit l'élément à chaque tick.
    const el = document.querySelector('.rest');
    if (!el) return clearInterval(timer);
    el.hidden = false;
    const left = Math.max(0, Math.round((end - Date.now()) / 1000));
    el.querySelector('span').textContent = `Repos ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (!left) { clearInterval(timer); el.hidden = true; navigator.vibrate?.(300); toast('Repos terminé 💪'); }
  };
  tick(); timer = setInterval(tick, 1000);
}

function records() {
  const best = {};
  for (const w of state.workouts) for (const ex of w.exercises) for (const s of ex.sets) {
    if (!s.done || !s.kg) continue;
    const e1 = S.epley1RM(s.kg, s.reps);
    if (!best[ex.name] || e1 > best[ex.name].e1) best[ex.name] = { e1, kg: s.kg, reps: s.reps, date: w.date };
  }
  return Object.entries(best).sort((a, b) => b[1].e1 - a[1].e1);
}

export function render(root, go) {
  const prog = state.program || DEFAULT_PROGRAM;
  if (active) return renderSession(root, go);
  const vol = weeklyVolume();
  const recs = records();
  const nextDay = (() => {
    const last = state.workouts[state.workouts.length - 1];
    const i = last ? prog.days.findIndex((d) => d.name === last.dayName) : -1;
    return (i + 1) % prog.days.length;
  })();

  root.innerHTML = `
    <header class="top"><h1>Entraînement</h1></header>
    <section class="card">
      <div class="meal-head"><b>${esc(prog.name)}</b><button class="btn ghost small" data-a="coach">✨ Nouveau programme IA</button></div>
      <ul class="list">${prog.days.map((d, i) => `<li data-day="${i}"><div><b>${esc(d.name)}${i === nextDay ? ' · <span class="accent">prochaine</span>' : ''}</b><small>${d.exercises.map((e) => esc(e.name)).join(' · ')}</small></div><span class="btn small">Démarrer</span></li>`).join('')}</ul>
    </section>
    <section class="card"><b>Volume de la semaine</b><p class="muted small">Séries effectuées / cible 10–20 par muscle (Schoenfeld 2017)</p>
      <div class="vol">${Object.entries(vol).map(([m, n]) => `<div class="vol-row"><span>${m}</span><div class="bar-track"><div class="bar-fill ${n >= 10 ? 'ok' : ''}" style="width:${Math.min(100, (n / 20) * 100)}%"></div></div><span>${n}</span></div>`).join('')}</div>
    </section>
    <section class="card"><b>Records (1RM estimé, Epley)</b>
      <ul class="list">${recs.slice(0, 8).map(([n, r]) => `<li><div><b>${esc(n)}</b><small>${fmt(r.kg, 1)} kg × ${r.reps} · ${fmtDate(r.date)}</small></div><b>${fmt(r.e1, 1)} kg</b></li>`).join('') || '<li class="muted">Termine une séance pour voir tes records.</li>'}</ul>
    </section>
    <section class="card"><b>Historique</b>
      <ul class="list">${[...state.workouts].reverse().slice(0, 10).map((w) => `<li><div><b>${esc(w.dayName)}</b><small>${fmtDate(w.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)} séries · ${fmt(w.minutes || 0)} min</small></div></li>`).join('') || '<li class="muted">Aucune séance.</li>'}</ul>
    </section>
    <p class="muted small center">OMS 2020 : 150–300 min d'activité modérée/sem + renforcement ≥ 2 j/sem.</p>`;

  root.onclick = (e) => {
    const d = e.target.closest('[data-day]');
    if (d) { startSession(prog.days[+d.dataset.day]); return render(root, go); }
    if (e.target.closest('[data-a=coach]')) go('coach', 'programme');
  };
}

function renderSession(root, go) {
  root.innerHTML = `
    <header class="top"><button class="icon" data-a="cancel" aria-label="Annuler">✕</button><h1>${esc(active.dayName)}</h1><button class="btn primary small" data-a="finish">Terminer</button></header>
    <div class="rest" hidden><span></span><button class="btn small ghost" data-a="skip">Passer</button></div>
    ${active.exercises.map((ex, i) => `<section class="card ex">
      <div class="meal-head"><b>${esc(ex.name)}</b><small class="muted">${ex.repMin}–${ex.repMax} reps · ${esc(ex.muscle)}</small></div>
      <p class="muted small">↗ ${esc(ex.why)}</p>
      <div class="sets"><div class="set head"><span>#</span><span>kg</span><span>reps</span><span>RIR</span><span>✓</span></div>
      ${ex.sets.map((s, j) => `<div class="set ${s.done ? 'done' : ''}"><span>${j + 1}</span>
        <input type="number" inputmode="decimal" step="0.5" data-i="${i}" data-j="${j}" data-k="kg" value="${s.kg}">
        <input type="number" inputmode="numeric" data-i="${i}" data-j="${j}" data-k="reps" value="${s.reps}">
        <input type="number" inputmode="numeric" min="0" max="5" data-i="${i}" data-j="${j}" data-k="rir" value="${s.rir}">
        <button class="check" data-done="${i}-${j}" aria-label="Série faite">${s.done ? '✓' : ''}</button></div>`).join('')}</div>
      <button class="btn ghost small" data-addset="${i}">＋ Série</button>
    </section>`).join('')}
    <p class="muted small center">RIR = répétitions en réserve (vise 1–3). Le minuteur de repos démarre à chaque série validée.</p>`;

  root.oninput = (e) => {
    const t = e.target; if (!t.dataset.k) return;
    active.exercises[t.dataset.i].sets[t.dataset.j][t.dataset.k] = parseFloat(t.value.replace(',', '.')) || 0;
    persistActive();
  };
  root.onclick = (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'cancel') { if (confirm('Abandonner la séance ?')) { active = null; persistActive(); clearInterval(timer); render(root, go); } return; }
    if (a === 'skip') { clearInterval(timer); document.querySelector('.rest').hidden = true; return; }
    if (a === 'finish') {
      const done = active.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.done).length, 0);
      if (!done) return toast('Valide au moins une série');
      clearInterval(timer);
      const w = { ...active, minutes: Math.round((Date.now() - active.start) / 60000) };
      w.exercises = w.exercises.map(({ why, ...ex }) => ex);
      state.workouts.push(w); save(); active = null; persistActive();
      sheet(`<h3>Séance terminée 🎉</h3><p>${done} séries en ${w.minutes} min. Les charges de la prochaine séance sont calculées automatiquement.</p>`);
      return render(root, go);
    }
    const dn = e.target.closest('[data-done]');
    if (dn) {
      const [i, j] = dn.dataset.done.split('-').map(Number);
      const s = active.exercises[i].sets[j];
      s.done = !s.done;
      persistActive();
      renderSession(root, go);
      if (s.done) restTimer(active.exercises[i].upper ? 90 : 150);
      return;
    }
    const as = e.target.closest('[data-addset]');
    if (as) { const sets = active.exercises[+as.dataset.addset].sets; sets.push({ ...sets[sets.length - 1], done: false }); persistActive(); renderSession(root, go); }
  };
}

// Import d'un programme généré par l'IA (validation minimale).
export function importProgram(p) {
  if (!p?.days?.length) throw new Error('Programme invalide');
  state.program = {
    name: String(p.name || 'Programme IA'),
    days: p.days.map((d) => ({ name: String(d.name), exercises: (d.exercises || []).map((e) => ({
      name: String(e.name), muscle: S.MUSCLES.includes(e.muscle) ? e.muscle : 'Abdos',
      sets: Math.max(1, Math.min(8, +e.sets || 3)), repMin: +e.repMin || 8, repMax: +e.repMax || 12, upper: e.upper !== false,
    })) })),
  };
  save();
}

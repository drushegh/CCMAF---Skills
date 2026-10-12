// motion-tokens.js — the single source of motion numbers for a piece.
// Import everywhere; no inline easing strings, durations or spring values.
// Every function here is a pure function of its inputs (render-contract safe).

// ---- Easing (cubic-bezier values per easings.net) -------------------------
export const BEZIER = {
  enter: [0.16, 1, 0.3, 1],     // ease-out-expo   — text/logo reveals
  premium: [0.22, 1, 0.36, 1],  // ease-out-quint  — premium entrances
  move: [0.76, 0, 0.24, 1],     // ease-in-out-quart — moves, camera pushes
  exit: [0.7, 0, 0.84, 0],      // ease-in-expo    — fast exits
  pop: [0.34, 1.56, 0.64, 1],   // ease-out-back   — playful overshoot
};
export const EASE = Object.fromEntries(
  Object.entries(BEZIER).map(([k, v]) => [k, `cubic-bezier(${v.join(', ')})`]),
);

// cubic-bezier evaluated in JS, for canvas/WebGL pieces driven by renderAt(t).
export function bezier([x1, y1, x2, y2]) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u) => ((ax * u + bx) * u + cx) * u;
  const sy = (u) => ((ay * u + by) * u + cy) * u;
  const dx = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i++) { // Newton
      const e = sx(u) - x, d = dx(u);
      if (Math.abs(e) < 1e-6) return sy(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    let lo = 0, hi = 1; u = x; // bisection fallback
    for (let i = 0; i < 30; i++) {
      const v = sx(u);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = u; else hi = u;
      u = (lo + hi) / 2;
    }
    return sy(u);
  };
}
export const ease = Object.fromEntries(Object.entries(BEZIER).map(([k, v]) => [k, bezier(v)]));

// ---- Durations & stagger --------------------------------------------------
export const MS = { feedback: 150, move: 400, hero: 750, exit: 240 }; // exit ≈ 40–50% of entrance
export const STAGGER_MS = { letter: 35, word: 90, item: 60 };
export const msToFrames = (ms, fps) => Math.round((ms / 1000) * fps);

// ---- Springs ----------------------------------------------------------------
// Damping ratio from any library's parameters. 1 = no bounce, 0.7–0.85 premium,
// 0.4–0.6 playful, <0.3 cartoon. Remotion default (k100,d10,m1) = 0.5;
// react-spring default (tension 170, friction 26) ≈ 1.0.
export const dampingRatio = (stiffness, damping, mass = 1) => damping / (2 * Math.sqrt(stiffness * mass));

// Closed-form step response from 0 → 1. t in seconds, zeta = damping ratio,
// freqHz = natural frequency. No simulation: any t renders on its own.
export function spring(t, zeta = 0.7, freqHz = 2) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freqHz;
  if (zeta < 1) {
    const wd = w * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
  }
  if (zeta === 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const s = w * Math.sqrt(zeta * zeta - 1); // over-damped
  const r1 = -zeta * w + s, r2 = -zeta * w - s;
  return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2);
}

// Approximate settle time (to within ~2%) — useful for scheduling holds.
export const springSettle = (zeta = 0.7, freqHz = 2) => 4 / (Math.max(zeta, 0.05) * 2 * Math.PI * freqHz);

// ---- Timeline helpers ---------------------------------------------------------
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, p) => a + (b - a) * p;
// Progress of a segment [t0, t1] in seconds, eased.
export const seg = (t, t0, t1, fn = ease.move) => fn(clamp01((t - t0) / (t1 - t0)));

// ---- Beat grid ----------------------------------------------------------------
export const framesPerBeat = (fps, bpm) => (fps * 60) / bpm;
// Frame of beat n — computed from time and rounded per beat; never accumulate.
export const beatFrame = (n, fps, bpm, offsetFrames = 0) => Math.round(offsetFrames + (n * 60 * fps) / bpm);

// ---- Holds ------------------------------------------------------------------------
// Minimum on-screen time for a text state: 0.3 s per word + 0.5 s.
export const textHold = (text) => 0.3 * text.trim().split(/\s+/).length + 0.5;

// ---- Loops --------------------------------------------------------------------------
// Phase in [0,1) for frame i of an N-frame loop. Use whole-number cycles.
export const phase = (frame, N) => (((frame % N) + N) % N) / N;
export const loopSin = (p, cycles = 1) => Math.sin(2 * Math.PI * cycles * p);

// ---- Seeded randomness ------------------------------------------------------------
// mulberry32: deterministic per seed. Never Math.random in a rendered piece.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

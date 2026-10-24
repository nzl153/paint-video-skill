// Shared helpers for plates. Everything is deterministic: no Math.random, no Date.

export const PAL = {
  paper: '#f3f1ec',
  ink: '#0a0a0b',
  inkSoft: '#2a2a2c',
  grey: '#8d8b86',
  vermilion: '#e0452c',
  cobalt: '#2a45b8',
  amber: '#e9a227',
};

export function hash(i) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Seeded generator for loops that need many values.
export function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a, b, k) => a + (b - a) * k;
export const clamp01 = (k) => Math.max(0, Math.min(1, k));
export const ease = (k) => k * k * (3 - 2 * k);

// Fine film grain over the whole frame; cheap enough to call every frame.
export function grain(ctx, w, h, seed, alpha = 0.05) {
  const r = rng(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = r() < 0.5 ? '#000' : '#fff';
    ctx.fillRect(r() * w, r() * h, 1.5, 1.5);
  }
  ctx.restore();
}

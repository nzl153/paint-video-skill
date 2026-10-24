// Frame f -> pixels. Two layers: the hole shows the rider in the current style, the ring around it
// wears the style the hole had one step ago. Pure: any frame can be rendered on its own.
import { createCanvas } from '@napi-rs/canvas';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { makeRider } from './rider.mjs';
import { FPS, BEAT, STYLES, stepAt, INTRO, OUTRO_AT, BITE_BEAT, HOLE_R } from './timeline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const W = 1920, H = 1080;

export const styles = {};
for (const id of STYLES) {
  // Styles still being written fall back to the sketch so drafts can render.
  const f = path.join(root, 'styles', (existsSync(path.join(root, 'styles', id + '.js')) ? id : 'sketch') + '.js');
  styles[id] = (await import(pathToFileURL(f))).default;
}

const ease = (k) => k * k * (3 - 2 * k);
const clamp01 = (k) => Math.max(0, Math.min(1, k));

// Camera: the opening settles down onto the donut, the ending lifts away from it.
export function zoomAt(t) {
  const beat = t / BEAT;
  if (beat < INTRO) return 0.42 + 0.58 * ease(clamp01(beat / (INTRO - 1)));
  if (beat >= OUTRO_AT) return 1 - 0.58 * ease(clamp01((beat - OUTRO_AT) / 3));
  return 1;
}

export function holeAt(t) {
  const beat = t / BEAT;
  const kick = beat >= INTRO && beat < OUTRO_AT ? Math.exp(-((beat % 1) * 8)) : 0;
  return { cx: W / 2, cy: H / 2, r: HOLE_R * zoomAt(t) * (1 + 0.012 * kick), kick, zoom: zoomAt(t) };
}

export function renderFrame(fi) {
  const t = fi / FPS;
  const st = stepAt(t);
  const hole = holeAt(t);
  const info = {
    p: st.p, since: st.since, zoom: hole.zoom, beat: t / BEAT,
    bitten: t / BEAT >= BITE_BEAT, sinceBite: t - BITE_BEAT * BEAT,
    fadeIn: clamp01(t / 0.6), fadeOut: clamp01((t / BEAT - (BITE_BEAT + 2.5)) / 1.5),
  };
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Inside the hole.
  const rig = makeRider(t, hole);
  const inner = createCanvas(W, H);
  styles[st.inner].drawInner(inner.getContext('2d'), W, H, t, hole, rig, info);
  ctx.save();
  ctx.beginPath();
  ctx.arc(hole.cx, hole.cy, hole.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(inner, 0, 0);
  // Depth at the rim: the hole is a tunnel through something thick.
  const rim = ctx.createRadialGradient(hole.cx, hole.cy, hole.r * 0.8, hole.cx, hole.cy, hole.r);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // The ring, with the hole punched out.
  const ring = createCanvas(W, H);
  const rctx = ring.getContext('2d');
  styles[st.outer].drawRing(rctx, W, H, t, hole, info);
  rctx.setTransform(1, 0, 0, 1, 0, 0);
  rctx.globalAlpha = 1;
  rctx.globalCompositeOperation = 'destination-out';
  rctx.fillStyle = '#000';
  rctx.beginPath();
  rctx.arc(hole.cx, hole.cy, hole.r, 0, Math.PI * 2);
  rctx.fill();
  ctx.drawImage(ring, 0, 0);

  const dark = Math.max(1 - info.fadeIn, info.fadeOut);
  if (dark > 0) {
    ctx.fillStyle = `rgba(6,4,2,${dark})`;
    ctx.fillRect(0, 0, W, H);
  }
  return canvas;
}

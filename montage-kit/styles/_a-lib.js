import { createCanvas } from '@napi-rs/canvas';
import { rng } from '../plates/lib.js';
import { partPath, outlinePts, strandPath, lassoPath, paintDetails } from '../engine/rider.mjs';

export const TAU = Math.PI * 2;
export const mod = (x, n) => ((x % n) + n) % n;
const cache = new Map();

export function cached(key, w, h, draw) {
  const id = `${key}:${w}:${h}`;
  if (!cache.has(id)) {
    const c = createCanvas(w, h);
    draw(c.getContext('2d'));
    cache.set(id, c);
  }
  return cache.get(id);
}

export function ringLayer(ctx, w, h, hole, key, draw) {
  const base = { cx: w / 2, cy: h / 2, r: Math.min(w, h) * 0.36 };
  const c = cached(`ring:${key}`, w, h, b => draw(b, base));
  const scale = hole.r / base.r;
  ctx.save(); ctx.translate(hole.cx, hole.cy); ctx.scale(scale, scale);
  ctx.drawImage(c, -base.cx, -base.cy); ctx.restore();
}

export function paper(ctx, w, h, base = '#eee8d9', seed = 13) {
  const tile = cached(`paper:${base}:${seed}`, 512, 512, b => {
    b.fillStyle = base; b.fillRect(0, 0, 512, 512);
    const r = rng(seed);
    for (let i = 0; i < 23000; i++) {
      b.fillStyle = r() < 0.55 ? `rgba(255,255,245,${r() * 0.3})` : `rgba(62,45,25,${r() * 0.1})`;
      b.fillRect(r() * 512, r() * 512, r() * 1.8 + 0.4, r() * 1.6 + 0.4);
    }
    b.strokeStyle = '#6b5c4520'; b.lineWidth = 0.4;
    for (let i = 0; i < 400; i++) {
      const x = r() * 512, y = r() * 512;
      line(b, [[x, y], [x + r() * 13, y + r() * 3]]);
    }
  });
  ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, w, h);
}

export function line(ctx, pts, closed = false) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  if (closed) ctx.closePath();
  ctx.stroke();
}

export function polygon(ctx, pts, fill, stroke, width = 2) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

export function circle(ctx, x, y, r, fill, stroke, width = 2) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

export function annulus(ctx, hole, outer) {
  ctx.beginPath(); ctx.arc(hole.cx, hole.cy, outer, 0, TAU);
  ctx.arc(hole.cx, hole.cy, hole.r, 0, TAU, true);
}

export function polar(hole, radius, angle) {
  return [hole.cx + Math.cos(angle) * radius, hole.cy + Math.sin(angle) * radius];
}

export function box(p) {
  const xs = p.pts.map(q => q[0]), ys = p.pts.map(q => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export function hatch(ctx, bounds, color, gap = 7, width = 1.5, slope = -0.7, seed = 1) {
  const [x0, y0, x1, y1] = bounds, r = rng(seed);
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath();
  const span = y1 - y0;
  for (let x = x0 - span * Math.abs(slope) - gap; x < x1 + span * Math.abs(slope) + gap; x += gap) {
    ctx.moveTo(x + r() * 2, y0); ctx.lineTo(x + span * slope + r() * 3, y1);
  }
  ctx.stroke();
}

export function outlines(ctx, rig, color, width = 2) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const p of rig.parts) { const o = outlinePts(p); line(ctx, o.pts, o.closed); }
}

export function hairs(ctx, rig, color, scale = 0.5) {
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  for (const st of rig.strands) { ctx.lineWidth = Math.max(0.8, st.w * scale); strandPath(ctx, st); ctx.stroke(); }
  ctx.lineWidth = Math.max(1.6, rig.s * 0.013); lassoPath(ctx, rig); ctx.stroke();
}

export function parts(ctx, rig, colors, stroke = '#30251e', width = 2) {
  for (const p of rig.parts) {
    partPath(ctx, p); ctx.fillStyle = colors(p); ctx.fill();
    if (stroke) { const o = outlinePts(p); ctx.strokeStyle = stroke; ctx.lineWidth = width; line(ctx, o.pts, o.closed); }
  }
  hairs(ctx, rig, stroke || '#30251e');
  paintDetails(ctx, rig, stroke || '#30251e', width * 0.65);
}

export function dust(ctx, rig, t, color, angular = false) {
  const r = rng(121 + Math.floor(t * 12));
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  rig.joints.hoofs.forEach(([x, y], i) => {
    const contact = rig.contacts[i];
    for (let k = 0; k < 13; k++) {
      const d = (0.05 + r() * 0.38) * rig.s * contact;
      const px = x - d, py = y - r() * d * 0.52, size = (1 + r() * 3) * contact;
      if (size < 0.3) continue;
      if (angular) ctx.fillRect(px, py, size * 2, size);
      else circle(ctx, px, py, size, color);
    }
  });
}

export function ground(ctx, w, rig, color, count = 90, seed = 19) {
  const r = rng(seed), S = rig.s;
  ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const x = mod(r() * w * 1.4 - rig.scroll, w * 1.4) - w * 0.2;
    const y = rig.ground - S * 0.02 + Math.pow(r(), 1.4) * S * 0.7;
    ctx.moveTo(x, y); ctx.lineTo(x + S * (0.03 + r() * 0.14), y - r() * 5);
  }
  ctx.stroke();
}

export function hills(ctx, w, rig, color, parallax = 0.25, height = 0.7, seed = 5) {
  const r = rng(seed), S = rig.s, hz = rig.ground - S * 0.7;
  for (let i = 0; i < 12; i++) {
    const x = mod(i * S * 1.9 - rig.scroll * parallax, S * 22.8) - S * 3;
    const mw = S * (1.4 + r()), mh = S * (0.3 + r() * height);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x - mw, hz);
    ctx.bezierCurveTo(x - mw * 0.5, hz - mh * 0.3, x - mw * 0.4, hz - mh, x, hz - mh);
    ctx.bezierCurveTo(x + mw * 0.4, hz - mh, x + mw * 0.6, hz - mh * 0.1, x + mw, hz);
    ctx.fill();
  }
}

import { createCanvas } from '@napi-rs/canvas';
import { rng } from '../plates/lib.js';
import { partPath, strandPath, lassoPath, outlinePts, paintDetails } from '../engine/rider.mjs';

export const TAU = Math.PI * 2;
export const mod = (x, n) => ((x % n) + n) % n;
export function path(c, pts, closed = false) {
  c.beginPath();
  pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  if (closed) c.closePath();
}
export function line(c, pts, color, width = 1, closed = false) {
  path(c, pts, closed); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
export function ellipse(c, x, y, rx, ry, color, rot = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fillStyle = color; c.fill();
}
export function circle(c, x, y, r, color) { ellipse(c, x, y, r, r, color); }
export function arc(c, x, y, r, color, width = 1, a = 0, b = TAU) {
  c.beginPath(); c.arc(x, y, r, a, b); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
export function radial(c, x, y, r0, r1, stops) {
  const g = c.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([p, color]) => g.addColorStop(p, color)); return g;
}
export function bounds(p) {
  const xs = p.pts.map(q => q[0]), ys = p.pts.map(q => q[1]);
  const x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs) - x, h = Math.max(...ys) - y;
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}
export function centerline(p) {
  const n = p.pts.length / 2;
  return p.pts.slice(0, n).map((a, i) => [(a[0] + p.pts[p.pts.length - 1 - i][0]) / 2, (a[1] + p.pts[p.pts.length - 1 - i][1]) / 2]);
}
export function cachedRing(draw) {
  let canvas, key, reference;
  return (c, w, h, t, hole) => {
    const next = [w, h].join(':');
    if (next !== key) {
      // The engine pulses the radius each beat. Overscan keeps the scaled cache covering the frame.
      const pad = Math.ceil(Math.max(w, h) * 0.04);
      reference = { ...hole, cx: hole.cx + pad, cy: hole.cy + pad };
      canvas = createCanvas(w + pad * 2, h + pad * 2);
      draw(canvas.getContext('2d'), canvas.width, canvas.height, reference); key = next;
    }
    c.save(); c.translate(hole.cx, hole.cy); c.scale(hole.r / reference.r, hole.r / reference.r);
    c.drawImage(canvas, -reference.cx, -reference.cy); c.restore();
  };
}
const textures = new Map();
export function tooth(c, w, h, seed = 12, alpha = 0.16) {
  if (!textures.has(seed)) {
    const tile = createCanvas(256, 256), q = tile.getContext('2d'), r = rng(seed);
    for (let i = 0; i < 15000; i++) {
      q.fillStyle = r() < 0.5 ? '#fff' : '#342a23'; q.globalAlpha = r() * 0.5;
      q.fillRect(r() * 256, r() * 256, 0.6 + r() * 1.7, 0.6 + r() * 1.5);
    }
    textures.set(seed, tile);
  }
  c.save(); c.globalAlpha = alpha; c.fillStyle = c.createPattern(textures.get(seed), 'repeat');
  c.fillRect(0, 0, w, h); c.restore();
}
export function rider(c, rig, fill, stroke, width = 2, surface) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  for (const p of rig.parts) {
    const box = bounds(p);
    partPath(c, p); c.fillStyle = fill(p, box); c.fill();
    if (surface) { c.save(); c.clip(); surface(c, p, box); c.restore(); }
    const o = outlinePts(p); line(c, o.pts, stroke, width, o.closed);
  }
  paintDetails(c, rig, stroke, width * 0.65);
  for (const st of rig.strands) { strandPath(c, st); c.lineWidth = Math.max(width * 0.5, st.w * 0.55); c.strokeStyle = stroke; c.stroke(); }
  lassoPath(c, rig); c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); c.restore();
}
export function prairie(c, w, h, hole, rig, pal) {
  const { cx, r } = hole, S = rig.s, hz = rig.ground - S * 0.72;
  c.fillStyle = pal.sky; c.fillRect(0, 0, w, h);
  for (let layer = 0; layer < 2; layer++) {
    const rnd = rng(71 + layer), base = hz + layer * S * 0.07;
    c.fillStyle = layer ? pal.hill : pal.far; c.fillRect(0, base, w, h - base);
    for (let i = 0; i < 14; i++) {
      const x = cx - r - S * 1.2 + mod(i * S * 0.9 - rig.scroll * (0.16 + layer * 0.13), S * 0.9 * 14);
      const yy = base - S * (0.04 + rnd() * (0.3 - layer * 0.06));
      path(c, [[x, base], [x + S * 0.18, yy], [x + S * 0.6, yy], [x + S * 0.82, base]], true); c.fill();
    }
  }
  c.fillStyle = pal.ground; c.fillRect(0, hz + S * 0.12, w, h);
  const rnd = rng(32);
  for (let i = 0; i < 150; i++) {
    const x = cx - r - 100 + mod(rnd() * (r * 2 + 200) - rig.scroll * (0.75 + i % 3 * 0.2), r * 2 + 200);
    const y = hz + S * 0.2 + rnd() * (h - hz);
    const size = 2 + (y - hz) * 0.05;
    line(c, [[x - size * 1.5, y], [x, y], [x - size * 0.3, y - size], [x, y], [x + size * 0.6, y - size * 0.7]], pal.grass, 1.5);
  }
  dust(c, rig, pal.dust);
}
export function dust(c, rig, color) {
  const S = rig.s;
  rig.joints.hoofs.forEach(([x, y], j) => {
    const contact = rig.contacts[j];
    if (contact <= 0) return;
    for (let k = 0; k < 7; k++) {
      const rr = S * (0.018 + k * 0.007) * contact;
      ellipse(c, x - S * (0.04 + k * 0.055), y - S * 0.018 - k * S * 0.017, rr * 1.8, rr, color);
    }
  });
}

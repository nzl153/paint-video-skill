import { rng } from '../plates/lib.js';
import { outlinePts } from '../engine/rider.mjs';
import { TAU, cachedRing, circle, ellipse, line, path, rider, prairie, tooth, mod } from './_craft12.mjs';

function wax(c, pts, color, width, random, closed = false) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  line(c, pts, color, width, closed);
  c.globalAlpha = 0.38;
  for (let i = 0; i < 5; i++) {
    const dx = (random() - 0.5) * width * 0.9, dy = (random() - 0.5) * width * 0.9;
    line(c, pts.map(([x, y]) => [x + dx + (random() - 0.5) * 2, y + dy + (random() - 0.5) * 2]), color, 0.7 + width * 0.12, closed);
  }
  c.restore();
}
function waxFill(c, w, h, random) {
  c.save(); c.strokeStyle = 'rgba(255,247,212,0.25)'; c.lineWidth = 0.8;
  c.beginPath();
  for (let i = 0; i < 16000; i++) {
    const x = random() * w, y = random() * h;
    c.moveTo(x, y); c.lineTo(x + 2 + random() * 7, y - random() * 2);
  }
  c.stroke(); c.restore(); tooth(c, w, h, 201, 0.48);
}
const drawRing = cachedRing((c, w, h, hole) => {
  const { cx, cy, r } = hole, random = rng(200);
  c.fillStyle = '#fff0be'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU, b = a + 0.08;
    path(c, [[cx + Math.cos(a - 0.07) * r * 1.9, cy + Math.sin(a - 0.07) * r * 1.9], [cx + Math.cos(b) * r * 3.4, cy + Math.sin(b) * r * 3.4], [cx + Math.cos(a + 0.11) * r * 1.9, cy + Math.sin(a + 0.11) * r * 1.9]], true);
    c.fillStyle = i % 2 ? '#f2a32c' : '#e77b2c'; c.fill();
  }
  const pts = Array.from({ length: 130 }, (_, i) => { const a = i / 130 * TAU, rr = r * (2.12 + (random() - 0.5) * 0.055); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
  path(c, pts, true); c.fillStyle = '#f4c53b'; c.fill(); wax(c, pts, '#e8a32e', 14, random, true);
  // The face sits around the central opening, keeping both eyes and its smile visible.
  for (const side of [-1, 1]) {
    const x = cx + side * r * 0.99, y = cy - r * 0.7;
    wax(c, [[x - 14, y + 15], [x, y - 28], [x + 13, y + 12]], '#765239', 13, random);
    ellipse(c, x + side * 45, cy + r * 0.12, r * 0.2, r * 0.12, '#e79a47');
  }
  const smile = Array.from({ length: 42 }, (_, i) => { const a = 0.26 + i / 41 * 2.6; return [cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.08 + r * 0.15]; });
  wax(c, smile, '#a1642c', 14, random);
  waxFill(c, w, h, random);
});
export default {
  id: 'crayon', ringName: 'child drawn smiling sun', drawRing,
  drawInner(c, w, h, t, hole, rig) {
    const random = rng(205 + Math.floor(t * 12)), S = rig.s;
    prairie(c, w, h, hole, rig, { sky: '#eee9cb', far: '#94bcb4', hill: '#a6b776', ground: '#e4d69a', grass: '#698646', dust: '#c9a878' });
    c.save(); c.globalAlpha = 0.11;
    for (let k = 0; k < 35; k++) {
      const y = hole.cy - hole.r + k * 9;
      const strokes = Array.from({ length: 12 }, (_, j) => [hole.cx - hole.r + j / 11 * hole.r * 2, y + (random() - 0.5) * 9]);
      wax(c, strokes, k % 2 ? '#77a4b3' : '#b5c7b4', 6, random);
    }
    c.restore();
    const sx = hole.cx - hole.r * 0.6, sy = hole.cy - hole.r * 0.62;
    circle(c, sx, sy, S * 0.17, '#e9bd43');
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * TAU; wax(c, [[sx + Math.cos(a) * S * 0.2, sy + Math.sin(a) * S * 0.2], [sx + Math.cos(a) * S * 0.29, sy + Math.sin(a) * S * 0.29]], '#e5b245', 4, random);
    }
    for (let i = 0; i < 5; i++) {
      const x = hole.cx - hole.r - 150 + mod(i * 310 - rig.scroll * 0.2, 1700), y = hole.cy - hole.r * (0.63 + i % 2 * 0.14);
      const cloud = [[x, y + 13], [x - 12, y], [x, y - 8], [x + 18, y - 2], [x + 26, y - 19], [x + 45, y - 15], [x + 53, y], [x + 72, y + 6], [x + 60, y + 16], [x, y + 13]];
      wax(c, cloud, '#8eafb5', 4, random);
    }
    rider(c, rig, p => p.group === 'horse' ? p.tone < 0.4 ? '#805d43' : '#b88048' : p.group === 'tack' ? '#cf683a' : p.name === 'riderHead' ? '#d7a66b' : p.name === 'bandana' ? '#ba5140' : '#658c9c', '#60462e', 2.5, (q, p, b) => {
      q.save(); q.strokeStyle = p.group === 'horse' ? '#ecc27e' : '#c0d0b4'; q.globalAlpha = 0.57; q.lineWidth = 2.4;
      q.beginPath();
      for (let y = b.y - 20; y < b.y + b.h + 30; y += 4.5) {
        q.moveTo(b.x - 20, y + (random() - 0.5) * 6); q.lineTo(b.x + b.w + 20, y - 20 + random() * 4);
      }
      q.stroke(); q.restore();
      q.save(); q.beginPath();
      const scratches = Math.min(1000, Math.ceil(b.w * b.h / 26));
      for (let k = 0; k < scratches; k++) {
        const x = b.x + random() * b.w, y = b.y + random() * b.h;
        q.moveTo(x, y); q.lineTo(x + 1 + random() * 4, y - 1);
      }
      q.strokeStyle = '#f4eacb'; q.lineWidth = 0.85; q.globalAlpha = 0.75; q.stroke(); q.restore();
    });
    for (const p of rig.parts) {
      if (p.name.includes('Hoof') || p.name.includes('ear')) continue;
      const o = outlinePts(p); wax(c, o.pts, '#715136', 1.5, random, o.closed);
    }
    waxFill(c, w, h, random);
  },
};

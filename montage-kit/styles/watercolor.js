import { rng } from '../plates/lib.js';
import { partPath, outlinePts, paintDetails } from '../engine/rider.mjs';
import { TAU, ringLayer, paper, circle, polygon, polar, line, box, hairs, dust, ground, mod } from './_a-lib.js';

const PAPER = '#f0ece0';
function puddle(ctx, x, y, rx, ry, angle, color, seed) {
  const r = rng(seed), pts = [];
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * TAU, rr = 0.7 + r() * 0.3;
    const dx = Math.cos(a) * rx * rr, dy = Math.sin(a) * ry * rr;
    pts.push([x + dx * Math.cos(angle) - dy * Math.sin(angle), y + dx * Math.sin(angle) + dy * Math.cos(angle)]);
  }
  wash(ctx, pts, color, seed, 0.17, 4);
}
function wash(ctx, pts, color, seed, opacity = 0.2, passes = 5) {
  const r = rng(seed);
  ctx.save(); ctx.fillStyle = color;
  for (let k = 0; k < passes; k++) {
    ctx.globalAlpha = opacity / passes;
    ctx.beginPath();
    const p = pts.map(([x, y]) => [x + (r() - 0.5) * 6, y + (r() - 0.5) * 6]);
    ctx.moveTo((p[0][0] + p.at(-1)[0]) / 2, (p[0][1] + p.at(-1)[1]) / 2);
    p.forEach(([x, y], i) => { const next = p[(i + 1) % p.length]; ctx.quadraticCurveTo(x, y, (x + next[0]) / 2, (y + next[1]) / 2); });
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function petal(ctx, hole, a, start, length, width, color, seed) {
  const random = rng(seed), pts = [];
  for (let i = 0; i <= 30; i++) {
    const u = i / 30, rr = start + length * u, lateral = Math.sin(u * Math.PI) ** 0.7 * width;
    const curve = Math.sin(u * Math.PI * 0.8) * width * 0.5;
    pts.push([hole.cx + Math.cos(a) * rr - Math.sin(a) * (lateral + curve), hole.cy + Math.sin(a) * rr + Math.cos(a) * (lateral + curve)]);
  }
  for (let i = 30; i >= 0; i--) {
    const u = i / 30, rr = start + length * u, lateral = Math.sin(u * Math.PI) ** 0.7 * width * 0.85;
    const curve = Math.sin(u * Math.PI * 0.8) * width * 0.5;
    pts.push([hole.cx + Math.cos(a) * rr + Math.sin(a) * (lateral - curve), hole.cy + Math.sin(a) * rr - Math.cos(a) * (lateral - curve)]);
  }
  wash(ctx, pts, color, seed, 1.5, 6);
  ctx.strokeStyle = '#ca74184a'; ctx.lineWidth = 3.5; line(ctx, pts, true);
  ctx.save(); ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.clip();
  for (let j = 0; j < 9; j++) {
    const p = polar(hole, start + length * random(), a + (random() - 0.5) * 0.07);
    puddle(ctx, p[0], p[1], width * (0.3 + random() * 0.7), length * 0.18, a - Math.PI / 2, j % 3 ? '#e9790d' : '#fff5c4', seed + j * 11);
  }
  ctx.restore();
  ctx.strokeStyle = '#a862163d'; ctx.lineWidth = 2.5; line(ctx, pts.slice(4, 26)); line(ctx, pts.slice(37, 54));
  for (let j = 0; j < 2; j++) {
    const rad0 = start + length * 0.1, rad1 = start + length * (0.6 + random() * 0.25), aa = a + (j - 1.5) * 0.013;
    ctx.strokeStyle = '#b5732545'; ctx.lineWidth = 1.2 + random(); line(ctx, [polar(hole, rad0, aa), polar(hole, rad1, aa)]);
  }
}
export default {
  id: 'watercolor', ringName: '水彩向日葵',
  drawRing(ctx, w, h, t, hole) {
    ringLayer(ctx, w, h, hole, 'watercolor', (b, hole) => {
      paper(b, w, h, PAPER, 28);
      const { cx, cy, r } = hole, random = rng(138), R = Math.hypot(w / 2, h / 2) + 90;
      for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 19; i++) {
        const a = (i + layer * 0.48) / 19 * TAU + (random() - 0.5) * 0.06;
        petal(b, hole, a, r + 65, (R - r + random() * 110) * (layer ? 0.77 : 1.05), 100 + random() * 65, layer ? '#f5c329' : '#eaaa13', 300 + i + layer * 40);
      }
      const disk = Array.from({ length: 200 }, (_, i) => {
        const a = i / 200 * TAU; return polar(hole, r + 113 + Math.sin(a * 15) * 7 + random() * 4, a);
      });
      wash(b, disk, '#50331f', 148, 3.2, 6);
      for (let i = 0; i < 3300; i++) {
        const a = random() * TAU, rr = Math.sqrt(r * r + random() * ((r + 107) ** 2 - r * r));
        const [x, y] = polar(hole, rr, a);
        b.save(); b.translate(x, y); b.rotate(a + 0.8); b.fillStyle = ['#2f251b99', '#bb8e427a', '#dfb96085', '#76532d90'][i % 4];
        b.beginPath(); b.ellipse(0, 0, 2 + random() * 2, 2.8 + random() * 2, 0, 0, TAU); b.fill(); b.restore();
      }
      circle(b, cx, cy, r + 2, null, '#5c4b2b80', 5);
      b.save(); b.globalAlpha = 0.035; paper(b, w, h, PAPER, 28); b.restore();
    });
  },
  drawInner(ctx, w, h, t, hole, rig) {
    paper(ctx, w, h, PAPER, 28);
    const S = rig.s, hz = rig.ground - S * 0.68, random = rng(61 + Math.floor(t * 12));
    wash(ctx, [[0, 0], [w, 0], [w, hz - S * 0.1], [hole.cx, hz], [0, hz - S * 0.1]], '#549aaf', 7, 0.72);
    for (let i = 0; i < 12; i++) {
      const x = mod(i * S * 1.8 - rig.scroll * 0.22, S * 21.6) - S * 3;
      const pts = [[x - S, hz], [x - S * 0.45, hz - S * 0.25], [x, hz - S * (0.4 + random() * 0.25)], [x + S * 0.6, hz - S * 0.15], [x + S, hz]];
      wash(ctx, pts, i % 2 ? '#4e7d79' : '#92a586', 10 + i, 0.34);
    }
    wash(ctx, [[0, hz], [hole.cx - S, hz - 10], [w, hz + 5], [w, h], [0, h]], '#b7b177', 27, 0.5);
    ground(ctx, w, rig, '#77825975', 160); dust(ctx, rig, t, '#bbae6750');
    for (const p of rig.parts) {
      const color = p.group === 'horse' ? p.tone < 0.3 ? '#824c3a' : '#bc682f' : p.group === 'rider' ? /Head/.test(p.name) ? '#c58a5b' : '#24798e' : '#ba8932';
      wash(ctx, p.pts, color, 38 + p.pts.length, 1.75, 5);
      ctx.save(); partPath(ctx, p); ctx.clip();
      const [x0, y0, x1, y1] = box(p);
      const pool = ctx.createLinearGradient(x0, y0, x1, y1);
      pool.addColorStop(0, '#fff5d6a0'); pool.addColorStop(0.3, '#ffe3a740'); pool.addColorStop(0.6, '#ffffff00'); pool.addColorStop(1, p.group === 'horse' ? '#573c63b0' : '#1d466da0');
      ctx.fillStyle = pool; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      for (let j = 0; j < 13; j++) {
        const x = x0 + random() * (x1 - x0), y = y0 + random() * (y1 - y0);
        puddle(ctx, x, y, 7 + random() * 24, 4 + random() * 14, -0.6, j % 3 ? color : '#4a4e7c', j + p.pts.length);
      }
      ctx.fillStyle = '#f4f0df80';
      for (let j = 0; j < 120; j++) ctx.fillRect(x0 + random() * (x1 - x0), y0 + random() * (y1 - y0), 1 + random() * 1.5, 1);
      ctx.restore();
      const o = outlinePts(p); ctx.strokeStyle = p.group === 'horse' ? '#7a3f3480' : '#1d5a7280'; ctx.lineWidth = 2.4; line(ctx, o.pts, o.closed);
      ctx.save(); partPath(ctx, p); ctx.clip();
      ctx.strokeStyle = color + '70'; ctx.lineWidth = 5; line(ctx, o.pts, o.closed); ctx.restore();
    }
    hairs(ctx, rig, '#4c5348a0', 0.45); paintDetails(ctx, rig, '#525d4e80', 1.5);
    ctx.save(); ctx.globalAlpha = 0.025; paper(ctx, w, h, PAPER, 28); ctx.restore();
  },
};

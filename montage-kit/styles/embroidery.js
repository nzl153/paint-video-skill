import { createCanvas } from '@napi-rs/canvas';
import { rng } from '../plates/lib.js';
import { partPath, paintDetails } from '../engine/rider.mjs';
import { TAU, cached, ringLayer, circle, polygon, line, parts, dust, ground, hills, polar, mod } from './_a-lib.js';

const COLORS = ['#ddd7bc', '#b8c8be', '#8da699', '#58775a', '#38543e', '#c8b675', '#9e5438', '#6c3f2d', '#c78150', '#315c68', '#d7bc8b', '#eee6c6'];
const RGB = COLORS.map(s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)));
const STEP = 9;
function fabric(ctx, w, h) {
  const tile = cached('aida-cloth', 36, 36, b => {
    b.fillStyle = '#dcd1af'; b.fillRect(0, 0, 36, 36);
    for (let x = 0; x < 36; x += 3) {
      b.fillStyle = x % 9 === 0 ? '#a2957745' : '#faf4d675'; b.fillRect(x, 0, 1, 36); b.fillRect(0, x, 36, 1);
    }
    for (let x = 0; x < 36; x += 9) for (let y = 0; y < 36; y += 9) {
      b.fillStyle = '#6b644c65'; b.fillRect(x, y, 1.5, 1.5);
    }
  });
  ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, w, h);
}
function stitches(ctx, image, w, h) {
  const data = image.getContext('2d').getImageData(0, 0, image.width, image.height).data;
  const atlas = COLORS.map((color, k) => cached(`thread:${k}`, STEP, STEP, b => {
    b.lineCap = 'round'; b.strokeStyle = '#54493465'; b.lineWidth = 3;
    line(b, [[1.5, 2.5], [7.5, 8.5]]); line(b, [[1.5, 8.5], [7.5, 2.5]]);
    b.strokeStyle = color; b.lineWidth = 3.5; line(b, [[1, 1], [7, 7]]); line(b, [[1, 7], [7, 1]]);
    b.strokeStyle = '#fff5cf60'; b.lineWidth = 0.5; line(b, [[1.3, 0.7], [7.3, 6.7]]); line(b, [[0.7, 6.7], [6.7, 0.7]]);
  }));
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const i = (y * image.width + x) * 4;
    if (data[i + 3] < 120) continue;
    let best = 0, distance = Infinity;
    for (let k = 0; k < COLORS.length; k++) {
      const q = RGB[k], d = (data[i] - q[0]) ** 2 + (data[i + 1] - q[1]) ** 2 + (data[i + 2] - q[2]) ** 2;
      if (d < distance) { best = k; distance = d; }
    }
    ctx.drawImage(atlas[best], x * STEP, y * STEP);
  }
}
function source(w, h) {
  const c = createCanvas(Math.ceil(w / STEP), Math.ceil(h / STEP));
  c.getContext('2d').scale(1 / STEP, 1 / STEP); return c;
}
function timber(ctx, hole, inner, outer) {
  const { cx, cy } = hole;
  const g = ctx.createLinearGradient(cx - outer, cy - outer, cx + outer, cy + outer);
  g.addColorStop(0, '#d5ae74'); g.addColorStop(0.35, '#b17e45'); g.addColorStop(0.6, '#d5ae74'); g.addColorStop(1, '#7e4c25');
  ctx.beginPath(); ctx.arc(cx, cy, outer, 0, TAU); ctx.arc(cx, cy, inner, 0, TAU, true); ctx.fillStyle = g; ctx.fill('evenodd');
  const random = rng(81);
  for (let rr = inner + 3; rr < outer; rr += 2.5) {
    ctx.strokeStyle = random() < 0.5 ? '#f6d59950' : '#74432550'; ctx.lineWidth = 0.6 + random();
    ctx.beginPath(); ctx.arc(cx + random() * 2, cy, rr, 0, TAU); ctx.stroke();
  }
  circle(ctx, cx, cy, inner + 1, null, '#503a28', 3); circle(ctx, cx, cy, outer - 2, null, '#e5c98e', 3);
}
export default {
  id: 'embroidery', ringName: '木绣绷与花卉针脚',
  drawRing(ctx, w, h, t, hole) {
    ringLayer(ctx, w, h, hole, 'embroidery', (b, hole) => {
      fabric(b, w, h);
      const { cx, cy, r } = hole, R = Math.hypot(w / 2, h / 2) + 35;
      const c = source(w, h), q = c.getContext('2d');
      q.strokeStyle = COLORS[3]; q.lineWidth = 12; q.beginPath(); q.arc(cx, cy, (r + R) / 2, 0, TAU); q.stroke();
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * TAU, rr = (r + R) / 2;
        const [x, y] = polar(hole, rr, a);
        for (const sign of [-1, 1]) {
          const p = polar(hole, rr + sign * 90, a - 0.065);
          q.save(); q.translate(p[0], p[1]); q.rotate(a + sign * 0.5); q.fillStyle = COLORS[3];
          q.beginPath(); q.ellipse(0, 0, 80, 27, 0, 0, TAU); q.fill(); q.restore();
          q.strokeStyle = COLORS[4]; q.lineWidth = 5; line(q, [[x, y], p]);
        }
        for (let j = 0; j < 8; j++) {
          const aa = j / 8 * TAU; q.fillStyle = COLORS[i % 2 ? 6 : 9]; q.beginPath(); q.ellipse(x + Math.cos(aa) * 41, y + Math.sin(aa) * 41, 34, 21, aa, 0, TAU); q.fill();
        }
        circle(q, x, y, 22, COLORS[5]); circle(q, x - 5, y - 4, 7, COLORS[11]);
      }
      for (let i = 0; i < 34; i++) for (const rr of [r + 155, R - 115]) {
        const [x, y] = polar(hole, rr, i / 34 * TAU);
        q.fillStyle = COLORS[9]; q.fillRect(x - 5, y - 17, 10, 34); q.fillRect(x - 17, y - 5, 34, 10);
        circle(q, x, y, 6, COLORS[5]);
      }
      stitches(b, c, w, h);
      timber(b, hole, r, r + 36); timber(b, hole, r + 39, r + 65);
      timber(b, hole, R - 65, R - 31); timber(b, hole, R - 28, R);
      // Clamp and slotted screw of the outer hoop, visible at the lower right edge.
      b.save(); b.translate(w - 40, h - 40); b.rotate(-0.65);
      b.fillStyle = '#94733c'; b.fillRect(-75, -50, 28, 95); b.fillRect(45, -50, 28, 95);
      b.fillStyle = '#b2b2a1'; b.fillRect(-63, -12, 125, 19);
      b.strokeStyle = '#565e58'; b.lineWidth = 2;
      for (let x = -50; x < 50; x += 6) line(b, [[x, -12], [x - 4, 7]]);
      circle(b, 61, -3, 23, '#c0b487', '#675b3d', 3); b.strokeStyle = '#65583f'; b.lineWidth = 4; line(b, [[49, -10], [73, 4]]); b.restore();
    });
  },
  drawInner(ctx, w, h, t, hole, rig) {
    fabric(ctx, w, h);
    const c = source(w, h), b = c.getContext('2d'), S = rig.s, hz = rig.ground - S * 0.7;
    b.fillStyle = COLORS[1]; b.fillRect(0, 0, w, hz);
    hills(b, w, rig, COLORS[2], 0.2, 0.85, 19); hills(b, w, rig, COLORS[3], 0.34, 0.45, 4);
    b.fillStyle = COLORS[5]; b.fillRect(0, hz, w, h - hz);
    ground(b, w, rig, COLORS[3], 150); dust(b, rig, t, COLORS[11], true);
    parts(b, rig, p => p.group === 'horse' ? (p.tone < 0.3 ? COLORS[7] : COLORS[6]) : p.group === 'rider' ? /Head/.test(p.name) ? COLORS[10] : COLORS[9] : COLORS[8], COLORS[7], 4.5);
    paintDetails(b, rig, COLORS[10], 4);
    stitches(ctx, c, w, h);
  },
};

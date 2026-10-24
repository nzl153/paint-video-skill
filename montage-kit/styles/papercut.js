import { rng } from '../plates/lib.js';
import { TAU, cachedRing, circle, arc, line, path, rider, prairie, tooth } from './_craft12.mjs';

const RED = '#b52225', PAPER = '#f5dfb5';
function leaf(c, x, y, length, width, angle, color) {
  c.save(); c.translate(x, y); c.rotate(angle); c.beginPath(); c.moveTo(0, 0);
  c.bezierCurveTo(length * 0.27, -width, length * 0.81, -width * 0.7, length, 0);
  c.bezierCurveTo(length * 0.78, width * 0.65, length * 0.25, width, 0, 0);
  c.fillStyle = color; c.fill(); c.restore();
}
function flower(c, x, y, size, color) {
  for (let j = 0; j < 6; j++) leaf(c, x, y, size, size * 0.32, j / 6 * TAU, color);
  circle(c, x, y, size * 0.2, RED);
}
const drawRing = cachedRing((c, w, h, hole) => {
  const { cx, cy, r } = hole;
  c.fillStyle = PAPER; c.fillRect(0, 0, w, h);
  circle(c, cx + 8, cy + 13, r * 3.12, 'rgba(73,22,12,0.25)');
  circle(c, cx, cy, r * 3.12, RED);
  arc(c, cx, cy, r * 1.06, '#f1cda0', 7);
  arc(c, cx, cy, r * 1.72, PAPER, 12);
  arc(c, cx, cy, r * 2.75, PAPER, 13);
  for (let i = 0; i < 24; i++) {
    c.save(); c.translate(cx, cy); c.rotate(i / 24 * TAU);
    leaf(c, r * 1.16, 0, r * 0.45, r * 0.12, 0, PAPER);
    leaf(c, r * 1.22, -r * 0.04, r * 0.26, r * 0.06, -0.75, PAPER);
    leaf(c, r * 1.22, r * 0.04, r * 0.26, r * 0.06, 0.75, PAPER);
    flower(c, r * 2.22, 0, r * 0.28, PAPER);
    leaf(c, r * 1.82, 0, r * 0.25, r * 0.07, 0.55, PAPER);
    leaf(c, r * 2.45, 0, r * 0.23, r * 0.07, -0.55, PAPER);
    leaf(c, r * 2.88, 0, r * 0.16, r * 0.08, 0, PAPER);
    c.restore();
  }
  for (let i = 0; i < 100; i++) {
    const a = i / 100 * TAU; circle(c, cx + Math.cos(a) * r * 1.8, cy + Math.sin(a) * r * 1.8, 4, PAPER);
  }
  arc(c, cx, cy, r + 3, '#7e151b', 6); tooth(c, w, h, 161, 0.17);
});
export default {
  id: 'papercut', ringName: 'red paper window rosette', drawRing,
  drawInner(c, w, h, t, hole, rig) {
    prairie(c, w, h, hole, rig, { sky: PAPER, far: '#db8e69', hill: '#c34e3e', ground: PAPER, grass: '#bc3830', dust: '#dc9b76' });
    const S = rig.s, rand = rng(21);
    for (let i = 0; i < 12; i++) {
      const x = hole.cx - hole.r + ((i * 180 - rig.scroll * 0.2) % 2400 + 2400) % 2400 - 300;
      const y = rig.ground - S * (0.65 + rand() * 0.14);
      leaf(c, x, y, S * 0.32, S * 0.07, 0, PAPER);
      leaf(c, x + S * 0.18, y, S * 0.23, S * 0.05, -0.8, PAPER);
    }
    c.save(); c.translate(3, 5);
    rider(c, rig, () => 'rgba(85,25,15,0.15)', 'rgba(85,25,15,0.15)', 1); c.restore();
    rider(c, rig, p => p.tone < 0.35 ? '#8e1720' : RED, RED, 2.4, (q, p, b) => {
      if (p.name === 'body') {
        flower(q, b.x + b.w * 0.33, b.y + b.h * 0.7, S * 0.19, PAPER);
        for (let k = 0; k < 6; k++) leaf(q, b.cx + k * S * 0.08, b.y + b.h * 0.73, S * 0.13, S * 0.024, -1.1, PAPER);
      } else if (p.name === 'torso') {
        for (let k = 0; k < 5; k++) leaf(q, b.x + b.w * 0.3 + k * 8, b.y + b.h * 0.8 - k * 10, S * 0.1, S * 0.017, -0.8, PAPER);
      } else if (p.name === 'head') {
        leaf(q, b.cx - 3, b.y + b.h * 0.25, S * 0.17, S * 0.02, 1.2, PAPER);
      }
    });
    for (const d of rig.details) line(c, d.pts, PAPER, 1.8 * d.weight, d.closed);
    for (let i = 0; i < 14; i++) {
      const x = hole.cx - hole.r - 50 + ((i * 103 - rig.scroll) % 1100 + 1100) % 1100;
      const y = rig.ground + S * (0.15 + (i % 3) * 0.1);
      line(c, [[x, y], [x + 10, y - 22], [x + 6, y - 6], [x + 25, y - 18]], RED, 3);
      leaf(c, x + 12, y - 10, 20, 7, -0.7, RED);
    }
    tooth(c, w, h, 161, 0.15);
  },
};

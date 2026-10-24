import { TAU, cachedRing, radial, circle, arc, line, ellipse, path, rider, prairie, tooth, mod } from './_craft12.mjs';

const BLUE = '#244b88';
function leaf(c, x, y, a, size, color) {
  c.save(); c.translate(x, y); c.rotate(a);
  c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(size * 0.3, -size * 0.4, size * 0.8, -size * 0.35, size, 0); c.bezierCurveTo(size * 0.5, size * 0.38, size * 0.2, size * 0.2, 0, 0);
  c.fillStyle = color; c.fill(); line(c, [[size * 0.1, 0], [size * 0.83, -size * 0.02]], '#91acc4', 1); c.restore();
}
function bloom(c, x, y, size) {
  for (let layer = 2; layer >= 0; layer--) {
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * TAU + layer * 0.6;
      ellipse(c, x + Math.cos(a) * size * (0.19 + layer * 0.2), y + Math.sin(a) * size * (0.19 + layer * 0.2), size * (0.25 + layer * 0.05), size * 0.19, ['#2b538f', '#587cab', '#779bbd'][layer], a);
      line(c, [[x + Math.cos(a) * size * 0.2, y + Math.sin(a) * size * 0.2], [x + Math.cos(a) * size * (0.4 + layer * 0.26), y + Math.sin(a) * size * (0.4 + layer * 0.26)]], '#e0e7de', 1.3);
    }
  }
  circle(c, x, y, size * 0.13, '#183e7b');
}
const drawRing = cachedRing((c, w, h, hole) => {
  const { cx, cy, r } = hole;
  c.fillStyle = '#cad7d0'; c.fillRect(0, 0, w, h);
  circle(c, cx, cy, r * 3.3, radial(c, cx - r * 0.6, cy - r * 0.7, r * 0.1, r * 4.1, [[0, '#fcf9e9'], [0.4, '#e4eade'], [0.72, '#b6c7c4'], [1, '#7f9caa']]));
  for (const rr of [1.015, 1.055, 1.12, 1.21, 1.97, 2.04, 2.8, 2.86, 3.04]) arc(c, cx, cy, r * rr, BLUE, rr < 1.1 ? 5 : 3);
  for (let band = 0; band < 2; band++) {
    const rad = r * (1.6 + band * 0.84), n = band ? 22 : 16;
    const vine = [];
    for (let j = 0; j <= 500; j++) {
      const a = j / 500 * TAU, rr = rad + Math.sin(a * n) * r * 0.14;
      vine.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    line(c, vine, '#4b70a0', 4);
    for (let j = 0; j < n; j++) {
      const a = j / n * TAU, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      bloom(c, x, y, r * (band ? 0.19 : 0.17));
      for (let k = 0; k < 3; k++) {
        const b = a + (k - 1) * 0.08;
        leaf(c, cx + Math.cos(b) * (rad + r * 0.14), cy + Math.sin(b) * (rad + r * 0.14), a + 0.5 + k * 0.8, r * 0.18, k % 2 ? '#2c548a' : '#557da9');
      }
    }
  }
  for (let i = 0; i < 80; i++) {
    const a = i / 80 * TAU;
    c.save(); c.translate(cx, cy); c.rotate(a); path(c, [[r * 1.13, -7], [r * 1.19, 0], [r * 1.13, 7]], true); c.fillStyle = '#355d96'; c.fill(); c.restore();
  }
  c.save(); c.globalAlpha = 0.3; arc(c, cx - 3, cy - 3, r * 1.08, '#fffef0', 8, 3.6, 5.2); c.restore();
  tooth(c, w, h, 211, 0.045);
});
export default {
  id: 'porcelain', ringName: 'blue and white porcelain bowl rim', drawRing,
  drawInner(c, w, h, t, hole, rig) {
    const S = rig.s;
    prairie(c, w, h, hole, rig, { sky: '#eef0e4', far: '#a5bbcc', hill: '#7897b6', ground: '#e3e8da', grass: '#829fba', dust: '#b7c7ce' });
    rider(c, rig, (p, b) => {
      const g = c.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
      g.addColorStop(0, p.group === 'horse' ? '#b8ccdb' : '#e4e7db');
      g.addColorStop(0.45, p.group === 'tack' ? '#375c93' : '#6489b2');
      g.addColorStop(1, p.tone < 0.4 ? '#193e78' : '#355f99'); return g;
    }, '#254d86', 1.7, (q, p, b) => {
      if (p.name === 'body') {
        bloom(q, b.x + b.w * 0.28, b.y + b.h * 0.7, S * 0.17);
        const pts = [];
        for (let k = 0; k < 60; k++) pts.push([b.x + k / 59 * b.w, b.y + b.h * 0.79 + Math.sin(k / 59 * 13) * S * 0.08]);
        line(q, pts, '#d8e2da', 2.3);
        for (let k = 0; k < 8; k++) leaf(q, b.x + k * b.w / 9, b.y + b.h * 0.77, -0.7, S * 0.09, '#dce5db');
      } else if (p.name === 'torso') bloom(q, b.cx, b.cy, S * 0.105);
      else if (p.name === 'saddleBlanket') {
        for (let x = b.x; x < b.x + b.w; x += 7) line(q, [[x, b.y], [x + 8, b.y + b.h]], '#dce3d8', 1.4);
      }
    });
    for (let i = 0; i < 8; i++) {
      const x = hole.cx - hole.r - 50 + mod(i * 180 - rig.scroll * 0.18, 1440);
      c.beginPath(); c.arc(x, hole.cy - hole.r * 0.6, 20, 0, Math.PI * 1.65); c.strokeStyle = '#9bb4c7'; c.lineWidth = 2; c.stroke();
    }
    c.save(); c.globalAlpha = 0.16; ellipse(c, hole.cx - hole.r * 0.53, hole.cy - hole.r * 0.5, hole.r * 0.1, hole.r * 0.32, '#fffef0', 0.65); c.restore();
    tooth(c, w, h, 211, 0.06);
  },
};

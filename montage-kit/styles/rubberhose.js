import { rng } from '../plates/lib.js';
import { TAU, cachedRing, radial, circle, arc, ellipse, line, path, bounds, centerline, rider, prairie, tooth, mod } from './_craft12.mjs';

const INK = '#252522', WHITE = '#e5e3d9';
const reel = cachedRing((c, w, h, hole) => {
  const { cx, cy, r } = hole;
  c.fillStyle = '#242522'; c.fillRect(0, 0, w, h);
  circle(c, cx + 20, cy + 28, r * 2.62, radial(c, cx + 20, cy + 28, r * 2.3, r * 2.62, [[0, '#080a08b0'], [1, '#080a0800']]));
  circle(c, cx, cy, r * 2.48, radial(c, cx - r * 0.8, cy - r, 0, r * 3.9, [[0, '#eeeadd'], [0.32, '#c9c8bb'], [0.7, '#83877f'], [1, '#363e38']]));
  for (let i = 0; i < 200; i++) arc(c, cx, cy, r * (1.07 + i * 0.0069), i % 3 ? '#fff8de0b' : '#252a2216', 0.7);
  for (const rr of [1.025, 1.11, 1.18, 2.32, 2.4, 2.48]) {
    arc(c, cx + 2, cy + 3, r * rr, '#323b32', 6); arc(c, cx - 1, cy - 2, r * rr - 4, '#e6e6d3', 3);
  }
  // Open curved slots expose the tightly wound film underneath the metal flange.
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + 0.06;
    const slot = () => {
      c.beginPath(); c.arc(cx, cy, r * 2.18, a - 0.28, a + 0.28);
      c.quadraticCurveTo(cx + Math.cos(a + 0.35) * r * 1.7, cy + Math.sin(a + 0.35) * r * 1.7, cx + Math.cos(a + 0.24) * r * 1.29, cy + Math.sin(a + 0.24) * r * 1.29);
      c.arc(cx, cy, r * 1.29, a + 0.24, a - 0.24, true);
      c.quadraticCurveTo(cx + Math.cos(a - 0.35) * r * 1.7, cy + Math.sin(a - 0.35) * r * 1.7, cx + Math.cos(a - 0.28) * r * 2.18, cy + Math.sin(a - 0.28) * r * 2.18); c.closePath();
    };
    slot(); c.fillStyle = '#181d19'; c.fill();
    c.save(); c.clip();
    for (let j = 0; j < 95; j++) arc(c, cx, cy, r * 1.28 + j * r * 0.0098, j % 4 ? '#77796a70' : '#080d09', j % 4 ? 1 : 2);
    c.fillStyle = radial(c, cx, cy, r * 1.28, r * 2.2, [[0, '#030803b0'], [0.6, '#03080300'], [1, '#03080380']]); c.fillRect(0, 0, w, h);
    c.restore(); slot(); c.strokeStyle = '#394236'; c.lineWidth = 8; c.stroke();
    slot(); c.save(); c.translate(-2, -3); c.strokeStyle = '#f1efda9a'; c.lineWidth = 2; c.stroke(); c.restore();
    const x = cx + Math.cos(a + Math.PI / 6) * r * 1.47, y = cy + Math.sin(a + Math.PI / 6) * r * 1.47;
    circle(c, x + 2, y + 3, 12, '#3e463d'); circle(c, x - 1, y - 2, 9, '#c2c5b4'); line(c, [[x - 5, y - 3], [x + 5, y + 3]], '#4a5247', 2);
  }
  // A loose length crosses the corner, with two rows of sprocket holes and frame windows.
  const strip = Array.from({ length: 90 }, (_, i) => {
    const u = i / 89; return [cx - r * 2.8 + u * r * 1.37, cy + r * 1.18 - u * r * 3.2 + Math.sin(u * Math.PI) * r * 0.5];
  });
  line(c, strip, '#0c110d', 103); line(c, strip, '#a5a695', 98); line(c, strip, '#222920', 94);
  for (let i = 2; i < strip.length - 2; i += 2) {
    const [x, y] = strip[i], [nx, ny] = strip[i + 1], a = Math.atan2(ny - y, nx - x);
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = '#d2d3bc'; c.fillRect(-5, -43, 10, 10); c.fillRect(-5, 33, 10, 10);
    if (i % 6 === 2) { c.fillStyle = '#4f5748'; c.fillRect(-13, -25, 27, 50); c.strokeStyle = '#7f8772'; c.lineWidth = 1; c.strokeRect(-13, -25, 27, 50); }
    c.restore();
  }
  tooth(c, w, h, 221, 0.25);
});
function film(c, w, h, t) {
  const random = rng(222 + Math.floor(t * 12));
  c.save(); c.globalAlpha = 0.02 + random() * 0.025; c.fillStyle = '#fff9dd'; c.fillRect(0, 0, w, h); c.restore();
  for (let i = 0; i < 11; i++) {
    const x = random() * w;
    line(c, [[x, random() * h * 0.25], [x + random() * 2, h * (0.75 + random() * 0.25)]], 'rgba(26,29,23,0.13)', 0.5 + random());
  }
  c.save(); c.fillStyle = radial(c, w / 2, h / 2, h * 0.2, w * 0.7, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.35)']]); c.fillRect(0, 0, w, h); c.restore();
}
export default {
  id: 'rubberhose', ringName: '1930s film reel',
  drawRing(c, w, h, t, hole) { reel(c, w, h, t, hole); film(c, w, h, t); },
  drawInner(c, w, h, t, hole, rig) {
    const S = rig.s;
    prairie(c, w, h, hole, rig, { sky: '#d4d5ca', far: '#9c9f92', hill: '#7a8175', ground: '#b7b8a4', grass: '#6d7463', dust: '#dedfce' });
    for (let i = 0; i < 5; i++) {
      const x = hole.cx - hole.r - 150 + mod(i * 270 - rig.scroll * 0.2, 1600), y = hole.cy - hole.r * 0.6 + i % 2 * 30;
      for (let k = 0; k < 3; k++) { circle(c, x + k * 20, y - k % 2 * 8, 23, INK); circle(c, x + k * 20, y - k % 2 * 8 - 2, 20, WHITE); }
      c.fillStyle = WHITE; c.fillRect(x - 13, y, 68, 17);
    }
    rider(c, rig, p => {
      if (p.group === 'horse') return p.name === 'head' ? '#e2e0d2' : p.tone < 0.35 ? '#32352e' : '#4a4d42';
      if (p.name === 'riderHead' || p.name === 'bandana') return WHITE;
      if (p.name === 'torso') return '#33372f';
      return p.group === 'tack' ? '#a8aa98' : '#30352b';
    }, INK, 3.5, (q, p, b) => {
      if (p.name === 'body') ellipse(q, b.x + b.w * 0.32, b.y + b.h * 0.77, S * 0.18, S * 0.11, WHITE, -0.2);
      if (p.name === 'torso') for (let i = 0; i < 3; i++) circle(q, b.x + b.w * (0.67 - i * 0.14), b.y + b.h * (0.34 + i * 0.19), 3.6, WHITE);
    });
    for (const name of ['armReins', 'armLasso']) {
      const p = rig.parts.find(p => p.name === name), pts = centerline(p), hand = name === 'armLasso' ? rig.joints.hand : pts[pts.length - 1];
      ellipse(c, hand[0], hand[1], S * 0.052, S * 0.041, INK, -0.5);
      ellipse(c, hand[0] - 1, hand[1] - 1, S * 0.043, S * 0.035, WHITE, -0.5);
      for (let i = 0; i < 3; i++) line(c, [[hand[0] - 3 + i * 3, hand[1] - 5], [hand[0] - 1 + i * 3, hand[1] + 1]], INK, 1);
    }
    const [ex, ey] = rig.joints.eye;
    ellipse(c, ex, ey - 2, S * 0.038, S * 0.052, INK, 0.3);
    ellipse(c, ex, ey - 3, S * 0.029, S * 0.043, WHITE, 0.3);
    ellipse(c, ex + S * 0.013, ey, S * 0.015, S * 0.031, INK, 0.15);
    path(c, [[ex + 1, ey - 3], [ex + 9, ey - 9], [ex + 8, ey - 1]], true); c.fillStyle = WHITE; c.fill();
    const muzzle = rig.joints.muzzle;
    c.beginPath(); c.arc(muzzle[0] - S * 0.05, muzzle[1] + S * 0.02, S * 0.05, 0.2, 2.5); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    const head = bounds(rig.parts.find(p => p.name === 'riderHead'));
    circle(c, head.cx + head.w * 0.24, head.cy - head.h * 0.05, 2.7, INK);
    tooth(c, w, h, 221, 0.2); film(c, w, h, t);
  },
};

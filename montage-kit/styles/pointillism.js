import { createCanvas } from '@napi-rs/canvas';
import { rng } from '../plates/lib.js';
import { TAU, cachedRing, circle, ellipse, line, rider, prairie } from './_craft12.mjs';

const palette = ['#f1dfad', '#e4d7af', '#d5d3b0', '#d3c08c', '#d6b35e', '#bb923f', '#a87b39', '#d39a57', '#bc7947', '#915a3d', '#724c3f', '#4f4642', '#343f4a', '#516374', '#718b9d', '#8aa6ad', '#a1bbb5', '#789a96', '#548578', '#406a61', '#38584e', '#68834d', '#869750', '#9eac65', '#b4b675', '#c3c08c', '#d4d4a3', '#dfc5ac', '#c18e79', '#8c777c', '#9faca1', '#c0c8b6'];
const rgb = palette.map(hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
const stamps = palette.map(color => {
  const stamp = createCanvas(12, 12); circle(stamp.getContext('2d'), 6, 6, 5.7, color); return stamp;
});
// Each local colour is an optical mixture of separate, opaque pigments.
const mixtures = [
  ['#59b6dc', ['#168ce0', '#38c5dc', '#ffe065']],
  ['#408e9b', ['#1464c2', '#1ab8aa', '#ffbc31']],
  ['#73a650', ['#24ab38', '#e7cf23', '#286bd7']],
  ['#d5cd55', ['#ffe12d', '#8ccf26', '#ed5033']],
  ['#e78432', ['#ff9016', '#ef4c20', '#ffd131', '#2363d9']],
  ['#714864', ['#ca365a', '#234ac5', '#ec8420']],
  ['#2169ad', ['#1454d9', '#16a7c5', '#ec503c']],
  ['#f2b97d', ['#ffd887', '#f89448', '#f04d45']],
  ['#be3f33', ['#f1392b', '#f8901c', '#2968ca']],
  ['#273a57', ['#193d88', '#563369', '#17947d']],
];
const pure = [...new Set(mixtures.flatMap(m => m[1]))];
const pureStamps = pure.map(color => { const s = createCanvas(12, 12); circle(s.getContext('2d'), 6, 6, 5.7, color); return s; });
const mixtureRgb = mixtures.map(([hex]) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
function stipple(c, source, x0, y0, bw, bh, step, seed, vivid = false) {
  const q = source.getContext('2d'), pixels = q.getImageData(x0, y0, bw, bh).data, random = rng(seed), colors = vivid ? mixtureRgb : rgb;
  const buckets = (vivid ? pure : palette).map(() => []);
  for (let y = 2; y < bh - 2; y += step) for (let x = 2; x < bw - 2; x += step) {
    const xx = x + (random() - 0.5) * step * 0.85, yy = y + (random() - 0.5) * step * 0.85, p = (Math.floor(yy) * bw + Math.floor(xx)) * 4;
    const shift = (random() - 0.5) * (vivid ? 8 : 34), rr = pixels[p] + shift, gg = pixels[p + 1] + shift, bb = pixels[p + 2] + shift;
    let closest = 0, distance = Infinity;
    for (let k = 0; k < colors.length; k++) {
      const d = (rr - colors[k][0]) ** 2 + (gg - colors[k][1]) ** 2 * 1.2 + (bb - colors[k][2]) ** 2;
      if (d < distance) { distance = d; closest = k; }
    }
    if (vivid) {
      const pigments = mixtures[closest][1], pick = random();
      closest = pure.indexOf(pigments[pick < 0.64 ? 0 : pick < 0.95 ? 1 : Math.min(pigments.length - 1, 2 + Math.floor(random() * (pigments.length - 2)))]);
    }
    buckets[closest].push([xx + x0, yy + y0, step * ((vivid ? 0.53 : 0.32) + random() * (vivid ? 0.15 : 0.28))]);
  }
  for (let k = 0; k < buckets.length; k++) {
    for (const [x, y, r] of buckets[k]) c.drawImage(vivid ? pureStamps[k] : stamps[k], x - r, y - r, r * 2, r * 2);
  }
}
const drawRing = cachedRing((c, w, h, hole) => {
  const source = createCanvas(w, h), q = source.getContext('2d'), random = rng(231), { cx, cy, r } = hole;
  q.fillStyle = '#799b9a'; q.fillRect(0, 0, w, h);
  for (let i = 0; i < 450; i++) {
    const x = random() * w, y = random() * h;
    ellipse(q, x, y, 12 + random() * 110, 2 + random() * 7, ['#9eb5ac', '#547b7d', '#88a999', '#698e85', '#b5c1a3'][i % 5]);
  }
  for (let i = 0; i < 38; i++) {
    const a = random() * TAU, rr = r * (1.18 + random() * 2), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr, size = 35 + random() * 85;
    ellipse(q, x + 4, y + 14, size * 1.07, size * 0.58, '#45665e', random() * 0.4);
    q.beginPath(); q.moveTo(x, y); q.ellipse(x, y, size, size * 0.62, 0, 0.2, TAU - 0.18); q.closePath();
    q.fillStyle = ['#84974f', '#a7ad62', '#62844f', '#b7b878'][i % 4]; q.fill();
    for (let j = 0; j < 8; j++) {
      const a = j / 8 * TAU; line(q, [[x, y], [x + Math.cos(a) * size * 0.9, y + Math.sin(a) * size * 0.53]], '#708749', 3);
    }
    if (i % 4 === 0) {
      for (let j = 0; j < 9; j++) {
        const a = j / 9 * TAU; ellipse(q, x + Math.cos(a) * 13, y + Math.sin(a) * 8, 21, 8, '#d9c5b2', a);
      }
      circle(q, x, y, 9, '#d6b35e');
    }
  }
  c.fillStyle = '#9eaa8d'; c.fillRect(0, 0, w, h); stipple(c, source, 0, 0, w, h, 5.4, 232);
});
let source;
export default {
  id: 'pointillism', ringName: 'pointillist water lily pond', drawRing,
  drawInner(c, w, h, t, hole, rig) {
    if (!source || source.width !== w || source.height !== h) source = createCanvas(w, h);
    const q = source.getContext('2d');
    prairie(q, w, h, hole, rig, { sky: '#59b6dc', far: '#408e9b', hill: '#73a650', ground: '#d5cd55', grass: '#73a650', dust: '#f2b97d' });
    rider(q, rig, (p, b) => {
      if (p.group === 'horse') {
        const g = q.createLinearGradient(b.x, b.y, b.x, b.y + b.h); g.addColorStop(0, p.tone < 0.4 ? '#714864' : '#f2b97d'); g.addColorStop(0.36, '#e78432'); g.addColorStop(1, '#714864'); return g;
      }
      return p.group === 'tack' ? '#be3f33' : p.name === 'riderHead' ? '#f2b97d' : p.name === 'bandana' ? '#e78432' : p.name === 'hat' ? '#2169ad' : '#273a57';
    }, '#273a57', 4);
    const { cx, cy, r } = hole, x0 = Math.max(0, Math.floor(cx - r - 8)), y0 = Math.max(0, Math.floor(cy - r - 8));
    const bw = Math.min(w - x0, Math.ceil(r * 2 + 16)), bh = Math.min(h - y0, Math.ceil(r * 2 + 16));
    c.fillStyle = '#fff0ba'; c.fillRect(0, 0, w, h); stipple(c, source, x0, y0, bw, bh, 4.1, 233, true);
  },
};

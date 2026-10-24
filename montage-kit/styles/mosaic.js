import { createCanvas } from '@napi-rs/canvas';
import { rng } from '../plates/lib.js';
import { TAU, cachedRing, path, line, rider, prairie, tooth } from './_craft12.mjs';

const drawRing = cachedRing((c, w, h, hole) => {
  const { cx, cy, r } = hole, random = rng(180), gap = 13;
  c.fillStyle = '#89806e'; c.fillRect(0, 0, w, h);
  const creams = ['#d8ccb0', '#c7b89a', '#e4d7b7', '#bfb69d'], reds = ['#a05637', '#b86640', '#8c4c36'], darks = ['#3f4944', '#45564f', '#313f3b'];
  for (let rr = r; rr < r * 3.3; rr += gap) {
    const n = Math.round(TAU * rr / gap), step = TAU / n;
    for (let k = 0; k < n; k++) {
      const a = (k + 0.5) * step, x = cx + Math.cos(a) * (rr + gap / 2), y = cy + Math.sin(a) * (rr + gap / 2);
      if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
      const u = (rr - r) / r;
      let pal = creams;
      if (u < 0.07 || (u > 0.36 && u < 0.41) || (u > 1.5 && u < 1.57)) pal = darks;
      if (u > 0.13 && u < 0.3) pal = Math.sin(a * 38 + Math.floor(u * 22) * 1.7) > 0 ? reds : creams;
      if (u > 0.48 && u < 1.36) {
        const spiral = Math.sin(a * 14 + u * 9) + Math.cos(u * 16 - a * 7);
        pal = spiral > 0.75 ? reds : spiral < -0.65 ? darks : creams;
      }
      if (u > 1.7) pal = Math.sin(a * 50 + u * 18) > 0.5 ? reds : creams;
      const a0 = a - step * 0.44, a1 = a + step * 0.44, r0 = rr + 0.9 + random(), r1 = rr + gap - 1.2;
      const pts = [[cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0], [cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0], [cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1], [cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1]];
      path(c, pts, true); c.fillStyle = pal[Math.floor(random() * pal.length)]; c.fill();
      line(c, pts.slice(0, 2), 'rgba(255,245,210,0.33)', 1);
      if (random() < 0.09) line(c, [[x - 2, y - 3], [x + 3, y + 2]], '#8b806c', 0.8);
    }
  }
  tooth(c, w, h, 181, 0.2);
});
let source;
export default {
  id: 'mosaic', ringName: 'Roman tessellated floor medallion', drawRing,
  drawInner(c, w, h, t, hole, rig) {
    if (!source || source.width !== w || source.height !== h) source = createCanvas(w, h);
    const q = source.getContext('2d');
    prairie(q, w, h, hole, rig, { sky: '#d9d3b9', far: '#8b9d96', hill: '#a0a992', ground: '#bba879', grass: '#737955', dust: '#dfcfa7' });
    rider(q, rig, p => p.group === 'horse' ? (p.tone < 0.4 ? '#4b4032' : '#88674a') : p.group === 'tack' ? '#ab633e' : p.name === 'bandana' ? '#a64a30' : p.name === 'riderHead' ? '#b18d69' : '#e0cda3', '#3f3c30', 3.2);
    const { cx, cy, r } = hole, x0 = Math.max(0, Math.floor(cx - r - 10)), y0 = Math.max(0, Math.floor(cy - r - 10));
    const bw = Math.min(w - x0, Math.ceil(r * 2 + 20)), bh = Math.min(h - y0, Math.ceil(r * 2 + 20));
    const data = q.getImageData(x0, y0, bw, bh).data, random = rng(182);
    c.fillStyle = '#928975'; c.fillRect(0, 0, w, h);
    const step = 8.5;
    for (let y = y0 + 4; y < y0 + bh - 4; y += step) for (let x = x0 + 4; x < x0 + bw - 4; x += step) {
      const xx = x + (random() - 0.5) * 2, yy = y + (random() - 0.5) * 2, i = (Math.floor(yy - y0) * bw + Math.floor(xx - x0)) * 4;
      const shade = Math.floor((random() - 0.5) * 25);
      c.save(); c.translate(xx, yy); c.rotate((random() - 0.5) * 0.18);
      c.fillStyle = `rgb(${data[i] + shade},${data[i + 1] + shade},${data[i + 2] + shade})`; c.fillRect(-3.7, -3.7, 7.3, 7.3);
      line(c, [[-3, -3.3], [3, -3.3]], 'rgba(255,247,216,0.25)', 0.9); c.restore();
    }
    tooth(c, w, h, 181, 0.12);
  },
};

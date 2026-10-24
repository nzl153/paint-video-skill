import { createCanvas } from '@napi-rs/canvas';
import { partPath, paintDetails, strandPath, lassoPath } from '../engine/rider.mjs';
import { rng } from '../plates/lib.js';
import { TAU, cachedRing, radial, circle, arc, ellipse, prairie, bounds, tooth } from './_craft12.mjs';

const colors = [[4, 3, 12], [34, 14, 53], [92, 17, 73], [161, 24, 55], [218, 56, 31], [251, 113, 23], [255, 177, 39], [255, 227, 108], [255, 255, 227]];
function mapHeat(canvas) {
  const q = canvas.getContext('2d'), img = q.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] / 255 * (colors.length - 1), k = Math.min(colors.length - 2, Math.floor(v)), f = v - k;
    for (let j = 0; j < 3; j++) d[i + j] = colors[k][j] + (colors[k + 1][j] - colors[k][j]) * f;
  }
  q.putImageData(img, 0, 0);
}
const drawRing = cachedRing((c, w, h, hole) => {
  const s = 0.3, a = createCanvas(Math.ceil(w * s), Math.ceil(h * s)), q = a.getContext('2d');
  q.scale(s, s); const { cx, cy, r } = hole;
  q.fillStyle = '#161616'; q.fillRect(0, 0, w, h);
  circle(q, cx, cy, r * 3.3, radial(q, cx - r * 0.28, cy - r * 0.4, r * 0.2, r * 3.5, [[0, '#999999'], [0.42, '#777777'], [0.6, '#414141'], [0.9, '#242424'], [1, '#151515']]));
  arc(q, cx, cy, r * 2.7, '#696969', r * 0.028);
  q.beginPath(); q.ellipse(cx + r * 1.48, cy, r * 0.87, r * 0.54, 0, 0, TAU); q.strokeStyle = '#b8b8b8'; q.lineWidth = r * 0.21; q.stroke();
  q.beginPath(); q.ellipse(cx + r * 1.48, cy, r * 0.87, r * 0.54, 0, 0, TAU); q.strokeStyle = '#d0d0d0'; q.lineWidth = r * 0.08; q.stroke();
  circle(q, cx, cy, r * 1.35, radial(q, cx, cy, r, r * 1.35, [[0, '#fafafa'], [0.25, '#f1f1f1'], [0.52, '#d2d2d2'], [0.78, '#a3a3a3'], [1, '#7d7d7d']]));
  arc(q, cx, cy, r * 1.12, '#fdfdfd', r * 0.035);
  for (let j = 0; j < 12; j++) {
    const aa = j / 12 * TAU; ellipse(q, cx + Math.cos(aa) * r * 1.04, cy + Math.sin(aa) * r * 1.04, 7 + j % 3 * 3, 5, '#ededed', aa);
  }
  const random = rng(191);
  for (let j = 0; j < 3500; j++) {
    const x = random() * w, y = random() * h, rr = Math.hypot(x - cx, y - cy);
    if (rr < r * 1.35 || rr > r * 2.7) continue;
    q.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'; q.fillRect(x, y, 5, 5);
  }
  mapHeat(a); c.imageSmoothingEnabled = true; c.drawImage(a, 0, 0, w, h);
  tooth(c, w, h, 192, 0.11);
});
let heat;
export default {
  id: 'thermal', ringName: 'hot coffee cup rim in thermal imaging', drawRing,
  drawInner(c, w, h, t, hole, rig) {
    const scale = 0.3, ww = Math.ceil(w * scale), hh = Math.ceil(h * scale);
    if (!heat || heat.width !== ww || heat.height !== hh) heat = createCanvas(ww, hh);
    const q = heat.getContext('2d'); q.save(); q.scale(scale, scale);
    prairie(q, w, h, hole, rig, { sky: '#080808', far: '#242424', hill: '#303030', ground: '#202020', grass: '#383838', dust: '#606060' });
    q.lineCap = 'round'; q.lineJoin = 'round';
    for (const p of rig.parts) {
      const b = bounds(p), temp = p.group === 'horse' ? p.tone < 0.4 ? '#aaaaaa' : '#f4f4f4' : p.name === 'riderHead' ? '#ffffff' : p.group === 'tack' ? '#858585' : '#d2d2d2';
      partPath(q, p); q.fillStyle = radial(q, b.cx - b.w * 0.1, b.cy - b.h * 0.12, 0, Math.max(b.w, b.h) * 0.66, [[0, temp], [0.6, temp], [1, '#767676']]); q.fill();
    }
    paintDetails(q, rig, '#868686', 3);
    for (const st of rig.strands) { strandPath(q, st); q.strokeStyle = '#868686'; q.lineWidth = Math.max(1.5, st.w * 0.5); q.stroke(); }
    lassoPath(q, rig); q.strokeStyle = '#515151'; q.lineWidth = 3; q.stroke();
    q.restore(); mapHeat(heat); c.imageSmoothingEnabled = true; c.drawImage(heat, 0, 0, w, h);
    tooth(c, w, h, 192, 0.18);
  },
};

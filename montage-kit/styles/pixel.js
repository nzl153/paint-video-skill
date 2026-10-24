import { createCanvas } from '@napi-rs/canvas';
import { rng } from '../plates/lib.js';
import { partPath, paintDetails } from '../engine/rider.mjs';
import { TAU, ringLayer, circle, polygon, parts, dust, mod, line } from './_a-lib.js';

const P = ['#202b32', '#3b4936', '#536c3d', '#779b48', '#aac965', '#d4dca4', '#f6e8b1', '#eabf55', '#be8535', '#81562e', '#ad6138', '#e29454', '#618d9f', '#94bbc0', '#c3d7ce'];
function quantize(c) {
  const b = c.getContext('2d'), data = b.getImageData(0, 0, c.width, c.height);
  const palette = P.map(s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)));
  for (let i = 0; i < data.data.length; i += 4) {
    let best = 0, distance = Infinity;
    for (let k = 0; k < palette.length; k++) {
      const q = palette[k], d = (data.data[i] - q[0]) ** 2 + (data.data[i + 1] - q[1]) ** 2 + (data.data[i + 2] - q[2]) ** 2;
      if (d < distance) { best = k; distance = d; }
    }
    const q = palette[best]; data.data[i] = q[0]; data.data[i + 1] = q[1]; data.data[i + 2] = q[2];
  }
  b.putImageData(data, 0, 0);
}
function upscale(ctx, c, w, h) {
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, w, h); ctx.restore();
}
export default {
  id: 'pixel', ringName: '8-bit 金币环',
  drawRing(ctx, w, h, t, hole) {
    ringLayer(ctx, w, h, hole, 'pixel', (target, hole) => {
    const step = 6, W = Math.ceil(w / step), H = Math.ceil(h / step);
    const c = createCanvas(W, H), b = c.getContext('2d');
    {
      const x = hole.cx / step, y = hole.cy / step, r = hole.r / step, R = Math.hypot(W / 2, H / 2) + 15;
      b.fillStyle = P[0]; b.fillRect(0, 0, W, H);
      circle(b, x + 3, y + 4, R, P[9]); circle(b, x, y, R, P[8]); circle(b, x, y, R - 6, P[7]);
      circle(b, x, y, R - 15, P[8]); circle(b, x - 2, y - 3, R - 17, P[7]);
      const random = rng(38);
      b.save(); b.beginPath(); b.arc(x, y, R - 18, 0, TAU); b.arc(x, y, r + 14, 0, TAU, true); b.clip('evenodd');
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
        const shade = (xx + yy) / (W + H);
        if ((xx + yy) % 2 === 0 && random() < shade * 0.6) { b.fillStyle = P[8]; b.fillRect(xx, yy, 1, 1); }
        else if (random() < 0.055) { b.fillStyle = P[6]; b.fillRect(xx, yy, 1, 1); }
      }
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * TAU, rr = (r + R) * 0.56;
        b.save(); b.translate(x + Math.cos(a) * rr, y + Math.sin(a) * rr); b.rotate(a);
        polygon(b, [[-9, -6], [0, -13], [9, -6], [6, 0], [9, 7], [0, 5], [-9, 7], [-6, 0]], P[8]);
        b.strokeStyle = P[6]; b.lineWidth = 1; line(b, [[-9, -6], [0, -13], [9, -6]]); b.restore();
      }
      b.restore();
      circle(b, x, y, r + 13, P[9]); circle(b, x - 1, y - 1, r + 9, P[6]); circle(b, x, y, r + 5, P[8]); circle(b, x, y, r, P[0]);
      quantize(c);
    }
    upscale(target, c, w, h);
    });
  },
  drawInner(ctx, w, h, t, hole, rig) {
    const step = 6, c = createCanvas(Math.ceil(w / step), Math.ceil(h / step)), b = c.getContext('2d');
    b.scale(1 / step, 1 / step);
    b.fillStyle = P[13]; b.fillRect(0, 0, w, h);
    const S = rig.s, hz = rig.ground - S * 0.65;
    for (let i = 0; i < 9; i++) {
      const x = mod(i * S * 2.2 - rig.scroll * 0.18, S * 19.8) - S * 2;
      b.fillStyle = P[14]; b.fillRect(x, hz - S * 1.35, S * 0.65, 24); b.fillRect(x - 24, hz - S * 1.23, S * 0.85, 18);
      polygon(b, [[x - S * 0.4, hz], [x, hz - S * 0.5], [x + S * 0.7, hz - S * 0.5], [x + S, hz]], P[12]);
    }
    b.fillStyle = P[4]; b.fillRect(0, hz, w, h - hz); b.fillStyle = P[3]; b.fillRect(0, rig.ground + 12, w, h);
    const random = rng(15);
    for (let i = 0; i < 180; i++) {
      const x = mod(random() * w * 1.3 - rig.scroll, w * 1.3) - w * 0.15, y = hz + random() * (h - hz);
      b.fillStyle = i % 3 ? P[2] : P[5]; b.fillRect(x, y, 12 + random() * 24, 6);
    }
    for (let i = 0; i < 9; i++) {
      const x = mod(i * S * 2.4 - rig.scroll * 0.4, S * 21.6) - S * 3;
      b.fillStyle = P[2]; b.fillRect(x, hz - 72, 18, 84); b.fillRect(x - 24, hz - 48, 30, 12); b.fillRect(x - 24, hz - 66, 12, 24); b.fillRect(x + 12, hz - 36, 30, 12); b.fillRect(x + 30, hz - 60, 12, 30);
      b.fillStyle = P[4]; b.fillRect(x + 3, hz - 66, 6, 72);
    }
    dust(b, rig, t, P[6], true);
    parts(b, rig, p => p.group === 'horse' ? (p.tone < 0.3 ? P[9] : P[10]) : p.group === 'tack' ? P[7] : /Head/.test(p.name) ? P[11] : P[0], P[0], 4);
    for (const p of rig.parts) {
      if (p.name !== 'body' && p.name !== 'neck' && p.name !== 'torso') continue;
      b.save(); partPath(b, p); b.clip(); b.strokeStyle = p.group === 'horse' ? P[11] : P[12]; b.lineWidth = 8;
      line(b, p.pts.slice(0, Math.floor(p.pts.length * 0.3))); b.restore();
    }
    paintDetails(b, rig, P[8], 4);
    quantize(c); upscale(ctx, c, w, h);
  },
};

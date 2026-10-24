import { createCanvas } from '@napi-rs/canvas';
import { rng, hash } from '../plates/lib.js';
import { partPath, outlinePts, paintDetails } from '../engine/rider.mjs';
import { TAU, cached, ringLayer, circle, polygon, polar, line, box, hairs, dust, ground, mod } from './_a-lib.js';

function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix + iy * 331), b = hash(ix + 1 + iy * 331), c = hash(ix + (iy + 1) * 331), d = hash(ix + 1 + (iy + 1) * 331);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
function rock(w, h) {
  return cached('cave-rock', w, h, b => {
    const c = createCanvas(Math.ceil(w / 4), Math.ceil(h / 4)), q = c.getContext('2d'), im = q.createImageData(c.width, c.height);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const n = (noise(x / 65, y / 65) - 0.5) * 65 + (noise(x / 15, y / 15) - 0.5) * 28 + (noise(x / 3.5, y / 3.5) - 0.5) * 15 + hash(x * 3 + y * 716) * 10;
      const i = (y * c.width + x) * 4; im.data[i] = 152 + n; im.data[i + 1] = 119 + n * 0.84; im.data[i + 2] = 79 + n * 0.64; im.data[i + 3] = 255;
    }
    q.putImageData(im, 0, 0); b.drawImage(c, 0, 0, w, h);
    const random = rng(8);
    for (let i = 0; i < 8000; i++) {
      b.fillStyle = i % 2 ? '#e6c18a23' : '#302d2425';
      b.fillRect(random() * w, random() * h, 0.6 + random() * 2, 0.6 + random() * 1.5);
    }
    for (let i = 0; i < 180; i++) {
      const x = random() * w, y = random() * h;
      b.strokeStyle = i % 2 ? '#e1b77b35' : '#352c2820'; b.lineWidth = 0.5 + random() * 3;
      line(b, [[x, y], [x + 13, y + random() * 10], [x + 40, y - random() * 10], [x + 80 + random() * 70, y - 8 - random() * 25]]);
    }
  });
}
function handprint(ctx, x, y, s, angle, alpha = 0.5) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha = alpha;
  ctx.fillStyle = '#8b3827'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.36, s * 0.44, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#8b3827'; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.16;
  const ends = [[-0.58, -0.24], [-0.3, -0.99], [-0.07, -1.2], [0.18, -1.12], [0.4, -0.86]];
  ends.forEach(([dx, dy], i) => line(ctx, [[(i - 2) * s * 0.12, -s * 0.17], [dx * s, dy * s]]));
  ctx.restore();
}
export default {
  id: 'cave', ringName: '岩壁洞口',
  drawRing(ctx, w, h, t, hole) {
    ringLayer(ctx, w, h, hole, 'cave', (b, hole) => {
      const { cx, cy, r } = hole, random = rng(819);
      const stone = createCanvas(Math.ceil(w / 2), Math.ceil(h / 2)), q = stone.getContext('2d'), im = q.createImageData(stone.width, stone.height);
      const relief = (x, y) => noise(x / 170, y / 63) * 0.6 + noise(x / 53, y / 17) * 0.28 + noise(x / 8, y / 6) * 0.12;
      for (let y = 0; y < stone.height; y++) for (let x = 0; x < stone.width; x++) {
        const n = relief(x, y), slope = (relief(x - 2, y - 2) - relief(x + 2, y + 2)) * 330;
        const warm = Math.exp(-((x - 70) ** 2 / 170000 + (y - 330) ** 2 / 80000));
        const d = Math.hypot(x * 2 - cx, y * 2 - cy), lip = Math.exp(-Math.max(0, d - r) / 60);
        const light = 25 + n * 130 + slope + hash(x + y * 771) * 17 - lip * 58;
        const i = (y * stone.width + x) * 4;
        im.data[i] = light * (0.95 + warm * 0.43); im.data[i + 1] = light * (0.94 + warm * 0.12); im.data[i + 2] = light * (0.84 - warm * 0.17); im.data[i + 3] = 255;
      }
      q.putImageData(im, 0, 0); b.drawImage(stone, 0, 0, w, h);
      const mouth = b.createRadialGradient(cx, cy, r, cx, cy, r + 170);
      mouth.addColorStop(0, '#101b15b0'); mouth.addColorStop(0.4, '#151e1750'); mouth.addColorStop(1, '#151e1700');
      circle(b, cx, cy, r + 170, mouth);
      // Sedimentary beds meander across the walls; they do not converge on the hole.
      for (let j = 0; j < 15; j++) {
        const yy = j * 88 - 100 + random() * 55, phase = random() * TAU;
        const pts = Array.from({ length: 65 }, (_, k) => [k * w / 64, yy + Math.sin(k * 0.15 + phase) * 38 + Math.sin(k * 0.43 + phase) * 8 + k * (j % 2 ? 1 : -1)]);
        b.strokeStyle = '#1c211b50'; b.lineWidth = 2 + random() * 4; line(b, pts);
        b.strokeStyle = '#e0cca335'; b.lineWidth = 1 + random() * 2; line(b, pts.map(([x, y]) => [x, y - 5]));
      }
      for (let j = 0; j < 17; j++) {
        const x = random() * w, y = random() * h;
        b.strokeStyle = '#22251d6a'; b.lineWidth = 1.2 + random() * 2;
        line(b, [[x, y], [x + 6, y + 24], [x - 16, y + 45], [x - 11, y + 81], [x - 30, y + 103]]);
      }
      const animal = (x, y, s, deer) => {
        b.save(); b.translate(x, y); b.scale(s, s); b.rotate(deer ? -0.08 : 0.09);
        b.fillStyle = '#873e28ba'; b.strokeStyle = '#713322cc'; b.lineWidth = 4; b.lineJoin = 'round'; b.lineCap = 'round';
        b.beginPath(); b.moveTo(-105, 8);
        b.bezierCurveTo(-110, -50, -60, deer ? -45 : -85, -5, -45);
        b.bezierCurveTo(20, -45, 27, deer ? -80 : -50, 48, deer ? -90 : -44);
        b.lineTo(83, deer ? -76 : -25); b.lineTo(76, deer ? -61 : 5); b.lineTo(45, deer ? -60 : 16);
        b.bezierCurveTo(10, 48, -58, 39, -105, 8); b.fill(); b.stroke();
        for (const [x0, lean] of [[-79, -8], [-59, 13], [16, -4], [34, 17]]) line(b, [[x0, 19], [x0 + lean, 61], [x0 + lean - 12, 84], [x0 + lean + 3, 84]]);
        line(b, [[-100, -3], [-124, 13], [-133, 27]]);
        if (deer) {
          for (const dx of [0, 16]) {
            line(b, [[55 + dx, -82], [48 + dx, -115], [28 + dx, -143], [31 + dx, -161]]);
            line(b, [[45 + dx, -119], [63 + dx, -140], [61 + dx, -154]]);
            line(b, [[35 + dx, -136], [17 + dx, -137]]);
          }
        } else {
          line(b, [[48, -42], [35, -68], [51, -82]]); line(b, [[65, -39], [77, -57], [75, -72]]);
          b.strokeStyle = '#3e2c21a8'; b.lineWidth = 8; line(b, [[29, -8], [21, 15], [29, 43]]);
        }
        circle(b, 65, deer ? -76 : -25, 2.5, '#302d22'); b.restore();
      };
      animal(cx - r * 1.83, cy - 25, 1.6, false);
      animal(cx + r * 1.93, cy + 200, 1.25, true);
      handprint(b, cx - 650, cy + 320, 85, -0.3, 0.65);
      handprint(b, cx + 750, cy - 220, 86, 0.25, 0.55);
      // Pendant limestone at the mouth catches the warm light on its left face.
      for (const [offset, width, length] of [[-1.45, 69, 280], [-1.23, 40, 210], [-1.06, 53, 250], [-0.81, 45, 180], [-0.52, 58, 125], [-0.13, 72, 135], [0.39, 53, 150], [0.79, 62, 230], [1.08, 52, 180], [1.32, 68, 270], [1.49, 39, 190]]) {
        const x = cx + r * offset;
        const dx = x - cx, edge = cy - Math.sqrt(Math.max(0, r * r - dx * dx));
        const root = cy - Math.sqrt(Math.max(0, (r * 1.58) ** 2 - dx * dx)) - 80;
        const tip = Math.min(edge - 5, root + length), yy = u => root + (tip - root) * u;
        b.beginPath(); b.moveTo(x - width, root);
        b.bezierCurveTo(x - width * 1.2, yy(0.24), x - width * 0.35, yy(0.38), x - width * 0.3, yy(0.61));
        b.bezierCurveTo(x - width * 0.38, yy(0.82), x + width * 0.09, yy(0.9), x, tip);
        b.bezierCurveTo(x + width * 0.16, yy(0.73), x + width * 0.6, yy(0.56), x + width * 0.49, yy(0.4));
        b.bezierCurveTo(x + width * 0.47, yy(0.2), x + width * 1.1, root + 40, x + width, root); b.closePath();
        const g = b.createLinearGradient(x - width, 0, x + width, 0); g.addColorStop(0, '#d7b27c'); g.addColorStop(0.4, '#81775d'); g.addColorStop(1, '#282c25');
        b.save(); b.clip();
        // Mineral flows grow out of the wall; their roots have no cut-off edge.
        const texture = b.createPattern(rock(w, h), 'no-repeat');
        for (let y = Math.floor(root); y < tip; y += 4) {
          const u = Math.min(1, (y - root) / Math.min(85, (tip - root) * 0.5)), alpha = u * u * (3 - 2 * u);
          b.globalAlpha = alpha; b.globalCompositeOperation = 'source-over'; b.fillStyle = g; b.fillRect(x - width * 1.3, y, width * 2.6, 4);
          b.globalAlpha = alpha * 0.4; b.globalCompositeOperation = 'multiply'; b.fillStyle = texture; b.fillRect(x - width * 1.3, y, width * 2.6, 4);
        }
        b.restore();
      }
      b.save(); b.globalAlpha = 0.22; b.globalCompositeOperation = 'multiply'; b.drawImage(rock(w, h), 0, 0); b.restore();
      const firelight = b.createLinearGradient(0, 0, w, h * 0.4);
      firelight.addColorStop(0, '#fbb05b36'); firelight.addColorStop(0.35, '#dd833d10'); firelight.addColorStop(1, '#08151275');
      b.fillStyle = firelight; b.fillRect(0, 0, w, h);
    });
  },
  drawInner(ctx, w, h, t, hole, rig) {
    ctx.drawImage(rock(w, h), 0, 0);
    const S = rig.s, hz = rig.ground - S * 0.65, random = rng(371 + Math.floor(t * 12));
    for (let i = 0; i < 9; i++) {
      const x = mod(i * S * 2 - rig.scroll * 0.2, S * 18) - S * 3;
      polygon(ctx, [[x, hz], [x + S * 0.3, hz - S * 0.5], [x + S * 0.6, hz - S * 0.2], [x + S, hz - S * 0.65], [x + S * 1.5, hz]], '#6a422b40');
    }
    handprint(ctx, hole.cx - S * 0.95 - mod(rig.scroll * 0.12, S * 0.35), hole.cy - S * 0.8, S * 0.19, -0.4, 0.45);
    ground(ctx, w, rig, '#453b2a90', 190); dust(ctx, rig, t, '#d2ac7260');
    for (const p of rig.parts) {
      ctx.save(); partPath(ctx, p); ctx.fillStyle = p.group === 'horse' ? p.tone < 0.3 ? '#623529' : '#99472b' : p.group === 'rider' ? '#38382a' : '#b5703e'; ctx.fill(); ctx.clip();
      const [x0, y0, x1, y1] = box(p);
      for (let i = 0; i < 180; i++) {
        ctx.fillStyle = i % 3 ? '#d0a46a40' : '#382e2640';
        const x = x0 + random() * (x1 - x0), y = y0 + random() * (y1 - y0);
        ctx.fillRect(x, y, 0.8 + random() * 2, 0.8 + random() * 3);
      }
      ctx.restore(); const o = outlinePts(p); ctx.strokeStyle = '#372d2490'; ctx.lineWidth = 3.4; line(ctx, o.pts, o.closed);
    }
    hairs(ctx, rig, '#302e22', 0.7); paintDetails(ctx, rig, '#d9aa7185', 2.2);
    ctx.save(); ctx.globalAlpha = 0.15; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(rock(w, h), 0, 0); ctx.restore();
  },
};

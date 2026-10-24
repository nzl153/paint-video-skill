import { rng } from '../plates/lib.js';
import { partPath, outlinePts, paintDetails } from '../engine/rider.mjs';
import { TAU, ringLayer, paper, circle, line, polygon, polar, box, hatch, hairs, dust, ground, mod } from './_a-lib.js';

const WHITE = '#e9e2cf', BLACK = '#20221d';
export default {
  id: 'woodcut', ringName: '木刻马车轮',
  drawRing(ctx, w, h, t, hole) {
    ringLayer(ctx, w, h, hole, 'woodcut', (b, hole) => {
      paper(b, w, h, WHITE, 85);
      const { cx, cy, r } = hole, R = Math.hypot(w / 2, h / 2) + 65, random = rng(83);
      hatch(b, [0, 0, w, h], '#20221d35', 10, 1.8, 0.24);
      circle(b, cx, cy, R, BLACK);
      circle(b, cx, cy, R - 110, WHITE);
      circle(b, cx, cy, R - 175, BLACK);
      circle(b, cx, cy, R - 240, WHITE);
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * TAU;
        polygon(b, [polar(hole, r + 35, a - 0.12), polar(hole, R - 215, a - 0.047), polar(hole, R - 215, a + 0.047), polar(hole, r + 35, a + 0.12)], BLACK);
        b.strokeStyle = WHITE; b.lineWidth = 3;
        for (let k = 0; k < 7; k++) {
          const aa = a + (k - 3) * 0.007;
          line(b, [polar(hole, r + 80 + random() * 50, aa), polar(hole, R - 255 - random() * 90, aa + 0.01)]);
        }
      }
      circle(b, cx, cy, r + 120, BLACK);
      for (let rr = r + 12; rr < r + 115; rr += 8) circle(b, cx, cy, rr, null, WHITE, 2 + random() * 2);
      for (let i = 0; i < 1100; i++) {
        const a = random() * TAU, rr = R - 210 + random() * 205;
        b.strokeStyle = random() < 0.8 ? WHITE : BLACK; b.lineWidth = 1 + random() * 3;
        b.beginPath(); b.arc(cx + random() * 4, cy, rr, a, a + random() * 0.08); b.stroke();
      }
      for (let i = 0; i < 28; i++) {
        const [x, y] = polar(hole, R - 57, i / 28 * TAU);
        circle(b, x, y, 11, WHITE); circle(b, x + 2, y + 1, 4, BLACK);
      }
      // Long shallow cuts follow the wood grain through the inked spokes.
      b.save(); b.beginPath(); b.arc(cx, cy, R, 0, TAU); b.arc(cx, cy, r + 122, 0, TAU, true); b.clip('evenodd');
      for (let i = 0; i < 240; i++) {
        const x = random() * w, y = random() * h;
        b.strokeStyle = random() < 0.7 ? '#e9e2cf80' : '#20221d50'; b.lineWidth = 0.5 + random() * 1.3;
        line(b, [[x, y], [x + 30, y + 1 + random() * 2], [x + 70 + random() * 80, y - 2 + random() * 4]]);
      }
      b.restore();
      circle(b, cx, cy, r, null, BLACK, 8);
    });
  },
  drawInner(ctx, w, h, t, hole, rig) {
    paper(ctx, w, h, WHITE, 85);
    const S = rig.s, hz = rig.ground - S * 0.75;
    ctx.save(); ctx.beginPath(); ctx.rect(0, hz - S * 2, w, S * 2); ctx.clip();
    hatch(ctx, [0, hz - S * 2, w, hz], '#20221d55', 14, 1.5, 0.1);
    ctx.restore();
    for (let i = 0; i < 9; i++) {
      const x = mod(i * S * 2.3 - rig.scroll * 0.23, S * 20.7) - S * 3;
      const pts = [[x, hz], [x + S * 0.35, hz - S * 0.45], [x + S * 0.9, hz - S * 0.75], [x + S * 1.8, hz]];
      polygon(ctx, pts, BLACK);
      ctx.save(); ctx.beginPath(); pts.forEach(([a, b], j) => j ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.clip();
      hatch(ctx, [x, hz - S, x + S * 2, hz], WHITE, 9, 3, -0.5); ctx.restore();
    }
    ctx.fillStyle = BLACK; ctx.fillRect(0, hz + S * 0.03, w, h - hz);
    ground(ctx, w, rig, WHITE, 210);
    dust(ctx, rig, t, WHITE, true);
    const random = rng(44 + Math.floor(t * 12));
    for (const p of rig.parts) {
      ctx.save(); partPath(ctx, p); ctx.fillStyle = BLACK; ctx.fill(); ctx.clip();
      const bounds = box(p);
      hatch(ctx, bounds, WHITE, 6 + p.tone * 7, 1.1 + p.tone * 1.2, p.group === 'rider' ? 0.5 : -0.65, 27);
      ctx.strokeStyle = WHITE; ctx.lineWidth = 3.5;
      if (p.name === 'body' || p.name === 'neck') {
        for (let i = 0; i < 10; i++) {
          const y = bounds[1] + (bounds[3] - bounds[1]) * i / 10;
          ctx.beginPath(); ctx.moveTo(bounds[0], y + random() * 6);
          ctx.quadraticCurveTo((bounds[0] + bounds[2]) / 2, y - S * 0.12, bounds[2], y + S * 0.08); ctx.stroke();
        }
      }
      ctx.restore();
      const o = outlinePts(p); ctx.strokeStyle = WHITE; ctx.lineWidth = 2.5; line(ctx, o.pts, o.closed);
    }
    hairs(ctx, rig, BLACK, 0.8);
    paintDetails(ctx, rig, WHITE, 2.6);
    const { cx, cy, r } = hole;
    // Uneven ink transfer survives in both the paper and the carved solids.
    ctx.fillStyle = '#e9e2cf55';
    for (let i = 0; i < 550; i++) ctx.fillRect(cx - r + random() * r * 2, cy - r + random() * r * 2, 1 + random() * 2, 2 + random() * 4);
  },
};

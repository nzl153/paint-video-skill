import { rng } from '../plates/lib.js';
import { partPath, outlinePts, paintDetails } from '../engine/rider.mjs';
import { TAU, cached, ringLayer, paper, circle, polygon, line, box, hairs, dust, ground, mod } from './_a-lib.js';

const INK = '#191b1c', YELLOW = '#f5d43e', RED = '#db392d', BLUE = '#197eac', CREAM = '#f8edcb';
function dots(ctx, bounds, color, radius = 2.5, gap = 11) {
  const tile = cached(`dots:${color}:${radius}:${gap}`, gap * 2, gap * 2, b => {
    for (let j = -1; j < 3; j++) for (let i = -1; i < 3; i++) {
      circle(b, i * gap + (j % 2 ? gap / 2 : 0), j * gap, radius, color);
    }
  });
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  const [x0, y0, x1, y1] = bounds;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}
export default {
  id: 'popart', ringName: '波普黑胶唱片',
  drawRing(ctx, w, h, t, hole) {
    ringLayer(ctx, w, h, hole, 'popart', (b, hole) => {
      paper(b, w, h, YELLOW, 6);
      dots(b, [0, 0, w, h], RED, 3.5, 16);
      const { cx, cy, r } = hole, R = Math.hypot(w / 2, h / 2) + 40;
      circle(b, cx, cy, R, INK, CREAM, 10);
      for (let rr = r + 205; rr < R - 20; rr += 8) circle(b, cx, cy, rr, null, rr % 24 < 8 ? '#f8edcb77' : '#526167', 1.8);
      for (const [a, color] of [[-2.5, BLUE], [0.7, RED]]) {
        b.fillStyle = color; b.beginPath(); b.moveTo(cx, cy); b.arc(cx, cy, R - 12, a, a + 0.19); b.closePath(); b.fill();
        for (let rr = r + 205; rr < R - 20; rr += 8) {
          b.strokeStyle = CREAM; b.lineWidth = 1; b.beginPath(); b.arc(cx, cy, rr, a, a + 0.19); b.stroke();
        }
      }
      circle(b, cx, cy, r + 195, RED, INK, 14);
      b.save(); b.beginPath(); b.arc(cx, cy, r + 185, 0, TAU); b.clip();
      dots(b, [cx - r - 195, cy - r - 195, cx + r + 195, cy + r + 195], INK, 3, 13);
      polygon(b, [[cx - 800, cy - 250], [cx + 800, cy - 100], [cx + 800, cy + 100], [cx - 800, cy - 20]], YELLOW, INK, 10);
      b.restore(); circle(b, cx, cy, r + 23, CREAM, INK, 9); circle(b, cx, cy, r, INK);
    });
  },
  drawInner(ctx, w, h, t, hole, rig) {
    ctx.fillStyle = CREAM; ctx.fillRect(0, 0, w, h);
    const S = rig.s, hz = rig.ground - S * 0.66;
    ctx.fillStyle = BLUE; ctx.fillRect(0, 0, w, hz);
    dots(ctx, [hole.cx - hole.r, hole.cy - hole.r, hole.cx + hole.r, hz], '#073e643f', 2.5, 12);
    circle(ctx, hole.cx - S * 1.06 - mod(rig.scroll * 0.05, S * 0.2), hole.cy - S * 0.7, S * 0.3, YELLOW, INK, 5);
    for (let i = 0; i < 10; i++) {
      const x = mod(i * S * 1.9 - rig.scroll * 0.3, S * 19) - S * 3;
      polygon(ctx, [[x, hz], [x + S * 0.22, hz - S * 0.4], [x + S * 0.8, hz - S * 0.4], [x + S, hz]], RED, INK, 5);
    }
    ctx.fillStyle = YELLOW; ctx.fillRect(0, hz, w, h - hz);
    dots(ctx, [hole.cx - hole.r, hz, hole.cx + hole.r, h], '#bd782d', 2.5, 14);
    ground(ctx, w, rig, INK, 85);
    dust(ctx, rig, t, CREAM, true);
    for (let i = 0; i < 7; i++) {
      const x = hole.cx - S * 1.7, y = hole.cy + (i - 3) * S * 0.17;
      ctx.strokeStyle = INK; ctx.lineWidth = 3; line(ctx, [[x, y], [x - S * (0.2 + (i % 3) * 0.1), y]]);
    }
    for (const p of rig.parts) {
      ctx.save(); partPath(ctx, p);
      const fill = p.group === 'horse' ? (p.tone < 0.3 ? BLUE : RED) : p.group === 'rider' ? (p.name === 'riderHead' ? CREAM : YELLOW) : BLUE;
      ctx.fillStyle = fill; ctx.fill(); ctx.clip();
      const bb = box(p);
      if (p.tone < 0.65) dots(ctx, bb, INK, p.tone < 0.3 ? 3 : 2, 9);
      if (p.name === 'body') { ctx.fillStyle = INK; polygon(ctx, [[bb[0], bb[3]], [bb[2], bb[3]], [bb[2], bb[3] - S * 0.13]], INK); }
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 4.8; const o = outlinePts(p); line(ctx, o.pts, o.closed);
      // A restrained offset of the yellow plate makes the ink feel printed.
      if (p.name === 'body') { ctx.save(); ctx.translate(-2, -1); ctx.strokeStyle = CREAM; ctx.lineWidth = 1.3; line(ctx, o.pts.slice(0, Math.floor(o.pts.length * 0.25))); ctx.restore(); }
    }
    hairs(ctx, rig, INK, 0.9); paintDetails(ctx, rig, INK, 2.6);
  },
};

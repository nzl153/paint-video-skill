import { rng } from '../plates/lib.js';
import { partPath, outlinePts, paintDetails } from '../engine/rider.mjs';
import { TAU, ringLayer, paper, circle, polygon, polar, line, box, hatch, hairs, dust, ground, mod } from './_a-lib.js';

const BLUE = '#164b66', WHITE = '#d6e6de', FAINT = '#a3c5c44d';
function grid(ctx, w, h) {
  paper(ctx, w, h, BLUE, 80);
  ctx.strokeStyle = '#c0dddc17'; ctx.lineWidth = 0.8; ctx.beginPath();
  for (let x = 0; x < w; x += 24) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y < h; y += 24) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
}
function dimension(ctx, a, b, offset = 25) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const ox = -uy * offset, oy = ux * offset, p = [a[0] + ox, a[1] + oy], q = [b[0] + ox, b[1] + oy];
  ctx.strokeStyle = WHITE; ctx.lineWidth = 1;
  line(ctx, [[a[0], a[1]], [p[0] - uy * 9, p[1] + ux * 9]]);
  line(ctx, [[b[0], b[1]], [q[0] - uy * 9, q[1] + ux * 9]]); line(ctx, [p, q]);
  for (const [pt, sign] of [[p, 1], [q, -1]]) polygon(ctx, [pt, [pt[0] + ux * 10 * sign - uy * 3, pt[1] + uy * 10 * sign + ux * 3], [pt[0] + ux * 10 * sign + uy * 3, pt[1] + uy * 10 * sign - ux * 3]], WHITE);
}
export default {
  id: 'blueprint', ringName: '轴承工程剖面',
  drawRing(ctx, w, h, t, hole) {
    ringLayer(ctx, w, h, hole, 'blueprint', (b, hole) => {
      grid(b, w, h);
      const { cx, cy, r } = hole, R = Math.hypot(w / 2, h / 2) + 50, race = (r + R) / 2, ball = (R - r) * 0.25;
      for (const rr of [r + 3, r + 30, r + 115, R - 140, R - 40, R - 7]) circle(b, cx, cy, rr, null, WHITE, rr === r + 3 ? 4 : 2);
      b.save(); b.beginPath(); b.arc(cx, cy, r + 115, 0, TAU); b.arc(cx, cy, r + 30, 0, TAU, true); b.clip('evenodd');
      hatch(b, [0, 0, w, h], WHITE, 13, 1.2, -1); b.restore();
      b.save(); b.beginPath(); b.arc(cx, cy, R - 40, 0, TAU); b.arc(cx, cy, R - 140, 0, TAU, true); b.clip('evenodd');
      hatch(b, [0, 0, w, h], WHITE, 13, 1.2, 1); b.restore();
      for (let i = 0; i < 12; i++) {
        const a = (i + 0.5) / 12 * TAU, [x, y] = polar(hole, race, a);
        circle(b, x, y, ball, null, WHITE, 3); circle(b, x, y, ball - 10, null, FAINT, 1);
        b.strokeStyle = FAINT; b.lineWidth = 1;
        line(b, [[x - ball - 18, y], [x + ball + 18, y]]); line(b, [[x, y - ball - 18], [x, y + ball + 18]]);
        const p0 = polar(hole, race - 14, a + TAU / 24), p1 = polar(hole, race + 14, a + TAU / 24);
        b.save(); b.translate(p0[0], p0[1]); b.rotate(a + TAU / 24); b.strokeStyle = WHITE; b.lineWidth = 2; b.strokeRect(-10, -40, 28, 80); b.restore();
      }
      b.strokeStyle = FAINT; b.setLineDash([30, 8, 4, 8]); b.lineWidth = 1.5;
      circle(b, cx, cy, race, null, FAINT, 1.5); line(b, [[0, cy], [w, cy]]); line(b, [[cx, 0], [cx, h]]); b.setLineDash([]);
      dimension(b, [cx - r, cy], [cx + r, cy], -r - 32);
      dimension(b, [cx + r + 30, cy], [cx + r + 115, cy], -75);
      dimension(b, [cx - R + 65, 50], [cx + R - 65, 50], 28);
    });
  },
  drawInner(ctx, w, h, t, hole, rig) {
    grid(ctx, w, h);
    const S = rig.s, hz = rig.ground - S * 0.72;
    ctx.strokeStyle = '#c9e4df80'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) {
      const x = mod(i * S * 2 - rig.scroll * 0.24, S * 20) - S * 3;
      line(ctx, [[x, hz], [x + S * 0.3, hz - S * 0.4], [x + S, hz - S * 0.4], [x + S * 1.3, hz]]);
      line(ctx, [[x, hz], [x + S, hz - S * 0.4]]);
    }
    line(ctx, [[0, hz], [w, hz]]); ground(ctx, w, rig, '#c5e0d080', 160); dust(ctx, rig, t, WHITE, true);
    for (const p of rig.parts) {
      ctx.save(); partPath(ctx, p); ctx.fillStyle = '#164b66ef'; ctx.fill(); ctx.clip();
      if (p.tone < 0.45) hatch(ctx, box(p), '#a5d1cf70', 7, 1, -0.8);
      ctx.restore(); const o = outlinePts(p); ctx.strokeStyle = WHITE; ctx.lineWidth = p.group === 'tack' ? 1.3 : 2; line(ctx, o.pts, o.closed);
    }
    hairs(ctx, rig, '#c6e2dd', 0.35); paintDetails(ctx, rig, '#d5e7df', 1.3);
    ctx.strokeStyle = FAINT; ctx.lineWidth = 1; ctx.setLineDash([16, 5, 3, 5]);
    line(ctx, [[hole.cx - S * 1.7, rig.joints.saddle[1]], [hole.cx + S * 1.7, rig.joints.saddle[1]]]);
    line(ctx, [[rig.joints.saddle[0], hole.cy - hole.r], [rig.joints.saddle[0], rig.ground + S * 0.2]]); ctx.setLineDash([]);
    for (const [x, y] of [rig.joints.saddle, rig.joints.hand, rig.joints.eye, ...rig.joints.hoofs]) {
      circle(ctx, x, y, S * 0.035, null, WHITE, 1); ctx.strokeStyle = FAINT; line(ctx, [[x - 12, y], [x + 12, y]]); line(ctx, [[x, y - 12], [x, y + 12]]);
    }
    dimension(ctx, [hole.cx - S * 0.9, rig.ground], [hole.cx + S * 0.9, rig.ground], S * 0.22);
    dimension(ctx, rig.joints.hatTop, [rig.joints.hatTop[0], rig.ground], -S * 1.2);
  },
};

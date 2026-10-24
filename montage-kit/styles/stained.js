import { rng } from '../plates/lib.js';
import { partPath, outlinePts, paintDetails } from '../engine/rider.mjs';
import { TAU, cached, ringLayer, circle, polygon, polar, line, box, hairs, dust, ground, mod } from './_a-lib.js';

const LEAD = '#252c28';
const GLASS = ['#b94629', '#d1a438', '#356f8b', '#457563', '#c8b97c', '#783b2a'];
function pane(ctx, pts, color, width = 5) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const g = ctx.createLinearGradient(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
  g.addColorStop(0, color); g.addColorStop(0.47, color); g.addColorStop(0.5, '#e5da9b'); g.addColorStop(0.54, color); g.addColorStop(1, color);
  polygon(ctx, pts, g, LEAD, width);
  ctx.strokeStyle = '#fbefb448'; ctx.lineWidth = 1; line(ctx, pts.slice(0, 3));
}
function glassTooth(ctx, w, h) {
  const tile = cached('glass-seeds', 256, 256, b => {
    const r = rng(991);
    for (let i = 0; i < 1900; i++) {
      b.fillStyle = r() < 0.5 ? '#e9eab426' : '#173c2a25'; b.fillRect(r() * 256, r() * 256, 1, 1 + r() * 3);
    }
    b.strokeStyle = '#e9eab420'; b.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) { const x = r() * 256, y = r() * 256; b.beginPath(); b.ellipse(x, y, 10 + r() * 30, 3, r(), 0, TAU); b.stroke(); }
  });
  ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, w, h);
}
export default {
  id: 'stained', ringName: '教堂玫瑰窗',
  drawRing(ctx, w, h, t, hole) {
    ringLayer(ctx, w, h, hole, 'stained', (b, hole) => {
      const { cx, cy, r } = hole, R = Math.hypot(w / 2, h / 2) + 70;
      b.fillStyle = LEAD; b.fillRect(0, 0, w, h);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 32; i++) {
        const a = i / 32 * TAU, da = TAU / 32, r0 = r + j * (R - r) / 4, r1 = r + (j + 1) * (R - r) / 4;
        pane(b, [polar(hole, r0, a), polar(hole, r1, a), polar(hole, r1, a + da), polar(hole, r0, a + da)], GLASS[(i + j * 2) % GLASS.length], 8);
      }
      // Each lancet contains three pieces of glass and a small circular eye.
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU, rr = r + 70, tip = R - 125, mid = (rr + tip) / 2;
        const near = polar(hole, rr, a), far = polar(hole, tip, a);
        const left = polar(hole, mid, a - 0.115), right = polar(hole, mid, a + 0.115);
        pane(b, [near, left, far, right], i % 2 ? '#bf8d2d' : '#33768a', 13);
        const center = polar(hole, mid, a);
        b.strokeStyle = LEAD; b.lineWidth = 7; line(b, [left, right]); line(b, [near, far]);
        circle(b, center[0], center[1], 30, i % 2 ? '#993f2a' : '#d5b957', LEAD, 8);
      }
      for (let j = 0; j < 3; j++) circle(b, cx, cy, r + 12 + j * 16, null, j === 1 ? '#bca46b' : LEAD, 9);
      circle(b, cx, cy, R - 52, null, '#d2bd76', 14); circle(b, cx, cy, R - 68, null, LEAD, 8);
      glassTooth(b, w, h);
    });
  },
  drawInner(ctx, w, h, t, hole, rig) {
    const S = rig.s, hz = rig.ground - S * 0.72, random = rng(29);
    ctx.fillStyle = '#8bb9ac'; ctx.fillRect(0, 0, w, h);
    for (let j = 0; j < 4; j++) for (let i = -1; i < 11; i++) {
      const xx = i * S * 0.7 - mod(rig.scroll * 0.16, S * 0.7), yy = hz - S * 2.6 + j * S * 0.65;
      pane(ctx, [[xx, yy], [xx + S * 0.7, yy], [xx + S * 0.7, yy + S * 0.65], [xx, yy + S * 0.65]], ['#6c9b9c', '#a8c7af', '#618f9a', '#99baa0'][(i + j + 12) % 4], 3.5);
    }
    for (let i = 0; i < 15; i++) {
      const x = mod(i * S * 1.3 - rig.scroll * 0.3, S * 19.5) - S * 3;
      pane(ctx, [[x - S * 0.7, hz], [x, hz - S * (0.4 + random() * 0.35)], [x + S, hz]], i % 2 ? '#567c58' : '#b5a655', 5);
    }
    for (let j = 0; j < 3; j++) for (let i = -1; i < 20; i++) {
      const x = i * S * 0.55 - mod(rig.scroll, S * 0.55), y = hz + j * S * 0.48;
      pane(ctx, [[x, y], [x + S * 0.6, y], [x + S * 0.4, y + S * 0.5], [x - S * 0.2, y + S * 0.5]], j % 2 ? '#799250' : '#b6b367', 4);
    }
    dust(ctx, rig, t, '#e5d9a5', true);
    for (const p of rig.parts) {
      ctx.save(); partPath(ctx, p); ctx.fillStyle = p.group === 'horse' ? '#bb6b32' : '#c8ac57'; ctx.fill(); ctx.clip();
      const [x0, y0, x1, y1] = box(p), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      const colors = p.group === 'horse' ? ['#c38a48', '#a8542b', '#ce9d53', '#86442b'] : p.group === 'rider' ? ['#bfbb70', '#617e6e', '#d7c275', '#375c59'] : ['#9f4328', '#c16c3c', '#ba522f', '#773c29'];
      for (let i = 0; i < 4; i++) pane(ctx, [corners[i], corners[(i + 1) % 4], [cx + 4, cy - 6]], colors[i], 3);
      ctx.restore(); const o = outlinePts(p); ctx.strokeStyle = LEAD; ctx.lineWidth = 4; line(ctx, o.pts, o.closed);
    }
    hairs(ctx, rig, LEAD, 0.75); paintDetails(ctx, rig, '#3b3025', 2.2); glassTooth(ctx, w, h);
  },
};

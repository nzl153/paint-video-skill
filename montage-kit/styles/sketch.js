// Graphite on drawing paper. Ring: a roll of tape drawn with tonal hatching on the desk.
// Hole: the rider in pencil, outlines gone over two or three times, hatching by tone, the prairie
// sketched in behind. Lines "boil" (redraw slightly differently) twelve times a second, like real animation.
import { createCanvas } from '@napi-rs/canvas';
import { rng } from '../plates/lib.js';
import { partPath, strandPath, lassoPath, outlinePts } from '../engine/rider.mjs';

const GRAPHITE = (a) => `rgba(38,38,44,${a})`;

let paper;
function paperTex(w, h) {
  if (paper) return paper;
  paper = createCanvas(w, h);
  const ctx = paper.getContext('2d');
  ctx.fillStyle = '#f1ede4';
  ctx.fillRect(0, 0, w, h);
  const r = rng(5);
  // Tooth of the paper: tiny light and dark flecks.
  for (let i = 0; i < 60000; i++) {
    ctx.fillStyle = r() < 0.5 ? `rgba(255,255,255,${r() * 0.5})` : `rgba(120,110,95,${r() * 0.12})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  return paper;
}

// A pencil line along pts: wobbles a little, pressure fades at the ends.
function pencil(ctx, pts, r, width, alpha, closed = false) {
  const P = closed ? [...pts, pts[0]] : pts;
  const j = width * 0.8;
  ctx.strokeStyle = GRAPHITE(alpha);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const ox = (r() - 0.5) * j * 2, oy = (r() - 0.5) * j * 2;
  P.forEach(([x, y], i) => {
    const xx = x + ox + (r() - 0.5) * j, yy = y + oy + (r() - 0.5) * j;
    i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
  });
  ctx.stroke();
}

// Parallel hatching across a rectangle, used inside clips.
function hatch(ctx, x0, y0, x1, y1, angle, gap, r, width, alpha) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const R = Math.hypot(x1 - x0, y1 - y0) / 2;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  ctx.strokeStyle = GRAPHITE(alpha);
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let d = -R; d <= R; d += gap * (0.8 + r() * 0.4)) {
    const px = cx - sa * d, py = cy + ca * d;
    const l = R * (0.9 + r() * 0.2);
    ctx.moveTo(px - ca * l, py - sa * l);
    ctx.lineTo(px + ca * l + (r() - 0.5) * 4, py + sa * l + (r() - 0.5) * 4);
  }
  ctx.stroke();
}

export default {
  id: 'sketch', ringName: 'roll of tape',
  drawRing(ctx, w, h, t, hole, info) {
    const { cx, cy, r } = hole;
    const r0 = rng(Math.floor(t * 12) + 1000);
    ctx.drawImage(paperTex(w, h), 0, 0);
    const R1 = r * 2.85;
    // The desk around it, hatched loosely in the corners.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.arc(cx, cy, R1 * 1.02, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
    hatch(ctx, 0, 0, w, h, -0.5, 12, r0, 1.2, 0.12);
    ctx.restore();
    // Cast shadow of the roll, down and right.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + r * 0.25, cy + r * 0.3, R1, 0, Math.PI * 2);
    ctx.arc(cx, cy, R1, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
    hatch(ctx, cx - R1, cy - R1, cx + R1 * 1.3, cy + R1 * 1.3, 0.6, 5, r0, 1.4, 0.45);
    hatch(ctx, cx - R1, cy - R1, cx + R1 * 1.3, cy + R1 * 1.3, -0.4, 7, r0, 1.2, 0.3);
    ctx.restore();
    // The roll: wound layers as near-concentric circles, darker toward the core and on the shadow side.
    for (let i = 0; i < 70; i++) {
      const rr = r * 1.18 + (R1 - r * 1.18) * (i / 69);
      const a0 = r0() * Math.PI * 2;
      const span = Math.PI * (1.2 + r0() * 0.8);
      ctx.strokeStyle = GRAPHITE(0.08 + 0.18 * r0());
      ctx.lineWidth = 1 + r0();
      ctx.beginPath();
      ctx.arc(cx + (r0() - 0.5) * 2, cy + (r0() - 0.5) * 2, rr, a0, a0 + span);
      ctx.stroke();
    }
    // Shading on the far side of the face: short arcs, heavier toward the lower right.
    for (let i = 0; i < 160; i++) {
      const rr = r * 1.2 + r0() * (R1 - r * 1.2);
      const a0 = -0.6 + r0() * 2.6;
      ctx.strokeStyle = GRAPHITE(0.12 + 0.25 * r0());
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, a0, a0 + 0.2 + r0() * 0.5);
      ctx.stroke();
    }
    // Outer edge gone over firmly, the cardboard core around the hole.
    for (let k = 0; k < 3; k++) pencil(ctx, circle(cx, cy, R1, 90), r0, 2.4 - k * 0.5, 0.75 - k * 0.15, true);
    for (let k = 0; k < 2; k++) pencil(ctx, circle(cx, cy, r * 1.18, 60), r0, 2, 0.7, true);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2);
    ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
    hatch(ctx, cx - r * 1.2, cy - r * 1.2, cx + r * 1.2, cy + r * 1.2, 1.2, 5, r0, 1.2, 0.4);
    ctx.restore();
    for (let k = 0; k < 2; k++) pencil(ctx, circle(cx, cy, r, 60), r0, 2.2, 0.8, true);
    // The loose end of the tape peeling off toward the right edge.
    const tx = cx + R1 * 0.72, ty = cy - R1 * 0.69;
    const strip = [[tx, ty], [tx + r * 1.6, ty - r * 0.5], [w + 40, ty - r * 0.7], [w + 40, ty - r * 0.05], [tx + r * 1.4, ty + r * 0.3], [tx + r * 0.5, ty + r * 0.5]];
    ctx.fillStyle = 'rgba(241,237,228,0.92)';
    ctx.beginPath();
    strip.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    pencil(ctx, strip.slice(0, 3), r0, 2, 0.7);
    pencil(ctx, strip.slice(3), r0, 2, 0.7);
    // Construction lines left in, the way a draughtsman would.
    pencil(ctx, [[cx - R1 * 1.1, cy], [cx + R1 * 1.1, cy]], r0, 1, 0.12);
    pencil(ctx, [[cx, cy - R1 * 1.1], [cx, cy + R1 * 1.1]], r0, 1, 0.12);
  },
  drawInner(ctx, w, h, t, hole, rig, info) {
    const { cx, cy, r } = hole;
    const r0 = rng(Math.floor(t * 12) + 2000);
    ctx.drawImage(paperTex(w, h), 0, 0);
    const S = rig.s;
    const left = cx - r, right = cx + r;
    // Horizon and far mesas, sliding slowly.
    const hz = rig.ground - S * 0.75;
    pencil(ctx, [[left, hz], [right, hz]], r0, 1.4, 0.35);
    const mesas = rng(17);
    for (let i = 0; i < 6; i++) {
      const base = mesas() * 2600;
      const x = left + ((base - rig.scroll * 0.2) % 2600 + 2600) % 2600 - 500;
      const mw = S * (1.2 + mesas() * 1.4), mh = S * (0.3 + mesas() * 0.45);
      const top = [[x, hz], [x + mw * 0.15, hz - mh], [x + mw * 0.75, hz - mh], [x + mw, hz]];
      pencil(ctx, top, r0, 1.6, 0.5);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + mw * 0.45, hz); ctx.lineTo(x + mw * 0.75, hz - mh); ctx.lineTo(x + mw, hz); ctx.closePath();
      ctx.clip();
      hatch(ctx, x, hz - mh, x + mw, hz, 1.1, 5, r0, 1, 0.35);
      ctx.restore();
    }
    // Ground: fast strokes of grass and stones whipping past.
    const near = rng(29);
    for (let i = 0; i < 90; i++) {
      const base = near() * 2400;
      const x = left + ((base - rig.scroll) % 2400 + 2400) % 2400 - 400;
      const y = rig.ground + Math.pow(near(), 1.3) * S * 0.9 - S * 0.05;
      const len = S * (0.08 + near() * 0.25);
      pencil(ctx, [[x, y], [x + len, y + (near() - 0.5) * 4]], r0, 1.2 + near(), 0.25 + near() * 0.3);
    }
    for (let i = 0; i < 40; i++) {
      const base = near() * 2400;
      const x = left + ((base - rig.scroll * 1.1) % 2400 + 2400) % 2400 - 400;
      const y = rig.ground + near() * S * 0.4;
      for (let k = 0; k < 4; k++) pencil(ctx, [[x + k * 3, y], [x + k * 4 - 6 + near() * 12, y - S * (0.06 + near() * 0.1)]], r0, 1.2, 0.45);
    }
    // Dust behind the planted hooves: scribbled loops.
    rig.joints.hoofs.forEach(([hx, hy], i) => {
      if (!rig.contacts[i]) return;
      for (let k = 0; k < 3; k++) {
        const rr = S * (0.04 + k * 0.03) * rig.contacts[i];
        pencil(ctx, circle(hx - S * 0.08 - k * S * 0.06, hy - rr * 0.6, rr, 14), r0, 1.2, 0.35);
      }
    });
    // Shadow under the horse.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, rig.ground + S * 0.04, S * 0.9, S * 0.07, 0, 0, Math.PI * 2);
    ctx.clip();
    hatch(ctx, cx - S, rig.ground - S * 0.1, cx + S, rig.ground + S * 0.2, 0.2, 4, r0, 1.2, 0.45);
    ctx.restore();

    // Each part in depth order: paper-white fill, hatching by tone, then its outline, so nearer
    // parts cover the lines of the ones behind them.
    for (const p of rig.parts) {
      ctx.save();
      partPath(ctx, p);
      ctx.fillStyle = 'rgba(241,237,228,1)';
      ctx.fill();
      ctx.clip();
      const xs = p.pts.map((q) => q[0]), ys = p.pts.map((q) => q[1]);
      const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      const gap = 3 + p.tone * 9;
      hatch(ctx, ...box, 0.85, gap, r0, 1.1, 0.5);
      if (p.tone < 0.4) hatch(ctx, ...box, -0.6, gap * 1.2, r0, 1.1, 0.45);
      if (p.name === 'body') {
        ctx.beginPath();
        ctx.rect(box[0], (box[1] + box[3]) / 2 + (box[3] - box[1]) * 0.1, box[2] - box[0], box[3]);
        ctx.clip();
        hatch(ctx, ...box, -0.5, 5, r0, 1.1, 0.4);
      }
      ctx.restore();
      const o = outlinePts(p);
      pencil(ctx, o.pts, r0, 2.2, 0.8, o.closed);
      if (p.group !== 'tack') pencil(ctx, o.pts, r0, 1.2, 0.35, o.closed);
    }
    for (const d of rig.details) pencil(ctx, d.pts, r0, 1.2 + d.weight * 0.6, 0.6, d.closed);
    for (const st of rig.strands) {
      ctx.lineWidth = Math.max(1.2, st.w * 0.35);
      ctx.strokeStyle = GRAPHITE(0.7);
      strandPath(ctx, st);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = GRAPHITE(0.75);
    lassoPath(ctx, rig);
    ctx.stroke();
    // Speed lines trailing the horse.
    for (let i = 0; i < 6; i++) {
      const y = cy - S * 0.4 + i * S * 0.18;
      const x = cx - S * 1.5 - r0() * S * 0.3;
      pencil(ctx, [[x, y], [x - S * (0.4 + r0() * 0.4), y]], r0, 1.4, 0.3);
    }
  },
};

function circle(cx, cy, r, n) {
  return Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r]);
}

import { rng } from '../plates/lib.js';
import { partPath, paintDetails, outlinePts } from '../engine/rider.mjs';
import { TAU, ringLayer, paper, circle, line, box, hairs, dust, ground, hills } from './_a-lib.js';

export default {
  id: 'ink', ringName: '一笔圆相',
  drawRing(ctx, w, h, t, hole) {
    ringLayer(ctx, w, h, hole, 'ink', (b, hole) => {
      paper(b, w, h, '#ece9dc');
      const { cx, cy, r } = hole, random = rng(311);
      // A pressure-varying brush sweep; the two ends never join.
      const point = (u, v, bleed = 0) => {
        const a = -0.62 + u * 5.86;
        const pressure = (1 - Math.pow(u, 3.8));
        const width = 34 + 250 * pressure + 20 * Math.sin(u * 14);
        const center = r + 25 + width * 0.42 + 17 * Math.sin(u * 9);
        const rag = Math.sin(u * 37 + v * 8) * 3.5 + Math.sin(u * 373 + v * 15) * 1.2;
        const radius = center + v * (width / 2 + bleed) + rag;
        return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius * (1 + 0.018 * Math.sin(u * 6))];
      };
      const sweep = (bleed, color) => {
        b.beginPath();
        for (let i = 0; i <= 500; i++) { const p = point(i / 500, 1, bleed); i ? b.lineTo(...p) : b.moveTo(...p); }
        for (let i = 500; i >= 0; i--) b.lineTo(...point(i / 500, -1, bleed));
        const cap = point(0, 0, bleed), outer = point(0, 1, bleed);
        b.quadraticCurveTo(cap[0] - 18, cap[1] - 42, ...outer);
        b.closePath(); b.fillStyle = color; b.fill();
      };
      for (const [spread, color] of [[15, '#343d3010'], [9, '#343d3018'], [4, '#222b2340'], [0, '#121914']]) sweep(spread, color);
      b.lineCap = 'round';
      for (let i = 0; i < 420; i++) {
        const v = random() * 1.92 - 0.96, start = random() ** 0.45 * 0.94;
        const end = Math.min(1, start + 0.03 + random() ** 2 * 0.28);
        b.strokeStyle = `rgba(236,233,220,${0.08 + start ** 4 * random() * 0.78})`;
        b.lineWidth = 0.4 + random() ** 2 * (1 + start * 5);
        line(b, Array.from({ length: 40 }, (_, k) => point(start + (end - start) * k / 39, v + Math.sin(k * 0.2 + i) * 0.009)));
      }
      // Dry bristles lift off into separate hairs at the end of the stroke.
      for (let i = 0; i < 90; i++) {
        const v = random() * 2 - 1, end = 0.91 + random() * 0.09, start = 0.59 + random() * 0.34;
        b.strokeStyle = `rgba(236,233,220,${0.2 + random() * 0.65})`; b.lineWidth = 0.6 + random() * 2.8;
        line(b, Array.from({ length: 40 }, (_, k) => point(start + (end - start) * k / 39, v + Math.sin(k * 0.15 + i) * 0.018)));
      }
      for (let i = 0; i < 1500; i++) {
        const u = random(), v = random() < 0.5 ? -1 : 1, p = point(u, v, random() * 12);
        circle(b, p[0], p[1], 0.4 + random() * 1.5, '#242d2420');
      }
      b.save(); b.translate(cx - r * 1.92, cy + r * 0.87); b.rotate(-0.06);
      b.fillStyle = '#ad4c3528'; b.fillRect(0, 0, 64, 69);
      for (let i = 0; i < 150; i++) { b.fillStyle = '#ece9dc70'; b.fillRect(random() * 64, random() * 69, 1 + random() * 4, 1 + random() * 2); }
      b.restore();
    });
  },
  drawInner(ctx, w, h, t, hole, rig) {
    paper(ctx, w, h, '#ece9dc');
    hills(ctx, w, rig, '#7d898023', 0.15, 1.2, 7);
    hills(ctx, w, rig, '#5a6d6240', 0.32, 0.65, 11);
    const S = rig.s, r = rng(51 + Math.floor(t * 12));
    const mist = ctx.createLinearGradient(0, rig.ground - S, 0, rig.ground - S * 0.4);
    mist.addColorStop(0, '#ece9dc00'); mist.addColorStop(1, '#ece9dc');
    ctx.fillStyle = mist; ctx.fillRect(0, rig.ground - S, w, S);
    ground(ctx, w, rig, '#394c3c75', 130);
    for (let i = 0; i < 28; i++) {
      const x = ((i * 173 - rig.scroll) % w + w) % w, y = rig.ground + (i % 5) * 17;
      ctx.strokeStyle = '#283d2c90'; ctx.lineWidth = 1.5;
      line(ctx, [[x - 9, y], [x - 3, y - 22], [x - 12, y - 39]]);
      line(ctx, [[x - 3, y - 22], [x + 7, y - 29]]);
    }
    dust(ctx, rig, t, '#73786848');
    for (const p of rig.parts) {
      ctx.save(); partPath(ctx, p);
      const [x0, y0, x1, y1] = box(p);
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, p.group === 'rider' ? '#101c18' : '#737e72');
      g.addColorStop(0.55, '#35453b'); g.addColorStop(1, '#101a15');
      ctx.fillStyle = g; ctx.fill(); ctx.clip();
      ctx.strokeStyle = '#e6e6d38a'; ctx.lineWidth = 0.6 + r() * 1.4;
      for (let i = 0; i < 100; i++) {
        const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
        line(ctx, [[x, y], [x + 7 + r() * 29, y - 4 - r() * 12]]);
      }
      ctx.restore();
      const o = outlinePts(p); ctx.strokeStyle = '#17221ba0'; ctx.lineWidth = 1.6; line(ctx, o.pts, o.closed);
    }
    hairs(ctx, rig, '#14231b', 0.75);
    paintDetails(ctx, rig, '#d7decbad', 1.9);
    paintDetails(ctx, { ...rig, details: rig.details.filter(d => /eye|nostril|mouth/.test(d.name)) }, '#101710', 2.5);
  },
};

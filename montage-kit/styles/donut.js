// Style 0, where the film starts and ends. Ring: the sugar-glazed donut on the bakery counter.
// Hole: a gingerbread cowboy, piped with white icing, galloping across parchment dusted with sugar.
import { createCanvas } from '@napi-rs/canvas';
import { rng, hash, grain } from '../plates/lib.js';
import { drawDonutScene } from '../plates/donutscene.js';
import { paintRider, paintDetails, lassoPath } from '../engine/rider.mjs';
import { HOLE_R } from '../engine/timeline.mjs';

export default {
  id: 'donut', ringName: 'glazed donut',
  drawRing(ctx, w, h, t, hole, info) {
    const jolt = info.bitten ? Math.exp(-info.sinceBite * 9) * 0.025 : 0;
    drawDonutScene(ctx, w, h, t, { cx: hole.cx, cy: hole.cy, r: HOLE_R }, { zoom: info.zoom + jolt, bitten: info.bitten });
  },
  drawInner(ctx, w, h, t, hole, rig, info) {
    const { cx, cy, r } = hole;
    // Parchment, warm and a little crinkled, lit from the window side.
    const bg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    bg.addColorStop(0, '#f6ead2');
    bg.addColorStop(1, '#e2cfa9');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // Everything on the paper slides left with the gallop; far things slower.
    const S = rig.s;
    const far = rng(3);
    // A low range of bread loaves on the horizon, dusted on top.
    for (let i = 0; i < 9; i++) {
      const base = far() * 3000;
      const x = cx - r * 1.3 + ((base - rig.scroll * 0.25) % 3000 + 3000) % 3000 - 600;
      const lw = S * (0.9 + far() * 0.8), lh = S * (0.35 + far() * 0.25);
      const y = rig.ground - S * 0.65;
      const g = ctx.createLinearGradient(0, y - lh, 0, y);
      // Pale and soft: they sit far back, out of focus, so the cookie reads in front of them.
      g.addColorStop(0, 'rgba(232,196,140,0.75)');
      g.addColorStop(1, 'rgba(200,150,95,0.75)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, lw / 2, lh, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,248,235,0.6)';
      ctx.lineWidth = S * 0.03;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(x - lw * 0.2 + k * lw * 0.2, y - lh * 0.75, lw * 0.06, lh * 0.08, -0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Ground: a strip of crumb and sugar where the hooves strike.
    const groundG = ctx.createLinearGradient(0, rig.ground - S * 0.1, 0, rig.ground + S * 0.6);
    groundG.addColorStop(0, 'rgba(214,180,128,0)');
    groundG.addColorStop(0.3, 'rgba(214,180,128,0.6)');
    groundG.addColorStop(1, 'rgba(190,150,96,0.8)');
    ctx.fillStyle = groundG;
    ctx.fillRect(0, rig.ground - S * 0.1, w, S * 1.2);
    const near = rng(9);
    for (let i = 0; i < 260; i++) {
      const base = near() * 2400;
      const x = ((base - rig.scroll) % 2400 + 2400) % 2400 + cx - 1200;
      const y = rig.ground - S * 0.05 + Math.pow(near(), 1.5) * S * 0.7;
      const sz = 2 + near() * 5;
      ctx.fillStyle = near() < 0.6 ? `rgba(255,253,245,${0.6 + near() * 0.4})` : `rgba(160,100,50,${0.5 + near() * 0.4})`;
      ctx.fillRect(x, y, sz, sz * (0.7 + near() * 0.6));
    }
    // Sugar kicked up behind the planted hooves.
    rig.joints.hoofs.forEach(([hx, hy], i) => {
      if (!rig.contacts[i]) return;
      const d = rng(i * 31 + Math.floor(t * 30));
      for (let k = 0; k < 14; k++) {
        const a = Math.PI + 0.2 + d() * 0.9;
        const dist = S * (0.05 + d() * 0.3) * rig.contacts[i];
        ctx.fillStyle = `rgba(255,252,240,${0.5 + d() * 0.5})`;
        ctx.fillRect(hx + Math.cos(a) * dist, hy - Math.abs(Math.sin(a)) * dist * 0.6, 3, 3);
      }
    });

    // The gingerbread rider: soft shadow, baked body, a bevel of light, speckles, then icing.
    const shadow = createCanvas(w, h);
    paintRider(shadow.getContext('2d'), rig, 'rgba(70,35,10,0.45)');
    ctx.save();
    ctx.filter = 'blur(10px)';
    ctx.drawImage(shadow, S * 0.05, S * 0.08);
    ctx.restore();
    // Cookie thickness: the darker baked side shows below and right of the face.
    const side = createCanvas(w, h);
    const sd = side.getContext('2d');
    const depth = Math.max(4, S * 0.045);
    for (let k = depth; k > 0; k -= 1.5) {
      sd.save();
      sd.translate(k * 0.6, k);
      paintRider(sd, rig, k > depth * 0.6 ? '#5e3214' : '#7a4219');
      sd.restore();
    }
    ctx.drawImage(side, 0, 0);
    const body = createCanvas(w, h);
    const b = body.getContext('2d');
    paintRider(b, rig, '#b06a30');
    b.globalCompositeOperation = 'source-atop';
    const lit = b.createLinearGradient(cx - r, cy - r, cx + r * 0.6, cy + r * 0.6);
    lit.addColorStop(0, 'rgba(240,170,100,0.7)');
    lit.addColorStop(0.5, 'rgba(200,120,60,0.15)');
    lit.addColorStop(1, 'rgba(80,35,10,0.5)');
    b.fillStyle = lit;
    b.fillRect(0, 0, w, h);
    const sp = rng(77);
    for (let i = 0; i < 900; i++) {
      b.fillStyle = sp() < 0.7 ? 'rgba(90,45,15,0.35)' : 'rgba(255,220,170,0.3)';
      b.fillRect(cx - r + sp() * r * 2, cy - r + sp() * r * 2, 2 + sp() * 2, 2 + sp() * 2);
    }
    // Inner edge shading: a blurred copy of the silhouette, inverted, darkens the rim of every part.
    const edge = createCanvas(w, h);
    const e = edge.getContext('2d');
    e.fillStyle = 'rgba(60,25,5,0.8)';
    e.fillRect(0, 0, w, h);
    e.globalCompositeOperation = 'destination-out';
    e.filter = 'blur(6px)';
    e.drawImage(body, 0, 0);
    b.globalCompositeOperation = 'source-atop';
    b.drawImage(edge, 0, 0);
    ctx.drawImage(body, 0, 0);
    // Royal icing: piped outlines and dots.
    // Piped icing sits proud of the cookie: a soft shadow under each line, then the sugar.
    const ice = Math.max(4, S * 0.026);
    ctx.save();
    ctx.translate(2, 3);
    paintDetails(ctx, rig, 'rgba(70,30,8,0.35)', ice);
    ctx.restore();
    paintDetails(ctx, rig, '#fbf6ec', ice);
    paintDetails(ctx, rig, 'rgba(255,255,255,0.9)', ice * 0.35);
    // Icing piped round the hat brim and the cuffs, and a scallop along the saddle blanket.
    for (const p of rig.parts) {
      if (!['hatBrim', 'saddleBlanket', 'bandana'].includes(p.name)) continue;
      ctx.strokeStyle = '#fbf6ec';
      ctx.lineWidth = ice * 0.8;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.stroke();
    }
    ctx.save();
    ctx.strokeStyle = 'rgba(255,252,246,0.95)';
    ctx.lineWidth = Math.max(3, S * 0.02);
    ctx.lineCap = 'round';
    lassoPath(ctx, rig);
    ctx.stroke();
    ctx.restore();
    const dots = [rig.joints.saddle, rig.joints.hatTop];
    ctx.fillStyle = '#f2e4d0';
    for (const [x, y] of dots) { ctx.beginPath(); ctx.arc(x, y, S * 0.022, 0, Math.PI * 2); ctx.fill(); }
    // Light from the same window as the counter.
    const glow = ctx.createRadialGradient(cx - r * 0.5, cy - r * 0.6, 0, cx, cy, r * 1.3);
    glow.addColorStop(0, 'rgba(255,230,180,0.18)');
    glow.addColorStop(1, 'rgba(60,30,10,0.18)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, Math.floor(t * 30) + 41, 0.05);
  },
};

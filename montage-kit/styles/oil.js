import { rng } from '../plates/lib.js';
import { partPath, outlinePts, paintDetails } from '../engine/rider.mjs';
import { TAU, cached, ringLayer, circle, line, box, hairs, dust, ground, hills, polar, mod } from './_a-lib.js';

function canvasTooth(ctx, w, h) {
  const tex = cached('oil-weave', 192, 192, b => {
    b.strokeStyle = '#dfc8a915'; b.lineWidth = 0.6;
    b.beginPath();
    for (let x = 0; x < 192; x += 3) { b.moveTo(x, 0); b.lineTo(x, 192); b.moveTo(0, x); b.lineTo(192, x); }
    b.stroke();
  });
  ctx.fillStyle = ctx.createPattern(tex, 'repeat'); ctx.fillRect(0, 0, w, h);
}
export default {
  id: 'oil', ringName: '油画眼睛的虹膜',
  drawRing(ctx, w, h, t, hole) {
    ringLayer(ctx, w, h, hole, 'oil', (b, hole) => {
      const { cx, cy, r } = hole, R = r * 1.57, random = rng(473);
      const skin = b.createLinearGradient(0, 0, w, h);
      skin.addColorStop(0, '#b47a4d'); skin.addColorStop(0.33, '#805035'); skin.addColorStop(0.7, '#39291e'); skin.addColorStop(1, '#1c1d17');
      b.fillStyle = skin; b.fillRect(0, 0, w, h);
      b.lineCap = 'round';
      for (let i = 0; i < 1100; i++) {
        const x = random() * w, y = random() * h, len = 14 + random() * 70;
        b.strokeStyle = ['#d4a16b26', '#ecbd8320', '#331e1835', '#96724325'][i % 4]; b.lineWidth = 3 + random() * 16;
        line(b, [[x, y], [x + len, y + (y < cy ? -1 : 1) * len * 0.35]]);
      }
      const almond = () => {
        b.beginPath(); b.moveTo(cx - r * 2.39, cy + 24);
        b.bezierCurveTo(cx - r * 1.4, cy - r * 1.82, cx + r * 1.3, cy - r * 1.8, cx + r * 2.4, cy + 13);
        b.bezierCurveTo(cx + r * 1.23, cy + r * 1.67, cx - r * 1.25, cy + r * 1.81, cx - r * 2.39, cy + 24); b.closePath();
      };
      almond();
      const white = b.createLinearGradient(0, 0, w, h);
      white.addColorStop(0, '#c3ae82'); white.addColorStop(0.3, '#ead6a4'); white.addColorStop(0.65, '#8d8766'); white.addColorStop(1, '#473f2c');
      b.fillStyle = white; b.fill(); b.save(); b.clip();
      for (let i = 0; i < 1200; i++) {
        const x = random() * w, y = random() * h, len = 10 + random() * 40;
        b.strokeStyle = ['#efe0b740', '#9d9e7840', '#70594828', '#f1d2a82a'][i % 4]; b.lineWidth = 1 + random() * 6;
        b.beginPath(); b.moveTo(x, y); b.quadraticCurveTo(x + len * 0.5, y + (y - cy) * 0.012, x + len, y + (y - cy) * 0.025); b.stroke();
      }
      for (const side of [-1, 1]) {
        const tear = b.createRadialGradient(cx + side * r * 2.36, cy + 20, 0, cx + side * r * 2.36, cy + 20, r * 0.9);
        tear.addColorStop(0, '#a9573b9a'); tear.addColorStop(0.6, '#9e735122'); tear.addColorStop(1, '#9e735100'); b.fillStyle = tear; b.fillRect(0, 0, w, h);
        for (let i = 0; i < 16; i++) {
          const x = cx + side * r * (1.64 + random() * 0.62), y = cy + (random() - 0.5) * r * 0.65;
          b.beginPath(); b.moveTo(x, y); b.bezierCurveTo(x - side * 14, y - 11, x - side * 29, y + 9, x - side * 48, y - 1);
          b.strokeStyle = '#a76e5940'; b.lineWidth = 0.6 + random() * 1.6; b.stroke();
        }
      }
      const iris = b.createRadialGradient(cx - 100, cy - 70, r * 0.7, cx, cy, R);
      iris.addColorStop(0, '#392516'); iris.addColorStop(0.37, '#ba883b'); iris.addColorStop(0.58, '#84804a'); iris.addColorStop(0.86, '#4b5136'); iris.addColorStop(1, '#1c2a22');
      circle(b, cx, cy, R, iris);
      for (let i = 0; i < 2100; i++) {
        const a = random() * TAU, rr = r - 8 + random() * (R - r), len = 7 + random() ** 2 * 80;
        const p0 = polar(hole, rr, a), p1 = polar(hole, Math.min(R - 3, rr + len), a + (random() - 0.5) * 0.055);
        b.strokeStyle = ['#ddb76d80', '#acaa6d75', '#26382b99', '#41291980', '#efd39b75'][i % 5];
        b.lineWidth = 1 + random() ** 2 * 9;
        b.beginPath(); b.moveTo(...p0); b.quadraticCurveTo((p0[0] + p1[0]) / 2 + 9, (p0[1] + p1[1]) / 2 - 7, ...p1); b.stroke();
      }
      for (let i = 0; i < 240; i++) {
        const a = i / 240 * TAU, rr = r + 51 + Math.sin(a * 19) * 13 + random() * 9;
        b.strokeStyle = '#e9b96c9a'; b.lineWidth = 2 + random() * 4;
        line(b, [polar(hole, rr, a), polar(hole, rr + random() * 28, a + 0.015)]);
      }
      circle(b, cx, cy, r + 2, null, '#142019', 14);
      const lidShadow = b.createLinearGradient(0, 0, 0, h);
      lidShadow.addColorStop(0, '#151b16d9'); lidShadow.addColorStop(0.3, '#17201730'); lidShadow.addColorStop(0.75, '#090d0900'); lidShadow.addColorStop(1, '#ead09926');
      b.fillStyle = lidShadow; b.fillRect(0, 0, w, h);
      // Broken, loaded brush marks form the corneal reflection.
      for (let k = 0; k < 12; k++) {
        b.strokeStyle = `rgba(255,231,179,${0.25 + random() * 0.4})`; b.lineWidth = 5 + random() * 8;
        line(b, [[cx - r * 0.96 + k * 5, cy - r * 0.93], [cx - r * 0.86 + k * 5, cy - r * 0.99]]);
      }
      b.restore();
      for (const [width, color] of [[72, '#55352215'], [52, '#5a35222a'], [33, '#5b36263a'], [18, '#34241b90'], [7, '#251e18']]) {
        almond(); b.strokeStyle = color; b.lineWidth = width; b.stroke();
      }
      b.beginPath(); b.moveTo(cx - r * 2.36, cy + 45); b.bezierCurveTo(cx - r * 1.2, cy + r * 1.87, cx + r * 1.35, cy + r * 1.75, cx + r * 2.37, cy + 35);
      b.strokeStyle = '#c68e6399'; b.lineWidth = 17; b.stroke();
      b.beginPath(); b.moveTo(cx - r * 2.35, cy - 4); b.bezierCurveTo(cx - r * 1.3, cy - r * 1.99, cx + r * 1.25, cy - r * 1.94, cx + r * 2.43, cy - 10);
      b.strokeStyle = '#42291cc0'; b.lineWidth = 16; b.stroke();
      for (let i = 0; i < 75; i++) {
        const u = 0.025 + i / 74 * 0.95, v = 1 - u;
        const x = cx + r * (-2.39 * v ** 3 - 1.4 * 3 * v * v * u + 1.3 * 3 * v * u * u + 2.4 * u ** 3);
        const y = cy + 24 * v ** 3 - r * 1.82 * 3 * v * v * u - r * 1.8 * 3 * v * u * u + 13 * u ** 3;
        b.beginPath(); b.moveTo(x, y - 8); b.quadraticCurveTo(x - 25 + u * 50, y - 42, x - 45 + u * 90, y - 50 - random() * 45);
        b.strokeStyle = '#251e18b0'; b.lineWidth = 1 + random() * 4; b.stroke();
      }
      canvasTooth(b, w, h);
    });
  },
  drawInner(ctx, w, h, t, hole, rig) {
    const S = rig.s, random = rng(82 + Math.floor(t * 12));
    const sky = ctx.createLinearGradient(0, hole.cy - hole.r, 0, rig.ground);
    sky.addColorStop(0, '#1d2628'); sky.addColorStop(0.65, '#5b5543'); sky.addColorStop(1, '#8b7851');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round';
    for (let i = 0; i < 220; i++) {
      const x = hole.cx - hole.r + random() * hole.r * 2 - mod(rig.scroll * 0.12, 70), y = hole.cy - hole.r + random() * S * 1.6;
      ctx.strokeStyle = i % 3 ? '#b89d691a' : '#cad0b211'; ctx.lineWidth = 1 + random() * 6;
      line(ctx, [[x, y], [x + 12 + random() * 45, y - 2 - random() * 5]]);
    }
    hills(ctx, w, rig, '#354344', 0.14, 0.8, 14); hills(ctx, w, rig, '#4b4a35', 0.3, 0.45, 35);
    const hz = rig.ground - S * 0.65;
    const land = ctx.createLinearGradient(0, hz, 0, h); land.addColorStop(0, '#615f38'); land.addColorStop(1, '#302b20');
    ctx.fillStyle = land; ctx.fillRect(0, hz, w, h - hz);
    ground(ctx, w, rig, '#c4a06c65', 240);
    dust(ctx, rig, t, '#c4aa7965');
    for (const p of rig.parts) {
      const bb = box(p), bw = bb[2] - bb[0], bh = bb[3] - bb[1];
      const g = ctx.createLinearGradient(bb[0], bb[1], bb[0] + bw * 0.35, bb[3]);
      const horse = p.group === 'horse', tack = p.group === 'tack';
      const face = p.name === 'riderHead', hi = horse ? '#e7b172' : tack ? '#c49a48' : face ? '#f1c695' : '#7eae9b';
      g.addColorStop(0, hi); g.addColorStop(0.26, horse ? '#c28644' : tack ? '#9d692d' : face ? '#d49a63' : '#416f67');
      g.addColorStop(0.65, horse ? '#8c4b28' : tack ? '#654422' : face ? '#8d5335' : '#243f3c'); g.addColorStop(1, horse ? '#36251d' : '#142522');
      ctx.save(); partPath(ctx, p); ctx.fillStyle = g; ctx.fill(); ctx.clip();
      ctx.lineCap = 'round';
      for (let i = 0; i < 120; i++) {
        const x = bb[0] + random() * (bb[2] - bb[0]), y = bb[1] + random() * (bb[3] - bb[1]);
        ctx.strokeStyle = random() < 0.45 ? (horse ? '#ffd29855' : '#c4d4b340') : '#281c1a38'; ctx.lineWidth = 0.8 + random() * 2.8;
        const angle = bw > bh * 1.5 ? -0.12 : p.name === 'neck' ? -1.05 : 0.95;
        const len = 4 + random() * 14;
        line(ctx, [[x, y], [x + Math.cos(angle) * len, y + Math.sin(angle) * len]]);
      }
      if (p.tone < 0.3) { ctx.fillStyle = '#11201950'; ctx.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); }
      if (p.name === 'body' || p.name === 'neck') {
        const glow = ctx.createRadialGradient(bb[0] + bw * 0.35, bb[1] + bh * 0.26, 0, bb[0] + bw * 0.35, bb[1] + bh * 0.26, Math.max(bw, bh) * 0.6);
        glow.addColorStop(0, '#ffe0a350'); glow.addColorStop(0.7, '#e6b16800');
        ctx.fillStyle = glow; ctx.fillRect(bb[0], bb[1], bw, bh);
        ctx.strokeStyle = '#f9d69a9a'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bb[0] + (bb[2] - bb[0]) * 0.2, bb[1] + (bb[3] - bb[1]) * 0.25);
        ctx.quadraticCurveTo(bb[0] + (bb[2] - bb[0]) * 0.45, bb[1] + (bb[3] - bb[1]) * 0.07, bb[0] + (bb[2] - bb[0]) * 0.7, bb[1] + (bb[3] - bb[1]) * 0.3); ctx.stroke();
      }
      ctx.restore();
      const o = outlinePts(p); ctx.strokeStyle = '#241e17a0'; ctx.lineWidth = 1.5; line(ctx, o.pts, o.closed);
    }
    hairs(ctx, rig, '#30231b', 0.85); paintDetails(ctx, rig, '#e6c68b9a', 1.7);
    paintDetails(ctx, { ...rig, details: rig.details.filter(d => /eye|nostril|mouth/.test(d.name)) }, '#191c17', 2.4);
    const light = ctx.createRadialGradient(hole.cx - S, hole.cy - S, 0, hole.cx, hole.cy, hole.r * 1.3);
    light.addColorStop(0, '#e6c28220'); light.addColorStop(0.7, '#34231c00'); light.addColorStop(1, '#1018159a');
    ctx.fillStyle = light; ctx.fillRect(0, 0, w, h); canvasTooth(ctx, w, h);
  },
};

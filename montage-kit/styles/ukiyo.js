import { rng } from '../plates/lib.js';
import { partPath, outlinePts, paintDetails } from '../engine/rider.mjs';
import { TAU, cached, ringLayer, paper, circle, polygon, polar, line, box, hairs, dust, ground, mod } from './_a-lib.js';

const NAVY = '#203d49', PAPER = '#e8ddbb', BLUE = '#477b86', OCHRE = '#b77b43';
function woodgrain(ctx, w, h) {
  const tile = cached('ukiyo-grain', 512, 256, b => {
    const r = rng(617); b.strokeStyle = '#5b62451c'; b.lineWidth = 0.8;
    for (let y = 0; y < 256; y += 3 + r() * 3) {
      b.beginPath(); b.moveTo(0, y);
      for (let x = 0; x <= 512; x += 16) b.lineTo(x, y + Math.sin(x * 0.018 + y * 0.1) * 1.7);
      b.stroke();
    }
  });
  ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, w, h);
}
function wave(ctx, hole, a, radius, scale, seed) {
  ctx.save(); ctx.translate(hole.cx, hole.cy); ctx.rotate(a); ctx.translate(radius, 0); ctx.scale(scale, scale);
  ctx.beginPath(); ctx.moveTo(-100, 170);
  ctx.bezierCurveTo(-190, 55, -150, -132, -12, -163);
  ctx.bezierCurveTo(104, -189, 185, -74, 100, -5);
  ctx.bezierCurveTo(134, -76, 65, -120, 1, -86);
  ctx.bezierCurveTo(-52, -55, -12, 52, 130, 129);
  ctx.closePath(); ctx.fillStyle = NAVY; ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = 3; ctx.stroke();
  for (let k = 0; k < 7; k++) {
    ctx.strokeStyle = k % 2 ? PAPER : BLUE; ctx.lineWidth = k % 2 ? 2 : 6;
    ctx.beginPath(); ctx.moveTo(-91 + k * 10, 155); ctx.bezierCurveTo(-180 + k * 6, 7, -79 + k * 10, -146, 38 + k * 5, -121 + k * 7); ctx.stroke();
  }
  // The crest breaks into hooked fingers, all attached to the lip of the wave.
  const random = rng(seed);
  for (let j = 0; j < 11; j++) {
    const u = j / 10, x = -126 + u * 220, y = -90 - Math.sin(u * Math.PI) * 70;
    ctx.beginPath(); ctx.moveTo(x - 10, y + 14);
    ctx.bezierCurveTo(x - 30, y - 12, x - 15, y - 49 - random() * 15, x + 3, y - 45);
    ctx.bezierCurveTo(x - 10, y - 30, x + 9, y - 19, x + 18, y - 27);
    ctx.bezierCurveTo(x + 20, y - 5, x + 10, y + 5, x + 12, y + 23); ctx.closePath();
    ctx.fillStyle = PAPER; ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = 1.8; ctx.stroke();
  }
  ctx.restore();
}
export default {
  id: 'ukiyo', ringName: '环卷的巨浪',
  drawRing(ctx, w, h, t, hole) {
    ringLayer(ctx, w, h, hole, 'ukiyo', (b, hole) => {
      paper(b, w, h, PAPER, 17);
      const { cx, cy, r } = hole, R = Math.hypot(w / 2, h / 2) + 80;
      circle(b, cx, cy, R, '#8caaa0');
      for (let j = 0; j < 22; j++) {
        const rr = r + 20 + j * (R - r) / 22;
        b.strokeStyle = j % 3 ? BLUE : NAVY; b.lineWidth = j % 3 ? 8 : 15;
        b.beginPath();
        for (let i = 0; i <= 450; i++) {
          const a = i / 450 * TAU, rad = rr + Math.sin(a * 7 + j * 0.3) * 9;
          const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
          i ? b.lineTo(x, y) : b.moveTo(x, y);
        }
        b.closePath(); b.stroke();
      }
      for (let i = 0; i < 10; i++) wave(b, hole, i / 10 * TAU + 0.18, r + 365, 1.45, i + 24);
      circle(b, cx, cy, r + 8, null, NAVY, 18); circle(b, cx, cy, r + 20, null, PAPER, 4);
      woodgrain(b, w, h);
    });
  },
  drawInner(ctx, w, h, t, hole, rig) {
    paper(ctx, w, h, PAPER, 17);
    const S = rig.s, hz = rig.ground - S * 0.68;
    const bokashi = ctx.createLinearGradient(0, hole.cy - hole.r, 0, hz);
    bokashi.addColorStop(0, '#6a9298'); bokashi.addColorStop(0.7, '#c4c7ac'); bokashi.addColorStop(1, PAPER);
    ctx.fillStyle = bokashi; ctx.fillRect(0, 0, w, hz);
    const mountainX = hole.cx - S * 0.9 - mod(rig.scroll * 0.1, S * 0.8);
    polygon(ctx, [[mountainX - S * 1.5, hz], [mountainX, hz - S * 1.15], [mountainX + S * 1.7, hz]], '#638991', NAVY, 2);
    polygon(ctx, [[mountainX - S * 0.32, hz - S * 0.9], [mountainX, hz - S * 1.15], [mountainX + S * 0.36, hz - S * 0.91], [mountainX + S * 0.12, hz - S * 0.97], [mountainX - S * 0.05, hz - S * 0.89]], PAPER);
    for (let i = 0; i < 7; i++) {
      const x = mod(i * S * 2.3 - rig.scroll * 0.32, S * 16.1) - S * 3;
      ctx.fillStyle = '#819785'; ctx.beginPath(); ctx.moveTo(x - S, hz); ctx.quadraticCurveTo(x, hz - S * 0.65, x + S, hz); ctx.fill();
      ctx.strokeStyle = NAVY; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.fillStyle = '#c5bd8e'; ctx.fillRect(0, hz, w, h - hz);
    ground(ctx, w, rig, '#314f4785', 160); dust(ctx, rig, t, '#f5e9bf');
    for (let i = 0; i < 5; i++) {
      const x = mod(i * S * 2.2 - rig.scroll * 0.16, S * 11) - S, y = hole.cy - S * 0.75 - (i % 2) * S * 0.3;
      ctx.strokeStyle = '#f0e5c4'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 30, y - 18, x + 50, y + 16, x + 90, y); ctx.bezierCurveTo(x + 120, y - 14, x + 140, y + 15, x + 170, y); ctx.stroke();
    }
    for (const p of rig.parts) {
      ctx.save(); partPath(ctx, p); ctx.fillStyle = p.group === 'horse' ? p.tone < 0.3 ? '#77513b' : OCHRE : p.group === 'rider' ? /Head/.test(p.name) ? '#d1b789' : BLUE : '#c9ae73'; ctx.fill(); ctx.clip();
      if (p.name === 'torso') {
        const [x0, y0, x1, y1] = box(p); ctx.strokeStyle = PAPER; ctx.lineWidth = 1.5;
        for (let y = y0; y < y1; y += 12) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo((x0 + x1) / 2, y - 9, x1, y); ctx.stroke(); }
      }
      ctx.restore(); const o = outlinePts(p); ctx.strokeStyle = NAVY; ctx.lineWidth = 2.6; line(ctx, o.pts, o.closed);
    }
    hairs(ctx, rig, NAVY, 0.65); paintDetails(ctx, rig, NAVY, 1.8); woodgrain(ctx, w, h);
  },
};

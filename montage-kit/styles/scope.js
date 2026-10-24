import { createCanvas } from '@napi-rs/canvas';
import { lassoPath, strandPath, paintDetails, outlinePts } from '../engine/rider.mjs';
import { TAU, cachedRing, radial, circle, arc, line, mod, tooth } from './_craft12.mjs';

const drawRing = cachedRing((c, w, h, hole) => {
  const { cx, cy, r } = hole;
  c.fillStyle = '#202c25'; c.fillRect(0, 0, w, h);
  circle(c, cx, cy, r * 3.15, radial(c, cx - r, cy - r, 0, r * 4, [[0, '#777764'], [0.4, '#424b3f'], [0.8, '#252c24'], [1, '#101b16']]));
  for (let i = 0; i < 4; i++) arc(c, cx, cy, r * (1.09 + i * 0.085), ['#151e18', '#6d7863', '#1a251b', '#8b8a6d'][i], 24);
  arc(c, cx, cy, r * 1.015, '#536344', 12);
  arc(c, cx, cy, r * 1.012, '#afc68b', 2, 3.4, 5.5);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU, x = cx + Math.cos(a) * r * 1.39, y = cy + Math.sin(a) * r * 1.39;
    circle(c, x + 2, y + 3, 11, '#152019'); circle(c, x, y, 9, '#78806a');
    line(c, [[x - 5, y + 2], [x + 5, y - 2]], '#1f2d23', 2);
  }
  for (const side of [-1, 1]) {
    const x = cx + side * r * 2.04;
    for (let j = -1; j <= 1; j++) {
      const y = cy + j * 205;
      circle(c, x, y + 5, 68, '#17231a'); circle(c, x, y, 61, '#777e64');
      circle(c, x, y, 48, radial(c, x - 18, y - 20, 0, 65, [[0, '#57634d'], [0.55, '#222f24'], [1, '#0c170f']]));
      for (let k = 0; k < 24; k++) {
        const a = k / 24 * TAU; line(c, [[x + Math.cos(a) * 41, y + Math.sin(a) * 41], [x + Math.cos(a) * 47, y + Math.sin(a) * 47]], '#69725c', 2);
      }
      line(c, [[x - 7, y - 20], [x - 14, y - 39]], '#c2c59a', 4);
    }
  }
  tooth(c, w, h, 171, 0.24);
});
let screen;
function trace(c, w, h, hole, rig) {
  const S = rig.s, hz = rig.ground - S * 0.73;
  c.clearRect(0, 0, w, h); c.lineJoin = 'round'; c.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const x = hole.cx - hole.r - 220 + i * 230 - mod(rig.scroll * 0.24, 230);
    line(c, [[x, hz], [x + 45, hz - 65], [x + 140, hz - 65], [x + 190, hz]], '#335d36', 1.4);
  }
  line(c, [[hole.cx - hole.r, hz], [hole.cx + hole.r, hz]], '#446c3a', 1);
  for (let j = 0; j < 70; j++) {
    const x = hole.cx - hole.r + mod(j * 193 - rig.scroll * (1 + j % 3 * 0.1), hole.r * 2);
    const y = rig.ground + (j % 7) * S * 0.065;
    line(c, [[x - 17, y], [x + 8, y], [x + 4, y - 7]], '#5b8845', 1.3);
  }
  for (const p of rig.parts) {
    const o = outlinePts(p); line(c, o.pts, p.tone < 0.35 ? '#5fa34f' : '#a7dc72', 1.8, o.closed);
  }
  paintDetails(c, rig, '#7bb758', 1.2);
  for (const st of rig.strands) { strandPath(c, st); c.strokeStyle = '#82bb56'; c.lineWidth = Math.max(0.7, st.w * 0.22); c.stroke(); }
  lassoPath(c, rig); c.strokeStyle = '#b1e581'; c.lineWidth = 1.8; c.stroke();
  rig.joints.hoofs.forEach(([x, y], i) => {
    if (!rig.contacts[i]) return;
    for (let k = 0; k < 4; k++) {
      const rr = (5 + k * 5) * rig.contacts[i];
      c.beginPath(); c.ellipse(x - k * 15, y - k * 3, rr * 2, rr, 0, 3.3, 6); c.strokeStyle = '#70a04b'; c.lineWidth = 1; c.stroke();
    }
  });
}
export default {
  id: 'scope', ringName: 'vintage oscilloscope CRT bezel', drawRing,
  drawInner(c, w, h, t, hole, rig) {
    const { cx, cy, r } = hole;
    c.fillStyle = radial(c, cx, cy, 0, r, [[0, '#132c16'], [0.75, '#0b1c10'], [1, '#030d09']]); c.fillRect(0, 0, w, h);
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.clip();
    for (let i = -5; i <= 5; i++) {
      line(c, [[cx + i * r / 5, cy - r], [cx + i * r / 5, cy + r]], '#1d3820', 1);
      line(c, [[cx - r, cy + i * r / 5], [cx + r, cy + i * r / 5]], '#1d3820', 1);
    }
    for (let i = -20; i <= 20; i++) {
      const v = i * r / 20; line(c, [[cx + v, cy - 3], [cx + v, cy + 3]], '#37523a', 1);
      line(c, [[cx - 3, cy + v], [cx + 3, cy + v]], '#37523a', 1);
    }
    if (!screen || screen.width !== w || screen.height !== h) screen = createCanvas(w, h);
    trace(screen.getContext('2d'), w, h, hole, rig);
    c.save(); c.filter = 'blur(4px)'; c.globalAlpha = 0.65; c.drawImage(screen, 0, 0); c.restore();
    c.save(); c.globalAlpha = 0.12; c.drawImage(screen, -5, 1); c.restore(); c.drawImage(screen, 0, 0);
    const scan = cy - r + mod(t * 310, r * 2);
    c.fillStyle = 'rgba(127,190,92,0.045)'; c.fillRect(cx - r, scan - 30, r * 2, 30);
    c.fillStyle = 'rgba(0,7,2,0.15)'; for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1);
    c.strokeStyle = 'rgba(181,213,167,0.08)'; c.lineWidth = 17; c.beginPath(); c.ellipse(cx - r * 0.05, cy, r * 0.91, r * 0.94, -0.3, 3.7, 4.4); c.stroke();
    c.restore();
  },
};

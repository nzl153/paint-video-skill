import { rng } from '../plates/lib.js';
import { partPath, strandPath, lassoPath, paintDetails, outlinePts } from '../engine/rider.mjs';
import { TAU, cachedRing, radial, circle, arc, ellipse, line, bounds, mod, tooth } from './_craft12.mjs';

function fingerprint(c, x, y, size, angle, alpha = 0.16) {
  c.save(); c.translate(x, y); c.rotate(angle);
  for (let i = 0; i < 9; i++) {
    c.beginPath(); c.ellipse(0, 0, size * (0.18 + i * 0.09), size * (0.26 + i * 0.13), 0, 2.8, 6.6);
    c.strokeStyle = `rgba(95,49,32,${alpha})`; c.lineWidth = 1.1; c.stroke();
    c.beginPath(); c.ellipse(-1, -0.5, size * (0.18 + i * 0.09), size * (0.26 + i * 0.13), 0, 2.8, 6.6);
    c.strokeStyle = `rgba(255,223,175,${alpha * 1.1})`; c.lineWidth = 0.8; c.stroke();
  }
  c.restore();
}
const drawRing = cachedRing((c, w, h, hole) => {
  const { cx, cy, r } = hole, random = rng(241);
  const desk = c.createLinearGradient(0, 0, w, h);
  desk.addColorStop(0, '#d7dcd1'); desk.addColorStop(0.65, '#bfc9be'); desk.addColorStop(1, '#a5b5aa');
  c.fillStyle = desk; c.fillRect(0, 0, w, h);
  const lump = (x, y, rx, ry, color, dark, angle = 0) => {
    c.save(); c.translate(x, y); c.rotate(angle);
    c.shadowColor = '#273d304a'; c.shadowBlur = 15; c.shadowOffsetX = 9; c.shadowOffsetY = 12;
    const g = c.createRadialGradient(-rx * 0.32, -ry * 0.4, 1, 0, 0, Math.max(rx, ry));
    g.addColorStop(0, color); g.addColorStop(0.6, color); g.addColorStop(1, dark);
    ellipse(c, 0, 0, rx, ry, g); c.restore();
  };
  // Little hand-modelled objects sit on the workbench, beyond the pot.
  lump(cx - r * 2.05, cy - r * 0.99, 102, 34, '#99b7a1', '#537565', -0.22);
  lump(cx - r * 2.13, cy - r * 1.13, 66, 61, '#dfb56e', '#a27741', -0.1);
  c.save(); c.translate(cx - r * 2.13, cy - r * 1.13); c.strokeStyle = '#ae864f'; c.lineWidth = 5; c.lineCap = 'round';
  const spiral = Array.from({ length: 100 }, (_, i) => { const a = i / 99 * TAU * 2.2, rr = 4 + i * 0.42; return [Math.cos(a) * rr, Math.sin(a) * rr]; });
  line(c, spiral, '#ae864f', 5); c.restore();
  for (const dx of [-18, 10]) {
    const x = cx - r * 1.87 + dx, y = cy - r * 1.1;
    line(c, [[x, y], [x + 2, y - 26]], '#6d907d', 7); circle(c, x + 2, y - 29, 7, '#93b39a'); circle(c, x + 4, y - 29, 2.5, '#394f44');
  }
  const mx = cx + r * 2.1, my = cy + r * 0.91;
  lump(mx, my + 37, 69, 24, '#6f9c84', '#436f58'); lump(mx, my, 24, 51, '#e7d7ae', '#bda67d');
  lump(mx, my - 39, 86, 45, '#bd6651', '#7c3e38');
  for (const [dx, dy, rr] of [[-32, -48, 13], [13, -62, 11], [46, -37, 12], [-2, -30, 9]]) ellipse(c, mx + dx, my + dy, rr, rr * 0.68, '#e4d7b3', -0.1);
  for (let i = 0; i < 5; i++) {
    const x = cx - r * 2.14 + i * 27, y = cy + r * 1.03 + Math.sin(i * 2) * 28;
    lump(x, y, 15 + i * 2, 12 + i, i % 2 ? '#c78e67' : '#7e9f96', i % 2 ? '#89553c' : '#4f756d');
  }
  // A thick, rolled lip with an irregular silhouette and a recessed inner wall.
  const rimPath = (offset = 0) => {
    c.beginPath();
    for (let i = 0; i <= 320; i++) {
      const a = i / 320 * TAU, rr = r * 1.91 + Math.sin(a * 5 + 1) * 20 + Math.sin(a * 11) * 9 + Math.sin(a * 23) * 3 + offset;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath();
  };
  rimPath(); c.save(); c.shadowColor = '#25372c80'; c.shadowBlur = 36; c.shadowOffsetX = 22; c.shadowOffsetY = 30;
  c.fillStyle = '#854b36'; c.fill(); c.restore();
  rimPath(); c.save(); c.clip();
  const terracotta = radial(c, cx, cy, r * 0.96, r * 1.94, [[0, '#563325'], [0.13, '#8d4c32'], [0.23, '#c17a50'], [0.32, '#db9a6e'], [0.56, '#cb8659'], [0.76, '#bf7b50'], [0.93, '#a06441'], [1, '#6c422f']]);
  c.fillStyle = terracotta; c.fillRect(0, 0, w, h);
  const studio = c.createLinearGradient(cx - r, cy - r, cx + r * 1.8, cy + r * 1.8);
  studio.addColorStop(0, '#ffe5bb40'); studio.addColorStop(0.5, '#ffe4c000'); studio.addColorStop(1, '#4b302c55'); c.fillStyle = studio; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * TAU, rr = r * (1.4 + random() * 0.25), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    ellipse(c, x + 2, y + 3, 28 + random() * 11, 19, '#8352390d', a);
    fingerprint(c, x, y, 42 + random() * 16, a - 0.7, 0.24);
  }
  for (let i = 0; i < 14000; i++) {
    const x = random() * w, y = random() * h;
    c.fillStyle = i % 3 ? '#ffe3ba12' : '#6e402e16'; c.fillRect(x, y, 0.5 + random() * 2, 0.5 + random() * 1.5);
  }
  for (let i = 0; i < 80; i++) {
    const a = random() * TAU, rr = r * (1.15 + random() * 0.7);
    ellipse(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2 + random() * 3, 1 + random(), '#76462e20', a);
  }
  c.restore();
  // Pressure marks dent the crest, rather than forming perfect lathe rings.
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * TAU + random() * 0.05;
    c.beginPath(); c.arc(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, r * 1.79, a, a + 0.09);
    c.strokeStyle = '#7c4b3224'; c.lineWidth = 4; c.stroke();
  }
  arc(c, cx, cy, r + 2, '#693c2f80', 5); tooth(c, w, h, 242, 0.055);
});
export default {
  id: 'clay', ringName: 'hand formed terracotta flowerpot rim', drawRing,
  drawInner(c, w, h, t, hole, rig) {
    const { cx, cy, r } = hole, S = rig.s, random = rng(243);
    c.fillStyle = '#c7d6cf'; c.fillRect(0, 0, w, h);
    const hz = rig.ground - S * 0.69;
    for (let k = 0; k < 10; k++) {
      const x = cx - r - 220 + mod(k * 190 - rig.scroll * 0.22, 190 * 10);
      ellipse(c, x, hz + 30, S * 0.68, S * (0.3 + (k % 3) * 0.07), '#9cad91');
      ellipse(c, x - 12, hz + 18, S * 0.56, S * (0.24 + (k % 3) * 0.07), '#bac2a2');
    }
    c.fillStyle = '#d9c6a2'; c.fillRect(0, hz + 25, w, h);
    ellipse(c, cx - S * 0.06, rig.ground + S * 0.04, S * 0.93, S * 0.08, 'rgba(91,71,46,0.19)');
    for (let k = 0; k < 90; k++) {
      const x = cx - r - 30 + mod(random() * (r * 2 + 60) - rig.scroll, r * 2 + 60), y = hz + 40 + random() * (h - hz);
      ellipse(c, x + 1, y + 2, 3 + k % 4, 2.5, '#b2a17e');
      ellipse(c, x, y, 3 + k % 4, 2, '#e6d6b5');
      if (k % 3 === 0) {
        line(c, [[x, y], [x - 3, y - 7], [x, y], [x + 3, y - 5]], '#7f9474', 3);
      }
    }
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    for (const p of rig.parts) {
      const b = bounds(p), color = p.group === 'horse' ? (p.tone < 0.35 ? ['#a76d48', '#825033'] : ['#d6a06c', '#995e3c']) : p.group === 'tack' ? ['#d6b889', '#94714b'] : p.name === 'riderHead' ? ['#e0bb91', '#b3825f'] : p.name === 'bandana' ? ['#c77a4e', '#964a36'] : ['#779b91', '#466a63'];
      partPath(c, p);
      const shade = c.createLinearGradient(b.x, b.y, b.x + b.w * 0.4, b.y + b.h);
      shade.addColorStop(0, color[0]); shade.addColorStop(0.32, color[0]); shade.addColorStop(1, color[1]);
      c.fillStyle = shade;
      c.save();
      if (!p.attach) { c.shadowColor = 'rgba(58,38,24,0.24)'; c.shadowBlur = 8; c.shadowOffsetX = 4; c.shadowOffsetY = 6; }
      c.fill(); c.restore();
      c.save(); c.clip();
      if (p.name === 'body') {
        const saddle = rig.joints.saddle;
        for (const [dx, dy, rx, ry] of [[-0.43, 0.34, 0.47, 0.31], [0.2, 0.26, 0.39, 0.38], [0.57, -0.08, 0.16, 0.4]]) {
          c.save(); c.translate(saddle[0] + S * dx, saddle[1] + S * dy); c.scale(1, ry / rx);
          const light = radial(c, -S * rx * 0.22, -S * rx * 0.32, 0, S * rx, [[0, 'rgba(255,218,161,0.35)'], [0.53, 'rgba(255,215,157,0.1)'], [1, 'rgba(255,215,157,0)']]);
          ellipse(c, 0, 0, S * rx, S * rx, light); c.restore();
        }
      } else {
        c.fillStyle = radial(c, b.x + b.w * 0.32, b.y + b.h * 0.3, 0, Math.max(b.w, b.h) * 0.7, [[0, 'rgba(255,235,189,0.2)'], [0.58, 'rgba(255,235,189,0)'], [1, 'rgba(52,41,25,0.1)']]); c.fillRect(b.x, b.y, b.w, b.h);
      }
      c.restore();
      const o = outlinePts(p); line(c, o.pts, 'rgba(82,52,33,0.27)', 1.5, o.closed);
      if (['body', 'torso', 'head', 'saddleBlanket'].includes(p.name)) {
        c.save(); partPath(c, p); c.clip(); fingerprint(c, b.cx - b.w * 0.1, b.cy + b.h * 0.15, p.name === 'body' ? S * 0.1 : S * 0.055, -0.7, 0.13); c.restore();
      }
    }
    paintDetails(c, rig, 'rgba(91,57,35,0.48)', 1.6);
    for (let k = 0; k < rig.strands.length; k += 3) {
      const st = rig.strands[k]; strandPath(c, st); c.lineWidth = Math.max(2, st.w * 0.9); c.strokeStyle = '#795236'; c.stroke();
      strandPath(c, st); c.lineWidth = Math.max(0.7, st.w * 0.23); c.strokeStyle = '#af7b4c'; c.stroke();
    }
    lassoPath(c, rig); c.strokeStyle = '#8d7654'; c.lineWidth = 4; c.stroke();
    lassoPath(c, rig); c.strokeStyle = '#d2bf8d'; c.lineWidth = 1.6; c.stroke();
    rig.joints.hoofs.forEach(([x, y], i) => {
      if (!rig.contacts[i]) return;
      for (let k = 0; k < 6; k++) {
        const rr = S * (0.02 + k * 0.005) * rig.contacts[i];
        ellipse(c, x - 8 - k * 10, y - k * 4, rr * 1.3, rr, '#b6a181');
        ellipse(c, x - 9 - k * 10, y - k * 4 - 1.5, rr * 1.2, rr * 0.8, '#e5d3ae');
      }
    });
    c.restore(); tooth(c, w, h, 242, 0.05);
  },
};

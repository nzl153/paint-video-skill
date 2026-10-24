import { rng } from '../plates/lib.js';
import { TAU, cachedRing, radial, circle, arc, ellipse, line, rider, mod, tooth } from './_craft12.mjs';

const drawRing = cachedRing((c, w, h, hole) => {
  const { cx, cy, r } = hole, random = rng(251);
  c.fillStyle = '#342820'; c.fillRect(0, 0, w, h);
  circle(c, cx, cy, r * 3.3, radial(c, cx - r, cy - r, 0, r * 4, [[0, '#dbbc79'], [0.36, '#b28c4d'], [0.55, '#776036'], [0.79, '#3c3021'], [1, '#201b16']]));
  for (const [radius, color, width] of [[3.03, '#d4b373', 11], [2.91, '#40351e', 8], [2.79, '#c4a061', 13], [2.56, '#392f20', 10], [2.48, '#c4a363', 7], [2.25, '#74562f', 9], [1.93, '#ddbd79', 12], [1.86, '#584528', 14], [1.69, '#b7995c', 6], [1.55, '#302c22', 17], [1.38, '#d2af6e', 10]]) {
    arc(c, cx, cy, r * radius, color, width);
    arc(c, cx - 2, cy - 3, r * radius - width * 0.5, 'rgba(248,226,170,0.45)', 2);
  }
  for (let i = 0; i < 480; i++) {
    const a = i / 480 * TAU;
    line(c, [[cx + Math.cos(a) * r * 2.57, cy + Math.sin(a) * r * 2.57], [cx + Math.cos(a) * r * 2.76, cy + Math.sin(a) * r * 2.76]], i % 2 ? '#44371f' : '#b29356', 2);
  }
  for (let i = 0; i < 130; i++) {
    const rr = r * (1.4 + random() * 1.6), a = random() * TAU;
    arc(c, cx, cy, rr, random() < 0.5 ? 'rgba(247,218,155,0.2)' : 'rgba(39,29,13,0.23)', 0.6 + random(), a, a + 0.08 + random() * 0.6);
  }
  circle(c, cx, cy, r * 1.32, radial(c, cx, cy, r, r * 1.32, [[0, '#182722'], [0.24, '#30423a'], [0.5, '#18251e'], [0.75, '#555a3e'], [1, '#121a15']]));
  arc(c, cx, cy, r * 1.025, '#857a4c', 7);
  arc(c, cx, cy, r * 1.15, 'rgba(181,200,161,0.25)', 18, 3.6, 4.9);
  arc(c, cx, cy, r * 1.23, 'rgba(220,217,169,0.18)', 7, 0.6, 1.7);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + 0.1, x = cx + Math.cos(a) * r * 1.75, y = cy + Math.sin(a) * r * 1.75;
    circle(c, x, y + 2, 13, '#3d301d'); circle(c, x, y, 10, '#bba16a');
    line(c, [[x - 6, y + 2], [x + 6, y - 2]], '#493a21', 2.5);
  }
  tooth(c, w, h, 252, 0.2);
});
export default {
  id: 'muybridge', ringName: 'antique brass camera lens barrel', drawRing,
  drawInner(c, w, h, t, hole, rig) {
    const { cx, cy, r } = hole, S = rig.s, random = rng(253);
    c.fillStyle = '#bdb19a'; c.fillRect(0, 0, w, h);
    const hz = rig.ground - S * 0.54;
    for (let j = 0; j < 8; j++) {
      const x = cx - r - 350 + mod(j * 240 - rig.scroll * 0.18, 240 * 8);
      ellipse(c, x, hz + 15, 170, 28 + j % 2 * 12, '#a69d87');
    }
    c.fillStyle = '#c7bda5'; c.fillRect(0, hz, w, h);
    // Measuring backdrop without labels, sliding at the far plane.
    const gridX = cx - r - mod(rig.scroll * 0.3, 41);
    for (let x = gridX; x < cx + r + 45; x += 41) {
      line(c, [[x, cy - r], [x, rig.ground + S * 0.07]], '#827d6b', 1.5);
      line(c, [[x + 2, cy - r], [x + 2, rig.ground + S * 0.07]], '#ded2ba', 1);
    }
    for (let j = 0; j < 9; j++) line(c, [[cx - r, cy - r + j * 105], [cx + r, cy - r + j * 105]], 'rgba(122,115,94,0.42)', 1);
    for (let i = 0; i < 300; i++) {
      const x = cx - r - 50 + mod(random() * (r * 2 + 100) - rig.scroll, r * 2 + 100), y = rig.ground - S * 0.03 + random() * S * 0.75;
      line(c, [[x, y], [x + 3 + random() * 14, y - 1 - random() * 2]], i % 2 ? '#a2987e' : '#e1d6bb', 0.7 + random());
    }
    ellipse(c, cx - S * 0.02, rig.ground + S * 0.04, S * 0.97, S * 0.055, 'rgba(65,56,38,0.23)');
    rider(c, rig, (p, b) => {
      const g = c.createLinearGradient(b.x, b.y, b.x + b.w * 0.25, b.y + b.h);
      const cols = p.group === 'horse' ? p.tone < 0.35 ? ['#554d3a', '#342f22'] : ['#81735a', '#48402f'] : p.group === 'tack' ? ['#a59576', '#62573f'] : p.name === 'riderHead' ? ['#d1bda0', '#8b7659'] : ['#645c48', '#3c382a'];
      g.addColorStop(0, cols[0]); g.addColorStop(0.53, cols[0]); g.addColorStop(1, cols[1]); return g;
    }, 'rgba(40,35,22,0.5)', 0.9, (q, p, b) => {
      const fur = rng(254 + p.pts.length);
      q.beginPath();
      for (let k = 0; k < Math.min(450, b.w * b.h / 65); k++) {
        const x = b.x + fur() * b.w, y = b.y + fur() * b.h;
        q.moveTo(x, y); q.lineTo(x + 1 + fur() * 5, y + 2 + fur() * 4);
      }
      q.strokeStyle = 'rgba(230,211,174,0.075)'; q.lineWidth = 0.7; q.stroke();
    });
    rig.joints.hoofs.forEach(([x, y], j) => {
      if (!rig.contacts[j]) return;
      for (let k = 0; k < 8; k++) ellipse(c, x - k * 10, y - k * 3, 3 + k * rig.contacts[j], 2 + k * 0.5, 'rgba(225,210,175,0.22)');
    });
    tooth(c, w, h, 252, 0.5);
    const aging = rng(255);
    for (let j = 0; j < 210; j++) {
      const a = aging() * TAU, rr = r * (0.7 + aging() * 0.33), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      ellipse(c, x, y, 1 + aging() * 5, 1 + aging() * 3, j % 3 ? 'rgba(76,61,42,0.2)' : 'rgba(239,228,201,0.45)');
    }
    for (let k = 0; k < 8; k++) {
      const x = cx - r + aging() * r * 2;
      line(c, [[x, cy - r], [x + 3, cy + r]], 'rgba(243,229,197,0.16)', 0.6);
    }
    c.fillStyle = radial(c, cx, cy, r * 0.45, r, [[0, 'rgba(51,37,17,0)'], [0.8, 'rgba(51,37,17,0.05)'], [1, 'rgba(51,37,17,0.25)']]); c.fillRect(0, 0, w, h);
  },
};

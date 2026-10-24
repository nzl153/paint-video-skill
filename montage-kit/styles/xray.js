import { partPath, lassoPath } from '../engine/rider.mjs';
import { TAU, cachedRing, radial, circle, arc, line, ellipse, bounds, centerline, prairie, tooth } from './_craft12.mjs';

const drawRing = cachedRing((c, w, h, hole) => {
  const { cx, cy, r } = hole;
  c.fillStyle = '#17242b'; c.fillRect(0, 0, w, h);
  circle(c, cx, cy, r * 3.25, radial(c, cx - r * 0.35, cy - r * 0.3, r * 0.3, r * 3.6, [[0, '#f5f4df'], [0.4, '#e1e7de'], [0.75, '#829c9d'], [1, '#253f4c']]));
  arc(c, cx, cy, r * 2.76, '#6c8386', 5);
  arc(c, cx, cy, r * 2.72, '#e6ece5', 4);
  circle(c, cx, cy, r * 1.51, '#314c58');
  circle(c, cx, cy, r * 1.43, '#9fafac');
  circle(c, cx, cy, r * 1.37, radial(c, cx, cy, r, r * 1.4, [[0, '#101d27'], [0.43, '#1d343e'], [0.62, '#627c80'], [0.83, '#d9e9df'], [1, '#415f69']]));
  for (let i = 0; i < 112; i++) {
    const a = i / 112 * TAU;
    line(c, [[cx + Math.cos(a) * r * 1.12, cy + Math.sin(a) * r * 1.12], [cx + Math.cos(a) * r * 1.28, cy + Math.sin(a) * r * 1.28]], i % 4 ? '#b4c8c3' : '#283d48', i % 4 ? 2 : 5);
  }
  arc(c, cx, cy, r * 1.035, '#bdede8', r * 0.07);
  arc(c, cx, cy, r * 1.01, '#f2fff5', 3);
  for (const sign of [-1, 1]) {
    const x = cx + sign * r * 1.9;
    c.fillStyle = '#526f75'; c.fillRect(x - 65, cy - 160, 130, 320);
    c.fillStyle = '#243f48'; c.fillRect(x - 49, cy - 143, 98, 180);
    for (let k = 0; k < 8; k++) line(c, [[x - 39, cy + 68 + k * 12], [x + 39, cy + 68 + k * 12]], '#18323a', 3);
    circle(c, x, cy - 75, 13, '#c6eadc'); circle(c, x, cy - 15, 8, '#92b8a9');
  }
  tooth(c, w, h, 141, 0.07);
});
function bone(c, pts, width) {
  line(c, pts, 'rgba(114,184,201,0.16)', width * 2.3);
  line(c, pts, 'rgba(191,233,239,0.58)', width);
  line(c, pts, 'rgba(239,255,247,0.7)', Math.max(1, width * 0.27));
  for (const p of [pts[0], pts[pts.length - 1]]) circle(c, p[0], p[1], width * 0.58, 'rgba(224,250,244,0.65)');
}
export default {
  id: 'xray', ringName: 'CT scanner gantry', drawRing,
  drawInner(c, w, h, t, hole, rig) {
    const S = rig.s;
    prairie(c, w, h, hole, rig, { sky: '#040d14', far: '#132a35', hill: '#0c202a', ground: '#07151e', grass: '#23434c', dust: 'rgba(136,209,219,0.13)' });
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const p of rig.parts) {
      partPath(c, p); c.fillStyle = p.group === 'horse' ? 'rgba(91,160,181,0.075)' : 'rgba(148,201,209,0.09)'; c.fill();
      c.strokeStyle = 'rgba(147,215,226,0.27)'; c.lineWidth = 1.5; c.stroke();
    }
    const find = n => rig.parts.find(p => p.name === n);
    for (const n of ['hindFar', 'foreFar', 'hindNear', 'foreNear', 'riderLegFar', 'riderLeg', 'armReins', 'armLasso']) {
      const p = find(n), pts = centerline(p);
      bone(c, pts, S * (p.group === 'horse' ? 0.031 : 0.022));
      for (const u of [0.42, 0.72]) {
        const q = pts[Math.floor((pts.length - 1) * u)]; circle(c, q[0], q[1], S * 0.026, 'rgba(208,241,239,0.64)');
      }
    }
    const body = bounds(find('body')), head = bounds(find('head')), torso = bounds(find('torso')), skull = bounds(find('riderHead'));
    const spine = [[body.x + body.w * 0.15, body.y + body.h * 0.57], [body.x + body.w * 0.54, body.y + body.h * 0.62], [body.x + body.w * 0.73, body.y + body.h * 0.4], [head.cx, head.y + head.h * 0.16]];
    bone(c, spine, S * 0.045);
    for (let i = 0; i < 12; i++) {
      const x = body.x + body.w * (0.23 + i * 0.031), y = body.y + body.h * 0.6;
      c.beginPath(); c.moveTo(x, y - 2); c.bezierCurveTo(x + S * 0.15, y + S * 0.04, x + S * 0.17, y + S * 0.36, x - S * 0.04, y + S * 0.36);
      c.strokeStyle = 'rgba(202,237,238,0.65)'; c.lineWidth = S * 0.012; c.stroke();
      circle(c, x, y, S * 0.02, '#bddde0');
    }
    ellipse(c, head.cx, head.cy, head.w * 0.37, head.h * 0.43, 'rgba(194,234,233,0.43)', -0.25);
    circle(c, ...rig.joints.eye, S * 0.037, '#102630');
    bone(c, [[head.cx, head.cy], rig.joints.muzzle], S * 0.044);
    const pelvis = [torso.x + torso.w * 0.24, torso.y + torso.h * 0.87], neck = [torso.x + torso.w * 0.81, torso.y + torso.h * 0.13];
    bone(c, [pelvis, neck], S * 0.025);
    ellipse(c, pelvis[0], pelvis[1], S * 0.08, S * 0.045, 'rgba(217,243,237,0.65)', -0.6);
    for (let i = 0; i < 8; i++) {
      const u = i / 11, x = neck[0] + (pelvis[0] - neck[0]) * u, y = neck[1] + (pelvis[1] - neck[1]) * u;
      c.beginPath(); c.ellipse(x, y + S * 0.02, S * (0.05 + i * 0.003), S * 0.027, -0.9, 0.2, TAU - 0.6); c.strokeStyle = '#9fc8d0'; c.lineWidth = 2; c.stroke();
    }
    ellipse(c, skull.cx, skull.cy, skull.w * 0.38, skull.h * 0.47, 'rgba(227,246,237,0.73)');
    circle(c, skull.cx + skull.w * 0.19, skull.cy - skull.h * 0.05, S * 0.02, '#193641');
    line(c, [[skull.cx - 4, skull.cy + skull.h * 0.3], [skull.cx + skull.w * 0.35, skull.cy + skull.h * 0.3]], '#193641', 2);
    lassoPath(c, rig); c.strokeStyle = 'rgba(164,211,222,0.65)'; c.lineWidth = 1.6; c.stroke();
    c.restore(); tooth(c, w, h, 151, 0.1);
    c.fillStyle = 'rgba(100,157,170,0.025)'; for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1);
  },
};

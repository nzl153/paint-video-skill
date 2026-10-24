// The cowboy on his galloping horse, as geometry. Every style draws this same rig, so the gallop
// carries on unbroken while the look changes underneath it.
//
// makeRider(t, hole) -> {
//   s                 pixels per horse unit (nose to buttock is about 1.9 units)
//   parts             [{ name, group: 'horse'|'rider'|'tack', pts: [[x,y]...] closed outline, depth, tone, attach }]
//                     attach: a limb that grows out of the body; outlinePts(p) leaves its root open
//                     back to front. tone 0..1 is a hint for how light that part is (far legs darker).
//   details           [{ name, pts: [[x,y]...], closed?, weight }] inner lines: muscles, eye, nostril,
//                     mouth, saddle seams, bridle, clothing folds. Draw them for line-based styles.
//   strands           [{ pts, w }] mane, forelock and tail hairs (polylines with a base width)
//   lasso             { cx, cy, rx, ry, rot, rope: [[x,y]...] } the spinning loop over his head and the rope to his hand
//   joints            { hoofs: [[x,y] x4], eye, muzzle, hand, hatTop, saddle }
//   ground            screen y of the ground line
//   contacts          [0..1 x4] how hard each hoof is on the ground (for dust)
//   scroll            pixels the land has slid by (backgrounds move left by this, with parallax)
//   phase             stride phase 0..1 (one stride per beat)
// }
// The horse faces right. paintRider(ctx, rig, colour) fills the whole silhouette in one colour.
import { BEAT } from './timeline.mjs';

const TAU = Math.PI * 2;
const D = Math.PI / 180;

// ---------- small geometry helpers ----------
function catmull(P, seg, closed) {
  const out = [];
  const n = P.length;
  const at = (i) => (closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))]);
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  if (!closed) out.push(P[n - 1]);
  return out;
}

// Outline around a centre line with a width profile [[u, width]...] (u is 0..1 along the line).
function sweep(center, profile) {
  const pts = catmull(center, 8, false);
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = len[len.length - 1] || 1;
  const widthAt = (u) => {
    for (let i = 1; i < profile.length; i++) {
      if (u <= profile[i][0]) {
        const [u0, w0] = profile[i - 1], [u1, w1] = profile[i];
        const k = (u - u0) / (u1 - u0 || 1);
        return w0 + (w1 - w0) * (k * k * (3 - 2 * k));
      }
    }
    return profile[profile.length - 1][1];
  };
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const w = widthAt(len[i] / total) / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  return [...L, ...R.reverse()];
}

const lerpA = (keys, ph) => {
  // keys: [[phase, ...values]] cyclic over 0..1; smooth cosine blend between neighbours.
  for (let i = 0; i < keys.length; i++) {
    const a = keys[i], b = keys[(i + 1) % keys.length];
    const pa = a[0], pb = i + 1 < keys.length ? b[0] : b[0] + 1;
    const ph2 = ph < pa ? ph + 1 : ph;
    if (ph2 >= pa && ph2 < pb) {
      const k = (ph2 - pa) / (pb - pa);
      const e = 0.5 - 0.5 * Math.cos(Math.PI * k);
      return a.slice(1).map((v, j) => v + (b[j + 1] - v) * e);
    }
  }
  return keys[0].slice(1);
};
const ray = (p, angDeg, len) => [p[0] + Math.sin(angDeg * D) * len, p[1] - Math.cos(angDeg * D) * len];

// ---------- gallop keyframes (angles in degrees from straight down, + = toward the head) ----------
// Foreleg: forearm, cannon, pastern. Phase 0 is the hoof landing.
const FORE = [
  [0.0, 26, 28, 40], [0.12, 2, 2, 46], [0.26, -26, -30, -6], [0.38, -24, -100, -150],
  [0.52, 14, -118, -160], [0.7, 46, 4, -30], [0.86, 40, 32, 20],
];
// Hindleg: thigh, gaskin, cannon, pastern.
const HIND = [
  [0.0, 34, -22, 12, 40], [0.14, 12, -40, -4, 50], [0.28, -16, -56, -38, -8], [0.42, -28, -60, -70, -90],
  [0.6, 8, -84, -32, -70], [0.8, 40, -40, 16, 8],
];
const LEGS = [
  { name: 'hindFar', hind: true, off: 0.0, near: false },
  { name: 'foreFar', hind: false, off: 0.36, near: false },
  { name: 'hindNear', hind: true, off: 0.11, near: true },
  { name: 'foreNear', hind: false, off: 0.47, near: true },
];
const STANCE_END = 0.3;
const HIP = [-0.5, 0.06], SHOULDER = [0.42, 0.02];

function legChain(L, ph) {
  if (L.hind) {
    const [ta, ga, ca, pa] = lerpA(HIND, ph);
    const top = [HIP[0] + 0.04, HIP[1]];
    const stifle = ray(top, ta, 0.4);
    const hock = ray(stifle, ga + 180 - 180, 0.38);
    const fet = ray(hock, ca, 0.32);
    const hoof = ray(fet, pa, 0.12);
    return [top, stifle, hock, fet, hoof];
  }
  const [fa, ca, pa] = lerpA(FORE, ph);
  const top = SHOULDER;
  const elbow = ray(top, -28 + fa * 0.25, 0.26);
  const knee = ray(elbow, fa, 0.36);
  const fet = ray(knee, ca, 0.28);
  const hoof = ray(fet, pa, 0.12);
  return [top, elbow, knee, fet, hoof];
}

// Body height so planted hooves meet the ground, sampled round one stride and smoothed.
const GROUND = -1.02;
const BOB = (() => {
  const n = 48, raw = [];
  for (let i = 0; i < n; i++) {
    const ph = i / n;
    let need = -Infinity;
    for (const L of LEGS) {
      const lp = ((ph - L.off) % 1 + 1) % 1;
      if (lp < STANCE_END) need = Math.max(need, GROUND - legChain(L, lp)[4][1] - 0.01);
    }
    raw.push(need === -Infinity ? null : need);
  }
  // Flight: carry on along a gentle arc between the last and next support.
  const filled = raw.map((v, i) => {
    if (v !== null) return v;
    let a = i, b = i;
    while (raw[(a - 1 + n) % n] === null) a--;
    while (raw[(b + 1) % n] === null) b++;
    const va = raw[(a - 1 + n) % n], vb = raw[(b + 1) % n];
    const k = (i - a + 1) / (b - a + 2);
    return va + (vb - va) * k + 0.05 * Math.sin(Math.PI * k);
  });
  return filled.map((_, i) => (filled[(i - 1 + n) % n] + 2 * filled[i] + filled[(i + 1) % n]) / 4);
})();
const bobAt = (ph) => {
  const x = ph * BOB.length, i = Math.floor(x) % BOB.length, k = x - Math.floor(x);
  return BOB[i] + (BOB[(i + 1) % BOB.length] - BOB[i]) * k;
};

export function makeRider(t, hole) {
  const { cx, cy, r } = hole;
  const s = r * 0.56;
  const phase = ((t / BEAT) % 1 + 1) % 1;
  const bob = bobAt(phase);
  const pitch = 4 * Math.sin(TAU * (phase - 0.25)) * D;
  const ox = cx - 0.02 * s, oy = cy + 0.2 * s;
  const tr = ([x, y]) => {
    const xr = x * Math.cos(pitch) - y * Math.sin(pitch);
    const yr = x * Math.sin(pitch) + y * Math.cos(pitch) + bob;
    return [ox + xr * s, oy - yr * s];
  };
  const trAll = (P) => P.map(tr);
  const parts = [], details = [], strands = [];
  const add = (name, group, pts, depth, tone = 0.5, attach = false) => parts.push({ name, group, pts: trAll(pts), depth, tone, attach });
  const line = (name, pts, weight = 1, closed = false) => details.push({ name, pts: trAll(catmull(pts, 6, closed)), closed, weight });

  // ----- legs -----
  const hoofs = [], contacts = [];
  for (const L of LEGS) {
    const lp = ((phase - L.off) % 1 + 1) % 1;
    const c = legChain(L, lp);
    contacts.push(lp < STANCE_END ? Math.sin(Math.PI * lp / STANCE_END) : 0);
    const depth = L.near ? 3 : -3;
    const tone = L.near ? 0.5 : 0.3;
    let outline, tip;
    if (L.hind) {
      // Thigh muscle mass, gaskin, the knob of the hock, slim cannon, fetlock, pastern.
      outline = sweep(c, [[0, 0.34], [0.18, 0.26], [0.34, 0.17], [0.5, 0.12], [0.56, 0.13], [0.62, 0.085], [0.8, 0.075], [0.86, 0.1], [0.92, 0.075], [1, 0.07]]);
    } else {
      outline = sweep(c, [[0, 0.3], [0.2, 0.2], [0.42, 0.13], [0.52, 0.12], [0.56, 0.09], [0.78, 0.075], [0.84, 0.1], [0.92, 0.072], [1, 0.07]]);
    }
    add(L.name, 'horse', outline, depth, tone, true);
    // Hoof: a short wedge along the pastern's direction.
    const [fx, fy] = c[3], [hx, hy] = c[4];
    const ang = Math.atan2(hy - fy, hx - fx);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const hw = 0.055, hl = 0.07;
    tip = [hx + Math.cos(ang) * hl, hy + Math.sin(ang) * hl];
    add(L.name + 'Hoof', 'horse', [[hx + nx * hw, hy + ny * hw], [tip[0] + nx * hw * 1.25, tip[1] + ny * hw * 1.25], [tip[0] - nx * hw * 1.1, tip[1] - ny * hw * 1.1], [hx - nx * hw, hy - ny * hw]], depth + 0.1, 0.15);
    hoofs.push(tr(tip));
    if (L.near) {
      line(L.name + 'Joint', [c[1], [(c[1][0] + c[2][0]) / 2 + 0.02, (c[1][1] + c[2][1]) / 2]], 0.6);
    }
  }

  // ----- body, neck and head -----
  const reach = 0.05 * Math.sin(TAU * (phase - 0.45));
  const nod = 6 * Math.sin(TAU * (phase - 0.4));
  const BODY = [
    [-0.78, 0.18], [-0.7, 0.36], [-0.5, 0.42], [-0.22, 0.36], [0.06, 0.34], [0.3, 0.42],      // buttock, croup, loin, back, withers
    [0.46, 0.5], [0.62, 0.72 + reach], [0.74, 0.88 + reach],                                 // crest of the neck up to the poll
    [0.86, 0.72 + reach], [0.74, 0.46], [0.66, 0.22], [0.64, 0.02],                          // throat, underside of neck, chest
    [0.5, -0.18], [0.24, -0.28], [-0.12, -0.26], [-0.42, -0.2], [-0.62, -0.1], [-0.76, 0.02], // girth, belly, flank, stifle
  ];
  add('body', 'horse', catmull(BODY, 8, true), 0, 0.55);
  // Head: drawn along its own axis from the poll, nodding with the stride.
  const poll = [0.76, 0.86 + reach];
  const hAng = (-62 + nod) * D;
  const HL = 0.5;
  const HEAD = [[0, 0.06], [0.1, 0.075], [0.22, 0.07], [0.38, 0.045], [0.5, 0.02], [0.56, -0.02], [0.57, -0.07],
    [0.54, -0.11], [0.48, -0.12], [0.42, -0.11], [0.34, -0.12], [0.2, -0.16], [0.08, -0.18], [-0.02, -0.12], [-0.05, 0]];
  // v is stretched a little: a horse's head is deep at the jaw.
  const hp = ([u, v]) => { v *= 1.35; return [poll[0] + (u * Math.cos(hAng) - v * Math.sin(hAng)) * HL / 0.57, poll[1] + (u * Math.sin(hAng) + v * Math.cos(hAng)) * HL / 0.57]; };
  add('head', 'horse', catmull(HEAD.map(hp), 5, true), 0.4, 0.55);
  const EARS = [[[0.02, 0.05], [-0.02, 0.17], [0.06, 0.07]], [[0.05, 0.06], [0.04, 0.16], [0.1, 0.07]]];
  EARS.forEach((e, i) => add('ear' + i, 'horse', catmull(e.map(hp), 4, true), i ? 0.45 : 0.35, 0.5));
  const eye = hp([0.17, -0.01]), nostril = hp([0.5, -0.05]), mouth = [hp([0.42, -0.105]), hp([0.53, -0.1])];
  details.push({ name: 'eye', pts: trAll(Array.from({ length: 10 }, (_, i) => [eye[0] + Math.cos(i / 10 * TAU) * 0.022, eye[1] + Math.sin(i / 10 * TAU) * 0.016])), closed: true, weight: 1.4 });
  line('nostril', [hp([0.47, -0.035]), hp([0.5, -0.06]), hp([0.47, -0.075])], 1);
  line('mouth', mouth, 0.8);
  line('jaw', [hp([0.06, -0.06]), hp([0.16, -0.12]), hp([0.3, -0.1])], 0.8);
  // Muscles: shoulder blade, the line of the forearm, flank, the round of the haunch.
  line('shoulder', [[0.28, 0.4], [0.4, 0.14], [0.5, -0.06]], 0.8);
  line('neckMuscle', [[0.48, 0.3], [0.62, 0.52 + reach], [0.72, 0.7 + reach]], 0.6);
  line('ribs', [[0.0, -0.18], [0.14, 0.0], [0.18, 0.12]], 0.5);
  line('flank', [[-0.36, -0.14], [-0.3, 0.06]], 0.6);
  line('haunch', [[-0.3, 0.34], [-0.52, 0.22], [-0.6, 0.0], [-0.5, -0.14]], 0.8);
  line('belly', [[-0.3, -0.21], [0.2, -0.25]], 0.5);

  // Mane along the crest, forelock between the ears, tail streaming.
  for (let i = 0; i < 16; i++) {
    const k = i / 15;
    const base = [0.4 + 0.36 * k, 0.48 + 0.4 * k + reach * k];
    const wav = Math.sin(TAU * phase * 2 - i * 0.7) * 0.03;
    const len = 0.16 + 0.06 * Math.sin(i * 2.3);
    strands.push({ pts: trAll(catmull([base, [base[0] - len * 0.5, base[1] - 0.02 + wav], [base[0] - len, base[1] - 0.07 + wav * 2]], 4, false)), w: 0.025 * s });
  }
  for (let i = 0; i < 3; i++) strands.push({ pts: trAll([hp([0.04, 0.06 - i * 0.02]), hp([0.1, -0.02 - i * 0.03])]), w: 0.02 * s });
  for (let i = 0; i < 34; i++) {
    const spread = (i / 33 - 0.5);
    const len = 0.62 + 0.18 * Math.sin(i * 1.7);
    const P = [];
    for (let k = 0; k <= 7; k++) {
      const u = k / 7;
      // Hairs fan out from the dock, sag a little, and ripple in the wind.
      P.push([-0.76 - u * len, 0.3 - u * 0.2 * (1 - u * 0.4) + spread * 0.22 * u + Math.sin(TAU * phase - u * 3 + i * 0.4) * 0.07 * u]);
    }
    strands.push({ pts: trAll(catmull(P, 3, false)), w: (0.026 - Math.abs(spread) * 0.03) * s * (1 + 0.3 * Math.sin(i)) });
  }
  add('tailBase', 'horse', catmull([[-0.7, 0.36], [-0.82, 0.33], [-0.86, 0.27], [-0.74, 0.27]], 4, true), 0.05, 0.4);

  // ----- tack -----
  add('saddleBlanket', 'tack', catmull([[-0.24, 0.38], [0.18, 0.4], [0.2, 0.12], [-0.22, 0.1]], 4, true), 1, 0.7);
  add('saddle', 'tack', catmull([[-0.24, 0.42], [-0.18, 0.5], [0.0, 0.44], [0.12, 0.46], [0.16, 0.56], [0.2, 0.46], [0.14, 0.36], [-0.18, 0.36]], 5, true), 1.1, 0.35);
  line('girth', [[0.04, 0.34], [0.08, 0.0], [0.1, -0.26]], 1.4);
  line('bridle', [hp([0.04, 0.03]), hp([0.3, 0.0]), hp([0.46, -0.08])], 1.2);
  line('noseband', [hp([0.38, 0.04]), hp([0.38, -0.12])], 1.2);

  // ----- the cowboy, crouched forward in the stirrups -----
  const ride = 0.03 * Math.sin(TAU * (phase - 0.6));
  const seat = [-0.02, 0.47 + ride];
  const knee = [0.2, 0.34 + ride * 0.5];
  const foot = [0.08, 0.02];
  const shoulder = [0.36, 0.96 + ride];
  const neck = [0.27, 1.1 + ride];
  // Leg: thigh, calf in chaps, boot in the stirrup.
  add('riderLegFar', 'rider', sweep([seat, [0.16, 0.36], [0.04, 0.06]], [[0, 0.16], [0.5, 0.12], [1, 0.09]]), -1, 0.2, true);
  add('riderLeg', 'rider', sweep([seat, knee, foot], [[0, 0.2], [0.45, 0.14], [0.55, 0.13], [1, 0.1]]), 2, 0.4, true);
  add('boot', 'rider', catmull([[0.02, 0.1], [0.12, 0.1], [0.14, 0.02], [0.26, -0.01], [0.26, -0.04], [0.02, -0.04]], 3, true), 2.1, 0.15);
  line('stirrup', [[0.06, 0.12], [0.08, -0.06], [0.2, -0.06]], 1.2);
  // Torso in a jacket, leaning into the run.
  add('torso', 'rider', catmull([[-0.1, 0.48 + ride], [0.12, 0.5 + ride], [0.34, 0.74 + ride], [0.46, 0.94 + ride], [0.4, 1.04 + ride], [0.24, 1.02 + ride], [0.08, 0.84 + ride], [-0.08, 0.64 + ride]], 6, true), 2.2, 0.45);
  line('jacketFold', [[0.08, 0.6 + ride], [0.22, 0.78 + ride], [0.32, 0.92 + ride]], 0.6);
  line('belt', [[-0.05, 0.58 + ride], [0.16, 0.6 + ride]], 1.2);
  // Bandana and head under a wide-brimmed hat.
  add('bandana', 'rider', catmull([[0.34, 1.04 + ride], [0.48, 1.04 + ride], [0.44, 0.96 + ride], [0.32, 0.96 + ride]], 3, true), 2.4, 0.8);
  const head = [0.48, 1.13 + ride];
  add('riderHead', 'rider', catmull([[head[0] - 0.07, head[1] + 0.02], [head[0] - 0.02, head[1] + 0.08], [head[0] + 0.06, head[1] + 0.06], [head[0] + 0.09, head[1] + 0.0], [head[0] + 0.1, head[1] - 0.03],
    [head[0] + 0.07, head[1] - 0.05], [head[0] + 0.06, head[1] - 0.09], [head[0] - 0.02, head[1] - 0.1], [head[0] - 0.07, head[1] - 0.04]], 4, true), 2.5, 0.65);
  const hatC = [head[0] + 0.0, head[1] + 0.08];
  add('hatBrim', 'rider', catmull([[hatC[0] - 0.19, hatC[1] - 0.01], [hatC[0] - 0.12, hatC[1] + 0.02], [hatC[0] + 0.12, hatC[1] + 0.02], [hatC[0] + 0.2, hatC[1] + 0.03], [hatC[0] + 0.14, hatC[1] - 0.03], [hatC[0] - 0.14, hatC[1] - 0.03]], 4, true), 2.7, 0.25);
  add('hatCrown', 'rider', catmull([[hatC[0] - 0.09, hatC[1]], [hatC[0] - 0.08, hatC[1] + 0.1], [hatC[0] - 0.02, hatC[1] + 0.12], [hatC[0] + 0.01, hatC[1] + 0.09], [hatC[0] + 0.04, hatC[1] + 0.12], [hatC[0] + 0.09, hatC[1] + 0.09], [hatC[0] + 0.09, hatC[1]]], 4, true), 2.75, 0.25);
  line('hatBand', [[hatC[0] - 0.085, hatC[1] + 0.025], [hatC[0] + 0.085, hatC[1] + 0.025]], 1.2);
  // Rein arm forward to the horse's neck.
  const reinHand = [0.66, 0.84 + reach * 0.5];
  add('armReins', 'rider', sweep([shoulder, [0.54, 0.8 + ride], reinHand], [[0, 0.12], [0.5, 0.1], [1, 0.08]]), 2.6, 0.45, true);
  line('reins', [reinHand, hp([0.2, -0.05]), hp([0.44, -0.1])], 1);
  // Lasso arm up, the hand circling as it spins the loop.
  const spin = TAU * (t / BEAT) * 0.5;
  const hand = [0.4 + Math.cos(spin) * 0.07, 1.56 + ride + Math.sin(spin) * 0.03];
  add('armLasso', 'rider', sweep([[0.32, 1.0 + ride], [0.28, 1.28 + ride], hand], [[0, 0.11], [0.5, 0.09], [1, 0.075]]), 1.9, 0.5, true);
  const loopC = [hand[0] + 0.05, hand[1] + 0.16];
  const loop = { c: tr(loopC), rx: 0.42 * s, ry: 0.11 * s, rot: -0.08 + pitch };
  const ropeStart = tr(hand);
  const lp = (a) => [loop.c[0] + Math.cos(a) * loop.rx, loop.c[1] + Math.sin(a) * loop.ry];
  const near = lp(spin + Math.PI / 2);

  parts.sort((a, b) => a.depth - b.depth);
  return {
    s, parts, details, strands,
    lasso: { cx: loop.c[0], cy: loop.c[1], rx: loop.rx, ry: loop.ry, rot: loop.rot, spin, rope: [ropeStart, near] },
    joints: { hoofs, eye: tr(eye), muzzle: tr(hp([0.56, -0.06])), hand: tr(hand), hatTop: tr([hatC[0], hatC[1] + 0.12]), saddle: tr(seat) },
    ground: oy - (GROUND) * s - bob * s * 0 + 0,
    contacts,
    scroll: t * s * 2.6,
    phase,
  };
}

// ---------- drawing helpers for styles ----------
// The outline worth inking: whole for most parts, but limbs leave their root open so no line
// cuts across the body where they join it.
export function outlinePts(p) {
  if (!p.attach) return { pts: p.pts, closed: true };
  const k = Math.round(p.pts.length * 0.06);
  return { pts: p.pts.slice(k, p.pts.length - k), closed: false };
}

export function partPath(ctx, p) {
  ctx.beginPath();
  p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

export function strandPath(ctx, st) {
  ctx.beginPath();
  st.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

// The whole rider in one colour: parts, hair and the lasso. grow fattens it (outlines underneath).
export function paintRider(ctx, rig, color, grow = 0) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const p of rig.parts) {
    partPath(ctx, p);
    ctx.fill();
    if (grow > 0) { ctx.lineWidth = grow * 2; ctx.stroke(); }
  }
  for (const st of rig.strands) {
    ctx.lineWidth = st.w + grow * 2;
    strandPath(ctx, st);
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(2, rig.s * 0.012) + grow * 2;
  lassoPath(ctx, rig);
  ctx.stroke();
  ctx.restore();
}

export function lassoPath(ctx, rig) {
  const L = rig.lasso;
  ctx.beginPath();
  ctx.ellipse(L.cx, L.cy, L.rx, L.ry, L.rot, 0, TAU);
  ctx.moveTo(L.rope[0][0], L.rope[0][1]);
  ctx.lineTo(L.rope[1][0], L.rope[1][1]);
}

// Detail lines (muscles, eye, tack, folds) in one colour; width scales with each line's weight.
export function paintDetails(ctx, rig, color, width) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const d of rig.details) {
    ctx.lineWidth = width * d.weight;
    ctx.beginPath();
    d.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (d.closed) ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

// White-on-transparent silhouette, for styles that texture, pixelate or clip with it.
export function riderMask(createCanvas, w, h, rig, grow = 0) {
  const c = createCanvas(w, h);
  paintRider(c.getContext('2d'), rig, '#fff', grow);
  return c;
}

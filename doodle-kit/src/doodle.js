// doodle.js：作业本涂鸦引擎，纯 2D canvas。
// 圆珠笔是连续的细线，沿线有轻微的出墨不匀和断墨；彩铅是斜排线，再被纸齿抠出颗粒。
// 静止的笔记、页边小画先画进一张 2 倍分辨率的整页贴图，每帧只画会动的东西。
// 帧是 t 的纯函数：随机数全部由种子决定，活着的涂鸦按 BOIL 帧率换种子轻轻抖。

const [W, H] = PROJECT.size, BPM = PROJECT.bpm, BEAT = 60 / BPM, DUR = PROJECT.duration;
const TAU = Math.PI * 2, BOIL = 8, PS = 2;
const PG = { w: 2400, h: 1500, rule: 62, top: 200, margin: 540, padL: 480 };
const INK = { blue: '#27348b', red: '#c23a32', black: '#2b2a33', ghost: '#b8b0a2' };
const PEN = { orange: '#ee9450', peach: '#f6bd8c', pink: '#ec8f98', green: '#78b058', greenDk: '#4f8a3c', yellow: '#f0c548', sky: '#86bde0', lilac: '#9d90d2', grey: '#8d8a86' };

// ---------- 小工具 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, x) => a + (b - a) * x;
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const backOut = (x, s = 1.7) => { x = clamp(x); return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const frac = x => x - Math.floor(x);
const spring = (t, t0, k = 6, w = 18) => t < t0 ? 0 : Math.exp(-k * (t - t0)) * Math.sin(w * (t - t0));
const vnoise = (s, seed = 0) => { const i = Math.floor(s), f = s - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u); };
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mixCol = (a, b, k) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), c = i => Math.round(lerp((pa >> i) & 255, (pb >> i) & 255, clamp(k)));
  return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
};
const ell = (cx, cy, rx, ry, n = 22, rot = 0) => { const p = [], c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * c - y * s, cy + x * s + y * c]); } return p; };
const jitter = (P, amt, seed) => P.map(([x, y], i) => [x + (hash(seed + i * 3.1) - .5) * 2 * amt, y + (hash(seed + i * 7.7 + 1) - .5) * 2 * amt]);
function through(P, n = 6, closed = false) {
  const L = P.length, out = [], get = i => closed ? P[(i + L) % L] : P[clamp(i, 0, L - 1)];
  const segs = closed ? L : L - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3)));
    }
  }
  out.push(closed ? P[0] : P[L - 1]);
  return out;
}
function lengths(P) { const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return L; }
// 折线上走到 k（0..1）处的点
function along(P, k) {
  const L = lengths(P), d = L[L.length - 1] * clamp(k);
  let i = 1; while (i < P.length - 1 && L[i] < d) i++;
  const f = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
  return [lerp(P[i - 1][0], P[i][0], f), lerp(P[i - 1][1], P[i][1], f)];
}

// ---------- 圆珠笔 ----------
// o: col / w 粗细 / reveal 画到哪 / seed / a 浓淡 / skip 断墨程度 / smooth / closed / gob 起笔墨点
function bp(c, pts, o = {}) {
  if (pts.length < 2) return null;
  const P = o.smooth === false ? pts : through(pts, o.n || 6, !!o.closed);
  const L = lengths(P), tot = L[L.length - 1], lim = tot * clamp(o.reveal ?? 1);
  if (lim <= .5) return P[0];
  const seed = o.seed ?? 1, w = o.w ?? 2.6, a0 = o.a ?? 1, skip = o.skip ?? .5;
  c.save(); c.globalCompositeOperation = o.blend || 'multiply'; c.strokeStyle = o.col || INK.blue; c.fillStyle = o.col || INK.blue;
  c.lineCap = 'round'; c.lineJoin = 'round';
  let tip = P[0], k = 1;
  while (k < P.length && L[k - 1] < lim) {
    const s = L[k - 1], n1 = vnoise(s * .045, seed), n2 = vnoise(s * .11, seed + 9);
    let al = a0 * (.78 + .22 * n1);
    if (n2 > 1 - .16 * skip) al *= .45;                   // 偶尔断墨
    c.globalAlpha = al; c.lineWidth = w * (.85 + .3 * n1);
    c.beginPath(); c.moveTo(P[k - 1][0], P[k - 1][1]);
    const k1 = Math.min(P.length - 1, k + 3);
    for (; k <= k1; k++) {
      if (L[k] > lim) { const f = (lim - L[k - 1]) / Math.max(1e-6, L[k] - L[k - 1]); tip = [lerp(P[k - 1][0], P[k][0], f), lerp(P[k - 1][1], P[k][1], f)]; c.lineTo(tip[0], tip[1]); k = P.length; break; }
      c.lineTo(P[k][0], P[k][1]); tip = P[k];
    }
    c.stroke();
  }
  if (o.gob !== false) { c.globalAlpha = a0 * .85; c.beginPath(); c.arc(P[0][0], P[0][1], w * .62, 0, TAU); c.fill(); }
  c.restore();
  return tip;
}
// 圆珠笔涂实（眼珠、墨团）：一圈圈小椭圆来回涂
function bpFill(c, cx, cy, rx, ry, o = {}) {
  c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = o.col || INK.blue; c.globalAlpha = o.a ?? .92;
  c.beginPath(); c.ellipse(cx, cy, rx, ry, o.rot || 0, 0, TAU); c.fill(); c.restore();
  const s = o.seed ?? 3, ring = [];
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU * 1.3; ring.push([cx + Math.cos(a) * rx * (.55 + .4 * hash(s + i)), cy + Math.sin(a) * ry * (.55 + .4 * hash(s + i + 4))]); }
  bp(c, ring, { col: o.col, w: Math.min(rx, ry) * .45, a: .5, seed: s, gob: false });
}

// ---------- 彩铅 ----------
// 斜排线，先画在草稿层，再用纸齿遮罩抠出颗粒，最后 multiply 到纸上。
// o: ang 排线角度(度) / gap 线距 / a 浓淡 / seed / reveal 涂到哪（沿排线方向扫过去）/ w 线宽 / cross 交叉第二遍
const MASK = {};
function valueNoise(w, h, gx, gy, rnd) {
  const g = []; for (let i = 0; i < (gx + 1) * (gy + 1); i++) g.push(rnd());
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = x / w * gx, fy = y / h * gy, ix = Math.floor(fx), iy = Math.floor(fy), ux = fx - ix, uy = fy - iy;
    const sx = ux * ux * (3 - 2 * ux), sy = uy * uy * (3 - 2 * uy), gi = (a, b) => g[(b % gy) * (gx + 1) + (a % gx)];
    out[y * w + x] = lerp(lerp(gi(ix, iy), gi(ix + 1, iy), sx), lerp(gi(ix, iy + 1), gi(ix + 1, iy + 1), sx), sy);
  }
  return out;
}
function makeTooth() {
  const S = 512, rnd = mulberry(77), fine = valueNoise(S, S, 170, 170, rnd), mid = valueNoise(S, S, 40, 40, rnd);
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), id = c.createImageData(S, S), d = id.data;
  for (let i = 0; i < S * S; i++) { const v = .55 * fine[i] + .25 * mid[i] + .2 * rnd(); d[i * 4 + 3] = Math.round(clamp((v - .3) / .35) * 255); }
  c.putImageData(id, 0, 0); MASK.tooth = cv;
}
const SCRATCH = new Map();
function scratchFor(c) {
  const cv = c.canvas; let s = SCRATCH.get(cv);
  if (!s) { const sc = document.createElement('canvas'); sc.width = cv.width; sc.height = cv.height; s = sc.getContext('2d'); SCRATCH.set(cv, s); }
  return s;
}
function devBox(c, pts, pad) {
  const m = c.getTransform(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { const X1 = m.a * x + m.c * y + m.e, Y1 = m.b * x + m.d * y + m.f; x0 = Math.min(x0, X1); y0 = Math.min(y0, Y1); x1 = Math.max(x1, X1); y1 = Math.max(y1, Y1); }
  x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad)); x1 = Math.min(c.canvas.width, Math.ceil(x1 + pad)); y1 = Math.min(c.canvas.height, Math.ceil(y1 + pad));
  return [x0, y0, x1 - x0, y1 - y0];
}
function pencil(c, shape, col, o = {}) {
  const [bx, by, bw, bh] = devBox(c, shape, 6); if (bw <= 0 || bh <= 0) return;
  const S = scratchFor(c), m = c.getTransform(), zoom = Math.hypot(m.a, m.b), seed = o.seed ?? 5, r = mulberry(seed * 9973 + 1);
  S.setTransform(1, 0, 0, 1, 0, 0); S.globalCompositeOperation = 'source-over'; S.globalAlpha = 1; S.clearRect(bx, by, bw, bh);
  S.save(); S.beginPath(); S.rect(bx, by, bw, bh); S.clip(); S.setTransform(m);
  const P = o.smooth === false ? shape : through(shape, 5, true);
  S.beginPath(); S.moveTo(P[0][0], P[0][1]); for (const p of P) S.lineTo(p[0], p[1]); S.closePath(); S.clip();
  if (o.clip) { const Q = through(o.clip, 5, true); S.beginPath(); S.moveTo(Q[0][0], Q[0][1]); for (const p of Q) S.lineTo(p[0], p[1]); S.closePath(); S.clip(); }
  let cx = 0, cy = 0, R = 0; for (const [x, y] of shape) { cx += x; cy += y; } cx /= shape.length; cy /= shape.length;
  for (const [x, y] of shape) R = Math.max(R, Math.hypot(x - cx, y - cy));
  const passes = o.cross ? 2 : 1;
  S.strokeStyle = col; S.lineCap = 'round';
  for (let pass = 0; pass < passes; pass++) {
    const ang = ((o.ang ?? 62) + pass * 75) * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang), gap = o.gap ?? 3.4, n = Math.ceil(2 * R / gap) + 2;
    const rev = o.reveal ?? 1;
    for (let i = 0; i < n; i++) {
      if (i / n > rev) break;
      const v = -R + i * gap + (r() - .5) * gap * .6, len = R * 1.1;
      const u0 = -len + r() * R * .25, u1 = len - r() * R * .25, wob = (r() - .5) * 2.2;
      S.globalAlpha = (o.a ?? .8) * (.45 + .55 * r()); S.lineWidth = (o.w ?? 1.9) * (.8 + .4 * r());
      S.beginPath();
      S.moveTo(cx + ca * u0 - sa * v, cy + sa * u0 + ca * v);
      S.quadraticCurveTo(cx - sa * (v + wob), cy + ca * (v + wob), cx + ca * u1 - sa * (v + wob * .5), cy + sa * u1 + ca * (v + wob * .5));
      S.stroke();
    }
  }
  S.restore();
  const pat = S.createPattern(MASK.tooth, 'repeat');
  pat.setTransform(new DOMMatrix().translate(hash(seed) * 512, hash(seed + 1) * 512).scale(zoom * .55));
  S.globalCompositeOperation = 'destination-in'; S.fillStyle = pat; S.fillRect(bx, by, bw, bh);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'multiply'; c.globalAlpha = o.alpha ?? 1;
  c.drawImage(S.canvas, bx, by, bw, bh, bx, by, bw, bh); c.restore();
}

// ---------- 手写字（看不出内容的草书笔迹） ----------
// 每个字母一种形：hump 驼峰(n m) / loop 小圈(e) / o 闭合圆(o a) / tall 高圈(l h b) / desc 下行圈(g y) / t 带横 / i 带点
function scrawl(c, x0, base, width, seed, o = {}) {
  const r = mulberry(seed * 131 + 7), xh = o.xh ?? 12, slant = .3, col = o.col || INK.blue, w = o.w ?? 1.9, extras = [];
  let x = x0, words = 0;
  const kinds = ['hump', 'hump', 'loop', 'loop', 'o', 'o', 'tall', 'desc', 't', 'i', 'hump', 'o'];
  while (x < x0 + width - 40) {
    const nL = 1 + Math.floor(r() * 7), pts = [[x, base - xh * .3]];
    let cx = x;
    for (let i = 0; i < nL; i++) {
      const k = kinds[Math.floor(r() * kinds.length)], a = xh * (.85 + r() * .3), adv = xh * (.8 + r() * .45);
      const P = [];
      if (k === 'hump') P.push([cx + adv * .15, base - a], [cx + adv * .55, base - a * .95], [cx + adv * .7, base]);
      else if (k === 'loop') P.push([cx + adv * .7, base - a * .55], [cx + adv * .45, base - a], [cx + adv * .15, base - a * .5], [cx + adv * .35, base], [cx + adv * .8, base - a * .15]);
      else if (k === 'o') P.push([cx + adv * .8, base - a * .8], [cx + adv * .35, base - a * .95], [cx + adv * .08, base - a * .4], [cx + adv * .4, base + 1], [cx + adv * .78, base - a * .55], [cx + adv * .8, base - a * .85], [cx + adv * .85, base]);
      else if (k === 'tall') P.push([cx + adv * .55, base - a * 1.6], [cx + adv * .45, base - a * 2.3], [cx + adv * .15, base - a * 1.7], [cx + adv * .3, base], [cx + adv * .8, base - a * .3]);
      else if (k === 'desc') P.push([cx + adv * .6, base - a * .9], [cx + adv * .2, base - a * .6], [cx + adv * .45, base - a * .1], [cx + adv * .7, base - a * .8], [cx + adv * .55, base + a * 1.1], [cx + adv * .1, base + a * .9], [cx + adv * .85, base - a * .25]);
      else if (k === 't') { P.push([cx + adv * .4, base - a * 1.8], [cx + adv * .3, base], [cx + adv * .8, base - a * .3]); extras.push([[cx - adv * .1, base - a * 1.15], [cx + adv * .85, base - a * 1.25]]); }
      else { P.push([cx + adv * .35, base - a * .9], [cx + adv * .3, base], [cx + adv * .7, base - a * .3]); extras.push([[cx + adv * .4, base - a * 1.55], [cx + adv * .47, base - a * 1.6]]); }
      pts.push(...P); cx += adv;
    }
    const sl = pts.map(([px, py]) => [px + (base - py) * slant, py + (r() - .5) * 1.1]);
    bp(c, sl, { col, w, seed: seed * 10 + words, n: 4, a: o.a ?? .82, gob: false });
    x = cx + xh * (.8 + r() * .9); words++;
    if (r() < .07) { bp(c, [[x - xh * .4, base - 1], [x - xh * .45, base + xh * .35]], { col, w, seed: seed * 10 + words + 500, a: .8, gob: false }); x += xh * .4; }
  }
  extras.forEach((e, i) => bp(c, e.map(([px, py]) => [px + (base - py) * slant, py]), { col, w: w * .95, seed: seed * 20 + i, smooth: false, a: .8, gob: false }));
  return x;
}

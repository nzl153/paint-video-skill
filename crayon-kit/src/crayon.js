// crayon.js：油画棒/蜡笔引擎，纯 2D canvas，不用 p5.brush。
// 每个色块先实心画在草稿层，再用「纸齿」遮罩抠掉一部分：蜡只沾在纸纹凸起处，露出底下的纸。
// 遮罩按形状各自旋转、偏移，并以 BOIL 帧率换种子，所以线条和笔触会像逐帧重画那样轻轻抖动。
// 帧仍是 t 的纯函数：随机数全部由（本帧第几个形状，boil 帧号）决定。

const [W, H] = PROJECT.size, BPM = PROJECT.bpm, BEAT = 60 / BPM, OFF = PROJECT.offset || 0, DUR = PROJECT.duration;
const TAU = Math.PI * 2, BOIL = 8;
const PAL = {
  paper: '#f6eedb', ink: '#3b2c26', inkSoft: '#6b5448',
  skin: '#f8dcc2', blush: '#ee8a80',
  her: '#f29c8a', herDk: '#d9776a', skirt: '#fbe6c3', red: '#d6453a',
  him: '#6f95b8', himDk: '#4d7194', collar: '#f5ecd6', belt: '#3d5a78',
  beak: '#f0a53a',
  leaf: '#8db55b', leafLt: '#bfd684', leafDk: '#5f8a45', trunk: '#7a5a44',
  water: '#8ec3cf', waterDk: '#5f9fb2', grass: '#a9c96a', path: '#ead2a2',
  sky: '#cfe6ea', dawn: '#f8e1ae', sun: '#f6c44e',
  night: '#2f3a67', nightDk: '#1f2748', lantern: '#ef853a', glow: '#ffd27a', wall: '#e9dcc4', roof: '#55606e',
  white: '#fffaf0',
};

// ---------- 小工具 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, x) => a + (b - a) * x;
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const backOut = (x, s = 1.9) => { x = clamp(x); return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const frac = x => x - Math.floor(x);
const BT = b => OFF + b * BEAT;                          // 第 b 拍的时刻
const bpOf = t => (t - OFF) / BEAT;
const pulse = (t, k = 6) => Math.exp(-frac(bpOf(t)) * k);
const spring = (t, t0, k = 6, w = 18) => t < t0 ? 0 : Math.exp(-k * (t - t0)) * Math.sin(w * (t - t0));
const kick = (t, evs, k = 7, w = 16) => evs.reduce((s, e) => s + spring(t, e, k, w), 0);
const mixCol = (a, b, k) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), c = i => Math.round(lerp((pa >> i) & 255, (pb >> i) & 255, clamp(k)));
  return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
};
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let T = 0, BOILN = 0, SHAPE_N = 0, RND = Math.random;
let UNDER_DARK = 0, NIGHT_TINT = 0;   // NIGHT_TINT：柳树这类固定配色的布景夜里压暗   // 夜景：色块底下不垫纸，垫本色压暗一档，纸纹缝里就不会透出白
const jit = a => (RND() * 2 - 1) * a;
function reseed(extra = 0) { RND = mulberry((SHAPE_N++ * 7919 + BOILN * 104729 + extra * 31) | 0); }

// ---------- 形状点 ----------
const ell = (cx, cy, rx, ry, n = 22, rot = 0) => { const p = [], c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * c - y * s, cy + x * s + y * c]); } return p; };
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
// Catmull-Rom：过控制点的平滑曲线
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
  if (!closed) out.push(P[L - 1]);
  return out;
}

// ---------- 纸齿遮罩 ----------
// 细噪声 + 沿一个方向拉长的纤维噪声，按阈值切成几档覆盖率。蜡笔越用力，覆盖越满。
const MASKS = {};
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
function makeMasks() {
  const S = 512, rnd = mulberry(1234);
  const fib = valueNoise(S, S, 12, 160, rnd), mid = valueNoise(S, S, 24, 24, rnd), big = valueNoise(S, S, 5, 5, rnd);
  const v = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) v[i] = .42 * fib[i] + .2 * mid[i] + .13 * big[i] + .25 * rnd();
  const sorted = Float32Array.from(v).sort();
  const levels = { light: .42, mid: .64, heavy: .82, line: .9, solid: .97 };
  for (const [name, cov] of Object.entries(levels)) {
    const th = sorted[Math.floor((1 - cov) * (S * S - 1))], soft = .035;
    const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), id = c.createImageData(S, S), d = id.data;
    for (let i = 0; i < S * S; i++) { const a = clamp((v[i] - th + soft) / (2 * soft)); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 0; d[i * 4 + 3] = Math.round(a * 255); }
    c.putImageData(id, 0, 0); MASKS[name] = cv;
  }
}

// ---------- 绘制核心 ----------
let X = null, SC = null, SX = null, outC = null, paperC = null, grainC = null;
function transformPts(pts, m) { return pts.map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]); }
function bboxOf(pts, pad) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad)); x1 = Math.min(W, Math.ceil(x1 + pad)); y1 = Math.min(H, Math.ceil(y1 + pad));
  return [x0, y0, x1 - x0, y1 - y0];
}
// 一层蜡：draw(ctx) 在草稿层上用和主画布相同的变换画实心，再用纸齿遮罩抠。
function wax(screenPts, pad, draw, o = {}) {
  const m = X.getTransform(), [bx, by, bw, bh] = bboxOf(transformPts(screenPts, m), pad);
  if (bw <= 0 || bh <= 0) return;
  SX.setTransform(1, 0, 0, 1, 0, 0); SX.globalCompositeOperation = 'source-over'; SX.globalAlpha = 1; SX.clearRect(bx, by, bw, bh);
  SX.save(); SX.beginPath(); SX.rect(bx, by, bw, bh); SX.clip(); SX.setTransform(m); draw(SX); SX.restore();
  const mask = MASKS[o.d || 'heavy'];
  if (mask) {
    const pat = SX.createPattern(mask, 'repeat'), sc = o.grain || 1;
    pat.setTransform(new DOMMatrix().translate(RND() * 512, RND() * 512).rotate((o.ang ?? (RND() * 360))).scale(sc));
    SX.globalCompositeOperation = 'destination-in'; SX.fillStyle = pat; SX.fillRect(bx, by, bw, bh);
  }
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = o.a ?? 1; if (o.blend) X.globalCompositeOperation = o.blend;
  X.drawImage(SC, bx, by, bw, bh, bx, by, bw, bh); X.restore();
}
const scaleOf = () => { const m = X.getTransform(); return Math.hypot(m.a, m.b); };
function pathOf(c, P, closed) { c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); if (closed) c.closePath(); }
// 色块。o: d 覆盖档 / ang 笔触方向(度) / j 抖动(px) / line 描边色 / lw 描边粗 / a 透明度 / smooth 是否过点平滑 / edge 边缘加密
function blob(pts, col, o = {}) {
  reseed(); const j = o.j ?? 1.6, P0 = pts.map(([x, y]) => [x + jit(j), y + jit(j)]);
  const P = o.smooth === false ? P0 : through(P0, 5, true);
  const ang = o.ang ?? (-30 + jit(18));
  if (UNDER_DARK > 0 && !o.under && o.base !== false && (o.a ?? 1) >= 1 && !o.blend) o = { ...o, under: mixCol(col, '#151a33', UNDER_DARK) };
  // 先垫一层纸：蜡是涂在纸上的，底下的颜色不该从纸纹缝里透上来
  if (o.under) { X.save(); pathOf(X, P, true); X.fillStyle = o.under; X.fill(); X.restore(); }
  else if (o.base ?? ((o.a ?? 1) >= 1 && !o.blend)) { X.save(); pathOf(X, P, true); X.clip(); X.setTransform(1, 0, 0, 1, 0, 0); X.drawImage(paperC, 0, 0); X.restore(); }
  wax(P, 8, c => { c.fillStyle = col; pathOf(c, P, true); c.fill(); if (o.edge !== false) { c.strokeStyle = col; c.lineWidth = (o.edgeW ?? 5) / 1; c.lineJoin = 'round'; c.stroke(); } }, { d: o.d || 'heavy', ang, a: o.a, blend: o.blend });
  if (o.d2) wax(P, 8, c => { c.fillStyle = o.c2 || col; pathOf(c, P, true); c.fill(); }, { d: o.d2, ang: ang + 70 + jit(20), a: o.a });
  if (o.line) stroke(o.lineOpen ? P0 : [...P0, P0[0]], o.lw ?? 5, o.line, { j: 0, smooth: o.smooth, closed: !o.lineOpen, a: o.a });
}
// 线。粗细沿线起落（下笔重、收笔轻），蜡笔断续靠 line 档遮罩。
function stroke(pts, lw, col, o = {}) {
  reseed(); const j = o.j ?? 1.4, P0 = pts.map(([x, y]) => [x + jit(j), y + jit(j)]);
  const P = o.smooth === false ? P0 : through(P0, 6, !!o.closed);
  if (P.length < 2) return;
  const w0 = o.w0 ?? 1, w1 = o.w1 ?? .75;
  wax(P, lw + 6, c => {
    c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
    const n = P.length, step = Math.max(1, Math.floor(n / 14));
    for (let i = 0; i < n - 1; i += step) {
      const k = i / (n - 1), w = lw * lerp(w0, w1, k) * (1 + .12 * Math.sin(i * .7 + SHAPE_N));
      c.lineWidth = Math.max(.6, w); c.beginPath(); c.moveTo(P[i][0], P[i][1]);
      for (let q = i + 1; q <= Math.min(n - 1, i + step); q++) c.lineTo(P[q][0], P[q][1]);
      c.stroke();
    }
  }, { d: o.d || 'line', ang: o.ang, a: o.a, blend: o.blend });
}
const dot = (x, y, r, col, o = {}) => blob(ell(x, y, r, r, 10), col, { j: o.j ?? r * .08, d: o.d || 'solid', edge: false, ...o });
// 大面积底色：两遍不同方向，像来回涂满
function scribbleFill(pts, col, o = {}) { blob(pts, col, { d: 'mid', edge: false, j: 3, ...o, d2: o.d2 ?? 'light', c2: o.c2 }); }

// ---------- 画面辅助 ----------
function push() { X.save(); } function pop() { X.restore(); }
function cam(cx, cy, z = 1, rot = 0) { X.translate(W / 2, H / 2); X.rotate(rot); X.scale(z, z); X.translate(-cx, -cy); }
function paperBg(col = PAL.paper) { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.drawImage(paperC, 0, 0); if (col !== PAL.paper) { X.globalAlpha = 1; X.fillStyle = col; X.globalCompositeOperation = 'multiply'; X.fillRect(0, 0, W, H); } X.restore(); }
// 分格：在 (x,y,w,h) 格子里画 fn(w,h)，格子内坐标从 0 开始；格子自带纸底和粗蜡笔框。
function panel(x, y, w, h, fn, o = {}) {
  X.save(); X.translate(x, y); if (o.rot) { X.translate(w / 2, h / 2); X.rotate(o.rot); X.translate(-w / 2, -h / 2); }
  if (o.s != null) { X.translate(w / 2, h / 2); X.scale(o.s, o.s); X.translate(-w / 2, -h / 2); }
  X.save(); X.beginPath(); X.rect(0, 0, w, h); X.clip();
  X.fillStyle = PAL.paper; X.fillRect(0, 0, w, h);
  fn(w, h);
  X.restore();
  const r = [[0, 0], [w * .5, 0], [w, 0], [w, h * .5], [w, h], [w * .5, h], [0, h], [0, h * .5], [0, 0]];
  stroke(r, o.lw ?? 9, PAL.ink, { smooth: false, j: 1.5, w1: 1 });
  X.restore();
}
// 转场：纸白一闪 / 蜡笔横扫
function flash(k, col = PAL.white) { if (k <= .01) return; X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = clamp(k); X.fillStyle = col; X.fillRect(0, 0, W, H); X.restore(); }

// ---------- 时间线 ----------
const SHOTS = [], LOOPS = {};
function shots(list) { SHOTS.push(...list); SHOTS.sort((a, b) => a[0] - b[0]); }
function drawWorld(t) {
  if (window.LOOP) return window.LOOP(t);
  if (!SHOTS.length) { paperBg(); return; }
  let i = 0; while (i + 1 < SHOTS.length && t >= SHOTS[i + 1][0]) i++;
  const t0 = SHOTS[i][0], end = i + 1 < SHOTS.length ? SHOTS[i + 1][0] : DUR;
  X.save(); SHOTS[i][1](t, t - t0, end - t0); X.restore();
}

// ---------- 纸 ----------
function makePaper() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), rnd = mulberry(11);
  c.fillStyle = PAL.paper; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { const x = rnd() * W, y = rnd() * H, r = 150 + rnd() * 400, g = c.createRadialGradient(x, y, 0, x, y, r), a = .04 * rnd(); g.addColorStop(0, `rgba(170,135,90,${a})`); g.addColorStop(1, 'rgba(170,135,90,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
  c.lineWidth = 1;
  for (let i = 0; i < 1200; i++) { const x = rnd() * W, y = rnd() * H, l = 5 + rnd() * 20, a = rnd() * TAU; c.strokeStyle = `rgba(120,95,65,${.03 + rnd() * .05})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  return cv;
}
function makeGrain() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), rnd = mulberry(5);
  const id = c.createImageData(W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const v = 255 - (rnd() < .5 ? rnd() * rnd() * 26 : 0); d[i] = v; d[i + 1] = v - 1; d[i + 2] = v - 3; d[i + 3] = 255; }
  c.putImageData(id, 0, 0);
  const g = c.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, H * 1.1); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(130,100,70,.28)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  return cv;
}

// ---------- 渲染入口（render.mjs 调用） ----------
function renderFrame(t) {
  T = t; BOILN = Math.floor(t * BOIL + 1e-6); SHAPE_N = 0; UNDER_DARK = 0; NIGHT_TINT = 0;
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.globalCompositeOperation = 'source-over';
  X.drawImage(paperC, 0, 0);
  drawWorld(t);
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1;
  X.globalCompositeOperation = 'multiply'; X.drawImage(grainC, 0, 0); X.globalCompositeOperation = 'source-over';
}
window.renderAt = async (t, type = 'image/png', q = .92) => { renderFrame(t); return outC.toDataURL(type, q); };
window.renderSheet = async (times, cols = 3, w = 640, crop = null) => {
  const [, , cw, ch] = crop || [0, 0, W, H], h = Math.round(w * ch / cw), rows = Math.ceil(times.length / cols), sc = document.createElement('canvas');
  sc.width = cols * w; sc.height = rows * h; const c = sc.getContext('2d'), ms = [];
  for (let i = 0; i < times.length; i++) {
    const t0 = performance.now(); renderFrame(times[i]); ms.push(Math.round(performance.now() - t0));
    const x = (i % cols) * w, y = Math.floor(i / cols) * h, [cx, cy] = crop || [0, 0];
    c.drawImage(outC, cx, cy, cw, ch, x, y, w, h); c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(x, y, 84, 24); c.fillStyle = '#fff'; c.font = '15px sans-serif'; c.fillText(times[i].toFixed(2) + 's', x + 6, y + 17);
  }
  return { url: sc.toDataURL('image/jpeg', .9), ms };
};
window.gpuInfo = () => 'canvas2d';
window.addEventListener('load', () => {
  outC = document.getElementById('out'); outC.width = W; outC.height = H; X = outC.getContext('2d');
  SC = document.createElement('canvas'); SC.width = W; SC.height = H; SX = SC.getContext('2d');
  makeMasks(); paperC = makePaper(); grainC = makeGrain();
  const q = new URLSearchParams(location.search).get('loop'); if (q && LOOPS[q]) window.LOOP = LOOPS[q];
  window.ready = true;
  if (!location.search.includes('render')) {
    const s = document.getElementById('scrub'), lab = document.getElementById('tt'); s.max = window.LOOP ? window.LOOP.len : DUR;
    const go = () => { const t0 = performance.now(); renderFrame(+s.value); lab.textContent = `${(+s.value).toFixed(2)}s · ${Math.round(performance.now() - t0)} ms`; };
    s.addEventListener('input', go); s.value = +(new URLSearchParams(location.search).get('t') || 0); go();
  }
});

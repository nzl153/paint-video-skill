// piying.js：皮影引擎，纯 2D canvas。
// 幕布被身后的油灯照亮。皮影是染了色的半透明驴皮：每一片单独画在草稿层（上色、皮纹、描边、镂空），
// 再 multiply 到幕上，所以重叠处自然变深，镂空处透出灯光。离幕越远越糊（blur）、越淡。
// 皮影是硬的，不像蜡笔那样抖笔触；活气来自灯火闪和操纵的手颤。帧仍是 t 的纯函数。

const [W, H] = PROJECT.size, BPM = PROJECT.bpm, BEAT = 60 / BPM, OFF = PROJECT.offset || 0, DUR = PROJECT.duration;
const TAU = Math.PI * 2;
const PAL = {
  stage: '#150d09', lampHot: '#fff3cf', lamp: '#fbe0a0', lampMid: '#e9a85a', lampEdge: '#7a3d18',
  wood: '#24150d', woodLt: '#5a3520',
  red: '#e2553c', blue: '#3f93b4', green: '#63a35a', yellow: '#f2bd48', black: '#4a2e20', leather: '#efd29a',
  ink: '#2a160c', rod: '#2b1a10',
};

// ---------- 小工具 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, x) => a + (b - a) * x;
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const backOut = (x, s = 1.9) => { x = clamp(x); return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const vnoise = x => { const i = Math.floor(x), f = x - i; return lerp(hash(i), hash(i + 1), f * f * (3 - 2 * f)); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const frac = x => x - Math.floor(x);
const BT = b => OFF + b * BEAT;
const spring = (t, t0, k = 6, w = 18) => t < t0 ? 0 : Math.exp(-k * (t - t0)) * Math.sin(w * (t - t0));
const linear = x => clamp(x);
// 关键帧：K = [[时刻, 值, 缓动?], ...]；值可以是数或数组，缓动写在段尾那一帧上（默认 ease）
function kf(t, K) {
  if (t <= K[0][0]) return K[0][1];
  for (let i = 0; i < K.length - 1; i++) {
    const [t0, v0] = K[i], [t1, v1, e] = K[i + 1];
    if (t < t1) { const k = (e || ease)(seg(t, t0, t1)); return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], k)) : lerp(v0, v1, k); }
  }
  return K[K.length - 1][1];
}
const mixCol = (a, b, k) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), c = i => Math.round(lerp((pa >> i) & 255, (pb >> i) & 255, clamp(k)));
  return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
};
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let T = 0;

const ell = (cx, cy, rx, ry, n = 22, rot = 0) => { const p = [], c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * c - y * s, cy + x * s + y * c]); } return p; };
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
function pathOf(c, P, closed = true) { c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); if (closed) c.closePath(); }
function transformPts(pts, m) { return pts.map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]); }
function bboxOf(pts, pad) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad)); x1 = Math.min(W, Math.ceil(x1 + pad)); y1 = Math.min(H, Math.ceil(y1 + pad));
  return [x0, y0, x1 - x0, y1 - y0];
}

// ---------- 画布 ----------
let X = null, SC = null, SX = null, outC = null, clothC = null, LEATHER = null;
function push() { X.save(); } function pop() { X.restore(); }
const here = (px, py) => { const m = X.getTransform(); return [m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f]; };
const scaleOf = () => { const m = X.getTransform(); return Math.hypot(m.a, m.b); };

// ---------- 幕布与灯 ----------
// lamp：灯的位置和亮度。k<1 变暗（开场点灯、谢幕熄灯）
let LAMP = { x: W * .5, y: H * .4, k: 1 };
function flick() { return 1 + .05 * (vnoise(T * 6.3) - .5) + .025 * (vnoise(T * 19 + 7) - .5); }
function screen(o = {}) {
  const lx = o.x ?? LAMP.x, ly = o.y ?? LAMP.y, k = (o.k ?? LAMP.k) * flick(), R = Math.max(W, H) * .78 * (.85 + .15 * k);
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.fillStyle = PAL.stage; X.fillRect(0, 0, W, H);
  const g = X.createRadialGradient(lx, ly, 0, lx, ly, R), d = c => mixCol(c, PAL.stage, 1 - clamp(k));
  g.addColorStop(0, d(PAL.lampHot)); g.addColorStop(.3, d(PAL.lamp)); g.addColorStop(.68, d(PAL.lampMid)); g.addColorStop(1, d(PAL.lampEdge));
  X.fillStyle = g; X.fillRect(0, 0, W, H);
  X.globalCompositeOperation = 'multiply'; X.drawImage(clothC, 0, 0);
  X.restore();
}

// ---------- 一片皮 ----------
// regions：[[点列, 颜色], ...] 同一张皮上染的几块颜色，后面的盖前面的。
// o: blur 离幕距离(px) / a 透明度 / ew 描边粗(局部单位) / cut(c) 镂空 / draw(c) 镂空之后再补的细节 / tex 皮纹缩放 / seed
let DEPTH = 0;   // 全局附加模糊：整场戏离幕远近
function piece(regions, o = {}) {
  const m = X.getTransform(), sc = Math.hypot(m.a, m.b), blur = (o.blur ?? 0) + DEPTH, ew = o.ew ?? .8;
  const all = regions.flatMap(r => r[0]);
  const [bx, by, bw, bh] = bboxOf(transformPts(all, m), ew * sc + blur * 3 + 6);
  if (bw <= 0 || bh <= 0) return;
  SX.setTransform(1, 0, 0, 1, 0, 0); SX.globalCompositeOperation = 'source-over'; SX.globalAlpha = 1; SX.clearRect(bx, by, bw, bh);
  SX.save(); SX.beginPath(); SX.rect(bx, by, bw, bh); SX.clip(); SX.setTransform(m);
  for (const [P, col] of regions) { pathOf(SX, P); SX.fillStyle = col; SX.fill(); }
  // union：几块同色的形状连成一片（树冠），只描外轮廓——先描边，再把填色盖回去压掉里面的线
  if (o.union) {
    SX.lineJoin = 'round'; SX.lineWidth = ew * 2; for (const [P, col] of regions) { pathOf(SX, P); SX.strokeStyle = o.edge || mixCol(col, PAL.ink, .6); SX.stroke(); }
    for (const [P, col] of regions) { pathOf(SX, P); SX.fillStyle = col; SX.fill(); }
  }
  // 皮纹：贴在这片皮自己的坐标里，跟着皮走，不会在上面「游泳」
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of all) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const pat = SX.createPattern(LEATHER, 'repeat'), ts = o.tex ?? .1, sd = o.seed ?? 0;
  pat.setTransform(new DOMMatrix().translate(hash(sd) * 40, hash(sd + 9) * 40).scale(ts));
  SX.save(); SX.globalCompositeOperation = 'source-atop'; SX.globalAlpha = o.mottle ?? .6; SX.fillStyle = pat; SX.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4); SX.restore();
  SX.lineJoin = 'round'; SX.lineCap = 'round';
  if (!o.union) for (const [P, col] of regions) { pathOf(SX, P); SX.lineWidth = ew; SX.strokeStyle = o.edge || mixCol(col, PAL.ink, .6); SX.stroke(); }
  if (o.cut) { SX.save(); SX.globalCompositeOperation = 'destination-out'; SX.fillStyle = SX.strokeStyle = '#000'; o.cut(SX); SX.restore(); }
  if (o.draw) { SX.save(); o.draw(SX); SX.restore(); }
  SX.restore();
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalCompositeOperation = o.blend || 'multiply'; X.globalAlpha = o.a ?? 1;
  if (blur > .3) X.filter = `blur(${blur.toFixed(1)}px)`;
  X.drawImage(SC, bx, by, bw, bh, bx, by, bw, bh); X.restore();
}
const pc = (P, col, o) => piece([[P, col]], o);

// ---------- 镂空花样（在局部坐标里调用，画出来的地方会被挖掉） ----------
const cut = {
  dot(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); },
  ring(c, x, y, r, w) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.arc(x, y, r - w, 0, TAU, true); c.fill(); },
  diamond(c, x, y, r) { pathOf(c, [[x, y - r], [x + r * .7, y], [x, y + r], [x - r * .7, y]]); c.fill(); },
  crescent(c, x, y, r, a = -Math.PI / 2) {
    c.beginPath(); c.arc(x, y, r, a - 1.35, a + 1.35);
    c.arc(x - Math.cos(a) * r * .35, y - Math.sin(a) * r * .35, r * .95, a + 1.2, a - 1.2, true); c.closePath(); c.fill();
  },
  swirl(c, x, y, r, w, turns = 1.3, dir = 1, a0 = 0) {
    c.beginPath();
    for (let i = 0; i <= 48; i++) { const s = i / 48, a = a0 + dir * s * TAU * turns, rr = r * (1 - s * .82), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.lineWidth = w; c.lineCap = 'round'; c.stroke();
  },
  line(c, P, w) { pathOf(c, P, false); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); },
  poly(c, P) { pathOf(c, P); c.fill(); },
  row(c, x0, y0, x1, y1, n, r, kind = 'dot', ...rest) { for (let i = 0; i < n; i++) { const k = n > 1 ? i / (n - 1) : .5; cut[kind](c, lerp(x0, x1, k), lerp(y0, y1, k), r, ...rest); } },
  wave(c, x0, x1, y, amp, n, w) { const P = []; for (let i = 0; i <= n * 8; i++) { const k = i / (n * 8); P.push([lerp(x0, x1, k), y + Math.sin(k * n * TAU) * amp]); } cut.line(c, P, w); },
  // 在多边形里按格子铺花样，离边缘至少 margin（皮的边要留着，不然会散）。odd 行错开半格
  fill(c, poly, step, fn, margin = 1.2, stepY = step) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    let row = 0;
    for (let y = y0 + margin; y <= y1 - margin; y += stepY, row++) for (let x = x0 + margin + (row % 2 ? step / 2 : 0); x <= x1 - margin; x += step)
      if (inPoly(x, y, poly) && edgeDist(x, y, poly) >= margin) fn(c, x, y, row);
  },
};
function inPoly(x, y, P) { let r = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) r = !r; } return r; }
function edgeDist(x, y, P) {
  let d = 1e9;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i], dx = bx - ax, dy = by - ay, k = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)); d = Math.min(d, Math.hypot(x - ax - k * dx, y - ay - k * dy)); }
  return d;
}

// 操纵杆：从 A 到 B，上细下粗，离幕比皮影远一点所以略糊
function rod(A, B, o = {}) {
  const w0 = o.w0 ?? 2.4, w1 = o.w1 ?? 7, dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalCompositeOperation = 'multiply'; X.globalAlpha = o.a ?? .9;
  X.filter = `blur(${(o.blur ?? 1.4) + DEPTH}px)`;
  pathOf(X, [[A[0] + nx * w0 / 2, A[1] + ny * w0 / 2], [B[0] + nx * w1 / 2, B[1] + ny * w1 / 2], [B[0] - nx * w1 / 2, B[1] - ny * w1 / 2], [A[0] - nx * w0 / 2, A[1] - ny * w0 / 2]]);
  X.fillStyle = o.col || PAL.rod; X.fill();
  X.beginPath(); X.arc(A[0], A[1], w0 * 1.3, 0, TAU); X.fill();
  X.restore();
}

// 台口：上面雕花的横楣、下面的台沿、两边立柱。它们在幕前面，只被幕布反光照亮一点。
function stageFrame(o = {}) {
  const top = o.top ?? 74, bot = o.bot ?? 66, side = o.side ?? 34;
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.beginPath(); X.rect(0, 0, W, top);
  for (let i = 0; i < 24; i++) { const x = 60 + i * (W - 120) / 23, y = top * .52; X.moveTo(x, y - 13); X.lineTo(x + 9, y); X.lineTo(x, y + 13); X.lineTo(x - 9, y); X.closePath(); }
  X.fillStyle = PAL.wood; X.fill('evenodd');
  X.fillRect(0, H - bot, W, bot); X.fillRect(0, 0, side, H); X.fillRect(W - side, 0, side, H);
  const lk = clamp(LAMP.k);
  const lit = X.createLinearGradient(0, H - bot, 0, H - bot + 10); lit.addColorStop(0, `rgba(160,95,50,${.8 * lk})`); lit.addColorStop(1, 'rgba(160,95,50,0)');
  X.fillStyle = lit; X.fillRect(side, H - bot, W - 2 * side, 10);
  const lt = X.createLinearGradient(0, top - 8, 0, top); lt.addColorStop(0, 'rgba(160,95,50,0)'); lt.addColorStop(1, `rgba(160,95,50,${.6 * lk})`);
  X.fillStyle = lt; X.fillRect(side, top - 8, W - 2 * side, 8);
  X.restore();
}
const GROUND = H - 66;

// ---------- 时间线 ----------
const SHOTS = [], LOOPS = {};
function shots(list) { SHOTS.push(...list); SHOTS.sort((a, b) => a[0] - b[0]); }
function drawWorld(t) {
  if (window.LOOP) return window.LOOP(t);
  if (!SHOTS.length) { screen(); return; }
  let i = 0; while (i + 1 < SHOTS.length && t >= SHOTS[i + 1][0]) i++;
  const t0 = SHOTS[i][0], end = i + 1 < SHOTS.length ? SHOTS[i + 1][0] : DUR;
  X.save(); SHOTS[i][1](t, t - t0, end - t0); X.restore();
}

// ---------- 纹理 ----------
function makeCloth() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), rnd = mulberry(21);
  const id = c.createImageData(W, H), d = id.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, weave = ((x % 3 === 0) ? 7 : 0) + ((y % 3 === 0) ? 6 : 0), v = 255 - weave - rnd() * 9;
    d[i] = v; d[i + 1] = v - 2; d[i + 2] = v - 6; d[i + 3] = 255;
  }
  c.putImageData(id, 0, 0);
  for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * H, r = 120 + rnd() * 380, g = c.createRadialGradient(x, y, 0, x, y, r), a = .05 * rnd(); g.addColorStop(0, `rgba(150,110,70,${a})`); g.addColorStop(1, 'rgba(150,110,70,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
  return cv;
}
function makeLeather() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), rnd = mulberry(77);
  for (let i = 0; i < 90; i++) { const x = rnd() * S, y = rnd() * S, r = 8 + rnd() * 40, g = c.createRadialGradient(x, y, 0, x, y, r), a = .08 + rnd() * .22;
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const gg = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gg.addColorStop(0, `rgba(60,25,8,${a})`); gg.addColorStop(1, 'rgba(60,25,8,0)'); c.fillStyle = gg; c.fillRect(x + ox - r, y + oy - r, 2 * r, 2 * r); } }
  c.lineWidth = 1;
  for (let i = 0; i < 260; i++) { const x = rnd() * S, y = rnd() * S, l = 6 + rnd() * 26, a = rnd() * .6 - .3; c.strokeStyle = `rgba(50,20,5,${.06 + rnd() * .12})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  return cv;
}

// ---------- 渲染入口（render.mjs 调用） ----------
function renderFrame(t) {
  T = t; DEPTH = 0; LAMP = { x: W * .5, y: H * .4, k: 1 };
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.globalCompositeOperation = 'source-over'; X.filter = 'none';
  X.fillStyle = PAL.stage; X.fillRect(0, 0, W, H);
  drawWorld(t);
}
window.renderAt = async (t, type = 'image/png', q = .92) => { renderFrame(t); return outC.toDataURL(type, q); };
window.renderSheet = async (times, cols = 3, w = 640, crop = null, at = null) => {
  if (at) throw new Error('--crop-at 不支持皮影引擎：画面没有全局相机。改用 --crop=x,y,w,h（屏幕像素）');
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
  clothC = makeCloth(); LEATHER = makeLeather();
  const q = new URLSearchParams(location.search).get('loop'); if (q && LOOPS[q]) window.LOOP = LOOPS[q];
  window.ready = true;
  if (!location.search.includes('render')) {
    const s = document.getElementById('scrub'), lab = document.getElementById('tt'); s.max = window.LOOP ? window.LOOP.len : DUR;
    const go = () => { const t0 = performance.now(); renderFrame(+s.value); lab.textContent = `${(+s.value).toFixed(2)}s · ${Math.round(performance.now() - t0)} ms`; };
    s.addEventListener('input', go); s.value = +(new URLSearchParams(location.search).get('t') || 0); go();
  }
});

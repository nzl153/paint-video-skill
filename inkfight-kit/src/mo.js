// mo.js：墨斗引擎，纯 2D canvas。
// 一笔 = 一束毫：沿中线平行排开几十根细线，每根按噪声断开，笔尾和笔肚两侧断得多，就出了飞白。
// 画面最后乘一层纸纹。冲击帧把整幅画去色、拉满对比再反相。帧仍是 t 的纯函数。

const [W, H] = PROJECT.size, BPM = PROJECT.bpm, BEAT = 60 / BPM, OFF = PROJECT.offset || 0, DUR = PROJECT.duration;
const TAU = Math.PI * 2;
// 设色水墨：墨线 + 平涂 + 一层暗面。青绿压底，朱红和火色只点在要紧处
const PAL = {
  paper: '#efe6d2', paperLt: '#f6f0e2', paperDk: '#cdbd9c',
  ink: '#1c1714', inkMid: '#3d352d', inkLt: '#7a6e60', wash: '#a89a84', mist: '#e6ddc8',
  red: '#b8322a', redDk: '#6e1a16', sun: '#d8573a',
  skyTop: '#c3cfc6', skyLow: '#f0d7ad',
  mt1: '#a9bab0', mt2: '#7b958d', mt3: '#4d6863', pine: '#2f4a45',
  rock: '#5b4b3c', rockTop: '#b08f5e', rockDk: '#2c241d',
  fire: '#e8742c', fireLt: '#f7c75c',
};

// ---------- 小工具 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, x) => a + (b - a) * x;
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const expoOut = x => { x = clamp(x); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); };
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const vnoise = x => { const i = Math.floor(x), f = x - i; return lerp(hash(i), hash(i + 1), f * f * (3 - 2 * f)); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smooth = (a, b, x) => ease((x - a) / (b - a));
const BT = b => OFF + b * BEAT;
const spring = (t, t0, k = 6, w = 18) => t < t0 ? 0 : Math.exp(-k * (t - t0)) * Math.sin(w * (t - t0));
// 关键帧：K = [[时刻, 值, 缓动?], ...]；值可以是数、数组或对象（逐字段插值），缓动写在段尾那一帧上
function mix(a, b, k) {
  if (typeof a === 'number') return lerp(a, b, k);
  if (Array.isArray(a)) return a.map((v, i) => mix(v, b[i], k));
  const o = {}; for (const key in a) o[key] = key in b ? mix(a[key], b[key], k) : a[key]; return o;
}
function kf(t, K) {
  if (t <= K[0][0]) return K[0][1];
  for (let i = 0; i < K.length - 1; i++) {
    const [t0, v0] = K[i], [t1, v1, e] = K[i + 1];
    if (t < t1) return mix(v0, v1, (e || ease)(seg(t, t0, t1)));
  }
  return K[K.length - 1][1];
}
// 按权重叠加：[[w, 值], ...]，值可以是数、数组或对象
function lin(L) {
  const v0 = L[0][1];
  if (typeof v0 === 'number') { let s = 0; for (const [w, v] of L) s += w * v; return s; }
  if (Array.isArray(v0)) return v0.map((_, i) => lin(L.map(([w, v]) => [w, v[i]])));
  const o = {}; for (const k in v0) o[k] = typeof v0[k] === 'number' || typeof v0[k] === 'object' ? lin(L.map(([w, v]) => [w, k in v ? v[k] : v0[k]])) : v0[k]; return o;
}
// 穿过关键帧的平滑曲线（Catmull-Rom）：动作一路穿过关键帧，不在每一帧上停一下。
// K = [[t, 值, 'hold'?], ...]，写了 hold 的关键帧在这里停稳（切线为零），首尾两帧也停稳
function track(t, K) {
  const n = K.length;
  if (t <= K[0][0]) return K[0][1];
  if (t >= K[n - 1][0]) return K[n - 1][1];
  let i = 0; while (t >= K[i + 1][0]) i++;
  const [t1, p1] = K[i], [t2, p2] = K[i + 1], h = t2 - t1, s = (t - t1) / h, s2 = s * s, s3 = s2 * s;
  const L = [[2 * s3 - 3 * s2 + 1, p1], [-2 * s3 + 3 * s2, p2]];
  const tan = (j, c) => {
    if (j === 0 || j === n - 1 || K[j][2] === 'hold') return;
    const k = c * h / (K[j + 1][0] - K[j - 1][0]); L.push([k, K[j + 1][1]], [-k, K[j - 1][1]]);
  };
  tan(i, s3 - 2 * s2 + s); tan(i + 1, s3 - s2);
  return lin(L);
}
// 脚：一步一步地踩。K = [[t, 世界x, 离地高度?, 缓动?, 'slide'?], ...]，两帧 x 不同就是迈一步，中间自动抬脚；写了 slide 是贴地滑（被震退）
function stepTrack(t, K) {
  if (t <= K[0][0]) return [K[0][1], K[0][2] || 0];
  for (let i = 0; i < K.length - 1; i++) {
    const [t0, x0, l0 = 0] = K[i], [t1, x1, l1 = 0, e, slide] = K[i + 1];
    if (t < t1) {
      const s = (e || ease)(seg(t, t0, t1)), dx = Math.abs(x1 - x0);
      return [lerp(x0, x1, s), lerp(l0, l1, s) + (dx > 2 && !l0 && !l1 && !slide ? Math.min(22, dx * .12) * Math.sin(Math.PI * s) : 0)];
    }
  }
  const k = K[K.length - 1]; return [k[1], k[2] || 0];
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let T = 0;

const ell = (cx, cy, rx, ry, n = 22, rot = 0) => { const p = [], c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * c - y * s, cy + x * s + y * c]); } return p; };
// 边缘带噪声的团块（墨团、石头、头）
const blob = (cx, cy, r, seed, rough = .18, n = 28) => { const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + rough * (vnoise(i * .7 + seed * 9.1) - .5) * 2; p.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]); } return p; };
function pathOf(c, P, closed = true) { c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); if (closed) c.closePath(); }

// Catmull-Rom 按间距取样
function spline(P, step) {
  const n = P.length; if (n < 3) { if (n < 2) return P.slice(); const L = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), m = Math.max(1, Math.ceil(L / step)), o = []; for (let k = 0; k <= m; k++) o.push([lerp(P[0][0], P[1][0], k / m), lerp(P[0][1], P[1][1], k / m)]); return o; }
  const out = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
    const m = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < m; k++) {
      const t = k / m, t2 = t * t, t3 = t2 * t, f = d => .5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  out.push(P[n - 1]); return out;
}

// ---------- 画布与相机 ----------
let X = null, SC = null, SX = null, outC = null, grainC = null;
const scaleOf = () => { const m = X.getTransform(); return Math.hypot(m.a, m.b); };
// 相机：看向世界点 (x, y)，缩放 s，转 r；shake 是屏幕像素的抖动幅度
let CAM = { x: W / 2, y: H / 2, s: 1, r: 0, shake: 0 };
function cam(p = 1) {
  const c = CAM, sh = c.shake, sx = sh * (vnoise(T * 37) - .5) * 2, sy = sh * (vnoise(T * 41 + 9) - .5) * 2;
  X.setTransform(1, 0, 0, 1, 0, 0);
  X.translate(W / 2 + sx, H / 2 + sy); X.rotate(c.r); X.scale(c.s, c.s);
  // p<1 是远景视差：相机移动时它移得少
  X.translate(-(W / 2 + (c.x - W / 2) * p), -(H / 2 + (c.y - H / 2) * p));
}

// ---------- 一笔 ----------
// P：中线控制点；w：笔肚宽（世界单位）。
// o: col 墨色 / a 透明度 / dry 干湿 0–1（越干飞白越多）/ prof(s) 粗细曲线 / seed / fray 两侧毛边提前收笔的程度
const PROF = {
  press: s => Math.pow(clamp(s / .1), .5) * (1 - .8 * Math.pow(s, 2.2)),          // 顿笔起、渐收
  even: s => Math.pow(clamp(s / .06), .5) * Math.pow(clamp((1 - s) / .06), .5),    // 两头圆，中间一样粗
  belly: s => Math.sin(Math.PI * clamp(s)) ** .6,                                  // 中间鼓
  sweep: s => Math.pow(clamp(s / .04), .4) * Math.pow(1 - s, 1.3),                 // 一扫而过，尾巴拖尖
};
function brush(P, w, o = {}) {
  if (P.length < 2 || !(w > 0)) return;
  const sc = scaleOf(), S = spline(P, Math.max(1, 2.5 / sc)), N = S.length;
  if (N < 2) return;
  const cum = [0]; for (let i = 1; i < N; i++) cum.push(cum[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
  const L = cum[N - 1] || 1, prof = typeof o.prof === 'function' ? o.prof : PROF[o.prof || 'press'];
  const nx = [], ny = [], hw = [];
  for (let i = 0; i < N; i++) {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(N - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    nx.push(-dy / d); ny.push(dx / d); hw.push(w / 2 * prof(cum[i] / L));
  }
  const n = clamp(Math.round(w * sc / 2.2), 4, 48), dry = o.dry ?? .3, seed = o.seed ?? 0, fray = o.fray ?? 1;
  X.save(); X.strokeStyle = o.col || PAL.ink; X.globalAlpha *= o.a ?? 1; X.lineCap = 'round'; X.lineJoin = 'round';
  for (let j = 0; j < n; j++) {
    const r1 = hash(seed * 31.7 + j * 3.1), r2 = hash(seed * 7.3 + j * 11.9);
    const u = ((j + .5) / n * 2 - 1) * (1 + (r1 - .5) * .12), uu = u * u;
    const endS = 1 - fray * .3 * uu * r2, gl = 1.2 + 2.5 * r1;                     // 两侧的毫先收笔
    X.lineWidth = w / n * (1.9 + .9 * r2); X.beginPath(); let pen = false;
    for (let i = 0; i < N; i++) {
      const s = cum[i] / L; if (s > endS) break;
      const d = dry * (smooth(.3, 1, s) * 1.15 + .45 * uu);
      if (d > 0 && vnoise(cum[i] / (w * .5 * gl) + j * 17.13 + seed * 5.7) < d) { pen = false; continue; }
      const x = S[i][0] + nx[i] * u * hw[i], y = S[i][1] + ny[i] * u * hw[i];
      if (!pen) { X.moveTo(x, y); pen = true; } else X.lineTo(x, y);
    }
    X.stroke();
  }
  X.restore();
}
// 平涂（淡墨、纸色）；soft 是边缘晕开的宽度
function wash(P, col, o = {}) {
  X.save(); X.globalAlpha *= o.a ?? 1; if (o.soft) X.filter = `blur(${o.soft * scaleOf()}px)`;
  X.fillStyle = col; pathOf(X, o.curve ? spline(P, 6) : P); X.fill(); X.restore();
}
// ---------- 体块：平涂 + 暗面 + 勾线 ----------
// 沿中线 P 按半宽 hw(s) 撑开的封闭形，两头是圆的（肢体、躯干、衣摆都用它）
function capsule(P, hw, step = 3) {
  const S = spline(P, step), N = S.length, cum = [0];
  for (let i = 1; i < N; i++) cum.push(cum[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
  const Lt = cum[N - 1] || 1, A = [], B = [], nrm = [], ws = [];
  for (let i = 0; i < N; i++) {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(N - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const n = [-dy / d, dx / d], w = Math.max(.01, hw(cum[i] / Lt)); nrm.push(n); ws.push(w);
    A.push([S[i][0] + n[0] * w, S[i][1] + n[1] * w]); B.push([S[i][0] - n[0] * w, S[i][1] - n[1] * w]);
  }
  const cap = (i, sgn) => { const c = S[i], n = nrm[i], w = ws[i], d = [n[1], -n[0]], o = []; for (let k = 1; k < 8; k++) { const q = k / 8 * Math.PI; o.push([c[0] + (n[0] * Math.cos(q) + d[0] * Math.sin(q)) * w * sgn, c[1] + (n[1] * Math.cos(q) + d[1] * Math.sin(q)) * w * sgn]); } return o; };
  return [...A, ...cap(N - 1, 1), ...B.reverse(), ...cap(0, -1)];
}
// 光的方向（指向光源，局部坐标由画人物的代码按朝向翻过来）
let LIGHT = [.62, -.78];
// 一块：先涂暗面色，再把底色往光的方向挪 d 盖上去，没盖住的月牙就是暗面；最后勾线
// o: d 暗面宽 / line 线宽（0 不勾）/ seed / hi 亮面色（往背光方向挪出的一道亮边）
function part(poly, base, shade, o = {}) {
  const L = o.light || LIGHT, d = o.d ?? 3;
  X.save(); pathOf(X, poly); X.fillStyle = shade; X.fill(); X.clip();
  X.save(); X.translate(L[0] * d, L[1] * d); pathOf(X, poly); X.fillStyle = o.hi || base; X.fill(); X.restore();
  if (o.hi) { X.translate(L[0] * d * .45, L[1] * d * .45); pathOf(X, poly); X.fillStyle = base; X.fill(); }
  X.restore();
  if (o.line !== 0) outline(poly, o.line ?? 1.2, o.seed ?? 0, L, o.lineCol);
}
// 毛笔勾线：背光一侧粗、迎光一侧细，粗细带一点抖，偶尔断笔
function outline(poly, w, seed = 0, L = LIGHT, col = PAL.ink, closed = true) {
  const n = poly.length; let A = 0;
  for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; }
  const sg = A > 0 ? 1 : -1;
  X.save(); X.strokeStyle = col; X.lineCap = 'round';
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = poly[i], b = poly[(i + 1) % n], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    const nd = sg * (ty * L[0] - tx * L[1]) / l;            // 外法线 · 光向
    if (vnoise(i * .45 + seed * 7.1) < .07) continue;
    X.lineWidth = w * (.4 + .95 * Math.max(0, -nd) + .15 * Math.max(0, nd)) * (.75 + .5 * vnoise(i * .23 + seed * 3.3));
    X.beginPath(); X.moveTo(a[0], a[1]); X.lineTo(b[0], b[1]); X.stroke();
  }
  X.restore();
}

// 墨点：主团 + 四周甩出的小点，dir 是甩出方向（弧度），spread 是张角
function splat(x, y, r, seed, o = {}) {
  const col = o.col || PAL.ink, dir = o.dir ?? 0, spread = o.spread ?? TAU, n = o.n ?? 14, reach = o.reach ?? 3.2;
  X.save(); X.globalAlpha *= o.a ?? 1; X.fillStyle = col;
  pathOf(X, blob(x, y, r, seed, .35, 24)); X.fill();
  for (let i = 0; i < n; i++) {
    const a = dir + (hash(seed + i * 1.7) - .5) * spread, d = r * (1.1 + reach * Math.pow(hash(seed * 3 + i * 2.3), 1.5)), rr = r * (.06 + .22 * Math.pow(hash(seed * 5 + i), 2));
    pathOf(X, blob(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, seed + i, .3, 10)); X.fill();
    if (hash(seed + i * 9) < .35) brush([[x + Math.cos(a) * r * .8, y + Math.sin(a) * r * .8], [x + Math.cos(a) * d * .95, y + Math.sin(a) * d * .95]], rr * 1.6, { col, prof: 'sweep', dry: .2, seed: seed + i });
  }
  X.restore();
}

// ---------- 冲击帧 ----------
// kind: 'inv' 黑白反相 / 'red' 反相后压一层朱红 / 'flat' 只拉满对比不反相
function impact(kind = 'inv', k = 1) {
  SX.setTransform(1, 0, 0, 1, 0, 0); SX.globalCompositeOperation = 'source-over'; SX.globalAlpha = 1;
  SX.filter = kind === 'flat' ? 'grayscale(1) contrast(7) brightness(1.15)' : 'grayscale(1) contrast(7) brightness(1.1) invert(1)';
  SX.drawImage(outC, 0, 0); SX.filter = 'none';
  if (kind === 'red') { SX.globalCompositeOperation = 'multiply'; SX.fillStyle = '#e0473a'; SX.fillRect(0, 0, W, H); SX.globalCompositeOperation = 'source-over'; }
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = k; X.drawImage(SC, 0, 0); X.restore();
}
// 放射速度线：以 (cx, cy) 为心，从 r0 往外画；屏幕坐标
function burstLines(cx, cy, r0, r1, n, seed, o = {}) {
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const a = hash(seed + i * 1.37) * TAU, ra = r0 * (.8 + .6 * hash(seed + i * 2.1)), rb = r1 * (.7 + .5 * hash(seed + i * 3.3));
    brush([[cx + Math.cos(a) * ra, cy + Math.sin(a) * ra], [cx + Math.cos(a) * (ra + rb) / 2, cy + Math.sin(a) * (ra + rb) / 2], [cx + Math.cos(a) * rb, cy + Math.sin(a) * rb]],
      (o.w ?? 10) * (.4 + hash(seed + i * 4.9)), { col: o.col || PAL.ink, prof: 'sweep', dry: .45, seed: seed + i, a: o.a ?? 1 });
  }
  X.restore();
}
// 平行速度线：沿方向 ang 划过画面，屏幕坐标
function speedLines(ang, n, seed, o = {}) {
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  const c = Math.cos(ang), s = Math.sin(ang), D = Math.hypot(W, H);
  for (let i = 0; i < n; i++) {
    const off = (hash(seed + i * 1.9) - .5) * D, along = (hash(seed + i * 2.7) - .5) * D * .8, len = D * (.15 + .35 * hash(seed + i * 5.1));
    const mx = W / 2 - s * off + c * along, my = H / 2 + c * off + s * along;
    brush([[mx - c * len / 2, my - s * len / 2], [mx, my], [mx + c * len / 2, my + s * len / 2]], (o.w ?? 5) * (.3 + hash(seed + i * 3.3)),
      { col: o.col || PAL.ink, prof: 'sweep', dry: .5, seed: seed + i, a: (o.a ?? .8) * (.4 + .6 * hash(seed + i)) });
  }
  X.restore();
}

// ---------- 时间线 ----------
const SHOTS = [], LOOPS = {};
function shots(list) { SHOTS.push(...list); SHOTS.sort((a, b) => a[0] - b[0]); }
function drawWorld(t) {
  if (window.LOOP) return window.LOOP(t);
  if (!SHOTS.length) return;
  let i = 0; while (i + 1 < SHOTS.length && t >= SHOTS[i + 1][0]) i++;
  const t0 = SHOTS[i][0], end = i + 1 < SHOTS.length ? SHOTS[i + 1][0] : DUR;
  X.save(); SHOTS[i][1](t, t - t0, end - t0); X.restore();
}

// ---------- 纸 ----------
function makeGrain() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), rnd = mulberry(5);
  const id = c.createImageData(W, H), d = id.data;
  for (let i = 0; i < W * H; i++) { const v = 255 - rnd() * rnd() * 34; d[i * 4] = v; d[i * 4 + 1] = v - 1; d[i * 4 + 2] = v - 4; d[i * 4 + 3] = 255; }
  c.putImageData(id, 0, 0);
  for (let i = 0; i < 1400; i++) { const x = rnd() * W, y = rnd() * H, l = 6 + rnd() * 40, a = rnd() * TAU; c.strokeStyle = `rgba(120,95,60,${.05 + rnd() * .12})`; c.lineWidth = .6 + rnd(); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + 1) * l * .4, y + Math.sin(a + 1) * l * .4, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  for (let i = 0; i < 60; i++) { const x = rnd() * W, y = rnd() * H, r = 100 + rnd() * 400, g = c.createRadialGradient(x, y, 0, x, y, r), a = .07 * rnd(); g.addColorStop(0, `rgba(140,105,65,${a})`); g.addColorStop(1, 'rgba(140,105,65,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
  return cv;
}
function finish(o = {}) {
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none';
  X.globalCompositeOperation = 'multiply'; X.drawImage(grainC, 0, 0);
  const v = o.vignette ?? .55, g = X.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(60,40,20,0)'); g.addColorStop(1, `rgba(40,25,12,${v})`); X.fillStyle = g; X.fillRect(0, 0, W, H);
  X.restore();
}

// ---------- 渲染入口（render.mjs 调用） ----------
function renderFrame(t) {
  T = t; CAM = { x: W / 2, y: H / 2, s: 1, r: 0, shake: 0 };
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.globalCompositeOperation = 'source-over'; X.filter = 'none';
  X.fillStyle = PAL.paper; X.fillRect(0, 0, W, H);
  drawWorld(t);
}
window.renderAt = async (t, type = 'image/png', q = .92) => { renderFrame(t); return outC.toDataURL(type, q); };
window.renderSheet = async (times, cols = 3, w = 640, crop = null, at = null) => {
  if (at) throw new Error('--crop-at 不支持墨斗引擎：改用 --crop=x,y,w,h（屏幕像素）');
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
  grainC = makeGrain();
  const q = new URLSearchParams(location.search).get('loop'); if (q && LOOPS[q]) window.LOOP = LOOPS[q];
  window.ready = true;
  if (!location.search.includes('render')) {
    const s = document.getElementById('scrub'), lab = document.getElementById('tt'); s.max = window.LOOP ? window.LOOP.len : DUR;
    const go = () => { const t0 = performance.now(); renderFrame(+s.value); lab.textContent = `${(+s.value).toFixed(2)}s · ${Math.round(performance.now() - t0)} ms`; };
    s.addEventListener('input', go); s.value = +(new URLSearchParams(location.search).get('t') || 0); go();
  }
});

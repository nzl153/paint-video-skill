// 底座：数学、笔触、发光、纹理、字幕、场景与转场。每一帧都是 t 的纯函数。
const W = 1920, H = 1080, TAU = Math.PI * 2;
const SANS = `'Noto Sans SC','Microsoft YaHei',sans-serif`;
const SERIF = `'Songti SC','STSong','SimSun',serif`;
const HAS_VOICE = typeof VOICE !== 'undefined';
const END = HAS_VOICE ? VOICE.end : TL.END;   // 真实时长（旁白把一些段落拉长了）
// 真实时间 t → 原时间轴 τ（分段线性）
function unwarp(t) {
  if (!HAS_VOICE) return t;
  const A = VOICE.anchors;
  for (let i = 1; i < A.length; i++) if (t <= A[i][1]) { const [x0, y0] = A[i - 1], [x1, y1] = A[i]; return y1 > y0 ? x0 + (x1 - x0) * (t - y0) / (y1 - y0) : x1; }
  return TL.END;
}

// ---------- 数学 ----------
const fract = x => x - Math.floor(x);
const hash = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const h2 = (a, b) => hash(a * 12.9898 + b * 78.233);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const eo = k => 1 - Math.pow(1 - clamp(k), 3);
const eio = k => { k = clamp(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const prog = (a, b, x) => clamp((x - a) / (b - a));
// 在 [a, b] 内为 1，两端各用 f 秒淡入淡出
const win = (a, b, x, f = .5) => ss(a, a + f, x) * (1 - ss(b - f, b, x));

function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), o = s * 57.3;
  const a = h2(xi + o, yi), b = h2(xi + 1 + o, yi), c = h2(xi + o, yi + 1), d = h2(xi + 1 + o, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s = 0, oct = 4) {
  let v = 0, a = .5, f = 1;
  for (let i = 0; i < oct; i++) { v += a * vnoise(x * f, y * f, s + i * 7); f *= 2; a *= .5; }
  return v / (1 - Math.pow(.5, oct));
}

function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(c1, c2, k) { const a = hex(c1), b = hex(c2); return '#' + a.map((v, i) => Math.round(lerp(v, b[i], clamp(k))).toString(16).padStart(2, '0')).join(''); }
function rgba(c, a) { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${clamp(a)})`; }

// ---------- 笔触 ----------
function resample(pts, step = 6) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 1; k <= n; k++) out.push([lerp(x0, x1, k / n), lerp(y0, y1, k / n)]);
  }
  return out;
}
function polyLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
// 折线上按比例取点
function along(p, k) {
  const L = polyLen(p) * clamp(k); let acc = 0;
  for (let i = 1; i < p.length; i++) {
    const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (acc + d >= L) { const f = d ? (L - acc) / d : 0; return [lerp(p[i - 1][0], p[i][0], f), lerp(p[i - 1][1], p[i][1], f)]; }
    acc += d;
  }
  return p[p.length - 1];
}

// 手绘线：抖动、两端收笔、可按进度画出
function stroke(ctx, pts, o = {}) {
  const { w = 3, color = '#2e2a24', jit = 1, seed = 0, taper = .25, progress = 1, alpha = 1, step = 5, w1 = null } = o;
  if (pts.length < 2 || progress <= 0) return;
  const p = resample(pts, step);
  const n = Math.max(2, Math.floor(p.length * clamp(progress)));
  ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha *= alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let prev = null;
  for (let i = 0; i < n; i++) {
    const f = i / (p.length - 1);
    const q = [p[i][0] + (vnoise(i * .15, seed, 1) - .5) * 2 * jit, p[i][1] + (vnoise(seed, i * .15, 2) - .5) * 2 * jit];
    if (prev) {
      const t0 = taper > 0 ? Math.min(1, f / taper, (1 - f) / taper) : 1;
      const base = w1 == null ? w : lerp(w, w1, f);
      ctx.lineWidth = Math.max(.3, base * (.35 + .65 * t0) * (.88 + .24 * vnoise(i * .08, seed, 3)));
      ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    }
    prev = q;
  }
  ctx.restore();
}
// 平滑实线（不抖），用于干净的图示
function line(ctx, pts, color, w = 2, alpha = 1) {
  if (pts.length < 2) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore();
}
function blob(ctx, pts, color, o = {}) {
  const { jit = 1.5, seed = 0, alpha = 1 } = o;
  const p = resample([...pts, pts[0]], 8);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
  p.forEach(([x, y], i) => {
    const qx = x + (vnoise(i * .2, seed, 4) - .5) * 2 * jit, qy = y + (vnoise(seed, i * .2, 5) - .5) * 2 * jit;
    i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy);
  });
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function circlePts(x, y, r, n = 64, a0 = 0, a1 = TAU) {
  const out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); out.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return out;
}
function ellipsePts(x, y, rx, ry, rot = 0, n = 48) {
  const c = Math.cos(rot), s = Math.sin(rot), out = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, px = Math.cos(a) * rx, py = Math.sin(a) * ry; out.push([x + px * c - py * s, y + px * s + py * c]); }
  return out;
}
function fillPath(ctx, pts, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.restore();
}
function hatch(ctx, clipFn, o = {}) {
  const { angle = -.8, gap = 7, w = 1, color = '#2e2a24', alpha = .6, seed = 0, box = [0, 0, W, H] } = o;
  ctx.save(); ctx.beginPath(); clipFn(ctx); ctx.clip();
  ctx.strokeStyle = color; ctx.globalAlpha *= alpha; ctx.lineWidth = w;
  const [bx, by, bw, bh] = box, cx = bx + bw / 2, cy = by + bh / 2, R = Math.hypot(bw, bh) / 2, ca = Math.cos(angle), sa = Math.sin(angle);
  for (let d = -R, i = 0; d <= R; d += gap, i++) {
    const j = (hash(i + seed) - .5) * gap * .4;
    ctx.beginPath(); ctx.moveTo(cx - ca * R - sa * (d + j), cy - sa * R + ca * (d + j)); ctx.lineTo(cx + ca * R - sa * (d + j), cy + sa * R + ca * (d + j)); ctx.stroke();
  }
  ctx.restore();
}

// ---------- 光 ----------
function glow(ctx, x, y, r, color, a = 1) {
  if (a <= 0 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(.4, rgba(color, a * .35)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
// 发光线：先画宽的半透明，再画细的亮芯
function glowLine(ctx, pts, color, w, a = 1, core = '#ffffff') {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  line(ctx, pts, color, w * 5, a * .08); line(ctx, pts, color, w * 2.2, a * .25); line(ctx, pts, color, w, a * .8);
  line(ctx, pts, core, w * .4, a * .7); ctx.restore();
}
// 一束从远处打过来的光锥
function beam(ctx, x0, y0, x1, y1, w0, w1, color, a) {
  if (a <= 0) return;
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, a * .15));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
  for (const k of [1, .6, .3]) {
    ctx.globalAlpha = k === 1 ? .35 : .4;
    ctx.beginPath();
    ctx.moveTo(x0 + nx * w0 * k, y0 + ny * w0 * k); ctx.lineTo(x1 + nx * w1 * k, y1 + ny * w1 * k);
    ctx.lineTo(x1 - nx * w1 * k, y1 - ny * w1 * k); ctx.lineTo(x0 - nx * w0 * k, y0 - ny * w0 * k); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---------- 纹理 ----------
const TEX = {};
function texture(key, w, h, paint) {
  if (TEX[key]) return TEX[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); return (TEX[key] = c);
}
function grain(ctx, a = .05) {
  const g = texture('grain', 512, 512, (gc, w, h) => {
    const img = gc.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = hash(i * .731) * 255; img.data.set([v, v, v, 255], i * 4); }
    gc.putImageData(img, 0, 0);
  });
  ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay';
  for (let y = 0; y < H; y += 512) for (let x = 0; x < W; x += 512) ctx.drawImage(g, x, y);
  ctx.restore();
}
function paperBg(ctx, base = '#f4ede0') {
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  const fib = texture('fibers', W, H, (g) => {
    for (let i = 0; i < 1100; i++) {
      const x = hash(i) * W, y = hash(i + .5) * H, a = hash(i + .3) * TAU, l = 6 + hash(i + .7) * 26;
      g.strokeStyle = `rgba(90,70,40,${.03 + hash(i + .9) * .05})`; g.lineWidth = .8;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * .5 + 4, y + Math.sin(a) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    const v = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05);
    v.addColorStop(0, 'rgba(80,60,30,0)'); v.addColorStop(1, 'rgba(80,60,30,.13)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  });
  ctx.drawImage(fib, 0, 0);
}
function vignette(ctx, a = .5, color = '#000000') {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95);
  v.addColorStop(0, rgba(color, 0)); v.addColorStop(1, rgba(color, a));
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// ---------- 文字 ----------
function text(ctx, s, x, y, o = {}) {
  const { size = 40, font = SANS, weight = 400, color = '#f2ece0', align = 'center', alpha = 1, spacing = 0, shadow = null, base = 'alphabetic', halo = null } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  if (spacing) ctx.letterSpacing = spacing + 'px';
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = 14; }
  if (halo) { ctx.strokeStyle = halo; ctx.lineWidth = size * .28; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillText(s, x, y); ctx.restore();
}
// 图示标注：一条细引线从目标点拉出来，末端是字
function label(ctx, s, tx, ty, lx, ly, lt, o = {}) {
  const { color = '#2e2a24', size = 28, alpha = 1, dot = true } = o;
  const k = eo(prog(0, .6, lt)) * alpha; if (k <= 0) return;
  const mx = lerp(tx, lx, eo(prog(0, .5, lt))), my = lerp(ty, ly, eo(prog(0, .5, lt)));
  ctx.save(); ctx.globalAlpha *= alpha;
  if (dot) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(tx, ty, 4, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(mx, my); ctx.stroke();
  ctx.restore();
  const right = lx >= tx;
  text(ctx, s, lx + (right ? 12 : -12), ly + size * .35, { size, color, align: right ? 'left' : 'right', alpha: ss(.35, .8, lt) * alpha, weight: 500, halo: o.halo === undefined ? 'rgba(244,237,224,.92)' : o.halo });
}

// ---------- 字幕与章节 ----------
const CAPS = [];        // [起, 止, 文字]
const CHAPTERS = [];    // [起, 止, 编号, 名字]
let THEME = [];         // [起, 止, 'dark'|'light']：字幕颜色跟着底色走
function capTheme(t) { for (const [a, b, k] of THEME) if (t >= a && t < b) return k; return 'dark'; }

function drawCaptions(ctx, t, tau) {
  const dark = capTheme(tau) === 'dark';
  for (const [a, b, s] of (HAS_VOICE ? VOICE.caps : CAPS)) {
    if (t < a - .1 || t > b + .1) continue;
    const k = ss(a, a + .35, t) * (1 - ss(b - .35, b, t)); if (k <= 0) continue;
    const y = 968 + (1 - eo(prog(a, a + .5, t))) * 10;
    ctx.save(); ctx.font = `400 40px ${SANS}`; ctx.letterSpacing = '2px';
    const wd = ctx.measureText(s).width; ctx.restore();
    // 底下垫一层很淡的条，保证压在任何画面上都读得清
    const bg = dark ? '#000000' : '#f4ede0';
    ctx.save(); ctx.globalAlpha = k; ctx.translate(W / 2, y - 14); ctx.scale(wd / 2 + 160, 62);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, rgba(bg, dark ? .42 : .6)); g.addColorStop(.6, rgba(bg, dark ? .3 : .45)); g.addColorStop(1, rgba(bg, 0));
    ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    text(ctx, s, W / 2, y, { size: 40, color: dark ? '#f3ede2' : '#2b2722', alpha: k, spacing: 2, shadow: dark ? 'rgba(0,0,0,.6)' : null });
  }
  for (const [a, b, n, s] of CHAPTERS) {
    if (tau < a || tau > b) continue;
    const k = ss(a + .4, a + 1.2, tau) * (1 - ss(b - .8, b, tau));
    const col = dark ? '#e9e1d2' : '#3a342c';
    ctx.save(); ctx.globalAlpha = k;
    ctx.fillStyle = '#bb5f3c'; ctx.fillRect(84, 78, 3, 52);
    ctx.restore();
    text(ctx, n, 104, 100, { size: 20, color: dark ? '#b5aa98' : '#7a6f60', align: 'left', alpha: k, spacing: 4, weight: 700 });
    text(ctx, s, 104, 130, { size: 26, color: col, align: 'left', alpha: k * .92, spacing: 2 });
  }
}

// ---------- 场景与转场 ----------
const SCENES = [];   // { s, draw(ctx, lt, t) }
const SEAMS = [];    // { at, dur, kind, ...参数 }
function scene(s, draw) { SCENES.push({ s, draw }); SCENES.sort((a, b) => a.s - b.s); }
function seam(at, dur, kind, o = {}) { SEAMS.push({ at, dur, kind, ...o }); }

const bufA = document.createElement('canvas'), bufB = document.createElement('canvas'), bufM = document.createElement('canvas');
for (const b of [bufA, bufB, bufM]) { b.width = W; b.height = H; }

function sceneAt(t) { let i = 0; while (i + 1 < SCENES.length && t >= SCENES[i + 1].s) i++; return i; }
function drawScene(ctx, i, t) { const sc = SCENES[i]; ctx.save(); sc.draw(ctx, t - sc.s, t); ctx.restore(); }
function into(buf, i, t) { const g = buf.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); drawScene(g, i, t); return buf; }

function renderFrame(ctx, t) {
  t = clamp(t, 0, END - 1e-3);
  const tau = unwarp(t);
  const sm = SEAMS.find(s => tau >= s.at - s.dur / 2 && tau < s.at + s.dur / 2);
  if (sm) {
    const ia = sceneAt(sm.at - 1e-3), ib = sceneAt(sm.at + 1e-3), p = (tau - (sm.at - sm.dur / 2)) / sm.dur;
    const A = into(bufA, ia, tau), B = into(bufB, ib, tau);
    TRANS[sm.kind](ctx, A, B, p, sm, tau);
  } else drawScene(ctx, sceneAt(tau), tau);
  drawCaptions(ctx, t, tau);
  grain(ctx, .045);
  const fin = ss(END - 2.2, END - .3, t);
  if (fin > 0) { ctx.save(); ctx.globalAlpha = fin; ctx.fillStyle = '#050607'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

const TRANS = {
  fade(ctx, A, B, p) { ctx.drawImage(A, 0, 0); ctx.save(); ctx.globalAlpha = eio(p); ctx.drawImage(B, 0, 0); ctx.restore(); },
  // 推进：A 绕某点放大冲进去，B 从略大缩回正常
  zoom(ctx, A, B, p, o, t) {
    const [cx, cy] = typeof o.c === 'function' ? o.c(t) : o.c;
    const za = Math.pow(o.z || 8, eio(p)), k = ss(.45, .85, p);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(za, za); ctx.translate(-cx, -cy); ctx.drawImage(A, 0, 0); ctx.restore();
    const zb = lerp(1.6, 1, eo(prog(.4, 1, p)));
    ctx.save(); ctx.globalAlpha = k; ctx.translate(W / 2, H / 2); ctx.scale(zb, zb); ctx.translate(-W / 2, -H / 2); ctx.drawImage(B, 0, 0); ctx.restore();
  },
  // 波纹：从一点扩开，边缘是一圈光
  ripple(ctx, A, B, p, o) {
    const [x, y] = o.c, R = lerp(0, 2300, eio(p)), col = o.color || '#9ec9ff';
    ctx.drawImage(A, 0, 0);
    const m = bufM.getContext('2d'); m.clearRect(0, 0, W, H); m.fillStyle = '#fff'; m.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = i / 120 * TAU, rr = Math.max(0, R * (1 + (fbm(Math.cos(a) * 1.6 + 2, Math.sin(a) * 1.6, 3, 3) - .5) * .25));
      i ? m.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : m.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    m.fill(); m.globalCompositeOperation = 'source-in'; m.drawImage(B, 0, 0); m.globalCompositeOperation = 'source-over';
    ctx.drawImage(bufM, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(col, .55 * (1 - p)); ctx.lineWidth = 30; ctx.filter = 'blur(10px)';
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke(); ctx.filter = 'none';
    ctx.strokeStyle = rgba('#ffffff', .6 * (1 - p)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
    ctx.restore();
  },
  // 一道光带横扫过去，光带后面是新画面
  sweep(ctx, A, B, p, o) {
    const col = o.color || '#f0b25a', ang = o.angle ?? -.35, e = eio(p);
    const nx = Math.cos(ang), ny = Math.sin(ang), span = W * 1.4, d = lerp(-span / 2 - 300, span / 2 + 300, e);
    ctx.drawImage(A, 0, 0);
    const m = bufM.getContext('2d'); m.clearRect(0, 0, W, H);
    m.save(); m.translate(W / 2, H / 2); m.rotate(ang); m.fillStyle = '#fff'; m.fillRect(-3000, -3000, 3000 + d, 6000); m.restore();
    m.globalCompositeOperation = 'source-in'; m.drawImage(B, 0, 0); m.globalCompositeOperation = 'source-over';
    ctx.drawImage(bufM, 0, 0);
    const bx = W / 2 + nx * d, by = H / 2 + ny * d;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(bx, by); ctx.rotate(ang);
    const g = ctx.createLinearGradient(-420, 0, 120, 0);
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(.7, rgba(col, .22)); g.addColorStop(.86, rgba('#fff4dc', .32)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(-420, -2000, 540, 4000); ctx.restore();
  },
};

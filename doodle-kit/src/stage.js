// stage.js：桌面、整页贴图、圆珠笔实物、相机、渲染入口。

let X = null, outC = null, pageC = null, deskC = null, grainC = null;
let T = 0, BOILN = 0;

// ---------- 整页贴图（静止的笔记和页边小画，scene 里的 PAGE_ART 往上画） ----------
function makePage() {
  const cv = document.createElement('canvas'); cv.width = (PG.w + PG.padL) * PS; cv.height = PG.h * PS;
  const c = cv.getContext('2d'), r = mulberry(21); c.scale(PS, PS); c.translate(PG.padL, 0);
  const X0 = -PG.padL, WW = PG.w + PG.padL;
  c.fillStyle = '#f8f5ee'; c.fillRect(X0, 0, WW, PG.h);
  for (let i = 0; i < 80; i++) { const x = X0 + r() * WW, y = r() * PG.h, rr = 120 + r() * 380, g = c.createRadialGradient(x, y, 0, x, y, rr), a = .035 * r(); g.addColorStop(0, `rgba(160,140,110,${a})`); g.addColorStop(1, 'rgba(160,140,110,0)'); c.fillStyle = g; c.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
  c.lineWidth = .7;
  for (let i = 0; i < 3200; i++) { const x = X0 + r() * WW, y = r() * PG.h, l = 4 + r() * 14, a = r() * TAU; c.strokeStyle = `rgba(120,105,85,${.03 + r() * .05})`; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + .4) * l * .5, y + Math.sin(a + .4) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  // 印刷的横线和页边线
  c.globalCompositeOperation = 'multiply';
  for (let y = PG.top; y < PG.h - 40; y += PG.rule) { c.strokeStyle = 'rgba(120,160,210,.55)'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(X0, y); c.lineTo(PG.w, y); c.stroke(); }
  c.strokeStyle = 'rgba(222,120,120,.75)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(PG.margin, 0); c.lineTo(PG.margin, PG.h); c.stroke();
  c.globalCompositeOperation = 'source-over';
  if (typeof PAGE_ART === 'function') PAGE_ART(c);
  // 拍照的光：左上亮，右下暗
  c.globalCompositeOperation = 'multiply';
  const g = c.createLinearGradient(X0, 0, PG.w, PG.h); g.addColorStop(0, '#fffdf8'); g.addColorStop(.55, '#f6f0e6'); g.addColorStop(1, '#e2d8c8');
  c.fillStyle = g; c.fillRect(X0, 0, WW, PG.h);
  c.globalCompositeOperation = 'source-over';
  return cv;
}
// 木桌，只在拉远时露出来
function makeDesk() {
  const cv = document.createElement('canvas'); cv.width = 2000; cv.height = 1500; const c = cv.getContext('2d'), r = mulberry(3);
  const g = c.createLinearGradient(0, 0, 2000, 1500); g.addColorStop(0, '#8a6448'); g.addColorStop(1, '#4e3626'); c.fillStyle = g; c.fillRect(0, 0, 2000, 1500);
  for (let i = 0; i < 260; i++) {
    const y0 = r() * 1500, a = .04 + r() * .08, amp = 4 + r() * 14, k = .002 + r() * .004, ph = r() * 9;
    c.strokeStyle = r() < .5 ? `rgba(40,24,14,${a})` : `rgba(190,150,110,${a * .7})`; c.lineWidth = .8 + r() * 2.5;
    c.beginPath(); for (let x = 0; x <= 2000; x += 20) { const y = y0 + Math.sin(x * k + ph) * amp + Math.sin(x * k * 3.1 + ph) * amp * .3; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
  }
  return cv;
}
function makeGrain() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), rnd = mulberry(5);
  const id = c.createImageData(W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const v = 255 - rnd() * rnd() * 22; d[i] = v; d[i + 1] = v - .5; d[i + 2] = v - 1.5; d[i + 3] = 255; }
  c.putImageData(id, 0, 0);
  const g = c.createRadialGradient(W * .42, H * .4, H * .35, W / 2, H / 2, H * 1.15); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(120,95,70,.34)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  return cv;
}

// ---------- 相机：世界坐标 (cx,cy) 放到画面中心，z 倍。带一点手持的漂移 ----------
let ZOOM = 1;
function camera(cx, cy, z, hand = 1) {
  const dx = (Math.sin(T * .63) + .5 * Math.sin(T * 1.37 + 2)) * 3.2 * hand, dy = (Math.sin(T * .51 + 1) + .5 * Math.sin(T * 1.11)) * 2.6 * hand, rot = Math.sin(T * .4 + .7) * .0035 * hand;
  ZOOM = z;
  X.setTransform(1, 0, 0, 1, 0, 0); X.translate(W / 2, H / 2); X.rotate(rot); X.scale(z, z); X.translate(-cx + dx / z, -cy + dy / z);
}
function drawDeskAndPage() {
  X.drawImage(deskC, -1400, -1050, 5200, 3900);
  X.save(); X.filter = `blur(${18 * ZOOM}px)`; X.fillStyle = 'rgba(30,18,8,.55)'; X.fillRect(14 - PG.padL, 22, PG.w + PG.padL, PG.h); X.restore();
  X.drawImage(pageC, -PG.padL, 0, PG.w + PG.padL, PG.h);
}

// ---------- 圆珠笔实物 ----------
// 笔尖在 (x,y)，ang 是笔尖指向笔尾的方向，lift 抬起高度（0 贴纸）。光从左上来，影子往右下落，离纸越高影子越远越虚。
function realPen(c, x, y, o = {}) {
  const ang = o.ang ?? -1.0, lift = o.lift ?? 0, len = o.len ?? 1000, grip = o.grip || '#33458f', cap = o.cap || '#2a3a86', ink = o.ink || INK.blue;
  const prof = [[0, 1.6], [20, 6], [40, 9.5], [64, 15], [80, 17], [250, 17], [270, 15.5], [len - 60, 15.5], [len - 40, 14], [len - 8, 13], [len, 8]];
  const ca = Math.cos(ang), sa = Math.sin(ang), sc = 1 + lift * .05;
  const P = (u, v) => [x + (ca * u - sa * v) * sc, y + (sa * u + ca * v) * sc];
  const outline = [...prof.map(([u, h]) => P(u, -h)), ...prof.slice().reverse().map(([u, h]) => P(u, h))];
  // 影子：每个点按它离纸的高度往右下错开
  const hOf = u => lift * 140 + 6 + u * .42;
  const shadow = [...prof.map(([u, h]) => [u, -h]), ...prof.slice().reverse().map(([u, h]) => [u, h])].map(([u, v]) => { const [px, py] = P(u, v), h = hOf(u); return [px + h * .55, py + h * .75]; });
  c.save(); c.filter = `blur(${(3 + lift * 16 + 6) * ZOOM}px)`; c.globalAlpha = clamp(.32 - lift * .12, .12, .32); c.fillStyle = '#2a2014';
  c.beginPath(); shadow.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.closePath(); c.fill(); c.restore();
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(sc, sc);
  const body = (u0, u1, fill) => { c.beginPath(); const pr = prof.filter(([u]) => u >= u0 && u <= u1); pr.forEach(([u, h], i) => i ? c.lineTo(u, -h) : c.moveTo(u, -h)); pr.slice().reverse().forEach(([u, h]) => c.lineTo(u, h)); c.closePath(); c.fillStyle = fill; c.fill(); };
  const across = (a, b, m) => { const g = c.createLinearGradient(0, -18, 0, 18); g.addColorStop(0, a); g.addColorStop(.3, m); g.addColorStop(.45, '#ffffff'); g.addColorStop(.6, m); g.addColorStop(1, b); return g; };
  body(0, 40, across('#d9dce2', '#5e636c', '#a7acb5'));
  body(40, 80, across('#f2f4f6', '#9aa3ae', '#dfe4ea'));
  body(80, 270, across(mixCol(grip, '#ffffff', .25), mixCol(grip, '#000000', .45), grip));
  body(270, len - 40, across('#f5f7f9', '#9ba5b1', '#e3e8ee'));
  c.globalAlpha = .55; c.fillStyle = ink; c.fillRect(270, -3.2, len - 360, 6.4); c.globalAlpha = 1;
  body(len - 40, len, across(mixCol(cap, '#ffffff', .25), mixCol(cap, '#000000', .45), cap));
  c.fillStyle = '#26262b'; c.beginPath(); c.arc(1.2, 0, 2.2, 0, TAU); c.fill();
  c.restore();
}

// ---------- 记号 ----------
function bang(c, x, y, s, k = 1, col = INK.red, seed = 1) {
  if (k <= 0) return; const h = s * backOut(k);
  bp(c, [[x, y - h], [x + 1, y - h * .55], [x + 2, y - h * .3]], { col, w: s * .13, seed });
  bpFill(c, x + 2.5, y - h * .06, s * .07, s * .07, { col, seed: seed + 1 });
}
function sweat(c, x, y, s, seed = 4) {
  const d = [[x, y - s], [x + s * .38, y - s * .1], [x + s * .3, y + s * .32], [x, y + s * .42], [x - s * .3, y + s * .32], [x - s * .38, y - s * .1]];
  pencil(c, d, PEN.sky, { seed, gap: 3, a: .9 });
  bp(c, [...d, d[0]], { col: INK.blue, w: 2.4, seed, closed: false });
}

// ---------- 时间线和渲染入口 ----------
const SHOTS = [], LOOPS = {};
function shots(list) { SHOTS.push(...list); SHOTS.sort((a, b) => a[0] - b[0]); }
function renderFrame(t) {
  T = t; BOILN = Math.floor(t * BOIL + 1e-6);
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.globalCompositeOperation = 'source-over'; X.filter = 'none';
  X.fillStyle = '#4e3626'; X.fillRect(0, 0, W, H);
  if (window.LOOP) window.LOOP(t);
  else if (SHOTS.length) { let i = 0; while (i + 1 < SHOTS.length && t >= SHOTS[i + 1][0]) i++; X.save(); SHOTS[i][1](t, t - SHOTS[i][0]); X.restore(); }
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none';
  X.globalCompositeOperation = 'multiply'; X.drawImage(grainC, 0, 0); X.globalCompositeOperation = 'source-over';
  if (typeof FADE === 'function') { const f = FADE(t); if (f > .001) { X.globalAlpha = f; X.fillStyle = '#f8f5ee'; X.fillRect(0, 0, W, H); X.globalAlpha = 1; } }
}
window.renderAt = async (t, type = 'image/png', q = .92) => { renderFrame(t); return outC.toDataURL(type, q); };
window.renderSheet = async (times, cols = 3, w = 640, crop = null, at = null) => {
  if (at) throw new Error('--crop-at 不支持，用 --crop=x,y,w,h');
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
  makeTooth(); pageC = makePage(); deskC = makeDesk(); grainC = makeGrain();
  window.ready = true;
  if (!location.search.includes('render')) {
    const s = document.getElementById('scrub'), lab = document.getElementById('tt'); s.max = DUR;
    const go = () => { const t0 = performance.now(); renderFrame(+s.value); lab.textContent = `${(+s.value).toFixed(2)}s · ${Math.round(performance.now() - t0)} ms`; };
    s.addEventListener('input', go); s.value = +(new URLSearchParams(location.search).get('t') || 0); go();
  }
});

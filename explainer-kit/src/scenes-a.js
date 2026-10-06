// 前三场：池塘里的绿藻 / 一扇光控的门 / 大脑的难题
const S = TL.S;

// ================= 绿藻（池塘和片尾共用） =================
const LIGHT = [1450, 300], ALGA_S = 1.7;
function wanderA(lt) { return [700 + 70 * Math.sin(lt * .33 + .4) + 18 * Math.sin(lt * 1.1), 600 + 40 * Math.sin(lt * .27 + 1.7) + 12 * Math.sin(lt * .9 + 2)]; }
function algaPos(lt) {
  const w = wanderA(lt), s0 = wanderA(7);
  const dx = LIGHT[0] - s0[0], dy = LIGHT[1] - s0[1], L = Math.hypot(dx, dy);
  const d = 30 * Math.max(0, lt - 7);
  const ap = [s0[0] + dx / L * d, s0[1] + dy / L * d];
  const k = ss(6.4, 9.2, lt);
  const x = lerp(w[0], ap[0], k), y = lerp(w[1], ap[1], k);
  // 衣藻游起来是一顿一顿的（鞭毛划一下进一截），加一点横向摆动
  return [x + Math.sin(lt * 5.2) * 2.5, y + Math.cos(lt * 5.2) * 2.5];
}
function algaPose(lt) {
  const a = algaPos(lt), b = algaPos(lt + .08);
  let ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  return { x: a[0], y: a[1], a: ang + Math.sin(lt * 2.6) * .06 };
}
// 眼点在身体上的位置（推镜头要对准它）
function eyespotAt(lt) {
  const p = algaPose(lt), c = Math.cos(p.a), s = Math.sin(p.a);
  const lx = 14 * ALGA_S, ly = -46 * ALGA_S; return [p.x + lx * c - ly * s, p.y + lx * s + ly * c];
}

function drawAlga(ctx, x, y, a, lt, o = {}) {
  const { scale = 1, lit = 0, alpha = 1 } = o;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(a); ctx.scale(scale, scale);
  const rx = 66, ry = 56;
  // 鞭毛：两根从前端伸出，蛙泳一样往后划
  const ph = lt * 7.5;
  for (const side of [-1, 1]) {
    const pts = []; let px = rx - 4, py = side * 7, ang = side * (.35 + .55 * (.5 + .5 * Math.sin(ph)));
    pts.push([px, py]);
    for (let i = 1; i <= 24; i++) {
      const s = i / 24, bend = side * 1.9 * (.5 + .5 * Math.sin(ph - s * 2.4)) * s;
      const aa = ang + bend; px += Math.cos(aa) * 6.4; py += Math.sin(aa) * 6.4; pts.push([px, py]);
    }
    line(ctx, pts, 'rgba(200,235,190,.18)', 7); line(ctx, pts, '#cfeec0', 2.2, .75);
  }
  // 细胞壁的光晕
  glow(ctx, 0, 0, 140, '#9fe08a', .16 + lit * .1);
  fillPath(ctx, ellipsePts(0, 0, rx + 7, ry + 7), 'rgba(190,235,170,.12)');
  // 身体
  const g = ctx.createRadialGradient(-10, -18, 6, 0, 0, rx + 6);
  g.addColorStop(0, '#d4f0a8'); g.addColorStop(.6, '#8cc96a'); g.addColorStop(1, '#4f8f45');
  ctx.fillStyle = g; ctx.beginPath(); ellipsePts(0, 0, rx, ry).forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.fill();
  // 杯状叶绿体（后部厚、前部空出来）
  ctx.save(); ctx.beginPath(); ellipsePts(0, 0, rx - 3, ry - 3).forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.clip();
  fillPath(ctx, ellipsePts(-12, 0, rx - 6, ry - 6), '#3f7f3a', .75);
  fillPath(ctx, ellipsePts(14, 0, rx - 28, ry - 22), '#b9e294', .9);
  // 叶绿体上的颗粒
  for (let i = 0; i < 26; i++) {
    const aa = hash(i + 3) * TAU, rr = 30 + hash(i + 9) * 22, px = -10 + Math.cos(aa) * rr, py = Math.sin(aa) * rr * .85;
    if (px > 22) continue;
    fillPath(ctx, circlePts(px, py, 2 + hash(i) * 2.5, 8), '#2f6a2f', .35);
  }
  ctx.restore();
  fillPath(ctx, circlePts(-34, 2, 13, 20), '#d8efb4', .8);            // 蛋白核
  fillPath(ctx, circlePts(18, 4, 15, 20), 'rgba(245,250,225,.55)');   // 细胞核
  fillPath(ctx, circlePts(20, 3, 5, 12), 'rgba(120,150,90,.6)');
  for (const s of [-1, 1]) fillPath(ctx, circlePts(52, s * 10, 4, 10), 'rgba(240,255,240,.5)');   // 伸缩泡
  // 眼点：橙红色，见光会亮
  glow(ctx, 14, -46, 46, '#ff8a4a', .35 + lit * .55);
  fillPath(ctx, ellipsePts(14, -46, 12, 7, .1), '#e2552e');
  fillPath(ctx, ellipsePts(12, -48, 5, 3, .1), '#ffb08a', .8);
  // 轮廓
  ctx.strokeStyle = 'rgba(30,70,30,.5)'; ctx.lineWidth = 2; ctx.beginPath();
  ellipsePts(0, 0, rx, ry).forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath(); ctx.stroke();
  ctx.restore();
}

// 水下背景：深青色、焦散、悬浮颗粒、暗角
function waterBg(ctx, t, o = {}) {
  const { light = 0, lightAt = LIGHT, dim = 1 } = o;
  const g = ctx.createRadialGradient(W * .5, H * .5, 80, W * .5, H * .5, W * .7);
  g.addColorStop(0, mix('#0b1f22', '#173a3c', dim)); g.addColorStop(1, '#030909');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const caus = texture('caustic', 480, 270, (c, w, h) => {
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = Math.pow(1 - Math.abs(fbm(x / 60, y / 60, 11, 4) - .5) * 2, 6);
      img.data.set([150, 220, 210, Math.round(v * 255)], (y * w + x) * 4);
    }
    c.putImageData(img, 0, 0);
  });
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .07 * dim;
  ctx.drawImage(caus, Math.sin(t * .11) * 40 - 60, Math.cos(t * .09) * 30 - 40, W + 120, H + 80);
  ctx.globalAlpha = .05 * dim; ctx.drawImage(caus, Math.cos(t * .07) * 50 - 60, Math.sin(t * .13) * 40 - 40, W + 160, H + 120);
  ctx.restore();
  if (light > 0) {
    glow(ctx, lightAt[0], lightAt[1], 900, '#bfe2ff', .22 * light);
    const bt = texture('softBeam', W / 2, H / 2, g => { g.filter = 'blur(28px)'; g.scale(.5, .5); beam(g, 2150, -260, LIGHT[0] - 320, LIGHT[1] + 300, 160, 520, '#d6ecff', .55); });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = light; ctx.drawImage(bt, lightAt[0] - LIGHT[0], lightAt[1] - LIGHT[1], W, H); ctx.restore();
  }
  // 悬浮颗粒，三层视差
  for (let i = 0; i < 80; i++) {
    const depth = .3 + hash(i + .1) * .7, r = 1 + depth * 3.4;
    const x = fract(hash(i) + t * .004 * depth + Math.sin(t * .2 + i) * .002) * (W + 100) - 50;
    const y = fract(hash(i + .5) - t * .006 * depth) * (H + 100) - 50;
    ctx.fillStyle = rgba('#a9d6c8', (.12 + .25 * depth) * dim);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (depth > .8) glow(ctx, x, y, r * 5, '#a9d6c8', .05 * dim);
  }
  vignette(ctx, .75);
}

// ================= 01 池塘 =================
scene(S.pond, (ctx, lt, t) => {
  const on = ss(TL.pondLight, TL.pondLight + 1.8, t);
  waterBg(ctx, t, { light: on });
  const p = algaPose(lt);
  const lit = win(TL.pondLight + .6, TL.pondLight + 4, t, .8) * (.6 + .4 * Math.sin(t * 6)) + on * .3;
  drawAlga(ctx, p.x, p.y, p.a, lt, { lit, scale: ALGA_S });
  // 远处还有两颗小的，没那么亮，失焦
  for (const [i, bx, by, sc] of [[1, 380, 260, .38], [2, 1580, 840, .32]]) {
    ctx.save(); ctx.filter = 'blur(3px)';
    drawAlga(ctx, bx + Math.sin(lt * .3 + i) * 30, by + Math.cos(lt * .25 + i) * 20, i * 2 + lt * .1, lt + i, { scale: sc, alpha: .45 });
    ctx.restore();
  }
  // 片名压在画面上
  const k = win(TL.titleIn, TL.titleOut, t, .9);
  if (k > 0) {
    ctx.save(); ctx.globalAlpha = k * .55; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const ttl = '用光，打开大脑';
    ctx.save(); ctx.font = `600 112px ${SERIF}`; ctx.letterSpacing = '18px'; const tw = ctx.measureText(ttl).width; ctx.restore();
    let x = W / 2 - tw / 2;
    for (let i = 0; i < ttl.length; i++) {
      const ch = ttl[i], a = ss(TL.titleIn + .3 + i * .12, TL.titleIn + 1.1 + i * .12, t) * (1 - ss(TL.titleOut - .9, TL.titleOut, t));
      ctx.save(); ctx.font = `600 112px ${SERIF}`; ctx.letterSpacing = '18px'; const cw = ctx.measureText(ch).width; ctx.restore();
      text(ctx, ch, x, 520 + (1 - eo(a)) * 18, { size: 112, font: SERIF, weight: 600, align: 'left', color: '#f3ecdf', alpha: a, spacing: 18, shadow: 'rgba(120,180,255,.35)' });
      x += cw;
    }
    const k2 = ss(TL.titleIn + 1.6, TL.titleIn + 2.6, t) * (1 - ss(TL.titleOut - .9, TL.titleOut, t));
    ctx.save(); ctx.globalAlpha = k2; ctx.fillStyle = '#6fa8ff'; ctx.fillRect(W / 2 - 160 * eo(k2), 576, 320 * eo(k2), 2); ctx.restore();
    text(ctx, '2026 诺贝尔生理学或医学奖 · 光遗传学', W / 2, 640, { size: 30, color: '#cfc5b2', alpha: k2, spacing: 8 });
  }
});

// ================= 02 细胞膜上的门 =================
const MEM = { y0: 482, y1: 638, cx: 960 };
const lipidXs = [];
for (let x = -10; x < W + 20; x += 30) if (Math.abs(x - MEM.cx) > 100) lipidXs.push(x);

function channelOpen(t) {
  let o = 0;
  TL.photon.forEach((ph, i) => { o = Math.max(o, ss(ph, ph + .45, t) * (1 - ss(TL.closeAt[i], TL.closeAt[i] + .55, t))); });
  return o;
}
function ionHome(i, t) {
  return [140 + hash(i * 3.1) * 1640 + Math.sin(t * .5 + i) * 14, 140 + hash(i * 1.7 + .3) * 250 + Math.cos(t * .43 + i * 2) * 10];
}
const ION_N = 34;
const ionOrder = [...Array(ION_N).keys()].sort((a, b) => Math.abs(ionHome(a, 0)[0] - MEM.cx) - Math.abs(ionHome(b, 0)[0] - MEM.cx));
function ionPos(i, t) {
  const k = ionOrder.indexOf(i);
  if (k >= 14) return [ionHome(i, t), 0];
  const te = TL.photon[0] + .5 + k * .3;
  const h = ionHome(i, t), top = [MEM.cx, MEM.y0 - 70], bot = [MEM.cx, MEM.y1 + 70];
  const dest = [MEM.cx + (hash(i + 7) - .5) * 1100, 790 + hash(i + 4) * 150];
  if (t < te - 1.3) return [h, 0];
  if (t < te) { const e = eio(prog(te - 1.3, te, t)); return [[lerp(h[0], top[0], e), lerp(h[1], top[1], e)], e * .5]; }
  if (t < te + .45) { const e = prog(te, te + .45, t); return [[top[0], lerp(top[1], bot[1], e)], 1]; }
  const e = eo(prog(te + .45, te + 3.2, t));
  return [[lerp(bot[0], dest[0], e) + Math.sin(t * .5 + i) * 10 * e, lerp(bot[1], dest[1], e)], 1 - e];
}
function drawIon(ctx, x, y, hot = 0, a = 1) {
  if (hot > 0) glow(ctx, x, y, 46, '#ffc45a', hot * .7);
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = '#e4a83f'; ctx.strokeStyle = '#a8701f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#fff8e8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
  ctx.restore();
}
function drawPhoton(ctx, t, ph) {
  const x0 = 430, y0 = 40, x1 = 905, y1 = 520, k = prog(ph - 1.0, ph, t);
  if (k <= 0 || k >= 1) return;
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const head = k * L, pts = [];
  for (let d = Math.max(0, head - 260); d <= head; d += 4) {
    const env = Math.sin(Math.PI * (d - (head - 260)) / 260);
    const off = Math.sin(d / 13 - t * 30) * 14 * env;
    pts.push([x0 + dx / L * d + nx * off, y0 + dy / L * d + ny * off]);
  }
  glowLine(ctx, pts, '#3d7cf0', 3.2, 1, '#cfe2ff');
}
// 视黄醛：弯的（11-顺）和直的（全反）两种形状之间插值
const RET_BENT = [[-30, 10], [-18, -2], [-6, 8], [6, -4], [14, 6], [20, 22], [30, 30]];
const RET_STR = [[-30, 10], [-18, -2], [-6, 8], [6, -4], [18, 6], [30, -6], [42, 4]];

function drawChannel(ctx, t, o) {
  const gap = o * 46;
  // 两半，各三根螺旋，略微倾斜
  for (const side of [-1, 1]) {
    for (const [k, off, tilt, col] of [[0, 18, .05, '#3f7a76'], [1, 48, -.04, '#5b9590'], [2, 78, .06, '#4a8681']]) {
      const x = MEM.cx + side * (off + gap / 2 - (k === 0 ? 4 : 0));
      ctx.save(); ctx.translate(x, (MEM.y0 + MEM.y1) / 2); ctx.rotate(side * tilt * (1 + o * .6));
      const hw = 17, hh = 150;
      ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-hw, -hh, hw * 2, hh * 2, hw); ctx.fill();
      // 螺旋的纹
      ctx.strokeStyle = 'rgba(230,245,240,.28)'; ctx.lineWidth = 2;
      for (let yy = -hh + 16; yy < hh - 10; yy += 18) { ctx.beginPath(); ctx.moveTo(-hw + 3, yy); ctx.quadraticCurveTo(0, yy + 9, hw - 3, yy + 2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.roundRect(-hw + 4, -hh + 6, 7, hh * 2 - 12, 4); ctx.fill();
      ctx.restore();
    }
  }
  // 视黄醛（在左半边里），吸收光子就从弯变直
  let flip = 0; TL.photon.forEach((ph, i) => { flip = Math.max(flip, ss(ph - .05, ph + .2, t) * (1 - ss(TL.closeAt[i] - .2, TL.closeAt[i] + .2, t))); });
  const rp = RET_BENT.map((p, i) => [MEM.cx - 58 - gap / 2 + lerp(p[0], RET_STR[i][0], flip), 548 + lerp(p[1], RET_STR[i][1], flip)]);
  if (flip > .05) glow(ctx, rp[3][0], rp[3][1], 70, '#ffb347', flip * .5);
  line(ctx, rp, '#c05a1c', 6); line(ctx, rp, '#f0a24a', 3);
}

scene(S.membrane, (ctx, lt, t) => {
  paperBg(ctx, '#f3ebdc');
  // 膜外偏冷、膜内偏暖
  ctx.fillStyle = 'rgba(160,190,200,.16)'; ctx.fillRect(0, 0, W, MEM.y0 - 20);
  ctx.fillStyle = 'rgba(220,160,110,.12)'; ctx.fillRect(0, MEM.y1 + 20, W, H);
  text(ctx, '细胞外', 96, 250, { size: 24, color: '#7a8a8c', align: 'left', spacing: 6, alpha: ss(1.4, 2.4, lt) });
  text(ctx, '细胞内', 96, 840, { size: 24, color: '#a07a5a', align: 'left', spacing: 6, alpha: ss(1.4, 2.4, lt) });

  const o = channelOpen(t);
  // 门开后，膜内侧有一道电信号往两边传
  const sig = x => { const d = Math.abs(x - MEM.cx), tt = t - (TL.photon[0] + .8); if (tt < 0) return 0; return Math.exp(-(((d - tt * 260) / 120) ** 2)) * (1 - ss(5, 7, tt)); };
  // 磷脂双分子层
  lipidXs.forEach((x, i) => {
    for (const [hy, dir] of [[MEM.y0, 1], [MEM.y1, -1]]) {
      const jy = Math.sin(t * 2.3 + i * 1.7 + hy) * 1.6, hx = x + Math.sin(t * 1.7 + i) * 1.2;
      for (const s of [-5, 5]) {
        const pts = []; for (let k = 0; k <= 6; k++) pts.push([hx + s + Math.sin(k * 1.3 + t * 3 + i) * 2.2, hy + jy + dir * (12 + k * 9.5)]);
        line(ctx, pts, '#b88b6a', 2.2, .8);
      }
      const hot = dir < 0 ? sig(x) : 0;
      if (hot > .02) glow(ctx, hx, hy + jy, 34, '#ffb347', hot * .8);
      ctx.fillStyle = mix('#d6936a', '#ffcf7a', hot); ctx.strokeStyle = '#9a5c3a'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(hx, hy + jy, 12, 0, TAU); ctx.fill(); ctx.stroke();
    }
  });
  // 离子：穿过的先画在门后面
  for (let i = 0; i < ION_N; i++) { const [[x, y], hot] = ionPos(i, t); drawIon(ctx, x, y, hot, ss(.6, 1.6, lt)); }
  drawChannel(ctx, t, o);
  if (o > 0) glow(ctx, MEM.cx, (MEM.y0 + MEM.y1) / 2, 150, '#8fc2ff', o * .25);
  TL.photon.forEach(ph => drawPhoton(ctx, t, ph));
  // 光子打中那一下的闪光
  TL.photon.forEach(ph => { const k = prog(ph, ph + .5, t); if (k > 0 && k < 1) glow(ctx, 905, 520, 160, '#9cc4ff', (1 - k) * .6); });

  const fadeL = 1 - ss(27.4, 28.4, lt);
  label(ctx, '细胞膜', 300, MEM.y0 - 14, 360, 360, lt - 2.6, { alpha: fadeL });
  label(ctx, '通道视紫红质', MEM.cx + 70, MEM.y0 - 70, 1180, 330, lt - 7.4, { alpha: fadeL });
  label(ctx, '蓝光', 640, 240, 560, 190, lt - 12.3, { alpha: fadeL * (1 - ss(17.5, 18.5, lt)), color: '#2f62c8' });
  const far = ionOrder[ION_N - 1], fp = ionHome(far, t);
  label(ctx, '带正电的离子', fp[0] + 10, fp[1] + 10, fp[0] + 90, fp[1] + 90, lt - 15, { alpha: fadeL * (1 - ss(21.5, 22.5, lt)) });
});

// ================= 03 大脑（卡哈尔式墨线） =================
// 神经元的几何：第三、四场共用同一组，这样墨线转荧光时位置对得上
const NEURONS = (() => {
  const r = TL.rnd(42), out = [];
  const branch = (x, y, a, len, depth, w, list) => {
    const pts = [[x, y]]; let px = x, py = y, aa = a;
    for (let i = 0; i < 7; i++) { aa += (r() - .5) * .5; px += Math.cos(aa) * len / 7; py += Math.sin(aa) * len / 7; pts.push([px, py]); }
    list.push({ pts, w });
    if (depth > 0) {
      branch(px, py, aa - .35 - r() * .4, len * (.55 + r() * .2), depth - 1, w * .65, list);
      branch(px, py, aa + .35 + r() * .4, len * (.55 + r() * .2), depth - 1, w * .65, list);
      if (r() < .5) { const m = pts[3]; branch(m[0], m[1], aa + (r() < .5 ? -1 : 1) * (.9 + r() * .4), len * .4, depth - 1, w * .5, list); }
    }
  };
  for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) {
    const x = 330 + gx * 420 + (r() - .5) * 180 + (gy % 2) * 120, y = 200 + gy * 210 + (r() - .5) * 90;
    const sz = 16 + r() * 10, dend = [];
    branch(x, y - sz, -Math.PI / 2 + (r() - .5) * .4, 120 + r() * 80, 2, 4.2, dend);
    for (let k = 0; k < 3; k++) branch(x + (k - 1) * sz * .6, y + sz * .4, Math.PI / 2 + (k - 1) * .9 + (r() - .5) * .3, 60 + r() * 40, 1, 3, dend);
    const ax = [[x, y + sz * .6]]; let px = x, py = y + sz * .6, aa = Math.PI / 2 + (r() - .5) * .8;
    for (let i = 0; i < 16; i++) { aa += (r() - .5) * .35; px += Math.cos(aa) * 26; py += Math.sin(aa) * 26; ax.push([px, py]); }
    const soma = [[0, -sz * 1.3], [sz * .9, sz * .5], [sz * .3, sz * .8], [-sz * .4, sz * .8], [-sz * .9, sz * .45]].map(([a, b]) => [x + a, y + b]);
    out.push({ x, y, sz, dend, ax, soma, delay: r() * 1.6 });
  }
  return out;
})();

function drawCajal(ctx, lt, o = {}) {
  const { ink = '#1f1a16' } = o;
  NEURONS.forEach((n, i) => {
    const pr = prog(n.delay, n.delay + 2.4, lt);
    if (pr <= 0) return;
    n.dend.forEach((d, j) => stroke(ctx, d.pts, { w: d.w, w1: d.w * .35, color: ink, jit: .6, seed: i * 31 + j, taper: .05, progress: pr * 1.15 - (d.w < 3 ? .15 : 0), step: 4 }));
    stroke(ctx, n.ax, { w: 1.6, w1: .9, color: ink, jit: .5, seed: i * 7 + 99, taper: .02, progress: pr, step: 5 });
    if (pr > .05) blob(ctx, n.soma, ink, { jit: 1.2, seed: i, alpha: ss(.05, .3, pr) });
  });
}

scene(S.brain, (ctx, lt, t) => {
  paperBg(ctx, '#efe4cc');
  const z = lerp(1, 1.06, eio(lt / 24));
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  if (lt > 4.3) {
    const tex = texture('cajal', W, H, g => drawCajal(g, 10));
    ctx.drawImage(tex, 0, 0);
  } else drawCajal(ctx, lt);

  // 电极
  const ein = eio(prog(9.6, 11.2, lt)) * (1 - eio(prog(17.2, 18.4, lt)));
  const tip = [lerp(1620, 1130, ein), lerp(-120, 470, ein)];
  const zapK = TL.zaps.reduce((m, z0) => Math.max(m, t >= z0 ? Math.exp(-(t - z0) * 4) : 0), 0);
  // 自发放电
  for (const [ts, ni] of TL.brainSpikes) {
    const k = (t - ts) / .6; if (k < 0 || k > 1) continue;
    const n = NEURONS[ni % NEURONS.length];
    glow(ctx, n.x, n.y, 60, '#e8672c', (1 - k) * .55);
    const [ax, ay] = along(n.ax, k); glow(ctx, ax, ay, 22, '#f08a3a', (1 - k) * .9);
  }
  // 电极一扎，附近成片亮
  if (zapK > .01) {
    glow(ctx, tip[0], tip[1], 620, '#f0883a', zapK * .45);
    NEURONS.forEach(n => {
      const d = Math.hypot(n.x - tip[0], n.y - tip[1]); if (d > 640) return;
      glow(ctx, n.x, n.y, 90, '#e8572a', zapK * .75 * (1 - d / 700));
    });
    for (let i = 0; i < 9; i++) {
      const a = hash(i + Math.floor(t * 20)) * TAU, l = 40 + hash(i + 3) * 90;
      line(ctx, [tip, [tip[0] + Math.cos(a) * l * .5 + (hash(i + 9) - .5) * 20, tip[1] + Math.sin(a) * l * .5], [tip[0] + Math.cos(a) * l, tip[1] + Math.sin(a) * l]], '#fff1c8', 2, zapK);
    }
  }
  if (ein > 0) {
    const back = [tip[0] + 560, tip[1] - 680];
    line(ctx, [back, tip], '#5a5248', 14); line(ctx, [back, tip], '#9d9488', 8); line(ctx, [[back[0] - 3, back[1]], [tip[0] - 2, tip[1] - 3]], '#ddd5c8', 2);
    fillPath(ctx, [[tip[0] - 5, tip[1] - 6], [tip[0] + 5, tip[1] - 4], [tip[0] - 4, tip[1] + 10]], '#3a342c');
  }
  // “管什么？”的疑问
  const qs = [['管运动？', 4], ['管记忆？', 9], ['管恐惧？', 13], ['管饥饿？', 6]];
  qs.forEach(([s, ni], i) => {
    const n = NEURONS[ni], a = win(17.6 + i * .5, 23.6, lt, .5);
    text(ctx, s, n.x + 34, n.y - 26, { size: 32, font: SERIF, color: '#a4482a', align: 'left', alpha: a, weight: 600 });
  });
  ctx.restore();
  vignette(ctx, .18, '#5a4020');
});

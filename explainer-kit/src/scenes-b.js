// 后五场：把门装进神经元 / 开灯关灯 / 让盲人看见光 / 他看见的 / 片尾

// ================= 04 荧光：同一组神经元 =================
const TARGETS = [2, 5, 9, 14];
function neuronPaths(n) { return [...n.dend.map(d => d.pts), n.ax]; }
function fluorPulseK(t) { let k = 0; for (const p of TL.fluorPulses) if (t >= p && t < p + .6) k = Math.max(k, Math.exp(-(t - p) * 7)); return k; }

scene(S.fluor, (ctx, lt, t) => {
  ctx.fillStyle = '#03060a'; ctx.fillRect(0, 0, W, H);
  const z = 1.06;   // 接上一场结尾的推近
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  const dim = texture('fluorDim', W, H, g => {
    NEURONS.forEach((n, i) => {
      neuronPaths(n).forEach(p => { line(g, p, '#2b5a4a', 5, .18); line(g, p, '#4f8f78', 1.6, .55); });
      fillPath(g, n.soma, '#4f8f78', .7); glow(g, n.x, n.y, 40, '#4f8f78', .25);
    });
  });
  ctx.drawImage(dim, 0, 0);

  // 病毒：带着蓝色的基因飘进来，分成四份钻进目标细胞
  const vIn = eo(prog(TL.virus - S.fluor, TL.virus - S.fluor + 2.2, lt));
  const split = prog(3.4, 4.6, lt);
  const vx = lerp(-120, 520, vIn), vy = 540 + Math.sin(lt * 1.3) * 16;
  const drawVirus = (x, y, r, a, rot) => {
    if (a <= 0) return;
    glow(ctx, x, y, r * 2.6, '#4aa8ff', .25 * a);
    const hexP = [...Array(6)].map((_, i) => [x + Math.cos(rot + i * TAU / 6) * r, y + Math.sin(rot + i * TAU / 6) * r]);
    ctx.save(); ctx.globalAlpha *= a; fillPath(ctx, hexP, 'rgba(20,40,70,.85)'); ctx.restore();
    line(ctx, [...hexP, hexP[0]], '#9cc8ff', 2.4, a);
    for (const ph of [0, Math.PI]) {
      const pts = []; for (let i = 0; i <= 20; i++) { const s = i / 20; pts.push([x - r * .6 + s * r * 1.2, y + Math.sin(s * TAU * 1.5 + ph + lt * 2) * r * .3]); }
      line(ctx, pts, '#5fb4ff', 2.2, a);
    }
  };
  if (split <= 0) drawVirus(vx, vy, 46, ss(0, .6, vIn * 3), lt * .3);
  else if (split < 1) TARGETS.forEach((ti, k) => {
    const n = NEURONS[ti], e = eio(split);
    drawVirus(lerp(vx, n.x, e), lerp(vy, n.y, e), lerp(46, 16, e), 1 - ss(.85, 1, split), lt * .6 + k);
  });
  // 被“感染”的细胞：慢慢长出蓝色的门
  const inf = ss(4.5, 7.2, lt);
  const pk = fluorPulseK(t);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  TARGETS.forEach((ti, k) => {
    const n = NEURONS[ti];
    const hit = prog(4.5, 4.9, lt); if (hit > 0 && hit < 1) glow(ctx, n.x, n.y, 160, '#6fb8ff', (1 - hit) * .9);
    if (inf <= 0) return;
    const base = '#2a6fd0', a = .35 * inf + pk * .65;
    neuronPaths(n).forEach(p => { line(ctx, p, base, 7, a * .25); line(ctx, p, '#5fa8ff', 2, a); if (pk > .05) line(ctx, p, '#e6f2ff', 1, pk); });
    fillPath(ctx, n.soma, mix('#2a6fd0', '#e8f4ff', pk), inf);
    glow(ctx, n.x, n.y, 70 + pk * 120, '#5fa8ff', .25 * inf + pk * .8);
    // 膜上一圈蓝点，就是装进去的门
    for (let j = 0; j < 10; j++) {
      const a2 = j / 10 * TAU + k, rr = n.sz * 1.15;
      ctx.fillStyle = rgba('#8fd0ff', inf * (.5 + .5 * pk)); ctx.beginPath(); ctx.arc(n.x + Math.cos(a2) * rr, n.y + Math.sin(a2) * rr * .9, 2.6, 0, TAU); ctx.fill();
    }
    // 放电沿轴突跑下去
    for (const p of TL.fluorPulses) {
      const kk = (t - p) / .5; if (kk < 0 || kk > 1) continue;
      const [ax, ay] = along(n.ax, kk); glow(ctx, ax, ay, 26, '#cfe6ff', (1 - kk) * .9);
    }
  });
  ctx.restore();
  ctx.restore();
  // 光束从上面打下来，跟着脉冲一闪一闪
  const lightOn = win(14.0, 19.9, lt, .3) + win(20.4, 25.1, lt, .3);
  if (lightOn > 0) beam(ctx, W / 2, -200, W / 2, H * .62, 120, 900, '#3d7cf0', (.12 + pk * .45) * lightOn);
  vignette(ctx, .6);
});

// ================= 05 小鼠 =================
const ARENA = { x: 960, y: 540, r: 430 }, MS = 1.5;
const MOUSE = (() => {
  // 逐步积分出小鼠的轨迹：平时随便逛，开灯时原地转圈
  const dt = 1 / 120, n = Math.ceil(26 / dt), pos = [], head = [], dist = [];
  const wander = s => [ARENA.x + 200 * Math.sin(.37 * s + 1) + 50 * Math.sin(.91 * s), ARENA.y + 150 * Math.sin(.29 * s + 2.3) + 40 * Math.sin(1.13 * s + .7)];
  const onW = lt => TL.mouseOn.reduce((m, [a, b]) => Math.max(m, win(a - S.mouse, b - S.mouse, lt, .35)), 0);
  let p = wander(0), phi = 0, prevW = 0, d = 0, ang = 0;
  for (let i = 0; i <= n; i++) {
    const lt = i * dt, w = onW(lt);
    const a = wander(lt), b = wander(lt + dt);
    const vw = [(b[0] - a[0]) / dt * (1 - w), (b[1] - a[1]) / dt * (1 - w)];
    if (w > 0 && prevW === 0) phi = ang;
    if (w > 0) phi += 2.5 * dt;
    let vx = vw[0] + w * Math.cos(phi) * 240, vy = vw[1] + w * Math.sin(phi) * 240;
    // 别撞墙：往中心推一点
    const dx = p[0] - ARENA.x, dy = p[1] - ARENA.y, rr = Math.hypot(dx, dy);
    if (rr > ARENA.r - 170) { vx -= dx / rr * (rr - ARENA.r + 170) * 4; vy -= dy / rr * (rr - ARENA.r + 170) * 4; }
    if (Math.hypot(vx, vy) > 5) ang = Math.atan2(vy, vx);
    p = [p[0] + vx * dt, p[1] + vy * dt]; d += Math.hypot(vx, vy) * dt;
    pos.push(p); head.push(ang); dist.push(d); prevW = w;
  }
  return { dt, pos, head, dist, onW };
})();
function mouseAt(lt) {
  const i = clamp(Math.round(lt / MOUSE.dt), 0, MOUSE.pos.length - 1);
  return { i, x: MOUSE.pos[i][0], y: MOUSE.pos[i][1], a: MOUSE.head[i], d: MOUSE.dist[i] };
}
// 尾巴：沿走过的路往回取 160px
function tailPts(m) {
  const out = [], len = 170 * MS, rear = 58 * MS; let i = m.i, base = [m.x - Math.cos(m.a) * rear, m.y - Math.sin(m.a) * rear];
  out.push(base);
  const target0 = MOUSE.dist[m.i];
  for (let k = 1; k <= 14; k++) {
    const want = target0 - rear - k * len / 14;
    while (i > 0 && MOUSE.dist[i] > want) i--;
    if (MOUSE.dist[i] > want) { const last = out[out.length - 1]; out.push([last[0] - Math.cos(m.a) * len / 14, last[1] - Math.sin(m.a) * len / 14]); }
    else out.push([MOUSE.pos[i][0] + Math.sin(k + m.d * .03) * k * .6, MOUSE.pos[i][1] + Math.cos(k + m.d * .03) * k * .6]);
  }
  return out;
}
function drawMouse(ctx, m, lit) {
  const tail = tailPts(m);
  stroke(ctx, tail, { w: 10, w1: 3, color: '#b49a8c', jit: .3, taper: 0, seed: 5 });
  ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a); ctx.scale(MS, MS);
  fillPath(ctx, ellipsePts(6, 10, 70, 42), 'rgba(60,40,20,.14)');   // 影子
  // 脚：步态相位跟着走过的距离
  const ph = m.d / 33;
  for (const [fx, fy, o] of [[38, 30, 0], [38, -30, Math.PI], [-36, 34, Math.PI], [-36, -34, 0]]) {
    const sx = Math.sin(ph + o) * 7;
    fillPath(ctx, ellipsePts(fx + sx, fy, 9, 6), '#d9b3a6');
  }
  const g = ctx.createLinearGradient(0, -40, 0, 40); g.addColorStop(0, '#8a8076'); g.addColorStop(.5, '#a59a8d'); g.addColorStop(1, '#7a7066');
  ctx.fillStyle = g; ctx.beginPath();
  ctx.moveTo(-62, 0); ctx.bezierCurveTo(-62, -42, 20, -44, 44, -26); ctx.bezierCurveTo(70, -14, 96, -4, 100, 0);
  ctx.bezierCurveTo(96, 4, 70, 14, 44, 26); ctx.bezierCurveTo(20, 44, -62, 42, -62, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(60,50,40,.45)'; ctx.lineWidth = 2; ctx.stroke();
  for (const s of [-1, 1]) {
    fillPath(ctx, circlePts(48, s * 26, 15, 20), '#8d8277'); fillPath(ctx, circlePts(50, s * 26, 9, 16), '#d29d93');
    fillPath(ctx, circlePts(78, s * 11, 3.4, 10), '#1d1916');
    line(ctx, [[94, s * 4], [112, s * 16], [126, s * 22]], 'rgba(60,50,40,.35)', 1.2);
    line(ctx, [[94, s * 3], [116, s * 6], [130, s * 6]], 'rgba(60,50,40,.35)', 1.2);
  }
  fillPath(ctx, circlePts(100, 0, 5, 12), '#d98a8a');
  // 头上的光纤接口
  fillPath(ctx, circlePts(30, 0, 11, 16), '#cfc8bd'); line(ctx, circlePts(30, 0, 11, 16), '#6a6258', 1.6);
  if (lit > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 30, 0, 50, '#4a8cff', lit * .6); glow(ctx, 30, 0, 16, '#cfe4ff', lit * .9); ctx.restore(); }
  ctx.restore();
}

scene(S.mouse, (ctx, lt, t) => {
  paperBg(ctx, '#ede6d8');
  // 场地：俯视的圆形旷场
  const A = ARENA;
  glow(ctx, A.x, A.y, A.r * 1.5, '#ffffff', .25);
  fillPath(ctx, circlePts(A.x, A.y, A.r + 18, 96), '#d8cfbf');
  fillPath(ctx, circlePts(A.x, A.y, A.r, 96), '#f6f1e6');
  ctx.save(); ctx.beginPath(); circlePts(A.x, A.y, A.r, 96).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.clip();
  ctx.strokeStyle = 'rgba(120,100,70,.12)'; ctx.lineWidth = 1.4;
  for (let k = -5; k <= 5; k++) { ctx.beginPath(); ctx.moveTo(A.x + k * 80, A.y - A.r); ctx.lineTo(A.x + k * 80, A.y + A.r); ctx.moveTo(A.x - A.r, A.y + k * 80); ctx.lineTo(A.x + A.r, A.y + k * 80); ctx.stroke(); }
  const ig = ctx.createRadialGradient(A.x, A.y, A.r * .7, A.x, A.y, A.r); ig.addColorStop(0, 'rgba(90,70,40,0)'); ig.addColorStop(1, 'rgba(90,70,40,.16)');
  ctx.fillStyle = ig; ctx.fillRect(A.x - A.r, A.y - A.r, A.r * 2, A.r * 2);
  ctx.restore();
  line(ctx, circlePts(A.x, A.y, A.r, 96), '#a99a82', 2.5);

  const m = mouseAt(lt), w = MOUSE.onW(lt);
  // 开灯时留下的转圈轨迹，淡淡的
  const trail = [];
  for (let k = 0; k < 160; k++) { const j = m.i - k * 6; if (j < 0) break; trail.push(MOUSE.pos[j]); }
  if (trail.length > 2) line(ctx, trail, '#4a7fd8', 3, .18);
  // 光纤：从头顶接口弯上去
  const hx = m.x + Math.cos(m.a) * 30 * MS, hy = m.y + Math.sin(m.a) * 30 * MS, top = [A.x + 40, -40];
  const fpts = []; for (let i = 0; i <= 24; i++) { const s = i / 24; fpts.push([lerp(hx, top[0], s) + Math.sin(s * Math.PI) * 60, lerp(hy, top[1], s) + Math.sin(s * Math.PI) * 40]); }
  line(ctx, fpts, 'rgba(40,40,50,.25)', 7); line(ctx, fpts, '#3c3f4a', 3);
  if (w > 0) glowLine(ctx, fpts, '#4a8cff', 2, w * .7, '#dbe9ff');
  drawMouse(ctx, m, w);

  // 右上角的开关
  const px = 1620, py = 104;
  text(ctx, '蓝光', px, py + 12, { size: 26, color: '#4a4238', align: 'right', alpha: ss(.4, 1.2, lt) });
  ctx.save(); ctx.globalAlpha = ss(.4, 1.2, lt);
  ctx.fillStyle = mix('#cfc6b6', '#3d7cf0', w); ctx.beginPath(); ctx.roundRect(px + 18, py - 14, 76, 38, 19); ctx.fill();
  if (w > 0) glow(ctx, px + 56, py + 5, 90, '#3d7cf0', w * .4);
  ctx.fillStyle = '#fbf8f2'; ctx.beginPath(); ctx.arc(px + 37 + w * 38, py + 5, 15, 0, TAU); ctx.fill();
  ctx.restore();
  text(ctx, w > .5 ? '开' : '关', px + 112, py + 13, { size: 26, color: w > .5 ? '#2f62c8' : '#8a7f70', align: 'left', alpha: ss(.4, 1.2, lt), weight: 700 });
});

// ================= 06 眼睛（铜版画式剖面） =================
const EYE = { x: 700, y: 530, r: 300 };
const INSET = { x: 1440, y: 470, r: 250 };
scene(S.eye, (ctx, lt, t) => {
  paperBg(ctx, '#f2e9d6');
  const ink = '#2a241d', E = EYE;
  const amber = ss(TL.amberOn - S.eye, TL.amberOn - S.eye + 1.2, lt);
  // 眼球
  fillPath(ctx, circlePts(E.x, E.y, E.r, 120), '#f7f1e4');
  hatch(ctx, c => { c.arc(E.x, E.y, E.r, 0, TAU); c.arc(E.x, E.y, E.r - 26, 0, TAU, true); }, { angle: .9, gap: 6, color: '#6b4a32', alpha: .45, box: [E.x - E.r, E.y - E.r, E.r * 2, E.r * 2] });
  // 视网膜：眼底那一圈
  ctx.save(); ctx.strokeStyle = mix('#b9583a', '#8a7a6a', ss(1, 6, lt) * .6); ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(E.x, E.y, E.r - 34, -1.25, 1.25); ctx.stroke(); ctx.restore();
  stroke(ctx, circlePts(E.x, E.y, E.r, 120), { w: 3.4, color: ink, jit: .8, seed: 3, taper: 0 });
  // 视神经
  const nerve = [[E.x + E.r - 8, E.y - 30], [E.x + E.r + 80, E.y - 20], [E.x + E.r + 170, E.y + 30]];
  const nerve2 = [[E.x + E.r - 8, E.y + 30], [E.x + E.r + 70, E.y + 40], [E.x + E.r + 150, E.y + 90]];
  stroke(ctx, nerve, { w: 3, color: ink, seed: 8 }); stroke(ctx, nerve2, { w: 3, color: ink, seed: 9 });
  hatch(ctx, c => { c.moveTo(...nerve[0]); nerve.forEach(p => c.lineTo(...p)); [...nerve2].reverse().forEach(p => c.lineTo(...p)); c.closePath(); }, { angle: -.3, gap: 5, color: '#8a5a3a', alpha: .5 });
  // 角膜、虹膜、晶状体
  ctx.save(); ctx.beginPath(); ctx.arc(E.x - E.r + 60, E.y, 150, Math.PI * .62, Math.PI * 1.38); ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  for (const s of [-1, 1]) fillPath(ctx, [[E.x - E.r + 52, E.y + s * 40], [E.x - E.r + 64, E.y + s * 40], [E.x - E.r + 70, E.y + s * 150], [E.x - E.r + 50, E.y + s * 150]], '#5a4430');
  fillPath(ctx, ellipsePts(E.x - E.r + 102, E.y, 38, 96), '#dfe8ea');
  hatch(ctx, c => { ellipsePts(E.x - E.r + 102, E.y, 38, 96).forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); }, { angle: .3, gap: 7, color: '#5a7078', alpha: .35 });
  line(ctx, [...ellipsePts(E.x - E.r + 102, E.y, 38, 96), ellipsePts(E.x - E.r + 102, E.y, 38, 96)[0]], ink, 2.2);

  // 特制眼镜 + 琥珀色光
  const gA = ss(12.6, 13.6, lt);
  if (gA > 0) {
    ctx.save(); ctx.globalAlpha = gA;
    const gx = 150, gy = E.y;
    fillPath(ctx, [[gx - 40, gy - 90], [gx + 40, gy - 70], [gx + 40, gy + 70], [gx - 40, gy + 90]], '#3a332b');
    fillPath(ctx, [[gx + 30, gy - 60], [gx + 46, gy - 56], [gx + 46, gy + 56], [gx + 30, gy + 60]], '#e8a548');
    fillPath(ctx, circlePts(gx - 10, gy - 110, 14, 16), '#3a332b'); fillPath(ctx, circlePts(gx - 10, gy - 110, 6, 12), '#8fb0c0');
    ctx.restore();
    text(ctx, '特制眼镜', 150, E.y + 150, { size: 24, color: '#5a4a38', alpha: gA, weight: 500 });
  }
  // 光线：进眼睛、聚焦到眼底
  if (amber > 0) {
    const focus = [E.x + E.r - 40, E.y - 40];
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    for (let k = -2; k <= 2; k++) line(ctx, [[196, E.y + k * 22], [E.x - E.r + 102, E.y + k * 30], focus], '#e8a03a', 3, amber * .7);
    ctx.restore();
    const pulse = .5 + .5 * Math.sin(lt * 12);
    glow(ctx, focus[0], focus[1], 70, '#f0a030', amber * (.4 + .4 * pulse));
  }

  // 放大镜：视网膜的几层
  const iA = ss(1.6, 2.8, lt), I = INSET;
  if (iA > 0) {
    ctx.save(); ctx.globalAlpha = iA;
    const spot = [E.x + E.r - 36, E.y - 40];
    line(ctx, [spot, [I.x - I.r * .7, I.y - I.r * .72]], 'rgba(42,36,29,.5)', 1.6); line(ctx, [spot, [I.x - I.r * .7, I.y + I.r * .72]], 'rgba(42,36,29,.5)', 1.6);
    stroke(ctx, circlePts(spot[0], spot[1], 22, 32), { w: 2, color: ink, jit: .4, taper: 0 });
    fillPath(ctx, circlePts(I.x, I.y, I.r, 120), '#fbf6ec');
    ctx.save(); ctx.beginPath(); circlePts(I.x, I.y, I.r, 120).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.clip();
    // 感光细胞（右边一排竖着的杆），一点点死去
    const die = ss(1.5, 6.5, lt);
    for (let k = 0; k < 13; k++) {
      const y = I.y - 230 + k * 36, alive = 1 - clamp(die * 1.4 - hash(k + 2) * .4);
      const x0 = I.x + 70, x1 = I.x + 230;
      if (alive > .02) {
        ctx.save(); ctx.globalAlpha *= alive;
        fillPath(ctx, [[x0, y - 9], [x1, y - 11], [x1, y + 11], [x0, y + 9]], '#c98a6a');
        line(ctx, [[x0, y - 9], [x1, y - 11], [x1, y + 11], [x0, y + 9], [x0, y - 9]], ink, 1.6);
        ctx.restore();
      }
      if (alive < .9) for (let j = 0; j < 4; j++) {   // 碎屑
        const fx = lerp(x0, x1, hash(k * 4 + j)), fy = y + (hash(k + j * 7) - .5) * 20 + (1 - alive) * 20 * hash(j);
        fillPath(ctx, circlePts(fx, fy, 2 + hash(j + k) * 3, 6), '#9a8a7a', (1 - alive) * .6);
      }
    }
    // 双极细胞
    for (let k = 0; k < 8; k++) { const y = I.y - 200 + k * 58; fillPath(ctx, ellipsePts(I.x - 20, y, 14, 18), '#cdbfa8'); line(ctx, ellipsePts(I.x - 20, y, 14, 18).concat([ellipsePts(I.x - 20, y, 14, 18)[0]]), ink, 1.4); }
    // 神经节细胞：幸存的，装上琥珀色的门
    const gate = ss(7.6, 10, lt);
    for (let k = 0; k < 6; k++) {
      const y = I.y - 190 + k * 76, x = I.x - 130;
      const fire = amber * Math.max(0, Math.sin(lt * 9 + k * 1.3)) ** 6;
      if (fire > .05) glow(ctx, x, y, 70, '#f0a030', fire * .8);
      fillPath(ctx, circlePts(x, y, 24, 24), mix('#d9c6a6', '#f6b04a', fire + gate * .2));
      line(ctx, circlePts(x, y, 24, 24), ink, 1.8);
      fillPath(ctx, circlePts(x - 4, y - 3, 7, 12), 'rgba(80,60,40,.5)');
      for (let j = 0; j < 8; j++) { const a = j / 8 * TAU + k; ctx.fillStyle = rgba('#e08a1e', gate); ctx.beginPath(); ctx.arc(x + Math.cos(a) * 25, y + Math.sin(a) * 25, 3.2, 0, TAU); ctx.fill(); }
      // 轴突往左通向视神经，信号沿它走
      const ax = [[x - 24, y], [x - 120, y + 4], [I.x - I.r - 10, y + 10]];
      line(ctx, ax, ink, 1.6, .7);
      if (fire > .1) { const [sx, sy] = along(ax, fract(lt * 2 + k * .3)); glow(ctx, sx, sy, 18, '#f0a030', fire); }
    }
    ctx.restore();
    stroke(ctx, circlePts(I.x, I.y, I.r, 120), { w: 3, color: ink, jit: .6, taper: 0, seed: 12 });
    ctx.restore();
  }
  const fadeL = 1 - ss(17.4, 18.3, lt);
  label(ctx, '视网膜', E.x + E.r - 60, E.y - 150, E.x + 170, E.y - 330, lt - 1.0, { alpha: fadeL });
  label(ctx, '感光细胞', INSET.x + 150, INSET.y + 200, INSET.x + 260, INSET.y + 300, lt - 2.6, { alpha: fadeL });
  label(ctx, '幸存的神经节细胞', INSET.x - 154, INSET.y + 190, INSET.x - 300, INSET.y + 330, lt - 7.8, { alpha: fadeL });
});

// ================= 07 他“看见”的 =================
const POV_EDGES = (() => {
  // 桌沿 + 透视的笔记本 + 两个玻璃杯
  const segs = [[[0, 760], [1920, 700]]];
  const nb = [[760, 560], [1180, 548], [1250, 760], [700, 776]];
  for (let i = 0; i < 4; i++) segs.push([nb[i], nb[(i + 1) % 4]]);
  segs.push([[735, 668], [1215, 654]]);
  for (const cx of [1440, 1560]) { segs.push([[cx - 40, 540], [cx - 32, 690]]); segs.push([[cx + 40, 540], [cx + 32, 690]]); segs.push([[cx - 40, 540], [cx + 40, 540]]); }
  return segs;
})();
function segDist(px, py, [[x0, y0], [x1, y1]]) {
  const dx = x1 - x0, dy = y1 - y0, k = clamp(((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - x0 - dx * k, py - y0 - dy * k);
}
const POV_DOTS = (() => {
  const out = [];
  for (let y = 380; y < 900; y += 20) for (let x = 300; x < 1720; x += 20) {
    let d = 1e9; for (const s of POV_EDGES) d = Math.min(d, segDist(x, y, s));
    if (d < 16) out.push([x, y, 1 - d / 16, hash(x * .13 + y * .71)]);
    else if (hash(x * .31 + y * .17) < .015) out.push([x, y, .25, hash(x + y)]);
  }
  return out;
})();
scene(S.pov, (ctx, lt, t) => {
  ctx.fillStyle = '#050403'; ctx.fillRect(0, 0, W, H);
  const rev = ss(.4, 4.5, lt);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, e, h] of POV_DOTS) {
    if (h > rev * 1.1) continue;
    const flick = .55 + .45 * Math.sin(t * (9 + h * 13) + h * 40);
    const a = e * flick * rev;
    ctx.fillStyle = rgba('#ffb24a', a * .9); ctx.beginPath(); ctx.arc(x, y, 3 + e * 3, 0, TAU); ctx.fill();
    if (e > .6) { ctx.fillStyle = rgba('#ff9a2a', a * .15); ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
  vignette(ctx, .9);
});

// ================= 片尾 =================
scene(S.end, (ctx, lt, t) => {
  waterBg(ctx, t, { light: .45, lightAt: [1500, 200], dim: .8 });
  const a = eo(prog(0, 2.5, lt));
  const x = lerp(900, 1120, lt / 14), y = lerp(800, 740, lt / 14);
  glow(ctx, 960, 620, 260, '#ffb24a', (1 - a) * .6);
  drawAlga(ctx, x, y, -.42 + Math.sin(lt * 2) * .05, lt, { scale: .62, alpha: a, lit: .4 });
  const k1 = win(1.0, 6.4, lt, .8);
  text(ctx, '从池塘里的一颗绿藻，到大脑的开关', W / 2, 400, { size: 64, font: SERIF, weight: 600, color: '#f1eadc', alpha: k1, spacing: 6, shadow: 'rgba(0,0,0,.6)' });
  const k2 = ss(7.0, 8.2, lt);
  text(ctx, '2026 年诺贝尔生理学或医学奖', W / 2, 250, { size: 40, font: SERIF, weight: 600, color: '#efe6d6', alpha: k2, spacing: 6 });
  [['Peter Hegemann', '柏林洪堡大学'], ['Georg Nagel', '维尔茨堡大学'], ['Karl Deisseroth', '斯坦福大学']].forEach(([n, u], i) => {
    const kk = ss(7.6 + i * .35, 8.6 + i * .35, lt), xx = W / 2 + (i - 1) * 470;
    text(ctx, n, xx, 380, { size: 42, color: '#f4eee3', alpha: kk, weight: 500 });
    text(ctx, u, xx, 428, { size: 24, color: '#b9b0a0', alpha: kk, spacing: 4 });
  });
  ctx.save(); ctx.globalAlpha = k2; ctx.fillStyle = '#6fa8ff'; ctx.fillRect(W / 2 - 120, 486, 240, 2); ctx.restore();
  text(ctx, '表彰他们发现光门控离子通道，开创光遗传学', W / 2, 540, { size: 26, color: '#cfc5b2', alpha: ss(9, 10, lt), spacing: 4 });
});

// ================= 接缝 =================
seam(S.membrane, 1.8, 'zoom', { c: t => eyespotAt(t), z: 11 });
seam(S.brain, 1.9, 'ripple', { c: [960, 700], color: '#ffcf8a' });
seam(S.fluor, 2.4, 'fade');
seam(S.mouse, 1.9, 'ripple', { c: [960, 420], color: '#7fb8ff' });
seam(S.eye, 2.0, 'sweep', { color: '#f0b25a', angle: -.35 });
seam(S.pov, 1.8, 'zoom', { c: [EYE.x - EYE.r + 58, EYE.y], z: 14 });
seam(S.end, 2.2, 'fade');

// ================= 字幕、章节 =================
THEME = [[0, S.membrane, 'dark'], [S.membrane, S.fluor, 'light'], [S.fluor, S.mouse, 'dark'], [S.mouse, S.pov, 'light'], [S.pov, TL.END, 'dark']];
CHAPTERS.push(
  [.5, 13.6, '01', '池塘里的绿藻'],
  [S.membrane + 1, S.brain - .6, '02', '一扇光控的门'],
  [S.brain + .8, S.fluor - .8, '03', '大脑的难题'],
  [S.fluor + 1, S.mouse - .8, '04', '把门装进神经元'],
  [S.mouse + .8, S.eye - .8, '05', '开灯，关灯'],
  [S.eye + 1, S.end - .8, '06', '让盲人看见光'],
);
{
  const m = S.membrane, b = S.brain, f = S.fluor, mo = S.mouse, e = S.eye, p = S.pov;
  CAPS.push(
    [1.5, 6.8, '池塘里有一种绿藻：整个身体只有一个细胞，没有眼睛'],
    [7.6, 13.4, '可只要有光，它就会掉头，朝着光游过去'],
    [m + 1.8, m + 6.6, '放大它身上那个橙红色的“眼点”'],
    [m + 7.0, m + 12.6, '旁边的细胞膜上，嵌着一种蛋白质：通道视紫红质'],
    [m + 13.4, m + 18.6, '蓝光一照，这扇“门”就打开，带正电的离子涌进细胞'],
    [m + 19.0, m + 22.6, '光一灭，门就关上'],
    [m + 23.0, m + 28.2, '2002 到 2003 年，Nagel 和 Hegemann 证明：这扇光控的门，单独就能工作'],
    [b + 1.0, b + 6.8, '再看大脑：八百多亿个神经元，靠电信号彼此说话'],
    [b + 9.8, b + 16.6, '过去用电极刺激，一扎下去，周围成片的细胞一起被点亮'],
    [b + 17.4, b + 23.2, '到底是哪一类细胞，在管哪一件事？很难分清'],
    [f + .8, f + 7.0, '2005 年，Deisseroth 团队把这扇门的基因，装进了哺乳动物的神经元'],
    [f + 7.6, f + 13.2, '用病毒当快递，只把基因送进想研究的那一类细胞'],
    [f + 13.8, f + 19.6, '蓝光一照，只有装了门的细胞放电，其他细胞纹丝不动'],
    [f + 20.2, f + 25.4, '想让它什么时候放电，就什么时候放，精确到毫秒'],
    [mo + .6, mo + 5.9, '在小鼠大脑里装上这扇门，再接一根细细的光纤'],
    [mo + 6.7, mo + 12.3, '开灯：它开始原地转圈'],
    [mo + 12.8, mo + 15.4, '关灯：一切照旧'],
    [mo + 15.9, mo + 23.4, '记忆、恐惧、成瘾……大脑里许多回路，就是这样一条条找出来的'],
    [e + .8, e + 6.4, '视网膜色素变性：负责感光的细胞一点点死去，人最终失明'],
    [e + 6.8, e + 12.6, '2021 年，研究团队把另一种光敏通道，装进患者视网膜里幸存的细胞'],
    [e + 13.0, e + 18.0, '再戴上特制眼镜，把看到的画面变成琥珀色光脉冲，打进眼底'],
    [p + .8, p + 5.6, '他能在桌上找到笔记本：39 次测试，摸到了 36 次'],
    [p + 6.0, p + 9.6, '这是光遗传学第一次让盲人部分恢复视觉'],
  );
}

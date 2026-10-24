// timeline.js：一镜到底。主角的走位 G(t)、红圈、墨点、两支笔、相机。
const LINE_L = [505, 700], LINE_R = [590, 702];
const HOPS = [LINE_R, [705, 758], [822, 806], [935, 852], [1030, 892]];
const OUT = [1345, 902];                          // 从墨团另一边钻出来的位置
const RC = [1345, 850];                           // 红圈圆心
const FREE = [1450, 1095];                        // 拆开红圈后站的地方
const TAILP = [1322, 935];                        // 红圈线头旁边
const BACK = [FREE, [1150, 985], [880, 860], [660, 740], LINE_R];

const lerp2 = (A, B, u) => [lerp(A[0], B[0], u), lerp(A[1], B[1], u)];
const dist = (A, B) => Math.hypot(A[0] - B[0], A[1] - B[1]);
function polyAt(P, u) { return along(P, u); }

// 走：位置匀速，两头缓一点；walk 相位按走过的路程算，脚步和位移对得上
function walkSeg(t, t0, t1, A, B) {
  const u = seg(t, t0, t1), p = lerp2(A, B, lerp(u, ease(u), .5)); return { p, walk: dist(A, p) / 11 };
}
function hopSeg(t, t0, t1, A, B, h = 70) {
  const u = seg(t, t0, t1), p = lerp2(A, B, ease(u));
  return { p, lift: Math.sin(Math.PI * u) * h, sq: u < .12 ? .25 * (1 - u / .12) : u > .9 ? .3 * Math.sin(Math.PI * (u - .9) / .1) : -.14 * Math.sin(Math.PI * u) };
}

// ---------- 主角 ----------
function G(t) {
  const P = { alive: 0, mouth: 'smile', arms: 'down', look: [0, 0] };
  let p = HOME, s = GS;
  if (t < 6) { P.draw = seg(t, .8, 4.6); }
  else if (t < 8.2) {
    P.alive = seg(t, 6, 6.15);
    P.blink = (t > 6.05 && t < 6.25) || (t > 7.35 && t < 7.48) ? 1 : 0;
    P.look = t < 6.6 ? [0, 0] : t < 7.1 ? [-1, -.2] : t < 7.6 ? [1, -.2] : [0, 0];
    P.sprout = spring(t, 7.6, 4, 22) * 3;
    P.sq = t > 7.85 ? .28 * Math.sin(Math.PI * seg(t, 7.85, 8.2)) : 0;
    P.shadow = seg(t, 7.6, 8.2);
  } else if (t < 11.4) {
    P.alive = 1;
    if (t < 8.75) { const h = hopSeg(t, 8.2, 8.75, HOME, [345, 680], 55); p = h.p; P.lift = h.lift; P.sq = h.sq; P.mouth = 'o'; }
    else { const w = walkSeg(t, 8.95, 11.2, [345, 680], LINE_L); p = w.p; if (t > 8.95 && t < 11.2) P.walk = w.walk; P.look = [.6, 0]; }
    P.sprout = Math.sin(t * 5) * .4;
    if (t > 11.1) { P.sq = .25 * Math.sin(Math.PI * seg(t, 11.1, 11.4)); P.look = [1, .3]; }
  } else if (t < 15.5) {
    P.alive = 1;
    if (t < 12.1) { const h = hopSeg(t, 11.4, 12.1, LINE_L, LINE_R, 110); p = h.p; P.lift = h.lift; P.sq = h.sq; P.mouth = h.lift > 40 ? 'grin' : 'smile'; P.arms = h.lift > 30 ? 'up' : 'down'; P.sprout = -h.lift / 60; }
    else {
      const k = Math.min(3, Math.floor((t - 12.25) / .8)), t0 = 12.25 + k * .8;
      if (t < 12.25) p = LINE_R; else { const h = hopSeg(t, t0, t0 + .66, HOPS[k], HOPS[k + 1], 46); p = h.p; P.lift = h.lift; P.sq = h.sq; P.sprout = -h.lift / 40; }
      P.mouth = 'grin'; P.look = [.7, .2];
    }
  } else if (t < 17.0) {
    P.alive = 1; p = HOPS[4];
    P.look = [1, .3]; P.mouth = 'o';
    if (t > 15.95 && t < 16.45) { P.arms = 'poke'; P.lean = .12 * Math.sin(Math.PI * seg(t, 15.95, 16.45)); }
    if (t > 16.55) { const u = seg(t, 16.55, 17.0); p = lerp2(HOPS[4], SCRIB, easeIn(u)); s = GS * (1 - easeIn(u)); P.sq = -.3 * u; P.lean = .5 * u; P.lift = Math.sin(Math.PI * u) * 40; P.blink = 1; }
  } else if (t < 18.35) { return null; }
  else if (t < 20.0) {
    P.alive = 1; P.smudge = t < 18.8 ? 1 : 1 - .75 * seg(t, 18.8, 19.5);
    if (t < 18.8) { const u = seg(t, 18.35, 18.8); p = lerp2([SCRIB[0] + 80, SCRIB[1] + 10], OUT, easeOut(u)); s = GS * lerp(.3, 1, backOut(u)); P.lift = Math.sin(Math.PI * u) * 70; P.blink = 1; P.mouth = 'flat'; }
    else { p = OUT; P.lean = Math.sin((t - 18.8) * 42) * .2 * (1 - seg(t, 19.2, 19.6)); P.blink = t < 19.5 ? 1 : 0; P.mouth = t < 19.5 ? 'flat' : 'grin'; P.sprout = Math.sin((t - 18.8) * 42) * 2 * (1 - seg(t, 19.2, 19.6)); }
    if (t > 19.6) P.wink = 1;
  } else if (t < 25.4) {
    P.alive = 1;
    if (t < 20.4) { p = OUT; P.mouth = 'grin'; P.wink = 1; }
    else if (t < 22.2) { p = lerp2(OUT, RC, ease(seg(t, 20.4, 20.9)) * .55); P.look = [.4, -1]; P.mouth = 'o'; P.sq = t > 20.9 && t < 21.2 ? .25 : 0; }
    else if (t < 23.25) {
      const A = lerp2(OUT, RC, .55), R = [RC[0] + 92, RC[1] + 38];
      const u = seg(t, 22.3, 22.75), back = seg(t, 22.75, 23.15);
      p = lerp2(lerp2(A, R, ease(u)), A, ease(back) * .5); P.arms = 'push'; P.look = [1, 0]; P.mouth = 'flat';
      P.sq = t > 22.7 && t < 22.9 ? -.2 : 0; P.lean = .15 * ease(u) * (1 - back);
    } else if (t < 23.6) {
      const A = lerp2(lerp2(OUT, RC, .55), [RC[0] + 92, RC[1] + 38], .5);
      p = lerp2(A, TAILP, ease(seg(t, 23.15, 23.55))); if (t < 23.55) P.walk = dist(A, p) / 11;
      P.look = [-.4, .6]; P.mouth = 'o';
    } else if (t < 24.65) {
      // 抓住线头往外走，红圈一圈圈被拆开
      p = lerp2(TAILP, FREE, lerp(seg(t, 23.7, 24.6), ease(seg(t, 23.7, 24.6)), .5)); if (t > 23.7 && t < 24.6) P.walk = dist(TAILP, p) / 11;
      P.lean = -.12; P.mouth = 'grin'; P.look = [-.5, -.2]; P.sq = t < 23.75 ? .15 : 0;
    } else { p = FREE; P.mouth = 'grin'; P.arms = t > 24.75 && t < 25.25 ? 'up' : 'down'; const h = hopSeg(t, 24.75, 25.15, FREE, FREE, 45); P.lift = h.lift; P.sq = h.sq; }
  } else if (t < 29.4) {
    P.alive = 1;
    if (t < 26.25) { p = FREE; P.look = [-1, -.6]; P.mouth = 'o'; P.bigEyes = t > 25.75; P.sq = t > 25.75 && t < 25.95 ? -.3 : 0; P.lift = t > 25.75 ? Math.sin(Math.PI * seg(t, 25.75, 26.05)) * 30 : 0; }
    else {
      const run = [...BACK, LINE_L, [400, 690]], u = seg(t, 26.3, 29.3);
      const k = clamp(u < .1 ? (u * u / .2) : u - .05, 0, 1) / .95;
      p = polyAt(run, clamp(k)); P.walk = k * 1500 / 11 * 1.3; P.lean = -.18; P.mouth = 'grin'; P.look = [-1, 0];
      const pl = lengths(run), tot = pl[pl.length - 1], hop0 = pl[BACK.length - 1] / tot, hop1 = pl[BACK.length] / tot;
      if (k > hop0 - .02 && k < hop1 + .02) { const hu = seg(k, hop0 - .02, hop1 + .02); P.lift = Math.sin(Math.PI * hu) * 80; P.walk = undefined; }
    }
  } else if (t < 30.6) {
    P.alive = 1;
    if (t < 29.85) { const u = seg(t, 29.3, 29.85); p = lerp2([400, 690], [HOME[0] + 16, HOME[1] - 8], ease(u)); P.lift = Math.sin(Math.PI * u) * 90; P.sq = -.2 * Math.sin(Math.PI * u); P.lean = lerp(-.18, .2, u); P.blink = 1; }
    else { const u = seg(t, 30.0, 30.4); p = lerp2([HOME[0] + 16, HOME[1] - 8], HOME, ease(u)); P.lean = .2 * (1 - ease(u)); P.sq = t < 30.0 ? .25 * (1 - seg(t, 29.85, 30.0)) : 0; P.blink = t < 30.0 ? 1 : 0; P.mouth = 'flat'; }
    P.shadow = 1 - seg(t, 30.35, 30.6); P.alive = 1 - seg(t, 30.45, 30.6);
  } else {
    p = HOME; P.alive = 0;
    if (t > 34.15 && t < 34.75) { P.wink = 1; P.alive = .001; P.shadow = 0; }
  }
  return { p, s, P };
}

// ---------- 脚印：按 G 预先算好，出现时间之后一直留在纸上 ----------
let FOOT = null;
function footprints() {
  if (FOOT) return FOOT;
  FOOT = []; let lastStep = null, lastLift = 0;
  for (let t = 8.2; t < 29.9; t += 1 / 48) {
    const g = G(t); if (!g || g.s < GS * .8) { lastStep = null; continue; }
    const lift = g.P.lift || 0;
    if (g.P.walk != null) { const st = Math.floor(g.P.walk / Math.PI); if (lastStep !== null && st !== lastStep) FOOT.push({ t, x: g.p[0] + (st % 2 ? 14 : -14), y: g.p[1] + 4 }); lastStep = st; }
    else lastStep = null;
    if (lastLift > 3 && lift <= 3) { FOOT.push({ t, x: g.p[0] - 13, y: g.p[1] + 4 }); FOOT.push({ t, x: g.p[0] + 13, y: g.p[1] + 4 }); }
    lastLift = lift;
  }
  return FOOT;
}

// ---------- 甩下来的墨点 ----------
const DROPS = [...Array(7)].map((_, i) => {
  const a = -2.6 + i * .78 + hash(i) * .3, d = 120 + hash(i + 9) * 90;
  return { a, d, t0: 18.85 + i * .07, r: 4 + hash(i + 4) * 6 };
});
function drops(c, t) {
  for (const [i, D] of DROPS.entries()) {
    if (t < D.t0) continue;
    const u = seg(t, D.t0, D.t0 + .35), sx = OUT[0] + Math.cos(D.a) * 30, sy = OUT[1] - 70 + Math.sin(D.a) * 30;
    const ex = OUT[0] + Math.cos(D.a) * D.d, ey = OUT[1] - 20 + Math.sin(D.a) * D.d * .6;
    const x = lerp(sx, ex, u), y = lerp(sy, ey, u) - Math.sin(Math.PI * u) * 50;
    if (u < 1) bpFill(c, x, y, D.r * .8, D.r * 1.1, { col: INK.black, seed: 500 + i });
    else { bpFill(c, ex, ey, D.r * 1.3, D.r * 1.0, { col: INK.black, seed: 510 + i, a: .85 }); bpFill(c, ex + D.r * 1.6, ey + 3, D.r * .4, D.r * .35, { col: INK.black, seed: 520 + i }); }
  }
}

// ---------- 红圈 ----------
const CA0 = 1.2;
const CIRCLE = (() => { const P = []; for (let i = 0; i <= 40; i++) { const a = CA0 + i / 40 * (TAU + .55); P.push([Math.cos(a) * (150 + 7 * Math.sin(3 * a)), Math.sin(a) * (122 + 6 * Math.cos(2 * a))]); } return P; })();
const CIRC_W = through(CIRCLE, 3).map(([x, y]) => [RC[0] + x, RC[1] + y]), CIRC_L = (L => L[L.length - 1])(lengths(CIRC_W));
const handOf = t => { const g = G(t); return [g.p[0] - g.s * .95, g.p[1] - (g.P.lift || 0) - g.s * .5]; };
function redCircle(c, t) {
  const k = seg(t, 20.85, 22.05); if (k <= 0) return null;
  const push = t > 22.55 && t < 23.1 ? 12 * Math.sin(Math.PI * seg(t, 22.55, 23.1)) : 0;
  // 拆开的长度：线头跟着手走
  const E = CIRC_W[CIRC_W.length - 1], tr = Math.min(t, 24.6), H = t > 23.65 ? handOf(tr) : E;
  const ul = t > 23.65 ? clamp((dist(E, H) - 10) * 1.15, 0, CIRC_L * .7) : 0, keep = 1 - ul / CIRC_L;
  c.save(); c.translate(push, 0);
  const tip = bp(c, CIRC_W, { col: INK.red, w: 3.6, seed: 601, reveal: Math.min(k, keep), n: 1, smooth: false });
  c.restore();
  if (ul > 2) {
    const Q = along(CIRC_W, keep), fall = t > 24.6 ? spring(t, 24.6, 5, 16) : 0, end = t > 24.6 ? [H[0] - 6, H[1] + 40 * ease(seg(t, 24.6, 24.85))] : H;
    const n = 9, d = dist(Q, end), nx = -(end[1] - Q[1]) / Math.max(1, d), ny = (end[0] - Q[0]) / Math.max(1, d), pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n, w = Math.sin(u * Math.PI) * (14 + 30 * fall) * Math.sin(u * 9 + 1) + Math.sin(u * Math.PI) * 22; pts.push([lerp(Q[0], end[0], u) + nx * w, lerp(Q[1], end[1], u) + ny * w]); }
    bp(c, pts, { col: INK.red, w: 3.6, seed: 602, gob: false });
  }
  return tip;
}

// ---------- 小花（最后蓝笔添的） ----------
const FL = [418, 668];
const FLOWER = (() => {
  const S = [[[FL[0], FL[1]], [FL[0] + 5, FL[1] - 40], [FL[0] + 3, FL[1] - 78]]];
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i / 5 * TAU, cx = FL[0] + 3 + Math.cos(a) * 17, cy = FL[1] - 96 + Math.sin(a) * 17; S.push([...ell(cx, cy, 12, 9, 9, a), [cx + Math.cos(a) * 12, cy + Math.sin(a) * 12]]); }
  S.push([[FL[0] + 4, FL[1] - 34], [FL[0] + 26, FL[1] - 50], [FL[0] + 34, FL[1] - 40], [FL[0] + 6, FL[1] - 28]]);
  return S;
})();
function flower(c, k) {
  if (k <= 0) return null; let tip = null; const n = FLOWER.length;
  FLOWER.forEach((P, i) => { const r = clamp(k * n - i); if (r > 0) tip = bp(c, P, { col: INK.blue, w: 2.6, seed: 700 + i, reveal: r }) || tip; });
  return tip;
}

// ---------- 笔：笔尖跟着正在画的线走，取最近几个时刻的平均，换笔画时自然抬一下 ----------
let DUMMY = null;
function drawTipAt(t) {
  if (!DUMMY) { const cv = document.createElement('canvas'); cv.width = cv.height = 4; DUMMY = cv.getContext('2d'); }
  if (t < 4.7) { const dr = seg(t, .8, 4.6); if (dr <= 0 || dr >= 1) return null; return guy(DUMMY, HOME[0], HOME[1], GS, { draw: dr }); }
  if (t > 31.0 && t < 32.9) return flower(DUMMY, seg(t, 31.1, 32.8));
  return null;
}
function penFollow(t) {
  const S = []; for (let i = 0; i < 5; i++) { const p = drawTipAt(t - i * .035); if (p) S.push(p); }
  if (!S.length) return null;
  const m = [S.reduce((a, p) => a + p[0], 0) / S.length, S.reduce((a, p) => a + p[1], 0) / S.length];
  return { p: m, lift: clamp(dist(m, S[0]) / 70) * .5 };
}
function bluePen(c, t) {
  const park = [HOME[0] + 340, HOME[1] - 270], off = [HOME[0] + 1100, HOME[1] - 1200];
  let p = null, lift = 0;
  if (t < .8) { const u = ease(seg(t, 0, .8)); p = lerp2(off, [HOME[0] - 60, HOME[1] - 120], u); lift = 1 - u; }
  else if (t < 4.7) { const f = penFollow(t); if (f) { p = f.p; lift = f.lift; } else { p = [HOME[0] + 40, HOME[1] - 80]; lift = .3; } }
  else if (t < 5.7) { const u = easeIn(seg(t, 4.7, 5.7)); const f0 = [HOME[0] + 70, HOME[1] - 180]; p = lerp2(f0, off, u); lift = lerp(.2, 1.4, u); }
  else if (t > 25.3 && t < 31.1) {
    // 回来了：先从高处飘进来，在原位上方盘旋，主角一落定就落笔
    const u = ease(seg(t, 25.3, 27.0)); p = lerp2(off, park, u); lift = lerp(2.2, 1.0, u);
    if (t > 27) { p = [park[0] + Math.sin((t - 27) * 1.3) * 30, park[1] + (t - 27) * 40]; lift = 1 - .1 * (t - 27); }
    if (t > 30.5) { const v = ease(seg(t, 30.5, 31.1)); p = lerp2(p, FL, v); lift = lerp(lift, 0, v); }
  } else if (t >= 31.1 && t < 33.0) { const f = penFollow(t); p = f ? f.p : [FL[0] + 3, FL[1] - 96]; lift = f ? f.lift : .1; }
  else if (t >= 33.0 && t < 34.2) { const u = easeIn(seg(t, 33.0, 34.2)); p = lerp2([FL[0] + 20, FL[1] - 110], off, u); lift = lerp(.1, 1.6, u); }
  if (p) realPen(c, p[0], p[1], { lift, ang: -.95 });
}
function redPen(c, t, tip) {
  const off = [RC[0] + 900, RC[1] - 1000], start = CIRC_W[0];
  let p = null, lift = 0;
  if (t > 20.0 && t < 20.85) { const u = ease(seg(t, 20.0, 20.85)); p = lerp2(off, start, u); lift = 1.4 * (1 - u); }
  else if (t >= 20.85 && t < 22.05) { p = tip || start; lift = 0; }
  else if (t >= 22.05 && t < 23.0) { const u = easeIn(seg(t, 22.05, 23.0)); p = lerp2(tip || start, off, u); lift = 1.4 * u; }
  if (p) realPen(c, p[0], p[1], { lift, ang: -.8, grip: '#b23a32', cap: '#a8322c', ink: INK.red });
}

// ---------- 相机 ----------
const CAM = [
  [0, 360, 585, 1.95], [5.0, 345, 600, 2.0], [8.2, 380, 610, 1.85], [11.2, 520, 660, 1.72], [12.6, 650, 710, 1.66],
  [15.4, 1060, 840, 1.68], [17.2, 1190, 860, 1.72], [19.8, 1310, 870, 1.62], [21.2, 1350, 830, 1.52], [23.5, 1370, 930, 1.5],
  [25.0, 1400, 980, 1.5], [26.4, 1120, 860, 1.3], [28.2, 700, 700, 1.32], [29.6, 430, 630, 1.55], [31.0, 380, 610, 1.82],
  [34.4, 370, 610, 1.86], [37.6, 960, 760, .6], [38, 960, 760, .6],
];
function camAt(t) {
  let i = 0; while (i + 1 < CAM.length - 1 && t >= CAM[i + 1][0]) i++;
  const g = j => CAM[clamp(j, 0, CAM.length - 1)], u = ease(seg(t, CAM[i][0], CAM[i + 1][0]));
  const [p0, p1, p2, p3] = [g(i - 1), g(i), g(i + 1), g(i + 2)];
  return [1, 2, 3].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u * u + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u * u * u));
}
function FADE(t) { return 1 - seg(t, 0, .7) + seg(t, 37.0, 38); }

// ---------- 记号 ----------
function question(c, x, y, s, k, seed = 800) {
  if (k <= 0) return; const sc = backOut(k);
  c.save(); c.translate(x, y); c.scale(sc, sc);
  bp(c, [[-s * .25, -s * .7], [-s * .1, -s * .95], [s * .2, -s * .9], [s * .25, -s * .6], [0, -s * .38], [0, -s * .15]], { col: INK.blue, w: 3, seed });
  bpFill(c, 0, s * .05, s * .06, s * .06, { col: INK.blue, seed: seed + 1 });
  c.restore();
}
function speedLines(c, x, y, s, t) {
  for (let i = 0; i < 3; i++) { const yy = y - s * (.5 + i * .45), l = s * (.6 + hash(i + BOILN) * .5); bp(c, [[x + s * 1.2, yy], [x + s * 1.2 + l * .5, yy + 1], [x + s * 1.2 + l, yy]], { col: INK.blue, w: 2.2, seed: 900 + i + BOILN, a: .7 }); }
}

shots([[0, (t) => {
  const [cx, cy, z] = camAt(t);
  camera(cx, cy, z);
  drawDeskAndPage();
  // 纸上留下的痕迹
  if (t > 8.2 && t < 30.4) guy(X, HOME[0], HOME[1], GS, { ghost: seg(t, 8.2, 8.6) });
  for (const f of footprints()) if (f.t <= t) bpFill(X, f.x, f.y, 3.4, 2.8, { col: INK.blue, seed: 1000 + Math.round(f.x), a: .55 });
  const shake = t > 16.95 && t < 18.4 ? 1 - seg(t, 18.0, 18.4) * .8 : t > 16.15 && t < 16.4 ? .3 : 0;
  scribble(X, 1, shake);
  drops(X, t);
  const redTip = redCircle(X, t);
  const flTip = flower(X, seg(t, 31.1, 32.8));
  // 主角
  const g = G(t);
  if (g) {
    const { p, s, P } = g;
    if (s > 1) guy(X, p[0], p[1], s, P);
    const top = p[1] - (P.lift || 0) - s * 2.6;
    if (t > 15.6 && t < 16.5) question(X, p[0] + s * .9, top + s * .3, s * .7, seg(t, 15.6, 15.85));
    if (t > 20.9 && t < 21.7) bang(X, p[0] + s * .8, top + s * .4, s * .8, seg(t, 20.9, 21.1), INK.red, 820);
    if (t > 25.75 && t < 26.6) { bang(X, p[0] + s * .85, top + s * .3, s * .9, seg(t, 25.75, 25.9), INK.red, 830); sweat(X, p[0] - s * .95, top + s * .9, s * .22); }
    if (t > 26.5 && t < 29.2) speedLines(X, p[0], p[1] - (P.lift || 0), s, t);
  }
  bluePen(X, t);
  redPen(X, t, redTip);
}]]);

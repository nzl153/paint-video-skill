// ink.js: 《落款》。白纸上一个小红块，一滴墨落成山，走出芦苇和河，踩竹叶渡河，上岸坐下，成了整幅画的印。
//   A 0–4.0    落墨：地平线一笔扫出 → 墨滴落在身后晕成远山 → 吃惊、出发
//   B 4.0–8.0  行：每步撇出一丛芦苇 → 前方飞白横成大河 → 河边急停
//   C 8.0–12.0 渡：竹叶飘落河面 → 跳上去 → 顺流漂向对岸（对岸石头随之画出）
//   D 12.0–16.8 落款：跳上石头坐下 → 以它为中心拉远，整幅画和装裱露出来 → 眨眼 → 墨退回白纸，只剩一点红
// 不变的约束：Clawd 钉在画面同一点（S0），走路时世界往后退；拉远时这一点缓缓移到画幅右下角的落款位置。
(() => {
  Object.assign(PAL, { paper: '#f7f2e6', cream: '#faf7f0', ink: '#2e2a24', clay: '#bb5f3c', clayDk: '#8f4428', clayLt: '#d98a6c' });
  const INK = PAL.ink, MID = mixCol(INK, PAL.paper, .5), PALE = mixCol(INK, PAL.paper, .78), MOUNT = '#e2d7c1';
  const fade = (c, k) => mixCol(PAL.paper, c, clamp(k));          // k = 0 纸色，1 原色

  const GY = 800, WY = 816, U = 24;
  const S0 = [1250, 780], SF = [1436, 860], ZF = .4;              // Clawd 在屏幕上的固定点；拉远后的落款点
  const BANK = 1540, XSIT = 2230;
  const PAINT = [-360, -900, 2440, 900];                           // 整幅画的范围（世界坐标）

  // ---------- Clawd 和竹叶的路线 ----------
  const WALK = [4.2, 6.9], X0 = 1000, X1 = 1470;
  const LAND = 9.0, J1 = [9.85, 10.4], DRIFT = [10.6, 12.0], LEAF0 = 1640, LEAF1 = 1960, J2 = [12.15, 12.6];
  const leafX = t => t < DRIFT[0] ? LEAF0 : lerp(LEAF0, LEAF1, ease(seg(t, DRIFT[0], DRIFT[1]))) + 50 * ease(seg(t, J2[1], 15));
  function leafPose(t) {
    if (t < LAND) {
      const k = seg(t, 7.95, LAND), sw = Math.sin(k * Math.PI * 2.3) * (1 - k);
      return { x: LEAF0 + 170 * sw, y: lerp(-120, WY - 4, Math.pow(k, 1.15)), rot: .55 * Math.cos(k * Math.PI * 2.3) * (1 - k) };
    }
    const bob = 5 * spring(t, LAND, 4, 10) + 9 * spring(t, J1[1], 5, 12) + 5 * spring(t, J2[0], 5, 12) + 2 * wob(t, .5);
    return { x: leafX(t), y: WY - 4 + bob, rot: .012 * wob(t, .45) + .03 * spring(t, J1[1], 5, 12) };
  }
  const leafTop = p => p.y - 44;
  function clawdX(t) {
    if (t < J1[0]) return lerp(X0, X1, ease(seg(t, WALK[0], WALK[1])));
    if (t < J1[1]) return lerp(X1, LEAF0, seg(t, J1[0], J1[1]));
    if (t < J2[0]) return leafX(t);
    return lerp(LEAF1, XSIT, seg(t, J2[0], J2[1]));
  }

  // ---------- 镜头：Clawd 钉在 S0，拉远时移到 SF ----------
  const PULL = [13.0, 14.6];
  function cam(t) {
    const fx = clawdX(t), k = ease(seg(t, PULL[0], PULL[1]));
    const z0 = lerp(1, 1.06, ease(seg(t, 0, 4)));
    const Z = Math.exp(lerp(Math.log(z0), Math.log(ZF), k));
    const sx = lerp(S0[0], SF[0], k), sy = lerp(S0[1], SF[1], k);
    let cx = fx - (sx - 960) / Z, cy = GY - (sy - 540) / Z;
    if (t > 2.0 && t < 2.5) { const [dx, dy] = shakeXY(t, 7 * Math.exp(-(t - 2) * 9)); cx += dx; cy += dy; }
    return { fx, Z, cx, cy };
  }
  const par = (fx, f) => (fx - X0) * (1 - f);                      // 视差：f = 1 跟着地面走，越远越慢

  // ---------- 墨晕：每个点从落点出发，按距离先后铺开 ----------
  function bloom(P, c, t, t0, v, dur) {
    let any = 0;
    const Q = P.map(p => {
      const d = Math.hypot(p[0] - c[0], p[1] - c[1]), k = easeOut(seg(t, t0 + d / v, t0 + d / v + dur));
      any = Math.max(any, k);
      return [c[0] + (p[0] - c[0]) * Math.max(k, .02), c[1] + (p[1] - c[1]) * Math.max(k, .02)];
    });
    return any > .02 ? Q : null;
  }
  function ridge(x0, x1, base, peaks, n, sk) {
    const top = [];
    for (let i = 0; i <= n; i++) {
      const x = lerp(x0, x1, i / n);
      let h = 0; for (const [px, ph, pw] of peaks) h = Math.max(h, ph * Math.exp(-(((x - px) / pw) ** 2)));
      top.push([x, base - Math.max(0, h + 22 * (hash(i + sk) - .5))]);
    }
    return top;
  }
  const HIT = [560, 610], DROP = [1.25, 2.0];
  const FAR = ridge(-1300, 2600, 790, [[300, 1250, 380], [-600, 950, 420], [1150, 700, 330], [-1100, 680, 300], [760, 820, 300], [-250, 760, 260], [1900, 560, 320], [2400, 420, 260]], 80, 11);
  const MIDR = ridge(-900, 1150, 796, [[420, 400, 210], [820, 300, 190], [-150, 240, 220], [-600, 340, 210], [1060, 170, 140], [150, 200, 160]], 50, 37);
  const shift = (P, dx) => P.map(p => [p[0] + dx, p[1]]);

  function mountains(t, fx) {
    const far = bloom([...FAR, [2600, 796], [-1300, 796]], HIT, t, 2.25, 1600, .9);
    if (far) {
      const dx = par(fx, .3), top = shift(far.slice(0, FAR.length), dx);
      boilSeed('far'); paint(shift(far, dx), { wash: mixCol(PALE, PAL.paper, .35), washOp: 255, fill: PALE, fillOp: 80, bleed: .3, tex: .8, ink: null });
      boilSeed('cap');                                              // 山头墨重，往下淡进雾里
      paint([...top, ...top.map((p, i) => [p[0], Math.min(785, p[1] + 130 + 80 * hash(i + 71))]).reverse()], { wash: PALE, washOp: 150, fill: MID, fillOp: 60, bleed: .35, tex: .8, ink: null });
    }
    boilSeed('mist');
    for (let i = 0; i < 4; i++) paint(ellPts(-900 + i * 700 + par(fx, .45), 792, 420, 46, 20, 6), { wash: PAL.paper, washOp: 160, ink: null });
    const mid = bloom([...MIDR, [1150, 800], [-900, 800]], HIT, t, 2.0, 1400, .7);
    if (mid) {
      const dx = par(fx, .6);
      boilSeed('mid'); paint(shift(mid, dx), { wash: mixCol(MID, PALE, .55), washOp: 255, fill: MID, fillOp: 80, bleed: .25, tex: .85, ink: null });
      const T = shift(mid.slice(0, MIDR.length), dx);
      boilSeed('mcap'); paint([...T, ...T.map((p, i) => [p[0], Math.min(792, p[1] + 90 + 50 * hash(i + 91))]).reverse()], { wash: MID, washOp: 160, fill: INK, fillOp: 60, bleed: .3, tex: .85, ink: null });
      const top = shift(mid.slice(0, MIDR.length), dx);
      for (let s = 0; s < top.length - 1; s += 12) { const seg2 = top.slice(s + 2, s + 9); if (seg2.length < 3) continue; boilSeed('ridge' + s); inkLine(seg2, .9, mixCol(INK, MID, .4), 'dry', .4); }
    }
    boilSeed('mist2');
    for (let i = 0; i < 3; i++) paint(ellPts(-500 + i * 800 + par(fx, .7), 806, 380, 30, 18, 5), { wash: PAL.paper, washOp: 140, ink: null });
    // 墨滴：先落下，砸在纸上变成一团浓墨，再被晕开的山吃进去
    if (t > DROP[0] && t < DROP[1]) {
      const k = Math.pow(seg(t, DROP[0], DROP[1]), 1.7), y = lerp(-80, HIT[1], k), st = 1 + .9 * k;
      boilSeed('drop');
      const P = []; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = 58 * (1 + .9 * Math.max(0, -Math.sin(a)) ** 3); P.push([HIT[0] + r * Math.cos(a) / Math.sqrt(st), y + r * Math.sin(a) * st * (Math.sin(a) < 0 ? 1.4 : 1)]); }
      paint(P, { wash: INK, ink: null });
    }
    if (t >= DROP[1] && t < 3.2) {
      const a = t - DROP[1];
      boilSeed('splat');
      const g = easeOut(seg(a, 0, .35)); paint(ellPts(HIT[0], HIT[1], 50 + 120 * g, 30 + 60 * g, 24, 10), { wash: INK, washOp: 255 * (1 - seg(a, .2, 1.1)), ink: null });
    }
  }

  // ---------- 地面：一笔干墨，随 Clawd 往前延伸 ----------
  const groundEnd = t => t < 4 ? lerp(-300, 1400, easeOut(seg(t, .15, .9))) : Math.min(BANK, Math.max(1400, clawdX(t) + 300));
  const gy = x => GY + 3 * Math.sin(x / 170);
  function ground(t) {
    const e = groundEnd(t); if (e < -290) return;
    
    for (let x = -300; x < e; x += 520) {
      const x2 = Math.min(e, x + 540), P = []; for (let i = 0; i <= 8; i++) { const xx = lerp(x, x2, i / 8); P.push([xx, gy(xx)]); }
      boilSeed('gl' + x); inkLine(P.slice(0, 7 + (hash(x + 3) > .5 ? 2 : 0)), 1.2 + .8 * hash(x + 1), INK, 'dry', .3);
      if (hash(x) > .35) { boilSeed('gl2' + x); inkLine([[x + 60, GY + 12], [lerp(x + 60, x2, .3), GY + 15], [lerp(x + 60, x2, .6), GY + 13]], 1.1, MID, 'dry', .3); }
    }
    if (e >= BANK - 1) { boilSeed('bank'); inkLine([[BANK - 30, gy(BANK - 30)], [BANK, GY + 6], [BANK + 8, WY + 26]], 1.4, INK, 'dry', .6); }
    for (let i = 0; i < 14; i++) {
      const x = -250 + i * 125 + 60 * hash(i + 5); if (x > e - 20) continue;
      boilSeed('dot' + i); paint(ellPts(x, GY - 6 - 8 * hash(i + 9), 5 + 4 * hash(i), 4 + 3 * hash(i + 2), 8, 1), { wash: INK, ink: null });
    }
  }

  // ---------- 芦苇：每一步撇出一丛 ----------
  const STEPS = [4.5, 5.25, 6.0];
  function reeds(t) {
    STEPS.forEach((ts, c) => {
      if (t < ts) return;
      const bx = clawdX(ts) - 24;
      for (let j = 0; j < 6; j++) {
        const g = easeOut(seg(t, ts + j * .045, ts + j * .045 + .35)); if (g < .02) continue;
        const a = (hash(c * 10 + j) - .5) * .9, L = 150 + 130 * hash(c * 10 + j + 3), sway = 7 * wob(t, .35, hash(j + c));
        const x0 = bx + (j - 2.5) * 9, P = [];
        for (let i = 0; i <= 6; i++) { const s = g * i / 6; P.push([x0 + Math.sin(a) * L * s + (sway + 30 * a) * s * s, GY - Math.cos(a) * L * s]); }
        boilSeed('reed' + c + j); inkLine(P, 1.2 + 1.2 * hash(j + c * 3), j % 2 ? MID : INK, 'ink', .5);
        if (j % 3 === 0 && g > .9) { const tp = P[6]; boilSeed('ear' + c + j); inkLine([tp, [tp[0] + 14 + sway * .4, tp[1] - 26]], 2.4, MID, 'dry', .5); }
      }
    });
  }

  // ---------- 河：一笔飞白横扫出去 ----------
  const sweep = t => lerp(BANK, 2900, easeOut(seg(t, 6.3, 7.1)));
  function river(t) {
    if (t < 6.3) return;
    const e = sweep(t);
    const wp = []; for (let i = 0; i <= 20; i++) { const x = lerp(BANK, e, i / 20); wp.push([x, WY - 2 + 5 * Math.sin(x / 90)]); }
    for (let i = 20; i >= 0; i--) { const x = lerp(BANK, e, i / 20); wp.push([x, WY + 95 + 18 * Math.sin(x / 130 + 1) + 14 * hash(i + 3)]); }
    boilSeed('water'); paint(wp, { wash: mixCol(PALE, PAL.paper, .3), washOp: 255, fill: MID, fillOp: 60, bleed: .25, tex: .8, ink: null });
    [[0, 3, MID, 0], [30, 1.6, MID, 60], [58, 2.2, PALE, 140], [86, 1.2, MID, 30]].forEach(([dy, sw, col, off], i) => {
      const x0 = BANK + 10 + off, x1 = Math.min(e, 2900 - i * 90);
      for (let x = x0; x < x1 - 40; x += 600) { const xe = Math.min(x1, x + 620), P = []; for (let j = 0; j <= 5; j++) { const xx = lerp(x, xe, j / 5); P.push([xx, WY + dy + 3 * Math.sin(xx / 70 + i)]); } boilSeed('wl' + i + x); inkLine(P, sw, col, 'dry', .4); }
    });
  }
  function ripples(t, lp) {
    [LAND, LAND + .2, J1[1]].forEach((t0, i) => {
      const a = t - t0; if (a < 0 || a > 1.4) return;
      const rx = 60 + 250 * easeOut(a / 1.4);
      boilSeed('rip' + i); inkLine(ellPts(i < 2 ? LEAF0 : lp.x, WY + 4, rx, rx * .1, 30), 1, fade(MID, 1 - a / 1.4), 'inkfine', .5);
    });
    const v = clamp((leafX(t) - leafX(t - .1)) / 30);
    if (v > .05) for (let i = 0; i < 3; i++) { boilSeed('wake' + i); inkLine([[lp.x - 230 - i * 70, WY + 8 + i * 9], [lp.x - 190 - i * 70, WY + 10 + i * 9], [lp.x - 150 - i * 70, WY + 8 + i * 9], [lp.x - 110 - i * 70, WY + 10 + i * 9]], 1.2, fade(MID, v), 'inkfine', .4); }
  }

  // ---------- 竹叶：一笔浓墨，比 Clawd 还大 ----------
  function leaf(p) {
    boilSeed('leaf');
    push(); translate(p.x, p.y); rotate(p.rot);
    const L = 390, top = [], bot = [], rib = [];
    for (let i = 0; i <= 18; i++) {
      const s = i / 18, sp = Math.pow(s, .8), w = 28 * Math.pow(Math.sin(Math.PI * sp), .85), x = (s - .5) * L, b = -18 * Math.sin(Math.PI * s);
      top.push([x, b - w]); bot.push([x, b + w * .8]); rib.push([x, b]);
    }
    paint([...top, ...bot.reverse()], { wash: mixCol(INK, PAL.paper, .12), ink: INK, sw: .7 });
    inkLine(rib.slice(1, 17), .8, mixCol(INK, PAL.paper, .6), 'inkfine', .5);
    pop();
  }

  // ---------- 对岸的石头：Clawd 靠近时才画出来 ----------
  const ROCKP = [[2105, 905], [2112, 858], [2140, 818], [2190, 801], [2250, 797], [2302, 806], [2338, 846], [2352, 905]];
  function rock(t) {
    const R = bloom(ROCKP, [2230, 870], t, 11.2, 900, .5); if (!R) return;
    boilSeed('rock'); paint(R, { wash: MID, washOp: 255, fill: INK, fillOp: 80, bleed: .2, tex: .85, ink: null });
    const k = seg(t, 11.55, 11.95);
    if (k > 0) {
      boilSeed('rockl'); inkLine(R.slice(1, 6), 1.8, fade(INK, k), 'dry', .5);
      boilSeed('rockr'); inkLine([[2300, 830], [2318, 868], [2322, 900]], 1.2, fade(INK, k), 'dry', .4);
      for (let i = 0; i < 3; i++) { boilSeed('rdot' + i); paint(ellPts(2150 + i * 70, 812 - 6 * hash(i), 5, 4, 8, 1), { wash: fade(INK, k), ink: null }); }
    }
  }

  // ---------- Clawd ----------
  const KEYS = [
    [0, 'neutral', { lookX: .7 }], [.95, 'confused', { lookX: -.3 }],
    [2.1, 'surprised', { lookX: -1, lookY: -.3 }], [2.8, 'starstruck', { lookX: -1, lookY: -.5, emote: null }],
    [3.5, 'determined', { emote: null }], [7.0, 'nervous', { lookX: .6, lookY: .9 }],
    [8.25, 'hopeful', { emote: null }], [9.3, 'idea', { emote: null }], [10.45, 'happy', { emote: null }],
    [12.7, 'relieved', { emote: null }], [13.5, 'neutral', { emote: null }]
  ];
  function clawdPose(t) {
    const mood = emotions(t, KEYS, { take: .8 });
    const x = clawdX(t);
    let y = GY + 4, pose = {}, dy = mood.dy || 0, sq = mood.sq || 0;
    if (t < 3.5) pose = t < 2.2 ? {} : turn(t, 2.2, 2.4, 0, -.12);
    else if (t < 8.1) {
      pose = t < 3.8 ? turn(t, 3.5, 3.75, -.12, .25) : { view: 'side' };
      const moving = t > WALK[0] && t < WALK[1], d = Math.abs(x - X0) / (4 * U);
      if (moving) { pose.walk = d; dy += -Math.abs(Math.sin(d * Math.PI)) * .5; dy *= .6; }
      pose.rot = .2 * spring(t, 6.95, 4, 11);
      pose.aL = .2 + 1.3 * spring(t, 6.95, 4, 14); pose.aR = -.1 - 1.1 * spring(t, 7.0, 4, 13);
    } else if (t < J2[1]) {
      pose = t < 8.4 ? turn(t, 8.1, 8.3, .25, .12) : { view: 'q' };
      const lp = leafPose(t);
      if (t < 9.4) { pose.lookX = clamp((lp.x - x) / 260, -1, 1); pose.lookY = clamp((lp.y - (y - 6 * U)) / 260, -1, 1); }
      if (t >= J1[0] && t < J2[0]) {
        const base = t < J1[1] ? lerp(GY + 4, leafTop(leafPose(J1[1])), seg(t, J1[0], J1[1])) : leafTop(lp);
        y = base; if (t >= J1[1]) pose.rot = lp.rot;
      }
      if (t >= J2[0]) y = lerp(leafTop(lp), GY, seg(t, J2[0], J2[1]));
      const h = jump(t, J1[0], J1[1], 3.2), h2 = jump(t, J2[0], J2[1], 2.4);
      dy = dy * .5 + h.dy + h2.dy; sq = sq * .5 + h.sq + h2.sq;
    } else {
      pose = t < 12.9 ? turn(t, 12.65, 12.85, .12, 0) : {};
      y = GY;
      const sit = seg(t, 12.75, 12.95);
      sq += .25 * Math.sin(Math.PI * sit);
      if (t > 12.85) { pose.noLegs = true; pose.noShadow = true; dy = 2 + dy * .3; }
      if (t > 13.5) { pose.lookX = 0; pose.lookY = 0; }
      if (t > 15.0 && t < 15.5) pose.eyes = 'wink';
    }
    return [x, y, { ...mood, ...pose, dy, sq }];
  }

  // ---------- 整帧 ----------
  function world(t) {
    const c = cam(t);
    camBegin(c.cx, c.cy, c.Z);
    mountains(t, c.fx);
    ground(t);
    river(t);
    reeds(t);
    rock(t);
    const lp = leafPose(t);
    if (t > 7.95) { ripples(t, lp); leaf(lp); }
    const [x, y, o] = clawdPose(t);
    clawd(x, y, U, o);
    const km = ease(seg(t, 13.7, 14.6));
    if (km > 0) {                                                  // 装裱：画幅以外慢慢铺上绫边
      const [x0, y0, x1, y1] = PAINT, ex = 3000;
      boilSeed('mount');
      for (const r of [[c.cx - ex, c.cy - ex, x0 - c.cx + ex, 2 * ex], [x1, c.cy - ex, ex, 2 * ex], [x0, c.cy - ex, x1 - x0, y0 - c.cy + ex], [x0, y1, x1 - x0, ex]])
        paint(rectPts(...r), { wash: MOUNT, washOp: 255 * km, ink: null });
      const bc = fade(MID, km), bw = 1 / c.Z;
      boilSeed('frame');
      inkLine([[x0, y0], [x1, y0]], bw, bc, 'inkfine', 0); inkLine([[x1, y0], [x1, y1]], bw, bc, 'inkfine', 0);
      inkLine([[x1, y1], [x0, y1]], bw, bc, 'inkfine', 0); inkLine([[x0, y1], [x0, y0]], bw, bc, 'inkfine', 0);
    }
    camEnd();
    return { c, x, y, o };
  }

  function film(t, lt, dur) {
    const s = world(t);
    flash(1 - ease(seg(t, 0, .45)), PAL.paper);                     // 入：从白纸里浮出来
    const kf = ease(seg(t, 15.5, 16.1));                             // 出：墨退回白纸，只剩一点红
    if (kf > 0) {
      boilSeed('out'); flash(kf, PAL.paper);
      camBegin(s.c.cx, s.c.cy, s.c.Z); clawd(s.x, s.y, U, s.o); camEnd();
      flash(ease(seg(t, 16.45, 16.8)), PAL.paper);
    }
  }
  shots([[0, film], [4.0, film], [8.0, film], [12.0, film]]);
})();

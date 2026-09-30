// fight.js：崖顶一战，约 19 秒。
// 对峙（主角转棍上架，大个子跺脚）→ 眯眼 → 对冲、棍拳相撞 → 勾拳落空、棍上挑、大个子飞出去
// → 大个子咆哮再冲，主角跃起抡棍带火砸下 → 火墨炸满屏 → 墨退，一站一躺，拉远收
// 身体姿势用 track（穿过关键帧不停顿），脚用 stepTrack（一步一步踩，站着的脚不滑）。全片 24 帧。
const UH = 2.2, UB = 2.3, TURN = TAU;
const CLASH = 6.3, UPPER = 8.0, SLAM = 12.1, END = PROJECT.duration;

// ---------- 姿势 ----------
const HD = { x: 0, hh: 92, lean: 0, tw: 0, head: 0, air: 0, tuck: 0, brow: 0, hF: [16, 30], hB: [8, 34], rF: [24, 52], rB: [-16, 62], staff: { a: 0, gF: 20, gB: -20, free: 0 } };
const BD = { x: 0, hh: 84, lean: .25, tw: .1, head: .1, air: 0, tuck: 0, brow: 0, hF: [28, 6], hB: [18, 16], rF: [30, 44], rB: [4, 58] };
const hp = o => ({ ...HD, ...o, staff: { ...HD.staff, ...(o.staff || {}) } });
const bp = o => ({ ...BD, ...o });

const H_REST = { hh: 92, lean: .02, head: .06, hF: [14, 30], hB: [-2, 36], staff: { a: -1.57 - TURN, gF: 25, gB: 0, free: 1 } };
const H_GUARD = { hh: 80, lean: .16, tw: .25, head: .06, hF: [18, 18], staff: { a: -.35, gF: 32, gB: -32 } };
const HK = [   // 主角
  [0, hp({ x: 420, ...H_REST })], [.95, hp({ x: 420, ...H_REST }), 'hold'],
  [1.1, hp({ x: 420, ...H_REST, hF: [24, 12], staff: { a: -1.57 - TURN + .7, gF: 0, free: 1 } })],           // 转棍
  [1.28, hp({ x: 420, hh: 88, lean: .06, hF: [26, 10], staff: { a: -1.57 - TURN + 2.6, gF: 0, free: 1 } })],
  [1.46, hp({ x: 420, hh: 84, lean: .1, hF: [24, 12], staff: { a: -1.57 - TURN + 4.6, gF: 8, free: 1 } })],
  [1.66, hp({ x: 420, hh: 80, lean: .14, tw: .2, hF: [20, 16], staff: { a: -.55, gF: 26, gB: -30 } })],
  [1.9, hp({ x: 420, ...H_GUARD }), 'hold'],
  [3.2, hp({ x: 420, ...H_GUARD, hh: 79 })], [4.0, hp({ x: 420, ...H_GUARD, hh: 80, brow: 1 })],
  [4.6, hp({ x: 420, ...H_GUARD, hh: 70, lean: .04, tw: -.3, head: .12, brow: 1, hF: [8, 24], staff: { a: -.1, gF: 30, gB: -34 } }), 'hold'],   // 蓄
  [4.85, hp({ x: 420, hh: 78, lean: .55, tw: .3, head: -.08, brow: 1, hF: [14, 22], staff: { a: -.05, gF: -10, gB: -50 } }), 'hold'],         // 蹬
  [5.2, hp({ x: 480, hh: 82, lean: .5, tw: .2, head: -.1, brow: 1, hF: [12, 24], staff: { a: 0, gF: -10, gB: -50 } })],
  [6.15, hp({ x: 690, hh: 82, lean: .48, tw: .3, head: -.1, brow: 1, hF: [10, 22], staff: { a: 0, gF: -15, gB: -55 } })],
  [6.28, hp({ x: 705, hh: 76, lean: .4, tw: 1, head: -.12, brow: 1, hF: [46, 4], staff: { a: -.04, gF: -20, gB: -60 } })],                  // 刺
  [CLASH, hp({ x: 707, hh: 76, lean: .4, tw: 1, head: -.12, brow: 1, hF: [46, 4], staff: { a: -.04, gF: -20, gB: -60 } }), 'hold'],
  [6.45, hp({ x: 690, hh: 78, lean: .12, tw: .3, head: -.14, brow: 1, hF: [22, 14], staff: { a: -.2, gF: 10, gB: -40 } })],                // 震回
  [6.8, hp({ x: 655, ...H_GUARD, brow: 1 }), 'hold'],
  [7.22, hp({ x: 655, ...H_GUARD, brow: 1 })],
  [7.4, hp({ x: 700, hh: 50, lean: .92, tw: -.1, head: .28, brow: 1, hF: [6, 30], staff: { a: .25, gF: 20, gB: -30 } })],                  // 矮身往里钻
  [7.58, hp({ x: 712, hh: 50, lean: .9, tw: -.2, head: .26, brow: 1, hF: [2, 32], staff: { a: .5, gF: 10, gB: -35 } }), 'hold'],
  [7.86, hp({ x: 715, hh: 58, lean: .55, tw: -.8, head: -.1, brow: 1, hF: [-4, 30], staff: { a: 2.4, gF: -10, gB: -45 } }), 'hold'],     // 棍拖到身后，梢子擦地
  [UPPER, hp({ x: 722, hh: 88, lean: -.05, tw: 1, head: -.3, brow: 1, hF: [36, -6], staff: { a: -.3, gF: -10, gB: -45 } })],            // 上挑
  [8.14, hp({ x: 726, hh: 92, lean: -.18, tw: 1, head: -.34, brow: 1, hF: [22, -36], staff: { a: -1.3, gF: -10, gB: -45 } })],
  [8.5, hp({ x: 728, hh: 92, lean: -.18, tw: .9, head: -.3, brow: 1, hF: [20, -38], staff: { a: -1.5, gF: -10, gB: -45 } }), 'hold'],
  [9.1, hp({ x: 730, ...H_GUARD, brow: 1 }), 'hold'],
  [10.3, hp({ x: 730, ...H_GUARD, brow: 1 }), 'hold'],
  [10.66, hp({ x: 728, hh: 52, lean: .32, tw: -.2, head: -.22, brow: 1, hF: [2, 18], staff: { a: -2.4, gF: -30, gB: -62 } }), 'hold'],    // 蹲
  [10.86, hp({ x: 735, hh: 130, air: .7, tuck: .4, lean: .12, head: -.3, brow: 1, hF: [4, -30], staff: { a: -2.5, gF: -30, gB: -62 } })],   // 起跳
  [11.3, hp({ x: 720, hh: 340, air: 1, tuck: 1, lean: -.05, head: -.2, brow: 1, hF: [6, -48], staff: { a: -2.4, gF: -30, gB: -62 } })],
  [11.55, hp({ x: 712, hh: 350, air: 1, tuck: 1, lean: .05, head: 0, brow: 1, hF: [16, -30], staff: { a: .2, gF: -35, gB: -65 } })],       // 空中抡一圈
  [11.8, hp({ x: 705, hh: 320, air: 1, tuck: 1, lean: .1, head: .05, brow: 1, hF: [10, -40], staff: { a: 2.8, gF: -35, gB: -65 } })],
  [11.96, hp({ x: 700, hh: 250, air: 1, tuck: 1, lean: -.08, head: -.1, brow: 1, hF: [0, -50], staff: { a: 4.9, gF: -40, gB: -70 } })],
  [SLAM, hp({ x: 700, hh: 133, air: 1, tuck: .6, lean: .3, tw: .8, head: .05, brow: 1, hF: [40, -4], staff: { a: .1 + TURN, gF: -40, gB: -70 } })],   // 砸在胳膊上
  [12.28, hp({ x: 715, hh: 58, air: 0, tuck: 0, lean: .78, tw: 1, head: .1, brow: 1, hF: [40, 12], staff: { a: .6 + TURN, gF: -40, gB: -70 } })],  // 压到地上
  [14.2, hp({ x: 715, hh: 56, lean: .74, tw: 1, head: .1, brow: 1, hF: [40, 14], staff: { a: .62 + TURN, gF: -40, gB: -70 } }), 'hold'],
  [15.1, hp({ x: 720, hh: 88, lean: .08, tw: .3, head: -.05, brow: .4, hF: [22, 10], staff: { a: -.6 + TURN, gF: 10, gB: -40 } })],          // 起身收棍
  [15.8, hp({ x: 725, ...H_REST, head: -.08, staff: { a: -1.57 + TURN, gF: 25, gB: 0, free: 1 } }), 'hold'],
  [END, hp({ x: 725, ...H_REST, head: -.12, staff: { a: -1.57 + TURN, gF: 25, gB: 0, free: 1 } })],
];
const H_FF = [[0, 445], [1.5, 445], [1.8, 480], [5.17, 480], [5.5, 585, 0, easeOut], [5.87, 585], [6.2, 745, 0, easeOut], [CLASH, 745], [6.7, 690, 0, easeOut, 'slide'],
  [7.22, 690], [7.42, 775, 0, easeOut], [10.8, 775], [12.28, 800, 0, ease, 'slide'], [END, 800]];
const H_FB = [[0, 395], [1.45, 395], [1.75, 350], [4.85, 350], [5.15, 515, 0, easeOut], [5.52, 515], [5.85, 660, 0, easeOut], [CLASH, 660], [6.7, 605, 0, easeOut, 'slide'],
  [8.7, 605], [9.05, 655], [10.8, 655], [12.28, 630, 0, ease, 'slide'], [14.9, 630], [15.3, 680], [END, 680]];

const B_GUARD = { hh: 84, lean: .25, tw: .1, head: .12, hF: [28, 6], hB: [18, 16] };
const B_RUN = { hh: 84, lean: .5, tw: .3, head: -.08, hF: [26, 12], hB: [2, 28] };
const BK = [   // 大个子
  [0, bp({ x: 1500, ...B_GUARD })], [2.0, bp({ x: 1500, ...B_GUARD }), 'hold'],
  [2.32, bp({ x: 1500, hh: 90, lean: .04, tw: -.1, head: -.05, hF: [24, -12], hB: [12, -6] }), 'hold'],                 // 抬脚
  [2.5, bp({ x: 1495, hh: 74, lean: .34, tw: .1, head: .22, hF: [30, 12], hB: [20, 20] })],                              // 跺
  [3.0, bp({ x: 1495, ...B_GUARD, hh: 80, head: .2 }), 'hold'],
  [4.6, bp({ x: 1495, hh: 72, lean: .08, tw: -.3, head: .15, hF: [20, 10], hB: [10, 20] }), 'hold'],
  [4.85, bp({ x: 1495, ...B_RUN, lean: .56 }), 'hold'],
  [5.2, bp({ x: 1445, ...B_RUN })], [6.15, bp({ x: 1238, ...B_RUN })],
  [6.28, bp({ x: 1224, hh: 78, lean: .45, tw: 1.1, head: -.1, hF: [62, -6], hB: [4, 26] })],                          // 出拳
  [CLASH, bp({ x: 1222, hh: 78, lean: .45, tw: 1.1, head: -.1, hF: [62, -6], hB: [4, 26] }), 'hold'],
  [6.45, bp({ x: 1245, hh: 82, lean: .02, tw: .2, head: -.2, hF: [34, 2], hB: [12, 20] })],
  [6.8, bp({ x: 1275, ...B_GUARD }), 'hold'],
  [6.92, bp({ x: 1265, ...B_GUARD, lean: .3 })],
  [7.2, bp({ x: 1100, hh: 80, lean: .28, tw: -1, head: .05, hF: [-18, -26], hB: [24, 10] })],                         // 冲上来、拳往后拉
  [7.3, bp({ x: 1080, hh: 78, lean: .3, tw: -.4, head: .05, hF: [20, -26], hB: [22, 14] })],
  [7.4, bp({ x: 1072, hh: 76, lean: .52, tw: 1.3, head: .05, hF: [48, 4], hB: [0, 26] })],                               // 勾拳扫过去
  [7.6, bp({ x: 1070, hh: 74, lean: .6, tw: 1.4, head: .12, hF: [36, 22], hB: [-4, 28] }), 'hold'],
  [7.95, bp({ x: 1068, hh: 78, lean: .42, tw: .8, head: 0, hF: [30, 10], hB: [10, 22] })],
  [UPPER, bp({ x: 1070, hh: 80, lean: .3, tw: .6, head: -.7, hF: [26, 0], hB: [12, 18] })],                              // 下巴挨了一棍
  [8.12, bp({ x: 1130, hh: 120, air: 1, tuck: .8, lean: -.4, head: -.8, hF: [10, -40], hB: [-20, -30] })],              // 飞出去
  [8.45, bp({ x: 1300, hh: 190, air: 1, tuck: 1, lean: -1.2, head: -.4, hF: [0, -44], hB: [-24, -34] })],
  [8.85, bp({ x: 1430, hh: 70, air: .3, tuck: .2, lean: -.3, head: .1, hF: [20, 10], hB: [-4, 10] })],
  [9.2, bp({ x: 1470, hh: 46, lean: .42, tw: .1, head: .25, hF: [34, 40], hB: [12, 34] }), 'hold'],                   // 单膝着地
  [9.6, bp({ x: 1470, hh: 66, lean: .3, head: .15, hF: [30, 24], hB: [12, 26] })],
  [10.0, bp({ x: 1470, hh: 86, lean: -.18, tw: 0, head: -.5, hF: [22, -46], hB: [6, -48] }), 'hold'],                  // 咆哮
  [10.3, bp({ x: 1468, ...B_RUN, lean: .4 })], [11.1, bp({ x: 1200, ...B_RUN })],
  [11.4, bp({ x: 1172, hh: 78, lean: -.15, tw: 0, head: -.75, hF: [16, -40], hB: [26, -36] }), 'hold'],                 // 抬头、架臂
  [12.08, bp({ x: 1170, hh: 76, lean: -.1, tw: 0, head: -.8, hF: [18, -42], hB: [28, -38] }), 'hold'],
  [12.25, bp({ x: 1175, hh: 40, lean: .6, tw: 0, head: .4, hF: [30, 20], hB: [20, 24] }), 'hold'],                     // 砸趴
  [12.9, bp({ x: 1330, hh: 16, air: 1, tuck: 1, lean: -1.5, head: .35, rF: [58, 4], rB: [50, 12], hF: [8, 20], hB: [-14, 16] }), 'hold'],
  [END, bp({ x: 1330, hh: 16, air: 1, tuck: 1, lean: -1.5, head: .35, rF: [58, 4], rB: [50, 12], hF: [8, 20], hB: [-14, 16] })],
];
const B_FF = [[0, 1440], [2.05, 1440], [2.32, 1440, 36, easeOut], [2.5, 1432, 0, easeIn, 'slide'], [5.17, 1432], [5.5, 1335, 0, easeOut], [5.87, 1335], [6.2, 1175, 0, easeOut],
  [CLASH, 1175], [6.72, 1230, 0, easeOut, 'slide'], [7.04, 1230], [7.26, 1010, 0, easeOut], [UPPER, 1010], [8.85, 1390, 0, ease, 'slide'], [9.2, 1420, 0, easeOut, 'slide'],
  [10.55, 1420], [10.85, 1250, 0, easeOut], [11.4, 1110, 0, easeOut, 'slide'], [12.9, 1110], [END, 1110]];
const B_FB = [[0, 1575], [4.85, 1575], [5.15, 1405, 0, easeOut], [5.52, 1405], [5.85, 1268, 0, easeOut], [CLASH, 1268], [6.72, 1323, 0, easeOut, 'slide'],
  [6.88, 1323], [7.08, 1160, 0, easeOut], [UPPER, 1160], [8.85, 1500, 0, ease, 'slide'], [9.2, 1530, 0, easeOut, 'slide'],
  [10.3, 1530], [10.55, 1330, 0, easeOut], [10.87, 1330], [11.12, 1200, 0, easeOut], [11.4, 1225, 0, easeOut, 'slide'], [END, 1225]];

// 某一时刻两人的姿势（风、速度也在这里给）
function heroAt(t, o = {}) {
  const P = track(t, HK), v = Math.abs(track(t + .04, HK).x - P.x) / .04;
  return { ...P, dir: 1, u: UH, g: GROUND, ff: stepTrack(t, H_FF), fb: stepTrack(t, H_FB), vel: clamp(v / 400), wind: o.wind ?? .5, ...o };
}
function bruteAt(t, o = {}) {
  const P = track(t, BK), v = Math.abs(track(t + .04, BK).x - P.x) / .04;
  return { ...P, dir: -1, u: UB, g: GROUND, ff: stepTrack(t, B_FF), fb: stepTrack(t, B_FB), vel: clamp(v / 400), wind: o.wind ?? .5, ...o };
}
// 拖影：往回取几个时刻，画成单色的淡影
function actors(t, o = {}) {
  const w = o.wind ?? .5;
  if (o.ghost) for (let k = o.ghost; k >= 1; k--) {
    const a = .22 * (1 - k / (o.ghost + 1));
    if (o.gb !== false) body(BRUTE, bruteAt(t - k * .03, { wind: w, ghost: '#6b5a4a', a }));
    if (o.gh !== false) body(HERO, heroAt(t - k * .03, { wind: w, ghost: '#e9e2d0', a: a * 1.4 }));
  }
  const b = body(BRUTE, bruteAt(t, { wind: w }));
  const h = body(HERO, heroAt(t, { wind: w }));
  return { h, b };
}

// ---------- 特效 ----------
const shake = (t, hits, amp = 22, k = 9) => hits.reduce((s, e) => s + (t >= e ? amp * Math.exp(-(t - e) * k) : 0), 0);
function toScreen(p) { const m = X.getTransform(); return [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f]; }
// 尘：落点周围几团赭色的烟，往外鼓、往上飘、变淡
function dust(x, t0, t, o = {}) {
  const k = seg(t, t0, t0 + (o.life ?? .9)); if (k <= 0 || k >= 1) return;
  const n = o.n ?? 7, sp = o.spread ?? 120, s = o.s ?? 1;
  for (let i = 0; i < n; i++) {
    const side = o.dir ?? (i % 2 ? 1 : -1), dx = side * sp * (.3 + .7 * hash(i * 3 + x)) * easeOut(k), r = (18 + 26 * hash(i + x)) * s * (.5 + easeOut(k));
    const P = blob(x + dx, GROUND - 6 - 40 * k * hash(i * 7) - r * .3, r, i + x, .3, 16);
    wash(P, '#cdb48a', { a: .75 * (1 - k) });
    if (hash(i * 5) < .5) outline(P.slice(2, 9), 1.6, i, LIGHT, PAL.ink, false);
  }
}
// 月牙形的挥击残影：以 c 为心，从 a0 扫到 a1，前端最宽；白芯墨边
function smear(c, r, a0, a1, w, o = {}) {
  const P = [], n = 16, ry = o.ry ?? 1;
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); P.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * ry]); }
  for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n), rr = r - w * Math.pow(i / n, 1.4); P.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * ry]); }
  X.save(); X.globalAlpha *= o.a ?? .9; X.fillStyle = o.col || PAL.paperLt; pathOf(X, P); X.fill();
  outline(P.slice(0, n + 1), o.line ?? 3, 7, LIGHT, PAL.ink, false); X.restore();
}
// 火尾：棍梢最近一小段的轨迹，外火、内芯、墨边
// 宽度跟着梢子的速度走：挥得快的那段火才粗，停着的时候就没有火
function fireTrail(t, span = .22) {
  const n = 18, pts = []; for (let k = 0; k <= n; k++) pts.push(jointOf(HERO, heroAt(t - span * k / n), 'tip'));
  const sp = pts.map((p, k) => { const q = pts[Math.min(n, k + 1)], r = pts[Math.max(0, k - 1)]; return Math.hypot(q[0] - r[0], q[1] - r[1]) / 2; });
  const band = (k0, k1, wk) => {
    const A = [], B = [];
    for (let k = k0; k <= k1; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const w = wk * clamp(sp[k] / 30) * Math.pow(1 - k / n, .7) * (.8 + .4 * vnoise(k * .8 + t * 30));
      A.push([pts[k][0] - dy / d * w, pts[k][1] + dx / d * w]); B.push([pts[k][0] + dy / d * w * .3, pts[k][1] - dx / d * w * .3]);
    }
    return [...A, ...B.reverse()];
  };
  const P = band(0, n, 40);
  X.save(); X.fillStyle = PAL.fire; pathOf(X, P); X.fill();
  X.fillStyle = PAL.fireLt; pathOf(X, band(0, Math.round(n * .6), 16)); X.fill();
  outline(P, 3.2, 3, LIGHT, PAL.ink); X.restore();
  if (sp[0] < 8) return;
  for (let i = 0; i < 10; i++) {                  // 火星子
    const k = hash(i * 3.3 + Math.floor(t * 24)), p = pts[Math.floor(k * 10)], a = hash(i * 7.7) * TAU, d = 20 + 60 * hash(i * 1.9);
    X.fillStyle = i % 3 ? PAL.fire : PAL.ink; pathOf(X, blob(p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d, 3 + 5 * hash(i), i, .3, 8)); X.fill();
  }
}
// 冲击帧：纸上只画人，整幅去色、拉满、反相（或压朱红），再加放射线和墨点
function impactFrame(t, kind, pt, o = {}) {
  X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = PAL.paper; X.fillRect(0, 0, W, H);
  cam(1); actors(t, { wind: 1.4 });
  impact(kind);
  cam(1); const s = toScreen(pt), col = kind === 'inv' ? PAL.paperLt : PAL.ink;
  burstLines(s[0], s[1], 160, 1500, 46, Math.floor(t * 24), { w: 16, col });
  cam(1); splat(pt[0], pt[1], 40, 11 + Math.floor(t * 24), { n: 22, reach: 5, col });
  finish({ vignette: .3 });
}
// 叶子横扫过画面，当转场
function leafWipe(t, t0, t1) {
  const k = seg(t, t0, t1); if (k <= 0 || k >= 1) return;
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  const x = lerp(W + 900, -900, ease(k)), y = H * .5 + 90 * Math.sin(k * 3), r = 760;
  X.translate(x, y); X.rotate(-.35 + .5 * k); X.scale(1, .55 + .25 * Math.sin(k * 5));
  const P = [[-r * 1.3, 0], [-r * .4, -r * .62], [r * .8, -r * .22], [r * 1.3, 0], [r * .8, r * .22], [-r * .4, r * .62]];
  part(spline([...P, P[0]], 20), PAL.red, PAL.redDk, { d: 90, line: 10, light: [0, -1] });
  outline([[-r * 1.2, 0], [0, -r * .03], [r * 1.2, 0]], 7, 3, [0, -1], PAL.redDk, false);
  X.restore();
}

// ---------- 布景 ----------
function world() { sky(); mountains(); cliff(); }
function tail(o = {}) { grass({ wind: o.wind ?? .6 }); leaves({ n: o.leaves ?? 16, v: o.lv ?? 320 }); finish({ vignette: o.vig ?? .5 }); }

// ---------- 镜头 ----------
// 1 对峙（0–3.4）：远景慢推；1 秒主角转棍上架，2.5 秒大个子跺脚
function shot1(t) {
  CAM = { x: 960, y: 600, s: lerp(1.3, 1.4, ease(seg(t, 0, 3.4))), r: 0, shake: shake(t, [2.5], 16, 8) };
  world(); pine(-80, GROUND + 14, 1.15, .5);
  cam(1); actors(t, { wind: .55 });
  if (t > 1.05 && t < 1.7) { const h = heroAt(t), c = jointOf(HERO, h, 'hndF'), a = h.staff.a; smear(c, 85 * UH, a - 1.4, a, 22, { a: .55 * (1 - seg(t, 1.5, 1.7)) }); }
  dust(1432, 2.5, t, { n: 8, spread: 170, s: 1.2 });
  tail({ wind: .6 });
  if (t < .8) { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1 - ease(t / .8); X.fillStyle = PAL.paper; X.fillRect(0, 0, W, H); X.restore(); }
}
// 2 眯眼（3.4–4.6）：特写主角的脸，风紧，眼眯起来；一片红叶扫过去接下一镜
function shot2(t) {
  const h = heroAt(t, { wind: .6 + 1.3 * ease(seg(t, 3.6, 4.1)) }), hd = jointOf(HERO, h, 'head');
  CAM = { x: hd[0] - 6, y: hd[1] + 12, s: lerp(5.1, 5.7, ease(seg(t, 3.4, 4.6))), r: -.03, shake: 0 };
  world();
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.filter = 'blur(7px)'; X.drawImage(outC, 0, 0); X.filter = 'none'; X.restore();
  cam(1); body(HERO, h);
  leaves({ n: 10, v: 900, s: 2 }); finish({ vignette: .65 });
  leafWipe(t, 4.3, 4.8);
}
// 3 对冲（4.6–6.3）：跟拍，两人蹬地冲向对方，残影 + 速度线
function shot3(t) {
  const h = heroAt(t), b = bruteAt(t), mid = (h.x + b.x) / 2;
  CAM = { x: mid, y: 600, s: lerp(1.12, 1.32, ease(seg(t, 4.6, CLASH))), r: -.03, shake: 5 * seg(t, 5.2, 6.2) };
  world();
  if (t > 5.0) speedLines(-.03, 30, Math.floor(t * 24), { w: 8, a: .5, col: PAL.paperLt });
  cam(1); actors(t, { wind: 1.2, ghost: t > 4.9 ? 3 : 0 });
  dust(480, 4.85, t, { dir: -1, n: 5 }); dust(1575, 4.85, t, { dir: 1, n: 5 });
  tail({ wind: 1.2, leaves: 26, lv: 900 });
  leafWipe(t, 4.3, 4.8);
}
// 4 相撞（6.3–6.47）：两帧反相、两帧朱红
// 5 交手（6.47–10.9）：勾拳落空、棍上挑、大个子飞出去单膝落地，爬起来咆哮再冲
function shot5(t) {
  const h = heroAt(t), b = bruteAt(t), tip = jointOf(HERO, h, 'tip');
  if (t < CLASH + 4 / 24) return impactFrame(t, t < CLASH + 2 / 24 ? 'inv' : 'red', [tip[0] - 10, tip[1]]);
  if (t >= UPPER && t < UPPER + 3 / 24) return impactFrame(t, t < UPPER + 2 / 24 ? 'inv' : 'red', jointOf(BRUTE, b, 'head'));
  const mid = clamp((h.x + b.x) / 2, 900, 1180), sp = seg(t, 8.1, 9.0);
  CAM = { x: mid + 30, y: lerp(590, 600, sp), s: lerp(1.5, 1.28, ease(sp)), r: .02 * Math.sin(t * .8), shake: shake(t, [CLASH], 30, 8) + shake(t, [UPPER], 34, 8) + shake(t, [8.85], 12, 10) };
  world();
  cam(1);
  const gh = (t > 7.25 && t < 7.5) || (t > 7.85 && t < 8.3) || (t > 8.0 && t < 8.9);
  actors(t, { wind: .9, ghost: gh ? 3 : 0 });
  cam(1);
  if (t > 7.26 && t < 7.62) {                                            // 勾拳的弧
    const sh = jointOf(BRUTE, b, 'shF'), k = seg(t, 7.26, 7.42), fade = 1 - seg(t, 7.44, 7.62);
    smear(sh, 78 * UB, Math.PI + 1.2, Math.PI + 1.2 - 1.9 * easeOut(k), 30, { ry: .55, a: .85 * fade });
  }
  if (t > 7.88 && t < 8.35) {                                            // 上挑的弧
    const c = jointOf(HERO, h, 'shF'), k = seg(t, 7.88, 8.02), fade = 1 - seg(t, 8.1, 8.35);
    smear(c, 130 * UH, 2.2, 2.2 - 3.4 * easeOut(k), 50, { a: .9 * fade });
  }
  if (t > UPPER) { const hd = jointOf(BRUTE, b, 'head'), k = seg(t, UPPER, UPPER + .6); splat(hd[0] + 30, hd[1] - 20, 22 * (1 - k), 23, { n: 14, dir: -.4, spread: 1.4, reach: 5 * (1 + k), a: 1 - k, col: PAL.red }); }
  if (t > 7.62 && t < 7.9) dust(jointOf(HERO, heroAt(7.75), 'tip')[0], 7.62, t, { n: 3, life: .5, s: .6, spread: 40 });   // 棍梢擦地
  dust(1000, CLASH, t, { n: 10, spread: 260, s: 1.3 }); dust(1440, 8.85, t, { n: 8, dir: 1, spread: 200 }); dust(1440, 9.2, t, { n: 5, s: .8 });
  tail({ wind: .9, leaves: 18 });
}
// 6 跃起砸下（10.9–12.9）：仰角跟着人往上走，棍梢拖火，落下时反相两帧、朱红两帧，火和墨炸满屏
function shot6(t) {
  const h = heroAt(t), b = bruteAt(t), hd = jointOf(HERO, h, 'hip'), tip = jointOf(HERO, h, 'tip');
  const hit = [tip[0], GROUND - 10];
  if (t >= SLAM && t < SLAM + 4 / 24) return impactFrame(t, t < SLAM + 2 / 24 ? 'inv' : 'red', hit);
  const up = t < SLAM ? clamp((GROUND - hd[1]) / 700) : 0;
  CAM = { x: lerp(1000, hd[0] + 40, .6), y: lerp(620, hd[1] + 80, .7), s: lerp(1.25, 1.05, up), r: -.05 + .03 * up, shake: shake(t, [SLAM], 44, 6) };
  world();
  cam(1);
  if (t > 11.3 && t < 12.3) fireTrail(t, t > 11.9 ? .16 : .24);
  actors(t, { wind: 1.1, ghost: t > 10.85 && t < 12.3 ? 2 : 0, gb: false });
  grass({ wind: 1.1 });
  if (t > 12.26) {                                                           // 压到地上：地裂，火和墨从落点炸开盖满屏
    const g = [jointOf(HERO, heroAt(12.28), 'tip')[0], GROUND - 4], k = seg(t, 12.26, 12.85);
    cam(1);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI * .9 + .15, l = (200 + 500 * hash(i * 3)) * easeOut(k * 3);
      brush([g, [g[0] + Math.cos(a) * l * .5, g[1] + 12 + 10 * hash(i)], [g[0] + Math.cos(a) * l, g[1] + 20 + 30 * hash(i * 2)]], 10, { col: PAL.ink, prof: 'sweep', dry: .3, seed: 400 + i });
    }
    const s = toScreen(g), R = 60 + 2400 * Math.pow(k, 1.7);
    X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
    bloom(s[0], s[1], R * 1.1, 91, PAL.fire, 4);
    bloom(s[0], s[1], R * .86, 92, PAL.fireLt, 0);
    bloom(s[0], s[1], R * .7, 93, PAL.ink, 5);
    X.restore();
  }
  leaves({ n: 14 }); finish({ vignette: .5 });
}
// 一团往外炸的火或墨：边缘是一圈长短不一的火舌
function bloom(x, y, r, seed, col, line) {
  const P = [];
  for (let i = 0; i < 160; i++) { const a = i / 160 * TAU, k = 1 + .12 * (vnoise(i * .1 + seed) - .5) * 2 + .16 * Math.pow(vnoise(i * .32 + seed * 3 + T * 3), 3); P.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * .8]); }
  X.fillStyle = col; pathOf(X, P); X.fill();
  if (line) outline(P, line, seed, [0, -1], PAL.ink);
  return P;
}
// 7 收（12.9–END）：墨退，火边一圈退到画外；大个子躺着，主角起身收棍，风停，拉远，淡到纸
function shot7(t) {
  CAM = { x: lerp(1080, 980, ease(seg(t, 13.2, 18))), y: lerp(600, 570, ease(seg(t, 13.2, 18))), s: lerp(1.4, 1.0, ease(seg(t, 13.0, 18.2))), r: 0, shake: shake(t, [12.9], 10, 5) };
  const w = lerp(.9, .3, seg(t, 13.5, 17));
  world(); pine(-80, GROUND + 14, 1.15, w);
  cam(1);
  for (let i = 0; i < 9; i++) {                                               // 地上留下的裂
    const hx = jointOf(HERO, heroAt(12.28), 'tip')[0], a = Math.PI + (i / 8) * Math.PI * .9 + .15, l = 200 + 500 * hash(i * 3);
    brush([[hx, GROUND - 10], [hx + Math.cos(a) * l * .5, GROUND + 2 + 10 * hash(i)], [hx + Math.cos(a) * l, GROUND + 10 + 30 * hash(i * 2)]], 10, { col: PAL.ink, prof: 'sweep', dry: .3, seed: 400 + i });
  }
  actors(t, { wind: w });
  dust(1300, 12.95, t, { n: 10, spread: 300, s: 1.6, life: 1.6 });
  tail({ wind: w, leaves: Math.round(lerp(18, 6, seg(t, 14, 18))), lv: lerp(360, 160, seg(t, 14, 18)) });
  const k = seg(t, 12.9, 13.6);                                                // 墨退：中间先化开，一圈火边跟着往外退出画面
  if (k < 1) {
    const r = 2300 * Math.pow(k, 1.6) + 30, X0 = X;
    X = SX; SX.setTransform(1, 0, 0, 1, 0, 0); SX.globalCompositeOperation = 'source-over'; SX.clearRect(0, 0, W, H);
    SX.fillStyle = PAL.ink; SX.fillRect(0, 0, W, H);
    SX.globalCompositeOperation = 'destination-out'; bloom(W * .5, H * .62, r * 1.18 + 40, 91, '#000', 0);
    SX.globalCompositeOperation = 'source-over'; const ring = bloom(W * .5, H * .62, r * 1.18 + 40, 91, PAL.fire, 0);
    SX.globalCompositeOperation = 'destination-out'; bloom(W * .5, H * .62, r, 93, '#000', 0);
    SX.globalCompositeOperation = 'source-over'; outline(ring, 5, 91, [0, -1], PAL.ink);
    X = X0;
    X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.drawImage(SC, 0, 0); X.restore();
  }
  if (t > END - .8) { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = ease(seg(t, END - .8, END - .05)); X.fillStyle = PAL.paper; X.fillRect(0, 0, W, H); X.restore(); }
}

shots([[0, shot1], [3.4, shot2], [4.6, shot3], [CLASH, shot5], [10.9, shot6], [12.9, shot7]]);

// 调姿势用的样张
LOOPS.lab = t => { world(); pine(-80, GROUND + 14, 1.15); cam(1); actors(1); tail(); };
LOOPS.lab.len = 1;

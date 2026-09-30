// moves.js：招式库。每个招式是一段调好的关键帧（相对时间、相对位置），用 plan() 按顺序拼成 track / stepTrack 直接能用的表。
// 用法：
//   const A = plan(HERO, { x: 700, dir: 1, u: 2.2 });            // 棍（kind 自动取 staff），站在 x=700，面朝右
//   A.do('chop').wait(.3).do('thrust', { at: 3.0 });              // at：让这一招的接触时刻正好落在 3.0 秒
//   const B = plan(BRUTE, { x: 1180, dir: -1, u: 2.3 });          // 空手（fist）
//   B.do('blockArms', { at: A.hits[0].t }).do('hitHead', { at: A.hits[1].t });
//   const a = A.build(), b = B.build();                           // a.at(t) 给 body() 用，a.hits 是每次接触的时刻和部位
// 距离单位：招式里的 dx 是局部单位（身高约 175），plan 按 u 和朝向换成世界坐标。
// 时间：蓄力 4–8 帧、出手 3–4 帧、命中顿 2 帧、余势 6–10 帧（24fps），见 wushan.md「打击感和节奏」。

const MV_D = {
  staff: { x: 0, hh: 92, lean: 0, tw: 0, head: 0, air: 0, tuck: 0, brow: 0, hF: [16, 30], hB: [8, 34], rF: [24, 52], rB: [-16, 62], staff: { a: 0, gF: 20, gB: -20, free: 0 } },
  fist: { x: 0, hh: 84, lean: .25, tw: .1, head: .1, air: 0, tuck: 0, brow: 0, hF: [28, 6], hB: [18, 16], rF: [30, 44], rB: [4, 58] },
};
const MV_GUARD = {
  staff: { hh: 80, lean: .16, tw: .25, head: .06, hF: [18, 18], staff: { a: -.35, gF: 32, gB: -32 } },
  fist: { hh: 84, lean: .25, tw: .1, head: .12, hF: [28, 6], hB: [18, 16] },
};
const MV_FEET = { ff: 16, fb: -22 };      // 架势里两只脚相对胯的位置（局部单位）
const FR = 1 / 24;

// 每个招式：kind => { keys: [[dt, 姿势, 'hold'?]], ff/fb: [[dt, dx, 离地?, 缓动?, 'slide'?]], hit: 接触时刻, joint: 打人的部位, line: 高中低, note }
// 姿势只写和架势不同的字段，dx 是身体相对这一招开始时的位移。第一帧（dt=0）是当前姿势，不用写。
const MOVES = {
  // ---------- 棍 ----------
  thrust: k => ({            // 直刺：收棍蓄力，上步一刺，棍梢打中；中路
    hit: .33, joint: 'tip', line: 'mid',
    keys: [
      [.2, { hh: 74, lean: .04, tw: -.35, head: .1, hF: [6, 22], staff: { a: -.12, gF: 30, gB: -34 } }, 'hold'],
      [.33, { dx: 26, hh: 76, lean: .42, tw: 1, head: -.1, hF: [46, 4], staff: { a: -.04, gF: -20, gB: -60 } }, 'hold'],
      [.33 + 2 * FR, { dx: 26, hh: 76, lean: .42, tw: 1, head: -.1, hF: [46, 4], staff: { a: -.04, gF: -20, gB: -60 } }, 'hold'],
      [.75, { dx: 26 }],
    ],
    ff: [[.2, 0], [.33, 32, 0, easeOut]], fb: [[.36, 0], [.56, 24]],
  }),
  chop: k => ({              // 劈：棍举过头顶往后，上步从上往下劈；高路打头、肩
    hit: .4, joint: 'tip', line: 'high',
    keys: [
      [.25, { dx: -4, hh: 88, lean: -.12, tw: -.3, head: -.05, hF: [4, -40], staff: { a: -2.5, gF: -10, gB: -50 } }, 'hold'],
      [.4, { dx: 24, hh: 76, lean: .4, tw: .9, head: 0, hF: [42, -8], staff: { a: .02, gF: -20, gB: -55 } }, 'hold'],
      [.4 + 2 * FR, { dx: 24, hh: 76, lean: .4, tw: .9, head: 0, hF: [42, -8], staff: { a: .02, gF: -20, gB: -55 } }, 'hold'],
      [.64, { dx: 26, hh: 66, lean: .56, tw: .9, head: .1, hF: [36, 22], staff: { a: .75, gF: -20, gB: -55 } }],
      [1.0, { dx: 26 }],
    ],
    ff: [[.25, 0], [.4, 34, 0, easeOut]], fb: [[.5, 0], [.72, 26]],
  }),
  rising: k => ({            // 撩（上挑）：矮身把棍拖到身后，梢子擦地，从下往上挑；打下巴
    hit: .34, joint: 'tip', line: 'high',
    keys: [
      [.2, { dx: 6, hh: 58, lean: .55, tw: -.8, head: -.1, hF: [-4, 30], staff: { a: 2.4, gF: -10, gB: -45 } }, 'hold'],
      [.34, { dx: 14, hh: 88, lean: -.05, tw: 1, head: -.3, hF: [36, -10], staff: { a: -.5, gF: -10, gB: -45 } }, 'hold'],
      [.34 + 2 * FR, { dx: 14, hh: 88, lean: -.05, tw: 1, head: -.3, hF: [36, -10], staff: { a: -.5, gF: -10, gB: -45 } }, 'hold'],
      [.56, { dx: 18, hh: 92, lean: -.18, tw: 1, head: -.34, hF: [22, -36], staff: { a: -1.3, gF: -10, gB: -45 } }, 'hold'],
      [.95, { dx: 18 }],
    ],
    ff: [[0, 0], [.2, 26, 0, easeOut]], fb: [[.36, 0], [.56, 22]],
  }),
  sweepLow: k => ({          // 扫腿：棍甩到身后，压低重心从后往前贴地扫，打脚踝；低路
    hit: .38, joint: 'tip', line: 'low',
    keys: [
      [.22, { dx: -6, hh: 66, lean: .25, tw: -.9, head: .1, hF: [0, 24], staff: { a: 2.9, gF: -20, gB: -55 } }, 'hold'],
      [.38, { dx: 12, hh: 48, lean: .5, tw: 1, head: .18, hF: [44, 26], staff: { a: .12, gF: -25, gB: -60 } }, 'hold'],
      [.38 + 2 * FR, { dx: 12, hh: 48, lean: .5, tw: 1, head: .18, hF: [44, 26], staff: { a: .12, gF: -25, gB: -60 } }, 'hold'],
      [.6, { dx: 14, hh: 50, lean: .42, tw: .8, head: .12, hF: [36, 22], staff: { a: -.25, gF: -20, gB: -55 } }],
      [1.0, { dx: 14 }],
    ],
    ff: [[.1, 0], [.32, 36, 0, easeOut]], fb: [[.6, 0], [.82, 22]],
  }),
  blockHigh: k => ({         // 架：棍横举过头，接从上面来的劈砸；接住后被压得往下一沉、后滑
    hit: .15, joint: 'hndF', line: 'high',
    keys: [
      [.12, { hh: 76, lean: .04, tw: .1, head: .16, hF: [14, -36], staff: { a: -.05, gF: 24, gB: -24 } }, 'hold'],
      [.15, { hh: 74, lean: .04, tw: .1, head: .18, hF: [14, -34], staff: { a: -.05, gF: 24, gB: -24 } }, 'hold'],
      [.15 + 2 * FR, { hh: 74, lean: .04, tw: .1, head: .18, hF: [14, -34], staff: { a: -.05, gF: 24, gB: -24 } }, 'hold'],
      [.34, { dx: -10, hh: 64, lean: -.02, tw: .1, head: .22, hF: [12, -30], staff: { a: .02, gF: 24, gB: -24 } }],
      [.7, { dx: -12 }],
    ],
    ff: [[.2, 0], [.4, -12, 0, easeOut, 'slide']], fb: [[.2, 0], [.4, -12, 0, easeOut, 'slide']],
  }),
  blockMid: k => ({          // 格：棍竖在身前，拨开刺来的棍、打来的拳；被震得后滑半步
    hit: .12, joint: 'hndF', line: 'mid',
    keys: [
      [.1, { hh: 78, lean: .08, tw: .45, head: .1, hF: [24, 4], staff: { a: -1.35, gF: -15, gB: -55 } }, 'hold'],
      [.12 + 2 * FR, { hh: 78, lean: .06, tw: .45, head: .12, hF: [24, 4], staff: { a: -1.3, gF: -15, gB: -55 } }, 'hold'],
      [.32, { dx: -9, hh: 80, lean: -.04, tw: .2, head: .16, hF: [20, 8], staff: { a: -1.15, gF: -10, gB: -50 } }],
      [.6, { dx: -10 }],
    ],
    ff: [[.14, 0], [.34, -10, 0, easeOut, 'slide']], fb: [[.14, 0], [.34, -10, 0, easeOut, 'slide']],
  }),

  // ---------- 空手 ----------
  punch: k => ({             // 直拳：拧身蓄，上步出拳，拳打到底
    hit: .28, joint: 'hndF', line: 'mid',
    keys: [
      [.16, { hh: 80, lean: .1, tw: -.4, head: .1, hF: [14, 4], hB: [18, 12] }, 'hold'],
      [.28, { dx: 18, hh: 78, lean: .45, tw: 1.1, head: -.1, hF: [62, -6], hB: [4, 26] }, 'hold'],
      [.28 + 2 * FR, { dx: 18, hh: 78, lean: .45, tw: 1.1, head: -.1, hF: [62, -6], hB: [4, 26] }, 'hold'],
      [.65, { dx: 18 }],
    ],
    ff: [[.16, 0], [.28, 24, 0, easeOut]], fb: [[.34, 0], [.52, 16]],
  }),
  hook: k => ({              // 勾拳：拳往后上方拉，拧腰从侧上方抡过来；高路
    hit: .34, joint: 'hndF', line: 'high',
    keys: [
      [.18, { hh: 80, lean: .28, tw: -1, head: .05, hF: [-18, -26], hB: [24, 10] }, 'hold'],
      [.26, { dx: 4, hh: 78, lean: .3, tw: -.4, head: .05, hF: [20, -26], hB: [22, 14] }],
      [.34, { dx: 10, hh: 76, lean: .5, tw: 1.3, head: .05, hF: [48, 2], hB: [0, 26] }, 'hold'],
      [.34 + 2 * FR, { dx: 10, hh: 76, lean: .5, tw: 1.3, head: .05, hF: [48, 2], hB: [0, 26] }, 'hold'],
      [.52, { dx: 12, hh: 74, lean: .6, tw: 1.4, head: .12, hF: [36, 22], hB: [-4, 28] }],
      [.9, { dx: 12 }],
    ],
    ff: [[.1, 0], [.3, 22, 0, easeOut]], fb: [[.5, 0], [.7, 14]],
  }),
  hammer: k => ({            // 双拳砸：两拳举过头，整个人压下去砸；高路打头、肩，也能砸地
    hit: .4, joint: 'hndF', line: 'high',
    keys: [
      [.26, { dx: -4, hh: 90, lean: -.16, tw: 0, head: -.3, hF: [10, -56], hB: [6, -54] }, 'hold'],
      [.4, { dx: 16, hh: 76, lean: .45, tw: .3, head: .2, hF: [46, -16], hB: [42, -12] }, 'hold'],
      [.4 + 2 * FR, { dx: 16, hh: 76, lean: .45, tw: .3, head: .2, hF: [46, -16], hB: [42, -12] }, 'hold'],
      [.6, { dx: 18, hh: 66, lean: .66, tw: .3, head: .34, hF: [40, 34], hB: [36, 36] }],
      [1.0, { dx: 18 }],
    ],
    ff: [[.26, 0], [.4, 26, 0, easeOut]], fb: [[.6, 0], [.8, 18]],
  }),
  shoulder: k => ({          // 肩撞：沉肩冲上去，用肩和整个身子撞；中路，贴身用
    hit: .34, joint: 'shF', line: 'mid',
    keys: [
      [.2, { dx: -4, hh: 76, lean: .18, tw: -.5, head: .1, hF: [12, 18], hB: [20, 16] }, 'hold'],
      [.34, { dx: 44, hh: 78, lean: .5, tw: .9, head: .22, hF: [6, 30], hB: [18, 22] }, 'hold'],
      [.34 + 2 * FR, { dx: 44, hh: 78, lean: .5, tw: .9, head: .22, hF: [6, 30], hB: [18, 22] }, 'hold'],
      [.75, { dx: 46 }],
    ],
    ff: [[.2, 0], [.34, 46, 0, easeOut]], fb: [[.26, 0], [.42, 40, 0, easeOut]],
  }),
  blockArms: k => ({         // 架臂：两条前臂架在头前，挡劈砸、勾拳；被砸得一沉、后滑
    hit: .14, joint: 'hndF', line: 'high',
    keys: [
      [.12, { hh: 80, lean: .02, tw: 0, head: .14, hF: [22, -34], hB: [26, -28] }, 'hold'],
      [.14 + 2 * FR, { hh: 78, lean: .02, tw: 0, head: .16, hF: [22, -32], hB: [26, -26] }, 'hold'],
      [.34, { dx: -10, hh: 70, lean: -.04, tw: 0, head: .2, hF: [20, -24], hB: [24, -20] }],
      [.7, { dx: -12 }],
    ],
    ff: [[.16, 0], [.36, -12, 0, easeOut, 'slide']], fb: [[.16, 0], [.36, -12, 0, easeOut, 'slide']],
  }),

  // ---------- 通用：腿、闪、步法 ----------
  kick: k => ({              // 蹬踢：提膝、蹬出去、收回落地；中路踹肚子，拿棍的空手的都能用
    hit: .3, joint: 'ankF', line: 'mid',
    keys: [
      [.16, { hh: 86, lean: -.08, tw: .1, head: .1 }, 'hold'],
      [.3, { dx: 6, hh: 86, lean: -.3, tw: -.2, head: .16 }, 'hold'],
      [.3 + 2 * FR, { dx: 6, hh: 86, lean: -.3, tw: -.2, head: .16 }, 'hold'],
      [.52, { dx: 8, hh: 84, lean: -.1, tw: 0, head: .12 }],
      [.8, { dx: 10 }],
    ],
    ff: [[0, 0], [.16, 12, 50, easeOut], [.3, 62, 68, easeOut], [.38, 62, 68], [.52, 30, 28], [.64, 32, 0, easeIn]], fb: [[0, 0], [.7, 0], [.86, 10]],
  }),
  duck: k => ({              // 闪（下潜）：矮身往前钻，让对方的横击从头顶过去；hit 是对方打空的时刻
    hit: .18, joint: 'head', line: 'high',
    keys: [
      [.16, { dx: 14, hh: 52, lean: .9, tw: -.1, head: .28, ...(k === 'staff' ? { hF: [6, 30], staff: { a: .25, gF: 20, gB: -30 } } : { hF: [20, 22], hB: [8, 26] }) }, 'hold'],
      [.36, { dx: 18, hh: 50, lean: .88, tw: -.2, head: .26, ...(k === 'staff' ? { hF: [2, 32], staff: { a: .5, gF: 10, gB: -35 } } : { hF: [20, 22], hB: [8, 26] }) }, 'hold'],
      [.7, { dx: 20 }],
    ],
    ff: [[0, 0], [.16, 30, 0, easeOut]], fb: [[.36, 0], [.56, 20]],
  }),
  sway: k => ({              // 后仰闪：上身往后一仰，脚滑半步，让刺、直拳够不着；hit 是对方打空的时刻
    hit: .14, joint: 'head', line: 'mid',
    keys: [
      [.14, { dx: -16, hh: 84, lean: -.6, tw: -.3, head: -.3 }, 'hold'],
      [.3, { dx: -18, hh: 84, lean: -.5, tw: -.2, head: -.24 }, 'hold'],
      [.62, { dx: -16 }],
    ],
    ff: [[0, 0], [.16, -14, 0, easeOut, 'slide']], fb: [[0, 0], [.14, -20, 0, easeOut]],
  }),
  advance: (k, o = {}) => stepMove(o.dist ?? 45, o.dur ?? .32),       // 上步：往前压一步
  retreat: (k, o = {}) => stepMove(-(o.dist ?? 45), o.dur ?? .32),    // 退步：往后撤一步
  dash: (k, o = {}) => {     // 冲刺：dist 局部单位，每步约 0.3 秒，身子前倾
    const dist = o.dist ?? 160, n = Math.max(2, Math.round(dist / 55)), st = o.step ?? .28, keys = [], ff = [[0, 0]], fb = [[0, 0]];
    keys.push([.12, { dx: 4, hh: 80, lean: .5, tw: .3, head: -.08 }, 'hold']);
    for (let i = 1; i <= n; i++) { const t = .12 + i * st, d = dist * i / n; keys.push([t, { dx: d, hh: 82, lean: .48, tw: .25, head: -.08 }]); const L = i % 2 ? fb : ff; L.push([t - st * .9, L.at(-1)[1]], [t, d + (i % 2 ? 40 : 2), 0, easeOut]); }
    const e = .12 + n * st;
    keys.push([e + .25, { dx: dist + 4 }]);
    ff.push([e + .1, dist]); fb.push([e + .2, dist]);
    return { hit: null, keys, ff, fb, line: null };
  },

  // ---------- 挨打 ----------
  // hit = 0：at 就是挨打的那一帧；前 2 帧顿住，然后才开始动
  hitHead: k => ({           // 打中头：头往后甩，上身后仰，脚往后滑
    hit: 0, reaction: true,
    keys: [
      [2 * FR, null, 'hold'],
      [.2, { dx: -20, hh: 86, lean: -.34, tw: -.3, head: -.7, brow: 1 }],
      [.5, { dx: -26, hh: 82, lean: -.08, tw: -.1, head: -.24, brow: 1 }],
      [.9, { dx: -26, brow: 1 }],
    ],
    ff: [[2 * FR, 0], [.3, -22, 0, easeOut, 'slide']], fb: [[2 * FR, 0], [.3, -28, 0, easeOut, 'slide']],
  }),
  hitBody: k => ({           // 打中肚子：身子对折，头往前栽，往后退
    hit: 0, reaction: true,
    keys: [
      [2 * FR, null, 'hold'],
      [.2, { dx: -16, hh: 70, lean: .8, tw: 0, head: .42, brow: 1, ...(k === 'staff' ? { hF: [16, 36] } : { hF: [14, 34], hB: [8, 36] }) }, 'hold'],
      [.55, { dx: -22, hh: 76, lean: .5, head: .3, brow: 1 }],
      [.95, { dx: -24, brow: 1 }],
    ],
    ff: [[2 * FR, 0], [.3, -18, 0, easeOut, 'slide']], fb: [[2 * FR, 0], [.3, -22, 0, easeOut, 'slide']],
  }),
  knockback: k => ({         // 被震退：一记重的挡住了也被推出去一大截，脚在地上搓出去
    hit: 0, reaction: true,
    keys: [
      [2 * FR, null, 'hold'],
      [.28, { dx: -64, hh: 80, lean: -.3, tw: -.2, head: -.3, brow: 1 }],
      [.55, { dx: -72, hh: 74, lean: .3, head: .12, brow: 1 }],
      [.95, { dx: -72, brow: 1 }],
    ],
    ff: [[2 * FR, 0], [.36, -64, 0, easeOut, 'slide']], fb: [[2 * FR, 0], [.34, -70, 0, easeOut, 'slide']],
  }),
  launch: k => ({            // 被打飞：离地往后飞，落地单膝跪住
    hit: 0, reaction: true,
    keys: [
      [2 * FR, null, 'hold'],
      [.14, { dx: -26, hh: 120, air: 1, tuck: .8, lean: -.4, head: -.8, brow: 1, hF: [10, -40], hB: [-20, -30] }],
      [.46, { dx: -100, hh: 190, air: 1, tuck: 1, lean: -1.2, head: -.4, brow: 1, hF: [0, -44], hB: [-24, -34] }],
      [.84, { dx: -156, hh: 70, air: .3, tuck: .2, lean: -.3, head: .1, brow: 1, hF: [20, 10], hB: [-4, 10] }],
      [1.2, { dx: -174, hh: 46, lean: .42, tw: .1, head: .25, brow: 1, hF: [34, 40], hB: [12, 34] }, 'hold'],
    ],
    ff: [[.84, -150, 0, ease, 'slide'], [1.2, -164, 0, easeOut, 'slide']], fb: [[.84, -142, 0, ease, 'slide'], [1.2, -155, 0, easeOut, 'slide']],
  }),
  fall: k => ({              // 被打倒：往后栽倒，躺平
    hit: 0, reaction: true,
    keys: [
      [2 * FR, null, 'hold'],
      [.26, { dx: -24, hh: 70, air: .5, tuck: .3, lean: -.7, head: -.5, brow: 1, hF: [10, -20], hB: [-10, -10] }],
      [.5, { dx: -54, hh: 30, air: 1, tuck: .8, lean: -1.3, head: .1, brow: 1, rF: [58, 4], rB: [50, 12], hF: [10, 10], hB: [-14, 10] }],
      [.66, { dx: -60, hh: 16, air: 1, tuck: 1, lean: -1.5, head: .35, brow: 1, rF: [58, 4], rB: [50, 12], hF: [8, 20], hB: [-14, 16] }, 'hold'],
    ],
    ff: [[2 * FR, 0], [.5, -40, 0, easeOut, 'slide']], fb: [[2 * FR, 0], [.5, -50, 0, easeOut, 'slide']],
  }),
  getUp: k => ({             // 从躺着爬起来：先单膝跪，再站回架势（要接在 fall 或 launch 后面）
    hit: null, feetFromHip: true,
    keys: [
      [.4, { dx: 6, hh: 46, lean: .42, tw: .1, head: .25, brow: 1, hF: [34, 40], hB: [12, 34] }, 'hold'],
      [.95, { dx: 8, brow: 1 }],
    ],
    ff: [[0, 30], [.4, 30], [.8, 22]], fb: [[0, -14], [.4, -14], [.85, -22]],
  }),
};
function stepMove(d, dur) {                 // 上步先迈前脚、退步先撤后脚，另一只脚再跟上
  const fwd = d > 0, keys = [[dur, { dx: d, lean: fwd ? .24 : .06 }], [dur + .18, { dx: d }]];
  const lead = [[0, 0], [dur * .7, d, 0, easeOut]], trail = [[dur * .35, 0], [dur, d, 0, easeOut]];
  return { hit: null, keys, ff: fwd ? lead : trail, fb: fwd ? trail : lead };
}

// 把一串招式拼成一个人的动作表
function plan(F, o) {
  const kind = o.kind || (F === BRUTE ? 'fist' : 'staff'), dir = o.dir ?? 1, u = o.u ?? 2.2, g = o.g ?? (typeof GROUND === 'number' ? GROUND : 820);
  const D = MV_D[kind], G = { ...MV_GUARD[kind], ...(o.guard || {}) };
  const full = p => {
    const q = { ...D, ...G, ...p };
    if (D.staff) q.staff = { ...D.staff, ...G.staff, ...(p.staff || {}) };
    delete q.dx; return q;
  };
  let t = o.t ?? 0, x = o.x, ff = o.ff ?? x + dir * u * MV_FEET.ff, fb = o.fb ?? x + dir * u * MV_FEET.fb, last = { ...full({}), x };
  const K = [[t, last]], FF = [[t, ff]], FB = [[t, fb]], hits = [];
  const push = (L, e) => { const p = L[L.length - 1]; if (e[0] <= p[0] + 1e-4) { if (e[0] < p[0] - 1e-4) throw new Error(`plan: 时间倒退 ${e[0].toFixed(3)} < ${p[0].toFixed(3)}`); L[L.length - 1] = e; } else L.push(e); };
  const P = {
    kind, dir, u, hits,
    get t() { return t; }, get x() { return x; },
    wait(dur) {                              // 原地停 dur 秒（保持当前姿势）
      t += dur; push(K, [t, last, 'hold']); push(FF, [t, ff]); push(FB, [t, fb]); return P;
    },
    until(t1) { return t1 > t ? P.wait(t1 - t) : P; },
    pose(dt, p, flag) {                      // 手写一帧：p 是和架势不同的字段，dx 相对当前位置
      t += dt; last = { ...full(p), x: x + dir * u * (p.dx || 0) }; x = last.x; push(K, [t, last, flag]); push(FF, [t, ff]); push(FB, [t, fb]); return P;
    },
    do(name, opt = {}) {
      const mk = MOVES[name]; if (!mk) throw new Error(`plan: 没有招式 ${name}`);
      const m = mk(kind, opt), start = opt.at != null ? opt.at - (m.hit || 0) : t;
      if (start < t - 1e-4) {                // 上一招还没收完就接这一招：从 start 那一刻的姿势直接接（取消后摇）
        if (opt.cancel === false || start < K[0][0]) throw new Error(`plan: ${name} 要在 ${start.toFixed(3)} 开始，但上一个动作到 ${t.toFixed(3)} 才结束`);
        const cur = track(start, K), f1 = stepTrack(start, FF)[0], b1 = stepTrack(start, FB)[0];
        for (const L of [K, FF, FB]) while (L.length > 1 && L[L.length - 1][0] > start - 1e-4) L.pop();
        while (hits.length && hits[hits.length - 1].t > start) hits.pop();
        last = cur; x = cur.x; ff = f1; fb = b1; t = start; K.push([t, last]); FF.push([t, ff]); FB.push([t, fb]);
      }
      P.until(start);
      const x0 = x, f0 = ff, b0 = fb, ex = opt.dx || 0, hitT = m.hit || m.keys[m.keys.length - 1][0];
      const W = (d, dt) => dir * u * (d + ex * Math.min(1, dt / Math.max(hitT, 1e-3)));   // opt.dx：这一招额外往前（负数往后）多走的距离，在接触前走完
      const hold0 = last;
      for (const [dt, p, flag] of m.keys) { last = p === null ? hold0 : { ...full({ ...(opt.pose || {}), ...p }), x: x0 + W(p.dx || 0, dt) }; push(K, [start + dt, last, flag]); }
      for (const [L, x00, src, key] of [[FF, m.feetFromHip ? x0 : f0, m.ff, 'ff'], [FB, m.feetFromHip ? x0 : b0, m.fb, 'fb']]) {
        push(L, [start, L[L.length - 1][1]]);
        // opt.dx：迈步的那几帧多走 ex；原本站着不动的脚在接触前贴地垫过去（垫步），不然身子走了脚钉在原地，人会被腿长拽得坐下去
        for (const [dt, d, lift, e, sl] of src) push(L, [start + dt, x00 + dir * u * (d ? d + ex : ex * Math.min(1, dt / Math.max(hitT, 1e-3))), lift || 0, e, d || !ex ? sl : 'slide']);
        if (key === 'ff') ff = L[L.length - 1][1]; else fb = L[L.length - 1][1];
      }
      x = last.x;
      const end = Math.max(...m.keys.map(k => k[0]), ...m.ff.map(k => k[0]), ...m.fb.map(k => k[0]));
      t = start + end; push(K, [t, last]); push(FF, [t, ff]); push(FB, [t, fb]);
      if (m.hit != null && !m.reaction) hits.push({ t: start + m.hit, name, joint: m.joint, line: m.line, miss: !!opt.miss });   // miss：这一招打空（对面闪开了）
      return P;
    },
    build() {
      const at = (tt, extra = {}) => {
        const p = track(tt, K), v = Math.abs(track(tt + .04, K).x - p.x) / .04;
        return { ...p, dir, u, g, ff: stepTrack(tt, FF), fb: stepTrack(tt, FB), vel: clamp(v / 400), wind: .5, ...extra };
      };
      return { K, FF, FB, hits, at, end: t, point: (h, F2 = F) => jointOf(F2, at(h.t), h.joint) };
    },
  };
  return P;
}

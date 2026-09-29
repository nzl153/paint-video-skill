// stars.js: 《拾星》。Clawd 捧着空罐子发呆，接住掉下来的星星，一罐星光把夜色一点点焐暖。
//   A 0–3.6    发呆 → 星星划落 → 吃惊                        入：纸色淡入    出：笔刷擦除（往右，顺着星星的方向）
//   B 3.6–7.6  抱罐小跑 → 接住 → 罐子亮起 → 跳               出：镜头推向罐子，直接接 C
//   C 7.6–11.6 又落两颗，一颗比一颗亮，天变暖 → 高举          出：推进罐子的光里，暖光闪白
//   D 11.6–14.5 回到开头机位，抱着罐子坐着 → 光圈收到罐子上，落在纸色
// 不变的约束：山坡弧线（HILL）在所有镜头里都停在同一个位置，相机只做很小的推拉。
(() => {
  Object.assign(PAL, {
    paper: '#f7f2e6', cream: '#faf7f0', ink: '#2e2a24',
    clay: '#bb5f3c', clayDk: '#8f4428', clayLt: '#d98a6c',
    sap: '#8a9a6a', ochre: '#c9a25a', indigo: '#4a5670', night: '#262a38',
    teal: '#6f9590', rose: '#c98a8a', sky: '#a9bfc4', violet: '#7d6f8f'
  });
  const LIGHT = '#F0C574';                         // 星光，只用这一个暖黄
  const WARM = '#4b4356';                          // 天空被焐暖后的颜色：还是夜，只是没那么冷

  // 暖度：每接住一颗星就往上走一格
  const CATCH = [5.1, 8.6, 9.3];
  const warmth = t => .28 * ease(seg(t, CATCH[0], CATCH[0] + .9)) + .26 * ease(seg(t, CATCH[1], CATCH[1] + .6)) + .28 * ease(seg(t, CATCH[2], CATCH[2] + .7));
  const caught = t => CATCH.filter(c => t >= c).length;
  const bright = t => clamp(.45 * seg(t, CATCH[0], CATCH[0] + .9) + .25 * seg(t, CATCH[1], CATCH[1] + .4) + .3 * seg(t, CATCH[2], CATCH[2] + .4));

  // ---------- 布景 ----------
  const HILL = [960, 1720, 1800, 920];             // 主山坡椭圆：顶在 y = 800
  const hillY = x => HILL[1] - HILL[3] * Math.sqrt(Math.max(0, 1 - ((x - HILL[0]) / HILL[2]) ** 2));

  function sky(t) {
    const w = warmth(t);
    boilSeed('sky');
    paint(rectPts(-400, -400, W + 800, H + 800), { wash: mixCol(PAL.night, WARM, w), ink: null });
    paint(ellPts(W * .55, H * .92, W * .85, H * .45, 30, 10), { fill: mixCol(PAL.indigo, PAL.ochre, w * .9), fillOp: 90 + 90 * w, bleed: .3, tex: .6, ink: null });
    paint(ellPts(W * .2, H * .12, W * .32, H * .22, 24, 10), { fill: PAL.indigo, fillOp: 70 * (1 - w), bleed: .3, tex: .5, ink: null });
    for (let i = 0; i < 26; i++) {
      boilSeed('bg' + i);
      const x = hash(i) * (W + 200) - 100, y = hash(i + 100) * H * .55 - 20;
      const tw = .55 + .45 * Math.sin(t * (1.5 + 1.5 * hash(i + 300)) + i * 2);
      paint(starPts(x, y, (2.5 + 4 * hash(i + 200)) * tw, .35, 4), { wash: PAL.cream, washOp: (130 + 90 * tw) * (1 - .55 * w), ink: null });
    }
  }
  function hills(t) {
    const w = warmth(t);
    boilSeed('back');
    paint(ellPts(1640, 1180, 940, 440, 36, 2), { wash: mixCol(mixCol(PAL.indigo, PAL.night, .35), WARM, w * .6), fill: PAL.night, fillOp: 50, bleed: .08, tex: .5, ink: PAL.ink, sw: .8 });
    boilSeed('hill');
    const col = mixCol(mixCol(PAL.sap, PAL.night, .45), mixCol(PAL.sap, PAL.ochre, .25), w);
    paint(ellPts(...HILL, 44, 2), { wash: col, fill: mixCol(col, PAL.night, .4), fillOp: 80, bleed: .06, tex: .6, ink: PAL.ink, sw: 1.1 });
    for (let i = 0; i < 18; i++) {
      boilSeed('tuft' + i);
      const x = 80 + i * 105 + 40 * hash(i), y = hillY(x) + 6, s = wob(t, .35, hash(i) * 3) * 6;
      for (const k of [-1, 0, 1]) inkLine([[x + k * 7, y], [x + k * 10 + s, y - 20 - 9 * hash(i + k * 7)]], .7, mixCol(col, PAL.cream, .35), 'inkfine', .4);
    }
  }

  // ---------- 道具 ----------
  // 罐子：(x, y) 是罐底中心，s 是缩放，b 是亮度 0..1，n 是里面有几颗星
  function jar(x, y, s, b, n, key = 'jar') {
    boilSeed(key);
    const w = 84 * s, h = 104 * s, tw = 1 + .05 * Math.sin(T * 7);
    if (b > .01) glow(x, y - h * .45, (70 + 230 * b) * s * tw, LIGHT, .25 + .75 * b);
    paint(rrPts(x - w / 2, y - h, w, h, 20 * s, 1), { wash: mixCol(mixCol(PAL.cream, PAL.sky, .35), LIGHT, b * .7), washOp: 150 + 90 * b, ink: null });
    for (let i = 0; i < n; i++) {
      const px = x + (hash(i + 40) - .5) * w * .5, py = y - h * (.28 + .4 * hash(i + 60));
      paint(starPts(px, py, 13 * s, .45, 5, hash(i) * 2), { wash: mixCol(LIGHT, PAL.cream, .4), ink: PAL.ink, sw: .6 });
    }
    paint(rrPts(x - w / 2, y - h, w, h, 20 * s, 1), { ink: PAL.ink, sw: .9 });
    inkLine([[x - w * .3, y - h * .75], [x - w * .3, y - h * .3]], .8, PAL.cream, 'inkfine', .3);   // 玻璃的高光
    paint(rrPts(x - w * .56, y - h - 14 * s, w * 1.12, 18 * s, 5 * s, 1), { wash: PAL.clayDk, ink: PAL.ink, sw: .9 });
  }
  // 掉落的星星和它的尾迹。path(t) → [x, y]
  function falling(t, t0, t1, path, key) {
    if (t < t0 || t > t1) return;
    boilSeed(key);
    const P = []; for (let k = 7; k >= 0; k--) P.push(path(Math.max(t0, t - k * .04)));
    if (Math.hypot(P[7][0] - P[0][0], P[7][1] - P[0][1]) > 8) paint(ribbon(P, 2, 22), { wash: PAL.cream, fill: LIGHT, fillOp: 90, ink: null });
    const [x, y] = path(t);
    glow(x, y, 70, LIGHT, .8);
    paint(starPts(x, y, 20, .45, 5, t * 8), { wash: mixCol(LIGHT, PAL.cream, .3), ink: PAL.ink, sw: .8 });
  }

  // ---------- A：发呆，星星划落 ----------
  const XA = 760, UA = 22;
  const fallA = t => { const k = easeIn(seg(t, 1.9, 2.7)); return [lerp(1180, 2080, k), lerp(-40, 560, k)]; };
  function shotA(t, lt, dur) {
    camBegin(960, 540, lerp(1, 1.05, ease(lt / dur)));
    sky(t); hills(t);
    falling(t, 1.9, 2.75, fallA, 'fallA');
    const mood = emotions(t, [[0, 'bored'], [1.15, 'sleepy'], [2.75, 'surprised', { lookX: .9, lookY: -.6 }]]);
    const look = t > 2.75 ? turn(t, 2.95, 3.15, 0, .12) : {};
    clawd(XA, hillY(XA) + 4, UA, { ...mood, ...look });
    jar(XA + 9 * UA, hillY(XA + 9 * UA) + 4, 1.25, 0, 0);
    camEnd();
    flash(1 - ease(seg(lt, 0, .7)), PAL.paper);
    boilSeed('wipe');
    if (lt > dur - .3) brushWipe((lt - (dur - .3)) / .6, [PAL.indigo, PAL.night]);
  }

  // ---------- B：抱罐小跑，接住 ----------
  const UB = 24, XB0 = 280, XB1 = 1180, TB = 3.6;
  function poseB(lt) {
    const run = stroll(lt, 0, 1.0, XB0, XB1, UB), x = run.x, G = hillY(x) + 4;
    const mood = emotions(lt, [[0, 'determined'], [1.55, 'surprised', { lookY: -.8 }], [2.0, 'excited', { emote: null }]]);
    let pose;
    if (lt < 1.0) pose = { view: 'side', walk: run.walk, dy: run.dy, aL: .15, aR: -.2 };
    else pose = turn(lt, 1.0, 1.15, .25, 0);
    const lift = backOut(seg(lt, 1.1, 1.45));
    const hop = jump(lt, 2.9, 3.45, 2.2);
    const kick = ring(lt, [1.5], 7, 20);
    const cl = { ...mood, ...pose, sq: (mood.sq || 0) * .5 + (pose.sq || 0) + hop.sq + .16 * kick, dy: (mood.dy || 0) * (lt < 1 ? .3 : .6) + (pose.dy || 0) + hop.dy };
    if (lt > 1.0) { cl.aL = lerp(.2, 1.45, lift); cl.aR = lerp(.2, 1.45, lift); }
    const head = [x, G + cl.dy * UB - 8 * UB * (1 - cl.sq) - 2];
    const carry = [x + 6.4 * UB, G - 1.6 * UB + (pose.dy || 0) * UB];
    const jp = lt < 1.1 ? carry : [lerp(carry[0], head[0], lift), lerp(carry[1], head[1], lift)];
    return { x, G, cl, jp };
  }
  const landB = poseB(1.5).jp;
  const fallB = lt => { const k = easeIn(seg(lt, .2, 1.5)); return [lerp(1560, landB[0], k), lerp(-60, landB[1] - 110, k)]; };
  function shotB(t, lt, dur) {
    const push = ease(seg(lt, dur - .5, dur));
    camBegin(lerp(960, XB1, push), lerp(540, 520, push), lerp(1.01, 1.12, push));
    sky(t); hills(t);
    falling(lt, .2, 1.52, fallB, 'fallB');
    const { x, G, cl, jp } = poseB(lt);
    clawd(x, G, UB, cl);
    jar(jp[0], jp[1], 1.1, bright(t), caught(t), 'jarB');
    camEnd();
    boilSeed('wipe');
    if (lt < .3) brushWipe(.5 + lt / .6, [PAL.indigo, PAL.night]);
  }

  // ---------- C：又落两颗 ----------
  function poseC(lt) {
    const x = XB1, G = hillY(x) + 4;
    const mood = emotions(lt, [[0, 'excited', { emote: null }], [2.4, 'proud', { emote: null }]], { take: .6 });
    const kick = ring(lt, [CATCH[1] - 7.6, CATCH[2] - 7.6], 7, 20);
    const raise = backOut(seg(lt, 2.4, 2.85));
    const cl = { ...mood, sq: (mood.sq || 0) * .4 + .16 * kick, dy: (mood.dy || 0) * .5 - 1.4 * raise, aL: 1.45, aR: 1.45 };
    const head = [x, G + cl.dy * UB - 8 * UB * (1 - cl.sq) - 2];
    return { x, G, cl, jp: head };
  }
  const landC = [poseC(CATCH[1] - 7.6).jp, poseC(CATCH[2] - 7.6).jp];
  const fallC1 = lt => { const k = easeIn(seg(lt, .15, 1.0)); return [lerp(560, landC[0][0], k), lerp(-60, landC[0][1] - 125, k)]; };
  const fallC2 = lt => { const k = easeIn(seg(lt, .75, 1.7)); return [lerp(1680, landC[1][0], k), lerp(-60, landC[1][1] - 125, k)]; };
  function shotC(t, lt, dur) {
    const open = ease(seg(lt, 0, 1.1)), dive = easeIn(seg(lt, dur - .55, dur));
    const { x, G, cl, jp } = poseC(lt);
    const jc = [jp[0], jp[1] - 60];
    const cx = lerp(lerp(XB1, 960, open), jc[0], dive), cy = lerp(lerp(520, 520, open), jc[1], dive);
    camBegin(cx, cy, lerp(lerp(1.12, 1.0, open), 2.4, dive));
    sky(t); hills(t);
    falling(lt, .15, 1.02, fallC1, 'fallC1');
    falling(lt, .75, 1.72, fallC2, 'fallC2');
    clawd(x, G, UB, cl);
    jar(jp[0], jp[1], 1.1, bright(t), caught(t), 'jarC');
    camEnd();
    flash(ease(seg(lt, dur - .4, dur)), '#FBEBC8');
  }

  // ---------- D：回到开头 ----------
  function shotD(t, lt, dur) {
    camBegin(960, 540, lerp(1, 1.02, ease(lt / dur)));
    sky(t); hills(t);
    const mood = feel('love', t, { lookX: .6 });
    clawd(XA, hillY(XA) + 4, UA, { ...mood, aR: .3 + .1 * Math.sin(t * 3) });
    const jx = XA + 8 * UA, jy = hillY(jx) + 4;
    jar(jx, jy, 1.3, 1, 3, 'jarD');
    const at = toScreen(jx, jy - 50);
    camEnd();
    flash(1 - ease(seg(lt, 0, .55)), '#FBEBC8');
    const r = lt < 1.7 ? 1600 : lt < 2.25 ? lerp(1600, 190, ease(seg(lt, 1.7, 2.25))) : lt < 2.55 ? lerp(190, 175, seg(lt, 2.25, 2.55)) : lerp(175, 0, easeIn(seg(lt, 2.55, dur - .08)));   // 收到罐子上，停一下，再合上
    boilSeed('iris');
    iris(...at, r, PAL.paper);
  }

  shots([[0, shotA], [TB, shotB], [7.6, shotC], [11.6, shotD]]);
})();

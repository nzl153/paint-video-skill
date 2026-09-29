// demo.js：人设表 + 两张关键帧样张 + 一段 16 秒的动态：偷看 → 她回头 → 他脸红 → 噗地变成呆头鸟 → 被红线绕成一团
// 动态段原本卡在一首 68 BPM 的歌里（28.3–44.1 秒），这里整体平移到从 0 开始，节拍格子不变

// ---------- 人设表 ----------
LOOPS.cast = t => {
  scribbleFill(rect(-50, 700, W + 100, 500), PAL.path, { c2: PAL.white });
  const u = 58, g = 640;
  // 她：正面 / 侧走 / 回头
  human(170, g, u, { face: 0, blush: .5 }, 'her');
  human(420, g, u, { face: -1, walk: t * 1.1, eyes: 'dot' }, 'her');
  human(670, g, u, { face: -1, look: .85, eyes: 'side', mouth: 'cat', brow: 'smug', arms: { L: [-.3, 2.1], R: [.3, 2.1] }, behind: ['L', 'R'] }, 'her');
  // 他：正面 / 偷看 / 红透
  human(960, g, u, { face: 0, eyes: 'dot', mouth: 'flat' }, 'him');
  human(1210, g, u, { face: .5, look: .7, eyes: 'wide', mouth: 'o', ahoge: .6, arms: { L: [.2, 1.1], R: [1.0, 1.0] } }, 'him');
  human(1460, g, u, { face: 0, eyes: 'spiral', mouth: 'wobble', heat: .9, steam: 1, shake: .6, arms: { L: [-.5, 1.4], R: [.5, 1.4] } }, 'him');
  // 呆头鸟
  bird(1720, g, 62, { blink: frac(t) > .9 ? 1 : 0 });
  // 下排：变身三步
  const y2 = 1040;
  human(320, y2, 42, { eyes: 'wide', mouth: 'o', heat: .5, ahoge: .8 }, 'him');
  poof(760, y2 - 140, 170, .3);
  bird(1200, y2, 48, { puff: .8, eyes: 'spiral' });
  for (let i = 0; i < 5; i++) feather(1200, y2 - 120, 40, .4 + i * .15, i);
  bird(1600, y2, 48, { gaze: [[.5, 0], [-.5, 0]] });
};
LOOPS.cast.len = 4;

// ---------- 关键帧样张 ----------
// 清晨：他在屋里桌前，圆窗外她捂着嘴笑
LOOPS.dawn = t => {
  const wall = '#ecd9b6', wood = '#8a5f43';
  scribbleFill(rect(-50, -50, W + 100, H + 100), wall, { c2: '#f6e8cc', ang: 80, under: '#e2c9a0' });
  blob([[-50, 830], [W + 50, 810], [W + 50, H + 50], [-50, H + 50]], '#c99c6c', { d: 'heavy', ang: 8, d2: 'light', c2: '#dcb584', smooth: false, under: '#b48656' });
  const wx = 1250, wy = 430, R = 330;
  // 窗外
  X.save(); X.beginPath(); X.arc(wx, wy, R, 0, TAU); X.clip();
  scribbleFill(rect(wx - R - 20, wy - R - 20, 2 * R + 40, 2 * R + 40), PAL.dawn, { c2: PAL.white, ang: 5 });
  dot(wx + 150, wy - 120, 80, PAL.sun, { d: 'heavy' });
  willowStrands(wx - 60, wy - R - 40, 700, 320, t, 0, 1, 9, 2);
  const laugh = Math.abs(Math.sin(t * TAU * .9)) * .04;
  human(wx - 30, wy + R + 170, 90, { face: -.3, look: -.5, eyes: 'happy', mouth: 'smile', blush: .8, sq: laugh, arms: { L: [-.4, 2.2], R: [-.3, -.05] }, handsOver: ['R'] }, 'her');
  X.restore();
  // 圆窗窗棂 + 光斑
  const ring = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; ring.push([wx + Math.cos(a) * R, wy + Math.sin(a) * R]); }
  // 窗花：只在窗沿一圈做回纹角，中间留空看得见她
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + TAU / 16, c = Math.cos(a), s2 = Math.sin(a); stroke([[wx + c * R, wy + s2 * R], [wx + c * R * .8, wy + s2 * R * .8], [wx + Math.cos(a + .25) * R * .8, wy + Math.sin(a + .25) * R * .8]], 10, wood, { d: 'heavy', smooth: false }); }
  stroke([...ring, ring[0]], 36, wood, { d: 'heavy', smooth: false });
  blob([[wx - 250, 860], [wx + 230, 860], [wx + 40, 1090], [wx - 620, 1090]], PAL.sun, { d: 'light', a: .55, edge: false, smooth: false });
  // 屋里：他坐在桌后，手里的笔停在半空
  const stare = Math.sin(t * TAU * .25) * .1;
  const boy = { face: .7, look: .9, eyes: 'wide', gaze: [1, -.3], mouth: 'o', blush: 1, ahoge: .3 + stare, arms: { L: [.7, 1.4], R: [1.1, .9] }, handsOver: ['L', 'R'] };
  human(420, 1000, 95, { ...boy, part: 'body' }, 'him');
  blob([[120, 700], [800, 700], [780, 740], [140, 740]], wood, { d: 'heavy', line: PAL.ink, lw: 5, smooth: false });
  blob(rect(170, 740, 40, 300), wood, { d: 'heavy', smooth: false }); blob(rect(710, 740, 40, 300), wood, { d: 'heavy', smooth: false });
  blob([[380, 690], [640, 690], [660, 702], [360, 702]], PAL.white, { d: 'heavy', smooth: false, line: PAL.inkSoft, lw: 3 });
  human(420, 1000, 95, { ...boy, part: 'head' }, 'him');
  const hand = [420 + .7 * 95 * .1 + 1.1 * 95, 1000 - 4 * 95 + .9 * 95];
  stroke([[hand[0] - 30, hand[1] + 40], [hand[0] + 40, hand[1] - 70]], 8, PAL.ink, { d: 'solid' });
  dot(hand[0] + 44, hand[1] - 76, 7, PAL.ink);
};LOOPS.dawn.len = 4;

// 夜里的街巷：他变回人了，两人并肩走，红线还系在两根小指上
LOOPS.night = t => {
  scribbleFill(rect(-50, -50, W + 100, 700), PAL.night, { c2: '#46508a', ang: 3, under: '#232a50' });
  for (let i = 0; i < 26; i++) { const sx = hash(i) * W, sy = hash(i + 50) * 380, tw = .6 + .4 * Math.sin(t * 3 + i); dot(sx, sy, 4 + hash(i + 3) * 3, PAL.glow, { a: tw, d: 'heavy' }); }
  // 两排房子的剪影和亮着的窗
  for (let i = 0; i < 9; i++) {
    const hx = -120 + i * 250, hw = 230, hh = 260 + hash(i) * 90, base = 760;
    blob(rect(hx, base - hh, hw, hh), '#46508a', { d: 'mid', smooth: false, ang: 80, under: '#303868', line: '#1d2344', lw: 4 });
    blob([[hx - 26, base - hh + 10], [hx + hw * .5, base - hh - 50], [hx + hw + 26, base - hh + 10]], '#2a3160', { d: 'mid', under: '#1b2142' });
    for (let k = 0; k < 2; k++) blob(rect(hx + 40 + k * 110, base - hh + 70, 60, 70), PAL.glow, { d: 'heavy', smooth: false, a: .9 });
  }
  scribbleFill([[-50, 740], [W + 50, 740], [W + 50, H + 50], [-50, H + 50]], '#7a6a78', { c2: '#9a8a86', ang: 10, under: '#4d4260' });
  // 远处的人群剪影
  for (let i = 0; i < 12; i++) { const px = 60 + i * 165 + hash(i) * 40, py = 800 + hash(i + 8) * 30, s = .8 + hash(i + 2) * .3, bob = Math.abs(Math.sin(t * 2.2 + i)) * 4; blob(ell(px, py - 92 * s - bob, 22 * s, 23 * s, 12), '#3a3d66', { d: 'mid', under: '#262a4a' }); blob([[px - 36 * s, py], [px - 22 * s, py - 64 * s - bob], [px + 22 * s, py - 64 * s - bob], [px + 36 * s, py]], '#3a3d66', { d: 'mid', under: '#262a4a' }); }
  // 夜色压一层，灯笼附近留亮
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalCompositeOperation = 'multiply'; const g = X.createRadialGradient(W / 2, 620, 200, W / 2, 620, 1200); g.addColorStop(0, 'rgba(255,236,210,1)'); g.addColorStop(1, 'rgba(120,110,170,1)'); X.fillStyle = g; X.fillRect(0, 0, W, H); X.restore();
  // 两个人
  const walk = t * 1.1, gy = 1010;
  human(780, gy, 82, { face: .6, look: .8, walk, eyes: 'dot', gaze: [1, 0], mouth: 'flat', blush: 1, ahoge: .2, arms: { L: [-.7, 2.1], R: [1.0, 2.2] } }, 'him');
  human(1140, gy, 80, { face: -.6, look: -.4, walk: walk + .5, eyes: 'happy', mouth: 'smile', blush: .7, arms: { L: [-1.0, 2.2], R: [.7, 2.1] } }, 'her');
  // 红线：他的右手 → 她的左手，中间垂下来
  const a = [780 + 82 * 1.0 + 82 * .6 * .1, gy - 4 * 82 + 82 * 2.2], b = [1140 - 80 * 1.0 - 80 * .6 * .1, gy - 4 * 80 + 80 * 2.2];
  stroke([a, [(a[0] + b[0]) / 2, a[1] + 60 + Math.sin(t * 3) * 10], b], 6, PAL.red, { d: 'heavy' });
  // 头顶一串灯笼
  const string = []; for (let i = 0; i <= 10; i++) string.push([-60 + i * 204, 120 + Math.sin(i / 10 * Math.PI) * 90]);
  stroke(string, 4, PAL.ink, { d: 'heavy' });
  for (let i = 1; i < 10; i++) lantern(string[i][0], string[i][1] + 70, 42, t, i);
  lantern(260, 560, 60, t, 20); lantern(1680, 540, 60, t, 21);
};
LOOPS.night.len = 4;

// ---------- 动态段 ----------
// 三连的动作每半拍一下，最后一下落在小节重拍上
const Y = [BT(35), BT(35.5), BT(36)];        // 探头三次
const Q = [BT(39), BT(39.5), BT(40)];        // 三格砸下来
const N = [BT(43), BT(43.5), BT(44)];        // 三下冒气，最后一下变身
const WRAP0 = 40.62, BAR5 = BT(48), CHORUS = 44.13;

function sparkle(x, y, r, k, col = PAL.sun) {
  if (k <= 0) return; const s = r * backOut(k);
  blob([[x, y - s], [x + s * .22, y - s * .22], [x + s, y], [x + s * .22, y + s * .22], [x, y + s], [x - s * .22, y + s * .22], [x - s, y], [x - s * .22, y - s * .22]], col, { d: 'solid', smooth: false, j: 1 });
}

// A 他躲在柳树后面偷看她走过，每一拍探出去一点
function shotA(t, lt) {
  push(); cam(lerp(960, 910, ease(seg(t, 28.4, 32.2))), lerp(640, 660, ease(seg(t, 28.4, 32.2))), lerp(1.18, 1.26, ease(seg(t, 28.4, 32.2))));
  riverside(t);
  const k = kick(t, Y, 8, 14), step = Y.reduce((s, y, i) => s + backOut(seg(t, y, y + .2)) * [.6, .6, .75][i], 0);
  // 他站在树干右后侧：露出半边袍子和一只脚，整个人往外歪着探；手只露出小手扒着树边
  const lean = .04 + step * .1;
  const boy = { face: .6, look: .7, headDx: -.1 + step * .25, tilt: .08 + step * .1, lean, eyes: step > 1.2 ? 'wide' : 'dot', mouth: step > 1.2 ? 'o' : 'flat', ahoge: k * 1.5,
    arms: { L: [-.1, 1.2], R: [-.05, .55] }, handsOver: ['L', 'R'], handsOnly: true, blush: .3 + step * .2 };
  human(548, 912, 58, { ...boy, part: 'body' }, 'him');
  willow(480, 910, 1.5, t, k);
  human(548, 912, 58, { ...boy, part: 'head' }, 'him');
  // 她沿着河边走过去，哼着歌
  const gx = lerp(1560, 1100, seg(t, 28.2, 32.4));
  human(gx, 940, 60, { face: -1, walk: t * 1.4, eyes: 'dot', mouth: 'smile', blush: .45, arms: { L: [-.6, 2.2], R: [.4, 2.25] } }, 'her');
  pop();
}

// B 她站住、回头；三格特写从右往左一拍砸下来一格
function herTurn(t) {
  const turn = backOut(seg(t, 33.95, 34.35));
  return { face: -1, look: lerp(-1, .85, turn), walk: t < 33.55 ? t * 1.4 : null, hemSway: spring(t, 33.55, 5, 12) * .6,
    eyes: turn > .5 ? 'side' : 'dot', gaze: [1, 0], mouth: turn > .5 ? 'cat' : 'smile', brow: turn > .7 ? 'smug' : null, blush: .5,
    arms: { L: [.35, 2.0], R: [.55, 2.05] }, behind: ['L', 'R'], ribbonWind: turn * .5 };
}
function shotB(t, lt) {
  const gx = lerp(1100, 980, ease(seg(t, 32.2, 33.6)));
  X.translate(kick(t, Q, 12, 40) * 10, 0);   // 每格砸下来整幅震一下
  push(); cam(lerp(1010, 960, ease(seg(t, 32.2, 34.8))), 730, lerp(1.6, 1.78, seg(t, 32.2, 35.7)));
  riverside(t);
  human(gx, 940, 60, herTurn(t), 'her');
  pop();
  // 三格
  const cells = [[1300, 70, 570, 940], [690, 70, 570, 940], [80, 70, 570, 940]];
  cells.forEach(([x, y, w, h], i) => {
    const a = t - Q[i]; if (a < -.03) return;
    const s = lerp(1.3, 1, backOut(clamp((a + .03) / .2))), rot = [-.025, .02, -.015][i] * (1 - clamp(a / .3) * .5);
    panel(x, y, w, h, (pw, ph) => {
      scribbleFill(rect(-20, -20, pw + 40, ph + 40), [PAL.skirt, PAL.her, PAL.dawn][i], { c2: PAL.white });
      focusLines(pw / 2, ph * .42, pw, ph, 26, [PAL.herDk, PAL.white, PAL.herDk][i], i * 9);
      const P = { ...herTurn(34.8), walk: null, hemSway: 0, tilt: -.06 };
      if (i === 0) human(pw * .48, ph * 1.35, 150, P, 'her');
      if (i === 1) human(pw * .37, ph * 1.8, 270, { ...P, gaze: [1.3, 0] }, 'her');
      if (i === 2) { human(pw * .18, ph * 3.18, 560, { ...P, eyes: 'wink', gaze: [1.4, 0] }, 'her'); sparkle(pw * .82, ph * .28, 60, seg(a, .05, .3)); sparkle(pw * .88, ph * .5, 34, seg(a, .12, .35)); }
    }, { s, rot, lw: 10 });
  });
}

// C 特写：脸从下往上红透，前两拍各冒一股气，第三拍「噗」
function shotC(t, lt) {
  const heat = ease(seg(t, 36.2, 38.3)), k = kick(t, [Q[2] + .02], 7, 18), jolt = kick(t, [N[0], N[1]], 9, 22);
  push(); cam(960, 540 - heat * 20, lerp(1, 1.12, ease(seg(t, 35.7, 39.3))));
  scribbleFill(rect(-100, -100, W + 200, H + 200), PAL.sky, { c2: PAL.white });
  // 背后几条柳条
  willowStrands(960, -120, 2300, 760, t, k * .6, 1.7, 12, 5);
  const fid = Math.sin(t * 14) * .07 * (.3 + heat);   // 两根食指对戳
  human(960, 1330, 165, {
    face: 0, look: Math.sin(t * 3.5) * .12 * heat, eyes: t > 38.1 ? 'spiral' : 'wide', gaze: [0, -.2], mouth: t > 37.2 ? 'wobble' : 'o',
    heat, blush: .4 + heat * .6, steam: seg(t, 37.5, 38.4) + jolt * 2, shake: heat * .7 + Math.abs(jolt) * 2, ahoge: k * 1.8 + jolt * 1.2,
    sq: jolt * .12, arms: { L: [-.16 + fid, 1.3], R: [.16 - fid, 1.3] } }, 'him');
  // 汗珠
  if (heat > .3) { const dy = frac(t * .8) * 120; blob([[1170, 330 + dy], [1190, 380 + dy], [1170, 395 + dy], [1152, 380 + dy]], PAL.water, { d: 'heavy', line: PAL.ink, lw: 4 }); }
  pop();
  poof(960, 520, 520, (t - N[2] + .05) / .6);
}

// D 烟散了，只剩一只呆头鸟；她笑出声，发带松开，红线把鸟缠成一团，系个蝴蝶结；一拽，鸟蹦过去
function threadPath(t, S, B, u) {
  const k1 = ease(seg(t, WRAP0, WRAP0 + .9)), k2 = ease(seg(t, WRAP0 + .6, BAR5 - .1));
  const pts = [];
  const E = [B[0] + u * 1.4, B[1] - u * 1.5];
  for (let i = 0; i <= 20; i++) { const q = i / 20, x = lerp(S[0], E[0], q), y = lerp(S[1], E[1], q) - Math.sin(q * Math.PI) * 180 + Math.sin(q * 9 + t * 5) * 18 * (1 - k2); pts.push([x, y]); }
  const lead = pts.slice(0, Math.max(2, Math.round(20 * k1) + 1));
  if (k1 < 1) return lead;
  const loops = 3 * k2, n = Math.max(2, Math.round(loops * 16));
  for (let i = 1; i <= n; i++) { const a = i / 16 * TAU, r = u * (1.35 - .25 * i / 48), yy = B[1] - u * 1.5 + i / 48 * u * .9; pts.push([B[0] + Math.cos(a) * r, yy + Math.sin(a) * r * .38]); }
  return pts;
}
function shotD(t, lt) {
  const u = 70, bx0 = 820, hop = ease(seg(t, 43.25, 43.85)), bx = lerp(bx0, 1080, hop), by = 935 - Math.sin(hop * Math.PI) * 170;
  const ccx = lerp(1010, 1050, ease(seg(t, 39.3, 44))), cz = lerp(1.7, 1.6, ease(seg(t, 39.3, 44)));
  push(); cam(ccx, 700, cz);
  riverside(t);
  const gt = seg(t, 39.8, 40.1), gig = Math.abs(Math.sin(t * TAU * 1.2)) * seg(t, 39.9, 40.2) * (1 - seg(t, 41.6, 42));
  const tug = spring(t, 43.2, 6, 14);
  const her = { face: -1, look: -.9, eyes: t < 41.8 ? (gt > .5 ? 'happy' : 'dot') : 'arc', mouth: t < 41.8 ? 'smile' : 'cat', blush: .6,
    arms: t < 42.6 ? { L: [-.4, 2.1], R: [-.55, -.1] } : { L: [-.4, 2.1], R: [-1.1 + tug * .6, 1.2] }, handsOver: ['R'], sq: gig * .03, noRibbon: t > WRAP0 ? [-1] : [] };
  human(1250, 935, 62, her, 'her');
  // 鸟
  const wrapK = ease(seg(t, WRAP0 + .6, BAR5 - .1)), appear = seg(t, N[2] + .18, N[2] + .3);
  if (appear > 0) {
    const land = spring(t, 43.85, 8, 20);
    bird(bx, by, u, { puff: (1 - seg(t, 39.4, 40.2)) + wrapK * .3 * (1 - seg(t, 42.9, 43.2)), blink: [40.15, 40.45].some(b => Math.abs(t - b) < .07) ? 1 : 0,
      rot: Math.sin(t * 2) * .08 + (wrapK > 0 && wrapK < 1 ? Math.sin(t * 25) * .12 : 0), eyes: wrapK > .2 && t < 42.9 ? 'spiral' : null,
      gaze: t > 42.9 ? [[.6, -.1], [.6, -.1]] : undefined, ahoge: spring(t, N[2] + .2, 6, 16) * 1.5, sq: wrapK * .12 + land * .25 + (hop > 0 && hop < 1 ? -.12 : 0),
      heat: t > 42.9 ? 1 : 0, step: hop > 0 && hop < 1 ? t * 3 : 0 });
    // 红线
    if (t > WRAP0) {
      const S = [1240, 935 - 62 * 5.5];
      const P = threadPath(t, S, [bx, by - (hop ? 0 : 0)], u).map(([x, y]) => [x + (x - S[0]) * 0, y]);
      stroke(P, 7, PAL.red, { d: 'heavy', j: 1.5, w0: .8, w1: 1 });
      if (t > BAR5 - .1) { const bk = backOut(seg(t, BAR5 - .1, BAR5 + .2)); blob([[bx, by - u * 2.35], [bx - u * .5 * bk, by - u * 2.6], [bx - u * .45 * bk, by - u * 2.1]], PAL.red, { d: 'solid' }); blob([[bx, by - u * 2.35], [bx + u * .5 * bk, by - u * 2.6], [bx + u * .45 * bk, by - u * 2.1]], PAL.red, { d: 'solid' }); }
    }
  }
  for (let i = 0; i < 9; i++) feather(bx0 + (hash(i) - .5) * 160, 840, 60, t - N[2] - .1 - i * .06, i + 3);
  pop();
  poof((bx0 - ccx) * cz + W / 2, (840 - 700) * cz + H / 2, 420, (t - N[2] + .05) / .6);
  flash(seg(t, CHORUS - .12, CHORUS));
}

const DEMO_T0 = 28.3;
const at = f => (t, lt, len) => f(t + DEMO_T0, lt, len);
shots([[0, at(shotA)], [BT(36) - DEMO_T0, at(shotB)], [BT(40) - DEMO_T0, at(shotC)], [N[2] - DEMO_T0, at(shotD)], [CHORUS - DEMO_T0, () => flash(1)]]);

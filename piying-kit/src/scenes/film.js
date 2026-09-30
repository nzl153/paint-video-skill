// film.js：《两只手》。台口机位是一整段连续的戏（0–35s），按拍号排动作；幕后另起镜头。
// 拍号见 STORYBOARD.md，BT(b) = 第 b 拍的时刻。

const U = 6.3;                          // 小将军的身材
const B = BT;

// ---------- 小将军在台口的动作 ----------
function heroOnStage(t) { return t < B(24) ? heroAct1(t) : t < B(55) ? heroAct2(t) : heroAct3(t); }

// 出场、亮相、耍一段、卡住（拍 8–23）
function heroAct1(t) {
  const P = { seed: 1 }, hits = [B(16), B(18), B(20), B(22)];
  let x, bob = 0, tremble = 0;
  // 出场：拍 8–15 从右边碎步走到台中，每半拍落一次脚
  const w0 = B(8), w1 = B(15), walking = t < w1;
  const ph = Math.PI * (Math.min(t, w1) - w0) / (BEAT / 2) + Math.PI / 2, sw = Math.sin(ph);
  x = lerp(2120, 1000, (t - w0) / (w1 - w0) < 1 ? seg(t, w0, w1) * .92 + .08 * easeOut(seg(t, w0, w1)) : 1);
  P.dir = t < B(18) ? -1 : 1;

  if (walking) {
    P.legF = .22 * sw; P.legB = -.22 * sw; bob = -Math.abs(Math.cos(ph)) * 1.6;
    P.armF = [.25 - .28 * sw, .55, 0]; P.armB = [-.15 + .28 * sw, .35, 0];
    P.ling = .1 * Math.cos(ph);
  } else {
    // 拍 15–16 蓄势（胳膊往后收、身子一沉），拍 16「锵」亮相；拍 18 翻身；拍 20 踢腿；拍 22 再亮相，胳膊卡住
    P.armF = kf(t, [[w1, [.25 - .28, .55, 0]], [B(15.7), [-.3, 1.1, .25]], [B(16) - .1, [-.36, 1.15, .28]], [B(16) + .02, [2.4, .35, -.3], easeOut], [B(17.6), [2.4, .35, -.3]], [B(18), [.9, .9, 0], easeOut],
      [B(19.7), [.9, .9, 0]], [B(20) - .08, [.8, 1, 0]], [B(20) + .02, [1.9, .3, 0], easeOut], [B(20.6), [1.9, .3, 0]], [B(21), [.3, .5, 0]], [B(21.8), [-.25, 1.05, .2]], [B(22) - .07, [-.28, 1.08, .2]], [B(22) + .02, [1.05, .3, 0], easeOut], [B(22) + .17, [.58, .55, .05], easeOut], [B(22.8), [.6, .52, .05]], [B(23.4), [.42, .62, .12]]]);
    P.armB = kf(t, [[w1, [-.15 + .28, .35, 0]], [B(15.7), [-.2, .5, 0]], [B(16) - .1, [-.2, .5, 0]], [B(16) + .02, [-.55, 1.75, .4], easeOut], [B(17.6), [-.55, 1.75, .4]], [B(18), [-.4, .5, 0], easeOut],
      [B(19.7), [-.4, .5, 0]], [B(20) - .08, [-.4, .5, 0]], [B(20) + .02, [-1.1, .3, 0], easeOut], [B(20.6), [-1.1, .3, 0]], [B(21), [-.2, .4, 0]], [B(22) + .12, [-.3, .6, 0]]]);
    P.legF = kf(t, [[w1, .22], [B(15.5), .06], [B(16) - .08, .06], [B(16) + .02, .34, easeOut], [B(17.7), .34], [B(18) + .15, .18, easeOut], [B(19.7), .18], [B(19.9), -.08], [B(20) + .02, 1.3, easeOut], [B(20.6), 1.3], [B(21), .16], [B(22) + .1, .22]]);
    P.legB = kf(t, [[w1, -.22], [B(15.5), -.08], [B(16) - .08, -.08], [B(16) + .02, -.3, easeOut], [B(17.7), -.3], [B(18) + .15, -.2, easeOut], [B(19.9), -.2], [B(20) + .02, -.1], [B(20.6), -.1], [B(21), -.18]]);
    P.lean = kf(t, [[w1, 0], [B(15.7), .06], [B(16) - .08, .06], [B(16) + .03, -.04, easeOut], [B(19.8), -.04], [B(20) + .03, -.15], [B(20.6), -.15], [B(21), 0], [B(22), 0], [B(22) + .1, .08, easeOut], [B(22.8), .03]]);
    P.head = kf(t, [[w1, 0], [B(15.7), .1], [B(16) - .08, .1], [B(16) + .03, -.1, easeOut], [B(21.8), -.1], [B(22.4), .02]]);
    // 蹲：拍 15.7 和 21.8 的蓄势往下一沉；拍 18 翻身时小跳一下
    bob = kf(t, [[w1, 0], [B(15.7), 1.8], [B(16) - .08, 1.9], [B(16) + .04, -.6, easeOut], [B(16.6), 0], [B(21.3), 0], [B(21.8), 1.4], [B(22) + .1, 0]]);
    bob -= 5 * Math.sin(Math.PI * seg(t, B(18) - .08, B(18) + .24));
    P.ling = hits.reduce((s, e, i) => s + [.35, .3, .28, .22][i] * spring(t, e, 4.5, 14), 0);
    // 胳膊卡住：猛一下停死，抖，慢慢松下来
    if (t > B(22)) tremble = .05 * Math.sin(58 * t) * Math.exp(-(t - B(22)) * 1.6);
  }
  // 砸到位之后的回弹
  if (!walking) { const kick = .12 * spring(t, B(16), 7, 20) + .08 * spring(t, B(20), 7, 20); P.armF = [P.armF[0] + kick, P.armF[1], P.armF[2]]; }
  P.bob = bob;
  if (tremble) P.armF = [P.armF[0] + tremble, P.armF[1] - tremble * .6, P.armF[2]];
  P.lean = (P.lean ?? 0) + (t > B(22) ? .03 * spring(t, B(22), 5, 22) : 0);
  return { x, P };
}

// 发现、拔河、僵持（拍 24–55）。第四根杆子从右下角伸上来，接在前手上
const YANKS = [32, 34, 36];
function heroAct2(t) {
  const P = { seed: 1 }, b = (t - OFF) / BEAT;
  P.dir = b < 37.5 ? 1 : -1;
  // 位置：三下拽、倒着被拖、翻跟头、被甩向灯、拍回来
  let x = kf(t, [[B(24), 1000], [B(32) - .02, 1000], [B(32) + .18, 1075, easeOut], [B(33.5), 1060], [B(34) - .02, 1060], [B(34) + .18, 1140, easeOut], [B(35.5), 1125],
    [B(36) - .02, 1125], [B(36) + .18, 1210, easeOut], [B(38), 1200], [B(40), 1470, linear], [B(40.8), 1590, easeOut], [B(42), 1590], [B(43), 1180], [B(44) + .06, 1080, easeOut]]);
  // 前手（接着第四根杆子）
  const armF1 = [[B(24), [.42, .62, .12]], [B(25.5), [.42, .62, .12]],
    [B(26) - .05, [.2, .8, 0]], [B(26) + .08, [.78, .3, 0], easeOut], [B(26.4), [.35, .65, .1]],
    [B(27) - .05, [.2, .8, 0]], [B(27) + .08, [.78, .3, 0], easeOut], [B(27.4), [.35, .65, .1]],
    [B(29.9), [.35, .65, .1]], [B(30) + .9, [-2.35, .25, .1]], [B(31.8), [-2.35, .25, .1]]];
  for (const y of YANKS) armF1.push([B(y) - .02, y === 32 ? [-2.35, .25, .1] : [1.0, .35, 0]], [B(y) + .12, [1.5, .05, 0], easeOut], [B(y + 1.6), [1.1, .3, 0]]);
  armF1.push([B(37.49), [1.4, .1, 0]]);
  // 转身之后朝左，前手朝右伸 = 往后拽，数值取反
  const armF2 = [[B(37.5), [-1.4, .1, 0]], [B(40), [-1.5, .05, 0]], [B(42), [-1.5, .05, 0]], [B(43), [-.4, .9, .2]], [B(44) - .01, [-.4, .9, .2]], [B(44) + .06, [2.5, .2, 0], easeOut],
    [B(45.5), [.4, .6, .1]], [B(47.4), [.3, .7, .1]], [B(48) + .15, [-1.35, .1, 0], easeOut]];
  P.armF = b < 37.5 ? kf(t, armF1) : kf(t, armF2);
  P.armB = b < 37.5
    ? kf(t, [[B(24), [-.3, .6, 0]], [B(26), [-.4, .5, 0]], [B(27.5), [-.3, .6, 0]], [B(30) + .2, [.7, 1.5, .3], easeOut], [B(31.8), [.7, 1.5, .3]], [B(32) + .12, [-1.1, .3, 0], easeOut], [B(33.5), [-.5, .5, 0]],
      [B(34) + .12, [-1.2, .3, 0], easeOut], [B(35.5), [-.5, .5, 0]], [B(36) + .12, [-1.2, .3, 0], easeOut], [B(37.49), [-.6, .5, 0]]])
    : kf(t, [[B(37.5), [1.1, .5, 0]], [B(40), [1.3, .4, 0]], [B(42), [1.1, .5, 0]], [B(43), [2.4, .4, 0]], [B(44) + .06, [-2.4, .2, 0], easeOut], [B(45.5), [-.2, .6, 0]], [B(47.4), [-.2, .6, 0]], [B(48) + .15, [1.3, .3, 0], easeOut]]);
  // 腿
  if (b >= 38 && b < 40) { const ph = Math.PI * (t - B(38)) / (BEAT / 4), sw = Math.sin(ph); P.legF = .3 * sw; P.legB = -.3 * sw; }
  else if (b < 37.5) {
    P.legF = kf(t, [[B(24), .22], [B(31.8), .22], [B(32) + .12, .5, easeOut], [B(33.5), .25], [B(34) + .12, .52, easeOut], [B(35.5), .25], [B(36) + .12, .55, easeOut], [B(37.4), .3]]);
    P.legB = kf(t, [[B(24), -.18], [B(31.8), -.18], [B(32) + .12, .1, easeOut], [B(33.5), -.2], [B(34) + .12, .12, easeOut], [B(35.5), -.2], [B(36) + .12, .15, easeOut], [B(37.4), -.2]]);
  } else {
    P.legF = kf(t, [[B(37.5), .2], [B(40), .2], [B(40.15), .95], [B(40.7), .95], [B(40.85), .25], [B(42), .25], [B(43), .6], [B(44) + .06, .75, easeOut], [B(45.5), .2], [B(47.4), .2], [B(48) + .15, .5, easeOut]]);
    P.legB = kf(t, [[B(37.5), -.2], [B(40), -.2], [B(40.15), .75], [B(40.7), .75], [B(40.85), -.2], [B(42), -.2], [B(43), -.5], [B(44) + .06, -.65, easeOut], [B(45.5), -.15], [B(47.4), -.15], [B(48) + .15, -.45, easeOut]]);
  }
  P.lean = kf(t, [[B(24), .03], [B(25), .06], [B(29.8), .04], [B(30) + .3, -.12], [B(31.8), -.1], [B(32) + .1, .24, easeOut], [B(33.5), -.02], [B(34) + .1, .26, easeOut], [B(35.5), -.02], [B(36) + .1, .28, easeOut], [B(37.4), 0],
    [B(37.6), .2], [B(40), .25], [B(40.8), .1], [B(42), .1], [B(44) - .01, -.2], [B(44) + .06, .3, easeOut], [B(45), 0], [B(47.4), 0], [B(48) + .15, .22, easeOut]]);
  P.head = kf(t, [[B(24), .02], [B(25) + .15, .38, easeOut], [B(27.8), .38], [B(28.5), -.02], [B(30) + .1, -.35, easeOut], [B(31.8), -.3], [B(32) + .1, .15], [B(37.4), .05], [B(40), .15], [B(48), .1], [B(48) + .2, .15]]);
  // 蹦：拽的时候脚离地一下；翻跟头走一道弧；被甩向灯时整个人往上飘
  let bob = 0;
  for (const y of YANKS) bob -= 2.5 * Math.sin(Math.PI * seg(t, B(y), B(y) + .25));
  bob -= 5 * Math.sin(Math.PI * seg(t, B(37.5) - .05, B(37.5) + .2));
  bob -= 44 * Math.sin(Math.PI * seg(t, B(40), B(40.85)));
  bob -= kf(t, [[B(42), 0], [B(43), 26], [B(44) - .01, 26], [B(44) + .05, 0, linear]]);
  P.bob = bob;
  P.spin = kf(t, [[B(40), 0], [B(40.85), TAU, ease]]) % TAU + kf(t, [[B(42), 0], [B(43), -.5], [B(44) - .01, -.6], [B(44) + .05, 0, linear]]);
  P.lift = kf(t, [[B(42), 0], [B(43), .85], [B(44) - .01, .9], [B(44) + .05, 0, linear]]);
  // 晕：头和身子画圈
  const dz = seg(t, B(44) + .2, B(45)) * (1 - seg(t, B(47), B(48)));
  P.head += dz * .2 * Math.sin(t * 8.5); P.lean += dz * .07 * Math.sin(t * 4.25 + 1);
  // 僵持：越抖越凶，拍 55 一下定死
  const tr = b >= 48 && b < 55 ? lerp(.006, .06, seg(t, B(48), B(55)) ** 1.5) : 0;
  if (tr) { const s1 = Math.sin(t * 61), s2 = Math.sin(t * 47 + 1); P.armF = [P.armF[0] + tr * s1, P.armF[1], P.armF[2]]; P.lean += tr * .6 * s2; x += tr * 90 * s2; }
  P.ling = [26, 27, 30, 32, 34, 36, 37.5, 40, 44].reduce((s, e) => s + .3 * spring(t, B(e), 4.5, 14), 0) + dz * .25 * Math.sin(t * 5) + (tr ? tr * 3 * Math.sin(t * 53) : 0);
  // 第四根杆子：拍 29.5 从右下伸上来，拍 30 接上；拽的时候往右猛一扯
  const yank = YANKS.reduce((s, y) => s + 70 * Math.sin(Math.PI * seg(t, B(y) - .04, B(y) + .3)), 0);
  const ax = x + kf(t, [[B(29.5), 430], [B(37.4), 430], [B(38), 380], [B(42), 360], [B(48), 470]]) + yank + (tr ? tr * 140 * Math.sin(t * 57) : 0);
  P.rebel = { to: [ax, H + 40], k: kf(t, [[B(29.4), 0], [B(30), 1, easeOut]]) };
  return { x, P };
}

// 松劲、合手、亮相、谢幕（拍 55–95）。幕后那几镜也用这一套姿势，只是镜像着画
const UP = 80;
const rebelX = t => kf(t, [[B(55), 470], [B(72), 470], [B(73.6), -40]]);
function heroAct3(t) {
  const P = { seed: 1, dir: -1 }, x = 1080, up = B(UP);
  // 前手：僵着 → 拍 68 松下来 → 拍 73.5 起两只手一起往上送，一口气送到拍 80 → 拱手
  P.armF = kf(t, [[B(55), [-1.35, .1, 0]], [B(68.3), [-1.35, .1, 0]], [B(69.8), [-.55, .55, .12]], [B(73.5), [-.55, .55, .12]], [up - .12, [2.15, .42, -.2]], [up + .02, [2.4, .35, -.3], easeOut],
    [B(85.5), [2.4, .35, -.3]], [B(87.2), [1.0, 1.5, .3]], [B(90.3), [1.0, 1.5, .3]], [B(91.6), [.35, .6, .1]]]);
  P.armB = kf(t, [[B(55), [1.3, .3, 0]], [B(68.3), [1.3, .3, 0]], [B(69.8), [.35, .5, 0]], [up - .1, [.3, .55, 0]], [up + .02, [-.55, 1.75, .4], easeOut],
    [B(85.5), [-.55, 1.75, .4]], [B(87.2), [.8, 1.7, .3]], [B(90.3), [.8, 1.7, .3]], [B(91.6), [-.15, .4, 0]]]);
  P.legF = kf(t, [[B(55), .5], [B(68.3), .5], [B(69.8), .28], [up - .1, .22], [up + .02, .34, easeOut], [B(85.5), .34], [B(87.2), .08]]);
  P.legB = kf(t, [[B(55), -.45], [B(68.3), -.45], [B(69.8), -.22], [up - .1, -.15], [up + .02, -.3, easeOut], [B(85.5), -.3], [B(87.2), -.08]]);
  P.lean = kf(t, [[B(55), .22], [B(68.3), .22], [B(69.8), .04], [up - .1, .06], [up + .03, -.04, easeOut], [B(85.5), -.04], [B(87.2), 0],
    [B(88) - .12, -.03], [B(88) + .02, .42, easeOut], [B(89.3), .42], [B(90.3), 0]]);
  P.head = kf(t, [[B(55), .15], [B(68.3), .15], [B(69.8), .32], [B(73.5), .3], [B(76.5), .05], [up - .1, .1], [up + .03, -.1, easeOut], [B(85.5), -.1], [B(87.2), 0],
    [B(88) - .12, -.02], [B(88) + .02, .4, easeOut], [B(89.3), .4], [B(90.3), 0]]);
  P.bob = kf(t, [[up - .6, 0], [up - .1, 1.8], [up + .04, -.6, easeOut], [up + .6, 0]]);
  // 砸到顶的回弹
  const kick = .12 * spring(t, up, 7, 20); P.armF = [P.armF[0] + kick, P.armF[1], P.armF[2]];
  // 拍 68 以前两只手还在较劲：细细地抖
  const tr = .012 * (1 - seg(t, B(68.3), B(69)));
  if (tr) { P.armF = [P.armF[0] + tr * Math.sin(t * 61), P.armF[1], P.armF[2]]; P.lean += tr * .5 * Math.sin(t * 47 + 1); }
  P.ling = .12 * spring(t, B(69.8), 3, 9) + .4 * spring(t, up, 4, 13) + .28 * spring(t, B(88) + .02, 4.5, 14) + (tr ? tr * 3 * Math.sin(t * 53) : 0);
  // 第四根杆子：拍 72 那只手挪过来，和另外几根并在一起
  P.rebel = { to: [x + rebelX(t) + (tr ? tr * 140 * Math.sin(t * 57) : 0), H + 40], k: 1 };
  return { x, P, tr };
}

// ---------- 台口（0–35s、47.5–60s） ----------
function stageAct(t) {
  // 点灯：灯芯先抖几下才着稳，再慢慢亮满
  const ig = .3, lampK = t < ig ? 0 : t < ig + .7 ? .22 * (.5 + .5 * Math.sin((t - ig) * 41)) * seg(t, ig, ig + .3) + .15 * seg(t, ig, ig + .7) : lerp(.3, 1, ease(seg(t, ig + .7, 3.4)));
  LAMP = { x: W * .54, y: H * .38, k: lampK };
  if (t > B(44)) LAMP.k *= 1 + .25 * spring(t, B(44), 6, 40);
  if (t > B(UP)) LAMP.k *= 1 + .2 * Math.exp(-(t - B(UP)) * 2.5);
  // 谢幕：拍 90 起灯慢慢暗下去，只剩一点余光，最后全黑
  LAMP.k *= lerp(1, .07, ease(seg(t, B(90), B(95.2)))) * (1 - seg(t, DUR - .6, DUR - .05));
  screen();
  const jolt = 7 * spring(t, B(44), 9, 34); push(); X.translate(jolt * .4, jolt);
  hills({ y: 690, seed: 1 }); hills({ y: 820, col: '#7c9c80', blur: 6, a: .4, amp: 70, seed: 4 });
  // 树：拍 4 从左边推进来，拍 6 落定（落定时轻轻一顿）
  const tx = kf(t, [[B(4), -460], [B(6), 330, easeOut]]) + 8 * spring(t, B(6), 7, 20);
  tree(tx, GROUND, 6.4, { blur: .8 });
  if (t > B(8) - .2) { const { x, P } = heroOnStage(t); puppet(x, GROUND, U, P); }
  pop();
  stageFrame();
}

// ---------- 幕后（35–47.5s，第 7–9 镜） ----------
// 世界坐标：台口那一整幅缩到 .8 倍、左右镜像，挂在上半部；操纵的人坐在幕下面，只剩剪影和一圈轮廓光
const BK = { k: .8, x0: 192, y0: 10 };
const fromFront = (xf, yf) => [BK.x0 + (W - xf) * BK.k, BK.y0 + yf * BK.k];
const CLOTH_BOT = BK.y0 + GROUND * BK.k;

// 拳头：握着一根杆子，a 是杆子的方向；side=-1 左手
function fist(c, x, y, a, s, side, press) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s * side, s);
  // 四根手指叠在杆子外侧，拇指压在上面，腕子从里侧下来
  c.beginPath(); c.ellipse(-2, 0, 25, 30, 0, 0, TAU); c.fill();
  for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(19 + press * 2, -19 + i * 13, 10.5, 7.4, .15, 0, TAU); c.fill(); }
  c.beginPath(); c.ellipse(4, -28, 16, 8.5, -.35, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(-26, 4); c.lineTo(-14, 64); c.lineTo(14, 64); c.lineTo(12, 18); c.closePath(); c.fill();
  c.restore();
}
// 操纵的人：o.cx 身体中线、o.sy 肩线、o.bow 低头、o.L/o.R 两只手 [x, y, 杆子方向]、o.press 攥紧
function puppeteer(c, o) {
  const cx = o.cx, sy = o.sy, hx = cx + 4, hy = sy - 88 + o.bow * 20;
  c.beginPath(); c.moveTo(cx - 40, sy - 40); c.lineTo(cx + 40, sy - 40); c.lineTo(cx + 44, sy); c.lineTo(cx - 44, sy); c.closePath(); c.fill();
  // 肩背：往下一直出画
  c.beginPath(); c.moveTo(cx - 46, sy - 22);
  c.bezierCurveTo(cx - 110, sy - 16, cx - 150, sy - 4, cx - 160, sy + 30); c.lineTo(cx - 190, H * 2); c.lineTo(cx + 190, H * 2); c.lineTo(cx + 160, sy + 30);
  c.bezierCurveTo(cx + 150, sy - 4, cx + 110, sy - 16, cx + 46, sy - 22); c.closePath(); c.fill();
  // 后脑勺、发髻、耳朵
  c.beginPath(); c.ellipse(hx, hy, 60, 70 - o.bow * 6, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(hx, hy - 66 + o.bow * 8, 23, 19 - o.bow * 4, 0, 0, TAU); c.fill();
  c.fillRect(hx - 4, hy - 52 + o.bow * 6, 8, 12);
  for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(hx + sd * 60, hy + 6 + o.bow * 6, 10, 18, sd * .2, 0, TAU); c.fill(); }
  // 胳膊：肩 → 肘（往外往下）→ 手
  for (const [sd, Hd] of [[-1, o.L], [1, o.R]]) {
    const S = [cx + sd * 118, sy + 26], L1 = 150, L2 = 135, dx = Hd[0] - S[0], dy = Hd[1] - S[1], d = Math.min(Math.hypot(dx, dy), L1 + L2 - 1);
    const a0 = Math.atan2(dy, dx), k = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), bend = sd > 0 ? 1 : -1;
    const E = [S[0] + Math.cos(a0 + bend * k) * L1, S[1] + Math.sin(a0 + bend * k) * L1];
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = 62; c.beginPath(); c.moveTo(S[0], S[1]); c.lineTo(E[0], E[1]); c.stroke();
    c.lineWidth = 42; c.beginPath(); c.moveTo(E[0], E[1]); c.lineTo(Hd[0] - Math.sin(Hd[2]) * -40, Hd[1] + Math.cos(Hd[2]) * 40); c.stroke();
    fist(c, Hd[0], Hd[1], Hd[2], 1.4, sd, o.press);
  }
}
// 剪影 + 轮廓光：先画一整块暗的，再在草稿层上取它的边（整块减去它自己糊开的样子），加到画面上
function silhouette(drawFn, rimK, s) {
  const m = X.getTransform();
  X.save(); X.fillStyle = X.strokeStyle = '#0c0705'; drawFn(X); X.restore();
  SX.save(); SX.setTransform(1, 0, 0, 1, 0, 0); SX.globalCompositeOperation = 'source-over'; SX.globalAlpha = 1; SX.filter = 'none'; SX.clearRect(0, 0, W, H);
  SX.setTransform(m); SX.fillStyle = SX.strokeStyle = '#ffb060'; drawFn(SX);
  SX.globalCompositeOperation = 'destination-out'; SX.filter = `blur(${(3.2 * s).toFixed(1)}px)`; SX.fillStyle = SX.strokeStyle = '#000'; drawFn(SX); SX.filter = 'none';
  // 背后是亮幕的地方轮廓光才亮，幕下面慢慢没了
  SX.setTransform(1, 0, 0, 1, 0, 0); SX.globalCompositeOperation = 'destination-in';
  const y0 = m.f + m.d * (CLOTH_BOT - 30), y1 = m.f + m.d * (CLOTH_BOT + 160), g = SX.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); SX.fillStyle = g; SX.fillRect(0, 0, W, H);
  SX.restore();
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalCompositeOperation = 'lighter'; X.globalAlpha = rimK; X.drawImage(SC, 0, 0); X.drawImage(SC, 0, 0); X.drawImage(SC, 0, 0); X.restore();
}

function backstage(t) {
  const { x, P, tr } = heroAct3(t);
  // 镜头：先贴着幕上的小将军 → 顺着杆子往下，到两只手 → 拉开往上，露出低着头的人
  const cam = {
    x: kf(t, [[B(56), 850], [B(59), 840], [B(63), 716], [B(64.6), 712], [B(67.6), 950], [B(76), 930]]),
    y: kf(t, [[B(56), 470], [B(59), 500], [B(63), 880], [B(64.6), 878], [B(67.6), 600], [B(76), 625]]),
    s: kf(t, [[B(56), 1.95], [B(59), 2.0], [B(63), 2.35], [B(64.6), 2.45], [B(67.6), 1.26], [B(76), 1.36]]),
  };
  const focusHands = seg(t, B(60.5), B(62.5)) * (1 - seg(t, B(64.6), B(66.5)));
  LAMP = { x: W * .54, y: H * .38, k: 1 };
  X.fillStyle = '#0a0605'; X.fillRect(0, 0, W, H);
  push(); X.translate(W / 2, H / 2); X.scale(cam.s, cam.s); X.translate(-cam.x, -cam.y);
  // 幕布下沿以下是幕后的暗处，幕上漏下来一点暖光
  const sp = X.createLinearGradient(0, CLOTH_BOT, 0, CLOTH_BOT + 380); sp.addColorStop(0, 'rgba(120,62,26,.55)'); sp.addColorStop(1, 'rgba(120,62,26,0)');
  X.fillStyle = sp; X.fillRect(-400, CLOTH_BOT, W + 800, 380);
  // 幕：用台口那套坐标，镜像着画
  push(); X.translate(BK.x0 + W * BK.k, BK.y0); X.scale(-BK.k, BK.k);
  const R = Math.max(W, H) * .78, g = X.createRadialGradient(LAMP.x, LAMP.y, 0, LAMP.x, LAMP.y, R * flick());
  g.addColorStop(0, PAL.lampHot); g.addColorStop(.3, PAL.lamp); g.addColorStop(.68, PAL.lampMid); g.addColorStop(1, PAL.lampEdge);
  X.save(); X.beginPath(); X.rect(30, 50, W - 60, GROUND - 50); X.clip();
  X.fillStyle = g; X.fillRect(0, 0, W, H);
  // 布纹按屏幕像素 1:1 贴，缩放到 1 倍左右会出摩尔纹
  X.globalCompositeOperation = 'multiply'; X.setTransform(1, 0, 0, 1, 0, 0); X.drawImage(clothC, 0, 0); X.restore();
  DEPTH = 3.5 * focusHands;
  hills({ y: 690, seed: 1, keep: true }); hills({ y: 820, col: '#7c9c80', blur: 6, a: .4, amp: 70, seed: 4, keep: true });
  tree(330, GROUND, 6.4, { blur: .8 });
  const J = puppet(x, GROUND, U, { ...P, rebel: null, rods: false });
  DEPTH = 0;
  // 幕的木框（背面，没有雕花）
  X.fillStyle = '#1c110b'; X.fillRect(-60, 0, W + 120, 50); X.fillRect(-60, GROUND, W + 120, 60); X.fillRect(-60, 0, 90, GROUND + 60); X.fillRect(W - 30, 0, 90, GROUND + 60);
  const lip = X.createLinearGradient(0, GROUND, 0, GROUND + 14); lip.addColorStop(0, 'rgba(190,110,55,.7)'); lip.addColorStop(1, 'rgba(190,110,55,0)'); X.fillStyle = lip; X.fillRect(30, GROUND, W - 60, 14);
  pop();
  // 两只手：左手攥着那根不听话的，右手攥着另外三根。拍 72 左手挪过去和右手并在一起，再一起往上送
  const shake = a => tr * 190 * Math.sin(a), rise = kf(t, [[B(73.5), 0], [B(76), -46]]), join = ease(seg(t, B(72), B(73.6)));
  const Lw = fromFront(x + rebelX(t), H - 4), Rw = fromFront(x - 96, H - 16);
  const L = [Lw[0] + shake(t * 57), Lw[1] + rise + 10 * join + shake(t * 43 + 2) * .5], Rh = [Rw[0] + shake(t * 53 + 1) * .7, Rw[1] + rise * .9 + shake(t * 49) * .4];
  // 杆子：从皮影的关节伸到手里，再往下露一截
  const Ls = here(...L), Rs = here(...Rh), rb = 1.3 + 2.2 * (1 - focusHands) * seg(t, B(56), B(59.5));
  const toward = (A, Bp, ext) => { const dx = Bp[0] - A[0], dy = Bp[1] - A[1], l = Math.hypot(dx, dy); return [Bp[0] + dx / l * ext, Bp[1] + dy / l * ext]; };
  const rw = cam.s * BK.k;
  for (const [j, w] of [[J.neck, 3], [J.handB, 2.4], [J.handF, 2.4]]) rod(j, toward(j, Rs, 70 * cam.s), { w0: w * rw, w1: (w + 4.5) * rw, blur: rb, a: .95 });
  rod(J.handF, toward(J.handF, Ls, 70 * cam.s), { w0: 2.4 * rw, w1: 7 * rw, blur: rb, a: .95 });
  // 人：拍 68 肩膀先一提再一沉，头也更低；合手之后抬起一点
  const drop = kf(t, [[B(67.9), 0], [B(68.4), -7], [B(69.6), 16]]), bow = kf(t, [[B(56), .75], [B(67.9), .75], [B(69.6), 1], [B(73), 1], [B(75.5), .55]]);
  const angL = Math.atan2(J.handF[1] - Ls[1], J.handF[0] - Ls[0]) + Math.PI / 2, angR = Math.atan2(J.neck[1] - Rs[1], J.neck[0] - Rs[0]) + Math.PI / 2;
  const press = 1 - seg(t, B(68.3), B(69.6)), bodyX = 690 + 40 * join;
  silhouette(c => puppeteer(c, { cx: bodyX, sy: 818 + drop, bow, L: [...L, angL], R: [...Rh, angR], press }), .75 + .9 * (flick() - 1), cam.s);
  pop();
  // 暗角
  const v = X.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.05); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
  X.fillStyle = v; X.fillRect(0, 0, W, H);
}

shots([[0, stageAct], [B(56), backstage], [B(76), stageAct]]);

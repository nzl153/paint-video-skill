// cast.js：她、他、呆头鸟，和常用布景。角色都以脚底中点 (x, y) 定位，u = 头半径（像素）。
// 通用姿态参数 P：
//   face  身体朝向 -1..1（0 正面，±1 朝右/朝左侧身）   look  头朝向 -1..1   tilt 头歪（弧度）
//   walk  走路相位（null=站着）  sq 压扁(+)/拉长(-)  dy 离地  shake 抖
//   arms  { L: [x, y], R: [x, y] } 手的位置（相对脖子，单位 u），behind: ['L'] 画在身后
//   eyes  'dot'|'wide'|'arc'|'happy'|'spiral'|'wink'|'side'   gaze [gx, gy]   blink 0..1
//   mouth 'smile'|'o'|'flat'|'grin'|'wobble'|'cat'|'open'  brow 'up'|'smug'|null
//   blush 0..1 腮红   heat 0..1 脸从下往上红透   ahoge 呆毛弹一下（弧度）   steam 0..1

const WHO = {
  her: { robe: PAL.her, robeDk: PAL.herDk, skirt: PAL.skirt, sash: PAL.red, hem: 2.5, faceW: .9, faceH: .82, chin: 0 },
  him: { robe: PAL.him, robeDk: PAL.himDk, skirt: null, sash: PAL.belt, hem: 2.2, faceW: .84, faceH: .86, chin: .08 },
  // 路人：颜色压灰一点，别抢主角
  exM0: { robe: '#9aa37a', robeDk: '#7a8360', skirt: null, sash: '#5e6648', hem: 2.2, faceW: .84, faceH: .86, chin: .08 },
  exM1: { robe: '#b98f6a', robeDk: '#94704f', skirt: null, sash: '#6e5038', hem: 2.3, faceW: .84, faceH: .86, chin: .08 },
  exM2: { robe: '#8f8fa8', robeDk: '#707089', skirt: null, sash: '#4f4f66', hem: 2.2, faceW: .84, faceH: .86, chin: .08 },
  exF0: { robe: '#c7b27a', robeDk: '#a38f5c', skirt: '#efe2c0', sash: '#8a6f9e', hem: 2.5, faceW: .9, faceH: .82, chin: 0, buns: '#8a6f9e' },
  exF1: { robe: '#9cc0b0', robeDk: '#7c9e8f', skirt: '#f1e9d2', sash: '#c9855a', hem: 2.5, faceW: .9, faceH: .82, chin: 0, buns: '#c9855a' },
  exF2: { robe: '#c9a0b8', robeDk: '#a57f95', skirt: '#f3e6d8', sash: '#6f8fb0', hem: 2.5, faceW: .9, faceH: .82, chin: 0, buns: '#6f8fb0' },
};

function arm(sh, hand, u, col, colDk, front = true) {
  const mid = [(sh[0] + hand[0]) / 2 + (hand[0] - sh[0]) * .05, (sh[1] + hand[1]) / 2 + u * .12];
  // 宽袖：一条粗的袖筒 + 袖口
  stroke([sh, mid, hand], u * .62, col, { d: 'heavy', w0: .9, w1: 1.15, j: u * .02 });
  dot(hand[0], hand[1] + u * .06, u * .19, PAL.skin, { j: u * .02 });
}

function feet(x, y, u, P) {
  const w = P.walk, f = P.face || 0;
  for (const s of [-1, 1]) {
    const ph = w == null ? 0 : Math.sin(w * TAU + (s > 0 ? 0 : Math.PI));
    const fx = x + s * u * .42 * (1 - .6 * Math.abs(f)) + (w == null ? 0 : ph * u * .35 * Math.sign(f || 1)), lift = w == null ? 0 : Math.max(0, ph) * u * .22;
    blob(ell(fx + f * u * .12, y - u * .1 - lift, u * .3, u * .15, 10), PAL.ink, { d: 'heavy', j: u * .02 });
  }
}

function human(x, y, u, P = {}, who = 'her') {
  const C = WHO[who], f = P.face || 0, h = P.look ?? f, walk = P.walk;
  const bob = walk == null ? 0 : Math.abs(Math.sin(walk * TAU)) * u * .1;
  const sq = P.sq || 0, sh = P.shake ? [Math.sin(T * 91) * P.shake * u * .06, Math.cos(T * 77) * P.shake * u * .03] : [0, 0];
  push(); X.translate(x + sh[0], y - (P.dy || 0) * u + sh[1]); X.rotate(P.lean || 0); X.scale(1 + sq * .5, 1 - sq); X.translate(-x, -y);   // lean：绕脚底整个人歪
  const yN = y - 4 * u - bob, hw = C.hem * u / 2, sway = walk == null ? (P.hemSway || 0) : Math.sin(walk * TAU * 2) * .12;
  const neck = [x + f * u * .1, yN];
  const arms = P.arms || { L: [-.95, 2.3], R: [.95, 2.3] }, behind = P.behind || [];
  const shL = [x - u * .62 * (1 - .4 * Math.abs(f)) + f * u * .1, yN + u * .45], shR = [x + u * .62 * (1 - .4 * Math.abs(f)) + f * u * .1, yN + u * .45];
  const handOf = k => [neck[0] + arms[k][0] * u, neck[1] + arms[k][1] * u];
  // part:'head' 只画头和 handsOver 的手（躲在树后探头时，树干画在两次之间）
  if (P.part !== 'head') {
  // 身后的手
  for (const k of ['L', 'R']) if (behind.includes(k)) arm(k === 'L' ? shL : shR, handOf(k), u, C.robeDk, C.robeDk);
  feet(x, y, u, P);
  // 袍子：窄肩、下摆张开
  const hemY = y - u * .22, body = [
    [x - u * .32 + f * u * .12, yN], [x - u * .78 + f * u * .1, yN + u * .5], [x - hw * .8 + sway * u, yN + u * 2.2],
    [x - hw + sway * u * 1.4, hemY], [x + sway * u, hemY + u * .1], [x + hw + sway * u * 1.4, hemY], [x + hw * .8 + sway * u, yN + u * 2.2],
    [x + u * .78 + f * u * .1, yN + u * .5], [x + u * .32 + f * u * .12, yN]];
  if (C.skirt) {
    blob(body, C.skirt, { d: 'heavy', j: u * .03 });
    blob([[x - u * .32 + f * u * .12, yN], [x - u * .8 + f * u * .1, yN + u * .5], [x - hw * .78 + sway * u, yN + u * 1.75], [x + f * u * .2, yN + u * 1.95], [x + hw * .78 + sway * u, yN + u * 1.75], [x + u * .8 + f * u * .1, yN + u * .5], [x + u * .32 + f * u * .12, yN]], C.robe, { d: 'heavy', j: u * .03, line: PAL.ink, lw: u * .07 });
    stroke([body[2], body[3], body[4], body[5], body[6]], u * .07, PAL.ink, { j: u * .02 });
  } else blob(body, C.robe, { d: 'heavy', j: u * .03, line: PAL.ink, lw: u * .07 });
  // 交领 + 腰带
  const vx = x + f * u * .38, sy = yN + u * (C.skirt ? 1.62 : 1.55);
  stroke([[x - u * .3 + f * u * .12, yN + u * .02], [vx - u * .05, yN + u * .75], [vx + u * .22, yN + u * 1.05]], u * .2, PAL.collar, { d: 'heavy' });
  stroke([[x + u * .3 + f * u * .12, yN + u * .02], [vx + u * .1, yN + u * .6]], u * .2, PAL.collar, { d: 'heavy' });
  blob([[x - hw * .55 + f * u * .1, sy], [x + hw * .55 + f * u * .1, sy], [x + hw * .56 + f * u * .1, sy + u * .28], [x - hw * .56 + f * u * .1, sy + u * .28]], C.sash, { d: 'heavy', j: u * .02, smooth: false });
  if (who === 'her' || C.buns) { // 腰带垂下的一条
    const tail = [[x + f * u * .3 + u * .1, sy + u * .2], [x + f * u * .3 + u * .15 + Math.sin(T * 3) * u * .05, sy + u * .8], [x + f * u * .3 + u * .05 + Math.sin(T * 3 + 1) * u * .08, sy + u * 1.3]];
    stroke(tail, u * .13, C.sash, { d: 'heavy' });
  }
  for (const k of ['L', 'R']) if (!behind.includes(k) && !(P.handsOver || []).includes(k)) arm(k === 'L' ? shL : shR, handOf(k), u, C.robe, C.robeDk);
  }
  if (P.part === 'body') { pop(); return; }
  // 头
  const hx = neck[0] + (P.headDx || 0) * u, hy = yN - u * .82;
  push(); X.translate(hx, hy + u * .8); X.rotate(P.tilt || 0); X.translate(-hx, -(hy + u * .8));
  head(hx, hy, u, P, who, h);
  pop();
  for (const k of ['L', 'R']) if ((P.handsOver || []).includes(k)) { if (P.handsOnly) { const hp = handOf(k); dot(hp[0], hp[1], u * .19, PAL.skin, { line: PAL.ink, lw: u * .04 }); } else arm(k === 'L' ? shL : shR, handOf(k), u, C.robe, C.robeDk); }
  pop();
}

function head(cx, cy, u, P, who, h) {
  const C = WHO[who], ah = Math.abs(h), back = P.back;
  // 后脑的发髻 / 丸子（被脸挡住一部分）
  if (who === 'her' || C.buns) for (const s of [-1, 1]) {
    const bx = cx + s * u * .78 * (1 - .45 * ah) - h * u * .25, by = cy - u * .78;
    blob(ell(bx, by, u * .38, u * .36, 12), PAL.ink, { d: 'heavy', j: u * .02 });
    // 红发带：蝴蝶结 + 两条飘带
    const rb = [bx + s * u * .15, by + u * .28], wv = Math.sin(T * 2.4 + s) * u * .12 + (P.ribbonWind || 0) * u;
    const bowC = C.buns || PAL.red;
    blob([[rb[0], rb[1]], [rb[0] + s * u * .28, rb[1] - u * .16], [rb[0] + s * u * .26, rb[1] + u * .14]], bowC, { d: 'solid', j: u * .015 });
    if (!(P.noRibbon && P.noRibbon.includes(s))) stroke([rb, [rb[0] + s * u * .3 + wv * .5, rb[1] + u * .5], [rb[0] + s * u * .42 + wv, rb[1] + u * 1.0]], u * .1, bowC, { d: 'heavy', w1: .6 });
  } else {
    // 他：头顶发髻 + 蓝发带
    const bx = cx - h * u * .12, by = cy - u * 1.02;
    blob(ell(bx, by, u * .3, u * .26, 12), PAL.ink, { d: 'heavy', j: u * .02 });
    stroke([[bx - u * .26, by + u * .12], [bx + u * .26, by + u * .12]], u * .12, PAL.belt, { d: 'heavy' });
  }
  // 头发整体（深色头形），再把脸盖上去
  blob(ell(cx - h * u * .26, cy - u * .1, u * (1.02 - .08 * ah), u * .98, 22), PAL.ink, { d: 'heavy', j: u * .025 });
  const fx = cx + h * u * .32, fw = u * C.faceW * (1 - .18 * ah), fh = u * C.faceH;
  const faceC = [fx, cy + u * .2];
  const faceP = () => { const p = []; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, down = Math.max(0, Math.sin(a)); p.push([faceC[0] + Math.cos(a) * fw * (1 - C.chin * down * down), faceC[1] + Math.sin(a) * fh * (1 + C.chin * down)]); } return p; };
  // 耳朵（红透时一起红）
  const earCol = mixCol(PAL.skin, PAL.blush, clamp((P.heat || 0) * 1.3));
  if (!back) {
    const ears = ah < .35 ? [-1, 1] : [-Math.sign(h)];
    for (const s of ears) { const ex = ah < .35 ? cx + s * u * .98 : cx - h * u * .5; blob(ell(ex, cy + u * .22, u * .17, u * .23, 10), earCol, { d: 'heavy', line: PAL.ink, lw: u * .05 }); }
    blob(faceP(), PAL.skin, { d: 'heavy', j: u * .02 });
    if (ah > .5) blob(ell(fx + Math.sign(h) * fw * .96, cy + u * .32, u * .1, u * .09, 10), PAL.skin, { d: 'heavy', edge: false });   // 侧脸的小鼻头
    // 从下往上红透
    const heat = P.heat || 0;
    if (heat > .01) {
      const lev = faceC[1] + fh * (1 + C.chin) - heat * fh * 2.2;
      const p = faceP().map(([px, py]) => [px, Math.max(py, lev + Math.sin(px * .05 + T * 9) * u * .04)]);
      blob(p, PAL.blush, { d: 'mid', j: u * .02, a: .9 });
    }
    // 刘海
    const bang = (who === 'her' || C.buns)
      ? [[fx - fw * 1.02, cy - u * .1], [fx - fw * .55, cy - u * .02], [fx - fw * .2, cy - u * .3], [fx + fw * .2, cy - u * .06], [fx + fw * .6, cy - u * .28], [fx + fw * 1.02, cy - u * .05], [fx + fw * .9, cy - u * .75], [fx - fw * .9, cy - u * .75]]
      : [[fx - fw * 1.02, cy - u * .02], [fx - fw * .4, cy - u * .22], [fx + fw * .1, cy - u * .1], [fx + fw * 1.02, cy - u * .2], [fx + fw * .9, cy - u * .75], [fx - fw * .9, cy - u * .75]];
    blob(bang, PAL.ink, { d: 'heavy', j: u * .02 });
    face(fx, cy + u * .28, u, P, h, fw);
  }
  if (who === 'him') { // 呆毛：发髻前面一根翘起来的，受惊时弹
    const a = (P.ahoge || 0) + Math.sin(T * 5) * .05, bx = cx - h * u * .05, by = cy - u * .98;
    stroke([[bx, by], [bx + Math.sin(a + .5) * u * .35, by - Math.cos(a + .5) * u * .45], [bx + Math.sin(a + .1) * u * .15, by - Math.cos(a) * u * .75]], u * .09, PAL.ink, { d: 'solid', w1: .4 });
  }
  if (P.steam > .01) steam(cx, cy - u * 1.1, u, P.steam);
}

function face(x, y, u, P, h, fw) {
  const ah = Math.abs(h), e = P.eyes || 'dot', g = P.gaze || [0, 0], blink = P.blink || 0;
  const eyes = [-1, 1].map(s => ({ s, x: x + s * fw * .45 * (1 - .3 * ah) + h * u * .05, far: s * h < -.55 })).filter(o => !(o.far && ah > .8));
  for (const E of eyes) {
    const k = E.far ? .8 : 1, ex = E.x + g[0] * u * .08, ey = y - u * .05 + g[1] * u * .06;
    const kind = e === 'wink' ? (E.s > 0 ? 'arc' : 'dot') : e;
    if (blink > .6 && kind !== 'spiral') { stroke([[ex - u * .12, ey], [ex + u * .12, ey]], u * .06, PAL.ink); continue; }
    if (kind === 'dot' || kind === 'side') blob(ell(ex + (kind === 'side' ? Math.sign(h || 1) * u * .05 : 0), ey, u * .09 * k, u * .13 * k * (1 - blink), 10), PAL.ink, { d: 'solid', j: u * .01, edge: false });
    else if (kind === 'wide') { blob(ell(E.x, ey, u * .2 * k, u * .22 * k, 12), PAL.white, { d: 'solid', line: PAL.ink, lw: u * .05, j: u * .01 }); dot(E.x + g[0] * u * .08 + E.s * u * .03, ey + g[1] * u * .05, u * .055, PAL.ink); }
    else if (kind === 'arc') stroke([[ex - u * .13, ey + u * .03], [ex, ey - u * .08], [ex + u * .13, ey + u * .03]], u * .06, PAL.ink);
    else if (kind === 'happy') stroke([[ex - u * .13, ey - u * .04], [ex, ey + u * .06], [ex + u * .13, ey - u * .04]], u * .06, PAL.ink);
    else if (kind === 'spiral') { const p = []; for (let i = 0; i < 26; i++) { const a = i * .6 + T * 14 * E.s, r = u * .012 * i * .6; p.push([E.x + Math.cos(a) * r, ey + Math.sin(a) * r]); } stroke(p, u * .045, PAL.ink, { j: 0 }); }
  }
  if (P.brow) for (const E of eyes) {
    const bx = E.x, by = y - u * .32, s = E.s;
    if (P.brow === 'smug') stroke([[bx - u * .12, by + (s > 0 ? u * .04 : -u * .02)], [bx + u * .12, by + (s > 0 ? -u * .04 : u * .04)]], u * .05, PAL.ink);
    else stroke([[bx - u * .1, by - u * .02], [bx, by - u * .08], [bx + u * .1, by - u * .02]], u * .05, PAL.ink);
  }
  const bl = clamp((P.blush ?? .35));
  if (bl > .02) for (const E of eyes) blob(ell(E.x + E.s * u * .1, y + u * .17, u * .17, u * .09, 10), PAL.blush, { d: 'mid', a: bl, edge: false, j: u * .015 });
  const mx = x + h * u * .12, my = y + u * .3, m = P.mouth || 'smile';
  if (m === 'smile') stroke([[mx - u * .1, my - u * .02], [mx, my + u * .05], [mx + u * .1, my - u * .02]], u * .05, PAL.ink);
  else if (m === 'cat') stroke([[mx - u * .16, my - u * .04], [mx - u * .08, my + u * .04], [mx, my - u * .02], [mx + u * .08, my + u * .04], [mx + u * .16, my - u * .04]], u * .045, PAL.ink);
  else if (m === 'o') blob(ell(mx, my + u * .02, u * .06, u * .08, 10), PAL.ink, { d: 'solid' });
  else if (m === 'open') blob([[mx - u * .12, my - u * .02], [mx + u * .12, my - u * .02], [mx, my + u * .14]], '#b5493f', { d: 'solid', line: PAL.ink, lw: u * .04 });
  else if (m === 'flat') stroke([[mx - u * .08, my], [mx + u * .08, my]], u * .05, PAL.ink);
  else if (m === 'wobble') stroke([[mx - u * .16, my], [mx - u * .08, my - u * .04], [mx, my + u * .02], [mx + u * .08, my - u * .04], [mx + u * .16, my]], u * .045, PAL.ink);
  else if (m === 'grin') blob([[mx - u * .16, my - u * .04], [mx + u * .16, my - u * .04], [mx + u * .1, my + u * .1], [mx - u * .1, my + u * .1]], '#b5493f', { d: 'solid', line: PAL.ink, lw: u * .04 });
}

// 头顶冒热气：三股向上飘的卷
function steam(x, y, u, k) {
  for (let i = 0; i < 3; i++) {
    const ph = frac(T * .9 + i / 3), sx = x + (i - 1) * u * .55, a = clamp(k) * Math.sin(ph * Math.PI);
    const p = []; for (let j = 0; j < 9; j++) { const q = j / 8; p.push([sx + Math.sin(q * 5 + T * 4 + i) * u * .14, y - ph * u * .8 - q * u * .7]); }
    stroke(p, u * .12, PAL.white, { d: 'heavy', a: a * .95, w0: .5, w1: 1.1 });
  }
}

// 呆头鸟：圆滚滚，身子是他的蓝袍色，肚子是领口的米白，头顶留着他的发髻和呆毛
// P.pink：她变的粉色呆头鸟，头上是两个丸子和红蝴蝶结
function bird(x, y, u, P = {}) {
  const f = P.face || 0, sq = P.sq || 0, blink = P.blink || 0, pk = !!P.pink;
  const bodyC = pk ? PAL.her : PAL.him, bodyDk = pk ? PAL.herDk : PAL.himDk, belly = pk ? PAL.skirt : PAL.collar;
  push(); X.translate(x, y - (P.dy || 0) * u); X.rotate(P.rot || 0); X.scale(1 + sq * .4, 1 - sq); X.translate(-x, -y);
  // 腿
  for (const s of [-1, 1]) {
    const lx = x + s * u * .32, st = P.step ? Math.max(0, Math.sin(P.step * TAU + (s > 0 ? 0 : Math.PI))) * u * .15 : 0;
    stroke([[lx, y - u * .45], [lx, y - u * .05 - st]], u * .09, PAL.beak, { d: 'solid' });
    stroke([[lx - u * .16, y - st], [lx, y - u * .08 - st], [lx + u * .18, y - st]], u * .08, PAL.beak, { d: 'solid', smooth: false });
  }
  const by = y - u * 1.3;
  // 炸毛
  if (P.puff > .01) for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + hash(i) * .3, r0 = u * .95, r1 = u * (1.1 + P.puff * .35 * (.6 + hash(i + 9) * .6)); stroke([[x + Math.cos(a) * r0, by + Math.sin(a) * r0 * 1.05], [x + Math.cos(a) * r1, by + Math.sin(a) * r1 * 1.05]], u * .1, bodyC, { d: 'heavy', w1: .3 }); }
  blob(ell(x, by, u * 1.0, u * 1.05, 24), bodyC, { d: 'heavy', j: u * .025, line: PAL.ink, lw: u * .07 });
  blob(ell(x + f * u * .25, by + u * .38, u * .62, u * .55, 18), belly, { d: 'heavy', j: u * .02 });
  // 翅膀
  for (const s of [-1, 1]) {
    const fl = (P.flap || 0) * Math.sin(T * 30 + s), wx = x + s * u * .95, wy = by + u * .2;
    blob(ell(wx + s * u * .08, wy - fl * u * .2, u * .22, u * .42, 12, s * (.35 + fl * .5)), bodyDk, { d: 'heavy', j: u * .02, line: PAL.ink, lw: u * .05 });
  }
  // 发髻 + 呆毛
  const tx = x + f * u * .1, ty = by - u * 1.0;
  if (pk) for (const s of [-1, 1]) {
    const bx = tx + s * u * .42, byy = ty + u * .12;
    blob(ell(bx, byy, u * .27, u * .25, 12), PAL.ink, { d: 'heavy' });
    const rb = [bx + s * u * .12, byy + u * .2];
    blob([[rb[0], rb[1]], [rb[0] + s * u * .22, rb[1] - u * .13], [rb[0] + s * u * .2, rb[1] + u * .11]], PAL.red, { d: 'solid' });
  }
  if (!pk) {
  blob(ell(tx, ty, u * .28, u * .22, 12), PAL.ink, { d: 'heavy' });
  stroke([[tx - u * .24, ty + u * .1], [tx + u * .24, ty + u * .1]], u * .1, PAL.belt, { d: 'heavy' });
  const a = (P.ahoge || 0) + Math.sin(T * 5) * .06;
  stroke([[tx, ty - u * .1], [tx + Math.sin(a + .5) * u * .32, ty - u * .1 - Math.cos(a + .5) * u * .4], [tx + Math.sin(a + .1) * u * .12, ty - u * .1 - Math.cos(a) * u * .68]], u * .08, PAL.ink, { d: 'solid', w1: .4 });
  }
  // 眼：两只大白眼，瞳孔各看各的（呆）
  const ey = by - u * .3, g = P.gaze || [[-.4, .2], [.5, -.1]];
  for (const [i, s] of [-1, 1].entries()) {
    const ex = x + f * u * .3 + s * u * .34;
    if (blink > .6) { stroke([[ex - u * .15, ey], [ex + u * .15, ey]], u * .06, PAL.ink); continue; }
    blob(ell(ex, ey, u * .25, u * .27 * (1 - blink), 14), PAL.white, { d: 'solid', line: PAL.ink, lw: u * .05, j: u * .01 });
    if (P.eyes === 'spiral') { const p = []; for (let j = 0; j < 22; j++) { const aa = j * .65 + T * 14 * s, r = u * .009 * j; p.push([ex + Math.cos(aa) * r, ey + Math.sin(aa) * r]); } stroke(p, u * .04, PAL.ink, { j: 0 }); }
    else dot(ex + g[i][0] * u * .1, ey + g[i][1] * u * .1, u * .075, PAL.ink);
    if (P.shine && blink <= .6) { dot(ex + g[i][0] * u * .1 + u * .04, ey + g[i][1] * u * .1 - u * .05, u * .035, PAL.glow, { d: 'solid' }); }
  }
  // 喙 + 腮红
  const bx = x + f * u * .35, bky = by - u * .02;
  blob([[bx - u * .17, bky - u * .03], [bx + u * .17, bky - u * .03], [bx + f * u * .15, bky + u * .2]], PAL.beak, { d: 'solid', line: PAL.ink, lw: u * .04, smooth: false });
  for (const s of [-1, 1]) blob(ell(x + f * u * .3 + s * u * .6, by + u * .02, u * .17, u * .09, 10), PAL.blush, { d: 'mid', a: .7 + (P.heat || 0) * .3, edge: false });
  if (P.steam > .01) steam(x, by - u * 1.1, u * .8, P.steam);
  pop();
}

// 羽毛：从 (x0,y0) 飘落，age 秒
function feather(x0, y0, u, age, seed, pink = false) {
  if (age < 0 || age > 3) return;
  const x = x0 + Math.sin(age * 3 + seed) * u * .8 + (hash(seed) - .5) * u * 3 * easeOut(age * 2), y = y0 - u * 1.2 * easeOut(age * 3) + age * age * u * .5 + age * u * .8;
  const r = Math.sin(age * 4 + seed) * .8;
  push(); X.translate(x, y); X.rotate(r);
  blob(ell(0, 0, u * .12, u * .3, 10), hash(seed + 3) > .5 ? (pink ? PAL.her : PAL.him) : (pink ? PAL.herDk : PAL.himDk), { d: 'heavy', a: 1 - seg(age, 2.2, 3) });
  pop();
}

// ---------- 布景 ----------
// 柳树：树干 + 树冠 + 垂下的柳条。kickAmt 让柳条被「摇」一下
function willow(x, y, s, t, kickAmt = 0, o = {}) {
  const nt = c => NIGHT_TINT ? mixCol(c, '#2a3f5c', NIGHT_TINT) : c;
  const tw = 60 * s, th = 520 * s;
  blob([[x - tw, y], [x - tw * .6, y - th * .5], [x - tw * .35 + 10 * s, y - th], [x + tw * .4, y - th], [x + tw * .5, y - th * .5], [x + tw * .9, y]], nt(PAL.trunk), { d: 'heavy', line: PAL.ink, lw: 6 * s, j: 2 * s });
  stroke([[x - tw * .2, y - th * .15], [x, y - th * .45], [x - tw * .1, y - th * .75]], 5 * s, mixCol(PAL.trunk, PAL.ink, .5), { d: 'mid' });
  // 树冠
  const cy = y - th - 40 * s;
  for (let i = 0; i < 6; i++) { const a = (i - 2.5) / 5, bx = x + a * 420 * s, byy = cy + Math.abs(a) * 60 * s - 30 * s; blob(ell(bx, byy, 190 * s, 110 * s, 16), nt(i % 2 ? PAL.leafDk : PAL.leaf), { d: 'mid', j: 5 * s, d2: 'light', c2: nt(PAL.leafLt) }); }
  // 柳条：从树冠底下先往外、再垂下来
  willowStrands(x, cy + 30 * s, 820 * s, 360 * s, t, kickAmt, s, o.n || 22);
}
// 一排垂下的柳条（也给特写镜头当前景/背景用）。x 中心，y 起点，span 左右铺开，L 平均长度
function willowStrands(x, y, span, L0, t, kickAmt = 0, s = 1, n = 22, seed = 0) {
  for (let i = 0; i < n; i++) {
    const a = (i + .5) / n - .5, sx = x + a * span, sy = y + Math.abs(a) * 90 * s + hash(i + seed) * 30 * s, L = L0 * (.8 + .6 * hash(i + 3 + seed));
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const q = k / 8, sw = (Math.sin(t * 1.2 + i * .9 + seed) * 16 + kickAmt * 55 * Math.sin(i * 1.7 + 1)) * s * q * q;
      pts.push([sx + a * 170 * s * Math.sin(q * 1.6) + sw, sy + q * L - Math.sin(q * Math.PI) * 12 * s]);
    }
    const nt = c => NIGHT_TINT ? mixCol(c, '#2a3f5c', NIGHT_TINT) : c, col = nt([PAL.leaf, PAL.leafDk, PAL.leaf][i % 3]), colLt = nt(PAL.leafLt);
    stroke(pts, 6 * s, col, { d: 'heavy', w0: 1.1, w1: .6 });
    reseed(i + seed); const pl = through(pts, 3);
    wax(pl, 30 * s, c => {
      for (let k = 1; k < pl.length; k++) {
        const [lx, ly] = pl[k], side = k % 2 ? 1 : -1, len = (11 + 5 * hash(k + i)) * s;
        c.fillStyle = (k + i) % 3 ? colLt : col;
        c.beginPath(); c.ellipse(lx + side * len * .55, ly + len * .25, 4.5 * s, len, side * .55, 0, TAU); c.fill();
      }
    }, { d: 'heavy', ang: 80 });
  }
}
function tuft(x, y, s, col = PAL.leafDk) { stroke([[x - 14 * s, y], [x - 8 * s, y - 26 * s]], 5 * s, col, { d: 'heavy' }); stroke([[x, y], [x + 2 * s, y - 34 * s]], 5 * s, col, { d: 'heavy' }); stroke([[x + 12 * s, y], [x + 18 * s, y - 22 * s]], 5 * s, col, { d: 'heavy' }); }
function flowers(x, y, s, seed) {
  for (let i = 0; i < 5; i++) {
    const fx = x + (hash(seed + i) - .5) * 70 * s, fy = y - hash(seed + i + 9) * 22 * s, col = [PAL.white, PAL.blush, PAL.sun][(seed + i) % 3];
    stroke([[fx, fy + 18 * s], [fx, fy]], 3 * s, PAL.leafDk, { d: 'heavy' });
    dot(fx, fy, 7 * s, col, { d: 'heavy' });
  }
}
function cloud(x, y, s, col = PAL.white) { for (const [dx, dy, r] of [[-70, 10, 55], [0, -15, 72], [75, 8, 50], [20, 25, 60]]) blob(ell(x + dx * s, y + dy * s, r * s * 1.15, r * s * .8, 14), col, { d: 'heavy', edge: false, ang: 5 }); }
// 江南白墙黛瓦，两头马头墙
function house(hx, base, hw, hh, seed, k = 0) {
  const top = base - hh, roofC = TN(k, '#59636f', '#5a5560', '#1f2644'), wallC = TN(k, PAL.white, '#f3d9b5', '#5a6390'), winC = k > 1.3 ? PAL.glow : PAL.inkSoft;
  blob(rect(hx, top, hw, hh), wallC, { d: 'heavy', smooth: false, line: PAL.inkSoft, lw: 3, ang: 85 });
  blob([[hx - 22, top + 10], [hx + 14, top - 26], [hx + hw * .5, top - 30], [hx + hw - 14, top - 26], [hx + hw + 22, top + 10]], roofC, { d: 'heavy', j: 1 });
  for (const s of [0, 1]) { // 马头墙
    const wx = s ? hx + hw - 26 : hx - 6;
    blob(rect(wx, top - 58, 32, 58), wallC, { d: 'heavy', smooth: false, line: PAL.inkSoft, lw: 3 });
    stroke([[wx - 10, top - 58], [wx + 42, top - 58]], 11, roofC, { d: 'heavy', smooth: false });
  }
  if (hash(seed) > .4) blob(rect(hx + hw * .5 - 18, base - 58, 36, 52), PAL.inkSoft, { d: 'mid', smooth: false });
  for (let q = 0; q < 2; q++) blob(rect(hx + hw * (.18 + q * .56), top + hh * .28, 26, 20), winC, { d: k > 1.3 ? 'heavy' : 'mid', smooth: false });
}
// 天色：k 0 白天 → 1 黄昏 → 2 夜
const TN = (k, day, dusk, night) => k <= 1 ? mixCol(day, dusk, k) : mixCol(dusk, night, k - 1);
// 蜡笔边画边显形：layer i 的进度 k（0..1），用锯齿边的裁切往右推，同时记下笔尖位置（画那支蜡笔用）
let REV_TIP = null;
function revealLayer(k, box, col, fn) {
  if (k <= 0) return; if (k >= 1) return fn();
  const [x0, y0, x1, y1] = box, front = lerp(x0 - 80, x1 + 80, k);
  X.save(); X.beginPath(); X.moveTo(x0 - 3000, y0 - 3000);
  for (let y = y0 - 60; y <= y1 + 60; y += 26) X.lineTo(front + ((Math.round(y / 26) % 2) ? 34 : -34) + hash(y) * 20, y);
  X.lineTo(x0 - 3000, y1 + 3000); X.closePath(); X.clip();
  fn(); X.restore();
  const tri = x => 1 - Math.abs(frac(x) * 2 - 1);
  REV_TIP = { x: front + 20, y: lerp(y0 + 20, y1 - 20, tri(T * 2.6)), col };
}
// 河岸全景：天、远山、白墙黛瓦、石拱桥、河、近岸小路。o.tone 天色，o.rev(i) 各层显形进度
function riverside(t, o = {}) {
  const k = o.tone || 0, L = (i, box, col, fn) => o.rev ? revealLayer(o.rev(i), box, col, fn) : fn();
  const sky = o.sky || TN(k, PAL.sky, '#f6c79a', PAL.night), night = seg(k, 1.2, 2);
  L(0, [0, 40, W, 560], sky, () => {
    scribbleFill(rect(-400, -300, W + 800, 950), sky, { c2: TN(k, PAL.white, '#fbe3b8', '#46508a'), ang: 4, under: night > .5 ? '#232a50' : undefined });
    if (o.sun) dot(o.sun[0], o.sun[1], 70, k < 1 ? PAL.sun : '#f39a5a', { d: 'heavy' });
    if (night > 0) for (let i = 0; i < 30; i++) dot(hash(i) * (W + 400) - 200, hash(i + 50) * 420 - 60, 4 + hash(i + 3) * 3, PAL.glow, { a: night * (.6 + .4 * Math.sin(t * 3 + i)), d: 'heavy', base: false });
    if (o.moon) moon(o.moon[0], o.moon[1], o.moon[2] || 80);
    if (night < .6) for (const [cx, cy, s] of [[260, 150, 1], [980, 90, .8], [1600, 190, 1.1]]) cloud(cx + Math.sin(t * .1 + cx) * 20 + t * 4, cy, s, TN(k, PAL.white, '#fde8c8', '#5a6398'));
  });
  L(1, [0, 380, W, 590], '#b2cbb6', () => {
    const hill = [[-400, 560]]; for (let i = 0; i <= 12; i++) hill.push([-400 + i * 230, 470 - Math.sin(i * 1.3) * 45 - Math.sin(i * .5) * 30]); hill.push([W + 400, 560]);
    blob(hill, TN(k, '#b2cbb6', '#c9a98e', '#3e4a78'), { d: 'mid', ang: 25, d2: 'light', c2: TN(k, PAL.white, '#f3d0a8', '#56609a'), smooth: true, under: night > .5 ? '#2a3360' : undefined });
  });
  L(2, [0, 360, W, 615], PAL.roof, () => {
    for (let i = 0; i < 8; i++) {
      const hx = -260 + i * 300 + hash(i) * 70, hw = 170 + hash(i + 1) * 70, hh = 80 + hash(i + 2) * 45;
      if (hash(i + 5) > .45) blob(ell(hx - 30, 560, 70, 65, 14), TN(k, PAL.leafDk, '#7c7a4a', '#2c3a52'), { d: 'heavy', ang: 60 });
      house(hx, 590, hw, hh, i, k);
    }
    blob([[-400, 585], [300, 580], [900, 588], [1500, 579], [W + 400, 586], [W + 400, 612], [-400, 612]], TN(k, '#86a95d', '#9a9258', '#2f4050'), { d: 'heavy', ang: 70, smooth: false });
  });
  L(3, [0, 540, W, 800], PAL.water, () => {
    scribbleFill([[-400, 606], [W + 400, 606], [W + 400, 765], [1400, 772], [700, 790], [-400, 780]], TN(k, PAL.water, '#e8b98f', '#3a4f7e'), { c2: TN(k, PAL.white, '#fbe3b8', '#5a6ca0'), ang: 2, under: night > .5 ? '#26325c' : undefined });
    const bx = 640, bw = 210, stone = TN(k, '#cbbfae', '#d6b894', '#59628a'), inkS = TN(k, PAL.inkSoft, PAL.inkSoft, '#1c2140');
    blob([[bx - bw - 30, 648], [bx - bw, 612], [bx - bw * .5, 566], [bx, 552], [bx + bw * .5, 566], [bx + bw, 612], [bx + bw + 30, 648]], stone, { d: 'heavy', line: inkS, lw: 5, ang: 15, smooth: false, d2: 'light', c2: TN(k, PAL.white, '#f6dcb5', '#7a82aa') });
    stroke([[bx - bw, 606], [bx - bw * .5, 562], [bx, 548], [bx + bw * .5, 562], [bx + bw, 606]], 7, inkS, { d: 'heavy' });
    const arch = []; for (let i = 0; i <= 14; i++) { const a = Math.PI + i / 14 * Math.PI; arch.push([bx + Math.cos(a) * 88, 650 + Math.sin(a) * 74]); }
    blob(arch, TN(k, '#4f7f8f', '#7a6a70', '#1d2448'), { d: 'heavy', smooth: false, ang: 0, line: inkS, lw: 4 });
    const refl = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI; refl.push([bx + Math.cos(a) * 88, 652 + Math.sin(a) * 66]); }
    stroke(refl, 6, TN(k, '#6f9aa6', '#c99a7c', '#2c3a68'), { d: 'heavy' });
    blob([[bx - bw - 30, 652], [bx + bw + 30, 652], [bx + bw, 690], [bx - bw, 690]], TN(k, '#a9c9cc', '#e9c4a0', '#4c5d90'), { d: 'light', smooth: false, a: .8 });
    for (let i = 0; i < 14; i++) { const wx = (i * 197 + t * 26) % (W + 600) - 300, wy = 660 + (i % 4) * 30; stroke([[wx, wy], [wx + 30, wy - 5], [wx + 70, wy]], 4, night > .5 ? PAL.glow : PAL.white, { d: 'heavy', a: night > .5 ? .6 : .9, ang: 0 }); }
    if (o.riverLanterns) riverLanterns(t, o.riverLanterns);
  });
  L(4, [0, 760, W, 1100], PAL.grass, () => {
    scribbleFill([[-400, 775], [600, 792], [1300, 770], [W + 400, 760], [W + 400, H + 300], [-400, H + 300]], TN(k, PAL.grass, '#b9b35e', '#34503f'), { c2: TN(k, PAL.leafLt, '#d8c77a', '#47665a'), ang: -70, under: night > .5 ? '#22382e' : undefined });
    blob([[-400, 880], [300, 858], [900, 868], [1500, 850], [W + 400, 862], [W + 400, 985], [1300, 1000], [600, 990], [-400, 1000]], TN(k, PAL.path, '#e9c28e', '#6e6478'), { d: 'heavy', ang: 12, d2: 'light', c2: TN(k, PAL.white, '#f7dcb0', '#8a7f92') });
    for (let i = 0; i < 14; i++) { const px = -300 + i * 180 + hash(i + 40) * 40; stroke([[px, 866 + hash(i) * 8], [px + 22, 990]], 3, mixCol(TN(k, PAL.path, '#e9c28e', '#6e6478'), PAL.ink, .35), { d: 'mid', smooth: false }); }
    const tf = TN(k, PAL.leafDk, '#8a7a3a', '#1f3328');
    for (let i = 0; i < 12; i++) tuft(-200 + i * 210 + hash(i) * 80, 1050 + hash(i + 7) * 30, 1.2, tf);
    for (let i = 0; i < 6; i++) flowers(-100 + i * 390 + hash(i + 20) * 120, 1030 + hash(i + 21) * 50, 1.1, i * 7);
    for (let i = 0; i < 7; i++) tuft(-100 + i * 330 + hash(i + 50) * 90, 792 + hash(i + 51) * 10, 1, TN(k, '#6f9a4c', '#8a8a44', '#243a30'));
  });
}
// 窗棂：清晨从屋里往外看
function lattice(x, y, w, h, col = PAL.trunk) {
  stroke([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], 22, col, { smooth: false, d: 'heavy' });
  for (let i = 1; i < 4; i++) stroke([[x + w * i / 4, y], [x + w * i / 4, y + h]], 9, col, { smooth: false, d: 'heavy' });
  for (let i = 1; i < 3; i++) stroke([[x, y + h * i / 3], [x + w, y + h * i / 3]], 9, col, { smooth: false, d: 'heavy' });
}
// 灯笼
function lantern(x, y, r, t, seed = 0, lit = 1) {
  const sw = Math.sin(t * 1.6 + seed) * .06;
  push(); X.translate(x, y); X.rotate(sw);
  stroke([[0, -r * 2.2], [0, -r * 1.05]], 4, PAL.ink, { d: 'heavy' });
  // 光晕
  X.save(); X.globalCompositeOperation = 'screen'; const g = X.createRadialGradient(0, 0, 0, 0, 0, r * 3.2); g.addColorStop(0, `rgba(255,200,110,${.45 * lit})`); g.addColorStop(1, 'rgba(255,200,110,0)'); X.fillStyle = g; X.fillRect(-r * 3.2, -r * 3.2, r * 6.4, r * 6.4); X.restore();
  blob(ell(0, 0, r, r * .95, 16), PAL.lantern, { d: 'heavy', line: PAL.ink, lw: 4 });
  blob(ell(0, 0, r * .5, r * .75, 12), PAL.glow, { d: 'mid', edge: false, a: .8 * lit });
  for (const s of [-.45, 0, .45]) stroke([[s * r * .9, -r * .9], [s * r * 1.2, 0], [s * r * .9, r * .9]], 3, PAL.ink, { d: 'mid', a: .7 });
  blob(rect(-r * .45, -r * 1.1, r * .9, r * .2), PAL.red, { d: 'heavy', smooth: false });
  blob(rect(-r * .45, r * .9, r * .9, r * .2), PAL.red, { d: 'heavy', smooth: false });
  stroke([[0, r * 1.1], [Math.sin(t * 3 + seed) * 4, r * 1.7]], 5, PAL.red, { d: 'heavy' });
  pop();
}
// 集中线（漫画式）
function focusLines(cx, cy, w, h, n, col, seed = 0) {
  for (let i = 0; i < n; i++) {
    const a = (i + hash(i + seed) * .6) / n * TAU, r0 = Math.min(w, h) * (.32 + hash(i * 3 + seed) * .12), r1 = Math.max(w, h);
    stroke([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], 7 + hash(i + 5) * 6, col, { d: 'mid', smooth: false, w0: .2, w1: 1.4 });
  }
}
// 噗：蜡笔云团爆开，k 0..1
function poof(x, y, R, k, seed = 0) {
  if (k <= 0 || k >= 1) return;
  const grow = easeOut(k * 1.6), fade = 1 - seg(k, .55, 1);
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * TAU + hash(i + seed), d = R * .55 * grow * (.6 + hash(i + 2) * .5), r = R * (.28 + hash(i + 4) * .22) * (.4 + grow * .8);
    blob(ell(x + Math.cos(a) * d, y + Math.sin(a) * d * .8, r, r * .9, 14), PAL.white, { d: 'heavy', line: PAL.inkSoft, lw: 6, a: fade });
  }
  blob(ell(x, y, R * .55 * (.5 + grow * .6), R * .5 * (.5 + grow * .6), 18), PAL.white, { d: 'solid', a: fade });
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .2, r0 = R * (.7 + grow * .5), r1 = r0 + R * .35 * (1 - k); if (k < .6) stroke([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], 9, PAL.sun, { d: 'heavy', smooth: false }); }
}

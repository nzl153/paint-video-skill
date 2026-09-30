// body.js：人。每段肢体是一块有粗细的形，平涂 + 暗面 + 毛笔勾线，
// 按「后手 → 后腿 → 后摆 → 身子 → 前腿 → 头 → 棍 → 前手」叠起来。后面的手脚压暗一档，前后就分开了。
// 局部坐标：x 朝前，y 朝下，脚底是 0。P.x 是胯在世界里的 x，P.g 是地面，P.dir 朝向，P.u 缩放。
// 姿势：hh 胯高 / lean 前倾 / tw 扭身（>0 前肩往前送）/ head 点头 / air 0 贴地（胯被腿长卡住）1 腾空
//       ff, fb 前后脚 [世界x, 离地]（stepTrack 给）/ hF, hB 手相对肩 / staff { a 角度, gF 前手握处, gB 后手握处 }
//       tuck 腾空时脚收到 rF、rB（相对胯）/ staff.free > .5 后手不握棍
//       brow 眯眼 / wind 风 / vel 身体往前冲的速度（衣摆往后甩）

function ik2(A, G, L1, L2, bend) {
  const dx = G[0] - A[0], dy = G[1] - A[1], d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + .01, L1 + L2 - .01), a = Math.atan2(dy, dx);
  const b = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), e = a - bend * b;
  return [[A[0] + Math.cos(e) * L1, A[1] + Math.sin(e) * L1], [A[0] + Math.cos(a) * d, A[1] + Math.sin(a) * d]];
}
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const rot = (c, v, a) => [c[0] + v[0] * Math.cos(a) - v[1] * Math.sin(a), c[1] + v[0] * Math.sin(a) + v[1] * Math.cos(a)];
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mixCol = (a, b, k) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join(''); };
// 分段线性的粗细表：[[s, 半宽], ...]
const pw = K => s => { for (let i = 0; i < K.length - 1; i++) if (s <= K[i + 1][0]) return lerp(K[i][1], K[i + 1][1], ease((s - K[i][0]) / (K[i + 1][0] - K[i][0]))); return K[K.length - 1][1]; };
const angD = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

// 身材：长度和半宽都是局部单位，身高约 175
const HERO = {
  name: 'hero', th: 44, sh: 42, T: 54, ua: 28, fa: 25, head: 10.5, neck: 6,
  thigh: pw([[0, 11], [.45, 10], [1, 7.2]]), shin: pw([[0, 7.2], [.3, 7.8], [.8, 5.4], [1, 4.4]]),
  upper: pw([[0, 6.2], [.55, 6.8], [1, 7.6]]), fore: pw([[0, 5.2], [.6, 4.4], [1, 3.4]]),
  torso: pw([[0, 12.5], [.35, 10.5], [.68, 12.6], [.88, 11.5], [1, 5]]), fist: 3.8,
  col: {
    skin: ['#e6c4a0', '#b88d6a'], robe: ['#ebe2cd', '#aaa08b'], pants: ['#3a4a62', '#222c3b'], collar: ['#3f6a66', '#29474a'],
    wrap: ['#d6ccb6', '#968c77'], shoe: ['#2a2622', '#16130f'], hair: ['#1d1815', '#0f0c0a'], red: [PAL.red, PAL.redDk], staff: ['#8f6139', '#4e331c'],
  },
};
const BRUTE = {
  name: 'brute', th: 42, sh: 40, T: 60, ua: 31, fa: 29, head: 11, neck: 5,
  thigh: pw([[0, 13.5], [.45, 12.5], [1, 9]]), shin: pw([[0, 9], [.3, 10], [.8, 7], [1, 6]]),
  upper: pw([[0, 10.5], [.25, 11], [.65, 10], [1, 7.5]]), fore: pw([[0, 8], [.35, 9.2], [1, 6.4]]),
  torso: pw([[0, 16], [.3, 18], [.62, 21.5], [.86, 20], [1, 8]]), fist: 7.5,
  col: {
    skin: ['#bd8559', '#7c5035'], pants: ['#524133', '#2e241b'], fur: ['#7d766c', '#4a453e'],
    wrap: ['#c9b48a', '#8a7650'], shoe: ['#2a2622', '#16130f'], hair: ['#1d1815', '#0f0c0a'], belt: ['#a4833f', '#6b5226'],
  },
};

function rig(F, P) {
  const u = P.u, legL = F.th + F.sh, ANK = 6.5;
  const toL = f => [(f[0] - P.x) * P.dir / u, -(f[1] || 0) - ANK];
  let fF = toL(P.ff), fB = toL(P.fb);
  const reach = f => -f[1] + Math.sqrt(Math.max(0, (legL * .985) ** 2 - f[0] * f[0]));
  const hg = Math.min(P.hh, reach(fF), reach(fB)), h = lerp(hg, P.hh, clamp(P.air || 0));
  const hip = [0, -h];
  if (P.tuck) { fF = mix(fF, add(hip, P.rF), clamp(P.tuck)); fB = mix(fB, add(hip, P.rB), clamp(P.tuck)); }   // 腾空：脚跟着胯收起来
  const lean = P.lean || 0, up = [Math.sin(lean), -Math.cos(lean)], fw = [Math.cos(lean), Math.sin(lean)];
  const at = (k, f = 0) => [hip[0] + up[0] * F.T * k + fw[0] * f, hip[1] + up[1] * F.T * k + fw[1] * f];
  const tw = P.tw || 0, ha = lean + (P.head || 0), hu = [Math.sin(ha), -Math.cos(ha)];
  const R = { hip, lean, fw, up, waist: at(.36, .5), chest: at(.68, 2.5), neck: at(1), shF: at(.9, 3 + tw * 7), shB: at(.9, -3 - tw * 7), ha };
  R.nk2 = add(R.neck, hu, F.neck); R.head = add(R.nk2, hu, F.head * .92);
  [R.kneeF, R.ankF] = ik2(hip, fF, F.th, F.sh, 1); [R.kneeB, R.ankB] = ik2(hip, fB, F.th, F.sh, 1);
  R.liftF = P.ff[1] || 0; R.liftB = P.fb[1] || 0;
  [R.elbF, R.hndF] = ik2(R.shF, add(R.shF, P.hF || [16, 30]), F.ua, F.fa, P.bendF ?? -1);
  let hB = add(R.shB, P.hB || [10, 32]);
  if (P.staff) {                                    // 棍跟着前手走，后手去够棍上的握处
    const a = P.staff.a, da = [Math.cos(a), Math.sin(a)], len = P.staff.len || 170;
    let c = add(R.hndF, da, -(P.staff.gF ?? 20));
    // 棍不入地：哪头戳到地面以下，就让棍顺着手滑上去
    for (const e of [-1, 1]) { const y = c[1] + da[1] * e * len / 2; if (y > -1 && Math.abs(da[1]) > .15) c = add(c, da, clamp((-1 - y) / da[1], -70, 70)); }
    R.staff = [add(c, da, -len / 2), add(c, da, len / 2)]; R.staffDir = da;
    if (!(P.staff.free > .5)) hB = add(c, da, P.staff.gB ?? -20);            // free：后手松开
  }
  [R.elbB, R.hndB] = ik2(R.shB, hB, F.ua, F.fa, P.bendB ?? -1);
  return R;
}

// 头的侧影：蛋形 + 下巴 + 鼻尖 + 后脑勺；角度 0 朝前、π/2 朝下
function headPoly(c, r, ha, o = {}) {
  const bump = (a, a0, w, k) => k * Math.exp(-((angD(a, a0) / w) ** 2)), P = [];
  // 鼻子在 .18、下巴在 1.1、后脑在 3.7（弧度）
  for (let i = 0; i < 56; i++) {
    const a = i / 56 * TAU, k = 1 + bump(a, 1.1, .36, o.chin ?? .16) + bump(a, .18, .09, o.nose ?? .09) + bump(a, 3.7, .6, o.skull ?? .07) - bump(a, .55, .1, .04);
    P.push(rot(c, [Math.cos(a) * .86 * r * k, Math.sin(a) * 1.04 * r * k], ha));
  }
  return P;
}
// 头发、胡子：头上一圈角度范围 [a0, a1] 里，外沿 ro、内沿 ri 围成的一片，边缘参差
function capOf(c, r, ha, a0, a1, ro, ri, seed) {
  const P = [], n = 24;
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); P.push(rot(c, [Math.cos(a) * .86 * r * ro, Math.sin(a) * 1.04 * r * ro], ha)); }
  for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n), k = ri * (1 + .12 * (vnoise(i * .9 + seed) - .5)); P.push(rot(c, [Math.cos(a) * .86 * r * k, Math.sin(a) * 1.04 * r * k], ha)); }
  return P;
}
// 飘带、发尾、衣摆：从 root 出发，一节节被风往后吹。fx 是局部坐标里往前的风（负数就是往后吹）
function ribbon(root, n, segL, fx, droop, seed, amp = 1) {
  const pts = [root];
  for (let k = 1; k <= n; k++) {
    const ph = T * (8 + seed % 3) - k * .9 + seed, fl = Math.sin(ph) * (.4 + Math.abs(fx) * .5) * amp;
    const p = pts[k - 1], a = Math.atan2(droop + fl * .6, fx) + fl * .25 * k / n;
    pts.push([p[0] + Math.cos(a) * segL, p[1] + Math.sin(a) * segL]);
  }
  return pts;
}

// 一片袍裾：上沿 a→b 在腰上，下沿 c→d 是摆，摆的下沿带一点波
function skirt(a, b, c, d) {
  const P = [a, b, mix(b, c, .5), c];
  for (let i = 1; i < 4; i++) { const p = mix(c, d, i / 4); P.push([p[0], p[1] + 2.2 * Math.sin(i * 2.1 + T * 7)]); }
  P.push(d, mix(d, a, .5));
  return spline([...P, a], 2.5);
}

function body(F, P) {
  const R = rig(F, P), u = P.u, dir = P.dir, C = F.col, sd = F.name === 'hero' ? 1 : 50, isH = F.name === 'hero';
  const Ll = [LIGHT[0] * dir, LIGHT[1]];
  const Wd = (P.wind ?? .5), fx = -1.2 * Wd * (isH ? 1 : .6) - 2.2 * Math.abs(P.vel || 0) - .15;   // 局部坐标里的风：往后
  X.save(); X.globalAlpha *= P.a ?? 1; X.translate(P.x, P.g); X.scale(dir * u, u);
  const G = P.ghost;
  const pt = (poly, c, o = {}) => {
    if (G) { X.fillStyle = G; pathOf(X, poly); X.fill(); return; }
    part(poly, c[0], c[1], { light: Ll, d: o.d ?? 3, line: o.line ?? 1.05, seed: sd + (o.s || 0), hi: o.hi });
  };
  const far = c => [mixCol(c[0], c[1], .6), mixCol(c[1], PAL.ink, .3)];
  const line = (pts, w, s, col = PAL.ink) => { if (!G) outline(pts, w, sd + s, Ll, col, false); };

  const foot = (ank, lift, c, s) => {
    const tilt = Math.min(.7, lift * .04);                      // 抬起来的脚脚尖往下垂
    pt([[-4.5, -3], [-5.5, 4], [-3, 6.5], [13, 6.5], [15.5, 4.5], [7, -.5], [2, -3]].map(v => rot(ank, v, tilt)), c, { d: 1.5, s });
  };
  const arm = (sh, elb, hnd, back, s) => {
    const k = back ? far : c => c;
    if (isH) {
      pt(capsule([elb, hnd], F.fore), k(C.pants), { s: s + 1, d: 2.2 });
      pt(blob(hnd[0], hnd[1], F.fist, sd + s, .12, 14), k(C.skin), { s: s + 2, d: 1.4 });
      pt(capsule([sh, elb], F.upper), k(C.robe), { s: s + 5, d: 3 });
      line([mix(sh, elb, .45), add(mix(sh, elb, .7), [2, 3]), add(elb, [-1, 4])], .6, s + 6, k(C.robe)[1]);   // 袖子上的褶
    } else {
      pt(capsule([sh, elb], F.upper), k(C.skin), { s: s, d: 4 });
      pt(capsule([elb, hnd], F.fore), k(C.skin), { s: s + 1, d: 3.5 });
      const w0 = mix(elb, hnd, .55); pt(capsule([w0, hnd], pw([[0, 8], [1, 7]])), k(C.wrap), { s: s + 3, d: 2.5 });
      pt(blob(hnd[0], hnd[1], F.fist, sd + s, .1, 18), k(C.skin), { s: s + 2, d: 3 });
      line([rot(sh, [2, 2], 0), mix(sh, elb, .5), add(elb, [0, 1])], .6, s + 4, k(C.skin)[1]);   // 肱二头肌那道分界
    }
  };
  const leg = (knee, ank, lift, back, s) => {
    const k = back ? far : c => c;
    if (!back) pt(capsule([add(R.hip, R.fw, -7), add(R.hip, R.fw, 7)], pw([[0, F.thigh(0) * 1.05], [1, F.thigh(0) * 1.05]])), C.pants, { s: s + 5, d: 3, line: .6 });
    pt(capsule([add(R.hip, [0, 2]), knee], F.thigh), k(C.pants), { s, d: 3.5 });
    pt(capsule([knee, ank], F.shin), k(C.pants), { s: s + 1, d: 3 });
    pt(capsule([mix(knee, ank, .72), ank], pw([[0, isH ? 5.2 : 7.2], [1, isH ? 4.8 : 6.6]])), k(C.wrap), { s: s + 2, d: 2 });
    foot(ank, lift, k(C.shoe), s + 3);
  };

  // ---- 后手、后腿 ----
  arm(R.shB, R.elbB, R.hndB, true, 10);
  leg(R.kneeB, R.ankB, R.liftB, true, 20);

  // ---- 身后飘的东西 ----
  if (isH) {
    const tk = rot(R.head, [-.35 * F.head, -1.02 * F.head], R.ha);                                            // 发髻
    const tail = ribbon(tk, 6, 6.5, fx, 1.2, 3), tailW = pw([[0, 3.4], [.5, 2.6], [1, .4]]);
    pt(capsule(tail, tailW), C.hair, { line: .6, d: 1, s: 30 });
    const bk = rot(R.head, [-.8 * F.head, -.3 * F.head], R.ha);                                               // 头带的两条尾巴
    for (let j = 0; j < 2; j++) pt(capsule(ribbon(bk, 7, 5.5, fx * (1 + j * .2), .5 + j * .6, 11 + j * 4, 1.4), pw([[0, 1.5], [.8, 1.3], [1, .3]])), C.red, { line: .5, d: .8, s: 31 + j });
    const kb = mix(R.hip, R.kneeB, .82), fl = Math.sin(T * 9) * (1 + Math.abs(fx)) * 1.5;                        // 后片袍裾
    pt(skirt(add(R.waist, R.fw, 2), add(R.waist, R.fw, -11), add(kb, [-10 + fx * 12 + fl, 2 + fx * 3]), add(kb, [3, 4])), far(C.robe), { s: 33, d: 3 });
    for (let j = 0; j < 2; j++) pt(capsule(ribbon(add(R.waist, R.fw, -9), 6, 6, fx * (1.1 + .25 * j), 1 + j * .7, 19 + j * 5, 1.3), pw([[0, 2.4], [.85, 2], [1, .4]])), C.red, { line: .6, d: 1, s: 35 + j });
  } else {
    for (let j = 0; j < 3; j++) {                                                                               // 披的兽皮：从肩往后吹
      const r0 = add(R.neck, R.fw, -4 - j * 2), fl = ribbon(add(r0, R.up, -4 - j * 5), 5, 9 - j, fx * 1.2 - .6, 1.6 + j * .5, 7 + j * 3, 1.2);
      pt(capsule(fl, pw([[0, 9 - j], [.5, 10 - j * 2], [1, 2]])), j === 1 ? C.fur : far(C.fur), { s: 40 + j, d: 3 });
    }
  }

  // ---- 身子 ----
  const spine = [R.hip, R.waist, R.chest, R.neck];
  if (isH) {
    pt(capsule(spine, F.torso), C.robe, { s: 50, d: 4 });
    line([add(R.neck, R.fw, 4), add(R.chest, R.fw, 1), add(R.waist, R.fw, 5)], 1.8, 51, C.collar[0]);      // 交领
    line([add(R.neck, R.fw, -2), add(R.chest, R.fw, 5), add(R.waist, R.fw, 8)], .7, 52);
    pt(capsule([add(R.waist, R.fw, -12), add(R.waist, R.fw, 12)], pw([[0, 4.2], [1, 4.2]])), C.red, { s: 53, d: 1.5 });   // 腰带
  } else {
    pt(capsule(spine, F.torso), C.skin, { s: 50, d: 6 });
    const c = R.chest;
    line([add(c, R.fw, 6), add(add(c, R.fw, 12), R.up, -5), add(add(c, R.fw, 18), R.up, -2)], .9, 51, C.skin[1]);   // 胸大肌下沿
    for (let j = 0; j < 3; j++) line([add(add(R.waist, R.up, 8 - j * 7), R.fw, 11), add(add(R.waist, R.up, 8 - j * 7), R.fw, 16)], .6, 55 + j, C.skin[1]);  // 腹肌
    pt(capsule([add(R.hip, R.up, 6), add(R.waist, R.up, -2)], pw([[0, 17], [1, 17]])), C.pants, { s: 58, d: 3 });
    pt(capsule([add(add(R.waist, R.up, -4), R.fw, -18), add(add(R.waist, R.up, -4), R.fw, 18)], pw([[0, 4.5], [1, 4.5]])), C.belt, { s: 59, d: 1.5 });
  }

  // ---- 前腿、前衣摆 ----
  leg(R.kneeF, R.ankF, R.liftF, false, 60);
  if (isH) {
    const kf2 = mix(R.hip, R.kneeF, .85), fl = Math.sin(T * 9 + 1) * (1 + Math.abs(fx));                        // 前片袍裾
    pt(skirt(add(R.waist, R.fw, 12), add(R.waist, R.fw, -3), add(kf2, [-5 + fx * 2, 3]), add(kf2, [10 + fx * 5 + fl, 3 + fx * 1.5])), C.robe, { s: 65, d: 3 });
    line([add(R.waist, R.fw, 5), mix(add(R.waist, R.fw, 5), add(kf2, [3 + fx * 3, 3]), .6)], .55, 66, C.robe[1]);
  }

  // ---- 头 ----
  const hd = R.head, r = F.head;
  pt(capsule([add(R.neck, R.up, -2), R.nk2, add(R.nk2, [Math.sin(R.ha), -Math.cos(R.ha)], 3)], pw([[0, isH ? 5 : 8.5], [1, isH ? 4.2 : 7]])), C.skin, { s: 70, d: 2 });
  pt(headPoly(hd, r, R.ha, isH ? { chin: .2, nose: .14 } : { chin: .26, nose: .1, skull: .02 }), C.skin, { s: 71, d: r * .3, line: 1.1 });
  if (!G) {
    if (isH) {
      const hair = capOf(hd, r, R.ha, -.5, -4.1, 1.07, .74, 3);
      part(hair, C.hair[0], C.hair[1], { light: Ll, line: .8, seed: 72 });
      const tk = rot(hd, [-.35 * r, -1.02 * r], R.ha); part(blob(tk[0], tk[1], r * .36, 9, .15, 16), C.hair[0], C.hair[1], { light: Ll, line: .8, seed: 73 });
      outline([rot(hd, [.62 * r, -.72 * r], R.ha), rot(hd, [-.1 * r, -1.05 * r], R.ha), rot(hd, [-.9 * r, -.42 * r], R.ha)], 2.2, 74, Ll, PAL.red, false);   // 头带
      const s0 = rot(hd, [.1 * r, -.95 * r], R.ha); outline(ribbon(s0, 4, 3.4, fx - .4, .9, 13, .8), .9, 75, Ll, C.hair[0], false);                   // 额前一绺
    } else {
      part(capOf(hd, r, R.ha, .35, 2.1, 1.16, .72, 5), C.hair[0], C.hair[1], { light: Ll, line: .8, seed: 76 });   // 胡子
      outline([rot(hd, [.25 * r, -.34 * r], R.ha), rot(hd, [.85 * r, -.22 * r], R.ha)], 2.2, 77, Ll, PAL.ink, false); // 眉骨
    }
    const e = rot(hd, [.5 * r, -.1 * r], R.ha), br = clamp(P.brow || 0, 0, 1.5);      // 眼：一道上眼睑 + 瞳仁
    X.save(); X.lineCap = 'round'; X.strokeStyle = PAL.ink; X.lineWidth = r * (.15 - .03 * br);
    pathOf(X, [rot(e, [-.24 * r, -.06 * r + br * .03 * r], R.ha), rot(e, [-.02 * r, -.1 * r + br * .07 * r], R.ha), rot(e, [.17 * r, .03 * r + br * .07 * r], R.ha)], false); X.stroke();
    X.fillStyle = PAL.ink; const ir = rot(e, [.05 * r, .03 * r + br * .05 * r], R.ha); X.beginPath(); X.arc(ir[0], ir[1], r * (.075 - .02 * br), 0, TAU); X.fill();
    if (isH) { X.lineWidth = r * .11; pathOf(X, [rot(e, [-.3 * r, -.36 * r], R.ha), rot(e, [.0 * r, -.38 * r + br * .06 * r], R.ha), rot(e, [.24 * r, -.3 * r + br * .14 * r], R.ha)], false); X.stroke(); }   // 眉
    X.lineWidth = r * .06; const m = rot(hd, [.66 * r, .5 * r], R.ha); pathOf(X, [m, rot(m, [-.18 * r, .02 * r], R.ha)], false); X.stroke();                             // 嘴
    X.lineWidth = r * .07; X.strokeStyle = C.skin[1]; const ea = rot(hd, [-.12 * r, .02 * r], R.ha); pathOf(X, ell(ea[0], ea[1], r * .14, r * .2, 10, R.ha).slice(2, 9), false); X.stroke(); // 耳
    X.restore();
  }
  if (!isH) {                                                                                                  // 兽皮领子盖在肩上
    pt(capsule([add(R.neck, R.fw, -10), add(add(R.neck, R.up, -6), R.fw, 2), add(R.shF, R.up, -10)], pw([[0, 7], [.5, 9], [1, 6]])), C.fur, { s: 80, d: 3 });
  }

  // ---- 棍、前手 ----
  if (R.staff) pt(capsule([R.staff[0], mix(R.staff[0], R.staff[1], .5), R.staff[1]], pw([[0, 2.1], [1, 2.5]]), 5), C.staff, { s: 85, d: 1.2, line: .8 });
  arm(R.shF, R.elbF, R.hndF, false, 90);
  X.restore();

  const W_ = p => [P.x + dir * p[0] * u, P.g + p[1] * u];
  return { hip: W_(R.hip), head: W_(R.head), hndF: W_(R.hndF), hndB: W_(R.hndB), staff: R.staff && R.staff.map(W_), ankF: W_(R.ankF), ankB: W_(R.ankB), shF: W_(R.shF), chest: W_(R.chest) };
}
function jointOf(F, P, key) { const R = rig(F, P), p = key === 'tip' ? R.staff[1] : R[key]; return [P.x + P.dir * p[0] * P.u, P.g + p[1] * P.u]; }

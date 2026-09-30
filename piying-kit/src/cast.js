// cast.js：皮影角色。局部单位 u，身高约 110u；朝右为正（dir=-1 翻转）。
// 关节：腰（腿、躯干）、肩、肘、腕、颈。每一节是一片独立的皮，铆钉处重叠。
// 姿势 P：dir 朝向 / lean 前倾 / head 点头 / armF armB [肩, 肘, 腕]（向前为正，弧度）/ legF legB / walk 步相位
//        lift 离幕（0 贴幕，1 很远：变大变糊变淡，按灯的位置投影放大）/ ling 翎子摆 / seed 手颤错开 / rods 是否画杆
//        spin 整个人绕腰转（翻跟头）/ rebel {to, k} 第四根杆子：从 to 伸到前手，k 是伸上来的进度
// 操纵杆一律往左下斜（操纵的人坐在幕后左边），只有第四根从右下来

const HERO = { robe: PAL.red, hat: PAL.blue, trim: PAL.yellow, face: PAL.leather, hair: PAL.black, boot: PAL.black, feather: '#e0aa4a' };

// ---- 各部件的形状（局部坐标，枢轴在原点，向下为 +y） ----
const FACE = [[-1.5, 0], [-3.8, -4.5], [-5.4, -9], [-6, -10.6], [4.8, -12.8], [5, -10.8], [5.3, -9.8], [7.3, -7.3], [5.7, -6.7], [5.9, -5.9], [5.2, -5.4], [5.5, -4.7], [4.6, -3.9], [4.3, -2.8], [2.6, -1.6], [1, 0]];
const FACE_IN = [[.6, -1.2], [-1.4, -4.6], [-2.2, -8], [-2.2, -10.5], [4, -11.9], [4.2, -10.6], [4.4, -9.7], [6, -7.6], [5, -7.3], [4.9, -6.1], [4.4, -5.5], [4.6, -4.9], [3.8, -4.1], [3.5, -3.1], [2.2, -2.2]];
const HAIR = [[-6, -10.6], [-2.2, -11.4], [-2.2, -8], [-1.5, -4.6], [-3.8, -4.5], [-5.4, -9]];
const HAT = [[-6, -10.6], [4.8, -12.8], [5.4, -14.2], [4.2, -17.5], [1.5, -20.5], [-2.5, -21.8], [-6, -20.6], [-8.3, -17.5], [-8.6, -13.5], [-7.6, -11.2]];
const HATBAND = [[-7.6, -11.2], [-6, -10.6], [4.8, -12.8], [5.4, -14.2], [-8.2, -12.9]];
const RIBBON = [[-8, -13], [-9.4, -12], [-12.6, -2], [-11.8, -.4], [-10.5, -1.6], [-8.4, -9.5]];
const EYE = [[1.6, -8.9], [2.6, -9.5], [3.9, -9.35], [4.4, -8.95], [3.4, -8.75], [2.4, -8.7]];
const BROW = [[.5, -10.1], [2.5, -10.9], [4.5, -11], [4.6, -10.65], [2.5, -10.45], [.8, -9.9]];

const TORSO = [[-8, 1], [8, 1], [9.5, -8], [8.5, -18], [6.5, -26], [3.5, -30], [-1.5, -30.5], [-5, -28], [-7.5, -20], [-9, -9]];
const COLLAR = [[-2.2, -30.4], [3.6, -30], [5, -26.5], [1.2, -23.8], [-3, -26.8]];
const BELT = [[-8.6, -2.4], [8.9, -2.4], [8.7, 1.3], [-8.4, 1.3]];

const ROBE = [[-7.5, -1], [7.5, -1], [9.6, 18], [11, 34], [-9, 35], [-8.4, 17]];
const BOOT = [[-2.6, 33], [4.4, 33], [4.6, 43], [11.6, 45.2], [12.6, 48], [-3.6, 48], [-3, 42]];
const SOLE = [[-3.6, 46.4], [12.4, 46.4], [12.6, 48], [-3.6, 48]];

const UPPER = [[-3, -1.5], [3, -1.5], [3.6, 7], [3.2, 15.5], [-3, 16], [-3.5, 7]];
const FORE = [[-2.8, -.8], [2.8, -.8], [4, 8], [6.5, 15], [5, 17.2], [-4.6, 17.2], [-3.6, 9]];
const CUFF = [[-4.2, 14], [6, 13.4], [6.5, 15], [5, 17.2], [-4.6, 17.2]];
const HAND = [[-1.8, -.3], [1.9, -.4], [2.3, 1.6], [3.9, 2.2], [4.4, 3.4], [3.3, 4.2], [3.5, 5.3], [2.2, 6.2], [-.3, 6.3], [-1.9, 4.8]];

function rivet(c, x, y, r = .7) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = PAL.ink; c.fill(); }

// 翎子：一根又长又弯的雉尾，分节镂空
function feather(len, a0, curl, w, col, po, seed) {
  const N = 26, P = [], L = [], R = []; let x = 0, y = 0, a = a0;
  for (let i = 0; i <= N; i++) {
    const s = i / N; P.push([x, y]);
    const ww = w * (1 - .8 * s) + .25, nx = -Math.sin(a), ny = Math.cos(a);
    L.push([x + nx * ww, y + ny * ww]); R.push([x - nx * ww, y - ny * ww]);
    a += curl / N; x += Math.cos(a) * len / N; y += Math.sin(a) * len / N;
  }
  pc([...L, ...R.reverse()], col, { ...po, ew: .5, seed, cut: c => { for (let i = 3; i < N - 1; i += 3) { const [px, py] = P[i]; cut.dot(c, px, py, w * (1 - .8 * i / N) * .45); } } });
}

function puppet(x, ground, u, P = {}, C = HERO) {
  const dir = P.dir ?? 1, lift = P.lift ?? 0, grow = 1 + .35 * lift, uu = u * grow, sd = P.seed ?? 0;
  if (lift > 0) { x = LAMP.x + (x - LAMP.x) * grow; ground = LAMP.y + (ground - LAMP.y) * grow; }
  const po = { blur: .5 + 18 * lift, a: 1 - .4 * lift };
  const ph = P.walk, sw = ph != null ? Math.sin(ph) : 0;
  const legF = P.legF ?? (ph != null ? .32 * sw : .07), legB = P.legB ?? (ph != null ? -.32 * sw : -.09);
  const bob = P.bob ?? (ph != null ? -Math.abs(Math.cos(ph)) * 1.4 : 0);
  const tr = k => .03 * (vnoise(T * 1.6 + k * 13.1 + sd * 7.7) - .5);   // 操纵者的手颤
  const aF = P.armF || [.28, .55, .1], aB = P.armB || [-.18, .35, 0];
  const out = {};
  // bob 在屏幕坐标里加：翻跟头转到头朝下时，「往上跳」也还是往上
  push(); X.translate(x, ground - 48 * uu + bob * uu); if (P.spin) { X.translate(0, -10 * uu); X.rotate(P.spin); X.translate(0, 10 * uu); } X.scale(uu * dir, uu);
  // 腿：各自一片袍摆 + 一只靴
  const leg = (g, k, back) => {
    push(); X.rotate(-(g + tr(k)));
    pc(ROBE, C.robe, { ...po, seed: sd + k, cut: c => { cut.row(c, -6.8, 30.6, 9.4, 30.2, 9, .95, 'diamond'); cut.wave(c, -7.5, 9.6, 26.6, .7, 4, .45); cut.swirl(c, 1.2, 12, 2.4, .5, 1.25, back ? -1 : 1);
      cut.fill(c, ROBE, 2.3, (c, x, y) => { if (y > 2 && y < 24 && Math.hypot(x - 1.2, y - 12) > 3.4) cut.diamond(c, x, y, .5); }, 1.3, 2.2); }, draw: c => rivet(c, 0, 0) });
    piece([[BOOT, C.boot], [SOLE, C.trim]], { ...po, seed: sd + k + 3, cut: c => cut.row(c, 0, 37, 1, 43, 3, .55) });
    if (!back) out.foot = here(8, 47);
    pop();
  };
  leg(legB, 1, true); leg(legF, 2);
  // 躯干及以上
  push(); X.rotate((P.lean ?? 0) + tr(3));
  const arm = ([sh, el, wr], k, name) => {
    push(); X.translate(k === 5 ? .5 : 3, -26.5); X.rotate(-(sh + tr(k)));
    pc(UPPER, C.robe, { ...po, seed: sd + k, cut: c => { cut.fill(c, UPPER, 1.9, (c, x, y) => cut.dot(c, x, y, .38), 1.1, 2); }, draw: c => rivet(c, 0, 0) });
    X.translate(0, 14.8); X.rotate(-(el + tr(k + 1)));
    piece([[FORE, C.robe], [CUFF, C.trim]], { ...po, seed: sd + k + 1, cut: c => { cut.crescent(c, .3, 6, 1.6, Math.PI / 2); cut.row(c, -3, 15.6, 4.8, 15.2, 5, .45); cut.fill(c, FORE, 1.9, (c, x, y) => { if (y < 12.5 && Math.hypot(x - .3, y - 6) > 2.3) cut.dot(c, x, y, .36); }, 1.1, 2); }, draw: c => rivet(c, 0, 0) });
    X.translate(.4, 16); X.rotate(-(wr + tr(k + 2)));
    pc(HAND, C.face, { ...po, seed: sd + k + 2, ew: .6 });
    out[name] = here(.4, 2.6);
    pop();
  };
  arm(aB, 5, 'handB');
  piece([[TORSO, C.robe], [COLLAR, C.trim], [BELT, C.hair]], { ...po, seed: sd + 4, cut: c => {
    cut.ring(c, 1.5, -16, 4.6, 1); cut.swirl(c, 1.5, -16, 2.6, .5, 1.3, 1, 1); cut.row(c, -6.5, -.6, 7, -.6, 7, .55);
    cut.fill(c, TORSO, 2.1, (c, x, y) => { if (y > -23 && y < -3.8 && Math.hypot(x - 1.5, y + 16) > 5.8) cut.crescent(c, x, y, .72, -Math.PI / 2); }, 1.4, 1.7);
    cut.crescent(c, -5.8, -20, 1.6, 0); cut.crescent(c, -6.8, -12, 1.6, 0); cut.crescent(c, 6.2, -9, 1.5, Math.PI);
  } });
  out.neck = here(1, -27);
  // 头：脸是镂空的「空脸」，只留一圈轮廓、眉和眼
  push(); X.translate(1, -30); X.rotate((P.head ?? 0) + tr(8));
  const ling = P.ling ?? 0;
  push(); X.translate(-2.6, -21);
  feather(44, -2.05 + ling * .5, -2.1 + ling, 1.5, C.feather, po, sd + 20);
  feather(40, -1.9 + ling * .6, -2.3 + ling * 1.2, 1.3, C.feather, po, sd + 21);
  pop();
  piece([[FACE, C.face], [HAIR, C.hair], [HAT, C.hat], [HATBAND, C.trim], [RIBBON, C.trim], [ell(-1.2, -22.6, 2.1, 2.1, 14), C.robe]], { ...po, seed: sd + 9, cut: c => {
    cut.poly(c, FACE_IN);
    cut.row(c, -6.6, -12, 4.2, -13.8, 8, .38); cut.swirl(c, -2.6, -16.8, 2.5, .5, 1.3, -1); cut.crescent(c, 2, -16.5, 1.4, -.6);
    cut.fill(c, HAT, 1.6, (c, x, y) => { if (y < -14.6 && Math.hypot(x + 2.6, y + 16.8) > 3.1 && Math.hypot(x - 2, y + 16.5) > 1.9) cut.dot(c, x, y, .3); }, 1, 1.5);
    cut.row(c, -9.4, -10, -11.4, -3, 4, .45);
  }, draw: c => {
    const f = (P2, col) => { pathOf(c, P2); c.fillStyle = col; c.fill(); c.lineWidth = .35; c.strokeStyle = PAL.ink; c.stroke(); };
    f(BROW, PAL.ink); f(EYE, C.face); c.beginPath(); c.arc(3.45, -9.1, .38, 0, TAU); c.fillStyle = PAL.ink; c.fill();
  } });
  pop();
  arm(aF, 6, 'handF');
  pop(); pop();
  if (P.rods !== false) {
    const ra = { blur: 1.2 + 14 * lift, a: .9 - .35 * lift }, bottom = H + 40;
    rod(out.neck, [out.neck[0] - uu * 16, bottom], { ...ra, w0: 3, w1: 9 });
    rod(out.handF, [out.handF[0] - uu * (P.rodF ?? 5), bottom], ra);
    rod(out.handB, [out.handB[0] - uu * (P.rodB ?? 9), bottom], ra);
    if (P.rebel && P.rebel.k > 0) { const to = P.rebel.to, k = P.rebel.k; rod([lerp(to[0], out.handF[0], k), lerp(to[1], out.handF[1], k)], to, ra); }
  }
  return out;
}

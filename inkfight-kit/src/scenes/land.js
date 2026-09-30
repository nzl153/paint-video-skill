// land.js：设色布景。天暖、山青、崖赭，近处墨重，远处被雾吃掉。
const GROUND = 820;

// 天：上青下暖，一轮朱红落日，几道干笔云
function sky() {
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  const g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, PAL.skyTop); g.addColorStop(.62, PAL.skyLow); g.addColorStop(1, PAL.mist);
  X.fillStyle = g; X.fillRect(0, 0, W, H); X.restore();
  cam(.05);
  const sx = W * .68, sy = 380;
  X.save(); X.globalAlpha = .35; X.filter = 'blur(40px)'; X.fillStyle = PAL.fireLt; pathOf(X, ell(sx, sy, 330, 330, 40)); X.fill(); X.restore();
  X.save(); X.globalAlpha = .92; X.filter = 'blur(2px)'; X.fillStyle = PAL.sun; pathOf(X, ell(sx, sy, 120, 120, 48)); X.fill(); X.restore();
  cam(.1);
  for (let i = 0; i < 6; i++) {
    const y = 150 + i * 62 + 30 * hash(i), x = -300 + hash(i * 3) * W + (T * 12 * (1 + hash(i))) % 300, l = 600 + 500 * hash(i * 5);
    brush([[x, y], [x + l * .5, y - 10 * hash(i * 7)], [x + l, y + 5]], 16 + 22 * hash(i * 2), { col: i % 2 ? PAL.paperLt : PAL.mt1, a: .5, prof: 'sweep', dry: .7, seed: 900 + i });
  }
}
// 一层山：平涂的山形 + 山脊一道墨 + 顺着山形往下的几道皴 + 山脚一抹雾
function range(p, base, amp, col, o) {
  cam(p);
  const ridge = x => base - amp * (Math.pow(vnoise(x / o.fq + o.seed), 1.5) + .3 * vnoise(x / (o.fq * .27) + o.seed * 3));
  const top = []; for (let x = -700; x <= W + 700; x += 24) top.push([x, ridge(x)]);
  wash([...top, [W + 700, H + 300], [-700, H + 300]], col, { a: 1 });
  brush(top, o.line, { col: mixCol(col, PAL.ink, .55), a: .8, prof: x => .35 + .65 * vnoise(x * 14 + o.seed), dry: .6, seed: o.seed * 7, fray: .5 });
  for (let k = 1; k <= 3; k++) {                  // 皴：山脊线往下平移、断成几截，像山体一层层的褶
    for (let i = 0; i < 7; i++) {
      const x0 = -600 + (i + hash(o.seed + k * 7 + i)) * (W + 1200) / 7, l = 180 + 260 * hash(k * 13 + i + o.seed), pts = [];
      for (let x = x0; x <= x0 + l; x += 30) pts.push([x, ridge(x) + k * amp * .16 + 18 * vnoise(x / 90 + k)]);
      if (pts.length > 2 && hash(i * 5 + k + o.seed) > .3) brush(pts, o.line * 1.6, { col: mixCol(col, PAL.ink, .4), a: .35 / k, prof: 'belly', dry: .75, seed: o.seed * 11 + k * 7 + i });
    }
  }
  if (o.trees) for (let i = 0; i < 70; i++) {    // 山脊上的小松：一竖加两三团
    const x = -600 + hash(i * 1.7 + o.seed) * (W + 1200), y = ridge(x) + 4, h = 14 + 16 * hash(i * 3.1);
    if (hash(i * 7.3) < .45) continue;
    X.fillStyle = mixCol(col, PAL.ink, .5);
    for (let j = 0; j < 3; j++) { pathOf(X, ell(x + (j - 1) * 3, y - h * (.35 + j * .25), h * (.45 - j * .1), h * .16, 10)); X.fill(); }
  }
  const g = X.createLinearGradient(0, base - amp * .15, 0, base + 140); g.addColorStop(0, 'rgba(236,224,200,0)'); g.addColorStop(1, 'rgba(236,224,200,.95)');
  X.fillStyle = g; X.fillRect(-2000, base - amp * .15, W + 4000, 2000);          // 雾跟着这层山走（世界坐标），相机上下摇也不会断层
}
function mountains() {
  range(.14, 560, 250, PAL.mt1, { fq: 300, seed: 3, line: 5 });
  range(.28, 660, 230, PAL.mt2, { fq: 240, seed: 7, line: 7, trees: true });
  range(.45, 760, 170, PAL.mt3, { fq: 200, seed: 11, line: 9, trees: true });
}
// 崖顶：一条赭色的顶面，下面是深色岩壁和墨裂
function cliff() {
  cam(1);
  const x0 = -900, x1 = W + 900, g = GROUND, top = [];
  for (let x = x0; x <= x1; x += 30) top.push([x, g - 4 + 10 * (vnoise(x / 110) - .5)]);
  wash([...top, [x1, H + 900], [x0, H + 900]], PAL.rock);
  wash([...top, ...top.slice().reverse().map(([x, y]) => [x, y + 46 + 20 * vnoise(x / 70 + 3)])], PAL.rockTop, { a: .95 });
  wash([...top.map(([x, y]) => [x, y + 30]), ...top.slice().reverse().map(([x, y]) => [x, y + 90 + 30 * vnoise(x / 60)])], PAL.rockDk, { a: .5, soft: 6 });
  brush(top, 9, { col: PAL.ink, prof: x => .4 + .6 * vnoise(x * 11), dry: .5, seed: 71, fray: .6 });
  for (let i = 0; i < 22; i++) {                  // 岩面上横着走的墨裂和几块青绿苔
    const x = x0 + hash(i * 3.7) * (x1 - x0), y = g + 60 + 380 * hash(i * 2.9), l = 60 + 200 * hash(i * 5.1);
    brush([[x, y], [x + l * .5, y + 16 * (hash(i) - .5)], [x + l, y + 30 * (hash(i * 4) - .5)]], 6 + 10 * hash(i), { col: PAL.ink, a: .6, prof: 'sweep', dry: .6, seed: 80 + i });
    if (i % 3 === 0) wash(blob(x + l * .3, y - 14, 30 + 40 * hash(i * 6), i, .4, 14), PAL.mt3, { a: .45, soft: 4 });
  }
}
// 崖边的老松：弯着的干 + 平伸的枝 + 一团团针叶，随风轻晃
function pine(x, y, s, sway = .5) {
  cam(1);
  X.save(); X.translate(x, y); X.scale(s, s);
  const sw = t => Math.sin(T * 1.4 + t) * sway;
  const trunk = [[0, 0], [-20, -90], [10, -190], [60 + sw(0) * 4, -270], [140 + sw(0) * 8, -300]];
  part(capsule(trunk, pw([[0, 22], [.5, 13], [1, 5]])), '#5a4533', '#2e2219', { d: 6, line: 2.2, seed: 5 });
  const tufts = [[140, -310, 90], [60, -280, 70], [-40, -210, 80], [200, -290, 60], [0, -150, 55]];
  tufts.forEach(([tx, ty, r], i) => {
    const o = sw(i) * 6, P = []; for (let k = 0; k < 20; k++) { const a = k / 20 * TAU, rr = r * (1 + .25 * (vnoise(k * .8 + i * 5) - .5) * 2); P.push([tx + o + Math.cos(a) * rr, ty + Math.sin(a) * rr * .38]); }
    part(P, PAL.pine, '#1b2d2a', { d: 8, line: 2, seed: 20 + i, light: [0, -1] });
  });
  X.restore();
}
// 草：一簇簇被风压倒
function grass(o = {}) {
  cam(1);
  const wind = o.wind ?? .6, n = o.n ?? 30;
  for (let i = 0; i < n; i++) {
    const x = -400 + i * (W + 800) / n + 40 * hash(i * 1.3), h = 26 + 40 * hash(i * 2.2), base = GROUND + 2;
    for (let k = 0; k < 4; k++) {
      const sw = wind * (1 + .4 * Math.sin(T * 5 + i + k)) * (.6 + .5 * hash(i * 7 + k)), lx = x + k * 5 - 8;
      brush([[lx, base], [lx - sw * h * .35, base - h * .55], [lx - sw * h * .9, base - h * (.95 - .3 * sw)]], 4 + 2 * hash(i + k), { col: k % 2 ? '#4b5a3a' : PAL.ink, prof: 'sweep', dry: .2, seed: 300 + i * 4 + k });
    }
  }
}
// 风里的落叶：屏幕空间里往左上飘，朱红和赭黄两种
function leaves(o = {}) {
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  const n = o.n ?? 20, v = o.v ?? 320;
  for (let i = 0; i < n; i++) {
    const x = W + 200 - ((hash(i) * (W + 400) + T * v * (.7 + .6 * hash(i * 2))) % (W + 400)), y = (((hash(i * 3) * (H + 200) - T * v * .3 * (.5 + hash(i * 6))) % (H + 200)) + H + 200) % (H + 200) - 100 + 40 * Math.sin(T * 1.7 + i);
    const r = (6 + 7 * hash(i * 5)) * (o.s ?? 1), a = T * (2 + 3 * hash(i * 4)) + i, flip = Math.cos(T * 3 + i * 2);
    X.save(); X.translate(x, y); X.rotate(a); X.scale(1, .35 + .65 * Math.abs(flip));
    X.fillStyle = hash(i * 7) < .5 ? PAL.red : '#c98a3a'; X.globalAlpha = .9;
    pathOf(X, [[-r * 1.3, 0], [-r * .3, -r * .6], [r, -r * .15], [r * 1.3, 0], [r, r * .15], [-r * .3, r * .6]]); X.fill();
    X.strokeStyle = PAL.ink; X.lineWidth = 1.2; X.stroke();
    X.restore();
  }
  X.restore();
}

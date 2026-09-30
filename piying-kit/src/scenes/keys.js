// keys.js：布景零件 + 两张样张（front 正面亮相 / cast 人设表）

// 远山：离幕很远，只剩一层糊掉的淡影
function hills(o = {}) {
  const y0 = o.y ?? 640, sd = o.seed ?? 0, P = [[-40, H]];
  for (let i = 0; i <= 60; i++) { const x = -40 + i * (W + 80) / 60, k = x / W; P.push([x, y0 - (o.amp ?? 110) * (.55 * Math.sin(k * 5.1 + sd) + .3 * Math.sin(k * 11.3 + sd * 2) + .15 * Math.sin(k * 23 + sd))]); }
  P.push([W + 40, H]);
  push(); if (!o.keep) X.setTransform(1, 0, 0, 1, 0, 0); pc(P, o.col || '#93ae98', { blur: o.blur ?? 12, a: o.a ?? .32, ew: 2, mottle: .25 }); pop();
}
// 月亮：一片圆皮，上面镂两朵云
function moon(x, y, r) {
  push(); X.translate(x, y); X.scale(r / 10, r / 10);
  pc(ell(0, 0, 10, 10, 40), PAL.yellow, { blur: 1.5, ew: .35, mottle: .3, cut: c => { cut.swirl(c, -3, 3.5, 3, .45, 1.2, 1); cut.swirl(c, 2.5, 4.2, 2.4, .45, 1.2, -1); cut.row(c, -6, 7, 6, 7, 7, .35); } });
  pop();
}
// 树：树干一片、树冠一片（几团圆叶，里面镂出成排的叶纹）
function tree(x, ground, u, o = {}) {
  push(); X.translate(x, ground); X.scale(u * (o.dir ?? 1), u);
  const TR = [[-7, 0], [7, 0], [5, -20], [6, -40], [10, -52], [17, -60], [15, -62.5], [6, -55], [2.5, -63], [1.5, -76], [-2, -76], [-2, -58], [-8.5, -66], [-12, -64], [-5, -52], [-3.5, -38], [-5.5, -18]];
  pc(TR, '#8a5a3a', { ...o, seed: 50, cut: c => { for (let i = 0; i < 6; i++) cut.crescent(c, -1 + (i % 2) * 2, -6 - i * 8, 1.4, i % 2 ? Math.PI : 0); } });
  const CL = [[18, -66, 13], [2, -84, 17], [-13, -71, 13], [-24, -84, 10], [14, -94, 12], [-8, -98, 11], [28, -80, 9]];
  piece(CL.map(([cx, cy, r]) => [ell(cx, cy, r, r * .92, 28), PAL.green]), { ...o, seed: 51, ew: .7, union: true, cut: c => {
    for (const [cx, cy, r] of CL) for (let yy = -r * .7; yy <= r * .6; yy += 3.4) for (let xx = -r * .75; xx <= r * .75; xx += 3.6) {
      const ox = xx + ((Math.round(yy / 3.4) % 2) ? 1.8 : 0);
      if (Math.hypot(ox, yy) < r * .72) cut.crescent(c, cx + ox, cy + yy, 1.15, -Math.PI / 2);
    }
  } });
  pop();
}

// ---------- 样张 1：正面亮相 ----------
LOOPS.front = t => {
  LAMP = { x: W * .54, y: H * .38, k: 1 };
  screen();
  hills({ y: 690, seed: 1 }); hills({ y: 820, col: '#7c9c80', blur: 6, a: .4, amp: 70, seed: 4 });
  moon(1560, 250, 78);
  tree(330, GROUND, 6.4, { blur: .8 });
  const ling = .14 * Math.sin(t * 2.6) + .05 * Math.sin(t * 7.1);
  puppet(1060, GROUND, 6.3, { lean: -.04, head: -.08, armF: [2.35, .35, -.3], armB: [-.55, 1.75, .4], legF: .34, legB: -.3, ling, rodF: 3, rodB: 12 });
  stageFrame();
};
LOOPS.front.len = 4;

// ---------- 样张 2：人设表 ----------
LOOPS.cast = t => {
  screen();
  const u = 3.9, g = GROUND;
  puppet(250, g, u, { seed: 1 });
  puppet(590, g, u, { walk: t * 5, seed: 2, ling: .15 * Math.sin(t * 10) });
  puppet(930, g, u, { armF: [2.6, .2, -.3], armB: [-.5, 1.8, .3], legF: .34, legB: -.3, seed: 3 });
  puppet(1270, g, u, { dir: -1, lean: .08, head: .15, armF: [.9, 1.2, .2], armB: [.3, .6, 0], seed: 4 });
  puppet(1630, g, u, { lift: .7, seed: 5 });
  stageFrame();
};
LOOPS.cast.len = 2;

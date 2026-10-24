// scene.js：《页边》
const HOME = [300, 668], GS = 64;                  // 主角原位（脚底）和身子半径
const rowY = k => PG.top + k * PG.rule;
const SCRIB = [1185, rowY(11) - 14];               // 涂掉的错字

// ---------- 静止的一页：笔记 + 页边小画 ----------
function PAGE_ART(c) {
  // 标题，红笔划线
  scrawl(c, 640, rowY(1) - 6, 520, 1, { xh: 18, w: 2.6 });
  bp(c, [[630, rowY(1) + 12], [900, rowY(1) + 9], [1150, rowY(1) + 13]], { col: INK.red, w: 3, seed: 2 });
  const lines = { 3: [600, 2270], 4: [600, 2250], 5: [600, 2280], 6: [600, 1500], 8: [980, 1640], 9: [640, 2260], 10: [600, 2240], 11: [600, 2270], 12: [600, 2200], 13: [600, 1180], 15: [640, 2250], 16: [600, 2270], 17: [600, 2230], 18: [600, 1720], 20: [600, 1400] };
  for (const [k, [a, b]] of Object.entries(lines)) scrawl(c, a, rowY(+k) - 6, b - a, 10 + +k, { w: 2.1 });
  // 框起来的一行
  bp(c, [[955, rowY(7) + 12], [1665, rowY(7) + 8], [1668, rowY(8) + 12], [952, rowY(8) + 16], [955, rowY(7) + 6]], { col: INK.blue, w: 2.6, seed: 4, smooth: false });
  bp(c, [[1700, rowY(8) - 20], [1790, rowY(8) - 40], [1880, rowY(8) - 30]], { col: INK.blue, w: 2.4, seed: 5 });
  bp(c, [[1858, rowY(8) - 44], [1882, rowY(8) - 30], [1860, rowY(8) - 16]], { col: INK.blue, w: 2.4, seed: 6, smooth: false });
  // 页边：睡觉的云
  const cl = [[120, 352], [138, 318], [176, 312], [196, 286], [240, 282], [268, 300], [300, 292], [338, 312], [342, 346], [318, 362], [150, 364]];
  pencil(c, cl, PEN.sky, { seed: 101, a: .55, gap: 3.6 });
  bp(c, [...cl, cl[0]], { col: INK.blue, w: 2.6, seed: 102, closed: true });
  bp(c, [[198, 330], [208, 336], [218, 330]], { col: INK.blue, w: 2.2, seed: 103 });
  bp(c, [[256, 330], [266, 336], [276, 330]], { col: INK.blue, w: 2.2, seed: 104 });
  bp(c, [[352, 270], [366, 270], [352, 284], [368, 284]], { col: INK.blue, w: 2, seed: 105, smooth: false });
  bp(c, [[376, 244], [386, 244], [376, 254], [388, 254]], { col: INK.blue, w: 1.8, seed: 106, smooth: false });
  // 页边：底下一排小花和草
  for (let i = 0; i < 4; i++) {
    const fx = 130 + i * 105 + hash(i) * 20, fy = 1330 + hash(i + 3) * 30, h = 70 + hash(i + 5) * 50;
    bp(c, [[fx, fy], [fx + 6, fy - h * .5], [fx + 2, fy - h]], { col: INK.blue, w: 2.2, seed: 110 + i });
    const lf = [[fx + 4, fy - h * .45], [fx + 30, fy - h * .62], [fx + 36, fy - h * .5], [fx + 8, fy - h * .38]];
    pencil(c, lf, PEN.green, { seed: 120 + i, a: .85, gap: 3 }); bp(c, [...lf, lf[0]], { col: INK.blue, w: 2, seed: 125 + i });
    const col = [PEN.pink, PEN.yellow, PEN.lilac, PEN.pink][i];
    for (let p = 0; p < 5; p++) { const a = p / 5 * TAU + i, px = fx + 2 + Math.cos(a) * 15, py = fy - h + Math.sin(a) * 15, pe = ell(px, py, 11, 8, 10, a); pencil(c, pe, col, { seed: 130 + i * 5 + p, a: .85, gap: 2.8 }); bp(c, [...pe, pe[0]], { col: INK.blue, w: 1.9, seed: 140 + i * 5 + p }); }
    bpFill(c, fx + 2, fy - h, 6, 6, { col: '#c98a2a', seed: 150 + i });
  }
  for (let i = 0; i < 9; i++) { const gx = 90 + i * 48 + hash(i + 40) * 20, gy = 1372; bp(c, [[gx, gy], [gx + 4, gy - 14 - hash(i) * 12]], { col: PEN.greenDk, w: 2, seed: 160 + i, smooth: false }); bp(c, [[gx + 8, gy], [gx + 13, gy - 10 - hash(i + 1) * 10]], { col: PEN.greenDk, w: 2, seed: 170 + i, smooth: false }); }
  // 页边：小瓢虫
  const lb = ell(40, 930, 34, 26, 16, -.3); pencil(c, lb, '#e0574a', { seed: 210, a: .95, gap: 2.8 }); bp(c, [...lb, lb[0]], { col: INK.blue, w: 2.4, seed: 211 });
  bp(c, [[16, 916], [40, 930], [64, 944]], { col: INK.blue, w: 2, seed: 212 });
  bpFill(c, 8, 904, 13, 11, { col: INK.black, seed: 213 });
  [[28, 948], [52, 914], [58, 940], [30, 924]].forEach(([x, y], i) => bpFill(c, x, y, 4, 4, { col: INK.black, seed: 214 + i }));
  bp(c, [[2, 896], [-8, 880], [-16, 878]], { col: INK.blue, w: 1.8, seed: 220 }); bp(c, [[-4, 902], [-20, 896], [-26, 900]], { col: INK.blue, w: 1.8, seed: 221 });
  for (let i = 0; i < 5; i++) bpFill(c, 90 + i * 26, 980 + Math.sin(i) * 10, 2.4, 2.4, { col: INK.blue, seed: 230 + i, a: .6 });
  // 页边：小星星
  const star = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * TAU, r = i % 2 ? 11 : 26; star.push([450 + Math.cos(a) * r, 470 + Math.sin(a) * r]); }
  pencil(c, star, PEN.yellow, { seed: 180, a: .9, gap: 2.8, smooth: false }); bp(c, [...star, star[0]], { col: INK.blue, w: 2.2, seed: 181, smooth: false });
  // 右上角露半个太阳
  const sun = ell(2330, 110, 70, 70, 18); pencil(c, sun, PEN.yellow, { seed: 190, a: .8, gap: 3.4 }); bp(c, [...sun, sun[0]], { col: INK.blue, w: 2.6, seed: 191 });
  for (let i = 0; i < 9; i++) { const a = Math.PI * .5 + i / 8 * Math.PI * .9; bp(c, [[2330 + Math.cos(a) * 92, 110 + Math.sin(a) * 92], [2330 + Math.cos(a) * 122, 110 + Math.sin(a) * 122]], { col: INK.blue, w: 2.2, seed: 195 + i, smooth: false }); }
}

// 涂掉的错字：一团来回的圆珠笔圈，shake 时乱抖
function scribble(c, k = 1, shake = 0) {
  const [cx, cy] = SCRIB, w = 190, h = 54;
  for (let pass = 0; pass < 3; pass++) {
    const pts = [], n = 34;
    for (let i = 0; i <= n; i++) {
      const u = i / n, sk = shake * Math.sin(T * 40 + i * 1.7 + pass) * 6;
      pts.push([cx - w / 2 + u * w + Math.sin(i * 2.4 + pass) * 14 + sk, cy + (i % 2 ? -1 : 1) * h / 2 * (.65 + .35 * hash(i + pass * 50)) + sk * .6]);
    }
    bp(c, pts, { col: INK.black, w: 3.4, seed: 300 + pass + (shake > 0 ? BOILN : 0), n: 4, a: .9 });
  }
}


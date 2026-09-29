// lib.js：全片零件库。镜头函数只组合这些零件、写镜头运动。

// ---------- 小道具 ----------
function sparkle(x, y, r, k, col = PAL.sun) {
  if (k <= 0) return; const s = r * backOut(k);
  blob([[x, y - s], [x + s * .22, y - s * .22], [x + s, y], [x + s * .22, y + s * .22], [x, y + s], [x - s * .22, y + s * .22], [x - s, y], [x - s * .22, y - s * .22]], col, { d: 'solid', smooth: false, j: 1 });
}
// 心：c 填色（null 只描边），k 缩放
function heart(x, y, r, col, o = {}) {
  const p = []; for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, hx = 16 * Math.pow(Math.sin(a), 3), hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); p.push([x + hx * r / 16, y - hy * r / 16]); }
  if (o.fill !== false) blob(p, col, { d: 'heavy', j: r * .03, smooth: false, a: o.a, line: o.line, lw: o.lw ?? r * .12 });
  else stroke([...p, p[0]], o.lw ?? r * .14, col, { a: o.a, closed: true });
}
// 一支蜡笔：尖朝 (x,y)，ang 弧度（笔身朝向），纸套
function crayonStick(x, y, col, ang = -.6, len = 190, wdt = 30, worn = 0) {
  push(); X.translate(x, y); X.rotate(ang);
  const l = len * (1 - worn * .55);
  blob([[0, 0], [wdt * .5, -wdt * .45], [wdt * .5 + 6, -wdt * .5], [l, -wdt * .5], [l, wdt * .5], [wdt * .5 + 6, wdt * .5], [wdt * .5, wdt * .45]], col, { d: 'solid', smooth: false, line: PAL.ink, lw: 4, j: 1 });
  if (l > wdt * 2.2) {
    blob(rect(wdt * 1.6, -wdt * .52, l - wdt * 1.9, wdt * 1.04), PAL.white, { d: 'solid', smooth: false, line: PAL.ink, lw: 3, j: 1 });
    blob(rect(wdt * 1.6 + 10, -wdt * .52, 14, wdt * 1.04), col, { d: 'heavy', smooth: false, edge: false });
    blob(rect(l - wdt * .3 - 24, -wdt * .52, 14, wdt * 1.04), col, { d: 'heavy', smooth: false, edge: false });
  }
  pop();
}
// 月亮
function moon(x, y, r) {
  X.save(); X.globalCompositeOperation = 'screen'; const g = X.createRadialGradient(x, y, r * .8, x, y, r * 3.5); g.addColorStop(0, 'rgba(255,236,190,.35)'); g.addColorStop(1, 'rgba(255,236,190,0)'); X.fillStyle = g; X.fillRect(x - r * 4, y - r * 4, r * 8, r * 8); X.restore();
  blob(ell(x, y, r, r, 26), '#fbeec2', { d: 'solid', line: '#d9c48f', lw: 4, under: '#e8d6a0' });
  for (const [dx, dy, rr] of [[-.3, -.2, .18], [.25, .3, .13], [.35, -.35, .09]]) blob(ell(x + dx * r, y + dy * r, rr * r, rr * r * .9, 12), '#eadba8', { d: 'mid', edge: false });
}
// 河灯：一排小莲花灯顺水漂
function riverLanterns(t, n = 9) {
  for (let i = 0; i < n; i++) {
    const x = ((i * 263 + t * 30) % (W + 500)) - 250, y = 640 + (i % 3) * 42 + hash(i) * 20, bob = Math.sin(t * 2 + i) * 3;
    X.save(); X.globalCompositeOperation = 'screen'; const g = X.createRadialGradient(x, y - 8, 0, x, y - 8, 60); g.addColorStop(0, 'rgba(255,200,110,.5)'); g.addColorStop(1, 'rgba(255,200,110,0)'); X.fillStyle = g; X.fillRect(x - 60, y - 68, 120, 120); X.restore();
    blob([[x - 26, y + bob], [x + 26, y + bob], [x + 16, y + 12 + bob], [x - 16, y + 12 + bob]], PAL.her, { d: 'solid', smooth: false });
    blob([[x - 20, y + bob], [x - 12, y - 18 + bob], [x - 4, y + bob], [x + 4, y - 22 + bob], [x + 12, y + bob], [x + 20, y - 16 + bob]], PAL.blush, { d: 'solid', smooth: false });
    dot(x, y - 6 + bob, 6, PAL.glow, { d: 'solid' });
    stroke([[x - 30, y + 16], [x + 30, y + 16]], 3, PAL.glow, { d: 'mid', a: .6 });
  }
}
// 萤火虫：绕着 (cx, cy) 转，rad 半径
function fireflies(t, cx, cy, rx, ry, n = 16, seed = 0) {
  for (let i = 0; i < n; i++) {
    const a = t * (.5 + hash(i + seed) * .5) * (i % 2 ? 1 : -1) + i * 2.4, r = .5 + hash(i + seed + 7) * .5;
    const x = cx + Math.cos(a) * rx * r + Math.sin(t * 1.3 + i) * 20, y = cy + Math.sin(a) * ry * r + Math.cos(t * 1.7 + i) * 16, tw = .5 + .5 * Math.sin(t * 5 + i * 1.3);
    X.save(); X.globalCompositeOperation = 'screen'; const g = X.createRadialGradient(x, y, 0, x, y, 30); g.addColorStop(0, `rgba(255,240,150,${.55 * tw})`); g.addColorStop(1, 'rgba(255,240,150,0)'); X.fillStyle = g; X.fillRect(x - 30, y - 30, 60, 60); X.restore();
    dot(x, y, 5, '#fff4b0', { a: .5 + .5 * tw, base: false });
  }
}
// 落花：花瓣从上往下飘，area [x0, x1]
function petals(t, x0, x1, y0, y1, n = 18, seed = 0, s = 1) {
  for (let i = 0; i < n; i++) {
    const sp = .25 + hash(i + seed) * .2, ph = frac(t * sp * .3 + hash(i + seed + 3)), x = lerp(x0, x1, hash(i + seed + 9)) + Math.sin(t * 1.4 + i) * 40 * s + ph * 120 * s, y = lerp(y0, y1, ph);
    push(); X.translate(x, y); X.rotate(t * 2 + i);
    blob(ell(0, 0, 11 * s, 7 * s, 10), i % 3 ? '#f7c3c7' : PAL.white, { d: 'heavy', edge: false, j: 1 });
    pop();
  }
}
// 蝴蝶：flap 扇动
function butterfly(x, y, s, t, col = PAL.sun, ang = 0) {
  const fl = Math.abs(Math.sin(t * 16));
  push(); X.translate(x, y); X.rotate(ang);
  for (const side of [-1, 1]) {
    push(); X.scale(side * (.25 + .75 * fl), 1);
    blob([[0, 0], [22 * s, -26 * s], [34 * s, -14 * s], [26 * s, 2 * s], [0, 2]], col, { d: 'solid', line: PAL.ink, lw: 3 * s, j: .5 });
    blob([[0, 2], [22 * s, 6 * s], [18 * s, 20 * s], [4 * s, 12 * s]], mixCol(col, PAL.her, .5), { d: 'solid', line: PAL.ink, lw: 3 * s, j: .5 });
    pop();
  }
  stroke([[0, -10 * s], [0, 14 * s]], 4 * s, PAL.ink, { d: 'solid' });
  stroke([[0, -10 * s], [-6 * s, -20 * s]], 2 * s, PAL.ink, { d: 'solid' }); stroke([[0, -10 * s], [6 * s, -20 * s]], 2 * s, PAL.ink, { d: 'solid' });
  pop();
}
// 夜色压一层（multiply），中心留亮
function nightWash(k, cx = W / 2, cy = 620, col = [120, 110, 170]) {
  if (k <= 0) return;
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalCompositeOperation = 'multiply'; X.globalAlpha = clamp(k);
  const g = X.createRadialGradient(cx, cy, 200, cx, cy, 1300); g.addColorStop(0, 'rgba(255,236,210,1)'); g.addColorStop(1, `rgba(${col},1)`); X.fillStyle = g; X.fillRect(0, 0, W, H); X.restore();
}
// 暖光（screen），用于清晨和灯下
function glowAt(x, y, r, a, rgb = '255,214,140') {
  if (a <= 0) return; X.save(); X.globalCompositeOperation = 'screen'; const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); X.fillStyle = g; X.fillRect(x - r, y - r, 2 * r, 2 * r); X.restore();
}
// 一滴墨 / 一滴水
function drop(x, y, r, col = PAL.ink) { blob([[x, y - r * 1.8], [x + r * .9, y - r * .1], [x + r * .7, y + r * .7], [x, y + r], [x - r * .7, y + r * .7], [x - r * .9, y - r * .1]], col, { d: 'solid', j: r * .04 }); }

// ---------- 屋里：清晨的书房 ----------
// o.sun 0..1 晨光爬进来；o.her 窗外她的姿势（null 不画）；o.boy 他的姿势（null 不画）；o.inside 窗外额外画什么
const ROOM = { wx: 1250, wy: 430, R: 330, desk: 700 };
function dawnRoom(t, o = {}) {
  const wood = '#8a5f43', k = o.sun ?? 1, { wx, wy, R } = ROOM;
  const wall = mixCol('#d9c9ae', '#ecd9b6', k);
  scribbleFill(rect(-300, -300, W + 600, H + 600), wall, { c2: mixCol('#e6d8bf', '#f6e8cc', k), ang: 80, under: mixCol('#c9b592', '#e2c9a0', k) });
  // 墙上挂一幅小画、一盏灯架，别让墙空着
  blob(rect(160, 170, 250, 330), '#efe3c8', { d: 'heavy', smooth: false, line: wood, lw: 12 });
  stroke([[190, 420], [260, 330], [300, 380], [350, 300], [385, 420]], 6, '#7d8f86', { d: 'heavy' });
  dot(330, 240, 22, PAL.her, { d: 'heavy' });
  blob([[-300, 830], [W + 300, 810], [W + 300, H + 300], [-300, H + 300]], '#c99c6c', { d: 'heavy', ang: 8, d2: 'light', c2: '#dcb584', smooth: false, under: '#b48656' });
  for (let i = 0; i < 7; i++) stroke([[-100 + i * 330, 830 - i * 3], [-300 + i * 390, H + 60]], 4, '#a97a4c', { d: 'mid', smooth: false });
  // 窗外
  X.save(); X.beginPath(); X.arc(wx, wy, R, 0, TAU); X.clip();
  const skyC = mixCol('#e9dcc8', PAL.dawn, k);
  scribbleFill(rect(wx - R - 20, wy - R - 20, 2 * R + 40, 2 * R + 40), skyC, { c2: PAL.white, ang: 5 });
  const sy = lerp(wy + 260, wy - 120, easeOut(k));
  glowAt(wx + 150, sy, 260, .6 * k); dot(wx + 150, sy, 80, PAL.sun, { d: 'heavy' });
  // 远处屋顶和河堤
  for (let i = 0; i < 4; i++) house(wx - 360 + i * 200, wy + 250, 150, 80, i + 3);
  blob(rect(wx - R - 20, wy + 245, 2 * R + 40, 200), PAL.grass, { d: 'heavy', smooth: false, ang: -60, c2: PAL.leafLt, d2: 'light' });
  willowStrands(wx - 60, wy - R - 40, 700, 320, t, o.wind || 0, 1, 9, 2);
  if (o.inside) o.inside();
  if (o.her) human(o.herX ?? wx - 30, wy + R + 170, 90, o.her, 'her');
  X.restore();
  // 圆窗：一圈窗框 + 八个回纹角
  const ring = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; ring.push([wx + Math.cos(a) * R, wy + Math.sin(a) * R]); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + TAU / 16, c = Math.cos(a), s2 = Math.sin(a); stroke([[wx + c * R, wy + s2 * R], [wx + c * R * .8, wy + s2 * R * .8], [wx + Math.cos(a + .25) * R * .8, wy + Math.sin(a + .25) * R * .8]], 10, wood, { d: 'heavy', smooth: false }); }
  stroke([...ring, ring[0]], 36, wood, { d: 'heavy', smooth: false });
  // 光斑：从窗口斜着落到地上，随 k 变长变亮
  const beam = [[wx - 250, 860], [wx + 230, 860], [lerp(wx + 230, wx + 40, k), lerp(900, 1090, k)], [lerp(wx - 250, wx - 620, k), lerp(900, 1090, k)]];
  blob(beam, PAL.sun, { d: 'light', a: .55 * k, edge: false, smooth: false });
  blob([[wx - R * .7, wy + R * .7], [wx + R * .7, wy + R * .7], [wx + R * .2, 860], [wx - R * 1.1, 860]], PAL.sun, { d: 'light', a: .18 * k, edge: false, smooth: false });
  // 书桌：他 → 桌子 → 他的头
  const B = o.boy;
  if (B) human(420, 1000, 95, { ...B, part: 'body' }, 'him');
  blob([[120, ROOM.desk], [800, ROOM.desk], [780, ROOM.desk + 40], [140, ROOM.desk + 40]], wood, { d: 'heavy', line: PAL.ink, lw: 5, smooth: false });
  // 书案正面一整块挡板（人坐在后面，下半身不该露出来）+ 两个抽屉
  blob([[140, ROOM.desk + 38], [780, ROOM.desk + 38], [770, 985], [150, 985]], '#7b5238', { d: 'heavy', line: PAL.ink, lw: 5, smooth: false, d2: 'light', c2: '#9a6a48' });
  for (const dx of [200, 480]) { blob(rect(dx, 790, 240, 90), '#8a5f43', { d: 'heavy', smooth: false, line: PAL.ink, lw: 4 }); dot(dx + 120, 835, 9, '#d9b36a', { d: 'solid' }); }
  // 桌上：书、砚台、茶杯
  blob([[380, 690], [640, 690], [660, 702], [360, 702]], PAL.white, { d: 'heavy', smooth: false, line: PAL.inkSoft, lw: 3 });
  blob(rect(150, 660, 150, 40), '#6d7f97', { d: 'heavy', smooth: false, line: PAL.ink, lw: 4 }); blob(rect(160, 630, 130, 30), '#b8544a', { d: 'heavy', smooth: false, line: PAL.ink, lw: 4 });
  blob(ell(340, 692, 40, 12, 14), '#4a4a50', { d: 'heavy', line: PAL.ink, lw: 3 });
  blob([[695, 640], [745, 640], [739, 695], [701, 695]], PAL.white, { d: 'heavy', smooth: false, line: PAL.ink, lw: 4 });
  steam(720, 600, 40, .8);
  if (B) human(420, 1000, 95, { ...B, part: 'head' }, 'him');
}

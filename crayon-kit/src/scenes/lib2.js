// lib2.js：零件库第二部分（路人、街巷、近处石拱桥、船、花枝、红线心）

// ---------- 路人 ----------
const EXTRAS = ['exM0', 'exF0', 'exM1', 'exF1', 'exM2', 'exF2'];
// 一排走来走去的路人。y 地面，u 头半径，span [x0, x1] 循环区间
function crowd(t, n, y, u, span, seed = 0, o = {}) {
  const [x0, x1] = span, L = x1 - x0, out = [];
  for (let i = 0; i < n; i++) {
    const dir = hash(i + seed) > .5 ? 1 : -1, v = (40 + hash(i + seed + 2) * 50) * dir * (o.speed ?? 1);
    const x = x0 + ((hash(i + seed + 4) * L + v * t) % L + L) % L, yy = y + (hash(i + seed + 6) - .5) * u * 1.2, uu = u * (.9 + hash(i + seed + 8) * .2);
    const P = { face: dir * .8, walk: t * 1.2 + hash(i + seed) * 3, eyes: 'dot', mouth: hash(i + seed + 1) > .5 ? 'smile' : 'flat', blush: .25, sq: (o.bounce || 0) * .05, ...(o.P || {}) };
    out.push([yy, () => human(x, yy, uu, P, EXTRAS[(i + seed) % EXTRAS.length])]);
  }
  out.sort((a, b) => a[0] - b[0]).forEach(p => p[1]());
}
// 远处人群剪影
function crowdSil(t, n, y, s, col, under, seed = 0) {
  for (let i = 0; i < n; i++) {
    const px = ((i * 173 + hash(i + seed) * 60 + t * (i % 2 ? 22 : -18)) % (W + 300) + W + 300) % (W + 300) - 150, py = y + hash(i + 8 + seed) * 30, ss = s * (.85 + hash(i + 2 + seed) * .3), bob = Math.abs(Math.sin(t * 2.2 + i)) * 4;
    blob(ell(px, py - 92 * ss - bob, 22 * ss, 23 * ss, 12), col, { d: 'mid', under });
    blob([[px - 36 * ss, py], [px - 22 * ss, py - 64 * ss - bob], [px + 22 * ss, py - 64 * ss - bob], [px + 36 * ss, py]], col, { d: 'mid', under });
  }
}

// ---------- 一串灯笼 ----------
function lanternString(t, y0, sag, n, lit, r = 40, swing = 0) {
  const pts = []; for (let i = 0; i <= n + 1; i++) { const q = i / (n + 1); pts.push([-80 + q * (W + 160), y0 + Math.sin(q * Math.PI) * sag]); }
  stroke(pts, 4, PAL.ink, { d: 'heavy' });
  for (let i = 1; i <= n; i++) {
    const L = lit ? lit(i - 1) : 1;
    push(); X.translate(pts[i][0], pts[i][1]); X.rotate(swing * Math.sin(i * 1.3 + 1)); lantern(0, r * 1.7, r, t, i, L); pop();
  }
}

// ---------- 街巷：两层木铺面、酒旗、一串灯笼 ----------
// o.tone 天色，o.lit(i) 第 i 盏灯亮度，o.back/o.mid 在路人剪影前后插画，o.swing 灯笼晃
function street(t, o = {}) {
  const k = o.tone ?? 1, night = seg(k, 1.2, 2);
  UNDER_DARK = night * .35;
  scribbleFill(rect(-300, -300, W + 600, 800), TN(k, PAL.sky, '#f4b67e', PAL.night), { c2: TN(k, PAL.white, '#fbd9a8', '#46508a'), ang: 4, under: night > .5 ? '#232a50' : undefined });
  if (k > .4 && k < 1.6) { const sy = lerp(260, 480, seg(k, .4, 1.6)); glowAt(1500, sy, 600, .7 * (1 - night)); dot(1500, sy, 80, '#f39a5a', { d: 'heavy' }); }
  if (night > 0) for (let i = 0; i < 24; i++) dot(hash(i) * W, hash(i + 50) * 240, 4 + hash(i + 3) * 3, PAL.glow, { a: night * (.6 + .4 * Math.sin(t * 3 + i)), d: 'heavy', base: false });
  // 远处一排屋脊剪影
  const far = [[-300, 520]]; for (let i = 0; i <= 14; i++) far.push([-300 + i * 180, 380 + (i % 2) * 40 + hash(i) * 30]); far.push([W + 300, 520]);
  blob(far, TN(k, '#9fb0b8', '#b88a78', '#252c52'), { d: 'mid', smooth: false, ang: 80 });
  // 铺面
  const lit = night > .3 || o.shopsLit;
  for (let i = 0; i < 6; i++) {
    const hx = -260 + i * 420, top = 330 + (i % 2) * 30, base = 800, wood = TN(k, '#8a5f43', '#7b4f36', '#3b2a36'), roof = TN(k, '#59636f', '#5a5560', '#1f2644');
    blob(rect(hx, top, 400, base - top), TN(k, PAL.white, '#f3d9b5', '#5a6390'), { d: 'heavy', smooth: false, line: PAL.inkSoft, lw: 3, ang: 85 });
    blob([[hx - 40, top + 14], [hx - 10, top - 36], [hx + 410, top - 36], [hx + 440, top + 14]], roof, { d: 'heavy', smooth: false });
    blob([[hx - 30, top + 190], [hx + 430, top + 190], [hx + 400, top + 150], [hx, top + 150]], roof, { d: 'heavy', smooth: false });
    blob(rect(hx + 30, top + 200, 340, base - top - 200), wood, { d: 'heavy', smooth: false, line: PAL.ink, lw: 3 });
    for (let q = 0; q < 3; q++) {
      const dx = hx + 45 + q * 110, dh = base - top - 240;
      blob(rect(dx, top + 225, 90, dh), lit ? TN(k, '#f3e0b0', '#f6c878', PAL.glow) : TN(k, '#e8dcc0', '#f0cf98', '#7a6a70'), { d: 'heavy', smooth: false });
      for (let r = 1; r < 3; r++) stroke([[dx, top + 225 + r * dh / 3], [dx + 90, top + 225 + r * dh / 3]], 4, wood, { d: 'heavy', smooth: false });
    }
    for (let q = 0; q < 2; q++) blob(rect(hx + 70 + q * 200, top + 40, 90, 70), lit ? PAL.glow : TN(k, PAL.inkSoft, '#8a6a5a', PAL.glow), { d: 'mid', smooth: false });
    const fx = hx + 380, sw = Math.sin(t * 2 + i) * 8;   // 酒旗
    stroke([[fx, top + 130], [fx + 70, top + 130]], 5, wood, { d: 'heavy', smooth: false });
    blob([[fx + 20, top + 132], [fx + 62, top + 132], [fx + 62 + sw, top + 260], [fx + 41 + sw, top + 240], [fx + 20 + sw, top + 260]], [PAL.red, '#6d8fb0', '#d9a441'][i % 3], { d: 'heavy', smooth: false, line: PAL.ink, lw: 3 });
    if (lit) glowAt(hx + 200, base - 100, 300, .35 * Math.max(night, .6));
  }
  // 石板路
  const seam = TN(k, '#a89878', '#b08a64', '#3f3850');
  scribbleFill([[-300, 790], [W + 300, 790], [W + 300, H + 300], [-300, H + 300]], TN(k, '#cfc2a8', '#d8b58a', '#5e5670'), { c2: TN(k, PAL.white, '#f0cfa0', '#7a7090'), ang: 8 });
  for (let r = 0; r < 4; r++) { const y = 830 + r * 70; stroke([[-300, y], [W + 300, y]], 3, seam, { d: 'mid', smooth: false }); for (let c = 0; c < 12; c++) { const x = -200 + c * 190 + (r % 2) * 95; stroke([[x, y], [x, y + 70]], 3, seam, { d: 'mid', smooth: false }); } }
  if (o.back) o.back();
  if (o.crowd !== false) crowdSil(t, 12, 800, .9, TN(k, '#8f8a86', '#7a5a5a', '#3a3d66'), TN(k, '#a09a94', '#6a4a4a', '#262a4a'), 3);
  if (o.mid) o.mid();
  lanternString(t, o.stringY ?? 110, 110, o.lanternN ?? 8, o.lit, o.lr ?? 42, o.swing || 0);
  if (night > 0) nightWash(night * .7, W / 2, 500);
  UNDER_DARK = 0;
}

// ---------- 近处的石拱桥（站在桥上的镜头） ----------
function bridgeNear(t, o = {}) {
  const k = o.tone || 0, night = seg(k, 1.2, 2);
  riverside(t, { tone: k, rev: i => i <= 2 ? 1 : 0, moon: o.moon });
  UNDER_DARK = night * .35;
  scribbleFill([[-300, 600], [W + 300, 600], [W + 300, H + 300], [-300, H + 300]], TN(k, PAL.water, '#e8b98f', '#3a4f7e'), { c2: TN(k, PAL.white, '#fbe3b8', '#5a6ca0'), ang: 2 });
  for (let i = 0; i < 16; i++) { const wx = (i * 211 + t * 30) % (W + 600) - 300, wy = 650 + (i % 5) * 70; stroke([[wx, wy], [wx + 40, wy - 6], [wx + 90, wy]], 5, night > .5 ? PAL.glow : PAL.white, { d: 'heavy', a: .8 }); }
  if (o.boat) boat(o.boat[0], o.boat[1], o.boat[2] || 1, t, k);
  if (o.riverLanterns) { push(); X.translate(0, 110); riverLanterns(t, o.riverLanterns); pop(); }
  // 桥身：桥面是一道弧，下面一个拱洞
  const stone = TN(k, '#d4c8b4', '#dcbf98', '#59628a'), dark = TN(k, '#9d917e', '#a88a6c', '#363d66'), deck = x => 700 - 140 * Math.cos(clamp((x - 960) / 1250, -1, 1) * Math.PI * .5);
  const top = []; for (let i = 0; i <= 24; i++) { const x = -200 + i / 24 * 2320; top.push([x, deck(x)]); }
  const arch = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI; arch.push([960 + Math.cos(a) * 470, 1180 - Math.sin(a) * 430]); }
  blob([...top, [2120, 1300], [1430, 1300], ...arch, [490, 1300], [-200, 1300]], stone, { d: 'heavy', smooth: false, line: PAL.inkSoft, lw: 5, ang: 10, d2: 'light', c2: TN(k, PAL.white, '#f6dcb5', '#7a82aa') });
  blob([...arch, [490, 1300], [1430, 1300]].reverse(), TN(k, '#4f7f8f', '#7a6a70', '#1d2448'), { d: 'heavy', smooth: false });
  for (let i = 0; i < 18; i++) { const a = (i + .5) / 18 * Math.PI; stroke([[960 + Math.cos(a) * 470, 1180 - Math.sin(a) * 430], [960 + Math.cos(a) * 545, 1180 - Math.sin(a) * 505]], 4, dark, { d: 'mid', smooth: false }); }
  for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) {
    const x = -100 + c * 250 + (r % 2) * 125, y = deck(x) + 50 + r * 70, dx = x + 55 - 960;
    if (Math.abs(dx) < 560 && y + 20 > 1180 - Math.sqrt(Math.max(0, 560 * 560 - dx * dx)) * .93) continue;
    stroke([[x, y], [x + 110, y]], 4, dark, { d: 'mid', smooth: false });
  }
  if (o.onDeck) o.onDeck(deck);
  // 栏杆（画在人前面）：望柱 + 横栏
  const rail = top.map(([x, y]) => [x, y - 70]);
  stroke(rail, 16, stone, { d: 'heavy' }); stroke(rail, 5, PAL.inkSoft, { d: 'mid' });
  for (let i = 0; i < 9; i++) { const x = -100 + i * 270, y = deck(x); blob(rect(x - 16, y - 110, 32, 112), stone, { d: 'heavy', smooth: false, line: PAL.inkSoft, lw: 4 }); dot(x, y - 116, 20, stone, { line: PAL.inkSoft, lw: 4 }); }
  if (o.front) o.front(deck);
  UNDER_DARK = 0;
}
// 乌篷船
function boat(x, y, s, t, k = 0) {
  const b = Math.sin(t * 1.8) * 4 * s;
  push(); X.translate(x, y + b); X.scale(s, s);
  blob([[-170, 0], [170, 0], [140, 36], [-140, 36]], TN(k, '#6b4a36', '#6b4a36', '#2c2238'), { d: 'heavy', smooth: false, line: PAL.ink, lw: 4 });
  blob([[-90, 0], [-70, -60], [60, -60], [80, 0]], TN(k, '#3d3f4a', '#3d3f4a', '#171a30'), { d: 'heavy', line: PAL.ink, lw: 4 });
  stroke([[120, -4], [200, -110]], 6, '#8a6a4a', { d: 'heavy' });
  pop();
}
// 花枝：从 (x,y) 朝 ang 伸出
function blossomBranch(x, y, len, ang, t, seed = 0, s = 1) {
  const pts = []; for (let i = 0; i <= 6; i++) { const q = i / 6; pts.push([x + Math.cos(ang) * len * q, y + Math.sin(ang) * len * q + Math.sin(q * 3 + seed) * 30 * s + Math.sin(t * .8 + q * 2) * 6 * q]); }
  stroke(pts, 18 * s, PAL.trunk, { d: 'heavy', w0: 1.2, w1: .4 });
  for (let i = 1; i < 12; i++) {
    const q = i / 12, p = pts[Math.floor(q * 6)], nx = p[0] + (hash(i + seed) - .5) * 90 * s, ny = p[1] + (hash(i + seed + 4) - .5) * 70 * s;
    stroke([p, [nx, ny]], 6 * s, PAL.trunk, { d: 'heavy', w1: .4 });
    for (let j = 0; j < 5; j++) { const a = j / 5 * TAU + i; dot(nx + Math.cos(a) * 11 * s, ny + Math.sin(a) * 11 * s, 10 * s, i % 3 ? '#f7c3c7' : PAL.white, { d: 'heavy' }); }
    dot(nx, ny, 6 * s, PAL.sun, { d: 'solid' });
  }
}
// 红线：A → B，中间绕出一颗心（k 0..1 心的大小）
function threadHeart(A, B, k, t, sag = 60, r0 = 110) {
  const pts = [], M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 + sag], wig = q => Math.sin(q * 9 + t * 5) * 6 * (1 - k);
  for (let i = 0; i <= 10; i++) { const q = i / 10; pts.push([lerp(A[0], M[0], q), lerp(A[1], M[1], q) + wig(q)]); }
  if (k > .02) { const r = r0 * k; for (let i = 0; i <= 32; i++) { const a = i / 32 * TAU + Math.PI, hx = 16 * Math.pow(Math.sin(a), 3), hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); pts.push([M[0] + hx * r / 16, M[1] - r * 1.06 - hy * r / 16]); } }
  for (let i = 1; i <= 10; i++) { const q = i / 10; pts.push([lerp(M[0], B[0], q), lerp(M[1], B[1], q) + wig(q + 1)]); }
  stroke(pts, 8, PAL.red, { d: 'heavy', j: 1 });
}

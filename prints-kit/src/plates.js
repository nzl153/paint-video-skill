// 《远光》六段版画：每段 F(t) 返回 { defs, body }，t 是乐谱的拍数；id 各自带段号不冲突
(() => {
const W = 680, H = 400, HZ = 300, LX = 560, LY = 208;
const P = '#f7f2e6', INK = '#2e2a24', INK2 = '#554e44', INK3 = '#857b6c', ACC = '#bb5f3c';
const rngOf = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const n1 = v => Math.round(v * 10) / 10;
const pts2d = a => a.map(p => n1(p[0]) + ',' + n1(p[1])).join(' ');
const clamp = v => Math.max(0, Math.min(1, v));
const sm = (a, b, t) => { const v = clamp((t - a) / (b - a)); return v * v * (3 - 2 * v); };
const ridgeY = x => HZ - 82 * Math.exp(-(((x - LX) / 72) ** 2)) - 38 * Math.exp(-(((x - 380) / 95) ** 2)) - 24 * Math.exp(-(((x - 668) / 46) ** 2)) - 2 * Math.sin(x * .07) - 1.2 * Math.sin(x * .19 + 1);
const ridgePts = []; for (let x = -4; x <= W + 4; x += 4) ridgePts.push([x, ridgeY(x)]);
const ridgeLine = 'M' + pts2d(ridgePts);
const ridgeD = ridgeLine + ` L${W + 4},${HZ} L-4,${HZ}Z`;

// 风：跟着配乐走，盛夏微风，仰望渐起，风起最大（56 拍是全曲唯一的高点），高处以后回落
const wind = t => .25 + .3 * sm(30, 40, t) + .45 * sm(40, 46, t) + .55 * Math.exp(-(((t - 56) / 2.2) ** 2)) - .6 * sm(60, 68, t) - .1 * sm(96, 104, t);
const gust = (t, ph = 0) => .6 * Math.sin(t * 1.1 + ph) + .4 * Math.sin(t * 2.3 + ph * 1.7);
const lean = (t, ph = 0) => wind(t) * (.55 + .45 * gust(t, ph));

// 每颗种子固定取三个随机数，掉了哪颗都不会让别的种子跟着变
function puff(cx, cy, r, n, rng, { c = INK, w = .6, gone = null, t = 0, wob = 0, tips = null, hl = {} } = {}) {
  let s = `<g stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round">`;
  for (let i = 0; i < n; i++) {
    const u1 = rng(), u2 = rng(), u3 = rng();
    const a = i / n * Math.PI * 2 + (u1 - .5) * .14 + wob * Math.sin(t * 2.2 + i * 1.7);
    const L = r * (u2 < .3 ? .45 + .3 * u3 : .82 + .18 * u3);
    const x = cx + Math.cos(a) * L, y = cy + Math.sin(a) * L;
    if (tips) tips[i] = [x, y];
    if (gone && gone(i)) continue;
    if (hl[i]) s += `<g stroke-width="${n1(w * hl[i] * 10) / 10}">`;
    s += `<path d="M${n1(cx + Math.cos(a) * r * .12)},${n1(cy + Math.sin(a) * r * .12)}L${n1(x)},${n1(y)}"/>`;
    for (let k = 0; k < 7; k++) { const b = a + (k / 6 - .5) * 1.3, l = r * (.15 + .05 * Math.sin(k * 2.3 + i)) * (hl[i] ? 1.15 : 1); s += `<path d="M${n1(x)},${n1(y)}l${n1(Math.cos(b) * l)},${n1(Math.sin(b) * l)}" opacity="${hl[i] ? 1 : .75}"/>`; }
    if (hl[i]) s += '</g>';
  }
  return s + `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r * .1)}" fill="${c}" stroke="none"/></g>`;
}
function seed(x, y, a, sz, c = INK, w = .7) {
  const dx = Math.cos(a), dy = Math.sin(a);
  const bx = x + dx * sz * .22, by = y + dy * sz * .22, tx = x + dx * sz * .72, ty = y + dy * sz * .72;
  let o = `<g stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"><path d="M${n1(x)},${n1(y)}L${n1(bx)},${n1(by)}" stroke-width="${n1(w * 2.6)}"/><path d="M${n1(bx)},${n1(by)}L${n1(tx)},${n1(ty)}"/>`;
  for (let k = 0; k < 11; k++) { const b = a + (k / 10 - .5) * 2.1, l = sz * (.3 + .04 * Math.sin(k * 3.1)); o += `<path d="M${n1(tx)},${n1(ty)}l${n1(Math.cos(b) * l)},${n1(Math.sin(b) * l)}"/>`; }
  return o + '</g>';
}
// 在纸上飞的种子：先垫一圈纸色，压在花纹上也看得清
const flyer = (x, y, a, sz, bg = P, w = .6, op = 1) => `<g opacity="${op}">` + seed(x, y, a, sz, bg, w + 1.6) + seed(x, y, a, sz, INK, w) + '</g>';
// 狮子牙：齿尖略朝叶基，尖但不锯
const tooth = f => .55 + .45 * (1 - Math.pow(Math.abs(2 * Math.pow(f, .6) - 1), 1.5));
function leaf(bx, by, deg, len, wd, teeth, bend) {
  const a = deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, L = [], R = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, ax = bx + dx * len * t + nx * bend * t * t, ay = by + dy * len * t + ny * bend * t * t;
    const w = wd * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, t * 1.08))), .8);
    const s1 = tooth((t * teeth) % 1), s2 = tooth((t * teeth + .5) % 1);
    L.push([ax + nx * w * s1, ay + ny * w * s1]); R.push([ax - nx * w * s2, ay - ny * w * s2]);
  }
  return { d: 'M' + pts2d(L.concat(R.reverse())) + 'Z', rib: `M${bx},${by}Q${n1(bx + dx * len * .5 + nx * bend * .25)},${n1(by + dy * len * .5 + ny * bend * .25)} ${n1(bx + dx * len * .9 + nx * bend * .8)},${n1(by + dy * len * .9 + ny * bend * .8)}` };
}
// lean 可以是数，也可以是按横坐标给的函数（风从左往右一阵阵扫过草地）
function grass(rng, n, c, w, op, lean = 0) {
  let o = `<g stroke="${c}" stroke-width="${w}" fill="none" opacity="${op}" stroke-linecap="round">`;
  for (let i = 0; i < n; i++) {
    const x = rng() * W, b = HZ + 3 + Math.pow(rng(), 1.6) * (H - HZ), h = 5 + (b - HZ) * .32 + rng() * 9, j1 = rng() - .5, j2 = rng() - .5;
    const l = typeof lean === 'function' ? lean(x) : lean;
    o += `<path d="M${n1(x)},${n1(b)}q${n1(l * h * .3 + j1 * 4)},${n1(-h * .55)} ${n1(l * h * .75 + j2 * 6)},${n1(-h * (1 - .12 * l * l))}"/>`;
  }
  return o + '</g>';
}
function screen(step, deg, fn) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), R = Math.hypot(W, H) / 2 / step + 2;
  let o = '';
  for (let i = -R; i < R; i++) for (let j = -R; j < R; j++) {
    const u = i * step, v = j * step, x = W / 2 + u * c - v * s, y = H / 2 + u * s + v * c;
    if (x < -3 || x > W + 3 || y < -3 || y > H + 3) continue;
    const rad = fn(x, y);
    if (rad > .35) o += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(rad)}"/>`;
  }
  return o;
}
function ragged(ins, amp, rng) {
  const p = [], st = 9;
  for (let x = ins; x <= W - ins; x += st) p.push([x, ins + (rng() - .5) * amp]);
  for (let y = ins; y <= H - ins; y += st) p.push([W - ins + (rng() - .5) * amp, y]);
  for (let x = W - ins; x >= ins; x -= st) p.push([x, H - ins + (rng() - .5) * amp]);
  for (let y = H - ins; y >= ins; y -= st) p.push([ins + (rng() - .5) * amp, y]);
  return 'M' + pts2d(p) + 'Z';
}
const grain = (id, op) => ({
  def: `<filter id="g${id}" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${id}"/><feColorMatrix values="0 0 0 0 .18 0 0 0 0 .16 0 0 0 0 .14 0 0 0 1.6 -.7"/></filter>`,
  use: `<rect x="-40" width="${W + 80}" height="${H}" filter="url(#g${id})" opacity="${op}"/>`
});
function cons(c, op, extra = '') {
  let o = `<g stroke="${c}" fill="none" stroke-width=".6" opacity="${op}">`;
  o += `<circle cx="${LX}" cy="${LY}" r="26" stroke-dasharray="2 3"/><circle cx="${LX}" cy="${LY}" r="64" stroke-dasharray="1 4"/>`;
  o += `<path d="M${LX - 92},${LY}H${LX + 92}M${LX},${LY - 82}V${LY + 56}"/><path d="M0,${HZ}H${W}" stroke-dasharray="6 4"/>`;
  for (let i = 0; i < 17; i++) o += `<path d="M${i * 40 + 20},${HZ - 3}v6"/>`;
  o += extra + `</g><g fill="${c}" opacity="${op}" font-family="Georgia,serif" font-size="8" font-style="italic"><text x="${LX + 6}" y="${LY - 30}">(560, 208)</text><text x="24" y="${HZ - 6}">h = 300</text></g>`;
  return o;
}
const svg = (defs, body) => `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${body}</svg>`;
const bez = (P0, P1, P2, P3, q) => { const u = 1 - q; return [0, 1].map(k => u * u * u * P0[k] + 3 * u * u * q * P1[k] + 3 * u * q * q * P2[k] + q * q * q * P3[k]); };

// 主蒲公英：根不动，只有花头位置在换场时插值
const D1 = { bx: 198, by: 394, px: 214, py: 148, r: 60 }, D2 = { bx: 198, by: 394, px: 172, py: 176, r: 58 };
// 主角那颗种子和它的四个伙伴：绒球上指向远光的那几颗（74 颗的绒球是第 67 颗，84 颗的是第 76 颗）
const HL74 = { 67: 2.2, 65: 1.5, 66: 1.5, 68: 1.5, 69: 1.5 }, HERO = 76, FRIENDS = [74, 75, 77, 78];
const HL84 = { [HERO]: 2.2, 74: 1.5, 75: 1.5, 77: 1.5, 78: 1.5 };
// 伙伴最后亮在山脊上的位置（远光段亮起，尾声一直亮着），650 是远光段「更远处那一盏」
const FRIEND_X = [352, 446, 606, 650];
const stem = (bx, by, px, py, c, w) => `<path d="M${n1(bx)},${n1(by)} C${n1(bx + (px - bx) * .2 + 6)},${n1(by - (by - py) * .3)} ${n1(px + (bx - px) * .1 + 6)},${n1(py + (by - py) * .4)} ${n1(px)},${n1(py)}" fill="none" stroke="${c}" stroke-width="${w}"/>`;

// 一 盛夏：孔版套印。开场先印黄版、再印蓝版；一阵阵风扫过草地，萤火虫往上飘，小蒲公英偶尔掉一颗种子
// 风浪：一道比平时大的风从左往右扫过去，约 10 拍一次
const wave1 = (x, t) => Math.exp(-(((x - ((t * 130) % 1300 - 300)) / 70) ** 2));
function F1({ t = 12, d = D1 } = {}) {
  const r = rngOf(101), B = '#41606d', Y = '#d6aa4c', g = grain(1, .45);
  const ln = lean(t) + .9 * wave1(d.px, t), px = d.px + ln * 10, py = d.py + Math.abs(ln) * 1.5;
  const inY = sm(0, 2.2, t), inB = sm(1.2, 3.6, t), inL = sm(2.5, 4.5, t), inC = sm(3.5, 6, t);
  let y = '';
  for (let yy = 10; yy < HZ; yy += 8) for (let xx = (yy / 8 % 2) * 4; xx < W; xx += 8) {
    const rad = 3.3 * Math.pow(yy / HZ, 1.6) * (.85 + .3 * r()) * (1 + .28 * Math.sin(xx * .025 + yy * .012 - t * 1.6) + .25 * wave1(xx, t) * (yy / HZ));
    if (rad > .45) y += `<circle cx="${xx}" cy="${yy}" r="${n1(rad)}"/>`;
  }
  y += `<rect y="${HZ}" width="${W}" height="${H - HZ}" opacity=".6"/><circle cx="${n1(px)}" cy="${n1(py)}" r="${n1(d.r * .9)}" opacity=".5"/>`;
  // 萤火虫：各自 16 拍一个来回，从草里升起、亮一阵、淡掉
  let ff = '';
  for (let i = 0; i < 44; i++) {
    const fx0 = 20 + r() * 640, fy0 = 200 + r() * 110, fr = 1.4 + r() * 1.8, ph = r() * 6.28, cyc = (t / 16 + ph / 6.28) % 1;
    const fx = fx0 + 22 * Math.sin(t * .32 + ph) + 8 * Math.sin(t * .85 + ph * 2.1) + cyc * 30, fy = fy0 - cyc * 140 + 6 * Math.sin(t * 1.1 + ph);
    const op = Math.sin(Math.PI * cyc) * (.35 + .65 * Math.pow(.5 + .5 * Math.sin(t * 1.7 + ph), 2)) * clamp((Math.hypot(fx - LX, fy - LY) - 30) / 30) * sm(3 + i % 6, 6 + i % 6, t) * (1 - sm(23, 25, t));
    if (op < .02) continue;
    ff += `<g opacity="${n1(op * 100) / 100}"><circle cx="${n1(fx)}" cy="${n1(fy)}" r="${n1(fr * 2.6)}" opacity=".3"/><circle cx="${n1(fx)}" cy="${n1(fy)}" r="${n1(fr)}"/></g>`;
  }
  let b = `<path d="${ridgeD}" opacity=".42"/>`;
  const near = []; for (let x = -4; x <= W + 4; x += 6) near.push([x, 290 - 7 * Math.sin(x * .009 + .6) - 3 * Math.sin(x * .023)]);
  b += `<path d="M${pts2d(near)} L${W + 4},${HZ} L-4,${HZ}Z" opacity=".55"/>`;
  b += grass(r, 170, B, .9, .9, x => .9 * lean(t, -x * .012) + 1.1 * wave1(x, t));
  for (const [a, l, wd, bd] of [[-160, 70, 13, -10], [-128, 52, 10, 8], [-22, 74, 12, 10], [-52, 50, 9, -6]]) b += `<path d="${leaf(d.bx, d.by - 2, a, l, wd, 5, bd).d}" opacity=".85"/>`;
  b += stem(d.bx, d.by, px, py, B, 2.4);
  b += puff(px, py, d.r, 74, r, { c: B, w: .75, t, wob: .03 + .03 * wave1(d.px, t), hl: HL74 });
  // 两朵小蒲公英：被风浪扫到会弯，偶尔掉一颗种子飘走
  const small = [[98, 340, 104, 238, 19, 30, 1.4, [[3, 9], [11, 15.5], [19, 20]]], [340, 334, 330, 262, 13, 24, 1.1, [[5, 12], [14, 18.5]]]];
  for (const [bx, by, sx0, sy0, sr, sn, sw, drops] of small) {
    const l2 = lean(t, sx0 * .01) + 1.2 * wave1(sx0, t), sx = sx0 + l2 * 7, tips = [];
    const at = Object.fromEntries(drops);
    b += stem(bx, by, sx, sy0, B, sw) + puff(sx, sy0, sr, sn, r, { c: B, w: .6, t, wob: .04, tips, gone: i => at[i] !== undefined && at[i] <= t });
    for (const [i, L] of drops) {
      const age = t - L; if (age <= 0 || !tips[i]) continue;
      b += seed(tips[i][0] + age * 15 + 5 * Math.sin(age * 1.2 + i), tips[i][1] - age * 7 + 6 * Math.sin(age * .8 + i), -Math.PI / 2 + .4 + .3 * Math.sin(age * 1.6 + i), 9, B, .55);
    }
  }
  const body = `<rect width="${W}" height="${H}" fill="${P}"/>`
    + `<g fill="${Y}" style="mix-blend-mode:multiply" opacity="${n1(inY * 100) / 100}" transform="translate(${n1(3 + 9 * (1 - inY))},${n1(-2 - 6 * (1 - inY))})">${y}</g>`
    + `<g fill="${B}" style="mix-blend-mode:multiply" opacity="${n1(inB * 100) / 100}">${b}</g>`
    + cons(INK2, n1(.5 * inC * 100) / 100, `<path d="M240,128 Q400,70 ${LX - 8},${LY - 6}" stroke-dasharray="3 4" stroke-dashoffset="${n1(-t * 4)}"/>`) + g.use;
  const glow = `<g fill="${Y}">${ff}</g><g opacity="${n1(inL * 100) / 100}"><circle cx="${LX}" cy="${LY}" r="${n1(10 + 1.5 * Math.sin(t * .9))}" fill="${ACC}" opacity=".22"/><circle cx="${LX}" cy="${LY}" r="4.2" fill="${ACC}"/></g>`;
  return { defs: g.def, body, glow };
}

// 二 仰望：铜版蚀刻。排线云慢慢飘，远光呼吸；段末风起，先有几颗种子松脱
function F2({ t = 32, d = D2 } = {}) {
  const r = rngOf(202), PT = '#efe6d2', g = grain(2, .4), ln = lean(t, .7);
  const PX = n1(d.px + ln * 9), PY = n1(d.py + Math.abs(ln) * 1.5), halo = n1(48 + 5 * Math.sin(t * .8));
  let defs = g.def + `<radialGradient id="h2"><stop offset=".5" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>`
    + `<linearGradient id="v2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#000"/></linearGradient>`
    + `<mask id="m2" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="${LX}" cy="${LY}" r="${halo}" fill="url(#h2)"/><circle cx="${PX}" cy="${PY}" r="70" fill="url(#h2)"/></mask>`
    + `<mask id="mv2" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#v2)"/></mask>`
    + `<clipPath id="c2"><path d="${ridgeD}"/></clipPath><clipPath id="pl2"><rect x="13" y="13" width="${W - 26}" height="${H - 26}" rx="4"/></clipPath>`;
  let sky = '';
  for (let y = 22; y < HZ; y += 2.6) {
    const op = n1((.06 + .82 * Math.pow(1 - y / HZ, 1.8)) * 100) / 100;
    let x = 20;
    while (x < 660) {
      const len = 40 + r() * 160, x2 = Math.min(x + len, 660), yy = y + (r() - .5) * .5;
      sky += `<path d="M${n1(x)},${n1(yy)}H${n1(x2)}" opacity="${op}"/>`;
      x = x2 + (r() < .35 ? 1.5 + r() * 3 : 0);
    }
  }
  let cloud = '';
  for (const [x0, cy, rx, ry, v] of [[120, 70, 110, 14, 3.4], [520, 128, 74, 10, 2.5], [300, 44, 120, 11, 2.9], [760, 104, 90, 12, 3.1]]) {
    const cx = (x0 + t * v) % 1000 - 160;
    for (let y = cy - ry; y <= cy + ry; y += 2.6) {
      const hw = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)) * (.82 + .18 * Math.sin(y * .7 + x0));
      if (hw > 2) cloud += `<path d="M${n1(cx - hw)},${n1(y + 1.3)}H${n1(cx + hw)}" stroke-width=".9" opacity=".5"/>`;
    }
  }
  let cross = '';
  for (let k = -200; k < 680; k += 2.8) cross += `<path d="M${n1(k)},20L${n1(k + 200)},220"/>`;
  let mt = '';
  for (let k = 0; k < 900; k += 1.8) mt += `<path d="M${n1(k)},150L${n1(k - 160)},310"/>`;
  for (let y = 200; y < HZ; y += 3) mt += `<path d="M300,${y}H${W}" opacity=".5"/>`;
  let gr = '';
  for (let y = HZ; y < H; y += 1.9) gr += `<path d="M0,${n1(y)}H${W}"/>`;
  for (let k = -100; k < 780; k += 3) gr += `<path d="M${k},${HZ}L${k + 100},${H}" opacity=".6"/>`;
  const det = [5, 17, 29, 41, 53, 61, 68], tips = [];
  const launch = i => { const k = det.indexOf(i); return k < 0 ? 1e9 : 34.5 + k * .8; };
  const pf = puff(PX, PY, d.r, 84, r, { c: INK, w: .5, t, wob: .02 + .02 * wind(t), tips, gone: i => launch(i) <= t, hl: HL84 });
  let fly = '';
  det.forEach((i, k) => {
    const age = t - launch(i); if (age <= 0) return;
    const [x0, y0] = tips[i];
    fly += flyer(x0 + age * 14 + 6 * Math.sin(age * 1.3 + k), y0 - age * 5 + 8 * Math.sin(age * .9 + k * 2), -Math.PI / 2 + .4 + .25 * Math.sin(age * 1.7 + k), 14, '#efe6d2');
  });
  const body = `<rect width="${W}" height="${H}" fill="${P}"/><rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="5" fill="${PT}" stroke="${INK3}" stroke-width=".8"/>`
    + `<g clip-path="url(#pl2)"><g mask="url(#m2)" stroke="${INK}" stroke-width=".5" fill="none">${sky}<g mask="url(#mv2)" opacity=".85">${cross}</g>${cloud}`
    + `<path d="${ridgeD}" fill="${PT}" stroke="none"/><g clip-path="url(#c2)" opacity=".75">${mt}</g><path d="${ridgeLine}" stroke-width=".9"/>`
    + `<g opacity=".85">${gr}</g></g>`
    + grass(r, 110, INK, 1, .9, x => lean(t, -x * .012 + .7))
    + stem(d.bx, d.by, PX, PY, INK, 1.3)
    + stem(150, 398, 104 + ln * 4, 300, INK, .9) + `<ellipse cx="${n1(103 + ln * 4)}" cy="296" rx="3" ry="7" fill="${INK}" transform="rotate(${n1(-35 + ln * 10)} ${n1(103 + ln * 4)} 296)"/>`
    + pf + fly
    + cons(INK, .4, `<path d="M${PX + 40},${PY - 40} Q360,96 ${LX - 10},${LY - 8}" stroke-dasharray="3 4" stroke-dashoffset="${n1(-t * 5)}"/>`) + `</g>` + g.use;
  const glow = Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2 + t * .05, l = (7 + 9 * r()) * (.8 + .2 * Math.sin(t * 1.1 + i)); return `<path d="M${n1(LX + Math.cos(a) * 7)},${n1(LY + Math.sin(a) * 7)}l${n1(Math.cos(a) * l)},${n1(Math.sin(a) * l)}" stroke="${ACC}" stroke-width=".6" opacity=".7"/>`; }).join('')
    + `<circle cx="${LX}" cy="${LY}" r="3.8" fill="${ACC}"/>`;
  return { defs, body, glow };
}

// 三 风起：大理石纹染纸。流纹一直在流，种子一颗颗被风带走，56 拍那阵最大
function F3({ t = 52 } = {}) {
  const r = rngOf(303), B = '#41606d', Y = '#c99a45', g = grain(3, .4), w = wind(t);
  const vort = [[250, 110, 1.7, 85], [440, 190, -1.3, 70], [100, 200, 1.0, 60], [610, 90, -.9, 60]]
    .map(([x, y, s, sg], k) => [x + 10 * Math.sin(t * .21 + k * 1.9), y + 6 * Math.cos(t * .17 + k), s * (.75 + .25 * Math.sin(t * .33 + k * 2.4) + .35 * (w - .6)), sg]);
  const warp = (x, y) => { let X = x, Y2 = y; for (const [vx, vy, s, sg] of vort) { const dx = X - vx, dy = Y2 - vy, a = s * Math.exp(-(dx * dx + dy * dy) / (sg * sg)), c = Math.cos(a), si = Math.sin(a); X = vx + dx * c - dy * si; Y2 = vy + dx * si + dy * c; } return [X, Y2]; };
  const sty = [[INK, .5, 1.4], [B, .45, 3.6], [Y, .5, 2.4], [INK, .25, .6], [B, .3, 1.2], [Y, .35, 4.2], [INK, .4, .9]];
  let m = '';
  for (let i = 0; i < 54; i++) {
    const y0 = -10 + i * 6.2, p = [];
    for (let x = -40; x <= W + 40; x += 5) p.push(warp(x, y0 + 7 * Math.sin(x * .013 + i * .21 - t * .42) + 4 * Math.sin(x * .031 - i * .4 + t * .6)));
    const [c, op, sw] = sty[i % 7];
    m += `<polyline points="${pts2d(p)}" stroke="${c}" stroke-opacity="${op}" stroke-width="${sw}"/>`;
  }
  const ln = lean(t, 1.3), PX = n1(D2.px + ln * 14), PY = n1(D2.py + ln * 3);
  const defs = g.def + `<radialGradient id="h3"><stop offset=".45" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>`
    + `<mask id="m3" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="${LX}" cy="${LY}" r="56" fill="url(#h3)"/><circle cx="${PX}" cy="${PY}" r="66" fill="url(#h3)"/></mask>`
    + `<clipPath id="c3"><rect width="${W}" height="${HZ}"/></clipPath>`;
  const N = 84, launch = [];
  const spd = [], lift = [];
  for (let i = 0; i < N; i++) { const u = r(), v = r(); spd[i] = .7 + .6 * r(); lift[i] = (r() - .5) * 14; launch[i] = u < .15 ? 1e9 : u < .45 ? 40.5 + v * 7.5 : u < .8 ? 54.5 + v * 3 : 57.5 + v * 4.5; }
  // 伙伴先走（47–50 拍，各往一个方向），主角等到 56 拍那阵最大的风才走，走前回头看一眼
  FRIENDS.forEach((i, k) => { launch[i] = 47 + k * .9; spd[i] = [.8, 1.15, .95, .7][k]; lift[i] = [-17, 13, -6, 19][k]; });
  launch[HERO] = 55.6; spd[HERO] = 1; lift[HERO] = 4;
  const look = a => Math.exp(-(((a - 2.2) / .7) ** 2));
  const tips = [];
  const pf = puff(PX, PY, D2.r, N, r, { c: INK, w: .55, t, wob: .02 + .03 * w, tips, gone: i => launch[i] <= t, hl: HL84 });
  let fly = '', trail = '';
  for (let i = 0; i < N; i++) {
    const age = t - launch[i]; if (age <= 0) continue;
    const hero = i === HERO, mate = FRIENDS.includes(i), path = [tips[i]];
    let [x, y] = tips[i];
    const steps = Math.ceil(Math.min(age, 16) / .1);
    for (let k = 0; k < steps; k++) {
      const tt = launch[i] + k * .1, ww = wind(tt), slow = hero ? 1 - .7 * look(k * .1) : 1;
      x += (18 + 34 * ww) * spd[i] * slow * .1; y += (-5 + lift[i] + 12 * Math.sin(x * .012 + tt * .6 + i * 1.37)) * (hero ? .5 : 1) * .1;
      if ((hero || mate) && k % 4 === 3) path.push([x, y]);
    }
    if (hero || mate) trail += `<polyline points="${pts2d(path)}" fill="none" stroke="${INK2}" stroke-width="${hero ? 1.1 : .8}" stroke-dasharray="${hero ? '4 3' : '2 3'}" opacity="${hero ? .85 : .65}"/>`;
    if (x > W + 30 || y < -30 || y > H + 30) continue;
    const vx = 18 + 34 * wind(t);
    const a = -Math.PI / 2 + .25 + .45 * clamp(vx / 60) + .25 * Math.sin(age * 1.9 + i * 2.1) - (hero ? 1.6 * look(age) : 0);
    fly += hero || mate ? flyer(x, y, a, hero ? 27 : 21, P, hero ? 1.1 : .85) : flyer(x, y, a, 16 - 6 * clamp(age / 10), P, .5, .6);
  }
  const body = `<rect width="${W}" height="${H}" fill="${P}"/>`
    + `<g clip-path="url(#c3)"><g mask="url(#m3)" fill="none" stroke-linecap="round" stroke-linejoin="round">${m}</g></g>`
    + `<path d="${ridgeD}" fill="${P}" stroke="${INK}" stroke-width=".9"/>`
    + grass(r, 150, INK, .8, .7, x => 1.4 * lean(t, -x * .015 + 1.3))
    + stem(D2.bx, D2.by, PX, PY, INK, 1.3)
    + trail + pf + fly
    + cons(INK2, .45) + g.use;
  const glow = `<circle cx="${LX}" cy="${LY}" r="${n1(10 + 2 * Math.sin(t * .9))}" fill="${ACC}" opacity=".2"/><circle cx="${LX}" cy="${LY}" r="4" fill="${ACC}"/>`;
  return { defs, body, glow };
}

// 四 高处：蓝晒。大种子在高处慢慢漂，回头看那一朵原来那么小
function F4({ t = 72 } = {}) {
  const r = rngOf(404), CY = '#27476a', CY2 = '#3d6688', WH = '#f3eee2', g = grain(4, .35);
  const edge = ragged(20, 7, r);
  const defs = g.def + `<clipPath id="c4"><path d="${edge}"/></clipPath>`
    + `<radialGradient id="e4" gradientUnits="userSpaceOnUse" cx="${LX}" cy="${LY}" r="560"><stop offset="0" stop-color="${CY2}"/><stop offset=".55" stop-color="${CY}"/><stop offset="1" stop-color="#1d3854"/></radialGradient>`
    + `<filter id="t4" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".006 .03" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 .2 0 0 0 0 .32 0 0 0 0 .45 0 0 0 .9 -.3"/></filter>`
    + `<filter id="b4"><feGaussianBlur stdDeviation=".9"/></filter><filter id="bb4"><feGaussianBlur stdDeviation="2.6"/></filter>`;
  let mead = '';
  for (let i = 0; i < 46; i++) {
    const x = 30 + r() * 620 + 1.2 * Math.sin(t * .9 + i), y = HZ + 4 + Math.pow(r(), 1.3) * 70, s = 1 + (y - HZ) / 22;
    mead += `<path d="M${n1(x)},${n1(y + s * 3)}v${n1(-s * 3)}" stroke-width=".5"/><circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(s)}" fill="${WH}" fill-opacity=".45" stroke="none"/>`;
  }
  let far = '';
  for (let i = 0; i < 9; i++) {
    let x = 60 + r() * 560, y = 40 + r() * 200;
    const a = -Math.PI / 2 + (r() - .5) * 1.2, sz = 18 + r() * 40, op = .3 + r() * .3, sp = 1.5 + r() * 2.5;
    if (Math.hypot(x - LX, y - LY) < 60) x -= 120;
    if (x > 120 && x < 330 && y > 90) y -= 70;
    x += (t - 72) * sp; y += -(t - 72) * .8 + 4 * Math.sin(t * .5 + i);
    far += `<g filter="url(#bb4)" opacity="${n1(op * 100) / 100}">${seed(x, y, a + .1 * Math.sin(t * .6 + i), sz, WH, 1.2)}</g>`;
  }
  // 四个伙伴：已经是远处的小点，各自往不同方向越飘越远
  let mates = '';
  [[300, 112, -3, -1.2, 9], [430, 58, 2.6, -1.5, 7], [372, 262, 2.2, 1.3, 8], [118, 176, -2.4, .7, 10]].forEach(([x0, y0, vx, vy, z], k) => {
    const u = t - 64, x = x0 + vx * u + 3 * Math.sin(t * .7 + k), y = y0 + vy * u + 3 * Math.cos(t * .6 + k * 2), zz = z * (1 - .35 * clamp(u / 16));
    mates += `<path d="M${n1(x - vx * 9)},${n1(y - vy * 9)}L${n1(x)},${n1(y)}" stroke="${WH}" stroke-width=".6" stroke-dasharray="2 3" opacity=".55"/>` + seed(x, y + zz * .3, -Math.PI / 2 + .3 * Math.sin(t * .8 + k), zz, WH, .6);
  });
  const HX = 168, HY = 324, sx = 206 + (t - 72) * 2, sy = 262 - (t - 72) * 1.2 + 4 * Math.sin(t * .7), sa = -1.25 + .07 * Math.sin(t * .55);
  const body = `<rect width="${W}" height="${H}" fill="${P}"/>`
    + `<path d="${edge}" fill="${CY}" stroke="${CY}" stroke-width="3" stroke-opacity=".5" transform="translate(1.5,1)"/>`
    + `<g clip-path="url(#c4)"><rect width="${W}" height="${H}" fill="url(#e4)"/><rect x="${n1(-80 - (t - 64) * 2)}" width="${W + 200}" height="${H}" filter="url(#t4)" opacity=".5"/>`
    + `<path d="${ridgeD}" fill="${WH}" fill-opacity=".07" stroke="${WH}" stroke-opacity=".55" stroke-width=".8"/>`
    + `<path d="M0,${HZ}H${W}" stroke="${WH}" stroke-opacity=".6" stroke-width=".8"/>`
    + `<g stroke="${WH}" stroke-opacity=".5">${mead}</g>`
    + `<path d="M${HX},${HY + 14}v-14" stroke="${WH}" stroke-width=".7"/>` + puff(HX, HY, 6, 16, r, { c: WH, w: .4 })
    + far + mates
    + `<g filter="url(#b4)" opacity=".9">${seed(sx, sy, sa, 190, WH, 1.6)}</g>${seed(sx, sy, sa, 190, WH, .5)}`
    + cons(WH, .38, `<path d="M${n1(sx + 16)},${n1(sy - 26)} Q190,290 ${HX + 4},${HY - 10}" stroke-dasharray="2 3"/><circle cx="${HX}" cy="${HY}" r="${n1(13 + 2 * Math.sin(t * 1.2))}" stroke-dasharray="2 2"/>`)
    + `</g>` + g.use;
  const glow = `<circle cx="${LX}" cy="${LY}" r="${n1(11 + 2 * Math.sin(t * .9))}" fill="${ACC}" opacity=".3"/><circle cx="${LX}" cy="${LY}" r="4.4" fill="${ACC}"/>`;
  return { defs, body, glow };
}

// 五 远光：凸版网点。种子一路飞到光里，光缩成一盏灯笼；更远处又亮起一盏
let inkScreen5 = null;
function F5({ t = 94 } = {}) {
  const g = grain(5, .4), FX = 650, FY = 256;
  inkScreen5 ??= screen(6, 45, (x, y) => {
    const d = Math.hypot(x - LX, y - LY), clear = 1 - Math.exp(-(d * d) / (62 * 62));
    let v = 0;
    if (y >= HZ) v = 1.7 + (y - HZ) / 100;
    else if (y > ridgeY(x)) v = 1.35 + .9 * Math.min(1, (y - ridgeY(x)) / 60);
    else v = .5 + 1.05 * Math.pow(1 - y / HZ, 1.3);
    return v * clear;
  });
  const lamp = sm(86.5, 90, t), fOn = sm(90, 93, t), br = 1 + .06 * Math.sin(t * 1.3);
  const A = (3.2 + 1.1 * (1 - lamp)) * br, Ld = 72 + 55 * (1 - lamp);
  // 伙伴们也各自落了地，山脊上陆续亮起来（位置和尾声那几盏一致）
  const mates = FRIEND_X.slice(0, 3).map((x, j) => [x, ridgeY(x) - 2.5, sm(90.6 + j * 1.1, 91.6 + j * 1.1, t)]);
  const acc = screen(6.5, 15, (x, y) => {
    const d = Math.hypot(x - LX, y - LY), d2 = Math.hypot(x - FX, y - FY);
    let v = Math.max(d < 22 ? 0 : A * Math.exp(-d / Ld), d2 < 6 ? 0 : 2.4 * fOn * Math.exp(-d2 / 26));
    for (const [mx, my, on] of mates) if (on > 0) { const dm = Math.hypot(x - mx, y - my); if (dm > 5) v = Math.max(v, 1.9 * on * Math.exp(-dm / 18)); }
    return v;
  });
  const P0 = [-40, 110], P1 = [150, 205], P2 = [380, 222], P3 = [468, 238], q = sm(80, 89, t);
  const [x0, y0] = bez(P0, P1, P2, P3, q), bob = 3 * sm(88, 90, t) * Math.sin(t * 1.4);
  const sz = 24 + 34 * q, sa = -.62 + .1 * Math.sin(t * 1.2), sx = x0, sy = y0 + bob;
  const trail = []; for (let s = 0; s <= q + 1e-6; s += .02) trail.push(bez(P0, P1, P2, P3, Math.min(s, q)));
  const body = `<rect width="${W}" height="${H}" fill="${P}"/>`
    + `<g fill="${INK}" opacity=".85">${inkScreen5}</g>`
    + `<g fill="${ACC}" style="mix-blend-mode:multiply" opacity=".9">${acc}</g>`
    + `<path d="${ridgeLine}" fill="none" stroke="${INK}" stroke-width=".8" opacity=".6"/>`
    + `<circle cx="${LX}" cy="${LY}" r="21" fill="${P}"/>`
    + `<g opacity="${n1(lamp * 100) / 100}" transform="translate(${LX} ${LY}) scale(1.7) translate(${-LX} ${-LY})" stroke="${INK}" stroke-width=".7" fill="none" stroke-linejoin="round"><rect x="553" y="199" width="14" height="16" rx="1"/><path d="M549.5,199 L560,191 L570.5,199Z M560,191v-4 M556,215v3h8v-3 M553,207h-2 M567,207h2"/></g>`
    + (trail.length > 1 ? `<polyline points="${pts2d(trail)}" fill="none" stroke="${INK2}" stroke-width=".6" stroke-dasharray="3 4" opacity=".5"/>` : '')
    + `<circle cx="${n1(sx + Math.cos(sa) * sz * .55)}" cy="${n1(sy + Math.sin(sa) * sz * .55)}" r="${n1(sz * .45)}" fill="${P}" opacity=".7"/>` + seed(sx, sy, sa, sz, INK, .85)
    + cons(INK2, .5, `<g opacity="${n1(fOn * 100) / 100}"><path d="M574,214 Q616,214 ${FX - 6},${FY - 6}" stroke-dasharray="3 3"/><path d="M${FX - 12},${FY - 9}l6,3 -1,-6"/></g>`) + g.use;
  const o = v => n1(v * 100) / 100;
  const glow = `<circle cx="${LX}" cy="${LY}" r="${n1(6 * br)}" fill="${ACC}" opacity="${o(1 - lamp)}"/>`
    + `<ellipse cx="${LX}" cy="${LY}" rx="${n1(2.7 * 1.7)}" ry="${n1(4 * br * 1.7)}" fill="${ACC}" opacity="${o(lamp)}"/>`
    + `<circle cx="${FX}" cy="${FY}" r="2.2" fill="${ACC}" opacity="${o(fOn)}"/>`
    + mates.map(([x, y, on]) => on > 0 ? `<circle cx="${x}" cy="${n1(y)}" r="5" fill="${ACC}" opacity="${o(.25 * on)}"/><circle cx="${x}" cy="${n1(y)}" r="1.8" fill="${ACC}" opacity="${o(on)}"/>` : '').join('');
  return { defs: g.def, body, glow };
}

// 六 尾声：植物图版。根、叶、花葶、绒球依次长出来，远处的光一盏盏亮起
function F6({ t = 120 } = {}) {
  const r = rngOf(606), PB = '#f4eedc', g = grain(6, .35), k = (a, b) => sm(a, b, t), o2 = v => n1(v * 100) / 100;
  let st = '';
  for (let i = 0; i < 700; i++) {
    const x = 20 + r() * 640, y = HZ + 2 + Math.pow(r(), 1.4) * 80, rr = .4 + r() * .5;
    if ((x > 440 && y > 335) || (x < 100 && y > 355)) continue;
    st += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(rr)}"/>`;
  }
  const defs = g.def + `<clipPath id="c6"><rect x="150" y="299" width="100" height="${n1(86 * k(97, 101.5))}"/></clipPath>`;
  let roots = `<path d="M197,300 C200,330 196,356 203,382 L205,382 C201,356 205,330 203,300Z" fill="${INK}"/>`;
  for (let i = 0; i < 12; i++) {
    const y = 310 + i * 6, s = i % 2 ? 1 : -1, l = 10 + r() * 22, a1 = r(), a2 = r();
    roots += `<path d="M${200 + s},${y} q${s * l * .5},${n1(4 + a1 * 5)} ${n1(s * l)},${n1(8 + a2 * 6)}" fill="none" stroke="${INK}" stroke-width=".5" opacity="${o2(k(97.6 + i * .3, 98.6 + i * .3))}"/>`;
  }
  let lv = '';
  [[-172, 118, 16, 6, 14], [-148, 86, 13, 5, -8], [-12, 124, 16, 6, -16], [-36, 84, 12, 5, 8]].forEach(([a, l, wd, te, bd], j) => {
    const gq = k(98 + j * .8, 101.5 + j * .8); if (gq <= 0) return;
    const L = leaf(200, 299, a + (1 - gq) * (a < -90 ? 30 : -30), l * (.25 + .75 * gq), wd * (.3 + .7 * gq), te, bd * gq);
    lv += `<g opacity="${o2(Math.min(1, gq * 3))}"><path d="${L.d}" fill="${PB}" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/><path d="${L.rib}" fill="none" stroke="${INK}" stroke-width=".5"/></g>`;
  });
  let fl = '';
  for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, r0 = 5, r1 = 15 + 3 * (i % 2); fl += `<path d="M${n1(152 + Math.cos(a) * r0)},${n1(194 + Math.sin(a) * r0 * .7)}L${n1(152 + Math.cos(a) * r1)},${n1(194 + Math.sin(a) * r1 * .7)}"/>`; }
  let lights = '';
  [318, 352, 404, 446, 478, 606, 634, 650].forEach((x, j) => {
    const mate = FRIEND_X.includes(x), r0 = r(), rr = mate ? 1.8 : 1.2 + r0 * 1.1, on = mate ? -9 : 103 + [3, 0, 5, 1.5, 7, 4, 9, 6][j] * 1.4, o = k(on, on + .6), fl2 = o - k(on + .6, on + 2.4), y = n1(ridgeY(x) - 2.5);
    if (o > 0) lights += `<circle cx="${x}" cy="${y}" r="${n1(rr * 4)}" fill="${ACC}" opacity="${o2(.3 * fl2)}"/><circle cx="${x}" cy="${y}" r="${n1(rr)}" fill="${ACC}" opacity="${o2(o)}"/>`;
  });
  const ord = Array.from({ length: 66 }, () => r()), pr = k(105, 110);
  const px = 212 + lean(t) * 4, py = 120;
  const draw = (d, a, b, w) => `<path d="${d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${n1((1 - k(a, b)) * 1000) / 1000}" stroke-width="${w}"/>`;
  const body = `<rect width="${W}" height="${H}" fill="${P}"/><rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="${PB}" stroke="${INK}" stroke-width=".9"/><rect x="19" y="19" width="${W - 38}" height="${H - 38}" fill="none" stroke="${INK}" stroke-width=".35"/>`
    + `<path d="${ridgeLine}" fill="none" stroke="${INK3}" stroke-width=".6" opacity=".6"/>`

    + `<g fill="${INK3}" opacity=".7">${st}</g><path d="M19,${HZ}H${W - 19}" stroke="${INK}" stroke-width=".7"/>`
    + `<g clip-path="url(#c6)">${roots}</g>` + lv
    + `<g fill="none" stroke="${INK}" stroke-linecap="round">${draw(`M200,299 C204,240 214,180 ${n1(px)},${py + 2}`, 100, 105.5, 1.2)}${draw('M198,299 C188,262 162,232 152,200', 101, 105, 1)}${draw('M203,299 C214,276 238,262 250,246', 102, 105.5, .9)}</g>`
    + `<g opacity="${o2(k(104.8, 105.4))}">${puff(px, py, 46, 66, r, { c: INK, w: .45, t, wob: .015, gone: i => ord[i] >= pr })}</g>`
    + `<g stroke="${INK}" stroke-width=".5" fill="none" opacity="${o2(k(104.5, 106))}">${fl}<ellipse cx="152" cy="194" rx="5" ry="3.5" fill="${INK}"/><path d="M146,198 q-2,6 -6,8 M152,199 q0,6 -2,9 M158,198 q2,6 6,8"/></g>`
    + `<g stroke="${INK}" stroke-width=".6" fill="${PB}" opacity="${o2(k(105, 106.5))}"><ellipse cx="253" cy="240" rx="4" ry="9" transform="rotate(35 253 240)"/><path d="M249,247 q-5,2 -7,7 M253,248 q-1,5 -4,9" fill="none"/></g>`
    + `<g opacity="${o2(k(108, 111))}"><ellipse cx="420" cy="181" rx="2.6" ry="9" fill="${INK}"/>${seed(420, 192, -Math.PI / 2, 124, INK, .55)}</g>`
    + `<g fill="${INK}" font-family="Georgia,serif" font-style="italic" font-size="11" opacity="${o2(k(110, 112))}"><text x="262" y="96">1</text><text x="432" y="194">2</text><text x="124" y="186">3</text><text x="264" y="244">4</text></g>`
    + `<g fill="${INK}" font-family="Georgia,serif"><g opacity="${o2(k(112, 114.5))}"><text x="458" y="358" font-size="15" font-style="italic">Taraxacum officinale</text><text x="458" y="373" font-size="9" fill="${INK3}" letter-spacing="1">F. H. WIGG.  ·  PL. VI</text></g><text x="610" y="38" font-size="10" fill="${INK3}" opacity="${o2(k(111, 113))}">Pl. VI.</text></g>`
    + `<g opacity="${o2(k(113, 115))}"><g stroke="${INK}" stroke-width=".6"><path d="M30,370h40M30,367v6M50,368v4M70,367v6"/></g><text x="74" y="373" font-family="Georgia,serif" font-size="8" fill="${INK3}">1 cm</text></g>`
    + cons(INK3, .5, `<path d="M262,104 L392,150" stroke-dasharray="2 3" opacity="${o2(k(110, 112))}"/>`) + g.use;
  const glow = lights + `<circle cx="${LX}" cy="${LY}" r="${n1(9 + 1.5 * Math.sin(t * .9))}" fill="${ACC}" opacity=".2"/><circle cx="${LX}" cy="${LY}" r="4" fill="${ACC}"/>`;
  return { defs, body, glow };
}

window.YG = { W, H, HZ, LX, LY, P, INK, svg, sm, D1, D2, F1, F2, F3, F4, F5, F6 };
})();

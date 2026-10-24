// cast.js：主角，一只头顶嫩芽的小团子。脚底中点 (x,y) 定位，s 是身子半径（世界像素）。
// P: alive 活着（线条抖、有影子）/ draw 被笔画出来的进度 0..1 / ghost 只剩压痕
//    sq 压扁(+)拉长(-) / lean 歪 / lift 离纸高度 / walk 走路相位 / look [x,y] / blink 0..1 / wink 右眼闭
//    mouth smile|o|grin|flat / arms down|up|poke|push|hold|wave / sprout 嫩芽弯 / smudge 墨点 0..1 / shadow
function guy(c, x, y, s, P = {}) {
  const alive = P.alive ?? 0, sd = (P.seed ?? 0) + (alive > 0 ? BOILN * 13 : 0), dr = P.draw ?? 1;
  const jit = alive > 0 ? 1.5 : 0, lean = P.lean ?? 0, lift = P.lift ?? 0, sq = P.sq ?? 0;
  const rx = s * (1 + sq * .28), ry = s * (1.02 - sq * .22);
  const ca = Math.cos(lean), sa = Math.sin(lean), toW = ([lx, ly]) => [x + ca * lx - sa * ly, y - lift + sa * lx + ca * ly];
  const D = (a, b) => seg(dr, a, b);
  // 影子：活着时身下有一点，离纸越高越淡越大
  const sh = (P.shadow ?? alive) * (P.ghost ? 0 : 1);
  if (sh > 0 && dr >= 1) {
    c.save(); c.filter = `blur(${(6 + lift * .12) * ZOOM}px)`; c.globalAlpha = .22 * sh * clamp(1 - lift / 260, .35, 1); c.fillStyle = '#3a2a18';
    c.beginPath(); c.ellipse(x + 10 + lift * .4, y + 2 + lift * .55, rx * (1 + lift / 400), s * .26, 0, 0, TAU); c.fill(); c.restore();
  }
  c.save(); c.translate(x, y - lift); c.rotate(lean);
  const body = jitter(ell(0, -ry * 1.02, rx, ry, 16), jit, sd + 1).map(([px, py]) => [px, py + Math.max(0, py + ry * .5) * .12]);
  const ink = P.ghost ? INK.ghost : INK.blue, oa = P.ghost ? .55 : 1;
  let tip = null;
  const W0 = P.ghost ? 2.6 : 3.3;
  if (P.ghost) {
    const top = -ry * 2.02, parts = [[...body, body[0]], [[0, top], [0, top - s * .22], [0, top - s * .42]],
      ...[-1, 1].map(sg => { const f = ell(sg * s * .4, -s * .06, s * .2, s * .12, 10); return [...f, f[0]]; })];
    parts.forEach((p, i) => {
      bp(c, p, { col: '#c8bfae', w: W0, a: .75 * (P.ghost), seed: 7 + i, gob: false });
      c.save(); c.translate(-1.6, -1.6); bp(c, p, { col: '#ffffff', w: 1.6, a: .8 * P.ghost, seed: 8 + i, blend: 'screen', gob: false }); c.restore();
    });
    c.restore(); return null;
  }
  // 活着的时候它从纸上「站」了起来，底下的字不再透上来
  if (alive > 0) {
    c.save(); c.fillStyle = '#f7f3ea'; c.globalAlpha = clamp(alive);
    const fillP = P => { const Q = through(P, 4, true); c.beginPath(); Q.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.closePath(); c.fill(); };
    fillP(body); c.restore();
  }
  // 脚
  const ph = P.walk ?? 0, step = P.walk != null ? 1 : 0;
  const feet = [-1, 1].map(sg => {
    const up = step * Math.max(0, Math.sin(ph + (sg > 0 ? Math.PI : 0))) * s * .16, fx = sg * s * .4 + step * Math.cos(ph + (sg > 0 ? Math.PI : 0)) * s * .1;
    return jitter(ell(fx, -s * .06 - up, s * .2, s * .12, 10), jit * .6, sd + 20 + sg);
  });
  for (const f of feet) { if (D(.35, .42) > 0) { if (dr >= .7) pencil(c, f, PEN.orange, { seed: 31, a: .9, gap: 3 }); tip = bp(c, [...f, f[0]], { col: ink, w: 2.8, seed: 32, reveal: D(.35, .42) }) || tip; } }
  // 手
  const armSet = {
    down: [[-1, .2, 2.0], [1, .2, 1.1]], up: [[-1, 1.0, 2.6], [1, 1.0, .55]], poke: [[-1, .2, 2.0], [1, .65, .05]],
    push: [[-1, .55, .25], [1, .55, -.05]], hold: [[-1, 1.5, -1.9], [1, 1.5, -1.25]], wave: [[-1, .2, 2.0], [1, 1.1, -.4 + .5 * Math.sin(T * 14)]],
  }[P.arms || 'down'];
  const arms = armSet.map(([sg, hgt, dir]) => {
    const bx = sg * rx * .93, by = -ry * (.8 + hgt * .3), dx = Math.cos(dir) * sg, dy = Math.sin(dir), L = s * .38, wd = s * .11;
    const ex = bx + dx * L, ey = by - Math.abs(dy) * L * (hgt > .9 ? 1 : -1) * (hgt > .9 ? 1 : .2);
    const nx = -(ey - by) / L * wd, ny = (ex - bx) / L * wd;
    return jitter([[bx + nx, by + ny], [ex + nx * .8, ey + ny * .8], [ex + (ex - bx) / L * wd, ey + (ey - by) / L * wd], [ex - nx * .8, ey - ny * .8], [bx - nx, by - ny]], jit * .5, sd + 40 + sg);
  });
  // 身子：桃色打底，右下用橙色压一层暗面
  if (dr > .7) {
    const rv = D(.7, .92);
    pencil(c, body, PEN.peach, { seed: 11, a: .85, gap: 3.2, reveal: rv });
    if (rv > .5) pencil(c, ell(rx * .35, -ry * .7, rx * .95, ry * .9, 14), PEN.orange, { seed: 12, a: .75, gap: 3.6, ang: 48, clip: body, reveal: (rv - .5) * 2 });
    for (const a of arms) pencil(c, a, PEN.peach, { seed: 13, a: .9, gap: 3, reveal: rv });
  }
  if (P.smudge) for (let i = 0; i < 10; i++) {
    if (hash(i + 3) > P.smudge) continue;
    const a = hash(i) * TAU, rr = hash(i + 9) * .8, px = Math.cos(a) * rx * rr, py = -ry + Math.sin(a) * ry * rr * .9;
    if (Math.hypot(px + s * .33, py + s * 1.05) < s * .22 || Math.hypot(px - s * .33, py + s * 1.05) < s * .22) continue;
    bpFill(c, px, py, s * (.04 + hash(i + 5) * .06), s * (.035 + hash(i + 6) * .05), { col: INK.black, seed: 60 + i });
  }
  tip = bp(c, [...body, body[0]], { col: ink, w: W0, a: oa, seed: 9, reveal: D(0, .35), closed: false }) || tip;
  if (dr >= .35) bp(c, body.slice(3, 10).map(([px, py]) => [px + 1.8, py + 1.2]), { col: ink, w: 2, a: .45, seed: 10 });
  for (const a of arms) if (D(.64, .7) > 0) tip = bp(c, a, { col: ink, w: 2.8, seed: 41, reveal: D(.64, .7) }) || tip;
  // 嫩芽
  if (D(.42, .52) > 0) {
    const bend = P.sprout ?? 0, top = [0, -ry * 2.02], st = [top, [bend * s * .1, top[1] - s * .22], [bend * s * .25, top[1] - s * .42]];
    tip = bp(c, st, { col: ink, w: 2.6, seed: 50, reveal: D(.42, .47) }) || tip;
    const e = st[2], lv = (sg, k) => jitter([[e[0], e[1]], [e[0] + sg * s * .18, e[1] - s * .2 + bend * sg * 4], [e[0] + sg * s * .42, e[1] - s * .14 + bend * sg * 6], [e[0] + sg * s * .22, e[1] + s * .02]], jit * .5, sd + 51 + sg);
    for (const sg of [-1, 1]) { const L = lv(sg); if (dr > .95) pencil(c, L, PEN.green, { seed: 52 + sg, a: .9, gap: 3, reveal: D(.95, 1) }); tip = bp(c, [...L, L[0]], { col: ink, w: 2.4, seed: 53 + sg, reveal: D(.47, .52) }) || tip; }
  }
  // 脸
  const lk = P.look || [0, 0], eyeY = -ry * 1.08 + lk[1] * s * .06;
  if (D(.52, .6) > 0) {
    for (const sg of [-1, 1]) {
      const ex = sg * s * .32 + lk[0] * s * .1, closed = (P.blink ?? 0) > .5 || (sg > 0 && P.wink);
      if (closed) tip = bp(c, [[ex - s * .12, eyeY + s * .02], [ex, eyeY - s * .06], [ex + s * .12, eyeY + s * .02]], { col: ink, w: 3, seed: 70 + sg, reveal: D(.52, .6) }) || tip;
      else if (P.mouth === 'o' && P.bigEyes) { bp(c, [...ell(ex, eyeY, s * .14, s * .17, 12), [ex + s * .14, eyeY]], { col: ink, w: 2.6, seed: 72 + sg }); bpFill(c, ex, eyeY, s * .05, s * .06, { col: ink, seed: 74 + sg }); }
      else if (D(.52, .6) > .4) {
        bpFill(c, ex, eyeY, s * .11, s * .145, { col: ink, seed: 75 + sg });
        c.save(); c.globalCompositeOperation = 'source-over'; c.fillStyle = '#fbf8f1'; c.globalAlpha = .95; c.beginPath(); c.arc(ex - s * .035, eyeY - s * .05, s * .038, 0, TAU); c.fill(); c.restore();
        if (D(.52, .6) < 1) tip = [ex, eyeY];
      }
    }
  }
  if (D(.6, .64) > 0) {
    const my = -ry * .78, m = P.mouth || 'smile';
    const mp = m === 'o' ? [...ell(0, my, s * .07, s * .09, 10), [s * .07, my]] : m === 'grin' ? [[-s * .16, my - s * .03], [-s * .08, my + s * .09], [s * .08, my + s * .09], [s * .16, my - s * .03], [-s * .16, my - s * .03]]
      : m === 'flat' ? [[-s * .09, my + s * .01], [0, my + s * .02], [s * .09, my]] : [[-s * .13, my - s * .02], [-s * .06, my + s * .05], [0, my + .5], [s * .06, my + s * .05], [s * .13, my - s * .02]];
    if (m === 'smile') mp.splice(2, 1, [0, my - s * .01]);
    tip = bp(c, mp, { col: ink, w: 2.6, seed: 80, reveal: D(.6, .64), smooth: m !== 'grin' }) || tip;
  }
  if (D(.92, .97) > 0) for (const sg of [-1, 1]) pencil(c, ell(sg * s * .56, -ry * .82, s * .13, s * .075, 10), PEN.pink, { seed: 90 + sg, a: .85, gap: 2.6, reveal: D(.92, .97) });
  c.restore();
  // 正在画的笔尖：彩铅那段让笔尖在身子上来回扫
  let wt = null;
  if (dr < 1) {
    if (dr > .7 && dr < .92) { const u = D(.7, .92); wt = toW([lerp(-rx * .8, rx * .8, u), -ry + Math.sin(u * 38) * ry * .6]); }
    else if (tip) wt = toW(tip);
  }
  return wt;
}

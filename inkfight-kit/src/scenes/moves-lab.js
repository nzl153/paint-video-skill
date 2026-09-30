// moves-lab.js：招式库样张。node render.mjs --loop=moves --strip=<a>:<b> 逐个检查招式；--loop=duel 是用 plan() 拼出来的一段示范对打。
// 不进成片，新片可以留着它当调招式的工作台。
(() => {
  const SLOT = 1.6;
  // [招式, 谁来做, 对面站个靶子吗]
  const LIST = [
    ['thrust', HERO, 1], ['chop', HERO, 1], ['rising', HERO, 1], ['sweepLow', HERO, 1], ['blockHigh', HERO, 0], ['blockMid', HERO, 0],
    ['punch', BRUTE, 1], ['hook', BRUTE, 1], ['hammer', BRUTE, 1], ['shoulder', BRUTE, 1], ['blockArms', BRUTE, 0],
    ['kick', HERO, 1], ['kick', BRUTE, 1], ['duck', HERO, 0], ['sway', BRUTE, 0], ['advance', HERO, 0], ['retreat', BRUTE, 0], ['dash', HERO, 0],
    ['hitHead', BRUTE, 0], ['hitBody', HERO, 0], ['knockback', BRUTE, 0], ['launch', BRUTE, 0], ['fall', HERO, 0], ['getUp', HERO, 0],
  ];
  const lab = LIST.map(([name, F, dummy]) => {
    const hero = F === HERO, u = hero ? 2.2 : 2.3, dir = hero ? 1 : -1, x = hero ? 760 : 1160;
    const p = plan(F, { x, dir, u, t: 0 });
    if (name === 'getUp') p.do('fall', { at: .1 }).wait(.1);
    p.do(name, { at: name.startsWith('hit') || ['knockback', 'launch', 'fall'].includes(name) ? .25 : undefined });
    const a = p.build(), h = a.hits[0];
    let d = null;
    if (dummy && h) { const pt = a.point(h), F2 = hero ? BRUTE : HERO; d = { F: F2, P: { ...plan(F2, { x: pt[0] + dir * 14 * (hero ? 2.3 : 2.2), dir: -dir, u: hero ? 2.3 : 2.2 }).build().at(0) } }; }
    return { name, F, a, d, h };
  });
  const bg = () => { CAM = { x: 960, y: 610, s: 1.25, r: 0, shake: 0 }; sky(); mountains(); cliff(); cam(1); };
  LOOPS.moves = t => {
    const i = Math.min(LIST.length - 1, Math.floor(t / SLOT)), L = lab[i], lt = t - i * SLOT;
    bg();
    if (L.d) body(L.d.F, L.d.P);
    body(L.F, L.a.at(lt));
    if (L.h && Math.abs(lt - L.h.t) < .5 / 24) { const q = L.a.point(L.h); X.save(); X.fillStyle = PAL.red; X.beginPath(); X.arc(q[0], q[1], 7, 0, TAU); X.fill(); X.restore(); }
    finish({ vignette: .3 });
  };
  LOOPS.moves.len = LIST.length * SLOT;
  LOOPS.moves.index = LIST.map(([n, F], i) => `${(i * SLOT).toFixed(1)}s ${n} (${F === HERO ? 'HERO' : 'BRUTE'})`);

  // ---------- 示范：一段 9 秒的对打，全部用 plan() 拼 ----------
  // 棍长拳短：大个子一直想往里挤，主角一直想把他打出去，距离就是这场戏的主线。
  // 冲上来一拳被棍格开 → 主角退半步拉开，一刺打中肚子 → 大个子再挤进来抡勾拳，主角矮身钻过、一脚把他蹬出去
  // → 大个子冲上来双拳砸，被横棍架住，顺势肩撞把主角撞出去一大截 → 停一下 → 大个子扑上来一拳，主角后仰闪开，
  // 从下往上一撩打中下巴，大个子飞出去（全片最重）。7 次接触、4 次打中；高中低三路；有腿有肩；远 → 近 → 远 → 近 → 远
  const A = plan(HERO, { x: 820, dir: 1, u: 2.2, guard: { brow: 1 } });
  const B = plan(BRUTE, { x: 1510, dir: -1, u: 2.3 });
  B.wait(.5).do('dash', { dist: 150 }).do('punch', { at: 2.0 });
  A.do('blockMid', { at: 2.0 }).do('retreat', { at: 2.3, dist: 80, dur: .36 }).do('thrust', { at: 3.1, dx: -12 });
  B.do('hitBody', { at: 3.1 }).do('advance', { at: 3.55, dist: 50, dur: .34 }).do('hook', { at: 4.2, miss: true });
  A.do('duck', { at: 4.2 }).do('kick', { at: 4.65, dx: 45 });
  B.do('knockback', { at: 4.65 }).do('dash', { at: 4.95, dist: 50 }).do('hammer', { at: 6.1 });
  A.do('blockHigh', { at: 6.1 });
  B.do('shoulder', { at: 6.65 });
  A.do('knockback', { at: 6.65 }).do('sway', { at: 7.95 }).do('rising', { at: 8.3, dx: -74 });
  B.do('punch', { at: 7.95, miss: true, dx: 30 }).do('launch', { at: 8.3 });
  const DUEL = 9.8, a = A.build(), b = B.build();
  // 每次接触：时刻、位置、轻重（格挡轻、打中中、最后一下重）
  const HITS = [
    ...a.hits.map(h => ({ t: h.t, p: a.point(h), who: 'A', name: h.name, miss: h.miss })),
    ...b.hits.map(h => ({ t: h.t, p: b.point(h), who: 'B', name: h.name, miss: h.miss })),
  ].filter(h => !['duck', 'sway'].includes(h.name)).sort((p, q) => p.t - q.t);
  const LANDED = { thrust: 1, kick: 1, shoulder: 1, rising: 2 };
  HITS.forEach(h => { h.w = LANDED[h.name] ?? 0; });
  LOOPS.duel = t => {
    const pa = a.at(t), pb = b.at(t), mid = (pa.x + pb.x) / 2;
    const sh = HITS.reduce((s, h) => s + (t >= h.t && !h.miss ? [6, 12, 22][h.w] * Math.exp(-(t - h.t) * 11) : 0), 0);
    CAM = { x: mid, y: 600, s: 1.45, r: 0, shake: sh };
    const fin = HITS[HITS.length - 1], fk = t - fin.t;
    sky(); mountains(); cliff(); cam(1);
    for (const h of HITS) if (t >= h.t - .12 && t < h.t) {              // 出手那几帧给攻击方加两道残影
      const [F, P] = h.who === 'A' ? [HERO, a] : [BRUTE, b];
      for (let k = 2; k >= 1; k--) body(F, { ...P.at(t - k * .035), ghost: h.who === 'A' ? '#e9e2d0' : '#8a7560', a: h.who === 'A' ? .2 : .1 });
    }
    body(BRUTE, pb); body(HERO, pa);
    for (const h of HITS) { const k = seg(t, h.t, h.t + .35); if (k > 0 && k < 1 && !h.miss) splat(h.p[0], h.p[1], (h.w ? 16 : 9) * (1 - k * .6), 300 + Math.round(h.t * 24), { n: h.w ? 12 : 6, reach: 2.4 + k * 2, col: h.w ? PAL.red : PAL.paperLt, a: 1 - k }); }
    grass({ wind: .6 });
    if (fk >= 0 && fk < 3 / 24) {                                       // 最后一下：2 帧反相、1 帧朱红
      impact(fk < 2 / 24 ? 'inv' : 'red');
      const s = (cam(1), toScreenLab(fin.p));
      burstLines(s[0], s[1], 140, 1400, 40, Math.floor(t * 24), { w: 14, col: fk < 2 / 24 ? PAL.paperLt : PAL.ink });
    }
    finish({ vignette: .4 });
    if (t < .4 || t > DUEL - .5) { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = t < .4 ? 1 - t / .4 : seg(t, DUEL - .5, DUEL - .05); X.fillStyle = PAL.paper; X.fillRect(0, 0, W, H); X.restore(); }
  };
  LOOPS.duel.len = DUEL;
  LOOPS.duel.hits = HITS;
  LOOPS.duel.a = a; LOOPS.duel.b = b;
  function toScreenLab(p) { const m = X.getTransform(); return [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f]; }
})();

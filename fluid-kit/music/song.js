// 《一滴墨》整曲，约 90 秒：古典引子 → 砸进来 → 中段静下来再起 → 高潮 → 主题回来 → 小提琴独自收尾。
// D 小调，120 拍（一拍 0.5 秒，一小节 2 秒），事件按秒写。?solo=strings|drums|guitar|bass|brass 只出一组。
// 鼓用 DRSKit 真鼓（tools/drs_build.py 生成的 samples/drs/，?drs= 可换目录），其余采样从 jsDelivr 拉。
async function buildScore(onLoad) {
  const TR = Tone.getContext().transport;
  TR.bpm.value = 60;
  const T = (x, s) => Tone.Frequency(x).transpose(s).toNote();
  const O = 0.6, at = (s, f) => TR.schedule(t => f(t), Math.round((s + O) * 192) + 'i');
  const I = {};
  const EV = window.EV = [];  // 每个音符记一笔，画面按它驱动
  const n = (i, note, s, d, v, lag = 0) => { EV.push([i, note, +(s + lag).toFixed(4), d, +Math.min(1, v).toFixed(3)]); at(s, t => I[i].triggerAttackRelease(note, d, Math.max(0, t + lag), Math.min(1, v))); };
  // ?stem=组名：只出这一组的干声分轨（不过总压缩和混响，-6 dB 留余量），给混音台用
  const q = new URLSearchParams(location.search), stem = q.get('stem'), solo = stem || q.get('solo');

  const post = new Tone.Gain(1).toDestination(), lim = new Tone.Limiter(-1).connect(post);
  const master = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.008, release: 0.2 }).connect(lim);
  const bus = new Tone.Gain(0.8).connect(stem ? new Tone.Gain(0.5).toDestination() : master);
  const rev = new Tone.Reverb({ decay: 2.8, preDelay: 0.02, wet: 1 }); await rev.generate(); rev.connect(bus);
  const revIn = new Tone.Filter(300, 'highpass').connect(rev);
  const group = (name, pan, send) => {
    const g = new Tone.Gain(solo && solo !== name ? 0 : 1), p = new Tone.Panner(pan), r = new Tone.Gain(stem ? 0 : send);
    g.connect(p); p.connect(bus); p.connect(r); r.connect(revIn); return g;
  };
  const S = (cfg, rel, att) => new Tone.Sampler(Object.assign({ release: rel || 1, attack: att || 0 }, cfg));
  const BASE = {};
  const into = (g, i, syn, vol) => { syn.volume.value = BASE[i] = vol; syn.connect(g); I[i] = syn; };
  const NB = 'https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments@master/samples/';
  const nb = (nm, ns) => { const u = {}; ns.forEach(x => u[x.replace('s', '#')] = x + '.mp3'); return { urls: u, baseUrl: NB + nm + '/' }; };
  const VS = 'https://cdn.jsdelivr.net/gh/sgossner/VSCO-2-CE@master/';
  const vs = (dir, file, ns, oct = 1) => { const u = {}; ns.forEach(x => u[T(x, 12 * oct)] = file(x).replace('#', '%23')); return { urls: u, baseUrl: VS + dir.replace(/ /g, '%20') + '/' }; };
  const one = url => ({ urls: { C4: url.split('/').pop() }, baseUrl: url.slice(0, url.lastIndexOf('/') + 1) });
  const VN = ['G2', 'A2', 'B2', 'D3', 'F#3', 'A3', 'C4', 'E4', 'G4', 'B4'], VA = ['C2', 'E2', 'G2', 'B2', 'D3', 'F3', 'A3', 'C4', 'E4'], VC = ['E1', 'G1', 'B1', 'D2', 'F2', 'A2', 'C3', 'E3', 'G3'];

  // 弦乐（音量是摇滚段的基准，古典段用 lvl 往下收）
  const pad = group('strings', -0.05, 0.4), lead = group('strings', 0.08, 0.3), spic = group('strings', -0.3, 0.2), harpG = group('strings', 0.3, 0.45);
  into(pad, 'vsec', S(vs('Strings/Violin Section/susVib', x => `VlnEns_susVib_${x}_v1.wav`, VN), 1, 0.12), -3);
  into(pad, 'vla', S(vs('Strings/Viola Section/susvib', x => `ViolaEns_susvib_${x}_v1_1.wav`, VA), 1, 0.12), -3);
  into(pad, 'vcs', S(vs('Strings/Cello Section/susvib', x => `susvib_${x}_v1_1.wav`, VC), 1, 0.12), -2);
  into(lead, 'vsolo', S(vs('Strings/Solo Violin/Arco Vib', x => `LLVln_ArcoVib_${x}_f.wav`, ['G3', 'A3', 'C4', 'E4', 'G4', 'A4', 'C5', 'E5', 'G5', 'A5', 'C6'], 0), 0.5, 0.03), 8);
  into(lead, 'vmel', S(vs('Strings/Violin Section/susVib', x => `VlnEns_susVib_${x}_v1.wav`, VN), 0.6, 0.06), 4);
  into(spic, 'sv', S(vs('Strings/Violin Section/Spic', x => `VlnEns_Spic_${x}_v2_rr1.wav`, ['G2', 'A2', 'B2', 'D3', 'F#3', 'A3', 'C4', 'E4', 'G4', 'B4', 'D5']), 0.2), 3);
  into(spic, 'sc', S(vs('Strings/Cello Section/spic', x => `spic_${x}_v2_RR1.wav`, ['C1', 'E1', 'G1', 'B1', 'D2', 'F2', 'A2', 'C3', 'E3', 'G3']), 0.2), 3);
  into(harpG, 'harp', S(nb('harp', ['A2', 'C3', 'E3', 'G3', 'B3', 'D4', 'F4', 'A4', 'C5', 'E5', 'G5', 'B5', 'D6']), 2.5), -12);
  const brass = group('brass', -0.15, 0.4);
  into(brass, 'horn', S(vs('Brass/F Horn/sus', x => `MOHorn_sus_${x}_${['D4', 'F4'].includes(x) ? 'v1' : 'v2'}_1.wav`, ['A#1', 'D2', 'F2', 'A2', 'C3']), 1.2, 0.1), 12);  // 圆号采样本身很轻，-8 时整曲几乎听不见

  // 鼓
  // DRSKit 自带房间和头顶麦，混响送得比单层鼓少；声像在采样里，不再整组偏
  const drums = group('drums', 0, 0.06), cym = group('drums', 0, 0.12);
  const DK = { kick: 5, snare: -1, hat: -6, tom: 0, crash: -3 };
  await new Promise((ok, no) => document.head.appendChild(Object.assign(document.createElement('script'), { src: 'drs.js', onload: ok, onerror: no })));
  const kit = await drsKit(['kick', 'snare', 'hat', 'tom1', 'tom2', 'tom3', 'crash=crashL+crashR'], new URL(q.get('drs') || '../samples/drs/', location.href).href);
  into(drums, 'kick', kit.kick, DK.kick);
  into(drums, 'boom', S(one(VS + 'Percussion/BDrumNewhit_v6_rr1_Sum.wav'), 1.5), -10);
  into(drums, 'snare', kit.snare, DK.snare);
  into(drums, 'hat', kit.hat, DK.hat);
  into(drums, 't1', kit.tom1, DK.tom); into(drums, 't2', kit.tom2, DK.tom); into(drums, 't3', kit.tom3, DK.tom);
  into(cym, 'crash', kit.crash, DK.crash);
  into(cym, 'swell', S(one(VS + 'Percussion/susCymb1-cresc-Short_v1.wav'), 0.3), -7);
  into(drums, 'roll', S(one(VS + 'Percussion/Snare2-rollSN_v5_rr1_Sum.wav'), 0.2), -8);

  // 失真吉他：干净采样过失真，左右各一把，右边晚 14 毫秒
  const gtrChain = pan => {
    const g = group('guitar', pan, 0.1);
    const cab = new Tone.Filter({ frequency: 4200, type: 'lowpass', rolloff: -24 }).connect(g);
    const eq = new Tone.EQ3({ low: 1, mid: -5, high: 1, lowFrequency: 220, highFrequency: 2200 }).connect(cab);
    const dist = new Tone.Distortion({ distortion: 0.92, oversample: '4x' }).connect(eq);
    return new Tone.Filter(140, 'highpass').connect(dist);
  };
  const GT = ['A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'Cs2', 'E2', 'Fs2'];
  for (const [i, pan] of [['gl', -0.75], ['gr', 0.75]]) { I[i] = S(nb('guitar-electric', GT), 0.06); I[i].volume.value = BASE[i] = -16; I[i].connect(gtrChain(pan)); }
  into(group('bass', 0, 0.05), 'bass', S(nb('bass-electric', ['As1', 'Cs2', 'E2', 'G2', 'As2', 'Cs3', 'E3']), 0.1), -3);
  await Tone.loaded();
  onLoad && onLoad(1, 1);

  // 各乐器相对基准的增减（dB），在 s 秒内 r 秒渐变过去
  const lvl = (s, map, r = 0.1) => at(s, t => Object.entries(map).forEach(([i, db]) => I[i].volume.rampTo(BASE[i] + db, r, t)));
  const CLASSIC = { vsolo: -1, vmel: -4, vsec: 2, vla: 2, vcs: 2, sv: -3, sc: -3 }, ROCK = { vsolo: 0, vmel: 0, vsec: 0, vla: 0, vcs: 0, sv: 0, sc: 0 };

  const C = {
    Dm: { b: 'D2', ce: 'D3', pw: ['D3', 'A3', 'D4'], arp: ['D4', 'F4', 'A4', 'F4'], c: 'D2', a: ['A2', 'D3'], v: ['F4', 'A4'], up: ['D5', 'F5', 'A5', 'D6'] },
    Bb: { b: 'A#1', ce: 'A#2', pw: ['A#2', 'F3', 'A#3'], arp: ['D4', 'F4', 'A#4', 'F4'], c: 'A#1', a: ['F2', 'D3'], v: ['D4', 'F4'], up: ['D5', 'F5', 'A#5', 'D6'] },
    F: { b: 'F2', ce: 'F2', pw: ['F2', 'C3', 'F3'], arp: ['C4', 'F4', 'A4', 'F4'], c: 'F2', a: ['C3', 'A3'], v: ['A4', 'C5'], up: ['C5', 'F5', 'A5', 'C6'] },
    C: { b: 'C2', ce: 'C3', pw: ['C3', 'G3', 'C4'], arp: ['C4', 'E4', 'G4', 'E4'], c: 'C2', a: ['G2', 'E3'], v: ['E4', 'G4'], up: ['C5', 'E5', 'G5', 'C6'] },
    Gm: { b: 'G1', ce: 'G2', pw: ['G2', 'D3', 'G3'], arp: ['D4', 'G4', 'A#4', 'G4'], c: 'G1', a: ['D2', 'A#2'], v: ['D4', 'G4'], up: ['D5', 'G5', 'A#5', 'D6'] },
    A: { b: 'A1', ce: 'A2', pw: ['A2', 'E3', 'A3'], arp: ['C#4', 'E4', 'A4', 'E4'], c: 'A1', a: ['E2', 'C#3'], v: ['E4', 'A4'], up: ['C#5', 'E5', 'A5', 'C#6'] },
  };
  const padChord = (ch, s, d, v = 0.45) => { const x = C[ch];
    n('vcs', x.c, s - 0.08, d, v); x.a.forEach((y, k) => n('vla', y, s - 0.08 + 0.02 * k, d, v - 0.03 * k)); x.v.forEach((y, k) => n('vsec', y, s - 0.05 + 0.02 * k, d, v - 0.05 - 0.03 * k)); };
  const melody = (i, notes, v, lag = 0, tr = 0) => notes.forEach(([x, s, d]) => n(i, T(x, tr), s, d * 0.95, v, lag));
  const harpArp = (ch, s, v = 0.45) => C[ch].up.forEach((x, k) => n('harp', T(x, -12), s + k * 0.12, 2, v - 0.05 * k));

  // 摇滚小节：吉他八分扫弦、贝斯八分、跳弓、镲；kickX 加一下大鼓
  const rockBar = (ch, s0, { snare = true, kickX = false, sv = true } = {}) => { const x = C[ch];
    for (let k = 0; k < 8; k++) {
      const s = s0 + k * 0.25, acc = k === 0 || k === 3 || k === 6;
      const v = acc ? 0.95 : 0.7, d = k === 0 ? 0.45 : 0.17;
      x.pw.forEach(y => { n('gl', y, s, d, v); n('gr', y, s, d, v * 0.95, 0.014); });
      n('bass', x.b, s, 0.2, acc ? 0.9 : 0.72);
      n('sc', x.ce, s, 0.18, acc ? 0.75 : 0.55);
      if (sv) n('sv', x.arp[k % 4], s, 0.16, acc ? 0.7 : 0.5);
      n('hat', 'C4', s, 0.1, k % 2 ? 0.45 : 0.75);
    }
    [0, 0.75, 1.0, ...(kickX ? [1.75] : [])].forEach(y => n('kick', 'C4', s0 + y, 0.2, y ? 0.8 : 1));
    if (snare) [0.5, 1.5].forEach(y => n('snare', 'C4', s0 + y, 0.2, 0.95));
    padChord(ch, s0, 1.95);
  };
  // 半速小节：吉他一下扫满让它响，鼓走半速
  const halfBar = (ch, s0, v = 0.8) => { const x = C[ch];
    x.pw.forEach(y => { n('gl', y, s0, 1.9, v); n('gr', y, s0, 1.9, v * 0.95, 0.014); });
    n('bass', x.b, s0, 1.9, v);
    n('kick', 'C4', s0, 0.3, 1); n('kick', 'C4', s0 + 0.75, 0.3, 0.7); n('snare', 'C4', s0 + 1.0, 0.3, 0.9);
    for (let k = 0; k < 4; k++) n('hat', 'C4', s0 + k * 0.5, 0.1, 0.6);
    for (let k = 0; k < 8; k++) n('sc', x.ce, s0 + k * 0.25, 0.18, 0.4 + 0.04 * k);
    padChord(ch, s0, 1.95, 0.5);
  };
  const hitCrash = (s, v = 1) => { n('crash', 'C4', s, 2, v); n('boom', 'C4', s, 1.5, 0.9 * v); };
  const tomFill = (s, len = 0.5, v = 0.7) => { const m = Math.round(len / 0.0625); for (let k = 0; k < m; k++) n(['t1', 't2', 't3'][Math.floor(3 * k / m)], 'C4', s + k * 0.0625, 0.15, v + 0.25 * k / m); };
  const snareRun = (s, len, v0 = 0.4) => { const m = Math.round(len / 0.125); for (let k = 0; k < m; k++) n('snare', 'C4', s + k * 0.125, 0.1, v0 + (0.95 - v0) * k / m); };

  // 主动机（8 秒，和声 Dm–B♭–A–Dm）
  const MOTIF = [['D5', 0, .75], ['A4', .75, .25], ['D5', 1, .5], ['E5', 1.5, .25], ['F5', 1.75, .25],
    ['G5', 2, .75], ['F5', 2.75, .25], ['E5', 3, .5], ['D5', 3.5, .5],
    ['C#5', 4, .75], ['E5', 4.75, .25], ['A5', 5, .5], ['G5', 5.5, .25], ['F5', 5.75, .25],
    ['E5', 6, .5], ['C#5', 6.5, .5], ['D5', 7, 1]];
  const at0 = (list, s0) => list.map(([x, s, d]) => [x, s + s0, d]);
  // 摇滚段旋律（8 秒两遍，和声 Dm–B♭–F–C）
  const THEME1 = [['A5', 0, 1.5], ['G5', 1.5, .25], ['F5', 1.75, .25], ['F5', 2, 1], ['D5', 3, .5], ['F5', 3.5, .5],
    ['C6', 4, 1.5], ['A5', 5.5, .5], ['G5', 6, 1], ['E5', 7, .5], ['G5', 7.5, .5]];
  const THEME2 = [['A5', 0, 1.5], ['G5', 1.5, .25], ['A5', 1.75, .25], ['A#5', 2, 1], ['A5', 3, .5], ['F5', 3.5, .5],
    ['C6', 4, 1], ['D6', 5, .5], ['C6', 5.5, .5], ['A#5', 6, .5], ['A5', 6.5, .5], ['G5', 7, .5], ['E5', 7.5, .5]];
  const theme = (list, s0) => { melody('vsolo', at0(list, s0), 0.72, 0.01); melody('vmel', at0(list, s0), 0.62, -0.03, -12); };

  // ── 0–16 古典引子 ──
  lvl(-0.6, CLASSIC, 0.01);
  [['Dm', 0], ['Bb', 2], ['A', 4], ['Dm', 6]].forEach(([ch, s]) => padChord(ch, s, 2.05, s ? 0.42 : 0.38));
  n('vcs', 'D2', -0.6, 0.7, 0.35);
  harpArp('Dm', 0, 0.4);
  melody('vsolo', MOTIF, 0.52, 0.01);
  // 第二遍：小提琴组低八度跟进，大提琴跳弓压住往上推
  [['Dm', 8], ['Bb', 10], ['Bb', 12], ['A', 14]].forEach(([ch, s]) => padChord(ch, s, 2.05, 0.46));
  harpArp('Dm', 8, 0.45);
  melody('vsolo', at0(MOTIF.slice(0, 9), 8), 0.58, 0.01);
  melody('vsolo', [['D5', 12, .5], ['E5', 12.5, .25], ['F5', 12.75, .25], ['G5', 13, .5], ['A5', 13.5, .5],
    ['A#5', 14, .5], ['A5', 14.5, .5], ['G5', 15, .25], ['F5', 15.25, .25], ['E5', 15.5, .5]], 0.64, 0.01);
  melody('vmel', at0(MOTIF.slice(0, 9), 8), 0.5, -0.03, -12);
  for (let k = 0; k < 32; k++) { const s = 8 + k * 0.25, ch = s < 12 ? (s < 10 ? 'Dm' : 'Bb') : (s < 14 ? 'Bb' : 'A');
    n('sc', C[ch].ce, s, 0.2, 0.3 + k * 0.018); if (k >= 16) n('sv', C[ch].arp[k % 4], s, 0.16, 0.3 + (k - 16) * 0.03); }
  n('swell', 'C4', 14.2, 1.8, 0.75); n('roll', 'C4', 15.0, 0.5, 0.6); tomFill(15.5, 0.5, 0.6);

  // ── 16–32 砸进来 ──
  lvl(15.9, ROCK);
  at(15.95, t => bus.gain.setValueAtTime(0.8 * 0.87, t)); at(31.95, t => bus.gain.setValueAtTime(0.8, t));  // 第一次砸进来留一点余地给高潮
  ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C'].forEach((ch, b) => rockBar(ch, 16 + 2 * b, { kickX: b % 2 === 1, snare: b !== 7 }));
  hitCrash(16); hitCrash(24, 0.85);
  theme(THEME1, 16); theme(THEME2, 24);
  n('snare', 'C4', 30.5, 0.2, 0.95); snareRun(31, 0.5); tomFill(31.5, 0.5);

  // ── 32–48 中段：先静下来，再慢慢起 ──
  lvl(31.95, Object.assign({}, CLASSIC, { vmel: 11, vsec: 6, vla: 6, vcs: 6 }), 0.05);
  hitCrash(32, 0.9);
  [['Dm', 32], ['Bb', 34], ['A', 36], ['Dm', 38]].forEach(([ch, s]) => padChord(ch, s, 2.05, 0.4));
  harpArp('Dm', 32.4, 0.4); harpArp('Bb', 34, 0.35); harpArp('A', 36, 0.35); harpArp('Dm', 38, 0.35);
  melody('vsolo', at0(MOTIF, 32), 0.5, 0.01); melody('vmel', at0(MOTIF, 32), 0.62, -0.03);
  for (let k = 0; k < 16; k++) n('kick', 'C4', 32.5 + k * 0.5, 0.3, k % 2 ? 0.35 : 0.5);
  // 40–48：半速鼓和长音吉他起来，独奏小提琴高八度唱动机
  lvl(39.9, { vsolo: 0, sc: -1, vmel: 0, vsec: 2, vla: 2, vcs: 2 }, 0.5);
  [['Bb', 40, 0.65], ['C', 42, 0.72], ['Dm', 44, 0.8], ['A', 46, 0.9]].forEach(([ch, s, v]) => halfBar(ch, s, v));
  hitCrash(40, 0.7);
  melody('vsolo', [['F5', 40, 1], ['D5', 41, .5], ['F5', 41.5, .5], ['G5', 42, 1], ['E5', 43, .5], ['G5', 43.5, .5],
    ['A5', 44, 1.5], ['D6', 45.5, .5], ['C#6', 46, 1], ['E5', 47, .5], ['A5', 47.5, .5]], 0.7, 0.01);
  n('swell', 'C4', 46.2, 1.8, 0.85); snareRun(47, 1, 0.3);

  // ── 48–64 高潮：小提琴十六分琶音飞起来，小提琴组拉长音，圆号托底 ──
  lvl(47.9, Object.assign({}, ROCK, { gl: 1.5, gr: 1.5, horn: 5, vsolo: 4, vmel: 5 }));
  const HI = ['Bb', 'C', 'Dm', 'Dm', 'Gm', 'A', 'Bb', 'A'];
  HI.forEach((ch, b) => { const s0 = 48 + 2 * b;
    rockBar(ch, s0, { kickX: true, snare: b !== 7 });
    const up = C[ch].up, seq = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 2, 3, 2, 1];
    seq.forEach((j, k) => n('vsolo', up[j], s0 + k * 0.125, 0.12, (k % 4 ? 0.6 : 0.75), 0.005));
    n('horn', C[ch].c.replace(/\d/, d => +d + 1), s0, 1.9, 0.5);
  });
  melody('vmel', [['D5', 48, 2], ['E5', 50, 2], ['F5', 52, 1.5], ['E5', 53.5, .5], ['D5', 54, 2],
    ['D5', 56, 2], ['C#5', 58, 2], ['D5', 60, 1], ['F5', 61, 1], ['E5', 62, 2]], 0.7, -0.03);
  HI.forEach((ch, b) => { const s0 = 48 + 2 * b;
    hitCrash(s0, b % 2 ? 0.85 : 1);
    C[ch].pw.slice(0, 2).forEach(y => [0, 0.75, 1.5].forEach(z => { n('gl', T(y, 12), s0 + z, 0.6, 0.7); n('gr', T(y, 12), s0 + z, 0.6, 0.68, 0.014); }));
    for (let k = 0; k < 8; k++) n('hat', 'C4', s0 + k * 0.25 + 0.125, 0.08, 0.35);
  });
  // 高潮那 16 秒压缩松一点、总线推 2 dB，结束收回
  at(47.95, t => { master.threshold.setValueAtTime(-12, t); bus.gain.setValueAtTime(0.8 * 1.4, t); });
  at(63.95, t => { master.threshold.setValueAtTime(-18, t); bus.gain.setValueAtTime(0.8, t); });
  n('snare', 'C4', 62.5, 0.2, 0.95); tomFill(63, 1, 0.6);

  // ── 64–80 主题回来 ──
  lvl(63.9, Object.assign({}, ROCK, { gl: 1, gr: 1, horn: 0 }));
  ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F'].forEach((ch, b) => rockBar(ch, 64 + 2 * b, { kickX: b % 2 === 1 }));
  hitCrash(64); hitCrash(68, 0.8); hitCrash(72); hitCrash(76, 0.8);
  theme(THEME1, 64); theme(THEME2.filter(([, s]) => s < 6), 72);
  // 78–80：齐奏三下重音，停住
  [0, 0.75, 1.5].forEach((y, k) => { const s = 78 + y, v = 0.85 + 0.05 * k;
    C.C.pw.forEach(z => { n('gl', z, s, 0.3, v); n('gr', z, s, 0.3, v, 0.014); });
    n('bass', 'C2', s, 0.3, v); n('kick', 'C4', s, 0.3, 1); n('snare', 'C4', s, 0.3, 0.9); n('crash', 'C4', s, 0.5, 0.7);
    ['C3', 'G3'].forEach(z => n('vla', z, s, 0.3, 0.6)); n('vcs', 'C2', s, 0.3, 0.6); n('vsolo', ['G5', 'A#5', 'C6'][k], s, 0.3, 0.75); });

  // ── 80 落在 D，余音收；84 起小提琴独自把动机拉一遍 ──
  C.Dm.pw.forEach(x => { n('gl', x, 80, 2.5, 1); n('gr', x, 80, 2.5, 0.95, 0.014); });
  n('bass', 'D2', 80, 2.5, 1); n('kick', 'C4', 80, 0.3, 1); hitCrash(80);
  n('vmel', 'D5', 80, 3, 0.65); n('vsolo', 'A5', 80, 3, 0.7);
  padChord('Dm', 80, 4, 0.5); n('horn', 'D3', 80, 3.5, 0.55);
  lvl(83, { vsolo: 4, vsec: 3, vla: 3, vcs: 3 }, 1);
  padChord('Dm', 84, 6, 0.4);
  harpArp('Dm', 84, 0.35);
  melody('vsolo', [['D5', 84.5, .75], ['A4', 85.25, .25], ['D5', 85.5, .5], ['E5', 86, .25], ['F5', 86.25, .25],
    ['E5', 86.5, .75], ['D5', 87.25, 2.5]], 0.58, 0.01);
  n('harp', 'D5', 87.25, 3, 0.35); n('harp', 'A5', 87.4, 3, 0.25);
  // 各段最终响度（以第一次砸进来为 0）：引子 -2.8 / 中段 -8.9 / 半速 -3.3 / 高潮 +2 / 主题回来 -2.7 / 尾声 -8.3
  [[-0.6, 1.698], [15.95, 1], [31.95, 0.767], [47.95, 0.733], [63.95, 0.646]].forEach(([s, g]) => at(s, t => post.gain.linearRampTo(g, 0.03, t)));
  return { out: post };
}

// 《一口》v3 配乐：100 拍（一拍 0.6 秒）西部奔马，D 大调。一步画风一拍，马蹄每拍落地一次。
// 弦乐跳弓打奔马节奏，圆号唱主题；中段加速成半拍；迈布里奇那张老照片急刹；回到甜甜圈收成钢琴和竖琴。
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

  // 鼓：DRSKit 真鼓（tools/drs_build.py 生成的 samples/drs/，?drs= 可换目录）
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

  // 低音：电贝斯采样，跟着大提琴走
  into(group('bass', 0, 0.05), 'bass', S(nb('bass-electric', ['As1', 'Cs2', 'E2', 'G2', 'As2', 'Cs3', 'E3']), 0.1), -3);
  const pno = group('piano', -0.2, 0.3);
  into(pno, 'pno', S(nb('piano', ['A1', 'C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6', 'A6']), 1.6), -5);
  await Tone.loaded();
  onLoad && onLoad(1, 1);

  const lvl = (s, map, r = 0.1) => at(s, t => Object.entries(map).forEach(([i, db]) => I[i].volume.rampTo(BASE[i] + db, r, t)));
  const B = 0.6, b = x => x * B;
  const C = {
    D: { r: 'D2', arp: ['D4', 'F#4', 'A4', 'D5'], v: ['F#4', 'A4'], a: ['A2', 'D3'], c: 'D2', up: ['D5', 'F#5', 'A5', 'D6'] },
    G: { r: 'G1', arp: ['D4', 'G4', 'B4', 'D5'], v: ['D4', 'G4'], a: ['B2', 'D3'], c: 'G1', up: ['D5', 'G5', 'B5', 'D6'] },
    A: { r: 'A1', arp: ['C#4', 'E4', 'A4', 'C#5'], v: ['E4', 'A4'], a: ['C#3', 'E3'], c: 'A1', up: ['C#5', 'E5', 'A5', 'C#6'] },
    Bm: { r: 'B1', arp: ['D4', 'F#4', 'B4', 'D5'], v: ['D4', 'F#4'], a: ['F#2', 'D3'], c: 'B1', up: ['D5', 'F#5', 'B5', 'D6'] },
    F: { r: 'F1', arp: ['C4', 'F4', 'A4', 'C5'], v: ['C4', 'F4'], a: ['A2', 'C3'], c: 'F1', up: ['C5', 'F5', 'A5', 'C6'] },
  };
  const padChord = (ch, s, d, v = 0.4) => { const x = C[ch];
    n('vcs', x.c, s - 0.06, d, v); x.a.forEach((y, k) => n('vla', y, s - 0.06 + 0.02 * k, d, v - 0.03 * k)); x.v.forEach((y, k) => n('vsec', y, s - 0.04 + 0.02 * k, d, v - 0.05 - 0.03 * k)); };
  const melody = (i, notes, v, lag = 0) => notes.forEach(([x, s, d]) => n(i, x, s, d * 0.94, v, lag));
  const hitCrash = (s, v = 1) => { n('crash', 'C4', s, 2, v); n('boom', 'C4', s, 1.5, 0.8 * v); };
  const tomFill = (s, len, v = 0.65) => { const m = Math.round(len / (B / 4)); for (let k = 0; k < m; k++) n(['t1', 't2', 't3'][Math.floor(3 * k / m)], 'C4', s + k * B / 4, 0.15, v + 0.3 * k / m); };
  const harpUp = (ch, s, v = 0.45) => C[ch].up.forEach((x, k) => n('harp', T(x, -12), s + k * 0.1, 2, v - 0.05 * k));
  const up1 = (note) => note.replace(/\d/, (d) => +d + 1);

  // 奔马：一拍里「嗒嗒-嘡」，两个十六分接一个八分，就是马蹄落地的声音。
  // fast = 半拍一组（加速段）；heavy 每拍都加军鼓。
  const gallop = (ch, beat, v, { fast = false, heavy = false } = {}) => {
    const x = C[ch];
    const unit = fast ? 0.5 : 1;
    for (let g = 0; g < 1 / unit; g++) {
      const s0 = b(beat + g * unit);
      [0, 0.25, 0.5].forEach((o, k) => {
        const s = s0 + b(o * unit);
        n('sv', x.arp[(k + g) % 4], s, b(0.22 * unit), v * (k === 2 ? 1 : 0.75));
        n('sc', up1(x.r), s, b(0.22 * unit), v * (k === 2 ? 0.95 : 0.7));
      });
      n('kick', 'C4', s0 + b(0.5 * unit), 0.2, 0.6 + 0.35 * v);
      if (g === 0) n('kick', 'C4', s0, 0.2, 0.5 + 0.3 * v);
    }
    // Sixteenths on the hat all the way through: this is what makes it run.
    for (let k = 0; k < 4; k++) n('hat', 'C4', b(beat + k * 0.25), 0.06, k ? 0.32 + 0.1 * v : 0.55);
    n('snare', 'C4', b(beat + 0.5), 0.2, 0.55 + 0.4 * v);
    if (heavy) { n('snare', 'C4', b(beat + 0.75), 0.1, 0.25); n('snare', 'C4', b(beat), 0.15, 0.35); }
  };
  const run = (b0, b1, chords, v0, v1, opt = {}) => {
    for (let beat = b0; beat < b1; beat++) {
      const k = (beat - b0) / Math.max(1, b1 - b0), v = v0 + (v1 - v0) * k;
      const ch = chords.filter(([s]) => s <= beat).pop()[1];
      gallop(ch, beat, v, opt);
      if (chords.some(([s]) => s === beat)) {
        const end = (chords.find(([s]) => s > beat) || [b1])[0];
        padChord(ch, b(beat), b(end - beat) - 0.05, 0.36 + 0.14 * v);
        n('bass', C[ch].r, b(beat), b(end - beat) - 0.1, 0.85);
      }
    }
  };

  // ── 0–6 拍：面包店里的甜甜圈。一把孤零零的小提琴，钢琴一个和弦，低音弦乐一点点近了 ──
  lvl(-0.6, { vsec: 2, vla: 2, vcs: 3 }, 0.01);
  n('vcs', 'D2', 0, b(6), 0.38); n('vla', 'A2', b(1), b(5), 0.28);
  ['D3', 'A3', 'F#4'].forEach((x, k) => n('pno', x, b(0.2) + k * 0.05, b(3), 0.3));
  melody('vsolo', [['A4', b(0.5), b(1)], ['D5', b(1.5), b(0.5)], ['E5', b(2), b(0.5)], ['F#5', b(2.5), b(1.5)], ['E5', b(4), b(0.5)], ['A5', b(4.5), b(1.5)]], 0.42);
  for (let k = 0; k < 8; k++) n('sc', 'D3', b(2 + k * 0.5), b(0.2), 0.15 + 0.06 * k);
  n('swell', 'C4', b(4.2), b(1.8), 0.8); n('roll', 'C4', b(5), b(1), 0.55);
  for (let k = 0; k < 8; k++) n('t3', 'C4', b(4 + k * 0.25), 0.15, 0.25 + 0.06 * k);

  // ── 6–18 拍：接力开始，一拍一换，圆号唱主题 ──
  hitCrash(b(6), 0.85);
  run(6, 18, [[6, 'D'], [8, 'G'], [10, 'D'], [12, 'A'], [14, 'Bm'], [16, 'G']], 0.7, 0.9, { fast: true });
  const THEME = [['D4', 6, 1.5], ['A3', 7.5, 0.5], ['D4', 8, 0.5], ['E4', 8.5, 0.5], ['F#4', 9, 1], ['E4', 10, 0.5], ['D4', 10.5, 0.5],
    ['A4', 11, 1], ['G4', 12, 0.5], ['F#4', 12.5, 0.5], ['E4', 13, 1], ['F#4', 14, 1.5], ['D4', 15.5, 0.5], ['B3', 16, 1], ['D4', 17, 0.5], ['E4', 17.5, 0.5]];
  melody('horn', THEME.map(([x, s, d]) => [x, b(s), b(d)]), 0.75);
  melody('vmel', THEME.map(([x, s, d]) => [T(x, 12), b(s), b(d)]), 0.5, -0.02);
  tomFill(b(17.5), b(0.5), 0.6);

  // ── 18–24 拍：半拍一换，马蹄翻倍，旋律往上爬 ──
  hitCrash(b(18), 0.9);
  lvl(b(18) - 0.05, { vsolo: 2, vmel: 3 });
  run(18, 24, [[18, 'Bm'], [20, 'G'], [22, 'A']], 0.8, 1, { fast: true, heavy: true });
  melody('vmel', [['F#5', b(18), b(1)], ['A5', b(19), b(1)], ['B5', b(20), b(1)], ['D6', b(21), b(1)], ['C#6', b(22), b(1)], ['E6', b(23), b(1)]], 0.62, -0.02);
  for (let k = 0; k < 24; k++) n('vsolo', C[k < 8 ? 'Bm' : k < 16 ? 'G' : 'A'].up[[0, 1, 2, 3, 2, 1][k % 6]], b(18) + k * b(0.25), b(0.25), k % 4 ? 0.48 : 0.6);
  for (let beat = 18; beat < 23; beat += 2) n('crash', 'C4', b(beat), 1.2, 0.45);
  n('roll', 'C4', b(22), b(1), 0.5);
  tomFill(b(23), b(1), 0.6);

  // ── 24–26 拍：迈布里奇那张照片。全停，只剩一个悬着的和弦 ──
  at(b(24) - 0.02, t => bus.gain.setValueAtTime(0.8 * 1.2, t));
  hitCrash(b(24), 1);
  padChord('A', b(24), b(2) + 0.3, 0.6);
  n('vsolo', 'E6', b(24), b(2), 0.6);
  n('horn', 'A3', b(24), b(2), 0.55);
  n('bass', 'A1', b(24), b(2), 0.85);
  harpUp('A', b(24) + 0.05, 0.5);

  // ── 26–34 拍：再跑起来，全队最满，冲向终点 ──
  at(b(26) - 0.02, t => bus.gain.setValueAtTime(0.8, t));
  hitCrash(b(26), 0.95);
  run(26, 34, [[26, 'D'], [28, 'F'], [30, 'G'], [32, 'A']], 0.9, 1, { fast: true, heavy: true });
  melody('horn', [['D4', b(26), b(1.5)], ['A3', b(27.5), b(0.5)], ['D4', b(28), b(0.5)], ['F4', b(28.5), b(0.5)], ['A4', b(29), b(1)],
    ['G4', b(30), b(1)], ['B4', b(31), b(1)], ['A4', b(32), b(1)], ['C#5', b(33), b(1)]], 0.85);
  melody('vmel', [['D5', b(26), b(2)], ['F5', b(28), b(2)], ['G5', b(30), b(2)], ['A5', b(32), b(1)], ['C#6', b(33), b(1)]], 0.62, -0.02);
  tomFill(b(33), b(1), 0.7);

  // ── 34–35 拍：回到甜甜圈，全队落在 D 上 ──
  hitCrash(b(34), 0.9);
  padChord('D', b(34), b(1.8), 0.6);
  n('horn', 'D3', b(34), b(1.5), 0.6); n('vsolo', 'D6', b(34), b(1.5), 0.55); n('bass', 'D2', b(34), b(1.5), 0.85);
  harpUp('D', b(34) + 0.05, 0.45);

  // ── 35– 收尾：镜头拉远，钢琴一个人；第 39 拍咬一口，先空一下，主和弦再落下来 ──
  [['A4', 35.5, 1], ['F#4', 36.5, 0.5], ['E4', 37, 0.5], ['D4', 37.5, 1], ['E4', 38.5, 0.5]].forEach(([x, s, d]) => n('pno', x, b(s), b(d), 0.38));
  ['G2', 'D3', 'B3'].forEach((x, k) => n('pno', x, b(35.5) + k * 0.05, b(2), 0.28));
  ['A2', 'E3', 'C#4'].forEach((x, k) => n('pno', x, b(37.5) + k * 0.05, b(1.5), 0.28));
  n('vcs', 'G2', b(35.5), b(2), 0.25); n('vcs', 'A2', b(37.5), b(1.5), 0.25);
  ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4', 'F#4'].forEach((x, k) => n('pno', x, b(39) + 0.14 + k * 0.035, b(4), 0.42 - 0.02 * k));
  padChord('D', b(39) + 0.12, b(4), 0.3);
  n('bass', 'D2', b(39) + 0.14, b(4), 0.6);
  ['D4', 'F#4', 'A4', 'D5', 'F#5'].forEach((x, k) => n('harp', x, b(39.6) + k * 0.15, 2.5, 0.3 - 0.03 * k));
  lvl(b(40), { vsec: -8, vla: -8, vcs: -8, pno: -4 }, b(2.5));
  return { out: post };
}

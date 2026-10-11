// 《远光》配乐 v10（定稿）。依赖全局 Tone（14.7.77）。
// buildScore(onLoad) 加载采样并把整首曲子排进 Transport，返回最后的 Limiter 和总拍数。
// 随机细节用固定种子生成，每次渲染结果一样，画面可以按拍对齐。

const END = 120, PPQ = 192, TAIL_BEATS = 8;
const SECTIONS = [["盛夏", 0], ["仰望", 24], ["风起", 40], ["高处", 64], ["远光", 80], ["尾声", 96]];

async function buildScore(onLoad) {
  const TR = Tone.getContext().transport;
  let seed = 20261011;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const NB = 'https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments@master/samples/';
  const GM = 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/';
  const nb = (nm, ns) => { const u = {}; ns.forEach(x => u[x.replace('s', '#')] = x + '.mp3'); return { urls: u, baseUrl: NB + nm + '/' }; };
  const gm = (nm, ns) => { const u = {}; ns.forEach(x => u[x] = x + '.mp3'); return { urls: u, baseUrl: GM + nm + '-mp3/' }; };
  const G9 = ['C3', 'Eb3', 'Gb3', 'A3', 'C4', 'Eb4', 'Gb4', 'A4', 'C5', 'Eb5'];
  const I = {};
  const cl = v => Math.max(0.05, Math.min(1, v)), R = a => (rnd() * 2 - 1) * a;
  const D = d => d * 60 / TR.bpm.value;
  const at = (b, f) => TR.schedule(t => f(t), Math.round(b * PPQ) + 'i');
  const n = (i, note, b, d, v, lag = 0, jit = 0.012) => { const j = Math.abs(R(jit)), vv = cl(v + R(0.06)); at(b, t => I[i].triggerAttackRelease(note, D(d), t + lag + j, vv)); };
  const hit = (i, b, d, v) => { const j = Math.abs(R(0.004)); at(b, t => I[i].triggerAttackRelease(d, t + j, cl(v))); };
  const crackle = (b0, b1, k) => { const ts = []; for (let i = 0; i < k; i++) ts.push(b0 + rnd() * (b1 - b0)); ts.sort((a, b) => a - b).forEach((b, i) => { if (i && b - ts[i - 1] < 0.02) return; hit('crk', b, 0.004, 0.2 + rnd() * 0.5); }); };
  const tempo = (b, bpm, beats) => at(b, t => TR.bpm.rampTo(bpm, beats * 60 / bpm, t));
  const roll = (i, notes, b, d, v, sp = 0.028) => { const js = notes.map(() => Math.abs(R(0.006))), vs = notes.map((x, k) => cl(v - k * 0.02 + R(0.05))); at(b, t => notes.forEach((x, k) => I[i].triggerAttackRelease(x, D(d), t + k * sp + js[k], vs[k]))); };
  const gust = (b, v) => ["D4", "F#4", "A4", "B4", "D5", "E5", "F#5", "A5", "D6"].forEach((x, i) => n('harp', x, b + i * 0.07, 1.2, v + i * 0.02, 0, 0.003));
  const PN = []; for (let o = 3; o <= 6; o++) ["D", "E", "F#", "A", "B"].forEach(x => PN.push(Tone.Frequency(x + o).toMidi()));
  const up = note => { const m = Tone.Frequency(note).toMidi(); const nx = PN.find(p => p > m) || m + 2; return Tone.Frequency(nx, 'midi').toNote(); };
  const T = (x, s) => Tone.Frequency(x).transpose(s).toNote();
  const CH = {
    D: { k: ["D3", "A3", "E4", "F#4"], a: ["D4", "F#4", "A4", "E5"], b: "D2" }, Dmaj7: { k: ["D3", "F#3", "A3", "C#4"], a: ["D4", "F#4", "A4", "C#5"], b: "D2" },
    G: { k: ["G3", "B3", "D4", "F#4"], a: ["B3", "D4", "F#4", "A4"], b: "G2" }, Gm: { k: ["G3", "A#3", "D4"], a: ["G3", "A#3", "D4", "G4"], b: "G2" },
    A: { k: ["A3", "C#4", "E4"], a: ["A3", "C#4", "E4", "A4"], b: "A2" }, Fm: { k: ["F#3", "A3", "C#4", "E4"], a: ["A3", "C#4", "E4", "F#4"], b: "F#2" },
    Bm: { k: ["F#3", "A3", "B3", "D4"], a: ["B3", "D4", "F#4", "A4"], b: "B1" }, Em: { k: ["E3", "G3", "B3", "D4"], a: ["E4", "G4", "B4", "D5"], b: "E2" },
    As: { k: ["A3", "D4", "E4"], a: ["A3", "D4", "E4", "A4"], b: "A2" }, Dend: { k: ["D3", "A3", "E4", "F#4", "A4"], a: ["D4", "F#4", "A4", "E5"], b: "D2" }
  };
  const PATS = [[0, 1, 2, 1, 3, 1, 2, 1], [0, 2, 1, 3, 2, 1, 0, 2], [0, 1, 2, 3, 2, 3, 1, 2], [0, 2, 3, 2, 1, 2, 3, 1], [0, 1, 3, 1, 2, 1, 3, 2]];
  const CELV = [0.5, 0.36, 0.4, 0.56, 0.42, 0.36, 0.4, 0.56];

  function bar(bi, c, o) {
    const s = bi * 4, C = CH[c], v = o.v || 0.6, L = o.len || 4, K = o.ki || 'piano', cut = o.cut || 4, ok = b => b < cut;
    if (o.pad !== null) { const sv = cl((o.sv || 0.45) + R(0.04)); at(s, t => I[o.pad || 'str'].triggerAttackRelease(C.k, D(Math.min(L, cut + 0.5)), t, sv)); }
    if (o.keys === 'whole') roll(K, C.k, s, Math.min(L, cut) * 0.95, v - 0.16, 0.035);
    if (o.keys === 'push') { roll(K, C.k, s, 1.4, v - 0.2, 0.02); if (ok(2.5)) roll(K, C.k, s + 2.5, 1.4, v - 0.28, 0.014); }
    if (o.strum) [[0, 1.4, 0], [1.5, 0.9, -0.15], [2.5, 0.6, -0.08], [3, 0.9, -0.12]].forEach(([b, d, dv], k) => roll('guitar', k % 2 ? [...C.a].reverse() : C.a, s + b, d, v + dv, 0.022));
    if (o.arp) {
      const [ai, st] = o.arp, sub = st === '8' ? 0.5 : 1, cnt = 4 / sub, P = PATS[Math.floor(rnd() * PATS.length)];
      for (let i = 0; i < cnt; i++) {
        if (!ok(i * sub)) break;
        const down = (i * sub) % 1 === 0;
        if (!down && rnd() < 0.08) continue;
        if (o.sparse && i > 0 && rnd() < 0.3) continue;
        let x = C.a[P[i % 8]];
        if (i === cnt - 1 && rnd() < 0.25) x = T(x, 12);
        n(ai, x, s + i * sub, sub * 2.2, (o.av || v) - 0.1 + (down ? 0.08 : -0.06) + R(0.05), 0, 0.008);
      }
    }
    if (o.pizz) [0, 1, 2, 3].forEach(i => { if (!ok(i) || (i === 3 && rnd() < 0.3)) return; n('pizz', C.a[[0, 1, 0, 2][i]], s + i, 0.4, (i % 2 ? 0.4 : 0.5) + (o.pv || 0)); });
    if (o.bass === 'whole') n('abass', C.b, s, Math.min(L, cut) * 0.95, o.bv || 0.68, 0, 0.005);
    if (o.bass === 'half') { n('abass', C.b, s, 1.9, 0.68, 0, 0.005); if (ok(2)) n('abass', rnd() < 0.4 ? T(C.b, 7) : C.b, s + 2, 1.9, 0.55, 0, 0.005); }
    if (o.bass === 'q') for (let i = 0; i < 4; i++) n('abass', i === 2 ? T(C.b, 7) : C.b, s + i, 0.9, i % 2 ? 0.5 : 0.66, 0, 0.004);
    if (o.cel8) for (let i = 0; i < 8; i++) n('cello', i % 2 ? T(C.b, 19) : T(C.b, 12), s + i * 0.5, 0.5, CELV[i], 0, 0.006);
    if (o.dr === 'heart') { const r = C.b; n('timp', r, s, 1.2, 0.62, 0, 0.003); n('timp', r, s + 0.6, 1.2, 0.44, 0, 0.003); n('timp', r, s + 2, 1.2, 0.5, 0, 0.003); n('timp', r, s + 2.6, 1.2, 0.36, 0, 0.003); }
    if (o.dr === 'half') n('timp', C.b, s, 3, 0.55, 0, 0.003);
  }
  function mel(i, arr, st, o = {}) {
    const oct = o.oct || 0, v = o.v || 0.7, m = o.mult || 1, lag = o.lag === undefined ? 0.02 : o.lag, N = arr.length;
    arr.forEach(([b, no, d], k) => {
      const x = oct ? T(no, 12 * oct) : no;
      const arc = 0.86 + 0.24 * Math.sin(Math.PI * (k + 0.5) / N);
      const vv = v * arc + (k === N - 1 ? -0.06 : 0);
      if (o.grace && d * m >= 1.5 && rnd() < o.grace) n(i, up(x), st + b * m - 0.14, 0.16, vv * 0.7, lag, 0.004);
      n(i, x, st + b * m, d * m, vv, lag);
    });
  }
  const TA = [[0, "A3", .75], [.75, "D4", .25], [1, "F#4", 1.5], [2.5, "E4", .5], [3, "D4", .5], [3.5, "E4", .5], [4, "B3", 1], [5, "A3", 1], [6, "D4", 2]];
  const TB = [[0, "F#4", .75], [.75, "A4", .25], [1, "B4", 1.5], [2.5, "A4", .5], [3, "F#4", .5], [3.5, "A4", .5], [4, "E4", 1], [5, "D4", .5], [5.5, "E4", .5], [6, "F#4", 2]];
  const TAv = [[0, "A3", .75], [.75, "D4", .25], [1, "F#4", 1], [2, "A4", .5], [2.5, "G4", .5], [3, "F#4", .5], [3.5, "E4", .5], [4, "B3", .75], [4.75, "D4", .25], [5, "E4", 1], [6, "F#4", 1], [7, "E4", 1]];
  const TBv = [[0, "F#4", .75], [.75, "A4", .25], [1, "B4", 1.5], [2.5, "C#5", .5], [3, "A4", 1], [4, "F#4", .75], [4.75, "E4", .25], [5, "D4", 1], [6, "B3", 2.5]];

  TR.bpm.value = 78;
  const lim = new Tone.Limiter(-1).toDestination();
  const master = new Tone.Compressor({ threshold: -16, ratio: 3, attack: 0.01, release: 0.25 }).connect(lim);
  const bus = new Tone.Gain(0.85).connect(master);
  const rev = new Tone.Reverb({ decay: 3.2, preDelay: 0.03, wet: 1 }); await rev.generate(); rev.connect(bus);
  const revIn = new Tone.Filter(300, "highpass").connect(rev);
  const mk = (syn, vol, send, pan, pre) => { syn.volume.value = vol; const p = new Tone.Panner(pan); (pre ? (syn.connect(pre), pre) : syn).connect(p); p.connect(bus); const g = new Tone.Gain(send); p.connect(g); g.connect(revIn); return syn; };
  let done = 0;
  const S = (cfg, rel, att) => new Tone.Sampler(Object.assign({ release: rel || 1, attack: att || 0, onload: () => { done++; onLoad && onLoad(done, 17); } }, cfg));
  I.piano = mk(S(nb('piano', ['A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6']), 1.2), -5, 0.28, -0.1);
  I.flute = mk(S(nb('flute', ['C4', 'E4', 'A4', 'C5', 'E5', 'A5', 'C6', 'E6']), 0.8), -8, 0.3, 0.12);
  I.harp = mk(S(nb('harp', ['A2', 'C3', 'E3', 'G3', 'B3', 'D4', 'F4', 'A4', 'C5', 'E5', 'G5', 'B5', 'D6']), 1.5), -9, 0.35, 0.3);
  I.cello = mk(S(nb('cello', ['C2', 'E2', 'G2', 'A2', 'C3', 'E3', 'G3', 'A3', 'C4']), 1), -10, 0.3, -0.3);
  I.violin = mk(S(nb('violin', ['A3', 'C4', 'E4', 'G4', 'A4', 'C5', 'E5', 'G5', 'A5', 'C6', 'E6']), 0.9, 0.02), -8, 0.32, 0.08);
  I.clar = mk(S(nb('clarinet', ['D3', 'F3', 'As3', 'D4', 'F4', 'As4', 'D5', 'F5', 'As5']), 1, 0.02), -8, 0.38, 0.1);
  I.str = mk(S(gm('string_ensemble_1', ['A2', 'C3', 'Eb3', 'Gb3', 'A3', 'C4', 'Eb4', 'Gb4', 'A4']), 2, 0.3), -16, 0.45, 0);
  I.trem = mk(S(gm('tremolo_strings', ['A2', 'C3', 'Eb3', 'Gb3', 'A3', 'C4', 'Eb4', 'Gb4', 'A4', 'C5', 'Eb5']), 1.5, 0.2), -15, 0.4, -0.15);
  I.choir = mk(S(gm('choir_aahs', ['A2', 'C3', 'Eb3', 'Gb3', 'A3', 'C4', 'Eb4', 'Gb4', 'A4', 'C5', 'Eb5']), 2.5, 0.6), -15, 0.55, 0);
  I.horn = mk(S(gm('french_horn', ['A2', 'C3', 'Eb3', 'Gb3', 'A3', 'C4', 'Eb4', 'Gb4']), 1, 0.05), -15, 0.4, -0.2);
  I.guitar = mk(S(gm('acoustic_guitar_nylon', G9), 1.2), -5, 0.3, 0.2);
  I.pizz = mk(S(gm('pizzicato_strings', G9), 0.4), -11, 0.3, -0.25);
  I.mbox = mk(S(gm('music_box', ['C5', 'Eb5', 'Gb5', 'A5', 'C6', 'Eb6', 'Gb6', 'A6']), 1.5), -16, 0.5, 0.4);
  I.celesta = mk(S(gm('celesta', ['C5', 'Eb5', 'Gb5', 'A5', 'C6', 'Eb6']), 1.5), -16, 0.5, -0.35);
  I.timp = mk(S(gm('timpani', ['A1', 'D2']), 2), -8, 0.3, 0);
  I.abass = mk(S(gm('acoustic_bass', ['A1', 'C2', 'Eb2', 'Gb2', 'A2', 'C3']), 0.6), -7, 0.05, 0);
  I.rcym = mk(S(gm('reverse_cymbal', ['C3', 'C4']), 0.5), -18, 0.5, 0);
  I.crk = mk(new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.0005, decay: 0.004, sustain: 0 } }), -34, 0, 0, new Tone.Filter(2500, "highpass"));
  await Tone.loaded();

  at(0, t => { bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(0.85, t); bus.gain.linearRampToValueAtTime(1, t + 3); });
  tempo(22, 80, 4); tempo(34, 84, 6); tempo(46, 94, 10); tempo(57, 82, 7); tempo(64, 72, 4); tempo(74, 78, 6); tempo(86.5, 72, 1.5); tempo(88, 78, 2); tempo(92, 74, 4); tempo(104, 64, 14);

  // 一、盛夏
  crackle(0, 24, 50);
  n('mbox', "A5", 0, 2, 0.5); n('mbox', "F#5", 1, 2, 0.45); n('mbox', "D5", 2.1, 2, 0.42);
  bar(0, "Dmaj7", { arp: ['guitar', '8'], v: 0.68, sv: 0.48, bass: 'whole', bv: 0.52 }); bar(1, "G", { arp: ['guitar', '8'], v: 0.7, sv: 0.5, bass: 'whole', bv: 0.56 });
  ["A4", "B4", "D5", "E5", "F#5"].forEach((x, i) => n('harp', x, 6 + i * 0.4, 1, 0.42 + i * 0.03, 0, 0.008));
  bar(2, "D", { arp: ['guitar', '8'], bass: 'whole', bv: 0.64, v: 0.64, sv: 0.45 }); bar(3, "Bm", { arp: ['guitar', '8'], pizz: true, bass: 'whole', bv: 0.64, v: 0.64, sv: 0.45 });
  bar(4, "G", { strum: true, pizz: true, bass: 'whole', bv: 0.64, v: 0.6, sv: 0.45 }); bar(5, "A", { arp: ['guitar', '8'], pizz: true, bass: 'whole', bv: 0.66, v: 0.64, sv: 0.47 });
  mel('piano', TA, 8, { oct: 1, v: 0.74, grace: 0.2 }); mel('piano', TB, 16, { v: 0.76, grace: 0.2 });
  [["A5", 14.4], ["F#5", 14.8], ["E5", 15.2]].forEach(([x, b], i) => n('harp', x, b, 1, 0.42 - i * 0.03));
  ["F#5", "E5", "D5"].forEach((x, i) => n('harp', x, 22.5 + i * 0.4, 1.2, 0.44 - i * 0.05));
  [[3, "A5"], [11, "F#5"], [19.5, "B5"]].forEach(([b, x]) => n('mbox', x, b, 2, 0.34));

  // 二、仰望
  [["G", 6], ["A", 7], ["Fm", 8]].forEach(([c, b]) => bar(b, c, { arp: ['harp', '8'], keys: 'push', bass: 'half', pizz: b > 6, pv: -0.08, v: 0.62, sv: 0.45 + (b - 6) * 0.06 }));
  bar(9, "Bm", { arp: ['harp', '8'], keys: 'push', bass: 'half', pizz: true, pv: -0.08, v: 0.62, sv: 0.6, cut: 3 });
  mel('flute', [[0, "D4", .75], [.75, "F#4", .25], [1, "A4", 1.5], [2.5, "B4", .5], [3, "A4", 1], [4, "E4", .75], [4.75, "F#4", .25], [5, "A4", 2], [8, "F#4", .75], [8.75, "A4", .25], [9, "D5", 1.5], [10.5, "C#5", .5], [11, "B4", 1], [12, "A4", 1], [13, "F#4", 1], [14, "B4", 2]], 24, { v: 0.74, grace: 0.25, lag: 0.025 });
  mel('violin', [[0, "D4", 4], [4, "C#4", 4], [8, "C#4", 2], [10, "E4", 2], [12, "D4", 3]], 24, { v: 0.48, lag: 0.03 });
  n('horn', "C#4", 32, 4, 0.4); n('horn', "D4", 36, 3, 0.46);
  n('rcym', "C4", 37.6, 2.4, 0.55);

  // 三、风起
  [["G", 10], ["A", 11], ["Fm", 12], ["Bm", 13], ["Em", 14]].forEach(([c, b]) => bar(b, c, { pad: 'trem', sv: 0.52, bass: 'q', cel8: true, dr: 'heart', v: 0.66 }));
  [40, 48, 56].forEach(b => gust(b - 0.65, 0.36));
  bar(15, "As", { pad: 'trem', sv: 0.46, bass: 'whole', bv: 0.55, dr: 'half', keys: 'whole', v: 0.58 });
  mel('flute', TA, 40, { oct: 1, v: 0.74, grace: 0.2 }); mel('violin', TA, 40, { oct: 1, v: 0.62 });
  mel('flute', TB, 48, { oct: 1, v: 0.78, grace: 0.2 }); mel('violin', TB, 48, { oct: 1, v: 0.66 });
  [[0, "D3", 4], [4, "E3", 4], [8, "C#3", 4], [12, "D3", 4]].forEach(([b, x, d]) => n('horn', x, 40 + b, d, 0.36));
  mel('flute', [[0, "D6", 1.5], [1.5, "B5", .5], [2, "A5", 1], [3, "F#5", 1]], 56, { v: 0.82 }); mel('violin', [[0, "D5", 1.5], [1.5, "B4", .5], [2, "A4", 1], [3, "F#4", 1]], 56, { v: 0.66 });
  ["E5", "D5", "B4", "A4"].forEach((x, i) => n('flute', x, 60.5 + i * 0.8, 0.9, 0.5 - i * 0.05));

  // 四、高处
  bar(16, "G", { arp: ['harp', '4'], sparse: true, pad: 'choir', v: 0.45, sv: 0.45 }); bar(17, "D", { arp: ['harp', '4'], sparse: true, pad: 'choir', bass: 'whole', bv: 0.45, v: 0.45, sv: 0.46 }); bar(18, "Em", { arp: ['harp', '4'], sparse: true, pad: 'choir', bass: 'whole', bv: 0.5, v: 0.46, sv: 0.48 });
  bar(19, "As", { arp: ['harp', '8'], pad: 'choir', bass: 'whole', bv: 0.55, v: 0.52, sv: 0.52 }); at(76, t => I.str.triggerAttackRelease(CH.As.k, D(4), t, 0.5));
  mel('clar', [[0, "A4", 1.5], [1.5, "D5", .5], [2, "F#5", 4], [6, "E5", 1], [7, "D5", 1], [8, "E5", 2], [10, "B4", 2], [12, "A4", 3]], 64, { v: 0.6, grace: 0.15, lag: 0.04 });
  ["A5", "F#6", "D6", "B5", "E6", "A5", "D6", "F#6"].forEach((x, i) => n('celesta', x, 64.5 + i * 1.5, 1.4, 0.3 + (i % 3 === 0 ? 0.04 : 0)));
  n('rcym', "C4", 77.6, 2.4, 0.45); n('piano', "F#3", 79, 0.5, 0.5); n('piano', "G3", 79.5, 0.5, 0.55);

  // 五、远光
  [["G", 20], ["A", 21], ["Fm", 22]].forEach(([c, b]) => bar(b, c, { arp: ['harp', '8'], av: 0.52, keys: 'push', bass: 'half', pizz: b > 20, pv: -0.1, v: 0.58, sv: 0.48 }));
  bar(23, "Bm", { arp: ['harp', '8'], av: 0.5, keys: 'push', bass: 'half', pizz: true, pv: -0.1, v: 0.56, sv: 0.45, cut: 2 });
  mel('violin', TAv, 80, { v: 0.8, grace: 0.25, lag: 0.03 }); mel('violin', TBv, 88, { v: 0.84, grace: 0.25, lag: 0.03 });
  mel('cello', [[0, "D3", 2], [2, "B2", 2], [4, "C#3", 2], [6, "E3", 1.5], [7.5, "D3", .5], [8, "A2", 2], [10, "C#3", 2], [12, "D3", 2]], 80, { v: 0.55, lag: 0.03 });
  n('harp', "A5", 87, 2, 0.4);

  // 尾声
  crackle(96, 124, 40);
  bar(24, "G", { keys: 'whole', v: 0.5, sv: 0.38 }); bar(25, "Gm", { keys: 'whole', v: 0.48, sv: 0.36, bass: 'whole', bv: 0.48 }); bar(26, "A", { keys: 'whole', bass: 'whole', bv: 0.5, v: 0.48, sv: 0.38 });
  n('abass', "G2", 96, 3.8, 0.52);
  bar(27, "Dend", { keys: 'whole', bass: 'whole', bv: 0.5, v: 0.5, len: 12, sv: 0.4 }); at(108, t => I.choir.triggerAttackRelease(CH.Dend.k, D(12), t, 0.3));
  mel('piano', [[0, "A4", 1.5], [1.5, "D5", .5], [2, "F#5", 2], [4, "G5", 2], [6, "D5", 2], [8, "E5", 1.5], [9.5, "F#5", .5], [10, "E5", 2], [12, "A4", 4], [16, "F#4", 2], [18, "E4", 2], [20, "D4", 4]], 96, { v: 0.62, grace: 0.15, lag: 0.03 });
  mel('violin', [[0, "D4", 4], [4, "A#3", 4], [8, "C#4", 4], [12, "D4", 4], [16, "A3", 8]], 96, { v: 0.48, lag: 0.04 });
  [[6.5, "F#5"], [14.5, "A5"]].forEach(([b, x]) => n('harp', x, 96 + b, 2, 0.36));
  n('mbox', "E6", 118.5, 3, 0.3);

  return { out: lim, endBeats: END + TAIL_BEATS, ppq: PPQ, sections: SECTIONS };
}

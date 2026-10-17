// 《沙漏》配乐：画面为主，音乐照着画面写。60 拍每分钟，一拍就是一秒，所有时刻直接对分镜的秒数。依赖全局 Tone（14.7.77）。
// 乐器全用真采样：钢琴、竖琴、独奏小提琴、弦乐组（VSCO2）、大提琴、圆号、定音鼓、八音盒。随机细节用固定种子。

const END = 75, PPQ = 192, TAIL_BEATS = 6;

async function buildScore(onLoad) {
  const TR = Tone.getContext().transport;
  let seed = 20261017;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const NB = 'https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments@master/samples/';
  const GM = 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/';
  const nb = (nm, ns) => { const u = {}; ns.forEach(x => u[x.replace('s', '#')] = x + '.mp3'); return { urls: u, baseUrl: NB + nm + '/' }; };
  const gm = (nm, ns) => { const u = {}; ns.forEach(x => u[x] = x + '.mp3'); return { urls: u, baseUrl: GM + nm + '-mp3/' }; };
  const I = {};
  const cl = v => Math.max(0.05, Math.min(1, v)), R = a => (rnd() * 2 - 1) * a;
  const D = d => d * 60 / TR.bpm.value;
  const at = (b, f) => TR.schedule(t => f(t), Math.max(0, Math.round(b * PPQ)) + 'i');
  const n = (i, note, b, d, v, lag = 0, jit = 0.012) => { const j = Math.abs(R(jit)), vv = cl(v + R(0.05)); at(b, t => I[i].triggerAttackRelease(note, D(d), Math.max(0, t + lag + j), vv)); };
  const roll = (i, notes, b, d, v, sp = 0.03) => { const vs = notes.map((x, k) => cl(v - k * 0.02 + R(0.04))); at(b, t => notes.forEach((x, k) => I[i].triggerAttackRelease(x, D(d), t + k * sp + Math.abs(R(0.006)), vs[k]))); };
  const T = (x, s) => Tone.Frequency(x).transpose(s).toNote();
  // 旋律：力度走一条弧，句头轻、句中最强、句尾收；相邻音重叠一点当连弓
  function mel(i, arr, st, o = {}) {
    const v = o.v || 0.7, N = arr.length, lag = o.lag ?? 0.025;
    arr.forEach(([b, x, d], k) => {
      const vv = v * (0.84 + 0.26 * Math.sin(Math.PI * (k + 0.5) / N)) - (k === N - 1 ? 0.06 : 0);
      n(i, x, st + b, d + (o.leg && k < N - 1 ? o.leg : 0), vv, lag);
    });
  }
  // 铺底：一个和弦按音区分给大提琴组、中提琴组、小提琴组，提前 0.12 秒触发（弦乐组起音慢）
  const chord = (notes, b, d, v) => notes.forEach(x => { const m = Tone.Frequency(x).toMidi(); n(m < 50 ? 'vcs' : m < 60 ? 'vla' : 'vsec', x, b, d, v, -0.12, 0.004); });
  const tchord = (notes, b, d, v) => notes.forEach(x => { const m = Tone.Frequency(x).toMidi(); n(m < 50 ? 'tvc' : m < 60 ? 'tva' : 'tv', x, b, d, v, -0.08, 0.004); });
  const gliss = (i, notes, b, step, v, dur = 1.2) => notes.forEach((x, k) => n(i, x, b + k * step, dur, v + R(0.03), 0, 0.003));

  TR.bpm.value = 60;
  const lim = new Tone.Limiter(-1).toDestination();
  const master = new Tone.Compressor({ threshold: -18, ratio: 2.5, attack: 0.02, release: 0.3 }).connect(lim);
  const bus = new Tone.Gain(1).connect(master);
  const rev = new Tone.Reverb({ decay: 3.6, preDelay: 0.03, wet: 1 }); await rev.generate(); rev.connect(bus);
  const revIn = new Tone.Filter(280, "highpass").connect(rev);
  const mk = (syn, vol, send, pan) => { syn.volume.value = vol; const p = new Tone.Panner(pan); syn.connect(p); p.connect(bus); const g = new Tone.Gain(send); p.connect(g); g.connect(revIn); return syn; };
  let done = 0;
  const S = (cfg, rel, att) => new Tone.Sampler(Object.assign({ release: rel || 1, attack: att || 0, onload: () => { done++; onLoad && onLoad(done, 15); } }, cfg));
  const VS = 'https://cdn.jsdelivr.net/gh/sgossner/VSCO-2-CE@master/';
  // VSCO2：除了独奏小提琴，文件名都比实际音高低一个八度
  const vs = (dir, file, ns, oct = 1) => { const u = {}; ns.forEach(x => u[T(x, 12 * oct)] = file(x).replace('#', '%23')); return { urls: u, baseUrl: VS + dir.replace(/ /g, '%20') + '/' }; };
  const group = (pan, send) => { const g = new Tone.Gain(1), p = new Tone.Panner(pan), r = new Tone.Gain(send); g.connect(p); p.connect(bus); p.connect(r); r.connect(revIn); return g; };
  const into = (g, syn, vol) => { syn.volume.value = vol; syn.connect(g); return syn; };
  const pad = group(-0.05, 0.55), trem = group(0.1, 0.45);
  const VN = ['G2', 'A2', 'B2', 'D3', 'F#3', 'A3', 'C4', 'E4', 'G4', 'B4'], VA = ['C2', 'E2', 'G2', 'B2', 'D3', 'F3', 'A3', 'C4', 'E4'], VC = ['E1', 'G1', 'B1', 'D2', 'F2', 'A2', 'C3', 'E3', 'G3'];
  I.piano = mk(S(nb('piano', ['A1', 'C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6']), 1.6), -4, 0.32, -0.12);
  I.harp = mk(S(nb('harp', ['A2', 'C3', 'E3', 'G3', 'B3', 'D4', 'F4', 'A4', 'C5', 'E5', 'G5', 'B5', 'D6']), 1.8), -7, 0.4, 0.3);
  I.mbox = mk(S(gm('music_box', ['C5', 'Eb5', 'Gb5', 'A5', 'C6', 'Eb6', 'Gb6', 'A6']), 1.6), -13, 0.55, 0.25);
  I.timp = mk(S(gm('timpani', ['A1', 'D2']), 2.5), -4, 0.35, 0);
  I.rcym = mk(S(gm('reverse_cymbal', ['C3', 'C4']), 0.5), -14, 0.5, 0);
  I.vsolo = mk(S(vs('Strings/Solo Violin/Arco Vib', x => `LLVln_ArcoVib_${x}_f.wav`, ['G3', 'A3', 'C4', 'E4', 'G4', 'A4', 'C5', 'E5', 'G5', 'A5', 'C6'], 0), 0.5, 0.03), 0, 0.36, 0.08);
  I.vsec = into(pad, S(vs('Strings/Violin Section/susVib', x => `VlnEns_susVib_${x}_v1.wav`, VN), 0.9, 0.12), -4);
  I.vla = into(pad, S(vs('Strings/Viola Section/susvib', x => `ViolaEns_susvib_${x}_v1_1.wav`, VA), 0.9, 0.12), -3);
  I.vcs = into(pad, S(vs('Strings/Cello Section/susvib', x => `susvib_${x}_v1_1.wav`, VC), 0.9, 0.12), -3);
  I.tv = into(trem, S(vs('Strings/Violin Section/Trem', x => `VlnEns_Trem_${x}_v1.wav`, VN), 0.7, 0.08), 3);
  I.tva = into(trem, S(vs('Strings/Viola Section/trem', x => `Violas_trem_${x}_v1_rr1.wav`, VA), 0.7, 0.08), 3);
  I.tvc = into(trem, S(vs('Strings/Cello Section/trem', x => `trem_${x}_v1_1.wav`, VC), 0.7, 0.08), 3);
  I.vc = mk(S(vs('Strings/Cello Section/susvib', x => `susvib_${x}_v3_1.wav`, VC), 0.7, 0.05), -4, 0.32, -0.3);
  I.pizz = mk(S(vs('Strings/Violin Section/Pizz', x => `VlnEns_Pizz_${x}_v2_rr1.wav`, VN), 0.4), -6, 0.35, -0.25);
  I.horn = mk(S(vs('Brass/F Horn/sus', x => `MOHorn_sus_${x}_${['D4', 'F4'].includes(x) ? 'v1' : 'v2'}_1.wav`, ['C1', 'D#1', 'G1', 'A#1', 'D2', 'F2', 'A2', 'C3', 'D4', 'F4']), 1.2, 0.1), -4, 0.45, -0.2);
  await Tone.loaded();

  // 主题动机：沙漏的「落」——从 A 往下走到 D，四个音，全片反复出现、每次变一点
  const MOTIF = [[0, "A4", 1], [1, "F#4", 1], [2, "E4", 1], [3, "D4", 3]];

  // 1｜0–7 黑场里的沙漏：钢琴一个音一个音地出来，像指尖在划；两个三角透出光时，弦乐从很远的地方进来
  mel('piano', [[0, "A5", 1.4], [1.4, "F#5", 1.4], [2.8, "E5", 1.2], [4.0, "D5", 2.5]], 0.6, { v: 0.44, lag: 0 });
  n('piano', "D3", 0.6, 6, 0.36); n('piano', "A3", 2.8, 4, 0.3);
  chord(["D3", "A3", "F#4", "A4"], 3.8, 4, 0.36);
  // 2｜6–13 漏沙：竖琴一粒一粒落下（八分音符），推近时慢慢加厚
  for (let b = 5.9; b < 12.8; b += 0.5) { const k = Math.round((b - 5.9) * 2); const x = ["D5", "A4", "F#4", "A4", "E5", "A4", "F#4", "D4"][k % 8]; n('harp', b > 10 && k % 4 === 3 ? T(x, 12) : x, b, 1, 0.34 + (b - 6) * 0.025, 0, 0.006); }
  chord(["B2", "F#3", "D4", "F#4"], 7.8, 2.6, 0.38); chord(["G2", "D3", "B3", "E4"], 10.3, 2.6, 0.42);
  n('vc', "D3", 7.8, 5, 0.42);
  // 3｜13–21 沙帘盖过来：竖琴往下一道刮奏；种子出来，独奏小提琴第一次唱主题；裂开拨一下；芽往上长，旋律往上爬；两片叶子是两声竖琴
  n('rcym', "C4", 11.4, 1.5, 0.4);
  gliss('harp', ["D6", "B5", "A5", "F#5", "E5", "D5", "B4", "A4", "F#4", "E4", "D4"], 12.9, 0.1, 0.42);
  chord(["D3", "A3", "D4", "F#4"], 13.0, 3.5, 0.4);
  mel('vsolo', MOTIF, 14.8, { v: 0.62, leg: 0.15 });
  n('pizz', "D4", 15.6, 0.5, 0.5); n('pizz', "A3", 16.0, 0.5, 0.4);
  chord(["G2", "D3", "B3", "G4"], 16.4, 2.7, 0.4); chord(["A2", "E3", "C#4", "A4"], 19.0, 2.4, 0.42);
  mel('vsolo', [[0, "D4", 0.5], [0.5, "E4", 0.5], [1, "F#4", 0.5], [1.5, "A4", 0.8], [2.3, "B4", 0.3]], 16.6, { v: 0.6, leg: 0.12 });
  n('harp', "A5", 19.0, 2, 0.46); n('harp', "E6", 19.5, 2, 0.4); n('vsolo', "A4", 19.0, 2, 0.58, 0.02);
  // 4｜21–31 树：树干出来是低音提起来，每长一代就多一个声部进来；枝梢点亮是钢琴和八音盒的高音一粒粒落下
  const TREE_CH = [["D2", "A2", "D3", "F#3", "A3"], ["B1", "F#2", "B2", "D3", "F#3", "A3"], ["G1", "D2", "G2", "B2", "D3", "G3"], ["A1", "E2", "A2", "C#3", "E3", "A3"]];
  TREE_CH.forEach((c, i) => chord(c.map(x => T(x, 12)).slice(0, 2 + i + (i > 1 ? 1 : 0)), 21 + i * 2.5, 2.7, 0.34 + i * 0.03));
  n('vc', "D2", 21, 2.5, 0.5); n('vc', "B1", 23.5, 2.5, 0.5); n('vc', "G1", 26, 2.5, 0.52); n('vc', "A1", 28.5, 2.5, 0.54);
  [21.9, 22.6, 23.3, 24.0, 24.7].forEach((b, g) => n('pizz', ["D4", "F#4", "A4", "D5", "F#5"][g], b, 0.5, 0.42 + g * 0.03));
  mel('vsolo', [[0, "F#4", 1.5], [1.5, "A4", 1], [2.5, "D5", 2], [4.5, "C#5", 1], [5.5, "B4", 1], [6.5, "A4", 1.5], [8, "E5", 2]], 22.5, { v: 0.58, leg: 0.15 });
  for (let k = 0; k < 22; k++) { const b = 25 + rnd() * 5.4, x = ["D6", "E6", "F#6", "A6", "B5", "A5"][Math.floor(rnd() * 6)]; n(k % 3 ? 'mbox' : 'piano', k % 3 ? x : T(x, -12), b, 1.2, 0.22 + rnd() * 0.1, 0, 0.002); }
  // 5｜31–40 风：弦乐震音一路推上来，圆号在底下拉长音；卷起来的三下是三个上行的竖琴
  tchord(["D3", "A3", "D4", "F#4"], 31, 3, 0.5); tchord(["E3", "B3", "E4", "G4"], 34, 2, 0.58); tchord(["F#3", "B3", "D4", "A4"], 36, 4.2, 0.66);
  n('horn', "D3", 31, 4, 0.5); n('horn', "E3", 35, 2, 0.56); n('horn', "F#3", 37, 3.2, 0.62);
  mel('vsolo', [[0, "A4", 1], [1, "B4", 1], [2, "D5", 1.5], [3.5, "E5", 0.5], [4, "F#5", 2], [6, "E5", 1], [7, "D5", 2]], 31.2, { v: 0.76, leg: 0.15 });
  [36.0, 36.6, 37.2].forEach((b, i) => gliss('harp', ["D5", "F#5", "A5", "D6"].map(x => T(x, i * 2)), b, 0.07, 0.38));
  n('rcym', "C4", 38.5, 1.5, 0.5);
  // 6｜40–51 浪：全片唯一的强拍在 46（最大的浪）。每个浪起，定音鼓一下；弦乐全开，主题升到高八度
  [40.0, 41.2, 42.4].forEach((b, i) => { n('timp', i === 1 ? "A1" : "D2", b, 2, 0.55 + i * 0.05); });
  chord(["B1", "F#2", "B2", "D3", "F#3", "B3", "D4", "F#4"], 40, 2.4, 0.52); chord(["G1", "D2", "G2", "B2", "D3", "G3", "B3", "D4"], 42.4, 3.2, 0.56);
  tchord(["B2", "F#3", "D4", "B4"], 40, 5.5, 0.55);
  mel('vsolo', MOTIF.map(([b, x, d]) => [b * 0.75, T(x, 12), d * 0.75]), 40.2, { v: 0.8, leg: 0.12 });
  n('horn', "B2", 40, 3, 0.5); n('horn', "D3", 43, 2.5, 0.52);
  n('rcym', "C4", 44.1, 1.5, 0.6);
  n('timp', "D2", 45.6, 3, 0.9); n('timp', "D2", 45.62, 3, 0.7);
  for (let k = 0; k < 10; k++) n('timp', k % 2 ? "A1" : "D2", 44.6 + k * 0.1, 0.3, 0.3 + k * 0.04, 0, 0.002);  // 滚奏推进最大的浪
  chord(["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4"], 45.6, 3, 0.68); tchord(["D3", "A3", "F#4", "D5"], 45.6, 3.2, 0.68);
  n('horn', "A3", 45.6, 3, 0.66); n('horn', "D3", 45.6, 3, 0.6);
  mel('vsolo', [[0, "F#5", 1], [1, "A5", 0.8], [1.8, "D6", 2.2], [4, "C#6", 1], [5, "A5", 1.2]], 45.6, { v: 0.86, leg: 0.15 });
  gliss('harp', ["D4", "F#4", "A4", "D5", "F#5", "A5", "D6"], 45.6, 0.05, 0.48);
  chord(["A1", "E2", "A2", "C#3", "E3", "A3", "C#4", "E4"], 48.6, 2.2, 0.56); n('timp', "A1", 48.6, 2, 0.5);
  // 7｜51–59 秋：海往下退，整个乐队一级级往下收；月亮出来时只剩一层很轻的空五度和独奏小提琴的一个高音；芦苇是几下拨弦
  // （不做硬休止：弦乐一下压到 0、过两秒又整组砸回来，听着像卡了一下）
  gliss('harp', ["A5", "F#5", "E5", "D5", "B4", "A4", "F#4", "E4", "D4", "B3", "A3"], 51.0, 0.18, 0.32, 1.3);
  chord(["G2", "D3", "A#3", "D4"], 51, 4.0, 0.42);  // 借来的 Gm，秋天的一点苦
  n('vc', "G2", 51, 3.8, 0.4); n('vc', "D2", 54.4, 5.2, 0.34);  // 低音从 G 落到 D，一直托到冬天
  chord(["D3", "A3"], 54.3, 4.8, 0.3);  // 空五度接住 Gm，中间不断
  n('vsolo', "A5", 54.9, 3.8, 0.46, 0.02); n('harp', "D6", 56.0, 2.5, 0.3);
  [56.8, 57.05, 57.3, 57.55, 57.8].forEach((b, i) => n('pizz', ["A3", "D4", "E4", "A3", "F#4"][i], b, 0.4, 0.34));
  chord(["E4"], 57.0, 2.4, 0.26);
  // 8｜59–67 冬：沙落下来是很轻的弦乐长音；雪是八音盒和钢琴的高音，一排一排往下落（音也一排比一排低）
  chord(["B2", "F#3", "D4", "F#4"], 58.6, 4.4, 0.32); chord(["G2", "D3", "B3", "E4"], 63, 4, 0.34);
  for (let row = 0; row < 9; row++) {
    const pool = [["B6", "A6", "F#6"], ["A6", "F#6", "E6"], ["F#6", "E6", "D6"], ["E6", "D6", "B5"], ["D6", "B5", "A5"], ["B5", "A5", "F#5"], ["A5", "F#5", "E5"], ["F#5", "E5", "D5"], ["E5", "D5", "A4"]][row];
    for (let k = 0; k < 3; k++) n(k === 1 ? 'piano' : 'mbox', pool[k], 61.6 + row * 0.6 + k * 0.27 + rnd() * 0.08, 1.4, 0.26 + rnd() * 0.08, 0, 0.002);
  }
  tchord(["B2", "F#3", "D4"], 58.4, 5, 0.38); roll('harp', ["B2", "F#3", "B3", "D4", "F#4"], 58.6, 3, 0.24, 0.12); n('piano', "B1", 58.6, 4, 0.2);  // 沙一粒粒落下来，是很轻的震音
  n('vsolo', "F#4", 63, 2, 0.42, 0.03); n('vsolo', "E4", 65, 2, 0.4, 0.03);
  // 9｜67–75 回到沙漏：沙帘从右边扫过来是一道往上的刮奏；再划沙漏时，开头那句钢琴原样回来，最后停在 D 上、不完全解决，可以循环
  gliss('harp', ["D4", "E4", "F#4", "A4", "B4", "D5", "E5", "F#5", "A5"], 67.0, 0.15, 0.36);
  chord(["D3", "A3", "F#4", "A4"], 68.8, 6, 0.32);
  mel('piano', [[0, "A5", 1.4], [1.4, "F#5", 1.4], [2.8, "E5", 1.2], [4.0, "D5", 2.5]], 68.9, { v: 0.5, lag: 0 });
  n('piano', "D3", 68.9, 6, 0.34);
  for (let b = 72.7; b < 75.5; b += 0.5) { const k = Math.round((b - 72.7) * 2); n('harp', ["D5", "A4", "F#4", "A4", "E5", "A4"][k % 6], b, 1, 0.3, 0, 0.006); }

  at(45.4, t => bus.gain.rampTo(1.45, 0.2, t)); at(49.0, t => bus.gain.rampTo(1.0, 2, t));  // 全片唯一的最高点
  // 弦乐组音量：按段落写渐强渐弱，高潮在 46，月亮那里收到几乎没有
  [[0, 0.7, 0.01], [12, 0.85, 2], [21, 0.8, 1], [30, 1.0, 4], [40, 1.1, 2], [45.6, 1.5, 0.3], [49, 0.9, 2], [51, 0.6, 1], [52.5, 0.38, 2.4], [56.5, 0.55, 1.6], [58.6, 0.65, 2], [68, 0.75, 2]].forEach(([b, g, d]) => at(b, t => pad.gain.rampTo(g, D(d), t)));
  [[31, 0.9, 0.01], [36, 1.5, 3], [40, 1.3, 1], [45.6, 1.8, 0.3], [49, 0.5, 2], [58.4, 0.6, 0.01], [62, 0.35, 2]].forEach(([b, g, d]) => at(b, t => trem.gain.rampTo(g, D(d), t)));
  return { out: lim, endBeats: END + TAIL_BEATS, ppq: PPQ };
}

// 《页边》配乐：跟着动作走的卡通配乐，F 大调，100 拍。依赖全局 Tone（14.7.77）。
// 画面是按秒排的，这里也按秒写（s → 拍），速度不变。
// 拨弦是脚步，单簧管是它的小心思，竖琴是笔在画，弦乐组铺底，躲回原位那一下全体停住。

const PPQ = 192, BPM = 100;

async function buildScore(onLoad) {
  const TR = Tone.getContext().transport;
  let seed = 20261022;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const NB = 'https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments@master/samples/';
  const GM = 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/';
  const nb = (nm, ns) => { const u = {}; ns.forEach(x => u[x.replace('s', '#')] = x + '.mp3'); return { urls: u, baseUrl: NB + nm + '/' }; };
  const gm = (nm, ns) => { const u = {}; ns.forEach(x => u[x] = x + '.mp3'); return { urls: u, baseUrl: GM + nm + '-mp3/' }; };
  const T = (x, s) => Tone.Frequency(x).transpose(s).toNote();
  const I = {}, cl = v => Math.max(0.05, Math.min(1, v)), R = a => (rnd() * 2 - 1) * a;
  TR.bpm.value = BPM;
  const B = s => s * BPM / 60, SEC = d => d;          // 秒 → 拍；时值直接用秒
  const at = (s, f) => TR.schedule(t => f(t), Math.round(B(s) * PPQ) + 'i');
  const n = (i, note, s, d, v, lag = 0, jit = 0.01) => { const j = Math.abs(R(jit)), vv = cl(v + R(0.05)); at(s, t => I[i].triggerAttackRelease(note, d, Math.max(0, t + lag + j), vv)); };
  const chord = (i, notes, s, d, v, sp = 0.02) => notes.forEach((x, k) => n(i, x, s + k * sp, d, v - k * 0.02, 0, 0.004));
  const run = (i, notes, s, step, d, v, dv = 0) => notes.forEach((x, k) => n(i, x, s + k * step, d, v + k * dv, 0, 0.004));

  const lim = new Tone.Limiter(-1).toDestination();
  const master = new Tone.Compressor({ threshold: -16, ratio: 2.5, attack: 0.01, release: 0.25 }).connect(lim);
  const bus = new Tone.Gain(1).connect(master);
  const rev = new Tone.Reverb({ decay: 2.4, preDelay: 0.02, wet: 1 }); await rev.generate(); rev.connect(bus);
  const revIn = new Tone.Filter(300, 'highpass').connect(rev);
  const mk = (syn, vol, send, pan) => { syn.volume.value = vol; const p = new Tone.Panner(pan); syn.connect(p); p.connect(bus); const g = new Tone.Gain(send); p.connect(g); g.connect(revIn); return syn; };
  let done = 0;
  const S = (cfg, rel, att) => new Tone.Sampler(Object.assign({ release: rel || 1, attack: att || 0, onload: () => { done++; onLoad && onLoad(done, 14); } }, cfg));
  const VS = 'https://cdn.jsdelivr.net/gh/sgossner/VSCO-2-CE@master/';
  const vs = (dir, file, ns, oct = 1) => { const u = {}; ns.forEach(x => u[T(x, 12 * oct)] = file(x).replace('#', '%23')); return { urls: u, baseUrl: VS + dir.replace(/ /g, '%20') + '/' }; };
  const group = (pan, send) => { const g = new Tone.Gain(1), p = new Tone.Panner(pan), r = new Tone.Gain(send); g.connect(p); p.connect(bus); p.connect(r); r.connect(revIn); return g; };
  const into = (g, syn, vol) => { syn.volume.value = vol; syn.connect(g); return syn; };
  const pad = group(-0.05, 0.5), trem = group(-0.15, 0.4);
  const VN = ['G2', 'A2', 'B2', 'D3', 'F#3', 'A3', 'C4', 'E4', 'G4', 'B4'], VA = ['C2', 'E2', 'G2', 'B2', 'D3', 'F3', 'A3', 'C4', 'E4'], VC = ['E1', 'G1', 'B1', 'D2', 'F2', 'A2', 'C3', 'E3', 'G3'];
  I.harp = mk(S(nb('harp', ['A2', 'C3', 'E3', 'G3', 'B3', 'D4', 'F4', 'A4', 'C5', 'E5', 'G5', 'B5', 'D6']), 1.5), -8, 0.35, 0.3);
  I.clar = mk(S(nb('clarinet', ['D3', 'F3', 'As3', 'D4', 'F4', 'As4', 'D5', 'F5', 'As5']), 0.5, 0.01), -6, 0.3, 0.12);
  I.celesta = mk(S(gm('celesta', ['C5', 'Eb5', 'Gb5', 'A5', 'C6', 'Eb6']), 1.5), -12, 0.5, -0.3);
  I.timp = mk(S(gm('timpani', ['A1', 'D2']), 1.5), -9, 0.3, 0);
  I.vsolo = mk(S(vs('Strings/Solo Violin/Arco Vib', x => `LLVln_ArcoVib_${x}_f.wav`, ['G3', 'A3', 'C4', 'E4', 'G4', 'A4', 'C5', 'E5', 'G5', 'A5', 'C6'], 0), 0.4, 0.03), 0, 0.34, 0.15);
  I.vsec = into(pad, S(vs('Strings/Violin Section/susVib', x => `VlnEns_susVib_${x}_v1.wav`, VN), 0.8, 0.12), -6);
  I.vla = into(pad, S(vs('Strings/Viola Section/susvib', x => `ViolaEns_susvib_${x}_v1_1.wav`, VA), 0.8, 0.12), -5);
  I.vcs = into(pad, S(vs('Strings/Cello Section/susvib', x => `susvib_${x}_v1_1.wav`, VC), 0.8, 0.12), -5);
  I.tv = into(trem, S(vs('Strings/Violin Section/Trem', x => `VlnEns_Trem_${x}_v1.wav`, VN), 0.5, 0.06), -2);
  I.tvc = into(trem, S(vs('Strings/Cello Section/trem', x => `trem_${x}_v1_1.wav`, VC), 0.5, 0.06), -2);
  I.pizz = mk(S(vs('Strings/Violin Section/Pizz', x => `VlnEns_Pizz_${x}_v2_rr1.wav`, VN), 0.4), -4, 0.3, -0.25);
  I.abass = mk(S(vs('Strings/Solo Contrabass/Pizz', x => `BKCtbss_Pizz_${x}_v1_rr1.wav`, ['E0', 'F#0', 'G0', 'A#0', 'C1', 'D1', 'E1', 'F#1', 'A1', 'C#2', 'E2']), 0.6), 3, 0.08, 0);
  I.horn = mk(S(vs('Brass/F Horn/sus', x => `MOHorn_sus_${x}_${['D4', 'F4'].includes(x) ? 'v1' : 'v2'}_1.wav`, ['C1', 'D#1', 'G1', 'A#1', 'D2', 'F2', 'A2', 'C3', 'D4', 'F4']), 1, 0.08), -9, 0.4, -0.2);
  await Tone.loaded();
  const padChord = (notes, s, d, v) => notes.forEach(x => { const m = Tone.Frequency(x).toMidi(); n(m < 48 ? 'vcs' : m < 55 ? 'vla' : 'vsec', x, Math.max(0, s - 0.12), d, v, 0, 0.004); });
  const padGain = (s, g, d) => at(s, t => pad.gain.rampTo(g, d, t));

  // 一、笔在画（0–5）：竖琴跟着笔一笔一笔往上走，眼睛点上去是两声钢片琴
  padChord(['F2', 'C3', 'A3', 'E4'], 0.1, 5.4, 0.42); padGain(0, 0.7, 0.01); padGain(0.2, 1, 2);
  const draw = ['F3', 'A3', 'C4', 'E4', 'F4', 'A4', 'C5', 'A4', 'G4', 'C5', 'E5', 'D5'];
  draw.forEach((x, k) => n('harp', x, 0.75 + k * 0.24, 1.2, 0.42 + Math.sin(k / 11 * Math.PI) * 0.14));
  n('celesta', 'A5', 2.82, 1.2, 0.5); n('celesta', 'C6', 3.02, 1.2, 0.48);
  run('harp', ['F4', 'A4', 'C5', 'F5', 'A4', 'C5', 'F5', 'A5'], 3.48, 0.1, 0.9, 0.32, 0.01);
  n('harp', 'F5', 4.6, 2.5, 0.5); n('harp', 'C4', 4.6, 2.5, 0.36);

  // 二、活了（5–8.2）：静一下，然后每个小动作一个音
  n('celesta', 'F6', 6.05, 1.5, 0.55);
  n('pizz', 'C4', 6.6, 0.4, 0.55); n('pizz', 'G4', 7.1, 0.4, 0.55);
  run('harp', ['C5', 'F5', 'A5', 'F5', 'C5'], 7.6, 0.06, 0.6, 0.42);
  n('clar', 'C3', 7.85, 0.38, 0.4);
  run('pizz', ['C4', 'F4', 'A4'], 8.2, 0.16, 0.3, 0.5); n('abass', 'F1', 8.75, 0.6, 0.7);

  // 三、蹑手蹑脚（8.95–11.1）：拨弦八分音符走路，单簧管跳音
  const walkBass = [['F1', 'C2'], ['D1', 'A1'], ['A#0', 'F1'], ['C1', 'G1']];
  for (let k = 0; k < 7; k++) { const s = 8.95 + k * 0.3; n('abass', walkBass[Math.floor(k / 2) % 4][k % 2], s, 0.25, k % 2 ? 0.55 : 0.68); }
  [['C5', 0], ['A4', 0.3], ['F4', 0.6], ['G4', 0.9], ['A4', 1.05], ['A#4', 1.2], ['A4', 1.5], ['G4', 1.8]].forEach(([x, d]) => n('clar', x, 8.95 + d, 0.14, 0.5, 0.02));
  run('pizz', ['F4', 'A4', 'C5'], 9.25, 0.6, 0.2, 0.32);

  // 四、翻过红线（11.4–12.1）：单簧管一口气冲上去，落地一个和弦
  run('clar', ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'C5'], 11.4, 0.075, 0.12, 0.45, 0.04);
  run('harp', ['C4', 'F4', 'A4', 'C5', 'F5', 'A5'], 11.5, 0.07, 0.8, 0.36);
  chord('pizz', ['F3', 'C4', 'A4'], 12.1, 0.3, 0.62); n('abass', 'F1', 12.1, 0.6, 0.75); padChord(['F2', 'C3', 'A3', 'C4'], 12.1, 3.4, 0.3);

  // 五、踩着横线蹦（12.25–15.5）：每次落地一声低音，单簧管唱主题
  const land = [12.91, 13.71, 14.51, 15.31], lb = ['F1', 'D1', 'A#0', 'C1'];
  land.forEach((s, k) => { n('abass', lb[k], s, 0.5, 0.62); chord('pizz', [[`A3`, 'C4'], ['A3', 'D4'], ['A#3', 'D4'], ['G3', 'C4']][k], s + 0.4, 0.2, 0.4); });
  [[0, 'F4', .35], [.4, 'A4', .35], [.8, 'C5', .7], [1.6, 'D5', .35], [2.0, 'C5', .35], [2.4, 'A4', .7], [3.2, 'A#4', .3]].forEach(([d, x, l], k, a) =>
    n('clar', x, 12.3 + d, l, 0.46 + 0.1 * Math.sin(Math.PI * (k + .5) / a.length), 0.025));

  // 六、问号、戳、钻进墨团（15.6–18.35）
  n('clar', 'G4', 15.62, 0.25, 0.5); n('clar', 'D5', 15.88, 0.45, 0.48);
  n('pizz', 'A5', 16.2, 0.2, 0.55);
  run('harp', ['A5', 'F5', 'C5', 'A4', 'F4', 'C4', 'A3'], 16.55, 0.06, 0.7, 0.42);
  n('abass', 'D1', 17.0, 0.8, 0.8); n('timp', 'D2', 17.0, 1.5, 0.5);
  ['D3', 'A3'].forEach(x => n('tvc', x, 17.0, 1.4, 0.4)); n('tv', 'D4', 17.05, 1.35, 0.35); n('tv', 'G#4', 17.6, 0.8, 0.4);
  at(17.0, t => { trem.gain.setValueAtTime(0.5, t); trem.gain.linearRampToValueAtTime(1.3, t + 1.3); });
  for (let k = 0; k < 6; k++) n('timp', 'D2', 17.25 + k * 0.18, 0.3, 0.25 + k * 0.05);

  // 七、钻出来、甩墨（18.35–20）
  chord('pizz', ['F4', 'A4', 'C5', 'F5'], 18.35, 0.3, 0.66, 0.015); n('celesta', 'F6', 18.4, 1, 0.45); n('abass', 'F1', 18.35, 0.5, 0.7);
  for (let k = 0; k < 10; k++) n('pizz', k % 2 ? 'C5' : 'A4', 18.8 + k * 0.075, 0.1, 0.45 - k * 0.015);
  n('celesta', 'C6', 19.62, 1.2, 0.5); n('celesta', 'F6', 19.78, 1.2, 0.42);

  // 八、红笔来了（20–24.7）：圆号压低，「!」一记，画圈是震音小提琴绕着往上爬
  n('horn', 'C3', 20.0, 2.2, 0.42); n('vcs', 'F2', 20.0, 2.2, 0.4);
  chord('pizz', ['E4', 'A#4', 'C#5'], 20.9, 0.25, 0.7, 0.008); n('timp', 'A1', 20.9, 1.2, 0.6);
  run('tv', ['C4', 'D4', 'E4', 'F4', 'G4', 'G#4', 'A4', 'A#4'], 20.9, 0.15, 0.22, 0.38, 0.02);
  n('tv', 'B4', 22.05, 0.35, 0.5);
  [22.6, 22.95].forEach((s, k) => { n('abass', k ? 'C1' : 'A#0', s, 0.4, 0.8); n('timp', 'A1', s, 0.5, 0.4); });
  run('pizz', ['C4', 'A3', 'F3'], 23.2, 0.13, 0.2, 0.4);
  run('clar', ['C5', 'B4', 'A#4', 'A4', 'G#4', 'A4', 'F4', 'D4', 'C4'], 23.72, 0.1, 0.13, 0.5, -0.005);
  for (let k = 0; k < 3; k++) n('abass', ['F1', 'D1', 'C1'][k], 23.75 + k * 0.3, 0.25, 0.55);

  // 九、得意（24.75–25.3）：全体一个亮的 F 大调，然后被「笔回来了」一刀切断
  chord('harp', ['F3', 'C4', 'F4', 'A4', 'C5', 'F5'], 24.75, 1.2, 0.5, 0.03); chord('pizz', ['F4', 'A4', 'C5'], 24.75, 0.3, 0.6); n('horn', 'F3', 24.75, 0.5, 0.5);
  padChord(['F2', 'C3', 'A3', 'F4'], 24.75, 0.55, 0.45);
  n('clar', 'F5', 24.9, 0.18, 0.55); n('clar', 'C5', 25.08, 0.16, 0.5);

  // 十、笔回来了，狂奔（25.75–29.3）：D 小调十六分音符拨弦，定音鼓每拍一下
  chord('pizz', ['D4', 'G#4', 'B4'], 25.75, 0.25, 0.75, 0.008); n('timp', 'D2', 25.75, 1, 0.65); n('horn', 'D3', 25.78, 0.5, 0.45);
  const dash = ['D4', 'F4', 'A4', 'F4', 'D4', 'F4', 'A#4', 'F4', 'C4', 'E4', 'A4', 'E4', 'D4', 'F4', 'A4', 'D5'];
  for (let k = 0; k < 20; k++) { n('pizz', dash[k % 16], 26.3 + k * 0.15, 0.12, 0.62 + (k % 4 === 0 ? 0.15 : 0)); if (k % 2 === 0) n('pizz', T(dash[k % 16], -12), 26.3 + k * 0.15, 0.12, 0.55); }
  for (let k = 0; k < 10; k++) { if (k % 2 === 0) n('timp', k % 4 ? 'A1' : 'D2', 26.3 + k * 0.3, 0.5, 0.55 + k * 0.03); n('abass', ['D1', 'D1', 'A#0', 'A#0', 'C1', 'C1', 'D1', 'D1', 'A1', 'A1'][k], 26.3 + k * 0.3, 0.25, k % 2 ? 0.62 : 0.8); }
  [['D3', 26.3], ['A#2', 27.5], ['C3', 28.1], ['D3', 28.7]].forEach(([x, s]) => n('tvc', x, s, 0.62, 0.45));
  [['A4', 26.3], ['A#4', 27.5], ['C5', 28.1], ['D5', 28.7]].forEach(([x, s]) => n('tv', x, s, 0.62, 0.42));
  at(26.3, t => { trem.gain.setValueAtTime(1.1, t); trem.gain.linearRampToValueAtTime(1.6, t + 3); });
  run('clar', ['D4', 'E4', 'F4', 'G4', 'A4', 'A#4', 'C5', 'D5'], 27.3, 0.075, 0.1, 0.55, 0.03);
  run('clar', ['D5', 'C5', 'A#4', 'A4', 'G4', 'F4', 'E4', 'D4'], 28.4, 0.075, 0.1, 0.65, -0.01);
  [['D3', 26.9], ['A#2', 27.5], ['C3', 28.1], ['D3', 28.7]].forEach(([x, s]) => n('horn', x, s, 0.35, 0.6));
  // 扑回原位：竖琴一路冲上去，落地全体停住
  run('harp', ['D4', 'F4', 'A4', 'D5', 'F5', 'A5', 'D6'], 29.32, 0.075, 0.6, 0.42, 0.02);
  chord('pizz', ['C4', 'F4', 'A4'], 29.85, 0.15, 0.7, 0.006); n('abass', 'F1', 29.85, 0.3, 0.8); n('timp', 'A1', 29.85, 0.4, 0.5);
  n('pizz', 'A4', 30.05, 0.12, 0.35); n('pizz', 'C5', 30.25, 0.12, 0.38);

  // 十一、笔添了一朵花（31.1–33.8）：开头那串竖琴再来一遍，短一点
  padChord(['F2', 'C3', 'A3', 'E4'], 31.0, 4.0, 0.36);
  ['F4', 'A4', 'C5', 'E5', 'C5', 'A4', 'G4', 'F4'].forEach((x, k) => n('harp', x, 31.15 + k * 0.21, 1.3, 0.4 + Math.sin(k / 7 * Math.PI) * 0.1));
  n('harp', 'A5', 32.85, 2, 0.4);

  // 十二、偷偷眨眼，拉远（34.15–38）：一声钢片琴，单簧管三个音，弦乐把整页托起来
  n('celesta', 'F6', 34.2, 1.5, 0.55);
  [['C5', 34.4, .15], ['A4', 34.58, .15], ['F5', 34.78, .5]].forEach(([x, s, d]) => n('clar', x, s, d, 0.5, 0.02));
  padChord(['F2', 'C3', 'A3', 'C4', 'F4'], 34.9, 3.3, 0.48);
  padGain(34.9, 1.15, 1.6); padGain(36.6, 0, 1.6);
  [['A4', 35.0, .9], ['C5', 35.9, .5], ['A#4', 36.4, .3], ['A4', 36.7, 1.2]].forEach(([x, s, d], k) => n('vsolo', x, s, d + 0.12, 0.58 - k * 0.04, 0.02));
  chord('harp', ['F3', 'C4', 'A4', 'F5'], 36.7, 2, 0.42, 0.06);
  n('abass', 'F1', 34.9, 2.5, 0.55);
  at(36.6, t => { bus.gain.setValueAtTime(1, t); bus.gain.linearRampToValueAtTime(0, t + 1.4); });
  return { out: lim };
}

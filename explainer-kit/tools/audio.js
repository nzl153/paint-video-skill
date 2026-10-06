// 用代码合成整条音轨：node tools/audio.js  →  out/audio.wav
// 时间点全部来自 src/timeline.js，和画面是同一份
const fs = require('fs'), path = require('path');
const TL = require('../src/timeline.js');
const VO = require('../src/voice.js');
const { S } = TL, END = VO.end;
const SR = 48000, N = Math.ceil((END + .5) * SR);
// 原时间轴 τ ↔ 真实时间 t（旁白把一些段落拉长了）
function lin(A, x, from, to) {
  for (let i = 1; i < A.length; i++) if (x <= A[i][from]) { const a = A[i - 1], b = A[i]; return b[from] > a[from] ? a[to] + (b[to] - a[to]) * (x - a[from]) / (b[from] - a[from]) : b[to]; }
  return A[A.length - 1][to];
}
const warp = tau => lin(VO.anchors, tau, 0, 1), unwarp = t => lin(VO.anchors, t, 1, 0);
const L = new Float32Array(N), R = new Float32Array(N);
const sendL = new Float32Array(N), sendR = new Float32Array(N);   // 混响发送
const rnd = TL.rnd(2026);
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

function put(i, v, pan = 0, send = 0) {
  if (i < 0 || i >= N) return;
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  L[i] += v * gl; R[i] += v * gr;
  if (send) { sendL[i] += v * gl * send; sendR[i] += v * gr * send; }
}

// ---------- 乐器 ----------
// 拨弦：几个泛音 + 指数衰减，起音很软
function pluck(t0, f, amp, dec = 1.4, pan = 0, send = .5) {
  const n = Math.floor(dec * 4 * SR), i0 = Math.floor(warp(t0) * SR);
  for (let k = 0; k < n; k++) {
    const t = k / SR, env = Math.min(1, t / .006) * Math.exp(-t / dec * 2.2);
    const v = Math.sin(TAU * f * t) + .35 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 3) + .12 * Math.sin(TAU * 3 * f * t) * Math.exp(-t * 6);
    put(i0 + k, v * env * amp, pan, send);
  }
}
// 钟：不和谐泛音，长尾
function bell(t0, f, amp, dec = 3.5, pan = 0) {
  const parts = [[1, 1], [2.76, .5], [5.4, .25], [8.93, .12], [.5, .4]];
  const n = Math.floor(dec * 3 * SR), i0 = Math.floor(warp(t0) * SR);
  for (let k = 0; k < n; k++) {
    const t = k / SR; let v = 0;
    for (const [m, a] of parts) v += a * Math.sin(TAU * f * m * t) * Math.exp(-t * m / dec);
    put(i0 + k, v * Math.min(1, t / .003) * amp, pan, .9);
  }
}
// 低频的“咚”：音高往下掉
function boom(t0, f0, f1, amp, dec = .9) {
  const n = Math.floor(dec * 3 * SR), i0 = Math.floor(warp(t0) * SR); let ph = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR, f = f1 + (f0 - f1) * Math.exp(-t * 8); ph += TAU * f / SR;
    put(i0 + k, Math.sin(ph) * Math.min(1, t / .004) * Math.exp(-t / dec) * amp, 0, .3);
  }
}
// 噪声扫频（呼——）：一阶低通 + 高通，截止频率随时间变
function whoosh(t0, dur, f0, f1, amp, pan0 = -.4, pan1 = .4) {
  const n = Math.floor(dur * SR), i0 = Math.floor(warp(t0) * SR); let lp = 0, lp2 = 0;
  for (let k = 0; k < n; k++) {
    const u = k / n, f = f0 * Math.pow(f1 / f0, u), a = 1 - Math.exp(-TAU * f / SR);
    const x = rnd() * 2 - 1; lp += a * (x - lp); lp2 += a * .25 * (lp - lp2);
    const env = Math.sin(Math.PI * u) ** 1.5;
    put(i0 + k, (lp - lp2) * env * amp, pan0 + (pan1 - pan0) * u, .5);
  }
}
// 电生理那种放电声：很短的双相脉冲
function spike(t0, amp, pan = 0) {
  const i0 = Math.floor(warp(t0) * SR), n = Math.floor(.004 * SR);
  for (let k = 0; k < n; k++) { const t = k / SR; put(i0 + k, Math.sin(TAU * 900 * t) * Math.exp(-t * 1400) * amp, pan, .15); }
}
function click(t0, amp, tone = 1800, dec = .012, pan = 0) {
  const i0 = Math.floor(warp(t0) * SR), n = Math.floor(dec * 6 * SR);
  for (let k = 0; k < n; k++) { const t = k / SR; put(i0 + k, ((rnd() * 2 - 1) * .5 + Math.sin(TAU * tone * t)) * Math.exp(-t / dec) * amp, pan, .25); }
}
function blip(t0, f0, f1, amp, dur = .07, pan = 0) {
  const i0 = Math.floor(warp(t0) * SR), n = Math.floor(dur * SR); let ph = 0;
  for (let k = 0; k < n; k++) { const u = k / n, f = f0 + (f1 - f0) * u; ph += TAU * f / SR; put(i0 + k, Math.sin(ph) * Math.sin(Math.PI * u) * amp, pan, .4); }
}
// 一段持续的嗡声（开灯时）
function hum(t0, t1, f, amp, trem = 0) {
  const r0 = warp(t0), r1 = warp(t1), i0 = Math.floor(r0 * SR), i1 = Math.floor(r1 * SR);
  for (let i = i0; i < i1; i++) {
    const t = i / SR, e = ss(r0, r0 + .25, t) * (1 - ss(r1 - .3, r1, t));
    const v = Math.sin(TAU * f * t) + .3 * Math.sin(TAU * f * 2.01 * t) + .15 * Math.sin(TAU * f * 3 * t);
    put(i, v * e * amp * (1 - trem + trem * Math.sin(TAU * 6 * t)), 0, .3);
  }
}
// 高处一团细碎的亮音（光出现时）
function shimmer(t0, dur, amp, base = 1600) {
  for (let g = 0; g < dur * 26; g++) {
    const t = t0 + rnd() * dur, f = base * Math.pow(2, Math.floor(rnd() * 4) / 3 + rnd() * .02), k = (t - t0) / dur;
    pluck(t, f, amp * Math.sin(Math.PI * k) * (.5 + rnd() * .5), .5, rnd() * 1.6 - .8, .9);
  }
}

// ---------- 底音：每场一个和弦，交叉淡化 ----------
const CH = [
  [S.pond, [110, 164.8, 220, 261.6, 329.6]],
  [S.membrane, [87.3, 130.8, 220, 329.6]],
  [S.brain, [73.4, 110, 174.6, 261.6]],
  [S.fluor, [73.4, 110, 164.8, 246.9]],
  [S.mouse, [130.8, 196, 293.7, 329.6]],
  [S.eye, [87.3, 130.8, 220, 392]],
  [S.pov, [87.3, 130.8, 220, 261.6, 329.6]],
  [S.end, [65.4, 98, 164.8, 293.7, 392]],
];
{
  const phs = new Map();
  for (let i = 0; i < N; i++) {
    const t = i / SR, tau = unwarp(t); let vl = 0, vr = 0;
    CH.forEach(([s0, notes], ci) => {
      const s1 = ci + 1 < CH.length ? CH[ci + 1][0] : TL.END + 9;
      const w = ss(s0 - 1.5, s0 + 1.5, tau) * (1 - ss(s1 - 1.5, s1 + 1.5, tau));
      if (w <= 0) return;
      notes.forEach((f, ni) => {
        const lfo = .75 + .25 * Math.sin(TAU * (.07 + ni * .013) * t + ni);
        const a = w * lfo * (f < 100 ? .9 : .55) / notes.length;
        vl += a * (Math.sin(TAU * f * .9985 * t + ni) + .18 * Math.sin(TAU * 2 * f * t));
        vr += a * (Math.sin(TAU * f * 1.0015 * t + ni * 2) + .18 * Math.sin(TAU * 2 * f * t + 1));
      });
    });
    const master = .16 * ss(0, 3, t) * (1 - ss(END - 3, END - .2, t));
    L[i] += vl * master; R[i] += vr * master;
    sendL[i] += vl * master * .3; sendR[i] += vr * master * .3;
  }
}
// 水下的低噪（池塘和片尾）
{
  let lp = 0, lp2 = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR, tau = unwarp(t), e = (1 - ss(S.membrane - 1, S.membrane + .5, tau)) + ss(S.end - 1, S.end + 1, tau) * .8;
    const x = rnd() * 2 - 1; lp += .004 * (x - lp); lp2 += .02 * (lp - lp2);
    if (e > 0) { const v = lp2 * 1.4 * e * (1 - ss(END - 3, END - .2, t)); L[i] += v; R[i] += v * .9; }
  }
}

// ---------- 拨弦：从第二场开始的轻节奏 ----------
{
  const beat = .75;
  CH.forEach(([s0, notes], ci) => {
    if (ci === 0) return;
    const s1 = ci + 1 < CH.length ? CH[ci + 1][0] : TL.END - 4;
    const hi = notes.filter(f => f > 100).map(f => f * 2);
    for (let t = s0 + 1.5, k = 0; t < s1 - .8; t += beat, k++) {
      if (ci === 6 && k % 2) continue;
      const f = hi[(k * 3 + ci) % hi.length] * (k % 8 === 7 ? 2 : 1);
      pluck(t, f, (k % 4 === 0 ? .05 : .032), 1.1, Math.sin(k * 1.7) * .5, .55);
    }
  });
}

// ---------- 01 池塘 ----------
for (let t = .8; t < S.membrane - .5; t += .5 + rnd() * 1.6) blip(t, 380 + rnd() * 300, 900 + rnd() * 600, .035 + rnd() * .03, .05 + rnd() * .05, rnd() * 1.4 - .7);
shimmer(TL.pondLight - .3, 3.2, .035);
whoosh(TL.pondLight - .5, 3, 300, 2400, .12, .6, .2);
bell(TL.titleIn + .3, 392, .11, 4); bell(TL.titleIn + .32, 587, .07, 3);
boom(TL.titleIn + .3, 90, 42, .18, 1.6);
whoosh(TL.titleOut - 1, 1.6, 600, 3000, .1);
whoosh(S.membrane - 1, 1.9, 200, 5000, .2, -.2, .2);   // 推进去

// ---------- 02 门 ----------
TL.photon.forEach((ph, i) => {
  blip(ph - .9, 2600, 900, .05, .8, -.4);               // 光子飞来
  click(ph + .02, .22, 2200, .006);                      // 视黄醛翻转
  boom(ph + .08, 220, 110, .22, .25);                    // 门开的“咔哒”
  click(ph + .1, .12, 700, .02);
  click(TL.closeAt[i] + .2, .1, 900, .01); boom(TL.closeAt[i] + .22, 160, 90, .12, .2);
});
for (let k = 0; k < 14; k++) { const te = TL.photon[0] + .5 + k * .3; blip(te, 1300 + k * 60, 1900 + k * 80, .05, .09, (k % 2 ? .25 : -.25)); }
whoosh(TL.photon[0] + .8, 3.5, 400, 1600, .06, -.8, .8);       // 电信号沿膜传开
boom(S.brain - .3, 70, 38, .16, 1.4); whoosh(S.brain - .9, 1.8, 300, 1200, .1);

// ---------- 03 大脑 ----------
{ // 画线的沙沙声
  let lp = 0;
  const i0 = Math.floor(warp(S.brain + .2) * SR), i1 = Math.floor(warp(S.brain + 4.2) * SR);
  for (let i = i0; i < i1; i++) {
    const t = unwarp(i / SR) - S.brain; lp += .3 * ((rnd() * 2 - 1) - lp);
    const e = Math.sin(Math.PI * clamp(t / 4)) * (.5 + .5 * Math.sin(TAU * 3.1 * t) ** 2);
    put(i, (rnd() * 2 - 1 - lp) * .025 * e, Math.sin(t * 2) * .5, .2);
  }
}
for (const [ts, ni] of TL.brainSpikes) spike(ts, .16 + (ni % 3) * .03, ((ni % 4) / 1.5 - 1) * .7);
whoosh(S.brain + 9.6, 1.6, 3000, 600, .08, .7, .2);             // 电极滑进来
TL.zaps.forEach(z => {
  hum(z, z + .35, 120, .08);
  for (let k = 0; k < 60; k++) spike(z + rnd() * .5, .2 * (1 - k / 70), rnd() * 1.6 - .8);
  click(z, .25, 3000, .004);
});
whoosh(S.brain + 17.2, 1.2, 600, 3000, .06, .2, .7);

// ---------- 04 荧光 ----------
whoosh(S.fluor - 1.2, 2.4, 150, 900, .08);
blip(TL.virus + .2, 300, 600, .06, .3);
for (let k = 0; k < 4; k++) blip(S.fluor + 3.4 + k * .07, 700 + k * 120, 1200 + k * 150, .05, .08, (k - 1.5) * .4);
[523, 659, 784, 988].forEach((f, k) => bell(TL.infect + k * .09, f, .05, 1.6, (k - 1.5) * .4));
whoosh(S.fluor + 13.4, 1.2, 200, 2000, .1, 0, 0);
hum(S.fluor + 14, S.fluor + 19.9, 98, .025); hum(S.fluor + 20.4, S.fluor + 25.1, 98, .025);
TL.fluorPulses.forEach(p => { spike(p, .3, -.15); spike(p + .003, .2, .2); click(p, .05, 4000, .003); pluck(p, 1318.5, .025, .2, 0, .3); });

// ---------- 05 小鼠 ----------
boom(S.mouse - .2, 90, 45, .18, 1); whoosh(S.mouse - .9, 1.9, 300, 1800, .1);
TL.mouseOn.forEach(([a, b]) => {
  click(a, .2, 1400, .008); click(a + .03, .1, 800, .01);
  hum(a + .05, b, 196, .03, .4); shimmer(a, 1.2, .02, 2000);
  click(b, .16, 1100, .008);
});

// ---------- 06 眼睛 ----------
whoosh(S.eye - 1, 2, 300, 2400, .12, -.7, .7);
for (let k = 0; k < 13; k++) { const t = S.eye + 1.6 + k * .37 + rnd() * .2; pluck(t, 220 * Math.pow(.94, k), .03, .5, .3, .5); }   // 感光细胞一个个熄灭
[440, 554, 659].forEach((f, k) => bell(S.eye + 7.8 + k * .5, f, .04, 2));
shimmer(TL.amberOn - .2, 2.5, .03, 1200);
for (let k = 0; k < 6; k++) {   // 神经节细胞放电，跟画面里每个细胞的峰对齐：lt*9 + k*1.3 = π/2 + 2πn
  for (let n = 0; n < 40; n++) {
    const lt = (Math.PI / 2 + TAU * n - k * 1.3) / 9;
    if (lt > TL.amberOn - S.eye + .4 && lt < 18.4) spike(S.eye + lt, .12, (k / 2.5 - 1) * .5);
  }
}
whoosh(S.pov - 1, 1.8, 2400, 200, .12);     // 推进瞳孔，进入黑暗

// ---------- 07 他看见的 ----------
for (let t = S.pov + .4; t < S.pov + 9.5; t += .05) if (rnd() < .5) click(t, .015 * ss(S.pov + .3, S.pov + 4, t), 3000 + rnd() * 3000, .002, rnd() * 1.6 - .8);
[[0, 523.3], [1.5, 659.3], [3, 784], [4.5, 698.5], [6, 659.3], [7.5, 784]].forEach(([d, f]) => pluck(S.pov + .8 + d, f, .07, 2, 0, .8));

// ---------- 片尾 ----------
bell(S.end + 1.1, 392, .06, 4); bell(S.end + 7.6, 523.3, .07, 5); bell(S.end + 7.62, 784, .05, 4);
boom(S.end + 7.6, 65, 40, .12, 2.5);
[[2.5, 659.3], [4, 587.3], [5.5, 523.3], [9.5, 784], [11, 659.3]].forEach(([d, f]) => pluck(S.end + d, f, .06, 2.4, 0, .8));

// ---------- 混响：每声道四个梳状 + 两个全通 ----------
function reverb(inp, seed) {
  const out = new Float32Array(N), combs = [1557, 1617, 1491, 1422].map(d => Math.round(d * 1.6 + seed)), fb = .8, damp = .3;
  for (const d of combs) {
    const buf = new Float32Array(d); let j = 0, f = 0;
    for (let i = 0; i < N; i++) { const y = buf[j]; f = y * (1 - damp) + f * damp; buf[j] = inp[i] + f * fb; out[i] += y * .25; j = (j + 1) % d; }
  }
  for (const d of [556, 441].map(x => x + seed)) {
    const buf = new Float32Array(d); let j = 0;
    for (let i = 0; i < N; i++) { const b = buf[j], y = -out[i] + b; buf[j] = out[i] + b * .5; out[i] = y; j = (j + 1) % d; }
  }
  return out;
}
// ---------- 旁白：人声一响，其余所有声音压低约 7dB ----------
const voice = new Float32Array(N);
let missing = 0;
for (const ln of VO.lines) {
  const f = path.join(__dirname, '..', ln.wav);
  if (!fs.existsSync(f)) { missing++; continue; }
  const b = fs.readFileSync(f), n = (b.length - 44) / 2, i0 = Math.floor(ln.t * SR);
  for (let k = 0; k < n && i0 + k < N; k++) voice[i0 + k] += b.readInt16LE(44 + k * 2) / 32768;
}
if (missing) console.warn(`缺 ${missing} 句旁白，先跑 node tools/voice.js；这次不带人声`);
const duck = new Float32Array(N);
{
  // 包络往前看 0.15 秒，人声开口前就先压下去
  const att = 1 - Math.exp(-1 / (.03 * SR)), rel = 1 - Math.exp(-1 / (.6 * SR)), look = Math.floor(.15 * SR);
  let env = 0;
  for (let i = 0; i < N; i++) { const v = Math.abs(voice[Math.min(N - 1, i + look)]); env += (v > env ? att : rel) * (v - env); duck[i] = 1 - .55 * clamp(env * 6); }
}
const rl = reverb(sendL, 0), rr = reverb(sendR, 23);
let peak = 0;
for (let i = 0; i < N; i++) {
  const v = voice[i] * 1.15;
  L[i] = Math.tanh(((L[i] + rl[i] * .35) * duck[i] + v) * 1.2); R[i] = Math.tanh(((R[i] + rr[i] * .35) * duck[i] + v) * 1.2);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = .89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(clamp(L[i] * g, -1, 1) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(clamp(R[i] * g, -1, 1) * 32767), 46 + i * 4); }
const out = path.join(__dirname, '..', 'out', 'audio.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buf);
console.log(`${(N / SR).toFixed(1)}s, peak ${peak.toFixed(2)} -> ${out}`);

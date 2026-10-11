// 按 score.js 的速度表把「拍」换算成「秒」，画面和音乐靠这个对齐
const START = 78;
const RAMPS = [[22, 80, 4], [34, 84, 6], [46, 94, 10], [57, 82, 7], [64, 72, 4], [74, 78, 6], [86.5, 72, 1.5], [88, 78, 2], [92, 74, 4], [104, 64, 14]];
const DT = 1e-4, table = [[0, 0]];
let bpm = START, beat = 0, t = 0, i = 0, ramp = null;
while (beat < 130) {
  if (i < RAMPS.length && beat >= RAMPS[i][0]) {
    const [, to, beats] = RAMPS[i++];
    ramp = { t0: t, t1: t + beats * 60 / to, v0: bpm, v1: to };
  }
  if (ramp) bpm = t >= ramp.t1 ? ramp.v1 : ramp.v0 + (ramp.v1 - ramp.v0) * (t - ramp.t0) / (ramp.t1 - ramp.t0);
  beat += bpm / 60 * DT; t += DT;
  if (Math.round(t / DT) % 100 === 0) table.push([t, beat]);
}
const lerp = (k, a, b) => { let lo = 0, hi = table.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; (table[m][k] <= a ? lo = m : hi = m); } const [p, q] = [table[lo], table[hi]]; return p[b] + (q[b] - p[b]) * (a - p[k]) / (q[k] - p[k]); };
export const beatAt = sec => lerp(0, sec, 1);
export const timeAt = b => lerp(1, b, 0);

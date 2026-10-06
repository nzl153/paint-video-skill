// 全片时间轴：画面和声效共用这一份（浏览器里是全局变量，Node 里 require 进来合成音频）
const TL = (() => {
  const S = {               // 每一场的起点（秒）
    pond: 0, membrane: 21.5, brain: 50, fluor: 74, mouse: 100, eye: 124, pov: 142.5, end: 152.5,
  };
  const END = 166;

  // 确定性随机，Node 和浏览器算出来一样
  const rnd = seed => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

  // 第三场：神经元自发放电（泊松），每个元素 [时间, 神经元编号]
  const brainSpikes = [];
  { const r = rnd(7); for (let t = S.brain + 2.4; t < S.fluor - .4;) { t += -Math.log(1 - r()) * .16; brainSpikes.push([t, Math.floor(r() * 16)]); } }
  // 电极一扎，周围成片放电
  const zaps = [S.brain + 12.6, S.brain + 14.7];

  // 第四场：蓝光脉冲（只有装了门的细胞跟着放电）
  const fluorPulses = [];
  for (let t = 14.2; t < 19.6; t += .3) fluorPulses.push(S.fluor + t);
  for (const t of [20.6, 20.8, 21.0, 21.9, 22.5, 22.7, 23.5, 23.6, 23.7, 23.8, 24.7]) fluorPulses.push(S.fluor + t);

  return {
    S, END, rnd, brainSpikes, zaps, fluorPulses,
    pondLight: S.pond + 5.2,                       // 光束亮起
    titleIn: S.pond + 14, titleOut: S.pond + 20.4,
    photon: [S.membrane + 13.2, S.membrane + 24.5, S.membrane + 26.6],   // 光子打到通道、门打开
    closeAt: [S.membrane + 18.8, S.membrane + 25.3, S.membrane + 27.4],
    virus: S.fluor + 1.2, infect: S.fluor + 4.6,
    mouseOn: [[S.mouse + 6.5, S.mouse + 12.5], [S.mouse + 15.6, S.mouse + 19.6]],
    amberOn: S.eye + 13.4,
  };
})();
if (typeof module !== 'undefined') module.exports = TL;

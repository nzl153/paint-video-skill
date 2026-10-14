// DRSKit 真鼓：按力度挑采样，同一力度附近的几下轮换，不连用同一下。
// const kit = await drsKit(['kick', 'snare', 'crash=crashL+crashR']);  kit.kick 有 volume / connect / triggerAttackRelease，能直接当 Sampler 用
// 力度 v 对应峰值 26·log10(v) dB（比单采样按增益缩放更有轻重），再加 ±0.75 dB 和 ±3 ms 的手感
window.drsKit = async (names, root) => {
  const get = (url, type) => new Promise((ok, no) => {
    const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = type;
    x.onload = () => ok(x.response); x.onerror = () => no(new Error('load ' + url)); x.send();
  });
  const idx = await get(root + 'index.json', 'json'), ctx = Tone.getContext();
  let seed = 7; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const kit = {};
  for (const spec of names) {
    const [nm, src = nm] = spec.split('=');
    const hits = (await Promise.all(src.split('+').flatMap(d => idx[d].map(async h =>
      ({ pk: h.pk, buf: new Tone.ToneAudioBuffer(await ctx.decodeAudioData(await get(`${root}${d}/${h.f}`, 'arraybuffer'))) })))))
      .sort((a, b) => a.pk - b.pk);
    const top = hits.at(-1).pk, out = new Tone.Volume(0);
    let last = -1;
    kit[nm] = {
      volume: out.volume,
      connect(d) { out.connect(d); return this; },
      triggerAttackRelease(note, dur, t, v = 1) {
        const want = top + 26 * Math.log10(Math.max(0.05, v));
        const near = hits.map((h, i) => [Math.abs(h.pk - want), i]).sort((a, b) => a[0] - b[0]).slice(0, 3).map(x => x[1]).filter(i => i !== last);
        const i = last = near[Math.floor(rnd() * near.length)];
        new Tone.ToneBufferSource({ url: hits[i].buf, context: out.context }).connect(out).start(Math.max(0, t + (rnd() - 0.5) * 0.006), 0, undefined, 10 ** ((rnd() - 0.5) * 1.5 / 20));
      }
    };
  }
  return kit;
};

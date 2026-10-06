// 旁白：node tools/voice.js  →  out/voice/*.wav + src/voice.js
// 每句旁白挂在原时间轴（τ）的一个时段上；读得比时段长，就把那一段时间拉长。
// 拉伸关系写成分段线性的 warp，画面和声效都按它从真实时间 t 换回 τ。
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const TL = require('../src/timeline.js');
const { S } = TL;
const VOICE = 'zh-CN-YunyangNeural', RATE = '-5%', PROXY = process.env.TTS_PROXY;   // 连不上微软语音服务时设成代理地址
const m = S.membrane, b = S.brain, f = S.fluor, mo = S.mouse, e = S.eye, p = S.pov, en = S.end;

// [时段起, 时段止, 读的话, 字幕（null = 不出字幕，画面上已有字）]
const LINES = [
  [1.5, 6.8, '池塘里有一种绿藻，整个身体只有一个细胞，没有眼睛，也没有大脑。'],
  [7.6, 13.4, '可只要一有光，它就会掉头，朝着光游过去。它是怎么“看见”光的？'],
  [14.4, 20.0, '这个问题的答案，拿下了今年的诺贝尔生理学或医学奖。', null],
  [m + 1.8, m + 6.6, '我们放大它身上这个橙红色的小点，它叫眼点。'],
  [m + 7.0, m + 12.6, '眼点旁边的细胞膜上，嵌着一种特殊的蛋白质，叫通道视紫红质。'],
  [m + 13.4, m + 18.6, '蓝光一照，它就像一扇门一样打开，带正电的离子涌进细胞，产生电信号。'],
  [m + 19.0, m + 22.6, '光一灭，门就关上。'],
  [m + 23.0, m + 28.2, '2002到2003年，纳格尔和黑格曼证明：这扇光控的门，单独拿出来也能工作。',
    '2002 到 2003 年，Nagel 和 Hegemann 证明：这扇光控的门，单独拿出来也能工作。'],
  [b + 1.0, b + 6.8, '再来看大脑。人脑里有八百多亿个神经元，它们靠电信号彼此说话。'],
  [b + 9.8, b + 16.6, '过去，科学家只能用电极去刺激。可电极一扎下去，周围成片的细胞会一起被点亮。'],
  [b + 17.4, b + 23.2, '到底是哪一类细胞，在管哪一件事？一直很难分清。'],
  [f + .8, f + 7.0, '2005年，戴瑟罗斯的团队把这扇门的基因，装进了哺乳动物的神经元。',
    '2005 年，Deisseroth 的团队把这扇门的基因，装进了哺乳动物的神经元。'],
  [f + 7.6, f + 13.2, '科学家用病毒当快递，只把基因送进想研究的那一类细胞。'],
  [f + 13.8, f + 19.6, '这时候蓝光一照，只有装了门的细胞会放电，旁边的细胞纹丝不动。'],
  [f + 20.2, f + 25.4, '想让它什么时候放电，就什么时候放电，精确到毫秒。这，就是光遗传学。'],
  [mo + .6, mo + 5.9, '在小鼠的大脑里装上这扇门，再接一根细细的光纤。'],
  [mo + 6.7, mo + 12.3, '开灯，它开始原地转圈。'],
  [mo + 12.8, mo + 15.4, '关灯，一切照旧。'],
  [mo + 15.9, mo + 23.4, '记忆、恐惧、成瘾，大脑里许多回路，就是这样一条条找出来的。'],
  [e + .8, e + 6.4, '光遗传学也走出了实验室。有一种眼病，会让感光细胞一点点死去，最终失明。'],
  [e + 6.8, e + 12.6, '2021年，研究团队把另一种光敏通道，装进了患者视网膜里幸存的细胞。'],
  [e + 13.0, e + 18.0, '再戴上一副特制眼镜，把看到的画面变成琥珀色的光脉冲，打进眼底。'],
  [p + .8, p + 5.6, '借助眼镜，他能在桌上找到笔记本：39次测试，摸到了36次。', '借助眼镜，他能在桌上找到笔记本：39 次测试，摸到了 36 次。'],
  [p + 6.0, p + 9.6, '这是光遗传学第一次，让盲人部分恢复了视觉。'],
  [en + 1.0, en + 6.4, '从池塘里的一颗绿藻，到大脑的开关。', null],
  [en + 7.0, en + 13.6, '2026年诺贝尔生理学或医学奖，授予黑格曼、纳格尔和戴瑟罗斯，表彰他们开创了光遗传学。', null],
];

const dir = path.join(__dirname, '..', 'out', 'voice');
fs.mkdirSync(dir, { recursive: true });
const wavDur = file => { const b = fs.readFileSync(file); return (b.length - 44) / 2 / 48000; };

const lines = LINES.map(([a, z, say, cap], i) => {
  const key = crypto.createHash('sha1').update(VOICE + RATE + say).digest('hex').slice(0, 8);
  const mp3 = path.join(dir, `${String(i).padStart(2, '0')}-${key}.mp3`), wav = mp3.replace('.mp3', '.wav');
  if (!fs.existsSync(wav)) {
    execFileSync('edge-tts', [...(PROXY ? ['--proxy', PROXY] : []), '--voice', VOICE, `--rate=${RATE}`, '--text', say, '--write-media', mp3]);
    // 掐掉首尾静音，统一成 48k 单声道 16-bit
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp3, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse', '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', '-map_metadata', '-1', '-fflags', '+bitexact', wav]);
  }
  return { a, z, say, cap: cap === undefined ? say : cap, wav: path.relative(path.join(__dirname, '..'), wav).replace(/\\/g, '/'), dur: wavDur(wav) };
});

// 分段线性 warp：每个旁白时段的新长度 = max(原长, 读完 + 0.7s)，时段之间的空隙保持原长
const anchors = [[0, 0]];
let tau = 0, t = 0;
for (const L of lines) {
  t += L.a - tau; tau = L.a; anchors.push([tau, t]);
  const len = Math.max(L.z - L.a, L.dur + .7);
  L.t0 = t; t += len; tau = L.z; anchors.push([tau, t]); L.t1 = t;
}
t += TL.END - tau; anchors.push([TL.END, t]);

// 字幕：长句在标点处切成几屏，按字数分配读音时长
const caps = [];
for (const L of lines) {
  if (!L.cap) continue;
  const parts = [], segs = L.cap.match(/[^，。：？；！]+[，。：？；！]?/g);
  let cur = '';
  for (const s of segs) { if ((cur + s).replace(/\s/g, '').length > 24 && cur) { parts.push(cur); cur = s; } else cur += s; }
  if (cur) parts.push(cur);
  const total = parts.reduce((n, s) => n + s.length, 0), v0 = L.t0 + .25;
  let acc = 0;
  parts.forEach((s, k) => {
    const st = v0 + L.dur * acc / total; acc += s.length;
    const ed = k === parts.length - 1 ? Math.min(L.t1 - .1, v0 + L.dur + .6) : v0 + L.dur * acc / total;
    caps.push([+(st - .05).toFixed(3), +ed.toFixed(3), s.replace(/[，；。]$/, '')]);
  });
}

const out = {
  voice: VOICE, end: +t.toFixed(3), anchors: anchors.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]),
  lines: lines.map(L => ({ t: +(L.t0 + .25).toFixed(3), dur: +L.dur.toFixed(3), wav: L.wav })), caps,
};
fs.writeFileSync(path.join(__dirname, '..', 'src', 'voice.js'),
  `// tools/voice.js 生成，别手改\nconst VOICE = ${JSON.stringify(out, null, 1)};\nif (typeof module !== 'undefined') module.exports = VOICE;\n`);
for (const L of lines) console.log(`${L.t0.toFixed(1).padStart(6)}  ${L.dur.toFixed(1)}s / 原 ${(L.z - L.a).toFixed(1)}s  ${L.say.slice(0, 18)}`);
console.log(`总长 ${TL.END}s → ${t.toFixed(1)}s`);

// 渲配乐：node tools/audio.mjs → out/shalou.wav、out/shalou.mp3
// 无头 Chrome 没有声卡，只能 Tone.Offline 离线渲。采样约 150MB，从 jsDelivr 拉一次后存在 .cache/，以后从本地读
import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, open, ffmpeg } from './env.mjs';
import { useCache } from './cache.mjs';

// CDN 偶尔有一两个文件超时，整次就会失败；已经下到的都在缓存里，重试一次很快
async function render() {
  const browser = await launch();
  try {
    const page = await open(browser, '../music/render-audio.html', 1920, 1080, useCache);
    const info = await page.evaluate(() => window.renderAudio(81));
    console.log('rendered', info);
    const parts = [], CH = 1 << 20;
    for (let i = 0; i < info.bytes; i += CH) parts.push(Buffer.from(await page.evaluate((i, s) => window.wavChunk(i, s), i, CH), 'base64'));
    return parts;
  } finally { await browser.close(); }
}
let parts;
for (let k = 1; !parts; k++) {
  try { parts = await render(); process.exitCode = 0; } catch (e) { if (k >= 3) throw e; console.log(`第 ${k} 次失败（${e.message}），重试`); }
}
mkdirSync('out', { recursive: true });
const raw = resolve('out/raw.wav'), trimmed = resolve('out/trimmed.wav'), wav = resolve('out/shalou.wav');
writeFileSync(raw, Buffer.concat(parts));
// 片长 78 秒，留 1 秒尾音；响度标准化跑两遍、第二遍 linear=true，单遍会把强弱压平
ffmpeg(['-i', raw, '-af', 'atrim=0:79', '-c:a', 'pcm_s16le', trimmed]);
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', trimmed, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=20:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
const m = JSON.parse(probe.stderr.match(/\{[\s\S]*?\}/)[0]);
ffmpeg(['-i', trimmed, '-af', `loudnorm=I=-16:TP=-1.5:LRA=20:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=44100`, '-c:a', 'pcm_s16le', wav]);
ffmpeg(['-i', wav, '-codec:a', 'libmp3lame', '-b:a', '320k', resolve('out/shalou.mp3')]);
unlinkSync(raw); unlinkSync(trimmed);
console.log('wrote out/shalou.wav, out/shalou.mp3');

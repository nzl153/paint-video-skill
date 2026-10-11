// 渲配乐：node tools/audio.mjs → out/yuanguang.wav、out/yuanguang.mp3
// 无头 Chrome 没有声卡，只能 Tone.Offline 离线渲；采样从 jsDelivr 拉，第一次要等一会儿
import { writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, open, ffmpeg } from './env.mjs';

const browser = await launch();
const page = await open(browser, '../music/render-audio.html');
page.on('console', m => console.log('[page]', m.text()));
const info = await page.evaluate(() => window.renderAudio(118));
console.log('rendered', info);
const parts = [], CH = 1 << 20;
for (let i = 0; i < info.bytes; i += CH) parts.push(Buffer.from(await page.evaluate((i, s) => window.wavChunk(i, s), i, CH), 'base64'));
await browser.close();
const raw = resolve('out/raw.wav'), trimmed = resolve('out/trimmed.wav'), wav = resolve('out/yuanguang.wav');
writeFileSync(raw, Buffer.concat(parts));
// 只剪尾部静音；响度标准化跑两遍、第二遍 linear=true，单遍会把强弱压平
ffmpeg(['-i', raw, '-af', 'areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse', '-c:a', 'pcm_s16le', trimmed]);
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', trimmed, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=20:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
const m = JSON.parse(probe.stderr.match(/\{[\s\S]*?\}/)[0]);
ffmpeg(['-i', trimmed, '-af', `loudnorm=I=-16:TP=-1.5:LRA=20:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=44100`, '-c:a', 'pcm_s16le', wav]);
ffmpeg(['-i', wav, '-codec:a', 'libmp3lame', '-b:a', '320k', resolve('out/yuanguang.mp3')]);
unlinkSync(raw); unlinkSync(trimmed);
console.log('wrote out/yuanguang.wav, out/yuanguang.mp3');

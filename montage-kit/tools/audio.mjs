// 渲配乐：node tools/audio.mjs → out/music.wav（再跑 python -I music/sfx.py 混上音效 → out/mix.wav）
// 无头 Chrome 里 Tone.Offline 离线渲，弦乐等采样第一次从 jsDelivr 拉，之后走 .cache/
// --drs=<目录>  DRSKit 立体声采样目录，默认 samples/drs（tools/drs_build.py 生成）
import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { launch, open, ffmpeg, arg } from './env.mjs';
import { useCache } from './cache.mjs';

const LEN = 25.9, O = 0.6;  // 乐谱整体后移 O 秒（长音采样起音慢，提前触发），导出时剪掉
const drs = pathToFileURL(resolve(arg('drs') || 'samples/drs')).href + '/';
mkdirSync('out', { recursive: true });

async function render(seconds) {
  for (let k = 1; ; k++) {  // CDN 偶尔有一个文件超时，已经下到的都在缓存里，重试很快
    const browser = await launch();
    try {
      const page = await open(browser, `../music/render-audio.html?drs=${encodeURIComponent(drs)}`, 1920, 1080, useCache);
      const info = await page.evaluate(n => window.renderAudio(n), seconds);
      const parts = [], CH = 1 << 20;
      for (let i = 0; i < info.bytes; i += CH) parts.push(Buffer.from(await page.evaluate((i, s) => window.wavChunk(i, s), i, CH), 'base64'));
      return Buffer.concat(parts);
    } catch (e) { if (k >= 3) throw e; console.log(`第 ${k} 次失败（${e.message}），重试`); }
    finally { await browser.close(); }
  }
}

const raw = resolve('out/raw.wav'), cut = resolve('out/cut.wav'), wav = resolve('out/music.wav');
writeFileSync(raw, await render(LEN + 2 * O));
// 先限一下峰值再标准化：真峰值超标时 loudnorm 的 linear 会悄悄退成动态模式，把安静的开头提响
ffmpeg(['-i', raw, '-af', `atrim=${O}:${O + LEN},asetpts=PTS-STARTPTS,alimiter=limit=0.66:attack=1:release=60:level=false`, '-c:a', 'pcm_s16le', cut]);
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', cut, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=20:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
const m = JSON.parse(probe.stderr.match(/\{[\s\S]*?\}/)[0]);
ffmpeg(['-i', cut, '-af', `loudnorm=I=-16:TP=-1.5:LRA=20:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=44100`, '-c:a', 'pcm_s16le', wav]);
unlinkSync(raw); unlinkSync(cut);
console.log('→ out/music.wav');

// 渲配乐（无头 Chrome 里 Tone.Offline 离线渲，弦乐等采样第一次从 jsDelivr 拉，之后走 .cache/）
// node tools/audio.mjs             乐谱自带总线的版本 → out/yidimo_ref.wav（-16 LUFS，混音台拿它当各段响度的参考）
// node tools/audio.mjs --stems     再出五组干声分轨 → out/stems/<组>.wav（不压不标准化，给 tools/mixdesk.py）
// node tools/audio.mjs --events    只导出音符表 → src/events.json（画面靠它驱动；改了乐谱要重导）
// --drs=<目录>  DRSKit 立体声采样目录，默认 samples/drs（tools/drs_build.py 生成）
import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { launch, open, ffmpeg, arg } from './env.mjs';
import { useCache } from './cache.mjs';

const LEN = 91, FADE = 0.4, O = 0.6;  // 乐谱整体后移 O 秒（长音采样起音慢，提前触发），导出时剪掉
const GROUPS = ['drums', 'strings', 'guitar', 'bass', 'brass'];
const drs = pathToFileURL(resolve(arg('drs') || 'samples/drs')).href + '/';
mkdirSync('out/stems', { recursive: true });

async function render(query, seconds) {
  for (let k = 1; ; k++) {  // CDN 偶尔有一个文件超时，已经下到的都在缓存里，重试很快
    const browser = await launch();
    try {
      const page = await open(browser, `../music/render-audio.html?drs=${encodeURIComponent(drs)}${query}`, 1920, 1080, useCache);
      const info = await page.evaluate(n => window.renderAudio(n), seconds);
      if (seconds < 1) return await page.evaluate(() => window.EV);
      const parts = [], CH = 1 << 20;
      for (let i = 0; i < info.bytes; i += CH) parts.push(Buffer.from(await page.evaluate((i, s) => window.wavChunk(i, s), i, CH), 'base64'));
      return Buffer.concat(parts);
    } catch (e) { if (k >= 3) throw e; console.log(`第 ${k} 次失败（${e.message}），重试`); }
    finally { await browser.close(); }
  }
}

if (process.argv.includes('--events')) {
  const ev = await render('', 0.1);
  writeFileSync('src/events.json', JSON.stringify(ev)); console.log(ev.length, 'notes → src/events.json');
  process.exit(0);
}

const raw = resolve('out/raw.wav'), cut = resolve('out/cut.wav'), ref = resolve('out/yidimo_ref.wav');
writeFileSync(raw, await render('', LEN + 2 * O));
// 先限一下峰值再标准化：真峰值超标时 loudnorm 会退成动态模式，把轻段托高、强弱压平
ffmpeg(['-i', raw, '-af', `atrim=${O}:${O + LEN},asetpts=PTS-STARTPTS,alimiter=limit=0.66:attack=1:release=60:level=false,afade=t=out:st=${LEN - FADE}:d=${FADE}`, '-c:a', 'pcm_s16le', cut]);
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', cut, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=20:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
const m = JSON.parse(probe.stderr.match(/\{[\s\S]*?\}/)[0]);
ffmpeg(['-i', cut, '-af', `loudnorm=I=-16:TP=-1.5:LRA=20:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=44100`, '-c:a', 'pcm_s16le', ref]);
unlinkSync(raw); unlinkSync(cut);
console.log('→ out/yidimo_ref.wav');

if (process.argv.includes('--stems')) for (const g of GROUPS) {
  writeFileSync(raw, await render(`&stem=${g}`, LEN + 2 * O));
  ffmpeg(['-i', raw, '-af', `atrim=${O}:${O + LEN},asetpts=PTS-STARTPTS`, '-c:a', 'pcm_s16le', resolve(`out/stems/${g}.wav`)]);
  unlinkSync(raw); console.log(`→ out/stems/${g}.wav`);
}

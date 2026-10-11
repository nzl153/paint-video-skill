// 出片：node tools/render.mjs [--jobs=4] [--end=拍] → out/yuanguang.mp4
// 多路并行，每路各开一个浏览器（同一浏览器里的后台标签页截图会报 Internal error）。
// 每路约占 2–3GB 内存，32GB 的机器开 8 路会吃到九成以上，默认 4 路。--end 只渲到某一拍，用来快速试看。
// 有 out/yuanguang.wav（先跑 tools/audio.mjs）就配上，没有就出无声版，长度按速度表算到第 120.4 拍。
import { spawn } from 'node:child_process';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { arg, launch, open, ffmpeg, duration } from './env.mjs';
import { beatAt, timeAt } from './tempo.mjs';

const FPS = 30, J = +(arg('jobs') ?? 4), wav = resolve('out/yuanguang.wav'), withAudio = existsSync(wav);
const n = Math.round((arg('end') ? timeAt(+arg('end')) : withAudio ? duration(wav) : timeAt(120.4)) * FPS), per = Math.ceil(n / J), t0 = Date.now();
let done = 0;
async function worker(j) {
  const a = j * per, b = Math.min(n, a + per), seg = resolve(`out/_seg${j}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', FPS, '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise(r => ff.on('close', r));
  const browser = await launch(), page = await open(browser, '../src/anim.html');
  for (let i = a; i < b; i++) {
    await page.evaluate(x => draw(x), beatAt(i / FPS));
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 150 === 0) console.log(`${done}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await closed; await browser.close();
  return seg;
}
const segs = await Promise.all(Array.from({ length: J }, (_, j) => worker(j)));
const list = resolve('out/_segs.txt');
writeFileSync(list, segs.map(s => `file '${s.replaceAll('\\', '/')}'`).join('\n'));
ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, ...(withAudio ? ['-i', wav, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-shortest'] : []), '-c:v', 'copy', '-movflags', '+faststart', resolve('out/yuanguang.mp4')]);
for (const s of segs) unlinkSync(s);
unlinkSync(list);
console.log(`wrote out/yuanguang.mp4 (${n} frames${withAudio ? '' : ', silent'}) in ${((Date.now() - t0) / 60000).toFixed(1)} min`);

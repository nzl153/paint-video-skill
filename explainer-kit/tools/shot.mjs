// 联系表：node tools/shot.mjs --times=4,30,90 --cols=4 --w=480 --out=out/check/sheet.jpg
// 出片：  node tools/shot.mjs --video --fps=30 --out=out/video.mp4（先跑 tools/audio.js 生成 out/audio.wav）
// Chrome 找不到时传 --chrome=<路径> 或设 CHROME_PATH
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const has = k => process.argv.includes(`--${k}`);
const out = resolve(arg('out') ?? 'out/check/sheet.jpg');
mkdirSync(dirname(out), { recursive: true });

const CHROME = [arg('chrome'), process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => p && existsSync(p));
if (!CHROME) { console.error('Chrome not found: pass --chrome=<path> or set CHROME_PATH'); process.exit(1); }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
const errors = [];   // 脚本异常：画面不可信，最后以退出码 1 结束
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => m.type() === 'error' && console.log('[page]', m.text()));   // 资源缺失等，例如联系表阶段还没有 out/audio.wav
await page.setViewport({ width: 1920, height: 1080 });
await page.goto(pathToFileURL(resolve('index.html')).href + '?capture', { waitUntil: 'load' });
await page.waitForFunction(() => window.READY, { timeout: 60000 });   // 字体加载完再截，不然前几帧是回退字体

if (has('video')) {
  const fps = +(arg('fps') ?? 30), end = await page.evaluate(() => END), n = Math.round(end * fps);
  const audio = resolve('out/audio.wav'), withAudio = existsSync(audio);
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    ...(withAudio ? ['-i', audio, '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const b64 = await page.evaluate(t => { renderAt(t); return document.getElementById('c').toDataURL('image/jpeg', .95).split(',')[1]; }, i / fps);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`${i}/${n}  ${((Date.now() - t0) / (i + 1)).toFixed(0)} ms/frame`);
  }
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  if (code) { console.error(`ffmpeg exited ${code}`); await browser.close(); process.exit(1); }
} else {
  const times = (arg('times') ?? '4,30,90').split(',').map(Number);
  const t0 = Date.now();
  const url = await page.evaluate((ts, c, w) => sheet(ts, c, w), times, +(arg('cols') ?? 4), +(arg('w') ?? 480));
  writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${times.length} frames, ${((Date.now() - t0) / times.length).toFixed(0)} ms/frame`);
}
await browser.close();
if (errors.length) { console.error('FAILED: page errors, output cannot be trusted:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('->', out);

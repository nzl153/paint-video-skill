// 沙有状态，帧只能从头顺序推进，不能多进程乱序并行（1080p 普通段约 90 ms/帧，树那段几百毫秒，78 秒约 25 分钟）
// node tools/render.mjs --at=6.5,20.9,46.5,56.5   只存这几秒的静帧到 out/check 并拼联系表 sheet.jpg（模拟仍从头跑）
// node tools/render.mjs [--audio=out/shalou.wav] [--seconds=78] [--frames=out/frames] [--out=out/shalou.mp4]
// 改了 sand.js 再出片要换个 --frames 目录或先挪走旧帧，脚本会覆盖同名帧但不会删多出来的
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { CHROME, ffmpeg, arg } from './env.mjs';

const FPS = 30, N = Math.round(FPS * +(arg('seconds') || 78));
// 要真 GPU：软件渲染的 WebGL 慢十几倍
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 0,
  args: ['--allow-file-access-from-files', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--window-size=1920,1080'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
page.on('pageerror', e => { console.error('[page error]', e.message); process.exitCode = 1; });
await page.goto(new URL('../src/sand.html', import.meta.url).href);
await page.waitForFunction('window.ready');

const save = (file, url) => writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
const t0 = Date.now();
if (arg('at')) {
  rmSync('out/check', { recursive: true, force: true }); mkdirSync('out/check', { recursive: true });
  const want = arg('at').split(',').map(s => Math.round(+s * FPS)).sort((a, b) => a - b);
  for (const [k, f] of want.entries()) save(`out/check/s${String(k).padStart(3, '0')}.jpg`, await page.evaluate(f => renderTo(f), f));
  await browser.close();
  const n = want.length, cols = Math.min(4, n);
  ffmpeg(['-framerate', '1', '-i', 'out/check/s%03d.jpg', '-vf', `scale=480:-1,tile=${cols}x${Math.ceil(n / cols)}`, '-frames:v', '1', 'out/check/sheet.jpg']);
  console.log(`${n} stills → out/check/sheet.jpg, ${Date.now() - t0} ms`);
} else {
  const FR = arg('frames') || 'out/frames'; mkdirSync(FR, { recursive: true });
  for (let f = 0; f < N; f++) save(`${FR}/${String(f).padStart(4, '0')}.jpg`, await page.evaluate(f => renderTo(f), f));
  await browser.close();
  console.log(`${N} frames, ${((Date.now() - t0) / N).toFixed(0)} ms/frame`);
  const out = arg('out') || 'out/shalou.mp4', end = N / FPS;
  const audio = arg('audio') ? ['-i', arg('audio'), '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-af', `afade=t=out:st=${end - 1.5}:d=1.5`] : [];
  ffmpeg(['-framerate', String(FPS), '-i', `${FR}/%04d.jpg`, ...audio, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-t', String(end), out]);
  console.log('→', out);
}

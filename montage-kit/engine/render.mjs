// node engine/render.mjs --sheet=0.5,3,7.2 [--cols=4] --out=out/check/a.jpg   contact sheet at given seconds
// node engine/render.mjs --from=6.5 --to=8.5 --cols=8 --out=...               every frame in a range
// node engine/render.mjs --video --out=out/yikou.mp4 [--audio=out/mix.wav]
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { renderFrame, W, H } from './film.mjs';
import { FPS, DURATION } from './timeline.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const out = args.out;
mkdirSync(path.dirname(out), { recursive: true });

if (args.video) {
  const total = Math.round(DURATION * FPS);
  const ff = ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-'];
  if (args.audio) ff.push('-i', args.audio, '-c:a', 'aac', '-b:a', '256k', '-shortest');
  ff.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', out);
  const proc = spawn('ffmpeg', ff, { stdio: ['pipe', 'ignore', 'inherit'] });
  const t0 = Date.now();
  for (let fi = 0; fi < total; fi++) {
    const data = renderFrame(fi).getContext('2d').getImageData(0, 0, W, H).data;
    if (!proc.stdin.write(Buffer.from(data.buffer))) await new Promise((r) => proc.stdin.once('drain', r));
    if (fi % 60 === 0) process.stdout.write(`frame ${fi}/${total}\n`);
  }
  proc.stdin.end();
  await new Promise((r) => proc.on('close', r));
  console.log(`done ${(Date.now() - t0) / 1000}s -> ${out}`);
} else {
  const frames = args.sheet
    ? String(args.sheet).split(',').map((s) => Math.round(Number(s) * FPS))
    : Array.from({ length: Math.round((Number(args.to) - Number(args.from)) * FPS) }, (_, i) => Math.round(Number(args.from) * FPS) + i);
  const cols = Number(args.cols || 4);
  const tw = Number(args.w || 480), th = Math.round(tw * H / W);
  const rows = Math.ceil(frames.length / cols);
  const sheet = createCanvas(cols * tw, rows * th);
  const sctx = sheet.getContext('2d');
  sctx.font = '14px Consolas';
  frames.forEach((fi, i) => {
    const x = (i % cols) * tw, y = Math.floor(i / cols) * th;
    sctx.drawImage(renderFrame(fi), x, y, tw, th);
    sctx.fillStyle = 'rgba(0,0,0,0.6)'; sctx.fillRect(x, y, 70, 18);
    sctx.fillStyle = '#ff0'; sctx.fillText((fi / FPS).toFixed(2), x + 4, y + 14);
  });
  writeFileSync(out, sheet.toBuffer('image/jpeg', 88));
  console.log(`sheet -> ${out}`);
}

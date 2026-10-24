// node engine/stylepreview.mjs <id> [id...] -> out/preview/<id>.jpg
// Three panels: this style in the hole under the donut ring; this style as the ring around the
// sketch rider; this style as both. Also prints draw times.
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { makeRider } from './rider.mjs';
import { HOLE_R, BEAT } from './timeline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 1920, H = 1080;
const load = async (id) => (await import(pathToFileURL(path.join(root, 'styles', id + '.js')))).default;
const donut = await load('donut'), sketch = await load('sketch');
mkdirSync(path.join(root, 'out/preview'), { recursive: true });

function frame(innerStyle, ringStyle, t) {
  const hole = { cx: W / 2, cy: H / 2, r: HOLE_R, kick: 0, zoom: 1 };
  const info = { p: 0.5, since: 0.3, zoom: 1, beat: t / BEAT, bitten: false, sinceBite: -1, fadeIn: 1, fadeOut: 0 };
  const c = createCanvas(W, H), ctx = c.getContext('2d');
  const inner = createCanvas(W, H);
  const t0 = performance.now();
  innerStyle.drawInner(inner.getContext('2d'), W, H, t, hole, makeRider(t, hole), info);
  const t1 = performance.now();
  ctx.save(); ctx.beginPath(); ctx.arc(hole.cx, hole.cy, hole.r, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(inner, 0, 0); ctx.restore();
  const ring = createCanvas(W, H), r = ring.getContext('2d');
  ringStyle.drawRing(r, W, H, t, hole, info);
  const t2 = performance.now();
  r.setTransform(1, 0, 0, 1, 0, 0); r.globalAlpha = 1; r.globalCompositeOperation = 'destination-out'; r.fillStyle = '#000';
  r.beginPath(); r.arc(hole.cx, hole.cy, hole.r, 0, Math.PI * 2); r.fill();
  ctx.drawImage(ring, 0, 0);
  return { c, inner: t1 - t0, ring: t2 - t1 };
}

let failed = 0;
for (const id of process.argv.slice(2)) {
  try {
    const s = await load(id);
    const shots = [frame(s, donut, 5.0), frame(sketch, s, 5.2), frame(s, s, 5.45)];
    const sheet = createCanvas(960 * 3, 540);
    shots.forEach((f, i) => sheet.getContext('2d').drawImage(f.c, i * 960, 0, 960, 540));
    writeFileSync(path.join(root, 'out/preview', id + '.jpg'), sheet.toBuffer('image/jpeg', 88));
    console.log(`${id.padEnd(12)} ok  inner ${shots[0].inner.toFixed(0)}/${shots[2].inner.toFixed(0)}ms  ring ${shots[1].ring.toFixed(0)}/${shots[2].ring.toFixed(0)}ms`);
  } catch (e) {
    failed++;
    console.log(`${id.padEnd(12)} FAIL ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
  }
}
process.exit(failed ? 1 : 0);

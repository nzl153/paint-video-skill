// node engine/gallery.mjs -> out/check/gallery.jpg: every style as both layers (third preview panel), 4 across.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { STYLES } from './timeline.mjs';

const tw = 640, th = 360, cols = 4;
const sheet = createCanvas(tw * cols, th * Math.ceil(STYLES.length / cols));
const g = sheet.getContext('2d');
g.font = '18px Consolas';
for (const [i, id] of STYLES.entries()) {
  const im = await loadImage(`out/preview/${id}.jpg`);
  const x = (i % cols) * tw, y = Math.floor(i / cols) * th;
  g.drawImage(im, 1920, 0, 960, 540, x, y, tw, th);
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, y, 130, 24);
  g.fillStyle = '#ff0'; g.fillText(id, x + 5, y + 18);
}
writeFileSync('out/check/gallery.jpg', sheet.toBuffer('image/jpeg', 85));

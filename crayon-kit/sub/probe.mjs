// 人物位置探针：包住 human/bird 等函数，统计它们每帧实际画出的范围（屏幕坐标），写 sub/boxes.json 给排版避让
// 用法（在 p5 目录下）：node sub/probe.mjs [--fps=6]
import puppeteer from 'puppeteer-core';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
const fps = +(arg('fps') || 6);
const chrome = [arg('chrome'), process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && existsSync(p));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, protocolTimeout: 0,
  args: ['--allow-file-access-from-files', '--window-size=1920,1080', ...(process.platform === 'linux' ? ['--no-sandbox'] : [])] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('[page error]', e.message));
await page.goto(pathToFileURL(resolve('studio.html')).href + '?render', { waitUntil: 'networkidle0' });
await page.waitForFunction('window.ready === true');
const out = await page.evaluate(async fps => {
  // hard：字绝不能压；soft：尽量不压。换了片子就按自己的角色、道具函数名改这张表
  const TAGS = { human: 'hard', bird: 'hard', pinkyHand: 'hard', poof: 'hard', birdsOnBranch: 'hard', lanternStall: 'soft', heart: 'soft', boat: 'soft', threadHeart: 'soft', crowd: 'soft', crowdSil: 'soft' };
  let stack = [], cur = null;
  const oldWax = wax;
  window.wax = function (pts, pad, draw, o) {
    if (cur) {
      const m = X.getTransform();
      for (const [x, y] of pts) { const X_ = m.a * x + m.c * y + m.e, Y_ = m.b * x + m.d * y + m.f; cur.b[0] = Math.min(cur.b[0], X_); cur.b[1] = Math.min(cur.b[1], Y_); cur.b[2] = Math.max(cur.b[2], X_); cur.b[3] = Math.max(cur.b[3], Y_); }
    }
    return oldWax.apply(this, arguments);
  };
  let boxes = [];
  for (const [name, kind] of Object.entries(TAGS)) {
    const f = window[name]; if (typeof f !== 'function') continue;
    window[name] = function () {
      if (cur) return f.apply(this, arguments);        // 嵌套调用算在外层里
      cur = { n: name, k: kind, b: [1e9, 1e9, -1e9, -1e9] };
      try { return f.apply(this, arguments); } finally { if (cur.b[2] > cur.b[0]) boxes.push(cur); cur = null; }
    };
  }
  const res = {};
  for (let i = 0; i <= Math.floor(DUR * fps); i++) {
    const t = i / fps; boxes = []; renderFrame(t);
    res[t.toFixed(3)] = boxes.map(b => [b.n, b.k, ...b.b.map(v => Math.round(Math.max(-9999, Math.min(9999, v))))])
      .filter(b => b[4] > 0 && b[2] < 1920 && b[5] > 0 && b[3] < 1080);
  }
  return res;
}, fps);
writeFileSync('sub/boxes.json', JSON.stringify(out));
console.log('frames', Object.keys(out).length);
await browser.close();

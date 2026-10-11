// 联系表：node tools/sheet.mjs 8 24 40.3 56 72 90 108 → out/check/sheet.png（参数是乐谱的拍数）
import { launch, open } from './env.mjs';

const beats = process.argv.slice(2).filter(a => !a.startsWith('--')).map(Number);
const browser = await launch(), page = await open(browser, '../src/anim.html', 960, 540), imgs = [];
for (const b of beats) { await page.evaluate(b => draw(b), b); imgs.push((await page.screenshot({ type: 'jpeg', quality: 85 })).toString('base64')); }
await page.setViewport({ width: 1440, height: 100 });
await page.setContent(`<body style="margin:0;background:#ddd;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;font:14px sans-serif">${imgs.map((s, i) => `<div style="position:relative"><img src="data:image/jpeg;base64,${s}" style="width:100%;display:block"><span style="position:absolute;left:6px;top:4px;background:#fff8;padding:0 4px">${beats[i]}</span></div>`).join('')}</body>`);
await page.screenshot({ path: 'out/check/sheet.png', fullPage: true });
await browser.close();
console.log('wrote out/check/sheet.png');

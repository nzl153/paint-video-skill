// 六段定格：node tools/stills.mjs → out/check/still_1~6.png 和 out/check/stills.png 总览
import { launch, open } from './env.mjs';

const browser = await launch(), page = await open(browser, '../src/stills.html', 1240, 900);
const svgs = await page.$$('svg');
for (let i = 0; i < svgs.length; i++) await svgs[i].screenshot({ path: `out/check/still_${i + 1}.png` });
await page.screenshot({ path: 'out/check/stills.png', fullPage: true });
await browser.close();
console.log('wrote', svgs.length, 'stills');

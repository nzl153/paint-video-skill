// 公共：找 Chrome、开浏览器、跑 ffmpeg
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
export const CHROME = [arg('chrome'), process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => p && existsSync(p));
if (!CHROME) { console.error('Chrome not found: pass --chrome=<path> or set CHROME_PATH'); process.exit(1); }

export const launch = () => puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 0, args: ['--allow-file-access-from-files'] });
export async function open(browser, file, w = 1920, h = 1080, setup) {
  const page = await browser.newPage();
  if (setup) await setup(page);
  page.on('pageerror', e => { console.error('[page error]', e.message); process.exitCode = 1; });
  await page.setViewport({ width: w, height: h });
  await page.goto(new URL(file, import.meta.url).href, { waitUntil: 'networkidle0' });
  return page;
}
export const ffmpeg = args => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
export const duration = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString();
mkdirSync('out/check', { recursive: true });

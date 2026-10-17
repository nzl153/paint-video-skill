// 给无头 Chrome 挂本地采样缓存：CDN 请求先查 .cache/，有就直接从磁盘回；没有就让浏览器自己去下（走系统代理），下完存一份。
// Node 自带的 fetch 不认 HTTPS_PROXY，所以下载交给浏览器，Node 只管存。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, extname } from 'node:path';

const DIR = resolve(import.meta.dirname, '../.cache');
const TYPES = { '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.js': 'application/javascript' };
const CDN = 'https://cdn.jsdelivr.net/';
mkdirSync(DIR, { recursive: true });
const file = url => resolve(DIR, createHash('sha1').update(url).digest('hex') + extname(new URL(url).pathname));

export async function useCache(page) {
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url(), f = url.startsWith(CDN) && file(url);
    if (f && existsSync(f)) req.respond({ status: 200, body: readFileSync(f), headers: { 'Access-Control-Allow-Origin': '*' }, contentType: TYPES[extname(f)] || 'application/octet-stream' });
    else req.continue();
  });
  page.on('response', async res => {
    const url = res.url();
    if (!url.startsWith(CDN) || res.status() !== 200 || existsSync(file(url))) return;
    try { writeFileSync(file(url), await res.buffer()); } catch {}
  });
}

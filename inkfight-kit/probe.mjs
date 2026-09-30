// 不开浏览器，直接算关节在世界里的位置：node probe.mjs "表达式"
import fs from 'fs'; import vm from 'vm';
const ctx = { window: { addEventListener() {} }, document: {}, location: { search: '' }, console, Math };
vm.createContext(ctx);
const html = fs.readFileSync(new URL('./studio.html', import.meta.url), 'utf8');
const src = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => fs.readFileSync(new URL('./' + m[1], import.meta.url), 'utf8')).join('\n;\n');
vm.runInContext(src + '\n;globalThis.__e = expr => eval(expr);', ctx);
for (const e of process.argv.slice(2)) console.log(e, '=>', JSON.stringify(ctx.__e(e), (k, v) => typeof v === 'number' ? Math.round(v) : v));

// usage: node tools/shot.mjs out.png t [w h]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; fs.readFile(path.join(root, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(0);
const port = srv.address().port;
const [out, ...ts] = process.argv.slice(2);
const w = 1280, h = 720;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
pg.on('console', (m) => console.log('[console]', m.text())); pg.on('pageerror', (e) => console.log('[err]', e.message));
await pg.goto(`http://localhost:${port}/index.html?capture=1&w=${w}&h=${h}`);
await pg.waitForFunction('window.ready === true', null, { timeout: 120000 });
await pg.evaluate(() => document.fonts.ready);
for (const t of ts) { const t0 = Date.now(); await pg.evaluate((t) => window.renderFrame(+t), t); await pg.screenshot({ path: out.replace('.png', `_${t}.png`) }); console.log('t', t, Date.now() - t0, 'ms'); }
await b.close(); srv.close();

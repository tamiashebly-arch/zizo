// Renders frames [from,to) of the film to PNG/JPG files: node tools/render.mjs outDir w h fps from to
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; fs.readFile(path.join(root, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(0);
const port = srv.address().port;
const [out, W, H, FPS, from, to] = process.argv.slice(2); const w = +W, h = +H, fps = +FPS;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
pg.on('pageerror', (e) => console.log('[err]', e.message));
await pg.goto(`http://localhost:${port}/index.html?capture=1&w=${w}&h=${h}`);
await pg.waitForFunction('window.ready === true', null, { timeout: 300000 });
await pg.evaluate(() => document.fonts.ready);
for (let i = +from; i < +to; i++) {
  const f = path.join(out, `f${String(i).padStart(5, '0')}.jpg`);
  if (fs.existsSync(f)) continue;
  await pg.evaluate((t) => window.renderFrame(t), i / fps);
  await pg.screenshot({ path: f, type: 'jpeg', quality: 95 });
  if (i % 24 === 0) console.log('frame', i);
}
await b.close(); srv.close();

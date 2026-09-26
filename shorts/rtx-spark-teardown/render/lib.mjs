// Servidor estático + Chromium headless (SwiftShader) para renderizar la escena fotograma a fotograma.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };

export function serve(port = 0) {
  return new Promise((res) => {
    const srv = http.createServer((q, s) => {
      const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
      if (!p.startsWith(ROOT)) return s.writeHead(403).end();
      fs.readFile(p, (e, d) => {
        if (e) return s.writeHead(404).end();
        s.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        s.end(d);
      });
    });
    srv.listen(port, () => res(srv));
  });
}

export async function launch() {
  let pw;
  try {
    pw = await import('playwright');
  } catch {
    const req = createRequire(import.meta.url);
    const globalRoot = path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'playwright');
    pw = req(globalRoot);
  }
  return pw.chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
  });
}

export async function openScene(browser, url, w, h) {
  const page = await browser.newPage({ viewport: { width: Math.min(w, 1080), height: Math.min(h, 1920) } });
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text());
  });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(url);
  await page.waitForFunction('window.ready || window.initError', null, { timeout: 120000 });
  const err = await page.evaluate('window.initError');
  if (err) throw new Error(err);
  return page;
}

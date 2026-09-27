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

// Modo GPU (tarjeta gráfica real, p. ej. una RTX 3070): `--gpu` en la línea de comandos o RENDER_GPU=1.
// Sin él se usa SwiftShader (CPU), que funciona en cualquier máquina pero es mucho más lento.
// RENDER_ANGLE fuerza el backend de ANGLE (d3d11, vulkan, gl, metal…); por defecto, el de la plataforma.
export const GPU = process.argv.includes('--gpu') || process.env.RENDER_GPU === '1';

export async function launch() {
  let pw;
  try {
    pw = await import('playwright');
  } catch {
    const req = createRequire(import.meta.url);
    const globalRoot = path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'playwright');
    pw = req(globalRoot);
  }
  if (!GPU) {
    return pw.chromium.launch({
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
    });
  }
  const args = ['--ignore-gpu-blocklist', '--enable-gpu', '--enable-gpu-rasterization', '--disable-gpu-sandbox', '--force_high_performance_gpu'];
  if (process.env.RENDER_ANGLE) args.push('--use-gl=angle', `--use-angle=${process.env.RENDER_ANGLE}`);
  // el headless nuevo (channel "chromium") usa la GPU; el headless-shell por defecto no
  return pw.chromium.launch({ channel: 'chromium', args });
}

// Nombre de la GPU con la que Chromium renderiza WebGL (para confirmar que no ha caído a SwiftShader).
export async function gpuName(page) {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'sin WebGL2';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
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
  const gpu = await gpuName(page);
  if (!openScene.logged) console.log(`WebGL: ${gpu}`);
  openScene.logged = true;
  if (GPU && /swiftshader|llvmpipe|software/i.test(gpu)) throw new Error(`se pidió --gpu pero Chromium usa ${gpu}; prueba RENDER_ANGLE=d3d11 (Windows), vulkan o gl`);
  return page;
}

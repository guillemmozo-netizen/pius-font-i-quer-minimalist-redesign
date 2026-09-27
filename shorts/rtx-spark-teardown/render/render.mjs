// Render del vídeo: Chromium headless -> píxeles RGBA por WebSocket -> ffmpeg (intermedio sin pérdida).
// node render/render.mjs [--gpu] [--fps 60] [--scale 1] [--start 0] [--end 57] [--jobs 2] [--out build/video_rgb.mkv]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { WebSocketServer } from 'ws';
import { serve, launch, openScene, ROOT } from './lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const fps = +arg('fps', 60);
const scale = +arg('scale', 1);
const start = +arg('start', 0);
const end = +arg('end', 57);
const jobs = +arg('jobs', 2);
const out = path.resolve(ROOT, arg('out', 'build/video_rgb.mkv'));
const W = Math.round((1080 * scale) / 2) * 2;
const H = Math.round((1920 * scale) / 2) * 2;
const f0 = Math.round(start * fps);
const f1 = Math.round(end * fps); // exclusivo
const total = f1 - f0;
fs.mkdirSync(path.dirname(out), { recursive: true });

const srv = await serve(0);
const port = srv.address().port;
const t0 = Date.now();
let done = 0;

async function job(j, a, b) {
  const part = out.replace(/\.mkv$/, `.part${j}.mkv`);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', `${fps}`, '-i', '-', '-c:v', 'libx264rgb', '-preset', 'ultrafast', '-qp', '0', '-pix_fmt', 'rgb24', part], { stdio: ['pipe', 'inherit', 'inherit'] });
  const wss = new WebSocketServer({ port: 0 });
  await new Promise((r) => wss.on('listening', r));
  const wsPort = wss.address().port;
  let pending = Promise.resolve();
  wss.on('connection', (c) =>
    c.on('message', (m) => {
      const buf = Buffer.from(m);
      pending = pending.then(() => new Promise((r) => (ff.stdin.write(buf) ? r() : ff.stdin.once('drain', r))));
    })
  );
  const browser = await launch();
  const page = await openScene(browser, `http://localhost:${port}/index.html?w=${W}&h=${H}&ws=${wsPort}&view=${W}px`, W, H);
  for (let i = a; i < b; i++) {
    await page.evaluate(([i, fps]) => window.frame(i, fps), [i, fps]);
    done++;
    if (done % 60 === 0 || done === total) {
      const el = (Date.now() - t0) / 1000;
      console.log(`${done}/${total} fotogramas · ${(el / done).toFixed(2)} s/fot · ETA ${((total - done) * el / done / 60).toFixed(1)} min`);
    }
  }
  await pending;
  await browser.close();
  wss.close();
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  return part;
}

const per = Math.ceil(total / jobs);
const parts = await Promise.all(Array.from({ length: jobs }, (_, j) => job(j, f0 + j * per, Math.min(f1, f0 + (j + 1) * per))));
srv.close();
if (parts.length === 1) fs.renameSync(parts[0], out);
else {
  const list = out.replace(/\.mkv$/, '.txt');
  fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
  await new Promise((r) => spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out], { stdio: 'inherit' }).on('close', r));
  for (const p of parts) fs.unlinkSync(p);
  fs.unlinkSync(list);
}
console.log('listo:', out, `(${((Date.now() - t0) / 60000).toFixed(1)} min)`);

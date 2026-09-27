// Fotogramas sueltos para revisar: node render/still.mjs 0.5 4.2 12 ... [--scale 0.5] [--out dir]
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openScene, ROOT } from './lib.mjs';

const args = process.argv.slice(2);
let scale = 0.5;
let outDir = path.join(ROOT, 'build', 'stills');
const times = [];
let extra = '';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--scale') scale = +args[++i];
  else if (args[i] === '--out') outDir = args[++i];
  else if (args[i] === '--cam') extra += `&cam=${args[++i]}`;
  else times.push(+args[i]);
}
fs.mkdirSync(outDir, { recursive: true });
const w = Math.round(1080 * scale);
const h = Math.round(1920 * scale);
const srv = await serve(0);
const port = srv.address().port;
const browser = await launch();
const page = await openScene(browser, `http://localhost:${port}/index.html?w=${w}&h=${h}&view=${w}px${extra}`, w, h);
for (const t of times) {
  const t0 = Date.now();
  const data = await page.evaluate((t) => {
    window.renderAt(t);
    return document.querySelector('body > canvas:last-of-type').toDataURL('image/png');
  }, t);
  const f = path.join(outDir, `t${t.toFixed(2).padStart(6, '0')}.png`);
  fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
  console.log(f, Date.now() - t0, 'ms');
}
await browser.close();
srv.close();

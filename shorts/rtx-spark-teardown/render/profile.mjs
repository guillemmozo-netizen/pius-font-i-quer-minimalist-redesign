// Tiempo por fotograma a 1080x1920 con distintas opciones: node render/profile.mjs "&msaa=0"
import { serve, launch, openScene } from './lib.mjs';
const extra = process.argv[2] || '';
const srv = await serve(0);
const b = await launch();
const p = await openScene(b, `http://localhost:${srv.address().port}/index.html?w=1080&h=1920&view=1080px${extra}`, 1080, 1920);
const res = [];
for (const t of [6, 6.02, 18, 18.02, 27, 50, 50.02]) {
  const ms = await p.evaluate((t) => { const a = performance.now(); window.renderAt(t); document.querySelector('body > canvas:last-of-type').getContext('2d').getImageData(0, 0, 4, 4); return performance.now() - a; }, t);
  res.push(`${t}:${Math.round(ms)}`);
}
console.log(extra || 'default', res.join(' '));
await b.close(); srv.close();

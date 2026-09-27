// Cuenta vértices/triángulos del modelo: node render/stats.mjs
import { serve, launch, openScene } from './lib.mjs';
const srv = await serve(0);
const b = await launch();
const p = await openScene(b, `http://localhost:${srv.address().port}/index.html?w=540&h=960&view=540px`, 540, 960);
console.log(await p.evaluate(() => window.stats()));
await b.close();
srv.close();

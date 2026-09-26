// Vista previa interactiva: node render/serve.mjs  ->  http://localhost:8080/index.html?t=18&w=540&h=960
import { serve } from './lib.mjs';
const srv = await serve(+(process.argv[2] || 8080));
console.log(`http://localhost:${srv.address().port}/index.html?t=18&w=540&h=960`);

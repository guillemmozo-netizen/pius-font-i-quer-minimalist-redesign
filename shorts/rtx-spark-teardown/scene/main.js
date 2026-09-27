// Escena principal: render determinista por fotograma (sin reloj real) para captura a 60 fps.
import * as THREE from 'three';
import { buildLaptop, rrShape, rrPath, extrudeFlat, W as LW, D as LD, GREEN } from './laptop.js';
import { Post } from './post.js';
import { Timeline } from './timeline.js';
import { HUD } from './hud.js';
import { rng } from './util.js';

const Q = new URLSearchParams(location.search);
const OUT_W = +(Q.get('w') || 1080);
const OUT_H = +(Q.get('h') || 1920);
const SHADOWS = Q.get('shadows') !== '0';

async function loadFonts() {
  const base = '/node_modules/@fontsource';
  const list = [
    ['Saira', `${base}/saira/files/saira-latin-700-normal.woff2`, { weight: '700' }],
    ['Saira', `${base}/saira/files/saira-latin-800-normal.woff2`, { weight: '800' }],
    ['Saira', `${base}/saira/files/saira-latin-900-normal.woff2`, { weight: '900' }],
    ['Saira', `${base}/saira/files/saira-latin-800-italic.woff2`, { weight: '800', style: 'italic' }],
    ['Saira', `${base}/saira/files/saira-latin-900-italic.woff2`, { weight: '900', style: 'italic' }],
    ['Saira Condensed', `${base}/saira-condensed/files/saira-condensed-latin-800-normal.woff2`, { weight: '800' }],
    ['Rajdhani', `${base}/rajdhani/files/rajdhani-latin-500-normal.woff2`, { weight: '500' }],
    ['Rajdhani', `${base}/rajdhani/files/rajdhani-latin-600-normal.woff2`, { weight: '600' }],
    ['Rajdhani', `${base}/rajdhani/files/rajdhani-latin-700-normal.woff2`, { weight: '700' }],
  ];
  await Promise.all(
    list.map(async ([fam, url, desc]) => {
      const f = new FontFace(fam, `url(${url})`, desc);
      await f.load();
      document.fonts.add(f);
    })
  );
}

async function json(url, fallback = null) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return fallback;
    return await r.json();
  } catch {
    return fallback;
  }
}

// Reparte cada frase en bloques cortos y cada palabra en su instante (proporcional a su longitud)
function buildCaptions(lines, timing) {
  const out = [];
  for (const l of lines) {
    const tm = timing && timing[l.id];
    const start = tm ? tm.start : l.start;
    const end = tm ? tm.end : l.end;
    const words = l.caption.split(/\s+/).filter(Boolean);
    const chunks = [];
    let cur = [];
    let len = 0;
    for (const w of words) {
      if (len + w.length > 24 && cur.length) {
        chunks.push(cur);
        cur = [];
        len = 0;
      }
      cur.push(w);
      len += w.length + 1;
      if (/[.:…?]$/.test(w) && len > 10) {
        chunks.push(cur);
        cur = [];
        len = 0;
      }
    }
    if (cur.length) chunks.push(cur);
    const weight = (w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 2;
    const total = words.reduce((a, w) => a + weight(w), 0);
    let acc = 0;
    const dur = end - start;
    const cap = { id: l.id, start, end, chunks: [] };
    for (const ch of chunks) {
      const ck = { words: [], start: start + (acc / total) * dur };
      for (const w of ch) {
        ck.words.push({ text: w, start: start + (acc / total) * dur });
        acc += weight(w);
      }
      ck.end = start + (acc / total) * dur;
      cap.chunks.push(ck);
    }
    out.push(cap);
  }
  return out;
}

function makeEnv(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24), new THREE.MeshBasicMaterial({ color: 0x030304, side: THREE.BackSide })));
  const panel = (w, h, color, k, pos) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide })
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  panel(10, 5, 0xffffff, 4.5, [0, 10, 1]);
  panel(1.4, 12, 0xffffff, 3.2, [-10, 2, 5]);
  panel(1.2, 12, 0x76b900, 0.45, [10, 1, -4]);
  panel(8, 1.2, 0xcfe0ff, 1.6, [0, 1.5, -10]);
  panel(12, 1.8, 0xffffff, 2.6, [2, -2, 10]);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.035).texture;
  pm.dispose();
  return tex;
}

function makeBackground() {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir; uniform float uTime;
      void main(){
        vec3 d = normalize(vDir);
        vec3 col = vec3(0.004,0.005,0.006);
        float g1 = pow(max(dot(d, normalize(vec3(-0.45,0.3,-0.85))),0.0), 5.0);
        float g2 = pow(max(dot(d, normalize(vec3(0.8,-0.15,-0.6))),0.0), 9.0);
        float g3 = pow(max(dot(d, normalize(vec3(0.2,0.9,0.4))),0.0), 3.0);
        col += vec3(0.006,0.018,0.0)*pow(g1,1.6)*(0.9+0.1*sin(uTime*0.8));
        col += vec3(0.008,0.012,0.02)*g2;
        col += vec3(0.004)*g3;
        gl_FragColor = vec4(col,1.0);
      }`,
  });
  const bg = new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), m);
  bg.renderOrder = -10;
  bg.frustumCulled = false;
  return bg;
}

function makeDust() {
  const R = rng(99);
  const n = 420;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (R() - 0.5) * 16;
    pos[i * 3 + 1] = -3 + R() * 13;
    pos[i * 3 + 2] = (R() - 0.5) * 16;
    seed[i] = R();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: OUT_H / 1920 } },
    vertexShader: `
      attribute float seed; uniform float uTime, uScale; varying float vA;
      void main(){
        vec3 p = position;
        p.y += mod(uTime*0.08*(0.5+seed) + seed*10.0, 13.0) - 6.5 + 3.5;
        p.x += sin(uTime*0.3 + seed*30.0)*0.25;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min((1.5 + seed*3.0) * (40.0 / -mv.z), 7.0) * uScale;
        vA = 0.25 + 0.5*seed;
      }`,
    fragmentShader: `
      varying float vA;
      void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d)*vA; gl_FragColor = vec4(vec3(0.6,0.8,0.45)*a*0.35, 1.0); }`,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}

function makeSeams() {
  const mats = [];
  const group = new THREE.Group();
  for (const y of [0.074, 0.1, 0.118, 0.131]) {
    const s = rrShape(LW + 0.012, LD + 0.012, 0.146);
    s.holes.push(rrPath(LW - 0.004, LD - 0.004, 0.138));
    const m = new THREE.MeshBasicMaterial({ color: GREEN.clone().multiplyScalar(9), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    group.add(new THREE.Mesh(extrudeFlat(s, 0.003, 0), m));
    group.children[group.children.length - 1].position.y = y;
    mats.push(m);
  }
  return { group, mats };
}

async function init() {
  await loadFonts();
  const cues = await json('/cues.json');
  const linesCfg = await json('/tts/lines.json');
  const timing = await json('/build/captions.json', null);
  const captions = buildCaptions(linesCfg.lines, timing);

  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(OUT_W, OUT_H, false);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = SHADOWS;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.environment = makeEnv(renderer);
  scene.environmentIntensity = 1.0;
  const bg = makeBackground();
  scene.add(bg);
  const dust = makeDust();
  scene.add(dust);

  const camera = new THREE.PerspectiveCamera(32, OUT_W / OUT_H, 0.05, 200);

  // luces: clave blanca, contras verde y fría, relleno suave
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3.5, 11, 5);
  key.castShadow = SHADOWS;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 4;
  scene.add(key);
  const target = new THREE.Object3D();
  target.position.set(0, 2.5, 0);
  scene.add(target);
  key.target = target;
  const rimG = new THREE.DirectionalLight(new THREE.Color(0.45, 1.0, 0.1), 1.1);
  rimG.position.set(-7, 0.3, -6);
  scene.add(rimG);
  const rimC = new THREE.DirectionalLight(new THREE.Color(0.7, 0.85, 1.0), 1.4);
  rimC.position.set(7, 2.5, -5);
  scene.add(rimC);
  scene.add(new THREE.HemisphereLight(0x9fb3c8, 0x050505, 0.25));
  const sweepLight = new THREE.PointLight(0xffffff, 0, 6, 1.6);
  scene.add(sweepLight);

  const laptop = buildLaptop();
  scene.add(laptop.root);
  laptop.root.traverse((o) => {
    const m0 = Array.isArray(o.material) ? o.material[0] : o.material;
    if (o.isMesh && !(m0 && (m0.isMeshBasicMaterial || m0.isShaderMaterial))) {
      // las piezas diminutas instanciadas no proyectan sombra (coste), pero sí la reciben
      o.castShadow = SHADOWS && !o.userData.noShadow;
      o.receiveShadow = SHADOWS;
    }
  });
  if (Q.get('cc') === '0')
    laptop.root.traverse((o) => {
      if (o.material && o.material.isMeshPhysicalMaterial) {
        o.material.clearcoat = 0;
        o.material.iridescence = 0;
      }
    });
  const seams = makeSeams();
  laptop.root.add(seams.group);

  const post = new Post(renderer, OUT_W, OUT_H, +(Q.get('msaa') ?? 4));
  const tl = new Timeline(cues, laptop, camera, post, { sweepLight, seams: seams.mats, bg, dust });

  const out = document.createElement('canvas');
  out.width = OUT_W;
  out.height = OUT_H;
  out.style.width = Q.get('view') || `${Math.min(100, (window.innerHeight / OUT_H) * 100)}%`;
  document.body.appendChild(out);
  const ctx = out.getContext('2d', { willReadFrequently: true });
  const hud = new HUD(out, camera, laptop, captions);
  hud.L_slams = cues.slams;

  const renderAt = (t) => {
    const S = tl.apply(t);
    if (Q.get('cam')) {
      // depuración: ?cam=az,el,dist,tx,ty,tz
      const [az, el, dist, tx, ty, tz] = Q.get('cam').split(',').map(Number);
      const a = (az * Math.PI) / 180;
      const e = (el * Math.PI) / 180;
      camera.position.set(tx + dist * Math.cos(e) * Math.sin(a), ty + dist * Math.sin(e), tz + dist * Math.cos(e) * Math.cos(a));
      camera.fov = 32;
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
      camera.lookAt(tx, ty, tz);
    }
    bg.position.copy(camera.position);
    laptop.root.updateMatrixWorld(true);
    post.render(scene, camera);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(renderer.domElement, 0, 0);
    hud.draw(t, S);
  };

  let ws = null;
  if (Q.get('ws')) {
    ws = new WebSocket(`ws://localhost:${Q.get('ws')}`);
    ws.binaryType = 'arraybuffer';
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });
  }

  window.renderAt = (t) => {
    renderAt(t);
    return true;
  };
  window.frame = async (i, fps) => {
    renderAt(i / fps);
    const data = ctx.getImageData(0, 0, OUT_W, OUT_H).data;
    ws.send(data);
    while (ws.bufferedAmount > 0) await new Promise((r) => setTimeout(r, 1));
    return true;
  };
  window.duration = cues.duration;
  window.stats = () => {
    let v = 0;
    let t = 0;
    laptop.root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const n = o.isInstancedMesh ? o.count : 1;
      const g = o.geometry;
      v += g.attributes.position.count * n;
      t += ((g.index ? g.index.count : g.attributes.position.count) / 3) * n;
    });
    return { vertices: v, triangles: Math.round(t) };
  };

  if (Q.get('t')) renderAt(+Q.get('t'));
  window.ready = true;
}

init().catch((e) => {
  console.error(e);
  window.initError = String(e && e.stack ? e.stack : e);
});

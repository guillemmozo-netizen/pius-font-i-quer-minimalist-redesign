// Geometría y texturas procedurales de alto detalle (nivel "render de promo").
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './util.js';

// ------------------------------------------------------------------ contornos
// Rectángulo redondeado muestreado con normales hacia fuera (plano XZ, en sentido antihorario visto desde +Y).
export function roundedRectOutline(w, d, r, cornerSeg = 12, edgeSeg = 2) {
  const pts = [];
  const hw = w / 2 - r;
  const hd = d / 2 - r;
  // cada esquina barre [a0, a0+90º]; entre esquinas, tramo recto con la normal del final de la esquina
  const corners = [
    [hw, hd, 0],
    [-hw, hd, Math.PI / 2],
    [-hw, -hd, Math.PI],
    [hw, -hd, (3 * Math.PI) / 2],
  ];
  for (let c = 0; c < 4; c++) {
    const [cx, cz, a0] = corners[c];
    for (let i = 0; i < cornerSeg; i++) {
      const a = a0 + (Math.PI / 2) * (i / cornerSeg);
      const nx = Math.cos(a);
      const nz = Math.sin(a);
      pts.push({ x: cx + nx * r, z: cz + nz * r, nx, nz });
    }
    // tramo recto hasta la siguiente esquina
    const [nxc, nzc, na0] = corners[(c + 1) % 4];
    const aEnd = a0 + Math.PI / 2;
    const ex = Math.cos(aEnd);
    const ez = Math.sin(aEnd);
    const sx = cx + ex * r;
    const sz = cz + ez * r;
    const tx = nxc + Math.cos(na0) * r;
    const tz = nzc + Math.sin(na0) * r;
    for (let i = 0; i < edgeSeg; i++) {
      const t = i / edgeSeg;
      pts.push({ x: sx + (tx - sx) * t, z: sz + (tz - sz) * t, nx: ex, nz: ez });
    }
  }
  return pts;
}

// Barrido de un perfil a lo largo de un contorno cerrado.
// profile: [{o, y, s=1, m=0, flat=false}] -> posición = (p + n*o)*s, altura y.
// m = índice de material del tramo que empieza en ese punto; flat = UV planas (x,z) en vez de (contorno, perfil).
export function ringSweep(outline, profile, { uvScale = [1, 1], planar = [1, 1], refFace = null, flipCheck = true } = {}) {
  const M = outline.length;
  const P = profile.length;
  const pos = new Float32Array(M * P * 3);
  const uv = new Float32Array(M * P * 2);
  // longitud acumulada del contorno para la coordenada u
  const len = [0];
  for (let i = 1; i <= M; i++) {
    const a = outline[i - 1];
    const b = outline[i % M];
    len.push(len[i - 1] + Math.hypot(b.x - a.x, b.z - a.z));
  }
  const L = len[M];
  const plen = [0];
  for (let j = 1; j < P; j++) plen.push(plen[j - 1] + Math.hypot(profile[j].o - profile[j - 1].o, profile[j].y - profile[j - 1].y) + Math.abs((profile[j].s ?? 1) - (profile[j - 1].s ?? 1)) * 0.2);
  for (let j = 0; j < P; j++) {
    const pr = profile[j];
    const s = pr.s ?? 1;
    for (let i = 0; i < M; i++) {
      const p = outline[i];
      const x = (p.x + p.nx * pr.o) * s;
      const z = (p.z + p.nz * pr.o) * s;
      const k = (j * M + i) * 3;
      pos[k] = x;
      pos[k + 1] = pr.y;
      pos[k + 2] = z;
      const q = (j * M + i) * 2;
      if (pr.flat) {
        uv[q] = x / planar[0] + 0.5;
        uv[q + 1] = z / planar[1] + 0.5;
      } else {
        uv[q] = (len[i] / L) * uvScale[0];
        uv[q + 1] = plen[j] * uvScale[1];
      }
    }
  }
  const groups = new Map();
  for (let j = 0; j < P - 1; j++) {
    const m = profile[j].m ?? 0;
    if (!groups.has(m)) groups.set(m, []);
    const arr = groups.get(m);
    for (let i = 0; i < M; i++) {
      const i1 = (i + 1) % M;
      const a = j * M + i;
      const b = j * M + i1;
      const c = (j + 1) * M + i;
      const d = (j + 1) * M + i1;
      arr.push(a, c, b, b, c, d);
    }
  }
  const idx = [];
  const g = new THREE.BufferGeometry();
  let start = 0;
  for (const [m, arr] of [...groups.entries()].sort((x, y) => x[0] - y[0])) {
    for (const v of arr) idx.push(v);
    g.addGroup(start, arr.length, m);
    start += arr.length;
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  // orientación: la cara de referencia debe apuntar hacia fuera (+n) o hacia arriba/abajo
  if (flipCheck && refFace) {
    const { j, dir } = refFace; // dir: 'out' | 'up' | 'down'
    const i = 0;
    const a = new THREE.Vector3().fromArray(pos, (j * M + i) * 3);
    const b = new THREE.Vector3().fromArray(pos, (j * M + ((i + 1) % M)) * 3);
    const c = new THREE.Vector3().fromArray(pos, ((j + 1) * M + i) * 3);
    const n = new THREE.Vector3().subVectors(c, a).cross(new THREE.Vector3().subVectors(b, a));
    const want = dir === 'out' ? new THREE.Vector3(outline[0].nx, 0, outline[0].nz) : new THREE.Vector3(0, dir === 'up' ? 1 : -1, 0);
    if (n.dot(want) < 0) {
      const ix = g.index.array;
      for (let t = 0; t < ix.length; t += 3) {
        const tmp = ix[t + 1];
        ix[t + 1] = ix[t + 2];
        ix[t + 2] = tmp;
      }
    }
  }
  g.computeVertexNormals();
  return g;
}

// puntos de un arco en el plano (o, y)
export function arc(co, cy, r, a0, a1, n, extra = {}) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push({ o: co + Math.cos(a) * r, y: cy + Math.sin(a) * r, ...extra });
  }
  return out;
}

// anillos concéntricos planos (tapas)
export function plateRings(o, y, steps = [1, 0.94, 0.8, 0.55, 0.25, 0], extra = {}) {
  return steps.map((s) => ({ o, y, s, flat: true, ...extra }));
}

// ------------------------------------------------------------------ piezas
// Tecla esculpida: laterales con ligera conicidad, arista redondeada y cuenco cilíndrico arriba.
export function keycapGeometry(w, d, h = 0.016, r = 0.02) {
  const out = roundedRectOutline(w, d, Math.min(r, w / 2 - 0.002, d / 2 - 0.002), 6, 2);
  const taper = 0.004;
  const fr = 0.004;
  const prof = [
    { o: taper, y: 0 },
    { o: taper * 0.5, y: h * 0.5 },
    ...arc(-fr, h - fr, fr, 0, Math.PI / 2, 4),
  ];
  // cuenco: anillos interiores bajando hacia el centro
  const dish = 0.0016;
  const steps = [0.94, 0.8, 0.62, 0.42, 0.22, 0];
  for (const s of steps) prof.push({ o: -fr, y: h - dish * (1 - s * s), s, flat: true });
  return ringSweep(out, prof, { planar: [w, d], refFace: { j: 0, dir: 'out' } });
}

// Carcasa tipo "tapa/base" con filete superior e inferior y canto diamantado (grupo 1)
export function shellGeometry(w, d, r, { h, rb, rt, chamfer = 0.0035, t = 0.012, floorY = null, underside = true, inner = true, topPlate = false, cornerSeg = 20 }) {
  const out = roundedRectOutline(w, d, r, cornerSeg, 3);
  const prof = [];
  if (underside) prof.push(...plateRings(-rb, 0, [0, 0.3, 0.62, 0.88, 1], { m: 0 }));
  const fil = arc(-rb, rb, rb, -Math.PI / 2, 0, 8, { m: 0 });
  prof.push(...(underside ? fil.slice(1) : fil));
  const wallIdx = prof.length - 1; // tramo vertical exterior: de aquí al siguiente punto
  prof.push({ o: 0, y: h - rt - chamfer, m: 1 });
  // canto diamantado a 45º
  prof.push({ o: -chamfer, y: h - rt, m: 0 });
  if (topPlate) {
    prof.push(...arc(-chamfer - rt, h - rt, rt, 0, Math.PI / 2, 5, { m: 0 }).slice(1));
    prof.push(...plateRings(-chamfer - rt, h, [1, 0.9, 0.7, 0.45, 0.2, 0], { m: 0 }).slice(1));
  } else {
    prof.push(...arc(-chamfer - rt, h - rt, rt, 0, Math.PI / 2, 4, { m: 0 }).slice(1));
    if (inner) {
      prof.push({ o: -t + 0.002, y: h, m: 2 });
      prof.push(...arc(-t + 0.002, h - 0.002, 0.002, Math.PI / 2, Math.PI, 2, { m: 2 }).slice(1));
      prof.push({ o: -t, y: (floorY ?? t) + 0.003, m: 2 });
      prof.push(...arc(-t - 0.003, (floorY ?? t) + 0.003, 0.003, 0, -Math.PI / 2, 3, { m: 2 }).slice(1));
      prof.push(...plateRings(-t - 0.003, floorY ?? t, [1, 0.9, 0.7, 0.45, 0.2, 0], { m: 2 }).slice(1));
    }
  }
  return ringSweep(out, prof, { planar: [w, d], refFace: { j: wallIdx, dir: 'out' } });
}

// Álabe curvo (ventilador centrífugo) extruido en altura
export function bladeGeometry(r0, r1, height, sweep = 0.7, thick = 0.0035) {
  const n = 18;
  const center = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = r0 + (r1 - r0) * t;
    const a = sweep * Math.pow(t, 1.4);
    center.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const left = [];
  const right = [];
  for (let i = 0; i <= n; i++) {
    const p = center[i];
    const q = center[Math.min(n, i + 1)];
    const pp = center[Math.max(0, i - 1)];
    const tx = q[0] - pp[0];
    const ty = q[1] - pp[1];
    const l = Math.hypot(tx, ty) || 1;
    const th = thick * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, (i / n) * 1.15)));
    left.push([p[0] - (ty / l) * th, p[1] + (tx / l) * th]);
    right.push([p[0] + (ty / l) * th, p[1] - (tx / l) * th]);
  }
  const s = new THREE.Shape();
  s.moveTo(left[0][0], left[0][1]);
  for (const p of left.slice(1)) s.lineTo(p[0], p[1]);
  for (const p of right.reverse()) s.lineTo(p[0], p[1]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0006, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -height / 2, 0);
  return g;
}

// Carcasa en espiral (voluta) del ventilador: pared, base y tapa con boca de aspiración.
// Devuelve { wall, base, cover } ya tumbadas (altura en +Y); la salida queda hacia -Z.
export function voluteGeometries(r, h, grow = 0.07, wall = 0.007, inlet = 0.82) {
  const n = 120;
  const a0 = Math.PI / 2 + 0.42;
  const span = Math.PI * 2 - 0.84;
  const outerPts = [];
  const innerPts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 + span * t;
    const rr = r + 0.014 + grow * t;
    outerPts.push(new THREE.Vector2(Math.cos(a) * (rr + wall), Math.sin(a) * (rr + wall)));
    innerPts.push(new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr));
  }
  const band = new THREE.Shape([...outerPts, ...innerPts.slice().reverse()]);
  const wallG = new THREE.ExtrudeGeometry(band, { depth: h, bevelEnabled: false, curveSegments: 2 });
  wallG.rotateX(-Math.PI / 2);
  const baseShape = new THREE.Shape(outerPts);
  const baseG = new THREE.ExtrudeGeometry(baseShape, { depth: 0.0025, bevelEnabled: false });
  baseG.rotateX(-Math.PI / 2);
  const coverShape = new THREE.Shape(outerPts);
  const hole = new THREE.Path();
  hole.absarc(0, 0, r * inlet, 0, Math.PI * 2, true);
  coverShape.holes.push(hole);
  const coverG = new THREE.ExtrudeGeometry(coverShape, { depth: 0.0018, bevelEnabled: false, curveSegments: 48 });
  coverG.rotateX(-Math.PI / 2);
  coverG.translate(0, h, 0);
  return { wall: wallG, base: baseG, cover: coverG };
}

// Tornillo de cabeza redondeada con hueco Torx
export function screwHeadGeometry(r = 0.012, h = 0.005) {
  const prof = [];
  const n = 10;
  prof.push(new THREE.Vector2(0.0001, 0));
  prof.push(new THREE.Vector2(r, 0));
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    prof.push(new THREE.Vector2(r * 0.72 + Math.cos(a) * r * 0.28, h * 0.45 + Math.sin(a) * h * 0.55));
  }
  prof.push(new THREE.Vector2(0.0001, h));
  return new THREE.LatheGeometry(prof, 28);
}
export function torxGeometry(r = 0.005, depth = 0.001) {
  const s = new THREE.Shape();
  const n = 6;
  for (let i = 0; i <= n * 8; i++) {
    const a = (i / (n * 8)) * Math.PI * 2;
    const k = 0.72 + 0.28 * Math.cos(a * n);
    const x = Math.cos(a) * r * k;
    const y = Math.sin(a) * r * k;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  g.translate(0, depth, 0);
  return g;
}

// Muelle helicoidal
export function springGeometry(radius = 0.012, height = 0.03, turns = 6, wire = 0.0016) {
  const pts = [];
  const n = turns * 24;
  for (let i = 0; i <= n; i++) {
    const a = (i / 24) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, (i / n) * height, Math.sin(a) * radius));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, wire, 8, false);
}

// Aleta de disipador con pestañas dobladas arriba y abajo
export function finGeometry(h = 0.04, d = 0.22, t = 0.0012, tab = 0.009) {
  const a = new THREE.BoxGeometry(t, h, d);
  const top = new THREE.BoxGeometry(tab, t, d);
  top.translate(tab / 2, h / 2, 0);
  const bot = new THREE.BoxGeometry(tab, t, d);
  bot.translate(tab / 2, -h / 2, 0);
  // pequeños resaltes (dimples) para rigidez
  const parts = [a, top, bot];
  for (let i = 0; i < 3; i++) {
    const dm = new THREE.SphereGeometry(0.0022, 8, 6);
    dm.scale(0.5, 1, 1);
    dm.translate(t * 0.4, 0, -d * 0.35 + i * d * 0.35);
    parts.push(dm);
  }
  return mergeGeometries(parts.map((g) => g.toNonIndexed()));
}

// Ranura con extremos redondeados (USB-C, rejillas)
export function stadiumShape(w, h) {
  const r = h / 2;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -r);
  s.lineTo(w / 2 - r, -r);
  s.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-w / 2 + r, r);
  s.absarc(-w / 2 + r, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  return s;
}

// Caja redondeada ligera (cantos biselados, pocos vértices) para componentes pequeños
export function chamferBox(w, h, d, c) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape().moveTo(-w / 2 + c, -d / 2).lineTo(w / 2 - c, -d / 2).lineTo(w / 2, -d / 2 + c).lineTo(w / 2, d / 2 - c).lineTo(w / 2 - c, d / 2).lineTo(-w / 2 + c, d / 2).lineTo(-w / 2, d / 2 - c).lineTo(-w / 2, -d / 2 + c).closePath(), {
    depth: h - 2 * c,
    bevelEnabled: true,
    bevelThickness: c,
    bevelSize: 0,
    bevelSegments: 1,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -h / 2 + c, 0);
  return g;
}

// ------------------------------------------------------------------ texturas
export function canvasTexture(w, h, draw, { srgb = true, repeat = null } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// Convierte un mapa de alturas (canal R de un canvas) en mapa de normales
export function heightToNormal(srcCanvas, strength = 2, repeat = null) {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const src = srcCanvas.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const k = (y * w + x) * 4;
      img.data[k] = ((-dx / l) * 0.5 + 0.5) * 255;
      img.data[k + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      img.data[k + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      img.data[k + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 16;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

function heightCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  draw(g, w, h);
  return c;
}

// Aluminio anodizado microgranallado: ruido fino (normal) + variación de rugosidad
export function beadBlastMaps(seed = 1, size = 512, repeat = [6, 6]) {
  const R = rng(seed);
  const hc = heightCanvas(size, size, (g, w, h) => {
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < w * h; i++) {
      const v = 128 + (R() - 0.5) * 70;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    }
    g.putImageData(img, 0, 0);
    g.filter = 'blur(0.6px)';
    g.drawImage(g.canvas, 0, 0);
  });
  const normal = heightToNormal(hc, 1.6, repeat);
  const rough = canvasTexture(size, size, (g, w, h) => {
    g.drawImage(hc, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgb(200,200,200)';
    g.fillRect(0, 0, w, h);
  }, { srgb: false, repeat });
  return { normal, rough };
}

// Mecanizado CNC (fresado en arcos, "fly-cut") para el interior de la carcasa y el cobre
export function flyCutMaps(seed = 2, size = 1024, repeat = [1, 1], spacing = 7) {
  const R = rng(seed);
  const hc = heightCanvas(size, size, (g, w, h) => {
    g.lineWidth = 1.4;
    for (let y = -h; y < h * 2; y += spacing) {
      const v = 110 + R() * 40;
      g.strokeStyle = `rgb(${v},${v},${v})`;
      g.beginPath();
      g.arc(w * 0.5, y - h * 1.2, h * 1.2 + h * 0.2, 0.2 * Math.PI, 0.8 * Math.PI);
      g.stroke();
    }
  });
  return {
    normal: heightToNormal(hc, 3.0, repeat),
    rough: canvasTexture(size, size, (g) => g.drawImage(hc, 0, 0), { srgb: false, repeat }),
  };
}

// Placa base: pistas, pads, vías, serigrafía; devuelve color + normales + rugosidad
export function pcbMaps(seed = 7, W = 4096, H = 1536) {
  const R = rng(seed);
  const color = document.createElement('canvas');
  color.width = W;
  color.height = H;
  const g = color.getContext('2d');
  const hc = heightCanvas(W, H, () => {});
  const hg = hc.getContext('2d');
  g.fillStyle = '#0a0f0d';
  g.fillRect(0, 0, W, H);
  hg.fillStyle = '#707070';
  hg.fillRect(0, 0, W, H);
  // planos de cobre bajo la máscara
  for (let i = 0; i < 60; i++) {
    const x = R() * W;
    const y = R() * H;
    const w = 80 + R() * 500;
    const h = 60 + R() * 300;
    g.fillStyle = 'rgba(28,44,38,0.55)';
    g.fillRect(x, y, w, h);
    hg.fillStyle = '#7a7a7a';
    hg.fillRect(x, y, w, h);
  }
  // pistas a 45/90º en haces paralelos
  for (let b = 0; b < 520; b++) {
    let x = R() * W;
    let y = R() * H;
    const lanes = 1 + Math.floor(R() * 7);
    const segs = [];
    const n = 2 + Math.floor(R() * 4);
    let dir = Math.floor(R() * 8);
    for (let k = 0; k < n; k++) {
      const len = 30 + R() * 260;
      dir = (dir + (R() < 0.5 ? 1 : -1) + 8) % 8;
      if (dir % 2 === 1 && R() < 0.5) dir = (dir + 1) % 8;
      segs.push([dir, len]);
    }
    const wdt = R() < 0.8 ? 2.2 : 5;
    for (let l = 0; l < lanes; l++) {
      let px = x + l * 7;
      let py = y + l * 7;
      g.beginPath();
      hg.beginPath();
      g.moveTo(px, py);
      hg.moveTo(px, py);
      for (const [d, len] of segs) {
        const a = (d * Math.PI) / 4;
        px += Math.cos(a) * len;
        py += Math.sin(a) * len;
        g.lineTo(px, py);
        hg.lineTo(px, py);
      }
      g.strokeStyle = 'rgba(58,86,74,0.8)';
      g.lineWidth = wdt;
      g.stroke();
      hg.strokeStyle = '#b0b0b0';
      hg.lineWidth = wdt;
      hg.stroke();
      // vía al final
      g.fillStyle = 'rgba(190,160,90,0.9)';
      g.beginPath();
      g.arc(px, py, wdt * 1.6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#0a0f0d';
      g.beginPath();
      g.arc(px, py, wdt * 0.7, 0, Math.PI * 2);
      g.fill();
    }
  }
  // vías sueltas
  for (let i = 0; i < 5000; i++) {
    const x = R() * W;
    const y = R() * H;
    const r = 2 + R() * 2.5;
    g.fillStyle = 'rgba(170,140,80,0.9)';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    hg.fillStyle = '#c0c0c0';
    hg.beginPath();
    hg.arc(x, y, r, 0, Math.PI * 2);
    hg.fill();
  }
  // serigrafía de referencias
  g.font = '600 18px Rajdhani, sans-serif';
  for (let i = 0; i < 700; i++) {
    const x = R() * W;
    const y = R() * H;
    const pre = ['C', 'R', 'U', 'L', 'Q', 'J', 'TP', 'D'][Math.floor(R() * 8)];
    g.fillStyle = 'rgba(220,225,215,0.55)';
    g.fillText(pre + Math.floor(R() * 900 + 1), x, y);
    if (R() < 0.3) {
      g.strokeStyle = 'rgba(220,225,215,0.45)';
      g.lineWidth = 1.5;
      g.strokeRect(x - 4, y - 26, 40 + R() * 60, 20 + R() * 40);
    }
  }
  // fiduciales
  for (let i = 0; i < 8; i++) {
    const x = 60 + R() * (W - 120);
    const y = 60 + R() * (H - 120);
    g.fillStyle = '#c8ccd0';
    g.beginPath();
    g.arc(x, y, 10, 0, Math.PI * 2);
    g.fill();
  }
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 16;
  return { map, normal: heightToNormal(hc, 1.2) };
}

// Fotografía de die (GPU): 8x6 SM + caché L2 central + controladores en los bordes
export function gpuDieTexture(size = 1024) {
  const R = rng(11);
  return canvasTexture(size, size, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#1b2233');
    grd.addColorStop(0.5, '#23202e');
    grd.addColorStop(1, '#152a2a');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    const N = [8, 6];
    for (let cy = 0; cy < N[1]; cy++)
      for (let cx = 0; cx < N[0]; cx++) {
        const x0 = (cx / N[0]) * w + w * 0.008;
        const y0 = (cy / N[1]) * h + h * 0.012;
        const cw = w / N[0] - w * 0.016;
        const ch = h / N[1] - h * 0.024;
        const hue = 180 + R() * 80;
        g.fillStyle = `hsla(${hue},35%,26%,1)`;
        g.fillRect(x0, y0, cw, ch);
        // 4 particiones por SM + tensor cores + caché L1
        for (let p = 0; p < 4; p++) {
          const px = x0 + (p % 2) * cw * 0.5 + 2;
          const py = y0 + Math.floor(p / 2) * ch * 0.38 + 2;
          g.fillStyle = `hsla(${hue + 20},40%,34%,1)`;
          g.fillRect(px, py, cw * 0.5 - 4, ch * 0.38 - 4);
          for (let k = 0; k < 14; k++) {
            g.fillStyle = `hsla(${hue + R() * 60},45%,${30 + R() * 18}%,0.9)`;
            g.fillRect(px + 3 + (k % 7) * ((cw * 0.5 - 10) / 7), py + 3 + Math.floor(k / 7) * ((ch * 0.38 - 10) / 2), (cw * 0.5 - 14) / 7, (ch * 0.38 - 12) / 2);
          }
        }
        g.fillStyle = `hsla(${hue - 30},30%,22%,1)`;
        g.fillRect(x0 + 2, y0 + ch * 0.78, cw - 4, ch * 0.2);
        for (let k = 0; k < 20; k++) {
          g.fillStyle = 'rgba(255,255,255,0.05)';
          g.fillRect(x0 + 2 + k * (cw / 20), y0 + ch * 0.8, 1, ch * 0.16);
        }
      }
    // caché L2 (franja central) y PHY en los bordes
    g.fillStyle = 'rgba(90,70,120,0.55)';
    g.fillRect(0, h * 0.495 - 6, w, 12);
    g.fillStyle = 'rgba(160,140,90,0.5)';
    for (let i = 0; i < 64; i++) {
      g.fillRect((i / 64) * w + 2, 0, w / 64 - 4, 6);
      g.fillRect((i / 64) * w + 2, h - 6, w / 64 - 4, 6);
    }
  });
}

// Die de la CPU: 10 núcleos grandes arriba + 10 pequeños abajo (mismo reparto que el shader de brillo)
export function cpuDieTexture(size = 1024) {
  const R = rng(13);
  return canvasTexture(size, size, (g, w, h) => {
    g.fillStyle = '#1d1b27';
    g.fillRect(0, 0, w, h);
    const cell = (x0, y0, cw, ch, hue) => {
      g.fillStyle = `hsla(${hue},30%,28%,1)`;
      g.fillRect(x0, y0, cw, ch);
      g.fillStyle = `hsla(${hue + 30},40%,40%,1)`;
      g.fillRect(x0 + cw * 0.08, y0 + ch * 0.1, cw * 0.4, ch * 0.5);
      for (let k = 0; k < 10; k++) {
        g.fillStyle = `hsla(${hue + R() * 50},35%,${25 + R() * 20}%,1)`;
        g.fillRect(x0 + cw * 0.55 + (k % 2) * cw * 0.2, y0 + ch * 0.1 + Math.floor(k / 2) * ch * 0.16, cw * 0.18, ch * 0.13);
      }
      g.fillStyle = 'rgba(140,120,80,0.5)';
      g.fillRect(x0 + cw * 0.08, y0 + ch * 0.68, cw * 0.84, ch * 0.22);
    };
    for (let i = 0; i < 10; i++) cell((i % 5) * (w / 5) + 4, h * 0.42 + Math.floor(i / 5) * (h * 0.29) + 4, w / 5 - 8, h * 0.29 - 8, 20 + R() * 40);
    for (let i = 0; i < 10; i++) cell((i % 5) * (w / 5) + 4, Math.floor(i / 5) * (h * 0.2) + 4, w / 5 - 8, h * 0.2 - 8, 200 + R() * 40);
  });
}

// Atlas de leyendas del teclado (8x8 celdas): blanco sobre transparente
export function legendAtlas(labels, size = 2048) {
  const n = 8;
  const cs = size / n;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  labels.forEach((lab, i) => {
    const x = (i % n) * cs + cs / 2;
    const y = Math.floor(i / n) * cs + cs / 2;
    const big = lab.length === 1 ? 0.42 : lab.length <= 3 ? 0.26 : 0.19;
    g.font = `600 ${Math.round(cs * big)}px Rajdhani, sans-serif`;
    g.fillText(lab, x, y);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

// Etiqueta impresa (componentes, batería, SSD)
export function printedLabel(lines, { w = 512, h = 256, bg = '#141518', fg = '#d8dce2', accent = '#76b900', font = 'Rajdhani', border = false } = {}) {
  return canvasTexture(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (border) {
      g.strokeStyle = 'rgba(255,255,255,0.25)';
      g.lineWidth = 3;
      g.strokeRect(8, 8, w - 16, h - 16);
    }
    let y = h * 0.2;
    lines.forEach((ln, i) => {
      const size = i === 0 ? h * 0.2 : h * 0.1;
      g.font = `${i === 0 ? 700 : 500} ${Math.round(size)}px ${font}, sans-serif`;
      g.fillStyle = i === 0 ? fg : 'rgba(200,205,210,0.7)';
      g.fillText(ln, w * 0.06, y + size * 0.5);
      y += size * 1.35;
    });
    if (accent) {
      g.fillStyle = accent;
      g.fillRect(w - w * 0.14, h * 0.1, w * 0.08, h * 0.04);
    }
  });
}

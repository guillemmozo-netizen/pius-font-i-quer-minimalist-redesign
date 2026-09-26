// Portátil fino de 16" con superchip NVIDIA RTX Spark (N1X), procedural y sin logotipos.
// Recreación ilustrativa: la disposición interna real de cada fabricante puede variar.
// Unidades: 1 = 10 cm. X = ancho, Z = fondo (+Z hacia el usuario), Y = arriba.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from './util.js';

export const W = 3.56;
export const D = 2.48;
const HW = W / 2;
const HD = D / 2;
export const HINGE_Y = 0.118;

// separación vertical de cada capa en la vista explosionada
export const LAYERS = {
  tray: { ex: 0.0 },
  battery: { ex: 0.72 },
  board: { ex: 1.78 },
  cooling: { ex: 2.85 },
  keyboard: { ex: 3.92 },
  display: { ex: 4.98 },
  lid: { ex: 5.95 },
};
export const ORDER = ['tray', 'battery', 'board', 'cooling', 'keyboard', 'display', 'lid'];

export const GREEN = new THREE.Color().setRGB(0.18, 0.49, 0.0); // #76B900 en lineal
const WHITE_KEY = new THREE.Color(0.85, 0.92, 1.0);

class Layer {
  constructor(name) {
    this.name = name;
    this.group = new THREE.Group();
    this.group.name = name;
    this.mats = [];
    this.glows = [];
    this.cache = new Map();
    this.dimValue = 1;
  }
  reg(m) {
    m.userData.base = { color: m.color.clone(), env: m.envMapIntensity ?? 1, emi: m.emissiveIntensity ?? 1 };
    this.mats.push(m);
    return m;
  }
  mat(key, params) {
    if (this.cache.has(key)) return this.cache.get(key);
    const m = this.reg(new THREE.MeshPhysicalMaterial(params));
    this.cache.set(key, m);
    return m;
  }
  glow(m) {
    m.userData.baseOpacity = m.opacity ?? 1;
    this.glows.push(m);
    return m;
  }
  dim(k) {
    if (Math.abs(k - this.dimValue) < 1e-4) return;
    this.dimValue = k;
    for (const m of this.mats) {
      const b = m.userData.base;
      m.color.copy(b.color).multiplyScalar(0.3 + 0.7 * k);
      m.envMapIntensity = b.env * (0.15 + 0.85 * k);
      m.emissiveIntensity = b.emi * k;
    }
    for (const m of this.glows) if (m.uniforms && m.uniforms.uDim) m.uniforms.uDim.value = k;
  }
}

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
function rbox(w, h, d, r = 0.01, seg = 2) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
}
export function rrShape(w, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
export function rrPath(w, d, r) {
  const p = new THREE.Path();
  p.setFromPoints(rrShape(w, d, r).getPoints(12));
  return p;
}
// extrusión tumbada: el eje de extrusión pasa a +Y y el eje Y de la forma a -Z
export function extrudeFlat(shape, h, bevel = 0.004) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12,
  });
  g.rotateX(-Math.PI / 2);
  return g;
}
function planarUV(g, x0, z0, w, d) {
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x0) / w, (pos.getZ(i) - z0) / d);
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function pcbTexture() {
  const R = rng(7);
  return canvasTex(2048, 1024, (g, w, h) => {
    g.fillStyle = '#0a0e0d';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1000; i++) {
      let x = R() * w;
      let y = R() * h;
      g.strokeStyle = R() < 0.86 ? 'rgba(62,84,76,0.55)' : 'rgba(150,120,60,0.55)';
      g.lineWidth = R() < 0.8 ? 1.2 : 2.4;
      g.beginPath();
      g.moveTo(x, y);
      const n = 2 + Math.floor(R() * 4);
      for (let k = 0; k < n; k++) {
        const len = 20 + R() * 150;
        const a = (Math.floor(R() * 8) * Math.PI) / 4;
        x += Math.cos(a) * len;
        y += Math.sin(a) * len;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = R() < 0.5 ? 'rgba(160,130,70,0.8)' : 'rgba(40,58,52,0.9)';
      g.beginPath();
      g.arc(R() * w, R() * h, 1.5 + R() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });
}

function brushedTexture(seed = 1) {
  // aluminio cepillado muy sutil (se usa como roughnessMap)
  const R = rng(seed);
  const t = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#7a7a7a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const y = R() * h;
      const v = 100 + Math.floor(R() * 60);
      g.strokeStyle = `rgba(${v},${v},${v},0.35)`;
      g.lineWidth = 0.6 + R() * 1.2;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + (R() - 0.5) * 4);
      g.stroke();
    }
  }, false);
  return t;
}

function labelTexture(text, sub, color = '#d0d4da', bg = '#121316') {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = color;
    g.font = '700 60px Rajdhani, sans-serif';
    g.textBaseline = 'middle';
    g.fillText(text, 26, h * 0.4);
    if (sub) {
      g.font = '500 30px Rajdhani, sans-serif';
      g.fillStyle = '#7d828a';
      g.fillText(sub, 28, h * 0.78);
    }
    g.fillStyle = '#76b900';
    g.fillRect(w - 60, 18, 36, 8);
  });
}

// ------------------------------------------------ shaders emisivos
const VS = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

// Pantalla OLED: negros puros + fondo con haces verdes; modo "tándem" = dos capas de emisión
const SCREEN_FS = /* glsl */ `
uniform float uTime, uPower, uDim, uDemo;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 uv = vUv;
  vec3 col = vec3(0.0);
  // fondo: haces diagonales verdes sobre negro puro
  float d1 = abs((uv.x - uv.y*0.6) - 0.35 - 0.04*sin(uTime*0.7));
  float d2 = abs((uv.x - uv.y*0.6) - 0.58);
  col += vec3(0.18,0.55,0.0) * exp(-d1*22.0) * 1.9;
  col += vec3(0.05,0.35,0.25) * exp(-d2*40.0) * 0.9;
  col += vec3(0.8,1.0,0.6) * exp(-d1*260.0) * 1.5;
  // demo OLED: cuadrícula de píxeles que se encienden uno a uno (negro absoluto entre ellos)
  vec2 N = vec2(64.0, 40.0);
  vec2 c = floor(uv*N);
  vec2 f = fract(uv*N) - 0.5;
  float px = smoothstep(0.45, 0.3, max(abs(f.x), abs(f.y)));
  float wave = step(hash(c), fract(uTime*0.6)) * step(0.55, hash(c+7.0));
  vec3 pc = mix(vec3(0.2,0.8,0.0), vec3(0.9,1.0,0.9), hash(c+3.0));
  col = mix(col, pc*px*wave*2.0 + col*0.25, uDemo);
  gl_FragColor = vec4(col * uPower * uDim, 1.0);
}`;

// Superficie del die de la GPU: 48 bloques SM que se encienden en secuencia
const GPU_FS = /* glsl */ `
uniform float uTime, uLit, uPulse, uDim;
varying vec2 vUv;
float hash(float n){ return fract(sin(n)*43758.5453); }
void main(){
  vec2 N = vec2(8.0, 6.0);
  vec2 c = floor(vUv*N);
  vec2 f = fract(vUv*N);
  float idx = c.y*N.x + c.x;
  float order = hash(idx*1.37 + 2.0);
  float on = smoothstep(order, order+0.04, uLit);
  float box = smoothstep(0.0,0.06,f.x)*smoothstep(1.0,0.94,f.x)*smoothstep(0.0,0.08,f.y)*smoothstep(1.0,0.92,f.y);
  float inner = step(0.5, fract((f.x+f.y*0.5)*6.0));
  float flick = 0.8 + 0.2*sin(uTime*30.0 + idx*3.1);
  vec3 col = vec3(0.18,0.62,0.0) * (0.8 + 0.4*inner) * box * on * flick * 2.6;
  col += vec3(0.18,0.62,0.0) * uPulse * box * 1.5 * (0.15 + 0.85*on);
  gl_FragColor = vec4(col * uDim, 1.0);
}`;

// Superficie del die de la CPU: 10 núcleos grandes + 10 pequeños
const CPU_FS = /* glsl */ `
uniform float uTime, uLit, uPulse, uDim;
varying vec2 vUv;
float cellOn(float idx, float lit){ return smoothstep(idx/20.0, idx/20.0 + 0.03, lit); }
void main(){
  vec3 col = vec3(0.0);
  vec2 uv = vUv;
  float on = 0.0; float box = 0.0;
  if (uv.y > 0.42) {
    // 10 grandes (2 x 5)
    vec2 N = vec2(5.0, 2.0);
    vec2 g = (uv - vec2(0.0,0.42)) / vec2(1.0,0.58);
    vec2 c = floor(g*N); vec2 f = fract(g*N);
    box = smoothstep(0.0,0.08,f.x)*smoothstep(1.0,0.92,f.x)*smoothstep(0.0,0.08,f.y)*smoothstep(1.0,0.92,f.y);
    on = cellOn(c.y*5.0 + c.x, uLit);
  } else {
    vec2 N = vec2(5.0, 2.0);
    vec2 g = uv / vec2(1.0, 0.4);
    vec2 c = floor(g*N); vec2 f = fract(g*N);
    box = smoothstep(0.0,0.12,f.x)*smoothstep(1.0,0.88,f.x)*smoothstep(0.0,0.12,f.y)*smoothstep(1.0,0.88,f.y);
    on = cellOn(10.0 + c.y*5.0 + c.x, uLit);
  }
  col = vec3(0.85,0.95,1.0) * box * on * 2.2 + vec3(0.18,0.62,0.0)*box*uPulse*1.2*(0.15 + 0.85*on);
  gl_FragColor = vec4(col * uDim, 1.0);
}`;

// Puente NVLink-C2C: pulsos que viajan entre los dos dies
const LINK_FS = /* glsl */ `
uniform float uTime, uFlow, uDim;
varying vec2 vUv;
void main(){
  float lanes = step(0.5, fract(vUv.y*9.0));
  float p1 = fract(vUv.x*3.0 - uTime*2.4);
  float p2 = fract(-vUv.x*3.0 - uTime*2.0 + 0.5);
  float pulse = smoothstep(0.75,1.0,p1) + smoothstep(0.8,1.0,p2);
  vec3 col = vec3(0.18,0.62,0.0) * (0.35 + 2.5*pulse) * lanes;
  gl_FragColor = vec4(col * uFlow * uDim, 1.0);
}`;

// Calor en el disipador
const HEAT_FS = /* glsl */ `
uniform float uTime, uHeat, uDim;
varying vec2 vUv;
void main(){
  float h = exp(-length((vUv-vec2(0.5,0.5))*vec2(1.8,1.4))*3.2);
  float rings = 0.5+0.5*sin(length(vUv-0.5)*28.0 - uTime*6.0);
  float e = clamp(h*1.25 + rings*0.22*(1.0-h), 0.0, 1.2) * uHeat;
  vec3 col = mix(vec3(0.5,0.03,0.0), vec3(1.0,0.4,0.06), smoothstep(0.25,0.75,e));
  col = mix(col, vec3(1.0,0.92,0.7), smoothstep(0.85,1.2,e));
  float edge = smoothstep(0.0,0.08,vUv.x)*smoothstep(1.0,0.92,vUv.x)*smoothstep(0.0,0.1,vUv.y)*smoothstep(1.0,0.9,vUv.y);
  gl_FragColor = vec4(col*e*1.5*edge*uDim, 1.0);
}`;

function shaderMat(fs, uniforms, additive = false) {
  const m = new THREE.ShaderMaterial({
    vertexShader: VS,
    fragmentShader: fs,
    uniforms: { uTime: { value: 0 }, uDim: { value: 1 }, ...uniforms },
  });
  if (additive) {
    m.transparent = true;
    m.blending = THREE.AdditiveBlending;
    m.depthWrite = false;
  }
  return m;
}

function basicGlow(L, color, intensity, opacity = 1) {
  const m = new THREE.MeshBasicMaterial({
    color: color.clone().multiplyScalar(intensity),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  m.userData.baseOpacity = opacity;
  L.glows.push(m);
  return m;
}

// =====================================================================
export function buildLaptop() {
  const R = rng(42);
  const root = new THREE.Group();
  const layers = {};
  for (const k of ORDER) {
    layers[k] = new Layer(k);
    root.add(layers[k].group);
  }
  const parts = {};
  const anchors = {};
  const anchor = (name, parent, x, y, z) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    anchors[name] = o;
    return o;
  };
  const brushed = brushedTexture(5);
  const aluParams = { color: 0x8e939a, metalness: 1, roughness: 0.3, roughnessMap: brushed, clearcoat: 0.15, clearcoatRoughness: 0.4 };
  const m4 = new THREE.Matrix4();

  // ------------------------------------------------ CHASIS INFERIOR (aluminio)
  {
    const L = layers.tray;
    const g = L.group;
    const alu = L.mat('alu', aluParams);
    const inner = L.mat('inner', { color: 0x16181b, metalness: 0.6, roughness: 0.5 });
    const black = L.mat('black', { color: 0x060607, metalness: 0.1, roughness: 0.6 });
    const shape = rrShape(W, D, 0.14);
    shape.holes.push(rrPath(W - 0.07, D - 0.07, 0.11));
    g.add(mesh(extrudeFlat(rrShape(W, D, 0.14), 0.012, 0.006), alu, 0, 0.006, 0));
    g.add(mesh(extrudeFlat(shape, 0.06, 0.004), alu, 0, 0.012, 0));
    g.add(mesh(new THREE.BoxGeometry(W - 0.08, 0.002, D - 0.08), inner, 0, 0.0195, 0));
    // rejillas de admisión bajo los ventiladores
    const slot = new THREE.BoxGeometry(0.014, 0.003, 0.36);
    // rejillas de admisión en la cara inferior (bajo los ventiladores)
    const grille = new THREE.InstancedMesh(slot, black, 36);
    let n = 0;
    for (const cx of [-1.12, 1.12])
      for (let i = 0; i < 18; i++) grille.setMatrixAt(n++, m4.makeTranslation(cx - 0.3 + i * 0.035, -0.0012, -0.6));
    g.add(grille);
    // puertos laterales (USB-C x2 izq., USB-C + jack dcha.)
    const port = L.mat('port', { color: 0x040405, roughness: 0.5 });
    const tongue = L.mat('tongue', { color: 0x9aa0a8, metalness: 1, roughness: 0.3 });
    const ports = [];
    const mk = (side, z, w, h) => {
      const x = side * (HW - 0.001);
      g.add(mesh(rbox(0.02, h, w, h * 0.48), port, x, 0.045, z));
      g.add(mesh(new THREE.BoxGeometry(0.021, h * 0.25, w * 0.62), tongue, x, 0.045, z));
      const gm = basicGlow(L, GREEN, 5, 0);
      g.add(mesh(new THREE.BoxGeometry(0.004, h + 0.014, w + 0.014), gm, x + side * 0.009, 0.045, z));
      ports.push(gm);
    };
    mk(-1, -0.72, 0.09, 0.03);
    mk(-1, -0.55, 0.09, 0.03);
    mk(1, -0.72, 0.09, 0.03);
    mk(1, -0.52, 0.035, 0.035);
    parts.ports = ports;
    // pies de goma (visibles solo de lado)
    for (const z of [-0.95, 0.95]) g.add(mesh(rbox(2.8, 0.01, 0.07, 0.004), black, 0, -0.002, z));
    parts.trayAlu = alu;
    anchor('tray', g, HW, 0.04, 0.5);
    anchor('trayEdge', g, 0, 0.04, HD);
  }

  // ------------------------------------------------ BATERÍA + ALTAVOCES
  {
    const L = layers.battery;
    const g = L.group;
    const wrap = L.mat('wrap', { color: 0x16171b, metalness: 0.2, roughness: 0.6, clearcoat: 0.2, clearcoatRoughness: 0.5 });
    const cells = [];
    const cw = 0.56;
    for (let i = 0; i < 4; i++) {
      const x = -0.87 + i * (cw + 0.02);
      g.add(mesh(rbox(cw, 0.032, 0.86, 0.012), wrap, x, 0.04, 0.62));
      const fm = basicGlow(L, GREEN, 3.2, 0);
      const fill = mesh(new THREE.PlaneGeometry(cw - 0.06, 0.76), fm, x, 0.0575, 0.62);
      fill.rotation.x = -Math.PI / 2;
      fill.scale.x = 0.0001;
      g.add(fill);
      cells.push({ fill, mat: fm });
    }
    parts.batteryCells = cells;
    const lbl = L.reg(new THREE.MeshPhysicalMaterial({ map: labelTexture('Li-Po', 'Batería · 4 celdas'), roughness: 0.5 }));
    const label = mesh(new THREE.PlaneGeometry(0.56, 0.175), lbl, -0.58, 0.0568, 0.42);
    label.rotation.x = -Math.PI / 2;
    g.add(label);
    g.add(mesh(new THREE.BoxGeometry(0.26, 0.008, 0.2), L.mat('flex', { color: 0xb8742a, metalness: 0.3, roughness: 0.5 }), 0.25, 0.05, 0.12));
    // altavoces
    const spk = L.mat('spk', { color: 0x0c0c0e, roughness: 0.5 });
    const mesh2 = L.mat('spkm', { color: 0x2a2c30, metalness: 0.7, roughness: 0.45 });
    for (const sx of [-1.45, 1.45]) {
      g.add(mesh(rbox(0.5, 0.035, 0.3, 0.015), spk, sx, 0.04, 0.8));
      g.add(mesh(rbox(0.4, 0.004, 0.2, 0.002), mesh2, sx, 0.058, 0.8));
    }
    anchor('battery', g, 1.2, 0.06, 0.62);
    anchor('batteryCenter', g, 0, 0.06, 0.62);
  }

  // ------------------------------------------------ PLACA BASE con superchip RTX Spark
  {
    const L = layers.board;
    const g = L.group;
    const pcb = L.reg(new THREE.MeshPhysicalMaterial({ map: pcbTexture(), roughness: 0.42, metalness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.25 }));
    const pts = [
      [-1.62, -1.12],
      [1.62, -1.12],
      [1.62, -0.05],
      [0.95, -0.05],
      [0.85, 0.08],
      [-0.85, 0.08],
      [-0.95, -0.05],
      [-1.62, -0.05],
    ];
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], -pts[0][1]);
    for (const [x, z] of pts.slice(1)) s.lineTo(x, -z);
    s.closePath();
    const pg = extrudeFlat(s, 0.012, 0);
    planarUV(pg, -1.65, -1.15, 3.3, 1.25);
    g.add(mesh(pg, pcb, 0, 0.055, 0));
    const top = 0.067;
    const chip = L.mat('chip', { color: 0x0b0c0e, metalness: 0.25, roughness: 0.3, clearcoat: 0.45 });
    const subst = L.mat('sub', { color: 0x14281c, metalness: 0.25, roughness: 0.4, clearcoat: 0.7 });
    const die = L.mat('die', { color: 0x161a22, metalness: 0.9, roughness: 0.1, iridescence: 0.9, iridescenceIOR: 1.7, iridescenceThicknessRange: [220, 620] });
    const gold = L.mat('gold', { color: 0xd6a24a, metalness: 1, roughness: 0.25 });
    const steel = L.mat('steel', { color: 0xb9bec5, metalness: 1, roughness: 0.22 });

    // superchip: sustrato + die GPU + die CPU + puente NVLink-C2C
    const soc = new THREE.Group();
    soc.position.set(0, top, -0.56);
    soc.add(mesh(rbox(0.74, 0.016, 0.54, 0.006), subst, 0, 0.008, 0));
    // marco de refuerzo
    const stiff = new THREE.Shape();
    stiff.copy(rrShape(0.72, 0.52, 0.02));
    stiff.holes.push(rrPath(0.66, 0.46, 0.012));
    soc.add(mesh(extrudeFlat(stiff, 0.008, 0.001), steel, 0, 0.016, 0));
    const gpuDie = new THREE.Group();
    gpuDie.position.set(-0.1, 0.022, 0);
    gpuDie.add(mesh(rbox(0.36, 0.012, 0.34, 0.003), die, 0, 0, 0));
    const gpuFx = shaderMat(GPU_FS, { uLit: { value: 0 }, uPulse: { value: 0 } }, true);
    L.glows.push(gpuFx);
    const gp = mesh(new THREE.PlaneGeometry(0.33, 0.31), gpuFx, 0, 0.0062, 0);
    gp.rotation.x = -Math.PI / 2;
    gpuDie.add(gp);
    soc.add(gpuDie);
    const cpuDie = new THREE.Group();
    cpuDie.position.set(0.2, 0.022, 0);
    cpuDie.add(mesh(rbox(0.17, 0.012, 0.3, 0.003), die, 0, 0, 0));
    const cpuFx = shaderMat(CPU_FS, { uLit: { value: 0 }, uPulse: { value: 0 } }, true);
    L.glows.push(cpuFx);
    const cp = mesh(new THREE.PlaneGeometry(0.15, 0.28), cpuFx, 0, 0.0062, 0);
    cp.rotation.x = -Math.PI / 2;
    cp.rotation.z = Math.PI / 2;
    cp.scale.set(0.28 / 0.15, 0.15 / 0.28, 1);
    cpuDie.add(cp);
    soc.add(cpuDie);
    const linkFx = shaderMat(LINK_FS, { uFlow: { value: 0 } }, true);
    L.glows.push(linkFx);
    const link = mesh(new THREE.PlaneGeometry(0.07, 0.26), linkFx, 0.0975, 0.0235, 0);
    link.rotation.x = -Math.PI / 2;
    link.rotation.z = Math.PI / 2;
    link.scale.set(0.26 / 0.07, 0.07 / 0.26, 1);
    soc.add(link);
    // condensadores en el sustrato
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      soc.add(mesh(new THREE.BoxGeometry(0.014, 0.005, 0.008), gold, Math.cos(a) * 0.31, 0.018, Math.sin(a) * 0.22));
    }
    g.add(soc);
    parts.soc = soc;
    parts.gpuDie = gpuDie;
    parts.cpuDie = cpuDie;
    parts.gpuFx = gpuFx;
    parts.cpuFx = cpuFx;
    parts.linkFx = linkFx;

    // memoria unificada LPDDR5X: 8 encapsulados alrededor
    const memMat = L.mat('mem', { color: 0x0d0e10, metalness: 0.3, roughness: 0.28, clearcoat: 0.6 });
    const mems = [];
    const memGlow = [];
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const k = i % 4;
      const x = -0.54 + k * 0.36;
      const z = -0.56 + side * 0.43;
      const mg = new THREE.Group();
      mg.position.set(x, top, z);
      mg.add(mesh(rbox(0.26, 0.018, 0.2, 0.004), memMat, 0, 0.009, 0));
      // marco luminoso alrededor del encapsulado
      const fr = rrShape(0.29, 0.23, 0.012);
      fr.holes.push(rrPath(0.266, 0.206, 0.006));
      const em = basicGlow(L, GREEN, 6, 0);
      mg.add(mesh(extrudeFlat(fr, 0.004, 0), em, 0, 0.016, 0));
      memGlow.push(em);
      g.add(mg);
      mems.push(mg);
    }
    parts.mem = mems;
    parts.memGlow = memGlow;
    // flujo de datos memoria -> dies (partículas)
    const flowMat = basicGlow(L, GREEN, 5, 0);
    const flowN = 160;
    const flow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.009, 8, 6), flowMat, flowN);
    const flowPaths = [];
    for (let i = 0; i < flowN; i++) {
      const mi = i % 8;
      const target = i % 3 === 0 ? cpuDie : gpuDie;
      const a = mems[mi].position.clone().add(new THREE.Vector3(0, 0.02, 0));
      const b = soc.position.clone().add(target.position).add(new THREE.Vector3(0, 0.012, 0));
      const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0.12 + R() * 0.08, 0));
      flowPaths.push({ curve: new THREE.QuadraticBezierCurve3(a, mid, b), seed: R(), back: R() < 0.4 });
    }
    g.add(flow);
    parts.flow = { mesh: flow, mat: flowMat, paths: flowPaths };

    // VRM, bobinas y condensadores
    const chokeMat = L.mat('choke', { color: 0x2a2c30, metalness: 0.6, roughness: 0.4 });
    const chokes = new THREE.InstancedMesh(rbox(0.06, 0.03, 0.06, 0.006), chokeMat, 10);
    for (let i = 0; i < 10; i++) chokes.setMatrixAt(i, m4.makeTranslation(-0.5 + i * 0.1, top + 0.015, -1.04));
    g.add(chokes);
    // chips pequeños deterministas
    const small = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), chip, 60);
    const busy = [
      [-0.8, 0.8, -1.1, -0.02],
      [0.95, 1.62, -1.12, -0.05],
      [-1.62, -0.95, -0.6, -0.05],
    ];
    let n = 0;
    let guard = 0;
    while (n < 60 && guard++ < 5000) {
      const x = -1.55 + R() * 3.1;
      const z = -1.08 + R() * 1.0;
      if (busy.some((b) => x > b[0] && x < b[1] && z > b[2] && z < b[3])) continue;
      const sx = 0.03 + R() * 0.09;
      const sz = 0.03 + R() * 0.07;
      m4.compose(new THREE.Vector3(x, top + 0.005, z), new THREE.Quaternion(), new THREE.Vector3(sx, 0.01, sz));
      small.setMatrixAt(n++, m4);
    }
    small.count = n;
    g.add(small);

    // SSD M.2 2280
    const green = L.mat('m2', { color: 0x10301f, metalness: 0.2, roughness: 0.4, clearcoat: 0.6 });
    const ssd = new THREE.Group();
    ssd.position.set(1.25, top + 0.006, -0.62);
    ssd.rotation.y = Math.PI / 2;
    ssd.add(mesh(rbox(0.8, 0.008, 0.22, 0.003), green, 0, 0, 0));
    const sl = L.reg(new THREE.MeshPhysicalMaterial({ map: labelTexture('NVMe', 'M.2 2280', '#e8ebef', '#101114'), metalness: 0.5, roughness: 0.35 }));
    const ssdTop = mesh(new THREE.PlaneGeometry(0.62, 0.194), sl, 0.05, 0.0105, 0);
    ssdTop.rotation.x = -Math.PI / 2;
    ssd.add(ssdTop);
    ssd.add(mesh(new THREE.BoxGeometry(0.03, 0.009, 0.19), gold, -0.39, 0, 0));
    g.add(ssd);
    parts.ssd = ssd;
    // módulo Wi-Fi
    const wifi = new THREE.Group();
    wifi.position.set(-1.3, top + 0.006, -0.3);
    wifi.add(mesh(rbox(0.3, 0.008, 0.22, 0.003), green, 0, 0, 0));
    wifi.add(mesh(rbox(0.16, 0.012, 0.14, 0.003), steel, 0.02, 0.008, 0));
    g.add(wifi);
    parts.wifi = wifi;

    anchor('board', g, 1.62, 0.07, -0.4);
    anchor('soc', soc, 0.37, 0.02, 0.1);
    anchor('gpu', gpuDie, -0.05, 0.01, 0.05);
    anchor('cpu', cpuDie, 0.05, 0.01, 0.05);
    anchor('mem', mems[7], 0.1, 0.02, 0.08);
  }

  // ------------------------------------------------ REFRIGERACIÓN (disipador de cobre, 2 heatpipes, 2 ventiladores)
  {
    const L = layers.cooling;
    const g = L.group;
    const copper = L.mat('copper', { color: 0xc8744a, metalness: 1, roughness: 0.2, clearcoat: 0.3 });
    const fin = L.mat('fin', { color: 0xa9aeb5, metalness: 1, roughness: 0.26 });
    const plastic = L.mat('plastic', { color: 0x0d0e10, metalness: 0.15, roughness: 0.45, clearcoat: 0.3 });
    const blade = L.mat('blade', { color: 0x1c1d21, metalness: 0.2, roughness: 0.35 });
    const y0 = 0.072;
    g.add(mesh(extrudeFlat(rrShape(0.9, 0.62, 0.04), 0.012, 0.003), copper, 0, y0, -0.56));
    const heat = shaderMat(HEAT_FS, { uHeat: { value: 0 } }, true);
    L.glows.push(heat);
    const hp = mesh(new THREE.PlaneGeometry(0.9, 0.62), heat, 0, y0 + 0.017, -0.56);
    hp.rotation.x = -Math.PI / 2;
    g.add(hp);
    parts.heat = heat;
    // aletas en las esquinas traseras
    const finGeo = new THREE.BoxGeometry(0.005, 0.04, 0.22);
    const stacks = [
      [-1.7, -0.78],
      [0.78, 1.7],
    ];
    let total = 0;
    for (const [a, b] of stacks) total += Math.floor((b - a) / 0.02);
    const fins = new THREE.InstancedMesh(finGeo, fin, total);
    let n = 0;
    for (const [a, b] of stacks)
      for (let i = 0; i < Math.floor((b - a) / 0.02); i++) fins.setMatrixAt(n++, m4.makeTranslation(a + i * 0.02, y0 + 0.018, -1.06));
    g.add(fins);
    const P = (x, z) => new THREE.Vector3(x, y0 + 0.018, z);
    const routes = [
      [P(-0.25, -0.62), P(-0.55, -0.8), P(-0.78, -1.02), P(-1.3, -1.04), P(-1.72, -1.04)],
      [P(0.25, -0.5), P(0.55, -0.78), P(0.78, -1.02), P(1.3, -1.04), P(1.72, -1.04)],
    ];
    const pipes = [];
    for (const r of routes) {
      const c = new THREE.CatmullRomCurve3(r);
      const tg = new THREE.TubeGeometry(c, 90, 0.02, 12);
      tg.scale(1, 0.55, 1); // heatpipes aplanados
      tg.translate(0, (y0 + 0.018) * 0.45, 0);
      g.add(new THREE.Mesh(tg, copper));
      pipes.push(c);
    }
    parts.pipes = pipes;
    const pm = basicGlow(L, new THREE.Color(1, 0.35, 0.05), 4, 0);
    const pcount = 60;
    const pInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 8, 6), pm, pcount);
    g.add(pInst);
    parts.heatParticles = { mesh: pInst, mat: pm, count: pcount, seeds: Array.from({ length: pcount }, () => R()) };
    // ventiladores
    const fans = [];
    const mkFan = (x, z, r, nb) => {
      const f = new THREE.Group();
      f.position.set(x, y0 - 0.01, z);
      const sh = new THREE.Shape();
      sh.absarc(0, 0, r + 0.05, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, r + 0.01, 0, Math.PI * 2, true);
      sh.holes.push(hole);
      f.add(mesh(extrudeFlat(sh, 0.036, 0.002), plastic, 0, 0, 0));
      f.add(mesh(new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.004, 64), plastic, 0, 0.002, 0));
      const rotor = new THREE.Group();
      rotor.position.y = 0.02;
      const hubR = r * 0.34;
      rotor.add(mesh(new THREE.CylinderGeometry(hubR, hubR, 0.03, 48), plastic, 0, 0, 0));
      const ac = mesh(new THREE.RingGeometry(hubR * 0.5, hubR * 0.66, 48), basicGlow(L, GREEN, 3, 1), 0, 0.0155, 0);
      ac.rotation.x = -Math.PI / 2;
      rotor.add(ac);
      const bl = new THREE.BoxGeometry(r - hubR + 0.004, 0.026, 0.0035);
      bl.translate((r - hubR) / 2 + hubR, 0, 0);
      const blades = new THREE.InstancedMesh(bl, blade, nb);
      const e = new THREE.Euler();
      const q = new THREE.Quaternion();
      for (let i = 0; i < nb; i++) {
        e.set(0.4, (i / nb) * Math.PI * 2, 0, 'YXZ');
        blades.setMatrixAt(i, m4.compose(new THREE.Vector3(), q.setFromEuler(e), new THREE.Vector3(1, 1, 1)));
      }
      rotor.add(blades);
      const bm = new THREE.MeshBasicMaterial({ color: 0x24262b, transparent: true, opacity: 0, depthWrite: false });
      const blur = mesh(new THREE.RingGeometry(hubR, r, 64), bm, 0, 0.0145, 0);
      blur.rotation.x = -Math.PI / 2;
      rotor.add(blur);
      f.add(rotor);
      g.add(f);
      fans.push({ group: f, rotor, blurMat: bm });
    };
    mkFan(-1.12, -0.55, 0.3, 57);
    mkFan(1.12, -0.55, 0.3, 57);
    parts.fans = fans;
    // estelas de aire caliente saliendo por detrás
    const am = basicGlow(L, new THREE.Color(0.55, 0.85, 1.0), 2.4, 0);
    const acount = 60;
    const air = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, 0.006, 0.45), am, acount);
    g.add(air);
    parts.air = { mesh: air, mat: am, count: acount, seeds: Array.from({ length: acount * 3 }, () => R()) };
    anchor('cooling', g, 1.72, y0 + 0.03, -0.5);
    anchor('fanL', fans[0].group, 0, 0.04, 0);
  }

  // ------------------------------------------------ TECLADO (reposamanos de aluminio + teclas retroiluminadas)
  {
    const L = layers.keyboard;
    const g = L.group;
    const alu = L.mat('alu', aluParams);
    const well = L.mat('well', { color: 0x08080a, metalness: 0.3, roughness: 0.6 });
    const cap = L.mat('cap', { color: 0x16171a, metalness: 0.05, roughness: 0.5, clearcoat: 0.2 });
    const yk = 0.1;
    const skirt = rrShape(W, D, 0.14);
    skirt.holes.push(rrPath(W - 0.07, D - 0.07, 0.11));
    g.add(mesh(extrudeFlat(skirt, 0.026, 0.003), alu, 0, 0.074, 0));
    const deck = rrShape(W, D, 0.14);
    const hx0 = -1.44;
    const hx1 = 1.44;
    const hz0 = -1.1;
    const hz1 = -0.02;
    const hole = new THREE.Path();
    hole.moveTo(hx0, -hz1);
    hole.lineTo(hx0, -hz0);
    hole.lineTo(hx1, -hz0);
    hole.lineTo(hx1, -hz1);
    hole.closePath();
    deck.holes.push(hole);
    g.add(mesh(extrudeFlat(deck, 0.012, 0.003), alu, 0, yk, 0));
    g.add(mesh(new THREE.BoxGeometry(hx1 - hx0, 0.003, hz1 - hz0), well, 0, yk + 0.002, (hz0 + hz1) / 2));
    // touchpad de cristal
    const tp = L.mat('tp', { color: 0x2a2d33, metalness: 0.5, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
    g.add(mesh(rbox(1.3, 0.006, 0.8, 0.003), tp, 0, yk + 0.013, 0.62));
    // teclas
    const u = 0.188;
    const rows = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
      [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
      [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
      [1.25, 1, 1.25, 5.5, 1.25, 1, 1, 1, 1],
    ];
    const keys = [];
    const x0 = -(15 * u) / 2;
    rows.forEach((row, ri) => {
      let x = x0;
      const z = -1.0 + ri * u - (ri === 0 ? 0.02 : 0);
      for (const w of row) {
        keys.push({ x: x + (w * u) / 2, z, w: w * u - 0.024, h: ri === 0 ? u * 0.62 : u - 0.024 });
        x += w * u;
      }
    });
    const kc = new THREE.InstancedMesh(rbox(1, 0.016, 1, 0.12, 2), cap, keys.length);
    const glowMat = new THREE.MeshBasicMaterial({ color: WHITE_KEY.clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    glowMat.userData.baseOpacity = 1;
    const kg = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMat, keys.length);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    keys.forEach((k, i) => {
      kc.setMatrixAt(i, m4.compose(new THREE.Vector3(k.x, yk + 0.012, k.z), new THREE.Quaternion(), new THREE.Vector3(k.w, 1, k.h)));
      kg.setMatrixAt(i, m4.compose(new THREE.Vector3(k.x, yk + 0.0045, k.z), q, new THREE.Vector3(k.w + 0.03, k.h + 0.03, 1)));
      kg.setColorAt(i, new THREE.Color(0, 0, 0));
    });
    g.add(kg);
    g.add(kc);
    parts.keys = { caps: kc, glow: kg, list: keys, mat: glowMat };
    anchor('keyboard', g, 1.72, yk + 0.02, 0.2);
  }

  // ------------------------------------------------ BISAGRA: pantalla + tapa
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, HINGE_Y, -HD + 0.02);
  root.add(lidPivot);
  parts.lidPivot = lidPivot;

  // ------------------------------------------------ PANTALLA OLED tándem
  {
    const L = layers.display;
    const g = L.group;
    root.remove(g);
    lidPivot.add(g);
    const frame = L.mat('frame', { color: 0x060607, metalness: 0.3, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.04 });
    const panel = new THREE.Group();
    panel.position.set(0, 0.007, HD - 0.02);
    panel.add(mesh(rbox(3.5, 0.012, 2.42, 0.02), frame, 0, 0, 0));
    const scr = shaderMat(SCREEN_FS, { uPower: { value: 0 }, uDemo: { value: 0 } });
    L.glows.push(scr);
    const screen = mesh(new THREE.PlaneGeometry(3.42, 2.14), scr, 0, 0.0062, 0.1);
    screen.rotation.x = -Math.PI / 2;
    panel.add(screen);
    // segunda capa de emisión (OLED tándem) que se separa en la demo
    const tandem = shaderMat(SCREEN_FS, { uPower: { value: 0 }, uDemo: { value: 1 } }, true);
    L.glows.push(tandem);
    const t2 = mesh(new THREE.PlaneGeometry(3.42, 2.14), tandem, 0, 0.0063, 0.1);
    t2.rotation.x = -Math.PI / 2;
    panel.add(t2);
    const back = L.mat('back', { color: 0x2b2e33, metalness: 0.8, roughness: 0.35 });
    panel.add(mesh(rbox(3.2, 0.004, 2.1, 0.01), back, 0, -0.008, 0.02));
    panel.add(mesh(new THREE.BoxGeometry(1.0, 0.006, 0.1), frame, 0, -0.01, -1.12));
    g.add(panel);
    parts.panel = panel;
    parts.screen = scr;
    parts.tandem = { mesh: t2, mat: tandem };
    anchor('display', g, 1.76, 0.01, HD - 0.02 + 0.2);
    anchor('screenCenter', panel, 0, 0.01, 0.1);
  }

  // ------------------------------------------------ TAPA (aluminio mecanizado, chaflán brillante)
  {
    const L = layers.lid;
    const g = L.group;
    root.remove(g);
    lidPivot.add(g);
    const alu = L.mat('alu', { ...aluParams, color: 0x9a9fa6 });
    const cham = L.mat('cham', { color: 0xd9dde2, metalness: 1, roughness: 0.12 });
    g.add(mesh(extrudeFlat(rrShape(W, D, 0.14), 0.012, 0.004), alu, 0, 0.015, HD - 0.02));
    // chaflán diamantado en el borde
    const ring = rrShape(W + 0.004, D + 0.004, 0.142);
    ring.holes.push(rrPath(W - 0.02, D - 0.02, 0.13));
    g.add(mesh(extrudeFlat(ring, 0.002, 0), cham, 0, 0.0305, HD - 0.02));
    parts.lidAlu = alu;
    anchor('lid', g, 1.76, 0.03, HD + 0.1);
  }

  return { root, layers, parts, anchors };
}

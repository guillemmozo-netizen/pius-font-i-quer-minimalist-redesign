// Portátil fino de 16" con superchip NVIDIA RTX Spark (N1X), procedural y sin logotipos.
// Recreación ilustrativa: la disposición interna real de cada fabricante puede variar.
// Unidades: 1 = 10 cm. X = ancho, Z = fondo (+Z hacia el usuario), Y = arriba.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './util.js';
import {
  roundedRectOutline, ringSweep, arc, plateRings, keycapGeometry, shellGeometry, bladeGeometry, voluteGeometries,
  screwHeadGeometry, torxGeometry, springGeometry, finGeometry, stadiumShape, chamferBox, canvasTexture,
  beadBlastMaps, flyCutMaps, pcbMaps, gpuDieTexture, cpuDieTexture, legendAtlas, printedLabel,
} from './geo.js';

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
  // v invertida: el texto impreso se lee de frente (usuario en +Z)
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x0) / w, 1 - (pos.getZ(i) - z0) / d);
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
// Modelo v2 "calidad promo": carcasas con filetes y canto diamantado, miles de componentes instanciados,
// texturas procedurales de alta resolución. Mantiene la interfaz (parts/anchors) que usan timeline.js y hud.js.
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
  const m4 = new THREE.Matrix4();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const Q0 = new THREE.Quaternion();
  const qY = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);
  const S1 = V(1, 1, 1);
  const noShadow = (o) => {
    o.userData.noShadow = true;
    return o;
  };
  const inst = (geo, mat, list, parent, shadow = false) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((mx, i) => im.setMatrixAt(i, mx));
    im.count = list.length;
    im.computeBoundingBox();
    im.computeBoundingSphere();
    if (!shadow) noShadow(im);
    parent.add(im);
    return im;
  };
  const TRS = (x, y, z, q = Q0, s = S1) => new THREE.Matrix4().compose(V(x, y, z), q, s instanceof THREE.Vector3 ? s : V(s, s, s));

  // --- texturas compartidas
  const bead = beadBlastMaps(5, 512, [7, 5]);
  const beadFine = beadBlastMaps(9, 256, [22, 22]);
  const fly = flyCutMaps(3, 1024, [3, 2], 6);
  const flyCu = flyCutMaps(4, 1024, [1, 1], 4);
  const pcbTex = pcbMaps(7, 4096, 1536);
  const aluMatte = (L, color = 0x9aa0a7) =>
    L.mat('aluMatte', { color, metalness: 1, roughness: 0.36, roughnessMap: bead.rough, normalMap: bead.normal, normalScale: new THREE.Vector2(0.35, 0.35), clearcoat: 0.08, clearcoatRoughness: 0.5 });
  const aluChamfer = (L) => L.mat('aluChamfer', { color: 0xeef1f4, metalness: 1, roughness: 0.06 });
  const aluMachined = (L) => L.mat('aluMachined', { color: 0xb6bbc2, metalness: 1, roughness: 0.22, roughnessMap: fly.rough, normalMap: fly.normal, normalScale: new THREE.Vector2(0.5, 0.5) });
  const steelMat = (L) => L.mat('steel', { color: 0xc3c8ce, metalness: 1, roughness: 0.18 });
  const goldMat = (L) => L.mat('gold', { color: 0xe0b35a, metalness: 1, roughness: 0.2 });
  const blackPlastic = (L) => L.mat('blackPlastic', { color: 0x0b0c0e, metalness: 0.05, roughness: 0.42, normalMap: beadFine.normal, normalScale: new THREE.Vector2(0.15, 0.15) });
  const rubber = (L) => L.mat('rubber', { color: 0x070708, metalness: 0, roughness: 0.85 });
  const copperMat = (L) =>
    L.mat('copper', { color: 0xd17b4f, metalness: 1, roughness: 0.18, roughnessMap: flyCu.rough, normalMap: flyCu.normal, normalScale: new THREE.Vector2(0.6, 0.6), clearcoat: 0.25, clearcoatRoughness: 0.2 });

  // tornillos: cabeza + Torx (dos mallas instanciadas por capa)
  const screwHead = screwHeadGeometry(0.011, 0.0045);
  const torx = torxGeometry(0.0045, 0.0046);
  const addScrews = (L, parent, pts, scale = 1) => {
    const heads = pts.map(([x, y, z, a = 0]) => TRS(x, y, z, qY(a), scale));
    inst(screwHead, steelMat(L), heads, parent, true);
    inst(torx, L.mat('torxHole', { color: 0x050506, roughness: 0.8 }), heads, parent);
  };

  // ------------------------------------------------ CHASIS INFERIOR (unibody)
  {
    const L = layers.tray;
    const g = L.group;
    const shell = shellGeometry(W, D, 0.14, { h: 0.072, rb: 0.03, rt: 0.004, chamfer: 0.003, t: 0.012, floorY: 0.012, cornerSeg: 28 });
    const sm = new THREE.Mesh(shell, [aluMatte(L), aluChamfer(L), aluMachined(L)]);
    sm.castShadow = sm.receiveShadow = true;
    g.add(sm);
    parts.trayAlu = aluMatte(L);
    // nervios interiores mecanizados y torretas
    const rib = aluMachined(L);
    const ribs = [
      [0, 0.13, 3.2, 0.006],
      [-0.98, 0.62, 0.006, 0.9],
      [0.98, 0.62, 0.006, 0.9],
      [0, -0.3, 0.9, 0.005],
      [-1.35, -0.08, 0.55, 0.005],
      [1.35, -0.08, 0.55, 0.005],
    ];
    for (const [x, z, w, d] of ribs) {
      const b = mesh(chamferBox(w, 0.024, d, 0.0015), rib, x, 0.012 + 0.012, z);
      b.castShadow = true;
      g.add(b);
    }
    const bossGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.03, 24);
    const bossPts = [
      [-1.55, -1.05], [1.55, -1.05], [-1.55, -0.15], [1.55, -0.15], [-0.78, -0.02], [0.78, -0.02], [0, 0.02],
      [-1.55, 1.05], [1.55, 1.05], [-0.4, 1.05], [0.4, 1.05],
    ];
    inst(bossGeo, rib, bossPts.map(([x, z]) => TRS(x, 0.027, z)), g, true);
    inst(new THREE.CircleGeometry(0.006, 16).rotateX(-Math.PI / 2), L.mat('holeDark', { color: 0x030303, roughness: 1 }), bossPts.map(([x, z]) => TRS(x, 0.0422, z)), g);
    // rejillas de admisión (ranuras) bajo los ventiladores: vistas por fuera y por dentro
    const slot = new THREE.ShapeGeometry(stadiumShape(0.3, 0.011), 6);
    slot.rotateX(-Math.PI / 2);
    slot.rotateY(Math.PI / 2);
    const slotsIn = [];
    const slotsOut = [];
    for (const cx of [-1.12, 1.12])
      for (let i = 0; i < 17; i++) {
        const x = cx - 0.28 + i * 0.035;
        slotsIn.push(TRS(x, 0.0123, -0.56));
        slotsOut.push(TRS(x, -0.0004, -0.56, new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI)));
      }
    const slotMat = L.mat('slot', { color: 0x020203, roughness: 0.9 });
    inst(slot, slotMat, slotsIn, g);
    inst(slot, slotMat, slotsOut, g);
    // pies de goma
    const footOut = roundedRectOutline(2.9, 0.05, 0.024, 8, 2);
    const foot = ringSweep(footOut, [{ o: 0, y: 0, s: 0, flat: true }, { o: 0, y: 0, s: 1 }, ...arc(-0.004, -0.004, 0.004, 0, -Math.PI / 2, 4).slice(1), ...plateRings(-0.004, -0.008, [1, 0.6, 0]).slice(1)], {
      refFace: { j: 1, dir: 'out' },
    });
    for (const z of [-0.98, 0.98]) g.add(mesh(foot, rubber(L), 0, 0, z));
    // puertos: USB-C x2 (izq.), USB-C + jack (dcha.)
    const portDark = L.mat('portDark', { color: 0x030304, roughness: 0.7 });
    const ports = [];
    const cOut = new THREE.ShapeGeometry(stadiumShape(0.084, 0.026), 8);
    const cShell = (() => {
      const s = stadiumShape(0.084, 0.026);
      s.holes.push(new THREE.Path(stadiumShape(0.078, 0.02).getPoints(24)));
      return new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false, curveSegments: 8 });
    })();
    const tongueG = chamferBox(0.052, 0.006, 0.01, 0.001);
    const pinG = new THREE.BoxGeometry(0.0022, 0.0004, 0.006);
    const glowRing = (() => {
      const s = stadiumShape(0.1, 0.04);
      s.holes.push(new THREE.Path(stadiumShape(0.09, 0.03).getPoints(24)));
      return new THREE.ShapeGeometry(s, 8);
    })();
    const pinMats = [];
    const addPort = (side, z, jack = false) => {
      const grp = new THREE.Group();
      grp.position.set(side * (HW + 0.0006), 0.045, z);
      grp.rotation.y = side * (Math.PI / 2);
      if (jack) {
        grp.add(mesh(new THREE.CircleGeometry(0.0125, 32), portDark));
        const rim = new THREE.Mesh(new THREE.RingGeometry(0.0125, 0.0155, 32), steelMat(L));
        rim.position.z = 0.0002;
        grp.add(rim);
      } else {
        grp.add(mesh(cOut, portDark));
        const sh = mesh(cShell, steelMat(L), 0, 0, -0.012);
        grp.add(sh);
        grp.add(mesh(tongueG, blackPlastic(L), 0, 0, -0.004));
        for (let i = 0; i < 12; i++)
          for (const sy of [-1, 1]) pinMats.push({ grp, m: TRS(-0.0215 + i * 0.0039, sy * 0.0032, -0.003) });
      }
      const gm = basicGlow(L, GREEN, 5, 0);
      const gr = mesh(glowRing, gm, 0, 0, 0.004);
      grp.add(gr);
      ports.push(gm);
      g.add(grp);
      return grp;
    };
    const pGroups = [addPort(-1, -0.72), addPort(-1, -0.55), addPort(1, -0.72), addPort(1, -0.52, true)];
    for (const pg of pGroups) {
      const list = pinMats.filter((p) => p.grp === pg).map((p) => p.m);
      if (list.length) inst(pinG, goldMat(L), list, pg);
    }
    parts.ports = ports;
    anchor('tray', g, HW, 0.04, 0.5);
    anchor('trayEdge', g, 0, 0.04, HD);
  }

  // ------------------------------------------------ BATERÍA (celdas pouch) + ALTAVOCES
  {
    const L = layers.battery;
    const g = L.group;
    const wrap = L.mat('wrap', { color: 0x1a1c22, metalness: 0.35, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.25, normalMap: beadFine.normal, normalScale: new THREE.Vector2(0.25, 0.25) });
    const seal = L.mat('seal', { color: 0x8d9097, metalness: 0.8, roughness: 0.3 });
    const cw = 0.56;
    const cellOut = roundedRectOutline(cw, 0.86, 0.025, 8, 3);
    const cellGeo = ringSweep(
      cellOut,
      [
        ...plateRings(-0.008, 0.024, [0, 0.5, 1]),
        ...arc(-0.008, 0.032, 0.008, -Math.PI / 2, 0, 4).slice(1),
        ...arc(-0.008, 0.048, 0.008, 0, Math.PI / 2, 4),
        { o: -0.008, y: 0.0565, s: 0.9, flat: true },
        { o: -0.008, y: 0.0575, s: 0.7, flat: true },
        { o: -0.008, y: 0.058, s: 0.4, flat: true },
        { o: -0.008, y: 0.0582, s: 0, flat: true },
      ],
      { planar: [cw, 0.86], refFace: { j: 6, dir: 'out' } }
    );
    const cells = [];
    for (let i = 0; i < 4; i++) {
      const x = -0.87 + i * (cw + 0.02);
      const c = mesh(cellGeo, wrap, x, 0, 0.62);
      c.castShadow = c.receiveShadow = true;
      g.add(c);
      // pestaña de sellado del pouch
      g.add(mesh(chamferBox(cw - 0.04, 0.002, 0.035, 0.0008), seal, x, 0.041, 0.62 + 0.43 + 0.012));
      const fm = basicGlow(L, GREEN, 3.2, 0);
      const fill = mesh(new THREE.PlaneGeometry(cw - 0.06, 0.76), fm, x, 0.0588, 0.62);
      fill.rotation.x = -Math.PI / 2;
      fill.scale.x = 0.0001;
      g.add(noShadow(fill));
      cells.push({ fill, mat: fm });
    }
    parts.batteryCells = cells;
    // etiquetas y cintas kapton
    const lbl = L.reg(new THREE.MeshPhysicalMaterial({ map: printedLabel(['BATTERY PACK', 'Li-Polymer · 4S1P', 'No perforar · No desmontar', 'Do not puncture or disassemble'], { w: 1024, h: 512, border: true }), roughness: 0.45, metalness: 0.1 }));
    const label = mesh(new THREE.PlaneGeometry(0.5, 0.25), lbl, -0.58, 0.0584, 0.44);
    label.rotation.x = -Math.PI / 2;
    g.add(noShadow(label));
    const kapton = L.mat('kapton', { color: 0xc86a10, metalness: 0.1, roughness: 0.25, transparent: true, opacity: 0.82, clearcoat: 0.6 });
    for (const [x, z, w] of [[-0.3, 0.3, 0.9], [0.55, 0.9, 0.7], [0.0, 0.62, 0.35]]) {
      const k = mesh(new THREE.BoxGeometry(w, 0.0008, 0.05), kapton, x, 0.0587, z);
      g.add(noShadow(k));
    }
    // placa BMS con componentes + flex
    const bmsMat = L.mat('bms', { color: 0x0f3322, metalness: 0.2, roughness: 0.4, clearcoat: 0.6 });
    g.add(mesh(chamferBox(2.26, 0.004, 0.06, 0.001), bmsMat, 0.0, 0.03, 0.155));
    const bmsParts = [];
    for (let i = 0; i < 90; i++) bmsParts.push(TRS(-1.08 + R() * 2.16, 0.0335, 0.13 + R() * 0.05, qY(R() < 0.5 ? 0 : Math.PI / 2), V(0.012 + R() * 0.02, 0.003, 0.006 + R() * 0.01)));
    inst(new THREE.BoxGeometry(1, 1, 1), L.mat('smdBlack', { color: 0x111214, roughness: 0.4 }), bmsParts, g);
    const flex = L.mat('flex', { color: 0xc98b2c, metalness: 0.4, roughness: 0.35, clearcoat: 0.8 });
    const fc = new THREE.CatmullRomCurve3([V(0.25, 0.034, 0.14), V(0.25, 0.05, 0.08), V(0.25, 0.066, 0.02)]);
    const flexShape = new THREE.Shape().moveTo(-0.0004, -0.02).lineTo(0.0004, -0.02).lineTo(0.0004, 0.02).lineTo(-0.0004, 0.02).closePath();
    g.add(mesh(new THREE.ExtrudeGeometry(flexShape, { steps: 24, bevelEnabled: false, extrudePath: fc }), flex));
    // altavoces
    const spkOut = roundedRectOutline(0.5, 0.3, 0.05, 8, 2);
    const spkGeo = ringSweep(spkOut, [...plateRings(0, 0.022, [0, 1]), { o: 0, y: 0.054 }, ...arc(-0.004, 0.054, 0.004, 0, Math.PI / 2, 3).slice(1), ...plateRings(-0.004, 0.058, [1, 0.6, 0]).slice(1)], {
      refFace: { j: 1, dir: 'out' },
    });
    const holeG = new THREE.CircleGeometry(0.0028, 8).rotateX(-Math.PI / 2);
    const holes = [];
    for (const sx of [-1.45, 1.45]) {
      const sp = mesh(spkGeo, blackPlastic(L), sx, 0, 0.8);
      sp.castShadow = true;
      g.add(sp);
      g.add(mesh(chamferBox(0.4, 0.001, 0.2, 0.0004), steelMat(L), sx, 0.0585, 0.8));
      for (let ix = 0; ix < 40; ix++)
        for (let iz = 0; iz < 19; iz++) holes.push(TRS(sx - 0.19 + ix * 0.00975 + (iz % 2) * 0.0048, 0.0592, 0.8 - 0.09 + iz * 0.01));
    }
    inst(holeG, L.mat('spkHole', { color: 0x020202, roughness: 1 }), holes, g);
    anchor('battery', g, 1.2, 0.06, 0.62);
    anchor('batteryCenter', g, 0, 0.06, 0.62);
  }

  // ------------------------------------------------ PLACA BASE con superchip RTX Spark
  {
    const L = layers.board;
    const g = L.group;
    const pcb = L.reg(new THREE.MeshPhysicalMaterial({ map: pcbTex.map, normalMap: pcbTex.normal, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.42, metalness: 0.2, clearcoat: 0.75, clearcoatRoughness: 0.18 }));
    const pts = [
      [-1.62, -1.12], [1.62, -1.12], [1.62, -0.05], [0.95, -0.05], [0.85, 0.08], [-0.85, 0.08], [-0.95, -0.05], [-1.62, -0.05],
    ];
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], -pts[0][1]);
    for (const [x, z] of pts.slice(1)) s.lineTo(x, -z);
    s.closePath();
    const pg = extrudeFlat(s, 0.01, 0.001);
    planarUV(pg, -1.65, -1.15, 3.3, 1.25);
    const pcbMesh = mesh(pg, pcb, 0, 0.055, 0);
    pcbMesh.castShadow = pcbMesh.receiveShadow = true;
    g.add(pcbMesh);
    const top = 0.067;
    const inPoly = (x, z) => {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, zi] = pts[i];
        const [xj, zj] = pts[j];
        if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
      }
      return c;
    };
    const keepOut = [
      [-0.74, 0.74, -1.12, -0.01], // SoC + memoria
      [1.1, 1.4, -1.05, -0.19], // SSD
      [-1.47, -1.13, -0.43, -0.17], // Wi-Fi
      [0.78, 1.1, -1.08, -0.12], // VRM dcha
      [-1.1, -0.78, -1.08, -0.12], // VRM izq
      [-1.6, -1.5, -1.1, -0.98], [1.5, 1.6, -1.1, -0.98], [-1.6, -1.5, -0.2, -0.08], [1.5, 1.6, -0.2, -0.08], // tornillos
    ];
    const free = (x, z, m = 0.01) => inPoly(x, z) && inPoly(x + m, z + m) && inPoly(x - m, z - m) && !keepOut.some((b) => x > b[0] - m && x < b[1] + m && z > b[2] - m && z < b[3] + m);

    const chip = L.mat('chip', { color: 0x0c0d0f, metalness: 0.2, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    const subst = L.reg(new THREE.MeshPhysicalMaterial({ map: substrateTexture(), color: 0xffffff, metalness: 0.3, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 }));
    const steel = steelMat(L);
    const gold = goldMat(L);

    // --- superchip
    const soc = new THREE.Group();
    soc.position.set(0, top, -0.56);
    const subG = chamferBox(0.74, 0.016, 0.54, 0.0015);
    planarUV(subG, -0.37, -0.27, 0.74, 0.54);
    soc.add(mesh(subG, subst, 0, 0.008, 0));
    const stiff = rrShape(0.72, 0.52, 0.02);
    stiff.holes.push(rrPath(0.66, 0.46, 0.012));
    soc.add(mesh(extrudeFlat(stiff, 0.007, 0.0012), steel, 0, 0.016, 0));
    const dieBody = L.mat('dieBody', { color: 0x14161c, metalness: 0.6, roughness: 0.25 });
    const underfill = L.mat('underfill', { color: 0x1b1a17, roughness: 0.6 });
    const mkDie = (w, d, tex, overlay) => {
      const grp = new THREE.Group();
      grp.add(mesh(chamferBox(w + 0.012, 0.004, d + 0.012, 0.0015), underfill, 0, -0.006, 0));
      grp.add(mesh(chamferBox(w, 0.012, d, 0.0008), dieBody, 0, 0, 0));
      const dm = L.reg(new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.55, roughness: 0.14, iridescence: 0.75, iridescenceIOR: 1.8, iridescenceThicknessRange: [240, 640], clearcoat: 1, clearcoatRoughness: 0.03 }));
      const plane = mesh(overlay.geometry, dm, 0, 0.0061, 0);
      plane.rotation.copy(overlay.rotation);
      plane.scale.copy(overlay.scale);
      grp.add(noShadow(plane));
      return grp;
    };
    const gpuFx = shaderMat(GPU_FS, { uLit: { value: 0 }, uPulse: { value: 0 } }, true);
    L.glows.push(gpuFx);
    const gp = mesh(new THREE.PlaneGeometry(0.33, 0.31), gpuFx, 0, 0.0063, 0);
    gp.rotation.x = -Math.PI / 2;
    const gpuDie = mkDie(0.36, 0.34, gpuDieTexture(1024), gp);
    gpuDie.position.set(-0.1, 0.022, 0);
    gpuDie.add(noShadow(gp));
    soc.add(gpuDie);
    const cpuFx = shaderMat(CPU_FS, { uLit: { value: 0 }, uPulse: { value: 0 } }, true);
    L.glows.push(cpuFx);
    const cp = mesh(new THREE.PlaneGeometry(0.15, 0.28), cpuFx, 0, 0.0063, 0);
    cp.rotation.x = -Math.PI / 2;
    cp.rotation.z = Math.PI / 2;
    cp.scale.set(0.28 / 0.15, 0.15 / 0.28, 1);
    const cpuDie = mkDie(0.17, 0.3, cpuDieTexture(1024), cp);
    cpuDie.position.set(0.2, 0.022, 0);
    cpuDie.add(noShadow(cp));
    soc.add(cpuDie);
    const linkFx = shaderMat(LINK_FS, { uFlow: { value: 0 } }, true);
    L.glows.push(linkFx);
    const link = mesh(new THREE.PlaneGeometry(0.07, 0.26), linkFx, 0.0975, 0.0235, 0);
    link.rotation.x = -Math.PI / 2;
    link.rotation.z = Math.PI / 2;
    link.scale.set(0.26 / 0.07, 0.07 / 0.26, 1);
    soc.add(noShadow(link));
    // condensadores del sustrato (anillos alrededor de los dies)
    const mlccBody = chamferBox(0.01, 0.005, 0.005, 0.0006);
    const mlccTerm = (() => {
      const a = new THREE.BoxGeometry(0.0022, 0.0052, 0.0052);
      a.translate(-0.0042, 0, 0);
      const b = new THREE.BoxGeometry(0.0022, 0.0052, 0.0052);
      b.translate(0.0042, 0, 0);
      return mergeGeometries([a, b]);
    })();
    const subCaps = [];
    for (let i = 0; i < 360; i++) {
      const side = i % 4;
      const t = R();
      let x;
      let z;
      if (side === 0) [x, z] = [-0.31 + t * 0.62, -0.215 + R() * 0.028];
      else if (side === 1) [x, z] = [-0.31 + t * 0.62, 0.187 + R() * 0.028];
      else if (side === 2) [x, z] = [-0.318 + R() * 0.024, -0.17 + t * 0.34];
      else [x, z] = [0.294 + R() * 0.024, -0.17 + t * 0.34];
      subCaps.push(TRS(x, 0.0185, z, qY(side < 2 ? 0 : Math.PI / 2)));
    }
    const ceramic = L.mat('ceramic', { color: 0x8a7458, roughness: 0.55 });
    inst(mlccBody, ceramic, subCaps, soc);
    inst(mlccTerm, L.mat('tin', { color: 0xc9ccd1, metalness: 1, roughness: 0.3 }), subCaps, soc);
    g.add(soc);
    parts.soc = soc;
    parts.gpuDie = gpuDie;
    parts.cpuDie = cpuDie;
    parts.gpuFx = gpuFx;
    parts.cpuFx = cpuFx;
    parts.linkFx = linkFx;

    // --- memoria LPDDR5X (8 encapsulados con serigrafía)
    const memTex = printedLabel(['LPDDR5X', '  D8GXX · 4Z', '  2651 · K'], { w: 512, h: 400, bg: '#0e0f11', fg: '#c9ccd2', accent: null });
    const memMat = L.reg(new THREE.MeshPhysicalMaterial({ map: memTex, color: 0xffffff, metalness: 0.25, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
    const memGeo = chamferBox(0.26, 0.016, 0.2, 0.0025);
    planarUV(memGeo, -0.13, -0.1, 0.26, 0.2);
    const mems = [];
    const memGlow = [];
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const k = i % 4;
      const mg = new THREE.Group();
      mg.position.set(-0.54 + k * 0.36, top, -0.56 + side * 0.43);
      const mm = mesh(memGeo, memMat, 0, 0.008, 0);
      mm.castShadow = true;
      mg.add(mm);
      const fr = rrShape(0.29, 0.23, 0.012);
      fr.holes.push(rrPath(0.266, 0.206, 0.006));
      const em = basicGlow(L, GREEN, 6, 0);
      mg.add(noShadow(mesh(extrudeFlat(fr, 0.004, 0), em, 0, 0.015, 0)));
      memGlow.push(em);
      g.add(mg);
      mems.push(mg);
    }
    parts.mem = mems;
    parts.memGlow = memGlow;
    const flowMat = basicGlow(L, GREEN, 5, 0);
    const flowN = 160;
    const flow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.009, 8, 6), flowMat, flowN);
    noShadow(flow);
    const flowPaths = [];
    for (let i = 0; i < flowN; i++) {
      const target = i % 3 === 0 ? cpuDie : gpuDie;
      const a = mems[i % 8].position.clone().add(V(0, 0.02, 0));
      const b = soc.position.clone().add(target.position).add(V(0, 0.012, 0));
      const mid = a.clone().lerp(b, 0.5).add(V(0, 0.12 + R() * 0.08, 0));
      flowPaths.push({ curve: new THREE.QuadraticBezierCurve3(a, mid, b), seed: R(), back: R() < 0.4 });
    }
    g.add(flow);
    parts.flow = { mesh: flow, mat: flowMat, paths: flowPaths };

    // --- VRM a ambos lados del superchip
    const chokeTex = printedLabel(['R22'], { w: 128, h: 128, bg: '#2a2c30', fg: '#b8bcc4', accent: null });
    const chokeMat = L.reg(new THREE.MeshPhysicalMaterial({ map: chokeTex, metalness: 0.55, roughness: 0.38 }));
    const chokeGeo = chamferBox(0.058, 0.03, 0.058, 0.004);
    planarUV(chokeGeo, -0.029, -0.029, 0.058, 0.058);
    const chokes = [];
    const mos = [];
    const bigCaps = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const z = -1.03 + i * 0.105;
        chokes.push(TRS(side * 0.86, top + 0.015, z));
        mos.push(TRS(side * 0.945, top + 0.004, z, Q0, V(1, 1, 1)));
        if (i % 2 === 0) bigCaps.push(TRS(side * 1.03, top + 0.009, z + 0.03));
      }
    }
    inst(chokeGeo, chokeMat, chokes, g, true);
    inst(chamferBox(0.035, 0.008, 0.05, 0.001), chip, mos, g);
    inst(chamferBox(0.05, 0.018, 0.034, 0.002), L.mat('polymer', { color: 0x16171a, metalness: 0.4, roughness: 0.3 }), bigCaps, g);

    // --- miles de pasivos 0402/0603 + ICs pequeños
    const bodies = [];
    const bodyCols = [];
    const colA = new THREE.Color(0x8a7458);
    const colB = new THREE.Color(0x121315);
    const colC = new THREE.Color(0x5c4a36);
    let guard = 0;
    while (bodies.length < 4200 && guard++ < 60000) {
      const x = -1.6 + R() * 3.2;
      const z = -1.11 + R() * 1.18;
      if (!free(x, z)) continue;
      const big = R() < 0.18;
      const sc = big ? 1.55 : 1;
      bodies.push(TRS(x, top + 0.0025 * sc, z, qY(R() < 0.5 ? 0 : Math.PI / 2), sc));
      bodyCols.push(R() < 0.55 ? colA : R() < 0.75 ? colB : colC);
    }
    // anillos de desacoplo alrededor de cada módulo de memoria
    for (const mg of mems)
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const x = mg.position.x + Math.cos(a) * 0.165;
        const z = mg.position.z + Math.sin(a) * 0.13;
        if (!inPoly(x, z)) continue;
        bodies.push(TRS(x, top + 0.0025, z, qY(a)));
        bodyCols.push(colA);
      }
    const bodyMesh = inst(mlccBody, L.mat('passive', { color: 0xffffff, roughness: 0.5 }), bodies, g);
    bodyCols.forEach((c, i) => bodyMesh.setColorAt(i, c));
    bodyMesh.instanceColor.needsUpdate = true;
    inst(mlccTerm, L.mat('tin', { color: 0xc9ccd1, metalness: 1, roughness: 0.3 }), bodies, g);
    const ics = [];
    guard = 0;
    while (ics.length < 70 && guard++ < 20000) {
      const x = -1.55 + R() * 3.1;
      const z = -1.08 + R() * 1.1;
      const w = 0.025 + R() * (R() < 0.2 ? 0.09 : 0.035);
      if (!free(x, z, w)) continue;
      ics.push(TRS(x, top + 0.003, z, qY(R() < 0.5 ? 0 : Math.PI / 2), V(w / 0.05, 1, (w * (0.7 + R() * 0.6)) / 0.05)));
    }
    inst(chamferBox(0.05, 0.006, 0.05, 0.0012), chip, ics, g);
    // conectores placa a placa con pines
    const connBody = chamferBox(0.13, 0.012, 0.024, 0.0015);
    const conns = [[-1.25, -0.95], [1.25, -1.07], [-0.3, 0.04], [0.5, 0.04]];
    inst(connBody, L.mat('connector', { color: 0xe4e1d8, roughness: 0.5 }), conns.map(([x, z]) => TRS(x, top + 0.006, z)), g, true);
    const pinsC = [];
    for (const [x, z] of conns) for (let i = 0; i < 30; i++) for (const sz of [-1, 1]) pinsC.push(TRS(x - 0.058 + i * 0.004, top + 0.0125, z + sz * 0.006));
    inst(new THREE.BoxGeometry(0.0016, 0.0006, 0.005), gold, pinsC, g);
    // tornillos de la placa
    addScrews(L, g, [[-1.55, top, -1.05], [1.55, top, -1.05], [-1.55, top, -0.15], [1.55, top, -0.15], [0, top, 0.02, 0.3]]);

    // --- SSD M.2 2280
    const m2 = L.mat('m2', { color: 0x0e2c1d, metalness: 0.2, roughness: 0.4, clearcoat: 0.7 });
    const ssd = new THREE.Group();
    ssd.position.set(1.25, top + 0.005, -0.62);
    ssd.rotation.y = Math.PI / 2;
    ssd.add(mesh(chamferBox(0.8, 0.008, 0.22, 0.001), m2));
    ssd.add(mesh(chamferBox(0.12, 0.012, 0.12, 0.002), chip, -0.2, 0.009, 0));
    ssd.add(mesh(chamferBox(0.2, 0.013, 0.15, 0.002), chip, 0.02, 0.009, 0));
    ssd.add(mesh(chamferBox(0.2, 0.013, 0.15, 0.002), chip, 0.25, 0.009, 0));
    const ssdLbl = L.reg(new THREE.MeshPhysicalMaterial({ map: printedLabel(['NVMe SSD', 'PCIe · M.2 2280', 'S/N 5X21-0968-RT'], { w: 1024, h: 320, bg: '#101114', fg: '#e8ebef' }), metalness: 0.5, roughness: 0.3 }));
    const sl = mesh(new THREE.PlaneGeometry(0.52, 0.16), ssdLbl, 0.12, 0.0161, 0);
    sl.rotation.x = -Math.PI / 2;
    ssd.add(noShadow(sl));
    const fingers = [];
    for (let i = 0; i < 34; i++) if (i !== 8 && i !== 26) fingers.push(TRS(-0.39, 0.0045, -0.09 + i * 0.0055));
    inst(new THREE.BoxGeometry(0.03, 0.0005, 0.0038), gold, fingers, ssd);
    const ssdCaps = [];
    for (let i = 0; i < 60; i++) ssdCaps.push(TRS(-0.36 + R() * 0.72, 0.0065, -0.1 + R() * 0.2, qY(R() < 0.5 ? 0 : Math.PI / 2)));
    inst(mlccBody, ceramic, ssdCaps, ssd);
    addScrews(L, ssd, [[0.41, 0.004, 0]], 0.8);
    g.add(ssd);
    parts.ssd = ssd;

    // --- Wi-Fi (M.2 2230) con apantallado y cables de antena
    const wifi = new THREE.Group();
    wifi.position.set(-1.3, top + 0.005, -0.3);
    wifi.add(mesh(chamferBox(0.3, 0.008, 0.22, 0.001), m2));
    const shieldMat = L.mat('shield', { color: 0xb9bec6, metalness: 1, roughness: 0.28, normalMap: beadFine.normal, normalScale: new THREE.Vector2(0.4, 0.4) });
    wifi.add(mesh(chamferBox(0.2, 0.012, 0.16, 0.0015), shieldMat, 0.02, 0.009, 0));
    for (const zc of [-0.05, 0.05]) wifi.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.008, 20), gold, 0.12, 0.009, zc));
    const coaxB = L.mat('coaxB', { color: 0x151515, roughness: 0.5 });
    const coaxW = L.mat('coaxW', { color: 0xd3d6da, roughness: 0.5 });
    wifi.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.12, 0.014, -0.05), V(0.2, 0.03, -0.2), V(0.26, 0.03, -0.75), V(0.3, 0.02, -0.82)]), 60, 0.006, 8), coaxB));
    wifi.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.12, 0.014, 0.05), V(0.24, 0.03, 0.1), V(0.28, 0.02, 0.25)]), 30, 0.006, 8), coaxW));
    g.add(wifi);
    parts.wifi = wifi;

    anchor('board', g, 1.62, 0.07, -0.4);
    anchor('soc', soc, 0.37, 0.02, 0.1);
    anchor('gpu', gpuDie, -0.05, 0.01, 0.05);
    anchor('cpu', cpuDie, 0.05, 0.01, 0.05);
    anchor('mem', mems[7], 0.1, 0.02, 0.08);
  }

  // ------------------------------------------------ REFRIGERACIÓN
  {
    const L = layers.cooling;
    const g = L.group;
    const copper = copperMat(L);
    const y0 = 0.072;
    // disipador de cobre mecanizado
    const spOut = roundedRectOutline(0.9, 0.62, 0.04, 10, 3);
    const spGeo = ringSweep(spOut, [...plateRings(-0.002, y0 - 0.001, [0, 0.6, 1]), ...arc(-0.002, y0 + 0.001, 0.002, -Math.PI / 2, 0, 2).slice(1), { o: 0, y: y0 + 0.01 }, ...arc(-0.002, y0 + 0.01, 0.002, 0, Math.PI / 2, 3).slice(1), ...plateRings(-0.002, y0 + 0.012, [1, 0.94, 0.8, 0.6, 0.35, 0], {}).slice(1)], {
      planar: [0.9, 0.62],
      refFace: { j: 4, dir: 'out' },
    });
    const sp = mesh(spGeo, copper, 0, 0, -0.56);
    sp.castShadow = sp.receiveShadow = true;
    g.add(sp);
    const heat = shaderMat(HEAT_FS, { uHeat: { value: 0 } }, true);
    L.glows.push(heat);
    const hp = mesh(new THREE.PlaneGeometry(0.9, 0.62), heat, 0, y0 + 0.0135, -0.56);
    hp.rotation.x = -Math.PI / 2;
    g.add(noShadow(hp));
    parts.heat = heat;
    // brazos de presión en X + tornillos con muelle
    const steel = steelMat(L);
    for (const a of [0.6, -0.6]) {
      const arm = mesh(chamferBox(0.66, 0.003, 0.034, 0.0012), steel, 0, y0 + 0.0145, -0.56);
      arm.rotation.y = a;
      arm.castShadow = true;
      g.add(arm);
    }
    const spring = springGeometry(0.009, 0.022, 5, 0.0013);
    const armEnds = [];
    for (const a of [0.6, -0.6]) for (const sgn of [-1, 1]) armEnds.push([Math.cos(a) * 0.3 * sgn, -0.56 - Math.sin(a) * 0.3 * sgn]);
    inst(spring, steel, armEnds.map(([x, z]) => TRS(x, y0 - 0.008, z)), g);
    addScrews(L, g, armEnds.map(([x, z]) => [x, y0 + 0.016, z, R()]));
    inst(new THREE.TorusGeometry(0.011, 0.0015, 8, 24).rotateX(Math.PI / 2), steel, armEnds.map(([x, z]) => TRS(x, y0 + 0.0158, z)), g);
    // heatpipes aplanados
    const P = (x, z) => V(x, y0 + 0.016, z);
    const routes = [
      [P(-0.25, -0.62), P(-0.55, -0.8), P(-0.78, -1.02), P(-1.3, -1.04), P(-1.72, -1.04)],
      [P(0.25, -0.5), P(0.55, -0.78), P(0.78, -1.02), P(1.3, -1.04), P(1.72, -1.04)],
    ];
    const pipes = [];
    for (const r of routes) {
      const c = new THREE.CatmullRomCurve3(r);
      const tg = new THREE.TubeGeometry(c, 220, 0.02, 20);
      tg.scale(1, 0.5, 1);
      tg.translate(0, (y0 + 0.016) * 0.5, 0);
      const pm = new THREE.Mesh(tg, copper);
      pm.castShadow = true;
      g.add(pm);
      pipes.push(c);
    }
    parts.pipes = pipes;
    const pmat = basicGlow(L, new THREE.Color(1, 0.35, 0.05), 4, 0);
    const pcount = 60;
    const pInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 8, 6), pmat, pcount);
    g.add(noShadow(pInst));
    parts.heatParticles = { mesh: pInst, mat: pmat, count: pcount, seeds: Array.from({ length: pcount }, () => R()) };
    // bloques de aletas con pestañas dobladas
    const finG = finGeometry(0.042, 0.22, 0.0011, 0.0095);
    const finList = [];
    for (const [a, b] of [[-1.7, -0.78], [0.78, 1.7]]) for (let x = a; x <= b; x += 0.011) finList.push(TRS(x, y0 + 0.017, -1.06));
    inst(finG, L.mat('fin', { color: 0xc7ccd3, metalness: 1, roughness: 0.2 }), finList, g, true);
    // ventiladores: voluta, tapa con boca, rotor con 71 álabes curvos
    const housing = blackPlastic(L);
    const cover = L.mat('fanCover', { color: 0x101113, metalness: 0.5, roughness: 0.3, clearcoat: 0.6, normalMap: beadFine.normal, normalScale: new THREE.Vector2(0.2, 0.2) });
    const bladeMat = L.mat('blade', { color: 0x1d1f24, metalness: 0.15, roughness: 0.32, clearcoat: 0.4 });
    const vol = voluteGeometries(0.3, 0.036, 0.07, 0.007, 0.8);
    const blade = bladeGeometry(0.3 * 0.36, 0.3 - 0.006, 0.026, 0.55, 0.0028);
    const hubProfile = [V(0, 0, 0), V(0.105, 0, 0), V(0.108, 0.02, 0), V(0.1, 0.029, 0), V(0.06, 0.032, 0), V(0, 0.032, 0)].map((v) => new THREE.Vector2(v.x, v.y));
    const hubGeo = new THREE.LatheGeometry(hubProfile, 48);
    const fans = [];
    for (const [x, z] of [[-1.12, -0.55], [1.12, -0.55]]) {
      const f = new THREE.Group();
      f.position.set(x, y0 - 0.012, z);
      f.add(mesh(vol.base, housing));
      const wallM = mesh(vol.wall, housing);
      wallM.castShadow = true;
      f.add(wallM);
      f.add(mesh(vol.cover, cover));
      const rotor = new THREE.Group();
      rotor.position.y = 0.004;
      rotor.add(mesh(hubGeo, housing));
      const ac = mesh(new THREE.RingGeometry(0.035, 0.05, 48), basicGlow(L, GREEN, 3, 1), 0, 0.0325, 0);
      ac.rotation.x = -Math.PI / 2;
      rotor.add(noShadow(ac));
      const bl = [];
      for (let i = 0; i < 71; i++) bl.push(TRS(0, 0.016, 0, qY((i / 71) * Math.PI * 2)));
      inst(blade, bladeMat, bl, rotor);
      // anillo exterior de los álabes
      rotor.add(mesh(new THREE.TorusGeometry(0.296, 0.0018, 6, 96).rotateX(Math.PI / 2), bladeMat, 0, 0.029, 0));
      const bm = new THREE.MeshBasicMaterial({ color: 0x24262b, transparent: true, opacity: 0, depthWrite: false });
      const blur = mesh(new THREE.RingGeometry(0.108, 0.3, 64), bm, 0, 0.0305, 0);
      blur.rotation.x = -Math.PI / 2;
      rotor.add(noShadow(blur));
      f.add(rotor);
      // cable del ventilador
      f.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.01, 0.33), V(-0.05 * Math.sign(x), 0.01, 0.42), V(-0.25 * Math.sign(x), 0.0, 0.5)]), 30, 0.004, 6), L.mat('fanCable', { color: 0x0a0a0a, roughness: 0.6 })));
      g.add(f);
      fans.push({ group: f, rotor, blurMat: bm });
    }
    parts.fans = fans;
    const am = basicGlow(L, new THREE.Color(0.55, 0.85, 1.0), 2.4, 0);
    const acount = 60;
    const air = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, 0.006, 0.45), am, acount);
    g.add(noShadow(air));
    parts.air = { mesh: air, mat: am, count: acount, seeds: Array.from({ length: acount * 3 }, () => R()) };
    anchor('cooling', g, 1.72, y0 + 0.03, -0.5);
    anchor('fanL', fans[0].group, 0, 0.04, 0);
  }

  // ------------------------------------------------ TECLADO (top case + teclas esculpidas con leyendas)
  {
    const L = layers.keyboard;
    const g = L.group;
    const alu = aluMatte(L);
    const yTop = 0.114;
    const deckOut = roundedRectOutline(W, D, 0.14, 28, 3);
    const deckGeo = ringSweep(
      deckOut,
      [
        ...plateRings(-0.012, 0.1035, [0, 0.5, 0.85, 1], { m: 2 }),
        { o: -0.012, y: 0.0752, m: 2 },
        { o: -0.001, y: 0.0752, m: 0 },
        ...arc(-0.001, 0.0762, 0.001, -Math.PI / 2, 0, 2, { m: 0 }).slice(1),
        { o: 0, y: 0.1045, m: 1 },
        { o: -0.003, y: 0.1075, m: 0 },
        ...arc(-0.0095, 0.1075, 0.0065, 0, Math.PI / 2, 5, { m: 0 }).slice(1),
        { o: -0.03, y: yTop, m: 0, flat: true },
      ],
      { planar: [W, D], refFace: { j: 7, dir: 'out' } }
    );
    const deck = new THREE.Mesh(deckGeo, [alu, aluChamfer(L), L.mat('deckInner', { color: 0x1a1c20, metalness: 0.6, roughness: 0.5 })]);
    deck.castShadow = deck.receiveShadow = true;
    g.add(deck);
    // placa superior con el hueco del teclado
    const hx0 = -1.44;
    const hx1 = 1.44;
    const hz0 = -1.1;
    const hz1 = -0.02;
    const plate = rrShape(W - 0.06, D - 0.06, 0.11);
    const hr = 0.022;
    const holeShape = rrShape(hx1 - hx0, hz1 - hz0, hr);
    const holePts = holeShape.getPoints(8).map((p) => new THREE.Vector2(p.x, p.y + -(hz0 + hz1) / 2));
    plate.holes.push(new THREE.Path(holePts));
    const plateG = new THREE.ShapeGeometry(plate, 16);
    plateG.rotateX(-Math.PI / 2);
    planarUV(plateG, -W / 2, -D / 2, W, D);
    const pm = mesh(plateG, alu, 0, yTop, 0);
    pm.receiveShadow = true;
    g.add(pm);
    // paredes del hueco (mecanizadas) y fondo
    const wellOut = roundedRectOutline(hx1 - hx0, hz1 - hz0, hr, 6, 3);
    const wellWall = ringSweep(wellOut, [{ o: 0, y: yTop }, { o: 0, y: 0.1042 }], { refFace: { j: 0, dir: 'out' } });
    wellWall.index.array.reverse();
    wellWall.computeVertexNormals();
    g.add(mesh(wellWall, aluMachined(L), 0, 0, (hz0 + hz1) / 2));
    g.add(mesh(new THREE.BoxGeometry(hx1 - hx0, 0.002, hz1 - hz0), L.mat('well', { color: 0x0a0b0d, metalness: 0.4, roughness: 0.55, normalMap: beadFine.normal }), 0, 0.1032, (hz0 + hz1) / 2));
    // touchpad de cristal con canto brillante
    const tpOut = roundedRectOutline(1.3, 0.8, 0.03, 8, 3);
    const tpGeo = ringSweep(tpOut, [{ o: 0, y: yTop - 0.001, m: 0 }, { o: 0, y: yTop + 0.0015, m: 1 }, { o: -0.0015, y: yTop + 0.003, m: 0 }, ...plateRings(-0.0015, yTop + 0.003, [1, 0.6, 0], { m: 0 }).slice(1)], { planar: [1.3, 0.8], refFace: { j: 0, dir: 'out' } });
    g.add(mesh(tpGeo, [L.mat('tp', { color: 0x2a2d33, metalness: 0.45, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 }), aluChamfer(L)], 0, 0, 0.62));
    // microperforaciones de altavoz a ambos lados del teclado
    const perf = [];
    for (const sx of [-1, 1])
      for (let iz = 0; iz < 84; iz++)
        for (let ix = 0; ix < 17; ix++) perf.push(TRS(sx * (1.515 + ix * 0.0112 + (iz % 2) * 0.0056), yTop + 0.00008, -1.05 + iz * 0.0115));
    inst(new THREE.CircleGeometry(0.0033, 10).rotateX(-Math.PI / 2), L.mat('perf', { color: 0x040405, roughness: 1 }), perf, g);
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
    const labels = [
      ['esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'ins', 'supr'],
      ['º', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', "'", '¡', '⌫'],
      ['⇥', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '`', '+', '⏎'],
      ['⇪', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ', '´', 'intro'],
      ['⇧', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '-', '⇧'],
      ['ctrl', 'fn', 'alt', '', 'alt gr', '◀', '▲', '▼', '▶'],
    ];
    const atlasLabels = [];
    const keys = [];
    const x0 = -(15 * u) / 2;
    rows.forEach((row, ri) => {
      let x = x0;
      const z = -1.0 + ri * u - (ri === 0 ? 0.02 : 0);
      row.forEach((w, ci) => {
        const lab = labels[ri][ci];
        let cell = atlasLabels.indexOf(lab);
        if (cell < 0) {
          cell = atlasLabels.length;
          atlasLabels.push(lab);
        }
        keys.push({ x: x + (w * u) / 2, z, w: w * u - 0.024, h: ri === 0 ? u * 0.62 : u - 0.024, cell });
        x += w * u;
      });
    });
    const cap = L.mat('cap', { color: 0x1b1c20, metalness: 0.05, roughness: 0.46, clearcoat: 0.25, clearcoatRoughness: 0.4, normalMap: beadFine.normal, normalScale: new THREE.Vector2(0.12, 0.12) });
    const capH = 0.012;
    const capY = 0.1062;
    const byShape = new Map();
    keys.forEach((k, i) => {
      const key = `${k.w.toFixed(3)}x${k.h.toFixed(3)}`;
      if (!byShape.has(key)) byShape.set(key, { w: k.w, h: k.h, list: [] });
      byShape.get(key).list.push(k);
    });
    for (const { w, h, list } of byShape.values()) {
      const kg = keycapGeometry(w, h, capH, 0.016);
      inst(kg, cap, list.map((k) => TRS(k.x, capY, k.z)), g, true);
    }
    // retroiluminación bajo las teclas
    const glowMat = new THREE.MeshBasicMaterial({ color: WHITE_KEY.clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    glowMat.userData.baseOpacity = 1;
    const kgm = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMat, keys.length);
    noShadow(kgm);
    const qf = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    keys.forEach((k, i) => {
      kgm.setMatrixAt(i, TRS(k.x, 0.1045, k.z, qf, V(k.w + 0.03, k.h + 0.03, 1)));
      kgm.setColorAt(i, new THREE.Color(0, 0, 0));
    });
    g.add(kgm);
    // leyendas retroiluminadas (atlas)
    const atlas = legendAtlas(atlasLabels, 2048);
    const legendMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { tAtlas: { value: atlas }, uDim: { value: 1 } },
      vertexShader: `
        attribute vec2 aCell; varying vec2 vUv; varying vec3 vCol;
        void main(){
          vUv = (aCell + uv) / 8.0;
          #ifdef USE_INSTANCING_COLOR
            vCol = instanceColor;
          #else
            vCol = vec3(1.0);
          #endif
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D tAtlas; uniform float uDim; varying vec2 vUv; varying vec3 vCol;
        void main(){ float a = texture2D(tAtlas, vUv).a; gl_FragColor = vec4(vCol * a * 1.6 * uDim, 1.0); }`,
    });
    L.glows.push(legendMat);
    const lgGeo = new THREE.PlaneGeometry(1, 1);
    const cellAttr = new Float32Array(keys.length * 2);
    keys.forEach((k, i) => {
      cellAttr[i * 2] = k.cell % 8;
      cellAttr[i * 2 + 1] = 7 - Math.floor(k.cell / 8);
    });
    lgGeo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cellAttr, 2));
    const legend = new THREE.InstancedMesh(lgGeo, legendMat, keys.length);
    noShadow(legend);
    keys.forEach((k, i) => {
      const s = Math.min(k.w, k.h) * 0.62;
      legend.setMatrixAt(i, TRS(k.x, capY + capH - 0.0011, k.z, qf, V(s, s, 1)));
      legend.setColorAt(i, new THREE.Color(0, 0, 0));
    });
    g.add(legend);
    parts.keys = { glow: kgm, legend, list: keys, mat: glowMat };
    anchor('keyboard', g, 1.72, yTop + 0.006, 0.2);
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
    const backM = L.mat('back', { color: 0x2e3137, metalness: 0.85, roughness: 0.32, normalMap: bead.normal, normalScale: new THREE.Vector2(0.2, 0.2) });
    const glass = L.mat('glass', { color: 0x030304, metalness: 0.1, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.0, reflectivity: 0.6 });
    const panel = new THREE.Group();
    panel.position.set(0, 0.007, HD - 0.02);
    const pOut = roundedRectOutline(3.5, 2.42, 0.1, 16, 3);
    const pGeo = ringSweep(
      pOut,
      [
        ...plateRings(-0.004, -0.006, [0, 0.5, 0.9, 1], { m: 0 }),
        ...arc(-0.004, -0.002, 0.004, -Math.PI / 2, 0, 3, { m: 0 }).slice(1),
        { o: 0, y: 0.003, m: 1 },
        ...arc(-0.003, 0.003, 0.003, 0, Math.PI / 2, 3, { m: 1 }).slice(1),
        ...plateRings(-0.003, 0.006, [1, 0.9, 0.5, 0], { m: 1 }).slice(1),
      ],
      { planar: [3.5, 2.42], refFace: { j: 6, dir: 'out' } }
    );
    const body = new THREE.Mesh(pGeo, [backM, glass]);
    body.castShadow = body.receiveShadow = true;
    panel.add(body);
    const scr = shaderMat(SCREEN_FS, { uPower: { value: 0 }, uDemo: { value: 0 } });
    L.glows.push(scr);
    const screen = mesh(new THREE.PlaneGeometry(3.42, 2.14), scr, 0, 0.0062, 0.1);
    screen.rotation.x = -Math.PI / 2;
    screen.visible = false;
    panel.add(noShadow(screen));
    const tandem = shaderMat(SCREEN_FS, { uPower: { value: 0 }, uDemo: { value: 1 } }, true);
    L.glows.push(tandem);
    const t2 = mesh(new THREE.PlaneGeometry(3.42, 2.14), tandem, 0, 0.0063, 0.1);
    t2.rotation.x = -Math.PI / 2;
    t2.visible = false;
    panel.add(noShadow(t2));
    // cámara (en el marco superior)
    const lens = L.mat('lens', { color: 0x07080c, metalness: 0.9, roughness: 0.05, iridescence: 1, iridescenceIOR: 2.0, iridescenceThicknessRange: [300, 700], clearcoat: 1 });
    const camG = new THREE.Group();
    camG.position.set(0, 0.0062, 1.19);
    camG.add(mesh(new THREE.CircleGeometry(0.0055, 32).rotateX(-Math.PI / 2), lens));
    camG.add(mesh(new THREE.RingGeometry(0.0058, 0.0085, 32).rotateX(-Math.PI / 2), L.mat('camRing', { color: 0x1a1b1e, metalness: 0.8, roughness: 0.25 })));
    camG.add(mesh(new THREE.CircleGeometry(0.0022, 16).rotateX(-Math.PI / 2), L.mat('irLed', { color: 0x200606, roughness: 0.2 }), 0.03, 0, 0));
    panel.add(camG);
    // parte trasera: placa T-CON, flex y cintas
    const tcon = new THREE.Group();
    tcon.position.set(0, -0.0065, -1.08);
    tcon.rotation.x = Math.PI;
    tcon.add(mesh(chamferBox(1.1, 0.004, 0.11, 0.001), L.mat('tconPcb', { color: 0x0d2b1c, metalness: 0.2, roughness: 0.4, clearcoat: 0.7 })));
    const tParts = [];
    for (let i = 0; i < 180; i++) tParts.push(TRS(-0.53 + R() * 1.06, 0.004, -0.045 + R() * 0.09, qY(R() < 0.5 ? 0 : Math.PI / 2), 1 + R()));
    const tconChip = new THREE.InstancedMesh(chamferBox(0.01, 0.005, 0.005, 0.0006), L.mat('passive2', { color: 0x8a7458, roughness: 0.5 }), tParts.length);
    tParts.forEach((mx, i) => tconChip.setMatrixAt(i, mx));
    tcon.add(noShadow(tconChip));
    tcon.add(mesh(chamferBox(0.12, 0.006, 0.08, 0.001), L.mat('tconIc', { color: 0x0c0d0f, roughness: 0.35 }), -0.2, 0.005, 0));
    panel.add(tcon);
    const flexM = L.mat('flexD', { color: 0xc98b2c, metalness: 0.4, roughness: 0.35, clearcoat: 0.8 });
    for (const x of [-0.35, 0.35]) panel.add(mesh(new THREE.BoxGeometry(0.16, 0.0008, 0.18), flexM, x, -0.0068, -0.98));
    const tape = L.mat('tapeBlack', { color: 0x070708, roughness: 0.7 });
    for (const [x, z, w, d] of [[0, 0.2, 2.6, 0.06], [-1.2, 0.6, 0.3, 0.3], [1.2, -0.3, 0.3, 0.3]]) panel.add(mesh(new THREE.BoxGeometry(w, 0.0006, d), tape, x, -0.0066, z));
    const plbl = L.reg(new THREE.MeshPhysicalMaterial({ map: printedLabel(['TANDEM OLED MODULE', 'P/N 16T-OLD-2610', 'G-SYNC · eDP'], { w: 1024, h: 300, bg: '#e9e9e4', fg: '#1a1a1a', accent: '#76b900' }), roughness: 0.5 }));
    const pl = mesh(new THREE.PlaneGeometry(0.32, 0.094), plbl, 0.9, -0.0067, 0.5);
    pl.rotation.x = Math.PI / 2;
    panel.add(noShadow(pl));
    g.add(panel);
    // bisagras
    const hingeM = L.mat('hinge', { color: 0xaab0b8, metalness: 1, roughness: 0.2, normalMap: fly.normal, normalScale: new THREE.Vector2(0.4, 0.4) });
    for (const sx of [-1.28, 1.28]) {
      const hg = new THREE.Group();
      hg.position.set(sx, 0.0, 0.0);
      const barrel = new THREE.CylinderGeometry(0.011, 0.011, 0.24, 32);
      barrel.rotateZ(Math.PI / 2);
      hg.add(mesh(barrel, hingeM));
      hg.add(mesh(chamferBox(0.2, 0.004, 0.12, 0.0015), hingeM, 0, 0.0, 0.07));
      for (const dx of [-0.07, 0, 0.07]) hg.add(mesh(new THREE.TorusGeometry(0.0034, 0.0012, 6, 16).rotateX(Math.PI / 2), hingeM, dx, 0.0025, 0.1));
      g.add(hg);
    }
    parts.panel = panel;
    parts.screen = scr;
    parts.screenMesh = screen;
    parts.tandem = { mesh: t2, mat: tandem };
    anchor('display', g, 1.76, 0.01, HD - 0.02 + 0.2);
    anchor('screenCenter', panel, 0, 0.01, 0.1);
  }

  // ------------------------------------------------ TAPA (unibody con canto diamantado)
  {
    const L = layers.lid;
    const g = L.group;
    root.remove(g);
    lidPivot.add(g);
    const alu = aluMatte(L, 0xa1a6ad);
    const lidGeo = shellGeometry(W, D, 0.14, { h: 0.018, rb: 0.004, rt: 0.006, chamfer: 0.0028, underside: true, inner: false, topPlate: true, cornerSeg: 28 });
    const lid = new THREE.Mesh(lidGeo, [alu, aluChamfer(L)]);
    lid.position.set(0, 0.013, HD - 0.02);
    lid.castShadow = lid.receiveShadow = true;
    g.add(lid);
    // ventana de antenas junto a la bisagra
    g.add(mesh(chamferBox(1.6, 0.0006, 0.014, 0.0002), L.mat('antenna', { color: 0x2b2e33, metalness: 0.2, roughness: 0.55 }), 0, 0.0313, 0.06));
    parts.lidAlu = alu;
    anchor('lid', g, 1.76, 0.03, HD + 0.1);
  }

  return { root, layers, parts, anchors };
}

// textura del sustrato del encapsulado: pads dorados en anillos
function substrateTexture() {
  const R = rng(21);
  return canvasTexture(1024, 768, (g, w, h) => {
    g.fillStyle = '#123321';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(40,80,55,0.6)';
    for (let i = 0; i < 400; i++) g.fillRect(R() * w, R() * h, 2 + R() * 30, 1.5);
    g.fillStyle = 'rgba(200,160,80,0.9)';
    for (let i = 0; i < 90; i++) {
      g.fillRect(40 + i * 10.4, 18, 5, 9);
      g.fillRect(40 + i * 10.4, h - 27, 5, 9);
    }
    g.font = '600 22px Rajdhani, sans-serif';
    g.fillStyle = 'rgba(230,230,220,0.7)';
    g.fillText('2610A1 · TW', 30, h - 40);
  });
}

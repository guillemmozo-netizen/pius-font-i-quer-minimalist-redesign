// Línea de tiempo determinista: dado t (s) coloca piezas, cámara, luces y post-procesado.
import * as THREE from 'three';
import { LAYERS, ORDER, GREEN } from './laptop.js';
import { clamp01, lerp, smooth, seg, win, easeOutBack, easeInOutCubic, easeOutCubic, easeInCubic, easeOutExpo } from './util.js';

const DEG = Math.PI / 180;
const OPEN_ANGLE = -112 * DEG;

// ---------------- cámara: keyframes con interpolación Hermite (C1) ----------------
// az: 0 = de frente (+Z), positivo gira hacia +X. el en grados. stop = velocidad 0 en la llave.
// ease: si se indica, el tramo que EMPIEZA en esa llave usa ese easing entre las dos llaves.
const K = (t, tgt, az, el, dist, fov = 32, o = {}) => ({ t, tgt, az, el, dist, fov, ...o });
const CAM_KEYS = [
  K(0.0, [-1.7, 0.07, 1.15], -52, 3.5, 5.0, 30),
  K(1.9, [-1.4, 0.07, 1.0], -40, 6, 5.6, 30, { stop: true }),
  K(3.45, [0, 0.1, 0], 30, 32, 13.5, 32, { stop: true }),
  K(3.98, [0, 0.1, 0], 31, 33, 12.6, 32, { stop: true, ease: 'outExpo' }),
  K(5.6, [0, 3.0, 0], 36, 19, 17.8, 30),
  K(10.1, [0, 3.0, 0], 14, 16, 17.2, 30),
  K(11.1, [0, 5.25, 0.1], 6, 44, 11.5, 32),
  K(13.2, [0, 5.25, 0.0], -10, 40, 11.0, 32),
  K(14.1, [0, 4.0, -0.35], -18, 47, 9.6, 32),
  K(15.2, [-0.1, 2.95, -0.55], -24, 46, 8.4, 32),
  K(16.6, [-0.1, 1.9, -0.56], 8, 60, 2.7, 30),
  K(20.3, [-0.06, 1.9, -0.56], -8, 56, 2.5, 30),
  K(21.5, [0.1, 1.9, -0.56], 34, 50, 2.6, 30),
  K(24.8, [0.15, 1.9, -0.56], 48, 46, 2.4, 30),
  K(26.1, [0, 1.9, -0.56], 20, 54, 5.8, 32),
  K(30.4, [0, 1.9, -0.56], -24, 46, 5.4, 32),
  K(31.7, [0, 2.32, -0.56], -12, 18, 3.4, 34),
  K(34.8, [0, 2.32, -0.56], 24, 24, 3.1, 34),
  K(36.0, [0, 0.78, 0.55], 18, 50, 9.2, 32),
  K(38.0, [0, 0.78, 0.55], -6, 46, 8.8, 32),
  K(39.3, [0, 0.0, 0.1], 30, -16, 9.6, 30),
  K(42.2, [0, 0.0, 0.1], -18, -10, 9.8, 30),
  K(43.6, [0, 3.0, 0], 20, 18, 17.8, 30, { stop: true, ease: 'inOut' }),
  K(47.3, [0, 0.3, -0.2], 380, 24, 13.0, 32, { stop: true }),
  K(48.8, [0, 0.95, -0.55], 385, 12, 14.0, 32),
  K(54.9, [0, 0.95, -0.55], 340, 10, 13.4, 32),
  K(57.0, [-1.7, 0.07, 1.15], 308, 3.5, 5.0, 30, { stop: true }),
];
const CH = ['x', 'y', 'z', 'az', 'el', 'dist', 'fov'];
const keyVals = CAM_KEYS.map((k) => ({ x: k.tgt[0], y: k.tgt[1], z: k.tgt[2], az: k.az, el: k.el, dist: k.dist, fov: k.fov }));
function tangent(i, c) {
  const k = CAM_KEYS[i];
  if (k.stop || i === 0 || i === CAM_KEYS.length - 1) return 0;
  const a = CAM_KEYS[i - 1];
  const b = CAM_KEYS[i + 1];
  return (keyVals[i + 1][c] - keyVals[i - 1][c]) / (b.t - a.t);
}
const EASES = {
  outExpo: easeOutExpo,
  inOut: easeInOutCubic,
};
function cameraAt(t) {
  const n = CAM_KEYS.length;
  if (t <= CAM_KEYS[0].t) return { ...keyVals[0] };
  if (t >= CAM_KEYS[n - 1].t) return { ...keyVals[n - 1] };
  let i = 0;
  while (CAM_KEYS[i + 1].t < t) i++;
  const a = CAM_KEYS[i];
  const b = CAM_KEYS[i + 1];
  const h = b.t - a.t;
  const u = (t - a.t) / h;
  const out = {};
  if (a.ease) {
    const e = EASES[a.ease](u);
    for (const c of CH) out[c] = lerp(keyVals[i][c], keyVals[i + 1][c], e);
    return out;
  }
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  for (const c of CH) {
    const m0 = b.ease === undefined && a.ease === undefined ? tangent(i, c) : tangent(i, c);
    out[c] = h00 * keyVals[i][c] + h10 * h * m0 + h01 * keyVals[i + 1][c] + h11 * h * tangent(i + 1, c);
  }
  return out;
}

// ruido suave determinista
function noise1(x) {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n) => {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}

// ---------------- foco por capas: separa las de arriba y abajo de la capa enfocada ----------------
const FOCUS = [
  { a: 10.4, b: 13.4, f: 5, up: 1.25, down: 0.35 },
  { a: 13.4, b: 14.6, f: 4, up: 1.35, down: 0.35 },
  { a: 14.6, b: 15.8, f: 3, up: 2.3, down: 0.4 },
  { a: 15.8, b: 35.1, f: 2, up: 1.75, down: 0.45 },
  { a: 35.1, b: 38.3, f: 1, up: 1.75, down: 0.4 },
  { a: 38.3, b: 42.8, f: 0, up: 1.3, down: 0, keep: [6] },
];
const fw = (t, a, b) => smooth((t - (a - 0.3)) / 0.6) * smooth((b + 0.3 - t) / 0.6);

export class Timeline {
  constructor(cues, laptop, cam, post, extras) {
    this.c = cues;
    this.L = laptop;
    this.cam = cam;
    this.post = post;
    this.x = extras;
    this.tmpV = new THREE.Vector3();
    this.tmpM = new THREE.Matrix4();
    this.tmpQ = new THREE.Quaternion();
    this.tmpS = new THREE.Vector3();
    this.keyColor = new THREE.Color();
  }

  beatPulse(t, a = 0, b = 999) {
    if (t < a || t > b) return 0;
    const ph = (t / 0.5) % 1;
    return Math.exp(-ph * 7);
  }

  fanAngle(t) {
    // integra la velocidad (rev/s) para que el giro sea continuo
    const dt = 1 / 120;
    let ang = 0;
    for (let s = 0; s < t; s += dt) ang += this.fanSpeed(s) * dt;
    return ang * Math.PI * 2;
  }
  fanSpeed(t) {
    return 0.35 + 5.2 * win(t, 14.3, 16.4, 0.6, 0.9) + 1.4 * win(t, 31.0, 35.0, 0.6, 0.6) + 0.8 * win(t, 48.6, 55.0, 1, 1);
  }

  apply(t) {
    const c = this.c;
    const { layers, parts } = this.L;
    const S = {}; // estado para el HUD

    // ---- explosión / remontaje
    const slams = c.slams;
    const pre = seg(t, 3.25, 4.0);
    const jitter = 0.004 * Math.sin(t * 95) * pre;
    ORDER.forEach((name, i) => {
      const Ly = LAYERS[name];
      const s0 = c.explode + i * 0.035;
      let p = easeOutBack(seg(t, s0, s0 + 1.05), 1.35);
      let bounce = 0;
      if (i > 0 && t > 43.0) {
        const hit = slams[i - 1];
        p = 1 - easeInCubic(seg(t, hit - 0.42, hit));
        if (t > hit) bounce = -0.035 * Math.exp(-(t - hit) * 14) * Math.cos((t - hit) * 30);
      }
      if (t < c.explode) p = 0;
      let extra = 0;
      let dimK = 0;
      for (const F of FOCUS) {
        const w = fw(t, F.a, F.b);
        if (w <= 0) continue;
        extra += w * (i > F.f ? F.up : i < F.f ? -F.down : 0);
        if (i !== F.f && !(F.keep && F.keep.includes(i))) dimK += w * 0.62;
      }
      const y = Ly.ex * p + extra * (t < 43.6 ? 1 : 0) + bounce + (i * 0.018 * easeInCubic(pre) + jitter) * (t < c.explode ? 1 : 0);
      const grp = layers[name].group;
      grp.position.y = y;
      layers[name].dim(1 - clamp01(dimK));
    });

    // ---- bisagra
    const open = easeInOutCubic(seg(t, c.lidOpen[0], c.lidOpen[1])) - easeInOutCubic(seg(t, c.lidClose[0], c.lidClose[1]));
    parts.lidPivot.rotation.x = OPEN_ANGLE * clamp01(open);

    // ---- pantalla: volteo + OLED tándem
    const flip = smooth(seg(t, 10.55, 11.2)) - smooth(seg(t, 13.1, 13.6));
    const q1 = this.tmpQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
    const q0 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * flip);
    parts.panel.quaternion.copy(q0.multiply(q1));
    parts.panel.position.y = 0.007 + 0.28 * Math.sin(Math.PI * clamp01(flip)) * (flip < 0.999 ? 1 : 0);
    const scrOn = Math.max(win(t, 10.95, 13.3, 0.25, 0.3), win(t, 48.0, 55.9, 0.35, 0.3));
    const scrFlick = t > 10.95 && t < 11.3 ? 0.6 + 0.4 * Math.sign(Math.sin(t * 160)) : 1;
    parts.screen.uniforms.uPower.value = scrOn * scrFlick;
    parts.screen.uniforms.uTime.value = t;
    parts.tandem.mat.uniforms.uPower.value = win(t, 11.4, 13.1, 0.3, 0.3) * 0.9;
    parts.tandem.mat.uniforms.uTime.value = t;
    parts.tandem.mesh.position.y = 0.0063 + 0.22 * easeOutCubic(seg(t, 11.5, 12.1)) * win(t, 11.5, 13.0, 0.01, 0.35);
    S.tandemSplit = win(t, 11.6, 12.9, 0.3, 0.3);

    // ---- teclado: barrido de retroiluminación
    const kb = parts.keys;
    const sweepX = lerp(-1.8, 1.8, seg(t, 13.5, 14.4));
    const sweepOn = win(t, 13.45, 14.7, 0.15, 0.3);
    const base = 0.35 + 0.35 * win(t, 4.0, 43.6, 0.5, 0.5) + 0.75 * win(t, 48.0, 56.0, 0.5, 0.3);
    kb.list.forEach((k, i) => {
      const d = k.x - sweepX;
      const lv = base + sweepOn * 2.4 * Math.exp(-(d * d) / 0.06);
      const g = 0.25 * win(t, 48.6, 55, 1, 1) * (0.5 + 0.5 * Math.sin(k.x * 2 - t * 3));
      this.keyColor.setRGB(0.85 * lv, (0.92 + g) * lv, (1.0 - g * 0.6) * lv);
      kb.glow.setColorAt(i, this.keyColor);
    });
    kb.glow.instanceColor.needsUpdate = true;

    // ---- refrigeración
    parts.heat.uniforms.uHeat.value = win(t, 14.6, 16.0, 0.4, 0.5) + 0.55 * win(t, 31.0, 35.0, 0.5, 0.5);
    parts.heat.uniforms.uTime.value = t;
    const hp = parts.heatParticles;
    hp.mat.opacity = win(t, 14.7, 16.0, 0.3, 0.4) * this.L.layers.cooling.dimValue;
    for (let i = 0; i < hp.count; i++) {
      const curve = parts.pipes[i % parts.pipes.length];
      const u = (hp.seeds[i] + t * 0.45) % 1;
      curve.getPointAt(u, this.tmpV);
      const s = 0.6 + 0.8 * Math.sin(u * Math.PI);
      this.tmpM.compose(this.tmpV, this.tmpQ.identity(), this.tmpS.set(s, s, s));
      hp.mesh.setMatrixAt(i, this.tmpM);
    }
    hp.mesh.instanceMatrix.needsUpdate = true;
    const ang = this.fanAngle(t);
    const spd = this.fanSpeed(t);
    parts.fans.forEach((f, i) => {
      f.rotor.rotation.y = (i % 2 ? -1 : 1) * ang + i * 0.3;
      f.blurMat.opacity = clamp01((spd - 1.6) / 3) * 0.88;
    });
    const air = parts.air;
    const airOn = win(t, 14.8, 16.3, 0.3, 0.5);
    air.mat.opacity = airOn;
    for (let i = 0; i < air.count; i++) {
      const s = air.seeds;
      const left = i % 2 === 0;
      const x = (left ? -1 : 1) * (0.82 + s[i * 3] * 0.86);
      const u = (s[i * 3 + 1] + t * 1.3) % 1;
      const z = -1.18 - u * 1.3;
      const y = 0.09 + (s[i * 3 + 2] - 0.5) * 0.05;
      const sc = airOn * Math.sin(u * Math.PI);
      this.tmpM.compose(this.tmpV.set(x, y, z), this.tmpQ.identity(), this.tmpS.set(1, 1, Math.max(0.001, sc)));
      air.mesh.setMatrixAt(i, this.tmpM);
    }
    air.mesh.instanceMatrix.needsUpdate = true;

    // ---- superchip
    const pulse = this.beatPulse(t, 16.4, 35.1);
    parts.gpuFx.uniforms.uLit.value = seg(t, c.gpuLit[0], c.gpuLit[1]) * (t < 44 ? 1 : 1 - seg(t, 44, 45));
    parts.gpuFx.uniforms.uPulse.value = pulse * 0.35 + 0.8 * win(t, 31.0, 31.6, 0.05, 0.5);
    parts.gpuFx.uniforms.uTime.value = t;
    parts.cpuFx.uniforms.uLit.value = seg(t, c.cpuLit[0], c.cpuLit[1]) * (t < 44 ? 1 : 1 - seg(t, 44, 45));
    parts.cpuFx.uniforms.uPulse.value = pulse * 0.3 + 0.8 * win(t, 31.0, 31.6, 0.05, 0.5);
    parts.cpuFx.uniforms.uTime.value = t;
    parts.linkFx.uniforms.uFlow.value = win(t, 20.9, 44.0, 0.4, 0.8);
    parts.linkFx.uniforms.uTime.value = t;
    const memOn = win(t, 25.3, 35.0, 0.3, 0.5);
    parts.memGlow.forEach((m, i) => {
      const k = seg(t, 25.3 + i * 0.12, 25.5 + i * 0.12);
      m.opacity = memOn * k * (0.55 + 0.45 * pulse);
    });
    const fl = parts.flow;
    fl.mat.opacity = win(t, 25.7, 35.0, 0.4, 0.5);
    fl.paths.forEach((p, i) => {
      let u = (p.seed + t * 0.7) % 1;
      if (p.back) u = 1 - u;
      p.curve.getPoint(u, this.tmpV);
      const s = Math.sin(u * Math.PI) * 1.2;
      this.tmpM.compose(this.tmpV, this.tmpQ.identity(), this.tmpS.set(s, s, s));
      fl.mesh.setMatrixAt(i, this.tmpM);
    });
    fl.mesh.instanceMatrix.needsUpdate = true;
    const rise = easeOutBack(seg(t, 30.95, 31.6), 1.6) * (1 - easeInOutCubic(seg(t, 34.6, 35.2)));
    parts.soc.position.y = 0.067 + 0.42 * rise;
    parts.soc.rotation.y = 0.55 * Math.sin(Math.PI * seg(t, 31.0, 35.2)) * rise;

    // ---- batería
    parts.batteryCells.forEach((cell, i) => {
      if (cell.fill.userData.bx === undefined) cell.fill.userData.bx = cell.fill.position.x;
      const a = c.batteryFill[0] + i * 0.48;
      const s = Math.max(0.0001, easeOutCubic(seg(t, a, a + 0.44)));
      cell.fill.scale.x = s;
      cell.fill.position.x = cell.fill.userData.bx - 0.25 * (1 - s);
      cell.mat.opacity = win(t, 35.4, 38.4, 0.2, 0.5) * (0.8 + 0.2 * pulse);
    });

    // ---- chasis / puertos
    parts.ports.forEach((m, i) => (m.opacity = win(t, 39.2 + i * 0.1, 41.8, 0.2, 0.4)));
    const sw = seg(t, 38.6, 41.2);
    this.x.sweepLight.intensity = 60 * win(t, 38.6, 41.2, 0.3, 0.4);
    this.x.sweepLight.position.set(lerp(-3.2, 3.2, easeInOutCubic(sw)), -1.1, 1.2);

    // ---- juntas brillando antes de abrir
    const seam = win(t, 2.9, 4.08, 0.9, 0.05) * (0.7 + 0.3 * Math.sin(t * 60));
    this.x.seams.forEach((m) => (m.opacity = seam));

    // ---- cámara
    const cv = cameraAt(t);
    const tgt = this.tmpV.set(cv.x, cv.y, cv.z);
    let shake = 0;
    for (const it of [...c.impacts, ...slams]) if (t >= it) shake += (it === c.explode ? 0.9 : 0.35) * Math.exp(-(t - it) * 9);
    const amp = cv.dist * (0.006 * shake + 0.0012);
    const az = (cv.az + noise1(t * 0.7) * 0.6) * DEG;
    const el = (cv.el + noise1(t * 0.6 + 9) * 0.4) * DEG;
    this.cam.position.set(
      tgt.x + cv.dist * Math.cos(el) * Math.sin(az) + noise1(t * 23) * amp,
      tgt.y + cv.dist * Math.sin(el) + noise1(t * 21 + 3) * amp,
      tgt.z + cv.dist * Math.cos(el) * Math.cos(az) + noise1(t * 19 + 7) * amp
    );
    this.cam.fov = cv.fov;
    // desplazamiento óptico: baja el modelo para dejar aire a las tarjetas de datos
    const shift = 0.075 * win(t, 3.6, 56.4, 0.8, 0.6);
    this.cam.setViewOffset(1080, 1920, 0, -1920 * shift, 1080, 1920);
    this.cam.updateProjectionMatrix();
    this.cam.lookAt(tgt);

    // ---- post-procesado
    const P = this.post.params;
    let flash = 0;
    let bloomK = 0;
    const fl2 = (a, amp2, k = 6) => (t >= a ? amp2 * Math.exp(-(t - a) * k) : 0);
    flash += fl2(c.explode, 0.32, 9) + fl2(48.6, 0.35, 7) + fl2(31.0, 0.3, 8) + fl2(56.3, 0.15, 8);
    for (const s of slams) flash += fl2(s, 0.12, 12);
    bloomK += fl2(c.explode, 0.8, 4) + fl2(31.0, 0.6, 3) + fl2(48.6, 0.5, 3);
    P.uFlash.value = clamp01(flash);
    P.uFlashColor.value.setRGB(0.86, 1.0, 0.8);
    P.uBloom.value = 0.2 + 0.35 * bloomK;
    P.uCA.value = 0.0025 + 0.02 * clamp01(flash);
    P.uFade.value = smooth(t / 0.35);
    P.uTime.value = t;
    P.uExposure.value = 1.0;

    // ---- fondo / polvo
    if (this.x.bg) this.x.bg.material.uniforms.uTime.value = t;
    if (this.x.dust) this.x.dust.material.uniforms.uTime.value = t;

    S.t = t;
    S.pulse = pulse;
    S.flash = flash;
    return S;
  }
}

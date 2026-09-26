// Capa de motion graphics 2D (Canvas) en coordenadas de diseño 1080x1920.
import * as THREE from 'three';
import { clamp01, smooth, seg, win, easeOutExpo, easeOutBack, lerp } from './util.js';

const G = '#76b900';
const G_RGB = '118,185,0';
const WHITE = '#ffffff';
const GRAY = '#9aa1a9';
const DW = 1080;
const DH = 1920;

const fmt = (v) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const KEYWORDS = /^(\d|CUDA|RTX|NVIDIA|Spark|N1X|OLED|G-SYNC|Blackwell|NVLink|Grace|petaflop|IA|Arm|aluminio|Aluminio|otoño|unificada|chip|GPU|CPU|GB|mm)/;

export class HUD {
  constructor(canvas, camera, laptop, captions) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.cam = camera;
    this.L = laptop;
    this.caps = captions;
    this.s = canvas.width / DW;
    this.v = new THREE.Vector3();
    this.box = new THREE.Box3();
  }

  // ------------------------------------------------ proyección 3D -> 2D (diseño)
  proj(obj, local = null) {
    const v = this.v;
    if (local) v.copy(local).applyMatrix4(obj.matrixWorld);
    else obj.getWorldPosition(v);
    v.project(this.cam);
    return { x: (v.x * 0.5 + 0.5) * DW, y: (-v.y * 0.5 + 0.5) * DH, ok: v.z < 1 };
  }
  projP(p) {
    const v = this.v.copy(p).project(this.cam);
    return { x: (v.x * 0.5 + 0.5) * DW, y: (-v.y * 0.5 + 0.5) * DH };
  }
  rectOf(obj) {
    this.box.setFromObject(obj);
    const b = this.box;
    let x0 = 1e9;
    let y0 = 1e9;
    let x1 = -1e9;
    let y1 = -1e9;
    for (let i = 0; i < 8; i++) {
      const p = this.projP(new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
    return { x0, y0, x1, y1 };
  }

  // ------------------------------------------------ primitivas
  font(size, weight = 700, fam = 'Saira', italic = false) {
    this.ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${fam}"`;
  }
  text(str, x, y, o = {}) {
    const c = this.ctx;
    this.font(o.size ?? 40, o.weight ?? 700, o.fam ?? 'Saira', o.italic);
    c.textAlign = o.align ?? 'left';
    c.textBaseline = o.base ?? 'alphabetic';
    if ('letterSpacing' in c) c.letterSpacing = `${o.ls ?? 0}px`;
    c.globalAlpha = (o.alpha ?? 1) * this.alpha;
    if (o.glitch > 0.01) {
      const d = o.glitch * 10;
      c.fillStyle = 'rgba(255,0,60,0.8)';
      c.fillText(str, x - d, y);
      c.fillStyle = 'rgba(0,220,255,0.8)';
      c.fillText(str, x + d, y + d * 0.3);
    }
    if (o.shadow) {
      c.shadowColor = 'rgba(0,0,0,0.85)';
      c.shadowBlur = o.shadow;
      c.shadowOffsetY = 4;
    }
    if (o.stroke) {
      c.lineJoin = 'round';
      c.lineWidth = o.stroke;
      c.strokeStyle = o.strokeColor ?? 'rgba(0,0,0,0.75)';
      c.strokeText(str, x, y);
    }
    c.fillStyle = o.color ?? WHITE;
    c.fillText(str, x, y);
    c.shadowColor = 'transparent';
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;
    const w = c.measureText(str).width;
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    c.globalAlpha = 1;
    return w;
  }
  line(x0, y0, x1, y1, color = G, w = 3, alpha = 1) {
    const c = this.ctx;
    c.globalAlpha = alpha * this.alpha;
    c.strokeStyle = color;
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
    c.globalAlpha = 1;
  }
  rect(x, y, w, h, color, alpha = 1) {
    const c = this.ctx;
    c.globalAlpha = alpha * this.alpha;
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
    c.globalAlpha = 1;
  }
  brackets(r, p, color = G) {
    if (p <= 0) return;
    const pad = lerp(60, 18, easeOutExpo(p));
    const x0 = r.x0 - pad;
    const y0 = r.y0 - pad;
    const x1 = r.x1 + pad;
    const y1 = r.y1 + pad;
    const L = Math.min(46, (x1 - x0) * 0.25, (y1 - y0) * 0.25);
    const c = this.ctx;
    c.globalAlpha = p * this.alpha;
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.beginPath();
    for (const [x, y, sx, sy] of [
      [x0, y0, 1, 1],
      [x1, y0, -1, 1],
      [x0, y1, 1, -1],
      [x1, y1, -1, -1],
    ]) {
      c.moveTo(x + sx * L, y);
      c.lineTo(x, y);
      c.lineTo(x, y + sy * L);
    }
    c.stroke();
    c.globalAlpha = 1;
  }
  // etiqueta con línea guía desde un punto 3D
  callout(pt, label, sub, p, side = 'right', color = G) {
    if (p <= 0) return;
    const e = easeOutExpo(p);
    const tx = side === 'right' ? Math.min(pt.x + 170, 1000) : Math.max(pt.x - 170, 80);
    const ty = pt.y - 40;
    const c = this.ctx;
    // punto
    c.globalAlpha = p * this.alpha;
    c.fillStyle = color;
    c.beginPath();
    c.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(pt.x, pt.y, 6 + 10 * e, 0, Math.PI * 2);
    c.globalAlpha = p * (1 - e) * this.alpha;
    c.stroke();
    c.globalAlpha = 1;
    // línea en codo
    const mx = lerp(pt.x, pt.x + (tx - pt.x) * 0.35, 1);
    const k1 = clamp01(e * 2);
    const k2 = clamp01(e * 2 - 1);
    this.line(pt.x, pt.y, lerp(pt.x, mx, k1), lerp(pt.y, ty, k1), color, 2.5, p);
    if (k2 > 0) this.line(mx, ty, lerp(mx, tx, k2), ty, color, 2.5, p);
    const align = side === 'right' ? 'right' : 'left';
    this.text(label, tx, ty - 12, { size: 34, weight: 700, fam: 'Rajdhani', ls: 3, align, alpha: k2, shadow: 12 });
    if (sub) this.text(sub, tx, ty + 34, { size: 26, weight: 600, fam: 'Rajdhani', ls: 2, align, alpha: k2 * 0.85, color: GRAY, shadow: 10 });
  }
  // etiqueta de sección arriba a la izquierda
  tag(num, label, p) {
    if (p <= 0) return;
    const e = easeOutExpo(p);
    const x = 72;
    const y = 212;
    this.rect(x, y - 30, 10, 36, G, p);
    this.text(num, x + 24, y, { size: 38, weight: 800, fam: 'Saira', italic: true, color: G, alpha: p, shadow: 10 });
    this.text(label, x + 92 - 20 * (1 - e), y, { size: 34, weight: 700, fam: 'Rajdhani', ls: 6, alpha: p, shadow: 10 });
  }
  // tarjeta de dato grande
  card(o, p) {
    if (p <= 0) return;
    const e = easeOutExpo(clamp01(p * 1.2));
    const c = this.ctx;
    const x = o.x ?? 72;
    const y = o.y ?? 400;
    const glitch = p < 0.35 ? (0.35 - p) * 3 : 0;
    c.save();
    c.beginPath();
    c.rect(x - 20, y - 260, 1000 * e + 40, 520);
    c.clip();
    const bigW = this.text(o.big, x, y + 24 * (1 - e), { size: o.size ?? 170, weight: 900, fam: 'Saira', italic: true, alpha: p, glitch, shadow: 30, color: o.bigColor ?? WHITE });
    if (o.unit) this.text(o.unit, x + bigW + 14, y + 24 * (1 - e), { size: (o.size ?? 170) * 0.42, weight: 800, fam: 'Saira', italic: true, color: G, alpha: p, shadow: 20 });
    this.rect(x, y + 26, Math.min(560, 600 * e), 5, G, p);
    let yy = y + 78;
    for (const [i, ln] of (o.lines || []).entries()) {
      const k = clamp01((p - 0.25 - i * 0.12) * 3);
      this.text(ln, x, yy, { size: i === 0 ? 44 : 34, weight: i === 0 ? 700 : 600, fam: 'Rajdhani', ls: i === 0 ? 4 : 3, color: i === 0 ? WHITE : GRAY, alpha: p * k, shadow: 14 });
      yy += i === 0 ? 50 : 44;
    }
    c.restore();
  }

  // ------------------------------------------------ subtítulos
  captions(t) {
    const cap = this.caps.find((c) => t >= c.start - 0.05 && t <= c.end + 0.25);
    if (!cap) return;
    const chunk = cap.chunks.find((k) => t >= k.start - 0.05 && t < k.end + (k === cap.chunks[cap.chunks.length - 1] ? 0.25 : 0));
    if (!chunk) return;
    const out = smooth((cap.end + 0.25 - t) / 0.2);
    const c = this.ctx;
    const size = 66;
    this.font(size, 800, 'Saira');
    const space = c.measureText(' ').width;
    // maquetar en líneas de máx 820 px
    const words = chunk.words;
    const lines = [[]];
    let lw = 0;
    for (const w of words) {
      const ww = c.measureText(w.text).width;
      if (lw + ww > 820 && lines[lines.length - 1].length) {
        lines.push([]);
        lw = 0;
      }
      lines[lines.length - 1].push({ ...w, ww });
      lw += ww + space;
    }
    const cy = 1335;
    const lh = size * 1.12;
    const y0 = cy - ((lines.length - 1) * lh) / 2;
    lines.forEach((ln, li) => {
      const total = ln.reduce((a, w) => a + w.ww, 0) + space * (ln.length - 1);
      let x = 520 - total / 2;
      for (const w of ln) {
        const k = clamp01((t - w.start) / 0.12);
        if (k <= 0) {
          x += w.ww + space;
          continue;
        }
        const sc = lerp(1.25, 1, easeOutBack(k, 2));
        const key = KEYWORDS.test(w.text.replace(/^[¿¡…"(]+/, ''));
        c.save();
        c.translate(x + w.ww / 2, y0 + li * lh);
        c.scale(sc, sc);
        this.text(w.text, 0, 0, { size, weight: 800, fam: 'Saira', align: 'center', base: 'middle', color: key ? '#9be22a' : WHITE, stroke: 10, strokeColor: 'rgba(0,0,0,0.7)', shadow: 18, alpha: k * out });
        c.restore();
        x += w.ww + space;
      }
    });
  }

  // ------------------------------------------------ fotograma
  draw(t, S) {
    const c = this.ctx;
    c.setTransform(this.s, 0, 0, this.s, 0, 0);
    this.alpha = smooth(t / 0.4) * (1 - smooth((t - 56.55) / 0.35));
    const P = this.L.parts;
    const A = this.L.anchors;

    // marco fijo: esquinas + progreso + aviso
    const fa = 0.35;
    for (const [x, y, sx, sy] of [
      [40, 40, 1, 1],
      [1040, 40, -1, 1],
      [40, 1880, 1, -1],
      [1040, 1880, -1, -1],
    ]) {
      this.line(x, y, x + sx * 34, y, WHITE, 2, fa);
      this.line(x, y, x, y + sy * 34, WHITE, 2, fa);
    }
    this.rect(0, 0, (DW * t) / 57, 6, G, 0.9);
    this.text('RECREACIÓN 3D ILUSTRATIVA · DATOS: NVIDIA', 72, 128, { size: 22, weight: 600, fam: 'Rajdhani', ls: 3, color: GRAY, alpha: 0.75 });

    // 1) gancho: 14 mm
    const pMM = win(t, 0.3, 3.4, 0.3, 0.35);
    if (pMM > 0) {
      const xw = -1.25;
      const top = this.projP(new THREE.Vector3(xw, 0.149, 1.245));
      const bot = this.projP(new THREE.Vector3(xw, -0.004, 1.245));
      const dx = -46;
      const e = easeOutExpo(seg(t, 0.35, 0.9));
      const midY = (top.y + bot.y) / 2;
      const ty = lerp(midY, top.y, e);
      const by = lerp(midY, bot.y, e);
      this.line(top.x + dx - 14, ty, top.x + dx + 14, ty, G, 3, pMM);
      this.line(bot.x + dx - 14, by, bot.x + dx + 14, by, G, 3, pMM);
      this.line(top.x + dx, ty, bot.x + dx, by, G, 3, pMM);
      this.line(top.x + dx + 14, ty, top.x - 6, top.y, G, 1.5, pMM * 0.7);
      this.line(bot.x + dx + 14, by, bot.x - 6, bot.y, G, 1.5, pMM * 0.7);
      const v = 14 * easeOutExpo(seg(t, 0.35, 1.2));
      this.card({ big: fmt(v), unit: 'mm', lines: ['DE GROSOR', 'PORTÁTIL NVIDIA RTX SPARK'], y: 470, size: 210 }, pMM);
    }

    // 2) comparación CUDA tras la explosión
    const pCmp = win(t, 4.25, 7.25, 0.3, 0.3);
    if (pCmp > 0) {
      const v = 6144 * easeOutExpo(seg(t, 4.3, 5.4));
      this.card({ big: fmt(v), lines: ['NÚCLEOS CUDA'], y: 430, size: 170 }, pCmp);
      const rows = [
        ['RTX 5070 · SOBREMESA', 4.6],
        ['RTX SPARK · N1X', 4.8],
      ];
      rows.forEach(([lab, a], i) => {
        const y = 600 + i * 74;
        const k = easeOutExpo(seg(t, a, a + 0.8));
        this.text(lab, 72, y, { size: 30, weight: 700, fam: 'Rajdhani', ls: 3, alpha: pCmp, shadow: 10, color: i ? WHITE : GRAY });
        this.rect(72, y + 12, 600, 14, 'rgba(255,255,255,0.12)', pCmp);
        this.rect(72, y + 12, 600 * k, 14, i ? G : '#cfd3d8', pCmp);
        this.text(fmt(6144 * k), 690, y + 27, { size: 30, weight: 800, fam: 'Saira', alpha: pCmp * k, shadow: 10 });
      });
      const eq = clamp01((t - 5.7) / 0.2);
      this.text('=', 880, 672, { size: 90, weight: 900, fam: 'Saira', color: G, alpha: pCmp * eq, shadow: 20 });
    }

    // 3) título + rótulos de capas
    const pT = win(t, 7.45, 10.35, 0.3, 0.3);
    if (pT > 0) {
      const e = easeOutExpo(pT);
      this.text('NVIDIA', 72, 300, { size: 46, weight: 700, fam: 'Rajdhani', ls: 14, alpha: pT, color: GRAY, shadow: 10 });
      this.card({ big: 'RTX SPARK', lines: [], y: 440, size: 150 }, pT);
      this.text('CHIP N1X', 72 + 30 * (1 - e), 520, { size: 64, weight: 800, fam: 'Saira Condensed', ls: 6, color: G, alpha: pT, shadow: 14 });
      const items = [
        ['lid', 'TAPA', ''],
        ['display', 'PANTALLA', ''],
        ['keyboard', 'TECLADO', ''],
        ['cooling', 'REFRIGERACIÓN', ''],
        ['board', 'SUPERCHIP', ''],
        ['battery', 'BATERÍA', ''],
        ['tray', 'CHASIS', ''],
      ];
      items.forEach(([k, lab, sub], i) => {
        const a = 7.7 + i * 0.2;
        const p = win(t, a, 10.3, 0.35, 0.25);
        const pt = this.proj(A[k]);
        this.callout(pt, lab, sub, p, 'right');
      });
    }

    // 4) pantalla
    this.tag('01', 'PANTALLA', win(t, 10.6, 13.35, 0.3, 0.25));
    const pD = win(t, 11.0, 13.35, 0.3, 0.25);
    if (pD > 0) {
      this.card({ big: 'OLED', unit: 'TÁNDEM', lines: ['CON NVIDIA G-SYNC', 'DOS CAPAS DE EMISIÓN'], y: 430, size: 170 }, pD);
      this.brackets(this.rectOf(P.panel), pD * 0.9);
      if (S.tandemSplit > 0) {
        const c1 = this.proj(A.screenCenter);
        const c2 = this.proj(P.tandem.mesh);
        this.callout({ x: c2.x + 120, y: c2.y - 10 }, 'CAPA 2', '', S.tandemSplit, 'right');
        this.callout({ x: c1.x + 120, y: c1.y + 30 }, 'CAPA 1', '', S.tandemSplit, 'right');
      }
    }
    // 5) teclado + refrigeración (paso rápido)
    this.tag('02', 'TECLADO', win(t, 13.5, 14.6, 0.2, 0.2));
    this.tag('03', 'REFRIGERACIÓN', win(t, 14.65, 15.85, 0.2, 0.2));

    // 6) superchip
    this.tag('04', 'SUPERCHIP', win(t, 15.9, 35.05, 0.3, 0.3));
    const pG = win(t, 16.7, 20.75, 0.3, 0.25);
    if (pG > 0) {
      const v = 6144 * clamp01(seg(t, 16.9, 19.4));
      this.card({ big: fmt(v), lines: ['NÚCLEOS CUDA', 'GPU BLACKWELL', 'TENSOR CORES 5.ª GEN · FP4'], y: 430 }, pG);
      this.brackets(this.rectOf(P.gpuDie), pG);
    }
    const pC = win(t, 20.95, 25.15, 0.3, 0.25);
    if (pC > 0) {
      const v = 20 * clamp01(seg(t, 21.7, 23.6));
      this.card({ big: fmt(v), unit: 'NÚCLEOS', lines: ['CPU NVIDIA GRACE (ARM)', 'UNIDA POR NVLINK-C2C'], y: 430 }, pC);
      this.brackets(this.rectOf(P.cpuDie), pC);
      const lk = this.proj(P.soc, new THREE.Vector3(0.0975, 0.03, 0.08));
      this.callout(lk, 'NVLINK-C2C', 'CPU ⇄ GPU', win(t, 21.2, 25.1, 0.35, 0.25), 'left');
    }
    const pM = win(t, 25.35, 30.75, 0.3, 0.25);
    if (pM > 0) {
      this.card({ big: '128', unit: 'GB', lines: ['MEMORIA UNIFICADA', 'LPDDR5X · UN SOLO BLOQUE PARA CPU Y GPU'], y: 430 }, pM);
      // esquema CPU <-> MEM <-> GPU
      const y = 700;
      const k = easeOutExpo(seg(t, 25.8, 26.6));
      const boxes = [
        ['CPU', 150],
        ['MEMORIA', 430],
        ['GPU', 710],
      ];
      boxes.forEach(([lab, x], i) => {
        const a = pM * clamp01(k * 3 - i);
        this.ctx.globalAlpha = a * this.alpha;
        this.ctx.strokeStyle = i === 1 ? G : WHITE;
        this.ctx.lineWidth = 2.5;
        this.ctx.strokeRect(x - 80, y - 38, 160 + (i === 1 ? 60 : 0), 60);
        this.ctx.globalAlpha = 1;
        this.text(lab, x + (i === 1 ? 30 : 0), y + 2, { size: 30, weight: 700, fam: 'Rajdhani', ls: 3, align: 'center', base: 'middle', alpha: a });
      });
      const dash = (t * 120) % 24;
      for (const [x0, x1] of [
        [230, 350],
        [510 + 60, 630],
      ]) {
        this.ctx.save();
        this.ctx.setLineDash([12, 12]);
        this.ctx.lineDashOffset = -dash;
        this.line(x0, y - 8, x1, y - 8, G, 3, pM * k);
        this.ctx.lineDashOffset = dash;
        this.line(x0, y + 8, x1, y + 8, G, 3, pM * k);
        this.ctx.restore();
      }
    }
    const pA = win(t, 31.0, 35.15, 0.2, 0.25);
    if (pA > 0) {
      this.card({ big: '1', unit: 'PETAFLOP', lines: ['DE RENDIMIENTO DE IA (FP4)', 'HASTA · SEGÚN NVIDIA'], y: 450, size: 210 }, pA);
      const digits = '1.000.000.000.000.000';
      const n = Math.floor(digits.length * clamp01(seg(t, 31.8, 33.2)));
      this.text(digits.slice(0, n), 72, 700, { size: 54, weight: 800, fam: 'Saira Condensed', ls: 4, color: G, alpha: pA, shadow: 14 });
      this.text('OPERACIONES POR SEGUNDO', 72, 750, { size: 28, weight: 600, fam: 'Rajdhani', ls: 4, color: GRAY, alpha: pA * clamp01(seg(t, 33.0, 33.4)), shadow: 10 });
      this.brackets(this.rectOf(P.soc), pA);
    }

    // 7) batería
    this.tag('05', 'BATERÍA', win(t, 35.3, 38.3, 0.3, 0.25));
    const pB = win(t, 35.6, 38.3, 0.3, 0.25);
    if (pB > 0) {
      this.card({ big: 'TODO', unit: 'EL DÍA', lines: ['DE AUTONOMÍA', '*SEGÚN NVIDIA'], y: 430 }, pB);
      // icono de batería
      const x = 72;
      const y = 640;
      this.ctx.globalAlpha = pB * this.alpha;
      this.ctx.strokeStyle = WHITE;
      this.ctx.lineWidth = 4;
      this.ctx.strokeRect(x, y, 220, 90);
      this.ctx.fillStyle = WHITE;
      this.ctx.fillRect(x + 220, y + 28, 12, 34);
      this.ctx.globalAlpha = 1;
      const f = clamp01(seg(t, 35.5, 37.5));
      for (let i = 0; i < 4; i++) if (f > i / 4) this.rect(x + 10 + i * 52, y + 10, 46, 70, G, pB * clamp01((f - i / 4) * 8));
    }

    // 8) chasis
    this.tag('06', 'CHASIS', win(t, 38.5, 42.8, 0.3, 0.25));
    const pS = win(t, 38.9, 42.8, 0.3, 0.25);
    if (pS > 0) {
      this.card({ big: 'ALUMINIO', lines: ['MECANIZADO DE PRECISIÓN'], y: 430, size: 150 }, pS);
      const k1 = clamp01(seg(t, 40.1, 40.5));
      const k2 = clamp01(seg(t, 41.2, 41.6));
      this.text('DESDE 14 mm', 72, 620, { size: 64, weight: 900, fam: 'Saira', italic: true, alpha: pS * k1, glitch: (1 - k1) * 0.6, shadow: 18 });
      this.text('Y MENOS DE 1,5 kg (3 lb)', 72, 690, { size: 46, weight: 800, fam: 'Saira', italic: true, color: G, alpha: pS * k2, glitch: (1 - k2) * 0.6, shadow: 18 });
    }

    // 9) remontaje
    const pR = win(t, 43.7, 47.5, 0.2, 0.3);
    if (pR > 0) {
      const done = this.L_slams ? this.L_slams.filter((s) => t >= s).length : 0;
      this.text('REMONTAJE', 72, 300, { size: 40, weight: 700, fam: 'Rajdhani', ls: 10, color: GRAY, alpha: pR, shadow: 10 });
      this.text(`${done}/6`, 72, 430, { size: 150, weight: 900, fam: 'Saira', italic: true, alpha: pR, shadow: 24, glitch: S.flash * 2 });
      for (let i = 0; i < 6; i++) this.rect(72 + i * 70, 470, 58, 10, i < done ? G : 'rgba(255,255,255,0.2)', pR);
    }

    // 10) héroe + cierre
    const pH = win(t, 48.8, 52.35, 0.3, 0.3);
    if (pH > 0) {
      this.text('NVIDIA', 72, 300, { size: 46, weight: 700, fam: 'Rajdhani', ls: 14, alpha: pH, color: GRAY, shadow: 10 });
      this.card({ big: 'RTX SPARK', lines: [], y: 440, size: 150 }, pH);
      const pO = win(t, 49.7, 52.35, 0.25, 0.3);
      if (pO > 0) {
        const w = 330;
        this.rect(72, 485, w * easeOutExpo(pO), 70, G, pO);
        this.text('OTOÑO 2026', 92, 536, { size: 44, weight: 900, fam: 'Saira', italic: true, color: '#0a0a0a', alpha: pO * clamp01(pO * 2 - 0.5) });
      }
    }
    const pQ = win(t, 52.3, 56.9, 0.25, 0.3);
    if (pQ > 0) {
      const e = easeOutBack(clamp01((t - 52.3) / 0.45), 1.8);
      const c2 = this.ctx;
      c2.save();
      c2.translate(540, 480);
      c2.scale(e, e);
      this.text('¿TE PASARÍAS', 0, -40, { size: 104, weight: 900, fam: 'Saira', italic: true, align: 'center', alpha: pQ, shadow: 30, stroke: 12 });
      this.text('A ARM?', 0, 70, { size: 130, weight: 900, fam: 'Saira', italic: true, align: 'center', color: G, alpha: pQ, shadow: 30, stroke: 12 });
      c2.restore();
    }

    // subtítulos
    this.captions(t);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
}

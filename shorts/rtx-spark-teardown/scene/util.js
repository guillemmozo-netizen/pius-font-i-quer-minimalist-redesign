// Utilidades deterministas: PRNG con semilla, easing y tramos de tiempo.

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (x) => {
  x = clamp01(x);
  return x * x * (3 - 2 * x);
};
export const easeInOutCubic = (x) => {
  x = clamp01(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOutExpo = (x) => {
  x = clamp01(x);
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
};
export const easeInExpo = (x) => {
  x = clamp01(x);
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
};
export const easeOutBack = (x, s = 1.70158) => {
  x = clamp01(x);
  const c3 = s + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
};
export const easeInOutQuint = (x) => {
  x = clamp01(x);
  return x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2;
};
export const easeOutElastic = (x) => {
  x = clamp01(x);
  if (x === 0 || x === 1) return x;
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};

// progreso 0..1 del tramo [a,b]
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
// ventana: sube en [a, a+fi], se mantiene, baja en [b-fo, b]
export const win = (t, a, b, fi = 0.3, fo = 0.3) =>
  Math.min(smooth((t - a) / fi), smooth((b - t) / fo));
export const easeOutCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeInCubic = (x) => Math.pow(clamp01(x), 3);

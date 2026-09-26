// Post-procesado HDR ligero para render por CPU (SwiftShader):
// escena MSAA 4x half-float -> bloom por cadena de mips -> composición (ACES, aberración, viñeta, grano).
import * as THREE from 'three';

const VS = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const PREFILTER = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold, uKnee;
varying vec2 vUv;
vec3 fetch(vec2 o){ return texture2D(tSrc, vUv + o*uTexel).rgb; }
void main(){
  vec3 c = (fetch(vec2(-1.,-1.)) + fetch(vec2(1.,-1.)) + fetch(vec2(-1.,1.)) + fetch(vec2(1.,1.))) * 0.25;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0*uKnee);
  soft = soft*soft / (4.0*uKnee + 1e-4);
  float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
  gl_FragColor = vec4(min(c*contrib, vec3(40.0)), 1.0);
}`;

const DOWN = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel;
varying vec2 vUv;
vec3 f(vec2 o){ return texture2D(tSrc, vUv + o*uTexel).rgb; }
void main(){
  vec3 a=f(vec2(-2.,2.)), b=f(vec2(0.,2.)), c=f(vec2(2.,2.));
  vec3 d=f(vec2(-2.,0.)), e=f(vec2(0.,0.)), ff=f(vec2(2.,0.));
  vec3 g=f(vec2(-2.,-2.)), h=f(vec2(0.,-2.)), i=f(vec2(2.,-2.));
  vec3 j=f(vec2(-1.,1.)), k=f(vec2(1.,1.)), l=f(vec2(-1.,-1.)), m=f(vec2(1.,-1.));
  vec3 col = e*0.125 + (a+c+g+i)*0.03125 + (b+d+ff+h)*0.0625 + (j+k+l+m)*0.125;
  gl_FragColor = vec4(col, 1.0);
}`;

const UP = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uWeight;
varying vec2 vUv;
vec3 f(vec2 o){ return texture2D(tSrc, vUv + o*uTexel).rgb; }
void main(){
  vec3 col = f(vec2(0.))*4.0 + (f(vec2(-1.,0.))+f(vec2(1.,0.))+f(vec2(0.,-1.))+f(vec2(0.,1.)))*2.0
           + f(vec2(-1.,-1.))+f(vec2(1.,-1.))+f(vec2(-1.,1.))+f(vec2(1.,1.));
  gl_FragColor = vec4(col/16.0*uWeight, 1.0);
}`;

const COMPOSITE = /* glsl */ `
uniform sampler2D tScene, tBloom;
uniform float uBloom, uExposure, uTime, uVignette, uGrain, uCA, uFade, uFlash, uLift;
uniform vec3 uFlashColor;
uniform vec2 uRes;
varying vec2 vUv;
vec3 aces(vec3 x){ const float a=2.51, b=0.03, c=2.43, d=0.59, e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0); }
vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
float hash(vec2 p){ p = fract(p*vec2(443.897, 441.423)); p += dot(p, p.yx+19.19); return fract((p.x+p.y)*p.x); }
void main(){
  vec2 uv = vUv;
  vec2 dir = uv - 0.5;
  float ca = uCA * dot(dir, dir) * 4.0;
  vec3 col;
  col.r = texture2D(tScene, uv - dir*ca).r;
  col.g = texture2D(tScene, uv).g;
  col.b = texture2D(tScene, uv + dir*ca).b;
  col += texture2D(tBloom, uv).rgb * uBloom;
  col = col * uExposure + uLift;
  col = aces(col);
  float v = smoothstep(1.05, 0.2, length(dir*vec2(1.0, 0.72)));
  col *= mix(1.0, v, uVignette);
  col = toSRGB(col);
  col = mix(col, uFlashColor, uFlash);
  col += (hash(uv*uRes + fract(uTime*7.13)*100.0) - 0.5) * uGrain;
  gl_FragColor = vec4(col * uFade, 1.0);
}`;

export class Post {
  constructor(renderer, w, h, samples = 4) {
    this.renderer = renderer;
    this.w = w;
    this.h = h;
    this.sceneRT = new THREE.WebGLRenderTarget(w, h, {
      samples,
      type: THREE.HalfFloatType,
      depthBuffer: true,
    });
    const mk = (div) =>
      new THREE.WebGLRenderTarget(Math.max(1, Math.round(w / div)), Math.max(1, Math.round(h / div)), {
        type: THREE.HalfFloatType,
        depthBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });
    this.mips = [mk(2), mk(4), mk(8), mk(16), mk(32), mk(64)];
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.qs = new THREE.Scene();
    this.qs.add(this.quad);
    const sm = (fs, uniforms, extra = {}) =>
      new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, ...extra });
    this.prefilter = sm(PREFILTER, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1.25 }, uKnee: { value: 0.5 } });
    this.down = sm(DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.up = sm(UP, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uWeight: { value: 1 } }, { blending: THREE.AdditiveBlending, transparent: true });
    this.comp = sm(COMPOSITE, {
      tScene: { value: this.sceneRT.texture },
      tBloom: { value: this.mips[0].texture },
      uBloom: { value: 0.2 },
      uExposure: { value: 1.0 },
      uTime: { value: 0 },
      uVignette: { value: 0.85 },
      uGrain: { value: 0.022 },
      uCA: { value: 0.0025 },
      uFade: { value: 1 },
      uFlash: { value: 0 },
      uFlashColor: { value: new THREE.Color(1, 1, 1) },
      uLift: { value: 0.0 },
      uRes: { value: new THREE.Vector2(w, h) },
    });
    this.params = this.comp.uniforms;
  }

  pass(mat, target, clear = true) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    if (clear) this.renderer.clear();
    this.renderer.render(this.qs, this.cam);
  }

  render(scene, camera) {
    const r = this.renderer;
    r.autoClear = true;
    r.setRenderTarget(this.sceneRT);
    r.render(scene, camera);
    r.autoClear = false;
    // bloom
    const src0 = this.sceneRT;
    this.prefilter.uniforms.tSrc.value = src0.texture;
    this.prefilter.uniforms.uTexel.value.set(1 / src0.width, 1 / src0.height);
    this.pass(this.prefilter, this.mips[0]);
    for (let i = 1; i < this.mips.length; i++) {
      const s = this.mips[i - 1];
      this.down.uniforms.tSrc.value = s.texture;
      this.down.uniforms.uTexel.value.set(1 / s.width, 1 / s.height);
      this.pass(this.down, this.mips[i]);
    }
    for (let i = this.mips.length - 1; i > 0; i--) {
      const s = this.mips[i];
      this.up.uniforms.tSrc.value = s.texture;
      this.up.uniforms.uTexel.value.set(1 / s.width, 1 / s.height);
      this.up.uniforms.uWeight.value = 1.0;
      this.pass(this.up, this.mips[i - 1], false);
    }
    this.pass(this.comp, null);
    r.autoClear = true;
  }
}

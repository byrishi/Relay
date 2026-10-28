import { useEffect, useRef } from 'react';
import { atmosphere } from '../lib/atmosphere';
import { MARK_ASPECT, MARK_BARS } from '../brand/mark';

/**
 * Atmosphere — "Daylight". A pointillist WebGL2 scene on warm paper.
 *
 *  • the original Relay "R" rebuilt from thousands of dots (indigo → coral),
 *    its top scan-lines slowly evaporating upwards; it dissolves as you scroll
 *  • a meadow of dotted stems swaying in the wind, with coral/gold blossoms
 *  • faint sweeping arcs of light in the sky
 *  • when two devices connect the R splits in two and a river of light flows
 *    between them, faster as the real transfer speed rises
 *
 * Dots are alpha-blended (pre-multiplied) into an off-screen buffer, blurred into a
 * soft glow, then composited over a hazy paper gradient. All motion is in the vertex
 * shader; the CPU only updates a few uniforms.
 */

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float hash1(float n){ return fract(sin(n * 12.9898) * 43758.5453); }`;

const POINT_VS = /* glsl */ `#version 300 es
precision highp float;
in vec4 aSeed;
in float aKind;   // 0 meadow · 1 mark A · 2 sky · 3 mark B · 4 stream / mist
in vec2 aMark;    // position inside the R (0..1, y down)
uniform float uTime, uAspect, uPixel, uEnergy, uScroll, uWide, uQuiet;
uniform vec2 uPointer;
uniform vec3 uMode;    // landing, lobby, connected
out vec4 vColor;
out float vStreak;
${NOISE}

const vec3 INDIGO = vec3(0.294, 0.322, 0.878);
const vec3 VIOLET = vec3(0.545, 0.361, 0.965);
const vec3 CORAL  = vec3(1.000, 0.478, 0.271);
const vec3 NAVY   = vec3(0.196, 0.290, 0.392);
const vec3 GOLD   = vec3(0.949, 0.702, 0.239);
const float RA = ${MARK_ASPECT.toFixed(4)};

vec3 dawn(float k) { return k < 0.5 ? mix(INDIGO, VIOLET, k * 2.0) : mix(VIOLET, CORAL, (k - 0.5) * 2.0); }
vec3 bez(vec3 a, vec3 b, vec3 c, float t) { float u = 1.0 - t; return u*u*a + 2.0*u*t*b + t*t*c; }

void main() {
  float t = uTime;
  vec3 p; vec3 col; float a; float size; float streak = 0.0;

  // where the R sits in each state
  vec3 cLand  = vec3(mix(0.0, max(2.3, uAspect * 2.2), uWide), mix(3.0, 1.35, uWide), -5.0);
  float sLand = mix(1.0, 2.2, uWide);
  vec3 cLobby = vec3(0.0, 0.9, -5.8);
  float sLobby = mix(2.7, 3.8, uWide);
  // connected: the canvas is a band at the top of the view; the marks flank the speed readout
  vec3 cA = vec3(-mix(2.75, uAspect * 3.3, uWide), 0.9, -5.8);
  vec3 cB = vec3(-cA.x, cA.y, cA.z);
  float sConn = mix(1.1, 2.5, uWide);

  if (aKind < 0.5) {
    // ── meadow: dotted stems swaying in the wind, some crowned with blossoms
    float stem = floor(aSeed.x * 900.0);
    float h1 = hash1(stem + 1.7), h2 = hash1(stem + 9.3), h3 = hash1(stem + 4.1);
    vec2 b = vec2((h1 * 2.0 - 1.0) * 9.5, -1.6 - h2 * 13.0);
    float hgt = 0.35 + hash1(stem + 2.9) * 0.75;
    float s = aSeed.z;
    float wind = sin(t * 0.8 + b.x * 0.6 + b.y * 0.3) * 0.6 + snoise(vec3(b * 0.3, t * 0.15)) * 0.6;
    vec3 tip = vec3(b.x + wind * 0.22 * hgt, -1.25 + hgt, b.y);
    p = vec3(b.x + wind * s * s * 0.22 * hgt, -1.25 + s * hgt, b.y);
    bool flower = h3 > 0.78 && aSeed.w > 0.72;
    if (flower) {
      float th = aSeed.y * 6.2832;
      float rr = (0.03 + aSeed.z * 0.13) * hgt;
      p = tip + vec3(cos(th) * rr, sin(th) * rr * 0.85 + rr * 0.35, 0.0);
      col = mix(CORAL, GOLD, hash1(stem + 5.5));
      a = 0.85; size = 1.8 + aSeed.w * 1.4;
    } else {
      col = mix(NAVY, INDIGO, s * 0.75);
      a = 0.22 + s * 0.38; size = 0.9 + s * 0.7; streak = 0.6;
    }
    a *= 1.0 - uScroll * 0.3;
  } else if (aKind < 1.5 || (aKind > 2.5 && aKind < 3.5)) {
    // ── the Relay R, made of dots
    bool isB = aKind > 2.5;
    vec3 c = cLand * uMode.x + cLobby * uMode.y + (isB ? cB : cA) * uMode.z;
    float s = sLand * uMode.x + sLobby * uMode.y + sConn * uMode.z;
    vec2 m = aMark;
    vec3 base = c + vec3((m.x - 0.5) * s * RA, (0.5 - m.y) * s, (aSeed.z - 0.5) * 0.06 * s);
    base.x += sin(t * 0.6 + m.y * 9.0) * 0.01 * s;

    // the top scan-lines keep evaporating upwards
    float evap = step(aSeed.w, 0.24) * smoothstep(0.6, 0.0, m.y);
    float r = fract(aSeed.x * 7.0 + t * 0.035);
    vec3 rise = vec3(snoise(vec3(aSeed.xy * 8.0, t * 0.1)) * 0.14 * s, r * r * 0.95 * s, 0.0);

    // scrolling away dissolves the whole mark into drifting dust
    float d = clamp(uScroll * 1.3, 0.0, 1.0) * uMode.x;
    vec3 drift = vec3(snoise(vec3(aSeed.yz * 5.0, t * 0.05)), 0.0, snoise(vec3(aSeed.zx * 5.0, t * 0.05))) * 0.9 * s * d
               + vec3(0.0, aSeed.y * 1.6 * s * d, 0.0);
    p = base + rise * evap + drift;
    a = (0.92 - evap * r * 0.92) * (1.0 - d * 0.85) * (1.0 - uMode.y * 0.35) * (1.0 - uQuiet * 0.72);
    float k = clamp(m.y * 0.9 + (aSeed.y - 0.5) * 0.22 - evap * r * 0.3, 0.0, 1.0);
    col = dawn(k);
    if (aSeed.z > 0.9) col = mix(col, NAVY, 0.65);
    size = 1.2 + aSeed.w * 1.3;
    streak = step(0.55, aSeed.y);
  } else if (aKind < 2.5) {
    // ── sky: sweeping arcs of light and a few floating motes
    if (aSeed.w > 0.82) {
      vec3 q = (aSeed.xyz * 2.0 - 1.0) * vec3(8.0, 2.4, 6.0) + vec3(0.0, 1.8, -7.0);
      q += vec3(snoise(q * 0.2 + t * 0.03), snoise(q * 0.2 + 7.0 + t * 0.03), 0.0) * 0.4;
      p = q; col = mix(INDIGO, CORAL, aSeed.x); a = 0.28; size = 1.0 + aSeed.z * 1.6;
    } else {
      float rad = 3.0 + aSeed.x * 6.5;
      float ang = aSeed.y * 6.2832 + t * (0.03 / (0.5 + aSeed.x));
      float keep = step(fract(aSeed.y * 3.0 + aSeed.x * 0.7), 0.42);
      vec3 cc = vec3(mix(0.5, 2.0, uWide), 4.0, -15.0);
      p = cc + vec3(cos(ang) * rad * 1.7, sin(ang) * rad * 0.38, sin(ang) * 0.8);
      col = mix(GOLD, CORAL, aSeed.z) * 0.95 + 0.05;
      a = 0.16 * keep * (0.5 + 0.5 * sin(ang * 2.0 + t * 0.2));
      size = 1.1;
    }
  } else {
    // ── stream: mist rising off the R (landing/lobby) · river of light (connected)
    vec3 c = cLand * uMode.x + cLobby * uMode.y;
    float s = sLand * uMode.x + sLobby * uMode.y;
    float rr = fract(aSeed.y + t * 0.03 * (0.5 + aSeed.w));
    vec3 mist = vec3(c.x + (aMark.x - 0.5) * s * RA * 1.05, c.y + 0.35 * s + rr * rr * 1.5 * s, c.z + (aSeed.z - 0.5) * 0.2);
    mist.x += snoise(vec3(aSeed.xz * 6.0, t * 0.08)) * 0.05 * s;
    float aMist = (1.0 - rr) * 0.5;
    vec3 colMist = dawn(0.08 + aSeed.z * 0.3);

    float flowS = fract(aSeed.x + t * (0.04 + uEnergy * 0.5));
    vec3 ctrl = vec3(0.0, cA.y + mix(1.3, 1.6, uWide) + uEnergy * 0.3, -6.4);
    vec3 river = bez(cA + vec3(0.0, 0.1, 0.0), ctrl, cB + vec3(0.0, 0.1, 0.0), flowS);
    float env = sin(flowS * 3.14159);
    float tube = (0.03 + 0.06 * (1.0 - uEnergy)) * env;
    river += vec3(0.0, cos(aSeed.y * 6.2832), sin(aSeed.y * 6.2832)) * tube * (0.4 + aSeed.w);
    float aRiver = 0.35 + uEnergy * 0.5;

    float mc = uMode.x + uMode.y;
    p = mist * mc + river * uMode.z;
    col = colMist * mc + dawn(flowS) * uMode.z;
    a = aMist * mc + aRiver * uMode.z;
    size = 1.1 + aSeed.w * 1.2 + uEnergy * uMode.z;
    streak = mc;
  }

  // ── camera: gentle drift, pointer parallax, tilt with scroll
  vec3 cam = vec3(uPointer.x * 0.25 + sin(t * 0.05) * 0.1, 0.5 + uPointer.y * 0.12 - uScroll * 0.35, 1.2);
  vec3 v = p - cam;
  float pitch = -0.04 - uScroll * 0.06;
  v = vec3(v.x, v.y * cos(pitch) - v.z * sin(pitch), v.y * sin(pitch) + v.z * cos(pitch));
  if (v.z > -0.15) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vColor = vec4(0.0); vStreak = 0.0; return; }
  float f = 1.6;
  gl_Position = vec4(v.x * f / uAspect, v.y * f, 0.0, -v.z);
  float dist = -v.z;
  gl_PointSize = clamp(size * uPixel * 2.2 / dist, 1.0, 40.0);
  a *= mix(1.0, 0.2, smoothstep(5.0, 17.0, dist));   // atmospheric fade
  vColor = vec4(col, clamp(a, 0.0, 1.0));
  vStreak = streak;
}`;

const POINT_FS = /* glsl */ `#version 300 es
precision highp float;
in vec4 vColor;
in float vStreak;
out vec4 o;
void main() {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  d.x *= mix(1.0, 3.2, vStreak);          // streak particles are thin vertical lines
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float a = vColor.a * smoothstep(1.0, 0.3, r2);
  o = vec4(vColor.rgb * a, a);            // pre-multiplied
}`;

const QUAD_VS = /* glsl */ `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const BLUR_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir; out vec4 o;
void main(){
  vec4 c = texture(uTex, vUv) * 0.2270270270;
  c += texture(uTex, vUv + uDir * 1.3846153846) * 0.3162162162;
  c += texture(uTex, vUv - uDir * 1.3846153846) * 0.3162162162;
  c += texture(uTex, vUv + uDir * 3.2307692308) * 0.0702702703;
  c += texture(uTex, vUv - uDir * 3.2307692308) * 0.0702702703;
  o = c;
}`;

const COMPOSITE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene, uGlow;
uniform float uTime, uAspect, uEnergy, uPulse, uScroll, uLight;
uniform vec3 uMode;
out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 q = (vUv - vec2(0.5, 0.62)) * vec2(uAspect, 1.0);
  vec4 g = texture(uGlow, vUv);
  vec3 gc = g.a > 0.0005 ? g.rgb / g.a : vec3(0.0);
  float ga = clamp(g.a * (1.2 + uPulse * 2.5 + uEnergy * uMode.z * 1.4), 0.0, 0.6);
  vec4 s = texture(uScene, vUv);
  vec3 col;
  if (uLight > 0.5) {
    // white page: a soft lavender haze, tinted glow, dots laid over it
    col = vec3(1.0);
    col = mix(col, vec3(0.93, 0.93, 1.0), 0.6 * exp(-dot(q, q) * 2.2));
    col = mix(col, gc, ga * 0.35);
    col = col * (1.0 - s.a) + s.rgb * 0.9;
  } else {
    // night background with a faint indigo haze up top
    col = vec3(0.020, 0.027, 0.047);
    col += vec3(0.07, 0.07, 0.20) * exp(-dot(q, q) * 2.2);
    col += gc * ga * 0.55;
    col = col * (1.0 - s.a) + s.rgb;
  }
  col += (hash(vUv * 1000.0 + fract(uTime) * 100.0) - 0.5) * 0.012;
  o = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aSeed');
  gl.bindAttribLocation(p, 1, 'aKind');
  gl.bindAttribLocation(p, 2, 'aMark');
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
  const u: Record<string, WebGLUniformLocation | null> = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i)!;
    u[info.name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}

interface Target { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }

/** Random point on one of the R's scan-line bars, weighted by bar area. */
function markSampler() {
  const areas = MARK_BARS.map(([, , w, h]) => w * h);
  const total = areas.reduce((a, b) => a + b, 0);
  const cdf: number[] = [];
  areas.reduce((acc, a, i) => (cdf[i] = acc + a / total), 0);
  return (): [number, number] => {
    const r = Math.random();
    let i = cdf.findIndex((c) => r <= c);
    if (i < 0) i = MARK_BARS.length - 1;
    const [x, y, w, h] = MARK_BARS[i];
    return [x + Math.random() * w, y + Math.random() * h];
  };
}

export default function Atmosphere() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) { canvas.style.display = 'none'; return; }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia('(max-width: 768px)').matches || (navigator.hardwareConcurrency || 4) <= 4;

    let points, blur, comp;
    try {
      points = compile(gl, POINT_VS, POINT_FS);
      blur = compile(gl, QUAD_VS, BLUR_FS);
      comp = compile(gl, QUAD_VS, COMPOSITE_FS);
    } catch (e) {
      console.warn('[atmosphere] disabled:', e);
      canvas.style.display = 'none';
      return;
    }

    // meadow, mark A, sky, mark B, stream
    // Dark theme: only the two marks and the stream between them (no meadow, no sky).
    const counts = mobile ? [0, 6000, 0, 6000, 3500] : [0, 11000, 0, 11000, 7000];
    const total = counts.reduce((a, b) => a + b, 0);
    const seeds = new Float32Array(total * 4);
    const kinds = new Float32Array(total);
    const marks = new Float32Array(total * 2);
    const sample = markSampler();
    for (let i = 0, k = 0; k < counts.length; k++) {
      for (let j = 0; j < counts[k]; j++, i++) {
        seeds[i * 4] = Math.random(); seeds[i * 4 + 1] = Math.random();
        seeds[i * 4 + 2] = Math.random(); seeds[i * 4 + 3] = Math.random();
        kinds[i] = k;
        const [mx, my] = k === 4 ? [Math.random(), 0] : sample();
        marks[i * 2] = mx; marks[i * 2 + 1] = my;
      }
    }
    const pointVao = gl.createVertexArray()!;
    gl.bindVertexArray(pointVao);
    const buf = (data: Float32Array, loc: number, size: number) => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    buf(seeds, 0, 4); buf(kinds, 1, 1); buf(marks, 2, 2);

    const quadVao = gl.createVertexArray()!;
    gl.bindVertexArray(quadVao);
    const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const makeTarget = (w: number, h: number): Target => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { fb, tex, w, h };
    };
    const freeTarget = (t?: Target) => { if (t) { gl.deleteFramebuffer(t.fb); gl.deleteTexture(t.tex); } };

    let W = 0, H = 0;
    let scene: Target | undefined, bloomA: Target | undefined, bloomB: Target | undefined;
    let dirty = true;
    let scaleNow = 1;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
      const scale = dpr * (mobile ? 0.8 : 0.9);
      scaleNow = scale;
      // sized to its container (the band at the top of the connected view)
      const w = Math.max(2, Math.floor(canvas.clientWidth * scale));
      const h = Math.max(2, Math.floor(canvas.clientHeight * scale));
      dirty = true;
      if (w === W && h === H) return;
      W = w; H = h;
      canvas.width = W; canvas.height = H;
      freeTarget(scene); freeTarget(bloomA); freeTarget(bloomB);
      scene = makeTarget(W, H);
      bloomA = makeTarget(Math.max(2, W >> 2), Math.max(2, H >> 2));
      bloomB = makeTarget(Math.max(2, W >> 2), Math.max(2, H >> 2));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const mode = { x: 1, y: 0, z: 0 };
    let energy = 0, pulse = 0, scroll = 0, wide = 1, quiet = atmosphere.quiet ? 1 : 0;
    let raf = 0, last = performance.now(), time = 20 + Math.random() * 40, lastSig = '';

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const sig = atmosphere.mode + (atmosphere.quiet ? 'q' : '');
      if (sig !== lastSig) { lastSig = sig; dirty = true; }
      if (atmosphere.still && !dirty) { last = now; return; }
      dirty = false;
      const dt = atmosphere.still ? 0.05 : Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt * (reduceMotion ? 0.12 : 1);

      const k = atmosphere.still ? 1 : 1 - Math.exp(-dt * 1.5);
      const target = atmosphere.mode;
      mode.x += ((target === 'landing' ? 1 : 0) - mode.x) * k;
      mode.y += ((target === 'lobby' ? 1 : 0) - mode.y) * k;
      mode.z += ((target === 'connected' ? 1 : 0) - mode.z) * k;
      if (atmosphere.still && Math.abs(mode.x - (target === 'landing' ? 1 : 0)) > 0.01) dirty = true;
      const qT = atmosphere.quiet ? 1 : 0;
      if (atmosphere.still && Math.abs(quiet - qT) > 0.01) dirty = true;
      quiet += (qT - quiet) * k;
      energy += (atmosphere.energy - energy) * (1 - Math.exp(-dt * 2.5));
      if (atmosphere.pulse > pulse) pulse = atmosphere.pulse;
      atmosphere.pulse = 0;
      pulse *= Math.exp(-dt * 2.2);
      pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 2));
      pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 2));
      const sTarget = Math.min(1, window.scrollY / Math.max(1, window.innerHeight * 1.2));
      scroll += (sTarget - scroll) * (1 - Math.exp(-dt * 4));
      const aspect = W / H;
      const wTarget = Math.min(1, Math.max(0, (aspect - 0.9) / 0.6));
      wide += (wTarget - wide) * (1 - Math.exp(-dt * 3));

      // 1) dots → scene buffer (pre-multiplied alpha)
      gl.bindFramebuffer(gl.FRAMEBUFFER, scene!.fb);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(points.p);
      gl.uniform1f(points.u.uTime, time);
      gl.uniform1f(points.u.uAspect, aspect);
      gl.uniform1f(points.u.uPixel, Math.max(H, 760 * scaleNow) / 900 * 3.0);
      gl.uniform1f(points.u.uEnergy, energy);
      gl.uniform1f(points.u.uScroll, scroll);
      gl.uniform1f(points.u.uWide, wide);
      gl.uniform1f(points.u.uQuiet, quiet);
      gl.uniform2f(points.u.uPointer, pointer.x, pointer.y);
      gl.uniform3f(points.u.uMode, mode.x, mode.y, mode.z);
      gl.bindVertexArray(pointVao); gl.drawArrays(gl.POINTS, 0, total);
      gl.disable(gl.BLEND);

      // 2) soft glow: downsample + separable blur, twice
      gl.useProgram(blur.p);
      gl.bindVertexArray(quadVao);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(blur.u.uTex, 0);
      const pass = (src: WebGLTexture, dst: Target, dx: number, dy: number) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
        gl.viewport(0, 0, dst.w, dst.h);
        gl.bindTexture(gl.TEXTURE_2D, src);
        gl.uniform2f(blur.u.uDir, dx / dst.w, dy / dst.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      pass(scene!.tex, bloomA!, 1, 0);
      pass(bloomA!.tex, bloomB!, 0, 1);
      pass(bloomB!.tex, bloomA!, 2.5, 0);
      pass(bloomA!.tex, bloomB!, 0, 2.5);

      // 3) composite over paper
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.useProgram(comp.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene!.tex);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bloomB!.tex);
      gl.uniform1i(comp.u.uScene, 0);
      gl.uniform1i(comp.u.uGlow, 1);
      gl.uniform1f(comp.u.uTime, time);
      gl.uniform1f(comp.u.uAspect, aspect);
      gl.uniform1f(comp.u.uEnergy, energy);
      gl.uniform1f(comp.u.uPulse, pulse);
      gl.uniform1f(comp.u.uScroll, scroll);
      gl.uniform3f(comp.u.uMode, mode.x, mode.y, mode.z);
      gl.uniform1f(comp.u.uLight, document.documentElement.dataset.design === 'light' ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);
    };
    raf = requestAnimationFrame(frame);

    const onLost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); canvas.style.display = 'none'; };
    canvas.addEventListener('webglcontextlost', onLost);
    const onScroll = () => { if (atmosphere.still) dirty = true; };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      canvas.removeEventListener('webglcontextlost', onLost);
      freeTarget(scene); freeTarget(bloomA); freeTarget(bloomB);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ background: 'var(--color-bg)' }}
    />
  );
}

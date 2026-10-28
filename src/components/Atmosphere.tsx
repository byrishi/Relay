import { useEffect, useRef } from 'react';
import { atmosphere } from '../lib/atmosphere';

/**
 * Atmosphere — full-screen WebGL2 luminous particle scene.
 *
 *  • a point-cloud dreamscape (rolling dunes drifting toward the viewer)
 *  • floating motes in volumetric haze
 *  • a light stream that morphs with app state:
 *      landing   → aurora ribbon across the sky
 *      lobby     → a breathing portal ring, waiting for a peer
 *      connected → two luminous nodes joined by a river of light whose
 *                  flow follows the real transfer speed
 *
 * Rendering: additive gaussian point sprites (cleared every frame, no trails)
 * → separable blur (soft bloom) → composite with haze, tone map, vignette, grain.
 * All particle motion lives in the vertex shader; the CPU only updates uniforms.
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
}`;

const POINT_VS = /* glsl */ `#version 300 es
precision highp float;
in vec4 aSeed;
in float aKind;          // 0 terrain · 1 motes · 2 stream
uniform float uTime, uAspect, uPixel, uEnergy, uScroll, uPeers;
uniform vec2 uPointer;
uniform vec3 uMode;      // weights: landing, lobby, connected
out vec3 vColor;
out float vAlpha;
${NOISE}

const vec3 DEEP  = vec3(0.30, 0.45, 1.00);
const vec3 IVORY = vec3(1.00, 0.95, 0.86);
const vec3 PEACH = vec3(1.00, 0.66, 0.52);
const vec3 MINT  = vec3(0.55, 1.00, 0.88);
const vec3 LILAC = vec3(0.72, 0.62, 1.00);

vec3 bezier(vec3 a, vec3 b, vec3 c, float t){ float u=1.-t; return u*u*a + 2.*u*t*b + t*t*c; }

void main(){
  float t = uTime;
  vec3 p; vec3 col; float size; float alpha;

  if (aKind < 0.5) {
    // ── Dreamscape terrain: an endless point-cloud dune field drifting toward us
    float depth = 16.0;
    float z = -mod(aSeed.y * depth - t * 0.12, depth) - 0.6;
    float x = (aSeed.x * 2.0 - 1.0) * (2.0 + (-z) * 0.9);
    float n = snoise(vec3(x * 0.22, z * 0.22 + t * 0.012, 0.0));
    float n2 = snoise(vec3(x * 0.8, z * 0.8, t * 0.05));
    float ridge = 1.0 - abs(n);
    float y = -1.05 + ridge * ridge * 0.75 + n2 * 0.06;
    p = vec3(x, y, z);
    float near = smoothstep(-0.6, -2.0, z);
    float far  = smoothstep(-depth - 0.6, -depth * 0.55, z);
    float crest = smoothstep(0.55, 0.95, ridge);
    col = mix(DEEP, mix(IVORY, PEACH, aSeed.z), crest * 0.85);
    col = mix(col, LILAC, smoothstep(-6.0, -15.0, z) * 0.5);
    alpha = near * far * (0.22 + crest * 0.6) * (1.0 - 0.35 * uMode.z - 0.2 * uMode.y);
    size = 1.6 + aSeed.w * 1.6 + crest * 1.5;
  } else if (aKind < 1.5) {
    // ── Motes suspended in haze, drifting on slow noise currents
    vec3 base = (aSeed.xyz * 2.0 - 1.0) * vec3(7.0, 2.4, 7.0) + vec3(0.0, 0.6, -6.0);
    vec3 q = base * 0.25 + t * 0.03;
    p = base + vec3(snoise(q), snoise(q + 17.1), snoise(q + 31.7)) * 0.55;
    float twinkle = 0.55 + 0.45 * sin(t * (0.6 + aSeed.w * 1.6) + aSeed.x * 40.0);
    col = mix(IVORY, MINT, aSeed.w * 0.6);
    alpha = 0.12 + 0.35 * twinkle * aSeed.w;
    size = 1.0 + aSeed.w * 2.2;
  } else {
    // ── The light stream: one particle set, three choreographies, blended by mode
    float s = fract(aSeed.x + t * (0.012 + uEnergy * 0.08));
    float jitter = snoise(vec3(aSeed.y * 9.0, s * 6.0, t * 0.2));

    // landing: aurora curtain across the sky
    vec3 aur = vec3(mix(-7.5, 7.5, s),
                    1.25 + 0.45 * sin(s * 7.0 + t * 0.15) + aSeed.y * 0.9 * (0.6 + 0.4 * sin(s * 13.0 - t * 0.3)),
                    -8.0 + 2.0 * sin(s * 3.1 + t * 0.07));
    aur += vec3(0.0, jitter * 0.12, jitter * 0.3);

    // lobby: breathing portal ring
    float dir = aSeed.z > 0.5 ? 1.0 : -1.0;
    float ang = aSeed.x * 6.2832 + t * 0.35 * dir * (0.6 + aSeed.w);
    float rad = 2.35 + 0.08 * sin(t * 1.4) + jitter * 0.1 + (aSeed.y - 0.5) * 0.2;
    vec3 ring = vec3(cos(ang) * rad * 1.15, 0.45 + sin(ang) * rad, -4.6 + (aSeed.w - 0.5) * 0.25);

    // connected: luminous nodes with a river of light between them
    // nodes sit outside the UI column; the river arcs high over the content
    vec3 A = vec3(-4.4, 0.55, -4.6);
    vec3 B = vec3( 4.4, 0.55, -4.6);
    vec3 Cc = vec3(0.0, 4.4 + uEnergy * 0.3, -5.4);
    float flowS = fract(aSeed.x + t * (0.05 + uEnergy * 0.55));
    float env = sin(flowS * 3.14159);
    vec3 river = bezier(A, Cc, B, flowS);
    float tube = (0.035 + 0.07 * (1.0 - uEnergy)) * env;
    river += vec3(0.0, cos(aSeed.y * 6.2832), sin(aSeed.y * 6.2832)) * tube * (0.4 + aSeed.w)
           + vec3(0.0, jitter, jitter) * 0.05;
    if (aSeed.z < 0.22) {
      // a fifth of the stream gathers into the two orbs
      vec3 centre = aSeed.z < 0.11 ? A : B;
      float a2 = aSeed.y * 6.2832 + t * (0.4 + aSeed.w);
      float r2 = 0.12 + aSeed.w * 0.3;
      float e2 = acos(aSeed.x * 2.0 - 1.0);
      river = centre + vec3(sin(e2) * cos(a2), cos(e2), sin(e2) * sin(a2)) * r2;
    }

    p = aur * uMode.x + ring * uMode.y + river * uMode.z;
    vec3 cAur = mix(MINT, LILAC, aSeed.y);
    vec3 cRing = mix(IVORY, MINT, aSeed.w);
    vec3 cRiver = mix(mix(IVORY, PEACH, aSeed.w * 0.6), MINT, uEnergy * 0.6);
    col = cAur * uMode.x + cRing * uMode.y + cRiver * uMode.z;
    alpha = (0.35 * uMode.x * (0.4 + 0.6 * aSeed.y)) + 0.8 * uMode.y + (0.45 + uEnergy * 0.5) * uMode.z;
    size = 1.6 + aSeed.w * 2.4 + uEnergy * 1.2 * uMode.z;
  }

  // ── Camera: gentle breathing drift, pointer parallax, and a tilt as the page scrolls
  vec3 cam = vec3(uPointer.x * 0.35 + sin(t * 0.05) * 0.15,
                  0.42 + uPointer.y * 0.18 - uScroll * 0.55,
                  1.2);
  vec3 v = p - cam;
  float pitch = -0.06 - uScroll * 0.10;
  v = vec3(v.x, v.y * cos(pitch) - v.z * sin(pitch), v.y * sin(pitch) + v.z * cos(pitch));
  if (v.z > -0.15) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vAlpha = 0.0; vColor = vec3(0.0); return; }

  float f = 1.6;
  gl_Position = vec4(v.x * f / uAspect, v.y * f, 0.0, -v.z);
  float dist = -v.z;
  gl_PointSize = clamp(size * uPixel * 2.2 / dist, 1.0, 48.0);
  float fog = exp(-dist * 0.075);
  vColor = col;
  vAlpha = alpha * (0.35 + 0.65 * fog);
}`;

const POINT_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vColor;
in float vAlpha;
out vec4 o;
void main(){
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float core = exp(-r2 * 5.0);
  float halo = exp(-r2 * 1.6) * 0.25;
  o = vec4(vColor * (core + halo) * vAlpha * 2.6, 1.0);
}`;

const QUAD_VS = /* glsl */ `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const BLUR_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir; out vec4 o;
void main(){
  vec3 c = texture(uTex, vUv).rgb * 0.2270270270;
  c += texture(uTex, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
  c += texture(uTex, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
  c += texture(uTex, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
  c += texture(uTex, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
  o = vec4(c, 1.0);
}`;

const COMPOSITE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene, uBloom;
uniform float uTime, uAspect, uEnergy, uPulse, uScroll;
uniform vec3 uMode;
out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec3 scene = texture(uScene, vUv).rgb;
  vec3 bloom = texture(uBloom, vUv).rgb;
  vec3 col = scene * 0.9 + bloom * (1.35 + uPulse * 2.0 + uEnergy * 0.6 * uMode.z);

  // night sky gradient
  vec3 sky = mix(vec3(0.010, 0.012, 0.030), vec3(0.030, 0.034, 0.085), smoothstep(0.0, 1.0, vUv.y));
  // atmospheric haze band sitting on the horizon
  float horizon = 0.47 + uScroll * 0.12;
  float haze = exp(-pow((vUv.y - horizon) * 5.0, 2.0));
  vec3 hazeCol = mix(vec3(0.10, 0.12, 0.26), vec3(0.20, 0.16, 0.24), vUv.x);
  // a soft volumetric light shaft from above
  vec2 sp = (vUv - vec2(0.62, 1.1)) * vec2(uAspect, 1.0);
  float shaft = pow(max(0.0, 1.0 - abs(atan(sp.x, -sp.y)) * 2.2), 3.0) * smoothstep(1.4, 0.2, length(sp));
  col += sky + hazeCol * haze * (0.55 + 0.25 * sin(uTime * 0.1)) + vec3(0.09, 0.10, 0.16) * shaft * 0.5;

  // filmic tone map, keeps highlights soft
  col = vec3(1.0) - exp(-col * 1.35);
  col = pow(col, vec3(0.95));

  // vignette
  vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
  col *= smoothstep(1.35, 0.25, length(q));
  // film grain
  col += (hash(vUv * 1000.0 + fract(uTime) * 100.0) - 0.5) * 0.018;
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

export default function Atmosphere() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) { canvas.style.display = 'none'; return; }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia('(max-width: 768px)').matches || (navigator.hardwareConcurrency || 4) <= 4;
    const hdr = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');

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

    // ── Particles: seeds only; everything else is computed on the GPU
    const counts = mobile ? [16000, 2500, 5000] : [42000, 5000, 11000];
    const total = counts[0] + counts[1] + counts[2];
    const seeds = new Float32Array(total * 4);
    const kinds = new Float32Array(total);
    for (let i = 0, k = 0; k < 3; k++) {
      for (let j = 0; j < counts[k]; j++, i++) {
        seeds[i * 4] = Math.random(); seeds[i * 4 + 1] = Math.random();
        seeds[i * 4 + 2] = Math.random(); seeds[i * 4 + 3] = Math.random();
        kinds[i] = k;
      }
    }
    const pointVao = gl.createVertexArray()!;
    gl.bindVertexArray(pointVao);
    const sb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, sb); gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    const kb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, kb); gl.bufferData(gl.ARRAY_BUFFER, kinds, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);

    const quadVao = gl.createVertexArray()!;
    gl.bindVertexArray(quadVao);
    const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const makeTarget = (w: number, h: number): Target => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      if (hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      return { fb, tex, w, h };
    };
    const freeTarget = (t?: Target) => { if (t) { gl.deleteFramebuffer(t.fb); gl.deleteTexture(t.tex); } };

    let W = 0, H = 0, scale = 1;
    let scene: Target[] = [];
    let bloomA: Target | undefined, bloomB: Target | undefined;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
      scale = dpr * (mobile ? 0.7 : 0.8);
      const w = Math.max(2, Math.floor(window.innerWidth * scale));
      const h = Math.max(2, Math.floor(window.innerHeight * scale));
      if (w === W && h === H) return;
      W = w; H = h;
      canvas.width = W; canvas.height = H;
      scene.forEach(freeTarget); freeTarget(bloomA); freeTarget(bloomB);
      scene = [makeTarget(W, H)];
      const bw = Math.max(2, W >> 2), bh = Math.max(2, H >> 2);
      bloomA = makeTarget(bw, bh); bloomB = makeTarget(bw, bh);
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Inputs
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const mode = { x: 1, y: 0, z: 0 };
    let energy = 0, pulse = 0, scroll = 0;
    let raf = 0, last = performance.now(), time = Math.random() * 100;

    let drewStill = false;
    const onResizeRedraw = () => { drewStill = false; };
    window.addEventListener('resize', onResizeRedraw);
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // Animation switched off: draw a single still frame and idle (no GPU work).
      if (atmosphere.still) {
        if (drewStill) { last = now; return; }
        drewStill = true;
      } else drewStill = false;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt * (reduceMotion ? 0.15 : 1);

      // ease everything so state changes morph instead of snapping
      const k = 1 - Math.exp(-dt * 1.6);
      const target = atmosphere.mode;
      mode.x += ((target === 'landing' ? 1 : 0) - mode.x) * k;
      mode.y += ((target === 'lobby' ? 1 : 0) - mode.y) * k;
      mode.z += ((target === 'connected' ? 1 : 0) - mode.z) * k;
      energy += (atmosphere.energy - energy) * (1 - Math.exp(-dt * 2.5));
      if (atmosphere.pulse > pulse) pulse = atmosphere.pulse;
      atmosphere.pulse = 0;
      pulse *= Math.exp(-dt * 2.2);
      pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 2));
      pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 2));
      const sTarget = Math.min(1, window.scrollY / Math.max(1, window.innerHeight * 1.5));
      scroll += (sTarget - scroll) * (1 - Math.exp(-dt * 4));

      const aspect = W / H;
      const next = scene[0];

      // 1) fresh frame every time (no feedback trails)
      gl.bindFramebuffer(gl.FRAMEBUFFER, next.fb);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // 2) particles, additive
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(points.p);
      gl.uniform1f(points.u.uTime, time);
      gl.uniform1f(points.u.uAspect, aspect);
      gl.uniform1f(points.u.uPixel, H / 900 * 3.0);
      gl.uniform1f(points.u.uEnergy, energy);
      gl.uniform1f(points.u.uScroll, scroll);
      gl.uniform1f(points.u.uPeers, atmosphere.peers);
      gl.uniform2f(points.u.uPointer, pointer.x, pointer.y);
      gl.uniform3f(points.u.uMode, mode.x, mode.y, mode.z);
      gl.bindVertexArray(pointVao); gl.drawArrays(gl.POINTS, 0, total);
      gl.disable(gl.BLEND);

      // 3) bloom: downsample + separable blur (twice for a wide, soft glow)
      gl.useProgram(blur.p);
      gl.bindVertexArray(quadVao);
      gl.uniform1i(blur.u.uTex, 0);
      const pass = (src: WebGLTexture, dst: Target, dx: number, dy: number) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
        gl.viewport(0, 0, dst.w, dst.h);
        gl.bindTexture(gl.TEXTURE_2D, src);
        gl.uniform2f(blur.u.uDir, dx / dst.w, dy / dst.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      pass(next.tex, bloomA!, 1, 0);
      pass(bloomA!.tex, bloomB!, 0, 1);
      pass(bloomB!.tex, bloomA!, 2, 0);
      pass(bloomA!.tex, bloomB!, 0, 2);

      // 4) composite to screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.useProgram(comp.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, next.tex);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bloomB!.tex);
      gl.uniform1i(comp.u.uScene, 0);
      gl.uniform1i(comp.u.uBloom, 1);
      gl.uniform1f(comp.u.uTime, time);
      gl.uniform1f(comp.u.uAspect, aspect);
      gl.uniform1f(comp.u.uEnergy, energy);
      gl.uniform1f(comp.u.uPulse, pulse);
      gl.uniform1f(comp.u.uScroll, scroll);
      gl.uniform3f(comp.u.uMode, mode.x, mode.y, mode.z);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);
    };
    raf = requestAnimationFrame(frame);

    const onLost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); canvas.style.display = 'none'; };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', onResizeRedraw);
      window.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('webglcontextlost', onLost);
      scene.forEach(freeTarget); freeTarget(bloomA); freeTarget(bloomB);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full z-0 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse at 50% 45%, #0d1230 0%, #03040a 70%)' }}
    />
  );
}

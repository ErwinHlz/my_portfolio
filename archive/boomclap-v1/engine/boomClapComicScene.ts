/**
 * Boom Clap im Marvel-Comic-Look. Die Nahaufnahme wird unsichtbar gerendert und
 * dann per WebGL-Shader in einen gedruckten Comic verwandelt:
 *   – Tuschekonturen aus Helligkeits- und Farbkanten
 *   – flächige Farbstufen statt weicher Verläufe (Cel-Shading), kräftige Farben
 *   – Ben-Day-Rasterpunkte in den Schatten, Kreuzschraffur im tiefen Schwarz
 *   – Papierton
 * Obendrauf: Panelrahmen, gelbe Erzählkästen und Speedlines bei jedem Boom/Clap.
 */
import { BEAT, beatAt, type AudioLevels } from './boomClapTrack';
import { BoomClapBustScene } from './boomClapBustScene';
import type { SceneState } from './boomClapScene';

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform float u_scale;
varying vec2 v_uv;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 tap(vec2 o) { return texture2D(u_tex, v_uv + o / u_res).rgb; }

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-6)), d / (q.x + 1e-6), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

/* weiche Stufe: harte Farbgrenzen, aber ohne Treppenkanten */
float band(float v, float n) {
  float x = v * n;
  float f = fract(x);
  return (floor(x) + smoothstep(0.42, 0.58, f)) / n;
}

void main() {
  vec3 c = tap(vec2(0.0));
  float px = 1.15 * u_scale;

  // --- Tusche: Sobel auf Helligkeit plus Farbunterschied ---
  float tl = luma(tap(vec2(-px, -px)));
  float t  = luma(tap(vec2(0.0, -px)));
  float tr = luma(tap(vec2(px, -px)));
  float l  = luma(tap(vec2(-px, 0.0)));
  float r  = luma(tap(vec2(px, 0.0)));
  float bl = luma(tap(vec2(-px, px)));
  float b  = luma(tap(vec2(0.0, px)));
  float br = luma(tap(vec2(px, px)));
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  vec3 dcx = tap(vec2(px, 0.0)) - tap(vec2(-px, 0.0));
  vec3 dcy = tap(vec2(0.0, px)) - tap(vec2(0.0, -px));
  float edge = max(length(vec2(gx, gy)), (length(dcx) + length(dcy)) * 0.6);
  float ink = smoothstep(0.26, 0.5, edge);

  // --- Cel-Shading: Helligkeit in Stufen, Farben satter ---
  // Druckfarben sind heller als das nächtliche Filmbild: Tonwerte anheben
  c = pow(c, vec3(0.72)) * 1.06;
  vec3 hsv = rgb2hsv(c);
  float v = hsv.z;
  hsv.z = band(pow(v, 0.92), 4.0);
  hsv.z = max(hsv.z, v * 0.35);
  hsv.y = clamp(hsv.y * 1.3 + 0.04, 0.0, 1.0);
  vec3 col = hsv2rgb(hsv);

  // --- Ben-Day-Raster: Punkte im 45°-Gitter, größer je dunkler ---
  vec2 fc = gl_FragCoord.xy;
  float cell = 6.5 * u_scale;
  mat2 rot = mat2(0.7071, -0.7071, 0.7071, 0.7071);
  vec2 g = rot * fc / cell;
  vec2 f = fract(g) - 0.5;
  // Raster nur in den Mitteltönen, tiefe Schatten bleiben flächig
  float shade = smoothstep(0.82, 0.42, v) * smoothstep(0.1, 0.3, v);
  float rad = sqrt(shade) * 0.62;
  float dotMask = 1.0 - smoothstep(rad - 0.08, rad + 0.08, length(f));
  col = mix(col, col * 0.42, dotMask * step(0.02, shade));

  // --- Kreuzschraffur im tiefen Schatten ---
  float deep = smoothstep(0.16, 0.05, v) * 0.6;
  float h1 = abs(fract((fc.x + fc.y) / (4.0 * u_scale)) - 0.5);
  float h2 = abs(fract((fc.x - fc.y) / (4.0 * u_scale)) - 0.5);
  float hatch = max(1.0 - smoothstep(0.08, 0.2, h1), 1.0 - smoothstep(0.08, 0.2, h2));
  col = mix(col, vec3(0.03, 0.02, 0.05), hatch * deep * 0.85);

  // --- Lichter auf Papierweiß, Papierton, Tusche obenauf ---
  col = mix(col, vec3(1.0, 0.98, 0.92), smoothstep(0.9, 1.0, v) * 0.7);
  col *= vec3(1.0, 0.975, 0.92);
  col = mix(col, vec3(0.05, 0.03, 0.07), ink);
  gl_FragColor = vec4(col, 1.0);
}`;

/** Erzählkästen: ab Beat, Text */
const CAPTIONS: [number, string][] = [
  [-1, 'QUEENS, NEW YORK. PETER PARKER HAT EIN GEHEIMNIS …'],
  [3, 'BOOM! DER BEAT DROPPT – UND MIT IHM DIE MASKE!'],
  [12, 'MIT EINEM SATZ: AB AN DIE DECKE!'],
  [15, 'DOCH ETWAS DUNKLES KRIECHT HERAN …'],
  [20, 'DER SYMBIONT HAT IHN!'],
  [27, 'UND DANN: DIE LANDUNG!'],
  [29.5, 'MIT GROSSER KRAFT KOMMT GROSSER GROOVE.'],
];
const HITS = [3, 4, 11, 12, 19, 20, 27, 28];

export class BoomClapComicScene {
  private ctx: CanvasRenderingContext2D;
  private src = document.createElement('canvas');
  private inner: BoomClapBustScene;
  private glCanvas = document.createElement('canvas');
  private gl: WebGLRenderingContext | null = null;
  private tex: WebGLTexture | null = null;
  private uRes: WebGLUniformLocation | null = null;
  private uScale: WebGLUniformLocation | null = null;
  private dpr = 1;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    const sctx = this.src.getContext('2d');
    if (!sctx) throw new Error('2D-Kontext fehlt');
    this.inner = new BoomClapBustScene(sctx);
    this.inner.grain = false;
    this.initGL();
  }

  get state(): SceneState {
    return this.inner.state;
  }
  get motion() {
    return this.inner.motion;
  }
  set motion(v: boolean) {
    this.inner.motion = v;
  }
  get duration() {
    return this.inner.duration;
  }
  set duration(v: number) {
    this.inner.duration = v;
  }

  private initGL() {
    const gl = this.glCanvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
    if (!gl) return;
    const shader = (type: number, code: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, code);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = shader(gl.VERTEX_SHADER, VERT);
    const fs = shader(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.uRes = gl.getUniformLocation(prog, 'u_res');
    this.uScale = gl.getUniformLocation(prog, 'u_scale');
    this.gl = gl;
  }

  resize(w: number, h: number, dpr: number) {
    this.dpr = dpr;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    this.src.width = pw;
    this.src.height = ph;
    this.glCanvas.width = pw;
    this.glCanvas.height = ph;
    this.inner.resize(w, h, dpr);
    this.gl?.viewport(0, 0, pw, ph);
  }

  render(t: number | null, wall: number, levels?: AudioLevels) {
    this.inner.render(t, wall, levels);
    const ctx = this.ctx;
    const pw = this.src.width;
    const ph = this.src.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const gl = this.gl;
    if (gl && this.tex) {
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.src);
      gl.uniform2f(this.uRes, pw, ph);
      gl.uniform1f(this.uScale, this.dpr);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      ctx.drawImage(this.glCanvas, 0, 0);
    } else {
      // ohne WebGL: Originalbild mit Raster und Papierton
      ctx.drawImage(this.src, 0, 0);
      ctx.fillStyle = 'rgba(255,240,210,0.08)';
      ctx.fillRect(0, 0, pw, ph);
    }

    const k = t === null ? -1 : beatAt(t);
    if (t !== null) this.actionLines(k, pw, ph, wall);
    this.caption(k, pw, ph);
    this.panelFrame(pw, ph);
  }

  /** Speedlines vom Bildrand zur Mitte, kurz nach jedem Boom und Clap */
  private actionLines(k: number, pw: number, ph: number, wall: number) {
    let since = Infinity;
    for (const hk of HITS) if (k >= hk) since = Math.min(since, (k - hk) * BEAT);
    const a = Math.exp(-since * 5) * (this.motion ? 1 : 0.4);
    if (a < 0.02) return;
    const ctx = this.ctx;
    const cx = pw / 2;
    const cy = ph * 0.46;
    const R = Math.hypot(pw, ph) * 0.6;
    const seed = Math.floor(wall * 12);
    ctx.save();
    ctx.fillStyle = `rgba(10,6,14,${0.55 * a})`;
    for (let i = 0; i < 90; i++) {
      const rnd = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
      const jitter = rnd - Math.floor(rnd);
      const ang = (i / 90) * Math.PI * 2 + jitter * 0.05;
      const inner = R * (0.42 + jitter * 0.18);
      const wdt = 0.006 + jitter * 0.01;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
      ctx.lineTo(cx + Math.cos(ang - wdt) * R, cy + Math.sin(ang - wdt) * R);
      ctx.lineTo(cx + Math.cos(ang + wdt) * R, cy + Math.sin(ang + wdt) * R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** gelber Erzählkasten oben links, wie im Heft */
  private caption(k: number, pw: number, ph: number) {
    let text = CAPTIONS[0][1];
    let from = CAPTIONS[0][0];
    for (const [ck, tx] of CAPTIONS)
      if (k >= ck) {
        text = tx;
        from = ck;
      }
    const ctx = this.ctx;
    const u = ph / 540;
    const pop = Math.min(1, Math.max(0, (k - from) * BEAT * 6));
    const fs = Math.round(15 * u);
    ctx.save();
    ctx.font = `${fs}px Impact, 'Arial Black', sans-serif`;
    // Zeilenumbruch auf höchstens ~42 % der Bildbreite
    const maxW = pw * 0.42;
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const wd of words) {
      const tryLine = line ? `${line} ${wd}` : wd;
      if (ctx.measureText(tryLine).width > maxW && line) {
        lines.push(line);
        line = wd;
      } else line = tryLine;
    }
    lines.push(line);
    const pad = 9 * u;
    const lh = fs * 1.18;
    const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
    const bh = lines.length * lh + pad * 1.6;
    const x = 20 * u;
    const y = 20 * u - (1 - pop) * 12 * u;
    ctx.globalAlpha = pop;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x + 4 * u, y + 4 * u, bw, bh);
    ctx.fillStyle = '#ffe14d';
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = '#0a0610';
    ctx.lineWidth = 2.5 * u;
    ctx.strokeRect(x, y, bw, bh);
    ctx.fillStyle = '#0a0610';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x + pad, y + pad * 0.8 + i * lh));
    ctx.restore();
  }

  /** Panelrahmen: Papier-Steg und kräftige Tuschelinie */
  private panelFrame(pw: number, ph: number) {
    const ctx = this.ctx;
    const u = ph / 540;
    const gut = 7 * u;
    ctx.save();
    ctx.fillStyle = '#f4ecd8';
    ctx.beginPath();
    ctx.rect(0, 0, pw, ph);
    ctx.rect(gut, gut, pw - gut * 2, ph - gut * 2);
    ctx.fill('evenodd');
    ctx.strokeStyle = '#0a0610';
    ctx.lineWidth = 3.5 * u;
    ctx.strokeRect(gut, gut, pw - gut * 2, ph - gut * 2);
    ctx.restore();
  }
}

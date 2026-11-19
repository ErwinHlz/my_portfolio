/**
 * Fotorealistischer Palantír per WebGL: echte Lichtbrechung durch die Glaskugel,
 * Fresnel-Spiegelung eines Fensters, volumetrischer 3D-Nebel und glühender Kern.
 * Die Vision schwebt als Bildebene im Inneren und dreht sich mit der Kugel.
 */
import {
  buildVisionLayer,
  loadVisionImages,
  type Orb,
  type OrbColors,
  type OrbFrame,
  type Vision,
} from './palantir';

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUv;
uniform float uTime;
uniform float uClarity;
uniform float uLean;
uniform float uPx;
uniform float uHasVision;
uniform float uStir;
uniform vec2 uWobble;
uniform vec2 uPointer;
uniform mat3 uRot;
uniform sampler2D uVision;
uniform vec3 uDeep;
uniform vec3 uGlass;
uniform vec3 uCore;
uniform vec3 uMist;
uniform vec3 uReflex;
uniform vec3 uRim;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    amp *= 0.5;
  }
  return sum;
}

/* Umgebung, die sich im Glas spiegelt: dunkler Raum, Sprossenfenster, Glut von unten */
vec3 env(vec3 r) {
  vec3 col = mix(uDeep * 0.45, uDeep * 1.25, smoothstep(-0.3, 0.9, r.y));
  col += uCore * 0.55 * smoothstep(-0.1, -0.85, r.y);

  vec3 wd = normalize(vec3(-0.72 + uLean * 0.1 + uWobble.x, 0.72 - uWobble.y, 0.2));
  vec3 wr = normalize(vec3(wd.z, 0.0, -wd.x));
  vec3 wu = cross(wr, wd);
  float facing = dot(r, wd);
  if (facing > 0.0) {
    vec2 q = vec2(dot(r, wr), dot(r, wu)) / facing;
    float box = (1.0 - smoothstep(0.19, 0.24, abs(q.x))) * (1.0 - smoothstep(0.26, 0.31, abs(q.y)));
    float bars = smoothstep(0.014, 0.028, abs(q.x)) * smoothstep(0.014, 0.028, abs(q.y));
    col += uReflex * 13.0 * box * bars;
  }

  vec3 sd = normalize(vec3(0.85 - uLean * 0.2, -0.1, 0.5));
  col += uReflex * 3.0 * smoothstep(0.965, 0.995, dot(r, sd));
  return col;
}

/* Einschlüsse: winzige Punkte, fest mit der Kugel verbunden; machen die Drehung sichtbar */
float speck(vec3 q, float cells, float size, float rarity) {
  vec3 c = floor(q * cells);
  float on = step(rarity, hash(c + 5.1));
  vec3 h = vec3(hash(c), hash(c + 17.3), hash(c + 41.7));
  vec3 point = (c + 0.2 + 0.6 * h) / cells;
  float d = length(q - point) * cells;
  return on * (1.0 - smoothstep(0.0, size, d)) * (0.5 + 0.5 * hash(c + 9.7));
}

float density(vec3 p) {
  float shell = 1.0 - smoothstep(0.5, 0.97, length(p));
  vec2 d = p.xy - uPointer;
  float s = uStir * exp(-dot(d, d) * 6.0);
  float cs = cos(s);
  float sn = sin(s);
  p.xy = uPointer + mat2(cs, sn, -sn, cs) * d;

  vec3 q = uRot * p;
  float t = uTime * 0.15;
  float a = t + q.y * 1.4;
  float ca = cos(a);
  float sa = sin(a);
  q.xz = mat2(ca, sa, -sa, ca) * q.xz;
  float n = fbm(q * 2.1 + vec3(0.0, -t * 1.5, t));
  return smoothstep(0.4, 0.85, n) * shell;
}

void main() {
  vec2 uv = vUv / 0.985;
  float r = length(uv);
  float edge = 1.0 - smoothstep(1.0 - 1.5 * uPx, 1.0, r);
  if (edge <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec3 n = vec3(uv, sqrt(max(1.0 - r * r, 0.0)));
  n = normalize(n);
  vec3 I = vec3(0.0, 0.0, -1.0);
  float cosT = n.z;
  float fres = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);
  vec3 refl = env(reflect(I, n));

  vec3 T = refract(I, n, 1.0 / 1.45);
  vec3 P = n;
  float tExit = max(-2.0 * dot(P, T), 0.0);

  /* Bildebene durch den Mittelpunkt, im Koordinatensystem der gedrehten Kugel */
  vec3 Pl = uRot * P;
  vec3 Tl = uRot * T;
  float tp = -1.0;
  vec4 vis = vec4(0.0);
  if (uHasVision > 0.5 && abs(Tl.z) > 0.0001) {
    tp = -Pl.z / Tl.z;
    if (tp > 0.0 && tp < tExit) {
      vec2 h = (Pl + Tl * tp).xy;
      float fog = 1.0 - uClarity;
      float ang = fog * 1.2 * (1.0 - min(length(h), 1.0));
      float ca = cos(ang);
      float sa = sin(ang);
      h = mat2(ca, sa, -sa, ca) * h / (1.0 + fog * 0.25);
      vec2 tuv = h / 1.8 + 0.5;
      if (tuv.x > 0.0 && tuv.x < 1.0 && tuv.y > 0.0 && tuv.y < 1.0) {
        vis = texture2D(uVision, tuv);
        float front = Pl.z > 0.0 ? 1.0 : 0.5;
        vis.a *= pow(uClarity, 1.4) * front;
      }
    }
  }

  const int STEPS = 12;
  float dt = tExit / float(STEPS);
  float fogAmount = mix(3.4, 0.5, uClarity);
  vec3 acc = vec3(0.0);
  float trans = 1.0;
  bool visDone = vis.a <= 0.0;
  for (int i = 0; i < STEPS; i++) {
    float t = (float(i) + 0.5) * dt;
    if (!visDone && t > tp) {
      acc += trans * vis.rgb * vis.a * 1.08;
      trans *= 1.0 - vis.a;
      visDone = true;
    }
    vec3 p = P + T * t;
    float d = density(p) * fogAmount * dt;
    float heat = smoothstep(0.35, -0.95, p.y);
    vec3 c = mix(uMist, uCore * 1.5, heat * 0.75);
    acc += trans * c * d;
    trans *= exp(-d * 1.6);
  }
  if (!visDone) {
    acc += trans * vis.rgb * vis.a;
    trans *= 1.0 - vis.a;
  }

  vec3 exitP = P + T * tExit;
  float heatBack = smoothstep(0.2, -1.0, exitP.y);
  vec3 back = mix(uDeep, uGlass, 0.55) + uCore * 0.6 * heatBack * (0.85 + 0.15 * sin(uTime * 1.3));
  vec3 interior = acc + trans * back;

  /* Goldstaub in zwei Tiefen: Parallaxe beim Drehen */
  float dust = speck(uRot * (P + T * tExit * 0.3), 7.0, 0.16, 0.55)
    + speck(uRot * (P + T * tExit * 0.62), 5.0, 0.13, 0.5) * 0.7;
  interior += mix(uReflex, uCore, 0.45) * dust * (0.35 + 0.65 * uClarity) * 0.9;

  /* Rand: längerer Weg durchs Glas, dunkler; unten gebündeltes Licht */
  interior *= mix(1.0, 0.3, pow(1.0 - cosT, 2.0));
  interior += uCore * 0.7 * smoothstep(0.72, 0.97, r) * (1.0 - smoothstep(0.97, 1.0, r))
    * smoothstep(0.1, -0.9, uv.y);

  vec3 col = interior * (1.0 - fres) + refl * fres;

  /* Glitzer auf der Oberfläche, heller am Rand, wo das Glas spiegelt */
  float glint = speck(uRot * n, 15.0, 0.15, 0.62);
  col += uReflex * glint * (0.35 + 1.6 * pow(1.0 - cosT, 2.0));
  col += uRim * 0.18 * smoothstep(0.95, 1.0, r);
  col = min(col, vec3(1.0));
  gl_FragColor = vec4(col * edge, edge);
}
`;

const toVec3 = (triplet: string) => {
  const parts = triplet.split(',').map((part) => Number.parseFloat(part) / 255);
  return parts.length === 3 && parts.every((part) => Number.isFinite(part)) ? parts : [0, 0, 0];
};

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Shader konnte nicht erstellt werden');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader-Fehler: ${log}`);
  }
  return shader;
}

export class GlOrbRenderer implements Orb {
  private readonly program: WebGLProgram;
  private readonly buffer: WebGLBuffer;
  private readonly uniforms: Record<string, WebGLUniformLocation | null> = {};
  private readonly images: (HTMLImageElement | null)[];
  private textures: (WebGLTexture | null)[] = [];
  private colors: OrbColors | null = null;
  private size = 0;
  private ratio = 1;
  private lost = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGLRenderingContext,
    private readonly visions: Vision[],
    onImageLoad: () => void,
  ) {
    const program = gl.createProgram();
    if (!program) throw new Error('WebGL-Programm konnte nicht erstellt werden');
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Link-Fehler: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Buffer konnte nicht erstellt werden');
    this.buffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    for (const name of [
      'uTime',
      'uClarity',
      'uLean',
      'uPx',
      'uHasVision',
      'uStir',
      'uWobble',
      'uPointer',
      'uRot',
      'uVision',
      'uDeep',
      'uGlass',
      'uCore',
      'uMist',
      'uReflex',
      'uRim',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
    gl.uniform1i(this.uniforms.uVision!, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    this.images = loadVisionImages(visions, (index) => {
      this.dropTexture(index);
      onImageLoad();
    });

    canvas.addEventListener('webglcontextlost', this.onLost);
  }

  private readonly onLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
  };

  resize(size: number) {
    // Volumetrischer Nebel ist rechenintensiv, daher maximal 1,5-fache Pixeldichte
    this.ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.size = size;
    this.canvas.width = this.canvas.height = Math.round(size * this.ratio);
    this.invalidate();
  }

  setColors(colors: OrbColors) {
    this.colors = colors;
    this.invalidate();
  }

  invalidate() {
    this.textures.forEach((_, index) => this.dropTexture(index));
    this.textures = [];
  }

  dispose() {
    this.invalidate();
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
  }

  private dropTexture(index: number) {
    const texture = this.textures[index];
    if (texture) this.gl.deleteTexture(texture);
    this.textures[index] = null;
  }

  private texture(index: number) {
    const existing = this.textures[index];
    if (existing) return existing;

    const vision = this.visions[index];
    if (!vision || !this.colors) return null;
    const px = Math.min(1024, Math.round(this.size * this.ratio));
    const layer = buildVisionLayer(vision, this.images[index], this.colors, px);
    if (!layer) return null;

    const { gl } = this;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, layer);
    this.textures[index] = texture;
    return texture;
  }

  render(frame: OrbFrame) {
    const { gl, size, colors, uniforms: u } = this;
    if (this.lost || !size || !colors) return;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    const texture = frame.vision >= 0 ? this.texture(frame.vision) : null;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Welt → Kugel: Transponierte von Ry(yaw)·Rx(pitch), spaltenweise
    const cy = Math.cos(frame.yaw);
    const sy = Math.sin(frame.yaw);
    const cx = Math.cos(frame.pitch);
    const sx = Math.sin(frame.pitch);
    gl.uniformMatrix3fv(
      u.uRot!,
      false,
      frame.rotation
        ? Float32Array.from(frame.rotation)
        : new Float32Array([cy, sy * sx, sy * cx, 0, cx, -sx, -sy, cy * sx, cy * cx]),
    );

    const pointer = frame.pointer
      ? [(frame.pointer.x / size) * 2 - 1, 1 - (frame.pointer.y / size) * 2]
      : [0, -3];
    gl.uniform2f(u.uPointer!, pointer[0]!, pointer[1]!);
    gl.uniform1f(u.uTime!, frame.time);
    gl.uniform1f(u.uClarity!, frame.clarity);
    gl.uniform1f(u.uLean!, frame.lean);
    gl.uniform1f(u.uPx!, 2 / this.canvas.width);
    gl.uniform1f(u.uHasVision!, texture ? 1 : 0);
    gl.uniform1f(u.uStir!, frame.stir);
    gl.uniform2f(u.uWobble!, frame.wobble?.[0] ?? 0, frame.wobble?.[1] ?? 0);
    gl.uniform3fv(u.uDeep!, toVec3(colors.deep));
    gl.uniform3fv(u.uGlass!, toVec3(colors.glass));
    gl.uniform3fv(u.uCore!, toVec3(colors.core));
    gl.uniform3fv(u.uMist!, toVec3(colors.mist));
    gl.uniform3fv(u.uReflex!, toVec3(colors.reflex));
    gl.uniform3fv(u.uRim!, toVec3(colors.rim));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

/** Liefert den WebGL-Renderer oder null, wenn WebGL nicht verfügbar ist. */
export function createGlOrb(canvas: HTMLCanvasElement, visions: Vision[], onImageLoad: () => void) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
  }) as WebGLRenderingContext | null;
  if (!gl) return null;

  try {
    return new GlOrbRenderer(canvas, gl, visions, onImageLoad);
  } catch (error) {
    console.warn('Palantír: WebGL nicht nutzbar, nutze 2D-Variante.', error);
    return null;
  }
}

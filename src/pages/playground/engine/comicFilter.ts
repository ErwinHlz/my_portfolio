/**
 * Comic-Filter per WebGL: verwandelt ein Canvas-Bild in gedruckten Marvel-Look.
 *   – Tuschekonturen aus Helligkeits-, Farb- und Deckkraftkanten (die Silhouette
 *     auf transparentem Grund bekommt eine geschlossene Kontur)
 *   – flächige Farbstufen statt weicher Verläufe, kräftigere Farben
 *   – Ben-Day-Raster in den Mitteltönen, Kreuzschraffur im tiefen Schatten
 *   – Papierton
 * Transparenz bleibt erhalten, das Ergebnis kann frei über die Seite gelegt werden.
 */

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
vec4 tap(vec2 o) {
  vec4 s = texture2D(u_tex, v_uv + o / u_res);
  // transparente Bereiche als Schwarz, damit die Silhouette eine Kontur bekommt
  return vec4(s.rgb * s.a, s.a);
}

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
  vec4 s0 = texture2D(u_tex, v_uv);
  vec3 c = s0.rgb;
  float px = 1.15 * u_scale;

  vec4 TL = tap(vec2(-px, -px));
  vec4 T  = tap(vec2(0.0, -px));
  vec4 TR = tap(vec2(px, -px));
  vec4 L  = tap(vec2(-px, 0.0));
  vec4 R  = tap(vec2(px, 0.0));
  vec4 BL = tap(vec2(-px, px));
  vec4 B  = tap(vec2(0.0, px));
  vec4 BR = tap(vec2(px, px));
  float gx = -luma(TL.rgb) - 2.0 * luma(L.rgb) - luma(BL.rgb) + luma(TR.rgb) + 2.0 * luma(R.rgb) + luma(BR.rgb);
  float gy = -luma(TL.rgb) - 2.0 * luma(T.rgb) - luma(TR.rgb) + luma(BL.rgb) + 2.0 * luma(B.rgb) + luma(BR.rgb);
  float ax = -TL.a - 2.0 * L.a - BL.a + TR.a + 2.0 * R.a + BR.a;
  float ay = -TL.a - 2.0 * T.a - TR.a + BL.a + 2.0 * B.a + BR.a;
  vec3 dcx = R.rgb - L.rgb;
  vec3 dcy = B.rgb - T.rgb;
  float edge = max(length(vec2(gx, gy)), (length(dcx) + length(dcy)) * 0.6);
  edge = max(edge, length(vec2(ax, ay)) * 0.7);
  float ink = smoothstep(0.26, 0.5, edge);

  c = pow(c, vec3(0.72)) * 1.06;
  vec3 hsv = rgb2hsv(c);
  float v = hsv.z;
  hsv.z = band(pow(v, 0.92), 4.0);
  hsv.z = max(hsv.z, v * 0.35);
  hsv.y = clamp(hsv.y * 1.3 + 0.04, 0.0, 1.0);
  vec3 col = hsv2rgb(hsv);

  vec2 fc = gl_FragCoord.xy;
  float cell = 6.5 * u_scale;
  mat2 rot = mat2(0.7071, -0.7071, 0.7071, 0.7071);
  vec2 f = fract(rot * fc / cell) - 0.5;
  float shade = smoothstep(0.82, 0.42, v) * smoothstep(0.1, 0.3, v);
  float rad = sqrt(shade) * 0.62;
  float dotMask = 1.0 - smoothstep(rad - 0.08, rad + 0.08, length(f));
  col = mix(col, col * 0.42, dotMask * step(0.02, shade));

  float deep = smoothstep(0.16, 0.05, v) * 0.6;
  float h1 = abs(fract((fc.x + fc.y) / (4.0 * u_scale)) - 0.5);
  float h2 = abs(fract((fc.x - fc.y) / (4.0 * u_scale)) - 0.5);
  float hatch = max(1.0 - smoothstep(0.08, 0.2, h1), 1.0 - smoothstep(0.08, 0.2, h2));
  col = mix(col, vec3(0.03, 0.02, 0.05), hatch * deep * 0.85);

  col = mix(col, vec3(1.0, 0.98, 0.92), smoothstep(0.9, 1.0, v) * 0.7);
  col *= vec3(1.0, 0.975, 0.92);
  col = mix(col, vec3(0.05, 0.03, 0.07), ink);
  gl_FragColor = vec4(col, max(s0.a, ink));
}`;

export class ComicFilter {
  private canvas = document.createElement('canvas');
  private gl: WebGLRenderingContext | null = null;
  private tex: WebGLTexture | null = null;
  private uRes: WebGLUniformLocation | null = null;
  private uScale: WebGLUniformLocation | null = null;

  constructor() {
    const gl = this.canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
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

  /** ohne WebGL liefert process() das Originalbild zurück */
  get available() {
    return this.gl !== null;
  }

  /** Bild filtern; das Ergebnis gilt bis zum nächsten Aufruf */
  process(src: HTMLCanvasElement, scale: number): CanvasImageSource {
    const gl = this.gl;
    if (!gl || !this.tex) return src;
    if (this.canvas.width !== src.width || this.canvas.height !== src.height) {
      this.canvas.width = src.width;
      this.canvas.height = src.height;
      gl.viewport(0, 0, src.width, src.height);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.uniform2f(this.uRes, src.width, src.height);
    gl.uniform1f(this.uScale, scale);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return this.canvas;
  }
}

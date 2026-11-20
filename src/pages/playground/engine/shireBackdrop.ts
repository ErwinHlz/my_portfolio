/**
 * Himmel und Hügelland für den Anfang der Fahrt: sanfte grüne Hügel,
 * runde Türen in den Hängen, ein großer Festbaum und Schäfchenwolken.
 */
import { hex, mixRGB, rgba, seeded, type RGB } from './canvasUtils';

export interface ShireBackdropState {
  time: number;
  /** geglättete Kurvenstärke, -1 … 1 – verschiebt Sonne und Wolken nur leicht */
  px: number;
  /** aufsummierte Drehung durch Kurven – die Hügel scrollen damit endlos weiter */
  turn: number;
  /** 0 = Tag, 1 = Nacht */
  night: number;
  motion: boolean;
}

/** dieselbe Abdunklung, die nachts auch über Straße und Kulisse gelegt wird */
export const NIGHT_TINT: RGB = [8, 14, 40];
export const NIGHT_TINT_ALPHA = 0.6;

const mixStops = (day: string, night: string, t: number) => rgba(mixRGB(hex(day), hex(night), t));

interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
}

interface Peak {
  /** Position innerhalb einer Periode, 0 … 1 */
  x: number;
  height: number;
  width: number;
  jag: number;
}

interface MountainRange {
  peaks: Peak[];
  rock: string;
  shade: string;
  snow: string;
  snowShade: string;
  /** Periode in Bildschirmbreiten */
  period: number;
  /** Pixel Verschiebung pro Einheit Drehung */
  shift: number;
}

interface HillLayer {
  base: number;
  amp: number;
  freq: number;
  phase: number;
  color: string;
  /** Pixel Verschiebung pro Einheit Drehung (Parallaxe) */
  shift: number;
}

const LAYERS: HillLayer[] = [
  { base: 0.075, amp: 0.035, freq: 2.3, phase: 0.4, color: '#a5c9a0', shift: 3 },
  { base: 0.04, amp: 0.032, freq: 3.1, phase: 2.1, color: '#86b862', shift: 7 },
  { base: 0.012, amp: 0.022, freq: 4.4, phase: 4.2, color: '#6aa244', shift: 12 },
];

/** Modulo, das auch für negative Werte im Bereich 0 … period bleibt */
const wrap = (v: number, period: number) => ((v % period) + period) % period;

const DOOR_COLORS = ['#2f6b3a', '#b8402f', '#d4a62a', '#2f5c9e', '#7a3f8f'];

export class ShireBackdrop {
  private w = 0;
  private h = 0;
  private horizon = 0;
  private clouds: Cloud[] = [];
  private farTrees: number[] = [];
  private ranges: MountainRange[] = [];
  private stars: { x: number; y: number; r: number; phase: number }[] = [];
  private night = 0;
  /** Gipfel, in dem die leuchtende Höhle liegt (der höchste der vorderen Kette) */
  private cavePeak = 0;
  /** Bildschirmposition der Höhle in CSS-Pixeln, null wenn nicht sichtbar */
  cave: { x: number; y: number; r: number } | null = null;

  constructor(private ctx: CanvasRenderingContext2D) {}

  resize(width: number, height: number, horizon: number): void {
    this.w = width;
    this.h = height;
    this.horizon = horizon;
    const rand = seeded(73);
    this.clouds = Array.from({ length: 7 }, () => ({
      x: rand(),
      y: 0.12 + rand() * 0.45,
      size: 0.6 + rand() * 0.8,
      speed: 4 + rand() * 6,
    }));
    this.farTrees = Array.from({ length: 22 }, () => rand());
    this.stars = Array.from({ length: 140 }, () => ({
      x: rand() * width,
      y: rand() * horizon * 0.8,
      r: 0.4 + rand() * 1.2,
      phase: rand() * Math.PI * 2,
    }));

    // Nebelgebirge: eine dunstige hintere und eine kräftigere vordere Kette
    const range = (
      count: number,
      minH: number,
      varH: number,
      base: Omit<MountainRange, 'peaks'>,
    ) => ({
      ...base,
      peaks: Array.from({ length: count }, (_, i) => ({
        x: (i + rand() * 0.6) / count,
        height: minH + rand() * varH,
        width: 0.7 + rand() * 0.6,
        jag: rand(),
      })),
    });
    this.cave = null;
    this.ranges = [
      range(11, 0.14, 0.1, {
        rock: '#a7b4c8',
        shade: '#93a1b8',
        snow: '#eef3f9',
        snowShade: '#d3dcea',
        period: 1.9,
        shift: 1.2,
      }),
      range(8, 0.1, 0.12, {
        rock: '#8392a9',
        shade: '#6d7c95',
        snow: '#f6f9fc',
        snowShade: '#cdd7e6',
        period: 1.6,
        shift: 2,
      }),
    ];
    // ein hoher Gipfel, der zu Beginn gut sichtbar mitten im Bild steht
    const front = this.ranges[this.ranges.length - 1];
    let best = -1;
    front.peaks.forEach((p, i) => {
      const screenX = p.x * front.period;
      if (screenX < 0.25 || screenX > 0.75) return;
      if (best < 0 || p.height > front.peaks[best].height) best = i;
    });
    this.cavePeak = Math.max(0, best);
  }

  render(s: ShireBackdropState): void {
    const { ctx, w, h, horizon } = this;
    if (!w || !h) return;

    this.night = s.night;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, mixStops('#4f9fdc', '#070c24', s.night));
    sky.addColorStop(0.55, mixStops('#9fd0f0', '#16224a', s.night));
    sky.addColorStop(1, mixStops('#f6ecc8', '#3a3f6a', s.night));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon + 1);
    ctx.fillStyle = this.n('#79ad4f');
    ctx.fillRect(0, horizon, w, h - horizon);

    this.drawStars(s);
    this.drawSun(s);
    this.cave = null;
    this.ranges.forEach((r, i) => this.drawRange(r, s, i === this.ranges.length - 1));
    this.drawClouds(s);
    LAYERS.forEach((layer, i) => this.drawHills(layer, i, s));
  }

  /** dunkelt eine Farbe passend zur Nacht ab */
  private n(color: string, amount = NIGHT_TINT_ALPHA): string {
    if (this.night < 0.003) return color;
    return rgba(mixRGB(hex(color), NIGHT_TINT, amount * this.night));
  }

  /** warmer Lichthof um Fenster und Lampions */
  private glow(x: number, y: number, r: number): void {
    if (this.night < 0.05) return;
    const { ctx } = this;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,200,120,${0.55 * this.night})`);
    g.addColorStop(1, 'rgba(255,180,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  private drawStars(s: ShireBackdropState): void {
    if (s.night < 0.05) return;
    const { ctx, w, h } = this;
    ctx.fillStyle = '#fff';
    for (const star of this.stars) {
      ctx.globalAlpha = s.night * (0.55 + 0.45 * Math.sin(s.time * 2 + star.phase)) * 0.9;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Mond mit Lichthof
    const r = Math.min(w, h) * 0.04;
    const mx = w * 0.22 - s.px * 6;
    const my = this.horizon * 0.25;
    ctx.globalAlpha = s.night;
    const g = ctx.createRadialGradient(mx, my, r, mx, my, r * 6);
    g.addColorStop(0, 'rgba(210,225,255,0.3)');
    g.addColorStop(1, 'rgba(210,225,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(mx - r * 6, my - r * 6, r * 12, r * 12);
    ctx.fillStyle = '#f4f1e2';
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,195,175,0.5)';
    ctx.beginPath();
    ctx.arc(mx - r * 0.3, my - r * 0.2, r * 0.2, 0, Math.PI * 2);
    ctx.arc(mx + r * 0.25, my + r * 0.3, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** y-Koordinate eines Hügelkamms an Bildschirmposition x */
  private hillY(layer: HillLayer, x: number): number {
    const t = x / this.h;
    const wave =
      0.6 * Math.sin(t * layer.freq + layer.phase) +
      0.4 * Math.sin(t * layer.freq * 2.3 + layer.phase * 1.7);
    return this.horizon - this.h * (layer.base + layer.amp * wave);
  }

  private drawSun(s: ShireBackdropState): void {
    if (s.night > 0.98) return;
    const { ctx, w, horizon } = this;
    ctx.globalAlpha = 1 - s.night;
    const x = w * 0.8 - s.px * 6;
    const y = horizon * 0.26;
    const r = Math.min(w, this.h) * 0.05;
    const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 5);
    glow.addColorStop(0, 'rgba(255,250,215,0.85)');
    glow.addColorStop(0.3, 'rgba(255,240,180,0.3)');
    glow.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawRange(r: MountainRange, s: ShireBackdropState, front: boolean): void {
    const { ctx, w, h, horizon } = this;
    const period = w * r.period;
    const offset = wrap(-s.turn * r.shift, period);
    const base = horizon - h * 0.02;
    const spacing = period / r.peaks.length;

    for (let k = -1; k <= 1; k++) {
      for (const p of r.peaks) {
        const x = p.x * period + offset + k * period;
        const hw = spacing * p.width;
        if (x + hw < 0 || x - hw > w) continue;
        const H = h * p.height;
        const top = base - H;
        const j = (p.jag - 0.5) * hw * 0.2;

        // Felsen mit zackigem Grat
        ctx.fillStyle = this.n(r.rock, 0.7);
        ctx.beginPath();
        ctx.moveTo(x - hw, base);
        ctx.lineTo(x - hw * 0.62, base - H * 0.38 + j);
        ctx.lineTo(x - hw * 0.45, base - H * 0.5);
        ctx.lineTo(x - hw * 0.2 + j, base - H * 0.82);
        ctx.lineTo(x, top);
        ctx.lineTo(x + hw * 0.18, base - H * 0.84);
        ctx.lineTo(x + hw * 0.32, base - H * 0.76 - j);
        ctx.lineTo(x + hw * 0.6, base - H * 0.4);
        ctx.lineTo(x + hw, base);
        ctx.closePath();
        ctx.fill();

        // Schattenseite
        ctx.fillStyle = this.n(r.shade, 0.75);
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x + hw * 0.18, base - H * 0.84);
        ctx.lineTo(x + hw * 0.32, base - H * 0.76 - j);
        ctx.lineTo(x + hw * 0.6, base - H * 0.4);
        ctx.lineTo(x + hw, base);
        ctx.lineTo(x + hw * 0.05, base);
        ctx.lineTo(x - hw * 0.05, base - H * 0.5);
        ctx.closePath();
        ctx.fill();

        // Schneekappe mit unregelmäßiger Unterkante
        ctx.fillStyle = this.n(r.snow, 0.45);
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x - hw * 0.2 + j, base - H * 0.82);
        ctx.lineTo(x - hw * 0.27, base - H * 0.68);
        ctx.lineTo(x - hw * 0.13, base - H * 0.73);
        ctx.lineTo(x - hw * 0.04, base - H * 0.62);
        ctx.lineTo(x + hw * 0.02, base - H * 0.72);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = this.n(r.snowShade, 0.55);
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x + hw * 0.02, base - H * 0.72);
        ctx.lineTo(x + hw * 0.1, base - H * 0.66);
        ctx.lineTo(x + hw * 0.18, base - H * 0.84);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Dunst am Fuß der Berge (die Höhle wird danach gemalt, damit sie nicht verblasst)
    const haze = ctx.createLinearGradient(0, base - h * 0.12, 0, base);
    const hazeColor = mixRGB([246, 236, 200], [58, 63, 106], this.night);
    haze.addColorStop(0, rgba(hazeColor, 0));
    haze.addColorStop(1, rgba(hazeColor, 0.55));
    ctx.fillStyle = haze;
    ctx.fillRect(0, base - h * 0.12, w, h * 0.12 + 2);

    if (front) this.drawCave(r, s, period, offset, base, spacing);
  }

  /** kleine Höhle am höchsten Gipfel, aus der ein warmes Licht flackert */
  private drawCave(
    r: MountainRange,
    s: ShireBackdropState,
    period: number,
    offset: number,
    base: number,
    spacing: number,
  ): void {
    const { ctx, w, h } = this;
    const p = r.peaks[this.cavePeak];
    const hw = spacing * p.width;
    const H = h * p.height;
    const c = Math.max(4, h * 0.011);
    const pulse = 0.65 + 0.35 * Math.sin(s.time * 3.2);
    const flicker = 0.85 + 0.15 * Math.sin(s.time * 17) * Math.sin(s.time * 7);

    for (let k = -1; k <= 1; k++) {
      const cx = p.x * period + offset + k * period - hw * 0.22;
      const cy = base - H * 0.55;
      if (cx < -20 || cx > w + 20) continue;

      // einladender Lichtschein, nachts deutlich kräftiger
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, c * 5);
      halo.addColorStop(0, `rgba(255,190,90,${(0.45 + 0.4 * this.night) * pulse})`);
      halo.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(cx - c * 5, cy - c * 5, c * 10, c * 10);

      // Felsbogen und glühendes Inneres
      ctx.fillStyle = this.n('#3a2a20', 0.5);
      ctx.beginPath();
      ctx.moveTo(cx - c * 1.25, cy + c * 0.7);
      ctx.quadraticCurveTo(cx, cy - c * 1.7, cx + c * 1.25, cy + c * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255,${170 + 40 * flicker},80,${0.9 * flicker})`;
      ctx.beginPath();
      ctx.moveTo(cx - c * 0.8, cy + c * 0.7);
      ctx.quadraticCurveTo(cx, cy - c * 0.9, cx + c * 0.8, cy + c * 0.7);
      ctx.closePath();
      ctx.fill();

      this.cave = { x: cx, y: cy, r: c * 2.5 };
    }
  }

  private drawClouds(s: ShireBackdropState): void {
    const { ctx, w, horizon } = this;
    const unit = Math.min(w, this.h) * 0.045;
    for (const c of this.clouds) {
      const span = w + unit * 8;
      const x =
        ((((c.x * span + (s.motion ? s.time * c.speed : 0) - s.turn * 1.5) % span) + span) % span) -
        unit * 4;
      const y = horizon * c.y;
      const r = unit * c.size;
      ctx.fillStyle = rgba(mixRGB([205, 225, 240], [34, 42, 74], this.night), 0.9);
      this.cloudShape(x, y + r * 0.12, r);
      ctx.fillStyle = rgba(mixRGB([255, 255, 255], [58, 66, 102], this.night), 0.95);
      this.cloudShape(x, y, r);
    }
  }

  private cloudShape(x: number, y: number, r: number): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(x - r * 1.1, y, r * 0.6, 0, Math.PI * 2);
    ctx.arc(x - r * 0.4, y - r * 0.35, r * 0.78, 0, Math.PI * 2);
    ctx.arc(x + r * 0.45, y - r * 0.2, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 1.15, y + r * 0.05, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - r * 1.1, y - r * 0.1, r * 2.25, r * 0.7);
  }

  private drawHills(layer: HillLayer, index: number, s: ShireBackdropState): void {
    const { ctx, w, h, horizon } = this;
    const shift = -s.turn * layer.shift;

    ctx.fillStyle = this.n(layer.color);
    ctx.beginPath();
    ctx.moveTo(-10, horizon + 2);
    for (let x = -10; x <= w + 10; x += 6) ctx.lineTo(x, this.hillY(layer, x - shift));
    ctx.lineTo(w + 10, horizon + 2);
    ctx.closePath();
    ctx.fill();

    if (index === 0) {
      // kleine Baumtupfer auf den fernen Hügeln
      ctx.fillStyle = this.n('#7ea67a');
      const r = h * 0.006;
      for (const t of this.farTrees) {
        const x = wrap(t * (w + 200) + shift, w + 200) - 100;
        const y = this.hillY(layer, x - shift);
        ctx.beginPath();
        ctx.arc(x, y - r * 0.6, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (index === 1) {
      // runde Türen und Fenster in den Hängen, darüber ein Schornstein mit Rauch
      const r = h * 0.0095;
      [0.1, 0.27, 0.5, 0.71, 0.9].forEach((t, i) => {
        const x = wrap(t * (w + 160) + shift, w + 160) - 80;
        const y = this.hillY(layer, x - shift) + r * 2.4;
        ctx.fillStyle = this.n('#d8c49a');
        ctx.beginPath();
        ctx.arc(x, y, r * 1.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.n(DOOR_COLORS[i % DOOR_COLORS.length]);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        this.glow(x - r * 2.6, y - r * 0.3, r * 3);
        this.glow(x + r * 2.4, y - r * 0.2, r * 3);
        ctx.fillStyle = '#ffe39a';
        ctx.beginPath();
        ctx.arc(x - r * 2.6, y - r * 0.3, r * 0.45, 0, Math.PI * 2);
        ctx.arc(x + r * 2.4, y - r * 0.2, r * 0.4, 0, Math.PI * 2);
        ctx.fill();

        const cx = x + r * 1.6;
        const cy = y - r * 3.2;
        ctx.fillStyle = this.n('#8b7b68');
        ctx.fillRect(cx - r * 0.3, cy - r * 0.9, r * 0.6, r * 1.2);
        for (let k = 0; k < 3; k++) {
          const p = ((s.motion ? s.time * 0.25 : 0) + k / 3 + i * 0.17) % 1;
          ctx.fillStyle = `rgba(245,245,240,${0.55 * (1 - p) * (1 - this.night * 0.6)})`;
          ctx.beginPath();
          ctx.arc(cx + p * r * 2.5, cy - r - p * r * 6, r * (0.35 + p * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    if (index === 2) {
      // großer Festbaum auf dem nahen Hügel
      const x = wrap(w * 0.17 + 300 + shift, w + 600) - 300;
      const y = this.hillY(layer, x - shift) + 2;
      const size = h * 0.11;
      ctx.fillStyle = this.n('#5a3d24');
      ctx.beginPath();
      ctx.moveTo(x - size * 0.07, y);
      ctx.lineTo(x + size * 0.07, y);
      ctx.lineTo(x + size * 0.035, y - size * 0.55);
      ctx.lineTo(x - size * 0.035, y - size * 0.55);
      ctx.closePath();
      ctx.fill();
      const blobs: [number, number, number, string][] = [
        [0, -0.72, 0.42, '#3f7a2e'],
        [-0.38, -0.6, 0.3, '#3f7a2e'],
        [0.38, -0.58, 0.3, '#3f7a2e'],
        [-0.12, -0.86, 0.26, '#559a3c'],
        [0.2, -0.8, 0.22, '#559a3c'],
      ];
      for (const [bx, by, br, color] of blobs) {
        ctx.fillStyle = this.n(color);
        ctx.beginPath();
        ctx.arc(x + bx * size, y + by * size, br * size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Lampions im Baum
      ['#ffcf4a', '#ff7a5a', '#fff1a8', '#ff9fd0'].forEach((color, i) => {
        const lx = x + (i - 1.5) * size * 0.22;
        const ly = y - size * (0.45 + (i % 2) * 0.08);
        this.glow(lx, ly, size * 0.12);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lx, ly, size * 0.025, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
}

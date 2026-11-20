/**
 * Himmel und Skyline der "Neon Coast". Die Straße davor zeichnet roadRenderer.ts.
 * Alle Koordinaten sind CSS-Pixel; die Transformation setzt der Aufrufer.
 */
import { hex, mixRGB, rgba, seeded, smooth, type RGB } from './canvasUtils';

export interface NeonBackdropState {
  time: number;
  /** 0 = Sonnenuntergang, 1 = Nacht */
  night: number;
  /** horizontale Verschiebung durch Kurven, -1 … 1 */
  px: number;
  /** Beat-Impuls 0 … 1 */
  pulse: number;
  accentA: RGB;
  accentB: RGB;
  motion: boolean;
}

interface Building {
  x: number;
  w: number;
  h: number;
  neon: boolean;
  antenna: boolean;
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
}

const SKY_DUSK = ['#1b0b3f', '#5a1d6f', '#d9436b', '#ffa25a'].map(hex);
const SKY_NIGHT = ['#020210', '#0a0b2e', '#24104a', '#4a1758'].map(hex);
const WINDOW_COLORS = ['#ffd27a', '#ffe9b8', '#9ef0ff', '#ff9ad5'];

/** Überstand links/rechts, damit die Verschiebung in Kurven keine Kanten zeigt */
const BLEED = 140;
const FAR_SHIFT = 40;
const NEAR_SHIFT = 75;

export class NeonBackdrop {
  private w = 0;
  private h = 0;
  private dpr = 1;
  private horizon = 0;

  private stars: Star[] = [];
  private far: Building[] = [];
  private near: Building[] = [];

  /** vorgerenderte Fensterlichter, die mit zunehmender Nacht eingeblendet werden */
  private farLights: HTMLCanvasElement | null = null;
  private nearLights: HTMLCanvasElement[] = [];

  constructor(private ctx: CanvasRenderingContext2D) {}

  resize(width: number, height: number, dpr: number, horizon: number): void {
    this.w = width;
    this.h = height;
    this.dpr = dpr;
    this.horizon = horizon;
    this.build();
  }

  /** Farbe des Himmels direkt über dem Horizont – dient der Straße als Nebelfarbe */
  horizonColor(night: number): RGB {
    return mixRGB(SKY_DUSK[3], SKY_NIGHT[3], night);
  }

  render(s: NeonBackdropState): void {
    const { ctx, w, h } = this;
    if (!w || !h) return;

    const sky = SKY_DUSK.map((c, i) => mixRGB(c, SKY_NIGHT[i], s.night));
    const skyGradient = ctx.createLinearGradient(0, 0, 0, this.horizon);
    skyGradient.addColorStop(0, rgba(sky[0]));
    skyGradient.addColorStop(0.45, rgba(sky[1]));
    skyGradient.addColorStop(0.8, rgba(sky[2]));
    skyGradient.addColorStop(1, rgba(sky[3]));
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, this.horizon + 1);

    // Boden hinter der Straße, falls die Fahrbahn in einer Senke verschwindet
    ctx.fillStyle = rgba(mixRGB(sky[3], [10, 4, 20], 0.55));
    ctx.fillRect(0, this.horizon, w, h - this.horizon);

    this.drawStars(s);
    this.drawMoon(s, skyGradient);
    this.drawClouds(s);
    this.drawSun(s, skyGradient);
    this.drawSkyline(s);
  }

  /* ------------------------------------------------------------------ */

  private build(): void {
    const { w, h, horizon } = this;
    const rand = seeded(1919);

    this.stars = Array.from({ length: 160 }, () => ({
      x: rand() * w,
      y: rand() * horizon * 0.85,
      r: 0.4 + rand() * 1.2,
      phase: rand() * Math.PI * 2,
    }));

    // entfernte Skyline
    this.far = [];
    for (let x = -BLEED; x < w + BLEED;) {
      const bw = 14 + rand() * 30;
      const cluster = Math.exp(-((x / w - 0.7) ** 2) / 0.04);
      this.far.push({
        x,
        w: bw,
        h: h * (0.02 + rand() * 0.05 + cluster * 0.14),
        neon: false,
        antenna: rand() < 0.1,
      });
      x += bw + 1;
    }

    // Innenstadt
    this.near = [];
    for (let x = -BLEED; x < w + BLEED;) {
      const bw = 26 + rand() * 50;
      const cluster = Math.exp(-((x / w - 0.68) ** 2) / 0.018);
      this.near.push({
        x,
        w: bw,
        h: h * (0.015 + rand() * 0.04 + cluster * (0.11 + rand() * 0.12)),
        neon: cluster > 0.35 && rand() < 0.55,
        antenna: cluster > 0.5 && rand() < 0.35,
      });
      x += bw + (rand() < 0.25 ? rand() * 24 : 2);
    }

    this.renderLights(rand);
  }

  private makeLayer(): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((this.w + BLEED * 2) * this.dpr);
    canvas.height = Math.ceil(this.horizon * this.dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, BLEED * this.dpr, 0);
    return [canvas, ctx];
  }

  private renderLights(rand: () => number): void {
    const { horizon } = this;

    const [farCanvas, farCtx] = this.makeLayer();
    for (const b of this.far) {
      for (let wx = b.x + 3; wx < b.x + b.w - 3; wx += 5) {
        for (let wy = horizon - b.h + 5; wy < horizon - 2; wy += 6) {
          if (rand() < 0.45) continue;
          farCtx.fillStyle = WINDOW_COLORS[Math.floor(rand() * 2)];
          farCtx.globalAlpha = 0.5 + rand() * 0.5;
          farCtx.fillRect(wx, wy, 2, 2);
        }
      }
    }
    this.farLights = farCanvas;

    // drei Stufen: je dunkler, desto mehr Fenster gehen an
    const layers = [this.makeLayer(), this.makeLayer(), this.makeLayer()];
    for (const b of this.near) {
      for (let wx = b.x + 4; wx < b.x + b.w - 5; wx += 7) {
        for (let wy = horizon - b.h + 6; wy < horizon - 4; wy += 9) {
          if (rand() < 0.25) continue;
          const ctx = layers[Math.floor(rand() * 3)][1];
          ctx.fillStyle = WINDOW_COLORS[Math.floor(rand() * WINDOW_COLORS.length)];
          ctx.globalAlpha = 0.55 + rand() * 0.45;
          ctx.fillRect(wx, wy, 3, 4);
        }
      }
    }
    this.nearLights = layers.map(([canvas]) => canvas);
  }

  private drawStars(s: NeonBackdropState): void {
    if (s.night < 0.05) return;
    const { ctx } = this;
    ctx.fillStyle = '#fff';
    for (const star of this.stars) {
      const twinkle = 0.55 + 0.45 * Math.sin(s.time * 2 + star.phase);
      ctx.globalAlpha = s.night * twinkle * 0.9;
      ctx.beginPath();
      ctx.arc(star.x - s.px * 8, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawMoon(s: NeonBackdropState, sky: CanvasGradient): void {
    if (s.night < 0.05) return;
    const { ctx, w, h } = this;
    const r = Math.min(w, h) * 0.045;
    const x = w * 0.17 - s.px * 12;
    const y = h * 0.12 + (1 - s.night) * h * 0.1;

    ctx.globalAlpha = s.night;
    const glow = ctx.createRadialGradient(x, y, r, x, y, r * 5);
    glow.addColorStop(0, 'rgba(200,220,255,0.25)');
    glow.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);

    ctx.fillStyle = '#f3efe0';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Sichel: mit dem Himmel selbst übermalen
    ctx.fillStyle = sky;
    ctx.beginPath();
    ctx.arc(x + r * 0.45, y - r * 0.2, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawClouds(s: NeonBackdropState): void {
    const alpha = (1 - s.night) * 0.55 + 0.12;
    const { ctx, w, horizon } = this;
    const color = mixRGB(hex('#ff8fa8'), hex('#3a2060'), s.night);
    ctx.fillStyle = rgba(color, alpha);
    for (let i = 0; i < 6; i++) {
      const span = w * (0.18 + (i % 3) * 0.08);
      const x = ((i * 0.23 * w + s.time * (6 + i * 2)) % (w + span * 2)) - span - s.px * 10;
      const y = horizon * (0.42 + (i % 4) * 0.1);
      ctx.beginPath();
      ctx.ellipse(x + span / 2, y, span / 2, 2 + (i % 3) * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSun(s: NeonBackdropState, sky: CanvasGradient): void {
    const { ctx, w, horizon } = this;
    const r = Math.min(w, this.h) * 0.2 * (1 + s.pulse * 0.025);
    const x = w * 0.42 - s.px * 22;
    const y = horizon - r * 0.3 + s.night * r * 1.35;
    const alpha = 1 - s.night * 0.75;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, horizon);
    ctx.clip();

    const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.6);
    glow.addColorStop(0, `rgba(255,120,120,${0.35 * alpha + s.pulse * 0.12})`);
    glow.addColorStop(1, 'rgba(255,120,120,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);

    const body = ctx.createLinearGradient(0, y - r, 0, y + r);
    body.addColorStop(0, `rgba(255,236,120,${alpha})`);
    body.addColorStop(0.55, `rgba(255,120,110,${alpha})`);
    body.addColorStop(1, `rgba(255,50,140,${alpha})`);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // wandernde Streifen in der unteren Hälfte
    ctx.fillStyle = sky;
    const stripes = 7;
    for (let i = 0; i < stripes; i++) {
      const k = ((i + (s.motion ? s.time * 0.35 : 0)) % stripes) / stripes;
      const sy = y + r * 0.05 + k * r * 0.95;
      ctx.fillRect(x - r, sy, r * 2, 1 + k * 7);
    }
    ctx.restore();
  }

  private drawSkyline(s: NeonBackdropState): void {
    const { ctx, horizon } = this;
    const farShift = -s.px * FAR_SHIFT;
    const nearShift = -s.px * NEAR_SHIFT;

    // entfernte Silhouette, leicht im Dunst
    ctx.fillStyle = rgba(mixRGB(hex('#4a1f5e'), hex('#120a28'), s.night));
    for (const b of this.far) {
      ctx.fillRect(b.x + farShift, horizon - b.h, b.w, b.h + 1);
      if (b.antenna) ctx.fillRect(b.x + farShift + b.w / 2, horizon - b.h - 10, 1, 10);
    }
    if (this.farLights) {
      ctx.globalAlpha = smooth(0.15, 1, s.night) * 0.8;
      this.blitLayer(this.farLights, farShift);
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(mixRGB(hex('#2a0f3a'), hex('#07040f'), s.night));
    for (const b of this.near) {
      ctx.fillRect(b.x + nearShift, horizon - b.h, b.w, b.h + 1);
      if (b.antenna) ctx.fillRect(b.x + nearShift + b.w / 2 - 1, horizon - b.h - 18, 2, 18);
    }

    const stages = [0.35 + 0.65 * s.night, smooth(0.15, 0.6, s.night), smooth(0.5, 1, s.night)];
    this.nearLights.forEach((layer, i) => {
      if (stages[i] <= 0.01) return;
      ctx.globalAlpha = stages[i];
      this.blitLayer(layer, nearShift);
    });
    ctx.globalAlpha = 1;

    // Neonkanten auf den Dächern
    const neonStrength = 0.25 + 0.75 * s.night;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = (6 + s.pulse * 14) * s.night + 2;
    this.near.forEach((b, i) => {
      if (!b.neon) return;
      const color = i % 2 ? s.accentA : s.accentB;
      ctx.strokeStyle = rgba(color, neonStrength * (0.75 + s.pulse * 0.25));
      ctx.shadowColor = rgba(color, 1);
      const x = b.x + nearShift + 1;
      const top = horizon - b.h + 1;
      ctx.beginPath();
      ctx.moveTo(x, top + b.h * 0.35);
      ctx.lineTo(x, top);
      ctx.lineTo(x + b.w - 2, top);
      ctx.lineTo(x + b.w - 2, top + b.h * 0.35);
      ctx.stroke();
    });

    // Warnlichter auf den Antennen
    const blink = Math.sin(s.time * 3) > 0.2 ? 1 : 0.15;
    ctx.fillStyle = `rgba(255,60,60,${blink})`;
    ctx.shadowColor = '#ff3c3c';
    ctx.shadowBlur = 8;
    for (const b of this.near) {
      if (!b.antenna) continue;
      ctx.beginPath();
      ctx.arc(b.x + nearShift + b.w / 2, horizon - b.h - 18, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  private blitLayer(layer: HTMLCanvasElement, shift: number): void {
    this.ctx.drawImage(layer, -BLEED + shift, 0, layer.width / this.dpr, layer.height / this.dpr);
  }
}

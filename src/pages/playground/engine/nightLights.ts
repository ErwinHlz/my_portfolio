/**
 * Sammelt Lichtquellen (Öllampen, Fenster, Lichterketten), während die Szene gezeichnet wird,
 * und malt sie anschließend als warmes Leuchten über die abgedunkelte Welt.
 */

/** soft = gleichmäßiges, weiches Leuchten ohne Flackern, z. B. der Zauberstab */
export type LightKind = 'lamp' | 'bulb' | 'window' | 'soft';

interface Light {
  x: number;
  y: number;
  r: number;
  kind: LightKind;
  alpha: number;
  seed: number;
  /** eigene Lichtfarbe als RGB-Liste „r,g,b“; sonst warmes Licht */
  tint?: string;
}

const BULB_COLORS = ['#ffd27a', '#fff1c4', '#ffb35c', '#ffe6a0'];

export class LightSink {
  private lights: Light[] = [];
  private glow: HTMLCanvasElement;
  private tinted = new Map<string, HTMLCanvasElement>();

  constructor() {
    // ein vorgerenderter Lichthof – viel günstiger als ein Verlauf pro Lampe
    this.glow = LightSink.makeGlow('255,214,140', '255,180,100', '255,160,80');
  }

  private static makeGlow(inner: string, mid: string, outer: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const g = canvas.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${inner},1)`);
    grad.addColorStop(0.3, `rgba(${mid},0.45)`);
    grad.addColorStop(1, `rgba(${outer},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return canvas;
  }

  private glowFor(tint?: string): HTMLCanvasElement {
    if (!tint) return this.glow;
    let canvas = this.tinted.get(tint);
    if (!canvas) {
      canvas = LightSink.makeGlow(tint, tint, tint);
      this.tinted.set(tint, canvas);
    }
    return canvas;
  }

  clear(): void {
    this.lights = [];
  }

  /** merkt sich eine Lichtquelle; x, y und r gelten im aktuellen Koordinatensystem von ctx */
  add(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    kind: LightKind = 'lamp',
    seed = 0,
    tint?: string,
  ): void {
    const m = ctx.getTransform();
    this.lights.push({
      x: m.a * x + m.c * y + m.e,
      y: m.b * x + m.d * y + m.f,
      r: r * Math.hypot(m.a, m.b),
      kind,
      alpha: ctx.globalAlpha,
      seed: seed || this.lights.length,
      tint,
    });
  }

  draw(ctx: CanvasRenderingContext2D, time: number, strength: number): void {
    if (strength <= 0.01 || this.lights.length === 0) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const l of this.lights) {
      const flicker =
        l.kind === 'soft'
          ? 0.95 + 0.05 * Math.sin(time * 1.5)
          : l.kind === 'bulb'
            ? 0.6 + 0.4 * Math.sin(time * 2.6 + l.seed * 7.31)
            : 0.88 + 0.12 * Math.sin(time * 11 + l.seed * 3.7);
      const a = l.alpha * strength * flicker;
      if (a < 0.02 || l.r < 0.2) continue;

      if (l.kind === 'soft') {
        // mehrere weiche Lichthöfe übereinander statt eines harten Kerns
        for (const [scale, alpha] of [
          [6, 0.35],
          [3, 0.55],
          [1.4, 0.8],
        ]) {
          const halo = l.r * scale;
          ctx.globalAlpha = Math.min(1, a * alpha);
          ctx.drawImage(this.glowFor(l.tint), l.x - halo, l.y - halo, halo * 2, halo * 2);
        }
        continue;
      }

      const halo = l.r * (l.kind === 'bulb' ? 4 : l.kind === 'window' ? 2.6 : 4.5);
      ctx.globalAlpha = Math.min(1, a * (l.kind === 'bulb' ? 0.75 : 0.85));
      ctx.drawImage(this.glowFor(l.tint), l.x - halo, l.y - halo, halo * 2, halo * 2);

      if (l.kind !== 'window') {
        ctx.globalAlpha = Math.min(1, a);
        ctx.fillStyle = l.tint
          ? `rgb(${l.tint})`
          : l.kind === 'bulb'
            ? BULB_COLORS[l.seed % BULB_COLORS.length]
            : '#fff3d0';
        ctx.beginPath();
        ctx.arc(l.x, l.y, Math.max(0.8, l.r * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

/** hängt eine Lichterkette als durchhängenden Bogen von (x0, y0) nach (x1, y1) auf */
export function stringLights(
  ctx: CanvasRenderingContext2D,
  sink: LightSink | undefined,
  night: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sag: number,
  count: number,
  r: number,
  seed = 1,
): void {
  if (!sink || night < 0.02) return;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2 + sag * 2;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, night * 1.5);
  ctx.strokeStyle = '#2a2018';
  ctx.lineWidth = r * 0.3;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const u = 1 - t;
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
    sink.add(ctx, x, y, r, 'bulb', seed + i);
  }
}

/**
 * Glutfunken, die aus der Schale aufsteigen und um die Kugel kreisen.
 * Dreht man die Kugel, wirbeln sie in Drehrichtung mit und es entstehen mehr.
 *
 * Das Canvas liegt über dem unteren Teil der Kugel: Breite 1,3 × Durchmesser,
 * Höhe 0,75 × Durchmesser, Oberkante bei 0,45 × Durchmesser (siehe CSS).
 */
import { rgba, type OrbColors } from './palantir';

export const EMBER_LAYOUT = { width: 1.3, height: 0.75, top: 0.45 };

interface Ember {
  angle: number;
  radius: number;
  y: number;
  rise: number;
  age: number;
  life: number;
  size: number;
  phase: number;
}

const MAX_EMBERS = 90;

export class EmberField {
  private readonly context: CanvasRenderingContext2D | null;
  private embers: Ember[] = [];
  private sprite: HTMLCanvasElement | null = null;
  private diameter = 0;
  private width = 0;
  private height = 0;
  private ratio = 1;
  private spawnDebt = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  /** Durchmesser der Kugel in CSS-Pixeln */
  resize(diameter: number) {
    this.diameter = diameter;
    this.width = diameter * EMBER_LAYOUT.width;
    this.height = diameter * EMBER_LAYOUT.height;
    this.ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.ratio);
    this.canvas.height = Math.round(this.height * this.ratio);
  }

  setColors(colors: OrbColors) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const context = sprite.getContext('2d')!;
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, rgba(colors.reflex, 1));
    gradient.addColorStop(0.18, rgba(colors.reflex, 0.9));
    gradient.addColorStop(0.4, rgba(colors.core, 0.6));
    gradient.addColorStop(1, rgba(colors.core, 0));
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    this.sprite = sprite;
  }

  clear() {
    this.embers = [];
    this.context?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private spawn() {
    const d = this.diameter;
    this.embers.push({
      angle: Math.random() * Math.PI * 2,
      radius: d * (0.34 + Math.random() * 0.14),
      y: d * (0.43 - Math.random() * 0.02),
      rise: d * (0.05 + Math.random() * 0.09),
      age: 0,
      life: 1.8 + Math.random() * 1.6,
      size: 0.8 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
    });
  }

  /**
   * @param spin Drehgeschwindigkeit der Kugel um die senkrechte Achse (rad/s)
   */
  update(dt: number, spin: number, time: number) {
    const { context, sprite } = this;
    if (!context || !sprite || !this.diameter) return;

    const speed = Math.min(Math.abs(spin), 8);
    this.spawnDebt += dt * (7 + speed * 10);
    while (this.spawnDebt >= 1) {
      this.spawnDebt -= 1;
      if (this.embers.length < MAX_EMBERS) this.spawn();
    }

    const d = this.diameter;
    const cx = this.width / 2;
    const cy = d * (0.5 - EMBER_LAYOUT.top);
    const r = d / 2;
    const lip = d * 0.43;

    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    context.globalCompositeOperation = 'lighter';

    // Vorderseite der Kugel bewegt sich bei positivem spin nach rechts, die Funken folgen
    const orbit = -(0.35 + spin * 0.85);
    this.embers = this.embers.filter((ember) => {
      ember.age += dt;
      if (ember.age >= ember.life) return false;

      ember.angle += orbit * dt * (1 - (ember.y - cy) / (d * 0.6));
      ember.radius += d * 0.025 * dt;
      ember.y -= ember.rise * dt;

      const x = cx + Math.cos(ember.angle) * ember.radius;
      const depth = Math.sin(ember.angle);
      if (depth < 0) {
        // hinter der Kugel bzw. der Schale verdeckt
        if (ember.y > lip - d * 0.01) return true;
        const dy = ember.y - cy;
        if (Math.abs(dy) < r && Math.abs(x - cx) < Math.sqrt(r * r - dy * dy)) return true;
      }

      const progress = ember.age / ember.life;
      const fade = Math.sin(Math.PI * Math.min(progress * 1.4, 1)) * (1 - progress * 0.4);
      const flicker = 0.7 + 0.3 * Math.sin(time * 9 + ember.phase);
      const near = 0.55 + 0.45 * depth;
      context.globalAlpha = Math.min(
        1,
        Math.max(0, fade * flicker * (0.6 + 0.4 * near) * (1 + speed * 0.08)),
      );
      const size = ember.size * (0.8 + 0.4 * near) * 6.5;
      context.drawImage(sprite, x - size / 2, ember.y - size / 2, size, size);
      return true;
    });

    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }
}

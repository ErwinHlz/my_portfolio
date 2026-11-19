/**
 * Gemeinsame Bausteine für den Palantír: Typen, Farben, vorberechnete Visionen
 * und ein einfacher Canvas-2D-Renderer als Fallback, falls kein WebGL verfügbar ist.
 */

export type Vision =
  | {
      kind: 'image';
      src: string;
      /** cover = Kreis füllen, contain = freigestellte Figur schwebt im Nebel */
      fit?: 'cover' | 'contain';
      focusX?: number;
      focusY?: number;
      /** Größe bei fit: 'contain' (Anteil der Fläche) */
      scale?: number;
      /** einfarbige Grafik (z. B. Logo) golden glühend einfärben */
      glow?: boolean;
    }
  | { kind: 'glyph'; text: string; font: string; weight?: number; scale?: number };

/** Farben als RGB-Tripel ("255, 120, 40"), gelesen aus den --palantir-* Variablen. */
export interface OrbColors {
  deep: string;
  glass: string;
  core: string;
  mist: string;
  reflex: string;
  rim: string;
}

export interface OrbFrame {
  /** Index der Vision, -1 = nur Nebel */
  vision: number;
  /** 0 = dichter Nebel, 1 = klare Sicht */
  clarity: number;
  /** -1 = Blick nach links, 1 = nach rechts */
  lean: number;
  /** Drehung der Kugel um ihren Mittelpunkt (Bogenmaß) */
  yaw: number;
  pitch: number;
  /** Stärke, mit der der Zeiger den Nebel verwirbelt */
  stir: number;
  time: number;
  dt: number;
  /** Zeigerposition in CSS-Pixeln relativ zur Kugel */
  pointer: { x: number; y: number } | null;
  /**
   * Optional: fertige Drehmatrix Welt → Kugel (3×3, spaltenweise, y nach oben).
   * Ersetzt yaw/pitch, z. B. für die frei drehbare Kugel im Header.
   */
  rotation?: ArrayLike<number>;
  /** Kippen der Spiegelung beim schnellen Drehen (x, y), etwa −0,2 … 0,2 */
  wobble?: [number, number];
}

export interface Orb {
  resize(size: number): void;
  setColors(colors: OrbColors): void;
  invalidate(): void;
  render(frame: OrbFrame): void;
  dispose(): void;
}

const TAU = Math.PI * 2;

export const rgba = (rgb: string, alpha: number) => `rgba(${rgb}, ${alpha})`;

export function readOrbColors(element: HTMLElement): OrbColors {
  const style = getComputedStyle(element);
  const read = (name: string) => style.getPropertyValue(`--palantir-${name}`).trim();
  return {
    deep: read('deep'),
    glass: read('glass'),
    core: read('core'),
    mist: read('mist'),
    reflex: read('reflex'),
    rim: read('rim'),
  };
}

export function loadVisionImages(visions: Vision[], onLoad: (index: number) => void) {
  return visions.map((vision, index) => {
    if (vision.kind !== 'image') return null;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => onLoad(index);
    image.src = vision.src;
    return image;
  });
}

/** Bild oder Rune einmal vorberechnen, mit weich ausgeblendetem Kreisrand. */
export function buildVisionLayer(
  vision: Vision,
  image: HTMLImageElement | null | undefined,
  colors: OrbColors,
  px: number,
) {
  const layer = document.createElement('canvas');
  layer.width = layer.height = px;
  const context = layer.getContext('2d')!;

  if (vision.kind === 'image') {
    if (!image?.complete || !image.naturalWidth) return null;

    const contain = vision.fit === 'contain';
    const scale = contain
      ? Math.min(px / image.naturalWidth, px / image.naturalHeight) * (vision.scale ?? 0.74)
      : Math.max(px / image.naturalWidth, px / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(
      image,
      (px - width) * (vision.focusX ?? 0.5),
      (px - height) * (vision.focusY ?? 0.5),
      width,
      height,
    );

    if (vision.glow) {
      const fill = context.createLinearGradient(0, px * 0.2, 0, px * 0.8);
      fill.addColorStop(0, rgba(colors.reflex, 1));
      fill.addColorStop(1, rgba(colors.core, 1));
      context.globalCompositeOperation = 'source-in';
      context.fillStyle = fill;
      context.fillRect(0, 0, px, px);

      // Leuchten hinter der Grafik
      const shape = document.createElement('canvas');
      shape.width = shape.height = px;
      shape.getContext('2d')!.drawImage(layer, 0, 0);
      context.globalCompositeOperation = 'destination-over';
      context.shadowColor = rgba(colors.core, 0.9);
      context.shadowBlur = px * 0.05;
      context.drawImage(shape, 0, 0);
      context.shadowBlur = 0;
    } else {
      // leichter Farbschleier, damit das Bild „in“ der Kugel liegt
      context.globalCompositeOperation = 'source-atop';
      context.fillStyle = rgba(colors.core, 0.12);
      context.fillRect(0, 0, px, px);
    }
  } else {
    const fontSize = px * (vision.scale ?? 0.5);
    context.font = `${vision.weight ?? 400} ${fontSize}px ${vision.font}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const fill = context.createLinearGradient(0, px * 0.25, 0, px * 0.75);
    fill.addColorStop(0, rgba(colors.reflex, 1));
    fill.addColorStop(1, rgba(colors.core, 1));
    context.fillStyle = fill;
    context.shadowColor = rgba(colors.core, 0.95);
    context.shadowBlur = px * 0.06;
    context.fillText(vision.text, px / 2, px * 0.53);
  }

  context.globalCompositeOperation = 'destination-in';
  const mask = context.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
  mask.addColorStop(0, 'rgba(0, 0, 0, 1)');
  mask.addColorStop(0.6, 'rgba(0, 0, 0, 1)');
  mask.addColorStop(0.98, 'rgba(0, 0, 0, 0)');
  context.fillStyle = mask;
  context.fillRect(0, 0, px, px);

  return layer;
}

interface Wisp {
  radius: number;
  angle: number;
  speed: number;
  size: number;
  alpha: number;
  squash: number;
  phase: number;
}

/** Einfache 2D-Variante für Geräte ohne WebGL. */
export class FlatOrbRenderer implements Orb {
  private readonly context: CanvasRenderingContext2D;
  private readonly images: (HTMLImageElement | null)[];
  private readonly wisps: Wisp[] = Array.from({ length: 36 }, () => ({
    radius: Math.sqrt(Math.random()) * 0.9,
    angle: Math.random() * TAU,
    speed: 0.1 + Math.random() * 0.28,
    size: 0.35 + Math.random() * 0.6,
    alpha: 0.22 + Math.random() * 0.38,
    squash: 0.45 + Math.random() * 0.35,
    phase: Math.random() * TAU,
  }));
  private cache: (HTMLCanvasElement | null)[] = [];
  private sprite: HTMLCanvasElement | null = null;
  private colors: OrbColors | null = null;
  private size = 0;
  private ratio = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly visions: Vision[],
    onImageLoad: () => void,
  ) {
    this.context = canvas.getContext('2d')!;
    this.images = loadVisionImages(visions, (index) => {
      this.cache[index] = null;
      onImageLoad();
    });
  }

  resize(size: number) {
    this.ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.size = size;
    this.canvas.width = this.canvas.height = Math.round(size * this.ratio);
    this.invalidate();
  }

  setColors(colors: OrbColors) {
    this.colors = colors;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 128;
    const context = sprite.getContext('2d')!;
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, rgba(colors.mist, 0.55));
    gradient.addColorStop(0.45, rgba(colors.mist, 0.2));
    gradient.addColorStop(1, rgba(colors.mist, 0));
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    this.sprite = sprite;
    this.invalidate();
  }

  invalidate() {
    this.cache = [];
  }

  dispose() {
    this.cache = [];
  }

  private layer(index: number) {
    if (this.cache[index]) return this.cache[index];
    const vision = this.visions[index];
    if (!vision || !this.colors) return null;
    const layer = buildVisionLayer(
      vision,
      this.images[index],
      this.colors,
      Math.round(this.size * this.ratio),
    );
    this.cache[index] = layer;
    return layer;
  }

  render(frame: OrbFrame) {
    const { context, size, colors, sprite } = this;
    if (!size || !colors || !sprite) return;

    const r = size / 2;
    const fog = 1 - frame.clarity;
    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    context.clearRect(0, 0, size, size);
    context.save();
    context.beginPath();
    context.arc(r, r, r - 1, 0, TAU);
    context.clip();

    const body = context.createRadialGradient(r, r * 1.15, 0, r, r, r);
    body.addColorStop(0, rgba(colors.glass, 1));
    body.addColorStop(1, rgba(colors.deep, 1));
    context.fillStyle = body;
    context.fillRect(0, 0, size, size);

    const layer = frame.vision >= 0 && frame.clarity > 0.01 ? this.layer(frame.vision) : null;
    if (layer) {
      context.save();
      context.translate(r, r);
      context.rotate(frame.yaw + fog * 0.35);
      context.scale(1 + fog * 0.18, 1 + fog * 0.18);
      context.globalAlpha = Math.pow(frame.clarity, 1.3);
      context.drawImage(layer, -r, -r, size, size);
      context.restore();
    }

    for (const wisp of this.wisps) {
      wisp.angle += wisp.speed * (1 + fog * 1.8) * frame.dt;
      const x = r + Math.cos(wisp.angle + frame.yaw) * wisp.radius * r;
      const y =
        r +
        Math.sin(wisp.angle + frame.yaw) * wisp.radius * r * 0.55 +
        Math.sin(frame.time * 0.4 + wisp.phase) * r * 0.05;
      const width = wisp.size * r;
      context.globalAlpha = wisp.alpha * (0.16 + 0.84 * fog);
      context.drawImage(
        sprite,
        x - width / 2,
        y - (width * wisp.squash) / 2,
        width,
        width * wisp.squash,
      );
    }
    context.globalAlpha = 1;

    const vignette = context.createRadialGradient(r, r, r * 0.55, r, r, r);
    vignette.addColorStop(0, rgba(colors.deep, 0));
    vignette.addColorStop(1, rgba(colors.deep, 0.82));
    context.fillStyle = vignette;
    context.fillRect(0, 0, size, size);
    context.restore();

    context.strokeStyle = rgba(colors.rim, 0.5);
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(r, r, r - 0.75, 0, TAU);
    context.stroke();
  }
}

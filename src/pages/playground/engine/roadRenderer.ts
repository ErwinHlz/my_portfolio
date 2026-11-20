/**
 * Pseudo-3D-Straße im Stil klassischer Arcade-Racer: die Strecke besteht aus
 * kurzen Segmenten mit Kurve und Höhe, die perspektivisch projiziert und
 * von hinten nach vorne gemalt werden.
 */
import { hex, lerp, mixRGB, rgba, type RGB } from './canvasUtils';
import { stringLights, type LightSink } from './nightLights';

export const SEGMENT_LENGTH = 200;
export const ROAD_WIDTH = 2000;
export const CAMERA_HEIGHT = 1000;
export const CAMERA_DEPTH = 1 / Math.tan((50 * Math.PI) / 180);
export const DRAW_DISTANCE = 170;
const RUMBLE_LENGTH = 3;

export type SpriteKind =
  // im Grünen
  | 'oak'
  | 'bush'
  | 'hole'
  | 'fence'
  | 'flowers'
  | 'signpost'
  | 'haystack'
  | 'pumpkins'
  | 'well'
  | 'stall'
  | 'laundry'
  | 'sheep'
  | 'lantern'
  | 'hobbit'
  | 'pub'
  | 'horse'
  | 'scarecrow'
  | 'campfire'
  | 'gollum'
  | 'parkedBike'
  | 'parkedCart'
  // an der Neon Coast
  | 'palm'
  | 'lamp'
  | 'billboard'
  | 'car'
  | 'motel'
  | 'umbrella'
  | 'hydrant'
  | 'phonebooth'
  | 'gangster'
  | 'lady'
  | 'house'
  | 'hotel'
  | 'tower'
  | 'shop'
  | 'casino';

export interface RoadSprite {
  kind: SpriteKind;
  /** seitlicher Abstand in Straßenbreiten, negativ = links */
  offset: number;
  variant: number;
  /** Höhe über dem Boden in Welteinheiten, z. B. für Sprünge */
  lift?: number;
}

interface Point {
  wy: number;
  wz: number;
  cz: number;
  sx: number;
  sy: number;
  sw: number;
  scale: number;
}

/** Feld neben der Straße, das parallel zur Fahrbahn verläuft */
export interface RoadField {
  /** Innen- und Außenkante in Straßenbreiten (vorzeichenbehaftet) */
  from: number;
  to: number;
  base: RGB;
  /** Farbe der Pflanzreihen; null = keine Reihen (z. B. Weide) */
  row: RGB | null;
  rows: number;
}

interface Segment {
  index: number;
  curve: number;
  p1: Point;
  p2: Point;
  sprites: RoadSprite[];
  fields: RoadField[];
  /** Zäune längs der Straße, als seitlicher Abstand in Straßenbreiten */
  rails: number[];
  fog: number;
}

export interface RoadTheme {
  ground: [RGB, RGB];
  rumble: [RGB, RGB];
  road: [RGB, RGB];
  /** gestrichelte Mittellinie */
  lane: RGB | null;
  /** Grasstreifen zwischen den Fahrspuren eines Feldwegs */
  strip: RGB | null;
  /** leuchtendes Synthwave-Raster neben der Straße */
  grid: RGB | null;
  fog: RGB;
  fogDensity: number;
  /** nachts: Sammler für Lichterketten an den Zäunen und deren Stärke 0 … 1 */
  lights?: LightSink;
  night?: number;
}

export interface RoadView {
  w: number;
  h: number;
  horizon: number;
  /** Pixel pro Welteinheit bei Maßstab 1 */
  unit: number;
  /** Abstand zwischen Kamera und Fahrzeug */
  playerZ: number;
}

export type SpritePainter = (sprite: RoadSprite, x: number, y: number, unit: number) => void;

const point = (y: number, z: number): Point => ({
  wy: y,
  wz: z,
  cz: 0,
  sx: 0,
  sy: 0,
  sw: 0,
  scale: 0,
});
const easeIn = (a: number, b: number, t: number) => a + (b - a) * t * t;
const easeInOut = (a: number, b: number, t: number) =>
  a + (b - a) * (-Math.cos(t * Math.PI) / 2 + 0.5);

export class Track {
  readonly segments: Segment[] = [];

  get length(): number {
    return this.segments.length * SEGMENT_LENGTH;
  }

  private lastY(): number {
    const last = this.segments[this.segments.length - 1];
    return last ? last.p2.wy : 0;
  }

  private add(curve: number, y: number): void {
    const n = this.segments.length;
    this.segments.push({
      index: n,
      curve,
      p1: point(this.lastY(), n * SEGMENT_LENGTH),
      p2: point(y, (n + 1) * SEGMENT_LENGTH),
      sprites: [],
      fields: [],
      rails: [],
      fog: 1,
    });
  }

  /** Abschnitt mit Ein-/Ausfahrt; hill ist die Höhenänderung in Segmentlängen */
  road(enter: number, hold: number, leave: number, curve: number, hill: number): this {
    const startY = this.lastY();
    const endY = startY + hill * SEGMENT_LENGTH;
    const total = enter + hold + leave;
    let n = 0;
    for (let i = 0; i < enter; i++)
      this.add(easeIn(0, curve, i / enter), easeInOut(startY, endY, ++n / total));
    for (let i = 0; i < hold; i++) this.add(curve, easeInOut(startY, endY, ++n / total));
    for (let i = 0; i < leave; i++)
      this.add(easeInOut(curve, 0, i / leave), easeInOut(startY, endY, ++n / total));
    return this;
  }

  /** führt die Strecke zurück auf Höhe 0, damit sie nahtlos loopt */
  close(length: number): this {
    return this.road(length, length, length, 0, -this.lastY() / SEGMENT_LENGTH);
  }

  at(z: number): Segment {
    const len = this.segments.length;
    const i = Math.floor(z / SEGMENT_LENGTH) % len;
    return this.segments[(i + len) % len];
  }

  sprite(index: number, kind: SpriteKind, offset: number, variant = 0): void {
    const sprites = this.segments[index % this.segments.length].sprites;
    sprites.push({ kind, offset, variant });
    // weiter außen stehende Objekte zuerst malen, damit nähere sie verdecken
    sprites.sort((a, b) => Math.abs(b.offset) - Math.abs(a.offset));
  }

  /** bewegliche Figuren werden nur für einen Frame in ihr Segment gelegt */
  addTemporary(index: number, sprite: RoadSprite): void {
    this.segments[index % this.segments.length].sprites.push(sprite);
  }

  removeTemporary(index: number, sprite: RoadSprite): void {
    const seg = this.segments[index % this.segments.length];
    seg.sprites = seg.sprites.filter((s) => s !== sprite);
  }

  /** legt ein Feld über die Segmente from … to */
  field(from: number, to: number, field: RoadField): void {
    for (let i = from; i < to; i++) this.segments[i % this.segments.length].fields.push(field);
  }

  /** setzt einen Zaun parallel zur Straße über die Segmente from … to */
  rail(from: number, to: number, offset: number): void {
    for (let i = from; i < to; i++) this.segments[i % this.segments.length].rails.push(offset);
  }
}

function project(p: Point, camX: number, camY: number, camZ: number, v: RoadView): void {
  p.cz = p.wz - camZ;
  p.scale = CAMERA_DEPTH / p.cz;
  p.sx = v.w / 2 - p.scale * camX * v.unit;
  p.sy = v.horizon - p.scale * (p.wy - camY) * v.unit;
  p.sw = p.scale * ROAD_WIDTH * v.unit;
}

function quadFill(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

const GRID_OFFSETS = [1.6, 2.3, 3.2, 4.5, 6.3, 8.8, 12.5];

/**
 * Zeichnet Boden, Straße und Randobjekte.
 * @returns Kurvenstärke an der Position des Fahrzeugs
 */
export function renderRoad(
  ctx: CanvasRenderingContext2D,
  track: Track,
  position: number,
  playerX: number,
  v: RoadView,
  theme: RoadTheme,
  paint: SpritePainter,
): number {
  const segments = track.segments;
  const base = track.at(position);
  const basePercent = (position % SEGMENT_LENGTH) / SEGMENT_LENGTH;
  const player = track.at(position + v.playerZ);
  const playerPercent = ((position + v.playerZ) % SEGMENT_LENGTH) / SEGMENT_LENGTH;
  const camY = lerp(player.p1.wy, player.p2.wy, playerPercent) + CAMERA_HEIGHT;

  const visible: Segment[] = [];
  let x = 0;
  let dx = -base.curve * basePercent;
  for (let n = 0; n < DRAW_DISTANCE; n++) {
    const seg = segments[(base.index + n) % segments.length];
    const camZ = position - (seg.index < base.index ? track.length : 0);
    project(seg.p1, playerX * ROAD_WIDTH - x, camY, camZ, v);
    project(seg.p2, playerX * ROAD_WIDTH - x - dx, camY, camZ, v);
    x += dx;
    dx += seg.curve;
    seg.fog = Math.exp(-((n / DRAW_DISTANCE) ** 2) * theme.fogDensity);
    if (seg.p1.cz > CAMERA_DEPTH) visible.push(seg);
  }

  // Maleralgorithmus: hinten anfangen, dann verdecken nähere Segmente alles Dahinterliegende
  for (let i = visible.length - 1; i >= 0; i--) {
    const seg = visible[i];
    if (seg.p2.sy < seg.p1.sy && seg.p2.sy < v.h) drawSegment(ctx, seg, v, theme);
    if (seg.sprites.length) drawSprites(ctx, seg, v, paint);
    if (seg.rails.length) drawRails(ctx, seg, v, theme);
  }

  return player.curve;
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  seg: Segment,
  v: RoadView,
  theme: RoadTheme,
): void {
  const { sx: x1, sy: y1, sw: w1 } = seg.p1;
  const { sx: x2, sw: w2 } = seg.p2;
  // ein Pixel Überlappung verhindert Haarlinien zwischen den Segmenten
  const y2 = seg.p2.sy - 1;
  const light = Math.floor(seg.index / RUMBLE_LENGTH) % 2 === 0 ? 0 : 1;
  const fogAmount = 1 - seg.fog;
  const color = (c: RGB) => rgba(fogAmount > 0.003 ? mixRGB(c, theme.fog, fogAmount) : c);

  ctx.fillStyle = color(theme.ground[light]);
  ctx.fillRect(0, y2, v.w, y1 - y2);

  if (theme.grid) {
    ctx.strokeStyle = rgba(theme.grid, 0.55 * seg.fog);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const k of GRID_OFFSETS) {
      ctx.moveTo(x1 - w1 * k, y1);
      ctx.lineTo(x2 - w2 * k, y2);
      ctx.moveTo(x1 + w1 * k, y1);
      ctx.lineTo(x2 + w2 * k, y2);
    }
    if (seg.index % 4 === 0) {
      ctx.moveTo(0, y1);
      ctx.lineTo(v.w, y1);
    }
    ctx.stroke();
  }

  for (const f of seg.fields) drawField(ctx, f, seg, x1, y1, w1, x2, y2, w2, color);

  const r1 = w1 / 7;
  const r2 = w2 / 7;
  ctx.fillStyle = color(theme.rumble[light]);
  quadFill(ctx, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2);
  quadFill(ctx, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2);

  ctx.fillStyle = color(theme.road[light]);
  quadFill(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2);

  if (theme.strip) {
    ctx.fillStyle = color(theme.strip);
    quadFill(ctx, x1 - w1 * 0.12, y1, x1 + w1 * 0.12, y1, x2 + w2 * 0.12, y2, x2 - w2 * 0.12, y2);
  }

  if (theme.lane && light === 0) {
    ctx.fillStyle = color(theme.lane);
    quadFill(
      ctx,
      x1 - w1 * 0.025,
      y1,
      x1 + w1 * 0.025,
      y1,
      x2 + w2 * 0.025,
      y2,
      x2 - w2 * 0.025,
      y2,
    );
  }
}

function drawField(
  ctx: CanvasRenderingContext2D,
  f: RoadField,
  seg: Segment,
  x1: number,
  y1: number,
  w1: number,
  x2: number,
  y2: number,
  w2: number,
  color: (c: RGB) => string,
): void {
  ctx.fillStyle = color(f.base);
  quadFill(ctx, x1 + w1 * f.from, y1, x1 + w1 * f.to, y1, x2 + w2 * f.to, y2, x2 + w2 * f.from, y2);
  // Reihen nur zeichnen, wo das Segment groß genug ist
  if (!f.row || y1 - y2 < 1.5) return;
  ctx.fillStyle = color(f.row);
  const step = (f.to - f.from) / f.rows;
  for (let r = 0; r < f.rows; r++) {
    const a = f.from + step * (r + 0.3);
    const b = f.from + step * (r + 0.7);
    quadFill(ctx, x1 + w1 * a, y1, x1 + w1 * b, y1, x2 + w2 * b, y2, x2 + w2 * a, y2);
  }
  // kleine Unterbrechungen geben dem Feld Struktur
  if (seg.index % 7 === 0) {
    ctx.fillStyle = color(f.base);
    quadFill(
      ctx,
      x1 + w1 * f.from,
      y1,
      x1 + w1 * f.to,
      y1,
      x2 + w2 * f.to,
      y2,
      x2 + w2 * f.from,
      y2,
    );
  }
}

const RAIL_WOOD = hex('#8b6a43');
const RAIL_HEIGHT = 520;

/** Holzzaun längs der Straße: Pfosten an jedem zweiten Segment, zwei durchgehende Latten */
function drawRails(
  ctx: CanvasRenderingContext2D,
  seg: Segment,
  v: RoadView,
  theme: RoadTheme,
): void {
  const u1 = seg.p1.scale * v.unit;
  const u2 = seg.p2.scale * v.unit;
  if (u1 * ROAD_WIDTH < 3) return;
  const color = rgba(mixRGB(RAIL_WOOD, theme.fog, 1 - seg.fog));
  ctx.fillStyle = color;
  for (const o of seg.rails) {
    const x1 = seg.p1.sx + seg.p1.sw * o;
    const x2 = seg.p2.sx + seg.p2.sw * o;
    const y1 = seg.p1.sy;
    const y2 = seg.p2.sy;
    for (const k of [0.45, 0.85]) {
      const t1 = Math.max(1, 55 * u1);
      const t2 = Math.max(1, 55 * u2);
      const a1 = y1 - RAIL_HEIGHT * k * u1;
      const a2 = y2 - RAIL_HEIGHT * k * u2;
      quadFill(ctx, x1, a1, x2, a2, x2, a2 + t2, x1, a1 + t1);
    }
    if (seg.index % 2 === 0) {
      const pw = Math.max(1, 70 * u1);
      ctx.fillRect(x1 - pw / 2, y1 - RAIL_HEIGHT * u1, pw, RAIL_HEIGHT * u1);
    }
    // nachts hängt über dem Zaun eine warme Lichterkette
    if (theme.lights && (theme.night ?? 0) > 0.02) {
      // knapp über der oberen Latte
      const top = RAIL_HEIGHT * 0.93;
      stringLights(
        ctx,
        theme.lights,
        theme.night ?? 0,
        x1,
        y1 - top * u1,
        x2,
        y2 - top * u2,
        20 * u1,
        1,
        Math.max(0.6, 26 * u1),
        seg.index + 1,
      );
      ctx.fillStyle = color;
    }
  }
}

function drawSprites(
  ctx: CanvasRenderingContext2D,
  seg: Segment,
  v: RoadView,
  paint: SpritePainter,
): void {
  const unit = seg.p1.scale * v.unit;
  if (unit * ROAD_WIDTH < 2) return;
  ctx.globalAlpha = Math.min(1, seg.fog * 1.15);
  for (const sprite of seg.sprites) {
    const x = seg.p1.sx + unit * sprite.offset * ROAD_WIDTH;
    if (x < -unit * 4000 || x > v.w + unit * 4000) continue;
    paint(sprite, x, seg.p1.sy, unit);
  }
  ctx.globalAlpha = 1;
}

/**
 * Der Teaser als kleine Fahrt in der Verfolgerperspektive:
 * Ein grauer Zauberer zuckelt mit seiner Kutsche durchs Hügelland, bis rechts
 * ein Motorrad auftaucht. Ein Klick darauf öffnet ein magisches Portal zur
 * Neon Coast – dort sitzt er in derselben Ansicht auf dem Bike.
 */
import { clamp, easeInOut, hex, lerp, mixRGB, rgba, seeded, smooth, type RGB } from './canvasUtils';
import { drawBike, drawCart, paintRoadside, type SpriteContext } from './driveSprites';
import { NeonBackdrop } from './neonBackdrop';
import {
  CAMERA_DEPTH,
  CAMERA_HEIGHT,
  renderRoad,
  SEGMENT_LENGTH,
  Track,
  type RoadSprite,
  type RoadTheme,
  type RoadView,
  type SpritePainter,
  type SpriteKind,
} from './roadRenderer';
import { FireDragon } from './fireDragon';
import { LightSink } from './nightLights';
import { NIGHT_TINT, NIGHT_TINT_ALPHA, ShireBackdrop } from './shireBackdrop';

/** shire/neon = Fahrt, ride = Übergang ins Neon, back = Übergang zurück ins Grüne */
export type Phase = 'shire' | 'ride' | 'neon' | 'back';

export interface DriveFrame {
  time: number;
  dt: number;
  /** 0 = Sonnenuntergang, 1 = Nacht (nur an der Neon Coast) */
  night: number;
  /** Lenkwunsch -1 … 1 */
  steer: number;
  /** Beat-Impuls 0 … 1 */
  pulse: number;
  accentA: RGB;
  accentB: RGB;
  motion: boolean;
}

interface World {
  track: Track;
  position: number;
  speed: number;
  maxSpeed: number;
  playerX: number;
  /** geglättete Kurvenstärke für Hintergrund-Verschiebung */
  sway: number;
  /** aufsummierte Kurvenfahrt – die Hügel im Hintergrund drehen sich damit mit */
  turn: number;
  lean: number;
  /** 0 … 1, geglättet: wie stark gerade Gas gegeben wird */
  gas: number;
  /** Radumdrehungen seit Start */
  spin: number;
}

/** Sekunden im Hügelland, bevor das Motorrad auftaucht */
const RIDE_DURATION = 2.2;
/** abgestellte Fahrzeuge tauchen in diesem zufälligen Abstand auf (Sekunden) */
const OFFER_MIN = 6;
const OFFER_RANGE = 6;
const FIREWORK_COLORS: RGB[] = ['#ffd54a', '#ff5a4a', '#5ad1ff', '#9dff6a', '#ff8de0'].map(hex);

const SHIRE_THEME: RoadTheme = {
  ground: [hex('#7cb547'), hex('#73ac41')],
  rumble: [hex('#5f9637'), hex('#6aa23f')],
  road: [hex('#c9a56b'), hex('#c19d63')],
  lane: null,
  strip: hex('#79ad48'),
  grid: null,
  fog: hex('#f3ebc9'),
  fogDensity: 3.2,
};

/* ------------------------------------------------------------------ */

interface Particle {
  x: number;
  y: number;
  lx: number;
  ly: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: RGB;
}

interface Rocket {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  t: number;
  colors: RGB[];
}

class Fireworks {
  private particles: Particle[] = [];
  private rockets: Rocket[] = [];

  /** scale > 1 = größere, dichtere Explosion */
  burst(x: number, y: number, colors: RGB[], scale = 1): void {
    const count = Math.round(70 * Math.sqrt(scale));
    const base = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const speed = (70 + Math.random() * 170) * scale;
      const max = 1.2 + Math.random() * 0.9;
      this.particles.push({
        x,
        y,
        lx: x,
        ly: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: max,
        max,
        color: Math.random() < 0.25 ? [255, 245, 220] : base,
      });
    }
  }

  /** einzelner Funke, z. B. für den Schweif des Feuerwerksdrachen */
  spark(x: number, y: number, vx: number, vy: number, color: RGB, life: number): void {
    this.particles.push({ x, y, lx: x, ly: y, vx, vy, life, max: life, color });
  }

  /** delay in Sekunden, bis die Rakete losfliegt */
  launch(sx: number, sy: number, tx: number, ty: number, colors: RGB[], delay = 0): void {
    this.rockets.push({ sx, sy, tx, ty, t: -delay, colors });
  }

  clear(): void {
    this.particles = [];
    this.rockets = [];
  }

  update(dt: number): void {
    for (const r of this.rockets) {
      r.t += dt;
      if (r.t < 0) continue;
      const p = Math.min(1, r.t / 1.1);
      const e = 1 - (1 - p) ** 2;
      const x = lerp(r.sx, r.tx, e) + Math.sin(p * 9) * 3;
      const y = lerp(r.sy, r.ty, e);
      this.particles.push({
        x,
        y,
        lx: x,
        ly: y,
        vx: 0,
        vy: 25,
        life: 0.45,
        max: 0.45,
        color: [255, 214, 150],
      });
      if (p >= 1) this.burst(r.tx, r.ty, r.colors);
    }
    this.rockets = this.rockets.filter((r) => r.t < 1.1);

    for (const p of this.particles) {
      p.lx = p.x;
      p.ly = p.y;
      p.vy += 70 * dt;
      p.vx *= 1 - 1.2 * dt;
      p.vy *= 1 - 1.2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.particles.length === 0) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.6;
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.strokeStyle = rgba(p.color, a);
      ctx.beginPath();
      ctx.moveTo(p.lx, p.ly);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.fillStyle = rgba(p.color, a * 0.25);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

/* ------------------------------------------------------------------ */

type Weighted = [SpriteKind, number][];

/** zieht ein Objekt gemäß seiner Gewichtung */
function pick(rand: () => number, table: Weighted): SpriteKind {
  let r = rand() * table.reduce((sum, [, w]) => sum + w, 0);
  for (const [kind, w] of table) if ((r -= w) <= 0) return kind;
  return table[0][0];
}

/** bei jedem Seitenaufruf eine andere Anordnung am Straßenrand */
const randomSeed = () => (Math.random() * 2 ** 31) | 0;

const SHIRE_NEAR: Weighted = [
  ['hobbit', 3.5],
  ['pub', 2],
  ['flowers', 2.5],
  ['bush', 1.5],
  ['lantern', 3.2],
  ['campfire', 0.7],
  ['pumpkins', 1.2],
  ['sheep', 1],
  ['signpost', 0.5],
];
const SHIRE_FAR: Weighted = [
  ['oak', 5],
  ['hole', 0.8],
  ['haystack', 1.4],
  ['laundry', 1],
  ['stall', 0.9],
  ['well', 0.7],
  ['sheep', 1],
  ['bush', 1.4],
];

const SHIRE_GAP: Partial<Record<SpriteKind, number>> = {
  hole: 60,
  well: 80,
  stall: 60,
  laundry: 50,
  signpost: 60,
  pub: 25,
  campfire: 70,
};

type FieldKind = 'wheat' | 'veg' | 'pasture';
const FIELD_STYLES: Record<FieldKind, { base: string; row: string | null; rows: number }> = {
  wheat: { base: '#e2c25c', row: '#c9a640', rows: 9 },
  veg: { base: '#8a6440', row: '#5f9a37', rows: 7 },
  pasture: { base: '#86c255', row: null, rows: 0 },
};

/** würfelt erneut, bis ein Objekt nicht zu kurz nach seinem letzten Auftritt kommt */
function spacedPicker(rand: () => number, gaps: Partial<Record<SpriteKind, number>>) {
  const lastUsed = new Map<SpriteKind, number>();
  const picker = (table: Weighted, i: number): SpriteKind | null => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const kind = pick(rand, table);
      const last = lastUsed.get(kind);
      if (last === undefined || i - last >= (gaps[kind] ?? 0)) {
        lastUsed.set(kind, i);
        return kind;
      }
    }
    return null;
  };
  picker.mark = (kind: SpriteKind, i: number) => lastUsed.set(kind, i);
  return picker;
}

function buildShireTrack(): Track {
  const t = new Track()
    .road(20, 30, 20, 0, 0)
    .road(40, 40, 40, 2, 12)
    .road(30, 30, 30, 0, -8)
    .road(40, 50, 40, -3, 6)
    .road(30, 40, 30, 1, -10)
    .road(40, 40, 40, 3, 8)
    .road(30, 30, 30, -2, -6)
    .road(40, 40, 40, 0, 4)
    .close(30);

  const rand = seeded(randomSeed());
  const n = t.segments.length;
  const pickSpaced = spacedPicker(rand, SHIRE_GAP);

  // lange Felder und Pferdekoppeln parallel zur Straße, abwechselnd links und rechts
  const fieldSide = new Map<number, number>();
  let side = rand() < 0.5 ? -1 : 1;
  for (let start = 30 + Math.floor(rand() * 20); start < n - 60;) {
    const length = 60 + Math.floor(rand() * 70);
    const end = Math.min(start + length, n - 10);
    const kinds: FieldKind[] = ['wheat', 'veg', 'pasture'];
    const kind = kinds[Math.floor(rand() * kinds.length)];
    const style = FIELD_STYLES[kind];
    const inner = 1.4;
    const outer = 4.6 + rand() * 1.5;
    t.field(start, end, {
      from: side * inner,
      to: side * outer,
      base: hex(style.base),
      row: style.row ? hex(style.row) : null,
      rows: style.rows,
    });
    for (let i = start; i < end; i++) fieldSide.set(i, side);

    if (kind === 'pasture') {
      t.rail(start, end, side * 1.3);
      t.rail(start, end, side * outer);
      for (let i = start + 6; i < end - 4; i += 10 + Math.floor(rand() * 10)) {
        t.sprite(i, 'horse', side * (1.9 + rand() * (outer - 2.6)), Math.floor(rand() * 12));
      }
    } else {
      if (rand() < 0.6) t.rail(start, end, side * 1.3);
      const mid = start + Math.floor(length * (0.3 + rand() * 0.4));
      t.sprite(mid, 'scarecrow', side * (2 + rand() * (outer - 2.8)));
    }
    start = end + 25 + Math.floor(rand() * 50);
    side = -side;
  }

  // Kulisse – auf der Feldseite bleibt der Rand frei
  for (let i = 6; i < n; i += 2 + Math.floor(rand() * 3)) {
    for (const s of [-1, 1]) {
      if (fieldSide.get(i) === s) continue;
      if (rand() < 0.5) {
        const kind = pickSpaced(SHIRE_NEAR, i);
        if (kind) t.sprite(i, kind, s * (1.3 + rand() * 0.4), Math.floor(rand() * 12));
      }
      if (rand() < 0.7) {
        const kind = pickSpaced(SHIRE_FAR, i);
        if (!kind) continue;
        const offset = kind === 'hole' ? 2.2 + rand() * 0.5 : 2.05 + rand() * 2.4;
        t.sprite(i, kind, s * offset, Math.floor(rand() * 12));
      }
    }
    // hinter den Feldern stehen ein paar Bäume
    const fs = fieldSide.get(i);
    if (fs && rand() < 0.25) t.sprite(i, 'oak', fs * (6.4 + rand() * 1.5), Math.floor(rand() * 12));
  }
  return t;
}

const NEON_NEAR: Weighted = [
  ['gangster', 3],
  ['lady', 3],
  ['car', 2.4],
  ['hydrant', 0.8],
  ['phonebooth', 0.4],
];
const NEON_FAR: Weighted = [
  ['palm', 6],
  ['umbrella', 1],
  ['car', 0.8],
  ['billboard', 0.5],
  ['motel', 0.4],
];
const NEON_BUILDINGS: Weighted = [
  ['house', 4],
  ['shop', 3],
  ['hotel', 2.5],
  ['tower', 2],
  ['casino', 1],
];

/** Mindestabstand in Segmenten, bevor ein Objekt erneut auftauchen darf */
const MIN_GAP: Partial<Record<SpriteKind, number>> = {
  phonebooth: 90,
  billboard: 80,
  motel: 120,
  hydrant: 15,
  casino: 260,
  hotel: 30,
  tower: 25,
};

/** seitlicher Abstand der Gebäude – breite Gebäude stehen weiter hinten */
const BUILDING_OFFSET: Partial<Record<SpriteKind, number>> = {
  house: 3.2,
  shop: 2.9,
  hotel: 3.7,
  tower: 4.3,
  casino: 3.9,
};

function buildNeonTrack(): Track {
  const t = new Track()
    .road(30, 40, 30, 0, 0)
    .road(50, 60, 50, 3, 0)
    .road(30, 30, 30, 0, 5)
    .road(40, 50, 40, -4, -5)
    .road(40, 40, 40, 2, 3)
    .road(50, 50, 50, -2, 0)
    .road(30, 40, 30, 0, -3)
    .close(25);

  const rand = seeded(randomSeed());
  const n = t.segments.length;
  const pickSpaced = spacedPicker(rand, MIN_GAP);

  for (let i = 0; i < n; i += 8) {
    t.sprite(i, 'lamp', -1.22, i / 8);
    t.sprite(i + 4, 'lamp', 1.22, i / 8 + 1);
  }
  for (let i = 2; i < n; i += 2 + Math.floor(rand() * 3)) {
    for (const side of [-1, 1]) {
      if (rand() < 0.45) {
        const kind = pickSpaced(NEON_NEAR, i);
        if (kind)
          t.sprite(
            i,
            kind,
            side * (kind === 'car' ? 1.85 : 1.45 + rand() * 0.35),
            Math.floor(rand() * 12),
          );
      }
      if (rand() < 0.55) {
        const kind = pickSpaced(NEON_FAR, i);
        const offset = kind === 'billboard' || kind === 'motel' ? 2.7 : 2.1 + rand() * 0.8;
        if (kind) t.sprite(i, kind, side * offset, Math.floor(rand() * 12));
      }
    }
  }
  // gleich nach der Ankunft taucht rechts ein Casino auf
  const showcase = 190;
  t.sprite(showcase, 'casino', BUILDING_OFFSET.casino!, Math.floor(rand() * 12));
  pickSpaced.mark('casino', showcase);

  // durchgehende Häuserzeilen auf beiden Seiten
  for (const side of [-1, 1]) {
    for (let i = Math.floor(rand() * 6); i < n; i += 6 + Math.floor(rand() * 5)) {
      const kind = pickSpaced(NEON_BUILDINGS, i) ?? 'house';
      const offset = (BUILDING_OFFSET[kind] ?? 3.2) + rand() * 0.4;
      t.sprite(i, kind, side * offset, Math.floor(rand() * 12));
      if (kind === 'casino') i += 12;
    }
  }

  // vor jedem Casino eine Freifläche lassen, damit es beim Heranfahren nicht verdeckt wird
  t.segments.forEach((seg, i) => {
    for (const casino of seg.sprites.filter((sp) => sp.kind === 'casino')) {
      const side = Math.sign(casino.offset);
      for (let k = i - 45; k <= i + 12; k++) {
        const other = t.segments[(k + n) % n];
        other.sprites = other.sprites.filter(
          (sp) => sp === casino || Math.sign(sp.offset) !== side || Math.abs(sp.offset) < 2,
        );
      }
    }
  });
  return t;
}

const makeWorld = (track: Track, maxSpeed: number): World => ({
  track,
  position: 0,
  speed: maxSpeed,
  maxSpeed,
  playerX: 0,
  sway: 0,
  turn: 0,
  lean: 0,
  gas: 0,
  spin: 0,
});

/* ------------------------------------------------------------------ */

export class DriveScene {
  phase: Phase = 'shire';
  onPhase: ((phase: Phase) => void) | null = null;
  /** Klickfläche des abgestellten Fahrzeugs in CSS-Pixeln */
  readonly offerRect = { x: 0, y: 0, w: 0, h: 0 };
  /** ist gerade ein abgestelltes Fahrzeug anklickbar? */
  offerVisible = false;
  onOffer: ((visible: boolean) => void) | null = null;
  /** true, solange der Zeiger auf dem eigenen Fahrzeug gedrückt gehalten wird */
  throttle = false;

  private w = 0;
  private h = 0;
  private dpr = 1;
  private view: RoadView = { w: 0, h: 0, horizon: 0, unit: 0, playerZ: 0 };
  private shireBg: ShireBackdrop;
  private neonBg: NeonBackdrop;
  private shire = makeWorld(buildShireTrack(), 2600);
  private neon = makeWorld(buildNeonTrack(), 6400);
  private fireworks = new Fireworks();
  private phaseTime = 0;
  private rocketTimer = 1.8;
  private boost = 0;
  /** nachts wird die Welt im Grünen auf diese Ebene gemalt und als Ganzes abgedunkelt */
  private layer = document.createElement('canvas');
  private layerCtx = this.layer.getContext('2d')!;
  private lights = new LightSink();
  /** seltener Gast im Grünen, der kurz über die Straße springt */
  private creature: {
    index: number;
    side: number;
    t: number;
    state: 'wait' | 'jump' | 'gone';
    sprite: RoadSprite;
  } | null = null;
  private creatureTimer = 25 + Math.random() * 25;
  /** Sekunden, seit sich das Portallicht wieder im Stab sammelt; -1 = inaktiv */
  private gatherTime = -1;
  private gatherTarget = { x: 0, y: 0 };
  /** am Straßenrand abgestelltes Motorrad (im Grünen) bzw. Kutsche (an der Neon Coast) */
  private offer: {
    world: 'shire' | 'neon';
    index: number;
    sprite: RoadSprite;
    drawn: boolean;
  } | null = null;
  private offerTimer = 2;
  private dragon = new FireDragon();
  /** verkleinerte Kopien des Bildes für einen günstigen Bloom-Effekt ohne Canvas-Filter */
  private bloomA = document.createElement('canvas');
  private bloomB = document.createElement('canvas');

  constructor(private ctx: CanvasRenderingContext2D) {
    this.shireBg = new ShireBackdrop(ctx);
    this.neonBg = new NeonBackdrop(ctx);
  }

  resize(width: number, height: number, dpr: number): void {
    this.w = width;
    this.h = height;
    this.dpr = dpr;
    const horizon = Math.round(height * 0.5);
    const unit = Math.max(width, height * 1.25) / 2;
    // Abstand so wählen, dass das Fahrzeug auf Höhe groundRatio fährt
    const playerZ = (CAMERA_DEPTH * CAMERA_HEIGHT * unit) / (height * this.groundRatio - horizon);
    this.view = { w: width, h: height, horizon, unit, playerZ };
    this.shireBg.resize(width, height, horizon);
    this.neonBg.resize(width, height, dpr, horizon);
    this.layer.width = Math.round(width * dpr);
    this.layer.height = Math.round(height * dpr);
    this.bloomA.width = Math.max(1, Math.ceil((width * dpr) / 4));
    this.bloomA.height = Math.max(1, Math.ceil((height * dpr) / 4));
    this.bloomB.width = Math.max(1, Math.ceil((width * dpr) / 12));
    this.bloomB.height = Math.max(1, Math.ceil((height * dpr) / 12));
  }

  /** liegt der Punkt (CSS-Pixel) auf dem Fahrzeug des Zauberers? */
  isOnPlayer(x: number, y: number): boolean {
    if (this.phase !== 'shire' && this.phase !== 'neon') return false;
    const k = this.k;
    const half = (this.phase === 'shire' ? 150 : 105) * k;
    const top = this.playerY - (this.phase === 'shire' ? 330 : 300) * k;
    return Math.abs(x - this.w / 2) < half && y > top && y < this.playerY + 20 * k;
  }

  /** liegt der Punkt (CSS-Pixel) auf der leuchtenden Höhle im Gebirge? */
  isOnCave(x: number, y: number): boolean {
    const cave = this.shireBg.cave;
    if (this.phase !== 'shire' || !cave) return false;
    return Math.hypot(x - cave.x, y - cave.y) < cave.r + 12;
  }

  /** lässt den Feuerwerksdrachen aus der Höhle aufsteigen */
  launchDragon(): void {
    const cave = this.shireBg.cave;
    if (this.phase !== 'shire' || !cave || this.dragon.active) return;
    this.dragon.start(cave.x, cave.y, this.w, this.h);
  }

  /** steigt aufs abgestellte Motorrad – nur im Grünen */
  ride(): void {
    if (this.phase !== 'shire') return;
    Object.assign(this.neon, {
      position: 0,
      speed: this.neon.maxSpeed * 0.3,
      playerX: 0,
      sway: 0,
      lean: 0,
    });
    this.gatherTime = -1;
    this.setPhase('ride');
  }

  /** nimmt die Kutsche und reist durchs Portal zurück ins Grüne */
  rideBack(): void {
    if (this.phase !== 'neon') return;
    this.gatherTime = -1;
    this.creature = null;
    this.setPhase('back');
  }

  burst(x: number, y: number, colors?: RGB[]): void {
    this.fireworks.burst(x, y, colors ?? FIREWORK_COLORS);
  }

  randomBurst(colors: RGB[]): void {
    this.fireworks.burst(
      this.w * (0.2 + Math.random() * 0.6),
      this.view.horizon * (0.15 + Math.random() * 0.5),
      colors,
    );
  }

  /* ------------------------------------------------------------------ */

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTime = 0;
    this.offer = null;
    this.offerTimer = 2;
    this.onPhase?.(phase);
  }

  /**
   * Alle paar Sekunden steht vorn am Straßenrand ein Fahrzeug, auf das man zufährt:
   * im Grünen ein Motorrad mit grellen Lichtern, an der Neon Coast die Kutsche.
   */
  private updateOffer(f: DriveFrame): void {
    const inShire = this.phase === 'shire';
    if (!inShire && this.phase !== 'neon') return;
    const world = inShire ? this.shire : this.neon;
    const track = world.track;
    const ahead = world.position + this.view.playerZ;

    if (this.offer) {
      let dist = (this.offer.index * SEGMENT_LENGTH - ahead) % track.length;
      if (dist < 0) dist += track.length;
      if (dist > track.length / 2) dist -= track.length;
      if (dist < -3 * SEGMENT_LENGTH) this.offer = null;
    }

    this.offerTimer -= f.dt;
    if (this.offer || this.offerTimer > 0) return;
    this.offerTimer = OFFER_MIN + Math.random() * OFFER_RANGE;
    const side = Math.random() < 0.5 ? -1 : 1;
    // ohne Bewegung (reduzierte Animationen) steht das Fahrzeug gleich in der Nähe
    const segmentsAhead = f.motion ? (inShire ? 70 : 120) : 14;
    this.offer = {
      world: inShire ? 'shire' : 'neon',
      index: (Math.floor(ahead / SEGMENT_LENGTH) + segmentsAhead) % track.segments.length,
      sprite: inShire
        ? { kind: 'parkedBike', offset: side * (1.2 + Math.random() * 0.08), variant: 0 }
        : { kind: 'parkedCart', offset: side * (0.55 + Math.random() * 0.3), variant: 0 },
      drawn: false,
    };
  }

  private paintParkedBike(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    u: number,
    f: DriveFrame,
    lights?: LightSink,
  ): void {
    const S = 2.6 * u;
    const pulse = 0.6 + 0.4 * Math.sin(f.time * 5);
    const tint = (c: RGB) => `${c[0] | 0},${c[1] | 0},${c[2] | 0}`;

    // greller Neonschein rund ums Motorrad
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y - 120 * S, 10 * S, x, y - 120 * S, 320 * S);
    g.addColorStop(0, rgba(f.accentA, 0.6 * pulse));
    g.addColorStop(0.5, rgba(f.accentB, 0.2 * pulse));
    g.addColorStop(1, rgba(f.accentA, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - 320 * S, y - 440 * S, 640 * S, 640 * S);
    ctx.restore();

    drawBike(ctx, x, y, S, {
      time: f.time,
      lean: 0,
      speed: 0,
      motion: f.motion,
      rider: false,
      night: f.night,
      accentA: f.accentA,
      accentB: f.accentB,
      highlight: 1,
    });

    // Warnblinker an den Lenkerenden
    if (Math.floor(f.time * 2.5) % 2 === 0) {
      ctx.save();
      ctx.fillStyle = '#ffb020';
      ctx.shadowColor = '#ffb020';
      ctx.shadowBlur = 18 * S;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + side * 84 * S, y - 206 * S, 9 * S, 0, Math.PI * 2);
        ctx.fill();
        lights?.add(ctx, x + side * 84 * S, y - 206 * S, 16 * S, 'lamp', 0, '255,176,32');
      }
      ctx.restore();
    }
    if (lights) {
      lights.add(ctx, x, y - 108 * S, 24 * S, 'lamp', 0, '255,60,90');
      lights.add(ctx, x, y - 10 * S, 110 * S, 'window', 0, tint(f.accentA));
      lights.add(ctx, x, y - 165 * S, 70 * S, 'window', 0, tint(f.accentA));
    }
    Object.assign(this.offerRect, { x: x - 110 * S, y: y - 290 * S, w: 220 * S, h: 300 * S });
  }

  private paintParkedCart(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    u: number,
    f: DriveFrame,
  ): void {
    const S = 3.4 * u;
    const pulse = 0.6 + 0.4 * Math.sin(f.time * 4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y - 150 * S, 10 * S, x, y - 150 * S, 380 * S);
    g.addColorStop(0, rgba(f.accentA, 0.45 * pulse));
    g.addColorStop(0.6, rgba(f.accentB, 0.15 * pulse));
    g.addColorStop(1, rgba(f.accentA, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - 380 * S, y - 530 * S, 760 * S, 760 * S);
    ctx.restore();

    // die Silhouette leuchtet pulsierend in Neonrosa – so hebt sich der Rand ab
    ctx.save();
    ctx.shadowColor = rgba(mixRGB(f.accentA, [255, 255, 255], 0.2));
    ctx.shadowBlur = (20 + 30 * pulse) * Math.min(2, this.dpr);
    for (let pass = 0; pass < 2; pass++)
      drawCart(ctx, x, y, S, { time: f.time, lean: 0, speed: 0, motion: false }, undefined, false);
    ctx.restore();
    drawCart(ctx, x, y, S, { time: f.time, lean: 0, speed: 0, motion: false }, undefined, false);

    // warme Laterne und neonfarbene Unterbodenbeleuchtung
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lamp = ctx.createRadialGradient(x, y - 63 * S, 0, x, y - 63 * S, 80 * S);
    lamp.addColorStop(0, 'rgba(255,220,150,0.9)');
    lamp.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(x - 80 * S, y - 143 * S, 160 * S, 160 * S);
    ctx.fillStyle = rgba(f.accentB, 0.35 + 0.25 * pulse);
    ctx.beginPath();
    ctx.ellipse(x, y, 170 * S, 20 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    Object.assign(this.offerRect, { x: x - 170 * S, y: y - 300 * S, w: 340 * S, h: 310 * S });
  }

  /** malt Randobjekte und fängt dabei das abgestellte Fahrzeug ab */
  private painter(
    target: CanvasRenderingContext2D,
    sprites: SpriteContext,
    f: DriveFrame,
    lights?: LightSink,
  ): SpritePainter {
    return (s, x, y, u) => {
      if (this.offer && s === this.offer.sprite) {
        this.offer.drawn = true;
        if (s.kind === 'parkedBike') this.paintParkedBike(target, x, y, u, f, lights);
        else this.paintParkedCart(target, x, y, u, f);
        return;
      }
      paintRoadside(target, s, x, y, u, sprites);
    };
  }

  private get k(): number {
    return Math.min(this.w / (this.w < this.h ? 720 : 1000), this.h / 820);
  }

  /** Höhe der Fahrbahn unter dem Fahrzeug; im Hochformat höher, damit die Bedienelemente frei bleiben */
  private get groundRatio(): number {
    return this.w < this.h ? 0.74 : 0.89;
  }

  private get playerY(): number {
    return this.h * this.groundRatio;
  }

  private update(world: World, f: DriveFrame): void {
    if (!f.motion) return;
    const active =
      (world === this.shire && this.phase === 'shire') ||
      (world === this.neon && this.phase === 'neon');
    world.gas += ((this.throttle && active ? 1 : 0) - world.gas) * Math.min(1, f.dt * 4);
    const target = world.maxSpeed * (1 + 0.9 * world.gas);
    world.speed += (target - world.speed) * Math.min(1, f.dt * (world.gas > 0.1 ? 1.6 : 0.8));
    world.position = (world.position + world.speed * f.dt) % world.track.length;
    world.spin += (world.speed * f.dt) / 520;
    const curve = world.track.at(world.position + this.view.playerZ).curve;
    const pace = world.speed / world.maxSpeed;
    const steerTarget = f.steer * 0.7;
    world.playerX +=
      (steerTarget - world.playerX) * Math.min(1, f.dt * 2.5) - curve * f.dt * 0.05 * pace;
    world.playerX = clamp(world.playerX, -1.1, 1.1);
    world.sway += (clamp(curve / 4, -1, 1) - world.sway) * Math.min(1, f.dt * 1.2);
    world.turn += curve * pace * f.dt;
    const lean = clamp((steerTarget - world.playerX) * 1.6 + curve * 0.12 * pace, -1, 1);
    world.lean += (lean - world.lean) * Math.min(1, f.dt * 5);
  }

  /**
   * Ganz selten hockt am Wegrand eine magere Kreatur. Kurz bevor die Kutsche da ist,
   * springt sie auf die Straße, hält kurz inne und hüpft auf die andere Seite davon.
   */
  private updateCreature(f: DriveFrame): void {
    const track = this.shire.track;
    const ahead = this.shire.position + this.view.playerZ;
    if (!this.creature) {
      if (!f.motion || this.phase === 'ride') return;
      this.creatureTimer -= f.dt;
      if (this.creatureTimer > 0) return;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.creature = {
        index: (Math.floor(ahead / SEGMENT_LENGTH) + 85) % track.segments.length,
        side,
        t: 0,
        state: 'wait',
        sprite: { kind: 'gollum', offset: side * 1.6, variant: 0, lift: 0 },
      };
      return;
    }

    const c = this.creature;
    const sp = c.sprite;
    let dist = (c.index * SEGMENT_LENGTH - ahead) % track.length;
    if (dist < 0) dist += track.length;
    if (dist > track.length / 2) dist -= track.length;

    if (c.state === 'wait' && dist < 52 * SEGMENT_LENGTH) c.state = 'jump';
    if (c.state !== 'wait') {
      c.t += f.dt;
      const hop = (q: number, from: number, to: number) => {
        const e = clamp(q, 0, 1);
        sp.offset = lerp(from, to, e);
        sp.lift = Math.sin(Math.PI * e) * 600;
        sp.variant = e > 0 && e < 1 ? 1 : 0;
      };
      // Sprung auf die Straße, kurzes Umschauen, Sprung auf die andere Seite, davonkrabbeln
      if (c.t < 0.85) hop(c.t / 0.85, c.side * 1.6, c.side * 0.6);
      else if (c.t < 2.2) hop(1, c.side * 0.6, c.side * 0.6);
      else if (c.t < 3.05) hop((c.t - 2.2) / 0.85, c.side * 0.6, -c.side * 1.7);
      else {
        c.state = 'gone';
        sp.variant = 0;
        sp.lift = 0;
        sp.offset = lerp(-c.side * 1.7, -c.side * 2.6, clamp((c.t - 3.05) / 2.5, 0, 1));
      }
    }
    if (dist < -6 * SEGMENT_LENGTH) {
      this.creature = null;
      this.creatureTimer = 50 + Math.random() * 50;
    }
  }

  render(f: DriveFrame): void {
    const { ctx, w, h, dpr } = this;
    if (!w || !h) return;

    this.phaseTime += f.dt;
    if (this.phase === 'ride' && (this.phaseTime >= RIDE_DURATION || !f.motion)) {
      this.boost = f.motion ? 1 : 0;
      this.setPhase('neon');
    }
    if (this.phase === 'back' && (this.phaseTime >= RIDE_DURATION || !f.motion)) {
      this.setPhase('shire');
    }

    const toNeon = this.phase === 'ride';
    const transit = toNeon || this.phase === 'back';
    const p = transit ? this.phaseTime / RIDE_DURATION : 0;
    const showShire = this.phase !== 'neon';
    const showNeon = this.phase !== 'shire';

    if (showShire) this.update(this.shire, f);
    if (this.phase === 'shire') this.updateCreature(f);
    if (showNeon) this.update(this.neon, f);
    if (toNeon && p > 0.3) this.boost = 1;
    else this.boost = Math.max(this.neon.gas * 0.7, this.boost - f.dt * 0.55);

    // die Kutsche hat Feuerwerk geladen – ab und zu startet eine Rakete
    if (this.phase === 'shire' && f.motion) {
      this.rocketTimer -= f.dt;
      if (this.rocketTimer <= 0) {
        this.rocketTimer = 2.6 + Math.random() * 2;
        const k = this.k;
        this.fireworks.launch(
          w / 2 - 70 * k,
          this.playerY - 150 * k,
          w * (0.2 + Math.random() * 0.6),
          h * (0.1 + Math.random() * 0.22),
          FIREWORK_COLORS,
        );
      }
    }
    if (this.phase === 'shire') this.dragon.update(f.dt, this.fireworks);
    else this.dragon.stop();
    this.fireworks.update(f.dt);
    this.updateOffer(f);
    if (this.offer) this.offer.drawn = false;

    // leichter Zoom, während der Zauber sich auflädt
    const zoom = 1 + 0.05 * smooth(0, 0.3, p) * (1 - smooth(0.3, 0.6, p));
    const ox = (w / 2) * (1 - zoom);
    const oy = h * 0.8 * (1 - zoom);
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, ox * dpr, oy * dpr);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Ausgangswelt komplett, Zielwelt im Portal, das sich aus dem Stab des Zauberers öffnet
    if (this.phase === 'shire' || toNeon) this.drawShire(f);
    else this.drawNeon(f);
    // der Drache fliegt über alles hinweg
    if (this.phase === 'shire') this.dragon.draw(ctx, f.time, f.night);

    if (transit) {
      const origin = toNeon ? this.cartStaffTip() : this.riderCrystal();
      this.drawStaffCharge(origin.x, origin.y, p, f, toNeon);
      const maxR =
        Math.hypot(Math.max(origin.x, w - origin.x), Math.max(origin.y, h - origin.y)) + 40;
      const radius = easeInOut(smooth(0.28, 0.95, p)) * maxR;
      if (radius > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, radius, 0, Math.PI * 2);
        ctx.clip();
        if (toNeon) this.drawNeon(f);
        else this.drawShire(f);
        ctx.restore();
        this.drawPortalRing(origin.x, origin.y, radius, f);
      }
      this.drawPortalFlash(origin.x, origin.y, p, f);

      // am Ende bündelt sich das Licht wieder im Stab des Zauberers
      if (p >= 0.62 && this.gatherTime < 0) {
        this.gatherTime = 0;
        this.gatherTarget = toNeon ? this.riderCrystal() : this.cartStaffTip();
      }
    }
    if (this.gatherTime >= 0) {
      this.gatherTime += f.dt;
      this.drawLightGather(this.gatherTime / 1.4, f, this.gatherTarget);
      if (this.gatherTime > 1.4) this.gatherTime = -1;
    }

    this.drawVignette();

    const r = this.offerRect;
    const visible =
      !!this.offer?.drawn &&
      r.h > 24 &&
      r.x + r.w * 0.5 > 0 &&
      r.x + r.w * 0.5 < w &&
      (this.phase === 'shire' || this.phase === 'neon');
    if (visible !== this.offerVisible) {
      this.offerVisible = visible;
      this.onOffer?.(visible);
    }
  }

  private spriteContext(f: DriveFrame, night: number): SpriteContext {
    return { time: f.time, night, accentA: f.accentA, accentB: f.accentB, motion: f.motion };
  }

  private drawShire(f: DriveFrame): void {
    const { ctx, shire } = this;
    const k = this.k;
    const night = f.night;
    const dark = night > 0.01;
    const lights = dark ? this.lights : undefined;
    lights?.clear();
    const sprites: SpriteContext = { ...this.spriteContext(f, night), lights };

    this.shireBg.render({
      time: f.time,
      px: shire.sway,
      turn: shire.turn,
      night,
      motion: f.motion,
    });
    this.fireworks.draw(ctx);

    // nachts landet alles Weitere auf der Zwischenebene
    const target = dark ? this.layerCtx : ctx;
    if (dark) {
      target.setTransform(1, 0, 0, 1, 0, 0);
      target.clearRect(0, 0, this.layer.width, this.layer.height);
      target.setTransform(ctx.getTransform());
    }

    const theme: RoadTheme = dark
      ? {
          ...SHIRE_THEME,
          // vor der Abdunklung heller, damit der Nebel danach zum Nachthimmel passt
          fog: mixRGB(SHIRE_THEME.fog, hex('#8489cd'), night),
          lights,
          night,
        }
      : SHIRE_THEME;
    const guest = this.creature;
    const offer = this.offer?.world === 'shire' ? this.offer : null;
    if (guest) shire.track.addTemporary(guest.index, guest.sprite);
    if (offer) shire.track.addTemporary(offer.index, offer.sprite);
    renderRoad(
      target,
      shire.track,
      shire.position,
      shire.playerX,
      this.view,
      theme,
      this.painter(target, sprites, f, lights),
    );
    if (guest) shire.track.removeTemporary(guest.index, guest.sprite);
    if (offer) shire.track.removeTemporary(offer.index, offer.sprite);

    const vehicle = {
      time: f.time,
      lean: shire.lean,
      speed: shire.speed / shire.maxSpeed,
      motion: f.motion,
      spin: shire.spin,
      gas: shire.gas,
    };
    drawCart(target, this.w / 2, this.playerY, k, vehicle, lights);

    if (dark) {
      // nur bereits gemalte Pixel abdunkeln, der Himmel darunter bleibt unberührt
      target.save();
      target.setTransform(1, 0, 0, 1, 0, 0);
      target.globalCompositeOperation = 'source-atop';
      target.fillStyle = rgba(NIGHT_TINT, NIGHT_TINT_ALPHA * night);
      target.fillRect(0, 0, this.layer.width, this.layer.height);
      target.restore();

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.layer, 0, 0);
      ctx.restore();
      this.lights.draw(ctx, f.time, night);
    }
  }

  private drawNeon(f: DriveFrame): void {
    const { ctx, neon } = this;
    const night = f.night;
    const sprites = this.spriteContext(f, night);

    this.neonBg.render({
      time: f.time,
      night,
      px: neon.sway,
      pulse: f.pulse,
      accentA: f.accentA,
      accentB: f.accentB,
      motion: f.motion,
    });
    this.fireworks.draw(ctx);

    const theme: RoadTheme = {
      ground: [
        mixRGB(hex('#1e0e33'), hex('#0a0514'), night),
        mixRGB(hex('#1a0b2d'), hex('#08040f'), night),
      ],
      rumble: [f.accentA, mixRGB(f.accentB, [255, 255, 255], 0.25)],
      road: [
        mixRGB(hex('#2b1b42'), hex('#130b22'), night),
        mixRGB(hex('#27173b'), hex('#10091c'), night),
      ],
      lane: hex('#fbe8ff'),
      strip: null,
      grid: f.accentB,
      fog: this.neonBg.horizonColor(night),
      fogDensity: 4.8,
    };
    this.drawHorizonMist(f, 0.55);
    const offer = this.offer?.world === 'neon' ? this.offer : null;
    if (offer) neon.track.addTemporary(offer.index, offer.sprite);
    renderRoad(
      ctx,
      neon.track,
      neon.position,
      neon.playerX,
      this.view,
      theme,
      this.painter(ctx, sprites, f),
    );
    if (offer) neon.track.removeTemporary(offer.index, offer.sprite);
    this.drawHorizonMist(f, 0.3);

    // Bloom vor dem Fahrzeug, damit der Zauberer selbst nicht überstrahlt
    this.applyBloom(0.06 + 0.4 * night);
    this.drawSpeedLines(f);
    drawBike(ctx, this.w / 2, this.playerY, this.k, {
      time: f.time,
      lean: neon.lean,
      speed: neon.speed / neon.maxSpeed,
      motion: f.motion,
      spin: neon.spin,
      gas: neon.gas,
      rider: true,
      night,
      accentA: f.accentA,
      accentB: f.accentB,
      highlight: 0,
      white: true,
      aura: this.boost * 0.4,
    });
  }

  /**
   * Überstrahlen heller Neonflächen: das Bild wird verkleinert (und dabei weichgezeichnet)
   * und additiv wieder darübergelegt. Dunkle Bereiche tragen kaum etwas bei.
   */
  private applyBloom(strength: number): void {
    if (strength <= 0.01) return;
    const { ctx, bloomA, bloomB } = this;
    const src = ctx.canvas;
    const a = bloomA.getContext('2d')!;
    const b = bloomB.getContext('2d')!;
    a.globalCompositeOperation = 'copy';
    a.drawImage(src, 0, 0, bloomA.width, bloomA.height);
    b.globalCompositeOperation = 'copy';
    b.drawImage(bloomA, 0, 0, bloomB.width, bloomB.height);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, strength * 0.55);
    ctx.drawImage(bloomA, 0, 0, src.width, src.height);
    ctx.globalAlpha = Math.min(1, strength);
    ctx.drawImage(bloomB, 0, 0, src.width, src.height);
    ctx.restore();
  }

  /** Punkt (dx, dy) eines Fahrzeugs um seinen Aufstandspunkt gedreht, in Bildschirmkoordinaten */
  private vehiclePoint(dx: number, dy: number, angle: number): { x: number; y: number } {
    const k = this.k;
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    return {
      x: this.w / 2 + (dx * c - dy * sn) * k,
      y: this.playerY + (dx * sn + dy * c) * k,
    };
  }

  /** Spitze des grauen Stabs auf der Kutsche */
  private cartStaffTip(): { x: number; y: number } {
    return this.vehiclePoint(78, -304, this.shire.lean * 0.12);
  }

  /** Kristall des weißen Stabs auf dem Rücken des Fahrers */
  private riderCrystal(): { x: number; y: number } {
    return this.vehiclePoint(66, -268, this.neon.lean * 0.45);
  }

  /** Neonrosa, etwas aufgehellt – die Farbe des Portallichts */
  private portalPink(f: DriveFrame): RGB {
    return mixRGB(f.accentA, [255, 255, 255], 0.25);
  }

  /** der Stab lädt sich auf: warmes Licht, das langsam in Neonrosa übergeht */
  private drawStaffCharge(x: number, y: number, p: number, f: DriveFrame, fromWarm: boolean): void {
    const charge = smooth(0, 0.28, p) * (1 - smooth(0.4, 0.6, p));
    if (charge <= 0.01) return;
    const { ctx } = this;
    const k = this.k;
    // warmes Licht des grauen bzw. kühles Licht des weißen Stabs geht in Neonrosa über
    const start: RGB = fromWarm ? [255, 214, 150] : [225, 238, 255];
    const color = mixRGB(start, this.portalPink(f), smooth(0.08, 0.3, p));
    const r = (30 + 170 * charge) * k;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.95 * charge})`);
    g.addColorStop(0.25, rgba(color, 0.75 * charge));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // drehende Lichtstrahlen
    ctx.strokeStyle = rgba(color, 0.55 * charge);
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + f.time * 2.5;
      const len = r * (1.2 + 0.4 * Math.sin(f.time * 9 + i));
      ctx.lineWidth = (2 + charge * 4) * k;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** rosa Lichtwelle, die vom Stab aus über das Bild läuft */
  private drawPortalFlash(x: number, y: number, p: number, f: DriveFrame): void {
    const strength = smooth(0.18, 0.3, p) * (1 - smooth(0.32, 0.6, p));
    if (strength <= 0.01) return;
    const { ctx, w, h } = this;
    const color = this.portalPink(f);
    const reach = Math.hypot(w, h) * (0.3 + smooth(0.18, 0.4, p));
    const g = ctx.createRadialGradient(x, y, 0, x, y, reach);
    g.addColorStop(0, `rgba(255,250,255,${0.85 * strength})`);
    g.addColorStop(0.35, rgba(color, 0.6 * strength));
    g.addColorStop(1, rgba(color, 0.15 * strength));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /** Lichtfunken ziehen von außen zurück in den Kristall des weißen Stabs */
  private drawLightGather(g: number, f: DriveFrame, target: { x: number; y: number }): void {
    if (g >= 1) return;
    const { ctx, w, h } = this;
    const k = this.k;
    const { x, y } = target;
    const color = this.portalPink(f);
    const reach = Math.hypot(w, h) * 0.7;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < 48; i++) {
      // jeder Funke startet leicht versetzt und beschleunigt zum Kristall hin
      const local = clamp((g - (i % 9) * 0.035) / 0.7, 0, 1);
      if (local <= 0 || local >= 1) continue;
      const travel = local * local;
      const a = i * 2.39996;
      const start = reach * (0.55 + (i % 5) * 0.1);
      const r = start * (1 - travel);
      const tail = Math.min(start - r, 60 + 140 * travel) * (1 - travel * 0.5);
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      const alpha = Math.sin(local * Math.PI) * 0.9;
      ctx.strokeStyle = rgba(mixRGB(color, [255, 255, 255], travel * 0.6), alpha);
      ctx.lineWidth = (1.5 + 2.5 * travel) * Math.max(0.6, k);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x + Math.cos(a) * (r + tail), y + Math.sin(a) * (r + tail));
      ctx.stroke();
    }

    // ein rosa Lichtring zieht sich auf den Kristall zusammen
    const ring = smooth(0, 0.8, g);
    if (ring < 1) {
      const rr = reach * 0.75 * (1 - ring) ** 1.6 + 10 * k;
      ctx.strokeStyle = rgba(color, 0.55 * Math.sin(ring * Math.PI));
      ctx.lineWidth = (3 + 8 * ring) * Math.max(0.6, k);
      ctx.shadowColor = rgba(color);
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // der Kristall saugt das Licht auf und leuchtet zum Schluss einmal hell auf
    const core = smooth(0.2, 0.85, g) * (1 - smooth(0.9, 1, g));
    const pulse = smooth(0.82, 0.92, g) * (1 - smooth(0.92, 1, g));
    const r = (20 + 45 * core + 85 * pulse) * k;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, `rgba(255,255,255,${Math.min(0.9, 0.45 * core + 0.7 * pulse)})`);
    glow.addColorStop(0.3, rgba(color, 0.45 * core + 0.35 * pulse));
    glow.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawPortalRing(x: number, y: number, r: number, f: DriveFrame): void {
    if (r < 2) return;
    const { ctx } = this;
    ctx.save();
    ctx.lineWidth = 12;
    ctx.strokeStyle = rgba(f.accentA, 0.9);
    ctx.shadowColor = rgba(f.accentA);
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = rgba(mixRGB(f.accentB, [255, 255, 255], 0.5));
    ctx.shadowColor = rgba(f.accentB);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, r - 9), 0, Math.PI * 2);
    ctx.stroke();
    // Funken entlang des Rings
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,248,225,0.9)';
    for (let i = 0; i < 26; i++) {
      const a = i * 2.39996 + f.time * 1.7;
      const d = r + Math.sin(f.time * 9 + i) * 10;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** leichter, langsam ziehender Nebel über dem Horizont der Neon Coast */
  private drawHorizonMist(f: DriveFrame, strength: number): void {
    const { ctx, w, h } = this;
    const y = this.view.horizon;
    const color = mixRGB(this.neonBg.horizonColor(f.night), [255, 225, 240], 0.35 - f.night * 0.15);
    const band = h * 0.11;

    const g = ctx.createLinearGradient(0, y - band, 0, y + band * 0.8);
    g.addColorStop(0, rgba(color, 0));
    g.addColorStop(0.55, rgba(color, 0.5 * strength));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, y - band, w, band * 1.8);

    // einzelne Schwaden, die quer über die Straße driften
    const t = f.motion ? f.time : 0;
    for (let i = 0; i < 4; i++) {
      const span = w * 1.6;
      const x = ((((i * 0.31 * span + t * (14 + i * 6)) % span) + span) % span) - w * 0.3;
      const ry = band * (0.25 + (i % 2) * 0.12);
      const rx = w * (0.28 + (i % 3) * 0.06);
      const cy = y + (i - 1.5) * band * 0.12;
      const puff = ctx.createRadialGradient(x, cy, 0, x, cy, rx);
      puff.addColorStop(0, rgba(color, 0.35 * strength));
      puff.addColorStop(1, rgba(color, 0));
      ctx.save();
      ctx.translate(x, cy);
      ctx.scale(1, ry / rx);
      ctx.translate(-x, -cy);
      ctx.fillStyle = puff;
      ctx.fillRect(x - rx, cy - rx, rx * 2, rx * 2);
      ctx.restore();
    }
  }

  private drawSpeedLines(f: DriveFrame): void {
    if (this.boost <= 0.01) return;
    const { ctx, w, h } = this;
    const cx = w / 2;
    const cy = this.view.horizon;
    const reach = Math.hypot(w, h) * 0.6;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 34; i++) {
      const a = i * 2.39996;
      const p = (f.time * 1.8 + i * 0.137) % 1;
      const r1 = lerp(0.18, 1.1, p) * reach;
      const r2 = r1 + reach * (0.06 + 0.12 * this.boost) * p;
      ctx.strokeStyle = `rgba(255,245,255,${0.4 * this.boost * p})`;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.7);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2 * 0.7);
      ctx.stroke();
    }
  }

  private drawVignette(): void {
    const { ctx, w, h } = this;
    const v = ctx.createRadialGradient(
      w / 2,
      h * 0.55,
      Math.min(w, h) * 0.35,
      w / 2,
      h * 0.55,
      Math.max(w, h) * 0.8,
    );
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = v;
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }
}

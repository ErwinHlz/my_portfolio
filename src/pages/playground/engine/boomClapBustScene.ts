/**
 * Boom Clap als Nahaufnahme ab Brusthöhe. Gleiche Song-Zeitachse wie die
 * Ganzkörper-Szene, aber: Kamera nah am Gesicht, unscharfes Zimmer mit Bokeh
 * im Hintergrund, Konfetti-Kanonen in den unteren Bildecken und Reißschwenks
 * für Sprung an die Decke und den Fall zurück.
 *
 * Bildraster: 1600 × 900, Halsansatz des Helden bei (800, 560).
 */
import { BEAT, SONG_LENGTH, beatAt, timeAt, type AudioLevels } from './boomClapTrack';
import { buildBustRig, bustToWorld, drawBust, type BustPose, type Suit } from './boomClapBust';
import { H, W, WINDOW, garland, paintRoom, paintRoomDynamic } from './boomClapRoom';
import { drawWebShots, webShotsActive } from './boomClapWebShot';
import { drawConfetti, makeBurst, type Burst, type CannonSpec } from './boomClapConfetti';
import { HAND_SHAPES, blendHand, fidget } from './boomClapHand';
import { drawHeart, handArc, springEase } from './boomClapMotion';
import { clamp, easeInOut, lerp, seeded, smooth } from './canvasUtils';
import type { SceneState } from './boomClapTypes';

const FW = 1600;
const FH = 900;
const UP = -Math.PI / 2;
const PI = Math.PI;
/** Bildpunkte pro Welteinheit des Zimmers im Hintergrund */
const ROOM_ZOOM = 2.5;
/** Held größer als das Posen-Raster: Kopf füllt gut ein Drittel des Bildes */
const HERO_ZOOM = 1.38;
const ZOOM_PIVOT = 349;

/* ------------------------------------------------------------------ */
/*  Posen                                                              */
/* ------------------------------------------------------------------ */

const REST_L: [number, number] = [-300, 640];
const REST_R: [number, number] = [300, 640];

const STAND: BustPose = {
  x: 800,
  y: 560,
  s: 1,
  rot: 0,
  lean: 0,
  shrug: 0,
  headTilt: 0,
  headTurn: 0,
  headNod: 0,
  hl: REST_L,
  hr: REST_R,
  hlDir: 0,
  hlW: 0,
  hrDir: 0,
  hrW: 0,
  shapeL: 'relaxed',
  shapeR: 'relaxed',
  mouth: 0,
  smile: 0.25,
  brow: 0,
  browAsym: 0,
  lookX: 0,
  lookY: 0,
  squint: 0,
  blink: 0,
  hairSway: 0,
};

type Ease = 'io' | 'in' | 'out' | 'snap' | 'hold';
interface Key {
  k: number;
  pose: BustPose;
  ease: Ease;
}
const keys: Key[] = [];
let last = STAND;
function key(k: number, change: Partial<BustPose>, ease: Ease = 'io') {
  last = { ...last, ...change };
  keys.push({ k, pose: last, ease });
}

// hängt kopfüber: Hände baumeln in lokaler „Oben“-Richtung
const HANG_L: [number, number] = [-230, -300];
const HANG_R: [number, number] = [230, -300];

/* ---------- Peter ---------- */
key(-0.3, {});
key(0.3, { headTilt: 0.04, smile: 0.35 });
key(0.6, {
  hr: [46, -70],
  hrDir: UP - 0.35,
  hrW: 1,
  shapeR: 'point',
  headTilt: -0.04,
  brow: 0.4,
  lookY: -0.3,
});
key(0.85, { hr: [55, -55], brow: 0.8 }, 'out');
key(1.1, {
  hr: REST_R,
  hrW: 0,
  shapeR: 'relaxed',
  lookX: -1,
  headTurn: -0.3,
  headTilt: 0.06,
  brow: 0.2,
  lookY: 0,
});
// schüchternes Herz mit den Händen
key(
  1.5,
  {
    lookX: 0.2,
    headTurn: 0.1,
    headTilt: -0.08,
    browAsym: 0.3,
    smile: 0.9,
    hl: [-47, 66],
    hr: [47, 66],
    hlDir: UP - 0.36,
    hrDir: UP + 0.36,
    hlW: 1,
    hrW: 1,
    shapeL: 'heart',
    shapeR: 'heart',
    squint: 0.25,
  },
  'snap',
);
key(2.35, { headTilt: -0.12, hl: [-47, 60], hr: [47, 60] });
key(2.7, {
  lookX: 0,
  headTurn: 0,
  headTilt: 0,
  browAsym: 0,
  brow: 0.4,
  shrug: 0.3,
  hl: [-170, 270],
  hr: [170, 270],
  shapeL: 'fist',
  shapeR: 'fist',
});
// BOOM 1 – erschrickt über den Knall der Kanonen
key(
  3,
  {
    y: 590,
    headNod: 0.5,
    brow: 1,
    squint: -0.5,
    shrug: 0.7,
    hl: [-200, 330],
    hr: [200, 330],
    smile: 0,
  },
  'snap',
);
key(3.45, {
  y: 556,
  headNod: 0,
  hl: [-330, -60],
  hr: [330, -60],
  hlDir: UP - 0.5,
  hlW: 1,
  hrDir: UP + 0.5,
  hrW: 1,
  shapeL: 'open',
  shapeR: 'open',
  shrug: 0.2,
});
// CLAP 1 – Hände vor dem Gesicht
const CLAP: Partial<BustPose> = {
  y: 566,
  hl: [-16, -40],
  hr: [16, -40],
  hlDir: UP,
  hrDir: UP,
  shapeL: 'flat',
  shapeR: 'flat',
  squint: 0.4,
  shrug: 0,
};
key(4, CLAP, 'in');

/* ---------- Spider-Man ---------- */
key(4.12, CLAP, 'hold');
key(
  4.45,
  {
    y: 560,
    hl: [-200, 330],
    hlW: 0,
    shapeL: 'fist',
    hr: [250, -170],
    hrDir: UP - 0.15,
    hrW: 1,
    shapeR: 'thwip',
    headTilt: 0.15,
    squint: 0.15,
    lean: -0.04,
    brow: 0,
  },
  'snap',
);
// Herz vor der Brust
key(
  5,
  {
    hl: [-47, 66],
    hr: [47, 66],
    hlDir: UP - 0.36,
    hrDir: UP + 0.36,
    hlW: 1,
    hrW: 1,
    shapeL: 'heart',
    shapeR: 'heart',
    headTilt: 0.2,
    squint: 0.55,
  },
  'snap',
);
key(5.6, { headTilt: 0.26, hl: [-47, 60], hr: [47, 60] });
key(
  6,
  { hl: [-250, -170], hlDir: UP + 0.15, hlW: 1, shapeL: 'thwip', headTilt: -0.12, squint: 0.2 },
  'snap',
);
key(6.8, { headTilt: -0.06 });
// „on and on and on and on“
key(
  7,
  {
    hr: [170, -30],
    hrDir: -0.9,
    shapeR: 'point',
    hl: [-200, 330],
    hlW: 0,
    shapeL: 'fist',
    headTilt: 0.16,
    squint: 0.5,
    lean: -0.05,
  },
  'snap',
);
key(
  8,
  {
    hl: [-170, -30],
    hlDir: -PI + 0.9,
    hlW: 1,
    shapeL: 'point',
    hr: [200, 330],
    hrW: 0,
    shapeR: 'fist',
    headTilt: -0.16,
    squint: -0.2,
    lean: 0.05,
  },
  'snap',
);
key(
  9,
  {
    hl: [-230, -260],
    hr: [230, -260],
    hlDir: UP - 0.3,
    hrDir: UP + 0.3,
    hlW: 1,
    hrW: 1,
    shapeL: 'open',
    shapeR: 'open',
    headTilt: 0,
    squint: -0.35,
    lean: 0,
  },
  'snap',
);
key(9.7, { hl: [-240, -250], hr: [240, -250] });
key(
  10,
  {
    hl: [130, 110],
    hr: [-130, 110],
    hlW: 0,
    hrW: 0,
    shapeL: 'fist',
    shapeR: 'fist',
    headTilt: 0.05,
    squint: 0.6,
  },
  'snap',
);
key(10.5, { y: 600, hl: [-230, 330], hr: [230, 330], shapeL: 'open', shapeR: 'open', squint: 0.2 });
// BOOM 2 – geht in die Knie
key(
  11,
  { y: 650, headNod: 0.35, squint: 0.35, shrug: 0.45, hl: [-270, 300], hr: [270, 300] },
  'snap',
);
key(11.75, { y: 662 });
// CLAP 2 und Sprung aus dem Bild
key(
  12,
  {
    y: 600,
    hl: [-16, 40],
    hr: [16, 40],
    hlDir: UP,
    hrDir: UP,
    hlW: 1,
    hrW: 1,
    shapeL: 'flat',
    shapeR: 'flat',
    shrug: 0,
    headNod: -0.2,
  },
  'in',
);
key(12.14, { y: -520, hl: [-50, -540], hr: [50, -540], headNod: -0.4 }, 'out');
key(
  12.16,
  {
    y: -420,
    rot: PI,
    hl: HANG_L,
    hr: HANG_R,
    hlW: 0,
    hrW: 0,
    shapeL: 'open',
    shapeR: 'open',
    headNod: 0,
  },
  'hold',
);
key(12.5, { y: 342, squint: 0.4 }, 'out');
key(12.8, { y: 330, squint: 0 });
key(
  13.5,
  { hr: [240, -260], hrDir: UP - 0.1, hrW: 1, shapeR: 'thwip', headTilt: 0.2, squint: 0.3 },
  'snap',
);
key(14.4, { hr: HANG_R, hrW: 0, shapeR: 'open', headTilt: 0.05, squint: 0 });

/* ---------- Symbiont ---------- */
key(15.2, {
  hl: [-140, 60],
  hr: [140, 60],
  shapeL: 'claw',
  shapeR: 'claw',
  headTilt: 0.18,
  squint: -0.3,
});
key(16, { hl: [-120, -60], hr: [200, 40], headTilt: 0.28, lean: 0.08, squint: 0.6 });
key(17, { hl: [-200, 40], hr: [120, -60], headTilt: -0.28, lean: -0.08, squint: -0.4 });
key(18, { hl: [-150, -80], hr: [210, 20], headTilt: 0.24, lean: 0.06, squint: 0.8 });
key(18.7, {
  hl: [-80, 120],
  hr: [80, 120],
  shapeL: 'fist',
  shapeR: 'fist',
  headTilt: 0,
  lean: 0,
  squint: 1,
  shrug: 0.4,
});
// BOOM 3 – Netze in die Kamera: rechts, links, dann beide Hände
key(
  19,
  { hr: [250, -200], hrDir: UP - 0.1, hrW: 1, shapeR: 'thwip', squint: -0.5, shrug: 0 },
  'snap',
);
key(
  19.3,
  {
    hl: [-250, -200],
    hlDir: UP + 0.1,
    hlW: 1,
    shapeL: 'thwip',
    hr: [130, 60],
    hrW: 0,
    shapeR: 'fist',
    headTilt: -0.1,
  },
  'snap',
);
key(
  19.55,
  {
    hl: [-150, -230],
    hr: [150, -230],
    hlDir: UP + 0.15,
    hrDir: UP - 0.15,
    hrW: 1,
    shapeR: 'thwip',
    headTilt: 0,
    squint: 0.2,
  },
  'snap',
);
// der Symbiont reißt an ihm
key(19.8, {
  hl: [-70, 110],
  hr: [70, 110],
  hlW: 0,
  hrW: 0,
  shapeL: 'fist',
  shapeR: 'fist',
  squint: 1,
  shrug: 0.5,
});
// CLAP 3 – Black Spider-Man
key(
  20,
  { hl: [-360, -250], hr: [360, -250], shapeL: 'claw', shapeR: 'claw', squint: -0.6, shrug: 0 },
  'snap',
);
key(20.6, { hl: [-340, -220], hr: [340, -220] });
key(21.2, {
  hl: [-160, 120],
  hr: HANG_R,
  shapeL: 'fist',
  shapeR: 'relaxed',
  headTilt: 0.3,
  squint: 0.3,
  lean: 0.05,
});
key(21.7, { hr: [250, -200], hrDir: UP - 0.1, hrW: 1, shapeR: 'thwip', headTilt: 0.18 }, 'snap');
key(22.5, { squint: 1, headTilt: 0.3 });
key(
  23,
  {
    hl: [-250, -200],
    hlDir: UP + 0.1,
    hlW: 1,
    shapeL: 'thwip',
    hr: [160, 120],
    hrW: 0,
    shapeR: 'fist',
    squint: 0.3,
    headTilt: -0.2,
  },
  'snap',
);
key(
  24,
  {
    hr: [250, -200],
    hrDir: UP - 0.1,
    hrW: 1,
    shapeR: 'thwip',
    hl: [-160, 120],
    hlW: 0,
    shapeL: 'fist',
    headTilt: 0.22,
  },
  'snap',
);
// kopfüber ein Herz – mit zusammengekniffenen Gläsern
key(
  25,
  {
    hl: [-47, 66],
    hr: [47, 66],
    hlDir: UP - 0.36,
    hrDir: UP + 0.36,
    hlW: 1,
    hrW: 1,
    shapeL: 'heart',
    shapeR: 'heart',
    headTilt: 0.15,
    squint: 0.85,
  },
  'snap',
);
key(25.7, { hl: [-47, 60], hr: [47, 60], headTilt: 0.22 });
key(26, { hl: [130, 110], hr: [-130, 110], shapeL: 'fist', shapeR: 'fist', squint: 0.2 }, 'snap');
// loslassen, nach unten aus dem Bild fallen
key(26.35, { hl: [-60, 40], hr: [60, 40], shapeL: 'open', shapeR: 'open' });
key(26.68, { y: 1400 }, 'in');
key(
  26.7,
  {
    y: -560,
    rot: PI * 2,
    hl: [-60, -520],
    hr: [60, -520],
    hlDir: UP,
    hrDir: UP,
    hlW: 1,
    hrW: 1,
    shapeL: 'flat',
    shapeR: 'flat',
  },
  'hold',
);
// BOOM 4 – Landung ins Bild
key(
  27,
  {
    y: 660,
    headNod: 0.45,
    hl: [-270, 330],
    hr: [270, 330],
    hlW: 0,
    hrW: 0,
    shapeL: 'open',
    shapeR: 'open',
    squint: 0.6,
    shrug: 0.55,
  },
  'snap',
);
key(27.6, { y: 672 });
// CLAP 4
key(
  28,
  {
    y: 566,
    headNod: 0,
    hl: [-16, -40],
    hr: [16, -40],
    hlDir: UP,
    hrDir: UP,
    hlW: 1,
    hrW: 1,
    shapeL: 'flat',
    shapeR: 'flat',
    squint: 0,
    shrug: 0,
  },
  'in',
);
key(
  28.35,
  {
    y: 560,
    hl: [-330, -120],
    hr: [330, -120],
    hlW: 0,
    hrW: 0,
    shapeL: 'claw',
    shapeR: 'claw',
    headTilt: 0.12,
  },
  'snap',
);
// Outro
key(
  29,
  {
    hr: [250, -170],
    hrDir: UP - 0.15,
    hrW: 1,
    shapeR: 'thwip',
    hl: [-200, 330],
    shapeL: 'fist',
    headTilt: 0.18,
    lean: -0.04,
  },
  'snap',
);
key(
  30,
  {
    hl: [-250, -170],
    hlDir: UP + 0.15,
    hlW: 1,
    shapeL: 'thwip',
    hr: [200, 330],
    hrW: 0,
    shapeR: 'fist',
    headTilt: -0.18,
    lean: 0.04,
  },
  'snap',
);
key(
  31,
  {
    hl: [130, 110],
    hr: [-130, 110],
    hlW: 0,
    shapeL: 'fist',
    shapeR: 'fist',
    headTilt: 0,
    lean: 0,
    squint: 0.7,
  },
  'snap',
);
key(
  32,
  {
    hl: [-47, 66],
    hr: [47, 66],
    hlDir: UP - 0.36,
    hrDir: UP + 0.36,
    hlW: 1,
    hrW: 1,
    shapeL: 'heart',
    shapeR: 'heart',
    squint: 0.6,
    headTilt: -0.15,
  },
  'snap',
);
key(32.7, { hl: [-47, 60], hr: [47, 60], headTilt: -0.2 });
key(
  33,
  {
    hl: [-200, 330],
    hlW: 0,
    shapeL: 'fist',
    hr: [170, -30],
    hrDir: -0.9,
    shapeR: 'point',
    headTilt: 0.25,
    squint: 0.4,
  },
  'snap',
);
key(
  34,
  {
    hl: [-250, -170],
    hr: [250, -170],
    hlW: 1,
    hrW: 1,
    hlDir: UP + 0.15,
    hrDir: UP - 0.15,
    shapeL: 'thwip',
    shapeR: 'thwip',
    squint: 0.6,
    headTilt: 0.06,
  },
  'snap',
);
key(36, { headTilt: 0.1 });

const easeFns: Record<Ease, (x: number) => number> = {
  io: easeInOut,
  in: (x) => x * x * x,
  out: (x) => 1 - (1 - x) ** 3,
  // schneller Einsatz mit leichtem Überschwingen – wirkt federnd statt mechanisch
  snap: springEase,
  hold: (x) => (x >= 1 ? 1 : 0),
};

function poseAt(k: number): BustPose {
  if (k <= keys[0].k) return withHands(keys[0].pose, keys[0].pose, 0);
  for (let i = 1; i < keys.length; i++) {
    const k1 = keys[i];
    if (k <= k1.k) {
      const k0 = keys[i - 1];
      const raw = (k - k0.k) / Math.max(1e-6, k1.k - k0.k);
      const t = easeFns[k1.ease](raw);
      const a = k0.pose as unknown as Record<string, unknown>;
      const b = k1.pose as unknown as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const name of Object.keys(a)) {
        const va = a[name];
        const vb = b[name];
        if (typeof va === 'number' && typeof vb === 'number') out[name] = lerp(va, vb, t);
        else if (Array.isArray(va) && Array.isArray(vb))
          out[name] = [lerp(va[0], vb[0], t), lerp(va[1], vb[1], t)];
        else out[name] = raw < 0.5 ? va : vb;
      }
      const pose = out as unknown as BustPose;
      // Hände wandern auf einem Bogen statt auf der Geraden
      if (k1.ease !== 'hold') {
        pose.hl = handArc(k0.pose.hl, k1.pose.hl, t, -1);
        pose.hr = handArc(k0.pose.hr, k1.pose.hr, t, 1);
      }
      return withHands(k0.pose, k1.pose, clamp(t, 0, 1), pose);
    }
  }
  const l = keys[keys.length - 1].pose;
  return withHands(l, l, 0);
}

/** Fingerstellungen fließend zwischen zwei Gesten mischen (Finger leicht verzögert) */
function withHands(a: BustPose, b: BustPose, t: number, pose: BustPose = { ...a }): BustPose {
  const ft = smooth(0.1, 0.85, t);
  pose.handL = blendHand(HAND_SHAPES[a.shapeL], HAND_SHAPES[b.shapeL], ft);
  pose.handR = blendHand(HAND_SHAPES[a.shapeR], HAND_SHAPES[b.shapeR], ft);
  return pose;
}

const suitAt = (k: number): Suit => (k < 4 ? 'peter' : k < 20 ? 'spidey' : 'black');
const gooAt = (k: number) => smooth(15.1, 18.9, k) * 0.72 + smooth(19, 19.92, k) * 0.28;
/** 0 = Kamera auf Kopfhöhe, 1 = Blick zur Decke */
const ceilingAt = (k: number) => smooth(12.1, 12.42, k) * (1 - smooth(26.38, 26.68, k));
/** Stärke des Reißschwenks (für Bewegungsunschärfe) */
const whipAt = (k: number) =>
  Math.max(
    Math.sin(clamp((k - 12.1) / 0.32, 0, 1) * Math.PI),
    Math.sin(clamp((k - 26.38) / 0.3, 0, 1) * Math.PI),
  );

const BOOMS = [3, 11, 19, 27];
/** Herz-Gesten: von Beat, bis Beat, Farbe der aufsteigenden Herzen */
const HEARTS: [number, number, string][] = [
  [1.5, 2.35, '#ff5a7a'],
  [5, 5.8, '#ff3b5c'],
  [25, 25.8, '#a98bff'],
  [32, 32.8, '#ff3b5c'],
];
const CLAPS = [4, 12, 20, 28];
const WORDS: [number, string][] = [
  ...BOOMS.map((k): [number, string] => [k, 'BOOM!']),
  ...CLAPS.map((k): [number, string] => [k, 'CLAP!']),
].sort((a, b) => a[0] - b[0]);

/** Kanonen stehen unsichtbar unter dem Bildrand, nur das Konfetti fliegt herein */
const BUST_CANNONS: CannonSpec[] = [
  { x: 170, y: 1260, dir: 1, scale: 3.2, tilt: 0.38 },
  { x: 1430, y: 1260, dir: -1, scale: 3.2, tilt: 0.38 },
];

/* ------------------------------------------------------------------ */
/*  Szene                                                              */
/* ------------------------------------------------------------------ */

export class BoomClapBustScene {
  private ctx: CanvasRenderingContext2D;
  private room = document.createElement('canvas');
  private bg = document.createElement('canvas');
  private heroBuf = document.createElement('canvas');
  private auxBuf = document.createElement('canvas');
  private maskBuf = document.createElement('canvas');
  private w = 0;
  private h = 0;
  private dpr = 1;
  private scale = 1;
  private bursts: Burst[];
  motion = true;
  /** Filmkorn – im Comic-Look aus, sonst entstehen dort Störpunkte */
  grain = true;
  /** Zimmer, Bokeh, Vollbild-Blitze und Vignette – aus = Held auf transparentem Grund */
  backdrop = true;
  /** eigene Konfetti-Kanonen der Szene */
  confetti = true;
  /** Netze in die Kamera selbst zeichnen (aus = übernimmt eine darüberliegende Ebene) */
  webShots = true;
  /** Brust, Kopf und Handgelenke des Helden im Bild (Gerätepixel) nach dem letzten Frame */
  anchor: { chest: [number, number]; head: [number, number] } | null = null;
  hands: { L: [number, number]; R: [number, number] } | null = null;
  duration = SONG_LENGTH;
  readonly state: SceneState = { word: '', wordId: 0, progress: 0, ended: false };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    const opts = { cannons: BUST_CANNONS, scale: 2.9, count: 150, floor: null, ceil: -1e5 };
    this.bursts = [
      makeBurst(timeAt(3), 'spidey', 111, opts),
      makeBurst(timeAt(11), 'spidey', 222, opts),
      makeBurst(timeAt(19), 'symbiote', 333, opts),
      makeBurst(timeAt(27), 'finale', 444, opts),
    ];
    // Zimmer einmal in mittlerer Auflösung – im Hintergrund ist es ohnehin unscharf
    this.room.width = W;
    this.room.height = H;
    const rctx = this.room.getContext('2d');
    if (rctx) paintRoom(rctx);
  }

  private c2d(c: HTMLCanvasElement) {
    const x = c.getContext('2d');
    if (!x) throw new Error('2D-Kontext fehlt');
    return x;
  }

  resize(w: number, h: number, dpr: number) {
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.scale = Math.max(w / FW, h / FH);
    for (const c of [this.heroBuf, this.auxBuf, this.maskBuf]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    // kleiner Puffer für den Hintergrund: Hochskalieren macht ihn weich (Tiefenunschärfe)
    this.bg.width = Math.max(64, Math.round(w / 5));
    this.bg.height = Math.max(36, Math.round(h / 5));
  }

  render(t: number | null, wall: number, levels: AudioLevels = { low: 0, vocal: 0 }) {
    const ctx = this.ctx;
    const idle = t === null;
    const time = idle ? 0 : Math.min(t, this.duration);
    const k = idle ? -0.3 : beatAt(time);
    const m = this.motion ? 1 : 0.25;
    const pose = this.addLife(k, time, idle, wall, levels);
    const suit: Suit = idle ? 'peter' : suitAt(k);
    const goo = idle ? 0 : gooAt(k);
    const inGoo = !idle && k > 15 && k < 20;

    const since = (list: number[]) => {
      let best = Infinity;
      for (const x of list) if (k >= x) best = Math.min(best, (k - x) * BEAT);
      return best;
    };
    const tBoom = idle ? Infinity : since(BOOMS);
    const tClap = idle ? Infinity : since(CLAPS);
    const tBlack = idle ? Infinity : since([20]);
    const tImpact = idle ? Infinity : since([12.5, 27]);

    /* ---------- Kamera ---------- */
    const ceil = idle ? 0 : ceilingAt(k);
    const whip = idle ? 0 : whipAt(k);
    const zoomBase =
      1 +
      (idle
        ? 0
        : smooth(0, 3, k) * 0.05 +
          smooth(15, 19.9, k) * 0.12 -
          smooth(20, 21, k) * 0.1 +
          smooth(28, 35, k) * 0.06);
    const punch =
      Math.exp(-tClap * 7) * 0.05 + Math.exp(-tBoom * 9) * 0.03 + Math.exp(-tBlack * 5) * 0.06;
    const zoom = zoomBase + punch * m;
    const shakeAmp =
      (Math.exp(-tBoom * 9) * 14 + Math.exp(-tImpact * 7) * 18 + Math.exp(-tBlack * 6) * 16) * m;
    const hand = this.motion ? 1 : 0;
    const swayX = (Math.sin(wall * 0.6) * 5 + Math.sin(wall * 1.7) * 2) * hand;
    const swayY = Math.sin(wall * 0.9 + 1) * 3.5 * hand;
    const roll = (Math.sin(wall * 0.5) * 0.004 + Math.sin(wall * 47) * shakeAmp * 0.0006) * hand;
    const shX = Math.sin(wall * 61) * shakeAmp + swayX;
    const shY = Math.cos(wall * 53) * shakeAmp + swayY;
    const sc = this.scale * this.dpr;
    const pw = Math.round(this.w * this.dpr);
    const ph = Math.round(this.h * this.dpr);
    const setCam = (c: CanvasRenderingContext2D) => {
      c.setTransform(sc, 0, 0, sc, pw / 2, ph / 2);
      c.scale(zoom, zoom);
      c.rotate(roll);
      c.translate(-FW / 2 - shX, -FH / 2 - shY);
    };

    /* ---------- Licht im Zimmer ---------- */
    const flick = inGoo ? flicker(wall, goo) : 1;
    let power = 1;
    if (!idle && k >= 15 && k < 20) power = lerp(1, 0.18, goo) * flick;
    else if (!idle && k >= 20 && k < 27) power = lerp(0.2, 0.55, smooth(20, 22, k));
    else if (!idle && k >= 27) power = lerp(0.55, 0.95, smooth(27, 28.5, k));
    let dark = 0.1;
    if (!idle && k >= 15 && k < 20) dark = 0.1 + goo * 0.42 * (flick < 1 ? 1.3 : 1);
    else if (!idle && k >= 20 && k < 27) dark = lerp(0.5, 0.3, smooth(20, 22, k));
    else if (!idle && k >= 27) dark = lerp(0.3, 0.14, smooth(27, 28.5, k));
    const tint = !idle && k >= 20 ? `rgba(16,6,34,${dark})` : `rgba(4,6,16,${dark})`;

    if (this.backdrop) {
      /* ---------- Hintergrund: unscharfes Zimmer ---------- */
      const rx = 900 + shX * 0.25 - swayX * 0.6;
      const ry = lerp(440, 205, ceil) + shY * 0.25;
      const rz = ROOM_ZOOM * (0.92 + (zoom - 1) * 0.5);
      const bctx = this.c2d(this.bg);
      const toFrame = (wx: number, wy: number): [number, number] => [
        FW / 2 + (wx - rx) * rz,
        FH / 2 + (wy - ry) * rz,
      ];
      // Welt → Bildschirm (ohne Wackeln) → kleiner Puffer
      const k5 = this.bg.width / Math.max(1, this.w);
      const a = k5 * rz * this.scale;
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.fillStyle = '#0b0d16';
      bctx.fillRect(0, 0, this.bg.width, this.bg.height);
      bctx.setTransform(
        a,
        0,
        0,
        a,
        k5 * (this.w / 2 - rx * rz * this.scale),
        k5 * (this.h / 2 - ry * rz * this.scale),
      );
      bctx.drawImage(this.room, 0, 0, W, H);
      paintRoomDynamic(bctx, {
        power,
        lampSwing:
          Math.sin(wall * 0.8) * 0.012 +
          (tImpact < 3 ? Math.sin(tImpact * 5.2) * 0.3 * Math.exp(-tImpact) : 0),
        suitInBag: idle || k < 4,
        bass: levels.low,
        time: wall,
      });
      bctx.fillStyle = tint;
      bctx.fillRect(-100, -100, W + 200, H + 200);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (whip > 0.02 && this.motion) {
        // Reißschwenk: Hintergrund verschmiert senkrecht
        for (let i = -4; i <= 4; i++) {
          ctx.globalAlpha = i === 0 ? 1 : 0.22;
          ctx.drawImage(this.bg, 0, i * whip * ph * 0.05, pw, ph);
        }
        ctx.globalAlpha = 1;
      } else {
        ctx.drawImage(this.bg, 0, 0, pw, ph);
      }

      // Bokeh: Lichterkette, Lampe und Stadtlichter als weiche Kreise
      setCam(ctx);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i <= 34; i++) {
        const [gx, gy] = garland(i / 34);
        const [x, y] = toFrame(gx, gy + 3);
        const tw =
          (0.55 + 0.45 * Math.sin(wall * 2.4 + i * 1.7)) * (0.75 + levels.low * 0.6) * power;
        bokeh(ctx, x, y, 26, `rgba(255,205,130,${0.32 * tw})`);
      }
      const rr = seeded(8);
      for (let i = 0; i < 14; i++) {
        const [x, y] = toFrame(
          WINDOW.l + rr() * (WINDOW.r - WINDOW.l),
          WINDOW.t + 140 + rr() * 140,
        );
        bokeh(
          ctx,
          x,
          y,
          14 + rr() * 12,
          `rgba(${rr() > 0.4 ? '255,214,140' : '170,210,255'},${0.2 + rr() * 0.15})`,
        );
      }
      ctx.restore();
      // Hintergrund etwas abdunkeln, damit der Held heraussticht
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(5,6,14,0.22)';
      ctx.fillRect(0, 0, pw, ph);
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, pw, ph);
    }

    /* ---------- hintere Konfetti-Ebene ---------- */
    setCam(ctx);
    const camShift = ceil * 900;
    if (!idle && this.confetti) {
      ctx.save();
      ctx.translate(0, camShift);
      ctx.globalAlpha = 0.8;
      drawConfetti(ctx, this.bursts, time, 0);
      ctx.restore();
    }

    /* ---------- Held ---------- */
    if (whip > 0.35 && this.motion) {
      // im Schwenk nur als Schliere
      this.heroLayer(pose, suit, 0, wall, setCam);
      for (let i = -3; i <= 3; i++) this.blit(this.heroBuf, 0.14, i * whip * ph * 0.04);
    } else {
      this.heroLayer(pose, suit, inGoo ? goo : 0, wall, setCam);
      this.rimLight(!idle && k >= 20 ? 'rgba(200,170,255,0.85)' : 'rgba(150,185,255,0.8)');
      this.blit(this.heroBuf, 1, 0);
    }
    setCam(ctx);
    if (inGoo) tendrils(ctx, pose, goo, wall);
    {
      const rig = buildBustRig(pose);
      const m = ctx.getTransform();
      const scr = (v: [number, number]): [number, number] => {
        const q = m.transformPoint(new DOMPoint(...bustToWorld(pose, v)));
        return [q.x, q.y];
      };
      this.anchor = idle ? null : { chest: scr(rig.chest), head: scr(rig.head) };
      this.hands = { L: scr(rig.wristL), R: scr(rig.wristR) };
    }

    /* ---------- Vordergrund ---------- */
    ctx.save();
    ctx.translate(0, camShift);
    if (!idle && this.confetti) drawConfetti(ctx, this.bursts, time, 1);
    ctx.restore();
    if (!idle) {
      this.clapBurst(ctx, k, wall, levels);
      this.heartPops(ctx, k, pose);
      if (k >= 20 && k < 21.6) shockRing(ctx, pose, (k - 20) * BEAT);
      drips(ctx, k, pose);
      if (whip > 0.05 && this.motion) speedStreaks(ctx, whip, k < 20 ? 1 : -1);
      if (this.webShots && webShotsActive(k)) {
        const rig = buildBustRig(pose);
        const m = ctx.getTransform();
        const scr = (v: [number, number]): [number, number] => {
          const q = m.transformPoint(new DOMPoint(...bustToWorld(pose, v)));
          return [q.x, q.y];
        };
        drawWebShots(
          ctx,
          k,
          pw,
          ph,
          { L: scr(rig.wristL), R: scr(rig.wristR) },
          this.motion ? 1 : 0.3,
        );
      }
    }

    /* ---------- Bildschirm-Effekte ---------- */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.backdrop) {
      const flashMul = this.motion ? 1 : 0.4;
      const boomFlash = idle ? 0 : Math.exp(-tBoom * 14) * 0.25;
      const flash = idle ? 0 : Math.exp(-tClap * 11) * 0.85 + Math.exp(-tBlack * 7) * 0.5;
      if (boomFlash > 0.01) {
        ctx.fillStyle = `rgba(255,214,150,${boomFlash * flashMul})`;
        ctx.fillRect(0, 0, pw, ph);
      }
      if (flash > 0.01) {
        ctx.fillStyle =
          k >= 20
            ? `rgba(225,215,255,${flash * flashMul})`
            : `rgba(255,255,255,${flash * flashMul})`;
        ctx.fillRect(0, 0, pw, ph);
      }
      if (!idle && this.motion && tBlack < 0.32) this.glitch(ctx, tBlack, pw, ph);
      const vg = ctx.createRadialGradient(
        pw / 2,
        ph * 0.45,
        ph * 0.28,
        pw / 2,
        ph * 0.5,
        Math.max(pw, ph) * 0.7,
      );
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(0,0,0,${idle ? 0.6 : 0.5})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, pw, ph);
      if (this.motion && this.grain) grain(ctx, pw, ph, wall);
    }

    this.updateState(k, time, idle);
  }

  /** Pose + Groove, Atmen, Blinzeln, Lippen, Haare, Zittern */
  private addLife(
    k: number,
    t: number,
    idle: boolean,
    wall: number,
    levels: AudioLevels,
  ): BustPose {
    const base = poseAt(idle ? -0.3 : k);
    const p: BustPose = { ...base, hl: [...base.hl], hr: [...base.hr] };
    // näher ran: Held größer, Halsansatz rutscht nach unten – Bildkante knapp unter der Brust
    p.s *= HERO_ZOOM;
    p.y = ZOOM_PIVOT + (p.y - ZOOM_PIVOT) * HERO_ZOOM;
    const moveHands = (dy: number) => {
      p.hl[1] -= dy;
      p.hr[1] -= dy;
    };
    if (idle) {
      const br = Math.sin(wall * 2.2) * 3;
      p.y += br;
      p.shrug += Math.max(0, br) * 0.01;
      p.headTilt += Math.sin(wall * 0.8) * 0.03;
      p.lookX = Math.sin(wall * 0.5) > 0.6 ? 0.8 : 0;
      p.hairSway = Math.sin(wall * 1.3) * 0.3;
    } else {
      const frac = k - Math.floor(k);
      const bounce = Math.exp(-frac * 6) * 10 + Math.exp(-((frac - 1) ** 2) * 60) * 3;
      const groove =
        k > 0 && k < 2.3 ? 0.5 : (k > 4.4 && k < 10.4) || (k > 28.4 && k < 34.5) ? 1 : 0;
      if (groove) {
        p.y += bounce * groove;
        moveHands(bounce * groove * 0.5);
        p.headNod += Math.exp(-frac * 5) * 0.25 * groove;
        p.headTilt += Math.sin(k * Math.PI) * 0.04 * groove;
        p.lean += Math.sin(k * Math.PI) * 0.015 * groove;
      }
      if ((k > 12.8 && k < 15) || (k > 20.6 && k < 26.2)) {
        p.lean += Math.sin(k * Math.PI * 0.5) * 0.05;
        p.headTilt += Math.sin(k * Math.PI) * 0.05;
      }
      if (k > 15 && k < 20) {
        const g = smooth(15, 18.5, k) * (1 - smooth(19.85, 20, k));
        p.lean += Math.sin(t * 31) * 0.035 * g;
        p.headTilt += Math.sin(t * 23 + 1) * 0.08 * g;
        p.hl[0] += Math.sin(t * 37) * 12 * g;
        p.hr[1] += Math.cos(t * 29) * 12 * g;
      }
      // Haare schwingen der Bewegung hinterher
      const prev = poseAt(k - 0.06);
      p.hairSway =
        clamp((base.y - prev.y) * 0.04, -1.5, 1.5) + Math.sin(k * Math.PI) * 0.25 * groove;
      // Peter singt das Intro mit
      if (k < 3.05) p.mouth = Math.max(p.mouth, clamp((levels.vocal - 0.28) * 2.6, 0, 1));
      if (k >= 2.9 && k < 3.6) p.mouth = Math.max(p.mouth, 0.9 * (1 - smooth(3.2, 3.6, k)));
    }
    if (!idle) {
      // Überlappung: Hände kommen einen Hauch nach dem Körper an
      const lag = poseAt(k - 0.07);
      const offL = [p.hl[0] - base.hl[0], p.hl[1] - base.hl[1]];
      const offR = [p.hr[0] - base.hr[0], p.hr[1] - base.hr[1]];
      p.hl = [
        lerp(base.hl[0], lag.hl[0], 0.28) + offL[0],
        lerp(base.hl[1], lag.hl[1], 0.28) + offL[1],
      ];
      p.hr = [
        lerp(base.hr[0], lag.hr[0], 0.28) + offR[0],
        lerp(base.hr[1], lag.hr[1], 0.28) + offR[1],
      ];
      // Handgelenk zieht der Bewegung hinterher
      const vxL = base.hl[0] - lag.hl[0];
      const vxR = base.hr[0] - lag.hr[0];
      const vyL = base.hl[1] - lag.hl[1];
      const vyR = base.hr[1] - lag.hr[1];
      p.wristL = clamp((-vxL * 0.5 + vyL * 0.3) * 0.004, -0.5, 0.5);
      p.wristR = clamp((-vxR * 0.5 - vyR * 0.3) * 0.004, -0.5, 0.5);
    }
    // Finger sind nie ganz still
    p.handL = fidget(p.handL ?? HAND_SHAPES[p.shapeL], idle ? wall : t, 1);
    p.handR = fidget(p.handR ?? HAND_SHAPES[p.shapeR], idle ? wall : t, 2);
    const bt = (idle ? wall : t) % 3.4;
    p.blink = Math.max(p.blink, bt < 0.14 ? Math.sin((bt / 0.14) * Math.PI) : 0);
    return p;
  }

  private heroLayer(
    pose: BustPose,
    suit: Suit,
    goo: number,
    wall: number,
    setCam: (c: CanvasRenderingContext2D) => void,
  ) {
    const hb = this.c2d(this.heroBuf);
    hb.setTransform(1, 0, 0, 1, 0, 0);
    hb.clearRect(0, 0, this.heroBuf.width, this.heroBuf.height);
    setCam(hb);
    if (goo <= 0.001) {
      drawBust(hb, pose, suit, wall);
      return;
    }
    drawBust(hb, pose, 'spidey', wall);
    const ab = this.c2d(this.auxBuf);
    ab.setTransform(1, 0, 0, 1, 0, 0);
    ab.clearRect(0, 0, this.auxBuf.width, this.auxBuf.height);
    setCam(ab);
    drawBust(ab, pose, 'black', wall);
    const mc = this.c2d(this.maskBuf);
    mc.setTransform(1, 0, 0, 1, 0, 0);
    mc.clearRect(0, 0, this.maskBuf.width, this.maskBuf.height);
    setCam(mc);
    const [cx, cy] = bustToWorld(pose, buildBustRig(pose).chest);
    const r = goo ** 1.15 * 820 * pose.s;
    mc.fillStyle = '#000';
    mc.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const wob =
        1 +
        0.18 * Math.sin(a * 5 + wall * 3) +
        0.1 * Math.sin(a * 11 - wall * 5) +
        0.06 * Math.sin(a * 19 + wall * 7);
      const x = cx + Math.cos(a) * r * wob;
      const y = cy + Math.sin(a) * r * wob;
      if (i) mc.lineTo(x, y);
      else mc.moveTo(x, y);
    }
    mc.fill();
    tendrilPaths(mc, pose, goo, wall, '#000', 34);
    ab.setTransform(1, 0, 0, 1, 0, 0);
    ab.globalCompositeOperation = 'destination-in';
    ab.drawImage(this.maskBuf, 0, 0);
    ab.globalCompositeOperation = 'source-over';
    hb.setTransform(1, 0, 0, 1, 0, 0);
    hb.drawImage(this.auxBuf, 0, 0);
  }

  private rimLight(color: string) {
    const ab = this.c2d(this.auxBuf);
    ab.setTransform(1, 0, 0, 1, 0, 0);
    ab.clearRect(0, 0, this.auxBuf.width, this.auxBuf.height);
    ab.drawImage(this.heroBuf, 0, 0);
    ab.globalCompositeOperation = 'source-in';
    ab.fillStyle = color;
    ab.fillRect(0, 0, this.auxBuf.width, this.auxBuf.height);
    ab.globalCompositeOperation = 'source-over';
    const o = 3.5 * this.scale * this.dpr;
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.auxBuf, o, -o * 0.6);
    ctx.globalAlpha = 0.45;
    ctx.drawImage(this.auxBuf, -o * 0.6, -o * 0.4);
    ctx.restore();
  }

  private blit(c: HTMLCanvasElement, alpha: number, dy: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.drawImage(c, 0, dy);
    ctx.restore();
  }

  private clapBurst(ctx: CanvasRenderingContext2D, k: number, wall: number, levels: AudioLevels) {
    for (const c of CLAPS) {
      const dt = (k - c) * BEAT;
      if (dt < 0 || dt > 0.42) continue;
      const p = this.addLife(c, timeAt(c), false, wall, levels);
      const rig = buildBustRig(p);
      const [x, y] = bustToWorld(p, [
        (rig.wristL[0] + rig.wristR[0]) / 2,
        (rig.wristL[1] + rig.wristR[1]) / 2 - 50,
      ]);
      const kk = dt / 0.42;
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${(1 - kk) * 0.95})`;
      ctx.lineWidth = 9 * (1 - kk) + 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + 0.2;
        const r0 = 80 + kk * 170;
        const r1 = r0 + 70 * (1 - kk) + 16;
        ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
        ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      }
      ctx.stroke();
      if (c === 4 || c === 20) {
        const rand = seeded(c);
        for (let i = 0; i < 26; i++) {
          const a = rand() * Math.PI * 2;
          const d = 160 + rand() * 520;
          const sx = 800 + Math.cos(a) * d * (0.5 + kk);
          const sy = 450 + Math.sin(a) * d * 0.6 * (0.6 + kk);
          const color =
            c === 4
              ? `rgba(255,${200 + rand() * 55},${190 + rand() * 60},${1 - kk})`
              : `rgba(${190 + rand() * 40},170,255,${1 - kk})`;
          sparkle(ctx, sx, sy, (10 + rand() * 16) * (1 - kk), color);
        }
      }
      ctx.restore();
    }
  }

  /** kleine Herzen steigen aus der Herz-Geste auf */
  private heartPops(ctx: CanvasRenderingContext2D, k: number, pose: BustPose) {
    for (const [k0, k1, color] of HEARTS) {
      if (k < k0 || k > k1 + 2.5) continue;
      const rig = buildBustRig(pose);
      const [hx, hy] = bustToWorld(pose, [
        (rig.wristL[0] + rig.wristR[0]) / 2,
        (rig.wristL[1] + rig.wristR[1]) / 2 - 60,
      ]);
      const rand = seeded(Math.round(k0 * 10));
      for (let i = 0; i < 9; i++) {
        const born = k0 + 0.15 + rand() * (k1 - k0);
        const age = (k - born) * BEAT;
        if (age < 0 || age > 1.6) continue;
        const life = age / 1.6;
        const x = hx + (rand() - 0.5) * 160 + Math.sin(age * 4 + i) * 22;
        const y = hy - age * 260 - rand() * 40;
        const size = (18 + rand() * 18) * (life < 0.15 ? life / 0.15 : 1);
        drawHeart(ctx, x, y, size, color, 1 - life, Math.sin(age * 3 + i) * 0.25);
      }
    }
  }

  private glitch(ctx: CanvasRenderingContext2D, dt: number, pw: number, ph: number) {
    const rand = seeded(Math.floor(dt * 40) + 3);
    const strength = 1 - dt / 0.32;
    for (let i = 0; i < 8; i++) {
      const y = rand() * ph;
      const hgt = (0.02 + rand() * 0.06) * ph;
      const off = (rand() - 0.5) * 90 * this.dpr * strength;
      ctx.drawImage(ctx.canvas, 0, y, pw, hgt, off, y, pw, hgt);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.35 * strength;
    ctx.drawImage(ctx.canvas, 12 * this.dpr * strength, 0);
    ctx.restore();
    ctx.fillStyle = `rgba(120,60,255,${0.18 * strength})`;
    ctx.fillRect(0, 0, pw, ph);
  }

  private updateState(k: number, time: number, idle: boolean) {
    const s = this.state;
    s.progress = idle ? 0 : clamp(time / this.duration, 0, 1);
    s.ended = !idle && time >= this.duration - 0.02;
    let word = '';
    let id = 0;
    if (!idle) {
      WORDS.forEach(([wk, w], i) => {
        if (k >= wk && k < wk + 0.9) {
          word = w;
          id = i + 1;
        }
      });
    }
    s.word = word;
    s.wordId = id;
  }
}

/* ------------------------------------------------------------------ */
/*  Effekte                                                            */
/* ------------------------------------------------------------------ */

function bokeh(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(0.82, color);
  g.addColorStop(
    0.92,
    color.replace(/[\d.]+\)$/, (a) => `${Math.min(1, parseFloat(a) * 1.6)})`),
  );
  g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function flicker(wall: number, goo: number) {
  const n = Math.sin(wall * 37) * Math.sin(wall * 13.7) + Math.sin(wall * 5.3);
  return n > 1.1 - goo * 0.8 ? 0.25 : 1;
}

function tendrilPaths(
  ctx: CanvasRenderingContext2D,
  pose: BustPose,
  goo: number,
  wall: number,
  color: string,
  width: number,
) {
  const rig = buildBustRig(pose);
  const [cx, cy] = bustToWorld(pose, rig.chest);
  const targets = [
    rig.head,
    rig.wristL,
    rig.wristR,
    rig.elbowL,
    rig.elbowR,
    rig.shoulderL,
    rig.shoulderR,
    rig.neckTop,
  ];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  targets.forEach((tp, i) => {
    const [tx, ty] = bustToWorld(pose, tp);
    const reach = clamp(goo * 1.7 - i * 0.05, 0, 1);
    if (reach <= 0) return;
    const ex = cx + (tx - cx) * reach;
    const ey = cy + (ty - cy) * reach;
    const nx = -(ty - cy);
    const ny = tx - cx;
    const len = Math.hypot(nx, ny) || 1;
    const wig = Math.sin(wall * 6 + i * 2.1) * 60 * pose.s;
    ctx.lineWidth = width * pose.s * (1 - goo * 0.5);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(
      (cx + ex) / 2 + (nx / len) * wig,
      (cy + ey) / 2 + (ny / len) * wig,
      ex,
      ey,
    );
    ctx.stroke();
  });
  ctx.restore();
}

function tendrils(ctx: CanvasRenderingContext2D, pose: BustPose, goo: number, wall: number) {
  tendrilPaths(ctx, pose, goo, wall, 'rgba(6,7,12,0.92)', 14);
  ctx.save();
  ctx.translate(-2, -2);
  tendrilPaths(ctx, pose, goo, wall, 'rgba(150,175,255,0.3)', 3);
  ctx.restore();
  // freie Ranken, die vom Körper wegpeitschen
  if (goo > 0.2 && goo < 0.98) {
    const [cx, cy] = bustToWorld(pose, buildBustRig(pose).chest);
    ctx.strokeStyle = 'rgba(6,7,12,0.9)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + wall * 0.6;
      const r = (260 + Math.sin(wall * 4 + i) * 90) * goo;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5);
      ctx.quadraticCurveTo(
        cx + Math.cos(a + 0.5) * r * 1.1,
        cy + Math.sin(a + 0.5) * r * 1.1,
        cx + Math.cos(a + 0.2) * r * 1.4,
        cy + Math.sin(a + 0.2) * r * 1.4,
      );
      ctx.stroke();
    }
  }
}

function drips(ctx: CanvasRenderingContext2D, k: number, pose: BustPose) {
  if (k < 15.4 || k > 20.5) return;
  const rand = seeded(77);
  ctx.save();
  ctx.fillStyle = 'rgba(6,7,12,0.92)';
  for (let i = 0; i < 14; i++) {
    const start = 15.4 + rand() * 4.2;
    const dt = (k - start) * BEAT;
    const lx = (rand() - 0.5) * 420;
    const ly = -100 - rand() * 200;
    if (dt < 0 || dt > 1.2) continue;
    const p0 = bustToWorld(pose, [lx, ly]);
    const y = p0[1] + 0.5 * 2200 * dt * dt;
    const r = 7 + rand() * 7;
    ctx.beginPath();
    ctx.ellipse(p0[0], y, r * 0.8, r * (1 + dt * 1.4), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function shockRing(ctx: CanvasRenderingContext2D, pose: BustPose, dt: number) {
  const [cx, cy] = bustToWorld(pose, buildBustRig(pose).chest);
  const k = clamp(dt / 0.9, 0, 1);
  ctx.save();
  ctx.strokeStyle = `rgba(190,170,255,${(1 - k) * 0.7})`;
  ctx.lineWidth = 22 * (1 - k) + 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 90 + k * 900, 70 + k * 600, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function speedStreaks(ctx: CanvasRenderingContext2D, whip: number, dir: number) {
  const rand = seeded(91);
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${0.35 * whip})`;
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = rand() * FW;
    const y = rand() * FH;
    ctx.lineWidth = 2 + rand() * 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + dir * (120 + rand() * 260) * whip);
    ctx.stroke();
  }
  ctx.restore();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  if (r <= 0.3) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = i % 2 ? r * 0.3 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

let grainCanvas: HTMLCanvasElement | null = null;
function grain(ctx: CanvasRenderingContext2D, pw: number, ph: number, wall: number) {
  if (!grainCanvas) {
    grainCanvas = document.createElement('canvas');
    grainCanvas.width = 128;
    grainCanvas.height = 128;
    const g = grainCanvas.getContext('2d');
    if (g) {
      const img = g.createImageData(128, 128);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 14;
      }
      g.putImageData(img, 0, 0);
    }
  }
  const pattern = ctx.createPattern(grainCanvas, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.translate(((wall * 997) % 128) | 0, ((wall * 571) % 128) | 0);
  ctx.fillStyle = pattern;
  ctx.fillRect(-128, -128, pw + 256, ph + 256);
  ctx.restore();
}

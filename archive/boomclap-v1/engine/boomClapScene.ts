/**
 * Boom-Clap-Szene: Timeline, Kamera und Effekte zum Soundtrack.
 * Alles ist eine reine Funktion der Songzeit – Pause, Resize oder ein
 * Neustart ändern nichts am Ablauf.
 *
 * Zeitachse in Song-Beats (91,85 BPM, Beat 0 = 0,16 s):
 *   −0,3 … 3   Peter Parker, A-cappella-Intro
 *   3 / 4      BOOM (Konfetti) / CLAP  → Spider-Man
 *   7 … 10     „on and on and on and on“ – eine Pose pro Beat
 *   11 / 12    BOOM (Konfetti) / CLAP  → Sprung, kopfüber an die Decke
 *   15 … 19    der Symbiont kriecht über den Anzug
 *   19 / 20    BOOM (Konfetti) / CLAP  → Black Spider-Man
 *   23 … 26    Posen an der Decke, dann lässt er sich fallen
 *   27 / 28    BOOM (Konfetti, Superheldenlandung) / CLAP
 *   28 … 35    Outro
 */
import { BEAT, SONG_LENGTH, beatAt, timeAt, type AudioLevels } from './boomClapTrack';
import {
  BODY,
  STAND_HEIGHT,
  buildRig,
  drawHero,
  toWorld,
  type Pose,
  type Suit,
} from './boomClapHero';
import { CEIL_Y, CX, FLOOR_Y, H, W, paintRoom, paintRoomDynamic } from './boomClapRoom';
import { drawWebShots, webShotsActive } from './boomClapWebShot';
import { drawConfetti, makeBurst, type Burst, type CannonSpec } from './boomClapConfetti';
import { HAND_SHAPES, blendHand, fidget } from './boomClapHand';
import { drawHeart, handArc, springEase } from './boomClapMotion';
import { clamp, easeInOut, lerp, seeded, smooth } from './canvasUtils';

/** sichtbare Welthöhe; die Breite ergibt sich aus dem Format */
const VIEW_H = 960;
const VIEW_W_MAX = 1707;

/* ------------------------------------------------------------------ */
/*  Posen                                                              */
/* ------------------------------------------------------------------ */

const PELVIS_Y = FLOOR_Y - STAND_HEIGHT;
const ANKLE = 278;
const CEIL_S = 0.85;
const CEIL_FEET = 150;
const CEIL_PELVIS = CEIL_Y + (CEIL_FEET + BODY.foot) * CEIL_S;
const UP = -Math.PI / 2;
const DOWN = Math.PI / 2;
const PI = Math.PI;

const STAND: Pose = {
  x: CX,
  y: PELVIS_Y,
  s: 1,
  rot: 0,
  lean: 0,
  tl: 1,
  headTilt: 0,
  hl: [-74, 42],
  hr: [74, 42],
  fl: [-40, ANKLE],
  fr: [40, ANKLE],
  hlDir: 0,
  hlW: 0,
  hrDir: 0,
  hrW: 0,
  shapeL: 'relaxed',
  shapeR: 'relaxed',
  mouth: 0,
  brow: 0,
  lookX: 0,
  squint: 0,
  blink: 0,
};

/** Becken absenken, Füße bleiben auf dem Boden */
const dip = (d: number, spread = 0): Partial<Pose> => ({
  y: PELVIS_Y + d,
  fl: [-40 - spread, ANKLE - d],
  fr: [40 + spread, ANKLE - d],
});

type Ease = 'io' | 'in' | 'out' | 'snap' | 'hold';
interface Key {
  k: number;
  pose: Pose;
  ease: Ease;
}

const keys: Key[] = [];
let last = STAND;
function key(k: number, change: Partial<Pose>, ease: Ease = 'io') {
  last = { ...last, ...change };
  keys.push({ k, pose: last, ease });
}

/* ---------- Peter, A-cappella-Intro ---------- */
key(-0.3, {});
key(0.3, { headTilt: 0.03 });
key(0.6, { hr: [30, -194], hrDir: UP - 0.3, hrW: 1, shapeR: 'point', headTilt: -0.04, brow: 0.4 });
key(0.85, { hr: [30, -204], brow: 0.9 }, 'out');
key(1.1, { hr: [74, 42], hrW: 0, shapeR: 'relaxed', lookX: -1, headTilt: 0.06, brow: 0.2 });
// schüchternes Herz mit den Händen
key(
  1.5,
  {
    lookX: 0.2,
    headTilt: -0.08,
    hl: [-13, -80],
    hr: [13, -80],
    hlDir: UP - 0.36,
    hrDir: UP + 0.36,
    hlW: 1,
    hrW: 1,
    shapeL: 'heart',
    shapeR: 'heart',
    brow: 0.3,
  },
  'snap',
);
key(2.35, { headTilt: -0.12, hl: [-13, -84], hr: [13, -84] });
key(2.7, {
  lookX: 0,
  headTilt: 0,
  brow: 0.5,
  hl: [-62, -24],
  hr: [62, -24],
  shapeL: 'fist',
  shapeR: 'fist',
});
// BOOM 1
key(3, { ...dip(28, 6), hl: [-88, 12], hr: [88, 12], brow: 1 }, 'snap');
key(3.45, {
  ...dip(-2),
  hl: [-152, -186],
  hr: [152, -186],
  hlDir: UP - 0.5,
  hlW: 1,
  hrDir: UP + 0.5,
  hrW: 1,
  shapeL: 'open',
  shapeR: 'open',
});
// CLAP 1 – Hände treffen sich vor dem Gesicht
const CLAP: Partial<Pose> = {
  ...dip(6),
  hl: [-7, -186],
  hr: [7, -186],
  hlDir: UP,
  hrDir: UP,
  shapeL: 'flat',
  shapeR: 'flat',
  brow: 1,
};
key(4, CLAP, 'in');

/* ---------- Spider-Man ---------- */
key(4.12, CLAP, 'hold');
const HERO: Partial<Pose> = {
  ...dip(30, 56),
  lean: -0.04,
  headTilt: 0.14,
  hl: [-64, -36],
  hlW: 0,
  shapeL: 'fist',
  hr: [128, -150],
  hrDir: UP - 0.15,
  hrW: 1,
  shapeR: 'thwip',
  brow: 0,
};
key(4.45, HERO, 'snap');
// Herz vor der Brust
key(
  5,
  {
    hl: [-13, -80],
    hr: [13, -80],
    hlDir: UP - 0.36,
    hrDir: UP + 0.36,
    hlW: 1,
    hrW: 1,
    shapeL: 'heart',
    shapeR: 'heart',
    headTilt: 0.2,
  },
  'snap',
);
key(5.6, { headTilt: 0.26, hl: [-13, -84], hr: [13, -84] });
key(6, { hl: [-128, -150], hlDir: UP + 0.15, hlW: 1, shapeL: 'thwip', headTilt: -0.12 }, 'snap');
key(6.8, { headTilt: -0.06 });
// „on and on and on and on“ – eine Pose pro Beat
key(
  7,
  {
    hr: [116, -206],
    hrDir: UP - 0.2,
    shapeR: 'thwip',
    hl: [-64, -36],
    hlW: 0,
    shapeL: 'fist',
    headTilt: 0.16,
    lean: -0.05,
  },
  'snap',
);
key(7.7, { headTilt: 0.12 });
key(
  8,
  {
    hl: [-116, -206],
    hlDir: UP + 0.2,
    hlW: 1,
    shapeL: 'thwip',
    hr: [64, -36],
    hrW: 0,
    shapeR: 'fist',
    headTilt: -0.16,
    lean: 0.05,
  },
  'snap',
);
key(8.7, { headTilt: -0.12 });
key(
  9,
  {
    hl: [-112, -300],
    hr: [112, -300],
    hrW: 1,
    hrDir: UP + 0.3,
    hlDir: UP - 0.3,
    shapeL: 'open',
    shapeR: 'open',
    headTilt: 0,
    lean: 0,
  },
  'snap',
);
key(9.7, { hl: [-118, -292], hr: [118, -292] });
key(
  10,
  {
    hl: [44, -132],
    hr: [-44, -132],
    hlW: 0,
    hrW: 0,
    shapeL: 'fist',
    shapeR: 'fist',
    headTilt: 0.05,
  },
  'snap',
);
key(10.5, { ...dip(40, 60), hl: [-70, 10], hr: [70, 10], shapeL: 'open', shapeR: 'open' });
// BOOM 2 – tief in die Hocke
key(
  11,
  { ...dip(98, 72), lean: 0.05, tl: 0.88, headTilt: -0.04, hl: [-74, 62], hr: [74, 62] },
  'snap',
);
key(11.75, { ...dip(108, 76), lean: -0.03 });
// CLAP 2 und Absprung
key(
  12,
  {
    hl: [-6, -118],
    hr: [6, -118],
    hlDir: UP,
    hrDir: UP,
    hlW: 1,
    hrW: 1,
    shapeL: 'flat',
    shapeR: 'flat',
    lean: 0,
  },
  'in',
);
key(
  12.14,
  { y: PELVIS_Y - 120, tl: 1.05, fl: [-22, 286], fr: [22, 286], hl: [-34, -380], hr: [34, -380] },
  'out',
);
key(12.36, {
  y: 330,
  s: 0.92,
  rot: PI * 0.6,
  tl: 0.9,
  fl: [-40, 128],
  fr: [40, 128],
  hl: [-74, -54],
  hr: [74, -54],
  hlW: 0,
  hrW: 0,
  shapeL: 'fist',
  shapeR: 'fist',
});
const CEIL: Partial<Pose> = {
  x: CX,
  y: CEIL_PELVIS,
  s: CEIL_S,
  rot: PI,
  tl: 0.98,
  lean: 0,
  headTilt: 0,
  fl: [-106, CEIL_FEET],
  fr: [106, CEIL_FEET],
  hl: [-150, -70],
  hr: [150, -70],
  shapeL: 'open',
  shapeR: 'open',
};
key(
  12.6,
  { ...CEIL, y: CEIL_PELVIS + 12, fl: [-110, CEIL_FEET - 12], fr: [110, CEIL_FEET - 12] },
  'out',
);
key(12.9, CEIL);
key(13.5, { hr: [130, -172], hrDir: UP - 0.1, hrW: 1, shapeR: 'thwip', headTilt: 0.2 }, 'snap');
key(14.4, { hr: [120, -110], hrW: 0, shapeR: 'open', hl: [-120, -110], headTilt: 0.05 });

/* ---------- Symbiont ---------- */
key(15.2, { hl: [-70, -150], hr: [70, -150], shapeL: 'claw', shapeR: 'claw', headTilt: 0.18 });
key(16, { hl: [-62, -172], hr: [96, -118], headTilt: 0.28, lean: 0.08 });
key(17, { hl: [-96, -116], hr: [64, -176], headTilt: -0.28, lean: -0.08 });
key(18, { hl: [-70, -170], hr: [100, -120], headTilt: 0.24, lean: 0.06 });
key(18.7, {
  hl: [-40, -150],
  hr: [40, -150],
  shapeL: 'fist',
  shapeR: 'fist',
  tl: 0.95,
  headTilt: 0,
  lean: 0,
});
// BOOM 3 – Netze in die Kamera: rechts, links, dann beide Hände
key(
  19,
  {
    hr: [130, -172],
    hrDir: UP - 0.1,
    hrW: 1,
    shapeR: 'thwip',
    headTilt: 0.1,
    tl: 0.96,
  },
  'snap',
);
key(
  19.3,
  {
    hl: [-130, -172],
    hlDir: UP + 0.1,
    hlW: 1,
    shapeL: 'thwip',
    hr: [70, -130],
    hrW: 0,
    shapeR: 'fist',
    headTilt: -0.1,
  },
  'snap',
);
key(
  19.55,
  {
    hl: [-62, -192],
    hr: [62, -192],
    hlDir: UP + 0.15,
    hrDir: UP - 0.15,
    hrW: 1,
    shapeR: 'thwip',
    headTilt: 0,
  },
  'snap',
);
// der Symbiont reißt an ihm
key(19.8, {
  hl: [-36, -150],
  hr: [36, -150],
  hlW: 0,
  hrW: 0,
  shapeL: 'fist',
  shapeR: 'fist',
  tl: 0.94,
  headTilt: 0,
  fl: [-96, CEIL_FEET - 8],
  fr: [96, CEIL_FEET - 8],
});
// CLAP 3 – Black Spider-Man
key(
  20,
  {
    hl: [-186, -150],
    hr: [186, -150],
    shapeL: 'claw',
    shapeR: 'claw',
    tl: 1,
    fl: [-110, CEIL_FEET],
    fr: [110, CEIL_FEET],
  },
  'snap',
);
key(20.6, { hl: [-176, -132], hr: [176, -132] });
key(21.2, {
  hl: [-64, -60],
  hr: [92, -36],
  shapeL: 'fist',
  shapeR: 'relaxed',
  headTilt: 0.3,
  lean: 0.05,
});
key(21.7, { hr: [120, -168], hrDir: UP - 0.1, hrW: 1, shapeR: 'thwip', headTilt: 0.18 }, 'snap');
key(22.5, { squint: 1, headTilt: 0.3 });
key(
  23,
  {
    hl: [-120, -168],
    hlDir: UP + 0.1,
    hlW: 1,
    shapeL: 'thwip',
    hr: [64, -60],
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
    hr: [120, -168],
    hrDir: UP - 0.1,
    hrW: 1,
    shapeR: 'thwip',
    hl: [-64, -60],
    hlW: 0,
    shapeL: 'fist',
    headTilt: 0.22,
  },
  'snap',
);
// kopfüber ein Herz
key(
  25,
  {
    hl: [-13, -80],
    hr: [13, -80],
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
key(25.7, { hl: [-13, -84], hr: [13, -84], headTilt: 0.22 });
key(26, { hl: [44, -132], hr: [-44, -132], shapeL: 'fist', shapeR: 'fist', squint: 0.2 }, 'snap');
// loslassen und fallen
key(26.35, {
  hl: [-60, -40],
  hr: [60, -40],
  tl: 0.9,
  fl: [-80, CEIL_FEET + 10],
  fr: [80, CEIL_FEET + 10],
});
key(26.65, {
  y: 470,
  s: 0.93,
  rot: PI * 1.5,
  tl: 0.88,
  fl: [-40, 130],
  fr: [40, 130],
  hl: [-74, -60],
  hr: [74, -60],
});
// BOOM 4 – Superheldenlandung auf drei Punkten
const LANDING: Partial<Pose> = {
  ...dip(150, 74),
  s: 1,
  rot: PI * 2,
  tl: 0.55,
  lean: 0.08,
  headTilt: -0.05,
  hl: [-30, 136],
  hlDir: DOWN,
  hlW: 1,
  shapeL: 'flat',
  hr: [158, -40],
  hrDir: -0.3,
  hrW: 0.6,
  shapeR: 'open',
  squint: 0.6,
};
key(27, LANDING, 'snap');
key(27.6, { ...LANDING, ...dip(156, 74) });
// CLAP 4 – aufrichten und klatschen
key(
  28,
  {
    ...dip(10, 20),
    tl: 1,
    lean: 0,
    hl: [-7, -186],
    hr: [7, -186],
    hlDir: UP,
    hrDir: UP,
    hlW: 1,
    hrW: 1,
    shapeL: 'flat',
    shapeR: 'flat',
    squint: 0,
    headTilt: 0,
  },
  'in',
);
key(
  28.35,
  {
    ...dip(34, 60),
    hl: [-170, -110],
    hr: [170, -110],
    hlW: 0,
    hrW: 0,
    shapeL: 'claw',
    shapeR: 'claw',
    headTilt: 0.12,
  },
  'snap',
);
// Outro: eine Pose pro Beat
key(
  29,
  {
    hr: [128, -150],
    hrDir: UP - 0.15,
    hrW: 1,
    shapeR: 'thwip',
    hl: [-64, -36],
    shapeL: 'fist',
    headTilt: 0.18,
    lean: -0.04,
  },
  'snap',
);
key(
  30,
  {
    hl: [-128, -150],
    hlDir: UP + 0.15,
    hlW: 1,
    shapeL: 'thwip',
    hr: [64, -36],
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
    hl: [44, -132],
    hr: [-44, -132],
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
    hl: [-13, -80],
    hr: [13, -80],
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
key(32.7, { hl: [-13, -84], hr: [13, -84], headTilt: -0.2 });
key(
  33,
  {
    hl: [-64, -36],
    hlW: 0,
    shapeL: 'fist',
    hr: [116, -206],
    hrDir: UP - 0.2,
    shapeR: 'thwip',
    headTilt: 0.25,
  },
  'snap',
);
key(
  34,
  {
    ...dip(40, 70),
    hl: [-132, -160],
    hr: [132, -160],
    hlW: 1,
    hlDir: UP + 0.15,
    shapeL: 'thwip',
    squint: 0.6,
    headTilt: 0.06,
  },
  'snap',
);
key(36, { headTilt: 0.1 });

/* ------------------------------------------------------------------ */
/*  Kamera: Song-Beat → Blickpunkt (y) und Zoom                        */
/* ------------------------------------------------------------------ */

const CAM: [number, number, number][] = [
  [-0.3, 545, 1.1],
  [3, 550, 1.18],
  [4, 550, 1.12],
  [11.9, 565, 1.14],
  [12.6, 410, 1.2],
  [15, 400, 1.22],
  [19.9, 370, 1.34],
  [20.5, 400, 1.22],
  [26.2, 410, 1.22],
  [27, 565, 1.14],
  [35, 545, 1.22],
];

function camAt(k: number): [number, number] {
  if (k <= CAM[0][0]) return [CAM[0][1], CAM[0][2]];
  for (let i = 1; i < CAM.length; i++) {
    if (k <= CAM[i][0]) {
      const [k0, y0, z0] = CAM[i - 1];
      const [k1, y1, z1] = CAM[i];
      const e = easeInOut((k - k0) / (k1 - k0));
      return [lerp(y0, y1, e), lerp(z0, z1, e)];
    }
  }
  const l = CAM[CAM.length - 1];
  return [l[1], l[2]];
}

/* ------------------------------------------------------------------ */
/*  Interpolation                                                      */
/* ------------------------------------------------------------------ */

const easeFns: Record<Ease, (x: number) => number> = {
  io: easeInOut,
  in: (x) => x * x * x,
  out: (x) => 1 - (1 - x) ** 3,
  snap: springEase,
  hold: (x) => (x >= 1 ? 1 : 0),
};

function blendPose(a: Pose, b: Pose, t: number, raw: number): Pose {
  const out = { ...a } as Record<string, unknown>;
  const A = a as unknown as Record<string, unknown>;
  const B = b as unknown as Record<string, unknown>;
  for (const k of Object.keys(a)) {
    const va = A[k];
    const vb = B[k];
    if (typeof va === 'number' && typeof vb === 'number') out[k] = lerp(va, vb, t);
    else if (Array.isArray(va) && Array.isArray(vb))
      out[k] = [lerp(va[0], vb[0], t), lerp(va[1], vb[1], t)];
    else out[k] = raw < 0.5 ? va : vb;
  }
  return out as unknown as Pose;
}

function poseAt(k: number): Pose {
  if (k <= keys[0].k) return keys[0].pose;
  for (let i = 1; i < keys.length; i++) {
    const k1 = keys[i];
    if (k <= k1.k) {
      const k0 = keys[i - 1];
      const raw = (k - k0.k) / Math.max(1e-6, k1.k - k0.k);
      const t = easeFns[k1.ease](raw);
      const pose = blendPose(k0.pose, k1.pose, t, raw);
      // Hände auf Bögen, Finger fließend zwischen den Gesten
      if (k1.ease !== 'hold') {
        pose.hl = handArc(k0.pose.hl, k1.pose.hl, t, -1);
        pose.hr = handArc(k0.pose.hr, k1.pose.hr, t, 1);
      }
      const ft = smooth(0.1, 0.85, clamp(t, 0, 1));
      pose.handL = blendHand(HAND_SHAPES[k0.pose.shapeL], HAND_SHAPES[k1.pose.shapeL], ft);
      pose.handR = blendHand(HAND_SHAPES[k0.pose.shapeR], HAND_SHAPES[k1.pose.shapeR], ft);
      return pose;
    }
  }
  return keys[keys.length - 1].pose;
}

const suitAt = (k: number): Suit => (k < 4 ? 'peter' : k < 20 ? 'spidey' : 'black');
const gooAt = (k: number) => smooth(15.1, 18.9, k) * 0.72 + smooth(19, 19.92, k) * 0.28;

const BOOMS = [3, 11, 19, 27];
/** Herz-Gesten: von Beat, bis Beat, Farbe der aufsteigenden Herzen */
const HEARTS: [number, number, string][] = [
  [1.5, 2.35, '#ff5a7a'],
  [5, 5.8, '#ff3b5c'],
  [25, 25.8, '#a98bff'],
  [32, 32.8, '#ff3b5c'],
];
/** Konfetti-Kanonen stehen unsichtbar unter dem Bildrand */
const HIDDEN_CANNONS: CannonSpec[] = [
  { x: 230, y: 1160, dir: 1, scale: 1.3, tilt: 0.45 },
  { x: 1570, y: 1160, dir: -1, scale: 1.3, tilt: 0.45 },
];
const BURST_OPTS = { cannons: HIDDEN_CANNONS, scale: 1.2 };
const CLAPS = [4, 12, 20, 28];
const WORDS: [number, string][] = [
  ...BOOMS.map((k): [number, string] => [k, 'BOOM!']),
  ...CLAPS.map((k): [number, string] => [k, 'CLAP!']),
].sort((a, b) => a[0] - b[0]);

/* ------------------------------------------------------------------ */
/*  Szene                                                              */
/* ------------------------------------------------------------------ */

export interface SceneState {
  /** Comic-Wort, das gerade aufpoppt */
  word: string;
  wordId: number;
  progress: number;
  ended: boolean;
}

export class BoomClapScene {
  private ctx: CanvasRenderingContext2D;
  private room = document.createElement('canvas');
  private heroBuf = document.createElement('canvas');
  private auxBuf = document.createElement('canvas');
  private maskBuf = document.createElement('canvas');
  private w = 0;
  private h = 0;
  private dpr = 1;
  private scale = 1;
  private bursts: Burst[];
  motion = true;
  /** Songlänge – nach dem Ende friert die Szene ein */
  duration = SONG_LENGTH;

  readonly state: SceneState = { word: '', wordId: 0, progress: 0, ended: false };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.bursts = [
      makeBurst(timeAt(3), 'spidey', 101, BURST_OPTS),
      makeBurst(timeAt(11), 'spidey', 202, BURST_OPTS),
      makeBurst(timeAt(19), 'symbiote', 303, BURST_OPTS),
      makeBurst(timeAt(27), 'finale', 404, BURST_OPTS),
    ];
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
    this.scale = Math.max(w / VIEW_W_MAX, h / VIEW_H);
    for (const c of [this.heroBuf, this.auxBuf, this.maskBuf]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    // Raum etwas höher aufgelöst, damit Zoomfahrten scharf bleiben
    const rs = Math.min(this.scale * dpr * 1.3, 4096 / W);
    this.room.width = Math.round(W * rs);
    this.room.height = Math.round(H * rs);
    const rctx = this.c2d(this.room);
    rctx.setTransform(rs, 0, 0, rs, 0, 0);
    paintRoom(rctx);
  }

  /**
   * @param t Songzeit in Sekunden oder null = Wartebild vor dem Start
   * @param wall fortlaufende Uhr für Atmen, Blinzeln, Lichter
   * @param levels Pegel aus dem Song (Lippen und Lichterkette)
   */
  render(t: number | null, wall: number, levels: AudioLevels = { low: 0, vocal: 0 }) {
    const ctx = this.ctx;
    const idle = t === null;
    const time = idle ? 0 : Math.min(t, this.duration);
    const k = idle ? -0.3 : beatAt(time);
    const m = this.motion ? 1 : 0.25;

    const pose = this.addLife(poseAt(k), k, time, idle, wall, levels);
    const suit: Suit = idle ? 'peter' : suitAt(k);

    /* ---------- Kamera ---------- */
    const since = (list: number[]) => {
      let best = Infinity;
      for (const x of list) if (k >= x) best = Math.min(best, (k - x) * BEAT);
      return best;
    };
    const tBoom = idle ? Infinity : since(BOOMS);
    const tClap = idle ? Infinity : since(CLAPS);
    const tCeil = idle ? Infinity : since([12.6]);
    const tBlack = idle ? Infinity : since([20]);
    const tLand = idle ? Infinity : since([27]);
    const [camY, camZ] = camAt(k);
    const punch =
      Math.exp(-tClap * 7) * 0.06 + Math.exp(-tBoom * 9) * 0.035 + Math.exp(-tBlack * 5) * 0.06;
    const zoom = camZ + punch * m;
    const shakeAmp =
      (Math.exp(-tBoom * 9) * 9 +
        Math.exp(-tCeil * 7) * 11 +
        Math.exp(-tBlack * 6) * 12 +
        Math.exp(-tLand * 6) * 14) *
      m;
    const hand = this.motion ? 1 : 0;
    const swayX = (Math.sin(wall * 0.6) * 3 + Math.sin(wall * 1.7) * 1) * hand;
    const swayY = Math.sin(wall * 0.9 + 1) * 2.2 * hand;
    const roll = (Math.sin(wall * 0.5) * 0.003 + Math.sin(wall * 47) * shakeAmp * 0.0008) * hand;
    const shX = Math.sin(wall * 61) * shakeAmp + swayX;
    const shY = Math.cos(wall * 53) * shakeAmp + swayY;

    const sc = this.scale * this.dpr;
    const pw = Math.round(this.w * this.dpr);
    const ph = Math.round(this.h * this.dpr);
    const setCam = (c: CanvasRenderingContext2D) => {
      c.setTransform(sc, 0, 0, sc, pw / 2, ph / 2);
      c.scale(zoom, zoom);
      c.rotate(roll);
      c.translate(-CX - shX, -camY - shY);
    };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0d16';
    ctx.fillRect(0, 0, pw, ph);
    setCam(ctx);

    /* ---------- Raum ---------- */
    ctx.drawImage(this.room, 0, 0, W, H);
    const goo = idle ? 0 : gooAt(k);
    const inGoo = !idle && k > 15 && k < 20;
    const flick = inGoo ? flicker(wall, goo) : 1;
    let power = 1;
    if (!idle && k >= 15 && k < 20) power = lerp(1, 0.18, goo) * flick;
    else if (!idle && k >= 20 && k < 27) power = lerp(0.2, 0.55, smooth(20, 22, k));
    else if (!idle && k >= 27) power = lerp(0.55, 0.95, smooth(27, 28.5, k));
    let lampSwing = Math.sin(wall * 0.8) * 0.012;
    if (tCeil < Infinity && k < 27)
      lampSwing = Math.sin(tCeil * 5.2) * 0.42 * Math.exp(-tCeil * 0.9);
    else if (tLand < Infinity) lampSwing = Math.sin(tLand * 5.6) * 0.18 * Math.exp(-tLand * 1.1);
    paintRoomDynamic(ctx, {
      power,
      lampSwing,
      suitInBag: idle || k < 4,
      bass: levels.low,
      time: wall,
    });

    // Raum dunkelt ab, wenn der Symbiont übernimmt (danach violettes Licht)
    let dark = 0.1;
    if (!idle && k >= 15 && k < 20) dark = 0.1 + goo * 0.42 * (flick < 1 ? 1.3 : 1);
    else if (!idle && k >= 20 && k < 27) dark = lerp(0.5, 0.3, smooth(20, 22, k));
    else if (!idle && k >= 27) dark = lerp(0.3, 0.14, smooth(27, 28.5, k));
    ctx.fillStyle = !idle && k >= 20 ? `rgba(16,6,34,${dark})` : `rgba(4,6,16,${dark})`;
    ctx.fillRect(-100, -100, W + 200, H + 200);

    /* ---------- Schatten ---------- */
    this.drawShadows(ctx, pose, k, idle);

    /* ---------- Bewegungsunschärfe bei Sprung und Fall ---------- */
    const flying = !idle && ((k > 12.04 && k < 12.7) || (k > 26.3 && k < 27.05));
    if (flying && this.motion) {
      for (const [lag, a] of [
        [0.09, 0.12],
        [0.05, 0.22],
      ]) {
        const kk = k - lag / BEAT;
        const gp = this.addLife(poseAt(kk), kk, time - lag, false, wall, levels);
        this.heroLayer(gp, suitAt(kk), 0, wall, setCam);
        this.blit(this.heroBuf, a);
      }
      speedLines(ctx, pose, k < 20 ? 1 : -1);
    }

    /* ---------- Held mit Randlicht und Spiegelung im Holzboden ---------- */
    this.heroLayer(pose, suit, inGoo ? goo : 0, wall, setCam);
    const fy = ctx.getTransform().transformPoint(new DOMPoint(CX, FLOOR_Y)).y;
    if (idle || k < 12.2 || k > 26.8) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath();
      ctx.rect(0, fy, pw, ph - fy);
      ctx.clip();
      ctx.translate(0, fy * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = 0.1;
      ctx.drawImage(this.heroBuf, 0, 0);
      ctx.restore();
    }
    this.rimLight(!idle && k >= 20 ? 'rgba(200,170,255,0.85)' : 'rgba(150,185,255,0.8)', pose.s);
    this.blit(this.heroBuf, 1);
    setCam(ctx);
    if (inGoo) tendrils(ctx, pose, goo, wall, true);

    /* ---------- Vordergrund: Kanonen, Konfetti, Partikel ---------- */
    if (!idle) {
      drawConfetti(ctx, this.bursts, time);
      this.clapBurst(ctx, k, levels);
      this.heartPops(ctx, k, pose);
      ceilingDust(ctx, k, pose);
      if (k >= 27 && k < 30) floorImpact(ctx, (k - 27) * BEAT);
      if (k >= 20 && k < 21.6) shockRing(ctx, pose, (k - 20) * BEAT);
      drips(ctx, k, pose);
      if (webShotsActive(k)) {
        const rig = buildRig(pose);
        const m = ctx.getTransform();
        const scr = (v: [number, number]): [number, number] => {
          const q = m.transformPoint(new DOMPoint(...toWorld(pose, v)));
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
    const flashMul = this.motion ? 1 : 0.4;
    const boomFlash = idle ? 0 : Math.exp(-tBoom * 14) * 0.25;
    const flash = idle ? 0 : Math.exp(-tClap * 11) * 0.85 + Math.exp(-tBlack * 7) * 0.5;
    if (boomFlash > 0.01) {
      ctx.fillStyle = `rgba(255,214,150,${boomFlash * flashMul})`;
      ctx.fillRect(0, 0, pw, ph);
    }
    if (flash > 0.01) {
      ctx.fillStyle =
        k >= 20 ? `rgba(225,215,255,${flash * flashMul})` : `rgba(255,255,255,${flash * flashMul})`;
      ctx.fillRect(0, 0, pw, ph);
    }
    if (!idle && this.motion && tBlack < 0.32) this.glitch(ctx, tBlack, pw, ph);
    const vg = ctx.createRadialGradient(
      pw / 2,
      ph * 0.48,
      ph * 0.3,
      pw / 2,
      ph * 0.5,
      Math.max(pw, ph) * 0.72,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${idle ? 0.62 : 0.5})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, pw, ph);
    if (this.motion) grain(ctx, pw, ph, wall);

    this.updateState(k, time, idle);
  }

  /* ---------- Held in den Puffer zeichnen (inkl. Symbionten-Maske) ---------- */
  private heroLayer(
    pose: Pose,
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
      drawHero(hb, pose, suit, wall);
      return;
    }
    drawHero(hb, pose, 'spidey', wall);
    // schwarzer Anzug in den Hilfspuffer, maskiert durch den wachsenden Fleck
    const ab = this.c2d(this.auxBuf);
    ab.setTransform(1, 0, 0, 1, 0, 0);
    ab.clearRect(0, 0, this.auxBuf.width, this.auxBuf.height);
    setCam(ab);
    drawHero(ab, pose, 'black', wall);
    const mc = this.c2d(this.maskBuf);
    mc.setTransform(1, 0, 0, 1, 0, 0);
    mc.clearRect(0, 0, this.maskBuf.width, this.maskBuf.height);
    setCam(mc);
    const [cx, cy] = toWorld(pose, buildRig(pose).chest);
    const r = goo ** 1.15 * 360 * pose.s;
    mc.fillStyle = '#000';
    mc.beginPath();
    for (let i = 0; i <= 56; i++) {
      const a = (i / 56) * Math.PI * 2;
      const wob =
        1 +
        0.2 * Math.sin(a * 5 + wall * 3) +
        0.12 * Math.sin(a * 11 - wall * 5) +
        0.08 * Math.sin(a * 17 + wall * 7);
      const x = cx + Math.cos(a) * r * wob;
      const y = cy + Math.sin(a) * r * wob;
      if (i) mc.lineTo(x, y);
      else mc.moveTo(x, y);
    }
    mc.fill();
    tendrils(mc, pose, goo, wall, false);
    ab.setTransform(1, 0, 0, 1, 0, 0);
    ab.globalCompositeOperation = 'destination-in';
    ab.drawImage(this.maskBuf, 0, 0);
    ab.globalCompositeOperation = 'source-over';
    hb.setTransform(1, 0, 0, 1, 0, 0);
    hb.drawImage(this.auxBuf, 0, 0);
  }

  /** kühles Randlicht vom Fenster: eingefärbte, leicht versetzte Silhouette hinter dem Helden */
  private rimLight(color: string, s: number) {
    const ab = this.c2d(this.auxBuf);
    ab.setTransform(1, 0, 0, 1, 0, 0);
    ab.clearRect(0, 0, this.auxBuf.width, this.auxBuf.height);
    ab.drawImage(this.heroBuf, 0, 0);
    ab.globalCompositeOperation = 'source-in';
    ab.fillStyle = color;
    ab.fillRect(0, 0, this.auxBuf.width, this.auxBuf.height);
    ab.globalCompositeOperation = 'source-over';
    const o = 2.2 * this.scale * this.dpr * s;
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.auxBuf, o, -o * 0.7);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(this.auxBuf, -o * 0.6, -o * 0.4);
    ctx.restore();
  }

  private blit(c: HTMLCanvasElement, alpha: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  }

  /** Groove, Atmen, Blinzeln, Lippen, Zittern – kommt auf die Keyframe-Pose */
  private addLife(
    p: Pose,
    k: number,
    t: number,
    idle: boolean,
    wall: number,
    levels: AudioLevels,
  ): Pose {
    const out: Pose = { ...p, hl: [...p.hl], hr: [...p.hr], fl: [...p.fl], fr: [...p.fr] };
    const sink = (d: number) => {
      out.y += d;
      out.fl[1] -= d;
      out.fr[1] -= d;
      out.hl[1] -= d * 0.5;
      out.hr[1] -= d * 0.5;
    };
    if (idle) {
      sink(Math.sin(wall * 2.2) * 2.2);
      out.headTilt += Math.sin(wall * 0.8) * 0.03;
      out.lookX = Math.sin(wall * 0.5) > 0.6 ? 0.8 : 0;
    } else {
      const frac = k - Math.floor(k);
      const bounce = Math.exp(-frac * 6) * 7 + Math.exp(-((frac - 1) ** 2) * 60) * 2;
      // im Takt wippen, solange er steht
      const groove =
        k > 0 && k < 2.3 ? 0.4 : (k > 4.4 && k < 10.4) || (k > 28.4 && k < 34.5) ? 1 : 0;
      if (groove) {
        sink(bounce * groove);
        out.headTilt += Math.sin(k * Math.PI) * 0.035 * groove;
        out.lean += Math.sin(k * Math.PI) * 0.015 * groove;
      }
      // kopfüber pendeln
      if ((k > 12.9 && k < 15) || (k > 20.6 && k < 26.2)) {
        out.lean += Math.sin(k * Math.PI * 0.5) * 0.05;
        out.headTilt += Math.sin(k * Math.PI) * 0.045;
      }
      // der Symbiont schüttelt ihn
      if (k > 15 && k < 20) {
        const g = smooth(15, 18.5, k) * (1 - smooth(19.85, 20, k));
        out.lean += Math.sin(t * 31) * 0.04 * g;
        out.headTilt += Math.sin(t * 23 + 1) * 0.09 * g;
        out.hl[0] += Math.sin(t * 37) * 6 * g;
        out.hr[1] += Math.cos(t * 29) * 6 * g;
      }
      // Peter singt das Intro mit
      if (k < 3.05) out.mouth = Math.max(out.mouth, clamp((levels.vocal - 0.28) * 2.6, 0, 1));
      if (k >= 2.9 && k < 3.4) out.mouth = Math.max(out.mouth, 1 - smooth(3.1, 3.4, k));
    }
    if (!idle) {
      // Überlappung: Hände kommen einen Hauch nach dem Körper an, Handgelenke ziehen nach
      const lag = poseAt(k - 0.07);
      out.hl = [out.hl[0] + (lag.hl[0] - p.hl[0]) * 0.28, out.hl[1] + (lag.hl[1] - p.hl[1]) * 0.28];
      out.hr = [out.hr[0] + (lag.hr[0] - p.hr[0]) * 0.28, out.hr[1] + (lag.hr[1] - p.hr[1]) * 0.28];
      out.wristL = clamp(
        (-(p.hl[0] - lag.hl[0]) * 0.5 + (p.hl[1] - lag.hl[1]) * 0.3) * 0.009,
        -0.5,
        0.5,
      );
      out.wristR = clamp(
        (-(p.hr[0] - lag.hr[0]) * 0.5 - (p.hr[1] - lag.hr[1]) * 0.3) * 0.009,
        -0.5,
        0.5,
      );
    }
    out.handL = fidget(p.handL ?? HAND_SHAPES[p.shapeL], idle ? wall : t, 1);
    out.handR = fidget(p.handR ?? HAND_SHAPES[p.shapeR], idle ? wall : t, 2);
    const bt = (idle ? wall : t) % 3.1;
    out.blink = bt < 0.13 ? Math.sin((bt / 0.13) * Math.PI) : 0;
    return out;
  }

  /** kleine Herzen steigen aus der Herz-Geste auf */
  private heartPops(ctx: CanvasRenderingContext2D, k: number, pose: Pose) {
    for (const [k0, k1, color] of HEARTS) {
      if (k < k0 || k > k1 + 2.5) continue;
      const rig = buildRig(pose);
      const [hx, hy] = toWorld(pose, [
        (rig.wristL[0] + rig.wristR[0]) / 2,
        (rig.wristL[1] + rig.wristR[1]) / 2 - 22,
      ]);
      const rand = seeded(Math.round(k0 * 10));
      for (let i = 0; i < 8; i++) {
        const born = k0 + 0.15 + rand() * (k1 - k0);
        const age = (k - born) * BEAT;
        if (age < 0 || age > 1.6) continue;
        const life = age / 1.6;
        const x = hx + (rand() - 0.5) * 60 + Math.sin(age * 4 + i) * 9;
        const y = hy - age * 110 - rand() * 16;
        const size = (8 + rand() * 7) * (life < 0.15 ? life / 0.15 : 1);
        drawHeart(ctx, x, y, size, color, 1 - life, Math.sin(age * 3 + i) * 0.25);
      }
    }
  }

  private drawShadows(ctx: CanvasRenderingContext2D, pose: Pose, k: number, idle: boolean) {
    const air = idle ? 0 : smooth(12.02, 12.3, k) * (1 - smooth(26.6, 27, k));
    const crouch = clamp((pose.y - PELVIS_Y) / 110, 0, 1);
    const spread = Math.abs(pose.fr[0] - pose.fl[0]) * 0.5;
    const g = ctx.createRadialGradient(CX, FLOOR_Y, 4, CX, FLOOR_Y, 160);
    g.addColorStop(0, `rgba(0,0,0,${0.4 * (1 - air * 0.85)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(
      CX,
      FLOOR_Y + 2,
      (74 + spread * 0.9 + crouch * 24) * (1 - air * 0.4),
      19 * (1 - air * 0.4),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    if (!idle && k > 12.45 && k < 26.7) {
      const a = smooth(12.45, 12.65, k) * (1 - smooth(26.3, 26.6, k));
      const g2 = ctx.createRadialGradient(CX, CEIL_Y, 4, CX, CEIL_Y, 140);
      g2.addColorStop(0, `rgba(0,0,0,${0.22 * a})`);
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.ellipse(CX, CEIL_Y + 2, 160, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private clapBurst(ctx: CanvasRenderingContext2D, k: number, levels: AudioLevels) {
    for (const c of CLAPS) {
      const dt = (k - c) * BEAT;
      if (dt < 0 || dt > 0.42) continue;
      const p = this.addLife(poseAt(c), c, timeAt(c), false, 0, levels);
      const rig = buildRig(p);
      const [x, y] = toWorld(p, [
        (rig.wristL[0] + rig.wristR[0]) / 2,
        (rig.wristL[1] + rig.wristR[1]) / 2 - 18,
      ]);
      const kk = dt / 0.42;
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${(1 - kk) * 0.95})`;
      ctx.lineWidth = 4 * (1 - kk) + 1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + 0.2;
        const r0 = 30 + kk * 70;
        const r1 = r0 + 30 * (1 - kk) + 8;
        ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
        ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      }
      ctx.stroke();
      // Funkeln, wenn ein neuer Anzug erscheint
      if (c === 4 || c === 20) {
        const rand = seeded(c);
        for (let i = 0; i < 20; i++) {
          const a = rand() * Math.PI * 2;
          const d = 70 + rand() * 200;
          const sx = x + Math.cos(a) * d * (0.5 + kk);
          const sy = y + 120 + Math.sin(a) * d * (0.7 + kk);
          const color =
            c === 4
              ? `rgba(255,${200 + rand() * 55},${190 + rand() * 60},${1 - kk})`
              : `rgba(${190 + rand() * 40},170,255,${1 - kk})`;
          sparkle(ctx, sx, sy, (4 + rand() * 7) * (1 - kk), color);
        }
      }
      ctx.restore();
    }
  }

  private glitch(ctx: CanvasRenderingContext2D, dt: number, pw: number, ph: number) {
    const rand = seeded(Math.floor(dt * 40) + 3);
    const strength = 1 - dt / 0.32;
    for (let i = 0; i < 8; i++) {
      const y = rand() * ph;
      const hgt = (0.02 + rand() * 0.06) * ph;
      const off = (rand() - 0.5) * 70 * this.dpr * strength;
      ctx.drawImage(ctx.canvas, 0, y, pw, hgt, off, y, pw, hgt);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.35 * strength;
    ctx.drawImage(ctx.canvas, 9 * this.dpr * strength, 0);
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
/*  Effekt-Helfer                                                      */
/* ------------------------------------------------------------------ */

function flicker(wall: number, goo: number) {
  const n = Math.sin(wall * 37) * Math.sin(wall * 13.7) + Math.sin(wall * 5.3);
  return n > 1.1 - goo * 0.8 ? 0.25 : 1;
}

function tendrils(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  goo: number,
  wall: number,
  visible: boolean,
) {
  const rig = buildRig(pose);
  const [cx, cy] = toWorld(pose, rig.chest);
  const targets = [
    rig.wristL,
    rig.wristR,
    rig.ankleL,
    rig.ankleR,
    rig.head,
    rig.elbowL,
    rig.elbowR,
    rig.kneeL,
    rig.kneeR,
  ];
  ctx.save();
  ctx.lineCap = 'round';
  targets.forEach((tp, i) => {
    const [tx, ty] = toWorld(pose, tp);
    const reach = clamp(goo * 1.7 - i * 0.05, 0, 1);
    if (reach <= 0) return;
    const ex = cx + (tx - cx) * reach;
    const ey = cy + (ty - cy) * reach;
    const nx = -(ty - cy);
    const ny = tx - cx;
    const len = Math.hypot(nx, ny) || 1;
    const wig = Math.sin(wall * 6 + i * 2.1) * 26 * pose.s;
    const mx = (cx + ex) / 2 + (nx / len) * wig;
    const my = (cy + ey) / 2 + (ny / len) * wig;
    const width = (visible ? 7 : 16) * pose.s * (1 - goo * 0.5);
    ctx.strokeStyle = visible ? 'rgba(6,7,12,0.92)' : '#000';
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    if (visible) {
      ctx.strokeStyle = 'rgba(140,170,255,0.35)';
      ctx.lineWidth = Math.max(1, width * 0.25);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(mx - 2, my - 2, ex - 1, ey - 1);
      ctx.stroke();
      ctx.fillStyle = 'rgba(6,7,12,0.95)';
      ctx.beginPath();
      ctx.arc(ex, ey, width * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  if (visible && goo > 0.2 && goo < 0.98) {
    ctx.strokeStyle = 'rgba(6,7,12,0.9)';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + wall * 0.6;
      const r = (110 + Math.sin(wall * 4 + i) * 40) * pose.s * goo;
      ctx.lineWidth = 4 * pose.s;
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
  ctx.restore();
}

function speedLines(ctx: CanvasRenderingContext2D, pose: Pose, dir: number) {
  const rand = seeded(91);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const x = pose.x + (rand() - 0.5) * 380;
    const y = pose.y + (rand() - 0.5) * 300;
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + dir * (70 + rand() * 130));
    ctx.stroke();
  }
  ctx.restore();
}

function ceilingDust(ctx: CanvasRenderingContext2D, k: number, pose: Pose) {
  const dt = (k - 12.6) * BEAT;
  if (dt < 0 || dt > 2.4 || k > 26.5) return;
  const rand = seeded(42);
  ctx.save();
  for (let i = 0; i < 50; i++) {
    const foot = i % 2 ? pose.fr : pose.fl;
    const [fx] = toWorld(pose, foot);
    const x0 = fx + (rand() - 0.5) * 50;
    const vx = (rand() - 0.5) * 70;
    const vy = 10 + rand() * 50;
    const life = 1 + rand() * 1.3;
    if (dt > life) continue;
    const x = x0 + vx * dt;
    const y = CEIL_Y + 4 + vy * dt + 0.5 * 160 * dt * dt;
    ctx.fillStyle = `rgba(210,205,195,${(1 - dt / life) * 0.8})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + rand() * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Risse in der Decke
  ctx.strokeStyle = `rgba(20,22,32,${0.6 * Math.min(1, dt * 8)})`;
  ctx.lineWidth = 1.2;
  for (const foot of [pose.fl, pose.fr]) {
    const [fx] = toWorld(pose, foot);
    const r2 = seeded(Math.round(fx));
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      let x = fx;
      let y = CEIL_Y + 2;
      ctx.moveTo(x, y);
      for (let j = 0; j < 3; j++) {
        x += (r2() - 0.5) * 22;
        y += (r2() - 0.6) * 8;
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Superheldenlandung: Staubring und Risse in den Dielen */
function floorImpact(ctx: CanvasRenderingContext2D, dt: number) {
  const k = clamp(dt / 1.4, 0, 1);
  ctx.save();
  ctx.strokeStyle = `rgba(230,220,200,${(1 - k) * 0.5})`;
  ctx.lineWidth = 6 * (1 - k) + 1;
  ctx.beginPath();
  ctx.ellipse(CX, FLOOR_Y, 60 + k * 420, 14 + k * 70, 0, 0, Math.PI * 2);
  ctx.stroke();
  const rand = seeded(27);
  for (let i = 0; i < 40; i++) {
    const a = Math.PI + rand() * Math.PI;
    const sp = 120 + rand() * 260;
    const x = CX + Math.cos(a) * sp * dt * 1.4;
    const y = FLOOR_Y + Math.sin(a) * sp * 0.35 * dt + 300 * dt * dt;
    const life = 0.8 + rand() * 0.8;
    if (dt > life || y > FLOOR_Y + 30) continue;
    ctx.fillStyle = `rgba(200,190,170,${(1 - dt / life) * 0.7})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + rand() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = `rgba(15,8,4,${0.7 * Math.min(1, dt * 10)})`;
  ctx.lineWidth = 1.6;
  const r2 = seeded(99);
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    let x = CX - 20 + (r2() - 0.5) * 30;
    let y = FLOOR_Y + 6;
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) {
      x += (r2() - 0.5) * 60;
      y += (r2() - 0.4) * 10;
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drips(ctx: CanvasRenderingContext2D, k: number, pose: Pose) {
  if (k < 15.4 || k > 20.5) return;
  const rand = seeded(77);
  ctx.save();
  ctx.fillStyle = 'rgba(6,7,12,0.92)';
  for (let i = 0; i < 12; i++) {
    const start = 15.4 + rand() * 4.2;
    const dt = (k - start) * BEAT;
    const lx = (rand() - 0.5) * 160;
    const ly = -60 - rand() * 120;
    if (dt < 0 || dt > 1.2) continue;
    const p0 = toWorld(pose, [lx, ly]);
    const y = p0[1] + 0.5 * 900 * dt * dt;
    const r = 3 + rand() * 3;
    ctx.beginPath();
    ctx.ellipse(p0[0], y, r * 0.8, r * (1 + dt * 1.4), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function shockRing(ctx: CanvasRenderingContext2D, pose: Pose, dt: number) {
  const [cx, cy] = toWorld(pose, buildRig(pose).chest);
  const k = clamp(dt / 0.9, 0, 1);
  ctx.save();
  ctx.strokeStyle = `rgba(190,170,255,${(1 - k) * 0.7})`;
  ctx.lineWidth = 10 * (1 - k) + 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 40 + k * 420, 30 + k * 300, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  if (r <= 0.2) return;
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

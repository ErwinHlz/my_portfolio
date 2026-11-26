/**
 * Nahaufnahme ab Brusthöhe: Peter Parker, Spider-Man und Black Spider-Man
 * in hoher Detailstufe (Gesicht, Stoffe, Netzstruktur, Glanz).
 *
 * Lokales System: Ursprung am Halsansatz, y nach unten. Der Kopf sitzt bei
 * (0, −192), die Brust reicht bis unter den Bildrand.
 */
import {
  profileAt,
  profilePath,
  regionFrom,
  rotated,
  strokeArmOutline,
  type Profile,
} from './boomClapLimb';
import { clamp, seeded } from './canvasUtils';
import {
  HAND_SHAPES,
  drawParamHand,
  type HandParams,
  type HandShape,
  type HandStyle,
} from './boomClapHand';

export type Suit = 'peter' | 'spidey' | 'black';
export type { HandShape } from './boomClapHand';
type V = [number, number];

export interface BustPose {
  /** Halsansatz im Bild */
  x: number;
  y: number;
  s: number;
  /** π = kopfüber */
  rot: number;
  /** Schultern kippen */
  lean: number;
  /** Schultern hochziehen 0 … 1 */
  shrug: number;
  headTilt: number;
  /** Kopf drehen −1 … 1 */
  headTurn: number;
  /** Kopf nicken −1 … 1 */
  headNod: number;
  hl: V;
  hr: V;
  hlDir: number;
  hlW: number;
  hrDir: number;
  hrW: number;
  shapeL: HandShape;
  shapeR: HandShape;
  /** fließend gemischte Fingerstellung (überschreibt shapeL/shapeR) */
  handL?: HandParams;
  handR?: HandParams;
  /** zusätzliches Abknicken im Handgelenk (Nachziehen bei Bewegung) */
  wristL?: number;
  wristR?: number;
  mouth: number;
  smile: number;
  brow: number;
  browAsym: number;
  lookX: number;
  lookY: number;
  /** Augen bzw. Maskengläser zukneifen; negativ = aufreißen */
  squint: number;
  blink: number;
  /** Nachschwingen der Haare */
  hairSway: number;
}

const ARM = { upper: 255, fore: 235 };
const OUTLINE = 'rgba(8,6,18,0.55)';

interface Mat {
  base: string;
  dark: string;
  light: string;
  rim: string;
}

const MAT = {
  skin: { base: '#e5b08a', dark: '#a86f51', light: '#f9d6b8', rim: '#cfd8ff' },
  flannel: { base: '#3f5e8e', dark: '#1f304e', light: '#5d7fb3', rim: '#a6bdf2' },
  tee: { base: '#383b44', dark: '#1b1d23', light: '#555a66', rim: '#8e9cc2' },
  red: { base: '#c41e2a', dark: '#5e0a13', light: '#f04b4c', rim: '#ffa2b0' },
  blue: { base: '#1b3c97', dark: '#0a1846', light: '#3a62cf', rim: '#94b3ff' },
  black: { base: '#10121a', dark: '#020306', light: '#2a3249', rim: '#7088c4' },
} satisfies Record<string, Mat>;

/* ------------------------------------------------------------------ */
/*  Geometrie                                                          */
/* ------------------------------------------------------------------ */

const rot = (p: V, a: number): V => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
};
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const mix = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function ik(a: V, target: V, l1: number, l2: number, pref: V): { mid: V; end: V } {
  let dx = target[0] - a[0];
  let dy = target[1] - a[1];
  let dist = Math.hypot(dx, dy);
  if (dist < 1e-4) {
    dx = 0;
    dy = 1;
    dist = 1;
  }
  const u: V = [dx / dist, dy / dist];
  const dd = clamp(dist, Math.abs(l1 - l2) + 0.5, l1 + l2 - 0.5);
  const end = add(a, [u[0] * dd, u[1] * dd]);
  const along = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const base = add(a, [u[0] * along, u[1] * along]);
  const n: V = [-u[1], u[0]];
  const side = n[0] * pref[0] + n[1] * pref[1] >= 0 ? 1 : -1;
  return { mid: add(base, [n[0] * h * side, n[1] * h * side]), end };
}

function capsule(ctx: CanvasRenderingContext2D, a: V, b: V, ra: number, rb: number) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const d = Math.max(0.01, Math.hypot(b[0] - a[0], b[1] - a[1]));
  const off = Math.asin(clamp((ra - rb) / d, -0.95, 0.95));
  ctx.beginPath();
  ctx.arc(a[0], a[1], ra, ang + Math.PI / 2 - off, ang + (3 * Math.PI) / 2 + off);
  ctx.arc(b[0], b[1], rb, ang - Math.PI / 2 + off, ang + Math.PI / 2 - off);
  ctx.closePath();
}

function limbGradient(ctx: CanvasRenderingContext2D, a: V, b: V, r: number, mat: Mat, ls: number) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  let n: V = [-Math.sin(ang), Math.cos(ang)];
  if (n[0] * ls > 0) n = [-n[0], -n[1]];
  const m = mix(a, b, 0.5);
  const g = ctx.createLinearGradient(
    m[0] + n[0] * r,
    m[1] + n[1] * r,
    m[0] - n[0] * r,
    m[1] - n[1] * r,
  );
  g.addColorStop(0, mat.base);
  g.addColorStop(0.25, mat.light);
  g.addColorStop(0.6, mat.base);
  g.addColorStop(0.9, mat.dark);
  g.addColorStop(1, mat.rim);
  return g;
}

function limb(
  ctx: CanvasRenderingContext2D,
  a: V,
  b: V,
  ra: number,
  rb: number,
  mat: Mat,
  ls: number,
) {
  capsule(ctx, a, b, ra, rb);
  ctx.fillStyle = limbGradient(ctx, a, b, Math.max(ra, rb), mat, ls);
  ctx.fill();
}

/** erhabene Linie: Schatten, dunkler Kern, Lichtkante – der Pfad wird dreimal aufgebaut */
function raised(
  ctx: CanvasRenderingContext2D,
  build: () => void,
  width: number,
  light = 'rgba(255,190,190,0.35)',
) {
  ctx.save();
  ctx.translate(width * 0.8, width * 0.9);
  ctx.beginPath();
  build();
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = width * 1.8;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(-width * 0.45, -width * 0.5);
  ctx.beginPath();
  build();
  ctx.strokeStyle = light;
  ctx.lineWidth = width * 0.7;
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  build();
  ctx.strokeStyle = 'rgba(18,0,5,0.85)';
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Netz: Strahlen von (cx, cy) und durchhängende Ringe */
function webBuilder(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rays: number,
  step: number,
  maxR: number,
  rot0 = 0,
) {
  return () => {
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + rot0;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
    }
    for (let r = step; r < maxR; r += step) {
      for (let i = 0; i < rays; i++) {
        const a0 = (i / rays) * Math.PI * 2 + rot0;
        const a1 = ((i + 1) / rays) * Math.PI * 2 + rot0;
        const am = (a0 + a1) / 2;
        ctx.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
        ctx.quadraticCurveTo(
          cx + Math.cos(am) * r * 0.86,
          cy + Math.sin(am) * r * 0.86,
          cx + Math.cos(a1) * r,
          cy + Math.sin(a1) * r,
        );
      }
    }
  };
}

/* ---------- Texturen (einmal erzeugt, als Muster wiederverwendet) ---------- */

let patterns: Record<string, CanvasPattern | null> | null = null;
function texture(ctx: CanvasRenderingContext2D, name: 'heather' | 'hex' | 'twill' | 'mesh') {
  if (!patterns) {
    patterns = {};
    const make = (size: number, draw: (g: CanvasRenderingContext2D) => void) => {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const g = c.getContext('2d');
      if (g) draw(g);
      return c;
    };
    const rand = seeded(5);
    const heather = make(96, (g) => {
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.12)';
        g.fillRect(rand() * 96, rand() * 96, 1 + rand() * 2, 1);
      }
    });
    const hex = make(12, (g) => {
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(0, 3);
      g.lineTo(3, 0);
      g.lineTo(9, 0);
      g.lineTo(12, 3);
      g.moveTo(3, 12);
      g.lineTo(3, 6);
      g.moveTo(9, 6);
      g.lineTo(9, 12);
      g.moveTo(0, 9);
      g.lineTo(3, 6);
      g.lineTo(9, 6);
      g.lineTo(12, 9);
      g.stroke();
    });
    const twill = make(8, (g) => {
      g.strokeStyle = 'rgba(255,255,255,0.08)';
      g.beginPath();
      g.moveTo(0, 8);
      g.lineTo(8, 0);
      g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.12)';
      g.beginPath();
      g.moveTo(-4, 8);
      g.lineTo(4, 0);
      g.stroke();
    });
    const mesh = make(6, (g) => {
      g.strokeStyle = 'rgba(40,60,110,0.18)';
      g.lineWidth = 0.6;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(6, 6);
      g.moveTo(6, 0);
      g.lineTo(0, 6);
      g.stroke();
    });
    patterns.heather = ctx.createPattern(heather, 'repeat');
    patterns.hex = ctx.createPattern(hex, 'repeat');
    patterns.twill = ctx.createPattern(twill, 'repeat');
    patterns.mesh = ctx.createPattern(mesh, 'repeat');
  }
  return patterns[name];
}

function fillTexture(
  ctx: CanvasRenderingContext2D,
  name: 'heather' | 'hex' | 'twill' | 'mesh',
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 1,
) {
  const p = texture(ctx, name);
  if (!p) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = p;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Skelett                                                            */
/* ------------------------------------------------------------------ */

export interface BustRig {
  head: V;
  headAng: number;
  neckTop: V;
  shoulderL: V;
  shoulderR: V;
  elbowL: V;
  elbowR: V;
  wristL: V;
  wristR: V;
  chest: V;
}

export function buildBustRig(p: BustPose): BustRig {
  const neckTop = rot([0, -58], p.lean * 0.5 + p.headTilt * 0.25);
  const headAng = p.lean * 0.5 + p.headTilt;
  const head = add(neckTop, rot([0, -114 + p.headNod * 6], headAng));
  const sh = p.shrug * 30;
  // Schultern gehen mit, wenn die Arme gehoben werden
  const lift = (hy: number) => clamp((150 - hy) / 420, 0, 1);
  const liftL = lift(p.hl[1]);
  const liftR = lift(p.hr[1]);
  const shoulderL = rot([-220 + liftL * 6, 96 - sh - liftL * 14], p.lean);
  const shoulderR = rot([220 - liftR * 6, 96 - sh - liftR * 14], p.lean);
  const armL = ik(shoulderL, p.hl, ARM.upper, ARM.fore, [-1, 0.6]);
  const armR = ik(shoulderR, p.hr, ARM.upper, ARM.fore, [1, 0.6]);
  return {
    head,
    headAng,
    neckTop,
    shoulderL,
    shoulderR,
    elbowL: armL.mid,
    elbowR: armR.mid,
    wristL: armL.end,
    wristR: armR.end,
    chest: rot([0, 190], p.lean),
  };
}

export function bustToWorld(p: BustPose, local: V): V {
  const r = rot(local, p.rot);
  return [p.x + r[0] * p.s, p.y + r[1] * p.s];
}

/* ------------------------------------------------------------------ */
/*  Hauptfunktion                                                      */
/* ------------------------------------------------------------------ */

export function drawBust(ctx: CanvasRenderingContext2D, p: BustPose, suit: Suit, time: number) {
  const rig = buildBustRig(p);
  const ls = Math.cos(p.rot) >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(p.s, p.s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  drawNeck(ctx, p, rig, suit, ls);
  drawTorso(ctx, p, suit, ls, time);
  ctx.save();
  ctx.translate(rig.head[0], rig.head[1]);
  ctx.rotate(rig.headAng);
  if (suit === 'peter') drawPeterHead(ctx, p, ls, time);
  else drawMaskHead(ctx, p, suit, ls, time);
  ctx.restore();
  const handL = p.handL ?? HAND_SHAPES[p.shapeL];
  const handR = p.handR ?? HAND_SHAPES[p.shapeR];
  const torso = torsoShape(p);
  drawArm(
    ctx,
    rig.shoulderL,
    rig.elbowL,
    rig.wristL,
    -1,
    p.hlDir,
    p.hlW,
    handL,
    p.wristL ?? 0,
    suit,
    ls,
    time,
    torso,
  );
  drawArm(
    ctx,
    rig.shoulderR,
    rig.elbowR,
    rig.wristR,
    1,
    p.hrDir,
    p.hrW,
    handR,
    p.wristR ?? 0,
    suit,
    ls,
    time,
    torso,
  );
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Oberkörper                                                         */
/* ------------------------------------------------------------------ */

/** Breitenfaktor des Rumpfs (schlanke Statur) */
const TORSO_W = 0.8;

/** Rumpfkontur: Trapez, Schulter, Latissimus, schmale Taille */
function traceTorso(c: CanvasPath, shrug: number) {
  const sh = shrug * 28;
  c.moveTo(-60, -42);
  c.bezierCurveTo(-82, -6, -140, 20 - sh, -200, 38 - sh);
  c.bezierCurveTo(-264, 56 - sh, -304, 96 - sh, -310, 164 - sh);
  // Latissimus: unter den Achseln kräftig, dann schräg zur Taille
  c.bezierCurveTo(-314, 230, -268, 360, -200, 470);
  c.bezierCurveTo(-176, 520, -170, 580, -172, 640);
  c.lineTo(172, 640);
  c.bezierCurveTo(170, 580, 176, 520, 200, 470);
  c.bezierCurveTo(268, 360, 314, 230, 310, 164 - sh);
  c.bezierCurveTo(304, 96 - sh, 264, 56 - sh, 200, 38 - sh);
  c.bezierCurveTo(140, 20 - sh, 82, -6, 60, -42);
  c.quadraticCurveTo(0, 6, -60, -42);
  c.closePath();
}

function torsoPath(ctx: CanvasRenderingContext2D, shrug: number) {
  ctx.beginPath();
  traceTorso(ctx, shrug);
}

/** Rumpf im Körper-Koordinatensystem (gedreht und gestaucht wie beim Zeichnen) */
function torsoShape(p: BustPose): Path2D {
  const local = new Path2D();
  traceTorso(local, p.shrug);
  return rotated(local, p.lean, TORSO_W);
}

function bodyGradient(ctx: CanvasRenderingContext2D, mat: Mat, ls: number) {
  const g = ctx.createLinearGradient(-320 * ls, 0, 320 * ls, 0);
  g.addColorStop(0, mat.dark);
  g.addColorStop(0.12, mat.base);
  g.addColorStop(0.34, mat.light);
  g.addColorStop(0.6, mat.base);
  g.addColorStop(0.9, mat.dark);
  g.addColorStop(1, mat.rim);
  return g;
}

/** weicher Schatten- oder Lichtfleck */
function blob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  rotation = 0,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, color);
  g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTorso(
  ctx: CanvasRenderingContext2D,
  p: BustPose,
  suit: Suit,
  ls: number,
  time: number,
) {
  ctx.save();
  ctx.rotate(p.lean);
  // schlanke Statur: Rumpf schmaler als das Grundraster
  ctx.scale(TORSO_W, 1);
  if (suit === 'peter') drawPeterTorso(ctx, p, ls);
  else if (suit === 'spidey') drawSpideyTorso(ctx, p, ls);
  else drawBlackTorso(ctx, p, ls, time);
  ctx.restore();
}

function drawPeterTorso(ctx: CanvasRenderingContext2D, p: BustPose, ls: number) {
  const sh = p.shrug * 28;
  // T-Shirt
  torsoPath(ctx, p.shrug);
  ctx.fillStyle = bodyGradient(ctx, MAT.tee, ls);
  ctx.fill();
  ctx.save();
  torsoPath(ctx, p.shrug);
  ctx.clip();
  fillTexture(ctx, 'heather', -330, -60, 660, 700);
  // Atom-Druck mit leicht rissiger Farbe
  ctx.save();
  ctx.translate(0, 250);
  ctx.strokeStyle = 'rgba(235,240,255,0.82)';
  ctx.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 54, 20, (i * Math.PI) / 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(235,240,255,0.88)';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  const r = seeded(17);
  ctx.fillStyle = 'rgba(56,59,68,0.7)';
  for (let i = 0; i < 70; i++) ctx.fillRect((r() - 0.5) * 120, (r() - 0.5) * 50, 2, 1);
  ctx.fillStyle = 'rgba(235,240,255,0.75)';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SCIENCE CLUB', 0, 52);
  ctx.restore();
  // Rippbündchen am Kragen
  ctx.strokeStyle = '#2a2d34';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(-60, -40);
  ctx.quadraticCurveTo(0, 12, 60, -40);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.4;
  for (let i = -10; i <= 10; i++) {
    const t = (i + 10) / 20;
    const x = -60 + t * 120;
    const y = -40 + 2 * t * (1 - t) * 52;
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x, y + 7);
    ctx.stroke();
  }

  // offenes Flanellhemd
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sd * 340, 140 - sh);
    ctx.lineTo(sd * 330, 20 - sh);
    ctx.lineTo(sd * 66, -44);
    ctx.quadraticCurveTo(sd * 72, 20, sd * 82, 130);
    ctx.quadraticCurveTo(sd * 92, 380, sd * 100, 640);
    ctx.lineTo(sd * 340, 640);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = bodyGradient(ctx, MAT.flannel, ls);
    ctx.fillRect(-340, -60, 680, 720);
    flannelPlaid(ctx, -340, -60, 680, 720);
    // Falten von der Schulter Richtung Brust
    const r = seeded(sd > 0 ? 3 : 4);
    for (let i = 0; i < 5; i++) {
      const x0 = sd * (150 + r() * 120);
      const y0 = 60 + r() * 60;
      const x1 = sd * (100 + r() * 60);
      const y1 = 220 + r() * 200;
      ctx.strokeStyle = 'rgba(10,16,32,0.35)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 - sd * 40, (y0 + y1) / 2, x1, y1);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(190,210,255,0.12)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0 + sd * 6, y0 + 4);
      ctx.quadraticCurveTo(x0 - sd * 34, (y0 + y1) / 2 + 4, x1 + sd * 6, y1 + 4);
      ctx.stroke();
    }
    // Passe über der Schulter mit Naht
    ctx.strokeStyle = 'rgba(10,16,32,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sd * 90, 30);
    ctx.quadraticCurveTo(sd * 200, 64 - sh, sd * 320, 70 - sh);
    ctx.stroke();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(220,210,190,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sd * 90, 38);
    ctx.quadraticCurveTo(sd * 200, 72 - sh, sd * 320, 78 - sh);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Knopfleiste mit Steppnaht
    ctx.strokeStyle = 'rgba(8,12,26,0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sd * 66, -44);
    ctx.quadraticCurveTo(sd * 72, 20, sd * 82, 130);
    ctx.quadraticCurveTo(sd * 92, 380, sd * 100, 640);
    ctx.stroke();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(225,215,195,0.35)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(sd * 80, -20);
    ctx.quadraticCurveTo(sd * 86, 30, sd * 96, 130);
    ctx.quadraticCurveTo(sd * 106, 380, sd * 114, 640);
    ctx.stroke();
    ctx.setLineDash([]);
    if (sd > 0) {
      for (const y of [110, 260, 410]) button(ctx, sd * (84 + y * 0.03) + 14, y);
    } else {
      ctx.strokeStyle = 'rgba(6,10,22,0.8)';
      ctx.lineWidth = 3;
      for (const y of [110, 260, 410]) {
        ctx.beginPath();
        ctx.moveTo(sd * (100 + y * 0.03), y);
        ctx.lineTo(sd * (122 + y * 0.03), y);
        ctx.stroke();
      }
    }

    // Kragen, umgeschlagen, mit Schatten aufs Shirt
    blob(ctx, sd * 92, 40, 70, 40, 'rgba(0,0,0,0.35)');
    ctx.beginPath();
    ctx.moveTo(sd * 54, -58);
    ctx.quadraticCurveTo(sd * 110, -40, sd * 150, -10);
    ctx.lineTo(sd * 126, 92);
    ctx.quadraticCurveTo(sd * 100, 40, sd * 68, 6);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = bodyGradient(ctx, MAT.flannel, ls);
    ctx.fillRect(-200, -80, 400, 200);
    flannelPlaid(ctx, -200, -80, 400, 200);
    const cg = ctx.createLinearGradient(sd * 60, -40, sd * 140, 80);
    cg.addColorStop(0, 'rgba(0,0,0,0.3)');
    cg.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = cg;
    ctx.fillRect(-200, -80, 400, 200);
    ctx.restore();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Rucksackgurte
  for (const sd of [-1, 1]) {
    ctx.save();
    // Schatten des Gurts auf dem Hemd
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(sd * 140, 30 - sh);
    ctx.lineTo(sd * 200, 40 - sh);
    ctx.lineTo(sd * 214, 640);
    ctx.lineTo(sd * 160, 640);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sd * 128, 22 - sh);
    ctx.quadraticCurveTo(sd * 156, 14 - sh, sd * 182, 30 - sh);
    ctx.lineTo(sd * 196, 640);
    ctx.lineTo(sd * 150, 640);
    ctx.closePath();
    const g = ctx.createLinearGradient(sd * 128, 0, sd * 196, 0);
    g.addColorStop(0, '#16181f');
    g.addColorStop(0.45, '#333948');
    g.addColorStop(1, '#14161c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    fillTexture(ctx, 'twill', -300, 0, 600, 640, 1.4);
    // Polsterung
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    for (let y = 90; y < 640; y += 56) {
      ctx.beginPath();
      ctx.moveTo(sd * 134, y);
      ctx.quadraticCurveTo(sd * 165, y + 8, sd * 196, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(200,205,220,0.35)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(sd * 138, 30 - sh);
    ctx.lineTo(sd * 158, 640);
    ctx.moveTo(sd * 174, 36 - sh);
    ctx.lineTo(sd * 188, 640);
    ctx.stroke();
    ctx.setLineDash([]);
    // Kunststoff-Schnalle
    ctx.fillStyle = '#4b5060';
    ctx.beginPath();
    ctx.roundRect(sd * 175 - 30, 440, 60, 34, 7);
    ctx.fill();
    ctx.fillStyle = '#2a2d36';
    ctx.fillRect(sd * 175 - 20, 450, 40, 6);
    ctx.fillRect(sd * 175 - 20, 460, 40, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(sd * 175 - 28, 441, 56, 2);
    ctx.restore();
  }
  // Anstecker auf dem linken Gurt
  ctx.save();
  ctx.translate(-168, 230);
  const pg = ctx.createRadialGradient(-5, -6, 2, 0, 0, 22);
  pg.addColorStop(0, '#fff2b5');
  pg.addColorStop(0.5, '#d6b35c');
  pg.addColorStop(1, '#7a5a1c');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d3f9a';
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f4f0e6';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 4.5, (i * Math.PI) / 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(-7, -9, 6, 3, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  torsoPath(ctx, p.shrug);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function flannelPlaid(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const step = 46;
  ctx.fillStyle = 'rgba(14,22,44,0.4)';
  for (let px = x; px < x + w; px += step) ctx.fillRect(px, y, 18, h);
  for (let py = y; py < y + h; py += step) ctx.fillRect(x, py, w, 18);
  ctx.fillStyle = 'rgba(120,190,200,0.12)';
  for (let px = x + 24; px < x + w; px += step) ctx.fillRect(px, y, 7, h);
  for (let py = y + 24; py < y + h; py += step) ctx.fillRect(x, py, w, 7);
  ctx.fillStyle = 'rgba(200,70,60,0.6)';
  for (let px = x + 36; px < x + w; px += step) ctx.fillRect(px, y, 2.4, h);
  for (let py = y + 36; py < y + h; py += step) ctx.fillRect(x, py, w, 2.4);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let px = x + 41; px < x + w; px += step) ctx.fillRect(px, y, 1, h);
  for (let py = y + 41; py < y + h; py += step) ctx.fillRect(x, py, w, 1);
  fillTexture(ctx, 'twill', x, y, w, h);
}

function button(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(x + 1.5, y + 2, 9, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 9);
  g.addColorStop(0, '#f5efe2');
  g.addColorStop(1, '#a9a191');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6e675a';
  for (const [dx, dy] of [
    [-2.4, -2.4],
    [2.4, -2.4],
    [-2.4, 2.4],
    [2.4, 2.4],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function muscleShading(ctx: CanvasRenderingContext2D, dark: string, light: string, sh: number) {
  // Trapez, Schulter, Brust, Brustbein
  blob(ctx, -170, 50 - sh, 90, 30, light, 0.25);
  blob(ctx, 170, 50 - sh, 90, 30, light.replace(/[\d.]+\)$/, '0.6)'), -0.25);
  blob(ctx, -280, 170 - sh, 60, 80, light);
  blob(ctx, 285, 175 - sh, 50, 75, light.replace(/[\d.]+\)$/, '0.5)'));
  for (const sd of [-1, 1]) {
    blob(ctx, sd * 120, 150, 110, 70, light.replace(/[\d.]+\)$/, sd < 0 ? '0.9)' : '0.45)'));
    // untere Brustkante
    ctx.strokeStyle = dark;
    for (const [w, a] of [
      [16, 0.25],
      [8, 0.45],
    ] as const) {
      ctx.globalAlpha = a;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(sd * 18, 150);
      ctx.quadraticCurveTo(sd * 60, 250, sd * 210, 216);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = dark;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 60);
  ctx.lineTo(0, 620);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const lite = (a: number) => light.replace(/[\d.]+\)$/, `${a})`);
  for (const sd of [-1, 1]) {
    const k = sd < 0 ? 1 : 0.55;
    // Sixpack: drei Reihen, weiche Buckel mit Schattenfugen
    for (let row = 0; row < 3; row++) {
      const y = 300 + row * 92;
      const w = 54 - row * 4;
      blob(ctx, sd * 50, y, w, 34, lite(0.7 * k));
      ctx.strokeStyle = dark;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(sd * 8, y + 46);
      ctx.quadraticCurveTo(sd * 50, y + 54, sd * (96 - row * 6), y + 40);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // schräge Bauchmuskeln und Sägemuskel an den Flanken
    ctx.strokeStyle = dark;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(sd * 112, 270);
    ctx.bezierCurveTo(sd * 120, 380, sd * 110, 480, sd * 82, 600);
    ctx.stroke();
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(sd * (196 - i * 8), 250 + i * 40);
      ctx.quadraticCurveTo(sd * (164 - i * 6), 262 + i * 40, sd * (140 - i * 4), 252 + i * 42);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    blob(ctx, sd * 160, 380, 40, 90, lite(0.5 * k));
  }
}

function drawSpideyTorso(ctx: CanvasRenderingContext2D, p: BustPose, ls: number) {
  const sh = p.shrug * 28;
  torsoPath(ctx, p.shrug);
  ctx.fillStyle = bodyGradient(ctx, MAT.red, ls);
  ctx.fill();
  ctx.save();
  torsoPath(ctx, p.shrug);
  ctx.clip();
  muscleShading(ctx, 'rgba(60,0,10,1)', 'rgba(255,120,120,0.28)', sh);
  fillTexture(ctx, 'hex', -330, -60, 660, 700, 0.55);
  raised(ctx, webBuilder(ctx, 0, 190, 22, 48, 700, 0.07), 2.2);
  // blaue Seitenteile unter den Armen
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 340, 230);
    ctx.quadraticCurveTo(sd * 248, 240, sd * 206, 380);
    ctx.quadraticCurveTo(sd * 150, 500, sd * 140, 640);
    ctx.lineTo(sd * 340, 640);
    ctx.closePath();
    ctx.fillStyle = bodyGradient(ctx, MAT.blue, ls);
    ctx.fill();
    ctx.save();
    ctx.clip();
    fillTexture(ctx, 'hex', -340, 200, 680, 460, 0.5);
    ctx.restore();
    ctx.strokeStyle = 'rgba(5,5,20,0.75)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
  spiderEmblem(ctx, 0, 182, 1.25, '#0b0b0e', false);
  torsoPath(ctx, p.shrug);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawBlackTorso(ctx: CanvasRenderingContext2D, p: BustPose, ls: number, time: number) {
  const sh = p.shrug * 28;
  torsoPath(ctx, p.shrug);
  ctx.fillStyle = bodyGradient(ctx, MAT.black, ls);
  ctx.fill();
  ctx.save();
  torsoPath(ctx, p.shrug);
  ctx.clip();
  muscleShading(ctx, 'rgba(0,0,0,1)', 'rgba(120,150,230,0.2)', sh);
  // scharfe Glanzlichter wie auf Lack
  for (const sd of [-1, 1]) {
    ctx.strokeStyle = sd * ls < 0 ? 'rgba(200,220,255,0.5)' : 'rgba(160,180,255,0.22)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(sd * 90, 6 - sh * 0.5);
    ctx.quadraticCurveTo(sd * 180, 30 - sh, sd * 262, 80 - sh);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sd * 60, 120);
    ctx.quadraticCurveTo(sd * 130, 100, sd * 200, 130);
    ctx.stroke();
  }
  // lebendige Adern
  const r = seeded(9);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 9; i++) {
    const x0 = (r() - 0.5) * 520;
    const y0 = 80 + r() * 500;
    ctx.strokeStyle = `rgba(120,140,220,${0.08 + 0.06 * Math.sin(time * 2 + i)})`;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let j = 1; j < 6; j++) {
      ctx.lineTo(
        x0 + Math.sin(j * 1.7 + i + time * 0.6) * 24 + j * 14 * (i % 2 ? 1 : -1),
        y0 + j * 26,
      );
    }
    ctx.stroke();
  }
  // wandernder Glanz
  const sx = ((time * 90) % 900) - 450;
  const g = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
  g.addColorStop(0, 'rgba(160,180,255,0)');
  g.addColorStop(0.5, 'rgba(160,180,255,0.07)');
  g.addColorStop(1, 'rgba(160,180,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-340, -60, 680, 720);
  bigSpider(ctx, sh);
  ctx.restore();
  torsoPath(ctx, p.shrug);
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

/** schwarze Spinne des klassischen Anzugs, mit Gelenken und Lichtkante */
function spiderEmblem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  color: string,
  glossy: boolean,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const legs: [V, V, V][] = [
    [
      [6, -8],
      [26, -30],
      [30, -58],
    ],
    [
      [8, -4],
      [38, -16],
      [46, -40],
    ],
    [
      [8, 4],
      [40, 14],
      [46, 40],
    ],
    [
      [6, 10],
      [26, 34],
      [28, 62],
    ],
  ];
  for (const sd of [-1, 1]) {
    for (const [a, b, c] of legs) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(sd * a[0], a[1]);
      ctx.lineTo(sd * b[0], b[1]);
      ctx.lineTo(sd * c[0], c[1]);
      ctx.stroke();
      ctx.strokeStyle = glossy ? 'rgba(255,255,255,0.5)' : 'rgba(255,140,140,0.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sd * a[0] - 1, a[1] - 1.5);
      ctx.lineTo(sd * b[0] - 1, b[1] - 1.5);
      ctx.stroke();
    }
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 32, 10, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -24, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,140,140,0.25)';
  ctx.beginPath();
  ctx.ellipse(-4, -4, 4, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(-3, 26, 3, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** großes weißes Symbionten-Emblem, Beine laufen über die Schultern */
function bigSpider(ctx: CanvasRenderingContext2D, sh: number) {
  const white = (w: number, build: () => void) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = w + 4;
    ctx.beginPath();
    build();
    ctx.stroke();
    ctx.strokeStyle = '#eef1f8';
    ctx.lineWidth = w;
    ctx.beginPath();
    build();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = w * 0.3;
    ctx.beginPath();
    build();
    ctx.stroke();
  };
  const cy = 170;
  for (const sd of [-1, 1]) {
    white(26, () => {
      ctx.moveTo(sd * 14, cy - 30);
      ctx.quadraticCurveTo(sd * 50, cy - 120, sd * 80, -20 - sh);
    });
    white(24, () => {
      ctx.moveTo(sd * 18, cy - 14);
      ctx.quadraticCurveTo(sd * 140, cy - 70, sd * 230, 30 - sh);
    });
    white(22, () => {
      ctx.moveTo(sd * 18, cy + 12);
      ctx.quadraticCurveTo(sd * 150, cy + 30, sd * 210, cy + 190);
    });
    white(20, () => {
      ctx.moveTo(sd * 14, cy + 30);
      ctx.quadraticCurveTo(sd * 80, cy + 120, sd * 90, cy + 300);
    });
  }
  const g = ctx.createLinearGradient(-30, cy - 60, 30, cy + 100);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#c9cfdc');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  for (const [ex, ey, rx, ry] of [
    [0, cy - 4, 30, 42],
    [0, cy + 66, 24, 48],
    [0, cy - 58, 16, 17],
  ]) {
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/* ------------------------------------------------------------------ */
/*  Hals                                                               */
/* ------------------------------------------------------------------ */

function drawNeck(
  ctx: CanvasRenderingContext2D,
  p: BustPose,
  rig: BustRig,
  suit: Suit,
  ls: number,
) {
  const mat = suit === 'peter' ? MAT.skin : suit === 'spidey' ? MAT.red : MAT.black;
  const top = add(rig.neckTop, rot([0, -30], rig.headAng));
  const bottom: V = rot([0, 10], p.lean);
  limb(ctx, bottom, top, 62, 58, mat, ls);
  ctx.save();
  capsule(ctx, bottom, top, 62, 58);
  ctx.clip();
  if (suit === 'peter') {
    // Kopfschatten unter dem Kinn, Kehlkopf, Halsmuskeln
    blob(ctx, rig.head[0], rig.head[1] + 118, 70, 34, 'rgba(90,40,25,0.55)');
    ctx.strokeStyle = 'rgba(140,80,55,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-34, -66);
    ctx.quadraticCurveTo(-26, -30, -10, 0);
    ctx.moveTo(34, -66);
    ctx.quadraticCurveTo(26, -30, 10, 0);
    ctx.stroke();
    // Adamsapfel: Licht oben, Schatten darunter
    blob(ctx, 2, -40, 11, 13, 'rgba(255,222,195,0.45)');
    blob(ctx, 3, -24, 12, 6, 'rgba(120,58,38,0.3)');
  } else if (suit === 'spidey') {
    blob(ctx, rig.head[0], rig.head[1] + 118, 70, 34, 'rgba(50,0,8,0.6)');
    raised(
      ctx,
      () => {
        for (const x of [-34, -12, 12, 34]) {
          ctx.moveTo(x, -120);
          ctx.lineTo(x * 1.1, 20);
        }
        for (let y = -100; y < 20; y += 26) {
          ctx.moveTo(-56, y);
          ctx.quadraticCurveTo(0, y + 8, 56, y);
        }
      },
      2,
    );
  } else {
    blob(ctx, rig.head[0], rig.head[1] + 118, 70, 34, 'rgba(0,0,0,0.7)');
    ctx.strokeStyle = 'rgba(170,190,255,0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-30 * ls, -70);
    ctx.quadraticCurveTo(-40 * ls, -30, -36 * ls, 0);
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Peters Kopf                                                        */
/* ------------------------------------------------------------------ */

function headPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(0, -130);
  ctx.bezierCurveTo(72, -130, 104, -88, 104, -24);
  ctx.bezierCurveTo(104, 22, 98, 56, 78, 84);
  ctx.bezierCurveTo(60, 108, 30, 124, 0, 125);
  ctx.bezierCurveTo(-30, 124, -60, 108, -78, 84);
  ctx.bezierCurveTo(-98, 56, -104, 22, -104, -24);
  ctx.bezierCurveTo(-104, -88, -72, -130, 0, -130);
  ctx.closePath();
}

/** Peters Gesicht: breite Wangenknochen, klarer Kieferwinkel, weich spitzes Kinn */
function facePath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(0, -130);
  ctx.bezierCurveTo(72, -130, 103, -88, 103, -26);
  ctx.bezierCurveTo(103, 10, 102, 46, 97, 72);
  ctx.bezierCurveTo(92, 96, 66, 114, 36, 121);
  ctx.quadraticCurveTo(0, 129, -36, 121);
  ctx.bezierCurveTo(-66, 114, -92, 96, -97, 72);
  ctx.bezierCurveTo(-102, 46, -103, 10, -103, -26);
  ctx.bezierCurveTo(-103, -88, -72, -130, 0, -130);
  ctx.closePath();
}

function drawPeterHead(ctx: CanvasRenderingContext2D, p: BustPose, ls: number, time: number) {
  const fx = p.headTurn * 16;
  const ny = p.headNod * 8;

  // Haare hinten
  ctx.fillStyle = '#24150b';
  ctx.beginPath();
  ctx.ellipse(0, -40, 110, 96, 0, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();

  // Ohren (das abgewandte verschwindet etwas)
  for (const sd of [-1, 1]) {
    const vis = 1 - Math.max(0, p.headTurn * sd) * 0.6;
    ctx.save();
    ctx.translate(sd * (97 - p.headTurn * sd * 6), 6);
    ctx.scale(sd * vis * 0.78, 0.86);
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.bezierCurveTo(22, -40, 32, -8, 26, 18);
    ctx.bezierCurveTo(22, 40, 8, 48, 0, 40);
    ctx.closePath();
    const eg = ctx.createLinearGradient(0, -30, 30, 30);
    eg.addColorStop(0, MAT.skin.light);
    eg.addColorStop(1, MAT.skin.dark);
    ctx.fillStyle = eg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,60,40,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, -20);
    ctx.bezierCurveTo(20, -24, 22, 4, 16, 18);
    ctx.quadraticCurveTo(10, 28, 6, 22);
    ctx.stroke();
    blob(ctx, 10, 6, 8, 12, 'rgba(150,70,50,0.5)');
    ctx.restore();
  }

  // Gesicht
  facePath(ctx);
  const g = ctx.createRadialGradient(-34 * ls, -40, 10, -10 * ls, 0, 150);
  g.addColorStop(0, MAT.skin.light);
  g.addColorStop(0.55, MAT.skin.base);
  g.addColorStop(1, MAT.skin.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  facePath(ctx);
  ctx.clip();
  // Formschatten: Schläfen, Wangen, Kiefer
  const sg = ctx.createLinearGradient(20 * ls, 0, 110 * ls, 0);
  sg.addColorStop(0, 'rgba(120,60,40,0)');
  sg.addColorStop(1, 'rgba(120,60,40,0.32)');
  ctx.fillStyle = sg;
  ctx.fillRect(-120, -140, 240, 280);
  blob(ctx, 0, 132, 110, 40, 'rgba(110,55,35,0.35)');
  // dezente Wangenfarbe, hoch auf den Wangenknochen
  blob(ctx, -58 + fx, 30, 30, 16, 'rgba(215,120,100,0.05)');
  blob(ctx, 58 + fx, 30, 30, 16, 'rgba(215,120,100,0.04)');
  // Bartschatten: Oberlippe, Kinn, Kieferlinie – kaum sichtbar, aber männlicher
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  blob(ctx, fx, 104, 62, 30, 'rgba(150,135,140,0.32)');
  blob(ctx, fx * 1.1, 62 + ny, 30, 9, 'rgba(160,140,145,0.26)');
  for (const sd of [-1, 1]) blob(ctx, sd * 80, 84, 26, 40, 'rgba(160,140,145,0.22)', sd * 0.5);
  ctx.restore();
  // Brauenbogen: Schatten unter der Stirn, über den Augen
  for (const sd of [-1, 1]) blob(ctx, sd * 42 + fx, -24 + ny, 40, 12, 'rgba(110,52,34,0.18)');
  // Schläfen
  blob(ctx, -82, -58, 26, 46, 'rgba(120,60,40,0.12)');
  blob(ctx, 82, -58, 26, 46, 'rgba(120,60,40,0.16)');
  for (const sd of [-1, 1]) {
    const k = sd === ls ? 1.25 : 0.8;
    // Mulde unter dem Wangenknochen
    blob(ctx, sd * 74 + fx * 0.6, 58 + ny, 22, 40, `rgba(120,58,38,${0.18 * k})`, sd * 0.45);
    // Licht auf dem Wangenknochen
    blob(ctx, sd * 62 + fx, 16 + ny, 26, 12, `rgba(255,228,205,${0.2 / k})`, -sd * 0.25);
    // Nasolabialfalte, nur angedeutet
    blob(ctx, fx * 1.25 + sd * 30, 56 + ny, 7, 14, `rgba(135,68,46,${0.1 * k})`, -sd * 0.4);
  }
  // Stirnlicht, Kinnlicht, Schatten unter der Unterlippe
  blob(ctx, -22 * ls + fx * 0.5, -78, 44, 22, 'rgba(255,236,215,0.22)');
  blob(ctx, fx, 110 + ny, 24, 10, 'rgba(255,228,205,0.3)');
  blob(ctx, fx * 1.1, 97 + ny, 18, 6, 'rgba(110,52,34,0.22)');
  ctx.restore();

  // Augen
  for (const sd of [-1, 1]) eye(ctx, sd * 41 + fx, -5 + ny, sd, p);
  // Augenbrauen aus einzelnen Härchen
  for (const sd of [-1, 1]) brow(ctx, sd, fx, ny, p);
  nose(ctx, fx * 1.35, ny, ls);
  mouth(ctx, fx * 1.15, 76 + ny, p);
  glasses(ctx, fx, ny, p);
  hair(ctx, p, time);
}

function eye(ctx: CanvasRenderingContext2D, cx: number, cy: number, sd: number, p: BustPose) {
  const w = 27 * (1 - Math.max(0, p.headTurn * sd) * 0.18);
  const open = clamp(1 - p.squint * 0.35 + Math.min(0, -p.squint) * 0.0, 0.5, 1.3);
  const h = 10.4 * open;
  const almond = () => {
    ctx.beginPath();
    ctx.moveTo(cx - w * sd, cy + 2);
    ctx.quadraticCurveTo(cx - w * 0.1 * sd, cy - h * 1.55, cx + w * sd, cy - 3);
    ctx.quadraticCurveTo(cx + w * 0.1 * sd, cy + h * 1.15, cx - w * sd, cy + 2);
    ctx.closePath();
  };
  // Lidschatten-Mulde
  blob(ctx, cx, cy - 6, w * 1.3, h * 1.6, 'rgba(140,70,50,0.18)');
  almond();
  ctx.fillStyle = '#f5f0e8';
  ctx.fill();
  ctx.save();
  almond();
  ctx.clip();
  const ix = cx + p.lookX * 9;
  const iy = cy + p.lookY * 4 - 1;
  const ig = ctx.createRadialGradient(ix, iy, 2, ix, iy, 12.5);
  ig.addColorStop(0, '#b9d4ea');
  ig.addColorStop(0.35, '#6f9cc4');
  ig.addColorStop(0.8, '#3c6489');
  ig.addColorStop(1, '#16283c');
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.arc(ix, iy, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    ctx.strokeStyle = i % 2 ? 'rgba(225,240,255,0.3)' : 'rgba(10,25,45,0.3)';
    ctx.beginPath();
    ctx.moveTo(ix + Math.cos(a) * 5.5, iy + Math.sin(a) * 5.5);
    ctx.lineTo(ix + Math.cos(a) * 11.5, iy + Math.sin(a) * 11.5);
    ctx.stroke();
  }
  ctx.fillStyle = '#0c0704';
  ctx.beginPath();
  ctx.arc(ix, iy, 5.4, 0, Math.PI * 2);
  ctx.fill();
  // Schatten des Oberlids, Lichtreflexe von Fenster und Lampe
  const lg = ctx.createLinearGradient(0, cy - h * 1.4, 0, cy + 3);
  lg.addColorStop(0, 'rgba(80,40,25,0.6)');
  lg.addColorStop(0.55, 'rgba(80,40,25,0.25)');
  lg.addColorStop(1, 'rgba(80,40,25,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(cx - 40, cy - 30, 80, 32);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.roundRect(ix + 3, iy - 7, 4.5, 5.5, 1.5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,170,0.8)';
  ctx.beginPath();
  ctx.arc(ix - 5, iy + 4, 1.7, 0, Math.PI * 2);
  ctx.fill();
  // Blinzeln: Lid schiebt sich von oben herunter
  if (p.blink > 0.02) {
    ctx.fillStyle = MAT.skin.base;
    ctx.fillRect(cx - 40, cy - 30, 80, (h * 2.8 + 6) * p.blink);
  }
  ctx.restore();
  // Lidlinie mit Wimpern
  const lidY = (t: number) => {
    const u = 1 - t;
    return u * u * (cy + 2) + 2 * u * t * (cy - h * 1.55) + t * t * (cy - 3);
  };
  const lidX = (t: number) => {
    const u = 1 - t;
    return u * u * (cx - w * sd) + 2 * u * t * (cx - w * 0.1 * sd) + t * t * (cx + w * sd);
  };
  const shift = p.blink * (h * 2.6);
  ctx.strokeStyle = 'rgba(52,28,16,0.85)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const y = Math.min(lidY(t) + shift, cy + h);
    if (i) ctx.lineTo(lidX(t), y);
    else ctx.moveTo(lidX(t), y);
  }
  ctx.stroke();
  // Lidfalte und Unterlid
  ctx.strokeStyle = 'rgba(120,65,45,0.5)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.85 * sd, cy - h * 0.9);
  ctx.quadraticCurveTo(cx, cy - h * 1.75 - 3, cx + w * 1.05 * sd, cy - h * 0.55);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(170,100,80,0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.85 * sd, cy + 3);
  ctx.quadraticCurveTo(cx, cy + h * 1.15 + 2, cx + w * 0.9 * sd, cy);
  ctx.stroke();
}

function brow(ctx: CanvasRenderingContext2D, sd: number, fx: number, ny: number, p: BustPose) {
  const raise = (p.brow + p.browAsym * sd) * 11;
  const N = 14;
  const top: V[] = [];
  const bot: V[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = fx + sd * (12 + t * 58);
    // gerade, leichter Bogen im äußeren Drittel, innen etwas angehoben
    const y =
      -38 +
      ny -
      raise -
      Math.sin(Math.min(1, t / 0.75) * Math.PI * 0.5) * 2.5 +
      t * t * 5 -
      (1 - t) * 1;
    const th = 9 * (1 - t) ** 0.6 + 3;
    top.push([x, y - th * 0.55]);
    bot.push([x, y + th * 0.45]);
  }
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(bot[0][0], bot[0][1]);
    ctx.quadraticCurveTo(bot[0][0] - sd * 3, (bot[0][1] + top[0][1]) / 2, top[0][0], top[0][1]);
    for (const [x, y] of top) ctx.lineTo(x, y);
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath();
  };
  // weicher Grund, damit die Braue nicht aufgeklebt wirkt
  ctx.save();
  ctx.filter = 'blur(1.2px)';
  shape();
  ctx.fillStyle = 'rgba(52,32,18,0.55)';
  ctx.fill();
  ctx.restore();
  shape();
  const g = ctx.createLinearGradient(fx + sd * 12, 0, fx + sd * 70, 0);
  g.addColorStop(0, 'rgba(44,26,14,0.7)');
  g.addColorStop(0.3, 'rgba(38,22,12,0.92)');
  g.addColorStop(1, 'rgba(38,22,12,0.6)');
  ctx.fillStyle = g;
  ctx.fill();
  // Härchen: innen aufwärts, außen in Wuchsrichtung schräg
  const r = seeded(sd > 0 ? 71 : 72);
  ctx.save();
  shape();
  ctx.clip();
  ctx.strokeStyle = 'rgba(30,16,8,0.6)';
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 40; i++) {
    const t = r();
    const k = Math.min(N, Math.floor(t * N));
    const [x, yb] = bot[k];
    const y = yb - r() * (yb - top[k][1]);
    const ang = -1.2 + t * 0.95;
    const len = 5 + r() * 4;
    ctx.beginPath();
    ctx.moveTo(x, y + 2);
    ctx.lineTo(x + sd * Math.cos(ang) * len, y + 2 + Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.restore();
}

function nose(ctx: CanvasRenderingContext2D, nx: number, ny: number, ls: number) {
  // Schattenseite des Nasenrückens und Licht auf dem Grat
  ctx.strokeStyle = 'rgba(140,75,50,0.2)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(nx + 12 * ls, -24 + ny);
  ctx.quadraticCurveTo(nx + 15 * ls, 8 + ny, nx + 14 * ls, 30 + ny);
  ctx.stroke();
  blob(ctx, nx - 4 * ls, 2 + ny, 5, 24, 'rgba(255,232,210,0.42)');
  // runde Spitze mit Glanz, Schatten darunter
  blob(ctx, nx, 33 + ny, 18, 12, 'rgba(255,218,190,0.5)');
  blob(ctx, nx - 3 * ls, 30 + ny, 4, 3, 'rgba(255,245,235,0.6)');
  blob(ctx, nx + 2 * ls, 49 + ny, 18, 5, 'rgba(110,50,32,0.3)');
  // Nasenflügel
  ctx.lineWidth = 2.2;
  for (const sd of [-1, 1]) {
    ctx.strokeStyle = sd === ls ? 'rgba(125,60,40,0.3)' : 'rgba(125,60,40,0.2)';
    ctx.beginPath();
    ctx.moveTo(nx + sd * 10, 27 + ny);
    ctx.bezierCurveTo(nx + sd * 24, 30 + ny, nx + sd * 24, 43 + ny, nx + sd * 13, 46 + ny);
    ctx.stroke();
    blob(ctx, nx + sd * 17, 37 + ny, 7, 8, 'rgba(150,75,52,0.22)');
    // Nasenloch: schmal, von unten kaum sichtbar
    ctx.fillStyle = 'rgba(95,40,28,0.26)';
    ctx.beginPath();
    ctx.ellipse(nx + sd * 8, 46 + ny, 4.4, 1.8, sd * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Steg zwischen den Nasenlöchern
  ctx.strokeStyle = 'rgba(130,62,42,0.3)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(nx - 3, 44 + ny);
  ctx.quadraticCurveTo(nx, 47 + ny, nx + 3, 44 + ny);
  ctx.stroke();
  // Philtrum
  blob(ctx, nx, 60 + ny, 6, 9, 'rgba(255,225,200,0.25)');
  ctx.strokeStyle = 'rgba(150,85,60,0.09)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(nx - 5, 53 + ny);
  ctx.lineTo(nx - 6, 66 + ny);
  ctx.moveTo(nx + 5, 53 + ny);
  ctx.lineTo(nx + 6, 66 + ny);
  ctx.stroke();
}

function mouth(ctx: CanvasRenderingContext2D, mx: number, my: number, p: BustPose) {
  const w = 31 + p.smile * 6 - p.mouth * 5;
  const open = p.mouth * 26;
  const corner = p.smile * 7;
  ctx.save();
  ctx.translate(mx, my);
  if (open > 2.5) {
    // Mundraum mit Zähnen und Zunge
    ctx.beginPath();
    ctx.moveTo(-w, -corner * 0.4);
    ctx.quadraticCurveTo(0, -8, w, -corner * 0.4);
    ctx.quadraticCurveTo(w * 0.7, open + 4, 0, open + 6);
    ctx.quadraticCurveTo(-w * 0.7, open + 4, -w, -corner * 0.4);
    ctx.closePath();
    ctx.fillStyle = '#3a110e';
    ctx.fill();
    ctx.save();
    ctx.clip();
    const tg = ctx.createLinearGradient(0, -8, 0, 6);
    tg.addColorStop(0, '#fbf7ef');
    tg.addColorStop(1, '#d9d2c4');
    ctx.fillStyle = tg;
    ctx.fillRect(-w, -10, w * 2, Math.min(12, open * 0.45 + 4));
    ctx.strokeStyle = 'rgba(150,140,120,0.5)';
    ctx.lineWidth = 1;
    for (const x of [-12, -4, 4, 12]) {
      ctx.beginPath();
      ctx.moveTo(x, -8);
      ctx.lineTo(x, 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#c4585a';
    ctx.beginPath();
    ctx.ellipse(0, open + 2, w * 0.6, open * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Lippen um den offenen Mund
    ctx.strokeStyle = '#b8645a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-w, -corner * 0.4);
    ctx.quadraticCurveTo(-w * 0.4, -12, 0, -9);
    ctx.quadraticCurveTo(w * 0.4, -12, w, -corner * 0.4);
    ctx.stroke();
    ctx.strokeStyle = '#c87567';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-w * 0.85, open * 0.3);
    ctx.quadraticCurveTo(0, open + 12, w * 0.85, open * 0.3);
    ctx.stroke();
  } else {
    // geschlossen: schmale Oberlippe mit Amorbogen, volle Unterlippe, leicht schiefes Lächeln
    const cl = -corner * 0.6;
    const cr = -corner * 1.3;
    const ug = ctx.createLinearGradient(0, -10, 0, 0);
    ug.addColorStop(0, '#c08a78');
    ug.addColorStop(1, '#a8705f');
    ctx.fillStyle = ug;
    ctx.beginPath();
    ctx.moveTo(-w, cl);
    ctx.bezierCurveTo(-w * 0.6, -3, -w * 0.3, -6.5, -5, -6.5);
    ctx.quadraticCurveTo(0, -4.5, 5, -6.5);
    ctx.bezierCurveTo(w * 0.3, -6.5, w * 0.6, -3, w, cr);
    ctx.quadraticCurveTo(w * 0.4, 1, 0, 1);
    ctx.quadraticCurveTo(-w * 0.4, 1, -w, cl);
    ctx.fill();
    const lg = ctx.createLinearGradient(0, 0, 0, 15);
    lg.addColorStop(0, '#b87e6c');
    lg.addColorStop(0.5, '#cf9d88');
    lg.addColorStop(1, '#c8957f');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(-w * 0.86, cl + 1);
    ctx.quadraticCurveTo(-w * 0.4, 2, 0, 2);
    ctx.quadraticCurveTo(w * 0.4, 2, w * 0.86, cr + 1);
    ctx.bezierCurveTo(w * 0.6, 9, w * 0.25, 11, 0, 11);
    ctx.bezierCurveTo(-w * 0.25, 11, -w * 0.6, 9, -w * 0.86, cl + 1);
    ctx.fill();
    blob(ctx, -3, 6, 8, 2.5, 'rgba(255,232,222,0.25)');
    // Mundspalte, zu den Winkeln hin weicher
    ctx.strokeStyle = 'rgba(105,52,38,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.8, cl + 0.6);
    ctx.quadraticCurveTo(-w * 0.35, 1.6, 0, 1.4);
    ctx.quadraticCurveTo(w * 0.35, 1.6, w * 0.8, cr + 0.6);
    ctx.stroke();
    blob(ctx, -w - 1, cl, 6, 4, 'rgba(110,48,34,0.18)');
    blob(ctx, w + 1, cr, 6, 4, 'rgba(110,48,34,0.18)');
    if (p.smile > 0.3) {
      ctx.strokeStyle = `rgba(130,65,45,${0.3 * p.smile})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w + 5, cr + 2, 6, Math.PI - 0.9, Math.PI + 0.6, false);
      ctx.stroke();
    }
  }
  // Kinnfalte
  ctx.strokeStyle = 'rgba(130,65,45,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, open + 26);
  ctx.quadraticCurveTo(0, open + 22, 12, open + 26);
  ctx.stroke();
  ctx.restore();
}

function glasses(ctx: CanvasRenderingContext2D, fx: number, ny: number, p: BustPose) {
  const lens = (sd: number) => {
    const w = 34 * (1 - Math.max(0, p.headTurn * sd) * 0.15);
    ctx.beginPath();
    ctx.roundRect(sd * 41 + fx - w, -28 + ny, w * 2, 46, 21);
  };
  for (const sd of [-1, 1]) {
    // Glas: leichte Tönung, Spiegelung des Fensters, Randschatten
    ctx.save();
    lens(sd);
    ctx.clip();
    ctx.fillStyle = 'rgba(200,220,255,0.06)';
    ctx.fillRect(-200, -100, 400, 200);
    ctx.fillStyle = 'rgba(225,238,255,0.24)';
    const ox = sd * 41 + fx + 8;
    ctx.beginPath();
    ctx.moveTo(ox, -30 + ny);
    ctx.lineTo(ox + 16, -30 + ny);
    ctx.lineTo(ox + 2, 22 + ny);
    ctx.lineTo(ox - 14, 22 + ny);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ox + 22, -30 + ny);
    ctx.lineTo(ox + 28, -30 + ny);
    ctx.lineTo(ox + 14, 22 + ny);
    ctx.lineTo(ox + 8, 22 + ny);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 5;
    lens(sd);
    ctx.stroke();
    ctx.restore();
    // Fassung mit Glanzkante
    ctx.strokeStyle = '#2b1c14';
    ctx.lineWidth = 4.2;
    lens(sd);
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.rect(-200, -60 + ny, 400, 40);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.6;
    ctx.translate(0, -2);
    lens(sd);
    ctx.stroke();
    ctx.restore();
    // Bügel zum Ohr
    ctx.strokeStyle = '#2b1c14';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(sd * 75 + fx, -16 + ny);
    ctx.lineTo(sd * (102 - p.headTurn * sd * 6), -12);
    ctx.stroke();
    // Nasenpads
    ctx.fillStyle = 'rgba(230,235,245,0.4)';
    ctx.beginPath();
    ctx.ellipse(fx * 1.3 + sd * 10, 6 + ny, 3.5, 6, sd * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#2b1c14';
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(fx - 6, -14 + ny);
  ctx.quadraticCurveTo(fx * 1.3, -24 + ny, fx + 6, -14 + ny);
  ctx.stroke();
}

interface Lock {
  root: V;
  tip: V;
  ctrl: V;
  w: number;
  shade: number;
}

let locks: Lock[] | null = null;
function hairLocks(): Lock[] {
  if (locks) return locks;
  const r = seeded(123);
  const out: Lock[] = [];
  // hintere Lagen über den Oberkopf
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const a = Math.PI * (1.05 + t * 0.9);
    const root: V = [Math.cos(a) * 30, -126 + Math.sin(a) * 8];
    const tip: V = [Math.cos(a) * 112, -30 + Math.sin(a) * 96];
    out.push({
      root,
      tip,
      ctrl: [tip[0] * 0.9, tip[1] - 40],
      w: 26 + r() * 10,
      shade: 0.2 + r() * 0.2,
    });
  }
  // Seiten über den Ohren
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      out.push({
        root: [sd * (70 + i * 8), -100 + i * 6],
        tip: [sd * (103 + r() * 4), -22 + i * 5],
        ctrl: [sd * 112, -74],
        w: 18,
        shade: 0.35,
      });
    }
  }
  // Pony: kurz, flach in die Stirn gekämmt, Scheitel links, Fall nach rechts
  for (let i = 0; i < 20; i++) {
    const t = i / 19;
    const rx = -88 + t * 172;
    const root: V = [-46 + t * 70, -134 + Math.abs(t - 0.2) * 10];
    const len = r();
    // schräge, stufige Kante: am Scheitel kurz, zur rechten Schläfe hin länger
    const tip: V = [rx + 16 + len * 14, -116 + t * 46 + len * 16 - (i % 3 === 1 ? 8 : 0)];
    out.push({
      root,
      tip,
      ctrl: [rx - 2 + t * 14, -124 - r() * 6],
      w: 18 + r() * 9,
      shade: 0.4 + r() * 0.5,
    });
  }
  // links vom Scheitel: kurz zur Seite gelegt
  for (let i = 0; i < 5; i++) {
    out.push({
      root: [-50 - i * 6, -132 + i * 4],
      tip: [-92 - i * 3 - r() * 6, -82 + i * 8],
      ctrl: [-84 - i * 4, -128 + i * 2],
      w: 20 + r() * 6,
      shade: 0.35 + r() * 0.3,
    });
  }
  locks = out;
  return out;
}

function hair(ctx: CanvasRenderingContext2D, p: BustPose, time: number) {
  const sway = p.hairSway;
  // Grundmasse
  ctx.fillStyle = '#2e1b0f';
  ctx.beginPath();
  ctx.moveTo(-105, -14);
  ctx.bezierCurveTo(-114, -92, -68, -146, 0, -147);
  ctx.bezierCurveTo(68, -148, 116, -98, 106, -16);
  ctx.quadraticCurveTo(100, -50, 90, -70);
  ctx.quadraticCurveTo(10, -100, -84, -88);
  ctx.quadraticCurveTo(-100, -46, -105, -14);
  ctx.fill();
  for (const l of hairLocks()) {
    const sw = sway * (l.tip[1] + 140) * 0.08 + Math.sin(time * 2 + l.root[0]) * 0.6;
    const tip: V = [l.tip[0] + sw, l.tip[1]];
    const dx = tip[0] - l.root[0];
    const dy = tip[1] - l.root[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * l.w * 0.5;
    const ny = (dx / len) * l.w * 0.5;
    const g = ctx.createLinearGradient(l.root[0], l.root[1], tip[0], tip[1]);
    const base = Math.round(36 + l.shade * 40);
    g.addColorStop(0, `rgb(${base * 0.7},${base * 0.42},${base * 0.24})`);
    g.addColorStop(0.6, `rgb(${base + 22},${base * 0.66 + 10},${base * 0.38})`);
    g.addColorStop(1, `rgb(${base + 40},${base * 0.75 + 18},${base * 0.45 + 6})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(l.root[0] + nx, l.root[1] + ny);
    ctx.quadraticCurveTo(l.ctrl[0] + nx * 0.6, l.ctrl[1] + ny * 0.6, tip[0], tip[1]);
    ctx.quadraticCurveTo(
      l.ctrl[0] - nx * 0.6,
      l.ctrl[1] - ny * 0.6,
      l.root[0] - nx,
      l.root[1] - ny,
    );
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,16,8,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Glanzsträhne
    ctx.strokeStyle = `rgba(190,140,95,${0.14 + l.shade * 0.2})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(l.root[0] + nx * 0.2, l.root[1] + ny * 0.2);
    ctx.quadraticCurveTo(l.ctrl[0], l.ctrl[1] - 2, tip[0] - nx * 0.1, tip[1]);
    ctx.stroke();
  }
  // abstehende Härchen
  ctx.strokeStyle = 'rgba(110,70,40,0.55)';
  ctx.lineWidth = 1;
  const r = seeded(9);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (1.1 + r() * 0.8);
    const x = Math.cos(a) * 100;
    const y = -40 + Math.sin(a) * 110;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x * 1.12, y - 10, x * 1.18 + sway * 4, y - 4);
    ctx.stroke();
  }
}

/* ------------------------------------------------------------------ */
/*  Maskenkopf                                                         */
/* ------------------------------------------------------------------ */

function drawMaskHead(
  ctx: CanvasRenderingContext2D,
  p: BustPose,
  suit: Suit,
  ls: number,
  time: number,
) {
  const mat = suit === 'spidey' ? MAT.red : MAT.black;
  const fx = p.headTurn * 16;
  const ny = p.headNod * 8;
  // Ohrwölbungen unter der Maske
  for (const sd of [-1, 1]) {
    blob(
      ctx,
      sd * (102 - p.headTurn * sd * 6),
      14,
      18,
      34,
      suit === 'spidey' ? 'rgba(150,15,25,1)' : 'rgba(14,16,24,1)',
    );
  }
  headPath(ctx);
  const g = ctx.createRadialGradient(-34 * ls, -50, 10, -10 * ls, 0, 155);
  g.addColorStop(0, mat.light);
  g.addColorStop(0.5, mat.base);
  g.addColorStop(0.92, mat.dark);
  g.addColorStop(1, mat.rim);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  headPath(ctx);
  ctx.clip();
  // Gesicht unter dem Stoff: Augenhöhlen, Nase, Mund, Kinn
  const shade = suit === 'spidey' ? 'rgba(60,0,8,0.4)' : 'rgba(0,0,0,0.55)';
  const lite = suit === 'spidey' ? 'rgba(255,140,140,0.35)' : 'rgba(150,175,255,0.3)';
  blob(ctx, -40 + fx, 4 + ny, 40, 28, shade);
  blob(ctx, 40 + fx, 4 + ny, 40, 28, shade);
  blob(ctx, fx * 1.35 - 4 * ls, 20 + ny, 7, 30, lite);
  blob(ctx, fx * 1.35, 38 + ny, 14, 10, lite);
  blob(ctx, fx * 1.35 + 12 * ls, 36 + ny, 10, 18, shade);
  blob(ctx, fx * 1.15, 78 + ny, 30, 6, shade);
  blob(ctx, fx, 104 + ny, 26, 12, lite);
  blob(ctx, -66 + fx, 44 + ny, 22, 30, lite.replace(/[\d.]+\)$/, '0.18)'));
  if (suit === 'spidey') {
    fillTexture(ctx, 'hex', -120, -140, 240, 280, 0.5);
    raised(ctx, webBuilder(ctx, fx * 1.3, 26 + ny, 18, 22, 190, 0.05), 1.9);
  } else {
    // Lackglanz auf Stirn und Wange
    ctx.strokeStyle = 'rgba(210,225,255,0.55)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-70 * ls, -86);
    ctx.quadraticCurveTo(-20 * ls, -122, 40 * ls, -112);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-94 * ls, 0);
    ctx.quadraticCurveTo(-90 * ls, 50, -66 * ls, 86);
    ctx.stroke();
    const sx = ((time * 60) % 400) - 200;
    const sg = ctx.createLinearGradient(sx - 30, -130, sx + 30, 130);
    sg.addColorStop(0, 'rgba(160,180,255,0)');
    sg.addColorStop(0.5, 'rgba(160,180,255,0.08)');
    sg.addColorStop(1, 'rgba(160,180,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(-120, -140, 240, 280);
  }
  ctx.restore();
  headPath(ctx);
  ctx.strokeStyle = suit === 'spidey' ? OUTLINE : 'rgba(0,0,0,0.9)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  for (const sd of [-1, 1]) maskLens(ctx, sd, fx, ny, p, suit);
}

function maskLens(
  ctx: CanvasRenderingContext2D,
  sd: number,
  fx: number,
  ny: number,
  p: BustPose,
  suit: Suit,
) {
  const turnScale = 1 - Math.max(0, p.headTurn * sd) * 0.2;
  const sq = p.squint;
  ctx.save();
  ctx.translate(fx + sd * 2, ny + 2);
  ctx.scale(sd * turnScale * 1.1, 1.1);
  // Mittelpunkt der Linse für Zukneifen/Aufreißen
  const cx = 52;
  const cy = -18;
  ctx.translate(cx, cy);
  ctx.scale(1 + Math.max(0, -sq) * 0.12, 1 - sq * 0.48);
  ctx.rotate(sq * 0.14);
  ctx.translate(-cx, -cy);
  const shape = () => {
    ctx.beginPath();
    if (suit === 'spidey') {
      ctx.moveTo(14, 14);
      ctx.quadraticCurveTo(14, -30, 46, -54);
      ctx.quadraticCurveTo(84, -66, 94, -36);
      ctx.quadraticCurveTo(98, -6, 72, 8);
      ctx.quadraticCurveTo(40, 22, 14, 14);
    } else {
      ctx.moveTo(10, 18);
      ctx.quadraticCurveTo(12, -26, 40, -58);
      ctx.lineTo(104, -64);
      ctx.quadraticCurveTo(100, -40, 90, -26);
      ctx.lineTo(98, -10);
      ctx.quadraticCurveTo(76, 14, 42, 20);
      ctx.quadraticCurveTo(24, 24, 10, 18);
    }
    ctx.closePath();
  };
  // schwarzer Rahmen mit Fase
  shape();
  ctx.strokeStyle = '#060608';
  ctx.lineWidth = suit === 'spidey' ? 13 : 16;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.save();
  ctx.translate(-1.5, -2.5);
  shape();
  ctx.stroke();
  ctx.restore();
  // Linse
  shape();
  const lg = ctx.createLinearGradient(30, -60, 80, 20);
  lg.addColorStop(0, '#ffffff');
  lg.addColorStop(0.7, suit === 'spidey' ? '#e3e9f4' : '#d6dced');
  lg.addColorStop(1, suit === 'spidey' ? '#b9c5dc' : '#a8b3cc');
  ctx.fillStyle = lg;
  ctx.fill();
  ctx.save();
  shape();
  ctx.clip();
  fillTexture(ctx, 'mesh', 0, -80, 120, 120);
  // Innenschatten oben
  const ig = ctx.createLinearGradient(0, -66, 0, -30);
  ig.addColorStop(0, 'rgba(40,50,80,0.35)');
  ig.addColorStop(1, 'rgba(40,50,80,0)');
  ctx.fillStyle = ig;
  ctx.fillRect(0, -80, 120, 60);
  // Spiegelung des Fensters
  ctx.fillStyle = 'rgba(140,165,230,0.3)';
  ctx.beginPath();
  ctx.moveTo(40, -56);
  ctx.lineTo(54, -60);
  ctx.lineTo(46, 0);
  ctx.lineTo(32, 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(60, -62);
  ctx.lineTo(66, -63);
  ctx.lineTo(58, -2);
  ctx.lineTo(52, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(76, -44, 5, 8, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Arme und Hände                                                     */
/* ------------------------------------------------------------------ */

/** im Knochen-Koordinatensystem zeichnen: x entlang a→b, y quer dazu */
function inBone(
  ctx: CanvasRenderingContext2D,
  a: V,
  b: V,
  clip: Path2D,
  fn: (len: number) => void,
) {
  ctx.save();
  ctx.clip(clip);
  ctx.translate(a[0], a[1]);
  ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
  fn(Math.hypot(b[0] - a[0], b[1] - a[1]));
  ctx.restore();
}

function drawArm(
  ctx: CanvasRenderingContext2D,
  shoulder: V,
  elbow: V,
  wrist: V,
  sd: number,
  dir: number,
  dirW: number,
  hand: HandParams,
  wristBend: number,
  suit: Suit,
  ls: number,
  time: number,
  torso: Path2D,
) {
  const mat = suit === 'peter' ? MAT.flannel : suit === 'spidey' ? MAT.red : MAT.black;
  // Beugewinkel im Ellbogen: der Bizeps schwillt an
  const ua = Math.atan2(elbow[1] - shoulder[1], elbow[0] - shoulder[0]);
  const fa = Math.atan2(wrist[1] - elbow[1], wrist[0] - elbow[0]);
  let bendA = Math.abs(fa - ua);
  if (bendA > Math.PI) bendA = Math.PI * 2 - bendA;
  const flex = clamp(bendA / 2.2, 0, 1);
  // Seite, zu der sich der Unterarm beugt (+1 = linke Profilseite)
  const n: V = [-Math.sin(ua), Math.cos(ua)];
  const bSide = (wrist[0] - elbow[0]) * n[0] + (wrist[1] - elbow[1]) * n[1] >= 0 ? 1 : -1;

  // Muskelprofile: Deltamuskel, Bizeps (beugeseitig, wächst beim Anwinkeln), Trizeps
  const tri: Profile = [40, 46, 44.5, 42, 40, 37.5, 34.5, 32];
  const bic: Profile = [40, 46, 43, 41.5 + flex * 7, 42.5 + flex * 10, 39.5 + flex * 6, 35, 32];
  const upper = profilePath(shoulder, elbow, bSide > 0 ? bic : tri, bSide > 0 ? tri : bic);
  const foreProf: Profile = [32, 37, 36, 33, 29.5, 27, 25.5];
  const fore = profilePath(elbow, wrist, foreProf);
  const both = new Path2D();
  both.addPath(upper);
  both.addPath(fore);

  const ink = suit === 'black' ? 'rgba(0,0,0,0.9)' : OUTLINE;
  const soft =
    suit === 'black'
      ? 'rgba(0,0,0,0.3)'
      : suit === 'peter'
        ? 'rgba(10,16,32,0.25)'
        : 'rgba(70,0,12,0.28)';
  strokeArmOutline(ctx, both, torso, shoulder, ink, soft, 5, 120);
  ctx.fillStyle = limbGradient(ctx, elbow, wrist, 40, mat, ls);
  ctx.fill(fore);
  ctx.fillStyle = limbGradient(ctx, shoulder, elbow, 50, mat, ls);
  ctx.fill(upper);

  // weiche Muskelzeichnung statt aufgesetzter Formen
  const lite =
    suit === 'black'
      ? 'rgba(150,180,255,0.2)'
      : suit === 'spidey'
        ? 'rgba(255,150,150,0.22)'
        : 'rgba(170,200,255,0.12)';
  const dark = suit === 'black' ? 'rgba(0,0,0,0.5)' : 'rgba(30,0,10,0.28)';
  inBone(ctx, shoulder, elbow, upper, (len) => {
    // Deltamuskel: Kuppe hell, Übergang zum Oberarm als weiche Mulde
    blob(ctx, len * 0.14, 0, 46, 38, lite);
    ctx.strokeStyle = dark;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(len * 0.14, -48);
    ctx.quadraticCurveTo(len * 0.42, -30, len * 0.46, 0);
    ctx.quadraticCurveTo(len * 0.42, 30, len * 0.14, 48);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Bizeps hell, Trizeps im Schatten
    blob(ctx, len * 0.62, bSide * (10 + flex * 6), 56, 22 + flex * 6, lite);
    blob(ctx, len * 0.58, -bSide * 34, 70, 18, dark);
  });
  inBone(ctx, elbow, wrist, fore, (len) => {
    // Unterarmmuskel unterm Ellbogen, zum Handgelenk hin flacher
    blob(ctx, len * 0.24, -bSide * 8, 60, 20, lite);
    blob(ctx, len * 0.5, bSide * 26, 80, 12, dark);
  });

  if (suit === 'peter') {
    // hochgekrempelte Ärmel: Unterarm ab knapp der Mitte nackt
    ctx.save();
    ctx.clip(fore);
    ctx.fillStyle = limbGradient(ctx, elbow, wrist, 40, MAT.skin, ls);
    ctx.fill(regionFrom(elbow, wrist, 0.44, 0, 60));
    ctx.restore();
    const roll = mix(elbow, wrist, 0.44);
    ctx.strokeStyle = 'rgba(140,80,55,0.3)';
    ctx.lineWidth = 2;
    const a = mix(roll, wrist, 0.25);
    const b = mix(roll, wrist, 0.85);
    ctx.beginPath();
    ctx.moveTo(a[0] + 10, a[1]);
    ctx.lineTo(b[0] + 6, b[1]);
    ctx.stroke();
    inBone(ctx, shoulder, elbow, upper, () => flannelPlaid(ctx, -80, -80, 400, 160));
    ctx.save();
    ctx.clip(regionFrom(wrist, elbow, 0.56, 0, 60));
    inBone(ctx, elbow, wrist, fore, () => flannelPlaid(ctx, -80, -80, 400, 160));
    ctx.restore();
    // aufgerollter Wulst
    const r0 = mix(elbow, wrist, 0.36);
    const r1 = mix(elbow, wrist, 0.5);
    const cuff = profilePath(r0, r1, [42, 40]);
    ctx.fillStyle = limbGradient(ctx, r0, r1, 42, MAT.flannel, ls);
    ctx.fill(cuff);
    inBone(ctx, r0, r1, cuff, () => {
      flannelPlaid(ctx, -60, -60, 160, 120);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(-60, 20, 160, 40);
    });
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke(cuff);
    if (sd < 0) watch(ctx, elbow, wrist, ls);
  } else if (suit === 'spidey') {
    for (const [p0, p1, path, prof] of [
      [shoulder, elbow, upper, tri],
      [elbow, wrist, fore, foreProf],
    ] as [V, V, Path2D, Profile][]) {
      inBone(ctx, p0, p1, path, (len) => {
        fillTexture(ctx, 'hex', -80, -80, len + 160, 160, 0.5);
        if (p0 === shoulder) {
          // blauer Streifen an der dem Rumpf zugewandten Seite, zur Achsel hin auslaufend
          const toCore: V = [-shoulder[0], 250];
          const inner = n[0] * toCore[0] + n[1] * toCore[1] >= 0 ? 1 : -1;
          ctx.save();
          ctx.scale(1, inner);
          ctx.beginPath();
          ctx.moveTo(10, 80);
          ctx.bezierCurveTo(24, 40, 60, 24, 100, 22);
          ctx.lineTo(len + 60, 18);
          ctx.lineTo(len + 60, 80);
          ctx.closePath();
          ctx.fillStyle = bodyGradient(ctx, MAT.blue, ls);
          ctx.fill();
          ctx.save();
          ctx.clip();
          fillTexture(ctx, 'hex', -80, 0, len + 160, 100, 0.5);
          ctx.restore();
          ctx.strokeStyle = 'rgba(5,5,20,0.7)';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
        }
        const r0 = prof[0];
        const r1 = prof[prof.length - 1];
        raised(
          ctx,
          () => {
            for (const k of [-0.62, 0, 0.62]) {
              ctx.moveTo(-r0, k * r0);
              for (let x = 0; x <= len; x += 20) ctx.lineTo(x, k * profileAt(prof, x / len));
              ctx.lineTo(len + r1, k * r1);
            }
            for (let x = -r0 + 14; x < len + r1; x += 30) {
              const r = profileAt(prof, x / len) + 6;
              ctx.moveTo(x, -r - 4);
              ctx.quadraticCurveTo(x - 9, -r * 0.31, x, 0);
              ctx.quadraticCurveTo(x - 9, r * 0.31, x, r + 4);
            }
          },
          1.9,
        );
      });
    }
  } else {
    // Lackglanz entlang der Lichtseite
    for (const [p0, p1, path, r] of [
      [shoulder, elbow, upper, 46],
      [elbow, wrist, fore, 36],
    ] as [V, V, Path2D, number][]) {
      inBone(ctx, p0, p1, path, (len) => {
        const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
        const side = Math.cos(ang + Math.PI / 2) * ls < 0 ? -1 : 1;
        ctx.strokeStyle = 'rgba(200,220,255,0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(14, side * r * 0.55);
        ctx.quadraticCurveTo(len * 0.5, side * r * 0.72, len - 14, side * r * 0.5);
        ctx.stroke();
      });
    }
    void time;
  }

  // Ellbogen: weicher Schatten statt Gelenkkugel, Beugefalte beim Anwinkeln
  ctx.save();
  ctx.clip(both);
  const eg = ctx.createRadialGradient(elbow[0], elbow[1], 0, elbow[0], elbow[1], 46);
  eg.addColorStop(0, suit === 'black' ? 'rgba(0,0,0,0.3)' : 'rgba(30,0,10,0.18)');
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = eg;
  ctx.fillRect(elbow[0] - 50, elbow[1] - 50, 100, 100);
  if (flex > 0.2) {
    ctx.strokeStyle = `rgba(0,0,0,${0.28 * flex})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    const ca = (ua + fa) / 2 + (sd > 0 ? -1 : 1) * Math.PI * 0.5;
    ctx.arc(elbow[0], elbow[1], 32, ca - 0.5, ca + 0.5);
    ctx.stroke();
  }
  ctx.restore();

  const foreAng = fa;
  let d = dir - foreAng;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  drawParamHand(ctx, wrist, foreAng + d * dirW + wristBend, hand, sd, HAND_STYLE[suit], 3.9, 3.4);
}

const HAND_STYLE: Record<Suit, HandStyle> = {
  peter: {
    base: MAT.skin.base,
    light: MAT.skin.light,
    dark: MAT.skin.dark,
    kind: 'skin',
    outline: OUTLINE,
    lineScale: 1,
  },
  spidey: {
    base: MAT.red.base,
    light: MAT.red.light,
    dark: MAT.red.dark,
    kind: 'spidey',
    outline: OUTLINE,
    lineScale: 1,
  },
  black: {
    base: MAT.black.base,
    light: '#3a4562',
    dark: MAT.black.dark,
    kind: 'black',
    outline: 'rgba(0,0,0,0.9)',
    lineScale: 1,
  },
};

/** Armbanduhr, die die echte Uhrzeit zeigt */
function watch(ctx: CanvasRenderingContext2D, elbow: V, wrist: V, ls: number) {
  const w0 = mix(elbow, wrist, 0.84);
  const w1 = mix(elbow, wrist, 0.95);
  limb(
    ctx,
    w0,
    w1,
    38.5,
    38,
    { base: '#2b2420', dark: '#0e0b09', light: '#4a3f37', rim: '#6d7a9a' },
    ls,
  );
  const c = mix(w0, w1, 0.5);
  const cg = ctx.createRadialGradient(c[0] - 6, c[1] - 6, 2, c[0], c[1], 24);
  cg.addColorStop(0, '#f2f4f8');
  cg.addColorStop(1, '#8a8f99');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(c[0], c[1], 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#16213d';
  ctx.beginPath();
  ctx.arc(c[0], c[1], 15.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c[0] + Math.cos(a) * 14, c[1] + Math.sin(a) * 14);
    ctx.lineTo(c[0] + Math.cos(a) * 17, c[1] + Math.sin(a) * 17);
    ctx.stroke();
  }
  const now = new Date();
  const hA = ((now.getHours() % 12) + now.getMinutes() / 60) * (Math.PI / 6) - Math.PI / 2;
  const mA = now.getMinutes() * (Math.PI / 30) - Math.PI / 2;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(c[0], c[1]);
  ctx.lineTo(c[0] + Math.cos(hA) * 9, c[1] + Math.sin(hA) * 9);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c[0], c[1]);
  ctx.lineTo(c[0] + Math.cos(mA) * 14, c[1] + Math.sin(mA) * 14);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(c[0] - 6, c[1] - 8, 9, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

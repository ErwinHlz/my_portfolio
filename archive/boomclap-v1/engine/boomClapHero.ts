/**
 * Der Held in drei Looks: Peter Parker, Spider-Man (rot/blau) und der
 * schwarze Symbionten-Anzug. Frontalansicht, Gliedmaßen per 2-Knochen-IK –
 * eine Pose gibt nur Hände und Füße vor, Ellbogen und Knie ergeben sich.
 *
 * Lokales Koordinatensystem: Ursprung im Becken, y zeigt nach unten.
 */
import { clamp } from './canvasUtils';
import {
  profileAt,
  profilePath,
  regionFrom,
  rotated,
  strokeArmOutline,
  type Profile,
} from './boomClapLimb';
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

export interface Pose {
  /** Beckenposition in der Welt */
  x: number;
  y: number;
  /** Maßstab (kleiner = weiter hinten im Raum) */
  s: number;
  /** Drehung des ganzen Körpers (π = kopfüber an der Decke) */
  rot: number;
  /** Seitliche Neigung des Oberkörpers */
  lean: number;
  /** Rumpflänge (kleiner = beugt sich zur Kamera) */
  tl: number;
  headTilt: number;
  /** Handgelenke und Knöchel relativ zum Becken */
  hl: V;
  hr: V;
  fl: V;
  fr: V;
  /** feste Handrichtung (rad) und wie stark sie die Unterarmrichtung ersetzt */
  hlDir: number;
  hlW: number;
  hrDir: number;
  hrW: number;
  shapeL: HandShape;
  shapeR: HandShape;
  /** fließend gemischte Fingerstellung */
  handL?: HandParams;
  handR?: HandParams;
  /** Nachziehen im Handgelenk */
  wristL?: number;
  wristR?: number;
  /** Gesicht: Mund offen, Augenbrauen hoch, Blickrichtung, Augen zukneifen */
  mouth: number;
  brow: number;
  lookX: number;
  squint: number;
  blink: number;
}

export const BODY = {
  torso: 170,
  neck: 18,
  head: 42,
  shoulderX: 62,
  shoulderY: 15,
  hipX: 23,
  hipY: 6,
  upper: 104,
  fore: 96,
  thigh: 140,
  shin: 134,
  foot: 12,
};

/** Breitenfaktor für Rumpf und Becken (schlanke Statur) */
const TORSO_W = 0.88;

/** Standhöhe des Beckens über dem Boden (Knöchel + Fuß) */
export const STAND_HEIGHT = 278 + BODY.foot;

interface Mat {
  base: string;
  dark: string;
  light: string;
  rim: string;
}

const MAT = {
  skin: { base: '#e7b48d', dark: '#b27755', light: '#f8d2b0', rim: '#c9d4ff' },
  flannel: { base: '#41608f', dark: '#22324f', light: '#5f80b3', rim: '#a3baf0' },
  tee: { base: '#3a3d46', dark: '#1d1f25', light: '#575b67', rim: '#8e9cc2' },
  denim: { base: '#33507d', dark: '#192842', light: '#4c6ca0', rim: '#8ea8d8' },
  red: { base: '#c51f2b', dark: '#650c15', light: '#ee4a4a', rim: '#ff9fae' },
  blue: { base: '#1c3d98', dark: '#0b1a4a', light: '#3961cc', rim: '#93b2ff' },
  black: { base: '#11131b', dark: '#030407', light: '#2b3349', rim: '#6680bb' },
  shoe: { base: '#e8e6df', dark: '#9e9c95', light: '#ffffff', rim: '#d8e2ff' },
} satisfies Record<string, Mat>;

const OUTLINE = 'rgba(8,6,18,0.6)';

/* ------------------------------------------------------------------ */
/*  Geometrie-Helfer                                                   */
/* ------------------------------------------------------------------ */

const rot = (p: V, a: number): V => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
};
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const mix = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** 2-Knochen-IK: liefert das Mittelgelenk und das (ggf. gekürzte) Ende */
function ik(a: V, target: V, l1: number, l2: number, pref: V): { mid: V; end: V } {
  let d = sub(target, a);
  let dist = Math.hypot(d[0], d[1]);
  if (dist < 1e-4) {
    d = [0, 1];
    dist = 1;
  }
  const u: V = [d[0] / dist, d[1] / dist];
  const dd = clamp(dist, Math.abs(l1 - l2) + 0.5, l1 + l2 - 0.5);
  const end = add(a, [u[0] * dd, u[1] * dd]);
  const along = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const base = add(a, [u[0] * along, u[1] * along]);
  const n: V = [-u[1], u[0]];
  const side = n[0] * pref[0] + n[1] * pref[1] >= 0 ? 1 : -1;
  return { mid: add(base, [n[0] * h * side, n[1] * h * side]), end };
}

/** Pfad einer konischen Kapsel von a (Radius ra) nach b (Radius rb) */
function capsule(ctx: CanvasRenderingContext2D, a: V, b: V, ra: number, rb: number) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const d = Math.max(0.01, Math.hypot(b[0] - a[0], b[1] - a[1]));
  const off = Math.asin(clamp((ra - rb) / d, -0.95, 0.95));
  ctx.beginPath();
  ctx.arc(a[0], a[1], ra, ang + Math.PI / 2 - off, ang + (3 * Math.PI) / 2 + off);
  ctx.arc(b[0], b[1], rb, ang - Math.PI / 2 + off, ang + Math.PI / 2 - off);
  ctx.closePath();
}

/** Zylinder-Schattierung quer zur Achse; Licht kommt immer von links oben in der Welt */
function limbFill(ctx: CanvasRenderingContext2D, a: V, b: V, r: number, mat: Mat, ls: number) {
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
  g.addColorStop(0.28, mat.light);
  g.addColorStop(0.62, mat.base);
  g.addColorStop(0.9, mat.dark);
  g.addColorStop(1, mat.rim);
  return g;
}

function drawLimb(
  ctx: CanvasRenderingContext2D,
  a: V,
  b: V,
  ra: number,
  rb: number,
  mat: Mat,
  ls: number,
  outline = true,
) {
  capsule(ctx, a, b, ra, rb);
  ctx.fillStyle = limbFill(ctx, a, b, Math.max(ra, rb), mat, ls);
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

/* ---------- Muskelprofile ---------- */

/**
 * Radien entlang eines Knochens (gleichmäßig verteilt von Gelenk zu Gelenk).
 * Statt gerader Kegel bekommen Arme und Beine so Schulter, Bizeps, Wade usw.,
 * und an den Gelenken treffen sich gleich dicke Enden.
 */

const PROFILE = {
  /** Deltamuskel oben, Bizeps, schmaler zum Ellbogen */
  upper: [15.5, 17.5, 17, 15.5, 15, 14, 13, 12.3],
  /** Unterarm: kräftig unterm Ellbogen, schmal zum Handgelenk */
  fore: [12.3, 13.6, 13, 12, 11, 10.3, 9.8],
  /** Oberschenkel: breite Hüfte, Quadrizeps, schmales Knie */
  thigh: [19.5, 20.5, 20, 18.5, 17, 15.5, 14, 13.2],
  /** Schienbein: Wade im oberen Drittel, schlanker Knöchel */
  shin: [13.2, 13.6, 15, 14.2, 12.6, 11, 9.8, 9.4],
  neck: [15.5, 13.8, 13],
} satisfies Record<string, Profile>;

/** Glied mit Zylinder-Schattierung füllen (ohne eigene Kontur) */
function fillLimb(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  a: V,
  b: V,
  prof: Profile,
  mat: Mat,
  ls: number,
) {
  ctx.fillStyle = limbFill(ctx, a, b, Math.max(...prof), mat, ls);
  ctx.fill(path);
}

/** Netzlinien auf einem Arm- oder Beinstück: Längslinien + Querbögen, dem Profil folgend */
function webLimb(ctx: CanvasRenderingContext2D, limb: Path2D, a: V, b: V, prof: Profile) {
  ctx.save();
  ctx.clip(limb);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  ctx.translate(a[0], a[1]);
  ctx.rotate(ang);
  const r0 = prof[0];
  const r1 = prof[prof.length - 1];
  ctx.strokeStyle = 'rgba(12,0,4,0.62)';
  ctx.lineWidth = 1.05;
  ctx.beginPath();
  for (const k of [-0.62, 0, 0.62]) {
    ctx.moveTo(-r0, k * r0);
    for (let x = 0; x <= len; x += 8) ctx.lineTo(x, k * profileAt(prof, x / len));
    ctx.lineTo(len + r1, k * r1);
  }
  for (let x = -r0 + 6; x < len + r1; x += 12) {
    const r = profileAt(prof, x / len);
    ctx.moveTo(x, -r - 2);
    ctx.quadraticCurveTo(x - 4, -r * 0.31, x, 0);
    ctx.quadraticCurveTo(x - 4, r * 0.31, x, r + 2);
  }
  raisedStroke(ctx);
  ctx.restore();
}

/** Netzlinien wirken erhaben: weicher heller Grat, darauf die dunkle Linie */
function raisedStroke(ctx: CanvasRenderingContext2D, width = 1.05) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,190,190,0.16)';
  ctx.lineWidth = width * 2.6;
  ctx.stroke();
  ctx.restore();
  ctx.stroke();
}

/** Karomuster fürs Flanellhemd, innerhalb des aktuellen Clips */
function plaid(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  ctx.fillStyle = 'rgba(18,26,48,0.42)';
  for (let x = x0; x < x1; x += 18) ctx.fillRect(x, y0, 7, y1 - y0);
  for (let y = y0; y < y1; y += 18) ctx.fillRect(x0, y, x1 - x0, 7);
  ctx.fillStyle = 'rgba(190,70,60,0.55)';
  for (let x = x0 + 12; x < x1; x += 18) ctx.fillRect(x, y0, 1.4, y1 - y0);
  for (let y = y0 + 12; y < y1; y += 18) ctx.fillRect(x0, y, x1 - x0, 1.4);
}

function plaidLimb(ctx: CanvasRenderingContext2D, limb: Path2D, a: V, b: V, r: number) {
  ctx.save();
  ctx.clip(limb);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  ctx.translate(a[0], a[1]);
  ctx.rotate(ang);
  plaid(ctx, -r - 4, -r - 4, len + r + 4, r + 4);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Skelett                                                            */
/* ------------------------------------------------------------------ */

export interface Rig {
  neckBase: V;
  neckTop: V;
  head: V;
  headAng: number;
  shoulderL: V;
  shoulderR: V;
  elbowL: V;
  elbowR: V;
  wristL: V;
  wristR: V;
  hipL: V;
  hipR: V;
  kneeL: V;
  kneeR: V;
  ankleL: V;
  ankleR: V;
  chest: V;
}

export function buildRig(p: Pose): Rig {
  const T = BODY.torso * p.tl;
  const neckBase = rot([0, -T], p.lean);
  const neckTop = add(neckBase, rot([0, -BODY.neck], p.lean + p.headTilt * 0.4));
  const headAng = p.lean + p.headTilt;
  const head = add(neckTop, rot([0, -BODY.head + 2], headAng));
  const shoulderL = rot([-BODY.shoulderX, -T + BODY.shoulderY], p.lean);
  const shoulderR = rot([BODY.shoulderX, -T + BODY.shoulderY], p.lean);
  const hipL = rot([-BODY.hipX, BODY.hipY], p.lean * 0.25);
  const hipR = rot([BODY.hipX, BODY.hipY], p.lean * 0.25);
  const armL = ik(shoulderL, p.hl, BODY.upper, BODY.fore, [-1, 0.55]);
  const armR = ik(shoulderR, p.hr, BODY.upper, BODY.fore, [1, 0.55]);
  const legL = ik(hipL, p.fl, BODY.thigh, BODY.shin, [-1, -0.1]);
  const legR = ik(hipR, p.fr, BODY.thigh, BODY.shin, [1, -0.1]);
  return {
    neckBase,
    neckTop,
    head,
    headAng,
    shoulderL,
    shoulderR,
    elbowL: armL.mid,
    elbowR: armR.mid,
    wristL: armL.end,
    wristR: armR.end,
    hipL,
    hipR,
    kneeL: legL.mid,
    kneeR: legR.mid,
    ankleL: legL.end,
    ankleR: legR.end,
    chest: rot([0, -T + 66], p.lean),
  };
}

/** lokaler Körperpunkt → Weltkoordinaten */
export function toWorld(p: Pose, local: V): V {
  const r = rot(local, p.rot);
  return [p.x + r[0] * p.s, p.y + r[1] * p.s];
}

/* ------------------------------------------------------------------ */
/*  Zeichnen                                                           */
/* ------------------------------------------------------------------ */

interface Limb {
  a: V;
  b: V;
  prof: Profile;
  path: Path2D;
}

function limb(a: V, b: V, prof: Profile): Limb {
  return { a, b, prof, path: profilePath(a, b, prof) };
}

export function drawHero(ctx: CanvasRenderingContext2D, p: Pose, suit: Suit, time: number) {
  const rig = buildRig(p);
  const ls = Math.cos(p.rot) >= 0 ? 1 : -1;
  const T = -BODY.torso * p.tl;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(p.s, p.s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Einzelteile als Pfade, alle im Becken-Koordinatensystem
  const torsoLocal = torsoPath(T);
  const torso = rotated(torsoLocal, p.lean, TORSO_W);
  const pelvisLocal = pelvisPath();
  const pelvis = rotated(pelvisLocal, p.lean * 0.25, TORSO_W);
  const legs = [
    {
      thigh: limb(rig.hipL, rig.kneeL, PROFILE.thigh),
      shin: limb(rig.kneeL, rig.ankleL, PROFILE.shin),
      sd: -1,
    },
    {
      thigh: limb(rig.hipR, rig.kneeR, PROFILE.thigh),
      shin: limb(rig.kneeR, rig.ankleR, PROFILE.shin),
      sd: 1,
    },
  ];
  const neck = limb(mix(rig.neckBase, rig.neckTop, -0.3), rig.neckTop, PROFILE.neck);

  // eine gemeinsame Außenkontur für Beine, Becken, Rumpf und Hals: innen keine Nähte
  const body = new Path2D();
  for (const leg of legs) {
    body.addPath(leg.thigh.path);
    body.addPath(leg.shin.path);
  }
  body.addPath(pelvis);
  body.addPath(torso);
  body.addPath(neck.path);
  ctx.strokeStyle = suit === 'black' ? 'rgba(0,0,0,0.85)' : OUTLINE;
  ctx.lineWidth = 3.4;
  ctx.stroke(body);

  // Becken zuerst: die Oberschenkel legen sich darüber und formen den Schritt
  drawPelvis(ctx, p, pelvisLocal, suit, ls);
  for (const leg of legs) drawLeg(ctx, leg.thigh, leg.shin, leg.sd, suit, ls);
  drawNeck(ctx, neck, suit, ls);
  drawTorso(ctx, p, torsoLocal, suit, ls);
  if (suit === 'peter') drawCollar(ctx, rig);
  drawHead(ctx, p, rig, suit, time);
  const handL = p.handL ?? HAND_SHAPES[p.shapeL];
  const handR = p.handR ?? HAND_SHAPES[p.shapeR];
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
    torso,
  );

  ctx.restore();
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  thigh: Limb,
  shin: Limb,
  sd: number,
  suit: Suit,
  ls: number,
) {
  const hip = thigh.a;
  const knee = thigh.b;
  const ankle = shin.b;
  const legMat = suit === 'peter' ? MAT.denim : suit === 'spidey' ? MAT.blue : MAT.black;
  fillLimb(ctx, shin.path, knee, ankle, shin.prof, legMat, ls);
  fillLimb(ctx, thigh.path, hip, knee, thigh.prof, legMat, ls);
  kneeShade(ctx, thigh, shin, suit);

  if (suit === 'peter') {
    // Jeans: Außennaht und Knitter am Knie
    ctx.strokeStyle = 'rgba(200,170,90,0.45)';
    ctx.lineWidth = 1;
    const outerH = add(hip, [sd * 22, 4]);
    const outerK = add(knee, [sd * 15, 0]);
    const outerA = add(ankle, [sd * 10, 0]);
    ctx.beginPath();
    ctx.moveTo(outerH[0], outerH[1]);
    ctx.quadraticCurveTo(
      add(mix(hip, knee, 0.5), [sd * 22, 0])[0],
      mix(hip, knee, 0.5)[1],
      outerK[0],
      outerK[1],
    );
    ctx.quadraticCurveTo(
      add(mix(knee, ankle, 0.3), [sd * 16, 0])[0],
      mix(knee, ankle, 0.3)[1],
      outerA[0],
      outerA[1],
    );
    ctx.stroke();
    ctx.strokeStyle = 'rgba(10,20,40,0.35)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (const k of [-8, 0, 8]) {
      ctx.moveTo(knee[0] - 9, knee[1] + k);
      ctx.quadraticCurveTo(knee[0], knee[1] + k + 4, knee[0] + 9, knee[1] + k);
    }
    ctx.stroke();
    // Saum über dem Schuh
    drawLimb(ctx, mix(knee, ankle, 0.9), ankle, 15, 15, MAT.denim, ls);
  }
  if (suit === 'spidey') {
    // rote Stiefel ab der Wadenmitte, Kante vorne spitz nach oben
    const boot = regionFrom(knee, ankle, 0.5, 6);
    ctx.save();
    ctx.clip(shin.path);
    ctx.clip(boot);
    ctx.fillStyle = limbFill(ctx, knee, ankle, 20, MAT.red, ls);
    ctx.fill(boot);
    ctx.restore();
    ctx.save();
    ctx.clip(boot);
    webLimb(ctx, shin.path, knee, ankle, shin.prof);
    ctx.restore();
    ctx.save();
    ctx.clip(shin.path);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.stroke(boot);
    ctx.restore();
  }
  if (suit === 'black') {
    glossStreak(ctx, hip, knee, 24);
    glossStreak(ctx, knee, ankle, 17);
  }
  drawFoot(ctx, knee, ankle, sd, suit);
}

/** Kniescheibe und Wadenansatz als weiche Schatten statt einer harten Naht */
function kneeShade(ctx: CanvasRenderingContext2D, thigh: Limb, shin: Limb, suit: Suit) {
  const dark =
    suit === 'peter'
      ? 'rgba(10,20,40,0.16)'
      : suit === 'spidey'
        ? 'rgba(5,10,40,0.2)'
        : 'rgba(0,0,0,0.3)';
  const lite = suit === 'black' ? 'rgba(150,180,255,0.12)' : 'rgba(255,255,255,0.08)';
  const knee = thigh.b;
  const ang = Math.atan2(shin.b[1] - knee[1], shin.b[0] - knee[0]);
  ctx.save();
  ctx.clip(thigh.path);
  ctx.translate(knee[0], knee[1]);
  ctx.rotate(ang - Math.PI / 2);
  // Kniescheibe: heller Buckel mit dunkler Unterkante
  const kg = ctx.createRadialGradient(0, -4, 0, 0, -4, 13);
  kg.addColorStop(0, lite);
  kg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = kg;
  ctx.fillRect(-14, -18, 28, 28);
  ctx.restore();
  ctx.save();
  const both = new Path2D();
  both.addPath(thigh.path);
  both.addPath(shin.path);
  ctx.clip(both);
  ctx.translate(knee[0], knee[1]);
  ctx.rotate(ang - Math.PI / 2);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-7, 11);
  ctx.quadraticCurveTo(0, 14, 7, 11);
  // Quadrizeps-Ansatz über dem Knie
  ctx.moveTo(-14, -26);
  ctx.quadraticCurveTo(-10, -12, -4, -12);
  ctx.moveTo(14, -26);
  ctx.quadraticCurveTo(10, -12, 4, -12);
  ctx.stroke();
  ctx.restore();
}

function glossStreak(ctx: CanvasRenderingContext2D, a: V, b: V, r: number) {
  ctx.save();
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  ctx.translate(a[0], a[1]);
  ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, 'rgba(150,180,255,0)');
  g.addColorStop(0.3, 'rgba(150,180,255,0.28)');
  g.addColorStop(0.42, 'rgba(150,180,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(len * 0.5, 0, len * 0.42, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFoot(ctx: CanvasRenderingContext2D, knee: V, ankle: V, sd: number, suit: Suit) {
  const ang = Math.atan2(ankle[1] - knee[1], ankle[0] - knee[0]) - Math.PI / 2;
  ctx.save();
  ctx.translate(ankle[0], ankle[1]);
  ctx.rotate(ang);
  ctx.scale(sd, 1);
  // Frontansicht eines Schuhs: Spitze zeigt leicht nach außen
  ctx.beginPath();
  ctx.moveTo(-13, -2);
  ctx.quadraticCurveTo(-15, 10, -10, 15);
  ctx.quadraticCurveTo(4, 19, 18, 15);
  ctx.quadraticCurveTo(22, 6, 12, -3);
  ctx.closePath();
  const mat = suit === 'peter' ? MAT.shoe : suit === 'spidey' ? MAT.red : MAT.black;
  const g = ctx.createLinearGradient(-14, 0, 20, 0);
  g.addColorStop(0, mat.light);
  g.addColorStop(0.6, mat.base);
  g.addColorStop(1, mat.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (suit === 'peter') {
    // Sohle, rote Akzente, Schnürung
    ctx.fillStyle = '#c9c6bd';
    ctx.fillRect(-12, 12, 30, 3.5);
    ctx.fillStyle = '#c8202c';
    ctx.beginPath();
    ctx.moveTo(4, 5);
    ctx.quadraticCurveTo(12, 3, 17, 9);
    ctx.lineTo(15, 11);
    ctx.quadraticCurveTo(10, 7, 4, 8);
    ctx.fill();
    ctx.strokeStyle = '#8d8b85';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const y of [0, 4]) {
      ctx.moveTo(-5, y);
      ctx.lineTo(5, y + 1);
    }
    ctx.stroke();
  } else if (suit === 'spidey') {
    ctx.strokeStyle = 'rgba(12,0,4,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-6, 14);
    ctx.moveTo(4, -1);
    ctx.lineTo(6, 16);
    ctx.moveTo(-12, 7);
    ctx.quadraticCurveTo(2, 10, 18, 7);
    ctx.stroke();
  }
  ctx.restore();
}

/** Becken: setzt unter dem Rumpf an und läuft in die Oberschenkel aus */
function pelvisPath(): Path2D {
  const path = new Path2D();
  path.moveTo(-41, -14);
  path.lineTo(41, -14);
  path.bezierCurveTo(46, -6, 48, 4, 46, 14);
  path.quadraticCurveTo(24, 16, 0, 30);
  path.quadraticCurveTo(-24, 16, -46, 14);
  path.bezierCurveTo(-48, 4, -46, -6, -41, -14);
  path.closePath();
  return path;
}

function drawPelvis(
  ctx: CanvasRenderingContext2D,
  p: Pose,
  pelvis: Path2D,
  suit: Suit,
  ls: number,
) {
  ctx.save();
  ctx.rotate(p.lean * 0.25);
  ctx.scale(TORSO_W, 1);
  const mat = suit === 'peter' ? MAT.denim : suit === 'spidey' ? MAT.blue : MAT.black;
  // gleicher Verlauf wie der Rumpf, damit die Übergänge nicht springen
  ctx.fillStyle = torsoGradient(ctx, mat, ls);
  ctx.fill(pelvis);
  if (suit === 'peter') {
    // Hosenschlitz
    ctx.strokeStyle = 'rgba(200,170,90,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, -2);
    ctx.quadraticCurveTo(6, 14, 0, 26);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Rumpf in V-Form: Trapezmuskel vom Hals zur Schulter, runde Schulterkuppe,
 * Latissimus, schmale Taille, leicht ausgestellte Hüfte. Unten geht er ins Becken über.
 */
function torsoPath(T: number): Path2D {
  const path = new Path2D();
  const side = (sd: number) => {
    const x = (v: number) => sd * v;
    return { x };
  };
  const R = side(1);
  // Taille und Lat-Ende skalieren mit der Rumpflänge
  const yLat = T * 0.39;
  const yMid = T * 0.29;
  const yW = T * 0.2;
  const L = side(-1);
  path.moveTo(L.x(18), T - 2);
  // Halsausschnitt
  path.quadraticCurveTo(0, T + 7, R.x(18), T - 2);
  // rechte Seite: Trapez → Schulter → Lat → Taille → Hüfte
  path.quadraticCurveTo(R.x(32), T + 2, R.x(54), T + 10);
  path.bezierCurveTo(R.x(66), T + 13, R.x(73), T + 21, R.x(73), T + 36);
  path.bezierCurveTo(R.x(74), T + 60, R.x(68), T + 84, R.x(50), yLat);
  path.bezierCurveTo(R.x(40), yMid, R.x(36), yMid, R.x(36), yW);
  path.bezierCurveTo(R.x(37), -22, R.x(42), -10, R.x(43), 2);
  // Unterkante zur Leiste hin gewölbt statt waagerecht
  path.quadraticCurveTo(0, 16, L.x(43), 2);
  // linke Seite gespiegelt
  path.bezierCurveTo(L.x(42), -10, L.x(37), -22, L.x(36), yW);
  path.bezierCurveTo(L.x(36), yMid, L.x(40), yMid, L.x(50), yLat);
  path.bezierCurveTo(L.x(68), T + 84, L.x(74), T + 60, L.x(73), T + 36);
  path.bezierCurveTo(L.x(73), T + 21, L.x(66), T + 13, L.x(54), T + 10);
  path.quadraticCurveTo(L.x(32), T + 2, L.x(18), T - 2);
  path.closePath();
  return path;
}

function torsoGradient(ctx: CanvasRenderingContext2D, mat: Mat, ls: number) {
  const g = ctx.createLinearGradient(-76 * ls, 0, 76 * ls, 0);
  g.addColorStop(0, mat.base);
  g.addColorStop(0.27, mat.light);
  g.addColorStop(0.58, mat.base);
  g.addColorStop(0.92, mat.dark);
  g.addColorStop(1, mat.rim);
  return g;
}

function drawTorso(ctx: CanvasRenderingContext2D, p: Pose, torso: Path2D, suit: Suit, ls: number) {
  const T = -BODY.torso * p.tl;
  ctx.save();
  ctx.rotate(p.lean);
  ctx.scale(TORSO_W, 1);

  if (suit === 'peter') {
    // offenes Flanellhemd über dunklem T-Shirt, Rucksackgurte
    ctx.fillStyle = torsoGradient(ctx, MAT.tee, ls);
    ctx.fill(torso);
    ctx.save();
    ctx.clip(torso);
    // Atom-Print aufs Shirt
    ctx.strokeStyle = 'rgba(230,236,255,0.7)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, T + 62, 12, 4.5, (i * Math.PI) / 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(230,236,255,0.8)';
    ctx.beginPath();
    ctx.arc(0, T + 62, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Hemdhälften
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 90, T - 10);
      ctx.lineTo(sd * 15, T - 6);
      ctx.quadraticCurveTo(sd * 22, T + 50, sd * 24, T + 100);
      ctx.lineTo(sd * 27, 10);
      ctx.lineTo(sd * 90, 10);
      ctx.closePath();
      ctx.fillStyle = torsoGradient(ctx, MAT.flannel, ls);
      ctx.fill();
      ctx.save();
      ctx.clip();
      plaid(ctx, -90, T - 10, 90, 12);
      ctx.restore();
      // Knopfleiste
      ctx.strokeStyle = 'rgba(10,16,32,0.6)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sd * 15, T - 6);
      ctx.quadraticCurveTo(sd * 22, T + 50, sd * 24, T + 100);
      ctx.lineTo(sd * 27, 10);
      ctx.stroke();
      if (sd > 0) {
        ctx.fillStyle = '#d9d3c4';
        for (let y = T + 30; y < -10; y += 26) {
          ctx.beginPath();
          ctx.arc(sd * 27, y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // Rucksackgurte
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#1b1d24';
      ctx.beginPath();
      ctx.moveTo(sd * 34, T - 2);
      ctx.lineTo(sd * 46, T - 1);
      ctx.lineTo(sd * 50, T + 104);
      ctx.lineTo(sd * 40, T + 104);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5b6070';
      ctx.fillRect(sd * 45 - 6, T + 70, 12, 7);
    }
    ctx.restore();
    // Kragen
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 15, T - 6);
      ctx.lineTo(sd * 34, T + 2);
      ctx.lineTo(sd * 19, T + 22);
      ctx.closePath();
      ctx.fillStyle = MAT.flannel.dark;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Hemdzipfel unten
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 27, -6);
      ctx.lineTo(sd * 42, -6);
      ctx.quadraticCurveTo(sd * 45, 6, sd * 43, 12);
      ctx.quadraticCurveTo(sd * 34, 8, sd * 27, 12);
      ctx.closePath();
      ctx.fillStyle = MAT.flannel.base;
      ctx.fill();
      ctx.save();
      ctx.clip();
      plaid(ctx, -60, -10, 60, 16);
      ctx.restore();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (suit === 'spidey') {
    ctx.fillStyle = torsoGradient(ctx, MAT.red, ls);
    ctx.fill(torso);
    ctx.save();
    ctx.clip(torso);
    // Netz: Strahlen vom Emblem aus und Bögen
    const cx = 0;
    const cy = T + 70;
    ctx.strokeStyle = 'rgba(12,0,4,0.6)';
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    const rays = 16;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 200, cy + Math.sin(a) * 200);
    }
    for (let r = 16; r < 200; r += 16) {
      for (let i = 0; i < rays; i++) {
        const a0 = (i / rays) * Math.PI * 2;
        const a1 = ((i + 1) / rays) * Math.PI * 2;
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
    raisedStroke(ctx);
    // blaue Seitenteile
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 90, T + 56);
      ctx.quadraticCurveTo(sd * 54, T + 62, sd * 40, T + 96);
      ctx.quadraticCurveTo(sd * 29, -50, sd * 27, -30);
      ctx.lineTo(sd * 90, -30);
      ctx.closePath();
      ctx.fillStyle = torsoGradient(ctx, MAT.blue, ls);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    // Gürtel und blaue Hüfte
    ctx.fillStyle = torsoGradient(ctx, MAT.blue, ls);
    ctx.fillRect(-90, -18, 180, 40);
    ctx.fillStyle = torsoGradient(ctx, MAT.red, ls);
    ctx.fillRect(-90, -32, 180, 15);
    ctx.strokeStyle = 'rgba(12,0,4,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -84; x < 90; x += 12) {
      ctx.moveTo(x, -32);
      ctx.lineTo(x + 2, -17);
    }
    ctx.moveTo(-90, -24.5);
    ctx.lineTo(90, -24.5);
    ctx.stroke();
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-90, -33, 180, 1.4);
    ctx.fillRect(-90, -18, 180, 1.4);
    muscleLines(ctx, T, 'rgba(60,0,10,0.32)', 'rgba(255,150,150,0.22)');
    ctx.restore();
    smallSpider(ctx, 0, T + 64);
    ctx.restore();
    return;
  }

  // schwarzer Anzug
  ctx.fillStyle = torsoGradient(ctx, MAT.black, ls);
  ctx.fill(torso);
  ctx.save();
  ctx.clip(torso);
  muscleLines(ctx, T, 'rgba(0,0,0,0.45)', 'rgba(140,170,255,0.18)');
  // Glanz
  const g = ctx.createRadialGradient(-26 * ls, T + 44, 2, -26 * ls, T + 44, 44);
  g.addColorStop(0, 'rgba(170,195,255,0.2)');
  g.addColorStop(1, 'rgba(170,195,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-80, T - 10, 160, 120);
  bigSpider(ctx, T);
  ctx.restore();
  ctx.restore();
}

/** weicher Licht- oder Schattenfleck */
function softBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, color);
  g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/** Brust, Bauch und Flanken als weiche Schattierung mit feinen Muskelfugen */
function muscleLines(ctx: CanvasRenderingContext2D, T: number, color: string, light: string) {
  const L = (a: number) => light.replace(/[\d.]+\)$/, `${a})`);
  for (const sd of [-1, 1]) {
    const k = sd < 0 ? 1 : 0.55;
    // Brustmuskel: heller Bauch, dunkle Unterkante
    softBlob(ctx, sd * 24, T + 40, 28, 18, L(0.9 * k));
    // Sixpack
    for (let row = 0; row < 3; row++) softBlob(ctx, sd * 11, T + 82 + row * 24, 12, 9, L(0.75 * k));
    // Sägemuskel und schräge Bauchmuskeln an den Flanken
    softBlob(ctx, sd * 40, T + 92, 10, 26, L(0.5 * k));
  }
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (const sd of [-1, 1]) {
    ctx.moveTo(sd * 3, T + 30);
    ctx.quadraticCurveTo(sd * 12, T + 64, sd * 50, T + 52);
    ctx.moveTo(sd * 28, T + 74);
    ctx.bezierCurveTo(sd * 30, T + 100, sd * 28, T + 130, sd * 18, -36);
  }
  ctx.moveTo(0, T + 66);
  ctx.lineTo(0, -34);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const y of [T + 93, T + 117, T + 141]) {
    ctx.moveTo(-20, y);
    ctx.quadraticCurveTo(0, y + 5, 20, y);
  }
  for (const sd of [-1, 1])
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(sd * (50 - i * 2), T + 70 + i * 13);
      ctx.quadraticCurveTo(sd * (42 - i), T + 74 + i * 13, sd * (36 - i), T + 70 + i * 14);
    }
  ctx.stroke();
}

function smallSpider(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#0b0b0e';
  ctx.strokeStyle = '#0b0b0e';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (const sd of [-1, 1]) {
    ctx.moveTo(sd * 3, -4);
    ctx.quadraticCurveTo(sd * 12, -12, sd * 14, -20);
    ctx.moveTo(sd * 3, -2);
    ctx.quadraticCurveTo(sd * 14, -4, sd * 18, -12);
    ctx.moveTo(sd * 3, 2);
    ctx.quadraticCurveTo(sd * 14, 4, sd * 17, 12);
    ctx.moveTo(sd * 3, 4);
    ctx.quadraticCurveTo(sd * 10, 12, sd * 12, 20);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -1, 4.5, 6.5, 0, 0, Math.PI * 2);
  ctx.ellipse(0, 9, 3.6, 6, 0, 0, Math.PI * 2);
  ctx.arc(0, -9, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** großes weißes Spinnen-Emblem des Symbionten-Anzugs, Beine über die Schultern */
function bigSpider(ctx: CanvasRenderingContext2D, T: number) {
  ctx.fillStyle = '#f2f4fa';
  ctx.strokeStyle = '#f2f4fa';
  ctx.lineCap = 'round';
  const cy = T + 62;
  for (const sd of [-1, 1]) {
    const legs: [V, V, V, number][] = [
      [[sd * 8, cy - 10], [sd * 20, T + 6], [sd * 30, T - 12], 8],
      [[sd * 9, cy - 4], [sd * 46, T + 20], [sd * 64, T + 6], 7.5],
      [[sd * 9, cy + 6], [sd * 50, cy + 18], [sd * 58, cy + 64], 7],
      [[sd * 7, cy + 12], [sd * 30, cy + 48], [sd * 34, cy + 100], 6.5],
    ];
    for (const [a, c, b, w] of legs) {
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]);
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.ellipse(0, cy - 2, 11, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, cy + 26, 8, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, cy - 21, 6, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawNeck(ctx: CanvasRenderingContext2D, neck: Limb, suit: Suit, ls: number) {
  const mat = suit === 'peter' ? MAT.skin : suit === 'spidey' ? MAT.red : MAT.black;
  fillLimb(ctx, neck.path, neck.a, neck.b, neck.prof, mat, ls);
  if (suit === 'spidey') webLimb(ctx, neck.path, neck.a, neck.b, neck.prof);
  // Schatten unterm Kinn
  ctx.save();
  ctx.clip(neck.path);
  const g = ctx.createLinearGradient(neck.b[0], neck.b[1], neck.a[0], neck.a[1]);
  g.addColorStop(0, suit === 'black' ? 'rgba(0,0,0,0.5)' : 'rgba(40,0,10,0.35)');
  g.addColorStop(0.6, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fill(neck.path);
  ctx.restore();
}

/** T-Shirt-Kragen über dem Halsansatz */
function drawCollar(ctx: CanvasRenderingContext2D, rig: Rig) {
  ctx.save();
  ctx.translate(rig.neckBase[0], rig.neckBase[1]);
  ctx.strokeStyle = '#2a2c33';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(0, -3, 17, 8, 0, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.restore();
}

/* ---------- Kopf ---------- */

function headPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.bezierCurveTo(27, -50, 40, -33, 40, -8);
  ctx.bezierCurveTo(40, 14, 33, 30, 20, 40);
  ctx.bezierCurveTo(13, 46, 6, 48, 0, 48);
  ctx.bezierCurveTo(-6, 48, -13, 46, -20, 40);
  ctx.bezierCurveTo(-33, 30, -40, 14, -40, -8);
  ctx.bezierCurveTo(-40, -33, -27, -50, 0, -50);
  ctx.closePath();
}

function headGradient(ctx: CanvasRenderingContext2D, mat: Mat, ls: number) {
  const g = ctx.createRadialGradient(-12 * ls, -16, 4, 0, 0, 52);
  g.addColorStop(0, mat.light);
  g.addColorStop(0.55, mat.base);
  g.addColorStop(0.92, mat.dark);
  g.addColorStop(1, mat.rim);
  return g;
}

function drawHead(ctx: CanvasRenderingContext2D, p: Pose, rig: Rig, suit: Suit, time: number) {
  const ls = Math.cos(p.rot) >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(rig.head[0], rig.head[1]);
  ctx.rotate(rig.headAng);
  if (suit === 'peter') drawPeterHead(ctx, p, ls, time);
  else drawMask(ctx, p, suit, ls);
  ctx.restore();
}

function drawPeterHead(ctx: CanvasRenderingContext2D, p: Pose, ls: number, time: number) {
  // Haare hinten
  ctx.fillStyle = '#24150b';
  ctx.beginPath();
  ctx.ellipse(0, -18, 42, 35, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // Ohren
  for (const sd of [-1, 1]) {
    ctx.fillStyle = MAT.skin.dark;
    ctx.beginPath();
    ctx.ellipse(sd * 40, 0, 7, 12, sd * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,60,40,0.4)';
    ctx.beginPath();
    ctx.ellipse(sd * 40, 1, 3, 7, sd * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  headPath(ctx);
  ctx.fillStyle = headGradient(ctx, MAT.skin, ls);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Wangen
  for (const sd of [-1, 1]) {
    const g = ctx.createRadialGradient(sd * 24, 16, 0, sd * 24, 16, 11);
    g.addColorStop(0, 'rgba(230,110,100,0.32)');
    g.addColorStop(1, 'rgba(230,110,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sd * 24 - 12, 4, 24, 24);
  }

  // Augen
  const blink = p.blink;
  const look = p.lookX * 3;
  for (const sd of [-1, 1]) {
    const ex = sd * 15;
    const ey = -4;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(1, Math.max(0.08, 1 - blink));
    ctx.fillStyle = '#fbfaf6';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#5b8bb8';
    ctx.beginPath();
    ctx.arc(look, 0.8, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d1520';
    ctx.beginPath();
    ctx.arc(look, 0.8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(look - 1.5, -1.3, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#3a2416';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0.6, 8, 5, 0, Math.PI * 1.02, Math.PI * 1.98);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,65,45,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -1.5, 8.5, 6, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();
    // Augenbrauen
    const by = -17 - p.brow * 5;
    ctx.strokeStyle = '#3b2415';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(ex - sd * 8, by - 1);
    ctx.quadraticCurveTo(ex, by - 1, ex + sd * 9, by + 1.5 + p.brow * 1.5);
    ctx.stroke();
  }

  // Brille
  ctx.strokeStyle = '#2b1c14';
  ctx.lineWidth = 1.7;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(sd * 15 - 11.5, -12, 23, 16, 7.5);
    ctx.stroke();
    // Spiegelung im Glas
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(sd * 15 - 11, -11.5, 22, 15, 5);
    ctx.clip();
    ctx.fillStyle = 'rgba(200,220,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(sd * 15 - 12, 2);
    ctx.lineTo(sd * 15 - 2, -12);
    ctx.lineTo(sd * 15 + 3, -12);
    ctx.lineTo(sd * 15 - 7, 4);
    ctx.fill();
    ctx.restore();
    // Bügel zum Ohr
    ctx.beginPath();
    ctx.moveTo(sd * 27.5, -6);
    ctx.lineTo(sd * 39, -4);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-2.5, -6);
  ctx.quadraticCurveTo(0, -9, 2.5, -6);
  ctx.stroke();

  // Nase: Schattenseite, Spitze, Flügel
  ctx.strokeStyle = 'rgba(150,85,58,0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(3 * ls, 0);
  ctx.quadraticCurveTo(4.5 * ls, 7, 4 * ls, 12);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(140,72,50,0.55)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-4.5, 12);
  ctx.quadraticCurveTo(-1.5, 15.5, 0, 14.5);
  ctx.quadraticCurveTo(1.5, 15.5, 4.5, 12);
  ctx.stroke();

  // Mund: Grinsen ↔ offenes „O“
  const m = p.mouth;
  ctx.save();
  ctx.translate(0, 25);
  if (m < 0.15) {
    ctx.strokeStyle = '#7a3a2c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, -1);
    ctx.quadraticCurveTo(0, 6, 10, -2);
    ctx.stroke();
  } else {
    const w = 6 + m * 4;
    const h = 2 + m * 7;
    ctx.fillStyle = '#4a1712';
    ctx.beginPath();
    ctx.ellipse(0, 1, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d45d5d';
    ctx.beginPath();
    ctx.ellipse(0, 1 + h * 0.55, w * 0.6, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6f1ea';
    ctx.fillRect(-w * 0.6, 1 - h, w * 1.2, Math.min(3, h * 0.5));
  }
  ctx.restore();

  // Haare vorne: kurz, Scheitel links, Pony schräg in die Stirn gekämmt
  const sway = Math.sin(time * 3) * 0.8;
  ctx.fillStyle = '#2e1b0f';
  ctx.beginPath();
  ctx.moveTo(-41, -8);
  ctx.bezierCurveTo(-45, -36, -30, -62, -4, -64);
  ctx.bezierCurveTo(24, -67, 45, -48, 41, -10);
  ctx.quadraticCurveTo(38, -20, 34, -24);
  // stufige Ponykante, links (Scheitel) kurz, rechts tiefer
  ctx.lineTo(30 + sway, -22);
  ctx.lineTo(26, -28);
  ctx.lineTo(18 + sway, -25);
  ctx.lineTo(13, -32);
  ctx.lineTo(4 + sway, -30);
  ctx.lineTo(-2, -37);
  ctx.lineTo(-12 + sway, -36);
  ctx.lineTo(-17, -42);
  ctx.quadraticCurveTo(-30, -40, -34, -30);
  ctx.quadraticCurveTo(-38, -20, -41, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Strähnen folgen dem Kamm nach rechts unten
  ctx.strokeStyle = 'rgba(150,100,62,0.5)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-18, -58);
  ctx.quadraticCurveTo(4, -56, 22, -34);
  ctx.moveTo(-10, -52);
  ctx.quadraticCurveTo(10, -48, 30, -28);
  ctx.moveTo(-26, -52);
  ctx.quadraticCurveTo(-8, -50, 6, -36);
  // Scheitel
  ctx.moveTo(-20, -63);
  ctx.quadraticCurveTo(-24, -56, -30, -50);
  ctx.stroke();
}

function drawMask(ctx: CanvasRenderingContext2D, p: Pose, suit: Suit, ls: number) {
  const mat = suit === 'spidey' ? MAT.red : MAT.black;
  headPath(ctx);
  ctx.fillStyle = headGradient(ctx, mat, ls);
  ctx.fill();

  ctx.save();
  headPath(ctx);
  ctx.clip();
  if (suit === 'spidey') {
    // Netz der Maske: Strahlen von der Nase, Bögen drum herum
    const cx = 0;
    const cy = 6;
    ctx.strokeStyle = 'rgba(12,0,4,0.62)';
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    const rays = 14;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + 0.11;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90);
    }
    for (let r = 11; r < 90; r += 11) {
      for (let i = 0; i < rays; i++) {
        const a0 = (i / rays) * Math.PI * 2 + 0.11;
        const a1 = ((i + 1) / rays) * Math.PI * 2 + 0.11;
        const am = (a0 + a1) / 2;
        ctx.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
        ctx.quadraticCurveTo(
          cx + Math.cos(am) * r * 0.84,
          cy + Math.sin(am) * r * 0.84,
          cx + Math.cos(a1) * r,
          cy + Math.sin(a1) * r,
        );
      }
    }
    raisedStroke(ctx);
  } else {
    // Glanzkante auf dem Symbionten-Kopf
    const g = ctx.createLinearGradient(-30 * ls, -40, 10 * ls, 0);
    g.addColorStop(0, 'rgba(170,195,255,0.3)');
    g.addColorStop(0.5, 'rgba(170,195,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(-14 * ls, -28, 18, 10, -0.5 * ls, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  headPath(ctx);
  ctx.strokeStyle = suit === 'spidey' ? OUTLINE : 'rgba(0,0,0,0.9)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Augengläser – beim Zukneifen werden sie schmal und schräg
  const sq = p.squint;
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.scale(sd, 1);
    ctx.translate(-20, -9);
    ctx.scale(1, 1 - sq * 0.5);
    ctx.rotate(sq * 0.12);
    ctx.translate(20, 9);
    ctx.beginPath();
    if (suit === 'spidey') {
      ctx.moveTo(-6, 2);
      ctx.quadraticCurveTo(-9, -20, -29, -25);
      ctx.quadraticCurveTo(-39, -24, -36, -10);
      ctx.quadraticCurveTo(-29, 6, -6, 2);
    } else {
      ctx.moveTo(-4, 3);
      ctx.quadraticCurveTo(-10, -20, -32, -29);
      ctx.quadraticCurveTo(-42, -28, -39, -10);
      ctx.quadraticCurveTo(-28, 8, -4, 3);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(-30, -24, -8, 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, suit === 'spidey' ? '#d9e2f2' : '#c9d3ea');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#08080b';
    ctx.lineWidth = suit === 'spidey' ? 4.5 : 5.5;
    ctx.stroke();
    // Spiegelung: das Fenster im Glas
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(150,170,230,0.28)';
    ctx.beginPath();
    ctx.moveTo(-30, -22);
    ctx.lineTo(-22, -24);
    ctx.lineTo(-14, -2);
    ctx.lineTo(-22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(-27, -16, 2.6, 4, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }
}

/* ---------- Arme und Hände ---------- */

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
  torso: Path2D,
) {
  const mat = suit === 'peter' ? MAT.flannel : suit === 'spidey' ? MAT.red : MAT.black;
  const upper = limb(shoulder, elbow, PROFILE.upper);
  const fore = limb(elbow, wrist, PROFILE.fore);
  const both = new Path2D();
  both.addPath(upper.path);
  both.addPath(fore.path);
  const ink = suit === 'black' ? 'rgba(0,0,0,0.85)' : OUTLINE;
  const soft =
    suit === 'black'
      ? 'rgba(0,0,0,0.35)'
      : suit === 'peter'
        ? 'rgba(10,16,32,0.3)'
        : 'rgba(70,0,12,0.32)';
  strokeArmOutline(ctx, both, torso, shoulder, ink, soft, 3.2, 44);
  fillLimb(ctx, fore.path, elbow, wrist, fore.prof, mat, ls);
  fillLimb(ctx, upper.path, shoulder, elbow, upper.prof, mat, ls);
  if (suit !== 'peter') armMuscles(ctx, upper, fore, suit);

  if (suit === 'peter') {
    // hochgekrempelte Ärmel: Unterarm ab der Mitte nackt
    ctx.save();
    ctx.clip(fore.path);
    ctx.fillStyle = limbFill(ctx, elbow, wrist, 17, MAT.skin, ls);
    ctx.fill(regionFrom(elbow, wrist, 0.46));
    ctx.restore();
    const roll = mix(elbow, wrist, 0.46);
    // Härchen-Schatten und Sehnen
    ctx.strokeStyle = 'rgba(150,90,60,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const m1 = mix(roll, wrist, 0.3);
    const m2 = mix(roll, wrist, 0.8);
    ctx.moveTo(m1[0] + 3, m1[1]);
    ctx.lineTo(m2[0] + 2, m2[1]);
    ctx.stroke();
    plaidLimb(ctx, upper.path, shoulder, elbow, 24);
    ctx.save();
    ctx.clip(regionFrom(wrist, elbow, 0.5));
    plaidLimb(ctx, fore.path, elbow, wrist, 18);
    ctx.restore();
    // Falten in der Armbeuge
    ctx.strokeStyle = 'rgba(10,16,32,0.5)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const k of [0.82, 0.9]) {
      const p0 = mix(shoulder, elbow, k);
      ctx.moveTo(p0[0] - 9, p0[1] - 2);
      ctx.quadraticCurveTo(p0[0], p0[1] + 3, p0[0] + 9, p0[1] - 2);
    }
    ctx.stroke();
    // aufgerollter Stoffwulst
    const r0 = mix(elbow, wrist, 0.38);
    const r1 = mix(elbow, wrist, 0.5);
    const rollPath = profilePath(r0, r1, [18, 17.2]);
    fillLimb(ctx, rollPath, r0, r1, [18, 17.2], MAT.flannel, ls);
    plaidLimb(ctx, rollPath, r0, r1, 18);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.stroke(rollPath);
    // Armbanduhr links
    if (sd < 0) {
      const w0 = mix(elbow, wrist, 0.86);
      const w1 = mix(elbow, wrist, 0.95);
      drawLimb(
        ctx,
        w0,
        w1,
        13.4,
        13.4,
        { base: '#2b2420', dark: '#120e0b', light: '#4a3f37', rim: '#6d7a9a' },
        ls,
      );
      const wm = mix(w0, w1, 0.5);
      ctx.fillStyle = '#c9ccd3';
      ctx.beginPath();
      ctx.arc(wm[0], wm[1], 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a2440';
      ctx.beginPath();
      ctx.arc(wm[0], wm[1], 5.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wm[0], wm[1]);
      ctx.lineTo(wm[0], wm[1] - 4);
      ctx.moveTo(wm[0], wm[1]);
      ctx.lineTo(wm[0] + 3, wm[1] + 1);
      ctx.stroke();
    }
  } else if (suit === 'spidey') {
    webLimb(ctx, fore.path, elbow, wrist, fore.prof);
    webLimb(ctx, upper.path, shoulder, elbow, upper.prof);
    // blauer Streifen an der Oberarm-Innenseite, läuft zur Achsel hin aus
    ctx.save();
    ctx.clip(upper.path);
    const ang = Math.atan2(elbow[1] - shoulder[1], elbow[0] - shoulder[0]);
    const len = Math.hypot(elbow[0] - shoulder[0], elbow[1] - shoulder[1]);
    ctx.translate(shoulder[0], shoulder[1]);
    ctx.rotate(ang);
    // Innenseite = die dem Rumpf zugewandte Seite (bei erhobenem Arm die Unterseite)
    const toCore: V = [-shoulder[0], 100];
    const inner = -Math.sin(ang) * toCore[0] + Math.cos(ang) * toCore[1] >= 0 ? 1 : -1;
    ctx.scale(1, inner);
    ctx.beginPath();
    ctx.moveTo(4, 30);
    ctx.bezierCurveTo(10, 12, 26, 8, 40, 8);
    ctx.lineTo(len + 20, 7);
    ctx.lineTo(len + 20, 30);
    ctx.closePath();
    ctx.fillStyle = MAT.blue.base;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    deltoidLine(ctx, upper, 'rgba(70,0,12,0.3)');
  } else {
    glossStreak(ctx, shoulder, elbow, 19);
    glossStreak(ctx, elbow, wrist, 15);
  }
  // Ellbogen: weicher Schatten statt Naht
  ctx.save();
  ctx.clip(both);
  const eg = ctx.createRadialGradient(elbow[0], elbow[1], 0, elbow[0], elbow[1], 18);
  eg.addColorStop(0, suit === 'black' ? 'rgba(0,0,0,0.25)' : 'rgba(20,0,10,0.16)');
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = eg;
  ctx.fillRect(elbow[0] - 20, elbow[1] - 20, 40, 40);
  ctx.restore();

  const foreAng = Math.atan2(wrist[1] - elbow[1], wrist[0] - elbow[0]);
  let d = dir - foreAng;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  drawParamHand(ctx, wrist, foreAng + d * dirW + wristBend, hand, sd, HAND_STYLE[suit], 1.05, 1.02);
}

/** Deltamuskel, Bizeps, Trizeps und Unterarm als weiche Licht- und Schattenflecken */
function armMuscles(ctx: CanvasRenderingContext2D, upper: Limb, fore: Limb, suit: Suit) {
  const lite = suit === 'black' ? 'rgba(150,180,255,0.2)' : 'rgba(255,150,150,0.24)';
  const dark = suit === 'black' ? 'rgba(0,0,0,0.5)' : 'rgba(40,0,10,0.3)';
  // Beugeseite: dorthin, wo der Unterarm abknickt
  const ua = Math.atan2(upper.b[1] - upper.a[1], upper.b[0] - upper.a[0]);
  const n: V = [-Math.sin(ua), Math.cos(ua)];
  const bSide = (fore.b[0] - fore.a[0]) * n[0] + (fore.b[1] - fore.a[1]) * n[1] >= 0 ? 1 : -1;
  for (const [seg, spots] of [
    [
      upper,
      [
        [0.14, 0, 15, 12, lite],
        [0.62, bSide * 4, 18, 7, lite],
        [0.58, -bSide * 11, 22, 6, dark],
      ],
    ],
    [
      fore,
      [
        [0.24, -bSide * 3, 18, 6, lite],
        [0.55, bSide * 8, 24, 4, dark],
      ],
    ],
  ] as [Limb, [number, number, number, number, string][]][]) {
    const len = Math.hypot(seg.b[0] - seg.a[0], seg.b[1] - seg.a[1]);
    ctx.save();
    ctx.clip(seg.path);
    ctx.translate(seg.a[0], seg.a[1]);
    ctx.rotate(Math.atan2(seg.b[1] - seg.a[1], seg.b[0] - seg.a[0]));
    for (const [t, y, rx, ry, c] of spots) softBlob(ctx, len * t, y, rx, ry, c);
    ctx.restore();
  }
}

/** Bogen, wo der Deltamuskel in den Oberarm übergeht */
function deltoidLine(ctx: CanvasRenderingContext2D, upper: Limb, color: string) {
  const { a, b } = upper;
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  ctx.save();
  ctx.clip(upper.path);
  ctx.translate(a[0], a[1]);
  ctx.rotate(ang);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(len * 0.12, -22);
  ctx.quadraticCurveTo(len * 0.5, -14, len * 0.52, 0);
  ctx.quadraticCurveTo(len * 0.5, 14, len * 0.12, 22);
  ctx.stroke();
  ctx.restore();
}

const HAND_STYLE: Record<Suit, HandStyle> = {
  peter: {
    base: MAT.skin.base,
    light: MAT.skin.light,
    dark: MAT.skin.dark,
    kind: 'skin',
    outline: OUTLINE,
    lineScale: 1.6,
  },
  spidey: {
    base: MAT.red.base,
    light: MAT.red.light,
    dark: MAT.red.dark,
    kind: 'spidey',
    outline: OUTLINE,
    lineScale: 1.6,
  },
  black: {
    base: MAT.black.base,
    light: '#3a4562',
    dark: MAT.black.dark,
    kind: 'black',
    outline: 'rgba(0,0,0,0.9)',
    lineScale: 1.6,
  },
};

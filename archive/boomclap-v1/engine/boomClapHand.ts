/**
 * Parametrische Hand mit Fingergelenken – für Ganzkörper und Nahaufnahme.
 * Jede Geste ist ein Satz Zahlen (Beugung, seitliches Krümmen, Spreizung),
 * dadurch gehen Gesten fließend ineinander über statt umzuspringen.
 *
 * Lokales System: +x zeigt vom Handgelenk zu den Fingern, −y ist die
 * Daumenseite (wird für die linke Hand gespiegelt). Einheiten wie im
 * Ganzkörper-Rig, die Nahaufnahme skaliert hoch.
 */

export type HandShape = 'relaxed' | 'fist' | 'flat' | 'thwip' | 'open' | 'point' | 'claw' | 'heart';

/** Daumen, Zeige-, Mittel-, Ring-, kleiner Finger */
type Five = [number, number, number, number, number];

export interface HandParams {
  /** Einrollen zur Handfläche 0 … 1 (verkürzt den Finger perspektivisch) */
  curl: Five;
  /** seitliches Krümmen pro Gelenk in rad (+ = zur Daumenseite) */
  bend: Five;
  /** Finger spreizen 0 … 1 */
  spread: number;
  /** Grundwinkel des Daumens in rad */
  thumbAng: number;
}

const P = (curl: Five, bend: Five, spread: number, thumbAng: number): HandParams => ({
  curl,
  bend,
  spread,
  thumbAng,
});

export const HAND_SHAPES: Record<HandShape, HandParams> = {
  relaxed: P([0.25, 0.22, 0.28, 0.34, 0.4], [0.1, 0.1, 0.08, 0.06, 0.04], 0.25, -0.75),
  fist: P([0.55, 1, 1, 1, 1], [0.7, 0, 0, 0, 0], 0, -0.25),
  flat: P([0.05, 0, 0, 0, 0], [0.05, 0, 0, 0, 0], 0, -0.35),
  open: P([0, 0, 0, 0, 0], [-0.1, 0.02, 0, -0.02, -0.06], 1, -1.05),
  claw: P([0.25, 0.5, 0.5, 0.5, 0.55], [-0.1, 0.32, 0.3, 0.3, 0.3], 0.85, -0.95),
  thwip: P([0, 0, 1, 1, 0], [-0.2, 0, 0, 0, -0.05], 0.75, -1.2),
  point: P([0.6, 0, 1, 1, 1], [0.5, 0, 0, 0, 0], 0.1, -0.4),
  // Herz: Finger krümmen sich zur Mitte, die Daumen zeigen nach unten
  heart: P([0.05, 0, 0.02, 0.04, 0.08], [0.1, 0.82, 0.8, 0.78, 0.76], 0, -2.6),
};

export function blendHand(a: HandParams, b: HandParams, t: number): HandParams {
  const mix5 = (x: Five, y: Five): Five => x.map((v, i) => v + (y[i] - v) * t) as Five;
  return {
    curl: mix5(a.curl, b.curl),
    bend: mix5(a.bend, b.bend),
    spread: a.spread + (b.spread - a.spread) * t,
    thumbAng: a.thumbAng + (b.thumbAng - a.thumbAng) * t,
  };
}

/** feines Fingerspiel, damit die Hände nie ganz starr sind */
export function fidget(h: HandParams, time: number, seed: number, amount = 1): HandParams {
  const out = blendHand(h, h, 0);
  for (let i = 0; i < 5; i++) {
    out.curl[i] = Math.min(
      1,
      Math.max(0, out.curl[i] + Math.sin(time * (1.3 + i * 0.37) + seed + i) * 0.04 * amount),
    );
    out.bend[i] += Math.sin(time * (0.9 + i * 0.29) + seed * 2 + i) * 0.03 * amount;
  }
  return out;
}

export interface HandStyle {
  base: string;
  light: string;
  dark: string;
  /** Peter: Fingernägel und Knöchelfalten; Anzüge: Nähte bzw. Netz */
  kind: 'skin' | 'spidey' | 'black';
  outline: string;
  lineScale: number;
}

const FINGERS = [
  // Basis (an den Knöcheln), Glied-Längen, Radius, Spreizrichtung
  { base: [21, -7.6], len: [9, 6, 5], r: 3.3, spread: -0.14 },
  { base: [22, -2.5], len: [10, 6.6, 5.4], r: 3.4, spread: -0.04 },
  { base: [21.5, 2.6], len: [9.5, 6.2, 5], r: 3.2, spread: 0.06 },
  { base: [20, 7.4], len: [7.6, 5, 4.2], r: 2.8, spread: 0.18 },
] as const;

type V = [number, number];

function capsule(ctx: CanvasRenderingContext2D, a: V, b: V, ra: number, rb: number) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const d = Math.max(0.01, Math.hypot(b[0] - a[0], b[1] - a[1]));
  const off = Math.asin(Math.max(-0.95, Math.min(0.95, (ra - rb) / d)));
  ctx.beginPath();
  ctx.arc(a[0], a[1], ra, ang + Math.PI / 2 - off, ang + (3 * Math.PI) / 2 + off);
  ctx.arc(b[0], b[1], rb, ang - Math.PI / 2 + off, ang + Math.PI / 2 - off);
  ctx.closePath();
}

/** Glieder eines Fingers berechnen: gebeugte Glieder werden kürzer, gekrümmte drehen sich */
function chain(base: V, ang: number, len: readonly number[], curl: number, bend: number): V[] {
  const pts: V[] = [base];
  let a = ang;
  let p = base;
  len.forEach((l, j) => {
    const c = Math.min(1, curl * (j === 0 ? 0.8 : 1.15));
    const shorten = Math.cos(c * 1.35);
    a += bend * (j === 0 ? 0.6 : 1) + c * 0.18;
    p = [p[0] + Math.cos(a) * l * shorten, p[1] + Math.sin(a) * l * shorten];
    pts.push(p);
  });
  return pts;
}

/**
 * Hand zeichnen. `ang` ist die Richtung vom Handgelenk zu den Fingern,
 * `sd` spiegelt (−1 linke Hand, +1 rechte Hand), `sx`/`sy` skalieren.
 */
export function drawParamHand(
  ctx: CanvasRenderingContext2D,
  wrist: V,
  ang: number,
  h: HandParams,
  sd: number,
  style: HandStyle,
  sx = 1,
  sy = 1,
) {
  ctx.save();
  ctx.translate(wrist[0], wrist[1]);
  ctx.rotate(ang);
  ctx.scale(sx, sy * sd);
  const lw = 0.6 * style.lineScale;

  const fill = (x0: number, y0: number, x1: number, y1: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, style.light);
    g.addColorStop(0.55, style.base);
    g.addColorStop(1, style.dark);
    return g;
  };

  // Finger berechnen
  const fingers = FINGERS.map((f, i) => {
    const curl = h.curl[i + 1];
    const bend = -h.bend[i + 1];
    const a0 = f.spread * (0.4 + h.spread * 1.6);
    return { f, curl, pts: chain([f.base[0], f.base[1]], a0, f.len, curl, bend) };
  });
  // gestreckte Finger liegen hinter der Handfläche, eingerollte davor
  const drawFinger = (fi: (typeof fingers)[number]) => {
    const { f, pts, curl } = fi;
    for (let j = 0; j < 3; j++) {
      const ra = f.r * (1 - j * 0.08);
      const rb = f.r * (0.92 - j * 0.08);
      capsule(ctx, pts[j], pts[j + 1], ra, rb);
      ctx.fillStyle = fill(pts[j][0], pts[j][1] - ra, pts[j][0], pts[j][1] + ra);
      ctx.fill();
      ctx.strokeStyle = style.outline;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
    // Gelenkfalten
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = lw * 0.8;
    for (let j = 1; j < 3; j++) {
      const [x, y] = pts[j];
      const a =
        Math.atan2(pts[j + 1][1] - pts[j - 1][1], pts[j + 1][0] - pts[j - 1][0]) + Math.PI / 2;
      const r = f.r * 0.6;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.stroke();
    }
    const tip = pts[3];
    const prev = pts[2];
    const ta = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
    if (style.kind === 'skin' && curl < 0.6) {
      ctx.save();
      ctx.translate(tip[0], tip[1]);
      ctx.rotate(ta);
      ctx.fillStyle = 'rgba(255,226,214,0.85)';
      ctx.beginPath();
      ctx.ellipse(-f.r * 0.55, 0, f.r * 0.75, f.r * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(-f.r * 0.25, -f.r * 0.18, f.r * 0.28, f.r * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (style.kind === 'spidey') {
      ctx.strokeStyle = 'rgba(18,0,5,0.6)';
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(tip[0], tip[1]);
      ctx.stroke();
    }
  };
  fingers.filter((fi) => fi.curl < 0.55).forEach(drawFinger);

  // Handfläche: zu den Knöcheln hin breiter
  ctx.beginPath();
  ctx.moveTo(-3, -9.5);
  ctx.quadraticCurveTo(10, -12.5, 22, -10.5);
  ctx.quadraticCurveTo(25, -1, 22.5, 10);
  ctx.quadraticCurveTo(10, 12.5, -3, 9.5);
  ctx.quadraticCurveTo(-5, 0, -3, -9.5);
  ctx.closePath();
  ctx.fillStyle = fill(0, -12, 0, 12);
  ctx.fill();
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = lw;
  ctx.stroke();
  // Sehnen und Knöchel auf dem Handrücken
  ctx.strokeStyle = style.kind === 'skin' ? 'rgba(150,85,60,0.28)' : 'rgba(0,0,0,0.25)';
  ctx.lineWidth = lw;
  for (const f of FINGERS) {
    ctx.beginPath();
    ctx.moveTo(4, f.base[1] * 0.55);
    ctx.lineTo(f.base[0] - 2, f.base[1]);
    ctx.stroke();
  }
  ctx.fillStyle = style.kind === 'black' ? 'rgba(170,190,255,0.25)' : 'rgba(255,255,255,0.18)';
  for (const f of FINGERS) {
    ctx.beginPath();
    ctx.ellipse(f.base[0] - 1, f.base[1], 2, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  fingers.filter((fi) => fi.curl >= 0.55).forEach(drawFinger);

  // Daumen
  const tc = h.curl[0];
  const thumb = chain([4, -9], h.thumbAng, [7.5, 6.4], tc, -h.bend[0]);
  thumb.unshift([0, -6]);
  for (let j = 0; j < 3; j++) {
    const r = j === 0 ? 4.6 : 3.9 - (j - 1) * 0.3;
    capsule(ctx, thumb[j], thumb[j + 1], r, r * 0.9);
    ctx.fillStyle = fill(thumb[j][0] - r, thumb[j][1], thumb[j][0] + r, thumb[j][1]);
    ctx.fill();
    ctx.strokeStyle = style.outline;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  if (style.kind === 'skin' && tc < 0.6) {
    const tip = thumb[3];
    const ta = Math.atan2(tip[1] - thumb[2][1], tip[0] - thumb[2][0]);
    ctx.save();
    ctx.translate(tip[0], tip[1]);
    ctx.rotate(ta);
    ctx.fillStyle = 'rgba(255,226,214,0.85)';
    ctx.beginPath();
    ctx.ellipse(-2, 0, 2.8, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Anzug-Details
  if (style.kind === 'spidey') {
    ctx.strokeStyle = 'rgba(18,0,5,0.6)';
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(0, 9);
    ctx.moveTo(10, -11);
    ctx.lineTo(10, 11);
    ctx.moveTo(-2, -4);
    ctx.lineTo(21, -5);
    ctx.moveTo(-2, 4);
    ctx.lineTo(21, 5);
    ctx.stroke();
    // Netzdüse
    ctx.fillStyle = '#1b1b22';
    ctx.beginPath();
    ctx.roundRect(-5, -3.5, 5, 7, 1.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,210,230,0.6)';
    ctx.fillRect(-4.5, -0.8, 4, 1);
  } else if (style.kind === 'black') {
    ctx.fillStyle = 'rgba(242,244,250,0.95)';
    ctx.beginPath();
    ctx.ellipse(10, 0, 6.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,220,255,0.5)';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-1, -9);
    ctx.quadraticCurveTo(12, -12.5, 22, -10);
    ctx.stroke();
  }
  ctx.restore();
}

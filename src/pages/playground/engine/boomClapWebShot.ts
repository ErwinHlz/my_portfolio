/**
 * BOOM 3: Spider-Man schießt Netze direkt in die Kamera. Jeder Schuss fliegt
 * als Faden von der Hand aufs Objektiv zu, wird dabei perspektivisch größer
 * und klatscht dann als Netz auf die Linse. Beim CLAP 3 (Verwandlung) fegt die
 * Druckwelle die Netze vom Bild.
 *
 * Gezeichnet wird im Bildschirmraum (Gerätepixel, ohne Kameratransformation).
 */
import { BEAT } from './boomClapTrack';
import { clamp, seeded, smooth } from './canvasUtils';

type V = [number, number];

interface WebShot {
  /** Beat, an dem der Faden die Hand verlässt */
  k: number;
  hand: 'L' | 'R';
  /** Aufprallpunkt in Bildanteilen (x relativ zur Breite, y zur Höhe) */
  x: number;
  y: number;
  /** Netzradius relativ zur Bildhöhe */
  r: number;
  rot: number;
  seed: number;
}

/** rechts, links, dann beide Hände zusammen – das große Netz in der Mitte */
export const WEB_SHOTS: readonly WebShot[] = [
  { k: 19, hand: 'R', x: 0.76, y: 0.3, r: 0.3, rot: 0.3, seed: 11 },
  { k: 19.3, hand: 'L', x: 0.22, y: 0.66, r: 0.28, rot: -0.5, seed: 23 },
  { k: 19.55, hand: 'R', x: 0.56, y: 0.52, r: 0.4, rot: 1.1, seed: 37 },
];

/** Flugzeit vom Handgelenk bis zur Linse (s) */
const FLY = 0.12;
/** ab hier fegt die Druckwelle der Verwandlung die Netze weg */
const SWEEP_FROM = 20;
const SWEEP_TO = 20.4;

/** persist = Netze bleiben hängen, statt beim CLAP 3 weggefegt zu werden */
export const webShotsActive = (k: number, persist = false) =>
  k >= WEB_SHOTS[0].k && (persist || k < SWEEP_TO);

interface WebGeo {
  spokes: { ang: number; len: number }[];
  rings: number[];
  /** welche Ringsegmente fehlen (gerissene Fäden) */
  gaps: Set<number>;
  /** lose herabhängende Fäden */
  danglers: { spoke: number; len: number; bend: number }[];
}

const geoCache = new Map<number, WebGeo>();

function webGeo(seed: number): WebGeo {
  const cached = geoCache.get(seed);
  if (cached) return cached;
  const rnd = seeded(seed);
  const n = 10 + Math.floor(rnd() * 4);
  const spokes = Array.from({ length: n }, (_, i) => ({
    ang: ((i + (rnd() - 0.5) * 0.55) / n) * Math.PI * 2,
    len: 0.72 + rnd() * 0.45,
  }));
  const rings: number[] = [];
  for (let r = 0.13; r < 0.95; r += 0.11 + rnd() * 0.05) rings.push(r);
  const gaps = new Set<number>();
  for (let i = 0; i < rings.length * n; i++) if (rnd() < 0.12) gaps.add(i);
  const danglers = Array.from({ length: 2 + Math.floor(rnd() * 2) }, () => ({
    spoke: Math.floor(rnd() * n),
    len: 0.25 + rnd() * 0.35,
    bend: (rnd() - 0.5) * 0.6,
  }));
  const geo = { spokes, rings, gaps, danglers };
  geoCache.set(seed, geo);
  return geo;
}

/** einen Pfad in drei Durchgängen: weicher Schein, Faden, Glanzkante */
function strand(ctx: CanvasRenderingContext2D, w: number, alpha: number) {
  ctx.strokeStyle = `rgba(210,225,255,${0.16 * alpha})`;
  ctx.lineWidth = w * 3.2;
  ctx.stroke();
  ctx.strokeStyle = `rgba(236,240,250,${0.88 * alpha})`;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${0.7 * alpha})`;
  ctx.lineWidth = w * 0.4;
  ctx.stroke();
}

/** klebriger Klumpen in der Mitte bzw. am Fadenende */
function glob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  alpha: number,
) {
  const rnd = seeded(seed);
  ctx.beginPath();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.75 + rnd() * 0.5);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.2);
  g.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
  g.addColorStop(0.6, `rgba(225,232,248,${0.85 * alpha})`);
  g.addColorStop(1, `rgba(170,185,220,${0.6 * alpha})`);
  ctx.fillStyle = g;
  ctx.fill();
}

function drawWeb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  rot: number,
  seed: number,
  alpha: number,
  unit: number,
) {
  const geo = webGeo(seed);
  const n = geo.spokes.length;
  const pt = (i: number, r: number): V => {
    const s = geo.spokes[((i % n) + n) % n];
    const a = s.ang + rot;
    const d = Math.min(r, s.len) * R;
    return [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
  };

  // Linse wird unter dem Netz leicht milchig
  const fog = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  fog.addColorStop(0, `rgba(220,230,255,${0.16 * alpha})`);
  fog.addColorStop(1, 'rgba(220,230,255,0)');
  ctx.fillStyle = fog;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Speichen, leicht durchhängend
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const end = pt(i, 2);
    const mid = pt(i, geo.spokes[i].len * 0.5);
    const a = geo.spokes[i].ang + rot;
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(
      mid[0] + Math.cos(a + Math.PI / 2) * R * 0.03,
      mid[1] + Math.sin(a + Math.PI / 2) * R * 0.03,
      end[0],
      end[1],
    );
  }
  strand(ctx, 2.6 * unit, alpha);

  // Ringe: zwischen zwei Speichen zur Mitte hin durchhängend
  ctx.beginPath();
  geo.rings.forEach((r, ri) => {
    for (let i = 0; i < n; i++) {
      if (geo.gaps.has(ri * n + i)) continue;
      const lenA = geo.spokes[i].len;
      const lenB = geo.spokes[(i + 1) % n].len;
      if (r > lenA || r > lenB) continue;
      const a = pt(i, r);
      const b = pt(i + 1, r);
      const m: V = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(cx + (m[0] - cx) * 0.8, cy + (m[1] - cy) * 0.8, b[0], b[1]);
    }
  });
  strand(ctx, 1.7 * unit, alpha);

  // lose Fäden am Rand hängen nach unten
  ctx.beginPath();
  for (const d of geo.danglers) {
    const s = pt(d.spoke, 2);
    ctx.moveTo(s[0], s[1]);
    ctx.quadraticCurveTo(
      s[0] + d.bend * R * 0.3,
      s[1] + d.len * R * 0.5,
      s[0] + d.bend * R * 0.1,
      s[1] + d.len * R,
    );
  }
  strand(ctx, 1.4 * unit, alpha * 0.85);

  // Tröpfchen an den Kreuzungen
  const rnd = seeded(seed + 5);
  ctx.fillStyle = `rgba(255,255,255,${0.8 * alpha})`;
  for (let i = 0; i < n; i++) {
    for (const r of geo.rings) {
      if (rnd() > 0.28 || r > geo.spokes[i].len) continue;
      const p = pt(i, r);
      ctx.beginPath();
      ctx.arc(p[0], p[1], (1.4 + rnd() * 1.6) * unit, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  glob(ctx, cx, cy, R * 0.07, seed, alpha);
}

/**
 * @param hands Handgelenke im Bildschirmraum (Gerätepixel)
 * @param wobble 0 = reduzierte Bewegung
 * @param persist Netze bleiben bis zum Ende auf dem Bild
 */
export function drawWebShots(
  ctx: CanvasRenderingContext2D,
  k: number,
  pw: number,
  ph: number,
  hands: { L: V; R: V },
  wobble = 1,
  persist = false,
) {
  if (!webShotsActive(k, persist)) return;
  const unit = ph / 900;
  const sweep = persist ? 0 : smooth(SWEEP_FROM, SWEEP_TO, k);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const shot of WEB_SHOTS) {
    const dt = (k - shot.k) * BEAT;
    if (dt < 0) continue;
    const from = hands[shot.hand];
    // steht die Hand auf der anderen Bildseite (kopfüber), landet das Netz gespiegelt
    const flip = from[0] > pw / 2 !== shot.x > 0.5;
    let tx = (flip ? 1 - shot.x : shot.x) * pw;
    let ty = shot.y * ph;
    const R = shot.r * ph;

    if (dt < FLY) {
      // Flug: beschleunigt auf die Kamera zu, Faden und Klumpen wachsen perspektivisch
      const e = (dt / FLY) ** 2;
      const gx = from[0] + (tx - from[0]) * e;
      const gy = from[1] + (ty - from[1]) * e;
      const size = 6 * unit + e * R * 0.16;
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(gx, gy);
      ctx.lineCap = 'round';
      strand(ctx, (2.5 + e * 9) * unit, 1);
      glob(ctx, gx, gy, size, shot.seed, 1);
      continue;
    }

    // Aufprall: schnappt federnd auf, wackelt nach, rutscht langsam nach unten
    const s = dt - FLY;
    const pop = 1 - Math.exp(-s * 26) * Math.cos(s * 34);
    const jiggle = Math.exp(-s * 7) * Math.sin(s * 32) * 0.035 * wobble;
    ty += Math.min(s, 2.5) * 6 * unit;
    // Druckwelle: Netze fliegen nach außen weg
    let alpha = 1;
    let rot = shot.rot + jiggle;
    if (sweep > 0) {
      const dx = tx - pw / 2;
      const dy = ty - ph / 2;
      const d = Math.max(1, Math.hypot(dx, dy));
      const push = sweep * ph * 0.8;
      tx += (dx / d) * push;
      ty += (dy / d) * push;
      rot += sweep * (shot.hand === 'L' ? -0.6 : 0.6);
      alpha = 1 - sweep;
    }
    if (alpha <= 0.01) continue;
    const scale = clamp(pop, 0, 1.2) * (1 + sweep * 0.4);

    // Aufprallblitz
    if (s < 0.18) {
      const f = 1 - s / 0.18;
      const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, R * 0.6);
      g.addColorStop(0, `rgba(255,255,255,${0.5 * f})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(tx - R, ty - R, R * 2, R * 2);
    }
    drawWeb(ctx, tx, ty, R * scale * (1 + jiggle), rot, shot.seed, alpha, unit);
  }
  ctx.restore();
}

/**
 * Glatte Glieder für den Helden (Ganzkörper und Nahaufnahme): Radien entlang
 * eines Knochens ergeben eine weich geschwungene Kontur mit Muskelbäuchen statt
 * gerader Kegel. Gemeinsame Konturen mehrerer Teile verhindern sichtbare Nähte.
 */
import { clamp } from './canvasUtils';

export type V = [number, number];

/** Radien gleichmäßig verteilt von Gelenk zu Gelenk */
export type Profile = readonly number[];

/** Radius eines Profils an der Stelle t ∈ [0, 1] */
export function profileAt(prof: Profile, t: number) {
  const f = clamp(t, 0, 1) * (prof.length - 1);
  const i = Math.min(prof.length - 2, Math.floor(f));
  return prof[i] + (prof[i + 1] - prof[i]) * (f - i);
}

/** Catmull-Rom-Kurve durch die Punkte (der erste Punkt ist schon erreicht) */
function smoothThrough(path: Path2D, pts: V[]) {
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    path.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6,
      p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6,
      p2[1] - (p3[1] - p1[1]) / 6,
      p2[0],
      p2[1],
    );
  }
}

/**
 * geschlossene, weich geschwungene Kontur eines Glieds von a nach b mit runden Enden.
 * Optional ein zweites Profil für die andere Seite (z. B. Bizeps innen, Trizeps außen).
 */
export function profilePath(a: V, b: V, prof: Profile, other: Profile = prof): Path2D {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u: V = [Math.cos(ang), Math.sin(ang)];
  const n: V = [-u[1], u[0]];
  const left: V[] = [];
  const right: V[] = [];
  for (let i = 0; i < prof.length; i++) {
    const t = i / (prof.length - 1);
    const c: V = [a[0] + u[0] * len * t, a[1] + u[1] * len * t];
    const ro = profileAt(other, t);
    left.push([c[0] + n[0] * prof[i], c[1] + n[1] * prof[i]]);
    right.push([c[0] - n[0] * ro, c[1] - n[1] * ro]);
  }
  const rEnd = Math.max(prof[prof.length - 1], other[other.length - 1]);
  const rStart = Math.max(prof[0], other[0]);
  const path = new Path2D();
  path.moveTo(left[0][0], left[0][1]);
  smoothThrough(path, left);
  path.arc(b[0], b[1], rEnd, ang + Math.PI / 2, ang - Math.PI / 2, true);
  right.reverse();
  smoothThrough(path, right);
  path.arc(a[0], a[1], rStart, ang - Math.PI / 2, ang + Math.PI / 2, true);
  path.closePath();
  return path;
}

/** Pfad aus einem lokal gedrehten (und optional in x gestauchten) System übernehmen */
export function rotated(src: Path2D, a: number, sx = 1): Path2D {
  const out = new Path2D();
  const c = Math.cos(a);
  const s = Math.sin(a);
  out.addPath(src, new DOMMatrix([c * sx, s * sx, -s, c, 0, 0]));
  return out;
}

/** Bereich eines Glieds ab Stelle t (Kante optional zur Gelenkseite gewölbt) */
export function regionFrom(a: V, b: V, t: number, arch = 0, span = 18): Path2D {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const x0 = len * t;
  const far = span * 4;
  const local = new Path2D();
  local.moveTo(x0, -far);
  local.lineTo(x0, -span);
  local.quadraticCurveTo(x0 - arch * 2, 0, x0, span);
  local.lineTo(x0, far);
  local.lineTo(len + far, far);
  local.lineTo(len + far, -far);
  local.closePath();
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const out = new Path2D();
  out.addPath(local, new DOMMatrix([c, s, -s, c, a[0], a[1]]));
  return out;
}

/**
 * Kontur eines Arms: außen kräftig, dort wo der Deltamuskel über dem Rumpf liegt
 * aber nur als weiche Muskellinie – so wächst die Schulter aus dem Oberkörper.
 */
export function strokeArmOutline(
  ctx: CanvasRenderingContext2D,
  outline: Path2D,
  torso: Path2D,
  shoulder: V,
  ink: string,
  soft: string,
  width: number,
  zoneR: number,
) {
  const zone = new Path2D();
  zone.arc(shoulder[0], shoulder[1], zoneR, 0, Math.PI * 2);
  const world = () => {
    const w = new Path2D();
    w.rect(-8000, -8000, 16000, 16000);
    return w;
  };
  const notZone = world();
  notZone.addPath(zone);
  const notTorso = world();
  notTorso.addPath(torso);
  ctx.lineWidth = width;
  ctx.strokeStyle = ink;
  ctx.save();
  ctx.clip(notZone, 'evenodd');
  ctx.stroke(outline);
  ctx.restore();
  ctx.save();
  ctx.clip(zone);
  ctx.clip(notTorso, 'evenodd');
  ctx.stroke(outline);
  ctx.restore();
  ctx.save();
  ctx.clip(zone);
  ctx.clip(torso);
  const g = ctx.createRadialGradient(shoulder[0], shoulder[1], 0, shoulder[0], shoulder[1], zoneR);
  g.addColorStop(0, soft);
  g.addColorStop(0.55, soft);
  g.addColorStop(1, ink);
  ctx.strokeStyle = g;
  ctx.stroke(outline);
  ctx.restore();
}

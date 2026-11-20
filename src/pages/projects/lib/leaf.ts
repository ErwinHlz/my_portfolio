/**
 * Geometrie des umblätternden Blatts.
 *
 * Das Blatt besteht aus drei Streifen (vom Falz nach außen). Jeder Streifen dreht sich
 * zusätzlich zu seinem Vorgänger – so biegt sich die Seite wie Papier statt starr zu kippen.
 */
export const SEGMENTS = [0.5, 0.3, 0.2] as const;

/** Start (a) und Ende (b) jedes Streifens als Anteil der Seitenbreite */
export const SEGMENT_SPANS = SEGMENTS.map((_, index) => {
  const a = SEGMENTS.slice(0, index).reduce((sum, f) => sum + f, 0);
  return { a, b: a + SEGMENTS[index]! };
});

export type BendMode = 'lead' | 'flutter';

export interface LeafGeometry {
  /** absolute Winkel der Streifen in Grad */
  thetas: number[];
  /** Drehung relativ zum Vorgänger (für die verschachtelten Elemente) */
  rels: number[];
  /** projizierte Lage der freien Kante, in Seitenbreiten ab Falz (+ rechts, − links) */
  edgeX: number;
}

/**
 * @param angle  Grundwinkel des Blatts (0 = rechts flach, −180 = links flach)
 * @param dir    1 = vorwärts, −1 = zurück
 * @param progress 0..1
 * @param mode   'lead': die Kante eilt voraus (Finger hält sie fest),
 *               'flutter': erst voraus, beim Landen schwingt sie leicht nach
 */
export function leafGeometry(
  angle: number,
  dir: 1 | -1,
  progress: number,
  mode: BendMode,
  strength: number,
): LeafGeometry {
  const p = Math.min(1, Math.max(0, progress));
  const arc = Math.sin(Math.PI * p);
  const bend = mode === 'lead' ? arc : arc * Math.cos(Math.PI * p * 0.92);
  const rel = -dir * bend * strength;

  // äußere Streifen biegen sich stärker
  const rels = [angle, rel * 0.55, rel * 0.9];
  const thetas: number[] = [];
  let edgeX = 0;
  let sum = 0;
  rels.forEach((r, index) => {
    sum += r;
    thetas.push(sum);
    edgeX += SEGMENTS[index]! * Math.cos((sum * Math.PI) / 180);
  });

  return { thetas, rels, edgeX };
}

/** Abdunklung einer Fläche je nach Neigung zum Licht (0 = flach, voll beleuchtet) */
export function faceShade(theta: number, back: boolean) {
  const facing = Math.cos((theta * Math.PI) / 180) * (back ? -1 : 1);
  return Math.min(0.75, Math.max(0, (1 - facing) * 0.6));
}

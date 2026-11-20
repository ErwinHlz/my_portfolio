export interface Point {
  x: number;
  y: number;
}

interface TrackPoint extends Point {
  distance: number;
}

export interface Trail {
  points: TrackPoint[];
  stops: number[];
  length: number;
}

export interface TrailColors {
  path: string;
  light: string;
  glow: string;
}

export function buildTrail(markers: Point[], vertical: boolean): Trail {
  const points: TrackPoint[] = [{ ...markers[0]!, distance: 0 }];
  const stops = [0];
  let length = 0;

  for (let index = 1; index < markers.length; index++) {
    const from = markers[index - 1]!;
    const to = markers[index]!;
    const bend = (to.x - from.x) * 0.46;
    const rise = (to.y - from.y) / 3;
    const first = vertical ? { x: from.x + 18, y: from.y + rise } : { x: from.x + bend, y: from.y };
    const second = vertical ? { x: to.x - 18, y: to.y - rise } : { x: to.x - bend, y: to.y };

    for (let sample = 1; sample <= 28; sample++) {
      const t = sample / 28;
      const u = 1 - t;
      const point = {
        x: u ** 3 * from.x + 3 * u ** 2 * t * first.x + 3 * u * t ** 2 * second.x + t ** 3 * to.x,
        y: u ** 3 * from.y + 3 * u ** 2 * t * first.y + 3 * u * t ** 2 * second.y + t ** 3 * to.y,
      };
      const previous = points.at(-1)!;
      length += Math.hypot(point.x - previous.x, point.y - previous.y);
      points.push({ ...point, distance: length });
    }

    stops.push(length);
  }

  return { points, stops, length };
}

function pointAt({ points, length }: Trail, distance: number): Point {
  if (distance <= 0) return points[0]!;
  if (distance >= length) return points.at(-1)!;

  const index = points.findIndex((point) => point.distance >= distance);
  const before = points[index - 1]!;
  const after = points[index]!;
  const ratio = (distance - before.distance) / (after.distance - before.distance);
  return { x: before.x + (after.x - before.x) * ratio, y: before.y + (after.y - before.y) * ratio };
}

export function paintTrail(
  ctx: CanvasRenderingContext2D,
  trail: Trail,
  colors: TrailColors,
  progress: number,
  moving: boolean,
) {
  const { points, length } = trail;
  const distance = progress * length;
  const tip = pointAt(trail, distance);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (const point of points) ctx.lineTo(point.x, point.y);
  ctx.setLineDash([3, 7]);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = colors.path;
  ctx.stroke();

  if (distance > 0) {
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (const point of points) {
      if (point.distance >= distance) break;
      ctx.lineTo(point.x, point.y);
    }
    ctx.lineTo(tip.x, tip.y);
    ctx.setLineDash([]);
    ctx.strokeStyle = colors.light;
    ctx.lineWidth = 2.2;
    ctx.shadowBlur = 11;
    ctx.shadowColor = colors.glow;
    ctx.stroke();
  }

  if (moving && progress > 0 && progress < 1) {
    ctx.fillStyle = colors.light;
    ctx.shadowBlur = 8;
    for (let spark = 0; spark < 14; spark++) {
      const lag = 5 + spark * 5;
      if (distance < lag) break;

      const point = pointAt(trail, distance - lag);
      const phase = distance * 0.055 + spark * 2.4;
      const radius = 0.8 + (spark % 3) * 0.42;
      ctx.globalAlpha = (1 - spark / 15) * 0.74;
      ctx.beginPath();
      ctx.arc(
        point.x + Math.sin(phase) * 6,
        point.y + Math.cos(phase) * (5 + lag / 5),
        radius,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.translate(tip.x, tip.y);
    ctx.rotate(Math.PI / 4 + distance * 0.025);
    ctx.shadowBlur = 22;
    ctx.fillRect(-4, -4, 8, 8);
  }

  ctx.restore();
}

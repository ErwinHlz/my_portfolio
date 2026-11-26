/**
 * Kleine Bausteine für schönere Bewegungen: Feder-Easing mit Überschwingen,
 * Bögen für Handwege und ein gezeichnetes Herz für die Herz-Geste.
 */

type V = [number, number];

/** schneller Einsatz, leichtes Überschwingen, ruhiges Ausklingen */
export function springEase(x: number) {
  if (x >= 1) return 1;
  if (x <= 0) return 0;
  return 1 - Math.exp(-6.5 * x) * Math.cos(8.5 * x) * (1 - x * 0.15);
}

/**
 * Punkt auf einem Bogen von a nach b: Hände bewegen sich in der Natur nie
 * schnurgerade. Der Bogen wölbt sich nach außen (side = −1 links, +1 rechts)
 * und etwas nach oben.
 */
export function handArc(a: V, b: V, t: number, side: number): V {
  const x = a[0] + (b[0] - a[0]) * t;
  const y = a[1] + (b[1] - a[1]) * t;
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const bulge = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * Math.min(d * 0.18, 70);
  return [x + side * bulge, y - bulge * 0.5];
}

/** Herz mit Glanzlicht */
export function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
  rot = 0,
) {
  if (alpha <= 0 || size <= 0.5) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(size / 20, size / 20);
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.bezierCurveTo(-12, -2, -11, -14, -5, -14);
  ctx.bezierCurveTo(-2, -14, 0, -11, 0, -9);
  ctx.bezierCurveTo(0, -11, 2, -14, 5, -14);
  ctx.bezierCurveTo(11, -14, 12, -2, 0, 7);
  ctx.closePath();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-5, -9, 2.6, 1.6, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

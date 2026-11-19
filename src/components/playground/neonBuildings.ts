/**
 * Gebäude für die Neon Coast: Art-déco-Häuser, Hotels mit Leuchtschrift,
 * Glastürme, kleine Läden und ein Casino mit Suchscheinwerfern.
 * Gezeichnet wird in Welteinheiten, der Boden liegt bei y = 0.
 */
import { hex, mixRGB, rgba, type RGB } from './canvasUtils';
import type { SpriteContext } from './driveSprites';
import type { RoadSprite } from './roadRenderer';

const PASTELS = ['#f7a8c4', '#9fe3e0', '#ffe0a3', '#c6b3ff', '#f4f1ea', '#ffb59a'].map(hex);
const NIGHT_TINT = hex('#140b24');
const WINDOW_LIT = hex('#ffd88a');
const WINDOW_DARK = hex('#2a3352');

/** deterministischer Pseudo-Zufall pro Fenster, damit nichts flackert */
const hash = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Pixelgröße einer Welteinheit – für Detailstufen bei weit entfernten Gebäuden */
const pixelScale = (ctx: CanvasRenderingContext2D) => ctx.getTransform().a;

function wall(base: RGB, s: SpriteContext): string {
  return rgba(mixRGB(base, NIGHT_TINT, 0.15 + s.night * 0.65));
}

function windowColor(variant: number, i: number, s: SpriteContext): string {
  const on = hash(variant, i) < 0.25 + s.night * 0.55;
  return rgba(on ? WINDOW_LIT : mixRGB(WINDOW_DARK, [120, 150, 200], (1 - s.night) * 0.35));
}

function neonStroke(
  ctx: CanvasRenderingContext2D,
  color: RGB,
  s: SpriteContext,
  width: number,
): void {
  ctx.strokeStyle = rgba(mixRGB(color, [255, 255, 255], 0.35), 0.85 + 0.15 * s.night);
  ctx.shadowColor = rgba(color);
  ctx.shadowBlur = 12 + 30 * s.night;
  ctx.lineWidth = width;
}

function neonText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  maxWidth: number,
  color: RGB,
  s: SpriteContext,
): void {
  ctx.fillStyle = rgba(mixRGB(color, [255, 255, 255], 0.55), 0.9 + 0.1 * s.night);
  ctx.shadowColor = rgba(color);
  ctx.shadowBlur = 14 + 34 * s.night;
  ctx.font = `${size}px Monoton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y, maxWidth);
  ctx.shadowBlur = 0;
}

function windows(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  cols: number,
  rows: number,
  w: number,
  h: number,
  gapX: number,
  gapY: number,
  variant: number,
  s: SpriteContext,
): void {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = windowColor(variant, r * cols + c, s);
      ctx.fillRect(x0 + c * (w + gapX), y0 + r * (h + gapY), w, h);
    }
  }
}

/* ---------------------------------------------------------------- */

/** zweistöckiges Art-déco-Haus in Pastell */
function house(ctx: CanvasRenderingContext2D, v: number, s: SpriteContext): void {
  const base = PASTELS[v % PASTELS.length];
  const accent = v % 2 ? s.accentA : s.accentB;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-1700, -60, 3400, 60);

  ctx.fillStyle = wall(base, s);
  ctx.fillRect(-1600, -2000, 3200, 2000);
  ctx.fillRect(-520, -2450, 1040, 460);
  ctx.fillStyle = wall(mixRGB(base, [0, 0, 0], 0.25), s);
  for (const y of [-1380, -680]) ctx.fillRect(-1680, y, 3360, 70);
  ctx.fillRect(-1650, -2040, 3300, 60);

  if (pixelScale(ctx) * 3200 > 30) {
    windows(ctx, -1400, -1880, 5, 1, 380, 420, 190, 0, v, s);
    windows(ctx, -1400, -1180, 2, 1, 380, 420, 190, 0, v + 3, s);
    windows(ctx, 300, -1180, 2, 1, 380, 420, 190, 0, v + 5, s);
    // Glasbausteine im Treppenaufsatz
    ctx.fillStyle = windowColor(v, 99, s);
    for (let i = 0; i < 3; i++) ctx.fillRect(-300 + i * 220, -2380, 160, 300);
    ctx.fillStyle = wall(mixRGB(base, [0, 0, 0], 0.45), s);
    ctx.fillRect(-260, -600, 520, 600);
  }

  ctx.save();
  neonStroke(ctx, accent, s, 45);
  ctx.beginPath();
  ctx.moveTo(-1600, -1990);
  ctx.lineTo(-520, -1990);
  ctx.lineTo(-520, -2440);
  ctx.lineTo(520, -2440);
  ctx.lineTo(520, -1990);
  ctx.lineTo(1600, -1990);
  ctx.stroke();
  ctx.restore();
}

const HOTEL_NAMES = ['OCEAN', 'PARADISE', 'FLAMINGO', 'SUNRISE', 'TROPICA'];

/** hohes Hotel mit senkrechter Leuchtschrift */
function hotel(ctx: CanvasRenderingContext2D, v: number, s: SpriteContext): void {
  const base = PASTELS[(v + 2) % PASTELS.length];
  const accent = v % 2 ? s.accentB : s.accentA;
  const name = HOTEL_NAMES[v % HOTEL_NAMES.length];

  ctx.fillStyle = wall(base, s);
  ctx.fillRect(-1800, -5200, 3600, 5200);
  // abgerundete Ecktürme
  ctx.fillStyle = wall(mixRGB(base, [255, 255, 255], 0.15), s);
  ctx.beginPath();
  ctx.roundRect(-2000, -5600, 700, 5600, [350, 350, 0, 0]);
  ctx.roundRect(1300, -5600, 700, 5600, [350, 350, 0, 0]);
  ctx.fill();

  if (pixelScale(ctx) * 3600 > 30) {
    windows(ctx, -1150, -4900, 5, 8, 300, 360, 160, 190, v, s);
    for (let r = 0; r < 9; r++) {
      ctx.fillStyle = wall(mixRGB(base, [0, 0, 0], 0.3), s);
      ctx.fillRect(-1250, -4980 + r * 550, 2500, 40);
    }
  }
  // Vordach am Eingang
  ctx.fillStyle = rgba(mixRGB(accent, NIGHT_TINT, 0.3));
  ctx.fillRect(-900, -820, 1800, 140);
  ctx.fillStyle = rgba(WINDOW_LIT, 0.85);
  ctx.fillRect(-600, -680, 1200, 680);

  // senkrechtes Namensschild
  const letters = name.split('');
  const signH = letters.length * 520 + 300;
  ctx.fillStyle = '#12091f';
  ctx.fillRect(-330, -5200 - signH * 0.45, 660, signH);
  ctx.save();
  neonStroke(ctx, accent, s, 40);
  ctx.strokeRect(-290, -5200 - signH * 0.45 + 40, 580, signH - 80);
  ctx.restore();
  letters.forEach((ch, i) => {
    neonText(ctx, ch, 0, -5200 - signH * 0.45 + 410 + i * 520, 460, 500, accent, s);
  });
}

/** Glasturm mit leuchtender Krone */
function tower(ctx: CanvasRenderingContext2D, v: number, s: SpriteContext): void {
  const accent = v % 2 ? s.accentA : s.accentB;
  const H = 8200 + (v % 3) * 1400;
  const glass = ctx.createLinearGradient(-1300, 0, 1300, 0);
  glass.addColorStop(0, rgba(mixRGB(hex('#3b3f8f'), NIGHT_TINT, 0.2 + s.night * 0.6)));
  glass.addColorStop(0.5, rgba(mixRGB(hex('#6c8fd8'), NIGHT_TINT, 0.25 + s.night * 0.6)));
  glass.addColorStop(1, rgba(mixRGB(hex('#2a2d6b'), NIGHT_TINT, 0.2 + s.night * 0.6)));
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-1300, 0);
  ctx.lineTo(-1300, -H);
  ctx.lineTo(0, -H - 900);
  ctx.lineTo(1300, -H);
  ctx.lineTo(1300, 0);
  ctx.closePath();
  ctx.fill();

  if (pixelScale(ctx) * 2600 > 30) {
    const rows = Math.floor(H / 420);
    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < 6; c++) {
        if (hash(v + c, r) > 0.2 + s.night * 0.45) continue;
        ctx.fillStyle = rgba(c % 3 === 0 ? hex('#9ef0ff') : WINDOW_LIT, 0.85);
        ctx.fillRect(-1150 + c * 400, -H + r * 420, 260, 200);
      }
    }
  }
  ctx.save();
  neonStroke(ctx, accent, s, 60);
  ctx.beginPath();
  ctx.moveTo(-1300, -H);
  ctx.lineTo(0, -H - 900);
  ctx.lineTo(1300, -H);
  ctx.moveTo(-1300, -H + 500);
  ctx.lineTo(1300, -H + 500);
  ctx.stroke();
  ctx.restore();
  // Antenne mit Warnlicht
  ctx.fillStyle = '#0e0718';
  ctx.fillRect(-30, -H - 2100, 60, 1250);
  ctx.fillStyle = Math.sin(s.time * 3 + v) > 0.2 ? '#ff3c3c' : 'rgba(255,60,60,0.2)';
  ctx.beginPath();
  ctx.arc(0, -H - 2120, 80, 0, Math.PI * 2);
  ctx.fill();
}

const SHOP_NAMES = ['DINER', 'SURF', 'PIZZA', 'ARCADE', 'TATTOO', 'TACOS'];

/** kleiner Laden mit Markise und Leuchtschrift */
function shop(ctx: CanvasRenderingContext2D, v: number, s: SpriteContext): void {
  const base = PASTELS[(v + 4) % PASTELS.length];
  const accent = v % 2 ? s.accentA : s.accentB;
  ctx.fillStyle = wall(base, s);
  ctx.fillRect(-1300, -1500, 2600, 1500);
  ctx.fillStyle = rgba(mixRGB(WINDOW_LIT, [255, 200, 230], 0.3), 0.55 + 0.4 * s.night);
  ctx.fillRect(-1100, -950, 2200, 850);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#f6efe0' : rgba(mixRGB(accent, NIGHT_TINT, 0.2));
    ctx.beginPath();
    ctx.moveTo(-1300 + i * 325, -1150);
    ctx.lineTo(-1300 + (i + 1) * 325, -1150);
    ctx.lineTo(-1300 + (i + 1) * 325, -950);
    ctx.quadraticCurveTo(-1300 + (i + 0.5) * 325, -880, -1300 + i * 325, -950);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#12091f';
  ctx.fillRect(-1150, -2150, 2300, 600);
  neonText(ctx, SHOP_NAMES[v % SHOP_NAMES.length], 0, -1850, 440, 2100, accent, s);
}

const CASINO_NAMES = ['CASINO', 'LUCKY 7', 'JACKPOT', 'ROYALE'];

/** das große Casino mit Kuppel, Lauflichtern und Suchscheinwerfern */
function casino(ctx: CanvasRenderingContext2D, v: number, s: SpriteContext): void {
  const gold = hex('#ffcf5a');
  const accent = v % 2 ? s.accentA : s.accentB;
  const t = s.motion ? s.time : 0;

  // Suchscheinwerfer in den Himmel
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [bx, phase] of [
    [-2600, 0],
    [2600, 2.1],
  ]) {
    const a = -Math.PI / 2 + Math.sin(t * 0.7 + phase) * 0.45;
    const len = 16000;
    const spread = 0.05;
    const beam = ctx.createLinearGradient(
      bx,
      -4200,
      bx + Math.cos(a) * len,
      -4200 + Math.sin(a) * len,
    );
    beam.addColorStop(0, `rgba(255,245,220,${0.18 + 0.25 * s.night})`);
    beam.addColorStop(1, 'rgba(255,245,220,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(bx, -4200);
    ctx.lineTo(bx + Math.cos(a - spread) * len, -4200 + Math.sin(a - spread) * len);
    ctx.lineTo(bx + Math.cos(a + spread) * len, -4200 + Math.sin(a + spread) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const body = rgba(mixRGB(hex('#3a1f5c'), NIGHT_TINT, 0.2 + s.night * 0.5));
  const trim = rgba(mixRGB(gold, NIGHT_TINT, 0.15 + s.night * 0.2));

  // Seitenflügel
  ctx.fillStyle = body;
  ctx.fillRect(-3600, -3400, 7200, 3400);
  ctx.fillStyle = trim;
  ctx.fillRect(-3700, -3500, 7400, 120);
  ctx.fillRect(-3700, -1700, 7400, 80);

  // Mittelturm mit Kuppel
  ctx.fillStyle = body;
  ctx.fillRect(-1300, -5600, 2600, 2300);
  const dome = ctx.createRadialGradient(-300, -6200, 100, 0, -5600, 1500);
  dome.addColorStop(0, rgba(mixRGB(gold, [255, 255, 255], 0.5)));
  dome.addColorStop(1, rgba(mixRGB(gold, NIGHT_TINT, 0.35)));
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.ellipse(0, -5600, 1300, 1150, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = trim;
  ctx.fillRect(-60, -7400, 120, 700);
  neonText(ctx, '★', 0, -7550, 600, 700, gold, s);

  if (pixelScale(ctx) * 7200 > 40) {
    windows(ctx, -3300, -3150, 6, 2, 260, 520, 170, 260, v, s);
    windows(ctx, 1170, -3150, 6, 2, 260, 520, 170, 260, v + 7, s);
    // Bogenfenster im Turm
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = windowColor(v, 50 + i, s);
      ctx.beginPath();
      ctx.roundRect(-1050 + i * 560, -5250, 380, 900, [190, 190, 0, 0]);
      ctx.fill();
    }
  }

  // großer Schriftzug mit Lauflicht-Rahmen
  ctx.fillStyle = '#12091f';
  ctx.fillRect(-2700, -4300, 5400, 1100);
  neonText(ctx, CASINO_NAMES[v % CASINO_NAMES.length], 0, -3750, 760, 5000, accent, s);
  const bulbs = 34;
  const chase = Math.floor(t * 10);
  for (let i = 0; i < bulbs; i++) {
    const on = (i + chase) % 3 === 0;
    ctx.fillStyle = on ? '#fff3b0' : 'rgba(255,207,90,0.35)';
    const x = -2650 + (i / (bulbs - 1)) * 5300;
    ctx.beginPath();
    ctx.arc(x, -4250, 55, 0, Math.PI * 2);
    ctx.arc(x, -3250, 55, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eingang mit Spielkartensymbolen
  ctx.fillStyle = rgba(WINDOW_LIT, 0.9);
  ctx.fillRect(-1100, -1500, 2200, 1500);
  ctx.fillStyle = trim;
  ctx.fillRect(-1300, -1650, 2600, 160);
  ['♠', '♥', '♦', '♣'].forEach((suit, i) => {
    const color = i % 3 === 0 ? hex('#9ef0ff') : hex('#ff3f6e');
    neonText(ctx, suit, i < 2 ? -2700 + i * 900 : 1800 + (i - 2) * 900, -900, 700, 800, color, s);
  });
}

/* ---------------------------------------------------------------- */

export function paintBuilding(
  ctx: CanvasRenderingContext2D,
  sprite: RoadSprite,
  s: SpriteContext,
): boolean {
  switch (sprite.kind) {
    case 'house':
      house(ctx, sprite.variant, s);
      return true;
    case 'hotel':
      hotel(ctx, sprite.variant, s);
      return true;
    case 'tower':
      tower(ctx, sprite.variant, s);
      return true;
    case 'shop':
      shop(ctx, sprite.variant, s);
      return true;
    case 'casino':
      casino(ctx, sprite.variant, s);
      return true;
    default:
      return false;
  }
}

/**
 * Prozedural gezeichnete Figuren: Randobjekte der Strecke sowie die
 * Fahrzeuge des grauen Zauberers – alles aus der Verfolgerperspektive von hinten.
 */
import { hex, mixRGB, rgba, type RGB } from './canvasUtils';
import type { RoadSprite } from './roadRenderer';
import { stringLights, type LightSink } from './nightLights';
import { paintExtra } from './roadsideExtras';

export interface SpriteContext {
  time: number;
  night: number;
  accentA: RGB;
  accentB: RGB;
  motion: boolean;
  /** sammelt nachts die Lichtquellen ein */
  lights?: LightSink;
}

const TAU = Math.PI * 2;
type Vec = [number, number];

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function shadow(ctx: CanvasRenderingContext2D, rx: number, ry: number, alpha = 0.22): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.fill();
}

/* ======================= Randobjekte ======================= */

export function paintRoadside(
  ctx: CanvasRenderingContext2D,
  sprite: RoadSprite,
  x: number,
  y: number,
  unit: number,
  s: SpriteContext,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(unit, unit);
  switch (sprite.kind) {
    case 'oak':
      oak(ctx, sprite.variant, s);
      break;
    case 'bush':
      bush(ctx, sprite.variant);
      break;
    case 'hole':
      hillHouse(ctx, sprite.variant, s);
      break;
    case 'fence':
      fence(ctx);
      break;
    case 'flowers':
      flowers(ctx, sprite.variant);
      break;
    case 'signpost':
      signpost(ctx, sprite.offset);
      break;
    case 'palm':
      palm(ctx, sprite.variant, s);
      break;
    case 'lamp':
      lamp(ctx, sprite.offset, sprite.variant, s);
      break;
    case 'billboard':
      billboard(ctx, sprite.variant, s);
      break;
    default:
      paintExtra(ctx, sprite, s);
  }
  ctx.restore();
}

function oak(ctx: CanvasRenderingContext2D, variant: number, s: SpriteContext): void {
  const H = 2400 * (0.85 + (variant % 3) * 0.18);
  shadow(ctx, H * 0.38, H * 0.05);
  ctx.fillStyle = '#5b3b22';
  ctx.beginPath();
  ctx.moveTo(-H * 0.06, 0);
  ctx.lineTo(H * 0.06, 0);
  ctx.lineTo(H * 0.035, -H * 0.55);
  ctx.lineTo(-H * 0.035, -H * 0.55);
  ctx.closePath();
  ctx.fill();
  const dark = variant % 2 ? '#3d772c' : '#467f2f';
  const light = variant % 2 ? '#5c9c3e' : '#68a647';
  ctx.fillStyle = dark;
  blob(ctx, 0, -H * 0.7, H * 0.36);
  blob(ctx, -H * 0.3, -H * 0.58, H * 0.26);
  blob(ctx, H * 0.3, -H * 0.6, H * 0.25);
  ctx.fillStyle = light;
  blob(ctx, -H * 0.1, -H * 0.84, H * 0.22);
  blob(ctx, H * 0.16, -H * 0.76, H * 0.18);
  blob(ctx, -H * 0.32, -H * 0.66, H * 0.13);

  // nachts hängen in den meisten Bäumen warme Lichterketten
  if (variant % 3 !== 2) {
    const r = H * 0.011;
    stringLights(
      ctx,
      s.lights,
      s.night,
      -H * 0.44,
      -H * 0.62,
      H * 0.42,
      -H * 0.66,
      H * 0.08,
      9,
      r,
      variant * 13 + 1,
    );
    stringLights(
      ctx,
      s.lights,
      s.night,
      -H * 0.3,
      -H * 0.84,
      H * 0.3,
      -H * 0.82,
      H * 0.06,
      7,
      r,
      variant * 13 + 20,
    );
  }
}

function bush(ctx: CanvasRenderingContext2D, variant: number): void {
  const r = 330 * (0.8 + (variant % 3) * 0.2);
  shadow(ctx, r * 1.5, r * 0.18);
  ctx.fillStyle = '#4a8531';
  blob(ctx, -r * 0.7, -r * 0.6, r * 0.7);
  blob(ctx, r * 0.7, -r * 0.6, r * 0.7);
  blob(ctx, 0, -r * 0.95, r * 0.85);
  ctx.fillStyle = '#62a043';
  blob(ctx, -r * 0.25, -r * 1.25, r * 0.45);
  if (variant % 2) {
    ctx.fillStyle = '#e8506a';
    for (const [bx, by] of [
      [-0.6, -0.9],
      [0.4, -1.3],
      [0.8, -0.7],
    ])
      blob(ctx, r * bx, r * by, r * 0.1);
  }
}

const DOORS = ['#2f6b3a', '#b8402f', '#d4a62a', '#2f5c9e', '#7a3f8f'];

/** Hügelhaus mit runder Tür, wie man es aus dem Auenland kennt */
function hillHouse(ctx: CanvasRenderingContext2D, variant: number, s: SpriteContext): void {
  // Hügel
  ctx.fillStyle = '#66a13e';
  ctx.beginPath();
  ctx.ellipse(0, 0, 1500, 1050, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = '#7cb64f';
  ctx.beginPath();
  ctx.ellipse(-150, -120, 1150, 820, 0, Math.PI * 1.05, Math.PI * 1.75);
  ctx.ellipse(-150, -120, 900, 600, 0, Math.PI * 1.75, Math.PI * 1.05, true);
  ctx.fill();

  // Schornstein mit Rauch
  ctx.fillStyle = '#8b7b68';
  ctx.fillRect(620, -1180, 140, 300);
  ctx.fillStyle = '#6d5f50';
  ctx.fillRect(600, -1200, 180, 50);
  const alpha = ctx.globalAlpha;
  for (let k = 0; k < 3; k++) {
    const p = ((s.motion ? s.time * 0.35 : 0) + k / 3 + variant * 0.21) % 1;
    ctx.globalAlpha = alpha * 0.6 * (1 - p);
    ctx.fillStyle = '#f2f2ee';
    blob(ctx, 690 + p * 260, -1260 - p * 650, 90 + p * 140);
  }
  ctx.globalAlpha = alpha;

  // Tür
  ctx.fillStyle = '#d6c193';
  blob(ctx, 0, -380, 400);
  ctx.fillStyle = DOORS[variant % DOORS.length];
  blob(ctx, 0, -370, 320);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 22;
  ctx.beginPath();
  for (const dx of [-160, 0, 160]) {
    const half = Math.sqrt(320 ** 2 - dx ** 2);
    ctx.moveTo(dx, -370 - half);
    ctx.lineTo(dx, -370 + half);
  }
  ctx.stroke();
  ctx.fillStyle = '#e8c252';
  blob(ctx, 0, -370, 48);
  // Boden abschneiden: Erde vor der Tür
  ctx.fillStyle = '#a5875a';
  ctx.fillRect(-420, -40, 840, 40);

  // runde Fenster
  for (const wx of [-860, 860]) {
    ctx.fillStyle = '#d6c193';
    blob(ctx, wx, -430, 190);
    ctx.fillStyle = '#ffe49a';
    blob(ctx, wx, -430, 140);
    ctx.strokeStyle = '#6d5236';
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(wx - 140, -430);
    ctx.lineTo(wx + 140, -430);
    ctx.moveTo(wx, -570);
    ctx.lineTo(wx, -290);
    ctx.stroke();
  }

  // nachts leuchten die Fenster, über der Tür hängt eine Lichterkette
  if (s.lights && s.night > 0.02) {
    s.lights.add(ctx, -860, -430, 170, 'window');
    s.lights.add(ctx, 860, -430, 170, 'window');
    s.lights.add(ctx, 0, -380, 200, 'window');
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      s.lights.add(
        ctx,
        Math.cos(a) * 470,
        -380 + Math.sin(a) * 470,
        30,
        'bulb',
        variant * 9 + i + 1,
      );
    }
  }

  // Blumen am Hang
  ['#f2c94c', '#eb5757', '#ffffff', '#bb6bd9', '#f2994a'].forEach((c, i) => {
    ctx.fillStyle = c;
    blob(ctx, -1250 + i * 120, -60 - (i % 2) * 70, 55);
    blob(ctx, 1200 - i * 110, -70 - (i % 2) * 60, 55);
  });
}

function fence(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#8b6a43';
  for (const px of [-480, 480]) ctx.fillRect(px - 40, -620, 80, 620);
  ctx.fillStyle = '#9f7d52';
  ctx.fillRect(-560, -500, 1120, 60);
  ctx.fillRect(-560, -280, 1120, 60);
}

function flowers(ctx: CanvasRenderingContext2D, variant: number): void {
  ctx.fillStyle = '#4f8f33';
  ctx.beginPath();
  ctx.ellipse(0, -40, 420, 110, 0, 0, TAU);
  ctx.fill();
  const colors = ['#f2c94c', '#eb5757', '#ffffff', '#bb6bd9', '#f2994a'];
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = colors[(i + variant) % colors.length];
    blob(ctx, -340 + i * 85, -90 - ((i * 37) % 3) * 50, 55);
  }
}

function signpost(ctx: CanvasRenderingContext2D, offset: number): void {
  const dir = offset > 0 ? -1 : 1;
  ctx.fillStyle = '#6b4c2e';
  ctx.fillRect(-45, -1400, 90, 1400);
  ctx.fillStyle = '#a07a4c';
  ctx.beginPath();
  ctx.moveTo(0, -1320);
  ctx.lineTo(dir * 620, -1320);
  ctx.lineTo(dir * 720, -1220);
  ctx.lineTo(dir * 620, -1120);
  ctx.lineTo(0, -1120);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -1050);
  ctx.lineTo(-dir * 520, -1050);
  ctx.lineTo(-dir * 610, -960);
  ctx.lineTo(-dir * 520, -870);
  ctx.lineTo(0, -870);
  ctx.closePath();
  ctx.fill();
}

function palm(ctx: CanvasRenderingContext2D, variant: number, s: SpriteContext): void {
  const H = 3400 * (0.85 + (variant % 3) * 0.15);
  const lean = (variant % 2 ? 1 : -1) * H * 0.12;
  const sway = s.motion ? Math.sin(s.time * 0.9 + variant) * H * 0.012 : 0;
  const color = rgba(mixRGB(hex('#2a1238'), hex('#05030b'), s.night));
  const tx = lean + sway;
  const ty = -H;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const t0 = i / 12;
    const t1 = (i + 1) / 12;
    ctx.lineWidth = H * 0.045 * (1 - t0 * 0.5);
    ctx.beginPath();
    ctx.moveTo(lean * t0 * t0 + sway * t0, -H * t0);
    ctx.lineTo(lean * t1 * t1 + sway * t1, -H * t1);
    ctx.stroke();
  }

  const frond = H * 0.36;
  for (const angle of [-3.0, -2.5, -2.0, -1.4, -0.9, -0.35, 0.1]) {
    const a = angle + (s.motion ? Math.sin(s.time * 1.3 + angle) * 0.04 : 0);
    const ex = tx + Math.cos(a) * frond;
    const ey = ty + Math.sin(a) * frond * 0.45 + frond * 0.4;
    const mx = tx + Math.cos(a) * frond * 0.5;
    const my = ty + Math.sin(a) * frond * 0.5 - frond * 0.1;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(mx, my - frond * 0.09, ex, ey);
    ctx.quadraticCurveTo(mx, my + frond * 0.09, tx, ty);
    ctx.fill();
  }
}

function lamp(
  ctx: CanvasRenderingContext2D,
  offset: number,
  variant: number,
  s: SpriteContext,
): void {
  const dir = offset > 0 ? -1 : 1;
  const glow = 0.25 + 0.75 * s.night;
  const accent = variant % 2 ? s.accentA : s.accentB;

  ctx.fillStyle = '#120a1c';
  ctx.fillRect(-35, -2900, 70, 2900);
  ctx.strokeStyle = '#120a1c';
  ctx.lineWidth = 50;
  ctx.beginPath();
  ctx.moveTo(0, -2880);
  ctx.quadraticCurveTo(dir * 200, -3050, dir * 650, -2980);
  ctx.stroke();

  // Neonröhre am Mast
  ctx.shadowColor = rgba(accent);
  ctx.shadowBlur = 14 + 30 * s.night;
  ctx.fillStyle = rgba(mixRGB(accent, [255, 255, 255], 0.35), 0.6 + 0.4 * s.night);
  ctx.fillRect(-14, -2300, 28, 1500);

  // Lampenkopf mit Lichtkegel
  ctx.shadowColor = '#ffd89a';
  ctx.fillStyle = '#fff1d0';
  ctx.fillRect(dir * 650 - 140, -3000, 280, 50);
  ctx.shadowBlur = 0;
  const g = ctx.createRadialGradient(dir * 650, -2960, 0, dir * 650, -2960, 900);
  g.addColorStop(0, `rgba(255,214,150,${0.35 * glow})`);
  g.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(dir * 650 - 900, -3860, 1800, 1800);
}

const BILLBOARD_TEXT = ['NEON', 'COAST', 'DRIVE', '24/7'];

function billboard(ctx: CanvasRenderingContext2D, variant: number, s: SpriteContext): void {
  const accent = variant % 2 ? s.accentA : s.accentB;
  ctx.fillStyle = '#0e0718';
  ctx.fillRect(-760, -1500, 90, 1500);
  ctx.fillRect(670, -1500, 90, 1500);
  ctx.fillStyle = '#160b26';
  ctx.fillRect(-1250, -2700, 2500, 1250);

  ctx.shadowColor = rgba(accent);
  ctx.shadowBlur = 14 + 32 * s.night;
  ctx.strokeStyle = rgba(accent, 0.7 + 0.3 * s.night);
  ctx.lineWidth = 45;
  ctx.strokeRect(-1180, -2630, 2360, 1110);

  ctx.fillStyle = rgba(mixRGB(accent, [255, 255, 255], 0.45));
  ctx.font = '600px Monoton, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(BILLBOARD_TEXT[variant % BILLBOARD_TEXT.length], 0, -2060, 2200);
  ctx.shadowBlur = 0;
}

/* ======================= Fahrzeuge ======================= */

export interface VehicleState {
  time: number;
  /** Neigung in Radiant, positiv = nach rechts */
  lean: number;
  /** 0 … 1, wie schnell das Gefährt gerade unterwegs ist */
  speed: number;
  motion: boolean;
  /** Radumdrehungen seit Start – für sichtbar drehende Räder */
  spin?: number;
  /** 0 … 1, solange Gas gegeben wird */
  gas?: number;
}

/** Staubwolken, die beim Gasgeben hinter den Rädern aufwirbeln */
function dust(
  ctx: CanvasRenderingContext2D,
  x: number,
  gas: number,
  time: number,
  seed: number,
): void {
  if (gas < 0.05) return;
  for (let i = 0; i < 5; i++) {
    const q = (time * 2.2 + i / 5 + seed * 0.37) % 1;
    ctx.fillStyle = `rgba(214,196,160,${0.65 * gas * (1 - q)})`;
    ctx.beginPath();
    ctx.arc(x + Math.sin(i * 2.1 + seed) * 18 * q, -6 + q * 26, 10 + q * 26, 0, TAU);
    ctx.fill();
  }
}

const ROBE = '#8e9099';
const ROBE_DARK = '#6c6f78';
const HAT = '#737884';
const HAT_DARK = '#5a5e69';
const HAIR = '#dcdcd8';

/** Farben des Zauberers – grau im Grünen, weiß nach dem Portal */
interface WizardPalette {
  robe: string;
  robeDark: string;
  hair: string;
}
const GREY_WIZARD: WizardPalette = { robe: ROBE, robeDark: ROBE_DARK, hair: HAIR };
const WHITE_WIZARD: WizardPalette = { robe: '#ecebe6', robeDark: '#b4b9c4', hair: '#fdfdfb' };

/**
 * Knorriger Zauberstab von a (unten) nach b (oben).
 * Grau: dunkles, verdrehtes Holz, dessen Kopf sich zu einem Knoten einrollt.
 * Weiß: helles Holz, dessen Wurzelkrallen einen leuchtenden Kristall halten.
 */
function drawStaff(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  width: number,
  white: boolean,
  glow = 0,
  /** nachts: Licht an der Stabspitze, 0 … 1 */
  tipLight = 0,
  /** im Grünen wird das Licht über den Lichtsammler gemalt, damit es nicht mit abgedunkelt wird */
  sink?: LightSink,
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const wood = white ? '#e9e7df' : '#5b3b22';
  const light = white ? '#ffffff' : '#8a6440';
  const dark = white ? '#b4b7bf' : '#3a2412';

  // Schaft mit Wellen und Astknoten
  const left: Vec[] = [];
  const right: Vec[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const wobble = Math.sin(t * 9) * width * 0.35 + Math.sin(t * 23) * width * 0.12;
    const knot =
      Math.exp(-(((t - 0.34) / 0.035) ** 2)) * width * 0.45 +
      Math.exp(-(((t - 0.63) / 0.03) ** 2)) * width * 0.4;
    const half = width * (0.55 - t * 0.12) + knot;
    const cx = ax + dx * t + nx * wobble;
    const cy = ay + dy * t + ny * wobble;
    left.push([cx + nx * half, cy + ny * half]);
    right.push([cx - nx * half, cy - ny * half]);
  }
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (const [x, y] of left) ctx.lineTo(x, y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
  if (white) {
    // dunkle Kontur, damit der helle Stab auch vor dem weißen Mantel sichtbar bleibt
    ctx.strokeStyle = '#7d828d';
    ctx.lineWidth = Math.max(1, width * 0.22);
    ctx.stroke();
  }
  ctx.strokeStyle = light;
  ctx.lineWidth = Math.max(1, width * 0.18);
  ctx.beginPath();
  left
    .slice(1, -1)
    .forEach(([x, y], i) => (i ? ctx.lineTo(x - nx, y - ny) : ctx.moveTo(x - nx, y - ny)));
  ctx.stroke();

  // Kopf im lokalen System: +x zeigt in Richtung der Stabspitze
  const L = width * 6.5;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (!white) {
    // verdrehter Knauf, der sich nach hinten einrollt, dazu ein kleiner Seitenast
    ctx.strokeStyle = wood;
    ctx.lineWidth = width * 0.95;
    ctx.beginPath();
    ctx.moveTo(-width * 0.5, 0);
    ctx.bezierCurveTo(L * 0.3, -L * 0.04, L * 0.52, L * 0.12, L * 0.44, L * 0.3);
    ctx.bezierCurveTo(L * 0.38, L * 0.44, L * 0.16, L * 0.4, L * 0.18, L * 0.24);
    ctx.quadraticCurveTo(L * 0.2, L * 0.12, L * 0.3, L * 0.16);
    ctx.stroke();
    ctx.lineWidth = width * 0.5;
    ctx.beginPath();
    ctx.moveTo(L * 0.12, -width * 0.2);
    ctx.quadraticCurveTo(L * 0.22, -L * 0.14, L * 0.36, -L * 0.12);
    ctx.stroke();
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(1, width * 0.2);
    ctx.beginPath();
    ctx.moveTo(L * 0.1, L * 0.02);
    ctx.bezierCurveTo(L * 0.3, L * 0.02, L * 0.44, L * 0.16, L * 0.4, L * 0.28);
    ctx.stroke();
  } else {
    // Kristall in den Krallen
    const cx = L * 0.3;
    const g = ctx.createRadialGradient(cx, 0, 0, cx, 0, L * (0.35 + glow * 0.4));
    g.addColorStop(0, `rgba(235,245,255,${0.75 + glow * 0.25})`);
    g.addColorStop(1, 'rgba(200,225,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, 0, L * (0.35 + glow * 0.4), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f4fbff';
    ctx.beginPath();
    ctx.ellipse(cx, 0, L * 0.12, L * 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = wood;
    ctx.lineWidth = width * 0.45;
    for (const side of [-1, -0.4, 0.4, 1]) {
      ctx.beginPath();
      ctx.moveTo(-width * 0.3, side * width * 0.25);
      ctx.quadraticCurveTo(L * 0.18, side * L * 0.22, L * 0.44, side * L * 0.06);
      ctx.stroke();
    }
  }

  // Licht an der Spitze: der Knauf bzw. der Kristall leuchtet
  if (tipLight > 0.02) {
    const hx = L * 0.3;
    const hy = white ? 0 : L * 0.16;
    if (sink) {
      sink.add(ctx, hx, hy, L * 0.55, 'soft');
    } else {
      ctx.globalCompositeOperation = 'lighter';
      const r = L * (1.6 + 1.6 * tipLight);
      const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, r);
      halo.addColorStop(0, `rgba(240,248,255,${0.9 * tipLight})`);
      halo.addColorStop(0.25, `rgba(200,225,255,${0.45 * tipLight})`);
      halo.addColorStop(1, 'rgba(180,210,255,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Pferdekutsche des Zauberers, beladen mit Feuerwerk */
export function drawCart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  k: number,
  v: VehicleState,
  lights?: LightSink,
  /** false = abgestellte Kutsche ohne Zauberer */
  driver = true,
): void {
  const trot = v.motion ? v.time * (5 + v.speed * 6) : 0;
  const bounce = Math.abs(Math.sin(trot)) * 3;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.rotate(v.lean * 0.12);

  shadow(ctx, 150, 16, 0.25);

  /* ---- Pferd ---- */
  ctx.save();
  ctx.translate(0, -bounce * 1.4);
  // Hinterbeine
  ctx.fillStyle = '#4e2f18';
  for (const [lx, phase] of [
    [-17, 0],
    [17, Math.PI],
  ] as const) {
    const lift = Math.max(0, Math.sin(trot + phase)) * 12;
    ctx.fillRect(lx - 6, -150, 12, 46 - lift);
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(lx - 7, -108 - lift, 14, 8);
    ctx.fillStyle = '#4e2f18';
  }
  // Hals, Kopf und Ohren
  ctx.fillStyle = '#6b4024';
  ctx.beginPath();
  ctx.ellipse(0, -214, 15, 30, 0, 0, TAU);
  ctx.fill();
  blob(ctx, 0, -244, 15);
  ctx.beginPath();
  ctx.moveTo(-12, -252);
  ctx.lineTo(-8, -272);
  ctx.lineTo(-3, -254);
  ctx.moveTo(12, -252);
  ctx.lineTo(8, -272);
  ctx.lineTo(3, -254);
  ctx.fill();
  ctx.fillStyle = '#2e1c10';
  ctx.fillRect(-4, -256, 8, 50);
  // Kruppe
  ctx.fillStyle = '#7a4a2a';
  blob(ctx, -16, -172, 27);
  blob(ctx, 16, -172, 27);
  ctx.fillRect(-43, -172, 86, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  blob(ctx, -20, -182, 12);
  // Schweif
  const swish = v.motion ? Math.sin(v.time * 3.1) * 14 : 0;
  ctx.strokeStyle = '#2e1c10';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -190);
  ctx.quadraticCurveTo(swish * 0.4, -160, swish, -128);
  ctx.stroke();
  ctx.restore();

  // Deichsel
  ctx.strokeStyle = '#6b4423';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-70, -92);
  ctx.lineTo(-40, -160);
  ctx.moveTo(70, -92);
  ctx.lineTo(40, -160);
  ctx.stroke();

  ctx.translate(0, -bounce * 0.6);

  if (driver) {
    /* ---- Zauberer auf dem Kutschbock ---- */
    // Stab
    drawStaff(ctx, 56, -96, 72, -290, 8, false, 0, lights ? 1 : 0, lights);
    // Mantel
    ctx.fillStyle = ROBE;
    ctx.beginPath();
    ctx.moveTo(-50, -98);
    ctx.quadraticCurveTo(-52, -160, -38, -182);
    ctx.quadraticCurveTo(0, -196, 38, -182);
    ctx.quadraticCurveTo(52, -160, 50, -98);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ROBE_DARK;
    ctx.beginPath();
    ctx.moveTo(-50, -98);
    ctx.quadraticCurveTo(-52, -160, -38, -182);
    ctx.quadraticCurveTo(-24, -150, -22, -98);
    ctx.closePath();
    ctx.fill();
    // Ärmel zum Stab
    ctx.fillStyle = ROBE;
    ctx.beginPath();
    ctx.ellipse(50, -150, 12, 22, -0.3, 0, TAU);
    ctx.fill();
    // langes graues Haar
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.moveTo(-24, -200);
    ctx.quadraticCurveTo(-30, -170, -20, -148);
    ctx.lineTo(20, -148);
    ctx.quadraticCurveTo(30, -170, 24, -200);
    ctx.closePath();
    ctx.fill();
    blob(ctx, 0, -198, 21);
    drawHat(ctx, 0, -210, 1, v.motion ? Math.sin(v.time * 2) * 3 : 0, 16);
  }

  /* ---- Ladung: Feuerwerksraketen ---- */
  [
    [-86, -128, '#e2453c'],
    [-70, -136, '#3c7be2'],
    [-54, -126, '#f2c94c'],
    [78, -124, '#8f4be2'],
    [92, -118, '#e2453c'],
  ].forEach(([rx, ry, color]) => {
    const px = rx as number;
    const py = ry as number;
    ctx.fillStyle = '#c9a26b';
    ctx.fillRect(px - 1.5, py, 3, 30);
    ctx.fillStyle = color as string;
    ctx.fillRect(px - 5, py - 4, 10, 18);
    ctx.beginPath();
    ctx.moveTo(px - 5, py - 4);
    ctx.lineTo(px, py - 14);
    ctx.lineTo(px + 5, py - 4);
    ctx.fill();
  });

  /* ---- Wagenkasten und Räder ---- */
  ctx.fillStyle = '#8a5a2e';
  ctx.beginPath();
  ctx.moveTo(-100, -26);
  ctx.lineTo(100, -26);
  ctx.lineTo(108, -98);
  ctx.lineTo(-108, -98);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,5,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const py of [-44, -62, -80]) {
    ctx.moveTo(-104, py);
    ctx.lineTo(104, py);
  }
  ctx.stroke();
  ctx.fillStyle = '#a8743f';
  ctx.fillRect(-114, -106, 228, 11);
  ctx.fillStyle = '#5e3c1c';
  ctx.fillRect(-108, -98, 10, 72);
  ctx.fillRect(98, -98, 10, 72);
  // Laterne hinten am Wagen
  ctx.fillStyle = '#3b2a1a';
  ctx.fillRect(-6, -72, 12, 18);
  ctx.fillStyle = '#ffd36a';
  ctx.fillRect(-4, -69, 8, 12);
  lights?.add(ctx, 0, -63, 12, 'lamp');

  const spin = v.spin ?? 0;
  const gas = v.gas ?? 0;
  for (const [i, wx] of [-118, 118].entries()) {
    dust(ctx, wx + Math.sign(wx) * 6, gas, v.time, i);
    drawCartWheel(ctx, wx, -44, Math.sign(wx), spin);
  }
  ctx.restore();
}

/**
 * Speichenrad der Kutsche, schräg von hinten gesehen: die Außenseite zeigt als
 * schmale Ellipse nach außen (side = ±1), mit Eisenreif, Holzfelge, zwölf
 * Speichen und vorstehender Nabe. spin in Umdrehungen.
 */
function drawCartWheel(
  ctx: CanvasRenderingContext2D,
  wx: number,
  cy: number,
  side: number,
  spin: number,
): void {
  const R = 46;
  const RX = 15;
  const ell = (dx: number, rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(wx + dx, cy, rx, ry, 0, 0, TAU);
  };

  // Lauffläche / Tiefe des Reifens auf der Innenseite
  ctx.fillStyle = '#1c130b';
  ell(-side * 6, RX - 2, R);
  ctx.fill();
  ctx.fillRect(Math.min(wx, wx - side * 6), cy - R, 6, R * 2);

  // Eisenreif
  ctx.fillStyle = '#3e3b37';
  ell(0, RX, R);
  ctx.fill();

  // Holzfelge als Ring, innen bleibt der Weg sichtbar
  ctx.fillStyle = '#7a4b22';
  ctx.beginPath();
  ctx.ellipse(wx, cy, RX - 2, R - 4, 0, 0, TAU);
  ctx.ellipse(wx, cy, RX - 5.5, R - 11, 0, 0, TAU);
  ctx.fill('evenodd');
  // Innenkante der Felge etwas dunkler für Tiefe
  ctx.strokeStyle = 'rgba(30,15,5,0.55)';
  ctx.lineWidth = 1.5;
  ell(0, RX - 5.5, R - 11);
  ctx.stroke();

  // Felgenstöße drehen sich mit
  ctx.strokeStyle = 'rgba(30,15,5,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let j = 0; j < 6; j++) {
    const a = (spin + (j + 0.5) / 6) * TAU;
    const c = Math.cos(a);
    const s = Math.sin(a);
    ctx.moveTo(wx + c * (RX - 2), cy + s * (R - 4));
    ctx.lineTo(wx + c * (RX - 5.5), cy + s * (R - 11));
  }
  ctx.stroke();

  // Speichen: hintere Hälfte dunkler, vordere hell und zur Nabe hin nach außen versetzt
  const hubX = wx + side * 4;
  ctx.lineCap = 'round';
  for (const front of [false, true]) {
    ctx.strokeStyle = front ? '#d6aa6c' : '#8c6436';
    ctx.lineWidth = front ? 3.2 : 2.6;
    ctx.beginPath();
    for (let j = 0; j < 12; j++) {
      const a = (spin + j / 12) * TAU;
      const c = Math.cos(a);
      if (c * side >= 0 !== front) continue;
      ctx.moveTo(front ? hubX : wx, cy);
      ctx.lineTo(wx + c * (RX - 5), cy + Math.sin(a) * (R - 10));
    }
    ctx.stroke();
  }

  // Nabe mit eiserner Kappe
  ctx.fillStyle = '#5e3c1c';
  ell(side * 2, 6, 10);
  ctx.fill();
  ctx.fillStyle = '#6f4a26';
  ell(side * 4, 5, 8);
  ctx.fill();
  ctx.fillStyle = '#4a4744';
  ell(side * 6.5, 3.2, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ell(side * 6.5 - 1, 1.1, 1.8);
  ctx.fill();

  // Glanzlicht auf dem Eisenreif
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(wx, cy, RX - 0.8, R - 0.8, 0, -Math.PI * 0.85, -Math.PI * 0.35);
  ctx.stroke();
}

/** Spitzhut mit breiter Krempe; tilt verbiegt die Spitze, z. B. im Fahrtwind */
function drawHat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  wobble: number,
  tipBend: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = HAT_DARK;
  ctx.beginPath();
  ctx.ellipse(0, 4, 62, 13, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = HAT;
  ctx.beginPath();
  ctx.ellipse(0, 0, 62, 12, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-30, -2);
  ctx.quadraticCurveTo(-18, -70, tipBend + wobble, -112);
  ctx.quadraticCurveTo(10, -66, 30, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = HAT_DARK;
  ctx.fillRect(-29, -16, 58, 10);
  ctx.restore();
}

export interface BikeState extends VehicleState {
  rider: boolean;
  night: number;
  accentA: RGB;
  accentB: RGB;
  /** Leuchten, solange das Motorrad angeklickt werden kann */
  highlight: number;
  /** Zauberer als „der Weiße“ – nach dem Portal */
  white?: boolean;
  /** helles Leuchten direkt nach der Verwandlung, 0 … 1 */
  aura?: number;
}

/** Motorrad von hinten, wahlweise mit Zauberer im Sattel */
export function drawBike(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  k: number,
  v: BikeState,
): void {
  const t = v.time;
  const rumble = v.motion ? Math.sin(t * 40) * 0.6 * (0.3 + v.speed) : 0;
  const wind = v.motion ? 0.4 + v.speed * 0.6 : 0.2;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);

  // Auswahl-Leuchten
  if (v.highlight > 0) {
    const g = ctx.createRadialGradient(0, -110, 10, 0, -110, 190);
    g.addColorStop(0, rgba(v.accentA, 0.35 * v.highlight));
    g.addColorStop(1, rgba(v.accentA, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-200, -310, 400, 400);
  }

  if (v.aura && v.aura > 0.01) {
    const a = ctx.createRadialGradient(0, -190, 10, 0, -190, 260);
    a.addColorStop(0, `rgba(255,255,255,${0.7 * v.aura})`);
    a.addColorStop(0.5, `rgba(235,245,255,${0.3 * v.aura})`);
    a.addColorStop(1, 'rgba(235,245,255,0)');
    ctx.fillStyle = a;
    ctx.fillRect(-270, -450, 540, 520);
  }

  // Unterbodenbeleuchtung
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 110);
  glow.addColorStop(0, rgba(v.accentA, 0.45 + 0.35 * v.night));
  glow.addColorStop(1, rgba(v.accentA, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 110, 22, 0, 0, TAU);
  ctx.fill();
  shadow(ctx, 60, 10, 0.4);

  ctx.rotate(v.lean * 0.45);
  ctx.translate(0, rumble);

  // Hinterrad
  ctx.fillStyle = '#0b0a10';
  ctx.beginPath();
  ctx.roundRect(-19, -86, 38, 86, 16);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.18 * (v.gas ?? 0)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const tread = v.spin !== undefined ? (v.spin * 140) % 14 : v.motion ? (t * 160) % 14 : 0;
  for (let ty = -80 + tread; ty < -6; ty += 14) {
    ctx.moveTo(-12, ty);
    ctx.lineTo(12, ty);
  }
  ctx.stroke();

  // Schwinge und Auspuff
  ctx.strokeStyle = '#2a2436';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-22, -44);
  ctx.lineTo(-36, -96);
  ctx.moveTo(22, -44);
  ctx.lineTo(36, -96);
  ctx.stroke();
  const chrome = ctx.createLinearGradient(30, -70, 62, -70);
  chrome.addColorStop(0, '#a9afbd');
  chrome.addColorStop(1, '#3c4050');
  ctx.fillStyle = chrome;
  ctx.save();
  ctx.translate(46, -58);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.roundRect(-10, -34, 20, 64, 9);
  ctx.fill();
  ctx.fillStyle = '#16131c';
  ctx.beginPath();
  ctx.ellipse(0, 28, 7, 4, 0, 0, TAU);
  ctx.fill();
  const gas = v.gas ?? 0;
  if (gas > 0.05) {
    // Auspuffflamme mit Rauchwölkchen
    const len = (26 + Math.sin(t * 40) * 6) * gas;
    for (const [color, width, scale] of [
      ['#ff5a1f', 9, 1],
      ['#ffd36a', 5, 0.65],
    ] as const) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-width, 30);
      ctx.quadraticCurveTo(0, 30 + len * scale * 1.4, width, 30);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = 0; i < 4; i++) {
      const q = (t * 2.5 + i / 4) % 1;
      ctx.fillStyle = `rgba(200,200,215,${0.35 * gas * (1 - q)})`;
      ctx.beginPath();
      ctx.arc(Math.sin(i * 1.7) * 10 * q, 40 + q * 60, 6 + q * 16, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  dust(ctx, 0, gas, t, 3);

  // Handlebar & Spiegel (weiter vorn, daher höher im Bild)
  ctx.strokeStyle = '#1b1724';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-74, -204);
  ctx.quadraticCurveTo(0, -196, 74, -204);
  ctx.moveTo(-66, -204);
  ctx.lineTo(-80, -236);
  ctx.moveTo(66, -204);
  ctx.lineTo(80, -236);
  ctx.stroke();
  ctx.fillStyle = '#2b2638';
  for (const mx of [-82, 82]) {
    ctx.beginPath();
    ctx.ellipse(mx, -242, 13, 9, 0, 0, TAU);
    ctx.fill();
  }

  if (!v.rider) {
    // Tank und Cockpit sind sichtbar, solange niemand draufsitzt
    const tank = ctx.createLinearGradient(-34, 0, 34, 0);
    tank.addColorStop(0, rgba(mixRGB(v.accentA, [20, 8, 30], 0.5)));
    tank.addColorStop(0.5, rgba(v.accentA));
    tank.addColorStop(1, rgba(mixRGB(v.accentA, [20, 8, 30], 0.5)));
    ctx.fillStyle = tank;
    ctx.beginPath();
    ctx.ellipse(0, -168, 34, 22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0f0c16';
    ctx.beginPath();
    ctx.roundRect(-20, -214, 40, 18, 5);
    ctx.fill();
    ctx.fillStyle = rgba(v.accentB);
    ctx.fillRect(-14, -209, 28, 5);
  }

  // Heck mit Sitzbank
  ctx.fillStyle = '#1b1530';
  ctx.beginPath();
  ctx.moveTo(-42, -100);
  ctx.lineTo(42, -100);
  ctx.lineTo(28, -134);
  ctx.lineTo(-28, -134);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(v.accentB, 0.9);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#0e0b14';
  ctx.beginPath();
  ctx.moveTo(-30, -134);
  ctx.lineTo(30, -134);
  ctx.lineTo(22, -148);
  ctx.lineTo(-22, -148);
  ctx.closePath();
  ctx.fill();
  // Rücklicht und Kennzeichen
  ctx.shadowColor = '#ff2a4a';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ff3355';
  ctx.fillRect(-26, -112, 52, 7);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ece6d6';
  ctx.beginPath();
  ctx.roundRect(-27, -104, 54, 24, 3);
  ctx.fill();
  ctx.strokeStyle = '#2a2436';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#2a2436';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EH 02', 0, -91.5, 48);

  if (v.rider) drawRider(ctx, t, wind, v);

  ctx.restore();
}

function drawRider(ctx: CanvasRenderingContext2D, t: number, wind: number, v: BikeState): void {
  const flap = (speed: number, phase = 0) => (v.motion ? Math.sin(t * speed + phase) : 0);
  const p = v.white ? WHITE_WIZARD : GREY_WIZARD;

  // Beine mit Stiefeln auf den Rasten
  ctx.fillStyle = p.robeDark;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 26, -140);
    ctx.quadraticCurveTo(side * 66, -158, side * 60, -120);
    ctx.lineTo(side * 52, -96);
    ctx.lineTo(side * 34, -100);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#2b211b';
  ctx.fillRect(-60, -100, 20, 14);
  ctx.fillRect(40, -100, 20, 14);

  // Mantelschöße flattern im Fahrtwind
  ctx.fillStyle = p.robe;
  for (const side of [-1, 1]) {
    const f = flap(16, side) * 8 * wind;
    ctx.beginPath();
    ctx.moveTo(side * 12, -150);
    ctx.quadraticCurveTo(side * 44, -136 + f, side * (52 + f), -112 + f);
    ctx.lineTo(side * (30 + f * 0.5), -118);
    ctx.lineTo(0, -132);
    ctx.closePath();
    ctx.fill();
  }

  // gebeugter Rücken
  ctx.fillStyle = p.robe;
  ctx.beginPath();
  ctx.moveTo(-34, -142);
  ctx.quadraticCurveTo(-54, -200, -30, -222);
  ctx.quadraticCurveTo(0, -234, 30, -222);
  ctx.quadraticCurveTo(54, -200, 34, -142);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = p.robeDark;
  ctx.beginPath();
  ctx.moveTo(-34, -142);
  ctx.quadraticCurveTo(-54, -200, -30, -222);
  ctx.quadraticCurveTo(-26, -180, -14, -142);
  ctx.closePath();
  ctx.fill();

  // Arme zum Lenker
  ctx.strokeStyle = p.robe;
  ctx.lineCap = 'round';
  ctx.lineWidth = 17;
  ctx.beginPath();
  ctx.moveTo(-32, -212);
  ctx.lineTo(-64, -206);
  ctx.moveTo(32, -212);
  ctx.lineTo(64, -206);
  ctx.stroke();

  // Stab quer auf dem Rücken festgeschnallt
  drawStaff(ctx, -52, -150, 58, -258, 7, !!v.white, v.aura ?? 0, v.night);
  ctx.strokeStyle = '#3b2a1a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-28, -214);
  ctx.lineTo(30, -150);
  ctx.stroke();

  // Schal in Neonfarbe
  const sf = flap(11) * 10 * wind;
  ctx.strokeStyle = rgba(v.accentA);
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(10, -226);
  ctx.bezierCurveTo(40, -226 + sf, 70, -212 - sf, 104 + wind * 20, -214 + sf);
  ctx.stroke();

  // wehendes Haar – beim Weißen ohne Hut und deutlich länger
  ctx.fillStyle = p.hair;
  const hf = flap(13, 1) * 6 * wind;
  if (v.white) {
    // langes weißes Haar fällt über den Rücken und weht seitlich nach hinten
    const f = flap(12, 2) * 8 * wind;
    ctx.beginPath();
    ctx.moveTo(-18, -252);
    ctx.quadraticCurveTo(-34 - f, -214, -26 + f, -172);
    ctx.quadraticCurveTo(0, -162 + f, 26 - f, -172);
    ctx.quadraticCurveTo(34 + f, -214, 18, -252);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d5d8de';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const hx of [-12, 0, 12]) {
      ctx.moveTo(hx, -236);
      ctx.quadraticCurveTo(hx * 1.4 + f * 0.5, -205, hx * 1.6, -178);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-20, -240);
  ctx.quadraticCurveTo(-30 - hf, -214, -22 + hf, -196);
  ctx.lineTo(22 - hf, -196);
  ctx.quadraticCurveTo(30 + hf, -214, 20, -240);
  ctx.closePath();
  ctx.fill();
  blob(ctx, 0, -238, 19);

  if (v.white) {
    blob(ctx, 0, -244, 21);
    return;
  }

  // Hut, die Spitze knickt im Fahrtwind nach hinten
  drawHat(ctx, 0, -250, 0.85, flap(9) * 8 * wind, -30 - wind * 26);
}

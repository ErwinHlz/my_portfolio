/**
 * Konfetti-Kanonen: feuern bei jedem BOOM. Jedes Schnipsel fliegt auf einer
 * geschlossenen Bahn mit Luftwiderstand – dadurch ist die Position eine reine
 * Funktion der Zeit (Pause und Vorspulen funktionieren ohne Simulation).
 * Gelandetes Konfetti bleibt auf dem Boden liegen und sammelt sich an.
 */
import { CANNONS, CEIL_Y } from './boomClapRoom';
import { seeded } from './canvasUtils';

const G = 820;
const TUBE = 78;

/** Eine Kanone: Standpunkt, Richtung (nach innen), Größe und Neigung */
export interface CannonSpec {
  x: number;
  y: number;
  dir: 1 | -1;
  scale: number;
  tilt: number;
}

/** die beiden Kanonen im Ganzkörper-Zimmer */
export const ROOM_CANNONS: CannonSpec[] = CANNONS.map((c) => ({
  x: c.x,
  y: c.y,
  dir: c.dir as 1 | -1,
  scale: 1.3,
  tilt: 0.36,
}));

export interface BurstOptions {
  cannons?: CannonSpec[];
  /** Maßstab für Tempo, Schwerkraft und Schnipselgröße */
  scale?: number;
  count?: number;
  /** Bodenhöhe zum Liegenbleiben (min, max) – null = fällt aus dem Bild */
  floor?: [number, number] | null;
  /** Decke, an der Schnipsel anstoßen */
  ceil?: number;
}

interface Bit {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  k: number;
  amp: number;
  freq: number;
  ph: number;
  spin: number;
  flip: number;
  w: number;
  h: number;
  color: string;
  streamer: boolean;
  floorY: number;
  tLand: number;
  g: number;
  ceil: number;
  /** 0 = hinter dem Helden, 1 = davor */
  layer: 0 | 1;
  lineW: number;
}

export interface Burst {
  /** Startzeit in Sekunden */
  t: number;
  palette: string[];
  bits: Bit[];
}

const PALETTES = {
  spidey: ['#e62e3c', '#2a5bd7', '#f5c84c', '#ffffff', '#c9d3e6', '#ff6b7a'],
  symbiote: ['#0b0b10', '#f2f4fa', '#7b4dff', '#b9c2d6', '#2a2f45', '#a98bff'],
  finale: ['#e62e3c', '#2a5bd7', '#f5c84c', '#ffffff', '#0b0b10', '#7b4dff', '#3fd28a'],
};

export type PaletteName = keyof typeof PALETTES;

/** Mündung der Kanone (inkl. Rückstoß) */
export function muzzle(c: CannonSpec, recoil = 0): [number, number] {
  const a = c.dir * c.tilt;
  const len = (TUBE - recoil) * c.scale;
  return [c.x + Math.sin(a) * len, c.y - 30 * c.scale - Math.cos(a) * len];
}

function posAt(b: Bit, t: number): [number, number] {
  const e = 1 - Math.exp(-b.k * t);
  const sway = Math.sin(b.freq * t + b.ph) * b.amp * Math.min(1, t * 1.2) * e;
  const x = b.x0 + (b.vx / b.k) * e + sway;
  let y = b.y0 + ((b.vy - b.g / b.k) / b.k) * e + (b.g / b.k) * t;
  if (y < b.ceil) y = b.ceil;
  return [x, y];
}

export function makeBurst(
  t: number,
  palette: PaletteName,
  seed: number,
  opts: BurstOptions = {},
): Burst {
  const rand = seeded(seed);
  const colors = PALETTES[palette];
  const bits: Bit[] = [];
  const cannons = opts.cannons ?? ROOM_CANNONS;
  const sc = opts.scale ?? 1;
  const count = opts.count ?? 170;
  const floor = opts.floor === undefined ? ([878, 998] as [number, number]) : opts.floor;
  cannons.forEach((c) => {
    const [mx, my] = muzzle(c);
    for (let i = 0; i < count; i++) {
      const streamer = i < count * 0.07;
      const a = c.dir * c.tilt + (rand() - 0.5) * 0.62;
      const speed = (1150 + rand() * 1300) * sc;
      const layer: 0 | 1 = rand() < 0.45 ? 0 : 1;
      // hintere Schnipsel kleiner – wirkt wie Tiefe
      const size = sc * (layer ? 1 : 0.62);
      const bit: Bit = {
        x0: mx + (rand() - 0.5) * 8,
        y0: my + (rand() - 0.5) * 8,
        vx: Math.sin(a) * speed,
        vy: -Math.cos(a) * speed,
        k: streamer ? 2.2 + rand() * 0.6 : 2.6 + rand() * 1.4,
        amp: (18 + rand() * 46) * sc,
        freq: 2 + rand() * 4,
        ph: rand() * Math.PI * 2,
        spin: (rand() - 0.5) * 14,
        flip: 6 + rand() * 12,
        w: streamer ? 3 : (6 + rand() * 7) * size,
        h: streamer ? 3 : (3.5 + rand() * 4) * size,
        color: colors[Math.floor(rand() * colors.length)],
        streamer,
        floorY: floor ? floor[0] + rand() * (floor[1] - floor[0]) : Infinity,
        tLand: Infinity,
        g: G * sc,
        ceil: opts.ceil ?? CEIL_Y - 70,
        layer,
        lineW: 2.6 * size,
      };
      // Landezeitpunkt einmal vorab suchen
      if (floor) {
        // erst nach dem Scheitelpunkt landen (die Kanonen stehen unterhalb des Bodens)
        let tt = 0.05;
        let above = false;
        while (tt < 12) {
          const y = posAt(bit, tt)[1];
          if (y < bit.floorY - 40) above = true;
          else if (above) break;
          tt += 0.03;
        }
        bit.tLand = above ? tt : Infinity;
      }
      bits.push(bit);
    }
  });
  return { t, palette: colors, bits };
}

/** Schnipsel und Luftschlangen zeichnen (in Weltkoordinaten) */
export function drawConfetti(
  ctx: CanvasRenderingContext2D,
  bursts: Burst[],
  time: number,
  layer?: 0 | 1,
) {
  for (const burst of bursts) {
    const dt = time - burst.t;
    if (dt < 0) continue;
    for (const b of burst.bits) {
      if (layer !== undefined && b.layer !== layer) continue;
      if (dt > 9 && b.tLand === Infinity) continue;
      const landed = dt >= b.tLand;
      const tt = landed ? b.tLand : dt;
      const [x, y] = posAt(b, tt);
      if (b.streamer) {
        // Luftschlange: geschwungene Linie entlang der eigenen Bahn
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.lineW;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const ti = Math.max(0, tt - i * 0.028);
          const [px, py] = posAt(b, ti);
          const curl = Math.sin(i * 1.3 + b.ph + tt * 6) * 7 * (b.lineW / 2.6);
          const yy = landed ? Math.min(b.floorY + 2, py + curl * 0.3) : py;
          if (i) ctx.lineTo(px + curl, yy);
          else ctx.moveTo(px, yy);
        }
        ctx.stroke();
        continue;
      }
      ctx.save();
      ctx.translate(x, landed ? b.floorY : y);
      if (landed) {
        // flach am Boden, perspektivisch gestaucht
        ctx.rotate(b.ph);
        ctx.scale(1, 0.38);
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      } else {
        ctx.rotate(b.ph + b.spin * tt);
        const f = Math.cos(b.flip * tt + b.ph);
        ctx.scale(1, Math.max(0.12, Math.abs(f)));
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        // Glanz, wenn das Papier zur Kamera kippt
        if (f > 0.75) {
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * 0.35);
        }
      }
      ctx.restore();
    }
  }
}

/** Die beiden Kanonen mit Rückstoß, Mündungsfeuer und Rauch */
export function drawCannons(
  ctx: CanvasRenderingContext2D,
  bursts: Burst[],
  time: number,
  cannons: CannonSpec[] = ROOM_CANNONS,
) {
  let since = Infinity;
  for (const b of bursts) if (time >= b.t) since = Math.min(since, time - b.t);
  const recoil = since < 1 ? 16 * Math.exp(-since * 9) * Math.min(1, since * 60) : 0;

  cannons.forEach((c) => {
    const a = c.dir * c.tilt;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.scale, c.scale);
    // Schatten
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 52, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Sockel mit Spinne
    let g = ctx.createLinearGradient(-36, 0, 36, 0);
    g.addColorStop(0, '#1e2230');
    g.addColorStop(0.4, '#3a4157');
    g.addColorStop(1, '#151823');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-38, 8);
    ctx.lineTo(-30, -30);
    ctx.lineTo(30, -30);
    ctx.lineTo(38, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c51f2b';
    ctx.fillRect(-30, -30, 60, 6);
    ctx.fillStyle = '#e8e3d6';
    ctx.beginPath();
    ctx.arc(0, -10, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0b0b0e';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (const sd of [-1, 1]) {
      ctx.moveTo(0, -11);
      ctx.lineTo(sd * 6, -16);
      ctx.moveTo(0, -10);
      ctx.lineTo(sd * 7, -10);
      ctx.moveTo(0, -9);
      ctx.lineTo(sd * 6, -4);
    }
    ctx.stroke();
    ctx.fillStyle = '#0b0b0e';
    ctx.beginPath();
    ctx.ellipse(0, -10, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Schlauch zur Druckluftflasche
    ctx.strokeStyle = '#11131a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c.dir * -34, -2);
    ctx.quadraticCurveTo(c.dir * -60, 10, c.dir * -70, -4);
    ctx.stroke();
    ctx.fillStyle = '#7a8195';
    ctx.fillRect(c.dir * -76 - 6, -30, 12, 34);
    ctx.fillStyle = '#c9cfdb';
    ctx.fillRect(c.dir * -76 - 4, -36, 8, 7);

    // Rohr, schräg nach innen, mit Rückstoß
    ctx.translate(0, -30);
    ctx.rotate(a);
    ctx.translate(0, recoil);
    const L = TUBE;
    g = ctx.createLinearGradient(-15, 0, 15, 0);
    g.addColorStop(0, '#8d1420');
    g.addColorStop(0.35, '#ef4b4b');
    g.addColorStop(0.7, '#c51f2b');
    g.addColorStop(1, '#5c0a12');
    ctx.fillStyle = g;
    ctx.fillRect(-14, -L, 28, L);
    // Spiralstreifen
    ctx.save();
    ctx.beginPath();
    ctx.rect(-14, -L, 28, L);
    ctx.clip();
    for (let y = -L - 30; y < 30; y += 22) {
      ctx.fillStyle = 'rgba(30,60,170,0.85)';
      ctx.beginPath();
      ctx.moveTo(-14, y);
      ctx.lineTo(14, y - 14);
      ctx.lineTo(14, y - 6);
      ctx.lineTo(-14, y + 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(-14, y + 8);
      ctx.lineTo(14, y - 6);
      ctx.lineTo(14, y - 4);
      ctx.lineTo(-14, y + 10);
      ctx.fill();
    }
    g = ctx.createLinearGradient(-14, 0, 14, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(-14, -L, 28, L);
    ctx.restore();
    // goldener Ring und Öffnung
    ctx.fillStyle = '#d6b35c';
    ctx.fillRect(-16, -L - 4, 32, 8);
    ctx.fillStyle = '#f6dc8e';
    ctx.fillRect(-16, -L - 4, 32, 2);
    ctx.fillStyle = '#100a08';
    ctx.beginPath();
    ctx.ellipse(0, -L - 4, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Mündungsfeuer
    if (since < 0.14) {
      const k = since / 0.14;
      ctx.translate(0, -L - 6);
      ctx.fillStyle = `rgba(255,250,220,${1 - k})`;
      ctx.beginPath();
      for (let s = 0; s < 14; s++) {
        const an = -Math.PI / 2 + (s / 14 - 0.5) * 2.2;
        const r = s % 2 ? 16 : 40 + 30 * (1 - k);
        ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255,200,90,${0.8 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(0, -6, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Rauchwolken steigen auf
    if (since < 1.8) {
      const [mx, my] = muzzle(c);
      const rand = seeded(Math.round(c.x) * 31 + 5);
      for (let p = 0; p < 9; p++) {
        const sp = 0.4 + rand() * 0.8;
        const ang = a + (rand() - 0.5) * 0.9;
        const d = (1 - Math.exp(-since * 3)) * 90 * sp * (c.scale / 1.3);
        const x = mx + Math.sin(ang) * d + Math.sin(since * 2 + p) * 6;
        const y = my - Math.cos(ang) * d - since * 26 * (c.scale / 1.3);
        const r = (10 + since * 34 * sp) * (c.scale / 1.3);
        const alpha = Math.max(0, 0.32 * (1 - since / 1.8));
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, `rgba(220,215,225,${alpha})`);
        rg.addColorStop(1, 'rgba(220,215,225,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
  });
}

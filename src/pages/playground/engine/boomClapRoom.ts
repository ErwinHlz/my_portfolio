/**
 * Peters Zimmer in Queens – Weltkoordinaten 1800 × 1020, Mitte bei x = 900.
 * Im Querformat sieht man den ganzen Raum, im Hochformat (Reel) die Mitte.
 * Das Statische wird einmal in ein Offscreen-Canvas gemalt, alles was sich
 * bewegt oder leuchtet kommt pro Frame dazu.
 */
import { seeded } from './canvasUtils';

export const W = 1800;
export const H = 1020;
export const CX = 900;
/** Rückwand */
export const BACK = { l: 460, r: 1340, t: 200, b: 742 };
/** Fluchtpunkt */
export const VP = { x: CX, y: 471 };
/** Boden auf Höhe des Helden */
export const FLOOR_Y = 890;
/** Decke an der Stelle, an der er klebt */
export const CEIL_Y = 115;
/** Deckenlampe */
export const LAMP = { x: 1110, y: 92, cord: 64 };
/** Konfetti-Kanonen links und rechts vom Helden */
export const CANNONS = [
  { x: 610, y: 936, dir: 1 },
  { x: 1190, y: 936, dir: -1 },
];

export const WINDOW = { l: 1000, r: 1236, t: 256, b: 540 };

/* ------------------------------------------------------------------ */
/*  Perspektive                                                        */
/* ------------------------------------------------------------------ */

/** Punkt auf der Geraden Fluchtpunkt → p, verlängert bis zur Höhe y */
function towardVP(p: { x: number; y: number }, y: number) {
  const k = (y - VP.y) / (p.y - VP.y);
  return VP.x + (p.x - VP.x) * k;
}

/**
 * Punkt auf einer Seitenwand. k = 1 an der Rückwand, größer = näher an der
 * Kamera; h = 0 Boden … 1 Decke.
 */
function wallPt(side: -1 | 1, k: number, h: number): [number, number] {
  const bx = side < 0 ? BACK.l : BACK.r;
  const x = VP.x + (bx - VP.x) * k;
  const yf = VP.y + (BACK.b - VP.y) * k;
  const yc = VP.y + (BACK.t - VP.y) * k;
  return [x, yf + (yc - yf) * h];
}

function wallQuad(
  ctx: CanvasRenderingContext2D,
  side: -1 | 1,
  k0: number,
  k1: number,
  h0: number,
  h1: number,
) {
  const a = wallPt(side, k0, h0);
  const b = wallPt(side, k1, h0);
  const c = wallPt(side, k1, h1);
  const d = wallPt(side, k0, h1);
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(c[0], c[1]);
  ctx.lineTo(d[0], d[1]);
  ctx.closePath();
}

/** Punkt auf dem Boden: u = 0 … 1 quer über die Rückwand, k wie oben */
function floorPt(u: number, k: number): [number, number] {
  const bx = BACK.l + (BACK.r - BACK.l) * u;
  return [VP.x + (bx - VP.x) * k, VP.y + (BACK.b - VP.y) * k];
}

/* ------------------------------------------------------------------ */
/*  Statischer Raum                                                    */
/* ------------------------------------------------------------------ */

export function paintRoom(ctx: CanvasRenderingContext2D) {
  const rand = seeded(7);
  const top = -60;
  const ceilL = towardVP({ x: BACK.l, y: BACK.t }, top);
  const ceilR = towardVP({ x: BACK.r, y: BACK.t }, top);
  const floorL = towardVP({ x: BACK.l, y: BACK.b }, H + 60);
  const floorR = towardVP({ x: BACK.r, y: BACK.b }, H + 60);

  /* ---------- Decke ---------- */
  let g = ctx.createLinearGradient(0, top, 0, BACK.t);
  g.addColorStop(0, '#3e465d');
  g.addColorStop(1, '#2d3349');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(ceilL, top);
  ctx.lineTo(ceilR, top);
  ctx.lineTo(BACK.r, BACK.t);
  ctx.lineTo(BACK.l, BACK.t);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let i = 0; i < 700; i++) {
    const y = top + rand() * (BACK.t - top);
    const x =
      towardVP({ x: BACK.l, y: BACK.t }, y) +
      rand() * (towardVP({ x: BACK.r, y: BACK.t }, y) - towardVP({ x: BACK.l, y: BACK.t }, y));
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  /* ---------- Seitenwände ---------- */
  for (const side of [-1, 1] as const) {
    const bx = side < 0 ? BACK.l : BACK.r;
    const ct = side < 0 ? ceilL : ceilR;
    const fb = side < 0 ? floorL : floorR;
    g = ctx.createLinearGradient(bx, 0, side < 0 ? 0 : W, 0);
    g.addColorStop(0, '#20263a');
    g.addColorStop(1, '#2a3248');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ct, top);
    ctx.lineTo(bx, BACK.t);
    ctx.lineTo(bx, BACK.b);
    ctx.lineTo(fb, H + 60);
    ctx.lineTo(side < 0 ? -400 : W + 400, H + 60);
    ctx.lineTo(side < 0 ? -400 : W + 400, top);
    ctx.closePath();
    ctx.fill();
    // Tapetenstreifen in Perspektive
    ctx.strokeStyle = 'rgba(255,255,255,0.022)';
    ctx.lineWidth = 5;
    for (let k = 1.05; k < 2.4; k += 0.07) {
      const a = wallPt(side, k, 0);
      const b = wallPt(side, k, 1);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    // Fußleiste
    ctx.fillStyle = '#bdb7a9';
    wallQuad(ctx, side, 1, 2.6, 0, 0.026);
    ctx.fill();
  }

  /* ---------- Rückwand ---------- */
  g = ctx.createLinearGradient(0, BACK.t, 0, BACK.b);
  g.addColorStop(0, '#2e3752');
  g.addColorStop(1, '#232a40');
  ctx.fillStyle = g;
  ctx.fillRect(BACK.l, BACK.t, BACK.r - BACK.l, BACK.b - BACK.t);
  ctx.fillStyle = 'rgba(255,255,255,0.022)';
  for (let x = BACK.l + 6; x < BACK.r; x += 18) ctx.fillRect(x, BACK.t, 6, BACK.b - BACK.t);
  ctx.fillStyle = '#3d4561';
  ctx.fillRect(BACK.l, BACK.t, BACK.r - BACK.l, 7);
  ctx.fillStyle = '#c9c3b5';
  ctx.fillRect(BACK.l, BACK.b - 14, BACK.r - BACK.l, 14);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(BACK.l, BACK.b - 14, BACK.r - BACK.l, 2);
  // Steckdose
  ctx.fillStyle = '#d8d3c6';
  ctx.fillRect(946, 700, 14, 20);
  ctx.fillStyle = '#555';
  ctx.fillRect(950, 705, 2, 4);
  ctx.fillRect(954, 705, 2, 4);
  ctx.fillRect(950, 712, 2, 4);
  ctx.fillRect(954, 712, 2, 4);

  // Raumkanten
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(BACK.l, BACK.t);
  ctx.lineTo(BACK.l, BACK.b);
  ctx.lineTo(floorL, H + 60);
  ctx.moveTo(BACK.r, BACK.t);
  ctx.lineTo(BACK.r, BACK.b);
  ctx.lineTo(floorR, H + 60);
  ctx.moveTo(ceilL, top);
  ctx.lineTo(BACK.l, BACK.t);
  ctx.lineTo(BACK.r, BACK.t);
  ctx.lineTo(ceilR, top);
  ctx.stroke();

  paintLeftWall(ctx);
  paintRightWall(ctx);
  paintWindow(ctx, rand);
  paintPoster(ctx);
  paintCorkboard(ctx);
  paintShelf(ctx);

  /* ---------- Boden ---------- */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(BACK.l, BACK.b);
  ctx.lineTo(BACK.r, BACK.b);
  ctx.lineTo(floorR, H + 60);
  ctx.lineTo(floorL, H + 60);
  ctx.closePath();
  g = ctx.createLinearGradient(0, BACK.b, 0, H);
  g.addColorStop(0, '#4a3324');
  g.addColorStop(1, '#6e4c32');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // einzelne Dielen leicht unterschiedlich getönt
  const boards = 26;
  for (let i = 0; i < boards; i++) {
    const u0 = i / boards;
    const u1 = (i + 1) / boards;
    const a = floorPt(u0, 1);
    const b = floorPt(u1, 1);
    const c = floorPt(u1, 2.2);
    const d = floorPt(u0, 2.2);
    ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,220,170' : '0,0,0'},${0.02 + rand() * 0.05})`;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.lineTo(d[0], d[1]);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(20,10,4,0.45)';
  ctx.lineWidth = 1.3;
  for (let i = 0; i <= boards; i++) {
    const a = floorPt(i / boards, 1);
    const b = floorPt(i / boards, 2.2);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  for (let row = 0; row < 14; row++) {
    const k = 1 + row * 0.085;
    for (let i = 0; i < boards; i++) {
      if ((i * 7 + row * 3) % 5 !== 0) continue;
      const a = floorPt(i / boards, k);
      const b = floorPt((i + 1) / boards, k);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(255,220,170,0.05)';
  for (let i = 0; i < 220; i++) {
    const y = BACK.b + rand() * (H - BACK.b);
    const x = rand() * W;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 10 + rand() * 26, y + (rand() - 0.5) * 2);
    ctx.stroke();
  }
  // Glanz auf dem Holz
  g = ctx.createRadialGradient(CX, 1000, 40, CX, 900, 700);
  g.addColorStop(0, 'rgba(255,230,190,0.06)');
  g.addColorStop(1, 'rgba(255,230,190,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, BACK.b, W, H);
  ctx.restore();

  paintRug(ctx);
  paintDesk(ctx);
  paintBed(ctx);
  paintFloorStuff(ctx);
}

function paintLeftWall(ctx: CanvasRenderingContext2D) {
  // Bücherregal an der Wand
  ctx.fillStyle = '#4a321f';
  wallQuad(ctx, -1, 1.03, 1.2, 0.0, 0.62);
  ctx.fill();
  // Vorderkante (ragt in den Raum)
  const a = wallPt(-1, 1.2, 0);
  const b = wallPt(-1, 1.2, 0.62);
  ctx.fillStyle = '#6a4a2f';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(b[0] + 26, b[1] + 6);
  ctx.lineTo(a[0] + 26, a[1] - 2);
  ctx.closePath();
  ctx.fill();
  const rand = seeded(21);
  const colors = [
    '#a33b3b',
    '#2f5d8a',
    '#d1a23f',
    '#3d6b47',
    '#7c4f9e',
    '#d9d3c4',
    '#c8202c',
    '#20263a',
  ];
  for (let shelf = 0; shelf < 4; shelf++) {
    const h0 = 0.04 + shelf * 0.15;
    ctx.fillStyle = '#2e1f13';
    wallQuad(ctx, -1, 1.03, 1.2, h0, h0 + 0.012);
    ctx.fill();
    let k = 1.04;
    while (k < 1.19) {
      const w = 0.006 + rand() * 0.007;
      const hh = 0.08 + rand() * 0.05;
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      wallQuad(ctx, -1, k, Math.min(1.19, k + w), h0 + 0.012, h0 + 0.012 + hh);
      ctx.fill();
      k += w + 0.001;
      if (rand() > 0.9) k += 0.012;
    }
  }
  // Lego-Raumschiff ganz oben
  const lp = wallPt(-1, 1.11, 0.66);
  ctx.fillStyle = '#9ea4ad';
  ctx.beginPath();
  ctx.arc(lp[0], lp[1], 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b7079';
  ctx.fillRect(lp[0] - 16, lp[1] - 1.5, 32, 3);
  ctx.beginPath();
  ctx.arc(lp[0] - 6, lp[1] - 7, 4, 0, Math.PI * 2);
  ctx.fill();

  // Raketen-Poster
  ctx.fillStyle = '#e6dfcf';
  wallQuad(ctx, -1, 1.32, 1.62, 0.38, 0.82);
  ctx.fill();
  ctx.fillStyle = '#16264d';
  wallQuad(ctx, -1, 1.34, 1.6, 0.42, 0.8);
  ctx.fill();
  const r0 = wallPt(-1, 1.47, 0.48);
  const r1 = wallPt(-1, 1.47, 0.74);
  ctx.strokeStyle = '#e8e3d6';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(r0[0], r0[1]);
  ctx.lineTo(r1[0], r1[1]);
  ctx.stroke();
  ctx.fillStyle = '#d9644a';
  ctx.beginPath();
  ctx.moveTo(r1[0] - 6, r1[1] + 4);
  ctx.lineTo(r1[0], r1[1] - 16);
  ctx.lineTo(r1[0] + 6, r1[1] + 4);
  ctx.fill();
  ctx.fillStyle = '#f0b429';
  ctx.beginPath();
  ctx.moveTo(r0[0] - 5, r0[1]);
  ctx.lineTo(r0[0], r0[1] + 20);
  ctx.lineTo(r0[0] + 5, r0[1]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 14; i++) {
    const p = wallPt(-1, 1.35 + rand() * 0.24, 0.44 + rand() * 0.34);
    ctx.fillRect(p[0], p[1], 1.6, 1.6);
  }

  // Wimpel
  const p0 = wallPt(-1, 1.75, 0.66);
  const p1 = wallPt(-1, 1.98, 0.6);
  const p2 = wallPt(-1, 1.75, 0.54);
  ctx.fillStyle = '#e07a2c';
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.lineTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(p0[0] + 10, (p0[1] + p2[1]) / 2 + 5);
  ctx.rotate(-0.05);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText('QUEENS', 0, 0);
  ctx.restore();
}

function paintRightWall(ctx: CanvasRenderingContext2D) {
  // Tür mit Rahmen, Klinke und Lichtschalter
  ctx.fillStyle = '#d6d0c2';
  wallQuad(ctx, 1, 1.12, 1.42, 0, 0.78);
  ctx.fill();
  const g = ctx.createLinearGradient(wallPt(1, 1.14, 0)[0], 0, wallPt(1, 1.4, 0)[0], 0);
  g.addColorStop(0, '#7a5a3c');
  g.addColorStop(1, '#5e4329');
  ctx.fillStyle = g;
  wallQuad(ctx, 1, 1.14, 1.4, 0, 0.75);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  wallQuad(ctx, 1, 1.17, 1.37, 0.42, 0.7);
  ctx.stroke();
  wallQuad(ctx, 1, 1.17, 1.37, 0.06, 0.36);
  ctx.stroke();
  const knob = wallPt(1, 1.36, 0.36);
  ctx.fillStyle = '#d6b35c';
  ctx.beginPath();
  ctx.arc(knob[0], knob[1], 5, 0, Math.PI * 2);
  ctx.fill();
  // Spider-Man-Türhänger „BITTE NICHT STÖREN“
  const hang = wallPt(1, 1.35, 0.4);
  ctx.fillStyle = '#c8202c';
  ctx.fillRect(hang[0] - 9, hang[1], 18, 34);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 5px Arial, sans-serif';
  ctx.fillText('NICHT', hang[0] - 7.5, hang[1] + 22);
  ctx.fillText('STÖREN', hang[0] - 8.5, hang[1] + 28);
  const sw = wallPt(1, 1.48, 0.42);
  ctx.fillStyle = '#e4dfd3';
  ctx.fillRect(sw[0] - 5, sw[1] - 8, 12, 18);
  ctx.fillStyle = '#bbb';
  ctx.fillRect(sw[0] - 1, sw[1] - 3, 4, 8);
}

function paintWindow(ctx: CanvasRenderingContext2D, rand: () => number) {
  const { l, r, t, b } = WINDOW;
  ctx.save();
  ctx.beginPath();
  ctx.rect(l, t, r - l, b - t);
  ctx.clip();
  let g = ctx.createLinearGradient(0, t, 0, b);
  g.addColorStop(0, '#0a0f2c');
  g.addColorStop(0.55, '#26245a');
  g.addColorStop(0.85, '#7b3e6b');
  g.addColorStop(1, '#d9785c');
  ctx.fillStyle = g;
  ctx.fillRect(l, t, r - l, b - t);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 40; i++) ctx.fillRect(l + rand() * (r - l), t + rand() * 110, 1.2, 1.2);
  // Mond mit Hof
  const mx = l + 46;
  const my = t + 50;
  g = ctx.createRadialGradient(mx, my, 2, mx, my, 56);
  g.addColorStop(0, 'rgba(255,250,225,0.35)');
  g.addColorStop(1, 'rgba(255,250,225,0)');
  ctx.fillStyle = g;
  ctx.fillRect(l, t, 120, 120);
  ctx.fillStyle = '#f6f0d6';
  ctx.beginPath();
  ctx.arc(mx, my, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,170,140,0.35)';
  ctx.beginPath();
  ctx.arc(mx - 4, my - 3, 3.5, 0, Math.PI * 2);
  ctx.arc(mx + 5, my + 5, 2.5, 0, Math.PI * 2);
  ctx.arc(mx + 3, my - 6, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Skyline: hinten Manhattan, vorne Queens
  const layers = [
    { base: b - 34, min: 70, max: 170, color: '#2a2450', lit: 0.25, wmin: 12, wmax: 26 },
    { base: b, min: 34, max: 96, color: '#141230', lit: 0.4, wmin: 22, wmax: 40 },
  ];
  for (const layer of layers) {
    let x = l - 6;
    while (x < r + 6) {
      const w = layer.wmin + rand() * (layer.wmax - layer.wmin);
      const h = layer.min + rand() * (layer.max - layer.min);
      const tp = layer.base - h;
      ctx.fillStyle = layer.color;
      ctx.fillRect(x, tp, w, h + 40);
      if (layer === layers[0] && rand() > 0.8) {
        ctx.beginPath();
        ctx.moveTo(x, tp);
        ctx.lineTo(x + w / 2, tp - 30);
        ctx.lineTo(x + w, tp);
        ctx.fill();
        ctx.fillRect(x + w / 2 - 0.6, tp - 46, 1.2, 18);
      }
      for (let wy = tp + 4; wy < layer.base - 4; wy += 6) {
        for (let wx = x + 2; wx < x + w - 3; wx += 4.5) {
          if (rand() < layer.lit) {
            ctx.fillStyle = rand() > 0.3 ? 'rgba(255,214,140,0.85)' : 'rgba(170,210,255,0.7)';
            ctx.fillRect(wx, wy, 2, 2.6);
          }
        }
      }
      x += w + 1;
    }
  }
  // Wasserturm
  const tx = l + 150;
  const ty = b - 92;
  ctx.fillStyle = '#0d0b22';
  for (const lx of [-1, 8, 17]) ctx.fillRect(tx + lx, ty + 22, 2, 26);
  ctx.beginPath();
  ctx.moveTo(tx - 4, ty + 24);
  ctx.lineTo(tx - 3, ty + 4);
  ctx.lineTo(tx + 9, ty - 8);
  ctx.lineTo(tx + 21, ty + 4);
  ctx.lineTo(tx + 22, ty + 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,170,120,0.25)';
  ctx.fillRect(tx - 3, ty + 9, 25, 1);
  ctx.fillRect(tx - 3, ty + 16, 25, 1);
  // Hochbahn-Trasse (die Linie 7 fährt durch Queens)
  ctx.fillStyle = '#0b0a1c';
  ctx.fillRect(l, b - 52, r - l, 6);
  for (let x = l + 10; x < r; x += 38) ctx.fillRect(x, b - 46, 4, 46);
  ctx.restore();
}

function paintPoster(ctx: CanvasRenderingContext2D) {
  const x = 500;
  const y = 236;
  ctx.fillStyle = '#e8e3d6';
  ctx.fillRect(x, y, 128, 80);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 2, y + 80, 128, 3);
  const colors = ['#d9644a', '#e0a845', '#6fae63', '#4f8fc9', '#8e6ac2', '#c6c0b0'];
  const rand = seeded(3);
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 14; c++) {
      if (r === 0 && c > 0 && c < 13) continue;
      if (r < 3 && c > 1 && c < 9) continue;
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      ctx.fillRect(x + 6 + c * 8.4, y + 15 + r * 10, 7, 8.4);
    }
  }
  ctx.fillStyle = '#2b2b2b';
  ctx.font = 'bold 7px Arial, sans-serif';
  ctx.fillText('PERIODENSYSTEM', x + 6, y + 10);
}

function paintCorkboard(ctx: CanvasRenderingContext2D) {
  const x = 650;
  const y = 300;
  const w = 150;
  const h = 120;
  ctx.fillStyle = '#5b3b22';
  ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
  ctx.fillStyle = '#b08455';
  ctx.fillRect(x, y, w, h);
  const rand = seeded(11);
  ctx.fillStyle = 'rgba(70,40,15,0.35)';
  for (let i = 0; i < 220; i++) ctx.fillRect(x + rand() * w, y + rand() * h, 1.4, 1.4);

  // Zeitungsausschnitt
  ctx.save();
  ctx.translate(x + 8, y + 10);
  ctx.rotate(-0.05);
  ctx.fillStyle = '#ece6d4';
  ctx.fillRect(0, 0, 66, 58);
  ctx.fillStyle = '#1b1b1b';
  ctx.font = 'bold 9.5px Georgia, serif';
  ctx.fillText('DAILY BUGLE', 3, 11);
  ctx.fillRect(3, 13, 60, 1);
  ctx.font = 'bold 6px Arial, sans-serif';
  ctx.fillText('SPIDER-MAN:', 3, 21);
  ctx.fillText('HELD ODER', 3, 28);
  ctx.fillText('BEDROHUNG?', 3, 35);
  ctx.fillStyle = '#8f8a7c';
  ctx.fillRect(44, 17, 18, 18);
  ctx.fillStyle = '#c8202c';
  ctx.beginPath();
  ctx.arc(53, 26, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let i = 0; i < 5; i++) ctx.fillRect(3, 40 + i * 3.5, 58, 1);
  ctx.restore();

  const shots: [number, number, number, string, string][] = [
    [x + 82, y + 8, 0.08, '#6d8fc7', '#3c5a2e'],
    [x + 106, y + 52, -0.1, '#e7a36b', '#5d3d6a'],
    [x + 18, y + 72, 0.06, '#7fb6d6', '#c8202c'],
  ];
  for (const [px, py, rot, sky, ground] of shots) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(2, 2, 34, 40);
    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(0, 0, 34, 40);
    ctx.fillStyle = sky;
    ctx.fillRect(3, 3, 28, 26);
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.moveTo(3, 29);
    ctx.lineTo(3, 20);
    ctx.lineTo(12, 14);
    ctx.lineTo(20, 22);
    ctx.lineTo(31, 12);
    ctx.lineTo(31, 29);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(x + 66, y + 78);
  ctx.rotate(-0.07);
  ctx.fillStyle = '#f3dd63';
  ctx.fillRect(0, 0, 34, 32);
  ctx.fillStyle = '#3a3320';
  ctx.font = '7px "Segoe Print", "Comic Sans MS", cursive';
  ctx.fillText('Tante', 3, 10);
  ctx.fillText('May', 3, 18);
  ctx.fillText('anrufen!', 2, 26);
  ctx.restore();
  for (const [px, py, c] of [
    [x + 40, y + 10, '#d9363e'],
    [x + 99, y + 10, '#3a7bd5'],
    [x + 122, y + 54, '#f0b429'],
    [x + 35, y + 74, '#3fa34d'],
    [x + 82, y + 80, '#d9363e'],
  ] as [number, number, string][]) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(px, py, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(px - 1.2, py - 1.4, 1, 1);
  }
}

function paintShelf(ctx: CanvasRenderingContext2D) {
  // Wandregal über dem Bett mit Pokal und Wissenschaftspreis
  ctx.fillStyle = '#5b3d25';
  ctx.fillRect(1250, 470, 80, 6);
  ctx.fillStyle = '#d6b35c';
  ctx.beginPath();
  ctx.moveTo(1262, 446);
  ctx.lineTo(1278, 446);
  ctx.quadraticCurveTo(1276, 458, 1270, 460);
  ctx.quadraticCurveTo(1264, 458, 1262, 446);
  ctx.fill();
  ctx.fillRect(1268, 460, 4, 6);
  ctx.fillRect(1263, 465, 14, 5);
  ctx.fillStyle = '#e8e3d6';
  ctx.fillRect(1288, 440, 34, 30);
  ctx.fillStyle = '#2f5d8a';
  ctx.fillRect(1291, 443, 28, 4);
  ctx.fillStyle = '#d6b35c';
  ctx.beginPath();
  ctx.arc(1305, 459, 5, 0, Math.PI * 2);
  ctx.fill();
}

function paintRug(ctx: CanvasRenderingContext2D) {
  const cx = CX;
  const cy = 876;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, 344, 74, 0, 0, Math.PI * 2);
  ctx.fill();
  const rings: [number, string][] = [
    [1, '#2a3556'],
    [0.93, '#c9b48a'],
    [0.88, '#7c2f34'],
    [0.66, '#2a3556'],
    [0.61, '#c9b48a'],
    [0.56, '#34416a'],
    [0.3, '#7c2f34'],
    [0.26, '#c9b48a'],
    [0.22, '#2a3556'],
  ];
  for (const [k, c] of rings) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 340 * k, 70 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fransen
  ctx.strokeStyle = '#c9b48a';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const x = cx + Math.cos(a) * 340;
    const y = cy + Math.sin(a) * 70;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 2.5);
    ctx.stroke();
  }
}

function paintDesk(ctx: CanvasRenderingContext2D) {
  const x0 = 486;
  // Stuhl hinter dem Tisch
  ctx.fillStyle = '#1f2330';
  ctx.fillRect(x0 + 116, 556, 70, 64);
  ctx.fillStyle = '#2a2f3f';
  ctx.fillRect(x0 + 120, 560, 62, 56);
  // Beine
  ctx.fillStyle = '#3d2817';
  ctx.fillRect(x0 - 4, 640, 10, 132);
  ctx.fillRect(x0 + 250, 640, 10, 132);
  ctx.fillRect(x0 + 12, 630, 7, 104);
  ctx.fillStyle = '#5b3d25';
  ctx.fillRect(x0 + 160, 640, 90, 46);
  ctx.fillStyle = '#c9a96b';
  ctx.fillRect(x0 + 198, 660, 14, 3);
  ctx.fillStyle = '#7a5434';
  ctx.beginPath();
  ctx.moveTo(x0 + 8, 610);
  ctx.lineTo(x0 + 250, 610);
  ctx.lineTo(x0 + 264, 630);
  ctx.lineTo(x0 - 8, 630);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4e331d';
  ctx.fillRect(x0 - 8, 630, 272, 11);

  // Bücher
  ['#a33b3b', '#2f5d8a', '#d1a23f', '#3d6b47', '#7c4f9e'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(x0 + 4 + (i % 2) * 2, 602 - i * 7, 30, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x0 + 6 + (i % 2) * 2, 604 - i * 7, 16, 1);
  });
  // Monitor
  ctx.fillStyle = '#111';
  ctx.fillRect(x0 + 82, 596, 14, 14);
  ctx.fillRect(x0 + 68, 608, 42, 4);
  ctx.fillStyle = '#16171c';
  ctx.fillRect(x0 + 42, 516, 96, 80);
  ctx.fillStyle = '#0d1a33';
  ctx.fillRect(x0 + 46, 520, 88, 70);
  const rand = seeded(19);
  const codeColors = ['#7ec8ff', '#ff8fb1', '#c3e88d', '#ffcb6b', '#d6deeb'];
  for (let line = 0; line < 10; line++) {
    let cx = x0 + 50 + (line % 3) * 4;
    while (cx < x0 + 130) {
      const w = 4 + rand() * 12;
      ctx.fillStyle = codeColors[Math.floor(rand() * codeColors.length)];
      ctx.fillRect(cx, 524 + line * 6.4, Math.min(w, x0 + 132 - cx), 2.4);
      cx += w + 3;
      if (rand() > 0.75) break;
    }
  }
  // Webshooter-Bauplan neben dem Monitor
  ctx.save();
  ctx.translate(x0 + 150, 606);
  ctx.rotate(-0.04);
  ctx.fillStyle = '#7fa6d8';
  ctx.fillRect(0, 0, 30, 6);
  ctx.restore();
  // Tastatur, Tasse, Stiftebecher
  ctx.fillStyle = '#2a2b31';
  ctx.beginPath();
  ctx.moveTo(x0 + 60, 616);
  ctx.lineTo(x0 + 120, 616);
  ctx.lineTo(x0 + 124, 624);
  ctx.lineTo(x0 + 56, 624);
  ctx.fill();
  ctx.fillStyle = '#ece8df';
  ctx.fillRect(x0 + 128, 604, 12, 14);
  ctx.strokeStyle = '#ece8df';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x0 + 141, 611, 3.5, -1.4, 1.4);
  ctx.stroke();
  ctx.fillStyle = '#c8202c';
  ctx.fillRect(x0 + 130, 608, 8, 3);
  ctx.fillStyle = '#3a4256';
  ctx.fillRect(x0 + 232, 596, 12, 16);
  ctx.strokeStyle = '#f0b429';
  ctx.beginPath();
  ctx.moveTo(x0 + 235, 596);
  ctx.lineTo(x0 + 232, 584);
  ctx.moveTo(x0 + 240, 596);
  ctx.lineTo(x0 + 243, 586);
  ctx.stroke();
  // Kamera
  ctx.fillStyle = '#1b1b1d';
  ctx.fillRect(x0 + 186, 604, 30, 18);
  ctx.fillRect(x0 + 192, 600, 10, 5);
  ctx.fillStyle = '#b9bcc2';
  ctx.fillRect(x0 + 186, 604, 30, 4);
  ctx.fillStyle = '#2c2d31';
  ctx.beginPath();
  ctx.arc(x0 + 201, 614, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a6a9a';
  ctx.beginPath();
  ctx.arc(x0 + 201, 614, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(x0 + 199, 612, 1.6, 1.6);
  // Schreibtischlampe
  ctx.strokeStyle = '#2a2a2e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0 + 218, 600);
  ctx.lineTo(x0 + 226, 548);
  ctx.lineTo(x0 + 206, 528);
  ctx.stroke();
  ctx.fillStyle = '#2a2a2e';
  ctx.fillRect(x0 + 210, 598, 18, 4);
  ctx.save();
  ctx.translate(x0 + 206, 528);
  ctx.rotate(0.5);
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(12, 0);
  ctx.lineTo(7, -12);
  ctx.lineTo(-7, -12);
  ctx.closePath();
  ctx.fillStyle = '#d6533b';
  ctx.fill();
  ctx.restore();
}

export const DESK_LAMP = { x: 700, y: 536 };

function paintBed(ctx: CanvasRenderingContext2D) {
  // Bett an der rechten Wand, Fußende Richtung Kamera
  const a = floorPt(0.93, 1.02);
  const b = floorPt(1.0, 1.02);
  const c = floorPt(1.0, 1.9);
  const d = floorPt(0.72, 1.9);
  // Rahmen
  ctx.fillStyle = '#3b2618';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1] - 20);
  ctx.lineTo(b[0], b[1] - 20);
  ctx.lineTo(c[0] + 10, c[1] + 10);
  ctx.lineTo(d[0] - 6, d[1] + 10);
  ctx.closePath();
  ctx.fill();
  // Decke
  const g = ctx.createLinearGradient(a[0], a[1], d[0], d[1]);
  g.addColorStop(0, '#3f5f9e');
  g.addColorStop(1, '#2a4377');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(a[0] + 4, a[1] - 52);
  ctx.quadraticCurveTo((a[0] + b[0]) / 2, a[1] - 60, b[0], b[1] - 54);
  ctx.lineTo(c[0] + 20, c[1] - 70);
  ctx.quadraticCurveTo((c[0] + d[0]) / 2, d[1] - 60, d[0] - 4, d[1] - 64);
  ctx.quadraticCurveTo(d[0] - 10, (a[1] + d[1]) / 2, a[0] + 4, a[1] - 52);
  ctx.fill();
  // Seitenkante der Decke
  ctx.fillStyle = '#233863';
  ctx.beginPath();
  ctx.moveTo(d[0] - 4, d[1] - 64);
  ctx.quadraticCurveTo((c[0] + d[0]) / 2, d[1] - 60, c[0] + 20, c[1] - 70);
  ctx.lineTo(c[0] + 20, c[1] + 4);
  ctx.quadraticCurveTo((c[0] + d[0]) / 2, d[1] + 8, d[0] - 4, d[1] + 2);
  ctx.closePath();
  ctx.fill();
  // Spinnennetz-Muster auf der Bettdecke
  ctx.strokeStyle = 'rgba(200,220,255,0.12)';
  ctx.lineWidth = 1.5;
  const wx = (a[0] + d[0]) / 2 + 40;
  const wy = (a[1] + d[1]) / 2 - 58;
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + Math.cos(an) * 90, wy + Math.sin(an) * 34);
    ctx.stroke();
  }
  for (const r of [30, 60, 90]) {
    ctx.beginPath();
    ctx.ellipse(wx, wy, r, r * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Kissen
  ctx.fillStyle = '#e9e5dc';
  ctx.beginPath();
  ctx.ellipse((a[0] + b[0]) / 2 + 6, a[1] - 62, 48, 14, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse((a[0] + b[0]) / 2 + 6, a[1] - 56, 44, 6, -0.05, 0, Math.PI);
  ctx.fill();
}

function paintFloorStuff(ctx: CanvasRenderingContext2D) {
  // Sneaker-Paar
  for (const [x, y, rot] of [
    [1086, 946, 0.25],
    [1112, 958, -0.15],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e6df';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8202c';
    ctx.fillRect(-6, -3, 14, 3);
    ctx.fillStyle = '#c9c6bd';
    ctx.fillRect(-20, 3, 40, 3);
    ctx.restore();
  }
  // aufgeschlagenes Comicheft
  ctx.save();
  ctx.translate(500, 975);
  ctx.rotate(-0.2);
  ctx.fillStyle = '#f2ecd9';
  ctx.fillRect(-36, -12, 72, 24);
  ctx.fillStyle = '#c8202c';
  ctx.fillRect(-32, -9, 30, 18);
  ctx.fillStyle = '#1c3d98';
  ctx.fillRect(4, -9, 28, 8);
  ctx.fillStyle = '#f0b429';
  ctx.fillRect(4, 1, 28, 8);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Dynamische Teile                                                   */
/* ------------------------------------------------------------------ */

export interface RoomLight {
  /** 0 … 1, wie hell die Lampen brennen (Flackern beim Symbionten) */
  power: number;
  /** Auslenkung der Deckenlampe in rad */
  lampSwing: number;
  /** Liegt der Anzug noch im Rucksack? */
  suitInBag: boolean;
  /** Bass aus dem Song, lässt die Lichterkette pulsieren */
  bass: number;
  time: number;
}

export function paintRoomDynamic(ctx: CanvasRenderingContext2D, light: RoomLight) {
  const { power, time } = light;
  paintCityLife(ctx, time);
  paintWindowLight(ctx, time, power);

  // Leuchtsterne an der Decke – werden sichtbar, wenn das Licht ausgeht
  const glow = Math.max(0, 1 - power) * 0.9 + 0.08;
  const rand = seeded(55);
  for (let i = 0; i < 16; i++) {
    const x = 540 + rand() * 720;
    const y = 20 + rand() * 150;
    const r = 4 + rand() * 4;
    ctx.fillStyle = `rgba(190,255,190,${glow * (0.6 + 0.4 * Math.sin(time * 1.3 + i))})`;
    star(ctx, x, y, r, rand() * 6);
  }
  // Rauchmelder mit blinkender LED
  ctx.fillStyle = '#e6e2d8';
  ctx.beginPath();
  ctx.ellipse(760, 70, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9c4b8';
  ctx.fillRect(744, 70, 32, 4);
  if (time % 3 < 0.12) {
    ctx.fillStyle = '#ff3030';
    ctx.beginPath();
    ctx.arc(770, 68, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  // Lichtkegel der Schreibtischlampe
  const lx = DESK_LAMP.x - 14;
  const ly = DESK_LAMP.y;
  let g = ctx.createRadialGradient(lx, ly + 20, 4, lx - 14, ly + 80, 130);
  g.addColorStop(0, `rgba(255,190,110,${0.5 * power})`);
  g.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(lx, ly - 6);
  ctx.lineTo(lx + 60, 640);
  ctx.lineTo(lx - 110, 640);
  ctx.closePath();
  ctx.fill();
  g = ctx.createRadialGradient(lx, ly - 4, 1, lx, ly - 4, 22);
  g.addColorStop(0, `rgba(255,236,190,${0.95 * power})`);
  g.addColorStop(1, 'rgba(255,236,190,0)');
  ctx.fillStyle = g;
  ctx.fillRect(lx - 24, ly - 28, 48, 48);

  // Monitorschein
  const flick = 0.85 + 0.15 * Math.sin(time * 23) * Math.sin(time * 7);
  g = ctx.createRadialGradient(576, 556, 10, 576, 566, 130);
  g.addColorStop(0, `rgba(80,140,255,${0.22 * flick * Math.max(power, 0.5)})`);
  g.addColorStop(1, 'rgba(80,140,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(440, 430, 270, 270);

  // Lichterkette pulsiert mit dem Bass
  const bulbs = 34;
  for (let i = 0; i <= bulbs; i++) {
    const [x, y] = garland(i / bulbs);
    const tw = (0.55 + 0.45 * Math.sin(time * 2.4 + i * 1.7)) * (0.75 + light.bass * 0.6);
    const a = power * tw;
    g = ctx.createRadialGradient(x, y + 3, 0, x, y + 3, 14);
    g.addColorStop(0, `rgba(255,210,130,${Math.min(0.8, 0.55 * a)})`);
    g.addColorStop(1, 'rgba(255,210,130,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 14, y - 11, 28, 28);
  }
  ctx.restore();
  ctx.strokeStyle = '#151515';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const [x, y] = garland(i / 80);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  for (let i = 0; i <= bulbs; i++) {
    const [x, y] = garland(i / bulbs);
    const tw = 0.6 + 0.4 * Math.sin(time * 2.4 + i * 1.7);
    ctx.fillStyle = `rgba(255,${200 + 40 * tw},${130 + 60 * tw},${0.35 + 0.65 * power * tw})`;
    ctx.beginPath();
    ctx.ellipse(x, y + 3.5, 2.4, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  paintLamp(ctx, light);
  paintBackpack(ctx, light.suitInBag, time);
}

export function garland(k: number): [number, number] {
  const x = BACK.l + 10 + k * (BACK.r - BACK.l - 20);
  const y = BACK.t + 18 + Math.abs(Math.sin(k * Math.PI * 3)) * 26;
  return [x, y];
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * Math.PI * 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.5);
  }
  ctx.closePath();
  ctx.fill();
}

/** Hochbahn, Flugzeug und Antennenlichter im Fenster */
function paintCityLife(ctx: CanvasRenderingContext2D, time: number) {
  const { l, r, t, b } = WINDOW;
  ctx.save();
  ctx.beginPath();
  ctx.rect(l + 4, t + 4, r - l - 8, b - t - 8);
  ctx.clip();
  // rote Antennenlichter auf den Hochhäusern
  for (const [x, y, ph] of [
    [l + 60, t + 136, 0],
    [l + 178, t + 118, 1.3],
  ]) {
    const on = (time + ph) % 1.6 < 0.5;
    ctx.fillStyle = on ? 'rgba(255,60,60,0.95)' : 'rgba(120,20,20,0.6)';
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Flugzeug mit Blinklicht
  const pp = (time * 0.035) % 1.4;
  const px = l - 20 + pp * (r - l + 60);
  const py = t + 70 - pp * 18;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(px, py, 2, 1.2);
  if (time % 1 < 0.15) {
    ctx.fillStyle = '#ff4040';
    ctx.fillRect(px + 2, py - 1, 1.6, 1.6);
  }
  // Linie 7 rattert vorbei
  const cycle = 9;
  const tt = (time + 3) % cycle;
  if (tt < 3.2) {
    const len = 260;
    const x = r + 20 - (tt / 3.2) * (r - l + len + 40);
    const y = b - 70;
    ctx.fillStyle = '#5b6274';
    ctx.fillRect(x, y, len, 18);
    ctx.fillStyle = '#7a3d8f';
    ctx.fillRect(x, y + 13, len, 3);
    ctx.fillStyle = 'rgba(255,236,170,0.9)';
    for (let wx = x + 6; wx < x + len - 6; wx += 12) ctx.fillRect(wx, y + 4, 7, 6);
    ctx.fillStyle = '#2b2f3a';
    for (let wx = x + 64; wx < x + len; wx += 65) ctx.fillRect(wx, y, 2, 18);
  }
  ctx.restore();
}

/** Mondlicht fällt schräg durchs Fenster, darin tanzt Staub */
function paintWindowLight(ctx: CanvasRenderingContext2D, time: number, power: number) {
  const { l, r, t, b } = WINDOW;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const a = 0.09 + (1 - power) * 0.05;
  const g = ctx.createLinearGradient(r, t, l - 200, FLOOR_Y);
  g.addColorStop(0, `rgba(140,160,255,${a})`);
  g.addColorStop(1, 'rgba(140,160,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(l, t);
  ctx.lineTo(r, t);
  ctx.lineTo(r - 120, FLOOR_Y + 60);
  ctx.lineTo(l - 330, FLOOR_Y + 60);
  ctx.closePath();
  ctx.fill();
  // Fensterkreuz als Lichtfleck auf dem Boden
  ctx.fillStyle = `rgba(140,160,255,${a * 0.9})`;
  ctx.beginPath();
  ctx.moveTo(l - 150, 820);
  ctx.lineTo(r - 160, 820);
  ctx.lineTo(r - 190, 930);
  ctx.lineTo(l - 260, 930);
  ctx.closePath();
  ctx.fill();
  // Staubkörner
  const rand = seeded(13);
  for (let i = 0; i < 60; i++) {
    const k = rand();
    const sx = l + rand() * (r - l);
    const x = sx - k * 260 + Math.sin(time * 0.4 + i) * 12;
    const y = t + k * (FLOOR_Y - t) + Math.sin(time * 0.3 + i * 2) * 10;
    const tw = 0.5 + 0.5 * Math.sin(time * 1.7 + i * 3.1);
    ctx.fillStyle = `rgba(220,230,255,${0.35 * tw})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();
  // Rahmen, Sprossen und Vorhänge kommen hier drüber, damit Zug & Licht dahinter liegen
  paintWindowFrame(ctx);
}

function paintWindowFrame(ctx: CanvasRenderingContext2D) {
  const { l, r, t, b } = WINDOW;
  ctx.strokeStyle = '#cfc9bb';
  ctx.lineWidth = 8;
  ctx.strokeRect(l, t, r - l, b - t);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo((l + r) / 2, t);
  ctx.lineTo((l + r) / 2, b);
  ctx.moveTo(l, t + (b - t) * 0.5);
  ctx.lineTo(r, t + (b - t) * 0.5);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(l + 5, t + 5, r - l - 10, b - t - 10);
  // Spiegelung
  ctx.save();
  ctx.beginPath();
  ctx.rect(l, t, r - l, b - t);
  ctx.clip();
  const g = ctx.createLinearGradient(l, t, r, b);
  g.addColorStop(0, 'rgba(255,255,255,0.07)');
  g.addColorStop(0.4, 'rgba(255,255,255,0)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.05)');
  g.addColorStop(0.62, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(l, t, r - l, b - t);
  ctx.restore();
  // Fensterbank mit Kaktus
  ctx.fillStyle = '#d8d2c4';
  ctx.fillRect(l - 12, b + 3, r - l + 24, 9);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(l - 12, b + 12, r - l + 24, 4);
  ctx.fillStyle = '#b5532f';
  ctx.beginPath();
  ctx.moveTo(l + 14, b + 3);
  ctx.lineTo(l + 32, b + 3);
  ctx.lineTo(l + 30, b - 11);
  ctx.lineTo(l + 16, b - 11);
  ctx.fill();
  ctx.fillStyle = '#3f7a45';
  ctx.beginPath();
  ctx.ellipse(l + 23, b - 22, 5.5, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(l + 15, b - 24, 3, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Vorhänge
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? l - 30 : r - 4;
    const w = 34;
    const g2 = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    for (let i = 0; i <= 6; i++) g2.addColorStop(i / 6, i % 2 ? '#2f5d62' : '#1c3a3f');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(x0, t - 20);
    ctx.lineTo(x0 + w, t - 20);
    ctx.quadraticCurveTo(x0 + w + side * 6, (t + b) / 2, x0 + w + (side < 0 ? -6 : 4), b + 46);
    ctx.lineTo(x0 + (side < 0 ? -4 : 8), b + 46);
    ctx.quadraticCurveTo(x0 - side * 4, (t + b) / 2, x0, t - 20);
    ctx.fill();
  }
  ctx.fillStyle = '#1a1a1f';
  ctx.fillRect(l - 40, t - 24, r - l + 84, 4);
  ctx.beginPath();
  ctx.arc(l - 40, t - 22, 4, 0, Math.PI * 2);
  ctx.arc(r + 44, t - 22, 4, 0, Math.PI * 2);
  ctx.fill();
}

function paintLamp(ctx: CanvasRenderingContext2D, light: RoomLight) {
  const { power } = light;
  ctx.save();
  ctx.translate(LAMP.x, LAMP.y);
  ctx.fillStyle = '#20232c';
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(light.lampSwing);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, LAMP.cord);
  ctx.stroke();
  ctx.translate(0, LAMP.cord);
  let g = ctx.createLinearGradient(-30, 0, 30, 0);
  g.addColorStop(0, '#b9ab8c');
  g.addColorStop(0.4, '#efe3c4');
  g.addColorStop(1, '#8f8468');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(8, 0);
  ctx.quadraticCurveTo(29, 6, 32, 27);
  ctx.lineTo(-32, 27);
  ctx.quadraticCurveTo(-29, 6, -8, 0);
  ctx.fill();
  ctx.globalCompositeOperation = 'screen';
  g = ctx.createRadialGradient(0, 28, 1, 0, 40, 160);
  g.addColorStop(0, `rgba(255,226,170,${0.7 * power})`);
  g.addColorStop(0.3, `rgba(255,206,140,${0.18 * power})`);
  g.addColorStop(1, 'rgba(255,206,140,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-32, 27);
  ctx.lineTo(32, 27);
  ctx.lineTo(170, 280);
  ctx.lineTo(-170, 280);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(255,244,214,${0.4 + 0.6 * power})`;
  ctx.beginPath();
  ctx.ellipse(0, 27, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintBackpack(ctx: CanvasRenderingContext2D, suitInBag: boolean, time: number) {
  ctx.save();
  ctx.translate(722, 958);
  ctx.rotate(-0.12);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(4, 6, 48, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (suitInBag) {
    const wob = Math.sin(time * 1.6) * 0.04;
    ctx.save();
    ctx.rotate(wob);
    ctx.fillStyle = '#c8202c';
    ctx.beginPath();
    ctx.moveTo(-26, -70);
    ctx.quadraticCurveTo(-30, -104, 0, -108);
    ctx.quadraticCurveTo(30, -104, 24, -70);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 0.9;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, -78);
      ctx.lineTo(i * 12, -112);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, -80, 16, 12, 0, Math.PI, Math.PI * 2);
    ctx.ellipse(0, -80, 24, 22, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f4f7ff';
    ctx.strokeStyle = '#0b0b0d';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(4, -80);
    ctx.quadraticCurveTo(8, -96, 20, -96);
    ctx.quadraticCurveTo(22, -86, 4, -80);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#c8202c';
    ctx.beginPath();
    ctx.moveTo(30, -68);
    ctx.quadraticCurveTo(48, -64, 46, -40);
    ctx.lineTo(38, -40);
    ctx.quadraticCurveTo(38, -56, 24, -60);
    ctx.fill();
  }
  const g = ctx.createLinearGradient(-40, 0, 40, 0);
  g.addColorStop(0, '#3a4256');
  g.addColorStop(0.45, '#56607b');
  g.addColorStop(1, '#2c3243');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-38, 0);
  ctx.lineTo(-40, -58);
  ctx.quadraticCurveTo(-36, suitInBag ? -76 : -84, 0, suitInBag ? -78 : -86);
  ctx.quadraticCurveTo(36, suitInBag ? -76 : -84, 40, -58);
  ctx.lineTo(38, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2c3243';
  ctx.beginPath();
  ctx.moveTo(-26, -4);
  ctx.lineTo(-27, -34);
  ctx.quadraticCurveTo(0, -42, 27, -34);
  ctx.lineTo(26, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c9c3b5';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(-25, -30);
  ctx.quadraticCurveTo(0, -38, 25, -30);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#d6b35c';
  ctx.fillRect(18, -33, 3, 6);
  ctx.fillStyle = '#e0a845';
  ctx.beginPath();
  ctx.arc(-12, -18, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d3f9a';
  ctx.beginPath();
  ctx.arc(-12, -18, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

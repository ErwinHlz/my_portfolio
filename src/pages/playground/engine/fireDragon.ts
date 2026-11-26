/**
 * Feuerwerksdrache: steigt winzig aus der Höhle im Gebirge auf und fliegt in
 * Schlangenlinien von hinten nach vorn auf den Betrachter zu. Er besteht ganz
 * aus Licht – weiche Leuchtbänder, Funken und Glitzer statt Schuppen – und
 * platzt im Vordergrund in ein Feuerwerk, das sich über den ganzen Himmel verteilt.
 *
 * Die Flugbahn wird in 3D berechnet und perspektivisch projiziert: der Kopf ist
 * vorn und groß, der Körper zieht sich perspektivisch zurück Richtung Gebirge.
 */
import { clamp, lerp, mixRGB, rgba, smooth, type RGB } from './canvasUtils';

export interface SparkSink {
  spark(x: number, y: number, vx: number, vy: number, color: RGB, life: number): void;
  burst(x: number, y: number, colors: RGB[], scale?: number): void;
  launch(sx: number, sy: number, tx: number, ty: number, colors: RGB[], delay?: number): void;
}

interface P3 {
  x: number;
  y: number;
  z: number;
}

interface Projected {
  x: number;
  y: number;
  /** Pixel pro Welteinheit an dieser Tiefe */
  s: number;
  z: number;
}

type Segment = Projected & { r: number; i: number };

const DURATION = 7.5;
const SEGMENTS = 44;
/** Abstand der Körpersegmente auf der Flugbahn */
const STEP = 0.011;
/** Startentfernung (Höhle) und Entfernung, in der er platzt */
const FAR = 26;
const NEAR = 2.2;
/** Segment, an dem die Flügel sitzen */
const SHOULDER = 6;
const TAU = Math.PI * 2;

/** sanfte Feuerwerksfarben vom Kopf (Gold) bis zur Schwanzspitze (Blau) */
const PALETTE: RGB[] = [
  [255, 222, 150],
  [255, 168, 110],
  [255, 135, 170],
  [200, 145, 255],
  [140, 195, 255],
];
const WARM_WHITE: RGB = [255, 246, 225];

/** Farbe entlang des Körpers, q = 0 (Kopf) … 1 (Schwanz) */
function bodyColor(q: number): RGB {
  const f = clamp(q, 0, 1) * (PALETTE.length - 1);
  const i = Math.min(PALETTE.length - 2, Math.floor(f));
  return mixRGB(PALETTE[i], PALETTE[i + 1], f - i);
}

const pickColor = (): RGB => PALETTE[Math.floor(Math.random() * PALETTE.length)];

type Vec = [number, number];

export class FireDragon {
  private t = -1;
  private w = 0;
  private h = 0;
  private cx = 0;
  private horizon = 0;
  private focal = 1;
  private caveX = 0;
  private caveY = 0;
  private swing = 1;

  get active(): boolean {
    return this.t >= 0;
  }

  /** startet an der Höhle (Bildschirmposition) */
  start(caveX: number, caveY: number, w: number, h: number): void {
    this.t = 0;
    this.w = w;
    this.h = h;
    this.cx = w / 2;
    this.horizon = h * 0.5;
    this.focal = h * 0.9;
    this.caveX = caveX;
    this.caveY = caveY;
    this.swing = caveX < this.cx ? 1 : -1;
  }

  stop(): void {
    this.t = -1;
  }

  /**
   * Position auf der Flugbahn in Weltkoordinaten (y nach oben, z in die Tiefe).
   * Der Drache schlängelt sich zur Bildmitte und wird durch die abnehmende
   * Entfernung immer größer, bis er groß im Vordergrund schwebt.
   */
  private pos(u: number): P3 {
    const q = clamp(u, 0, 1);
    const z = FAR * (1 - q) ** 1.7 + NEAR;
    const toCenter = smooth(0, 0.7, q);
    const sway = Math.sin(q * Math.PI * 2.4 + 0.6) * this.swing * this.w * 0.22 * (1 - q * 0.8);
    const sx = lerp(this.caveX, this.cx, toCenter) + sway;
    const sy =
      lerp(this.caveY, this.h * 0.36, toCenter) +
      Math.sin(q * Math.PI * 3) * this.h * 0.05 * (1 - q);
    return {
      x: ((sx - this.cx) * z) / this.focal,
      y: ((this.horizon - sy) * z) / this.focal,
      z,
    };
  }

  private project(p: P3): Projected {
    const s = this.focal / p.z;
    return { x: this.cx + p.x * s, y: this.horizon - p.y * s, z: p.z, s };
  }

  private breathing(u: number): number {
    return clamp((u - 0.55) / 0.04, 0, 1) * (1 - clamp((u - 0.72) / 0.05, 0, 1));
  }

  /** Körperradius in Welteinheiten: kräftiger Hals, dicker Rumpf, dünner Schwanz */
  private radius(i: number): number {
    const q = i / SEGMENTS;
    return 0.08 + 0.17 * Math.sin(Math.min(1, (q + 0.08) * 1.6) * Math.PI) * (1 - q * 0.75);
  }

  /** kurz vor dem Platzen schwillt das Leuchten an */
  private charge(u: number): number {
    return smooth(0.88, 1, u);
  }

  update(dt: number, sparks: SparkSink): void {
    if (this.t < 0) return;
    this.t += dt;
    const u = this.t / DURATION;

    // Funkenregen entlang des ganzen Körpers, wie bei einer Wunderkerze
    for (let i = 1; i < SEGMENTS; i += 2) {
      if (Math.random() > 0.55) continue;
      const p = this.project(this.pos(u - i * STEP));
      const r = this.radius(i) * p.s;
      const spread = 25 + p.s * 0.06;
      sparks.spark(
        p.x + (Math.random() - 0.5) * r * 1.6,
        p.y + (Math.random() - 0.5) * r * 1.6,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.3) * spread,
        Math.random() < 0.3 ? WARM_WHITE : bodyColor(i / SEGMENTS),
        0.4 + Math.random() * 0.6,
      );
    }

    // Flügelspitzen sprühen Funken
    const shoulder = this.project(this.pos(u - SHOULDER * STEP));
    const span = 2.6 * shoulder.s;
    for (const side of [-1, 1]) {
      if (Math.random() > 0.5) continue;
      sparks.spark(
        shoulder.x + side * span * (0.6 + Math.random() * 0.35),
        shoulder.y - span * 0.2 + Math.random() * span * 0.3,
        side * (10 + Math.random() * 40),
        20 + Math.random() * 40,
        pickColor(),
        0.5 + Math.random() * 0.5,
      );
    }

    // Feuerstoß aus dem Maul als Funkenfontäne
    if (this.breathing(u) > 0.05) {
      const head = this.project(this.pos(u));
      const mouthY = head.y + 0.3 * 0.42 * head.s;
      for (let n = 0; n < 8; n++) {
        const a = Math.random() * TAU;
        const speed = (100 + Math.random() * 220) * Math.min(3, head.s / 80);
        sparks.spark(
          head.x,
          mouthY,
          Math.cos(a) * speed,
          Math.sin(a) * speed * 0.7 + 40,
          Math.random() < 0.5 ? WARM_WHITE : PALETTE[Math.floor(Math.random() * 2)],
          0.4 + Math.random() * 0.35,
        );
      }
    }

    if (u >= 1) {
      this.explode(sparks);
      this.t = -1;
    }
  }

  /** im Vordergrund angekommen: der Drache zerplatzt und verteilt Feuerwerk überall */
  private explode(sparks: SparkSink): void {
    const head = this.project(this.pos(1));

    // jedes Körperstück zerstiebt in seine Farbe
    for (let i = 0; i < SEGMENTS; i += 2) {
      const p = this.project(this.pos(1 - i * STEP));
      const color = bodyColor(i / SEGMENTS);
      for (let n = 0; n < 7; n++) {
        const a = Math.random() * TAU;
        const speed = 120 + Math.random() * 320;
        sparks.spark(
          p.x,
          p.y,
          Math.cos(a) * speed,
          Math.sin(a) * speed,
          Math.random() < 0.25 ? WARM_WHITE : color,
          0.9 + Math.random() * 0.9,
        );
      }
    }

    // großer Knall am Kopf
    sparks.burst(head.x, head.y, PALETTE, 2.6);
    sparks.burst(head.x, head.y, [WARM_WHITE, PALETTE[0]], 1.6);

    // Raketen schießen vom Kopf aus in alle Richtungen und zerplatzen nacheinander
    const count = 12;
    for (let n = 0; n < count; n++) {
      const col = ((n % 4) + Math.random()) / 4;
      sparks.launch(
        head.x,
        head.y,
        this.w * (0.06 + col * 0.88),
        this.h * (0.06 + Math.random() * 0.5),
        [pickColor(), pickColor()],
        n * 0.14 + Math.random() * 0.1,
      );
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number, night: number): void {
    if (this.t < 0) return;
    const u = this.t / DURATION;
    const charge = this.charge(u);
    // tagsüber zurückhaltender, nachts strahlender
    const glow = (0.55 + 0.45 * night) * (1 + charge * 0.6);

    // Segmente von hinten (Schwanz, weit weg) nach vorn (Kopf)
    const segs: Segment[] = [];
    for (let i = SEGMENTS - 1; i >= 0; i--) {
      const p = this.project(this.pos(u - i * STEP));
      segs.push({ ...p, r: this.radius(i) * p.s, i });
    }
    if (segs.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.drawHalo(ctx, segs, glow);

    // Flügel liegen hinter dem Körper
    const shoulder = segs.find((s) => s.i === SHOULDER);
    if (shoulder) this.drawWings(ctx, shoulder, time, glow);

    this.drawBody(ctx, segs, time, glow);

    const head = segs[segs.length - 1];
    this.drawHead(ctx, head, segs[segs.length - 2], time, glow, this.breathing(u), charge);
    ctx.restore();
  }

  /** weicher, farbiger Lichtnebel um den ganzen Körper – kaum Kontrast zum Himmel */
  private drawHalo(ctx: CanvasRenderingContext2D, segs: Segment[], glow: number): void {
    ctx.globalCompositeOperation = 'lighter';
    for (const seg of segs) {
      if (seg.i % 3) continue;
      const r = Math.max(4, seg.r * 3);
      const g = ctx.createRadialGradient(seg.x, seg.y, 0, seg.x, seg.y, r);
      g.addColorStop(0, rgba(bodyColor(seg.i / SEGMENTS), 0.14 * glow));
      g.addColorStop(1, rgba(bodyColor(seg.i / SEGMENTS), 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, r, 0, TAU);
      ctx.fill();
    }
  }

  /**
   * Körper als Leuchtband: breiter zarter Schein, darüber ein hellerer Strang
   * und ein feiner, fast weißer Kern – dazu funkelnde Glitzerpunkte.
   */
  private drawBody(
    ctx: CanvasRenderingContext2D,
    segs: Segment[],
    time: number,
    glow: number,
  ): void {
    ctx.globalCompositeOperation = 'lighter';
    const passes: [number, number, number][] = [
      // Breite (× Radius), Deckkraft, Weißanteil
      [1.9, 0.12, 0],
      [0.9, 0.3, 0.15],
      [0.22, 0.75, 0.6],
    ];
    for (const [width, alpha, white] of passes) {
      for (let n = 1; n < segs.length; n++) {
        const a = segs[n - 1];
        const b = segs[n];
        const q = b.i / SEGMENTS;
        ctx.strokeStyle = rgba(mixRGB(bodyColor(q), WARM_WHITE, white), alpha * glow);
        ctx.lineWidth = Math.max(0.8, b.r * width);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Glitzerpunkte, die auf dem Körper aufblitzen
    for (const seg of segs) {
      for (let k = 0; k < 2; k++) {
        const twinkle = Math.sin(time * 9 + seg.i * 2.3 + k * 4.1);
        if (twinkle < 0.4) continue;
        const ang = seg.i * 1.7 + k * 3 + time * 0.8;
        const d = seg.r * (0.4 + (0.6 * ((seg.i * 7 + k * 3) % 5)) / 5);
        const x = seg.x + Math.cos(ang) * d;
        const y = seg.y + Math.sin(ang) * d;
        const size = Math.max(1, seg.r * 0.18) * (twinkle - 0.3);
        this.star(ctx, x, y, size, rgba(WARM_WHITE, 0.8 * glow));
      }
      // Rückenzacken als kleine Leuchtsterne
      if (seg.i % 3 === 0 && seg.i > 1 && seg.i < SEGMENTS - 4) {
        this.star(
          ctx,
          seg.x,
          seg.y - seg.r * 1.1,
          Math.max(1.2, seg.r * 0.35),
          rgba(mixRGB(bodyColor(seg.i / SEGMENTS), WARM_WHITE, 0.4), 0.7 * glow),
        );
      }
    }
  }

  /** vierzackiger Funkelstern */
  private star(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size * 2);
    ctx.quadraticCurveTo(x, y, x + size * 2, y);
    ctx.quadraticCurveTo(x, y, x, y + size * 2);
    ctx.quadraticCurveTo(x, y, x - size * 2, y);
    ctx.quadraticCurveTo(x, y, x, y - size * 2);
    ctx.fill();
  }

  /** zieht einen Pfad als Lichtlinie nach: zarter Schein, darüber ein heller Kern */
  private glowStroke(ctx: CanvasRenderingContext2D, color: RGB, width: number, glow: number): void {
    ctx.strokeStyle = rgba(color, 0.14 * glow);
    ctx.lineWidth = width * 3.2;
    ctx.stroke();
    ctx.strokeStyle = rgba(color, 0.35 * glow);
    ctx.lineWidth = width * 1.5;
    ctx.stroke();
    ctx.strokeStyle = rgba(mixRGB(color, WARM_WHITE, 0.6), 0.8 * glow);
    ctx.lineWidth = Math.max(0.8, width * 0.45);
    ctx.stroke();
  }

  /** Flügel aus Lichtstrahlen mit hauchzarter Flughaut */
  private drawWings(
    ctx: CanvasRenderingContext2D,
    shoulder: Segment,
    time: number,
    glow: number,
  ): void {
    const span = 2.6 * shoulder.s;
    const flap = Math.sin(time * 5.2);
    const lift = 0.55 + 0.45 * flap;
    const width = Math.max(1.2, shoulder.r * 0.16);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(shoulder.x + side * shoulder.r * 0.5, shoulder.y - shoulder.r * 0.2);
      ctx.scale(side, 1);
      ctx.rotate(-flap * 0.35);
      const elbow: Vec = [span * 0.32, -span * 0.32 * lift - span * 0.05];
      const tip: Vec = [span * 0.98, -span * 0.42 * lift + span * 0.05];
      const fingers: Vec[] = [
        [span * 0.82, span * 0.1],
        [span * 0.6, span * 0.2],
        [span * 0.32, span * 0.2],
      ];

      // Flughaut: nur ein farbiger Schleier
      ctx.globalCompositeOperation = 'lighter';
      const membrane = ctx.createLinearGradient(0, 0, tip[0], tip[1]);
      membrane.addColorStop(0, rgba(PALETTE[2], 0.16 * glow));
      membrane.addColorStop(1, rgba(PALETTE[4], 0.06 * glow));
      ctx.fillStyle = membrane;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(elbow[0], elbow[1]);
      ctx.lineTo(tip[0], tip[1]);
      let prev = tip;
      for (const f of [...fingers, [0, span * 0.06] as Vec]) {
        const mx = (prev[0] + f[0]) / 2;
        const my = (prev[1] + f[1]) / 2 - span * 0.06;
        ctx.quadraticCurveTo(mx, my, f[0], f[1]);
        prev = f;
      }
      ctx.closePath();
      ctx.fill();

      // Knochen als Lichtstrahlen
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(elbow[0], elbow[1]);
      ctx.lineTo(tip[0], tip[1]);
      for (const f of fingers) {
        ctx.moveTo(elbow[0], elbow[1]);
        ctx.lineTo(f[0], f[1]);
      }
      this.glowStroke(ctx, PALETTE[1], width, glow);

      // funkelnde Spitzen
      for (const [i, p] of [tip, ...fingers].entries()) {
        const tw = 0.6 + 0.4 * Math.sin(time * 8 + i * 1.9 + side);
        this.star(
          ctx,
          p[0],
          p[1],
          Math.max(1.5, shoulder.r * 0.3) * tw,
          rgba(WARM_WHITE, 0.75 * glow),
        );
      }
      ctx.restore();
    }
  }

  /** Kopf von vorn, nur aus Lichtlinien gezeichnet: Hörner, Schädel, Schnauze, Augen */
  private drawHead(
    ctx: CanvasRenderingContext2D,
    head: Segment,
    neck: Segment,
    time: number,
    glow: number,
    breath: number,
    charge: number,
  ): void {
    const hs = 0.36 * head.s;
    const tilt = clamp((head.x - neck.x) / (Math.abs(head.y - neck.y) + hs), -0.5, 0.5) * 0.4;
    const line = Math.max(1, hs * 0.07);
    // kurz vor dem Platzen zittert der Kopf
    const jitter = charge * hs * 0.04;

    ctx.save();
    ctx.translate(head.x + (Math.random() - 0.5) * jitter, head.y + (Math.random() - 0.5) * jitter);
    ctx.rotate(tilt);
    ctx.globalCompositeOperation = 'lighter';

    // weicher Lichtschein, wächst mit Feueratem und vor dem Platzen
    const haloR = hs * (2.2 + charge * 1.5);
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
    halo.addColorStop(0, rgba(PALETTE[0], (0.18 + 0.25 * breath + 0.35 * charge) * glow));
    halo.addColorStop(1, rgba(PALETTE[1], 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, haloR, 0, TAU);
    ctx.fill();

    // Schädel und Schnauze als zarte Fläche
    ctx.fillStyle = rgba(PALETTE[1], 0.1 * glow);
    ctx.beginPath();
    ctx.ellipse(0, -hs * 0.1, hs * 0.95, hs * 0.75, 0, 0, TAU);
    ctx.fill();

    // Umrisse
    ctx.beginPath();
    ctx.ellipse(0, -hs * 0.1, hs * 0.95, hs * 0.75, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.moveTo(hs * 0.58, hs * 0.42);
    ctx.ellipse(0, hs * 0.42, hs * 0.58, hs * 0.48, 0, 0, TAU);
    this.glowStroke(ctx, PALETTE[0], line, glow);

    // Hörner und Wangenfächer
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(side * hs * 0.45, -hs * 0.5);
      ctx.quadraticCurveTo(side * hs * 1.05, -hs * 1.15, side * hs * 1.3, -hs * 0.85);
      ctx.moveTo(side * hs * 0.8, -hs * 0.05);
      ctx.lineTo(side * hs * 1.35, hs * 0.05);
      ctx.lineTo(side * hs * 0.9, hs * 0.3);
    }
    this.glowStroke(ctx, PALETTE[1], line * 1.2, glow);
    for (const side of [-1, 1]) {
      const tw = 0.7 + 0.3 * Math.sin(time * 7 + side * 2);
      this.star(ctx, side * hs * 1.3, -hs * 0.85, line * 1.6 * tw, rgba(WARM_WHITE, 0.85 * glow));
    }

    // Maul: beim Feueratem ein glühender Spalt
    const open = 0.08 + breath * 0.4;
    ctx.fillStyle = rgba(PALETTE[0], (0.25 + 0.6 * breath) * glow);
    ctx.beginPath();
    ctx.ellipse(0, hs * 0.72, hs * 0.38, hs * open, 0, 0, TAU);
    ctx.fill();

    // Augen: helle Funken mit Schein
    for (const side of [-1, 1]) {
      const ex = side * hs * 0.4;
      const ey = -hs * 0.12;
      const eye = ctx.createRadialGradient(ex, ey, 0, ex, ey, hs * 0.3);
      eye.addColorStop(0, rgba(WARM_WHITE, 0.7 * glow));
      eye.addColorStop(1, rgba(PALETTE[0], 0));
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.arc(ex, ey, hs * 0.3, 0, TAU);
      ctx.fill();
      this.star(
        ctx,
        ex,
        ey,
        hs * 0.07 * (0.8 + 0.2 * Math.sin(time * 6)),
        rgba(WARM_WHITE, 0.9 * glow),
      );
    }
    ctx.restore();
  }
}

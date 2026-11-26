/**
 * Boom Clap als rahmenloses Erlebnis mitten auf der Seite – kein Zimmer, kein Bildrand.
 *
 *   1. Im Seitenraum steht eine Konfettikanone. Ein Klick startet Song und Konfetti.
 *   2. Peter Parker kommt im Comic-Look hereingelaufen (Ganzkörper).
 *   3. Die Kamera dreht sich wie eine Karte um 180° – im unsichtbaren Moment
 *      (Kante zur Kamera) wird auf die Comic-Nahaufnahme gewechselt.
 *   4. Die Boom-Clap-Choreografie läuft als Nahaufnahme weiter, freigestellt über der Seite.
 *
 * Zwei Leinwände: die Helden-Leinwand (wird per CSS gedreht) und darüber die
 * Effekt-Leinwand mit Kanonen und Konfetti, die fest im Seitenraum bleibt.
 *
 * Zeitachse: Alles hängt an der Songzeit. Bei einem Song mit längerem Vorspann
 * genügt es, SONG_OFFSET in boomClapTrack auf den ersten Choreografie-Beat zu
 * setzen – negative Beats sind dann Vorspann, Peter läuft herein und wartet
 * bis zur Drehung (TURN_START).
 */
import { beatAt, timeAt, type AudioLevels } from './boomClapTrack';
import { BoomClapBustScene } from './boomClapBustScene';
import { STAND_HEIGHT, drawHero, type Pose } from './boomClapHero';
import { HAND_SHAPES, blendHand } from './boomClapHand';
import {
  drawCannons,
  drawConfetti,
  makeBurst,
  type Burst,
  type BurstOptions,
  type CannonSpec,
  type ConfettiBit,
  type PaletteName,
  type StickPlacement,
} from './boomClapConfetti';
import { drawWebShots, webShotsActive } from './boomClapWebShot';
import { ComicFilter } from './comicFilter';
import { clamp, easeInOut, smooth } from './canvasUtils';
import type { SceneState } from './boomClapTypes';

/* ------------------------------------------------------------------ */
/*  Einstellungen                                                      */
/* ------------------------------------------------------------------ */

/** Beat, an dem die Kamera zu drehen beginnt (vor BOOM 1 auf Beat 3) */
export const TURN_START = 1.4;
/** Dauer der Drehung in Beats */
const TURN_BEATS = 1.3;
/** Peter läuft höchstens so lange herein (s), danach wartet er wippend */
const WALK_MAX = 2.6;
/** Beats der vier Booms – dann feuern beide Kanonen. Bis Spider-Man gold, ab dem Symbionten wie früher bunt */
const BOOMS: [number, PaletteName][] = [
  [3, 'gold'],
  [11, 'gold'],
  [19, 'symbiote'],
  [27, 'finale'],
];
/** Palette für Extra-Schüsse per Klick, je nach Songzeit */
const paletteAt = (t: number): PaletteName =>
  t >= timeAt(27) ? 'finale' : t >= timeAt(19) ? 'symbiote' : 'gold';
/** Netze bleiben bis zum Ende auf dem Bild hängen */
const WEBS_PERSIST = true;
/** feste Höhe der Konfetti-Welt; die Breite folgt dem Seitenformat */
const WORLD_H = 1000;
/** interne Auflösung höchstens so fein (spart Rechenzeit beim Comic-Filter) */
const MAX_RES = 1.5;

const ANKLE = 278;
const STAND: Pose = {
  x: 0,
  y: 0,
  s: 1,
  rot: 0,
  lean: 0,
  tl: 1,
  headTilt: 0,
  hl: [-74, 42],
  hr: [74, 42],
  fl: [-40, ANKLE],
  fr: [40, ANKLE],
  hlDir: 0,
  hlW: 0,
  hrDir: 0,
  hrW: 0,
  shapeL: 'relaxed',
  shapeR: 'relaxed',
  mouth: 0,
  brow: 0,
  lookX: 0,
  squint: 0,
  blink: 0,
};

export class BoomClapSpaceScene {
  private ctx: CanvasRenderingContext2D;
  private fx: HTMLCanvasElement;
  private fxCtx: CanvasRenderingContext2D;
  private heroSrc = document.createElement('canvas');
  private heroSrcCtx: CanvasRenderingContext2D;
  private fxSrc = document.createElement('canvas');
  private fxSrcCtx: CanvasRenderingContext2D;
  private bustSrc = document.createElement('canvas');
  private bust: BoomClapBustScene;
  private filter = new ComicFilter();
  private res = 1;
  private worldW = 1600;
  private cannons: CannonSpec[] = [];
  private bursts: Burst[][] = [[], []];
  /** zusätzliche Schüsse, wenn während des Songs auf die Kanone geklickt wird */
  private extraShots: number[] = [];
  private lastTime = 0;
  /** Brust/Kopf des Helden in Konfetti-Weltkoordinaten (nur in der Nahaufnahme) */
  private anchor: { chest: [number, number]; head: [number, number] } | null = null;
  /** Schnipsel, die am Helden kleben: Lage relativ zu Brust und Kopf */
  private attached = new Map<ConfettiBit, { lx: number; ly: number; rot0: number } | null>();

  constructor(ctx: CanvasRenderingContext2D, fx: HTMLCanvasElement) {
    this.ctx = ctx;
    this.fx = fx;
    const c2d = (c: HTMLCanvasElement) => {
      const x = c.getContext('2d');
      if (!x) throw new Error('2D-Kontext fehlt');
      return x;
    };
    this.fxCtx = c2d(fx);
    this.heroSrcCtx = c2d(this.heroSrc);
    this.fxSrcCtx = c2d(this.fxSrc);
    this.bust = new BoomClapBustScene(c2d(this.bustSrc));
    this.bust.backdrop = false;
    this.bust.confetti = false;
    this.bust.grain = false;
    this.bust.webShots = false;
  }

  get state(): SceneState {
    return this.bust.state;
  }
  get motion() {
    return this.bust.motion;
  }
  set motion(v: boolean) {
    this.bust.motion = v;
  }
  get duration() {
    return this.bust.duration;
  }
  set duration(v: number) {
    this.bust.duration = v;
  }

  /** Lage der Kanone in Anteilen der Fläche (für den Klick-Knopf im Template) */
  static readonly CANNON_AT = { x: 0.14, y: 0.93 };

  resize(w: number, h: number, dpr: number) {
    this.res = Math.min(dpr, MAX_RES);
    const rw = Math.round(w * this.res);
    const rh = Math.round(h * this.res);
    for (const c of [this.heroSrc, this.fxSrc, this.bustSrc]) {
      c.width = rw;
      c.height = rh;
    }
    this.fx.width = Math.round(w * dpr);
    this.fx.height = Math.round(h * dpr);
    this.bust.resize(w, h, this.res);
    this.worldW = (WORLD_H * w) / Math.max(1, h);
    const at = BoomClapSpaceScene.CANNON_AT;
    this.cannons = [
      { x: this.worldW * at.x, y: WORLD_H * at.y, dir: 1, scale: 1.9, tilt: 0.42 },
      { x: this.worldW * (1 - at.x), y: WORLD_H * at.y, dir: -1, scale: 1.9, tilt: 0.42 },
    ];
    this.buildBursts();
  }

  /** Klick auf die Kanone, während der Song schon läuft: noch ein Schuss */
  fireExtra() {
    const t = this.lastTime + 0.02;
    this.extraShots.push(t);
    this.bursts[0].push(
      makeBurst(t, paletteAt(t), 300 + this.extraShots.length, this.burstOpts(this.cannons[0])),
    );
  }

  /** goldenes Konfetti, etwas größer; es landet nicht, sondern bleibt kleben */
  private burstOpts(c: CannonSpec): BurstOptions {
    return {
      cannons: [c],
      scale: 1.15,
      size: 1.55,
      count: 120,
      floor: null,
      ceil: -4000,
      stick: [0.85, 2.4],
      stickChance: 0.62,
    };
  }

  private buildBursts() {
    const [L, R] = this.cannons;
    const left: Burst[] = [makeBurst(0.02, 'gold', 11, this.burstOpts(L))];
    const right: Burst[] = [];
    BOOMS.forEach(([k, pal], i) => {
      const t = timeAt(k);
      left.push(makeBurst(t, pal, 100 + i, this.burstOpts(L)));
      right.push(makeBurst(t, pal, 200 + i, this.burstOpts(R)));
    });
    this.extraShots.forEach((t, i) =>
      left.push(makeBurst(t, paletteAt(t), 301 + i, this.burstOpts(L))),
    );
    this.bursts = [left, right];
    this.attached.clear();
  }

  /**
   * Wo ein festgeklebter Schnipsel hingehört: trifft er beim Festkleben den Helden,
   * hängt er ab dann an ihm (folgt Brust und Kopf), sonst bleibt er auf der Seite.
   */
  private place = (b: ConfettiBit, x: number, y: number): StickPlacement | null => {
    let a = this.attached.get(b);
    if (a === undefined) {
      a = null;
      const an = this.anchor;
      if (an) {
        const dx = an.head[0] - an.chest[0];
        const dy = an.head[1] - an.chest[1];
        const L = Math.hypot(dx, dy) || 1;
        const th = Math.atan2(dy, dx) + Math.PI / 2;
        const c = Math.cos(-th);
        const s = Math.sin(-th);
        const px = x - an.chest[0];
        const py = y - an.chest[1];
        const lx = (px * c - py * s) / L;
        const ly = (px * s + py * c) / L;
        // grob die Silhouette: Kopf, Schultern, Brust
        const inHead = Math.hypot(lx / 0.55, (ly + 1.05) / 0.6) < 1;
        const inBody = Math.abs(lx) < 1.55 - Math.max(0, -ly - 0.3) * 0.9 && ly > -0.45 && ly < 1.6;
        if (inHead || inBody) a = { lx, ly, rot0: th };
      }
      this.attached.set(b, a);
    }
    if (!a || !this.anchor) return null;
    const an = this.anchor;
    const dx = an.head[0] - an.chest[0];
    const dy = an.head[1] - an.chest[1];
    const L = Math.hypot(dx, dy) || 1;
    const th = Math.atan2(dy, dx) + Math.PI / 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    return {
      x: an.chest[0] + (a.lx * c - a.ly * s) * L,
      y: an.chest[1] + (a.lx * s + a.ly * c) * L,
      rot: th - a.rot0,
    };
  };

  render(t: number | null, wall: number, levels?: AudioLevels) {
    const idle = t === null;
    const time = idle ? 0 : t;
    // neuer Durchlauf: Extra-Schüsse und angeklebtes Konfetti vergessen
    if ((idle || time < this.lastTime - 0.5) && (this.extraShots.length || this.attached.size)) {
      this.extraShots = [];
      this.buildBursts();
    }
    this.lastTime = time;
    const k = idle ? -99 : beatAt(time);
    const turn = idle ? 0 : clamp((k - TURN_START) / TURN_BEATS, 0, 1);

    /* ---------- Held ---------- */
    const hctx = this.ctx;
    const cw = hctx.canvas.width;
    const ch = hctx.canvas.height;
    hctx.setTransform(1, 0, 0, 1, 0, 0);
    hctx.clearRect(0, 0, cw, ch);
    let heroSource: HTMLCanvasElement | null = null;
    if (!idle && turn < 0.5) {
      this.drawEntrance(time, k, wall);
      heroSource = this.heroSrc;
    } else if (!idle) {
      this.bust.render(time, wall, levels);
      heroSource = this.bustSrc;
    }
    const an = turn >= 1 ? this.bust.anchor : null;
    const toWorld = WORLD_H / Math.max(1, this.bustSrc.height);
    this.anchor = an
      ? {
          chest: [an.chest[0] * toWorld, an.chest[1] * toWorld],
          head: [an.head[0] * toWorld, an.head[1] * toWorld],
        }
      : null;
    if (heroSource) hctx.drawImage(this.filter.process(heroSource, this.res), 0, 0, cw, ch);

    // Kamerafahrt: Karte dreht sich weg, Nahaufnahme dreht sich herein
    const style = hctx.canvas.style;
    if (idle || turn <= 0) {
      style.transform = '';
    } else if (turn < 0.5) {
      const e = easeInOut(turn * 2);
      style.transform = `rotateY(${e * 90}deg) scale(${1 + e * 0.35})`;
    } else if (turn < 1) {
      const e = easeInOut((turn - 0.5) * 2);
      style.transform = `rotateY(${-90 + e * 90}deg) scale(${0.8 + e * 0.2})`;
    } else {
      style.transform = '';
    }

    /* ---------- Kanonen und Konfetti ---------- */
    this.drawFx(time, idle, wall);
  }

  /** Peter läuft herein, bleibt in der Mitte stehen und winkt im Takt */
  private drawEntrance(time: number, k: number, wall: number) {
    const ctx = this.heroSrcCtx;
    const W = this.heroSrc.width;
    const H = this.heroSrc.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const turnT = timeAt(TURN_START);
    const walkEnd = Math.min(Math.max(0.6, turnT - 0.15), 0.1 + WALK_MAX);
    const walkDur = Math.max(0.3, walkEnd - 0.1);
    const wt = clamp((time - 0.1) / walkDur, 0, 1);
    const arrive = 1 - (1 - wt) ** 2.2;
    const walking = wt < 1;

    const s = (H * 0.58) / 560;
    const groundY = H * 0.9;
    const x = -W * 0.12 + (W * 0.5 + W * 0.12) * arrive;
    const p: Pose = {
      ...STAND,
      hl: [...STAND.hl],
      hr: [...STAND.hr],
      fl: [...STAND.fl],
      fr: [...STAND.fr],
    };
    // kurzer Auftritt: im Sprung herein, sonst Schritt für Schritt
    const hop = walkDur < 1.4 && walking ? Math.sin(Math.PI * wt) * 70 : 0;
    let bob = 0;
    if (walking) {
      const ph = time * Math.PI * 2 * (walkDur < 1.4 ? 2.6 : 1.9);
      const sw = Math.sin(ph);
      p.fl = [-40 + sw * 14, ANKLE - Math.max(0, sw) * 34];
      p.fr = [40 - sw * 14, ANKLE - Math.max(0, -sw) * 34];
      p.hl = [-70 - sw * 10, 36 - sw * 18];
      p.hr = [70 - sw * 10, 36 + sw * 18];
      p.lean = 0.04;
      p.headTilt = -0.03;
      p.lookX = 0.6;
    } else {
      // angekommen: im Takt wippen, winken, zum Publikum schauen
      const frac = k - Math.floor(k);
      bob = Math.exp(-Math.max(0, frac) * 6) * 8;
      p.fl = [-40, ANKLE - bob];
      p.fr = [40, ANKLE - bob];
      const since = time - walkEnd;
      const wave = smooth(0, 0.25, since);
      p.hr = [74 + (96 - 74) * wave + Math.sin(wall * 9) * 16 * wave, 42 + (-176 - 42) * wave];
      p.hrDir = -Math.PI / 2 + 0.25;
      p.hrW = wave;
      p.shapeR = wave > 0.5 ? 'open' : 'relaxed';
      p.handR = blendHand(HAND_SHAPES.relaxed, HAND_SHAPES.open, wave);
      p.headTilt = Math.sin(wall * 1.3) * 0.05 + 0.04;
      p.brow = 0.3;
    }
    p.blink = wall % 3.6 < 0.12 ? 1 : 0;
    ctx.save();
    ctx.translate(x, groundY - (STAND_HEIGHT - bob + hop) * s);
    ctx.scale(s, s);
    // Schatten auf dem „Boden“ der Seite
    ctx.save();
    ctx.translate(0, STAND_HEIGHT - bob + hop);
    ctx.fillStyle = `rgba(0,0,0,${0.28 - hop / 600})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 90 - hop * 0.3, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawHero(ctx, p, 'peter', wall);
    ctx.restore();
  }

  private drawFx(time: number, idle: boolean, wall: number) {
    // Kanonen durch den Comic-Filter, Konfetti direkt in kräftigen Farben
    // (der Filter würde die kleinen Schnipsel komplett schwarz umranden)
    const src = this.fxSrcCtx;
    const W = this.fxSrc.width;
    const H = this.fxSrc.height;
    src.setTransform(1, 0, 0, 1, 0, 0);
    src.clearRect(0, 0, W, H);
    src.setTransform(H / WORLD_H, 0, 0, H / WORLD_H, 0, 0);
    const [L, R] = this.cannons;
    // linke Kanone steht von Anfang an, die rechte fährt zum ersten Boom hoch
    const k = idle ? -99 : beatAt(time);
    const rise = idle ? 0 : smooth(2.2, 2.9, k);
    const idlePulse = idle ? 1 + Math.sin(wall * 4) * 0.03 : 1;
    drawCannons(src, idle ? [] : this.bursts[0], time, [{ ...L, scale: L.scale * idlePulse }]);
    if (rise > 0) {
      src.save();
      src.translate(0, (1 - rise) * 320);
      drawCannons(src, this.bursts[1], time, [R]);
      src.restore();
    }

    const fctx = this.fxCtx;
    const fw = this.fx.width;
    const fh = this.fx.height;
    const all = [...this.bursts[0], ...this.bursts[1]];
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.clearRect(0, 0, fw, fh);
    fctx.setTransform(fh / WORLD_H, 0, 0, fh / WORLD_H, 0, 0);
    if (!idle) drawConfetti(fctx, all, time, 0, this.place);
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.drawImage(this.filter.process(this.fxSrc, this.res), 0, 0, fw, fh);
    fctx.setTransform(fh / WORLD_H, 0, 0, fh / WORLD_H, 0, 0);
    if (!idle) drawConfetti(fctx, all, time, 1, this.place);

    // Netze in die Kamera: ganz oben, nicht vom weichen Rand der Nahaufnahme beschnitten
    const hands = this.bust.hands;
    if (!idle && hands && webShotsActive(k, WEBS_PERSIST)) {
      const f = fw / Math.max(1, this.bustSrc.width);
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      drawWebShots(
        fctx,
        k,
        fw,
        fh,
        { L: [hands.L[0] * f, hands.L[1] * f], R: [hands.R[0] * f, hands.R[1] * f] },
        this.motion ? 1 : 0.3,
        WEBS_PERSIST,
      );
    }
  }
}

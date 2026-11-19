/**
 * Figuren und zusätzliche Kulisse für den Straßenrand.
 * Gezeichnet wird in Welteinheiten, Füße bzw. Boden liegen bei y = 0.
 */
import { mixRGB, rgba } from './canvasUtils';
import type { SpriteContext } from './driveSprites';
import { paintBuilding } from './neonBuildings';
import { stringLights } from './nightLights';
import type { RoadSprite } from './roadRenderer';

const TAU = Math.PI * 2;
type Vec = [number, number];

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

function shadow(ctx: CanvasRenderingContext2D, rx: number, ry: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, 0, 0, rx, ry);
}

/* ======================= Figuren ======================= */

interface Look {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'long' | 'ponytail' | 'curly' | 'afro' | 'bald';
  top: string;
  /** Ärmelfarbe, Standard = top */
  sleeve?: string;
  bottom: string;
  outfit: 'pants' | 'dress' | 'shorts' | 'breeches';
  /** bauchfreies Oberteil */
  crop?: boolean;
  vest?: string;
  feet: 'shoes' | 'barefoot' | 'skates';
  shoes?: string;
  hat?: { kind: 'fedora' | 'bandana' | 'cap'; color: string };
  shades?: boolean;
  chain?: boolean;
  suit?: boolean;
  headScale?: number;
}

interface Arms {
  left: [Vec, Vec];
  right: [Vec, Vec];
  /** Unterarme vor der Brust verschränkt */
  crossed?: boolean;
}

type Pose =
  | 'down'
  | 'wave'
  | 'both'
  | 'hips'
  | 'crossed'
  | 'pipe'
  | 'carry'
  | 'peace'
  | 'phone'
  | 'cheers'
  | 'lantern'
  | 'aim'
  | 'gunUp';

function pose(kind: Pose, t: number): Arms {
  const down: [Vec, Vec] = [
    [150, -630],
    [160, -480],
  ];
  const mirror = ([[ex, ey], [hx, hy]]: [Vec, Vec]): [Vec, Vec] => [
    [-ex, ey],
    [-hx, hy],
  ];
  const wave = Math.sin(t * 8) * 70;
  switch (kind) {
    case 'wave':
      return {
        left: mirror(down),
        right: [
          [200, -860],
          [230 + wave, -1060],
        ],
      };
    case 'both': {
      const b = Math.sin(t * 7) * 40;
      return {
        left: [
          [-210, -880],
          [-240 - wave * 0.5, -1050 + b],
        ],
        right: [
          [210, -880],
          [240 + wave * 0.5, -1050 - b],
        ],
      };
    }
    case 'hips':
      return {
        left: [
          [-235, -650],
          [-125, -520],
        ],
        right: [
          [235, -650],
          [125, -520],
        ],
      };
    case 'crossed':
      return {
        left: [
          [-160, -620],
          [70, -665],
        ],
        right: [
          [160, -620],
          [-70, -655],
        ],
        crossed: true,
      };
    case 'pipe':
      return {
        left: mirror(down),
        right: [
          [175, -640],
          [45, -880],
        ],
      };
    case 'carry':
      return {
        left: [
          [-160, -600],
          [-95, -520],
        ],
        right: [
          [160, -600],
          [95, -520],
        ],
      };
    case 'peace':
      return {
        left: [
          [-235, -650],
          [-125, -520],
        ],
        right: [
          [200, -850],
          [215, -1060],
        ],
      };
    case 'lantern':
      // Öllampe am ausgestreckten Arm
      return {
        left: mirror(down),
        right: [
          [215, -650],
          [265, -760],
        ],
      };
    case 'cheers': {
      // Krug abwechselnd auf dem Tisch und am Mund
      const raise = Math.max(0, Math.sin(t * 1.4)) ** 0.6;
      return {
        left: [
          [-190, -640],
          [-120, -560],
        ],
        right: [
          [215, -700],
          [170 - raise * 110, -620 - raise * 300],
        ],
      };
    }
    case 'aim':
      // Arm seitlich ausgestreckt, die Waffe leicht gekippt
      return {
        left: [
          [-235, -650],
          [-125, -520],
        ],
        right: [
          [260, -800],
          [390, -820],
        ],
      };
    case 'gunUp':
      // Pistole neben dem Kopf nach oben gerichtet
      return {
        left: mirror(down),
        right: [
          [220, -700],
          [190, -960],
        ],
      };
    case 'phone':
      return {
        left: mirror(down),
        right: [
          [200, -760],
          [100, -935],
        ],
      };
    default:
      return { left: mirror(down), right: down };
  }
}

function limb(
  ctx: CanvasRenderingContext2D,
  a: Vec,
  b: Vec,
  c: Vec,
  width: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(c[0], c[1]);
  ctx.stroke();
}

/** Eine Figur von vorn, 1000 Einheiten groß */
function person(ctx: CanvasRenderingContext2D, look: Look, arms: Arms, t: number): void {
  const r = 85 * (look.headScale ?? 1);
  const hy = -930 - (r - 85) * 0.6;
  const sleeve = look.sleeve ?? look.top;

  shadow(ctx, 230, 40);

  // lange Haare hinter dem Kopf
  ctx.fillStyle = look.hair;
  if (look.hairStyle === 'long') {
    ctx.beginPath();
    ctx.roundRect(-r * 1.18, hy - r * 1.05, r * 2.36, r * 2.9, r);
    ctx.fill();
  }
  if (look.hairStyle === 'afro') blob(ctx, 0, hy - r * 0.35, r * 1.55);
  if (look.hairStyle === 'ponytail') {
    const sway = Math.sin(t * 5) * 40;
    ellipse(ctx, r * 1.05 + sway, hy + r * 0.2, r * 0.38, r * 0.85);
  }

  // Beine
  const legColor = look.outfit === 'pants' ? look.bottom : look.skin;
  const legWidth = look.outfit === 'pants' ? 92 : 64;
  limb(ctx, [-55, -480], [-58, -250], [-62, -40], legWidth, legColor);
  limb(ctx, [55, -480], [58, -250], [62, -40], legWidth, legColor);

  // Füße
  if (look.feet === 'barefoot') {
    ctx.fillStyle = '#b5825a';
    ellipse(ctx, -85, -26, 95, 40);
    ellipse(ctx, 85, -26, 95, 40);
    ctx.fillStyle = '#6b4226';
    for (const fx of [-85, 85]) {
      blob(ctx, fx - 30, -50, 14);
      blob(ctx, fx + 10, -56, 14);
      blob(ctx, fx + 40, -46, 12);
    }
  } else {
    ctx.fillStyle = look.shoes ?? '#1d1a22';
    ellipse(ctx, -70, -26, 70, 32);
    ellipse(ctx, 70, -26, 70, 32);
    if (look.feet === 'skates') {
      ctx.fillStyle = look.shoes ?? '#ff4fa3';
      ctx.fillRect(-120, -110, 100, 90);
      ctx.fillRect(20, -110, 100, 90);
      ctx.fillStyle = '#fff3b0';
      for (const wx of [-100, -40, 40, 100]) blob(ctx, wx, -8, 22);
    }
  }

  // Unterteil
  ctx.fillStyle = look.bottom;
  if (look.outfit === 'shorts') {
    ctx.fillRect(-120, -500, 240, 70);
    ctx.fillRect(-120, -470, 110, 140);
    ctx.fillRect(10, -470, 110, 140);
  }
  if (look.outfit === 'breeches') {
    ctx.fillRect(-115, -500, 230, 80);
    ctx.fillRect(-115, -460, 108, 200);
    ctx.fillRect(7, -460, 108, 200);
  }

  // Oberkörper bzw. Kleid
  if (look.crop) {
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.roundRect(-115, -820, 230, 340, 50);
    ctx.fill();
  }
  ctx.fillStyle = look.top;
  if (look.outfit === 'dress') {
    ctx.beginPath();
    ctx.moveTo(-120, -815);
    ctx.lineTo(120, -815);
    ctx.lineTo(125, -560);
    ctx.lineTo(215, -310);
    ctx.quadraticCurveTo(0, -270, -215, -310);
    ctx.lineTo(-125, -560);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.roundRect(-130, -825, 260, look.crop ? 200 : 360, 60);
    ctx.fill();
  }
  if (look.suit) {
    ctx.fillStyle = '#f2efe8';
    ctx.beginPath();
    ctx.moveTo(-55, -825);
    ctx.lineTo(55, -825);
    ctx.lineTo(0, -640);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b3202f';
    ctx.beginPath();
    ctx.moveTo(-14, -800);
    ctx.lineTo(14, -800);
    ctx.lineTo(10, -680);
    ctx.lineTo(0, -660);
    ctx.lineTo(-10, -680);
    ctx.closePath();
    ctx.fill();
  }
  if (look.vest) {
    ctx.fillStyle = look.vest;
    ctx.beginPath();
    ctx.moveTo(-130, -800);
    ctx.lineTo(-25, -800);
    ctx.lineTo(-10, -470);
    ctx.lineTo(-130, -470);
    ctx.closePath();
    ctx.moveTo(130, -800);
    ctx.lineTo(25, -800);
    ctx.lineTo(10, -470);
    ctx.lineTo(130, -470);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e3c15a';
    for (const by of [-720, -640, -560]) blob(ctx, 30, by, 14);
  }
  if (look.chain) {
    ctx.strokeStyle = '#f2c94c';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(0, -830, 95, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
  }

  // Arme
  for (const side of [arms.left, arms.right]) {
    const sx = side === arms.left ? -125 : 125;
    limb(ctx, [sx, -790], side[0], side[1], 72, sleeve);
    ctx.fillStyle = look.skin;
    blob(ctx, side[1][0], side[1][1], 38);
  }

  // Hals und Kopf
  ctx.fillStyle = look.skin;
  ctx.fillRect(-36, -870, 72, 60);
  blob(ctx, 0, hy, r);
  ctx.fillStyle = mixHex(look.skin, '#000000', 0.12);
  blob(ctx, -r * 0.98, hy + 6, r * 0.2);
  blob(ctx, r * 0.98, hy + 6, r * 0.2);

  // Gesicht
  if (look.shades) {
    ctx.fillStyle = '#0d0b12';
    ctx.beginPath();
    ctx.roundRect(-r * 0.85, hy - r * 0.28, r * 0.78, r * 0.38, r * 0.12);
    ctx.roundRect(r * 0.07, hy - r * 0.28, r * 0.78, r * 0.38, r * 0.12);
    ctx.fill();
    ctx.fillRect(-r * 0.1, hy - r * 0.22, r * 0.2, r * 0.08);
  } else {
    ctx.fillStyle = '#2a1d16';
    blob(ctx, -r * 0.36, hy - r * 0.1, r * 0.11);
    blob(ctx, r * 0.36, hy - r * 0.1, r * 0.11);
  }
  ctx.strokeStyle = '#7a3b2e';
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  ctx.arc(0, hy + r * 0.25, r * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // Haare vorn
  ctx.fillStyle = look.hair;
  if (look.hairStyle === 'curly') {
    for (let a = Math.PI * 0.85; a <= Math.PI * 2.15; a += 0.3) {
      blob(ctx, Math.cos(a) * r * 0.95, hy - r * 0.15 + Math.sin(a) * r * 0.9, r * 0.33);
    }
  } else if (look.hairStyle !== 'bald' && look.hairStyle !== 'afro') {
    ctx.beginPath();
    ctx.ellipse(0, hy - r * 0.3, r * 1.04, r * 0.78, 0, Math.PI, TAU);
    ctx.fill();
  }

  // Kopfbedeckung
  if (look.hat) {
    ctx.fillStyle = look.hat.color;
    if (look.hat.kind === 'fedora') {
      ellipse(ctx, 0, hy - r * 0.62, r * 1.55, r * 0.26);
      ctx.beginPath();
      ctx.roundRect(-r * 0.92, hy - r * 1.45, r * 1.84, r * 0.9, r * 0.3);
      ctx.fill();
      ctx.fillStyle = '#b3202f';
      ctx.fillRect(-r * 0.92, hy - r * 0.86, r * 1.84, r * 0.18);
    } else if (look.hat.kind === 'bandana') {
      ctx.fillRect(-r * 1.02, hy - r * 0.72, r * 2.04, r * 0.32);
      ctx.beginPath();
      ctx.moveTo(r * 0.9, hy - r * 0.6);
      ctx.lineTo(r * 1.5, hy - r * 0.2 + Math.sin(t * 6) * 10);
      ctx.lineTo(r * 1.3, hy - r * 0.05);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, hy - r * 0.35, r * 1.05, r * 0.8, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillRect(-r * 1.05, hy - r * 0.42, r * 2.1, r * 0.14);
    }
  }
}

function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) =>
    [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  return rgba(mixRGB(p(a), p(b), t));
}

/* ---------- Hobbits ---------- */

const HOBBITS: { look: Look; pose: Pose }[] = [
  {
    pose: 'wave',
    look: {
      skin: '#f1c9a5',
      hair: '#6b3f1f',
      hairStyle: 'curly',
      top: '#f3ead2',
      vest: '#5c7d3a',
      bottom: '#8a6a43',
      outfit: 'breeches',
      feet: 'barefoot',
      headScale: 1.3,
    },
  },
  {
    pose: 'pipe',
    look: {
      skin: '#e8b994',
      hair: '#d9a441',
      hairStyle: 'curly',
      top: '#efe6cf',
      vest: '#8a3b2b',
      bottom: '#5f6b3a',
      outfit: 'breeches',
      feet: 'barefoot',
      headScale: 1.3,
    },
  },
  {
    pose: 'carry',
    look: {
      skin: '#f3cfae',
      hair: '#3b2414',
      hairStyle: 'curly',
      top: '#f6efe0',
      vest: '#3f5f8a',
      bottom: '#7b5a3a',
      outfit: 'breeches',
      feet: 'barefoot',
      headScale: 1.3,
    },
  },
  {
    pose: 'both',
    look: {
      skin: '#e0ae88',
      hair: '#8b5a2b',
      hairStyle: 'curly',
      top: '#d9e6c8',
      vest: '#c9a227',
      bottom: '#6d4c2f',
      outfit: 'breeches',
      feet: 'barefoot',
      headScale: 1.3,
    },
  },
];

/** kleine Öllampe, die am Henkel bei (x, y) hängt */
function oilLamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: SpriteContext,
  seed: number,
): void {
  const swing = s.motion ? Math.sin(s.time * 2 + seed) * 0.12 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swing);
  ctx.strokeStyle = '#3b2a1a';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, 20, 34, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#7a5a2a';
  ctx.fillRect(-48, 18, 96, 26);
  ctx.fillStyle = s.night > 0.05 ? '#ffe7a6' : '#c9b48a';
  ctx.beginPath();
  ctx.roundRect(-40, 44, 80, 100, 24);
  ctx.fill();
  ctx.fillStyle = '#7a5a2a';
  ctx.fillRect(-50, 140, 100, 26);
  s.lights?.add(ctx, 0, 94, 60, 'lamp', seed);
  ctx.restore();
}

function hobbit(ctx: CanvasRenderingContext2D, variant: number, s: SpriteContext): void {
  const base = HOBBITS[variant % HOBBITS.length];
  const look = base.look;
  // nachts kommen die Hobbits mit Öllampen heraus, nur der Tänzer tanzt weiter
  const p: Pose = s.night > 0.35 && base.pose !== 'both' ? 'lantern' : base.pose;
  const t = s.motion ? s.time + variant * 0.7 : 0;
  ctx.save();
  ctx.scale(0.62, 0.62);
  if (p === 'both') ctx.translate(0, -Math.abs(Math.sin(t * 7)) * 60);
  const arms = pose(p, t);
  person(ctx, look, arms, t);
  if (p === 'lantern') oilLamp(ctx, arms.right[1][0], arms.right[1][1], s, variant + 1);

  if (p === 'pipe') {
    ctx.strokeStyle = '#5a3a1e';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(10, -905);
    ctx.lineTo(120, -880);
    ctx.stroke();
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(110, -920, 40, 45);
    const alpha = ctx.globalAlpha;
    for (let k = 0; k < 3; k++) {
      const q = (t * 0.5 + k / 3) % 1;
      ctx.globalAlpha = alpha * 0.55 * (1 - q);
      ctx.fillStyle = '#f2f2ee';
      blob(ctx, 130 + Math.sin(q * 6) * 30, -960 - q * 380, 30 + q * 50);
    }
    ctx.globalAlpha = alpha;
  }
  if (p === 'carry') {
    ctx.fillStyle = '#a4763f';
    ctx.beginPath();
    ctx.roundRect(-150, -560, 300, 150, 30);
    ctx.fill();
    ctx.fillStyle = '#d63a2f';
    for (const ax of [-90, -20, 50, 110]) blob(ctx, ax, -570, 40);
  }
  ctx.restore();
}

/* ---------- Hobbits beim Bier ---------- */

function mug(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#d9a03a';
  ctx.fillRect(x - 48, y - 90, 96, 120);
  ctx.strokeStyle = '#b07c25';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(x + 55, y - 30, 32, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.fillStyle = '#fff8e6';
  ellipse(ctx, x, y - 92, 60, 26);
  blob(ctx, x - 25, y - 105, 20);
}

/** Hobbit-Figur mit Bierkrug in der Hand */
function drinker(ctx: CanvasRenderingContext2D, look: Look, t: number): void {
  const arms = pose('cheers', t);
  person(ctx, look, arms, t);
  mug(ctx, arms.right[1][0], arms.right[1][1]);
}

function barrel(ctx: CanvasRenderingContext2D, x: number, w: number, h: number): void {
  ctx.fillStyle = '#8a5a2e';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.42, 0);
  ctx.quadraticCurveTo(x - w * 0.55, -h / 2, x - w * 0.42, -h);
  ctx.lineTo(x + w * 0.42, -h);
  ctx.quadraticCurveTo(x + w * 0.55, -h / 2, x + w * 0.42, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4a4a4a';
  for (const k of [0.15, 0.5, 0.85]) ctx.fillRect(x - w * 0.5, -h * k - 18, w, 36);
  ctx.fillStyle = '#a8743f';
  ellipse(ctx, x, -h, w * 0.42, w * 0.1);
}

/** sitzende Hobbits: am Tisch beim Anstoßen oder allein auf einem Fass */
function pub(ctx: CanvasRenderingContext2D, variant: number, s: SpriteContext): void {
  const t = s.motion ? s.time : 0;
  if (variant % 2) {
    shadow(ctx, 380, 50);
    barrel(ctx, 0, 560, 560);
    if (s.night > 0.05) oilLamp(ctx, 420, -170, s, variant + 3);
    ctx.save();
    ctx.scale(0.62, 0.62);
    // Hüfte sitzt auf dem Fass, die Beine baumeln davor
    ctx.translate(0, -420);
    drinker(ctx, HOBBITS[variant % HOBBITS.length].look, t + variant);
    ctx.restore();
    return;
  }

  shadow(ctx, 900, 70);
  barrel(ctx, -1050, 420, 460);
  // zwei bis drei Hobbits hinter dem Tisch, nur der Oberkörper ist sichtbar
  ctx.save();
  ctx.beginPath();
  ctx.rect(-1000, -2000, 2000, 1680);
  ctx.clip();
  const seats = variant % 4 === 0 ? [-460, 0, 460] : [-300, 300];
  seats.forEach((sx, i) => {
    ctx.save();
    ctx.translate(sx, 0);
    ctx.scale(0.62, 0.62);
    ctx.translate(0, -100);
    drinker(ctx, HOBBITS[(variant + i) % HOBBITS.length].look, t + i * 1.9);
    ctx.restore();
  });
  ctx.restore();

  // Sitzbank und Beine unter dem Tisch
  ctx.fillStyle = '#6b4c2e';
  ctx.fillRect(-820, -250, 1640, 50);
  ctx.fillRect(-760, -200, 50, 200);
  ctx.fillRect(710, -200, 50, 200);
  seats.forEach((sx, i) => {
    const look = HOBBITS[(variant + i) % HOBBITS.length].look;
    const swing = Math.sin(t * 2.2 + i * 1.3) * 18;
    for (const side of [-1, 1]) {
      const knee: Vec = [sx + side * 70, -300];
      const foot: Vec = [sx + side * 82 + swing * side, -50];
      ctx.strokeStyle = look.skin;
      ctx.lineWidth = 52;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(knee[0], knee[1]);
      ctx.lineTo(foot[0], foot[1]);
      ctx.stroke();
      ctx.fillStyle = look.bottom;
      ctx.beginPath();
      ctx.roundRect(knee[0] - 40, knee[1] - 20, 80, 110, 20);
      ctx.fill();
      ctx.fillStyle = '#b5825a';
      ellipse(ctx, foot[0] + side * 12, -24, 62, 26);
      ctx.fillStyle = '#6b4226';
      blob(ctx, foot[0] + side * 4, -40, 9);
      blob(ctx, foot[0] + side * 26, -38, 8);
    }
  });

  // Tisch mit Krug
  ctx.fillStyle = '#7a5532';
  ctx.fillRect(-640, -320, 70, 320);
  ctx.fillRect(570, -320, 70, 320);
  ctx.fillStyle = '#a8743f';
  ctx.fillRect(-760, -360, 1520, 60);
  ctx.fillStyle = '#6b4c2e';
  ctx.fillRect(-760, -300, 1520, 22);
  ctx.save();
  ctx.translate(560, -360);
  ctx.scale(0.62, 0.62);
  mug(ctx, 0, 0);
  ctx.restore();
  // Öllampe auf dem Tisch, darüber eine Lichterkette zwischen zwei Stangen
  if (s.night > 0.05) {
    oilLamp(ctx, -520, -530, s, variant + 5);
    ctx.fillStyle = '#5b3b22';
    ctx.fillRect(-900, -1250, 40, 1250);
    ctx.fillRect(860, -1250, 40, 1250);
    stringLights(ctx, s.lights, s.night, -880, -1230, 880, -1230, 120, 11, 26, variant * 11 + 1);
  }
}

/* ---------- Pferde auf der Koppel ---------- */

const HORSE_COATS = [
  ['#7a4a2a', '#3a2214'],
  ['#2b211b', '#110c09'],
  ['#d9d2c4', '#8f8676'],
  ['#a0522d', '#5a2a12'],
  ['#5b5b5b', '#2a2a2a'],
];

function horse(ctx: CanvasRenderingContext2D, variant: number, s: SpriteContext): void {
  const [coat, mane] = HORSE_COATS[variant % HORSE_COATS.length];
  const far = mixHex(coat, '#000000', 0.25);
  const dir = variant % 2 ? 1 : -1;
  const t = s.motion ? s.time : 0;
  // grast und hebt ab und zu den Kopf
  const g = (Math.sin(t * 0.45 + variant * 1.7) + 1) / 2;
  const graze = g * g * (3 - 2 * g);

  shadow(ctx, 950, 90);
  ctx.save();
  ctx.scale(dir, 1);

  const poly = (pts: Vec[], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      // weiche Kurven über die Mittelpunkte
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    ctx.closePath();
    ctx.fill();
  };

  // Hinterbein mit kräftiger Kruppe, Unterschenkel und Sprunggelenk
  const hindLeg = (ox: number, color: string) =>
    poly(
      [
        [-470 + ox, -1080],
        [-420 + ox, -860],
        [-500 + ox, -660],
        [-555 + ox, -470],
        [-552 + ox, -150],
        [-530 + ox, -70],
        [-495 + ox, 0],
        [-650 + ox, 0],
        [-628 + ox, -90],
        [-612 + ox, -170],
        [-690 + ox, -500],
        [-785 + ox, -720],
        [-840 + ox, -1000],
        [-760 + ox, -1220],
      ],
      color,
    );
  // Vorderbein mit muskulösem Unterarm, Knie und schlanker Röhre
  const foreLeg = (ox: number, color: string) =>
    poly(
      [
        [660 + ox, -1000],
        [665 + ox, -760],
        [598 + ox, -520],
        [590 + ox, -150],
        [608 + ox, -80],
        [645 + ox, 0],
        [500 + ox, 0],
        [518 + ox, -90],
        [526 + ox, -160],
        [522 + ox, -520],
        [470 + ox, -760],
        [430 + ox, -960],
      ],
      color,
    );

  // Schweif
  const swish = Math.sin(t * 2.3 + variant) * 60;
  poly(
    [
      [-770, -1260],
      [-900, -1120],
      [-930 + swish * 0.4, -800],
      [-880 + swish, -420],
      [-820 + swish, -380],
      [-800 + swish * 0.5, -760],
      [-740, -1100],
    ],
    mane,
  );

  // hintere Beine dunkler, dann Rumpf, dann vordere Beine
  hindLeg(90, far);
  foreLeg(-80, far);
  poly(
    [
      [380, -1450],
      [-100, -1380],
      [-560, -1460],
      [-820, -1300],
      [-860, -1080],
      [-700, -880],
      [-300, -820],
      [300, -840],
      [620, -930],
      [780, -1130],
      [700, -1380],
    ],
    coat,
  );
  hindLeg(0, coat);
  foreLeg(0, coat);

  // Muskelschatten und Glanzlichter
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ellipse(ctx, -560, -1220, 220, 150);
  ellipse(ctx, 560, -1150, 150, 190);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ellipse(ctx, -120, -880, 420, 70);
  ctx.fillStyle = '#16110d';
  for (const [hx, w] of [
    [-572, 160],
    [-482, 150],
    [572, 150],
    [492, 140],
  ] as const)
    ctx.fillRect(hx - w / 2, -40, w, 40);

  // Hals und Kopf drehen sich beim Grasen nach unten
  ctx.save();
  ctx.translate(560, -1260 + graze * 330);
  ctx.rotate(graze * 1.35);
  poly(
    [
      [-170, -150],
      [20, -470],
      [300, -640],
      [380, -600],
      [560, -380],
      [585, -300],
      [520, -270],
      [380, -350],
      [280, -360],
      [220, -200],
      [190, 120],
      [-40, 160],
    ],
    coat,
  );
  // Mähne entlang des Kamms
  ctx.strokeStyle = mane;
  ctx.lineWidth = 70;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-150, -170);
  ctx.quadraticCurveTo(40, -500, 300, -650);
  ctx.stroke();
  ctx.lineWidth = 34;
  for (let i = 0; i < 5; i++) {
    const k = i / 5;
    const x = -120 + k * 400;
    const y = -200 - k * 430;
    const flow = Math.sin(t * 1.8 + i) * 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 60, y + 80, x - 90 + flow, y + 170);
    ctx.stroke();
  }
  // Ohr, Auge, Nüstern
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(290, -620);
  ctx.lineTo(250, -790);
  ctx.lineTo(350, -640);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#110c09';
  blob(ctx, 370, -520, 26);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  blob(ctx, 540, -320, 20);
  ctx.restore();

  ctx.restore();
}

/** Vogelscheuche mitten im Feld */
function scarecrow(ctx: CanvasRenderingContext2D, s: SpriteContext): void {
  const sway = s.motion ? Math.sin(s.time * 1.2) * 0.05 : 0;
  ctx.save();
  ctx.rotate(sway);
  ctx.fillStyle = '#6b4c2e';
  ctx.fillRect(-35, -1700, 70, 1700);
  ctx.fillRect(-620, -1300, 1240, 60);
  ctx.fillStyle = '#5c7d3a';
  ctx.fillRect(-260, -1380, 520, 560);
  ctx.fillRect(-620, -1350, 380, 160);
  ctx.fillRect(240, -1350, 380, 160);
  ctx.fillStyle = '#b8402f';
  ctx.fillRect(-120, -1150, 140, 140);
  ctx.fillStyle = '#e3c25a';
  for (const x of [-640, 620]) {
    ctx.beginPath();
    ctx.moveTo(x, -1340);
    ctx.lineTo(x + Math.sign(x) * 120, -1300);
    ctx.lineTo(x, -1200);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#d8c49a';
  blob(ctx, 0, -1500, 170);
  ctx.fillStyle = '#2a1d16';
  blob(ctx, -60, -1520, 22);
  blob(ctx, 60, -1520, 22);
  ctx.fillStyle = '#c9a640';
  ellipse(ctx, 0, -1620, 330, 60);
  ctx.beginPath();
  ctx.ellipse(0, -1640, 170, 160, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ---------- seltener Gast: die Höhlenkreatur ---------- */

/**
 * Magere, blasse Kreatur mit riesigen Augen.
 * variant 0 = geduckt auf allen vieren, 1 = mitten im Sprung.
 */
function creature(ctx: CanvasRenderingContext2D, sprite: RoadSprite, s: SpriteContext): void {
  const t = s.motion ? s.time : 0;
  const lift = sprite.lift ?? 0;
  const jumping = sprite.variant === 1;
  const skin = '#d3d0b4';
  const shade = '#a8a68c';
  const deep = '#8c8a72';

  // Schatten bleibt am Boden und wird kleiner, je höher der Sprung
  ctx.fillStyle = `rgba(0,0,0,${0.25 * (1 - Math.min(1, lift / 900))})`;
  ellipse(ctx, 0, 0, 300 - lift * 0.12, 44);

  ctx.save();
  ctx.translate(0, -lift);
  ctx.scale(1.15, 1.15);
  const breathe = Math.sin(t * 4) * 6;
  const look = Math.sin(t * 1.3) * 18;

  /** dünne Gliedmaßen mit knubbeligen Gelenken */
  const limb = (pts: Vec[], width: number) => {
    ctx.strokeStyle = skin;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = shade;
    blob(ctx, pts[1][0], pts[1][1], width * 0.62);
  };
  const fingers = (x: number, y: number, side: number, up: boolean) => {
    ctx.strokeStyle = shade;
    ctx.lineWidth = 10;
    ctx.beginPath();
    for (const k of [-1, 0, 1]) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + side * 22 + k * 18, y + (up ? -38 : 30) + Math.abs(k) * 6);
    }
    ctx.stroke();
  };

  for (const side of [-1, 1]) {
    if (jumping) {
      limb(
        [
          [side * 50, -230],
          [side * 190, -150],
          [side * 250, -30],
        ],
        40,
      );
      limb(
        [
          [side * 85, -360],
          [side * 220, -440],
          [side * 300, -560],
        ],
        32,
      );
      fingers(side * 300, -560, side, true);
      ctx.fillStyle = shade;
      ellipse(ctx, side * 275, -24, 80, 22);
    } else {
      // Froschhocke: Knie weit nach außen, Füße flach auf dem Boden
      limb(
        [
          [side * 50, -220],
          [side * 225, -300],
          [side * 185, -20],
        ],
        40,
      );
      // lange Arme hängen zwischen den Knien bis zum Boden
      limb(
        [
          [side * 85, -360],
          [side * 120, -200],
          [side * 95, -15],
        ],
        32,
      );
      fingers(side * 95, -15, side, false);
      ctx.fillStyle = shade;
      ellipse(ctx, side * 205, -16, 85, 22);
    }
  }

  // gekrümmter, magerer Rumpf mit Rippen
  const body = ctx.createLinearGradient(-90, 0, 90, 0);
  body.addColorStop(0, shade);
  body.addColorStop(0.45, skin);
  body.addColorStop(1, shade);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -300 + breathe * 0.3, 88, 118, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = deep;
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (const y of [-350, -318, -286]) {
    ctx.moveTo(-58, y);
    ctx.quadraticCurveTo(0, y + 16, 58, y);
  }
  ctx.stroke();
  // Lendenschurz mit ausgefranstem Rand
  ctx.fillStyle = '#5f4b31';
  ctx.beginPath();
  ctx.moveTo(-78, -230);
  ctx.lineTo(78, -230);
  for (let i = 4; i >= 0; i--) ctx.lineTo(-62 + i * 31, i % 2 ? -170 : -150);
  ctx.closePath();
  ctx.fill();

  // hochgezogene Schultern – er hält den Kopf geduckt zwischen ihnen
  ctx.fillStyle = skin;
  ellipse(ctx, -78, -392, 54, 38);
  ellipse(ctx, 78, -392, 54, 38);

  // großer Kopf, nach vorn und unten gestreckt
  ctx.save();
  ctx.translate(look * 0.6, -440 + breathe);
  ctx.rotate(Math.sin(t * 1.3) * 0.08);
  for (const side of [-1, 1]) {
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(side * 95, -30);
    ctx.quadraticCurveTo(side * 200, -95, side * 225, -50);
    ctx.quadraticCurveTo(side * 175, 0, side * 100, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c4a99a';
    ellipse(ctx, side * 150, -40, 30, 12);
  }
  const head = ctx.createRadialGradient(-30, -50, 20, 0, 0, 140);
  head.addColorStop(0, '#e2dfc6');
  head.addColorStop(1, shade);
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.ellipse(0, 0, 125, 112, 0, 0, TAU);
  ctx.fill();
  // eingefallene Wangen und spitzes Kinn
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-70, 50);
  ctx.quadraticCurveTo(0, 140, 70, 50);
  ctx.closePath();
  ctx.fill();

  // riesige, glänzende Augen
  for (const side of [-1, 1]) {
    ctx.fillStyle = deep;
    ellipse(ctx, side * 50, -14, 50, 52);
    ctx.fillStyle = '#eef3e2';
    ellipse(ctx, side * 50, -10, 44, 47);
    ctx.fillStyle = '#6f9fb8';
    blob(ctx, side * 50 + look * 0.3, -6, 31);
    ctx.fillStyle = '#0f1a1f';
    blob(ctx, side * 50 + look * 0.3, -6, 18);
    ctx.fillStyle = '#ffffff';
    blob(ctx, side * 42 + look * 0.3, -18, 8);
    blob(ctx, side * 58 + look * 0.3, 4, 4);
    if (s.night > 0.05) s.lights?.add(ctx, side * 50, -6, 26, 'window', 0, '170,220,240');
  }
  // kleine Nase, schmaler Mund mit zwei Zähnen
  ctx.fillStyle = shade;
  ellipse(ctx, 0, 34, 14, 9);
  ctx.strokeStyle = '#3d3a2c';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-36, 66);
  ctx.quadraticCurveTo(0, 78, 36, 66);
  ctx.stroke();
  ctx.fillStyle = '#f2ecd2';
  ctx.fillRect(-13, 68, 9, 14);
  ctx.fillRect(5, 68, 9, 14);
  // ein paar dünne Haarsträhnen
  ctx.strokeStyle = '#3a3426';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (const hx of [-45, -12, 22, 50]) {
    ctx.moveTo(hx, -100);
    ctx.quadraticCurveTo(hx + 25, -135, hx + 8 + Math.sin(t * 3 + hx) * 14, -165);
  }
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/* ---------- Leute an der Neon Coast ---------- */

function coastPeople(
  kind: 'gangster' | 'lady',
  variant: number,
  s: SpriteContext,
): { look: Look; pose: Pose } {
  const accent = rgba(variant % 2 ? s.accentA : s.accentB);
  if (kind === 'gangster') {
    const list: { look: Look; pose: Pose }[] = [
      {
        pose: 'aim',
        look: {
          skin: '#b07650',
          hair: '#16100c',
          hairStyle: 'short',
          top: '#2a2438',
          bottom: '#2a2438',
          outfit: 'pants',
          suit: true,
          feet: 'shoes',
          hat: { kind: 'fedora', color: '#f2efe8' },
          shades: true,
        },
      },
      {
        pose: 'gunUp',
        look: {
          skin: '#6e4630',
          hair: '#0e0a08',
          hairStyle: 'short',
          top: '#151218',
          sleeve: '#6e4630',
          bottom: '#4b4b55',
          outfit: 'pants',
          feet: 'shoes',
          shoes: '#f4f4f4',
          hat: { kind: 'cap', color: accent },
          shades: true,
          chain: true,
        },
      },
      {
        pose: 'crossed',
        look: {
          skin: '#c68a5e',
          hair: '#1b1410',
          hairStyle: 'short',
          top: '#1f1c2a',
          bottom: '#1f1c2a',
          outfit: 'pants',
          suit: true,
          feet: 'shoes',
          hat: { kind: 'fedora', color: '#232030' },
          shades: true,
        },
      },
      {
        pose: 'peace',
        look: {
          skin: '#8d5a3b',
          hair: '#120c0a',
          hairStyle: 'short',
          top: '#f4f4f4',
          sleeve: '#8d5a3b',
          bottom: '#3b5aa0',
          outfit: 'pants',
          feet: 'shoes',
          shoes: '#f4f4f4',
          hat: { kind: 'bandana', color: '#c0392b' },
          shades: true,
          chain: true,
        },
      },
      {
        pose: 'phone',
        look: {
          skin: '#e2b48f',
          hair: '#2a1d16',
          hairStyle: 'short',
          top: accent,
          bottom: '#e8dcc0',
          outfit: 'shorts',
          feet: 'shoes',
          shoes: '#f4f4f4',
          hat: { kind: 'cap', color: '#1c1a24' },
          shades: true,
          chain: true,
        },
      },
    ];
    return list[variant % list.length];
  }
  const list: { look: Look; pose: Pose }[] = [
    {
      pose: 'wave',
      look: {
        skin: '#f0c7a4',
        hair: '#e9c46a',
        hairStyle: 'long',
        top: accent,
        sleeve: '#f0c7a4',
        bottom: accent,
        outfit: 'dress',
        feet: 'shoes',
        shoes: '#f4f4f4',
        shades: true,
      },
    },
    {
      pose: 'both',
      look: {
        skin: '#c98b62',
        hair: '#5a2e1a',
        hairStyle: 'ponytail',
        top: '#ffffff',
        sleeve: '#c98b62',
        bottom: '#2d6cdf',
        outfit: 'shorts',
        crop: true,
        feet: 'skates',
        shoes: accent,
      },
    },
    {
      pose: 'hips',
      look: {
        skin: '#7a4a2e',
        hair: '#24150e',
        hairStyle: 'afro',
        top: '#d7263d',
        sleeve: '#7a4a2e',
        bottom: '#d7263d',
        outfit: 'dress',
        feet: 'shoes',
        shoes: '#f2c94c',
        shades: true,
      },
    },
  ];
  return list[variant % list.length];
}

/** Pistole im Griff an der Hand; angle 0 = Lauf zeigt nach rechts */
function pistol(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#18171d';
  ctx.beginPath();
  ctx.roundRect(-20, -62, 190, 46, 8);
  ctx.fill();
  ctx.save();
  ctx.rotate(0.25);
  ctx.beginPath();
  ctx.roundRect(-22, -30, 54, 100, 10);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#18171d';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(52, -8, 22, 0, Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#5a5a66';
  ctx.fillRect(0, -58, 160, 8);
  ctx.restore();
}

function coastPerson(
  ctx: CanvasRenderingContext2D,
  kind: 'gangster' | 'lady',
  variant: number,
  s: SpriteContext,
  offset: number,
): void {
  const { look, pose: p } = coastPeople(kind, variant, s);
  const t = s.motion ? s.time + variant * 1.3 : 0;
  ctx.save();
  // Bewaffnete zeigen mit dem Arm von der Straße weg, nicht auf den Fahrer
  if ((p === 'aim' || p === 'gunUp') && offset < 0) ctx.scale(-1, 1);
  // Rollschuhfahrerin gleitet hin und her, alle anderen wippen zum Beat
  if (look.feet === 'skates') ctx.translate(Math.sin(t * 1.4) * 260, 0);
  ctx.translate(0, -Math.abs(Math.sin(t * 3.5)) * 18);
  const arms = pose(p, t);
  person(ctx, look, arms, t);
  if (p === 'aim') pistol(ctx, arms.right[1][0] - 10, arms.right[1][1] + 10, -0.2);
  if (p === 'gunUp') pistol(ctx, arms.right[1][0] + 10, arms.right[1][1] + 20, -Math.PI / 2 + 0.15);
  if (p === 'phone') {
    ctx.fillStyle = '#111';
    ctx.fillRect(80, -1000, 40, 95);
  }
  if (kind === 'lady' && p === 'wave') {
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath();
    ctx.roundRect(-230, -500, 130, 110, 20);
    ctx.fill();
  }
  ctx.restore();
}

/* ======================= Kulisse im Grünen ======================= */

function haystack(ctx: CanvasRenderingContext2D): void {
  shadow(ctx, 800, 90);
  ctx.fillStyle = '#d9b04a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 700, 950, 0, Math.PI, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,100,30,0.45)';
  ctx.lineWidth = 22;
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    ctx.moveTo(i * 160, -40);
    ctx.quadraticCurveTo(i * 120, -500, i * 50, -880);
  }
  ctx.stroke();
  ctx.fillStyle = '#ecc965';
  ctx.beginPath();
  ctx.ellipse(-180, -500, 250, 380, -0.2, 0, TAU);
  ctx.fill();
}

function pumpkins(ctx: CanvasRenderingContext2D, variant: number): void {
  shadow(ctx, 650, 60);
  const items: [number, number][] = [
    [-330, 230],
    [120, 300],
    [470, 190],
  ];
  items.slice(0, 2 + (variant % 2)).forEach(([x, r]) => {
    ctx.fillStyle = '#e07a1f';
    ellipse(ctx, x, -r * 0.8, r * 1.15, r * 0.8);
    ctx.strokeStyle = 'rgba(120,50,0,0.4)';
    ctx.lineWidth = 16;
    ctx.beginPath();
    for (const k of [-0.5, 0, 0.5]) {
      ctx.moveTo(x + k * r, -r * 1.55);
      ctx.quadraticCurveTo(x + k * r * 1.6, -r * 0.8, x + k * r, -r * 0.05);
    }
    ctx.stroke();
    ctx.fillStyle = '#4f6b2a';
    ctx.fillRect(x - 18, -r * 1.85, 36, r * 0.4);
  });
}

function well(ctx: CanvasRenderingContext2D): void {
  shadow(ctx, 600, 70);
  ctx.fillStyle = '#9a9286';
  ctx.fillRect(-450, -520, 900, 520);
  ctx.strokeStyle = 'rgba(60,55,50,0.35)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  for (const y of [-130, -260, -390]) {
    ctx.moveTo(-450, y);
    ctx.lineTo(450, y);
  }
  ctx.stroke();
  ctx.fillStyle = '#b4ab9e';
  ellipse(ctx, 0, -520, 450, 90);
  ctx.fillStyle = '#2b2b33';
  ellipse(ctx, 0, -520, 350, 60);
  ctx.fillStyle = '#6b4c2e';
  ctx.fillRect(-430, -1400, 70, 880);
  ctx.fillRect(360, -1400, 70, 880);
  ctx.fillStyle = '#9b3c2c';
  ctx.beginPath();
  ctx.moveTo(-620, -1300);
  ctx.lineTo(0, -1650);
  ctx.lineTo(620, -1300);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3b2a1a';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, -1300);
  ctx.lineTo(0, -900);
  ctx.stroke();
  ctx.fillStyle = '#7a5532';
  ctx.fillRect(-80, -900, 160, 140);
}

function stall(ctx: CanvasRenderingContext2D, variant: number, s: SpriteContext): void {
  shadow(ctx, 900, 80);
  ctx.fillStyle = '#6b4c2e';
  ctx.fillRect(-760, -1700, 60, 1700);
  ctx.fillRect(700, -1700, 60, 1700);
  ctx.fillStyle = '#8a5a2e';
  ctx.fillRect(-800, -720, 1600, 90);
  ctx.fillRect(-760, -630, 1520, 630);
  // Ware
  const goods = ['#d63a2f', '#f2c94c', '#6aa84f', '#e07a1f', '#8e44ad'];
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = goods[(i + variant) % goods.length];
    blob(ctx, -660 + i * 145, -770, 70);
  }
  // gestreiftes Vordach
  const stripe = variant % 2 ? '#2f6b3a' : '#c0392b';
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#f6efe0' : stripe;
    ctx.beginPath();
    ctx.moveTo(-850 + i * 212.5, -1700);
    ctx.lineTo(-850 + (i + 1) * 212.5, -1700);
    ctx.lineTo(-850 + (i + 1) * 212.5, -1460);
    ctx.quadraticCurveTo(-850 + (i + 0.5) * 212.5, -1380, -850 + i * 212.5, -1460);
    ctx.closePath();
    ctx.fill();
  }
  stringLights(ctx, s.lights, s.night, -840, -1450, 840, -1450, 40, 10, 26, variant * 7 + 1);
}

function laundry(ctx: CanvasRenderingContext2D, s: SpriteContext): void {
  ctx.fillStyle = '#6b4c2e';
  ctx.fillRect(-720, -1300, 50, 1300);
  ctx.fillRect(670, -1300, 50, 1300);
  ctx.strokeStyle = '#d9d2c0';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(-695, -1250);
  ctx.quadraticCurveTo(0, -1120, 695, -1250);
  ctx.stroke();
  const clothes = ['#c0392b', '#f6efe0', '#3f5f8a', '#d9a441', '#5c7d3a'];
  for (let i = 0; i < 5; i++) {
    const x = -500 + i * 250;
    const y = -1215 + Math.sin((i / 4) * Math.PI) * 60;
    const sway = s.motion ? Math.sin(s.time * 3 + i) * 0.12 : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway);
    ctx.fillStyle = clothes[i];
    if (i % 2) {
      ctx.fillRect(-90, 0, 180, 300);
    } else {
      ctx.beginPath();
      ctx.moveTo(-110, 0);
      ctx.lineTo(110, 0);
      ctx.lineTo(80, 260);
      ctx.lineTo(-80, 260);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-160, 0, 320, 70);
    }
    ctx.restore();
  }
}

function sheep(ctx: CanvasRenderingContext2D, variant: number, s: SpriteContext): void {
  const nibble = s.motion ? Math.max(0, Math.sin(s.time * 1.5 + variant)) * 80 : 0;
  const dir = variant % 2 ? 1 : -1;
  shadow(ctx, 450, 60);
  ctx.fillStyle = '#2b2622';
  for (const lx of [-250, -120, 150, 260]) ctx.fillRect(lx - 25, -260, 50, 260);
  ctx.fillStyle = '#f4f1ea';
  for (const [bx, by, br] of [
    [-200, -420, 190],
    [0, -470, 220],
    [200, -420, 190],
    [-80, -330, 170],
    [110, -330, 170],
  ])
    blob(ctx, bx, by, br);
  ctx.fillStyle = '#2b2622';
  ellipse(ctx, dir * 360, -460 + nibble, 110, 140);
  ellipse(ctx, dir * 300, -540 + nibble, 70, 35);
  ctx.fillStyle = '#fff';
  blob(ctx, dir * 330, -500 + nibble, 16);
}

/** Laternenpfahl, dessen Ausleger zur Straße zeigt */
function lantern(ctx: CanvasRenderingContext2D, s: SpriteContext, offset: number): void {
  ctx.save();
  if (offset > 0) ctx.scale(-1, 1);
  ctx.fillStyle = '#5b3b22';
  ctx.fillRect(-35, -1450, 70, 1450);
  ctx.fillRect(-35, -1450, 300, 40);
  ctx.strokeStyle = '#3b2a1a';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(220, -1410);
  ctx.lineTo(220, -1340);
  ctx.moveTo(-20, -1300);
  ctx.lineTo(160, -1430);
  ctx.stroke();
  ctx.fillStyle = '#2d2620';
  ctx.fillRect(160, -1340, 120, 30);
  ctx.fillStyle = s.night > 0.05 ? '#ffe6a3' : '#ffd36a';
  ctx.fillRect(170, -1310, 100, 150);
  ctx.fillStyle = '#2d2620';
  ctx.fillRect(160, -1165, 120, 25);
  if (s.lights) {
    s.lights.add(ctx, 220, -1235, 150, 'lamp');
    // warmer Lichtkegel auf Weg und Wiese darunter
    s.lights.add(ctx, 220, -60, 360, 'window');
  }
  ctx.restore();
}

/** kleines Lagerfeuer mit Steinkreis, Holzscheiten und einem Baumstamm zum Sitzen */
function campfire(
  ctx: CanvasRenderingContext2D,
  variant: number,
  s: SpriteContext,
  offset: number,
): void {
  const t = s.motion ? s.time + variant : 0;
  // der Sitzstamm liegt auf der straßenabgewandten Seite
  const away = offset > 0 ? 1 : -1;

  // Sitzstamm
  ctx.save();
  ctx.scale(away, 1);
  ctx.fillStyle = '#6b4a2b';
  ctx.beginPath();
  ctx.roundRect(380, -170, 620, 170, 80);
  ctx.fill();
  ctx.fillStyle = '#c9a26b';
  ellipse(ctx, 990, -85, 60, 82);
  ctx.restore();

  // Steinkreis hinten, Holz, Flammen, Steinkreis vorn
  const stones = (front: boolean) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      if (Math.sin(a) > 0 !== front) continue;
      ctx.fillStyle = i % 2 ? '#8d8a84' : '#a6a29b';
      ellipse(ctx, Math.cos(a) * 330, -50 + Math.sin(a) * 90, 85, 55);
    }
  };
  stones(false);
  ctx.fillStyle = '#5a3a1e';
  ctx.save();
  ctx.translate(0, -80);
  for (const r of [-0.35, 0.35, 0]) {
    ctx.save();
    ctx.rotate(r);
    ctx.beginPath();
    ctx.roundRect(-260, -38, 520, 76, 36);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  const flames: [string, number, number][] = [
    ['#ff6a1a', 230, 560],
    ['#ffad2e', 160, 430],
    ['#fff0a0', 85, 270],
  ];
  flames.forEach(([color, w, h], k) => {
    const height = h * (0.85 + 0.15 * Math.sin(t * 13 + k * 2.1));
    const tip = Math.sin(t * 9 + k) * 45;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-w, -90);
    ctx.quadraticCurveTo(-w * 1.05, -90 - height * 0.55, tip, -90 - height);
    ctx.quadraticCurveTo(w * 1.05, -90 - height * 0.55, w, -90);
    ctx.closePath();
    ctx.fill();
  });

  // Funken steigen auf
  const alpha = ctx.globalAlpha;
  for (let i = 0; i < 7; i++) {
    const p = (t * 0.7 + i / 7) % 1;
    ctx.globalAlpha = alpha * (1 - p);
    ctx.fillStyle = '#ffd36a';
    blob(ctx, Math.sin(i * 2.3 + p * 6) * 120, -500 - p * 900, 16);
  }
  // tagsüber steigt Rauch auf
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.3 + i / 3) % 1;
    ctx.globalAlpha = alpha * 0.35 * (1 - p) * (1 - s.night);
    ctx.fillStyle = '#d8d8d4';
    blob(ctx, Math.sin(p * 4) * 80, -700 - p * 900, 90 + p * 160);
  }
  ctx.globalAlpha = alpha;
  stones(true);

  if (s.lights) {
    const flicker = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 7);
    s.lights.add(ctx, 0, -260, 190 * flicker, 'lamp', variant + 1);
    s.lights.add(ctx, 0, -40, 520 * flicker, 'window');
  }
}

/* ======================= Kulisse an der Neon Coast ======================= */

const CAR_COLORS = ['#ff3f8e', '#3fe0ff', '#f5f5f5', '#ffcf3f', '#8a5cff', '#2ecc71'];

/** geparkter Lowrider von hinten, manche hüpfen auf ihrer Hydraulik */
function car(ctx: CanvasRenderingContext2D, variant: number, s: SpriteContext): void {
  const color = CAR_COLORS[variant % CAR_COLORS.length];
  const hop =
    variant % 3 === 0 && s.motion ? Math.max(0, Math.sin(s.time * 3 + variant)) ** 3 * 260 : 0;
  shadow(ctx, 1000, 90);
  // Unterbodenleuchten
  const glow = rgba(variant % 2 ? s.accentA : s.accentB, 0.35 + 0.4 * s.night);
  ctx.fillStyle = glow;
  ellipse(ctx, 0, -40, 950, 70 + hop * 0.2);

  ctx.fillStyle = '#0c0a10';
  ctx.beginPath();
  ctx.roundRect(-820, -260, 260, 260, 60);
  ctx.roundRect(560, -260, 260, 260, 60);
  ctx.fill();

  ctx.save();
  ctx.translate(0, -hop);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-920, -640, 1840, 420, 90);
  ctx.fill();
  ctx.fillStyle = mixHex(color, '#000000', 0.25);
  ctx.beginPath();
  ctx.moveTo(-640, -640);
  ctx.lineTo(-500, -940);
  ctx.lineTo(500, -940);
  ctx.lineTo(640, -640);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a1626';
  ctx.beginPath();
  ctx.moveTo(-560, -660);
  ctx.lineTo(-460, -900);
  ctx.lineTo(460, -900);
  ctx.lineTo(560, -660);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d9dde6';
  ctx.fillRect(-940, -300, 1880, 70);
  ctx.shadowColor = '#ff2a4a';
  ctx.shadowBlur = 14 + 22 * s.night;
  ctx.fillStyle = '#ff3355';
  ctx.fillRect(-860, -560, 260, 80);
  ctx.fillRect(600, -560, 260, 80);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ece6d6';
  ctx.fillRect(-180, -480, 360, 120);
  ctx.restore();
}

function motel(ctx: CanvasRenderingContext2D, variant: number, s: SpriteContext): void {
  const accent = variant % 2 ? s.accentA : s.accentB;
  ctx.fillStyle = '#0e0718';
  ctx.fillRect(-60, -2200, 120, 2200);
  ctx.fillStyle = '#1a0d2c';
  ctx.beginPath();
  ctx.roundRect(-700, -3400, 1400, 1200, 120);
  ctx.fill();
  ctx.shadowColor = rgba(accent);
  ctx.shadowBlur = 16 + 32 * s.night;
  ctx.strokeStyle = rgba(accent, 0.75 + 0.25 * s.night);
  ctx.lineWidth = 40;
  ctx.beginPath();
  ctx.roundRect(-640, -3340, 1280, 1080, 90);
  ctx.stroke();
  ctx.fillStyle = rgba(mixRGB(accent, [255, 255, 255], 0.45));
  ctx.font = '420px Monoton, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MOTEL', 0, -2950, 1150);
  // blinkender Pfeil
  const on = Math.floor(s.time * 3) % 2 === 0;
  ctx.fillStyle = on ? '#ffe36a' : 'rgba(255,227,106,0.25)';
  ctx.shadowColor = '#ffe36a';
  ctx.font = '300px sans-serif';
  ctx.fillText(variant % 2 ? '◀ VACANCY' : 'VACANCY ▶', 0, -2500, 1150);
  ctx.shadowBlur = 0;
}

function umbrella(ctx: CanvasRenderingContext2D, variant: number, s: SpriteContext): void {
  const accent = rgba(variant % 2 ? s.accentA : s.accentB);
  // Liegestuhl
  ctx.strokeStyle = '#d9d2c0';
  ctx.lineWidth = 30;
  ctx.beginPath();
  ctx.moveTo(-500, 0);
  ctx.lineTo(-300, -300);
  ctx.lineTo(300, -300);
  ctx.lineTo(500, -700);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-320, -320);
  ctx.lineTo(300, -320);
  ctx.lineTo(480, -700);
  ctx.lineTo(420, -720);
  ctx.lineTo(260, -380);
  ctx.lineTo(-300, -380);
  ctx.closePath();
  ctx.fill();
  // Schirm
  ctx.fillStyle = '#d9d2c0';
  ctx.fillRect(-25, -1500, 50, 1500);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#f6efe0' : accent;
    ctx.beginPath();
    ctx.moveTo(0, -1600);
    ctx.lineTo(-900 + i * 300, -1250);
    ctx.lineTo(-900 + (i + 1) * 300, -1250);
    ctx.closePath();
    ctx.fill();
  }
}

function hydrant(ctx: CanvasRenderingContext2D): void {
  shadow(ctx, 200, 30);
  ctx.fillStyle = '#d7263d';
  ctx.beginPath();
  ctx.roundRect(-110, -500, 220, 500, 40);
  ctx.fill();
  ellipse(ctx, 0, -500, 130, 90);
  ctx.fillRect(-190, -360, 380, 90);
  ctx.fillStyle = '#ffd36a';
  ctx.fillRect(-130, -110, 260, 50);
}

function phonebooth(ctx: CanvasRenderingContext2D, s: SpriteContext): void {
  shadow(ctx, 450, 50);
  ctx.fillStyle = '#1b1530';
  ctx.fillRect(-400, -2100, 800, 2100);
  ctx.fillStyle = `rgba(160,240,255,${0.35 + 0.45 * s.night})`;
  ctx.shadowColor = '#9ef0ff';
  ctx.shadowBlur = 10 + 30 * s.night;
  ctx.fillRect(-330, -1750, 660, 1600);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f6efe0';
  ctx.fillRect(-330, -2030, 660, 200);
  ctx.fillStyle = '#1b1530';
  ctx.font = 'bold 140px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PHONE', 0, -1930, 600);
  ctx.fillStyle = '#2a2436';
  ctx.fillRect(-120, -1300, 240, 360);
}

/* ------------------------------------------------------------------ */

/** zeichnet die zusätzlichen Randobjekte; Rückgabe false = unbekannte Art */
export function paintExtra(
  ctx: CanvasRenderingContext2D,
  sprite: RoadSprite,
  s: SpriteContext,
): boolean {
  const v = sprite.variant;
  switch (sprite.kind) {
    case 'hobbit':
      hobbit(ctx, v, s);
      return true;
    case 'pub':
      pub(ctx, v, s);
      return true;
    case 'horse':
      horse(ctx, v, s);
      return true;
    case 'gollum':
      creature(ctx, sprite, s);
      return true;
    case 'campfire':
      campfire(ctx, v, s, sprite.offset);
      return true;
    case 'scarecrow':
      scarecrow(ctx, s);
      return true;
    case 'gangster':
    case 'lady':
      coastPerson(ctx, sprite.kind, v, s, sprite.offset);
      return true;
    case 'haystack':
      haystack(ctx);
      return true;
    case 'pumpkins':
      pumpkins(ctx, v);
      return true;
    case 'well':
      well(ctx);
      return true;
    case 'stall':
      stall(ctx, v, s);
      return true;
    case 'laundry':
      laundry(ctx, s);
      return true;
    case 'sheep':
      sheep(ctx, v, s);
      return true;
    case 'lantern':
      lantern(ctx, s, sprite.offset);
      return true;
    case 'car':
      car(ctx, v, s);
      return true;
    case 'motel':
      motel(ctx, v, s);
      return true;
    case 'umbrella':
      umbrella(ctx, v, s);
      return true;
    case 'hydrant':
      hydrant(ctx);
      return true;
    case 'phonebooth':
      phonebooth(ctx, s);
      return true;
    default:
      return paintBuilding(ctx, sprite, s);
  }
}

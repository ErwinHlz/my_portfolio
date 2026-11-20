export const forestImages = {
  oak: '/assets/background/services-forest-full.webp',
  spruce: '/assets/background/services-forest-spruce.webp',
  bilberry: '/assets/background/services-forest-bilberry.webp',
  hazel: '/assets/background/services-forest-hazel.webp',
  birch: '/assets/background/services-forest-birch.webp',
};
export type ForestSprite = keyof typeof forestImages;

export interface ForestPalette {
  sky: string;
  mist: string;
  ground: string;
  groundShade: string;
  path: string;
  pathShade: string;
  foliage: string;
  fern: string;
  mushroom: string;
  petals: string;
  lanternFrame: string;
  lanternRim: string;
  lanternGlass: string;
  lanternGlow: string;
  treeOpacity: number;
}

function randomFromSeed(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function bend(depth: number) {
  return Math.sin(depth * 0.16) * 1.7 + Math.sin(depth * 0.067) * 1.1;
}

const random = randomFromSeed(3017);
const oaks = Array.from({ length: 90 }, (_, index) => {
  const side = index % 2 === 0 ? -1 : 1;
  const depth = 4 + index * 1.06 + random() * 2.5;
  return {
    kind: 'oak' as const,
    depth,
    side,
    x: bend(depth) + side * (2.05 + random() * 8.1),
    height: 4.1 + random() * 4.2,
    width: 0.66 + random() * 0.34,
  };
});

const scatter = randomFromSeed(8421);
const mixedTrees = Array.from({ length: 62 }, (_, index) => {
  const side = index % 2 === 0 ? -1 : 1;
  const depth = 4.5 + index * 1.43 + scatter() * 3;
  const spruce = index % 5 < 3;
  return {
    kind: spruce ? ('spruce' as const) : ('birch' as const),
    depth,
    side,
    x: bend(depth) + side * (4.5 + scatter() * 8.7),
    height: spruce ? 5.8 + scatter() * 3.1 : 4.8 + scatter() * 2.8,
    width: spruce ? 0.51 + scatter() * 0.13 : 0.67 + scatter() * 0.18,
  };
});

const shrubs = Array.from({ length: 74 }, (_, index) => {
  const side = index % 2 === 0 ? -1 : 1;
  const depth = 2.8 + index * 0.86 + scatter() * 1.9;
  const hazel = index % 3 === 1;
  return {
    kind: hazel ? ('hazel' as const) : ('bilberry' as const),
    depth,
    side,
    x: bend(depth) + side * (2.25 + scatter() * 4.3),
    height: 0.5 + scatter() * 0.58,
    width: (hazel ? 1.65 : 1.4) + scatter() * 0.35,
  };
});

const lanterns = Array.from({ length: 12 }, (_, index) => {
  const side = index % 2 === 0 ? -1 : 1;
  const depth = 3.9 + index * 5.05 + scatter() * 1.3;
  return {
    kind: 'lantern' as const,
    depth,
    side,
    x: bend(depth) + side * (1.62 + scatter() * 0.28),
    height: 1.32 + scatter() * 0.18,
  };
});

const entrance = [
  { kind: 'spruce', depth: 11.2, side: -1, x: -4.42, height: 6.25, width: 0.54, edge: true },
  { kind: 'birch', depth: 7.85, side: -1, x: -3.22, height: 5.35, width: 0.67, edge: true },
  { kind: 'spruce', depth: 5.5, side: -1, x: -4.45, height: 4.8, width: 0.53, edge: true },
  { kind: 'bilberry', depth: 5.3, side: -1, x: -1.85, height: 0.62, width: 1.5 },
  { kind: 'hazel', depth: 3.9, side: -1, x: -2.85, height: 1.02, width: 1.65 },
  { kind: 'bilberry', depth: 3.2, side: -1, x: -4, height: 0.87, width: 1.54 },
  { kind: 'lantern', depth: 3.1, side: -1, x: -2.72, height: 1.02 },
  { kind: 'bilberry', depth: 2.8, side: -1, x: -2.05, height: 0.67, width: 1.62 },
] as const;

const woodland = [...oaks, ...mixedTrees, ...shrubs, ...lanterns, ...entrance].sort(
  (a, b) => b.depth - a.depth,
);

function makeProjection(width: number, height: number, travel: number) {
  const focal = Math.min(height * 0.87, width * 1.02);
  const cameraX = bend(travel + 2);
  return (x: number, depth: number) => {
    const scale = focal / (depth + 0.9);
    return { x: width / 2 + (x - cameraX) * scale, y: height * 0.57 + 1.62 * scale, scale };
  };
}

const brush = Array.from({ length: 560 }, () => {
  const depth = random() * 94;
  return { depth, x: bend(depth) + (random() - 0.5) * 22, size: 0.07 + random() * 0.32 };
});

const gravel = Array.from({ length: 480 }, () => {
  const depth = random() * 94;
  return { depth, x: bend(depth) + (random() - 0.5) * 2.8, size: 0.014 + random() * 0.037 };
});

const understory = Array.from({ length: 136 }, (_, index) => {
  const depth = 2 + index * 0.57;
  const side = index % 2 === 0 ? -1 : 1;
  return {
    depth,
    x: bend(depth) + side * (1.5 + random() * 4.7),
    size: 0.17 + random() * 0.36,
    kind: index % 4,
    side,
  };
});

function fern(ctx: CanvasRenderingContext2D, size: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.65, size * 0.045);
  ctx.beginPath();
  for (const angle of [-0.62, -0.28, 0.1, 0.54]) {
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(0, -size * 0.47, size * angle, -size * (0.95 - Math.abs(angle) * 0.32));
    for (const tier of [0.36, 0.55, 0.72, 0.86]) {
      const x = size * angle * tier ** 2;
      const y = -size * tier * (0.95 - Math.abs(angle) * 0.32);
      const leaf = size * (1 - tier) * 0.24;
      ctx.moveTo(x - leaf, y - leaf * 0.6);
      ctx.quadraticCurveTo(x - leaf * 0.4, y - leaf, x, y);
      ctx.quadraticCurveTo(x + leaf * 0.42, y - leaf, x + leaf, y - leaf * 0.6);
    }
  }
  ctx.stroke();
}

function mushrooms(ctx: CanvasRenderingContext2D, size: number, cap: string, stem: string) {
  for (const [offset, scale] of [
    [-0.22, 0.67],
    [0.13, 1],
    [0.42, 0.49],
  ] as const) {
    const x = size * offset;
    const height = size * scale * 0.58;
    ctx.fillStyle = stem;
    ctx.fillRect(x - height * 0.09, -height * 0.78, height * 0.18, height * 0.78);
    ctx.beginPath();
    ctx.ellipse(x, -height * 0.76, height * 0.49, height * 0.31, 0, Math.PI, 2 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = cap;
    ctx.fill();
    ctx.fillStyle = stem;
    ctx.fillRect(x - height * 0.22, -height * 0.94, height * 0.12, height * 0.08);
    ctx.fillRect(x + height * 0.08, -height, height * 0.1, height * 0.075);
  }
}

function flowers(ctx: CanvasRenderingContext2D, size: number, color: string, stem: string) {
  ctx.strokeStyle = stem;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(0.5, size * 0.045);
  for (const [x, height] of [
    [-0.29, 0.51],
    [0.04, 0.78],
    [0.32, 0.62],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(0, -size * 0.35, x * size, -height * size);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x * size, -height * size, size * 0.074, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintLantern(ctx: CanvasRenderingContext2D, palette: ForestPalette) {
  const lampX = 0.25;
  const lampY = -0.67;

  ctx.save();
  ctx.translate(lampX, 0);
  ctx.scale(1, 0.27);
  const spill = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.48);
  spill.addColorStop(0, `rgb(${palette.lanternGlow} / 0.26)`);
  spill.addColorStop(1, `rgb(${palette.lanternGlow} / 0)`);
  ctx.fillStyle = spill;
  ctx.fillRect(-0.48, -0.48, 0.96, 0.96);
  ctx.restore();

  const halo = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, 0.43);
  halo.addColorStop(0, `rgb(${palette.lanternGlow} / 0.68)`);
  halo.addColorStop(0.32, `rgb(${palette.lanternGlow} / 0.24)`);
  halo.addColorStop(1, `rgb(${palette.lanternGlow} / 0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(lampX - 0.43, lampY - 0.43, 0.86, 0.86);

  ctx.strokeStyle = palette.lanternFrame;
  ctx.fillStyle = palette.lanternFrame;
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.037;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -0.87);
  ctx.bezierCurveTo(0, -1.04, lampX, -1.04, lampX, -0.88);
  ctx.stroke();
  ctx.fillRect(-0.036, -0.14, 0.072, 0.14);
  ctx.fillRect(-0.05, -0.033, 0.1, 0.033);

  ctx.strokeStyle = palette.lanternRim;
  ctx.lineWidth = 0.008;
  ctx.beginPath();
  ctx.moveTo(0.01, -0.14);
  ctx.lineTo(0.01, -0.86);
  ctx.quadraticCurveTo(0.022, -0.962, 0.14, -0.966);
  ctx.stroke();

  ctx.translate(lampX, lampY);
  const glass = ctx.createRadialGradient(0, 0.025, 0, 0, 0.025, 0.12);
  glass.addColorStop(0, palette.lanternGlass);
  glass.addColorStop(0.55, `rgb(${palette.lanternGlow})`);
  glass.addColorStop(1, palette.lanternRim);
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-0.08, -0.096);
  ctx.lineTo(0.08, -0.096);
  ctx.lineTo(0.062, 0.108);
  ctx.lineTo(-0.062, 0.108);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = palette.lanternFrame;
  ctx.lineWidth = 0.015;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.029, -0.094);
  ctx.lineTo(0.019, 0.108);
  ctx.stroke();

  ctx.fillStyle = palette.lanternFrame;
  ctx.beginPath();
  ctx.moveTo(-0.101, -0.09);
  ctx.lineTo(-0.039, -0.143);
  ctx.quadraticCurveTo(0, -0.185, 0.039, -0.143);
  ctx.lineTo(0.101, -0.09);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-0.077, 0.106, 0.154, 0.025);
  ctx.fillRect(-0.043, 0.131, 0.086, 0.014);
  ctx.fillRect(-0.009, -0.211, 0.018, 0.055);
  ctx.fillStyle = palette.lanternRim;
  ctx.fillRect(-0.095, -0.097, 0.19, 0.009);
  ctx.fillRect(-0.073, 0.112, 0.146, 0.006);
}

export function paintWoodland(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  palette: ForestPalette,
  sprites: ReadonlyMap<ForestSprite, HTMLImageElement>,
) {
  const travel = progress * 43;
  const midpoint = width / 2;
  const horizon = height * 0.57;
  const project = makeProjection(width, height, travel);

  const sky = ctx.createRadialGradient(
    midpoint,
    horizon * 0.82,
    0,
    midpoint,
    horizon,
    width * 0.64,
  );
  sky.addColorStop(0, palette.mist);
  sky.addColorStop(1, palette.sky);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const ground = ctx.createLinearGradient(0, horizon, 0, height);
  ground.addColorStop(0, 'transparent');
  ground.addColorStop(0.22, palette.ground);
  ground.addColorStop(1, palette.groundShade);
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, width, height - horizon);

  const path = ctx.createLinearGradient(0, horizon, 0, height);
  path.addColorStop(0, palette.mist);
  path.addColorStop(0.38, palette.path);
  path.addColorStop(1, palette.pathShade);
  ctx.beginPath();
  for (let step = 0; step <= 32; step++) {
    const depth = 0.4 + (step / 32) ** 2 * 78;
    const center = bend(travel + depth);
    const point = project(center - 1.2 - Math.sin(depth) * 0.035, depth);
    if (step === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  for (let step = 32; step >= 0; step--) {
    const depth = 0.4 + (step / 32) ** 2 * 78;
    const center = bend(travel + depth);
    const point = project(center + 1.2 + Math.cos(depth) * 0.04, depth);
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
  ctx.fillStyle = path;
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = palette.pathShade;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = palette.groundShade;
  for (const stone of gravel) {
    const depth = stone.depth - travel;
    if (depth < 1.6 || depth > 48) continue;
    const point = project(stone.x, depth);
    if (point.y > height || point.x < 0 || point.x > width) continue;

    const size = point.scale * stone.size;
    ctx.globalAlpha = Math.min(0.23, size * 0.12);
    ctx.fillRect(point.x, point.y, size, Math.max(0.3, size * 0.36));
  }
  ctx.strokeStyle = palette.foliage;
  ctx.lineCap = 'round';
  for (const tuft of brush) {
    const depth = tuft.depth - travel;
    if (depth < 1.6 || depth > 57 || Math.abs(tuft.x - bend(tuft.depth)) < 1.23) continue;
    const point = project(tuft.x, depth);
    if (point.x < -25 || point.x > width + 25 || point.y > height + 15) continue;
    const blade = Math.min(14, point.scale * tuft.size);
    ctx.globalAlpha = Math.min(0.45, point.scale * 0.01);
    ctx.lineWidth = Math.min(1.4, 0.3 + blade * 0.075);
    ctx.beginPath();
    for (const spread of [-0.55, -0.12, 0.49]) {
      ctx.moveTo(point.x, point.y);
      ctx.quadraticCurveTo(
        point.x + blade * spread * 0.32,
        point.y - blade * 0.6,
        point.x + blade * spread,
        point.y - blade * (1 - Math.abs(spread) * 0.56),
      );
    }
    ctx.stroke();
  }
  ctx.restore();

  for (const plant of understory) {
    const depth = plant.depth - travel;
    if (depth < 2.7 || depth > 50) continue;
    const point = project(plant.x, depth);
    if (point.x < -28 || point.x > width + 28 || point.y > height + 12) continue;

    const size = Math.min(36, point.scale * plant.size);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.scale(plant.side, 1);
    ctx.globalAlpha = Math.min(0.84, 0.3 + 9 / depth);
    if (plant.kind === 0) mushrooms(ctx, size, palette.mushroom, palette.petals);
    else if (plant.kind === 1) flowers(ctx, size, palette.petals, palette.fern);
    else fern(ctx, size, palette.fern);
    ctx.restore();
  }

  for (const object of woodland) {
    const depth = object.depth - travel;
    const shrub = object.kind === 'bilberry' || object.kind === 'hazel';
    const lantern = object.kind === 'lantern';
    // Shrubs stay in perspective until the near plane, normally well after leaving the frame.
    const near = shrub || lantern ? -0.82 : 3.2;
    if (depth < near || depth > 86) continue;

    const position = project(object.x, depth);
    const tall = position.scale * object.height;
    const top = position.y - tall;

    if (lantern) {
      if (position.x < -tall || position.x > width + tall || top - tall * 0.1 > height) continue;

      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.47 + 5.8 / Math.max(1, depth), (depth - near) / 0.65);
      ctx.translate(position.x, position.y);
      ctx.scale(-object.side * tall, tall);
      paintLantern(ctx, palette);
      ctx.restore();
      continue;
    }

    const sprite = sprites.get(object.kind);
    if (!sprite?.naturalWidth) continue;

    const wide = tall * object.width;
    const center = object.kind === 'oak' ? (object.side < 0 ? 0.34 : 0.66) : 0.5;
    const left = position.x - wide * center;
    if (left + wide < 0 || left > width || top > height || position.y < 0) continue;

    const edgeTree = 'edge' in object;
    const overshoot = edgeTree
      ? 0
      : Math.max(0, -left, left + wide - width, -top, position.y - height);
    const exitFade = edgeTree ? Math.min(1, (depth - near) / 1.2) : 1;
    const opacity = shrub
      ? Math.min(1, 0.4 + 8 / Math.max(1, depth)) * Math.min(1, palette.treeOpacity + 0.15)
      : Math.min(0.94, 0.23 + 11 / depth) *
        Math.max(0, 1 - overshoot / (tall * 0.18)) *
        palette.treeOpacity *
        exitFade;
    if (opacity <= 0) continue;

    ctx.save();
    ctx.globalAlpha = opacity;
    if (object.side > 0) {
      ctx.translate(left + wide, top);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, 0, wide, tall);
    } else {
      ctx.drawImage(sprite, left, top, wide, tall);
    }
    ctx.restore();
  }
}

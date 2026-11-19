function randomFromSeed(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, height: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + height * 0.14);
  ctx.lineTo(x, y - height);
  for (const tier of [0.42, 0.66, 0.88]) {
    const branchY = y - height * (1 - tier);
    const spread = height * tier * 0.37;
    ctx.moveTo(x - spread, branchY);
    ctx.lineTo(x, branchY - height * 0.24);
    ctx.lineTo(x + spread, branchY);
  }
  ctx.stroke();
}

function drawRidge(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width * 0.22, y - width * 0.33);
  ctx.lineTo(x + width * 0.34, y - width * 0.22);
  ctx.lineTo(x + width * 0.52, y - width * 0.57);
  ctx.lineTo(x + width * 0.68, y - width * 0.31);
  ctx.lineTo(x + width * 0.78, y - width * 0.38);
  ctx.lineTo(x + width, y);
  ctx.stroke();

  ctx.beginPath();
  for (let hatch = 1; hatch <= 5; hatch++) {
    const rise = hatch * width * 0.075;
    ctx.moveTo(x + width * 0.52 + rise * 0.63, y - width * 0.57 + rise);
    ctx.lineTo(x + width * 0.53 + rise * 0.74, y - width * 0.57 + rise * 1.2);
  }
  ctx.stroke();
}

function drawCompass(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.64, 0, 2 * Math.PI);
  ctx.stroke();
  for (let direction = 0; direction < 4; direction++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.21, 0);
    ctx.lineTo(0, radius * 0.16);
    ctx.lineTo(-radius * 0.21, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.21, 0);
    ctx.lineTo(0, 0);
    ctx.fill();
  }
  ctx.restore();
}

export function paintForestMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ink: string,
) {
  const random = randomFromSeed(7391);
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let fiber = 0; fiber < (width * height) / 38; fiber++) {
    ctx.globalAlpha = 0.025 + random() * 0.13;
    const x = random() * width;
    const y = random() * height;
    ctx.fillRect(x, y, 0.4 + random() * 1.5, 0.35 + random() * 0.6);
  }

  ctx.globalAlpha = 0.27;
  ctx.lineWidth = 0.65;
  for (let contour = 0; contour < 4; contour++) {
    const inset = 4 + contour * 3;
    ctx.beginPath();
    ctx.moveTo(inset, height * 0.06);
    ctx.bezierCurveTo(
      inset + width * 0.3,
      height * 0.26,
      inset - 7,
      height * 0.58,
      inset + width * 0.12,
      height * 0.69,
    );
    ctx.bezierCurveTo(
      inset + width * 0.31,
      height * 0.84,
      inset - 5,
      height * 0.87,
      inset + width * 0.16,
      height * 0.96,
    );
    ctx.stroke();
  }

  ctx.globalAlpha = 0.62;
  ctx.lineWidth = 0.85;
  const landscapeScale = Math.min(width / 130, height / 255);
  for (const [x, y, spread] of [
    [0.11, 0.25, 40],
    [0.59, 0.15, 42],
    [0.6, 0.48, 44],
    [0.49, 0.83, 43],
  ]) {
    drawRidge(ctx, x! * width, y! * height, spread! * landscapeScale);
  }

  for (const [x, y] of [
    [0.19, 0.4],
    [0.81, 0.33],
    [0.19, 0.61],
    [0.81, 0.7],
    [0.2, 0.83],
    [0.64, 0.94],
  ]) {
    for (let tree = 0; tree < 6; tree++) {
      const treeX = x! * width + (random() - 0.5) * width * 0.12;
      const treeY = y! * height + (random() - 0.5) * height * 0.045;
      drawTree(ctx, treeX, treeY, (7 + random() * 7) * landscapeScale);
    }
  }

  ctx.globalAlpha = 0.77;
  drawCompass(ctx, width * 0.79, height * 0.91, Math.min(width * 0.15, height * 0.07));
  ctx.restore();
}

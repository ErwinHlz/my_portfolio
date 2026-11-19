export type Vector = [number, number, number];
export type Rotation = [number, number, number, number];

export function trackballPoint(x: number, y: number): Vector {
  const distance = Math.hypot(x, y);
  const z = distance < Math.SQRT1_2 ? Math.sqrt(1 - distance ** 2) : 0.5 / distance;
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

export function rotationBetween([ax, ay, az]: Vector, [bx, by, bz]: Vector): Rotation {
  return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx, 1 + ax * bx + ay * by + az * bz];
}

export function combineRotations([x, y, z, w]: Rotation, [a, b, c, d]: Rotation): Rotation {
  const next: Rotation = [
    w * a + x * d + y * c - z * b,
    w * b - x * c + y * d + z * a,
    w * c + x * b - y * a + z * d,
    w * d - x * a - y * b - z * c,
  ];
  const length = Math.hypot(...next);
  return length
    ? [next[0] / length, next[1] / length, next[2] / length, next[3] / length]
    : [a, b, c, d];
}

export function createOrbRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) return;

  const size = canvas.width;
  const radius = size / 2;
  const image = context.createImageData(size, size);
  const pixels: { offset: number; normal: Vector; light: number; highlight: number }[] = [];

  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const x = (column + 0.5) / radius - 1;
      const y = (row + 0.5) / radius - 1;
      const distance = Math.hypot(x, y);
      const alpha = Math.min(1, (1 - distance) * radius + 0.5);
      if (alpha <= 0) continue;

      const z = Math.sqrt(Math.max(0, 1 - distance ** 2));
      const diffuse = Math.max(0, -0.53 * x + 0.15 * y + 0.83 * z);
      const reflection = Math.max(0, -0.28 * x + 0.08 * y + 0.96 * z);
      const offset = (row * size + column) * 4;
      image.data[offset + 3] = 255 * alpha;
      pixels.push({
        offset,
        normal: [x, y, z],
        light: 0.31 + 0.78 * diffuse + 0.13 * (1 - z) ** 3,
        highlight: 92 * reflection ** 38,
      });
    }
  }

  return ([qx, qy, qz, qw]: Rotation) => {
    // Die sichtbaren Normalen zurück in den lokalen Raum der Kugel drehen.
    const xx = 1 - 2 * (qy * qy + qz * qz);
    const xy = 2 * (qx * qy + qw * qz);
    const xz = 2 * (qx * qz - qw * qy);
    const yx = 2 * (qx * qy - qw * qz);
    const yy = 1 - 2 * (qx * qx + qz * qz);
    const yz = 2 * (qy * qz + qw * qx);
    const zx = 2 * (qx * qz + qw * qy);
    const zy = 2 * (qy * qz - qw * qx);
    const zz = 1 - 2 * (qx * qx + qy * qy);

    for (const {
      offset,
      normal: [x, y, z],
      light,
      highlight,
    } of pixels) {
      const u = xx * x + xy * y + xz * z;
      const v = yx * x + yy * y + yz * z;
      const w = zx * x + zy * y + zz * z;
      const band = Math.sin(14 * v + 4 * Math.sin(3 * u + 2 * w) + 1.2 * Math.cos(6 * w - 4 * u));
      const grain = Math.sin(17 * u + 15 * w) * Math.cos(13 * v - 9 * w);
      const bronze = 17 * band + 24 * (0.5 + 0.5 * band) ** 5 + 7 * grain;
      image.data[offset] = (160 + bronze) * light + highlight;
      image.data[offset + 1] = (119 + bronze * 0.85) * light + highlight * 0.91;
      image.data[offset + 2] = (63 + bronze * 0.58) * light + highlight * 0.72;
    }
    context.putImageData(image, 0, 0);
  };
}

<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePanDrag, type PanDelta } from '../composables/usePanDrag';

const props = withDefaults(defineProps<{ interactive?: boolean }>(), {
  interactive: true,
});

const images = [
  '/assets/background/me_anzug.jpeg',
  '/assets/background/me_sunset.jpeg',
  '/assets/background/me_coding.jpeg',
  '/assets/background/me_waterfall.png',
  '/assets/background/me_stormtrooper.png',
  '/assets/background/me_soccer.png',
];

const rowPatterns = [
  [0, 1, 2, 3],
  [3, 4, 5, 0],
  [1, 0, 2, 5],
  [4, 3, 5, 2],
];

const isSafari = (() => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|CriOS|Android|Edg/i.test(ua);
})();

/** Grid-Konfiguration abhängig von Browser und Viewport */
function configure() {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const isSmall = width <= 1024;

  if (isSafari) {
    return {
      cols: 12,
      rows: 8,
      tileSize: isSmall ? 140 : 260,
      tileGap: isSmall ? 100 : 180,
      dragMultiplier: isSmall ? 2.2 : 1.1,
    };
  }
  return {
    cols: 16,
    rows: 10,
    tileSize: isSmall ? 100 : 250,
    tileGap: isSmall ? 120 : 200,
    dragMultiplier: isSmall ? 2.5 : 1.2,
  };
}

const { cols, rows, tileSize, tileGap, dragMultiplier } = configure();
const step = tileSize + tileGap;
const grids = Array.from({ length: 9 }, (_, i) => i);

const tiles = Array.from({ length: cols * rows }, (_, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const pattern = rowPatterns[row % rowPatterns.length]!;
  return {
    id: i,
    image: images[pattern[col % pattern.length]!],
    transform: `translate(${col * step}px, ${row * step}px)`,
  };
});

const worldX = ref(0);
const worldY = ref(0);

function onPan({ dx, dy }: PanDelta) {
  if (!props.interactive) return;
  worldX.value += dx * dragMultiplier;
  worldY.value += dy * dragMultiplier;

  const totalW = cols * step;
  const totalH = rows * step;

  if (worldX.value > totalW) worldX.value -= totalW;
  if (worldX.value < -totalW) worldX.value += totalW;
  if (worldY.value > totalH) worldY.value -= totalH;
  if (worldY.value < -totalH) worldY.value += totalH;
}

const gridTransforms = computed(() =>
  grids.map((g) => {
    const gx = g % 3;
    const gy = Math.floor(g / 3);
    const x = (gx - 1) * cols * step + worldX.value + 10;
    const y = (gy - 1) * rows * step + worldY.value + 10;
    return `translate(${x}px, ${y}px)`;
  }),
);

const root = ref<HTMLElement | null>(null);
const { dragging } = usePanDrag(root, onPan);
</script>

<template>
  <div class="bg-grid" :class="{ 'is-safari': isSafari }">
    <div
      ref="root"
      class="bg-root"
      :class="{ 'is-interactive': interactive, 'is-dragging': dragging }"
    >
      <div class="bg-inner">
        <div
          v-for="g in grids"
          :key="g"
          class="grid-layer"
          :style="{ transform: gridTransforms[g] }"
        >
          <div
            v-for="tile in tiles"
            :key="tile.id"
            class="bg-tile"
            :style="{
              transform: tile.transform,
              backgroundImage: `url(${tile.image})`,
              width: `${tileSize}px`,
              height: `${tileSize}px`,
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.bg-grid {
  position: fixed;
  inset: 0;
  z-index: 0;
  display: block;
}

.bg-root {
  position: relative; /* vorher per Direktive inline gesetzt */
  cursor: grab;
  inset: 0;
  width: 200vw;
  height: 200vh;
  overflow: hidden;
  user-select: none;
  will-change: transform;
  transform-origin: center;
  pointer-events: none;
  touch-action: none;
}

.bg-root.is-interactive {
  pointer-events: auto;
  cursor: grab;
}

.bg-root.is-dragging {
  cursor: grabbing;
}

.bg-tile {
  position: absolute;
  width: 400px;
  height: 400px;
  background-size: cover;
  background-position: center;
  filter: drop-shadow(-15px -15px 10px var(--photo-grid-shadow));
  will-change: transform;
}

.bg-root .bg-inner {
  transform-origin: center;
  transition: transform 150ms ease;
  will-change: transform;
}

.bg-root:active .bg-inner {
  transform: scale(0.9);
}

@media (width <= 1024px) {
  .bg-tile {
    filter: drop-shadow(-10px -10px 5px var(--photo-grid-shadow));
  }
}

.bg-grid.is-safari .bg-root {
  width: 140vw;
  height: 140vh;
}

.bg-grid.is-safari .bg-tile {
  filter: none;
  will-change: auto;
}
</style>

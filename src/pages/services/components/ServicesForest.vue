<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { paintForestMap } from '../lib/forestMap';
import {
  forestImages,
  paintWoodland,
  type ForestPalette,
  type ForestSprite,
} from '../lib/forestScenery';
import { buildTrail, paintTrail, type Trail, type TrailColors } from '../lib/journeyTrail';

const stops = [
  { id: 'waldeingang', label: 'Start', x: 0, lightX: 56, lightY: 66, haze: 0.48 },
  {
    id: 'angebot',
    label: 'Leistungen',
    x: -3,
    lightX: 79,
    lightY: 43,
    haze: 0.25,
  },
  {
    id: 'zusammenarbeit',
    label: 'Zusammenarbeit',
    x: 3,
    lightX: 22,
    lightY: 61,
    haze: 0.35,
  },
  {
    id: 'ablauf',
    label: 'Projektablauf',
    x: -2,
    lightX: 62,
    lightY: 58,
    haze: 0.46,
  },
  { id: 'fragen', label: 'FAQ', x: 3, lightX: 76, lightY: 64, haze: 0.32 },
  { id: 'anfrage', label: 'Kontakt', x: 0, lightX: 52, lightY: 37, haze: 0.76 },
];

const motes = [
  { x: 10, y: 44, dx: -22, dy: 31, size: 3 },
  { x: 15, y: 70, dx: -15, dy: 43, size: 4 },
  { x: 24, y: 57, dx: -20, dy: 27, size: 2 },
  { x: 31, y: 74, dx: -11, dy: 38, size: 3 },
  { x: 44, y: 63, dx: -8, dy: 29, size: 2 },
  { x: 60, y: 77, dx: 10, dy: 34, size: 3 },
  { x: 70, y: 47, dx: 15, dy: -19, size: 2 },
  { x: 75, y: 69, dx: 15, dy: 31, size: 3 },
  { x: 84, y: 49, dx: 21, dy: 20, size: 2 },
  { x: 90, y: 78, dx: 17, dy: 34, size: 4 },
  { x: 19, y: 37, dx: -12, dy: 5, size: 3 },
  { x: 38, y: 50, dx: -9, dy: -13, size: 2 },
  { x: 54, y: 49, dx: 16, dy: -12, size: 3 },
  { x: 81, y: 33, dx: 15, dy: -8, size: 2 },
  { x: 95, y: 62, dx: 6, dy: 8, size: 3 },
];

const mapPoints = [
  { x: 28, y: 10 },
  { x: 66, y: 25 },
  { x: 37, y: 40 },
  { x: 72, y: 57 },
  { x: 51, y: 73 },
  { x: 30, y: 89 },
];

const backdrop = ref<HTMLElement | null>(null);
const scenery = ref<HTMLCanvasElement | null>(null);
const map = ref<HTMLCanvasElement | null>(null);
const terrain = ref<HTMLCanvasElement | null>(null);
const active = ref(0);
const route = useRoute();
const router = useRouter();

let scroller: HTMLElement | null = null;
let sections: HTMLElement[] = [];
let thresholds: number[] = [];
let depthPanels: { element: HTMLElement; center: number; top: number; distance: number }[] = [];
let sceneryContext: CanvasRenderingContext2D | null = null;
let sceneryPalette: ForestPalette | undefined;
let scenerySize = { width: 0, height: 0 };
const sprites = new Map<ForestSprite, HTMLImageElement>();
let reducedMotion: MediaQueryList | undefined;
let mapContext: CanvasRenderingContext2D | null = null;
let terrainContext: CanvasRenderingContext2D | null = null;
let mapTrail: Trail | undefined;
let mapColors: TrailColors | undefined;
let resizeObserver: ResizeObserver | undefined;
let themeObserver: MutationObserver | undefined;
let frame = 0;

function measureScenery() {
  if (!scenery.value || !sceneryContext) return;

  const { clientWidth: width, clientHeight: height } = scenery.value;
  const ratio = Math.min(window.devicePixelRatio, 1.5);
  scenerySize = { width, height };
  scenery.value.width = Math.round(width * ratio);
  scenery.value.height = Math.round(height * ratio);
  sceneryContext.setTransform(ratio, 0, 0, ratio, 0, 0);

  const style = getComputedStyle(scenery.value);
  sceneryPalette = {
    sky: style.getPropertyValue('--woodland-sky').trim(),
    mist: style.getPropertyValue('--woodland-mist').trim(),
    ground: style.getPropertyValue('--woodland-ground').trim(),
    groundShade: style.getPropertyValue('--woodland-ground-shade').trim(),
    path: style.getPropertyValue('--woodland-path').trim(),
    pathShade: style.getPropertyValue('--woodland-path-shade').trim(),
    foliage: style.getPropertyValue('--woodland-foliage').trim(),
    fern: style.getPropertyValue('--woodland-fern').trim(),
    mushroom: style.getPropertyValue('--woodland-mushroom').trim(),
    petals: style.getPropertyValue('--woodland-petals').trim(),
    lanternFrame: style.getPropertyValue('--woodland-lantern-frame').trim(),
    lanternRim: style.getPropertyValue('--woodland-lantern-rim').trim(),
    lanternGlass: style.getPropertyValue('--woodland-lantern-glass').trim(),
    lanternGlow: style.getPropertyValue('--woodland-lantern-glow').trim(),
    treeOpacity: Number(style.getPropertyValue('--woodland-tree-opacity')),
  };
  scheduleUpdate();
}

function measureArtwork() {
  measureMap();
  measureScenery();
}

function measureMap() {
  if (!map.value || !mapContext) return;

  const { clientWidth: width, clientHeight: height } = map.value;
  const ratio = Math.min(window.devicePixelRatio, 2);
  map.value.width = Math.round(width * ratio);
  map.value.height = Math.round(height * ratio);
  mapContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  mapTrail = buildTrail(
    mapPoints.map(({ x, y }) => ({ x: (width * x) / 100, y: (height * y) / 100 })),
    true,
  );

  const style = getComputedStyle(map.value);
  mapColors = {
    path: style.getPropertyValue('--forest-map-track').trim(),
    light: style.getPropertyValue('--forest-map-route').trim(),
    glow: style.getPropertyValue('--forest-map-glow').trim(),
  };
  if (terrain.value && terrainContext) {
    terrain.value.width = map.value.width;
    terrain.value.height = map.value.height;
    terrainContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    paintForestMap(
      terrainContext,
      width,
      height,
      style.getPropertyValue('--forest-map-ink').trim(),
    );
  }
  scheduleUpdate();
}

function measure() {
  if (!scroller) return;

  const top = scroller.getBoundingClientRect().top;
  const position = scroller.scrollTop;
  const inset = parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0;
  const lead = Math.max(scroller.clientHeight * 0.38, inset + 12);
  const limit = scroller.scrollHeight - scroller.clientHeight;
  thresholds = sections.map((section, index) =>
    index === 0
      ? 0
      : Math.min(limit, Math.max(0, position + section.getBoundingClientRect().top - top - lead)),
  );
  depthPanels = Array.from(
    scroller.querySelectorAll<HTMLElement>('[data-forest-depth]'),
    (element) => {
      const bounds = element.getBoundingClientRect();
      return {
        element,
        center: bounds.left + bounds.width / 2,
        top: position + bounds.top - top,
        distance: -1,
      };
    },
  );
  measureArtwork();
  scheduleUpdate();
}

function scheduleUpdate() {
  if (!frame) frame = requestAnimationFrame(update);
}

function mix(from: number, to: number, fraction: number) {
  return from + (to - from) * fraction;
}

function scrollToStop(hash: string, behavior: ScrollBehavior = 'auto') {
  if (!scroller) return;

  const section = hash ? sections.find((item) => hash === `#${item.id}`) : sections[0];
  if (!section) return;

  const inset = parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0;
  const top =
    scroller.scrollTop + section.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  scroller.scrollTo({ top: Math.max(0, top - inset), behavior });
}

function goToStop(event: MouseEvent, id: string) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;

  event.preventDefault();
  const hash = `#${id}`;
  if (route.hash === hash) scrollToStop(hash);
  else void router.push({ hash });
}

watch(
  () => route.hash,
  (hash) => {
    if (route.name === 'services') scrollToStop(hash);
  },
);

function update() {
  frame = 0;
  if (!scroller || !backdrop.value || thresholds.length !== stops.length) return;

  const offset = Math.max(0, scroller.scrollTop);
  const index = thresholds.reduce(
    (last, threshold, current) => (offset >= threshold ? current : last),
    0,
  );
  const start = stops[index]!;
  const next = stops[index + 1] ?? start;
  const span = (thresholds[index + 1] ?? offset) - thresholds[index]!;
  const fraction =
    index === stops.length - 1 || span <= 0 ? 0 : (offset - thresholds[index]!) / span;
  const progress = (index + fraction) / (stops.length - 1);
  active.value = index;

  const style = backdrop.value.style;
  style.setProperty('--forest-light-x', `${mix(start.lightX, next.lightX, fraction)}%`);
  style.setProperty('--forest-light-y', `${mix(start.lightY, next.lightY, fraction)}%`);
  style.setProperty('--forest-haze', `${mix(start.haze, next.haze, fraction)}`);
  style.setProperty('--forest-progress', `${progress}`);

  const height = scroller.clientHeight;
  const horizonX =
    scroller.getBoundingClientRect().left +
    scroller.clientWidth * (0.5 + mix(start.x, next.x, fraction) / 100);
  const horizonY = height * 0.62;
  for (const panel of depthPanels) {
    const viewportTop = panel.top - offset;
    const distance = Math.max(0, Math.min(1, (viewportTop - height * 0.52) / (height * 0.66)));
    if (distance === panel.distance) continue;

    panel.distance = distance;
    const arrival = (1 - distance) ** 1.6;
    const style = panel.element.style;
    style.setProperty('--forest-scale', `${0.045 + arrival * 0.955}`);
    style.setProperty('--forest-visibility', `${Math.min(1, arrival * 1.35)}`);
    style.setProperty('--forest-drift-x', `${(horizonX - panel.center) * (1 - arrival)}px`);
    style.setProperty('--forest-drift-y', `${(horizonY - viewportTop) * (1 - arrival)}px`);
    panel.element.classList.toggle('is-in-the-distance', arrival < 0.68);
  }

  if (map.value && mapContext && mapTrail && mapColors) {
    const from = mapTrail.stops[index]!;
    const to = mapTrail.stops[index + 1] ?? from;
    mapContext.clearRect(0, 0, map.value.clientWidth, map.value.clientHeight);
    paintTrail(mapContext, mapTrail, mapColors, mix(from, to, fraction) / mapTrail.length, false);
  }

  if (sceneryContext && sceneryPalette) {
    paintWoodland(
      sceneryContext,
      scenerySize.width,
      scenerySize.height,
      reducedMotion?.matches ? 0 : progress,
      sceneryPalette,
      sprites,
    );
  }
}

onMounted(() => {
  scroller = backdrop.value?.closest<HTMLElement>('.page-content') ?? null;
  if (!scroller) return;

  sections = stops.flatMap(({ id }) => {
    const section = scroller?.querySelector<HTMLElement>(`#${id}`);
    return section ? [section] : [];
  });
  if (sections.length !== stops.length) return;

  mapContext = map.value?.getContext('2d') ?? null;
  terrainContext = terrain.value?.getContext('2d') ?? null;
  sceneryContext = scenery.value?.getContext('2d') ?? null;
  for (const kind of Object.keys(forestImages) as ForestSprite[]) {
    const sprite = new Image();
    sprites.set(kind, sprite);
    sprite.onload = scheduleUpdate;
    sprite.src = forestImages[kind];
  }
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion.addEventListener('change', scheduleUpdate);
  resizeObserver = new ResizeObserver(measure);
  for (const element of [scroller, ...sections]) resizeObserver.observe(element);
  if (map.value) resizeObserver.observe(map.value);
  themeObserver = new MutationObserver(measureArtwork);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  scroller.addEventListener('scroll', scheduleUpdate, { passive: true });
  if (route.hash) scrollToStop(route.hash, 'instant');
  measure();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  scroller?.removeEventListener('scroll', scheduleUpdate);
  reducedMotion?.removeEventListener('change', scheduleUpdate);
  for (const sprite of sprites.values()) sprite.onload = null;
  resizeObserver?.disconnect();
  themeObserver?.disconnect();
});
</script>

<template>
  <div ref="backdrop" class="forest" :data-stop="stops[active]!.id" aria-hidden="true">
    <canvas ref="scenery" class="forest__scenery"></canvas>
    <div class="forest__shade"></div>
    <div class="forest__mist"></div>
    <div class="forest__motes">
      <span
        v-for="(mote, index) in motes"
        :key="mote.x"
        :style="{
          '--mote-x': `${mote.x}%`,
          '--mote-y': `${mote.y}%`,
          '--mote-drift-x': `${mote.dx}vw`,
          '--mote-drift-y': `${mote.dy}vh`,
          '--mote-size': `${mote.size}px`,
          '--mote-delay': `${-1.7 * index}s`,
          '--mote-duration': `${4.8 + (index % 5) * 0.65}s`,
        }"
      ></span>
    </div>
    <div class="forest__guide"></div>
  </div>

  <nav class="forest-path" aria-label="Wegkarte der Leistungen-Seite">
    <span class="forest-path__paper" aria-hidden="true"></span>
    <span class="forest-path__title" aria-hidden="true">Wegkarte</span>
    <div class="forest-path__chart">
      <canvas ref="terrain" class="forest-path__terrain" aria-hidden="true"></canvas>
      <canvas ref="map" class="forest-path__trail" aria-hidden="true"></canvas>
      <ol class="forest-path__stops">
        <li
          v-for="(stop, index) in stops"
          :key="stop.id"
          :style="{ left: `${mapPoints[index]!.x}%`, top: `${mapPoints[index]!.y}%` }"
        >
          <a
            :href="`#${stop.id}`"
            :aria-current="index === active ? 'location' : undefined"
            :class="{ 'is-passed': index < active }"
            @click="goToStop($event, stop.id)"
          >
            <span class="forest-path__marker" aria-hidden="true"></span>
            <span class="forest-path__label">{{ stop.label }}</span>
          </a>
        </li>
      </ol>
    </div>
    <span class="forest-path__current" aria-hidden="true">{{ stops[active]!.label }}</span>
  </nav>
</template>

<style scoped lang="scss">
.forest {
  --forest-light-x: 56%;
  --forest-light-y: 66%;
  --forest-haze: 0.48;
  --forest-progress: 0;
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  isolation: isolate;
  background: var(--color-night);
  pointer-events: none;
}

.forest__scenery,
.forest__shade,
.forest__mist,
.forest__motes {
  position: absolute;
  inset: 0;
}

.forest__scenery {
  width: 100%;
  height: 100%;
}

.forest__shade {
  background: var(--forest-shade);
}

.forest__mist {
  background:
    radial-gradient(
      ellipse at var(--forest-light-x) var(--forest-light-y),
      var(--forest-mist),
      transparent 46%
    ),
    linear-gradient(120deg, transparent 33%, var(--forest-beam) 51%, transparent 69%);
  opacity: var(--forest-haze);
}

.forest__motes span {
  position: absolute;
  top: var(--mote-y);
  left: var(--mote-x);
  width: var(--mote-size);
  aspect-ratio: 1;
  transform: translate3d(
      calc(var(--mote-drift-x) * var(--forest-progress)),
      calc(var(--mote-drift-y) * var(--forest-progress)),
      0
    )
    scale(calc(0.7 + var(--forest-progress) * 1.4));
}

.forest__motes span::after {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--forest-firefly);
  box-shadow:
    0 0 8px 2px var(--forest-firefly-glow),
    0 0 17px 4px var(--forest-firefly-glow);
  content: '';
  animation: drift-and-glow var(--mote-duration) var(--mote-delay) ease-in-out infinite alternate;
}

@keyframes drift-and-glow {
  0% {
    opacity: 0.22;
    translate: -6px 5px;
    scale: 0.73;
  }
  48% {
    opacity: 0.94;
    translate: 6px -4px;
    scale: 1.15;
  }
  100% {
    opacity: 0.4;
    translate: 13px -12px;
    scale: 0.86;
  }
}

.forest__guide {
  position: absolute;
  top: var(--forest-light-y);
  left: var(--forest-light-x);
  width: 7px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--journey-light);
  box-shadow:
    0 0 9px 3px var(--journey-glow),
    0 0 33px 9px var(--journey-glow);
  opacity: 0.84;
  transition: opacity 350ms ease;
}

.forest[data-stop='ablauf'] .forest__guide {
  opacity: 0.15;
}

.forest-path {
  --map-panel-pad: 9px;
  --map-caption: 26px;
  --map-height: clamp(140px, 45svh, 304px);
  --map-half-height: calc(var(--map-height) / 2 + var(--map-caption) + var(--map-panel-pad) + 1px);
  position: fixed;
  top: min(
    calc(100% - var(--map-half-height) - 8px),
    max(51%, calc(var(--site-header-depth) + var(--map-half-height) + 12px))
  );
  right: var(--forest-map-inset);
  z-index: 2;
  width: var(--forest-map-width);
  padding: calc(var(--map-panel-pad) + 1px);
  translate: 0 -50%;
}

.forest-path__paper {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  filter: drop-shadow(0 1px 1px var(--forest-map-edge))
    drop-shadow(0 5px 6px var(--forest-map-stain));
}

.forest-path__paper::before,
.forest-path__paper::after {
  position: absolute;
  content: '';
}

.forest-path__paper::before {
  inset: 0;
  clip-path: polygon(
    1px 10px,
    5px 4px,
    13px 1px,
    31% 2px,
    46% 0,
    57% 1px,
    60% 4px,
    65% 2px,
    calc(100% - 13px) 1px,
    calc(100% - 4px) 5px,
    100% 12px,
    calc(100% - 1px) 17%,
    100% 31%,
    calc(100% - 4px) 35%,
    calc(100% - 2px) 37%,
    100% 38%,
    calc(100% - 1px) 62%,
    100% 78%,
    calc(100% - 3px) 82%,
    calc(100% - 1px) 86%,
    100% calc(100% - 11px),
    calc(100% - 5px) calc(100% - 5px),
    calc(100% - 16px) 100%,
    68% calc(100% - 1px),
    51% 100%,
    45% calc(100% - 4px),
    40% calc(100% - 2px),
    29% 100%,
    12px calc(100% - 1px),
    4px calc(100% - 5px),
    1px calc(100% - 11px),
    0 84%,
    3px 78%,
    5px 77%,
    1px 75%,
    0 67%,
    2px 48%,
    0 31%,
    3px 23%,
    1px 20%
  );
  background:
    radial-gradient(ellipse at 2% 76%, var(--forest-map-stain), transparent 23%),
    radial-gradient(ellipse at 98% 36%, var(--forest-map-stain), transparent 22%),
    radial-gradient(ellipse at 0 0, var(--forest-map-stain), transparent 36%),
    radial-gradient(ellipse at 95% 100%, var(--forest-map-stain), transparent 40%),
    repeating-linear-gradient(
      6deg,
      transparent 0 5px,
      rgb(75 43 21 / 5%) 6px,
      transparent 7px 11px
    ),
    repeating-linear-gradient(
      91deg,
      transparent 0 2px,
      rgb(75 43 21 / 5%) 3px,
      transparent 4px 7px
    ),
    linear-gradient(
      106deg,
      var(--forest-map-paper),
      var(--forest-map-highlight) 43%,
      var(--forest-map-paper)
    );
  box-shadow:
    inset 0 0 0 1px var(--forest-map-stain),
    inset 0 0 13px 3px var(--forest-map-stain);
}

.forest-path__paper::after {
  inset: 5px 4px 5px 5px;
  border: 1px solid var(--forest-map-track);
  border-radius: 4px 8px 6px 5px / 8px 4px 9px 4px;
}

.forest-path__title,
.forest-path__current {
  display: grid;
  height: var(--map-caption);
  place-items: center;
  color: var(--forest-map-ink);
  font: 700 0.75rem / 1 var(--font-display);
  text-align: center;
}

.forest-path__title {
  text-transform: uppercase;
  letter-spacing: 0.17em;
}

.forest-path__current {
  color: var(--forest-map-route);
}

.forest-path__chart {
  position: relative;
  height: var(--map-height);
  border-block: 1px solid var(--forest-map-track);
}

.forest-path__stops,
.forest-path__terrain,
.forest-path__trail {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.forest-path__stops {
  margin: 0;
  padding: 0;
  list-style: none;
}

.forest-path__trail,
.forest-path__terrain {
  pointer-events: none;
}

.forest-path__stops li {
  position: absolute;
  z-index: 1;
  translate: -50% -50%;
}

.forest-path a {
  position: relative;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  color: var(--forest-map-ink);
  text-decoration: none;
}

.forest-path__marker {
  width: 10px;
  aspect-ratio: 1;
  border: 1px solid var(--forest-map-ink);
  border-radius: 50%;
  background: var(--forest-map-highlight);
}

.forest-path .is-passed .forest-path__marker {
  background: var(--forest-map-route);
}

.forest-path a[aria-current] .forest-path__marker {
  width: 13px;
  background: var(--forest-map-route);
  box-shadow:
    0 0 0 2px var(--forest-map-highlight),
    0 0 10px 4px var(--forest-map-glow);
}

.forest-path__label {
  position: absolute;
  right: calc(100% + 3px);
  top: 50%;
  width: max-content;
  padding: 6px 9px;
  border: 1px solid var(--forest-map-edge);
  border-radius: 5px;
  background: var(--forest-map-highlight);
  opacity: 0;
  font: 600 0.75rem / 1.2 var(--font-ui);
  pointer-events: none;
  translate: 0 -50%;
}

.forest-path a:is(:hover, :focus-visible) .forest-path__label {
  opacity: 1;
}

@media (width <= 760px), (height <= 510px) {
  .forest-path {
    --map-caption: 0px;
    --map-panel-pad: 4px;
  }

  .forest-path__title,
  .forest-path__current {
    display: none;
  }

  .forest-path a {
    width: 32px;
    height: 30px;
  }
}

@media (height <= 510px) {
  .forest-path {
    --map-height: clamp(94px, 40svh, 177px);
  }

  .forest-path a {
    height: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .forest__motes,
  .forest__guide,
  .forest__mist {
    display: none;
  }
}
</style>

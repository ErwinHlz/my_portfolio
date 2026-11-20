<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { steps } from '../data/services';
import { buildTrail, paintTrail, type Point, type Trail, type TrailColors } from '../lib/journeyTrail';

const scene = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const reached = ref(-1);
const numerals = ['I', 'II', 'III', 'IV', 'V'];

let scroller: HTMLElement | null = null;
let context: CanvasRenderingContext2D | null = null;
let resizeObserver: ResizeObserver | undefined;
let themeObserver: MutationObserver | undefined;
let reducedMotion: MediaQueryList | undefined;
let frame = 0;
let size = { width: 0, height: 0 };
let markers: Point[] = [];
let trail: Trail | undefined;
let colors: TrailColors;
let paintedProgress = -1;

function readColors() {
  if (!scene.value) return;

  const style = getComputedStyle(scene.value);
  colors = {
    path: style.getPropertyValue('--journey-track').trim(),
    light: style.getPropertyValue('--journey-light').trim(),
    glow: style.getPropertyValue('--journey-glow').trim(),
  };
  paintedProgress = -1;
  schedulePaint();
}

function measure() {
  if (!canvas.value || !context || !scene.value) return;

  const bounds = canvas.value.getBoundingClientRect();
  size = { width: canvas.value.clientWidth, height: canvas.value.clientHeight };
  const scaleX = bounds.width / size.width;
  const scaleY = bounds.height / size.height;
  const ratio = Math.min(window.devicePixelRatio, 2);
  canvas.value.width = Math.round(size.width * ratio);
  canvas.value.height = Math.round(size.height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  markers = Array.from(scene.value.querySelectorAll('.journey__marker'), (marker) => {
    const rect = marker.getBoundingClientRect();
    return {
      x: (rect.left + rect.width / 2 - bounds.left) / scaleX,
      y: (rect.top + rect.height / 2 - bounds.top) / scaleY,
    };
  });
  trail = buildTrail(markers, Math.abs(markers[0]!.x - markers.at(-1)!.x) < 2);
  paintedProgress = -1;
  schedulePaint();
}

function schedulePaint() {
  if (!frame) frame = requestAnimationFrame(paint);
}

function paint() {
  frame = 0;
  if (!context || !canvas.value || !scroller || !trail || !colors) return;

  const height = scroller.clientHeight;
  const bounds = canvas.value.getBoundingClientRect();
  const top = bounds.top - scroller.getBoundingClientRect().top;
  const scale = bounds.height / size.height;
  const start = height * 0.78 - markers[0]!.y * scale;
  const end = height * 0.35 - markers.at(-1)!.y * scale;
  const moving = !reducedMotion?.matches;
  const progress = moving ? Math.max(0, Math.min((start - top) / (start - end), 1)) : 1;
  if (progress === paintedProgress) return;

  paintedProgress = progress;
  const distance = progress * trail.length;
  reached.value =
    progress > 0
      ? trail.stops.reduce((last, stop, index) => (stop <= distance + 1 ? index : last), -1)
      : -1;

  context.clearRect(0, 0, size.width, size.height);
  paintTrail(context, trail, colors, progress, moving);
}

onMounted(() => {
  if (!scene.value || !canvas.value) return;

  scroller = scene.value.closest<HTMLElement>('.page-content');
  context = canvas.value.getContext('2d');
  if (!scroller || !context) return;

  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion.addEventListener('change', schedulePaint);
  scroller.addEventListener('scroll', schedulePaint, { passive: true });
  resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(scene.value);
  resizeObserver.observe(scroller);
  themeObserver = new MutationObserver(readColors);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  readColors();
  measure();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  scroller?.removeEventListener('scroll', schedulePaint);
  reducedMotion?.removeEventListener('change', schedulePaint);
  resizeObserver?.disconnect();
  themeObserver?.disconnect();
});
</script>

<template>
  <div ref="scene" class="journey">
    <canvas ref="canvas" class="journey__trail" aria-hidden="true"></canvas>
    <ol class="journey__steps">
      <li
        v-for="(step, index) in steps"
        :key="step.title"
        class="journey__step"
        :class="{ 'is-lit': index <= reached, 'is-current': index === reached }"
      >
        <span class="journey__marker" aria-hidden="true">{{ numerals[index] }}</span>
        <div class="journey__description">
          <h3>{{ step.title }}</h3>
          <p>{{ step.text }}</p>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped lang="scss">
.journey {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: clamp(20px, 3.5vw, 44px);
  border: 1px solid var(--border-mid);
  border-radius: 14px;
  background:
    repeating-radial-gradient(
      ellipse at 0% -45%,
      transparent 0 23px,
      rgb(var(--accent-gold-rgb), 0.11) 24px,
      transparent 25px 34px
    ),
    radial-gradient(ellipse at 48% 0%, rgb(var(--accent-forest-rgb), 0.17), transparent 65%),
    var(--card-surface);
  box-shadow: var(--card-shadow);
}

/* Handy: genauso leicht durchscheinend wie die Leistungskarten */
@media (width <= 900px) {
  .journey {
    background:
      repeating-radial-gradient(
        ellipse at 0% -45%,
        transparent 0 23px,
        rgb(var(--accent-gold-rgb), 0.11) 24px,
        transparent 25px 34px
      ),
      radial-gradient(ellipse at 48% 0%, rgb(var(--accent-forest-rgb), 0.17), transparent 65%),
      var(--card-surface-glass);
    -webkit-backdrop-filter: blur(3px);
    backdrop-filter: blur(3px);
  }
}

.journey__trail {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.journey__steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: clamp(14px, 2vw, 28px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.journey__step {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 16px;
  text-align: center;

  &:nth-child(even) {
    padding-top: 3.8rem;
  }

  &:nth-child(3) {
    padding-top: 0.85rem;
  }

  h3 {
    margin: 0 0 6px;
    font-size: 1.15rem;
    color: var(--text-heading);
  }

  p {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.55;
  }
}

.journey__marker {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border: 1px solid var(--border-mid);
  border-radius: 50%;
  background: var(--color-night);
  color: var(--accent-gold);
  font-family: var(--font-display);
  font-weight: 700;
  box-shadow:
    inset 0 0 0 4px var(--color-night),
    inset 0 0 0 5px var(--border-mid);
  transition:
    border-color 280ms ease,
    box-shadow 280ms ease;
}

.is-lit .journey__marker {
  border-color: var(--accent-gold);
  box-shadow:
    inset 0 0 0 4px var(--color-night),
    inset 0 0 0 5px var(--border-strong),
    0 0 18px var(--journey-glow);
}

.is-current .journey__marker {
  box-shadow:
    inset 0 0 0 4px var(--color-night),
    inset 0 0 0 5px var(--border-strong),
    0 0 22px var(--journey-glow),
    0 0 0 5px var(--border-soft);
}

@media (width <= 900px) {
  .journey__steps {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .journey__step {
    grid-template-columns: 52px minmax(0, 1fr);
    justify-items: start;
    align-items: start;
    text-align: left;

    &:nth-child(n) {
      padding-top: 0;
    }
  }

  .journey__description {
    padding-block: 5px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .journey__marker {
    transition: none;
  }
}
</style>

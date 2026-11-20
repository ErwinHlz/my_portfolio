<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import SiteFooter from '@/layout/SiteFooter.vue';
import { chapters } from '../data/about';
import { FlatOrbRenderer, readOrbColors, type Orb } from '@/shared/orb/palantir';
import { EmberField } from '../lib/palantirEmbers';
import { createGlOrb } from '@/shared/orb/palantirGl';

/** Schritt 0 = ruhende Kugel, danach ein Schritt pro Kapitel */
const steps = chapters.length + 1;
const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const TAU = Math.PI * 2;

const root = ref<HTMLElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const orb = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const emberCanvas = ref<HTMLCanvasElement | null>(null);
const active = ref(0);
const dragging = ref(false);
const hasTurned = ref(false);

const side = computed(() => (active.value > 0 ? chapters[active.value - 1]!.side : null));

let scroller: HTMLElement | null = null;
let renderer: Orb | undefined;
let embers: EmberField | undefined;
let reducedMotion: MediaQueryList | undefined;
let compact: MediaQueryList | undefined;
let resizeObserver: ResizeObserver | undefined;
let themeObserver: MutationObserver | undefined;
let visibility: IntersectionObserver | undefined;
let frame = 0;
let visible = false;
let lastTime = 0;
let clarity = 0;
let lean = 0;
let shown = -1;
let pointer: { x: number; y: number } | null = null;

// Drehung der Kugel
let yaw = 0;
let pitch = 0;
let yawVelocity = 0;
let pitchVelocity = 0;
let stir = 0;
let lastTouch = 0;
let dragPointer = -1;
let dragLast = { x: 0, y: 0, time: 0 };
// gemessene Drehgeschwindigkeit, für Funken und Spiegelung
let previousYaw = 0;
let previousPitch = 0;
let spin = 0;
let pitchSpin = 0;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const smoothstep = (from: number, to: number, value: number) => {
  const t = clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Ankerpunkte der Kapitel im mobilen Layout, in dem der Text normal scrollt */
function anchors(view: DOMRect) {
  const articles = root.value?.querySelectorAll<HTMLElement>('.palantir__chapter') ?? [];
  const points = Array.from(articles, (article) => article.getBoundingClientRect().top);
  return [points[0]! - view.height * 0.4, ...points];
}

/** Lesehöhe im mobilen Layout: knapp unterhalb der festen Kugel */
function readingLine(view: DOMRect) {
  const stageBottom = stage.value?.getBoundingClientRect().bottom ?? view.top;
  return stageBottom + view.height * 0.08;
}

/** Fortschritt als Kommazahl: 0 … steps-1, ganze Zahlen = Kapitel klar sichtbar */
function readProgress() {
  if (!root.value || !scroller) return 0;
  const view = scroller.getBoundingClientRect();

  if (compact?.matches) {
    const line = readingLine(view);
    const points = anchors(view);
    if (line <= points[0]!) return 0;
    for (let index = 0; index < points.length - 1; index++) {
      const from = points[index]!;
      const to = points[index + 1]!;
      if (line < to) return index + (line - from) / (to - from);
    }
    return steps - 1;
  }

  const rect = root.value.getBoundingClientRect();
  const range = rect.height - view.height;
  return range > 0 ? clamp((view.top - rect.top) / range, 0, 1) * (steps - 1) : 0;
}

/** Schwung nach dem Loslassen, danach dreht sich die Kugel sanft zurück nach vorn */
function updateRotation(dt: number, now: number, still: boolean) {
  if (dragging.value) return;

  if (still) {
    yawVelocity = pitchVelocity = 0;
  } else {
    yaw += yawVelocity * dt;
    pitch += pitchVelocity * dt;
    const friction = Math.exp(-dt * 2.4);
    yawVelocity *= friction;
    pitchVelocity *= friction;
  }

  if (now - lastTouch > 2600 && Math.abs(yawVelocity) < 0.3) {
    const home = Math.round(yaw / TAU) * TAU;
    const pull = still ? 1 : 1 - Math.exp(-dt * 1.6);
    yaw += (home - yaw) * pull;
    pitch += (0 - pitch) * pull;
  }
  pitch = clamp(pitch, -1.1, 1.1);
}

function tick(now: number) {
  frame = 0;
  if (!renderer) return;

  const still = !!reducedMotion?.matches;
  const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
  lastTime = now;

  const progress = readProgress();
  const index = Math.round(progress);
  if (index !== active.value) active.value = index;

  // Neues Bild erst wechseln, wenn der Nebel es ganz verschluckt hat
  const wanted = index - 1;
  let targetClarity = wanted < 0 ? 0 : 1 - smoothstep(0.16, 0.5, Math.abs(progress - index));
  if (wanted !== shown) {
    targetClarity = 0;
    if (clarity < 0.04 || still) shown = wanted;
  }
  const targetLean = side.value === 'left' ? -1 : side.value === 'right' ? 1 : 0;

  clarity += (targetClarity - clarity) * (still ? 1 : 1 - Math.exp(-dt * 9));
  lean += (targetLean - lean) * (still ? 1 : 1 - Math.exp(-dt * 4));
  stir *= Math.exp(-dt * 1.4);
  updateRotation(dt, now, still);

  const follow = 1 - Math.exp(-dt * 8);
  spin += ((yaw - previousYaw) / dt - spin) * follow;
  pitchSpin += ((pitch - previousPitch) / dt - pitchSpin) * follow;
  previousYaw = yaw;
  previousPitch = pitch;

  renderer.render({
    vision: shown,
    clarity,
    lean,
    yaw,
    pitch,
    stir: still ? 0 : stir,
    time: still ? 0 : now / 1000,
    dt: still ? 0 : dt,
    pointer: still ? null : pointer,
    wobble: still
      ? [0, 0]
      : [clamp(spin * 0.025, -0.18, 0.18), clamp(pitchSpin * 0.025, -0.12, 0.12)],
  });

  if (still) embers?.clear();
  else embers?.update(dt, spin, now / 1000);

  // Nebel bewegt sich weiter, solange die Kugel sichtbar ist
  const settling =
    dragging.value ||
    Math.abs(yaw - Math.round(yaw / TAU) * TAU) > 0.002 ||
    Math.abs(pitch) > 0.002;
  if (visible && (!still || wanted !== shown || settling)) frame = requestAnimationFrame(tick);
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(tick);
}

function jumpTo(step: number) {
  if (!scroller || !root.value) return;
  const view = scroller.getBoundingClientRect();
  let offset: number;

  if (compact?.matches) {
    offset = anchors(view)[step]! - readingLine(view) + 1;
  } else {
    const rect = root.value.getBoundingClientRect();
    offset = rect.top - view.top + (step / (steps - 1)) * (rect.height - view.height);
  }

  scroller.scrollBy({ top: offset, behavior: reducedMotion?.matches ? 'auto' : 'smooth' });
}

function localPoint(event: PointerEvent) {
  const rect = orb.value!.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function onPointerDown(event: PointerEvent) {
  if (!orb.value || event.button !== 0) return;
  dragging.value = true;
  hasTurned.value = true;
  dragPointer = event.pointerId;
  dragLast = { x: event.clientX, y: event.clientY, time: event.timeStamp };
  yawVelocity = pitchVelocity = 0;
  lastTouch = performance.now();
  orb.value.setPointerCapture(event.pointerId);
  schedule();
}

function onPointerMove(event: PointerEvent) {
  if (!orb.value) return;
  const point = localPoint(event);

  if (pointer) {
    const moved = Math.hypot(point.x - pointer.x, point.y - pointer.y);
    stir = Math.min(stir + moved * 0.012, 2.4);
  }
  pointer = point;

  if (!dragging.value || event.pointerId !== dragPointer) return;
  const size = orb.value.clientWidth || 1;
  const dx = event.clientX - dragLast.x;
  const dy = event.clientY - dragLast.y;
  const elapsed = Math.max((event.timeStamp - dragLast.time) / 1000, 1 / 120);
  const turnX = (dx / size) * Math.PI;
  const turnY = (dy / size) * Math.PI;

  yaw += turnX;
  pitch = clamp(pitch + turnY, -1.1, 1.1);
  yawVelocity = turnX / elapsed;
  pitchVelocity = turnY / elapsed;
  dragLast = { x: event.clientX, y: event.clientY, time: event.timeStamp };
  lastTouch = performance.now();
  schedule();
}

function onPointerUp(event: PointerEvent) {
  if (event.pointerId !== dragPointer) return;
  dragging.value = false;
  dragPointer = -1;
  // Schwung nur übernehmen, wenn zuletzt noch bewegt wurde
  if (event.timeStamp - dragLast.time > 80) yawVelocity = pitchVelocity = 0;
  yawVelocity = clamp(yawVelocity, -12, 12);
  pitchVelocity = clamp(pitchVelocity, -6, 6);
  lastTouch = performance.now();
  schedule();
}

function onPointerLeave() {
  if (!dragging.value) pointer = null;
}

function updateColors() {
  if (!root.value || !renderer) return;
  const colors = readOrbColors(root.value);
  renderer.setColors(colors);
  embers?.setColors(colors);
  schedule();
}

function updateSize() {
  if (!orb.value || !renderer) return;
  renderer.resize(orb.value.clientWidth);
  embers?.resize(orb.value.clientWidth);
  schedule();
}

function createRenderer(element: HTMLCanvasElement) {
  const visions = chapters.map((chapter) => chapter.vision);
  const realistic = createGlOrb(element, visions, schedule);
  if (realistic) return realistic;

  // Ein Canvas, das schon einen WebGL-Kontext angefragt hat, liefert kein 2D mehr
  const fresh = element.cloneNode() as HTMLCanvasElement;
  element.replaceWith(fresh);
  return new FlatOrbRenderer(fresh, visions, schedule);
}

onMounted(() => {
  if (!root.value || !canvas.value) return;

  scroller = root.value.closest<HTMLElement>('.page-content');
  if (!scroller) return;

  renderer = createRenderer(canvas.value);
  if (emberCanvas.value) embers = new EmberField(emberCanvas.value);

  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  compact = window.matchMedia('(width <= 900px)');
  reducedMotion.addEventListener('change', schedule);
  compact.addEventListener('change', schedule);
  scroller.addEventListener('scroll', schedule, { passive: true });

  resizeObserver = new ResizeObserver(updateSize);
  if (orb.value) resizeObserver.observe(orb.value);

  themeObserver = new MutationObserver(updateColors);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  visibility = new IntersectionObserver(
    ([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible) schedule();
    },
    { root: scroller },
  );
  visibility.observe(root.value);

  updateColors();
  updateSize();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  scroller?.removeEventListener('scroll', schedule);
  reducedMotion?.removeEventListener('change', schedule);
  compact?.removeEventListener('change', schedule);
  resizeObserver?.disconnect();
  themeObserver?.disconnect();
  visibility?.disconnect();
  renderer?.dispose();
});
</script>

<template>
  <section ref="root" class="palantir" :style="{ '--steps': steps }">
    <div ref="stage" class="palantir__stage">
      <div class="palantir__altar">
        <span
          class="palantir__thread palantir__thread--left"
          :class="{ 'is-lit': side === 'left' }"
          aria-hidden="true"
        ></span>
        <span
          class="palantir__thread palantir__thread--right"
          :class="{ 'is-lit': side === 'right' }"
          aria-hidden="true"
        ></span>

        <div
          ref="orb"
          class="palantir__orb"
          :class="{ 'is-dragging': dragging }"
          title="Ziehen, um die Kugel zu drehen"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @pointerleave="onPointerLeave"
        >
          <canvas ref="canvas" aria-hidden="true"></canvas>
        </div>
        <div class="palantir__stand" aria-hidden="true">
          <span class="palantir__cradle"></span>
          <span class="palantir__plinth"></span>
        </div>
        <canvas ref="emberCanvas" class="palantir__embers" aria-hidden="true"></canvas>
        <p class="palantir__hint" :class="{ 'is-hidden': hasTurned }" aria-hidden="true">
          <span>↻</span> Ziehen zum Drehen
        </p>

        <nav class="palantir__runes" aria-label="Kapitel">
          <button
            v-for="(chapter, index) in chapters"
            :key="chapter.id"
            type="button"
            :class="{ 'is-active': active === index + 1, 'is-seen': active > index + 1 }"
            :aria-label="chapter.title"
            :aria-current="active === index + 1 ? 'step' : undefined"
            @click="jumpTo(index + 1)"
          >
            {{ numerals[index] }}
          </button>
        </nav>
      </div>
    </div>

    <div class="palantir__texts">
      <div class="palantir__awaken" :class="{ 'is-active': active === 0 }">
        <p class="palantir__awaken-part palantir__awaken-part--left">
          <span class="realm-eyebrow">Über mich</span>
          <span class="palantir__awaken-word">Wer steckt</span>
        </p>
        <p class="palantir__awaken-part palantir__awaken-part--right">
          <span class="palantir__awaken-word">dahinter?</span>
          <span class="palantir__cue">Scroll &amp; blick hinein</span>
        </p>
      </div>

      <article
        v-for="(chapter, index) in chapters"
        :key="chapter.id"
        class="palantir__chapter"
        :class="[`palantir__chapter--${chapter.side}`, { 'is-active': active === index + 1 }]"
      >
        <p class="realm-eyebrow">{{ chapter.eyebrow }}</p>
        <component
          :is="index === 0 ? 'h1' : 'h2'"
          class="palantir__title"
          :class="{ 'palantir__title--hero': index === 0 }"
        >
          <template v-if="chapter.accent">
            {{ chapter.title.split(chapter.accent)[0]
            }}<span class="realm-gold-text">{{ chapter.accent }}</span
            >{{ chapter.title.split(chapter.accent)[1] }}
          </template>
          <template v-else>{{ chapter.title }}</template>
        </component>
        <p v-if="chapter.lead" class="palantir__lead">{{ chapter.lead }}</p>
        <p v-for="paragraph in chapter.paragraphs" :key="paragraph">{{ paragraph }}</p>
        <ul v-if="chapter.facts" class="palantir__facts">
          <li v-for="fact in chapter.facts" :key="fact.label">
            <strong>{{ fact.label }}</strong> {{ fact.text }}
          </li>
        </ul>
        <RouterLink v-if="chapter.link" :to="chapter.link.to" class="palantir__link">
          {{ chapter.link.label }} <span aria-hidden="true">→</span>
        </RouterLink>
        <div v-if="chapter.actions" class="realm-actions palantir__actions">
          <RouterLink
            v-for="action in chapter.actions"
            :key="action.to"
            :to="action.to"
            class="realm-btn"
            :class="`realm-btn--${action.variant}`"
          >
            {{ action.label }}
          </RouterLink>
        </div>
      </article>

      <!-- Footer erscheint im letzten Bild, die Seite endet mit dem Palantír -->
      <div class="palantir__footer" :class="{ 'is-active': active === steps - 1 }">
        <SiteFooter />
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.palantir {
  --orb-size: min(50vh, 34vw, 540px);
  --step-length: 85vh;

  position: relative;
  height: calc((var(--steps) - 1) * var(--step-length) + 100vh);
}

/* Bühne (Kugel) und Textebene liegen als zwei Sticky-Ebenen übereinander */
.palantir__stage,
.palantir__texts {
  position: sticky;
  top: 0;
  box-sizing: border-box;
  height: 100vh;
  height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--orb-size) minmax(0, 1fr);
  grid-template-areas: 'left orb right';
  align-items: center;
  column-gap: clamp(28px, 4.5vw, 76px);
  padding: calc(var(--site-header-depth) + 8px) clamp(20px, 4vw, 64px) 84px;
}

.palantir__texts {
  margin-top: -100vh;
  margin-top: -100dvh;
  pointer-events: none;
}

.palantir__actions {
  margin-top: 22px;
}

.palantir__footer {
  position: absolute;
  inset: auto 0 0;
  opacity: 0;
  visibility: hidden;
  pointer-events: auto;
  transform: translateY(12px);
  transition:
    opacity 500ms ease,
    transform 500ms ease,
    visibility 0s linear 500ms;

  &.is-active {
    opacity: 1;
    visibility: visible;
    transform: none;
    transition-delay: 300ms, 300ms, 0s;
  }

  :deep(.site-footer) {
    margin-top: 0;
  }
}

/* ---------- Kugel ---------- */
.palantir__altar {
  grid-area: orb;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.palantir__orb {
  position: relative;
  z-index: 1;
  width: var(--orb-size);
  height: var(--orb-size);
  border-radius: 50%;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  box-shadow:
    0 0 80px rgb(var(--palantir-core), 0.26),
    0 0 180px rgb(var(--palantir-core), 0.1);
  animation: palantir-wake 1.6s ease-out both;

  &.is-dragging {
    cursor: grabbing;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }
}

/* Halterung: Metallschale, in der die Kugel liegt, darunter ein Sockel */
.palantir__stand {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: calc(var(--orb-size) * 0.66);
  margin-top: calc(var(--orb-size) * -0.12);
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    width: 150%;
    height: calc(var(--orb-size) * 0.08);
    transform: translate(-50%, -55%);
    border-radius: 50%;
    background: radial-gradient(ellipse, rgb(0 0 0 / 55%), transparent 70%);
    z-index: -1;
  }
}

.palantir__cradle {
  position: relative;
  width: 100%;
  height: calc(var(--orb-size) * 0.15);
  border-radius: 0 0 50% 50% / 0 0 100% 100%;
  background:
    linear-gradient(180deg, rgb(0 0 0 / 0%) 40%, rgb(0 0 0 / 45%)),
    linear-gradient(
      90deg,
      var(--palantir-metal-dark) 0%,
      var(--palantir-metal) 20%,
      var(--palantir-metal-light) 36%,
      var(--palantir-metal) 52%,
      var(--palantir-metal-dark) 82%,
      var(--palantir-metal-dark) 100%
    );
  box-shadow: 0 10px 24px rgb(0 0 0 / 40%);

  /* Lippe der Schale mit gebündeltem Licht der Kugel */
  &::before {
    content: '';
    position: absolute;
    top: calc(var(--orb-size) * -0.028);
    left: -1%;
    width: 102%;
    height: calc(var(--orb-size) * 0.056);
    border-radius: 50%;
    background:
      radial-gradient(ellipse at 50% 60%, rgb(var(--palantir-core), 0.75), transparent 45%),
      linear-gradient(
        90deg,
        var(--palantir-metal-dark),
        var(--palantir-metal-light) 34%,
        var(--palantir-metal) 60%,
        var(--palantir-metal-dark)
      );
    box-shadow: inset 0 -2px 3px rgb(0 0 0 / 50%);
  }
}

.palantir__embers {
  position: absolute;
  top: calc(var(--orb-size) * 0.45);
  left: 50%;
  z-index: 3;
  width: calc(var(--orb-size) * 1.3);
  height: calc(var(--orb-size) * 0.75);
  transform: translateX(-50%);
  pointer-events: none;
}

.palantir__plinth {
  width: 46%;
  height: calc(var(--orb-size) * 0.07);
  margin-top: -2px;
  border-radius: 0 0 14% 14% / 0 0 60% 60%;
  background: linear-gradient(
    90deg,
    var(--palantir-metal-dark) 0%,
    var(--palantir-metal) 25%,
    var(--palantir-metal-light) 40%,
    var(--palantir-metal-dark) 85%
  );
  clip-path: polygon(14% 0, 86% 0, 100% 100%, 0 100%);
}

.palantir__hint {
  margin: 10px 0 0;
  font-family: var(--font-display);
  font-size: 0.66rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-muted-strong);
  transition: opacity 600ms ease;

  span {
    color: var(--accent-gold);
  }

  &.is-hidden {
    opacity: 0;
  }
}

.palantir__thread {
  position: absolute;
  top: calc(var(--orb-size) / 2);
  width: clamp(18px, 3.4vw, 60px);
  height: 1px;
  transform: scaleX(0);
  transition: transform 700ms cubic-bezier(0.2, 0.7, 0.2, 1);

  &.is-lit {
    transform: scaleX(1);
    transition-delay: 200ms;
  }
}

.palantir__thread--left {
  right: calc(100% + 6px);
  transform-origin: right;
  background: linear-gradient(to left, rgb(var(--accent-gold-rgb), 0.85), transparent);
}

.palantir__thread--right {
  left: calc(100% + 6px);
  transform-origin: left;
  background: linear-gradient(to right, rgb(var(--accent-gold-rgb), 0.85), transparent);
}

.palantir__runes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;

  button {
    display: grid;
    width: 30px;
    height: 30px;
    padding: 0;
    place-items: center;
    border: 1px solid var(--border-mid);
    border-radius: 50%;
    background: transparent;
    color: var(--text-muted-strong);
    font-family: var(--font-display);
    font-size: 0.58rem;
    font-weight: 700;
    cursor: pointer;
    transition:
      color 300ms ease,
      border-color 300ms ease,
      background-color 300ms ease,
      box-shadow 300ms ease,
      transform 300ms ease;

    &:hover,
    &:focus-visible {
      color: var(--accent-gold);
      border-color: var(--border-strong);
    }

    &.is-seen {
      color: var(--accent-gold);
      background: rgb(var(--accent-gold-rgb), 0.1);
    }

    &.is-active {
      color: var(--text-heading);
      border-color: var(--accent-gold);
      background: rgb(var(--accent-gold-rgb), 0.18);
      box-shadow: 0 0 14px rgb(var(--accent-gold-rgb), 0.45);
      transform: scale(1.15);
    }
  }
}

/* ---------- Texte ---------- */
.palantir__chapter,
.palantir__awaken-part {
  grid-row: 1;
  max-width: 30rem;
  opacity: 0;
  visibility: hidden;
  transform: translateX(var(--shift));
  filter: blur(6px);
  pointer-events: auto;
  transition:
    opacity 450ms ease,
    transform 600ms cubic-bezier(0.2, 0.7, 0.2, 1),
    filter 450ms ease,
    visibility 0s linear 600ms;
}

.palantir__chapter.is-active,
.palantir__awaken.is-active .palantir__awaken-part {
  opacity: 1;
  visibility: visible;
  transform: none;
  filter: none;
  transition-delay: 280ms, 280ms, 280ms, 0s;
}

.palantir__chapter--left,
.palantir__awaken-part--left {
  --shift: 48px;

  grid-area: left;
  justify-self: end;
}

.palantir__chapter--right,
.palantir__awaken-part--right {
  --shift: -48px;

  grid-area: right;
  justify-self: start;
}

.palantir__chapter {
  font-size: 1.08rem;
  line-height: 1.6;

  p {
    margin: 0 0 12px;
  }
}

.palantir__title {
  margin: 0 0 16px;
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 2.6vw, 2.4rem);
  font-weight: 600;
  line-height: 1.15;
  color: var(--text-heading);
}

.palantir__title--hero {
  font-size: clamp(2.1rem, 4vw, 3.4rem);
}

.palantir__lead {
  font-size: clamp(1.12rem, 1.4vw, 1.28rem);
}

.palantir__facts {
  display: grid;
  gap: 8px;
  margin: 20px 0 0;
  padding: 18px 0 0;
  border-top: 1px solid var(--border-soft);
  list-style: none;
  font-size: 1rem;

  li {
    display: grid;
    grid-template-columns: 9.5rem 1fr;
    gap: 10px;
  }

  strong {
    padding-top: 3px;
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent-gold);
  }
}

.palantir__link {
  display: inline-flex;
  gap: 8px;
  margin-top: 6px;
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-gold);
  text-decoration: none;
  border-bottom: 1px solid var(--border-strong);
  padding-bottom: 4px;

  &:hover,
  &:focus-visible {
    color: var(--text-heading);
    border-color: var(--accent-gold);
  }
}

/* Einstieg: die Frage wird links und rechts der Kugel aufgeteilt */
.palantir__awaken {
  display: contents;
}

.palantir__awaken-part {
  display: grid;
  gap: 10px;
  margin: 0;
}

.palantir__awaken-part--left {
  text-align: right;
}

.palantir__awaken-word {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3.6rem);
  font-weight: 600;
  line-height: 1.05;
  color: var(--text-heading);
}

.palantir__cue {
  font-family: var(--font-display);
  font-size: 0.75rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--accent-gold);

  &::after {
    content: '';
    display: block;
    width: 1px;
    height: 36px;
    margin-top: 12px;
    background: linear-gradient(var(--accent-gold), transparent);
    animation: palantir-cue 2s ease-in-out infinite;
    transform-origin: top;
  }
}

@keyframes palantir-wake {
  from {
    opacity: 0;
    transform: scale(0.94);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes palantir-cue {
  0%,
  100% {
    transform: scaleY(0.4);
    opacity: 0.4;
  }

  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}

/* ---------- Mobil: Kugel oben fest, Text scrollt darunter ---------- */
@media (width <= 900px) {
  .palantir__footer {
    position: static;
    margin: 4vh -20px 0;
    opacity: 1;
    visibility: visible;
    transform: none;
    transition: none;
  }

  .palantir {
    --orb-size: min(30vh, 58vw);

    height: auto;
  }

  .palantir__stage {
    z-index: 2;
    height: auto;
    grid-template-columns: 1fr;
    grid-template-areas: 'orb';
    padding: var(--site-header-depth) 20px 18px;
    padding-bottom: 28px;
    background: linear-gradient(180deg, var(--color-night) 88%, transparent);
  }

  .palantir__texts {
    position: static;
    height: auto;
    margin-top: 0;
    display: block;
    padding: 0 20px;
    pointer-events: auto;
  }

  .palantir__thread {
    display: none;
  }

  .palantir__hint {
    display: none;
  }

  .palantir__runes {
    margin-top: 12px;
    gap: 6px;

    button {
      width: 24px;
      height: 24px;
      font-size: 0.5rem;
    }
  }

  .palantir__awaken {
    display: block;
    min-height: 40svh;
    padding-top: 4vh;
    text-align: center;
  }

  .palantir__awaken-part {
    max-width: none;
    justify-items: center;
    text-align: center;
  }

  .palantir__chapter,
  .palantir__awaken-part {
    visibility: visible;
    opacity: 0.3;
    transform: none;
    filter: none;
    transition: opacity 400ms ease;
  }

  .palantir__chapter {
    min-height: 60svh;
    margin: 0 auto;
    padding-block: 24px;
  }

  /* Letztes Kapitel nur so hoch wie nötig, damit es samt Footer unter die Kugel passt */
  .palantir__chapter:last-of-type {
    min-height: 0;
    padding-bottom: 0;
  }

  .palantir__chapter.is-active,
  .palantir__awaken.is-active .palantir__awaken-part {
    opacity: 1;
    transition-delay: 0s;
  }

  .palantir__cue::after {
    margin-inline: auto;
  }
}

@media (width <= 600px) {
  .palantir__facts li {
    grid-template-columns: 1fr;
    gap: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .palantir__orb,
  .palantir__cue::after {
    animation: none;
  }

  .palantir__chapter,
  .palantir__awaken-part {
    filter: none;
    transform: none;
    transition-duration: 200ms;
  }
}
</style>

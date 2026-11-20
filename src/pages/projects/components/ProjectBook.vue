<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { projects, type ProjectImage } from '../data/projects';
import BookLeaf from './BookLeaf.vue';
import BookPage from './BookPage.vue';
import BookShelf from './BookShelf.vue';
import ImageLightbox from './ImageLightbox.vue';
import { buildPages } from '../lib/bookPages';
import { leafGeometry, type BendMode } from '../lib/leaf';

const route = useRoute();
const router = useRouter();

const pages = buildPages(projects);
const N = pages.length; // immer ungerade
const FIRST_PLATE = 3;

const chapters = [
  ...projects.map((project, index) => ({
    chapter: index + 1,
    title: project.title,
    page: FIRST_PLATE + index * 2,
  })),
  {
    chapter: projects.length + 1,
    title: 'Noch ungeschrieben',
    page: FIRST_PLATE + projects.length * 2,
  },
];

// --- Ansicht: Doppelseite oder Einzelseite --------------------------------------
const singleQuery = window.matchMedia('(width <= 820px)');
const single = ref(singleQuery.matches);

/** Position = Doppelseite (Desktop) bzw. Seite (Handy) */
const pos = ref(0);
const maxPos = computed(() => (single.value ? N - 1 : (N - 1) / 2));

const posForPage = (index: number) => (single.value ? index : Math.ceil(index / 2));
const pageForPos = (v: number) => (single.value ? v : v === 0 ? 0 : 2 * v - 1);

function leftIndex(v: number): number | null {
  return single.value || v === 0 ? null : 2 * v - 1;
}

function rightIndex(v: number): number | null {
  if (single.value) return v;
  return 2 * v < N ? 2 * v : null;
}

// --- Umblättern ----------------------------------------------------------------
interface Turn {
  dir: 1 | -1;
  progress: number;
}

const turn = ref<Turn | null>(null);
const hasTurned = ref(false);
let animating = false;

const layers = computed(() => {
  const t = turn.value;
  const v = pos.value;
  if (!t) return { left: leftIndex(v), right: rightIndex(v), front: null, back: null, angle: 0 };
  if (t.dir > 0) {
    return {
      left: leftIndex(v),
      right: rightIndex(v + 1),
      front: rightIndex(v),
      back: leftIndex(v + 1),
      angle: -180 * t.progress,
    };
  }
  return {
    left: leftIndex(v - 1),
    right: rightIndex(v),
    front: rightIndex(v - 1),
    back: leftIndex(v),
    angle: -180 * (1 - t.progress),
  };
});

/** 1 = Buch zu (Einband mittig), 0 = aufgeschlagen */
const closed = computed(() => {
  if (single.value) return 0;
  const t = turn.value;
  if (pos.value === 0) return t && t.dir > 0 ? 1 - t.progress : 1;
  if (pos.value === 1 && t && t.dir < 0) return t.progress;
  return 0;
});

const lift = computed(() => Math.sin((Math.abs(layers.value.angle) * Math.PI) / 180));

/** 'lead': der Finger hält die Kante, 'flutter': selbstständiges Blättern mit Nachschwingen */
const bendMode = ref<BendMode>('flutter');
const geometry = computed(() =>
  turn.value
    ? leafGeometry(
        layers.value.angle,
        turn.value.dir,
        turn.value.progress,
        bendMode.value,
        single.value ? 34 : 42,
      )
    : null,
);

// Schatten des Blatts auf den darunterliegenden Seiten (Lage der freien Kante ab Falz)
const castRight = computed(() =>
  geometry.value && geometry.value.edgeX > 0 ? geometry.value.edgeX : null,
);
const castLeft = computed(() =>
  geometry.value && geometry.value.edgeX < 0 ? -geometry.value.edgeX : null,
);

const showRightBoard = computed(
  () => layers.value.right !== null && pages[layers.value.right]?.type !== 'cover',
);

// --- Drehen des geschlossenen Buchs ------------------------------------------------
/** Buch liegt zu und es wird nicht geblättert – dann lässt es sich drehen */
const isClosed = computed(() => pos.value === 0 && !turn.value);
/** Drehwinkel in Grad: spinY um die senkrechte Achse (180 = Rückseite), spinX um die waagerechte */
const spinX = ref(0);
const spinY = ref(0);
const isSpun = computed(() => spinX.value !== 0 || spinY.value !== 0);
/** Während des Drehens liegt das Buch über Header und Footer */
const spinning = ref(false);

/*
 * Safari schneidet 3D-Flächen ab, die hinter die Bildebene (z < 0) geraten. Darum wird
 * das Buch zum Drehen um seinen halben Durchmesser nach vorne geschoben und genau so weit
 * verkleinert, dass es in Ruhe unverändert aussieht. Perspektive sitzt dafür im Buch selbst.
 */
const bookSize = ref({ width: 0, height: 0 });
let resizeObserver: ResizeObserver | null = null;
const spinLift = computed(() => {
  const perspective = single.value ? 1500 : 2600;
  const coverW = (single.value ? bookSize.value.width : bookSize.value.width / 2) * 1.06;
  const coverH = bookSize.value.height * 1.06;
  const depth = Math.hypot(coverW, coverH) / 2 + 6;
  // der Einband liegt eine halbe Buchdicke vor der Mitte – auch das ausgleichen
  const front = depth + ((coverW / 1.06) * 0.09) / 2;
  return {
    '--persp': `${perspective}px`,
    '--lift-z': `${depth.toFixed(1)}px`,
    '--lift-s': ((perspective - front) / perspective).toFixed(4),
  };
});

/** aufrecht = spinX auf ein Vielfaches von 360°, vorne/hinten = spinY auf ein Vielfaches von 180° */
const uprightX = (x = spinX.value) => Math.round(x / 360) * 360;
const frontY = () => Math.round(spinY.value / 360) * 360;
const mod360 = (v: number) => ((v % 360) + 360) % 360;

let spinRaf = 0;
function spinTo(targetX: number, targetY: number, duration = 700): Promise<void> {
  cancelAnimationFrame(spinRaf);
  const fromX = spinX.value;
  const fromY = spinY.value;
  const finish = () => {
    spinX.value = mod360(uprightX(targetX));
    spinY.value = mod360(Math.round(targetY / 180) * 180);
    spinning.value = false;
  };
  if (prefersReducedMotion() || (fromX === targetX && fromY === targetY)) {
    finish();
    return Promise.resolve();
  }
  spinning.value = true;
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      const e = easeOut(k);
      spinX.value = fromX + (targetX - fromX) * e;
      spinY.value = fromY + (targetY - fromY) * e;
      if (k < 1) spinRaf = requestAnimationFrame(step);
      else {
        finish();
        resolve();
      }
    };
    spinRaf = requestAnimationFrame(step);
  });
}

async function turnAround() {
  if (animating || !isClosed.value) return;
  animating = true;
  await spinTo(uprightX(), Math.round(spinY.value / 180) * 180 + 180, 900);
  animating = false;
}

/** Rückseite angetippt: zurück auf den Einband drehen */
async function showFront() {
  if (animating || !isClosed.value) return;
  animating = true;
  await spinTo(uprightX(), frontY(), 800);
  animating = false;
}

const canPrev = computed(() => pos.value > 0);
const canNext = computed(() => pos.value < maxPos.value);

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);

let raf = 0;
function tween(from: number, to: number, duration: number, ease: (k: number) => number) {
  cancelAnimationFrame(raf);
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const k = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
      if (turn.value) turn.value.progress = from + (to - from) * ease(k);
      if (k < 1) raf = requestAnimationFrame(step);
      else resolve();
    };
    raf = requestAnimationFrame(step);
  });
}

function commit() {
  if (turn.value) pos.value += turn.value.dir;
  turn.value = null;
  animating = false;
  afterMove();
}

async function flip(dir: 1 | -1, duration = 980): Promise<boolean> {
  if (turn.value || animating) return false;
  const target = pos.value + dir;
  if (target < 0 || target > maxPos.value) return false;

  // gedrehtes Buch erst wieder mit dem Einband nach vorne drehen
  if (pos.value === 0 && isSpun.value) {
    animating = true;
    await spinTo(uprightX(), frontY(), 600);
    animating = false;
  }

  if (prefersReducedMotion()) {
    pos.value = target;
    afterMove();
    return true;
  }

  animating = true;
  bendMode.value = 'flutter';
  turn.value = { dir, progress: 0 };
  await tween(0, 1, duration, easeInOut);
  commit();
  return true;
}

async function goTo(target: number) {
  const clamped = Math.min(maxPos.value, Math.max(0, target));
  if (clamped === pos.value || animating) return;
  if (prefersReducedMotion() || Math.abs(clamped - pos.value) > 6) {
    pos.value = clamped;
    afterMove();
    return;
  }
  // schnelles Durchblättern bis zum Ziel
  while (pos.value !== clamped) {
    const ok = await flip(clamped > pos.value ? 1 : -1, 420);
    if (!ok) break;
  }
}

function gotoChapter(chapter: number) {
  void goTo(posForPage(FIRST_PLATE + (chapter - 1) * 2));
}

// --- Bilder: groß ansehen, in der Nähe vorladen -------------------------------------
const zoomed = ref<ProjectImage | null>(null);

const preloaded = new Set<string>();
/** Bilder der Seiten rund um die aktuelle Position vorladen – nicht das ganze Buch */
function preloadAround(v: number) {
  const center = pageForPos(v);
  for (let index = center - 2; index <= center + 4; index++) {
    const page = pages[index];
    if (!page || (page.type !== 'plate' && page.type !== 'profile')) continue;
    for (const image of [page.project.image, page.project.imageSecondary]) {
      if (image && !preloaded.has(image.src)) {
        preloaded.add(image.src);
        new Image().src = image.src;
      }
    }
  }
}

// --- Position merken: /projekte#slug ---------------------------------------------
const announcement = ref('');

const positionLabel = computed(() => {
  if (pos.value === 0) return 'Einband';
  if (single.value) return `Seite ${pos.value} von ${N - 1}`;
  return `Seite ${2 * pos.value - 1}–${2 * pos.value} von ${N - 1}`;
});

function slugAt(v: number) {
  const page = pages[pageForPos(v)];
  return page && (page.type === 'plate' || page.type === 'profile') ? page.project.slug : null;
}

function afterMove() {
  hasTurned.value = true;
  // Fokus zurückholen, falls das fokussierte Element mit der alten Seite verschwunden ist
  if (!document.activeElement || document.activeElement === document.body) {
    bookEl.value?.focus({ preventScroll: true });
  }
  announcement.value = positionLabel.value;
  preloadAround(pos.value);
  const slug = slugAt(pos.value);
  const hash = slug ? `#${slug}` : '';
  if (route.hash !== hash) void router.replace({ hash });
}

// --- Ziehen mit dem Finger -------------------------------------------------------
const bookEl = ref<HTMLElement | null>(null);

interface Drag {
  id: number;
  x: number;
  y: number;
  started: boolean;
  dir: 1 | -1;
  distance: number;
  lastX: number;
  lastT: number;
  vx: number;
  /** 'turn' = Seite blättern, 'spin' = geschlossenes Buch drehen */
  mode: 'turn' | 'spin';
  spinX0: number;
  spinY0: number;
  lastY: number;
  vy: number;
}

let drag: Drag | null = null;
let suppressClick = false;
let suppressTimer: number | undefined;

function onPointerDown(event: PointerEvent) {
  if (animating || turn.value) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const rect = bookEl.value?.getBoundingClientRect();
  if (!rect) return;
  suppressClick = false;
  drag = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    started: false,
    dir: 1,
    // Desktop: der Finger zieht die Seite einmal quer über die Doppelseite
    distance: single.value ? rect.width * 0.85 : rect.width * 0.8,
    lastX: event.clientX,
    lastT: event.timeStamp,
    vx: 0,
    mode: 'turn',
    spinX0: 0,
    spinY0: 0,
    lastY: event.clientY,
    vy: 0,
  };
}

function onPointerMove(event: PointerEvent) {
  const d = drag;
  if (!d || d.id !== event.pointerId) return;
  const dx = event.clientX - d.x;
  const dy = event.clientY - d.y;

  if (!d.started) {
    if (Math.hypot(dx, dy) < 10) return;
    // Einband vorne und waagerecht nach links gezogen: aufschlagen statt drehen
    const opensCover =
      !isSpun.value && dx < 0 && Math.abs(dx) > Math.abs(dy) && !prefersReducedMotion();
    if (isClosed.value && !opensCover) {
      // geschlossen: Ziehen dreht das Buch in jede Richtung, 180° pro Einbandbreite
      const rect = bookEl.value?.getBoundingClientRect();
      d.started = true;
      d.mode = 'spin';
      d.spinX0 = spinX.value;
      d.spinY0 = spinY.value;
      d.distance = rect ? (single.value ? rect.width : rect.width / 2) : 300;
      cancelAnimationFrame(spinRaf);
      spinning.value = true;
      bookEl.value?.setPointerCapture(event.pointerId);
    } else if (Math.abs(dy) > Math.abs(dx)) {
      drag = null; // senkrecht: kein Blättern
      return;
    }
  }

  if (d.mode === 'spin') {
    const dt = Math.max(1, event.timeStamp - d.lastT);
    d.vx = d.vx * 0.6 + ((event.clientX - d.lastX) / dt) * 0.4;
    d.vy = d.vy * 0.6 + ((event.clientY - d.lastY) / dt) * 0.4;
    d.lastX = event.clientX;
    d.lastY = event.clientY;
    d.lastT = event.timeStamp;
    spinY.value = d.spinY0 + (dx / d.distance) * 180;
    spinX.value = d.spinX0 - (dy / d.distance) * 180;
    return;
  }

  if (!d.started) {
    const dir = dx < 0 ? 1 : -1;
    const target = pos.value + dir;
    if (target < 0 || target > maxPos.value || prefersReducedMotion()) {
      drag = null;
      return;
    }
    d.started = true;
    d.dir = dir;
    bookEl.value?.setPointerCapture(event.pointerId);
    bendMode.value = 'lead';
    turn.value = { dir, progress: 0 };
  }

  const dt = Math.max(1, event.timeStamp - d.lastT);
  d.vx = d.vx * 0.6 + ((event.clientX - d.lastX) / dt) * 0.4;
  d.lastX = event.clientX;
  d.lastT = event.timeStamp;

  if (turn.value) {
    const travelled = d.dir > 0 ? -dx : dx;
    turn.value.progress = Math.min(1, Math.max(0, travelled / d.distance));
  }
}

async function endDrag(event: PointerEvent, cancelled: boolean) {
  const d = drag;
  if (!d || d.id !== event.pointerId) return;
  drag = null;
  if (!d.started) return;

  suppressClick = true;
  window.clearTimeout(suppressTimer);
  suppressTimer = window.setTimeout(() => (suppressClick = false), 400);

  if (d.mode === 'spin') {
    // mit Schwung weiterdrehen, dann aufrecht vorne oder hinten einrasten
    const toDeg = (180 / d.distance) * 220;
    const targetX = uprightX(spinX.value - d.vy * toDeg);
    const targetY = Math.round((spinY.value + d.vx * toDeg) / 180) * 180;
    const travel = Math.max(Math.abs(targetX - spinX.value), Math.abs(targetY - spinY.value));
    animating = true;
    await spinTo(targetX, targetY, 450 + Math.min(700, travel * 3));
    animating = false;
    return;
  }
  if (!turn.value) return;

  const progress = turn.value.progress;
  const flick = (d.dir > 0 ? -d.vx : d.vx) > 0.45;
  animating = true;
  if (!cancelled && (progress > 0.35 || flick)) {
    await tween(progress, 1, 120 + 480 * (1 - progress), easeOut);
    commit();
  } else {
    await tween(progress, 0, 100 + 420 * progress, easeOut);
    turn.value = null;
    animating = false;
  }
}

function onClickCapture(event: MouseEvent) {
  if (!suppressClick) return;
  suppressClick = false;
  event.preventDefault();
  event.stopPropagation();
}

function onKeydown(event: KeyboardEvent) {
  if (event.target instanceof HTMLElement && event.target.closest('a, button')) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    void flip(1);
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    void flip(-1);
  }
}

// --- Lebenszyklus ------------------------------------------------------------------
function onViewChange(event: MediaQueryListEvent) {
  const page = pageForPos(pos.value);
  cancelAnimationFrame(raf);
  turn.value = null;
  animating = false;
  drag = null;
  cancelAnimationFrame(spinRaf);
  spinX.value = 0;
  spinY.value = 0;
  spinning.value = false;
  single.value = event.matches;
  pos.value = posForPage(page);
}

onMounted(() => {
  if (bookEl.value) {
    resizeObserver = new ResizeObserver(([entry]) => {
      if (entry) {
        bookSize.value = { width: entry.contentRect.width, height: entry.contentRect.height };
      }
    });
    resizeObserver.observe(bookEl.value);
  }
  singleQuery.addEventListener('change', onViewChange);

  const slug = route.hash.slice(1);
  const index = projects.findIndex((project) => project.slug === slug);
  if (index >= 0) {
    pos.value = posForPage(FIRST_PLATE + index * 2);
    hasTurned.value = true;
  }

  // Bilder der nächsten Seiten vorladen, damit beim Umblättern nichts aufblitzt
  preloadAround(pos.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  singleQuery.removeEventListener('change', onViewChange);
  cancelAnimationFrame(raf);
  cancelAnimationFrame(spinRaf);
  window.clearTimeout(suppressTimer);
});
</script>

<template>
  <section class="book-stage" aria-label="Projektbuch">
    <BookShelf :rows="single ? 1 : 3" />
    <h1 class="sr-only">Meine Projekte</h1>

    <div class="book-area" :class="{ 'is-lifted': spinning }">
      <div
        ref="bookEl"
        class="book"
        :class="{ 'is-single': single, 'is-turning': turn, 'is-closed': isClosed }"
        :style="{ '--closed': closed, '--lift': lift }"
        tabindex="0"
        aria-roledescription="Buch"
        :aria-label="`Projektbuch, ${positionLabel}. Mit den Pfeiltasten blättern.`"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="endDrag($event, false)"
        @pointercancel="endDrag($event, true)"
        @click.capture="onClickCapture"
        @keydown="onKeydown"
      >
        <div class="book__body">
          <!-- Buchdeckel unter den Seiten, Rücken mit Kapitalband -->
          <span
            v-if="layers.left !== null"
            class="book__board book__board--left"
            aria-hidden="true"
          />
          <span v-if="showRightBoard" class="book__board book__board--right" aria-hidden="true" />
          <span v-if="!single && layers.left !== null" class="book__spine" aria-hidden="true" />

          <!-- Seitenschnitt links/rechts -->
          <span
            v-if="layers.left !== null"
            class="book__edge book__edge--left"
            :style="{ '--stack': pos / maxPos }"
            aria-hidden="true"
          />
          <span
            v-if="layers.right !== null && pages[layers.right]?.type !== 'cover'"
            class="book__edge book__edge--right"
            :style="{ '--stack': 1 - pos / maxPos }"
            aria-hidden="true"
          />

          <div v-if="!single" class="book__slot book__slot--left">
            <BookPage
              v-if="layers.left !== null"
              :key="layers.left"
              :page="pages[layers.left]!"
              :number="layers.left"
              :chapters="chapters"
              side="left"
              @goto="gotoChapter"
              @zoom="zoomed = $event"
            />
            <span
              v-if="castLeft !== null"
              class="book__cast book__cast--left"
              :style="{ '--edge': castLeft }"
              aria-hidden="true"
            />
          </div>

          <div
            class="book__slot book__slot--right"
            :class="{ 'is-turntable': isClosed, 'is-spun': isClosed && isSpun }"
            :style="
              isClosed
                ? { '--spin-x': `${spinX}deg`, '--spin-y': `${spinY}deg`, ...spinLift }
                : undefined
            "
          >
            <BookPage
              v-if="layers.right !== null"
              :key="layers.right"
              :page="pages[layers.right]!"
              :number="layers.right"
              :chapters="chapters"
              :side="single ? 'single' : 'right'"
              @open="flip(1)"
              @goto="gotoChapter"
              @zoom="zoomed = $event"
            />
            <span
              v-if="castRight !== null"
              class="book__cast book__cast--right"
              :style="{ '--edge': castRight }"
              aria-hidden="true"
            />

            <!-- geschlossenes Buch als Körper: Rücken, Seitenschnitt, Rückdeckel -->
            <template v-if="isClosed">
              <span class="turn-spine" aria-hidden="true">
                <span class="turn-spine__title">Chronik der Projekte</span>
              </span>
              <span class="turn-fore" aria-hidden="true" />
              <span class="turn-head" aria-hidden="true" />
              <span class="turn-head turn-head--tail" aria-hidden="true" />
              <span class="turn-back" aria-hidden="true" @click="showFront">
                <span class="turn-back__frame" />
                <span class="turn-back__mark">◆</span>
              </span>
            </template>
          </div>

          <BookLeaf
            v-if="turn && geometry"
            :front="layers.front !== null ? pages[layers.front]! : null"
            :front-number="layers.front"
            :back="layers.back !== null ? pages[layers.back]! : null"
            :back-number="layers.back"
            :chapters="chapters"
            :single="single"
            :geometry="geometry"
          />

          <!-- Eselsohren zum Blättern -->
          <button
            v-if="canNext && !turn && pos > 0"
            class="dog-ear dog-ear--next"
            :class="{ 'is-hinting': !hasTurned && pos > 0 }"
            type="button"
            tabindex="-1"
            aria-hidden="true"
            @click="flip(1)"
          />
          <button
            v-if="canPrev && !turn"
            class="dog-ear dog-ear--prev"
            type="button"
            tabindex="-1"
            aria-hidden="true"
            @click="flip(-1)"
          />
        </div>
      </div>
    </div>

    <div class="book-controls">
      <button type="button" class="book-controls__arrow" :disabled="!canPrev" @click="flip(-1)">
        <span aria-hidden="true">‹</span><span class="sr-only">Zurückblättern</span>
      </button>
      <button type="button" class="book-controls__toc" @click="goTo(posForPage(2))">Inhalt</button>
      <button v-if="isClosed" type="button" class="book-controls__toc" @click="turnAround">
        Drehen
      </button>
      <span v-else class="book-controls__label" aria-hidden="true">{{ positionLabel }}</span>
      <button type="button" class="book-controls__arrow" :disabled="!canNext" @click="flip(1)">
        <span aria-hidden="true">›</span><span class="sr-only">Weiterblättern</span>
      </button>
    </div>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <ImageLightbox :image="zoomed" @close="zoomed = null" />
  </section>
</template>

<style scoped lang="scss">
/* Die Bühne füllt den Raum zwischen Header und Footer – gescrollt wird nicht. */
.book-stage {
  position: relative;
  container: stage / size;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  justify-items: center;
  gap: 8px;
  min-height: 0;
  padding: 0 16px 10px;
}

/* Platz für das Buch – das Buch richtet sich nach diesem Container */
.book-area {
  position: relative;
  z-index: 1;
  grid-row: 1;
  container-type: size;
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 0;
}

/* beim Drehen über Header (z 30) und Footer legen – nichts wird angeschnitten */
.book-area.is-lifted {
  z-index: 31;
}

.book-controls {
  position: relative;
  z-index: 2;
  grid-row: 2;
}

.book {
  /* Texturen als SVG-Rauschen: Papierfasern und Ledernarbung */
  --tex-paper: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .42 0 0 0 0 .3 0 0 0 0 .16 1.1 0 0 0 -.38'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E");
  --tex-leather: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='l'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='2' seed='4' stitchTiles='stitch'/%3E%3CfeDiffuseLighting surfaceScale='2.2' lighting-color='%23fff'%3E%3CfeDistantLight azimuth='225' elevation='48'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23l)'/%3E%3C/svg%3E");
  // Deckel und Rücken ragen ein Stück heraus – dafür bleibt Rand.
  // Der Buchblock ist etwas kleiner als der Einband (Faktor 0.955), so ist das
  // geschlossene Buch genauso groß wie das aufgeschlagene.
  --page-w: calc(min(540px, calc((100cqw - 96px) / 2), calc(100cqh * 0.68)) * 0.955);
  position: relative;
  width: calc(var(--page-w) * 2);
  aspect-ratio: 1.4;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
  translate: calc(-25% * var(--closed)) 0;

  &:focus-visible .book__body {
    outline: 2px solid var(--accent-gold);
    outline-offset: 10px;
  }
}

.book.is-closed {
  touch-action: none;

  // die Perspektive steckt beim geschlossenen Buch im Drehteller selbst (mittig)
  .book__body {
    perspective: none;
  }
}

.book.is-single {
  --page-w: calc(min(440px, calc(100cqw - 36px), calc(100cqh * 0.6)) * 0.956);
  --page-font: 3.7cqw;
  --page-pad: 4.6cqh 7cqw 4.4cqh;
  width: var(--page-w);
  aspect-ratio: auto;
  height: min(calc(var(--page-w) / 0.52), calc(100cqh * 0.91));
  translate: none;
}

@media (min-width: 821px) {
  .book:not(.is-turning) {
    transition: translate 600ms cubic-bezier(0.22, 1, 0.36, 1);
  }
}

.book__body {
  position: absolute;
  inset: 0;
  perspective: 2600px;
  // Schatten des ganzen Buchs auf dem Untergrund
  filter: drop-shadow(0 18px 22px rgb(0 0 0 / 45%)) drop-shadow(0 4px 5px rgb(0 0 0 / 35%));
}

.is-single .book__body {
  perspective: 1500px;
}

.book__slot {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
}

.book__slot--left {
  left: 0;
}

.book__slot--right {
  right: 0;
}

.is-single .book__slot--right {
  width: 100%;
}

/* Seitenschnitt: zeigt, wie viele Seiten noch links/rechts liegen */
.book__edge {
  --thick: calc(3px + 7px * var(--stack));
  position: absolute;
  top: 0.6%;
  bottom: 0.6%;
  width: var(--thick);
  background: repeating-linear-gradient(90deg, #e9dcc0 0 1px, #cdb994 1px 2px), #e2d1b2;
  box-shadow: 0 2px 3px rgb(0 0 0 / 30%);
}

.book__edge--left {
  left: calc(-1 * var(--thick) + 1px);
  border-radius: 3px 0 0 3px;
}

.book__edge--right {
  right: calc(-1 * var(--thick) + 1px);
  border-radius: 0 3px 3px 0;
}

.is-single .book__edge--left {
  display: none;
}

/* ---------------- Geschlossenes Buch drehen ----------------
   Die rechte Seite wird zum Buchkörper: Einband vorne, Rückdeckel hinten,
   dazwischen Rücken und Seitenschnitt. Maße wie der Einband (ragt über die Seite). */
.book__slot--right.is-turntable {
  --thick: calc(var(--page-w) * 0.09);
  --cv-top: -2.2%;
  --cv-right: -4.8%;
  --cv-bottom: -2.6%;
  --cv-left: 0%;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
  transform-origin: 52.4% 50.2%;
  transform: perspective(var(--persp, 2600px)) translateZ(var(--lift-z, 0px))
    scale(var(--lift-s, 1)) rotateX(var(--spin-x, 0deg)) rotateY(var(--spin-y, 0deg));

  > .page {
    transform: translateZ(calc(var(--thick) / 2));
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
}

.is-single .book__slot--right.is-turntable {
  --cv-top: -2%;
  --cv-right: -3.2%;
  --cv-bottom: -2.4%;
  --cv-left: -1.4%;
  transform-origin: 50.9% 50.2%;
}

/* beim Drehen ersetzt der echte Körper die angedeutete Buchdicke */
.book__slot--right.is-spun :deep(.cover) {
  box-shadow:
    inset 0 0 0 0.35cqw rgb(150 75 45 / 45%),
    inset 0 0 0 0.7cqw rgb(25 8 3 / 55%),
    inset -0.6cqw -0.8cqw 2.4cqw rgb(0 0 0 / 45%),
    inset 0.4cqw 0.4cqw 1.6cqw rgb(255 190 140 / 12%);
}

.turn-back {
  position: absolute;
  inset: var(--cv-top) var(--cv-right) var(--cv-bottom) var(--cv-left);
  border-radius: 2cqw 0.8cqw 0.8cqw 2cqw;
  transform: translateZ(calc(var(--thick) / -2)) rotateY(180deg);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  cursor: pointer;
  background:
    radial-gradient(ellipse 50% 35% at 70% 18%, rgb(255 210 150 / 12%), transparent),
    radial-gradient(ellipse 45% 40% at 30% 85%, rgb(0 0 0 / 30%), transparent),
    linear-gradient(270deg, #2a0f08 0, #4a1b10 3%, #6d2a17 6.5%, #5c2414 9%, #5a2313 50%, #4c1c10);
  box-shadow:
    inset 0 0 0 0.35cqw rgb(150 75 45 / 45%),
    inset 0 0 0 0.7cqw rgb(25 8 3 / 55%),
    inset 0.6cqw -0.8cqw 2.4cqw rgb(0 0 0 / 45%);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-image: var(--tex-leather);
    background-size: 240px;
    mix-blend-mode: soft-light;
    opacity: 0.7;
  }
}

.turn-back__frame {
  position: absolute;
  inset: 7% 7% 7% 9%;
  border: 1px solid rgb(214 170 92 / 45%);
  border-radius: 4px;
  box-shadow: inset 0 0 0 5px rgb(214 170 92 / 12%);
}

.turn-back__mark {
  position: absolute;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
  font-size: calc(var(--page-w) * 0.05);
  color: #d9b061;
  opacity: 0.7;
  text-shadow: 0 1px 0 rgb(0 0 0 / 60%);
}

/* Rücken: an der Falzkante, um 90° gedreht */
.turn-spine {
  position: absolute;
  top: calc(var(--cv-top) - 0.4%);
  bottom: calc(var(--cv-bottom) - 0.4%);
  left: calc(var(--cv-left) - var(--thick) / 2);
  width: var(--thick);
  display: grid;
  place-items: center;
  border-radius: 6px;
  transform: rotateY(-90deg);
  background:
    /* Bünde */
    linear-gradient(
      180deg,
      transparent 14%,
      rgb(0 0 0 / 35%) 14.5%,
      rgb(255 200 150 / 18%) 15.5%,
      transparent 16.5%,
      transparent 83.5%,
      rgb(0 0 0 / 35%) 84%,
      rgb(255 200 150 / 18%) 85%,
      transparent 86%
    ),
    linear-gradient(90deg, #2a0e07, #5a2313 25%, #7a321c 50%, #5a2313 75%, #2a0e07);
}

.turn-spine__title {
  writing-mode: vertical-rl;
  rotate: 180deg;
  font-family: var(--font-accent);
  font-size: calc(var(--thick) * 0.42);
  white-space: nowrap;
  color: #e8c477;
  text-shadow: 0 1px 0 rgb(0 0 0 / 60%);
}

/* Schnitt oben, unten und vorne: an der Einbandkante über die volle Buchdicke.
   Außen die Kanten der beiden Deckel (Leder), dazwischen die Papierlagen –
   so verschwinden die Deckel auch von der Seite gesehen nicht. */
.turn-head,
.turn-fore {
  --board: max(3px, calc(var(--thick) * 0.12));
  position: absolute;
  background:
    linear-gradient(
      var(--edge-dir),
      #3c160b 0,
      #6d2a17 calc(var(--board) * 0.5),
      #3c160b var(--board),
      rgb(0 0 0 / 35%) var(--board),
      transparent calc(var(--board) + 12%),
      transparent calc(100% - var(--board) - 12%),
      rgb(0 0 0 / 35%) calc(100% - var(--board)),
      #3c160b calc(100% - var(--board)),
      #6d2a17 calc(100% - var(--board) * 0.5),
      #3c160b 100%
    ),
    repeating-linear-gradient(var(--edge-dir), #e9dcc0 0 1px, #cdb994 1px 2px),
    #e2d1b2;
}

.turn-head {
  --edge-dir: 180deg; // Buchdicke liegt nach dem Kippen in der lokalen y-Richtung
  left: var(--cv-left);
  right: var(--cv-right);
  top: calc(var(--cv-top) - var(--thick) / 2);
  height: var(--thick);
  transform: rotateX(90deg);
}

.turn-head--tail {
  top: auto;
  bottom: calc(var(--cv-bottom) - var(--thick) / 2);
  transform: rotateX(-90deg);
}

.turn-fore {
  --edge-dir: 90deg;
  top: var(--cv-top);
  bottom: var(--cv-bottom);
  left: calc(100% - var(--cv-right) - var(--thick) / 2);
  width: var(--thick);
  transform: rotateY(90deg);
}

/* ---------------- Deckel und Rücken ---------------- */
.book__board {
  position: absolute;
  top: -2.2%;
  bottom: -2.6%;
  background:
    radial-gradient(ellipse 60% 40% at 30% 15%, rgb(255 200 150 / 10%), transparent),
    radial-gradient(ellipse 50% 40% at 70% 90%, rgb(0 0 0 / 25%), transparent),
    linear-gradient(180deg, #5e2414, #4a1b0f);
  box-shadow:
    inset 0 0 0 2px rgb(150 75 45 / 40%),
    inset 0 0 0 4px rgb(25 8 3 / 45%),
    inset 0 0 22px rgb(0 0 0 / 50%),
    0 5px 0 #2a0e06,
    0 6px 2px rgb(0 0 0 / 40%);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-image: var(--tex-leather);
    background-size: 240px;
    mix-blend-mode: soft-light;
    opacity: 0.6;
  }
}

.book__board--left {
  left: -2.4%;
  right: 50%;
  border-radius: 12px 3px 3px 12px;
}

.book__board--right {
  left: 50%;
  right: -2.4%;
  border-radius: 3px 12px 12px 3px;
}

.is-single .book__board--right {
  left: -1.4%;
  right: -3.2%;
  top: -2%;
  bottom: -2.4%;
  border-radius: 4px 10px 10px 4px;
}

.book__spine {
  position: absolute;
  top: -3%;
  bottom: -3.4%;
  left: 50%;
  width: 4.2%;
  translate: -50% 0;
  border-radius: 8px;
  background: linear-gradient(90deg, #2a0e07, #5a2313 25%, #7a321c 50%, #5a2313 75%, #2a0e07);
  box-shadow:
    0 5px 0 #200904,
    0 7px 3px rgb(0 0 0 / 40%);

  /* Kapitalband oben und unten */
  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 24%;
    right: 24%;
    height: 7px;
    border-radius: 4px;
    background:
      linear-gradient(180deg, rgb(255 255 255 / 25%), transparent 60%, rgb(0 0 0 / 30%)),
      repeating-linear-gradient(90deg, #9c2419 0 3px, #e3bd68 3px 6px);
    box-shadow: 0 1px 2px rgb(0 0 0 / 50%);
  }

  &::before {
    top: calc(2.9% - 6px);
  }

  &::after {
    bottom: calc(3.2% - 6px);
  }
}

/* Schatten, den das gehobene Blatt auf die Seiten darunter wirft */
.book__cast {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: calc(0.25 + var(--lift) * 0.75);
}

.book__cast--right {
  background: linear-gradient(
    90deg,
    rgb(30 18 6 / 18%) 0,
    rgb(30 18 6 / 18%) calc(var(--edge) * 100% - 1px),
    rgb(30 18 6 / 48%) calc(var(--edge) * 100%),
    rgb(30 18 6 / 14%) calc(var(--edge) * 100% + 6%),
    transparent calc(var(--edge) * 100% + 26%)
  );
}

.book__cast--left {
  background: linear-gradient(
    270deg,
    rgb(30 18 6 / 18%) 0,
    rgb(30 18 6 / 18%) calc(var(--edge) * 100% - 1px),
    rgb(30 18 6 / 48%) calc(var(--edge) * 100%),
    rgb(30 18 6 / 14%) calc(var(--edge) * 100% + 6%),
    transparent calc(var(--edge) * 100% + 26%)
  );
}

/* ---------------- Eselsohren ---------------- */
.dog-ear {
  position: absolute;
  bottom: 0;
  width: clamp(44px, 9%, 64px);
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  cursor: pointer;
  background: transparent;
  z-index: 2;
  -webkit-tap-highlight-color: transparent;

  &::before {
    content: '';
    position: absolute;
    width: 46%;
    height: 46%;
    transition:
      width 220ms ease-out,
      height 220ms ease-out;
  }

  &:hover::before {
    width: 62%;
    height: 62%;
  }
}

.dog-ear--next {
  right: 0;

  &::before {
    right: 0;
    bottom: 0;
    border-radius: 0 0 0.4rem 0;
    background: linear-gradient(315deg, transparent 0 48%, #c9b48c 50%, #f0e3c6 70%, #e0cda8);
    box-shadow: -2px -2px 4px rgb(60 40 15 / 30%);
  }
}

.dog-ear--prev {
  left: 0;

  &::before {
    left: 0;
    bottom: 0;
    border-radius: 0 0 0 0.4rem;
    background: linear-gradient(45deg, transparent 0 48%, #c9b48c 50%, #f0e3c6 70%, #e0cda8);
    box-shadow: 2px -2px 4px rgb(60 40 15 / 30%);
  }
}

.dog-ear.is-hinting::before {
  animation: ear-hint 2.8s ease-in-out 1.2s infinite;
}

@keyframes ear-hint {
  0%,
  70%,
  100% {
    width: 46%;
    height: 46%;
  }

  80% {
    width: 72%;
    height: 72%;
  }
}

/* ---------------- Steuerung ---------------- */
.book-controls {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-display);
  color: var(--text-muted);
}

.book-controls__arrow,
.book-controls__toc {
  display: grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: rgb(var(--accent-gold-rgb), 0.06);
  color: var(--accent-gold);
  cursor: pointer;
  transition:
    background-color 160ms ease-out,
    opacity 160ms ease-out;

  &:hover:not(:disabled) {
    background: rgb(var(--accent-gold-rgb), 0.16);
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-gold);
    outline-offset: 3px;
  }
}

.book-controls__arrow {
  font-size: 1.6rem;
  line-height: 1;
}

.book-controls__toc {
  padding: 0 18px;
  font-family: var(--font-display);
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.book-controls__label {
  min-width: 11ch;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-align: center;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .book,
  .dog-ear::before {
    transition: none;
    animation: none !important;
  }
}

@media (width <= 820px) {
  .book-controls__label {
    display: none;
  }
}
</style>

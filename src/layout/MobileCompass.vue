<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SiteFooter from './SiteFooter.vue';
import ThemeLantern from './ThemeLantern.vue';

interface CompassLink {
  to: string;
  label: string;
}

const props = defineProps<{ links: CompassLink[] }>();

const route = useRoute();
const router = useRouter();

// „Start“ ist der Anfang der Scrollseite auf dem Handy
const destinations = computed(() => [{ to: '/home', label: 'Start' }, ...props.links]);
const step = computed(() => 360 / destinations.value.length);

// --- Zifferblatt-Details (viewBox -100..100) -----------------------------------
const ticks = Array.from({ length: 144 }, (_, index) => {
  const deg = index * 2.5;
  const kind = deg % 30 === 0 ? 'major' : deg % 10 === 0 ? 'mid' : 'minor';
  return { deg, kind, y2: kind === 'major' ? -86.5 : kind === 'mid' ? -88 : -89.4 };
});
const knurls = Array.from({ length: 120 }, (_, index) => index * 3);
const cardinals: Record<number, string> = { 0: 'N', 90: 'O', 180: 'S', 270: 'W' };
const scaleNumbers = Array.from({ length: 12 }, (_, index) => {
  const deg = index * 30;
  return { deg, text: cardinals[deg] ?? String(deg), cardinal: deg in cardinals };
});
const screws = [45, 135, 225, 315].map((deg) => ({ deg, slot: deg * 1.7 + 20 }));
const guilloche = Array.from({ length: 12 }, (_, index) => index * 15);
const point = (length: number, width: number) => ({
  light: `0,0 0,${-length} ${width},${-width}`,
  dark: `0,0 0,${-length} ${-width},${-width}`,
});
const rosePoints = [
  ...[0, 90, 180, 270].map((deg) => ({ deg, tier: 'main', ...point(46, 7) })),
  ...[45, 135, 225, 315].map((deg) => ({ deg, tier: 'inter', ...point(34, 5.5) })),
  ...[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((deg) => ({
    deg,
    tier: 'minor',
    ...point(25, 3.5),
  })),
].reverse(); // kleine Spitzen zuerst zeichnen, Hauptspitzen liegen oben

const currentIndex = computed(() => destinations.value.findIndex((d) => d.to === route.path));

// --- Zustand ---------------------------------------------------------------
const isOpen = ref(false);
const progress = ref(0); // 0 = in der Ecke, 1 = mittig geöffnet
const isPulling = ref(false);
const isSteering = ref(false);
const needle = ref(Math.max(currentIndex.value, 0) * step.value); // ungewickelter Winkel
const selected = ref<number | null>(null);

const compassEl = ref<HTMLElement | null>(null);
const toggleEl = ref<HTMLButtonElement | null>(null);
const capEl = ref<HTMLButtonElement | null>(null);

// --- Geometrie ---------------------------------------------------------------
const PEEK_SIZE = 96; // Durchmesser in der Ecke (px)
const PEEK_INSET = 20; // Abstand Kompassmitte zur Ecke (px)
const geometry = ref({ size: 340, dx: 0, dy: 0, s0: 0.3 });

function measure() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const size = Math.round(Math.min(vw * 0.88, 380, vh * 0.62));
  geometry.value = {
    size,
    dx: vw / 2 - PEEK_INSET,
    dy: PEEK_INSET - vh / 2,
    s0: PEEK_SIZE / size,
  };
}

const compassStyle = computed(() => ({
  '--p': progress.value,
  '--size': `${geometry.value.size}px`,
  '--dx': `${geometry.value.dx}px`,
  '--dy': `${geometry.value.dy}px`,
  '--s0': geometry.value.s0,
  '--needle': `${needle.value}deg`,
}));

function labelStyle(index: number) {
  const rad = (index * step.value * Math.PI) / 180;
  return {
    left: `${50 + 31.5 * Math.sin(rad)}%`,
    top: `${50 - 31.5 * Math.cos(rad)}%`,
  };
}

// Ringsegment hinter dem gewählten Ziel (viewBox -100..100)
const sectorPath = computed(() => {
  const index = selected.value ?? (isOpen.value ? currentIndex.value : -1);
  if (index < 0) return '';
  const half = step.value / 2;
  const a0 = ((index * step.value - half - 90) * Math.PI) / 180;
  const a1 = ((index * step.value + half - 90) * Math.PI) / 180;
  const [r0, r1] = [50, 79];
  const p = (r: number, a: number) =>
    `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  return `M ${p(r0, a0)} L ${p(r1, a0)} A ${r1} ${r1} 0 0 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`;
});

// --- Nadel -------------------------------------------------------------------
const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

function pointNeedleAt(target: number) {
  needle.value += wrap(target - needle.value);
}

function resetNeedle() {
  selected.value = null;
  if (currentIndex.value >= 0) pointNeedleAt(currentIndex.value * step.value);
}

// --- Öffnen / Schließen --------------------------------------------------------
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let navigateTimer: number | undefined;

async function open() {
  measure();
  isOpen.value = true;
  progress.value = 1;
  await nextTick();
  capEl.value?.focus({ preventScroll: true });
}

function close({ restoreFocus = true } = {}) {
  const hadFocus = compassEl.value?.contains(document.activeElement);
  isOpen.value = false;
  progress.value = 0;
  resetNeedle();
  if (restoreFocus && hadFocus) toggleEl.value?.focus({ preventScroll: true });
}

function go(index: number) {
  const dest = destinations.value[index];
  if (!dest) return;
  selected.value = index;
  pointNeedleAt(index * step.value);
  window.clearTimeout(navigateTimer);

  const delay = prefersReducedMotion() ? 0 : 380;
  navigateTimer = window.setTimeout(() => {
    if (dest.to !== route.path) void router.push(dest.to);
    close({ restoreFocus: false });
  }, delay);
}

// --- Gesten --------------------------------------------------------------------
interface Gesture {
  id: number;
  mode: 'pull' | 'steer';
  startX: number;
  startY: number;
  moved: boolean;
  cx: number;
  cy: number;
  radius: number;
  lastX: number;
  lastY: number;
}

let gesture: Gesture | null = null;
let suppressClick = false;
let suppressTimer: number | undefined;
const DRAG_THRESHOLD = 8;

function swallowNextClick() {
  suppressClick = true;
  window.clearTimeout(suppressTimer);
  suppressTimer = window.setTimeout(() => (suppressClick = false), 400);
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (gesture) return;
  const el = compassEl.value;
  if (!el) return;

  suppressClick = false;
  const rect = el.getBoundingClientRect();
  gesture = {
    id: event.pointerId,
    mode: isOpen.value ? 'steer' : 'pull',
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    radius: rect.width / 2,
    lastX: event.clientX,
    lastY: event.clientY,
  };
  if (!isOpen.value) measure();
}

function steerTo(x: number, y: number, g: Gesture) {
  const dx = x - g.cx;
  const dy = y - g.cy;
  if (Math.hypot(dx, dy) < g.radius * 0.15) return;

  const raw = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0° = Norden, im Uhrzeigersinn
  const count = destinations.value.length;
  const index = (((Math.round(raw / step.value) % count) + count) % count) as number;
  const diff = wrap(raw - index * step.value);
  const half = step.value / 2;
  // Magnetisch: nahe am Ziel wird die Abweichung gestaucht, am Sektorrand bleibt sie gleich.
  const pulled = Math.sign(diff) * Math.pow(Math.abs(diff) / half, 1.8) * half;

  if (selected.value !== index) {
    selected.value = index;
    navigator.vibrate?.(8);
  }
  pointNeedleAt(index * step.value + pulled);
}

function onPointerMove(event: PointerEvent) {
  const g = gesture;
  if (!g || g.id !== event.pointerId) return;
  g.lastX = event.clientX;
  g.lastY = event.clientY;

  if (!g.moved) {
    if (Math.hypot(event.clientX - g.startX, event.clientY - g.startY) < DRAG_THRESHOLD) return;
    g.moved = true;
    compassEl.value?.setPointerCapture(event.pointerId);
    if (g.mode === 'pull') isPulling.value = true;
    else isSteering.value = true;
  }

  if (g.mode === 'pull') {
    // Fortschritt entlang der Strecke Ecke -> Bildmitte
    const { dx, dy } = geometry.value;
    const len = Math.hypot(dx, dy) || 1;
    const along = ((event.clientX - g.startX) * -dx + (event.clientY - g.startY) * -dy) / len;
    progress.value = Math.min(1, Math.max(0, along / (len * 0.85)));
  } else {
    steerTo(event.clientX, event.clientY, g);
  }
}

function endGesture(event: PointerEvent, cancelled: boolean) {
  const g = gesture;
  if (!g || g.id !== event.pointerId) return;
  gesture = null;
  isPulling.value = false;
  isSteering.value = false;

  if (g.mode === 'pull') {
    swallowNextClick();
    if (cancelled) close();
    else if (!g.moved || progress.value > 0.28) void open();
    else close();
    return;
  }

  if (!g.moved) return; // normaler Tap: Klick auf Link / Deckel übernimmt
  swallowNextClick();

  const far = Math.hypot(g.lastX - g.cx, g.lastY - g.cy) >= g.radius * 0.15;
  if (!cancelled && far && selected.value !== null) go(selected.value);
  else resetNeedle();
}

function onClickCapture(event: MouseEvent) {
  if (!suppressClick) return;
  suppressClick = false;
  event.preventDefault();
  event.stopPropagation();
}

function onLinkClick(event: MouseEvent, index: number) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  go(index);
}

// --- Seiteneffekte -------------------------------------------------------------
watch(isOpen, (value) => {
  document.documentElement.style.overflow = value ? 'hidden' : '';
});

watch(currentIndex, () => {
  if (!isSteering.value) resetNeedle();
});

watch(
  () => route.fullPath,
  () => {
    if (isOpen.value) close({ restoreFocus: false });
  },
);

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) close();
}

const desktopQuery = typeof window !== 'undefined' ? window.matchMedia('(width > 900px)') : null;
function onDesktopChange(event: MediaQueryListEvent) {
  if (event.matches && isOpen.value) close({ restoreFocus: false });
}

onMounted(() => {
  measure();
  window.addEventListener('resize', measure);
  document.addEventListener('keydown', onKeydown);
  desktopQuery?.addEventListener('change', onDesktopChange);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', measure);
  document.removeEventListener('keydown', onKeydown);
  desktopQuery?.removeEventListener('change', onDesktopChange);
  window.clearTimeout(navigateTimer);
  window.clearTimeout(suppressTimer);
  document.documentElement.style.overflow = '';
});
</script>

<template>
  <div
    class="compass-nav"
    :class="{ 'is-open': isOpen, 'is-pulling': isPulling, 'is-steering': isSteering }"
    :style="compassStyle"
  >
    <div class="compass-nav__veil" aria-hidden="true" @click="close()" />

    <div
      id="compass-nav"
      ref="compassEl"
      class="compass"
      :role="isOpen ? 'dialog' : undefined"
      :aria-modal="isOpen ? 'true' : undefined"
      :aria-label="isOpen ? 'Navigation' : undefined"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endGesture($event, false)"
      @pointercancel="endGesture($event, true)"
      @click.capture="onClickCapture"
    >
      <!-- Bügel zum Aufhängen -->
      <svg class="compass__bow" viewBox="-20 -30 40 34" aria-hidden="true">
        <ellipse class="compass__bow-ring" cx="0" cy="-17" rx="11" ry="10" />
        <rect class="compass__bow-stem" x="-6" y="-8" width="12" height="11" rx="2" />
        <g class="compass__bow-grip">
          <line v-for="x in [-4, -2, 0, 2, 4]" :key="x" :x1="x" :x2="x" y1="-7" y2="2" />
        </g>
      </svg>

      <div class="compass__bezel" aria-hidden="true" />

      <svg class="compass__dial" viewBox="-100 -100 200 200" aria-hidden="true">
        <defs>
          <radialGradient id="compass-face" cx="50%" cy="40%" r="60%">
            <stop offset="0%" class="compass__face-light" />
            <stop offset="100%" class="compass__face-dark" />
          </radialGradient>
          <filter id="compass-grain" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.4  0 0 0 0 0.25  0 0 0 0.55 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          <radialGradient id="compass-vignette">
            <stop offset="80%" stop-color="#000" stop-opacity="0" />
            <stop offset="100%" stop-color="#000" stop-opacity=".38" />
          </radialGradient>
          <clipPath id="compass-face-clip"><circle r="93" /></clipPath>
        </defs>

        <!-- Rändelung der Lünette -->
        <g class="compass__knurl">
          <line
            v-for="deg in knurls"
            :key="deg"
            y1="-99.6"
            y2="-96.4"
            :transform="`rotate(${deg})`"
          />
        </g>
        <circle class="compass__groove" r="95" />

        <!-- Schrauben -->
        <g
          v-for="screw in screws"
          :key="screw.deg"
          :transform="`rotate(${screw.deg}) translate(0 -96.6)`"
        >
          <circle class="compass__screw" r="1.9" />
          <line
            class="compass__screw-slot"
            x1="-1.4"
            x2="1.4"
            :transform="`rotate(${screw.slot})`"
          />
        </g>

        <!-- Zifferblatt -->
        <circle r="93" fill="url(#compass-face)" />
        <g clip-path="url(#compass-face-clip)">
          <circle class="compass__grain" r="93" filter="url(#compass-grain)" />
          <circle class="compass__vignette" r="93" />
        </g>

        <!-- Gradskala -->
        <circle class="compass__ring compass__ring--strong" r="91" />
        <g class="compass__ticks">
          <line
            v-for="tick in ticks"
            :key="tick.deg"
            y1="-91"
            :y2="tick.y2"
            :class="tick.kind"
            :transform="`rotate(${tick.deg})`"
          />
        </g>
        <circle class="compass__ring" r="86" />
        <g class="compass__numbers">
          <text
            v-for="num in scaleNumbers"
            :key="num.deg"
            :class="{ cardinal: num.cardinal }"
            :transform="`rotate(${num.deg}) translate(0 -82.4)`"
          >
            {{ num.text }}
          </text>
        </g>
        <circle class="compass__ring compass__ring--strong" r="79" />
        <circle class="compass__ring" r="77.6" />

        <!-- Zielfelder -->
        <path v-if="sectorPath" class="compass__sector" :d="sectorPath" />
        <g class="compass__dividers">
          <g
            v-for="(_, index) in destinations"
            :key="index"
            :transform="`rotate(${index * step + step / 2})`"
          >
            <line y1="-51.5" y2="-77.6" />
            <path class="compass__divider-gem" d="M0,-80.6 L1.6,-78.3 L0,-76 L-1.6,-78.3 Z" />
          </g>
        </g>

        <!-- innerer Ring mit Perlen -->
        <circle class="compass__ring compass__ring--strong" r="50" />
        <circle class="compass__beads" r="48.4" />

        <!-- Guilloche + Windrose -->
        <g class="compass__guilloche">
          <ellipse
            v-for="deg in guilloche"
            :key="deg"
            rx="44"
            ry="14"
            :transform="`rotate(${deg})`"
          />
        </g>
        <circle class="compass__ring compass__ring--dotted" r="30" />
        <g class="compass__rose">
          <g
            v-for="rp in rosePoints"
            :key="rp.deg"
            :class="rp.tier"
            :transform="`rotate(${rp.deg})`"
          >
            <polygon class="light" :points="rp.light" />
            <polygon class="dark" :points="rp.dark" />
          </g>
        </g>
      </svg>

      <div class="compass__needle" aria-hidden="true">
        <svg viewBox="-100 -100 200 200">
          <g class="compass__needle-swing">
            <polygon class="compass__needle-north-light" points="0,-64 8,-4 0,0" />
            <polygon class="compass__needle-north-dark" points="0,-64 -8,-4 0,0" />
            <polygon class="compass__needle-south-light" points="0,50 -7,4 0,0" />
            <polygon class="compass__needle-south-dark" points="0,50 7,4 0,0" />
            <path class="compass__needle-tip" d="M0,-64 L2.6,-45 L0,-48 L-2.6,-45 Z" />
            <circle class="compass__needle-weight" cy="36" r="3.4" />
          </g>
        </svg>
      </div>

      <nav class="compass__labels" aria-label="Hauptnavigation" :inert="!isOpen">
        <RouterLink
          v-for="(dest, index) in destinations"
          :key="dest.to"
          v-slot="{ href, isExactActive }"
          :to="dest.to"
          custom
        >
          <a
            :href="href"
            class="compass__label"
            :class="{ active: isExactActive, selected: selected === index }"
            :aria-current="isExactActive ? 'page' : undefined"
            :style="labelStyle(index)"
            @click="onLinkClick($event, index)"
          >
            {{ dest.label }}
          </a>
        </RouterLink>
      </nav>

      <svg class="compass__glass" viewBox="-100 -100 200 200" aria-hidden="true">
        <defs>
          <linearGradient id="compass-glare" x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stop-color="#fff" stop-opacity=".34" />
            <stop offset="55%" stop-color="#fff" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path d="M-80,-38 A88,88 0 0 1 38,-80 A96,96 0 0 0 -80,-38 Z" fill="url(#compass-glare)" />
        <path class="compass__glass-arc" d="M58,62 A86,86 0 0 1 20,84" />
        <circle class="compass__glass-edge" r="92.6" />
      </svg>

      <button
        ref="capEl"
        class="compass__cap"
        type="button"
        aria-label="Navigation schließen"
        :inert="!isOpen"
        @click="close()"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 7l10 10M17 7L7 17" />
        </svg>
      </button>

      <button
        v-show="!isOpen"
        ref="toggleEl"
        class="compass__toggle"
        type="button"
        aria-label="Navigation öffnen"
        aria-controls="compass-nav"
        :aria-expanded="isOpen"
        @click="open()"
      />
    </div>

    <!-- Bei geöffnetem Kompass ist der Footer unten eingeblendet (Impressum, Datenschutz, Instagram) -->
    <!-- in den body verschoben: der Kompass selbst ist transformiert, darin würde
         „position: fixed“ nicht am Bildschirmrand kleben -->
    <Teleport to="body">
      <Transition name="compass-footer">
        <SiteFooter v-if="isOpen" class="compass-footer" />
      </Transition>
      <!-- Laterne für Hell/Dunkel – auf dem Handy nur hier erreichbar -->
      <Transition name="compass-lantern">
        <ThemeLantern v-if="isOpen" in-compass />
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
/* Footer über dem Schleier des geöffneten Kompasses, unten am Bildschirmrand
   (Klasse dreifach: muss die Footer-eigene Positionierung „is-mobile“ schlagen) */
.compass-footer.compass-footer.compass-footer {
  position: fixed;
  inset: auto 0 0;
  z-index: 42;
  margin: 0;
  background: color-mix(in srgb, var(--color-night) 88%, transparent);
}

.compass-lantern-enter-active,
.compass-lantern-leave-active {
  transition:
    opacity 260ms ease,
    translate 420ms cubic-bezier(0.3, 1.3, 0.5, 1);
}

.compass-lantern-enter-from,
.compass-lantern-leave-to {
  opacity: 0;
  translate: 0 -60px;
}

.compass-footer-enter-active,
.compass-footer-leave-active {
  transition:
    opacity 260ms ease,
    translate 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.compass-footer-enter-from,
.compass-footer-leave-to {
  opacity: 0;
  translate: 0 100%;
}

@media (prefers-reduced-motion: reduce) {
  .compass-footer-enter-active,
  .compass-footer-leave-active {
    transition: none;
  }
}

.compass-nav {
  --compass-face-light: #2a2316;
  --compass-face-dark: #0a0806;
  --compass-ink: rgb(var(--accent-gold-rgb), 0.55);
  --compass-ink-strong: var(--accent-gold);
  --compass-sector: rgb(var(--accent-gold-rgb), 0.2);
  --compass-rose-light: rgb(var(--accent-gold-rgb), 0.85);
  --compass-rose-dark: rgb(70 48 20 / 90%);
  --compass-rose-edge: rgb(var(--accent-gold-rgb), 0.9);
  --compass-grain: 0.35;
  --compass-veil: rgb(4 6 4 / 45%);
  --compass-ease: cubic-bezier(0.3, 1.22, 0.5, 1);
  display: none;
}

:root[data-theme='light'] .compass-nav {
  --compass-face-light: #fdfbf6;
  --compass-face-dark: #e4dccb;
  --compass-ink: rgb(var(--accent-gold-rgb), 0.5);
  --compass-sector: rgb(var(--accent-gold-rgb), 0.16);
  --compass-rose-light: rgb(var(--accent-gold-rgb), 0.55);
  --compass-rose-dark: rgb(var(--accent-gold-rgb), 0.9);
  --compass-rose-edge: rgb(var(--accent-gold-rgb), 0.7);
  --compass-grain: 0.5;
  --compass-veil: rgb(240 244 250 / 40%);
}

@media (width <= 900px) {
  .compass-nav {
    display: block;
  }
}

.compass-nav__veil {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: var(--compass-veil);
  backdrop-filter: blur(9px) saturate(0.85);
  -webkit-backdrop-filter: blur(9px) saturate(0.85);
  opacity: var(--p);
  pointer-events: none;
  transition: opacity 420ms ease-out;
}

.is-open .compass-nav__veil {
  pointer-events: auto;
}

.compass {
  --rest: calc(1 - var(--p));
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 41;
  width: var(--size);
  height: var(--size);
  margin: calc(var(--size) / -2) 0 0 calc(var(--size) / -2);
  border-radius: 50%;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transform: translate(
      calc(var(--dx) * var(--rest)),
      calc((var(--dy) + env(safe-area-inset-top, 0px)) * var(--rest))
    )
    rotate(calc(-150deg * var(--rest))) scale(calc(var(--s0) + (1 - var(--s0)) * var(--p)));
  filter: drop-shadow(0 calc(4px + 14px * var(--p)) calc(6px + 22px * var(--p)) rgb(0 0 0 / 50%));
  transition: transform 620ms var(--compass-ease);
  will-change: transform;
}

.is-pulling .compass,
.is-pulling .compass-nav__veil {
  transition: none;
}

.compass__bezel,
.compass__dial,
.compass__glass,
.compass__needle,
.compass__needle svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

/* Messing-Lünette: konischer Verlauf wirkt wie gebürstetes Metall */
.compass__bezel {
  border-radius: 50%;
  background: conic-gradient(
    from 210deg,
    #6b4a25,
    #f6d690 8%,
    #b88a4d 16%,
    #5a3c1f 27%,
    #d9ab64 40%,
    #fff0c4 46%,
    #a77a42 54%,
    #4d331a 66%,
    #c99a57 78%,
    #f3cf88 88%,
    #6b4a25
  );
  box-shadow:
    inset 0 0 0 1px rgb(255 232 180 / 45%),
    inset 0 -3px 6px rgb(30 18 6 / 55%),
    inset 0 3px 5px rgb(255 240 200 / 35%);
}

.compass__bow {
  position: absolute;
  left: 50%;
  bottom: 100%;
  width: 17%;
  translate: -50% 13%;
  overflow: visible;
  pointer-events: none;
  opacity: calc(var(--p) * 2.5 - 1.5);
}

.compass__bow-ring {
  fill: none;
  stroke: #b88a4d;
  stroke-width: 3.4;
}

.compass__bow-stem {
  fill: #a77a42;
  stroke: #4d331a;
  stroke-width: 0.8;
}

.compass__bow-grip line {
  stroke: #f3cf88;
  stroke-width: 0.8;
  opacity: 0.8;
}

.compass__knurl line {
  stroke: #3d2812;
  stroke-width: 1.1;
  opacity: 0.55;
}

.compass__groove {
  fill: none;
  stroke: #2c1c0b;
  stroke-width: 1.4;
  opacity: 0.7;
}

.compass__screw {
  fill: #d9ab64;
  stroke: #4d331a;
  stroke-width: 0.5;
}

.compass__screw-slot {
  stroke: #3d2812;
  stroke-width: 0.6;
}

.compass__face-light {
  stop-color: var(--compass-face-light);
}

.compass__face-dark {
  stop-color: var(--compass-face-dark);
}

.compass__grain {
  opacity: var(--compass-grain);
  mix-blend-mode: overlay;
}

.compass__vignette {
  fill: url(#compass-vignette);
}

.compass__ticks line {
  stroke: var(--compass-ink);
  stroke-width: 0.45;
}

.compass__ticks line.mid {
  stroke-width: 0.7;
}

.compass__ticks line.major {
  stroke: var(--compass-ink-strong);
  stroke-width: 1.1;
}

.compass__numbers text {
  fill: var(--compass-ink-strong);
  font-family: var(--font-display);
  font-size: 4.6px;
  font-weight: 600;
  letter-spacing: 0.2px;
  text-anchor: middle;
  dominant-baseline: central;
  opacity: 0.85;
}

.compass__numbers text.cardinal {
  fill: var(--accent-ember);
  font-size: 6.4px;
  font-weight: 700;
  opacity: 1;
}

.compass__ring {
  fill: none;
  stroke: var(--compass-ink);
  stroke-width: 0.4;
}

.compass__ring--strong {
  stroke: var(--compass-ink-strong);
  stroke-width: 0.8;
}

.compass__ring--dotted {
  stroke-width: 0.6;
  stroke-dasharray: 0.2 2.4;
  stroke-linecap: round;
}

.compass__beads {
  fill: none;
  stroke: var(--compass-ink-strong);
  stroke-width: 1.3;
  stroke-dasharray: 0.1 3.04;
  stroke-linecap: round;
}

.compass__dividers line {
  stroke: var(--compass-ink);
  stroke-width: 0.4;
  stroke-dasharray: 1.5 2;
}

.compass__divider-gem {
  fill: var(--compass-ink-strong);
}

.compass__sector {
  fill: var(--compass-sector);
  stroke: rgb(var(--accent-gold-rgb), 0.55);
  stroke-width: 0.6;
  opacity: calc(var(--p) * 2 - 1);
  transition: opacity 200ms ease-out;
}

.compass__guilloche ellipse {
  fill: none;
  stroke: var(--compass-ink);
  stroke-width: 0.3;
  opacity: 0.45;
}

.compass__rose .light {
  fill: var(--compass-rose-light);
}

.compass__rose .dark {
  fill: var(--compass-rose-dark);
}

.compass__rose polygon {
  stroke: var(--compass-rose-edge);
  stroke-width: 0.35;
  stroke-linejoin: round;
}

.compass__rose .inter polygon {
  opacity: 0.8;
}

.compass__rose .minor polygon {
  opacity: 0.6;
}

.compass__glass-arc {
  fill: none;
  stroke: rgb(255 255 255 / 22%);
  stroke-width: 1.2;
  stroke-linecap: round;
}

.compass__glass-edge {
  fill: none;
  stroke: rgb(255 255 255 / 14%);
  stroke-width: 0.6;
}

.compass__needle {
  transform: rotate(var(--needle));
  transition: transform 520ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.is-steering .compass__needle {
  transition: transform 70ms linear;
}

.compass__needle-swing {
  animation: needle-idle 3.2s ease-in-out infinite;
}

.is-open .compass__needle-swing,
.is-pulling .compass__needle-swing {
  animation: none;
}

.compass__needle svg {
  filter: drop-shadow(1.5px 3px 2px rgb(0 0 0 / 45%));
}

.compass__needle-north-light {
  fill: #d4643a;
}

.compass__needle-north-dark {
  fill: #8e2f17;
}

.compass__needle-south-light {
  fill: #eee8da;
}

.compass__needle-south-dark {
  fill: #9d9585;
}

.compass__needle-tip {
  fill: #ffcf9a;
  opacity: 0.85;
}

.compass__needle-weight {
  fill: none;
  stroke: #c99a57;
  stroke-width: 1.6;
}

.compass__labels {
  position: absolute;
  inset: 0;
  opacity: calc(var(--p) * 3 - 2);
  transition: opacity 260ms ease-out;
}

.compass__label {
  position: absolute;
  translate: -50% -50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0 0.35rem;
  color: var(--nav-link-color);
  font-family: var(--font-accent);
  font-size: clamp(0.9rem, 4.1vw, 1.18rem);
  font-weight: bold;
  text-decoration: none;
  white-space: nowrap;
  text-shadow: var(--nav-link-shadow);
  transition:
    color 180ms ease-out,
    scale 220ms cubic-bezier(0.34, 1.56, 0.64, 1),
    filter 180ms ease-out;
}

.compass__label.active {
  color: var(--nav-active-color);
  text-shadow: var(--nav-active-shadow);
}

.compass__label.selected,
.compass__label:focus-visible {
  scale: 1.1;
  color: var(--nav-active-color);
  filter: drop-shadow(0 0 7px var(--nav-hover-glow));
}

.compass__label:focus-visible,
.compass__cap:focus-visible,
.compass__toggle:focus-visible {
  outline: 2px solid var(--accent-gold);
  outline-offset: 3px;
}

.compass__cap {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 15%;
  aspect-ratio: 1;
  translate: -50% -50%;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgb(255 240 200 / 80%), transparent 38%),
    repeating-radial-gradient(circle, rgb(60 38 16 / 0%) 0 1.5px, rgb(60 38 16 / 28%) 1.5px 2.2px),
    conic-gradient(from 200deg, #f6d690, #a77a42, #5a3c1f, #d9ab64, #fff0c4, #8a6233, #f6d690);
  box-shadow:
    inset 0 0 0 1.5px rgb(58 38 20 / 70%),
    inset 0 0 0 3px rgb(255 232 180 / 35%),
    0 3px 8px rgb(0 0 0 / 55%);
  cursor: pointer;
}

.compass__cap svg {
  width: 45%;
  height: 45%;
  fill: none;
  stroke: #2d1d0e;
  stroke-width: 2.6;
  stroke-linecap: round;
  opacity: calc(var(--p) * 2 - 1);
}

.compass__toggle {
  position: absolute;
  inset: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

@keyframes needle-idle {
  0%,
  100% {
    transform: rotate(-7deg);
  }

  50% {
    transform: rotate(7deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .compass,
  .compass-nav__veil,
  .compass__needle,
  .compass__labels,
  .compass__label {
    transition: none;
  }

  .compass__needle-swing {
    animation: none;
  }
}
</style>

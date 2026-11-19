<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { hex, type RGB } from './canvasUtils';
import { DriveScene, type Phase } from './driveScene';
import SpotifyPlayer, { type SpotifyTrack } from './SpotifyPlayer.vue';

/**
 * Songs pro Szene. start/end = abgespieltes Zeitfenster in Sekunden,
 * nach end geht es wieder bei start los (end weglassen = bis zum Songende).
 */
const SONGS: Record<'shire' | 'coast', SpotifyTrack> = {
  // Auenland: ab 0:03 bis zum Ende
  shire: { uri: 'spotify:track:644es5aYPJghtZLjM1rmSP', start: 3 },
  // Neon Coast: 1:04 – 1:50 in Schleife
  coast: { uri: 'spotify:track:4HCOHRCSQelz2GPX8iTamO', start: 64, end: 110 },
};

const DEFAULT_ACCENTS: [string, string] = ['#ff3fa4', '#3ff0ff'];

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const sign = ref<HTMLElement | null>(null);
const bikeButton = ref<HTMLButtonElement | null>(null);

const phase = ref<Phase>('shire');
const offerVisible = ref(false);
/** 0 = Tag bzw. Sunset, 1 = Nacht */
const nightLevel = ref(0);
const isNight = computed({
  get: () => nightLevel.value > 0.5,
  set: (value: boolean) => (nightLevel.value = value ? 1 : 0),
});
const accentHex = DEFAULT_ACCENTS;
const atCoast = computed(() => phase.value === 'neon');
const song = computed(() =>
  phase.value === 'neon' || phase.value === 'ride' ? SONGS.coast : SONGS.shire,
);
const musicOpen = ref(false);
const spotifyPlaying = ref(false);
const spotify = ref<InstanceType<typeof SpotifyPlayer> | null>(null);

const sceneLabel = computed(() =>
  phase.value === 'neon' || phase.value === 'ride'
    ? 'Ein grauer Zauberer mit Spitzhut fährt auf einem Motorrad über eine Neon-Küstenstraße mit Palmen und Skyline'
    : 'Ein grauer Zauberer mit Spitzhut fährt mit seiner Pferdekutsche über einen Feldweg durch grüne Hügel mit runden Türen',
);

let scene: DriveScene | null = null;
let raf = 0;
let running = false;
let lastFrame = 0;
let time = 0;
let night = 0;
/** Zeitpunkt des nächsten automatischen Feuerwerks an der nächtlichen Küste */
let nextAutoBurst = 0;
let motion = true;
const pointer = { x: 0, tx: 0 };
const accentA: RGB = hex(DEFAULT_ACCENTS[0]);
const accentB: RGB = hex(DEFAULT_ACCENTS[1]);

let resizeObserver: ResizeObserver | null = null;
let visibilityObserver: IntersectionObserver | null = null;
let motionQuery: MediaQueryList | null = null;

function frame(now: number) {
  if (!running) return;
  raf = requestAnimationFrame(frame);
  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
  lastFrame = now;
  time += dt;

  const ease = Math.min(1, dt * 1.3);
  night += (nightLevel.value - night) * ease;
  pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 4);

  // sanftes Pulsieren der Neonlichter, etwas lebhafter, solange Musik läuft
  const pulse = (0.5 + 0.5 * Math.sin(time * (spotifyPlaying.value ? 4.2 : 2))) ** 2 * 0.7;

  // nachts steigt an der Küste alle paar Sekunden ein Feuerwerk auf
  if (atCoast.value && night > 0.6 && time >= nextAutoBurst) {
    scene?.randomBurst([accentA, accentB]);
    nextAutoBurst = time + 3 + Math.random() * 2;
  }

  scene?.render({ time, dt, night, steer: pointer.x, pulse, accentA, accentB, motion });

  sign.value?.style.setProperty('--pulse', pulse.toFixed(3));
  if (scene && bikeButton.value) {
    const r = scene.offerRect;
    Object.assign(bikeButton.value.style, {
      left: `${r.x}px`,
      top: `${r.y}px`,
      width: `${r.w}px`,
      height: `${r.h}px`,
    });
  }
}

function start() {
  if (running) return;
  running = true;
  lastFrame = 0;
  raf = requestAnimationFrame(frame);
}

function stop() {
  running = false;
  cancelAnimationFrame(raf);
}

function resize() {
  if (!root.value || !canvas.value || !scene) return;
  const { width, height } = root.value.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.value.width = Math.round(width * dpr);
  canvas.value.height = Math.round(height * dpr);
  scene.resize(width, height, dpr);
}

function onPointerMove(event: PointerEvent) {
  if (!root.value) return;
  const rect = root.value.getBoundingClientRect();
  pointer.tx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  // über dem eigenen Fahrzeug zeigt der Zeiger an, dass man Gas geben kann
  if (canvas.value && scene) {
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const clickable = scene.isOnPlayer(x, y) || scene.isOnCave(x, y);
    canvas.value.style.cursor = clickable ? 'pointer' : '';
  }
}

function onPointerLeave() {
  pointer.tx = 0;
}

/** gedrückt halten aufs eigene Fahrzeug = Gas geben, sonst Feuerwerk */
function onCanvasDown(event: PointerEvent) {
  if (!canvas.value || !scene) return;
  const rect = canvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (scene.isOnCave(x, y)) {
    scene.launchDragon();
    return;
  }
  if (scene.isOnPlayer(x, y)) {
    scene.throttle = true;
    canvas.value.setPointerCapture?.(event.pointerId);
    return;
  }
  scene.burst(x, y, atCoast.value ? [accentA, accentB] : undefined);
}

function releaseThrottle() {
  if (scene) scene.throttle = false;
}

/** ♪-Button: beim Aufklappen startet die Musik gleich mit (der Klick erlaubt das Abspielen) */
function toggleMusic() {
  musicOpen.value = !musicOpen.value;
  if (musicOpen.value) spotify.value?.play();
}

function onSpotifyPlaying(playing: boolean) {
  spotifyPlaying.value = playing;
}

/** Klick aufs abgestellte Fahrzeug: Motorrad im Grünen, Kutsche an der Neon Coast */
function mount() {
  if (atCoast.value) {
    backToShire();
    return;
  }
  scene?.ride();
}

function backToShire() {
  scene?.rideBack();
}

/* ---------- Vollbild ---------- */
type FullscreenDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => void;
};
type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => void };

const doc = document as FullscreenDoc;
/** echtes Vollbild über die Fullscreen-API */
const nativeFullscreen = ref(false);
/** Ersatz, wo die API fehlt (iPhone-Safari): Szene füllt per CSS das Fenster */
const pseudoFullscreen = ref(false);
const isFullscreen = computed(() => nativeFullscreen.value || pseudoFullscreen.value);

function onFullscreenChange() {
  nativeFullscreen.value = (doc.fullscreenElement ?? doc.webkitFullscreenElement) === root.value;
}

function toggleFullscreen() {
  if (pseudoFullscreen.value) {
    pseudoFullscreen.value = false;
    return;
  }
  if (nativeFullscreen.value) {
    if (doc.exitFullscreen) void doc.exitFullscreen();
    else doc.webkitExitFullscreen?.();
    return;
  }
  const el = root.value as FullscreenEl | null;
  if (!el) return;
  const enabled = doc.fullscreenEnabled || doc.webkitFullscreenEnabled;
  if (enabled && el.requestFullscreen) {
    el.requestFullscreen().catch(() => (pseudoFullscreen.value = true));
  } else if (enabled && el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  } else {
    pseudoFullscreen.value = true;
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && pseudoFullscreen.value) pseudoFullscreen.value = false;
}

function onMotionChange() {
  motion = !motionQuery?.matches;
}

onMounted(() => {
  const ctx = canvas.value?.getContext('2d');
  if (!ctx || !root.value) return;
  scene = new DriveScene(ctx);
  scene.onPhase = (p) => (phase.value = p);
  scene.onOffer = (visible) => (offerVisible.value = visible);

  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  onMotionChange();
  motionQuery.addEventListener('change', onMotionChange);

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root.value);
  resize();

  // nur animieren, solange die Szene sichtbar ist
  visibilityObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) start();
    else stop();
  });
  visibilityObserver.observe(root.value);

  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  stop();
  resizeObserver?.disconnect();
  visibilityObserver?.disconnect();
  motionQuery?.removeEventListener('change', onMotionChange);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <!-- im Ersatz-Vollbild direkt in den body, damit kein Elternelement die Szene einschränkt -->
  <Teleport to="body" :disabled="!pseudoFullscreen">
  <div
    ref="root"
    class="neon"
    :class="[`is-${phase}`, { 'is-fullscreen': pseudoFullscreen }]"
    :style="{ '--neon-a': accentHex[0], '--neon-b': accentHex[1] }"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <canvas
      ref="canvas"
      class="neon__canvas"
      role="img"
      :aria-label="sceneLabel"
      @pointerdown="onCanvasDown"
      @pointerup="releaseThrottle"
      @pointercancel="releaseThrottle"
      @lostpointercapture="releaseThrottle"
    ></canvas>

    <div
      ref="sign"
      class="neon__sign"
      :class="{ 'is-visible': atCoast, 'is-lit': atCoast && isNight }"
      aria-hidden="true"
    >
      <span class="logo logo--coast"><span class="logo__outline"></span></span>
    </div>

    <div v-if="!atCoast" class="neon__chapter" :class="{ 'is-night': isNight }" aria-hidden="true">
      <span class="logo logo--shire"></span>
    </div>

    <div class="music" :class="{ 'is-open': musicOpen }">
      <div class="music__buttons">
      <button type="button" class="corner-btn" :aria-pressed="isFullscreen" @click="toggleFullscreen">
        <svg v-if="!isFullscreen" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" />
        </svg>
        <span class="sr-only">{{ isFullscreen ? 'Vollbild beenden' : 'Vollbild' }}</span>
      </button>
      <button
        type="button"
        class="corner-btn music__toggle"
        :class="{ 'is-playing': spotifyPlaying }"
        :aria-expanded="musicOpen"
        aria-controls="playground-music"
        @click="toggleMusic"
      >
        <span aria-hidden="true">♪</span>
        <span class="sr-only">Musik {{ musicOpen ? 'ausblenden' : 'einblenden' }}</span>
      </button>
      </div>
      <!-- bleibt eingebunden, damit die Musik beim Zuklappen weiterläuft -->
      <div id="playground-music" class="music__panel" :inert="!musicOpen">
        <SpotifyPlayer ref="spotify" :track="song" @playing="onSpotifyPlaying" />
      </div>
    </div>

    <button v-if="offerVisible" ref="bikeButton" type="button" class="neon__bike" @click="mount">
      <span class="sr-only">
        {{
          atCoast
            ? 'in die Kutsche steigen und zurück ins Grüne fahren'
            : 'aufs Motorrad steigen und zur Neon Coast fahren'
        }}
      </span>
    </button>

    <!-- Tag/Nacht im Grünen: kleiner Holzwegweiser -->
    <div v-if="phase === 'shire'" class="daynight-sign" role="group" aria-label="Tageszeit">
      <span class="daynight-sign__post" aria-hidden="true"></span>
      <button
        type="button"
        class="daynight-sign__plank daynight-sign__plank--day"
        :aria-pressed="!isNight"
        aria-label="Tag"
        @click="isNight = false"
      >
        <span aria-hidden="true">☀</span>
      </button>
      <button
        type="button"
        class="daynight-sign__plank daynight-sign__plank--night"
        :aria-pressed="isNight"
        aria-label="Nacht"
        @click="isNight = true"
      >
        <span aria-hidden="true">☾</span>
      </button>
    </div>

    <!-- Tag/Nacht an der Küste: Drehschalter wie im Armaturenbrett, Klick schaltet um -->
    <button
      v-if="phase === 'neon'"
      type="button"
      class="dash-knob"
      role="switch"
      :aria-checked="isNight"
      aria-label="Nachtmodus"
      @click="isNight = !isNight"
    >
      <span class="dash-knob__icon dash-knob__icon--day" aria-hidden="true">☀</span>
      <span class="dash-knob__icon dash-knob__icon--night" aria-hidden="true">☾</span>
      <span class="dash-knob__dial" aria-hidden="true">
        <span class="dash-knob__cap"></span>
      </span>
    </button>

  </div>
  </Teleport>
</template>

<style scoped lang="scss">
.neon {
  --pulse: 0;

  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  min-height: 420px;
  max-height: 82vh;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid rgb(255 255 255 / 12%);
  background: #12081e;
  box-shadow:
    0 0 80px rgb(255 63 164 / 12%),
    0 40px 80px rgb(0 0 0 / 60%);
  touch-action: pan-y;
  user-select: none;
  transition: box-shadow 1.2s ease;

  &.is-shire,
  &.is-offer {
    box-shadow:
      0 0 80px rgb(140 200 90 / 12%),
      0 40px 80px rgb(0 0 0 / 60%);
  }
}

.neon__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}

/* ---------- Namens-Logos (einfarbige SVGs als Maske, Farbe kommt aus CSS) ---------- */
.logo {
  position: relative;
  display: block;
  overflow: hidden;
  background-color: var(--logo-color);
  /* stylelint-disable-next-line property-no-vendor-prefix -- ältere Safari brauchen das Präfix */
  -webkit-mask: var(--logo-src) no-repeat;
  -webkit-mask-size: var(--logo-mask-size);
  -webkit-mask-position: var(--logo-mask-pos);
  mask: var(--logo-src) no-repeat;
  mask-size: var(--logo-mask-size);
  mask-position: var(--logo-mask-pos);
  transition: background-color 1.2s ease;

  /* zweite Farbschicht, die nachts eingeblendet wird */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--logo-night, transparent);
    opacity: 0;
    transition: opacity 1.2s ease;
  }
}

/* Maske auf den eigentlichen Schriftzug zugeschnitten (Rand im viewBox weg) */
.logo--shire {
  --logo-src: url('/assets/logos/erwin-holzhauser-elbisch-verziert-transparent.svg');
  --logo-mask-size: 107.74% 151.25%;
  --logo-mask-pos: 46.15% 45.38%;

  width: clamp(130px, 19vw, 260px);
  aspect-ratio: 1344 / 718;
}

/* Neon Coast: weiß gefüllte Silhouette, darüber der Umriss als eigene Ebene */
.logo--coast {
  --logo-src: url('/assets/logos/erwin-holz-hauser-fill.svg');
  --logo-mask-size: 107.18% 123.18%;
  --logo-mask-pos: 53.57% 54.66%;

  width: clamp(90px, 12vw, 165px);
  aspect-ratio: 1170 / 1018;
  /* tagsüber weiß, nachts Neonfarben mit Türkis in der Mitte */
  --logo-color: #fff;
  --logo-night: linear-gradient(160deg, var(--neon-a) 10%, #1de9c3 50%, var(--neon-b) 90%);
}

.logo__outline {
  --logo-src: url('/assets/logos/erwin-holz-hauser-transparent.svg');

  position: absolute;
  z-index: 1;
  inset: 0;
  background: var(--logo-outline);
  /* stylelint-disable-next-line property-no-vendor-prefix -- ältere Safari brauchen das Präfix */
  -webkit-mask: var(--logo-src) no-repeat;
  -webkit-mask-size: var(--logo-mask-size);
  -webkit-mask-position: var(--logo-mask-pos);
  mask: var(--logo-src) no-repeat;
  mask-size: var(--logo-mask-size);
  mask-position: var(--logo-mask-pos);
}

/* ---------- Name im Grünen: elbisch verziert ---------- */
.neon__chapter {
  --logo-color: rgb(255 248 228 / 78%);
  --logo-night: linear-gradient(170deg, #f4f6ff 10%, #b9c8ff 60%, #d9c8ff);

  position: absolute;
  top: clamp(14px, 4%, 32px);
  left: clamp(14px, 4%, 36px);
  pointer-events: none;
  filter: drop-shadow(0 1px 0 rgb(60 80 30 / 40%)) drop-shadow(0 0 14px rgb(255 240 200 / 25%));
  transition: filter 1.2s ease;
  animation: chapter-in 1.6s ease both;

  /* nachts schimmert der Schriftzug kühl wie Sternenlicht */
  &.is-night {
    --logo-color: rgb(220 228 255 / 85%);

    filter: drop-shadow(0 0 3px rgb(200 215 255 / 70%)) drop-shadow(0 0 16px rgb(150 170 255 / 45%));

    .logo::after {
      opacity: 1;
    }
  }
}

@keyframes chapter-in {
  from {
    opacity: 0;
    translate: 0 8px;
  }
}

/* ---------- Leuchtreklame ---------- */
.neon__sign {
  position: absolute;
  top: clamp(14px, 4%, 32px);
  left: clamp(14px, 4%, 36px);
  --logo-outline: #1a0b2a;

  pointer-events: none;
  filter: drop-shadow(3px 3px 0 rgb(0 0 0 / 30%));
  transform: rotate(-3deg);
  transform-origin: left top;
  opacity: 0;
  transition:
    filter 0.6s ease,
    opacity 0.8s ease;

  &.is-visible {
    opacity: 1;
  }

  /* nachts: farbige Buchstaben mit hellem Umriss, leuchten und pulsieren im Takt */
  &.is-lit {
    --logo-outline: #fff4fb;

    filter: drop-shadow(0 0 3px var(--neon-a))
      drop-shadow(0 0 calc(8px + var(--pulse) * 12px) var(--neon-a))
      drop-shadow(0 0 calc(18px + var(--pulse) * 18px) var(--neon-b));
    animation: ignite 1.4s steps(1, end) both;

    .logo::after {
      opacity: 1;
    }
  }
}

@keyframes ignite {
  0%,
  12%,
  30% {
    opacity: 1;
  }

  6%,
  22% {
    opacity: 0.25;
  }
}

/* ---------- Motorrad zum Anklicken ---------- */
.neon__bike {
  position: absolute;
  padding: 0;
  border: 0;
  border-radius: 18px;
  background: transparent;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--neon-b);
    outline-offset: 4px;
  }
}

/* ---------- Tag/Nacht: Holzwegweiser im Grünen ---------- */
.daynight-sign {
  --wood: #9a6b3c;
  --wood-light: #c08a52;
  --wood-dark: #5c3b1e;

  position: absolute;
  left: clamp(28px, 8%, 110px);
  bottom: clamp(36px, 10%, 90px);
  display: grid;
  gap: 10px;
  width: 200px;
  animation: chapter-in 0.8s ease both;
}

.daynight-sign__post {
  position: absolute;
  left: 50%;
  top: -12px;
  bottom: clamp(-90px, -10vh, -36px);
  width: 15px;
  margin-left: -7px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--wood-dark), var(--wood) 45%, var(--wood-dark));
  box-shadow: 3px 4px 8px rgb(0 0 0 / 35%);

  /* Kappe oben auf dem Pfahl */
  &::before {
    content: '';
    position: absolute;
    left: -3px;
    right: -3px;
    top: -6px;
    height: 9px;
    border-radius: 4px 4px 2px 2px;
    background: var(--wood-dark);
  }
}

.daynight-sign__plank {
  position: relative;
  width: 104px;
  height: 44px;
  border: 0;
  background:
    repeating-linear-gradient(
      178deg,
      rgb(255 255 255 / 0%) 0 6px,
      rgb(60 30 10 / 18%) 6px 7px,
      rgb(255 255 255 / 0%) 7px 13px
    ),
    linear-gradient(180deg, var(--wood-light), var(--wood) 55%, var(--wood-dark));
  font-size: 1.6rem;
  line-height: 44px;
  color: #3a2410;
  cursor: pointer;
  filter: brightness(0.72) saturate(0.85) drop-shadow(0 3px 3px rgb(0 0 0 / 30%));
  transition:
    filter 0.25s ease,
    transform 0.25s ease;

  /* Nagel nahe am Pfahl */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    width: 5px;
    height: 5px;
    margin-top: -2.5px;
    border-radius: 50%;
    background: #2b1a0c;
    box-shadow: inset 1px 1px 0 rgb(255 255 255 / 25%);
  }

  &:hover {
    filter: brightness(0.9) drop-shadow(0 3px 3px rgb(0 0 0 / 30%));
  }

  &:focus-visible {
    outline: 2px solid #ffe7a3;
    outline-offset: 3px;
  }

  &[aria-pressed='true'] {
    filter: drop-shadow(0 3px 4px rgb(0 0 0 / 35%));
  }
}

/* Tag zeigt nach rechts, Nacht nach links */
.daynight-sign__plank--day {
  justify-self: start;
  margin-left: calc(50% - 6px);
  padding: 0 26px 0 14px;
  text-align: left;
  clip-path: polygon(0 0, 76% 0, 100% 50%, 76% 100%, 0 100%);
  rotate: -4deg;

  &::before {
    left: 6px;
  }

  &[aria-pressed='true'] {
    transform: translateX(4px);
  }

  &[aria-pressed='true'] span {
    color: #ffd24a;
    text-shadow:
      0 0 8px rgb(255 200 60 / 90%),
      0 1px 0 #6b4210;
  }
}

.daynight-sign__plank--night {
  justify-self: end;
  margin-right: calc(50% - 6px);
  padding: 0 14px 0 26px;
  text-align: right;
  clip-path: polygon(24% 0, 100% 0, 100% 100%, 24% 100%, 0 50%);
  rotate: 3deg;

  &::before {
    right: 6px;
  }

  &[aria-pressed='true'] {
    transform: translateX(-4px);
  }

  &[aria-pressed='true'] span {
    color: #f3f0ff;
    text-shadow:
      0 0 10px rgb(200 210 255 / 90%),
      0 1px 0 #3a2410;
  }
}

/* ---------- Tag/Nacht: Drehschalter an der Küste ---------- */
.dash-knob {
  position: absolute;
  left: clamp(14px, 4%, 36px);
  bottom: clamp(12px, 3.5%, 26px);
  width: 104px;
  height: 84px;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 16px;
  background: linear-gradient(180deg, #23202b, #0e0c12);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 8%),
    inset 0 -2px 6px rgb(0 0 0 / 60%),
    0 6px 16px rgb(0 0 0 / 45%);
  cursor: pointer;
  animation: chapter-in 0.8s ease both;

  &:focus-visible {
    outline: 2px solid var(--neon-b);
    outline-offset: 3px;
  }

  /* Rastmarken für die beiden Stellungen */
  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    /* Mittelpunkt des Knopfs: 12px Abstand + 25px Radius, minus halbe Markenhöhe */
    bottom: 33px;
    width: 2px;
    height: 8px;
    margin-left: -1px;
    border-radius: 1px;
    background: rgb(255 255 255 / 40%);
  }

  &::before {
    transform: rotate(-50deg) translateY(-32px);
  }

  &::after {
    transform: rotate(50deg) translateY(-32px);
  }
}

.dash-knob__icon {
  position: absolute;
  top: 9px;
  font-size: 1rem;
  line-height: 1;
  color: rgb(255 255 255 / 30%);
  transition:
    color 0.25s ease,
    text-shadow 0.25s ease;
}

.dash-knob__icon--day {
  left: 13px;
}

.dash-knob__icon--night {
  right: 13px;
}

/* das gewählte Symbol leuchtet wie eine Armaturenbeleuchtung */
.dash-knob[aria-checked='false'] .dash-knob__icon--day {
  color: #fff;
  text-shadow:
    0 0 4px #ffb347,
    0 0 12px #ffb347;
}

.dash-knob[aria-checked='true'] .dash-knob__icon--night {
  color: #fff;
  text-shadow:
    0 0 4px var(--neon-a),
    0 0 12px var(--neon-a);
}

/* gerändelter Metallknopf */
.dash-knob__dial {
  position: absolute;
  left: 50%;
  bottom: 12px;
  width: 50px;
  height: 50px;
  margin-left: -25px;
  border-radius: 50%;
  background: repeating-conic-gradient(#a7acb8 0deg 5deg, #555a66 5deg 10deg);
  box-shadow:
    0 3px 6px rgb(0 0 0 / 65%),
    0 0 0 3px #0a090d;
  transform: rotate(-50deg);
  transition: transform 0.4s cubic-bezier(0.3, 1.5, 0.5, 1);
}

.dash-knob[aria-checked='true'] .dash-knob__dial {
  transform: rotate(50deg);
}

.dash-knob__cap {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f1f3f7, #9aa0ad 45%, #4d525e);
  box-shadow: inset 0 -2px 3px rgb(0 0 0 / 35%);

  /* leuchtende Zeigermarke */
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 4px;
    width: 4px;
    height: 13px;
    margin-left: -2px;
    border-radius: 2px;
    background: var(--neon-a);
    box-shadow: 0 0 8px var(--neon-a);
  }
}

/* ---------- Vollbild und Spotify-Musik unten rechts ---------- */
.music {
  position: absolute;
  right: clamp(14px, 4%, 36px);
  bottom: clamp(12px, 3.5%, 26px);
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 10px;
}

.music__buttons {
  display: flex;
  gap: 10px;
}

.corner-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 50%;
  background: rgb(10 4 20 / 55%);
  backdrop-filter: blur(6px);
  font-size: 1.2rem;
  color: #f5e9ff;
  cursor: pointer;
  transition:
    background 0.25s ease,
    box-shadow 0.25s ease;

  &:hover {
    background: rgb(10 4 20 / 75%);
  }

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 3px;
  }

  svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

/* grüner Ring, solange Spotify spielt */
.music__toggle.is-playing {
  box-shadow: 0 0 0 2px #1ed760;
}

/* ---------- Vollbild: echte Fullscreen-API oder Ersatz per CSS ---------- */
/* eigene Regel, damit ein Browser ohne -webkit-Selektor nicht alles verwirft */
.neon:-webkit-full-screen {
  width: 100%;
  height: 100%;
  aspect-ratio: auto;
  min-height: 0;
  max-height: none;
  border: 0;
  border-radius: 0;
}

.neon:fullscreen,
.neon.is-fullscreen {
  width: 100%;
  height: 100%;
  aspect-ratio: auto;
  min-height: 0;
  max-height: none;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.neon.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 1000;
  height: 100dvh;
}

.music__panel {
  width: min(320px, calc(100vw - 48px));
  opacity: 0;
  translate: 0 8px;
  pointer-events: none;
  transition:
    opacity 0.25s ease,
    translate 0.25s ease;

  .is-open & {
    opacity: 1;
    translate: 0 0;
    pointer-events: auto;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ---------- Handy: Szene füllt randlos den Bildschirm unter der Navigation ---------- */
@media (width <= 700px), (orientation: landscape) and (height <= 500px) {
  .neon {
    width: 100%;
    height: calc(100svh - var(--site-header-depth));
    aspect-ratio: auto;
    min-height: 0;
    max-height: none;
    border-radius: 0;
    border-right: 0;
    border-left: 0;
    box-shadow: none;
    scroll-margin-top: var(--site-header-depth);

    &.is-shire,
    &.is-offer {
      box-shadow: none;
    }
  }

  /* unten im freien Streifen unter dem Fahrzeug: links Tag/Nacht, rechts Vollbild und Musik */
  .music {
    right: 14px;
    bottom: 14px;
  }

  .music__panel {
    width: min(320px, calc(100vw - 28px));
  }

}

@media (width <= 700px) {
  .logo--coast {
    width: 76px;
  }

  .logo--shire {
    width: 125px;
  }

  .dash-knob {
    top: clamp(14px, 4%, 32px);
    right: 14px;
    bottom: auto;
    left: auto;
    scale: 0.8;
    transform-origin: right top;
  }

  /* Wegweiser kleiner unten links, der Pfahl verschwindet im Boden */
  .daynight-sign {
    left: 6px;
    bottom: 22px;
    scale: 0.72;
    transform-origin: left bottom;
  }
}

/* Querformat am Handy: wenig Höhe, also alles etwas kleiner */
@media (orientation: landscape) and (height <= 500px) {
  .logo--shire {
    width: 110px;
  }

  .logo--coast {
    width: 64px;
  }

  .dash-knob {
    scale: 0.7;
    transform-origin: left bottom;
  }

  .daynight-sign {
    bottom: 18px;
    scale: 0.6;
    transform-origin: left bottom;
  }
}

@media (prefers-reduced-motion: reduce) {
  .neon__sign.is-lit,
  .neon__chapter,
  .daynight-sign,
  .dash-knob {
    animation: none;
  }
}
</style>

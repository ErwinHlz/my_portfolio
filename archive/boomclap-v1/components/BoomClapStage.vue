<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useBoomClapPlayer } from '../composables/useBoomClapPlayer';
import { SONG_LENGTH, timeAt } from '../engine/boomClapTrack';
import { BoomClapScene } from '../engine/boomClapScene';
import { BoomClapBustScene } from '../engine/boomClapBustScene';
import { BoomClapComicScene } from '../engine/boomClapComicScene';
import WebPlayButton from './WebPlayButton.vue';

/** 'bust' = Nahaufnahme ab Brust, 'full' = ganzer Körper im Zimmer, 'comic' = Nahaufnahme als Marvel-Comic */
const props = withDefaults(defineProps<{ variant?: 'bust' | 'full' | 'comic' }>(), {
  variant: 'bust',
});

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const { status, muted, word, wordId, progress, error, play, togglePause, toggleMute } =
  useBoomClapPlayer(root, canvas, (ctx) =>
    props.variant === 'full'
      ? new BoomClapScene(ctx)
      : props.variant === 'comic'
        ? new BoomClapComicScene(ctx)
        : new BoomClapBustScene(ctx),
  );

const showCover = computed(
  () => status.value === 'ready' || status.value === 'loading' || status.value === 'ended',
);
/** Markierungen der vier Boom-Clap-Momente auf der Fortschrittsleiste */
const markers = [3, 11, 19, 27].map((k) => (timeAt(k) / SONG_LENGTH) * 100);

function onStageClick() {
  if (status.value === 'playing' || status.value === 'paused') togglePause();
}

function onKey(event: KeyboardEvent) {
  if ((event.target as HTMLElement).closest('button')) return;
  if (event.key === ' ' || event.key === 'k') {
    event.preventDefault();
    if (status.value === 'ready' || status.value === 'ended') void play();
    else togglePause();
  } else if (event.key === 'm') toggleMute();
}

/* ---------- Vollbild (wie bei der Neon Coast, mit Ersatz fürs iPhone) ---------- */
type FullscreenDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => void;
};
type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => void };
const doc = document as FullscreenDoc;
const nativeFullscreen = ref(false);
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
  if (enabled && el.requestFullscreen)
    el.requestFullscreen().catch(() => (pseudoFullscreen.value = true));
  else if (enabled && el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else pseudoFullscreen.value = true;
}

function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && pseudoFullscreen.value) pseudoFullscreen.value = false;
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
  window.addEventListener('keydown', onEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
  window.removeEventListener('keydown', onEscape);
});
</script>

<template>
  <Teleport to="body" :disabled="!pseudoFullscreen">
    <div
      ref="root"
      class="stage"
      :class="[`is-${status}`, { 'is-fullscreen': pseudoFullscreen }]"
      tabindex="0"
      aria-label="Boom Clap: Peter Parker wird zu Spider-Man und dann zu Black Spider-Man. Leertaste spielt ab oder pausiert, M schaltet den Ton."
      @keydown="onKey"
    >
      <canvas
        ref="canvas"
        class="stage__canvas"
        role="img"
        aria-label="Peter Parker steht in seinem Zimmer in Queens. Bei jedem Boom feuern zwei Konfetti-Kanonen, bei jedem Klatschen verwandelt er sich: in Spider-Man, dann springt er an die Decke und wird zu Black Spider-Man."
        @click="onStageClick"
      ></canvas>

      <!-- Comic-Lautmalerei bei jedem Boom und Clap -->
      <span
        v-if="word"
        :key="wordId"
        class="pow"
        :class="word.startsWith('BOOM') ? 'pow--boom' : 'pow--clap'"
        :style="{ '--tilt': wordId % 2 ? '-8deg' : '7deg' }"
        aria-hidden="true"
        ><span>{{ word }}</span></span
      >

      <span v-if="status === 'paused'" class="stage__paused" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
      </span>

      <div class="stage__buttons">
        <button
          type="button"
          class="corner-btn"
          :aria-pressed="isFullscreen"
          @click="toggleFullscreen"
        >
          <svg v-if="!isFullscreen" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" />
          </svg>
          <span class="sr-only">{{ isFullscreen ? 'Vollbild beenden' : 'Vollbild' }}</span>
        </button>
        <button type="button" class="corner-btn" :aria-pressed="muted" @click="toggleMute">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9h4l5-4v14l-5-4H4z" />
            <path v-if="!muted" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
            <path v-else d="M16 9l5 6M21 9l-5 6" />
          </svg>
          <span class="sr-only">{{ muted ? 'Ton an' : 'Ton aus' }}</span>
        </button>
      </div>

      <div class="stage__progress" aria-hidden="true">
        <span class="stage__bar" :style="{ transform: `scaleX(${progress})` }"></span>
        <span v-for="m in markers" :key="m" class="stage__mark" :style="{ left: `${m}%` }"></span>
      </div>

      <Transition name="fade">
        <div v-if="showCover" class="stage__cover">
          <WebPlayButton
            :mode="status === 'ended' ? 'replay' : 'play'"
            :label="status === 'ended' ? 'Nochmal' : 'Boom Clap abspielen'"
            :loading="status === 'loading'"
            @click="play"
          />
          <p v-if="error" class="stage__hint stage__hint--error" role="alert">{{ error }}</p>
          <p v-else-if="status !== 'ended'" class="stage__hint">🔊 Ton an für den vollen Effekt</p>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  min-height: 380px;
  max-height: 82vh;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid rgb(255 255 255 / 12%);
  background: #0b0d16;
  box-shadow:
    0 0 80px rgb(197 31 43 / 14%),
    0 40px 80px rgb(0 0 0 / 60%);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: box-shadow 1.2s ease;

  &:focus-visible {
    outline: 2px solid #ff5a5f;
    outline-offset: 4px;
  }

  &.is-playing,
  &.is-paused,
  &.is-ended {
    box-shadow:
      0 0 80px rgb(110 70 255 / 14%),
      0 40px 80px rgb(0 0 0 / 60%);
  }

  &.is-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 1000;
    width: 100vw;
    height: 100dvh;
    max-height: none;
    border-radius: 0;
    aspect-ratio: auto;
  }

  &:fullscreen {
    max-height: none;
    border-radius: 0;
  }
}

.stage__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.stage.is-playing .stage__canvas,
.stage.is-paused .stage__canvas {
  cursor: pointer;
}

/* ---------- Comic-Wörter ---------- */
.pow {
  position: absolute;
  top: 14%;
  left: var(--x);
  translate: -50% 0;
  display: grid;
  place-items: center;
  padding: 0.35em 0.8em 0.45em;
  pointer-events: none;
  font-family: Impact, 'Arial Black', 'Helvetica Neue', sans-serif;
  font-size: clamp(1.6rem, 5vw, 4.2rem);
  font-weight: 900;
  letter-spacing: 0.03em;
  line-height: 1;
  animation: pow 0.55s cubic-bezier(0.2, 1.8, 0.4, 1) both;

  /* gezackte Sprechblase mit Rasterpunkten */
  &::before {
    content: '';
    position: absolute;
    inset: -18% -10%;
    z-index: -1;
    clip-path: polygon(
      50% 0%,
      58% 18%,
      76% 4%,
      74% 24%,
      98% 18%,
      84% 38%,
      100% 52%,
      82% 60%,
      94% 82%,
      70% 74%,
      66% 100%,
      52% 80%,
      36% 98%,
      32% 76%,
      8% 88%,
      18% 64%,
      0% 50%,
      18% 40%,
      4% 16%,
      28% 24%,
      26% 2%,
      42% 18%
    );
    background:
      radial-gradient(circle, rgb(0 0 0 / 22%) 1.4px, transparent 1.6px) 0 0 / 9px 9px,
      var(--burst);
    filter: drop-shadow(0 6px 0 rgb(0 0 0 / 45%));
  }

  span {
    color: var(--ink);
    -webkit-text-stroke: 0.06em #111;
    paint-order: stroke fill;
    text-shadow: 0.06em 0.07em 0 #111;
  }
}

.pow--boom {
  --x: 22%;
  --burst: radial-gradient(circle at 50% 50%, #fff38a, #ffc52e 55%, #ff7a1a);
  --ink: #e62e3c;
}

.pow--clap {
  --x: 78%;
  --burst: radial-gradient(circle at 50% 50%, #e6f1ff, #7fb2ff 55%, #2a5bd7);
  --ink: #fff;
}

.stage.is-playing .pow,
.stage.is-paused .pow {
  rotate: var(--tilt);
}

@keyframes pow {
  0% {
    opacity: 0;
    transform: scale(0.2) rotate(-20deg);
  }

  55% {
    opacity: 1;
    transform: scale(1.15) rotate(4deg);
  }

  100% {
    transform: scale(1) rotate(0);
  }
}

.stage__paused {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  translate: -50% -50%;
  border-radius: 50%;
  background: rgb(0 0 0 / 45%);
  pointer-events: none;
  animation: chip-in 0.2s ease both;

  svg {
    width: 34px;
    fill: #fff;
  }
}

@keyframes chip-in {
  from {
    opacity: 0;
    transform: scale(1.4);
  }
}

/* ---------- Knöpfe unten rechts ---------- */
.stage__buttons {
  position: absolute;
  right: clamp(12px, 2.4%, 26px);
  bottom: clamp(16px, 3%, 30px);
  display: flex;
  gap: 10px;
}

.corner-btn {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 50%;
  background: rgb(10 10 16 / 55%);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.9;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:hover {
    background: rgb(197 31 43 / 70%);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }
}

/* ---------- Fortschritt mit den vier Boom-Clap-Momenten ---------- */
.stage__progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background: rgb(255 255 255 / 14%);
  pointer-events: none;
}

.stage__bar {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #c51f2b, #ff5a5f 60%, #a98bff);
  transform-origin: left;
}

.stage__mark {
  position: absolute;
  top: -3px;
  width: 4px;
  height: 10px;
  margin-left: -2px;
  border-radius: 2px;
  background: #ffd34d;
  box-shadow: 0 0 6px rgb(255 211 77 / 80%);
}

/* ---------- Startbildschirm ---------- */
.stage__cover {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 18px;
  background:
    radial-gradient(circle at 50% 50%, rgb(197 31 43 / 20%), transparent 40%),
    linear-gradient(180deg, rgb(5 6 14 / 30%), rgb(5 6 14 / 60%));
}

.stage.is-ended .stage__cover {
  background:
    radial-gradient(circle at 50% 50%, rgb(110 70 255 / 22%), transparent 40%),
    linear-gradient(180deg, rgb(5 6 14 / 35%), rgb(5 6 14 / 68%));
}

.stage__hint {
  margin: 0;
  font-family: 'Helvetica Neue', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 0.8rem;
  color: rgb(255 255 255 / 78%);
}

.stage__hint--error {
  color: #ffb3b3;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .pow {
    animation: none;
  }
}
</style>

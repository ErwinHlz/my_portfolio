<script setup lang="ts">
/**
 * Hochformat-Variante als Instagram-artiges Reel (Handy-Look).
 * Aktuell nicht eingebunden – bleibt für spätere Projekte erhalten und nutzt
 * dieselbe Szene und denselben Player wie die Querformat-Bühne.
 */
import { computed, ref } from 'vue';
import { useBoomClapPlayer } from '../composables/useBoomClapPlayer';
import WebPlayButton from './WebPlayButton.vue';

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const { status, muted, word, wordId, progress, beat, error, play, togglePause, toggleMute } =
  useBoomClapPlayer(root, canvas);

const liked = ref(false);
const hearts = ref<{ id: number; x: number; y: number }[]>([]);
const likeCount = computed(() => (liked.value ? '98,8K' : '98,7K'));
/** Herz pulsiert kurz bei jedem Clap */
const heartPulse = computed(() => (word.value.startsWith('CLAP') ? 1 : 0));
const showCover = computed(
  () => status.value === 'ready' || status.value === 'loading' || status.value === 'ended',
);
const caption = computed(() => {
  const k = beat.value;
  if (k < -0.5 || status.value === 'ready') return '';
  if (k < 4) return 'Peter Parker 🤓';
  if (k < 12.6) return 'Spider-Man 🕷️';
  if (k < 20) return 'Moment … was passiert hier?! 😳';
  return 'Black Spider-Man 🖤';
});

let heartId = 0;
let lastTap = 0;
let tapTimer = 0;

/** Einmal tippen = Pause, zweimal = Herz wie bei Reels */
function onStageTap(event: PointerEvent) {
  if (status.value !== 'playing' && status.value !== 'paused') return;
  const now = performance.now();
  if (now - lastTap < 280) {
    clearTimeout(tapTimer);
    lastTap = 0;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const id = ++heartId;
    hearts.value.push({ id, x: event.clientX - rect.left, y: event.clientY - rect.top });
    setTimeout(() => (hearts.value = hearts.value.filter((h) => h.id !== id)), 900);
    liked.value = true;
    return;
  }
  lastTap = now;
  tapTimer = window.setTimeout(togglePause, 280);
}

function onKey(event: KeyboardEvent) {
  if ((event.target as HTMLElement).closest('button')) return;
  if (event.key === ' ' || event.key === 'k') {
    event.preventDefault();
    if (status.value === 'ready' || status.value === 'ended') void play();
    else togglePause();
  } else if (event.key === 'm') toggleMute();
}
</script>

<template>
  <div class="reel-wrap">
    <div
      ref="root"
      class="reel"
      :class="`is-${status}`"
      tabindex="0"
      aria-label="Boom-Clap-Reel: Peter Parker wird zu Spider-Man und dann zu Black Spider-Man. Leertaste spielt ab oder pausiert, M schaltet den Ton."
      @keydown="onKey"
    >
      <canvas
        ref="canvas"
        class="reel__canvas"
        role="img"
        aria-label="Peter Parker steht in seinem Zimmer in Queens. Bei jedem Klatschen verwandelt er sich: erst in Spider-Man, dann springt er an die Decke und wird zu Black Spider-Man."
      ></canvas>

      <!-- Tippfläche für Pause / Herz -->
      <div class="reel__stage" @pointerup="onStageTap"></div>

      <!-- Reels-Kopfzeile -->
      <div class="reel__top" aria-hidden="true">
        <span class="reel__title">Reels</span>
        <svg viewBox="0 0 24 24" class="reel__cam">
          <rect x="3" y="6" width="18" height="14" rx="4" />
          <circle cx="12" cy="13" r="3.6" />
          <path d="M8 6l1.6-2.4h4.8L16 6" />
        </svg>
      </div>

      <button
        v-if="status !== 'ready'"
        type="button"
        class="reel__mute"
        :aria-pressed="muted"
        @click.stop="toggleMute"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9h4l5-4v14l-5-4H4z" />
          <path v-if="!muted" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
          <path v-else d="M16 9l5 6M21 9l-5 6" />
        </svg>
        <span class="sr-only">{{ muted ? 'Ton an' : 'Ton aus' }}</span>
      </button>

      <!-- Text-Overlay im Trend-Stil -->
      <Transition name="cap">
        <p v-if="caption" :key="caption" class="reel__caption">{{ caption }}</p>
      </Transition>
      <p v-if="word" :key="wordId" class="reel__word" aria-hidden="true">
        <span v-for="(part, i) in word.split(' ')" :key="i" :style="{ '--i': i }">{{ part }}</span>
      </p>

      <!-- Herzen beim Doppeltippen -->
      <span
        v-for="h in hearts"
        :key="h.id"
        class="reel__heart-pop"
        :style="{ left: `${h.x}px`, top: `${h.y}px` }"
        aria-hidden="true"
        >♥</span
      >

      <!-- Pause-Symbol -->
      <span v-if="status === 'paused'" class="reel__paused" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
      </span>

      <!-- Aktionsspalte rechts -->
      <div class="reel__actions" aria-hidden="true">
        <span class="act" :class="{ 'is-liked': liked }" :style="{ '--pulse': heartPulse }">
          <svg viewBox="0 0 24 24">
            <path
              d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.3 4.5 6.8 4.5c2.1 0 3.8 1.2 5.2 3 1.4-1.8 3.1-3 5.2-3 3.5 0 5.4 3.5 4.1 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
            />
          </svg>
          <small>{{ likeCount }}</small>
        </span>
        <span class="act">
          <svg viewBox="0 0 24 24">
            <path d="M20 12a8 8 0 1 1-3.2-6.4L21 4l-1.2 4.4A8 8 0 0 1 20 12z" />
          </svg>
          <small>2.184</small>
        </span>
        <span class="act">
          <svg viewBox="0 0 24 24">
            <path d="M21 4L3 11l7 2.5M21 4l-6.5 16-4.5-7.5M21 4L10 13.5" />
          </svg>
          <small>9.402</small>
        </span>
        <span class="act act--dots">
          <svg viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </span>
        <span class="act act--disc" :class="{ 'is-spinning': status === 'playing' }">
          <svg viewBox="-12 -12 24 24"><use href="#bc-spider" /></svg>
        </span>
      </div>

      <!-- Profil, Caption, Audio -->
      <div class="reel__meta" aria-hidden="true">
        <div class="reel__user">
          <span class="reel__avatar"
            ><svg viewBox="-12 -12 24 24"><use href="#bc-spider" /></svg
          ></span>
          <strong>friendly.neighbor</strong>
          <span class="reel__follow">Folgen</span>
        </div>
        <p class="reel__desc">
          wenn der Beat droppt 🕷️ <b>#boomclap</b> <b>#spiderman</b> <b>#peterparker</b>
        </p>
        <p class="reel__audio">
          <span class="reel__note">♪</span>
          <span class="reel__marquee"
            ><span
              >Boom Clap · Originalbeat · friendly.neighbor · Boom Clap · Originalbeat ·</span
            ></span
          >
        </p>
      </div>

      <div class="reel__progress" aria-hidden="true">
        <span :style="{ transform: `scaleX(${progress})` }"></span>
      </div>

      <!-- Startbildschirm mit Netz-Play-Button -->
      <Transition name="fade">
        <div v-if="showCover" class="reel__cover">
          <WebPlayButton
            :mode="status === 'ended' ? 'replay' : 'play'"
            :label="status === 'ended' ? 'Nochmal' : 'Boom Clap abspielen'"
            :loading="status === 'loading'"
            @click="play"
          />
          <p v-if="error" class="reel__hint" role="alert">{{ error }}</p>
          <p v-else-if="status !== 'ended'" class="reel__hint">🔊 Ton an für den vollen Effekt</p>
        </div>
      </Transition>
    </div>

    <!-- gemeinsame Spinne für Avatar, Platte und Button -->
    <svg width="0" height="0" class="sr-only" aria-hidden="true">
      <symbol id="bc-spider" viewBox="-12 -12 24 24">
        <g fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-width="1.3">
          <path
            fill="none"
            d="M-1.5-2Q-6-6-7-10M1.5-2Q6-6 7-10M-2-1Q-8-2-10-6M2-1Q8-2 10-6M-2 1Q-8 2-10 6M2 1Q8 2 10 6M-1.5 2.5Q-5 6-6 10M1.5 2.5Q5 6 6 10"
          />
          <ellipse cx="0" cy="-1" rx="2.6" ry="3.4" stroke="none" />
          <ellipse cx="0" cy="4" rx="2.1" ry="3.4" stroke="none" />
          <circle cx="0" cy="-5.6" r="1.8" stroke="none" />
        </g>
      </symbol>
    </svg>
  </div>
</template>

<style scoped lang="scss">
.reel-wrap {
  display: flex;
  justify-content: center;
}

.reel {
  --ui: 'Helvetica Neue', 'Segoe UI', Roboto, Arial, sans-serif;

  position: relative;
  width: min(420px, calc(82vh * 9 / 16), 100vw - 40px);
  aspect-ratio: 9 / 16;
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid rgb(255 255 255 / 14%);
  background: #0b0d16;
  box-shadow:
    0 0 0 8px #0a0a0c,
    0 0 0 9px rgb(255 255 255 / 10%),
    0 0 90px rgb(197 31 43 / 18%),
    0 40px 80px rgb(0 0 0 / 60%);
  font-family: var(--ui);
  color: #fff;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: box-shadow 1s ease;

  &:focus-visible {
    outline: 2px solid #ff5a5f;
    outline-offset: 12px;
  }

  &.is-ended,
  &.is-playing {
    box-shadow:
      0 0 0 8px #0a0a0c,
      0 0 0 9px rgb(255 255 255 / 10%),
      0 0 90px rgb(110 70 255 / 16%),
      0 40px 80px rgb(0 0 0 / 60%);
  }
}

.reel__canvas,
.reel__stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.reel__stage {
  cursor: pointer;
}

.reel.is-ready .reel__stage,
.reel.is-ended .reel__stage {
  pointer-events: none;
}

/* ---------- Kopfzeile ---------- */
.reel__top {
  position: absolute;
  top: 14px;
  left: 16px;
  right: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
  text-shadow: 0 1px 6px rgb(0 0 0 / 50%);
}

.reel__title {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.reel__cam {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: #fff;
  stroke-width: 1.8;
  stroke-linejoin: round;
}

.reel__mute {
  position: absolute;
  top: 10px;
  right: 12px;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgb(0 0 0 / 40%);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(6px);

  svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.9;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }
}

/* ---------- Texte im Bild ---------- */
.reel__caption {
  position: absolute;
  top: 15%;
  left: 50%;
  margin: 0;
  max-width: 82%;
  padding: 5px 12px 6px;
  translate: -50% 0;
  border-radius: 8px;
  background: rgb(255 255 255 / 94%);
  color: #111;
  font-size: clamp(0.85rem, 3.6vw, 1.05rem);
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 4px 14px rgb(0 0 0 / 30%);
}

.cap-enter-active {
  transition:
    opacity 0.12s ease,
    transform 0.25s cubic-bezier(0.3, 1.6, 0.5, 1);
}

.cap-leave-active {
  transition: opacity 0.08s ease;
}

.cap-enter-from {
  opacity: 0;
  transform: scale(0.7);
}

.cap-leave-to {
  opacity: 0;
}

.reel__word {
  position: absolute;
  top: 58%;
  left: 0;
  right: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  gap: 0.3em;
  font-family: Impact, 'Arial Black', 'Helvetica Neue', sans-serif;
  font-size: clamp(2.6rem, 14vw, 4.4rem);
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1;
  pointer-events: none;

  span {
    color: #fff;
    -webkit-text-stroke: 3px #111;
    paint-order: stroke fill;
    text-shadow:
      0 0 18px rgb(255 60 80 / 70%),
      0 4px 0 #111;
    animation: word-pop 0.42s cubic-bezier(0.2, 1.8, 0.4, 1) both;
    animation-delay: calc(var(--i) * 0.12s);
  }
}

@keyframes word-pop {
  0% {
    opacity: 0;
    transform: scale(2.2) rotate(-8deg);
  }

  60% {
    opacity: 1;
    transform: scale(0.92) rotate(2deg);
  }

  100% {
    transform: scale(1) rotate(-3deg);
  }
}

.reel__heart-pop {
  position: absolute;
  translate: -50% -50%;
  font-size: 5.5rem;
  line-height: 1;
  color: #ff2d55;
  text-shadow: 0 6px 24px rgb(0 0 0 / 45%);
  pointer-events: none;
  animation: heart-pop 0.9s ease both;
}

@keyframes heart-pop {
  0% {
    opacity: 0;
    transform: scale(0.3) rotate(-14deg);
  }

  25% {
    opacity: 1;
    transform: scale(1.15) rotate(-10deg);
  }

  45% {
    transform: scale(0.95) rotate(-10deg);
  }

  100% {
    opacity: 0;
    transform: translateY(-80px) scale(1) rotate(-10deg);
  }
}

.reel__paused {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
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

/* ---------- Aktionen rechts ---------- */
.reel__actions {
  position: absolute;
  right: 10px;
  bottom: 72px;
  display: grid;
  justify-items: center;
  gap: 16px;
  pointer-events: none;
  text-shadow: 0 1px 4px rgb(0 0 0 / 50%);
}

.act {
  display: grid;
  justify-items: center;
  gap: 3px;

  svg {
    width: 28px;
    height: 28px;
    fill: none;
    stroke: #fff;
    stroke-width: 1.8;
    stroke-linejoin: round;
    stroke-linecap: round;
    filter: drop-shadow(0 1px 3px rgb(0 0 0 / 50%));
  }

  small {
    font-size: 0.72rem;
    font-weight: 600;
  }

  &:first-child svg {
    transform: scale(calc(1 + var(--pulse, 0) * 0.35));
  }

  &.is-liked svg {
    fill: #ff2d55;
    stroke: #ff2d55;
  }
}

.act--dots svg {
  fill: #fff;
  stroke: none;
}

.act--disc {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 2px solid #fff;
  border-radius: 8px;
  background: linear-gradient(135deg, #c51f2b, #1c3d98);
  color: #0b0b0e;

  svg {
    width: 20px;
    height: 20px;
    stroke: none;
    fill: currentColor;
    filter: none;
  }

  &.is-spinning {
    animation: spin 3s linear infinite;
  }
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

/* ---------- Profil unten ---------- */
.reel__meta {
  position: absolute;
  left: 14px;
  right: 64px;
  bottom: 18px;
  pointer-events: none;
  font-size: 0.82rem;
  line-height: 1.35;
  text-shadow: 0 1px 4px rgb(0 0 0 / 60%);
}

.reel__user {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;

  strong {
    font-weight: 700;
  }
}

.reel__avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ff5a5f, #c51f2b 60%, #5e0a12);
  box-shadow:
    0 0 0 2px #0b0d16,
    0 0 0 3.5px #ff5a5f;
  color: #0b0b0e;

  svg {
    width: 20px;
    height: 20px;
  }
}

.reel__follow {
  padding: 2px 9px;
  border: 1px solid rgb(255 255 255 / 70%);
  border-radius: 7px;
  font-size: 0.75rem;
  font-weight: 600;
}

.reel__desc {
  margin: 0 0 6px;

  b {
    font-weight: 600;
  }
}

.reel__audio {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.reel__note {
  font-size: 0.85rem;
}

.reel__marquee {
  overflow: hidden;
  flex: 1;
  white-space: nowrap;
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 85%, transparent);

  span {
    display: inline-block;
    padding-left: 100%;
    animation: marquee 9s linear infinite;
  }
}

@keyframes marquee {
  to {
    transform: translateX(-100%);
  }
}

.reel__progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: rgb(255 255 255 / 25%);

  span {
    display: block;
    height: 100%;
    background: #fff;
    transform-origin: left;
  }
}

/* ---------- Startbildschirm ---------- */
.reel__cover {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 18px;
  background:
    radial-gradient(circle at 50% 46%, rgb(197 31 43 / 22%), transparent 45%),
    linear-gradient(180deg, rgb(5 6 14 / 35%), rgb(5 6 14 / 62%));
}

.reel.is-ended .reel__cover {
  background:
    radial-gradient(circle at 50% 46%, rgb(110 70 255 / 22%), transparent 45%),
    linear-gradient(180deg, rgb(5 6 14 / 40%), rgb(5 6 14 / 70%));
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.reel__hint {
  margin: 0;
  font-size: 0.78rem;
  color: rgb(255 255 255 / 75%);
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
  .act--disc.is-spinning,
  .reel__marquee span {
    animation: none;
  }
}
</style>

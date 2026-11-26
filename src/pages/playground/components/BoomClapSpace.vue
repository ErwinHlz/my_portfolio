<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useBoomClapPlayer } from '../composables/useBoomClapPlayer';
import { BoomClapSpaceScene } from '../engine/boomClapSpaceScene';

/**
 * Boom Clap ohne Bühne: alles passiert frei im Seitenraum. Eine Konfettikanone
 * startet den Song, Peter kommt herein, die Kamera dreht in die Comic-Nahaufnahme.
 */
const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const fx = ref<HTMLCanvasElement | null>(null);
let space: BoomClapSpaceScene | null = null;

const { status, muted, word, wordId, error, play, togglePause, toggleMute } = useBoomClapPlayer(
  root,
  canvas,
  (ctx) => {
    if (!fx.value) throw new Error('Effekt-Leinwand fehlt');
    space = new BoomClapSpaceScene(ctx, fx.value);
    return space;
  },
);

const idle = computed(() => status.value === 'ready' || status.value === 'ended');
const running = computed(() => status.value === 'playing' || status.value === 'paused');

/** Größe des Kanonen-Knopfs folgt der Höhe der Fläche */
const height = ref(600);
let ro: ResizeObserver | null = null;
onMounted(() => {
  ro = new ResizeObserver(([e]) => (height.value = e.contentRect.height));
  if (root.value) ro.observe(root.value);
});
onBeforeUnmount(() => ro?.disconnect());

const cannonStyle = computed(() => {
  const at = BoomClapSpaceScene.CANNON_AT;
  const size = height.value * 0.26;
  return {
    left: `calc(${at.x * 100}% - ${size * 0.5}px)`,
    top: `calc(${at.y * 100}% - ${size * 1.05}px)`,
    width: `${size}px`,
    height: `${size * 1.1}px`,
  };
});

const bubbleStyle = computed(() => {
  const at = BoomClapSpaceScene.CANNON_AT;
  const size = height.value * 0.26;
  return {
    left: `calc(${at.x * 100}% - ${size * 0.35}px)`,
    top: `calc(${at.y * 100}% - ${size * 1.05 + 74}px)`,
  };
});

function onCannon() {
  if (idle.value) void play();
  else if (status.value === 'playing') space?.fireExtra();
  else if (status.value === 'paused') togglePause();
}

function onKey(event: KeyboardEvent) {
  if ((event.target as HTMLElement).closest('button')) return;
  if (event.key === ' ' || event.key === 'k') {
    event.preventDefault();
    if (idle.value) void play();
    else togglePause();
  } else if (event.key === 'm') toggleMute();
}
</script>

<template>
  <div
    ref="root"
    class="space"
    :class="`is-${status}`"
    tabindex="0"
    aria-label="Boom Clap: Drück die Konfettikanone. Peter Parker kommt herein und verwandelt sich im Comic-Stil in Spider-Man. Leertaste spielt ab oder pausiert, M schaltet den Ton."
    @keydown="onKey"
  >
    <div class="space__stage">
      <canvas
        ref="canvas"
        class="space__hero"
        role="img"
        aria-label="Peter Parker im Comic-Stil: Er läuft herein, die Kamera dreht sich in die Nahaufnahme, bei jedem Klatschen verwandelt er sich – erst in Spider-Man, dann in Black Spider-Man."
      ></canvas>
    </div>
    <canvas ref="fx" class="space__fx" aria-hidden="true"></canvas>

    <!-- Konfettikanone: startet den Song, später gibt’s Extra-Schüsse -->
    <button
      type="button"
      class="space__cannon"
      :style="cannonStyle"
      :aria-label="idle ? 'Konfettikanone zünden – startet Boom Clap' : 'Noch eine Ladung Konfetti'"
      @click="onCannon"
    ></button>
    <Transition name="pop">
      <p v-if="idle" class="space__bubble" :style="bubbleStyle" aria-hidden="true">
        {{ status === 'ended' ? 'Nochmal!' : 'Drück die Kanone!' }}
      </p>
    </Transition>
    <p v-if="status === 'loading'" class="space__bubble space__bubble--quiet" aria-live="polite">
      Lädt …
    </p>
    <p v-if="error" class="space__error" role="alert">{{ error }}</p>

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

    <div v-if="running" class="space__buttons">
      <button type="button" class="space__btn" @click="togglePause">
        <svg v-if="status === 'playing'" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5v14M16 5v14" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        <span class="sr-only">{{ status === 'playing' ? 'Pause' : 'Weiter' }}</span>
      </button>
      <button type="button" class="space__btn" :aria-pressed="muted" @click="toggleMute">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9h4l5-4v14l-5-4H4z" />
          <path v-if="!muted" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
          <path v-else d="M16 9l5 6M21 9l-5 6" />
        </svg>
        <span class="sr-only">{{ muted ? 'Ton an' : 'Ton aus' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* über die volle Seitenbreite, ohne Rahmen und ohne eigenen Hintergrund */
.space {
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  height: min(92vh, 900px);
  min-height: 460px;
  outline: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;

  &:focus-visible .space__cannon {
    outline: 3px solid #ffd23f;
    outline-offset: 4px;
  }
}

.space__stage {
  position: absolute;
  inset: 0;
  perspective: 1400px;
  pointer-events: none;
}

.space__hero,
.space__fx {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

.space__hero {
  /* weich in die Seite auslaufen statt an einer Bildkante abgeschnitten */
  mask-image: linear-gradient(to bottom, transparent 0, #000 7%, #000 78%, transparent 100%);
  transform-origin: 50% 60%;
  backface-visibility: hidden;
  will-change: transform;
}

.space__cannon {
  position: absolute;
  z-index: 3;
  padding: 0;
  border: 0;
  border-radius: 40%;
  background: transparent;
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid #ffd23f;
    outline-offset: 4px;
  }
}

/* Comic-Sprechblase über der Kanone */
.space__bubble {
  position: absolute;
  z-index: 3;
  margin: 0;
  padding: 0.55em 0.9em;
  border: 3px solid #111;
  border-radius: 1.2em;
  background: #fff;
  color: #111;
  font-family: Impact, 'Arial Black', sans-serif;
  font-size: clamp(0.95rem, 1.6vw, 1.25rem);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  box-shadow: 4px 5px 0 rgb(0 0 0 / 55%);
  pointer-events: none;
  animation: bob 1.4s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    left: 2.2em;
    bottom: -14px;
    width: 18px;
    height: 18px;
    background: #fff;
    border-right: 3px solid #111;
    border-bottom: 3px solid #111;
    transform: rotate(45deg);
  }
}

.space__bubble--quiet {
  left: 50%;
  top: 45%;
  translate: -50% 0;
  animation: none;

  &::after {
    display: none;
  }
}

.space__error {
  position: absolute;
  left: 50%;
  bottom: 4%;
  translate: -50% 0;
  margin: 0;
  color: #ff8a8a;
  font-size: 0.95rem;
}

.space__buttons {
  position: absolute;
  z-index: 3;
  left: 50%;
  bottom: 3%;
  translate: -50% 0;
  display: flex;
  gap: 10px;
}

.space__btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 3px solid #111;
  border-radius: 50%;
  background: #ffd23f;
  color: #111;
  cursor: pointer;
  box-shadow: 3px 4px 0 rgb(0 0 0 / 55%);
  transition: transform 0.15s ease;

  &:hover,
  &:focus-visible {
    transform: translateY(-2px);
  }

  svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
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

.pow {
  position: absolute;
  z-index: 2;
  top: 12%;
  left: var(--x);
  translate: -50% 0;
  display: grid;
  place-items: center;
  padding: 0.35em 0.8em 0.45em;
  pointer-events: none;
  font-family: Impact, 'Arial Black', 'Helvetica Neue', sans-serif;
  font-size: clamp(1.8rem, 5.5vw, 4.8rem);
  font-weight: 900;
  letter-spacing: 0.03em;
  line-height: 1;
  rotate: var(--tilt);
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
  --x: 24%;
  --burst: radial-gradient(circle at 50% 50%, #fff38a, #ffc52e 55%, #ff7a1a);
  --ink: #e62e3c;
}

.pow--clap {
  --x: 76%;
  --burst: radial-gradient(circle at 50% 50%, #e6f1ff, #7fb2ff 55%, #2a5bd7);
  --ink: #fff;
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

@keyframes bob {
  50% {
    transform: translateY(-6px);
  }
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

@media (prefers-reduced-motion: reduce) {
  .space__bubble,
  .pow {
    animation: none;
  }
}
</style>

<script setup lang="ts">
// Globale Atmosphäre: Glühwürmchen und langsam treibende Nebelschwaden über allen Seiten.
// Liegt über den Inhalten (aber unter Kopfleiste und Kompass) und fängt keine Klicks ab.

// deterministisch verteilt, damit es bei jedem Laden gleich aussieht
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const fireflies = Array.from({ length: 16 }, (_, index) => ({
  x: 4 + rnd() * 92,
  y: 8 + rnd() * 86,
  size: 2.2 + rnd() * 2.4,
  // weite, langsame Flugbahn plus kurzes Flackern
  dx: (rnd() - 0.5) * 18,
  dy: (rnd() - 0.5) * 14,
  wander: 16 + rnd() * 14,
  flicker: 3.2 + rnd() * 2.6,
  delay: -rnd() * 20,
  mobile: index < 10, // auf dem Handy weniger
}));
</script>

<template>
  <div class="ambient" aria-hidden="true">
    <div class="ambient__fog ambient__fog--far" />
    <div class="ambient__fog ambient__fog--near" />
    <span
      v-for="(fly, index) in fireflies"
      :key="index"
      class="ambient__fly"
      :class="{ 'is-desktop-only': !fly.mobile }"
      :style="{
        '--x': `${fly.x}%`,
        '--y': `${fly.y}%`,
        '--size': `${fly.size}px`,
        '--dx': `${fly.dx}vw`,
        '--dy': `${fly.dy}vh`,
        '--wander': `${fly.wander}s`,
        '--flicker': `${fly.flicker}s`,
        '--delay': `${fly.delay}s`,
      }"
    />
  </div>
</template>

<style scoped lang="scss">
.ambient {
  --fog: 205 214 196; // kühles, leicht grünliches Grau
  --fog-strength: 0.7; // zart genug, dass Texte und Bilder klar bleiben
  position: fixed;
  inset: 0;
  z-index: 25; // über den Inhalten, unter Kopfleiste (30) und Kompass (40)
  overflow: hidden;
  pointer-events: none;
}

:root[data-theme='light'] .ambient {
  --fog: 196 202 210; // helles Grau statt Weiß – sonst verschwinden die Hintergründe
  --fog-strength: 0.45;
}

/* Nebel: große, weiche Schwaden, die langsam seitlich ziehen */
.ambient__fog {
  position: absolute;
  inset: -20% -40%;
  background-repeat: no-repeat;
  will-change: transform;
}

.ambient__fog--far {
  background:
    radial-gradient(ellipse 30% 12% at 22% 78%, rgb(var(--fog) / 7%), transparent 70%),
    radial-gradient(ellipse 26% 10% at 68% 88%, rgb(var(--fog) / 6%), transparent 70%),
    radial-gradient(ellipse 22% 9% at 48% 30%, rgb(var(--fog) / 4%), transparent 70%);
  opacity: var(--fog-strength);
  animation: fog-drift 70s ease-in-out infinite alternate;
}

.ambient__fog--near {
  background:
    radial-gradient(ellipse 34% 14% at 75% 92%, rgb(var(--fog) / 8%), transparent 70%),
    radial-gradient(ellipse 28% 11% at 18% 52%, rgb(var(--fog) / 5%), transparent 70%);
  opacity: var(--fog-strength);
  animation: fog-drift 48s ease-in-out -20s infinite alternate-reverse;
}

@keyframes fog-drift {
  from {
    transform: translate3d(-6%, 0, 0);
  }

  to {
    transform: translate3d(6%, -2%, 0);
  }
}

/* Glühwürmchen: wandern langsam, flackern dabei auf und ab */
.ambient__fly {
  position: absolute;
  top: var(--y);
  left: var(--x);
  width: var(--size);
  aspect-ratio: 1;
  animation: fly-wander var(--wander) var(--delay) ease-in-out infinite alternate;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--forest-firefly);
    box-shadow:
      0 0 8px 2px var(--forest-firefly-glow),
      0 0 18px 5px var(--forest-firefly-glow);
    animation: fly-flicker var(--flicker) var(--delay) ease-in-out infinite alternate;
  }
}

@keyframes fly-wander {
  from {
    translate: 0 0;
  }

  50% {
    translate: calc(var(--dx) * 0.6) calc(var(--dy) * -0.4);
  }

  to {
    translate: var(--dx) var(--dy);
  }
}

@keyframes fly-flicker {
  0% {
    opacity: 0.1;
    scale: 0.7;
  }

  45% {
    opacity: 0.85;
    scale: 1.1;
  }

  100% {
    opacity: 0.3;
    scale: 0.85;
  }
}

@media (width <= 900px) {
  .is-desktop-only {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ambient__fog,
  .ambient__fly,
  .ambient__fly::after {
    animation: none;
  }

  .ambient__fly::after {
    opacity: 0.45;
  }
}
</style>

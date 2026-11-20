<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ value: number; max?: number }>();
const max = computed(() => props.max ?? 5);
// Brennende Kerzen: leicht unterschiedlich weit abgebrannt, damit es nicht gestempelt wirkt
const burnHeights = [30, 33, 28, 31, 29];
</script>

<template>
  <div class="candles" role="img" :aria-label="`Zufriedenheit: ${value} von ${max} Kerzen`">
    <svg
      v-for="index in max"
      :key="index"
      class="candle"
      :class="{ lit: index <= value }"
      viewBox="0 0 20 46"
      aria-hidden="true"
    >
      <template v-if="index <= value">
        <!-- Flamme mit Lichthof -->
        <ellipse
          class="candle__glow"
          cx="10"
          :cy="44 - burnHeights[index - 1]! - 7"
          rx="9"
          ry="10"
        />
        <path
          class="candle__flame"
          :d="`M10 ${44 - burnHeights[index - 1]! - 12} q4 5 0 9 q-4 -4 0 -9z`"
          :style="{ animationDelay: `${index * -0.37}s` }"
        />
        <line
          class="candle__wick"
          x1="10"
          x2="10"
          :y1="44 - burnHeights[index - 1]!"
          :y2="44 - burnHeights[index - 1]! - 3"
        />
        <rect
          class="candle__wax"
          x="5"
          :y="44 - burnHeights[index - 1]!"
          width="10"
          :height="burnHeights[index - 1]"
          rx="1.5"
        />
        <path
          class="candle__drip"
          :d="`M5.5 ${44 - burnHeights[index - 1]! + 1} v5 a1.3 1.3 0 0 0 2.6 0 v-5z`"
        />
      </template>
      <template v-else>
        <!-- ausgeblasen: verkohlter Docht -->
        <line class="candle__wick candle__wick--out" x1="10" x2="10" y1="10" y2="6" />
        <rect class="candle__wax candle__wax--out" x="5" y="10" width="10" height="34" rx="1.5" />
      </template>
      <ellipse class="candle__dish" cx="10" cy="44.4" rx="9" ry="1.6" />
    </svg>
  </div>
</template>

<style scoped lang="scss">
.candles {
  display: flex;
  align-items: flex-end;
  gap: 0.35em;
}

.candle {
  width: 1.15em;
  height: auto;
  overflow: visible;
}

.candle__wax {
  fill: #efe1bf;
  stroke: #8c6a3f;
  stroke-width: 0.7;
}

/* ausgeblasen: kühleres, graueres Wachs – deutlich sichtbar, aber ohne Licht */
.candle__wax--out {
  fill: #ddd2bb;
  stroke: #7d6646;
}

.candle__wick--out {
  stroke: #1b130b;
  stroke-width: 1.2;
}


.candle__drip {
  fill: #efe1bf;
  stroke: #8c6a3f;
  stroke-width: 0.5;
}

.candle__wick {
  stroke: #2e2216;
  stroke-width: 1;
  stroke-linecap: round;
}

.candle__dish {
  fill: #7a5a33;
  opacity: 0.7;
}

.candle__flame {
  fill: #f2a23a;
  stroke: #c7561e;
  stroke-width: 0.5;
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: flicker 1.6s ease-in-out infinite;
}

.candle__glow {
  fill: rgb(255 190 90 / 34%);
  filter: blur(1px);
}


@keyframes flicker {
  0%,
  100% {
    transform: scale(1, 1) rotate(-2deg);
  }

  40% {
    transform: scale(0.92, 1.08) rotate(3deg);
  }

  70% {
    transform: scale(1.05, 0.94) rotate(-1deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .candle__flame {
    animation: none;
  }
}
</style>

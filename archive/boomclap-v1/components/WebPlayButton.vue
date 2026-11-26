<script setup lang="ts">
/**
 * Runder Play-Button im Spider-Man-Look: rote Scheibe mit Netz, das
 * Play-Dreieck ist ein Augenglas der Maske. Darüber seilt sich eine Spinne ab.
 */
defineProps<{
  mode: 'play' | 'replay';
  label: string;
  loading?: boolean;
}>();
defineEmits<{ click: [] }>();

/** Netzring: Polygon mit nach innen durchhängenden Kanten */
function webRing(r: number) {
  const n = 16;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) {
      d += `M${x.toFixed(2)} ${y.toFixed(2)}`;
    } else {
      const am = a - Math.PI / n;
      d += `Q${(Math.cos(am) * r * 0.86).toFixed(2)} ${(Math.sin(am) * r * 0.86).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  }
  return d;
}
</script>

<template>
  <button
    type="button"
    class="web-btn"
    :class="{ 'is-replay': mode === 'replay', 'is-loading': loading }"
    :aria-busy="loading"
    @click.stop="$emit('click')"
  >
    <span class="web-btn__thread" aria-hidden="true"></span>
    <span class="web-btn__spider" aria-hidden="true">
      <svg viewBox="-12 -12 24 24">
        <g fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-width="1.3">
          <path
            fill="none"
            d="M-1.5-2Q-6-6-7-10M1.5-2Q6-6 7-10M-2-1Q-8-2-10-6M2-1Q8-2 10-6M-2 1Q-8 2-10 6M2 1Q8 2 10 6M-1.5 2.5Q-5 6-6 10M1.5 2.5Q5 6 6 10"
          />
          <ellipse cx="0" cy="-1" rx="2.6" ry="3.4" stroke="none" />
          <ellipse cx="0" cy="4" rx="2.1" ry="3.4" stroke="none" />
          <circle cx="0" cy="-5.6" r="1.8" stroke="none" />
        </g>
      </svg>
    </span>
    <svg class="web-btn__disc" viewBox="-50 -50 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="web-btn-red" cx="35%" cy="30%" r="80%">
          <stop offset="0" stop-color="#ff5a5f" />
          <stop offset="0.55" stop-color="#c51f2b" />
          <stop offset="1" stop-color="#5e0a12" />
        </radialGradient>
        <linearGradient id="web-btn-lens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff" />
          <stop offset="1" stop-color="#d4ddf0" />
        </linearGradient>
      </defs>
      <circle r="46" fill="url(#web-btn-red)" />
      <g class="web-btn__web" fill="none" stroke="#14060a" stroke-width="0.9" stroke-opacity="0.75">
        <path
          d="M0-46V46M-46 0H46M-32.5-32.5L32.5 32.5M32.5-32.5L-32.5 32.5M-17.6-42.5L17.6 42.5M17.6-42.5L-17.6 42.5M-42.5-17.6L42.5 17.6M42.5-17.6L-42.5 17.6"
        />
        <path v-for="r in [11, 20, 29, 38]" :key="r" :d="webRing(r)" />
      </g>
      <circle r="46" fill="none" stroke="#14060a" stroke-width="2.5" />
      <circle r="43" fill="none" stroke="#ff9fae" stroke-opacity="0.35" stroke-width="1" />
      <!-- Play-Dreieck als Augenglas der Maske -->
      <path
        v-if="mode === 'play'"
        class="web-btn__lens"
        d="M-11-21Q4-10 25 0Q4 10-11 21Q-4 0-11-21Z"
        fill="url(#web-btn-lens)"
        stroke="#08080b"
        stroke-width="4.5"
        stroke-linejoin="round"
      />
      <g v-else class="web-btn__lens" fill="none" stroke="#08080b" stroke-linecap="round">
        <path d="M17 -9A19 19 0 1 0 19 6" stroke-width="10" />
        <path d="M17 -9A19 19 0 1 0 19 6" stroke="#fff" stroke-width="5" />
        <path d="M9-14L19-9 21-20" stroke-width="10" stroke-linejoin="round" />
        <path d="M9-14L19-9 21-20" stroke="#fff" stroke-width="5" stroke-linejoin="round" />
      </g>
    </svg>
    <span class="web-btn__label">{{ loading ? 'Song lädt …' : label }}</span>
  </button>
</template>

<style scoped lang="scss">
.web-btn {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 14px;
  padding: 0;
  border: 0;
  background: none;
  color: #fff;
  font: inherit;
  cursor: pointer;

  &:focus-visible {
    outline: none;

    .web-btn__disc {
      outline: 3px solid #fff;
      outline-offset: 6px;
      border-radius: 50%;
    }
  }
}

.web-btn__disc {
  width: clamp(96px, 12vw, 132px);
  height: auto;
  overflow: visible;
  filter: drop-shadow(0 0 22px rgb(255 50 70 / 55%)) drop-shadow(0 12px 20px rgb(0 0 0 / 50%));
  transition:
    transform 0.35s cubic-bezier(0.3, 1.6, 0.5, 1),
    filter 0.3s ease;
  animation: heartbeat 2.4s ease-in-out infinite;
}

.web-btn__web,
.web-btn__lens {
  transform-origin: center;
  transition: transform 0.6s ease;
}

.web-btn:hover .web-btn__disc,
.web-btn:focus-visible .web-btn__disc {
  transform: scale(1.07);
  filter: drop-shadow(0 0 30px rgb(255 50 70 / 80%)) drop-shadow(0 12px 20px rgb(0 0 0 / 50%));
}

.web-btn:hover .web-btn__web {
  transform: rotate(22.5deg);
}

.web-btn:hover .web-btn__lens {
  transform: scale(1.08) translateX(1px);
}

.web-btn:active .web-btn__disc {
  transform: scale(0.94);
}

.web-btn.is-replay .web-btn__disc {
  filter: drop-shadow(0 0 22px rgb(120 80 255 / 55%)) drop-shadow(0 12px 20px rgb(0 0 0 / 50%));
}

.web-btn.is-loading .web-btn__web {
  animation: spin 1.4s linear infinite;
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

@keyframes heartbeat {
  0%,
  40%,
  100% {
    scale: 1;
  }

  10% {
    scale: 1.05;
  }

  20% {
    scale: 0.99;
  }

  28% {
    scale: 1.04;
  }
}

/* Spinne seilt sich über dem Button ab */
.web-btn__thread {
  position: absolute;
  bottom: calc(100% + 70px);
  left: 50%;
  width: 1px;
  height: 600px;
  translate: -50% 0;
  background: linear-gradient(
    0deg,
    rgb(255 255 255 / 75%),
    rgb(255 255 255 / 30%) 60%,
    transparent
  );
  transition: transform 0.6s cubic-bezier(0.3, 1.4, 0.5, 1);
}

.web-btn__spider {
  position: absolute;
  bottom: calc(100% + 52px);
  left: 50%;
  width: 24px;
  height: 24px;
  margin-left: -12px;
  color: #e3263a;
  filter: drop-shadow(0 0 1px #000) drop-shadow(0 0 6px rgb(255 60 80 / 70%));
  transform-origin: 50% -20px;
  transition: transform 0.6s cubic-bezier(0.3, 1.4, 0.5, 1);
  animation: dangle 3s ease-in-out infinite;

  svg {
    width: 100%;
    height: 100%;
  }
}

/* beim Hover seilt sie sich ein Stück weiter ab */
.web-btn:hover .web-btn__thread,
.web-btn:focus-visible .web-btn__thread,
.web-btn:hover .web-btn__spider,
.web-btn:focus-visible .web-btn__spider {
  transform: translateY(26px);
}

@keyframes dangle {
  0%,
  100% {
    rotate: -6deg;
  }

  50% {
    rotate: 6deg;
  }
}

.web-btn__label {
  padding: 8px 16px;
  border-radius: 999px;
  background: rgb(10 10 14 / 55%);
  border: 1px solid rgb(255 255 255 / 22%);
  font-family: 'Helvetica Neue', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  backdrop-filter: blur(6px);
}

@media (prefers-reduced-motion: reduce) {
  .web-btn__disc,
  .web-btn__spider,
  .web-btn.is-loading .web-btn__web {
    animation: none;
  }
}
</style>

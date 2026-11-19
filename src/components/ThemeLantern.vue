<script setup lang="ts">
import { ref } from 'vue';

const storageKey = 'portfolio-theme';

function savedDarkMode() {
  try {
    return localStorage.getItem(storageKey) !== 'light';
  } catch {
    return true;
  }
}

function applyTheme(dark: boolean) {
  const theme = dark ? 'dark' : 'light';
  const root = document.documentElement;
  root.dataset.theme = theme;

  const favicon = document.querySelector<HTMLLinkElement>('#site-favicon');
  const icon = dark ? 'favicon-gold.svg' : 'favicon-light.svg';
  if (favicon) favicon.href = `${import.meta.env.BASE_URL}assets/logos/${icon}`;

  const colorScheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (colorScheme) colorScheme.content = theme;

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const color = getComputedStyle(root).getPropertyValue('--browser-theme-color').trim();
  if (themeColor && color) themeColor.content = color;

  return theme;
}

const isDark = ref(savedDarkMode());
applyTheme(isDark.value);

function toggleTheme() {
  isDark.value = !isDark.value;
  const theme = applyTheme(isDark.value);

  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // Das Farbschema kann auch ohne lokalen Speicher gewechselt werden.
  }
}
</script>

<template>
  <button
    class="theme-lantern"
    type="button"
    aria-label="Dunkelmodus"
    :aria-pressed="isDark"
    :title="isDark ? 'Hellen Modus einschalten' : 'Dunkelmodus einschalten'"
    @click="toggleTheme"
  >
    <span class="lantern" :class="{ 'is-lit': isDark }" aria-hidden="true">
      <span class="lantern__chain"><span v-for="link in 5" :key="link"></span></span>
      <span class="lantern__handle"></span>
      <span class="lantern__crown"></span>
      <span class="lantern__glass">
        <span class="lantern__flame"></span>
      </span>
      <span class="lantern__frame"></span>
      <span class="lantern__base"></span>
    </span>
  </button>
</template>

<style scoped lang="scss">
.theme-lantern {
  --lantern-offset: calc(2.1rem + env(safe-area-inset-top, 0px));
  --button-height: 6.25rem;
  --lantern-height: 5.5rem;
  position: absolute;
  top: var(--lantern-offset);
  right: max(clamp(1.5rem, 3.2vw, 3.25rem), env(safe-area-inset-right, 0px));
  display: grid;
  width: 4.5rem;
  height: var(--button-height);
  place-items: center;
  border-radius: 0.65rem;
  background: transparent;
  pointer-events: auto;
}

.lantern {
  --chain-drop: calc(var(--lantern-offset) + (var(--button-height) - var(--lantern-height)) / 2);
  --brass: linear-gradient(
    90deg,
    #392614,
    #9e7544 13%,
    #f4cb80 26%,
    #7a512b 48%,
    #b9864b 72%,
    #55381e 90%,
    #2d2015
  );
  position: relative;
  width: 3.5rem;
  height: var(--lantern-height);
  isolation: isolate;
  filter: drop-shadow(0 3px 4px rgb(38 23 12 / 45%));
  transform-origin: 50% calc(-1 * var(--chain-drop));
  transition: transform 360ms cubic-bezier(0.2, 0.75, 0.3, 1);
}

.theme-lantern:is(:hover, :focus-visible) .lantern {
  transform: rotate(-5deg);
}

.lantern::before {
  position: absolute;
  inset: 10% -60% -30%;
  z-index: -1;
  content: '';
  background: radial-gradient(ellipse at 50% 53%, rgb(255 186 64 / 56%), transparent 67%);
  opacity: 0;
  transition: opacity 360ms ease-out;
}

.lantern.is-lit::before {
  opacity: 1;
}

.lantern__chain {
  position: absolute;
  z-index: 1;
  top: calc(-1 * var(--chain-drop) - 0.2rem);
  left: 50%;
  display: flex;
  height: calc(var(--chain-drop) + 0.5rem);
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  translate: -50% 0;
}

.lantern__chain span {
  width: 0.6rem;
  flex: 1;
  border: 2px solid #a3784b;
  border-top-color: #ebc58e;
  border-bottom-color: #513821;
  border-radius: 50%;
  box-shadow: inset 0 0 1px #513821;
}

.lantern__chain span + span {
  margin-top: -0.16rem;
}

.lantern__chain span:nth-child(even) {
  z-index: 1;
  width: 0.27rem;
  border: 1px solid #754e2c;
  background: linear-gradient(90deg, #79512d, #e5b97f, #674328);
}

.lantern__handle {
  position: absolute;
  inset: 0 31% auto;
  height: 23%;
  border: 3px solid #9b7041;
  border-top-color: #ebc58e;
  border-bottom-color: #513821;
  border-radius: 50%;
  box-shadow:
    inset 0 0 0 1px #513821,
    0 1px 2px rgb(0 0 0 / 55%);
}

.lantern__crown {
  position: absolute;
  inset: 15% 1% auto;
  height: 21%;
  background:
    linear-gradient(
      180deg,
      rgb(255 226 170 / 55%),
      transparent 38%,
      rgb(30 22 15 / 45%) 65%,
      #dda964 78%,
      #4a321e 87%
    ),
    var(--brass);
  clip-path: polygon(
    0 78%,
    15% 56%,
    28% 53%,
    44% 12%,
    50% 0,
    56% 12%,
    72% 53%,
    85% 56%,
    100% 78%,
    96% 100%,
    4% 100%
  );
}

.lantern__glass {
  position: absolute;
  inset: 34% 13% 15%;
  overflow: hidden;
  background:
    linear-gradient(
      105deg,
      transparent 12%,
      rgb(241 253 255 / 48%) 23%,
      transparent 32%,
      transparent 70%,
      rgb(241 253 255 / 36%) 81%,
      transparent 87%
    ),
    linear-gradient(160deg, #9aafad, #526364 55%, #3e4947);
  clip-path: polygon(0 0, 100% 0, 87% 100%, 13% 100%);
}

.lantern__glass::before {
  position: absolute;
  inset: 0;
  content: '';
  background: radial-gradient(
    ellipse at 50% 70%,
    #fff1b2 0%,
    #ffd171 25%,
    #bc6b27 64%,
    #734323 100%
  );
  opacity: 0;
  transition: opacity 300ms ease-out;
}

.is-lit .lantern__glass::before {
  opacity: 1;
}

.lantern__glass::after {
  position: absolute;
  inset: auto 24% 4%;
  height: 11%;
  content: '';
  border-radius: 50%;
  background: linear-gradient(#aa8051, #4f3721 70%);
}

.lantern__flame {
  position: absolute;
  bottom: 13%;
  left: 38%;
  width: 24%;
  height: 45%;
  border-radius: 70% 25% 60% 55%;
  background: radial-gradient(
    ellipse at 45% 76%,
    #fffef4 15%,
    #fff6b7 38%,
    #ffc04f 64%,
    #ed781e 84%
  );
  box-shadow: 0 0 10px 3px rgb(255 222 118 / 90%);
  opacity: 0;
  transform-origin: 50% 95%;
  transition: opacity 260ms ease;
}

.is-lit .lantern__flame {
  opacity: 1;
  animation: flicker 1.9s ease-in-out infinite alternate;
}

.lantern__frame {
  position: absolute;
  inset: 33% 7% 14%;
  border: 2px solid #a47543;
  border-inline-width: 0;
  background: linear-gradient(
    90deg,
    transparent 46%,
    #684624 47%,
    #e5b777 50%,
    #6b4828 54%,
    transparent 55%
  );
}

.lantern__frame::before,
.lantern__frame::after {
  position: absolute;
  top: -3%;
  width: 9%;
  height: 106%;
  content: '';
  border-radius: 2px;
  background: linear-gradient(90deg, #543722, #dba96b 48%, #69482b 86%);
}

.lantern__frame::before {
  left: 9%;
  rotate: -6deg;
}

.lantern__frame::after {
  right: 9%;
  rotate: 6deg;
}

.lantern__base {
  position: absolute;
  inset: auto 9% 0;
  height: 20%;
  background:
    linear-gradient(
      180deg,
      #4b3320,
      transparent 27%,
      #edc389 37%,
      #754c2b 47%,
      transparent 63%,
      #2b1f17 95%
    ),
    var(--brass);
  clip-path: polygon(
    8% 0,
    92% 0,
    95% 29%,
    86% 55%,
    100% 73%,
    100% 87%,
    93% 100%,
    7% 100%,
    0 87%,
    0 73%,
    14% 55%,
    5% 29%
  );
}

@keyframes flicker {
  0%,
  100% {
    transform: rotate(6deg) scale(0.94, 1.03);
  }
  42% {
    transform: rotate(-3deg) scale(1.03, 0.94);
  }
  73% {
    transform: rotate(2deg) scale(0.95, 1.08);
  }
}

@media (width <= 900px) {
  .theme-lantern {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lantern,
  .lantern::before,
  .lantern__glass::before,
  .lantern__flame {
    transition: none;
  }

  .theme-lantern:is(:hover, :focus-visible) .lantern {
    transform: none;
  }

  .is-lit .lantern__flame {
    animation: none;
  }
}
</style>

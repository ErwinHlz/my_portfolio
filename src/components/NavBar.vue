<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavOrb from './NavOrb.vue';
import ThemeLantern from './ThemeLantern.vue';

const route = useRoute();
const router = useRouter();
// Auf Unterseiten bekommt die Leiste einen dunklen Hintergrund, damit Inhalte nicht durchscheinen
const isSolid = computed(() => route.name !== 'home');

const links = [
  { to: '/about', label: 'Über mich' },
  { to: '/leistungen', label: 'Leistungen' },
  { to: '/projekte', label: 'Projekte' },
  { to: '/playground', label: 'Playground' },
  { to: '/contact', label: 'Kontakt' },
];

const slotAngles = [161, 124, 90, 56, 19];
const centerSlot = Math.floor(slotAngles.length / 2);
const activeIndex = computed(() => {
  const index = links.findIndex((link) => link.to === route.path);
  return index === -1 ? centerSlot : index;
});

function slotFor(index: number, active: number) {
  return (index - active + centerSlot + links.length) % links.length;
}

const angles = ref(links.map((_, index) => slotAngles[slotFor(index, activeIndex.value)]!));
const desktopLinks = computed(() =>
  slotAngles.map((_, slot) => {
    const index = (slot + activeIndex.value - centerSlot + links.length) % links.length;
    return { ...links[index]!, angle: angles.value[index]! };
  }),
);

watch(activeIndex, (next, previous) => {
  const steps = (next - previous + links.length) % links.length;
  const forward = steps < links.length / 2;

  // Beim Umlauf laufen die äußeren Links über die obere Hälfte der Bahn zurück.
  angles.value = angles.value.map((from, index) => {
    const slot = slotAngles[slotFor(index, next)]!;
    const turns = (from - slot) / 360;
    return slot + (forward ? Math.ceil(turns) : Math.floor(turns)) * 360;
  });
});

const isMenuOpen = ref(false);
const sideMenu = ref<HTMLElement | null>(null);
const navOrb = ref<InstanceType<typeof NavOrb> | null>(null);
const activatingLink = ref<string | null>(null);
let activationTimer: number | undefined;

function activateLink(event: MouseEvent, to: string) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  window.clearTimeout(activationTimer);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    void router.push(to);
    return;
  }

  activatingLink.value = to;
  activationTimer = window.setTimeout(() => {
    activatingLink.value = null;
    void router.push(to);
  }, 190);
}

async function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
  if (isMenuOpen.value) {
    await nextTick();
    sideMenu.value?.focus();
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') isMenuOpen.value = false;
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  window.clearTimeout(activationTimer);
});
</script>

<template>
  <div>
    <header class="header-container" :class="{ 'is-solid': isSolid }">
      <div class="header-left">
        <RouterLink class="logo-link" to="/home" aria-label="Zur Startseite">
          <svg
            class="logo"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 323.9 317.16"
            aria-hidden="true"
          >
            <defs>
              <g id="nav-logo-monogram">
                <path d="M26.71,244.01s0,0,0,0c-1.09-.21-.49.66,0,0Z" />
                <path
                  d="M13.37,131.86c1.48.88,3.26.9,4.73,1.79,1.89-.08,3.78-.16,5.67-.24-1.18,33.66-1.68,67.3,1.98,100.55-2.65,1.77-5.24,3.68-7.76,5.71,2.64-1.08,5.34-2.07,8.06-3,.27,2.31.55,4.61.87,6.91-.06.19-.14.32-.21.43,5.84.13,11.14-6.89,16.03-11.85,16.85-3.44,34.32-3.64,50.66.42,25.76,10.13,62.7,12.77,76.33-17.05-21.83,11.09-40.9,13.33-63.54,4.25-18.74-5-38.56-4-56.96,2.43-4.13-8.66-8.83-16.45-10.55-26.37-1.71-20.56-3.14-41.77-3.26-62.93,19.36-.83,38.72-1.66,58.07-2.49,18.45-2.21,22.41,14.18,10.68,26.21-.16,0-.15,1.31-.31,1.31,45.06,1.83,37.52-54.01-7.34-48.33-10.27,1.39-19.72,9.99-29.21,14.36-9.7,5.15-21.01,3.06-31.89,2.69.23-31.91,3.71-63.54,14.05-92.51,21.87,5.15,45.75-2.55,66.87,6.99,5.58,2.68,10.69,6.8,16.56,8.45,24.83,6.21,19.7-34.24,3.02-37.88-7.22-1.79-14.3,2.84-21.17,6.02-9.61,4.45-20.61,5.3-30.94,4.93-22.03-.8-43.12,3.05-65.05,5.59,9.45,5.69,8.31,10.2,7.29,20.04.16,26.23-1.1,52.64-2.07,79.06-3.72.73-7.29,2.09-10.62,4.52Z"
                />
                <path
                  d="M323.9,96.02c-6.84,9.35-23.43,13.69-40.26,15.61-.8-37.44.93-74.95,4.74-111.63-6.83,8.47-18.16,13.83-29.75,14.06,3.19,32.77,4.63,65.84,6.87,98.83-10.94.35-20.31,0-24.9-.2,0,0-25,2.85-35.84-1.26-2.07-34.81-4.98-69.64-5.8-104.13-7.68,7.25-18.21,11.98-29.24,13.13,10.01,27.66,13.65,56.6,16.83,85.48.01,5.19.11,11.32.21,17.95l-.11.08s.07.03.11.04c.28,18.12.6,40.01-.5,57.03.4,12.49-2.98,25.93-.68,38.04,6.43,8.4,17.31,11.6,16.97,24.58,5.43-38.71,5.03-77.97,3.03-117.31,1.38-.09,2.73-.21,4.01-.36,14.22-1.7,28.63-.26,42.95.48,4.39.37,9.12.54,13.97.45,2.31,30.18,5.6,60.24,11.84,89.9-15.49,20.07-49.64,26.02-73.43,32.3-56.32,8.33-114.35,9.77-169.79,22.8-11.37,3.5-52.77,38.88-26.63,44.39,5.43.36,16.86,3.56,16.44-5.08.44-6.89,5.68-8.25,11.17-13.03,17.79-17.23,39.97-29.72,65.29-31.36,30.84-7.34,94.37-10.58,141.48-19.96-1.06,5.57-6.37,9.6-4.53,13.48,8.34-1.79,11.89-10.63,17.6-16.36,17.35-4.25,31.34-9.63,38.84-16.79-6-33.38-9.47-67.58-10.77-101.93,18.03-3.18,34.64-11.47,39.85-29.26Z"
                />
                <path
                  d="M209.36,296.01c.15,3.2,4.05,4.17,5.72,1.44,3.19-10.53,7.13-20.54,13.3-29.89-8.82,6.12-17.82,17.62-19.02,28.45Z"
                />
                <path
                  d="M142.86,77.24c-5.01,3.82-10.1,10.28-12.28,16.18-4.09,10.57,10.54,11.17,13.02,2.18,1.16-2.75,1.59-5.75,2.25-8.66,1.2-5.27,5.74-16.35-2.99-9.69Z"
                />
              </g>
              <linearGradient id="nav-logo-gold" x1="13%" y1="6%" x2="82%" y2="97%">
                <stop offset="0%" style="stop-color: var(--logo-tone-1)" />
                <stop offset="28%" style="stop-color: var(--logo-tone-2)" />
                <stop offset="56%" style="stop-color: var(--logo-tone-3)" />
                <stop offset="81%" style="stop-color: var(--logo-tone-4)" />
                <stop offset="100%" style="stop-color: var(--logo-tone-5)" />
              </linearGradient>
              <linearGradient id="nav-logo-reflection">
                <stop
                  offset="0%"
                  style="stop-color: var(--logo-reflection-edge)"
                  stop-opacity="0"
                />
                <stop
                  offset="35%"
                  style="stop-color: var(--logo-reflection-mid)"
                  stop-opacity=".4"
                />
                <stop offset="52%" style="stop-color: var(--logo-reflection-bright)" />
                <stop
                  offset="72%"
                  style="stop-color: var(--logo-reflection-mid)"
                  stop-opacity=".38"
                />
                <stop
                  offset="100%"
                  style="stop-color: var(--logo-reflection-edge)"
                  stop-opacity="0"
                />
              </linearGradient>
              <mask
                id="nav-logo-reflection-mask"
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="324"
                height="318"
              >
                <use href="#nav-logo-monogram" fill="white" stroke="white" />
              </mask>
            </defs>
            <use
              href="#nav-logo-monogram"
              fill="url(#nav-logo-gold)"
              stroke="url(#nav-logo-gold)"
            />
            <g mask="url(#nav-logo-reflection-mask)">
              <rect
                class="logo__reflection"
                x="-156"
                width="150"
                height="318"
                fill="url(#nav-logo-reflection)"
              />
            </g>
          </svg>
        </RouterLink>
      </div>

      <div class="header-center">
        <NavOrb ref="navOrb" />
        <nav
          class="header-links"
          aria-label="Hauptnavigation"
          @pointerenter="navOrb?.followPointer($event)"
          @pointermove="navOrb?.followPointer($event)"
          @pointerleave="navOrb?.stopFollowing()"
        >
          <RouterLink
            v-for="link in desktopLinks"
            :key="link.to"
            v-slot="{ href, isExactActive }"
            :to="link.to"
            custom
          >
            <a
              :href="href"
              :aria-current="isExactActive ? 'page' : undefined"
              :class="{ active: isExactActive, 'is-activating': activatingLink === link.to }"
              :style="{ '--nav-link-angle': `${link.angle}deg` }"
              @click="activateLink($event, link.to)"
            >
              <span>{{ link.label }}</span>
            </a>
          </RouterLink>
        </nav>
      </div>

      <ThemeLantern />

      <button
        id="menu-button"
        class="hamburger-btn"
        :class="{ open: isMenuOpen }"
        aria-label="Menü öffnen oder schließen"
        :aria-expanded="isMenuOpen"
        aria-controls="side-menu"
        @click="toggleMenu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="6" width="16" height="2" rx="1" fill="currentColor" />
          <rect x="4" y="11" width="16" height="2" rx="1" fill="currentColor" />
          <rect x="4" y="16" width="16" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>
    </header>

    <!-- Seitenmenü -->
    <div
      v-show="isMenuOpen"
      id="side-menu"
      ref="sideMenu"
      class="side-menu-container"
      role="navigation"
      aria-label="Seitennavigation"
      tabindex="-1"
    >
      <div class="side-header">
        <h3>Navigation</h3>
      </div>
      <nav class="side-nav">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" @click="toggleMenu">
          {{ link.label }}
        </RouterLink>
      </nav>
    </div>
  </div>
</template>

<style scoped lang="scss">
.header-container {
  position: fixed;
  inset: 0 0 auto;
  height: var(--site-header-depth);
  display: flex;
  align-items: center;
  pointer-events: none;
  z-index: 30;
  background: var(--header-home-surface);
}

.header-container.is-solid {
  background: var(--header-page-surface);
}

.header-center {
  --orb-size: 6.75rem;
  position: absolute;
  top: env(safe-area-inset-top, 0px);
  left: 50%;
  transform: translateX(-50%);
}

.header-links {
  position: relative;
  width: clamp(40rem, 60vw, 51rem);
  min-height: 8.5rem;
  container-type: inline-size;
  clip-path: inset(0 -3rem -1rem);
  pointer-events: auto;
}

@property --nav-link-angle {
  syntax: '<angle>';
  initial-value: 90deg;
  inherits: false;
}

.header-links a {
  --link-x: calc(40cqw * cos(var(--nav-link-angle)));
  --link-y: calc(1.15rem + 4.8rem * sin(var(--nav-link-angle)));
  --pull-x: 0px;
  --pull-y: 0px;
  --link-scale: 1;
  position: absolute;
  top: var(--link-y);
  left: calc(50% + var(--link-x));
  translate: -50% -50%;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  pointer-events: auto;
  color: var(--nav-link-color);
  font-size: clamp(1.15rem, 1.75vw, 1.4rem);
  font-weight: bold;
  text-decoration: none;
  white-space: nowrap;
  text-shadow: var(--nav-link-shadow);
  font-family: var(--font-accent);
  transition:
    --nav-link-angle 500ms cubic-bezier(0.22, 1, 0.36, 1),
    color 180ms ease-out;
}

.header-links a span {
  transform: translate(var(--pull-x), var(--pull-y)) scale(var(--link-scale));
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms ease-out;
}

.header-links a.active {
  --link-scale: 1.25;
  z-index: 1;
  color: var(--nav-active-color);
  text-shadow: var(--nav-active-shadow);
}

.header-links a:is(:hover, :focus-visible) {
  --pull-x: calc(-0.09 * var(--link-x));
  --pull-y: calc(0.18 * (1.4rem - var(--link-y)));
  --link-scale: 1.25;
  z-index: 2;
  color: var(--nav-active-color);
  filter: drop-shadow(0 0 7px var(--nav-hover-glow));
}

.header-links a.is-activating {
  --pull-x: calc(-1 * var(--link-x));
  --pull-y: calc(1.4rem - var(--link-y));
  --link-scale: 0.25;
  z-index: 3;
}

.header-links a.is-activating span {
  opacity: 0;
  transition-duration: 180ms;
  transition-timing-function: ease-in;
}

@media (prefers-reduced-motion: reduce) {
  .header-links a,
  .header-links a span {
    transition: none;
  }

  .header-links a span {
    transform: scale(var(--link-scale));
  }
}

.header-container :is(a, button):focus-visible {
  outline: 2px solid var(--accent-gold);
  outline-offset: 4px;
}

.side-nav a.active {
  color: var(--nav-active-color);
  font-size: 1.4rem;
}

.side-nav a.active::before {
  content: url('/assets/opticals/pfeil.svg');
  color: var(--accent-ember);
  position: relative;
  right: 1rem;
}

.hamburger-btn {
  position: absolute;
  top: calc(1rem + env(safe-area-inset-top, 0px));
  right: 1rem;
  display: grid;
  place-items: center;
  padding: 8px;
  pointer-events: auto;
  cursor: pointer;
  transition:
    color 0.2s ease,
    transform 0.2s ease,
    filter 0.2s ease;
  background-color: transparent;
  color: var(--text-heading);
}

.hamburger-btn svg {
  width: 3rem;
  height: 3rem;
}

.hamburger-btn.open {
  transform: rotate(90deg);
}

.hamburger-btn:hover {
  color: var(--accent-gold);
  filter: drop-shadow(0 0 8px var(--accent-gold));
  scale: 1.05;
}

.side-menu-container {
  overflow-y: auto;
  z-index: 15;
  position: absolute;
  right: 0;
  top: 0;
  background-image:
    radial-gradient(circle at 50% 0%, rgb(3 15 10 / 95%) 0, transparent 130%),
    radial-gradient(circle at 80% 40%, rgb(5 47 28 / 85%) 0, transparent 210%),
    radial-gradient(circle at 70% 100%, rgb(234 179 8 / 55%) 0, transparent 30%);
  box-shadow: 6px 0 24px rgb(var(--accent-gold-rgb), 0.16);
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
  height: 100%;
  padding-top: var(--site-header-depth);
  width: 20%;
  opacity: 0.9;
}

.side-header {
  display: flex;
  gap: 1rem;
  padding: 16px;
  justify-content: center;
  align-items: center;
}

.side-header h3 {
  font-size: 1.8rem;
}

.side-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  top: 3rem;
  gap: 3rem;
  padding: 16px;
}

.side-nav a {
  color: var(--nav-link-color);
  font-size: 1.7rem;
  font-weight: bold;
  text-decoration: none;
  text-shadow: var(--nav-link-shadow);
  font-family: var(--font-accent);
}

.side-nav a:hover {
  filter: drop-shadow(0 0 15px var(--accent-gold));
}

.header-left {
  position: absolute;
  top: calc(1.35rem + env(safe-area-inset-top, 0px));
  left: max(clamp(1.5rem, 3.2vw, 3.25rem), env(safe-area-inset-left, 0px));
  display: flex;
  align-items: center;
}

.logo-link {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  width: clamp(4.4rem, 5.6vw, 5.25rem);
  min-height: 44px;
  pointer-events: auto;
  text-decoration: none;
}

.logo-link::before {
  content: '';
  position: absolute;
  inset: -35%;
  z-index: -1;
  pointer-events: none;
  opacity: 0.45;
  background: radial-gradient(ellipse, var(--logo-halo), transparent 67%);
  animation: logo-halo 6.5s ease-in-out infinite;
  transition: opacity 420ms ease-out;
}

.logo {
  width: 100%;
  height: auto;
  display: block;
  transform: translateY(0) rotate(0deg) scale(1);
  filter: var(--logo-shadow);
  transition:
    transform 480ms cubic-bezier(0.2, 0.75, 0.25, 1),
    filter 420ms ease-out;
}

.logo-link:is(:hover, :focus-visible)::before {
  opacity: 0.9;
}

.logo-link:is(:hover, :focus-visible) .logo {
  transform: translateY(-2px) rotate(-3deg) scale(1.09);
  filter: var(--logo-hover-shadow);
}

.logo__reflection {
  opacity: 0;
  animation: logo-reflection 8.5s ease-in-out infinite;
}

@keyframes logo-halo {
  0%,
  100% {
    scale: 0.9;
  }

  50% {
    scale: 1.1;
  }
}

@keyframes logo-reflection {
  0%,
  7% {
    opacity: 0;
    transform: translateX(0) skewX(-18deg);
  }

  15% {
    opacity: 0.92;
  }

  25%,
  100% {
    opacity: 0;
    transform: translateX(600px) skewX(-18deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .logo-link::before,
  .logo__reflection {
    animation: none;
  }

  .logo-link::before,
  .logo {
    transition: none;
  }

  .logo-link:is(:hover, :focus-visible) .logo {
    transform: none;
  }
}

:root[data-theme='light'] .side-menu-container {
  background: var(--card-surface);
  opacity: 1;
}

@media (width > 900px) {
  .hamburger-btn,
  .side-menu-container {
    display: none;
  }
}

@media (width <= 900px) {
  .header-center {
    display: none;
  }

  .header-left {
    top: calc(1.1rem + env(safe-area-inset-top, 0px));
    left: max(1.25rem, env(safe-area-inset-left, 0px));
  }

  .logo-link {
    width: 3.8rem;
  }

  .side-menu-container {
    position: fixed;
    left: 0;
    right: auto;
    width: min(360px, 70vw);
    height: 100vh;
    box-shadow: var(--drawer-shadow);
    border-top-right-radius: 12px;
    border-bottom-right-radius: 12px;
  }

  .side-nav {
    align-items: center;
    top: 1rem;
  }

  .side-nav a {
    font-size: 1.4rem;
  }
}

@media (width <= 600px) {
  .side-menu-container {
    width: 100%;
    border-radius: 0;
  }

  .side-header {
    justify-content: center;
  }

  .side-nav {
    gap: 1.4rem;
    align-items: center;
  }

  .side-nav a {
    font-size: 1.2rem;
  }
}
</style>

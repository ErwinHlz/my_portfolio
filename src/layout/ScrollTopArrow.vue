<script setup lang="ts">
// Kleiner Holzpfeil (aus einem Brett geschnitten), der zurück nach oben bringt. Erscheint, sobald man auf einer Seite ein
// Stück gescrollt hat; gescrollt wird immer im Bereich, in dem man sich gerade bewegt.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const visible = ref(false);
let scroller: HTMLElement | null = null;
let frame = 0;

function update() {
  frame = 0;
  if (!scroller) return;
  visible.value = scroller.scrollTop > Math.max(480, scroller.clientHeight * 0.8);
}

// scroll-Ereignisse steigen nicht auf – im Capture-Modus kommt trotzdem jedes an
function onScroll(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains('page-content')) return;
  scroller = target;
  if (!frame) frame = requestAnimationFrame(update);
}

function toTop() {
  if (!scroller) return;
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  scroller.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
}

// Seitenwechsel (außerhalb der Handy-Scrollseite): Pfeil erst wieder nach dem Scrollen zeigen
watch(
  () => route.name,
  () => {
    requestAnimationFrame(() => {
      if (scroller && !scroller.isConnected) {
        scroller = null;
        visible.value = false;
      }
    });
  },
);

onMounted(() => document.addEventListener('scroll', onScroll, { capture: true, passive: true }));
onBeforeUnmount(() => {
  document.removeEventListener('scroll', onScroll, { capture: true });
  cancelAnimationFrame(frame);
});
</script>

<template>
  <Transition name="arrow">
    <button
      v-show="visible"
      type="button"
      class="scroll-top"
      aria-label="Nach oben scrollen"
      title="Nach oben"
      @click="toTop"
    >
      <!-- Holzpfeil nach oben: ein aus einem Brett geschnittener Pfeil mit Maserung -->
      <svg viewBox="0 0 40 60" aria-hidden="true">
        <defs>
          <linearGradient id="wood-arrow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#5e3d1c" />
            <stop offset="35%" stop-color="#a8743d" />
            <stop offset="60%" stop-color="#c9955a" />
            <stop offset="100%" stop-color="#6b4320" />
          </linearGradient>
        </defs>
        <path
          d="M20 2 L 38 24 L 27 24 L 27 57 L 13 57 L 13 24 L 2 24 Z"
          fill="url(#wood-arrow)"
          stroke="#3a230f"
          stroke-width="1.4"
          stroke-linejoin="round"
        />
        <!-- Maserung längs des Bretts, ein Astloch -->
        <path
          d="M17 27 q-1 14 0.5 28 M22.5 27 q1.2 12 -0.4 28 M20 8 q-3 6 -6.5 13 M20 8 q3 6 6.5 13"
          fill="none"
          stroke="#4a2e14"
          stroke-width="0.6"
          opacity="0.65"
        />
        <ellipse cx="20.5" cy="41" rx="1.6" ry="2.6" fill="#4a2e14" opacity="0.8" />
        <ellipse cx="20.5" cy="41" rx="3.2" ry="4.6" fill="none" stroke="#4a2e14" stroke-width="0.5" opacity="0.5" />
        <!-- helle, abgegriffene Kanten -->
        <path d="M4.6 23 L 20 4.2 L 35.4 23" fill="none" stroke="#e8c48a" stroke-width="0.9" opacity="0.6" />
        <path d="M14.2 26 L 14.2 55.5" stroke="#e8c48a" stroke-width="0.8" opacity="0.45" />
        <!-- Nagel -->
        <circle cx="20" cy="31" r="1.3" fill="#2b2b2b" />
        <circle cx="19.6" cy="30.6" r="0.4" fill="#9a9a9a" />
      </svg>
    </button>
  </Transition>
</template>

<style scoped lang="scss">
.scroll-top {
  position: fixed;
  right: max(6px, env(safe-area-inset-right, 0px));
  bottom: calc(6px + env(safe-area-inset-bottom, 0px));
  z-index: 27; // über Nebel und Glühwürmchen, unter Kopfleiste und Kompass
  display: grid;
  place-items: center;
  width: 44px;
  height: 56px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  opacity: 0.7;
  filter: drop-shadow(0 4px 6px rgb(0 0 0 / 45%));
  transition:
    opacity 200ms ease,
    translate 200ms ease;
  -webkit-tap-highlight-color: transparent;

  svg {
    width: 26px;
    height: 40px;
    overflow: visible;
  }

  &:hover,
  &:focus-visible {
    opacity: 1;
    translate: 0 -3px;
  }

  &:focus-visible {
    outline: 2px dashed var(--accent-gold);
    outline-offset: 2px;
    border-radius: 8px;
  }
}

/* nur auf dem Handy – auf dem Desktop wird der Pfeil nicht gebraucht */
@media (width > 900px) {
  .scroll-top {
    display: none;
  }
}

.arrow-enter-active,
.arrow-leave-active {
  transition:
    opacity 260ms ease,
    translate 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.arrow-enter-from,
.arrow-leave-to {
  opacity: 0;
  translate: 0 14px;
}

@media (prefers-reduced-motion: reduce) {
  .scroll-top,
  .arrow-enter-active,
  .arrow-leave-active {
    transition: none;
  }
}
</style>

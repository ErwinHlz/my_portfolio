<script setup lang="ts">
import BgGrid from './components/BgGrid.vue';
import SiteFooter from '@/layout/SiteFooter.vue';

// embedded: erster Abschnitt der Handy-Scrollseite – nach unten geht es weiter zu „Über mich“
defineProps<{ embedded?: boolean }>();
</script>

<template>
  <component
    :is="embedded ? 'section' : 'main'"
    :class="[embedded ? 'is-embedded' : 'page-content', 'home-content']"
  >
    <!-- auf der Handy-Scrollseite nur Kulisse: Wischen soll die Seite scrollen, nicht das Raster -->
    <BgGrid :interactive="!embedded" />
    <div class="page-center">
      <h1>Erwin Holzhauser</h1>
    </div>
    <RouterLink v-if="embedded" to="/about" class="home-cue">
      <span>Entdecken</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </RouterLink>
    <SiteFooter v-if="!embedded" />
  </component>
</template>

<style scoped lang="scss">
.page-center {
  min-height: 100vh;
  padding-inline: clamp(0.5rem, 3vw, 2rem);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  position: relative;
  z-index: 1;
  background: linear-gradient(
      to bottom,
      transparent,
      var(--home-backdrop) 24%,
      var(--home-backdrop) 76%,
      transparent
    )
    center / 100% clamp(17rem, 33vw, 26rem) no-repeat;
}

.page-center h1 {
  margin: 0;
  font-size: clamp(3.5rem, 7.4vw, 8.25rem);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: 0.005em;
  text-align: center;
  text-wrap: balance;
  text-transform: uppercase;
  color: var(--home-title);
  text-shadow: var(--home-title-shadow);
}

.home-content {
  overflow-y: hidden;
  overscroll-behavior-y: contain;
}

/* als Abschnitt der Handy-Scrollseite: genau ein Bildschirm, das Fotoraster nur in diesem
   Fenster sichtbar; unten verläuft es ins Dunkel von „Über mich“ */
.home-content.is-embedded {
  position: relative;
  height: 100svh;
  // clip statt hidden und ohne overscroll-Sperre: sonst wäre der Abschnitt ein eigener
  // Scrollbereich, der das Wischen schluckt, statt es an die Scrollseite weiterzugeben
  overflow: clip;
  overscroll-behavior: auto;
  clip-path: inset(0);

  .page-center {
    min-height: 100svh;
  }

  // Das Raster liegt im Abschnitt statt fest am Bildschirm: Ein fest verankertes Element würde
  // beim Wischen die (gesperrte) Gesamtseite scrollen wollen statt der Scrollseite.
  :deep(.bg-grid) {
    position: absolute;
  }

  &::after {
    content: '';
    position: absolute;
    inset: auto 0 0;
    z-index: 1;
    height: 34svh;
    pointer-events: none;
    background: linear-gradient(180deg, transparent, var(--color-night) 92%);
  }
}

.home-cue {
  position: absolute;
  left: 50%;
  bottom: calc(22px + env(safe-area-inset-bottom));
  z-index: 2;
  display: grid;
  justify-items: center;
  gap: 2px;
  min-width: 44px;
  min-height: 44px;
  padding: 4px 10px;
  translate: -50% 0;
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--accent-gold);

  svg {
    width: 26px;
    height: 26px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    animation: cue-bob 1.8s ease-in-out infinite;
  }
}

@keyframes cue-bob {
  50% {
    translate: 0 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-cue svg {
    animation: none;
  }
}

@media (width <= 720px) {
  .page-center h1 {
    font-size: clamp(2.55rem, 10.7vw, 4.65rem);
    letter-spacing: -0.025em;
  }
}
</style>

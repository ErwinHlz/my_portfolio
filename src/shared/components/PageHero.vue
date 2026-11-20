<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  lead?: string;
  /** optionales Hintergrundbild (abgedunkelt) */
  image?: string;
  /** niedrigere Variante, z. B. für die Kontaktseite */
  compact?: boolean;
}>();
</script>

<template>
  <header class="page-hero" :class="{ 'has-image': image, 'is-compact': compact }">
    <div v-if="image" class="page-hero__bg" :style="{ backgroundImage: `url('${image}')` }"></div>
    <div class="page-hero__inner">
      <p v-if="eyebrow" class="realm-eyebrow page-hero__eyebrow">{{ eyebrow }}</p>
      <h1 class="page-hero__title realm-gold-text">{{ title }}</h1>
      <div class="realm-ornament" aria-hidden="true"><span></span></div>
      <p v-if="lead" class="realm-lead page-hero__lead">{{ lead }}</p>
      <div v-if="$slots.default" class="page-hero__actions">
        <slot />
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.page-hero {
  position: relative;
  min-height: min(78vh, 720px);
  display: grid;
  place-items: center;
  padding: calc(var(--site-header-depth) + 30px) 20px 70px;
  text-align: center;
  overflow: hidden;
  isolation: isolate;

  &::after {
    content: '';
    position: absolute;
    inset: auto 0 0;
    height: 40%;
    background: linear-gradient(180deg, transparent, var(--color-night));
    z-index: -1;
  }
}

.page-hero.is-compact {
  min-height: 0;
  padding-bottom: 48px;
}

.page-hero__bg {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: cover;
  opacity: var(--hero-image-opacity);
  filter: var(--hero-image-filter);
  transform: scale(1.04);
  z-index: -2;
}

.page-hero__inner {
  /* nie breiter als der verfügbare Platz, sonst ragt der Text auf schmalen Handys heraus */
  width: 100%;
  min-width: 0;
  max-width: 860px;
  display: grid;
  justify-items: center;
}

.page-hero__eyebrow {
  animation: rise 0.9s ease-out both;
}

.page-hero__title {
  margin: 0 0 18px;
  font-family: var(--font-display);
  font-size: clamp(2.3rem, 6.5vw, 4.4rem);
  font-weight: 700;
  line-height: 1.08;
  text-transform: uppercase;
  text-wrap: balance;
  filter: drop-shadow(0 0 6px var(--hero-text-shadow));
  animation: rise 1s ease-out 0.15s both;
}

.page-hero__lead {
  animation: rise 1s ease-out 0.35s both;
}

.page-hero__actions {
  margin-top: 30px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  animation: rise 1s ease-out 0.5s both;
}

.realm-ornament {
  animation: rise 1s ease-out 0.25s both;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-hero * {
    animation: none !important;
  }
}
</style>

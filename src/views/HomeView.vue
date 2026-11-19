<script setup lang="ts">
import BgGrid from '@/components/BgGrid.vue';
import SiteFooter from '@/components/SiteFooter.vue';
</script>

<template>
  <main class="page-content home-content">
    <BgGrid />
    <div class="page-center">
      <h1>Erwin Holzhauser</h1>
    </div>
    <SiteFooter />
  </main>
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

@media (width <= 720px) {
  .page-center h1 {
    font-size: clamp(2.55rem, 10.7vw, 4.65rem);
    letter-spacing: -0.025em;
  }
}
</style>

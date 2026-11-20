<script setup lang="ts">
import SiteFooter from '@/layout/SiteFooter.vue';

defineProps<{ title: string }>();
</script>

<template>
  <main class="page-content realm-page legal-page">
    <div class="realm-section realm-section--narrow legal-page__body">
      <h1 class="realm-title legal-page__title">{{ title }}</h1>
      <div class="realm-card legal-page__content">
        <slot />
      </div>
    </div>
    <SiteFooter />
  </main>
</template>

<style scoped lang="scss">
.legal-page {
  display: flex;
  flex-direction: column;
}

.legal-page__body {
  flex: 1 0 auto;
  padding-top: calc(var(--site-header-depth) + clamp(2rem, 6vw, 4rem));
  padding-bottom: clamp(2rem, 6vw, 4rem);
}

.legal-page__title {
  margin-bottom: 1.6rem;
  text-align: center;
}

.legal-page__content {
  padding: clamp(1.4rem, 5vw, 3.25rem);

  :deep(section + section) {
    margin-top: 1.8rem;
    padding-top: 1.35rem;
    border-top: 1px solid var(--border-soft);
  }

  :deep(h2) {
    margin: 0 0 0.45rem;
    font-size: clamp(1.15rem, 3vw, 1.4rem);
    color: var(--text-heading);
  }

  :deep(p) {
    margin: 0.45rem 0 0;
  }

  :deep(address) {
    font-style: normal;
  }

  :deep(a) {
    overflow-wrap: anywhere;
    text-underline-offset: 0.2em;
  }
}
</style>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

defineProps<{
  title: string;
  text: string;
  primary: { label: string; to: RouteLocationRaw };
  secondary?: { label: string; to: RouteLocationRaw };
}>();
</script>

<template>
  <section class="realm-section">
    <div v-reveal class="cta realm-card">
      <div class="realm-ornament" aria-hidden="true"><span></span></div>
      <h2 class="realm-title">{{ title }}</h2>
      <p class="realm-lead cta__text">{{ text }}</p>
      <div class="realm-actions cta__actions">
        <RouterLink class="realm-btn realm-btn--gold" :to="primary.to">{{
          primary.label
        }}</RouterLink>
        <RouterLink v-if="secondary" class="realm-btn realm-btn--ghost" :to="secondary.to">
          {{ secondary.label }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.cta {
  text-align: center;
  padding: clamp(36px, 6vw, 64px) clamp(20px, 5vw, 64px);
  background:
    radial-gradient(ellipse at 50% 0%, rgb(var(--accent-gold-rgb), 0.16), transparent 60%),
    var(--card-surface);
}

.cta__text {
  margin-inline: auto;
}

.cta__actions {
  justify-content: center;
  margin-top: 28px;
}
</style>

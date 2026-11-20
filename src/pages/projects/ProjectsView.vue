<script setup lang="ts">
import SiteFooter from '@/layout/SiteFooter.vue';
import ProjectBook from './components/ProjectBook.vue';

// embedded: als Abschnitt der Handy-Scrollseite – ohne eigenen Scrollbereich und Footer
defineProps<{ embedded?: boolean }>();
</script>

<template>
  <!-- Ein Raum, genau so hoch wie der Bildschirm: Regal, Schild, Buch und Footer – ohne Scrollen -->
  <component
    :is="embedded ? 'section' : 'main'"
    :class="[embedded ? 'is-embedded' : 'page-content', 'realm-page projects-room']"
  >
    <ProjectBook />
    <SiteFooter v-if="!embedded" />
  </component>
</template>

<style scoped lang="scss">
.projects-room {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
  // kein Stapelkontext (global z-index: 0) – das gedrehte Buch darf über dem Header liegen
  z-index: auto;
  padding-top: var(--site-header-depth);
}

/* als Abschnitt der Handy-Scrollseite: genau eine Bildschirmhöhe für das Buch */
.projects-room.is-embedded {
  height: 100svh;
  grid-template-rows: minmax(0, 1fr);
  padding-top: var(--site-header-depth);
}

.projects-room :deep(.site-footer) {
  margin-top: 0;
}
</style>

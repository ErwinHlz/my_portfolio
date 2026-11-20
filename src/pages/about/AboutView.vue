<script setup lang="ts">
import AboutPalantir from './components/AboutPalantir.vue';

// embedded: als Abschnitt der Handy-Scrollseite – ohne eigenen Scrollbereich und Footer
defineProps<{ embedded?: boolean }>();
</script>

<template>
  <component
    :is="embedded ? 'section' : 'main'"
    :class="[embedded ? 'is-embedded' : 'page-content', 'realm-page about']"
  >
    <AboutPalantir />
  </component>
</template>

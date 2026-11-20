<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import NavBar from '@/layout/NavBar.vue';
import AmbientFog from '@/layout/AmbientFog.vue';
import ScrollTopArrow from '@/layout/ScrollTopArrow.vue';
import MobileJourney from '@/pages/journey/MobileJourney.vue';
import { useCompactLayout } from '@/shared/composables/useCompactLayout';

// Handy: Start, Über mich, Leistungen, Projekte und Kontakt liegen auf einer Scrollseite.
// Playground und Rechtliches bleiben eigene Seiten.
const route = useRoute();
const isCompact = useCompactLayout();
const journeyRoutes = new Set(['home', 'about', 'services', 'projects', 'contact']);
const showJourney = computed(() => isCompact.value && journeyRoutes.has(String(route.name)));

// SVG-Sprite (Icons) einmalig ins DOM laden,
// damit <use href="#icon-..."> überall funktioniert.
const spriteFiles = ['/assets/logos/icons.svg'];
const sprites = ref('');

onMounted(async () => {
  const results = await Promise.all(
    spriteFiles.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        return res.ok ? await res.text() : '';
      } catch {
        return '';
      }
    }),
  );
  sprites.value = results.join('');
});
</script>

<template>
  <div class="svg-sprites" aria-hidden="true" v-html="sprites"></div>
  <NavBar />
  <MobileJourney v-if="showJourney" />
  <RouterView v-else />
  <AmbientFog />
  <ScrollTopArrow />
</template>

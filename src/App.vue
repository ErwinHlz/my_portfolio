<script setup lang="ts">
import { onMounted, ref } from 'vue';
import NavBar from '@/components/NavBar.vue';

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
  <RouterView />
</template>

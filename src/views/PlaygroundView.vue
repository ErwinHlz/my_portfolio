<script setup lang="ts">
import PageHero from '@/components/PageHero.vue';
import SiteFooter from '@/components/SiteFooter.vue';
import NeonCoast from '@/components/playground/NeonCoast.vue';
</script>

<template>
  <main class="page-content realm-page">
    <PageHero eyebrow="Playground" title="Gandalf X GTA VI" compact />

    <section class="realm-section playground" aria-label="Gandalf X GTA VI spielen">
      <div v-reveal><NeonCoast /></div>

      <ul class="playground__how">
        <li><strong>Maus bewegen</strong> – du lenkst Kutsche und Motorrad</li>
        <li><strong>Motorrad anklicken</strong> – ein Portal bringt dich an die Neon Coast</li>
        <li><strong>Musik &amp; Nacht</strong> – ♪ startet den Soundtrack, Tag und Nacht schaltest du per Schild</li>
      </ul>
    </section>

    <SiteFooter />
  </main>
</template>

<style scoped lang="scss">
.playground {
  width: min(1280px, 100% - 32px);
  padding-top: 0;
}

.playground__how {
  list-style: none;
  margin: 28px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  color: var(--text-soft);

  strong {
    display: block;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent-gold);
  }
}

@media (width <= 900px) {
  .playground__how {
    grid-template-columns: 1fr;
  }
}

/* Handy: die Szene läuft randlos über die volle Breite */
@media (width <= 700px), (orientation: landscape) and (height <= 500px) {
  .playground {
    width: 100%;
  }

  .playground__how {
    padding: 0 16px;
  }
}
</style>

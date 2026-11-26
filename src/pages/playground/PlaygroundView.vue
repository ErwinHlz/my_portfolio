<script setup lang="ts">
import PageHero from '@/shared/components/PageHero.vue';
import SiteFooter from '@/layout/SiteFooter.vue';
import NeonCoast from './components/NeonCoast.vue';
import BoomClapSpace from './components/BoomClapSpace.vue';
</script>

<template>
  <main class="page-content realm-page">
    <PageHero eyebrow="Playground" title="Gandalf X GTA VI" compact />

    <section class="realm-section playground" aria-label="Gandalf X GTA VI spielen">
      <div v-reveal><NeonCoast /></div>

      <ul class="playground__how">
        <li><strong>Maus bewegen</strong> – du lenkst Kutsche und Motorrad</li>
        <li><strong>Motorrad anklicken</strong> – ein Portal bringt dich an die Neon Coast</li>
        <li>
          <strong>Musik &amp; Nacht</strong> – ♪ startet den Soundtrack, Tag und Nacht schaltest du
          per Schild
        </li>
      </ul>
    </section>

    <section class="realm-section playground boomclap" aria-labelledby="boomclap-title">
      <header class="boomclap__head" v-reveal>
        <p class="realm-eyebrow">Reel-Trend</p>
        <h2 id="boomclap-title" class="realm-title realm-gold-text">Boom Clap – Spider-Man</h2>
        <div class="realm-ornament" aria-hidden="true"><span></span></div>
      </header>

      <BoomClapSpace />

      <ul class="playground__how">
        <li><strong>Kanone drücken</strong> – Konfetti, Song, und Peter Parker kommt herein</li>
        <li>
          <strong>Kamera dreht</strong> – ab in die Comic-Nahaufnahme, jeder Clap verwandelt ihn
        </li>
        <li><strong>Nochmal drücken</strong> – Extra-Konfetti, Leertaste pausiert</li>
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

.boomclap {
  padding-top: clamp(40px, 7vw, 90px);
}

.boomclap__head {
  margin-bottom: clamp(24px, 4vw, 40px);
  text-align: center;
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
    display: flex;
    justify-content: center;
    gap: 6px;
    width: fit-content;
    margin: 0 auto 18px;
    padding: 4px;
    border: 1px solid rgb(var(--accent-gold-rgb), 0.35);
    border-radius: 999px;
    background: rgb(0 0 0 / 30%);
  }

  .boomclap__head {
    padding: 0 16px;
  }
}
</style>

<script setup lang="ts">
import PageHero from '@/components/PageHero.vue';
import CallToAction from '@/components/CallToAction.vue';
import SiteFooter from '@/components/SiteFooter.vue';

const liveUrl = 'https://www.svottweiler.de';
const tags = ['Konzept & Design', 'Vue.js', 'Mobile first', 'Ohne Tracking'];
</script>

<template>
  <main class="page-content realm-page projects">
    <PageHero
      eyebrow="Projekte"
      title="Meine Projekte"
      lead="Einblick in die Website meines Heimatvereins SV Ottweiler."
    />

    <!-- ===== SV Ottweiler ===== -->
    <section class="realm-section club">
      <div v-reveal class="browser">
        <div class="browser__bar" aria-hidden="true">
          <span></span><span></span><span></span>
          <p>svottweiler.de</p>
        </div>
        <img
          src="/assets/projects/svottweiler_desktop.webp"
          alt="Startseite von svottweiler.de in der Desktop-Ansicht mit Spielzentrale"
          loading="lazy"
        />
      </div>

      <div v-reveal="0.15" class="club__text">
        <p class="realm-eyebrow">Live-Projekt</p>
        <h2 class="realm-title">SV Ottweiler</h2>
        <p>
          Die Webseite meines Heimatvereins – Blau-Gelb seit 1919. Spielzentrale mit Ergebnissen,
          News, Termine und Mannschaften auf einen Blick, gemacht für den schnellen Blick aufs Handy
          am Spieltag. Von der ersten Skizze bis zum Livegang komplett aus einer Hand.
        </p>
        <ul class="club__tags">
          <li v-for="tag in tags" :key="tag">{{ tag }}</li>
        </ul>
        <a class="realm-btn realm-btn--gold" :href="liveUrl" target="_blank" rel="noopener">
          Webseite ansehen <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>

    <CallToAction
      title="Eine verrückte Idee im Kopf?"
      text="Du planst eine Vereinsseite oder eine Web-App? Lass uns darüber sprechen."
      :primary="{ label: 'Kontakt aufnehmen', to: '/contact' }"
      :secondary="{ label: 'Meine Leistungen', to: '/leistungen' }"
    />

    <SiteFooter />
  </main>
</template>

<style scoped lang="scss">
/* ---------- SV Ottweiler ---------- */
.club {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: clamp(28px, 5vw, 64px);
  align-items: center;
}

.browser {
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--color-shadow);
  box-shadow:
    0 0 60px rgb(var(--accent-gold-rgb), 0.12),
    var(--project-frame-shadow);

  img {
    display: block;
    width: 100%;
  }
}

.browser__bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-soft);

  span {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 1px solid var(--border-strong);
  }

  p {
    margin: 0 auto;
    padding: 2px 18px;
    border-radius: 999px;
    background: rgb(var(--accent-gold-rgb), 0.07);
    font-family: var(--font-ui);
    font-size: 0.78rem;
    color: var(--text-muted);
    transform: translateX(-20px);
  }
}

.club__text p {
  margin: 0 0 18px;
}

.club__tags {
  list-style: none;
  margin: 0 0 26px;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  li {
    padding: 5px 12px;
    border: 1px solid var(--border-mid);
    border-radius: 999px;
    background: rgb(var(--accent-gold-rgb), 0.05);
    font-family: var(--font-ui);
    font-size: 0.82rem;
    color: var(--text-primary);
  }
}

@media (width <= 900px) {
  .club {
    grid-template-columns: 1fr;
  }
}
</style>

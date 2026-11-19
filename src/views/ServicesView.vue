<script setup lang="ts">
import PageHero from '@/components/PageHero.vue';
import CallToAction from '@/components/CallToAction.vue';
import ForestDepth from '@/components/ForestDepth.vue';
import ProjectJourney from '@/components/ProjectJourney.vue';
import ServicesForest from '@/components/ServicesForest.vue';
import SiteFooter from '@/components/SiteFooter.vue';
import { faqs, promises, services } from '@/data/services';

const requestLink = { path: '/contact', query: { anliegen: 'webseite' } };
</script>

<template>
  <main class="page-content realm-page services">
    <ServicesForest />
    <div class="services__content">
      <PageHero
        id="waldeingang"
        class="services__hero"
        eyebrow="IT-Dienstleistungen"
        title="Software, die man gern benutzt"
        lead="Ich entwickle Webseiten, Web-Apps und individuelle Software für Vereine, Selbstständige und Unternehmen – mit Schwerpunkt auf Webdesign, das im Kopf bleibt."
      >
        <RouterLink class="realm-btn realm-btn--gold" :to="requestLink"
          >Projekt anfragen</RouterLink
        >
        <RouterLink class="realm-btn realm-btn--ghost" :to="{ hash: '#angebot' }">
          Leistungen ansehen
        </RouterLink>
      </PageHero>

      <!-- ===== Angebot ===== -->
      <section id="angebot" class="realm-section">
        <ForestDepth
          ><div class="realm-head">
            <p class="realm-eyebrow">Was ich anbiete</p>
            <h2 class="realm-title">Meine Leistungen</h2>
            <p class="realm-lead">
              Mein Schwerpunkt liegt auf Webdesign – ich habe aber Lust auf Softwareprojekte jeder
              Art.
            </p>
          </div></ForestDepth
        >

        <div class="services-grid">
          <ForestDepth v-for="service in services" :key="service.title">
            <article
              class="realm-card realm-card--hover service"
              :class="{ 'service--featured': service.featured }"
            >
              <span v-if="service.featured" class="service__badge">Schwerpunkt</span>
              <svg
                class="service__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path :d="service.icon" />
              </svg>
              <h3>{{ service.title }}</h3>
              <p>{{ service.text }}</p>
              <ul>
                <li v-for="point in service.points" :key="point">{{ point }}</li>
              </ul>
            </article>
          </ForestDepth>
        </div>
      </section>

      <!-- ===== Versprechen ===== -->
      <section id="zusammenarbeit">
        <div class="realm-section">
          <ForestDepth
            ><div class="realm-head">
              <div class="realm-ornament" aria-hidden="true"><span></span></div>
              <p class="realm-eyebrow">Zusammenarbeit</p>
              <h2 class="realm-title">Das bekommt jedes Projekt bei mir</h2>
            </div></ForestDepth
          >
          <div class="promises">
            <ForestDepth v-for="promise in promises" :key="promise.title">
              <div class="promise">
                <svg class="promise__check" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                <div>
                  <h3>{{ promise.title }}</h3>
                  <p>{{ promise.text }}</p>
                </div>
              </div>
            </ForestDepth>
          </div>
        </div>
      </section>

      <!-- ===== Ablauf ===== -->
      <section id="ablauf" class="realm-section">
        <ForestDepth
          ><div class="realm-head">
            <p class="realm-eyebrow">Ablauf</p>
            <h2 class="realm-title">Der Weg zu deinem Projekt</h2>
          </div></ForestDepth
        >
        <ForestDepth><ProjectJourney /></ForestDepth>
      </section>

      <!-- ===== FAQ ===== -->
      <section id="fragen" class="realm-section realm-section--narrow">
        <ForestDepth
          ><div class="realm-head">
            <p class="realm-eyebrow">Häufige Fragen</p>
            <h2 class="realm-title">Gut zu wissen</h2>
          </div></ForestDepth
        >
        <div class="faq">
          <ForestDepth v-for="faq in faqs" :key="faq.question">
            <details class="realm-card faq__item">
              <summary>{{ faq.question }}</summary>
              <p>{{ faq.answer }}</p>
            </details>
          </ForestDepth>
        </div>
      </section>

      <ForestDepth id="anfrage"
        ><CallToAction
          title="Bereit für dein nächstes Projekt?"
          text="Erzähl mir von deinem Vorhaben. Das Erstgespräch ist kostenlos und unverbindlich."
          :primary="{ label: 'Jetzt anfragen', to: requestLink }"
          :secondary="{ label: 'Mehr über mich', to: '/about' }"
      /></ForestDepth>
    </div>

    <SiteFooter />
  </main>
</template>

<style scoped lang="scss">
.services {
  --forest-map-width: clamp(7.6rem, 12.5vw, 11rem);
  --forest-map-inset: clamp(0.5rem, 1.3vw, 1.5rem);
  isolation: isolate;
  scroll-padding-top: calc(var(--site-header-depth) + 12px);
  scroll-padding-bottom: 12px;
  scroll-behavior: smooth;
}

.services__content {
  padding-inline: calc(var(--forest-map-width) + var(--forest-map-inset) + 8px);
}

.services__content > :is(#angebot, #zusammenarbeit, #ablauf, #fragen) {
  margin-block-start: clamp(96px, 23svh, 190px);
}

.services :deep(.services__hero) {
  min-height: min(89svh, 890px);
  padding-top: calc(var(--site-header-depth) + 36px);
  padding-bottom: clamp(64px, 11vh, 120px);

  &::after {
    content: none;
  }
}

.services :deep(.cta.reveal) {
  opacity: 1;
  transform: none;
  transition: none;
}

.services .realm-head,
.services :deep(.page-hero__lead) {
  text-shadow: var(--forest-text-shadow);
}

.services :deep(.realm-eyebrow) {
  filter: drop-shadow(0 2px 3px var(--color-night));
}

/* ---------- Angebot ---------- */
.services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

.service {
  display: flex;
  height: 100%;
  flex-direction: column;

  h3 {
    margin: 14px 0 8px;
    font-family: var(--font-display);
    font-size: 1.3rem;
    color: var(--text-heading);
  }

  p {
    margin: 0 0 16px;
  }

  ul {
    list-style: none;
    margin: auto 0 0;
    padding: 14px 0 0;
    border-top: 1px solid var(--border-soft);
    display: grid;
    gap: 6px;
    font-family: var(--font-ui);
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  li::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    margin: 0 10px 2px 0;
    rotate: 45deg;
    background: var(--accent-gold);
  }
}

.service--featured {
  border-color: var(--border-strong);
  background:
    radial-gradient(ellipse at 50% 0%, rgb(var(--accent-gold-rgb), 0.18), transparent 70%),
    var(--featured-surface);
}

.service__badge {
  position: absolute;
  top: 18px;
  right: 18px;
  padding: 4px 10px;
  border: 1px solid var(--accent-gold);
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 0.68rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--accent-gold);
}

.service__icon {
  width: 44px;
  height: 44px;
  color: var(--accent-gold);
  filter: drop-shadow(0 0 8px rgb(var(--accent-gold-rgb), 0.4));
}

/* ---------- Versprechen ---------- */
.promises {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30px 36px;
  text-shadow: var(--forest-text-shadow);
}

.promise {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 14px;

  h3 {
    margin: 0 0 4px;
    font-family: var(--font-display);
    font-size: 1.1rem;
    color: var(--text-heading);
  }

  p {
    margin: 0;
  }
}

.promise__check {
  width: 32px;
  height: 32px;
  padding: 6px;
  border: 1px solid var(--accent-gold);
  border-radius: 50%;
  fill: none;
  stroke: var(--accent-gold);
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ---------- FAQ ---------- */
.faq {
  display: grid;
  gap: 14px;
}

.faq__item {
  padding: 0;

  summary {
    position: relative;
    padding: 20px 56px 20px 24px;
    font-family: var(--font-display);
    font-size: 1.1rem;
    color: var(--text-heading);
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }

    &::after {
      content: '+';
      position: absolute;
      right: 24px;
      top: 50%;
      translate: 0 -50%;
      font-size: 1.5rem;
      color: var(--accent-gold);
      transition: rotate 0.3s ease;
    }
  }

  &[open] summary::after {
    rotate: 45deg;
  }

  p {
    margin: 0;
    padding: 0 24px 22px;
  }
}

/* ---------- Responsive ---------- */
@media (width <= 1000px) {
  .services-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (width <= 640px) {
  .services-grid,
  .promises {
    grid-template-columns: 1fr;
  }
}

@media (width <= 760px) {
  .services {
    --forest-map-width: 3.35rem;
    --forest-map-inset: 0.35rem;
  }

  /* rechts Platz für die Kartenrolle, links reicht der normale Seitenrand */
  .services__content {
    padding-inline: 0 calc(var(--forest-map-width) + var(--forest-map-inset) - 10px);
  }

  .services :deep(.services__hero) {
    padding-inline: 6px 28px;
  }

  .services__content > :is(#angebot, #zusammenarbeit, #ablauf, #fragen) {
    margin-block-start: clamp(65px, 15svh, 125px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .services {
    scroll-behavior: auto;
  }
}
</style>

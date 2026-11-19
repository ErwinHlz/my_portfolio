<script setup lang="ts">
import SiteFooter from '@/components/SiteFooter.vue';
import CallToAction from '@/components/CallToAction.vue';
import { values } from '@/data/about';
</script>

<template>
  <main class="page-content realm-page about">
    <!-- ===== Einstieg ===== -->
    <section class="intro">
      <div class="intro__inner">
        <figure class="intro__portrait">
          <img src="/assets/background/me_anzug.jpeg" alt="Porträt von Erwin Holzhauser" />
        </figure>

        <div class="intro__text">
          <p class="realm-eyebrow">Über mich</p>
          <h1 class="intro__title">Hi, ich bin <span class="realm-gold-text">Erwin</span>.</h1>
          <p class="realm-lead">
            Webdesigner und Entwickler aus dem Saarland – mit einer Schwäche für Seiten, die man
            nicht so schnell wieder vergisst.
          </p>
          <ul class="intro__facts">
            <li><strong>Studium</strong> Masterstudent, B.Sc. Praktische Informatik (HTW Saar)</li>
            <li><strong>Aktuell</strong> Werkstudent bei BFD Buchholz</li>
            <li><strong>Fokus</strong> Software mit starkem grafischem Anspruch</li>
            <li><strong>Neben dem Code</strong> Fußball als Spieler &amp; Trainer, Showtanz</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ===== Geschichte ===== -->
    <section class="realm-section story">
      <div v-reveal class="story__text">
        <p class="realm-eyebrow">Kurz zu mir</p>
        <h2 class="realm-title">Webdesign ist für mich Kunst</h2>
        <p>
          Nach dem Abitur und einer Ausbildung bei ZF habe ich Praktische Informatik an der HTW
          Saar studiert. Seit Oktober 2026 habe ich meinen Bachelor of Science in der Tasche und
          bin direkt ins Masterstudium gestartet. Nebenbei arbeite ich als Werkstudent bei BFD
          Buchholz, nachdem ich vorher schon bei der DIaLOGIKa in echte Softwareprojekte
          hineinschnuppern durfte. Abseits davon stehe ich als Spieler und Trainer auf dem
          Fußballplatz, tanze im Showtanz – und ja, auch in meiner Freizeit wird gerne
          programmiert.
        </p>
        <p>
          Was mich in den letzten Jahren immer mehr gepackt hat, ist das Webdesign. Hier kann ich
          meine Kreativität richtig ausleben. Was in vielen kleinen Uniprojekten begann, ist
          inzwischen auch online zu sehen: Neben dieser Homepage habe ich die Webseite meines
          Heimatvereins <RouterLink to="/projekte">SV Ottweiler</RouterLink> gestaltet und
          umgesetzt.
        </p>
        <p>
          Mein Anspruch: moderne Designs, die nicht nur gut aussehen, sondern Charakter haben. Eine
          Seite soll einen Wiedererkennungswert besitzen und sich von der Masse abheben, statt im
          nächsten Baukasten-Template zu verschwinden. Und ehrlich gesagt gilt: Je verrückter eine
          Idee im ersten Moment klingt, desto mehr Lust habe ich, sie umzusetzen.
        </p>
        <p>
          Dabei bin ich nicht auf Webseiten festgelegt: Ich habe Lust auf Softwareprojekte jeder
          Art, ob Web-App, Tool oder etwas ganz anderes. Was mich aber wirklich antreibt, ist der
          grafische Teil – der Moment, in dem aus Code etwas wird, das man sehen, anfassen und
          erleben kann.
        </p>
      </div>
      <figure v-reveal="0.15" class="story__image">
        <img
          src="/assets/background/me_coding.jpeg"
          alt="Erwin beim Programmieren am Schreibtisch"
        />
      </figure>
    </section>

    <!-- ===== Werte ===== -->
    <section class="realm-section">
      <div v-reveal class="realm-head">
        <div class="realm-ornament" aria-hidden="true"><span></span></div>
        <h2 class="realm-title">Was mich antreibt</h2>
      </div>
      <div class="values">
        <article
          v-for="(value, index) in values"
          :key="value.title"
          v-reveal="index * 0.1"
          class="realm-card realm-card--hover value"
        >
          <span class="value__rune" aria-hidden="true">{{ value.rune }}</span>
          <h3>{{ value.title }}</h3>
          <p>{{ value.text }}</p>
        </article>
      </div>
    </section>

    <CallToAction
      title="Lust, gemeinsam etwas zu bauen?"
      text="Ob Vereinsseite, Webseite für dein Unternehmen oder einfach eine Idee, über die du sprechen möchtest – ich freue mich auf deine Nachricht."
      :primary="{ label: 'Meine Leistungen', to: '/leistungen' }"
      :secondary="{ label: 'Kontakt aufnehmen', to: '/contact' }"
    />

    <SiteFooter />
  </main>
</template>

<style scoped lang="scss">
/* ---------- Einstieg ---------- */
.intro {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: calc(var(--site-header-depth) + 24px) 20px 60px;
}

.intro__inner {
  width: min(1080px, 100%);
  display: grid;
  grid-template-columns: minmax(240px, 400px) 1fr;
  align-items: center;
  gap: clamp(32px, 6vw, 80px);
}

.intro__portrait {
  position: relative;
  margin: 0;
  aspect-ratio: 3 / 4;
  border-radius: 200px 200px 6px 6px;
  padding: 10px;
  border: 1px solid var(--border-strong);
  background: linear-gradient(180deg, rgb(var(--accent-gold-rgb), 0.18), transparent);
  box-shadow:
    0 0 50px rgb(var(--accent-gold-rgb), 0.15),
    var(--photo-frame-shadow);
  animation: fade-in 1.2s ease-out both;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 190px 190px 3px 3px;
    filter: sepia(0.25) contrast(1.05);
  }
}

.intro__title {
  margin: 0 0 18px;
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 5.5vw, 4rem);
  line-height: 1.1;
  color: var(--text-heading);
}

.intro__text > * {
  animation: rise 1s ease-out both;
}

.intro__text > :nth-child(2) {
  animation-delay: 0.15s;
}

.intro__text > :nth-child(3) {
  animation-delay: 0.3s;
}

.intro__text > :nth-child(4) {
  animation-delay: 0.45s;
}

.intro__facts {
  list-style: none;
  margin: 28px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
  border-top: 1px solid var(--border-soft);
  padding-top: 22px;

  li {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 12px;
    color: var(--text-soft);
  }

  strong {
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--accent-gold);
    padding-top: 4px;
  }
}

/* ---------- Geschichte ---------- */
.story {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: clamp(32px, 6vw, 72px);
  align-items: center;

  p {
    margin: 0 0 16px;
  }

  a {
    color: var(--accent-gold);
  }
}

.story__image {
  margin: 0;
  border: 1px solid var(--border-mid);
  padding: 8px;
  border-radius: 6px;
  box-shadow: var(--photo-frame-shadow);

  img {
    display: block;
    width: 100%;
    border-radius: 3px;
    filter: sepia(0.2);
  }
}

/* ---------- Werte ---------- */
.values {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

.value {
  text-align: center;

  h3 {
    margin: 10px 0 10px;
    font-family: var(--font-display);
    color: var(--text-heading);
    font-size: 1.3rem;
  }

  p {
    margin: 0;
  }
}

.value__rune {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  font-family: var(--font-accent);
  font-size: 1.7rem;
  color: var(--accent-gold);
  box-shadow: 0 0 18px rgb(var(--accent-gold-rgb), 0.2);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.97);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

/* ---------- Responsive ---------- */
@media (width <= 900px) {
  .intro__inner,
  .story {
    grid-template-columns: 1fr;
  }

  .intro__portrait {
    width: min(300px, 75vw);
    justify-self: center;
  }

  .intro__text {
    text-align: center;
  }

  .intro__text .realm-lead {
    margin-inline: auto;
  }

  .intro__facts {
    text-align: left;
  }

  .values {
    grid-template-columns: 1fr;
  }
}

@media (width <= 600px) {
  .intro__facts li {
    grid-template-columns: 1fr;
    gap: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .intro__portrait,
  .intro__text > * {
    animation: none;
  }
}
</style>

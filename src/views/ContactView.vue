<script setup lang="ts">
import { reactive } from 'vue';
import { useRoute } from 'vue-router';
import PageHero from '@/components/PageHero.vue';
import SiteFooter from '@/components/SiteFooter.vue';
import { siteOwner } from '@/data/siteOwner';

const contactEmail = siteOwner.email;

const topics = [
  { value: 'webseite', label: 'Neue Webseite' },
  { value: 'software', label: 'Web-App / Softwareprojekt' },
  { value: 'relaunch', label: 'Relaunch einer bestehenden Seite' },
  { value: 'betreuung', label: 'Wartung & Betreuung' },
  { value: 'sonstiges', label: 'Etwas anderes' },
];

const route = useRoute();
const initialTopic = String(route.query.anliegen ?? '');

const form = reactive({
  name: '',
  email: '',
  topic: topics.some((t) => t.value === initialTopic) ? initialTopic : 'webseite',
  message: '',
});

function buildMailtoLink(): string {
  const topicLabel = topics.find((t) => t.value === form.topic)?.label ?? 'Kontaktanfrage';
  const subject = `Anfrage: ${topicLabel}`;
  const message = (form.message || 'Hallo Erwin,').trim();

  const signatureLines = [
    form.name ? `Name: ${form.name.trim()}` : '',
    form.email ? `E-Mail: ${form.email.trim()}` : '',
  ].filter(Boolean);

  const body = [message, signatureLines.join('\n')].filter(Boolean).join('\n\n');
  const params = new URLSearchParams({ subject, body });

  // URLSearchParams kodiert Leerzeichen als "+", Mail-Programme erwarten "%20"
  return `mailto:${contactEmail}?${params.toString().replace(/\+/g, '%20')}`;
}

function openMailClient() {
  window.location.href = buildMailtoLink();
}

const hints = [
  'Worum geht es – Verein, Unternehmen oder privat?',
  'Gibt es schon eine Webseite, App oder Domain?',
  'Welche Inhalte und Funktionen brauchst du?',
  'Hast du einen Wunschtermin für den Start?',
];
</script>

<template>
  <main class="page-content realm-page contact">
    <PageHero
      compact
      eyebrow="Kontakt"
      title="Lass uns reden"
      lead="Du hast ein Projekt im Kopf oder eine Frage? Schreib mir – ich melde mich so schnell wie möglich bei dir."
    />

    <section class="realm-section contact-grid">
      <aside v-reveal class="contact-info">
        <div class="realm-card">
          <p class="realm-eyebrow">Direkt per E-Mail</p>
          <a class="contact-info__mail" :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
        </div>
        <div class="realm-card">
          <p class="realm-eyebrow">Hilfreich für deine Anfrage</p>
          <ul class="contact-info__hints">
            <li v-for="hint in hints" :key="hint">{{ hint }}</li>
          </ul>
          <p class="contact-info__note">
            Keine Sorge, wenn du noch nicht alles weißt – genau dafür ist das Erstgespräch da.
          </p>
        </div>
      </aside>

      <form v-reveal="0.1" class="realm-card contact-form" @submit.prevent="openMailClient">
        <h2 class="contact-form__title">Nachricht schreiben</h2>

        <label class="field">
          <span>Dein Name</span>
          <input
            v-model="form.name"
            type="text"
            name="name"
            autocomplete="name"
            placeholder="Vor- und Nachname"
          />
        </label>

        <label class="field">
          <span>Deine E-Mail</span>
          <input
            v-model="form.email"
            type="email"
            name="email"
            autocomplete="email"
            placeholder="name@beispiel.de"
          />
        </label>

        <label class="field field--full">
          <span>Worum geht es?</span>
          <select v-model="form.topic" name="topic">
            <option v-for="topic in topics" :key="topic.value" :value="topic.value">
              {{ topic.label }}
            </option>
          </select>
        </label>

        <label class="field field--full">
          <span>Nachricht</span>
          <textarea
            v-model="form.message"
            name="message"
            rows="6"
            placeholder="Erzähl mir kurz von deinem Vorhaben …"
            required
          ></textarea>
        </label>

        <div class="field--full contact-form__footer">
          <button type="submit" class="realm-btn realm-btn--gold">Mail-Programm öffnen</button>
          <p>
            Die Nachricht wird in deinem E-Mail-Programm geöffnet – es werden keine Daten auf dieser
            Seite gespeichert.
          </p>
        </div>
      </form>
    </section>

    <SiteFooter />
  </main>
</template>

<style scoped lang="scss">
.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 24px;
  align-items: start;
  padding-top: 0;
}

.contact-info {
  display: grid;
  gap: 24px;
}

.contact-info__mail {
  font-family: var(--font-ui);
  font-size: 1.05rem;
  color: var(--text-primary);
  word-break: break-all;
  text-decoration-color: var(--accent-gold);
  text-underline-offset: 4px;

  &:hover {
    color: var(--accent-gold);
  }
}

.contact-info__hints {
  margin: 0 0 14px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;

  li {
    display: grid;
    grid-template-columns: 16px 1fr;
    gap: 10px;
  }

  li::before {
    content: '';
    width: 7px;
    height: 7px;
    margin-top: 11px;
    rotate: 45deg;
    background: var(--accent-gold);
  }
}

.contact-info__note {
  margin: 0;
  color: var(--text-muted);
  font-style: italic;
}

.contact-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.contact-form__title {
  grid-column: 1 / -1;
  margin: 0 0 4px;
  font-family: var(--font-display);
  font-size: 1.5rem;
  color: var(--text-heading);
}

.field {
  display: grid;
  gap: 8px;

  span {
    font-family: var(--font-display);
    font-size: 0.78rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--accent-gold);
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid var(--border-mid);
    border-radius: 4px;
    background: var(--field-surface);
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: 1rem;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &::placeholder {
      color: var(--text-muted-strong);
      opacity: 0.7;
    }

    &:focus {
      outline: none;
      border-color: var(--accent-gold);
      box-shadow: 0 0 0 3px rgb(var(--accent-gold-rgb), 0.18);
    }
  }

  select option {
    background: var(--color-stone);
  }

  textarea {
    resize: vertical;
  }
}

.field--full {
  grid-column: 1 / -1;
}

.contact-form__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;

  p {
    flex: 1 1 240px;
    margin: 0;
    font-size: 0.95rem;
    color: var(--text-muted);
  }
}

@media (width <= 900px) {
  .contact-grid {
    grid-template-columns: 1fr;
  }

  .contact-form {
    order: -1;
  }
}

@media (width <= 600px) {
  .contact-form {
    grid-template-columns: 1fr;
  }
}
</style>

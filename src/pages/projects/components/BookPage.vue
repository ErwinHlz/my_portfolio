<script setup lang="ts">
import { computed } from 'vue';
import {
  kindLabels,
  statusLabels,
  type Project,
  type ProjectImage,
  type ProjectKind,
} from '../data/projects';
import { siteOwner } from '@/shared/data/siteOwner';
import CandleMeter from './CandleMeter.vue';
import { toRoman, type BookPage } from '../lib/bookPages';

const props = defineProps<{
  page: BookPage;
  /** gedruckte Seitenzahl (Einband: keine) */
  number?: number;
  side: 'left' | 'right' | 'single';
  /** für das Inhaltsverzeichnis: Kapitel -> Seitenzahl */
  chapters?: { chapter: number; title: string; page: number }[];
}>();

const emit = defineEmits<{ open: []; goto: [chapter: number]; zoom: [image: ProjectImage] }>();

const kindIcons: Record<ProjectKind, string> = {
  website: 'M3 5h18v14H3z M3 9h18 M6 7h.01 M8.5 7h.01',
  app: 'M8 3h8v18H8z M11 18h2',
  game: 'M6 9h12a3 3 0 0 1 3 3v2a3 3 0 0 1-5 2l-1-1H9l-1 1a3 3 0 0 1-5-2v-2a3 3 0 0 1 3-3z M8 11v3 M6.5 12.5h3 M15.5 12h.01 M17 14h.01',
  tool: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  hardware: 'M7 7h10v10H7z M10 3v4 M14 3v4 M10 17v4 M14 17v4 M3 10h4 M3 14h4 M17 10h4 M17 14h4',
  other: 'M12 3l2.5 6 6.5.5-5 4.3 1.5 6.2L12 17l-5.5 3 1.5-6.2-5-4.3 6.5-.5z',
};

const waxColors: Record<Project['status'], string> = {
  live: '#2f5f34',
  'in-progress': '#a8641b',
  prototype: '#5d3f86',
  archived: '#5f5850',
};

// Gewellter Rand eines Wachssiegels (viewBox -50..50)
const sealPath = (() => {
  const lobes = 22;
  const points: string[] = [];
  for (let i = 0; i <= lobes * 4; i++) {
    const a = (i / (lobes * 4)) * Math.PI * 2;
    const r = 45 + Math.sin(i * 1.7) * 1.4 + (i % 4 === 0 ? 2.2 : 0);
    points.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${points.join(' L')}Z`;
})();

const project = computed(() =>
  props.page.type === 'plate' || props.page.type === 'profile' ? props.page.project : null,
);

const meta = computed(() => {
  const p = project.value;
  if (!p) return [];
  return [
    { term: 'Art', value: kindLabels[p.kind] },
    { term: 'Jahr', value: p.year },
    { term: 'Dauer', value: p.duration },
    { term: 'Rolle', value: p.role },
  ].filter((row) => row.value);
});
</script>

<template>
  <div class="page" :class="[`page--${page.type}`, `page--${side}`]">
    <!-- ================= Einband ================= -->
    <button
      v-if="page.type === 'cover'"
      type="button"
      class="cover"
      aria-label="Buch aufschlagen"
      @click="emit('open')"
    >
      <span class="cover__hinge" aria-hidden="true" />
      <span class="cover__frame" aria-hidden="true">
        <span class="cover__frame-inner" />
        <svg v-for="corner in 4" :key="corner" class="cover__ornament" viewBox="0 0 40 40">
          <path
            d="M3 3H27M3 3V27M3 3C12 4 16 8 17 17M9 9H19M9 9V19M27 3c3 0 4.5 3 2.4 5.2M3 27c0 3 3 4.5 5.2 2.4M17 17c1.5 1.5 4 1 4-1.5"
          />
          <circle cx="9" cy="9" r="1.6" />
        </svg>
      </span>
      <span class="cover__brass cover__brass--top" aria-hidden="true"><i /><i /></span>
      <span class="cover__brass cover__brass--bottom" aria-hidden="true"><i /><i /></span>

      <span class="cover__content">
        <span class="cover__top">
          <svg class="cover__mark" viewBox="0 0 323.9 317.16" aria-hidden="true">
            <defs>
              <linearGradient id="book-cover-gold" x1="10%" y1="0%" x2="85%" y2="100%">
                <stop offset="0%" stop-color="#fff0bd" />
                <stop offset="35%" stop-color="#c8963f" />
                <stop offset="60%" stop-color="#ffe2a0" />
                <stop offset="100%" stop-color="#9a6a26" />
              </linearGradient>
            </defs>
            <use
              href="#nav-logo-monogram"
              fill="url(#book-cover-gold)"
              stroke="url(#book-cover-gold)"
            />
          </svg>
        </span>
        <span class="cover__title">Chronik der Projekte</span>
        <span class="cover__bottom">
          <span class="cover__rule" aria-hidden="true"><i /></span>
          <span class="cover__author">{{ siteOwner.name }}</span>
        </span>
      </span>
      <span class="cover__hint">Zum Aufschlagen tippen oder nach links ziehen</span>
    </button>

    <div v-else class="sheet">
      <!-- ================= Vorsatz ================= -->
      <template v-if="page.type === 'frontis'">
        <div class="frontis">
          <div class="exlibris">
            <svg class="exlibris__mark" viewBox="0 0 323.9 317.16" aria-hidden="true">
              <use href="#nav-logo-monogram" />
            </svg>
            <p class="exlibris__label">Ex Libris</p>
            <p class="exlibris__name">{{ siteOwner.name }}</p>
          </div>
          <p class="frontis__intro">
            In diesem Buch sammle ich meine Projekte – Webseiten, Apps, Spiele und alles, was sonst
            noch in der Werkstatt entsteht.
          </p>
          <div class="legend">
            <p class="legend__title">Zur Legende</p>
            <div class="legend__row">
              <CandleMeter :value="3" class="legend__candles" />
              <p>Brennende Kerzen zeigen, wie zufrieden ich selbst mit dem Ergebnis bin.</p>
            </div>
            <div class="legend__row">
              <span class="legend__seals" aria-hidden="true">
                <svg v-for="(color, status) in waxColors" :key="status" viewBox="-50 -50 100 100">
                  <path :d="sealPath" :fill="color" />
                </svg>
              </span>
              <p>Das Siegel verrät den Stand: live, in Arbeit, Prototyp oder archiviert.</p>
            </div>
          </div>
        </div>
      </template>

      <!-- ================= Inhalt ================= -->
      <template v-else-if="page.type === 'toc'">
        <h2 class="page__heading">Inhalt</h2>
        <div class="flourish" aria-hidden="true"><i /></div>
        <ol class="toc">
          <li v-for="entry in chapters" :key="entry.chapter">
            <button type="button" class="toc__entry" @click="emit('goto', entry.chapter)">
              <span class="toc__num">{{ toRoman(entry.chapter) }}.</span>
              <span class="toc__title">{{ entry.title }}</span>
              <span class="toc__dots" aria-hidden="true" />
              <span class="toc__page">{{ entry.page }}</span>
            </button>
          </li>
        </ol>
      </template>

      <!-- ================= Bildtafel ================= -->
      <template v-else-if="page.type === 'plate' && project">
        <p class="page__kicker">Kapitel {{ toRoman(page.chapter) }}</p>
        <h2 class="page__title">{{ project.title }}</h2>
        <p class="plate__kind">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="kindIcons[project.kind]" /></svg>
          {{ kindLabels[project.kind] }}
        </p>
        <figure
          class="plate"
          :class="{
            'has-secondary': project.image && project.imageSecondary,
            'is-phone-only': !project.image && project.imageSecondary,
          }"
        >
          <button
            v-if="project.image"
            type="button"
            class="plate__photo"
            :aria-label="`${project.image.alt} – vergrößern`"
            @click="emit('zoom', project.image)"
          >
            <img :src="project.image.src" :alt="project.image.alt" draggable="false" />
            <span v-for="c in 4" :key="c" class="plate__corner" aria-hidden="true" />
          </button>
          <div v-else-if="!project.imageSecondary" class="plate__empty" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path :d="kindIcons[project.kind]" /></svg>
          </div>
          <button
            v-if="project.imageSecondary"
            type="button"
            class="plate__phone"
            :aria-label="`${project.imageSecondary.alt} – vergrößern`"
            @click="emit('zoom', project.imageSecondary)"
          >
            <img
              :src="project.imageSecondary.src"
              :alt="project.imageSecondary.alt"
              draggable="false"
            />
            <span class="plate__tape" aria-hidden="true" />
          </button>
          <figcaption v-if="project.caption">{{ project.caption }}</figcaption>
        </figure>
      </template>

      <!-- ================= Steckbrief ================= -->
      <template v-else-if="page.type === 'profile' && project">
        <header class="profile__head">
          <div>
            <p class="page__kicker">Steckbrief</p>
            <h2 class="profile__title">{{ project.title }}</h2>
          </div>
          <div class="seal" :aria-label="`Status: ${statusLabels[project.status]}`" role="img">
            <svg viewBox="-50 -50 100 100" aria-hidden="true">
              <path :d="sealPath" :fill="waxColors[project.status]" />
              <circle r="33" class="seal__ring" />
              <circle r="29" class="seal__ring seal__ring--thin" />
            </svg>
            <span>{{ statusLabels[project.status] }}</span>
          </div>
        </header>

        <dl class="profile__meta">
          <div v-for="row in meta" :key="row.term">
            <dt>{{ row.term }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>

        <section class="profile__block">
          <h3>Die Idee</h3>
          <p class="profile__idea">{{ project.idea }}</p>
        </section>

        <section class="profile__block">
          <h3>Schwerpunkt</h3>
          <ul class="profile__focus">
            <li v-for="item in project.focus" :key="item">{{ item }}</li>
          </ul>
        </section>

        <section class="profile__block">
          <h3>Werkzeuge</h3>
          <ul class="stamps">
            <li v-for="tool in project.tools" :key="tool">{{ tool }}</li>
          </ul>
        </section>

        <div class="profile__foot">
          <section class="profile__candles">
            <h3>Zufriedenheit</h3>
            <CandleMeter :value="project.satisfaction" />
          </section>
          <div
            v-if="project.note || project.noteMark"
            class="profile__note"
            :class="{ 'profile__note--mark-only': !project.note }"
          >
            <p v-if="project.note">{{ project.note }}</p>
            <span
              v-if="project.noteMark"
              class="profile__mark"
              role="img"
              :aria-label="project.noteMark.label"
              :style="{ '--mark': `url('${project.noteMark.src}')` }"
            />
          </div>
        </div>

        <div v-if="project.links?.length" class="profile__links">
          <a
            v-for="link in project.links"
            :key="link.href"
            :href="link.href"
            target="_blank"
            rel="noopener"
            class="hand-link"
          >
            <span class="hand-link__text">{{ link.label }} <span aria-hidden="true">→</span></span>
            <!-- von Hand gezogener Kringel um die Schrift -->
            <svg class="hand-link__loop" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
              <path
                d="M22 34 C 14 14, 70 5, 112 7 C 160 9, 194 18, 190 34 C 186 52, 120 57, 78 54 C 38 51, 6 44, 12 28 C 16 18, 40 12, 62 11"
                pathLength="1"
              />
            </svg>
          </a>
        </div>
      </template>

      <!-- ================= Ungeschriebenes Kapitel ================= -->
      <template v-else-if="page.type === 'unwritten'">
        <p class="page__kicker">Kapitel {{ toRoman(page.chapter) }}</p>
        <h2 class="page__title page__title--faded">Noch ungeschrieben</h2>
        <div class="unwritten" aria-hidden="true">
          <span v-for="line in 9" :key="line" />
          <svg class="unwritten__quill" viewBox="0 0 64 64">
            <path
              d="M58 4C40 6 24 18 16 36l-4 10 3 1 4-9c4 0 9-2 13-6-3 0-6 0-8-1 6-1 11-4 15-8-3 0-5 0-7-1 7-3 14-9 22-18z"
            />
            <path d="M12 46l-3 12" />
          </svg>
          <svg class="unwritten__blot" viewBox="0 0 40 30">
            <path
              d="M20 4c6 0 9 4 13 5s5 7 1 10-6 8-13 7-11-2-14-6-4-9 1-12 6-4 12-4z M36 4a2 2 0 1 1 0 .1z M4 26a1.5 1.5 0 1 1 0 .1z"
            />
          </svg>
        </div>
        <p class="unwritten__text">Diese Seiten warten noch auf ihre Geschichte …</p>
      </template>

      <!-- ================= Einladung ================= -->
      <template v-else-if="page.type === 'invite'">
        <div class="invite">
          <h2 class="page__title">Vielleicht ist es deins?</h2>
          <div class="flourish" aria-hidden="true"><i /></div>
          <p>
            Du planst eine Vereinsseite, eine App oder etwas ganz anderes? Erzähl mir davon – dann
            schreiben wir das nächste Kapitel gemeinsam.
          </p>
          <div class="invite__actions">
            <RouterLink to="/contact" class="wax-link">Kontakt aufnehmen</RouterLink>
            <RouterLink to="/leistungen" class="ink-link">Meine Leistungen</RouterLink>
          </div>
        </div>
      </template>

      <span v-if="number" class="page__number" aria-hidden="true">{{ number }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page {
  --ink: #2b1f12;
  --ink-soft: #5e4a2f;
  --ink-faded: rgb(94 74 47 / 55%);
  --rubric: #8e2f17;
  position: absolute;
  inset: 0;
  container-type: size;
}

/* ---------------- Papier ---------------- */
.sheet {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: var(--page-pad, 7cqh 9cqw 6.5cqh);
  overflow: hidden auto;
  overscroll-behavior: contain;
  font-family: var(--font-body);
  font-size: var(--page-font, 3.05cqw);
  line-height: 1.42;
  color: var(--ink);
  background:
    radial-gradient(ellipse at 18% 12%, rgb(255 255 255 / 35%), transparent 45%),
    radial-gradient(circle at 82% 88%, rgb(150 105 50 / 14%), transparent 30%),
    radial-gradient(circle at 12% 78%, rgb(150 105 50 / 9%), transparent 22%),
    linear-gradient(180deg, var(--paper-1), var(--paper-2) 70%, var(--paper-3));
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  /* Papierfasern, Stockflecken */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 76% 14%, rgb(140 90 40 / 10%), transparent 3%),
      radial-gradient(circle at 18% 64%, rgb(140 90 40 / 8%), transparent 2.4%),
      radial-gradient(circle at 64% 82%, rgb(140 90 40 / 9%), transparent 4%), var(--tex-paper);
    background-size: auto, auto, auto, 60cqw;
    mix-blend-mode: multiply;
    opacity: 0.55;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    box-shadow:
      inset 0 0 3.5cqw rgb(120 80 35 / 28%),
      inset 0 0 0.6cqw rgb(120 80 35 / 22%);
  }
}

/* Falz-Schatten zur Buchmitte */
.page--left .sheet {
  border-radius: 0.6cqw 0 0 0.6cqw;
  background-image:
    linear-gradient(90deg, transparent 84%, rgb(90 60 25 / 12%) 94%, rgb(60 38 14 / 34%)),
    radial-gradient(ellipse at 18% 12%, rgb(255 255 255 / 35%), transparent 45%),
    radial-gradient(circle at 82% 88%, rgb(150 105 50 / 14%), transparent 30%),
    linear-gradient(180deg, var(--paper-1), var(--paper-2) 70%, var(--paper-3));
}

.page--right .sheet {
  border-radius: 0 0.6cqw 0.6cqw 0;
  background-image:
    linear-gradient(270deg, transparent 84%, rgb(90 60 25 / 12%) 94%, rgb(60 38 14 / 30%)),
    radial-gradient(ellipse at 70% 12%, rgb(255 255 255 / 35%), transparent 45%),
    radial-gradient(circle at 20% 90%, rgb(150 105 50 / 12%), transparent 30%),
    linear-gradient(180deg, var(--paper-1), var(--paper-2) 70%, var(--paper-3));
}

.page--single .sheet {
  border-radius: 0 0.8cqw 0.8cqw 0;
  background-image:
    linear-gradient(90deg, rgb(60 38 14 / 26%), rgb(90 60 25 / 8%) 5%, transparent 12%),
    radial-gradient(ellipse at 70% 12%, rgb(255 255 255 / 35%), transparent 45%),
    linear-gradient(180deg, var(--paper-1), var(--paper-2) 70%, var(--paper-3));
}

.page__number {
  position: absolute;
  bottom: 3cqh;
  font-family: var(--font-display);
  font-size: 0.78em;
  color: var(--ink-faded);
}

.page--left .page__number {
  left: 9cqw;
}

.page--right .page__number,
.page--single .page__number {
  right: 9cqw;
}

/* ---------------- Typografie ---------------- */
.page__kicker {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.72em;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--rubric);
}

.page__title,
.page__heading {
  margin: 0.1em 0 0.25em;
  font-family: var(--font-accent);
  font-size: 2.3em;
  font-weight: normal;
  line-height: 1.05;
  color: var(--ink);
  text-wrap: balance;
}

.page__heading {
  text-align: center;
  font-size: 2.6em;
}

.page__title--faded {
  color: var(--ink-faded);
}

.flourish {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6em;
  margin: 0.2em 0 1em;
  color: var(--rubric);

  &::before,
  &::after {
    content: '';
    width: 22%;
    height: 1px;
    background: linear-gradient(90deg, transparent, currentColor);
  }

  &::after {
    transform: scaleX(-1);
  }

  i {
    width: 0.45em;
    height: 0.45em;
    rotate: 45deg;
    border: 1px solid currentColor;
  }
}

h3 {
  margin: 0 0 0.2em;
  font-family: var(--font-display);
  font-size: 0.68em;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

/* ---------------- Einband ---------------- */
.cover {
  position: absolute;
  inset: 0;
  padding: 0;
  border: 0;
  border-radius: 0.8cqw 2cqw 2cqw 0.8cqw;
  font: inherit;
  cursor: pointer;
  color: #f3d898;
  text-align: center;
  isolation: isolate;
  background:
    /* abgegriffene Stellen und Fleckigkeit */
    radial-gradient(ellipse 40% 30% at 82% 50%, rgb(255 190 140 / 10%), transparent),
    radial-gradient(ellipse 50% 35% at 30% 18%, rgb(255 210 150 / 15%), transparent),
    radial-gradient(ellipse 45% 40% at 70% 88%, rgb(0 0 0 / 30%), transparent),
    radial-gradient(circle at 20% 70%, rgb(0 0 0 / 18%), transparent 25%),
    radial-gradient(circle at 88% 12%, rgb(0 0 0 / 22%), transparent 18%),
    linear-gradient(
      90deg,
      #2a0f08 0,
      #4a1b10 3%,
      #6d2a17 6.5%,
      #5c2414 9%,
      #5a2313 50%,
      #4c1c10 100%
    );
  box-shadow:
    /* Kanten: leicht abgewetzt */
    inset 0 0 0 0.35cqw rgb(150 75 45 / 45%),
    inset 0 0 0 0.7cqw rgb(25 8 3 / 55%),
    inset -0.6cqw -0.8cqw 2.4cqw rgb(0 0 0 / 45%),
    inset 0.4cqw 0.4cqw 1.6cqw rgb(255 190 140 / 12%),
    /* Buchblock und hinterer Deckel = Dicke des geschlossenen Buchs */ 0.5cqw 0.7cqw 0 -0.15cqw
      #e4d4b2,
    0.75cqw 1cqw 0 -0.2cqw #cdb894,
    1.1cqw 1.4cqw 0 -0.25cqw #3c160b;
  -webkit-tap-highlight-color: transparent;

  /* Ledernarbung */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    pointer-events: none;
    background-image: var(--tex-leather);
    background-size: 46cqw;
    mix-blend-mode: soft-light;
    opacity: 0.7;
  }

  &:focus-visible {
    outline: 3px solid var(--accent-gold);
    outline-offset: 4px;
  }
}

/* Der Einband ist so groß wie die Buchdeckel (ragt über den Buchblock hinaus),
   damit sich beim Aufschlagen die Größe des Buchs nicht verändert. */
.page--right .cover {
  inset: -2.2% -4.8% -2.6% 0;
}

.page--single .cover {
  inset: -2% -3.2% -2.4% -1.4%;
}

/* Falz am Rücken */
.cover__hinge {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 6.5cqw;
  z-index: 1;
  width: 1.4cqw;
  background: linear-gradient(
    90deg,
    rgb(0 0 0 / 45%),
    rgb(0 0 0 / 15%) 40%,
    rgb(255 190 140 / 14%) 70%,
    transparent
  );
}

.cover__frame {
  position: absolute;
  inset: 6cqw 6cqw 6cqw 11cqw;
  z-index: 1;
  border: 0.4cqw solid #c9974b;
  border-radius: 0.6cqw;
  /* geprägt: Gold mit Licht oben, Schatten unten */
  box-shadow:
    0 -0.15cqw 0 rgb(255 225 160 / 35%),
    0 0.25cqw 0.3cqw rgb(0 0 0 / 55%),
    inset 0 0.2cqw 0.3cqw rgb(0 0 0 / 45%);
}

.cover__frame-inner {
  position: absolute;
  inset: 1.6cqw;
  border: 0.18cqw solid rgb(214 166 82 / 70%);
  border-radius: 0.4cqw;
  outline: 0.18cqw dotted rgb(214 166 82 / 55%);
  outline-offset: 0.9cqw;
}

.cover__ornament {
  position: absolute;
  width: 13cqw;
  fill: none;
  stroke: #e2b766;
  stroke-width: 1.3;
  stroke-linecap: round;
  filter: drop-shadow(0 0.25cqw 0.2cqw rgb(0 0 0 / 60%));

  circle {
    fill: #e2b766;
    stroke: none;
  }

  &:nth-of-type(1) {
    top: 0.6cqw;
    left: 0.6cqw;
  }

  &:nth-of-type(2) {
    top: 0.6cqw;
    right: 0.6cqw;
    rotate: 90deg;
  }

  &:nth-of-type(3) {
    bottom: 0.6cqw;
    right: 0.6cqw;
    rotate: 180deg;
  }

  &:nth-of-type(4) {
    bottom: 0.6cqw;
    left: 0.6cqw;
    rotate: 270deg;
  }
}

/* Messing-Eckbeschläge an der Vorderkante */
.cover__brass {
  position: absolute;
  right: -0.3cqw;
  z-index: 2;
  width: 14cqw;
  height: 14cqw;
  background:
    linear-gradient(135deg, rgb(255 245 210 / 55%), transparent 40%),
    linear-gradient(225deg, #f1cf86, #b8853e 35%, #6f4b20 70%, #c9984f);
  filter: drop-shadow(-0.2cqw 0.3cqw 0.3cqw rgb(0 0 0 / 55%));

  i {
    position: absolute;
    width: 1.5cqw;
    height: 1.5cqw;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff1c8, #a0712f 60%, #5a3a14);
    box-shadow: 0 0.1cqw 0.15cqw rgb(0 0 0 / 50%);
  }
}

.cover__brass--top {
  top: -0.3cqw;
  border-top-right-radius: 2cqw;
  clip-path: polygon(0 0, 100% 0, 100% 100%);

  i:nth-child(1) {
    top: 1.6cqw;
    right: 6cqw;
  }

  i:nth-child(2) {
    top: 6cqw;
    right: 1.6cqw;
  }
}

.cover__brass--bottom {
  bottom: -0.3cqw;
  border-bottom-right-radius: 2cqw;
  clip-path: polygon(100% 0, 100% 100%, 0 100%);
  background:
    linear-gradient(45deg, transparent 60%, rgb(0 0 0 / 25%)),
    linear-gradient(315deg, #f1cf86, #b8853e 35%, #6f4b20 70%, #c9984f);

  i:nth-child(1) {
    bottom: 1.6cqw;
    right: 6cqw;
  }

  i:nth-child(2) {
    bottom: 6cqw;
    right: 1.6cqw;
  }
}

/* Titel genau in der Mitte, Monogramm im oberen Feld */
.cover__content {
  position: absolute;
  inset: 0 0 0 5cqw;
  z-index: 1;
  display: grid;
  grid-template-rows: 1fr auto 1fr;
  justify-items: center;
  padding: 10cqw 14cqw;
}

.cover__top {
  align-self: center;
  translate: 0 -2cqw;
}

.cover__mark {
  display: block;
  width: 27cqw;
  height: auto;
  filter: drop-shadow(0 -0.15cqw 0 rgb(255 230 170 / 25%))
    drop-shadow(0 0.4cqw 0.3cqw rgb(0 0 0 / 65%));
}

.cover__title {
  font-family: var(--font-accent);
  font-size: 10.5cqw;
  line-height: 1.02;
  // festes Gold – das Leder sieht in beiden Themes gleich aus
  background: linear-gradient(
    200deg,
    #fff9da,
    #ffe28e 20%,
    #d8a53b 45%,
    #fff2b9 58%,
    #b37618 80%,
    #ffe7a3
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 -0.12cqw 0 rgb(255 235 180 / 30%))
    drop-shadow(0 0.35cqw 0.25cqw rgb(0 0 0 / 75%));
}

.cover__bottom {
  align-self: start;
  display: grid;
  justify-items: center;
  gap: 2.4cqw;
  padding-top: 3cqw;
}

.cover__rule {
  display: flex;
  align-items: center;
  gap: 2cqw;
  color: #d9a653;
  filter: drop-shadow(0 0.2cqw 0.15cqw rgb(0 0 0 / 60%));

  &::before,
  &::after {
    content: '';
    width: 14cqw;
    height: 0.3cqw;
    background: currentColor;
  }

  i {
    width: 2cqw;
    height: 2cqw;
    rotate: 45deg;
    background: currentColor;
  }
}

.cover__author {
  font-family: var(--font-display);
  font-size: 3.6cqw;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #e9c57d;
  text-shadow:
    0 -0.1cqw 0 rgb(255 235 180 / 25%),
    0 0.3cqw 0.2cqw rgb(0 0 0 / 70%);
}

.cover__hint {
  position: absolute;
  left: 5cqw;
  right: 0;
  bottom: 15cqw;
  z-index: 1;
  font-family: var(--font-body);
  font-size: 3.3cqw;
  font-style: italic;
  color: rgb(243 216 152 / 72%);
  animation: hint-breathe 3.4s ease-in-out infinite;
}

@keyframes hint-breathe {
  50% {
    opacity: 0.45;
  }
}

/* ---------------- Vorsatz ---------------- */
.frontis {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 1.4em;
}

.exlibris {
  align-self: center;
  display: grid;
  justify-items: center;
  padding: 1em 2.2em 0.9em;
  border: 1px solid var(--ink-faded);
  outline: 3px double var(--ink-faded);
  outline-offset: 4px;
  text-align: center;
}

.exlibris__mark {
  width: 3.6em;
  fill: var(--ink-soft);
  stroke: var(--ink-soft);
}

.exlibris__label {
  margin: 0.4em 0 0;
  font-family: var(--font-accent);
  font-size: 1.5em;
}

.exlibris__name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.75em;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.frontis__intro {
  margin: 0;
  text-align: center;
  font-style: italic;
}

.legend {
  padding-top: 0.8em;
  border-top: 1px solid rgb(94 74 47 / 25%);
}

.legend__title {
  margin: 0 0 0.6em;
  font-family: var(--font-display);
  font-size: 0.68em;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.legend__row {
  display: grid;
  grid-template-columns: 6.2em 1fr;
  align-items: center;
  gap: 0.9em;
  margin-bottom: 0.7em;

  p {
    margin: 0;
    font-size: 0.9em;
    line-height: 1.3;
  }
}

.legend__candles {
  font-size: 0.85em;
}

.legend__seals {
  display: flex;

  svg {
    width: 1.55em;
    margin-right: -0.25em;
    filter: drop-shadow(0 1px 1px rgb(0 0 0 / 30%));
  }
}

/* ---------------- Inhalt ---------------- */
.toc {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35em;
}

.toc__entry {
  display: flex;
  align-items: baseline;
  gap: 0.5em;
  width: 100%;
  padding: 0.45em 0.2em;
  border: 0;
  border-radius: 4px;
  background: none;
  font: inherit;
  font-size: 1.12em;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: background-color 160ms ease-out;

  &:hover,
  &:focus-visible {
    background: rgb(142 47 23 / 8%);
  }

  &:focus-visible {
    outline: 2px solid var(--rubric);
  }
}

.toc__num {
  min-width: 2.4em;
  font-family: var(--font-display);
  font-size: 0.8em;
  color: var(--rubric);
}

.toc__dots {
  flex: 1;
  border-bottom: 2px dotted var(--ink-faded);
  translate: 0 -0.25em;
}

.toc__page {
  font-family: var(--font-display);
  font-size: 0.85em;
}

/* ---------------- Bildtafel ---------------- */
.plate__kind {
  display: flex;
  align-items: center;
  gap: 0.45em;
  margin: 0 0 1em;
  font-family: var(--font-display);
  font-size: 0.75em;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--ink-soft);

  svg {
    width: 1.5em;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

.plate {
  position: relative;
  flex: 1;
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  translate: 0 -1.2em; // Bilder minimal über der Mitte
}

/* Fotos sind Knöpfe: antippen vergrößert */
.plate__photo,
.plate__phone {
  border: 0;
  font: inherit;
  color: inherit;
  cursor: zoom-in;
  -webkit-tap-highlight-color: transparent;

  &:focus-visible {
    outline: 2px solid var(--rubric);
    outline-offset: 3px;
  }
}

.plate__photo {
  position: relative;
  display: block;
  padding: 0.5em;
  background: #fbf6ea;
  box-shadow:
    0 0.15em 0.3em rgb(60 40 15 / 25%),
    0 0.6em 1.2em rgb(60 40 15 / 18%);
  rotate: -1.6deg;

  img {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 10;
    object-fit: cover;
    object-position: top;
    filter: sepia(0.18) saturate(0.92);
  }
}

.has-secondary .plate__photo {
  width: 88%;
}

.plate__corner {
  position: absolute;
  width: 1.6em;
  height: 1.6em;
  background: linear-gradient(135deg, #5b4126 50%, transparent 50%);
  opacity: 0.85;

  &:nth-of-type(1) {
    top: -0.2em;
    left: -0.2em;
  }

  &:nth-of-type(2) {
    top: -0.2em;
    right: -0.2em;
    rotate: 90deg;
  }

  &:nth-of-type(3) {
    bottom: -0.2em;
    right: -0.2em;
    rotate: 180deg;
  }

  &:nth-of-type(4) {
    bottom: -0.2em;
    left: -0.2em;
    rotate: 270deg;
  }
}

.plate__phone {
  position: absolute;
  right: 0;
  bottom: 2.4em;
  width: 32%;
  padding: 0.3em;
  border-radius: 0.6em;
  background: #fbf6ea;
  box-shadow:
    0 0.2em 0.4em rgb(60 40 15 / 30%),
    0 0.8em 1.4em rgb(60 40 15 / 22%);
  rotate: 4deg;

  img {
    display: block;
    width: 100%;
    aspect-ratio: 9 / 18;
    border-radius: 0.4em;
    object-fit: cover;
    object-position: top;
    filter: sepia(0.18) saturate(0.92);
  }
}

/* Nur Handybild (App): das Handy steht allein und groß in der Mitte */
.is-phone-only {
  align-items: center;

  .plate__phone {
    position: relative;
    right: auto;
    bottom: auto;
    width: min(56%, 15em);
    rotate: -2.5deg;
  }
}

.plate__tape {
  position: absolute;
  top: -0.6em;
  left: 50%;
  width: 3.4em;
  height: 1.1em;
  translate: -50% 0;
  rotate: -6deg;
  background: rgb(240 225 180 / 70%);
  box-shadow: 0 1px 2px rgb(0 0 0 / 12%);
}

.plate__empty {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 10;
  border: 1px dashed var(--ink-faded);

  svg {
    width: 25%;
    fill: none;
    stroke: var(--ink-faded);
    stroke-width: 1;
  }
}

.plate figcaption {
  margin-top: 1.3em;
  max-width: 68%;
  font-style: italic;
  color: var(--ink-soft);
}

/* ---------------- Steckbrief ---------------- */
.profile__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1em;
}

.profile__title {
  margin: 0.05em 0 0.3em;
  font-family: var(--font-accent);
  font-size: 1.9em;
  font-weight: normal;
  line-height: 1.05;
}

.seal {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: 4.6em;
  margin: -0.4em -0.4em 0 0;
  rotate: 12deg;
  filter: drop-shadow(0 0.15em 0.15em rgb(40 20 5 / 40%));

  svg {
    width: 100%;
  }

  span {
    position: absolute;
    width: min-content;
    font-family: var(--font-display);
    font-size: 0.56em;
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: 0.08em;
    text-align: center;
    text-transform: uppercase;
    color: rgb(255 240 210 / 85%);
    text-shadow: 0 -1px 0 rgb(0 0 0 / 35%);
  }
}

.seal__ring {
  fill: none;
  stroke: rgb(0 0 0 / 22%);
  stroke-width: 2.4;
}

.seal__ring--thin {
  stroke: rgb(255 255 255 / 18%);
  stroke-width: 1;
}

.profile__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35em 1em;
  margin: 0 0 0.9em;
  padding: 0.55em 0;
  border-block: 1px solid rgb(94 74 47 / 28%);

  div {
    min-width: 0;
  }

  dt {
    font-family: var(--font-display);
    font-size: 0.62em;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  dd {
    margin: 0;
    font-weight: 600;
    line-height: 1.2;
  }
}

.profile__block {
  margin-bottom: 0.8em;
}

.profile__idea {
  margin: 0;
  text-align: justify;
  hyphens: auto;

  &::first-letter {
    float: left;
    margin: 0.06em 0.1em 0 0;
    font-family: var(--font-accent);
    font-size: 3em;
    line-height: 0.8;
    color: var(--rubric);
  }
}

/* Schwerpunkte: Rubrik-Zeile mit Zierrauten, deutlich anders als die Stempel */
.profile__focus {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.15em 0;
  margin: 0.1em 0 0;
  padding: 0;
  font-family: var(--font-display);
  font-size: 0.86em;
  font-weight: 600;
  font-variant: small-caps;
  letter-spacing: 0.06em;
  color: var(--ink);

  li {
    display: inline-flex;
    align-items: baseline;
  }

  li + li::before {
    content: '◆';
    margin: 0 0.6em;
    font-size: 0.55em;
    color: var(--rubric);
    translate: 0 -0.25em;
  }
}

.stamps {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4em 0.45em;
  margin: 0.15em 0 0;
  padding: 0;

  li {
    padding: 0.05em 0.55em;
    border: 1.5px solid rgb(142 47 23 / 70%);
    border-radius: 0.2em;
    font-family: var(--font-display);
    font-size: 0.72em;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgb(142 47 23 / 85%);
    box-shadow: inset 0 0 0 1px rgb(142 47 23 / 18%);
    rotate: -1.5deg;

    &:nth-child(even) {
      rotate: 1.8deg;
    }

    &:nth-child(3n) {
      rotate: -0.5deg;
      opacity: 0.85;
    }
  }
}

.profile__foot {
  display: flex;
  align-items: flex-end;
  gap: 1.2em;
  margin-top: auto;
}

.profile__candles {
  flex: none;
  font-size: 1em;

  p {
    margin: 0.2em 0 0;
    font-size: 0.7em;
    font-style: italic;
    color: var(--ink-soft);
  }
}

.profile__note {
  display: flex;
  align-items: center;
  gap: 0.6em;
  padding: 0.4em 0.7em;
  border-left: 2px solid rgb(142 47 23 / 50%);
  color: #6f2a16;
  rotate: -1.2deg;

  p {
    margin: 0;
    font-size: 0.86em;
    font-style: italic;
    line-height: 1.3;
  }
}

/* nur Logo, ohne Notiztext: Stempel etwas größer */
.profile__note--mark-only {
  .profile__mark {
    width: 3.6em;
  }
}

/* Logo als Tintenabdruck: Form aus dem SVG, Farbe wie die Notiz */
.profile__mark {
  flex: none;
  width: 2.6em;
  aspect-ratio: 1891 / 1869;
  background: currentColor;
  opacity: 0.85;
  -webkit-mask: var(--mark) center / contain no-repeat;
  mask: var(--mark) center / contain no-repeat;
  rotate: 6deg;
}

/* Link ganz unten rechts auf der Seite */
.profile__links {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.6em;
  margin-top: 0.9em;
}

.wax-link,
.ink-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  min-height: 44px;
  padding: 0.3em 1.1em;
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 0.78em;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  transition:
    transform 160ms ease-out,
    box-shadow 160ms ease-out;

  &:focus-visible {
    outline: 2px solid var(--rubric);
    outline-offset: 3px;
  }
}

.wax-link {
  color: #fbe9c6;
  background: radial-gradient(circle at 35% 30%, #b2452a, #7d2512 70%);
  box-shadow:
    inset 0 -2px 3px rgb(0 0 0 / 30%),
    inset 0 1px 2px rgb(255 200 170 / 35%),
    0 2px 4px rgb(60 20 5 / 35%);

  &:hover {
    transform: translateY(-1px);
  }
}

.ink-link {
  color: var(--ink);
  border: 1.5px solid var(--ink-soft);
}

/* Handschriftlicher Link: Tinte in Rubrikrot, mit gezogenem Kringel */
.hand-link {
  position: relative;
  display: inline-grid;
  place-items: center;
  min-height: 44px;
  padding: 0.35em 1.3em 0.45em;
  font-family: var(--font-hand);
  font-size: 1.35em;
  font-weight: 600;
  line-height: 1;
  color: var(--rubric);
  text-decoration: none;
  rotate: -2deg;
  -webkit-tap-highlight-color: transparent;

  &:focus-visible {
    outline: 2px dashed var(--rubric);
    outline-offset: 4px;
  }
}

.hand-link__text {
  position: relative;
  transition: translate 180ms ease-out;
}

.hand-link__loop {
  position: absolute;
  inset: -2px -4px;
  width: calc(100% + 8px);
  height: calc(100% + 4px);
  overflow: visible;
  pointer-events: none;

  path {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
    opacity: 0.8;
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
  }
}

@media (hover: hover) {
  .hand-link:hover {
    .hand-link__text {
      translate: 3px 0;
    }

    .hand-link__loop path {
      animation: hand-redraw 520ms ease-out;
    }
  }
}

@keyframes hand-redraw {
  from {
    stroke-dashoffset: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hand-link:hover .hand-link__loop path {
    animation: none;
  }
}

/* ---------------- Ungeschrieben ---------------- */
.unwritten {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  margin: 1em 0;

  span {
    height: 1px;
    background: rgb(94 74 47 / 22%);
  }
}

.unwritten__quill {
  position: absolute;
  right: 4%;
  bottom: 8%;
  width: 28%;
  fill: rgb(94 74 47 / 30%);
  stroke: rgb(94 74 47 / 45%);
  stroke-width: 1.2;
  rotate: 8deg;
}

.unwritten__blot {
  position: absolute;
  left: 12%;
  top: 30%;
  width: 12%;
  fill: rgb(30 20 10 / 30%);
}

.unwritten__text {
  margin: 0;
  font-style: italic;
  color: var(--ink-soft);
  text-align: center;
}

/* ---------------- Einladung ---------------- */
.invite {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;

  p {
    margin: 0 0 1.4em;
    max-width: 30ch;
  }
}

.invite .flourish {
  width: 70%;
}

.invite__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.7em;
}

/* Einzelseite (Handy): etwas dichter setzen */
.page--single {
  .profile__meta {
    margin-bottom: 0.6em;
    padding: 0.4em 0;
  }

  .profile__block {
    margin-bottom: 0.55em;
  }

  .profile__idea::first-letter {
    font-size: 2.6em;
  }

  .profile__links {
    margin-top: 0.6em;
  }

  .seal {
    width: 4em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cover__hint {
    animation: none;
  }
}
</style>

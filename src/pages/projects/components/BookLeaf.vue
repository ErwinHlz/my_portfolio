<script setup lang="ts">
import { computed } from 'vue';
import BookPage from './BookPage.vue';
import type { BookPage as Page } from '../lib/bookPages';
import { faceShade, SEGMENT_SPANS, SEGMENTS, type LeafGeometry } from '../lib/leaf';

const props = defineProps<{
  front: Page | null;
  frontNumber: number | null;
  back: Page | null;
  backNumber: number | null;
  chapters: { chapter: number; title: string; page: number }[];
  single: boolean;
  geometry: LeafGeometry;
}>();

// Schattierung an den Streifengrenzen, damit die Biegung ohne Kanten verläuft
const boundaryShades = computed(() => {
  const t = props.geometry.thetas;
  const bounds = [t[0]!, (t[0]! + t[1]!) / 2, (t[1]! + t[2]!) / 2, t[2]!];
  const backScale = props.single ? 0.45 : 1;
  return bounds.map((theta) => ({
    front: faceShade(theta, false),
    back: faceShade(theta, true) * backScale,
  }));
});

const shadeGradient = (from: number, to: number) =>
  `linear-gradient(90deg, rgb(35 22 8 / ${from.toFixed(3)}), rgb(35 22 8 / ${to.toFixed(3)}))`;

const segments = computed(() =>
  SEGMENTS.map((fraction, index) => {
    const { a, b } = SEGMENT_SPANS[index]!;
    const start = boundaryShades.value[index]!;
    const end = boundaryShades.value[index + 1]!;
    return {
      // Breite relativ zum Elternstreifen (verschachtelt) bzw. zur Seite (erster Streifen)
      width: index === 0 ? `${fraction * 100}%` : `${(fraction / SEGMENTS[index - 1]!) * 100}%`,
      transform: `rotateY(${props.geometry.rels[index]}deg)`,
      // Ausschnitt der Seite, den dieser Streifen zeigt (in Seitenbreiten)
      frontOffset: -a / fraction,
      backOffset: -(1 - b) / fraction,
      pageWidth: 1 / fraction,
      frontShade: shadeGradient(start.front, end.front),
      // Rückseite ist gespiegelt: links liegt das äußere Ende des Streifens
      backShade: shadeGradient(end.back, start.back),
    };
  }),
);
</script>

<template>
  <div
    class="leaf"
    :class="{ 'leaf--single': single, 'leaf--cover': front?.type === 'cover' }"
    aria-hidden="true"
  >
    <div
      class="seg seg--0"
      :style="{ width: segments[0]!.width, transform: segments[0]!.transform }"
    >
      <div class="face face--front">
        <div
          class="face__page"
          :style="{
            width: `${segments[0]!.pageWidth * 100}%`,
            left: `${segments[0]!.frontOffset * 100}%`,
          }"
        >
          <BookPage
            v-if="front"
            :page="front"
            :number="frontNumber ?? undefined"
            :chapters="chapters"
            :side="single ? 'single' : 'right'"
          />
        </div>
        <span
          class="face__shade face__shade--front"
          :style="{ background: segments[0]!.frontShade }"
        />
      </div>
      <div class="face face--back">
        <div
          class="face__page"
          :style="{
            width: `${segments[0]!.pageWidth * 100}%`,
            left: `${segments[0]!.backOffset * 100}%`,
          }"
        >
          <BookPage
            v-if="back"
            :page="back"
            :number="backNumber ?? undefined"
            :chapters="chapters"
            side="left"
          />
          <span v-else class="face__blank" />
        </div>
        <span
          class="face__shade face__shade--back"
          :style="{ background: segments[0]!.backShade }"
        />
      </div>

      <div
        class="seg seg--1"
        :style="{ width: segments[1]!.width, transform: segments[1]!.transform }"
      >
        <div class="face face--front">
          <div
            class="face__page"
            :style="{
              width: `${segments[1]!.pageWidth * 100}%`,
              left: `${segments[1]!.frontOffset * 100}%`,
            }"
          >
            <BookPage
              v-if="front"
              :page="front"
              :number="frontNumber ?? undefined"
              :chapters="chapters"
              :side="single ? 'single' : 'right'"
            />
          </div>
          <span
            class="face__shade face__shade--front"
            :style="{ background: segments[1]!.frontShade }"
          />
        </div>
        <div class="face face--back">
          <div
            class="face__page"
            :style="{
              width: `${segments[1]!.pageWidth * 100}%`,
              left: `${segments[1]!.backOffset * 100}%`,
            }"
          >
            <BookPage
              v-if="back"
              :page="back"
              :number="backNumber ?? undefined"
              :chapters="chapters"
              side="left"
            />
            <span v-else class="face__blank" />
          </div>
          <span
            class="face__shade face__shade--back"
            :style="{ background: segments[1]!.backShade }"
          />
        </div>

        <div
          class="seg seg--2"
          :style="{ width: segments[2]!.width, transform: segments[2]!.transform }"
        >
          <div class="face face--front">
            <div
              class="face__page"
              :style="{
                width: `${segments[2]!.pageWidth * 100}%`,
                left: `${segments[2]!.frontOffset * 100}%`,
              }"
            >
              <BookPage
                v-if="front"
                :page="front"
                :number="frontNumber ?? undefined"
                :chapters="chapters"
                :side="single ? 'single' : 'right'"
              />
            </div>
            <span
              class="face__shade face__shade--front"
              :style="{ background: segments[2]!.frontShade }"
            />
          </div>
          <div class="face face--back">
            <div
              class="face__page"
              :style="{
                width: `${segments[2]!.pageWidth * 100}%`,
                left: `${segments[2]!.backOffset * 100}%`,
              }"
            >
              <BookPage
                v-if="back"
                :page="back"
                :number="backNumber ?? undefined"
                :chapters="chapters"
                side="left"
              />
              <span v-else class="face__blank" />
            </div>
            <span
              class="face__shade face__shade--back"
              :style="{ background: segments[2]!.backShade }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.leaf {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 50%;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
  pointer-events: none;
}

.leaf--single {
  left: 0;
  width: 100%;
}

.seg {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  transform-origin: left center;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
}

.seg--1,
.seg--2 {
  left: 100%;
}

.face {
  position: absolute;
  inset: 0 -1px 0 0; // winzige Überlappung gegen Haarlinien zwischen den Streifen
  overflow: hidden;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.face--back {
  transform: rotateY(180deg);
}

.face__page {
  position: absolute;
  top: 0;
  bottom: 0;
}

.face__blank {
  position: absolute;
  inset: 0;
  background:
    var(--tex-paper), linear-gradient(90deg, var(--paper-1), var(--paper-2) 70%, var(--paper-3));
  background-size: 260px, auto;
}

.face__shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Einband-Blatt: der Deckel ragt oben, unten und außen über die Seite hinaus.
   Statt overflow begrenzt clip-path – nur an den Außenkanten des Blatts mit Überstand. */
.leaf--cover {
  .face {
    overflow: visible;
    clip-path: inset(-4% 0 -4% 0);
  }

  .face__shade {
    inset: -4% 0;
  }

  // Außenkante: vorne rechts, hinten (gespiegelt) links
  .seg--2 > .face--front {
    clip-path: inset(-4% -30% -4% 0);
  }

  .seg--2 > .face--back {
    clip-path: inset(-4% 0 -4% -30%);
  }

  // Innenseite des Deckels hinter der ersten Seite
  .face--back .face__page {
    isolation: isolate;

    &::before {
      content: '';
      position: absolute;
      inset: -2.2% 0 -2.6% -4.8%;
      z-index: -1;
      border-radius: 12px 3px 3px 12px;
      background:
        radial-gradient(ellipse 60% 40% at 30% 15%, rgb(255 200 150 / 10%), transparent),
        linear-gradient(180deg, #5e2414, #4a1b0f);
      box-shadow:
        inset 0 0 0 2px rgb(150 75 45 / 40%),
        inset 0 0 0 4px rgb(25 8 3 / 45%),
        inset 0 0 22px rgb(0 0 0 / 50%);
    }
  }
}

/* Einzelseite: Deckel ragt auch am Falz ein wenig über */
.leaf--single.leaf--cover {
  .seg--0 > .face--front {
    clip-path: inset(-4% 0 -4% -4%);
  }

  .seg--0 > .face--back {
    clip-path: inset(-4% -4% -4% 0);
  }

  .face--back .face__page::before {
    inset: -2% -1.4% -2.4% -3.2%;
    border-radius: 10px 4px 4px 10px;
  }
}
</style>

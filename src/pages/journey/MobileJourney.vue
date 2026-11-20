<script setup lang="ts">
// Handy: alle Inhalte (außer dem Playground) auf einer durchgehenden Scrollseite.
// Die Adresse folgt dem Abschnitt, in dem man gerade ist – so zeigt der Kompass richtig an,
// und ein Ziel im Kompass scrollt einfach zum passenden Abschnitt.
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SiteFooter from '@/layout/SiteFooter.vue';
import HomeView from '@/pages/home/HomeView.vue';
import AboutView from '@/pages/about/AboutView.vue';
import ServicesView from '@/pages/services/ServicesView.vue';
import ProjectsView from '@/pages/projects/ProjectsView.vue';
import ContactView from '@/pages/contact/ContactView.vue';

const route = useRoute();
const router = useRouter();

const sections = [
  { path: '/home', id: 'start', label: 'Start', component: HomeView },
  { path: '/about', id: 'ueber-mich', label: 'Über mich', component: AboutView },
  { path: '/leistungen', id: 'leistungen', label: 'Leistungen', component: ServicesView },
  { path: '/projekte', id: 'projekte', label: 'Projekte', component: ProjectsView },
  { path: '/contact', id: 'kontakt', label: 'Kontakt', component: ContactView },
];

const scroller = ref<HTMLElement | null>(null);
let followingScroll = false; // Adresse wurde vom Scrollen geändert – nicht zurückspringen
let autoScrolling = false; // gerade unterwegs zu einem Kompassziel – Scrollen nicht auswerten
let autoTimer: number | undefined;
let frame = 0;

/** Beginn des eigentlichen Inhalts eines Abschnitts (hinter seiner Nebelbank) */
function contentTop(section: HTMLElement) {
  const body = section.querySelector<HTMLElement>('.mobile-journey__body');
  return section.offsetTop + (body?.offsetTop ?? 0);
}

function sectionTop(path: string) {
  const index = sections.findIndex((section) => section.path === path);
  if (index <= 0 || !scroller.value) return 0; // Start liegt ganz oben
  const element = scroller.value.querySelector<HTMLElement>(`#${sections[index]!.id}`);
  if (!element) return 0;
  const inset = parseFloat(getComputedStyle(scroller.value).scrollPaddingTop) || 0;
  return Math.max(0, contentTop(element) - inset);
}

function scrollToPath(path: string, behavior: ScrollBehavior) {
  if (!scroller.value) return;
  const smooth = behavior === 'smooth' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  autoScrolling = true;
  window.clearTimeout(autoTimer);
  scroller.value.scrollTo({ top: sectionTop(path), behavior: smooth ? 'smooth' : 'auto' });
  autoTimer = window.setTimeout(() => (autoScrolling = false), smooth ? 900 : 50);
}

/** welcher Abschnitt füllt gerade die obere Bildschirmhälfte? */
function currentPath() {
  const el = scroller.value;
  if (!el) return null;
  const line = el.scrollTop + el.clientHeight * 0.4;
  let path = sections[0]!.path;
  for (const section of sections) {
    const element = el.querySelector<HTMLElement>(`#${section.id}`);
    // gewechselt wird mitten in der Nebelbank
    if (element && contentTop(element) - el.clientHeight * 0.2 <= line) path = section.path;
  }
  return path;
}

function onScroll() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (autoScrolling) return;
    const path = currentPath();
    if (!path || path === route.path) return;
    followingScroll = true;
    void router.replace({ path });
  });
}

watch(
  () => route.path,
  (path) => {
    if (followingScroll) {
      followingScroll = false;
      return;
    }
    scrollToPath(path, 'smooth');
  },
);

onMounted(async () => {
  await nextTick();
  // einen Frame warten, bis Wald, Kugel und Buch ihre Größe haben
  requestAnimationFrame(() => {
    if (!route.hash) scrollToPath(route.path, 'auto');
  });
  scroller.value?.addEventListener('scroll', onScroll, { passive: true });
});

onBeforeUnmount(() => {
  scroller.value?.removeEventListener('scroll', onScroll);
  cancelAnimationFrame(frame);
  window.clearTimeout(autoTimer);
});
</script>

<template>
  <main ref="scroller" class="page-content realm-page mobile-journey">
    <div v-for="(section, index) in sections" :id="section.id" :key="section.id" class="mobile-journey__section">
      <!-- Nebelbank: der vorige Abschnitt verschwindet im Nebel, darin der Name des nächsten,
           dann tritt der nächste Abschnitt aus dem Nebel hervor -->
      <div v-if="index > 1" class="mobile-journey__fog" aria-hidden="true">
        <span class="mobile-journey__mist" />
        <div class="mobile-journey__divider">
          <span class="mobile-journey__line" />
          <span class="mobile-journey__label">{{ section.label }}</span>
          <span class="mobile-journey__line" />
        </div>
      </div>
      <div
        class="mobile-journey__body"
        :class="{ 'fade-top fade-bottom': section.id === 'leistungen' }"
      >
        <component :is="section.component" embedded />
      </div>
    </div>
    <SiteFooter />
  </main>
</template>

<style scoped lang="scss">
.mobile-journey {
  scroll-padding-top: calc(var(--site-header-depth) + 12px);
}

/* Abschnitte bilden keine eigene Ebene: so liegen alle Nebelbänke (Ebene 0) hinter allen
   Inhalten (Ebene 1) – der Nebel färbt nur den Hintergrund, verdeckt aber nichts */
.mobile-journey__section {
  position: relative;
}

.mobile-journey__body {
  position: relative;
  z-index: 1;
}

/* Die eingebetteten Seiten bringen ihren eigenen Seitenhintergrund mit – auf der Scrollseite
   durchsichtig, sonst entstehen harte Kanten, an denen der Nebel dahinter abbricht */
.mobile-journey__body > :deep(.is-embedded) {
  background: transparent;
}

/* Über mich: die Kugel startet direkt unter dem verlaufenden Startbild */
#ueber-mich {
  margin-top: -1px;
}

/* Weiche Übergänge: jeder Abschnitt blendet beim Hereinscrollen aus dem Dunkel auf,
   der Trenner zeichnet seine Goldlinie (nur wo der Browser scrollgesteuerte Animationen kann) */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .mobile-journey__section:not(#start) > .mobile-journey__body {
      animation: section-in linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 55%;
    }

    .mobile-journey__line {
      transform-origin: right;
      animation: line-draw linear both;
      animation-timeline: view();
      animation-range: entry 10% cover 30%;

      &:last-child {
        transform-origin: left;
      }
    }
  }
}

/* nur Deckkraft: ein transform würde den fest stehenden Wald und die Kugel aus der Bahn werfen */
@keyframes section-in {
  from {
    opacity: 0.1;
  }

  to {
    opacity: 1;
  }
}

@keyframes line-draw {
  from {
    scale: 0 1;
  }

  to {
    scale: 1 1;
  }
}

/* Footer gibt es nur einmal ganz unten – nicht am Ende einzelner Abschnitte */
.mobile-journey__section :deep(.site-footer) {
  display: none;
}

/* Nebelbank zwischen zwei Abschnitten: großzügiger Abstand, in der Mitte am dichtesten */
.mobile-journey__fog {
  --fog: 205 214 196;
  position: relative;
  z-index: 0; // hinter den Inhalten der Nachbarabschnitte
  display: grid;
  place-items: center;
  height: 44svh;
  pointer-events: none;

  /* der Nebel quillt weit über die Bank hinaus in beide Abschnitte */
  &::before {
    content: '';
    position: absolute;
    inset: -26svh 0;
    background: linear-gradient(
      180deg,
      transparent,
      rgb(var(--fog) / 5%) 22%,
      rgb(var(--fog) / 12%) 42%,
      rgb(var(--fog) / 14%) 50%,
      rgb(var(--fog) / 12%) 58%,
      rgb(var(--fog) / 5%) 78%,
      transparent
    );
  }
}

/* heller Modus: helles Grau und zarter, damit die Hintergründe erkennbar bleiben */
:root[data-theme='light'] .mobile-journey__fog {
  --fog: 186 193 202;
  opacity: 0.6;
}

/* treibende Schwaden in der Nebelbank */
.mobile-journey__mist {
  position: absolute;
  inset: -40% -50%;
  background:
    radial-gradient(ellipse 30% 26% at 30% 45%, rgb(var(--fog) / 18%), transparent 70%),
    radial-gradient(ellipse 26% 22% at 70% 58%, rgb(var(--fog) / 15%), transparent 70%),
    radial-gradient(ellipse 22% 18% at 52% 30%, rgb(var(--fog) / 12%), transparent 70%);
  filter: blur(6px);
  animation: mist-drift 26s ease-in-out infinite alternate;
}

@keyframes mist-drift {
  from {
    transform: translate3d(-8%, 0, 0);
  }

  to {
    transform: translate3d(8%, -4%, 0);
  }
}

/* Kapiteltrenner: Goldlinie mit Raute und dem Namen des nächsten Abschnitts */
.mobile-journey__divider {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 0 24px;
}

/* Nur der fest stehende Waldhintergrund der Leistungen blendet an den Rändern in den Nebel aus.
   Inhalte werden nirgends ausgeblendet – die Leistungen bekommen dafür innen genug Abstand. */
.mobile-journey__body {
  --fade: 110px;
}

.mobile-journey__body.fade-top {
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 var(--fade));
  mask-image: linear-gradient(180deg, transparent, #000 var(--fade));
}

.mobile-journey__body.fade-bottom {
  -webkit-mask-image: linear-gradient(0deg, transparent, #000 var(--fade));
  mask-image: linear-gradient(0deg, transparent, #000 var(--fade));
}

.mobile-journey__body.fade-top.fade-bottom {
  -webkit-mask-image: linear-gradient(
    180deg,
    transparent,
    #000 var(--fade),
    #000 calc(100% - var(--fade)),
    transparent
  );
  mask-image: linear-gradient(
    180deg,
    transparent,
    #000 var(--fade),
    #000 calc(100% - var(--fade)),
    transparent
  );
}

.mobile-journey__line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgb(var(--accent-gold-rgb), 0.55));

  &:last-child {
    background: linear-gradient(90deg, rgb(var(--accent-gold-rgb), 0.55), transparent);
  }
}

.mobile-journey__label {
  position: relative;
  padding: 0 14px;
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--accent-gold);

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 5px;
    height: 5px;
    background: var(--accent-gold);
    rotate: 45deg;
    translate: 0 -50%;
  }

  &::before {
    left: 0;
  }

  &::after {
    right: 0;
  }
}

/* Leistungen: der Einstieg braucht keine ganze Bildschirmhöhe Abstand mehr */
#leistungen :deep(.services__hero) {
  min-height: 0;
}

/* Buch und Brief: Abstand, damit sie erst nach dem Nebelrand beginnen */
#projekte :deep(.projects-room.is-embedded) {
  padding-top: 24px;
}

/* Kontakt: Brief passt samt Siegel auf einen Bildschirm unter der Kopfleiste */
#kontakt :deep(.contact-room.is-embedded) {
  height: calc(100svh - var(--site-header-depth) - 12px - 62px);
  min-height: 0;
  padding-top: 16px;
}

#kontakt :deep(.desk) {
  padding-bottom: 14px;
}

#projekte :deep(.projects-room.is-embedded) {
  height: calc(100svh - var(--site-header-depth) + 24px);
}

/* Projekte: die Bibliothek im Hintergrund taucht weich aus dem Nebel auf, statt mit harter
   Kante darüber zu liegen – oben und unten ausgeblendet und etwas durchscheinend */
#projekte :deep(.shelf.is-strip) {
  height: 300px;
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 38%, #000 68%, transparent);
  mask-image: linear-gradient(180deg, transparent, #000 38%, #000 68%, transparent);
}

/* Leistungen: Einstieg und Ende außerhalb der ausblendenden Waldränder */
#leistungen :deep(.services__hero) {
  padding-top: 130px;
}

#leistungen :deep(.services.is-embedded) {
  padding-bottom: 130px;
}

@media (prefers-reduced-motion: reduce) {
  .mobile-journey__mist {
    animation: none;
  }
}

/* Buch: senkrechtes Wischen scrollt die Seite, waagerecht wird geblättert */
#projekte :deep(.book),
#projekte :deep(.book.is-closed) {
  touch-action: pan-y;
}
</style>

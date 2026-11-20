<script setup lang="ts">
import { nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import SiteFooter from '@/layout/SiteFooter.vue';
import { siteOwner } from '@/shared/data/siteOwner';
import WaxSeal from './components/WaxSeal.vue';
import EagleCourier from './components/EagleCourier.vue';

// embedded: als Abschnitt der Handy-Scrollseite – ohne eigenen Scrollbereich und Footer
defineProps<{ embedded?: boolean }>();

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

// Auf der Handy-Scrollseite bleibt das Formular bestehen: ein späterer Link mit ?anliegen=…
// (z. B. „Jetzt anfragen“ bei den Leistungen) wählt das Anliegen trotzdem vor.
watch(
  () => route.query.anliegen,
  (value) => {
    const topic = String(value ?? '');
    if (topics.some((t) => t.value === topic)) form.topic = topic;
  },
);

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

// --- Altes Papier: unregelmäßiger Rand mit ein paar kleinen Einrissen -----------------
const tornEdge = (() => {
  // deterministisches Rauschen, damit der Rand bei jedem Laden gleich aussieht
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const points: string[] = [];
  const steps = 46;
  // Einrisse: Seite (0 oben, 1 rechts, 2 unten, 3 links), Position, Tiefe in %
  const tears = [
    [0, 0.31, 2.6],
    [1, 0.62, 2.2],
    [2, 0.18, 2.4],
    [2, 0.77, 1.6],
    [3, 0.44, 1.8],
  ];
  const tearAt = (side: number, t: number) => {
    let depth = 0;
    for (const [s, pos, d] of tears) {
      if (s !== side) continue;
      const dist = Math.abs(t - pos!) * steps;
      if (dist < 1.6) depth = Math.max(depth, d! * (1 - dist / 1.6));
    }
    return depth;
  };
  let prev = 0.6;
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      // geglättetes Rauschen: weich gewellt statt Sägezahn, dazu die Einrisse
      prev = prev * 0.55 + (0.45 + rnd() * 0.4) * 0.45;
      const jag = prev + tearAt(side, t);
      const along = (t * 100).toFixed(2);
      const x = side === 0 ? along : side === 1 ? 100 - jag : side === 2 ? 100 - +along : jag;
      const y = side === 0 ? jag : side === 1 ? along : side === 2 ? 100 - jag : 100 - +along;
      points.push(`${(+x).toFixed(2)}% ${(+y).toFixed(2)}%`);
    }
  }
  return `polygon(${points.join(', ')})`;
})();

// --- Versand: Brief falten, versiegeln, Adler holt ihn ab ---------------------------
type Phase = 'idle' | 'sending' | 'sent';
const phase = ref<Phase>('idle');
const mailtoLink = ref('');
const announcement = ref('');

const parchment = ref<HTMLElement | null>(null);
const sealButton = ref<HTMLElement | null>(null);
const carry = ref<HTMLElement | null>(null);
const envelope = ref<HTMLElement | null>(null);
const flap = ref<HTMLElement | null>(null);
const envSeal = ref<HTMLElement | null>(null);
const eagle = ref<HTMLElement | null>(null);
const flyingSeal = ref<HTMLElement | null>(null);

// Positionen der fliegenden Teile (Bildschirmkoordinaten, die Ebene liegt fixiert darüber)
// w = Breite des kleinen Briefs, den der Adler trägt; big = Vergrößerung beim Falten und Siegeln
const stage = reactive({ x: 0, y: 0, w: 160, big: 2, sealX: 0, sealY: 0, sealSize: 100 });

const running: Animation[] = [];
function play(el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  if (!el) return Promise.resolve();
  const animation = el.animate(keyframes, { fill: 'forwards', ...options });
  running.push(animation);
  return animation.finished.then(() => undefined).catch(() => undefined);
}
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function finish() {
  phase.value = 'sent';
  announcement.value = 'Dein Brief ist unterwegs. Dein Mail-Programm öffnet sich.';
  window.location.href = mailtoLink.value;
  nextTick(() => {
    play(
      parchment.value,
      [
        { opacity: 0, transform: 'translateY(14px) scale(0.96)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' },
    ).then(() => parchment.value?.getAnimations().forEach((a) => a.cancel()));
  });
}

async function send() {
  if (phase.value !== 'idle') return;
  mailtoLink.value = buildMailtoLink();

  if (prefersReducedMotion() || !parchment.value || !sealButton.value) {
    finish();
    return;
  }

  // Start- und Zielpositionen messen
  const paper = parchment.value.getBoundingClientRect();
  const seal = sealButton.value.querySelector('.wax')!.getBoundingClientRect();
  stage.w = Math.round(Math.min(180, Math.max(110, paper.width * 0.28)));
  stage.big = Math.min(320, Math.max(210, paper.width * 0.66)) / stage.w;
  stage.x = paper.left + paper.width / 2 - stage.w / 2;
  stage.y = paper.top + paper.height / 2 - (stage.w * 0.64) / 2;
  stage.sealX = seal.left;
  stage.sealY = seal.top;
  stage.sealSize = seal.width;

  phase.value = 'sending';
  announcement.value = 'Dein Brief wird versiegelt …';
  await nextTick();

  // 1. Papier faltet sich zusammen, der Umschlag erscheint, die Klappe schließt sich
  play(
    parchment.value,
    [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: 'scale(0.42) rotate(-4deg)' },
    ],
    { duration: 620, easing: 'cubic-bezier(.55,0,.45,1)' },
  );
  await wait(300);
  await play(
    envelope.value,
    [
      { opacity: 0, transform: `scale(${stage.big * 0.7}) rotate(4deg)` },
      { opacity: 1, transform: `scale(${stage.big})` },
    ],
    { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' },
  );
  await play(flap.value, [{ transform: 'scaleY(-1)' }, { transform: 'scaleY(1)' }], {
    duration: 420,
    easing: 'cubic-bezier(.5,0,.3,1)',
  });

  // 2. Das Siegel fliegt auf die Klappe und wird aufgedrückt
  const target = envSeal.value!.getBoundingClientRect();
  const dx = target.left - stage.sealX;
  const dy = target.top - stage.sealY;
  const s = target.width / stage.sealSize;
  await play(
    flyingSeal.value,
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
      {
        transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 70}px) scale(${1.15}) rotate(-12deg)`,
        offset: 0.5,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(${s * 1.35}) rotate(-4deg)`, offset: 0.8 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s * 0.9}) rotate(0deg)`, offset: 0.92 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(0deg)` },
    ],
    { duration: 820, easing: 'cubic-bezier(.45,0,.3,1)' },
  );
  envSeal.value!.style.opacity = '1';
  flyingSeal.value!.style.visibility = 'hidden';
  play(
    envelope.value,
    [
      { transform: `scale(${stage.big})` },
      { transform: `translateY(3px) scale(${stage.big * 0.985}, ${stage.big * 0.97})` },
      { transform: `translateY(-1px) scale(${stage.big})` },
      { transform: `scale(${stage.big})` },
    ],
    { duration: 280, easing: 'ease-out' },
  );
  announcement.value = 'Versiegelt – ein Adler holt deinen Brief ab.';
  await wait(320);

  // Brief schrumpft auf Tragegröße, das Siegel schrumpft mit
  await play(
    envelope.value,
    // schrumpft und neigt sich schon passend zur schrägen Flugbahn des Adlers
    [{ transform: `scale(${stage.big})` }, { transform: 'scale(1) rotate(-6deg)' }],
    { duration: 520, easing: 'cubic-bezier(.65,0,.35,1)' },
  );

  // 3. Der Adler fliegt von hinter dem Betrachter ins Bild (von hinten gesehen, riesig nah),
  //    wird kleiner, greift den Brief und fliegt mit ihm weiter in die Ferne
  // kommt schräg von rechts unten, Kopf voraus nach links oben geneigt
  await play(
    eagle.value,
    [
      { transform: 'translate(34vw, 72vh) scale(4.2) rotate(-24deg)', opacity: 0, offset: 0 },
      { opacity: 1, offset: 0.1 },
      { transform: 'translate(12vw, 24vh) scale(1.9) rotate(-20deg)', offset: 0.5 },
      { transform: 'translate(2vw, 4vh) scale(1.15) rotate(-12deg)', offset: 0.82 },
      { transform: 'translate(0, 0) scale(1) rotate(-6deg)', opacity: 1 },
    ],
    { duration: 1400, easing: 'cubic-bezier(.25,.6,.35,1)' },
  );
  await play(
    carry.value,
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'translate(0, 8px) scale(1) rotate(-4deg)', offset: 0.1 },
      { transform: 'translate(-5vw, -7vh) scale(0.74) rotate(-12deg)', offset: 0.35 },
      { transform: 'translate(-14vw, -21vh) scale(0.4) rotate(-16deg)', offset: 0.65 },
      { transform: 'translate(-20vw, -30vh) scale(0.15) rotate(-18deg)', opacity: 1, offset: 0.9 },
      { transform: 'translate(-22vw, -33vh) scale(0.05) rotate(-18deg)', opacity: 0 },
    ],
    { duration: 1900, easing: 'cubic-bezier(.45,0,.55,1)' },
  );

  running.splice(0).forEach((a) => a.cancel());
  finish();
}

function writeAnother() {
  form.message = '';
  phase.value = 'idle';
  announcement.value = '';
  nextTick(() => parchment.value?.querySelector<HTMLElement>('textarea, input')?.focus());
}

onBeforeUnmount(() => running.splice(0).forEach((a) => a.cancel()));
</script>

<template>
  <!-- Ein Raum, genau so hoch wie der Bildschirm: Brief, Siegel und Footer – ohne Scrollen -->
  <component
    :is="embedded ? 'section' : 'main'"
    :class="[embedded ? 'is-embedded' : 'page-content', 'realm-page contact-room']"
  >
    <div class="desk">
      <form class="letter" :class="`is-${phase}`" @submit.prevent="send">
        <div ref="parchment" class="parchment">
          <span class="parchment__paper" :style="{ clipPath: tornEdge }" aria-hidden="true" />
          <template v-if="phase !== 'sent'">
            <header class="parchment__head">
              <p class="parchment__kicker">Kontakt</p>
              <h1 class="parchment__title">Lass uns reden</h1>
              <p class="parchment__lead">
                Du hast ein Projekt im Kopf oder eine Frage? Schreib mir – ich melde mich so schnell
                wie möglich.
              </p>
            </header>

            <fieldset class="parchment__fields" :disabled="phase !== 'idle'">
              <label class="quill">
                <span>Dein Name</span>
                <input v-model="form.name" type="text" name="name" autocomplete="name" />
              </label>

              <label class="quill">
                <span>Deine E-Mail</span>
                <input v-model="form.email" type="email" name="email" autocomplete="email" />
              </label>

              <label class="quill quill--full">
                <span>Worum geht es?</span>
                <select v-model="form.topic" name="topic">
                  <option v-for="topic in topics" :key="topic.value" :value="topic.value">
                    {{ topic.label }}
                  </option>
                </select>
              </label>

              <label class="quill quill--full quill--message">
                <span>Deine Nachricht</span>
                <textarea
                  v-model="form.message"
                  name="message"
                  rows="4"
                  placeholder="Worum geht es, gibt es schon eine Seite, wann soll es losgehen?"
                  required
                ></textarea>
              </label>
            </fieldset>

            <footer class="parchment__foot">
              <p class="parchment__hint">
                Zum Absenden das Siegel drücken <span aria-hidden="true">→</span>
              </p>
              <p class="parchment__direct">
                oder direkt: <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
              </p>
            </footer>
          </template>

          <!-- Nach dem Versand -->
          <div v-else class="parchment__sent">
            <p class="parchment__kicker">Abgeschickt</p>
            <h1 class="parchment__title">Dein Brief ist unterwegs!</h1>
            <p class="parchment__lead">
              Der Adler bringt ihn zu deinem Mail-Programm – dort musst du nur noch auf
              <em>Senden</em> drücken. Ich melde mich so schnell wie möglich.
            </p>
            <p class="parchment__direct">
              Es hat sich nichts geöffnet? <a :href="mailtoLink">Hier noch einmal versuchen</a>
              oder direkt an <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a> schreiben.
            </p>
            <button type="button" class="hand-btn" @click="writeAnother">
              Noch einen Brief schreiben <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <button
          v-show="phase !== 'sent'"
          ref="sealButton"
          type="submit"
          class="seal-btn"
          :class="{ 'is-used': phase === 'sending' }"
          :disabled="phase !== 'idle'"
          aria-label="Brief versiegeln und absenden"
        >
          <WaxSeal />
          <span class="seal-btn__label" aria-hidden="true">versiegeln &amp; absenden</span>
        </button>
      </form>
    </div>

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>

    <SiteFooter v-if="!embedded" />

    <!-- Flugebene: Umschlag, Siegel und Adler fliegen über alles hinweg -->
    <Teleport to="body">
      <div v-if="phase === 'sending'" class="flight" aria-hidden="true">
        <div
          ref="carry"
          class="flight__carry"
          :style="{
            left: `${stage.x}px`,
            top: `${stage.y}px`,
            width: `${stage.w}px`,
            '--w': `${stage.w}px`,
          }"
        >
          <div ref="envelope" class="envelope">
            <svg class="envelope__body" viewBox="0 0 300 192">
              <rect width="300" height="192" rx="5" fill="#e4d4b4" />
              <path d="M0 192 L 150 96 L 300 192 Z" fill="#d9c6a1" />
              <path d="M0 0 L 150 110 L 0 192 Z" fill="#e9dbbd" />
              <path d="M300 0 L 150 110 L 300 192 Z" fill="#e1cfac" />
              <path
                d="M0 192 L 150 96 L 300 192"
                fill="none"
                stroke="rgb(120 85 40 / 25%)"
                stroke-width="1.5"
              />
            </svg>
            <div ref="flap" class="envelope__flap">
              <svg viewBox="0 0 300 120">
                <path d="M0 0 L 300 0 L 150 118 Z" fill="#efe2c6" />
                <path
                  d="M0 0 L 150 118 L 300 0"
                  fill="none"
                  stroke="rgb(120 85 40 / 30%)"
                  stroke-width="1.5"
                />
              </svg>
            </div>
            <div ref="envSeal" class="envelope__seal">
              <WaxSeal />
            </div>
          </div>
          <div ref="eagle" class="flight__eagle">
            <EagleCourier />
          </div>
        </div>

        <div
          ref="flyingSeal"
          class="flight__seal"
          :style="{
            left: `${stage.sealX}px`,
            top: `${stage.sealY}px`,
            width: `${stage.sealSize}px`,
          }"
        >
          <WaxSeal />
        </div>
      </div>
    </Teleport>
  </component>
</template>

<style scoped lang="scss">
.contact-room {
  --ink: #2b1f12;
  --ink-soft: #5e4a2f;
  --ink-faded: rgb(94 74 47 / 45%);
  --ink-quill: #1f2a44; // Eisengallustinte: was man schreibt
  --rubric: #8e2f17;
  --tex-paper: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .42 0 0 0 0 .3 0 0 0 0 .16 1.1 0 0 0 -.38'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E");

  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 100%;
  overflow: hidden auto;
  padding-top: var(--site-header-depth);
}

/* als Abschnitt der Handy-Scrollseite: eine Bildschirmhöhe, gescrollt wird außen */
.contact-room.is-embedded {
  min-height: 100svh;
  grid-template-rows: minmax(0, 1fr);
  overflow: visible;
}

.contact-room :deep(.site-footer) {
  margin-top: 0;
}

.desk {
  display: grid;
  place-items: center;
  min-height: 0;
  padding: 8px 16px 20px;

  @media (width <= 700px) {
    padding: 4px 16px 16px;
  }
}

/* ---------------- Brief + Siegel ---------------- */
.letter {
  display: flex;
  align-items: center;
  gap: clamp(18px, 3vw, 40px);
  width: min(900px, 100%);
  height: 100%;
  max-height: 720px;
  margin: 0;
}

.parchment {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-self: stretch;
  min-width: 0;
  padding: clamp(20px, 3.4vw, 40px) clamp(20px, 4vw, 48px);
  font-family: var(--font-body);
  font-size: 1.05rem;
  color: var(--ink);
  filter: drop-shadow(0 18px 26px rgb(0 0 0 / 45%)) drop-shadow(0 2px 2px rgb(0 0 0 / 30%));
  transform-origin: 50% 55%;

  > * {
    position: relative;
    z-index: 1;
  }
}

.parchment__kicker {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--rubric);
}

.parchment__title {
  margin: 0.1em 0 0.2em;
  font-family: var(--font-accent);
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  font-weight: normal;
  line-height: 1.05;
  color: var(--ink);
}

.parchment__lead {
  margin: 0 0 0.8em;
  max-width: 46ch;
  font-style: italic;
  line-height: 1.35;
  color: var(--ink-soft);
}

.parchment__fields {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 0.7em 1.4em;
  min-height: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

/* Felder: Beschriftung in Kapitälchen, geschrieben wird mit Tinte in Handschrift */
.quill {
  display: grid;
  align-content: start;
  gap: 0.1em;
  min-width: 0;

  span {
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  input,
  select,
  textarea {
    width: 100%;
    min-width: 0;
    padding: 0.1em 0.1em 0.15em;
    border: 0;
    border-bottom: 1.5px solid var(--ink-faded);
    border-radius: 0;
    font-family: var(--font-hand);
    font-size: 1.45rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--ink-quill);
    background: transparent;
    transition: border-color 160ms ease-out;

    &:focus {
      outline: none;
      border-bottom-color: var(--rubric);
    }

    &::placeholder {
      color: rgb(94 74 47 / 50%);
      font-size: 1.2rem;
    }
  }

  select {
    appearance: none;
    padding-right: 1.4em;
    cursor: pointer;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%238e2f17' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E")
      right 0.2em center / 0.8em no-repeat;

    option {
      font-family: var(--font-body);
      font-size: 1rem;
      color: #2b1f12;
      background: #f3ead7;
    }
  }
}

.quill--full {
  grid-column: 1 / -1;
}

/* Nachricht: liniertes Papier, wächst mit dem freien Platz */
.quill--message {
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;

  textarea {
    --line: 1.9rem;
    height: 100%;
    min-height: calc(var(--line) * 3);
    border-bottom: 0;
    line-height: var(--line);
    resize: none;
    background: repeating-linear-gradient(
      180deg,
      transparent 0 calc(var(--line) - 1.5px),
      var(--ink-faded) calc(var(--line) - 1.5px) var(--line)
    );
    background-attachment: local;
  }
}

.parchment__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.3em 1em;
  margin-top: 0.7em;
}

.parchment__hint {
  margin: 0;
  font-family: var(--font-hand);
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--rubric);
  rotate: -1.5deg;
}

.parchment__direct {
  margin: 0;
  font-size: 0.9rem;
  font-style: italic;
  color: var(--ink-soft);

  a {
    color: var(--rubric);
    text-underline-offset: 3px;
    overflow-wrap: anywhere;
  }
}

.parchment__sent {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.4em;
  flex: 1;
  max-width: 34rem;
  margin-inline: auto;
  text-align: center;

  .parchment__direct {
    margin-bottom: 0.8em;
  }
}

.hand-btn {
  min-height: 44px;
  padding: 0.2em 0.4em;
  border: 0;
  border-bottom: 2px solid currentColor;
  font-family: var(--font-hand);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--rubric);
  background: none;
  cursor: pointer;
  rotate: -1.5deg;

  &:focus-visible {
    outline: 2px dashed var(--rubric);
    outline-offset: 4px;
  }
}

/* Das Papier selbst: Verläufe, Fasern, Stockflecken, gebräunte Ränder – mit gerissenem Rand */
.parchment__paper {
  position: absolute !important;
  inset: 0;
  z-index: 0 !important;
  background:
    radial-gradient(ellipse at 18% 10%, rgb(255 255 255 / 38%), transparent 45%),
    radial-gradient(circle at 85% 90%, rgb(150 105 50 / 16%), transparent 32%),
    radial-gradient(circle at 10% 80%, rgb(150 105 50 / 10%), transparent 24%),
    linear-gradient(180deg, var(--paper-1), var(--paper-2) 70%, var(--paper-3));

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 78% 12%, rgb(140 90 40 / 11%), transparent 3%),
      radial-gradient(circle at 16% 62%, rgb(140 90 40 / 8%), transparent 2.6%),
      radial-gradient(circle at 62% 86%, rgb(140 90 40 / 9%), transparent 4%),
      radial-gradient(circle at 92% 40%, rgb(140 90 40 / 7%), transparent 5%),
      var(--tex-paper);
    background-size: auto, auto, auto, auto, 320px;
    mix-blend-mode: multiply;
    opacity: 0.6;
  }

  /* zum Rand hin gebräunt, wie oft angefasst */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    box-shadow:
      inset 0 0 60px rgb(120 75 30 / 34%),
      inset 0 0 14px rgb(110 65 25 / 38%),
      inset 0 0 3px rgb(90 50 15 / 45%);
  }
}

/* ---------------- Siegel als Knopf ---------------- */
.seal-btn {
  flex: none;
  display: grid;
  justify-items: center;
  gap: 10px;
  width: clamp(110px, 13vw, 150px);
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  .wax {
    rotate: -10deg;
    filter: drop-shadow(0 6px 8px rgb(0 0 0 / 45%));
    transition:
      translate 180ms ease-out,
      scale 120ms ease-out,
      filter 180ms ease-out;
  }

  &:hover:not(:disabled) .wax {
    translate: 0 -3px;
    filter: drop-shadow(0 10px 12px rgb(0 0 0 / 45%)) drop-shadow(0 0 14px rgb(255 160 90 / 25%));
  }

  &:active:not(:disabled) .wax {
    scale: 0.94;
  }

  &:focus-visible {
    outline: none;

    .wax {
      outline: 2px dashed var(--accent-gold);
      outline-offset: 6px;
      border-radius: 50%;
    }
  }

  &.is-used {
    visibility: hidden;
  }
}

.seal-btn__label {
  font-family: var(--font-hand);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.1;
  text-align: center;
  color: var(--accent-gold);
  rotate: -3deg;
}

/* ---------------- Flugebene ---------------- */
.flight {
  position: fixed;
  inset: 0;
  z-index: 300;
  overflow: hidden;
  pointer-events: none;
}

.flight__carry {
  position: absolute;
  aspect-ratio: 300 / 192;
  transform-origin: 50% 0;
}

.envelope {
  position: absolute;
  inset: 0;
  opacity: 0;
  filter: drop-shadow(0 14px 20px rgb(0 0 0 / 45%));
}

.envelope__body {
  display: block;
  width: 100%;
  height: 100%;
}

.envelope__flap {
  position: absolute;
  inset: 0 0 auto;
  height: 62.5%;
  transform-origin: 50% 0;
  transform: scaleY(-1);
  filter: drop-shadow(0 2px 2px rgb(80 50 20 / 25%));

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
}

.envelope__seal {
  position: absolute;
  left: 40%;
  top: 45%;
  width: 20%;
  opacity: 0;
}

/* Adler von hinten: Spannweite gut dreimal so breit wie der Brief. Die Fänge
   (200|262 im viewBox 400×300) greifen die obere Kante des Umschlags */
.flight__eagle {
  --e: calc(var(--w) * 3.8);
  position: absolute;
  width: var(--e);
  left: calc(var(--w) / 2 - var(--e) / 2);
  top: calc(var(--w) * 0.05 - var(--e) * 262 / 400);
  // Vergrößern und Verkleinern um die Fänge, damit der Griff am Brief sitzt
  transform-origin: 50% 87.3%;
  transform: translate(34vw, 72vh) scale(4.2) rotate(-24deg);
  opacity: 0;
}

.flight__seal {
  position: absolute;
  transform-origin: 0 0;
}

/* ---------------- Handy ---------------- */
@media (width <= 700px) {
  .letter {
    position: relative;
    max-height: none;
  }

  .parchment {
    padding: 20px 18px 18px;
  }

  .parchment__lead {
    font-size: 0.95rem;
  }

  .parchment__fields {
    gap: 0.5em 1em;
  }

  .parchment__hint {
    white-space: nowrap;
  }

  .parchment__direct {
    padding-right: 72px; // Platz für das Siegel in der Ecke
  }

  .parchment__hint span {
    display: inline-block;
    rotate: 45deg;
  }

  /* Siegel sitzt unten rechts auf der Ecke des Briefs */
  .seal-btn {
    position: absolute;
    right: -4px;
    bottom: -10px;
    z-index: 2;
    width: 82px;
  }

  .seal-btn__label {
    display: none;
  }
}

/* niedrige Handys: alles etwas dichter, damit Brief und Footer auf einen Bildschirm passen */
@media (width <= 700px) and (height <= 700px) {
  .parchment {
    padding: 16px 16px 14px;
  }

  .parchment__title {
    font-size: 1.7rem;
  }

  .parchment__lead {
    margin-bottom: 0.5em;
    font-size: 0.9rem;
    line-height: 1.25;
  }

  .quill input,
  .quill select,
  .quill textarea {
    font-size: 1.3rem;
  }

  .quill--message textarea {
    --line: 1.7rem;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
</style>

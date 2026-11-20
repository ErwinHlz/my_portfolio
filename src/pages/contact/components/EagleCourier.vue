<script setup lang="ts">
// Brauner Adler (Steinadler-Färbung) von hinten: Kopf ins Bild, Schwanz zum Betrachter –
// so, als fliege er vom Betrachter weg. Aus Ebenen in einer 3D-Bühne gebaut.
// Die Fänge greifen bei (200, 262) im viewBox 400×300 – dort hängt der Brief.

type Pt = [number, number];

/** spitz zulaufende Feder von base in Richtung angle (Grad, 0 = rechts, 90 = unten) */
function feather(base: Pt, angle: number, length: number, width: number) {
  const a = (angle * Math.PI) / 180;
  const d: Pt = [Math.cos(a), Math.sin(a)];
  const n: Pt = [-d[1], d[0]];
  const p = (t: number, s: number): string =>
    `${(base[0] + d[0] * length * t + n[0] * width * s).toFixed(1)},${(base[1] + d[1] * length * t + n[1] * width * s).toFixed(1)}`;
  return `M${p(0, -0.45)} Q${p(0.55, -0.62)} ${p(0.95, -0.22)} Q${p(1.02, 0)} ${p(0.95, 0.24)} Q${p(0.55, 0.6)} ${p(0, 0.45)}Z`;
}

function quill(base: Pt, angle: number, length: number) {
  const a = (angle * Math.PI) / 180;
  return `M${base[0]},${base[1]} L${(base[0] + Math.cos(a) * length * 0.88).toFixed(1)},${(base[1] + Math.sin(a) * length * 0.88).toFixed(1)}`;
}

interface Feather {
  d: string;
  q: string;
  /** dunkle Querbinden über die Fahne */
  bars?: string;
}

/** kurze Querlinien über eine Feder bei den Anteilen ts ihrer Länge */
function bars(base: Pt, angle: number, length: number, width: number, ts: number[]) {
  const a = (angle * Math.PI) / 180;
  const d: Pt = [Math.cos(a), Math.sin(a)];
  const n: Pt = [-d[1], d[0]];
  return ts
    .map((t) => {
      const w = width * 0.5 * (1 - t * 0.35);
      const cx = base[0] + d[0] * length * t;
      const cy = base[1] + d[1] * length * t;
      return `M${(cx - n[0] * w).toFixed(1)},${(cy - n[1] * w).toFixed(1)} Q${(cx + d[0] * 2).toFixed(1)},${(cy + d[1] * 2).toFixed(1)} ${(cx + n[0] * w).toFixed(1)},${(cy + n[1] * w).toFixed(1)}`;
    })
    .join(' ');
}

// Rechter Flügel (der linke ist gespiegelt): Schulter → Handgelenk nach außen oben
const shoulder: Pt = [216, 120];
const wrist: Pt = [298, 92];

// Handschwingen: am Handgelenk nach außen gefächert, Spitzen gespreizt wie Finger
const primaries: Feather[] = Array.from({ length: 8 }, (_, i) => {
  const angle = -30 + i * 9.5;
  const length = 112 - Math.abs(i - 2.5) * 6;
  const base: Pt = [wrist[0] - i * 2, wrist[1] + i * 5];
  return {
    d: feather(base, angle, length, 15),
    q: quill(base, angle, length),
    bars: bars(base, angle, length, 15, [0.2, 0.32, 0.44]),
  };
}).reverse();

// Armschwingen: entlang des Arms, nach unten hinten
const secondaries: Feather[] = Array.from({ length: 9 }, (_, i) => {
  const t = i / 8;
  const base: Pt = [
    shoulder[0] + (wrist[0] - shoulder[0]) * t + 2,
    shoulder[1] + (wrist[1] - shoulder[1]) * t + 14,
  ];
  const angle = 96 - t * 34;
  const length = 66 - t * 6;
  return {
    d: feather(base, angle, length, 19),
    q: quill(base, angle, length),
    bars: bars(base, angle, length, 19, [0.3, 0.5]),
  };
});

// Schwanz: zum Betrachter hin aufgefächert
const tail: Feather[] = Array.from({ length: 11 }, (_, i) => {
  const k = i - 5;
  const base: Pt = [200 + k * 3.5, 184];
  const angle = 90 + k * 10;
  const length = 74 - Math.abs(k) * 2;
  return { d: feather(base, angle, length, 26), q: quill(base, angle, length) };
});

// Rückengefieder: kleine Federn in versetzten Reihen, von oben nach unten überlappend
const backFeathers: Feather[] = [];
for (let row = 0; row < 11; row++) {
  const y = 92 + row * 9.5;
  // Körperbreite auf dieser Höhe (grob der Umriss)
  const half = Math.min(38, 18 + row * 5) - Math.max(0, row - 7) * 7;
  const count = Math.max(2, Math.round((half * 2) / 11));
  for (let c = 0; c < count; c++) {
    const x = 200 - half + 5 + ((half * 2 - 10) / Math.max(1, count - 1)) * c + (row % 2 ? 3 : -3);
    const angle = 90 + (x - 200) * 0.5;
    backFeathers.push({ d: feather([x, y], angle, 17, 12), q: quill([x, y], angle, 17) });
  }
}

// Schulterfedern: große Federn über den Flügelansätzen, links und rechts
const scapulars: Feather[] = [];
for (let i = 0; i < 5; i++) {
  for (const sideSign of [-1, 1]) {
    const base: Pt = [200 + sideSign * (16 + i * 2), 104 + i * 11];
    const angle = 90 + sideSign * (-38 + i * 6);
    scapulars.push({
      d: feather(base, angle, 34, 15),
      q: quill(base, angle, 34),
    });
  }
}
</script>

<template>
  <!-- Der Adler ist aus Ebenen im Raum gebaut: Flügel, Schwanz, Rücken und Kopf liegen
       in einer gekippten 3D-Bühne. Die Flügel schlagen echt in die Tiefe. Beine und Fänge
       bleiben flach in der Bildebene, damit sie den Brief sauber greifen. -->
  <div class="eagle" aria-hidden="true">
    <svg class="eagle__defs" width="0" height="0" focusable="false">
      <defs>
      <linearGradient id="eg-feather" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#4a2e17" />
        <stop offset="60%" stop-color="#2c1a0c" />
        <stop offset="100%" stop-color="#140c06" />
      </linearGradient>
      <linearGradient id="eg-secondary" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4f3219" />
        <stop offset="100%" stop-color="#1c1108" />
      </linearGradient>
      <!-- Oberflügeldecken: beim Steinadler hell gelbbraun -->
      <linearGradient id="eg-covert" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#7a5129" />
        <stop offset="45%" stop-color="#b08048" />
        <stop offset="100%" stop-color="#6a4421" />
      </linearGradient>
      <radialGradient id="eg-back" cx="50%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#6d4523" />
        <stop offset="60%" stop-color="#462a15" />
        <stop offset="100%" stop-color="#26160b" />
      </radialGradient>
      <!-- Hinterkopf als Kugel: Licht rechts oben, zu den Rändern dunkler -->
      <radialGradient id="eg-nape" cx="58%" cy="40%" r="62%">
        <stop offset="0%" stop-color="#c99248" />
        <stop offset="45%" stop-color="#9a6a2e" />
        <stop offset="85%" stop-color="#5e3b19" />
        <stop offset="100%" stop-color="#3a2310" />
      </radialGradient>
      <!-- Schwanz: braun mit grauen Querbinden, dunkle Endbinde -->
      <linearGradient id="eg-tail" x1="0" y1="184" x2="0" y2="258" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#3a2412" />
        <stop offset="18%" stop-color="#5b3c22" />
        <stop offset="22%" stop-color="#857260" />
        <stop offset="30%" stop-color="#4a2f18" />
        <stop offset="44%" stop-color="#5b3c22" />
        <stop offset="48%" stop-color="#857260" />
        <stop offset="56%" stop-color="#4a2f18" />
        <stop offset="68%" stop-color="#5b3c22" />
        <stop offset="72%" stop-color="#857260" />
        <stop offset="80%" stop-color="#26160a" />
        <stop offset="100%" stop-color="#160d06" />
      </linearGradient>
      <linearGradient id="eg-small" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a2310" />
        <stop offset="70%" stop-color="#6a4322" />
        <stop offset="100%" stop-color="#a0723c" />
      </linearGradient>
      <linearGradient id="eg-scapular" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3b2411" />
        <stop offset="75%" stop-color="#6c4524" />
        <stop offset="100%" stop-color="#b08048" />
      </linearGradient>
      <!-- Licht von rechts oben, Schatten links unten: gibt dem Körper Volumen -->
      <radialGradient id="eg-light" cx="68%" cy="22%" r="80%">
        <stop offset="0%" stop-color="#ffd89a" stop-opacity="0.35" />
        <stop offset="45%" stop-color="#ffd89a" stop-opacity="0" />
        <stop offset="80%" stop-color="#000" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#000" stop-opacity="0.45" />
      </radialGradient>
      <radialGradient id="eg-ridge" cx="55%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#d9a866" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#d9a866" stop-opacity="0" />
      </radialGradient>
      <clipPath id="eg-back-clip">
        <path
          d="M200 84 C 230 86, 244 120, 238 158 C 232 184, 216 198, 200 200 C 184 198, 168 184, 162 158 C 156 120, 170 86, 200 84 Z"
        />
      </clipPath>
    </defs>
    </svg>

    <svg class="layer layer--feet" viewBox="0 0 400 300">
      <path d="M176 186 C 170 210, 172 236, 180 250 L 192 250 C 194 232, 192 208, 188 192 Z" fill="#4a2c15" />
      <path d="M224 186 C 230 210, 228 236, 220 250 L 208 250 C 206 232, 208 208, 212 192 Z" fill="#4a2c15" />
      <!-- Beine und Fänge: greifen die obere Briefkante -->
      <g v-for="x in [186, 214]" :key="x" :transform="`translate(${x} 250)`">
        <ellipse cx="0" cy="22" rx="13" ry="3.5" fill="rgb(60 35 10 / 25%)" />
        <path
          d="M0 0 C -4 6, -9 10, -11 18 M0 0 C -1 7, -2 13, -2 20 M0 0 C 3 7, 6 12, 8 18"
          fill="none"
          stroke="#e7b43a"
          stroke-width="4.6"
          stroke-linecap="round"
        />
        <path
          d="M-11 18 c -2 3, -1 6, 2 7 M-2 20 c -2 3, -1 6, 2 7 M8 18 c 2 3, 1 6, -2 7"
          fill="none"
          stroke="#16100a"
          stroke-width="2.6"
          stroke-linecap="round"
        />
      </g>
    </svg>

    <!-- Zwei deckungsgleiche Bühnen: hinten die Flügel, davor Körper, Schwanz und Kopf.
         So liegen die Flügel immer hinter dem Körper und schneiden ihn nie. -->
    <div class="rig rig--wings">
      <svg class="layer layer--wing layer--wing-left" viewBox="0 0 400 300">
        <g transform="translate(400 0) scale(-1 1)">
          <path v-for="(f, i) in primaries" :key="`p${i}`" :d="f.d" fill="url(#eg-feather)" stroke="#0d0703" stroke-width="0.8" />
          <path v-for="(f, i) in primaries" :key="`pq${i}`" :d="f.q" stroke="#9a7650" stroke-width="1" opacity="0.6" />
          <path v-for="(f, i) in primaries" :key="`pb${i}`" :d="f.bars" fill="none" stroke="#8a7560" stroke-width="2" opacity="0.4" />
          <path v-for="(f, i) in primaries" :key="`pe${i}`" :d="f.d" fill="none" stroke="#6b4a2a" stroke-width="0.7" opacity="0.5" transform="translate(-0.8 -0.8)" />
          <path v-for="(f, i) in secondaries" :key="`s${i}`" :d="f.d" fill="url(#eg-secondary)" stroke="#0d0703" stroke-width="0.8" />
          <path v-for="(f, i) in secondaries" :key="`sq${i}`" :d="f.q" stroke="#7b5a3a" stroke-width="0.8" opacity="0.45" />
          <path v-for="(f, i) in secondaries" :key="`sb${i}`" :d="f.bars" fill="none" stroke="#100904" stroke-width="2.2" opacity="0.45" />
          <!-- mittlere Deckfedern: dunklere Reihe zwischen Schwingen und hellem Band -->
          <path
            d="M210 124 C 236 112, 266 100, 300 94 C 306 96, 306 104, 298 108 C 276 120, 248 134, 220 144 C 210 146, 204 132, 210 124 Z"
            fill="#4a2e16"
          />
          <path
            d="M222 140 q8 -1 12 -8 M236 134 q8 -1 12 -8 M250 127 q8 -1 12 -8 M264 120 q8 -1 12 -8 M278 113 q8 -1 12 -7"
            fill="none"
            stroke="#8a6238"
            stroke-width="1.3"
            stroke-linecap="round"
            opacity="0.8"
          />
          <!-- Deckfedern auf dem Arm -->
          <path
            d="M206 112 C 230 98, 262 86, 296 82 C 306 82, 310 92, 302 100 C 284 112, 256 128, 222 138 C 210 140, 202 126, 206 112 Z"
            fill="url(#eg-covert)"
          />
          <path
            d="M220 126 q12 2 22 -6 M236 118 q12 2 22 -6 M252 110 q12 1 22 -6 M268 102 q10 1 20 -5 M228 110 q10 0 18 -6 M246 102 q10 0 18 -6"
            fill="none"
            stroke="#4a2e15"
            stroke-width="1.5"
            stroke-linecap="round"
            opacity="0.7"
          />
          <!-- helle Vorderkante des Flügels -->
          <path
            d="M206 112 C 230 98, 262 86, 296 82"
            fill="none"
            stroke="#e2b46c"
            stroke-width="2.2"
            stroke-linecap="round"
            opacity="0.75"
          />
</g>
      </svg>
      <svg class="layer layer--wing layer--wing-right" viewBox="0 0 400 300">
        <g>
          <path v-for="(f, i) in primaries" :key="`p${i}`" :d="f.d" fill="url(#eg-feather)" stroke="#0d0703" stroke-width="0.8" />
          <path v-for="(f, i) in primaries" :key="`pq${i}`" :d="f.q" stroke="#9a7650" stroke-width="1" opacity="0.6" />
          <path v-for="(f, i) in primaries" :key="`pb${i}`" :d="f.bars" fill="none" stroke="#8a7560" stroke-width="2" opacity="0.4" />
          <path v-for="(f, i) in primaries" :key="`pe${i}`" :d="f.d" fill="none" stroke="#6b4a2a" stroke-width="0.7" opacity="0.5" transform="translate(-0.8 -0.8)" />
          <path v-for="(f, i) in secondaries" :key="`s${i}`" :d="f.d" fill="url(#eg-secondary)" stroke="#0d0703" stroke-width="0.8" />
          <path v-for="(f, i) in secondaries" :key="`sq${i}`" :d="f.q" stroke="#7b5a3a" stroke-width="0.8" opacity="0.45" />
          <path v-for="(f, i) in secondaries" :key="`sb${i}`" :d="f.bars" fill="none" stroke="#100904" stroke-width="2.2" opacity="0.45" />
          <!-- mittlere Deckfedern: dunklere Reihe zwischen Schwingen und hellem Band -->
          <path
            d="M210 124 C 236 112, 266 100, 300 94 C 306 96, 306 104, 298 108 C 276 120, 248 134, 220 144 C 210 146, 204 132, 210 124 Z"
            fill="#4a2e16"
          />
          <path
            d="M222 140 q8 -1 12 -8 M236 134 q8 -1 12 -8 M250 127 q8 -1 12 -8 M264 120 q8 -1 12 -8 M278 113 q8 -1 12 -7"
            fill="none"
            stroke="#8a6238"
            stroke-width="1.3"
            stroke-linecap="round"
            opacity="0.8"
          />
          <!-- Deckfedern auf dem Arm -->
          <path
            d="M206 112 C 230 98, 262 86, 296 82 C 306 82, 310 92, 302 100 C 284 112, 256 128, 222 138 C 210 140, 202 126, 206 112 Z"
            fill="url(#eg-covert)"
          />
          <path
            d="M220 126 q12 2 22 -6 M236 118 q12 2 22 -6 M252 110 q12 1 22 -6 M268 102 q10 1 20 -5 M228 110 q10 0 18 -6 M246 102 q10 0 18 -6"
            fill="none"
            stroke="#4a2e15"
            stroke-width="1.5"
            stroke-linecap="round"
            opacity="0.7"
          />
          <!-- helle Vorderkante des Flügels -->
          <path
            d="M206 112 C 230 98, 262 86, 296 82"
            fill="none"
            stroke="#e2b46c"
            stroke-width="2.2"
            stroke-linecap="round"
            opacity="0.75"
          />
</g>
      </svg>
    </div>

    <div class="rig rig--body">
      <svg class="layer layer--tail" viewBox="0 0 400 300">
        <path v-for="(f, i) in tail" :key="`t${i}`" :d="f.d" fill="url(#eg-tail)" stroke="#1d1108" stroke-width="0.7" />
      <path v-for="(f, i) in tail" :key="`tq${i}`" :d="f.q" stroke="#8c7357" stroke-width="0.7" opacity="0.5" />
      </svg>
      <svg class="layer body-slice--base" viewBox="0 0 400 300">
        <path d="M200 84 C 230 86, 244 120, 238 158 C 232 184, 216 198, 200 200 C 184 198, 168 184, 162 158 C 156 120, 170 86, 200 84 Z" fill="#120a04" />
      </svg>
      <svg class="layer layer--body" viewBox="0 0 400 300">
        <path
        d="M200 84 C 230 86, 244 120, 238 158 C 232 184, 216 198, 200 200 C 184 198, 168 184, 162 158 C 156 120, 170 86, 200 84 Z"
        fill="url(#eg-back)"
      />
      <g clip-path="url(#eg-back-clip)">
        <path
          v-for="(f, i) in backFeathers"
          :key="`bf${i}`"
          :d="f.d"
          fill="url(#eg-small)"
          stroke="#1c1007"
          stroke-width="0.6"
        />
        <path v-for="(f, i) in backFeathers" :key="`bq${i}`" :d="f.q" stroke="#2a180b" stroke-width="0.6" opacity="0.6" />
      </g>
      <!-- Schulterfedern über den Flügelansätzen -->
      <path
        v-for="(f, i) in scapulars"
        :key="`sp${i}`"
        :d="f.d"
        fill="url(#eg-scapular)"
        stroke="#1c1007"
        stroke-width="0.7"
      />
      <path v-for="(f, i) in scapulars" :key="`spq${i}`" :d="f.q" stroke="#2a180b" stroke-width="0.7" opacity="0.55" />
      <!-- Licht und Schatten über dem ganzen Rücken -->
      <path
        d="M200 84 C 230 86, 244 120, 238 158 C 232 184, 216 198, 200 200 C 184 198, 168 184, 162 158 C 156 120, 170 86, 200 84 Z"
        fill="url(#eg-light)"
      />
      </svg>
      <svg class="layer body-slice--ridge" viewBox="0 0 400 300">
        <ellipse cx="200" cy="140" rx="24" ry="52" fill="url(#eg-ridge)" />
      </svg>
      <!-- Kopf: klein, in der Vorderlage fast hinter den Schultern verschwunden -->
      <svg class="layer layer--head" viewBox="0 0 400 300">
        <path d="M190 98 C 190 90, 194 82, 200 80 C 206 82, 210 90, 210 98 Z" fill="#6e4520" />
        <path d="M193 76 l-5 -3 l2 5 Z M207 76 l5 -3 l-2 5 Z" fill="#2b2724" />
        <path
          d="M200 68 C 206 68, 209 73, 208 79 C 207 85, 204 89, 200 90 C 196 89, 193 85, 192 79 C 191 73, 194 68, 200 68 Z"
          fill="url(#eg-nape)"
        />
        <path d="M196 84 l-1 6 l3 -2 l2 4 l2 -4 l3 2 l-1 -6 Z" fill="#a8763a" />
      </svg>
    </div>
  </div>
</template>

<style scoped lang="scss">
.eagle {
  position: relative;
  width: 100%;
  aspect-ratio: 400 / 300;
  filter: drop-shadow(0 12px 14px rgb(0 0 0 / 40%));
}

.eagle__defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* 3D-Bühne: Vorderlage von schräg oben hinten, leicht in die Kurve gelegt; gekippt und
   gestreckt um die Fänge, damit der Griff am Brief sitzt. Beide Bühnen rollen synchron. */
.rig {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform-origin: 50% 87%;
  transform: translateY(9%) perspective(520px) rotateX(48deg) rotateY(-10deg) scaleY(1.38);
  animation: roll 2.4s cubic-bezier(0.37, 0, 0.63, 1) infinite alternate;
}

@keyframes roll {
  from {
    transform: translateY(9%) perspective(520px) rotateX(49deg) rotateY(-13deg) rotateZ(-1.5deg)
      scaleY(1.38);
  }

  to {
    transform: translateY(9%) perspective(520px) rotateX(46deg) rotateY(-7deg) rotateZ(1.5deg)
      scaleY(1.38);
  }
}

/* Flügelschlag: weich wie eine Sinuskurve, um die Schulter in die Tiefe */
.layer--wing {
  animation: 0.62s cubic-bezier(0.37, 0, 0.63, 1) infinite alternate;
}

.layer--wing-right {
  transform-origin: 54% 40%;
  animation-name: flap-right;
}

.layer--wing-left {
  transform-origin: 46% 40%;
  animation-name: flap-left;
}

@keyframes flap-right {
  from {
    transform: rotateY(-40deg) rotateZ(-4deg);
    filter: brightness(1.12);
  }

  to {
    transform: rotateY(26deg) rotateZ(5deg);
    filter: brightness(0.8);
  }
}

@keyframes flap-left {
  from {
    transform: rotateY(36deg) rotateZ(4deg);
    filter: brightness(1.08);
  }

  to {
    transform: rotateY(-28deg) rotateZ(-5deg);
    filter: brightness(0.78);
  }
}

/* Schwanz fächert leicht zum Betrachter, der Körper hat Dicke */
.layer--tail {
  transform-origin: 50% 61%;
  transform: rotateX(22deg);
}

/* Körper schlanker: in der Breite gestaucht (scaleX), die Länge bleibt */
.body-slice--base {
  transform-origin: 50% 47%;
  transform: translateZ(-2px) scale(0.84, 1.05);
}

.layer--body {
  transform-origin: 50% 47%;
  transform: translateZ(5px) scaleX(0.8);
}

.body-slice--ridge {
  transform-origin: 50% 47%;
  transform: translateZ(10px) scale(0.7, 0.9);
}

/* Kopf etwas größer, um seine Mitte skaliert – bleibt aber klein hinter den Schultern */
.layer--head {
  transform-origin: 50% 26%;
  transform: translateZ(7px) scale(2.1);
}

@media (prefers-reduced-motion: reduce) {
  .rig,
  .layer--wing {
    animation: none;
  }
}
</style>

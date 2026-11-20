<script setup lang="ts">
// Wachssiegel mit eingeprägtem Monogramm – als Knopf neben dem Brief und als Siegel auf dem Umschlag
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
</script>

<template>
  <span class="wax" aria-hidden="true">
    <svg viewBox="-50 -50 100 100">
      <defs>
        <radialGradient id="wax-shine" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stop-color="#c0492a" />
          <stop offset="55%" stop-color="#8e2f17" />
          <stop offset="100%" stop-color="#5e1b0b" />
        </radialGradient>
      </defs>
      <path :d="sealPath" fill="url(#wax-shine)" />
      <circle r="34" class="wax__ring" />
      <circle r="30" class="wax__ring wax__ring--light" />
    </svg>
    <!-- Monogramm als Prägung: dunkle Vertiefung, darüber eine helle Kante -->
    <span class="wax__mark wax__mark--light" />
    <span class="wax__mark" />
  </span>
</template>

<style scoped lang="scss">
.wax {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1;

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
}

.wax__ring {
  fill: none;
  stroke: rgb(0 0 0 / 26%);
  stroke-width: 2.6;
}

.wax__ring--light {
  stroke: rgb(255 210 180 / 18%);
  stroke-width: 1;
}

.wax__mark {
  position: absolute;
  inset: 24%;
  background: rgb(50 10 2 / 55%);
  -webkit-mask: url('/assets/about/orb-monogram.svg') center / contain no-repeat;
  mask: url('/assets/about/orb-monogram.svg') center / contain no-repeat;
}

.wax__mark--light {
  translate: 1px 1px;
  background: rgb(255 190 150 / 30%);
}
</style>

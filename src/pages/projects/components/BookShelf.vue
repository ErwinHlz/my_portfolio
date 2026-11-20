<script setup lang="ts">
import { computed } from 'vue';

/**
 * Reine Kulisse hinter dem Buch: ein unscharfes Regal mit titellosen Buchrücken.
 * Später können die Rücken zu echten Projekten werden – bis dahin ohne Funktion.
 */
interface Spine {
  width: number;
  height: number;
  color: string;
  lean: number;
  bands: number;
  gap?: boolean;
}

const palette = ['#5a2318', '#2f4a2c', '#2c3550', '#5b4022', '#6b5121', '#3d2a1c', '#44222a'];

// kleiner, deterministischer Zufall – das Regal sieht bei jedem Besuch gleich aus
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildRow(seed: number, count: number, gapAt?: number): Spine[] {
  const rand = seeded(seed);
  const row: Spine[] = [];
  for (let i = 0; i < count; i++) {
    if (i === gapAt) {
      row.push({ width: 9, height: 0, color: 'transparent', lean: 0, bands: 0, gap: true });
      continue;
    }
    const lean = i === count - 1 ? 7 : rand() > 0.93 ? -5 : 0;
    row.push({
      width: 2.2 + rand() * 2.4,
      height: 68 + rand() * 28,
      color: palette[Math.floor(rand() * palette.length)]!,
      lean,
      bands: rand() > 0.35 ? 2 : 1,
    });
  }
  return row;
}

const props = withDefaults(defineProps<{ rows?: number }>(), { rows: 3 });

const allRows = [buildRow(29, 22, 9), buildRow(11, 24), buildRow(47, 25)];
const rows = computed(() =>
  props.rows === 1 ? allRows.slice(0, 1) : [allRows[1]!, allRows[0]!, allRows[2]!],
);
</script>

<template>
  <div class="shelf" :class="{ 'is-strip': rows.length === 1 }" aria-hidden="true">
    <div v-for="(row, r) in rows" :key="r" class="shelf__row">
      <div class="shelf__books">
        <span
          v-for="(spine, i) in row"
          :key="i"
          class="shelf__spine"
          :class="{ 'is-gap': spine.gap, 'has-two-bands': spine.bands === 2 }"
          :style="{
            '--w': `${spine.width}%`,
            '--h': `${spine.height}%`,
            '--c': spine.color,
            '--lean': `${spine.lean}deg`,
          }"
        />
      </div>
      <div class="shelf__plank" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.shelf {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  padding: 0 clamp(16px, 6vw, 90px);
  pointer-events: none;
  filter: blur(2.5px) brightness(var(--shelf-brightness, 0.55)) saturate(0.8);
  background: linear-gradient(180deg, #1c130b, #120c07);
  -webkit-mask-image: radial-gradient(ellipse 62% 56% at 50% 50%, #000 30%, transparent 76%);
  mask-image: radial-gradient(ellipse 62% 56% at 50% 50%, #000 30%, transparent 76%);

  // Lichtkegel von oben, wie von einer Laterne
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 55% 45% at 50% 0%, rgb(255 190 100 / 22%), transparent);
  }
}

.shelf.is-strip {
  inset: 0 0 auto;
  height: 190px;
  grid-template-rows: 1fr;
  -webkit-mask-image: linear-gradient(180deg, #000 40%, transparent);
  mask-image: linear-gradient(180deg, #000 40%, transparent);
}

:root[data-theme='light'] .shelf {
  --shelf-brightness: 1;
  opacity: 0.55;
}

.shelf__row {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-top: 1.5%;
  border-inline: 1.4vw solid #24180e;
  background: linear-gradient(180deg, rgb(0 0 0 / 55%), rgb(0 0 0 / 20%) 40%, rgb(0 0 0 / 35%));
}

.shelf__books {
  display: flex;
  align-items: flex-end;
  height: 100%;
  padding-inline: 1%;
}

.shelf__spine {
  position: relative;
  flex: none;
  width: var(--w);
  height: var(--h);
  margin-right: 0.15%;
  border-radius: 2px 2px 0 0;
  background:
    linear-gradient(90deg, rgb(0 0 0 / 45%), rgb(255 255 255 / 10%) 30%, rgb(0 0 0 / 30%)), var(--c);
  transform-origin: bottom left;
  rotate: var(--lean);

  // goldene Bünde, keine Titel
  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 8%;
    right: 8%;
    height: 2.5%;
    background: rgb(214 170 90 / 45%);
  }

  &::before {
    top: 10%;
  }

  &::after {
    bottom: 10%;
  }

  &.has-two-bands::after {
    bottom: auto;
    top: 15%;
  }

  &.is-gap {
    background: none;
  }

  &.is-gap::before,
  &.is-gap::after {
    display: none;
  }
}

.shelf__plank {
  height: 9%;
  min-height: 8px;
  background: linear-gradient(180deg, #6a4826, #3e2914 60%, #24170b);
  box-shadow: 0 6px 10px rgb(0 0 0 / 60%);
}
</style>

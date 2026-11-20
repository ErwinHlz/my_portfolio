<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import {
  combineRotations,
  createOrbRenderer,
  rotationBetween,
  rotationMatrix,
  trackballPoint,
  type Rotation,
  type Vector,
} from './navOrb';
import type { Orb, OrbColors } from '@/shared/orb/palantir';
import { createGlOrb } from '@/shared/orb/palantirGl';

/** Farben der Header-Kugel; im Light Mode färbt --orb-color-filter sie wie bisher um. */
const MIST_COLORS: OrbColors = {
  deep: '34, 26, 16',
  glass: '95, 68, 38',
  core: '255, 176, 72',
  mist: '255, 214, 150',
  reflex: '255, 246, 222',
  rim: '255, 224, 146',
};

const canvas = ref<HTMLCanvasElement | null>(null);
const mistCanvas = ref<HTMLCanvasElement | null>(null);
const misty = ref(false);
let orientation: Rotation = [0, 0, 0, 1];
let render: ReturnType<typeof createOrbRenderer>;
let mist: Orb | null = null;
let mistResize: ResizeObserver | undefined;
let reducedMotion: MediaQueryList | undefined;
let frame = 0;
let lastTime = 0;
let stir = 0;
let pointer: { x: number; y: number } | null = null;
let yaw = 0;
let pitch = 0;
let targetYaw = 0;
let targetPitch = 0;
let drag: {
  pointerId: number;
  bounds: DOMRect;
  startX: number;
  startY: number;
  previous: Vector;
} | null = null;
let wasDragged = false;

const step = Math.sin(Math.PI / 12);
const halfAngleCosine = Math.cos(Math.PI / 12);
const arrowRotations = new Map<string, Rotation>([
  ['ArrowLeft', [0, -step, 0, halfAngleCosine]],
  ['ArrowRight', [0, step, 0, halfAngleCosine]],
  ['ArrowUp', [step, 0, 0, halfAngleCosine]],
  ['ArrowDown', [-step, 0, 0, halfAngleCosine]],
]);

function hoverRotation() {
  return combineRotations(
    [Math.sin(pitch / 2), 0, 0, Math.cos(pitch / 2)],
    [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)],
  );
}

function scheduleRender() {
  if (frame) return;

  frame = requestAnimationFrame((now) => {
    frame = 0;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = now;

    const settling = Math.abs(targetYaw - yaw) > 0.003 || Math.abs(targetPitch - pitch) > 0.003;
    yaw = settling ? yaw + (targetYaw - yaw) * 0.22 : targetYaw;
    pitch = settling ? pitch + (targetPitch - pitch) * 0.22 : targetPitch;
    const rotation = combineRotations(hoverRotation(), orientation);

    if (mist) {
      const still = !!reducedMotion?.matches;
      stir *= Math.exp(-dt * 1.4);
      mist.render({
        vision: -1,
        clarity: 0,
        lean: 0,
        yaw: 0,
        pitch: 0,
        rotation: rotationMatrix(rotation),
        stir: still ? 0 : stir,
        time: still ? 0 : now / 1000,
        dt: still ? 0 : dt,
        pointer: still ? null : pointer,
      });
      // Der Nebel wabert dauerhaft, außer bei reduzierter Bewegung
      if (!still) {
        scheduleRender();
        return;
      }
    } else {
      render?.(rotation);
    }

    if (settling) scheduleRender();
  });
}

function rotate(delta: Rotation) {
  orientation = combineRotations(delta, orientation);
  scheduleRender();
}

function followPointer(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || drag) return;

  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  targetYaw = ((event.clientX - bounds.left) / bounds.width - 0.5) * 1.4;
  targetPitch = ((event.clientY - bounds.top) / bounds.height) * 0.5;
  scheduleRender();
}

function stopFollowing() {
  targetYaw = 0;
  targetPitch = 0;
  scheduleRender();
}

defineExpose({ followPointer, stopFollowing });

function projectPointer(event: PointerEvent, bounds: DOMRect) {
  const radius = bounds.width / 2;
  return trackballPoint(
    (event.clientX - bounds.left) / radius - 1,
    (event.clientY - bounds.top) / radius - 1,
  );
}

function startDrag(event: PointerEvent) {
  if (!event.isPrimary || event.button !== 0) return;

  const button = event.currentTarget as HTMLButtonElement;
  const bounds = button.getBoundingClientRect();
  orientation = combineRotations(hoverRotation(), orientation);
  yaw = 0;
  pitch = 0;
  stopFollowing();
  wasDragged = false;
  drag = {
    pointerId: event.pointerId,
    bounds,
    startX: event.clientX,
    startY: event.clientY,
    previous: projectPointer(event, bounds),
  };
  button.setPointerCapture(event.pointerId);
}

function moveDrag(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (!wasDragged && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 3) {
    return;
  }

  const next = projectPointer(event, drag.bounds);
  rotate(rotationBetween(drag.previous, next));
  drag.previous = next;
  wasDragged = true;
}

/** Zeiger über der Kugel verwirbelt den Nebel */
function stirMist(event: PointerEvent) {
  if (!mist) return;

  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  if (pointer)
    stir = Math.min(stir + Math.hypot(point.x - pointer.x, point.y - pointer.y) * 0.03, 2.4);
  pointer = point;
}

function handlePointerMove(event: PointerEvent) {
  stirMist(event);
  moveDrag(event);
}

function handlePointerLeave() {
  pointer = null;
}

function stopDrag(event: PointerEvent) {
  if (event.pointerId === drag?.pointerId) drag = null;
}

function handleClick(event: MouseEvent) {
  if (event.detail === 0 || !wasDragged) rotate([0, step, 0, halfAngleCosine]);
}

function handleKeydown(event: KeyboardEvent) {
  const delta = arrowRotations.get(event.key);
  if (!delta) return;

  event.preventDefault();
  rotate(delta);
}

function resizeMist() {
  if (!mist || !mistCanvas.value) return;
  mist.resize(mistCanvas.value.clientWidth || 160);
  scheduleRender();
}

onMounted(() => {
  // Nebel per WebGL; ohne WebGL bleibt die bisherige Bronzekugel
  if (mistCanvas.value) mist = createGlOrb(mistCanvas.value, [], () => undefined);

  if (mist) {
    misty.value = true;
    mist.setColors(MIST_COLORS);
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.addEventListener('change', scheduleRender);
    mistResize = new ResizeObserver(resizeMist);
    if (mistCanvas.value) mistResize.observe(mistCanvas.value);
    resizeMist();
    return;
  }

  if (!canvas.value) return;
  render = createOrbRenderer(canvas.value);
  render?.(orientation);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  mistResize?.disconnect();
  reducedMotion?.removeEventListener('change', scheduleRender);
  mist?.dispose();
});
</script>

<template>
  <button
    class="nav-orb"
    type="button"
    aria-label="Kugel drehen"
    @pointerdown="startDrag"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
    @lostpointercapture="stopDrag"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <canvas v-show="!misty" ref="canvas" width="160" height="160" aria-hidden="true"></canvas>
    <canvas v-show="misty" ref="mistCanvas" class="nav-orb__mist" aria-hidden="true"></canvas>
  </button>
</template>

<style scoped lang="scss">
.nav-orb {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 1;
  translate: -50% -50%;
  width: var(--orb-size);
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 50%;
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  background: var(--orb-surface);
  box-shadow: var(--orb-shadow);
}

.nav-orb:active {
  cursor: grabbing;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  filter: var(--orb-color-filter);
  pointer-events: none;
}
</style>

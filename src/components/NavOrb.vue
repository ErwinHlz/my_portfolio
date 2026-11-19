<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import {
  combineRotations,
  createOrbRenderer,
  rotationBetween,
  trackballPoint,
  type Rotation,
  type Vector,
} from './navOrb';

const canvas = ref<HTMLCanvasElement | null>(null);
let orientation: Rotation = [0, 0, 0, 1];
let render: ReturnType<typeof createOrbRenderer>;
let frame = 0;
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

  frame = requestAnimationFrame(() => {
    frame = 0;
    const settling = Math.abs(targetYaw - yaw) > 0.003 || Math.abs(targetPitch - pitch) > 0.003;
    yaw = settling ? yaw + (targetYaw - yaw) * 0.22 : targetYaw;
    pitch = settling ? pitch + (targetPitch - pitch) * 0.22 : targetPitch;
    render?.(combineRotations(hoverRotation(), orientation));
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

onMounted(() => {
  if (!canvas.value) return;
  render = createOrbRenderer(canvas.value);
  render?.(orientation);
});

onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <button
    class="nav-orb"
    type="button"
    aria-label="Kugel drehen"
    @pointerdown="startDrag"
    @pointermove="moveDrag"
    @lostpointercapture="stopDrag"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <canvas ref="canvas" width="160" height="160" aria-hidden="true"></canvas>
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

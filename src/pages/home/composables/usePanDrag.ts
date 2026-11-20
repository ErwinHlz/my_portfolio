import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

export interface PanDelta {
  dx: number;
  dy: number;
}

/**
 * Drag-/Hover-Panning mit Trägheit (Momentum).
 * - Drag: verschiebt 1:1 und läuft nach dem Loslassen weiter aus
 * - Hover: leichtes Mitziehen bei Mausbewegung
 */
export function usePanDrag(target: Ref<HTMLElement | null>, onPan: (delta: PanDelta) => void) {
  const dragging = ref(false);

  let lastPointerTime = 0;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let velocityX = 0;
  let velocityY = 0;
  let momentumRaf = 0;

  const hoverFactor = 0.12; // wie stark der Hover schieben soll
  const hoverSmoothing = 0.2;
  let lastHoverX = 0;
  let lastHoverY = 0;
  let hoverVX = 0;
  let hoverVY = 0;

  function startMomentum() {
    if (Math.abs(velocityX) < 20 && Math.abs(velocityY) < 20) {
      velocityX = 0;
      velocityY = 0;
      return;
    }

    const friction = 0.94;
    let last = performance.now();

    const step = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;

      onPan({ dx: velocityX * dt, dy: velocityY * dt });

      velocityX *= Math.pow(friction, dt * 60);
      velocityY *= Math.pow(friction, dt * 60);

      if (Math.abs(velocityX) < 5 && Math.abs(velocityY) < 5) {
        momentumRaf = 0;
        return;
      }
      momentumRaf = requestAnimationFrame(step);
    };

    if (momentumRaf) cancelAnimationFrame(momentumRaf);
    momentumRaf = requestAnimationFrame(step);
  }

  function onPointerDown(event: PointerEvent) {
    dragging.value = true;
    lastPointerTime = performance.now();
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    try {
      target.value?.setPointerCapture(event.pointerId);
    } catch {
      /* ignorieren */
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging.value) {
      if (!lastHoverX && !lastHoverY) {
        lastHoverX = event.clientX;
        lastHoverY = event.clientY;
      }
      const rawDx = (event.clientX - lastHoverX) * hoverFactor;
      const rawDy = (event.clientY - lastHoverY) * hoverFactor;
      lastHoverX = event.clientX;
      lastHoverY = event.clientY;
      hoverVX = hoverVX * (1 - hoverSmoothing) + rawDx * hoverSmoothing;
      hoverVY = hoverVY * (1 - hoverSmoothing) + rawDy * hoverSmoothing;
      onPan({ dx: hoverVX, dy: hoverVY });
      return;
    }
    event.preventDefault();

    const now = performance.now();
    const dt = Math.max(1, now - lastPointerTime) / 1000;
    lastPointerTime = now;
    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastHoverX = event.clientX;
    lastHoverY = event.clientY;

    const smoothing = 0.8;
    velocityX = velocityX * smoothing + (dx / dt) * (1 - smoothing);
    velocityY = velocityY * smoothing + (dy / dt) * (1 - smoothing);

    onPan({ dx, dy });
  }

  function onPointerUp(event: PointerEvent) {
    dragging.value = false;
    try {
      target.value?.releasePointerCapture(event.pointerId);
    } catch {
      /* ignorieren */
    }
    startMomentum();
  }

  onMounted(() => {
    target.value?.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  });

  onBeforeUnmount(() => {
    target.value?.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
    if (momentumRaf) cancelAnimationFrame(momentumRaf);
  });

  return { dragging };
}

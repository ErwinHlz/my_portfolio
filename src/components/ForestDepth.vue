<template>
  <div class="forest-depth" data-forest-depth>
    <div class="forest-depth__surface">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.forest-depth {
  position: relative;
  z-index: 1;
}

.forest-depth.is-in-the-distance {
  z-index: 0;
}

.forest-depth__surface {
  height: 100%;
  transform: translate3d(var(--forest-drift-x, 0px), var(--forest-drift-y, 0px), 0)
    scale(var(--forest-scale, 1));
  transform-origin: center top;
  opacity: var(--forest-visibility, 1);
}

.is-in-the-distance > .forest-depth__surface {
  pointer-events: none;
}

.forest-depth:focus-within > .forest-depth__surface {
  transform: none;
  opacity: 1;
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  .forest-depth__surface {
    transform: none;
    opacity: 1;
  }

  .is-in-the-distance > .forest-depth__surface {
    pointer-events: auto;
  }
}
</style>

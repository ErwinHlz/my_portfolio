<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { ProjectImage } from '../data/projects';

const props = defineProps<{ image: ProjectImage | null }>();
const emit = defineEmits<{ close: [] }>();

const closeButton = ref<HTMLButtonElement | null>(null);
let returnFocus: HTMLElement | null = null;

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}

watch(
  () => props.image,
  async (image, previous) => {
    if (image && !previous) {
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      window.addEventListener('keydown', onKeydown);
      await nextTick();
      closeButton.value?.focus({ preventScroll: true });
    } else if (!image && previous) {
      window.removeEventListener('keydown', onKeydown);
      returnFocus?.focus({ preventScroll: true });
      returnFocus = null;
    }
  },
);

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="image"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="image.alt"
        @click.self="emit('close')"
      >
        <figure class="lightbox__figure">
          <img :src="image.src" :alt="image.alt" @click="emit('close')" />
          <figcaption>{{ image.alt }}</figcaption>
        </figure>
        <button
          ref="closeButton"
          type="button"
          class="lightbox__close"
          aria-label="Schließen"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
  background: rgb(8 5 2 / 82%);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  cursor: zoom-out;
}

.lightbox__figure {
  display: grid;
  justify-items: center;
  gap: 10px;
  max-width: 100%;
  max-height: 100%;
  margin: 0;

  img {
    display: block;
    max-width: min(1400px, 100%);
    max-height: calc(100dvh - 90px);
    border-radius: 6px;
    object-fit: contain;
    box-shadow: 0 20px 60px rgb(0 0 0 / 60%);
    cursor: zoom-out;
  }

  figcaption {
    font-family: var(--font-body);
    font-style: italic;
    font-size: 1rem;
    color: #e9dcc0;
    text-align: center;
  }
}

.lightbox__close {
  position: absolute;
  top: max(12px, env(safe-area-inset-top));
  right: 12px;
  width: 44px;
  height: 44px;
  border: 1px solid rgb(214 170 92 / 50%);
  border-radius: 50%;
  font-size: 1.6rem;
  line-height: 1;
  color: #e8c477;
  background: rgb(20 12 6 / 70%);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-gold);
    outline-offset: 3px;
  }
}

.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 220ms ease;

  img {
    transition: scale 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;

  img {
    scale: 0.94;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lightbox-enter-active,
  .lightbox-leave-active {
    transition: none;
  }
}
</style>

import { onBeforeUnmount, onMounted, ref } from 'vue';

/** Ab dieser Breite gilt das Handy-Layout: Kompass statt Kopfleiste, alles auf einer Scrollseite */
export const COMPACT_QUERY = '(width <= 900px)';

export function useCompactLayout() {
  const query = typeof window !== 'undefined' ? window.matchMedia(COMPACT_QUERY) : null;
  const isCompact = ref(query?.matches ?? false);
  const update = () => (isCompact.value = query?.matches ?? false);

  onMounted(() => query?.addEventListener('change', update));
  onBeforeUnmount(() => query?.removeEventListener('change', update));

  return isCompact;
}

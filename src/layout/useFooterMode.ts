import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

export type FooterMode = 'fixed' | 'inline' | 'mobile';

const MOBILE_BREAKPOINT = 780;

/**
 * Startseite: Footer immer fixiert.
 * Andere Seiten: Desktop -> "inline", Mobile -> "mobile" (im Seitenfluss).
 */
export function useFooterMode() {
  const route = useRoute();
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1920);

  const onResize = () => {
    width.value = window.innerWidth;
  };

  onMounted(() => window.addEventListener('resize', onResize));
  onBeforeUnmount(() => window.removeEventListener('resize', onResize));

  return computed<FooterMode>(() => {
    // Startseite auf dem Desktop: fixiert. Auf dem Handy ist /home der Anfang der Scrollseite.
    if (route.name === 'home' && width.value > 900) return 'fixed';
    return width.value <= MOBILE_BREAKPOINT ? 'mobile' : 'inline';
  });
}

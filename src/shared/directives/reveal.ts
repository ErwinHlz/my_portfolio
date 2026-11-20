import type { Directive } from 'vue';

/**
 * v-reveal: blendet ein Element sanft ein, sobald es in den sichtbaren Bereich scrollt.
 * Optional mit Verzögerung in Sekunden: v-reveal="0.2"
 */
const observer =
  typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add('is-visible');
            observer?.unobserve(entry.target);
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
      )
    : null;

export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.classList.add('reveal');
    if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}s`);
    if (observer) observer.observe(el);
    else el.classList.add('is-visible');
  },
  unmounted(el) {
    observer?.unobserve(el);
  },
};

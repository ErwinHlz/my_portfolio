<script setup lang="ts">
import { useFooterMode } from '@/composables/useFooterMode';

const mode = useFooterMode();
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer" :class="`is-${mode}`">
    <nav class="footer__legal" aria-label="Rechtliche Informationen">
      <RouterLink to="/datenschutz">Datenschutz</RouterLink>
      <RouterLink to="/impressum">Impressum</RouterLink>
    </nav>
    <p class="footer__copy">&copy; {{ currentYear }} Erwin Holzhauser. All rights reserved.</p>
    <a
      class="footer__instagram"
      href="https://www.instagram.com/erwin.hlz/"
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Instagram"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <use href="#icon-instagram"></use>
      </svg>
    </a>
  </footer>
</template>

<style scoped lang="scss">
.site-footer {
  display: grid;
  width: 100%;
  min-height: 64px;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 4px 14px;
  padding-inline: max(clamp(0.8rem, 3vw, 3rem), env(safe-area-inset-left, 0px));
  scroll-snap-align: center;
  scroll-snap-stop: always;
}

.site-footer.is-fixed {
  position: fixed;
  inset: auto 0 env(safe-area-inset-bottom, 0px);
  z-index: 120;
  padding-block: 8px;
  background: linear-gradient(
    to top,
    var(--color-night),
    color-mix(in srgb, var(--color-night) 78%, transparent) 82%,
    transparent
  );
}

.site-footer.is-mobile,
.site-footer.is-inline {
  position: relative;
  z-index: 1;
  margin-top: 24px;
  padding-block: 18px;
  border-top: 1px solid var(--border-soft);
  background: rgb(0 0 0 / 25%);
}

.footer__legal {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}

.footer__legal a {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  color: var(--text-soft);
  font-family: var(--font-ui);
  font-size: 0.85rem;
  letter-spacing: 0;
  text-decoration: none;
}

.footer__legal a:is(:hover, :focus-visible, [aria-current='page']) {
  color: var(--accent-gold);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.footer__copy {
  justify-self: center;
  margin: 0;
  color: rgb(232 245 244 / 75%);
  font-size: 0.8rem;
  text-align: center;
}

.footer__instagram {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  justify-self: end;
  border-radius: 50%;
  color: var(--accent-gold);
  transition: color 220ms ease-out;
}

.footer__instagram:is(:hover, :focus-visible) {
  color: var(--nav-active-color);
}

.footer__instagram svg {
  width: 27px;
  height: 27px;
  fill: currentColor;
  filter: drop-shadow(0 1px 3px var(--instagram-icon-shadow));
  transition: filter 220ms ease-out;
}

.footer__instagram:is(:hover, :focus-visible) svg {
  filter: drop-shadow(0 1px 3px var(--instagram-icon-shadow))
    drop-shadow(0 0 5px rgb(var(--accent-gold-rgb), 0.32));
}

.footer__instagram:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

:root[data-theme='light'] {
  .site-footer {
    background: var(--footer-surface);
  }

  .footer__copy {
    color: var(--text-muted);
  }
}

/* Handy: oben Links und Instagram, darunter das Copyright über die volle Breite */
@media (width <= 600px) {
  .site-footer {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'legal insta'
      'copy copy';
    gap: 0 12px;
    padding-inline: max(16px, env(safe-area-inset-left, 0px));
  }

  .site-footer.is-fixed {
    padding-block: 4px calc(6px + env(safe-area-inset-bottom, 0px));
    inset: auto 0 0;
  }

  .footer__legal {
    grid-area: legal;
    gap: 0 20px;
  }

  .footer__legal a {
    min-height: 44px;
    font-size: 0.9rem;
  }

  .footer__instagram {
    grid-area: insta;
    width: 44px;
    height: 44px;
  }

  .footer__copy {
    grid-area: copy;
    justify-self: start;
    font-size: 0.75rem;
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .footer__instagram,
  .footer__instagram svg {
    transition: none;
  }
}
</style>

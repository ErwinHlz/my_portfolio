<script setup lang="ts">
import { useFooterMode } from './useFooterMode';

const mode = useFooterMode();
const currentYear = new Date().getFullYear();
</script>

<template>
  <!-- Alles mittig: Datenschutz · Impressum · Instagram, darunter das Copyright -->
  <footer class="site-footer" :class="`is-${mode}`">
    <nav class="footer__links" aria-label="Rechtliches und Social Media">
      <RouterLink to="/datenschutz">Datenschutz</RouterLink>
      <RouterLink to="/impressum">Impressum</RouterLink>
      <a href="https://www.instagram.com/erwin.hlz/" target="_blank" rel="noreferrer noopener">
        Instagram
      </a>
    </nav>
    <p class="footer__copy">&copy; {{ currentYear }} Erwin Holzhauser. All rights reserved.</p>
  </footer>
</template>

<style scoped lang="scss">
.site-footer {
  display: grid;
  justify-items: center;
  gap: 2px;
  width: 100%;
  padding-inline: max(16px, env(safe-area-inset-left, 0px)) max(16px, env(safe-area-inset-right, 0px));
  font-family: var(--font-ui);
  text-align: center;
  scroll-snap-align: center;
  scroll-snap-stop: always;
}

.site-footer.is-fixed {
  position: fixed;
  inset: auto 0 env(safe-area-inset-bottom, 0px);
  z-index: 120;
  padding-block: 10px 8px;
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
  padding-block: 14px max(16px, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border-soft);
  background: rgb(0 0 0 / 25%);
}

.footer__links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;

  a {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    padding-inline: clamp(10px, 3.4vw, 16px);
    font-family: var(--font-ui);
    font-size: 0.86rem;
    font-variant: normal;
    letter-spacing: 0;
    text-transform: none;
    white-space: nowrap;
    color: var(--text-soft);
    text-decoration: none;
    transition: color 200ms ease-out;
  }

  /* goldene Raute als Trenner */
  a + a::before {
    content: '';
    position: absolute;
    left: -2px;
    top: 50%;
    width: 4px;
    height: 4px;
    rotate: 45deg;
    translate: 0 -50%;
    background: rgb(var(--accent-gold-rgb), 0.6);
  }

  a:is(:hover, :focus-visible, [aria-current='page']) {
    color: var(--accent-gold);
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  a:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
}

.footer__copy {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: rgb(232 245 244 / 70%);
}

:root[data-theme='light'] {
  .site-footer {
    background: var(--footer-surface);
  }

  .footer__copy {
    color: var(--text-muted);
  }
}

/* Startseite Handy: deckender Grund, damit die Fotos nicht hinter dem Text durchscheinen */
@media (width <= 600px) {
  .site-footer.is-fixed {
    inset: auto 0 0;
    padding-block: 6px max(10px, env(safe-area-inset-bottom, 0px));
    background: color-mix(in srgb, var(--color-night) 94%, transparent);
    box-shadow: 0 -1px 0 var(--border-soft);
  }
}

@media (prefers-reduced-motion: reduce) {
  .footer__links a {
    transition: none;
  }
}
</style>

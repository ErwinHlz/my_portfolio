# Portfolio (Vite / Vue)

Persönliches Portfolio von Erwin Holzhauser – gebaut mit Vue 3, Vite und TypeScript.

## Features

- Interaktives, ziehbares Hintergrund-Grid auf der Startseite (mit Trägheit)
- Projekte als blätterbares Buch (3D-Umblättern per Finger, Maus oder Tastatur)
- Palantír-Kugel (WebGL) auf „Über mich“, Leistungen als Wald, Mini-Spiel im Playground
- Navigation als Kreisbahn am Desktop, als ausziehbarer Kompass auf dem Handy
- Hell-/Dunkelmodus über die Laterne, Footer mit Social Links

## Tech Stack

- Vue 3 (`<script setup>`), vue-router
- Vite, TypeScript, SCSS

## Struktur

```
src/
├─ main.ts, App.vue     Einstieg und App-Hülle
├─ router/              Routen (lädt die Seiten aus pages/)
├─ styles/              Design-Tokens (variables.scss) und globale Styles
├─ layout/              App-Rahmen, auf jeder Seite: NavBar, NavOrb, MobileCompass,
│                       ThemeLantern, SiteFooter (+ useFooterMode)
├─ shared/              seitenübergreifend wiederverwendbar
│  ├─ components/       PageHero, CallToAction
│  ├─ orb/              Palantír-Rendering (Navigation + Über mich)
│  ├─ data/             siteOwner (Name, Kontakt)
│  └─ directives/       v-reveal
└─ pages/<seite>/       eine Seite = ein Ordner
   ├─ <Seite>View.vue   die Seite selbst (wird vom Router geladen)
   ├─ components/       Komponenten nur dieser Seite
   ├─ lib/ | engine/    Canvas- und Logik-Module ohne UI
   ├─ composables/      Vue-Logik nur dieser Seite
   └─ data/             Inhalte der Seite
```

Seiten: `home`, `about`, `services`, `projects`, `playground`, `contact`, `legal`.

**Regeln**

- Eine Seite importiert nur aus sich selbst, `shared/` und `layout/` – nie aus einer anderen Seite.
- Wird etwas von einer zweiten Seite gebraucht, wandert es nach `shared/`.
- Innerhalb einer Seite relativ importieren (`./components/…`), über Grenzen hinweg mit `@/`.

`public/assets/` enthält Bilder, Icons und SVG-Sprites.

## Entwicklung

```bash
npm install
npm run dev       # Dev-Server
npm run build     # Typecheck + Produktions-Build nach dist/
npm run preview   # Build lokal ansehen
```

Deployment läuft per GitHub Actions auf GitHub Pages (`.github/workflows/ci-deploy.yml`).

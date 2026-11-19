# Portfolio (Vite / Vue)

Persönliches Portfolio von Erwin Holzhauser – gebaut mit Vue 3, Vite und TypeScript.

## Features

- Interaktives, ziehbares Hintergrund-Grid auf der Startseite (mit Trägheit)
- Projekt-Ansicht mit Einblicken im „Buch“, Lightbox und Fortschrittsanzeige
- Timeline für den Werdegang, Skill-Karten, Hobbys
- Responsive Navigation mit Seitenmenü, Footer mit Social Links

## Tech Stack

- Vue 3 (`<script setup>`), vue-router
- Vite, TypeScript, SCSS

## Struktur

- `src/views/` – Seiten (`Home`, `About`, `Projects`, `Contact`)
- `src/components/` – NavBar, SiteFooter, BgGrid, TimelineChart
- `src/composables/` – wiederverwendbare Logik (Drag/Pan, Footer-Modus)
- `src/data/` – Inhalte (Skills, Timeline, Projekte)
- `src/styles/` – Design-Tokens (`variables.scss`) und globale Styles
- `public/assets/` – Bilder, Icons, SVG-Sprites

## Entwicklung

```bash
npm install
npm run dev       # Dev-Server
npm run build     # Typecheck + Produktions-Build nach dist/
npm run preview   # Build lokal ansehen
```

Deployment läuft per GitHub Actions auf GitHub Pages (`.github/workflows/ci-deploy.yml`).

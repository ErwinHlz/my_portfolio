# Portfolio (Ionic / Angular)

Personal portfolio built with Ionic 8 and Angular 20. It showcases projects, timeline, contact options, and a custom animated background while staying mobile-first and touch-friendly.

## Features

- Animated background grid on the home page with drag interaction
- Project slider with previews (current/past), lightbox view, and progress indicators
- Timeline component for career highlights
- Responsive navigation with hamburger/side menu, footer with socials
- Themeable via `src/theme/variables.scss` and global styles in `src/global.scss`

## Tech Stack

- Angular 20, Ionic Framework 8
- Capacitor 7 (app shell, optional native)
- TypeScript, SCSS, RxJS

## Structure (high level)

- `src/app/pages/` — main screens (`home`, `about`, `my-projects`, `contact`)
- `src/app/components/` — shared UI (navbar, footer, bg-grid, timeline, etc.)
- `src/assets/` — images, icons, SVGs
- `src/theme/variables.scss` — design tokens/colors

## Getting Started

```bash
git clone <repo-url>
cd my_portfolio
npm install
npm start   # or: ng serve
```

The app runs at `http://localhost:4200/` by default.

## Scripts

- `npm start` — dev server with live reload
- `npm run build` — production build (outputs to `dist/`)
- `npm test` — unit tests (Karma/Jasmine)
- `npm run lint` — ESLint for TS + templates

## Build & Deploy

- Web: `npm run build` → serve `dist/` with any static host.
- Native (optional): `npm run build` then `npx cap sync` for the target platform.

## Customization

- Colors/spacing/typography: adjust `src/theme/variables.scss`.
- Global tweaks: `src/global.scss`.
- Content/data: update page components in `src/app/pages/` and shared components in `src/app/components/`.

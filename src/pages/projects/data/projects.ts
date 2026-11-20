export type ProjectKind = 'website' | 'app' | 'game' | 'tool' | 'hardware' | 'other';
export type ProjectStatus = 'live' | 'in-progress' | 'prototype' | 'archived';

export interface ProjectImage {
  src: string;
  alt: string;
}

export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  /** für Direktlinks: /projekte#<slug> */
  slug: string;
  title: string;
  kind: ProjectKind;
  status: ProjectStatus;
  /** z. B. "2025" oder "seit 2025" */
  year?: string;
  /** z. B. "ca. 3 Monate" */
  duration?: string;
  role: string;
  /** Schwerpunkte, 2–4 Stichworte */
  focus: string[];
  /** Werkzeuge – ausdrücklich nicht nur Code (auch Figma, Blender, Arduino …) */
  tools: string[];
  /** 2–3 Sätze */
  idea: string;
  /** Randnotiz: Herausforderung oder was ich gelernt habe */
  note?: string;
  /** Wie zufrieden ich selbst mit dem Ergebnis bin: brennende Kerzen (1–5) */
  satisfaction: 1 | 2 | 3 | 4 | 5;
  /** einfarbiges Logo (SVG) neben der Randnotiz, wird in Tintenfarbe eingefärbt */
  noteMark?: { src: string; label: string };
  image?: ProjectImage;
  /** optionales zweites, kleines Bild (z. B. Handy-Ansicht) */
  imageSecondary?: ProjectImage;
  caption?: string;
  links?: ProjectLink[];
}

export const kindLabels: Record<ProjectKind, string> = {
  website: 'Webseite',
  app: 'App',
  game: 'Spiel',
  tool: 'Werkzeug',
  hardware: 'Hardware',
  other: 'Projekt',
};

export const statusLabels: Record<ProjectStatus, string> = {
  live: 'Live',
  'in-progress': 'In Arbeit',
  prototype: 'Prototyp',
  archived: 'Archiviert',
};

export const projects: Project[] = [
  {
    slug: 'sv-ottweiler',
    title: 'SV Ottweiler',
    kind: 'website',
    status: 'live',
    year: 'seit 2025',
    duration: 'laufender Betrieb',
    role: 'Solo-Entwicklung, End‑to‑End', // geschützte Bindestriche: nicht umbrechen
    focus: ['Design', 'Automatisierung', 'Mobile first'],
    tools: ['Vue 3', 'TypeScript', 'APIs'],
    idea: 'Die Webseite meines Heimatvereins – Blau-Gelb seit 1919. Konzept, Design, Code und Betrieb liegen komplett in meiner Hand. Der Kern: Die Seite hält sich selbst aktuell, Ergebnisse, Spielberichte, Termine und Neuigkeiten ändern sich von ganz allein.',
    noteMark: { src: '/assets/projects/svottweiler_crest.svg', label: 'Wappen des SV Ottweiler' },
    satisfaction: 3,
    image: {
      src: '/assets/projects/svottweiler_desktop.webp',
      alt: 'Startseite von svottweiler.de in der Desktop-Ansicht mit Spielzentrale',
    },
    imageSecondary: {
      src: '/assets/projects/svottweiler_mobile.webp',
      alt: 'svottweiler.de in der Handy-Ansicht',
    },
    links: [{ label: 'Live ansehen', href: 'https://www.svottweiler.de' }],
  },
  {
    slug: 'portfolio',
    title: 'Meine Website',
    kind: 'website',
    status: 'in-progress',
    year: 'seit 2025',
    duration: 'wächst ständig weiter',
    role: 'Solo-Entwicklung, End‑to‑End', // geschützte Bindestriche: nicht umbrechen
    focus: ['Design', 'Storytelling', 'Animation'],
    tools: ['Vue 3', 'TypeScript', 'Canvas'],
    idea: 'Kein Lebenslauf zum Durchscrollen, sondern eine Reise durch meine eigene kleine Welt: Im Palantír lernst du mich kennen, im Wald wachsen meine Leistungen, und in diesem Buch stehen meine Projekte. Sie soll nicht nur informieren – sie ist auch meine kleine Spielwiese.',
    satisfaction: 4,
    noteMark: { src: '/assets/about/orb-monogram.svg', label: 'Mein Monogramm EH' },
    image: {
      src: '/assets/projects/portfolio_desktop.webp',
      alt: 'Startseite meiner Website in der Desktop-Ansicht',
    },
    imageSecondary: {
      src: '/assets/projects/portfolio_mobile.webp',
      alt: 'Startseite meiner Website in der Handy-Ansicht',
    },
    links: [{ label: 'Du bist schon hier', href: 'https://erwinholzhauser.de' }],
  },
  {
    slug: 'rondo',
    title: 'Rondo',
    kind: 'app',
    status: 'prototype',
    year: '2026',
    duration: 'seit Oktober, wächst weiter',
    role: 'Solo-Entwicklung, End‑to‑End', // geschützte Bindestriche: nicht umbrechen
    focus: ['UX-Design', 'App', 'Live-Daten'],
    tools: ['Vue 3', 'TypeScript', 'Rust', 'PostgreSQL'],
    idea: 'Meine Fußball-App, benannt nach der Passübung im Kreis. Sie bringt Trainer und Spieler zusammen: Kader, Trainings, Spiele und Zusagen an einem Ort. Spieler sehen beim Öffnen sofort, was als Nächstes ansteht, und sagen mit einem Daumentipp zu – Trainer planen ihre Einheiten mit animierten Übungen auf der Taktiktafel.',
    satisfaction: 2,
    noteMark: { src: '/assets/projects/rondo_mark.svg', label: 'Zeichen von Rondo' },
    imageSecondary: {
      src: '/assets/projects/rondo_mobile.webp',
      alt: 'Rondo auf dem Handy: nächstes Training mit Trainingsplan und schneller Zusage',
    },
  },
];

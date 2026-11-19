import type { Vision } from '@/components/palantir';

export interface AboutChapter {
  id: string;
  /** Auf welcher Seite der Kugel erzählt wird. */
  side: 'left' | 'right';
  eyebrow: string;
  title: string;
  /** Teil des Titels, der golden hervorgehoben wird. */
  accent?: string;
  lead?: string;
  paragraphs?: string[];
  facts?: { label: string; text: string }[];
  link?: { label: string; to: string };
  actions?: { label: string; to: string; variant: 'gold' | 'ghost' }[];
  /** Was in der Kugel erscheint. */
  vision: Vision;
}

export const chapters: AboutChapter[] = [
  {
    id: 'hallo',
    side: 'left',
    eyebrow: 'Über mich',
    title: 'Hi, ich bin Erwin.',
    accent: 'Erwin',
    lead: 'Webdesigner und Entwickler aus dem Saarland – mit einer Schwäche für Seiten, die man nicht so schnell wieder vergisst.',
    facts: [
      { label: 'Studium', text: 'Masterstudent, B.Sc. Praktische Informatik (HTW Saar)' },
      { label: 'Aktuell', text: 'Werkstudent bei BFD Buchholz' },
      { label: 'Fokus', text: 'Software mit starkem grafischem Anspruch' },
      { label: 'Neben dem Code', text: 'Fußball als Spieler & Trainer, Showtanz' },
    ],
    vision: { kind: 'image', src: '/assets/background/me_anzug.jpeg', focusY: 0.3 },
  },
  {
    id: 'kunst',
    side: 'right',
    eyebrow: 'Kurz zu mir',
    title: 'Webdesign ist für mich Kunst',
    paragraphs: [
      'Nach dem Abitur und einer Ausbildung bei ZF habe ich Praktische Informatik an der HTW Saar studiert. Seit Oktober 2026 habe ich meinen Bachelor of Science in der Tasche und bin direkt ins Masterstudium gestartet.',
      'Nebenbei arbeite ich als Werkstudent bei BFD Buchholz, nachdem ich vorher schon bei der DIaLOGIKa in echte Softwareprojekte hineinschnuppern durfte. Abseits davon stehe ich als Spieler und Trainer auf dem Fußballplatz, tanze im Showtanz – und ja, auch in meiner Freizeit wird gerne programmiert.',
    ],
    vision: { kind: 'image', src: '/assets/background/me_coding.jpeg', focusY: 0.45 },
  },
  {
    id: 'verein',
    side: 'left',
    eyebrow: 'Was mich gepackt hat',
    title: 'Vom Uniprojekt ins Netz',
    paragraphs: [
      'Was mich in den letzten Jahren immer mehr gepackt hat, ist das Webdesign. Hier kann ich meine Kreativität richtig ausleben.',
      'Was in vielen kleinen Uniprojekten begann, ist inzwischen auch online zu sehen: Neben dieser Homepage habe ich die Webseite meines Heimatvereins SV Ottweiler gestaltet und umgesetzt.',
    ],
    link: { label: 'Zum Projekt', to: '/projekte' },
    // Screenshot der Vereinsseite, bis das Logo da ist
    vision: { kind: 'image', src: '/assets/projects/svottweiler_desktop.webp', focusX: 0.5 },
  },
  {
    id: 'anspruch',
    side: 'right',
    eyebrow: 'Mein Anspruch',
    title: 'Charakter statt Baukasten',
    paragraphs: [
      'Moderne Designs, die nicht nur gut aussehen, sondern Charakter haben. Eine Seite soll einen Wiedererkennungswert besitzen und sich von der Masse abheben, statt im nächsten Baukasten-Template zu verschwinden.',
      'Und ehrlich gesagt gilt: Je verrückter eine Idee im ersten Moment klingt, desto mehr Lust habe ich, sie umzusetzen.',
    ],
    vision: { kind: 'image', src: '/assets/background/me_stormtrooper.png', focusY: 0.35 },
  },
  {
    id: 'software',
    side: 'left',
    eyebrow: 'Über den Tellerrand',
    title: 'Software jeder Art',
    paragraphs: [
      'Dabei bin ich nicht auf Webseiten festgelegt: Ich habe Lust auf Softwareprojekte jeder Art, ob Web-App, Tool oder etwas ganz anderes.',
      'Was mich aber wirklich antreibt, ist der grafische Teil – der Moment, in dem aus Code etwas wird, das man sehen, anfassen und erleben kann.',
    ],
    vision: { kind: 'image', src: '/assets/background/me_sunset.jpeg', focusY: 0.55 },
  },
  {
    id: 'platz',
    side: 'right',
    eyebrow: 'Abseits des Codes',
    title: 'Auf dem Platz',
    paragraphs: [
      'Wenn ich nicht am Rechner sitze, findet man mich meistens auf dem Fußballplatz – als Spieler beim SV Ottweiler.',
      'Fußball hat mir früh beigebracht, was auch in jedem Softwareprojekt zählt: Am Ende gewinnt nicht der Einzelne, sondern das Team.',
    ],
    vision: { kind: 'image', src: '/assets/about/orb-soccer.jpg' },
  },
  {
    id: 'trainer',
    side: 'left',
    eyebrow: 'An der Seitenlinie',
    title: 'Vom Spieler zum Trainer',
    paragraphs: [
      'Als Fußballtrainer stehe ich auch auf der anderen Seite: Training planen, erklären, motivieren – und dranbleiben, bis es klick macht.',
      'Genau das hilft mir auch bei Projekten: zuhören, Dinge verständlich machen und gemeinsam ans Ziel kommen.',
    ],
    vision: { kind: 'image', src: '/assets/about/orb-jugendtrainer.webp', fit: 'contain' },
  },
  {
    id: 'feierabend',
    side: 'right',
    eyebrow: 'Feierabend',
    title: 'Und sonst so?',
    paragraphs: [
      'Showtanz auf der Bühne, Volleyball, ein paar Muscle-ups an der Stange – und abends wird gezockt oder eben doch wieder programmiert.',
      'Was dabei entsteht, landet im Playground dieser Seite: kleine Experimente, die einfach Spaß machen sollen.',
    ],
    link: { label: 'Zum Playground', to: '/playground' },
    vision: { kind: 'image', src: '/assets/about/orb-gaming.webp', fit: 'contain' },
  },
  {
    id: 'gemeinsam',
    side: 'left',
    eyebrow: 'Und jetzt du',
    title: 'Lust, gemeinsam etwas zu bauen?',
    paragraphs: [
      'Ob Vereinsseite, Webseite für dein Unternehmen oder einfach eine Idee, über die du sprechen möchtest – ich freue mich auf deine Nachricht.',
    ],
    actions: [
      { label: 'Meine Leistungen', to: '/leistungen', variant: 'gold' },
      { label: 'Kontakt aufnehmen', to: '/contact', variant: 'ghost' },
    ],
    vision: {
      kind: 'image',
      src: '/assets/about/orb-monogram.svg',
      fit: 'contain',
      scale: 0.5,
      glow: true,
    },
  },
];

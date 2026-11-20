import type { Vision } from '@/shared/orb/palantir';

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

/** Goldenes Symbol im Stil des Monogramms – zeigt schematisch, worum es im Kapitel geht */
const symbol = (name: string): Vision => ({
  kind: 'image',
  src: `/assets/about/${name}.svg`,
  fit: 'contain',
  scale: 0.52,
  glow: true,
});

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
    title: 'Mein Werdegang',
    paragraphs: [
      'Nach dem Abitur und einer Ausbildung bei ZF habe ich Praktische Informatik an der HTW Saar studiert. Seit Oktober 2026 habe ich meinen Bachelor of Science in der Tasche und bin direkt ins Masterstudium gestartet.',
      'Nebenbei arbeite ich als Werkstudent bei BFD Buchholz, nachdem ich vorher schon bei der DIaLOGIKa in echte Softwareprojekte hineinschnuppern durfte.',
    ],
    vision: symbol('orb-path'),
  },
  {
    id: 'verein',
    side: 'left',
    eyebrow: 'Was mich gepackt hat',
    title: 'Webdesign ist für mich Kunst',
    paragraphs: [
      'Was mich in den letzten Jahren immer mehr gepackt hat, ist das Webdesign. Hier kann ich meine Kreativität richtig ausleben.',
      'Was in vielen kleinen Uniprojekten begann, ist inzwischen auch online zu sehen – welche Projekte schon entstanden sind, steht in meinem Projektbuch.',
    ],
    link: { label: 'Zu den Projekten', to: '/projekte' },
    vision: symbol('orb-brush'),
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
    vision: symbol('orb-gem'),
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
    vision: symbol('orb-devices'),
  },
  {
    id: 'platz',
    side: 'right',
    eyebrow: 'Abseits des Codes',
    title: 'Auf dem Platz',
    paragraphs: [
      'Wenn ich nicht am Rechner sitze, findet man mich meistens auf dem Fußballplatz – als Spieler und Trainer beim SV Ottweiler.',
      'Fußball hat mir früh beigebracht, was auch in jedem Softwareprojekt zählt: zuhören, Dinge verständlich machen – und am Ende gewinnt nicht der Einzelne, sondern das Team.',
    ],
    vision: symbol('orb-ball'),
  },
  {
    id: 'feierabend',
    side: 'right',
    eyebrow: 'Feierabend',
    title: 'Und sonst so?',
    paragraphs: [
      'Showtanz, Fitness – und abends wird gezockt oder eben doch wieder programmiert.',
      'Was dabei entsteht, landet im Playground dieser Seite: kleine Experimente, die einfach Spaß machen sollen.',
    ],
    link: { label: 'Zum Playground', to: '/playground' },
    vision: symbol('orb-play'),
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

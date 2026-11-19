export interface Service {
  title: string;
  text: string;
  points: string[];
  /** SVG-Pfad (viewBox 0 0 24 24, Strich) */
  icon: string;
  featured?: boolean;
}

export const services: Service[] = [
  {
    title: 'Webdesign & Webseiten',
    text: 'Mein Schwerpunkt: individuell gestaltete Webseiten mit Wiedererkennungswert – ob für Verein, Selbstständige oder Unternehmen. Kein Baukasten, keine Vorlage von der Stange.',
    points: ['Eigenständiges Design', 'Für Handy, Tablet und Desktop', 'Schnelle Ladezeiten'],
    icon: 'M3 5h18v14H3z M3 9h18 M7 7h.01 M10 7h.01',
    featured: true,
  },
  {
    title: 'Web-Apps & Software',
    text: 'Vom internen Tool über Buchungs- und Verwaltungssysteme bis zur kompletten Anwendung – ich habe Lust auf Softwareprojekte jeder Art.',
    points: ['Individuelle Anwendungen', 'Frontend & Backend', 'Saubere, erweiterbare Architektur'],
    icon: 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M13.5 4l-3 16',
  },
  {
    title: 'UI- & Interface-Design',
    text: 'Gute Software verdient eine Oberfläche, die man gerne benutzt. Ich gestalte Interfaces, die verständlich sind und trotzdem auffallen.',
    points: ['Klare Bedienführung', 'Einheitliches Erscheinungsbild', 'Liebe zum Detail'],
    icon: 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 21 9.8C21 6 17 3 12 3z M7.5 11h.01 M10 7.5h.01 M14.5 7.5h.01',
  },
  {
    title: 'Relaunch & Modernisierung',
    text: 'Deine Seite oder Anwendung ist in die Jahre gekommen? Ich bringe Design und Technik auf den aktuellen Stand und übernehme die vorhandenen Inhalte.',
    points: ['Modernes Erscheinungsbild', 'Bessere Bedienung am Handy', 'Aktuelle Technik'],
    icon: 'M4 4v6h6 M20 20v-6h-6 M5.5 15a7 7 0 0 0 12.6 2 M18.5 9A7 7 0 0 0 5.9 7',
  },
  {
    title: 'Wartung & Weiterentwicklung',
    text: 'Auch nach dem Start bin ich für dich da: Fehler beheben, Inhalte anpassen und neue Funktionen ergänzen.',
    points: ['Fester Ansprechpartner', 'Änderungen & Erweiterungen', 'Technische Updates'],
    icon: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  },
  {
    title: 'Hosting & Performance',
    text: 'Ich helfe bei der Wahl eines passenden Anbieters, richte Domain, Hosting und E-Mail ein und sorge dafür, dass alles schnell lädt und gefunden wird.',
    points: ['Einrichtung & Umzug', 'Technische SEO-Grundlagen', 'Optimierte Ladezeiten'],
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.5 3 2.5 15 0 18 M12 3c-2.5 3-2.5 15 0 18',
  },
];

export const promises = [
  {
    title: 'Design mit Charakter',
    text: 'Modern und trotzdem unverwechselbar – damit sich dein Projekt von der Masse abhebt.',
  },
  {
    title: 'Responsive',
    text: 'Sieht auf jedem Gerät gut aus – vom Smartphone bis zum großen Bildschirm.',
  },
  {
    title: 'Schnell & sauber',
    text: 'Moderne Technik und durchdachter Code sorgen für kurze Ladezeiten und eine solide Basis.',
  },
  {
    title: 'Persönlich',
    text: 'Ein Ansprechpartner von der ersten Idee bis zum fertigen Ergebnis. Keine Hotline.',
  },
];

export const steps = [
  {
    title: 'Kennenlernen',
    text: 'Wir sprechen über dein Vorhaben, deine Ziele und deine Wünsche – unverbindlich.',
  },
  {
    title: 'Konzept & Design',
    text: 'Ich skizziere Aufbau und Umfang und gestalte einen ersten Entwurf – du gibst Feedback, bis es sich richtig anfühlt.',
  },
  {
    title: 'Angebot',
    text: 'Steht die Richtung, bekommst du ein transparentes Angebot, das genau auf dein Projekt zugeschnitten ist.',
  },
  {
    title: 'Umsetzung',
    text: 'Ich entwickle dein Projekt, binde deine Inhalte ein und teste alles auf verschiedenen Geräten.',
  },
  {
    title: 'Start & Betreuung',
    text: 'Dein Projekt geht live. Auf Wunsch kümmere ich mich auch danach um Wartung und Erweiterungen.',
  },
];

export const faqs = [
  {
    question: 'Machst du nur Webseiten?',
    answer:
      'Nein. Webdesign ist mein Schwerpunkt, aber ich setze auch Web-Apps, Tools und andere Softwareprojekte um. Am meisten Spaß habe ich immer dann, wenn auch die Gestaltung eine Rolle spielt.',
  },
  {
    question: 'Was kostet ein Projekt?',
    answer:
      'Das hängt vom Umfang ab – eine kleine Visitenkarten-Seite ist etwas anderes als eine Vereinsseite mit Spielplänen oder eine eigene Anwendung. Nach unserem Erstgespräch bekommst du ein transparentes und unverbindliches Angebot.',
  },
  {
    question: 'Wie lange dauert die Umsetzung?',
    answer:
      'Das hängt vor allem vom Umfang ab und davon, wie schnell Texte und Bilder vorliegen. Einen realistischen Zeitplan bekommst du zusammen mit dem Angebot.',
  },
  {
    question: 'Kümmerst du dich auch um Domain und Hosting?',
    answer:
      'Gerne. Ich berate dich bei der Wahl eines Anbieters und richte alles ein. Verträge für Domain und Hosting laufen auf deinen Namen, damit du jederzeit unabhängig bleibst.',
  },
  {
    question: 'Ich habe noch keine Texte oder Bilder – ist das ein Problem?',
    answer:
      'Nein. Wir schauen gemeinsam, was du brauchst, und ich unterstütze dich dabei, die Inhalte zu strukturieren.',
  },
];

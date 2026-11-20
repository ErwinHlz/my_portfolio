import type { Project } from '../data/projects';

export type BookPage =
  | { type: 'cover' }
  | { type: 'frontis' }
  | { type: 'toc' }
  | { type: 'plate'; project: Project; chapter: number }
  | { type: 'profile'; project: Project; chapter: number }
  | { type: 'unwritten'; chapter: number }
  | { type: 'invite' };

/**
 * Seitenfolge: Einband, Vorsatz, Inhalt, je Projekt eine Doppelseite (Bild | Steckbrief),
 * dann das ungeschriebene Kapitel. Die Anzahl ist immer ungerade, damit jede
 * Doppelseite nach dem Einband vollständig ist.
 */
export function buildPages(projects: Project[]): BookPage[] {
  return [
    { type: 'cover' },
    { type: 'frontis' },
    { type: 'toc' },
    ...projects.flatMap((project, index): BookPage[] => [
      { type: 'plate', project, chapter: index + 1 },
      { type: 'profile', project, chapter: index + 1 },
    ]),
    { type: 'unwritten', chapter: projects.length + 1 },
    { type: 'invite' },
  ];
}

const ROMAN: [number, string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function toRoman(value: number): string {
  let rest = value;
  let out = '';
  for (const [num, sym] of ROMAN) {
    while (rest >= num) {
      out += sym;
      rest -= num;
    }
  }
  return out;
}

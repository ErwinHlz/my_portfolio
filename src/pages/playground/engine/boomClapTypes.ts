/** Zustand einer Boom-Clap-Szene, den der Player für Overlays ausliest */
export interface SceneState {
  /** Comic-Wort, das gerade aufpoppt */
  word: string;
  wordId: number;
  progress: number;
  ended: boolean;
}

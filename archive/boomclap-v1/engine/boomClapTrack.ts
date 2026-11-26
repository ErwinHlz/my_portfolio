/**
 * Spielt den Boom-Clap-Soundtrack über Web Audio ab. Die Animation liest
 * dieselbe Uhr (AudioContext.currentTime), dadurch sitzt jeder Boom und
 * jeder Clap auf den Frame genau – auch nach Pausen.
 *
 * Takt-Raster aus der Analyse der Datei: 91,85 BPM, erster Beat bei 0,16 s.
 * Die vier „Boom Clap“-Paare liegen auf den Beats 3/4, 11/12, 19/20, 27/28.
 */

export const SONG_URL = `${import.meta.env.BASE_URL}assets/playground/boom-clap.mp3`;
export const SONG_BPM = 91.85;
export const BEAT = 60 / SONG_BPM;
export const SONG_OFFSET = 0.16;
/** Länge des Clips in Sekunden (falls die Datei noch nicht geladen ist) */
export const SONG_LENGTH = 23.29;

/** Sekunden → Beat-Index im Song */
export const beatAt = (t: number) => (t - SONG_OFFSET) / BEAT;
/** Beat-Index → Sekunden */
export const timeAt = (k: number) => SONG_OFFSET + k * BEAT;

type AC = typeof AudioContext;

let bufferPromise: Promise<AudioBuffer> | null = null;

export interface AudioLevels {
  /** Bass 0 … 1 */
  low: number;
  /** Stimmbereich 0 … 1 (für Peters Lippen) */
  vocal: number;
}

export class BoomClapTrack {
  readonly ctx: AudioContext;
  private gain: GainNode;
  private analyser: AnalyserNode;
  private bins: Uint8Array<ArrayBuffer>;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private t0 = 0;
  private isMuted = false;
  duration = SONG_LENGTH;

  constructor() {
    const Ctor: AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: AC }).webkitAudioContext;
    this.ctx = new Ctor();
    this.gain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.55;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.gain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  /** lädt und dekodiert den Song (nur einmal pro Seitenaufruf) */
  async load() {
    if (this.buffer) return this.buffer;
    bufferPromise ??= fetch(SONG_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Song nicht gefunden (${r.status})`);
        return r.arrayBuffer();
      })
      .then((data) => this.ctx.decodeAudioData(data));
    this.buffer = await bufferPromise;
    this.duration = this.buffer.duration;
    return this.buffer;
  }

  /** Sekunden seit Songstart (bleibt beim Pausieren stehen) */
  get time() {
    return this.ctx.currentTime - this.t0;
  }

  set muted(value: boolean) {
    this.isMuted = value;
    this.gain.gain.setTargetAtTime(value ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  get muted() {
    return this.isMuted;
  }

  /** startet den Song von vorn – muss aus einem Klick heraus aufgerufen werden */
  async start() {
    await this.resume();
    const buffer = await this.load();
    this.stopSource();
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.gain);
    const lead = 0.06;
    this.t0 = this.ctx.currentTime + lead;
    src.start(this.t0);
    this.source = src;
  }

  async resume() {
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  pause() {
    void this.ctx.suspend();
  }

  levels(): AudioLevels {
    this.analyser.getByteFrequencyData(this.bins);
    const hz = this.ctx.sampleRate / this.analyser.fftSize;
    const avg = (a: number, b: number) => {
      let s = 0;
      let n = 0;
      for (let i = Math.floor(a / hz); i <= Math.ceil(b / hz) && i < this.bins.length; i++) {
        s += this.bins[i];
        n++;
      }
      return n ? s / n / 255 : 0;
    };
    return { low: avg(40, 140), vocal: avg(300, 2200) };
  }

  dispose() {
    this.stopSource();
    void this.ctx.close();
  }

  private stopSource() {
    if (!this.source) return;
    try {
      this.source.stop();
    } catch {
      /* lief noch nicht */
    }
    this.source.disconnect();
    this.source = null;
  }
}

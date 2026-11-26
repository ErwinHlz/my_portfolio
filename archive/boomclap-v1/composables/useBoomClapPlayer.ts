import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { BoomClapTrack, beatAt } from '../engine/boomClapTrack';
import { BoomClapScene, type SceneState } from '../engine/boomClapScene';
import type { AudioLevels } from '../engine/boomClapTrack';

/** was eine Szene können muss, damit der Player sie abspielen kann */
export interface BoomClapSceneLike {
  readonly state: SceneState;
  motion: boolean;
  duration: number;
  resize(w: number, h: number, dpr: number): void;
  render(t: number | null, wall: number, levels?: AudioLevels): void;
}

export type PlayerStatus = 'ready' | 'loading' | 'playing' | 'paused' | 'ended';

/**
 * Verbindet Szene und Song: eine Uhr (die des AudioContext), Render-Loop,
 * Pause beim Wegscrollen und Pegel für Lippen und Lichterkette.
 * Wird von der Querformat-Bühne und vom Handy-Reel gleichermaßen genutzt.
 */
export function useBoomClapPlayer(
  root: Ref<HTMLElement | null>,
  canvas: Ref<HTMLCanvasElement | null>,
  createScene: (ctx: CanvasRenderingContext2D) => BoomClapSceneLike = (ctx) =>
    new BoomClapScene(ctx),
) {
  const status = ref<PlayerStatus>('ready');
  const muted = ref(false);
  const word = ref('');
  const wordId = ref(0);
  const progress = ref(0);
  /** aktueller Song-Beat (für Overlays, die sich am Ablauf orientieren) */
  const beat = ref(-1);
  const error = ref('');

  let scene: BoomClapSceneLike | null = null;
  let track: BoomClapTrack | null = null;
  let raf = 0;
  let running = false;
  let resizeObserver: ResizeObserver | null = null;
  let visibilityObserver: IntersectionObserver | null = null;
  let motionQuery: MediaQueryList | null = null;

  const wall = () => performance.now() / 1000;

  function ensureTrack() {
    if (!track) {
      try {
        track = new BoomClapTrack();
      } catch {
        error.value = 'Web Audio wird von diesem Browser nicht unterstützt.';
      }
    }
    return track;
  }

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (!scene) return;
    const active =
      status.value === 'playing' || status.value === 'paused' || status.value === 'ended';
    const t = active && track ? track.time : null;
    const levels = active && track && status.value === 'playing' ? track.levels() : undefined;
    scene.render(t, wall(), levels);
    const s = scene.state;
    if (wordId.value !== s.wordId) {
      wordId.value = s.wordId;
      word.value = s.word;
    }
    progress.value = s.progress;
    beat.value = t === null ? -1 : beatAt(t);
    if (status.value === 'playing' && s.ended) status.value = 'ended';
  }

  function loop(on: boolean) {
    if (on && !running) {
      running = true;
      raf = requestAnimationFrame(frame);
    } else if (!on) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }

  function resize() {
    if (!root.value || !canvas.value || !scene) return;
    const { width, height } = root.value.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.value.width = Math.round(width * dpr);
    canvas.value.height = Math.round(height * dpr);
    scene.resize(width, height, dpr);
  }

  /** Play/Replay – muss direkt aus einem Klick kommen, sonst blockt der Browser den Ton */
  async function play() {
    const tr = ensureTrack();
    if (!tr) return;
    status.value = 'loading';
    try {
      tr.muted = muted.value;
      await tr.start();
      if (scene) scene.duration = tr.duration;
      status.value = 'playing';
      loop(true);
    } catch {
      error.value = 'Der Song konnte nicht geladen werden.';
      status.value = 'ready';
    }
  }

  function togglePause() {
    if (!track) return;
    if (status.value === 'playing') {
      status.value = 'paused';
      track.pause();
    } else if (status.value === 'paused') {
      status.value = 'playing';
      void track.resume();
    }
  }

  function toggleMute() {
    muted.value = !muted.value;
    if (track) track.muted = muted.value;
  }

  function onMotionChange() {
    if (scene) scene.motion = !motionQuery?.matches;
  }

  onMounted(() => {
    const ctx = canvas.value?.getContext('2d');
    if (!ctx || !root.value) return;
    scene = createScene(ctx);
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    onMotionChange();
    motionQuery.addEventListener('change', onMotionChange);

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root.value);
    resize();

    visibilityObserver = new IntersectionObserver(([entry]) => {
      loop(entry.isIntersecting);
      if (entry.isIntersecting) {
        // Song schon mal laden, damit der Start sofort klappt
        void ensureTrack()
          ?.load()
          .catch(() => undefined);
      } else if (status.value === 'playing') {
        togglePause();
      }
    });
    visibilityObserver.observe(root.value);
  });

  onBeforeUnmount(() => {
    loop(false);
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    motionQuery?.removeEventListener('change', onMotionChange);
    track?.dispose();
    track = null;
  });

  return { status, muted, word, wordId, progress, beat, error, play, togglePause, toggleMute };
}

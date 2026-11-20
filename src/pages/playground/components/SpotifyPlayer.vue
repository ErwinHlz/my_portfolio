<script setup lang="ts">
/**
 * Spotify-Player über die offizielle iFrame-API. Spielt nur einen Ausschnitt
 * des Songs (start … end in Sekunden) und springt am Ende wieder zum Start.
 *
 * Hinweis: Wer nicht bei Spotify angemeldet ist, bekommt nur die 30-Sekunden-
 * Vorschau – das Zeitfenster sollte dann innerhalb dieser Vorschau liegen.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

export interface SpotifyTrack {
  /** z. B. spotify:track:644es5aYPJghtZLjM1rmSP */
  uri: string;
  /** Startzeit in Sekunden */
  start?: number;
  /** Endzeit in Sekunden – danach geht es wieder bei start los */
  end?: number;
}

interface PlaybackUpdate {
  data: { isPaused: boolean; isBuffering: boolean; duration: number; position: number };
}

interface EmbedController {
  /** startAt = Startposition in Sekunden */
  loadUri(uri: string, preferVideo?: boolean, startAt?: number): void;
  play(): void;
  pause(): void;
  resume(): void;
  seek(seconds: number): void;
  destroy(): void;
  addListener(event: 'ready', cb: () => void): void;
  addListener(event: 'playback_update', cb: (e: PlaybackUpdate) => void): void;
}

interface IFrameAPI {
  createController(
    el: HTMLElement,
    options: { uri: string; width?: string | number; height?: string | number; theme?: 'dark' },
    cb: (controller: EmbedController) => void,
  ): void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
  }
}

const props = defineProps<{ track: SpotifyTrack }>();
const emit = defineEmits<{ playing: [boolean] }>();

const host = ref<HTMLElement | null>(null);
let controller: EmbedController | null = null;
let isPlaying = false;
/** nach einem Sprung kurz keine weiteren Sprünge, bis die neue Position gemeldet ist */
let seekLock = 0;

let apiPromise: Promise<IFrameAPI> | null = null;
function loadApi(): Promise<IFrameAPI> {
  apiPromise ??= new Promise((resolve) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    document.body.appendChild(script);
  });
  return apiPromise;
}

function onUpdate({ data }: PlaybackUpdate) {
  const playing = !data.isPaused;
  if (playing !== isPlaying) {
    isPlaying = playing;
    emit('playing', playing);
  }
  if (!playing || !controller || data.duration === 0) return;

  const now = performance.now();
  if (now < seekLock) return;
  const start = props.track.start ?? 0;
  const end = props.track.end;
  const pos = data.position / 1000;
  // vor dem Fenster (z. B. beim ersten Abspielen) oder dahinter → zurück zum Start
  if (pos < start - 1 || (end !== undefined && pos >= end)) {
    seekLock = now + 1500;
    controller.seek(start);
  }
}

onMounted(async () => {
  const api = await loadApi();
  if (!host.value) return;
  api.createController(
    host.value,
    { uri: props.track.uri, width: '100%', height: 80, theme: 'dark' },
    (c) => {
      controller = c;
      c.addListener('playback_update', onUpdate);
      // gleich an der Startzeit laden, damit nicht erst der Anfang anspielt
      load();
      if (pendingPlay) play();
    },
  );
});

let pendingPlay = false;

function load() {
  controller?.loadUri(props.track.uri, false, props.track.start ?? 0);
}

// Szenenwechsel: anderer Song, läuft weiter, wenn vorher Musik lief
watch(
  () => props.track.uri,
  () => {
    if (!controller) return;
    const wasPlaying = isPlaying;
    load();
    if (wasPlaying) controller.play();
  },
);

/**
 * Startet die Wiedergabe. Muss aus einem Klick heraus aufgerufen werden,
 * sonst blockt der Browser (v. a. Safari) – dann bleibt der Play-Knopf im Player.
 */
function play() {
  if (!controller) {
    pendingPlay = true;
    return;
  }
  pendingPlay = false;
  if (!isPlaying) controller.play();
}

function pause() {
  if (isPlaying) controller?.pause();
}

defineExpose({ play, pause });

onBeforeUnmount(() => {
  controller?.destroy();
  controller = null;
});
</script>

<template>
  <div class="spotify"><div ref="host"></div></div>
</template>

<style scoped lang="scss">
.spotify {
  overflow: hidden;
  border-radius: 12px;
  line-height: 0;
  box-shadow: 0 8px 24px rgb(0 0 0 / 40%);

  :deep(iframe) {
    display: block;
    border: 0;
  }
}
</style>

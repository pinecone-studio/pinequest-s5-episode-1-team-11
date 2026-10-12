import { groupScores, SOUND_HOP_MS, type SoundScores } from "../sounds";
import { SOUND_MODEL, wasmPath } from "./models";

const WINDOW_SECONDS = 0.975;
// Keep sample collection off the UI thread. Sending every 128-sample render block
// floods a phone with hundreds of messages and sliding-window copies per second.
const TAP = `registerProcessor("halo-tap", class extends AudioWorkletProcessor {
  constructor() {
    super();
    this.window = new Float32Array(Math.round(sampleRate * ${WINDOW_SECONDS}));
    this.hop = Math.round(sampleRate * ${SOUND_HOP_MS} / 1000);
    this.generation = 0;
    this.reset();
    this.port.onmessage = ({ data }) => { this.generation = data; this.reset(); };
  }
  reset() { this.cursor = 0; this.filled = 0; this.sinceLast = 0; }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) { this.reset(); return true; }
    for (let i = 0; i < channel.length; i++) {
      this.window[this.cursor] = channel[i];
      this.cursor = (this.cursor + 1) % this.window.length;
      this.filled++;
      this.sinceLast++;
      if (this.filled < this.window.length || this.sinceLast < this.hop) continue;
      this.sinceLast = 0;
      const samples = new Float32Array(this.window.length);
      const tail = this.window.subarray(this.cursor);
      samples.set(tail);
      samples.set(this.window.subarray(0, this.cursor), tail.length);
      this.port.postMessage({ samples, time: currentTime + (i + 1) / sampleRate,
        generation: this.generation }, [samples.buffer]);
    }
    return true;
  }
});`;

/** Loudness the classifier sees, as RMS. Distant sounds reach a phone far below this. */
const TARGET_RMS = 0.1;
const MAX_GAIN = 50;
/** Below this the window is silence; amplifying it would only amplify hiss. */
const SILENCE_RMS = 0.0002;

/**
 * Raises a quiet window to a steady level before classification. A cry or alarm a few metres
 * from the phone scores far lower than the same sound up close; measured on ESC-50 clips, a
 * crying clip at a tenth of its level fell from 0.59 to 0.20 and returned to 0.80 like this.
 */
export function normalized(samples: Float32Array): Float32Array {
  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  const rms = Math.sqrt(energy / samples.length);
  if (rms < SILENCE_RMS || rms >= TARGET_RMS) return samples;
  const gain = Math.min(TARGET_RMS / rms, MAX_GAIN);
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = Math.max(-1, Math.min(1, samples[i] * gain));
  return out;
}

export type SoundRunner = { resume(): Promise<void>; close(): Promise<void> };
export type SoundRunnerOptions = {
  onState?(state: "running" | "suspended"): void;
  onError?(error: unknown): void;
};

type AudioWindow = { samples: Float32Array; time: number; generation: number };

/**
 * Classifies the microphone every SOUND_HOP_MS over the last ~1 s of audio.
 * The context runs at the device's own rate; YAMNet resamples to 16 kHz itself.
 */
export async function createSoundRunner(
  stream: MediaStream,
  onScores: (
    time: number,
    scores: SoundScores,
    level: number,
    /** The model's single best guess among all 521 sounds, for diagnostics. */
    top?: { name: string; score: number },
  ) => void,
  options: SoundRunnerOptions = {},
): Promise<SoundRunner> {
  // Resume while the caller's tap still counts as a user gesture. Safari may leave
  // the resume promise pending until another tap, so model loading must not await it.
  const context = new AudioContext();
  let classifier: import("@mediapipe/tasks-audio").AudioClassifier | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let tap: AudioWorkletNode | null = null;
  let mute: GainNode | null = null;
  let closed = false;
  let failed = false;
  let failure: unknown;
  let generation = 0;
  let closing: Promise<void> | null = null;
  const tracks = stream.getAudioTracks();
  const isRunning = () =>
    context.state === "running" &&
    tracks.some((track) => track.readyState === "live" && !track.muted);
  const stateChanged = () => {
    // A resumed context is not ready for recognition until the model and graph exist.
    if (closed || !tap) return;
    tap.port.postMessage(++generation);
    options.onState?.(isRunning() ? "running" : "suspended");
  };
  const close = () => {
    if (closing) return closing;
    closed = true;
    context.removeEventListener("statechange", stateChanged);
    for (const track of tracks) {
      track.removeEventListener("mute", stateChanged);
      track.removeEventListener("unmute", stateChanged);
      track.removeEventListener("ended", ended);
    }
    if (tap) {
      tap.port.onmessage = null;
      tap.removeEventListener("processorerror", processorError);
      tap.disconnect();
      tap.port.close();
    }
    source?.disconnect();
    mute?.disconnect();
    closing = (async () => {
      try {
        await context.close();
      } finally {
        classifier?.close();
        classifier = null;
      }
    })();
    return closing;
  };
  const fail = (error: unknown) => {
    if (closed || failed) return;
    failed = true;
    failure = error;
    options.onState?.("suspended");
    void close().catch(() => undefined);
    options.onError?.(error);
  };
  const ended = () =>
    fail(new Error("The microphone disconnected. Restart monitoring to reconnect."));
  const processorError = () => fail(new Error("Microphone audio processing stopped."));
  const resume = async () => {
    if (closed || failed) return;
    await context.resume();
    stateChanged();
  };
  context.addEventListener("statechange", stateChanged);
  for (const track of tracks) {
    track.addEventListener("mute", stateChanged);
    track.addEventListener("unmute", stateChanged);
    track.addEventListener("ended", ended);
  }
  void resume().catch(fail);

  try {
    const { AudioClassifier, FilesetResolver } = await import("@mediapipe/tasks-audio");
    const files = await FilesetResolver.forAudioTasks(wasmPath("audio"));
    if (closed) throw failure ?? new Error("Microphone initialization interrupted.");
    const loaded = await AudioClassifier.createFromOptions(files, {
      baseOptions: { modelAssetPath: SOUND_MODEL },
      maxResults: -1,
      scoreThreshold: 0,
    });
    if (closed) {
      loaded.close();
      throw failure ?? new Error("Microphone initialization interrupted.");
    }
    classifier = loaded;
    const url = URL.createObjectURL(new Blob([TAP], { type: "text/javascript" }));
    try {
      await context.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    if (closed) throw failure ?? new Error("Microphone initialization interrupted.");
    source = context.createMediaStreamSource(stream);
    // Explicit downmix avoids discarding one channel of a stereo camera/recording.
    tap = new AudioWorkletNode(context, "halo-tap", {
      channelCount: 1,
      channelCountMode: "explicit",
    });
    mute = context.createGain();
    mute.gain.value = 0;
    tap.addEventListener("processorerror", processorError);
    tap.port.onmessage = ({ data }: MessageEvent<AudioWindow>) => {
      if (closed || failed || !isRunning() || data.generation !== generation) return;
      // Discard queued old windows after the UI/model stalls. Their timestamp must
      // not be mistaken for new sustained evidence by the sound detector.
      const age = Math.max(0, context.currentTime - data.time);
      if (age > 1.5) return;
      const time = Date.now() - Math.round(age * 1000);
      try {
        const result = classifier?.classify(normalized(data.samples), context.sampleRate) ?? [];
        const categories = result.flatMap((item) =>
          item.classifications.flatMap(({ categories }) => categories),
        );
        let energy = 0;
        for (const sample of data.samples) energy += sample * sample;
        let top: { name: string; score: number } | undefined;
        for (const category of categories) {
          if (!top || category.score > top.score)
            top = { name: category.categoryName, score: category.score };
        }
        onScores(time, groupScores(categories), Math.sqrt(energy / data.samples.length), top);
      } catch (error) {
        fail(error);
      }
    };
    // Nodes only run while connected towards the destination; the gain keeps it silent.
    source.connect(tap).connect(mute).connect(context.destination);
    stateChanged();
    return { resume, close };
  } catch (error) {
    // Preserve the initialization error even if releasing browser audio also fails.
    await close().catch(() => undefined);
    throw error;
  }
}

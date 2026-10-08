import { groupScores, SOUND_HOP_MS, type SoundScores, soundClassNames } from "../sounds";
import { SOUND_MODEL, wasmPath } from "./models";

const WINDOW_SECONDS = 0.975;
// Copies microphone samples to the main thread in 128-sample blocks.
const TAP = `registerProcessor("halo-tap", class extends AudioWorkletProcessor {
  process(inputs) { const channel = inputs[0][0]; if (channel) this.port.postMessage(channel.slice(0)); return true; }
});`;

export type SoundRunner = { close(): Promise<void> };

/**
 * Classifies the microphone every SOUND_HOP_MS over the last ~1 s of audio.
 * The context runs at the device's own rate; YAMNet resamples to 16 kHz itself.
 */
export async function createSoundRunner(
  stream: MediaStream,
  onScores: (time: number, scores: SoundScores, level: number) => void,
): Promise<SoundRunner> {
  const { AudioClassifier, FilesetResolver } = await import("@mediapipe/tasks-audio");
  const files = await FilesetResolver.forAudioTasks(wasmPath("audio"));
  const classifier = await AudioClassifier.createFromOptions(files, {
    baseOptions: { modelAssetPath: SOUND_MODEL },
    categoryAllowlist: [...soundClassNames],
    maxResults: -1,
    scoreThreshold: 0,
  });

  const context = new AudioContext();
  const url = URL.createObjectURL(new Blob([TAP], { type: "text/javascript" }));
  await context.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
  const source = context.createMediaStreamSource(stream);
  const tap = new AudioWorkletNode(context, "halo-tap");
  const mute = context.createGain();
  mute.gain.value = 0;
  // Nodes only run while connected towards the destination; the gain keeps it silent.
  source.connect(tap).connect(mute).connect(context.destination);
  await context.resume();

  const rate = context.sampleRate;
  const window = new Float32Array(Math.round(rate * WINDOW_SECONDS));
  const hop = Math.round((rate * SOUND_HOP_MS) / 1000);
  let filled = 0;
  let sinceLast = 0;
  tap.port.onmessage = ({ data }: MessageEvent<Float32Array>) => {
    // Slide the window left and append the newest block.
    window.copyWithin(0, data.length);
    window.set(data, window.length - data.length);
    filled = Math.min(window.length, filled + data.length);
    sinceLast += data.length;
    if (filled < window.length || sinceLast < hop) return;
    sinceLast = 0;
    const result = classifier.classify(window, rate);
    const categories = result.flatMap((item) => item.classifications[0]?.categories ?? []);
    let energy = 0;
    for (const sample of window) energy += sample * sample;
    onScores(Date.now(), groupScores(categories), Math.sqrt(energy / window.length));
  };

  return {
    async close() {
      tap.port.onmessage = null;
      source.disconnect();
      await context.close();
      classifier.close();
    },
  };
}

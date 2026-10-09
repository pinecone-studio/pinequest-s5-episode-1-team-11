import type { DetectionSettings } from "@/contracts";

export type SoundKind = "scream" | "cry" | "glass" | "alarm";
export const soundKinds: readonly SoundKind[] = ["scream", "cry", "glass", "alarm"];

/** YAMNet (AudioSet) class names behind each kind. Sirens and shouting play are left out. */
export const soundClasses: Record<SoundKind, readonly string[]> = {
  scream: ["Screaming"],
  cry: ["Crying, sobbing", "Baby cry, infant cry", "Wail, moan"],
  glass: ["Shatter", "Breaking", "Glass"],
  alarm: ["Smoke detector, smoke alarm", "Fire alarm"],
};
export const soundClassNames = soundKinds.flatMap((kind) => soundClasses[kind]);

export type SoundScores = Record<SoundKind, number>;

/** Classifier categories → the highest score per kind. */
export function groupScores(categories: readonly { categoryName: string; score: number }[]) {
  const scores: SoundScores = { scream: 0, cry: 0, glass: 0, alarm: 0 };
  for (const kind of soundKinds) {
    for (const { categoryName, score } of categories) {
      if (soundClasses[kind].includes(categoryName)) scores[kind] = Math.max(scores[kind], score);
    }
  }
  return scores;
}

/** Audio is classified in ~1 s windows every HOP_MS. */
export const SOUND_HOP_MS = 500;

type Rule = {
  /** A window counts when its score reaches this. */
  threshold: number;
  /** …and this many of the last `of` windows count. */
  needed: number;
  of: number;
  /** One window this loud is enough on its own. */
  instant?: number;
};
export type SoundPreset = Record<SoundKind, Rule>;

const windows = (ms: number) => Math.round(ms / SOUND_HOP_MS);

export function soundPreset({
  watching,
  sensitivity,
}: Pick<DetectionSettings, "watching" | "sensitivity">): SoundPreset {
  const factor = { low: 1.25, medium: 1, high: 0.8 }[sensitivity];
  // Children cry often; only long, nearly unbroken crying is worth a notification.
  const cryMs = watching === "child" ? 60_000 : 20_000;
  const preset: SoundPreset = {
    scream: { threshold: 0.3, needed: 2, of: 3, instant: 0.6 },
    cry: { threshold: 0.25, needed: Math.ceil(windows(cryMs) * 0.6), of: windows(cryMs) },
    glass: { threshold: 0.35, needed: 1, of: 1 },
    alarm: { threshold: 0.3, needed: 4, of: 6 },
  };
  for (const kind of soundKinds) {
    const rule = preset[kind];
    rule.threshold = Math.min(0.95, rule.threshold * factor);
    if (rule.instant) rule.instant = Math.min(0.95, rule.instant * factor);
  }
  return preset;
}

export type SoundSignal = { kind: SoundKind; time: number; confidence: number };

/** Turns per-window classifier scores into sound events, each needing sustained evidence. */
export class SoundDetector {
  private recent: Record<SoundKind, { time: number; score: number }[]> = {
    scream: [],
    cry: [],
    glass: [],
    alarm: [],
  };

  constructor(private preset: SoundPreset) {}

  configure(preset: SoundPreset) {
    this.preset = preset;
  }

  update(time: number, scores: SoundScores): SoundSignal[] {
    const signals: SoundSignal[] = [];
    for (const kind of soundKinds) {
      const rule = this.preset[kind];
      const recent = this.recent[kind];
      recent.push({ time, score: scores[kind] });
      // A suspended tab or interrupted microphone must not reuse stale evidence.
      const oldest = time - rule.of * SOUND_HOP_MS;
      while (recent.length > rule.of || recent[0].time <= oldest) recent.shift();
      const hits = recent.filter(({ score }) => score >= rule.threshold);
      if (hits.length >= rule.needed || (rule.instant && scores[kind] >= rule.instant)) {
        const confidence = Math.max(...hits.map(({ score }) => score), scores[kind]);
        signals.push({ kind, time, confidence: Number(Math.min(0.99, confidence).toFixed(2)) });
        // Fresh evidence is needed for the next event of this kind.
        this.recent[kind] = [];
      }
    }
    return signals;
  }
}

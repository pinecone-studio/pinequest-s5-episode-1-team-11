export type SoundKind = "scream" | "cry" | "glass" | "alarm";
const soundKinds: readonly SoundKind[] = ["scream", "cry", "glass", "alarm"];

/** YAMNet (AudioSet) class names behind each kind. Sirens and shouting play are left out. */
const soundClasses: Record<SoundKind, readonly string[]> = {
  // People in danger yell and shout as often as they scream.
  scream: ["Screaming", "Yell", "Shout", "Bellow"],
  // AudioSet places human Whimper under Crying, sobbing; Whimper (dog) is separate.
  cry: ["Crying, sobbing", "Baby cry, infant cry", "Wail, moan", "Whimper"],
  glass: ["Shatter", "Breaking", "Glass"],
  // Many home alarms are tagged as a generic alarm or buzzer rather than a smoke detector.
  alarm: ["Smoke detector, smoke alarm", "Fire alarm", "Alarm", "Alarm clock", "Buzzer"],
};

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

export function soundPreset(): SoundPreset {
  return {
    scream: { threshold: 0.25, needed: 2, of: 3, instant: 0.45 },
    // Crying is reported at once: one clear window, or two faint ones out of the last three.
    // On phone microphones even loud crying scores only about 0.2.
    cry: { threshold: 0.05, needed: 2, of: 3, instant: 0.12 },
    glass: { threshold: 0.3, needed: 1, of: 1 },
    alarm: { threshold: 0.3, needed: 3, of: 4 },
  };
}

export type SoundSignal = { kind: SoundKind; time: number; confidence: number };
type ScoredWindow = { time: number; score: number };

/** Turns per-window classifier scores into sound events, each needing sustained evidence. */
export class SoundDetector {
  private recent: Record<SoundKind, ScoredWindow[]> = {
    scream: [],
    cry: [],
    glass: [],
    alarm: [],
  };

  constructor(private preset: SoundPreset) {}

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

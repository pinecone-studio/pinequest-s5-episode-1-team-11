import { type DetectionSettings, type EventIngest, isKindEnabled, severityOf } from "@/contracts";
import { DownedDetector } from "./downed";
import { FallDetector, fallPreset } from "./fall";
import type { PoseFrame } from "./pose";
import { SoundDetector, type SoundScores, soundPreset } from "./sounds";

export type DetectedKind = EventIngest["kind"];

/** One thing worth telling the guardian about. Times are epoch milliseconds. */
export type Detection = {
  kind: DetectedKind;
  confidence: number;
  /** When it happened (a fall's start, not the end of the waiting time). */
  time: number;
  /** Critical moments carry a snapshot so the guardian can judge them at a glance. */
  wantsSnapshot: boolean;
};

/** The same kind is not reported again within this time. */
const COOLDOWN_MS: Record<DetectedKind, number> = {
  fall: 30_000,
  scream: 60_000,
  cry: 60_000,
  glass: 60_000,
  alarm: 2 * 60_000,
};
const SCREAM_BOOST_MS = 10_000;

/** Combines the pose and sound detectors, applies the guardian's settings and cooldowns. */
export class DetectionEngine {
  private fall: FallDetector;
  private downed = new DownedDetector();
  private sounds: SoundDetector;
  private lastReported = new Map<DetectedKind, number>();
  private lastScream = Number.NEGATIVE_INFINITY;

  constructor(private settings: DetectionSettings) {
    this.fall = new FallDetector(fallPreset());
    this.sounds = new SoundDetector(soundPreset());
  }

  configure(settings: DetectionSettings) {
    this.settings = settings;
  }

  /** A pause or interrupted source invalidates motion/audio evidence, but not alert cooldowns. */
  resetEvidence() {
    this.fall.reset();
    this.downed.reset();
    this.resetSoundEvidence();
  }

  resetSoundEvidence() {
    this.sounds = new SoundDetector(soundPreset());
    this.lastScream = Number.NEGATIVE_INFINITY;
  }

  /** Current fall-detector state, for the monitor's status line. */
  get fallState() {
    return this.fall.state;
  }

  pose(frame: PoseFrame): Detection[] {
    // Both see every frame; the person-box backup covers bodies the pose model loses.
    const fell = this.fall.update(frame);
    const downed = this.downed.update(frame);
    const signal = fell ?? downed;
    if (!signal) return [];
    // A scream just before a fall makes it much more likely to be real.
    const boost = signal.time - this.lastScream <= SCREAM_BOOST_MS ? 0.1 : 0;
    return this.report(
      "fall",
      signal.onset,
      Math.min(0.99, signal.confidence + boost),
      signal.time,
    );
  }

  sound(time: number, scores: SoundScores): Detection[] {
    return this.sounds.update(time, scores).flatMap((signal) => {
      if (signal.kind === "scream") this.lastScream = signal.time;
      return this.report(signal.kind, signal.time, signal.confidence, signal.time);
    });
  }

  private report(kind: DetectedKind, time: number, confidence: number, now: number) {
    if (!isKindEnabled(kind, this.settings)) return [];
    const last = this.lastReported.get(kind);
    if (last !== undefined && now - last < COOLDOWN_MS[kind]) return [];
    this.lastReported.set(kind, now);
    return [{ kind, time, confidence, wantsSnapshot: severityOf[kind] === "critical" }];
  }
}

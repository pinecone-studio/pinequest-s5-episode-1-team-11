import { type DetectionSettings, type EventIngest, severityOf } from "@/contracts";
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
export const COOLDOWN_MS: Record<DetectedKind, number> = {
  fall: 30_000,
  scream: 60_000,
  cry: 5 * 60_000,
  glass: 60_000,
  alarm: 2 * 60_000,
};
const SCREAM_BOOST_MS = 10_000;

function enabled(kind: DetectedKind, settings: DetectionSettings) {
  if (kind === "fall") return settings.fall;
  if (kind === "scream" || kind === "cry") return settings.distress;
  return settings.hazard;
}

/** Combines the pose and sound detectors, applies the guardian's settings and cooldowns. */
export class DetectionEngine {
  private fall: FallDetector;
  private sounds: SoundDetector;
  private lastReported = new Map<DetectedKind, number>();
  private lastScream = Number.NEGATIVE_INFINITY;

  constructor(private settings: DetectionSettings) {
    this.fall = new FallDetector(fallPreset(settings));
    this.sounds = new SoundDetector(soundPreset(settings));
  }

  configure(settings: DetectionSettings) {
    this.settings = settings;
    this.fall.configure(fallPreset(settings));
    this.sounds.configure(soundPreset(settings));
  }

  /** Current fall-detector state, for the monitor's status line. */
  get fallState() {
    return this.fall.state;
  }

  pose(frame: PoseFrame): Detection[] {
    const signal = this.fall.update(frame);
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
    if (!enabled(kind, this.settings)) return [];
    const last = this.lastReported.get(kind);
    if (last !== undefined && now - last < COOLDOWN_MS[kind]) return [];
    this.lastReported.set(kind, now);
    return [{ kind, time, confidence, wantsSnapshot: severityOf[kind] === "critical" }];
  }
}
